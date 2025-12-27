package handlers

import (
	"database/sql"
	"fmt"
	"strconv"

	"kasirku/internal/database"
	"kasirku/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ListProducts returns all products for a store
func ListProducts(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	// Parse query parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "50"))
	search := c.Query("search", "")
	categoryID := c.Query("category_id", "")
	activeOnly := c.Query("active", "true") == "true"

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 50
	}
	offset := (page - 1) * perPage

	// Build query
	query := `
		SELECT p.id, p.store_id, p.category_id, p.name, p.barcode, p.sku, p.description,
		       p.price, p.cost, p.stock, p.min_stock, p.unit, p.image_url, p.is_active,
		       p.track_stock, p.created_at, p.updated_at, c.name as category_name
		FROM products p
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.store_id = $1
	`
	countQuery := `SELECT COUNT(*) FROM products WHERE store_id = $1`
	args := []interface{}{storeID}
	argCount := 1

	if activeOnly {
		argCount++
		query += fmt.Sprintf(" AND p.is_active = $%d", argCount)
		countQuery += fmt.Sprintf(" AND is_active = $%d", argCount)
		args = append(args, true)
	}

	if search != "" {
		argCount++
		searchArg := "%" + search + "%"
		query += fmt.Sprintf(" AND (p.name ILIKE $%d OR p.barcode ILIKE $%d OR p.sku ILIKE $%d)", argCount, argCount, argCount)
		countQuery += fmt.Sprintf(" AND (name ILIKE $%d OR barcode ILIKE $%d OR sku ILIKE $%d)", argCount, argCount, argCount)
		args = append(args, searchArg)
	}

	if categoryID != "" {
		catUUID, err := uuid.Parse(categoryID)
		if err == nil {
			argCount++
			query += fmt.Sprintf(" AND p.category_id = $%d", argCount)
			countQuery += fmt.Sprintf(" AND category_id = $%d", argCount)
			args = append(args, catUUID)
		}
	}

	// Get total count
	var total int
	database.DB.QueryRow(countQuery, args...).Scan(&total)

	// Add pagination
	query += " ORDER BY p.name ASC LIMIT $" + strconv.Itoa(argCount+1) + " OFFSET $" + strconv.Itoa(argCount+2)
	args = append(args, perPage, offset)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch products: " + err.Error(),
		})
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		err := rows.Scan(
			&p.ID, &p.StoreID, &p.CategoryID, &p.Name, &p.Barcode, &p.SKU, &p.Description,
			&p.Price, &p.Cost, &p.Stock, &p.MinStock, &p.Unit, &p.ImageURL, &p.IsActive,
			&p.TrackStock, &p.CreatedAt, &p.UpdatedAt, &p.CategoryName,
		)
		if err != nil {
			continue
		}
		products = append(products, p)
	}

	totalPages := (total + perPage - 1) / perPage

	return c.JSON(fiber.Map{
		"success": true,
		"data": models.PaginatedResponse{
			Data:       products,
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

// GetProduct returns a specific product
func GetProduct(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	productID := c.Params("id")

	productUUID, err := uuid.Parse(productID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid product ID",
		})
	}

	var p models.Product
	err = database.DB.QueryRow(`
		SELECT p.id, p.store_id, p.category_id, p.name, p.barcode, p.sku, p.description,
		       p.price, p.cost, p.stock, p.min_stock, p.unit, p.image_url, p.is_active,
		       p.track_stock, p.created_at, p.updated_at, c.name as category_name
		FROM products p
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.id = $1 AND p.store_id = $2
	`, productUUID, storeID).Scan(
		&p.ID, &p.StoreID, &p.CategoryID, &p.Name, &p.Barcode, &p.SKU, &p.Description,
		&p.Price, &p.Cost, &p.Stock, &p.MinStock, &p.Unit, &p.ImageURL, &p.IsActive,
		&p.TrackStock, &p.CreatedAt, &p.UpdatedAt, &p.CategoryName,
	)
	if err == sql.ErrNoRows {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Product not found",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch product",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    p,
	})
}

// GetProductByBarcode finds a product by barcode
func GetProductByBarcode(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	barcode := c.Params("code")

	var p models.Product
	err := database.DB.QueryRow(`
		SELECT p.id, p.store_id, p.category_id, p.name, p.barcode, p.sku, p.description,
		       p.price, p.cost, p.stock, p.min_stock, p.unit, p.image_url, p.is_active,
		       p.track_stock, p.created_at, p.updated_at, c.name as category_name
		FROM products p
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.barcode = $1 AND p.store_id = $2 AND p.is_active = true
	`, barcode, storeID).Scan(
		&p.ID, &p.StoreID, &p.CategoryID, &p.Name, &p.Barcode, &p.SKU, &p.Description,
		&p.Price, &p.Cost, &p.Stock, &p.MinStock, &p.Unit, &p.ImageURL, &p.IsActive,
		&p.TrackStock, &p.CreatedAt, &p.UpdatedAt, &p.CategoryName,
	)
	if err == sql.ErrNoRows {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Product not found",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch product",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    p,
	})
}

// CreateProduct creates a new product
func CreateProduct(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	var req models.CreateProductRequest
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

	// Set defaults
	unit := req.Unit
	if unit == "" {
		unit = "pcs"
	}
	trackStock := true
	if req.TrackStock != nil {
		trackStock = *req.TrackStock
	}

	var p models.Product
	err := database.DB.QueryRow(`
		INSERT INTO products (store_id, category_id, name, barcode, sku, description,
		                      price, cost, stock, min_stock, unit, image_url, track_stock)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, store_id, category_id, name, barcode, sku, description,
		          price, cost, stock, min_stock, unit, image_url, is_active,
		          track_stock, created_at, updated_at
	`, storeID, req.CategoryID, req.Name, req.Barcode, req.SKU, req.Description,
		req.Price, req.Cost, req.Stock, req.MinStock, unit, req.ImageURL, trackStock).Scan(
		&p.ID, &p.StoreID, &p.CategoryID, &p.Name, &p.Barcode, &p.SKU, &p.Description,
		&p.Price, &p.Cost, &p.Stock, &p.MinStock, &p.Unit, &p.ImageURL, &p.IsActive,
		&p.TrackStock, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to create product: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    p,
	})
}

// UpdateProduct updates a product
func UpdateProduct(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	productID := c.Params("id")

	productUUID, err := uuid.Parse(productID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid product ID",
		})
	}

	var req models.UpdateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	var p models.Product
	err = database.DB.QueryRow(`
		UPDATE products SET
			name = COALESCE($3, name),
			category_id = COALESCE($4, category_id),
			barcode = COALESCE($5, barcode),
			sku = COALESCE($6, sku),
			description = COALESCE($7, description),
			price = COALESCE($8, price),
			cost = COALESCE($9, cost),
			min_stock = COALESCE($10, min_stock),
			unit = COALESCE($11, unit),
			image_url = COALESCE($12, image_url),
			is_active = COALESCE($13, is_active),
			track_stock = COALESCE($14, track_stock),
			updated_at = NOW()
		WHERE id = $1 AND store_id = $2
		RETURNING id, store_id, category_id, name, barcode, sku, description,
		          price, cost, stock, min_stock, unit, image_url, is_active,
		          track_stock, created_at, updated_at
	`, productUUID, storeID, req.Name, req.CategoryID, req.Barcode, req.SKU,
		req.Description, req.Price, req.Cost, req.MinStock, req.Unit,
		req.ImageURL, req.IsActive, req.TrackStock).Scan(
		&p.ID, &p.StoreID, &p.CategoryID, &p.Name, &p.Barcode, &p.SKU, &p.Description,
		&p.Price, &p.Cost, &p.Stock, &p.MinStock, &p.Unit, &p.ImageURL, &p.IsActive,
		&p.TrackStock, &p.CreatedAt, &p.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Product not found",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to update product",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    p,
	})
}

// DeleteProduct soft-deletes a product
func DeleteProduct(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	productID := c.Params("id")

	productUUID, err := uuid.Parse(productID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid product ID",
		})
	}

	result, err := database.DB.Exec(`
		UPDATE products SET is_active = false, updated_at = NOW()
		WHERE id = $1 AND store_id = $2
	`, productUUID, storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to delete product",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Product not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Product deleted successfully",
	})
}

// GenerateBarcode generates a unique barcode for a product
func GenerateBarcode(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	// Generate a unique barcode (store prefix + timestamp + random)
	var count int
	database.DB.QueryRow(`SELECT COUNT(*) FROM products WHERE store_id = $1`, storeID).Scan(&count)

	// Generate EAN-13 like barcode
	barcode := fmt.Sprintf("899%09d", count+1)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"barcode": barcode,
		},
	})
}
