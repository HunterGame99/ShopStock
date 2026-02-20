// localStorage data layer for ShopStock

const PRODUCTS_KEY = 'shopstock_products';
const TRANSACTIONS_KEY = 'shopstock_transactions';

// ===== ID Generator =====
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ===== Products =====
export function getProducts() {
    try {
        const data = localStorage.getItem(PRODUCTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
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
    const products = getProducts().filter(p => p.id !== id);
    saveProducts(products);
}

export function getProductById(id) {
    return getProducts().find(p => p.id === id) || null;
}

// ===== Transactions =====
export function getTransactions() {
    try {
        const data = localStorage.getItem(TRANSACTIONS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function saveTransactions(transactions) {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

export function addTransaction(transaction) {
    const transactions = getTransactions();
    const newTx = {
        ...transaction,
        id: generateId(),
        createdAt: new Date().toISOString(),
    };
    transactions.unshift(newTx);
    saveTransactions(transactions);

    // Update product stock
    const products = getProducts();
    newTx.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            if (newTx.type === 'in') {
                product.stock = (product.stock || 0) + item.qty;
            } else if (newTx.type === 'out') {
                product.stock = Math.max(0, (product.stock || 0) - item.qty);
            }
        }
    });
    saveProducts(products);

    return newTx;
}

// ===== Helpers =====
export function formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

export function formatDate(dateStr) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function formatDateShort(dateStr) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric',
        month: 'short',
    }).format(date);
}

// Get today's sales
export function getTodaySales() {
    const today = new Date().toDateString();
    return getTransactions()
        .filter(tx => tx.type === 'out' && new Date(tx.createdAt).toDateString() === today);
}

// Get low stock products
export function getLowStockProducts() {
    return getProducts().filter(p => p.stock <= p.minStock);
}

// Get stock value
export function getTotalStockValue() {
    return getProducts().reduce((sum, p) => sum + (p.stock * p.costPrice), 0);
}

// Seed demo data
export function seedDemoData() {
    if (getProducts().length > 0) return;

    const demoProducts = [
        { name: 'น้ำดื่มสิงห์ 600ml', sku: 'DRK-001', category: 'เครื่องดื่ม', costPrice: 5, sellPrice: 10, stock: 48, minStock: 10 },
        { name: 'มาม่า ต้มยำกุ้ง', sku: 'FOOD-001', category: 'อาหาร', costPrice: 5, sellPrice: 7, stock: 30, minStock: 10 },
        { name: 'เลย์ รสออริจินัล', sku: 'SNK-001', category: 'ขนม', costPrice: 12, sellPrice: 20, stock: 18, minStock: 5 },
        { name: 'โค้ก 325ml', sku: 'DRK-002', category: 'เครื่องดื่ม', costPrice: 8, sellPrice: 15, stock: 36, minStock: 12 },
        { name: 'แฟ้มเอกสาร A4', sku: 'STA-001', category: 'เครื่องเขียน', costPrice: 15, sellPrice: 25, stock: 3, minStock: 5 },
        { name: 'ปากกาลูกลื่น', sku: 'STA-002', category: 'เครื่องเขียน', costPrice: 3, sellPrice: 10, stock: 50, minStock: 10 },
        { name: 'สบู่นกแก้ว', sku: 'CARE-001', category: 'ของใช้', costPrice: 8, sellPrice: 15, stock: 20, minStock: 5 },
        { name: 'ยาสีฟันคอลเกต', sku: 'CARE-002', category: 'ของใช้', costPrice: 25, sellPrice: 45, stock: 8, minStock: 5 },
        { name: 'ข้าวสาร 5 กก.', sku: 'FOOD-002', category: 'อาหาร', costPrice: 80, sellPrice: 120, stock: 5, minStock: 3 },
        { name: 'น้ำมันพืช 1 ลิตร', sku: 'FOOD-003', category: 'อาหาร', costPrice: 35, sellPrice: 55, stock: 12, minStock: 5 },
    ];

    demoProducts.forEach(p => {
        addProduct(p);
    });

    // Add some demo transactions
    const products = getProducts();
    const demoTx = [
        {
            type: 'in',
            items: [
                { productId: products[0].id, productName: products[0].name, qty: 24, price: products[0].costPrice },
                { productId: products[3].id, productName: products[3].name, qty: 12, price: products[3].costPrice },
            ],
            total: 24 * 5 + 12 * 8,
            note: 'รับสินค้าจากผู้จำหน่าย',
        },
        {
            type: 'out',
            items: [
                { productId: products[0].id, productName: products[0].name, qty: 2, price: products[0].sellPrice },
                { productId: products[2].id, productName: products[2].name, qty: 1, price: products[2].sellPrice },
            ],
            total: 2 * 10 + 1 * 20,
            note: '',
            payment: 50,
            change: 10,
        },
    ];

    const transactions = getTransactions();
    demoTx.forEach(tx => {
        transactions.push({
            ...tx,
            id: generateId(),
            createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        });
    });
    saveTransactions(transactions);
}
