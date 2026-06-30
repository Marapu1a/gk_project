# build
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
# --include=dev: vite и прочие build-инструменты лежат в devDependencies,
# а на VPS при сборке активен NODE_ENV=production (иначе npm ci их пропускает).
RUN npm ci --include=dev
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
