import { useState, useEffect } from 'react'
import { getTransactions, formatCurrency, formatDate } from '../lib/storage.js'

export default function History() {
    const [transactions, setTransactions] = useState([])
    const [filterType, setFilterType] = useState('')
    const [filterDate, setFilterDate] = useState('')
    const [search, setSearch] = useState('')
    const [expandedId, setExpandedId] = useState(null)

    useEffect(() => {
        setTransactions(getTransactions())
    }, [])

    const filtered = transactions.filter(tx => {
        const matchType = !filterType || tx.type === filterType
        const matchDate = !filterDate || new Date(tx.createdAt).toISOString().startsWith(filterDate)
        const matchSearch = !search || tx.items.some(i =>
            i.productName.toLowerCase().includes(search.toLowerCase())
        )
        return matchType && matchDate && matchSearch
    })

    const totalIn = filtered.filter(tx => tx.type === 'in').reduce((sum, tx) => sum + tx.total, 0)
    const totalOut = filtered.filter(tx => tx.type === 'out').reduce((sum, tx) => sum + tx.total, 0)

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>📋 ประวัติรายการ</h2>
                <p>ดูรายการรับเข้าและขายออกทั้งหมด</p>
            </div>

            {/* Summary */}
            <div className="stat-cards" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="stat-card">
                    <div className="stat-card-icon blue">📥</div>
                    <div className="stat-card-info">
                        <h3>มูลค่านำเข้า</h3>
                        <div className="stat-value" style={{ color: 'var(--info)' }}>{formatCurrency(totalIn)}</div>
                        <div className="stat-sub">{filtered.filter(tx => tx.type === 'in').length} รายการ</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon green">🛒</div>
                    <div className="stat-card-info">
                        <h3>มูลค่าขาย</h3>
                        <div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(totalOut)}</div>
                        <div className="stat-sub">{filtered.filter(tx => tx.type === 'out').length} รายการ</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon purple">📊</div>
                    <div className="stat-card-info">
                        <h3>รายการทั้งหมด</h3>
                        <div className="stat-value">{filtered.length}</div>
                        <div className="stat-sub">รายการ</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filter-bar">
                <div className="table-search" style={{ flex: 1, maxWidth: '300px' }}>
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="ค้นหาสินค้า..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="">ทุกประเภท</option>
                    <option value="in">📥 รับเข้า</option>
                    <option value="out">🛒 ขายออก</option>
                </select>
                <input
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                />
                {(filterType || filterDate || search) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setFilterType(''); setFilterDate(''); setSearch('') }}>
                        ✕ ล้างตัวกรอง
                    </button>
                )}
            </div>

            {/* Transactions Table */}
            <div className="table-container">
                {filtered.length === 0 ? (
                    <div className="table-empty">
                        <div className="empty-icon">📋</div>
                        <p>ไม่มีรายการ</p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>ประเภท</th>
                                <th>รายการ</th>
                                <th>จำนวน</th>
                                <th>มูลค่า</th>
                                <th>วันที่</th>
                                <th>หมายเหตุ</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(tx => (
                                <>
                                    <tr key={tx.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}>
                                        <td>
                                            <span className={`badge ${tx.type === 'in' ? 'badge-info' : 'badge-success'}`}>
                                                {tx.type === 'in' ? '📥 นำเข้า' : '🛒 ขาย'}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-primary)' }}>
                                            {tx.items.length === 1
                                                ? tx.items[0].productName
                                                : `${tx.items[0].productName} +${tx.items.length - 1} รายการ`
                                            }
                                        </td>
                                        <td style={{ fontWeight: 600 }}>
                                            {tx.items.reduce((sum, i) => sum + i.qty, 0)} ชิ้น
                                        </td>
                                        <td style={{ fontWeight: 700, color: tx.type === 'in' ? 'var(--info)' : 'var(--success)' }}>
                                            {formatCurrency(tx.total)}
                                        </td>
                                        <td>{formatDate(tx.createdAt)}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{tx.note || '-'}</td>
                                        <td>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                                                {expandedId === tx.id ? '▲' : '▼'}
                                            </span>
                                        </td>
                                    </tr>
                                    {expandedId === tx.id && (
                                        <tr key={`${tx.id}-detail`}>
                                            <td colSpan={7} style={{ padding: 0 }}>
                                                <div style={{
                                                    background: 'var(--bg-secondary)',
                                                    padding: 'var(--space-md) var(--space-lg)',
                                                    borderLeft: `3px solid ${tx.type === 'in' ? 'var(--info)' : 'var(--success)'}`,
                                                }}>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase' }}>
                                                        รายละเอียด
                                                    </div>
                                                    {tx.items.map((item, i) => (
                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 'var(--font-size-sm)' }}>
                                                            <span>{item.productName} × {item.qty}</span>
                                                            <span style={{ fontWeight: 600 }}>{formatCurrency(item.qty * item.price)}</span>
                                                        </div>
                                                    ))}
                                                    {tx.type === 'out' && tx.payment && (
                                                        <div style={{ marginTop: 'var(--space-sm)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border)' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                                                                <span>รับเงิน</span>
                                                                <span>{formatCurrency(tx.payment)}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--success)' }}>
                                                                <span>เงินทอน</span>
                                                                <span>{formatCurrency(tx.change)}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
