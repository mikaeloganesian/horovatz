package database

import (
	"log"
	"os"

	"github.com/horovats/backend/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	var err error
	DB, err = gorm.Open(sqlite.Open("horovats.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	err = DB.AutoMigrate(&models.User{}, &models.Category{}, &models.Dish{}, &models.Order{}, &models.OrderItem{})
	if err != nil {
		log.Fatalf("Failed to auto-migrate database: %v", err)
	}

	seedData(DB)
}

func seedData(db *gorm.DB) {
	adminEmail := os.Getenv("ADMIN_BOOTSTRAP_EMAIL")
	if adminEmail == "" {
		adminEmail = "admin@horovats.com"
	}

	var admin models.User
	if db.Where("email = ?", adminEmail).First(&admin).Error != nil {
		isRelease := os.Getenv("GIN_MODE") == "release"
		pw := os.Getenv("ADMIN_BOOTSTRAP_PASSWORD")
		if pw == "" {
			if isRelease {
				log.Println("ADMIN_BOOTSTRAP_PASSWORD not set; skipping admin bootstrap in release mode")
			} else {
				pw = "admin123"
				log.Println("WARNING: ADMIN_BOOTSTRAP_PASSWORD not set; using default dev password for admin bootstrap")
			}
		}
		if pw != "" {
			hash, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
			if err != nil {
				log.Printf("admin bootstrap: hash error: %v", err)
			} else if err := db.Create(&models.User{
				Email:        adminEmail,
				PasswordHash: string(hash),
				Role:         models.RoleAdmin,
			}).Error; err != nil {
				log.Printf("admin bootstrap: create error: %v", err)
			} else {
				log.Println("Admin user seeded.")
			}
		}
	}

	// Seed Categories
	var count int64
	db.Model(&models.Category{}).Count(&count)
	if count == 0 {
		categories := []models.Category{
			{ID: "all", Title: "Все позиции", Subtitle: "Полный список наших блюд"},
			{ID: "hacapuri", Title: "Хачапури", Subtitle: "Традиционная грузинская выпечка"},
			{ID: "pirogi", Title: "Пироги", Subtitle: "Сытные пироги с начинками"},
			{ID: "pizza", Title: "Пицца", Subtitle: "Классика на тонком тесте"},
			{ID: "holodnye_zakuski", Title: "Закуски", Subtitle: "Легкие блюда для начала"},
			{ID: "saurma", Title: "Шаурма", Subtitle: "Сочное мясо в лаваше"},
			{ID: "saslyk___gril_", Title: "Гриль", Subtitle: "Блюда на углях"},
			{ID: "goracie_zakuski", Title: "Горячее", Subtitle: "Аппетитные горячие закуски"},
			{ID: "goracie_bluda", Title: "Блюда", Subtitle: "Основные блюда кухни"},
			{ID: "supy", Title: "Супы", Subtitle: "Ароматные первые блюда"},
			{ID: "hinkali", Title: "Хинкали", Subtitle: "Грузинские пельмени"},
			{ID: "ryba_i_moreprodukty", Title: "Рыба", Subtitle: "Свежие дары моря"},
			{ID: "kombo", Title: "Комбо", Subtitle: "Выгодные наборы"},
			{ID: "sousy", Title: "Соусы", Subtitle: "Фирменные дополнения"},
			{ID: "bizneslanc", Title: "Ланч", Subtitle: "Полноценный обед"},
			{ID: "salaty", Title: "Салаты", Subtitle: "Свежесть и заправки"},
			{ID: "napitki", Title: "Напитки", Subtitle: "Освежающий выбор"},
			{ID: "deserty", Title: "Десерты", Subtitle: "Сладкое завершение"},
			{ID: "hleb", Title: "Хлеб", Subtitle: "Свежая выпечка"},
		}
		db.Create(&categories)
		log.Println("Categories seeded.")

		// Seed Dishes
		dishes := []models.Dish{
			{ID: "hacapuri_0", Title: "Имеритинский", Description: "Традиционный закрытый хачапури с нежным сыром сулугуни внутри.", Price: 450, Weight: "500г", CategoryID: "hacapuri", Ingredients: "Тесто, сыр сулугуни", Recommendation: "Сацебели"},
			{ID: "hacapuri_1", Title: "Мегрельский", Description: "Особенный хачапури с двойным слоем сыра сулугуни.", Price: 520, Weight: "500г", CategoryID: "hacapuri", Ingredients: "Тесто, двойной сыр сулугуни", Recommendation: "Ткемали"},
			{ID: "hacapuri_2", Title: "Кубдари", Description: "Сытный мясной пирог родом из Сванетии.", Price: 580, Weight: "400г", CategoryID: "hacapuri", Ingredients: "Фарш, говядина, свинина", Recommendation: "Сацебели"},
			{ID: "hacapuri_3", Title: "По-аджарски", Description: "Знаменитая лодочка с открытой начинкой из расплавленного сыра.", Price: 490, Weight: "400г", CategoryID: "hacapuri", Ingredients: "Тесто, сыр, яйцо, сливочное масло", Recommendation: "Ткемали"},
		}
		db.Create(&dishes)
		log.Println("Dishes seeded.")
	}
}
