# build
FROM node:20 AS build
WORKDIR /app

# скопировать именно package.json и package-lock.json фронта
COPY package*.json ./
RUN npm ci --include=dev

# скопировать код фронта
COPY . .

RUN npm run build

# serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
