/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- Multi-tenancy ---
export interface Tenant {
  id: string;
  name: string;
  document: string; // CNPJ or CPF
  segment: string; // e.g., "Mecânica Automotiva", "Refrigeração", "Assistência Técnica"
  dbHost: string; // Dynamic connection metadata
}

// --- Cadastros Mestres ---
export interface Client {
  id: string;
  codigo?: number;
  tenantId: string;
  name: string;
  document: string; // CPF/CNPJ
  rg?: string;
  ie?: string; // Inscrição Estadual
  partnerType: "Cliente" | "Fornecedor" | "Ambos";
  isActive: boolean;
  phone: string;
  email: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  codigo?: number;
  tenantId: string;
  clientId: string;
  clientName?: string; // Denormalized for display
  name: string; // e.g., "Ar Condicionado Split 12000 BTUs", "Civic 2.0 LXL 2014"
  brand: string;
  model: string;
  serialNumber: string; // or Plate/Chassis for auto
  additionalInfo: string;
  createdAt: string;
}

export interface Service {
  id: string;
  codigo?: number;
  tenantId: string;
  name: string;
  price: number;
  cost: number; // Mão de obra ou custo associado
  estimatedDurationHours: number;
  createdAt: string;
}

export interface Product {
  id: string;
  codigo?: number;
  tenantId: string;
  sku: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minimumStock: number;
  unit: string; // e.g., "UN", "L", "KG"
  cfopCodigo: string | null;
  ncmCodigo: string | null;
  ean: string;
  createdAt: string;
}

export interface ProductHistoryEntry {
  id: string;
  type: 'Entrada' | 'Saida';
  date: string;
  quantity: number;
  unitPrice: number;
  document: string;
  status: string;
}

export interface Cfop {
  codigo: string;
  descricaoResumida: string;
}

export interface Ncm {
  codigo: string;
  descricao: string;
}

export interface Employee {
  id: string;
  codigo?: number;
  tenantId: string;
  nome: string;
  cargo: string;
  especialidade?: string;
  ativo: boolean;
}

// --- Agenda & Operação ---
export type ScheduleStatus = "Agendado" | "Cancelado" | "Em OS";

export interface Schedule {
  id: string;
  codigo?: number;
  tenantId: string;
  clientId: string;
  clientName: string;
  assetId: string;
  assetName: string;
  dateTime: string;
  description: string;
  status: ScheduleStatus;
  workOrderId?: string;
  createdAt: string;
}

// --- Orçamento ---
export type BudgetStatus = "Rascunho" | "Enviado" | "Aprovado" | "Rejeitado" | "Cancelado";

export interface BudgetItem {
  id: string;
  type: "product" | "service";
  itemId: string;
  name: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
}

export interface Budget {
  id: string;
  codigo?: number;
  tenantId: string;
  clientId: string;
  clientName: string;
  assetId: string;
  assetName: string;
  status: BudgetStatus;
  items: BudgetItem[];
  totalCost: number;
  totalPrice: number;
  marginPercent: number;
  notes: string;
  technicianId?: string;
  technicianName?: string;
  workOrderId?: string; // Tracing
  createdAt: string;
}

// --- Ordem de Serviço (OS) ---
export type WorkOrderStatus = "Aberta" | "Em Execução" | "Pausada" | "Concluída" | "Faturada" | "Cancelada";

export interface WorkOrderItem {
  id: string;
  type: "product" | "service";
  itemId: string;
  name: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
  isDelivered: boolean; // For tracking requisitions
}

export interface WorkOrder {
  id: string;
  codigo?: number;
  numero?: string;
  tenantId: string;
  clientId: string;
  clientName: string;
  assetId: string;
  assetName: string;
  budgetId?: string; // Tracing
  status: WorkOrderStatus | string;
  items: WorkOrderItem[];
  openingKm?: number;
  totalCost: number;
  totalPrice: number;
  marginPercent: number;
  diagnosis: string;
  checklistPassed: boolean;
  technicianNotes: string;
  technicianId?: string;
  technicianName?: string;
  startedAt?: string;
  estimatedCompletionAt?: string;
  completedAt?: string;
  closedAt?: string;
  createdAt: string;
}

// --- Estoque & Compras ---
export type PurchaseStatus = "Necessidade" | "Pedido" | "NF Recebida" | "Cancelado";

export interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  costPrice: number;
  totalPrice: number;
}

export interface Purchase {
  id: string;
  tenantId: string;
  status: PurchaseStatus;
  supplierId: string;
  supplier: string;
  invoiceNumber?: string;
  items: PurchaseItem[];
  totalAmount: number;
  createdAt: string;
  receivedAt?: string;
}

// --- Financeiro ---
export interface ContaBancaria {
  id: string;
  nome: string;
  tipo: "Corrente" | "Poupanca" | "Caixa" | "Outro";
  saldoAtual: number;
}

export type InvoiceType = "Receita_OS" | "Despesa_Compra" | "Ajuste";
export type TransactionStatus = "Pendente" | "Pago" | "Atrasado" | "Cancelado";

export interface FinancialTransaction {
  id: string;
  tenantId: string;
  type: "receita" | "despesa";
  category: string; // e.g., "Serviço", "Peça", "Compra de Estoque", "Aluguel"
  sourceId?: string; // Link to OS ID or Purchase ID
  description: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: TransactionStatus;
  paymentMethod?: string;
  contaBancariaId?: string;
  createdAt: string;
}

// --- Cash Ledger (Caixa) ---
export interface CashLedger {
  id: string;
  tenantId: string;
  type: "entrada" | "saida";
  amount: number;
  description: string;
  transactionId: string;
  contaBancariaId: string;
  dateTimeRecorded: string;
}

// --- Fiscal ---
export interface FiscalDocument {
  id: string;
  tenantId: string;
  sourceType: "OS" | "Venda";
  sourceId: string;
  invoiceNumber: string;
  status: "Processando" | "Emitida" | "Rejeitada";
  xmlPayload: string;
  pdfUrl?: string;
  createdAt: string;
}
