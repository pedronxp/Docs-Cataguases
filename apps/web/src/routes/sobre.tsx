import { createFileRoute, Link } from '@tanstack/react-router'
import {
    Building2, Shield, FileText, Users, Lock, Mail,
    ArrowLeft, CheckCircle2, Globe, Scale, BookOpen
} from 'lucide-react'

export const Route = createFileRoute('/sobre')({
    component: SobrePage,
})

function SobrePage() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-sm leading-tight">Doc's Cataguases</span>
                            <span className="text-primary font-bold text-[10px] leading-tight">Sistema de Gestão Documental</span>
                        </div>
                    </div>
                    <Link
                        to="/login"
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Voltar ao sistema
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
                {/* Hero */}
                <section className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-3 py-1 text-xs font-semibold text-primary">
                        <Globe className="w-3.5 h-3.5" />
                        Versão 2.0 — Março de 2026
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                        Sobre o Doc's Cataguases
                    </h1>
                    <p className="text-slate-500 text-base max-w-2xl mx-auto leading-relaxed">
                        Sistema digital de gestão de portarias e atos administrativos da
                        Prefeitura Municipal de Cataguases — Minas Gerais.
                    </p>
                </section>

                {/* Cards principais */}
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            icon: FileText,
                            title: 'Gestão Documental',
                            color: 'text-blue-600 bg-blue-50 border-blue-100',
                            desc: 'Criação, revisão, assinatura e publicação de portarias e atos administrativos com rastreabilidade completa.'
                        },
                        {
                            icon: Users,
                            title: 'Colaboração',
                            color: 'text-green-600 bg-green-50 border-green-100',
                            desc: 'Fluxo de trabalho multi-usuário com controle de acesso por secretaria, setor e cargo.'
                        },
                        {
                            icon: Shield,
                            title: 'Segurança e LGPD',
                            color: 'text-violet-600 bg-violet-50 border-violet-100',
                            desc: 'Dados protegidos conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).'
                        },
                    ].map(({ icon: Icon, title, color, desc }) => (
                        <div key={title} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </section>

                {/* Sobre o sistema */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold text-slate-900">Sobre o Sistema</h2>
                    </div>
                    <div className="prose prose-sm text-slate-600 space-y-3 max-w-none">
                        <p>
                            O <strong>Doc's Cataguases</strong> é um sistema desenvolvido para modernizar e digitalizar
                            o processo de criação e publicação de atos administrativos da Prefeitura Municipal de Cataguases.
                            O sistema permite a gestão completa do ciclo de vida de portarias, decretos, resoluções e outros
                            documentos oficiais.
                        </p>
                        <p>
                            Com o sistema, servidores públicos podem criar documentos a partir de modelos padronizados,
                            submetê-los para revisão jurídica, colher assinaturas digitais e publicar no Diário Oficial
                            eletrônico — tudo em um único ambiente seguro e rastreável.
                        </p>
                    </div>
                </section>

                {/* Política de Privacidade LGPD */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
                    <div className="flex items-center gap-2">
                        <Scale className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold text-slate-900">Política de Privacidade — LGPD</h2>
                    </div>

                    <div className="space-y-4 text-sm text-slate-600">
                        <div>
                            <h3 className="font-bold text-slate-800 mb-1">1. Controlador dos Dados</h3>
                            <p>
                                O controlador dos dados pessoais tratados neste sistema é a
                                <strong> Prefeitura Municipal de Cataguases</strong>, CNPJ 18.540.598/0001-63,
                                localizada na Praça Rui Barbosa, s/n — Centro — Cataguases/MG.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-800 mb-1">2. Dados Coletados</h3>
                            <ul className="space-y-1.5">
                                {[
                                    'Nome completo e e-mail institucional (autenticação e identificação)',
                                    'Cargo, secretaria e setor de lotação (controle de acesso ABAC)',
                                    'Registros de ações no sistema (auditoria e rastreabilidade)',
                                    'Endereço IP de acesso (segurança e logs de auditoria)',
                                    'Dados de uso anônimos (analytics de desempenho — com consentimento)',
                                ].map(item => (
                                    <li key={item} className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-800 mb-1">3. Finalidade do Tratamento</h3>
                            <p>
                                Os dados são tratados exclusivamente para fins de prestação do serviço público de
                                gestão documental, controle de acesso e auditoria de atos administrativos.
                                Não há compartilhamento de dados com terceiros para fins comerciais.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-800 mb-1">4. Cookies e Armazenamento Local</h3>
                            <p className="mb-2">Utilizamos dois tipos de cookies:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                                    <p className="font-semibold text-green-800 text-xs mb-1">Essenciais (sempre ativos)</p>
                                    <p className="text-xs text-green-700">Sessão de autenticação JWT, preferências de interface (tema, sidebar). Necessários para o funcionamento do sistema.</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                                    <p className="font-semibold text-blue-800 text-xs mb-1">Analytics (opcional)</p>
                                    <p className="text-xs text-blue-700">Dados de navegação anônimos para melhorar a usabilidade. Ativados apenas com seu consentimento explícito.</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-800 mb-1">5. Direitos do Titular</h3>
                            <p>
                                Conforme a LGPD, você tem direito ao acesso, correção, portabilidade, anonimização
                                e exclusão dos seus dados pessoais. Para exercer esses direitos, entre em contato
                                com o Encarregado de Proteção de Dados (DPO) da Prefeitura.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-slate-800 mb-1">6. Retenção de Dados</h3>
                            <p>
                                Os dados são retidos enquanto o vínculo funcional do servidor com a administração
                                municipal estiver ativo e por até 5 anos após o encerramento, conforme a
                                Lei de Arquivos Públicos (Lei nº 8.159/1991) e as normas do CONARQ.
                            </p>
                        </div>

                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-amber-800 text-xs">Base Legal</p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    O tratamento de dados neste sistema é fundamentado no
                                    <strong> art. 7º, inciso III da LGPD</strong> (execução de contrato
                                    ou procedimentos preliminares relacionados ao serviço público) e no
                                    <strong> art. 7º, inciso VI</strong> (exercício regular de direitos em processo
                                    administrativo).
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contato */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4">
                    <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold text-slate-900">Contato e Suporte</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
                        <div className="space-y-1">
                            <p className="font-semibold text-slate-800">Suporte Técnico</p>
                            <p>ti@cataguases.mg.gov.br</p>
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold text-slate-800">Encarregado (DPO)</p>
                            <p>lgpd@cataguases.mg.gov.br</p>
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold text-slate-800">Prefeitura Municipal</p>
                            <p>Praça Rui Barbosa, s/n — Centro</p>
                            <p>Cataguases — MG — CEP 36.770-016</p>
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold text-slate-800">Telefone</p>
                            <p>(32) 3429-9000</p>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white mt-10">
                <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between text-xs text-slate-400">
                    <span>© 2026 Prefeitura de Cataguases — Todos os direitos reservados</span>
                    <span>Doc's Cataguases v2.0</span>
                </div>
            </footer>
        </div>
    )
}
