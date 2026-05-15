package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/horovats/backend/database"
	"github.com/horovats/backend/models"
)

// --- Users (admin) ---

func AdminListUsers(c *gin.Context) {
	var users []models.User
	if err := database.DB.Order("id asc").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

type AdminUpdateUserRequest struct {
	Name    string `json:"name"`
	Phone   string `json:"phone"`
	Address string `json:"address"`
	Role    string `json:"role"`
}

func AdminUpdateUser(c *gin.Context) {
	idStr := c.Param("id")
	targetID64, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user id"})
		return
	}
	targetID := uint(targetID64)

	var existing models.User
	if err := database.DB.First(&existing, targetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req AdminUpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	newRole := models.UserRole(req.Role)
	if req.Role != "" && newRole != models.RoleAdmin && newRole != models.RoleCustomer {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role"})
		return
	}

	if req.Role != "" && existing.Role == models.RoleAdmin && newRole == models.RoleCustomer {
		var adminCount int64
		database.DB.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&adminCount)
		if adminCount <= 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot demote the last administrator"})
			return
		}
	}

	existing.Name = req.Name
	existing.Phone = req.Phone
	existing.Address = req.Address
	if req.Role != "" {
		existing.Role = newRole
	}

	if err := database.DB.Save(&existing).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user (phone may be taken)"})
		return
	}

	c.JSON(http.StatusOK, existing)
}

func AdminDeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	targetID64, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user id"})
		return
	}
	targetID := uint(targetID64)

	currentUID, _ := c.Get("userID")
	if targetID == currentUID.(uint) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete yourself"})
		return
	}

	var existing models.User
	if err := database.DB.First(&existing, targetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if existing.Role == models.RoleAdmin {
		var adminCount int64
		database.DB.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&adminCount)
		if adminCount <= 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete the last administrator"})
			return
		}
	}

	if err := database.DB.Delete(&models.User{}, targetID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted"})
}

// --- Orders (admin) ---

func AdminListOrders(c *gin.Context) {
	var orders []models.Order
	if err := database.DB.Preload("Items").Order("created_at desc").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list orders"})
		return
	}
	c.JSON(http.StatusOK, orders)
}

func AdminGetOrder(c *gin.Context) {
	idStr := c.Param("id")
	var order models.Order
	if err := database.DB.Preload("Items").First(&order, idStr).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	c.JSON(http.StatusOK, order)
}

type AdminUpdateOrderRequest struct {
	Status          *string `json:"status"`
	DeliveryAddress *string `json:"deliveryAddress"`
}

func AdminUpdateOrder(c *gin.Context) {
	idStr := c.Param("id")
	var order models.Order
	if err := database.DB.First(&order, idStr).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	var req AdminUpdateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Status != nil {
		order.Status = strings.TrimSpace(*req.Status)
	}
	if req.DeliveryAddress != nil {
		order.DeliveryAddress = strings.TrimSpace(*req.DeliveryAddress)
	}

	if err := database.DB.Save(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order"})
		return
	}

	database.DB.Preload("Items").First(&order, order.ID)
	c.JSON(http.StatusOK, order)
}

func AdminDeleteOrder(c *gin.Context) {
	idStr := c.Param("id")
	oid, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order id"})
		return
	}

	if err := database.DB.Where("order_id = ?", oid).Delete(&models.OrderItem{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete order items"})
		return
	}
	if err := database.DB.Delete(&models.Order{}, oid).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order deleted"})
}
