// src/api/auth.ts
import { api } from './axios'

export interface RegisterData {
  email: string
  firstName: string
  lastName: string
  phone?: string
  password: string
}

export interface RegisterResponse {
  token: string
  user: {
    id: string
    email: string
    role: 'STUDENT' | 'ADMIN'
    fullName: string
  }
}

export interface LoginData {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: string
    email: string
    role: 'STUDENT' | 'ADMIN'
  }
  redirectTo: string
}

export const register = async (data: RegisterData): Promise<RegisterResponse> => {
  const res = await api.post('/auth/register', data)
  return res.data
}

export const login = async (data: LoginData): Promise<LoginResponse> => {
  const res = await api.post<LoginResponse>('/auth/login', data)
  return res.data
}
