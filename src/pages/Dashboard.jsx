import { useState, useEffect } from 'react'
import { getProducts, getTransactions, getTodaySales, getLowStockProducts, getTotalStockValue, getTotalRetailValue, formatCurrency, formatNumber, formatDate, getTodayRevenue, getTodayProfit, getTodayExpenses, getRevenueTrend, getTopProducts, getSlowProducts, getLast7DaysData, getTodayTarget, setDailyTarget, getWeekComparison, getExpiringProducts, getNotifications, getCustomers, getCustomerTier, getCoupons } from '../lib/storage.js'
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
        const allCustomers = getCustomers()
        const topMembers = [...allCustomers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 5)
        const todayStr = new Date().toDateString()
        const newMembersToday = allCustomers.filter(c => c.createdAt && new Date(c.createdAt).toDateString() === todayStr).length
        const hourlyData = (() => {
            const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i.toString().padStart(2, '0')}:00`, revenue: 0, count: 0 }))
            getTodaySales().forEach(tx => {
                const h = new Date(tx.createdAt).getHours()
                hours[h].revenue += tx.total
                hours[h].count++
            })
            return hours.filter(h => h.revenue > 0 || h.count > 0)
        })()

        const paymentBreakdown = (() => {
            const methods = { cash: 0, transfer: 0, qr: 0, split: 0 }
            todaySales.forEach(tx => { methods[tx.paymentMethod || 'cash'] = (methods[tx.paymentMethod || 'cash'] || 0) + tx.total })
            return methods
        })()

        const coupons = getCoupons()
        const activeCoupons = coupons.filter(c => c.active)
        const now = new Date()
        const in7days = new Date(); in7days.setDate(in7days.getDate() + 7)
        const expiringCoupons = activeCoupons.filter(c => c.expiresAt && new Date(c.expiresAt) > now && new Date(c.expiresAt) <= in7days)
        const expiredCoupons = coupons.filter(c => c.expiresAt && new Date(c.expiresAt) < now && c.active)
        const couponAlerts = { active: activeCoupons.length, expiring: expiringCoupons, expired: expiredCoupons }

        setData({ products, todaySales, todayRevenue, todayProfit, todayExpenses, trend, lowStock, stockValue, retailValue, topProducts, slowProducts, last7Days, totalItems, target, weekComp, expiring, notifs, recentActivity, topMembers, newMembersToday, hourlyData, paymentBreakdown, couponAlerts })
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
                {data.newMembersToday > 0 && (
                    <div className="stat-card">
                        <div className="stat-card-icon orange">🆕</div>
                        <div className="stat-card-info">
                            <h3>สมาชิกใหม่วันนี้</h3>
                            <div className="stat-value">{data.newMembersToday}</div>
                            <div className="stat-sub">คนสมัครใหม่</div>
                        </div>
                    </div>
                )}
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
                    {/* Visual Bar Chart */}
                    {(() => {
                        const maxVal = Math.max(...data.weekComp.thisWeek.map(d => d.revenue), ...data.weekComp.lastWeek.map(d => d.revenue), 1)
                        const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
                        return (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginTop: 'var(--space-md)', height: '120px', padding: '0 var(--space-sm)' }}>
                                {data.weekComp.thisWeek.map((d, i) => {
                                    const twH = maxVal > 0 ? (d.revenue / maxVal) * 100 : 0
                                    const lwH = maxVal > 0 ? (data.weekComp.lastWeek[i].revenue / maxVal) * 100 : 0
                                    const dayIdx = new Date(new Date().setDate(new Date().getDate() - (6 - i))).getDay()
                                    return (
                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%', justifyContent: 'flex-end' }}>
                                            <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', width: '100%', justifyContent: 'center', flex: 1 }}>
                                                <div style={{ width: '40%', background: 'var(--accent-primary)', borderRadius: '3px 3px 0 0', height: `${Math.max(twH, 2)}%`, transition: 'height 0.5s', opacity: 0.85 }} title={`สัปดาห์นี้: ${formatCurrency(d.revenue)}`} />
                                                <div style={{ width: '40%', background: 'var(--text-muted)', borderRadius: '3px 3px 0 0', height: `${Math.max(lwH, 2)}%`, transition: 'height 0.5s', opacity: 0.4 }} title={`สัปดาห์ก่อน: ${formatCurrency(data.weekComp.lastWeek[i].revenue)}`} />
                                            </div>
                                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>{days[dayIdx]}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })()}
                    <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', marginTop: 'var(--space-sm)', fontSize: '10px', color: 'var(--text-muted)' }}>
                        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'var(--accent-primary)', borderRadius: '2px', opacity: 0.85, marginRight: '4px' }} />สัปดาห์นี้</span>
                        <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'var(--text-muted)', borderRadius: '2px', opacity: 0.4, marginRight: '4px' }} />สัปดาห์ก่อน</span>
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

            {/* Top Members + Hourly Sales */}
            <div className="dashboard-grid" style={{ marginTop: 'var(--space-lg)' }}>
                <div className="chart-container">
                    <div className="chart-header"><h3>👑 สมาชิก Top 5</h3><Link to="/customers" className="badge badge-purple" style={{ textDecoration: 'none' }}>ดูทั้งหมด →</Link></div>
                    {data.topMembers.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}><div style={{ fontSize: '2rem', marginBottom: '8px' }}>👥</div>ยังไม่มีสมาชิก</div> : (
                        <div className="low-stock-list">
                            {data.topMembers.map((c, i) => {
                                const tier = getCustomerTier(c)
                                return (
                                    <div key={c.id} className="low-stock-item">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <span style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: `linear-gradient(135deg, ${tier.color}, ${tier.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 800, color: 'white' }}>{i + 1}</span>
                                            <div>
                                                <div className="item-name">{tier.emoji} {c.name}</div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                                    <span style={{ color: tier.color, fontWeight: 700 }}>{tier.label}</span> • 🪙 {(c.points || 0).toLocaleString()} pt • {c.visitCount || 0} ครั้ง
                                                </div>
                                            </div>
                                        </div>
                                        <span style={{ fontWeight: 800, color: 'var(--accent-primary-hover)', whiteSpace: 'nowrap' }}>{formatCurrency(c.totalSpent || 0)}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="chart-container">
                    <div className="chart-header"><h3>⏰ ยอดขายรายชั่วโมง</h3><span className="badge badge-info">วันนี้</span></div>
                    {data.hourlyData.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}><div style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>ยังไม่มียอดขายวันนี้</div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {data.hourlyData.map(h => {
                                const maxRev = Math.max(...data.hourlyData.map(x => x.revenue))
                                const pct = maxRev > 0 ? (h.revenue / maxRev) * 100 : 0
                                return (
                                    <div key={h.hour} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)' }}>
                                        <span style={{ width: '42px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', fontWeight: 600, flexShrink: 0 }}>{h.hour}</span>
                                        <div style={{ flex: 1, height: '18px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-primary-hover))', borderRadius: '4px', width: `${pct}%`, transition: 'width 0.5s' }} />
                                        </div>
                                        <span style={{ width: '70px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--font-size-xs)', flexShrink: 0 }}>{formatCurrency(h.revenue)}</span>
                                        <span style={{ width: '32px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '10px', flexShrink: 0 }}>{h.count}x</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Breakdown */}
            {data.todayRevenue > 0 && (
                <div className="chart-container" style={{ marginBottom: 'var(--space-lg)' }}>
                    <div className="chart-header"><h3>💳 ช่องทางชำระเงินวันนี้</h3><span className="badge badge-info">{data.todaySales.length} รายการ</span></div>
                    <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Donut visual */}
                        <div style={{ position: 'relative', width: '140px', height: '140px', flexShrink: 0 }}>
                            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                {(() => {
                                    const total = data.todayRevenue || 1
                                    const methods = [
                                        { key: 'cash', color: '#4ade80', value: data.paymentBreakdown.cash },
                                        { key: 'transfer', color: '#60a5fa', value: data.paymentBreakdown.transfer },
                                        { key: 'qr', color: '#f59e0b', value: data.paymentBreakdown.qr },
                                        { key: 'split', color: '#a78bfa', value: data.paymentBreakdown.split },
                                    ].filter(m => m.value > 0)
                                    let offset = 0
                                    return methods.map(m => {
                                        const pct = (m.value / total) * 100
                                        const el = <circle key={m.key} cx="18" cy="18" r="15.915" fill="none" stroke={m.color} strokeWidth="3.5" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={-offset} />
                                        offset += pct
                                        return el
                                    })
                                })()}
                            </svg>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(data.todayRevenue)}</div>
                                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>ยอดวันนี้</div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                            {[
                                { key: 'cash', label: '💵 เงินสด', color: '#4ade80', value: data.paymentBreakdown.cash },
                                { key: 'transfer', label: '📱 โอนเงิน', color: '#60a5fa', value: data.paymentBreakdown.transfer },
                                { key: 'qr', label: '📲 QR Code', color: '#f59e0b', value: data.paymentBreakdown.qr },
                                { key: 'split', label: '🌗 ผสม', color: '#a78bfa', value: data.paymentBreakdown.split },
                            ].filter(m => m.value > 0).map(m => {
                                const pct = data.todayRevenue > 0 ? (m.value / data.todayRevenue) * 100 : 0
                                return (
                                    <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: m.color, flexShrink: 0 }} />
                                        <span style={{ flex: 1, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{m.label}</span>
                                        <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>{formatCurrency(m.value)}</span>
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', width: '40px', textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Coupon Alerts */}
            {(data.couponAlerts.expiring.length > 0 || data.couponAlerts.expired.length > 0) && (
                <div className="chart-container" style={{ marginBottom: 'var(--space-lg)' }}>
                    <div className="chart-header"><h3>🎫 แจ้งเตือนคูปอง</h3><span className="badge badge-purple">{data.couponAlerts.active} ใช้งานอยู่</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {data.couponAlerts.expired.length > 0 && (
                            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>⛔ คูปองหมดอายุแล้ว (ยังเปิดอยู่)</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {data.couponAlerts.expired.map(c => (
                                        <span key={c.id} style={{ padding: '3px 10px', background: 'rgba(248,113,113,0.15)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: '#f87171' }}>{c.code}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {data.couponAlerts.expiring.length > 0 && (
                            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>⚠️ คูปองจะหมดอายุใน 7 วัน</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {data.couponAlerts.expiring.map(c => (
                                        <span key={c.id} style={{ padding: '3px 10px', background: 'rgba(245,158,11,0.15)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: '#f59e0b' }}>
                                            {c.code} ({new Date(c.expiresAt).toLocaleDateString('th-TH')})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
