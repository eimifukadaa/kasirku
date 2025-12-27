package main

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	"kasirku/internal/config"
	"kasirku/internal/database"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Load config
	if err := config.Load(); err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database
	if err := database.Connect(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// 1. Update visualdendy@gmail.com to owner
	adminEmail := "visualdendy@gmail.com"
	_, err := database.DB.Exec(`
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

	// Check if staff exists
	var staffID uuid.UUID
	err = database.DB.QueryRow(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, staffEmail).Scan(&staffID)

	if err == sql.ErrNoRows {
		// Get first store to associate staff with if needed (though user-store link handles access)
		var storeID uuid.UUID
		err = database.DB.QueryRow(`SELECT id FROM stores LIMIT 1`).Scan(&storeID)
		if err != nil {
			log.Printf("Warning: No store found to associate staff with. Staff might need to be added to a store later.")
		}

		// Hash password
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(staffPassword), bcrypt.DefaultCost)

		// Start transaction
		tx, err := database.DB.Begin()
		if err != nil {
			log.Fatal(err)
		}
		defer tx.Rollback()

		// Insert user
		err = tx.QueryRow(`
			INSERT INTO users (email, full_name, role, is_active)
			VALUES ($1, $2, 'cashier', true)
			RETURNING id
		`, strings.ToLower(staffEmail), staffName).Scan(&staffID)
		if err != nil {
			log.Fatalf("Failed to create staff user: %v", err)
		}

		// Insert password
		_, err = tx.Exec(`
			INSERT INTO auth_passwords (user_id, password_hash)
			VALUES ($1, $2)
		`, staffID, string(hashedPassword))
		if err != nil {
			log.Fatalf("Failed to insert staff password: %v", err)
		}

		// Create free subscription for staff (simplified, usually staff shares owner's sub)
		_, err = tx.Exec(`
			INSERT INTO subscriptions (user_id, plan, status, transaction_limit, outlet_limit, staff_limit)
			VALUES ($1, 'free', 'active', 50, 1, 1)
		`, staffID)

		if err := tx.Commit(); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("✅ Staff user %s created as cashier (Password: %s)\n", staffEmail, staffPassword)
	} else {
		fmt.Printf("ℹ️ Staff user %s already exists\n", staffEmail)
	}
}
