/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Client, Asset, Product, Service, WorkOrder, Budget, Purchase, Employee, ProductHistoryEntry } from "../types";
import { Users, Laptop, HardDrive, Settings, Plus, Search, FileText, Check, Trash2, Tag, Percent, Edit, Clock, X, Wrench, PackageSearch, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { api } from "../services/api";

interface RegistersTabProps {
  tenantId: string;
  clients: Client[];
  assets: Asset[];
  products: Product[];
  services: Service[];
  employees: Employee[];
  contasBancarias?: any[];
  onAddClient: (client: Client) => void;
  onAddAsset: (asset: Asset) => void;
  onAddProduct: (product: Product) => void;
  onAddService: (service: Service) => void;
  onAddEmployee: (employee: Employee) => void;
  onAddContaBancaria?: (data: any) => void;
  onDeleteClient: (id: string) => void;
  onDeleteAsset: (id: string) => void;
  onDeleteProduct: (id: string) => void;
  onDeleteService: (id: string) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateClient?: (client: Client) => void;
  onUpdateAsset?: (asset: Asset) => void;
  onUpdateProduct?: (product: Product) => void;
  onUpdateService?: (service: Service) => void;
  onUpdateEmployee?: (employee: Employee) => void;
  onUpdateContaBancaria?: (id: string, data: any) => void;
  workOrders?: WorkOrder[];
  budgets?: Budget[];
  purchases?: Purchase[];
  onNavigateToOperation?: (type: 'budget'|'workorder', id: string) => void;
}

export default function RegistersTab({
  tenantId,
  clients,
  assets,
  products,
  services,
  employees,
  contasBancarias = [],
  onAddClient,
  onAddAsset,
  onAddProduct,
  onAddService,
  onAddEmployee,
  onAddContaBancaria,
  onDeleteClient,
  onDeleteAsset,
  onDeleteProduct,
  onDeleteService,
  onDeleteEmployee,
  onUpdateClient,
  onUpdateAsset,
  onUpdateProduct,
  onUpdateService,
  onUpdateEmployee,
  onUpdateContaBancaria,
  workOrders = [],
  budgets = [],
  purchases = [],
  onNavigateToOperation
}: RegistersTabProps) {
  const [subTab, setSubTab] = useState<"clients" | "assets" | "products" | "services" | "employees" | "contas">("clients");
  const [search, setSearch] = useState("");

  const [cfops, setCfops] = useState<any[]>([]);
  const [ncms, setNcms] = useState<any[]>([]);

  useEffect(() => {
    // Fetch CFOPs and NCMs on mount
    api.getCfops().then(setCfops).catch(console.error);
    api.getNcms().then(setNcms).catch(console.error);
  }, []);

  // Forms states
  const [showForm, setShowForm] = useState(false);

  // Client Form
  const [clientName, setClientName] = useState("");
  const [clientDoc, setClientDoc] = useState("");
  const [clientRg, setClientRg] = useState("");
  const [clientIe, setClientIe] = useState("");
  const [clientPartnerType, setClientPartnerType] = useState<"Cliente" | "Fornecedor" | "Ambos">("Cliente");
  const [clientIsActive, setClientIsActive] = useState(true);
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCep, setClientCep] = useState("");
  const [clientRua, setClientRua] = useState("");
  const [clientNumero, setClientNumero] = useState("");
  const [clientBairro, setClientBairro] = useState("");
  const [clientCidade, setClientCidade] = useState("");
  const [clientEstado, setClientEstado] = useState("");
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) {
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      value = value.replace(/^(\d{2})(\d)/, "$1.$2");
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
      value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
      value = value.replace(/(\d{4})(\d)/, "$1-$2");
    }
    setClientDoc(value.substring(0, 18));
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    
    // Apply basic mask (00000-000)
    let formattedCep = value;
    if (value.length > 5) {
      formattedCep = value.replace(/^(\d{5})(\d)/, "$1-$2");
    }
    setClientCep(formattedCep.substring(0, 9));

    if (value.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${value}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setClientRua(data.logradouro || "");
          setClientBairro(data.bairro || "");
          setClientCidade(data.localidade || "");
          setClientEstado(data.uf || "");
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const formatPhoneStr = (value: string) => {
    if (!value) return "";
    let val = value.replace(/\D/g, "");
    if (val.length <= 10) {
      val = val.replace(/^(\d{2})(\d)/g, "($1) $2");
      val = val.replace(/(\d{4})(\d)/, "$1-$2");
    } else {
      val = val.replace(/^(\d{2})(\d)/g, "($1) $2");
      val = val.replace(/(\d{5})(\d)/, "$1-$2");
    }
    return val.substring(0, 15);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientPhone(formatPhoneStr(e.target.value));
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

  // Asset Form
  const [assetName, setAssetName] = useState("");
  const [assetBrand, setAssetBrand] = useState("");
  const [assetModel, setAssetModel] = useState("");
  const [assetSerial, setAssetSerial] = useState("");
  const [assetClientId, setAssetClientId] = useState("");
  const [assetNotes, setAssetNotes] = useState("");
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  // Product Form
  const [prodSku, setProdSku] = useState("");
  const [prodName, setProdName] = useState("");
  const [prodCost, setProdCost] = useState(0);
  const [prodPrice, setProdPrice] = useState(0);
  const [prodMin, setProdMin] = useState(1);
  const [prodStock, setProdStock] = useState(1);
  const [prodUnit, setProdUnit] = useState("UN");
  const [prodCfop, setProdCfop] = useState("");
  const [prodNcm, setProdNcm] = useState("");
  const [prodEan, setProdEan] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // History Modal
  const [historyModalClient, setHistoryModalClient] = useState<Client | null>(null);
  const [historyModalProduct, setHistoryModalProduct] = useState<Product | null>(null);
  const [productHistory, setProductHistory] = useState<ProductHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleOpenProductHistory = async (product: Product) => {
    setHistoryModalProduct(product);
    setIsLoadingHistory(true);
    try {
      const hist = await api.getProductHistory(product.id);
      setProductHistory(hist);
    } catch (e) {
      console.error("Erro ao buscar histórico:", e);
      setProductHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Close modals on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (historyModalClient) {
          setHistoryModalClient(null);
        } else if (historyModalProduct) {
          setHistoryModalProduct(null);
        } else if (showForm) {
          setShowForm(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, historyModalClient, historyModalProduct]);

  const unifiedHistory = useMemo(() => {
    if (!historyModalClient) return [];
    const clientBudgets = budgets.filter(b => b.clientId === historyModalClient.id);
    const clientOS = workOrders.filter(w => w.clientId === historyModalClient.id);
    
    const combined: any[] = [];
    const usedOsIds = new Set();

    clientBudgets.forEach(b => {
      const linkedOs = clientOS.find(w => w.budgetId === b.id);
      combined.push({
        id: b.id,
        date: new Date(b.createdAt),
        assetName: b.assetName,
        budget: b,
        os: linkedOs
      });
      if (linkedOs) usedOsIds.add(linkedOs.id);
    });

    clientOS.forEach(w => {
      if (!usedOsIds.has(w.id)) {
        combined.push({
          id: w.id,
          date: new Date(w.createdAt),
          assetName: w.assetName,
          budget: null,
          os: w
        });
      }
    });

    return combined.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [historyModalClient, budgets, workOrders]);

  // Currency helpers
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return Number(numbers) / 100;
  };

  const formatDuration = (decimalHours: number) => {
    if (!decimalHours || isNaN(decimalHours)) return "";
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const parseDuration = (timeString: string) => {
    let numbers = timeString.replace(/\D/g, "");
    if (!numbers) return 0;
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    numbers = numbers.padStart(4, "0");
    const h = parseInt(numbers.substring(0, 2), 10);
    const m = parseInt(numbers.substring(2, 4), 10);
    return h + (m / 60);
  };

  // Service Form
  const [servName, setServName] = useState("");
  const [servCost, setServCost] = useState(0);
  const [servPrice, setServPrice] = useState(0);
  const [servDuration, setServDuration] = useState(1.0);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Employee Form
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [empSpecialty, setEmpSpecialty] = useState("");
  const [empActive, setEmpActive] = useState(true);
  const [empEmail, setEmpEmail] = useState("");
  const [empCep, setEmpCep] = useState("");
  const [empRua, setEmpRua] = useState("");
  const [empNumero, setEmpNumero] = useState("");
  const [empBairro, setEmpBairro] = useState("");
  const [empCidade, setEmpCidade] = useState("");
  const [empEstado, setEmpEstado] = useState("");
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  // Conta Bancária Form
  const [contaNome, setContaNome] = useState("");
  const [contaTipo, setContaTipo] = useState("Corrente");
  const [contaSaldo, setContaSaldo] = useState(0);
  const [contaBanco, setContaBanco] = useState("");
  const [contaAgencia, setContaAgencia] = useState("");
  const [contaNumero, setContaNumero] = useState("");
  const [contaAtivo, setContaAtivo] = useState(true);
  const [editingContaId, setEditingContaId] = useState<string | null>(null);

  // Filter lists by search query (already filtered by tenant in parent, but double safe check)
  const filteredClients = clients.filter(c => 
    c.tenantId === tenantId &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.document.includes(search))
  );

  const filteredAssets = assets.filter(a => 
    a.tenantId === tenantId &&
    (a.name.toLowerCase().includes(search.toLowerCase()) || a.serialNumber.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredProducts = products.filter(p => 
    p.tenantId === tenantId &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredServices = services.filter(s => 
    s.tenantId === tenantId &&
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEmployees = employees.filter(e =>
    e.tenantId === tenantId &&
    (e.nome.toLowerCase().includes(search.toLowerCase()) || e.cargo.toLowerCase().includes(search.toLowerCase()) || (e.especialidade && e.especialidade.toLowerCase().includes(search.toLowerCase())))
  );

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientDoc) return;
    const newClient: Client = {
      id: editingClientId || ("client-" + Math.random().toString(36).substr(2, 9)),
      tenantId,
      name: clientName,
      document: clientDoc,
      rg: clientRg,
      ie: clientIe,
      partnerType: clientPartnerType,
      isActive: clientIsActive,
      phone: clientPhone,
      email: clientEmail,
      cep: clientCep,
      rua: clientRua,
      numero: clientNumero,
      bairro: clientBairro,
      cidade: clientCidade,
      estado: clientEstado,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    if (editingClientId && onUpdateClient) {
      onUpdateClient(newClient);
    } else {
      onAddClient(newClient);
    }
    
    setShowForm(false);
    // Reset
    setClientName(""); setClientDoc(""); setClientRg(""); setClientIe(""); setClientPartnerType("Cliente"); setClientIsActive(true); setClientPhone(""); setClientEmail(""); 
    setClientCep(""); setClientRua(""); setClientNumero(""); setClientBairro(""); setClientCidade(""); setClientEstado(""); setEditingClientId(null);
  };

  const handleEditClient = (c: Client) => {
    setClientName(c.name);
    setClientDoc(c.document);
    setClientRg(c.rg || "");
    setClientIe(c.ie || "");
    setClientPartnerType(c.partnerType || "Cliente");
    setClientIsActive(c.isActive !== undefined ? c.isActive : true);
    setClientPhone(formatPhoneStr(c.phone));
    setClientEmail(c.email);
    setClientCep(c.cep || "");
    setClientRua(c.rua || "");
    setClientNumero(c.numero || "");
    setClientBairro(c.bairro || "");
    setClientCidade(c.cidade || "");
    setClientEstado(c.estado || "");
    setEditingClientId(c.id);
    setSubTab("clients");
    setShowForm(true);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !assetClientId) return;
    const selectedClient = clients.find(c => c.id === assetClientId);
    const newAsset: Asset = {
      id: editingAssetId || ("asset-" + Math.random().toString(36).substr(2, 9)),
      tenantId,
      clientId: assetClientId,
      clientName: selectedClient?.name || "",
      name: assetName,
      brand: assetBrand,
      model: assetModel,
      serialNumber: assetSerial,
      additionalInfo: assetNotes,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    if (editingAssetId && onUpdateAsset) {
      onUpdateAsset(newAsset);
    } else {
      onAddAsset(newAsset);
    }
    
    setShowForm(false);
    // Reset
    setAssetName(""); setAssetBrand(""); setAssetModel(""); setAssetSerial(""); setAssetClientId(""); setAssetNotes(""); setEditingAssetId(null);
  };

  const handleEditAsset = (asset: Asset) => {
    setAssetName(asset.name);
    setAssetBrand(asset.brand);
    setAssetModel(asset.model);
    setAssetSerial(asset.serialNumber);
    setAssetClientId(asset.clientId);
    setAssetNotes(asset.additionalInfo);
    setEditingAssetId(asset.id);
    setSubTab("assets");
    setShowForm(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodSku || !prodName || prodPrice <= 0) return;
    const newProduct: Product = {
      id: editingProductId || ("product-" + Math.random().toString(36).substr(2, 9)),
      tenantId,
      sku: prodSku,
      name: prodName,
      costPrice: Number(prodCost),
      sellingPrice: Number(prodPrice),
      currentStock: Number(prodStock),
      minimumStock: Number(prodMin),
      unit: prodUnit,
      cfopCodigo: prodCfop ? prodCfop.split(' - ')[0].trim() : null,
      ncmCodigo: prodNcm ? prodNcm.split(' - ')[0].trim() : null,
      ean: prodEan,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    if (editingProductId && onUpdateProduct) {
      onUpdateProduct(newProduct);
    } else {
      onAddProduct(newProduct);
    }
    
    setShowForm(false);
    // Reset
    setProdSku(""); setProdName(""); setProdCost(0); setProdPrice(0); setProdMin(1); setProdStock(1); setProdUnit("UN"); setProdCfop(""); setProdNcm(""); setProdEan(""); setEditingProductId(null);
  };

  const handleEditProduct = (p: Product) => {
    setProdSku(p.sku);
    setProdName(p.name);
    setProdCost(p.costPrice);
    setProdPrice(p.sellingPrice);
    setProdMin(p.minimumStock);
    setProdStock(p.currentStock);
    setProdUnit(p.unit);
    const c = p.cfopCodigo ? cfops.find(x => x.codigo === p.cfopCodigo) : null;
    setProdCfop(c ? `${c.codigo} - ${c.descricaoResumida}` : (p.cfopCodigo || ""));
    const n = p.ncmCodigo ? ncms.find(x => x.codigo === p.ncmCodigo) : null;
    setProdNcm(n ? `${n.codigo} - ${n.descricao}` : (p.ncmCodigo || ""));
    setProdEan(p.ean || "");
    setEditingProductId(p.id);
    setSubTab("products");
    setShowForm(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!servName || servPrice <= 0) return;
    const newService: Service = {
      id: editingServiceId || ("service-" + Math.random().toString(36).substr(2, 9)),
      tenantId,
      name: servName,
      cost: Number(servCost),
      price: Number(servPrice),
      estimatedDurationHours: Number(servDuration),
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    if (editingServiceId && onUpdateService) {
      onUpdateService(newService);
    } else {
      onAddService(newService);
    }
    
    setShowForm(false);
    // Reset
    setServName(""); setServCost(0); setServPrice(0); setServDuration(1.0); setEditingServiceId(null);
  };

  const handleEditService = (s: Service) => {
    setServName(s.name);
    setServCost(s.cost);
    setServPrice(s.price);
    setServDuration(s.estimatedDurationHours);
    setEditingServiceId(s.id);
    setSubTab("services");
    setShowForm(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empRole) return;
    const newEmployee: Employee = {
      id: editingEmployeeId || ("employee-" + Math.random().toString(36).substr(2, 9)),
      tenantId,
      nome: empName,
      cargo: empRole,
      especialidade: empSpecialty,
      ativo: empActive,
      email: empEmail,
      cep: empCep,
      rua: empRua,
      numero: empNumero,
      bairro: empBairro,
      cidade: empCidade,
      estado: empEstado
    };
    
    if (editingEmployeeId && onUpdateEmployee) {
      onUpdateEmployee(newEmployee);
    } else {
      onAddEmployee(newEmployee);
    }
    
    setShowForm(false);
    // Reset
    setEmpName(""); setEmpRole(""); setEmpSpecialty(""); setEmpActive(true); 
    setEmpEmail(""); setEmpCep(""); setEmpRua(""); setEmpNumero(""); setEmpBairro(""); setEmpCidade(""); setEmpEstado("");
    setEditingEmployeeId(null);
  };

  const handleEditEmployee = (e: Employee) => {
    setEmpName(e.nome);
    setEmpRole(e.cargo);
    setEmpSpecialty(e.especialidade || "");
    setEmpActive(e.ativo);
    setEmpEmail(e.email || "");
    setEmpCep(e.cep || "");
    setEmpRua(e.rua || "");
    setEmpNumero(e.numero || "");
    setEmpBairro(e.bairro || "");
    setEmpCidade(e.cidade || "");
    setEmpEstado(e.estado || "");
    setEditingEmployeeId(e.id);
    setSubTab("employees");
    setShowForm(true);
  };

  const handleSaveConta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contaNome || !contaTipo) return;
    
    const data = {
      nome: contaNome,
      tipo: contaTipo,
      saldoInicial: contaSaldo,
      banco: contaBanco,
      agencia: contaAgencia,
      numeroConta: contaNumero,
      ativo: contaAtivo
    };

    if (editingContaId && onUpdateContaBancaria) {
      onUpdateContaBancaria(editingContaId, data);
    } else if (onAddContaBancaria) {
      onAddContaBancaria(data);
    }
    
    setShowForm(false);
    // Reset
    setContaNome(""); setContaTipo("Corrente"); setContaSaldo(0); setContaBanco(""); setContaAgencia(""); setContaNumero(""); setContaAtivo(true); setEditingContaId(null);
  };

  const handleEditConta = (c: any) => {
    setContaNome(c.nome);
    setContaTipo(c.tipo);
    setContaSaldo(c.saldoAtual);
    setContaBanco(c.banco || "");
    setContaAgencia(c.agencia || "");
    setContaNumero(c.numeroConta || "");
    setContaAtivo(c.ativo !== undefined ? c.ativo : true);
    setEditingContaId(c.id);
    setSubTab("contas");
    setShowForm(true);
  };

  const filteredContas = contasBancarias.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) || (c.banco && c.banco.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6" id="registers_tab_content">
      {/* Registers Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex gap-2 overflow-x-auto bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => { setSubTab("clients"); setSearch(""); setShowForm(false); setEditingClientId(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold font-sans transition-all ${
              subTab === "clients" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
            id="subtab_clients_btn"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            Clientes ({clients.filter(c => c.tenantId === tenantId).length})
          </button>
          <button
            onClick={() => { setSubTab("assets"); setSearch(""); setShowForm(false); setEditingAssetId(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold font-sans transition-all ${
              subTab === "assets" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
            id="subtab_assets_btn"
          >
            <Laptop className="w-3.5 h-3.5 text-slate-500" />
            Equipamentos/Ativos ({assets.filter(a => a.tenantId === tenantId).length})
          </button>
          <button
            onClick={() => { setSubTab("products"); setSearch(""); setShowForm(false); setEditingProductId(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold font-sans transition-all ${
              subTab === "products" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
            id="subtab_products_btn"
          >
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            Produtos/Peças ({products.filter(p => p.tenantId === tenantId).length})
          </button>
          <button
            onClick={() => { setSubTab("services"); setSearch(""); setShowForm(false); setEditingServiceId(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold font-sans transition-all ${
              subTab === "services" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
            id="subtab_services_btn"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            Serviços Mão de Obra ({services.filter(s => s.tenantId === tenantId).length})
          </button>
          <button
            onClick={() => { setSubTab("employees"); setSearch(""); setShowForm(false); setEditingEmployeeId(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold font-sans transition-all ${
              subTab === "employees" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
            id="subtab_employees_btn"
          >
            <Wrench className="w-3.5 h-3.5 text-slate-500" />
            Técnicos ({employees.filter(e => e.tenantId === tenantId).length})
          </button>
          <button
            onClick={() => { setSubTab("contas"); setSearch(""); setShowForm(false); setEditingContaId(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold font-sans transition-all ${
              subTab === "contas" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
            id="subtab_contas_btn"
          >
            <div className="w-3.5 h-3.5 bg-slate-500 rounded-sm"></div>
            Contas Bancárias ({contasBancarias.length})
          </button>
        </div>

        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditingClientId(null);
              setEditingAssetId(null);
              setEditingProductId(null);
              setEditingServiceId(null);
              setEditingEmployeeId(null);
              setEditingContaId(null);
              setClientName(""); setClientDoc(""); setClientRg(""); setClientIe(""); setClientPartnerType("Cliente"); setClientIsActive(true); setClientPhone(""); setClientEmail(""); setClientCep(""); setClientRua(""); setClientNumero(""); setClientBairro(""); setClientCidade(""); setClientEstado("");
              setAssetName(""); setAssetBrand(""); setAssetModel(""); setAssetSerial(""); setAssetClientId(""); setAssetNotes("");
              setProdSku(""); setProdName(""); setProdCost(0); setProdPrice(0); setProdMin(1); setProdStock(1); setProdUnit("UN");
              setServName(""); setServCost(0); setServPrice(0); setServDuration(1.0);
              setEmpName(""); setEmpRole(""); setEmpSpecialty(""); setEmpActive(true);
              setContaNome(""); setContaTipo("Corrente"); setContaSaldo(0); setContaBanco(""); setContaAgencia(""); setContaNumero(""); setContaAtivo(true);
            }
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold font-sans shadow-sm transition-colors"
          id="toggle_form_btn"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Fechar Cadastro" : "Adicionar Novo"}
        </button>
      </div>

      {/* SEARCH BAR (if form is hidden) */}
      {!showForm && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            id="register_search_input"
          />
        </div>
      )}

      {/* FORM CONDITIONAL RENDER */}
      {showForm && (
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl animate-fade-in" id="register_form_container">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-sans font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-slate-900 rounded-full inline-block"></span>
              {(editingClientId || editingAssetId || editingProductId || editingServiceId || editingEmployeeId || editingContaId) ? "Editar " : "Cadastrar Novo "} 
              {subTab === "clients" ? "Cliente / Fornecedor" : subTab === "assets" ? "Ativo" : subTab === "products" ? "Produto" : subTab === "services" ? "Serviço" : subTab === "employees" ? "Técnico" : "Conta Bancária"}
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-xs font-semibold transition-colors"
              >
                Voltar
              </button>
              {subTab === "clients" && editingClientId && (
                <button
                  type="button"
                  onClick={() => setHistoryModalClient(clients.find(c => c.id === editingClientId) || null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-xs font-semibold transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Ver Histórico
                </button>
              )}
              {subTab === "products" && editingProductId && (
                <button
                  type="button"
                  onClick={() => handleOpenProductHistory(products.find(p => p.id === editingProductId)!)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md text-xs font-semibold transition-colors"
                >
                  <PackageSearch className="w-3.5 h-3.5" />
                  Kardex / Histórico
                </button>
              )}
            </div>
          </div>

          {/* CLIENT FORM */}
          {subTab === "clients" && (
            <form onSubmit={handleSaveClient} onKeyDown={handleEnterAsTab} className="grid grid-cols-1 md:grid-cols-2 gap-4" autoComplete="off">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Nome Completo / Razão Social *</label>
                <input autoComplete="nope" required type="text" placeholder="ex: Augusto de Oliveira S.A." value={clientName} onChange={e=>setClientName(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">CPF / CNPJ *</label>
                <input autoComplete="nope" required type="text" placeholder="ex: 123.456.789-00" value={clientDoc} onChange={handleDocChange} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">RG</label>
                  <input autoComplete="nope" type="text" placeholder="ex: 12.345.678-9" value={clientRg} onChange={e=>setClientRg(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Inscrição Estadual (IE)</label>
                  <input autoComplete="nope" type="text" placeholder="ex: 123.456.789.123" value={clientIe} onChange={e=>setClientIe(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Tipo de Parceiro</label>
                  <select value={clientPartnerType} onChange={e=>setClientPartnerType(e.target.value as any)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs">
                    <option value="Cliente">Cliente</option>
                    <option value="Fornecedor">Fornecedor</option>
                    <option value="Ambos">Ambos</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input type="checkbox" id="clientIsActive" checked={clientIsActive} onChange={e=>setClientIsActive(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                  <label htmlFor="clientIsActive" className="text-xs font-semibold text-slate-700 cursor-pointer">Cadastro Ativo</label>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Telefone / WhatsApp</label>
                <input autoComplete="nope" type="text" placeholder="ex: (11) 99999-8888" value={clientPhone} onChange={handlePhoneChange} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">E-mail</label>
                <input autoComplete="nope" type="email" placeholder="ex: contato@empresa.com" value={clientEmail} onChange={e=>setClientEmail(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4 mt-2 border-t border-slate-200 pt-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">CEP</label>
                  <input autoComplete="nope" type="text" placeholder="00000-000" value={clientCep} onChange={handleCepChange} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Rua / Logradouro</label>
                  <input autoComplete="nope" type="text" placeholder="Rua Augusta" value={clientRua} onChange={e=>setClientRua(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Número</label>
                  <input autoComplete="nope" type="text" placeholder="123" value={clientNumero} onChange={e=>setClientNumero(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Bairro</label>
                  <input autoComplete="nope" type="text" placeholder="Centro" value={clientBairro} onChange={e=>setClientBairro(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Cidade</label>
                  <input autoComplete="nope" type="text" placeholder="São Paulo" value={clientCidade} onChange={e=>setClientCidade(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Estado (UF)</label>
                  <input type="text" placeholder="SP" value={clientEstado} onChange={e=>setClientEstado(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
              </div>
              <div className="md:col-span-2 pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={()=>{setShowForm(false); setEditingClientId(null);}} className="px-4 py-2 border border-slate-200 rounded text-xs font-semibold bg-white text-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-semibold">
                  {editingClientId ? "Salvar Alterações" : "Salvar Cliente"}
                </button>
              </div>
            </form>
          )}

          {/* ASSET FORM */}
          {subTab === "assets" && (
            <form onSubmit={handleSaveAsset} onKeyDown={handleEnterAsTab} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Dono / Cliente Proprietário *</label>
                <select required value={assetClientId} onChange={e=>setAssetClientId(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs">
                  <option value="">Selecione o Cliente...</option>
                  {clients.filter(c => c.tenantId === tenantId).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.document})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Descrição do Ativo *</label>
                <input required type="text" placeholder="ex: Ar Condicionado Midea 12k BTUs" value={assetName} onChange={e=>setAssetName(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Marca</label>
                <input type="text" placeholder="ex: Honda / Carrier / Midea" value={assetBrand} onChange={e=>setAssetBrand(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Modelo</label>
                <input type="text" placeholder="ex: Hi-Wall 2025" value={assetModel} onChange={e=>setAssetModel(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Número de Série / Placa</label>
                <input type="text" placeholder="ex: SN-92837123" value={assetSerial} onChange={e=>setAssetSerial(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Informações Adicionais / Observações</label>
                <textarea rows={2} placeholder="Histórico de reparos, voltagem, ano, particularidades..." value={assetNotes} onChange={e=>setAssetNotes(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div className="md:col-span-2 pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={()=>{setShowForm(false); setEditingAssetId(null);}} className="px-4 py-2 border border-slate-200 rounded text-xs font-semibold bg-white text-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-semibold">
                  {editingAssetId ? "Salvar Alterações" : "Salvar Equipamento"}
                </button>
              </div>
            </form>
          )}

          {/* PRODUCT FORM */}
          {subTab === "products" && (
            <form onSubmit={handleSaveProduct} onKeyDown={handleEnterAsTab} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Código SKU / Referência *</label>
                <input required type="text" placeholder="ex: PAST-01-COB" value={prodSku} onChange={e=>setProdSku(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Nome do Produto / Peça *</label>
                <input required type="text" placeholder="ex: Pastilha de Freio Cobreq Ford Ka" value={prodName} onChange={e=>setProdName(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Preço de Custo (R$) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-medium text-xs">R$</span>
                  <input required type="text" placeholder="0,00" value={formatCurrency(prodCost)} onChange={e=>setProdCost(parseCurrency(e.target.value))} className="w-full pl-8 p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Preço de Venda (R$) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-medium text-xs">R$</span>
                  <input required type="text" placeholder="0,00" value={formatCurrency(prodPrice)} onChange={e=>setProdPrice(parseCurrency(e.target.value))} className="w-full pl-8 p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Unidade de Medida</label>
                <input type="text" placeholder="ex: UN, KG, L, PAR" value={prodUnit} onChange={e=>setProdUnit(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Estoque Inicial Atual *</label>
                <input required type="number" min="0" value={prodStock} onChange={e=>setProdStock(Number(e.target.value))} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Estoque Mínimo Alerta *</label>
                <input required type="number" min="0" value={prodMin} onChange={e=>setProdMin(Number(e.target.value))} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div className="bg-slate-100 p-2.5 rounded border border-slate-200 text-[11px] text-slate-600 flex flex-col justify-center">
                <span><strong>Margem Lucro:</strong> {prodPrice > 0 ? (((prodPrice - prodCost)/prodPrice)*100).toFixed(1) : 0}%</span>
                <span><strong>Lucro Líquido:</strong> R$ {prodPrice - prodCost}</span>
              </div>
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 pt-4 mt-2">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">CFOP *</label>
                  <input required list="cfop-list" type="text" placeholder="ex: 5102" value={prodCfop} onChange={e=>setProdCfop(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                  <datalist id="cfop-list">
                    {cfops.map(c => <option key={c.codigo} value={`${c.codigo} - ${c.descricaoResumida}`}>{c.descricaoResumida}</option>)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">NCM *</label>
                  <input required list="ncm-list" type="text" placeholder="ex: 87083090" value={prodNcm} onChange={e=>setProdNcm(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                  <datalist id="ncm-list">
                    {ncms.map(n => <option key={n.codigo} value={`${n.codigo} - ${n.descricao}`}>{n.descricao}</option>)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Cód. Barras (EAN)</label>
                  <input type="text" placeholder="ex: 7891234567890" value={prodEan} onChange={e=>setProdEan(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
              </div>
              <div className="md:col-span-3 pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={()=>{setShowForm(false); setEditingProductId(null);}} className="px-4 py-2 border border-slate-200 rounded text-xs font-semibold bg-white text-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-semibold">
                  {editingProductId ? "Salvar Alterações" : "Salvar Produto"}
                </button>
              </div>
            </form>
          )}

          {/* SERVICE FORM */}
          {subTab === "services" && (
            <form onSubmit={handleSaveService} onKeyDown={handleEnterAsTab} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Nome do Serviço Mão de Obra *</label>
                <input required type="text" placeholder="ex: Retífica de Disco de Freio e Instalação" value={servName} onChange={e=>setServName(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Custo Estimado Mão de Obra (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-medium text-xs">R$</span>
                  <input required type="text" placeholder="0,00" value={formatCurrency(servCost)} onChange={e=>setServCost(parseCurrency(e.target.value))} className="w-full pl-8 p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Preço de Venda do Serviço (R$) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-medium text-xs">R$</span>
                  <input required type="text" placeholder="0,00" value={formatCurrency(servPrice)} onChange={e=>setServPrice(parseCurrency(e.target.value))} className="w-full pl-8 p-2.5 bg-white border border-slate-200 rounded text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Duração Média Estimada (Horas)</label>
                <input required type="text" placeholder="HH:MM (ex: 01:30)" value={formatDuration(servDuration)} onChange={e=>setServDuration(parseDuration(e.target.value))} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs font-mono" />
              </div>
              <div className="bg-slate-100 p-2.5 rounded border border-slate-200 text-[11px] text-slate-600 flex flex-col justify-center">
                <span><strong>Margem Lucro:</strong> {servPrice > 0 ? (((servPrice - servCost)/servPrice)*100).toFixed(1) : 0}%</span>
                <span><strong>Lucro Operacional:</strong> R$ {servPrice - servCost}</span>
              </div>
              <div className="md:col-span-2 pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={()=>{setShowForm(false); setEditingServiceId(null);}} className="px-4 py-2 border border-slate-200 rounded text-xs font-semibold bg-white text-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-semibold">
                  {editingServiceId ? "Salvar Alterações" : "Salvar Serviço"}
                </button>
              </div>
            </form>
          )}

          {/* EMPLOYEE FORM */}
          {subTab === "employees" && (
            <form onSubmit={handleSaveEmployee} onKeyDown={handleEnterAsTab} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Nome do Técnico / Funcionário *</label>
                <input required type="text" placeholder="ex: João Silva" value={empName} onChange={e=>setEmpName(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Cargo *</label>
                <input required type="text" placeholder="ex: Mecânico Sênior" value={empRole} onChange={e=>setEmpRole(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Especialidade</label>
                <input type="text" placeholder="ex: Motores, Eletricista, Suspensão" value={empSpecialty} onChange={e=>setEmpSpecialty(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">E-mail</label>
                <input type="email" placeholder="ex: joao@oficina.com.br" value={empEmail} onChange={e=>setEmpEmail(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">CEP</label>
                <input type="text" placeholder="ex: 00000-000" value={empCep} onChange={e=>setEmpCep(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Rua / Logradouro</label>
                <input type="text" value={empRua} onChange={e=>setEmpRua(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Número</label>
                <input type="text" value={empNumero} onChange={e=>setEmpNumero(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Bairro</label>
                <input type="text" value={empBairro} onChange={e=>setEmpBairro(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Cidade</label>
                <input type="text" value={empCidade} onChange={e=>setEmpCidade(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Estado</label>
                <input type="text" value={empEstado} onChange={e=>setEmpEstado(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div className="md:col-span-2 flex items-center gap-2 mt-2">
                <input type="checkbox" id="empActive" checked={empActive} onChange={e=>setEmpActive(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-600" />
                <label htmlFor="empActive" className="text-sm font-semibold text-slate-700">Técnico Ativo no Sistema</label>
              </div>
              <div className="md:col-span-2 pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={()=>{setShowForm(false); setEditingEmployeeId(null);}} className="px-4 py-2 border border-slate-200 rounded text-xs font-semibold bg-white text-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-semibold">
                  {editingEmployeeId ? "Salvar Alterações" : "Salvar Técnico"}
                </button>
              </div>
            </form>
          )}

          {/* CONTA BANCÁRIA FORM */}
          {subTab === "contas" && (
            <form onSubmit={handleSaveConta} onKeyDown={handleEnterAsTab} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Nome da Conta *</label>
                <input required type="text" placeholder="ex: Caixa Principal, Bradesco PJ" value={contaNome} onChange={e=>setContaNome(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Tipo *</label>
                <select required value={contaTipo} onChange={e=>setContaTipo(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs">
                  <option value="Corrente">Conta Corrente</option>
                  <option value="Poupanca">Conta Poupança</option>
                  <option value="Caixa">Caixa Físico</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Banco</label>
                <input type="text" placeholder="ex: Itaú, Bradesco, Nubank" value={contaBanco} onChange={e=>setContaBanco(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Agência</label>
                <input type="text" placeholder="ex: 0001" value={contaAgencia} onChange={e=>setContaAgencia(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Conta Corrente</label>
                <input type="text" placeholder="ex: 12345-6" value={contaNumero} onChange={e=>setContaNumero(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs" />
              </div>
              {!editingContaId && (
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Saldo Inicial (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-medium text-xs">R$</span>
                    <input type="text" placeholder="0,00" value={formatCurrency(contaSaldo)} onChange={e=>setContaSaldo(parseCurrency(e.target.value))} className="w-full pl-8 p-2.5 bg-white border border-slate-200 rounded text-xs" />
                  </div>
                </div>
              )}
              <div className="md:col-span-2 flex items-center gap-2 mt-2">
                <input type="checkbox" id="contaAtivo" checked={contaAtivo} onChange={e=>setContaAtivo(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-600" />
                <label htmlFor="contaAtivo" className="text-sm font-semibold text-slate-700">Conta Ativa / Inativa</label>
              </div>
              <div className="md:col-span-2 pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button type="button" onClick={()=>{setShowForm(false); setEditingContaId(null);}} className="px-4 py-2 border border-slate-200 rounded text-xs font-semibold bg-white text-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded text-xs font-semibold">
                  {editingContaId ? "Salvar Alterações" : "Salvar Conta"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* RENDER GRIDS */}
      {!showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* TABELA DE CLIENTES */}
          {subTab === "clients" && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-mono text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Nome / Detalhes</th>
                  <th className="px-4 py-3">Documento / Tipo</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Endereço</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredClients.map(c => (
                  <tr key={c.id} onClick={() => handleEditClient(c)} className="hover:bg-slate-50/50 cursor-pointer">
                    <td className="px-4 py-3.5">
                      <div className="font-sans font-semibold text-slate-800 flex items-center gap-2">
                        {c.name}
                        {c.isActive === false && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">INATIVO</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono font-semibold">Cód: {c.codigo ? `CLI-${c.codigo.toString().padStart(4, '0')}` : (c as any).Codigo ? `CLI-${(c as any).Codigo.toString().padStart(4, '0')}` : c.id.substring(0,8)}</div>
                    </td>
                    <td className="px-4 py-3.5 space-y-0.5 whitespace-nowrap">
                      <div className="font-mono font-medium text-slate-700">{c.document}</div>
                      <div className="text-[10px] text-indigo-600 font-semibold">{c.partnerType?.toUpperCase() || 'CLIENTE'}</div>
                    </td>
                    <td className="px-4 py-3.5 space-y-0.5">
                      <div className="font-sans text-slate-700">{c.phone}</div>
                      <div className="font-mono text-[10px] text-slate-500">{c.email}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">
                      {c.rua}{c.numero ? `, ${c.numero}` : ''}{c.bairro ? ` - ${c.bairro}` : ''}{c.cidade ? ` - ${c.cidade}/${c.estado}` : ''}
                      {(!c.rua && !c.bairro && !c.cidade) && <span className="text-slate-400 italic">Sem endereço</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); setHistoryModalClient(c); }}
                        className="p-1 text-slate-400 hover:text-emerald-600 transition-colors inline-block"
                        title="Ver Histórico"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditClient(c); }}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors inline-block"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteClient(c.id); }}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors inline-block"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      Nenhum cliente encontrado para os critérios de busca.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TABELA DE EQUIPAMENTOS */}
        {subTab === "assets" && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-mono text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Nome do Ativo</th>
                  <th className="px-4 py-3">Cliente Proprietário</th>
                  <th className="px-4 py-3">Marca / Modelo</th>
                  <th className="px-4 py-3">Nº Série / Placa</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredAssets.map(a => (
                  <tr key={a.id} onClick={() => handleEditAsset(a)} className="hover:bg-slate-50/50 cursor-pointer">
                    <td className="px-4 py-3.5">
                      <div className="font-sans font-semibold text-slate-800">{a.name}</div>
                      <div className="text-[10px] text-slate-400 leading-normal">{a.additionalInfo}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-sans font-semibold text-indigo-700">{a.clientName || clients.find(c=>c.id === a.clientId)?.name || "Cliente Desconhecido"}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {a.brand} {a.model}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 font-semibold">{a.serialNumber}</td>
                    <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditAsset(a); }}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors inline-block"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteAsset(a.id); }}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors inline-block"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAssets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      Nenhum equipamento cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TABELA DE PRODUTOS */}
        {subTab === "products" && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-mono text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Produto / SKU</th>
                  <th className="px-4 py-3 text-right">Preço Custo</th>
                  <th className="px-4 py-3 text-right">Preço Venda</th>
                  <th className="px-4 py-3 text-center">Estoque Atual</th>
                  <th className="px-4 py-3 text-center">Estoque Mínimo</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredProducts.map(p => (
                  <tr key={p.id} onClick={() => handleEditProduct(p)} className="hover:bg-slate-50/50 cursor-pointer">
                    <td className="px-4 py-3.5">
                      <div className="font-sans font-semibold text-slate-800">{p.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">SKU: {p.sku} | Unit: {p.unit}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-500">
                      R$ {p.costPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">
                      R$ {p.sellingPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2 py-1 rounded font-mono font-bold ${
                        p.currentStock <= p.minimumStock ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-800"
                      }`}>
                        {p.currentStock} {p.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono text-slate-600">{p.minimumStock} {p.unit}</td>
                    <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditProduct(p); }}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors inline-block"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteProduct(p.id); }}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors inline-block"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      Nenhum produto cadastrado no catálogo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TABELA DE SERVIÇOS */}
        {subTab === "services" && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-mono text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Nome do Serviço</th>
                  <th className="px-4 py-3 text-right">Custo Estimado</th>
                  <th className="px-4 py-3 text-right">Preço de Venda</th>
                  <th className="px-4 py-3 text-center">Tempo Estimado (h)</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredServices.map(s => (
                  <tr key={s.id} onClick={() => handleEditService(s)} className="hover:bg-slate-50/50 cursor-pointer">
                    <td className="px-4 py-3.5 font-sans font-semibold text-slate-800">
                      {s.name}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-500">
                      R$ {s.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">
                      R$ {s.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono text-slate-600">
                      {s.estimatedDurationHours} h
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditService(s); }}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors inline-block"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteService(s.id); }}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors inline-block"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredServices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      Nenhum serviço registrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TABELA DE TÉCNICOS */}
        {subTab === "employees" && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-mono text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Técnico / Funcionário</th>
                  <th className="px-4 py-3">Cargo / Especialidade</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredEmployees.map(e => (
                  <tr key={e.id} onClick={() => handleEditEmployee(e)} className="hover:bg-slate-50/50 cursor-pointer">
                    <td className="px-4 py-3.5">
                      <div className="font-sans font-semibold text-slate-800 flex items-center gap-2">
                        {e.nome}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono font-semibold">Cód: {e.codigo ? `FUN-${e.codigo.toString().padStart(4, '0')}` : (e as any).Codigo ? `FUN-${(e as any).Codigo.toString().padStart(4, '0')}` : e.id.substring(0,8)}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-sans font-medium text-slate-700">{e.cargo}</div>
                      {e.especialidade && <div className="text-[10px] text-slate-500 mt-0.5">{e.especialidade}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {e.ativo ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          <Check className="w-3 h-3" />
                          ATIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                          <X className="w-3 h-3" />
                          INATIVO
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={(ev) => { ev.stopPropagation(); handleEditEmployee(e); }}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition-colors inline-block mr-2"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); onDeleteEmployee(e.id); }}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors inline-block"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                      Nenhum técnico registrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        </div>
      )}

      {/* CONTAS BANCARIAS LIST */}
      {!showForm && subTab === "contas" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 font-mono text-[10px] text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 border-b border-slate-200">Nome da Conta / Tipo</th>
                  <th className="px-4 py-3 border-b border-slate-200">Dados Bancários</th>
                  <th className="px-4 py-3 border-b border-slate-200 text-right">Saldo Atual</th>
                  <th className="px-4 py-3 border-b border-slate-200 text-center">Status</th>
                  <th className="px-4 py-3 border-b border-slate-200 w-16">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContas.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{c.nome}</div>
                      <div className="text-[10px] text-slate-500">{c.tipo}</div>
                    </td>
                    <td className="px-4 py-3">
                      {c.banco ? (
                        <>
                          <div className="font-semibold text-slate-700">{c.banco}</div>
                          <div className="text-[10px] font-mono text-slate-500">Ag: {c.agencia || '-'} | CC: {c.numeroConta || '-'}</div>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`font-mono font-medium ${c.saldoAtual < 0 ? 'text-rose-600' : c.saldoAtual > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                        R$ {c.saldoAtual.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.ativo !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {c.ativo !== false ? "ATIVO" : "INATIVO"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleEditConta(c)}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition-colors inline-block"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredContas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      Nenhuma conta bancária registrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyModalClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="font-sans font-semibold text-slate-900 text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Histórico de Operações
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Parceiro: <span className="font-semibold text-slate-700">{historyModalClient.name}</span> | Documento: {historyModalClient.document}
                </p>
              </div>
              <button onClick={() => setHistoryModalClient(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-mono text-[10px] text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-200">Data / Ativo</th>
                      <th className="px-4 py-3 border-b border-slate-200">Orçamento</th>
                      <th className="px-4 py-3 border-b border-slate-200">Ordem de Serviço</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unifiedHistory.length > 0 ? (
                      unifiedHistory.map((row: any) => (
                        <tr key={row.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">{row.date.toLocaleDateString()}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-[10px] text-slate-500 truncate max-w-[120px]" title={row.assetName}>{row.assetName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {row.budget ? (
                              <button 
                                onClick={() => { setHistoryModalClient(null); if(onNavigateToOperation) onNavigateToOperation('budget', row.budget.id); }}
                                className="text-left group flex items-center gap-2"
                              >
                                <span className="font-mono font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">#{row.budget.id}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">{row.budget.status}</span>
                                <span className="font-mono text-slate-500">R$ {row.budget.totalPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 italic text-[10px] font-mono">-- Direto em OS --</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.os ? (
                              <button 
                                onClick={() => { setHistoryModalClient(null); if(onNavigateToOperation) onNavigateToOperation('workorder', row.os.id); }}
                                className="text-left group flex items-center gap-2"
                              >
                                <span className="font-mono font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">#{row.os.id}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.os.status === 'Fechada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{row.os.status}</span>
                                <span className="font-mono text-slate-500">R$ {row.os.totalPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 italic text-[10px] font-mono">-- Aguardando --</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">
                          Nenhum histórico encontrado para este parceiro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT HISTORY MODAL (KARDEX) */}
      {historyModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="font-sans font-semibold text-slate-900 text-lg flex items-center gap-2">
                  <PackageSearch className="w-5 h-5 text-emerald-600" />
                  Kardex: Histórico de Movimentações
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Produto: <span className="font-semibold text-slate-700">{historyModalProduct.name}</span> | SKU: {historyModalProduct.sku}
                </p>
              </div>
              <button onClick={() => setHistoryModalProduct(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider block">Estoque Atual</span>
                  <span className="text-2xl font-mono font-bold text-slate-800 block mt-1">{historyModalProduct.currentStock} {historyModalProduct.unit}</span>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-mono text-emerald-600 font-semibold uppercase tracking-wider block">Preço de Venda</span>
                  <span className="text-2xl font-mono font-bold text-emerald-700 block mt-1">R$ {historyModalProduct.sellingPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider block">Custo Médio</span>
                  <span className="text-2xl font-mono font-bold text-slate-700 block mt-1">R$ {historyModalProduct.costPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                {isLoadingHistory ? (
                  <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                    <p className="font-mono text-xs uppercase tracking-wider">Carregando Kardex...</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-mono text-[10px] text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3 border-b border-slate-200">Data</th>
                        <th className="px-4 py-3 border-b border-slate-200">Tipo</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-center">Quantidade</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-right">Valor Unit.</th>
                        <th className="px-4 py-3 border-b border-slate-200">Documento / Referência</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productHistory.length > 0 ? (
                        productHistory.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-800">{new Date(row.date).toLocaleDateString('pt-BR')}</span>
                            </td>
                            <td className="px-4 py-3">
                              {row.type === 'Entrada' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                  <ArrowDownRight className="w-3 h-3" />
                                  ENTRADA
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                  <ArrowUpRight className="w-3 h-3" />
                                  SAÍDA
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-mono font-bold text-slate-700">{row.quantity}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-mono text-slate-600">R$ {row.unitPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-mono font-medium text-slate-700">{row.document}</span>
                                <span className="text-[9px] text-slate-400">{row.status}</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">
                            Nenhuma movimentação registrada para este produto.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
