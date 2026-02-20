import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getTodayRevenue, getTodayProfit, getLowStockProducts, formatCurrency } from '../lib/storage.js'

const navItems = [
    { path: '/', icon: '📊', label: 'แดชบอร์ด' },
    { path: '/products', icon: '📦', label: 'จัดการสินค้า' },
    { path: '/stock-in', icon: '📥', label: 'รับสินค้าเข้า' },
    { path: '/stock-out', icon: '🛒', label: 'ขายสินค้า' },
    { path: '/history', icon: '📋', label: 'ประวัติ' },
    { path: '/reports', icon: '📊', label: 'รายงาน & AI' },
]

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [alerts, setAlerts] = useState([])
    const [todayRevenue, setTodayRevenue] = useState(0)
    const [todayProfit, setTodayProfit] = useState(0)
    const location = useLocation()

    useEffect(() => {
        setSidebarOpen(false)
        // Refresh mini stats on navigation
        setAlerts(getLowStockProducts())
        setTodayRevenue(getTodayRevenue())
        setTodayProfit(getTodayProfit())
    }, [location])

    return (
        <div className="app-layout">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon">🏪</div>
                    <div>
                        <h1>ShopStock</h1>
                        <span>Smart Inventory</span>
                    </div>
                </div>

                {/* Mini Stats */}
                <div className="sidebar-stats">
                    <div className="sidebar-stat">
                        <span>💰 วันนี้</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{formatCurrency(todayRevenue)}</span>
                    </div>
                    <div className="sidebar-stat">
                        <span>📈 กำไร</span>
                        <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(todayProfit)}</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            end={item.path === '/'}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                            {item.path === '/products' && alerts.length > 0 && (
                                <span className="notification-dot">{alerts.length}</span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <span>ShopStock v2.0 ✨</span>
                    <span>Smart Edition</span>
                </div>
            </aside>

            <main className="main-content">
                {children}
            </main>
        </div>
    )
}
