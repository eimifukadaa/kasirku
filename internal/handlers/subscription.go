package handlers

import (
	"kasirku/internal/database"
	"kasirku/internal/middleware"
	"kasirku/internal/models"

	"github.com/gofiber/fiber/v2"
)

// GetSubscription returns current user subscription
func GetSubscription(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var sub models.Subscription
	err := database.DB.QueryRow(`
		SELECT id, user_id, plan, status, transaction_limit, transaction_used,
		       outlet_limit, staff_limit, price_idr, current_period_start, current_period_end,
		       created_at, updated_at
		FROM subscriptions
		WHERE user_id = $1
	`, userID).Scan(
		&sub.ID, &sub.UserID, &sub.Plan, &sub.Status, &sub.TransactionLimit,
		&sub.TransactionUsed, &sub.OutletLimit, &sub.StaffLimit, &sub.PriceIDR,
		&sub.CurrentPeriodStart, &sub.CurrentPeriodEnd, &sub.CreatedAt, &sub.UpdatedAt,
	)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Subscription not found",
		})
	}

	// Get usage stats
	var storeCount, staffCount int
	database.DB.QueryRow(`SELECT COUNT(*) FROM stores WHERE user_id = $1 AND is_active = true`, userID).Scan(&storeCount)
	database.DB.QueryRow(`SELECT COUNT(*) FROM staff WHERE owner_id = $1 AND is_active = true`, userID).Scan(&staffCount)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"subscription": sub,
			"usage": fiber.Map{
				"stores_used":        storeCount,
				"stores_limit":       sub.OutletLimit,
				"staff_used":         staffCount,
				"staff_limit":        sub.StaffLimit,
				"transactions_used":  sub.TransactionUsed,
				"transactions_limit": sub.TransactionLimit,
			},
		},
	})
}

// GetPlans returns available subscription plans
func GetPlans(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"success": true,
		"data":    models.GetSubscriptionPlans(),
	})
}

// UpgradePlan upgrades user subscription
func UpgradePlan(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req struct {
		Plan          string `json:"plan" validate:"required,oneof=basic pro agency"`
		PaymentMethod string `json:"payment_method"`
		PaymentRef    string `json:"payment_reference"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// Get plan details
	var selectedPlan models.SubscriptionPlan
	for _, plan := range models.GetSubscriptionPlans() {
		if plan.ID == req.Plan {
			selectedPlan = plan
			break
		}
	}

	if selectedPlan.ID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid plan",
		})
	}

	// Update subscription
	// Note: In production, integrate with payment gateway (Midtrans/Xendit)
	var sub models.Subscription
	err := database.DB.QueryRow(`
		UPDATE subscriptions SET
			plan = $2,
			status = 'active',
			transaction_limit = $3,
			transaction_used = 0,
			outlet_limit = $4,
			staff_limit = $5,
			price_idr = $6,
			current_period_start = NOW(),
			current_period_end = NOW() + INTERVAL '30 days',
			updated_at = NOW()
		WHERE user_id = $1
		RETURNING id, user_id, plan, status, transaction_limit, transaction_used,
		          outlet_limit, staff_limit, price_idr, current_period_start, current_period_end
	`, userID, selectedPlan.ID, selectedPlan.TransactionLimit, selectedPlan.OutletLimit,
		selectedPlan.StaffLimit, selectedPlan.PriceIDR).Scan(
		&sub.ID, &sub.UserID, &sub.Plan, &sub.Status, &sub.TransactionLimit,
		&sub.TransactionUsed, &sub.OutletLimit, &sub.StaffLimit, &sub.PriceIDR,
		&sub.CurrentPeriodStart, &sub.CurrentPeriodEnd,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to upgrade subscription",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Subscription upgraded successfully",
		"data":    sub,
	})
}

// CheckSubscriptionLimit checks if user has reached their plan limits
func CheckSubscriptionLimit(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	limitType := c.Query("type", "transaction") // transaction, outlet, staff

	var sub models.Subscription
	err := database.DB.QueryRow(`
		SELECT plan, transaction_limit, transaction_used, outlet_limit, staff_limit
		FROM subscriptions WHERE user_id = $1
	`, userID).Scan(&sub.Plan, &sub.TransactionLimit, &sub.TransactionUsed,
		&sub.OutletLimit, &sub.StaffLimit)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Subscription not found",
		})
	}

	var canProceed bool
	var message string

	switch limitType {
	case "transaction":
		if sub.TransactionLimit < 0 { // unlimited
			canProceed = true
		} else {
			canProceed = sub.TransactionUsed < sub.TransactionLimit
			if !canProceed {
				message = "Transaction limit reached for this month"
			}
		}
	case "outlet":
		var storeCount int
		database.DB.QueryRow(`SELECT COUNT(*) FROM stores WHERE user_id = $1 AND is_active = true`, userID).Scan(&storeCount)
		if sub.OutletLimit < 0 { // unlimited
			canProceed = true
		} else {
			canProceed = storeCount < sub.OutletLimit
			if !canProceed {
				message = "Outlet limit reached"
			}
		}
	case "staff":
		var staffCount int
		database.DB.QueryRow(`SELECT COUNT(*) FROM staff WHERE owner_id = $1 AND is_active = true`, userID).Scan(&staffCount)
		if sub.StaffLimit < 0 { // unlimited
			canProceed = true
		} else {
			canProceed = staffCount < sub.StaffLimit
			if !canProceed {
				message = "Staff limit reached"
			}
		}
	}

	return c.JSON(fiber.Map{
		"success":     true,
		"can_proceed": canProceed,
		"message":     message,
		"plan":        sub.Plan,
	})
}
