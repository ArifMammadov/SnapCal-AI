# SnapCal AI — Полный технический аудит

Дата аудита: 13 августа 2026 г.  
Репозиторий: `/Users/arifmammadov/snapcal-ai-health-coach` (ветка `main`)  
Последний CI/CD: run `31689302549` ✅ success (deploy-main)

---

## 1. Общая сводка кодовой базы

| Показатель | Значение |
|---|---|
| Всего файлов (без node_modules/dist) | ~136 |
| TypeScript + TSX файлов | 60 |
| Строк кода (TS/TSX) | ~6 805 |
| Строк YAML (CI/CD / Docker) | ~543 |
| Prisma schema | ~266 строк SQL-моделей |
| Комментарии | Очень низкий % (~7.9%)
| Тестов | **0** (`.test.ts` / `.spec.ts` не найдены) |
| ESLint / Prettier / Biome | **не настроены** |
| Root tsconfig | `strict: true`, `noImplicitAny: true` |

**Вывод:** проект небольшой, монорепозиторий на pnpm workspaces. Код плотный, почти без комментариев и документации. Главная архитектурная боль — отсутствие тестов и линтеров.

---

## 2. Состояние AI-агента

### 2.1. Это полноценный агент?

**Нет — это скорее «router + tool executor», чем полноценный autonomous agent.**

Состав:
- ✅ **Backend ai-agent** (`apps/ai-agent`) — отдельный Fastify-сервис.
- ❌ **Dedicated frontend для агента нет** — AI-общение встроено в `apps/mobile` (`ChatScreen.tsx`).
- ✅ **Система skills** (`apps/ai-agent/src/skills/index.ts`):
  - `onboarding`, `nutrition`, `fitness`, `food_vision`, `coach`, `marketplace`.
- ✅ **Набор tools** (`apps/ai-agent/src/tools/index.ts`):
  - `getUserSummary`, `searchKnowledge`, `recommendProgram`, `analyzePhoto`, `logFood` (stub), `logActivity` (stub).
- ⚠️ **Routing наивный** — keyword-based regex (`/\b(calorie|kcal|meal|food)\b/i`).
- ⚠️ **Нет цикла «thought → tool → observation → answer»** — инструменты вызываются один раз до LLM.
- ⚠️ **Нет планировщика** и state machine.
- ⚠️ **Guardrails слабые** — только regex-цензура и medical disclaimer.
- ⚠️ **Prompt injection detection существует, но не применяется** в `handleChat`.

### 2.2. Модели и провайдеры

| Компонент | Значение |
|---|---|
| Основной провайдер | OpenRouter |
| Основные модели | `openai/gpt-4o`, `anthropic/claude-3.5-sonnet` |
| Fallback модель | `gpt-4o-mini` |
| Локальный fallback | Ollama (`FALLBACK_MODEL = 'gpt-4o-mini'` — несовместимость: Ollama не знает такой slug) |
| Vision | `openai/gpt-4o` |
| JSON-mode для еды | **не используется** (`response_format: { type: 'json_object' }` отсутствует) |
| Structured output / Zod | **не используется** |

**Критично:**
- `callOpenRouter` не передаёт `maxTokens` аргумент `_maxTokens` — захардкожен `max_tokens: 1024`.
- Нет retry с exponential backoff.
- Нет таймаута на уровне запроса пользователя.
- В `callOllama` передаётся `model: 'gpt-4o-mini'`, что не работает в Ollama.

### 2.3. Бенчмарки

**Бенчмарков нет.**

Возможные метрики, которые стоит внедрить:
1. **Food recognition accuracy** — сравнение распознанных макрос с референсом.
2. **Intent classification accuracy** — качество keyword routing.
3. **Response latency P50/P95** — уже записывается `latencyMs` в `chatMessage`.
4. **Cost per request** — не считается, хотя OpenRouter возвращает usage.
5. **Hallucination rate** — не измеряется.
6. **User satisfaction** — нет feedback loop (thumbs up/down).

---

## 3. Найденные баги и антипаттерны

### 3.1. 🔴 Высокий приоритет

| # | Проблема | Где | Последствия |
|---|---|---|---|
| 1 | **Нет health check endpoints** | `apps/api/src/index.ts`, `apps/ai-agent/src/index.ts` | Docker healthcheck в `docker-compose.prod.yml` обращается к `/health`, которого нет → контейнер будет считаться unhealthy, Kubernetes readiness/liveness не работают |
| 2 | **Prisma-миграции не применены автоматически в CI/CD** | `.github/workflows/ci-cd.yml` | Новые таблицы `Notification`, `ReminderPreference`, `AuditLog` не создаются на проде; endpoints упадут |
| 3 | **Ollama fallback сломан** | `apps/ai-agent/src/llm/openrouter.ts:86` | При недоступности OpenRouter fallback вызовет несуществующую модель `'gpt-4o-mini'` |
| 4 | **AI-аудит не пишет metadata** | `apps/ai-agent/src/audit/index.ts` | В `aiAuditLog` пишется только `userId` и `skillName` как `action`; `metadata`, `model`, `latency`, `requestId` теряются |
| 5 | **Type assertion `as any` в критических местах** | `ai.ts:89`, `agent.ts:29`, `tracking.ts` | Скрывает типизацию, ведёт к runtime-ошибкам |
| 6 | **Не используется JSON-mode для food_vision** | `openrouter.ts:42` | LLM может вернуть markdown вокруг JSON → парсинг на фронте упадёт |
| 7 | **Бесконечный импорт истории** | `orchestrator.ts:108` | `chatMessage.findMany` забирает последние 10 сообщений — пока ок, но при росте пользователя масштабируется линейно |
| 8 | **Admin `/users` без пагинации** | `admin.ts:88` | `findMany()` без `take` вернёт всех пользователей → OOM при тысячах юзеров |
| 9 | **GDPR export без пагинации** | `gdpr.ts` | `findMany` без лимитов на больших аккаунтах убьёт память |
| 10 | **Console.log в production** | `telegram-bot`, `api/index.ts`, `error-handler.ts` | Нет структурного логирования, сложно мониторить |

### 3.2. 🟠 Средний приоритет

| # | Проблема | Где | Последствия |
|---|---|---|---|
| 11 | **Нет пагинации в `/api/admin/audit-logs`** | `admin.ts:132` | `take` отсутствует |
| 12 | **Rate limiting global хранится в памяти** | `apps/api/src/index.ts` | Не работает при horizonal scaling; нужен Redis store |
| 13 | **Нет structured logging (pino/winston)** | весь backend | Невозможно нормально агрегировать логи в ELK/Grafana Loki |
| 14 | **Нет unit/integration/E2E тестов** | весь проект | Любой рефактор рискован |
| 15 | **Нет ESLint/Prettier** | весь проект | Code style не консистентен |
| 16 | **AI agent route не валидирует входящий `x-snapcal-secret` заголовок** | `agent.ts` | Проверяется `body.secret`, а не заголовок; middleware style не совпадает с API вызовом |
| 17 | **Telegram cron — отдельный процесс, не в Docker Compose** | `apps/telegram-bot/src/cron/reminders.ts` | Напоминания не будут работать, если cron не запущен вручную |
| 18 | **Redis заявлен, но не используется** | `env.ts` | Есть `REDIS_URL`, но нет кэша, сессий, очередей |
| 19 | **Mobile app — Vite SPA, не PWA** | `apps/mobile` | Нет service worker, offline-mode, install prompt |
| 20 | **Не настроен Sentry / Datadog / любой APM** | весь проект | Нет tracing, error tracking |

### 3.3. 🟢 Низкий приоритет

| # | Проблема | Где |
|---|---|---|
| 21 | `applyGuardrails` делает `content.replace(pattern, '[REDACTED]')` — может сломать разметку |
| 22 | `searchKnowledge` игнорирует `message` — всегда возвращает первые 5 статей |
| 23 | `logFood` / `logActivity` в агенте — stubs |
| 24 | `getUserSummary` в `memory/index.ts` — пустая заглушка, дублирует tool |
| 25 | `apps/admin/src/App.tsx` — 500+ строк, god-component |

---

## 4. Качество кода и чистота архитектуры

### Что сделано хорошо
- ✅ **Монорепозиторий на pnpm workspaces** — правильный выбор.
- ✅ **Zod для валидации env** во всех backend-приложениях.
- ✅ **Prisma singleton** с `globalForPrisma`.
- ✅ **JWT + refresh token rotation** в `/api/auth/refresh`.
- ✅ **RBAC** (`USER`, `SUPPORT`, `ADMIN`, `VIEWER`).
- ✅ **Shared package** `@snapcal/shared` для utilities.
- ✅ **Fastify + TypeScript** — хороший стек для API.
- ✅ **Helmet + rate-limit** добавлены в последнем коммите.
- ✅ **Telegram WebApp auth** с проверкой `HMAC-SHA256`.

### Что требует улучшения
- ❌ **Отсутствие слоя repository/service** — роуты напрямую дергают `prisma`.
- ❌ **Fat handlers** — много бизнес-логики в route-файлах.
- ❌ **Нет DTO/mapper слоя** — `telegramId.toString()` дублируется в нескольких местах.
- ❌ **Слабая обработка ошибок** — `try/catch` с пустым телом в `audit/index.ts` и `memory/index.ts`.
- ❌ **Hardcoded values** (`MAX_OUTPUT_TOKENS = 1024`, `take: 10`) без конфигурации.
- ❌ **Комментарии и README отсутствуют** — новый разработчик будет разбираться долго.

**Оценка качества кода: 6/10.** Код рабочий, но требует рефакторинга перед масштабированием.

---

## 5. Production-readiness

### 5.1. CI/CD

| Компонент | Статус |
|---|---|
| GitHub Actions workflow | ✅ Есть `.github/workflows/ci-cd.yml` |
| Lint | ❌ Нет шага lint |
| Typecheck | ✅ Есть |
| Build | ✅ Есть |
| Tests | ❌ `pnpm -r test` запускается, но тестов нет — exit 0 |
| Deploy | ✅ SSH + systemd restart |
| Blue-green / Canary | ❌ Нет |
| Автоматический rollback | ❌ Нет |
| Миграции в CI/CD | ❌ Нет `prisma migrate deploy` |

### 5.2. Docker / Infra

| Компонент | Статус |
|---|---|
| Multi-stage Dockerfile | ✅ Есть |
| docker-compose prod/staging/test | ✅ Есть |
| PostgreSQL + pgvector | ✅ Есть |
| Redis | ✅ Есть, но не используется |
| Nginx reverse proxy | ✅ Есть конфигурация |
| Health checks | ⚠️ Конфигурация есть, но endpoints отсутствуют |
| Secrets management | ⚠️ Через `.env` на сервере, нет Vault/Secrets Manager |

### 5.3. Env / Secrets

В `.env` на сервере должны быть (проверить вручную):
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `ADMIN_SECRET`
- `AI_AGENT_SECRET` / `AI_API_KEY` (нужно унифицировать naming)

**Проблема:** в `docker-compose.prod.yml` API передаёт `AI_AGENT_API_KEY: ${AI_API_KEY}`, а ai-agent ожидает `AI_API_KEY`. API ожидает `AI_AGENT_SECRET`. Сейчас после последнего коммита имена должны быть `AI_AGENT_SECRET` (API) и `AGENT_SECRET` (ai-agent). В compose они называются `AI_API_KEY` — **нужно обновить `.env` и compose, иначе связь api ↔ ai-agent сломается.**

---

## 6. Масштабируемость

### 6.1. Горизонтальное масштабирование

**Текущее состояние: плохо подготовлено.**

| Узкое место | Почему |
|---|---|
| **Rate limit in-memory** | При 2+ инстансах API лимиты обнуляются |
| **Stateless — да, но с оговорками** | JWT хранится в клиенте, good. Но telegram webhook + long-polling требуют sticky sessions или single instance |
| **Prisma connection pool** | Default pool size; под нагрузкой нужно tuning |
| **Redis не используется** | Нет shared cache, сессий, очередей |
| **Нет очередей** | AI-запросы и webhook обрабатываются синхронно — при пиковой нагрузке API будет блокироваться |
| **База — единый PostgreSQL** | Нет read replica, connection pooling (PgBouncer) |
| **File uploads** | Не найдены, но если появятся — нужен S3 |

### 6.2. Производительность

| Операция | Оценка |
|---|---|
| AI chat (OpenRouter 60s timeout) | Блокирующий; без очереди P95 будет расти |
| Food vision | Аналогично + передача URL публичного изображения |
| Admin users list | Без пагинации — угроза OOM |
| Notification cron | Линейный скан `reminderPreference.findMany` без индекса по `enabled` |
| GDPR export | OOM-опасен на больших аккаунтах |

### 6.3. Что нужно для масштабирования до 1M+ пользователей
1. Внедрить **Redis-backed rate limiting**.
2. Вынести AI-вызовы в **очередь (BullMQ / SQS)** с worker-ами.
3. Добавить **PgBouncer** и read replica.
4. Внедрить **кэширование** (Redis) для knowledge base, programs, user profile.
5. Вынести telegram bot в отдельный горизонтально масштабируемый сервис с webhook.
6. CDN для статики mobile/admin.
7. S3 для файлов (если будут).
8. Kubernetes с HPA вместо systemd.

---

## 7. Логирование и аудит

### 7.1. Что логируется в БД

| Модель | Что фиксируется | Статус |
|---|---|---|
| `ChatMessage` | Все сообщения user/AI, модель, latency | ✅ |
| `AiAuditLog` | Попытки AI-вызовов (но metadata потеряна) | ⚠️ |
| `AuditLog` | Admin access / denied / login failed | ⚠️ Только admin |
| `FoodLog`, `ActivityLog`, `MetricLog` | Пользовательские данные | ✅ |
| `Notification` | In-app + Telegram уведомления | ✅ |

### 7.2. Чего не хватает

- ❌ **Application logs в БД не пишутся** — только `console.*`.
- ❌ **Нет request log** (method, path, status, duration, userId, ip).
- ❌ **Нет security audit** для обычных пользователей (login, password reset, suspicious activity).
- ❌ **Нет log retention policy** — таблицы будут расти бесконечно.
- ❌ **Нет экспорта логов** во внешнюю систему (Datadog, Loki, CloudWatch).

### 7.3. Рекомендация

Внедрить **Pino** (или **Winston**) с JSON-форматом + ротация. Отдельно — `request.log` middleware на Fastify.

---

## 8. Что осталось доработать для выхода на прод

### 🔴 Блокеры (нельзя запускать без этого)

1. **Применить Prisma-миграции на проде** — `pnpm prisma migrate deploy`.
2. **Добавить `/health` endpoints** в API и ai-agent.
3. **Исправить AI ↔ api shared secret naming** в `.env` и `docker-compose.prod.yml`.
4. **Исправить Ollama fallback** (правильный slug модели).
5. **Добавить `response_format: json_object`** для food vision.
6. **Добавить пагинацию** в admin users, audit logs, GDPR export.
7. **Настроить структурное логирование** (pino) и убрать console.log.

### 🟠 Высокий приоритет (для стабильности)

8. Внедрить **Redis-backed rate limiting**.
9. Вынести AI-вызовы в **очередь (BullMQ)**.
10. Написать **unit и integration тесты** (Vitest + Supertest).
11. Настроить **ESLint + Prettier**.
12. Добавить **Sentry/Datadog** для error tracking.
13. Настроить **cron для reminders** в systemd/Docker.
14. Добавить **WAF / DDoS защиту** на уровне CDN (Cloudflare) или nginx.

### 🟡 Средний приоритет (для роста)

15. Сделать mobile **PWA** (service worker, manifest).
16. Внедрить **кэширование** (Redis) для knowledge/programs.
17. Добавить **бенчмарки качества AI**.
18. Внедрить **feedback loop** для AI-ответов (thumbs up/down).
19. Рефакторинг: вынести repository/service слой.
20. Подключить **PgBouncer** и read replica.

---

## 9. Итоговая оценка готовности к продакшену

| Направление | Оценка (1–10) | Комментарий |
|---|---|---|
| AI-агент | 5/10 | Работает, но не autonomous, слабые guardrails, нет бенчмарков |
| Backend API | 6/10 | Рабочий, но нет тестов, много fat handlers |
| Mobile app | 6/10 | Vite SPA в Telegram WebView, базовый функционал есть |
| Admin panel | 5/10 | CRUD users/programs/audit, но god-component, нет пагинации |
| Безопасность | 6/10 | JWT, RBAC, rate limits, helmet есть, но WAF/DDoS нет, secret naming не консистентен |
| DevOps / CI/CD | 5/10 | Есть deploy, но нет миграций в CI/CD, нет тестов, нет blue-green |
| Масштабируемость | 4/10 | Redis не используется, rate limit in-memory, нет очередей |
| Observability | 3/10 | Только console.log, нет APM/Sentry |
| **Итого** | **5/10** | **Минимально работоспособный MVP. До production нужно закрыть блокеры.** |

---

## 10. Рекомендуемый план на ближайшие 2 недели

| День | Задача |
|---|---|
| 1 | Применить миграции на проде; проверить `/api/notifications`, `/api/gdpr` |
| 2 | Добавить `/health` endpoints + исправить health checks |
| 3 | Исправить AI secret naming и Ollama fallback |
| 4 | JSON-mode для food vision + пагинация admin |
| 5–6 | Внедрить Pino + убрать console.log |
| 7 | Настроить Redis-backed rate limiting |
| 8–10 | Написать Vitest + Supertest тесты на критические пути |
| 11 | Настроить ESLint + Prettier |
| 12 | Внедрить BullMQ для AI-запросов |
| 13 | Подключить Sentry |
| 14 | Настроить systemd cron для reminders |

---

## 11. Что можно сделать прямо сейчас

Если хочешь, я могу сразу исправить самые критичные вещи:
1. Добавить `/health` endpoint в API и ai-agent.
2. Исправить AI secret naming в docker-compose.
3. Добавить JSON-mode для food vision.
4. Добавить пагинацию в admin users и audit logs.
5. Заменить console.log на Pino.

Скажи, с какого пункта начинаем.
