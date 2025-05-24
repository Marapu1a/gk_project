import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import dotenv from 'dotenv'

import authRoutes from './routes/auth'
import userRoutes from './routes/users'

dotenv.config()

const app = Fastify()

app.register(cors, { origin: true, credentials: true })
app.register(cookie)

app.register(authRoutes, { prefix: '/auth' })
app.register(userRoutes, { prefix: '/users' })

app.get('/ping', async () => ({ message: 'pong from fastify' }))

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 Server running on http://localhost:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
