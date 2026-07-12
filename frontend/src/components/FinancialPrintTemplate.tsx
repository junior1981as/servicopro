import React from "react";
import { FinancialTransaction, CashLedger } from "../types";
import { ShieldCheck, Calendar, MapPin, Phone } from "lucide-react";

interface FinancialPrintTemplateProps {
  tenantId: string;
  transactions: FinancialTransaction[];
  cashLedger: CashLedger[];
}

export default function FinancialPrintTemplate({ tenantId, transactions, cashLedger }: FinancialPrintTemplateProps) {
  const tenantTransactions = transactions.filter(t => t.tenantId === tenantId);
  const tenantLedgers = cashLedger.filter(l => l.tenantId === tenantId);

  const cashBalance = tenantLedgers.reduce((sum, l) => {
    return l.type === "entrada" ? sum + l.amount : sum - l.amount;
  }, 0);

  const totalReceitas = tenantTransactions.filter(t => t.type === "receita" && t.status === "Pago").reduce((sum, t) => sum + t.amount, 0);
  const totalDespesas = tenantTransactions.filter(t => t.type === "despesa" && t.status === "Pago").reduce((sum, t) => sum + t.amount, 0);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  return (
    <div className="hidden print:block bg-white text-black p-8 max-w-4xl mx-auto font-sans text-sm h-screen">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-8 h-8 text-slate-900" />
            <h1 className="text-2xl font-black tracking-tight uppercase">ServiçoPro Oficina Demo</h1>
          </div>
          <p className="text-xs text-slate-600">CNPJ: 00.000.000/0001-00</p>
          <p className="text-xs text-slate-600 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> Av. Principal, 1000 - Centro, SP</p>
          <p className="text-xs text-slate-600 flex items-center gap-1"><Phone className="w-3 h-3"/> (11) 99999-9999</p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">RELATÓRIO FINANCEIRO</h2>
          <p className="text-xs text-slate-500 mt-1">Data de Emissão: {new Date().toLocaleDateString("pt-BR")}</p>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid grid-cols-3 gap-8 mb-8">
        <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 text-center">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Total em Receitas</h3>
          <p className="font-bold text-xl text-emerald-600">R$ {totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 text-center">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Total em Despesas</h3>
          <p className="font-bold text-xl text-rose-600">R$ {totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 border border-slate-900 rounded-lg bg-slate-900 text-white text-center">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Saldo Atual de Caixa</h3>
          <p className="font-bold text-xl text-emerald-400">R$ {cashBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase text-slate-800 border-b border-slate-200 pb-2 mb-3">Histórico de Lançamentos</h3>
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider">
              <th className="p-2 border border-slate-200">Descrição / Categoria</th>
              <th className="p-2 border border-slate-200 text-center">Data</th>
              <th className="p-2 border border-slate-200 text-center">Tipo</th>
              <th className="p-2 border border-slate-200 text-center">Status</th>
              <th className="p-2 border border-slate-200 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {tenantTransactions.map((t, idx) => (
              <tr key={idx} className="border-b border-slate-200">
                <td className="p-2 border-l border-r border-slate-200">
                  <span className="font-semibold block text-[11px]">{t.description}</span>
                  <span className="text-slate-500">{t.category}</span>
                </td>
                <td className="p-2 border-r border-slate-200 text-center">{formatDate(t.dueDate)}</td>
                <td className="p-2 border-r border-slate-200 text-center uppercase font-bold">{t.type}</td>
                <td className="p-2 border-r border-slate-200 text-center">{t.status}</td>
                <td className="p-2 border-r border-slate-200 text-right font-semibold">R$ {t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {tenantTransactions.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-slate-500 italic border border-slate-200">
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-center mt-12 text-[10px] text-slate-400">
        Documento gerado por ServiçoPro Cloud ERP em {new Date().toLocaleString("pt-BR")}
      </div>
    </div>
  );
}
