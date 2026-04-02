import { useState, useEffect } from 'react'
import { getProducts, getTransactions, getTodaySales, getLowStockProducts, getTotalStockValue, getTotalRetailValue, formatCurrency, formatNumber, formatDate, getTodayRevenue, getTodayProfit, getTodayExpenses, getRevenueTrend, getTopProducts, getSlowProducts, getLast7DaysData, getTodayTarget, setDailyTarget, getWeekComparison, getExpiringProducts, getNotifications } from '../lib/storage.js'
import { useToast, useAuth } from '../App.jsx'
import { canSeeProfit, canAccessPage } from '../lib/permissions.js'
import { Link } from 'react-router-dom'
import AIAssistant from '../components/AIAssistant.jsx'

export default function Dashboard() {
    const [data, setData] = useState(null)
    const [targetInput, setTargetInput] = useState('')
    const [showTargetInput, setShowTargetInput] = useState(false)
    const toast = useToast()
    const { user } = useAuth()
    const role = user?.role || 'staff'

    const loadData = () => {
        const products = getProducts()
        const todaySales = getTodaySales()
        const todayRevenue = getTodayRevenue()
        const todayProfit = getTodayProfit()
        const todayExpenses = getTodayExpenses()
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
        const recentActivity = getTransactions().slice(0, 8)

        setData({ products, todaySales, todayRevenue, todayProfit, todayExpenses, trend, lowStock, stockValue, retailValue, topProducts, slowProducts, last7Days, totalItems, target, weekComp, expiring, notifs, recentActivity })
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
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2>📊 แดชบอร์ด</h2>
                    <p>ภาพรวมแบบ Real-time • อัพเดตทุก 15 วินาที</p>
                </div>
                {canAccessPage(role, '/settings') && (
                    <button className="btn btn-ghost btn-sm animate-bounce-subtle" onClick={() => {
                        setTargetInput(data.target || '')
                        setShowTargetInput(!showTargetInput)
                    }} style={{ whiteSpace: 'nowrap' }}>
                        🎯 {data.target > 0 ? 'แก้เป้า' : 'ตั้งเป้ายอดขาย'}
                    </button>
                )}
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
                <div className="chart-container" style={{
                    marginBottom: 'var(--space-lg)',
                    padding: 'var(--space-md) var(--space-lg)',
                    background: 'var(--accent-gradient)',
                    color: 'white',
                    border: 'none',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Subtle background decoration */}
                    <div style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '5rem', opacity: 0.1, pointerEvents: 'none' }}>🎯</div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)', position: 'relative', zIndex: 1 }}>
                        <span style={{ fontWeight: 800 }}>🎯 เป้าหมายวันนี้</span>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>
                                {formatCurrency(data.todayRevenue)} / {formatCurrency(data.target)}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.9 }}>
                                {targetProgress >= 100 ? '🚀 ทะลุเป้าแล้ว!' : `เหลืออีก ${formatCurrency(data.target - data.todayRevenue)}`}
                            </div>
                        </div>
                    </div>
                    <div style={{ height: '12px', background: 'rgba(255,255,255,0.2)', borderRadius: '6px', overflow: 'hidden', position: 'relative', zIndex: 1, border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{
                            height: '100%',
                            width: `${targetProgress}%`,
                            background: 'white',
                            boxShadow: '0 0 15px rgba(255,255,255,0.5)',
                            borderRadius: '6px',
                            transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }} />
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
                {canSeeProfit(role) && <div className="stat-card">
                    <div className="stat-card-icon blue">🧠</div>
                    <div className="stat-card-info">
                        <h3>กำไรสุทธิวันนี้</h3>
                        <div className="stat-value" style={{ color: data.todayProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(data.todayProfit)}</div>
                        <div className="stat-sub">{data.todaySales.length} รายการ</div>
                    </div>
                </div>}
                {canSeeProfit(role) && <div className="stat-card" style={{ cursor: 'pointer' }}>
                    <div className="stat-card-icon red">📉</div>
                    <div className="stat-card-info" onClick={() => window.location.href = '/expenses'}>
                        <h3>รายจ่ายวันนี้</h3>
                        <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(data.todayExpenses)}</div>
                        <div className="stat-sub">จิ้มเพื่อดูรายละเอียด</div>
                    </div>
                </div>}
                {!canSeeProfit(role) && <div className="stat-card">
                    <div className="stat-card-icon blue">🧾</div>
                    <div className="stat-card-info">
                        <h3>บิลวันนี้</h3>
                        <div className="stat-value">{data.todaySales.length}</div>
                        <div className="stat-sub">รายการ</div>
                    </div>
                </div>}
            </div>

            {showTargetInput && (
                <div className="chart-container animate-in" style={{ marginBottom: 'var(--space-lg)', border: '1px solid var(--accent-primary)' }}>
                    <div className="chart-header"><h3>{data.target > 0 ? '🎯 แก้ไขเป้าหมาย' : '🎯 ตั้งเป้าหมายใหม่'}</h3></div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                        <input className="form-control" type="number" min="0" value={targetInput} onChange={e => setTargetInput(e.target.value)} placeholder="ยอดเป้าหมาย (บาท)" style={{ flex: 1 }} autoFocus />
                        <button className="btn btn-primary" onClick={handleSetTarget}>บันทึก</button>
                        <button className="btn btn-ghost" onClick={() => setShowTargetInput(false)}>ยกเลิก</button>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
                {[
                    { to: '/stock-out', icon: '🛒', label: 'ขายสินค้า', color: 'var(--success)' },
                    { to: '/stock-in', icon: '📥', label: 'รับเข้าสต็อก', color: 'var(--info)' },
                    { to: '/expenses', icon: '📉', label: 'บันทึกรายจ่าย', color: 'var(--danger)', admin: true },
                    { to: '/history', icon: '📋', label: 'ดูประวัติ', color: 'var(--warning)' },
                    { to: '/reports', icon: '🧠', label: 'รายงาน & AI', color: 'var(--accent-primary)', admin: true },
                ].filter(a => !a.admin || canAccessPage(role, a.to)).map(a => (
                    <Link key={a.to} to={a.to} style={{ textDecoration: 'none', flex: '1 1 120px', minWidth: '100px' }}>
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', textAlign: 'center', transition: 'all 0.15s', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = a.color}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                            <div style={{ fontSize: '1.4rem' }}>{a.icon}</div>
                            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{a.label}</div>
                        </div>
                    </Link>
                ))}
            </div>

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

            {/* Week Comparison */}
            {canSeeProfit(role) && data.weekComp && (
                <div className="chart-container" style={{ marginTop: 'var(--space-lg)' }}>
                    <div className="chart-header">
                        <h3>📊 เปรียบเทียบสัปดาห์</h3>
                        <span className="badge badge-info">สัปดาห์นี้ vs สัปดาห์ก่อน</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>วัน</th>
                                    {data.weekComp.thisWeek.map((d, i) => (
                                        <th key={i} style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)' }}>{d.label}</th>
                                    ))}
                                    <th style={{ textAlign: 'center', fontWeight: 800 }}>รวม</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>สัปดาห์นี้</td>
                                    {data.weekComp.thisWeek.map((d, i) => (
                                        <td key={i} style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{d.revenue > 0 ? formatCurrency(d.revenue) : '-'}</td>
                                    ))}
                                    <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--accent-primary-hover)' }}>{formatCurrency(data.weekComp.thisWeek.reduce((s, d) => s + d.revenue, 0))}</td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>สัปดาห์ก่อน</td>
                                    {data.weekComp.lastWeek.map((d, i) => (
                                        <td key={i} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{d.revenue > 0 ? formatCurrency(d.revenue) : '-'}</td>
                                    ))}
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>{formatCurrency(data.weekComp.lastWeek.reduce((s, d) => s + d.revenue, 0))}</td>
                                </tr>
                                <tr style={{ borderTop: '2px solid var(--border)' }}>
                                    <td style={{ fontWeight: 700 }}>ผลต่าง</td>
                                    {data.weekComp.thisWeek.map((d, i) => {
                                        const diff = d.revenue - data.weekComp.lastWeek[i].revenue
                                        return (
                                            <td key={i} style={{ textAlign: 'center', fontWeight: 700, color: diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                                {diff === 0 ? '-' : (diff > 0 ? '+' : '') + formatCurrency(diff)}
                                            </td>
                                        )
                                    })}
                                    {(() => {
                                        const totalDiff = data.weekComp.thisWeek.reduce((s, d) => s + d.revenue, 0) - data.weekComp.lastWeek.reduce((s, d) => s + d.revenue, 0)
                                        return (
                                            <td style={{ textAlign: 'center', fontWeight: 800, color: totalDiff > 0 ? 'var(--success)' : totalDiff < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                                {totalDiff === 0 ? '-' : (totalDiff > 0 ? '+' : '') + formatCurrency(totalDiff)}
                                            </td>
                                        )
                                    })()}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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

            {/* AI Assistant */}
            <div style={{ marginTop: 'var(--space-lg)' }}>
                <AIAssistant />
            </div>

            {/* Activity Log */}
            <div className="chart-container" style={{ marginTop: 'var(--space-lg)' }}>
                <div className="chart-header">
                    <h3>📝 Activity Log</h3>
                    <span className="badge badge-info">{data.recentActivity.length} ล่าสุด</span>
                </div>
                {data.recentActivity.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>ยังไม่มีกิจกรรม
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {data.recentActivity.map(tx => {
                            const icon = tx.type === 'in' ? '📥' : tx.type === 'refund' ? '↩️' : '🛒'
                            const label = tx.type === 'in' ? 'รับเข้า' : tx.type === 'refund' ? 'คืนสินค้า' : 'ขาย'
                            const color = tx.type === 'in' ? 'var(--info)' : tx.type === 'refund' ? 'var(--warning)' : 'var(--success)'
                            const itemsSummary = tx.items?.map(i => `${i.name || i.productId} ×${i.qty}`).join(', ')
                            return (
                                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: '8px var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
                                    <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span className="badge" style={{ background: `${color}20`, color }}>{label}</span>
                                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{tx.staffName || 'System'}</span>
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemsSummary}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{formatCurrency(tx.total)}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatDate(tx.date)}</div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
