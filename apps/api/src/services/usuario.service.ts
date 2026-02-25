import prisma from '@/lib/prisma'
import { Result, ok, err } from '@/lib/result'
import bcrypt from 'bcryptjs'

export class UsuarioService {
    /**
     * Registra um novo usuário com papel PENDENTE.
     */
    static async registrar(data: {
        name: string;
        email: string;
        password: string;
        cpf?: string;
    }): Promise<Result<any>> {
        try {
            // Verifica se o e-mail já existe
            const existeEmail = await prisma.user.findUnique({
                where: { email: data.email }
            })
            if (existeEmail) return err('E-mail já cadastrado.')

            // Verifica se o CPF já existe, APENAS se o CPF foi fornecido
            if (data.cpf) {
                const existeCpf = await prisma.user.findFirst({
                    where: { cpf: data.cpf }
                })
                if (existeCpf) return err('CPF já cadastrado.')
            }

            // Gera o hash da senha
            const hashedPassword = await bcrypt.hash(data.password, 10)

            const usuario = await prisma.user.create({
                data: {
                    name: data.name,
                    email: data.email,
                    password: hashedPassword,
                    cpf: data.cpf,
                    role: 'PENDENTE',
                    ativo: false, // Só fica ativo após aprovação admin ou onboarding completo
                }
            })

            const { password, ...userWithoutPassword } = usuario
            return ok(userWithoutPassword)
        } catch (error) {
            console.error('Erro ao registrar usuário:', error)
            return err('Falha ao realizar cadastro.')
        }
    }

    /**
     * Fluxo de Onboarding: Define a lotação do servidor.
     */
    static async completarOnboarding(id: string, data: {
        secretariaId: string;
        setorId?: string;
    }): Promise<Result<any>> {
        try {
            const usuario = await prisma.user.update({
                where: { id },
                data: {
                    secretariaId: data.secretariaId,
                    setorId: data.setorId || null,
                    // Ao completar onboarding, ainda pode precisar de aprovação admin
                    // mas definimos como OPERADOR por padrão se a política permitir
                    role: 'OPERADOR',
                    ativo: true // Ativamos após definir lotação
                }
            })

            const { password, ...userWithoutPassword } = usuario
            return ok(userWithoutPassword)
        } catch (error) {
            console.error('Erro no onboarding:', error)
            return err('Falha ao atualizar lotação do servidor.')
        }
    }

    /**
     * Gestão Admin: Atualiza role, status e permissões extras.
     */
    static async atualizarDadosAdmin(id: string, data: {
        role?: string;
        ativo?: boolean;
        permissoesExtra?: string[];
    }): Promise<Result<any>> {
        try {
            const usuario = await prisma.user.update({
                where: { id },
                data: {
                    role: data.role as any,
                    ativo: data.ativo,
                    permissoesExtra: data.permissoesExtra
                }
            })

            const { password, ...userWithoutPassword } = usuario
            return ok(userWithoutPassword)
        } catch (error) {
            console.error('Erro na gestão admin de usuário:', error)
            return err('Falha ao atualizar dados do usuário.')
        }
    }
}
