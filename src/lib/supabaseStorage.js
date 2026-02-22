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
        paidAt: 'paid_at', imageUrl: 'image_url', isDeleted: 'is_deleted'
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
        paid_at: 'paidAt', image_url: 'imageUrl', is_deleted: 'isDeleted'
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
    if (!rows || rows.length === 0) {
        // PROTECT: ป้องกันการลบข้อมูลทั้งหมดบน Cloud หาก Local ว่างเปล่า (เช่นกรณีเปิดแอปครั้งแรกบนเครื่องใหม่)
        // เราจะไม่ทำการ Delete ทั้งตารางอีกต่อไป
        return
    }
    const snakeRows = rows.map(toSnake)
    // Upsert in batches of 500
    for (let i = 0; i < snakeRows.length; i += 500) {
        const batch = snakeRows.slice(i, i + 500)
        const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' })
        if (error) console.error(`[Supabase] upsert ${table} batch:`, error.message)
    }
    // เอาโค้ดทำการลบข้อมูลบน Cloud อัตโนมัติ (Delete rows that no longer exist locally) ออกทั้งหมด
    // เพื่อให้รองรับการทำงานหลายเครื่อง (Multi-device) โดยที่เครื่อง A จะไม่ไปเผลอลบข้อมูลของเครื่อง B ที่เพิ่งสร้างใหม่
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
    if (Array.isArray(settings)) {
        const snakeRows = settings.map(toSnake)
        for (const row of snakeRows) {
            const { error } = await supabase.from('settings').upsert(row, { onConflict: 'id' })
            if (error) console.error('[Supabase] upsert settings:', error.message)
        }
    } else {
        const snakeRow = toSnake(settings)
        snakeRow.id = 'default'
        const { error } = await supabase.from('settings').upsert(snakeRow, { onConflict: 'id' })
        if (error) console.error('[Supabase] upsert settings:', error.message)
    }
}

// ===== Sync all from Supabase → returns data for localStorage =====
export async function syncAllFromSupabase() {
    console.log('[Supabase] Syncing all data from cloud... (Parallel)')
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

    // Fetch all tables in parallel
    const fetchPromises = tables.map(({ key, table }) =>
        fetchAll(table).then(data => ({ key, data }))
    )

    // Settings is a single row
    const fetchSettings = supabase.from('settings').select('*').eq('id', 'default').single()
        .then(({ data, error }) => {
            if (error || !data) return { key: 'shopstock_settings', data: null }
            const camelSettings = toCamel(data)
            delete camelSettings.id // don't store 'id' in settings
            return { key: 'shopstock_settings', data: camelSettings }
        })

    // Wait for all fetches to finish (resolves regardless of individual failures)
    const allPromises = [...fetchPromises, fetchSettings]
    const settledResults = await Promise.allSettled(allPromises)

    for (const result of settledResults) {
        if (result.status === 'fulfilled' && result.value.data !== null) {
            results[result.value.key] = result.value.data
            localStorage.setItem(result.value.key, JSON.stringify(result.value.data))
        } else if (result.status === 'rejected') {
            console.error('[Supabase] Sync Error for a table:', result.reason)
        }
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
    console.log('[Supabase] Uploading local data to cloud... (Parallel)')
    const parse = (key) => { try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] } }

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

    try {
        const uploadPromises = tables.map(({ key, table }) => {
            const data = parse(key)
            return replaceAll(table, data)
        })

        // Settings
        const settingsPromise = (async () => {
            try {
                const settings = JSON.parse(localStorage.getItem('shopstock_settings')) || {}
                if (Object.keys(settings).length > 0) await pushSettings(settings)
            } catch (err) {
                console.error('[Supabase] pushSettings error:', err)
                throw err
            }
        })()

        const allPromises = [...uploadPromises, settingsPromise]
        const settledResults = await Promise.allSettled(allPromises)
        
        const hasError = settledResults.some(r => r.status === 'rejected')
        if (hasError) {
             console.error('[Supabase] Some tables failed to upload.')
             throw new Error('Partial upload failure')
        }

        // Clear the sync flag since we successfully pushed everything
        localStorage.removeItem('shopstock_needs_sync')
        console.log('[Supabase] Upload complete!')
    } catch (err) {
        console.error('[Supabase] Upload failed, will retry later:', err)
        throw err // rethrow to keep needs_sync active
    }
}

// ===== Storage Specific =====
export async function uploadProductImage(file) {
    if (!file) return null
    try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, file)

        if (uploadError) {
            console.error('[Supabase Storage] Upload Error:', uploadError.message)
            return null
        }

        const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName)
        
        return data.publicUrl
    } catch (err) {
        console.error('[Supabase Storage] Unexpected Error:', err)
        return null
    }
}
