import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useCallback, createContext, useContext, useEffect } from 'react'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Products from './pages/Products.jsx'
import StockIn from './pages/StockIn.jsx'
import StockOut from './pages/StockOut.jsx'
import History from './pages/History.jsx'
import Reports from './pages/Reports.jsx'
import Customers from './pages/Customers.jsx'
import Shifts from './pages/Shifts.jsx'
import Promotions from './pages/Promotions.jsx'
import Expenses from './pages/Expenses.jsx'
import Settings from './pages/Settings.jsx'
import { getProducts, seedDemoData, getCurrentSession, authenticate, logout, getActiveShift, openShift, getUsers, initSync } from './lib/storage.js'
import { isAdmin } from './lib/permissions.js'

const ToastContext = createContext(null)
const AuthContext = createContext(null)
const ShiftContext = createContext(null)

export function useToast() { return useContext(ToastContext) }
export function useAuth() { return useContext(AuthContext) }
export function useShift() { return useContext(ShiftContext) }

function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
    }, [])
    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

function LoginOverlay({ onLogin }) {
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const toast = useToast()

    const handlePin = (num) => {
        if (num === '⌫') setPin(prev => prev.slice(0, -1))
        else if (num === 'C') setPin('')
        else if (pin.length < 4) {
            const newPin = pin + num
            setPin(newPin)
            if (newPin.length === 4) {
                const session = authenticate(newPin)
                if (session) {
                    onLogin(session)
                    toast(`ยินดีต้อนรับคุณ ${session.userName} 👋`)
                } else {
                    setError('รหัส PIN ไม่ถูกต้อง')
                    setPin('')
                    setTimeout(() => setError(''), 2000)
                }
            }
        }
    }

    return (
        <div className="modal-overlay" style={{ background: 'var(--bg-main)', zIndex: 9999 }}>
            <div className="modal" style={{ maxWidth: '320px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🏪</div>
                <h2>ShopStock POS</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>กรุณาใส่รหัส PIN 4 หลักเพื่อเข้าใช้งาน</p>

                <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginBottom: 'var(--space-xl)' }}>
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} style={{ width: '16px', height: '16px', borderRadius: '50%', background: pin.length > i ? 'var(--accent-primary)' : 'var(--border)', transition: 'all 0.2s' }} />
                    ))}
                </div>

                {error && <div style={{ color: 'var(--danger)', marginBottom: 'var(--space-md)', fontWeight: 700 }}>{error}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(k => (
                        <button key={k} className="btn btn-secondary" onClick={() => handlePin(k)} style={{ height: '60px', borderRadius: '50%', fontSize: '1.2rem', fontWeight: 700, justifyContent: 'center' }}>
                            {k}
                        </button>
                    ))}
                </div>
                <div style={{ marginTop: 'var(--space-xl)', fontSize: '10px', color: 'var(--text-muted)' }}>
                    Admin PIN: 1234 | Staff PIN: 5678
                </div>
            </div>
        </div>
    )
}

function NotFound() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 'var(--space-xl)' }}>
            <div style={{ fontSize: '5rem', marginBottom: 'var(--space-md)', opacity: 0.6 }}>🔍</div>
            <h2 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--text-primary)', fontWeight: 800, marginBottom: 'var(--space-sm)' }}>404 — ไม่พบหน้านี้</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>ลิงก์ที่คุณเข้ามาอาจไม่ถูกต้อง หรือหน้านี้ถูกลบออกแล้ว</p>
            <a href="/" style={{ background: 'var(--accent-gradient)', color: 'white', padding: '12px 24px', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontWeight: 600 }}>🏠 กลับหน้าแรก</a>
        </div>
    )
}

function App() {
    const [user, setUser] = useState(null)
    const [activeShift, setActiveShift] = useState(null)
    const [syncing, setSyncing] = useState(true)

    useEffect(() => {
        async function startup() {
            try {
                await initSync()
            } catch (err) {
                console.warn('Sync failed, using local data:', err)
            }
            seedDemoData()
            setUser(getCurrentSession())
            setActiveShift(getActiveShift())
            getUsers()
            setSyncing(false)
        }
        startup()
    }, [])

    const handleLogout = () => {
        logout()
        setUser(null)
    }

    if (syncing) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'pulse 2s infinite' }}>☁️</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>กำลังซิงค์ข้อมูล...</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>เชื่อมต่อ Supabase</div>
            </div>
        )
    }

    return (
        <BrowserRouter>
            <ToastProvider>
                <AuthContext.Provider value={{ user, setUser, logout: handleLogout }}>
                    <ShiftContext.Provider value={{ activeShift, setActiveShift }}>
                        {!user ? (
                            <LoginOverlay onLogin={setUser} />
                        ) : (
                            <Layout>
                                <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/products" element={<Products />} />
                                    <Route path="/stock-in" element={<StockIn />} />
                                    <Route path="/stock-out" element={<StockOut />} />
                                    <Route path="/customers" element={<Customers />} />
                                    <Route path="/shifts" element={<Shifts />} />
                                    <Route path="/promotions" element={isAdmin(user?.role) ? <Promotions /> : <Navigate to="/" />} />
                                    <Route path="/expenses" element={isAdmin(user?.role) ? <Expenses /> : <Navigate to="/" />} />
                                    <Route path="/history" element={<History />} />
                                    <Route path="/reports" element={isAdmin(user?.role) ? <Reports /> : <Navigate to="/" />} />
                                    <Route path="/settings" element={isAdmin(user?.role) ? <Settings /> : <Navigate to="/" />} />
                                    <Route path="*" element={<NotFound />} />
                                </Routes>
                            </Layout>
                        )}
                    </ShiftContext.Provider>
                </AuthContext.Provider>
            </ToastProvider>
        </BrowserRouter>
    )
}

export default App
