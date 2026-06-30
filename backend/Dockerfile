FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma

# Разделено: меньше пиковая память + видно в логе, какой шаг падает.
# --maxsockets/--no-audit/--no-fund снижают параллелизм и расход памяти npm.
# --include=dev форсирует devDependencies (prisma, typescript) даже при NODE_ENV=production в окружении VPS.
RUN npm ci --include=dev --no-audit --no-fund --maxsockets=1
# Локальный бинарник напрямую (без npx) — npx иначе дёргает npm-реестр и ловит ETIMEDOUT на этом VPS.
RUN ./node_modules/.bin/prisma generate

FROM deps AS build
WORKDIR /app

COPY . .

ENV NODE_ENV=production

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache postgresql-client

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package*.json ./

EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/server.js"]
