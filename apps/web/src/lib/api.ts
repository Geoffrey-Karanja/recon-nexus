import axios from 'axios'
import type { Scan } from '../types'

const api = axios.create({ baseURL: '/api', withCredentials: true })

export const createScan = (target: string, profile: string) =>
  api.post<{ scanId: string; status: string }>('/scans', { target, profile })

export const getScans = () => api.get<Scan[]>('/scans')

export const getScan = (id: string) => api.get<Scan>(`/scans/${id}`)

export const cancelScan = (id: string) =>
  api.post(`/scans/${id}/cancel`)

export const deleteScan = (id: string) =>
  api.delete(`/scans/${id}`)
