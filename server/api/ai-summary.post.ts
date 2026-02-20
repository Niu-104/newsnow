// AI Summary endpoint for wallstreetcn articles
const AI_API_KEY = "805372fbf163467ba01caaf63644ad89.MufI2u2RNsLQM1oG"
const AI_BASE_URL = "https://open.bigmodel.cn/api/paas/v4"
const AI_MODEL = "glm-4-flash"

interface AiSummaryRequest {
    url: string
    title: string
}

interface AiSummaryResponse {
    summary: string
}

export default defineEventHandler(async (event): Promise<AiSummaryResponse> => {
    try {
        const body: AiSummaryRequest = await readBody(event)

        if (!body.url || !body.title) {
            throw createError({ statusCode: 400, message: "Missing url or title" })
        }

        // Only allow wallstreetcn URLs
        const urlObj = new URL(body.url)
        if (!urlObj.hostname.includes("wallstreetcn") && !urlObj.hostname.includes("wallstcn")) {
            throw createError({ statusCode: 400, message: "Only wallstreetcn URLs are supported" })
        }

        const articleContent = body.title

        const aiRes = await fetch(`${AI_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${AI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: [
                    {
                        role: "system",
                        content: "你是一个新闻摘要助手。请用简洁的中文根据新闻标题推测并总结核心内容，用2-3句话概括。只陈述事实，不加评论。",
                    },
                    {
                        role: "user",
                        content: `新闻标题：${articleContent}`,
                    },
                ],
                max_tokens: 200,
                temperature: 0.3,
            }),
        })

        if (!aiRes.ok) {
            const errText = await aiRes.text()
            logger.error("AI API error:", aiRes.status, errText)
            throw createError({ statusCode: 502, message: `AI API returned ${aiRes.status}` })
        }

        const aiData = await aiRes.json() as any
        const summary = aiData?.choices?.[0]?.message?.content?.trim() || "无法生成摘要"

        return { summary }
    } catch (e: any) {
        logger.error("AI Summary error:", e)
        throw createError({
            statusCode: e.statusCode || 500,
            message: e.message || "Failed to generate summary",
        })
    }
})
