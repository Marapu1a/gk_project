import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import dotenv from 'dotenv'

import authRoutes from './routes/auth'
// ⚠️ если `meRoutes` ещё не реализован — можно временно закомментить
// import meRoutes from './routes/users'

dotenv.config()

const app = Fastify()

app.register(cors, {
  origin: true,
  credentials: true,
})

app.register(cookie)

// ✅ Роуты
app.register(authRoutes)
// app.register(meRoutes) // ← раскомментируешь позже

app.get('/ping', async () => {
  return { message: 'pong from fastify' }
})

const start = async () => {
  try {
    const PORT = Number(process.env.PORT) || 3000
    await app.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`🚀 Fastify server is running on http://localhost:${PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
