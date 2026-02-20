import { useState, useEffect, useCallback } from 'react'
import { getProducts, addTransaction, getCustomers, formatCurrency, formatDate, playSound, getTopProducts, getCategoryEmoji, applyPromotions, getPromotions, CATEGORIES, holdBill, getHeldBills, resumeBill, deleteHeldBill, getRecentSales, addCredit, getUnpaidCredits, getSettings } from '../lib/storage.js'
import { useToast, useShift } from '../App.jsx'
import BarcodeScanner from '../components/BarcodeScanner.jsx'
import { Link } from 'react-router-dom'

export default function StockOut() {
    const { activeShift } = useShift()
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
    const [activeTab, setActiveTab] = useState('ทั้งหมด')
    const [heldBills, setHeldBills] = useState([])
    const [recentSales, setRecentSales] = useState([])
    const [showHeld, setShowHeld] = useState(false)
    const [showRecent, setShowRecent] = useState(false)
    const [showNumpad, setShowNumpad] = useState(false)
    const [numpadTarget, setNumpadTarget] = useState(null)
    const [numpadValue, setNumpadValue] = useState('')
    const [settings, setSettings] = useState({ shopName: 'ShopStock', shopAddress: '', shopPhone: '', receiptFooter: 'ขอบคุณที่ใช้บริการ ❤️', vatEnabled: false, vatRate: 7 })
    const toast = useToast()

    // Preview points: 25 THB = 1 Point
    const selectedCustomerData = customers.find(c => c.id === selectedCustomer)
    const pointsToEarn = Math.floor((cart.reduce((s, c) => s + (c.qty * c.price), 0) - (Number(discount) || 0) - promoDiscount) / 25)

    const reload = () => {
        const allProducts = getProducts()
        setProducts(allProducts)
        const top = getTopProducts(30, 6)
        setQuickKeys(top.map(t => allProducts.find(p => p.id === t.id)).filter(Boolean))
        setCustomers(getCustomers())
        setHeldBills(getHeldBills())
        setRecentSales(getRecentSales(5))
        setSettings(prev => ({ ...prev, ...getSettings() }))
    }
    useEffect(() => { reload() }, [])

    useEffect(() => { setPromoDiscount(cart.length > 0 ? applyPromotions(cart) : 0) }, [cart])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return
            if (e.key === 'F1') { e.preventDefault(); if (cart.length > 0) handleCheckout() }
            if (e.key === 'F2') { e.preventDefault(); if (cart.length > 0) handleHoldBill() }
            if (e.key === 'F3') { e.preventDefault(); setShowHeld(true) }
            if (e.key === 'Escape') { e.preventDefault(); setCart([]); setDiscount(''); setSelectedCustomer(''); toast('ล้างตะกร้า') }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [cart])

    const categoryTabs = ['ทั้งหมด', ...CATEGORIES.map(c => c.name)]

    const filteredProducts = products.filter(p => {
        const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search)
        const matchTab = activeTab === 'ทั้งหมด' || p.category === activeTab
        return matchSearch && matchTab
    })

    const addToCart = useCallback((product) => {
        if (!activeShift) { toast('กรุณาเปิดกะก่อนขายสินค้า', 'error'); return }
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
            if (newQty > c.maxStock) { toast('สต็อกไม่พอ', 'error'); return c }
            return { ...c, qty: newQty }
        }).filter(Boolean))
    }

    const removeFromCart = (productId) => setCart(cart.filter(c => c.productId !== productId))

    const subtotal = cart.reduce((s, c) => s + (c.qty * c.price), 0)
    const manualDiscount = discountType === 'percent' ? subtotal * (Number(discount) || 0) / 100 : (Number(discount) || 0)
    const totalDiscount = manualDiscount + promoDiscount
    const cartTotal = Math.max(0, subtotal - totalDiscount)
    const vatAmount = settings.vatEnabled ? (cartTotal * settings.vatRate / (100 + settings.vatRate)) : 0
    const netAmount = cartTotal - vatAmount
    const cartCount = cart.reduce((s, c) => s + c.qty, 0)
    const change = Number(payment) - cartTotal
    const activePromos = getPromotions().filter(p => p.active)

    // Hold bill
    const handleHoldBill = () => {
        holdBill(cart, selectedCustomer, '')
        toast('📋 พักบิลแล้ว')
        playSound('scan')
        setCart([]); setDiscount(''); setSelectedCustomer('')
        reload()
    }

    // Resume held bill
    const handleResumeBill = (billId) => {
        const bill = resumeBill(billId)
        if (bill) {
            setCart(bill.cart)
            if (bill.customerId) setSelectedCustomer(bill.customerId)
            toast('📋 เรียกบิลกลับมา')
            setShowHeld(false)
            reload()
        }
    }

    // Credit sale
    const handleCreditSale = () => {
        if (!selectedCustomer) { toast('เลือกลูกค้าก่อนขายเชื่อ', 'error'); return }
        if (cart.length === 0) { toast('เพิ่มสินค้า', 'error'); return }
        const tx = addTransaction({
            type: 'out', items: cart.map(c => ({ productId: c.productId, productName: c.productName, qty: c.qty, price: c.price })),
            total: cartTotal, subtotal, discount: totalDiscount, payment: 0,
            change: 0, paymentMethod: 'credit', customerId: selectedCustomer, note: 'เงินเชื่อ',
        })
        addCredit(selectedCustomer, cartTotal, cart.map(c => ({ productName: c.productName, qty: c.qty, price: c.price })), `บิล #${tx.id.slice(-6)}`)
        playSound('success')
        toast('💳 บันทึกเงินเชื่อสำเร็จ')
        setCart([]); setDiscount(''); setSelectedCustomer('')
        reload()
    }

    const handleCheckout = () => {
        if (!activeShift) { toast('กรุณาเปิดกะก่อนขายสินค้า', 'error'); return }
        if (cart.length === 0) { toast('เพิ่มสินค้า', 'error'); return }
        setPayment(paymentMethod === 'cash' ? '' : cartTotal.toString())
        setShowCheckout(true)
    }

    const confirmCheckout = () => {
        const payAmount = Number(payment)
        if (paymentMethod === 'cash' && payAmount < cartTotal) { toast('เงินไม่พอ', 'error'); return }
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
        recognition.lang = 'th-TH'; recognition.continuous = false
        recognition.onresult = (e) => { setSearch(e.results[0][0].transcript); toast(`🗣️ "${e.results[0][0].transcript}"`) }
        recognition.onerror = () => toast('ลองใหม่', 'error')
        recognition.start(); toast('🎤 พูดชื่อสินค้า...')
    }

    // Numpad
    const numpadPress = (key) => {
        if (key === 'C') { setNumpadValue(''); return }
        if (key === '⌫') { setNumpadValue(v => v.slice(0, -1)); return }
        if (key === '✓') {
            if (numpadTarget === 'payment') setPayment(numpadValue)
            else if (numpadTarget === 'discount') setDiscount(numpadValue)
            setShowNumpad(false); setNumpadValue(''); return
        }
        setNumpadValue(v => v + key)
    }

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                <div>
                    <h2>🛒 ขายสินค้า (POS)</h2>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        <kbd>F1</kbd> ชำระ &nbsp; <kbd>F2</kbd> พักบิล &nbsp; <kbd>F3</kbd> เรียกบิล &nbsp; <kbd>Esc</kbd> ล้าง
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowHeld(true)} style={{ position: 'relative' }}>
                        📋 พักบิล {heldBills.length > 0 && <span className="notification-dot" style={{ position: 'static', marginLeft: '4px' }}>{heldBills.length}</span>}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowRecent(true)}>🧾 รายการล่าสุด</button>
                </div>
            </div>

            <div className="pos-layout">
                {/* LEFT: Products */}
                <div className="pos-products">
                    <BarcodeScanner onScan={handleBarcodeScan} placeholder="📷 Scan barcode / พิมพ์ SKU..." />

                    {/* Quick Keys */}
                    {quickKeys.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-sm)' }}>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>⚡ สินค้าขายดี</div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {quickKeys.map(p => (
                                    <button key={p.id} className="btn btn-secondary btn-sm" onClick={() => addToCart(p)}>
                                        {p.emoji || '📦'} {p.name.length > 8 ? p.name.slice(0, 8) + '…' : p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Category Tabs */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: 'var(--space-sm)', overflowX: 'auto', paddingBottom: '4px' }}>
                        {categoryTabs.map(tab => (
                            <button key={tab} className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => { setActiveTab(tab); setSearch('') }}
                                style={{ whiteSpace: 'nowrap', fontSize: 'var(--font-size-xs)' }}>
                                {tab === 'ทั้งหมด' ? '🏷️' : CATEGORIES.find(c => c.name === tab)?.emoji || '📦'} {tab}
                            </button>
                        ))}
                    </div>

                    {/* Search + Voice */}
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                        <div className="table-search" style={{ flex: 1 }}>
                            <span className="search-icon">🔍</span>
                            <input type="text" placeholder="ค้นหาสินค้า..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <button className="btn btn-secondary" onClick={startVoiceSearch} title="ค้นหาด้วยเสียง">🎤</button>
                    </div>

                    {/* Product Grid */}
                    <div className="product-grid">
                        {filteredProducts.map(p => (
                            <div key={p.id} className={`product-card ${p.stock <= 0 ? 'out-of-stock' : ''}`} onClick={() => addToCart(p)}>
                                <div className="product-emoji">{p.emoji || getCategoryEmoji(p.category)}</div>
                                <div className="product-name">{p.name}</div>
                                <div className="product-price">{formatCurrency(p.sellPrice)}</div>
                                <div className="product-stock-info">{p.stock <= 0 ? <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.65rem' }}>หมด</span> : `เหลือ ${p.stock}`}</div>
                            </div>
                        ))}
                    </div>
                    {filteredProducts.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>🔍 ไม่พบสินค้า</div>}
                </div>

                {/* RIGHT: Cart */}
                <div className="cart-panel">
                    <div className="cart-header">
                        <h3>🛒 ตะกร้า</h3>
                        <span className="badge badge-purple">{cartCount} ชิ้น</span>
                    </div>

                    {/* Customer */}
                    <div style={{ padding: '6px var(--space-md)', borderBottom: '1px solid var(--border)' }}>
                        <select className="form-control" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} style={{ padding: '6px 10px', fontSize: 'var(--font-size-xs)' }}>
                            <option value="">👤 ลูกค้าทั่วไป</option>
                            {customers.map(c => <option key={c.id} value={c.id}>👤 {c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                        </select>
                        {selectedCustomerData && (
                            <div className="loyalty-badge" style={{ marginTop: '4px' }}>
                                🪙 คะแนนสะสม: {selectedCustomerData.points || 0}
                            </div>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className="cart-items">
                        {cart.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-lg)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.5 }}>🛒</div>
                                <p style={{ fontSize: 'var(--font-size-xs)' }}>Scan / พูด / คลิกสินค้า</p>
                            </div>
                        ) : cart.map(item => (
                            <div key={item.productId} className="cart-item">
                                <span style={{ fontSize: '1.1rem' }}>{item.emoji || '📦'}</span>
                                <div className="cart-item-info">
                                    <div className="cart-item-name">{item.productName}</div>
                                    <div className="cart-item-price">{formatCurrency(item.price)} × {item.qty}</div>
                                </div>
                                <div className="cart-item-qty">
                                    <button onClick={() => updateCartQty(item.productId, -1)}>−</button>
                                    <span>{item.qty}</span>
                                    <button onClick={() => updateCartQty(item.productId, 1)}>+</button>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => removeFromCart(item.productId)} style={{ color: 'var(--danger)', padding: '2px' }}>✕</button>
                            </div>
                        ))}
                    </div>

                    {cart.length > 0 && (
                        <>
                            {/* Shift Warning / Points Preview */}
                            <div style={{ padding: '6px var(--space-md)', background: !activeShift ? 'var(--danger-bg)' : 'transparent' }}>
                                {!activeShift ? (
                                    <div style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 800, textAlign: 'center' }}>
                                        ⚠️ ยังไม่เปิดกะ <Link to="/shifts" style={{ textDecoration: 'underline' }}>เริ่มกะเลย</Link>
                                    </div>
                                ) : selectedCustomer && pointsToEarn > 0 && (
                                    <div style={{ fontSize: '11px', color: 'var(--warning)', fontWeight: 800, textAlign: 'center' }}>
                                        ✨ บิลนี้จะได้รับ {pointsToEarn} คะแนน
                                    </div>
                                )}
                            </div>

                            {/* Discount */}
                            <div style={{ padding: '4px var(--space-md)', borderTop: '1px solid var(--border)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>🏷️</span>
                                <input className="form-control" type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="ส่วนลด" style={{ padding: '5px 8px', fontSize: 'var(--font-size-xs)', width: '70px' }} />
                                <select className="form-control" value={discountType} onChange={e => setDiscountType(e.target.value)} style={{ padding: '5px 8px', fontSize: 'var(--font-size-xs)', width: 'auto' }}>
                                    <option value="baht">฿</option><option value="percent">%</option>
                                </select>
                                <button className="btn btn-ghost btn-sm" onClick={() => { setNumpadTarget('discount'); setNumpadValue(discount); setShowNumpad(true) }} title="Numpad" style={{ padding: '4px' }}>🔢</button>
                            </div>

                            {/* Summary */}
                            <div className="cart-summary">
                                <div className="cart-summary-row"><span>ราคาสินค้า</span><span>{formatCurrency(subtotal)}</span></div>
                                {manualDiscount > 0 && <div className="cart-summary-row" style={{ color: 'var(--danger)' }}><span>ส่วนลด</span><span>-{formatCurrency(manualDiscount)}</span></div>}
                                {promoDiscount > 0 && <div className="cart-summary-row" style={{ color: 'var(--danger)' }}><span>🏷️ โปรโมชั่น</span><span>-{formatCurrency(promoDiscount)}</span></div>}
                                <div className="cart-summary-row total"><span>ยอดรวม</span><span>{formatCurrency(cartTotal)}</span></div>
                            </div>

                            {/* Action Buttons */}
                            <div className="cart-checkout">
                                <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                                    {[{ key: 'cash', icon: '💵', label: 'สด' }, { key: 'transfer', icon: '📱', label: 'โอน' }, { key: 'qr', icon: '📲', label: 'QR' }].map(m => (
                                        <button key={m.key} className={`btn btn-sm ${paymentMethod === m.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPaymentMethod(m.key)} style={{ flex: 1, justifyContent: 'center', fontSize: 'var(--font-size-xs)' }}>
                                            {m.icon} {m.label}
                                        </button>
                                    ))}
                                </div>
                                <button className="btn btn-success" onClick={handleCheckout} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                                    💳 ชำระ {formatCurrency(cartTotal)} <kbd style={{ marginLeft: '6px', fontSize: '0.6rem', opacity: 0.7 }}>F1</kbd>
                                </button>
                                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={handleHoldBill} style={{ flex: 1, justifyContent: 'center', fontSize: 'var(--font-size-xs)' }}>📋 พักบิล <kbd style={{ fontSize: '0.5rem', opacity: 0.6 }}>F2</kbd></button>
                                    {selectedCustomer && <button className="btn btn-secondary btn-sm" onClick={handleCreditSale} style={{ flex: 1, justifyContent: 'center', fontSize: 'var(--font-size-xs)' }}>💳 เงินเชื่อ</button>}
                                </div>
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
                                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                            <input className="form-control" type="number" min="0" value={payment} onChange={e => setPayment(e.target.value)} placeholder="กรอกจำนวนเงิน" autoFocus style={{ fontSize: 'var(--font-size-xl)', textAlign: 'center', fontWeight: 700 }} />
                                            <button className="btn btn-secondary" onClick={() => { setNumpadTarget('payment'); setNumpadValue(payment); setShowNumpad(true) }}>🔢</button>
                                        </div>
                                    </div>
                                    {payment && <div className={`change-display ${Number(payment) < cartTotal ? 'insufficient' : ''}`}><div className="change-label">{Number(payment) >= cartTotal ? '💰 เงินทอน' : '⚠️ เงินไม่พอ'}</div><div className="change-amount">{Number(payment) >= cartTotal ? formatCurrency(change) : `ขาดอีก ${formatCurrency(cartTotal - Number(payment))}`}</div></div>}
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)', flexWrap: 'wrap' }}>
                                        {[cartTotal, 20, 50, 100, 500, 1000].map(a => (
                                            <button key={a} className="btn btn-secondary btn-sm" onClick={() => setPayment(a.toString())}>{a === cartTotal ? '💵 พอดี' : formatCurrency(a)}</button>
                                        ))}
                                    </div>
                                </>
                            ) : <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-secondary)' }}><div style={{ fontSize: '3rem', marginBottom: '8px' }}>{paymentMethod === 'transfer' ? '📱' : '📲'}</div><p>กดยืนยันเมื่อได้รับเงินแล้ว</p></div>}
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
                                <h4>🏪 {settings.shopName || 'ShopStock'}</h4>
                                {settings.shopAddress && <div style={{ textAlign: 'center', fontSize: '10px', whiteSpace: 'pre-wrap' }}>{settings.shopAddress}</div>}
                                {settings.shopPhone && <div style={{ textAlign: 'center', fontSize: '10px' }}>โทร: {settings.shopPhone}</div>}
                                <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '8px' }}>{new Date(showReceipt.createdAt).toLocaleString('th-TH')}</div>
                                <div className="receipt-line" />
                                {showReceipt.items.map((item, i) => (<div key={i} className="receipt-row"><span>{item.productName} ×{item.qty}</span><span>{formatCurrency(item.qty * item.price)}</span></div>))}
                                <div className="receipt-line" />
                                {showReceipt.discount > 0 && <div className="receipt-row"><span>ส่วนลด</span><span>-{formatCurrency(showReceipt.discount)}</span></div>}
                                {settings.vatEnabled && (
                                    <>
                                        <div className="receipt-row"><span>ราคาหน้าบิล</span><span>{formatCurrency(cartTotal + totalDiscount)}</span></div>
                                        <div className="receipt-row"><span>มูลค่าสินค้า (Vat Excl.)</span><span>{formatCurrency(netAmount)}</span></div>
                                        <div className="receipt-row"><span>ภาษีมูลค่าเพิ่ม ({settings.vatRate}%)</span><span>{formatCurrency(vatAmount)}</span></div>
                                    </>
                                )}
                                <div className="receipt-row receipt-total"><span>ยอดรวมสุทธิ</span><span>{formatCurrency(showReceipt.total)}</span></div>
                                <div className="receipt-row"><span>ชำระ ({showReceipt.paymentMethod === 'cash' ? 'เงินสด' : showReceipt.paymentMethod === 'transfer' ? 'โอน' : 'QR'})</span><span>{formatCurrency(showReceipt.payment)}</span></div>
                                {showReceipt.change > 0 && <div className="receipt-row receipt-total"><span>เงินทอน</span><span>{formatCurrency(showReceipt.change)}</span></div>}
                                <div className="receipt-line" />
                                <div style={{ textAlign: 'center', fontSize: '10px', color: '#888' }}>{settings.receiptFooter || 'ขอบคุณที่ใช้บริการ ❤️'}</div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => window.print()}>🖨️ พิมพ์</button>
                            <button className="btn btn-primary" onClick={() => setShowReceipt(null)}>ปิด</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Held Bills Modal */}
            {showHeld && (
                <div className="modal-overlay" onClick={() => setShowHeld(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>📋 บิลที่พักไว้ ({heldBills.length})</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowHeld(false)}>✕</button></div>
                        <div className="modal-body">
                            {heldBills.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.5 }}>📋</div>
                                    <p>ไม่มีบิลที่พัก</p>
                                    <p style={{ fontSize: 'var(--font-size-xs)', marginTop: '4px' }}>กด F2 เพื่อพักบิลปัจจุบัน</p>
                                </div>
                            ) : (
                                <div className="low-stock-list">
                                    {heldBills.map(bill => (
                                        <div key={bill.id} className="low-stock-item" style={{ flexWrap: 'wrap' }}>
                                            <div style={{ flex: 1 }}>
                                                <div className="item-name">{bill.cart.map(c => c.productName).join(', ')}</div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                                    {bill.cart.length} รายการ • {formatCurrency(bill.cart.reduce((s, c) => s + c.qty * c.price, 0))} • {formatDate(bill.createdAt)}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button className="btn btn-primary btn-sm" onClick={() => handleResumeBill(bill.id)}>📋 เรียกกลับ</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => { deleteHeldBill(bill.id); reload(); toast('ลบสำเร็จ') }}>🗑️</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Sales Modal */}
            {showRecent && (
                <div className="modal-overlay" onClick={() => setShowRecent(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>🧾 รายการขายล่าสุด</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowRecent(false)}>✕</button></div>
                        <div className="modal-body">
                            {recentSales.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>ยังไม่มีรายการ</div>
                            ) : (
                                <div className="low-stock-list">
                                    {recentSales.map(tx => (
                                        <div key={tx.id} className="low-stock-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <div>
                                                    <div className="item-name">{tx.items.map(i => `${i.productName}×${i.qty}`).join(', ')}</div>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                                        {formatDate(tx.createdAt)} • {tx.paymentMethod === 'cash' ? '💵' : tx.paymentMethod === 'transfer' ? '📱' : tx.paymentMethod === 'credit' ? '💳' : '📲'}
                                                        {tx.refunded && <span className="badge badge-danger" style={{ marginLeft: '4px' }}>คืนแล้ว</span>}
                                                    </div>
                                                </div>
                                                <span style={{ fontWeight: 700, color: 'var(--accent-primary-hover)', whiteSpace: 'nowrap' }}>{formatCurrency(tx.total)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Numpad Modal */}
            {showNumpad && (
                <div className="modal-overlay" onClick={() => setShowNumpad(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '320px' }}>
                        <div className="modal-header"><h3>🔢 {numpadTarget === 'payment' ? 'จำนวนเงิน' : 'ส่วนลด'}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowNumpad(false)}>✕</button></div>
                        <div className="modal-body">
                            <div style={{ textAlign: 'center', fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--text-primary)', padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', minHeight: '56px' }}>
                                {numpadValue || '0'}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '⌫'].map(k => (
                                    <button key={k} className={`btn ${k === 'C' ? 'btn-danger' : k === '⌫' ? 'btn-secondary' : 'btn-secondary'}`} onClick={() => numpadPress(k)} style={{ padding: '16px', justifyContent: 'center', fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
                                        {k}
                                    </button>
                                ))}
                                {numpadTarget === 'payment' && [20, 50, 100, 500, 1000].map(a => (
                                    <button key={a} className="btn btn-secondary btn-sm" onClick={() => { setNumpadValue(a.toString()) }} style={{ justifyContent: 'center' }}>{a}</button>
                                ))}
                            </div>
                            <button className="btn btn-success btn-lg" onClick={() => numpadPress('✓')} style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-md)' }}>✅ ตกลง</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
