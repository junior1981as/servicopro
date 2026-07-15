import React from "react";
import { Budget, WorkOrder, Client, Asset } from "../types";
import { ShieldCheck, Calendar, Phone, Mail, User, MapPin } from "lucide-react";

interface PrintTemplateProps {
  documentData: Budget | WorkOrder | null;
  client: Client | undefined;
  asset: Asset | undefined;
  activeTenant: any;
}

export default function PrintTemplate({ documentData, client, asset, activeTenant }: PrintTemplateProps) {
  if (!documentData) return null;

  const isOS = "diagnosis" in documentData;
  const title = isOS ? "ORDEM DE SERVIÇO" : "ORÇAMENTO";
  const statusColor = 
    documentData.status === "Aberta" ? "text-indigo-600" :
    documentData.status === "Em Execução" ? "text-amber-600" :
    documentData.status === "Fechada" ? "text-emerald-600" :
    documentData.status === "Aprovado" ? "text-emerald-600" :
    documentData.status === "Cancelado" ? "text-rose-600" :
    "text-slate-600";

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
            <h1 className="text-2xl font-black tracking-tight uppercase">{activeTenant.name}</h1>
          </div>
          <p className="text-xs text-slate-600 font-bold uppercase">{activeTenant.razaoSocial || ""}</p>
          <p className="text-xs text-slate-600 mt-1">CNPJ/CPF: {activeTenant.document || "Não informado"}</p>
          <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3"/> 
            {activeTenant.rua ? `${activeTenant.rua}, ${activeTenant.numero} - ${activeTenant.bairro}, ${activeTenant.cidade}-${activeTenant.estado}` : "Endereço não informado"}
          </p>
          <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3"/> {activeTenant.telefone || "Telefone não informado"}</p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
          <p className="text-lg font-mono mt-1 text-slate-500">#{documentData.id.split("-")[1]?.toUpperCase() || documentData.id}</p>
          <p className={`font-bold mt-2 uppercase ${statusColor}`}>{documentData.status}</p>
          <p className="text-xs text-slate-500 mt-1">Data Emissão: {formatDate(new Date().toISOString())}</p>
        </div>
      </div>

      {/* Client & Asset Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider flex items-center gap-1">
            <User className="w-4 h-4"/> Dados do Cliente
          </h3>
          <p className="font-bold text-base mb-1">{client?.name || documentData.clientName}</p>
          <p className="text-sm"><strong>Documento:</strong> {client?.document || "N/A"}</p>
          <p className="text-sm"><strong>Telefone:</strong> {client?.phone || "N/A"}</p>
          <p className="text-sm text-slate-600 mt-2 text-xs">
            {client?.rua ? `${client.rua}, ${client.numero || "S/N"} - ${client.bairro}, ${client.cidade} - ${client.estado} (CEP: ${client.cep})` : "Endereço não cadastrado"}
          </p>
        </div>
        <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider flex items-center gap-1">
             Veículo / Equipamento
          </h3>
          <p className="font-bold text-base mb-1">{asset?.name || documentData.assetName}</p>
          <p className="text-sm"><strong>Marca:</strong> {asset?.brand || "N/A"}</p>
          <p className="text-sm"><strong>Modelo:</strong> {asset?.model || "N/A"}</p>
          <p className="text-sm"><strong>Placa/Série:</strong> {asset?.serialNumber || "N/A"}</p>
        </div>
      </div>

      {/* OS Metadata */}
      {isOS && (
        <div className="grid grid-cols-4 gap-4 mb-8">
           <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Abertura da OS</p>
              <p className="text-xs font-semibold">{formatDate((documentData as WorkOrder).createdAt)}</p>
           </div>
           <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Início Atividades</p>
              <p className="text-xs font-semibold">{formatDate((documentData as WorkOrder).startedAt) || "Não iniciado"}</p>
           </div>
           <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Término Atividades</p>
              <p className="text-xs font-semibold">{formatDate((documentData as WorkOrder).completedAt) || "Não concluído"}</p>
           </div>
           <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Técnico Responsável</p>
              <p className="text-xs font-semibold">{(documentData as WorkOrder).technicianName || "Não atribuído"}</p>
           </div>
        </div>
      )}

      {/* Description / Diagnosis */}
      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase text-slate-800 border-b border-slate-200 pb-2 mb-3">Descrição / Reclamação</h3>
        <p className="text-sm whitespace-pre-wrap">
          {isOS ? (documentData as WorkOrder).diagnosis : (documentData as Budget).notes || "Nenhuma observação informada."}
        </p>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase text-slate-800 border-b border-slate-200 pb-2 mb-3">Itens e Serviços</h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
              <th className="p-2 border border-slate-200">Item</th>
              <th className="p-2 border border-slate-200 text-center">Qtd</th>
              <th className="p-2 border border-slate-200 text-right">V. Unitário</th>
              <th className="p-2 border border-slate-200 text-right">V. Total</th>
            </tr>
          </thead>
          <tbody>
            {documentData.items.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-200 text-sm">
                <td className="p-2 border-l border-r border-slate-200">
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-[10px] uppercase ml-2 text-slate-400 bg-slate-100 px-1 rounded">{item.type}</span>
                </td>
                <td className="p-2 border-r border-slate-200 text-center">{item.quantity}</td>
                <td className="p-2 border-r border-slate-200 text-right">R$ {item.unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td className="p-2 border-r border-slate-200 text-right font-semibold">R$ {item.totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {documentData.items.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-500 italic border border-slate-200">
                  Nenhum item adicionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-16">
        <div className="w-64 p-4 bg-slate-100 rounded-lg">
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-slate-600">Subtotal:</span>
            <span>R$ {documentData.totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-slate-600">Descontos:</span>
            <span>R$ 0,00</span>
          </div>
          <div className="flex justify-between items-center border-t border-slate-300 pt-2 mt-2">
            <span className="font-bold text-base uppercase">Total:</span>
            <span className="font-black text-lg">R$ {documentData.totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-16 mt-auto">
        <div className="text-center">
          <div className="border-t-2 border-slate-400 pt-2">
            <p className="font-bold text-sm">Oficina (Técnico Responsável)</p>
            <p className="text-xs text-slate-500">Assinatura / Carimbo</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t-2 border-slate-400 pt-2">
            <p className="font-bold text-sm">Cliente (Aceite)</p>
            <p className="text-xs text-slate-500">{client?.name || documentData.clientName}</p>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-12 text-[10px] text-slate-400">
        Documento gerado por ServiçoPro Cloud ERP em {new Date().toLocaleString("pt-BR")}
      </div>
    </div>
  );
}
