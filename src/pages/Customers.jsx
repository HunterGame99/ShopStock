import { useState, useEffect } from 'react'
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomerPurchases, formatCurrency, formatDate } from '../lib/storage.js'
import { useToast } from '../App.jsx'

export default function Customers() {
    const [customers, setCustomers] = useState([])
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ name: '', phone: '', note: '' })
    const [viewCustomer, setViewCustomer] = useState(null)
    const [purchases, setPurchases] = useState([])
    const toast = useToast()

    const reload = () => setCustomers(getCustomers())
    useEffect(() => { reload() }, [])

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').includes(search)
    )

    const openAdd = () => { setEditId(null); setForm({ name: '', phone: '', note: '' }); setShowModal(true) }
    const openEdit = (c) => { setEditId(c.id); setForm({ name: c.name, phone: c.phone || '', note: c.note || '' }); setShowModal(true) }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!form.name) { toast('กรอกชื่อลูกค้า', 'error'); return }
        if (editId) { updateCustomer(editId, form); toast('แก้ไขสำเร็จ ✏️') }
        else { addCustomer(form); toast('เพิ่มลูกค้าสำเร็จ 🎉') }
        setShowModal(false); reload()
    }

    const handleDelete = (id) => { deleteCustomer(id); toast('ลบลูกค้าสำเร็จ'); reload() }

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
                    <button className="btn btn-primary" onClick={openAdd}>➕ เพิ่มลูกค้า</button>
                </div>
                {filtered.length === 0 ? (
                    <div className="table-empty"><div className="empty-icon">👥</div><p>ไม่พบลูกค้า</p></div>
                ) : (
                    <table>
                        <thead><tr><th>ชื่อ</th><th>เบอร์โทร</th><th>ครั้งที่ซื้อ</th><th>ยอดซื้อรวม</th><th>คะแนน</th><th>จัดการ</th></tr></thead>
                        <tbody>
                            {filtered.map(c => (
                                <tr key={c.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => openView(c)}>👤 {c.name}</td>
                                    <td>{c.phone || '-'}</td>
                                    <td>{c.visitCount || 0} ครั้ง</td>
                                    <td style={{ fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{formatCurrency(c.totalSpent || 0)}</td>
                                    <td><span className="badge badge-purple">⭐ {c.points || 0}</span></td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="btn btn-ghost btn-sm" onClick={() => openView(c)}>👁️</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>✏️</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
                            <div className="stat-cards" style={{ marginBottom: 'var(--space-md)' }}>
                                <div className="stat-card mini"><div className="stat-card-info"><h3>ยอดซื้อรวม</h3><div className="stat-value" style={{ fontSize: 'var(--font-size-base)' }}>{formatCurrency(viewCustomer.totalSpent || 0)}</div></div></div>
                                <div className="stat-card mini"><div className="stat-card-info"><h3>คะแนน</h3><div className="stat-value" style={{ fontSize: 'var(--font-size-base)' }}>⭐ {viewCustomer.points || 0}</div></div></div>
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
