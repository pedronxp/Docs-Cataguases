import axios, { type InternalAxiosRequestConfig, type AxiosResponse, AxiosError } from 'axios'

const api = axios.create({
    baseURL: (import.meta as any).env.VITE_API_URL || 'http://localhost:3001',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Interceptador para adicionar token de autenticação se necessário (caso não use apenas cookies)
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth-token')
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
            // Redirecionar para login ou limpar estado local
            localStorage.removeItem('auth-token')
            // window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export default api
