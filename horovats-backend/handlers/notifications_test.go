package handlers

import (
	"bytes"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/horovats/backend/database"
	"github.com/horovats/backend/internal/telegram"
	"github.com/horovats/backend/internal/yookassa"
	"github.com/horovats/backend/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestOrderCreationAndPaymentQueueEvents(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "orders.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err = db.AutoMigrate(&models.User{}, &models.Dish{}, &models.Order{}, &models.OrderItem{}, &models.OrderNotification{}); err != nil {
		t.Fatal(err)
	}
	oldDB, oldNotifier, oldYK := database.DB, orderNotifier, ykClient
	t.Cleanup(func() { database.DB = oldDB; orderNotifier = oldNotifier; ykClient = oldYK })
	database.DB = db
	t.Setenv("TELEGRAM_BOT_TOKEN", "test-token")
	t.Setenv("TELEGRAM_CHAT_ID", "123")
	t.Setenv("YOOKASSA_SHOP_ID", "")
	t.Setenv("YOOKASSA_SECRET_KEY", "")
	orderNotifier = telegram.FromEnv(db)
	ykClient = yookassa.NewFromEnv()
	db.Create(&models.Dish{ID: "dish", Title: "Хинкали", Price: 100})
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/orders", CreateOrder)
	request := httptest.NewRequest("POST", "/orders", bytes.NewBufferString(`{"guestName":"Иван","guestPhone":"123","deliveryAddress":"Москва","items":[{"dishId":"dish","quantity":2}]}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != 200 {
		t.Fatalf("create failed: %d %s", response.Code, response.Body.String())
	}
	var events []models.OrderNotification
	db.Find(&events)
	if len(events) != 1 {
		t.Fatal("new order notification missing")
	}
	var order models.Order
	db.First(&order)
	// Payment creation may persist succeeded before the webhook is processed.
	db.Model(&order).Updates(map[string]any{"status": "pending_payment", "payment_status": "succeeded"})
	for i := 0; i < 2; i++ {
		if err = markOrderPaid(&order, "payment-id"); err != nil {
			t.Fatal(err)
		}
	}
	db.Find(&events)
	if len(events) != 2 {
		t.Fatalf("expected created and paid events, got %d", len(events))
	}
	db.First(&order, order.ID)
	if order.PaymentStatus != "succeeded" || order.Status != "new" {
		t.Fatal("payment state incorrect")
	}
}
