import { useState, useEffect, useCallback } from 'react'
import { getProducts, addTransaction, getCustomers, formatCurrency, playSound, getTopProducts, getCategoryEmoji, applyPromotions, getPromotions } from '../lib/storage.js'
import { useToast } from '../App.jsx'
import BarcodeScanner from '../components/BarcodeScanner.jsx'

export default function StockOut() {
    const [products, setProducts] = useState([])
    const [search, setSearch] = useState('')
    const [cart, setCart] = useState([])
    const [discount, setDiscount] = useState('')
    const [discountType, setDiscountType] = useState('baht')
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [showCheckout, setShowCheckout] = useState(false)
    const [payment, setPayment] = useState('')
    const [showReceipt, setShowReceipt] = useState(null)
    const [quickKeys, setQuickKeys] = useState([])
    const [customers, setCustomers] = useState([])
    const [selectedCustomer, setSelectedCustomer] = useState('')
    const [promoDiscount, setPromoDiscount] = useState(0)
    const toast = useToast()

    const reload = () => {
        const allProducts = getProducts()
        setProducts(allProducts)
        const top = getTopProducts(30, 6)
        setQuickKeys(top.map(t => allProducts.find(p => p.id === t.id)).filter(Boolean))
        setCustomers(getCustomers())
    }
    useEffect(() => { reload() }, [])

    // Recalculate promo discount when cart changes
    useEffect(() => {
        if (cart.length > 0) {
            setPromoDiscount(applyPromotions(cart))
        } else {
            setPromoDiscount(0)
        }
    }, [cart])

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search)
    )

    const addToCart = useCallback((product) => {
        if (product.stock <= 0) { toast('สินค้าหมดสต็อก', 'error'); playSound('error'); return }
        setCart(prev => {
            const existing = prev.find(c => c.productId === product.id)
            if (existing) {
                if (existing.qty >= product.stock) { toast('สต็อกไม่เพียงพอ', 'error'); return prev }
                return prev.map(c => c.productId === product.id ? { ...c, qty: c.qty + 1 } : c)
            }
            return [...prev, { productId: product.id, productName: product.name, qty: 1, price: product.sellPrice, maxStock: product.stock, emoji: product.emoji }]
        })
        playSound('scan')
    }, [toast])

    const handleBarcodeScan = useCallback((code) => {
        const allProducts = getProducts()
        const found = allProducts.find(p => p.sku.toLowerCase() === code.toLowerCase() || p.barcode === code) || allProducts.find(p => p.sku.toLowerCase().includes(code.toLowerCase()) || p.name.toLowerCase().includes(code.toLowerCase()))
        if (found) { addToCart(found); toast(`เพิ่ม ${found.name} 📦`) } else { toast(`ไม่พบสินค้า "${code}"`, 'error'); playSound('error') }
    }, [addToCart, toast])

    const updateCartQty = (productId, delta) => {
        setCart(cart.map(c => {
            if (c.productId !== productId) return c
            const newQty = c.qty + delta
            if (newQty <= 0) return null
            if (newQty > c.maxStock) { toast('สต็อกไม่เพียงพอ', 'error'); return c }
            return { ...c, qty: newQty }
        }).filter(Boolean))
    }

    const removeFromCart = (productId) => setCart(cart.filter(c => c.productId !== productId))

    const subtotal = cart.reduce((s, c) => s + (c.qty * c.price), 0)
    const manualDiscount = discountType === 'percent' ? subtotal * (Number(discount) || 0) / 100 : (Number(discount) || 0)
    const totalDiscount = manualDiscount + promoDiscount
    const cartTotal = Math.max(0, subtotal - totalDiscount)
    const cartCount = cart.reduce((s, c) => s + c.qty, 0)
    const change = Number(payment) - cartTotal
    const activePromos = getPromotions().filter(p => p.active)

    const handleCheckout = () => {
        if (cart.length === 0) { toast('เพิ่มสินค้าลงตะกร้า', 'error'); return }
        setPayment(paymentMethod === 'cash' ? '' : cartTotal.toString())
        setShowCheckout(true)
    }

    const confirmCheckout = () => {
        const payAmount = Number(payment)
        if (paymentMethod === 'cash' && payAmount < cartTotal) { toast('เงินไม่เพียงพอ', 'error'); return }
        const tx = addTransaction({
            type: 'out', items: cart.map(c => ({ productId: c.productId, productName: c.productName, qty: c.qty, price: c.price })),
            total: cartTotal, subtotal, discount: totalDiscount, payment: payAmount,
            change: paymentMethod === 'cash' ? payAmount - cartTotal : 0, paymentMethod,
            customerId: selectedCustomer || null, note: '',
        })
        playSound('success')
        setShowReceipt({ ...tx, payment: payAmount, change: paymentMethod === 'cash' ? payAmount - cartTotal : 0 })
        setShowCheckout(false); setCart([]); setDiscount(''); setPayment(''); setSelectedCustomer('')
        toast('ขายสำเร็จ! 🎉'); reload()
    }

    // Voice search
    const startVoiceSearch = () => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) { toast('เบราว์เซอร์ไม่รองรับ', 'error'); return }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.lang = 'th-TH'
        recognition.continuous = false
        recognition.onresult = (e) => { setSearch(e.results[0][0].transcript); toast(`🗣️ "${e.results[0][0].transcript}"`) }
        recognition.onerror = () => toast('ลองพูดใหม่อีกครั้ง', 'error')
        recognition.start()
        toast('🎤 พูดชื่อสินค้า...')
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>🛒 ขายสินค้า (POS)</h2>
                <p>Scan / พูด / เลือกสินค้า → ชำระเงิน</p>
            </div>

            <div className="pos-layout">
                <div className="pos-products">
                    <BarcodeScanner onScan={handleBarcodeScan} placeholder="📷 Scan barcode / พิมพ์ SKU..." />

                    {quickKeys.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)', fontWeight: 600 }}>⚡ สินค้าขายดี</div>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                {quickKeys.map(p => (
                                    <button key={p.id} className="btn btn-secondary btn-sm" onClick={() => addToCart(p)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {p.emoji || '📦'} {p.name.length > 10 ? p.name.slice(0, 10) + '…' : p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                        <div className="table-search" style={{ flex: 1 }}>
                            <span className="search-icon">🔍</span>
                            <input type="text" placeholder="กรองสินค้า..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <button className="btn btn-secondary" onClick={startVoiceSearch} title="ค้นหาด้วยเสียง">🎤</button>
                    </div>

                    <div className="product-grid">
                        {filteredProducts.map(p => (
                            <div key={p.id} className={`product-card ${p.stock <= 0 ? 'out-of-stock' : ''}`} onClick={() => addToCart(p)}>
                                <div className="product-emoji">{p.emoji || getCategoryEmoji(p.category)}</div>
                                <div className="product-name">{p.name}</div>
                                <div className="product-price">{formatCurrency(p.sellPrice)}</div>
                                <div className="product-stock-info">{p.stock <= 0 ? <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>หมด</span> : `เหลือ ${p.stock}`}</div>
                            </div>
                        ))}
                    </div>
                    {filteredProducts.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-2xl)' }}>🔍 ไม่พบสินค้า</div>}
                </div>

                <div className="cart-panel">
                    <div className="cart-header">
                        <h3>🛒 ตะกร้า</h3>
                        <span className="badge badge-purple">{cartCount} ชิ้น</span>
                    </div>

                    {/* Customer select */}
                    <div style={{ padding: 'var(--space-sm) var(--space-md)', borderBottom: '1px solid var(--border)' }}>
                        <select className="form-control" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} style={{ padding: '6px 10px', fontSize: 'var(--font-size-xs)' }}>
                            <option value="">👤 ลูกค้าทั่วไป</option>
                            {customers.map(c => <option key={c.id} value={c.id}>👤 {c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                        </select>
                    </div>

                    <div className="cart-items">
                        {cart.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)', opacity: 0.5 }}>🛒</div>
                                <p style={{ fontSize: 'var(--font-size-sm)' }}>Scan / พูด / คลิกสินค้า</p>
                            </div>
                        ) : cart.map(item => (
                            <div key={item.productId} className="cart-item">
                                <span style={{ fontSize: '1.2rem' }}>{item.emoji || '📦'}</span>
                                <div className="cart-item-info">
                                    <div className="cart-item-name">{item.productName}</div>
                                    <div className="cart-item-price">{formatCurrency(item.price)} × {item.qty} = {formatCurrency(item.price * item.qty)}</div>
                                </div>
                                <div className="cart-item-qty">
                                    <button onClick={() => updateCartQty(item.productId, -1)}>−</button>
                                    <span>{item.qty}</span>
                                    <button onClick={() => updateCartQty(item.productId, 1)}>+</button>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => removeFromCart(item.productId)} style={{ color: 'var(--danger)', padding: '4px' }}>✕</button>
                            </div>
                        ))}
                    </div>

                    {cart.length > 0 && (
                        <>
                            <div style={{ padding: 'var(--space-sm) var(--space-md)', borderTop: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>🏷️ ส่วนลด</span>
                                    <input className="form-control" type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" style={{ padding: '6px 8px', fontSize: 'var(--font-size-xs)', width: '70px' }} />
                                    <select className="form-control" value={discountType} onChange={e => setDiscountType(e.target.value)} style={{ padding: '6px 8px', fontSize: 'var(--font-size-xs)', width: 'auto' }}>
                                        <option value="baht">บาท</option>
                                        <option value="percent">%</option>
                                    </select>
                                </div>
                            </div>

                            <div className="cart-summary">
                                <div className="cart-summary-row"><span>ราคาสินค้า</span><span>{formatCurrency(subtotal)}</span></div>
                                {manualDiscount > 0 && <div className="cart-summary-row" style={{ color: 'var(--danger)' }}><span>ส่วนลด</span><span>-{formatCurrency(manualDiscount)}</span></div>}
                                {promoDiscount > 0 && <div className="cart-summary-row" style={{ color: 'var(--danger)' }}><span>🏷️ โปรโมชั่น</span><span>-{formatCurrency(promoDiscount)}</span></div>}
                                <div className="cart-summary-row total"><span>ยอดรวม</span><span>{formatCurrency(cartTotal)}</span></div>
                            </div>

                            {activePromos.length > 0 && promoDiscount > 0 && (
                                <div style={{ padding: '4px var(--space-md)', fontSize: 'var(--font-size-xs)', color: 'var(--success)' }}>
                                    🏷️ {activePromos.filter(p => p.active).map(p => p.name).join(', ')}
                                </div>
                            )}

                            <div className="cart-checkout">
                                <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
                                    {[{ key: 'cash', icon: '💵', label: 'เงินสด' }, { key: 'transfer', icon: '📱', label: 'โอน' }, { key: 'qr', icon: '📲', label: 'QR' }].map(m => (
                                        <button key={m.key} className={`btn btn-sm ${paymentMethod === m.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPaymentMethod(m.key)} style={{ flex: 1, justifyContent: 'center' }}>
                                            {m.icon} {m.label}
                                        </button>
                                    ))}
                                </div>
                                <button className="btn btn-success" onClick={handleCheckout} style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
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
                        <div className="modal-header"><h3>💳 ชำระเงิน</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowCheckout(false)}>✕</button></div>
                        <div className="modal-body">
                            <div className="checkout-total"><div className="total-label">ยอดที่ต้องชำระ</div><div className="total-amount">{formatCurrency(cartTotal)}</div></div>
                            {paymentMethod === 'cash' ? (
                                <>
                                    <div className="form-group" style={{ marginTop: 'var(--space-lg)' }}>
                                        <label>💵 เงินที่รับมา</label>
                                        <input className="form-control" type="number" min="0" value={payment} onChange={e => setPayment(e.target.value)} placeholder="กรอกจำนวนเงิน" autoFocus style={{ fontSize: 'var(--font-size-xl)', textAlign: 'center', fontWeight: 700 }} />
                                    </div>
                                    {payment && <div className={`change-display ${Number(payment) < cartTotal ? 'insufficient' : ''}`}><div className="change-label">{Number(payment) >= cartTotal ? '💰 เงินทอน' : '⚠️ เงินไม่พอ'}</div><div className="change-amount">{Number(payment) >= cartTotal ? formatCurrency(change) : `ขาดอีก ${formatCurrency(cartTotal - Number(payment))}`}</div></div>}
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)', flexWrap: 'wrap' }}>
                                        {[cartTotal, 20, 50, 100, 500, 1000].map(a => (
                                            <button key={a} className="btn btn-secondary btn-sm" onClick={() => setPayment(a.toString())}>{a === cartTotal ? '💵 พอดี' : formatCurrency(a)}</button>
                                        ))}
                                    </div>
                                </>
                            ) : <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-secondary)' }}><div style={{ fontSize: '3rem', marginBottom: 'var(--space-sm)' }}>{paymentMethod === 'transfer' ? '📱' : '📲'}</div><p>กดยืนยันเมื่อได้รับเงินแล้ว</p></div>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowCheckout(false)}>ยกเลิก</button>
                            <button className="btn btn-success btn-lg" onClick={confirmCheckout} disabled={paymentMethod === 'cash' && (!payment || Number(payment) < cartTotal)}>✅ ยืนยัน</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {showReceipt && (
                <div className="modal-overlay" onClick={() => setShowReceipt(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header"><h3>🧾 ใบเสร็จ</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowReceipt(null)}>✕</button></div>
                        <div className="modal-body">
                            <div className="receipt">
                                <h4>🏪 ShopStock</h4>
                                <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '8px' }}>{new Date(showReceipt.createdAt).toLocaleString('th-TH')}</div>
                                <div className="receipt-line" />
                                {showReceipt.items.map((item, i) => (<div key={i} className="receipt-row"><span>{item.productName} ×{item.qty}</span><span>{formatCurrency(item.qty * item.price)}</span></div>))}
                                <div className="receipt-line" />
                                {showReceipt.discount > 0 && <div className="receipt-row"><span>ส่วนลด</span><span>-{formatCurrency(showReceipt.discount)}</span></div>}
                                <div className="receipt-row receipt-total"><span>รวม</span><span>{formatCurrency(showReceipt.total)}</span></div>
                                <div className="receipt-row"><span>ชำระ</span><span>{formatCurrency(showReceipt.payment)}</span></div>
                                {showReceipt.change > 0 && <div className="receipt-row receipt-total"><span>เงินทอน</span><span>{formatCurrency(showReceipt.change)}</span></div>}
                                <div className="receipt-line" />
                                <div style={{ textAlign: 'center', fontSize: '10px', color: '#888' }}>ขอบคุณที่ใช้บริการ ❤️</div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => window.print()}>🖨️ พิมพ์</button>
                            <button className="btn btn-primary" onClick={() => setShowReceipt(null)}>ปิด</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
