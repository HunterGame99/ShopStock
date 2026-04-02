import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth, useShift } from '../App'
import { getNotifications, getTodayRevenue, getTodayProfit, getTodaySales, formatCurrency, getSettings, saveSettings, getBranches, getActiveBranchId, setActiveBranchId } from '../lib/storage'
import { canAccessPage, canSeeProfit } from '../lib/permissions.js'

const navGroups = [
    {
        label: 'หลัก', items: [
            { path: '/', icon: '📊', label: 'แดชบอร์ด' },
        ]
    },
    {
        label: 'สต็อก', items: [
            { path: '/products', icon: '📦', label: 'สินค้า' },
            { path: '/stock-in', icon: '📥', label: 'รับเข้า' },
            { path: '/stock-out', icon: '🛒', label: 'ขายสินค้า' },
        ]
    },
    {
        label: 'จัดการ', items: [
            { path: '/customers', icon: '👥', label: 'ลูกค้า' },
            { path: '/shifts', icon: '💰', label: 'รอบขาย' },
            { path: '/promotions', icon: '🏷️', label: 'โปรโมชั่น' },
        ]
    },
    {
        label: 'การเงิน', items: [
            { path: '/expenses', icon: '📉', label: 'รายจ่าย' },
            { path: '/history', icon: '📋', label: 'ประวัติ' },
            { path: '/reports', icon: '🧠', label: 'รายงาน & AI' },
        ]
    },
    {
        label: 'ระบบ', items: [
            { path: '/settings', icon: '⚙️', label: 'ตั้งค่า' },
        ]
    },
]

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(getSettings().sidebarCollapsed || false)
    const [alerts, setAlerts] = useState([])
    const [todayRevenue, setTodayRevenue] = useState(0)
    const [todayProfit, setTodayProfit] = useState(0)
    const [todayBills, setTodayBills] = useState(0)
    const [theme, setTheme] = useState(getSettings().theme || 'dark')
    const { user, logout } = useAuth()
    const { activeShift } = useShift()
    const location = useLocation()
    const role = user?.role || 'staff'
    const [branches, setBranches] = useState([])
    const [activeBranch, setActiveBranch] = useState(null)
    const visibleGroups = navGroups.map(g => ({
        ...g,
        items: g.items.filter(item => canAccessPage(role, item.path))
    })).filter(g => g.items.length > 0)

    // Sync Status
    const [syncStatus, setSyncStatus] = useState(navigator.onLine ? 'online' : 'offline')
    const hasUnsyncedData = () => localStorage.getItem('shopstock_needs_sync') === 'true'

    const refreshStats = () => {
        setAlerts(getNotifications())
        setTodayRevenue(getTodayRevenue())
        setTodayProfit(getTodayProfit())
        setTodayBills(getTodaySales().length)
    }

    useEffect(() => {
        setSidebarOpen(false)
        refreshStats()
        const allBranches = getBranches()
        setBranches(allBranches)
        setActiveBranch(allBranches.find(b => b.id === getActiveBranchId()) || allBranches[0])

        // Setup network listeners
        const handleOnline = () => {
            setSyncStatus('syncing')
            // The storage.js listener handles the actual upload and fires 'shopstock:sync-complete'
        }
        const handleOffline = () => setSyncStatus('offline')
        const handleSyncComplete = () => setSyncStatus('online')

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        window.addEventListener('shopstock:sync-complete', handleSyncComplete)

        // Initial flag check
        if (navigator.onLine && hasUnsyncedData()) setSyncStatus('syncing')

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('shopstock:sync-complete', handleSyncComplete)
        }
    }, [location])

    // Live counter — refresh every 15s
    useEffect(() => {
        const interval = setInterval(refreshStats, 15000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        saveSettings({ ...getSettings(), theme, sidebarCollapsed: isCollapsed })
    }, [theme, isCollapsed])

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

    return (
        <div className={`app-layout ${isCollapsed ? 'collapsed' : ''}`}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon" onClick={() => setIsCollapsed(!isCollapsed)} style={{ cursor: 'pointer' }} title="ยุบ/ขยายเมนู">🏪</div>
                    {!isCollapsed && (
                        <div>
                            <h1>ShopStock</h1>
                            <span>Smart Inventory v{__APP_VERSION__}</span>
                        </div>
                    )}
                </div>

                <div className="sidebar-user-section">
                    <div className="user-profile">
                        <div className="user-avatar">{user?.userName?.charAt(0)}</div>
                        {!isCollapsed && (
                            <div className="user-info">
                                <div className="user-name">{user?.userName}</div>
                                <div className="user-role">{user?.role === 'admin' ? 'เจ้าของร้าน' : 'พนักงาน'}</div>
                            </div>
                        )}
                    </div>
                    {!isCollapsed && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                            <div className={`shift-status ${activeShift ? 'open' : 'closed'}`} style={{ flex: 1, textAlign: 'center' }}>
                                {activeShift ? '🟢 กำลังเปิดกะ' : '🔴 ยังไม่เริ่มกะ'}
                            </div>
                            <div className="shift-status" style={{ flex: 1, textAlign: 'center', background: syncStatus === 'offline' ? 'var(--danger-bg)' : syncStatus === 'syncing' ? 'var(--warning-bg)' : 'var(--success-bg)', color: syncStatus === 'offline' ? 'var(--danger)' : syncStatus === 'syncing' ? 'var(--warning)' : 'var(--success)', border: 'none' }} title={syncStatus === 'offline' ? 'ออฟไลน์ (เซฟลงเครื่องแล้ว)' : syncStatus === 'syncing' ? 'กำลังซิงค์ขึ้น Cloud' : 'เชื่อมต่อปกติ'}>
                                {syncStatus === 'offline' ? '❌ ออฟไลน์' : syncStatus === 'syncing' ? '⏳ กำลังซิงค์' : '✅ ออนไลน์'}
                            </div>
                        </div>
                    )}
                </div>

                {!isCollapsed && (
                    <div style={{ padding: '0 var(--space-md) var(--space-md) var(--space-md)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>สาขาที่ทำงาน:</div>
                        {role === 'admin' ? (
                            <select
                                className="form-control"
                                style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--bg-card)' }}
                                value={activeBranch?.id || 'default'}
                                onChange={(e) => {
                                    setActiveBranchId(e.target.value)
                                    window.location.reload()
                                }}
                            >
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        ) : (
                            <div style={{ background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                                {activeBranch?.name || 'สาขาหลัก'}
                            </div>
                        )}
                    </div>
                )}

                {!isCollapsed && (
                    <div className="sidebar-stats">
                        <div className="sidebar-stat"><span>💰 วันนี้</span><span style={{ fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{formatCurrency(todayRevenue)}</span></div>
                        {canSeeProfit(role) && <div className="sidebar-stat"><span>📈 กำไร</span><span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(todayProfit)}</span></div>}
                        <div className="sidebar-stat"><span>🧾 บิล</span><span style={{ fontWeight: 700 }}>{todayBills} รายการ</span></div>
                    </div>
                )}

                <nav className="sidebar-nav">
                    {visibleGroups.map((group, gi) => (
                        <div key={gi} className="nav-group">
                            {gi > 0 && <div className="nav-divider" />}
                            {!isCollapsed && <div className="nav-group-label">{group.label}</div>}
                            {group.items.map(item => (
                                <NavLink 
                                    key={item.path} 
                                    to={item.path} 
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} ${item.path === '/stock-out' ? 'nav-highlight' : ''}`} 
                                    end={item.path === '/'}
                                >
                                    <span className="nav-icon" title={isCollapsed ? item.label : ''}>{item.icon}</span>
                                    {!isCollapsed && <span>{item.label}</span>}
                                    {item.path === '/' && alerts.length > 0 && <span className="notification-dot">{alerts.length}</span>}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="theme-toggle" onClick={toggleTheme} title="สลับธีม">
                        {theme === 'dark' ? '☀️' : '🌙'} {!isCollapsed && (theme === 'dark' ? 'Light Mode' : 'Dark Mode')}
                    </button>
                    <button className="logout-btn" onClick={logout} title={isCollapsed ? "ออกจากระบบ" : ""}>
                        🚪 {!isCollapsed && "ออกจากระบบ"}
                    </button>
                </div>
            </aside>

            <main className="main-content">{children}</main>
        </div>
    )
}
