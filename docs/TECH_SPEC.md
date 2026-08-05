# SnapCal AI — Technical Specification

## 1. Monorepo Structure

```
SnapCal-AI/
├── apps/
│   ├── mobile/          # PWA + Telegram Mini App (React 19 + Vite 8 + Tailwind v4)
│   ├── admin/           # Admin website (React 19 + Vite)
│   ├── api/             # Backend REST API (Node.js + Fastify)
│   ├── ai-agent/        # AI agent service (Node.js + Fastify)
│   └── telegram-bot/    # Telegram bot (Node.js)
├── packages/
│   ├── database/        # Prisma schema + client
│   ├── shared/          # Types, constants, utilities
│   └── config/          # Shared ESLint, TS, env validation
├── infra/
│   ├── docker/
│   ├── nginx/
│   └── scripts/
└── docs/
    ├── SRS.md
    └── TECH_SPEC.md
```

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, Tailwind CSS v4, TypeScript 5.7, recharts |
| Mobile shell | Telegram Mini App SDK, PWA manifest, service worker |
| State | Zustand |
| Backend | Node.js 22, Fastify, Prisma, PostgreSQL 16, Redis 7 |
| AI | OpenRouter, Ollama, pgvector, Whisper |
| Auth | Telegram Mini App initData, JWT + refresh rotation |
| Payments | Stripe, Telegram Wallet / TON (future) |
| Storage | S3 / DigitalOcean Spaces |
| Queue | BullMQ |
| Monitoring | Prometheus, Grafana, Sentry |
| CI/CD | GitHub Actions, Docker, PM2 |

## 3. Service Communication

- API service owns auth, users, tracking, subscriptions, marketplace.
- AI agent service is called by API service internally.
- Telegram bot service sends notifications and opens Mini App.
- Admin website calls API service with admin role checks.

## 4. Database

PostgreSQL 16 with extensions:
- `pgcrypto` for UUID generation.
- `pgvector` for vector similarity search.

Prisma ORM with migrations.

## 5. AI Agent Implementation

### 5.1 Skills
- `onboarding`
- `nutrition`
- `fitness`
- `food_vision`
- `coach`
- `marketplace`

### 5.2 Orchestrator pseudocode

```typescript
async function handleChat(userId: string, input: ChatInput) {
  const skill = await classifyIntent(input.message, input.photo ? 'food_vision' : null);
  const context = await buildContext(userId, skill);
  const toolResults = await executeTools(skill, input, context);
  const prompt = buildPrompt(skill, context, toolResults, input);
  const response = await callLLM(skill.allowedModels, prompt);
  const safe = await safetyCheck(response);
  await saveChat(userId, input, safe);
  await updateMemory(userId, safe);
  await auditLog(userId, skill, response);
  return safe;
}
```

### 5.3 Memory
- Redis: short-term chat context.
- PostgreSQL: user_facts, chat_messages.
- pgvector: knowledge chunks + vectorized user memory.

## 6. Security Implementation

- All API routes protected by JWT.
- Rate limiting: 100 req/min per user, 20 AI req/min.
- File uploads: 10MB max, image only, scanned on upload.
- AI proxy: backend-only API keys, max tokens, cost caps.
- Stripe webhooks: signature verification.
- Secrets: environment variables, rotated on deploy.

## 7. Scaling

- Stateless services horizontally scaled.
- Redis cluster for sessions/cache.
- PostgreSQL read replicas for stats/analytics.
- BullMQ workers scaled independently.
- CDN for static assets.

## 8. Deployment

- Docker images built in CI.
- Compose stack on DO droplet.
- Nginx reverse proxy + SSL.
- PM2 for Node.js process management.
- Blue-green deployment for zero downtime.
