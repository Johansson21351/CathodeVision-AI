// src/api/inspect.js — อัปโหลดรูปให้ backend ตรวจตำหนิ (POST /inspect)
import { apiFetch, getToken } from './client'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export async function inspectImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  return apiFetch('/inspect', { method: 'POST', body: formData, isFormData: true })
}

export function listInspections(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString()
  return apiFetch(`/inspections${qs ? `?${qs}` : ''}`)
}

export function getDefectTypes() {
  return apiFetch('/inspections/defect-types')
}

export function getModelConfig() {
  return apiFetch('/model-config')
}

// <img>/<a> tags can't send an Authorization header, so the image route also
// accepts the token as a query param (see backend/auth.py token_required).
export function getInspectionImageUrl(id) {
  const token = getToken()
  return `${BASE_URL}/inspections/${id}/image?token=${encodeURIComponent(token || '')}`
}

export function getDashboard() {
  return apiFetch('/dashboard')
}

export function getHoldRecommendation() {
  return apiFetch('/inspections/hold-recommendation', { method: 'POST' })
}

export function reviewInspection(id, decision, correctedType, note) {
  const body = { decision }
  if (correctedType) body.corrected_type = correctedType
  if (note) body.note = note
  return apiFetch(`/inspections/${id}/review`, { method: 'POST', body })
}
