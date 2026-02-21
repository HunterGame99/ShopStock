-- ============================================
-- ShopStock v3.3 — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Products
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT DEFAULT '',
    barcode TEXT DEFAULT '',
    category TEXT DEFAULT '',
    emoji TEXT DEFAULT '📦',
    cost_price NUMERIC DEFAULT 0,
    sell_price NUMERIC DEFAULT 0,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    lots JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    note TEXT DEFAULT '',
    points INTEGER DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions (items stored as JSONB array)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'refund')),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total NUMERIC DEFAULT 0,
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    payment NUMERIC DEFAULT 0,
    change NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    customer_id TEXT,
    staff_id TEXT DEFAULT 'system',
    staff_name TEXT DEFAULT 'System',
    note TEXT DEFAULT '',
    refunded BOOLEAN DEFAULT false,
    original_tx_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    staff_id TEXT,
    staff_name TEXT DEFAULT '',
    opened_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ,
    opening_cash NUMERIC DEFAULT 0,
    expected_cash NUMERIC DEFAULT 0,
    cash_sales NUMERIC DEFAULT 0,
    transfer_sales NUMERIC DEFAULT 0,
    qr_sales NUMERIC DEFAULT 0,
    total_sales NUMERIC DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    closing_cash NUMERIC DEFAULT 0,
    difference NUMERIC DEFAULT 0,
    notes TEXT DEFAULT ''
);

-- Promotions
CREATE TABLE IF NOT EXISTS promotions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    value NUMERIC DEFAULT 0,
    min_qty INTEGER DEFAULT 1,
    product_id TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    category TEXT DEFAULT '',
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sales Targets
CREATE TABLE IF NOT EXISTS targets (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    amount NUMERIC DEFAULT 0
);

-- Held Bills
CREATE TABLE IF NOT EXISTS held_bills (
    id TEXT PRIMARY KEY,
    cart JSONB NOT NULL DEFAULT '[]'::jsonb,
    customer_id TEXT,
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Credits / Debt
CREATE TABLE IF NOT EXISTS credits (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    amount NUMERIC DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    note TEXT DEFAULT '',
    paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Staff Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pin TEXT NOT NULL,
    role TEXT DEFAULT 'staff',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Settings (single row)
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    shop_name TEXT DEFAULT 'ShopStock',
    shop_address TEXT DEFAULT '',
    shop_phone TEXT DEFAULT '',
    receipt_footer TEXT DEFAULT 'ขอบคุณที่ใช้บริการ ❤️',
    vat_enabled BOOLEAN DEFAULT false,
    vat_rate NUMERIC DEFAULT 7,
    theme TEXT DEFAULT 'dark'
);

-- Insert default settings row
INSERT INTO settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- Insert default admin user
INSERT INTO users (id, name, pin, role) VALUES ('admin', 'เจ้าของร้าน', '1234', 'admin') ON CONFLICT (id) DO NOTHING;
