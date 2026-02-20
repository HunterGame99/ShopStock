import { useState, useEffect } from 'react'
import { getProducts, getTransactions, getTodaySales, getLowStockProducts, getTotalStockValue, getTotalRetailValue, formatCurrency, formatNumber, getTodayRevenue, getTodayProfit, getRevenueTrend, getTopProducts, getSlowProducts, getLast7DaysData, formatDateShort } from '../lib/storage.js'

export default function Dashboard() {
    const [data, setData] = useState(null)

    useEffect(() => {
        const products = getProducts()
        const transactions = getTransactions()
        const todaySales = getTodaySales()
        const todayRevenue = getTodayRevenue()
        const todayProfit = getTodayProfit()
        const trend = getRevenueTrend()
        const lowStock = getLowStockProducts()
        const stockValue = getTotalStockValue()
        const retailValue = getTotalRetailValue()
        const topProducts = getTopProducts(30, 5)
        const slowProducts = getSlowProducts(7)
        const last7Days = getLast7DaysData()
        const totalItems = products.reduce((s, p) => s + p.stock, 0)

        setData({
            products, transactions, todaySales, todayRevenue, todayProfit,
            trend, lowStock, stockValue, retailValue, topProducts,
            slowProducts, last7Days, totalItems,
        })
    }, [])

    if (!data) return null

    const maxRevenue = Math.max(...data.last7Days.map(d => d.revenue), 1)
    const maxProfit = Math.max(...data.last7Days.map(d => d.profit), 1)

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>📊 แดชบอร์ด</h2>
                <p>ภาพรวมร้านค้าของคุณแบบ Smart</p>
            </div>

            {/* Stat Cards */}
            <div className="stat-cards">
                <div className="stat-card">
                    <div className="stat-card-icon purple">📦</div>
                    <div className="stat-card-info">
                        <h3>สินค้าทั้งหมด</h3>
                        <div className="stat-value">{data.products.length}</div>
                        <div className="stat-sub">{formatNumber(data.totalItems)} ชิ้นในสต็อก</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon green">💰</div>
                    <div className="stat-card-info">
                        <h3>ยอดขายวันนี้</h3>
                        <div className="stat-value">{formatCurrency(data.todayRevenue)}</div>
                        <div className="stat-sub" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {data.trend > 0 ? (
                                <span style={{ color: 'var(--success)' }}>▲ {data.trend.toFixed(0)}%</span>
                            ) : data.trend < 0 ? (
                                <span style={{ color: 'var(--danger)' }}>▼ {Math.abs(data.trend).toFixed(0)}%</span>
                            ) : (
                                <span>— เท่าเดิม</span>
                            )}
                            <span> vs เมื่อวาน</span>
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon blue">🧠</div>
                    <div className="stat-card-info">
                        <h3>กำไรวันนี้</h3>
                        <div className="stat-value" style={{ color: data.todayProfit > 0 ? 'var(--success)' : undefined }}>
                            {formatCurrency(data.todayProfit)}
                        </div>
                        <div className="stat-sub">{data.todaySales.length} รายการขาย</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon orange">🏷️</div>
                    <div className="stat-card-info">
                        <h3>มูลค่าสต็อก</h3>
                        <div className="stat-value">{formatCurrency(data.stockValue)}</div>
                        <div className="stat-sub">ราคาขาย {formatCurrency(data.retailValue)}</div>
                    </div>
                </div>
            </div>

            {/* Charts + Top Sellers row */}
            <div className="dashboard-grid">
                {/* Revenue & Profit Chart */}
                <div className="chart-container">
                    <div className="chart-header">
                        <h3>📈 ยอดขาย & กำไร 7 วัน</h3>
                    </div>
                    <div className="simple-chart">
                        {data.last7Days.map((day, i) => (
                            <div key={i} className="chart-bar">
                                <span className="bar-value">
                                    {day.revenue > 0 ? formatCurrency(day.revenue) : '-'}
                                </span>
                                <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '100%', width: '100%', justifyContent: 'center' }}>
                                    <div
                                        className="bar"
                                        style={{ height: `${(day.revenue / maxRevenue) * 100}%`, maxWidth: '20px', background: 'var(--accent-gradient)' }}
                                        title={`ยอดขาย ${formatCurrency(day.revenue)}`}
                                    />
                                    <div
                                        className="bar"
                                        style={{ height: `${(day.profit / maxRevenue) * 100}%`, maxWidth: '20px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', opacity: 0.8 }}
                                        title={`กำไร ${formatCurrency(day.profit)}`}
                                    />
                                </div>
                                <span className="bar-label">{day.label}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-lg)', justifyContent: 'center', marginTop: 'var(--space-md)', fontSize: 'var(--font-size-xs)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-gradient)', display: 'inline-block' }} /> ยอดขาย
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'inline-block' }} /> กำไร
                        </span>
                    </div>
                </div>

                {/* Top Products */}
                <div className="chart-container">
                    <div className="chart-header">
                        <h3>🏆 สินค้าขายดี</h3>
                        <span className="badge badge-purple">30 วัน</span>
                    </div>
                    {data.topProducts.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>
                            ยังไม่มีข้อมูลการขาย
                        </div>
                    ) : (
                        <div className="low-stock-list">
                            {data.topProducts.map((p, i) => (
                                <div key={p.id} className="low-stock-item">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <span style={{
                                            width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
                                            background: i === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : i === 1 ? 'linear-gradient(135deg, #94a3b8, #64748b)' : i === 2 ? 'linear-gradient(135deg, #b45309, #92400e)' : 'var(--bg-card)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 'var(--font-size-xs)', fontWeight: 800, color: 'white',
                                        }}>{i + 1}</span>
                                        <div>
                                            <div className="item-name">{p.name}</div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                                ขายได้ {p.qty} ชิ้น
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 'var(--font-size-sm)' }}>
                                        {formatCurrency(p.revenue)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Low Stock + Slow Products */}
            <div className="dashboard-grid" style={{ marginTop: 'var(--space-lg)' }}>
                {/* Low Stock */}
                <div className="chart-container">
                    <div className="chart-header">
                        <h3>⚠️ สินค้าใกล้หมด</h3>
                        {data.lowStock.length > 0 && <span className="badge badge-danger">{data.lowStock.length}</span>}
                    </div>
                    {data.lowStock.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                            สต็อกเพียงพอทุกรายการ
                        </div>
                    ) : (
                        <div className="low-stock-list">
                            {data.lowStock.map(p => (
                                <div key={p.id} className="low-stock-item">
                                    <div>
                                        <div className="item-name">{p.emoji || '📦'} {p.name}</div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>ขั้นต่ำ: {p.minStock}</div>
                                    </div>
                                    <span className={`badge ${p.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                                        เหลือ {p.stock}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Slow Products */}
                <div className="chart-container">
                    <div className="chart-header">
                        <h3>🐌 สินค้าไม่เคลื่อนไหว</h3>
                        <span className="badge badge-info">7 วัน</span>
                    </div>
                    {data.slowProducts.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎯</div>
                            สินค้าทุกรายการมียอดขาย
                        </div>
                    ) : (
                        <div className="low-stock-list">
                            {data.slowProducts.slice(0, 5).map(p => (
                                <div key={p.id} className="low-stock-item">
                                    <div className="item-name">{p.emoji || '📦'} {p.name}</div>
                                    <span className="badge badge-info">สต็อก {p.stock}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
