/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Product, Purchase, PurchaseItem, Client } from "../types";
import { ShoppingBag, Truck, FileText, CheckCircle2, Plus, X, ArrowUpRight, TrendingUp, Package, Calendar } from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";

interface PurchasesTabProps {
  tenantId: string;
  products: Product[];
  purchases: Purchase[];
  clients: Client[];
  onAddPurchase: (purchase: Purchase) => void;
  onUpdatePurchase: (purchaseId: string, data: Partial<Purchase>) => void;
  onReceiveInvoice: (purchaseId: string, invoiceNumber: string, dueDate: string, totalAmount?: number, items?: any[]) => Promise<{ success: boolean; error?: string }>;
  onCancelPurchase: (purchaseId: string) => void;
}

export default function PurchasesTab({
  tenantId,
  products,
  purchases,
  clients,
  onAddPurchase,
  onUpdatePurchase,
  onReceiveInvoice,
  onCancelPurchase
}: PurchasesTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [costPrice, setCostPrice] = useState(0);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);

  // States for Receiving Invoice modal
  const [receivingPurchaseId, setReceivingPurchaseId] = useState<string | null>(null);
  const [receivingItems, setReceivingItems] = useState<PurchaseItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // State for ConfirmModal
  const [cancelModalState, setCancelModalState] = useState<{ isOpen: boolean; purchaseId: string; message: string }>({
    isOpen: false,
    purchaseId: "",
    message: ""
  });

  const activeProducts = products.filter(p => p.tenantId === tenantId);
  const tenantPurchases = purchases.filter(p => p.tenantId === tenantId);
  const activeSuppliers = clients.filter(c => c.tenantId === tenantId && c.isActive && (c.partnerType === "Fornecedor" || c.partnerType === "Ambos"));

  const handleAddProductToPurchase = () => {
    if (!selectedProductId) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const existingIndex = purchaseItems.findIndex(item => item.productId === selectedProductId);
    if (existingIndex > -1) {
      const updated = [...purchaseItems];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * updated[existingIndex].costPrice;
      setPurchaseItems(updated);
    } else {
      const newItem: PurchaseItem = {
        productId: selectedProductId,
        name: prod.name,
        quantity: qty,
        costPrice: costPrice > 0 ? costPrice : prod.costPrice,
        totalPrice: qty * (costPrice > 0 ? costPrice : prod.costPrice)
      };
      setPurchaseItems([...purchaseItems, newItem]);
    }

    // Reset temporary states
    setSelectedProductId("");
    setQty(1);
    setCostPrice(0);
  };

  const handleRemoveProductFromPurchase = (idx: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== idx));
  };

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || purchaseItems.length === 0) return;

    const selectedSupplier = activeSuppliers.find(s => s.id === supplierId);
    if (!selectedSupplier) return;

    const totalAmount = purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const newPurchase: Partial<Purchase> = {
      tenantId,
      status: "Pedido",
      supplierId: selectedSupplier.id,
      supplier: selectedSupplier.name,
      items: purchaseItems,
      totalAmount
    };

    if (editingPurchaseId) {
      onUpdatePurchase(editingPurchaseId, newPurchase);
    } else {
      onAddPurchase({
        ...newPurchase,
        id: "purchase-" + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      } as Purchase);
    }

    setShowForm(false);
    // Reset
    setSupplierId("");
    setPurchaseItems([]);
    setEditingPurchaseId(null);
  };

  const handleEditPurchase = (p: Purchase) => {
    setEditingPurchaseId(p.id);
    setSupplierId(p.supplierId);
    setPurchaseItems(p.items);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setSupplierId("");
    setPurchaseItems([]);
    setEditingPurchaseId(null);
  };

  const handleOpenReceiveModal = (id: string) => {
    const purchase = tenantPurchases.find(p => p.id === id);
    setReceivingPurchaseId(id);
    setInvoiceNumber("NF-" + Math.floor(100000 + Math.random() * 900000));
    setReceivingItems(purchase ? [...purchase.items] : []);
  };

  const handleConfirmReceive = async () => {
    if (!receivingPurchaseId || !invoiceNumber || !dueDate) return;
    
    // Concat time so backend can parse it as DateTimeOffset
    const dueDateISO = new Date(`${dueDate}T12:00:00Z`).toISOString();
    const total = receivingItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    const res = await onReceiveInvoice(receivingPurchaseId, invoiceNumber, dueDateISO, total, receivingItems);
    if (res.success) {
      setReceivingPurchaseId(null);
      setInvoiceNumber("");
      setReceivingItems([]);
    }
  };

  // Metrics
  const totalPedidosEmAberto = tenantPurchases.filter(p => p.status === "Pedido").length;
  const valorTotalPedidos = tenantPurchases.filter(p => p.status === "Pedido").reduce((acc, p) => acc + p.totalAmount, 0);
  const pedidosRecebidos = tenantPurchases.filter(p => p.status !== "Pedido").length;

  return (
    <div className="space-y-8" id="purchases_tab_content">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100/50 border border-emerald-200/50 text-emerald-800 text-xs font-semibold mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Gestão de Suprimentos
          </div>
          <h2 className="text-3xl font-sans font-bold text-slate-900 flex items-center gap-3">
            Compras & Almoxarifado
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Abasteça seu estoque realizando pedidos junto a fornecedores homologados. Dê entrada em Notas Fiscais para atualizar custos e alimentar o Kardex em tempo real.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="group relative flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold font-sans shadow-lg shadow-slate-900/20 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
          id="btn_toggle_purchase_form"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Plus className={`w-4 h-4 transition-transform duration-300 ${showForm ? "rotate-45" : ""}`} />
          <span className="relative z-10">{showForm ? "Fechar Painel" : "Novo Pedido de Compra"}</span>
        </button>
      </div>

      {/* METRICS CARDS */}
      {!showForm && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          {/* Card 1 */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Truck className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-md">Trânsito</span>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 font-mono">{totalPedidosEmAberto}</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Pedidos Aguardando Entrega</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-md">Concluídos</span>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 font-mono">{pedidosRecebidos}</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Lotes Recebidos no Estoque</p>
          </div>

          {/* Card 3 */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-xl hover:shadow-2xl shadow-slate-900/20 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
              <TrendingUp className="w-32 h-32 text-white" />
            </div>
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:rotate-12 transition-transform duration-300">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-[10px] font-bold tracking-wider text-white/60 uppercase bg-white/5 px-2 py-1 rounded-md border border-white/10">Comprometido</span>
            </div>
            <h3 className="text-3xl font-bold text-white font-mono relative z-10">R$ {valorTotalPedidos.toLocaleString('pt-BR', {minimumFractionDigits:2})}</h3>
            <p className="text-xs text-white/60 mt-1 font-medium relative z-10">Total em Pedidos Abertos</p>
          </div>
        </div>
      )}

      {/* COMPRAS FORM */}
      {showForm && (
        <div className="bg-white border border-slate-200/80 p-8 rounded-2xl shadow-lg animate-fade-in relative overflow-hidden" id="purchase_form_container">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <Package className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-sans font-bold text-slate-900">
                Lançamento de Pedido
              </h3>
              <p className="text-xs text-slate-500">Preencha os dados do fornecedor e os itens solicitados.</p>
            </div>
          </div>

          <form onSubmit={handleSavePurchase} className="space-y-8">
            <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100">
              <label className="block text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">Selecione o Fornecedor Homologado *</label>
              <select
                required
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full p-3.5 bg-white border border-slate-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              >
                <option value="">Selecione um parceiro de negócios...</option>
                {activeSuppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (CNPJ/CPF: {s.document})</option>
                ))}
              </select>
            </div>

            {/* Insertion Box */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h4 className="text-sm font-sans font-bold text-slate-800 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-indigo-500" />
                  Itens do Pedido
                </h4>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-6">
                  <div className="md:col-span-5">
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">Produto do Catálogo</label>
                    <select value={selectedProductId} onChange={e=>{
                      setSelectedProductId(e.target.value);
                      const p = products.find(item => item.id === e.target.value);
                      if (p) setCostPrice(p.costPrice);
                    }} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all">
                      <option value="">Pesquisar produto...</option>
                      {activeProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Estoque atual: {p.currentStock})</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">Custo Negociado (R$)</label>
                    <input type="number" step="0.01" min="0" value={costPrice} onChange={e=>setCostPrice(Number(e.target.value))} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">Quantidade</label>
                    <input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                  </div>
                  <div className="md:col-span-2">
                    <button type="button" onClick={handleAddProductToPurchase} className="w-full flex items-center justify-center gap-2 p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                      Inserir
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                {purchaseItems.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Produto</th>
                          <th className="px-4 py-3 text-right">Custo Unit.</th>
                          <th className="px-4 py-3 text-center">Qtd.</th>
                          <th className="px-4 py-3 text-right">Subtotal</th>
                          <th className="px-4 py-3 text-center">Remover</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {purchaseItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-600">R$ {item.costPrice.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">{item.quantity}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">R$ {item.totalPrice.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                            <td className="px-4 py-3 text-center">
                              <button type="button" onClick={() => handleRemoveProductFromPurchase(idx)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                <X className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                    <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500">Nenhum item adicionado ao pedido.</p>
                    <p className="text-xs text-slate-400 mt-1">Utilize os campos acima para buscar produtos.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Total value display */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-xl flex flex-col sm:flex-row justify-between items-center shadow-lg shadow-slate-900/10">
              <div className="flex items-center gap-3 mb-2 sm:mb-0">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-[10px] font-mono text-white/60 uppercase tracking-wider">Valor Estimado do Pedido</h4>
                  <p className="text-xs text-white/80">Este valor será provisionado no Financeiro após o recebimento.</p>
                </div>
              </div>
              <span className="text-3xl text-emerald-400 font-mono font-bold">
                R$ {purchaseItems.reduce((sum, i) => sum + i.totalPrice, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={()=>setShowForm(false)} className="px-6 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-colors">
                Cancelar e Voltar
              </button>
              <button type="submit" disabled={purchaseItems.length === 0} className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md shadow-emerald-600/20 transition-all hover:-translate-y-0.5">
                Salvar Pedido de Compra
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ACTIVE MODAL RECEIVE XML */}
      {receivingPurchaseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col border border-slate-200/50 max-h-[90vh]">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-sans font-bold">Entrada de Mercadoria (NF-e)</h3>
                    <p className="text-xs text-white/80 font-medium">Faça upload do XML ou confira os itens manualmente.</p>
                  </div>
                </div>
                <button onClick={() => {
                  setReceivingPurchaseId(null);
                  setReceivingItems([]);
                }} className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left Column: Data */}
                <div className="flex-1 space-y-4">
                  <div className="bg-indigo-50 border border-indigo-200 border-dashed rounded-xl p-4 text-center hover:bg-indigo-100 transition-colors">
                    <label className="cursor-pointer block">
                      <div className="w-10 h-10 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center mx-auto mb-2">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-indigo-900 block">Importar XML da NF-e</span>
                      <span className="text-xs text-indigo-700 mb-3 block">Preenche os dados automaticamente</span>
                      <span className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors text-xs">
                        Escolher Arquivo XML
                      </span>
                      <input type="file" accept=".xml" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const xmlStr = event.target?.result as string;
                          const parser = new DOMParser();
                          const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
                          
                          const nNF = xmlDoc.getElementsByTagName("nNF")[0]?.textContent;
                          if (nNF) setInvoiceNumber(nNF);
                          
                          // Match items
                          const dets = xmlDoc.getElementsByTagName("det");
                          const updatedItems = [...receivingItems];
                          let matchedCount = 0;
                          
                          for (let i = 0; i < dets.length; i++) {
                            const det = dets[i];
                            const xProd = det.getElementsByTagName("xProd")[0]?.textContent?.toUpperCase() || "";
                            const qCom = parseFloat(det.getElementsByTagName("qCom")[0]?.textContent || "0");
                            const vUnCom = parseFloat(det.getElementsByTagName("vUnCom")[0]?.textContent || "0");
                            
                            // Simple heuristic: match by finding parts of the name or just sequentially if it's identical
                            // We will try to find an exact word match or update the i-th item if lengths match
                            let targetIdx = updatedItems.findIndex(it => xProd.includes(it.name.toUpperCase()) || it.name.toUpperCase().includes(xProd));
                            if (targetIdx === -1 && dets.length === updatedItems.length) {
                              targetIdx = i; // fallback to sequential if lengths match
                            }
                            
                            if (targetIdx > -1) {
                              updatedItems[targetIdx].quantity = qCom;
                              updatedItems[targetIdx].costPrice = vUnCom;
                              updatedItems[targetIdx].totalPrice = qCom * vUnCom;
                              matchedCount++;
                            }
                          }
                          setReceivingItems(updatedItems);
                          alert(`XML lido com sucesso. ${matchedCount} iten(s) conciliado(s). Revise a tabela abaixo.`);
                        };
                        reader.readAsText(file);
                      }} />
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase font-bold text-slate-500 mb-2">N. da Nota Fiscal</label>
                    <input type="text" value={invoiceNumber} onChange={e=>setInvoiceNumber(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase font-bold text-slate-500 mb-2">Vencimento da Fatura</label>
                    <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all" />
                  </div>
                  
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <p className="text-[10px] font-mono text-amber-600 uppercase font-bold mb-1">Valor Total da Entrada</p>
                    <p className="text-2xl font-bold text-amber-700">
                      R$ {receivingItems.reduce((s, i) => s + i.totalPrice, 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}
                    </p>
                  </div>
                </div>

                {/* Right Column: Items Conference */}
                <div className="flex-[2] border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <h4 className="text-xs font-sans font-bold text-slate-800">Conferência de Itens</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-white font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Produto</th>
                          <th className="px-4 py-3 w-24">Qtd. Real</th>
                          <th className="px-4 py-3 w-32">Custo NF (R$)</th>
                          <th className="px-4 py-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {receivingItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{item.name}</td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" 
                                min="0" step="0.001"
                                className="w-full p-1.5 text-xs border border-slate-200 rounded font-mono"
                                value={item.quantity}
                                onChange={(e) => {
                                  const upd = [...receivingItems];
                                  upd[idx].quantity = Number(e.target.value);
                                  upd[idx].totalPrice = upd[idx].quantity * upd[idx].costPrice;
                                  setReceivingItems(upd);
                                }}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" 
                                min="0" step="0.01"
                                className="w-full p-1.5 text-xs border border-slate-200 rounded font-mono"
                                value={item.costPrice}
                                onChange={(e) => {
                                  const upd = [...receivingItems];
                                  upd[idx].costPrice = Number(e.target.value);
                                  upd[idx].totalPrice = upd[idx].quantity * upd[idx].costPrice;
                                  setReceivingItems(upd);
                                }}
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 text-xs">
                              R$ {item.totalPrice.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button onClick={() => {
                  setReceivingPurchaseId(null);
                  setReceivingItems([]);
                }} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors">
                  Cancelar
                </button>
                <button onClick={handleConfirmReceive} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5">
                  Confirmar Entrada e Gerar Contas a Pagar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER LIST */}
      {!showForm && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-fade-in">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-sans font-bold text-slate-800 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-slate-400" />
              Histórico de Pedidos
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-white font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Fornecedor</th>
                  <th className="px-6 py-4 font-semibold">Resumo dos Itens</th>
                  <th className="px-6 py-4 font-semibold text-right">Valor Total</th>
                  <th className="px-6 py-4 font-semibold">Nota Fiscal / Chave</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tenantPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-sans font-bold text-slate-800">{p.supplier}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {p.id.split('-')[1]}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-slate-600 font-sans font-medium text-xs truncate" title={p.items.map(item => `${item.quantity}x ${item.name}`).join(", ")}>
                        {p.items.map(item => `${item.quantity}x ${item.name}`).join(", ")}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{p.items.length} tipo(s) de produto</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md whitespace-nowrap">
                        R$ {p.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {p.invoiceNumber ? (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="font-mono text-xs font-semibold">{p.invoiceNumber}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 border border-slate-200 border-dashed px-2 py-0.5 rounded-full">
                          Aguardando
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                        p.status === "Pedido" 
                          ? "bg-amber-50 text-amber-600 border-amber-200" 
                          : p.status === "Cancelado" 
                            ? "bg-rose-50 text-rose-600 border-rose-200"
                            : "bg-emerald-50 text-emerald-600 border-emerald-200"
                      }`}>
                        {p.status === "Pedido" ? (
                          <><Truck className="w-3 h-3" /> Trânsito</>
                        ) : p.status === "Cancelado" ? (
                          <><X className="w-3 h-3" /> Cancelado</>
                        ) : (
                          <><CheckCircle2 className="w-3 h-3" /> Recebido</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(p.status === "Pedido" || p.status === "NF Recebida") ? (
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {p.status === "Pedido" && (
                            <>
                              <button
                                onClick={() => handleEditPurchase(p)}
                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar Pedido"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                              </button>
                              <button
                                onClick={() => handleOpenReceiveModal(p.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow-sm transition-all hover:-translate-y-0.5"
                              >
                                Dar Entrada
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              const isReceived = p.status === "NF Recebida";
                              const msg = isReceived 
                                ? "Tem certeza que deseja estornar esta Entrada?\n\nO estoque recebido será revertido e o Contas a Pagar será excluído. O pedido retornará para o status 'Em Trânsito'."
                                : "Deseja realmente cancelar este pedido de compra?";
                                
                              setCancelModalState({
                                isOpen: true,
                                purchaseId: p.id,
                                message: msg
                              });
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Cancelar Pedido"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">--</span>
                      )}
                    </td>
                  </tr>
                ))}
                {tenantPurchases.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                        <ShoppingBag className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-sm font-semibold text-slate-600">Nenhum pedido de compra</p>
                      <p className="text-xs text-slate-400 mt-1">Clique no botão "Novo Pedido de Compra" para começar.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={cancelModalState.isOpen}
        title="Confirmar Cancelamento"
        message={cancelModalState.message}
        onConfirm={() => {
          onCancelPurchase(cancelModalState.purchaseId);
          setCancelModalState({ isOpen: false, purchaseId: "", message: "" });
        }}
        onCancel={() => setCancelModalState({ isOpen: false, purchaseId: "", message: "" })}
      />
    </div>
  );
}
