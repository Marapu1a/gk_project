// src/utils/auth.ts

export const saveAuth = (token: string) => {
  localStorage.setItem('token', token)
}

export const getAuthToken = () => {
  return localStorage.getItem('token')
}

export const clearAuth = () => {
  localStorage.removeItem('token')
}
