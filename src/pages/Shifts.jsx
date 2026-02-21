import { useState, useEffect } from 'react'
import { getActiveShift, openShift, closeShift, getShifts, getTodaySales, formatCurrency, formatDate } from '../lib/storage.js'
import { useShift, useToast, useAuth } from '../App.jsx'
import { isAdmin } from '../lib/permissions.js'

export default function Shifts() {
    const { activeShift, setActiveShift } = useShift()
    const [pastShifts, setPastShifts] = useState([])
    const [openingCash, setOpeningCash] = useState('')
    const [closingCash, setClosingCash] = useState('')
    const [showClose, setShowClose] = useState(false)
    const [closedReport, setClosedReport] = useState(null)
    const toast = useToast()
    const { user } = useAuth()
    const role = user?.role || 'staff'

    const reload = () => {
        const active = getActiveShift()
        setActiveShift(active)
        let shifts = getShifts().filter(s => s.closedAt)
        if (!isAdmin(role)) {
            shifts = shifts.filter(s => s.openedBy === user?.userName)
        }
        setPastShifts(shifts.slice(0, 10))
    }
    useEffect(() => { reload() }, [])

    const handleOpen = () => {
        if (!openingCash && openingCash !== '0') { toast('กรอกเงินเปิดร้าน', 'error'); return }
        const newShift = openShift(Number(openingCash))
        if (newShift) {
            setOpeningCash('')
            setActiveShift(newShift)
            toast('เริ่มรอบขายสำเร็จ! 🏪')
            reload()
        }
    }

    const handleClose = () => {
        const report = closeShift(Number(closingCash))
        if (report) {
            setClosedReport(report)
            setShowClose(false)
            setClosingCash('')
            setActiveShift(null)
            toast('ปิดรอบขายสำเร็จ ✅')
            reload()
        }
    }

    const todaySales = getTodaySales()
    const todayTotal = todaySales.reduce((s, tx) => s + tx.total, 0)

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>💰 รอบขาย / เงินสด</h2>
                <p>จัดการเปิด-ปิดรอบขาย นับเงินสด</p>
            </div>

            {/* Active Shift or Open new */}
            {!activeShift ? (
                <div className="chart-container" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🏪</div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-lg)' }}>เปิดรอบขายใหม่</h3>
                    <div className="form-group" style={{ maxWidth: '300px', margin: '0 auto' }}>
                        <label>💵 เงินสดเปิดร้าน</label>
                        <input className="form-control" type="number" min="0" value={openingCash} onChange={e => setOpeningCash(e.target.value)} placeholder="0" style={{ textAlign: 'center', fontSize: 'var(--font-size-xl)', fontWeight: 700 }} autoFocus />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', marginTop: 'var(--space-md)', flexWrap: 'wrap' }}>
                        {[0, 500, 1000, 2000, 5000].map(a => (
                            <button key={a} className="btn btn-secondary btn-sm" onClick={() => setOpeningCash(a.toString())}>{a === 0 ? '฿0' : formatCurrency(a)}</button>
                        ))}
                    </div>
                    <button className="btn btn-success btn-lg" onClick={handleOpen} style={{ marginTop: 'var(--space-lg)' }}>🔓 เปิดรอบขาย</button>
                </div>
            ) : (
                <div className="chart-container">
                    <div className="chart-header">
                        <h3>🟢 รอบขายปัจจุบัน</h3>
                        <span className="badge badge-success">เปิด</span>
                    </div>
                    <div className="stat-cards" style={{ marginBottom: 'var(--space-md)' }}>
                        <div className="stat-card mini"><div className="stat-card-icon green">💵</div><div className="stat-card-info"><h3>เงินเปิดร้าน</h3><div className="stat-value" style={{ fontSize: 'var(--font-size-lg)' }}>{formatCurrency(activeShift.openingCash)}</div></div></div>
                        <div className="stat-card mini"><div className="stat-card-icon blue">🛒</div><div className="stat-card-info"><h3>ยอดขายวันนี้</h3><div className="stat-value" style={{ fontSize: 'var(--font-size-lg)' }}>{formatCurrency(todayTotal)}</div></div></div>
                        <div className="stat-card mini"><div className="stat-card-icon purple">📋</div><div className="stat-card-info"><h3>รายการขาย</h3><div className="stat-value" style={{ fontSize: 'var(--font-size-lg)' }}>{todaySales.length}</div></div></div>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>⏰ เปิดเมื่อ {formatDate(activeShift.openedAt)}</p>
                    <button className="btn btn-danger btn-lg" onClick={() => setShowClose(true)} style={{ marginTop: 'var(--space-md)' }}>🔒 ปิดรอบขาย</button>
                </div>
            )}

            {/* Close Shift Modal */}
            {showClose && (
                <div className="modal-overlay" onClick={() => setShowClose(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>🔒 ปิดรอบขาย</h3><button className="btn btn-ghost btn-icon" onClick={() => setShowClose(false)}>✕</button></div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>💵 นับเงินสดจริง</label>
                                <input className="form-control" type="number" min="0" value={closingCash} onChange={e => setClosingCash(e.target.value)} placeholder="กรอกจำนวนเงินสดจริง" style={{ textAlign: 'center', fontSize: 'var(--font-size-xl)', fontWeight: 700 }} autoFocus />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowClose(false)}>ยกเลิก</button>
                            <button className="btn btn-danger btn-lg" onClick={handleClose}>🔒 ยืนยันปิดรอบ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Closed Report Modal */}
            {closedReport && (
                <div className="modal-overlay" onClick={() => setClosedReport(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>📊 สรุปปิดรอบ</h3><button className="btn btn-ghost btn-icon" onClick={() => setClosedReport(null)}>✕</button></div>
                        <div className="modal-body" id="shift-report">
                            <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🧾</div>
                                <h4 style={{ color: 'var(--text-primary)' }}>สรุปรอบขาย</h4>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{formatDate(closedReport.openedAt)} — {formatDate(closedReport.closedAt)}</p>
                            </div>
                            <div className="low-stock-list">
                                <div className="low-stock-item"><span>💵 เงินเปิดร้าน</span><span style={{ fontWeight: 700 }}>{formatCurrency(closedReport.openingCash)}</span></div>
                                <div className="low-stock-item"><span>🛒 ยอดเงินสด</span><span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(closedReport.cashSales)}</span></div>
                                <div className="low-stock-item"><span>📱 ยอดโอน</span><span style={{ fontWeight: 700 }}>{formatCurrency(closedReport.transferSales)}</span></div>
                                <div className="low-stock-item"><span>📲 ยอด QR</span><span style={{ fontWeight: 700 }}>{formatCurrency(closedReport.qrSales)}</span></div>
                                <div className="low-stock-item" style={{ borderTop: '2px solid var(--border)', paddingTop: 'var(--space-md)' }}><span style={{ fontWeight: 800 }}>💰 ยอดรวม</span><span style={{ fontWeight: 800, color: 'var(--accent-primary-hover)', fontSize: 'var(--font-size-lg)' }}>{formatCurrency(closedReport.totalSales)}</span></div>
                                <div className="low-stock-item"><span>📋 จำนวนรายการ</span><span style={{ fontWeight: 700 }}>{closedReport.transactionCount}</span></div>
                                <div className="low-stock-item"><span>💵 เงินสดที่ควรมี</span><span style={{ fontWeight: 700 }}>{formatCurrency(closedReport.expectedCash)}</span></div>
                                <div className="low-stock-item"><span>💵 เงินสดจริง</span><span style={{ fontWeight: 700 }}>{formatCurrency(closedReport.closingCash)}</span></div>
                                <div className="low-stock-item" style={{ background: closedReport.difference >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)' }}>
                                    <span style={{ fontWeight: 800 }}>{closedReport.difference >= 0 ? '✅ เงินเกิน' : '❌ เงินขาด'}</span>
                                    <span style={{ fontWeight: 800, color: closedReport.difference >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: 'var(--font-size-lg)' }}>{formatCurrency(Math.abs(closedReport.difference))}</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => window.print()}>🖨️ พิมพ์</button>
                            <button className="btn btn-primary" onClick={() => setClosedReport(null)}>ปิด</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Past Shifts */}
            <div className="table-container" style={{ marginTop: 'var(--space-lg)' }}>
                <div className="table-toolbar"><h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>📋 ประวัติรอบขาย</h3></div>
                {pastShifts.length === 0 ? (
                    <div className="table-empty"><div className="empty-icon">📋</div><p>ยังไม่มีประวัติ</p></div>
                ) : (
                    <table>
                        <thead><tr><th>วันที่</th><th>เงินเปิด</th><th>ยอดขาย</th><th>เงินสดจริง</th><th>ส่วนต่าง</th><th>รายการ</th></tr></thead>
                        <tbody>
                            {pastShifts.map(s => (
                                <tr key={s.id}>
                                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(s.openedAt)}</td>
                                    <td>{formatCurrency(s.openingCash)}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{formatCurrency(s.totalSales)}</td>
                                    <td>{formatCurrency(s.closingCash)}</td>
                                    <td><span className={`badge ${s.difference >= 0 ? 'badge-success' : 'badge-danger'}`}>{s.difference >= 0 ? '+' : ''}{formatCurrency(s.difference)}</span></td>
                                    <td>{s.transactionCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
