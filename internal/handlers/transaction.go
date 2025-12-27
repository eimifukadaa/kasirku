package handlers

import (
	"database/sql"
	"fmt"
	"strconv"
	"time"

	"kasirku/internal/database"
	"kasirku/internal/middleware"
	"kasirku/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ListTransactions returns transactions for a store
func ListTransactions(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	dateFrom := c.Query("date_from", "")
	dateTo := c.Query("date_to", "")
	status := c.Query("status", "")
	timezone := c.Query("timezone", "Asia/Makassar")

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	query := `
		SELECT t.id, t.store_id, t.customer_id, t.cashier_id, t.invoice_number,
		       t.subtotal, t.discount_amount, t.discount_percent, t.tax_amount, t.total,
		       t.payment_amount, t.change_amount, t.payment_type, t.status, t.notes,
		       t.created_at, t.updated_at, c.name as customer_name, u.full_name as cashier_name
		FROM transactions t
		LEFT JOIN customers c ON t.customer_id = c.id
		LEFT JOIN users u ON t.cashier_id = u.id
		WHERE t.store_id = $1
	`
	countQuery := `SELECT COUNT(*) FROM transactions WHERE store_id = $1`
	args := []interface{}{storeID}
	argCount := 1

	if dateFrom != "" {
		argCount++
		query += fmt.Sprintf(" AND DATE(t.created_at AT TIME ZONE $%d) >= $%d", argCount, argCount+1)
		countQuery += fmt.Sprintf(" AND DATE(created_at AT TIME ZONE $%d) >= $%d", argCount, argCount+1)
		args = append(args, timezone, dateFrom)
		argCount++
	}

	if dateTo != "" {
		argCount++
		query += fmt.Sprintf(" AND DATE(t.created_at AT TIME ZONE $%d) <= $%d", argCount, argCount+1)
		countQuery += fmt.Sprintf(" AND DATE(created_at AT TIME ZONE $%d) <= $%d", argCount, argCount+1)
		args = append(args, timezone, dateTo)
		argCount++
	}

	if status != "" {
		argCount++
		query += fmt.Sprintf(" AND t.status = $%d", argCount)
		countQuery += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, status)
	}

	var total int
	database.DB.QueryRow(countQuery, args...).Scan(&total)

	query += fmt.Sprintf(" ORDER BY t.created_at DESC LIMIT $%d OFFSET $%d", argCount+1, argCount+2)
	args = append(args, perPage, offset)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch transactions",
		})
	}
	defer rows.Close()

	var transactions []models.Transaction
	for rows.Next() {
		var t models.Transaction
		rows.Scan(
			&t.ID, &t.StoreID, &t.CustomerID, &t.CashierID, &t.InvoiceNumber,
			&t.Subtotal, &t.DiscountAmount, &t.DiscountPercent, &t.TaxAmount, &t.Total,
			&t.PaymentAmount, &t.ChangeAmount, &t.PaymentType, &t.Status, &t.Notes,
			&t.CreatedAt, &t.UpdatedAt, &t.CustomerName, &t.CashierName,
		)
		transactions = append(transactions, t)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": models.PaginatedResponse{
			Data:       transactions,
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: (total + perPage - 1) / perPage,
		},
	})
}

// GetTransaction returns a specific transaction with items
func GetTransaction(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	transactionID := c.Params("id")

	txUUID, err := uuid.Parse(transactionID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid transaction ID",
		})
	}

	var t models.Transaction
	err = database.DB.QueryRow(`
		SELECT t.id, t.store_id, t.customer_id, t.cashier_id, t.invoice_number,
		       t.subtotal, t.discount_amount, t.discount_percent, t.tax_amount, t.total,
		       t.payment_amount, t.change_amount, t.payment_type, t.payment_reference,
		       t.status, t.notes, t.created_at, t.updated_at,
		       c.name as customer_name, u.full_name as cashier_name
		FROM transactions t
		LEFT JOIN customers c ON t.customer_id = c.id
		LEFT JOIN users u ON t.cashier_id = u.id
		WHERE t.id = $1 AND t.store_id = $2
	`, txUUID, storeID).Scan(
		&t.ID, &t.StoreID, &t.CustomerID, &t.CashierID, &t.InvoiceNumber,
		&t.Subtotal, &t.DiscountAmount, &t.DiscountPercent, &t.TaxAmount, &t.Total,
		&t.PaymentAmount, &t.ChangeAmount, &t.PaymentType, &t.PaymentReference,
		&t.Status, &t.Notes, &t.CreatedAt, &t.UpdatedAt,
		&t.CustomerName, &t.CashierName,
	)
	if err == sql.ErrNoRows {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Transaction not found",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch transaction",
		})
	}

	// Get transaction items
	rows, err := database.DB.Query(`
		SELECT id, transaction_id, product_id, product_name, product_price,
		       quantity, discount_amount, discount_percent, subtotal, cost
		FROM transaction_items
		WHERE transaction_id = $1
		ORDER BY created_at ASC
	`, txUUID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var item models.TransactionItem
			rows.Scan(
				&item.ID, &item.TransactionID, &item.ProductID, &item.ProductName,
				&item.ProductPrice, &item.Quantity, &item.DiscountAmount,
				&item.DiscountPercent, &item.Subtotal, &item.Cost,
			)
			t.Items = append(t.Items, item)
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    t,
	})
}

// CreateTransaction creates a new transaction (POS sale)
func CreateTransaction(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	userID := middleware.GetUserID(c)

	var req models.CreateTransactionRequest
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

	// Generate invoice number
	var invoiceNumber string
	err = tx.QueryRow(`SELECT generate_invoice_number($1)`, storeID).Scan(&invoiceNumber)
	if err != nil {
		// Fallback if function doesn't exist
		invoiceNumber = fmt.Sprintf("INV-%s-%04d", time.Now().Format("20060102"), time.Now().UnixNano()%10000)
	}

	// Calculate totals
	var subtotal float64 = 0
	var itemsData []struct {
		ProductID    uuid.UUID
		ProductName  string
		ProductPrice float64
		Quantity     int
		Cost         float64
		ItemDiscount float64
		ItemSubtotal float64
	}

	for _, item := range req.Items {
		var product struct {
			Name  string
			Price float64
			Cost  float64
			Stock int
		}
		err := tx.QueryRow(`
			SELECT name, price, cost, stock FROM products 
			WHERE id = $1 AND store_id = $2 AND is_active = true
		`, item.ProductID, storeID).Scan(&product.Name, &product.Price, &product.Cost, &product.Stock)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   fmt.Sprintf("Product not found: %s", item.ProductID),
			})
		}

		// Check stock
		if product.Stock < item.Quantity {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error":   fmt.Sprintf("Insufficient stock for %s", product.Name),
			})
		}

		// Calculate item subtotal
		itemPrice := product.Price * float64(item.Quantity)
		itemDiscount := item.DiscountAmount
		if item.DiscountPercent > 0 {
			itemDiscount = itemPrice * (item.DiscountPercent / 100)
		}
		itemSubtotal := itemPrice - itemDiscount

		subtotal += itemSubtotal

		itemsData = append(itemsData, struct {
			ProductID    uuid.UUID
			ProductName  string
			ProductPrice float64
			Quantity     int
			Cost         float64
			ItemDiscount float64
			ItemSubtotal float64
		}{
			ProductID:    item.ProductID,
			ProductName:  product.Name,
			ProductPrice: product.Price,
			Quantity:     item.Quantity,
			Cost:         product.Cost,
			ItemDiscount: itemDiscount,
			ItemSubtotal: itemSubtotal,
		})
	}

	// Apply global discount
	globalDiscount := req.DiscountAmount
	if req.DiscountPercent > 0 {
		globalDiscount = subtotal * (req.DiscountPercent / 100)
	}

	// Get tax rate
	var taxRate float64
	tx.QueryRow(`SELECT COALESCE(tax_rate, 0) FROM stores WHERE id = $1`, storeID).Scan(&taxRate)
	taxAmount := (subtotal - globalDiscount) * (taxRate / 100)

	total := subtotal - globalDiscount + taxAmount
	changeAmount := req.PaymentAmount - total

	if changeAmount < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Insufficient payment amount",
		})
	}

	// Create transaction
	var transaction models.Transaction
	err = tx.QueryRow(`
		INSERT INTO transactions (
			store_id, customer_id, cashier_id, invoice_number,
			subtotal, discount_amount, discount_percent, tax_amount, total,
			payment_amount, change_amount, payment_type, payment_reference, notes, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'completed')
		RETURNING id, store_id, customer_id, cashier_id, invoice_number,
		          subtotal, discount_amount, discount_percent, tax_amount, total,
		          payment_amount, change_amount, payment_type, status, created_at
	`, storeID, req.CustomerID, userID, invoiceNumber,
		subtotal, globalDiscount, req.DiscountPercent, taxAmount, total,
		req.PaymentAmount, changeAmount, req.PaymentType, req.PaymentRef, req.Notes).Scan(
		&transaction.ID, &transaction.StoreID, &transaction.CustomerID, &transaction.CashierID,
		&transaction.InvoiceNumber, &transaction.Subtotal, &transaction.DiscountAmount,
		&transaction.DiscountPercent, &transaction.TaxAmount, &transaction.Total,
		&transaction.PaymentAmount, &transaction.ChangeAmount, &transaction.PaymentType,
		&transaction.Status, &transaction.CreatedAt,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to create transaction: " + err.Error(),
		})
	}

	// Create transaction items (this will trigger stock update via trigger)
	for _, item := range itemsData {
		var txItem models.TransactionItem
		err = tx.QueryRow(`
			INSERT INTO transaction_items (
				transaction_id, product_id, product_name, product_price,
				quantity, discount_amount, subtotal, cost
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING id, transaction_id, product_id, product_name, product_price,
			          quantity, discount_amount, subtotal
		`, transaction.ID, item.ProductID, item.ProductName, item.ProductPrice,
			item.Quantity, item.ItemDiscount, item.ItemSubtotal, item.Cost).Scan(
			&txItem.ID, &txItem.TransactionID, &txItem.ProductID, &txItem.ProductName,
			&txItem.ProductPrice, &txItem.Quantity, &txItem.DiscountAmount, &txItem.Subtotal,
		)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   "Failed to create transaction item: " + err.Error(),
			})
		}
		transaction.Items = append(transaction.Items, txItem)
	}

	if err := tx.Commit(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to complete transaction",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    transaction,
		"message": "Transaction completed successfully",
	})
}
