import { useState, useEffect } from 'react'
import { getProducts, getTransactions, getProfitReport, getTopProducts, getSlowProducts, getReorderSuggestions, predictNextWeekSales, getLast7DaysData, exportData, importData, exportCSV, formatCurrency, formatNumber, fetchCloudDailySummary, getTaxSummary, exportTaxCSV, getSettings, EXPENSE_CATEGORIES, getCustomers, getCustomerTier, MEMBERSHIP_TIERS } from '../lib/storage.js'
import { useToast } from '../App.jsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

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
    const [cloudSummary, setCloudSummary] = useState(null)
    const [loadingCloud, setLoadingCloud] = useState(false)
    const [taxYear, setTaxYear] = useState(new Date().getFullYear())
    const [taxMonth, setTaxMonth] = useState(0)
    const [taxData, setTaxData] = useState(null)

    useEffect(() => {
        setProfitData(getProfitReport(period))
        setTopProducts(getTopProducts(period, 10))
        setSlowProducts(getSlowProducts(7))
        setReorderSuggestions(getReorderSuggestions())
        setPrediction(predictNextWeekSales())
        setLast7Days(getLast7DaysData())
    }, [period])

    useEffect(() => {
        if (tab === 'cloud') {
            loadCloudSummary()
        }
        if (tab === 'tax') {
            setTaxData(getTaxSummary(taxYear, taxMonth))
        }
    }, [tab, period, taxYear, taxMonth])

    const loadCloudSummary = async () => {
        setLoadingCloud(true)
        const data = await fetchCloudDailySummary(period)
        if (data) setCloudSummary(data)
        setLoadingCloud(false)
    }


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
        { key: 'members', label: '👥 สมาชิก' },
        { key: 'ai', label: '🧠 AI แนะนำ' },
        { key: 'tax', label: '🏛️ สรุปภาษี' },
        { key: 'cloud', label: '☁️ สรุป Cloud' },
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
                    {tab === 'cloud' && (
                        <button className="btn btn-sm btn-ghost" onClick={loadCloudSummary} disabled={loadingCloud}>
                            {loadingCloud ? '⏳ กำลังโหลด...' : '🔄 รีเฟรชข้อมูล'}
                        </button>
                    )}
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

                    {/* Payment methods breakdown */}
                    {profitData.revenueByMethod && (
                    <div className="chart-container" style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)' }}>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>💳 สรุปยอดตามช่องทางชำระเงิน</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)' }}>
                            <div style={{ padding: 'var(--space-sm)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>💵 เงินสด</div>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(profitData.revenueByMethod.cash)}</div>
                            </div>
                            <div style={{ padding: 'var(--space-sm)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>📱 โอนเงิน (Transfer)</div>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{formatCurrency(profitData.revenueByMethod.transfer)}</div>
                            </div>
                            <div style={{ padding: 'var(--space-sm)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>🏷️ จ่ายผ่าน QR</div>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(profitData.revenueByMethod.qr)}</div>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Profit chart */}
                    <div className="chart-container" style={{ marginTop: 'var(--space-lg)' }}>
                        <div className="chart-header"><h3>📊 กำไรรายวัน (7 วันย้อนหลัง)</h3></div>
                        <div style={{ width: '100%', height: '300px', marginTop: 'var(--space-md)' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={last7Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                                    <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => formatCurrency(value).replace('฿', '')} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                                        formatter={(value, name) => [formatCurrency(value), name === 'profit' ? 'กำไรขั้นต้น' : name === 'expenses' ? 'รายจ่าย' : 'รายได้']}
                                        labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '4px' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                    <Bar dataKey="revenue" name="รายได้" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="profit" name="กำไรขั้นต้น" fill="var(--success)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expenses" name="รายจ่าย" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
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

            {/* === Members Tab === */}
            {tab === 'members' && (() => {
                const customers = getCustomers()
                const tierStats = MEMBERSHIP_TIERS.map(t => {
                    const members = customers.filter(c => getCustomerTier(c).key === t.key)
                    return { ...t, count: members.length, totalSpent: members.reduce((s, c) => s + (c.totalSpent || 0), 0), totalPoints: members.reduce((s, c) => s + (c.points || 0), 0) }
                })
                const totalMembers = customers.length
                const totalSpentAll = customers.reduce((s, c) => s + (c.totalSpent || 0), 0)
                const totalPointsAll = customers.reduce((s, c) => s + (c.points || 0), 0)
                const avgSpent = totalMembers > 0 ? totalSpentAll / totalMembers : 0
                const topBySpent = [...customers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 10)
                const topByPoints = [...customers].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10)

                const exportCustomerCSV = () => {
                    const header = 'ชื่อ,เบอร์โทร,ระดับ,ยอดซื้อสะสม,คะแนน,จำนวนครั้ง,วันที่สมัคร\n'
                    const rows = customers.map(c => {
                        const t = getCustomerTier(c)
                        return `"${c.name}","${c.phone || ''}","${t.label}",${c.totalSpent || 0},${c.points || 0},${c.visitCount || 0},"${c.createdAt ? new Date(c.createdAt).toLocaleDateString('th-TH') : ''}"`
                    }).join('\n')
                    const bom = '\uFEFF'
                    const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url; a.download = `shopstock_members_${new Date().toISOString().split('T')[0]}.csv`; a.click()
                    URL.revokeObjectURL(url)
                    toast('ดาวน์โหลด CSV สมาชิกสำเร็จ 📁')
                }

                return (
                    <>
                        {/* Summary Cards */}
                        <div className="stat-cards" style={{ marginBottom: 'var(--space-lg)' }}>
                            <div className="stat-card mini"><div className="stat-card-icon blue">👥</div><div className="stat-card-info"><h3>สมาชิกทั้งหมด</h3><div className="stat-value" style={{ fontSize: 'var(--font-size-lg)' }}>{totalMembers} คน</div></div></div>
                            <div className="stat-card mini"><div className="stat-card-icon green">💰</div><div className="stat-card-info"><h3>ยอดซื้อสะสมรวม</h3><div className="stat-value" style={{ fontSize: 'var(--font-size-lg)' }}>{formatCurrency(totalSpentAll)}</div></div></div>
                            <div className="stat-card mini"><div className="stat-card-icon orange">🪙</div><div className="stat-card-info"><h3>คะแนนสะสมรวม</h3><div className="stat-value" style={{ fontSize: 'var(--font-size-lg)' }}>{totalPointsAll.toLocaleString()} pt</div></div></div>
                            <div className="stat-card mini"><div className="stat-card-icon purple">📊</div><div className="stat-card-info"><h3>ค่าเฉลี่ยต่อคน</h3><div className="stat-value" style={{ fontSize: 'var(--font-size-lg)' }}>{formatCurrency(avgSpent)}</div></div></div>
                        </div>

                        {/* Tier Distribution */}
                        <div className="dashboard-grid" style={{ marginBottom: 'var(--space-lg)' }}>
                            <div className="chart-container">
                                <div className="chart-header"><h3>🏆 สมาชิกตาม Tier</h3><button className="btn btn-secondary btn-sm" onClick={exportCustomerCSV}>📁 Export CSV สมาชิก</button></div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {tierStats.map(t => {
                                        const pct = totalMembers > 0 ? (t.count / totalMembers) * 100 : 0
                                        return (
                                            <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ width: '100px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>
                                                    <span style={{ fontSize: '1.2rem' }}>{t.emoji}</span>
                                                    <span style={{ color: t.color }}>{t.label}</span>
                                                </span>
                                                <div style={{ flex: 1, height: '24px', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                                                    <div style={{ height: '100%', background: `linear-gradient(90deg, ${t.color}cc, ${t.color}88)`, width: `${Math.max(pct, 2)}%`, borderRadius: '6px', transition: 'width 0.5s' }} />
                                                    <span style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: pct > 20 ? 'white' : 'var(--text-primary)' }}>{t.count} คน ({pct.toFixed(0)}%)</span>
                                                </div>
                                                <span style={{ width: '90px', textAlign: 'right', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{formatCurrency(t.totalSpent)}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="chart-container">
                                <div className="chart-header"><h3>🪙 คะแนนสะสมตาม Tier</h3></div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {tierStats.map(t => {
                                        const pct = totalPointsAll > 0 ? (t.totalPoints / totalPointsAll) * 100 : 0
                                        return (
                                            <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ width: '100px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>
                                                    <span style={{ fontSize: '1.2rem' }}>{t.emoji}</span>
                                                    <span style={{ color: t.color }}>{t.label}</span>
                                                </span>
                                                <div style={{ flex: 1, height: '24px', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                                                    <div style={{ height: '100%', background: `linear-gradient(90deg, ${t.color}cc, ${t.color}88)`, width: `${Math.max(pct, 2)}%`, borderRadius: '6px', transition: 'width 0.5s' }} />
                                                    <span style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: pct > 20 ? 'white' : 'var(--text-primary)' }}>{t.totalPoints.toLocaleString()} pt</span>
                                                </div>
                                                <span style={{ width: '60px', textAlign: 'right', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{pct.toFixed(0)}%</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Top Members Tables */}
                        <div className="dashboard-grid">
                            <div className="chart-container">
                                <div className="chart-header"><h3>💰 Top 10 ยอดซื้อ</h3></div>
                                {topBySpent.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>ยังไม่มีข้อมูล</div> : (
                                    <div className="low-stock-list">
                                        {topBySpent.map((c, i) => {
                                            const t = getCustomerTier(c)
                                            return (
                                                <div key={c.id} className="low-stock-item">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ width: '22px', height: '22px', borderRadius: '4px', background: `linear-gradient(135deg, ${t.color}, ${t.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'white' }}>{i + 1}</span>
                                                        <div>
                                                            <div className="item-name" style={{ fontSize: 'var(--font-size-xs)' }}>{t.emoji} {c.name}</div>
                                                            <div style={{ fontSize: '10px', color: t.color, fontWeight: 600 }}>{t.label} • {c.visitCount || 0} ครั้ง</div>
                                                        </div>
                                                    </div>
                                                    <span style={{ fontWeight: 800, color: 'var(--accent-primary-hover)', fontSize: 'var(--font-size-xs)' }}>{formatCurrency(c.totalSpent || 0)}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="chart-container">
                                <div className="chart-header"><h3>🪙 Top 10 คะแนน</h3></div>
                                {topByPoints.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>ยังไม่มีข้อมูล</div> : (
                                    <div className="low-stock-list">
                                        {topByPoints.map((c, i) => {
                                            const t = getCustomerTier(c)
                                            return (
                                                <div key={c.id} className="low-stock-item">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ width: '22px', height: '22px', borderRadius: '4px', background: `linear-gradient(135deg, ${t.color}, ${t.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'white' }}>{i + 1}</span>
                                                        <div>
                                                            <div className="item-name" style={{ fontSize: 'var(--font-size-xs)' }}>{t.emoji} {c.name}</div>
                                                            <div style={{ fontSize: '10px', color: t.color, fontWeight: 600 }}>{t.label} • ยอดซื้อ {formatCurrency(c.totalSpent || 0)}</div>
                                                        </div>
                                                    </div>
                                                    <span style={{ fontWeight: 800, color: 'var(--accent-primary-hover)', fontSize: 'var(--font-size-xs)' }}>🪙 {(c.points || 0).toLocaleString()} pt</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )
            })()}

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

            {/* === Tax Summary Tab === */}
            {tab === 'tax' && (
                <>
                    {/* Year/Month selector */}
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
                        <select className="form-control" value={taxYear} onChange={e => setTaxYear(Number(e.target.value))} style={{ width: 'auto', padding: '6px 12px' }}>
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <option key={y} value={y}>{y + 543} ({y})</option>
                            ))}
                        </select>
                        <select className="form-control" value={taxMonth} onChange={e => setTaxMonth(Number(e.target.value))} style={{ width: 'auto', padding: '6px 12px' }}>
                            <option value={0}>ทั้งปี</option>
                            {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'].map((m, i) => (
                                <option key={i + 1} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <button className="btn btn-primary btn-sm" onClick={() => exportTaxCSV(taxYear, taxMonth)}>
                            📥 Export CSV สำหรับยื่นภาษี
                        </button>
                    </div>

                    {taxData && (
                        <>
                            {/* Tax ID info */}
                            {(() => { const s = getSettings(); return s.taxId ? (
                                <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', display: 'flex', gap: 'var(--space-md)' }}>
                                    <span>🏪 <b>{s.shopName}</b></span>
                                    <span>🏛️ Tax ID: <b>{s.taxId}</b></span>
                                </div>
                            ) : (
                                <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm) var(--space-md)', background: 'rgba(234,179,8,0.15)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: 'var(--warning)' }}>
                                    ⚠️ ยังไม่ได้กรอกเลขประจำตัวผู้เสียภาษี — ไปตั้งค่าที่หน้า <b>ตั้งค่าระบบ</b>
                                </div>
                            )})()}

                            {/* Summary Cards */}
                            <div className="stat-cards">
                                <div className="stat-card">
                                    <div className="stat-card-icon green">💵</div>
                                    <div className="stat-card-info">
                                        <h3>รายได้รวม</h3>
                                        <div className="stat-value">{formatCurrency(taxData.totalRevenue)}</div>
                                        <div className="stat-sub">{taxData.transactionCount} บิล</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card-icon red">📉</div>
                                    <div className="stat-card-info">
                                        <h3>ค่าใช้จ่ายรวม</h3>
                                        <div className="stat-value">{formatCurrency(taxData.totalCOGS + taxData.totalExpenses)}</div>
                                        <div className="stat-sub">ต้นทุน {formatCurrency(taxData.totalCOGS)} + ดำเนินงาน {formatCurrency(taxData.totalExpenses)}</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card-icon blue">🧾</div>
                                    <div className="stat-card-info">
                                        <h3>กำไรสุทธิ (ก่อนภาษี)</h3>
                                        <div className="stat-value" style={{ color: taxData.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                            {formatCurrency(taxData.netProfit)}
                                        </div>
                                        <div className="stat-sub">Margin {taxData.totalRevenue > 0 ? ((taxData.netProfit / taxData.totalRevenue) * 100).toFixed(1) : 0}%</div>
                                    </div>
                                </div>
                            </div>

                            {/* VAT Section */}
                            {(() => { const s = getSettings(); return s.vatEnabled ? (
                                <div className="chart-container" style={{ marginTop: 'var(--space-lg)' }}>
                                    <div className="chart-header">
                                        <h3>🏛️ ภาษีมูลค่าเพิ่ม (VAT {s.vatRate || 7}%)</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)', padding: 'var(--space-md)' }}>
                                        <div style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>VAT ขาย (Output Tax)</div>
                                            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(taxData.vatOutput)}</div>
                                        </div>
                                        <div style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>VAT ซื้อ (Input Tax)</div>
                                            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(taxData.vatInput)}</div>
                                        </div>
                                        <div style={{ padding: 'var(--space-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>VAT ต้องนำส่ง</div>
                                            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, color: 'var(--accent-primary-hover)' }}>{formatCurrency(taxData.vatPayable)}</div>
                                        </div>
                                    </div>
                                    <div style={{ padding: '0 var(--space-md) var(--space-md)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                        💡 VAT ขาย - VAT ซื้อ = ส่วนต่างที่ต้องนำส่งกรมสรรพากร (ยื่น ภ.พ.30 ทุกเดือน)
                                    </div>
                                </div>
                            ) : null})()}

                            {/* Expense by Category */}
                            {Object.keys(taxData.expenseByCategory).length > 0 && (
                                <div className="chart-container" style={{ marginTop: 'var(--space-lg)' }}>
                                    <div className="chart-header">
                                        <h3>📂 ค่าใช้จ่ายแยกหมวดหมู่</h3>
                                        <span className="badge badge-info">นำไปหักค่าใช้จ่ายได้</span>
                                    </div>
                                    <div className="low-stock-list" style={{ padding: 'var(--space-md)' }}>
                                        {Object.entries(taxData.expenseByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => {
                                            const catInfo = EXPENSE_CATEGORIES.find(c => c.name === cat)
                                            return (
                                                <div key={cat} className="low-stock-item">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '1.2rem' }}>{catInfo?.icon || '📁'}</span>
                                                        <span style={{ fontWeight: 600 }}>{cat}</span>
                                                    </div>
                                                    <div style={{ fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(amount)}</div>
                                                </div>
                                            )
                                        })}
                                        <div className="low-stock-item" style={{ borderTop: '2px solid var(--border)', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                            <div style={{ fontWeight: 800 }}>รวมค่าใช้จ่ายดำเนินงาน</div>
                                            <div style={{ fontWeight: 800, color: 'var(--danger)' }}>{formatCurrency(taxData.totalExpenses)}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Monthly Breakdown (yearly view) */}
                            {taxData.monthlyBreakdown.length > 0 && (
                                <div className="chart-container" style={{ marginTop: 'var(--space-lg)' }}>
                                    <div className="chart-header">
                                        <h3>📅 สรุปรายเดือน ปี {taxYear + 543}</h3>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>เดือน</th>
                                                    <th>รายได้</th>
                                                    <th>ต้นทุน</th>
                                                    <th>ค่าใช้จ่าย</th>
                                                    <th>กำไรสุทธิ</th>
                                                    <th>บิล</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {taxData.monthlyBreakdown.map(m => {
                                                    const mLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
                                                    return (
                                                        <tr key={m.month} style={{ opacity: m.revenue === 0 && m.expenses === 0 ? 0.4 : 1 }}>
                                                            <td style={{ fontWeight: 600 }}>{mLabels[m.month - 1]}</td>
                                                            <td style={{ color: 'var(--success)' }}>{formatCurrency(m.revenue)}</td>
                                                            <td>{formatCurrency(m.cogs)}</td>
                                                            <td style={{ color: 'var(--danger)' }}>{formatCurrency(m.expenses)}</td>
                                                            <td style={{ fontWeight: 700, color: m.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                                {formatCurrency(m.netProfit)}
                                                            </td>
                                                            <td>{m.transactionCount}</td>
                                                        </tr>
                                                    )
                                                })}
                                                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                                                    <td>รวมทั้งปี</td>
                                                    <td style={{ color: 'var(--success)' }}>{formatCurrency(taxData.totalRevenue)}</td>
                                                    <td>{formatCurrency(taxData.totalCOGS)}</td>
                                                    <td style={{ color: 'var(--danger)' }}>{formatCurrency(taxData.totalExpenses)}</td>
                                                    <td style={{ color: taxData.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                        {formatCurrency(taxData.netProfit)}
                                                    </td>
                                                    <td>{taxData.transactionCount}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Monthly chart */}
                                    <div style={{ width: '100%', height: '280px', marginTop: 'var(--space-md)', padding: '0 var(--space-md) var(--space-md)' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={taxData.monthlyBreakdown.map(m => ({ ...m, label: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][m.month - 1] }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                                                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v).replace('฿', '')} />
                                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }} formatter={(v, n) => [formatCurrency(v), n === 'revenue' ? 'รายได้' : n === 'netProfit' ? 'กำไรสุทธิ' : 'ค่าใช้จ่าย']} />
                                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                                                <Bar dataKey="revenue" name="รายได้" fill="var(--accent-primary)" radius={[3, 3, 0, 0]} />
                                                <Bar dataKey="netProfit" name="กำไรสุทธิ" fill="var(--success)" radius={[3, 3, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Tax Tips */}
                            <div className="chart-container" style={{ marginTop: 'var(--space-lg)' }}>
                                <div className="chart-header"><h3>💡 เคล็ดลับภาษีสำหรับร้านค้า</h3></div>
                                <div style={{ padding: 'var(--space-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                                    <div>📌 <b>ภ.ง.ด.90/91</b> — ยื่นภาษีเงินได้บุคคลธรรมดาภายใน <b>31 มี.ค.</b> ของทุกปี</div>
                                    <div>📌 <b>ภ.พ.30</b> — ถ้าจด VAT ต้องยื่นภาษีมูลค่าเพิ่มภายใน <b>วันที่ 15 ของเดือนถัดไป</b></div>
                                    <div>📌 <b>หักค่าใช้จ่าย</b> — เก็บใบเสร็จค่าใช้จ่ายทุกรายการเพื่อนำมาหักค่าใช้จ่ายตามจริง</div>
                                    <div>📌 <b>Export CSV</b> — กดปุ่มด้านบนเพื่อส่งออกข้อมูลสรุป พร้อมส่งให้นักบัญชี/สรรพากร</div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* === Cloud Summary Tab === */}
            {tab === 'cloud' && (
                <div className="chart-container">
                    <div className="chart-header">
                        <h3>☁️ สรุปรายวันจากเบื้องหลัง</h3>
                        <span className="badge badge-purple">Supabase View</span>
                    </div>

                    <div style={{ padding: 'var(--space-md)' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-lg)' }}>
                            💡 ข้อมูลนี้ดึงตรงจาก <code>daily_summary</code> View โดยที่ Server จะเป็นฝ่ายคำนวณและสรุปยอดรวมของแต่ละวันให้โดยอัตโนมัติ ทำให้ไม่ต้องหน่วงเครื่อง Client! (อัปเดตเมื่อมีการ Sync ข้อมูลขึ้น Cloud)
                        </p>

                        {loadingCloud && !cloudSummary && (
                            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                                ⏳ กำลังดึงข้อมูลจาก Cloud...
                            </div>
                        )}

                        {!loadingCloud && cloudSummary && cloudSummary.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>☁️</div>
                                ยังไม่มีข้อมูลสรุปรายวันบน Cloud
                            </div>
                        )}

                        {cloudSummary && cloudSummary.length > 0 && (
                            <div style={{ overflowX: 'auto' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>วันที่</th>
                                            <th>จำนวนบิล</th>
                                            <th>รายรับรวม</th>
                                            <th>รายจ่ายรวม</th>
                                            <th>สุทธิ (Profit)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cloudSummary.map((row, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{new Date(row.date).toLocaleDateString('th-TH')}</td>
                                                <td>{row.transactionCount || 0} รายการ</td>
                                                <td style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(row.revenue)}</td>
                                                <td style={{ color: 'var(--danger)', fontWeight: 700 }}>{formatCurrency(row.expenses)}</td>
                                                <td style={{ color: row.profit > 0 ? 'var(--accent-primary-hover)' : row.profit < 0 ? 'var(--danger)' : 'inherit', fontWeight: 800 }}>
                                                    {formatCurrency(row.profit)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
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
                                📤 สำรองข้อมูล (JSON)
                            </button>
                            <button className="btn btn-secondary btn-lg" onClick={handleImportBackup}>
                                📥 กู้คืนข้อมูล (JSON)
                            </button>
                            <button className="btn btn-secondary btn-lg" onClick={() => exportCSV(getTransactions())}>
                                📊 ส่งออกยอดขาย (CSV)
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
