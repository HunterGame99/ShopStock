import React, { useState, useEffect } from 'react';
import { getStore, SETTINGS_KEY } from '../lib/storage.js';

export default function CustomerDisplay() {
    const [cart, setCart] = useState([]);
    const [paymentFlow, setPaymentFlow] = useState(null);
    const [shopName, setShopName] = useState('ShopStock');
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        try {
            const settings = getStore(SETTINGS_KEY);
            if (settings && settings.shopName) setShopName(settings.shopName);
        } catch (e) { /* ignore */ }
    }, []);

    useEffect(() => {
        const channel = new BroadcastChannel('shopstock_pos_channel');
        channel.onmessage = (event) => {
            const { type, cart: cartData, details } = event.data;
            if (type === 'CART_UPDATE') { setCart(cartData || []); setPaymentFlow(null); }
            else if (type === 'PAYMENT_COMPLETE') { setPaymentFlow(details); }
            else if (type === 'CLEAR') { setCart([]); setPaymentFlow(null); }
        };
        return () => channel.close();
    }, []);

    // Auto-clear after payment success (5 seconds)
    useEffect(() => {
        if (!paymentFlow) return;
        const timer = setTimeout(() => { setPaymentFlow(null); setCart([]); }, 5000);
        return () => clearTimeout(timer);
    }, [paymentFlow]);

    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif", overflow: 'hidden' }}>

            {/* Header */}
            <header style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)', padding: '18px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '2rem' }}>🏪</span>
                    <div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.5px' }}>{shopName}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>ยินดีต้อนรับครับ/ค่ะ</div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                        {time.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>
            </header>

            {/* Main */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Left: Cart */}
                <div style={{ flex: 5, display: 'flex', flexDirection: 'column', borderRight: '1px solid #1e293b' }}>
                    {/* Cart Header */}
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#94a3b8' }}>🛒 รายการสินค้า</div>
                        {cart.length > 0 && <div style={{ background: '#6366f1', padding: '4px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700 }}>{totalQty} ชิ้น</div>}
                    </div>

                    {/* Items */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
                        {cart.length === 0 && !paymentFlow && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4 }}>
                                <div style={{ fontSize: '5rem', marginBottom: '16px' }}>🛒</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 600 }}>เชิญเลือกซื้อสินค้าได้เลย</div>
                            </div>
                        )}

                        {cart.map((item, idx) => (
                            <div key={idx} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: '#1e293b', padding: '16px 20px', borderRadius: '14px',
                                marginBottom: '10px', border: '1px solid #334155',
                                animation: 'slideIn 0.3s ease-out'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
                                        {item.emoji || '📦'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#f1f5f9' }}>{item.productName}</div>
                                        <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '2px' }}>
                                            {item.price.toLocaleString()} ฿ × {item.qty}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#a78bfa', whiteSpace: 'nowrap' }}>
                                    {(item.price * item.qty).toLocaleString()} ฿
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Total */}
                <div style={{ flex: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', background: '#1e293b' }}>

                    {!paymentFlow ? (
                        <div style={{ textAlign: 'center', width: '100%' }}>
                            <div style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '12px' }}>ยอดรวม</div>
                            <div style={{
                                fontSize: subtotal > 9999 ? '4rem' : '5.5rem',
                                fontWeight: 900, color: '#f8fafc', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                                background: 'linear-gradient(135deg, #c4b5fd, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                marginBottom: '8px'
                            }}>
                                {subtotal.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '1.5rem', color: '#64748b', fontWeight: 600 }}>บาท</div>

                            {cart.length > 0 && (
                                <div style={{ marginTop: '40px', padding: '16px 24px', background: '#0f172a', borderRadius: '12px', border: '1px solid #334155' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#94a3b8' }}>
                                        <span>สินค้า {cart.length} รายการ</span>
                                        <span>{totalQty} ชิ้น</span>
                                    </div>
                                </div>
                            )}

                            {cart.length > 0 && (
                                <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#f59e0b', fontSize: '1.1rem', fontWeight: 600 }}>
                                    <span style={{ animation: 'pulse 1.5s infinite' }}>💳</span> รอชำระเงิน...
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s', width: '100%' }}>
                            <div style={{ fontSize: '5rem', marginBottom: '12px', animation: 'bounceIn 0.6s' }}>✅</div>
                            <h2 style={{ fontSize: '2.2rem', color: '#4ade80', margin: '0 0 30px 0', fontWeight: 800 }}>ชำระเงินสำเร็จ!</h2>

                            <div style={{ background: '#0f172a', padding: '28px', borderRadius: '16px', border: '1px solid #334155' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '1rem' }}>ยอดรวม</span>
                                    <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>{paymentFlow.total?.toLocaleString() || '—'} ฿</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '1rem' }}>รับเงินมา</span>
                                    <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>{paymentFlow.payment?.toLocaleString() || '—'} ฿</span>
                                </div>
                                <div style={{ borderTop: '2px dashed #334155', margin: '12px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#fb923c', fontSize: '1.2rem', fontWeight: 700 }}>เงินทอน</span>
                                    <span style={{ fontWeight: 900, fontSize: '2.5rem', color: '#fb923c' }}>{paymentFlow.change?.toLocaleString() || 0} ฿</span>
                                </div>
                            </div>

                            <p style={{ marginTop: '30px', fontSize: '1.2rem', color: '#64748b' }}>ขอบคุณที่ใช้บริการครับ/ค่ะ 🙏</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
            `}</style>
        </div>
    );
}
