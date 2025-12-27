package handlers

import (
	"fmt"
	"time"

	"kasirku/internal/database"
	"kasirku/internal/models"

	"database/sql"
	"log"

	"github.com/gofiber/fiber/v2"
)

// GetDailyReport returns daily sales report
func GetDailyReport(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	date := c.Query("date", time.Now().Format("2006-01-02"))
	timezone := c.Query("timezone", "Asia/Makassar")

	var report models.DailySalesReport
	err := database.DB.QueryRow(`
		SELECT 
			$2::text as date,
			COALESCE(COUNT(*), 0) as total_transactions,
			COALESCE(SUM(total), 0) as total_sales,
			COALESCE(SUM(discount_amount), 0) as total_discounts,
			COALESCE(SUM(total) - SUM(
				COALESCE((SELECT SUM(cost * quantity) FROM transaction_items WHERE transaction_id = t.id), 0)
			), 0) as gross_profit,
			COALESCE(AVG(total), 0) as average_transaction
		FROM transactions t
		WHERE store_id = $1 
		AND DATE(created_at AT TIME ZONE $3) = $2::date 
		AND status = 'completed'
	`, storeID, date, timezone).Scan(
		&report.Date, &report.TotalTransactions, &report.TotalSales,
		&report.TotalDiscounts, &report.GrossProfit, &report.AverageTransaction,
	)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("Error fetching daily report summary for store %s: %v", storeID, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch daily report summary",
		})
	}

	// Get hourly breakdown
	rows, err := database.DB.Query(`
		SELECT 
			EXTRACT(HOUR FROM created_at AT TIME ZONE $3)::int as hour,
			COUNT(*) as transactions,
			COALESCE(SUM(total), 0) as sales
		FROM transactions
		WHERE store_id = $1 
		AND DATE(created_at AT TIME ZONE $3) = $2::date 
		AND status = 'completed'
		GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE $3)
		ORDER BY hour
	`, storeID, date, timezone)
	if err != nil {
		log.Printf("Error fetching daily report hourly stats for store %s: %v", storeID, err)
	} else {
		defer rows.Close()
	}

	type HourlyStat struct {
		Hour         int     `json:"hour"`
		Transactions int     `json:"transactions"`
		Sales        float64 `json:"sales"`
	}
	var hourlyStats []HourlyStat
	if rows != nil {
		for rows.Next() {
			var stat HourlyStat
			rows.Scan(&stat.Hour, &stat.Transactions, &stat.Sales)
			hourlyStats = append(hourlyStats, stat)
		}
	}

	// Get payment type breakdown
	paymentRows, err := database.DB.Query(`
		SELECT 
			payment_type,
			COUNT(*) as count,
			COALESCE(SUM(total), 0) as amount
		FROM transactions
		WHERE store_id = $1 
		AND DATE(created_at AT TIME ZONE $3) = $2::date 
		AND status = 'completed'
		GROUP BY payment_type
	`, storeID, date, timezone)
	if err != nil {
		log.Printf("Error fetching daily report payment stats for store %s: %v", storeID, err)
	} else {
		defer paymentRows.Close()
	}

	type PaymentStat struct {
		Type   string  `json:"type"`
		Count  int     `json:"count"`
		Amount float64 `json:"amount"`
	}
	var paymentStats []PaymentStat
	if paymentRows != nil {
		for paymentRows.Next() {
			var stat PaymentStat
			paymentRows.Scan(&stat.Type, &stat.Count, &stat.Amount)
			paymentStats = append(paymentStats, stat)
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"summary":         report,
			"hourly_stats":    hourlyStats,
			"payment_methods": paymentStats,
		},
	})
}

// GetWeeklyReport returns weekly sales report
func GetWeeklyReport(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	weeksBack := c.QueryInt("weeks", 4)
	timezone := c.Query("timezone", "Asia/Makassar")

	rows, err := database.DB.Query(`
		SELECT 
			DATE_TRUNC('week', created_at AT TIME ZONE $3)::date as week_start,
			COUNT(*) as total_transactions,
			COALESCE(SUM(total), 0) as total_sales,
			COALESCE(SUM(discount_amount), 0) as total_discounts,
			COALESCE(AVG(total), 0) as average_transaction
		FROM transactions
		WHERE store_id = $1 
		AND created_at AT TIME ZONE $3 >= (NOW() AT TIME ZONE $3) - ($2 || ' weeks')::interval
		AND status = 'completed'
		GROUP BY DATE_TRUNC('week', created_at AT TIME ZONE $3)
		ORDER BY week_start DESC
	`, storeID, weeksBack, timezone)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch weekly report",
		})
	}
	defer rows.Close()

	type WeeklyData struct {
		WeekStart          string  `json:"week_start"`
		TotalTransactions  int     `json:"total_transactions"`
		TotalSales         float64 `json:"total_sales"`
		TotalDiscounts     float64 `json:"total_discounts"`
		AverageTransaction float64 `json:"average_transaction"`
	}
	var weeklyData []WeeklyData
	for rows.Next() {
		var data WeeklyData
		rows.Scan(&data.WeekStart, &data.TotalTransactions, &data.TotalSales,
			&data.TotalDiscounts, &data.AverageTransaction)
		weeklyData = append(weeklyData, data)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    weeklyData,
	})
}

// GetMonthlyReport returns monthly sales report
func GetMonthlyReport(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	monthsBack := c.QueryInt("months", 12)
	timezone := c.Query("timezone", "Asia/Makassar")

	rows, err := database.DB.Query(`
		SELECT 
			TO_CHAR(DATE_TRUNC('month', created_at AT TIME ZONE $3), 'YYYY-MM') as month,
			COUNT(*) as total_transactions,
			COALESCE(SUM(total), 0) as total_sales,
			COALESCE(SUM(discount_amount), 0) as total_discounts,
			COALESCE(AVG(total), 0) as average_transaction
		FROM transactions
		WHERE store_id = $1 
		AND created_at AT TIME ZONE $3 >= (NOW() AT TIME ZONE $3) - ($2 || ' months')::interval
		AND status = 'completed'
		GROUP BY DATE_TRUNC('month', created_at AT TIME ZONE $3)
		ORDER BY month DESC
	`, storeID, monthsBack, timezone)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch monthly report",
		})
	}
	defer rows.Close()

	type MonthlyData struct {
		Month              string  `json:"month"`
		TotalTransactions  int     `json:"total_transactions"`
		TotalSales         float64 `json:"total_sales"`
		TotalDiscounts     float64 `json:"total_discounts"`
		AverageTransaction float64 `json:"average_transaction"`
	}
	var monthlyData []MonthlyData
	for rows.Next() {
		var data MonthlyData
		rows.Scan(&data.Month, &data.TotalTransactions, &data.TotalSales,
			&data.TotalDiscounts, &data.AverageTransaction)
		monthlyData = append(monthlyData, data)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    monthlyData,
	})
}

// GetProductReport returns best selling products report
func GetProductReport(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	limit := c.QueryInt("limit", 20)
	dateFrom := c.Query("date_from", "")
	dateTo := c.Query("date_to", "")
	timezone := c.Query("timezone", "Asia/Makassar")

	query := `
		SELECT 
			p.id as product_id,
			p.name as product_name,
			COALESCE(SUM(ti.quantity), 0) as total_sold,
			COALESCE(SUM(ti.subtotal), 0) as total_revenue,
			COALESCE(SUM((ti.product_price - ti.cost) * ti.quantity), 0) as total_profit,
			COUNT(DISTINCT ti.transaction_id) as transaction_count
		FROM products p
		LEFT JOIN transaction_items ti ON p.id = ti.product_id
		LEFT JOIN transactions t ON ti.transaction_id = t.id AND t.status = 'completed'
		WHERE p.store_id = $1 AND p.is_active = true
	`
	args := []interface{}{storeID}
	argCount := 1

	if dateFrom != "" {
		argCount++
		query += fmt.Sprintf(" AND DATE(t.created_at AT TIME ZONE $%d) >= $%d::date", argCount, argCount+1)
		args = append(args, timezone, dateFrom)
		argCount++
	}
	if dateTo != "" {
		argCount++
		query += fmt.Sprintf(" AND DATE(t.created_at AT TIME ZONE $%d) <= $%d::date", argCount, argCount+1)
		args = append(args, timezone, dateTo)
		argCount++
	}

	query += fmt.Sprintf(` GROUP BY p.id, p.name ORDER BY total_sold DESC LIMIT $%d`, argCount+1)
	args = append(args, limit)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch product report",
		})
	}
	defer rows.Close()

	var products []models.ProductReport
	for rows.Next() {
		var p models.ProductReport
		rows.Scan(&p.ProductID, &p.ProductName, &p.TotalSold, &p.TotalRevenue,
			&p.TotalProfit, &p.TransactionCount)
		products = append(products, p)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    products,
	})
}

// GetProfitLossReport returns profit and loss report
func GetProfitLossReport(c *fiber.Ctx) error {
	storeID := getStoreID(c)
	period := c.Query("period", "monthly") // daily, weekly, monthly
	periodsBack := c.QueryInt("periods", 12)
	timezone := c.Query("timezone", "Asia/Makassar")

	var dateFormat, interval string
	switch period {
	case "daily":
		dateFormat = "YYYY-MM-DD"
		interval = "days"
	case "weekly":
		dateFormat = "IYYY-IW"
		interval = "weeks"
	default:
		dateFormat = "YYYY-MM"
		interval = "months"
	}

	query := fmt.Sprintf(`
		SELECT 
			TO_CHAR(DATE_TRUNC('%s', t.created_at AT TIME ZONE $3), '%s') as period,
			COALESCE(SUM(t.total), 0) as total_revenue,
			COALESCE(SUM(
				(SELECT SUM(cost * quantity) FROM transaction_items WHERE transaction_id = t.id)
			), 0) as total_cost,
			COALESCE(SUM(t.total) - SUM(
				COALESCE((SELECT SUM(cost * quantity) FROM transaction_items WHERE transaction_id = t.id), 0)
			), 0) as gross_profit
		FROM transactions t
		WHERE t.store_id = $1 
		AND t.created_at AT TIME ZONE $3 >= NOW() AT TIME ZONE $3 - ($2 || ' %s')::interval
		AND t.status = 'completed'
		GROUP BY DATE_TRUNC('%s', t.created_at AT TIME ZONE $3)
		ORDER BY period DESC
	`, interval[:len(interval)-1], dateFormat, interval, interval[:len(interval)-1])

	rows, err := database.DB.Query(query, storeID, periodsBack, timezone)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch profit/loss report: " + err.Error(),
		})
	}
	defer rows.Close()

	var reports []models.ProfitLossReport
	for rows.Next() {
		var r models.ProfitLossReport
		rows.Scan(&r.Period, &r.TotalRevenue, &r.TotalCost, &r.GrossProfit)
		if r.TotalRevenue > 0 {
			r.Margin = (r.GrossProfit / r.TotalRevenue) * 100
		}
		reports = append(reports, r)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    reports,
	})
}

// GetDashboardStats returns dashboard overview statistics
func GetDashboardStats(c *fiber.Ctx) error {
	storeID := getStoreID(c)

	type DashboardStats struct {
		TodaySales          float64 `json:"today_sales"`
		TodayTransactions   int     `json:"today_transactions"`
		TodayProfit         float64 `json:"today_profit"`
		WeekSales           float64 `json:"week_sales"`
		WeekTransactions    int     `json:"week_transactions"`
		MonthSales          float64 `json:"month_sales"`
		MonthTransactions   int     `json:"month_transactions"`
		TotalProducts       int     `json:"total_products"`
		TotalCustomers      int     `json:"total_customers"`
		LowStockCount       int     `json:"low_stock_count"`
		PendingTransactions int     `json:"pending_transactions"`
	}

	var stats DashboardStats

	// User's date and timezone
	date := c.Query("date", time.Now().Format("2006-01-02"))
	timezone := c.Query("timezone", "Asia/Makassar")

	// Today's stats
	database.DB.QueryRow(`
		SELECT 
			COALESCE(SUM(total), 0),
			COUNT(*),
			COALESCE(SUM(total) - SUM(
				COALESCE((SELECT SUM(cost * quantity) FROM transaction_items WHERE transaction_id = t.id), 0)
			), 0)
		FROM transactions t
		WHERE store_id = $1 
		AND DATE(created_at AT TIME ZONE $3) = $2::date 
		AND status = 'completed'
	`, storeID, date, timezone).Scan(&stats.TodaySales, &stats.TodayTransactions, &stats.TodayProfit)

	// Week stats
	database.DB.QueryRow(`
		SELECT COALESCE(SUM(total), 0), COUNT(*)
		FROM transactions
		WHERE store_id = $1 
		AND created_at AT TIME ZONE $2 >= (NOW() AT TIME ZONE $2) - INTERVAL '7 days' 
		AND status = 'completed'
	`, storeID, timezone).Scan(&stats.WeekSales, &stats.WeekTransactions)

	// Month stats
	database.DB.QueryRow(`
		SELECT COALESCE(SUM(total), 0), COUNT(*)
		FROM transactions
		WHERE store_id = $1 
		AND created_at AT TIME ZONE $2 >= (NOW() AT TIME ZONE $2) - INTERVAL '30 days' 
		AND status = 'completed'
	`, storeID, timezone).Scan(&stats.MonthSales, &stats.MonthTransactions)

	// Counts
	database.DB.QueryRow(`SELECT COUNT(*) FROM products WHERE store_id = $1 AND is_active = true`, storeID).Scan(&stats.TotalProducts)
	database.DB.QueryRow(`SELECT COUNT(*) FROM customers WHERE store_id = $1 AND is_active = true`, storeID).Scan(&stats.TotalCustomers)
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM products 
		WHERE store_id = $1 AND is_active = true AND track_stock = true AND stock <= min_stock
	`, storeID).Scan(&stats.LowStockCount)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    stats,
	})
}
