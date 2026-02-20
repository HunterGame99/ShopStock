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
import { seedDemoData } from './lib/storage.js'

const ToastContext = createContext(null)
export function useToast() { return useContext(ToastContext) }

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

function App() {
    useEffect(() => { seedDemoData() }, [])
    return (
        <BrowserRouter>
            <ToastProvider>
                <Layout>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/stock-in" element={<StockIn />} />
                        <Route path="/stock-out" element={<StockOut />} />
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/shifts" element={<Shifts />} />
                        <Route path="/promotions" element={<Promotions />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/reports" element={<Reports />} />
                    </Routes>
                </Layout>
            </ToastProvider>
        </BrowserRouter>
    )
}

export default App
