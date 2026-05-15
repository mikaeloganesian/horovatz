package models

import (
	"time"
)

type UserRole string

const (
	RoleAdmin    UserRole = "admin"
	RoleCustomer UserRole = "customer"
)

type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Email        string    `gorm:"uniqueIndex;not null" json:"email"`
	Phone        string    `gorm:"uniqueIndex" json:"phone"`
	Name         string    `json:"name"`
	Address      string    `json:"address"`
	PasswordHash string    `gorm:"not null" json:"-"` // Omitted from JSON responses
	Role         UserRole  `gorm:"default:customer" json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Category struct {
	ID       string `gorm:"primaryKey" json:"id"` // using string IDs like "hacapuri" from frontend
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Icon     string `json:"icon"`
}

type Dish struct {
	ID             string  `gorm:"primaryKey" json:"id"`
	Title          string  `json:"title"`
	Description    string  `json:"description"`
	Price          float64 `json:"price"`
	Weight         string  `json:"weight"`
	CategoryID     string  `gorm:"index" json:"categoryId"`
	ImageURL       string  `json:"imageUrl"`
	Ingredients    string  `json:"ingredients"`
	Recommendation string  `json:"recommendation"`
	RecommendedDishID string `gorm:"index" json:"recommendedDishId"`
}

type Order struct {
	ID              uint        `gorm:"primaryKey" json:"id"`
	UserID          *uint       `gorm:"index" json:"userId"` // nil для гостевого заказа
	GuestName       string      `json:"guestName,omitempty"`
	GuestPhone      string      `json:"guestPhone,omitempty"`
	GuestEmail      string      `json:"guestEmail,omitempty"`
	Status          string      `gorm:"default:new" json:"status"` // new, processing, completed
	TotalPrice      float64     `json:"totalPrice"`
	DeliveryAddress string      `json:"deliveryAddress"`
	CreatedAt       time.Time   `json:"created_at"`
	Items           []OrderItem `gorm:"foreignKey:OrderID" json:"items"`
}

type OrderItem struct {
	ID         uint    `gorm:"primaryKey" json:"id"`
	OrderID    uint    `gorm:"index" json:"orderId"`
	DishID     string  `json:"dishId"`
	DishTitle  string  `json:"dishTitle"`
	Quantity   int     `json:"quantity"`
	Price      float64 `json:"price"`
	ImageUrl   string  `json:"imageUrl"`
}
