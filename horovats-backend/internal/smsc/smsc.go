package smsc

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// SMSC.ru HTTP API: оглавление https://smsc.ru/api/#menu , отправка SMS https://smsc.ru/api/http/send/
// Эндпоинт: POST https://smsc.ru/sys/send.php (альтернатива — POST https://smsc.ru/rest/send/ с JSON).
const sendEndpoint = "https://smsc.ru/sys/send.php"

// Enabled returns true when SMSC_LOGIN+SMSC_PASSWORD or SMSC_API_KEY can be used.
func Enabled() bool {
	login := strings.TrimSpace(os.Getenv("SMSC_LOGIN"))
	psw := strings.TrimSpace(os.Getenv("SMSC_PASSWORD"))
	key := strings.TrimSpace(os.Getenv("SMSC_API_KEY"))
	return (login != "" && psw != "") || key != ""
}

// NotifyPhones returns comma-separated recipients (env SMSC_PHONES), default for this project.
func NotifyPhones() string {
	p := strings.TrimSpace(os.Getenv("SMSC_PHONES"))
	if p != "" {
		return p
	}
	return "89687775550"
}

type sendResponseFmt3 struct {
	Error     string `json:"error"`
	ErrorCode int    `json:"error_code"`
	ID        int64  `json:"id"`
	Balance   string `json:"balance"`
}

// Send posts an SMS via SMSC.ru (UTF-8).
func Send(ctx context.Context, phones, message string) error {
	if !Enabled() {
		return errors.New("smsc: SMSC_LOGIN/SMSC_PASSWORD or SMSC_API_KEY not configured")
	}
	phones = strings.TrimSpace(phones)
	if phones == "" {
		return errors.New("smsc: empty phones")
	}

	form := url.Values{}
	login := strings.TrimSpace(os.Getenv("SMSC_LOGIN"))
	psw := strings.TrimSpace(os.Getenv("SMSC_PASSWORD"))
	key := strings.TrimSpace(os.Getenv("SMSC_API_KEY"))
	// Приоритет у SMSC_API_KEY: ключ заменяет пару login+psw (документация SMSC). Иначе часто остаётся старый неверный пароль в .env и ключ игнорируется.
	if key != "" {
		form.Set("apikey", key)
	} else if login != "" && psw != "" {
		form.Set("login", login)
		form.Set("psw", psw)
	} else {
		return errors.New("smsc: configure SMSC_LOGIN+SMSC_PASSWORD or SMSC_API_KEY")
	}
	form.Set("phones", phones)
	form.Set("mes", message)
	form.Set("charset", "utf-8")
	form.Set("fmt", "3")

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, sendEndpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{
		Timeout: 20 * time.Second,
		Transport: &http.Transport{
			Proxy: http.ProxyFromEnvironment,
		},
	}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return errors.New("smsc: HTTP " + resp.Status + ": " + string(body))
	}

	var parsed sendResponseFmt3
	if err := json.Unmarshal(body, &parsed); err != nil {
		s := strings.TrimSpace(string(body))
		if strings.HasPrefix(strings.ToUpper(s), "ERROR") {
			return errors.New("smsc: " + s)
		}
		return errors.New("smsc: invalid response: " + s)
	}
	if parsed.Error != "" {
		msg := "smsc: " + parsed.Error
		if parsed.ErrorCode != 0 {
			msg += fmt.Sprintf(" (code %d)", parsed.ErrorCode)
		}
		// Код 2: неверный логин/пароль или IP не в whitelist. Код 4: временная блокировка IP после множества ошибок — см. FAQ.
		switch parsed.ErrorCode {
		case 2:
			msg += "; проверьте пароль/API-ключ (https://smsc.ru/passwords/) и список IP (https://smsc.ru/ips/)"
		case 4:
			msg += "; подождите 10–30 минут без повторных запросов или см. https://smsc.ru/faq/99/"
		}
		return errors.New(msg)
	}
	return nil
}
