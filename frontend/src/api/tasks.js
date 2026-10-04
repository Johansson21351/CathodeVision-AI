// src/api/tasks.js — CRUD งาน + จัดหมวดด้วย AI
// หมายเหตุ: ตอนนี้ยังไม่มีหน้า UI ที่ใช้ไฟล์นี้ในโปรเจกต์ (ดูข้อความสรุปท้ายคำตอบ)
import { apiFetch } from './client'

export function listTasks(params = {}) {
  const qs = new URLSearchParams(params).toString()
  return apiFetch(`/tasks${qs ? `?${qs}` : ''}`)
}

export function createTask(title) {
  return apiFetch('/tasks', { method: 'POST', body: { title } })
}

export function getTask(id) {
  return apiFetch(`/tasks/${id}`)
}

export function updateTask(id, patch) {
  return apiFetch(`/tasks/${id}`, { method: 'PUT', body: patch })
}

export function deleteTask(id) {
  return apiFetch(`/tasks/${id}`, { method: 'DELETE' })
}

export function categorizeTask(id) {
  return apiFetch(`/tasks/${id}/categorize`, { method: 'POST' })
}