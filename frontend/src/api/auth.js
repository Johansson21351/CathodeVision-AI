// src/api/auth.js — เชื่อมกับ backend จริง (register, login, /me, forgot-password)
import { apiFetch, setToken, getToken } from './client'

const USERNAME_KEY = 'auth_username'

export async function register(username, email, password, personalKey) {
  try {
    await apiFetch('/register', {
      method: 'POST',
      body: { username, email, password, personal_key: personalKey },
    })
    return { success: true }
  } catch (e) {
    return { success: false, reason: e.message }
  }
}

export async function login(username, password) {
  try {
    const data = await apiFetch('/login', { method: 'POST', body: { username, password } })
    setToken(data.token)
    localStorage.setItem(USERNAME_KEY, data.username)
    return { success: true }
  } catch (e) {
    return { success: false, reason: e.message }
  }
}

export function logout() {
  setToken(null)
  localStorage.removeItem(USERNAME_KEY)
}

export function currentUser() {
  return getToken() ? localStorage.getItem(USERNAME_KEY) : null
}

export function isAuthenticated() {
  return !!getToken()
}

export async function fetchMe() {
  return apiFetch('/me')
}

export async function forgotPassword(email) {
  try {
    const data = await apiFetch('/forgot-password', { method: 'POST', body: { email } })
    return { success: true, message: data.message }
  } catch (e) {
    return { success: false, reason: e.message }
  }
}

export async function resetPassword(email, password, personalKey) {
  try {
    const data = await apiFetch('/reset-password', {
      method: 'POST',
      body: { email, password, personal_key: personalKey },
    })
    return { success: true, message: data.message }
  } catch (e) {
    return { success: false, reason: e.message }
  }
}

export default {
  register,
  login,
  logout,
  currentUser,
  isAuthenticated,
  fetchMe,
  forgotPassword,
  resetPassword,
}