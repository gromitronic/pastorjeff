import express from "express";
import { Telegraf, Markup } from "telegraf";

// ---- ENV ----
const BOT_TOKEN = process.env.BOT_TOKEN;            // required
const WEBAPP_URL = process.env.WEBAPP_URL || "https://pastorjeff.netlify.app";
const PUBLIC_URL = process.env.PUBLIC_URL;          // required: e.g., https://pastorjeff.onrender.com

if (!BOT_TOKEN) {
  console.error("❌ Missing BOT_TOKEN env var");
  process.exit(1);
}
if (!PUBLIC_URL) {
  console.error("❌ Missing PUBLIC_URL env var (e.g., https://your-service.onrender.com)");
  process.exit(1);
}

// ---- Allowlist ----
// Always allow DMs; for groups/supergroups, only allow IDs listed here.
const ALLOWED_CHATS = new Set([
  "-1002490222362", // CHeRCH Official (supergroup)
]);

function inAllowed(ctx) {
  const type = ctx.chat?.type;
  if (type === "private") return true; // DMs always allowed
  return ALLOWED_CHATS.has(String(ctx.chat?.id));
}

// ---- Deep link (for groups) ----
const BOT_USERNAME = "PastorJeffBot"; // no @
const DEEP_LINK = `https://t.me/${BOT_USERNAME}?startapp=call_pastor_jeff`;

const app = express();
app.use(express.json());

const bot = new Telegraf(BOT_TOKEN);

// Common reply builder with group/DM branching
function sendOpenUI(ctx, label = "Opening Audio Chat with Pastor Jeff:") {
  const isPrivate = ctx.chat?.type === "private";
  if (isPrivate) {
    return ctx.reply(
      label,
      Markup.inlineKeyboard([ Markup.button.webApp("🎙️ Open Here", WEBAPP_URL) ])
    );
  } else {
    return ctx.reply(
      label,
      Markup.inlineKeyboard([ Markup.button.url("⚡ Open in DM", DEEP_LINK) ])
    );
  }
}

// /start + chat menu button (allowed everywhere user starts the bot)
bot.start(async (ctx) => {
  try {
    await ctx.telegram.setChatMenuButton({
      chat_id: ctx.chat.id,
      menu_button: { type: "web_app", text: "🎙️ Audio Chat", web_app: { url: WEBAPP_URL } }
    });
  } catch (e) {
    console.log("setChatMenuButton warn:", e.message);
  }
  return ctx.reply(
    "Welcome! Tap below to open Pastor Jeff’s Audio Chat:",
    Markup.inlineKeyboard([Markup.button.webApp("🎙️ Open Audio Chat", WEBAPP_URL)])
  );
});

// Phrase triggers
function norm(s = "") {
  return s.toLowerCase().replace(/[@.,!?]/g, " ").replace(/\s+/g, " ").trim();
}
function isCallPastorIntent(text) {
  const t = norm(text);
  if (/(^| )call( |$)/.test(t) && /(pastor|pj|p j|jeff)\b/.test(t)) return true;
  if (/(^| )(ring|dial|contact|phone|phone\s+call)\b.*\b(pastor|pj|jeff)\b/.test(t)) return true;
  if (t.includes("paster jeff") || t.includes("pastor jef") || t.includes("call paster")) return true;
  const hasCallVerb = /(call|ring|dial|phone|contact)/.test(t);
  const hasPastor = /(pastor|the pastor|pj|p j|jeff)/.test(t);
  return hasCallVerb && hasPastor;
}

// Log and handle text/captions — guard with allowlist
bot.on("text", (ctx) => {
  if (!inAllowed(ctx)) return;
  console.log("text:", ctx.message.text, "chat:", ctx.chat.id, ctx.chat.type);
  if (isCallPastorIntent(ctx.message.text || "")) return sendOpenUI(ctx);
});
bot.on("caption", (ctx) => {
  if (!inAllowed(ctx)) return;
  console.log("caption:", ctx.message.caption, "chat:", ctx.chat.id, ctx.chat.type);
  if (isCallPastorIntent(ctx.message.caption || "")) return sendOpenUI(ctx);
});

// Command fallback (works in groups even with privacy ON) — guard with allowlist
bot.command("call_pastor_jeff", (ctx) => {
  if (!inAllowed(ctx)) return;
  return sendOpenUI(ctx);
});

// ---- Webhook wiring ----
const path = "/bot"; // webhook endpoint path
app.post(path, (req, res) => {
  bot.handleUpdate(req.body).catch((err) => console.error("handleUpdate error:", err));
  res.sendStatus(200);
});

// Basic health check
app.get("/", (req, res) => res.send("OK"));
app.get("/healthz", (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log("🌐 Web service listening on :" + port);

  // Ensure webhook is set to this instance
  try {
    const me = await bot.telegram.getMe();
    console.log("✅ Authenticated as @%s (id %s)", me.username, me.id);

    const targetUrl = PUBLIC_URL.replace(/\/$/, "") + path;
    const info = await bot.telegram.getWebhookInfo();
    if (info.url !== targetUrl) {
      if (info.url) {
        console.log("ℹ️ Replacing existing webhook:", info.url);
        await bot.telegram.deleteWebhook();
      }
      console.log("🔗 Setting webhook to", targetUrl);
      await bot.telegram.setWebhook(targetUrl);
    } else {
      console.log("🔗 Webhook already set to", targetUrl);
    }
  } catch (e) {
    console.error("❌ Webhook setup failed:", e.message);
  }
});
