import axios from 'axios'
import type { Scan } from '../types'
import { getToken } from './auth'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const createScan = (target: string, profile: string) =>
  api.post<{ scanId: string; status: string }>('/scans', { target, profile })

export const getScans = () => api.get<Scan[]>('/scans')
export const getScan = (id: string) => api.get<Scan>(`/scans/${id}`)
export const cancelScan = (id: string) => api.post(`/scans/${id}/cancel`)
export const deleteScan = (id: string) => api.delete(`/scans/${id}`)
