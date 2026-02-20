import { useState, useEffect, useCallback } from 'react'
import { getProducts, addProduct, addTransaction, formatCurrency, formatDate, getTransactions, playSound, getCategoryEmoji, CATEGORIES } from '../lib/storage.js'
import { useToast } from '../App.jsx'
import BarcodeScanner from '../components/BarcodeScanner.jsx'

export default function StockIn() {
    const [products, setProducts] = useState([])
    const [items, setItems] = useState([{ productId: '', qty: '', note: '' }])
    const [note, setNote] = useState('')
    const [recentTx, setRecentTx] = useState([])
    const [showAddProduct, setShowAddProduct] = useState(null)  // barcode for new product
    const [newProductForm, setNewProductForm] = useState({ name: '', sku: '', category: '', costPrice: '', sellPrice: '', minStock: '5', emoji: '📦' })
    const toast = useToast()

    const reload = () => {
        setProducts(getProducts())
        setRecentTx(getTransactions().filter(tx => tx.type === 'in').slice(0, 10))
    }
    useEffect(() => { reload() }, [])

    // Smart barcode scan handler
    const handleBarcodeScan = useCallback((code) => {
        const allProducts = getProducts()
        const found = allProducts.find(p =>
            p.sku.toLowerCase() === code.toLowerCase() || p.barcode === code
        ) || allProducts.find(p =>
            p.sku.toLowerCase().includes(code.toLowerCase()) || p.name.toLowerCase().includes(code.toLowerCase())
        )

        if (found) {
            playSound('scan')
            setItems(prev => {
                const existingIdx = prev.findIndex(i => i.productId === found.id)
                if (existingIdx >= 0) {
                    const updated = [...prev]
                    updated[existingIdx] = { ...updated[existingIdx], qty: String(Number(updated[existingIdx].qty || 0) + 1) }
                    return updated
                }
                if (prev.length === 1 && !prev[0].productId) return [{ productId: found.id, qty: '1', note: '' }]
                return [...prev, { productId: found.id, qty: '1', note: '' }]
            })
            toast(`+1 ${found.name} 📦`)
        } else {
            playSound('error')
            // Offer to add new product
            setShowAddProduct(code)
            setNewProductForm({ name: '', sku: code, barcode: code, category: '', costPrice: '', sellPrice: '', minStock: '5', emoji: '📦' })
        }
    }, [toast])

    const addRow = () => setItems([...items, { productId: '', qty: '', note: '' }])
    const removeRow = (i) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)) }
    const updateItem = (i, field, value) => { const u = [...items]; u[i] = { ...u[i], [field]: value }; setItems(u) }

    // Submit stock-in
    const handleSubmit = (e) => {
        e.preventDefault()
        const validItems = items.filter(item => item.productId && Number(item.qty) > 0)
        if (validItems.length === 0) { toast('เลือกสินค้าและจำนวน', 'error'); return }

        const txItems = validItems.map(item => {
            const product = products.find(p => p.id === item.productId)
            return { productId: item.productId, productName: product?.name || '', qty: Number(item.qty), price: product?.costPrice || 0 }
        })
        const total = txItems.reduce((s, i) => s + (i.qty * i.price), 0)

        addTransaction({ type: 'in', items: txItems, total, note })
        playSound('success')
        toast(`รับสินค้าเข้า ${validItems.length} รายการ 📥`)
        setItems([{ productId: '', qty: '', note: '' }])
        setNote('')
        reload()
    }

    // Add new product inline
    const handleAddNewProduct = (e) => {
        e.preventDefault()
        if (!newProductForm.name || !newProductForm.sellPrice) { toast('กรอกชื่อและราคาขาย', 'error'); return }
        const newP = addProduct(newProductForm)
        playSound('success')
        toast(`เพิ่มสินค้าใหม่: ${newP.name} 🎉`)
        setShowAddProduct(null)
        reload()
        // Auto-add to items
        setItems(prev => {
            if (prev.length === 1 && !prev[0].productId) return [{ productId: newP.id, qty: '1', note: '' }]
            return [...prev, { productId: newP.id, qty: '1', note: '' }]
        })
    }

    const totalCost = items.reduce((s, item) => {
        if (!item.productId || !item.qty) return s
        const product = products.find(p => p.id === item.productId)
        return s + ((product?.costPrice || 0) * Number(item.qty))
    }, 0)

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>📥 รับสินค้าเข้า</h2>
                <p>Scan barcode เพื่อเพิ่มสินค้าเข้าสต็อก</p>
            </div>

            <div className="stock-in-form">
                <h3 style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>📷 Scan สินค้า</h3>
                <BarcodeScanner onScan={handleBarcodeScan} placeholder="Scan barcode / พิมพ์ SKU เพื่อเพิ่ม..." />

                <h3 style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>
                    📋 รายการ ({items.filter(i => i.productId).length} สินค้า)
                    {totalCost > 0 && <span style={{ fontWeight: 400, fontSize: 'var(--font-size-sm)', color: 'var(--info)', marginLeft: 'var(--space-sm)' }}>ต้นทุนรวม {formatCurrency(totalCost)}</span>}
                </h3>

                <form onSubmit={handleSubmit}>
                    <div className="stock-in-items">
                        {items.map((item, index) => (
                            <div key={index} className="stock-in-item">
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    {index === 0 && <label>สินค้า</label>}
                                    <select className="form-control" value={item.productId} onChange={e => updateItem(index, 'productId', e.target.value)} required>
                                        <option value="">-- เลือกสินค้า --</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.emoji || '📦'} {p.name} (สต็อก: {p.stock})</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    {index === 0 && <label>จำนวน</label>}
                                    <input className="form-control" type="number" min="1" placeholder="0" value={item.qty} onChange={e => updateItem(index, 'qty', e.target.value)} required />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                                    {items.length > 1 && <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeRow(index)}>✕</button>}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                        <button type="button" className="btn btn-secondary" onClick={addRow}>➕ เพิ่มรายการ</button>
                    </div>

                    <div className="form-group" style={{ marginTop: 'var(--space-lg)' }}>
                        <label>หมายเหตุ</label>
                        <input className="form-control" value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น รับจากผู้จำหน่าย ABC" />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                        <button type="submit" className="btn btn-primary btn-lg">📥 บันทึก ({items.filter(i => i.productId).length} รายการ, {formatCurrency(totalCost)})</button>
                    </div>
                </form>
            </div>

            {/* Recent Stock In */}
            <div className="table-container">
                <div className="table-toolbar">
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>🕒 ประวัติล่าสุด</h3>
                </div>
                {recentTx.length === 0 ? (
                    <div className="table-empty"><div className="empty-icon">📥</div><p>ยังไม่มีรายการ</p></div>
                ) : (
                    <table>
                        <thead><tr><th>วันที่</th><th>สินค้า</th><th>จำนวน</th><th>มูลค่า</th><th>หมายเหตุ</th></tr></thead>
                        <tbody>
                            {recentTx.map(tx => (
                                <tr key={tx.id}>
                                    <td>{formatDate(tx.createdAt)}</td>
                                    <td style={{ color: 'var(--text-primary)' }}>{tx.items.map(i => `${i.productName} ×${i.qty}`).join(', ')}</td>
                                    <td style={{ fontWeight: 600 }}>{tx.items.reduce((s, i) => s + i.qty, 0)} ชิ้น</td>
                                    <td style={{ fontWeight: 700, color: 'var(--info)' }}>{formatCurrency(tx.total)}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{tx.note || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Inline Add Product Modal */}
            {showAddProduct && (
                <div className="modal-overlay" onClick={() => setShowAddProduct(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>🆕 เพิ่มสินค้าใหม่</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowAddProduct(null)}>✕</button>
                        </div>
                        <form onSubmit={handleAddNewProduct}>
                            <div className="modal-body">
                                <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'var(--info-bg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
                                    📷 Barcode <strong>{showAddProduct}</strong> ไม่มีในระบบ — เพิ่มสินค้าใหม่ได้เลย
                                </div>
                                <div className="form-group">
                                    <label>ชื่อสินค้า *</label>
                                    <input className="form-control" value={newProductForm.name} onChange={e => setNewProductForm({ ...newProductForm, name: e.target.value })} placeholder="ชื่อสินค้า" required autoFocus />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>SKU</label>
                                        <input className="form-control" value={newProductForm.sku} onChange={e => setNewProductForm({ ...newProductForm, sku: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>หมวดหมู่</label>
                                        <select className="form-control" value={newProductForm.category} onChange={e => setNewProductForm({ ...newProductForm, category: e.target.value })}>
                                            <option value="">เลือก</option>
                                            {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>ราคาทุน</label>
                                        <input className="form-control" type="number" min="0" value={newProductForm.costPrice} onChange={e => setNewProductForm({ ...newProductForm, costPrice: e.target.value })} placeholder="0" />
                                    </div>
                                    <div className="form-group">
                                        <label>ราคาขาย *</label>
                                        <input className="form-control" type="number" min="0" value={newProductForm.sellPrice} onChange={e => setNewProductForm({ ...newProductForm, sellPrice: e.target.value })} placeholder="0" required />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddProduct(null)}>ยกเลิก</button>
                                <button type="submit" className="btn btn-primary">➕ เพิ่มสินค้าใหม่</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
