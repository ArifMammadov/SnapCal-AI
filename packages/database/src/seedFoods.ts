import { prisma } from '@snapcal/database'

export async function seedFoods(): Promise<void> {
  const foods = [
    // Azerbaijan
    { name: 'Qutab', aliases: ['qutab', 'kutab', 'кутаб', 'гөтәб'], cuisine: 'Azerbaijani', category: 'main', kcal: 210, p: 6, f: 8, c: 28, verified: false },
    { name: 'Dolma', aliases: ['dolma', 'долма', 'tolma'], cuisine: 'Azerbaijani', category: 'main', kcal: 150, p: 6, f: 7, c: 15, verified: false },
    { name: 'Plov (Azerbaijani)', aliases: ['azeri plov', 'azerbaijani plov', 'плов по-азербайджански'], cuisine: 'Azerbaijani', category: 'main', kcal: 180, p: 5, f: 8, c: 22, verified: false },
    { name: 'Dushbara', aliases: ['dushbara', 'dyushbara', 'душбара'], cuisine: 'Azerbaijani', category: 'soup', kcal: 130, p: 7, f: 5, c: 14, verified: false },
    { name: 'Piti', aliases: ['piti', 'пити'], cuisine: 'Azerbaijani', category: 'soup', kcal: 160, p: 12, f: 8, c: 8, verified: false },
    { name: 'Azerbaijani kebab', aliases: ['lule kebab', 'tika kebab', ' Azerbaijani kebab', 'people kebab'], cuisine: 'Azerbaijani', category: 'main', kcal: 250, p: 22, f: 17, c: 2, verified: false },

    // Turkey
    { name: 'Doner kebab', aliases: ['döner', 'doner', 'doner kebab', 'донер', 'донер кебаб'], cuisine: 'Turkish', category: 'main', kcal: 220, p: 13, f: 9, c: 20, verified: false },
    { name: 'Manti', aliases: ['mantı', 'manti', 'манты', 'манты по-турецки'], cuisine: 'Turkish', category: 'main', kcal: 230, p: 10, f: 9, c: 27, verified: false },
    { name: 'Menemen', aliases: ['menemen', 'менемен'], cuisine: 'Turkish', category: 'breakfast', kcal: 140, p: 9, f: 10, c: 3, verified: false },
    { name: 'Lahmacun', aliases: ['lahmacun', 'лахмаджун', 'turkish pizza'], cuisine: 'Turkish', category: 'main', kcal: 260, p: 9, f: 9, c: 35, verified: false },
    { name: 'Pide', aliases: ['pide', 'пиде', 'turkish pide'], cuisine: 'Turkish', category: 'main', kcal: 250, p: 9, f: 8, c: 34, verified: false },
    { name: 'Köfte', aliases: ['kofte', 'köfte', 'кюфта', 'кёфте'], cuisine: 'Turkish', category: 'main', kcal: 240, p: 18, f: 16, c: 4, verified: false },
    { name: 'Mercimek çorbası', aliases: ['mercimek corbasi', 'lentil soup', 'чечевичный суп'], cuisine: 'Turkish', category: 'soup', kcal: 90, p: 6, f: 2, c: 13, verified: false },

    // Central Asia
    { name: 'Uzbek plov', aliases: ['osh', 'palov', 'uzbek plov', 'узбекский плов'], cuisine: 'Uzbek', category: 'main', kcal: 190, p: 6, f: 8, c: 23, verified: false },
    { name: 'Lagman', aliases: ['lagman', 'лагман'], cuisine: 'Central Asian', category: 'main', kcal: 130, p: 6, f: 4, c: 18, verified: false },
    { name: 'Manti (Central Asian)', aliases: ['manty', 'manty central asian', 'манты'], cuisine: 'Central Asian', category: 'main', kcal: 220, p: 11, f: 8, c: 25, verified: false },
    { name: 'Samsa', aliases: ['samsa', 'samosa', 'самса'], cuisine: 'Central Asian', category: 'pastry', kcal: 280, p: 8, f: 14, c: 30, verified: false },
    { name: 'Shashlik', aliases: ['shashlik', 'kebab', 'шашлык'], cuisine: 'Central Asian', category: 'main', kcal: 240, p: 21, f: 16, c: 1, verified: false },
    { name: 'Beshbarmak', aliases: ['beshbarmak', 'бешбармак'], cuisine: 'Central Asian', category: 'main', kcal: 170, p: 14, f: 6, c: 14, verified: false },

    // MENA
    { name: 'Hummus', aliases: ['hummus', 'хумус'], cuisine: 'MENA', category: 'side', kcal: 170, p: 8, f: 9, c: 14, verified: false },
    { name: 'Shawarma', aliases: ['shawarma', 'шаурма', 'shawurma'], cuisine: 'MENA', category: 'main', kcal: 240, p: 11, f: 11, c: 23, verified: false },
    { name: 'Falafel', aliases: ['falafel', 'фалафель'], cuisine: 'MENA', category: 'main', kcal: 330, p: 13, f: 18, c: 30, verified: false },
    { name: 'Mansaf', aliases: ['mansaf', 'мансаф'], cuisine: 'MENA', category: 'main', kcal: 200, p: 12, f: 9, c: 17, verified: false },
    { name: 'Kabsa', aliases: ['kabsa', 'machboos', 'кабса'], cuisine: 'MENA', category: 'main', kcal: 210, p: 10, f: 8, c: 24, verified: false },
    { name: 'Fattah', aliases: ['fattah', 'fatta', 'фатта'], cuisine: 'MENA', category: 'main', kcal: 220, p: 9, f: 8, c: 27, verified: false },

    // Russia/CIS
    { name: 'Borscht', aliases: ['borscht', 'borsch', 'борщ'], cuisine: 'Russian', category: 'soup', kcal: 80, p: 3, f: 3, c: 10, verified: false },
    { name: 'Olivier salad', aliases: ['olivier', 'russian salad', 'салат оливье'], cuisine: 'Russian', category: 'salad', kcal: 190, p: 5, f: 14, c: 11, verified: false },
    { name: 'Pelmeni', aliases: ['pelmeni', 'пельмени'], cuisine: 'Russian', category: 'main', kcal: 220, p: 12, f: 10, c: 20, verified: false },
    { name: 'Blini', aliases: ['blini', 'blintz', 'блины'], cuisine: 'Russian', category: 'breakfast', kcal: 230, p: 7, f: 8, c: 32, verified: false },

    // International common
    { name: 'Pizza', aliases: ['pizza', 'пицца'], cuisine: 'International', category: 'main', kcal: 260, p: 11, f: 10, c: 30, verified: false },
    { name: 'Burger', aliases: ['burger', 'hamburger', 'cheeseburger', 'бургер'], cuisine: 'International', category: 'main', kcal: 290, p: 15, f: 15, c: 24, verified: false },
    { name: 'Sushi roll', aliases: ['sushi', 'maki', 'roll', 'суши', 'ролл'], cuisine: 'International', category: 'main', kcal: 150, p: 5, f: 3, c: 25, verified: false },
    { name: 'Caesar salad', aliases: ['caesar salad', 'цезарь'], cuisine: 'International', category: 'salad', kcal: 160, p: 8, f: 10, c: 8, verified: false },
    { name: 'Chicken breast', aliases: ['chicken breast', 'grilled chicken', 'куриная грудка'], cuisine: 'International', category: 'main', kcal: 165, p: 31, f: 3.6, c: 0, verified: false },
    { name: 'Rice', aliases: ['rice', 'steamed rice', 'рис'], cuisine: 'International', category: 'side', kcal: 130, p: 2.7, f: 0.3, c: 28, verified: false },
    { name: 'Apple', aliases: ['apple', 'яблоко'], cuisine: 'International', category: 'fruit', kcal: 52, p: 0.3, f: 0.2, c: 14, verified: false },
    { name: 'Banana', aliases: ['banana', 'банан'], cuisine: 'International', category: 'fruit', kcal: 89, p: 1.1, f: 0.3, c: 23, verified: false },
  ]

  for (const food of foods) {
    const normalized = food.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim()
    await prisma.food.upsert({
      where: { normalizedName: normalized },
      update: {},
      create: {
        name: food.name,
        normalizedName: normalized,
        aliases: Array.from(new Set([...food.aliases, normalized])),
        cuisine: food.cuisine,
        category: food.category,
        servingSizeG: 100,
        kcalPer100g: food.kcal,
        proteinPer100g: food.p,
        fatPer100g: food.f,
        carbsPer100g: food.c,
        verified: food.verified,
        source: 'seed/approximate',
      },
    })
  }
}
