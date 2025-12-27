package database

import (
	"database/sql"
	"fmt"

	"kasirku/internal/config"

	_ "github.com/lib/pq"
)

var DB *sql.DB

// Connect establishes a connection to the PostgreSQL database
func Connect() error {
	var err error
	DB, err = sql.Open("postgres", config.AppConfig.DatabaseURL)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Test the connection
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	// Set connection pool settings
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)

	// Set session timezone to Bali as requested
	_, err = DB.Exec("SET TIMEZONE = 'Asia/Makassar'")
	if err != nil {
		fmt.Printf("Warning: failed to set database timezone: %v\n", err)
	}

	return nil
}

// Close closes the database connection
func Close() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}

// Transaction helper for executing multiple queries in a transaction
func WithTransaction(fn func(tx *sql.Tx) error) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}

	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
			panic(p)
		}
	}()

	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
