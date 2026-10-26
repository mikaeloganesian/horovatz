package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	token   string
	chatID  string
	baseURL string
	http    *http.Client
}

type deliveryError struct {
	code       int
	retryAfter time.Duration
}

func (e *deliveryError) Error() string {
	return fmt.Sprintf("Telegram delivery failed (code %d)", e.code)
}

func NewClient(token, chatID string) *Client {
	return &Client{token: token, chatID: chatID, baseURL: "https://api.telegram.org", http: &http.Client{Timeout: 10 * time.Second}}
}

func (c *Client) Send(ctx context.Context, text string) error {
	body, err := json.Marshal(map[string]any{"chat_id": c.chatID, "text": text, "link_preview_options": map[string]bool{"is_disabled": true}})
	if err != nil {
		return fmt.Errorf("cannot encode Telegram message")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(c.baseURL, "/")+"/bot"+c.token+"/sendMessage", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("cannot create Telegram request")
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	// Transport errors contain the request URL (and therefore the token). Never return them.
	if err != nil {
		return fmt.Errorf("Telegram network request failed")
	}
	defer resp.Body.Close()
	var result struct {
		OK         bool `json:"ok"`
		ErrorCode  int  `json:"error_code"`
		Parameters struct {
			RetryAfter int `json:"retry_after"`
		} `json:"parameters"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 32768)).Decode(&result); err != nil {
		return fmt.Errorf("invalid Telegram response (HTTP %d)", resp.StatusCode)
	}
	if resp.StatusCode != http.StatusOK || !result.OK {
		code := result.ErrorCode
		if code == 0 {
			code = resp.StatusCode
		}
		retry := time.Duration(0)
		if result.Parameters.RetryAfter > 0 {
			seconds := result.Parameters.RetryAfter
			if seconds > 86400 {
				seconds = 86400
			}
			retry = time.Duration(seconds) * time.Second
		}
		return &deliveryError{code: code, retryAfter: retry}
	}
	return nil
}
