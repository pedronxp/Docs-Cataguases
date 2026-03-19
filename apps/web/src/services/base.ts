import api from '../lib/api'
import type { AxiosInstance } from 'axios'

export const httpClient: AxiosInstance = api

export class BaseApiService {
    public http: AxiosInstance
    public basePath: string

    constructor(http: AxiosInstance = httpClient, basePath: string = '') {
        this.http = http
        this.basePath = basePath
    }

    protected url(path: string): string {
        const normalizedBase = this.basePath.replace(/\/+$/, '')
        const normalizedPath = path.startsWith('/') ? path : `/${path}`
        return `${normalizedBase}${normalizedPath}`
    }
}
