# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci --omit=optional && npx prisma generate

FROM deps AS build
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package*.json ./
EXPOSE 3000
CMD ["sh","-c","npx prisma migrate deploy && node dist/server.js"]
