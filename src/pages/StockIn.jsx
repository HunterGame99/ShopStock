import { useState, useEffect, useCallback } from 'react'
import { getProducts, addTransaction, formatCurrency, formatDate } from '../lib/storage.js'
import { getTransactions } from '../lib/storage.js'
import { useToast } from '../App.jsx'
import BarcodeScanner from '../components/BarcodeScanner.jsx'

export default function StockIn() {
    const [products, setProducts] = useState([])
    const [items, setItems] = useState([{ productId: '', qty: '', note: '' }])
    const [note, setNote] = useState('')
    const [recentTx, setRecentTx] = useState([])
    const toast = useToast()

    const reload = () => {
        setProducts(getProducts())
        setRecentTx(getTransactions().filter(tx => tx.type === 'in').slice(0, 10))
    }
    useEffect(() => { reload() }, [])

    // Handle barcode scan — find product and add to items list
    const handleBarcodeScan = useCallback((code) => {
        const allProducts = getProducts()
        const found = allProducts.find(p =>
            p.sku.toLowerCase() === code.toLowerCase() ||
            p.barcode === code ||
            p.name.toLowerCase() === code.toLowerCase()
        ) || allProducts.find(p =>
            p.sku.toLowerCase().includes(code.toLowerCase()) ||
            p.name.toLowerCase().includes(code.toLowerCase())
        )

        if (found) {
            setItems(prev => {
                // Check if product already in list
                const existingIdx = prev.findIndex(i => i.productId === found.id)
                if (existingIdx >= 0) {
                    // Increment qty
                    const updated = [...prev]
                    updated[existingIdx] = { ...updated[existingIdx], qty: String(Number(updated[existingIdx].qty || 0) + 1) }
                    return updated
                }
                // Add new row (replace empty first row if exists)
                if (prev.length === 1 && !prev[0].productId) {
                    return [{ productId: found.id, qty: '1', note: '' }]
                }
                return [...prev, { productId: found.id, qty: '1', note: '' }]
            })
            toast(`เพิ่ม ${found.name} ในรายการ 📦`)
        } else {
            toast(`ไม่พบสินค้ารหัส "${code}"`, 'error')
        }
    }, [])

    const addRow = () => {
        setItems([...items, { productId: '', qty: '', note: '' }])
    }

    const removeRow = (index) => {
        if (items.length === 1) return
        setItems(items.filter((_, i) => i !== index))
    }

    const updateItem = (index, field, value) => {
        const updated = [...items]
        updated[index] = { ...updated[index], [field]: value }
        setItems(updated)
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        const validItems = items.filter(item => item.productId && Number(item.qty) > 0)
        if (validItems.length === 0) {
            toast('กรุณาเลือกสินค้าและจำนวน', 'error')
            return
        }

        const txItems = validItems.map(item => {
            const product = products.find(p => p.id === item.productId)
            return {
                productId: item.productId,
                productName: product?.name || '',
                qty: Number(item.qty),
                price: product?.costPrice || 0,
            }
        })

        const total = txItems.reduce((sum, i) => sum + (i.qty * i.price), 0)

        addTransaction({
            type: 'in',
            items: txItems,
            total,
            note,
        })

        toast(`รับสินค้าเข้าสำเร็จ ${validItems.length} รายการ 📥`)
        setItems([{ productId: '', qty: '', note: '' }])
        setNote('')
        reload()
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>📥 รับสินค้าเข้า</h2>
                <p>เพิ่มสต็อกสินค้าเมื่อได้รับสินค้าจากผู้จำหน่าย</p>
            </div>

            {/* Stock In Form */}
            <div className="stock-in-form">
                <h3 style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>
                    📷 Scan สินค้าเข้า
                </h3>
                <BarcodeScanner
                    onScan={handleBarcodeScan}
                    placeholder="Scan barcode / พิมพ์ SKU เพื่อเพิ่มรายการ..."
                />

                <h3 style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>
                    📋 สินค้าที่รับเข้า ({items.filter(i => i.productId).length} รายการ)
                </h3>

                <form onSubmit={handleSubmit}>
                    <div className="stock-in-items">
                        {items.map((item, index) => (
                            <div key={index} className="stock-in-item">
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    {index === 0 && <label>สินค้า</label>}
                                    <select
                                        className="form-control"
                                        value={item.productId}
                                        onChange={e => updateItem(index, 'productId', e.target.value)}
                                        required
                                    >
                                        <option value="">-- เลือกสินค้า --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} (สต็อก: {p.stock})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    {index === 0 && <label>จำนวน</label>}
                                    <input
                                        className="form-control"
                                        type="number"
                                        min="1"
                                        placeholder="0"
                                        value={item.qty}
                                        onChange={e => updateItem(index, 'qty', e.target.value)}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                                    {items.length > 1 && (
                                        <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeRow(index)}>✕</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-secondary" onClick={addRow}>
                            ➕ เพิ่มรายการ
                        </button>
                    </div>

                    <div className="form-group" style={{ marginTop: 'var(--space-lg)' }}>
                        <label>หมายเหตุ</label>
                        <input
                            className="form-control"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="เช่น รับจากผู้จำหน่าย ABC"
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                        <button type="submit" className="btn btn-primary btn-lg">
                            📥 บันทึกการรับสินค้า
                        </button>
                    </div>
                </form>
            </div>

            {/* Recent Stock In */}
            <div className="table-container">
                <div className="table-toolbar">
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>🕒 ประวัติการรับสินค้าล่าสุด</h3>
                </div>
                {recentTx.length === 0 ? (
                    <div className="table-empty">
                        <div className="empty-icon">📥</div>
                        <p>ยังไม่มีรายการรับสินค้า</p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>วันที่</th>
                                <th>รายการสินค้า</th>
                                <th>จำนวนรวม</th>
                                <th>มูลค่า</th>
                                <th>หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTx.map(tx => (
                                <tr key={tx.id}>
                                    <td>{formatDate(tx.createdAt)}</td>
                                    <td style={{ color: 'var(--text-primary)' }}>
                                        {tx.items.map(i => `${i.productName} ×${i.qty}`).join(', ')}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>
                                        {tx.items.reduce((sum, i) => sum + i.qty, 0)} ชิ้น
                                    </td>
                                    <td style={{ fontWeight: 700, color: 'var(--info)' }}>
                                        {formatCurrency(tx.total)}
                                    </td>
                                    <td style={{ color: 'var(--text-muted)' }}>{tx.note || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
