package handlers

import (
	"database/sql"
	"strconv"

	"kasirku/internal/database"
	"kasirku/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ListCustomers returns all customers for a store
func ListCustomers(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "50"))
	search := c.Query("search", "")

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 50
	}
	offset := (page - 1) * perPage

	query := `
		SELECT id, store_id, name, phone, email, address, notes,
		       total_transactions, total_spent, last_transaction_at, is_active, created_at
		FROM customers
		WHERE store_id = $1 AND is_active = true
	`
	countQuery := `SELECT COUNT(*) FROM customers WHERE store_id = $1 AND is_active = true`
	args := []interface{}{storeID}

	if search != "" {
		searchArg := "%" + search + "%"
		query += " AND (name ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)"
		countQuery += " AND (name ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)"
		args = append(args, searchArg)
	}

	var total int
	database.DB.QueryRow(countQuery, args...).Scan(&total)

	query += " ORDER BY name ASC LIMIT $" + strconv.Itoa(len(args)+1) + " OFFSET $" + strconv.Itoa(len(args)+2)
	args = append(args, perPage, offset)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch customers",
		})
	}
	defer rows.Close()

	var customers []models.Customer
	for rows.Next() {
		var cust models.Customer
		rows.Scan(
			&cust.ID, &cust.StoreID, &cust.Name, &cust.Phone, &cust.Email,
			&cust.Address, &cust.Notes, &cust.TotalTransactions, &cust.TotalSpent,
			&cust.LastTransactionAt, &cust.IsActive, &cust.CreatedAt,
		)
		customers = append(customers, cust)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": models.PaginatedResponse{
			Data:       customers,
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: (total + perPage - 1) / perPage,
		},
	})
}

// GetCustomer returns a specific customer
func GetCustomer(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	customerID := c.Params("id")

	custUUID, err := uuid.Parse(customerID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid customer ID",
		})
	}

	var cust models.Customer
	err = database.DB.QueryRow(`
		SELECT id, store_id, name, phone, email, address, notes,
		       total_transactions, total_spent, last_transaction_at, is_active, created_at, updated_at
		FROM customers
		WHERE id = $1 AND store_id = $2
	`, custUUID, storeID).Scan(
		&cust.ID, &cust.StoreID, &cust.Name, &cust.Phone, &cust.Email,
		&cust.Address, &cust.Notes, &cust.TotalTransactions, &cust.TotalSpent,
		&cust.LastTransactionAt, &cust.IsActive, &cust.CreatedAt, &cust.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Customer not found",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch customer",
		})
	}

	// Get recent transactions
	rows, _ := database.DB.Query(`
		SELECT id, invoice_number, total, payment_type, created_at
		FROM transactions
		WHERE customer_id = $1 AND status = 'completed'
		ORDER BY created_at DESC
		LIMIT 10
	`, custUUID)
	defer rows.Close()

	type RecentTransaction struct {
		ID            uuid.UUID `json:"id"`
		InvoiceNumber string    `json:"invoice_number"`
		Total         float64   `json:"total"`
		PaymentType   string    `json:"payment_type"`
		CreatedAt     string    `json:"created_at"`
	}
	var recentTx []RecentTransaction
	for rows.Next() {
		var tx RecentTransaction
		rows.Scan(&tx.ID, &tx.InvoiceNumber, &tx.Total, &tx.PaymentType, &tx.CreatedAt)
		recentTx = append(recentTx, tx)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"customer":            cust,
			"recent_transactions": recentTx,
		},
	})
}

// CreateCustomer creates a new customer
func CreateCustomer(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	var req models.CreateCustomerRequest
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

	var cust models.Customer
	err := database.DB.QueryRow(`
		INSERT INTO customers (store_id, name, phone, email, address, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, store_id, name, phone, email, address, notes,
		          total_transactions, total_spent, is_active, created_at
	`, storeID, req.Name, req.Phone, req.Email, req.Address, req.Notes).Scan(
		&cust.ID, &cust.StoreID, &cust.Name, &cust.Phone, &cust.Email,
		&cust.Address, &cust.Notes, &cust.TotalTransactions, &cust.TotalSpent,
		&cust.IsActive, &cust.CreatedAt,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to create customer",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    cust,
	})
}

// UpdateCustomer updates a customer
func UpdateCustomer(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	customerID := c.Params("id")

	custUUID, err := uuid.Parse(customerID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid customer ID",
		})
	}

	var req models.UpdateCustomerRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	var cust models.Customer
	err = database.DB.QueryRow(`
		UPDATE customers SET
			name = COALESCE($3, name),
			phone = COALESCE($4, phone),
			email = COALESCE($5, email),
			address = COALESCE($6, address),
			notes = COALESCE($7, notes),
			is_active = COALESCE($8, is_active),
			updated_at = NOW()
		WHERE id = $1 AND store_id = $2
		RETURNING id, store_id, name, phone, email, address, notes,
		          total_transactions, total_spent, is_active, created_at, updated_at
	`, custUUID, storeID, req.Name, req.Phone, req.Email, req.Address, req.Notes, req.IsActive).Scan(
		&cust.ID, &cust.StoreID, &cust.Name, &cust.Phone, &cust.Email,
		&cust.Address, &cust.Notes, &cust.TotalTransactions, &cust.TotalSpent,
		&cust.IsActive, &cust.CreatedAt, &cust.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Customer not found",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to update customer",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    cust,
	})
}

// DeleteCustomer soft-deletes a customer
func DeleteCustomer(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	customerID := c.Params("id")

	custUUID, err := uuid.Parse(customerID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid customer ID",
		})
	}

	result, err := database.DB.Exec(`
		UPDATE customers SET is_active = false, updated_at = NOW()
		WHERE id = $1 AND store_id = $2
	`, custUUID, storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to delete customer",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Customer not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Customer deleted successfully",
	})
}

// FindOrCreateCustomerByPhone finds a customer by phone or creates a new one
func FindOrCreateCustomerByPhone(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	var req struct {
		Phone string `json:"phone" validate:"required"`
		Name  string `json:"name"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// Try to find existing customer
	var cust models.Customer
	err := database.DB.QueryRow(`
		SELECT id, store_id, name, phone, email, address, notes,
		       total_transactions, total_spent, is_active, created_at
		FROM customers
		WHERE store_id = $1 AND phone = $2 AND is_active = true
	`, storeID, req.Phone).Scan(
		&cust.ID, &cust.StoreID, &cust.Name, &cust.Phone, &cust.Email,
		&cust.Address, &cust.Notes, &cust.TotalTransactions, &cust.TotalSpent,
		&cust.IsActive, &cust.CreatedAt,
	)

	if err == sql.ErrNoRows {
		// Create new customer
		name := req.Name
		if name == "" {
			name = "Customer " + req.Phone
		}
		err = database.DB.QueryRow(`
			INSERT INTO customers (store_id, name, phone)
			VALUES ($1, $2, $3)
			RETURNING id, store_id, name, phone, email, address, notes,
			          total_transactions, total_spent, is_active, created_at
		`, storeID, name, req.Phone).Scan(
			&cust.ID, &cust.StoreID, &cust.Name, &cust.Phone, &cust.Email,
			&cust.Address, &cust.Notes, &cust.TotalTransactions, &cust.TotalSpent,
			&cust.IsActive, &cust.CreatedAt,
		)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   "Failed to create customer",
			})
		}

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"success": true,
			"data":    cust,
			"created": true,
		})
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Database error",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    cust,
		"created": false,
	})
}
