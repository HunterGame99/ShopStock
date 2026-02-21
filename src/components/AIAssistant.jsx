import { useState, useEffect } from 'react'
import { getTopProducts, getSlowProducts, predictNextWeekSales, getReorderSuggestions, formatCurrency, getCategoryEmoji } from '../lib/storage.js'

export default function AIAssistant() {
    const [insights, setInsights] = useState(null)
    const [loading, setLoading] = useState(true)

    const analyzeData = () => {
        setLoading(true)
        // Simulate "thinking" for dramatic effect
        setTimeout(() => {
            const top = getTopProducts(14, 3) // Last 14 days, top 3
            const dying = getSlowProducts(14).slice(0, 3) // Dead stock in last 14 days
            const prediction = predictNextWeekSales()
            const reorder = getReorderSuggestions().slice(0, 3)

            setInsights({ top, dying, prediction, reorder })
            setLoading(false)
        }, 1500)
    }

    useEffect(() => {
        analyzeData()
    }, [])

    return (
        <div className="chart-container" style={{ position: 'relative', overflow: 'hidden', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'linear-gradient(145deg, var(--bg-card) 0%, rgba(139, 92, 246, 0.05) 100%)' }}>
            <div className="chart-header" style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)', paddingBottom: 'var(--space-md)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary-hover)' }}>
                    ✨ AI Business Insights
                    <span className="badge badge-purple" style={{ fontSize: '0.6rem' }}>BETA</span>
                </h3>
                <button className="btn btn-ghost btn-sm" onClick={analyzeData} disabled={loading} style={{ color: 'var(--accent-primary)' }}>
                    {loading ? '⏳ กำลังวิเคราะห์...' : '🔄 อัปเดต'}
                </button>
            </div>

            <div style={{ padding: 'var(--space-md) 0' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--accent-primary)', opacity: 0.7 }}>
                        <div className="animate-spin" style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🧠</div>
                        <p style={{ fontSize: 'var(--font-size-sm)' }}>กำลังวิเคราะห์ยอดขายและพฤติกรรมลูกค้า...</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

                        {/* 1. Prediction */}
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: '1.5rem' }}>🔮</div>
                            <div>
                                <div style={{ fontWeight: 700, marginBottom: '2px' }}>แนวโน้มยอดขายสัปดาห์หน้า</div>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                                    ระบบ AI คาดการณ์ว่าสัปดาห์หน้าคุณจะมียอดขายประมาณ <strong style={{ color: 'var(--accent-primary-hover)' }}>{formatCurrency(insights.prediction)}</strong>
                                    (อ้างอิงจากเทรนด์การขาย 14 วันย้อนหลัง)
                                </div>
                            </div>
                        </div>

                        {/* 2. Top Performers */}
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: '1.5rem' }}>🔥</div>
                            <div style={{ width: '100%' }}>
                                <div style={{ fontWeight: 700, marginBottom: '2px' }}>สินค้าดาวรุ่ง (14 วันล่าสุด)</div>
                                {insights.top.length === 0 ? (
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>ยังไม่มีข้อมูลการขายเพียงพอ</div>
                                ) : (
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                        {insights.top.map((p, i) => (
                                            <div key={p.id} style={{ minWidth: '120px', background: 'var(--bg-secondary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--warning)', fontWeight: 800 }}>#{i + 1} ยอดฮิต</div>
                                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>ขายได้ {p.qty} ชิ้น</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Dead Stock Alert */}
                        {insights.dying.length > 0 && (
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
                                <div style={{ fontSize: '1.5rem' }}>🧊</div>
                                <div style={{ width: '100%' }}>
                                    <div style={{ fontWeight: 700, marginBottom: '2px' }}>สินค้าค้างสต็อก (ขายไม่ออกเกิน 14 วัน)</div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>พิจารณาจัดโปรโมชั่น หรือลดราคาเพื่อระบายสต็อก:</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                                        {insights.dying.map(p => (
                                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', background: 'var(--danger-bg)', color: 'var(--danger)', padding: '4px 8px', borderRadius: '4px' }}>
                                                <span>{p.emoji || getCategoryEmoji(p.category)} {p.name}</span>
                                                <span style={{ fontWeight: 700 }}>เหลือ {p.stock} ชิ้น</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. Reorder Suggestions */}
                        {insights.reorder.length > 0 && (
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
                                <div style={{ fontSize: '1.5rem' }}>🛒</div>
                                <div style={{ width: '100%' }}>
                                    <div style={{ fontWeight: 700, marginBottom: '2px' }}>แนะนำให้สั่งซื้อเพิ่มด่วน</div>
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                                        {insights.reorder.map(p => (
                                            <li key={p.id} style={{ marginBottom: '4px' }}>
                                                <strong>{p.name}</strong>
                                                <span style={{ opacity: 0.8 }}> - ควรพรีออเดอร์เพิ่ม {p.suggestedOrder} ชิ้น
                                                    <span style={{ color: 'var(--warning)', marginLeft: '4px' }}>(อาจจะหมดภายใน {p.daysUntilEmpty} วัน)</span></span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
            {/* Background decoration */}
            <div style={{ position: 'absolute', right: '-30px', bottom: '-40px', fontSize: '10rem', opacity: 0.03, pointerEvents: 'none' }}>✨</div>
        </div>
    )
}
