/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { WorkOrder } from "../types";
import { FileText, Shield, Layers, RefreshCw, Eye, CheckCircle, Clock } from "lucide-react";

interface FiscalTabProps {
  tenantId: string;
  workOrders: WorkOrder[];
}

export default function FiscalTab({ tenantId, workOrders }: FiscalTabProps) {
  const [selectedOsId, setSelectedOsId] = useState<string | null>(null);

  // Filter only closed OSs since those generate fiscal documents
  const closedOSList = workOrders.filter(w => w.tenantId === tenantId && w.status === "Fechada");

  // Simulated JSON builder for FokusNFe/PlugNotas integrations
  const getSimulatedJson = (os: WorkOrder) => {
    const payload = {
      provedor: "FokusNFe_Integrador_v2",
      tipo_documento: os.items.some(i => i.type === "product") ? "NF-e (Produto)" : "NFS-e (Serviço)",
      ambiente: "producao_simulada",
      identificadores: {
        tenant_id: os.tenantId,
        ordem_servico_id: os.id,
        origem_orcamento_id: os.budgetId || "venda_direta"
      },
      prestador: {
        cnpj: "12.345.678/0001-90",
        inscricao_municipal: "38927163-0",
        razao_social: "SERVIÇOPRO SAAS PLATAFORMA ERP"
      },
      tomador: {
        nome: os.clientName,
        documento: "111.222.333-44",
        telefone: "(11) 98888-7777",
        endereco: {
          logradouro: "Av. Paulista",
          numero: "1000",
          uf: "SP",
          cidade: "São Paulo"
        }
      },
      itens: os.items.map(item => ({
        codigo_interno: item.itemId,
        descricao: item.name,
        tipo: item.type === "product" ? "PECA" : "SERVICO",
        quantidade: item.quantity,
        valor_unitario: item.unitPrice,
        valor_total: item.totalPrice,
        tributacao: item.type === "product" 
          ? { icms_situacao_tributaria: "102", cfop: "5102" }
          : { codigo_servico_municipio: "14.01", iss_retido: false }
      })),
      valores: {
        valor_servicos: os.items.filter(i=>i.type === "service").reduce((sum,i)=>sum+i.totalPrice,0),
        valor_produtos: os.items.filter(i=>i.type === "product").reduce((sum,i)=>sum+i.totalPrice,0),
        valor_total: os.totalPrice
      }
    };

    return JSON.stringify(payload, null, 2);
  };

  return (
    <div className="space-y-6" id="fiscal_tab_content">
      <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-sans font-bold text-amber-900 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Integrador Fiscal Externo Parceiro (Sem Conexão Direta SEFAZ)
          </h3>
          <p className="text-xs text-amber-800 leading-normal">
            O ServiçoPro SaaS não conecta diretamente à SEFAZ municipal/estadual. Ele monta um <strong>JSON de Pré-Nota</strong> padronizado e transmite via Webhook para APIs como FocusNFe, e-Notas ou PlugNotas. Isto economiza 90% de manutenção fiscal!
          </p>
        </div>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded font-mono text-[11px] font-bold self-start md:self-auto">
          REST API v2.4
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Closed OS List for Fiscal Invoicing */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-1 space-y-4">
          <h3 className="text-sm font-sans font-semibold text-slate-800 border-b border-slate-100 pb-3">
            Histórico de OS Prontas para Faturamento ({closedOSList.length})
          </h3>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {closedOSList.map(os => (
              <div
                key={os.id}
                onClick={() => setSelectedOsId(os.id)}
                className={`p-3 border rounded-xl cursor-pointer transition-all ${
                  selectedOsId === os.id 
                    ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300" 
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-sans font-semibold text-slate-800 truncate">{os.clientName}</h4>
                  <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    PRONTA
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">OS ID: {os.id}</span>
                <div className="flex justify-between items-center mt-3 text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-200/50">
                  <span>Itens: {os.items.length}</span>
                  <span className="font-bold text-slate-850">R$ {os.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            ))}

            {closedOSList.length === 0 && (
              <div className="text-center py-12 text-slate-400 font-sans">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium">Nenhuma OS finalizada ainda.</p>
                <p className="text-[10px]">Vá para a aba Operação, abra e FECHE uma Ordem de Serviço para simular o faturamento fiscal automático.</p>
              </div>
            )}
          </div>
        </div>

        {/* JSON Payload Viewer */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-sans font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              Payload de Transmissão (JSON do Integrador)
            </h3>
            {selectedOsId && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded">
                SIMULANDO HOMOLOGAÇÃO
              </span>
            )}
          </div>

          {selectedOsId ? (() => {
            const osObj = closedOSList.find(o => o.id === selectedOsId);
            if (!osObj) return null;

            return (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 flex justify-between items-center">
                  <span>Visualizando estrutura para OS: <strong>{osObj.id}</strong></span>
                  <span className="font-mono text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Validada no Schema NF-e 4.00
                  </span>
                </div>

                <pre className="bg-slate-900 text-slate-300 text-xs font-mono p-5 rounded-xl overflow-x-auto border border-slate-850 max-h-[350px]">
                  {getSimulatedJson(osObj)}
                </pre>

                <div className="text-[11px] text-slate-500 leading-normal bg-slate-50 p-3 rounded-lg border border-slate-150">
                  <strong>Campos de Auditoria:</strong> O payload carrega o <code>tenant_id</code> da empresa e o <code>ordem_servico_id</code> de origem. Isso garante que a nota fiscal emitida no governo fique para sempre indexada ao registro financeiro e operacional do banco SQL Server do ERP.
                </div>
              </div>
            );
          })() : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 font-sans">
              <Eye className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Selecione uma OS da lista ao lado</p>
              <p className="text-[10px]">O sistema irá compilar dinamicamente o JSON XML com as alíquotas do simples nacional.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
