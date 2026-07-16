FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma

# Зеркало npm: на VPS/в РФ registry.npmjs.org может отдавать ETIMEDOUT
# (npm при этом завершается с exit 0, оставляя битый node_modules без .bin).
ARG NPM_REGISTRY=https://registry.npmmirror.com

# --ignore-scripts: пропускаем postinstall (его делает отдельный prisma generate ниже).
RUN npm ci --include=dev --ignore-scripts --no-audit --no-fund --maxsockets=1 --registry=$NPM_REGISTRY
# Локальный бинарник напрямую (без npx, чтобы не дёргать сеть).
RUN ./node_modules/.bin/prisma generate

FROM deps AS build
WORKDIR /app

COPY . .

ENV NODE_ENV=production

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache postgresql-client poppler-utils

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package*.json ./

EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/server.js"]
