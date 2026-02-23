import axios, { type InternalAxiosRequestConfig, type AxiosResponse, AxiosError } from 'axios'

const api = axios.create({
    baseURL: (import.meta as any).env.VITE_API_URL || 'http://localhost:3001',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Interceptador para adicionar token de autenticação
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
            // Limpar estado local se o servidor rejeitar o token
            localStorage.removeItem('auth-token')
            // Opcional: window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export default api
