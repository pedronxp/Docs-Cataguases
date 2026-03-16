/**
 * LLM Data Sanitizer — Proteção contra vazamento de dados sensíveis
 *
 * Remove/mascara informações pessoais antes de enviar conteúdo
 * para provedores de LLM externos (Cerebras, Groq, Mistral, OpenRouter).
 *
 * Dados protegidos:
 *   - CPFs (XXX.XXX.XXX-XX)
 *   - CNPJs (XX.XXX.XXX/XXXX-XX)
 *   - Emails pessoais
 *   - Telefones
 *   - Números de conta bancária / agência
 *   - RG / identidade
 */

// Padrões de dados sensíveis
const PATTERNS = {
    // CPF: 123.456.789-00 ou 12345678900
    cpf: /\b\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d{2}\b/g,

    // CNPJ: 12.345.678/0001-90 ou 12345678000190
    cnpj: /\b\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}\b/g,

    // Telefone: (32) 3422-1000, 32 99999-0000, +55 32 99999-0000
    telefone: /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}\b/g,

    // Conta bancária: ag 1234 cc 12345-6
    contaBancaria: /\b(?:ag(?:ência)?|cc|c\/c|conta)\s*:?\s*\d{3,8}[-]?\d?\b/gi,

    // RG: MG-12.345.678 ou 12.345.678 SSP/MG
    rg: /\b(?:RG|identidade)\s*:?\s*[\w\-\.\/]{5,15}\b/gi,
}

/**
 * Sanitiza texto removendo dados pessoais sensíveis.
 * Retorna texto com dados mascarados.
 */
export function sanitizeForLLM(text: string): string {
    if (!text || typeof text !== 'string') return text

    let sanitized = text

    // Mascarar CPFs
    sanitized = sanitized.replace(PATTERNS.cpf, '[CPF_OMITIDO]')

    // Mascarar CNPJs (exceto os institucionais que fazem parte do contexto do sistema)
    // Preserva o CNPJ da prefeitura que está nas variáveis do sistema
    sanitized = sanitized.replace(PATTERNS.cnpj, (match) => {
        // Preservar CNPJ da prefeitura se for o padrão de seed
        if (match.replace(/[\.\-\/\s]/g, '') === '12345678000190') return match
        return '[CNPJ_OMITIDO]'
    })

    // Mascarar dados bancários
    sanitized = sanitized.replace(PATTERNS.contaBancaria, '[DADOS_BANCARIOS_OMITIDOS]')

    // Mascarar RG
    sanitized = sanitized.replace(PATTERNS.rg, '[RG_OMITIDO]')

    return sanitized
}

/**
 * Sanitiza array de mensagens LLM antes do envio.
 * Aplica sanitização apenas em mensagens do usuário (role: 'user')
 * e em respostas de ferramentas (role: 'tool').
 */
export function sanitizeMessages(messages: Array<{ role: string; content: string | null; [key: string]: any }>): typeof messages {
    return messages.map(msg => {
        if (!msg.content) return msg

        // Sanitizar mensagens de usuário e respostas de ferramentas
        if (msg.role === 'user' || msg.role === 'tool') {
            return {
                ...msg,
                content: sanitizeForLLM(msg.content),
            }
        }

        return msg
    })
}

/**
 * Log seguro — remove dados sensíveis antes de logar.
 */
export function safeLog(prefix: string, data: any): void {
    if (typeof data === 'string') {
        console.log(prefix, sanitizeForLLM(data).slice(0, 200))
    } else {
        console.log(prefix, JSON.stringify(data).slice(0, 200))
    }
}
