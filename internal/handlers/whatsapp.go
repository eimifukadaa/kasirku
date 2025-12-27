package handlers

import (
	"kasirku/internal/config"
	"kasirku/internal/database"
	"kasirku/internal/middleware"
	"kasirku/internal/models"
	"kasirku/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// SendReceipt sends a receipt via WhatsApp
func SendReceipt(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	var req struct {
		TransactionID uuid.UUID `json:"transaction_id" validate:"required"`
		Phone         string    `json:"phone" validate:"required"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// Get store info
	var storeName, provider, apiKey string
	err := database.DB.QueryRow(`
		SELECT name, whatsapp_provider, COALESCE(whatsapp_api_key, '')
		FROM stores WHERE id = $1
	`, storeID).Scan(&storeName, &provider, &apiKey)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Store not found",
		})
	}

	// Default provider if empty
	if provider == "" {
		provider = "fonnte"
	}

	// Fallback to config if apiKey is empty
	if apiKey == "" {
		if provider == "wablas" {
			apiKey = config.AppConfig.WablasAPIKey
		} else {
			apiKey = config.AppConfig.FonnteAPIKey
		}
	}

	if apiKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "WhatsApp API key not configured in store or server config",
		})
	}

	// Get transaction with items
	var transaction models.Transaction
	err = database.DB.QueryRow(`
		SELECT id, invoice_number, subtotal, discount_amount, tax_amount, total,
		       payment_amount, change_amount, payment_type, created_at
		FROM transactions
		WHERE id = $1 AND store_id = $2
	`, req.TransactionID, storeID).Scan(
		&transaction.ID, &transaction.InvoiceNumber, &transaction.Subtotal,
		&transaction.DiscountAmount, &transaction.TaxAmount, &transaction.Total,
		&transaction.PaymentAmount, &transaction.ChangeAmount, &transaction.PaymentType,
		&transaction.CreatedAt,
	)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Transaction not found",
		})
	}

	// Get transaction items
	rows, _ := database.DB.Query(`
		SELECT product_name, product_price, quantity, subtotal
		FROM transaction_items
		WHERE transaction_id = $1
	`, req.TransactionID)
	defer rows.Close()

	for rows.Next() {
		var item models.TransactionItem
		rows.Scan(&item.ProductName, &item.ProductPrice, &item.Quantity, &item.Subtotal)
		transaction.Items = append(transaction.Items, item)
	}

	// Generate receipt message
	message := services.GenerateReceiptMessage(storeName, &transaction)

	// Send via WhatsApp
	waService := services.NewWhatsAppService(provider, apiKey)
	messageID, err := waService.SendMessage(req.Phone, message)

	status := "sent"
	errorMsg := ""
	if err != nil {
		status = "failed"
		errorMsg = err.Error()
	}

	// Log the message
	refType := "transaction"
	services.LogMessage(storeID, req.Phone, "receipt", message, status, provider, messageID, errorMsg, &req.TransactionID, &refType)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to send message: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success":    true,
		"message":    "Receipt sent successfully",
		"message_id": messageID,
	})
}

// SendStockAlert sends low stock alert via WhatsApp
func SendStockAlert(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	var req struct {
		Phone string `json:"phone" validate:"required"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// Get store info
	var storeName, provider, apiKey string
	err := database.DB.QueryRow(`
		SELECT name, whatsapp_provider, COALESCE(whatsapp_api_key, '')
		FROM stores WHERE id = $1
	`, storeID).Scan(&storeName, &provider, &apiKey)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Store not found",
		})
	}

	// Default provider if empty
	if provider == "" {
		provider = "fonnte"
	}

	// Fallback to config if apiKey is empty
	if apiKey == "" {
		if provider == "wablas" {
			apiKey = config.AppConfig.WablasAPIKey
		} else {
			apiKey = config.AppConfig.FonnteAPIKey
		}
	}

	if apiKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "WhatsApp API key not configured in store or server config",
		})
	}

	// Get low stock products
	rows, err := database.DB.Query(`
		SELECT name, stock, min_stock, unit
		FROM products
		WHERE store_id = $1 AND is_active = true AND track_stock = true AND stock <= min_stock
		ORDER BY stock ASC
	`, storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch low stock products",
		})
	}
	defer rows.Close()

	var products []struct {
		Name     string
		Stock    int
		MinStock int
		Unit     string
	}
	for rows.Next() {
		var p struct {
			Name     string
			Stock    int
			MinStock int
			Unit     string
		}
		rows.Scan(&p.Name, &p.Stock, &p.MinStock, &p.Unit)
		products = append(products, p)
	}

	if len(products) == 0 {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "No low stock products to alert",
		})
	}

	// Generate alert message
	message := services.GenerateLowStockAlert(storeName, products)

	// Send via WhatsApp
	waService := services.NewWhatsAppService(provider, apiKey)
	messageID, err := waService.SendMessage(req.Phone, message)

	status := "sent"
	errorMsg := ""
	if err != nil {
		status = "failed"
		errorMsg = err.Error()
	}

	// Log the message
	services.LogMessage(storeID, req.Phone, "stock_alert", message, status, provider, messageID, errorMsg, nil, nil)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to send message: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success":        true,
		"message":        "Stock alert sent successfully",
		"message_id":     messageID,
		"products_count": len(products),
	})
}

// SendBroadcast sends a promo broadcast to customers
func SendBroadcast(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	userID := middleware.GetUserID(c)

	// Check subscription for broadcast feature
	var plan string
	database.DB.QueryRow(`
		SELECT s.plan FROM subscriptions s
		JOIN stores st ON st.user_id = s.user_id
		WHERE st.id = $1
	`, storeID).Scan(&plan)

	if plan != "pro" && plan != "agency" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Broadcast feature requires Pro or Agency plan",
		})
	}

	var req models.BroadcastRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid request body",
		})
	}

	// Get store info
	var storeName, provider, apiKey string
	err := database.DB.QueryRow(`
		SELECT name, whatsapp_provider, COALESCE(whatsapp_api_key, '')
		FROM stores WHERE id = $1
	`, storeID).Scan(&storeName, &provider, &apiKey)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"error":   "Store not found",
		})
	}

	// Default provider if empty
	if provider == "" {
		provider = "fonnte"
	}

	// Fallback to config if apiKey is empty
	if apiKey == "" {
		if provider == "wablas" {
			apiKey = config.AppConfig.WablasAPIKey
		} else {
			apiKey = config.AppConfig.FonnteAPIKey
		}
	}

	if apiKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "WhatsApp API key not configured in store or server config",
		})
	}

	// Get customer phones
	var phones []string
	if req.SendToAll {
		rows, _ := database.DB.Query(`
			SELECT phone FROM customers
			WHERE store_id = $1 AND is_active = true AND phone IS NOT NULL AND phone != ''
		`, storeID)
		defer rows.Close()
		for rows.Next() {
			var phone string
			rows.Scan(&phone)
			phones = append(phones, phone)
		}
	} else {
		for _, custID := range req.CustomerIDs {
			var phone string
			database.DB.QueryRow(`
				SELECT phone FROM customers WHERE id = $1 AND store_id = $2
			`, custID, storeID).Scan(&phone)
			if phone != "" {
				phones = append(phones, phone)
			}
		}
	}

	if len(phones) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "No customers with phone numbers to broadcast",
		})
	}

	// Send to all customers
	waService := services.NewWhatsAppService(provider, apiKey)
	successCount := 0
	failCount := 0

	for _, phone := range phones {
		messageID, err := waService.SendMessage(phone, req.Message)

		status := "sent"
		errorMsg := ""
		if err != nil {
			status = "failed"
			errorMsg = err.Error()
			failCount++
		} else {
			successCount++
		}

		// Log each message
		services.LogMessage(storeID, phone, "broadcast", req.Message, status, provider, messageID, errorMsg, nil, nil)
	}

	// Log audit
	database.DB.Exec(`
		INSERT INTO audit_logs (user_id, store_id, action, table_name, new_values)
		VALUES ($1, $2, 'broadcast', 'whatsapp_logs', $3)
	`, userID, storeID, map[string]interface{}{
		"total":   len(phones),
		"success": successCount,
		"failed":  failCount,
	})

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Broadcast completed",
		"data": fiber.Map{
			"total":   len(phones),
			"success": successCount,
			"failed":  failCount,
		},
	})
}

// GetWhatsAppLogs returns WhatsApp message logs
func GetWhatsAppLogs(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	rows, err := database.DB.Query(`
		SELECT id, phone, message_type, content, status, provider, error_message, created_at
		FROM whatsapp_logs
		WHERE store_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`, storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch logs",
		})
	}
	defer rows.Close()

	var logs []models.WhatsAppLog
	for rows.Next() {
		var log models.WhatsAppLog
		rows.Scan(&log.ID, &log.Phone, &log.MessageType, &log.Content,
			&log.Status, &log.Provider, &log.ErrorMessage, &log.CreatedAt)
		logs = append(logs, log)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    logs,
	})
}
