/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { SYSTEM_ADRS, ERP_MODULES, TECHNICAL_RISKS, MSSQL_DATABASE_SCHEMA } from "../data/adrData";
import { BookOpen, Database, ShieldAlert, Layers, Map, Copy, Check, Terminal, Server, Plus, Loader2, Pencil, Trash } from "lucide-react";
import { api } from "../services/api";

const formatCnpjCpf = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 11) {
    return v
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return v
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .substring(0, 18);
};

const isValidCnpjCpf = (val: string) => {
  if (!val) return true; // allow empty if not strictly required
  const s = val.replace(/\D/g, '');
  if (s.length !== 11 && s.length !== 14) return false;
  
  if (s.length === 11) {
    if (/^(\d)\1{10}$/.test(s)) return false;
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(s.substring(i-1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(s.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(s.substring(i-1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(s.substring(10, 11))) return false;
    return true;
  }
  
  if (s.length === 14) {
    if (/^(\d)\1{13}$/.test(s)) return false;
    let size = s.length - 2;
    let numbers = s.substring(0, size);
    let digits = s.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(0))) return false;
    size = size + 1;
    numbers = s.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(1))) return false;
    return true;
  }
  return false;
};

export default function ArchitectPanel() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"blueprint" | "schema" | "adrs" | "risks" | "saas">("blueprint");

  // SaaS States
  const [tenants, setTenants] = useState<any[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [showProvisionForm, setShowProvisionForm] = useState(false);
  const [provNomeCliente, setProvNomeCliente] = useState("");
  const [provNomeBanco, setProvNomeBanco] = useState("");
  const [provAdminEmail, setProvAdminEmail] = useState("");
  const [provAdminSenha, setProvAdminSenha] = useState("");
  const [provRazaoSocial, setProvRazaoSocial] = useState("");
  const [provDocumento, setProvDocumento] = useState("");
  const [provTelefone, setProvTelefone] = useState("");
  const [provCep, setProvCep] = useState("");
  const [provRua, setProvRua] = useState("");
  const [provNumero, setProvNumero] = useState("");
  const [provBairro, setProvBairro] = useState("");
  const [provCidade, setProvCidade] = useState("");
  const [provEstado, setProvEstado] = useState("");
  const [provInscricaoEstadual, setProvInscricaoEstadual] = useState("");
  const [provValorMensalidade, setProvValorMensalidade] = useState("");

  const [provLoading, setProvLoading] = useState(false);
  const [provMessage, setProvMessage] = useState("");

  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{id: string, nome: string} | null>(null);

  useEffect(() => {
    if (activeTab === "saas") {
      loadTenants();
    }
  }, [activeTab]);

  const loadTenants = async () => {
    setLoadingTenants(true);
    try {
      const data = await api.getSaaSTenants();
      setTenants(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingTenants(false);
    }
  };

  const requestDelete = (id: string, nome: string) => {
    setDeleteConfirmation({ id, nome });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      await api.deleteSaaSTenant(deleteConfirmation.id);
      loadTenants();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir.');
    } finally {
      setDeleteConfirmation(null);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    if (editingTenant.documento && !isValidCnpjCpf(editingTenant.documento)) {
      alert("Erro: CNPJ / CPF informado é inválido.");
      return;
    }
    setProvLoading(true);
    try {
      await api.updateSaaSTenant(editingTenant.id, { 
        nome: editingTenant.nome, 
        ativo: editingTenant.ativo,
        documento: editingTenant.documento,
        razaoSocial: editingTenant.razaoSocial,
        telefone: editingTenant.telefone,
        cep: editingTenant.cep,
        rua: editingTenant.rua,
        numero: editingTenant.numero,
        bairro: editingTenant.bairro,
        cidade: editingTenant.cidade,
        estado: editingTenant.estado,
        inscricaoEstadual: editingTenant.inscricaoEstadual,
        valorMensalidade: editingTenant.valorMensalidade
      });
      setEditingTenant(null);
      setShowEditModal(false);
      loadTenants();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar.');
    } finally {
      setProvLoading(false);
    }
  };

  const handleEditClick = (t: any) => {
    setEditingTenant({ 
      ...t, 
      ativo: t.ativo !== false,
      documento: t.documento ? formatCnpjCpf(t.documento) : ''
    });
    setShowEditModal(true);
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (provDocumento && !isValidCnpjCpf(provDocumento)) {
      setProvMessage("Erro: CNPJ / CPF inválido.");
      return;
    }
    setProvLoading(true);
    setProvMessage("Provisionando cliente e criando banco de dados... Aguarde.");
    try {
      const res = await api.provisionSaaSTenant({
        nomeCliente: provNomeCliente,
        nomeBanco: provNomeBanco,
        adminEmail: provAdminEmail,
        adminSenha: provAdminSenha,
        razaoSocial: provRazaoSocial,
        documento: provDocumento,
        telefone: provTelefone,
        cep: provCep,
        rua: provRua,
        numero: provNumero,
        bairro: provBairro,
        cidade: provCidade,
        estado: provEstado,
        inscricaoEstadual: provInscricaoEstadual,
        valorMensalidade: parseFloat(provValorMensalidade) || 0
      });
      setProvMessage(res.mensagem || "Sucesso!");
      setProvNomeCliente("");
      setProvNomeBanco("");
      setProvAdminEmail("");
      setProvAdminSenha("");
      setProvRazaoSocial("");
      setProvDocumento("");
      setProvTelefone("");
      setProvCep("");
      setProvRua("");
      setProvNumero("");
      setProvBairro("");
      setProvCidade("");
      setProvEstado("");
      setProvInscricaoEstadual("");
      setProvValorMensalidade("");
      setShowProvisionForm(false);
      loadTenants();
    } catch (err: any) {
      setProvMessage("Erro: " + err.message);
    } finally {
      setProvLoading(false);
    }
  };

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
          <button
            onClick={() => setActiveTab("saas")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono transition-all ${
              activeTab === "saas"
                ? "bg-emerald-500 text-slate-950 font-semibold shadow-md"
                : "text-slate-300 hover:bg-slate-800"
            }`}
            id="tab_saas_btn"
          >
            <Server className="w-3.5 h-3.5" />
            5. Gestão SaaS
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

      {/* TAB 5: SAAS */}
      {activeTab === "saas" && (
        <div className="p-6 space-y-6 bg-slate-50 border-t border-slate-200" id="saas_content">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-sans font-bold text-slate-900 flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-600" />
                SaaS - Clientes Ativos
              </h3>
              <p className="text-xs text-slate-500 mt-1">Gerencie os tenants, bancos de dados isolados e acessos.</p>
            </div>
            <button
              onClick={() => setShowProvisionForm(!showProvisionForm)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {showProvisionForm ? "Cancelar" : "Novo Cliente"}
            </button>
          </div>

          {provMessage && (
            <div className={`p-3 rounded-lg text-xs font-mono font-semibold border ${provMessage.startsWith("Erro") ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
              {provMessage}
            </div>
          )}

          {showProvisionForm && (
            <form onSubmit={handleProvision} className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2">Provisionamento Dinâmico de Novo Banco de Dados</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Nome da Empresa / Cliente</label>
                  <input required type="text" value={provNomeCliente} onChange={e=>setProvNomeCliente(e.target.value)} placeholder="Ex: Oficina Mecânica 2000" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Nome do Banco de Dados (SQL Server)</label>
                  <input required type="text" value={provNomeBanco} onChange={e=>setProvNomeBanco(e.target.value)} placeholder="Ex: db_servicopro_mecanica2000" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">E-mail do Administrador (Dono)</label>
                  <input required type="email" value={provAdminEmail} onChange={e=>setProvAdminEmail(e.target.value)} placeholder="Ex: admin@mecanica2000.com.br" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Senha Inicial</label>
                  <input required type="password" value={provAdminSenha} onChange={e=>setProvAdminSenha(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900" />
                </div>
              </div>

              <h4 className="text-sm font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2 mt-4">Dados Empresariais e Cobrança</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Razão Social</label>
                  <input type="text" value={provRazaoSocial} onChange={e=>setProvRazaoSocial(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Inscrição Estadual</label>
                  <input type="text" value={provInscricaoEstadual} onChange={e=>setProvInscricaoEstadual(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">CNPJ / CPF</label>
                  <input type="text" value={provDocumento} onChange={e=>setProvDocumento(formatCnpjCpf(e.target.value))} className={`w-full p-2.5 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-slate-900 ${provDocumento && !isValidCnpjCpf(provDocumento) ? 'border-rose-300 text-rose-600 focus:ring-rose-500' : 'border-slate-200'}`} />
                  {provDocumento && !isValidCnpjCpf(provDocumento) && (
                    <span className="text-[10px] text-rose-500 mt-1 block">Documento inválido</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Telefone / WhatsApp</label>
                  <input type="text" value={provTelefone} onChange={e=>setProvTelefone(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Valor da Mensalidade (R$)</label>
                  <input type="number" step="0.01" value={provValorMensalidade} onChange={e=>setProvValorMensalidade(e.target.value)} placeholder="0.00" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">CEP</label>
                  <input type="text" value={provCep} onChange={e=>setProvCep(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Rua / Logradouro</label>
                  <input type="text" value={provRua} onChange={e=>setProvRua(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Número</label>
                  <input type="text" value={provNumero} onChange={e=>setProvNumero(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Bairro</label>
                  <input type="text" value={provBairro} onChange={e=>setProvBairro(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Cidade</label>
                  <input type="text" value={provCidade} onChange={e=>setProvCidade(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Estado (UF)</label>
                  <input type="text" value={provEstado} onChange={e=>setProvEstado(e.target.value)} maxLength={2} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-slate-900 uppercase" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={provLoading} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                  {provLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  {provLoading ? "Gerando Banco de Dados..." : "Criar Infraestrutura do Cliente"}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {loadingTenants ? (
              <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando clientes...
              </div>
            ) : tenants.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Nenhum cliente cadastrado além do Mestre.</div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 font-mono text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3 text-left">Tenant ID</th>
                    <th className="px-6 py-3 text-left">Cliente</th>
                    <th className="px-6 py-3 text-left">Banco de Dados Alvo</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-xs">
                  {tenants.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleEditClick(t)}>
                      <td className="px-6 py-3 font-mono text-slate-400">{t.id}</td>
                      <td className="px-6 py-3 font-semibold text-slate-800">{t.nome}</td>
                      <td className="px-6 py-3 font-mono text-indigo-600 bg-indigo-50/50">{t.banco}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold ${t.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {t.ativo ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </td>
                      <td className="px-6 py-3 flex gap-3 justify-end items-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleEditClick(t)} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Editar">
                          <Pencil className="w-4 h-4"/>
                        </button>
                        <button onClick={() => requestDelete(t.id, t.nome)} className="text-slate-400 hover:text-rose-600 transition-colors" title="Excluir">
                          <Trash className="w-4 h-4"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      {/* Modal de Edição */}
      {showEditModal && editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-emerald-600" />
                Editar Dados do Cliente
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Nome da Empresa</label>
                  <input required type="text" value={editingTenant.nome || ''} onChange={e => setEditingTenant({...editingTenant, nome: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Status do Acesso</label>
                  <select value={editingTenant.ativo ? "1" : "0"} onChange={e => setEditingTenant({...editingTenant, ativo: e.target.value === "1"})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 font-bold">
                    <option value="1">ATIVO (Acesso Permitido)</option>
                    <option value="0">INATIVO (Acesso Bloqueado)</option>
                  </select>
                </div>
              </div>
              
              <h4 className="text-sm font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2 mt-4">Dados Empresariais e Cobrança</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Razão Social</label>
                  <input type="text" value={editingTenant.razaoSocial || ""} onChange={e=>setEditingTenant({...editingTenant, razaoSocial: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Inscrição Estadual</label>
                  <input type="text" value={editingTenant.inscricaoEstadual || ""} onChange={e=>setEditingTenant({...editingTenant, inscricaoEstadual: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">CNPJ / CPF</label>
                  <input type="text" value={editingTenant.documento || ''} onChange={e => setEditingTenant({...editingTenant, documento: formatCnpjCpf(e.target.value)})} className={`w-full p-2.5 bg-slate-50 border rounded text-xs focus:ring-1 focus:ring-indigo-500 ${editingTenant.documento && !isValidCnpjCpf(editingTenant.documento) ? 'border-rose-300 text-rose-600 focus:ring-rose-500' : 'border-slate-200'}`} />
                  {editingTenant.documento && !isValidCnpjCpf(editingTenant.documento) && (
                    <span className="text-[10px] text-rose-500 mt-1 block">Documento inválido</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Telefone / WhatsApp</label>
                  <input type="text" value={editingTenant.telefone || ""} onChange={e=>setEditingTenant({...editingTenant, telefone: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Valor da Mensalidade (R$)</label>
                  <input type="number" step="0.01" value={editingTenant.valorMensalidade || ""} onChange={e=>setEditingTenant({...editingTenant, valorMensalidade: parseFloat(e.target.value) || 0})} placeholder="0.00" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">CEP</label>
                  <input type="text" value={editingTenant.cep || ''} onChange={e => setEditingTenant({...editingTenant, cep: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Rua / Logradouro</label>
                  <input type="text" value={editingTenant.rua || ''} onChange={e => setEditingTenant({...editingTenant, rua: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Número</label>
                  <input type="text" value={editingTenant.numero || ''} onChange={e => setEditingTenant({...editingTenant, numero: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Bairro</label>
                  <input type="text" value={editingTenant.bairro || ''} onChange={e => setEditingTenant({...editingTenant, bairro: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Cidade</label>
                  <input type="text" value={editingTenant.cidade || ''} onChange={e => setEditingTenant({...editingTenant, cidade: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Estado (UF)</label>
                  <input type="text" value={editingTenant.estado || ''} onChange={e => setEditingTenant({...editingTenant, estado: e.target.value})} maxLength={2} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 uppercase" />
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-slate-100 gap-3 mt-6">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-5 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors">Cancelar</button>
                <button type="submit" disabled={provLoading} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                  {provLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-rose-50 p-5 flex items-center gap-4 border-b border-rose-100">
              <div className="bg-rose-100 p-2 rounded-full text-rose-600">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-rose-700">Confirmar Exclusão</h3>
                <p className="text-sm text-rose-600 mt-1">Ação irreversível</p>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Tem certeza que deseja excluir a empresa <strong className="text-slate-900">{deleteConfirmation.nome}</strong>?
              </p>
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs font-semibold flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <span>O banco de dados alvo, usuários e todas as informações vinculadas a este tenant serão deletados permanentemente.</span>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirmation(null)} 
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded-lg text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete} 
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
              >
                <Trash className="w-4 h-4" />
                Sim, Excluir Empresa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
