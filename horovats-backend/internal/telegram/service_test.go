package telegram

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"
	"unicode/utf16"

	"github.com/horovats/backend/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type fakeSender struct {
	calls int
	texts []string
	err   error
}

func (f *fakeSender) Send(_ context.Context, text string) error {
	f.calls++
	f.texts = append(f.texts, text)
	return f.err
}

func testService(t *testing.T) (*Service, *fakeSender) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "test.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err = db.AutoMigrate(&models.OrderNotification{}, &models.User{}); err != nil {
		t.Fatal(err)
	}
	f := &fakeSender{}
	return &Service{db: db, sender: f}, f
}

func TestQueueTransactionDeduplicationAndDelivery(t *testing.T) {
	s, f := testService(t)
	order := models.Order{ID: 1, GuestName: "Иван", GuestPhone: "123", DeliveryAddress: "Адрес", TotalPrice: 100, Items: []models.OrderItem{{DishTitle: "Хинкали", Quantity: 2, Price: 50}}}
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.Enqueue(tx, &order, Created); err != nil {
			return err
		}
		return errors.New("rollback")
	})
	if err == nil {
		t.Fatal("expected rollback")
	}
	var count int64
	s.db.Model(&models.OrderNotification{}).Count(&count)
	if count != 0 {
		t.Fatal("notification survived rollback")
	}
	for i := 0; i < 2; i++ {
		if err = s.Enqueue(s.db, &order, Created); err != nil {
			t.Fatal(err)
		}
	}
	if err = s.Enqueue(s.db, &order, Paid); err != nil {
		t.Fatal(err)
	}
	s.db.Model(&models.OrderNotification{}).Count(&count)
	if count != 2 {
		t.Fatal("duplicate event was enqueued")
	}
	for i := 0; i < 3; i++ {
		if err = s.processOne(context.Background()); err != nil {
			t.Fatal(err)
		}
	}
	if f.calls != 2 || !strings.Contains(f.texts[0], "Новый заказ №1") || !strings.Contains(f.texts[1], "Оплата подтверждена") {
		t.Fatalf("unexpected sends: %#v", f.texts)
	}
	var rows []models.OrderNotification
	s.db.Find(&rows)
	for _, row := range rows {
		if row.SentAt == nil || row.Text != "" {
			t.Fatal("delivery not recorded or contact details retained")
		}
	}
}

func TestFailedDeliverySurvivesRestartAndHonorsRetryAfter(t *testing.T) {
	s, f := testService(t)
	order := models.Order{ID: 2, GuestName: "Guest"}
	if err := s.Enqueue(s.db, &order, Created); err != nil {
		t.Fatal(err)
	}
	f.err = &deliveryError{code: 429, retryAfter: 120 * time.Second}
	if err := s.processOne(context.Background()); err != nil {
		t.Fatal(err)
	}
	var row models.OrderNotification
	s.db.First(&row)
	if row.SentAt != nil || row.Attempts != 1 || time.Until(row.NextAttemptAt) < 119*time.Second || row.Text == "" {
		t.Fatal("failed delivery lost or retry_after ignored")
	}
	if err := s.processOne(context.Background()); err != nil {
		t.Fatal(err)
	}
	if f.calls != 1 {
		t.Fatal("retry occurred too early")
	}
	s.db.Model(&row).Update("next_attempt_at", time.Now().Add(-time.Second))
	restarted := &Service{db: s.db, sender: &fakeSender{}}
	if err := restarted.processOne(context.Background()); err != nil {
		t.Fatal(err)
	}
	s.db.First(&row, row.ID)
	if row.SentAt == nil || row.Attempts != 2 {
		t.Fatal("queued delivery did not survive restart")
	}
}

func TestRegisteredCustomerAndMessageLength(t *testing.T) {
	s, _ := testService(t)
	user := models.User{Name: "Покупатель", Phone: "555", Email: "test@example.test", PasswordHash: "hash"}
	s.db.Create(&user)
	order := models.Order{ID: 3, UserID: &user.ID, DeliveryAddress: strings.Repeat("🏠", 700), Status: "pending_payment"}
	for i := 0; i < 100; i++ {
		order.Items = append(order.Items, models.OrderItem{DishTitle: strings.Repeat("🍕", 150), Quantity: 2, Price: 100})
	}
	if err := s.Enqueue(s.db, &order, Created); err != nil {
		t.Fatal(err)
	}
	var row models.OrderNotification
	s.db.First(&row)
	if !strings.Contains(row.Text, "Покупатель") || !strings.Contains(row.Text, "555") || !strings.Contains(row.Text, "Ожидает онлайн-оплаты") || !strings.Contains(row.Text, "Еще позиций") || !strings.Contains(row.Text, "Итого") {
		t.Fatal("message missing required fields")
	}
	if len(utf16.Encode([]rune(row.Text))) > 4096 {
		t.Fatal("Telegram message too long")
	}
}

func TestClientAPIAndRedactedErrors(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/botSECRET/sendMessage" || r.Method != "POST" {
			t.Error("unexpected Telegram endpoint")
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		if body["chat_id"] != "-1001" || body["text"] != "<test>" || body["parse_mode"] != nil {
			t.Error("unexpected message payload")
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(429)
		fmt.Fprint(w, `{"ok":false,"error_code":429,"description":"SECRET","parameters":{"retry_after":60}}`)
	}))
	c := NewClient("SECRET", "-1001")
	c.baseURL = server.URL
	err := c.Send(context.Background(), "<test>")
	var apiErr *deliveryError
	if !errors.As(err, &apiErr) || apiErr.retryAfter != time.Minute || strings.Contains(err.Error(), "SECRET") {
		t.Fatalf("unexpected API error: %v", err)
	}
	server.Close()
	err = c.Send(context.Background(), "<test>")
	if err == nil || strings.Contains(err.Error(), "SECRET") {
		t.Fatalf("transport error exposes token: %v", err)
	}
}

func TestDisabledConfiguration(t *testing.T) {
	t.Setenv("TELEGRAM_BOT_TOKEN", "")
	t.Setenv("TELEGRAM_CHAT_ID", "")
	if s := FromEnv(nil); s != nil {
		t.Fatal("notifications unexpectedly enabled")
	}
	var s *Service
	if err := s.Enqueue(nil, nil, Created); err != nil {
		t.Fatal(err)
	}
}
