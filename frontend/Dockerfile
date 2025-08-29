# build
FROM node:20 AS build
WORKDIR /app/frontend

# ставим dev-зависимости именно фронта
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# код и env (если нужен)
COPY . .
# если .env лежит в ./frontend — он уже скопирован; VITE_* попадут в билд

RUN npm run build

# serve
FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY ./deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
