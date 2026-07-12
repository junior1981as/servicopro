/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Tenant, Client, Asset, Product, Service, Schedule, Budget, WorkOrder, FinancialTransaction, CashLedger, Purchase, Employee, ContaBancaria 
} from "./types";
import { 
  INITIAL_TENANTS, INITIAL_CLIENTS, INITIAL_ASSETS, INITIAL_PRODUCTS, INITIAL_SERVICES, 
  INITIAL_SCHEDULES, INITIAL_BUDGETS, INITIAL_WORKORDERS, INITIAL_TRANSACTIONS, INITIAL_CASH_LEDGER,
  INITIAL_PURCHASES
} from "./data/initialData";
import PrintTemplate from "./components/PrintTemplate";
import FinancialPrintTemplate from "./components/FinancialPrintTemplate";
import Sidebar from "./components/Sidebar";
import DashboardTab from "./components/DashboardTab";
import RegistersTab from "./components/RegistersTab";
import OperationsTab from "./components/OperationsTab";
import PurchasesTab from "./components/PurchasesTab";
import FinancialTab from "./components/FinancialTab";
import FiscalTab from "./components/FiscalTab";
import ScheduleTab from "./components/ScheduleTab";
import ArchitectPanel from "./components/ArchitectPanel";
import Login from "./components/Login";
import { Layers, Database, ShieldCheck, Clock, RefreshCw, Star, Info, Hammer, CalendarDays } from "lucide-react";
import { AlertModal, AlertType } from "./components/AlertModal";
import { ConfirmModal } from "./components/ConfirmModal";
import { api } from "./services/api";

export default function App() {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // --- States ---
  const [activeTenant, setActiveTenant] = useState<Tenant>(INITIAL_TENANTS[0]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "registers" | "operations" | "purchases" | "financial" | "fiscal" | "architect">("dashboard");
  const [operationToOpen, setOperationToOpen] = useState<{ type: 'budget' | 'workorder', id: string } | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [cashLedger, setCashLedger] = useState<CashLedger[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);

  const [alertState, setAlertState] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const [printData, setPrintData] = useState<{ document?: Budget | WorkOrder, type: "budget" | "workorder" | "financial" } | null>(null);

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertState({ isOpen: true, type, title, message });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  };

  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({ isOpen: true, title, message, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  // Time tracker for visual status
  const [currentTime, setCurrentTime] = useState("");

  // --- Initializer & LocalStorage Sync ---
  useEffect(() => {
    // Clock
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);

    // Initial state is empty, will be loaded from API

    // Restore Auth
    const storedToken = localStorage.getItem('servicopro_token');
    if (storedToken) {
      setAuthToken(storedToken);
      setIsAuthenticated(true);
      
      // Tentar restaurar o tenant logado
      const storedTenant = localStorage.getItem('servicopro_tenant');
      if (storedTenant) {
        try {
          const t = JSON.parse(storedTenant);
          // O tenant mockado na nova base
          setActiveTenant({
            id: t.id,
            name: t.nome,
            segment: "Oficina"
          });
        } catch(e) {}
      }
    }

    return () => clearInterval(interval);
  }, []);

  // --- API Data Loading ---
  const fetchApiData = async () => {
    try {
      const [
        apiClients, apiProducts, apiServices, apiAssets, apiEmployees,
        apiSchedules, apiBudgets, apiWorkOrders, apiPurchases,
        apiTransactions, apiCashLedger, apiContas
      ] = await Promise.all([
        api.getClients(),
        api.getProducts(),
        api.getServices(),
        api.getAssets(),
        api.getEmployees(),
        api.getSchedules(),
        api.getBudgets(),
        api.getWorkOrders(),
        api.getPurchases(),
        api.getTransactions(),
        api.getCashLedger(),
        api.getContasBancarias()
      ]);
      setClients(apiClients);
      setProducts(apiProducts);
      setServices(apiServices);
      setAssets(apiAssets);
      setEmployees(apiEmployees);
      setSchedules(apiSchedules);
      setBudgets(apiBudgets);
      setWorkOrders(apiWorkOrders);
      setPurchases(apiPurchases);
      setTransactions(apiTransactions);
      setCashLedger(apiCashLedger);
      setContasBancarias(apiContas);
    } catch (err: any) {
      if (err.message !== 'Unauthorized') {
        console.error("Error fetching data:", err);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchApiData();
      
      // Auto-refresh data every 45 seconds to keep SPA in sync
      const pollingInterval = setInterval(() => {
        fetchApiData();
      }, 45000);
      
      return () => clearInterval(pollingInterval);
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = (token: string, tenantId: string) => {
    setAuthToken(token);
    setIsAuthenticated(true);
    // TODO: In a real app we'd fetch tenant info from API here.
    const storedTenant = localStorage.getItem('servicopro_tenant');
    if (storedTenant) {
      try {
        const t = JSON.parse(storedTenant);
        setActiveTenant({
          id: t.id,
          name: t.nome,
          segment: "Oficina"
        });
      } catch(e) {}
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('servicopro_token');
    localStorage.removeItem('servicopro_tenant');
    localStorage.removeItem('servicopro_user');
    setIsAuthenticated(false);
    setAuthToken(null);
  };

  // Helper to persist state updates
  const saveAndSetState = (key: string, value: any, setter: Function) => {
    setter(value);
    localStorage.setItem(`serviciopro_${key}`, JSON.stringify(value));
  };

  // --- Handlers (Registers) ---
  const handleAddClient = async (c: Client) => {
    try {
      await api.createClient(c);
      const updated = await api.getClients();
      setClients(updated);
      showAlert('success', 'Cliente Cadastrado', 'O cliente foi cadastrado com sucesso!');
    } catch (err: any) { 
      console.error(err);
      showAlert('error', 'Erro ao cadastrar', err.message || "Verifique se o documento (CPF/CNPJ) já está cadastrado no sistema.");
    }
  };

  const handleUpdateClient = async (c: Client) => {
    try {
      await api.updateClient(c);
      const updated = await api.getClients();
      setClients(updated);
      showAlert('success', 'Cliente Atualizado', 'O cliente foi atualizado com sucesso!');
    } catch (err: any) { 
      console.error(err);
      showAlert('error', 'Erro ao atualizar', err.message || "Ocorreu um erro ao atualizar o cliente.");
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await api.deleteClient(id);
      const updated = await api.getClients();
      setClients(updated);
    } catch (err: any) {
      console.error(err);
      showAlert('error', 'Erro ao deletar', err.message || "Não foi possível deletar este cliente.");
    }
  };

  const handleAddEmployee = async (e: Employee) => {
    try {
      await api.createEmployee(e);
      const updated = await api.getEmployees();
      setEmployees(updated);
      showAlert('success', 'Técnico Cadastrado', 'O técnico foi cadastrado com sucesso!');
    } catch (err: any) { 
      console.error(err);
      showAlert('error', 'Erro ao cadastrar', err.message || "Não foi possível cadastrar o técnico.");
    }
  };

  const handleUpdateEmployee = async (e: Employee) => {
    try {
      await api.updateEmployee(e);
      const updated = await api.getEmployees();
      setEmployees(updated);
      showAlert('success', 'Técnico Atualizado', 'O técnico foi atualizado com sucesso!');
    } catch (err: any) { 
      console.error(err);
      showAlert('error', 'Erro ao atualizar', err.message || "Não foi possível atualizar o técnico.");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await api.deleteEmployee(id);
      const updated = await api.getEmployees();
      setEmployees(updated);
    } catch (err: any) {
      console.error(err);
      showAlert('error', 'Erro ao deletar', err.message || "Não foi possível deletar este técnico.");
    }
  };

  const normalizeString = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  const handleAddAsset = async (a: Asset) => {
    // Prevent duplicates: same owner (clientId) and same serialNumber/plate
    const isDuplicate = assets.some(
      existing => 
        existing.clientId === a.clientId && 
        normalizeString(existing.serialNumber) === normalizeString(a.serialNumber)
    );

    if (isDuplicate) {
      showAlert('error', 'Duplicidade Detectada', 'Já existe um equipamento cadastrado com este Nº Série/Placa para este proprietário.');
      return;
    }

    try {
      await api.createAsset(a);
      const updated = await api.getAssets();
      setAssets(updated);
      showAlert('success', 'Ativo Cadastrado', 'O equipamento/ativo foi cadastrado com sucesso!');
    } catch (err: any) { 
      console.error(err);
      showAlert('error', 'Erro ao cadastrar', err.message || "Ocorreu um erro ao cadastrar o equipamento.");
    }
  };

  const handleUpdateAsset = async (a: Asset) => {
    // Check duplicates ignoring the asset being edited
    const isDuplicate = assets.some(
      existing => 
        existing.id !== a.id &&
        existing.clientId === a.clientId && 
        normalizeString(existing.serialNumber) === normalizeString(a.serialNumber)
    );

    if (isDuplicate) {
      showAlert('error', 'Duplicidade Detectada', 'Já existe OUTRO equipamento cadastrado com este Nº Série/Placa para este proprietário.');
      return;
    }

    try {
      await api.updateAsset(a);
      const updated = await api.getAssets();
      setAssets(updated);
      showAlert('success', 'Ativo Atualizado', 'O equipamento/ativo foi atualizado com sucesso!');
    } catch (err: any) { 
      console.error(err);
      showAlert('error', 'Erro ao atualizar', err.message || "Ocorreu um erro ao atualizar o equipamento.");
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await api.deleteAsset(id);
      const updated = await api.getAssets();
      setAssets(updated);
    } catch (err: any) {
      console.error(err);
      showAlert('error', 'Erro ao deletar', err.message || "Não foi possível deletar este equipamento.");
    }
  };

  const handleAddProduct = async (p: Product) => {
    try {
      await api.createProduct(p);
      const updated = await api.getProducts();
      setProducts(updated);
      showAlert('success', 'Produto Cadastrado', 'O produto foi cadastrado com sucesso!');
    } catch (err: any) { 
      console.error(err);
      showAlert('error', 'Erro ao cadastrar', err.message || "Ocorreu um erro ao cadastrar o produto.");
    }
  };

  const handleUpdateProduct = async (p: Product) => {
    try {
      await api.updateProduct(p);
      const updated = await api.getProducts();
      setProducts(updated);
      showAlert('success', 'Produto Atualizado', 'O produto foi atualizado com sucesso!');
    } catch (err: any) { 
      console.error(err);
      showAlert('error', 'Erro ao atualizar', err.message || "Ocorreu um erro ao atualizar o produto.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      const updated = await api.getProducts();
      setProducts(updated);
    } catch (err: any) {
      console.error(err);
      showAlert('error', 'Erro ao deletar', err.message || "Não foi possível deletar este produto.");
    }
  };

  const handleAddService = async (s: Service) => {
    try {
      await api.createService(s);
      const updated = await api.getServices();
      setServices(updated);
      showAlert('success', 'Serviço Cadastrado', 'O serviço foi cadastrado com sucesso!');
    } catch (err: any) { 
      console.error(err);
      showAlert('error', 'Erro ao cadastrar', err.message || "Ocorreu um erro ao cadastrar o serviço.");
    }
  };

  const handleUpdateService = async (s: Service) => {
    try {
      await api.updateService(s);
      const updated = await api.getServices();
      setServices(updated);
      showAlert('success', 'Serviço Atualizado', 'O serviço foi atualizado com sucesso!');
    } catch (err: any) { 
      console.error(err);
      showAlert('error', 'Erro ao atualizar', err.message || "Ocorreu um erro ao atualizar o serviço.");
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await api.deleteService(id);
      const updated = await api.getServices();
      setServices(updated);
    } catch (err: any) {
      console.error(err);
      showAlert('error', 'Erro ao deletar', err.message || "Não foi possível deletar este serviço.");
    }
  };

  // --- Operational Transactions ---
  const handleAddSchedule = async (s: Schedule) => {
    try {
      await api.createSchedule(s);
      setSchedules(await api.getSchedules());
    } catch (err: any) { showAlert('error', 'Erro', err.message); }
  };

  const handleUpdateScheduleStatus = async (id: string, status: "Agendado" | "Cancelado" | "Em OS", woId?: string) => {
    const s = schedules.find(x => x.id === id);
    if (!s) return;
    try {
      await api.updateSchedule({ ...s, status, workOrderId: woId });
      setSchedules(await api.getSchedules());
    } catch (err: any) { showAlert('error', 'Erro', err.message); }
  };

  const handleUpdateSchedule = async (updatedSchedule: Schedule) => {
    try {
      await api.updateSchedule(updatedSchedule);
      setSchedules(await api.getSchedules());
    } catch (err: any) { showAlert('error', 'Erro', err.message); }
  };

  const handleAddBudget = async (b: Budget) => {
    try {
      await api.createBudget(b);
      setBudgets(await api.getBudgets());
    } catch (err: any) { showAlert('error', 'Erro', err.message); }
  };

  const handleUpdateBudgetStatus = async (id: string, status: any, woId?: string) => {
    try {
      await api.updateBudgetStatus(id, status, woId);
      setBudgets(await api.getBudgets());
    } catch (err: any) { showAlert('error', 'Erro', err.message); }
  };

  const handleAddWorkOrder = async (wo: WorkOrder) => {
    try {
      const res = await api.createWorkOrder(wo);
      setWorkOrders(await api.getWorkOrders());
      return res;
    } catch (err: any) { showAlert('error', 'Erro', err.message); throw err; }
  };

  const handleUpdateWorkOrder = async (wo: WorkOrder): Promise<{success: boolean, error?: string}> => {
    try {
      await api.updateWorkOrder(wo.id, wo);
      setWorkOrders(await api.getWorkOrders());
      return { success: true };
    } catch (err: any) { 
      showAlert('error', 'Erro', err.message); 
      return { success: false, error: err.message };
    }
  };


  const handleDeleteWorkOrder = async (id: string) => {
    try {
      await api.deleteWorkOrder(id);
      setWorkOrders(await api.getWorkOrders());
      setBudgets(await api.getBudgets());
      setSchedules(await api.getSchedules());
    } catch (err: any) { showAlert('error', 'Erro', err.message); }
  };

  // --- Core Business Logic: Closing the OS ---
  const handleCloseWorkOrder = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const wo = workOrders.find(item => item.id === id);
    if (!wo) return { success: false, error: "Ordem de Serviço não encontrada." };

    if (wo.status === "Fechada") return { success: false, error: "A OS já está fechada." };
    if (wo.items.length === 0) return { success: false, error: "Não é possível fechar uma OS vazia (sem peças ou serviços)." };
    if (!wo.diagnosis) return { success: false, error: "Preenchimento do Diagnóstico Técnico é obrigatório para fechar a OS." };

    try {
      await api.closeWorkOrder(id, wo.diagnosis);
      
      // Reload states affected by closing an OS
      setWorkOrders(await api.getWorkOrders());
      setProducts(await api.getProducts());
      setTransactions(await api.getTransactions());
      setBudgets(await api.getBudgets());
      setSchedules(await api.getSchedules());
      
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // --- Core Business Logic: Cancelling the OS ---
  const handleCancelWorkOrder = async (id: string) => {
    try {
      await api.cancelWorkOrder(id);
      
      // Reload affected states
      setWorkOrders(await api.getWorkOrders());
      setProducts(await api.getProducts());
      setTransactions(await api.getTransactions());
    } catch (err: any) {
      showAlert('error', 'Erro ao cancelar', err.message);
    }
  };

  // --- Core Business Logic: Purchases & NF Entry ---
  const handleAddPurchase = async (p: Purchase) => {
    try {
      await api.createPurchase(p);
      setPurchases(await api.getPurchases());
    } catch (err: any) { showAlert('error', 'Erro', err.message); }
  };

  const handleReceiveInvoice = async (purchaseId: string, invoiceNum: string, dueDate: string, totalAmount?: number, items?: any[]): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.receivePurchaseInvoice(purchaseId, invoiceNum, dueDate, totalAmount, items);
      
      setPurchases(await api.getPurchases());
      setProducts(await api.getProducts());
      setTransactions(await api.getTransactions());
      
      showAlert('success', 'Entrada de NF Processada!', '1. O saldo dos produtos foi incrementado no estoque.\n2. Foi gerada uma Conta a Pagar correspondente no financeiro.\n3. Histórico de estoque registrado.');
      return { success: true };
    } catch (err: any) {
      showAlert('error', 'Erro ao receber Nota Fiscal', err.message);
      return { success: false, error: err.message };
    }
  };

  const handleUpdatePurchase = async (purchaseId: string, data: Partial<Purchase>) => {
    try {
      await api.updatePurchase(purchaseId, data);
      setPurchases(await api.getPurchases());
      showAlert('success', 'Pedido Atualizado', 'As informações do pedido foram salvas.');
    } catch (err: any) {
      showAlert('error', 'Erro ao atualizar pedido', err.message);
    }
  };

  const handleCancelPurchase = async (purchaseId: string) => {
    try {
      await api.cancelPurchase(purchaseId);
      setPurchases(await api.getPurchases());
      showAlert('success', 'Pedido Cancelado', 'O pedido de compra foi cancelado com sucesso.');
    } catch (err: any) {
      showAlert('error', 'Erro', err.message);
    }
  };

  // --- Core Business Logic: Settling accounts and logging Cash Ledger ---
  const handlePayTransaction = async (id: string, payMethod: string, contaId: string) => {
    try {
      await api.payTransaction(id, payMethod, contaId);
      setTransactions(await api.getTransactions());
      setCashLedger(await api.getCashLedger());
    } catch (err: any) {
      showAlert('error', 'Erro', err.message);
    }
  };

  const handleReverseTransaction = async (id: string) => {
    try {
      await api.reverseTransaction(id);
      setTransactions(await api.getTransactions());
      setCashLedger(await api.getCashLedger());
      setContasBancarias(await api.getContasBancarias());
    } catch (err: any) {
      showAlert('error', 'Erro ao estornar', err.message);
    }
  };

  const handleEditTransaction = async (id: string, data: { dueDate?: string; amount?: number; description?: string }) => {
    try {
      await api.editTransaction(id, data);
      setTransactions(await api.getTransactions());
    } catch (err: any) {
      showAlert('error', 'Erro ao editar', err.message);
    }
  };

  const handleParcelarTransaction = async (id: string, parcelas: number) => {
    try {
      await api.parcelarTransaction(id, parcelas);
      setTransactions(await api.getTransactions());
    } catch (err: any) {
      showAlert('error', 'Erro ao parcelar', err.message);
    }
  };

  const handleCreateContaBancaria = async (data: { nome: string; tipo: string; saldoInicial: number }) => {
    try {
      await api.createContaBancaria(data);
      setContasBancarias(await api.getContasBancarias());
    } catch (err: any) {
      showAlert('error', 'Erro ao criar conta', err.message);
    }
  };


  // --- Reset Entire Local Database ---
  const handleResetDatabase = () => {
    showConfirm(
      "Resetar Banco de Dados",
      "Deseja realmente RESETAR todo o banco de dados simulado no LocalStorage para os padrões iniciais do ERP?",
      () => {
        localStorage.clear();
        window.location.reload();
      }
    );
  };

  // --- Filtering views strictly by ACTIVE TENANT to avoid cross-tenant leaks! ---
  const tenantClients = clients.filter(c => c.tenantId === activeTenant.id);
  const tenantAssets = assets.filter(a => a.tenantId === activeTenant.id);
  const tenantProducts = products.filter(p => p.tenantId === activeTenant.id);
  const tenantServices = services.filter(s => s.tenantId === activeTenant.id);

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const handleNavigateToOperation = (type: 'budget' | 'workorder', id: string) => {
    setOperationToOpen({ type, id });
    setActiveTab("operations");
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800 print:hidden" id="saas_workspace_root">
        {/* Sidebar navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        activeTenant={activeTenant} 
        tenants={INITIAL_TENANTS}
        setActiveTenant={(t) => {
          setActiveTenant(t);
          // Auto route back to dashboard on change of context
          setActiveTab("dashboard");
        }}
      />

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Workspace Indicators */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-30" id="workspace_header">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <h1 className="text-sm font-mono font-bold uppercase text-slate-400 tracking-wider">
                Workspace Ativo do SaaS ERP
              </h1>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-semibold">
                ID: {activeTenant.id}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-sans font-extrabold text-slate-900">
                {activeTenant.name}
              </span>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-100">
                Segmento: {activeTenant.segment}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:self-auto">
            {/* Developer Blueprints Quick Shortcut */}
            <button
              onClick={() => setActiveTab("architect")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                activeTab === "architect"
                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-400"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
              }`}
              id="hdr_btn_blueprint"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Blueprints & ADRs
            </button>

            {/* Time & DB indicators */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-mono border border-slate-200">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{currentTime || "Carregando..."}</span>
            </div>

            <button
              onClick={handleResetDatabase}
              title="Resetar Banco Simulado"
              className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 transition-colors"
              id="hdr_btn_reset"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-rose-50 text-rose-600 font-semibold text-xs border border-rose-200 rounded-lg hover:bg-rose-100"
            >
              Sair
            </button>
          </div>
        </header>

        {/* Content Viewer viewport */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto" id="saas_viewport">
          
          {/* Dashboard Tático Banner */}
          {(() => {
            const tenantWOs = workOrders.filter(w=>w.tenantId === activeTenant.id);
            const pendentes = tenantWOs.filter(w => w.status === "Aberta").length;
            const emExecucao = tenantWOs.filter(w => w.status === "Em Execução");
            const valorEmExecucao = emExecucao.reduce((sum, wo) => sum + wo.totalPrice, 0);
            const prontos = tenantWOs.filter(w => w.status === "Concluída").length;
            
            const tenantScheds = schedules.filter(s => s.tenantId === activeTenant.id && s.status === "Agendado");
            const todayStr = new Date().toISOString().split('T')[0];
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            const agendadosHoje = tenantScheds.filter(s => s.dateTime.startsWith(todayStr)).length;
            const agendadosAmanha = tenantScheds.filter(s => s.dateTime.startsWith(tomorrowStr)).length;

            return (
              <div className="mb-6 bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-sm flex items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-6">
                  <div className="flex items-center gap-3 border-r border-slate-700 pr-6">
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">OS na Fila de Espera</p>
                      <p className="font-bold text-lg text-white">{pendentes}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-r border-slate-700 pr-6">
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                      <Hammer className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Em Execução</p>
                      <p className="font-bold text-lg text-white">{emExecucao.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-r border-slate-700 pr-6">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Prontos / Aguardando Cliente</p>
                      <p className="font-bold text-lg text-white">{prontos}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-r border-slate-700 pr-6">
                    <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Agendas de Hoje</p>
                      <p className="font-bold text-lg text-white">{agendadosHoje}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Agendas de Amanhã</p>
                      <p className="font-bold text-lg text-white">{agendadosAmanha}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB ROUTING */}
          {activeTab === "dashboard" && (
            <DashboardTab 
              clients={tenantClients}
              assets={tenantAssets}
              products={tenantProducts}
              services={tenantServices}
              workOrders={workOrders.filter(w=>w.tenantId === activeTenant.id)}
              budgets={budgets.filter(b=>b.tenantId === activeTenant.id)}
              transactions={transactions.filter(t=>t.tenantId === activeTenant.id)}
              cashLedger={cashLedger.filter(c=>c.tenantId === activeTenant.id)}
            />
          )}

          {activeTab === "registers" && (
            <RegistersTab
              tenantId={activeTenant.id}
              clients={clients}
              assets={assets}
              products={products}
              services={services}
              employees={employees}
              onAddClient={handleAddClient}
              onAddAsset={handleAddAsset}
              onAddProduct={handleAddProduct}
              onAddService={handleAddService}
              onAddEmployee={handleAddEmployee}
              onDeleteClient={handleDeleteClient}
              onDeleteAsset={handleDeleteAsset}
              onDeleteProduct={handleDeleteProduct}
              onDeleteService={handleDeleteService}
              onDeleteEmployee={handleDeleteEmployee}
              onUpdateClient={handleUpdateClient}
              onUpdateAsset={handleUpdateAsset}
              onUpdateProduct={handleUpdateProduct}
              onUpdateService={handleUpdateService}
              onUpdateEmployee={handleUpdateEmployee}
              workOrders={workOrders}
              budgets={budgets}
              purchases={purchases}
              onNavigateToOperation={handleNavigateToOperation}
            />
          )}

          {activeTab === "schedule" && (
            <ScheduleTab
              tenantId={activeTenant.id}
              clients={clients}
              assets={assets}
              schedules={schedules}
              onAddSchedule={handleAddSchedule}
              onUpdateScheduleStatus={handleUpdateScheduleStatus}
              onNavigateToOperation={handleNavigateToOperation}
              onPromoteToBudget={(s) => {
                // To promote to budget, we switch to operations tab and tell it to open a budget for this schedule
                setActiveTab("operations");
                setOperationToOpen({ type: 'schedule_to_budget', id: s.id });
              }}
              onPromoteToOS={(s) => {
                // To promote to OS, we switch to operations tab and tell it to open an OS for this schedule
                setActiveTab("operations");
                setOperationToOpen({ type: 'schedule_to_os', id: s.id });
              }}
            />
          )}

          {activeTab === "operations" && (
            <OperationsTab
              tenantId={activeTenant.id}
              initialOpenOperation={operationToOpen}
              onClearOpenOperation={() => setOperationToOpen(null)}
              clients={clients}
              assets={assets}
              products={products}
              services={services}
              employees={employees}
              schedules={schedules}
              budgets={budgets}
              workOrders={workOrders}
              onAddSchedule={handleAddSchedule}
              onUpdateScheduleStatus={handleUpdateScheduleStatus}
              onUpdateSchedule={handleUpdateSchedule}
              onAddBudget={handleAddBudget}
              onUpdateBudgetStatus={handleUpdateBudgetStatus}
              onAddWorkOrder={handleAddWorkOrder}
              onUpdateWorkOrder={handleUpdateWorkOrder}
              onCloseWorkOrder={handleCloseWorkOrder}
              onCancelWorkOrder={handleCancelWorkOrder}
              onDeleteWorkOrder={handleDeleteWorkOrder}
              onPrint={(doc, type) => {
                setPrintData({ document: doc, type });
                setTimeout(() => window.print(), 100);
              }}
            />
          )}

          {activeTab === "purchases" && (
            <PurchasesTab
              tenantId={activeTenant.id}
              products={products}
              purchases={purchases}
              clients={clients}
              onAddPurchase={handleAddPurchase}
              onUpdatePurchase={handleUpdatePurchase}
              onReceiveInvoice={handleReceiveInvoice}
              onCancelPurchase={handleCancelPurchase}
            />
          )}

          {activeTab === "financial" && (
            <FinancialTab 
              tenantId={activeTenant.id} 
              transactions={transactions} 
              cashLedger={cashLedger}
              contas={contasBancarias}
              onPayTransaction={handlePayTransaction}
              onReverseTransaction={handleReverseTransaction}
              onEditTransaction={handleEditTransaction}
              onParcelarTransaction={handleParcelarTransaction}
              onCreateContaBancaria={handleCreateContaBancaria}
              onPrintFinancial={() => {
                setPrintData({ type: "financial" });
                setTimeout(() => window.print(), 100);
              }}
            />
          )}

          {activeTab === "fiscal" && (
            <FiscalTab
              tenantId={activeTenant.id}
              workOrders={workOrders}
            />
          )}

          {activeTab === "architect" && (
            <ArchitectPanel />
          )}

        </main>
      </div>

      {/* Global Alert Modal */}
      <AlertModal
        isOpen={alertState.isOpen}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={closeAlert}
      />

      {/* Global Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={() => {
          confirmState.onConfirm();
          closeConfirm();
        }}
        onCancel={closeConfirm}
      />
    </div>
    {printData && printData.type !== "financial" && printData.document && (
      <PrintTemplate 
        documentData={printData.document}
        client={clients.find(c => c.id === printData.document!.clientId)}
        asset={assets.find(a => a.id === printData.document!.assetId)}
      />
    )}
    {printData && printData.type === "financial" && (
      <FinancialPrintTemplate
        tenantId={activeTenant.id}
        transactions={transactions}
        cashLedger={cashLedger}
      />
    )}
    </>
  );
}
