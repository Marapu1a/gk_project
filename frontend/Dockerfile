# build
FROM node:20 AS build
WORKDIR /app

# скопировать именно файлы фронта
COPY package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci --include=dev

# теперь копируем весь фронтовый код
COPY . .

RUN npm run build

# serve
FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY ./deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
