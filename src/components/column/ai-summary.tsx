import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { NewsItem } from "@shared/types"

interface AiSummaryButtonProps {
    item: NewsItem
}

export function AiSummaryButton({ item }: AiSummaryButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [summary, setSummary] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleClick(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()

        if (isOpen) {
            setIsOpen(false)
            return
        }

        if (summary) {
            setIsOpen(true)
            return
        }

        setIsLoading(true)
        setIsOpen(true)
        setError("")

        try {
            const res = await fetch("/api/ai-summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: item.url, title: item.title }),
            })

            if (!res.ok) throw new Error("请求失败")

            const data = await res.json()
            setSummary(data.summary)
        } catch (err) {
            setError("摘要生成失败，请重试")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <span className="inline-flex flex-col" onClick={e => e.stopPropagation()}>
            <button
                type="button"
                onClick={handleClick}
                className={[
                    "inline-flex items-center gap-0.5 text-xs px-1 py-0.5 rounded",
                    "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    "hover:bg-amber-500/25 transition-colors cursor-pointer",
                    "ml-1 align-middle border-none outline-none",
                    isLoading ? "animate-pulse" : "",
                ].join(" ")}
                title="AI 总结"
            >
                <span className="text-xs">✨</span>
                <span className="text-xs font-medium">AI</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-1 p-2 rounded-lg bg-amber-500/10 text-xs leading-relaxed">
                            {isLoading && (
                                <span className="text-neutral-400 animate-pulse">
                                    ✨ AI 正在总结文章...
                                </span>
                            )}
                            {error && (
                                <span className="text-red-400">{error}</span>
                            )}
                            {summary && (
                                <span className="text-neutral-600 dark:text-neutral-300">
                                    {summary}
                                </span>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </span>
    )
}
