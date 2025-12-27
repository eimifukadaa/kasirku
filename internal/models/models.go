package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FullName  string    `json:"full_name"`
	Phone     *string   `json:"phone,omitempty"`
	AvatarURL *string   `json:"avatar_url,omitempty"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Subscription represents a user's subscription plan
type Subscription struct {
	ID                 uuid.UUID `json:"id"`
	UserID             uuid.UUID `json:"user_id"`
	Plan               string    `json:"plan"`
	Status             string    `json:"status"`
	TransactionLimit   int       `json:"transaction_limit"`
	TransactionUsed    int       `json:"transaction_used"`
	OutletLimit        int       `json:"outlet_limit"`
	StaffLimit         int       `json:"staff_limit"`
	PriceIDR           int       `json:"price_idr"`
	CurrentPeriodStart time.Time `json:"current_period_start"`
	CurrentPeriodEnd   time.Time `json:"current_period_end"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// Store represents a business store/outlet
type Store struct {
	ID               uuid.UUID `json:"id"`
	UserID           uuid.UUID `json:"user_id"`
	Name             string    `json:"name"`
	Address          *string   `json:"address,omitempty"`
	Phone            *string   `json:"phone,omitempty"`
	Email            *string   `json:"email,omitempty"`
	LogoURL          *string   `json:"logo_url,omitempty"`
	WhatsAppAPIKey   *string   `json:"whatsapp_api_key,omitempty"`
	WhatsAppProvider string    `json:"whatsapp_provider"`
	TaxRate          float64   `json:"tax_rate"`
	Currency         string    `json:"currency"`
	IsActive         bool      `json:"is_active"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// Category represents a product category
type Category struct {
	ID        uuid.UUID `json:"id"`
	StoreID   uuid.UUID `json:"store_id"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	Icon      *string   `json:"icon,omitempty"`
	SortOrder int       `json:"sort_order"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

// Product represents a product in the store
type Product struct {
	ID          uuid.UUID  `json:"id"`
	StoreID     uuid.UUID  `json:"store_id"`
	CategoryID  *uuid.UUID `json:"category_id,omitempty"`
	Name        string     `json:"name"`
	Barcode     *string    `json:"barcode,omitempty"`
	SKU         *string    `json:"sku,omitempty"`
	Description *string    `json:"description,omitempty"`
	Price       float64    `json:"price"`
	Cost        float64    `json:"cost"`
	Stock       int        `json:"stock"`
	MinStock    int        `json:"min_stock"`
	Unit        string     `json:"unit"`
	ImageURL    *string    `json:"image_url,omitempty"`
	IsActive    bool       `json:"is_active"`
	TrackStock  bool       `json:"track_stock"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	// Joined fields
	CategoryName *string `json:"category_name,omitempty"`
}

// StockMovement represents a stock movement record
type StockMovement struct {
	ID            uuid.UUID  `json:"id"`
	ProductID     uuid.UUID  `json:"product_id"`
	StoreID       uuid.UUID  `json:"store_id"`
	Type          string     `json:"type"`
	Quantity      int        `json:"quantity"`
	StockBefore   int        `json:"stock_before"`
	StockAfter    int        `json:"stock_after"`
	ReferenceID   *uuid.UUID `json:"reference_id,omitempty"`
	ReferenceType *string    `json:"reference_type,omitempty"`
	Notes         *string    `json:"notes,omitempty"`
	CreatedBy     *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	// Joined fields
	ProductName *string `json:"product_name,omitempty"`
}

// Customer represents a store customer
type Customer struct {
	ID                uuid.UUID  `json:"id"`
	StoreID           uuid.UUID  `json:"store_id"`
	Name              string     `json:"name"`
	Phone             *string    `json:"phone,omitempty"`
	Email             *string    `json:"email,omitempty"`
	Address           *string    `json:"address,omitempty"`
	Notes             *string    `json:"notes,omitempty"`
	TotalTransactions int        `json:"total_transactions"`
	TotalSpent        float64    `json:"total_spent"`
	LastTransactionAt *time.Time `json:"last_transaction_at,omitempty"`
	IsActive          bool       `json:"is_active"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// Transaction represents a sales transaction
type Transaction struct {
	ID               uuid.UUID  `json:"id"`
	StoreID          uuid.UUID  `json:"store_id"`
	CustomerID       *uuid.UUID `json:"customer_id,omitempty"`
	CashierID        *uuid.UUID `json:"cashier_id,omitempty"`
	InvoiceNumber    string     `json:"invoice_number"`
	Subtotal         float64    `json:"subtotal"`
	DiscountAmount   float64    `json:"discount_amount"`
	DiscountPercent  float64    `json:"discount_percent"`
	TaxAmount        float64    `json:"tax_amount"`
	Total            float64    `json:"total"`
	PaymentAmount    float64    `json:"payment_amount"`
	ChangeAmount     float64    `json:"change_amount"`
	PaymentType      string     `json:"payment_type"`
	PaymentReference *string    `json:"payment_reference,omitempty"`
	Status           string     `json:"status"`
	Notes            *string    `json:"notes,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	// Joined/computed fields
	Items        []TransactionItem `json:"items,omitempty"`
	CustomerName *string           `json:"customer_name,omitempty"`
	CashierName  *string           `json:"cashier_name,omitempty"`
}

// TransactionItem represents an item in a transaction
type TransactionItem struct {
	ID              uuid.UUID  `json:"id"`
	TransactionID   uuid.UUID  `json:"transaction_id"`
	ProductID       *uuid.UUID `json:"product_id,omitempty"`
	ProductName     string     `json:"product_name"`
	ProductPrice    float64    `json:"product_price"`
	Quantity        int        `json:"quantity"`
	DiscountAmount  float64    `json:"discount_amount"`
	DiscountPercent float64    `json:"discount_percent"`
	Subtotal        float64    `json:"subtotal"`
	Cost            float64    `json:"cost"`
	CreatedAt       time.Time  `json:"created_at"`
}

// WhatsAppLog represents a WhatsApp message log
type WhatsAppLog struct {
	ID                uuid.UUID  `json:"id"`
	StoreID           uuid.UUID  `json:"store_id"`
	Phone             string     `json:"phone"`
	MessageType       string     `json:"message_type"`
	Content           string     `json:"content"`
	Status            string     `json:"status"`
	Provider          *string    `json:"provider,omitempty"`
	ProviderMessageID *string    `json:"provider_message_id,omitempty"`
	ErrorMessage      *string    `json:"error_message,omitempty"`
	ReferenceID       *uuid.UUID `json:"reference_id,omitempty"`
	ReferenceType     *string    `json:"reference_type,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
}

// ========================================
// Request/Response DTOs
// ========================================

// AuthRegisterRequest for user registration
type AuthRegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	FullName string `json:"full_name" validate:"required,min=2"`
	Phone    string `json:"phone,omitempty"`
}

// AuthLoginRequest for user login
type AuthLoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// AuthResponse for authentication responses
type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	ExpiresIn    int    `json:"expires_in"`
	User         *User  `json:"user"`
}

// CreateStoreRequest for creating a store
type CreateStoreRequest struct {
	Name    string  `json:"name" validate:"required,min=2"`
	Address *string `json:"address,omitempty"`
	Phone   *string `json:"phone,omitempty"`
	Email   *string `json:"email,omitempty"`
}

// UpdateStoreRequest for updating a store
type UpdateStoreRequest struct {
	Name             *string  `json:"name,omitempty"`
	Address          *string  `json:"address,omitempty"`
	Phone            *string  `json:"phone,omitempty"`
	Email            *string  `json:"email,omitempty"`
	LogoURL          *string  `json:"logo_url,omitempty"`
	WhatsAppAPIKey   *string  `json:"whatsapp_api_key,omitempty"`
	WhatsAppProvider *string  `json:"whatsapp_provider,omitempty"`
	TaxRate          *float64 `json:"tax_rate,omitempty"`
}

// CreateProductRequest for creating a product
type CreateProductRequest struct {
	Name        string     `json:"name" validate:"required,min=2"`
	CategoryID  *uuid.UUID `json:"category_id,omitempty"`
	Barcode     *string    `json:"barcode,omitempty"`
	SKU         *string    `json:"sku,omitempty"`
	Description *string    `json:"description,omitempty"`
	Price       float64    `json:"price" validate:"required,min=0"`
	Cost        float64    `json:"cost,omitempty"`
	Stock       int        `json:"stock,omitempty"`
	MinStock    int        `json:"min_stock,omitempty"`
	Unit        string     `json:"unit,omitempty"`
	ImageURL    *string    `json:"image_url,omitempty"`
	TrackStock  *bool      `json:"track_stock,omitempty"`
}

// UpdateProductRequest for updating a product
type UpdateProductRequest struct {
	Name        *string    `json:"name,omitempty"`
	CategoryID  *uuid.UUID `json:"category_id,omitempty"`
	Barcode     *string    `json:"barcode,omitempty"`
	SKU         *string    `json:"sku,omitempty"`
	Description *string    `json:"description,omitempty"`
	Price       *float64   `json:"price,omitempty"`
	Cost        *float64   `json:"cost,omitempty"`
	MinStock    *int       `json:"min_stock,omitempty"`
	Unit        *string    `json:"unit,omitempty"`
	ImageURL    *string    `json:"image_url,omitempty"`
	IsActive    *bool      `json:"is_active,omitempty"`
	TrackStock  *bool      `json:"track_stock,omitempty"`
}

// StockAdjustRequest for stock adjustments
type StockAdjustRequest struct {
	ProductID uuid.UUID `json:"product_id" validate:"required"`
	Type      string    `json:"type" validate:"oneof=in out adjustment"`
	Quantity  int       `json:"quantity" validate:"required,min=1"`
	Notes     *string   `json:"notes,omitempty"`
}

// CreateTransactionRequest for creating a transaction
type CreateTransactionRequest struct {
	CustomerID      *uuid.UUID                     `json:"customer_id,omitempty"`
	Items           []CreateTransactionItemRequest `json:"items" validate:"required,min=1"`
	DiscountAmount  float64                        `json:"discount_amount,omitempty"`
	DiscountPercent float64                        `json:"discount_percent,omitempty"`
	PaymentAmount   float64                        `json:"payment_amount" validate:"required,min=0"`
	PaymentType     string                         `json:"payment_type" validate:"required,oneof=cash qris transfer debit credit"`
	PaymentRef      *string                        `json:"payment_reference,omitempty"`
	Notes           *string                        `json:"notes,omitempty"`
	SendReceipt     bool                           `json:"send_receipt,omitempty"`
}

// CreateTransactionItemRequest for transaction items
type CreateTransactionItemRequest struct {
	ProductID       uuid.UUID `json:"product_id" validate:"required"`
	Quantity        int       `json:"quantity" validate:"required,min=1"`
	DiscountAmount  float64   `json:"discount_amount,omitempty"`
	DiscountPercent float64   `json:"discount_percent,omitempty"`
}

// CreateCustomerRequest for creating a customer
type CreateCustomerRequest struct {
	Name    string  `json:"name" validate:"required,min=2"`
	Phone   *string `json:"phone,omitempty"`
	Email   *string `json:"email,omitempty"`
	Address *string `json:"address,omitempty"`
	Notes   *string `json:"notes,omitempty"`
}

// UpdateCustomerRequest for updating a customer
type UpdateCustomerRequest struct {
	Name     *string `json:"name,omitempty"`
	Phone    *string `json:"phone,omitempty"`
	Email    *string `json:"email,omitempty"`
	Address  *string `json:"address,omitempty"`
	Notes    *string `json:"notes,omitempty"`
	IsActive *bool   `json:"is_active,omitempty"`
}

// SendWhatsAppRequest for sending WhatsApp messages
type SendWhatsAppRequest struct {
	Phone       string `json:"phone" validate:"required"`
	Message     string `json:"message" validate:"required"`
	MessageType string `json:"message_type" validate:"required,oneof=receipt stock_alert promo broadcast reminder"`
}

// BroadcastRequest for WhatsApp broadcast
type BroadcastRequest struct {
	CustomerIDs []uuid.UUID `json:"customer_ids,omitempty"`
	Message     string      `json:"message" validate:"required"`
	SendToAll   bool        `json:"send_to_all,omitempty"`
}

// ========================================
// Report DTOs
// ========================================

// DailySalesReport for daily sales data
type DailySalesReport struct {
	Date               string  `json:"date"`
	TotalTransactions  int     `json:"total_transactions"`
	TotalSales         float64 `json:"total_sales"`
	TotalDiscounts     float64 `json:"total_discounts"`
	GrossProfit        float64 `json:"gross_profit"`
	AverageTransaction float64 `json:"average_transaction"`
}

// ProductReport for product performance
type ProductReport struct {
	ProductID        uuid.UUID `json:"product_id"`
	ProductName      string    `json:"product_name"`
	TotalSold        int       `json:"total_sold"`
	TotalRevenue     float64   `json:"total_revenue"`
	TotalProfit      float64   `json:"total_profit"`
	TransactionCount int       `json:"transaction_count"`
}

// ProfitLossReport for profit and loss
type ProfitLossReport struct {
	Period       string  `json:"period"`
	TotalRevenue float64 `json:"total_revenue"`
	TotalCost    float64 `json:"total_cost"`
	GrossProfit  float64 `json:"gross_profit"`
	Margin       float64 `json:"margin"`
}

// ========================================
// Response Wrappers
// ========================================

// APIResponse for standard API responses
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// PaginatedResponse for paginated lists
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Page       int         `json:"page"`
	PerPage    int         `json:"per_page"`
	Total      int         `json:"total"`
	TotalPages int         `json:"total_pages"`
}

// SubscriptionPlan represents available plans
type SubscriptionPlan struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	PriceIDR         int      `json:"price_idr"`
	TransactionLimit int      `json:"transaction_limit"`
	OutletLimit      int      `json:"outlet_limit"`
	StaffLimit       int      `json:"staff_limit"`
	Features         []string `json:"features"`
}

// GetSubscriptionPlans returns available subscription plans
func GetSubscriptionPlans() []SubscriptionPlan {
	return []SubscriptionPlan{
		{
			ID:               "free",
			Name:             "Free",
			PriceIDR:         0,
			TransactionLimit: 50,
			OutletLimit:      1,
			StaffLimit:       1,
			Features: []string{
				"50 transaksi/bulan",
				"100 produk",
				"50 pelanggan",
				"Laporan dasar",
			},
		},
		{
			ID:               "basic",
			Name:             "Basic",
			PriceIDR:         59000,
			TransactionLimit: -1, // unlimited
			OutletLimit:      1,
			StaffLimit:       2,
			Features: []string{
				"Transaksi unlimited",
				"Produk unlimited",
				"Pelanggan unlimited",
				"Kirim struk WhatsApp",
				"Alert stok rendah",
				"Export laporan",
			},
		},
		{
			ID:               "pro",
			Name:             "Pro",
			PriceIDR:         149000,
			TransactionLimit: -1,
			OutletLimit:      5,
			StaffLimit:       10,
			Features: []string{
				"Semua fitur Basic",
				"Multi outlet (5)",
				"Multi kasir (10)",
				"Broadcast promo WA",
				"Laporan lanjutan",
				"Priority support",
			},
		},
		{
			ID:               "agency",
			Name:             "Agency",
			PriceIDR:         299000,
			TransactionLimit: -1,
			OutletLimit:      -1, // unlimited
			StaffLimit:       -1,
			Features: []string{
				"Semua fitur Pro",
				"Outlet unlimited",
				"Staff unlimited",
				"White label",
				"API access",
				"Dedicated support",
			},
		},
	}
}
