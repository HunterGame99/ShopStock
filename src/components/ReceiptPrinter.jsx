import { formatCurrency, formatDate } from '../lib/storage.js'

export default function ReceiptPrinter({ receiptData, settings, onPrinted }) {
    if (!receiptData) return null

    const handlePrint = () => {
        window.print()
        if (onPrinted) onPrinted()
    }

    return (
        <div className="receipt-container" style={{ display: 'none' }}>
            {/* The actual printable area */}
            <div id="printable-receipt" className="receipt-paper">
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{settings?.shopName || 'ShopStock'}</h2>
                    <div style={{ fontSize: '12px' }}>{settings?.shopAddress}</div>
                    <div style={{ fontSize: '12px' }}>Tel: {settings?.shopPhone}</div>
                </div>

                <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                    <span>ใบเสร็จรับเงิน / Receipt</span>
                    <span>#{receiptData.id?.slice(-6).toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '10px' }}>
                    <span>วันที่: {formatDate(receiptData.createdAt)}</span>
                </div>

                <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

                {/* Items */}
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #000' }}>
                            <th style={{ textAlign: 'left', paddingBottom: '4px' }}>รายการ</th>
                            <th style={{ textAlign: 'center', paddingBottom: '4px' }}>จำนวน</th>
                            <th style={{ textAlign: 'right', paddingBottom: '4px' }}>ราคา</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receiptData.items?.map((item, i) => (
                            <tr key={i}>
                                <td style={{ padding: '4px 0', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.productName || item.name}
                                </td>
                                <td style={{ textAlign: 'center', padding: '4px 0' }}>{item.qty}</td>
                                <td style={{ textAlign: 'right', padding: '4px 0' }}>{formatCurrency(item.qty * item.price)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

                {/* Summary */}
                <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>รวมเป็นเงิน</span>
                        <span>{formatCurrency(receiptData.subtotal || receiptData.total + (receiptData.discount || 0))}</span>
                    </div>
                    {(receiptData.discount || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>ส่วนลด</span>
                            <span>-{formatCurrency(receiptData.discount)}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '4px' }}>
                        <span>ยอดสุทธิ</span>
                        <span>{formatCurrency(receiptData.total)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span>เงินรับ ({receiptData.paymentMethod === 'cash' ? 'เงินสด' : receiptData.paymentMethod === 'transfer' ? 'โอนเงิน' : 'อื่นๆ'})</span>
                        <span>{formatCurrency(receiptData.payment || receiptData.total)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>เงินทอน</span>
                        <span>{formatCurrency(receiptData.change || 0)}</span>
                    </div>
                </div>

                <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

                <div style={{ textAlign: 'center', fontSize: '12px', marginTop: '15px' }}>
                    <div style={{ fontWeight: 'bold' }}>{settings?.receiptFooter || 'ขอบคุณที่ใช้บริการ'}</div>
                    <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>Powered by ShopStock</div>
                </div>
            </div>

            {/* Print Trigger Button (Visible temporarily for the user to click if auto-print fails) */}
            <button id="trigger-print" onClick={handlePrint} style={{ display: 'none' }}>Print</button>
        </div>
    )
}
