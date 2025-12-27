package middleware

import (
	"strings"
	"time"

	"kasirku/internal/config"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims represents JWT claims
type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	Email  string    `json:"email"`
	Role   string    `json:"role"`
	jwt.RegisteredClaims
}

// AuthMiddleware validates JWT tokens
func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Missing authorization header",
			})
		}

		// Extract token from "Bearer <token>"
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid authorization format",
			})
		}

		tokenString := tokenParts[1]

		// Parse and validate token
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(config.AppConfig.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid or expired token",
			})
		}

		// Store user info in context
		c.Locals("userID", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("role", claims.Role)

		return c.Next()
	}
}

// GenerateToken creates a new JWT token
func GenerateToken(userID uuid.UUID, email, role string) (string, error) {
	claims := &Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(config.AppConfig.JWTExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "kasirku",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}

// GetUserID extracts user ID from context
func GetUserID(c *fiber.Ctx) uuid.UUID {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return uuid.Nil
	}
	return userID
}

// GetUserEmail extracts email from context
func GetUserEmail(c *fiber.Ctx) string {
	email, ok := c.Locals("email").(string)
	if !ok {
		return ""
	}
	return email
}

// GetUserRole extracts role from context
func GetUserRole(c *fiber.Ctx) string {
	role, ok := c.Locals("role").(string)
	if !ok {
		return ""
	}
	return role
}

// StoreAccessMiddleware ensures user has access to the store
func StoreAccessMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		storeID := c.Params("storeId")
		if storeID == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   "Store ID is required",
			})
		}

		// Parse store UUID
		storeUUID, err := uuid.Parse(storeID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid store ID format",
			})
		}

		// Store the parsed UUID in context
		c.Locals("storeID", storeUUID)

		return c.Next()
	}
}

// OwnerOnlyMiddleware restricts access to store owners only
func OwnerOnlyMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		role := GetUserRole(c)
		if role != "owner" && role != "admin" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   "Owner access required",
			})
		}
		return c.Next()
	}
}
