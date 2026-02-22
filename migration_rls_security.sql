-- ============================================
-- ShopStock v3.3 — Enable Row Level Security (RLS)
-- SECURITY UPDATE: Protect data from public access
-- ============================================

-- Step 1: Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE held_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Step 2: Create a function to check our custom secret header
-- Replace 'your_super_secret_key_here' with your actual VITE_APP_SECRET
CREATE OR REPLACE FUNCTION check_shopstock_secret()
RETURNS BOOLEAN AS $$
BEGIN
  -- We extract the custom header sent from supabaseClient.js
  RETURN current_setting('request.headers', true)::json->>'x-shopstock-secret' = 'your_super_secret_key_here';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create Policies that use this function
-- This allows full access ONLY if the x-shopstock-secret matches

-- Products
CREATE POLICY "Allow Full Access to Products with Secret" ON products FOR ALL USING (check_shopstock_secret()) WITH CHECK (check_shopstock_secret());

-- Customers
CREATE POLICY "Allow Full Access to Customers with Secret" ON customers FOR ALL USING (check_shopstock_secret()) WITH CHECK (check_shopstock_secret());

-- Transactions
CREATE POLICY "Allow Full Access to Transactions with Secret" ON transactions FOR ALL USING (check_shopstock_secret()) WITH CHECK (check_shopstock_secret());

-- Shifts
CREATE POLICY "Allow Full Access to Shifts with Secret" ON shifts FOR ALL USING (check_shopstock_secret()) WITH CHECK (check_shopstock_secret());

-- Promotions
CREATE POLICY "Allow Full Access to Promotions with Secret" ON promotions FOR ALL USING (check_shopstock_secret()) WITH CHECK (check_shopstock_secret());

-- Expenses
CREATE POLICY "Allow Full Access to Expenses with Secret" ON expenses FOR ALL USING (check_shopstock_secret()) WITH CHECK (check_shopstock_secret());

-- Targets
CREATE POLICY "Allow Full Access to Targets with Secret" ON targets FOR ALL USING (check_shopstock_secret()) WITH CHECK (check_shopstock_secret());

-- Held Bills
CREATE POLICY "Allow Full Access to Held Bills with Secret" ON held_bills FOR ALL USING (check_shopstock_secret()) WITH CHECK (check_shopstock_secret());

-- Credits
CREATE POLICY "Allow Full Access to Credits with Secret" ON credits FOR ALL USING (check_shopstock_secret()) WITH CHECK (check_shopstock_secret());

-- Users
CREATE POLICY "Allow Full Access to Users with Secret" ON users FOR ALL USING (check_shopstock_secret()) WITH CHECK (check_shopstock_secret());

-- Settings
CREATE POLICY "Allow Full Access to Settings with Secret" ON settings FOR ALL USING (check_shopstock_secret()) WITH CHECK (check_shopstock_secret());

-- You're all set! 
-- Your database is now private and locked. Only the app with the correct header can read/write data.
