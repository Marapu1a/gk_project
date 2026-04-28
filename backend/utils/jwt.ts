import jwt, { SignOptions } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET is required in production')
}

const jwtSecret = JWT_SECRET || 'dev_secret'

export function signJwt(payload: object, expiresIn: SignOptions['expiresIn'] = '7d') {
  const options: SignOptions = { expiresIn }
  return jwt.sign(payload, jwtSecret, options)
}

export function verifyJwt<T = any>(token: string): T | null {
  try {
    return jwt.verify(token, jwtSecret) as T
  } catch {
    return null
  }
}
