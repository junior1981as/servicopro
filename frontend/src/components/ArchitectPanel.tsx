/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { SYSTEM_ADRS, ERP_MODULES, TECHNICAL_RISKS, MSSQL_DATABASE_SCHEMA } from "../data/adrData";
import { BookOpen, Database, ShieldAlert, Layers, Map, Copy, Check, Terminal, PlayCircle } from "lucide-react";

export default function ArchitectPanel() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"blueprint" | "schema" | "adrs" | "risks">("blueprint");

  const copyToClipboard = () => {
    navigator.clipboard.writeText(MSSQL_DATABASE_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="architect_panel_main">
      {/* Panel Header */}
      <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                MODULAR DESIGN
              </span>
              <span className="text-xs font-mono text-slate-400">v1.0.0</span>
            </div>
            <h2 className="text-2xl font-sans font-semibold tracking-tight mt-1">
              Central do Arquiteto & Blueprints SaaS
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Decisões técnicas, Diagramas de Entidade-Relacionamento, Gestão de Tenant e Scripts MSSQL/SQL Server.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700/50 self-start md:self-auto">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono text-slate-300">Banco: SQL Server / MSSQL</span>
          </div>
        </div>

        {/* Local Tab Navigation */}
        <div className="flex gap-2 mt-6 border-t border-slate-800 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("blueprint")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              activeTab === "blueprint"
                ? "bg-emerald-500 text-slate-950 font-semibold shadow-md"
                : "text-slate-300 hover:bg-slate-800"
            }`}
            id="tab_blueprint_btn"
          >
            <Layers className="w-3.5 h-3.5" />
            1. Escopo & Fluxos
          </button>
          <button
            onClick={() => setActiveTab("schema")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              activeTab === "schema"
                ? "bg-emerald-500 text-slate-950 font-semibold shadow-md"
                : "text-slate-300 hover:bg-slate-800"
            }`}
            id="tab_schema_btn"
          >
            <Terminal className="w-3.5 h-3.5" />
            2. Script SQL (MSSQL)
          </button>
          <button
            onClick={() => setActiveTab("adrs")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              activeTab === "adrs"
                ? "bg-emerald-500 text-slate-950 font-semibold shadow-md"
                : "text-slate-300 hover:bg-slate-800"
            }`}
            id="tab_adrs_btn"
          >
            <BookOpen className="w-3.5 h-3.5" />
            3. Decisões de Projeto (ADR)
          </button>
          <button
            onClick={() => setActiveTab("risks")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              activeTab === "risks"
                ? "bg-emerald-500 text-slate-950 font-semibold shadow-md"
                : "text-slate-300 hover:bg-slate-800"
            }`}
            id="tab_risks_btn"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            4. Matriz de Riscos
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="p-6">
        {/* TAB 1: BLUEPRINT */}
        {activeTab === "blueprint" && (
          <div className="space-y-8" id="blueprint_content">
            {/* Fluxo Central do ERP */}
            <div>
              <h3 className="text-base font-sans font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-emerald-500 rounded-full inline-block"></span>
                O Fluxo de Negócio Central do SaaS ERP
              </h3>
              <p className="text-sm text-slate-600 mt-1 mb-4">
                Toda operação do ERP respeita a herança do Tenant. Peças só são abatidas no fechamento físico da OS.
              </p>

              {/* Visão de Fluxo Gráfico CSS */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-slate-400 font-semibold">1. CAPTAÇÃO</span>
                  <div className="text-xs font-sans font-semibold text-slate-800 mt-2">Cliente + Ativo</div>
                  <div className="text-[10px] text-slate-500 mt-1">Carros, Ar Condicionados, Motores</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-slate-400 font-semibold">2. AGENDAMENTO</span>
                  <div className="text-xs font-sans font-semibold text-slate-800 mt-2">Agenda Reservada</div>
                  <div className="text-[10px] text-slate-500 mt-1">Bloqueia horário com Ativo/Técnico</div>
                </div>

                <div className="p-3 bg-slate-50 border border-emerald-200 bg-emerald-50/20 rounded-lg flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-emerald-600 font-semibold">3. ORÇAMENTO (OPT)</span>
                  <div className="text-xs font-sans font-semibold text-slate-800 mt-2">Validação de Custos</div>
                  <div className="text-[10px] text-slate-500 mt-1">Criação de margem e proposta comercial</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
                  <span className="text-[10px] font-mono text-slate-400 font-semibold">4. EXECUÇÃO OS</span>
                  <div className="text-xs font-sans font-semibold text-slate-800 mt-2">OS Aberta / Requisição</div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-1">Gera Reserva de Peças</div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-950 text-white rounded-lg flex flex-col justify-between shadow-sm">
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">5. ENCERRAMENTO</span>
                  <div className="text-xs font-sans font-semibold mt-2">Fechamento OS</div>
                  <div className="text-[10px] text-slate-400 mt-1">Baixa Estoque + Financeiro + Fiscal</div>
                </div>
              </div>

              {/* Fluxo de Compras */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4">
                <h4 className="text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Fluxo de Compras & Abastecimento do Estoque:
                </h4>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700">Necessidade de Compra</span>
                  <span className="text-slate-400">➔</span>
                  <span className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700">Pedido de Compra</span>
                  <span className="text-slate-400">➔</span>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 border border-emerald-300 rounded font-semibold">Entrada de NF (XML)</span>
                  <span className="text-slate-400">➔</span>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 border border-emerald-300 rounded font-semibold">Atualização de Estoque & Custos</span>
                  <span className="text-slate-400">➔</span>
                  <span className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-700">Contas a Pagar + Lançamento de Caixa</span>
                </div>
              </div>
            </div>

            {/* Módulos do Sistema */}
            <div>
              <h3 className="text-base font-sans font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <span className="w-1.5 h-5 bg-emerald-500 rounded-full inline-block"></span>
                Arquitetura de Módulos & Tabelas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ERP_MODULES.map((mod, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-sans font-semibold text-slate-800">{mod.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                        mod.status === "Em MVP" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {mod.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      {mod.description}
                    </p>
                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Tabelas Relacionadas:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {mod.keyTables.map((t, tid) => (
                          <span key={tid} className="bg-slate-200/70 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono">
                            dbo.{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ordem de Implementação em Fases (Roadmap) */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-base font-sans font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <Map className="w-5 h-5 text-emerald-600" />
                Ordem Correta de Implementação & Roadmap
              </h3>
              <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white shadow-sm" />
                  <h4 className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-wider">Fase 1 — Fundação (Esta Entrega MVP)</h4>
                  <p className="text-xs text-slate-800 font-semibold mt-1">Identidade, Empresa, Usuários, Perfis e Gestão Isolada de Tenants</p>
                  <p className="text-xs text-slate-500 mt-0.5">Define-se o isolamento dinâmico. Banco MSSQL compartilhado com separação segura de dados por TenantID.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white shadow-sm" />
                  <h4 className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-wider">Fase 2 — Cadastros</h4>
                  <p className="text-xs text-slate-800 font-semibold mt-1">Clientes, Fornecedores, Equipamentos/Ativos, Peças e Tabela de Serviços</p>
                  <p className="text-xs text-slate-500 mt-0.5">Catalogação completa de peças (com controle de SKU e estoque mínimo) e serviços com durabilidade calculada.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white shadow-sm" />
                  <h4 className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-wider">Fase 3 — Operação Central</h4>
                  <p className="text-xs text-slate-800 font-semibold mt-1">Agenda de Serviços, Orçamentos com Propostas, Ordens de Serviço (OS) & Requisição de Peças</p>
                  <p className="text-xs text-slate-500 mt-0.5">Calculadora de custo, preço e margem comercial da OS. Baixa física de estoque somente no fechamento.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 bg-amber-500 rounded-full border-4 border-white shadow-sm" />
                  <h4 className="text-xs font-mono font-bold text-amber-700 uppercase tracking-wider">Fase 4 — Compras & Recebimentos</h4>
                  <p className="text-xs text-slate-800 font-semibold mt-1">Abastecimento de Estoque, Lançamento de Notas Fiscais de Compra, Contas a Pagar automáticas</p>
                  <p className="text-xs text-slate-500 mt-0.5">Atualização automática do Custo Médio Ponderado a partir de novas entradas de NF-e.</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 bg-amber-500 rounded-full border-4 border-white shadow-sm" />
                  <h4 className="text-xs font-mono font-bold text-amber-700 uppercase tracking-wider">Fase 5 — Financeiro, Fluxo de Caixa e Integração Fiscal</h4>
                  <p className="text-xs text-slate-800 font-semibold mt-1">Contas a Receber da OS, Baixa de Caixa Realizado, Pré-Nota Fiscal JSON via Integrador Externo</p>
                  <p className="text-xs text-slate-500 mt-0.5">Integração homologada via APIs REST externas (PlugNotas/FocusNFe) gerando faturamento direto.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCHEMA SQL */}
        {activeTab === "schema" && (
          <div className="space-y-4" id="schema_content">
            <div className="flex justify-between items-center bg-slate-100 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-mono text-slate-700 font-semibold">Script SQL Server (MSSQL) Multitenant completo</span>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-md text-xs font-mono font-semibold text-slate-700 transition-colors"
                id="copy_schema_btn"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Script
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <pre className="bg-slate-900 text-slate-300 text-xs font-mono p-5 rounded-xl overflow-x-auto border border-slate-850 max-h-[500px]">
                {MSSQL_DATABASE_SCHEMA}
              </pre>
              <div className="absolute bottom-3 right-3 bg-slate-950/80 text-slate-400 text-[10px] px-2 py-1 rounded font-mono border border-slate-800">
                SQL Server COMPLIANT
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 leading-relaxed">
              <strong className="block mb-1">Garantias de Segurança Implementadas no Script:</strong>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Chaves Primárias Compostas:</strong> A maioria das tabelas possui PK composta por <code>(TenantID, ID)</code> para evitar que um ID seja buscado cruzando limites de tenancy.</li>
                <li><strong>Índices Clusterizados:</strong> A otimização física do SQL Server é organizada pelo <code>TenantID</code>, mantendo as páginas de dados do mesmo cliente fisicamente próximas no disco, melhorando absurdamente a performance e o isolamento.</li>
                <li><strong>Rastreamento Completo:</strong> Registro nativo de chaves estrangeiras que ligam Agendamento, Orçamentos e OS, mantendo a integridade referencial intocada.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 3: ADRS */}
        {activeTab === "adrs" && (
          <div className="space-y-4" id="adrs_content">
            <p className="text-sm text-slate-600 mb-2">
              Architecture Decision Records (ADRs) registram as decisões cruciais que evitam regressões arquiteturais no futuro do ERP.
            </p>
            <div className="space-y-4">
              {SYSTEM_ADRS.map((adr) => (
                <div key={adr.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-600">{adr.id}</span>
                      <h4 className="text-sm font-sans font-bold text-slate-900 mt-0.5">{adr.title}</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400">{adr.date}</span>
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-mono font-semibold">
                        {adr.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3 text-xs">
                    <div>
                      <span className="font-mono font-semibold uppercase text-slate-400 tracking-wider text-[10px]">Contexto Técnico / Desafio:</span>
                      <p className="text-slate-700 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200/60">{adr.context}</p>
                    </div>
                    <div>
                      <span className="font-mono font-semibold uppercase text-slate-400 tracking-wider text-[10px]">Decisão Arquitetural:</span>
                      <p className="text-slate-900 font-medium mt-1 leading-relaxed bg-emerald-500/5 p-2.5 rounded border border-emerald-500/10">{adr.decision}</p>
                    </div>
                    <div>
                      <span className="font-mono font-semibold uppercase text-slate-400 tracking-wider text-[10px]">Implicações & Consequências:</span>
                      <p className="text-slate-600 mt-1 leading-relaxed">{adr.consequences}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: RISKS */}
        {activeTab === "risks" && (
          <div className="space-y-4" id="risks_content">
            <p className="text-sm text-slate-600 mb-2">
              Matriz de riscos técnicos levantada para a arquitetura multi-tenant do ERP.
            </p>
            <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 font-mono text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Risco Identificado</th>
                    <th className="px-4 py-3 text-center">Nível de Severidade</th>
                    <th className="px-4 py-3">Estratégia de Mitigação Técnica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {TECHNICAL_RISKS.map((risk, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-4 font-semibold text-slate-800">{risk.title}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          risk.risk === "Alta" ? "bg-red-100 text-red-800 border border-red-200" : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                          {risk.risk}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600 leading-relaxed">{risk.mitigation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
