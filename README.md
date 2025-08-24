# PastorJeffBot (Webhook • Group/DM + Allowlist)

- Sends **Web App button in DMs**
- Sends **deep link in groups** (Web App buttons are not allowed in groups)
- **Allowlist** limits group responses to your supergroup only

## Deploy on Render (Web Service)
1. Build: `npm install`
2. Start: `npm start`
3. Environment Variables:
   - `BOT_TOKEN` — your BotFather token
   - `WEBAPP_URL` — `https://pastorjeff.netlify.app`
   - `PUBLIC_URL` — `https://pastorjeff.onrender.com`

## Allowlist
Edit `ALLOWED_CHATS` in `server.js` to add/remove group IDs.
Current:
- `-1002490222362` — CHeRCH Official

## Test
- In DM: `call pastor jeff` → **🎙️ Open Here**
- In CHeRCH Official group: `call pastor jeff` → **⚡ Open in DM**
- Anywhere else: bot ignores

Command fallback: `/call_pastor_jeff`
