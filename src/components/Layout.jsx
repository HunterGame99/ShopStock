import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getTodayRevenue, getTodayProfit, getNotifications, formatCurrency, getSettings, saveSettings } from '../lib/storage.js'

const navItems = [
    { path: '/', icon: '📊', label: 'แดชบอร์ด' },
    { path: '/products', icon: '📦', label: 'สินค้า' },
    { path: '/stock-in', icon: '📥', label: 'รับเข้า' },
    { path: '/stock-out', icon: '🛒', label: 'ขายสินค้า' },
    { path: '/customers', icon: '👥', label: 'ลูกค้า' },
    { path: '/shifts', icon: '💰', label: 'รอบขาย' },
    { path: '/promotions', icon: '🏷️', label: 'โปรโมชั่น' },
    { path: '/history', icon: '📋', label: 'ประวัติ' },
    { path: '/reports', icon: '🧠', label: 'รายงาน & AI' },
]

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [alerts, setAlerts] = useState([])
    const [todayRevenue, setTodayRevenue] = useState(0)
    const [todayProfit, setTodayProfit] = useState(0)
    const [theme, setTheme] = useState(getSettings().theme || 'dark')
    const location = useLocation()

    useEffect(() => {
        setSidebarOpen(false)
        setAlerts(getNotifications())
        setTodayRevenue(getTodayRevenue())
        setTodayProfit(getTodayProfit())
    }, [location])

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        saveSettings({ ...getSettings(), theme })
    }, [theme])

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

    return (
        <div className="app-layout">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon">🏪</div>
                    <div>
                        <h1>ShopStock</h1>
                        <span>Smart Inventory v3.0</span>
                    </div>
                </div>

                <div className="sidebar-stats">
                    <div className="sidebar-stat"><span>💰 วันนี้</span><span style={{ fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{formatCurrency(todayRevenue)}</span></div>
                    <div className="sidebar-stat"><span>📈 กำไร</span><span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(todayProfit)}</span></div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end={item.path === '/'}>
                            <span className="nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                            {item.path === '/' && alerts.length > 0 && <span className="notification-dot">{alerts.length}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="theme-toggle" onClick={toggleTheme} title="สลับธีม">
                        {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
                    </button>
                </div>
            </aside>

            <main className="main-content">{children}</main>
        </div>
    )
}
