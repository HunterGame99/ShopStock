import { useState, useEffect } from 'react'
import { getSettings, saveSettings } from '../lib/storage.js'
import { useToast } from '../App.jsx'

export default function Settings() {
    const [settings, setSettings] = useState({
        shopName: 'ShopStock',
        shopAddress: '',
        shopPhone: '',
        receiptFooter: 'ขอบคุณที่ใช้บริการ ❤️',
        vatEnabled: false,
        vatRate: 7,
        theme: 'dark',
    })
    const toast = useToast()

    useEffect(() => {
        const saved = getSettings()
        setSettings(prev => ({ ...prev, ...saved }))
    }, [])

    const handleSave = () => {
        saveSettings(settings)
        toast('บันทึกการตั้งค่าแล้ว ✨')
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>⚙️ ตั้งค่าร้านค้า</h2>
                <p>ข้อมูลร้านค้าและรูปแบบใบเสร็จ</p>
            </div>

            <div className="card" style={{ maxWidth: '600px' }}>
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
                        <label htmlFor="vat-toggle" style={{ margin: 0, cursor: 'pointer' }}>ใช้งานภาษีมูลค่าเพิ่ม (VAT)</label>
                    </div>
                    {settings.vatEnabled && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input className="form-control" type="number" value={settings.vatRate} onChange={e => setSettings({ ...settings, vatRate: Number(e.target.value) })} style={{ width: '60px', padding: '4px 8px' }} />
                            <span>%</span>
                        </div>
                    )}
                </div>

                <button className="btn btn-primary" onClick={handleSave} style={{ marginTop: 'var(--space-xl)', width: '100%', justifyContent: 'center' }}>
                    ✅ บันทึกการตั้งค่า
                </button>
            </div>
        </div>
    )
}
