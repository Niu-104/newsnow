import type { NewsItem } from "@shared/types"

interface FlowResponse {
  code: number
  data: {
    itemList: {
      itemId: string
      publishTime: number
      templateMaterial: {
        widgetTitle: string
        widgetContent?: string
      }
    }[]
    hasNextPage: boolean
  }
}

interface HotRankResponse {
  code: number
  data: {
    hotRankList: {
      itemId: string
      publishTime: number
      templateMaterial: {
        widgetTitle: string
        widgetContent?: string
        authorName?: string
        statRead?: string
        statPraise?: string
      }
    }[]
  }
}

const quick = defineSource(async () => {
  const url = "https://gateway.36kr.com/api/mis/nav/newsflash/flow"
  const response = await myFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      partner_id: "wap",
      param: {
        pageSize: 20,
        pageEvent: 0,
        siteId: 1,
        platformId: 2,
      },
    }),
  }) as FlowResponse

  if (response.code !== 0 || !response.data?.itemList) {
    throw new Error("无法获取36氪快讯数据")
  }

  return response.data.itemList.map(item => ({
    id: item.itemId,
    title: item.templateMaterial.widgetTitle,
    url: `https://www.36kr.com/newsflashes/${item.itemId}`,
    extra: {
      date: item.publishTime,
    },
  }))
})

const renqi = defineSource(async () => {
  const url = "https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot"
  const response = await myFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      partner_id: "wap",
      param: {
        siteId: 1,
        platformId: 2,
      },
    }),
  }) as HotRankResponse

  if (response.code !== 0 || !response.data?.hotRankList) {
    throw new Error("无法获取36氪人气榜数据")
  }

  const articles: NewsItem[] = response.data.hotRankList.map(item => ({
    id: item.itemId,
    title: item.templateMaterial.widgetTitle,
    url: `https://www.36kr.com/p/${item.itemId}`,
    extra: {
      info: item.templateMaterial.authorName
        ? `${item.templateMaterial.authorName}  |  ${item.templateMaterial.statRead || ""}阅读`
        : undefined,
      hover: item.templateMaterial.widgetContent?.replace(/<[^>]*>/g, "").slice(0, 100),
    },
  }))

  return articles
})

export default defineSource({
  "36kr": quick,
  "36kr-quick": quick,
  "36kr-renqi": renqi,
})
