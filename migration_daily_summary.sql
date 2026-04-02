-- ============================================
-- ShopStock v3.3 — Daily Summary View
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create the Daily Summary View
CREATE OR REPLACE VIEW daily_summary AS
WITH daily_income AS (
    -- Calculate income from 'in' transactions that are not refunded
    -- Group by date in Asia/Bangkok Timezone
    SELECT 
        DATE(created_at AT TIME ZONE 'Asia/Bangkok') AS summary_date,
        SUM(total) AS total_income,
        COUNT(id) AS transaction_count
    FROM transactions
    WHERE type = 'out' AND refunded = false
    GROUP BY DATE(created_at AT TIME ZONE 'Asia/Bangkok')
),
daily_cost AS (
    -- Calculate total cost of goods sold based on JSONB items array calculation
    SELECT 
        DATE(created_at AT TIME ZONE 'Asia/Bangkok') AS summary_date,
        -- Note: To compute precise COGS, you'd need items to be a separate table.
        -- We will approximate this based on pre-calculated profits if needed, or leave it for frontend.
        0 AS total_cost
    FROM transactions
    WHERE type = 'out' AND refunded = false
    GROUP BY DATE(created_at AT TIME ZONE 'Asia/Bangkok')
),
daily_expenses AS (
    -- Calculate expenses
    SELECT 
        DATE(created_at AT TIME ZONE 'Asia/Bangkok') AS summary_date,
        SUM(amount) AS total_expense
    FROM expenses
    GROUP BY DATE(created_at AT TIME ZONE 'Asia/Bangkok')
)

SELECT 
    COALESCE(i.summary_date, e.summary_date) AS date,
    COALESCE(i.total_income, 0) AS revenue,
    COALESCE(e.total_expense, 0) AS expenses,
    COALESCE(i.transaction_count, 0) AS transaction_count,
    (COALESCE(i.total_income, 0) - COALESCE(e.total_expense, 0)) AS profit
FROM daily_income i
FULL OUTER JOIN daily_expenses e ON i.summary_date = e.summary_date
ORDER BY date DESC;

-- 2. Add RLS Policy (We must allow reading via our secret key)
-- Note: Views typically don't have RLS directly unless they are security invoker views.
-- In Postgres 15+, we can set 'security_invoker=true'.
ALTER VIEW daily_summary SET (security_invoker = true);

-- If you want to explicitly enforce access:
GRANT SELECT ON daily_summary TO anon, authenticated;
