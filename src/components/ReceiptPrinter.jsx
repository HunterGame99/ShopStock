import React from 'react';
import { formatDate } from '../lib/storage.js';

export default function ReceiptPrinter({ transaction, shopSettings, ref }) {
    if (!transaction) return null;

    // A hidden, print-only style block to format the receipt for 80mm thermal printers
    return (
        <div style={{ display: 'none' }}>
            <div ref={ref} className="receipt-print-area" style={{
                fontFamily: 'monospace, "Sarabun", sans-serif',
                width: '80mm', // standard thermal printer width
                padding: '0 5mm',
                color: '#000',
                background: '#fff',
                fontSize: '12px',
                lineHeight: '1.4'
            }}>
                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        .receipt-print-area, .receipt-print-area * { visibility: visible; }
                        .receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
                        @page { size: auto; margin: 0; }
                    }
                    .receipt-header { text-align: center; margin-bottom: 10px; }
                    .receipt-header h2 { margin: 0; font-size: 16px; font-weight: bold; }
                    .receipt-header p { margin: 2px 0; font-size: 12px; }
                    .receipt-divider { border-bottom: 1px dashed #000; margin: 5px 0; }
                    .receipt-table { width: 100%; text-align: left; }
                    .receipt-table th, .receipt-table td { padding: 2px 0; }
                    .receipt-table .right { text-align: right; }
                    .receipt-table .center { text-align: center; }
                    .receipt-summary { margin-top: 10px; }
                    .receipt-summary table { width: 100%; }
                    .receipt-footer { text-align: center; margin-top: 15px; font-size: 12px; }
                `}</style>

                <div className="receipt-header">
                    <h2>{shopSettings?.shopName || 'ShopStock'}</h2>
                    {shopSettings?.shopAddress && <p>{shopSettings.shopAddress}</p>}
                    {shopSettings?.shopPhone && <p>Tel: {shopSettings.shopPhone}</p>}
                    {shopSettings?.taxId && <p>เลขประจำตัวผู้เสียภาษี: {shopSettings.taxId}</p>}
                    <div className="receipt-divider"></div>
                    {transaction.invoiceNo ? (
                        <p>เลขที่: {transaction.invoiceNo}</p>
                    ) : (
                        <p>บิล: #{transaction.id?.slice(-6).toUpperCase()}</p>
                    )}
                    <p>วันที่: {formatDate(transaction.createdAt)}</p>
                    <p>พนักงาน: {transaction.staffName || 'System'}</p>
                </div>

                <div className="receipt-divider"></div>

                <table className="receipt-table">
                    <thead>
                        <tr>
                            <th>รายการ</th>
                            <th className="center">บ.</th>
                            <th className="right">รวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transaction.items?.map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.productName} <br /><small>x{item.qty}</small></td>
                                <td className="center">{item.price}</td>
                                <td className="right">{(item.price * item.qty).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="receipt-divider"></div>

                <div className="receipt-summary">
                    <table>
                        <tbody>
                            <tr>
                                <td>รวมเป็นเงิน</td>
                                <td className="right">{transaction.subtotal?.toLocaleString()}</td>
                            </tr>
                            {transaction.discount > 0 && (
                                <tr>
                                    <td>ส่วนลด</td>
                                    <td className="right">-{transaction.discount?.toLocaleString()}</td>
                                </tr>
                            )}
                            {shopSettings?.vatEnabled && (
                                <tr>
                                    <td>รวม VAT {shopSettings.vatRate || 7}%</td>
                                    <td className="right">{(transaction.total * (shopSettings.vatRate || 7) / (100 + (shopSettings.vatRate || 7))).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                </tr>
                            )}
                            <tr style={{ fontWeight: 'bold', fontSize: '14px' }}>
                                <td>ยอดสุทธิ{shopSettings?.vatEnabled ? ' (รวม VAT)' : ''}</td>
                                <td className="right">{transaction.total?.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td>รับเงิน ({transaction.paymentMethod === 'cash' ? 'เงินสด' : transaction.paymentMethod === 'qr' ? 'สแกน QR' : 'โอน'})</td>
                                <td className="right">{transaction.payment?.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td>เงินทอน</td>
                                <td className="right">{transaction.change?.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="receipt-divider"></div>
                <div className="receipt-footer">
                    <p>{shopSettings?.receiptFooter || 'ขอบคุณที่ใช้บริการค่ะ 🙏'}</p>
                    <p><small>Powered by ShopStock</small></p>
                </div>

            </div>
        </div>
    );
}
