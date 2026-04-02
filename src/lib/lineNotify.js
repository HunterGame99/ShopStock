export async function sendLineNotify(token, message) {
    if (!token) return false;

    // We use an open CORS proxy since direct API calls to LINE Notify will be blocked by the browser.
    // In a real production app, this should be done from a backend server.
    const url = `https://corsproxy.io/?https://notify-api.line.me/api/notify`;
    
    try {
        const formData = new URLSearchParams();
        formData.append('message', message);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        if (response.ok) {
            return true;
        } else {
            console.error('LINE Notify Error:', await response.text());
            return false;
        }
    } catch (err) {
        console.error('LINE Notify Request Failed:', err);
        return false;
    }
}
