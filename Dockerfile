FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm -r build
RUN pnpm --filter @snapcal/database exec prisma generate

FROM base AS api
WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages/database/package.json ./packages/database/package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=build /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/database/prisma ./packages/database/prisma
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]

FROM base AS ai-agent
WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/ai-agent/package.json ./apps/ai-agent/package.json
COPY --from=build /app/packages/database/package.json ./packages/database/package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/ai-agent/node_modules ./apps/ai-agent/node_modules
COPY --from=build /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=build /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/apps/ai-agent/dist ./apps/ai-agent/dist
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/database/prisma ./packages/database/prisma
ENV NODE_ENV=production
EXPOSE 4001
CMD ["node", "apps/ai-agent/dist/index.js"]

FROM base AS telegram-bot
WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/telegram-bot/package.json ./apps/telegram-bot/package.json
COPY --from=build /app/packages/database/package.json ./packages/database/package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/telegram-bot/node_modules ./apps/telegram-bot/node_modules
COPY --from=build /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=build /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/apps/telegram-bot/dist ./apps/telegram-bot/dist
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/database/prisma ./packages/database/prisma
ENV NODE_ENV=production
CMD ["node", "apps/telegram-bot/dist/index.js"]

FROM nginx:alpine AS mobile-static
COPY --from=build /app/apps/mobile/dist /usr/share/nginx/html
COPY infra/nginx/mobile.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

FROM nginx:alpine AS admin-static
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
COPY infra/nginx/admin.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
