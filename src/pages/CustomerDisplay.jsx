import React, { useState, useEffect } from 'react';
import { getStore, SETTINGS_KEY, MEMBERSHIP_TIERS, applyPromotions } from '../lib/storage.js';

export default function CustomerDisplay() {
    const [cart, setCart] = useState([]);
    const [paymentFlow, setPaymentFlow] = useState(null);
    const [shopName, setShopName] = useState('ShopStock');
    const [time, setTime] = useState(new Date());
    const [member, setMember] = useState(null);
    const [discounts, setDiscounts] = useState({ member: 0, promo: 0, manual: 0, points: 0 });

    useEffect(() => {
        try {
            const settings = getStore(SETTINGS_KEY);
            if (settings && settings.shopName) setShopName(settings.shopName);
        } catch (e) { /* ignore */ }
    }, []);

    useEffect(() => {
        const channel = new BroadcastChannel('shopstock_pos_channel');
        channel.onmessage = (event) => {
            const { type, cart: cartData, details, member: memberData } = event.data;
            if (type === 'CART_UPDATE') { setCart(cartData || []); setPaymentFlow(null); if (event.data.discounts) setDiscounts(event.data.discounts); }
            else if (type === 'PAYMENT_COMPLETE') { setPaymentFlow(details); setMember(null); }
            else if (type === 'CLEAR') { setCart([]); setPaymentFlow(null); setMember(null); setDiscounts({ member: 0, promo: 0, manual: 0, points: 0 }); }
            else if (type === 'MEMBER_UPDATE') { setMember(memberData); }
            else if (type === 'MEMBER_CLEAR') { setMember(null); }
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
    // Compute discounts locally so they're always in sync with cart
    const promoDiscount = cart.length > 0 ? applyPromotions(cart) : 0;
    const memberDiscountPct = member?.tier?.discount || 0;
    const memberDiscount = memberDiscountPct > 0 ? Math.round(subtotal * memberDiscountPct / 100) : 0;
    const totalDiscount = promoDiscount + memberDiscount + (discounts.manual || 0) + (discounts.points || 0);
    const displayTotal = Math.max(0, subtotal - totalDiscount);

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

                            {/* Promo Banner — always show when promo active, no member needed */}
                            {promoDiscount > 0 && !member && (
                                <div style={{
                                    marginBottom: '20px', padding: '14px 18px',
                                    background: 'linear-gradient(135deg, #78350f22, #92400e11)',
                                    border: '1.5px solid #fbbf2455',
                                    borderRadius: '14px', animation: 'fadeIn 0.4s',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '1.6rem', animation: 'pulse 1.5s infinite' }}>🏷️</span>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '1px' }}>โปรโมชั่นร้าน</div>
                                            <div style={{ fontSize: '0.7rem', color: '#78716c' }}>ราคาพิเศษวันนี้!</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f87171' }}>-{promoDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
                                        <div style={{ fontSize: '0.65rem', color: '#78716c' }}>ประหยัดได้</div>
                                    </div>
                                </div>
                            )}

                            {/* Member Card */}
                            {member && (
                                <div style={{
                                    marginBottom: '24px', padding: '16px 20px',
                                    background: `linear-gradient(135deg, ${member.tier.color}28, ${member.tier.color}08)`,
                                    border: `1.5px solid ${member.tier.color}66`,
                                    borderRadius: '16px', animation: 'fadeIn 0.4s',
                                    boxShadow: `0 0 20px ${member.tier.color}22`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '2.2rem', filter: `drop-shadow(0 0 8px ${member.tier.color})` }}>{member.tier.emoji}</span>
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9' }}>{member.name}</div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: member.tier.color }}>{member.tier.label} Member</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c4b5fd' }}>🪙 {(member.points || 0).toLocaleString()}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>คะแนนสะสม</div>
                                        </div>
                                    </div>
                                    <div style={{ borderTop: `1px solid ${member.tier.color}33`, paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {promoDiscount > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#78350f22', borderRadius: '8px', padding: '6px 10px' }}>
                                                <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem' }}>🏷️ โปรโมชั่นร้าน</span>
                                                <span style={{ color: '#f87171', fontWeight: 800, fontSize: '0.9rem' }}>-{promoDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                                            </div>
                                        )}
                                        {memberDiscount > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `${member.tier.color}11`, borderRadius: '8px', padding: '6px 10px' }}>
                                                <span style={{ color: member.tier.color, fontWeight: 700, fontSize: '0.85rem' }}>✨ สมาชิก {member.tier.discount}% ({member.tier.label})</span>
                                                <span style={{ color: '#f87171', fontWeight: 800, fontSize: '0.9rem' }}>-{memberDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                                            </div>
                                        )}
                                        {memberDiscount === 0 && member.tier.discount === 0 && (
                                            <div style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', textAlign: 'center', padding: '4px 0' }}>
                                                สะสมต่อไปเพื่อรับส่วนลดสมาชิก 💪
                                            </div>
                                        )}
                                        {(memberDiscount > 0 || promoDiscount > 0) && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${member.tier.color}33`, paddingTop: '8px', marginTop: '2px' }}>
                                                <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.95rem' }}>🎉 รวมประหยัด</span>
                                                <span style={{ color: '#4ade80', fontWeight: 900, fontSize: '1.1rem' }}>-{(memberDiscount + promoDiscount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                            <span>ยอดซื้อสะสม {(member.totalSpent || 0).toLocaleString()} ฿</span>
                                            <span>{member.visitCount || 0} ครั้ง</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '12px' }}>ยอดรวม</div>
                            <div style={{
                                fontSize: displayTotal > 9999 ? '4rem' : '5.5rem',
                                fontWeight: 900, color: '#f8fafc', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                                background: 'linear-gradient(135deg, #c4b5fd, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                marginBottom: '8px'
                            }}>
                                {displayTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: '1.5rem', color: '#64748b', fontWeight: 600 }}>บาท</div>

                            {cart.length > 0 && (
                                <div style={{ marginTop: '20px', padding: '14px 20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#94a3b8' }}>
                                        <span>สินค้า {cart.length} รายการ ({totalQty} ชิ้น)</span>
                                        <span>{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                                    </div>
                                    {promoDiscount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                            <span style={{ color: '#fbbf24', fontWeight: 600 }}>🏷️ โปรโมชั่นร้าน</span>
                                            <span style={{ color: '#f87171', fontWeight: 700 }}>-{promoDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                                        </div>
                                    )}
                                    {memberDiscount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                            <span style={{ color: '#a78bfa', fontWeight: 600 }}>✨ ส่วนลดสมาชิก</span>
                                            <span style={{ color: '#f87171', fontWeight: 700 }}>-{memberDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                                        </div>
                                    )}
                                    {discounts.manual > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                            <span style={{ color: '#94a3b8' }}>💰 ส่วนลดพิเศษ</span>
                                            <span style={{ color: '#f87171', fontWeight: 700 }}>-{discounts.manual.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                                        </div>
                                    )}
                                    {discounts.points > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                            <span style={{ color: '#94a3b8' }}>🎁 แลกแต้ม</span>
                                            <span style={{ color: '#f87171', fontWeight: 700 }}>-{discounts.points.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                                        </div>
                                    )}
                                    {totalDiscount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px dashed #334155', paddingTop: '8px', marginTop: '2px' }}>
                                            <span style={{ color: '#4ade80', fontWeight: 700 }}>รวมประหยัด</span>
                                            <span style={{ color: '#4ade80', fontWeight: 900 }}>-{totalDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</span>
                                        </div>
                                    )}
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
                {/* Tier Legend Footer */}
                <div style={{ borderTop: '1px solid #1e293b', padding: '14px 20px', background: 'linear-gradient(180deg, #0a1628, #050d1a)' }}>
                    <div style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '10px', textAlign: 'center' }}>
                        ระดับสมาชิก
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {MEMBERSHIP_TIERS.map(tier => {
                            const isActive = member?.tier?.key === tier.key
                            return (
                                <div key={tier.key} style={{
                                    flex: 1, textAlign: 'center', padding: isActive ? '10px 6px' : '8px 6px',
                                    borderRadius: '12px',
                                    background: isActive
                                        ? `linear-gradient(135deg, ${tier.color}44, ${tier.color}18)`
                                        : '#1a2744',
                                    border: `2px solid ${isActive ? tier.color : '#1e293b'}`,
                                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    transform: isActive ? 'scale(1.12) translateY(-4px)' : 'scale(1)',
                                    boxShadow: isActive ? `0 0 18px ${tier.color}55, 0 4px 20px ${tier.color}33` : 'none',
                                    animation: isActive ? 'tierGlow 2s ease-in-out infinite' : 'none',
                                    position: 'relative', overflow: 'hidden',
                                }}>
                                    {isActive && (
                                        <div style={{
                                            position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%',
                                            background: `linear-gradient(90deg, transparent, ${tier.color}33, transparent)`,
                                            animation: 'shimmer 2.5s ease-in-out infinite',
                                            pointerEvents: 'none',
                                        }} />
                                    )}
                                    <div style={{
                                        fontSize: isActive ? '1.6rem' : '1.2rem',
                                        marginBottom: '4px',
                                        filter: isActive ? `drop-shadow(0 0 6px ${tier.color})` : 'none',
                                        transition: 'all 0.3s',
                                    }}>{tier.emoji}</div>
                                    <div style={{
                                        fontSize: '0.65rem', fontWeight: 800,
                                        color: isActive ? tier.color : '#475569',
                                        letterSpacing: isActive ? '0.5px' : '0',
                                    }}>{tier.label}</div>
                                    {tier.discount > 0 ? (
                                        <div style={{
                                            fontSize: '0.72rem', fontWeight: 900, marginTop: '3px',
                                            color: isActive ? '#f87171' : '#334155',
                                            background: isActive ? '#f8717120' : 'transparent',
                                            borderRadius: '4px', padding: isActive ? '1px 4px' : '0',
                                        }}>ลด {tier.discount}%</div>
                                    ) : (
                                        <div style={{ fontSize: '0.6rem', color: '#283548', marginTop: '2px' }}>—</div>
                                    )}
                                    <div style={{ fontSize: '0.55rem', color: isActive ? `${tier.color}99` : '#283548', marginTop: '2px' }}>
                                        {tier.minSpent > 0 ? `฿${(tier.minSpent / 1000).toFixed(0)}K+` : 'เริ่มต้น'}
                                    </div>
                                    {isActive && (
                                        <div style={{ fontSize: '0.5rem', color: tier.color, fontWeight: 900, marginTop: '3px', letterSpacing: '1px' }}>◄ คุณ ►</div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                @keyframes tierGlow { 0%, 100% { box-shadow: 0 0 18px var(--glow, #818cf855), 0 4px 20px var(--glow, #818cf833); } 50% { box-shadow: 0 0 28px var(--glow, #818cf888), 0 4px 24px var(--glow, #818cf855); } }
                @keyframes shimmer { 0% { left: -100%; } 60%, 100% { left: 200%; } }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
            `}</style>
        </div>
    );
}
