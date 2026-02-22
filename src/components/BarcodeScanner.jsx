import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function BarcodeScanner({ onScanSuccess, onClose }) {
    const [scanError, setScanError] = useState(null);

    useEffect(() => {
        // Initialize Scanner on mount
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true
        };
        const html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", config, false);

        html5QrcodeScanner.render(
            (decodedText, decodedResult) => {
                // Success
                onScanSuccess(decodedText);
                // We don't automatically clear the scanner so they can scan multiple items fast.
                // The parent component controls onClose.
            },
            (error) => {
                // Warning on failed scans is very noisy, we ignore them unless it's critical
            }
        );

        // Cleanup on unmount
        return () => {
            html5QrcodeScanner.clear().catch(error => {
                console.error("Failed to clear html5QrcodeScanner. ", error);
            });
        };
    }, [onScanSuccess]);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center'
        }}>

            <div style={{
                width: '100%', maxWidth: '500px', backgroundColor: '#fff',
                borderRadius: '8px', overflow: 'hidden', padding: '15px'
            }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, color: '#333' }}>📸 สแกนบาร์โค้ด</h3>
                    <button onClick={onClose} style={{
                        background: '#e74c3c', color: 'white', border: 'none',
                        padding: '5px 15px', borderRadius: '4px', cursor: 'pointer'
                    }}>ปิดกล้อง</button>
                </div>

                <div id="qr-reader" style={{ width: '100%' }}></div>

                <p style={{ textAlign: 'center', color: '#666', marginTop: '10px', fontSize: '14px' }}>
                    เล็งกล้องไปที่บาร์โค้ดของสินค้า<br />ระบบจะเพิ่มลงตะกร้าอัตโนมัติ
                </p>
            </div>

        </div>
    );
}
