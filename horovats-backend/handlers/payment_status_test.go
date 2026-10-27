package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/horovats/backend/database"
	"github.com/horovats/backend/internal/telegram"
	"github.com/horovats/backend/internal/yookassa"
	"github.com/horovats/backend/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type paymentTransport func(*http.Request) (*http.Response, error)

func (f paymentTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestWebhookUpdatesPayment(t *testing.T) {
	for _, tc := range []struct {
		name, status                   string
		paid                           bool
		amount, currency, metadata, id string
		httpStatus, wantHTTP           int
		wantStatus                     string
	}{
		{"success", "succeeded", true, "599.00", "RUB", "1", "payment-id", 200, 200, "new"},
		{"payment_not_attached", "succeeded", true, "599.00", "RUB", "1", "payment-id", 200, 503, "pending_payment"},
		{"pending", "pending", false, "599.00", "RUB", "1", "payment-id", 200, 503, "pending_payment"},
		{"authorization_only", "waiting_for_capture", true, "599.00", "RUB", "1", "payment-id", 200, 503, "pending_payment"},
		{"cancel", "canceled", false, "599.00", "RUB", "1", "payment-id", 200, 200, "payment_canceled"},
		{"wrong_amount", "succeeded", true, "1.00", "RUB", "1", "payment-id", 200, 500, "pending_payment"},
		{"wrong_currency", "succeeded", true, "599.00", "USD", "1", "payment-id", 200, 500, "pending_payment"},
		{"wrong_order", "succeeded", true, "599.00", "RUB", "2", "payment-id", 200, 503, "pending_payment"},
		{"wrong_payment", "succeeded", true, "599.00", "RUB", "1", "other-id", 200, 200, "pending_payment"},
		{"not_paid", "succeeded", false, "599.00", "RUB", "1", "payment-id", 200, 500, "pending_payment"},
		{"api_unavailable", "pending", false, "599.00", "RUB", "1", "payment-id", 503, 502, "pending_payment"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "payment.db")), &gorm.Config{})
			if err != nil {
				t.Fatal(err)
			}
			if err = db.AutoMigrate(&models.Order{}, &models.OrderItem{}, &models.OrderNotification{}); err != nil {
				t.Fatal(err)
			}
			previousDB, previousYK, previousNotifier := database.DB, ykClient, orderNotifier
			t.Cleanup(func() { database.DB = previousDB; ykClient = previousYK; orderNotifier = previousNotifier })
			database.DB = db
			t.Setenv("TELEGRAM_BOT_TOKEN", "test-token")
			t.Setenv("TELEGRAM_CHAT_ID", "123")
			orderNotifier = telegram.FromEnv(db)
			order := models.Order{ID: 1, Status: "pending_payment", PaymentStatus: "pending", PaymentToken: "secret", YookassaPaymentID: "payment-id", TotalPrice: 599}
			if tc.name == "payment_not_attached" {
				order.YookassaPaymentID = ""
			}
			if err = db.Create(&order).Error; err != nil {
				t.Fatal(err)
			}
			calls := 0
			ykClient = &yookassa.Client{ShopID: "shop", SecretKey: "key", HTTPClient: &http.Client{Transport: paymentTransport(func(r *http.Request) (*http.Response, error) {
				calls++
				if r.Method != "GET" || r.URL.Path != "/v3/payments/payment-id" {
					t.Errorf("unexpected payment request: %s %s", r.Method, r.URL.Path)
				}
				body, _ := json.Marshal(yookassa.Payment{ID: tc.id, Status: tc.status, Paid: tc.paid, Amount: yookassa.Amount{Value: tc.amount, Currency: tc.currency}, Metadata: map[string]string{"order_id": tc.metadata}})
				return &http.Response{StatusCode: tc.httpStatus, Body: io.NopCloser(strings.NewReader(string(body))), Header: make(http.Header)}, nil
			})}}
			gin.SetMode(gin.TestMode)
			router := gin.New()
			router.GET("/orders/:id/payment-status", GetOrderPaymentStatus)
			router.POST("/webhook", YookassaWebhook)
			// An invalid return token must never trigger a provider request.
			unauthorized := httptest.NewRecorder()
			router.ServeHTTP(unauthorized, httptest.NewRequest("GET", "/orders/1/payment-status?token=wrong", nil))
			if unauthorized.Code != 403 || calls != 0 {
				t.Fatal("token check bypassed")
			}
			deliver := func() *httptest.ResponseRecorder {
				response := httptest.NewRecorder()
				request := httptest.NewRequest("POST", "/webhook", strings.NewReader(`{"type":"notification","event":"payment.succeeded","object":{"id":"payment-id"}}`))
				request.Header.Set("Content-Type", "application/json")
				router.ServeHTTP(response, request)
				return response
			}
			response := deliver()
			if response.Code != tc.wantHTTP {
				t.Fatalf("HTTP %d: %s", response.Code, response.Body.String())
			}
			db.First(&order, 1)
			if order.Status != tc.wantStatus {
				t.Fatalf("unexpected order state %s", order.Status)
			}
			if tc.name == "payment_not_attached" {
				db.Model(&order).Update("yookassa_payment_id", "payment-id")
				if deliver().Code != 200 {
					t.Fatal("redelivery failed after payment attached")
				}
				db.First(&order, 1)
				if order.PaymentStatus != "succeeded" {
					t.Fatal("early webhook was lost")
				}
			}
			if tc.name == "success" {
				if order.PaymentStatus != "succeeded" {
					t.Fatal("response still reports pending")
				}
				repeated := httptest.NewRecorder()
				router.ServeHTTP(repeated, httptest.NewRequest("GET", "/orders/1/payment-status?token=secret", nil))
				if repeated.Code != 200 || calls != 1 || !strings.Contains(repeated.Body.String(), `"paymentStatus":"succeeded"`) {
					t.Fatal("paid order rechecked unnecessarily")
				}
				if deliver().Code != 200 {
					t.Fatal("duplicate webhook failed")
				}
				var events int64
				db.Model(&models.OrderNotification{}).Count(&events)
				if events != 1 {
					t.Fatal("paid notification missing or duplicated")
				}
				// A late cancellation cannot revert a captured payment.
				if err = markOrderPaymentCanceled(&order, "payment-id"); err != nil {
					t.Fatal(err)
				}
				db.First(&order, 1)
				if order.PaymentStatus != "succeeded" || order.Status != "new" {
					t.Fatal("late cancellation reverted success")
				}
			}
		})
	}
}

func TestPaymentStatusReconcilesWithoutWebhook(t *testing.T) {
	for _, tc := range []struct {
		name, status, amount, currency, metadata, id string
		paid                                         bool
		apiStatus, wantHTTP                          int
		wantStatus, wantPayment                      string
	}{
		{"success", "succeeded", "599.00", "RUB", "1", "payment-id", true, 200, 200, "new", "succeeded"},
		{"pending", "pending", "599.00", "RUB", "1", "payment-id", false, 200, 200, "pending_payment", "pending"},
		{"authorization_only", "waiting_for_capture", "599.00", "RUB", "1", "payment-id", true, 200, 200, "pending_payment", "pending"},
		{"canceled", "canceled", "599.00", "RUB", "1", "payment-id", false, 200, 200, "payment_canceled", "canceled"},
		{"wrong_amount", "succeeded", "1.00", "RUB", "1", "payment-id", true, 200, 500, "pending_payment", "pending"},
		{"wrong_currency", "succeeded", "599.00", "USD", "1", "payment-id", true, 200, 500, "pending_payment", "pending"},
		{"wrong_order", "succeeded", "599.00", "RUB", "2", "payment-id", true, 200, 500, "pending_payment", "pending"},
		{"wrong_payment", "succeeded", "599.00", "RUB", "1", "other-id", true, 200, 500, "pending_payment", "pending"},
		{"not_paid", "succeeded", "599.00", "RUB", "1", "payment-id", false, 200, 500, "pending_payment", "pending"},
		{"api_unavailable", "pending", "599.00", "RUB", "1", "payment-id", false, 503, 502, "pending_payment", "pending"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "payment.db")), &gorm.Config{})
			if err != nil {
				t.Fatal(err)
			}
			if err := db.AutoMigrate(&models.Order{}, &models.OrderItem{}, &models.OrderNotification{}); err != nil {
				t.Fatal(err)
			}
			previousDB, previousYK, previousNotifier := database.DB, ykClient, orderNotifier
			t.Cleanup(func() { database.DB = previousDB; ykClient = previousYK; orderNotifier = previousNotifier })
			database.DB = db
			t.Setenv("TELEGRAM_BOT_TOKEN", "test-token")
			t.Setenv("TELEGRAM_CHAT_ID", "123")
			orderNotifier = telegram.FromEnv(db)
			order := models.Order{ID: 1, Status: "pending_payment", PaymentStatus: "pending", PaymentToken: "secret", YookassaPaymentID: "payment-id", TotalPrice: 599}
			if err := db.Create(&order).Error; err != nil {
				t.Fatal(err)
			}
			calls := 0
			ykClient = &yookassa.Client{ShopID: "shop", SecretKey: "key", HTTPClient: &http.Client{Transport: paymentTransport(func(r *http.Request) (*http.Response, error) {
				calls++
				shop, key, ok := r.BasicAuth()
				if r.Method != http.MethodGet || r.URL.Path != "/v3/payments/payment-id" || !ok || shop != "shop" || key != "key" {
					t.Errorf("unexpected provider request: %s %s", r.Method, r.URL.Path)
				}
				if _, ok := r.Context().Deadline(); calls == 1 && !ok {
					t.Error("provider request has no deadline")
				}
				body, _ := json.Marshal(yookassa.Payment{ID: tc.id, Status: tc.status, Paid: tc.paid, Amount: yookassa.Amount{Value: tc.amount, Currency: tc.currency}, Metadata: map[string]string{"order_id": tc.metadata}})
				return &http.Response{StatusCode: tc.apiStatus, Body: io.NopCloser(strings.NewReader(string(body))), Header: make(http.Header)}, nil
			})}}
			gin.SetMode(gin.TestMode)
			router := gin.New()
			router.GET("/orders/:id/payment-status", GetOrderPaymentStatus)
			router.POST("/webhook", YookassaWebhook)
			check := func(token string) *httptest.ResponseRecorder {
				response := httptest.NewRecorder()
				router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/orders/1/payment-status?token="+token, nil))
				return response
			}
			if check("wrong").Code != 403 || calls != 0 {
				t.Fatal("invalid token contacted provider")
			}
			response := check("secret")
			if response.Code != tc.wantHTTP || calls != 1 || response.Header().Get("Cache-Control") != "no-store" {
				t.Fatalf("unexpected response %d, calls %d: %s", response.Code, calls, response.Body.String())
			}
			if err := db.First(&order, 1).Error; err != nil {
				t.Fatal(err)
			}
			if order.Status != tc.wantStatus || order.PaymentStatus != tc.wantPayment {
				t.Fatalf("unexpected persisted state: %s / %s", order.Status, order.PaymentStatus)
			}
			if tc.wantHTTP == 200 && (!strings.Contains(response.Body.String(), `"status":"`+tc.wantStatus+`"`) || !strings.Contains(response.Body.String(), `"paymentStatus":"`+tc.wantPayment+`"`)) {
				t.Fatalf("stale response: %s", response.Body.String())
			}
			if tc.name == "success" || tc.name == "canceled" {
				if check("secret").Code != 200 || calls != 1 {
					t.Fatal("final payment rechecked")
				}
			}
			if tc.name == "success" {
				webhook := httptest.NewRecorder()
				request := httptest.NewRequest(http.MethodPost, "/webhook", strings.NewReader(`{"type":"notification","event":"payment.succeeded","object":{"id":"payment-id"}}`))
				request.Header.Set("Content-Type", "application/json")
				router.ServeHTTP(webhook, request)
				if webhook.Code != 200 {
					t.Fatalf("late webhook failed: %s", webhook.Body.String())
				}
			}
			var events int64
			if err := db.Model(&models.OrderNotification{}).Count(&events).Error; err != nil {
				t.Fatal(err)
			}
			wantEvents := int64(0)
			if tc.name == "success" {
				wantEvents = 1
			}
			if events != wantEvents {
				t.Fatalf("notification count %d, want %d", events, wantEvents)
			}
		})
	}
}
