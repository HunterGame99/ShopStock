/**
 * PromptPay QR Code Generator
 * Generates EMVCo-compliant PromptPay payload for Thai QR Payment standard.
 * No external dependencies needed.
 */

// CRC16-CCITT (0xFFFF) — required by EMVCo QR spec
function crc16(str) {
    let crc = 0xFFFF
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1
            crc &= 0xFFFF
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0')
}

// Format TLV (Tag-Length-Value)
function tlv(tag, value) {
    const len = value.length.toString().padStart(2, '0')
    return `${tag}${len}${value}`
}

// Format PromptPay ID (phone or national ID)
function formatTarget(id) {
    // Remove dashes and spaces
    const clean = id.replace(/[-\s]/g, '')
    if (clean.length === 10) {
        // Phone number: convert 0x to 66x (Thai country code)
        return '0066' + clean.substring(1)
    }
    // National ID (13 digits) — use as-is
    return clean
}

/**
 * Generate PromptPay QR payload string (EMVCo standard)
 * @param {string} promptPayId — phone (10 digits) or national ID (13 digits)
 * @param {number} amount — payment amount (0 = no amount specified)
 * @returns {string} EMVCo payload string for QR code generation
 */
export function generatePromptPayPayload(promptPayId, amount = 0) {
    const target = formatTarget(promptPayId)
    const isPhone = promptPayId.replace(/[-\s]/g, '').length === 10

    // Merchant Account Information (Tag 29 — PromptPay)
    const aidTlv = tlv('00', 'A000000677010111') // PromptPay AID
    const targetTag = isPhone ? '01' : '02' // 01=phone, 02=national ID
    const targetTlv = tlv(targetTag, target)
    const merchantInfo = tlv('29', aidTlv + targetTlv)

    let payload = ''
    payload += tlv('00', '01') // Payload Format Indicator
    payload += tlv('01', '11') // Point of Initiation: 11=static, 12=dynamic
    payload += merchantInfo
    payload += tlv('53', '764') // Currency: THB
    payload += tlv('58', 'TH') // Country: Thailand

    if (amount > 0) {
        payload += tlv('54', amount.toFixed(2))
    }

    // CRC placeholder (Tag 63, length 04, value will be calculated)
    payload += '6304'
    const checksum = crc16(payload)
    payload += checksum

    return payload
}

/**
 * Generate a QR code image URL using a free API
 * @param {string} data — the data string to encode
 * @param {number} size — pixel size of QR image
 * @returns {string} URL to the QR code image
 */
export function getQRCodeURL(data, size = 300) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&margin=10`
}

/**
 * Generate a complete PromptPay QR code image URL
 * @param {string} promptPayId — phone or national ID
 * @param {number} amount — payment amount
 * @param {number} size — QR image size in pixels
 * @returns {string} URL to PromptPay QR code image
 */
export function generatePromptPayQR(promptPayId, amount = 0, size = 300) {
    const payload = generatePromptPayPayload(promptPayId, amount)
    return getQRCodeURL(payload, size)
}
