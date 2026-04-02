import { GoogleGenerativeAI } from '@google/generative-ai'
import { getProducts, getTransactions, getTopProducts, getTodayRevenue, getTodayProfit, getExpenses, formatCurrency, getWeekComparison } from './storage.js'

// Try to get API key from env (VITE_GEMINI_API_KEY)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
let genAI = null
let model = null
let chatSession = null

export function isAIAvailable() {
    return !!API_KEY && API_KEY !== 'dummy' && API_KEY !== 'AIzaSy...'
}

if (isAIAvailable()) {
    try {
        genAI = new GoogleGenerativeAI(API_KEY)
        model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    } catch (err) {
        console.error('Failed to initialize Gemini:', err)
    }
}

// Function to gather context from the store
function gatherShopContext() {
    const products = getProducts()
    const topProducts = getTopProducts(7, 5) // Top 5 in last 7 days
    const activeProducts = products.filter(p => p.stock > 0)
    const outOfStock = products.filter(p => p.stock <= 0)
    const todayRevenue = getTodayRevenue()
    const weekComp = getWeekComparison()

    const context = `
ข้อมูลปัจจุบันของร้าน (ShopStock App) ณ วันที่ ${new Date().toLocaleDateString('th-TH')}:
- สินค้าทั้งหมดในระบบ: ${products.length} รายการ (มีของขาย ${activeProducts.length} รายการ, ของหมด ${outOfStock.length} รายการ)
- ยอดขายวันนี้: ${formatCurrency(todayRevenue)}
- สินค้าขายดี 5 อันดับแรก (รอบ 7 วัน): ${topProducts.map(p => `${p.name} (ขายได้ ${p.qty} ชิ้น)`).join(', ')}

ประวัติยอดขายสัปดาห์นี้เทียบกับสัปดาห์ก่อน (อ้างอิงจาก Report):
สัปดาห์นี้: ${weekComp.thisWeek.map(w => `${w.label}=${w.revenue}บ.`).join(', ')}
สัปดาห์ก่อน: ${weekComp.lastWeek.map(w => `${w.label}=${w.revenue}บ.`).join(', ')}

หน้าที่ของคุณ:
คุณคือ "ผู้จัดการ AI ประจำร้าน ShopStock" ที่ฉลาดรอบรู้ เป็นกันเอง และให้คำปรึกษาด้านการขาย, สต็อก, และทิศทางธุรกิจได้เป็นอย่างดี
จงตอบคำถามโดยอิงจากข้อมูล "ปัจจุบัน" ข้างต้น ตอบให้กระชับ เข้าใจง่าย และอาจจะมีการใช้ Emoji ประกอบเพื่อความน่ารัก
ถ้าถูกถามเรื่องที่ไม่มีในบริบท เช่น ราคาสินค้ารายตัวที่ไม่ได้ระบุ ให้ตอบว่า "ข้อมูลส่วนนี้ไม่ได้ถูกแนบมาในบริบทปัจจุบัน กรุณาตรวจสอบในหน้าสินค้า"
`
    return context.trim()
}

export async function initAIChat() {
    if (!model) return false
    try {
        chatSession = model.startChat({
            history: [
                {
                    role: 'user',
                    parts: [{ text: gatherShopContext() }]
                },
                {
                    role: 'model',
                    parts: [{ text: "รับทราบข้อมูลร้านค้า ShopStock เรียบร้อยครับ! ในฐานะผู้จัดการ AI ประจำร้าน คุณมีอะไรให้ผมช่วยวิเคราะห์หรือให้คำปรึกษา แนะนำมาได้เลยครับ ✨" }]
                }
            ],
            generationConfig: {
                maxOutputTokens: 1000,
            },
        })
        return true
    } catch (err) {
        console.error('Failed to start chat session:', err)
        return false
    }
}

export async function sendMessageToAI(message) {
    if (!chatSession) {
        const initialized = await initAIChat()
        if (!initialized) {
            return "ขออภัยครับ ไม่สามารถเชื่อมต่อกับระบบ AI ได้ในขณะนี้ กรุณาตรวจสอบ API KEY ในตั้งค่า"
        }
    }

    try {
        const result = await chatSession.sendMessage(message)
        return result.response.text()
    } catch (err) {
        console.error('Error sending message to AI:', err)
        return "ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผลของ AI"
    }
}

/**
 * Verify a payment slip image using Gemini Vision AI
 * @param {string} imageBase64 — base64-encoded image (without data:image prefix)
 * @param {string} mimeType — e.g. 'image/jpeg', 'image/png'
 * @param {number} expectedAmount — the expected payment amount
 * @param {string} promptPayName — the expected recipient name (optional)
 * @returns {Promise<{valid: boolean, amount: number|null, date: string|null, recipient: string|null, reason: string, raw: string}>}
 */
export async function verifyPaymentSlip(imageBase64, mimeType, expectedAmount, promptPayName = '') {
    if (!model) {
        return { valid: false, amount: null, date: null, recipient: null, reason: 'ไม่สามารถเชื่อมต่อ AI ได้ (ตรวจสอบ API Key)', raw: '' }
    }

    const prompt = `คุณคือระบบตรวจสอบสลิปโอนเงิน กรุณาวิเคราะห์ภาพสลิปนี้แล้วตอบเป็น JSON เท่านั้น (ไม่ต้องมี markdown):
{
  "amount": ตัวเลขจำนวนเงินที่โอน (number, หรือ null ถ้าอ่านไม่ได้),
  "date": "วันที่/เวลาที่โอน (string, หรือ null)",
  "recipient": "ชื่อผู้รับเงิน (string, หรือ null)",
  "bank": "ธนาคารผู้รับ (string, หรือ null)",
  "status": "SUCCESS" หรือ "FAILED" หรือ "UNKNOWN",
  "isSlip": true หรือ false (ภาพนี้เป็นสลิปโอนเงินจริงไหม)
}

ข้อมูลที่ต้องตรวจสอบ:
- ยอดเงินที่ควรจะเป็น: ${expectedAmount.toFixed(2)} บาท
${promptPayName ? `- ชื่อผู้รับที่ควรจะเป็น: ${promptPayName}` : ''}

ตอบเป็น JSON เท่านั้น ไม่ต้องอธิบายเพิ่ม`

    try {
        const result = await model.generateContent([
            { text: prompt },
            { inlineData: { mimeType, data: imageBase64 } }
        ])
        const raw = result.response.text().trim()
        // Parse JSON from response (strip markdown fences if any)
        const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const data = JSON.parse(jsonStr)

        // Determine validity
        const amountMatch = data.amount != null && Math.abs(data.amount - expectedAmount) < 1 // tolerance ±1 baht
        const recipientMatch = !promptPayName || !data.recipient || data.recipient.toLowerCase().includes(promptPayName.toLowerCase()) || promptPayName.toLowerCase().includes(data.recipient.toLowerCase())
        const isSuccess = data.status === 'SUCCESS'
        const valid = data.isSlip && isSuccess && amountMatch

        let reason = ''
        if (!data.isSlip) reason = 'ภาพนี้ไม่ใช่สลิปโอนเงิน'
        else if (!isSuccess) reason = 'สลิปแสดงสถานะไม่สำเร็จ'
        else if (!amountMatch) reason = `ยอดเงินไม่ตรง — สลิป: ${data.amount} บาท, ที่ต้องจ่าย: ${expectedAmount.toFixed(2)} บาท`
        else if (!recipientMatch) reason = `ชื่อผู้รับอาจไม่ตรง — สลิป: "${data.recipient}"`
        else reason = 'สลิปถูกต้อง ✅'

        return {
            valid,
            amount: data.amount,
            date: data.date,
            recipient: data.recipient,
            bank: data.bank,
            reason,
            raw,
            amountMatch,
            recipientMatch,
        }
    } catch (err) {
        console.error('Error verifying slip:', err)
        return { valid: false, amount: null, date: null, recipient: null, reason: `AI ไม่สามารถอ่านสลิปได้: ${err.message}`, raw: '' }
    }
}

