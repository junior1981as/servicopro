/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { FinancialTransaction, CashLedger, ContaBancaria } from "../types";
import { DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Check, CheckCircle2, TrendingUp, Filter, BarChart3, Banknote, Calendar, Activity, Pencil, SplitSquareHorizontal, Plus, Building2, X, Landmark } from "lucide-react";
import { AlertModal, AlertType } from "./AlertModal";
import { ConfirmModal } from "./ConfirmModal";

interface FinancialTabProps {
  tenantId: string;
  transactions: FinancialTransaction[];
  cashLedger: CashLedger[];
  contas: ContaBancaria[];
  onPayTransaction: (id: string, paymentMethod: string, contaBancariaId: string) => void;
  onReverseTransaction: (id: string) => void;
  onEditTransaction: (id: string, data: { dueDate?: string; amount?: number; description?: string }) => void;
  onParcelarTransaction: (id: string, parcelas: number) => void;
  onCreateContaBancaria: (data: { nome: string; tipo: string; saldoInicial: number }) => void;
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
  onCreateContaBancaria,
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
  const [parcelingTransId, setParcelingTransId] = useState<string | null>(null);
  const [numParcelas, setNumParcelas] = useState(2);
  const [showNewConta, setShowNewConta] = useState(false);
  const [newContaNome, setNewContaNome] = useState("");
  const [newContaTipo, setNewContaTipo] = useState("Corrente");

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

  return (
    <div className="space-y-8" id="financial_tab_content">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100/50 border border-indigo-200/50 text-indigo-800 text-xs font-semibold mb-3">
            <Activity className="w-3.5 h-3.5" />
            Visão Geral Financeira
          </div>
          <h2 className="text-3xl font-sans font-bold text-slate-900 flex items-center gap-3">
            Fluxo de Caixa & Contas
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Acompanhe a saúde financeira do seu negócio em tempo real. Gerencie contas a pagar e a receber e mantenha seu livro caixa (Ledger) atualizado.
          </p>
        </div>

        {onPrintFinancial && (
          <button
            onClick={onPrintFinancial}
            className="group relative flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl text-sm font-semibold font-sans shadow-sm transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
          >
            <BarChart3 className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
            <span className="relative z-10">Exportar Relatório</span>
          </button>
        )}
      </div>

      {/* FINANCE MINI DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        {/* Saldo Conciliado */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-2xl shadow-xl shadow-indigo-900/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
            <Wallet className="w-32 h-32 text-white" />
          </div>
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Banknote className="w-5 h-5 text-indigo-300" />
            </div>
            <span className="text-[10px] font-bold tracking-wider text-indigo-200 uppercase bg-white/5 px-2 py-1 rounded-md border border-white/10">Saldo Real</span>
          </div>
          <h3 className="text-3xl font-bold text-white font-mono relative z-10">
            R$ {cashBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-indigo-200/80 mt-1 font-medium relative z-10">Disponível em Caixa (Líquido)</p>
        </div>

        {/* Total a Receber */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-md">Ativo</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 font-mono">
            R$ {totalReceivablesPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            A Receber (OS e Serviços)
          </p>
        </div>

        {/* Total a Pagar */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <ArrowDownRight className="w-5 h-5 text-rose-600" />
            </div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-md">Passivo</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 font-mono">
            R$ {totalPayablesPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            A Pagar (Compras e Despesas)
          </p>
        </div>
      </div>

      {/* Quick Pay Dialog */}
      {payingTransId && (
        <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-2xl shadow-lg animate-fade-in relative overflow-hidden" id="pay_dialog">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-sans font-bold text-indigo-900">Liquidação de Título</h4>
                <p className="text-xs text-indigo-700/80">Confirme o método de pagamento para efetivar a baixa.</p>
              </div>
            </div>
            <button onClick={() => setPayingTransId(null)} className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100/50 rounded-full transition-colors">
              X
            </button>
          </div>
          <div className="bg-white p-4 rounded-xl border border-indigo-100/50 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end shadow-sm">
            <div className="w-full">
              <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">Meio de Pagamento</label>
              <select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                <option value="PIX">Pix / Transferência Instantânea</option>
                <option value="Dinheiro">Dinheiro em Espécie</option>
                <option value="Cartão de Crédito">Cartão de Crédito (Maquininha)</option>
                <option value="Boleto Bancário">Boleto Bancário (Compensação)</option>
                <option value="Transferência Bancária">TED / DOC</option>
              </select>
            </div>
            <div className="w-full">
              <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">Conta Destino / Origem</label>
              <select value={selectedContaId} onChange={e=>setSelectedContaId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                {contas.length === 0 && <option value="">Nenhuma conta cadastrada</option>}
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>)}
              </select>
            </div>
            <button
              onClick={() => handleSettleTransaction(payingTransId)}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md shadow-indigo-600/20 transition-all hover:-translate-y-0.5"
            >
              Confirmar Liquidação
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Contas a Receber / Pagar Grid (takes 8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-base font-sans font-bold text-slate-800 flex items-center gap-2">
                Lançamentos Financeiros
              </h3>
              
              {/* Filters */}
              <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <div className="flex items-center border-r border-slate-200 pr-2">
                  <Filter className="w-3 h-3 text-slate-400 mx-2" />
                  <select value={filterType} onChange={e=>setFilterType(e.target.value as any)} className="bg-transparent text-xs font-semibold text-slate-600 focus:outline-none">
                    <option value="all">Todas Operações</option>
                    <option value="receita">Apenas Receitas</option>
                    <option value="despesa">Apenas Despesas</option>
                  </select>
                </div>
                <div className="pl-2">
                  <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value as any)} className="bg-transparent text-xs font-semibold text-slate-600 focus:outline-none h-full">
                    <option value="all">Qualquer Status</option>
                    <option value="Pendente">Apenas Pendentes</option>
                    <option value="Pago">Liquidados</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white font-mono text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Descrição do Título</th>
                    <th className="px-6 py-4 font-semibold">Tipo</th>
                    <th className="px-6 py-4 font-semibold text-right">Valor Líquido</th>
                    <th className="px-6 py-4 font-semibold text-center">Situação</th>
                    <th className="px-6 py-4 font-semibold text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tenantTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-sans font-bold text-slate-800">{t.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{t.category}</span>
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Venc: {t.dueDate ? new Date(t.dueDate).toLocaleDateString("pt-BR") : '--'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          t.type === "receita" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}>
                          {t.type === "receita" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {t.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono font-bold text-slate-900 text-base">
                          R$ {t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-24 px-2 py-1 rounded-full text-[10px] font-bold border ${
                          t.status === "Pago" 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                            : t.status === "Cancelado"
                              ? "bg-slate-100 text-slate-500 border-slate-200"
                              : "bg-amber-50 text-amber-600 border-amber-200"
                        }`}>
                          {t.status === "Pago" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : null}
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {t.status === "Pendente" ? (
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              onClick={() => setPayingTransId(t.id)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-semibold shadow-sm transition-all"
                            >
                              Liquidar
                            </button>
                            <button
                              onClick={() => { setEditingTrans(t); setEditDueDate(t.dueDate ? t.dueDate.substring(0,10) : ""); setEditAmount(String(t.amount)); setEditDesc(t.description); }}
                              title="Editar título"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { setParcelingTransId(t.id); setNumParcelas(2); }}
                              title="Parcelar"
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            >
                              <SplitSquareHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : t.status === "Cancelado" ? (
                          <span className="text-slate-300 text-xs font-mono font-bold italic">--</span>
                        ) : (
                          <button 
                            onClick={() => setReversingTransId(t.id)}
                            title="Clique para estornar esta liquidação"
                            className="w-full text-emerald-600 hover:text-rose-600 bg-emerald-50 hover:bg-rose-50 border border-emerald-100 hover:border-rose-200 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer truncate"
                          >
                            Pago ({t.paymentMethod})<br/>
                            <span className="text-[9px] underline opacity-70">Click para estornar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {tenantTransactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                          <DollarSign className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-semibold text-slate-600">Nenhum lançamento financeiro</p>
                        <p className="text-xs text-slate-400 mt-1">Nenhum título corresponde aos filtros atuais.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Caixa / Lançamentos Realizados (takes 4 cols) */}
        <div className="lg:col-span-4">
          <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200/80 shadow-inner h-full flex flex-col">
            <div className="mb-6">
              <h3 className="text-base font-sans font-bold text-slate-800 flex items-center justify-between">
                <span>Livro Razão (Kardex Financeiro)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">Timeline de movimentações consolidadas.</p>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-2 relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-200/50"></div>

              {tenantLedgers.map((l, idx) => (
                <div key={l.id} className="relative pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                  {/* Timeline dot */}
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 ${
                    l.type === "entrada" ? "bg-emerald-500" : "bg-rose-500"
                  }`}></div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-sans font-bold text-slate-800 line-clamp-2 leading-snug">{l.description}</h4>
                      <span className={`font-mono font-bold text-sm whitespace-nowrap ml-2 ${
                        l.type === "entrada" ? "text-emerald-600" : "text-rose-600"
                      }`}>
                        {l.type === "entrada" ? "+" : "-"} R$ {l.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">{new Date(l.dateTimeRecorded).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        l.type === "entrada" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      }`}>
                        {l.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {tenantLedgers.length === 0 && (
                <div className="text-center py-12 text-slate-400 relative z-10">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-slate-200 mx-auto mb-3 shadow-sm">
                    <CheckCircle2 className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500">Caixa Vazio</p>
                  <p className="text-[10px] mt-1 px-4">Baixe uma conta para registrar entradas ou saídas no livro razão.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTAS BANCÁRIAS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-base font-sans font-bold text-slate-800 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-indigo-500" />
            Contas Bancárias
          </h3>
          <button onClick={() => setShowNewConta(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all">
            <Plus className="w-3.5 h-3.5" /> Nova Conta
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {contas.map(c => (
            <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{c.nome}</h4>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">{c.tipo}</span>
                </div>
              </div>
              <p className={`font-mono font-bold text-lg ${c.saldoAtual >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                R$ {c.saldoAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
          {contas.length === 0 && (
            <div className="col-span-full text-center py-8 text-slate-400">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">Nenhuma conta cadastrada</p>
              <p className="text-xs mt-1">Crie uma conta para começar a gerenciar seus fluxos.</p>
            </div>
          )}
        </div>
      </div>

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
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Pencil className="w-4 h-4 text-indigo-500" /> Editar Título</h3>
              <button onClick={() => setEditingTrans(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descrição</label>
                <input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vencimento</label>
                  <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">Valor (R$)</label>
                  <input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setEditingTrans(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-semibold">Cancelar</button>
              <button onClick={() => { onEditTransaction(editingTrans.id, { dueDate: editDueDate || undefined, amount: editAmount ? parseFloat(editAmount) : undefined, description: editDesc || undefined }); setEditingTrans(null); showAlert("success", "Título Atualizado", "Os dados do título foram salvos com sucesso."); }} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all">Salvar</button>
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

      {/* Nova Conta Modal */}
      {showNewConta && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Building2 className="w-4 h-4 text-indigo-500" /> Nova Conta Bancária</h3>
              <button onClick={() => setShowNewConta(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome da Conta</label>
                <input value={newContaNome} onChange={e => setNewContaNome(e.target.value)} placeholder="Ex: Bradesco PJ, Caixa Físico" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo</label>
                <select value={newContaTipo} onChange={e => setNewContaTipo(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                  <option value="Corrente">Conta Corrente</option>
                  <option value="Poupanca">Poupança</option>
                  <option value="Caixa">Caixa Físico</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowNewConta(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-semibold">Cancelar</button>
              <button onClick={() => { if (!newContaNome.trim()) return; onCreateContaBancaria({ nome: newContaNome, tipo: newContaTipo, saldoInicial: 0 }); setShowNewConta(false); setNewContaNome(""); showAlert("success", "Conta Criada", `A conta "${newContaNome}" foi criada com sucesso.`); }} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all">Criar Conta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
