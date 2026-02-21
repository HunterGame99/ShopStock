// ============================================
// ShopStock v3.3 — Ultimate Data Layer
// Hybrid: localStorage (cache) + Supabase (cloud)
// ============================================

import {
    pushProducts, pushTransactions, pushCustomers, pushShifts,
    pushPromotions, pushExpenses, pushTargets, pushHeldBills,
    pushCredits, pushUsers, pushSettings,
    syncAllFromSupabase, hasCloudData, uploadAllToSupabase
} from './supabaseStorage.js'
import { sendTelegramNotify } from './telegramNotify.js'

const PRODUCTS_KEY = 'shopstock_products';
const TRANSACTIONS_KEY = 'shopstock_transactions';
const CUSTOMERS_KEY = 'shopstock_customers';
const SHIFTS_KEY = 'shopstock_shifts';
const PROMOTIONS_KEY = 'shopstock_promotions';
const TARGETS_KEY = 'shopstock_targets';
const HELD_BILLS_KEY = 'shopstock_held_bills';
const CREDITS_KEY = 'shopstock_credits';
const EXPENSES_KEY = 'shopstock_expenses';
const SETTINGS_KEY = 'shopstock_settings';
const USERS_KEY = 'shopstock_users';
const SESSION_KEY = 'shopstock_session';
const BRANCHES_KEY = 'shopstock_branches';
const ACTIVE_BRANCH_KEY = 'shopstock_active_branch';

// ===== Supabase push mapping =====
const pushMap = {
    [PRODUCTS_KEY]: pushProducts,
    [TRANSACTIONS_KEY]: pushTransactions,
    [CUSTOMERS_KEY]: pushCustomers,
    [SHIFTS_KEY]: pushShifts,
    [PROMOTIONS_KEY]: pushPromotions,
    [EXPENSES_KEY]: pushExpenses,
    [TARGETS_KEY]: pushTargets,
    [HELD_BILLS_KEY]: pushHeldBills,
    [CREDITS_KEY]: pushCredits,
    [USERS_KEY]: pushUsers,
}

// ===== ID Generator =====
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ===== Branch Management =====
export function getBranches() {
    try {
        const branches = JSON.parse(localStorage.getItem(BRANCHES_KEY)) || []
        if (branches.length === 0) {
            const def = { id: 'default', name: 'สาขาหลัก', address: '', phone: '', createdAt: new Date().toISOString() }
            localStorage.setItem(BRANCHES_KEY, JSON.stringify([def]))
            return [def]
        }
        return branches
    } catch { return [{ id: 'default', name: 'สาขาหลัก' }] }
}
export function saveBranches(branches) { localStorage.setItem(BRANCHES_KEY, JSON.stringify(branches)) }
export function getActiveBranchId() { return localStorage.getItem(ACTIVE_BRANCH_KEY) || 'default' }
export function setActiveBranchId(id) { localStorage.setItem(ACTIVE_BRANCH_KEY, id) }

// ===== Generic CRUD helpers (Branch Aware) =====
function getStore(key) {
    let allData = [];
    try { allData = JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
    
    // Global tables or non-arrays
    if ([USERS_KEY, SETTINGS_KEY, BRANCHES_KEY].includes(key) || !Array.isArray(allData)) return allData

    const branchId = getActiveBranchId()
    return allData.filter(item => !item.branchId || item.branchId === branchId)
}

function setStore(key, data) {
    let allData = [];
    try { allData = JSON.parse(localStorage.getItem(key)) || [] } catch { }
    
    // Global tables or non-arrays
    if ([USERS_KEY, SETTINGS_KEY, BRANCHES_KEY].includes(key) || !Array.isArray(data)) {
        allData = data
    } else {
        const branchId = getActiveBranchId()
        const mappedData = data.map(item => ({...item, branchId: item.branchId || branchId}))
        // Filter out the other branches to keep them safe
        const otherBranches = (Array.isArray(allData) ? allData : []).filter(item => item.branchId && item.branchId !== branchId && item.branchId !== 'default')
        allData = [...otherBranches, ...mappedData]
    }
    
    localStorage.setItem(key, JSON.stringify(allData))
    // Async push to Supabase (fire-and-forget) - sends the full unified array to Supabase
    const pushFn = pushMap[key]
    if (pushFn) pushFn(allData).catch(err => console.warn('[Supabase] push error:', err.message))
}

// ===== Startup Sync =====
export async function initSync() {
    try {
        const cloudHasData = await hasCloudData()
        if (cloudHasData) {
            // Cloud has data → pull to localStorage
            await syncAllFromSupabase()
        } else {
            // Cloud is empty → push local data up
            const localProducts = getStore(PRODUCTS_KEY)
            if (localProducts.length > 0) {
                await uploadAllToSupabase()
            }
        }
    } catch (err) {
        console.warn('[Supabase] Sync failed, using local data:', err.message)
    }
}

// ===== Products CRUD =====
export function getProducts() { return getStore(PRODUCTS_KEY) }
export function saveProducts(products) { setStore(PRODUCTS_KEY, products) }

export function addProduct(product) {
    const products = getProducts()
    const newProduct = {
        ...product, id: generateId(),
        stock: Number(product.stock) || 0, costPrice: Number(product.costPrice) || 0,
        sellPrice: Number(product.sellPrice) || 0, minStock: Number(product.minStock) || 5,
        barcode: product.barcode || '', emoji: product.emoji || '📦',
        lots: product.lots || [], // [{lot, qty, mfgDate, expDate}]
        createdAt: new Date().toISOString(),
    }
    products.push(newProduct)
    saveProducts(products)
    return newProduct
}

export function updateProduct(id, updates) {
    const products = getProducts()
    const index = products.findIndex(p => p.id === id)
    if (index === -1) return null
    products[index] = { ...products[index], ...updates }
    saveProducts(products)
    return products[index]
}

export function deleteProduct(id) { saveProducts(getProducts().filter(p => p.id !== id)) }
export function getProductById(id) { return getProducts().find(p => p.id === id) || null }

// ===== Customers CRUD =====
export function getCustomers() { return getStore(CUSTOMERS_KEY) }
export function saveCustomers(c) { setStore(CUSTOMERS_KEY, c) }

export function addCustomer(customer) {
    const customers = getCustomers()
    const newCustomer = {
        id: generateId(),
        ...customer,
        phone: customer.phone || '',
        points: Number(customer.points) || 0,
        totalSpent: 0,
        visitCount: 0,
        createdAt: new Date().toISOString(),
    }
    customers.push(newCustomer)
    saveCustomers(customers)
    return newCustomer
}

export function updateCustomer(id, updates) {
    const customers = getCustomers()
    const i = customers.findIndex(c => c.id === id)
    if (i === -1) return null
    customers[i] = { ...customers[i], ...updates }
    saveCustomers(customers)
    return customers[i]
}

export function deleteCustomer(id) { saveCustomers(getCustomers().filter(c => c.id !== id)) }

export function redeemPoints(customerId, pointsToRedeem) {
    const customers = getCustomers()
    const customer = customers.find(c => c.id === customerId)
    if (!customer || (customer.points || 0) < pointsToRedeem) return null
    customer.points = (customer.points || 0) - pointsToRedeem
    saveCustomers(customers)
    return pointsToRedeem // 1 point = ฿1 discount
}

export function getCustomerPurchases(customerId) {
    return getTransactions().filter(tx => tx.customerId === customerId && tx.type === 'out')
}

// ===== Transactions CRUD =====
export function getTransactions() { return getStore(TRANSACTIONS_KEY) }
export function saveTransactions(txs) { setStore(TRANSACTIONS_KEY, txs) }

export function addTransaction(tx) {
    const transactions = getTransactions()
    const session = getCurrentSession()
    const newTx = {
        ...tx,
        id: generateId(),
        staffId: session?.userId || 'system',
        staffName: session?.userName || 'System',
        createdAt: new Date().toISOString()
    }
    transactions.unshift(newTx)
    saveTransactions(transactions)

    const products = getProducts()
    newTx.items.forEach(item => {
        const product = products.find(p => p.id === item.productId)
        if (product) {
            if (newTx.type === 'in') product.stock = (product.stock || 0) + item.qty
            else if (newTx.type === 'out') {
                product.stock = Math.max(0, (product.stock || 0) - item.qty)
                // Telegram Notify for Low/Out of Stock
                if (product.stock <= 0) {
                    sendTelegramNotify(`🚨 [สินค้าหมด]\n"${product.name}" หมดสต็อกแล้ว! กรุณาตรวจสอบและสั่งซื้อเพิ่ม`)
                } else if (product.stock <= product.minStock) {
                    sendTelegramNotify(`⚠️ [แจ้งเตือนสต็อกเหลือน้อย]\n"${product.name}" เหลือสต็อกแค่ ${product.stock} ชิ้น (จุดสั่งซื้อ: ${product.minStock})`)
                }
            }
            else if (newTx.type === 'refund') product.stock = (product.stock || 0) + item.qty
        }
    })
    saveProducts(products)

    // Update customer stats & points
    if (newTx.customerId && newTx.type === 'out') {
        const customer = getCustomers().find(c => c.id === newTx.customerId)
        if (customer) {
            updateCustomer(customer.id, {
                totalSpent: (customer.totalSpent || 0) + newTx.total,
                visitCount: (customer.visitCount || 0) + 1,
                points: (customer.points || 0) + Math.floor(newTx.total / 25), // 25 THB = 1 Point
            })
        }
    }

    // Update active shift metrics
    const activeShift = getActiveShift()
    if (activeShift && newTx.type === 'out') {
        const shifts = getShifts()
        const sIdx = shifts.findIndex(s => s.id === activeShift.id)
        if (sIdx !== -1) {
            shifts[sIdx].transactionCount++
            shifts[sIdx].totalSales += newTx.total
            if (!newTx.paymentMethod || newTx.paymentMethod === 'cash') {
                shifts[sIdx].cashSales += newTx.total
                shifts[sIdx].expectedCash += newTx.total
            } else if (newTx.paymentMethod === 'transfer') {
                shifts[sIdx].transferSales += newTx.total
            } else if (newTx.paymentMethod === 'qr') {
                shifts[sIdx].qrSales += newTx.total
            }
            saveShifts(shifts)
        }
    }

    return newTx
}

// ===== Refund =====
export function refundTransaction(txId) {
    const txs = getTransactions()
    const original = txs.find(t => t.id === txId)
    if (!original || original.type !== 'out' || original.refunded) return null
    // Mark original as refunded
    original.refunded = true
    saveTransactions(txs)
    // Create refund transaction
    return addTransaction({
        type: 'refund', items: original.items,
        total: original.total, note: `คืนสินค้าจากบิล #${txId.slice(-6)}`,
        originalTxId: txId, customerId: original.customerId,
    })
}

// ===== Held Bills =====
export function getHeldBills() { return getStore(HELD_BILLS_KEY) }
export function saveHeldBills(bills) { setStore(HELD_BILLS_KEY, bills) }

export function holdBill(cart, customerId, note) {
    const bills = getHeldBills()
    bills.push({ id: generateId(), cart, customerId: customerId || null, note: note || '', createdAt: new Date().toISOString() })
    saveHeldBills(bills)
}

export function resumeBill(billId) {
    const bills = getHeldBills()
    const bill = bills.find(b => b.id === billId)
    if (!bill) return null
    saveHeldBills(bills.filter(b => b.id !== billId))
    return bill
}

export function deleteHeldBill(billId) {
    saveHeldBills(getHeldBills().filter(b => b.id !== billId))
}

// ===== Credits / Debt =====
export function getCredits() { return getStore(CREDITS_KEY) }
export function saveCredits(c) { setStore(CREDITS_KEY, c) }

export function addCredit(customerId, amount, items, note) {
    const credits = getCredits()
    credits.push({ id: generateId(), customerId, amount, items, note: note || 'เงินเชื่อ', paid: false, createdAt: new Date().toISOString() })
    saveCredits(credits)
}

export function payCredit(creditId) {
    const credits = getCredits()
    const c = credits.find(cr => cr.id === creditId)
    if (c) { c.paid = true; c.paidAt = new Date().toISOString() }
    saveCredits(credits)
}

export function getUnpaidCredits(customerId) {
    return getCredits().filter(c => !c.paid && (!customerId || c.customerId === customerId))
}

// ===== Recent Sales =====
export function getRecentSales(limit = 5) {
    return getTransactions().filter(tx => tx.type === 'out').slice(0, limit)
}

// ===== Expenses =====
export function getExpenses() { return getStore(EXPENSES_KEY) }
export function saveExpenses(e) { setStore(EXPENSES_KEY, e) }

export function getExpensesBetween(start, end) {
    const expenses = getExpenses()
    return expenses.filter(e => {
        const d = new Date(e.createdAt)
        return d >= start && d <= end
    })
}

export function addExpense(expense) {
    const expenses = getExpenses()
    const newExpense = {
        id: generateId(),
        ...expense,
        createdAt: new Date().toISOString()
    }
    expenses.unshift(newExpense)
    saveExpenses(expenses)
    return newExpense
}

export function deleteExpense(id) {
    saveExpenses(getExpenses().filter(e => e.id !== id))
}

export const EXPENSE_CATEGORIES = [
    { name: 'ค่าเช่าที่', icon: '🏠' },
    { name: 'ค่าน้ำ/ค่าไฟ', icon: '⚡' },
    { name: 'ค่าวัตถุดิบ/ของเสริม', icon: '🛒' },
    { name: 'เงินเดือนพนักงาน', icon: '👥' },
    { name: 'ค่าการตลาด', icon: '📢' },
    { name: 'จิปาถะ', icon: '🛠️' },
]


// ===== Promotions =====
export function getPromotions() { return getStore(PROMOTIONS_KEY) }
export function savePromotions(p) { setStore(PROMOTIONS_KEY, p) }

export function addPromotion(promo) {
    const promos = getPromotions()
    promos.push({ ...promo, id: generateId(), active: true, createdAt: new Date().toISOString() })
    savePromotions(promos)
}

export function togglePromotion(id) {
    const promos = getPromotions()
    const p = promos.find(pr => pr.id === id)
    if (p) p.active = !p.active
    savePromotions(promos)
}

export function deletePromotion(id) { savePromotions(getPromotions().filter(p => p.id !== id)) }

// Apply promotions to cart items → returns discount amount
export function applyPromotions(cartItems) {
    const promos = getPromotions().filter(p => p.active)
    let totalDiscount = 0

    promos.forEach(promo => {
        if (promo.type === 'percent_all') {
            const subtotal = cartItems.reduce((s, c) => s + c.qty * c.price, 0)
            totalDiscount += subtotal * (promo.value / 100)
        } else if (promo.type === 'buy_x_get_discount') {
            cartItems.forEach(item => {
                if (item.qty >= promo.minQty) {
                    totalDiscount += item.price * item.qty * (promo.value / 100)
                }
            })
        } else if (promo.type === 'product_discount') {
            cartItems.forEach(item => {
                if (item.productId === promo.productId) {
                    totalDiscount += item.price * item.qty * (promo.value / 100)
                }
            })
        } else if (promo.type === 'buy_1_get_1') {
            cartItems.forEach(item => {
                if (!promo.productId || item.productId === promo.productId) {
                    // For every 2 items, 1 is free (discounted by its full price)
                    const freeItems = Math.floor(item.qty / 2)
                    totalDiscount += freeItems * item.price
                }
            })
        } else if (promo.type === 'bundle_price') {
            cartItems.forEach(item => {
                if (!promo.productId || item.productId === promo.productId) {
                    // e.g. Buy 3 for 100 THB. (promo.minQty = 3, promo.bundlePrice = 100)
                    const bundles = Math.floor(item.qty / promo.minQty)
                    if (bundles > 0) {
                        const normalPriceForBundle = promo.minQty * item.price
                        const discountPerBundle = normalPriceForBundle - promo.bundlePrice
                        totalDiscount += bundles * Math.max(0, discountPerBundle)
                    }
                }
            })
        }
    })
    return Math.round(totalDiscount * 100) / 100
}

// ===== Sales Targets =====
export function getTargets() { return getStore(TARGETS_KEY) }
export function saveTargets(t) { setStore(TARGETS_KEY, t) }

export function setDailyTarget(amount) {
    const targets = getTargets()
    const today = new Date().toDateString()
    const existing = targets.find(t => t.date === today)
    if (existing) { existing.amount = amount }
    else { targets.push({ date: today, amount, id: generateId() }) }
    saveTargets(targets)
}

export function getTodayTarget() {
    return getTargets().find(t => t.date === new Date().toDateString())?.amount || 0
}

// ===== Settings (Branch Aware) =====
export function getSettings() {
    const raw = getStore(SETTINGS_KEY)
    const branchId = getActiveBranchId()
    const fallback = { id: branchId, theme: 'dark', shopName: 'ShopStock', vatRate: 7 }
    
    if (Array.isArray(raw)) {
        return raw.find(s => s.id === branchId) || fallback
    } else {
        // Legacy: raw was an object
        if (branchId === 'default') return raw || fallback
        return fallback
    }
}

export function saveSettings(s) {
    let raw = getStore(SETTINGS_KEY)
    const branchId = getActiveBranchId()
    let newSettings;
    if (Array.isArray(raw)) {
        newSettings = [...raw.filter(x => x.id !== branchId), { ...s, id: branchId }]
    } else {
        newSettings = [{ ...(raw || {}), id: 'default' }, { ...s, id: branchId }]
    }
    setStore(SETTINGS_KEY, newSettings)
}

// ===== Formatting =====
// ===== Formatting =====
export function formatCurrency(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '฿0'
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)
}
export function formatNumber(n) {
    if (n === undefined || n === null || isNaN(n)) return '0'
    return new Intl.NumberFormat('th-TH').format(n)
}
export function formatDate(dateStr) {
    if (!dateStr) return '-'
    try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return '-'
        return new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
    } catch { return '-' }
}
export function formatDateShort(dateStr) {
    if (!dateStr) return '-'
    try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return '-'
        return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(date)
    } catch { return '-' }
}

// ===== Smart Analytics =====
export function getTransactionsForDate(date) {
    const dateStr = new Date(date).toDateString()
    return getTransactions().filter(tx => new Date(tx.createdAt).toDateString() === dateStr)
}

export function getTodaySales() { return getTransactionsForDate(new Date()).filter(tx => tx.type === 'out') }
export function getYesterdaySales() { const d = new Date(); d.setDate(d.getDate() - 1); return getTransactionsForDate(d).filter(tx => tx.type === 'out') }

export function getSalesInRange(startDate, endDate) {
    const start = new Date(startDate).setHours(0, 0, 0, 0)
    const end = new Date(endDate).setHours(23, 59, 59, 999)
    return getTransactions().filter(tx => { const t = new Date(tx.createdAt).getTime(); return tx.type === 'out' && t >= start && t <= end })
}

export function getLowStockProducts() { return getProducts().filter(p => p.stock <= p.minStock) }
export function getTotalStockValue() { return getProducts().reduce((s, p) => s + (p.stock * p.costPrice), 0) }
export function getTotalRetailValue() { return getProducts().reduce((s, p) => s + (p.stock * p.sellPrice), 0) }

export function calcTxProfit(tx) {
    if (tx.type !== 'out') return 0
    const products = getProducts()
    return tx.items.reduce((profit, item) => {
        const product = products.find(p => p.id === item.productId)
        return profit + (item.price - (product?.costPrice || 0)) * item.qty
    }, 0)
}

export function getTodayRevenue() { return getTodaySales().reduce((s, tx) => s + tx.total, 0) }
export function getTodayExpenses() {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return getExpenses().filter(e => new Date(e.createdAt) >= today).reduce((s, e) => s + e.amount, 0)
}
export function getTodayProfit() {
    const gross = getTodaySales().reduce((s, tx) => s + calcTxProfit(tx), 0)
    return gross - getTodayExpenses()
}
export function getYesterdayRevenue() { return getYesterdaySales().reduce((s, tx) => s + tx.total, 0) }

export function getRevenueTrend() {
    const today = getTodayRevenue(), yesterday = getYesterdayRevenue()
    if (yesterday === 0) return today > 0 ? 100 : 0
    return ((today - yesterday) / yesterday * 100)
}

export function getTopProducts(days = 30, limit = 5) {
    const since = new Date(); since.setDate(since.getDate() - days)
    const sales = getTransactions().filter(tx => tx.type === 'out' && new Date(tx.createdAt) >= since)
    const map = {}
    sales.forEach(tx => tx.items.forEach(item => {
        if (!map[item.productId]) map[item.productId] = { id: item.productId, name: item.productName, qty: 0, revenue: 0 }
        map[item.productId].qty += item.qty
        map[item.productId].revenue += item.qty * item.price
    }))
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, limit)
}

export function getSlowProducts(days = 7) {
    const since = new Date(); since.setDate(since.getDate() - days)
    const sales = getTransactions().filter(tx => tx.type === 'out' && new Date(tx.createdAt) >= since)
    const soldIds = new Set()
    sales.forEach(tx => tx.items.forEach(item => soldIds.add(item.productId)))
    return getProducts().filter(p => !soldIds.has(p.id) && p.stock > 0)
}

export function getLast7DaysData() {
    const products = getProducts()
    return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(); date.setDate(date.getDate() - (6 - i))
        const dayStr = date.toDateString()
        const start = new Date(date); start.setHours(0, 0, 0, 0)
        const end = new Date(date); end.setHours(23, 59, 59, 999)
        const daySales = getTransactions().filter(tx => tx.type === 'out' && new Date(tx.createdAt).toDateString() === dayStr)
        const revenue = daySales.reduce((s, tx) => s + tx.total, 0)
        const grossProfit = daySales.reduce((s, tx) => s + tx.items.reduce((p, item) => {
            const prod = products.find(pr => pr.id === item.productId)
            return p + (item.price - (prod?.costPrice || 0)) * item.qty
        }, 0), 0)
        const dailyExpenses = getExpensesBetween(start, end).reduce((s, e) => s + e.amount, 0)
        return { label: formatDateShort(date.toISOString()), date: date.toDateString(), revenue, profit: grossProfit - dailyExpenses, count: daySales.length, expenses: dailyExpenses }
    })
}

// Weekly comparison (this week vs last week)
export function getWeekComparison() {
    const thisWeek = [], lastWeek = []
    for (let i = 0; i < 7; i++) {
        const d1 = new Date(); d1.setDate(d1.getDate() - (6 - i))
        const d2 = new Date(); d2.setDate(d2.getDate() - (13 - i))
        const tw = getTransactionsForDate(d1).filter(tx => tx.type === 'out').reduce((s, tx) => s + tx.total, 0)
        const lw = getTransactionsForDate(d2).filter(tx => tx.type === 'out').reduce((s, tx) => s + tx.total, 0)
        thisWeek.push({ label: formatDateShort(d1.toISOString()), revenue: tw })
        lastWeek.push({ label: formatDateShort(d2.toISOString()), revenue: lw })
    }
    return { thisWeek, lastWeek }
}

// Expiring products
export function getExpiringProducts(days = 30) {
    const products = getProducts()
    const deadline = new Date(); deadline.setDate(deadline.getDate() + days)
    const results = []
    products.forEach(p => {
        (p.lots || []).forEach(lot => {
            if (lot.expDate && new Date(lot.expDate) <= deadline) {
                results.push({ ...p, lot: lot.lot, expDate: lot.expDate, lotQty: lot.qty })
            }
        })
    })
    return results.sort((a, b) => new Date(a.expDate) - new Date(b.expDate))
}

// ===== AI Predictions =====
export function predictNextWeekSales() {
    const last14 = Array.from({ length: 14 }, (_, i) => {
        const date = new Date(); date.setDate(date.getDate() - (13 - i))
        return getTransactionsForDate(date).filter(tx => tx.type === 'out').reduce((s, tx) => s + tx.total, 0)
    })
    const weights = last14.map((_, i) => i + 1)
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    return Math.round(last14.reduce((sum, val, i) => sum + val * weights[i], 0) / totalWeight * 7)
}

export function getReorderSuggestions() {
    const products = getProducts(), transactions = getTransactions()
    const now = new Date(), ago = new Date(now); ago.setDate(now.getDate() - 30)
    return products.map(product => {
        let totalSold = 0
        transactions.filter(tx => tx.type === 'out' && new Date(tx.createdAt) >= ago)
            .forEach(tx => tx.items.forEach(item => { if (item.productId === product.id) totalSold += item.qty }))
        const days = Math.max(1, Math.ceil((now - ago) / 86400000))
        const avg = totalSold / days
        const daysLeft = avg > 0 ? Math.floor(product.stock / avg) : 999
        const suggested = Math.max(0, Math.ceil(avg * 14) - product.stock)
        return { ...product, avgDailySales: Math.round(avg * 10) / 10, daysUntilEmpty: daysLeft, suggestedOrder: suggested, urgency: daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'warning' : 'ok' }
    }).filter(p => p.suggestedOrder > 0).sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty)
}

export function getProfitReport(days = 30) {
    const since = new Date(); since.setDate(since.getDate() - days)
    const txs = getTransactions().filter(tx => new Date(tx.createdAt) >= since)
    const products = getProducts()
    const revenue = txs.filter(tx => tx.type === 'out').reduce((s, tx) => s + tx.total, 0)
    const cost = txs.filter(tx => tx.type === 'out').reduce((s, tx) => s + tx.items.reduce((c, i) => {
        const p = products.find(pr => pr.id === i.productId); return c + (p?.costPrice || 0) * i.qty
    }, 0), 0)
    const stockIn = txs.filter(tx => tx.type === 'in').reduce((s, tx) => s + tx.total, 0)
    const grossProfit = revenue - cost
    const expenses = getExpenses().filter(e => new Date(e.createdAt) >= since).reduce((s, e) => s + e.amount, 0)
    const netProfit = grossProfit - expenses
    return {
        revenue, costOfGoods: cost, grossProfit, expenses, netProfit,
        transactionCount: txs.filter(tx => tx.type === 'out').length,
        margin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
        stockInvestment: stockIn
    }
}

// ===== Backup & Export =====
export function exportData() {
    return JSON.stringify({ version: '3.0', exportedAt: new Date().toISOString(), products: getProducts(), transactions: getTransactions(), customers: getCustomers(), shifts: getShifts(), promotions: getPromotions(), targets: getTargets() }, null, 2)
}

export function importData(jsonString) {
    try {
        const data = JSON.parse(jsonString)
        if (data.products) saveProducts(data.products)
        if (data.transactions) saveTransactions(data.transactions)
        if (data.customers) saveCustomers(data.customers)
        if (data.shifts) saveShifts(data.shifts)
        if (data.promotions) savePromotions(data.promotions)
        if (data.targets) saveTargets(data.targets)
        return true
    } catch { return false }
}

export function exportCSV(transactions) {
    const headers = ['วันที่', 'ประเภท', 'รายการ', 'จำนวนรวม', 'ยอดรวม', 'หมายเหตุ']
    const rows = transactions.map(tx => [
        `"${new Date(tx.createdAt).toLocaleString('th-TH')}"`, 
        `"${tx.type === 'in' ? 'นำเข้าสต็อก' : 'ขาย'}"`,
        `"${tx.items.map(i => `${i.productName}×${i.qty}`).join(' | ')}"`,
        tx.items.reduce((s, i) => s + i.qty, 0), 
        tx.total, 
        `"${tx.note || ''}"`
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `sales_report_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url)
}

export function exportCSVProducts() {
    const products = getProducts()
    const headers = ['ID', 'Name', 'Category', 'SKU', 'Barcode', 'CostPrice', 'SellPrice', 'Stock', 'MinStock', 'Emoji']
    const rows = products.map(p => [
        p.id, `"${p.name || ''}"`, `"${p.category || ''}"`, p.sku || '', p.barcode || '', 
        p.costPrice || 0, p.sellPrice || 0, p.stock || 0, p.minStock || 0, p.emoji || ''
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url)
}

export function importCSVProducts(csvString) {
    try {
        const lines = csvString.split(/\r?\n/).filter(l => l.trim() !== '')
        if (lines.length <= 1) return { success: false, msg: 'No data found' }
        
        // Simple CSV parser that handles quotes properly
        const parseLine = (line) => {
            const result = []; let current = ''; let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                if (line[i] === '"') { inQuotes = !inQuotes; }
                else if (line[i] === ',' && !inQuotes) { result.push(current); current = ''; }
                else { current += line[i]; }
            }
            result.push(current); return result;
        }

        const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase())
        const products = getProducts()
        let importedCount = 0
        let updatedCount = 0

        for (let i = 1; i < lines.length; i++) {
            const values = parseLine(lines[i])
            if (values.length !== headers.length) continue
            
            const p = {}
            headers.forEach((h, idx) => {
                let val = values[idx].replace(/^"|"$/g, '').trim()
                if (h === 'costprice' || h === 'sellprice' || h === 'stock' || h === 'minstock') val = Number(val) || 0
                p[h] = val
            })

            if (!p.name || !p.sellprice) continue // Skip invalid rows

            const existingIndex = products.findIndex(x => (p.id && x.id === p.id) || (p.sku && x.sku === p.sku))
            
            if (existingIndex >= 0) {
                // Update
                products[existingIndex] = {
                    ...products[existingIndex],
                    name: p.name, category: p.category || 'ทั่วไป', 
                    barcode: p.barcode, costPrice: p.costprice, sellPrice: p.sellprice,
                    stock: p.stock, minStock: p.minstock, emoji: p.emoji || '📦'
                }
                updatedCount++
            } else {
                // Create new
                products.push({
                    id: p.id || generateId(),
                    name: p.name, category: p.category || 'ทั่วไป', sku: p.sku || `SKU${Date.now()}${i}`,
                    barcode: p.barcode, costPrice: p.costprice, sellPrice: p.sellprice,
                    stock: p.stock, minStock: p.minstock, emoji: p.emoji || '📦', createdAt: new Date().toISOString()
                })
                importedCount++
            }
        }
        
        saveProducts(products)
        return { success: true, msg: `Imported ${importedCount}, Updated ${updatedCount}` }
    } catch (err) {
        return { success: false, msg: err.message }
    }
}
// ===== Sound Effects =====
export function playSound(type = 'scan') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator(), gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination); gain.gain.value = 0.1
        if (type === 'scan') { osc.frequency.value = 1200; osc.type = 'sine'; gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); osc.start(); osc.stop(ctx.currentTime + 0.15) }
        else if (type === 'success') { osc.frequency.value = 800; osc.type = 'sine'; osc.start(); setTimeout(() => osc.frequency.value = 1000, 100); setTimeout(() => osc.frequency.value = 1200, 200); osc.stop(ctx.currentTime + 0.35) }
        else if (type === 'error') { osc.frequency.value = 300; osc.type = 'square'; gain.gain.value = 0.05; osc.start(); osc.stop(ctx.currentTime + 0.3) }
    } catch { }
}

// ===== Notifications =====
export function getNotifications() {
    const notifs = []
    const low = getLowStockProducts()
    if (low.length > 0) notifs.push({ type: 'warning', icon: '⚠️', msg: `${low.length} สินค้าใกล้หมด`, link: '/products' })
    const expiring = getExpiringProducts(7)
    if (expiring.length > 0) notifs.push({ type: 'danger', icon: '⏰', msg: `${expiring.length} สินค้าใกล้หมดอายุ (7 วัน)`, link: '/products' })
    const today = getTodayRevenue(), target = getTodayTarget()
    if (target > 0 && today >= target) notifs.push({ type: 'success', icon: '🎯', msg: `ทะลุเป้า! ยอดขาย ${formatCurrency(today)}`, link: '/' })
    if (target > 0 && today >= target * 0.8 && today < target) notifs.push({ type: 'info', icon: '💪', msg: `ใกล้ถึงเป้าแล้ว! เหลืออีก ${formatCurrency(target - today)}`, link: '/' })
    return notifs
}

// ===== Staff & Security =====
export function getUsers() {
    const users = getStore(USERS_KEY)
    if (users.length === 0) {
        // Create default admin if none exists
        const admin = { id: 'admin', name: 'เจ้าของร้าน', pin: '1234', role: 'admin', branchId: 'all', createdAt: new Date().toISOString() }
        const staff = { id: 'staff', name: 'พนักงาน', pin: '5678', role: 'staff', branchId: 'default', createdAt: new Date().toISOString() }
        saveUsers([admin, staff])
        return [admin, staff]
    }
    return users
}
export function saveUsers(users) { setStore(USERS_KEY, users) }

export function authenticate(pin) {
    const users = getUsers()
    const user = users.find(u => u.pin === pin)
    if (user) {
        // Staff are locked to their branch; Admin can be anything but usually 'all' or 'default'
        if (user.role === 'staff' && user.branchId && user.branchId !== 'all') {
            setActiveBranchId(user.branchId) // Force switch to staff's branch
        }
        
        const session = { 
            userId: user.id, 
            userName: user.name, 
            role: user.role, 
            assignedBranch: user.branchId || 'default', 
            loginAt: new Date().toISOString() 
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify(session))
        return session
    }
    return null
}

export function getCurrentSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}

export function logout() {
    localStorage.removeItem(SESSION_KEY)
}

// ===== Shift Management =====
export function getShifts() { return getStore(SHIFTS_KEY) }
export function saveShifts(shifts) { setStore(SHIFTS_KEY, shifts) }

export function getActiveShift() {
    const shifts = getShifts()
    const active = shifts.find(s => !s.closedAt)
    if (!active) return null

    // Auto-close shift if it's from a previous day
    const openedDate = new Date(active.openedAt).toDateString()
    const today = new Date().toDateString()
    if (openedDate !== today) {
        active.closedAt = new Date().toISOString()
        active.closingCash = active.expectedCash
        active.notes = 'ระบบปิดกะอัตโนมัติข้ามวัน (Auto-closed)'
        active.difference = 0
        saveShifts(shifts)
        return null
    }

    return active
}

export function openShift(openingCash) {
    const session = getCurrentSession()
    if (!session) return null
    const shifts = getShifts()
    const newShift = {
        id: generateId(),
        staffId: session.userId,
        staffName: session.userName,
        openedAt: new Date().toISOString(),
        closedAt: null,
        openingCash: Number(openingCash),
        expectedCash: Number(openingCash),
        cashSales: 0,
        transferSales: 0,
        qrSales: 0,
        totalSales: 0,
        transactionCount: 0,
        closingCash: 0,
        difference: 0,
        notes: ''
    }
    shifts.unshift(newShift)
    saveShifts(shifts)
    return newShift
}

export function closeShift(closingCash, notes) {
    const active = getActiveShift()
    if (!active) return null
    const shifts = getShifts()
    const idx = shifts.findIndex(s => s.id === active.id)
    if (idx === -1) return null

    shifts[idx].closedAt = new Date().toISOString()
    shifts[idx].closingCash = Number(closingCash)
    shifts[idx].notes = notes || ''
    shifts[idx].difference = shifts[idx].closingCash - shifts[idx].expectedCash

    saveShifts(shifts)

    // Notify summary
    const s = shifts[idx]
    const openedTime = new Date(s.openedAt).toLocaleTimeString('th-TH')
    const closedTime = new Date(s.closedAt).toLocaleTimeString('th-TH')
    const diffSign = s.difference > 0 ? '+' : ''
    const msg = `📢 [แจ้งเตือน ปิดกะทำงาน]
👤 พนักงาน: ${s.staffName}
⏰ เวลาเปิดกะ: ${openedTime}
⏰ เวลาปิดกะ: ${closedTime}

💰 ยอดขายรวม: ฿${s.totalSales.toLocaleString()}
💵 เงินสดหน้าตู้: ฿${s.cashSales.toLocaleString()}
📱 โอนเงิน: ฿${s.transferSales.toLocaleString()}
💳 เครดิต/QR: ฿${(s.qrSales + s.totalSales - s.cashSales - s.transferSales).toLocaleString()}

📥 รวมเงินในตู้ตามระบบ: ฿${s.expectedCash.toLocaleString()}
🖐️ เงินสดหน้าลิ้นชักที่นับได้: ฿${s.closingCash.toLocaleString()}
⚖️ ส่วนต่าง: ${diffSign}${s.difference.toLocaleString()} บาท

📝 หมายเหตุ: ${s.notes || '-'}`
    sendTelegramNotify(msg)

    return shifts[idx]
}

export function updateShift(shift) {
    const shifts = getShifts()
    const idx = shifts.findIndex(s => s.id === shift.id)
    if (idx !== -1) {
        shifts[idx] = shift
        saveShifts(shifts)
    }
}

// ===== Categories =====
export const CATEGORIES = [
    { name: 'เครื่องดื่ม', emoji: '🥤' }, { name: 'อาหาร', emoji: '🍜' },
    { name: 'ขนม', emoji: '🍿' }, { name: 'เครื่องเขียน', emoji: '✏️' },
    { name: 'ของใช้', emoji: '🧴' }, { name: 'สุขภาพ', emoji: '💊' },
    { name: 'อื่นๆ', emoji: '📦' },
]
export function getCategoryEmoji(category) { return CATEGORIES.find(c => c.name === category)?.emoji || '📦' }

// ===== Seed Demo Data =====
export function seedDemoData() {
    if (getProducts().length > 0) return

    const demoProducts = [
        { name: 'น้ำดื่มสิงห์ 600ml', sku: 'DRK-001', barcode: '8850999220017', category: 'เครื่องดื่ม', emoji: '🥤', costPrice: 5, sellPrice: 10, stock: 48, minStock: 10 },
        { name: 'มาม่า ต้มยำกุ้ง', sku: 'FOOD-001', barcode: '8850987101014', category: 'อาหาร', emoji: '🍜', costPrice: 5, sellPrice: 7, stock: 30, minStock: 10 },
        { name: 'เลย์ รสออริจินัล', sku: 'SNK-001', barcode: '8850718801015', category: 'ขนม', emoji: '🍿', costPrice: 12, sellPrice: 20, stock: 18, minStock: 5 },
        { name: 'โค้ก 325ml', sku: 'DRK-002', barcode: '8851959131008', category: 'เครื่องดื่ม', emoji: '🥤', costPrice: 8, sellPrice: 15, stock: 36, minStock: 12 },
        { name: 'แฟ้มเอกสาร A4', sku: 'STA-001', barcode: '8851068400013', category: 'เครื่องเขียน', emoji: '📁', costPrice: 15, sellPrice: 25, stock: 3, minStock: 5 },
        { name: 'ปากกาลูกลื่น', sku: 'STA-002', barcode: '8851068100012', category: 'เครื่องเขียน', emoji: '🖊️', costPrice: 3, sellPrice: 10, stock: 50, minStock: 10 },
        { name: 'สบู่นกแก้ว', sku: 'CARE-001', barcode: '8851932310017', category: 'ของใช้', emoji: '🧼', costPrice: 8, sellPrice: 15, stock: 20, minStock: 5 },
        { name: 'ยาสีฟันคอลเกต', sku: 'CARE-002', barcode: '8850006320013', category: 'ของใช้', emoji: '🪥', costPrice: 25, sellPrice: 45, stock: 8, minStock: 5 },
        { name: 'ข้าวสาร 5 กก.', sku: 'FOOD-002', barcode: '8859145600018', category: 'อาหาร', emoji: '🍚', costPrice: 80, sellPrice: 120, stock: 5, minStock: 3 },
        { name: 'น้ำมันพืช 1 ลิตร', sku: 'FOOD-003', barcode: '8850742910016', category: 'อาหาร', emoji: '🫗', costPrice: 35, sellPrice: 55, stock: 12, minStock: 5 },
        { name: 'กาแฟเนสกาแฟ 3in1', sku: 'DRK-003', barcode: '8850124045019', category: 'เครื่องดื่ม', emoji: '☕', costPrice: 4, sellPrice: 8, stock: 40, minStock: 15 },
        { name: 'ทิชชู่เอลีท 6 ม้วน', sku: 'CARE-003', barcode: '8850161010016', category: 'ของใช้', emoji: '🧻', costPrice: 45, sellPrice: 69, stock: 6, minStock: 4 },
    ]

    demoProducts.forEach(p => addProduct(p))

    // Demo customers
    addCustomer({ name: 'คุณสมชาย', phone: '0812345678', note: 'ลูกค้าประจำ' })
    addCustomer({ name: 'คุณสมหญิง', phone: '0898765432', note: '' })
    addCustomer({ name: 'ร้านข้าวแกง ป้าแดง', phone: '0851112222', note: 'ซื้อส่ง' })

    // Demo sales history
    const products = getProducts()
    const customers = getCustomers()
    const txs = getTransactions()
    const now = new Date()

    for (let daysAgo = 7; daysAgo >= 0; daysAgo--) {
        const date = new Date(now); date.setDate(date.getDate() - daysAgo)
        const numSales = 2 + Math.floor(Math.random() * 4)
        for (let i = 0; i < numSales; i++) {
            const numItems = 1 + Math.floor(Math.random() * 3)
            const items = []; const usedIdx = new Set()
            for (let j = 0; j < numItems; j++) {
                let idx; do { idx = Math.floor(Math.random() * products.length) } while (usedIdx.has(idx))
                usedIdx.add(idx)
                const qty = 1 + Math.floor(Math.random() * 3)
                items.push({ productId: products[idx].id, productName: products[idx].name, qty, price: products[idx].sellPrice })
            }
            const total = items.reduce((s, item) => s + item.qty * item.price, 0)
            const payment = Math.ceil(total / 10) * 10
            const txDate = new Date(date); txDate.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60))
            const methods = ['cash', 'cash', 'cash', 'transfer', 'qr']
            txs.push({
                id: generateId(), type: 'out', items, total, payment, change: payment - total, note: '',
                paymentMethod: methods[Math.floor(Math.random() * methods.length)],
                customerId: Math.random() > 0.6 ? customers[Math.floor(Math.random() * customers.length)].id : null,
                createdAt: txDate.toISOString(),
            })
        }
        if (Math.random() > 0.5 || daysAgo === 5) {
            const idx = Math.floor(Math.random() * products.length)
            const qty = 6 + Math.floor(Math.random() * 18)
            const txDate = new Date(date); txDate.setHours(8, Math.floor(Math.random() * 30))
            txs.push({ id: generateId(), type: 'in', items: [{ productId: products[idx].id, productName: products[idx].name, qty, price: products[idx].costPrice }], total: qty * products[idx].costPrice, note: 'รับสินค้าจากผู้จำหน่าย', createdAt: txDate.toISOString() })
        }
    }
    txs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    saveTransactions(txs)

    // Set a demo daily target
    setDailyTarget(1000)
}
