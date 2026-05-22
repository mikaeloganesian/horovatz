package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/horovats/backend/database"
	"github.com/horovats/backend/handlers"
	"github.com/horovats/backend/middleware"
	"github.com/horovats/backend/models"
	"github.com/joho/godotenv"
)

func main() {
	// Подхватывает .env из текущей директории (рядом с бинарником при `go run`). Если файла нет — ок.
	_ = godotenv.Load()

	if m := os.Getenv("GIN_MODE"); m != "" {
		gin.SetMode(m)
	}

	database.InitDB()

	// Ensure uploads directory exists
	if err := os.MkdirAll("./uploads", os.ModePerm); err != nil {
		log.Fatalf("Failed to create uploads directory: %v", err)
	}

	r := gin.Default()

	// CORS: явно разрешаем локальную разработку (в т.ч. preflight с Authorization)
	localOrigins := []string{
		"http://localhost:5173",
		"http://localhost:5174",
		"http://localhost:4173",
		"http://localhost:3000",
		"http://127.0.0.1:5173",
		"http://127.0.0.1:5174",
		"http://127.0.0.1:4173",
		"http://127.0.0.1:3000",
	}
	if extra := os.Getenv("CORS_ORIGINS"); extra != "" {
		for _, o := range strings.Split(extra, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				localOrigins = append(localOrigins, o)
			}
		}
	}

	corsCfg := cors.Config{
		AllowOrigins:     localOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}
	r.Use(cors.New(corsCfg))

	// Static route for images (/uploads and /api/uploads for same-origin API prefix)
	r.Static("/uploads", "./uploads")

	api := r.Group("/api")
	api.Static("/uploads", "./uploads")
	{
		// Public Auth
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
		}

		// Public Menu
		api.GET("/categories", handlers.GetCategories)
		api.GET("/dishes", handlers.GetDishes)

		// Заказ без авторизации (гость) или с JWT — см. handlers.CreateOrder
		api.POST("/orders", handlers.CreateOrder)

		// Protected User Routes
		user := api.Group("/users")
		user.Use(middleware.AuthMiddleware(models.User{}))
		{
			user.GET("/profile", handlers.GetProfile)
			user.PUT("/profile", handlers.UpdateProfile)
		}

		// История заказов только для авторизованных
		orders := api.Group("/orders")
		orders.Use(middleware.AuthMiddleware(models.User{}))
		{
			orders.GET("/", handlers.GetOrders)
		}

		// Protected Admin Routes
		admin := api.Group("/")
		admin.Use(middleware.AuthMiddleware(models.User{}), middleware.AdminMiddleware())
		{
			admin.POST("/categories", handlers.CreateCategory)
			admin.PUT("/categories/:id", handlers.UpdateCategory)
			admin.DELETE("/categories/:id", handlers.DeleteCategory)

			admin.POST("/dishes", handlers.CreateDish)
			admin.PUT("/dishes/:id", handlers.UpdateDish)
			admin.DELETE("/dishes/:id", handlers.DeleteDish)

			admin.POST("/upload", handlers.UploadImage)

			admin.GET("/admin/users", handlers.AdminListUsers)
			admin.PUT("/admin/users/:id", handlers.AdminUpdateUser)
			admin.DELETE("/admin/users/:id", handlers.AdminDeleteUser)

			admin.GET("/admin/orders", handlers.AdminListOrders)
			admin.GET("/admin/orders/:id", handlers.AdminGetOrder)
			admin.PUT("/admin/orders/:id", handlers.AdminUpdateOrder)
			admin.DELETE("/admin/orders/:id", handlers.AdminDeleteOrder)
		}
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	log.Println("Server started on :8080")
	r.Run(":8080")
}
