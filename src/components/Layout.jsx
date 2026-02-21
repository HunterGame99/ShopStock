import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth, useShift } from '../App'
import { getNotifications, getTodayRevenue, getTodayProfit, getTodaySales, formatCurrency, getSettings, saveSettings } from '../lib/storage'

const navItems = [
    { path: '/', icon: '📊', label: 'แดชบอร์ด' },
    { path: '/products', icon: '📦', label: 'สินค้า' },
    { path: '/stock-in', icon: '📥', label: 'รับเข้า' },
    { path: '/stock-out', icon: '🛒', label: 'ขายสินค้า' },
    { path: '/customers', icon: '👥', label: 'ลูกค้า' },
    { path: '/shifts', icon: '💰', label: 'รอบขาย' },
    { path: '/promotions', icon: '🏷️', label: 'โปรโมชั่น' },
    { path: '/expenses', icon: '📉', label: 'รายจ่าย' },
    { path: '/history', icon: '📋', label: 'ประวัติ' },
    { path: '/reports', icon: '🧠', label: 'รายงาน & AI' },
    { path: '/settings', icon: '⚙️', label: 'ตั้งค่า' },
]

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [alerts, setAlerts] = useState([])
    const [todayRevenue, setTodayRevenue] = useState(0)
    const [todayProfit, setTodayProfit] = useState(0)
    const [todayBills, setTodayBills] = useState(0)
    const [theme, setTheme] = useState(getSettings().theme || 'dark')
    const { user, logout } = useAuth()
    const { activeShift } = useShift()
    const location = useLocation()

    const refreshStats = () => {
        setAlerts(getNotifications())
        setTodayRevenue(getTodayRevenue())
        setTodayProfit(getTodayProfit())
        setTodayBills(getTodaySales().length)
    }

    useEffect(() => {
        setSidebarOpen(false)
        refreshStats()
    }, [location])

    // Live counter — refresh every 15s
    useEffect(() => {
        const interval = setInterval(refreshStats, 15000)
        return () => clearInterval(interval)
    }, [])

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
                        <span>Smart Inventory v3.3</span>
                    </div>
                </div>

                <div className="sidebar-user-section">
                    <div className="user-profile">
                        <div className="user-avatar">{user?.userName?.charAt(0)}</div>
                        <div className="user-info">
                            <div className="user-name">{user?.userName}</div>
                            <div className="user-role">{user?.role === 'admin' ? 'เจ้าของร้าน' : 'พนักงาน'}</div>
                        </div>
                        <button className="logout-btn" onClick={logout} title="ออกจากระบบ">🚪</button>
                    </div>
                    <div className={`shift-status ${activeShift ? 'open' : 'closed'}`}>
                        {activeShift ? '🟢 กำลังเปิดกะ' : '🔴 ยังไม่เริ่มกะ'}
                    </div>
                </div>

                <div className="sidebar-stats">
                    <div className="sidebar-stat"><span>💰 วันนี้</span><span style={{ fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{formatCurrency(todayRevenue)}</span></div>
                    <div className="sidebar-stat"><span>📈 กำไร</span><span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(todayProfit)}</span></div>
                    <div className="sidebar-stat"><span>🧾 บิล</span><span style={{ fontWeight: 700 }}>{todayBills} รายการ</span></div>
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
                    <button className="logout-btn" onClick={logout}>
                        🚪 ออกจากระบบ
                    </button>
                </div>
            </aside>

            <main className="main-content">{children}</main>
        </div>
    )
}
