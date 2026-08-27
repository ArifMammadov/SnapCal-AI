export type BasicProgramCategory = 'Gym' | 'Home Fitness' | 'Diet' | 'Yoga'

export interface BasicProgram {
  id: string
  imageUrl: string
  title: string
  titleRu: string
  subtitle: string
  subtitleRu: string
  category: BasicProgramCategory
  color: string
  gradient: string
  durationWeeks: number
  price: number
  level: string
  rating: number
  reviews: number
  enrolled: number
  emoji: string
  includes: string[]
  includesRu: string[]
  tips: string[]
  tipsRu: string[]
}

export const basicPrograms: BasicProgram[] = [
  {
    id: 'basic-gym',
    imageUrl: '/images/programs/gym.jpg',
    title: 'Gym',
    titleRu: 'Тренажёрный зал',
    subtitle: 'Basic strength program',
    subtitleRu: 'Базовая силовая программа',
    category: 'Gym',
    color: 'var(--rose)',
    gradient: 'linear-gradient(135deg, #ff4d6d 0%, #c9184a 100%)',
    durationWeeks: 8,
    price: 0,
    level: 'Beginner',
    rating: 4.8,
    reviews: 0,
    enrolled: 0,
    emoji: '🏋️',
    includes: ['3 workouts/week', 'Barbell basics', 'Progression plan'],
    includesRu: ['3 тренировки/неделю', 'Основы штанги', 'План прогрессии'],
    tips: [
      'Barbell squat — 3 sets of 8–10 reps',
      'Bench press — 3 sets of 8–10 reps',
      'Deadlift — 3 sets of 6–8 reps',
      'Overhead press — 3 sets of 8–10 reps',
      '3 sessions/week: Monday / Wednesday / Friday',
    ],
    tipsRu: [
      'Приседания со штангой — 3 подхода по 8–10 повторений',
      'Жим лёжа — 3 подхода по 8–10 повторений',
      'Становая тяга — 3 подхода по 6–8 повторений',
      'Жим стоя — 3 подхода по 8–10 повторений',
      '3 тренировки в неделю: понедельник / среда / пятница',
    ],
  },
  {
    id: 'basic-home',
    imageUrl: '/images/programs/home.jpg',
    title: 'Home Workout',
    titleRu: 'Домашний воркаут',
    subtitle: 'No equipment, 20–30 min',
    subtitleRu: 'Без оборудования, 20–30 мин',
    category: 'Home Fitness',
    color: 'var(--orange)',
    gradient: 'linear-gradient(135deg, #ff7a45 0%, #e85d04 100%)',
    durationWeeks: 4,
    price: 0,
    level: 'All levels',
    rating: 4.7,
    reviews: 0,
    enrolled: 0,
    emoji: '🏠',
    includes: ['No equipment', 'Full body', 'Calorie burn'],
    includesRu: ['Без оборудования', 'Всё тело', 'Сжигание калорий'],
    tips: [
      'Push-ups — 3 sets of 10–15 reps',
      'Bodyweight squats — 3 sets of 15–20 reps',
      'Lunges — 3 sets of 10 per leg',
      'Plank — 3 holds of 30–60 seconds',
      'Burpees — 3 sets of 8–10 reps for calorie burn',
    ],
    tipsRu: [
      'Отжимания — 3 подхода по 10–15 повторений',
      'Приседания — 3 подхода по 15–20 повторений',
      'Выпады — 3 подхода по 10 на каждую ногу',
      'Планка — 3 подхода по 30–60 секунд',
      'Берпи — 3 подхода по 8–10 повторений для сжигания калорий',
    ],
  },
  {
    id: 'basic-diet',
    imageUrl: '/images/programs/diet.jpg',
    title: 'Diet',
    titleRu: 'Диета',
    subtitle: 'Healthy eating principles',
    subtitleRu: 'Принципы здорового питания',
    category: 'Diet',
    color: 'var(--green)',
    gradient: 'linear-gradient(135deg, #00d48a 0%, #00a86b 100%)',
    durationWeeks: 12,
    price: 0,
    level: 'All levels',
    rating: 4.9,
    reviews: 0,
    enrolled: 0,
    emoji: '🥗',
    includes: ['Plate rule', 'Macro guide', 'Meal ideas'],
    includesRu: ['Принцип тарелки', 'Гид по БЖУ', 'Идеи блюд'],
    tips: [
      'Plate rule: ½ vegetables, ¼ protein, ¼ complex carbs',
      'Protein: 1.6–2.2 g per kg bodyweight depending on activity',
      'Fiber: 25–35 g/day from vegetables, fruit, whole grains',
      'Water: 30–40 ml per kg bodyweight per day',
      '300–500 kcal deficit to lose, 200–300 kcal surplus to gain',
    ],
    tipsRu: [
      'Принцип тарелки: ½ овощи, ¼ белок, ¼ сложные углеводы',
      'Белок: 1,6–2,2 г на кг веса в зависимости от активности',
      'Клетчатка: 25–35 г в день из овощей, фруктов, цельных злаков',
      'Вода: 30–40 мл на кг веса в день',
      'Дефицит 300–500 ккал для похудения, профицит 200–300 для набора массы',
    ],
  },
  {
    id: 'basic-yoga',
    imageUrl: '/images/programs/yoga.jpg',
    title: 'Yoga',
    titleRu: 'Йога',
    subtitle: 'Flexibility & recovery',
    subtitleRu: 'Гибкость и восстановление',
    category: 'Yoga',
    color: 'var(--purple)',
    gradient: 'linear-gradient(135deg, #7b6ef6 0%, #5a4fcf 100%)',
    durationWeeks: 6,
    price: 0,
    level: 'Beginner',
    rating: 4.8,
    reviews: 0,
    enrolled: 0,
    emoji: '🧘',
    includes: ['Sun Salutation', 'Recovery poses', 'Breathing'],
    includesRu: ['Сурья Намаскар', 'Позы восстановления', 'Дыхание'],
    tips: [
      'Sun Salutation — 5–10 rounds to warm up',
      'Downward Dog — 30–60 seconds for hamstring stretch',
      'Warrior I & II — 30 seconds each side',
      'Child’s pose — 1–2 minutes to release lower back',
      'Nasal breathing, 4–6 breaths/min, practice 3–4 times/week',
    ],
    tipsRu: [
      'Сурья Намаскар — 5–10 циклов для разогрева',
      'Адхо Мукха Шванасана — 30–60 секунд для растяжки задней поверхности',
      'Вирабхадрасана I & II — по 30 секунд с каждой стороны',
      'Поза ребёнка — 1–2 минуты для расслабления спины',
      'Дышите носом, 4–6 циклов в минуту, делайте 3–4 раза в неделю',
    ],
  },
]
