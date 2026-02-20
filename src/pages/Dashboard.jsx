import { useState, useEffect } from 'react'
import { getProducts, getTodaySales, getLowStockProducts, getTotalStockValue, getTotalRetailValue, formatCurrency, formatNumber, getTodayRevenue, getTodayProfit, getRevenueTrend, getTopProducts, getSlowProducts, getLast7DaysData, getTodayTarget, setDailyTarget, getWeekComparison, getExpiringProducts, getNotifications } from '../lib/storage.js'
import { useToast } from '../App.jsx'

export default function Dashboard() {
    const [data, setData] = useState(null)
    const [targetInput, setTargetInput] = useState('')
    const [showTargetInput, setShowTargetInput] = useState(false)
    const toast = useToast()

    const loadData = () => {
        const products = getProducts()
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
        const target = getTodayTarget()
        const weekComp = getWeekComparison()
        const expiring = getExpiringProducts(7)
        const notifs = getNotifications()

        setData({ products, todaySales, todayRevenue, todayProfit, trend, lowStock, stockValue, retailValue, topProducts, slowProducts, last7Days, totalItems, target, weekComp, expiring, notifs })
    }

    useEffect(() => {
        loadData()
        const interval = setInterval(loadData, 15000) // Auto-refresh every 15s
        return () => clearInterval(interval)
    }, [])

    const handleSetTarget = () => {
        if (targetInput) { setDailyTarget(Number(targetInput)); toast('ตั้งเป้าสำเร็จ 🎯'); setShowTargetInput(false); loadData() }
    }

    if (!data) return null

    const targetProgress = data.target > 0 ? Math.min(100, (data.todayRevenue / data.target) * 100) : 0
    const maxRevenue = Math.max(...data.last7Days.map(d => d.revenue), 1)

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>📊 แดชบอร์ด</h2>
                <p>ภาพรวมแบบ Real-time • อัพเดตทุก 15 วินาที</p>
            </div>

            {/* Notifications Bar */}
            {data.notifs.length > 0 && (
                <div style={{ marginBottom: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                    {data.notifs.map((n, i) => (
                        <div key={i} className={`notif-bar notif-${n.type}`}>
                            <span>{n.icon} {n.msg}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Sales Target Progress */}
            {data.target > 0 && (
                <div className="chart-container" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md) var(--space-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>🎯 เป้ายอดขายวันนี้</span>
                        <span style={{ fontWeight: 700, color: targetProgress >= 100 ? 'var(--success)' : 'var(--accent-primary-hover)' }}>
                            {formatCurrency(data.todayRevenue)} / {formatCurrency(data.target)} ({targetProgress.toFixed(0)}%)
                        </span>
                    </div>
                    <div style={{ height: '10px', background: 'var(--border)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${targetProgress}%`, background: targetProgress >= 100 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'var(--accent-gradient)', borderRadius: '5px', transition: 'width 0.5s ease' }} />
                    </div>
                </div>
            )}

            {/* Stat Cards */}
            <div className="stat-cards">
                <div className="stat-card">
                    <div className="stat-card-icon purple">📦</div>
                    <div className="stat-card-info"><h3>สินค้าทั้งหมด</h3><div className="stat-value">{data.products.length}</div><div className="stat-sub">{formatNumber(data.totalItems)} ชิ้นในสต็อก</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon green">💰</div>
                    <div className="stat-card-info">
                        <h3>ยอดขายวันนี้</h3><div className="stat-value">{formatCurrency(data.todayRevenue)}</div>
                        <div className="stat-sub" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {data.trend > 0 ? <span style={{ color: 'var(--success)' }}>▲ {data.trend.toFixed(0)}%</span> : data.trend < 0 ? <span style={{ color: 'var(--danger)' }}>▼ {Math.abs(data.trend).toFixed(0)}%</span> : <span>— เท่าเดิม</span>}
                            <span> vs เมื่อวาน</span>
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon blue">🧠</div>
                    <div className="stat-card-info"><h3>กำไรวันนี้</h3><div className="stat-value" style={{ color: data.todayProfit > 0 ? 'var(--success)' : undefined }}>{formatCurrency(data.todayProfit)}</div><div className="stat-sub">{data.todaySales.length} รายการ</div></div>
                </div>
                <div className="stat-card" onClick={() => setShowTargetInput(!showTargetInput)} style={{ cursor: 'pointer' }}>
                    <div className="stat-card-icon orange">🎯</div>
                    <div className="stat-card-info"><h3>เป้าวันนี้</h3><div className="stat-value">{data.target > 0 ? formatCurrency(data.target) : 'ตั้งเป้า'}</div><div className="stat-sub">{data.target > 0 ? `${targetProgress.toFixed(0)}% สำเร็จ` : 'กดเพื่อตั้งเป้า'}</div></div>
                </div>
            </div>

            {showTargetInput && (
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', alignItems: 'center' }}>
                    <input className="form-control" type="number" min="0" value={targetInput} onChange={e => setTargetInput(e.target.value)} placeholder="ยอดเป้าหมาย (บาท)" style={{ width: '200px' }} autoFocus />
                    <button className="btn btn-primary btn-sm" onClick={handleSetTarget}>🎯 ตั้งเป้า</button>
                </div>
            )}

            {/* Charts */}
            <div className="dashboard-grid">
                <div className="chart-container">
                    <div className="chart-header"><h3>📈 ยอดขาย & กำไร 7 วัน</h3></div>
                    <div className="simple-chart">
                        {data.last7Days.map((day, i) => (
                            <div key={i} className="chart-bar">
                                <span className="bar-value">{day.revenue > 0 ? formatCurrency(day.revenue) : '-'}</span>
                                <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '100%', width: '100%', justifyContent: 'center' }}>
                                    <div className="bar" style={{ height: `${(day.revenue / maxRevenue) * 100}%`, maxWidth: '20px', background: 'var(--accent-gradient)' }} />
                                    <div className="bar" style={{ height: `${(day.profit / maxRevenue) * 100}%`, maxWidth: '20px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', opacity: 0.8 }} />
                                </div>
                                <span className="bar-label">{day.label}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-lg)', justifyContent: 'center', marginTop: 'var(--space-md)', fontSize: 'var(--font-size-xs)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-gradient)', display: 'inline-block' }} /> ยอดขาย</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'inline-block' }} /> กำไร</span>
                    </div>
                </div>

                <div className="chart-container">
                    <div className="chart-header"><h3>🏆 สินค้าขายดี</h3><span className="badge badge-purple">30 วัน</span></div>
                    {data.topProducts.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>ยังไม่มีข้อมูล</div> : (
                        <div className="low-stock-list">
                            {data.topProducts.map((p, i) => (
                                <div key={p.id} className="low-stock-item">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <span style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: i === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : i === 1 ? 'linear-gradient(135deg, #94a3b8, #64748b)' : i === 2 ? 'linear-gradient(135deg, #b45309, #92400e)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 800, color: 'white' }}>{i + 1}</span>
                                        <div><div className="item-name">{p.name}</div><div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>ขายได้ {p.qty} ชิ้น</div></div>
                                    </div>
                                    <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 'var(--font-size-sm)' }}>{formatCurrency(p.revenue)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Row 2: Low Stock + Expiring */}
            <div className="dashboard-grid" style={{ marginTop: 'var(--space-lg)' }}>
                <div className="chart-container">
                    <div className="chart-header"><h3>⚠️ สินค้าใกล้หมด</h3>{data.lowStock.length > 0 && <span className="badge badge-danger">{data.lowStock.length}</span>}</div>
                    {data.lowStock.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}><div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>สต็อกเพียงพอทุกรายการ</div> : (
                        <div className="low-stock-list">
                            {data.lowStock.map(p => (
                                <div key={p.id} className="low-stock-item"><div><div className="item-name">{p.emoji || '📦'} {p.name}</div><div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>ขั้นต่ำ: {p.minStock}</div></div><span className={`badge ${p.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>เหลือ {p.stock}</span></div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="chart-container">
                    <div className="chart-header"><h3>⏰ สินค้าใกล้หมดอายุ</h3>{data.expiring.length > 0 && <span className="badge badge-danger">{data.expiring.length}</span>}</div>
                    {data.expiring.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}><div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>ไม่มีสินค้าใกล้หมดอายุ</div> : (
                        <div className="low-stock-list">
                            {data.expiring.map((p, i) => (
                                <div key={i} className="low-stock-item"><div className="item-name">{p.emoji} {p.name}</div><span className="badge badge-danger">หมดอายุ {new Date(p.expDate).toLocaleDateString('th-TH')}</span></div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
