import { env } from '../lib/env.js'
import type { ToolContext, ToolResult } from '../types/index.js'

interface WebSearchResult {
  title: string
  url: string
  description: string
}

async function usdaSearch(query: string): Promise<WebSearchResult[]> {
  const key = env.USDA_API_KEY
  if (!key) return []
  try {
    const res = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy&pageSize=3&api_key=${key}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return []
    const data = (await res.json()) as { foods?: { description: string; fdcId: number; foodNutrients: { nutrientName: string; value: number; unitName: string }[] }[] }
    const foods = data.foods ?? []
    return foods.slice(0, 3).map((f) => {
      const energy = f.foodNutrients.find((n) => n.nutrientName === 'Energy' && n.unitName?.toUpperCase() === 'KCAL')?.value
      return {
        title: f.description,
        url: `https://fdc.nal.usda.gov/fdc_app.html#/food-details/${f.fdcId}/nutrients`,
        description: `USDA food data${energy !== undefined ? ` — ${energy} kcal per 100g` : ''}`,
      }
    })
  } catch (err) {
    return []
  }
}

async function wikipediaSearch(query: string): Promise<WebSearchResult[]> {
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&format=json`,
      { headers: { Accept: 'application/json' } }
    )
    if (!searchRes.ok) return []
    const searchData = (await searchRes.json()) as [string, string[], string[], string[]]
    const [, titles, descriptions, urls] = searchData
    const results: WebSearchResult[] = []
    for (let i = 0; i < (titles?.length ?? 0); i++) {
      results.push({
        title: titles[i],
        url: urls[i],
        description: descriptions[i] || 'Wikipedia article',
      })
    }
    return results
  } catch (err) {
    return []
  }
}

async function duckDuckGoInstantAnswer(query: string): Promise<WebSearchResult[]> {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return []
    const data = (await res.json()) as {
      Abstract?: string
      AbstractURL?: string
      AbstractSource?: string
      RelatedTopics?: { FirstURL?: string; Text?: string }[]
    }
    const results: WebSearchResult[] = []
    if (data.Abstract && data.AbstractURL) {
      results.push({
        title: data.AbstractSource || 'DuckDuckGo',
        url: data.AbstractURL,
        description: data.Abstract.slice(0, 300),
      })
    }
    if (data.RelatedTopics) {
      for (const t of data.RelatedTopics.slice(0, 2)) {
        if (t.FirstURL && t.Text) {
          results.push({ title: 'DuckDuckGo', url: t.FirstURL, description: t.Text.slice(0, 300) })
        }
      }
    }
    return results
  } catch (err) {
    return []
  }
}

async function braveSearch(query: string): Promise<WebSearchResult[]> {
  if (!env.BRAVE_API_KEY) return []
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3`,
      {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': env.BRAVE_API_KEY,
        },
      }
    )
    if (!res.ok) return []
    const data = (await res.json()) as any
    return (data.web?.results ?? []).slice(0, 3).map((r: any) => ({
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
      `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&engine=google&num=3&api_key=${env.SERPAPI_KEY}`
    )
    if (!res.ok) return []
    const data = (await res.json()) as any
    return (data.organic_results ?? []).slice(0, 3).map((r: any) => ({
      title: r.title ?? '',
      url: r.link ?? '',
      description: r.snippet ?? '',
    }))
  } catch (err) {
    return []
  }
}

export async function webSearch(context: ToolContext): Promise<ToolResult> {
  const query = ((context as any).message ?? '').trim()
  if (!query) {
    return { success: true, data: { query, results: [] } }
  }

  let results: WebSearchResult[] = []

  // Free sources first
  if (results.length === 0) {
    results = await usdaSearch(query)
  }
  if (results.length === 0) {
    results = await wikipediaSearch(query)
  }
  if (results.length === 0) {
    results = await duckDuckGoInstantAnswer(query)
  }

  // Paid fallbacks
  if (results.length === 0) {
    results = await braveSearch(query)
  }
  if (results.length === 0) {
    results = await serpapiSearch(query)
  }

  return {
    success: true,
    data: {
      query,
      results,
      note: results.length === 0 ? 'No external search results found.' : undefined,
    },
  }
}
