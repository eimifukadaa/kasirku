package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"kasirku/internal/config"
	"kasirku/internal/database"
	"kasirku/internal/models"

	"github.com/google/uuid"
)

// WhatsAppService handles WhatsApp message sending
type WhatsAppService struct {
	provider string
	apiKey   string
	apiURL   string
}

// NewWhatsAppService creates a new WhatsApp service instance
func NewWhatsAppService(provider, apiKey string) *WhatsAppService {
	var apiURL string
	if provider == "wablas" {
		apiURL = config.AppConfig.WablasAPIURL
		if apiKey == "" {
			apiKey = config.AppConfig.WablasAPIKey
		}
	} else {
		apiURL = config.AppConfig.FonnteAPIURL
		if apiKey == "" {
			apiKey = config.AppConfig.FonnteAPIKey
		}
	}

	return &WhatsAppService{
		provider: provider,
		apiKey:   apiKey,
		apiURL:   apiURL,
	}
}

// SendMessage sends a WhatsApp message
func (w *WhatsAppService) SendMessage(phone, message string) (string, error) {
	if w.provider == "wablas" {
		return w.sendWablas(phone, message)
	}
	return w.sendFonnte(phone, message)
}

// sendFonnte sends message via Fonnte API
func (w *WhatsAppService) sendFonnte(phone, message string) (string, error) {
	if w.apiKey == "" || w.apiKey == "simulated" {
		fmt.Printf("[WA SIMULATION - FONNTE] To: %s, Msg: %s\n", phone, message)
		return "simulated-" + uuid.New().String(), nil
	}

	data := map[string]interface{}{
		"target":  formatPhoneNumber(phone),
		"message": message,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", w.apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", w.apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	json.Unmarshal(body, &result)

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("fonnte API error: %s", string(body))
	}

	// Extract message ID if available
	messageID := ""
	if id, ok := result["id"].(string); ok {
		messageID = id
	}

	return messageID, nil
}

// sendWablas sends message via Wablas API
func (w *WhatsAppService) sendWablas(phone, message string) (string, error) {
	if w.apiKey == "" || w.apiKey == "simulated" {
		fmt.Printf("[WA SIMULATION - WABLAS] To: %s, Msg: %s\n", phone, message)
		return "simulated-" + uuid.New().String(), nil
	}

	data := map[string]interface{}{
		"phone":   formatPhoneNumber(phone),
		"message": message,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", w.apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", w.apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("wablas API error: %s", string(body))
	}

	var result map[string]interface{}
	json.Unmarshal(body, &result)

	messageID := ""
	if id, ok := result["id"].(string); ok {
		messageID = id
	}

	return messageID, nil
}

// formatPhoneNumber formats phone number to international format
func formatPhoneNumber(phone string) string {
	// Remove any non-digit characters
	phone = strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, phone)

	// Convert Indonesian format
	if strings.HasPrefix(phone, "08") {
		phone = "62" + phone[1:]
	} else if strings.HasPrefix(phone, "8") {
		phone = "62" + phone
	}

	return phone
}

// LogMessage logs a WhatsApp message to database
func LogMessage(storeID uuid.UUID, phone, messageType, content, status, provider, messageID, errorMsg string, referenceID *uuid.UUID, referenceType *string) error {
	_, err := database.DB.Exec(`
		INSERT INTO whatsapp_logs (store_id, phone, message_type, content, status, provider, provider_message_id, error_message, reference_id, reference_type)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`, storeID, phone, messageType, content, status, provider, messageID, errorMsg, referenceID, referenceType)
	return err
}

// GenerateReceiptMessage generates a receipt message from transaction
func GenerateReceiptMessage(storeName string, transaction *models.Transaction) string {
	var sb strings.Builder

	sb.WriteString("📧 STRUK PEMBELIAN\n")
	sb.WriteString("━━━━━━━━━━━━━━━━━━━\n")
	sb.WriteString(fmt.Sprintf("🏪 %s\n", storeName))
	sb.WriteString(fmt.Sprintf("📅 %s\n", transaction.CreatedAt.Format("02 Jan 2006 15:04")))
	sb.WriteString(fmt.Sprintf("No: %s\n", transaction.InvoiceNumber))
	sb.WriteString("━━━━━━━━━━━━━━━━━━━\n\n")

	for _, item := range transaction.Items {
		sb.WriteString(fmt.Sprintf("%s\n", item.ProductName))
		sb.WriteString(fmt.Sprintf("  %d x Rp %s = Rp %s\n",
			item.Quantity,
			formatMoney(item.ProductPrice),
			formatMoney(item.Subtotal)))
	}

	sb.WriteString("\n━━━━━━━━━━━━━━━━━━━\n")
	sb.WriteString(fmt.Sprintf("Subtotal: Rp %s\n", formatMoney(transaction.Subtotal)))

	if transaction.DiscountAmount > 0 {
		sb.WriteString(fmt.Sprintf("Diskon: -Rp %s\n", formatMoney(transaction.DiscountAmount)))
	}
	if transaction.TaxAmount > 0 {
		sb.WriteString(fmt.Sprintf("Pajak: Rp %s\n", formatMoney(transaction.TaxAmount)))
	}

	sb.WriteString(fmt.Sprintf("*TOTAL: Rp %s*\n", formatMoney(transaction.Total)))
	sb.WriteString(fmt.Sprintf("Bayar (%s): Rp %s\n", transaction.PaymentType, formatMoney(transaction.PaymentAmount)))
	sb.WriteString(fmt.Sprintf("Kembali: Rp %s\n", formatMoney(transaction.ChangeAmount)))
	sb.WriteString("━━━━━━━━━━━━━━━━━━━\n")
	sb.WriteString("Terima kasih! 🙏\n")

	return sb.String()
}

// GenerateLowStockAlert generates a low stock alert message
func GenerateLowStockAlert(storeName string, products []struct {
	Name     string
	Stock    int
	MinStock int
	Unit     string
}) string {
	var sb strings.Builder

	sb.WriteString("⚠️ PERINGATAN STOK RENDAH\n")
	sb.WriteString("━━━━━━━━━━━━━━━━━━━━━━━━\n")
	sb.WriteString(fmt.Sprintf("🏪 %s\n\n", storeName))
	sb.WriteString("Produk berikut stoknya hampir habis:\n\n")

	for _, p := range products {
		sb.WriteString(fmt.Sprintf("• %s: %d %s (min: %d)\n", p.Name, p.Stock, p.Unit, p.MinStock))
	}

	sb.WriteString("\nSegera lakukan restock! 📦")

	return sb.String()
}

// formatMoney formats number to Indonesian money format
func formatMoney(amount float64) string {
	// Simple formatting for now to avoid invalid format string error
	// In Go, there's no built-in %,.0f for thousands separators.
	// We'll use a simple approach or a dedicated library if needed.
	return fmt.Sprintf("%.0f", amount)
}
