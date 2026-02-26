import axios, { type InternalAxiosRequestConfig, type AxiosResponse, AxiosError } from 'axios'
import { useAuthStore } from '@/store/auth.store'

const api = axios.create({
    baseURL: (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json',
    },
})

// Interceptador para adicionar token de autenticação
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})


// Interceptador para tratar erros globais (ex: 401)
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().clearSession()
            // window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export default api
