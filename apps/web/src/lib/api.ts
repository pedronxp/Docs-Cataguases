import axios, { type InternalAxiosRequestConfig, type AxiosResponse, AxiosError } from 'axios'
import { useAuthStore } from '@/store/auth.store'

function getApiBaseUrl(): string {
    const configured = ((import.meta as any).env.VITE_API_BASE_URL || '').trim()
    if (!configured || typeof window === 'undefined') return configured

    try {
        const configuredUrl = new URL(configured, window.location.origin)
        const localHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])
        const isLocalTarget = localHosts.has(configuredUrl.hostname)
        const isLocalPage = localHosts.has(window.location.hostname)
        const configuredPort = configuredUrl.port || (configuredUrl.protocol === 'https:' ? '443' : '80')

        if (isLocalTarget && !isLocalPage) return ''
        if (isLocalTarget && isLocalPage && configuredPort !== window.location.port && configuredPort !== '3000') {
            return ''
        }
    } catch {
        return configured
    }

    return configured.replace(/\/+$/, '')
}

const api = axios.create({
    baseURL: getApiBaseUrl(),
    withCredentials: true,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Garante envio de cookies HttpOnly em chamadas CORS.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    config.withCredentials = true
    return config
})


// Interceptador para tratar erros globais (ex: 401)
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        const isLoginRoute = error.config?.url?.includes('/api/auth/login')
        if (error.response?.status === 401 && !isLoginRoute) {
            useAuthStore.getState().clearSession()
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export default api
