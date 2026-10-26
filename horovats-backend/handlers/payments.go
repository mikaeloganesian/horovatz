package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/horovats/backend/database"
	"github.com/horovats/backend/internal/telegram"
	"github.com/horovats/backend/internal/yookassa"
	"github.com/horovats/backend/models"
	"gorm.io/gorm"
)

var ykClient = yookassa.NewFromEnv()

func generatePaymentToken() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func buildReturnURL(orderID uint, token string) string {
	base := strings.TrimRight(yookassa.ReturnURLBase(), "/")
	return fmt.Sprintf("%s?orderId=%d&token=%s", base, orderID, token)
}

func createYookassaPayment(order *models.Order, token string, idempotenceKey string) (confirmationURL string, err error) {
	if !ykClient.Enabled() {
		return "", nil
	}
	if idempotenceKey == "" {
		idempotenceKey = fmt.Sprintf("order-%d", order.ID)
	}

	if len(order.Items) == 0 {
		if err := database.DB.Preload("Items").First(order, order.ID).Error; err != nil {
			return "", err
		}
	}

	receipt, err := buildOrderReceipt(order)
	if err != nil {
		return "", err
	}

	req := yookassa.CreatePaymentRequest{
		Amount: yookassa.Amount{
			Value:    yookassa.FormatAmount(order.TotalPrice),
			Currency: "RUB",
		},
		Confirmation: yookassa.Confirmation{
			Type:      "redirect",
			ReturnURL: buildReturnURL(order.ID, token),
		},
		Capture:     true,
		Description: fmt.Sprintf("Заказ #%d — ХОРОВАЦ", order.ID),
		Metadata: map[string]string{
			"order_id": strconv.FormatUint(uint64(order.ID), 10),
		},
		Receipt: receipt,
	}

	payment, err := ykClient.CreatePayment(idempotenceKey, req)
	if err != nil {
		return "", err
	}

	order.YookassaPaymentID = payment.ID
	order.PaymentStatus = payment.Status
	if err := database.DB.Model(order).Updates(map[string]any{
		"yookassa_payment_id": payment.ID,
		"payment_status":      payment.Status,
	}).Error; err != nil {
		return "", err
	}

	return payment.Confirmation.ConfirmationURL, nil
}

func markOrderPaid(order *models.Order, paymentID string) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		var current models.Order
		if err := tx.Preload("Items").First(&current, order.ID).Error; err != nil {
			return err
		}
		if current.YookassaPaymentID != "" && current.YookassaPaymentID != paymentID {
			return fmt.Errorf("payment changed during confirmation")
		}
		// A create-payment response can already contain succeeded before its webhook.
		// In that case the fulfillment status still needs advancing and notifying.
		if current.PaymentStatus == "succeeded" && current.Status != "pending_payment" && current.Status != "payment_canceled" {
			return nil
		}
		updates := map[string]any{"payment_status": "succeeded", "yookassa_payment_id": paymentID}
		if current.Status == "pending_payment" || current.Status == "payment_canceled" {
			updates["status"] = "new"
		}
		if err := tx.Model(&current).Updates(updates).Error; err != nil {
			return err
		}
		return orderNotifier.Enqueue(tx, &current, telegram.Paid)
	})
}

func markOrderPaymentCanceled(order *models.Order, paymentID string) error {
	return database.DB.Model(order).Where("yookassa_payment_id = ? AND payment_status <> ? AND status IN ?", paymentID, "succeeded", []string{"pending_payment", "payment_canceled"}).Updates(map[string]any{
		"status":              "payment_canceled",
		"payment_status":      "canceled",
		"yookassa_payment_id": paymentID,
	}).Error
}

// applyVerifiedPayment accepts only the current payment and the exact order amount.
// paid=true alone can mean authorization without capture; only succeeded is final.
func applyVerifiedPayment(order *models.Order, payment *yookassa.Payment) error {
	if payment.ID != order.YookassaPaymentID || payment.Metadata["order_id"] != strconv.FormatUint(uint64(order.ID), 10) || payment.Amount.Currency != "RUB" || payment.Amount.Value != yookassa.FormatAmount(order.TotalPrice) {
		return fmt.Errorf("payment does not match order")
	}
	switch payment.Status {
	case "succeeded":
		if !payment.Paid {
			return fmt.Errorf("succeeded payment is not marked paid")
		}
		return markOrderPaid(order, payment.ID)
	case "canceled":
		return markOrderPaymentCanceled(order, payment.ID)
	}
	return nil
}

func refreshOrderPayment(ctx context.Context, order *models.Order) error {
	if !ykClient.Enabled() || order.YookassaPaymentID == "" || (order.Status != "pending_payment" && order.Status != "payment_canceled") {
		return nil
	}
	payment, err := ykClient.GetPaymentContext(ctx, order.YookassaPaymentID)
	if err != nil {
		return err
	}
	if err = applyVerifiedPayment(order, payment); err != nil {
		return err
	}
	return database.DB.First(order, order.ID).Error
}

// GetOrderPaymentStatus — публичная проверка статуса оплаты по orderId + token.
func GetOrderPaymentStatus(c *gin.Context) {
	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || orderID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный номер заказа"})
		return
	}
	token := strings.TrimSpace(c.Query("token"))
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Не указан token"})
		return
	}

	var order models.Order
	if err := database.DB.First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Заказ не найден"})
		return
	}
	if order.PaymentToken != token {
		c.JSON(http.StatusForbidden, gin.H{"error": "Доступ запрещён"})
		return
	}

	c.Header("Cache-Control", "no-store")
	if err := refreshOrderPayment(c.Request.Context(), &order); err != nil {
		log.Printf("refresh payment status order %d: %v", order.ID, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Не удалось проверить оплату в ЮKassa. Повторяем проверку."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"orderId":       order.ID,
		"status":        order.Status,
		"paymentStatus": order.PaymentStatus,
		"totalPrice":    order.TotalPrice,
	})
}

// RetryOrderPayment — повторная оплата для заказа в статусе pending_payment / payment_canceled.
func RetryOrderPayment(c *gin.Context) {
	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || orderID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный номер заказа"})
		return
	}
	token := strings.TrimSpace(c.Query("token"))
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Не указан token"})
		return
	}

	var order models.Order
	if err := database.DB.Preload("Items").First(&order, orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Заказ не найден"})
		return
	}
	if order.PaymentToken != token {
		c.JSON(http.StatusForbidden, gin.H{"error": "Доступ запрещён"})
		return
	}
	if order.Status != "pending_payment" && order.Status != "payment_canceled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Заказ уже оплачен или отменён"})
		return
	}
	if !ykClient.Enabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Оплата временно недоступна"})
		return
	}

	order.Status = "pending_payment"
	order.PaymentStatus = "pending"
	if err := database.DB.Model(&order).Updates(map[string]any{
		"status":         "pending_payment",
		"payment_status": "pending",
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось обновить заказ"})
		return
	}

	confirmationURL, err := createYookassaPayment(&order, token, fmt.Sprintf("order-%d-retry-%d", order.ID, time.Now().UnixNano()))
	if err != nil {
		log.Printf("retry yookassa payment order %d: %v", order.ID, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Не удалось создать платёж"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"confirmationUrl": confirmationURL,
		"orderId":         order.ID,
	})
}

type yookassaWebhookNotification struct {
	Type   string `json:"type"`
	Event  string `json:"event"`
	Object struct {
		ID       string            `json:"id"`
		Status   string            `json:"status"`
		Paid     bool              `json:"paid"`
		Metadata map[string]string `json:"metadata"`
	} `json:"object"`
}

// YookassaWebhook обрабатывает уведомления ЮKassa.
func YookassaWebhook(c *gin.Context) {
	if !ykClient.Enabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "payments disabled"})
		return
	}

	var note yookassaWebhookNotification
	if err := c.ShouldBindJSON(&note); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	paymentID := strings.TrimSpace(note.Object.ID)
	if paymentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing payment id"})
		return
	}

	payment, err := ykClient.GetPayment(paymentID)
	if err != nil {
		log.Printf("yookassa webhook verify payment %s: %v", paymentID, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "payment verify failed"})
		return
	}

	orderIDStr := payment.Metadata["order_id"]
	orderID, err := strconv.ParseUint(orderIDStr, 10, 64)
	if err != nil || orderID == 0 {
		log.Printf("yookassa webhook: missing order_id for payment %s", paymentID)
		c.JSON(http.StatusOK, gin.H{"status": "ignored"})
		return
	}

	var order models.Order
	if err := database.DB.First(&order, orderID).Error; err != nil {
		log.Printf("yookassa webhook: order %d not found", orderID)
		c.JSON(http.StatusOK, gin.H{"status": "ignored"})
		return
	}

	if order.YookassaPaymentID != payment.ID {
		c.JSON(http.StatusOK, gin.H{"status": "ignored"})
		return
	}
	if err := applyVerifiedPayment(&order, payment); err != nil {
		log.Printf("apply verified payment order %d: %v", orderID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
