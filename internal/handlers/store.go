package handlers

import (
	"database/sql"

	"kasirku/internal/database"
	"kasirku/internal/middleware"
	"kasirku/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ListStores returns all stores for the current user
func ListStores(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	rows, err := database.DB.Query(`
		SELECT id, user_id, name, address, phone, email, logo_url, 
		       whatsapp_provider, tax_rate, currency, is_active, created_at, updated_at
		FROM stores 
		WHERE user_id = $1 AND is_active = true
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch stores",
		})
	}
	defer rows.Close()

	var stores []models.Store
	for rows.Next() {
		var store models.Store
		err := rows.Scan(
			&store.ID, &store.UserID, &store.Name, &store.Address, &store.Phone,
			&store.Email, &store.LogoURL, &store.WhatsAppProvider,
			&store.TaxRate, &store.Currency, &store.IsActive, &store.CreatedAt, &store.UpdatedAt,
		)
		if err != nil {
			continue
		}
		stores = append(stores, store)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    stores,
	})
}

// CreateStore creates a new store
func CreateStore(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req models.CreateStoreRequest
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

	// Check subscription outlet limit
	var currentCount, outletLimit int
	err := database.DB.QueryRow(`
		SELECT 
			(SELECT COUNT(*) FROM stores WHERE user_id = $1 AND is_active = true),
			COALESCE((SELECT outlet_limit FROM subscriptions WHERE user_id = $1), 1)
	`, userID).Scan(&currentCount, &outletLimit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to check subscription",
		})
	}

	if outletLimit > 0 && currentCount >= outletLimit {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Outlet limit reached. Please upgrade your plan.",
		})
	}

	var store models.Store
	err = database.DB.QueryRow(`
		INSERT INTO stores (user_id, name, address, phone, email)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, name, address, phone, email, logo_url, 
		          whatsapp_provider, tax_rate, currency, is_active, created_at, updated_at
	`, userID, req.Name, req.Address, req.Phone, req.Email).Scan(
		&store.ID, &store.UserID, &store.Name, &store.Address, &store.Phone,
		&store.Email, &store.LogoURL, &store.WhatsAppProvider,
		&store.TaxRate, &store.Currency, &store.IsActive, &store.CreatedAt, &store.UpdatedAt,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to create store",
		})
	}

	// Create default category
	database.DB.Exec(`
		INSERT INTO categories (store_id, name, color, sort_order)
		VALUES ($1, 'Umum', '#3B82F6', 0)
	`, store.ID)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    store,
	})
}

// GetStore returns a specific store
func GetStore(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	storeID := c.Params("id")

	storeUUID, err := uuid.Parse(storeID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid store ID",
		})
	}

	var store models.Store
	err = database.DB.QueryRow(`
		SELECT id, user_id, name, address, phone, email, logo_url, 
		       whatsapp_api_key, whatsapp_provider, tax_rate, currency, is_active, created_at, updated_at
		FROM stores 
		WHERE id = $1 AND user_id = $2
	`, storeUUID, userID).Scan(
		&store.ID, &store.UserID, &store.Name, &store.Address, &store.Phone,
		&store.Email, &store.LogoURL, &store.WhatsAppAPIKey, &store.WhatsAppProvider,
		&store.TaxRate, &store.Currency, &store.IsActive, &store.CreatedAt, &store.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Store not found",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch store",
		})
	}

	// Get store stats
	var stats struct {
		ProductCount      int     `json:"product_count"`
		CustomerCount     int     `json:"customer_count"`
		TodayTransactions int     `json:"today_transactions"`
		TodaySales        float64 `json:"today_sales"`
	}
	database.DB.QueryRow(`
		SELECT 
			(SELECT COUNT(*) FROM products WHERE store_id = $1 AND is_active = true),
			(SELECT COUNT(*) FROM customers WHERE store_id = $1 AND is_active = true),
			(SELECT COUNT(*) FROM transactions WHERE store_id = $1 AND DATE(created_at) = CURRENT_DATE AND status = 'completed'),
			COALESCE((SELECT SUM(total) FROM transactions WHERE store_id = $1 AND DATE(created_at) = CURRENT_DATE AND status = 'completed'), 0)
	`, storeUUID).Scan(&stats.ProductCount, &stats.CustomerCount, &stats.TodayTransactions, &stats.TodaySales)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"store": store,
			"stats": stats,
		},
	})
}

// UpdateStore updates a store
func UpdateStore(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	storeID := c.Params("id")

	storeUUID, err := uuid.Parse(storeID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid store ID",
		})
	}

	var req models.UpdateStoreRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	var store models.Store
	err = database.DB.QueryRow(`
		UPDATE stores SET
			name = COALESCE($3, name),
			address = COALESCE($4, address),
			phone = COALESCE($5, phone),
			email = COALESCE($6, email),
			logo_url = COALESCE($7, logo_url),
			whatsapp_api_key = COALESCE($8, whatsapp_api_key),
			whatsapp_provider = COALESCE($9, whatsapp_provider),
			tax_rate = COALESCE($10, tax_rate),
			updated_at = NOW()
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, name, address, phone, email, logo_url, 
		          whatsapp_provider, tax_rate, currency, is_active, created_at, updated_at
	`, storeUUID, userID, req.Name, req.Address, req.Phone, req.Email,
		req.LogoURL, req.WhatsAppAPIKey, req.WhatsAppProvider, req.TaxRate).Scan(
		&store.ID, &store.UserID, &store.Name, &store.Address, &store.Phone,
		&store.Email, &store.LogoURL, &store.WhatsAppProvider,
		&store.TaxRate, &store.Currency, &store.IsActive, &store.CreatedAt, &store.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Store not found",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to update store",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    store,
	})
}

// DeleteStore soft-deletes a store
func DeleteStore(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	storeID := c.Params("id")

	storeUUID, err := uuid.Parse(storeID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid store ID",
		})
	}

	result, err := database.DB.Exec(`
		UPDATE stores SET is_active = false, updated_at = NOW()
		WHERE id = $1 AND user_id = $2
	`, storeUUID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to delete store",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Store not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Store deleted successfully",
	})
}

// ListCategories returns all categories for a store
func ListCategories(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	rows, err := database.DB.Query(`
		SELECT id, store_id, name, color, icon, sort_order, is_active, created_at
		FROM categories
		WHERE store_id = $1 AND is_active = true
		ORDER BY sort_order ASC, name ASC
	`, storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch categories",
		})
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var cat models.Category
		rows.Scan(
			&cat.ID, &cat.StoreID, &cat.Name, &cat.Color, &cat.Icon,
			&cat.SortOrder, &cat.IsActive, &cat.CreatedAt,
		)
		categories = append(categories, cat)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    categories,
	})
}

// CreateCategory creates a new category
func CreateCategory(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	var req struct {
		Name  string  `json:"name" validate:"required"`
		Color string  `json:"color"`
		Icon  *string `json:"icon"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	if req.Color == "" {
		req.Color = "#3B82F6"
	}

	var cat models.Category
	err := database.DB.QueryRow(`
		INSERT INTO categories (store_id, name, color, icon)
		VALUES ($1, $2, $3, $4)
		RETURNING id, store_id, name, color, icon, sort_order, is_active, created_at
	`, storeID, req.Name, req.Color, req.Icon).Scan(
		&cat.ID, &cat.StoreID, &cat.Name, &cat.Color, &cat.Icon,
		&cat.SortOrder, &cat.IsActive, &cat.CreatedAt,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to create category",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    cat,
	})
}

// ResetStoreData deletes all transactional and product data for a store
func ResetStoreData(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	tx, err := database.DB.Begin()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to start transaction",
		})
	}
	defer tx.Rollback()

	// Tables to clear (only for the specific store)
	queries := []string{
		"DELETE FROM transaction_items WHERE transaction_id IN (SELECT id FROM transactions WHERE store_id = $1)",
		"DELETE FROM transactions WHERE store_id = $1",
		"DELETE FROM stock_movements WHERE store_id = $1",
		"DELETE FROM products WHERE store_id = $1",
		"DELETE FROM categories WHERE store_id = $1",
		"DELETE FROM customers WHERE store_id = $1",
		"DELETE FROM whatsapp_logs WHERE store_id = $1",
		"DELETE FROM promos WHERE store_id = $1",
		"DELETE FROM audit_logs WHERE store_id = $1",
	}

	for _, q := range queries {
		_, err := tx.Exec(q, storeID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   "Failed to reset data: " + err.Error(),
			})
		}
	}

	// Re-add default category
	_, err = tx.Exec(`
		INSERT INTO categories (store_id, name, color, sort_order)
		VALUES ($1, 'Umum', '#3B82F6', 0)
	`, storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to recreate default category",
		})
	}

	if err := tx.Commit(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to commit transaction",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Database reset successfully",
	})
}
