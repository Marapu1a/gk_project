FROM node:20 AS build
WORKDIR /app

# ставим зависимости именно фронта
COPY package*.json ./
RUN npm install --include=dev

# остальной код
COPY . .

# билд
RUN npm run build

# serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
