import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Products from './pages/Products.jsx'
import StockIn from './pages/StockIn.jsx'
import StockOut from './pages/StockOut.jsx'
import History from './pages/History.jsx'
import { seedDemoData } from './lib/storage.js'

// Toast Context
const ToastContext = createContext()

export function useToast() {
    return useContext(ToastContext)
}

function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 3000)
    }, [])

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast ${toast.type}`}>
                        <span className="toast-icon">
                            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
                        </span>
                        <span className="toast-message">{toast.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

function App() {
    useEffect(() => {
        seedDemoData()
    }, [])

    return (
        <BrowserRouter>
            <ToastProvider>
                <Layout>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/stock-in" element={<StockIn />} />
                        <Route path="/stock-out" element={<StockOut />} />
                        <Route path="/history" element={<History />} />
                    </Routes>
                </Layout>
            </ToastProvider>
        </BrowserRouter>
    )
}

export default App
