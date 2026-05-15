package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/horovats/backend/database"
	"github.com/horovats/backend/internal/smsc"
	"github.com/horovats/backend/middleware"
	"github.com/horovats/backend/models"
	"gorm.io/gorm"
)

type CreateOrderRequest struct {
	DeliveryAddress string `json:"deliveryAddress"`
	GuestName       string `json:"guestName"`
	GuestPhone      string `json:"guestPhone"`
	GuestEmail      string `json:"guestEmail"`
	Items           []struct {
		DishID    string  `json:"dishId"`
		DishTitle string  `json:"dishTitle"`
		Quantity  int     `json:"quantity"`
		Price     float64 `json:"price"`
		ImageUrl  string  `json:"imageUrl"`
	} `json:"items"`
}

// finalizeOrderTotal applies loyalty discounts and delivery fee to the subtotal from the cart (DB prices).
func finalizeOrderTotal(subtotal float64) (final float64, deliveryCost float64) {
	final = subtotal
	deliveryCost = 399.0

	if subtotal >= 10000 {
		final = subtotal * 0.8
		deliveryCost = 0
	} else if subtotal >= 5000 {
		final = subtotal * 0.85
	} else if subtotal >= 3000 {
		final = subtotal * 0.9
	}
	final += deliveryCost
	return final, deliveryCost
}

func formatNewOrderSMS(o models.Order) string {
	var b strings.Builder
	b.WriteString("ХОРОВАЦ: новый заказ #")
	b.WriteString(fmt.Sprintf("%d", o.ID))
	b.WriteString(", ")
	b.WriteString(fmt.Sprintf("%.0f", o.TotalPrice))
	b.WriteString(" руб.")
	if o.UserID != nil {
		b.WriteString(" Клиент id ")
		b.WriteString(fmt.Sprintf("%d", *o.UserID))
	} else {
		if strings.TrimSpace(o.GuestPhone) != "" {
			b.WriteString(" Тел: ")
			b.WriteString(strings.TrimSpace(o.GuestPhone))
		}
		if strings.TrimSpace(o.GuestName) != "" {
			b.WriteString(" ")
			b.WriteString(strings.TrimSpace(o.GuestName))
		}
	}
	addr := strings.TrimSpace(o.DeliveryAddress)
	if len(addr) > 100 {
		addr = addr[:97] + "..."
	}
	if addr != "" {
		b.WriteString(" Адрес: ")
		b.WriteString(addr)
	}
	return b.String()
}

// CreateOrder доступен без авторизации (гость). Если передан валидный JWT — заказ привязывается к пользователю.
func CreateOrder(c *gin.Context) {
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userPtr := middleware.BearerUserID(c)
	if userPtr == nil {
		if strings.TrimSpace(req.GuestName) == "" || strings.TrimSpace(req.GuestPhone) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Укажите имя и телефон для оформления без регистрации"})
			return
		}
	}

	if strings.TrimSpace(req.DeliveryAddress) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Укажите адрес доставки"})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order must contain at least one item"})
		return
	}

	// Aggregate quantities per dish id (ignore client price/title/image for billing).
	qtyByDish := make(map[string]int)
	for _, item := range req.Items {
		id := strings.TrimSpace(item.DishID)
		if id == "" || item.Quantity <= 0 {
			continue
		}
		qtyByDish[id] += item.Quantity
	}
	if len(qtyByDish) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные позиции заказа"})
		return
	}

	ids := make([]string, 0, len(qtyByDish))
	for id := range qtyByDish {
		ids = append(ids, id)
	}

	var dishes []models.Dish
	if err := database.DB.Where("id IN ?", ids).Find(&dishes).Error; err != nil {
		log.Printf("create order load dishes: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load menu items"})
		return
	}
	byID := make(map[string]models.Dish, len(dishes))
	for _, d := range dishes {
		byID[d.ID] = d
	}

	var totalPrice float64
	var orderItems []models.OrderItem
	for dishID, qty := range qtyByDish {
		dish, ok := byID[dishID]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неизвестное блюдо в заказе: " + dishID})
			return
		}
		line := dish.Price * float64(qty)
		totalPrice += line
		orderItems = append(orderItems, models.OrderItem{
			DishID:    dish.ID,
			DishTitle: dish.Title,
			Quantity:  qty,
			Price:     dish.Price,
			ImageUrl:  dish.ImageURL,
		})
	}

	finalPrice, _ := finalizeOrderTotal(totalPrice)

	order := models.Order{
		UserID:          userPtr,
		GuestName:       strings.TrimSpace(req.GuestName),
		GuestPhone:      strings.TrimSpace(req.GuestPhone),
		GuestEmail:      strings.TrimSpace(req.GuestEmail),
		Status:          "new",
		TotalPrice:      finalPrice,
		DeliveryAddress: strings.TrimSpace(req.DeliveryAddress),
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Omit("Items").Create(&order).Error; err != nil {
			return err
		}
		for i := range orderItems {
			orderItems[i].OrderID = order.ID
		}
		if len(orderItems) > 0 {
			if err := tx.Create(&orderItems).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		log.Printf("create order db error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	resp := order
	if err := database.DB.Preload("Items").First(&resp, order.ID).Error; err != nil {
		log.Printf("reload order: %v", err)
		resp = order
	}

	if smsc.Enabled() {
		msg := formatNewOrderSMS(resp)
		phones := smsc.NotifyPhones()
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
			defer cancel()
			if err := smsc.Send(ctx, phones, msg); err != nil {
				log.Printf("smsc new order notify: %v", err)
			}
		}()
	}

	c.JSON(http.StatusOK, resp)
}

func GetOrders(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var orders []models.Order
	if err := database.DB.Preload("Items").Where("user_id = ?", userID).Order("created_at desc").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	c.JSON(http.StatusOK, orders)
}
