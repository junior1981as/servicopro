/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Schedule, Client, Asset } from "../types";
import { Calendar, Plus, X, ArrowRight, FileSignature, ClipboardCopy } from "lucide-react";

interface ScheduleTabProps {
  tenantId: string;
  clients: Client[];
  assets: Asset[];
  schedules: Schedule[];
  onAddSchedule: (s: Schedule) => void;
  onNavigateToOperation: (type: 'budget' | 'workorder', id: string) => void;
  onUpdateScheduleStatus: (id: string, status: "Agendado" | "Cancelado" | "Em OS", woId?: string) => void;
  onPromoteToBudget: (s: Schedule) => void; // Pass to open Operations tab on budgets
  onPromoteToOS: (s: Schedule) => void; // Pass to open Operations tab on OS
}

export default function ScheduleTab({
  tenantId,
  clients,
  assets,
  schedules,
  onAddSchedule,
  onNavigateToOperation,
  onUpdateScheduleStatus,
  onPromoteToBudget,
  onPromoteToOS
}: ScheduleTabProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [schedNotes, setSchedNotes] = useState("");

  const tenantSchedules = schedules.filter(s => s.tenantId === tenantId).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  const activeClients = clients.filter(c => c.tenantId === tenantId && c.isActive !== false);
  const activeAssets = assets.filter(a => a.tenantId === tenantId && (selectedClientId ? a.clientId === selectedClientId : true));

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedAssetId || !schedDate) return;

    const clientObj = clients.find(c => c.id === selectedClientId);
    const assetObj = assets.find(a => a.id === selectedAssetId);

    const newSched: Schedule = {
      id: "sched-" + Math.random().toString(36).substr(2, 9),
      tenantId,
      clientId: selectedClientId,
      clientName: clientObj?.name || "",
      assetId: selectedAssetId,
      assetName: assetObj?.name || "",
      dateTime: schedDate,
      description: schedNotes,
      status: "Agendado",
      createdAt: new Date().toISOString()
    };

    onAddSchedule(newSched);
    setShowCreateForm(false);
    setSelectedClientId("");
    setSelectedAssetId("");
    setSchedDate("");
    setSchedNotes("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-sans flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Visão de Agendas
          </h2>
          <p className="text-xs text-slate-500 mt-1">Gerencie os agendamentos de veículos e serviços da sua oficina.</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold font-sans shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          {showCreateForm ? "Cancelar Agendamento" : "Novo Agendamento"}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white border border-indigo-100 p-6 rounded-xl shadow-lg shadow-indigo-100/50 animate-fade-in">
          <h3 className="text-sm font-sans font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-indigo-600 rounded-full inline-block"></span>
            Cadastrar Novo Agendamento
          </h3>

          <form onSubmit={handleSaveSchedule} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Cliente *</label>
                <select required value={selectedClientId} onChange={e=>{ setSelectedClientId(e.target.value); setSelectedAssetId(""); }} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                  <option value="">Selecione o Cliente...</option>
                  {activeClients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.document})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Equipamento / Ativo *</label>
                <select required value={selectedAssetId} onChange={e=>setSelectedAssetId(e.target.value)} disabled={!selectedClientId} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs disabled:opacity-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                  <option value="">Selecione o Equipamento...</option>
                  {activeAssets.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.brand} - {a.serialNumber})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Data & Hora Agendada *</label>
                <input required type="datetime-local" value={schedDate} onChange={e=>setSchedDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Reclamação Principal / Motivo</label>
                <input type="text" placeholder="ex: Ruído na suspensão / Revisão 50k" value={schedNotes} onChange={e=>setSchedNotes(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 mt-4">
              <button type="button" onClick={()=>setShowCreateForm(false)} className="px-5 py-2 border border-slate-200 rounded text-xs font-semibold bg-white text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Confirmar Agendamento
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tenantSchedules.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">
            Nenhum agendamento encontrado para este período.
          </div>
        )}
        {tenantSchedules.map(s => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-300 transition-all shadow-sm">
            <div className={`p-1 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider ${
              s.status === "Agendado" ? "bg-indigo-500" :
              s.status === "Cancelado" ? "bg-rose-500" :
              "bg-emerald-500"
            }`}>
              {s.status}
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-900 leading-tight">{s.clientName}</h4>
                  <p className="text-xs text-slate-500">{s.assetName}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded">
                    {new Date(s.dateTime).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="text-xs font-mono text-slate-500 mt-1">{new Date(s.dateTime).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded border border-slate-100 text-xs text-slate-600 italic">
                "{s.description || 'Sem observações detalhadas'}"
              </div>

              {s.status === "Agendado" && (
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button onClick={() => onPromoteToBudget(s)} className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded text-[11px] font-bold transition-colors">
                      <FileSignature className="w-3.5 h-3.5 text-slate-500" />
                      Gerar Orçamento
                    </button>
                    <button onClick={() => onPromoteToOS(s)} className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded text-[11px] font-bold shadow-sm transition-colors">
                      <ClipboardCopy className="w-3.5 h-3.5" />
                      Abrir OS Direto
                    </button>
                  </div>
                  <button onClick={() => onUpdateScheduleStatus(s.id, "Cancelado")} className="w-full flex justify-center items-center gap-1.5 px-3 py-2 border border-rose-100 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded text-[11px] font-bold transition-colors">
                    <X className="w-3.5 h-3.5" />
                    Cancelar Agendamento
                  </button>
                </div>
              )}

              {s.status === "Em OS" && s.workOrderId && (
                <div className="pt-3 border-t border-slate-100">
                  <button onClick={() => onNavigateToOperation('workorder', s.workOrderId!)} className="w-full flex justify-center items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold transition-colors">
                    Acessar OS #{s.workOrderId.substring(0,8)}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
