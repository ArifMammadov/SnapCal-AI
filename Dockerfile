FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm -r build

FROM base AS api
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=build /app/packages/database/prisma ./packages/database/prisma
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]

FROM base AS ai-agent
WORKDIR /app
COPY --from=build /app/apps/ai-agent/dist ./dist
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/ai-agent/node_modules ./apps/ai-agent/node_modules
COPY --from=build /app/packages/database/node_modules ./packages/database/node_modules
ENV NODE_ENV=production
EXPOSE 4001
CMD ["node", "dist/index.js"]

FROM base AS telegram-bot
WORKDIR /app
COPY --from=build /app/apps/telegram-bot/dist ./dist
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/telegram-bot/node_modules ./apps/telegram-bot/node_modules
COPY --from=build /app/packages/database/node_modules ./packages/database/node_modules
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]

FROM nginx:alpine AS mobile-static
COPY --from=build /app/apps/mobile/dist /usr/share/nginx/html
COPY infra/nginx/mobile.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

FROM nginx:alpine AS admin-static
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
COPY infra/nginx/admin.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
