import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const sqlTabelas = `
-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "permissoesExtra" TEXT[],
    "secretariaId" TEXT,
    "setorId" TEXT
);

-- Tabela de Modelos de Documento
CREATE TABLE IF NOT EXISTS "ModeloDocumento" (
    "id" TEXT PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "secretariaId" TEXT,
    "docxTemplateUrl" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true
);

-- Tabela de Variáveis do Modelo
CREATE TABLE IF NOT EXISTS "ModeloVariavel" (
    "id" TEXT PRIMARY KEY,
    "modeloId" TEXT NOT NULL REFERENCES "ModeloDocumento"("id") ON DELETE CASCADE,
    "chave" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'texto',
    "opcoes" TEXT[],
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0
);

-- Tabela de Portarias
CREATE TABLE IF NOT EXISTS "Portaria" (
    "id" TEXT PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "numeroOficial" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "criadoPorId" TEXT NOT NULL REFERENCES "User"("id"),
    "secretariaId" TEXT NOT NULL,
    "setorId" TEXT,
    "modeloId" TEXT NOT NULL REFERENCES "ModeloDocumento"("id"),
    "pdfUrl" TEXT,
    "docxRascunhoUrl" TEXT,
    "hashIntegridade" TEXT UNIQUE,
    "assinadoEm" TIMESTAMP,
    "assinadoPorId" TEXT,
    "formData" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Livro de Numeração
CREATE TABLE IF NOT EXISTS "LivroNumeracao" (
    "id" TEXT PRIMARY KEY,
    "secretariaId" TEXT NOT NULL,
    "setorId" TEXT,
    "ano" INTEGER NOT NULL,
    "proximoNumero" INTEGER NOT NULL DEFAULT 1,
    "formato" TEXT NOT NULL,
    UNIQUE("secretariaId", "setorId", "ano")
);

-- Tabela de Feed de Atividade
CREATE TABLE IF NOT EXISTS "FeedAtividade" (
    "id" TEXT PRIMARY KEY,
    "tipoEvento" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "portariaId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "secretariaId" TEXT NOT NULL,
    "setorId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Variáveis de Sistema
CREATE TABLE IF NOT EXISTS "VariavelSistema" (
    "id" TEXT PRIMARY KEY,
    "chave" TEXT UNIQUE NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "resolvidaAutomaticamente" BOOLEAN NOT NULL DEFAULT false
);
`

async function setup() {
    const projectRef = 'hmzaegzgfyupiitfaagc'

    console.log('Iniciando tentativa final de conexão via Pooler...')
    const client = new Client({
        host: 'aws-1-sa-east-1.pooler.supabase.com',
        port: 6543,
        user: `postgres.${projectRef}`,
        password: 'Controlpref260570@',
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    })

    try {
        await client.connect()
        console.log('✅ Conectado com sucesso!')

        console.log('🔨 Verificando/Criando tabelas...')
        await client.query(sqlTabelas)
        console.log('✅ Estrutura de tabelas pronta.')

        console.log('🌱 Semeando dados iniciais...')

        // Admin
        // Usando aspas duplas para colunas camelCase
        await client.query(`
            INSERT INTO "User" (id, name, email, password, role, ativo, "secretariaId")
            VALUES ('admin-id', 'Admin Geral', 'admin@cataguases.mg.gov.br', '123456', 'ADMIN_GERAL', true, 'sec-admin')
            ON CONFLICT (email) DO NOTHING;
        `)

        // Modelos de Documento
        await client.query(`
            INSERT INTO "ModeloDocumento" (id, nome, descricao, "docxTemplateUrl", ativo)
            VALUES 
            ('cl9v0e1-nomeacao', 'Portaria de Nomeação', 'Modelo padrão para nomeação de servidores', 'https://hmzaegzgfyupiitfaagc.supabase.co/storage/v1/object/public/templates/nomeacao.docx', true),
            ('cl9v0e2-exoneracao', 'Portaria de Exoneração', 'Modelo padrão para exoneração de servidores', 'https://hmzaegzgfyupiitfaagc.supabase.co/storage/v1/object/public/templates/exoneracao.docx', true)
            ON CONFLICT (id) DO NOTHING;
        `)

        console.log('🚀 Setup concluído com sucesso!')
    } catch (err: any) {
        console.error('❌ Erro durante o setup:', err.message)
    } finally {
        await client.end()
    }
}

setup()
