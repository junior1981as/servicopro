/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { FinancialTransaction, CashLedger, ContaBancaria } from "../types";
import { DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Check, CheckCircle2, TrendingUp, Filter, BarChart3, Banknote, Calendar, Activity, Pencil, SplitSquareHorizontal, Plus, Building2, X, Landmark, RefreshCw, Undo2 } from "lucide-react";
import { AlertModal, AlertType } from "./AlertModal";
import { ConfirmModal } from "./ConfirmModal";

interface FinancialTabProps {
  tenantId: string;
  transactions: FinancialTransaction[];
  cashLedger: CashLedger[];
  contas: ContaBancaria[];
  onPayTransaction: (id: string, paymentMethod: string, contaBancariaId: string) => void;
  onReverseTransaction: (id: string) => void;
  onEditTransaction: (id: string, data: { dueDate?: string; amount?: number; desconto?: number; description?: string }) => void;
  onParcelarTransaction: (id: string, parcelas: number) => void;
  onUndoTransactionSource: (id: string) => void;
  onPrintFinancial?: () => void;
}

export default function FinancialTab({
  tenantId,
  transactions,
  cashLedger,
  contas,
  onPayTransaction,
  onReverseTransaction,
  onEditTransaction,
  onParcelarTransaction,
  onUndoTransactionSource,
  onPrintFinancial
}: FinancialTabProps) {
  const [filterType, setFilterType] = useState<"all" | "receita" | "despesa">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "Pendente" | "Pago">("all");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [selectedContaId, setSelectedContaId] = useState<string>("");
  const [payingTransId, setPayingTransId] = useState<string | null>(null);
  const [reversingTransId, setReversingTransId] = useState<string | null>(null);
  const [editingTrans, setEditingTrans] = useState<FinancialTransaction | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDesconto, setEditDesconto] = useState("");
  const [parcelingTransId, setParcelingTransId] = useState<string | null>(null);
  const [numParcelas, setNumParcelas] = useState(2);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ isOpen: false, type: "success", title: "", message: "" });

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  const tenantTransactions = transactions.filter(t => {
    if (t.tenantId !== tenantId) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.dueDate || a.createdAt || 0).getTime();
    const dateB = new Date(b.dueDate || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const tenantLedgers = cashLedger.filter(l => l.tenantId === tenantId).sort((a,b) => new Date(b.dateTimeRecorded).getTime() - new Date(a.dateTimeRecorded).getTime());

  // Computations
  const totalReceivablesPendente = transactions
    .filter(t => t.tenantId === tenantId && t.type === "receita" && t.status === "Pendente")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayablesPendente = transactions
    .filter(t => t.tenantId === tenantId && t.type === "despesa" && t.status === "Pendente")
    .reduce((sum, t) => sum + t.amount, 0);

  const cashBalance = tenantLedgers.reduce((sum, l) => {
    return l.type === "entrada" ? sum + l.amount : sum - l.amount;
  }, 0);

  const handleSettleTransaction = (id: string) => {
    const contaId = selectedContaId || (contas.length > 0 ? contas[0].id : "");
    if (!contaId) {
      showAlert("error", "Sem Conta", "Cadastre uma conta bancária antes de liquidar.");
      return;
    }
    onPayTransaction(id, paymentMethod, contaId);
    setPayingTransId(null);
    showAlert("success", "Sucesso", "Transação baixada com sucesso! O valor foi integrado ao Livro de Caixa.");
  };

  const handleConfirmReverse = () => {
    if (reversingTransId) {
      onReverseTransaction(reversingTransId);
      setReversingTransId(null);
      showAlert("success", "Sucesso", "Estorno realizado com sucesso. O lançamento reverso foi gravado no Livro de Caixa.");
    }
  };

  const handleUndoSource = (id: string) => {
    if (confirm("Deseja realmente desfazer este faturamento/lançamento? Isso reverterá a OS/Compra para o status anterior e devolverá o estoque (se aplicável). A transação será excluída.")) {
      onUndoTransactionSource(id);
    }
  };

  return (
    <div className="space-y-6" id="financial_tab_content">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-sans font-bold text-slate-900 flex items-center gap-3">
            Fluxo de Caixa & Contas
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Visão executiva da saúde financeira da sua oficina.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-[#0f172a] hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nova movimentação
          </button>
          <button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm">
            <RefreshCw className="w-4 h-4" /> Conciliação
          </button>
          {onPrintFinancial && (
            <button onClick={onPrintFinancial} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm">
              <BarChart3 className="w-4 h-4" /> Exportar relatório
            </button>
          )}
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Saldo Consolidado */}
        <div className="bg-[#0f172a] rounded-xl p-5 text-white flex flex-col justify-between shadow-md relative overflow-hidden">
          <div className="absolute right-4 top-4 opacity-40">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12c0 1.66 4.48 3 10 3s10-1.34 10-3"/><path d="M2 8c0 1.66 4.48 3 10 3s10-1.34 10-3"/><path d="M22 16c0 1.66-4.48 3-10 3s-10-1.34-10-3"/><path d="M22 4c0 1.66-4.48 3-10 3S2 5.66 2 4v16c0 1.66 4.48 3 10 3s10-1.34 10-3V4z"/></svg>
          </div>
          <div>
            <div className="flex items-center gap-2 text-slate-300 text-xs font-medium mb-1">
              Saldo consolidado <div className="w-3.5 h-3.5 rounded-full border border-slate-500 flex items-center justify-center text-[9px]">i</div>
            </div>
            <div className="text-[28px] font-bold font-sans tracking-tight">
              R$ {cashBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Disponível em caixa e bancos</div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white cursor-pointer transition-colors">
            Ver detalhes das contas <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Projeção 30 dias */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-10 bg-emerald-50/30 flex items-end">
             <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full stroke-[#10b981] fill-[#10b981]/10" strokeWidth="2">
                <path d="M0,20 L0,15 L20,18 L40,10 L60,15 L80,5 L100,2 L100,20 Z"></path>
             </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
              Projeção em 30 dias <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[9px]">i</div>
            </div>
            <div className="text-[28px] font-bold font-sans tracking-tight text-[#10b981]">
              R$ {(() => {
                const projRec = tenantTransactions.filter(t => t.type === 'receita' && t.status === 'Pendente' && new Date(t.dueDate) <= new Date(Date.now() + 30*86400000)).reduce((acc, t) => acc + t.amount, 0);
                const projDesp = tenantTransactions.filter(t => t.type === 'despesa' && t.status === 'Pendente' && new Date(t.dueDate) <= new Date(Date.now() + 30*86400000)).reduce((acc, t) => acc + t.amount, 0);
                return (cashBalance + projRec - projDesp).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
              })()}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Saldo projetado</div>
          </div>
        </div>

        {/* Entradas 7 dias */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-3">
              Entradas próximos 7 dias <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[9px]">i</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                <ArrowUpRight className="w-4 h-4 text-[#10b981]" />
              </div>
              <div>
                <div className="text-[22px] font-bold font-sans tracking-tight text-slate-900 leading-none">
                  R$ {(() => {
                    const next7Rec = tenantTransactions.filter(t => t.type === 'receita' && t.status === 'Pendente' && new Date(t.dueDate) >= new Date() && new Date(t.dueDate) <= new Date(Date.now() + 7*86400000));
                    return next7Rec.reduce((acc, t) => acc + t.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
                  })()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Previsto</div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-[11px] font-medium text-slate-500">
            {tenantTransactions.filter(t => t.type === 'receita' && t.status === 'Pendente' && new Date(t.dueDate) >= new Date() && new Date(t.dueDate) <= new Date(Date.now() + 7*86400000)).length} recebimentos
          </div>
        </div>

        {/* Saídas 7 dias */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-3">
              Saídas próximos 7 dias <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[9px]">i</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
                <ArrowDownRight className="w-4 h-4 text-[#f43f5e]" />
              </div>
              <div>
                <div className="text-[22px] font-bold font-sans tracking-tight text-slate-900 leading-none">
                  R$ {(() => {
                    const next7Desp = tenantTransactions.filter(t => t.type === 'despesa' && t.status === 'Pendente' && new Date(t.dueDate) >= new Date() && new Date(t.dueDate) <= new Date(Date.now() + 7*86400000));
                    return next7Desp.reduce((acc, t) => acc + t.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
                  })()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Previsto</div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-[11px] font-medium text-slate-500">
            {tenantTransactions.filter(t => t.type === 'despesa' && t.status === 'Pendente' && new Date(t.dueDate) >= new Date() && new Date(t.dueDate) <= new Date(Date.now() + 7*86400000)).length} pagamentos
          </div>
        </div>

        {/* Em Atraso */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-3">
              Em atraso <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[9px]">i</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
                <span className="text-[#f43f5e] font-bold text-sm">!</span>
              </div>
              <div>
                <div className="text-[22px] font-bold font-sans tracking-tight text-slate-900 leading-none">
                  R$ {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const atrasados = tenantTransactions.filter(t => t.status === 'Pendente' && t.dueDate && t.dueDate.split('T')[0] < todayStr);
                    return atrasados.reduce((acc, t) => acc + t.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
                  })()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Total em aberto</div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-[11px] font-medium text-[#f43f5e]">
             {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                return tenantTransactions.filter(t => t.status === 'Pendente' && t.dueDate && t.dueDate.split('T')[0] < todayStr).length;
              })()} títulos vencidos
          </div>
        </div>
      </div>

      {/* THREE COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COL: ATENÇÃO NECESSÁRIA (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-[13px] font-bold text-slate-800">Atenção necessária</h3>
            <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                return tenantTransactions.filter(t => t.status === 'Pendente' && t.dueDate && t.dueDate.split('T')[0] <= todayStr).length;
              })()}
            </span>
          </div>

          {/* A Pagar Hoje */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-start justify-between">
              <h4 className="text-[13px] font-bold text-slate-800">A pagar hoje</h4>
              <div className="text-right">
                <div className="text-[13px] font-bold text-[#f43f5e]">
                  R$ {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const payToday = tenantTransactions.filter(t => t.type === 'despesa' && t.status === 'Pendente' && t.dueDate && t.dueDate.split('T')[0] === todayStr);
                    return payToday.reduce((a, b) => a + b.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
                  })()}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{tenantTransactions.filter(t => t.type === 'despesa' && t.status === 'Pendente' && t.dueDate && t.dueDate.split('T')[0] === new Date().toISOString().split('T')[0]).length} títulos</div>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const items = tenantTransactions.filter(t => t.type === 'despesa' && t.status === 'Pendente' && t.dueDate && t.dueDate.split('T')[0] === todayStr).slice(0, 3);
                if (items.length === 0) return <div className="p-4 text-[11px] text-slate-500 text-center">Nenhum título a pagar hoje.</div>;
                return items.map(t => (
                  <div key={t.id} className="p-4 flex items-start justify-between hover:bg-slate-50 cursor-pointer" onClick={() => setPayingTransId(t.id)}>
                    <div>
                      <div className="text-[12px] text-slate-700 line-clamp-1">{t.description}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{t.sourceId || 'Sem Doc'}</div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-[12px] font-bold text-slate-800">R$ {t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                      <div className="text-[10px] text-[#f43f5e] mt-0.5">Vence hoje</div>
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div className="p-3 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors">
              Ver todos a pagar <ArrowUpRight className="w-3 h-3 inline" />
            </div>
          </div>

          {/* A Receber Hoje */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-start justify-between">
              <h4 className="text-[13px] font-bold text-slate-800">A receber hoje</h4>
              <div className="text-right">
                <div className="text-[13px] font-bold text-[#10b981]">
                  R$ {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const recToday = tenantTransactions.filter(t => t.type === 'receita' && t.status === 'Pendente' && t.dueDate && t.dueDate.split('T')[0] === todayStr);
                    return recToday.reduce((a, b) => a + b.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
                  })()}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{tenantTransactions.filter(t => t.type === 'receita' && t.status === 'Pendente' && t.dueDate && t.dueDate.split('T')[0] === new Date().toISOString().split('T')[0]).length} títulos</div>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const items = tenantTransactions.filter(t => t.type === 'receita' && t.status === 'Pendente' && t.dueDate && t.dueDate.split('T')[0] === todayStr).slice(0, 3);
                if (items.length === 0) return <div className="p-4 text-[11px] text-slate-500 text-center">Nenhum título a receber hoje.</div>;
                return items.map(t => (
                  <div key={t.id} className="p-4 flex items-start justify-between hover:bg-slate-50 cursor-pointer" onClick={() => setPayingTransId(t.id)}>
                    <div>
                      <div className="text-[12px] text-slate-700 line-clamp-1">{t.description}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{t.sourceId || 'Sem Doc'}</div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-[12px] font-bold text-slate-800">R$ {t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                      <div className="text-[10px] text-[#10b981] mt-0.5">Vence hoje</div>
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div className="p-3 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors">
              Ver todos a receber <ArrowUpRight className="w-3 h-3 inline" />
            </div>
          </div>
          
          {/* Conciliações Pendentes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-slate-800">Conciliações pendentes</h3>
              <span className="text-[10px] text-slate-500 font-medium">3 itens</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
              <div className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                <span className="text-[12px] text-slate-700">Bradesco 123456-7</span>
                <div className="flex items-center gap-2">
                  <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded">15 lançamentos</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COL: LANÇAMENTOS (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-4">
              <h3 className="text-[13px] font-bold text-slate-800">Lançamentos financeiros</h3>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col flex-1">
            {/* Filters Bar */}
            <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2">
               <div className="flex items-center gap-2">
                 <div className="flex items-center gap-2 border border-slate-200 px-3 py-1.5 rounded-md text-[11px] font-medium text-slate-600 bg-white">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>10/06/2026 - 13/07/2026</span>
                 </div>
                 <select className="border border-slate-200 px-3 py-1.5 rounded-md text-[11px] font-medium text-slate-600 focus:outline-none bg-white">
                   <option>Todas as contas</option>
                   {contas.map(c => <option key={c.id}>{c.nome}</option>)}
                 </select>
                 <select value={filterType} onChange={e=>setFilterType(e.target.value as any)} className="border border-slate-200 px-3 py-1.5 rounded-md text-[11px] font-medium text-slate-600 focus:outline-none bg-white">
                   <option value="all">Todos os tipos</option>
                   <option value="receita">Receitas</option>
                   <option value="despesa">Despesas</option>
                 </select>
               </div>
               <button className="border border-slate-200 px-3 py-1.5 rounded-md text-[11px] font-medium text-slate-600 flex items-center gap-2 hover:bg-slate-50 bg-white">
                  <Filter className="w-3 h-3" /> Filtros
               </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-white whitespace-nowrap">
                  <tr>
                    <th className="px-3 py-3 font-semibold w-[80px]">DATA</th>
                    <th className="px-3 py-3 font-semibold w-full">DESCRIÇÃO</th>
                    <th className="px-3 py-3 font-semibold w-[80px]">TIPO</th>
                    <th className="px-3 py-3 font-semibold w-[120px]">CATEGORIA</th>
                    <th className="px-3 py-3 font-semibold w-[140px]">CONTA</th>
                    <th className="px-3 py-3 font-semibold text-right w-[100px]">VALOR</th>
                    <th className="px-3 py-3 font-semibold text-center w-[90px]">STATUS</th>
                    <th className="px-3 py-3 w-[40px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenantTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => {
                        if (t.status === 'Pendente') setPayingTransId(t.id);
                        else { setEditingTrans(t); setEditDueDate(t.dueDate ? t.dueDate.substring(0,10) : ""); setEditAmount(String(t.amount)); setEditDesc(t.description); setEditDesconto(String(t.desconto || 0)); }
                      }}>
                      <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-BR') : '--'}</td>
                      <td className="px-3 py-3 min-w-[200px]">
                        <div className="text-slate-800 whitespace-normal line-clamp-2">{t.description}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[300px] xl:max-w-[400px]">{t.sourceId || 'Lançamento manual'}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${t.type === 'receita' ? 'bg-emerald-50 text-[#10b981]' : 'bg-rose-50 text-[#f43f5e]'}`}>
                          {t.type === 'receita' ? 'RECEITA' : 'DESPESA'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                        {t.category}
                      </td>
                      <td className="px-3 py-3 text-slate-500 whitespace-nowrap truncate max-w-[140px]">
                         {t.contaBancariaId ? contas.find(c => c.id === t.contaBancariaId)?.nome : '---'}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <span className={`font-sans font-bold text-[12px] ${t.type === 'receita' ? 'text-[#10b981]' : 'text-[#f43f5e]'}`}>
                          {t.type === 'receita' ? '' : '- '}R$ {Math.max(0, t.amount - (t.desconto || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center gap-1 text-[10px] font-medium ${t.status === 'Pago' ? 'text-[#10b981]' : t.status === 'Pendente' ? 'text-amber-500' : 'text-slate-400'}`}>
                          {t.status === 'Pago' ? <CheckCircle2 className="w-3.5 h-3.5" /> : t.status === 'Pendente' ? <Activity className="w-3.5 h-3.5" /> : null}
                          {t.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                         <span className="text-slate-300 group-hover:text-slate-500">›</span>
                      </td>
                    </tr>
                  ))}
                  {tenantTransactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-500">Nenhum lançamento encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Placeholder */}
            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
               <span>Exibindo {Math.min(10, tenantTransactions.length)} de {tenantTransactions.length} lançamentos</span>
               <div className="flex items-center gap-3">
                 <span className="cursor-pointer hover:text-slate-800">1</span>
                 <span className="cursor-pointer hover:text-slate-800">2</span>
                 <span className="cursor-pointer hover:text-slate-800">3</span>
                 <span>...</span>
                 <span className="cursor-pointer hover:text-slate-800">23</span>
                 <span className="cursor-pointer hover:text-slate-800 ml-2">›</span>
                 <select className="ml-4 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none">
                    <option>Itens por página: 10</option>
                 </select>
               </div>
            </div>
          </div>
        </div>

        {/* RIGHT COL: CONTAS E LIVRO CAIXA (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Contas bancárias */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-bold text-slate-800">Contas bancárias</h3>
              <div className="text-right">
                 <div className="text-[10px] text-slate-500">Saldo total</div>
                 <div className="text-[13px] font-bold text-[#10b981]">R$ {cashBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
              {contas.map(c => {
                 let bgLogo = 'bg-slate-800';
                 if (c.tipo === 'Caixa') bgLogo = 'bg-emerald-500';
                 else if (c.banco.toLowerCase().includes('bradesco')) bgLogo = 'bg-[#cc092f]'; // Bradesco Red
                 else if (c.banco.toLowerCase().includes('itaú') || c.banco.toLowerCase().includes('itau')) bgLogo = 'bg-[#ec7000]'; // Itau Orange
                 else if (c.banco.toLowerCase().includes('brasil')) bgLogo = 'bg-[#facc15]'; // BB Yellow
                 
                 return (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${bgLogo}`}>
                      {c.tipo === 'Caixa' ? <Wallet className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-slate-800">{c.banco || c.nome}</div>
                      <div className="text-[10px] text-slate-400">{c.tipo} {c.numeroConta}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-[12px] font-bold ${c.saldoAtual >= 0 ? 'text-[#10b981]' : 'text-[#f43f5e]'}`}>
                       {c.saldoAtual < 0 ? '- ' : ''}R$ {Math.abs(c.saldoAtual).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              )})}
              <div className="p-3 text-center text-[11px] font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors">
                Ver todas as contas
              </div>
            </div>
          </div>

          {/* Livro Caixa Timeline */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-[13px] font-bold text-slate-800 mb-2">Livro caixa - Timeline</h3>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex-1 overflow-hidden relative">
              <div className="absolute left-[26px] top-6 bottom-6 w-0.5 bg-slate-200"></div>
              <div className="space-y-6 relative z-10">
                {tenantLedgers.slice(0, 5).map(l => (
                  <div key={l.id} className="flex gap-4">
                    <div className="mt-1">
                      <div className={`w-2 h-2 rounded-full ring-[3px] ring-white ${l.type === 'entrada' ? 'bg-[#10b981]' : 'bg-[#f43f5e]'}`}></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                           <div className="text-[10px] text-slate-400 font-medium mb-1">
                              {new Date(l.dateTimeRecorded).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                           </div>
                           <div className="text-[11px] text-slate-800">{l.description}</div>
                           <div className="text-[10px] text-slate-500 line-clamp-1">{l.transactionId ? tenantTransactions.find(t=>t.id === l.transactionId)?.description : ''}</div>
                           {contas.find(c => c.id === l.contaBancariaId) && (
                             <div className="text-[10px] text-slate-400 mt-1">{contas.find(c => c.id === l.contaBancariaId)?.nome} {contas.find(c => c.id === l.contaBancariaId)?.numeroConta}</div>
                           )}
                        </div>
                        <div className={`text-[12px] font-bold whitespace-nowrap ml-2 ${l.type === 'entrada' ? 'text-[#10b981]' : 'text-[#f43f5e]'}`}>
                          {l.type === 'entrada' ? '+ ' : '- '}R$ {l.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {tenantLedgers.length === 0 && (
                   <div className="text-xs text-slate-400 text-center py-6">Nenhum lançamento no caixa.</div>
                )}
              </div>
              {tenantLedgers.length > 5 && (
                 <div className="mt-4 pt-4 text-center text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer">
                    Ver mais movimentações
                 </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* CONTAS BANCÁRIAS REMOVIDAS (MOVIDO PARA CADASTRO MESTRE) */}

      {/* Alert Modal Overlay */}
      {alertConfig.isOpen && (
        <AlertModal
          isOpen={alertConfig.isOpen}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        />
      )}

      {reversingTransId && (
        <ConfirmModal
          isOpen={true}
          title="Estornar Liquidação"
          message="Deseja realmente estornar o recebimento/pagamento desta transação? Um lançamento reverso (devolução) será incluído no Livro Razão e o título voltará para o status Pendente."
          confirmText="Sim, executar estorno"
          cancelText="Não, manter como pago"
          onConfirm={handleConfirmReverse}
          onCancel={() => setReversingTransId(null)}
        />
      )}

      {/* Edit Transaction Modal */}
      {editingTrans && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between ${editingTrans.status === 'Pago' ? 'bg-emerald-50' : 'bg-slate-50'}`}>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                {editingTrans.status === 'Pago' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Pencil className="w-4 h-4 text-indigo-500" />} 
                {editingTrans.status === 'Pago' ? 'Detalhes da Liquidação' : 'Editar Título'}
              </h3>
              <button onClick={() => setEditingTrans(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            
            {editingTrans.status === 'Pago' && (
              <div className="px-6 pt-4">
                 <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-medium leading-relaxed">
                   Este registro já foi liquidado e seus valores contabilizados no fluxo de caixa. Alterações diretas não são permitidas. Para ajustar os valores, você deve desfazer a movimentação.
                 </div>
              </div>
            )}

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descrição</label>
                <input disabled={editingTrans.status === 'Pago'} value={editDesc} onChange={e => setEditDesc(e.target.value)} className={`w-full p-2.5 border rounded-lg text-sm ${editingTrans.status === 'Pago' ? 'bg-slate-50 border-transparent text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200'}`} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vencimento</label>
                  <input type="date" disabled={editingTrans.status === 'Pago'} value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className={`w-full p-2.5 border rounded-lg text-sm ${editingTrans.status === 'Pago' ? 'bg-slate-50 border-transparent text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200'}`} />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">Valor (R$)</label>
                  <input type="number" step="0.01" disabled={editingTrans.status === 'Pago'} value={editAmount} onChange={e => setEditAmount(e.target.value)} className={`w-full p-2.5 border rounded-lg text-sm font-mono ${editingTrans.status === 'Pago' ? 'bg-slate-50 border-transparent text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200'}`} />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">Desconto (R$)</label>
                  <input type="number" step="0.01" disabled={editingTrans.status === 'Pago'} value={editDesconto} onChange={e => setEditDesconto(e.target.value)} className={`w-full p-2.5 border rounded-lg text-sm font-mono ${editingTrans.status === 'Pago' ? 'bg-slate-50 border-transparent text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200'}`} />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-3 items-center">
              {editingTrans.status === 'Pago' ? (
                 <button onClick={() => { setReversingTransId(editingTrans.id); setEditingTrans(null); }} className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold rounded-lg transition-colors border border-rose-200 flex items-center gap-2">
                    <Undo2 className="w-4 h-4" /> Desfazer Movimentação
                 </button>
              ) : (
                 <div className="flex gap-2">
                    <button onClick={() => setParcelingTransId(editingTrans.id)} className="px-3 py-2 text-purple-600 hover:bg-purple-50 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors border border-transparent hover:border-purple-200"><SplitSquareHorizontal className="w-4 h-4" /> Parcelar</button>
                 </div>
              )}
              
              <div className="flex gap-3">
                 <button onClick={() => setEditingTrans(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-semibold">{editingTrans.status === 'Pago' ? 'Fechar' : 'Cancelar'}</button>
                 {editingTrans.status !== 'Pago' && (
                   <button onClick={() => { onEditTransaction(editingTrans.id, { dueDate: editDueDate || undefined, amount: editAmount ? parseFloat(editAmount) : undefined, desconto: editDesconto ? parseFloat(editDesconto) : undefined, description: editDesc || undefined }); setEditingTrans(null); showAlert("success", "Título Atualizado", "Os dados do título foram salvos com sucesso."); }} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all">Salvar</button>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Parcelamento Modal */}
      {parcelingTransId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><SplitSquareHorizontal className="w-4 h-4 text-purple-500" /> Parcelar Título</h3>
              <button onClick={() => setParcelingTransId(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">O título será dividido em parcelas iguais com vencimentos mensais a partir da data original. O título original será removido.</p>
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">Número de Parcelas</label>
                <input type="number" min={2} max={60} value={numParcelas} onChange={e => setNumParcelas(parseInt(e.target.value) || 2)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setParcelingTransId(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-semibold">Cancelar</button>
              <button onClick={() => { onParcelarTransaction(parcelingTransId, numParcelas); setParcelingTransId(null); showAlert("success", "Parcelamento Gerado", `O título foi dividido em ${numParcelas} parcelas.`); }} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all">Confirmar Parcelamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
