import jwt, { SignOptions } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'

export function signJwt(payload: object, expiresIn: SignOptions['expiresIn'] = '7d') {
  const options: SignOptions = { expiresIn }
  return jwt.sign(payload, JWT_SECRET, options)
}

export function verifyJwt<T = any>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T
  } catch {
    return null
  }
}
