package telegram

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"
	"unicode/utf16"

	"github.com/horovats/backend/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const Created = "created"
const Paid = "paid"

type sender interface {
	Send(context.Context, string) error
}

type Service struct {
	db     *gorm.DB
	sender sender
}

func FromEnv(db *gorm.DB) *Service {
	token, chatID := strings.TrimSpace(os.Getenv("TELEGRAM_BOT_TOKEN")), strings.TrimSpace(os.Getenv("TELEGRAM_CHAT_ID"))
	if token == "" || chatID == "" {
		if token != "" || chatID != "" {
			log.Print("Telegram notifications disabled: set both TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID")
		}
		return nil
	}
	return &Service{db: db, sender: NewClient(token, chatID)}
}

// Enqueue is called inside the order transaction, so rolled-back orders never notify.
func (s *Service) Enqueue(tx *gorm.DB, order *models.Order, event string) error {
	if s == nil {
		return nil
	}
	if event != Created && event != Paid {
		return fmt.Errorf("unknown order notification event")
	}
	name, phone := order.GuestName, order.GuestPhone
	if order.UserID != nil {
		var user models.User
		err := tx.First(&user, *order.UserID).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if name == "" {
			name = user.Name
		}
		if phone == "" {
			phone = user.Phone
		}
	}
	message := models.OrderNotification{EventKey: fmt.Sprintf("order:%d:%s", order.ID, event), OrderID: order.ID, Text: formatOrder(order, event, name, phone), NextAttemptAt: time.Now()}
	return tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "event_key"}}, DoNothing: true}).Create(&message).Error
}

func oneLine(s string, max int) string {
	r := []rune(strings.Join(strings.Fields(s), " "))
	if len(r) > max {
		return string(r[:max]) + "…"
	}
	return string(r)
}

func formatOrder(order *models.Order, event, name, phone string) string {
	heading := "Новый заказ"
	status := "Онлайн-оплата не запрашивалась"
	if order.Status == "pending_payment" {
		status = "Ожидает онлайн-оплаты"
	}
	if event == Paid {
		heading = "Заказ оплачен"
		status = "Оплата подтверждена ЮKassa"
	}
	if name == "" {
		name = "Не указано"
	}
	if phone == "" {
		phone = "Не указан"
	}
	var b strings.Builder
	fmt.Fprintf(&b, "%s №%d\n%s\n\nКлиент: %s\nТелефон: %s\nАдрес: %s\n\nСостав:\n", heading, order.ID, status, oneLine(name, 100), oneLine(phone, 80), oneLine(order.DeliveryAddress, 500))
	for i, item := range order.Items {
		line := fmt.Sprintf("• %s × %d — %.2f ₽\n", oneLine(item.DishTitle, 100), item.Quantity, item.Price*float64(item.Quantity))
		// Leave space for totals and keep below Telegram's 4096 UTF-16-unit limit.
		if len(utf16.Encode([]rune(b.String()+line))) > 3300 {
			fmt.Fprintf(&b, "Еще позиций: %d. Полный состав в админке.\n", len(order.Items)-i)
			break
		}
		b.WriteString(line)
	}
	fmt.Fprintf(&b, "\nИтого со скидками и доставкой: %.2f ₽\nАдминка: https://horovatz.ru/admin", order.TotalPrice)
	return b.String()
}

// Run uses one sender and a durable lease to survive restarts and avoid simultaneous sends.
func (s *Service) Run(ctx context.Context) {
	if s == nil {
		return
	}
	log.Print("Telegram order notifications enabled")
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	for {
		if err := s.processOne(ctx); err != nil {
			log.Printf("Telegram notification worker: %v", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (s *Service) processOne(ctx context.Context) error {
	now := time.Now()
	var pending []models.OrderNotification
	if err := s.db.WithContext(ctx).Where("sent_at IS NULL AND next_attempt_at <= ? AND locked_until < ?", now, now).Order("id").Limit(1).Find(&pending).Error; err != nil {
		return fmt.Errorf("cannot read notification queue")
	}
	if len(pending) == 0 {
		return nil
	}
	message := pending[0]
	lease := now.Add(time.Minute)
	claim := s.db.WithContext(ctx).Model(&models.OrderNotification{}).Where("id = ? AND sent_at IS NULL AND locked_until < ?", message.ID, now).Updates(map[string]any{"locked_until": lease, "attempts": gorm.Expr("attempts + 1")})
	if claim.Error != nil {
		return fmt.Errorf("cannot claim notification")
	}
	if claim.RowsAffected == 0 {
		return nil
	}
	err := s.sender.Send(ctx, message.Text)
	updates := map[string]any{"locked_until": time.Time{}}
	if err == nil {
		updates["sent_at"] = time.Now()
		// Delivered notifications no longer need to retain customer contact details.
		updates["text"] = ""
	} else {
		delay := 10 * time.Second
		for i := 0; i < message.Attempts && delay < time.Hour; i++ {
			delay *= 2
		}
		if delay > time.Hour {
			delay = time.Hour
		}
		var apiError *deliveryError
		if errors.As(err, &apiError) && apiError.retryAfter > delay {
			delay = apiError.retryAfter
		}
		updates["next_attempt_at"] = time.Now().Add(delay)
		log.Printf("Telegram notification %d attempt %d failed: %v; retry in %s", message.ID, message.Attempts+1, err, delay)
	}
	if result := s.db.Model(&models.OrderNotification{}).Where("id = ? AND locked_until = ?", message.ID, lease).Updates(updates); result.Error != nil {
		return fmt.Errorf("cannot save notification delivery result")
	}
	return nil
}
