package main

import (
	"flag"
	"fmt"
	"log"
	"net/url"
	"os"
	"path/filepath"

	"github.com/horovats/backend/internal/menuimport"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	dbPath := flag.String("db", "horovats.db", "existing SQLite database path")
	apply := flag.Bool("apply", false, "write changes (default: preview only)")
	replace := flag.Bool("replace-menu", false, "replace all existing categories and dishes; accounts and orders are preserved")
	price := flag.String("price", "regular", "regular or promo; the website's loyalty discounts still apply")
	include := flag.Bool("include-unavailable", false, "also publish unavailable source dishes")
	flag.Parse()
	plan, err := menuimport.Load(*price, *include)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Categories: %d; dishes: %d; unavailable skipped: %d; prices: %s; replace menu: %t\n", len(plan.Categories), len(plan.Dishes), plan.Skipped, *price, *replace)
	if !*apply {
		fmt.Println("Preview only. Add --apply to import; --replace-menu also removes the previous menu.")
		return
	}
	info, err := os.Stat(*dbPath)
	if err != nil || !info.Mode().IsRegular() {
		log.Fatal("Database does not exist or is not a regular file; start the backend first and check --db")
	}
	abs, err := filepath.Abs(*dbPath)
	if err != nil {
		log.Fatal(err)
	}
	dsn := (&url.URL{Scheme: "file", Path: abs}).String() + "?mode=rw&_busy_timeout=10000"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}
	backup, err := menuimport.Apply(db, abs, plan, *replace)
	if backup != "" {
		fmt.Println("Backup:", backup)
	}
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Menu imported successfully.")
}
