import { useState, useEffect } from 'react'
import { getProducts, getTransactions, getProfitReport, getTopProducts, getSlowProducts, getReorderSuggestions, predictNextWeekSales, getLast7DaysData, exportData, importData, formatCurrency, formatNumber } from '../lib/storage.js'
import { useToast } from '../App.jsx'

export default function Reports() {
    const [tab, setTab] = useState('profit')
    const [period, setPeriod] = useState(30)
    const toast = useToast()

    const [profitData, setProfitData] = useState(null)
    const [topProducts, setTopProducts] = useState([])
    const [slowProducts, setSlowProducts] = useState([])
    const [reorderSuggestions, setReorderSuggestions] = useState([])
    const [prediction, setPrediction] = useState(0)
    const [last7Days, setLast7Days] = useState([])

    useEffect(() => {
        setProfitData(getProfitReport(period))
        setTopProducts(getTopProducts(period, 10))
        setSlowProducts(getSlowProducts(7))
        setReorderSuggestions(getReorderSuggestions())
        setPrediction(predictNextWeekSales())
        setLast7Days(getLast7DaysData())
    }, [period])

    const handleExportBackup = () => {
        const data = exportData()
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `shopstock_backup_${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast('สำรองข้อมูลสำเร็จ 💾')
    }

    const handleImportBackup = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = (e) => {
            const file = e.target.files[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = (e) => {
                if (importData(e.target.result)) {
                    toast('กู้คืนข้อมูลสำเร็จ ✅')
                    window.location.reload()
                } else {
                    toast('ไฟล์ไม่ถูกต้อง', 'error')
                }
            }
            reader.readAsText(file)
        }
        input.click()
    }

    const tabs = [
        { key: 'profit', label: '💰 กำไร-ขาดทุน' },
        { key: 'ranking', label: '🏆 อันดับสินค้า' },
        { key: 'ai', label: '🧠 AI แนะนำ' },
        { key: 'backup', label: '💾 สำรองข้อมูล' },
    ]

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>📊 รายงาน & วิเคราะห์</h2>
                <p>ข้อมูลเชิงลึกสำหรับธุรกิจของคุณ</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '4px', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
                {tabs.map(t => (
                    <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t.key)} style={{ flex: 1, justifyContent: 'center', minWidth: '120px' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Period selector */}
            {tab !== 'backup' && (
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                    {[{ d: 7, l: '7 วัน' }, { d: 30, l: '30 วัน' }, { d: 90, l: '90 วัน' }].map(p => (
                        <button key={p.d} className={`btn btn-sm ${period === p.d ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPeriod(p.d)}>{p.l}</button>
                    ))}
                </div>
            )}

            {/* === Profit Tab === */}
            {tab === 'profit' && profitData && (
                <>
                    <div className="stat-cards">
                        <div className="stat-card">
                            <div className="stat-card-icon green">💵</div>
                            <div className="stat-card-info">
                                <h3>รายได้</h3>
                                <div className="stat-value">{formatCurrency(profitData.revenue)}</div>
                                <div className="stat-sub">{profitData.transactionCount} รายการขาย</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon red">📉</div>
                            <div className="stat-card-info">
                                <h3>ค่าใช้จ่ายรวม</h3>
                                <div className="stat-value">{formatCurrency(profitData.expenses || 0)}</div>
                                <div className="stat-sub">รวมต้นทุน & รายจ่าย</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon blue">🧠</div>
                            <div className="stat-card-info">
                                <h3>กำไรสุทธิ</h3>
                                <div className="stat-value" style={{ color: profitData.netProfit > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                    {formatCurrency(profitData.netProfit)}
                                </div>
                                <div className="stat-sub">Net Margin {profitData.netMargin.toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                        <div className="chart-container" style={{ padding: 'var(--space-md)' }}>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>ต้นทุนสินค้า (COGS)</div>
                            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{formatCurrency(profitData.costOfGoods)}</div>
                        </div>
                        <div className="chart-container" style={{ padding: 'var(--space-md)' }}>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>กำไรขั้นต้น (Gross)</div>
                            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(profitData.grossProfit)}</div>
                        </div>
                        <div className="chart-container" style={{ padding: 'var(--space-md)' }}>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>เงินที่ลงทุนซื้อของเพิ่ม</div>
                            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{formatCurrency(profitData.stockInvestment)}</div>
                        </div>
                    </div>

                    {/* Profit chart */}
                    <div className="chart-container" style={{ marginTop: 'var(--space-lg)' }}>
                        <div className="chart-header"><h3>📊 กำไรรายวัน</h3></div>
                        <div className="simple-chart">
                            {last7Days.map((day, i) => {
                                const maxVal = Math.max(...last7Days.map(d => d.profit), 1)
                                return (
                                    <div key={i} className="chart-bar">
                                        <span className="bar-value" style={{ color: day.profit > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                                            {day.profit > 0 ? formatCurrency(day.profit) : '-'}
                                        </span>
                                        <div className="bar" style={{
                                            height: `${(day.profit / maxVal) * 100}%`,
                                            background: day.profit > 0 ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'var(--border)',
                                        }} />
                                        <span className="bar-label">{day.label}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* === Ranking Tab === */}
            {tab === 'ranking' && (
                <div className="dashboard-grid">
                    <div className="chart-container">
                        <div className="chart-header">
                            <h3>🏆 สินค้าขายดี Top 10</h3>
                        </div>
                        {topProducts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>ยังไม่มีข้อมูล</div>
                        ) : (
                            <div className="low-stock-list">
                                {topProducts.map((p, i) => {
                                    const maxQty = topProducts[0]?.qty || 1
                                    return (
                                        <div key={p.id} className="low-stock-item" style={{ flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1 }}>
                                                <span style={{
                                                    width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
                                                    background: i === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : i === 1 ? 'linear-gradient(135deg, #94a3b8, #64748b)' : i === 2 ? 'linear-gradient(135deg, #b45309, #92400e)' : 'var(--bg-card)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 800, color: 'white', flexShrink: 0,
                                                }}>{i + 1}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div className="item-name">{p.name}</div>
                                                    <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginTop: '4px' }}>
                                                        <div style={{ height: '100%', borderRadius: '2px', width: `${(p.qty / maxQty) * 100}%`, background: 'var(--accent-gradient)' }} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.qty} ชิ้น</div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--success)' }}>{formatCurrency(p.revenue)}</div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="chart-container">
                        <div className="chart-header">
                            <h3>🐌 สินค้าไม่เคลื่อนไหว</h3>
                            <span className="badge badge-info">7 วัน</span>
                        </div>
                        {slowProducts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎯</div>
                                ทุกสินค้ามียอดขาย
                            </div>
                        ) : (
                            <div className="low-stock-list">
                                {slowProducts.map(p => (
                                    <div key={p.id} className="low-stock-item">
                                        <div className="item-name">{p.emoji || '📦'} {p.name}</div>
                                        <div>
                                            <span className="badge badge-warning">สต็อก {p.stock}</span>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                                ค้าง {formatCurrency(p.stock * p.costPrice)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* === AI Tab === */}
            {tab === 'ai' && (
                <>
                    {/* Prediction */}
                    <div className="chart-container" style={{ marginBottom: 'var(--space-lg)' }}>
                        <div className="chart-header">
                            <h3>🔮 พยากรณ์ยอดขาย</h3>
                            <span className="badge badge-purple">AI</span>
                        </div>
                        <div style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-sm)' }}>🧠</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                                คาดการณ์จากข้อมูลย้อนหลัง 14 วัน (Weighted Moving Average)
                            </div>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--accent-primary-hover)' }}>
                                {formatCurrency(prediction)}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>ยอดขายที่คาดว่าจะได้ใน 7 วันข้างหน้า</div>
                        </div>
                    </div>

                    {/* Reorder Suggestions */}
                    <div className="chart-container">
                        <div className="chart-header">
                            <h3>🛍️ แนะนำสั่งซื้อ</h3>
                            <span className="badge badge-purple">AI</span>
                        </div>
                        {reorderSuggestions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                                สต็อกเพียงพอสำหรับ 2 สัปดาห์ข้างหน้า
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>สินค้า</th>
                                        <th>สต็อก</th>
                                        <th>ขายเฉลี่ย/วัน</th>
                                        <th>จะหมดใน</th>
                                        <th>แนะนำสั่ง</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reorderSuggestions.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.emoji || '📦'} {p.name}</td>
                                            <td>{p.stock}</td>
                                            <td>{p.avgDailySales} ชิ้น</td>
                                            <td style={{
                                                fontWeight: 700,
                                                color: p.urgency === 'critical' ? 'var(--danger)' : p.urgency === 'warning' ? 'var(--warning)' : 'var(--text-primary)',
                                            }}>
                                                {p.daysUntilEmpty === 999 ? '∞' : `${p.daysUntilEmpty} วัน`}
                                            </td>
                                            <td style={{ fontWeight: 800, color: 'var(--accent-primary-hover)' }}>
                                                {p.suggestedOrder} ชิ้น
                                            </td>
                                            <td>
                                                <span className={`badge ${p.urgency === 'critical' ? 'badge-danger' : p.urgency === 'warning' ? 'badge-warning' : 'badge-success'}`}>
                                                    {p.urgency === 'critical' ? '🚨 ด่วน' : p.urgency === 'warning' ? '⚠️ เตือน' : '✅ ปกติ'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <div style={{ padding: 'var(--space-md)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                            💡 คำนวณจากยอดขายเฉลี่ย 30 วัน + buffer สต็อก 2 สัปดาห์
                        </div>
                    </div>
                </>
            )}

            {/* === Backup Tab === */}
            {tab === 'backup' && (
                <div className="chart-container">
                    <div className="chart-header"><h3>💾 สำรองและกู้คืนข้อมูล</h3></div>
                    <div style={{ padding: 'var(--space-lg)' }}>
                        <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
                            ข้อมูลทั้งหมดถูกเก็บในเบราว์เซอร์ของคุณ (localStorage) สำรองข้อมูลเพื่อป้องกันการสูญหาย
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                            <button className="btn btn-primary btn-lg" onClick={handleExportBackup}>
                                📤 สำรองข้อมูล (Export JSON)
                            </button>
                            <button className="btn btn-secondary btn-lg" onClick={handleImportBackup}>
                                📥 กู้คืนข้อมูล (Import JSON)
                            </button>
                        </div>
                        <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
                            <div style={{ fontWeight: 700, marginBottom: 'var(--space-sm)' }}>📊 ข้อมูลปัจจุบัน</div>
                            <div>📦 สินค้า: {getProducts().length} รายการ</div>
                            <div>📋 รายการซื้อขาย: {formatNumber(getTransactions().length)} รายการ</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
