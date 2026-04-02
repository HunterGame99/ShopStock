import { useState, useEffect, useRef } from 'react'
import { isAIAvailable, initAIChat, sendMessageToAI } from '../lib/aiService.js'

export default function AIAssistant() {
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'สวัสดีครับ! ผมคือผู้จัดการ AI ประจำ ShopStock 🤖\nคุณมีคำถาม หรืออยากให้ผมช่วยวิเคราะห์ข้อมูลส่วนไหนเป็นพิเศษไหมครับ?' }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [isAvailable, setIsAvailable] = useState(true)
    const messagesEndRef = useRef(null)

    useEffect(() => {
        // Check if API key is set
        const available = isAIAvailable()
        setIsAvailable(available)

        if (available) {
            initAIChat()
        }
    }, [])

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        if (!input.trim() || !isAvailable || loading) return

        const userMsg = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', text: userMsg }])
        setLoading(true)

        const responseText = await sendMessageToAI(userMsg)

        setMessages(prev => [...prev, { role: 'ai', text: responseText }])
        setLoading(false)
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    if (!isAvailable) {
        return (
            <div className="chart-container" style={{ border: '1px solid var(--danger)', background: 'var(--danger-bg)' }}>
                <div className="chart-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.2)', paddingBottom: 'var(--space-md)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}>
                        ⚠️ AI ไม่พร้อมใช้งาน (Missing API Key)
                    </h3>
                </div>
                <div style={{ padding: 'var(--space-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                    <p style={{ marginBottom: '8px' }}>คุณยังไม่ได้ตั้งค่า Google Gemini API Key ในแอปพลิเคชัน</p>
                    <ol style={{ paddingLeft: '20px', marginBottom: '8px', color: 'var(--text-muted)' }}>
                        <li>ไปที่ไฟล์ <code>.env</code> (หรือ <code>.env.example</code>)</li>
                        <li>ใส่ค่าคีย์ของคุณลงใน <code>VITE_GEMINI_API_KEY=AIzaSy...</code></li>
                        <li>หากรันอยู่ ให้ Restart เซิร์ฟเวอร์ (npm run dev) ใหม่</li>
                    </ol>
                    <p style={{ fontSize: '12px', opacity: 0.8 }}>Note: สำหรับการ Deploy บน Vercel ให้ไปตั้งค่าในหมวด Environment Variables</p>
                </div>
            </div>
        )
    }

    return (
        <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', height: '500px', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'var(--bg-card)' }}>
            <div className="chart-header" style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)', paddingBottom: 'var(--space-sm)', flexShrink: 0 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary-hover)' }}>
                    ✨ ShopStock AI Manager
                    <span className="badge badge-purple" style={{ fontSize: '0.6rem' }}>Gemini 1.5</span>
                </h3>
            </div>

            {/* Chat History */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                        padding: '12px 16px',
                        borderRadius: msg.role === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                        fontSize: 'var(--font-size-sm)',
                        lineHeight: 1.5,
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        border: msg.role === 'ai' ? '1px solid var(--border)' : 'none',
                        whiteSpace: 'pre-wrap' // Important for AI formatting
                    }}>
                        {msg.text}
                    </div>
                ))}
                {loading && (
                    <div style={{ alignSelf: 'flex-start', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '16px 16px 16px 0', border: '1px solid var(--border)', fontSize: 'var(--font-size-sm)' }}>
                        <span className="animate-pulse">กำลังคิด... 🤔</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div style={{ padding: 'var(--space-md)', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 'var(--space-sm)' }}>
                <input
                    type="text"
                    className="form-control"
                    placeholder="พิมพ์ถาม AI (เช่น สินค้าไหนใกล้หมดสต็อก?)"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={loading}
                    style={{ flex: 1 }}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    style={{ padding: '0 20px' }}
                >
                    ส่ง
                </button>
            </div>
        </div>
    )
}
