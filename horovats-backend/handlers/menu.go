package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/horovats/backend/database"
	"github.com/horovats/backend/models"
)

func GetCategories(c *gin.Context) {
	var categories []models.Category
	if err := database.DB.Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load categories"})
		return
	}
	c.JSON(http.StatusOK, categories)
}

func GetDishes(c *gin.Context) {
	var dishes []models.Dish

	categoryID := c.Query("category_id")
	var err error
	if categoryID != "" {
		err = database.DB.Where("category_id = ?", categoryID).Find(&dishes).Error
	} else {
		err = database.DB.Find(&dishes).Error
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load dishes"})
		return
	}

	c.JSON(http.StatusOK, dishes)
}
