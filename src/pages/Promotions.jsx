import { useState, useEffect } from 'react'
import { getPromotions, addPromotion, togglePromotion, deletePromotion, getProducts, formatCurrency, getRewards, addReward, deleteReward, seedDefaultRewards, getCoupons, addCoupon, deleteCoupon, toggleCoupon, updateCoupon } from '../lib/storage.js'
import { useToast } from '../App.jsx'

const promoTypes = [
    { value: 'percent_all', label: '🏷️ ลดทั้งบิล %', desc: 'ลดราคาทุกสินค้าตาม %' },
    { value: 'buy_x_get_discount', label: '🛒 ซื้อครบ X ลด %', desc: 'ซื้อสินค้าครบ X ชิ้นขึ้นไป ลด %' },
    { value: 'product_discount', label: '📦 ลดราคาสินค้า', desc: 'ลดราคาเฉพาะสินค้าที่เลือก' },
    { value: 'buy_1_get_1', label: '🎁 ซื้อ 1 แถม 1', desc: 'ซื้อ 1 ชิ้น ได้ฟรี 1 ชิ้น (เฉพาะสินค้าที่เลือก หรือ ทั้งร้าน)' },
    { value: 'bundle_price', label: '🎟️ ราคาเหมา (Bundle)', desc: 'ซื้อครบ X ชิ้น จ่ายในราคา Y บาท' },
]

export default function Promotions() {
    const [promos, setPromos] = useState([])
    const [products, setProducts] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({ name: '', type: 'percent_all', value: '', minQty: '', productId: '', bundlePrice: '' })
    const [rewards, setRewards] = useState([])
    const [showRewardModal, setShowRewardModal] = useState(false)
    const [rewardForm, setRewardForm] = useState({ name: '', emoji: '🎁', points: '', type: 'discount', value: '' })
    const [coupons, setCoupons] = useState([])
    const [showCouponModal, setShowCouponModal] = useState(false)
    const [editCouponId, setEditCouponId] = useState(null)
    const [couponForm, setCouponForm] = useState({ code: '', type: 'fixed', value: '', minSpend: '', maxUses: '', expiresAt: '' })
    const toast = useToast()

    const reload = () => { setPromos(getPromotions()); setProducts(getProducts()); seedDefaultRewards(); setRewards(getRewards()); setCoupons(getCoupons()) }
    useEffect(() => { reload() }, [])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!form.name) { toast('กรุณากรอกชื่อโปรโมชั่น', 'error'); return }
        if (form.type !== 'buy_1_get_1' && form.type !== 'bundle_price' && !form.value) { toast('กรุณากรอกส่วนลด', 'error'); return }
        if (form.type === 'bundle_price' && !form.bundlePrice) { toast('กรุณากรอกราคาเหมา', 'error'); return }

        addPromotion({
            ...form,
            value: Number(form.value) || 0,
            minQty: Number(form.minQty) || (form.type === 'buy_1_get_1' ? 2 : 1),
            bundlePrice: Number(form.bundlePrice) || 0
        })
        toast('สร้าง Promotion สำเร็จ 🎉')
        setShowModal(false); setForm({ name: '', type: 'percent_all', value: '', minQty: '', productId: '', bundlePrice: '' }); reload()
    }

    const handleToggle = (id) => { togglePromotion(id); reload() }
    const handleDelete = (id) => { if (!confirm('ยืนยันลบโปรโมชั่นนี้?')) return; deletePromotion(id); toast('ลบ Promotion สำเร็จ'); reload() }

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>🏷️ โปรโมชั่น</h2>
                <p>จัดการโปรโมชั่นและส่วนลดอัตโนมัติ</p>
            </div>

            <div className="table-container">
                <div className="table-toolbar">
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>โปรโมชั่นทั้งหมด ({promos.length})</h3>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ สร้างโปรโมชั่น</button>
                </div>
                {promos.length === 0 ? (
                    <div className="table-empty"><div className="empty-icon">🏷️</div><p>ยังไม่มีโปรโมชั่น</p></div>
                ) : (
                    <table>
                        <thead><tr><th>ชื่อ</th><th>ประเภท</th><th>ส่วนลด</th><th>เงื่อนไข</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
                        <tbody>
                            {promos.map(p => (
                                <tr key={p.id} style={{ opacity: p.active ? 1 : 0.5 }}>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                                    <td><span className="badge badge-purple">{promoTypes.find(t => t.value === p.type)?.label || p.type}</span></td>
                                    <td style={{ fontWeight: 700, color: 'var(--danger)' }}>
                                        {p.type === 'buy_1_get_1' ? '1 แถม 1' : p.type === 'bundle_price' ? `ราคาเหมา ฿${p.bundlePrice}` : `-${p.value}%`}
                                    </td>
                                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                        {p.type === 'buy_x_get_discount' || p.type === 'bundle_price' ? `ซื้อ ≥${p.minQty} ชิ้น` : p.productId ? products.find(pr => pr.id === p.productId)?.name || '-' : 'ทุกสินค้า'}
                                    </td>
                                    <td>
                                        <button className={`btn btn-sm ${p.active ? 'btn-success' : 'btn-secondary'}`} onClick={() => handleToggle(p.id)}>
                                            {p.active ? '🟢 เปิด' : '⭕ ปิด'}
                                        </button>
                                    </td>
                                    <td><button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id)}>🗑️</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Coupons */}
            <div className="table-container" style={{ marginTop: 'var(--space-xl)' }}>
                <div className="table-toolbar">
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>🎫 คูปองส่วนลด ({coupons.length})</h3>
                    <button className="btn btn-primary" onClick={() => setShowCouponModal(true)}>➕ สร้างคูปอง</button>
                </div>
                {coupons.length === 0 ? (
                    <div className="table-empty"><div className="empty-icon">🎫</div><p>ยังไม่มีคูปอง</p></div>
                ) : (
                    <table>
                        <thead><tr><th>โค้ด</th><th>ประเภท</th><th>ส่วนลด</th><th>ยอดขั้นต่ำ</th><th>ใช้แล้ว</th><th>หมดอายุ</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
                        <tbody>
                            {coupons.map(c => (
                                <tr key={c.id} style={{ opacity: c.active ? 1 : 0.5 }}>
                                    <td style={{ fontWeight: 800, color: 'var(--accent-primary-hover)', letterSpacing: '1px', fontFamily: 'monospace' }}>{c.code}</td>
                                    <td><span className={`badge ${c.type === 'percent' ? 'badge-purple' : 'badge-success'}`}>{c.type === 'percent' ? '% เปอร์เซ็นต์' : '฿ บาท'}</span></td>
                                    <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{c.type === 'percent' ? `-${c.value}%` : `-฿${c.value}`}</td>
                                    <td>{c.minSpend > 0 ? `฿${c.minSpend.toLocaleString()}` : '-'}</td>
                                    <td>{c.maxUses > 0 ? `${c.usedCount || 0}/${c.maxUses}` : `${c.usedCount || 0}/∞`}</td>
                                    <td style={{ fontSize: 'var(--font-size-xs)', color: c.expiresAt && new Date(c.expiresAt) < new Date() ? 'var(--danger)' : 'var(--text-muted)' }}>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('th-TH') : 'ไม่มี'}</td>
                                    <td><button className={`btn btn-sm ${c.active ? 'btn-success' : 'btn-secondary'}`} onClick={() => { toggleCoupon(c.id); reload() }}>{c.active ? '🟢 เปิด' : '⭕ ปิด'}</button></td>
                                    <td style={{ display: 'flex', gap: '2px' }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditCouponId(c.id); setCouponForm({ code: c.code, type: c.type, value: c.value.toString(), minSpend: c.minSpend ? c.minSpend.toString() : '', maxUses: c.maxUses ? c.maxUses.toString() : '', expiresAt: c.expiresAt || '' }); setShowCouponModal(true) }} title="แก้ไข">✏️</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('ลบคูปองนี้?')) { deleteCoupon(c.id); reload(); toast('ลบแล้ว') } }}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add/Edit Coupon Modal */}
            {showCouponModal && (
                <div className="modal-overlay" onClick={() => { setShowCouponModal(false); setEditCouponId(null) }}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>{editCouponId ? '✏️ แก้ไขคูปอง' : '➕ สร้างคูปอง'}</h3><button className="btn btn-ghost btn-icon" onClick={() => { setShowCouponModal(false); setEditCouponId(null) }}>✕</button></div>
                        <form onSubmit={e => {
                            e.preventDefault()
                            if (!couponForm.code || !couponForm.value) { toast('กรอกโค้ดและส่วนลด', 'error'); return }
                            const couponData = { code: couponForm.code.toUpperCase().trim(), type: couponForm.type, value: Number(couponForm.value), minSpend: Number(couponForm.minSpend) || 0, maxUses: Number(couponForm.maxUses) || 0, expiresAt: couponForm.expiresAt || null }
                            if (editCouponId) {
                                updateCoupon(editCouponId, couponData)
                                toast('แก้ไขคูปองสำเร็จ ✏️')
                            } else {
                                addCoupon(couponData)
                                toast('สร้างคูปองสำเร็จ 🎫')
                            }
                            setShowCouponModal(false); setEditCouponId(null)
                            setCouponForm({ code: '', type: 'fixed', value: '', minSpend: '', maxUses: '', expiresAt: '' })
                            reload()
                        }}>
                            <div className="modal-body">
                                <div className="form-group"><label>โค้ดคูปอง *</label><input className="form-control" value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="เช่น SAVE10, WELCOME20" required autoFocus style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }} /></div>
                                <div className="form-group">
                                    <label>ประเภทส่วนลด</label>
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                        <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: 'var(--space-sm) var(--space-md)', background: couponForm.type === 'fixed' ? 'rgba(99,102,241,0.1)' : 'var(--bg-input)', border: `1px solid ${couponForm.type === 'fixed' ? 'var(--accent-primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                                            <input type="radio" checked={couponForm.type === 'fixed'} onChange={() => setCouponForm({ ...couponForm, type: 'fixed' })} /> ฿ ลดเป็นบาท
                                        </label>
                                        <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: 'var(--space-sm) var(--space-md)', background: couponForm.type === 'percent' ? 'rgba(99,102,241,0.1)' : 'var(--bg-input)', border: `1px solid ${couponForm.type === 'percent' ? 'var(--accent-primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                                            <input type="radio" checked={couponForm.type === 'percent'} onChange={() => setCouponForm({ ...couponForm, type: 'percent' })} /> % เปอร์เซ็นต์
                                        </label>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                    <div className="form-group" style={{ flex: 1 }}><label>{couponForm.type === 'percent' ? 'ส่วนลด (%) *' : 'ส่วนลด (฿) *'}</label><input className="form-control" type="number" min="1" max={couponForm.type === 'percent' ? 100 : 99999} value={couponForm.value} onChange={e => setCouponForm({ ...couponForm, value: e.target.value })} placeholder={couponForm.type === 'percent' ? '10' : '50'} required /></div>
                                    <div className="form-group" style={{ flex: 1 }}><label>ยอดขั้นต่ำ (฿)</label><input className="form-control" type="number" min="0" value={couponForm.minSpend} onChange={e => setCouponForm({ ...couponForm, minSpend: e.target.value })} placeholder="0 = ไม่มีขั้นต่ำ" /></div>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                    <div className="form-group" style={{ flex: 1 }}><label>จำกัดการใช้</label><input className="form-control" type="number" min="0" value={couponForm.maxUses} onChange={e => setCouponForm({ ...couponForm, maxUses: e.target.value })} placeholder="0 = ไม่จำกัด" /></div>
                                    <div className="form-group" style={{ flex: 1 }}><label>วันหมดอายุ</label><input className="form-control" type="date" value={couponForm.expiresAt} onChange={e => setCouponForm({ ...couponForm, expiresAt: e.target.value })} /></div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowCouponModal(false); setEditCouponId(null) }}>ยกเลิก</button>
                                <button type="submit" className="btn btn-primary">{editCouponId ? '💾 บันทึก' : '🎫 สร้างคูปอง'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Rewards Catalog */}
            <div className="table-container" style={{ marginTop: 'var(--space-xl)' }}>
                <div className="table-toolbar">
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>🎁 ของรางวัลแลกแต้ม ({rewards.length})</h3>
                    <button className="btn btn-primary" onClick={() => setShowRewardModal(true)}>➕ เพิ่มของรางวัล</button>
                </div>
                {rewards.length === 0 ? (
                    <div className="table-empty"><div className="empty-icon">🎁</div><p>ยังไม่มีของรางวัล</p></div>
                ) : (
                    <table>
                        <thead><tr><th></th><th>ชื่อ</th><th>ประเภท</th><th>คะแนน</th><th>มูลค่า</th><th>จัดการ</th></tr></thead>
                        <tbody>
                            {rewards.map(r => (
                                <tr key={r.id} style={{ opacity: r.active ? 1 : 0.5 }}>
                                    <td style={{ fontSize: '1.3rem', textAlign: 'center' }}>{r.emoji || '🎁'}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</td>
                                    <td><span className={`badge ${r.type === 'discount' ? 'badge-success' : 'badge-purple'}`}>{r.type === 'discount' ? '🏷️ ส่วนลด' : '🎁 ของแถม'}</span></td>
                                    <td style={{ fontWeight: 700, color: 'var(--accent-primary-hover)' }}>🪙 {r.points}</td>
                                    <td style={{ fontWeight: 600 }}>{r.type === 'discount' ? `-${formatCurrency(r.value)}` : `≤ ${formatCurrency(r.value)}`}</td>
                                    <td><button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('ลบของรางวัลนี้?')) { deleteReward(r.id); reload(); toast('ลบแล้ว') } }}>🗑️</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add Reward Modal */}
            {showRewardModal && (
                <div className="modal-overlay" onClick={() => setShowRewardModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>➕ เพิ่มของรางวัล</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowRewardModal(false)}>✕</button></div>
                        <form onSubmit={e => {
                            e.preventDefault()
                            if (!rewardForm.name || !rewardForm.points) { toast('กรอกข้อมูลให้ครบ', 'error'); return }
                            addReward({ name: rewardForm.name, emoji: rewardForm.emoji, points: Number(rewardForm.points), type: rewardForm.type, value: Number(rewardForm.value) || 0 })
                            toast('เพิ่มของรางวัลสำเร็จ 🎁')
                            setShowRewardModal(false)
                            setRewardForm({ name: '', emoji: '🎁', points: '', type: 'discount', value: '' })
                            reload()
                        }}>
                            <div className="modal-body">
                                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                    <div className="form-group" style={{ width: '80px' }}><label>Emoji</label><input className="form-control" value={rewardForm.emoji} onChange={e => setRewardForm({ ...rewardForm, emoji: e.target.value })} style={{ textAlign: 'center', fontSize: '1.5rem' }} /></div>
                                    <div className="form-group" style={{ flex: 1 }}><label>ชื่อของรางวัล *</label><input className="form-control" value={rewardForm.name} onChange={e => setRewardForm({ ...rewardForm, name: e.target.value })} placeholder="เช่น ส่วนลด ฿50" required autoFocus /></div>
                                </div>
                                <div className="form-group">
                                    <label>ประเภท</label>
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                        <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: 'var(--space-sm) var(--space-md)', background: rewardForm.type === 'discount' ? 'rgba(99,102,241,0.1)' : 'var(--bg-input)', border: `1px solid ${rewardForm.type === 'discount' ? 'var(--accent-primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                                            <input type="radio" checked={rewardForm.type === 'discount'} onChange={() => setRewardForm({ ...rewardForm, type: 'discount' })} /> 🏷️ ส่วนลด
                                        </label>
                                        <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: 'var(--space-sm) var(--space-md)', background: rewardForm.type === 'freebie' ? 'rgba(99,102,241,0.1)' : 'var(--bg-input)', border: `1px solid ${rewardForm.type === 'freebie' ? 'var(--accent-primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                                            <input type="radio" checked={rewardForm.type === 'freebie'} onChange={() => setRewardForm({ ...rewardForm, type: 'freebie' })} /> 🎁 ของแถม
                                        </label>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                    <div className="form-group" style={{ flex: 1 }}><label>คะแนนที่ใช้แลก *</label><input className="form-control" type="number" min="1" value={rewardForm.points} onChange={e => setRewardForm({ ...rewardForm, points: e.target.value })} placeholder="100" required /></div>
                                    <div className="form-group" style={{ flex: 1 }}><label>{rewardForm.type === 'discount' ? 'มูลค่าส่วนลด (฿)' : 'มูลค่าสูงสุด (฿)'}</label><input className="form-control" type="number" min="0" value={rewardForm.value} onChange={e => setRewardForm({ ...rewardForm, value: e.target.value })} placeholder="50" /></div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowRewardModal(false)}>ยกเลิก</button>
                                <button type="submit" className="btn btn-primary">🎁 เพิ่มของรางวัล</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>➕ สร้างโปรโมชั่น</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group"><label>ชื่อโปร *</label><input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="เช่น ลด 10% ทั้งร้าน" required autoFocus /></div>
                                <div className="form-group">
                                    <label>ประเภท</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                        {promoTypes.map(t => (
                                            <label key={t.value} style={{
                                                display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)',
                                                background: form.type === t.value ? 'rgba(99,102,241,0.1)' : 'var(--bg-input)',
                                                border: `1px solid ${form.type === t.value ? 'var(--accent-primary)' : 'var(--border)'}`,
                                                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                            }}>
                                                <input type="radio" name="type" checked={form.type === t.value} onChange={() => setForm({ ...form, type: t.value })} />
                                                <div><div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{t.label}</div><div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{t.desc}</div></div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{form.type === 'buy_1_get_1' || form.type === 'bundle_price' ? 'ส่วนลด (%) (ไม่ได้ใช้สำหรับประเภทนี้)' : 'ส่วนลด (%) *'}</label>
                                    <input className="form-control" type="number" min="0" max="100" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="10" disabled={form.type === 'buy_1_get_1' || form.type === 'bundle_price'} />
                                </div>
                                {(form.type === 'buy_x_get_discount' || form.type === 'bundle_price') && (
                                    <div className="form-group"><label>จำนวนขั้นต่ำ (ชิ้น) *</label><input className="form-control" type="number" min="1" value={form.minQty} onChange={e => setForm({ ...form, minQty: e.target.value })} placeholder="3" required /></div>
                                )}
                                {form.type === 'bundle_price' && (
                                    <div className="form-group"><label>ราคาเหมา (บาท) *</label><input className="form-control" type="number" min="0" value={form.bundlePrice} onChange={e => setForm({ ...form, bundlePrice: e.target.value })} placeholder="เช่น 100" required /></div>
                                )}
                                {(form.type === 'product_discount' || form.type === 'buy_1_get_1' || form.type === 'bundle_price') && (
                                    <div className="form-group"><label>สินค้าที่ร่วมรายการ (ปล่อยว่าง = ทุกสินค้า)</label>
                                        <select className="form-control" value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}>
                                            <option value="">เลือกสินค้า</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>ยกเลิก</button>
                                <button type="submit" className="btn btn-primary">🏷️ สร้างโปรโมชั่น</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
