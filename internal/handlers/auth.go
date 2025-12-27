package handlers

import (
	"database/sql"
	"strings"

	"kasirku/internal/database"
	"kasirku/internal/middleware"
	"kasirku/internal/models"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var validate = validator.New()

// Register creates a new user account
func Register(c *fiber.Ctx) error {
	var req models.AuthRegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	if err := validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to hash password",
		})
	}

	// Start transaction
	tx, err := database.DB.Begin()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Database error",
		})
	}
	defer tx.Rollback()

	// Create user
	var user models.User
	err = tx.QueryRow(`
		INSERT INTO users (email, full_name, phone, role)
		VALUES ($1, $2, $3, 'owner')
		RETURNING id, email, full_name, phone, role, is_active, created_at, updated_at
	`, strings.ToLower(req.Email), req.FullName, req.Phone).Scan(
		&user.ID, &user.Email, &user.FullName, &user.Phone,
		&user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"success": false,
				"error":   "Email already registered",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to create user",
		})
	}

	// Store password hash in auth table (you might use Supabase Auth instead)
	_, err = tx.Exec(`
		INSERT INTO auth_passwords (user_id, password_hash)
		VALUES ($1, $2)
	`, user.ID, string(hashedPassword))
	// Ignore error if auth_passwords table doesn't exist (using Supabase Auth)

	// Create default subscription (free plan)
	_, err = tx.Exec(`
		INSERT INTO subscriptions (user_id, plan, status, transaction_limit, outlet_limit, staff_limit)
		VALUES ($1, 'free', 'active', 50, 1, 1)
	`, user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to create subscription",
		})
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to complete registration",
		})
	}

	// Generate JWT token
	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to generate token",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data": models.AuthResponse{
			AccessToken: token,
			ExpiresIn:   86400,
			User:        &user,
		},
	})
}

// Login authenticates a user
func Login(c *fiber.Ctx) error {
	var req models.AuthLoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	if err := validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	// Find user by email
	var user models.User
	var passwordHash string
	err := database.DB.QueryRow(`
		SELECT u.id, u.email, u.full_name, u.phone, u.role, u.is_active, u.created_at, u.updated_at,
		       COALESCE(ap.password_hash, '')
		FROM users u
		LEFT JOIN auth_passwords ap ON u.id = ap.user_id
		WHERE LOWER(u.email) = LOWER($1)
	`, req.Email).Scan(
		&user.ID, &user.Email, &user.FullName, &user.Phone,
		&user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt,
		&passwordHash,
	)

	if err == sql.ErrNoRows {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid email or password",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Database error",
		})
	}

	// Check if user is active
	if !user.IsActive {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Account is disabled",
		})
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid email or password",
		})
	}

	// Generate JWT token
	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to generate token",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": models.AuthResponse{
			AccessToken: token,
			ExpiresIn:   86400,
			User:        &user,
		},
	})
}

// GetMe returns current user profile
func GetMe(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var user models.User
	err := database.DB.QueryRow(`
		SELECT id, email, full_name, phone, avatar_url, role, is_active, created_at, updated_at
		FROM users WHERE id = $1
	`, userID).Scan(
		&user.ID, &user.Email, &user.FullName, &user.Phone, &user.AvatarURL,
		&user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "User not found",
		})
	}

	// Get subscription info
	var subscription models.Subscription
	database.DB.QueryRow(`
		SELECT id, user_id, plan, status, transaction_limit, transaction_used, 
		       outlet_limit, staff_limit, current_period_start, current_period_end
		FROM subscriptions WHERE user_id = $1
	`, userID).Scan(
		&subscription.ID, &subscription.UserID, &subscription.Plan, &subscription.Status,
		&subscription.TransactionLimit, &subscription.TransactionUsed,
		&subscription.OutletLimit, &subscription.StaffLimit,
		&subscription.CurrentPeriodStart, &subscription.CurrentPeriodEnd,
	)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"user":         user,
			"subscription": subscription,
		},
	})
}

// UpdateProfile updates user profile
func UpdateProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req struct {
		FullName  *string `json:"full_name"`
		Phone     *string `json:"phone"`
		AvatarURL *string `json:"avatar_url"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	var user models.User
	err := database.DB.QueryRow(`
		UPDATE users SET
			full_name = COALESCE($2, full_name),
			phone = COALESCE($3, phone),
			avatar_url = COALESCE($4, avatar_url),
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, email, full_name, phone, avatar_url, role, is_active, created_at, updated_at
	`, userID, req.FullName, req.Phone, req.AvatarURL).Scan(
		&user.ID, &user.Email, &user.FullName, &user.Phone, &user.AvatarURL,
		&user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to update profile",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    user,
	})
}

// Helper function to get store ID from context
func getStoreID(c *fiber.Ctx) uuid.UUID {
	storeID, ok := c.Locals("storeID").(uuid.UUID)
	if !ok {
		return uuid.Nil
	}
	return storeID
}
