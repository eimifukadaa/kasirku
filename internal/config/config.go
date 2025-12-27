package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	Env                string
	SupabaseURL        string
	SupabaseAnonKey    string
	SupabaseServiceKey string
	DatabaseURL        string
	JWTSecret          string
	JWTExpiry          time.Duration
	FonnteAPIKey       string
	FonnteAPIURL       string
	WablasAPIKey       string
	WablasAPIURL       string
	CORSOrigins        string
	RateLimitMax       int
	RateLimitWindow    int
}

var AppConfig *Config

func Load() error {
	// Try loading .env file - it's OK if it doesn't exist in production
	// Railway and other platforms inject env vars directly
	_ = godotenv.Load()
	_ = godotenv.Load("../.env")
	_ = godotenv.Load("../../.env")

	jwtExpiry, _ := time.ParseDuration(getEnv("JWT_EXPIRY", "24h"))
	rateLimitMax, _ := strconv.Atoi(getEnv("RATE_LIMIT_MAX", "100"))
	rateLimitWindow, _ := strconv.Atoi(getEnv("RATE_LIMIT_WINDOW", "60"))

	// Get DATABASE_URL or construct from Supabase URL
	databaseURL := getEnv("DATABASE_URL", "")
	supabaseURL := getEnv("SUPABASE_URL", "")

	// If DATABASE_URL is empty but SUPABASE_URL exists, we need the user to provide DATABASE_URL
	// Supabase requires a separate connection string that includes the password
	if databaseURL == "" && supabaseURL != "" {
		// Try to use pooler connection string if available
		databaseURL = getEnv("SUPABASE_DB_URL", "")
	}

	AppConfig = &Config{
		Port:               getEnv("PORT", "8080"),
		Env:                getEnv("ENV", "development"),
		SupabaseURL:        supabaseURL,
		SupabaseAnonKey:    getEnv("SUPABASE_ANON_KEY", ""),
		SupabaseServiceKey: getEnv("SUPABASE_SERVICE_KEY", ""),
		DatabaseURL:        databaseURL,
		JWTSecret:          getEnv("JWT_SECRET", ""),
		JWTExpiry:          jwtExpiry,
		FonnteAPIKey:       getEnv("FONNTE_API_KEY", ""),
		FonnteAPIURL:       getEnv("FONNTE_API_URL", "https://api.fonnte.com/send"),
		WablasAPIKey:       getEnv("WABLAS_API_KEY", ""),
		WablasAPIURL:       getEnv("WABLAS_API_URL", "https://pati.wablas.com/api/send-message"),
		CORSOrigins:        getEnv("CORS_ORIGINS", "*"),
		RateLimitMax:       rateLimitMax,
		RateLimitWindow:    rateLimitWindow,
	}

	// Validation - require DATABASE_URL for the app to work
	if AppConfig.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required. Get it from Supabase Dashboard > Project Settings > Database > Connection String > URI (use the Transaction Pooler if available)")
	}

	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func IsDevelopment() bool {
	return AppConfig.Env == "development"
}

func IsProduction() bool {
	return AppConfig.Env == "production"
}
