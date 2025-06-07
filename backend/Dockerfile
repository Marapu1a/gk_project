# backend/Dockerfile

FROM node:18-alpine

WORKDIR /app

# Копируем только package.json и lock
COPY package*.json ./

# Скопировать schema до npm install, чтобы postinstall сработал
COPY prisma ./prisma

# Устанавливаем зависимости
RUN npm install

# Копируем остальное (весь код)
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
