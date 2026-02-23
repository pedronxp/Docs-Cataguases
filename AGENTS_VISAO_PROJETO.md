# AGENTS_VISAO_PROJETO.md — PLANEJAMENTO E REQUISITOS DO PRODUTO (PRD)
# Leia ANTES de iniciar qualquer desenvolvimento.
# Este documento define O QUE É o sistema "Doc's Cataguases", QUEM usa e POR QUE ele existe.

---

## 1. A VISÃO GERAL DO PRODUTO (O PROBLEMA E A SOLUÇÃO)
**O Problema Atual:** A Prefeitura de Cataguases (MG) sofre com a lentidão na criação e tramitação de documentos oficiais (Portarias, Decretos, Memorandos). O processo é manual (Word/Papel), sujeito a erros de digitação (CPFs errados, formatações quebradas), extravio de documentos e demora na assinatura do Prefeito ou Secretários.

**A Solução (Doc's Cataguases):** Um Sistema GovTech 100% web (Next.js/React) para automação, padronização e assinatura digital de documentos. O sistema garante que os documentos nasçam perfeitos (através de modelos dinâmicos), tramitem rapidamente e sejam validados publicamente pelo cidadão via QR Code/Hash curto.

---

## 2. QUEM SÃO OS USUÁRIOS? (PÚBLICO-ALVO)
O sistema possui 4 grandes perfis de acesso:

1. **O Servidor Administrativo (O "Criador"):**
   - *O que faz:* Entra no sistema, escolhe um "Modelo" (ex: Portaria de Nomeação), preenche um formulário rápido (CPF, Nome, Cargo) e gera o rascunho em PDF. Envia para assinatura.
   
2. **O Secretário / Prefeito (O "Assinante"):**
   - *O que faz:* Recebe dezenas de documentos prontos. Entra na aba "Aguardando Minha Assinatura", seleciona todos e assina digitalmente (em lote) digitando sua senha.

3. **O TI / Admin Geral (O "Configurador"):**
   - *O que faz:* Cria os Modelos no formato `.docx`, define quais variáveis existem (ex: `{{CPF_SERVIDOR}}`), gerencia permissões (RBAC) e monitora a saúde do sistema (Quotas de API, Logs).

4. **O Cidadão (O "Validador" - Acesso Público):**
   - *O que faz:* Pega uma Portaria impressa na rua, lê o QR Code ou digita o "Código de Autenticidade" no site público (`/validar`) para saber se aquele documento é verdadeiro ou falso.

---

## 3. AS 5 ETAPAS DO CICLO DE VIDA DO DOCUMENTO (O CORAÇÃO DO SISTEMA)
Todo documento oficial dentro do "Doc's Cataguases" passa obrigatoriamente por estas fases:

1. **Nascedouro (Wizard Dinâmico):** O sistema não deixa o usuário escrever texto livre no início. Ele preenche um formulário (com máscaras de CPF/Moeda) que injeta os dados num modelo pré-aprovado.
2. **Revisão:** O documento vira um `.docx`. O usuário pode baixar, dar um "tapa" final no Word (arrumar uma margem, adicionar um parágrafo específico) e fazer o upload de volta.
3. **Conversão e Bloqueio:** O sistema transforma o `.docx` em `.pdf` inalterável (via CloudConvert) e envia para a "Fila de Assinatura".
4. **Assinatura Eletrônica:** O Prefeito assina. O sistema carimba um Hash Criptográfico e um QR Code no rodapé da última página.
5. **Acervo e Publicação:** O documento final (PDF assinado) vai para a "Nuvem" (Supabase Storage) e fica disponível na tela de Acervo para pesquisa (Por Ano, Secretaria ou Tipo).

---

## 4. LIMITAÇÕES E RESTRIÇÕES ARQUITETURAIS (O QUE NÃO FAZER)
- O sistema **NÃO** é um editor de texto online (como Google Docs). Não tentaremos recriar o Word no navegador. O texto pesado é feito no Word (upload/download).
- O sistema **NÃO** usa certificados digitais pagos (e-CPF/A1/A3) no Ciclo 1. A assinatura é eletrônica simples (Gov.br/Senha) validada por Hash local.
- O sistema **DEVE** ter altíssima usabilidade (UI limpa, estilo Gov.br) porque os usuários (servidores públicos) muitas vezes não têm alta fluência tecnológica.

---

## 5. INSTRUÇÃO PARA A IA (O "POR QUÊ")
Sempre que você (IA) for desenvolver uma tela solicitada no `PROGRESS.md`, consulte este arquivo para entender o **CONTEXTO** daquela tela. 
*Exemplo: Se a tarefa é "Fazer a tela de Acervo", lembre-se que ela serve para o Servidor Administrativo achar rapidamente uma Portaria antiga.* 
Desenvolva com foco em utilidade real para a Prefeitura de Cataguases!
