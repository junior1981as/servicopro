/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Tenant } from "../types";
import { 
  Building, LayoutDashboard, ClipboardList, ShoppingBag, Landmark, ShieldCheck, Layers, Settings, Wrench, CalendarDays
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  activeTenant: Tenant;
  tenants: Tenant[];
  setActiveTenant: (tenant: Tenant) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  activeTenant,
  tenants,
  setActiveTenant
}: SidebarProps) {
  const menuItems = [
    {
      id: "dashboard",
      label: "Painel de Bordo",
      icon: LayoutDashboard,
      description: "KPIs de faturamento e margens"
    },
    {
      id: "registers",
      label: "Cadastros Mestres",
      icon: Settings,
      description: "Clientes, Ativos, Catálogo"
    },
    {
      id: "schedule",
      label: "Visão de Agendas",
      icon: CalendarDays,
      description: "Controle de agendamentos e horários"
    },
    {
      id: "operations",
      label: "Ordens & Orçamentos",
      icon: ClipboardList,
      description: "Orçamentos e O.S. (Workflow)"
    },
    {
      id: "purchases",
      label: "Estoque & Compras",
      icon: ShoppingBag,
      description: "Reposição e Notas de Entrada"
    },
    {
      id: "financial",
      label: "Financeiro & Contas",
      icon: Landmark,
      description: "Fluxo de caixa, Contas A Receber/Pagar"
    },
    {
      id: "fiscal",
      label: "Documentos Fiscais",
      icon: ShieldCheck,
      description: "Pré-Notas estruturadas JSON"
    },
    {
      id: "architect",
      label: "Central do Arquiteto",
      icon: Layers,
      description: "ADRs, Blueprints, Script MSSQL"
    },
    {
      id: "settings",
      label: "Usuários e Permissões",
      icon: ShieldCheck,
      description: "Acessos e Perfis do Sistema"
    }
  ];

  return (
    <aside className="w-full md:w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col flex-shrink-0" id="saas_sidebar">
      {/* Brand & App Icon */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="p-2 bg-emerald-500 text-slate-950 rounded-lg shadow-inner flex items-center justify-center">
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-white tracking-wider font-mono">SERVIÇOPRO</h2>
          <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest block">SaaS ERP Suite</span>
        </div>
      </div>

      {/* Tenant Selector Dropdown */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40">
        <label className="block text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-slate-400" />
          Empresa / Tenant Selecionado
        </label>
        
        <select
          value={activeTenant.id}
          onChange={(e) => {
            const tenant = tenants.find(t => t.id === e.target.value);
            if (tenant) setActiveTenant(tenant);
          }}
          className="w-full p-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-md text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 transition-colors"
          id="tenant_selector_dropdown"
        >
          {tenants.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="text-[9px] text-slate-500 mt-1 block font-mono">
          Isolamento dinâmico via TenantID
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isSelected = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isSelected
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
              id={`nav_link_${item.id}`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? "text-slate-950" : "text-slate-400"}`} />
              <div className="flex flex-col">
                <span className="text-xs font-sans tracking-wide leading-none">{item.label}</span>
                {!isSelected && (
                  <span className="text-[9px] text-slate-500 font-sans mt-0.5 leading-none">
                    {item.description}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[10px] font-mono text-slate-500 text-center space-y-1">
        <div>PRODUTO MVP COMPATÍVEL</div>
        <div>SQL Server MSSQL 2022</div>
      </div>
    </aside>
  );
}
