import { useState, useEffect, useCallback, useRef } from 'react'
import { getProducts, addTransaction, getCustomers, formatCurrency, formatDate, playSound, getTopProducts, getCategoryEmoji, applyPromotions, getPromotions, CATEGORIES, holdBill, getHeldBills, resumeBill, deleteHeldBill, getRecentSales, addCredit, getUnpaidCredits, getSettings, redeemPoints, generateInvoiceNumber, getCustomerTier, getNextTier, getTierDiscount, MEMBERSHIP_TIERS, getRewards, redeemReward, seedDefaultRewards, applyCoupon, useCoupon } from '../lib/storage.js'
import { useToast, useShift } from '../App.jsx'
import { verifyPaymentSlip, isAIAvailable } from '../lib/aiService.js'
import { sendLineNotify } from '../lib/lineNotify.js'
import BarcodeScanner from '../components/BarcodeScanner.jsx'
import ReceiptPrinter from '../components/ReceiptPrinter.jsx'
import { Link, useNavigate } from 'react-router-dom'

export default function StockOut() {
    const navigate = useNavigate()
    const { activeShift } = useShift()
    const [products, setProducts] = useState([])
    const [search, setSearch] = useState('')
    const [cart, setCart] = useState([])
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [splitCashPart, setSplitCashPart] = useState('')
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
    const [showPortalQR, setShowPortalQR] = useState(false)
    const [showScanner, setShowScanner] = useState(false)
    const [numpadTarget, setNumpadTarget] = useState(null)
    const [numpadValue, setNumpadValue] = useState('')
    const [pointsUsed, setPointsUsed] = useState(0)
    const [settings, setSettings] = useState({ shopName: 'ShopStock', shopAddress: '', shopPhone: '', receiptFooter: 'ขอบคุณที่ใช้บริการ ❤️', vatEnabled: false, vatRate: 7 })
    const [showMemberStep, setShowMemberStep] = useState(false)
    const [memberSearch, setMemberSearch] = useState('')
    const [customerSearchText, setCustomerSearchText] = useState('')
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
    const [couponCode, setCouponCode] = useState('')
    const [appliedCoupon, setAppliedCoupon] = useState(null) // { coupon, discount }
    const toast = useToast()
    const slipInputRef = useRef(null)
    const [slipVerification, setSlipVerification] = useState(null) // AI verification result
    const [slipPreview, setSlipPreview] = useState(null) // base64 preview
    const [slipVerifying, setSlipVerifying] = useState(false) // loading state

    const selectedCustomerData = customers.find(c => c.id === selectedCustomer)
    const customerTier = selectedCustomerData ? getCustomerTier(selectedCustomerData) : null
    const customerNextTier = selectedCustomerData ? getNextTier(selectedCustomerData) : null
    const tierDiscount = customerTier ? customerTier.discount : 0
    const pointRate = customerTier ? customerTier.pointRate : 25
    const pointsToEarn = Math.floor((cart.reduce((s, c) => s + (c.qty * c.price), 0) - promoDiscount) / pointRate)

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

    // BroadcastChannel for Customer Display — use ref to survive re-renders
    const posChannelRef = useRef(null);
    useEffect(() => {
        posChannelRef.current = new BroadcastChannel('shopstock_pos_channel');
        posChannelRef.current.onmessage = (event) => {
            if (event.data?.type === 'QR_TIMEOUT') {
                toast('⏳ หมดเวลาสแกนรับชำระเงิน กรุณาทำรายการใหม่', 'warning');
                setShowCheckout(false);
                playSound('error');
            }
        };
        return () => { posChannelRef.current?.close(); posChannelRef.current = null }
    }, [toast]);
    useEffect(() => {
        const ch = posChannelRef.current;
        if (!ch) return;
        try {
            if (showReceipt) {
                ch.postMessage({ type: 'PAYMENT_COMPLETE', details: { payment: showReceipt.payment, change: showReceipt.change, total: showReceipt.total } });
            } else if (cart.length === 0) {
                ch.postMessage({ type: 'CLEAR' });
            } else {
                ch.postMessage({
                    type: 'CART_UPDATE',
                    cart: cart.map(c => ({ productName: c.productName, emoji: c.emoji, price: c.price, qty: c.qty })),
                    total: cartTotal,
                    discounts: { member: memberDiscount, promo: promoDiscount, manual: 0, points: pointsUsed },
                });
            }
        } catch (e) { /* channel closed */ }
    }, [cart, showReceipt, promoDiscount, pointsUsed, selectedCustomer, customers]);

    // Broadcast member info to Customer Display
    useEffect(() => {
        const ch = posChannelRef.current;
        if (!ch) return;
        try {
            if (selectedCustomerData && customerTier) {
                ch.postMessage({
                    type: 'MEMBER_UPDATE',
                    member: {
                        name: selectedCustomerData.name,
                        totalSpent: selectedCustomerData.totalSpent || 0,
                        points: selectedCustomerData.points || 0,
                        visitCount: selectedCustomerData.visitCount || 0,
                        tier: { emoji: customerTier.emoji, label: customerTier.label, color: customerTier.color, discount: customerTier.discount },
                        memberDiscount,
                        promoDiscount,
                    }
                });
            } else {
                ch.postMessage({ type: 'MEMBER_CLEAR' });
            }
        } catch (e) { /* channel closed */ }
    }, [selectedCustomer, customers, cart, promoDiscount]);

    useEffect(() => { setPromoDiscount(cart.length > 0 ? applyPromotions(cart) : 0) }, [cart])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return
            if (e.key === 'F1' || e.key === 'F8') { e.preventDefault(); if (cart.length > 0) handleCheckout() }
            if (e.key === 'F2') { e.preventDefault(); if (cart.length > 0) handleHoldBill() }
            if (e.key === 'F3') { e.preventDefault(); setShowHeld(true) }
            if (e.key === ' ') {
                e.preventDefault();
                if (cart.length > 0 && !showCheckout && !showNumpad && !showHeld && !showRecent && !showReceipt && !showScanner) {
                    handleCheckout();
                }
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                if (showCheckout) { setShowCheckout(false); broadcastPaymentQRClear(); }
                else if (showNumpad) setShowNumpad(false);
                else if (showHeld) setShowHeld(false);
                else if (showRecent) setShowRecent(false);
                else if (showReceipt) setShowReceipt(null);
                else if (showScanner) setShowScanner(false);
                else { setCart([]); setSelectedCustomer(''); toast('ล้างตะกร้า') }
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [cart, showCheckout, showNumpad, showHeld, showRecent, showReceipt])

    const categoryTabs = ['ทั้งหมด', ...CATEGORIES.map(c => c.name)]

    const filteredProducts = products.filter(p => {
        const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search)
        const matchTab = activeTab === 'ทั้งหมด' || p.category === activeTab
        return matchSearch && matchTab
    })

    const addToCart = useCallback((product) => {
        if (!activeShift) { toast('กรุณาเปิดกะก่อนขายสินค้า', 'error'); navigate('/shifts'); return }
        if (product.stock <= 0) { toast('สินค้าหมดสต็อก', 'error'); playSound('error'); return }
        setCart(prev => {
            const existing = prev.find(c => c.productId === product.id)
            if (existing) {
                if (existing.qty >= product.stock) { toast('สต็อกไม่เพียงพอ', 'error'); return prev }
                return prev.map(c => c.productId === product.id ? { ...c, qty: c.qty + 1 } : c)
            }
            return [...prev, { productId: product.id, productName: product.name, qty: 1, price: product.sellPrice, maxStock: product.stock, emoji: product.emoji, imageUrl: product.imageUrl }]
        })
        playSound('scan')
    }, [toast, activeShift])

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
    const memberDiscount = tierDiscount > 0 ? Math.round(subtotal * tierDiscount / 100) : 0
    const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0
    const totalDiscount = promoDiscount + pointsUsed + memberDiscount + couponDiscount
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
        setCart([]); setSelectedCustomer('')
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
        const invoiceNo = generateInvoiceNumber()
        const tx = addTransaction({
            type: 'out', items: cart.map(c => ({ productId: c.productId, productName: c.productName, qty: c.qty, price: c.price })),
            total: cartTotal, subtotal, discount: totalDiscount, payment: 0,
            change: 0, paymentMethod: 'credit', customerId: selectedCustomer, note: 'เงินเชื่อ', invoiceNo,
        })
        addCredit(selectedCustomer, cartTotal, cart.map(c => ({ productName: c.productName, qty: c.qty, price: c.price })), `บิล #${tx.id.slice(-6)}`)
        playSound('success')
        toast('💳 บันทึกเงินเชื่อสำเร็จ')
        setCart([]); setSelectedCustomer('')
        reload()
    }

    // Broadcast QR payment info to customer display
    const broadcastPaymentQR = (method, amount) => {
        const ch = posChannelRef.current
        if (!ch) return
        if (method === 'transfer' || method === 'qr') {
            const s = getSettings()
            if (s.promptPayId) {
                try {
                    ch.postMessage({ type: 'PAYMENT_QR', promptPayId: s.promptPayId, promptPayName: s.promptPayName || '', amount, cart })
                } catch (e) { /* channel closed */ }
            }
        }
    }
    const broadcastPaymentQRClear = () => {
        const ch = posChannelRef.current
        if (!ch) return
        try { ch.postMessage({ type: 'PAYMENT_QR_CLEAR' }) } catch (e) { /* channel closed */ }
        setSlipVerification(null); setSlipPreview(null); setSlipVerifying(false)
    }


    const handleCheckout = () => {
        if (!activeShift) { toast('กรุณาเปิดกะก่อนขายสินค้า', 'error'); navigate('/shifts'); return }
        if (cart.length === 0) { toast('เพิ่มสินค้า', 'error'); return }
        if (!selectedCustomer) {
            setMemberSearch('')
            setShowMemberStep(true)
            return
        }
        setPayment(paymentMethod === 'cash' ? '' : cartTotal.toString())
        setShowCheckout(true)
        broadcastPaymentQR(paymentMethod, cartTotal)
    }

    const proceedCheckoutAsGuest = () => {
        setShowMemberStep(false)
        setPayment(paymentMethod === 'cash' ? '' : cartTotal.toString())
        setShowCheckout(true)
        broadcastPaymentQR(paymentMethod, cartTotal)
    }

    const proceedCheckoutWithMember = (customerId) => {
        setSelectedCustomer(customerId)
        setShowMemberStep(false)
        setPayment(paymentMethod === 'cash' ? '' : cartTotal.toString())
        setShowCheckout(true)
        if (paymentMethod === 'split') {
            broadcastPaymentQR('qr', Math.max(0, cartTotal - (Number(splitCashPart) || 0)))
        } else {
            broadcastPaymentQR(paymentMethod, cartTotal)
        }
    }

    const confirmCheckout = () => {
        let payAmount = Number(payment)
        let changeAmount = 0
        let noteText = ''

        if (paymentMethod === 'cash') {
            if (payAmount < cartTotal) { toast('เงินไม่พอ', 'error'); return }
            changeAmount = Math.max(0, payAmount - cartTotal)
        } else if (paymentMethod === 'split') {
            const cashPart = Number(splitCashPart) || 0
            const qrPart = Math.max(0, cartTotal - cashPart)
            payAmount = cartTotal
            noteText = `สด ${formatCurrency(cashPart)} | โอน ${formatCurrency(qrPart)}`
        } else {
            payAmount = cartTotal
        }

        const invoiceNo = generateInvoiceNumber()
        const tx = addTransaction({
            type: 'out', items: cart.map(c => ({ productId: c.productId, productName: c.productName, qty: c.qty, price: c.price })),
            total: cartTotal, subtotal, discount: totalDiscount, payment: payAmount,
            change: changeAmount, paymentMethod,
            customerId: selectedCustomer || null, note: noteText, invoiceNo,
        })
        // Redeem points if used
        if (pointsUsed > 0 && selectedCustomer) {
            redeemPoints(selectedCustomer, pointsUsed)
        }
        playSound('success')
        broadcastPaymentQRClear()
        setShowReceipt({ ...tx, payment: paymentMethod === 'cash' ? Number(payment) : payAmount, change: changeAmount })
        if (appliedCoupon) { useCoupon(appliedCoupon.coupon.id) }
        setShowCheckout(false); setCart([]); setPayment(''); setSelectedCustomer(''); setPointsUsed(0); setAppliedCoupon(null); setCouponCode(''); setSplitCashPart('')
        toast('ขายสำเร็จ! 🎉')

        // Send LINE Notify if configured
        const s = getSettings()
        if (s.lineNotifyToken) {
            const methodEmoji = paymentMethod === 'cash' ? '💵' : (paymentMethod === 'transfer' ? '📱' : (paymentMethod === 'split' ? '🌗' : '📲'));
            const pt = paymentMethod === 'cash' ? 'เงินสด' : (paymentMethod === 'transfer' ? 'โอนเงิน' : (paymentMethod === 'split' ? 'ผสม' : 'QR Code'));
            const extra = paymentMethod === 'split' ? ` (${noteText})` : '';
            const msg = `\n💰 บิลใหม่: ${invoiceNo}\n${methodEmoji} รับเงิน: ${formatCurrency(cartTotal)}\n🛒 จำนวน: ${cart.reduce((s,c)=>s+c.qty,0)} ชิ้น\n💳 ช่องทาง: ${pt}${extra}`;
            sendLineNotify(s.lineNotifyToken, msg);
        }

        if (tx.tierUpgrade) {
            setTimeout(() => toast(`🏆 ${tx.tierUpgrade.customer.name} อัพเกรดเป็น ${tx.tierUpgrade.newTier.emoji} ${tx.tierUpgrade.newTier.label}!`), 500)
        }
        reload()
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
            if (numpadTarget === 'splitCashPart') {
                setSplitCashPart(numpadValue)
                broadcastPaymentQR('qr', Math.max(0, cartTotal - (Number(numpadValue) || 0)))
            }

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
                <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                    <a href="/customer-display" target="_blank" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none', fontSize: '12px' }}>📺 เปิดจอลูกค้า</a>
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

                    {/* Search + Voice + Camera */}
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                        <div className="table-search" style={{ flex: 1 }}>
                            <span className="search-icon">🔍</span>
                            <input type="text" placeholder="ค้นหาสินค้า / ยิงบาร์โค้ด..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowScanner(true)} title="สแกนด้วยกล้อง">📸</button>
                        <button className="btn btn-secondary" onClick={startVoiceSearch} title="ค้นหาด้วยเสียง">🎤</button>
                    </div>

                    {showScanner && (
                        <BarcodeScanner
                            onScanSuccess={(code) => {
                                handleBarcodeScan(code);
                                // scanner stays open until manually closed so they can scan rapidly
                            }}
                            onClose={() => setShowScanner(false)}
                        />
                    )}

                    {/* Product Grid */}
                    <div className="product-grid">
                        {filteredProducts.map(p => (
                            <div key={p.id} className={`product-card ${p.stock <= 0 ? 'out-of-stock' : ''}`} onClick={() => addToCart(p)}>
                                {p.imageUrl ? (
                                    <div className="product-image" style={{ width: '100%', height: '80px', marginBottom: '8px', backgroundImage: `url(${p.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 'var(--radius-sm)' }} />
                                ) : (
                                    <div className="product-emoji">{p.emoji || getCategoryEmoji(p.category)}</div>
                                )}
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

                    {/* Customer & Membership */}
                    <div style={{ padding: '8px var(--space-md)', borderBottom: '1px solid var(--border)', background: selectedCustomerData ? `${customerTier?.color}08` : 'transparent', borderLeft: selectedCustomerData ? `3px solid ${customerTier?.color}` : '3px solid transparent', transition: 'all 0.3s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', color: selectedCustomerData ? customerTier?.color : 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.3px' }}>
                                👤 {selectedCustomerData ? `${customerTier?.emoji} ${customerTier?.label} Member` : 'ข้อมูลลูกค้า'}
                            </span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowPortalQR(true)} style={{ fontSize: '10px', color: 'var(--accent-primary)', padding: '2px 6px', height: 'auto', border: '1px solid var(--accent-primary)44', borderRadius: '6px' }}>📱 QR แต้ม</button>
                        </div>

                        {/* Customer Search Input */}
                        {selectedCustomerData ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', border: `1px solid ${customerTier?.color || 'var(--border)'}55`, borderRadius: 'var(--radius-md)', padding: '6px 10px' }}>
                                <span style={{ fontSize: '1rem' }}>{customerTier?.emoji}</span>
                                <span style={{ flex: 1, fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {selectedCustomerData.name}
                                    {selectedCustomerData.phone && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({selectedCustomerData.phone})</span>}
                                </span>
                                <button onClick={() => { setSelectedCustomer(''); setCustomerSearchText(''); setPointsUsed(0) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', padding: '0 2px' }}>✕</button>
                            </div>
                        ) : (
                            <div style={{ position: 'relative' }}>
                                <div className="table-search" style={{ margin: 0 }}>
                                    <span className="search-icon">👤</span>
                                    <input
                                        type="text"
                                        placeholder="พิมพ์ชื่อ / เบอร์โทรสมาชิก..."
                                        value={customerSearchText}
                                        onChange={e => { setCustomerSearchText(e.target.value); setShowCustomerDropdown(true) }}
                                        onFocus={() => setShowCustomerDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                                        style={{ fontSize: 'var(--font-size-xs)' }}
                                    />
                                </div>
                                {showCustomerDropdown && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', maxHeight: '180px', overflowY: 'auto', marginTop: '2px' }}>
                                        {(customerSearchText
                                            ? customers.filter(c =>
                                                c.name.toLowerCase().includes(customerSearchText.toLowerCase()) ||
                                                (c.phone || '').includes(customerSearchText))
                                            : customers
                                        ).slice(0, 8).map(c => {
                                            const t = getCustomerTier(c)
                                            return (
                                                <div key={c.id} onMouseDown={() => { setSelectedCustomer(c.id); setCustomerSearchText(''); setShowCustomerDropdown(false) }}
                                                    style={{ padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', fontSize: 'var(--font-size-xs)' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <span>{t.emoji}</span>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 700 }}>{c.name}</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{c.phone || 'ไม่มีเบอร์'} • {t.label} • 🪙{c.points || 0}pt</div>
                                                    </div>
                                                    {t.discount > 0 && <span style={{ fontSize: '9px', color: t.color, fontWeight: 700, background: `${t.color}22`, padding: '1px 5px', borderRadius: '6px' }}>ลด {t.discount}%</span>}
                                                </div>
                                            )
                                        })}
                                        {customers.length === 0 && <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>ไม่มีสมาชิก</div>}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Customer Info Card */}
                        {selectedCustomerData && customerTier && (
                            <div style={{ marginTop: '6px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '8px 10px', border: `1px solid ${customerTier.color}33` }}>
                                {/* Tier + Points */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '1.1rem' }}>{customerTier.emoji}</span>
                                        <span style={{ fontSize: '11px', fontWeight: 800, color: customerTier.color }}>{customerTier.label}</span>
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>🪙 {(selectedCustomerData.points || 0).toLocaleString()} pt</span>
                                </div>

                                {/* Discount preview (if cart has items) */}
                                {cart.length > 0 && (memberDiscount > 0 || promoDiscount > 0) && (
                                    <div style={{ margin: '6px 0', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', padding: '5px 8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        {memberDiscount > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                                <span style={{ color: customerTier.color, fontWeight: 700 }}>✨ ส่วนลดสมาชิก {tierDiscount}%</span>
                                                <span style={{ color: 'var(--danger)', fontWeight: 800 }}>-{formatCurrency(memberDiscount)}</span>
                                            </div>
                                        )}
                                        {promoDiscount > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                                <span style={{ color: 'var(--warning, #f59e0b)', fontWeight: 700 }}>🏷️ โปรโมชั่นร้าน</span>
                                                <span style={{ color: 'var(--danger)', fontWeight: 800 }}>-{formatCurrency(promoDiscount)}</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', borderTop: '1px solid var(--border)', paddingTop: '3px', marginTop: '1px' }}>
                                            <span style={{ fontWeight: 700 }}>รวมประหยัด</span>
                                            <span style={{ color: 'var(--danger)', fontWeight: 900 }}>-{formatCurrency(memberDiscount + promoDiscount)}</span>
                                        </div>
                                    </div>
                                )}
                                {cart.length > 0 && memberDiscount === 0 && promoDiscount === 0 && tierDiscount === 0 && customerNextTier && (
                                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px' }}>สะสมยอดอีก {formatCurrency(customerNextTier.minSpent - (selectedCustomerData.totalSpent || 0))} เพื่อรับส่วนลด {customerNextTier.discount}%</div>
                                )}

                                {/* Progress to next tier */}
                                {customerNextTier && (
                                    <div style={{ marginTop: '4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                                            <span>ยอดสะสม {formatCurrency(selectedCustomerData.totalSpent || 0)}</span>
                                            <span>ถึง {customerNextTier.emoji} {customerNextTier.label} อีก {formatCurrency(customerNextTier.minSpent - (selectedCustomerData.totalSpent || 0))}</span>
                                        </div>
                                        <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', background: `linear-gradient(90deg, ${customerTier.color}, ${customerNextTier.color})`, borderRadius: '2px', width: `${Math.min(100, ((selectedCustomerData.totalSpent || 0) / customerNextTier.minSpent) * 100)}%`, transition: 'width 0.5s' }} />
                                        </div>
                                    </div>
                                )}
                                {!customerNextTier && (
                                    <div style={{ fontSize: '9px', color: customerTier.color, fontWeight: 600, marginTop: '2px' }}>⭐ ระดับสูงสุดแล้ว!</div>
                                )}

                                {/* Points actions */}
                                {(selectedCustomerData.points || 0) > 0 && cart.length > 0 && (
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                                        {pointsUsed > 0 ? (
                                            <button className="btn btn-ghost btn-sm" onClick={() => setPointsUsed(0)} style={{ fontSize: '10px', color: 'var(--danger)', flex: 1 }}>✕ ยกเลิกแลก ({pointsUsed} pt)</button>
                                        ) : (
                                            <button className="btn btn-primary btn-sm" onClick={() => {
                                                const maxPoints = Math.min(selectedCustomerData.points || 0, subtotal - promoDiscount)
                                                if (maxPoints <= 0) return
                                                const input = window.prompt(`แลกกี่คะแนน? (สูงสุด ${maxPoints} คะแนน = ฿${maxPoints})`, maxPoints)
                                                if (input && Number(input) > 0 && Number(input) <= maxPoints) setPointsUsed(Number(input))
                                            }} style={{ fontSize: '10px', flex: 1 }}>🎁 แลกแต้มลดราคา</button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Promo discount hint (no member selected but promo active) */}
                        {!selectedCustomerData && promoDiscount > 0 && cart.length > 0 && (
                            <div style={{ marginTop: '5px', padding: '5px 8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                <span style={{ color: '#f59e0b', fontWeight: 700 }}>🏷️ โปรโมชั่นร้าน</span>
                                <span style={{ color: 'var(--danger)', fontWeight: 800 }}>-{formatCurrency(promoDiscount)}</span>
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
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.productName} style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
                                ) : (
                                    <span style={{ fontSize: '1.1rem' }}>{item.emoji || '📦'}</span>
                                )}
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

                            {/* Coupon Input */}
                            <div style={{ padding: '6px var(--space-md)', borderBottom: '1px solid var(--border)' }}>
                                {appliedCoupon ? (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--success-bg, rgba(34,197,94,0.1))', padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--success)' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success)' }}>🎫 {appliedCoupon.coupon.code} → -{formatCurrency(appliedCoupon.discount)}</span>
                                        <button onClick={() => { setAppliedCoupon(null); setCouponCode('') }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}>✕</button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <input
                                            type="text"
                                            placeholder="🎫 โค้ดคูปอง..."
                                            value={couponCode}
                                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && couponCode.trim()) {
                                                    const result = applyCoupon(couponCode.trim(), subtotal)
                                                    if (result.ok) { setAppliedCoupon({ coupon: result.coupon, discount: result.discount }); toast(`🎫 ใช้คูปอง ${result.coupon.code} ลด ${formatCurrency(result.discount)}`) }
                                                    else { toast(result.msg, 'error'); setCouponCode('') }
                                                }
                                            }}
                                            style={{ flex: 1, padding: '5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                        <button className="btn btn-secondary btn-sm" onClick={() => {
                                            if (!couponCode.trim()) return
                                            const result = applyCoupon(couponCode.trim(), subtotal)
                                            if (result.ok) { setAppliedCoupon({ coupon: result.coupon, discount: result.discount }); toast(`🎫 ใช้คูปอง ${result.coupon.code} ลด ${formatCurrency(result.discount)}`) }
                                            else { toast(result.msg, 'error'); setCouponCode('') }
                                        }} style={{ fontSize: '10px' }}>ใช้</button>
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            <div className="cart-summary">
                                <div className="cart-summary-row"><span>ราคาสินค้า</span><span>{formatCurrency(subtotal)}</span></div>
                                {memberDiscount > 0 && <div className="cart-summary-row" style={{ color: 'var(--danger)' }}><span>{customerTier?.emoji} สมาชิก {customerTier?.label} ({tierDiscount}%)</span><span>-{formatCurrency(memberDiscount)}</span></div>}
                                {promoDiscount > 0 && <div className="cart-summary-row" style={{ color: 'var(--danger)' }}><span>🏷️ โปรโมชั่น</span><span>-{formatCurrency(promoDiscount)}</span></div>}
                                {couponDiscount > 0 && <div className="cart-summary-row" style={{ color: 'var(--danger)' }}><span>🎫 คูปอง ({appliedCoupon?.coupon?.code})</span><span>-{formatCurrency(couponDiscount)}</span></div>}
                                {pointsUsed > 0 && <div className="cart-summary-row" style={{ color: 'var(--danger)' }}><span>🎁 แลกแต้ม ({pointsUsed} คะแนน)</span><span>-{formatCurrency(pointsUsed)}</span></div>}
                                <div className="cart-summary-row total"><span>ยอดรวม</span><span>{formatCurrency(cartTotal)}</span></div>
                            </div>

                            {/* Action Buttons */}
                            <div className="cart-checkout">
                                <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                                    {[{ key: 'cash', icon: '💵', label: 'สด' }, { key: 'transfer', icon: '📱', label: 'โอน' }, { key: 'qr', icon: '📲', label: 'QR' }, { key: 'split', icon: '🌗', label: 'ผสม' }].map(m => (
                                        <button key={m.key} className={`btn btn-sm ${paymentMethod === m.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setPaymentMethod(m.key); if (m.key === 'split' && showCheckout) broadcastPaymentQR('qr', Math.max(0, cartTotal - (Number(splitCashPart) || 0))); else if (showCheckout) broadcastPaymentQR(m.key, cartTotal); }} style={{ flex: 1, justifyContent: 'center', fontSize: 'var(--font-size-xs)' }}>
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

            {/* Member Step Modal */}
            {showMemberStep && (() => {
                const filteredMembers = customers.filter(c =>
                    !memberSearch ||
                    c.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                    (c.phone || '').includes(memberSearch)
                )
                return (
                    <div className="modal-overlay" onClick={() => setShowMemberStep(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                            <div className="modal-header">
                                <h3>👤 เลือกสมาชิก</h3>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowMemberStep(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <div style={{ marginBottom: 'var(--space-md)', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    💡 เลือกสมาชิกเพื่อรับส่วนลดและสะสมคะแนน หรือข้ามหากเป็นลูกค้าทั่วไป
                                </div>
                                <div className="table-search" style={{ marginBottom: 'var(--space-md)' }}>
                                    <span className="search-icon">🔍</span>
                                    <input
                                        type="text"
                                        placeholder="ค้นหาชื่อ / เบอร์โทร..."
                                        value={memberSearch}
                                        onChange={e => setMemberSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {filteredMembers.length === 0 && (
                                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-lg)' }}>ไม่พบสมาชิก</div>
                                    )}
                                    {filteredMembers.map(c => {
                                        const t = getCustomerTier(c)
                                        const nt = getNextTier(c)
                                        const previewSubtotal = cart.reduce((s, i) => s + (i.qty * i.price), 0)
                                        const previewMemberDiscount = t.discount > 0 ? Math.round(previewSubtotal * t.discount / 100) : 0
                                        const totalSaving = previewMemberDiscount + promoDiscount
                                        return (
                                            <button
                                                key={c.id}
                                                onClick={() => proceedCheckoutWithMember(c.id)}
                                                style={{
                                                    display: 'block', width: '100%', textAlign: 'left',
                                                    background: 'var(--bg-secondary)', border: `1px solid ${t.color}44`,
                                                    borderRadius: 'var(--radius-md)', padding: '10px 14px', cursor: 'pointer',
                                                    transition: 'background 0.15s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = `${t.color}12`}
                                                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                            >
                                                {/* Name + tier + points */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '1.3rem' }}>{t.emoji}</span>
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{c.name}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                <span style={{ color: t.color, fontWeight: 700 }}>{t.label}</span>
                                                                {c.phone ? ` • ${c.phone}` : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right', fontSize: '10px', color: 'var(--text-muted)' }}>
                                                        <div>🪙 {(c.points || 0).toLocaleString()} pt</div>
                                                        <div style={{ marginTop: '2px' }}>{c.visitCount || 0} ครั้ง</div>
                                                    </div>
                                                </div>

                                                {/* Discount breakdown */}
                                                {(previewMemberDiscount > 0 || promoDiscount > 0) && (
                                                    <div style={{ marginTop: '8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                        {previewMemberDiscount > 0 && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                                                <span style={{ color: t.color, fontWeight: 700 }}>✨ ส่วนลดสมาชิก {t.discount}%</span>
                                                                <span style={{ color: 'var(--danger)', fontWeight: 800 }}>-{formatCurrency(previewMemberDiscount)}</span>
                                                            </div>
                                                        )}
                                                        {promoDiscount > 0 && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                                                <span style={{ color: 'var(--warning)', fontWeight: 700 }}>🏷️ โปรโมชั่น</span>
                                                                <span style={{ color: 'var(--danger)', fontWeight: 800 }}>-{formatCurrency(promoDiscount)}</span>
                                                            </div>
                                                        )}
                                                        {totalSaving > 0 && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid var(--border)', paddingTop: '4px', marginTop: '2px' }}>
                                                                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>รวมประหยัด</span>
                                                                <span style={{ fontWeight: 900, color: 'var(--danger)' }}>-{formatCurrency(totalSaving)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {previewMemberDiscount === 0 && promoDiscount === 0 && t.discount === 0 && (
                                                    <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>ระดับนี้ยังไม่มีส่วนลด — สะสมยอดเพิ่มเพื่ออัปเกรด</div>
                                                )}

                                                {/* Progress bar */}
                                                <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                                                    <span>ยอดสะสม {formatCurrency(c.totalSpent || 0)}</span>
                                                    {nt && <span>ถึง {nt.emoji}{nt.label} อีก {formatCurrency(nt.minSpent - (c.totalSpent || 0))}</span>}
                                                    {!nt && <span style={{ color: t.color, fontWeight: 700 }}>⭐ ระดับสูงสุด</span>}
                                                </div>
                                                {nt && (
                                                    <div style={{ marginTop: '4px', height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', background: `linear-gradient(90deg, ${t.color}, ${nt.color})`, width: `${Math.min(100, ((c.totalSpent || 0) / nt.minSpent) * 100)}%` }} />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={proceedCheckoutAsGuest}>👤 ลูกค้าทั่วไป (ข้าม)</button>
                                <button className="btn btn-ghost" onClick={() => setShowMemberStep(false)}>ยกเลิก</button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* Checkout Modal */}
            {showCheckout && (
                <div className="modal-overlay" onClick={() => { setShowCheckout(false); broadcastPaymentQRClear() }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>💳 ชำระเงิน</h3><button className="btn btn-ghost btn-icon" onClick={() => { setShowCheckout(false); broadcastPaymentQRClear() }}>✕</button></div>
                        <div className="modal-body">
                            {/* Customer confirm row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', border: selectedCustomerData ? `1px solid ${customerTier?.color}44` : '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                    <span>{selectedCustomerData ? customerTier?.emoji : '👤'}</span>
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {selectedCustomerData ? selectedCustomerData.name : 'ลูกค้าทั่วไป'}
                                        </div>
                                        {selectedCustomerData && (
                                            <div style={{ fontSize: '10px', color: customerTier?.color, fontWeight: 600 }}>
                                                {customerTier?.label}
                                                {memberDiscount > 0 && ` • ลด ${formatCurrency(memberDiscount)}`}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: '10px', color: 'var(--accent-primary)' }}
                                    onClick={() => { setShowCheckout(false); broadcastPaymentQRClear(); setSelectedCustomer(''); setMemberSearch(''); setShowMemberStep(true) }}>
                                    🔄 เปลี่ยน
                                </button>
                            </div>
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
                                        {[cartTotal, 20, 50, 100, 200, 500, 1000].map(a => (
                                            <button key={a} className="btn btn-secondary btn-sm" onClick={() => setPayment(a.toString())}>{a === cartTotal ? '💵 พอดี' : formatCurrency(a)}</button>
                                        ))}
                                    </div>
                                </>
                            ) : paymentMethod === 'split' ? (
                                <>
                                    <div className="form-group" style={{ marginTop: 'var(--space-lg)' }}>
                                        <label>💵 ยอดตัดเป็นเงินสด (ส่วนที่ 1)</label>
                                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                            <input className="form-control" type="number" min="0" max={cartTotal} value={splitCashPart} onChange={e => { const val = e.target.value; setSplitCashPart(val); broadcastPaymentQR('qr', Math.max(0, cartTotal - (Number(val) || 0))); }} placeholder={`ยอดเงินสด`} autoFocus style={{ fontSize: 'var(--font-size-xl)', textAlign: 'center', fontWeight: 700 }} />
                                            <button className="btn btn-secondary" onClick={() => { setNumpadTarget('splitCashPart'); setNumpadValue(splitCashPart); setShowNumpad(true) }}>🔢</button>
                                        </div>
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '11px', textAlign: 'center', marginTop: '12px' }}>* ส่วนที่เหลือจากเงินสด จะแสดง QR Code ให้สแกนจ่ายบนจออัตโนมัติ</p>
                                    <div style={{ marginTop: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📲 ยอดสแกน QR โอนส่วนที่เหลือ</span>
                                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#60a5fa' }}>{formatCurrency(Math.max(0, cartTotal - (Number(splitCashPart) || 0)))}</div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
                                    {/* Primary: Confirm when paid */}
                                    {!slipPreview && !slipVerifying && (
                                        <>
                                            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>{paymentMethod === 'transfer' ? '📱' : '📲'}</div>
                                            <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '16px' }}>กดยืนยันเมื่อลูกค้าจ่ายแล้ว</p>
                                        </>
                                    )}

                                    {/* Slip verification result */}
                                    {slipVerifying && (
                                        <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                            <span style={{ animation: 'pulse 1s infinite', fontSize: '1.5rem' }}>🤖</span>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>AI กำลังตรวจสอบสลิป...</span>
                                        </div>
                                    )}

                                    {slipPreview && !slipVerifying && (
                                        <div style={{ marginBottom: '12px' }}>
                                            <img src={slipPreview} alt="slip" style={{ maxHeight: '120px', borderRadius: 'var(--radius-md)', border: '2px solid var(--border)', objectFit: 'contain' }} />
                                        </div>
                                    )}

                                    {slipVerification && !slipVerifying && (
                                        <div style={{
                                            padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '12px',
                                            background: slipVerification.valid ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                                            border: `1.5px solid ${slipVerification.valid ? '#4ade80' : '#f87171'}`,
                                        }}>
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: slipVerification.valid ? '#4ade80' : '#f87171', marginBottom: '4px' }}>
                                                {slipVerification.valid ? '✅' : '⚠️'} {slipVerification.reason}
                                            </div>
                                            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                {slipVerification.amount != null && <span>💰 {slipVerification.amount}฿</span>}
                                                {slipVerification.recipient && <span>👤 {slipVerification.recipient}</span>}
                                                {slipVerification.date && <span>📅 {slipVerification.date}</span>}
                                            </div>
                                        </div>
                                    )}

                                    {/* Collapsible: Verify slip (optional) */}
                                    {!slipVerifying && (
                                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: slipPreview ? '0' : '4px' }}>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ fontSize: '11px', color: 'var(--text-muted)', gap: '4px' }}
                                                onClick={() => slipInputRef.current?.click()}
                                            >
                                                🔍 {slipPreview ? 'อัปโหลดสลิปใหม่' : 'ไม่แน่ใจ? ตรวจสลิป'}
                                            </button>
                                            <input type="file" ref={slipInputRef} accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return
                                                const reader = new FileReader()
                                                reader.onload = async (ev) => {
                                                    const dataUrl = ev.target.result
                                                    setSlipPreview(dataUrl)
                                                    const [header, base64] = dataUrl.split(',')
                                                    const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
                                                    if (!isAIAvailable()) {
                                                        setSlipVerification({ valid: false, reason: 'ไม่ได้ตั้งค่า API Key', amount: null, date: null, recipient: null })
                                                        return
                                                    }
                                                    setSlipVerifying(true)
                                                    setSlipVerification(null)
                                                    try {
                                                        const s = getSettings()
                                                        const result = await verifyPaymentSlip(base64, mime, cartTotal, s.promptPayName || '')
                                                        setSlipVerification(result)
                                                        if (result.valid) playSound('success')
                                                        else playSound('error')
                                                    } catch (err) {
                                                        setSlipVerification({ valid: false, reason: 'เกิดข้อผิดพลาด: ' + err.message, amount: null, date: null, recipient: null })
                                                    } finally {
                                                        setSlipVerifying(false)
                                                    }
                                                }
                                                reader.readAsDataURL(file)
                                                e.target.value = ''
                                            }} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => { setShowCheckout(false); broadcastPaymentQRClear() }}>ยกเลิก</button>
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
                                <div style={{ textAlign: 'center', fontSize: '10px' }}>{showReceipt.invoiceNo || `Bill #${showReceipt.id.slice(-6).toUpperCase()}`}</div>
                                {settings.taxId && <div style={{ textAlign: 'center', fontSize: '9px', color: '#999' }}>เลขผู้เสียภาษี: {settings.taxId}</div>}
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
                        <div className="modal-footer" style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-secondary" onClick={() => setShowReceipt(null)} style={{ flex: 1 }}>ปิดหน้าต่าง <kbd>Esc</kbd></button>
                            <button className="btn btn-primary" onClick={() => window.print()} style={{ flex: 1 }}>🖨️ พิมพ์ใบเสร็จ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Thermal Printer Element */}
            <ReceiptPrinter transaction={showReceipt} shopSettings={settings} />

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
                        <div className="modal-header"><h3>🔢 {numpadTarget === 'payment' ? 'จำนวนเงิน' : (numpadTarget === 'splitCashPart' ? 'ส่วนเงินสด' : 'ส่วนลด')}</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowNumpad(false)}>✕</button></div>
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

            {/* Portal QR Modal */}
            {showPortalQR && (
                <div className="modal-overlay" onClick={() => setShowPortalQR(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '300px', textAlign: 'center' }}>
                        <div className="modal-header">
                            <h3>สแกนเพื่อเช็คแต้ม</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowPortalQR(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ background: 'white', padding: '15px', borderRadius: '12px', marginBottom: 'var(--space-md)' }}>
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/portal')}`}
                                    alt="Portal QR"
                                    style={{ width: '100%', height: 'auto', display: 'block' }}
                                />
                            </div>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>ให้ลูกค้าใช้มือถือสแกนเพื่อดูคะแนนสะสมและโปรโมชั่นด้วยตนเอง</p>
                            <div style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px', fontSize: '10px', wordBreak: 'break-all', marginTop: '10px' }}>
                                {window.location.origin}/portal
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
