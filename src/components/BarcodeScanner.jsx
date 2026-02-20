import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

/**
 * BarcodeScanner component
 * Supports:
 * 1. Camera scanning (phone/webcam)
 * 2. USB barcode scanner (keyboard input mode)
 * 
 * Props:
 * - onScan(code: string) — called when barcode is detected
 * - placeholder — input placeholder text
 */
export default function BarcodeScanner({ onScan, placeholder = 'Scan barcode หรือพิมพ์ SKU...' }) {
    const [cameraActive, setCameraActive] = useState(false)
    const [manualInput, setManualInput] = useState('')
    const scannerRef = useRef(null)
    const html5QrRef = useRef(null)
    const inputRef = useRef(null)
    const lastScanRef = useRef('')
    const lastScanTimeRef = useRef(0)

    // USB Barcode Scanner: listens for rapid keyboard input (scanners type fast)
    useEffect(() => {
        let buffer = ''
        let timeout = null

        const handleKeyDown = (e) => {
            // Ignore if user is typing in another input
            const tag = e.target.tagName.toLowerCase()
            if (tag === 'input' || tag === 'textarea' || tag === 'select') {
                // Only process if it's our barcode input
                if (e.target !== inputRef.current) return
            }

            if (e.key === 'Enter' && buffer.length > 2) {
                e.preventDefault()
                // Debounce: prevent duplicate scans within 500ms
                const now = Date.now()
                if (buffer !== lastScanRef.current || now - lastScanTimeRef.current > 500) {
                    lastScanRef.current = buffer
                    lastScanTimeRef.current = now
                    onScan(buffer.trim())
                }
                buffer = ''
                setManualInput('')
                return
            }

            if (e.key.length === 1) {
                buffer += e.key
                clearTimeout(timeout)
                timeout = setTimeout(() => { buffer = '' }, 100)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            clearTimeout(timeout)
        }
    }, [onScan])

    // Camera scanner
    const startCamera = async () => {
        if (!scannerRef.current) return
        try {
            const html5Qr = new Html5Qrcode('barcode-scanner-view')
            html5QrRef.current = html5Qr

            await html5Qr.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 280, height: 120 },
                    aspectRatio: 2.0,
                },
                (decodedText) => {
                    // Debounce
                    const now = Date.now()
                    if (decodedText !== lastScanRef.current || now - lastScanTimeRef.current > 1000) {
                        lastScanRef.current = decodedText
                        lastScanTimeRef.current = now
                        onScan(decodedText)
                    }
                },
                () => { } // ignore errors
            )
            setCameraActive(true)
        } catch (err) {
            console.error('Camera error:', err)
            alert('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้งานกล้อง')
        }
    }

    const stopCamera = async () => {
        if (html5QrRef.current) {
            try {
                await html5QrRef.current.stop()
            } catch { }
            html5QrRef.current = null
        }
        setCameraActive(false)
    }

    useEffect(() => {
        return () => { stopCamera() }
    }, [])

    const handleManualSubmit = (e) => {
        e.preventDefault()
        if (manualInput.trim()) {
            onScan(manualInput.trim())
            setManualInput('')
        }
    }

    return (
        <div className="barcode-scanner-wrapper">
            {/* Manual input / USB scanner input */}
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                <div className="table-search" style={{ flex: 1, maxWidth: '100%' }}>
                    <span className="search-icon">📷</span>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={placeholder}
                        value={manualInput}
                        onChange={e => setManualInput(e.target.value)}
                        autoFocus
                    />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!manualInput.trim()}>
                    ค้นหา
                </button>
                <button
                    type="button"
                    className={`btn ${cameraActive ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                    onClick={cameraActive ? stopCamera : startCamera}
                >
                    {cameraActive ? '📷 ปิดกล้อง' : '📷 เปิดกล้อง'}
                </button>
            </form>

            {/* Camera view */}
            <div
                ref={scannerRef}
                id="barcode-scanner-view"
                style={{
                    display: cameraActive ? 'block' : 'none',
                    width: '100%',
                    maxWidth: '400px',
                    margin: '0 auto var(--space-md)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    border: '2px solid var(--accent-primary)',
                    boxShadow: 'var(--accent-glow)',
                }}
            />

            {cameraActive && (
                <div style={{
                    textAlign: 'center',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-muted)',
                    marginBottom: 'var(--space-md)',
                    animation: 'pulse 2s infinite',
                }}>
                    📷 หันกล้องไปที่บาร์โค้ด...
                </div>
            )}
        </div>
    )
}
