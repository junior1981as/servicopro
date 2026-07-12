/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tenant, Client, Asset, Service, Product, Schedule, Budget, WorkOrder, FinancialTransaction, CashLedger, Purchase } from "../types";

export const INITIAL_TENANTS: Tenant[] = [
  {
    id: "tenant-autoclinica",
    name: "Oficina AutoClínica MEI",
    document: "12.345.678/0001-90",
    segment: "Automotivo",
    dbHost: "mssql-server-primary-east.database.windows.net/db_autoclinica"
  },
  {
    id: "tenant-friomax",
    name: "FrioMax Climatização & Refrigeração",
    document: "98.765.432/0001-21",
    segment: "Climatização",
    dbHost: "mssql-server-primary-east.database.windows.net/db_friomax"
  }
];

// --- Tenant 1: AutoClínica MEI data ---
const c1_auto: Client = {
  id: "client-auto-1",
  tenantId: "tenant-autoclinica",
  name: "Carlos Augusto de Souza",
  document: "111.222.333-44",
  phone: "(11) 98888-7777",
  email: "carlos.souza@gmail.com",
  rua: "Av. Paulista",
  numero: "1000",
  bairro: "Bela Vista",
  cidade: "São Paulo",
  estado: "SP",
  cep: "01310-100",
  partnerType: "Cliente",
  isActive: true,
  createdAt: "2026-06-01"
};

const c2_auto: Client = {
  id: "client-auto-2",
  tenantId: "tenant-autoclinica",
  name: "Maria Eduarda Lima",
  document: "222.333.444-55",
  phone: "(11) 97777-6666",
  email: "madu.lima@hotmail.com",
  rua: "Rua das Flores",
  numero: "245",
  bairro: "Centro",
  cidade: "São Bernardo do Campo",
  estado: "SP",
  cep: "09710-000",
  partnerType: "Cliente",
  isActive: true,
  createdAt: "2026-06-15"
};

const a1_auto: Asset = {
  id: "asset-auto-1",
  tenantId: "tenant-autoclinica",
  clientId: "client-auto-1",
  clientName: "Carlos Augusto de Souza",
  name: "Honda Civic LXS 1.8 Flex Manual",
  brand: "Honda",
  model: "Civic LXS",
  serialNumber: "BRA-2E19 / Chassi: 93H5X12837198",
  additionalInfo: "Cor cinza, blindagem Nível I, reclama de ruído na suspensão dianteira direita.",
  createdAt: "2026-06-01"
};

const a2_auto: Asset = {
  id: "asset-auto-2",
  tenantId: "tenant-autoclinica",
  clientId: "client-auto-2",
  clientName: "Maria Eduarda Lima",
  name: "Chevrolet Onix 1.0 Turbo LTZ Automático",
  brand: "Chevrolet",
  model: "Onix LTZ",
  serialNumber: "ABC-1234 / Chassi: 9BGK481978263",
  additionalInfo: "Revisão periódica de 40.000km, ar condicionado fraco.",
  createdAt: "2026-06-15"
};

const s_auto: Service[] = [
  {
    id: "service-auto-1",
    tenantId: "tenant-autoclinica",
    name: "Alinhamento 3D e Balanceamento",
    price: 150.00,
    cost: 40.00, // Custo de insumo ou técnico estimado
    estimatedDurationHours: 1.5,
    createdAt: "2026-05-01"
  },
  {
    id: "service-auto-2",
    tenantId: "tenant-autoclinica",
    name: "Substituição de Amortecedores Dianteiros",
    price: 320.00,
    cost: 100.00,
    estimatedDurationHours: 3.0,
    createdAt: "2026-05-01"
  },
  {
    id: "service-auto-3",
    tenantId: "tenant-autoclinica",
    name: "Carga de Gás do Ar Condicionado R134a",
    price: 180.00,
    cost: 45.00,
    estimatedDurationHours: 1.0,
    createdAt: "2026-05-01"
  },
  {
    id: "service-auto-4",
    tenantId: "tenant-autoclinica",
    name: "Troca de Óleo de Motor e Filtro",
    price: 90.00,
    cost: 30.00,
    estimatedDurationHours: 0.5,
    createdAt: "2026-05-01"
  }
];

const p_auto: Product[] = [
  {
    id: "prod-auto-1",
    tenantId: "tenant-autoclinica",
    sku: "AMORT-DI-CIV-01",
    name: "Amortecedor Dianteiro Direito Cofap",
    costPrice: 280.00,
    sellingPrice: 420.00,
    currentStock: 4,
    minimumStock: 2,
    unit: "UN",
    createdAt: "2026-05-01"
  },
  {
    id: "prod-auto-2",
    tenantId: "tenant-autoclinica",
    sku: "OLEO-5W30-MOTUL",
    name: "Óleo Sintético Motul 5W30 1L",
    costPrice: 45.00,
    sellingPrice: 75.00,
    currentStock: 24,
    minimumStock: 10,
    unit: "L",
    createdAt: "2026-05-01"
  },
  {
    id: "prod-auto-3",
    tenantId: "tenant-autoclinica",
    sku: "FILT-OLEO-TEC",
    name: "Filtro de Óleo Tecfil Honda Civic",
    costPrice: 22.00,
    sellingPrice: 45.00,
    currentStock: 6,
    minimumStock: 3,
    unit: "UN",
    createdAt: "2026-05-01"
  },
  {
    id: "prod-auto-4",
    tenantId: "tenant-autoclinica",
    sku: "PAST-FRE-COB",
    name: "Pastilha de Freio Dianteira Cobreq",
    costPrice: 85.00,
    sellingPrice: 150.00,
    currentStock: 1, // Alerta de estoque mínimo!
    minimumStock: 4,
    unit: "UN",
    createdAt: "2026-05-01"
  }
];


// --- Tenant 2: FrioMax Climatização data ---
const c1_frio: Client = {
  id: "client-frio-1",
  tenantId: "tenant-friomax",
  name: "Restaurante Sabor & Arte Ltda",
  document: "45.890.123/0001-99",
  phone: "(11) 3344-5566",
  email: "contato@saborearte.com.br",
  rua: "Rua Augusta",
  numero: "1800",
  bairro: "Consolação",
  cidade: "São Paulo",
  estado: "SP",
  cep: "01304-001",
  partnerType: "Ambos", // Just to have an example
  isActive: true,
  createdAt: "2026-06-05"
};

const c2_frio: Client = {
  id: "client-frio-2",
  tenantId: "tenant-friomax",
  name: "Dr. Roberto Albuquerque",
  document: "333.444.555-88",
  phone: "(11) 99111-2233",
  email: "roberto@consultoriomax.com",
  rua: "Av. Faria Lima",
  numero: "3500",
  bairro: "Itaim Bibi",
  cidade: "São Paulo",
  estado: "SP",
  cep: "04538-133",
  partnerType: "Cliente",
  isActive: true,
  createdAt: "2026-06-20"
};

const a1_frio: Asset = {
  id: "asset-frio-1",
  tenantId: "tenant-friomax",
  clientId: "client-frio-1",
  clientName: "Restaurante Sabor & Arte Ltda",
  name: "Ar Condicionado Cassete Carrier 48000 BTUs",
  brand: "Carrier",
  model: "Cassete 48k",
  serialNumber: "SN-994827163-C",
  additionalInfo: "Instalado no salão principal. Não está refrigerando adequadamente.",
  createdAt: "2026-06-05"
};

const a2_frio: Asset = {
  id: "asset-frio-2",
  tenantId: "tenant-friomax",
  clientId: "client-frio-2",
  clientName: "Dr. Roberto Albuquerque",
  name: "Ar Condicionado Split Hi-Wall Daikin Inverter 12000 BTUs",
  brand: "Daikin",
  model: "Hi-Wall Inverter 12k",
  serialNumber: "SN-DK-3819283-I",
  additionalInfo: "Localizado na sala de atendimento. Manutenção preventiva anual requerida.",
  createdAt: "2026-06-20"
};

const s_frio: Service[] = [
  {
    id: "service-frio-1",
    tenantId: "tenant-friomax",
    name: "Higienização Completa de Ar Condicionado Split",
    price: 180.00,
    cost: 30.00,
    estimatedDurationHours: 1.5,
    createdAt: "2026-05-01"
  },
  {
    id: "service-frio-2",
    tenantId: "tenant-friomax",
    name: "Diagnóstico e Teste de Vazamento de Gás",
    price: 250.00,
    cost: 50.00,
    estimatedDurationHours: 2.0,
    createdAt: "2026-05-01"
  },
  {
    id: "service-frio-3",
    tenantId: "tenant-friomax",
    name: "Instalação Completa de Split até 18k BTUs",
    price: 650.00,
    cost: 150.00,
    estimatedDurationHours: 4.0,
    createdAt: "2026-05-01"
  }
];

const p_frio: Product[] = [
  {
    id: "prod-frio-1",
    tenantId: "tenant-friomax",
    sku: "GAS-R410A-13K",
    name: "Fluido Refrigerante R410A Botija 13.6kg DAC",
    costPrice: 420.00,
    sellingPrice: 750.00,
    currentStock: 5,
    minimumStock: 2,
    unit: "UN",
    createdAt: "2026-05-01"
  },
  {
    id: "prod-frio-2",
    tenantId: "tenant-friomax",
    sku: "COMP-ROT-18K-DAI",
    name: "Compressor Rotativo Daikin 18000 BTUs 220V",
    costPrice: 650.00,
    sellingPrice: 1100.00,
    currentStock: 2,
    minimumStock: 1,
    unit: "UN",
    createdAt: "2026-05-01"
  },
  {
    id: "prod-frio-3",
    tenantId: "tenant-friomax",
    sku: "PLA-UNI-SPLIT",
    name: "Placa Eletrônica Universal para Split",
    costPrice: 85.00,
    sellingPrice: 160.00,
    currentStock: 8,
    minimumStock: 3,
    unit: "UN",
    createdAt: "2026-05-01"
  },
  {
    id: "prod-frio-4",
    tenantId: "tenant-friomax",
    sku: "SUP-CON-PAR",
    name: "Suporte Condensadora Split 9k a 18k Metal",
    costPrice: 25.00,
    sellingPrice: 50.00,
    currentStock: 0, // Alerta! Estoque zerado
    minimumStock: 5,
    unit: "UN",
    createdAt: "2026-05-01"
  }
];

// --- Combinações ---
export const INITIAL_CLIENTS: Client[] = [c1_auto, c2_auto, c1_frio, c2_frio];
export const INITIAL_ASSETS: Asset[] = [a1_auto, a2_auto, a1_frio, a2_frio];
export const INITIAL_SERVICES: Service[] = [...s_auto, ...s_frio];
export const INITIAL_PRODUCTS: Product[] = [...p_auto, ...p_frio];

// --- Agenda inicial ---
export const INITIAL_SCHEDULES: Schedule[] = [
  {
    id: "sched-auto-1",
    tenantId: "tenant-autoclinica",
    clientId: "client-auto-1",
    clientName: "Carlos Augusto de Souza",
    assetId: "asset-auto-1",
    assetName: "Honda Civic LXS 1.8 Flex Manual",
    dateTime: "2026-07-08T09:00",
    description: "Ruído forte ao passar em lombadas na dianteira direita.",
    status: "Agendado",
    createdAt: "2026-07-01T10:00:00"
  },
  {
    id: "sched-auto-2",
    tenantId: "tenant-autoclinica",
    clientId: "client-auto-2",
    clientName: "Maria Eduarda Lima",
    assetId: "asset-auto-2",
    assetName: "Chevrolet Onix 1.0 Turbo LTZ Automático",
    dateTime: "2026-07-10T14:30",
    description: "Revisão e higienização de filtros de ar.",
    status: "Agendado",
    createdAt: "2026-07-02T11:20:00"
  },
  {
    id: "sched-frio-1",
    tenantId: "tenant-friomax",
    clientId: "client-frio-1",
    clientName: "Restaurante Sabor & Arte Ltda",
    assetId: "asset-frio-1",
    assetName: "Ar Condicionado Cassete Carrier 48000 BTUs",
    dateTime: "2026-07-08T08:00",
    description: "Caiu disjuntor do salão principal quando liga a condensadora.",
    status: "Agendado",
    createdAt: "2026-07-03T09:00:00"
  }
];

// --- Orçamentos iniciais ---
export const INITIAL_BUDGETS: Budget[] = [
  {
    id: "budget-auto-1",
    tenantId: "tenant-autoclinica",
    clientId: "client-auto-1",
    clientName: "Carlos Augusto de Souza",
    assetId: "asset-auto-1",
    assetName: "Honda Civic LXS 1.8 Flex Manual",
    status: "Enviado",
    items: [
      {
        id: "bi-1",
        type: "service",
        itemId: "service-auto-2",
        name: "Substituição de Amortecedores Dianteiros",
        quantity: 1,
        unitCost: 100,
        unitPrice: 320,
        totalCost: 100,
        totalPrice: 320
      },
      {
        id: "bi-2",
        type: "product",
        itemId: "prod-auto-1",
        name: "Amortecedor Dianteiro Direito Cofap",
        quantity: 1,
        unitCost: 280,
        unitPrice: 420,
        totalCost: 280,
        totalPrice: 420
      },
      {
        id: "bi-3",
        type: "service",
        itemId: "service-auto-1",
        name: "Alinhamento 3D e Balanceamento",
        quantity: 1,
        unitCost: 40,
        unitPrice: 150,
        totalCost: 40,
        totalPrice: 150
      }
    ],
    totalCost: 420.00,
    totalPrice: 890.00,
    marginPercent: 52.8,
    notes: "Foi constatado vazamento de óleo no amortecedor dianteiro direito. Necessário troca imediata para segurança.",
    createdAt: "2026-07-04T15:00:00"
  }
];

// --- Ordens de Serviço (OS) ---
export const INITIAL_WORKORDERS: WorkOrder[] = [
  {
    id: "os-auto-opened",
    tenantId: "tenant-autoclinica",
    clientId: "client-auto-2",
    clientName: "Maria Eduarda Lima",
    assetId: "asset-auto-2",
    assetName: "Chevrolet Onix 1.0 Turbo LTZ Automático",
    status: "Aberta",
    items: [
      {
        id: "woi-1",
        type: "service",
        itemId: "service-auto-4",
        name: "Troca de Óleo de Motor e Filtro",
        quantity: 1,
        unitCost: 30,
        unitPrice: 90,
        totalCost: 30,
        totalPrice: 90,
        isDelivered: true
      },
      {
        id: "woi-2",
        type: "product",
        itemId: "prod-auto-2",
        name: "Óleo Sintético Motul 5W30 1L",
        quantity: 4,
        unitCost: 45,
        unitPrice: 75,
        totalCost: 180,
        totalPrice: 300,
        isDelivered: true // Já foi requisitado e entregue pro mecânico
      },
      {
        id: "woi-3",
        type: "product",
        itemId: "prod-auto-3",
        name: "Filtro de Óleo Tecfil Honda Civic",
        quantity: 1,
        unitCost: 22,
        unitPrice: 45,
        totalCost: 22,
        totalPrice: 45,
        isDelivered: false // RESERVADO, ainda não saiu fisicamente do estoque real (só baixa no Fechamento!)
      }
    ],
    totalCost: 232.00,
    totalPrice: 435.00,
    marginPercent: 46.7,
    diagnosis: "Revisão periódica básica de motor. Óleo perto do limite de quilometragem.",
    checklistPassed: true,
    technicianNotes: "Mecânico Paulo realizando o serviço. Aguardando retirada do filtro no almoxarifado.",
    createdAt: "2026-07-05T09:00:00"
  },
  {
    id: "os-frio-closed",
    tenantId: "tenant-friomax",
    clientId: "client-frio-2",
    clientName: "Dr. Roberto Albuquerque",
    assetId: "asset-frio-2",
    assetName: "Ar Condicionado Split Hi-Wall Daikin Inverter 12000 BTUs",
    status: "Fechada",
    items: [
      {
        id: "woi-frio-1",
        type: "service",
        itemId: "service-frio-1",
        name: "Higienização Completa de Ar Condicionado Split",
        quantity: 1,
        unitCost: 30,
        unitPrice: 180,
        totalCost: 30,
        totalPrice: 180,
        isDelivered: true
      }
    ],
    totalCost: 30.00,
    totalPrice: 180.00,
    marginPercent: 83.3,
    diagnosis: "Higienização e desinfecção de bandeja de condensado e turbina.",
    checklistPassed: true,
    technicianNotes: "Filtros limpos, serpentina higienizada com bactericida. Funcionamento 100%.",
    closedAt: "2026-07-06T11:00:00",
    createdAt: "2026-07-06T09:00:00"
  }
];

// --- Compras ---
export const INITIAL_PURCHASES: Purchase[] = [
  {
    id: "purchase-auto-1",
    tenantId: "tenant-autoclinica",
    status: "Pedido",
    supplier: "Distribuidora Auto-Peças Brasil Ltda",
    items: [
      {
        productId: "prod-auto-4",
        name: "Pastilha de Freio Dianteira Cobreq",
        quantity: 10,
        costPrice: 85.00,
        totalPrice: 850.00
      }
    ],
    totalAmount: 850.00,
    createdAt: "2026-07-06T10:00:00"
  }
];

// --- Financeiro ---
export const INITIAL_TRANSACTIONS: FinancialTransaction[] = [
  {
    id: "trans-frio-1",
    tenantId: "tenant-friomax",
    type: "receita",
    category: "Serviço",
    sourceId: "os-frio-closed", // Linkado com a OS Fechada
    description: "Recebimento OS - Dr. Roberto Albuquerque",
    amount: 180.00,
    dueDate: "2026-07-06",
    paymentDate: "2026-07-06",
    status: "Pago",
    paymentMethod: "PIX",
    createdAt: "2026-07-06T11:00:00"
  },
  {
    id: "trans-auto-pending-os",
    tenantId: "tenant-autoclinica",
    type: "receita",
    category: "Peça e Serviço",
    description: "Cobrança Prevista OS - Maria Eduarda Lima",
    amount: 435.00,
    dueDate: "2026-07-20",
    status: "Pendente",
    createdAt: "2026-07-05T09:00:00"
  }
];

export const INITIAL_CASH_LEDGER: CashLedger[] = [
  {
    id: "cash-frio-1",
    tenantId: "tenant-friomax",
    type: "entrada",
    amount: 180.00,
    description: "PIX Recebimento OS - Dr. Roberto Albuquerque",
    transactionId: "trans-frio-1",
    dateTimeRecorded: "2026-07-06T11:05:00"
  }
];
