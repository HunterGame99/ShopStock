import { useState, useEffect, useCallback } from 'react'
import { getProducts, addTransaction, formatCurrency } from '../lib/storage.js'
import { useToast } from '../App.jsx'
import BarcodeScanner from '../components/BarcodeScanner.jsx'

export default function StockOut() {
    const [products, setProducts] = useState([])
    const [search, setSearch] = useState('')
    const [cart, setCart] = useState([])
    const [showCheckout, setShowCheckout] = useState(false)
    const [payment, setPayment] = useState('')
    const [showReceipt, setShowReceipt] = useState(null)
    const toast = useToast()

    const reload = () => setProducts(getProducts())
    useEffect(() => { reload() }, [])

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    )

    // Handle barcode scan — find product by SKU or barcode and add to cart
    const handleBarcodeScan = useCallback((code) => {
        const allProducts = getProducts()
        const found = allProducts.find(p =>
            p.sku.toLowerCase() === code.toLowerCase() ||
            p.barcode === code ||
            p.name.toLowerCase() === code.toLowerCase()
        )
        if (found) {
            addToCart(found)
            toast(`เพิ่ม ${found.name} ลงตะกร้า 📦`)
        } else {
            // Try partial match
            const partial = allProducts.find(p =>
                p.sku.toLowerCase().includes(code.toLowerCase()) ||
                p.name.toLowerCase().includes(code.toLowerCase())
            )
            if (partial) {
                addToCart(partial)
                toast(`เพิ่ม ${partial.name} ลงตะกร้า 📦`)
            } else {
                toast(`ไม่พบสินค้ารหัส "${code}"`, 'error')
            }
        }
    }, [cart, products])

    const addToCart = (product) => {
        if (product.stock <= 0) return
        const existing = cart.find(c => c.productId === product.id)
        if (existing) {
            if (existing.qty >= product.stock) {
                toast('สินค้าในสต็อกไม่เพียงพอ', 'error')
                return
            }
            setCart(cart.map(c => c.productId === product.id ? { ...c, qty: c.qty + 1 } : c))
        } else {
            setCart([...cart, { productId: product.id, productName: product.name, qty: 1, price: product.sellPrice, maxStock: product.stock }])
        }
    }

    const updateCartQty = (productId, delta) => {
        setCart(cart.map(c => {
            if (c.productId === productId) {
                const newQty = c.qty + delta
                if (newQty <= 0) return null
                if (newQty > c.maxStock) {
                    toast('สินค้าในสต็อกไม่เพียงพอ', 'error')
                    return c
                }
                return { ...c, qty: newQty }
            }
            return c
        }).filter(Boolean))
    }

    const removeFromCart = (productId) => {
        setCart(cart.filter(c => c.productId !== productId))
    }

    const cartTotal = cart.reduce((sum, c) => sum + (c.qty * c.price), 0)
    const cartCount = cart.reduce((sum, c) => sum + c.qty, 0)
    const change = Number(payment) - cartTotal

    const handleCheckout = () => {
        if (cart.length === 0) {
            toast('กรุณาเพิ่มสินค้าลงตะกร้า', 'error')
            return
        }
        setPayment('')
        setShowCheckout(true)
    }

    const confirmCheckout = () => {
        if (Number(payment) < cartTotal) {
            toast('เงินไม่เพียงพอ', 'error')
            return
        }

        const tx = addTransaction({
            type: 'out',
            items: cart.map(c => ({
                productId: c.productId,
                productName: c.productName,
                qty: c.qty,
                price: c.price,
            })),
            total: cartTotal,
            payment: Number(payment),
            change: change,
            note: '',
        })

        setShowReceipt({ ...tx, payment: Number(payment), change })
        setShowCheckout(false)
        setCart([])
        setPayment('')
        toast('บันทึกการขายสำเร็จ 🎉')
        reload()
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>🛒 ขายสินค้า (POS)</h2>
                <p>เลือกสินค้าเพื่อขาย แล้วชำระเงิน</p>
            </div>

            <div className="pos-layout">
                {/* Product Grid */}
                <div className="pos-products">
                    {/* Barcode Scanner */}
                    <BarcodeScanner
                        onScan={handleBarcodeScan}
                        placeholder="Scan barcode / พิมพ์ SKU แล้วกด Enter..."
                    />

                    <div className="table-search" style={{ marginBottom: 'var(--space-md)' }}>
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="กรองรายการสินค้า..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="product-grid">
                        {filteredProducts.map(p => (
                            <div
                                key={p.id}
                                className={`product-card ${p.stock <= 0 ? 'out-of-stock' : ''}`}
                                onClick={() => addToCart(p)}
                            >
                                <div className="product-emoji">
                                    {p.category === 'เครื่องดื่ม' ? '🥤' :
                                        p.category === 'อาหาร' ? '🍜' :
                                            p.category === 'ขนม' ? '🍿' :
                                                p.category === 'เครื่องเขียน' ? '✏️' :
                                                    p.category === 'ของใช้' ? '🧴' : '📦'}
                                </div>
                                <div className="product-name">{p.name}</div>
                                <div className="product-price">{formatCurrency(p.sellPrice)}</div>
                                <div className="product-stock-info">
                                    {p.stock <= 0 ? (
                                        <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>หมดสต็อก</span>
                                    ) : (
                                        `เหลือ ${p.stock} ชิ้น`
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredProducts.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-2xl)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🔍</div>
                            ไม่พบสินค้า
                        </div>
                    )}
                </div>

                {/* Cart Panel */}
                <div className="cart-panel">
                    <div className="cart-header">
                        <h3>🛒 ตะกร้า</h3>
                        <span className="badge badge-purple">{cartCount} ชิ้น</span>
                    </div>

                    <div className="cart-items">
                        {cart.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🛒</div>
                                <p style={{ fontSize: 'var(--font-size-sm)' }}>ยังไม่มีสินค้าในตะกร้า</p>
                                <p style={{ fontSize: 'var(--font-size-xs)' }}>คลิกที่สินค้าเพื่อเพิ่ม</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.productId} className="cart-item">
                                    <div className="cart-item-info">
                                        <div className="cart-item-name">{item.productName}</div>
                                        <div className="cart-item-price">{formatCurrency(item.price)} × {item.qty}</div>
                                    </div>
                                    <div className="cart-item-qty">
                                        <button onClick={() => updateCartQty(item.productId, -1)}>−</button>
                                        <span>{item.qty}</span>
                                        <button onClick={() => updateCartQty(item.productId, 1)}>+</button>
                                    </div>
                                    <button className="btn btn-ghost btn-sm" onClick={() => removeFromCart(item.productId)} style={{ color: 'var(--danger)', padding: '4px' }}>✕</button>
                                </div>
                            ))
                        )}
                    </div>

                    {cart.length > 0 && (
                        <>
                            <div className="cart-summary">
                                <div className="cart-summary-row">
                                    <span>จำนวนสินค้า</span>
                                    <span>{cartCount} ชิ้น</span>
                                </div>
                                <div className="cart-summary-row total">
                                    <span>ยอดรวม</span>
                                    <span>{formatCurrency(cartTotal)}</span>
                                </div>
                            </div>
                            <div className="cart-checkout">
                                <button className="btn btn-success" onClick={handleCheckout}>
                                    💳 ชำระเงิน {formatCurrency(cartTotal)}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Checkout Modal */}
            {showCheckout && (
                <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>💳 ชำระเงิน</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowCheckout(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="checkout-total">
                                <div className="total-label">ยอดที่ต้องชำระ</div>
                                <div className="total-amount">{formatCurrency(cartTotal)}</div>
                            </div>

                            <div className="form-group" style={{ marginTop: 'var(--space-lg)' }}>
                                <label>💵 เงินที่รับมา (บาท)</label>
                                <input
                                    className="form-control"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={payment}
                                    onChange={e => setPayment(e.target.value)}
                                    placeholder="กรอกจำนวนเงิน"
                                    autoFocus
                                    style={{ fontSize: 'var(--font-size-xl)', textAlign: 'center', fontWeight: 700 }}
                                />
                            </div>

                            {payment && (
                                <div className={`change-display ${Number(payment) < cartTotal ? 'insufficient' : ''}`}>
                                    <div className="change-label">
                                        {Number(payment) >= cartTotal ? '💰 เงินทอน' : '⚠️ เงินไม่พอ'}
                                    </div>
                                    <div className="change-amount">
                                        {Number(payment) >= cartTotal
                                            ? formatCurrency(change)
                                            : `ขาดอีก ${formatCurrency(cartTotal - Number(payment))}`
                                        }
                                    </div>
                                </div>
                            )}

                            {/* Quick payment buttons */}
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)', flexWrap: 'wrap' }}>
                                {[cartTotal, 20, 50, 100, 500, 1000].map(amount => (
                                    <button
                                        key={amount}
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setPayment(amount.toString())}
                                    >
                                        {amount === cartTotal ? 'พอดี' : formatCurrency(amount)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowCheckout(false)}>ยกเลิก</button>
                            <button
                                className="btn btn-success btn-lg"
                                onClick={confirmCheckout}
                                disabled={!payment || Number(payment) < cartTotal}
                            >
                                ✅ ยืนยันการชำระ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {showReceipt && (
                <div className="modal-overlay" onClick={() => setShowReceipt(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>🧾 ใบเสร็จ</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowReceipt(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="receipt">
                                <h4>🏪 ShopStock</h4>
                                <div className="receipt-line"></div>
                                {showReceipt.items.map((item, i) => (
                                    <div key={i} className="receipt-row">
                                        <span>{item.productName} ×{item.qty}</span>
                                        <span>{formatCurrency(item.qty * item.price)}</span>
                                    </div>
                                ))}
                                <div className="receipt-line"></div>
                                <div className="receipt-row receipt-total">
                                    <span>รวม</span>
                                    <span>{formatCurrency(showReceipt.total)}</span>
                                </div>
                                <div className="receipt-row">
                                    <span>รับเงิน</span>
                                    <span>{formatCurrency(showReceipt.payment)}</span>
                                </div>
                                <div className="receipt-row receipt-total">
                                    <span>เงินทอน</span>
                                    <span>{formatCurrency(showReceipt.change)}</span>
                                </div>
                                <div className="receipt-line"></div>
                                <div style={{ textAlign: 'center', fontSize: '10px', color: '#888' }}>
                                    ขอบคุณที่ใช้บริการ<br />
                                    {new Date(showReceipt.createdAt).toLocaleString('th-TH')}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={() => setShowReceipt(null)}>ปิด</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
