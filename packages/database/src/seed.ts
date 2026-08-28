import { prisma, prismaRead, indexArticleVector, generateEmbedding } from './index.js'
import axios from 'axios'

const SEED_TAG = 'auto-seed'
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''

async function embed(text: string) {
  return generateEmbedding(text, OPENROUTER_API_KEY, OPENROUTER_BASE_URL)
}

async function clearSeedArticles() {
  const old = await prismaRead.knowledgeArticle.findMany({
    where: { tags: { has: SEED_TAG } },
    select: { id: true },
  })
  for (const a of old) {
    await prisma.knowledgeChunk.deleteMany({ where: { articleId: a.id } })
    await prisma.knowledgeArticle.delete({ where: { id: a.id } })
  }
  console.log('cleared', old.length, 'seed articles')
}

async function createArticle(data: { title: string; slug: string; content: string; category: string; sourceUrl?: string; tags: string[] }) {
  const article = await prisma.knowledgeArticle.create({
    data: {
      title: data.title,
      slug: data.slug,
      content: data.content,
      category: data.category,
      sourceUrl: data.sourceUrl ?? null,
      tags: [...data.tags, SEED_TAG],
      isPublished: true,
    },
  })
  await indexArticleVector(article.id, embed)
  return article
}

// === TheMealDB regional dishes ===

interface Meal {
  idMeal: string
  strMeal: string
  strArea: string
}

async function fetchTheMealDBMealsByArea(area: string): Promise<Meal[]> {
  const { data } = await axios.get(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(area)}`, { timeout: 20000 })
  return data?.meals || []
}

async function fetchTheMealDBMealDetails(id: string) {
  const { data } = await axios.get(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`, { timeout: 20000 })
  return data?.meals?.[0] || null
}

function extractIngredients(meal: any): string[] {
  const ingredients: string[] = []
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`]
    if (ing && String(ing).trim()) ingredients.push(String(ing).trim())
  }
  return ingredients
}

function extractMeasures(meal: any): string[] {
  const measures: string[] = []
  for (let i = 1; i <= 20; i++) {
    const m = meal[`strMeasure${i}`]
    if (m && String(m).trim()) measures.push(String(m).trim())
  }
  return measures
}

async function seedTheMealDBRegions() {
  const regions = [
    { area: 'Turkish', region: 'Турция' },
    { area: 'Russian', region: 'Россия' },
    { area: 'Indian', region: 'Индия' },
    { area: 'Mexican', region: 'Мексика' },
    { area: 'Italian', region: 'Италия' },
    { area: 'Greek', region: 'Греция' },
    { area: 'Chinese', region: 'Китай' },
    { area: 'Japanese', region: 'Япония' },
    { area: 'Thai', region: 'Таиланд' },
    { area: 'Moroccan', region: 'Марокко' },
    { area: 'Spanish', region: 'Испания' },
    { area: 'French', region: 'Франция' },
    { area: 'Vietnamese', region: 'Вьетнам' },
    { area: 'Polish', region: 'Польша' },
    { area: 'Egyptian', region: 'Египет' },
  ]

  for (const { area, region } of regions) {
    try {
      const meals = await fetchTheMealDBMealsByArea(area)
      const details: any[] = []
      for (const meal of meals.slice(0, 30)) {
        try {
          const d = await fetchTheMealDBMealDetails(meal.idMeal)
          if (d) details.push(d)
        } catch (e) {
          console.warn('detail fetch', meal.idMeal, (e as Error).message)
        }
      }

      const lines = details.map((m) => {
        const ingredients = extractIngredients(m)
        const measures = extractMeasures(m)
        const tags = []
        if (m.strTags) tags.push(...String(m.strTags).split(',').map((t: string) => t.trim()).filter(Boolean))
        const content = [
          `Блюдо: ${m.strMeal}`,
          `Категория: ${m.strCategory || 'блюдо'}`,
          `Регион: ${region}`,
          `Ингредиенты: ${ingredients.join(', ')}`,
          `Меры: ${measures.join(', ')}`,
          `Инструкция: ${(m.strInstructions || '').slice(0, 500)}`,
          `Теги: ${tags.join(', ')}`,
          m.strYoutube ? `Видео: ${m.strYoutube}` : '',
          m.strSource ? `Источник: ${m.strSource}` : '',
        ].filter(Boolean).join('\n')
        return content
      })

      if (lines.length === 0) continue

      const articleContent = `# Региональная кухня: ${region}\n\nКоллекция блюд региона ${region} с ингредиентами, мерами и способами приготовления.\n\n---\n\n${lines.join('\n\n---\n\n')}`
      await createArticle({
        title: `Блюда ${region} — TheMealDB`,
        slug: `regional-dishes-${region.toLowerCase().replace(/[^a-z0-9а-я]/gi, '-')}`,
        content: articleContent,
        category: 'regional_cuisine',
        sourceUrl: 'https://www.themealdb.com/api.php',
        tags: [region, 'блюда', 'рецепты', 'themealdb'],
      })
      console.log('seeded region', region, 'meals', lines.length)
    } catch (e) {
      console.error('region failed', region, (e as Error).message)
    }
  }
}

// === Manual Central Asian / Caucasus dishes because TheMealDB lacks them ===

async function seedManualRegionalDishes() {
  const regions: Record<string, string[]> = {
    'Узбекистан': [
      'Плов узбекский — рис, баранина, морковь, нут, изюм, куркума, зира, чеснок. Калорийность около 350 ккал на 200 г.',
      'Лагман — лапша, говядина/баранина, перец болгарский, помидоры, лук, чеснок, зелень. Около 250 ккал на порцию.',
      'Манты — баранина/говядина с луком в тесте. Около 300 ккал на 3 шт.',
      'Шашлык — баранина, говядина или курица, маринад с луком и специями. Около 250 ккал на 100 г.',
      'Самса — слоёное тесто с мясом/тыквой. Около 280 ккал на шт.',
      'Долма — виноградные листья с мясным фаршем и рисом. Около 180 ккал на 100 г.',
      'Шурпа — суп из баранины с овощами. Около 120 ккал на порцию.',
      'Нарын — лапша с конским мясом/бараниной. Около 220 ккал.',
      'Балик сомса — рыбная самса. Около 260 ккал.',
      'Кукурузный хлеб (жарма) — кукурузная мука, вода, соль. Около 160 ккал на 100 г.',
    ],
    'Казахстан': [
      'Бешбармак — лапша с отварным мясом (конина/баранина) и луком. Около 320 ккал на порцию.',
      'Казы — конские колбаски, сало. Около 450 ккал на 100 г.',
      'Манты — мясо в тесте. Около 300 ккал.',
      'Плов казахский — рис, мясо, морковь, чеснок. Около 340 ккал.',
      'Кумыс — кобылье молоко, ферментированный. Около 50 ккал на 100 мл.',
      'Шубат — верблюжье молоко. Около 70 ккал на 100 мл.',
      'Баурсаки — жареное дрожжевое тесто. Около 380 ккал на 100 г.',
      'Куырдак — обжаренное мясо с картофелем и луком. Около 280 ккал.',
      'Жент — сладость из муки, масла, мёда, изюма. Около 400 ккал на 100 г.',
      'Шашлык из баранины — около 250 ккал на 100 г.',
    ],
    'Азербайджан': [
      'Плов азербайджанский — рис, баранина, айва, каштаны, куркума, зира. Около 360 ккал на 200 г.',
      'Долма — фарш в виноградных листьях с рисом. Около 190 ккал.',
      'Кюфта — мясные фрикадельки в бульоне. Около 200 ккал.',
      'Лявянги — мясной рулет с начинкой из риса и орехов. Около 250 ккал.',
      'Пити — баранина с нутом в горшочке. Около 220 ккал.',
      'Шашлык тика — баранина в томатном маринаде. Около 240 ккал.',
      'Бозартма — тушёная баранина с луком. Около 230 ккал.',
      'Сабzi — овощное рагу с бараниной. Около 180 ккал.',
      'Хашил — картофельное пюре с луком. Около 150 ккал.',
      'Гянджа пахлава — слоёное тесто с орехами и мёдом. Около 450 ккал.',
    ],
    'Турция': [
      'Дёнер — жареное мясо (курица/говядина) в лаваше. Около 450 ккал.',
      'Кебаб адана — острая баранина на шампуре. Около 260 ккал на 100 г.',
      'Лахмаджун — тонкая лепёшка с мясным фаршем и овощами. Около 220 ккал.',
      'Менемен — яичница с помидорами, перцем и специями. Около 180 ккал.',
      'Имам баялды — фаршированные баклажаны. Около 170 ккал.',
      'Манты турецкие — мясо в тесте с йогуртовым соусом. Около 290 ккал.',
      'Чорба — турецкий суп из чечевицы. Около 130 ккал.',
      'Баклава — слоёное тесто с орехами и сиропом. Около 430 ккал.',
      'Салат шакшука — помидоры, перец, лук, яйца. Около 140 ккал.',
      'Айран — йогуртовый напиток. Около 50 ккал на 100 мл.',
    ],
    'Грузия': [
      'Хинкали — мясные пельмени с бульоном внутри. Около 80 ккал за шт.',
      'Хачапури по-аджарски — лодочка из теста с сыром и яйцом. Около 500 ккал.',
      'Хачапури по-имеретински — тесто с сыром. Около 350 ккал.',
      'Чахохбили — курица тушёная с помидорами и зеленью. Около 180 ккал.',
      'Борщ грузинский — свёкольный суп с говядиной. Около 120 ккал.',
      'Лобио — тушёная фасоль с орехами и зеленью. Около 160 ккал.',
      'Ткемали — кисло-сладкий соус из алычи. Около 90 ккал на 100 г.',
      'Мцади — кукурузная лепёшка. Около 170 ккал.',
      'Шашлык по-кавказски — баранина. Около 250 ккал на 100 г.',
      'Чурчхела — виноградный сок с орехами. Около 350 ккал.',
    ],
    'Армения': [
      'Долма армянская — фарш в виноградных листьях. Около 190 ккал.',
      'Хоровац — шашлык из свинины/баранины. Около 260 ккал.',
      'Кюфта — мясные шарики в бульоне. Около 200 ккал.',
      'Гата — слоёное тесто с сахарной начинкой. Около 380 ккал.',
      'Спас — йогуртовый суп с пшеницей. Около 140 ккал.',
      'Армянский лаваш — тонкий хлеб. Около 270 ккал на 100 г.',
      'Пахлава армянская — орехи, мёд, тесто. Около 420 ккал.',
      'Толма — баранина с булгуром в овощах. Около 210 ккал.',
      'Апур — кукурузная каша. Около 120 ккал.',
      'Тарhana — суп из ферментированного теста и йогурта. Около 130 ккал.',
    ],
    'Украина': [
      'Борщ — свёкольный суп с говядиной и сметаной. Около 120 ккал.',
      'Вареники с картошкой — вареники, картофель, лук, сало. Около 200 ккал на 5 шт.',
      'Вареники с вишней — сладкие вареники. Около 220 ккал.',
      'Голубцы — фарш с рисом в капусте. Около 180 ккал.',
      'Колбаса домашняя — свинина с чесноком. Около 350 ккал.',
      'Деруны — картофельные оладьи. Около 250 ккал.',
      'Сало — солёная свинина. Около 700 ккал.',
      'Кулич — пасхальный кекс. Около 340 ккал.',
      'Квас — ферментированный хлебный напиток. Около 30 ккал.',
      'Сырники — творожные оладьи. Около 230 ккал.',
    ],
  }

  for (const [region, dishes] of Object.entries(regions)) {
    const content = `# Региональная кухня: ${region}\n\n${dishes.join('\n\n')}`
    await createArticle({
      title: `Блюда ${region} — SnapCal региональная база`,
      slug: `regional-dishes-${region.toLowerCase().replace(/[^a-z0-9а-я]/gi, '-')}-manual`,
      content,
      category: 'regional_cuisine',
      sourceUrl: 'https://snapcal.health/knowledge',
      tags: [region, 'блюда', 'калории', 'ручное'],
    })
    console.log('seeded manual region', region)
  }
}

// === Harvard diet reviews ===

async function fetchHarvardDietReviews(): Promise<Array<{ title: string; url: string; slug: string }>> {
  const { data: html } = await axios.get('https://nutritionsource.hsph.harvard.edu/healthy-weight/diet-reviews/', { timeout: 30000 })
  const links: Array<{ title: string; url: string; slug: string }> = []
  const regex = /href=\"([^\"]+)\">([^<]+(?:diet|Diet)[^<]*)</g
  let match
  const seen = new Set<string>()
  while ((match = regex.exec(html)) !== null) {
    const url = match[1].startsWith('http') ? match[1] : `https://nutritionsource.hsph.harvard.edu${match[1]}`
    const title = match[2].trim()
    if (!title || seen.has(url)) continue
    seen.add(url)
    const slugMatch = url.match(/\/([^/]+)\/$/)
    links.push({ title, url, slug: slugMatch ? slugMatch[1] : title.toLowerCase().replace(/[^a-z0-9]+/g, '-') })
  }
  return links
}

async function fetchPageText(url: string): Promise<string> {
  const { data: html } = await axios.get(url, { timeout: 30000 })
  // Strip scripts and tags crudely
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return text
}

async function seedDietReviews() {
  try {
    const links = await fetchHarvardDietReviews()
    for (const link of links.slice(0, 30)) {
      try {
        const text = await fetchPageText(link.url)
        const summary = text.slice(0, 3000)
        const content = `# ${link.title}\n\nИсточник: Harvard T.H. Chan School of Public Health — Nutrition Source\nURL: ${link.url}\n\n${summary}`
        await createArticle({
          title: link.title,
          slug: `diet-review-${link.slug}`,
          content,
          category: 'diet_review',
          sourceUrl: link.url,
          tags: ['диета', 'обзор', 'harvard', 'healthy-weight'],
        })
        console.log('seeded diet review', link.title)
      } catch (e) {
        console.warn('diet review failed', link.url, (e as Error).message)
      }
    }
  } catch (e) {
    console.error('harvard index failed', (e as Error).message)
  }
}

// === USDA branded foods via FoodData Central ===

async function seedUSDABrandedSample() {
  const apiKey = process.env.USDA_FDC_API_KEY
  if (!apiKey) {
    console.log('USDA_FDC_API_KEY not set, skipping USDA sample')
    return
  }
  try {
    const { data } = await axios.post(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`,
      { query: 'chicken breast', dataType: ['Branded'], pageSize: 25 },
      { timeout: 30000 }
    )
    const foods = data?.foods || []
    const lines = foods.slice(0, 20).map((f: any) => {
      const nutrients = f.foodNutrients?.map((n: any) => `${n.nutrientName}: ${n.value}${n.unitName}`).join(', ') || ''
      return `Продукт: ${f.description}\nБренд: ${f.brandName || '—'}\nПитательные вещества: ${nutrients}\nПорция: ${f.servingSize || ''} ${f.servingSizeUnit || ''}`
    })
    if (lines.length) {
      await createArticle({
        title: 'Брендированные продукты USDA — примеры (куриная грудка)',
        slug: 'usda-branded-chicken-breast',
        content: `# Продукты USDA FoodData Central\n\n${lines.join('\n\n---\n\n')}`,
        category: 'food_products',
        sourceUrl: 'https://fdc.nal.usda.gov/',
        tags: ['usda', 'fdc', 'продукты', 'куриная грудка'],
      })
      console.log('seeded USDA sample', lines.length)
    }
  } catch (e) {
    console.error('usda failed', (e as Error).message)
  }
}

// === Open Food Facts sample ===

async function seedOpenFoodFactsSample() {
  try {
    const { data } = await axios.get(
      'https://world.openfoodfacts.org/cgi/search.pl?search_terms=pizza&search_simple=1&action=process&json=1&page_size=20',
      { timeout: 30000 }
    )
    const products = data?.products || []
    const lines = products.slice(0, 15).map((p: any) => {
      const n = p.nutriments || {}
      return `Продукт: ${p.product_name || 'Unknown'}\nБренд: ${p.brands || '—'}\nКалории: ${n['energy-kcal_100g'] || n.energy_100g || '—'} ккал/100г\nБелки: ${n.proteins_100g || '—'}\nУглеводы: ${n.carbohydrates_100g || '—'}\nЖиры: ${n.fat_100g || '—'}`
    })
    if (lines.length) {
      await createArticle({
        title: 'Продукты Open Food Facts — примеры (пицца)',
        slug: 'openfoodfacts-pizza-sample',
        content: `# Open Food Facts — пицца\n\n${lines.join('\n\n---\n\n')}`,
        category: 'food_products',
        sourceUrl: 'https://world.openfoodfacts.org/',
        tags: ['openfoodfacts', 'продукты', 'пицца'],
      })
      console.log('seeded OpenFoodFacts sample', lines.length)
    }
  } catch (e) {
    console.error('openfoodfacts failed', (e as Error).message)
  }
}

// === Main ===

async function main() {
  await clearSeedArticles()
  await seedTheMealDBRegions()
  await seedManualRegionalDishes()
  await seedDietReviews()
  await seedUSDABrandedSample()
  await seedOpenFoodFactsSample()
  console.log('seed complete')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
