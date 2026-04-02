import { useState, useEffect } from 'react'
import { getPromotions, addPromotion, togglePromotion, deletePromotion, getProducts, formatCurrency } from '../lib/storage.js'
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
    const toast = useToast()

    const reload = () => { setPromos(getPromotions()); setProducts(getProducts()) }
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
