// ============================================
// ShopStock — Role-Based Permissions
// ============================================

// Pages each role can access
const STAFF_PAGES = ['/', '/products', '/stock-in', '/stock-out', '/customers', '/shifts', '/history']

export function canAccessPage(role, path) {
    if (role === 'admin') return true
    return STAFF_PAGES.includes(path)
}

export function canSeeProfit(role) {
    return role === 'admin'
}

export function canEditProducts(role) {
    return role === 'admin'
}

export function canDeleteCustomer(role) {
    return role === 'admin'
}

export function isAdmin(role) {
    return role === 'admin'
}
