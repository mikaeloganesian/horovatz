package handlers

import (
	"fmt"
	"math"
	"os"
	"regexp"
	"strconv"
	"strings"

	"github.com/horovats/backend/database"
	"github.com/horovats/backend/internal/yookassa"
	"github.com/horovats/backend/models"
)

var phoneDigitsRe = regexp.MustCompile(`\D`)

func yookassaTaxSystemCode() int {
	if v := strings.TrimSpace(os.Getenv("YOOKASSA_TAX_SYSTEM_CODE")); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	// УСН «доходы минус расходы»
	return 3
}

func yookassaVatCode() int {
	if v := strings.TrimSpace(os.Getenv("YOOKASSA_VAT_CODE")); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	// Без НДС
	return 1
}

func normalizeReceiptPhone(phone string) string {
	digits := phoneDigitsRe.ReplaceAllString(phone, "")
	if len(digits) == 11 && strings.HasPrefix(digits, "8") {
		digits = "7" + digits[1:]
	}
	if len(digits) == 10 {
		digits = "7" + digits
	}
	if len(digits) == 11 && strings.HasPrefix(digits, "7") {
		return digits
	}
	return ""
}

func truncateReceiptText(text string, max int) string {
	text = strings.TrimSpace(text)
	if len([]rune(text)) <= max {
		return text
	}
	runes := []rune(text)
	return string(runes[:max])
}

func roundMoney(v float64) float64 {
	return math.Round(v*100) / 100
}

func formatQuantity(qty int) string {
	return fmt.Sprintf("%d.00", qty)
}

func buildOrderReceipt(order *models.Order) (*yookassa.Receipt, error) {
	if len(order.Items) == 0 {
		return nil, fmt.Errorf("order has no items")
	}

	email := strings.TrimSpace(order.GuestEmail)
	phone := normalizeReceiptPhone(order.GuestPhone)

	if order.UserID != nil && email == "" {
		var user models.User
		if err := database.DB.First(&user, *order.UserID).Error; err == nil {
			email = strings.TrimSpace(user.Email)
			if phone == "" {
				phone = normalizeReceiptPhone(user.Phone)
			}
		}
	}

	if email == "" && phone == "" {
		return nil, fmt.Errorf("для чека нужен email или телефон покупателя")
	}

	var subtotal float64
	for _, item := range order.Items {
		subtotal += item.Price * float64(item.Quantity)
	}
	if subtotal <= 0 {
		return nil, fmt.Errorf("invalid order subtotal")
	}

	finalTotal, deliveryCost := finalizeOrderTotal(subtotal)
	discountedSubtotal := roundMoney(finalTotal - deliveryCost)
	if math.Abs(finalTotal-order.TotalPrice) > 0.01 {
		finalTotal = order.TotalPrice
		discountedSubtotal = roundMoney(finalTotal - deliveryCost)
	}

	discountRatio := 1.0
	if subtotal > 0 && discountedSubtotal < subtotal {
		discountRatio = discountedSubtotal / subtotal
	}

	vatCode := yookassaVatCode()
	items := make([]yookassa.ReceiptItem, 0, len(order.Items)+1)
	runningTotal := 0.0

	for i, item := range order.Items {
		unitPrice := roundMoney(item.Price * discountRatio)
		if i == len(order.Items)-1 && deliveryCost == 0 {
			// последняя позиция — подгоняем сумму под итог заказа
			target := roundMoney(order.TotalPrice - runningTotal)
			unitPrice = roundMoney(target / float64(item.Quantity))
		}

		lineTotal := roundMoney(unitPrice * float64(item.Quantity))
		runningTotal = roundMoney(runningTotal + lineTotal)

		items = append(items, yookassa.ReceiptItem{
			Description:    truncateReceiptText(item.DishTitle, 128),
			Quantity:       formatQuantity(item.Quantity),
			Amount:         yookassa.Amount{Value: yookassa.FormatAmount(unitPrice), Currency: "RUB"},
			VatCode:        vatCode,
			PaymentMode:    "full_payment",
			PaymentSubject: "commodity",
		})
	}

	if deliveryCost > 0 {
		deliveryCost = roundMoney(deliveryCost)
		if len(items) > 0 {
			// подгонка суммы позиций перед доставкой
			diff := roundMoney(discountedSubtotal - runningTotal)
			if math.Abs(diff) >= 0.01 && len(items) > 0 {
				last := &items[len(items)-1]
				qty, _ := strconv.Atoi(strings.Split(last.Quantity, ".")[0])
				if qty > 0 {
					lastUnit, _ := strconv.ParseFloat(last.Amount.Value, 64)
					lastUnit = roundMoney(lastUnit + diff/float64(qty))
					last.Amount.Value = yookassa.FormatAmount(lastUnit)
					runningTotal = roundMoney(runningTotal + diff)
				}
			}
		}
		items = append(items, yookassa.ReceiptItem{
			Description:    "Доставка",
			Quantity:       "1.00",
			Amount:         yookassa.Amount{Value: yookassa.FormatAmount(deliveryCost), Currency: "RUB"},
			VatCode:        vatCode,
			PaymentMode:    "full_payment",
			PaymentSubject: "service",
		})
		runningTotal = roundMoney(runningTotal + deliveryCost)
	}

	if math.Abs(runningTotal-order.TotalPrice) >= 0.02 {
		return nil, fmt.Errorf("receipt total mismatch: %.2f vs %.2f", runningTotal, order.TotalPrice)
	}

	customer := yookassa.ReceiptCustomer{}
	if email != "" {
		customer.Email = email
	}
	if phone != "" {
		customer.Phone = phone
	}

	return &yookassa.Receipt{
		Customer:      customer,
		Items:         items,
		TaxSystemCode: yookassaTaxSystemCode(),
	}, nil
}
