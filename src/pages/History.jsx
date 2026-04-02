import { useState, useEffect, Fragment } from 'react'
import { getTransactions, formatCurrency, formatDate, exportCSV, calcTxProfit, refundTransaction } from '../lib/storage.js'
import { useToast, useAuth } from '../App.jsx'
import { isAdmin } from '../lib/permissions.js'

export default function History() {
    const [transactions, setTransactions] = useState([])
    const [filterType, setFilterType] = useState('')
    const [filterDate, setFilterDate] = useState('')
    const [search, setSearch] = useState('')
    const [expanded, setExpanded] = useState(null)
    const [viewMode, setViewMode] = useState('all') // 'all', 'daily', 'monthly'
    const toast = useToast()
    const { user } = useAuth()
    const role = user?.role || 'staff'

    const reload = () => {
        let txs = getTransactions()
        if (!isAdmin(role)) {
            const today = new Date().toDateString()
            txs = txs.filter(t => new Date(t.date).toDateString() === today)
        }
        setTransactions(txs)
    }
    useEffect(() => { reload() }, [])

    const handleRefund = (txId) => {
        if (!confirm('ยืนยันคืนสินค้า? สต็อกจะถูกเพิ่มกลับ')) return
        const result = refundTransaction(txId)
        if (result) { toast('↩️ คืนสินค้าสำเร็จ! สต็อกกลับแล้ว'); reload() }
        else { toast('ไม่สามารถคืนได้ (อาจคืนแล้ว)', 'error') }
    }

    const filtered = transactions.filter(tx => {
        const matchType = !filterType || tx.type === filterType
        const matchDate = !filterDate || tx.createdAt.startsWith(filterDate)
        const matchSearch = !search || tx.items.some(i => i.productName.toLowerCase().includes(search.toLowerCase()))
        return matchType && matchDate && matchSearch
    })

    // Daily summary
    const dailySummary = {}
    filtered.forEach(tx => {
        const day = tx.createdAt.split('T')[0]
        if (!dailySummary[day]) dailySummary[day] = { date: day, revenue: 0, cost: 0, profit: 0, stockIn: 0, txCount: 0 }
        if (tx.type === 'out') {
            dailySummary[day].revenue += tx.total
            dailySummary[day].profit += calcTxProfit(tx)
            dailySummary[day].txCount++
        } else {
            dailySummary[day].stockIn += tx.total
        }
    })
    const dailyData = Object.values(dailySummary).sort((a, b) => b.date.localeCompare(a.date))

    // Summary stats
    const totalRevenue = filtered.filter(tx => tx.type === 'out').reduce((s, tx) => s + tx.total, 0)
    const totalStockIn = filtered.filter(tx => tx.type === 'in').reduce((s, tx) => s + tx.total, 0)
    const totalProfit = filtered.filter(tx => tx.type === 'out').reduce((s, tx) => s + calcTxProfit(tx), 0)

    const handleExport = () => {
        exportCSV(filtered)
        toast('ดาวน์โหลด CSV สำเร็จ 📁')
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>📋 ประวัติรายการ</h2>
                <p>ดูย้อนหลังทุกการซื้อขาย</p>
            </div>

            {/* Summary Cards */}
            <div className="stat-cards" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="stat-card mini">
                    <div className="stat-card-icon green">💰</div>
                    <div className="stat-card-info">
                        <h3>รายได้</h3>
                        <div className="stat-value" style={{ fontSize: 'var(--font-size-lg)' }}>{formatCurrency(totalRevenue)}</div>
                    </div>
                </div>
                <div className="stat-card mini">
                    <div className="stat-card-icon blue">📈</div>
                    <div className="stat-card-info">
                        <h3>กำไร</h3>
                        <div className="stat-value" style={{ fontSize: 'var(--font-size-lg)', color: 'var(--success)' }}>{formatCurrency(totalProfit)}</div>
                    </div>
                </div>
                <div className="stat-card mini">
                    <div className="stat-card-icon orange">📥</div>
                    <div className="stat-card-info">
                        <h3>ต้นทุนนำเข้า</h3>
                        <div className="stat-value" style={{ fontSize: 'var(--font-size-lg)' }}>{formatCurrency(totalStockIn)}</div>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <div className="table-toolbar" style={{ flexWrap: 'wrap' }}>
                    <div className="table-search">
                        <span className="search-icon">🔍</span>
                        <input type="text" placeholder="ค้นหาสินค้า..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        <select className="form-control" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 'auto', padding: '8px 12px' }}>
                            <option value="">ทุกประเภท</option>
                            <option value="in">📥 นำเข้า</option>
                            <option value="out">🛒 ขาย</option>
                            <option value="refund">↩️ คืนสินค้า</option>
                        </select>
                        <input className="form-control" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ width: 'auto', padding: '8px 12px' }} />
                        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '2px' }}>
                            <button className={`btn btn-sm ${viewMode === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('all')}>ทั้งหมด</button>
                            <button className={`btn btn-sm ${viewMode === 'daily' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('daily')}>รายวัน</button>
                        </div>
                        {(filterType || filterDate || search) && (
                            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterType(''); setFilterDate(''); setSearch('') }} style={{ color: 'var(--danger)' }}>✕ ล้างตัวกรอง</button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={handleExport}>📁 Export CSV</button>
                    </div>
                </div>

                {viewMode === 'daily' ? (
                    // Daily summary view
                    dailyData.length === 0 ? (
                        <div className="table-empty"><div className="empty-icon">📋</div><p>ไม่พบรายการ</p></div>
                    ) : (
                        <table>
                            <thead><tr><th>วันที่</th><th>รายการขาย</th><th>รายได้</th><th>กำไร</th><th>นำเข้า</th></tr></thead>
                            <tbody>
                                {dailyData.map(d => (
                                    <tr key={d.date}>
                                        <td style={{ fontWeight: 600 }}>{new Date(d.date).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                                        <td>{d.txCount} รายการ</td>
                                        <td style={{ fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{formatCurrency(d.revenue)}</td>
                                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(d.profit)}</td>
                                        <td style={{ color: 'var(--info)' }}>{d.stockIn > 0 ? formatCurrency(d.stockIn) : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                ) : (
                    // All transactions view
                    filtered.length === 0 ? (
                        <div className="table-empty"><div className="empty-icon">📋</div><p>ไม่พบรายการ</p></div>
                    ) : (
                        <table>
                            <thead><tr><th>วันที่</th><th>เลขที่</th><th>ประเภท</th><th>รายการ</th><th>จำนวน</th><th>มูลค่า</th><th>กำไร</th><th></th></tr></thead>
                            <tbody>
                                {filtered.map(tx => (
                                    <Fragment key={tx.id}>
                                        <tr key={tx.id} onClick={() => setExpanded(expanded === tx.id ? null : tx.id)} style={{ cursor: 'pointer' }}>
                                            <td style={{ whiteSpace: 'nowrap' }}>{formatDate(tx.createdAt)}</td>
                                            <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{tx.invoiceNo || `#${tx.id?.slice(-6).toUpperCase()}`}</td>
                                            <td>
                                                <span className={`badge ${tx.type === 'in' ? 'badge-info' : tx.type === 'refund' ? 'badge-warning' : tx.refunded ? 'badge-danger' : 'badge-success'}`}>
                                                    {tx.type === 'in' ? '📥 นำเข้า' : tx.type === 'refund' ? '↩️ คืน' : '🛒 ขาย'}
                                                </span>
                                                {tx.refunded && <span className="badge badge-danger" style={{ marginLeft: '4px', fontSize: '0.5rem' }}>คืนแล้ว</span>}
                                            </td>
                                            <td style={{ color: 'var(--text-primary)' }}>
                                                {tx.items.length === 1 ? tx.items[0].productName : `${tx.items.length} รายการ`}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{tx.items.reduce((s, i) => s + i.qty, 0)}</td>
                                            <td style={{ fontWeight: 700, color: tx.type === 'out' ? 'var(--accent-primary-hover)' : 'var(--info)' }}>
                                                {formatCurrency(tx.total)}
                                            </td>
                                            <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                                                {tx.type === 'out' ? formatCurrency(calcTxProfit(tx)) : '-'}
                                            </td>
                                            <td>
                                                {tx.type === 'out' && !tx.refunded && (
                                                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleRefund(tx.id) }} title="คืนสินค้า" style={{ color: 'var(--warning)' }}>↩️</button>
                                                )}
                                            </td>
                                        </tr>
                                        {expanded === tx.id && (
                                            <tr key={tx.id + '-detail'}>
                                                <td colSpan="8" style={{ padding: 'var(--space-md)', background: 'var(--bg-primary)' }}>
                                                    {tx.items.map((item, i) => (
                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < tx.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                                            <span>{item.productName} ×{item.qty}</span>
                                                            <span style={{ fontWeight: 600 }}>{formatCurrency(item.qty * item.price)}</span>
                                                        </div>
                                                    ))}
                                                    {tx.discount > 0 && <div style={{ color: 'var(--danger)', marginTop: '4px' }}>ส่วนลด: -{formatCurrency(tx.discount)}</div>}
                                                    {tx.note && <div style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: 'var(--font-size-xs)' }}>📝 {tx.note}</div>}
                                                    {tx.paymentMethod && <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>💳 {tx.paymentMethod === 'cash' ? 'เงินสด' : tx.paymentMethod === 'transfer' ? 'โอนเงิน' : 'QR'}</div>}
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    )
                )}
            </div>
        </div>
    )
}
