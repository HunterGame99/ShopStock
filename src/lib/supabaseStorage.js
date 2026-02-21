// ============================================
// ShopStock v3.3 — Supabase Async Data Layer
// Handles all async communication with Supabase
// ============================================

import supabase from './supabaseClient.js'

// ===== Field Mapping: camelCase (JS) ↔ snake_case (DB) =====
const toSnake = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj
    const map = {
        costPrice: 'cost_price', sellPrice: 'sell_price', minStock: 'min_stock',
        createdAt: 'created_at', totalSpent: 'total_spent', visitCount: 'visit_count',
        paymentMethod: 'payment_method', customerId: 'customer_id',
        staffId: 'staff_id', staffName: 'staff_name', originalTxId: 'original_tx_id',
        openedAt: 'opened_at', closedAt: 'closed_at', openingCash: 'opening_cash',
        expectedCash: 'expected_cash', cashSales: 'cash_sales',
        transferSales: 'transfer_sales', qrSales: 'qr_sales',
        totalSales: 'total_sales', transactionCount: 'transaction_count',
        closingCash: 'closing_cash', productId: 'product_id', minQty: 'min_qty',
        shopName: 'shop_name', shopAddress: 'shop_address', shopPhone: 'shop_phone',
        receiptFooter: 'receipt_footer', vatEnabled: 'vat_enabled', vatRate: 'vat_rate',
        paidAt: 'paid_at',
    }
    const result = {}
    for (const [key, val] of Object.entries(obj)) {
        result[map[key] || key] = val
    }
    return result
}

const toCamel = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj
    const map = {
        cost_price: 'costPrice', sell_price: 'sellPrice', min_stock: 'minStock',
        created_at: 'createdAt', total_spent: 'totalSpent', visit_count: 'visitCount',
        payment_method: 'paymentMethod', customer_id: 'customerId',
        staff_id: 'staffId', staff_name: 'staffName', original_tx_id: 'originalTxId',
        opened_at: 'openedAt', closed_at: 'closedAt', opening_cash: 'openingCash',
        expected_cash: 'expectedCash', cash_sales: 'cashSales',
        transfer_sales: 'transferSales', qr_sales: 'qrSales',
        total_sales: 'totalSales', transaction_count: 'transactionCount',
        closing_cash: 'closingCash', product_id: 'productId', min_qty: 'minQty',
        shop_name: 'shopName', shop_address: 'shopAddress', shop_phone: 'shopPhone',
        receipt_footer: 'receiptFooter', vat_enabled: 'vatEnabled', vat_rate: 'vatRate',
        paid_at: 'paidAt',
    }
    const result = {}
    for (const [key, val] of Object.entries(obj)) {
        result[map[key] || key] = val
    }
    return result
}

const toCamelArray = (arr) => (arr || []).map(toCamel)

// ===== Generic CRUD =====
async function fetchAll(table) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) { console.error(`[Supabase] fetch ${table}:`, error.message); return null }
    return toCamelArray(data)
}

async function upsertRow(table, row) {
    const snakeRow = toSnake(row)
    const { error } = await supabase.from(table).upsert(snakeRow, { onConflict: 'id' })
    if (error) console.error(`[Supabase] upsert ${table}:`, error.message)
}

async function deleteRow(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) console.error(`[Supabase] delete ${table}:`, error.message)
}

async function replaceAll(table, rows) {
    if (rows.length === 0) {
        // Clear all data if empty
        await supabase.from(table).delete().neq('id', '__never__')
        return
    }
    const snakeRows = rows.map(toSnake)
    // Upsert in batches of 500
    for (let i = 0; i < snakeRows.length; i += 500) {
        const batch = snakeRows.slice(i, i + 500)
        const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' })
        if (error) console.error(`[Supabase] upsert ${table} batch:`, error.message)
    }
    // Delete rows that no longer exist locally
    const localIds = rows.map(r => r.id)
    const { data: cloudRows } = await supabase.from(table).select('id')
    if (cloudRows) {
        const toDelete = cloudRows.filter(r => !localIds.includes(r.id)).map(r => r.id)
        if (toDelete.length > 0) {
            await supabase.from(table).delete().in('id', toDelete)
        }
    }
}

// ===== Table-specific push functions =====
export async function pushProducts(products) { await replaceAll('products', products) }
export async function pushTransactions(txs) { await replaceAll('transactions', txs) }
export async function pushCustomers(customers) { await replaceAll('customers', customers) }
export async function pushShifts(shifts) { await replaceAll('shifts', shifts) }
export async function pushPromotions(promos) { await replaceAll('promotions', promos) }
export async function pushExpenses(expenses) { await replaceAll('expenses', expenses) }
export async function pushTargets(targets) { await replaceAll('targets', targets) }
export async function pushHeldBills(bills) { await replaceAll('held_bills', bills) }
export async function pushCredits(credits) { await replaceAll('credits', credits) }
export async function pushUsers(users) { await replaceAll('users', users) }

export async function pushSettings(settings) {
    const snakeRow = toSnake(settings)
    snakeRow.id = 'default'
    const { error } = await supabase.from('settings').upsert(snakeRow, { onConflict: 'id' })
    if (error) console.error('[Supabase] upsert settings:', error.message)
}

// ===== Sync all from Supabase → returns data for localStorage =====
export async function syncAllFromSupabase() {
    console.log('[Supabase] Syncing all data from cloud...')
    const results = {}
    const tables = [
        { key: 'shopstock_products', table: 'products' },
        { key: 'shopstock_transactions', table: 'transactions' },
        { key: 'shopstock_customers', table: 'customers' },
        { key: 'shopstock_shifts', table: 'shifts' },
        { key: 'shopstock_promotions', table: 'promotions' },
        { key: 'shopstock_expenses', table: 'expenses' },
        { key: 'shopstock_targets', table: 'targets' },
        { key: 'shopstock_held_bills', table: 'held_bills' },
        { key: 'shopstock_credits', table: 'credits' },
        { key: 'shopstock_users', table: 'users' },
    ]

    for (const { key, table } of tables) {
        const data = await fetchAll(table)
        if (data !== null) {
            results[key] = data
            localStorage.setItem(key, JSON.stringify(data))
        }
    }

    // Settings is a single row
    const { data: settingsData, error } = await supabase.from('settings').select('*').eq('id', 'default').single()
    if (!error && settingsData) {
        const camelSettings = toCamel(settingsData)
        delete camelSettings.id // don't store 'id' in settings
        results['shopstock_settings'] = camelSettings
        localStorage.setItem('shopstock_settings', JSON.stringify(camelSettings))
    }

    console.log('[Supabase] Sync complete!')
    return results
}

// ===== Check if Supabase has data (for first-time migration) =====
export async function hasCloudData() {
    const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true })
    if (error) return false
    return (count || 0) > 0
}

// ===== Upload all localStorage data to Supabase (first-time migration) =====
export async function uploadAllToSupabase() {
    console.log('[Supabase] Uploading local data to cloud...')
    const parse = (key) => { try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] } }

    await pushProducts(parse('shopstock_products'))
    await pushTransactions(parse('shopstock_transactions'))
    await pushCustomers(parse('shopstock_customers'))
    await pushShifts(parse('shopstock_shifts'))
    await pushPromotions(parse('shopstock_promotions'))
    await pushExpenses(parse('shopstock_expenses'))
    await pushTargets(parse('shopstock_targets'))
    await pushHeldBills(parse('shopstock_held_bills'))
    await pushCredits(parse('shopstock_credits'))
    await pushUsers(parse('shopstock_users'))

    // Settings
    try {
        const settings = JSON.parse(localStorage.getItem('shopstock_settings')) || {}
        if (Object.keys(settings).length > 0) await pushSettings(settings)
    } catch { }

    console.log('[Supabase] Upload complete!')
}
