// src/api/client.js — เรียก backend Flask ผ่าน fetch ตัวเดียว ใช้ร่วมกันทุกที่
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const TOKEN_KEY = 'auth_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

/**
 * เรียก backend หนึ่งครั้ง
 * @param {string} path เช่น "/login", "/tasks/5"
 * @param {object} options { method, body, isFormData }
 */
export async function apiFetch(path, { method = 'GET', body, isFormData = false } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let payload = body
  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: payload,
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    // response ไม่มี body (เช่น 204) — ปล่อยเป็น null
  }

  if (!res.ok) {
    const message = (data && data.error) || `เกิดข้อผิดพลาด (${res.status})`
    const err = new Error(message)
    err.status = res.status
    throw err
  }

  return data
}