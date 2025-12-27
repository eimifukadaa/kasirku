-- KASIRKU.APP Database Schema
-- Supabase PostgreSQL with Row Level Security

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'owner' CHECK (role IN ('owner', 'staff', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'agency')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    transaction_limit INTEGER DEFAULT 50,
    transaction_used INTEGER DEFAULT 0,
    outlet_limit INTEGER DEFAULT 1,
    staff_limit INTEGER DEFAULT 1,
    price_idr INTEGER DEFAULT 0,
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    current_period_end TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) + INTERVAL '30 days',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id)
);

-- =====================================================
-- STORES TABLE
-- =====================================================
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    whatsapp_api_key TEXT,
    whatsapp_provider VARCHAR(20) DEFAULT 'fonnte' CHECK (whatsapp_provider IN ('fonnte', 'wablas')),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'IDR',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- STAFF TABLE (for multi-outlet)
-- =====================================================
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'cashier' CHECK (role IN ('manager', 'cashier')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, store_id)
);

-- =====================================================
-- CATEGORIES TABLE
-- =====================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    barcode VARCHAR(100),
    sku VARCHAR(100),
    description TEXT,
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    cost DECIMAL(15,2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    unit VARCHAR(20) DEFAULT 'pcs',
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    track_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for barcode lookup
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_store ON products(store_id);

-- =====================================================
-- STOCK MOVEMENTS TABLE
-- =====================================================
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'sale', 'return')),
    quantity INTEGER NOT NULL,
    stock_before INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    total_transactions INTEGER DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    last_transaction_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_store ON customers(store_id);

-- =====================================================
-- TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    cashier_id UUID REFERENCES users(id),
    invoice_number VARCHAR(50) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    payment_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    change_amount DECIMAL(15,2) DEFAULT 0,
    payment_type VARCHAR(20) DEFAULT 'cash' CHECK (payment_type IN ('cash', 'qris', 'transfer', 'debit', 'credit')),
    payment_reference VARCHAR(100),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_transactions_store ON transactions(store_id);
CREATE INDEX idx_transactions_date ON transactions(created_at);
CREATE INDEX idx_transactions_invoice ON transactions(invoice_number);

-- =====================================================
-- TRANSACTION ITEMS TABLE
-- =====================================================
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    product_price DECIMAL(15,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    cost DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);

-- =====================================================
-- WHATSAPP LOGS TABLE
-- =====================================================
CREATE TABLE whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('receipt', 'stock_alert', 'promo', 'broadcast', 'reminder')),
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    provider VARCHAR(20),
    provider_message_id VARCHAR(100),
    error_message TEXT,
    reference_id UUID,
    reference_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_whatsapp_logs_store ON whatsapp_logs(store_id);

-- =====================================================
-- PROMO / DISCOUNTS TABLE
-- =====================================================
CREATE TABLE promos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed', 'buy_x_get_y')),
    value DECIMAL(15,2) NOT NULL,
    min_purchase DECIMAL(15,2) DEFAULT 0,
    max_discount DECIMAL(15,2),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- AUDIT LOG TABLE
-- =====================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_audit_logs_store ON audit_logs(store_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);

-- =====================================================
-- AUTH PASSWORDS TABLE
-- =====================================================
CREATE TABLE auth_passwords (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES (Commented out for local PG)
-- =====================================================
/*
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Stores policies
CREATE POLICY "Users can view own stores" ON stores
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() IN (SELECT user_id FROM staff WHERE store_id = stores.id AND is_active = true)
    );

CREATE POLICY "Owners can manage stores" ON stores
    FOR ALL USING (auth.uid() = user_id);

-- Products policies
CREATE POLICY "Store members can view products" ON products
    FOR SELECT USING (
        store_id IN (
            SELECT id FROM stores WHERE user_id = auth.uid()
            UNION
            SELECT store_id FROM staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Store owners can manage products" ON products
    FOR ALL USING (
        store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
    );

-- Transactions policies
CREATE POLICY "Store members can view transactions" ON transactions
    FOR SELECT USING (
        store_id IN (
            SELECT id FROM stores WHERE user_id = auth.uid()
            UNION
            SELECT store_id FROM staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Store members can create transactions" ON transactions
    FOR INSERT WITH CHECK (
        store_id IN (
            SELECT id FROM stores WHERE user_id = auth.uid()
            UNION
            SELECT store_id FROM staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Customers policies
CREATE POLICY "Store members can view customers" ON customers
    FOR SELECT USING (
        store_id IN (
            SELECT id FROM stores WHERE user_id = auth.uid()
            UNION
            SELECT store_id FROM staff WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Store owners can manage customers" ON customers
    FOR ALL USING (
        store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
    );
*/

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(store_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    seq INTEGER;
    invoice TEXT;
BEGIN
    SELECT COALESCE(SUBSTRING(name FROM 1 FOR 3), 'INV') INTO prefix FROM stores WHERE id = store_uuid;
    prefix := UPPER(prefix);
    
    SELECT COUNT(*) + 1 INTO seq 
    FROM transactions 
    WHERE store_id = store_uuid 
    AND DATE(created_at) = CURRENT_DATE;
    
    invoice := prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(seq::TEXT, 4, '0');
    
    RETURN invoice;
END;
$$ LANGUAGE plpgsql;

-- Function to update stock on transaction
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    prod RECORD;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT * INTO prod FROM products WHERE id = NEW.product_id;
        
        IF prod.track_stock THEN
            -- Create stock movement
            INSERT INTO stock_movements (
                product_id, store_id, type, quantity, 
                stock_before, stock_after, reference_id, reference_type, notes
            ) VALUES (
                NEW.product_id,
                (SELECT store_id FROM transactions WHERE id = NEW.transaction_id),
                'sale',
                NEW.quantity,
                prod.stock,
                prod.stock - NEW.quantity,
                NEW.transaction_id,
                'transaction',
                'Sale: ' || NEW.product_name
            );
            
            -- Update product stock
            UPDATE products 
            SET stock = stock - NEW.quantity,
                updated_at = NOW()
            WHERE id = NEW.product_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stock update
CREATE TRIGGER trigger_update_stock_on_sale
    AFTER INSERT ON transaction_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_sale();

-- Function to update customer stats
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_id IS NOT NULL THEN
        UPDATE customers
        SET 
            total_transactions = total_transactions + 1,
            total_spent = total_spent + NEW.total,
            last_transaction_at = NEW.created_at,
            updated_at = NOW()
        WHERE id = NEW.customer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for customer stats
CREATE TRIGGER trigger_update_customer_stats
    AFTER INSERT ON transactions
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION update_customer_stats();

-- Function to check subscription limits
CREATE OR REPLACE FUNCTION check_transaction_limit()
RETURNS TRIGGER AS $$
DECLARE
    sub RECORD;
    owner_id UUID;
BEGIN
    SELECT user_id INTO owner_id FROM stores WHERE id = NEW.store_id;
    SELECT * INTO sub FROM subscriptions WHERE user_id = owner_id;
    
    IF sub.plan = 'free' AND sub.transaction_used >= sub.transaction_limit THEN
        RAISE EXCEPTION 'Transaction limit reached. Please upgrade your plan.';
    END IF;
    
    -- Increment transaction counter for free plan
    IF sub.plan = 'free' THEN
        UPDATE subscriptions 
        SET transaction_used = transaction_used + 1,
            updated_at = NOW()
        WHERE user_id = owner_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for subscription check
CREATE TRIGGER trigger_check_transaction_limit
    BEFORE INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION check_transaction_limit();

-- Function to reset monthly transaction count
CREATE OR REPLACE FUNCTION reset_monthly_transaction_count()
RETURNS void AS $$
BEGIN
    UPDATE subscriptions
    SET transaction_used = 0,
        current_period_start = NOW(),
        current_period_end = NOW() + INTERVAL '30 days',
        updated_at = NOW()
    WHERE plan = 'free' 
    AND current_period_end < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get low stock products
CREATE OR REPLACE FUNCTION get_low_stock_products(store_uuid UUID)
RETURNS TABLE (
    product_id UUID,
    product_name VARCHAR,
    current_stock INTEGER,
    min_stock INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT id, name, stock, min_stock
    FROM products
    WHERE store_id = store_uuid
    AND track_stock = true
    AND is_active = true
    AND stock <= min_stock
    ORDER BY stock ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Daily sales view
CREATE OR REPLACE VIEW daily_sales AS
SELECT 
    store_id,
    DATE(created_at) as sale_date,
    COUNT(*) as total_transactions,
    SUM(total) as total_sales,
    SUM(discount_amount) as total_discounts,
    SUM(total - COALESCE((
        SELECT SUM(ti.cost * ti.quantity) 
        FROM transaction_items ti 
        WHERE ti.transaction_id = transactions.id
    ), 0)) as gross_profit,
    AVG(total) as average_transaction
FROM transactions
WHERE status = 'completed'
GROUP BY store_id, DATE(created_at);

-- Product performance view
CREATE OR REPLACE VIEW product_performance AS
SELECT 
    p.id as product_id,
    p.store_id,
    p.name as product_name,
    p.category_id,
    COALESCE(SUM(ti.quantity), 0) as total_sold,
    COALESCE(SUM(ti.subtotal), 0) as total_revenue,
    COALESCE(SUM((ti.product_price - ti.cost) * ti.quantity), 0) as total_profit,
    COUNT(DISTINCT ti.transaction_id) as transaction_count
FROM products p
LEFT JOIN transaction_items ti ON p.id = ti.product_id
LEFT JOIN transactions t ON ti.transaction_id = t.id AND t.status = 'completed'
GROUP BY p.id, p.store_id, p.name, p.category_id;
