import { useState, useEffect } from 'react'
import { getProducts, addProduct, updateProduct, deleteProduct, formatCurrency, CATEGORIES, getCategoryEmoji } from '../lib/storage.js'
import { useToast, useAuth } from '../App.jsx'
import { canEditProducts, canSeeProfit } from '../lib/permissions.js'

const emptyForm = { name: '', sku: '', barcode: '', category: '', emoji: '📦', costPrice: '', sellPrice: '', stock: '', minStock: '5' }

export default function Products() {
    const [products, setProducts] = useState([])
    const [search, setSearch] = useState('')
    const [filterCat, setFilterCat] = useState('')
    const [sortBy, setSortBy] = useState('name')
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState(emptyForm)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const toast = useToast()
    const { user } = useAuth()
    const role = user?.role || 'staff'

    const reload = () => setProducts(getProducts())
    useEffect(() => { reload() }, [])

    const filtered = products
        .filter(p => {
            const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.sku.toLowerCase().includes(search.toLowerCase()) ||
                (p.barcode || '').includes(search)
            const matchCat = !filterCat || p.category === filterCat
            return matchSearch && matchCat
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'stock': return a.stock - b.stock
                case 'stock-desc': return b.stock - a.stock
                case 'price': return b.sellPrice - a.sellPrice
                case 'margin': return (b.sellPrice - b.costPrice) - (a.sellPrice - a.costPrice)
                default: return a.name.localeCompare(b.name, 'th')
            }
        })

    const openAdd = () => { setEditId(null); setForm(emptyForm); setShowModal(true) }

    const openEdit = (product) => {
        setEditId(product.id)
        setForm({
            name: product.name, sku: product.sku, barcode: product.barcode || '',
            category: product.category, emoji: product.emoji || '📦',
            costPrice: product.costPrice.toString(), sellPrice: product.sellPrice.toString(),
            stock: product.stock.toString(), minStock: product.minStock.toString(),
        })
        setShowModal(true)
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!form.name || !form.sellPrice) { toast('กรุณากรอกชื่อสินค้าและราคาขาย', 'error'); return }

        const data = {
            ...form,
            costPrice: Number(form.costPrice), sellPrice: Number(form.sellPrice),
            stock: Number(form.stock), minStock: Number(form.minStock),
        }

        if (editId) {
            updateProduct(editId, data)
            toast('แก้ไขสินค้าสำเร็จ ✏️')
        } else {
            addProduct(data)
            toast('เพิ่มสินค้าสำเร็จ 🎉')
        }
        setShowModal(false); reload()
    }

    const handleDelete = (id) => { deleteProduct(id); setDeleteConfirm(null); toast('ลบสินค้าสำเร็จ 🗑️'); reload() }

    const profitMargin = (cost, sell) => {
        if (!sell) return 0
        return ((sell - cost) / sell * 100)
    }

    // Emoji picker
    const emojis = ['📦', '🥤', '🍜', '🍿', '☕', '🍚', '🧴', '🪥', '🧼', '✏️', '🖊️', '📁', '💊', '🧻', '🫗', '🍞', '🥛', '🍫', '🧃', '🎈']

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>📦 จัดการสินค้า</h2>
                <p>เพิ่ม แก้ไข ลบ และค้นหาสินค้า — {products.length} รายการ</p>
            </div>

            <div className="table-container">
                <div className="table-toolbar">
                    <div className="table-search">
                        <span className="search-icon">🔍</span>
                        <input type="text" placeholder="ค้นหาสินค้า / SKU / Barcode..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        <select className="form-control" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: '8px 12px', width: 'auto' }}>
                            <option value="">ทุกหมวดหมู่</option>
                            {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
                        </select>
                        <select className="form-control" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '8px 12px', width: 'auto' }}>
                            <option value="name">เรียงตาม: ชื่อ</option>
                            <option value="stock">สต็อก: น้อย→มาก</option>
                            <option value="stock-desc">สต็อก: มาก→น้อย</option>
                            <option value="price">ราคา: สูง→ต่ำ</option>
                            <option value="margin">กำไร: สูง→ต่ำ</option>
                        </select>
                        {canEditProducts(role) && <button className="btn btn-primary" onClick={openAdd}>➕ เพิ่มสินค้า</button>}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="table-empty">
                        <div className="empty-icon">📦</div>
                        <p>ไม่พบสินค้า</p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th></th>
                                <th>สินค้า</th>
                                <th>SKU / Barcode</th>
                                <th>หมวดหมู่</th>
                                {canSeeProfit(role) && <th>ราคาทุน</th>}
                                <th>ราคาขาย</th>
                                {canSeeProfit(role) && <th>กำไร</th>}
                                <th>สต็อก</th>
                                <th>สถานะ</th>
                                {canEditProducts(role) && <th>จัดการ</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => {
                                const margin = profitMargin(p.costPrice, p.sellPrice)
                                return (
                                    <tr key={p.id}>
                                        <td style={{ fontSize: '1.5rem', textAlign: 'center', width: '50px' }}>{p.emoji || getCategoryEmoji(p.category)}</td>
                                        <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.name}</td>
                                        <td>
                                            <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{p.sku}</code>
                                            {p.barcode && <><br /><code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-primary-hover)' }}>📷 {p.barcode}</code></>}
                                        </td>
                                        <td><span className="badge badge-purple">{p.category}</span></td>
                                        {canSeeProfit(role) && <td>{formatCurrency(p.costPrice)}</td>}
                                        <td style={{ fontWeight: 600, color: 'var(--accent-primary-hover)' }}>{formatCurrency(p.sellPrice)}</td>
                                        {canSeeProfit(role) && <td>
                                            <span style={{ fontWeight: 700, color: margin >= 30 ? 'var(--success)' : margin >= 15 ? 'var(--warning)' : 'var(--danger)' }}>
                                                {formatCurrency(p.sellPrice - p.costPrice)}
                                            </span>
                                            <br /><span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{margin.toFixed(0)}%</span>
                                        </td>}
                                        <td>
                                            <div style={{
                                                width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', position: 'relative', minWidth: '60px'
                                            }}>
                                                <div style={{
                                                    height: '100%', borderRadius: '3px',
                                                    width: `${Math.min(100, (p.stock / Math.max(p.minStock * 3, 1)) * 100)}%`,
                                                    background: p.stock === 0 ? 'var(--danger)' : p.stock <= p.minStock ? 'var(--warning)' : 'var(--success)',
                                                }} />
                                            </div>
                                            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700 }}>{p.stock}</span>
                                        </td>
                                        <td>
                                            {p.stock === 0 ? <span className="badge badge-danger">หมด</span>
                                                : p.stock <= p.minStock ? <span className="badge badge-warning">ใกล้หมด</span>
                                                    : <span className="badge badge-success">ปกติ</span>}
                                        </td>
                                        <td>
                                            {canEditProducts(role) && <div className="table-actions">
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>✏️</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(p.id)}>🗑️</button>
                                            </div>}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editId ? '✏️ แก้ไขสินค้า' : '➕ เพิ่มสินค้าใหม่'}</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {/* Emoji Picker */}
                                <div className="form-group">
                                    <label>ไอคอนสินค้า</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {emojis.map(e => (
                                            <button key={e} type="button"
                                                style={{
                                                    width: '36px', height: '36px', fontSize: '1.2rem', border: form.emoji === e ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                                                    borderRadius: 'var(--radius-sm)', background: form.emoji === e ? 'rgba(99,102,241,0.15)' : 'var(--bg-input)', cursor: 'pointer'
                                                }}
                                                onClick={() => setForm({ ...form, emoji: e })}
                                            >{e}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>ชื่อสินค้า *</label>
                                    <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="เช่น น้ำดื่มสิงห์ 600ml" required />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>SKU / รหัสสินค้า</label>
                                        <input className="form-control" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="เช่น DRK-001" />
                                    </div>
                                    <div className="form-group">
                                        <label>📷 Barcode</label>
                                        <input className="form-control" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} placeholder="Scan หรือพิมพ์" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>หมวดหมู่</label>
                                    <select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        <option value="">เลือกหมวดหมู่</option>
                                        {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>ราคาทุน (บาท)</label>
                                        <input className="form-control" type="number" min="0" step="0.01" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} placeholder="0" />
                                    </div>
                                    <div className="form-group">
                                        <label>ราคาขาย (บาท) *</label>
                                        <input className="form-control" type="number" min="0" step="0.01" value={form.sellPrice} onChange={e => setForm({ ...form, sellPrice: e.target.value })} placeholder="0" required />
                                    </div>
                                </div>
                                {form.costPrice && form.sellPrice && (
                                    <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
                                        💰 กำไรต่อชิ้น: <strong>{formatCurrency(Number(form.sellPrice) - Number(form.costPrice))}</strong>
                                        <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>
                                            ({profitMargin(Number(form.costPrice), Number(form.sellPrice)).toFixed(0)}% margin)
                                        </span>
                                    </div>
                                )}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>สต็อก{editId ? '' : 'เริ่มต้น'}</label>
                                        <input className="form-control" type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="0" />
                                    </div>
                                    <div className="form-group">
                                        <label>สต็อกขั้นต่ำ (แจ้งเตือน)</label>
                                        <input className="form-control" type="number" min="0" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} placeholder="5" />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>ยกเลิก</button>
                                <button type="submit" className="btn btn-primary">{editId ? '💾 บันทึก' : '➕ เพิ่มสินค้า'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header"><h3>⚠️ ยืนยันการลบ</h3></div>
                        <div className="modal-body" style={{ textAlign: 'center' }}>
                            <p>คุณต้องการลบสินค้านี้ใช่หรือไม่?</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>การลบจะไม่สามารถกู้คืนได้</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>ยกเลิก</button>
                            <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>🗑️ ลบสินค้า</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
