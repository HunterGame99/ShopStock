import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'

const navItems = [
    { path: '/', icon: '📊', label: 'แดชบอร์ด' },
    { path: '/products', icon: '📦', label: 'จัดการสินค้า' },
    { path: '/stock-in', icon: '📥', label: 'รับสินค้าเข้า' },
    { path: '/stock-out', icon: '🛒', label: 'ขายสินค้า' },
    { path: '/history', icon: '📋', label: 'ประวัติรายการ' },
]

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const location = useLocation()

    return (
        <div className="app-layout">
            {/* Mobile menu button */}
            <button
                className="mobile-menu-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ display: undefined }}
            >
                ☰
            </button>

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon">🏪</div>
                    <div>
                        <h1>ShopStock</h1>
                        <span>ระบบจัดการสต็อก</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                            end={item.path === '/'}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div style={{ padding: 'var(--space-md)', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
                        ShopStock v1.0<br />
                        ข้อมูลเก็บในเครื่อง
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main */}
            <main className="main-content">
                {children}
            </main>
        </div>
    )
}
