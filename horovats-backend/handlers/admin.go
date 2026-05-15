package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/horovats/backend/database"
	"github.com/horovats/backend/models"
)

// Categories Admin CRUD
func CreateCategory(c *gin.Context) {
	var category models.Category
	if err := c.ShouldBindJSON(&category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, category)
}

type UpdateCategoryBody struct {
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Icon     string `json:"icon"`
}

func UpdateCategory(c *gin.Context) {
	id := c.Param("id")
	var category models.Category
	if err := database.DB.First(&category, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	var body UpdateCategoryBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	category.Title = body.Title
	category.Subtitle = body.Subtitle
	category.Icon = body.Icon

	if err := database.DB.Save(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, category)
}

func DeleteCategory(c *gin.Context) {
	id := c.Param("id")
	var dishCount int64
	if err := database.DB.Model(&models.Dish{}).Where("category_id = ?", id).Count(&dishCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if dishCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Сначала удалите или перенесите блюда этой категории"})
		return
	}
	if err := database.DB.Delete(&models.Category{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Category deleted"})
}

// Dishes Admin CRUD
func CreateDish(c *gin.Context) {
	var dish models.Dish
	if err := c.ShouldBindJSON(&dish); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	dish.RecommendedDishID = strings.TrimSpace(dish.RecommendedDishID)
	if dish.RecommendedDishID == dish.ID && dish.RecommendedDishID != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dish cannot recommend itself"})
		return
	}
	if dish.RecommendedDishID != "" {
		var linked models.Dish
		if err := database.DB.First(&linked, "id = ?", dish.RecommendedDishID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Recommended dish not found"})
			return
		}
	}

	if err := database.DB.Create(&dish).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dish)
}

type UpdateDishBody struct {
	Title          string  `json:"title"`
	Description    string  `json:"description"`
	Price          float64 `json:"price"`
	Weight         string  `json:"weight"`
	CategoryID     string  `json:"categoryId"`
	ImageURL       string  `json:"imageUrl"`
	Ingredients    string  `json:"ingredients"`
	Recommendation string  `json:"recommendation"`
	RecommendedDishID string `json:"recommendedDishId"`
}

func UpdateDish(c *gin.Context) {
	id := c.Param("id")
	var dish models.Dish
	if err := database.DB.First(&dish, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dish not found"})
		return
	}

	var body UpdateDishBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dish.Title = body.Title
	dish.Description = body.Description
	dish.Price = body.Price
	dish.Weight = body.Weight
	dish.CategoryID = body.CategoryID
	dish.ImageURL = body.ImageURL
	dish.Ingredients = body.Ingredients
	dish.Recommendation = body.Recommendation
	dish.RecommendedDishID = strings.TrimSpace(body.RecommendedDishID)
	if dish.RecommendedDishID == dish.ID && dish.RecommendedDishID != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dish cannot recommend itself"})
		return
	}
	if dish.RecommendedDishID != "" {
		var linked models.Dish
		if err := database.DB.First(&linked, "id = ?", dish.RecommendedDishID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Recommended dish not found"})
			return
		}
	}

	if err := database.DB.Save(&dish).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dish)
}

func DeleteDish(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Dish{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Dish deleted"})
}
