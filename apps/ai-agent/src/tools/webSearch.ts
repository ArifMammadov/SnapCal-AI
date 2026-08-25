import { env } from '../lib/env.js'
import type { ToolContext, ToolResult } from '../types/index.js'

interface WebSearchResult {
  title: string
  url: string
  description: string
}

async function braveSearch(query: string): Promise<WebSearchResult[]> {
  if (!env.BRAVE_API_KEY) return []
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': env.BRAVE_API_KEY,
        },
      }
    )
    if (!res.ok) return []
    const data = (await res.json()) as any
    const results = data.web?.results ?? []
    return results.slice(0, 5).map((r: any) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      description: r.description ?? '',
    }))
  } catch (err) {
    return []
  }
}

async function serpapiSearch(query: string): Promise<WebSearchResult[]> {
  if (!env.SERPAPI_KEY) return []
  try {
    const res = await fetch(
      `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&engine=google&num=5&api_key=${env.SERPAPI_KEY}`
    )
    if (!res.ok) return []
    const data = (await res.json()) as any
    return (data.organic_results ?? []).slice(0, 5).map((r: any) => ({
      title: r.title ?? '',
      url: r.link ?? '',
      description: r.snippet ?? '',
    }))
  } catch (err) {
    return []
  }
}

export async function webSearch(context: ToolContext): Promise<ToolResult> {
  const query = context.message.trim()
  if (!query) {
    return { success: true, data: { query, results: [] } }
  }

  let results = await braveSearch(query)
  if (results.length === 0 && env.SERPAPI_KEY) {
    results = await serpapiSearch(query)
  }

  return {
    success: true,
    data: {
      query,
      results,
      note: results.length === 0 ? 'No web search results found (search key may be missing).' : undefined,
    },
  }
}
