import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession, getAuthUser } from '@/lib/auth'
import { buildAbility } from '@/lib/ability'
import { subject } from '@casl/ability'
import { StorageService } from '@/services/storage.service'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const usuario = await getAuthUser()

        if (!usuario) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 401 }
            )
        }

        const { id } = await params

        const portaria = await prisma.portaria.findUnique({
            where: { id },
            include: {
                criadoPor: {
                    select: { name: true, email: true },
                },
                secretaria: {
                    select: { nome: true, sigla: true },
                },
                modelo: {
                    select: {
                        id: true,
                        nome: true,
                        conteudoHtml: true,
                        variaveis: {
                            orderBy: { ordem: 'asc' },
                            select: { chave: true, label: true, tipo: true, ordem: true }
                        }
                    }
                },
                atividades: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        autor: { select: { name: true, username: true } }
                    }
                }
            },
        })

        if (!portaria) {
            return NextResponse.json(
                { success: false, error: 'Portaria não encontrada' },
                { status: 404 }
            )
        }

        const ability = buildAbility(usuario as any)
        if (!ability.can('ler', subject('Portaria', portaria as any))) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 403 }
            )
        }

        // ── Resolve variáveis de sistema para o preview no frontend ──────────
        const sysVarsPreview: Record<string, string> = {}
        try {
            // 1. SYS_GESTAO_DADOS → prefeito, vice, gabinete
            const gestaoRow = await prisma.variavelSistema.findUnique({ where: { chave: 'SYS_GESTAO_DADOS' } })
            if (gestaoRow?.valor) {
                const dados = JSON.parse(gestaoRow.valor)
                const gestao = Array.isArray(dados) ? dados[0] : dados
                if (gestao?.prefeito)      sysVarsPreview['SYS_PREFEITO']      = gestao.prefeito
                if (gestao?.vicePrefeito)  sysVarsPreview['SYS_VICE_NOME']     = gestao.vicePrefeito
                if (gestao?.chefeGabinete) sysVarsPreview['SYS_GABINETE_NOME'] = gestao.chefeGabinete
                // secretarios: { ADM: 'João', SMS: 'Maria', ... }
                if (gestao?.secretarios && typeof gestao.secretarios === 'object') {
                    for (const [sigla, nome] of Object.entries(gestao.secretarios)) {
                        sysVarsPreview[`SYS_SEC_${sigla}_NOME`] = String(nome)
                    }
                }
            }

            // 2. Variáveis avulsas na tabela (SYS_SEC_*_NOME e outras)
            const varsAvulsas = await prisma.variavelSistema.findMany({
                where: { chave: { not: 'SYS_GESTAO_DADOS' } },
                select: { chave: true, valor: true },
            })
            for (const v of varsAvulsas) {
                if (!sysVarsPreview[v.chave]) sysVarsPreview[v.chave] = v.valor
            }
        } catch { /* variáveis de sistema não críticas para o GET */ }

        // ── Gera URLs assinadas para que o frontend exiba/baixe sem proxy ──────
        let pdfSignedUrl: string | null = null
        let docxSignedUrl: string | null = null
        try {
            if (portaria.pdfUrl) {
                pdfSignedUrl = await StorageService.getSignedUrl(portaria.pdfUrl, 3600)
            }
            if ((portaria as any).docxRascunhoUrl) {
                docxSignedUrl = await StorageService.getSignedUrl((portaria as any).docxRascunhoUrl, 3600)
            }
        } catch { /* URLs assinadas não críticas */ }

        return NextResponse.json({
            success: true,
            data: { ...portaria, sysVarsPreview, pdfSignedUrl, docxSignedUrl },
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Erro ao buscar portaria' },
            { status: 500 }
        )
    }
}

// Campos que o autor pode editar enquanto a portaria está em rascunho ou correção
const CAMPOS_EDITAVEIS_AUTOR = ['titulo', 'descricao', 'formData', 'docxRascunhoUrl'] as const
// Campos extras que o admin pode atualizar (ex: subir URL do PDF manualmente)
const CAMPOS_EDITAVEIS_ADMIN = [...CAMPOS_EDITAVEIS_AUTOR, 'pdfUrl', 'status'] as const

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const role = (session as any).role as string
        const userId = (session as any).id as string

        const portaria = await prisma.portaria.findUnique({ where: { id } })
        if (!portaria) {
            return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        }

        // Apenas o autor edita a própria portaria (salvo admin)
        if (role !== 'ADMIN_GERAL' && portaria.criadoPorId !== userId) {
            return NextResponse.json({ success: false, error: 'Sem permissão para editar esta portaria' }, { status: 403 })
        }

        // Só é editável em estados abertos
        const estadosEditaveis = ['RASCUNHO', 'CORRECAO_NECESSARIA']
        if (role !== 'ADMIN_GERAL' && !estadosEditaveis.includes(portaria.status)) {
            return NextResponse.json({ success: false, error: `Portaria não pode ser editada no status "${portaria.status}"` }, { status: 400 })
        }

        // Whitelist de campos por role
        const camposPermitidos = (role === 'ADMIN_GERAL' ? CAMPOS_EDITAVEIS_ADMIN : CAMPOS_EDITAVEIS_AUTOR) as readonly string[]
        const dadosFiltrados = Object.fromEntries(
            Object.entries(body).filter(([key]) => camposPermitidos.includes(key))
        )

        if (Object.keys(dadosFiltrados).length === 0) {
            return NextResponse.json({ success: false, error: 'Nenhum campo válido para atualizar' }, { status: 400 })
        }

        // Se formData foi alterado, invalida o DOCX em cache para forçar regeneração
        const dadosParaSalvar = { ...dadosFiltrados }
        if (dadosFiltrados.formData !== undefined) {
            dadosParaSalvar.docxRascunhoUrl = null
        }

        const atualizada = await prisma.portaria.update({
            where: { id },
            data: dadosParaSalvar,
        })

        // Registra log de edição se formData foi alterado
        if (dadosFiltrados.formData !== undefined) {
            await prisma.feedAtividade.create({
                data: {
                    tipoEvento: 'FORMULARIO_SALVO',
                    mensagem: `Rascunho salvo por ${(session as any).name || (session as any).username || 'usuário'}`,
                    portariaId: id,
                    autorId: userId,
                    secretariaId: portaria.secretariaId,
                    setorId: portaria.setorId ?? null,
                    metadata: { campos: Object.keys(dadosFiltrados.formData as object).join(', ') },
                }
            }).catch(() => {/* log não crítico */})
        }

        return NextResponse.json({ success: true, data: atualizada })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Erro ao atualizar portaria' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const usuario = await getAuthUser()

        if (!usuario) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 401 }
            )
        }

        const ability = buildAbility(usuario as any)
        if (!ability.can('deletar', 'Portaria')) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 403 }
            )
        }

        const { id } = await params
        let motivo: string | undefined = undefined

        try {
            const body = await request.json()
            motivo = body.motivo
        } catch (e) {
            // Corpo pode estar vazio
        }

        const portaria = await prisma.portaria.findUnique({ where: { id }, select: { status: true, numeroOficial: true } })
        if (!portaria) {
            return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        }

        const isAdminGeral = usuario.role === 'ADMIN_GERAL'
        const isRascunhoOuFalha = ['RASCUNHO', 'FALHA_PROCESSAMENTO'].includes(portaria.status)

        // Se não for Admin Geral, só pode deletar rascunho ou falha
        if (!isAdminGeral && !isRascunhoOuFalha) {
            return NextResponse.json(
                { success: false, error: `Portarias com status "${portaria.status}" não podem ser excluídas. Documentos publicados ou em fluxo são registros oficiais.` },
                { status: 422 }
            )
        }

        // Se for Admin Geral e quiser deletar uma publicada, precisa de motivo
        if (isAdminGeral && !isRascunhoOuFalha && !motivo) {
            return NextResponse.json(
                { success: false, error: `Motivo da exclusão é obrigatório para remover documentos já tramitados ou publicados.` },
                { status: 400 }
            )
        }

        // Remove do banco (ou altera status para EXCLUIDA/ARQUIVADO se preferir não deletar fisicamente, mas o usuário pediu "deletar". Vamos deletar fisicamente e registrar no log se não for deleção física. Ops, se deletar fisicamente, o log morre se tiver cascade, mas o feed não apaga porque a relation nulls out se não tiver cascade? No schema: `portaria Portaria? @relation(fields: [portariaId], references: [id])`. Ao deletar a portaria, vai dar erro de chave estrangeira com FeedAtividade a menos que tenha onDelete: Cascade.
        // No schema não há Cascade no FeedAtividade em relação a portaria: `portaria Portaria? @relation(fields: [portariaId], references: [id])`. E portariaId é opcional? Sim, `portariaId String?`. Mas no Prisma o default é Restrict. O schema não tem `onDelete: SetNull`.

        // Portanto, melhor fazer a exclusão na mão do feed ou adicionar o motivo.
        // O usuário pediu: "ainda assim tem que colocar o motivo que feio deletado."

        // Deletando fisicamente em transação para apagar feeds associados, exceto o de deleção.
        // Ou salvando log global e apagando.
        await prisma.$transaction(async (tx) => {
            if (motivo) {
                // Se foi com motivo, cria um registro de FeedAtividade global solto (portariaId null)
                await tx.feedAtividade.create({
                    data: {
                        tipoEvento: 'EXCLUSAO',
                        mensagem: `Portaria ${portaria.numeroOficial || id} foi excluída pelo Administrador. Motivo: ${motivo}`,
                        autorId: usuario.id,
                        metadata: { removido: portaria.numeroOficial || id, motivo }
                    }
                })
            }

            // Removemos as atividades referentes a essa portaria (porque o Prisma restringe a deleção)
            await tx.feedAtividade.deleteMany({
                where: { portariaId: id }
            })

            // Remove da fila de jornal se houver
            await tx.jornalQueue.deleteMany({
                where: { portariaId: id }
            })

            await tx.portaria.delete({ where: { id } })
        })

        return NextResponse.json({ success: true, message: 'Portaria excluída com sucesso' })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao excluir portaria' },
            { status: 500 }
        )
    }
}
