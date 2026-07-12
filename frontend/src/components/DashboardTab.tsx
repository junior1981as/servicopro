/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Client, Asset, Product, Service, WorkOrder, Budget, FinancialTransaction, CashLedger } from "../types";
import { TrendingUp, AlertTriangle, Users, FileText, CheckCircle2, DollarSign, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface DashboardProps {
  clients: Client[];
  assets: Asset[];
  products: Product[];
  services: Service[];
  workOrders: WorkOrder[];
  budgets: Budget[];
  transactions: FinancialTransaction[];
  cashLedger: CashLedger[];
}

export default function DashboardTab({
  clients,
  assets,
  products,
  services,
  workOrders,
  budgets,
  transactions,
  cashLedger
}: DashboardProps) {
  // Calculadora de Indicadores do Tenant Atual
  const totalClients = clients.length;
  const totalAssets = assets.length;
  const openOS = workOrders.filter(w => w.status === "Aberta" || w.status === "Em Execução").length;
  const pendingBudgets = budgets.filter(b => b.status === "Rascunho" || b.status === "Enviado").length;

  // Financeiro
  const totalReceivable = transactions
    .filter(t => t.type === "receita" && t.status === "Pendente")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayable = transactions
    .filter(t => t.type === "despesa" && t.status === "Pendente")
    .reduce((sum, t) => sum + t.amount, 0);

  const cashBalance = cashLedger.reduce((sum, ledger) => {
    return ledger.type === "entrada" ? sum + ledger.amount : sum - ledger.amount;
  }, 0);

  // Alerta de Estoque Mínimo
  const lowStockProducts = products.filter(p => p.currentStock <= p.minimumStock);

  // Margem Média Realizada nas OS Fechadas
  const closedOS = workOrders.filter(w => w.status === "Fechada");
  const averageMargin = closedOS.length > 0 
    ? (closedOS.reduce((sum, w) => sum + w.marginPercent, 0) / closedOS.length).toFixed(1)
    : "0.0";

  // Transações Recentes
  const recentTransactions = [...transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);

  return (
    <div className="space-y-6" id="dashboard_tab_content">
      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Caixa Disponível */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between" id="kpi_cash">
          <div>
            <span className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap truncate block">Saldo de Caixa</span>
            <h3 className="text-2xl font-mono font-bold text-slate-900 mt-1">
              R$ {cashBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Conciliado no livro-caixa
            </span>
          </div>
          <div className="bg-slate-100 p-3 rounded-lg text-slate-700">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Contas a Receber */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between" id="kpi_receivable">
          <div>
            <span className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap truncate block">A Receber</span>
            <h3 className="text-2xl font-mono font-bold text-emerald-600 mt-1">
              R$ {totalReceivable.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Provisões futuras do faturamento
            </span>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Contas a Pagar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between" id="kpi_payable">
          <div>
            <span className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap truncate block">A Pagar</span>
            <h3 className="text-2xl font-mono font-bold text-rose-600 mt-1">
              R$ {totalPayable.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Compromissos com fornecedores
            </span>
          </div>
          <div className="bg-rose-50 p-3 rounded-lg text-rose-600">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        {/* Margem Operacional Média */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between" id="kpi_margin">
          <div>
            <span className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap truncate block">Margem Média</span>
            <h3 className="text-2xl font-mono font-bold text-indigo-600 mt-1">
              {averageMargin}%
            </h3>
            <span className="text-[10px] text-indigo-600 font-medium mt-1 block">
              Lucro sobre custo de peças/serviço
            </span>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Alertas Críticos e Resumo de Operações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Operacional */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
          <h3 className="text-sm font-sans font-semibold text-slate-900 border-b border-slate-100 pb-3">
            Status Operacional do Dia
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Clientes Ativos</span>
              <span className="text-2xl font-bold font-sans text-slate-800 block mt-1">{totalClients}</span>
              <span className="text-[10px] text-slate-500 mt-1 block whitespace-nowrap truncate">{totalAssets} equipamentos</span>
            </div>

            <div className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-xl">
              <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-wider block">OS Ativas</span>
              <span className="text-2xl font-bold font-sans text-indigo-700 block mt-1">{openOS}</span>
              <span className="text-[10px] text-indigo-500 mt-1 block whitespace-nowrap truncate">Em andamento</span>
            </div>

            <div className="p-4 bg-amber-50/30 border border-amber-100 rounded-xl">
              <span className="text-[10px] font-mono text-amber-700 font-bold uppercase tracking-wider block">Orçamentos</span>
              <span className="text-2xl font-bold font-sans text-amber-700 block mt-1">{pendingBudgets}</span>
              <span className="text-[10px] text-amber-600 mt-1 block whitespace-nowrap truncate">Pendentes</span>
            </div>
          </div>

          {/* Fluxo Visual da OS */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-3">
              Regras do Fluxo Operacional Protegido:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs leading-relaxed">
              <div className="bg-white p-2.5 rounded border border-slate-150">
                <span className="font-mono text-emerald-600 font-bold">1. Abertura</span>
                <p className="text-slate-500 mt-0.5">Toda OS nasce como <strong>Aberta</strong>. Peças adicionadas reservam estoque.</p>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-150">
                <span className="font-mono text-emerald-600 font-bold">2. Execução</span>
                <p className="text-slate-500 mt-0.5">A OS progride para <strong>Em Execução</strong>. Custos e margens são atualizados em tempo real.</p>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-150">
                <span className="font-mono text-emerald-600 font-bold">3. Fechamento</span>
                <p className="text-slate-500 mt-0.5">Ao mudar para <strong>Fechada</strong>, deduz estoque físico e gera Conta a Receber automaticamente.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Estoque e Alertas */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-sans font-semibold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span>Alertas de Estoque Crítico</span>
            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full font-mono text-[10px] font-semibold">
              {lowStockProducts.length} itens
            </span>
          </h3>

          {lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
              <p className="text-xs font-medium">Estoque saudável!</p>
              <p className="text-[10px]">Nenhum item abaixo do estoque mínimo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map(p => (
                <div key={p.id} className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-sans font-semibold text-slate-800">{p.name}</h4>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">SKU: {p.sku} | Unit: {p.unit}</span>
                    <span className="text-[10px] text-rose-700 font-medium block mt-1">Estoque Mínimo: {p.minimumStock}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded font-mono font-bold text-xs">
                      {p.currentStock}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">saldo</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Info sobre Multi-Tenancy */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <span className="font-mono font-semibold text-slate-700 block uppercase text-[10px]">Segurança do Workspace:</span>
            <p className="text-slate-500 leading-normal">
              Você está visualizando apenas dados isolados do tenant logado. Consultas cruzadas ou vazamentos de escopo são bloqueados na camada SQL (TenantID).
            </p>
          </div>
        </div>
      </div>

      {/* Financeiro Recente */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-sans font-semibold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
          <span>Últimos Lançamentos Financeiros (Contas)</span>
          <span className="text-xs text-slate-500 font-mono">Simulado em Tempo Real</span>
        </h3>

        <div className="overflow-x-auto mt-4">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-mono text-slate-400 text-[10px] uppercase">
              <tr>
                <th className="px-4 py-3">Descrição / Destinatário</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {recentTransactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3.5">
                    <div className="font-sans font-semibold text-slate-800">{t.description}</div>
                    <div className="text-[10px] text-slate-400">ID: {t.id}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      t.type === "receita" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-600">{t.category}</td>
                  <td className="px-4 py-3.5 text-slate-500 font-mono">{t.dueDate}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-800">
                    R$ {t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      t.status === "Pago" 
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}

              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Nenhum lançamento financeiro registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
