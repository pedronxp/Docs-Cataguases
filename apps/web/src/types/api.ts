import type { StatusPortaria } from './domain'

export interface LoginRequest { email: string; password: string }
export interface LoginResponse { token: string; usuario: import('./domain').Usuario }

export interface CriarPortariaRequest {
    titulo: string; modeloId: string; formData: Record<string, any>
}
export interface SubmeterPortariaRequest { portariaId: string; docxEditadoBase64?: string }
export interface AprovarPortariaRequest { portariaId: string; observacao?: string }
export interface PublicarPortariaRequest { portariaId: string; hashAssinatura: string }

export interface PaginatedResponse<T> {
    data: T[]; total: number; page: number; pageSize: number; totalPages: number
}
export interface ListQueryParams {
    page?: number; pageSize?: number; busca?: string; status?: StatusPortaria
    secretariaId?: string; setorId?: string; dataInicio?: string; dataFim?: string
}
