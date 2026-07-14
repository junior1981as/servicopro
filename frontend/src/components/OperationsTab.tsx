/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Client, Asset, Product, Service, Schedule, Budget, BudgetItem, WorkOrder, WorkOrderItem, FinancialTransaction, Employee 
} from "../types";
import { ConfirmModal } from "./ConfirmModal";
import { 
  Calendar, FileSignature, ClipboardCopy, Plus, Check, ArrowRight, X, AlertCircle, ShoppingCart, Percent, UserCheck, ShieldAlert, RefreshCw 
} from "lucide-react";
import { AlertModal, AlertType } from "./AlertModal";

interface OperationsTabProps {
  tenantId: string;
  clients: Client[];
  assets: Asset[];
  products: Product[];
  services: Service[];
  employees: Employee[];
  schedules: Schedule[];
  budgets: Budget[];
  workOrders: WorkOrder[];
  onAddSchedule: (s: Schedule) => void;
  onUpdateScheduleStatus: (id: string, status: "Agendado" | "Cancelado" | "Em OS", woId?: string) => void;
  onAddBudget: (b: Budget) => void;
  onUpdateBudgetStatus: (id: string, status: "Rascunho" | "Enviado" | "Aprovado" | "Rejeitado" | "Cancelado", woId?: string) => void;
  onAddWorkOrder: (wo: WorkOrder) => any;
  onUpdateWorkOrder: (wo: WorkOrder) => Promise<{success: boolean, error?: string}>;
  onCloseWorkOrder: (id: string, discount: number) => Promise<{ success: boolean; error?: string }>;
  onCancelWorkOrder: (id: string) => void;
  onDeleteWorkOrder: (id: string) => void;
  onPrint: (doc: Budget | WorkOrder, type: "budget" | "workorder") => void;
  initialOpenOperation?: { type: 'budget' | 'workorder' | 'schedule_to_budget' | 'schedule_to_os', id: string } | null;
  onClearOpenOperation?: () => void;
  onUpdateSchedule?: (s: Schedule) => void;
}

export default function OperationsTab({
  tenantId,
  clients,
  assets,
  products,
  services,
  employees,
  schedules,
  budgets,
  workOrders,
  onAddSchedule,
  onUpdateScheduleStatus,
  onAddBudget,
  onUpdateBudgetStatus,
  onAddWorkOrder,
  onUpdateWorkOrder,
  onCloseWorkOrder,
  onCancelWorkOrder,
  onDeleteWorkOrder,
  onPrint,
  initialOpenOperation,
  onClearOpenOperation,
  onUpdateSchedule
}: OperationsTabProps) {
  const [opSubTab, setOpSubTab] = useState<"workorders" | "budgets">("workorders");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [confirmDeleteOSId, setConfirmDeleteOSId] = useState<string | null>(null);

  // Alert Modal State
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertConfig({ isOpen: true, type, title, message });
  };

  // General selection helper states
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");

  // Schedule creation state
  const [schedDate, setSchedDate] = useState("");
  const [schedNotes, setSchedNotes] = useState("");
  const [schedIdToPromote, setSchedIdToPromote] = useState<string | null>(null);

  // Budget creation states
  const [budgetNotes, setBudgetNotes] = useState("");
  const [budgetEvaluatorId, setBudgetEvaluatorId] = useState("");
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [tempItemType, setTempItemType] = useState<"product" | "service">("product");
  const [tempItemId, setTempItemId] = useState("");
  const [tempItemQty, setTempItemQty] = useState(1);

  // OS creation states
  const [osOpeningKm, setOsOpeningKm] = useState("");
  const [osDiagnosis, setOsDiagnosis] = useState("");
  const [osChecklist, setOsChecklist] = useState(false);
  const [osTechNotes, setOsTechNotes] = useState("");
  const [osItems, setOsItems] = useState<WorkOrderItem[]>([]);

  // Selected active OS detail view/edit
  const [editingOsId, setEditingOsId] = useState<string | null>(null);
  const [showStartExecutionModal, setShowStartExecutionModal] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [viewingBudgetId, setViewingBudgetId] = useState<string | null>(null);
  const [viewingScheduleId, setViewingScheduleId] = useState<string | null>(null);
  
  // OS Closing State
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [closingOsId, setClosingOsId] = useState<string | null>(null);
  const [osDiscount, setOsDiscount] = useState<number>(0);
  const [selectedOsAddType, setSelectedOsAddType] = useState<"product" | "service">("product");
  const [selectedOsAddId, setSelectedOsAddId] = useState("");
  const [selectedOsAddQty, setSelectedOsAddQty] = useState(1);

  // Live timer for elapsed times
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsedTime = (startDateStr?: string) => {
    if (!startDateStr) return "--";
    const start = new Date(startDateStr).getTime();
    if (isNaN(start)) return "--";
    const diff = Math.max(0, now - start);
    const m = Math.floor(diff / 60000);
    const h = Math.floor(m / 60);
    const days = Math.floor(h / 24);
    if (days > 0) return `${days}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  const handleWhatsAppNotify = (wo: WorkOrder) => {
    const client = clients.find(c => c.id === wo.clientId);
    if (!client || !client.phone) {
      showAlert('error', 'Telefone não encontrado', 'O telefone do cliente não foi encontrado no cadastro.');
      return;
    }
    const phone = client.phone.replace(/\D/g, '');
    const osNumber = wo.codigo ? `OS-${wo.codigo.toString().padStart(4, '0')}` : `#${wo.id.substring(0,6)}`;
    const msg = encodeURIComponent(`Olá ${wo.clientName}, os serviços na sua ${osNumber} (${wo.assetName}) foram concluídos e o veículo já está disponível para retirada!`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
  };

  // Handle incoming request to open a specific operation
  useEffect(() => {
    if (initialOpenOperation) {
      if (initialOpenOperation.type === 'budget') {
        setOpSubTab("budgets");
        setViewingBudgetId(initialOpenOperation.id);
      } else if (initialOpenOperation.type === 'workorder') {
        setOpSubTab("workorders");
        setEditingOsId(initialOpenOperation.id);
      } else if (initialOpenOperation.type === 'schedule_to_budget') {
        const sched = schedules.find(s => s.id === initialOpenOperation.id);
        if (sched) handlePromoteScheduleToBudget(sched);
      } else if (initialOpenOperation.type === 'schedule_to_os') {
        const sched = schedules.find(s => s.id === initialOpenOperation.id);
        if (sched) handlePromoteScheduleToOS(sched);
      }
      if (onClearOpenOperation) onClearOpenOperation();
    }
  }, [initialOpenOperation, onClearOpenOperation]);

  const activeClients = clients.filter(c => c.tenantId === tenantId);
  const activeAssets = assets.filter(a => a.tenantId === tenantId && (selectedClientId ? a.clientId === selectedClientId : true));
  const activeProducts = products.filter(p => p.tenantId === tenantId);
  const activeServices = services.filter(s => s.tenantId === tenantId);

  // Sub-tab filtered lists
  const tenantSchedules = schedules.filter(s => s.tenantId === tenantId);
  const tenantBudgets = budgets.filter(b => b.tenantId === tenantId);
  const tenantWorkOrders = workOrders.filter(w => w.tenantId === tenantId);

  // --- Handlers ---
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
    resetFormStates();
  };

  const handlePromoteScheduleToOS = async (sched: Schedule) => {
    // Generates OS directly from Agenda schedule
    const newOS: WorkOrder = {
      id: Math.floor(100000 + Math.random() * 900000).toString(),
      tenantId,
      clientId: sched.clientId,
      clientName: sched.clientName,
      assetId: sched.assetId,
      assetName: sched.assetName,
      status: "Aberta",
      items: [],
      totalCost: 0,
      totalPrice: 0,
      marginPercent: 0,
      diagnosis: `Gerada da agenda. Reclamação: ${sched.description}`,
      checklistPassed: false,
      technicianNotes: "",
      createdAt: new Date().toISOString()
    };

    try {
      const res = await onAddWorkOrder(newOS);
      const generatedId = res?.id || newOS.id;
      onUpdateScheduleStatus(sched.id, "Em OS", generatedId);
      setOpSubTab("workorders");
      setEditingOsId(generatedId);
    } catch (e) { console.error(e); }
  };

  const handlePromoteScheduleToBudget = (sched: Schedule) => {
    // Instead of auto-generating an empty budget, we open the Create Form pre-filled
    setSelectedClientId(sched.clientId);
    setSelectedAssetId(sched.assetId);
    setBudgetNotes(`Orçamento referente ao agendamento. Reclamação: ${sched.description}`);
    setSchedIdToPromote(sched.id);
    
    setOpSubTab("budgets");
    setShowCreateForm(true);
    setEditingOsId(null);
  };

  const handleReschedule = (s: Schedule) => {
    if (!onUpdateSchedule) return;
    const newDate = prompt("Digite a nova data/hora para reagendamento (Ex: 2026-07-15 10:00):", s.dateTime.replace("T", " "));
    if (newDate) {
      onUpdateSchedule({
        ...s,
        dateTime: newDate.replace(" ", "T")
      });
      showAlert('success', 'Agenda Atualizada', 'A data do agendamento foi alterada com sucesso.');
    }
  };

  const handleEnterAsTab = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA' && (e.target as HTMLElement).tagName !== 'BUTTON') {
      e.preventDefault();
      const form = e.currentTarget;
      const elements = Array.from(form.querySelectorAll('input, select, button, textarea')).filter(el => {
        const hEl = el as HTMLElement;
        return !(hEl as any).disabled && hEl.tabIndex !== -1 && hEl.offsetParent !== null;
      });
      const index = elements.indexOf(e.target as HTMLElement);
      if (index > -1 && index < elements.length - 1) {
        (elements[index + 1] as HTMLElement).focus();
      }
    }
  };

  // Add Item to Budget Form
  const handleAddBudgetItem = () => {
    if (!tempItemId) return;

    let itemCost = 0;
    let itemPrice = 0;
    let itemName = "";

    if (tempItemType === "product") {
      const prod = products.find(p => p.id === tempItemId);
      if (prod) {
        itemCost = prod.costPrice;
        itemPrice = prod.sellingPrice;
        itemName = prod.name;
      }
    } else {
      const serv = services.find(s => s.id === tempItemId);
      if (serv) {
        itemCost = serv.cost;
        itemPrice = serv.price;
        itemName = serv.name;
      }
    }

    const newItem: BudgetItem = {
      id: "bi-" + Math.random().toString(36).substr(2, 9),
      type: tempItemType,
      itemId: tempItemId,
      name: itemName,
      quantity: tempItemQty,
      unitCost: itemCost,
      unitPrice: itemPrice,
      totalCost: itemCost * tempItemQty,
      totalPrice: itemPrice * tempItemQty
    };

    setBudgetItems([...budgetItems, newItem]);
    setTempItemId("");
    setTempItemQty(1);
  };

  const handleRemoveBudgetItem = (idx: number) => {
    setBudgetItems(budgetItems.filter((_, i) => i !== idx));
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedAssetId) return;

    const clientObj = clients.find(c => c.id === selectedClientId);
    const assetObj = assets.find(a => a.id === selectedAssetId);

    const totalCost = budgetItems.reduce((sum, item) => sum + item.totalCost, 0);
    const totalPrice = budgetItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const marginPercent = totalPrice > 0 ? Number((((totalPrice - totalCost) / totalPrice) * 100).toFixed(1)) : 0;

    const newBudget: Budget = {
      id: Math.floor(100000 + Math.random() * 900000).toString(),
      tenantId,
      clientId: selectedClientId,
      clientName: clientObj?.name || "",
      assetId: selectedAssetId,
      assetName: assetObj?.name || "",
      technicianId: budgetEvaluatorId || undefined,
      technicianName: budgetEvaluatorId ? employees.find(e => e.id === budgetEvaluatorId)?.nome : undefined,
      status: "Rascunho",
      items: budgetItems,
      totalCost,
      totalPrice,
      marginPercent,
      notes: budgetNotes,
      createdAt: new Date().toISOString()
    };

    onAddBudget(newBudget);
    
    if (schedIdToPromote) {
      onUpdateScheduleStatus(schedIdToPromote, "Em OS");
      setSchedIdToPromote(null);
    }
    
    setShowCreateForm(false);
    resetFormStates();
  };

  // WhatsApp Budget Sending
  const handleSendWhatsApp = (budget: Budget) => {
    const client = clients.find(c => c.id === budget.clientId);
    const phone = client?.phone ? client.phone.replace(/\D/g, '') : "";

    const itemsText = budget.items.map(item => 
      `- ${item.quantity}x ${item.name} | R$ ${item.totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    ).join('\n');

    const message = `[SERVIÇOPRO OFICINA]
Olá, ${client?.name?.split(' ')[0] || 'Cliente'}! Segue o seu orçamento detalhado:

*Veículo/Ativo:* ${budget.assetName}

*Itens e Serviços:*
${itemsText}

*Valor Total:* R$ ${budget.totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}

*Observações:* ${budget.notes || "Orçamento válido por 10 dias."}

Você aprova este orçamento para darmos andamento?`;

    onUpdateBudgetStatus(budget.id, "Enviado");

    const encodedMessage = encodeURIComponent(message);
    const waUrl = phone ? `https://wa.me/55${phone}?text=${encodedMessage}` : `https://api.whatsapp.com/send?text=${encodedMessage}`;
    window.open(waUrl, "_blank");
  };

  // Budget Approve ➔ Promote to OS Aberta
  const handleApproveBudget = async (budget: Budget) => {
    // Generate OS copying all items
    const osItemsConverted: WorkOrderItem[] = budget.items.map(bi => ({
      id: "woi-" + Math.random().toString(36).substr(2, 9),
      type: bi.type,
      itemId: bi.itemId,
      name: bi.name,
      quantity: bi.quantity,
      unitCost: bi.unitCost,
      unitPrice: bi.unitPrice,
      totalCost: bi.totalCost,
      totalPrice: bi.totalPrice,
      isDelivered: bi.type === "service" // services are automatically 'delivered', products are reserved
    }));

    const newOS: WorkOrder = {
      id: Math.floor(100000 + Math.random() * 900000).toString(),
      tenantId,
      clientId: budget.clientId,
      clientName: budget.clientName,
      assetId: budget.assetId,
      assetName: budget.assetName,
      budgetId: budget.id, // Traceability!
      status: "Aberta",
      items: osItemsConverted,
      totalCost: budget.totalCost,
      totalPrice: budget.totalPrice,
      marginPercent: budget.marginPercent,
      diagnosis: `Gerada do orçamento aprovado ${budget.codigo ? `ORÇ-${budget.codigo.toString().padStart(4, '0')}` : budget.id.substring(0,8)}. Notes: ${budget.notes}`,
      checklistPassed: false,
      technicianNotes: "Aguardando início de execução dos serviços.",
      createdAt: new Date().toISOString()
    };

    try {
      const res = await onAddWorkOrder(newOS);
      const generatedId = res?.id || newOS.id;
      onUpdateBudgetStatus(budget.id, "Aprovado", generatedId);
      setOpSubTab("workorders");
      setEditingOsId(generatedId);
    } catch (e) { console.error(e); }
  };

  // Direct WorkOrder Creation Form Handlers
  const handleAddDirectOSItem = () => {
    if (!tempItemId) return;

    let itemCost = 0;
    let itemPrice = 0;
    let itemName = "";

    if (tempItemType === "product") {
      const prod = products.find(p => p.id === tempItemId);
      if (prod) {
        itemCost = prod.costPrice;
        itemPrice = prod.sellingPrice;
        itemName = prod.name;
      }
    } else {
      const serv = services.find(s => s.id === tempItemId);
      if (serv) {
        itemCost = serv.cost;
        itemPrice = serv.price;
        itemName = serv.name;
      }
    }

    const newItem: WorkOrderItem = {
      id: "woi-" + Math.random().toString(36).substr(2, 9),
      type: tempItemType,
      itemId: tempItemId,
      name: itemName,
      quantity: tempItemQty,
      unitCost: itemCost,
      unitPrice: itemPrice,
      totalCost: itemCost * tempItemQty,
      totalPrice: itemPrice * tempItemQty,
      isDelivered: tempItemType === "service"
    };

    setOsItems([...osItems, newItem]);
    setTempItemId("");
    setTempItemQty(1);
  };

  const handleSaveDirectOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedAssetId) return;

    const clientObj = clients.find(c => c.id === selectedClientId);
    const assetObj = assets.find(a => a.id === selectedAssetId);

    const totalCost = osItems.reduce((sum, item) => sum + item.totalCost, 0);
    const totalPrice = osItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const marginPercent = totalPrice > 0 ? Number((((totalPrice - totalCost) / totalPrice) * 100).toFixed(1)) : 0;

    const newOS: WorkOrder = {
      id: Math.floor(100000 + Math.random() * 900000).toString(),
      tenantId,
      clientId: selectedClientId,
      clientName: clientObj?.name || "",
      assetId: selectedAssetId,
      assetName: assetObj?.name || "",
      status: "Aberta",
      items: osItems,
      totalCost,
      totalPrice,
      marginPercent,
      diagnosis: osDiagnosis,
      openingKm: osOpeningKm ? parseInt(osOpeningKm) : undefined,
      checklistPassed: osChecklist,
      technicianNotes: osTechNotes,
      createdAt: new Date().toISOString()
    };

    try {
      await onAddWorkOrder(newOS);
      setShowCreateForm(false);
      resetFormStates();
    } catch (e) { console.error(e); }
  };

  // --- Live Editing of Existing WorkOrder ---
  const [isAddingItem, setIsAddingItem] = useState(false);

  const handleAddActiveOSItem = async (os: WorkOrder) => {
    if (!selectedOsAddId) return;
    if (isAddingItem) return;

    setIsAddingItem(true);
    try {
      let itemCost = 0;
      let itemPrice = 0;
      let itemName = "";

      if (selectedOsAddType === "product") {
        const prod = products.find(p => p.id === selectedOsAddId);
        if (prod) {
          itemCost = prod.costPrice;
          itemPrice = prod.sellingPrice;
          itemName = prod.name;
        }
      } else {
        const serv = services.find(s => s.id === selectedOsAddId);
        if (serv) {
          itemCost = serv.cost;
          itemPrice = serv.price;
          itemName = serv.name;
        }
      }

      const newItem: WorkOrderItem = {
        id: "woi-" + Math.random().toString(36).substr(2, 9),
        type: selectedOsAddType,
        itemId: selectedOsAddId,
        name: itemName,
        quantity: selectedOsAddQty,
        unitCost: itemCost,
        unitPrice: itemPrice,
        totalCost: itemCost * selectedOsAddQty,
        totalPrice: itemPrice * selectedOsAddQty,
        isDelivered: selectedOsAddType === "service"
      };

      const updatedItems = [...os.items, newItem];
      const totalCost = updatedItems.reduce((sum, item) => sum + item.totalCost, 0);
      const totalPrice = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const marginPercent = totalPrice > 0 ? Number((((totalPrice - totalCost) / totalPrice) * 100).toFixed(1)) : 0;

      await onUpdateWorkOrder({
        ...os,
        items: updatedItems,
        totalCost,
        totalPrice,
        marginPercent
      });

      setSelectedOsAddId("");
      setSelectedOsAddQty(1);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleToggleItemDelivered = (os: WorkOrder, itemId: string) => {
    const updatedItems = os.items.map(item => {
      if (item.id === itemId) {
        return { ...item, isDelivered: !item.isDelivered };
      }
      return item;
    });

    onUpdateWorkOrder({
      ...os,
      items: updatedItems
    });
  };

  const handleRemoveActiveOSItem = (os: WorkOrder, itemIndex: number) => {
    const updatedItems = os.items.filter((_, i) => i !== itemIndex);
    const totalCost = updatedItems.reduce((sum, item) => sum + item.totalCost, 0);
    const totalPrice = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const marginPercent = totalPrice > 0 ? Number((((totalPrice - totalCost) / totalPrice) * 100).toFixed(1)) : 0;

    onUpdateWorkOrder({
      ...os,
      items: updatedItems,
      totalCost,
      totalPrice,
      marginPercent
    });
  };

  const handleSaveActiveOSMetadata = async (os: WorkOrder) => {
    const res = await onUpdateWorkOrder(os);
    if (res.success) {
      showAlert('success', 'Metadados Salvos', 'Metadados da OS salvos com sucesso!');
    }
  };

  const handleCloseOSFlow = async () => {
    if (!closingOsId) return;
    const res = await onCloseWorkOrder(closingOsId, osDiscount);
    if (res.success) {
      showAlert('success', 'Ordem de Serviço Fechada', "Ordem de Serviço fechada com sucesso!\n\n1. O estoque físico das peças foi deduzido.\n2. Foi gerada uma conta a receber automaticamente com o desconto aplicado.\n3. Foi enviada uma pré-nota fiscal eletrônica estruturada.");
      setEditingOsId(null);
      setShowCloseModal(false);
    } else {
      showAlert('error', 'Erro ao fechar OS', res.error || "Ocorreu um erro desconhecido.");
    }
  };

  const handleCancelOSFlow = (osId: string) => {
    if (confirm("Deseja realmente CANCELAR esta Ordem de Serviço? Qualquer reserva de peças será liberada e contas associadas serão canceladas.")) {
      onCancelWorkOrder(osId);
      setEditingOsId(null);
    }
  };

  const resetFormStates = () => {
    setSelectedClientId("");
    setSelectedAssetId("");
    setSchedDate("");
    setSchedNotes("");
    setBudgetNotes("");
    setBudgetEvaluatorId("");
    setBudgetItems([]);
    setOsDiagnosis("");
    setOsChecklist(false);
    setOsTechNotes("");
    setOsItems([]);
    setTempItemType("product");
    setTempItemId("");
    setTempItemQty(1);
    setSchedIdToPromote(null);
  };

  return (
    <div className="space-y-6" id="operations_tab_content">
      {/* Tab Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex gap-2 overflow-x-auto bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => { setOpSubTab("workorders"); setEditingOsId(null); setViewingBudgetId(null); setViewingScheduleId(null); setShowCreateForm(false); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold font-sans transition-all ${
              opSubTab === "workorders" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
            id="subtab_wo_btn"
          >
            <ClipboardCopy className="w-3.5 h-3.5 text-slate-500" />
            Ordens de Serviço ({tenantWorkOrders.length})
          </button>
          <button
            onClick={() => { setOpSubTab("budgets"); setEditingOsId(null); setViewingBudgetId(null); setViewingScheduleId(null); setShowCreateForm(false); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold font-sans transition-all ${
              opSubTab === "budgets" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
            id="subtab_budgets_btn"
          >
            <FileSignature className="w-3.5 h-3.5 text-slate-500" />
            Orçamentos ({tenantBudgets.length})
          </button>
        </div>

        <button
          onClick={() => { setShowCreateForm(!showCreateForm); setEditingOsId(null); resetFormStates(); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold font-sans shadow-sm transition-colors"
          id="btn_create_new_op"
        >
          <Plus className="w-4 h-4" />
          {showCreateForm ? "Fechar Lançamento" : "Criar Nova Operação"}
        </button>
      </div>

      {/* CREATE FORMS CONDITIONAL */}
      {showCreateForm && (
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl animate-fade-in" id="operations_create_form">
          <h3 className="text-sm font-sans font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-slate-900 rounded-full inline-block"></span>
            Lançar Novo(a) {opSubTab === "budgets" ? "Orçamento" : "Ordem de Serviço (OS)"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Cliente *</label>
              <select required value={selectedClientId} onChange={e=>{ setSelectedClientId(e.target.value); setSelectedAssetId(""); }} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs">
                <option value="">Selecione o Cliente...</option>
                {activeClients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.document})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Equipamento / Ativo *</label>
              <select required value={selectedAssetId} onChange={e=>setSelectedAssetId(e.target.value)} disabled={!selectedClientId} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs disabled:opacity-50">
                <option value="">Selecione o Equipamento...</option>
                {activeAssets.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.brand} - {a.serialNumber})</option>
                ))}
              </select>
            </div>
          </div>

          {/* AGENDA FORM */}
          {opSubTab === "schedules" && (
            <form onSubmit={handleSaveSchedule} onKeyDown={handleEnterAsTab} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Data & Hora Agendada *</label>
                  <input required type="datetime-local" value={schedDate} onChange={e=>setSchedDate(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Reclamação Principal do Cliente</label>
                  <input type="text" placeholder="ex: Ruído na ventoinha / Vazamento de fluído" value={schedNotes} onChange={e=>setSchedNotes(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={()=>setShowCreateForm(false)} className="px-4 py-2 border border-slate-200 rounded text-xs font-semibold bg-white text-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-semibold">Salvar Agendamento</button>
              </div>
            </form>
          )}

          {/* BUDGET FORM */}
          {opSubTab === "budgets" && (
            <form onSubmit={handleSaveBudget} onKeyDown={handleEnterAsTab} className="space-y-4">
              {/* Dynamic Item Insertion */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">Peças & Serviços Propostos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400">Tipo de Item</label>
                    <select value={tempItemType} onChange={e=>{ setTempItemType(e.target.value as any); setTempItemId(""); }} className="w-full p-2 border border-slate-200 rounded text-xs mt-1">
                      <option value="product">Peça / Produto</option>
                      <option value="service">Serviço / Mão de Obra</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-mono text-slate-400">Selecionar do Catálogo</label>
                    <select value={tempItemId} onChange={e=>setTempItemId(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-xs mt-1">
                      <option value="">Selecione...</option>
                      {tempItemType === "product" ? (
                        activeProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Venda: R$ {p.sellingPrice} | Saldo: {p.currentStock})</option>
                        ))
                      ) : (
                        activeServices.map(s => (
                          <option key={s.id} value={s.id}>{s.name} (Preço: R$ {s.price})</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-20">
                      <label className="block text-[10px] font-mono text-slate-400">Qtd</label>
                      <input type="number" min="1" value={tempItemQty} onChange={e=>setTempItemQty(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded text-xs mt-1" />
                    </div>
                    <button type="button" onClick={handleAddBudgetItem} className="flex-1 p-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold mt-1">
                      Inserir
                    </button>
                  </div>
                </div>

                {/* Items preview table */}
                <div className="border-t border-slate-100 pt-3">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 font-mono text-[10px]">
                        <th>Item</th>
                        <th>Tipo</th>
                        <th className="text-right">Unitário</th>
                        <th className="text-center">Qtd</th>
                        <th className="text-right">Total</th>
                        <th className="text-center">Remover</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {budgetItems.map((item, index) => (
                        <tr key={item.id}>
                          <td className="py-2 font-semibold text-slate-800">{item.name}</td>
                          <td className="py-2 font-mono text-[10px] text-slate-500 uppercase">{item.type}</td>
                          <td className="py-2 text-right font-mono">R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 text-center font-mono">{item.quantity}</td>
                          <td className="py-2 text-right font-mono font-bold">R$ {item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 text-center">
                            <button type="button" onClick={() => handleRemoveBudgetItem(index)} className="text-rose-600 hover:text-rose-800">
                              <X className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {budgetItems.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">Nenhum item adicionado à lista do orçamento.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Técnico Avaliador (Opcional)</label>
                  <select 
                    value={budgetEvaluatorId} 
                    onChange={e => setBudgetEvaluatorId(e.target.value)} 
                    className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs"
                  >
                    <option value="">-- Selecione o Técnico --</option>
                    {employees.filter(e => e.tenantId === tenantId && e.ativo).map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nome} ({emp.cargo})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Notas Comerciais / Observações de Escopo</label>
                  <textarea rows={2} placeholder="ex: Este orçamento tem validade de 10 dias. Peças com garantia do fabricante..." value={budgetNotes} onChange={e=>setBudgetNotes(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
              </div>

              {/* Real-time Margin & Price computation */}
              <div className="bg-slate-900 text-white p-4 rounded-lg flex justify-between items-center text-xs font-mono">
                <div>
                  <div>Custo Total: <span className="text-slate-400">R$ {budgetItems.reduce((sum,i)=>sum+i.totalCost, 0).toFixed(2)}</span></div>
                  <div>Preço Total: <span className="text-emerald-400 font-bold">R$ {budgetItems.reduce((sum,i)=>sum+i.totalPrice, 0).toFixed(2)}</span></div>
                </div>
                <div className="text-right">
                  <div>Margem Operacional Média:</div>
                  <div className="text-base text-emerald-400 font-bold">
                    {budgetItems.reduce((sum,i)=>sum+i.totalPrice, 0) > 0 
                      ? (((budgetItems.reduce((sum,i)=>sum+i.totalPrice, 0) - budgetItems.reduce((sum,i)=>sum+i.totalCost, 0)) / budgetItems.reduce((sum,i)=>sum+i.totalPrice, 0)) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={()=>setShowCreateForm(false)} className="px-4 py-2 border border-slate-200 rounded text-xs font-semibold bg-white text-slate-700">Cancelar</button>
                <button type="submit" disabled={budgetItems.length === 0} className="px-4 py-2 bg-emerald-600 disabled:opacity-50 text-white rounded text-xs font-semibold">Salvar Rascunho</button>
              </div>
            </form>
          )}

          {/* DIRECT OS FORM */}
          {opSubTab === "workorders" && (
            <form onSubmit={handleSaveDirectOS} onKeyDown={handleEnterAsTab} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">KM de Abertura do Veículo</label>
                  <input type="number" placeholder="ex: 15400" value={osOpeningKm} onChange={e=>setOsOpeningKm(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Diagnóstico Inicial / Reclamação *</label>
                  <input required type="text" placeholder="ex: Troca de pastilhas dianteiras e revisão de fluido" value={osDiagnosis} onChange={e=>setOsDiagnosis(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Observações do Técnico Responsável</label>
                  <input type="text" placeholder="ex: Iniciando testes eletrônicos na injeção" value={osTechNotes} onChange={e=>setOsTechNotes(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input type="checkbox" id="chk_os" checked={osChecklist} onChange={e=>setOsChecklist(e.target.checked)} className="rounded text-slate-900 border-slate-300 focus:ring-0" />
                <label htmlFor="chk_os" className="text-xs text-slate-700 font-medium">Equipamento verificado conforme Checklist de Entrada oficial (Garantia de Não-Regressão)</label>
              </div>

              {/* Dynamic Item Insertion */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">Peças / Serviços Solicitados de Início</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400">Tipo de Item</label>
                    <select value={tempItemType} onChange={e=>{ setTempItemType(e.target.value as any); setTempItemId(""); }} className="w-full p-2 border border-slate-200 rounded text-xs mt-1">
                      <option value="product">Peça / Produto</option>
                      <option value="service">Serviço / Mão de Obra</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-mono text-slate-400">Selecionar do Catálogo</label>
                    <select value={tempItemId} onChange={e=>setTempItemId(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-xs mt-1">
                      <option value="">Selecione...</option>
                      {tempItemType === "product" ? (
                        activeProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Venda: R$ {p.sellingPrice})</option>
                        ))
                      ) : (
                        activeServices.map(s => (
                          <option key={s.id} value={s.id}>{s.name} (Preço: R$ {s.price})</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-20">
                      <label className="block text-[10px] font-mono text-slate-400">Qtd</label>
                      <input type="number" min="1" value={tempItemQty} onChange={e=>setTempItemQty(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded text-xs mt-1" />
                    </div>
                    <button type="button" onClick={handleAddDirectOSItem} className="flex-1 p-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold mt-1">
                      Inserir
                    </button>
                  </div>
                </div>

                {/* Items preview table */}
                <div className="border-t border-slate-100 pt-3">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 font-mono text-[10px]">
                        <th>Item</th>
                        <th>Tipo</th>
                        <th className="text-right">Unitário</th>
                        <th className="text-center">Qtd</th>
                        <th className="text-right">Total</th>
                        <th className="text-center">Remover</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {osItems.map((item, index) => (
                        <tr key={item.id}>
                          <td className="py-2 font-semibold text-slate-800">{item.name}</td>
                          <td className="py-2 font-mono text-[10px] text-slate-500 uppercase">{item.type}</td>
                          <td className="py-2 text-right font-mono">R$ {item.unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 text-center font-mono">{item.quantity}</td>
                          <td className="py-2 text-right font-mono font-bold">R$ {item.totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 text-center">
                            <button type="button" onClick={() => setOsItems(osItems.filter((_, i)=>i !== index))} className="text-rose-600 hover:text-rose-800">
                              <X className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={()=>setShowCreateForm(false)} className="px-4 py-2 border border-slate-200 rounded text-xs font-semibold bg-white text-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-semibold">Salvar OS Aberta</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* DETALHE DA OS SELECIONADA EM EDIÇÃO */}
      {editingOsId && (() => {
        const activeWO = workOrders.find(w => w.id === editingOsId);
        if (!activeWO) return null;

        return (
          <div className="bg-slate-50 border border-indigo-200 p-6 rounded-xl space-y-6 animate-fade-in" id="active_os_panel">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold border border-indigo-200 rounded-md">
                    CÓDIGO OS: {activeWO.codigo ? `OS-${activeWO.codigo.toString().padStart(4, '0')}` : activeWO.numero || activeWO.id.substring(0,8)}
                  </span>
                  {activeWO.budgetId && (
                    <span className="text-[10px] font-mono text-slate-400">
                      Origem: Orçamento {activeWO.budgetId}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-sans font-bold text-slate-900 mt-1">
                  Atendimento: {activeWO.clientName}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Ativo/Equipamento: {activeWO.assetName}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeWO.status === "Aberta" && (
                  <button
                    onClick={() => {
                      if (activeWO.technicianId) {
                        onUpdateWorkOrder({ ...activeWO, status: "Em Execução" });
                      } else {
                        setSelectedTechnicianId("");
                        setShowStartExecutionModal(true);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold"
                  >
                    Iniciar Execução
                  </button>
                )}
                {activeWO.status === "Em Execução" && (
                  <>
                    <button
                      onClick={() => onUpdateWorkOrder({ ...activeWO, status: "Pausada" })}
                      className="px-3.5 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded text-xs font-semibold"
                    >
                      Pausar OS
                    </button>
                    <button
                      onClick={() => {
                        onUpdateWorkOrder({ ...activeWO, status: "Concluída", completedAt: new Date().toISOString() });
                        handleWhatsAppNotify(activeWO);
                      }}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold"
                    >
                      Concluir Serviço
                    </button>
                  </>
                )}
                {activeWO.status === "Pausada" && (
                  <button
                    onClick={() => onUpdateWorkOrder({ ...activeWO, status: "Em Execução" })}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold"
                  >
                    Retomar Execução
                  </button>
                )}
                {activeWO.status === "Concluída" && (
                  <button
                    onClick={() => { setClosingOsId(activeWO.id); setOsDiscount(0); setShowCloseModal(true); }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                  >
                    Faturamento (Fechamento)
                  </button>
                )}
                {activeWO.status !== "Faturada" && activeWO.status !== "Cancelada" && (
                  <>
                    <button
                      onClick={() => handleCancelOSFlow(activeWO.id)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
                    >
                      Cancelar OS
                    </button>
                    {activeWO.status === "Aberta" && (
                      <button
                        onClick={() => setConfirmDeleteOSId(activeWO.id)}
                        className="px-3.5 py-1.5 border border-rose-300 text-rose-600 hover:bg-rose-50 rounded text-xs font-semibold"
                      >
                        Excluir OS
                      </button>
                    )}
                  </>
                )}
                {(activeWO.status === "Faturada" || activeWO.status === "Cancelada") && (
                  <button
                    onClick={() => onUpdateWorkOrder({ ...activeWO, status: "Aberta" })}
                    className="px-3.5 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-xs font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reabrir OS
                  </button>
                )}
                <button
                  onClick={() => onPrint(activeWO, "workorder")}
                  className="px-3.5 py-1.5 border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 rounded text-xs font-semibold flex items-center gap-1"
                >
                  🖨️ Imprimir
                </button>
                <button
                  onClick={() => setEditingOsId(null)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold"
                >
                  Voltar para Lista
                </button>
              </div>
            </div>

            {/* Metadata / Info form */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Técnico Atribuído</label>
                <select
                  value={activeWO.technicianId || ""}
                  disabled={activeWO.status === "Faturada" || activeWO.status === "Cancelada"}
                  onChange={e => {
                    const techId = e.target.value;
                    const tech = employees.find(emp => emp.id === techId);
                    onUpdateWorkOrder({ ...activeWO, technicianId: techId || undefined, technicianName: tech?.nome });
                  }}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs disabled:opacity-75"
                >
                  <option value="">Nenhum Técnico...</option>
                  {employees.filter(e => e.tenantId === tenantId && e.ativo).map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nome} ({emp.cargo})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Abertura da OS</label>
                <input
                  type="datetime-local"
                  value={activeWO.createdAt ? activeWO.createdAt.substring(0, 16) : ""}
                  disabled
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded text-xs text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Início das Atividades</label>
                <input
                  type="datetime-local"
                  value={activeWO.startedAt ? activeWO.startedAt.substring(0, 16) : ""}
                  disabled
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded text-xs text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Término das Atividades</label>
                <input
                  type="datetime-local"
                  value={activeWO.completedAt ? activeWO.completedAt.substring(0, 16) : ""}
                  disabled
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded text-xs text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">KM de Abertura</label>
                <input
                  type="number"
                  placeholder="Ex: 15400"
                  value={activeWO.openingKm || ''}
                  disabled={activeWO.status === "Faturada" || activeWO.status === "Cancelada"}
                  onChange={e => onUpdateWorkOrder({ ...activeWO, openingKm: parseInt(e.target.value) || undefined })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs disabled:opacity-75"
                />
              </div>
            </div>

            {/* Diagnosis / Notes form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Diagnóstico do Ativo</label>
                <textarea
                  rows={2}
                  value={activeWO.diagnosis || ""}
                  disabled={activeWO.status === "Faturada" || activeWO.status === "Cancelada"}
                  onChange={e => onUpdateWorkOrder({ ...activeWO, diagnosis: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs disabled:opacity-75"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Anotações do Técnico</label>
                <textarea
                  rows={2}
                  value={activeWO.technicianNotes || ""}
                  disabled={activeWO.status === "Faturada" || activeWO.status === "Cancelada"}
                  onChange={e => onUpdateWorkOrder({ ...activeWO, technicianNotes: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs disabled:opacity-75"
                />
              </div>
            </div>

            <div className="flex justify-end mb-4">
               <button
                  onClick={() => handleSaveActiveOSMetadata(activeWO)}
                  disabled={activeWO.status === "Faturada" || activeWO.status === "Cancelada"}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1"
               >
                 <Check className="w-4 h-4" />
                 Salvar Alterações
               </button>
            </div>

            {/* Live Margins block */}
            {(() => {
              const calcCost = activeWO.items.reduce((sum, i) => sum + i.totalCost, 0);
              const calcPrice = activeWO.items.reduce((sum, i) => sum + i.totalPrice, 0);
              const calcMargin = calcPrice > 0 ? (((calcPrice - calcCost) / calcPrice) * 100).toFixed(1) : "0";
              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-900 text-white rounded-xl font-mono text-xs">
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px]">Custo Interno Estimado:</span>
                    <span className="text-base font-bold">R$ {calcCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px]">Preço Final de Venda:</span>
                    <span className="text-base text-emerald-400 font-bold">R$ {calcPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[10px]">Margem Operacional Líquida:</span>
                    <span className="text-base text-emerald-400 font-bold">{calcMargin}%</span>
                  </div>
                </div>
              );
            })()}

            {/* OS Requisitions / Items List */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                  Requisições de Peças & Serviços na OS
                </h4>
                <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono">
                  Dedução de estoque físico ocorre apenas no Fechamento
                </span>
              </div>

              {/* List items */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-mono text-[10px]">
                      <th>Item / Peça</th>
                      <th>Tipo</th>
                      <th className="text-right">Unitário</th>
                      <th className="text-center">Quantidade</th>
                      <th className="text-right">Total</th>
                      <th className="text-center">Status / Almoxarifado</th>
                      <th className="text-center">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeWO.items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-semibold text-slate-800">{item.name}</td>
                        <td className="py-3 font-mono text-[10px] text-slate-500 uppercase">{item.type}</td>
                        <td className="py-3 text-right font-mono">R$ {item.unitPrice.toFixed(2)}</td>
                        <td className="py-3 text-center font-mono">{item.quantity}</td>
                        <td className="py-3 text-right font-mono font-bold">R$ {item.totalPrice.toFixed(2)}</td>
                        <td className="py-3 text-center">
                          {item.type === "product" ? (
                            <button
                              disabled={activeWO.status === "Faturada" || activeWO.status === "Cancelada"}
                              onClick={() => handleToggleItemDelivered(activeWO, item.id)}
                              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                                item.isDelivered 
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {item.isDelivered ? "✓ Retirado" : "⚠ Reservado"}
                            </button>
                          ) : (
                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-[10px] font-semibold">
                              ✓ Mão de Obra
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <button
                            disabled={activeWO.status === "Faturada" || activeWO.status === "Cancelada"}
                            onClick={() => handleRemoveActiveOSItem(activeWO, index)}
                            className="text-slate-400 hover:text-rose-600 disabled:opacity-40"
                          >
                            <X className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {activeWO.items.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-slate-400">
                          Nenhuma requisição de peças ou serviços vinculada a esta OS.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add item to active OS form */}
              {activeWO.status !== "Faturada" && activeWO.status !== "Cancelada" && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 mt-4">
                  <h5 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Lançar Nova Requisição no Almoxarifado</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400">Tipo</label>
                      <select value={selectedOsAddType} onChange={e=>{ setSelectedOsAddType(e.target.value as any); setSelectedOsAddId(""); }} className="w-full p-2 border border-slate-200 rounded text-xs mt-1 bg-white">
                        <option value="product">Peça / Produto</option>
                        <option value="service">Serviço / Mão de Obra</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-mono text-slate-400">Selecionar do Catálogo</label>
                      <select value={selectedOsAddId} onChange={e=>setSelectedOsAddId(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-xs mt-1 bg-white">
                        <option value="">Selecione...</option>
                        {selectedOsAddType === "product" ? (
                          activeProducts.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (R$ {p.sellingPrice} | Saldo: {p.currentStock})</option>
                          ))
                        ) : (
                          activeServices.map(s => (
                            <option key={s.id} value={s.id}>{s.name} (Preço: R$ {s.price})</option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-20">
                        <label className="block text-[10px] font-mono text-slate-400">Qtd</label>
                        <input type="number" min="1" value={selectedOsAddQty} onChange={e=>setSelectedOsAddQty(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded text-xs mt-1 bg-white" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddActiveOSItem(activeWO)}
                        className="flex-1 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold mt-1"
                      >
                        Requisitar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* DETALHE DO ORÇAMENTO */}
      {viewingBudgetId && (() => {
        const b = budgets.find(x => x.id === viewingBudgetId);
        if (!b) return null;
        return (
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-slate-200 text-slate-800 text-[10px] font-mono font-bold border border-slate-300 rounded-md">
                    ORÇAMENTO: {b.id}
                  </span>
                </div>
                <h3 className="text-base font-sans font-bold text-slate-900 mt-1">Cliente: {b.clientName}</h3>
                <p className="text-xs text-slate-500 font-mono">Ativo: {b.assetName}</p>
              </div>
              <div className="flex gap-2">
                {b.status === "Rascunho" && (
                  <button onClick={() => handleSendWhatsApp(b)} className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold bg-white hover:bg-slate-50">
                    Enviar Proposta
                  </button>
                )}
                {b.status !== "Aprovado" && b.status !== "Cancelado" && (
                  <button onClick={() => handleApproveBudget(b)} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700">
                    Aprovar & Gerar OS
                  </button>
                )}
                <button onClick={() => onPrint(b, "budget")} className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold bg-white hover:bg-slate-50">
                  🖨️ Imprimir
                </button>
                <button onClick={() => setViewingBudgetId(null)} className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold bg-white hover:bg-slate-50">
                  Voltar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Status</span>
                <span className="font-semibold text-slate-700">{b.status}</span>
              </div>
              <div className="p-4 bg-white rounded border border-slate-200 shadow-sm text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Valor Total</span>
                <span className="font-bold text-lg text-slate-900">R$ {b.totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div>
               <h4 className="text-xs font-bold text-slate-800 uppercase mb-2">Itens Orçados ({b.items.length})</h4>
               <ul className="space-y-2 text-sm bg-white p-4 border border-slate-200 rounded">
                 {b.items.map((i, idx) => (
                   <li key={idx} className="flex justify-between border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                     <span>{i.quantity}x {i.name}</span>
                     <span className="font-mono">R$ {i.totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                   </li>
                 ))}
                 {b.items.length === 0 && <p className="text-xs text-slate-400 text-center">Nenhum item adicionado.</p>}
               </ul>
            </div>
          </div>
        )
      })()}

      {/* DETALHE DA AGENDA */}
      {viewingScheduleId && (() => {
        const s = schedules.find(x => x.id === viewingScheduleId);
        if (!s) return null;
        return (
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-mono font-bold border border-blue-200 rounded-md">
                    AGENDAMENTO
                  </span>
                </div>
                <h3 className="text-base font-sans font-bold text-slate-900 mt-1">Cliente: {s.clientName}</h3>
                <p className="text-xs text-slate-500 font-mono">Data: {s.dateTime.replace("T", " ")}</p>
              </div>
              <div className="flex gap-2">
                {s.status === "Agendado" && (
                  <>
                    <button onClick={() => handlePromoteScheduleToOS(s)} className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold">
                      Abrir OS
                    </button>
                    <button onClick={() => handlePromoteScheduleToBudget(s)} className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold bg-white">
                      Orçar
                    </button>
                  </>
                )}
                {s.status === "Em OS" && s.workOrderId && (
                   <button onClick={() => { setOpSubTab('workorders'); setViewingScheduleId(null); setEditingOsId(s.workOrderId!); }} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded text-xs">
                     Ir para OS #{s.workOrderId}
                   </button>
                )}
                <button onClick={() => setViewingScheduleId(null)} className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold bg-white hover:bg-slate-50">
                  Voltar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Status</span>
                <span className="font-semibold text-slate-700">{s.status}</span>
              </div>
              <div className="p-4 bg-white rounded border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Ativo / Equipamento</span>
                <span className="font-semibold text-slate-900">{s.assetName}</span>
              </div>
            </div>
            <div>
               <h4 className="text-xs font-bold text-slate-800 uppercase mb-2">Observações</h4>
               <p className="text-sm bg-white p-4 border border-slate-200 rounded whitespace-pre-wrap">{s.description || "Nenhuma observação."}</p>
            </div>
          </div>
        )
      })()}

      {/* RENDER LISTS */}
      {!editingOsId && !viewingBudgetId && !viewingScheduleId && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* ORDEM DE SERVIÇO KANBAN BOARD */}
          {opSubTab === "workorders" && (
            <div className="p-4 bg-slate-100 overflow-x-auto">
              <div className="flex gap-4 min-w-[1000px] h-[calc(100vh-300px)]">
                {/* Column: Fila de Espera (Aberta) */}
                <div className="flex-1 flex flex-col bg-slate-50/80 rounded-xl border border-slate-200">
                  <div className="p-3 border-b border-slate-200 bg-white rounded-t-xl">
                    <h3 className="font-bold font-sans text-slate-800 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      Fila de Espera (Aberta)
                    </h3>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    {tenantWorkOrders.filter(w => w.status === "Aberta").map(wo => (
                      <div key={wo.id} onClick={() => setEditingOsId(wo.id)} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-400 cursor-pointer transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{wo.codigo ? `OS-${wo.codigo.toString().padStart(4, '0')}` : `#${wo.id.substring(0,6)}`}</span>
                          <span className="text-xs font-bold text-slate-900">R$ {wo.totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="font-sans font-bold text-slate-800 text-sm mb-1">{wo.clientName}</div>
                        <div className="text-xs text-slate-600 mb-2 truncate">{wo.assetName}</div>
                        <div className="flex flex-col gap-1 mt-3 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500">{new Date(wo.createdAt).toLocaleString('pt-BR', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}</span>
                            <span className="text-[10px] font-semibold text-indigo-600 group-hover:underline">Ver Detalhes →</span>
                          </div>
                          <div className="text-[10px] font-medium text-rose-500 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 inline-block w-max">
                            Aguardando há {formatElapsedTime(wo.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column: Em Execução */}
                <div className="flex-1 flex flex-col bg-slate-50/80 rounded-xl border border-slate-200">
                  <div className="p-3 border-b border-slate-200 bg-white rounded-t-xl">
                    <h3 className="font-bold font-sans text-slate-800 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Em Execução
                    </h3>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    {tenantWorkOrders.filter(w => w.status === "Em Execução" || w.status === "Pausada").map(wo => (
                      <div key={wo.id} onClick={() => setEditingOsId(wo.id)} className={`bg-white p-3 rounded-lg border shadow-sm cursor-pointer transition-colors group ${wo.status === 'Pausada' ? 'border-slate-300 opacity-80 hover:border-slate-400' : 'border-amber-200 hover:border-amber-400'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${wo.status === 'Pausada' ? 'text-slate-600 bg-slate-100 border-slate-200' : 'text-amber-600 bg-amber-50 border-amber-100'}`}>
                            {wo.codigo ? `OS-${wo.codigo.toString().padStart(4, '0')}` : `#${wo.id.substring(0,6)}`}
                          </span>
                          {wo.status === 'Pausada' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">PAUSADA</span>
                          )}
                        </div>
                        <div className="font-sans font-bold text-slate-800 text-sm mb-1">{wo.clientName}</div>
                        <div className="text-xs text-slate-600 mb-2 truncate">{wo.assetName}</div>
                        {wo.technicianName && (
                          <div className="text-[10px] font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded inline-block mb-2">
                            🧑‍🔧 {wo.technicianName}
                          </div>
                        )}
                        <div className="flex flex-col gap-1 mt-1 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500">Prev: {wo.estimatedCompletionAt ? new Date(wo.estimatedCompletionAt).toLocaleString('pt-BR', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'}) : '--'}</span>
                            <span className="text-[10px] font-semibold text-amber-600 group-hover:underline">Acompanhar →</span>
                          </div>
                          <div className="text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 inline-block w-max">
                            Em andamento há {formatElapsedTime(wo.startedAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column: Concluídas / Prontos */}
                <div className="flex-1 flex flex-col bg-slate-50/80 rounded-xl border border-slate-200">
                  <div className="p-3 border-b border-slate-200 bg-white rounded-t-xl">
                    <h3 className="font-bold font-sans text-slate-800 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Prontos / Concluída
                    </h3>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    {tenantWorkOrders.filter(w => w.status === "Concluída").map(wo => (
                      <div key={wo.id} onClick={() => setEditingOsId(wo.id)} className="bg-white p-3 rounded-lg border border-emerald-200 shadow-sm hover:border-emerald-400 cursor-pointer transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{wo.codigo ? `OS-${wo.codigo.toString().padStart(4, '0')}` : `#${wo.id.substring(0,6)}`}</span>
                          <span className="text-[10px] font-bold text-white bg-emerald-500 px-1.5 py-0.5 rounded">Faturar</span>
                        </div>
                        <div className="font-sans font-bold text-slate-800 text-sm mb-1">{wo.clientName}</div>
                        <div className="text-xs text-slate-600 mb-2 truncate">{wo.assetName}</div>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                          <span className="text-[10px] text-slate-500">{wo.completedAt ? new Date(wo.completedAt).toLocaleDateString('pt-BR') : '--'}</span>
                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleWhatsAppNotify(wo); }} className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1 transition-colors">
                              📱 Notificar
                            </button>
                            <span className="text-[10px] font-semibold text-emerald-600 group-hover:underline">Faturar OS →</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column: Histórico (Faturada / Cancelada) */}
                <div className="flex-1 flex flex-col bg-slate-50/80 rounded-xl border border-slate-200 opacity-80 hover:opacity-100 transition-opacity">
                  <div className="p-3 border-b border-slate-200 bg-white rounded-t-xl">
                    <h3 className="font-bold font-sans text-slate-500 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      Histórico
                    </h3>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    {tenantWorkOrders.filter(w => w.status === "Faturada" || w.status === "Cancelada").map(wo => (
                      <div key={wo.id} onClick={() => setEditingOsId(wo.id)} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-pointer transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{wo.codigo ? `OS-${wo.codigo.toString().padStart(4, '0')}` : `#${wo.id.substring(0,6)}`}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${wo.status === 'Faturada' ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>{wo.status.toUpperCase()}</span>
                        </div>
                        <div className="font-sans font-bold text-slate-700 text-sm mb-1">{wo.clientName}</div>
                        <div className="text-xs text-slate-500 mb-2 truncate">{wo.assetName}</div>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                          <span className="text-[10px] text-slate-400">{wo.closedAt ? new Date(wo.closedAt).toLocaleDateString('pt-BR') : '--'}</span>
                          <span className="text-[10px] font-semibold text-slate-500 group-hover:underline">Visualizar</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ORÇAMENTOS GRID */}
          {opSubTab === "budgets" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 font-mono text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Cliente Proprietário</th>
                    <th className="px-4 py-3">Ativo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Margem %</th>
                    <th className="px-4 py-3 text-right">Valor Total</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {tenantBudgets.map(b => (
                    <tr key={b.id} onClick={() => setViewingBudgetId(b.id)} className="hover:bg-slate-50/50 cursor-pointer">
                      <td className="px-4 py-3.5">
                        <div className="font-sans font-bold text-slate-800 flex items-center gap-2">
                          {b.clientName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{b.codigo ? `ORÇ-${b.codigo.toString().padStart(4, '0')}` : `ID: ${b.id.substring(0,8)}`}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-sans text-slate-700">{b.assetName}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          b.status === "Rascunho" ? "bg-slate-100 text-slate-700 border-slate-200" :
                          b.status === "Enviado" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                          b.status === "Aprovado" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-indigo-600 font-semibold">{b.marginPercent}%</td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                        R$ {b.totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-right gap-1 flex justify-end">
                        {b.status === "Rascunho" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSendWhatsApp(b); }}
                            className="px-2.5 py-1 border border-slate-300 rounded text-[11px] font-semibold text-slate-700"
                          >
                            Enviar Proposta
                          </button>
                        )}
                        {b.status !== "Aprovado" && b.status !== "Cancelado" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApproveBudget(b); }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold"
                          >
                            ✓ Aprovar & Gerar OS
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); onPrint(b, "budget"); }}
                          className="px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-[11px] font-semibold"
                        >
                          🖨️ Imprimir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tenantBudgets.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                        Nenhum orçamento em rascunho ou enviado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* AGENDA GRID */}
          {opSubTab === "schedules" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 font-mono text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Cliente Proprietário</th>
                    <th className="px-4 py-3">Equipamento</th>
                    <th className="px-4 py-3">Data Agendada</th>
                    <th className="px-4 py-3">Observação / Reclamação</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {tenantSchedules.map(s => (
                    <tr key={s.id} onClick={() => setViewingScheduleId(s.id)} className="hover:bg-slate-50/50 cursor-pointer">
                      <td className="px-4 py-3.5 font-sans font-semibold text-slate-800">{s.clientName}</td>
                      <td className="px-4 py-3.5 text-slate-700">{s.assetName}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-600">{s.dateTime.replace("T", " ")}</td>
                      <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">{s.description}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block mb-1 ${
                          s.status === "Agendado" ? "bg-blue-100 text-blue-800" :
                          s.status === "Cancelado" ? "bg-rose-100 text-rose-800" :
                          "bg-emerald-100 text-emerald-800"
                        }`}>
                          {s.status}
                        </span>
                        {s.status === "Em OS" && s.workOrderId && (
                          <div className="mt-1">
                            <button 
                              onClick={() => { setOpSubTab('workorders'); setEditingOsId(s.workOrderId!); }} 
                              className="px-1.5 py-0.5 border border-indigo-200 text-indigo-700 bg-indigo-50 rounded text-[9px] font-bold hover:bg-indigo-100 transition-colors inline-block"
                            >
                              ABRIR OS #{s.workOrderId}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right flex justify-end gap-1">
                        {s.status === "Agendado" && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePromoteScheduleToOS(s); }}
                              className="px-2 py-1 bg-slate-900 text-white rounded text-[11px] font-semibold"
                            >
                              Abrir OS
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePromoteScheduleToBudget(s); }}
                              className="px-2 py-1 border border-slate-300 text-slate-700 rounded text-[11px] font-semibold bg-white"
                            >
                              Orçar
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReschedule(s); }}
                              className="px-2 py-1 border border-amber-300 text-amber-700 hover:bg-amber-50 rounded text-[11px] font-semibold bg-white transition-colors"
                            >
                              Reagendar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {tenantSchedules.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                        Nenhum compromisso agendado na agenda atual.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* START EXECUTION MODAL */}
      {showStartExecutionModal && editingOsId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-sans font-bold text-slate-900 text-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                Iniciar Execução
              </h3>
              <button onClick={() => setShowStartExecutionModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Selecione o técnico responsável pela execução desta Ordem de Serviço. O tempo previsto será calculado com base nos serviços.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Técnico Executor *</label>
                  <select 
                    value={selectedTechnicianId} 
                    onChange={e => setSelectedTechnicianId(e.target.value)} 
                    className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs"
                  >
                    <option value="">-- Selecione o Técnico --</option>
                    {employees.filter(e => e.tenantId === tenantId && e.ativo).map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nome} ({emp.cargo})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowStartExecutionModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!selectedTechnicianId}
                  onClick={() => {
                    const activeWO = workOrders.find(wo => wo.id === editingOsId);
                    if (activeWO) {
                      const emp = employees.find(e => e.id === selectedTechnicianId);
                      onUpdateWorkOrder({ 
                        ...activeWO, 
                        status: "Em Execução",
                        technicianId: selectedTechnicianId,
                        technicianName: emp?.nome || "",
                        startedAt: new Date().toISOString()
                      });
                      setShowStartExecutionModal(false);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Confirmar Início
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal Overlay */}
      <AlertModal 
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {confirmDeleteOSId && (
        <ConfirmModal
          isOpen={true}
          title="Excluir Ordem de Serviço"
          message="Tem certeza que deseja excluir fisicamente esta OS? Esta ação não pode ser desfeita e, se houver um agendamento vinculado, ele retornará ao status 'Agendado'."
          onConfirm={() => {
            onDeleteWorkOrder(confirmDeleteOSId);
            setEditingOsId(null);
            setConfirmDeleteOSId(null);
          }}
          onCancel={() => setConfirmDeleteOSId(null)}
          confirmText="Sim, Excluir OS"
          cancelText="Cancelar"
        />
      )}
      {/* Close OS Modal */}
      {showCloseModal && closingOsId && (() => {
        const os = workOrders.find(w => w.id === closingOsId);
        if (!os) return null;
        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden animate-scale-up">
              <div className="bg-emerald-600 p-4 text-white">
                <h3 className="text-sm font-bold font-sans">Faturamento de Ordem de Serviço</h3>
                <p className="text-xs opacity-90 font-mono mt-1">{os.clientName}</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 font-mono">Valor Total dos Itens:</span>
                  <span className="font-bold font-mono">R$ {os.totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-500 mb-1">Desconto Comercial (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={osDiscount}
                    onChange={e => setOsDiscount(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded text-sm text-right font-mono focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div className="flex justify-between items-center text-base border-t border-slate-200 pt-4">
                  <span className="text-slate-800 font-bold font-sans">Valor Final a Faturar:</span>
                  <span className="font-bold font-mono text-emerald-600">R$ {Math.max(0, os.totalPrice - osDiscount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCloseOSFlow}
                  className="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                >
                  Confirmar Faturamento
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
