import { useState, useEffect } from 'react'
import { getCustomers, getTransactions, getPromotions, formatCurrency, formatDate } from '../lib/storage.js'

export default function CustomerPortal() {
    const [phone, setPhone] = useState('')
    const [customer, setCustomer] = useState(null)
    const [history, setHistory] = useState([])
    const [promotions, setPromotions] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        // Load active promotions
        setPromotions(getPromotions().filter(p => p.active))
    }, [])

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
                    <button className="btn btn-ghost btn-sm" onClick={() => setCustomer(null)}>ออกระบบ</button>
                </div>

                {/* Points Card */}
                <div style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, #a855f7 100%)', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', color: 'white', marginBottom: 'var(--space-xl)', boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.4)' }}>
                    <div style={{ opacity: 0.9, fontSize: 'var(--font-size-sm)', marginBottom: '8px' }}>คะแนนสะสมของคุณ</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                        {customer.points?.toLocaleString() || 0} <span style={{ fontSize: '1.2rem', fontWeight: 600, opacity: 0.8 }}>PT</span>
                    </div>
                    <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                        <span>ยอดซื้อสะสม: {formatCurrency(customer.totalSpent)}</span>
                        <span>จำนวนครั้ง: {customer.visitCount} ครั้ง</span>
                    </div>
                </div>

                {/* Active Promotions */}
                {promotions.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                        <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>🌟 โปรโมชั่นเดือนนี้</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {promotions.map(promo => (
                                <div key={promo.id} style={{ background: 'var(--bg-card)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{promo.name}</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>ใช้แต้มสะสม {promo.pointsRequired} PT แลกรับสิทธิ์</div>
                                    </div>
                                    <div style={{ fontSize: '2rem' }}>{promo.emoji || '🎁'}</div>
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
