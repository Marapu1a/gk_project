# build
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_SENTRY_DSN=
ARG VITE_SENTRY_ENVIRONMENT=production
ARG VITE_SENTRY_RELEASE=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_SENTRY_ENVIRONMENT=$VITE_SENTRY_ENVIRONMENT
ENV VITE_SENTRY_RELEASE=$VITE_SENTRY_RELEASE
# Лимит памяти node для сборки на маленьком VPS (тюнинг с сервера).
ENV NODE_OPTIONS="--max-old-space-size=768"

# Зеркало npm: на VPS/в РФ registry.npmjs.org может отдавать ETIMEDOUT.
ARG NPM_REGISTRY=https://registry.npmmirror.com

COPY package*.json ./
# --include=dev: vite и build-инструменты лежат в devDependencies.
RUN npm ci --include=dev --registry=$NPM_REGISTRY
COPY . .
RUN npm run build

# serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
