import { useState, useEffect } from 'react'
import { getExpenses, addExpense, deleteExpense, EXPENSE_CATEGORIES, formatCurrency, formatDate } from '../lib/storage.js'
import { useToast } from '../App.jsx'

export default function Expenses() {
    const [expenses, setExpenses] = useState([])
    const [showAdd, setShowAdd] = useState(false)
    const [newExpense, setNewExpense] = useState({ title: '', amount: '', category: 'จิปาถะ', note: '' })
    const toast = useToast()

    const reload = () => setExpenses(getExpenses())
    useEffect(() => { reload() }, [])

    const handleAdd = () => {
        if (!newExpense.title || !newExpense.amount) {
            toast('กรุณากรอกชื่อและจำนวนเงิน', 'error')
            return
        }
        addExpense({ ...newExpense, amount: Number(newExpense.amount) })
        toast('บันทึกรายจ่ายแล้ว 💵')
        setShowAdd(false)
        setNewExpense({ title: '', amount: '', category: 'จิปาถะ', note: '' })
        reload()
    }

    const handleDelete = (id) => {
        if (confirm('ยืนยันการลบรายจ่าย?')) {
            deleteExpense(id)
            toast('ลบรายจ่ายแล้ว')
            reload()
        }
    }

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>📉 รายจ่าย</h2>
                    <p>จัดการค่าน้ำ ค่าไฟ ค่าเช่า และค่าใช้จ่ายอื่นๆ</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAdd(true)}>➕ เพิ่มรายจ่าย</button>
            </div>

            <div className="stat-cards" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="stat-card">
                    <div className="stat-card-icon red">📉</div>
                    <div className="stat-card-info">
                        <h3>รายจ่ายรวมทั้งหมด</h3>
                        <div className="stat-value">{formatCurrency(totalExpenses)}</div>
                        <div className="stat-sub">{expenses.length} รายการ</div>
                    </div>
                </div>
            </div>

            <div className="table-container">
                {expenses.length === 0 ? (
                    <div className="table-empty">
                        <div className="empty-icon">💸</div>
                        <p>ยังไม่มีรายการรายจ่าย</p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>วันที่</th>
                                <th>หมวดหมู่</th>
                                <th>รายการ</th>
                                <th>จำนวนเงิน</th>
                                <th>หมายเหตุ</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map(e => (
                                <tr key={e.id}>
                                    <td>{formatDate(e.createdAt)}</td>
                                    <td>
                                        <span className="badge badge-secondary">
                                            {EXPENSE_CATEGORIES.find(cat => cat.name === e.category)?.icon} {e.category}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{e.title}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(e.amount)}</td>
                                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{e.note}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e.id)} style={{ color: 'var(--danger)' }}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showAdd && (
                <div className="modal-overlay" onClick={() => setShowAdd(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>➕ เพิ่มรายการรายจ่าย</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>ชื่อรายการ</label>
                                <input className="form-control" type="text" value={newExpense.title} onChange={e => setNewExpense({ ...newExpense, title: e.target.value })} placeholder="เช่น ค่าไฟฟ้าเดือนมกราคม" />
                            </div>
                            <div className="form-group">
                                <label>จำนวนเงิน (บาท)</label>
                                <input className="form-control" type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="form-group">
                                <label>หมวดหมู่</label>
                                <select className="form-control" value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}>
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <option key={cat.name} value={cat.name}>{cat.icon} {cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>หมายเหตุ</label>
                                <textarea className="form-control" value={newExpense.note} onChange={e => setNewExpense({ ...newExpense, note: e.target.value })} placeholder="รายละเอียดเพิ่มเติม..." rows="2" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>ยกเลิก</button>
                            <button className="btn btn-primary" onClick={handleAdd}>✅ บันทึกรายการ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
