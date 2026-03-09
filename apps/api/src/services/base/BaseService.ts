import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/result'
import type { Result } from '@/lib/result'
import type { PrismaClient } from '@prisma/client'

type Logger = Pick<Console, 'error' | 'warn' | 'info'>

export { ok, err }
export type { Result }

/**
 * BaseService — classe abstrata base para todos os services do backend.
 * Fornece: safeExec helper para try/catch padronizado, logger, acesso ao prisma.
 */
export abstract class BaseService {
    constructor(
        protected readonly name: string,
        protected readonly db: PrismaClient = prisma,
        protected readonly logger: Logger = console
    ) {}

    protected async safeExec<T>(
        fn: () => Promise<T>,
        errorMsg: string
    ): Promise<Result<T>> {
        try {
            return ok(await fn())
        } catch (e: any) {
            this.logger.error(`[${this.name}]`, errorMsg, e?.message)
            return err(e?.message || errorMsg)
        }
    }

    protected log(level: 'info' | 'warn' | 'error', msg: string, data?: any) {
        this.logger[level](`[${this.name}]`, msg, data ?? '')
    }
}
