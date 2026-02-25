// Telegram daily push: fetch wallstreetcn news, generate AI summaries, send to Telegram
const TG_BOT_TOKEN = "7854638374:AAHbLeCG7lY4uRC6i0kC2vCMG65P2MP-13s"
const TG_CHAT_ID = "7948739100"
const AI_API_KEY = "805372fbf163467ba01caaf63644ad89.MufI2u2RNsLQM1oG"
const AI_BASE_URL = "https://open.bigmodel.cn/api/paas/v4"
const AI_MODEL = "glm-4-flash"

interface WscItem {
    uri: string
    id: number
    title?: string
    content_text: string
    content_short: string
    display_time: number
    type?: string
}

interface WscNewsRes {
    data: {
        items: {
            resource_type?: string
            resource: WscItem
        }[]
    }
}

async function fetchNews(): Promise<{ title: string, url: string, content: string }[]> {
    const apiUrl = "https://api-one.wallstcn.com/apiv1/content/information-flow?channel=global-channel&accept=article&limit=15"
    const res = await fetch(apiUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    })
    const data: WscNewsRes = await res.json()

    return data.data.items
        .filter(k => k.resource_type !== "theme" && k.resource_type !== "ad" && k.resource.type !== "live" && k.resource.uri)
        .slice(0, 10)
        .map(({ resource: h }) => ({
            title: h.title || h.content_short,
            url: h.uri,
            content: h.content_text || h.content_short || "",
        }))
}

async function generateSummary(title: string, content: string): Promise<string> {
    try {
        const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${AI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: [
                    { role: "system", content: "你是一个新闻摘要助手。根据新闻标题和正文内容，用2-3句简洁中文概括文章核心内容。只陈述事实，不要添加评论。" },
                    { role: "user", content: `新闻标题：${title}\n\n正文内容：${content.slice(0, 1500)}` },
                ],
                max_tokens: 200,
                temperature: 0.3,
            }),
        })

        if (!res.ok) return "摘要生成失败"

        const data = await res.json() as any
        return data?.choices?.[0]?.message?.content?.trim() || "摘要生成失败"
    } catch {
        return "摘要生成失败"
    }
}

async function sendTelegram(text: string): Promise<boolean> {
    try {
        const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TG_CHAT_ID,
                text,
                parse_mode: "HTML",
                disable_web_page_preview: true,
            }),
        })
        return res.ok
    } catch {
        return false
    }
}

export default defineEventHandler(async (event) => {
    try {
        // Verify cron secret (optional security)
        const authHeader = getHeader(event, "authorization")
        const cronSecret = process.env.CRON_SECRET
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            throw createError({ statusCode: 401, message: "Unauthorized" })
        }

        // 1. Fetch news
        const articles = await fetchNews()
        if (!articles.length) {
            return { success: false, message: "No articles found" }
        }

        // 2. Generate summaries in parallel to save time
        const summaries = await Promise.all(articles.map(async (article) => {
            const summary = await generateSummary(article.title, article.content)
            return { ...article, summary }
        }))

        // 3. Build Telegram message
        const now = new Date()
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

        let message = `📰 <b>华尔街见闻 AI 快报</b>\n📅 ${dateStr}\n\n`

        const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"]
        for (let i = 0; i < summaries.length; i++) {
            const s = summaries[i]
            message += `${emojis[i] || `${i + 1}.`} <b>${s.title}</b>\n`
            message += `📝 ${s.summary}\n`
            message += `🔗 <a href="${s.url}">阅读原文</a>\n\n`
        }

        message += `⚡ Powered by NewsNow AI`

        // 4. Send to Telegram
        const sent = await sendTelegram(message)

        return {
            success: sent,
            articlesCount: summaries.length,
            message: sent ? "Sent to Telegram" : "Failed to send",
        }
    } catch (e: any) {
        logger.error("TG Push error:", e)
        throw createError({
            statusCode: e.statusCode || 500,
            message: e.message || "Failed to push to Telegram",
        })
    }
})
