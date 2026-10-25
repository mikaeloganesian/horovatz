package menuimport

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/horovats/backend/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestSnapshot(t *testing.T) {
	plan, err := Load("regular", false)
	if err != nil {
		t.Fatal(err)
	}
	if len(plan.Categories) != 15 || len(plan.Dishes) != 109 || plan.Skipped != 8 {
		t.Fatalf("unexpected snapshot: %d categories, %d dishes, %d skipped", len(plan.Categories), len(plan.Dishes), plan.Skipped)
	}
	all, err := Load("promo", true)
	if err != nil {
		t.Fatal(err)
	}
	if len(all.Categories) != 16 || len(all.Dishes) != 117 {
		t.Fatal("unavailable dishes missing")
	}
	if plan.Dishes[0].Price != 799 || all.Dishes[0].Price != 639.2 {
		t.Fatal("regular/promo prices confused")
	}
	if _, err := Load("unknown", false); err == nil {
		t.Fatal("accepted unknown price mode")
	}
}

func TestRejectInvalidReferencesAndDuplicates(t *testing.T) {
	cat := []sourceCategory{{Category: models.Category{ID: "cat", Title: "Category"}, Available: true}}
	dish := sourceDish{Dish: models.Dish{ID: "dish", Title: "Dish", CategoryID: "missing", Price: 10}, Available: true}
	if _, err := prepare(cat, []sourceDish{dish}, "regular", false); err == nil {
		t.Fatal("accepted missing category")
	}
	dish.CategoryID = "cat"
	if _, err := prepare(cat, []sourceDish{dish, dish}, "regular", false); err == nil {
		t.Fatal("accepted duplicate dish")
	}
}

func TestApplyBackupIdempotencyAndReplacement(t *testing.T) {
	path := filepath.Join(t.TempDir(), "menu.db")
	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err = db.AutoMigrate(&models.Category{}, &models.Dish{}, &models.User{}, &models.Order{}, &models.OrderItem{}); err != nil {
		t.Fatal(err)
	}
	db.Create(&models.Category{ID: "manual", Title: "Manual"})
	db.Create(&models.Dish{ID: "manual", Title: "Manual", CategoryID: "manual", Price: 1})
	db.Create(&models.User{Email: "owner@example.test", Phone: "1", PasswordHash: "test"})
	db.Create(&models.Order{TotalPrice: 123, Items: []models.OrderItem{{DishID: "manual", DishTitle: "Historic dish", Price: 123, Quantity: 1}}})
	plan, err := Load("regular", false)
	if err != nil {
		t.Fatal(err)
	}
	backup, err := Apply(db, path, plan, false)
	if err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(backup)
	if err != nil || info.Mode().Perm() != 0600 {
		t.Fatal("backup missing or permissions incorrect")
	}
	before, err := gorm.Open(sqlite.Open(backup), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	var count int64
	before.Model(&models.Dish{}).Count(&count)
	if count != 1 {
		t.Fatalf("backup does not represent previous menu: %d", count)
	}
	db.Model(&models.Dish{}).Where("id = ?", plan.Dishes[0].ID).Update("recommendation", "Keep me")
	if _, err = Apply(db, path, plan, false); err != nil {
		t.Fatal(err)
	}
	db.Model(&models.Dish{}).Count(&count)
	if count != 110 {
		t.Fatalf("repeat import duplicated or removed dishes: %d", count)
	}
	var first models.Dish
	db.First(&first, "id = ?", plan.Dishes[0].ID)
	if first.Recommendation != "Keep me" {
		t.Fatal("upsert removed recommendation")
	}
	if _, err = Apply(db, path, plan, true); err != nil {
		t.Fatal(err)
	}
	db.Model(&models.Dish{}).Count(&count)
	if count != 109 {
		t.Fatal("replacement did not remove old menu")
	}
	db.Model(&models.User{}).Count(&count)
	if count != 1 {
		t.Fatal("accounts changed")
	}
	var order models.Order
	db.Preload("Items").First(&order)
	if order.TotalPrice != 123 || len(order.Items) != 1 || order.Items[0].DishTitle != "Historic dish" {
		t.Fatal("order history changed")
	}
}
