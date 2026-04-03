import { useState, useEffect } from 'react'
import { getProducts, addProduct, updateProduct, deleteProduct, formatCurrency, CATEGORIES, getCategoryEmoji, exportCSVProducts, importCSVProducts } from '../lib/storage.js'
import { uploadProductImage } from '../lib/supabaseStorage.js'
import { useToast, useAuth } from '../App.jsx'
import { canEditProducts, canSeeProfit } from '../lib/permissions.js'
import Barcode from 'react-barcode'

const emptyForm = { name: '', sku: '', barcode: '', category: '', emoji: '📦', imageUrl: '', costPrice: '', sellPrice: '', stock: '', minStock: '5', expiryDate: '' }

export default function Products() {
    const [products, setProducts] = useState([])
    const [search, setSearch] = useState('')
    const [filterCat, setFilterCat] = useState('')
    const [sortBy, setSortBy] = useState('name')
    const [showModal, setShowModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState(emptyForm)
    const [imageFile, setImageFile] = useState(null)
    const [isUploading, setIsUploading] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [printBarcodeProduct, setPrintBarcodeProduct] = useState(null)
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

    const openAdd = () => { setEditId(null); setForm(emptyForm); setImageFile(null); setShowModal(true) }

    const openEdit = (product) => {
        setEditId(product.id)
        setForm({
            name: product.name, sku: product.sku, barcode: product.barcode || '',
            category: product.category, emoji: product.emoji || '📦', imageUrl: product.imageUrl || '',
            costPrice: product.costPrice.toString(), sellPrice: product.sellPrice.toString(),
            stock: product.stock.toString(), minStock: product.minStock.toString(),
            expiryDate: product.expiryDate || '',
        })
        setImageFile(null)
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.name || !form.sellPrice) { toast('กรุณากรอกชื่อสินค้าและราคาขาย', 'error'); return }

        setIsUploading(true)
        let finalImageUrl = form.imageUrl
        if (imageFile) {
            const uploadedUrl = await uploadProductImage(imageFile)
            if (uploadedUrl) {
                finalImageUrl = uploadedUrl
            } else {
                toast('อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่', 'error')
            }
        }
        setIsUploading(false)

        const data = {
            ...form,
            imageUrl: finalImageUrl,
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

    const totalItems = products.length
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0)
    const outOfStock = products.filter(p => !p.stock || p.stock <= 0).length
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= (p.minStock || 5)).length

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                <div>
                    <h2>📦 สินค้า</h2>
                    <p>จัดการรายการสินค้าและสต็อกทั้งหมด</p>
                </div>
            </div>

            {/* Product Stats Overview */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-lg)'
            }}>
                <div className="chart-container" style={{ padding: 'var(--space-md)', textAlign: 'center', background: 'rgba(99, 102, 241, 0.05)' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '4px' }}>รายการสินค้า</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary-hover)' }}>{totalItems}</div>
                </div>
                <div className="chart-container" style={{ padding: 'var(--space-md)', textAlign: 'center', background: 'rgba(6, 182, 212, 0.05)' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '4px' }}>สต็อกรวม</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--info)' }}>{totalStock}</div>
                </div>
                <div className="chart-container" style={{ padding: 'var(--space-md)', textAlign: 'center', background: outOfStock > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-secondary)' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '4px' }}>สินค้าหมด</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: outOfStock > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{outOfStock}</div>
                </div>
                <div className="chart-container" style={{ padding: 'var(--space-md)', textAlign: 'center', background: lowStockCount > 0 ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-secondary)' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '4px' }}>สต็อกน้อย</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: lowStockCount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{lowStockCount}</div>
                </div>
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
                        {canEditProducts(role) && (
                            <>
                                <button className="btn btn-secondary" onClick={() => exportCSVProducts()} title="ส่งออก CSV">📄 ⬇️ ส่งออกสต็อก (CSV)</button>
                                <button className="btn btn-secondary" onClick={() => {
                                    const input = document.createElement('input')
                                    input.type = 'file'
                                    input.accept = '.csv'
                                    input.onchange = (e) => {
                                        const file = e.target.files[0]
                                        if (!file) return
                                        const reader = new FileReader()
                                        reader.onload = (e) => {
                                            const res = importCSVProducts(e.target.result)
                                            if (res.success) {
                                                toast(res.msg, 'success')
                                                reload()
                                            } else {
                                                toast(res.msg, 'error')
                                            }
                                        }
                                        reader.readAsText(file)
                                    }
                                    input.click()
                                }} title="นำเข้า CSV">📁 ⬆️ นำเข้าสต็อก (CSV)</button>
                                <button className="btn btn-primary" onClick={openAdd}>➕</button>
                            </>
                        )}
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
                                        <td style={{ fontSize: '1.5rem', textAlign: 'center', width: '50px' }}>
                                            {p.imageUrl ? (
                                                <img src={p.imageUrl} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                                            ) : (
                                                p.emoji || getCategoryEmoji(p.category)
                                            )}
                                        </td>
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
                                        <td style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                                            {p.stock === 0 ? <span className="badge badge-danger">หมด</span>
                                                : p.stock <= p.minStock ? <span className="badge badge-warning">ใกล้หมด</span>
                                                    : <span className="badge badge-success">ปกติ</span>}
                                            {p.expiryDate && (() => {
                                                const days = Math.ceil((new Date(p.expiryDate) - new Date()) / 86400000)
                                                if (days < 0) return <span className="badge badge-danger" style={{ fontSize: '9px' }}>⛔ หมดอายุ</span>
                                                if (days <= 7) return <span className="badge badge-warning" style={{ fontSize: '9px' }}>⚠️ อีก {days} วัน</span>
                                                if (days <= 30) return <span className="badge badge-info" style={{ fontSize: '9px' }}>📅 {days} วัน</span>
                                                return null
                                            })()}
                                        </td>
                                        <td>
                                            {canEditProducts(role) && <div className="table-actions" style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                <button className="btn btn-primary btn-sm" onClick={() => openEdit(p)} style={{ padding: '6px' }}>✏️</button>
                                                <button className="btn btn-secondary btn-sm" onClick={() => setPrintBarcodeProduct(p)} style={{ padding: '6px' }} title="พิมพ์บาร์โค้ด">🏷️</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(p.id)} style={{ padding: '6px' }}>🗑️</button>
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
                                {/* Emoji Picker / Image Upload */}
                                <div className="form-group">
                                    <label>รูปภาพสินค้า / ไอคอน</label>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                                        {form.imageUrl || imageFile ? (
                                            <img src={imageFile ? URL.createObjectURL(imageFile) : form.imageUrl} alt="Preview" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                                        ) : (
                                            <div style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                                {form.emoji}
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={e => {
                                            if (e.target.files[0]) {
                                                setImageFile(e.target.files[0])
                                                setForm({ ...form, emoji: '' })
                                            }
                                        }} style={{ fontSize: '14px' }} />
                                        {(form.imageUrl || imageFile) && (
                                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setForm({ ...form, imageUrl: '', emoji: '📦' }); setImageFile(null) }}>
                                                ลบรูป
                                            </button>
                                        )}
                                    </div>
                                    {!imageFile && !form.imageUrl && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                                            {emojis.map(e => (
                                                <button key={e} type="button"
                                                    style={{
                                                        width: '36px', height: '36px', fontSize: '1.2rem', border: form.emoji === e ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                                                        borderRadius: 'var(--radius-sm)', background: form.emoji === e ? 'rgba(99,102,241,0.15)' : 'var(--bg-input)', cursor: 'pointer'
                                                    }}
                                                    onClick={() => { setForm({ ...form, emoji: e, imageUrl: '' }); setImageFile(null) }}
                                                >{e}</button>
                                            ))}
                                        </div>
                                    )}
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
                                <div className="form-group">
                                    <label>📅 วันหมดอายุ (ถ้ามี)</label>
                                    <input className="form-control" type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" disabled={isUploading} onClick={() => setShowModal(false)}>ยกเลิก</button>
                                <button type="submit" className="btn btn-primary" disabled={isUploading}>
                                    {isUploading ? '⏳ กำลังอัปโหลด...' : editId ? '💾 บันทึก' : '➕ เพิ่มสินค้า'}
                                </button>
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

            {/* Print Barcode Modal */}
            {printBarcodeProduct && (
                <div className="modal-overlay" onClick={() => setPrintBarcodeProduct(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '350px', textAlign: 'center' }}>
                        <div className="modal-header">
                            <h3>🏷️ พิมพ์บาร์โค้ด</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setPrintBarcodeProduct(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div id="barcode-printable-area" style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: 'var(--space-md)' }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px', color: 'black' }}>
                                    {printBarcodeProduct.name}
                                </div>
                                <Barcode
                                    value={printBarcodeProduct.barcode || printBarcodeProduct.sku}
                                    format="CODE128"
                                    width={1.5}
                                    height={50}
                                    displayValue={true}
                                    fontSize={12}
                                    margin={0}
                                />
                                <div style={{ fontSize: '14px', marginTop: '5px', fontWeight: 'bold', color: 'black' }}>
                                    ราคา: {formatCurrency(printBarcodeProduct.sellPrice)}
                                </div>
                            </div>
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>* รองรับเฉพาะตัวเลขและอักษรภาษาอังกฤษเท่านั้น</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setPrintBarcodeProduct(null)}>ปิด</button>
                            <button className="btn btn-primary" onClick={() => {
                                const printContent = document.getElementById('barcode-printable-area').innerHTML
                                const originalBody = document.body.innerHTML
                                document.body.innerHTML = `<div style="text-align:center; padding: 10px;">${printContent}</div>`
                                window.print()
                                document.body.innerHTML = originalBody
                                window.location.reload()
                            }}>🖨️ พิมพ์ดวงนี้</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
