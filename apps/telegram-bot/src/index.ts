import TelegramBot from 'node-telegram-bot-api'
import { env } from './lib/env.js'
import { prisma } from '@snapcal/database'

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
})

export async function sendNotification(telegramId: bigint, text: string) {
  try {
    await bot.sendMessage(Number(telegramId), text)
  } catch (err) {
    console.error('Failed to send Telegram notification:', err)
  }
}

async function main() {
  console.log('Telegram bot started')
}

main()
