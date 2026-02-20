import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import { getProducts, seedDemoData, getCurrentSession, authenticate, logout, getActiveShift, openShift, getUsers } from './lib/storage.js'

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
                <div style={{ marginTop: 'var(--space-xl)', fontSize: '10px', color: 'var(--text-muted)' }}>Admin PIN: 1234</div>
            </div>
        </div>
    )
}

function App() {
    const [user, setUser] = useState(null)
    const [activeShift, setActiveShift] = useState(null)

    useEffect(() => {
        seedDemoData()
        setUser(getCurrentSession())
        setActiveShift(getActiveShift())
        // Ensure some users exist
        getUsers()
    }, [])

    const handleLogout = () => {
        logout()
        setUser(null)
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
                                    <Route path="/promotions" element={<Promotions />} />
                                    <Route path="/expenses" element={<Expenses />} />
                                    <Route path="/history" element={<History />} />
                                    <Route path="/reports" element={<Reports />} />
                                    <Route path="/settings" element={<Settings />} />
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
