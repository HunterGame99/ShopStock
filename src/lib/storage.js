// ============================================
// ShopStock v2.0 — Smart Data Layer
// ============================================

const PRODUCTS_KEY = 'shopstock_products';
const TRANSACTIONS_KEY = 'shopstock_transactions';
const SETTINGS_KEY = 'shopstock_settings';

// ===== ID Generator =====
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ===== Products CRUD =====
export function getProducts() {
    try {
        return JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
    } catch { return []; }
}

export function saveProducts(products) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function addProduct(product) {
    const products = getProducts();
    const newProduct = {
        ...product,
        id: generateId(),
        stock: Number(product.stock) || 0,
        costPrice: Number(product.costPrice) || 0,
        sellPrice: Number(product.sellPrice) || 0,
        minStock: Number(product.minStock) || 5,
        barcode: product.barcode || '',
        emoji: product.emoji || '📦',
        createdAt: new Date().toISOString(),
    };
    products.push(newProduct);
    saveProducts(products);
    return newProduct;
}

export function updateProduct(id, updates) {
    const products = getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    products[index] = { ...products[index], ...updates };
    saveProducts(products);
    return products[index];
}

export function deleteProduct(id) {
    saveProducts(getProducts().filter(p => p.id !== id));
}

export function getProductById(id) {
    return getProducts().find(p => p.id === id) || null;
}

// ===== Transactions CRUD =====
export function getTransactions() {
    try {
        return JSON.parse(localStorage.getItem(TRANSACTIONS_KEY)) || [];
    } catch { return []; }
}

export function saveTransactions(txs) {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txs));
}

export function addTransaction(tx) {
    const transactions = getTransactions();
    const newTx = { ...tx, id: generateId(), createdAt: new Date().toISOString() };
    transactions.unshift(newTx);
    saveTransactions(transactions);

    // Update stock
    const products = getProducts();
    newTx.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            product.stock = newTx.type === 'in'
                ? (product.stock || 0) + item.qty
                : Math.max(0, (product.stock || 0) - item.qty);
        }
    });
    saveProducts(products);
    return newTx;
}

// ===== Formatting =====
export function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency', currency: 'THB',
        minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(amount);
}

export function formatNumber(n) {
    return new Intl.NumberFormat('th-TH').format(n);
}

export function formatDate(dateStr) {
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(dateStr));
}

export function formatDateShort(dateStr) {
    return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric', month: 'short',
    }).format(new Date(dateStr));
}

// ===== Smart Analytics =====

// Get transactions for a specific date
export function getTransactionsForDate(date) {
    const dateStr = new Date(date).toDateString();
    return getTransactions().filter(tx => new Date(tx.createdAt).toDateString() === dateStr);
}

// Today's sales
export function getTodaySales() {
    return getTransactionsForDate(new Date()).filter(tx => tx.type === 'out');
}

// Yesterday's sales
export function getYesterdaySales() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return getTransactionsForDate(yesterday).filter(tx => tx.type === 'out');
}

// Sales for a date range
export function getSalesInRange(startDate, endDate) {
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    const end = new Date(endDate).setHours(23, 59, 59, 999);
    return getTransactions().filter(tx => {
        const t = new Date(tx.createdAt).getTime();
        return tx.type === 'out' && t >= start && t <= end;
    });
}

// Low stock products
export function getLowStockProducts() {
    return getProducts().filter(p => p.stock <= p.minStock);
}

// Total stock value (cost)
export function getTotalStockValue() {
    return getProducts().reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
}

// Total stock value (retail)
export function getTotalRetailValue() {
    return getProducts().reduce((sum, p) => sum + (p.stock * p.sellPrice), 0);
}

// Calculate profit from a sale transaction
export function calcTxProfit(tx) {
    if (tx.type !== 'out') return 0;
    const products = getProducts();
    return tx.items.reduce((profit, item) => {
        const product = products.find(p => p.id === item.productId);
        const cost = product ? product.costPrice : 0;
        return profit + (item.price - cost) * item.qty;
    }, 0);
}

// Today's total revenue
export function getTodayRevenue() {
    return getTodaySales().reduce((s, tx) => s + tx.total, 0);
}

// Today's total profit
export function getTodayProfit() {
    return getTodaySales().reduce((s, tx) => s + calcTxProfit(tx), 0);
}

// Yesterday's revenue (for trend comparison)
export function getYesterdayRevenue() {
    return getYesterdaySales().reduce((s, tx) => s + tx.total, 0);
}

// Revenue trend % compared to yesterday
export function getRevenueTrend() {
    const today = getTodayRevenue();
    const yesterday = getYesterdayRevenue();
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return ((today - yesterday) / yesterday * 100);
}

// Top selling products (by quantity sold in last N days)
export function getTopProducts(days = 30, limit = 5) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sales = getTransactions().filter(tx =>
        tx.type === 'out' && new Date(tx.createdAt) >= since
    );

    const productSales = {};
    sales.forEach(tx => {
        tx.items.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = { id: item.productId, name: item.productName, qty: 0, revenue: 0 };
            }
            productSales[item.productId].qty += item.qty;
            productSales[item.productId].revenue += item.qty * item.price;
        });
    });

    return Object.values(productSales)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, limit);
}

// Slow-moving products (no sales in N days)
export function getSlowProducts(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sales = getTransactions().filter(tx =>
        tx.type === 'out' && new Date(tx.createdAt) >= since
    );

    const soldIds = new Set();
    sales.forEach(tx => tx.items.forEach(item => soldIds.add(item.productId)));

    return getProducts().filter(p => !soldIds.has(p.id) && p.stock > 0);
}

// Last 7 days revenue & profit data
export function getLast7DaysData() {
    const products = getProducts();
    return Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dayStr = date.toDateString();
        const daySales = getTransactions().filter(tx =>
            tx.type === 'out' && new Date(tx.createdAt).toDateString() === dayStr
        );
        const revenue = daySales.reduce((s, tx) => s + tx.total, 0);
        const profit = daySales.reduce((s, tx) => {
            return s + tx.items.reduce((p, item) => {
                const prod = products.find(pr => pr.id === item.productId);
                return p + (item.price - (prod?.costPrice || 0)) * item.qty;
            }, 0);
        }, 0);
        return {
            label: formatDateShort(date.toISOString()),
            date: date.toDateString(),
            revenue,
            profit,
            count: daySales.length,
        };
    });
}

// ===== AI Predictions =====

// Simple moving average prediction for next week
export function predictNextWeekSales() {
    const last14 = Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (13 - i));
        const dayStr = date.toDateString();
        return getTransactions()
            .filter(tx => tx.type === 'out' && new Date(tx.createdAt).toDateString() === dayStr)
            .reduce((s, tx) => s + tx.total, 0);
    });

    // Weighted average (recent days matter more)
    const weights = last14.map((_, i) => i + 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const predicted = last14.reduce((sum, val, i) => sum + val * weights[i], 0) / totalWeight;
    return Math.round(predicted * 7);
}

// Smart reorder suggestion
export function getReorderSuggestions() {
    const products = getProducts();
    const transactions = getTransactions();
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    return products.map(product => {
        // Calculate average daily sales
        const sales = transactions.filter(tx =>
            tx.type === 'out' && new Date(tx.createdAt) >= thirtyDaysAgo
        );

        let totalSold = 0;
        sales.forEach(tx => {
            tx.items.forEach(item => {
                if (item.productId === product.id) totalSold += item.qty;
            });
        });

        const daysTracked = Math.max(1, Math.ceil((now - thirtyDaysAgo) / 86400000));
        const avgDailySales = totalSold / daysTracked;
        const daysUntilEmpty = avgDailySales > 0 ? Math.floor(product.stock / avgDailySales) : 999;
        const suggestedOrder = Math.max(0, Math.ceil(avgDailySales * 14) - product.stock); // 2 weeks buffer

        return {
            ...product,
            avgDailySales: Math.round(avgDailySales * 10) / 10,
            daysUntilEmpty,
            suggestedOrder,
            urgency: daysUntilEmpty <= 3 ? 'critical' : daysUntilEmpty <= 7 ? 'warning' : 'ok',
        };
    })
        .filter(p => p.suggestedOrder > 0)
        .sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);
}

// Profit/Loss report for a period
export function getProfitReport(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const transactions = getTransactions().filter(tx => new Date(tx.createdAt) >= since);
    const products = getProducts();

    const totalRevenue = transactions
        .filter(tx => tx.type === 'out')
        .reduce((s, tx) => s + tx.total, 0);

    const totalCost = transactions
        .filter(tx => tx.type === 'out')
        .reduce((s, tx) => s + tx.items.reduce((c, item) => {
            const prod = products.find(p => p.id === item.productId);
            return c + (prod?.costPrice || 0) * item.qty;
        }, 0), 0);

    const totalStockIn = transactions
        .filter(tx => tx.type === 'in')
        .reduce((s, tx) => s + tx.total, 0);

    return {
        revenue: totalRevenue,
        costOfGoods: totalCost,
        grossProfit: totalRevenue - totalCost,
        margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0,
        stockInvestment: totalStockIn,
        transactionCount: transactions.filter(tx => tx.type === 'out').length,
    };
}

// ===== Backup & Restore =====
export function exportData() {
    return JSON.stringify({
        version: '2.0',
        exportedAt: new Date().toISOString(),
        products: getProducts(),
        transactions: getTransactions(),
    }, null, 2);
}

export function importData(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (data.products) saveProducts(data.products);
        if (data.transactions) saveTransactions(data.transactions);
        return true;
    } catch {
        return false;
    }
}

// Export transactions as CSV
export function exportCSV(transactions) {
    const headers = ['วันที่', 'ประเภท', 'สินค้า', 'จำนวน', 'มูลค่า', 'หมายเหตุ'];
    const rows = transactions.map(tx => [
        new Date(tx.createdAt).toLocaleString('th-TH'),
        tx.type === 'in' ? 'นำเข้า' : 'ขาย',
        tx.items.map(i => `${i.productName}×${i.qty}`).join(' | '),
        tx.items.reduce((s, i) => s + i.qty, 0),
        tx.total,
        tx.note || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopstock_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ===== Sound Effects =====
export function playSound(type = 'scan') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = 0.1;

        if (type === 'scan') {
            osc.frequency.value = 1200;
            osc.type = 'sine';
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } else if (type === 'success') {
            osc.frequency.value = 800;
            osc.type = 'sine';
            osc.start();
            setTimeout(() => { osc.frequency.value = 1000; }, 100);
            setTimeout(() => { osc.frequency.value = 1200; }, 200);
            osc.stop(ctx.currentTime + 0.35);
        } else if (type === 'error') {
            osc.frequency.value = 300;
            osc.type = 'square';
            gain.gain.value = 0.05;
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch { }
}

// ===== Categories =====
export const CATEGORIES = [
    { name: 'เครื่องดื่ม', emoji: '🥤' },
    { name: 'อาหาร', emoji: '🍜' },
    { name: 'ขนม', emoji: '🍿' },
    { name: 'เครื่องเขียน', emoji: '✏️' },
    { name: 'ของใช้', emoji: '🧴' },
    { name: 'สุขภาพ', emoji: '💊' },
    { name: 'อื่นๆ', emoji: '📦' },
];

export function getCategoryEmoji(category) {
    return CATEGORIES.find(c => c.name === category)?.emoji || '📦';
}

// ===== Seed Demo Data =====
export function seedDemoData() {
    if (getProducts().length > 0) return;

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
    ];

    demoProducts.forEach(p => addProduct(p));

    // Generate realistic multi-day sales history
    const products = getProducts();
    const txs = getTransactions();
    const now = new Date();

    for (let daysAgo = 7; daysAgo >= 0; daysAgo--) {
        const date = new Date(now);
        date.setDate(date.getDate() - daysAgo);

        // 2-5 sale transactions per day
        const numSales = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numSales; i++) {
            const numItems = 1 + Math.floor(Math.random() * 3);
            const items = [];
            const usedIdx = new Set();
            for (let j = 0; j < numItems; j++) {
                let idx;
                do { idx = Math.floor(Math.random() * products.length); } while (usedIdx.has(idx));
                usedIdx.add(idx);
                const qty = 1 + Math.floor(Math.random() * 3);
                items.push({
                    productId: products[idx].id,
                    productName: products[idx].name,
                    qty,
                    price: products[idx].sellPrice,
                });
            }
            const total = items.reduce((s, i) => s + i.qty * i.price, 0);
            const payment = Math.ceil(total / 10) * 10;
            const txDate = new Date(date);
            txDate.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
            txs.push({
                id: generateId(),
                type: 'out',
                items,
                total,
                payment,
                change: payment - total,
                note: '',
                createdAt: txDate.toISOString(),
            });
        }

        // 0-1 stock-in per day
        if (Math.random() > 0.5 || daysAgo === 5) {
            const idx = Math.floor(Math.random() * products.length);
            const qty = 6 + Math.floor(Math.random() * 18);
            const txDate = new Date(date);
            txDate.setHours(8, Math.floor(Math.random() * 30));
            txs.push({
                id: generateId(),
                type: 'in',
                items: [{ productId: products[idx].id, productName: products[idx].name, qty, price: products[idx].costPrice }],
                total: qty * products[idx].costPrice,
                note: 'รับสินค้าจากผู้จำหน่าย',
                createdAt: txDate.toISOString(),
            });
        }
    }

    // Sort by date
    txs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    saveTransactions(txs);
}
