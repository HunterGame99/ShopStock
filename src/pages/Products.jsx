import { useState, useEffect } from 'react'
import { getProducts, addProduct, updateProduct, deleteProduct, formatCurrency } from '../lib/storage.js'
import { useToast } from '../App.jsx'

const emptyForm = { name: '', sku: '', barcode: '', category: '', costPrice: '', sellPrice: '', stock: '', minStock: '5' }
const categories = ['เครื่องดื่ม', 'อาหาร', 'ขนม', 'เครื่องเขียน', 'ของใช้', 'อื่นๆ']

export default function Products() {
    const [products, setProducts] = useState([])
    const [search, setSearch] = useState('')
    const [filterCat, setFilterCat] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState(emptyForm)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const toast = useToast()

    const reload = () => setProducts(getProducts())
    useEffect(() => { reload() }, [])

    const filtered = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase())
        const matchCat = !filterCat || p.category === filterCat
        return matchSearch && matchCat
    })

    const openAdd = () => {
        setEditId(null)
        setForm(emptyForm)
        setShowModal(true)
    }

    const openEdit = (product) => {
        setEditId(product.id)
        setForm({
            name: product.name,
            sku: product.sku,
            barcode: product.barcode || '',
            category: product.category,
            costPrice: product.costPrice.toString(),
            sellPrice: product.sellPrice.toString(),
            stock: product.stock.toString(),
            minStock: product.minStock.toString(),
        })
        setShowModal(true)
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!form.name || !form.sellPrice) {
            toast('กรุณากรอกชื่อสินค้าและราคาขาย', 'error')
            return
        }
        if (editId) {
            updateProduct(editId, {
                ...form,
                costPrice: Number(form.costPrice),
                sellPrice: Number(form.sellPrice),
                stock: Number(form.stock),
                minStock: Number(form.minStock),
            })
            toast('แก้ไขสินค้าสำเร็จ ✏️')
        } else {
            addProduct(form)
            toast('เพิ่มสินค้าสำเร็จ 🎉')
        }
        setShowModal(false)
        reload()
    }

    const handleDelete = (id) => {
        deleteProduct(id)
        setDeleteConfirm(null)
        toast('ลบสินค้าสำเร็จ 🗑️')
        reload()
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>📦 จัดการสินค้า</h2>
                <p>เพิ่ม แก้ไข ลบ และค้นหาสินค้าในร้าน</p>
            </div>

            <div className="table-container">
                <div className="table-toolbar">
                    <div className="table-search">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="ค้นหาสินค้า..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{
                            padding: '8px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)'
                        }}>
                            <option value="">ทุกหมวดหมู่</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button className="btn btn-primary" onClick={openAdd}>
                            ➕ เพิ่มสินค้า
                        </button>
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
                                <th>สินค้า</th>
                                <th>SKU / Barcode</th>
                                <th>หมวดหมู่</th>
                                <th>ราคาทุน</th>
                                <th>ราคาขาย</th>
                                <th>สต็อก</th>
                                <th>สถานะ</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => (
                                <tr key={p.id}>
                                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.name}</td>
                                    <td>
                                        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{p.sku}</code>
                                        {p.barcode && <><br /><code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-primary-hover)' }}>📷 {p.barcode}</code></>}
                                    </td>
                                    <td><span className="badge badge-purple">{p.category}</span></td>
                                    <td>{formatCurrency(p.costPrice)}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--accent-primary-hover)' }}>{formatCurrency(p.sellPrice)}</td>
                                    <td style={{ fontWeight: 700 }}>{p.stock}</td>
                                    <td>
                                        {p.stock === 0 ? (
                                            <span className="badge badge-danger">หมดสต็อก</span>
                                        ) : p.stock <= p.minStock ? (
                                            <span className="badge badge-warning">ใกล้หมด</span>
                                        ) : (
                                            <span className="badge badge-success">ปกติ</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)} title="แก้ไข">✏️</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(p.id)} title="ลบ">🗑️</button>
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
                        <div className="modal-header">
                            <h3>{editId ? '✏️ แก้ไขสินค้า' : '➕ เพิ่มสินค้าใหม่'}</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
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
                                        <label>📷 Barcode (รหัสบาร์โค้ด)</label>
                                        <input className="form-control" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} placeholder="Scan หรือพิมพ์รหัสบาร์โค้ด" />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>หมวดหมู่</label>
                                        <select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                            <option value="">เลือกหมวดหมู่</option>
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group" />
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
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>สต็อกเริ่มต้น</label>
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
                                <button type="submit" className="btn btn-primary">{editId ? '💾 บันทึกการแก้ไข' : '➕ เพิ่มสินค้า'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>⚠️ ยืนยันการลบ</h3>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--space-md)' }}>
                                คุณต้องการลบสินค้านี้ใช่หรือไม่?
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                                การลบจะไม่สามารถกู้คืนได้
                            </p>
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
