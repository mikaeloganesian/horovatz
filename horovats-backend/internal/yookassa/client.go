package yookassa

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

const apiBase = "https://api.yookassa.ru/v3"

type Client struct {
	ShopID     string
	SecretKey  string
	HTTPClient *http.Client
}

type Amount struct {
	Value    string `json:"value"`
	Currency string `json:"currency"`
}

type Confirmation struct {
	Type      string `json:"type"`
	ReturnURL string `json:"return_url"`
}

type CreatePaymentRequest struct {
	Amount       Amount            `json:"amount"`
	Confirmation Confirmation      `json:"confirmation"`
	Capture      bool              `json:"capture"`
	Description  string            `json:"description"`
	Metadata     map[string]string `json:"metadata,omitempty"`
}

type Payment struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	Paid   bool   `json:"paid"`
	Confirmation struct {
		ConfirmationURL string `json:"confirmation_url"`
	} `json:"confirmation"`
	Metadata map[string]string `json:"metadata"`
}

type apiError struct {
	Type        string `json:"type"`
	ID          string `json:"id"`
	Code        string `json:"code"`
	Description string `json:"description"`
}

func NewFromEnv() *Client {
	return &Client{
		ShopID:     os.Getenv("YOOKASSA_SHOP_ID"),
		SecretKey:  os.Getenv("YOOKASSA_SECRET_KEY"),
		HTTPClient: http.DefaultClient,
	}
}

func (c *Client) Enabled() bool {
	return c.ShopID != "" && c.SecretKey != ""
}

func ReturnURLBase() string {
	if v := os.Getenv("YOOKASSA_RETURN_URL"); v != "" {
		return v
	}
	return "https://horovats.ru/payment/return"
}

func FormatAmount(amount float64) string {
	return fmt.Sprintf("%.2f", amount)
}

func (c *Client) CreatePayment(idempotenceKey string, req CreatePaymentRequest) (*Payment, error) {
	return c.doPayment(http.MethodPost, "/payments", idempotenceKey, req)
}

func (c *Client) GetPayment(paymentID string) (*Payment, error) {
	return c.doPayment(http.MethodGet, "/payments/"+paymentID, "", nil)
}

func (c *Client) doPayment(method, path, idempotenceKey string, body any) (*Payment, error) {
	var reqBody io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewReader(raw)
	}

	req, err := http.NewRequest(method, apiBase+path, reqBody)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(c.ShopID, c.SecretKey)
	req.Header.Set("Content-Type", "application/json")
	if idempotenceKey != "" {
		req.Header.Set("Idempotence-Key", idempotenceKey)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		var apiErr apiError
		_ = json.Unmarshal(raw, &apiErr)
		if apiErr.Description != "" {
			return nil, fmt.Errorf("yookassa: %s", apiErr.Description)
		}
		return nil, fmt.Errorf("yookassa: HTTP %d: %s", resp.StatusCode, string(raw))
	}

	var payment Payment
	if err := json.Unmarshal(raw, &payment); err != nil {
		return nil, err
	}
	return &payment, nil
}
