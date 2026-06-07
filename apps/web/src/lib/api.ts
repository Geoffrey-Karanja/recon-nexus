import axios from 'axios'
import type { Scan } from '../types'

const api = axios.create({ baseURL: '/api' })

export const createScan = (target: string, profile: string) =>
  api.post<{ scanId: string; status: string }>('/scans', { target, profile })

export const getScans = () => api.get<Scan[]>('/scans')

export const getScan = (id: string) => api.get<Scan>(`/scans/${id}`)
