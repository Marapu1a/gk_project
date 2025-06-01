import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import dotenv from 'dotenv'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { applicationRoutes } from './routes/applications'
import { ceuRoutes } from './routes/ceu'
import { certificateRoutes } from './routes/certificates'
import { groupRoutes } from './routes/groups'
import { mentorshipRoutes } from './routes/mentorship'

dotenv.config()

const app = Fastify()

app.register(cors, {
  origin: true,
  credentials: true,
})

app.register(cookie)
app.register(authRoutes)
app.register(userRoutes)
app.register(applicationRoutes)
app.register(ceuRoutes)
app.register(certificateRoutes)
app.register(groupRoutes)
app.register(mentorshipRoutes)

app.get('/', async () => ({ ok: true }))

const PORT = process.env.PORT || 3000

app.listen({ port: +PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`🚀 Server listening at ${address}`)
})
