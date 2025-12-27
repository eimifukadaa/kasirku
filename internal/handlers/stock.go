package handlers

import (
	"strconv"

	"kasirku/internal/database"
	"kasirku/internal/middleware"
	"kasirku/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ListStockMovements returns stock movement history
func ListStockMovements(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "50"))
	productID := c.Query("product_id", "")

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 50
	}
	offset := (page - 1) * perPage

	query := `
		SELECT sm.id, sm.product_id, sm.store_id, sm.type, sm.quantity,
		       sm.stock_before, sm.stock_after, sm.notes, sm.created_by, sm.created_at,
		       p.name as product_name
		FROM stock_movements sm
		JOIN products p ON sm.product_id = p.id
		WHERE sm.store_id = $1
	`
	countQuery := `SELECT COUNT(*) FROM stock_movements WHERE store_id = $1`
	args := []interface{}{storeID}

	if productID != "" {
		prodUUID, err := uuid.Parse(productID)
		if err == nil {
			query += " AND sm.product_id = $2"
			countQuery += " AND product_id = $2"
			args = append(args, prodUUID)
		}
	}

	var total int
	database.DB.QueryRow(countQuery, args...).Scan(&total)

	query += " ORDER BY sm.created_at DESC LIMIT $" + strconv.Itoa(len(args)+1) + " OFFSET $" + strconv.Itoa(len(args)+2)
	args = append(args, perPage, offset)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch stock movements",
		})
	}
	defer rows.Close()

	var movements []models.StockMovement
	for rows.Next() {
		var m models.StockMovement
		rows.Scan(
			&m.ID, &m.ProductID, &m.StoreID, &m.Type, &m.Quantity,
			&m.StockBefore, &m.StockAfter, &m.Notes, &m.CreatedBy, &m.CreatedAt,
			&m.ProductName,
		)
		movements = append(movements, m)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": models.PaginatedResponse{
			Data:       movements,
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: (total + perPage - 1) / perPage,
		},
	})
}

// StockIn adds stock to a product
func StockIn(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	userID := middleware.GetUserID(c)

	var req models.StockAdjustRequest
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

	tx, err := database.DB.Begin()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Database error",
		})
	}
	defer tx.Rollback()

	// Get current stock
	var currentStock int
	var productName string
	err = tx.QueryRow(`
		SELECT stock, name FROM products 
		WHERE id = $1 AND store_id = $2 AND is_active = true
	`, req.ProductID, storeID).Scan(&currentStock, &productName)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Product not found",
		})
	}

	newStock := currentStock + req.Quantity

	// Update product stock
	_, err = tx.Exec(`
		UPDATE products SET stock = $1, updated_at = NOW()
		WHERE id = $2 AND store_id = $3
	`, newStock, req.ProductID, storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to update stock",
		})
	}

	// Create stock movement record
	var movement models.StockMovement
	err = tx.QueryRow(`
		INSERT INTO stock_movements (product_id, store_id, type, quantity, stock_before, stock_after, notes, created_by)
		VALUES ($1, $2, 'in', $3, $4, $5, $6, $7)
		RETURNING id, product_id, store_id, type, quantity, stock_before, stock_after, notes, created_by, created_at
	`, req.ProductID, storeID, req.Quantity, currentStock, newStock, req.Notes, userID).Scan(
		&movement.ID, &movement.ProductID, &movement.StoreID, &movement.Type, &movement.Quantity,
		&movement.StockBefore, &movement.StockAfter, &movement.Notes, &movement.CreatedBy, &movement.CreatedAt,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to record movement",
		})
	}

	if err := tx.Commit(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to complete operation",
		})
	}

	movement.ProductName = &productName

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    movement,
		"message": "Stock added successfully",
	})
}

// StockOut removes stock from a product
func StockOut(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	userID := middleware.GetUserID(c)

	var req models.StockAdjustRequest
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

	tx, err := database.DB.Begin()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Database error",
		})
	}
	defer tx.Rollback()

	// Get current stock
	var currentStock int
	var productName string
	err = tx.QueryRow(`
		SELECT stock, name FROM products 
		WHERE id = $1 AND store_id = $2 AND is_active = true
	`, req.ProductID, storeID).Scan(&currentStock, &productName)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Product not found",
		})
	}

	if currentStock < req.Quantity {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Insufficient stock",
		})
	}

	newStock := currentStock - req.Quantity

	// Update product stock
	_, err = tx.Exec(`
		UPDATE products SET stock = $1, updated_at = NOW()
		WHERE id = $2 AND store_id = $3
	`, newStock, req.ProductID, storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to update stock",
		})
	}

	// Create stock movement record
	var movement models.StockMovement
	err = tx.QueryRow(`
		INSERT INTO stock_movements (product_id, store_id, type, quantity, stock_before, stock_after, notes, created_by)
		VALUES ($1, $2, 'out', $3, $4, $5, $6, $7)
		RETURNING id, product_id, store_id, type, quantity, stock_before, stock_after, notes, created_by, created_at
	`, req.ProductID, storeID, req.Quantity, currentStock, newStock, req.Notes, userID).Scan(
		&movement.ID, &movement.ProductID, &movement.StoreID, &movement.Type, &movement.Quantity,
		&movement.StockBefore, &movement.StockAfter, &movement.Notes, &movement.CreatedBy, &movement.CreatedAt,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to record movement",
		})
	}

	if err := tx.Commit(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to complete operation",
		})
	}

	movement.ProductName = &productName

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    movement,
		"message": "Stock removed successfully",
	})
}

// GetLowStock returns products with stock below minimum threshold
func GetLowStock(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	rows, err := database.DB.Query(`
		SELECT id, name, barcode, stock, min_stock, unit
		FROM products
		WHERE store_id = $1 
		AND is_active = true 
		AND track_stock = true
		AND stock <= min_stock
		ORDER BY stock ASC
	`, storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch low stock products",
		})
	}
	defer rows.Close()

	type LowStockItem struct {
		ID       uuid.UUID `json:"id"`
		Name     string    `json:"name"`
		Barcode  *string   `json:"barcode"`
		Stock    int       `json:"stock"`
		MinStock int       `json:"min_stock"`
		Unit     string    `json:"unit"`
	}

	var items []LowStockItem
	for rows.Next() {
		var item LowStockItem
		rows.Scan(&item.ID, &item.Name, &item.Barcode, &item.Stock, &item.MinStock, &item.Unit)
		items = append(items, item)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    items,
		"count":   len(items),
	})
}
