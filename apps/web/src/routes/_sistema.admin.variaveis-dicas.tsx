import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookOpen, KeyRound, Type, Hash, Calendar, CalendarDays, FileDigit, Coins, FileSignature, List, Info } from 'lucide-react'

export const Route = createFileRoute('/_sistema/admin/variaveis-dicas')({
  component: VariaveisTutorialPage,
})

function VariaveisTutorialPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" className="w-fit -ml-4 text-slate-500 hover:text-slate-900" asChild>
          <Link to="/admin/variaveis">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Variáveis
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#1351B4]" />
            Guia Completo: Como usar Variáveis
          </h2>
          <p className="text-slate-500 mt-2 text-lg">Aprenda a mapear documentos e usar os tipos de variáveis corretos para automatizar seu trabalho.</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="border-[#1351B4]/20 shadow-sm bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1351B4]">
              <KeyRound className="h-5 w-5" />
              A Regra de Ouro: As Chaves Duplas
            </CardTitle>
            <CardDescription className="text-slate-700 text-base">
              Para que o sistema entenda que uma palavra no seu texto ou no arquivo DOCX é uma variável, você DEVE envolvê-la com chaves duplas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <p className="font-mono text-sm text-slate-800 mb-2">✅ Forma Correta (Documento Comum):</p>
              <p className="bg-slate-100 p-2 rounded text-slate-600 font-mono">
                Nomeio o Sr. <span className="bg-blue-100 text-blue-800 px-1 rounded">{'{'}{'{'}NOME_SERVIDOR{'}'}{'}'}</span> para o cargo de <span className="bg-blue-100 text-blue-800 px-1 rounded">{'{'}{'{'}CARGO{'}'}{'}'}</span>.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <p className="font-mono text-sm text-slate-800 mb-2">✅ Forma Correta (Usando Variável Global):</p>
              <p className="bg-slate-100 p-2 rounded text-slate-600 font-mono">
                A <span className="bg-emerald-100 text-emerald-800 px-1 rounded">{'{'}{'{'}SYS_NOME_PREFEITURA{'}'}{'}'}</span>, estado de <span className="bg-emerald-100 text-emerald-800 px-1 rounded">{'{'}{'{'}SYS_ESTADO_PREFEITURA{'}'}{'}'}</span>, resolve [...]
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <p className="font-mono text-sm text-slate-800 mb-2">❌ Formas Incorretas (o sistema vai ignorar):</p>
              <ul className="space-y-2 text-rose-600 font-mono text-sm list-inside list-disc">
                <li>{'{'}NOME_SERVIDOR{'}'} (Apenas uma chave)</li>
                <li>[NOME_SERVIDOR] (Colchetes)</li>
                <li>NOME_SERVIDOR (Sem formatação)</li>
              </ul>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-600 bg-orange-50 p-3 rounded-md border border-orange-100">
              <Info className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
              <p><strong>Dica de nomenclatura:</strong> Use sempre palavras em letras maiúsculas separadas por underline (ex: <code>DATA_NASCIMENTO</code>). Evite espaços, acentos e caracteres especiais dentro das chaves.</p>
            </div>
          </CardContent>
        </Card>

        <div>
          <h3 className="text-xl font-bold text-slate-800 mb-4 ml-1">Tipos de Variáveis (Passo 3)</h3>
          <p className="text-slate-500 mb-6 ml-1">Conheça cada formato que você pode configurar para melhorar a tela de preenchimento do usuário final.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TypeCard
              icon={Type}
              nome="Texto Curto"
              descricao="Campo livre para o usuário digitar nomes, cargos, cidades, ou qualquer texto comum."
              exemplo="{{NOME_COMPLETO}}, {{CIDADE}}, {{FUNCAO}}"
            />
            <TypeCard
              icon={Hash}
              nome="Número"
              descricao="Permite apenas a digitação de números e trava a entrada de letras. Ideal para matrículas e códigos."
              exemplo="{{MATRICULA}}, {{NUMERO_PORTARIA}}, {{ANO}}"
            />
            <TypeCard
              icon={Calendar}
              nome="Data"
              descricao="Cria um botão de calendário visual para o usuário selecionar o dia/mês/ano sem errar o formato."
              exemplo="{{DATA_INICIO}}, {{DATA_NOMEACAO}}"
            />
            <TypeCard
              icon={CalendarDays}
              nome="Data por Extenso"
              descricao="Também exibe um calendário nativo. Mas no documento, converte a data de 17/08/2026 para '17 de Agosto de 2026'."
              exemplo="{{DATA_ASSINATURA}}, {{DATA_EXTENSO}}"
            />
            <TypeCard
              icon={FileDigit}
              nome="CPF"
              descricao="Aplica automaticamente a máscara 000.000.000-00 no momento da digitação e valida se o CPF é real."
              exemplo="{{CPF_SERVIDOR}}, {{CPF_DEPENDENTE}}"
            />
            <TypeCard
              icon={Coins}
              nome="Moeda Monetária"
              descricao="Aplica a formatação R$ 0,00 automática no painel. O usuário digita os números e o sistema formata em Reais."
              exemplo="{{VALOR_BENEFICIO}}, {{SALARIO}}, {{GRATIFICACAO}}"
            />
            <TypeCard
              icon={FileSignature}
              nome="Assinatura Digital"
              descricao="Aplica a tag especial de campo de assinatura que pode ser identificada por assinadores externos."
              exemplo="{{ASSINATURA_PREFEITO}}, {{ASSINATURA_TESTEMUNHA}}"
            />
            <TypeCard
              icon={List}
              nome="Lista Redirecionada (Select)"
              descricao="Cria uma lista suspensa (dropdown) com opções fechadas. Você define no Modelo quais são as opções."
              exemplo="{{SECRETARIA}}, {{ESTADO_CIVIL}}"
            />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-800 mb-4 ml-1 mt-6">O que são as Variáveis Globais (SYS_)?</h3>
          <Card className="shadow-sm">
            <CardContent className="p-6 space-y-4">
              <p className="text-slate-600">
                As Variáveis Globais (também chamadas de Variáveis de Sistema) são tags que você cadastra <strong>apenas uma vez na tela anterior (/admin/variaveis)</strong> e elas já trazem um valor pronto.
              </p>
              <p className="text-slate-600">
                Quando o usuário final for gerar um documento, ele <strong>não</strong> precisará preencher essas variáveis. O sistema injeta o valor automático.
              </p>
              <div className="bg-slate-50 p-4 border rounded-md">
                <p className="font-semibold text-slate-800 mb-2">Exemplo Prático:</p>
                <ol className="list-decimal list-inside text-slate-600 space-y-2 text-sm ml-2">
                  <li>Você cadastra a variável global <code>{'{'}{'{'}SYS_NOME_PREFEITO{'}'}{'}'}</code> com o valor <strong>"João da Silva"</strong>.</li>
                  <li>Você insere essa tag dentro de 50 modelos de documentos diferentes.</li>
                  <li>Ano que vem as eleições acontecem e o prefeito agora é o "Pedro".</li>
                  <li>Você altera em apenas 1 lugar na tela de Variáveis Globais. Automaticamente, todos os 50 modelos de documentos passam a usar "Pedro".</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-800 mb-4 ml-1 mt-6">Como configurar uma "Lista Redirecionada" (Select)?</h3>
          <Card className="shadow-sm border-blue-100 bg-white">
            <CardContent className="p-6 space-y-4">
              <p className="text-slate-600">
                Quando você escolhe o tipo <strong>"Lista Redirecionada (Select)"</strong> no Passo 3 do criador de Modelo, você precisa informar ao sistema quais são as opções que o usuário poderá escolher.
              </p>
              <div className="bg-slate-50 p-4 border rounded-md">
                <p className="font-semibold text-slate-800 mb-2">Como preencher as opções:</p>
                <ol className="list-decimal list-inside text-slate-600 space-y-3 text-sm ml-2">
                  <li>No Passo 3, altere o "TIPO DE DADO" da variável para <strong>"Lista Redirecionada"</strong>.</li>
                  <li>Um novo campo chamado <strong>"OPÇÕES DA LISTA"</strong> vai aparecer logo abaixo.</li>
                  <li>
                    Digite os itens separados por <strong>vírgula</strong>.<br />
                    <span className="inline-block mt-2 font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                      Solteiro, Casado, Divorciado, Viúvo
                    </span>
                  </li>
                  <li>Se precisar que a Lista também preencha outra coisa baseada no que foi selecionado, use o formato <code>VALOR_NA_TELA|DADO_INVISIVEL</code> separados por <strong>pipe (|)</strong>.<br />
                    <span className="inline-block mt-2 font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                      Secretaria da Saúde|Av. Principal 100, Secretaria de Obras|Rua das Flores 200
                    </span>
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-800 mb-4 ml-1 mt-6">Sugestões de Variáveis Globais</h3>
          <p className="text-slate-500 mb-6 ml-1">Para agilizar, cadastre estas variáveis sugeridas para uso da prefeitura na tela de Variáveis Globais.</p>

          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                  🏛️ 1. Institucionais (Obrigatórias)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm border-b pb-2">
                  <div><strong>Chave:</strong> <code className="text-blue-600 bg-blue-50 px-1 rounded">SYS_NOME_PREFEITURA</code></div>
                  <div><strong>Valor:</strong> Prefeitura Municipal de Cataguases</div>
                  <div><strong>Tipo:</strong> Texto Curto</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm border-b pb-2">
                  <div><strong>Chave:</strong> <code className="text-blue-600 bg-blue-50 px-1 rounded">SYS_ESTADO_PREFEITURA</code></div>
                  <div><strong>Valor:</strong> Minas Gerais</div>
                  <div><strong>Tipo:</strong> Texto Curto</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm border-b pb-2">
                  <div><strong>Chave:</strong> <code className="text-blue-600 bg-blue-50 px-1 rounded">SYS_CNPJ_PREFEITURA</code></div>
                  <div><strong>Valor:</strong> 18.104.927/0001-20</div>
                  <div><strong>Tipo:</strong> Texto Curto</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm border-b pb-2">
                  <div><strong>Chave:</strong> <code className="text-blue-600 bg-blue-50 px-1 rounded">SYS_ENDERECO_PREFEITURA</code></div>
                  <div><strong>Valor:</strong> Praça Rui Barbosa, 100 - Centro</div>
                  <div><strong>Tipo:</strong> Texto Curto</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm border-b pb-2">
                  <div><strong>Chave:</strong> <code className="text-blue-600 bg-blue-50 px-1 rounded">SYS_CEP_PREFEITURA</code></div>
                  <div><strong>Valor:</strong> 36770-000</div>
                  <div><strong>Tipo:</strong> Texto Curto</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div><strong>Chave:</strong> <code className="text-blue-600 bg-blue-50 px-1 rounded">SYS_EMAIL_GABINETE</code></div>
                  <div><strong>Valor:</strong> gabinete@cataguases...</div>
                  <div><strong>Tipo:</strong> Texto Curto</div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                  👔 2. Gestão e Liderança (Mudam a cada eleição)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm border-b pb-2">
                  <div><strong>Chave:</strong> <code className="text-blue-600 bg-blue-50 px-1 rounded">SYS_NOME_PREFEITO</code></div>
                  <div><strong>Valor:</strong> José Henriques</div>
                  <div><strong>Tipo:</strong> Texto Curto</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm border-b pb-2">
                  <div><strong>Chave:</strong> <code className="text-blue-600 bg-blue-50 px-1 rounded">SYS_ASSINATURA_PREFEITO</code></div>
                  <div><strong>Valor:</strong> Assinatura Eletrônica...</div>
                  <div><strong>Tipo:</strong> Assinatura Digital</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm border-b pb-2">
                  <div><strong>Chave:</strong> <code className="text-blue-600 bg-blue-50 px-1 rounded">SYS_SECRETARIO_ADMINISTRACAO</code></div>
                  <div><strong>Valor:</strong> Nome Atual</div>
                  <div><strong>Tipo:</strong> Texto Curto</div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                  📋 3. Padrões de Servidores / RH
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <p className="text-xs text-slate-500 italic mb-2">Usado para pré-configurar o tipo de dado para quando o usuário final for preencher.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm border-b pb-2">
                  <div><strong>Chave:</strong> <code className="text-blue-600 bg-blue-50 px-1 rounded">SYS_CPF_SERVIDOR</code></div>
                  <div><strong>Valor:</strong> (Deixe em branco)</div>
                  <div><strong>Tipo:</strong> CPF</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm border-b pb-2">
                  <div><strong>Chave:</strong> <code className="text-blue-600 bg-blue-50 px-1 rounded">SYS_DATA_NOMEACAO</code></div>
                  <div><strong>Valor:</strong> (Deixe em branco)</div>
                  <div><strong>Tipo:</strong> Data</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm border-b pb-2">
                  <div><strong>Chave:</strong> <code className="text-blue-600 bg-blue-50 px-1 rounded">SYS_MATRICULA_SERVIDOR</code></div>
                  <div><strong>Valor:</strong> (Deixe em branco)</div>
                  <div><strong>Tipo:</strong> Número</div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                  ⚖️ 4. Formatação / Leis Genéricas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm border-b pb-2">
                  <div><strong>Chave:</strong> <code className="text-blue-600 bg-blue-50 px-1 rounded">SYS_LEI_ORGANICA</code></div>
                  <div><strong>Valor:</strong> Lei Org. Municipal Nº XX/XXXX</div>
                  <div><strong>Tipo:</strong> Texto Curto</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm border-b pb-2">
                  <div><strong>Chave:</strong> <code className="text-blue-600 bg-blue-50 px-1 rounded">SYS_ESTATUTO_SERVIDOR</code></div>
                  <div><strong>Valor:</strong> Lei Complementar Nº XX/XXXX</div>
                  <div><strong>Tipo:</strong> Texto Curto</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  )
}

function TypeCard({ icon: Icon, nome, descricao, exemplo }: { icon: any, nome: string, descricao: string, exemplo: string }) {
  return (
    <Card className="shadow-sm hover:shadow transition-all border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
          <div className="bg-slate-100 p-2 rounded-md">
            <Icon className="h-5 w-5 text-slate-700" />
          </div>
          {nome}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 mb-4 min-h-[40px]">{descricao}</p>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tags mais comuns:</p>
          <p className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">{exemplo}</p>
        </div>
      </CardContent>
    </Card>
  )
}
