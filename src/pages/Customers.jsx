import { useState, useEffect } from 'react'
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomerPurchases, formatCurrency, formatDate, getCustomerTier, getNextTier, MEMBERSHIP_TIERS } from '../lib/storage.js'
import { useToast } from '../App.jsx'

export default function Customers() {
    const [customers, setCustomers] = useState([])
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ name: '', phone: '', note: '' })
    const [viewCustomer, setViewCustomer] = useState(null)
    const [purchases, setPurchases] = useState([])
    const [tierFilter, setTierFilter] = useState('all')
    const [sortBy, setSortBy] = useState('name')
    const toast = useToast()

    const reload = () => setCustomers(getCustomers())
    useEffect(() => { reload() }, [])

    const filtered = customers.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search)
        const matchTier = tierFilter === 'all' || getCustomerTier(c).key === tierFilter
        return matchSearch && matchTier
    }).sort((a, b) => {
        if (sortBy === 'spent') return (b.totalSpent || 0) - (a.totalSpent || 0)
        if (sortBy === 'points') return (b.points || 0) - (a.points || 0)
        if (sortBy === 'visits') return (b.visitCount || 0) - (a.visitCount || 0)
        if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        return a.name.localeCompare(b.name, 'th')
    })

    const exportCustomerCSV = () => {
        const header = '\uFEFFชื่อ,เบอร์โทร,ระดับ,ยอดซื้อสะสม,คะแนน,จำนวนครั้ง,หมายเหตุ,วันที่สมัคร\n'
        const rows = filtered.map(c => {
            const t = getCustomerTier(c)
            return `"${c.name}","${c.phone || ''}","${t.label}",${c.totalSpent || 0},${c.points || 0},${c.visitCount || 0},"${c.note || ''}","${c.createdAt ? new Date(c.createdAt).toLocaleDateString('th-TH') : ''}"`
        }).join('\n')
        const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `shopstock_customers_${new Date().toISOString().split('T')[0]}.csv`; a.click()
        URL.revokeObjectURL(url)
        toast('ดาวน์โหลด CSV สำเร็จ 📁')
    }

    const openAdd = () => { setEditId(null); setForm({ name: '', phone: '', note: '' }); setShowModal(true) }
    const openEdit = (c) => { setEditId(c.id); setForm({ name: c.name, phone: c.phone || '', note: c.note || '' }); setShowModal(true) }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!form.name) { toast('กรอกชื่อลูกค้า', 'error'); return }
        if (editId) { updateCustomer(editId, form); toast('แก้ไขสำเร็จ ✏️') }
        else { addCustomer(form); toast('เพิ่มลูกค้าสำเร็จ 🎉') }
        setShowModal(false); reload()
    }

    const handleDelete = (id) => {
        if (!window.confirm('ยืนยันลบลูกค้านี้? ข้อมูลจะไม่สามารถกู้คืนได้')) return
        deleteCustomer(id); toast('ลบลูกค้าสำเร็จ'); reload()
    }

    const openView = (c) => {
        setViewCustomer(c)
        setPurchases(getCustomerPurchases(c.id))
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>👥 ลูกค้า / สมาชิก</h2>
                <p>จัดการข้อมูลลูกค้าและดูประวัติการซื้อ</p>
            </div>

            <div className="stat-cards" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="stat-card mini"><div className="stat-card-icon purple">👥</div><div className="stat-card-info"><h3>ลูกค้าทั้งหมด</h3><div className="stat-value" style={{ fontSize: 'var(--font-size-lg)' }}>{customers.length}</div></div></div>
                <div className="stat-card mini"><div className="stat-card-icon green">💰</div><div className="stat-card-info"><h3>ยอดซื้อรวม</h3><div className="stat-value" style={{ fontSize: 'var(--font-size-lg)' }}>{formatCurrency(customers.reduce((s, c) => s + (c.totalSpent || 0), 0))}</div></div></div>
                <div className="stat-card mini"><div className="stat-card-icon blue">⭐</div><div className="stat-card-info"><h3>คะแนนสะสมรวม</h3><div className="stat-value" style={{ fontSize: 'var(--font-size-lg)' }}>{customers.reduce((s, c) => s + (c.points || 0), 0)}</div></div></div>
            </div>

            <div className="table-container">
                <div className="table-toolbar">
                    <div className="table-search"><span className="search-icon">🔍</span><input type="text" placeholder="ค้นหาชื่อ / เบอร์โทร..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button className={`btn btn-sm ${tierFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTierFilter('all')}>ทั้งหมด</button>
                        {MEMBERSHIP_TIERS.map(t => (
                            <button key={t.key} className={`btn btn-sm ${tierFilter === t.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTierFilter(t.key)} style={{ color: tierFilter === t.key ? undefined : t.color }}>{t.emoji}</button>
                        ))}
                        <select className="form-control" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 'auto', padding: '6px 10px', fontSize: 'var(--font-size-xs)' }}>
                            <option value="name">เรียง: ชื่อ</option>
                            <option value="spent">เรียง: ยอดซื้อ</option>
                            <option value="points">เรียง: คะแนน</option>
                            <option value="visits">เรียง: ครั้งที่ซื้อ</option>
                            <option value="newest">เรียง: สมัครล่าสุด</option>
                        </select>
                        <button className="btn btn-secondary btn-sm" onClick={exportCustomerCSV}>📁 CSV</button>
                        <button className="btn btn-primary" onClick={openAdd}>➕ เพิ่ม</button>
                    </div>
                </div>
                {filtered.length === 0 ? (
                    <div className="table-empty"><div className="empty-icon">👥</div><p>ไม่พบลูกค้า</p></div>
                ) : (
                    <table>
                        <thead><tr><th>ชื่อ</th><th>ระดับ</th><th>เบอร์โทร</th><th>ครั้งที่ซื้อ</th><th>ยอดซื้อรวม</th><th>คะแนน</th><th>จัดการ</th></tr></thead>
                        <tbody>
                            {filtered.map(c => {
                                const tier = getCustomerTier(c)
                                const next = getNextTier(c)
                                return (
                                <tr key={c.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => openView(c)}>{tier.emoji} {c.name}</td>
                                    <td>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: tier.color, background: `${tier.color}15`, padding: '2px 8px', borderRadius: '8px' }}>{tier.label}</span>
                                        {next && <div style={{ marginTop: '3px', height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', width: '60px' }}><div style={{ height: '100%', background: tier.color, width: `${Math.min(100, ((c.totalSpent || 0) / next.minSpent) * 100)}%` }} /></div>}
                                    </td>
                                    <td>{c.phone || '-'}</td>
                                    <td>{c.visitCount || 0} ครั้ง</td>
                                    <td style={{ fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{formatCurrency(c.totalSpent || 0)}</td>
                                    <td><span className="badge badge-purple">🪙 {c.points || 0}</span></td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="btn btn-ghost btn-sm" onClick={() => openView(c)}>👁️</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>✏️</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>{editId ? '✏️ แก้ไขลูกค้า' : '➕ เพิ่มลูกค้า'}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group"><label>ชื่อ *</label><input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ชื่อลูกค้า" required autoFocus /></div>
                                <div className="form-group"><label>เบอร์โทร</label><input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0812345678" /></div>
                                <div className="form-group"><label>หมายเหตุ</label><input className="form-control" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="เช่น ลูกค้าประจำ" /></div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>ยกเลิก</button>
                                <button type="submit" className="btn btn-primary">{editId ? '💾 บันทึก' : '➕ เพิ่ม'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Customer Modal */}
            {viewCustomer && (
                <div className="modal-overlay" onClick={() => setViewCustomer(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header"><h3>👤 {viewCustomer.name}</h3><button className="btn btn-ghost btn-icon" onClick={() => setViewCustomer(null)}>✕</button></div>
                        <div className="modal-body">
                            {(() => { const vt = getCustomerTier(viewCustomer); const vn = getNextTier(viewCustomer); return (
                            <div style={{ background: `linear-gradient(135deg, ${vt.color}15, ${vt.color}05)`, border: `1px solid ${vt.color}33`, borderRadius: 'var(--radius-lg)', padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '1.5rem' }}>{vt.emoji}</span>
                                        <div><div style={{ fontWeight: 800, color: vt.color }}>{vt.label} Member</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{vt.desc}</div></div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>🪙 {(viewCustomer.points || 0).toLocaleString()}</div><div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>คะแนนสะสม</div></div>
                                </div>
                                {vt.discount > 0 && <div style={{ fontSize: '11px', color: vt.color, fontWeight: 700, marginBottom: '4px' }}>✨ ส่วนลดสมาชิก {vt.discount}% ทุกบิล</div>}
                                {vn && <div style={{ marginTop: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}><span>{formatCurrency(viewCustomer.totalSpent || 0)}</span><span>{vn.emoji} {vn.label} ({formatCurrency(vn.minSpent)})</span></div>
                                    <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}><div style={{ height: '100%', background: `linear-gradient(90deg, ${vt.color}, ${vn.color})`, borderRadius: '3px', width: `${Math.min(100, ((viewCustomer.totalSpent || 0) / vn.minSpent) * 100)}%` }} /></div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', textAlign: 'right' }}>อีก {formatCurrency(vn.minSpent - (viewCustomer.totalSpent || 0))} ถึงระดับถัดไป</div>
                                </div>}
                                {!vn && <div style={{ fontSize: '11px', color: vt.color, fontWeight: 700 }}>⭐ ระดับสูงสุดแล้ว!</div>}
                            </div>
                            )})()}
                            <div className="stat-cards" style={{ marginBottom: 'var(--space-md)' }}>
                                <div className="stat-card mini"><div className="stat-card-info"><h3>ยอดซื้อรวม</h3><div className="stat-value" style={{ fontSize: 'var(--font-size-base)' }}>{formatCurrency(viewCustomer.totalSpent || 0)}</div></div></div>
                                <div className="stat-card mini"><div className="stat-card-info"><h3>จำนวนครั้ง</h3><div className="stat-value" style={{ fontSize: 'var(--font-size-base)' }}>{viewCustomer.visitCount || 0} ครั้ง</div></div></div>
                            </div>
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>📱 {viewCustomer.phone || 'ไม่มีเบอร์'} {viewCustomer.note ? `• ${viewCustomer.note}` : ''}</p>
                            <h4 style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-sm)', fontWeight: 700 }}>📋 ประวัติการซื้อ ({purchases.length} รายการ)</h4>
                            {purchases.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>ยังไม่มีรายการ</p> : (
                                <div className="low-stock-list">
                                    {purchases.slice(0, 10).map(tx => (
                                        <div key={tx.id} className="low-stock-item">
                                            <div><div className="item-name">{tx.items.map(i => i.productName).join(', ')}</div><div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{formatDate(tx.createdAt)}</div></div>
                                            <span style={{ fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{formatCurrency(tx.total)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
