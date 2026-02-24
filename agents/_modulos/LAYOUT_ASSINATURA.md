## 4. PREVIEW VISUAL DA ASSINATURA (PRÉ-ASSINATURA)

**O Problema:** O assinante (Prefeito/Secretario) precisa ver onde a assinatura dele vai ficar no PDF antes de digitar a senha, para ter confianca no layout. Ele nao pode ver as tags crúas `{{SYS_ASSINANTE_NOME}}`.
**A Solucao:** O sistema trabalha com duas conversoes de PDF. Uma para leitura (Preview) e uma definitiva (Publicada).

### Regra do PDF de Preview (Gerado no momento do Submit do Operador)
Quando o documento passa de `RASCUNHO` para `PROCESSANDO` (indo gerar o primeiro PDF):
1. O backend substitui as tags de assinatura por placeholders amigaveis:
   - `{{SYS_ASSINANTE_NOME}}`  -> `[ Local da Assinatura Eletronica ]`
   - `{{SYS_DATA_ASSINATURA}}` -> `[ Data e Hora da Assinatura ]`
   - `{{SYS_CHANCELA_RODAPE}}` -> `[ A tarja de validacao com Hash sera inserida aqui ]`
2. Este e o PDF que o Prefeito/Secretario le na Tela 6 durante os status `PENDENTE`, `APROVADA` e `AGUARDANDO_ASSINATURA`.

### Regra do PDF Final (Gerado no momento da Assinatura)
Quando o assinante digita a senha e o status vai para `PUBLICADA`:
1. O backend pega o arquivo `.docx` rascunho novamente (ignorando o PDF de preview).
2. Substitui as tags originais pelos dados reais, criptograficos e finais.
3. Gera um NOVO PDF via CloudConvert.
4. Sobrescreve o `pdfUrl` no banco de dados com o link do PDF definitivo.

*(Nota para a IA: No Ciclo 1, o iframe do frontend apenas exibe o PDF mockado. O desenvolvedor usara PDFs de exemplo que ja possuem o desenho da assinatura para simular esta experiencia visualmente. A logica acima pertence ao Ciclo 2).*
