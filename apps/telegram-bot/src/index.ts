import TelegramBot from 'node-telegram-bot-api'
import { env } from './lib/env.js'
import { prisma } from '@snapcal/database'
import { initTracing, installShutdownHandlers, logger } from '@snapcal/shared'

const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: true })

const MINI_APP_URL = env.MOBILE_APP_URL

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id
  const user = msg.from

  if (!user) return

  const welcomeText = `Welcome to SnapCal AI, ${user.first_name}! 🥗\nTap the button below to open your personal AI nutrition coach.`

  await bot.sendMessage(chatId, welcomeText, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Open SnapCal AI',
            web_app: { url: MINI_APP_URL },
          },
        ],
      ],
    },
  })

  try {
    await prisma.user.upsert({
      where: { telegramId: BigInt(user.id) },
      create: {
        telegramId: BigInt(user.id),
        telegramUsername: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        languageCode: user.language_code ?? 'en',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        profile: { create: {} },
      },
      update: {
        telegramUsername: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    })
  } catch (err) {
    logger.warn({ err, telegramId: user.id }, 'failed to upsert user from /start')
  }
})

bot.on('web_app_data', async (msg) => {
  const user = msg.from
  const data = msg.web_app_data?.data
  if (!user || !data) return
  logger.info({ telegramId: user.id, data }, 'received web_app_data')
})

export async function sendTelegramNotification(telegramId: bigint, text: string, options?: TelegramBot.SendMessageOptions) {
  try {
    await bot.sendMessage(Number(telegramId), text, options)
  } catch (err) {
    logger.warn({ err, telegramId: telegramId.toString() }, 'failed to send telegram notification')
  }
}

const REMINDER_TEMPLATES: Record<string, { title: string; body: string }> = {
  breakfast: {
    title: 'Завтрак 🌅',
    body: 'Доброе утро! Залогируй завтрак — сделай фото еды, и AI рассчитает калории.',
  },
  lunch: {
    title: 'Обед 🍽️',
    body: 'Время обеда! Сфотографируй тарелку или расскажи, что ешь.',
  },
  dinner: {
    title: 'Ужин 🌙',
    body: 'Не забудь про ужин. Лёгкий ужин — залог хорошего сна и прогресса.',
  },
  weight: {
    title: 'Взвешивание ⚖️',
    body: 'Сегодня день взвешивания. Запиши текущий вес, чтобы отслеживать динамику.',
  },
  workout: {
    title: 'Тренировка 💪',
    body: 'Запланирована тренировка. После неё не забудь восполнить белок!',
  },
  water: {
    title: 'Вода 💧',
    body: 'Пей водичку! Гидратация помогает контролировать аппетит и энергию.',
  },
}

export async function sendReminder(userId: string, type: string) {
  const template = REMINDER_TEMPLATES[type]
  if (!template) return

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.telegramId) return

  await prisma.notification.create({
    data: {
      userId,
      type,
      title: template.title,
      body: template.body,
      sentVia: 'telegram',
    },
  })

  await sendTelegramNotification(user.telegramId, `${template.title}\n\n${template.body}`, {
    reply_markup: {
      inline_keyboard: [[{ text: 'Открыть SnapCal AI', web_app: { url: MINI_APP_URL } }]],
    },
  })
}

export async function processRemindersForTime(hourMinute: string, dayOfWeek: string) {
  const prefs = await prisma.reminderPreference.findMany({
    where: { enabled: true },
    include: { user: true },
  })

  for (const pref of prefs) {
    if (!pref.user.telegramId) continue

    const sendIfMatch = async (field: keyof typeof REMINDER_TEMPLATES | null, time: string | null, matchDay?: boolean) => {
      if (!field || !time || time !== hourMinute) return
      if (matchDay !== undefined && !matchDay) return
      await sendReminder(pref.userId, field)
    }

    await sendIfMatch('breakfast', pref.breakfastAt)
    await sendIfMatch('lunch', pref.lunchAt)
    await sendIfMatch('dinner', pref.dinnerAt)
    await sendIfMatch('weight', pref.weightAt, pref.weightDay === dayOfWeek)
    await sendIfMatch('workout', pref.workoutAt, pref.workoutDays.includes(dayOfWeek))
  }
}

async function main() {
  initTracing('snapcal-telegram-bot')
  installShutdownHandlers()
  logger.info('telegram bot started')
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start telegram bot')
  process.exit(1)
})
