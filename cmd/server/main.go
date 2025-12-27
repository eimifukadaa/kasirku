package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"kasirku/internal/config"
	"kasirku/internal/database"
	"kasirku/internal/handlers"
	"kasirku/internal/middleware"
	"kasirku/internal/services"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	// Load configuration
	if err := config.Load(); err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize Storage Buckets
	go services.InitStorage()

	// Connect to database
	if err := database.Connect(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:         "KASIRKU.APP API",
		ErrorHandler:    errorHandler,
		ReadBufferSize:  8192,
		WriteBufferSize: 8192,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} ${latency}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     config.AppConfig.CORSOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "healthy",
			"service": "kasirku-api",
		})
	})

	// API routes
	api := app.Group("/api")

	// Public routes
	api.Post("/auth/register", handlers.Register)
	api.Post("/auth/login", handlers.Login)
	api.Get("/subscription/plans", handlers.GetPlans)

	// Protected routes
	protected := api.Group("", middleware.AuthMiddleware())

	// Auth routes
	protected.Get("/auth/me", handlers.GetMe)
	protected.Put("/auth/profile", handlers.UpdateProfile)

	// Subscription routes
	protected.Get("/subscription", handlers.GetSubscription)
	protected.Post("/subscription/upgrade", handlers.UpgradePlan)
	protected.Get("/subscription/check-limit", handlers.CheckSubscriptionLimit)

	// Store routes
	protected.Get("/stores", handlers.ListStores)
	protected.Post("/stores", handlers.CreateStore)
	protected.Get("/stores/:id", handlers.GetStore)
	protected.Put("/stores/:id", handlers.UpdateStore)
	protected.Delete("/stores/:id", handlers.DeleteStore)

	// Store-scoped routes
	storeRoutes := protected.Group("/stores/:storeId", middleware.StoreAccessMiddleware())

	// Category routes
	storeRoutes.Get("/categories", handlers.ListCategories)
	storeRoutes.Post("/categories", handlers.CreateCategory)

	// Product routes
	storeRoutes.Get("/products", handlers.ListProducts)
	storeRoutes.Post("/products", handlers.CreateProduct)
	storeRoutes.Get("/products/:id", handlers.GetProduct)
	storeRoutes.Put("/products/:id", handlers.UpdateProduct)
	storeRoutes.Delete("/products/:id", handlers.DeleteProduct)
	storeRoutes.Get("/products/barcode/:code", handlers.GetProductByBarcode)
	storeRoutes.Post("/products/generate-barcode", handlers.GenerateBarcode)

	// Stock routes
	storeRoutes.Get("/stock", handlers.ListStockMovements)
	storeRoutes.Post("/stock/in", handlers.StockIn)
	storeRoutes.Post("/stock/out", handlers.StockOut)
	storeRoutes.Get("/stock/low", handlers.GetLowStock)

	// Transaction routes
	storeRoutes.Get("/transactions", handlers.ListTransactions)
	storeRoutes.Post("/transactions", handlers.CreateTransaction)
	storeRoutes.Get("/transactions/:id", handlers.GetTransaction)

	// Customer routes
	storeRoutes.Get("/customers", handlers.ListCustomers)
	storeRoutes.Post("/customers", handlers.CreateCustomer)
	storeRoutes.Get("/customers/:id", handlers.GetCustomer)
	storeRoutes.Put("/customers/:id", handlers.UpdateCustomer)
	storeRoutes.Delete("/customers/:id", handlers.DeleteCustomer)
	storeRoutes.Post("/customers/find-or-create", handlers.FindOrCreateCustomerByPhone)

	// Report routes
	storeRoutes.Get("/reports/dashboard", handlers.GetDashboardStats)
	storeRoutes.Get("/reports/daily", handlers.GetDailyReport)
	storeRoutes.Get("/reports/weekly", handlers.GetWeeklyReport)
	storeRoutes.Get("/reports/monthly", handlers.GetMonthlyReport)
	storeRoutes.Get("/reports/products", handlers.GetProductReport)
	storeRoutes.Get("/reports/profit-loss", handlers.GetProfitLossReport)
	storeRoutes.Get("/reports/export", handlers.ExportReport)
	storeRoutes.Post("/reset-database", handlers.ResetStoreData)

	// WhatsApp routes
	storeRoutes.Post("/whatsapp/send-receipt", handlers.SendReceipt)
	storeRoutes.Post("/whatsapp/send-stock-alert", handlers.SendStockAlert)
	storeRoutes.Post("/whatsapp/broadcast", handlers.SendBroadcast)
	storeRoutes.Get("/whatsapp/logs", handlers.GetWhatsAppLogs)

	// Graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Println("Gracefully shutting down...")
		app.Shutdown()
	}()

	// Start server
	port := config.AppConfig.Port
	log.Printf("🚀 KASIRKU.APP API starting on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// errorHandler handles all errors
func errorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error":   message,
	})
}
