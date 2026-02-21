import { useState, useEffect } from 'react'
import { getSettings, saveSettings, getUsers, saveUsers, generateId, getBranches, saveBranches } from '../lib/storage.js'
import { useAuth, useToast } from '../App.jsx'

export default function Settings() {
    const { user: currentUser } = useAuth()
    const [settings, setSettings] = useState({
        shopName: 'ShopStock',
        shopAddress: '',
        shopPhone: '',
        receiptFooter: 'ขอบคุณที่ใช้บริการ ❤️',
        vatEnabled: false,
        vatRate: 7,
        vatRate: 7,
        theme: 'dark',
        telegramBotToken: '',
        telegramChatId: '',
    })
    const [branches, setBranches] = useState([])
    const [showBranchModal, setShowBranchModal] = useState(false)
    const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '' })

    const [users, setUsers] = useState([])
    const [showUserModal, setShowUserModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [userForm, setUserForm] = useState({ name: '', pin: '', role: 'staff', branchId: 'default' })
    const toast = useToast()

    useEffect(() => {
        setSettings(prev => ({ ...prev, ...getSettings() }))
        setUsers(getUsers())
        setBranches(getBranches())
    }, [])

    const handleSave = () => {
        saveSettings(settings)
        toast('บันทึกการตั้งค่าแล้ว ✨')
    }

    const handleUserSave = () => {
        if (!userForm.name || userForm.pin.length !== 4) { toast('กรุณากรอกชื่อและ PIN 4 หลัก', 'error'); return }
        // Check duplicate PIN
        const duplicatePin = users.find(u => u.pin === userForm.pin && (!editingUser || u.id !== editingUser.id))
        if (duplicatePin) { toast(`PIN ${userForm.pin} ถูกใช้โดย "${duplicatePin.name}" แล้ว กรุณาใช้ PIN อื่น`, 'error'); return }
        let newUsers = [...users]
        if (editingUser) {
            newUsers = newUsers.map(u => u.id === editingUser.id ? { ...u, ...userForm } : u)
        } else {
            newUsers.push({ ...userForm, id: generateId(), createdAt: new Date().toISOString() })
        }
        saveUsers(newUsers)
        setUsers(newUsers)
        setShowUserModal(false)
        setEditingUser(null)
        setUserForm({ name: '', pin: '', role: 'staff', branchId: 'default' })
        toast('บันทึกข้อมูลพนักงานแล้ว 👤')
    }

    const deleteUser = (id) => {
        if (id === 'admin') { toast('ไม่สามารถลบเจ้าของร้านได้', 'error'); return }
        if (window.confirm('ยืนยันการลบพนักงาน?')) {
            const newUsers = users.filter(u => u.id !== id)
            saveUsers(newUsers)
            setUsers(newUsers)
            toast('ลบพนักงานแล้ว')
        }
    }

    const handleBranchSave = () => {
        if (!branchForm.name) { toast('กรุณากรอกชื่อสาขา', 'error'); return }
        const newBranches = [...branches, { ...branchForm, id: `br_${generateId()}`, createdAt: new Date().toISOString() }]
        saveBranches(newBranches)
        setBranches(newBranches)
        setShowBranchModal(false)
        setBranchForm({ name: '', address: '', phone: '' })
        toast('เพิ่มสาขาเรียบร้อย 🏢')
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>⚙️ ตั้งค่าระบบ</h2>
                <p>จัดการข้อมูลร้านค้า พนักงาน และความปลอดภัย</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
                {/* Shop Info */}
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>🏪 ข้อมูลร้านค้า</h3>
                    <div className="form-group">
                        <label>ชื่อร้านค้า</label>
                        <input className="form-control" type="text" value={settings.shopName} onChange={e => setSettings({ ...settings, shopName: e.target.value })} placeholder="เช่น ร้านค้าคุณใจดี" />
                    </div>
                    <div className="form-group">
                        <label>ที่อยู่ร้าน (จะปรากฏในใบเสร็จ)</label>
                        <textarea className="form-control" value={settings.shopAddress} onChange={e => setSettings({ ...settings, shopAddress: e.target.value })} placeholder="123 ถ.สุขุมวิท..." rows="3" />
                    </div>
                    <div className="form-group">
                        <label>เบอร์โทรศัพท์</label>
                        <input className="form-control" type="text" value={settings.shopPhone} onChange={e => setSettings({ ...settings, shopPhone: e.target.value })} placeholder="08x-xxx-xxxx" />
                    </div>
                    <div className="form-group">
                        <label>ข้อความท้ายใบเสร็จ</label>
                        <input className="form-control" type="text" value={settings.receiptFooter} onChange={e => setSettings({ ...settings, receiptFooter: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={settings.vatEnabled} onChange={e => setSettings({ ...settings, vatEnabled: e.target.checked })} id="vat-toggle" />
                            <label htmlFor="vat-toggle" style={{ margin: 0, cursor: 'pointer' }}>ใช้งาน VAT</label>
                        </div>
                        {settings.vatEnabled && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input className="form-control" type="number" value={settings.vatRate} onChange={e => setSettings({ ...settings, vatRate: Number(e.target.value) })} style={{ width: '60px', padding: '4px 8px' }} />
                                <span>%</span>
                            </div>
                        )}
                    </div>
                    <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                        <label>Telegram Bot Token</label>
                        <input className="form-control" type="text" value={settings.telegramBotToken || ''} onChange={e => setSettings({ ...settings, telegramBotToken: e.target.value })} placeholder="เช่น 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" />
                    </div>
                    <div className="form-group" style={{ marginTop: 'var(--space-sm)' }}>
                        <label>Telegram Chat ID</label>
                        <input className="form-control" type="text" value={settings.telegramChatId || ''} onChange={e => setSettings({ ...settings, telegramChatId: e.target.value })} placeholder="เช่น 123456789 หรือ -100123456789 (สำหรับกลุ่ม)" />
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>รับแจ้งเตือนเมื่อเปิด/ปิดกะ หรือสต็อกเหลือน้อย ผ่านบอท Telegram</div>
                    </div>
                    <button className="btn btn-primary" onClick={handleSave} style={{ marginTop: 'var(--space-xl)', width: '100%', justifyContent: 'center' }}>✅ บันทึกข้อมูลร้าน</button>
                </div>

                {/* Branches Management */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                        <h3 style={{ color: 'var(--text-primary)' }}>🏢 สาขาทั้งหมด</h3>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowBranchModal(true)}>+ เพิ่มสาขาใหม่</button>
                    </div>
                    <div className="low-stock-list">
                        {branches.map(b => (
                            <div key={b.id} className="low-stock-item">
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '12px', background: 'var(--accent-primary-hover)' }}>🏢</div>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{b.name} {b.id === 'default' && '(สาขาหลัก)'}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>พนักงาน {users.filter(u => u.branchId === b.id || (b.id === 'default' && !u.branchId) || u.branchId === 'all').length} คน</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Staff Management */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                        <h3 style={{ color: 'var(--text-primary)' }}>👥 พนักงาน & ความปลอดภัย</h3>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowUserModal(true)}>+ เพิ่มพนักงาน</button>
                    </div>

                    <div className="low-stock-list">
                        {users.map(u => (
                            <div key={u.id} className="low-stock-item">
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '10px' }}>{u.name.charAt(0)}</div>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{u.name}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                            {u.role === 'admin' ? 'Admin' : 'Cashier'}
                                            • PIN: {u.pin}
                                            <span style={{ marginLeft: '4px', background: 'var(--bg-card)', padding: '2px 4px', borderRadius: '4px' }}>
                                                {u.branchId === 'all' ? 'ทุกสาขา' : branches.find(b => b.id === (u.branchId || 'default'))?.name || 'สาขาหลัก'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="table-actions">
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingUser(u); setUserForm({ name: u.name, pin: u.pin, role: u.role, branchId: u.branchId || 'default' }); setShowUserModal(true) }}>✏️</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => deleteUser(u.id)} style={{ color: 'var(--danger)' }}>🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Staff Modal */}
            {showUserModal && (
                <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header"><h3>{editingUser ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงานใหม่'}</h3></div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>ชื่อพนักงาน</label>
                                <input className="form-control" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} placeholder="ชื่อ-นามสกุล" />
                            </div>
                            <div className="form-group">
                                <label>รหัส PIN (4 หลัก)</label>
                                <input className="form-control" type="text" maxLength="4" value={userForm.pin} onChange={e => setUserForm({ ...userForm, pin: e.target.value.replace(/\D/g, '') })} placeholder="1234" />
                            </div>
                            <div className="form-group">
                                <label>ตำแหน่ง</label>
                                <select className="form-control" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                                    <option value="staff">พนักงานขาย (Cashier)</option>
                                    <option value="admin">เจ้าของร้าน (Admin)</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                                <label>สาขาที่รับผิดชอบ</label>
                                <select className="form-control" value={userForm.branchId} onChange={e => setUserForm({ ...userForm, branchId: e.target.value })}>
                                    {userForm.role === 'admin' && <option value="all">ดูแลทุกสาขา (Global)</option>}
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowUserModal(false)}>ยกเลิก</button>
                            <button className="btn btn-primary" onClick={handleUserSave}>บันทึกข้อมูล</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Branch Modal */}
            {showBranchModal && (
                <div className="modal-overlay" onClick={() => setShowBranchModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header"><h3>เพิ่มสาขาใหม่</h3></div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>ชื่อสาขา</label>
                                <input className="form-control" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} placeholder="เช่น สาขาลาดพร้าว 71" autoFocus />
                            </div>
                            <div className="form-group" style={{ marginTop: '10px' }}>
                                <label>เบอร์โทรสาขา</label>
                                <input className="form-control" value={branchForm.phone} onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })} placeholder="02-xxx-xxxx" />
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--warning)', marginTop: 'var(--space-md)' }}>
                                ⚠️ <b>หมายเหตุ:</b> สินค้า โควต้าต่างๆ จะถูกแยกขาดจากกันในแต่ละสาขาทันทีที่คุณสลับไปใช้สาขานี้
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowBranchModal(false)}>ยกเลิก</button>
                            <button className="btn btn-primary" onClick={handleBranchSave}>บันทึกสาขา</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
