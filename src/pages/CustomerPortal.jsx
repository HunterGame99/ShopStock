import { useState, useEffect } from 'react'
import { getCustomers, getTransactions, getPromotions, formatCurrency, formatDate, getCustomerTier, getNextTier, MEMBERSHIP_TIERS, getRewards, seedDefaultRewards, getCoupons } from '../lib/storage.js'

export default function CustomerPortal() {
    const [phone, setPhone] = useState('')
    const [customer, setCustomer] = useState(null)
    const [history, setHistory] = useState([])
    const [promotions, setPromotions] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [rewards, setRewards] = useState([])
    const [coupons, setCoupons] = useState([])

    useEffect(() => {
        setPromotions(getPromotions().filter(p => p.active))
        seedDefaultRewards()
        setRewards(getRewards().filter(r => r.active))
        const now = new Date()
        setCoupons(getCoupons().filter(c => c.active && (!c.expiresAt || new Date(c.expiresAt) > now) && (!c.maxUses || c.usedCount < c.maxUses)))
    }, [])

    // Auto-logout after 60 seconds of inactivity
    useEffect(() => {
        if (!customer) return
        let timer = setTimeout(() => { setCustomer(null); setPhone('') }, 60000)
        const resetTimer = () => {
            clearTimeout(timer)
            timer = setTimeout(() => { setCustomer(null); setPhone('') }, 60000)
        }
        window.addEventListener('touchstart', resetTimer)
        window.addEventListener('click', resetTimer)
        window.addEventListener('scroll', resetTimer)
        return () => {
            clearTimeout(timer)
            window.removeEventListener('touchstart', resetTimer)
            window.removeEventListener('click', resetTimer)
            window.removeEventListener('scroll', resetTimer)
        }
    }, [customer])

    const handleSearch = (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        setTimeout(() => {
            const cleanPhone = phone.replace(/\D/g, '')
            if (cleanPhone.length < 9) {
                setError('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง')
                setLoading(false)
                return
            }

            const found = getCustomers().find(c => c.phone.replace(/\D/g, '') === cleanPhone)
            if (found) {
                setCustomer(found)
                // Get last 10 transactions for this customer
                const txs = getTransactions()
                    .filter(t => t.customerId === found.id)
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 10)
                setHistory(txs)
            } else {
                setError('ไม่พบข้อมูลสมาชิกของเบอร์นี้')
            }
            setLoading(false)
        }, 600) // fake delay for UX
    }

    if (!customer) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-md)' }}>
                <div style={{ background: 'var(--bg-card)', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--space-sm)' }}>🎁</div>
                    <h2 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>ShopStock Member</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>เช็คแต้มสะสมและประวัติการซื้อ</p>

                    <form onSubmit={handleSearch}>
                        <div className="form-group" style={{ textAlign: 'left' }}>
                            <label>เบอร์โทรศัพท์สมาชิก</label>
                            <input
                                className="form-control"
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="08x-xxx-xxxx"
                                style={{ fontSize: '1.2rem', padding: '12px', textAlign: 'center', letterSpacing: '2px' }}
                                maxLength="10"
                            />
                        </div>
                        {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-sm)' }}>{error}</div>}
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: 'var(--space-lg)', padding: '12px', fontSize: '1.1rem' }}
                            disabled={loading || phone.length < 9}
                        >
                            {loading ? 'กำลังค้นหา...' : 'ตรวจสอบข้อมูล'}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: 'var(--space-md)' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
                            {customer.name.charAt(0)}
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{customer.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>{customer.phone}</div>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setCustomer(null); setPhone('') }}>ออกระบบ</button>
                </div>

                {/* Tier & Points Card */}
                {(() => {
                    const tier = getCustomerTier(customer)
                    const next = getNextTier(customer)
                    return (
                        <div style={{ background: `linear-gradient(135deg, ${tier.color}ee, ${tier.color}aa)`, padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', color: 'white', marginBottom: 'var(--space-xl)', boxShadow: `0 10px 25px -5px ${tier.color}66` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '1.8rem' }}>{tier.emoji}</span>
                                        <span style={{ fontSize: '1.3rem', fontWeight: 800, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{tier.label} Member</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>{tier.desc}</div>
                                    {tier.discount > 0 && <div style={{ marginTop: '4px', fontSize: '0.85rem', fontWeight: 700, background: 'rgba(255,255,255,0.2)', display: 'inline-block', padding: '2px 10px', borderRadius: '12px' }}>✨ ส่วนลด {tier.discount}% ทุกบิล</div>}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>{(customer.points || 0).toLocaleString()}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '2px' }}>คะแนนสะสม</div>
                                </div>
                            </div>
                            {next && (
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', opacity: 0.85 }}>
                                        <span>ยอดสะสม {formatCurrency(customer.totalSpent || 0)}</span>
                                        <span>ถึง {next.emoji} {next.label} อีก {formatCurrency(next.minSpent - (customer.totalSpent || 0))}</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', background: 'rgba(255,255,255,0.8)', borderRadius: '3px', width: `${Math.min(100, ((customer.totalSpent || 0) / next.minSpent) * 100)}%`, transition: 'width 0.5s' }} />
                                    </div>
                                </div>
                            )}
                            {!next && <div style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: 700 }}>⭐ ระดับสูงสุดแล้ว!</div>}
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.85 }}>
                                <span>ยอดซื้อสะสม: {formatCurrency(customer.totalSpent || 0)}</span>
                                <span>จำนวนครั้ง: {customer.visitCount || 0} ครั้ง</span>
                            </div>
                        </div>
                    )
                })()}

                {/* Tier Roadmap */}
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                    <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>🏆 ระดับสมาชิก</h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {MEMBERSHIP_TIERS.map(t => {
                            const isActive = getCustomerTier(customer).key === t.key
                            return (
                                <div key={t.key} style={{ flex: '1 1 120px', background: isActive ? `${t.color}15` : 'var(--bg-card)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: `2px solid ${isActive ? t.color : 'var(--border)'}`, textAlign: 'center', opacity: isActive ? 1 : 0.6 }}>
                                    <div style={{ fontSize: '1.5rem' }}>{t.emoji}</div>
                                    <div style={{ fontWeight: 700, color: t.color, fontSize: '0.85rem' }}>{t.label}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{t.minSpent > 0 ? `฿${t.minSpent.toLocaleString()}+` : 'เริ่มต้น'}</div>
                                    {t.discount > 0 && <div style={{ fontSize: '0.7rem', color: t.color, fontWeight: 600, marginTop: '2px' }}>ลด {t.discount}%</div>}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Rewards Catalog */}
                {rewards.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                        <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>� แลกของรางวัล</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {rewards.map(r => {
                                const canRedeem = (customer.points || 0) >= r.points
                                return (
                                    <div key={r.id} style={{ background: 'var(--bg-card)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: `1px solid ${canRedeem ? 'var(--success)' : 'var(--border)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: canRedeem ? 1 : 0.5 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '1.8rem' }}>{r.emoji || '🎁'}</span>
                                            <div>
                                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>ใช้ {r.points} คะแนน</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: canRedeem ? 'var(--success)' : 'var(--text-muted)', padding: '4px 12px', borderRadius: '8px', background: canRedeem ? 'var(--success-bg)' : 'var(--bg-secondary)' }}>
                                            {canRedeem ? '✓ แลกได้' : `อีก ${r.points - (customer.points || 0)} pt`}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-sm)', textAlign: 'center' }}>
                            แจ้งพนักงานเพื่อแลกของรางวัล ณ จุดชำระเงิน
                        </div>
                    </div>
                )}

                {/* Available Coupons */}
                {coupons.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                        <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>🎫 คูปองส่วนลด</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {coupons.map(c => (
                                <div key={c.id} style={{ background: 'var(--bg-card)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--accent-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-primary)', fontFamily: 'monospace', letterSpacing: '1px' }}>{c.code}</div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '3px' }}>
                                            {c.type === 'percent' ? `ลด ${c.value}%` : `ลด ${formatCurrency(c.value)}`}
                                            {c.minSpend > 0 && ` • ขั้นต่ำ ${formatCurrency(c.minSpend)}`}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {c.expiresAt && <div style={{ fontSize: '10px', color: 'var(--warning)', fontWeight: 600 }}>หมดอายุ {new Date(c.expiresAt).toLocaleDateString('th-TH')}</div>}
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>แจ้งโค้ดนี้ ณ จุดชำระเงิน</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Active Promotions */}
                {promotions.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                        <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>🌟 โปรโมชั่นเดือนนี้</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {promotions.map(promo => (
                                <div key={promo.id} style={{ background: 'var(--bg-card)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{promo.name}</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>{promo.emoji || '�️'} โปรโมชั่นอัตโนมัติ</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Latest History */}
                <div>
                    <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>📋 ประวัติการใช้บริการล่าสุด</h3>
                    {history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                            ยังไม่มีประวัติการซื้อในระบบ
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {history.map(tx => (
                                <div key={tx.id} style={{ background: 'var(--bg-card)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(tx.total)}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>{formatDate(tx.createdAt)}</div>
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {tx.items.map((item, idx) => (
                                            <span key={idx} style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                                                {item.qty}x {item.productName || item.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
