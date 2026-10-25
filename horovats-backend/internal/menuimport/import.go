// Package menuimport imports a reviewed snapshot without touching accounts or orders.
package menuimport

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/horovats/backend/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

//go:embed data/xorovac.json
var snapshot []byte

type sourceCategory struct {
	models.Category
	Available bool `json:"available"`
}

type sourceDish struct {
	models.Dish
	Available  bool    `json:"available"`
	PromoPrice float64 `json:"promoPrice"`
}

type Plan struct {
	Categories    []models.Category
	Dishes        []models.Dish
	Skipped       int
	RemoveDishIDs []string
}

func Load(priceMode string, includeUnavailable bool) (Plan, error) {
	if priceMode != "regular" && priceMode != "promo" {
		return Plan{}, fmt.Errorf("price must be regular or promo")
	}
	var data struct {
		Categories      []sourceCategory `json:"categories"`
		Dishes          []sourceDish     `json:"dishes"`
		ExcludedDishIDs []string         `json:"excludedDishIds"`
	}
	if err := json.Unmarshal(snapshot, &data); err != nil {
		return Plan{}, err
	}
	plan, err := prepare(data.Categories, data.Dishes, priceMode, includeUnavailable)
	if err != nil {
		return Plan{}, err
	}
	for _, id := range data.ExcludedDishIDs {
		if !strings.HasPrefix(id, "ya-") || len(id) <= 3 {
			return Plan{}, fmt.Errorf("invalid excluded dish ID %q", id)
		}
		for _, dish := range plan.Dishes {
			if dish.ID == id {
				return Plan{}, fmt.Errorf("excluded dish %q is still in the menu", id)
			}
		}
	}
	plan.RemoveDishIDs = data.ExcludedDishIDs
	return plan, nil
}

func prepare(categories []sourceCategory, dishes []sourceDish, priceMode string, includeUnavailable bool) (Plan, error) {
	plan := Plan{}
	categoryIDs := map[string]bool{}
	for _, c := range categories {
		if c.ID == "" || strings.TrimSpace(c.Title) == "" || categoryIDs[c.ID] {
			return Plan{}, fmt.Errorf("invalid or duplicate category %q", c.ID)
		}
		categoryIDs[c.ID] = true
	}
	seen, used := map[string]bool{}, map[string]bool{}
	for _, item := range dishes {
		d := item.Dish
		if d.ID == "" || strings.TrimSpace(d.Title) == "" || seen[d.ID] || !categoryIDs[d.CategoryID] {
			return Plan{}, fmt.Errorf("invalid dish %q", d.ID)
		}
		seen[d.ID] = true
		if priceMode == "promo" {
			d.Price = item.PromoPrice
		}
		if d.Price <= 0 || math.IsNaN(d.Price) || math.IsInf(d.Price, 0) {
			return Plan{}, fmt.Errorf("invalid price for %q", d.ID)
		}
		if !item.Available && !includeUnavailable {
			plan.Skipped++
			continue
		}
		plan.Dishes = append(plan.Dishes, d)
		used[d.CategoryID] = true
	}
	for _, c := range categories {
		if used[c.ID] {
			plan.Categories = append(plan.Categories, c.Category)
		}
	}
	if len(plan.Dishes) == 0 {
		return Plan{}, fmt.Errorf("refusing empty menu")
	}
	return plan, nil
}

// Apply always takes a consistent SQLite backup before changing the menu.
// Existing recommendations survive an upsert; a replacement intentionally clears them.
func Apply(db *gorm.DB, dbPath string, plan Plan, replace bool) (string, error) {
	return apply(db, dbPath, plan, replace, false)
}

// ApplyDescriptions changes only descriptions of existing dishes and explicit removals.
func ApplyDescriptions(db *gorm.DB, dbPath string, plan Plan) (string, error) {
	return apply(db, dbPath, plan, false, true)
}

func apply(db *gorm.DB, dbPath string, plan Plan, replace, descriptionsOnly bool) (string, error) {
	if len(plan.Categories) == 0 || len(plan.Dishes) == 0 {
		return "", fmt.Errorf("refusing empty menu")
	}
	abs, err := filepath.Abs(dbPath)
	if err != nil {
		return "", err
	}
	backup := fmt.Sprintf("%s.menu-backup-%d", abs, time.Now().UnixNano())
	// SQLite supports bound parameters for VACUUM INTO. This also includes WAL data.
	if err := db.Exec("VACUUM INTO ?", backup).Error; err != nil {
		return "", fmt.Errorf("backup failed: %w", err)
	}
	if err := os.Chmod(backup, 0600); err != nil {
		return backup, err
	}
	err = db.Transaction(func(tx *gorm.DB) error {
		if len(plan.RemoveDishIDs) > 0 {
			if err := tx.Where("id IN ?", plan.RemoveDishIDs).Delete(&models.Dish{}).Error; err != nil {
				return err
			}
			// Recommendations to a removed dish must not point to a missing record.
			if err := tx.Model(&models.Dish{}).Where("recommended_dish_id IN ?", plan.RemoveDishIDs).Update("recommended_dish_id", "").Error; err != nil {
				return err
			}
		}
		if descriptionsOnly {
			for _, dish := range plan.Dishes {
				if err := tx.Model(&models.Dish{}).Where("id = ?", dish.ID).Update("description", dish.Description).Error; err != nil {
					return err
				}
			}
			return nil
		}
		if replace {
			if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Dish{}).Error; err != nil {
				return err
			}
			if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Category{}).Error; err != nil {
				return err
			}
		}
		if err := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "id"}}, DoUpdates: clause.AssignmentColumns([]string{"title", "subtitle", "icon"})}).Create(&plan.Categories).Error; err != nil {
			return err
		}
		return tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "id"}}, DoUpdates: clause.AssignmentColumns([]string{"title", "description", "price", "weight", "category_id", "image_url", "ingredients"})}).CreateInBatches(&plan.Dishes, 50).Error
	})
	return backup, err
}
