import React, { useState, useEffect } from 'react';
import { getStore, SETTINGS_KEY } from '../lib/storage.js';

export default function CustomerDisplay() {
    const [cart, setCart] = useState([]);
    const [paymentFlow, setPaymentFlow] = useState(null);
    const [shopName, setShopName] = useState('ShopStock');

    useEffect(() => {
        const settings = getStore(SETTINGS_KEY);
        if (settings && settings.shopName) {
            setShopName(settings.shopName);
        }

        const channel = new BroadcastChannel('shopstock_pos_channel');

        channel.onmessage = (event) => {
            if (event.data.type === 'CART_UPDATE') {
                setCart(event.data.cart || []);
                setPaymentFlow(null); // Clear payment flow on new cart interaction
            } else if (event.data.type === 'PAYMENT_COMPLETE') {
                setPaymentFlow(event.data.details);
                setCart([]); // Clear screen after a few seconds? Actually, wait for the next cart update.
            } else if (event.data.type === 'CLEAR') {
                setCart([]);
                setPaymentFlow(null);
            }
        };

        return () => channel.close();
    }, []);

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    // Note: Assuming no direct discount shown unless passed via channel, we'll just show cart sum here.

    return (
        <div style={{
            height: '100vh', display: 'flex', flexDirection: 'column',
            backgroundColor: 'var(--bg-main, #f0f2f5)', color: 'var(--text-primary, #111)',
            fontFamily: 'sans-serif'
        }}>
            {/* Header */}
            <header style={{
                background: 'var(--accent-primary, #3498db)', color: 'white',
                padding: '20px', textAlign: 'center', fontSize: '2rem', fontWeight: 'bold',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                ยินดีต้อนรับสู่ {shopName}
            </header>

            {/* Main Content */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Left Side: Cart Items */}
                <div style={{ flex: 2, padding: '20px', overflowY: 'auto', borderRight: '2px solid rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '1.8rem', borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>รายการสินค้า</h2>

                    {cart.length === 0 && !paymentFlow && (
                        <div style={{ textAlign: 'center', marginTop: '100px', color: '#888', fontSize: '2rem' }}>
                            🛒<br />เชิญเลือกซื้อสินค้าได้เลยครับ/ค่ะ
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                        {cart.map((item, idx) => (
                            <div key={idx} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: 'white', padding: '20px', borderRadius: '12px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.05)', fontSize: '1.5rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <span style={{ fontSize: '2rem' }}>{item.emoji || '📦'}</span>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{item.productName}</div>
                                        <div style={{ color: '#666', fontSize: '1.2rem' }}>{item.price.toLocaleString()} ฿ x {item.qty}</div>
                                    </div>
                                </div>
                                <div style={{ fontWeight: 'bold', color: 'var(--accent-primary, #3498db)' }}>
                                    {(item.price * item.qty).toLocaleString()} ฿
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Totals & Payment Status */}
                <div style={{ flex: 1, padding: '30px', background: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

                    {!paymentFlow ? (
                        <>
                            <div style={{ marginBottom: '40px' }}>
                                <div style={{ fontSize: '1.5rem', color: '#666' }}>ยอดรวมทั้งหมด</div>
                                <div style={{ fontSize: '5rem', fontWeight: 'bold', color: 'var(--text-primary, #2c3e50)' }}>
                                    {subtotal.toLocaleString()} <span style={{ fontSize: '2rem' }}>฿</span>
                                </div>
                            </div>

                            <div style={{ fontSize: '2rem', textAlign: 'center', color: '#888', marginTop: 'auto' }}>
                                {cart.length > 0 ? 'รอชำระเงิน...' : ''}
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s' }}>
                            <div style={{ fontSize: '6rem', marginBottom: '20px' }}>✅</div>
                            <h2 style={{ fontSize: '3rem', color: '#27ae60', margin: 0 }}>ชำระเงินสำเร็จ</h2>

                            <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '15px', marginTop: '40px' }}>
                                <div style={{ fontSize: '1.5rem', color: '#666', marginBottom: '10px' }}>รับเงินมา</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{paymentFlow.payment.toLocaleString()} ฿</div>

                                <div style={{ borderTop: '2px dashed #ccc', margin: '20px 0' }}></div>

                                <div style={{ fontSize: '1.8rem', color: '#e74c3c', marginBottom: '10px' }}>เงินทอน</div>
                                <div style={{ fontSize: '4rem', fontWeight: 'bold', color: '#e74c3c' }}>{paymentFlow.change.toLocaleString()} ฿</div>
                            </div>

                            <p style={{ marginTop: '40px', fontSize: '1.5rem', color: '#888' }}>ขอบคุณที่ใช้บริการครับ/ค่ะ 🙏</p>
                        </div>
                    )}

                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
