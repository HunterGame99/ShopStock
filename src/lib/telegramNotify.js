export async function sendTelegramNotify(message) {
    const settings = JSON.parse(localStorage.getItem('shopstock_settings') || '{}')
    const token = settings.telegramBotToken
    const chatId = settings.telegramChatId

    if (!token || !chatId) return false

    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
            })
        })

        return response.ok
    } catch (error) {
        console.error('Telegram Notify Error:', error)
        return false
    }
}
