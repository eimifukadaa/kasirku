package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run setup_prod.go \"your_database_url\"")
		fmt.Println("Example: go run setup_prod.go \"postgres://user:pass@host:port/db?sslmode=require\"")
		os.Exit(1)
	}

	dbURL := os.Args[1]
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	fmt.Println("🔌 Connected to database!")

	// 1. Update visualdendy@gmail.com to owner
	adminEmail := "visualdendy@gmail.com"
	_, err = db.Exec(`
		UPDATE users SET role = 'owner', is_active = true 
		WHERE LOWER(email) = LOWER($1)
	`, adminEmail)
	if err != nil {
		log.Fatalf("Failed to update admin user: %v", err)
	}
	fmt.Printf("✅ User %s updated to owner\n", adminEmail)

	// 2. Create staff1@gmail.com as cashier
	staffEmail := "staff1@gmail.com"
	staffPassword := "staff12345678"
	staffName := "Staff Kasir 1"

	var staffID string
	err = db.QueryRow(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, staffEmail).Scan(&staffID)

	if err == sql.ErrNoRows {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(staffPassword), bcrypt.DefaultCost)

		tx, err := db.Begin()
		if err != nil {
			log.Fatal(err)
		}
		defer tx.Rollback()

		err = tx.QueryRow(`
			INSERT INTO users (id, email, full_name, role, is_active, created_at, updated_at)
			VALUES (gen_random_uuid(), $1, $2, 'staff', true, NOW(), NOW())
			RETURNING id
		`, strings.ToLower(staffEmail), staffName).Scan(&staffID)
		if err != nil {
			log.Fatalf("Failed to create staff user: %v", err)
		}

		_, err = tx.Exec(`
			INSERT INTO auth_passwords (user_id, password_hash)
			VALUES ($1, $2)
		`, staffID, string(hashedPassword))
		if err != nil {
			log.Fatalf("Failed to insert staff password: %v", err)
		}

		_, err = tx.Exec(`
			INSERT INTO subscriptions (user_id, plan, status, transaction_limit, outlet_limit, staff_limit)
			VALUES ($1, 'free', 'active', 50, 1, 1)
		`, staffID)

		if err := tx.Commit(); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("✅ Staff user %s created (Pass: %s)\n", staffEmail, staffPassword)
	} else {
		fmt.Printf("ℹ️ Staff user %s already exists\n", staffEmail)
	}
}
