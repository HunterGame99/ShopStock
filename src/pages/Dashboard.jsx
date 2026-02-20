import { useState, useEffect } from 'react'
import { getProducts, getTransactions, getTodaySales, getLowStockProducts, getTotalStockValue, formatCurrency, formatDateShort } from '../lib/storage.js'

export default function Dashboard() {
    const [products, setProducts] = useState([])
    const [transactions, setTransactions] = useState([])
    const [todaySales, setTodaySales] = useState([])
    const [lowStock, setLowStock] = useState([])
    const [stockValue, setStockValue] = useState(0)

    useEffect(() => {
        setProducts(getProducts())
        setTransactions(getTransactions())
        setTodaySales(getTodaySales())
        setLowStock(getLowStockProducts())
        setStockValue(getTotalStockValue())
    }, [])

    const todayTotal = todaySales.reduce((sum, tx) => sum + tx.total, 0)
    const totalItems = products.reduce((sum, p) => sum + p.stock, 0)

    // Chart: last 7 days sales
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const dayStr = date.toDateString()
        const daySales = transactions
            .filter(tx => tx.type === 'out' && new Date(tx.createdAt).toDateString() === dayStr)
            .reduce((sum, tx) => sum + tx.total, 0)
        return {
            label: formatDateShort(date.toISOString()),
            value: daySales,
        }
    })

    const maxSale = Math.max(...last7Days.map(d => d.value), 1)

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>📊 แดชบอร์ด</h2>
                <p>ภาพรวมร้านค้าของคุณ</p>
            </div>

            {/* Stat Cards */}
            <div className="stat-cards">
                <div className="stat-card">
                    <div className="stat-card-icon purple">📦</div>
                    <div className="stat-card-info">
                        <h3>สินค้าทั้งหมด</h3>
                        <div className="stat-value">{products.length}</div>
                        <div className="stat-sub">รายการ</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon blue">🏷️</div>
                    <div className="stat-card-info">
                        <h3>สต็อกทั้งหมด</h3>
                        <div className="stat-value">{totalItems.toLocaleString()}</div>
                        <div className="stat-sub">ชิ้น</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon green">💰</div>
                    <div className="stat-card-info">
                        <h3>มูลค่าสต็อก</h3>
                        <div className="stat-value">{formatCurrency(stockValue)}</div>
                        <div className="stat-sub">ราคาทุน</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon orange">🛒</div>
                    <div className="stat-card-info">
                        <h3>ยอดขายวันนี้</h3>
                        <div className="stat-value">{formatCurrency(todayTotal)}</div>
                        <div className="stat-sub">{todaySales.length} รายการ</div>
                    </div>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="dashboard-grid">
                {/* Sales Chart */}
                <div className="chart-container">
                    <div className="chart-header">
                        <h3>📈 ยอดขาย 7 วันล่าสุด</h3>
                    </div>
                    <div className="simple-chart">
                        {last7Days.map((day, i) => (
                            <div key={i} className="chart-bar">
                                <span className="bar-value">{day.value > 0 ? formatCurrency(day.value) : '-'}</span>
                                <div
                                    className="bar"
                                    style={{ height: `${(day.value / maxSale) * 100}%` }}
                                />
                                <span className="bar-label">{day.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Low Stock Alert */}
                <div className="chart-container">
                    <div className="chart-header">
                        <h3>⚠️ สินค้าใกล้หมด</h3>
                        <span className="badge badge-warning">{lowStock.length} รายการ</span>
                    </div>
                    {lowStock.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                            สต็อกเพียงพอทุกรายการ
                        </div>
                    ) : (
                        <div className="low-stock-list">
                            {lowStock.map(product => (
                                <div key={product.id} className="low-stock-item">
                                    <div>
                                        <div className="item-name">{product.name}</div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                            ขั้นต่ำ: {product.minStock}
                                        </div>
                                    </div>
                                    <div className={`item-stock ${product.stock === 0 ? 'badge badge-danger' : 'badge badge-warning'}`}>
                                        เหลือ {product.stock}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="chart-container" style={{ marginTop: 'var(--space-lg)' }}>
                <div className="chart-header">
                    <h3>🕒 รายการล่าสุด</h3>
                </div>
                {transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>
                        ยังไม่มีรายการ
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>ประเภท</th>
                                <th>รายการ</th>
                                <th>จำนวนเงิน</th>
                                <th>วันที่</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.slice(0, 5).map(tx => (
                                <tr key={tx.id}>
                                    <td>
                                        <span className={`badge ${tx.type === 'in' ? 'badge-info' : 'badge-success'}`}>
                                            {tx.type === 'in' ? '📥 นำเข้า' : '🛒 ขาย'}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-primary)' }}>
                                        {tx.items.map(i => i.productName).join(', ')}
                                    </td>
                                    <td style={{ fontWeight: 700, color: tx.type === 'in' ? 'var(--info)' : 'var(--success)' }}>
                                        {formatCurrency(tx.total)}
                                    </td>
                                    <td>{formatDateShort(tx.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
