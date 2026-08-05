# SnapCal AI

AI-powered nutrition and fitness mobile web app.

## Quick start

```bash
# 1. Install pnpm
corepack enable

# 2. Install dependencies
pnpm install

# 3. Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/ai-agent/.env.example apps/ai-agent/.env
cp apps/telegram-bot/.env.example apps/telegram-bot/.env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/admin/.env.example apps/admin/.env

# 4. Start infrastructure
cd infra/docker
docker-compose up -d postgres redis

# 5. Apply database migrations
pnpm db:migrate

# 6. Start services
pnpm dev:api
pnpm dev:ai
pnpm dev:bot
pnpm dev:mobile
pnpm dev:admin
```

## Environments

| Env | Branch | URL |
|-----|--------|-----|
| Local | feature/* | http://localhost:5173 |
| Test | test | http://157.230.113.0:5175 |
| Staging | staging | http://157.230.113.0:5174 |
| Production | main | https://snapcal.health |

## Deployment

CI/CD is configured in `.github/workflows/ci-cd.yml`.
Required GitHub secrets:
- `DOCKER_REGISTRY`
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `SSH_PRIVATE_KEY`
