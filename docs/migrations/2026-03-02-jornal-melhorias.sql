-- ============================================================
-- Migration: Melhorias Jornal Dashboard
-- Aplicar em ordem no Supabase Dashboard > SQL Editor
-- ============================================================

-- ==========================
-- FASE 1 (já aplicada)
-- ==========================
-- Adicionar prioridade e metadados
ALTER TABLE "JornalQueue"
  ADD COLUMN IF NOT EXISTS "prioridade" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "metadados" JSONB NOT NULL DEFAULT '{}';

-- Indexes de performance
CREATE INDEX IF NOT EXISTS "JornalQueue_status_createdAt_idx"
  ON "JornalQueue"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "JornalQueue_id_createdAt_idx"
  ON "JornalQueue"("id", "createdAt");

CREATE INDEX IF NOT EXISTS "JornalQueue_tipoDocumento_status_createdAt_idx"
  ON "JornalQueue"("tipoDocumento", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "JornalQueue_status_prioridade_createdAt_idx"
  ON "JornalQueue"("status", "prioridade", "createdAt");

-- ==========================
-- FASE 2 (aplicar quando pronto)
-- portariaId opcional para multi-documento
-- ==========================
-- ALTER TABLE "JornalQueue" ALTER COLUMN "portariaId" DROP NOT NULL;

-- ==========================
-- FASE 3 (aplicar após Fase 2)
-- documentoId genérico + migração de dados
-- ==========================

-- 3a. Adicionar coluna documentoId
-- ALTER TABLE "JornalQueue" ADD COLUMN IF NOT EXISTS "documentoId" TEXT;

-- 3b. Index para busca por documento
-- CREATE INDEX IF NOT EXISTS "JornalQueue_documentoId_idx" ON "JornalQueue"("documentoId");

-- 3c. Migrar dados: copiar portariaId → documentoId para todos os existentes
-- UPDATE "JornalQueue"
-- SET "documentoId" = "portariaId"
-- WHERE "documentoId" IS NULL AND "portariaId" IS NOT NULL;

-- 3d. Tornar documentoId NOT NULL (após validar que todos os registros foram migrados)
-- ALTER TABLE "JornalQueue" ALTER COLUMN "documentoId" SET NOT NULL;
