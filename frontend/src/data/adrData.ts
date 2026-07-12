/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ADR {
  id: string;
  title: string;
  status: "Aprovado" | "Em Discussão" | "Superado";
  date: string;
  context: string;
  decision: string;
  consequences: string;
}

export interface ModuleInfo {
  name: string;
  description: string;
  status: "Planejado" | "Em MVP" | "Fase Posterior";
  keyTables: string[];
}

export const ERP_MODULES: ModuleInfo[] = [
  {
    name: "Identidade e Tenancy",
    description: "Autenticação, isolamento de dados por TenantID em nível de banco de dados, login e perfis de acesso.",
    status: "Em MVP",
    keyTables: ["Tenants", "Users"]
  },
  {
    name: "Cadastros Mestres",
    description: "Gestão unificada de Clientes, Equipamentos/Ativos vinculados a clientes, Catálogo de Peças (Produtos) e Tabela de Serviços.",
    status: "Em MVP",
    keyTables: ["Clients", "Assets", "Products", "Services"]
  },
  {
    name: "Agenda e Operação",
    description: "Agendamento prévio de serviços vinculando cliente e ativo, controle de status da agenda.",
    status: "Em MVP",
    keyTables: ["Schedules"]
  },
  {
    name: "Orçamento",
    description: "Criação de orçamentos opcionais, definição de margens, precificação e fluxo de aprovação com promoção para OS com rastreabilidade.",
    status: "Em MVP",
    keyTables: ["Budgets", "BudgetItems"]
  },
  {
    name: "Ordem de Serviço (OS)",
    description: "Fluxo central de prestação de serviços. Registro de diagnósticos, requisições de peças e mão de obra, cálculo de custo e margem em tempo real, fechamento e baixa física do estoque.",
    status: "Em MVP",
    keyTables: ["WorkOrders", "WorkOrderItems"]
  },
  {
    name: "Estoque e Compras",
    description: "Fluxo de reabastecimento. Necessidade de compras, Pedido de compra, entrada de nota fiscal (XML/Chave), atualização automática do custo médio, saldo e controle de estoque mínimo.",
    status: "Em MVP",
    keyTables: ["Purchases", "PurchaseItems", "StockLedger"]
  },
  {
    name: "Financeiro",
    description: "Controle de contas a receber automáticas no fechamento da OS, contas a pagar automáticas na entrada de compras, recebimentos/pagamentos parciais e lançamentos de fluxo de caixa.",
    status: "Em MVP",
    keyTables: ["FinancialTransactions", "CashLedger"]
  },
  {
    name: "Fiscal",
    description: "Gerador de pré-notas fiscais (dados estruturados) prontas para envio à integradores parceiros de NF-e e NFS-e, evitando dependência direta com prefeituras e SEFAZ.",
    status: "Em MVP",
    keyTables: ["FiscalDocuments"]
  }
];

export const TECHNICAL_RISKS = [
  {
    title: "Vazamento de Dados Multitenant",
    risk: "Alta",
    mitigation: "Filtragem mandatória por TenantId em TODAS as consultas SQL através de Row-Level Security (RLS) ou herança de cláusula no ORM. Chave primária composta ou índices incluindo TenantId para otimização e isolamento."
  },
  {
    title: "Falta de Sincronia Estoque x Financeiro",
    risk: "Média",
    mitigation: "A baixa de estoque de peças da OS ocorre unicamente no evento de 'Fechamento da OS'. Se cancelada, reverte. A receita financeira (Conta a Receber) é gerada na mesma transação atômica do fechamento."
  },
  {
    title: "Vazamento de Chaves de API de Clientes",
    risk: "Alta",
    mitigation: "Tokens de integrador fiscal externo e senhas de banco armazenados de forma criptografada (AES-256) na base de metadados global, nunca descriptografados no frontend."
  },
  {
    title: "Indisponibilidade de APIs Fiscais externas",
    risk: "Média",
    mitigation: "Fila de processamento assíncrona para notas fiscais. O sistema ERP gera a 'Pré-Nota' imediatamente e a envia via webhook ou fila de retentativas automáticas."
  }
];

export const SYSTEM_ADRS: ADR[] = [
  {
    id: "ADR-001",
    title: "Estratégia de Multi-Tenancy (Banco Compartilhado vs. Banco Único)",
    status: "Aprovado",
    date: "2026-07-07",
    context: "O sistema precisa atender centenas de pequenas empresas (MEIs e PMEs). Criar um banco de dados SQL Server para cada cliente adiciona um custo excessivo de licenciamento e complexidade de migrações em lote.",
    decision: "Adotaremos o padrão 'Shared Database with Shared Schema'. Cada tabela conterá uma coluna TenantID indexada. No backend, toda chamada ao banco injetará obrigatoriamente a cláusula WHERE TenantID = @CurrentTenantID.",
    consequences: "Vantagem: Baixo custo operacional, atualizações instantâneas de estrutura. Desvantagem: Risco de vazamento de dados se houver falha de programação. Para mitigar, criaremos testes automatizados de não-regressão simulando chamadas com tokens cruzados."
  },
  {
    id: "ADR-002",
    title: "Isolamento Fiscal por Integradores Externos",
    status: "Aprovado",
    date: "2026-07-07",
    context: "Emitir notas fiscais diretamente para mais de 5.000 prefeituras no Brasil (NFS-e) e SEFAZ estaduais (NF-e) exige manutenção de conexões, certificados e legislações que mudam diariamente.",
    decision: "O ERP não se comunicará diretamente com órgãos do governo. O ERP gerará um payload estruturado (JSON de Pré-Nota) e enviará via REST para um integrador fiscal parceiro (FocusNFe, PlugNotas, etc.).",
    consequences: "Redução drástica do custo de desenvolvimento de 90% no módulo fiscal. Foco total em recursos core de negócios do ERP."
  },
  {
    id: "ADR-003",
    title: "Estratégia de Baixa de Estoque nas Ordens de Serviço",
    status: "Aprovado",
    date: "2026-07-07",
    context: "Peças são requisitadas durante a execução da OS, mas o cliente pode desistir de um serviço ou alterar a OS antes da conclusão. Baixar do estoque na requisição gera furos no inventário real.",
    decision: "A requisição apenas 'reserva' o item. A baixa real e contábil no estoque só ocorre no fechamento definitivo da OS (Status = 'Fechada'). Se a OS for cancelada, a reserva é desfeita.",
    consequences: "Garantia de integridade física e financeira do estoque. Histórico de requisições preservado com flags de 'isDelivered' ou 'Reservado'."
  },
  {
    id: "ADR-004",
    title: "Acoplamento de Orçamento e OS",
    status: "Aprovado",
    date: "2026-07-07",
    context: "Clientes solicitam orçamentos e, quando aprovados, o ERP deve criar uma Ordem de Serviço preservando a rastreabilidade histórica sem retrabalho de digitação.",
    decision: "O orçamento aprovado será promovido a Ordem de Serviço, copiando seus itens e vinculando o BudgetID na OS gerada. A OS nascerá com status 'Aberta'.",
    consequences: "Rastreabilidade total para auditoria de vendas e conversão de orçamentos."
  }
];

export const MSSQL_DATABASE_SCHEMA = `
-- ===================================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS ERP MULTIEMPRESA (SQL SERVER)
-- ===================================================================

-- 1. Tabela de Tenants (Isolamento de Contas)
CREATE TABLE Tenants (
    TenantID UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CorporateName VARCHAR(150) NOT NULL,
    TradeName VARCHAR(150) NOT NULL,
    Document VARCHAR(20) NOT NULL UNIQUE, -- CNPJ / CPF
    Segment VARCHAR(50) NOT NULL, -- Automotivo, Refrigeração, etc.
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1
);
CREATE NONCLUSTERED INDEX IX_Tenants_Document ON Tenants(Document);

-- 2. Tabela de Clientes
CREATE TABLE Clients (
    ClientID UNIQUEIDENTIFIER DEFAULT NEWID(),
    TenantID UNIQUEIDENTIFIER NOT NULL,
    FullName VARCHAR(150) NOT NULL,
    Document VARCHAR(20) NOT NULL, -- CPF/CNPJ
    Phone VARCHAR(20),
    Email VARCHAR(100),
    AddressText VARCHAR(250),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT PK_Clients PRIMARY KEY CLUSTERED (TenantID, ClientID),
    CONSTRAINT FK_Clients_Tenants FOREIGN KEY (TenantID) REFERENCES Tenants(TenantID)
);
CREATE NONCLUSTERED INDEX IX_Clients_Document ON Clients(TenantID, Document);

-- 3. Tabela de Equipamentos / Ativos (Vinculados a Clientes)
CREATE TABLE Assets (
    AssetID UNIQUEIDENTIFIER DEFAULT NEWID(),
    TenantID UNIQUEIDENTIFIER NOT NULL,
    ClientID UNIQUEIDENTIFIER NOT NULL,
    AssetName VARCHAR(150) NOT NULL, -- e.g. Civic 2014, Ar Split
    Brand VARCHAR(50),
    Model VARCHAR(50),
    SerialNumber VARCHAR(50), -- Chassi, Placa ou Serial
    AdditionalInfo VARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT PK_Assets PRIMARY KEY CLUSTERED (TenantID, AssetID),
    CONSTRAINT FK_Assets_Clients FOREIGN KEY (TenantID, ClientID) REFERENCES Clients(TenantID, ClientID)
);

-- 4. Tabela de Catálogo de Serviços
CREATE TABLE Services (
    ServiceID UNIQUEIDENTIFIER DEFAULT NEWID(),
    TenantID UNIQUEIDENTIFIER NOT NULL,
    ServiceName VARCHAR(150) NOT NULL,
    CostPrice DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    SellingPrice DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    EstimatedHours DECIMAL(5,2) DEFAULT 1.00,
    CreatedAt DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT PK_Services PRIMARY KEY CLUSTERED (TenantID, ServiceID)
);

-- 5. Tabela de Catálogo de Produtos / Peças
CREATE TABLE Products (
    ProductID UNIQUEIDENTIFIER DEFAULT NEWID(),
    TenantID UNIQUEIDENTIFIER NOT NULL,
    SKU VARCHAR(50) NOT NULL,
    ProductName VARCHAR(150) NOT NULL,
    CostPrice DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    SellingPrice DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    CurrentStock DECIMAL(18,3) NOT NULL DEFAULT 0.000,
    MinimumStock DECIMAL(18,3) NOT NULL DEFAULT 0.000,
    UnitOfMeasure VARCHAR(10) DEFAULT 'UN',
    CreatedAt DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT PK_Products PRIMARY KEY CLUSTERED (TenantID, ProductID)
);
CREATE NONCLUSTERED INDEX IX_Products_SKU ON Products(TenantID, SKU);

-- 6. Tabela de Agendas
CREATE TABLE Schedules (
    ScheduleID UNIQUEIDENTIFIER DEFAULT NEWID(),
    TenantID UNIQUEIDENTIFIER NOT NULL,
    ClientID UNIQUEIDENTIFIER NOT NULL,
    AssetID UNIQUEIDENTIFIER NOT NULL,
    ScheduleDate DATETIME2 NOT NULL,
    Notes VARCHAR(500),
    CurrentStatus VARCHAR(20) NOT NULL DEFAULT 'Agendado', -- Agendado, Cancelado, Em OS
    WorkOrderID UNIQUEIDENTIFIER,
    CreatedAt DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT PK_Schedules PRIMARY KEY CLUSTERED (TenantID, ScheduleID),
    CONSTRAINT FK_Schedules_Clients FOREIGN KEY (TenantID, ClientID) REFERENCES Clients(TenantID, ClientID),
    CONSTRAINT FK_Schedules_Assets FOREIGN KEY (TenantID, AssetID) REFERENCES Assets(TenantID, AssetID)
);

-- 7. Tabela de Orçamentos
CREATE TABLE Budgets (
    BudgetID UNIQUEIDENTIFIER DEFAULT NEWID(),
    TenantID UNIQUEIDENTIFIER NOT NULL,
    ClientID UNIQUEIDENTIFIER NOT NULL,
    AssetID UNIQUEIDENTIFIER NOT NULL,
    BudgetStatus VARCHAR(20) NOT NULL DEFAULT 'Rascunho', -- Rascunho, Enviado, Aprovado, Cancelado
    TotalCost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    TotalPrice DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    Notes VARCHAR(MAX),
    WorkOrderID UNIQUEIDENTIFIER, -- Link de rastreabilidade
    CreatedAt DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT PK_Budgets PRIMARY KEY CLUSTERED (TenantID, BudgetID)
);

-- 8. Itens de Orçamentos
CREATE TABLE BudgetItems (
    BudgetItemID UNIQUEIDENTIFIER DEFAULT NEWID(),
    TenantID UNIQUEIDENTIFIER NOT NULL,
    BudgetID UNIQUEIDENTIFIER NOT NULL,
    ItemType VARCHAR(10) NOT NULL, -- PRODUCT / SERVICE
    ItemID UNIQUEIDENTIFIER NOT NULL,
    ItemName VARCHAR(150) NOT NULL,
    Quantity DECIMAL(18,3) NOT NULL DEFAULT 1.000,
    UnitCost DECIMAL(18,2) NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL,
    TotalCost DECIMAL(18,2) NOT NULL,
    TotalPrice DECIMAL(18,2) NOT NULL,

    CONSTRAINT PK_BudgetItems PRIMARY KEY CLUSTERED (TenantID, BudgetItemID),
    CONSTRAINT FK_BudgetItems_Budgets FOREIGN KEY (TenantID, BudgetID) REFERENCES Budgets(TenantID, BudgetID)
);

-- 9. Tabela de Ordens de Serviço (OS)
CREATE TABLE WorkOrders (
    WorkOrderID UNIQUEIDENTIFIER DEFAULT NEWID(),
    TenantID UNIQUEIDENTIFIER NOT NULL,
    ClientID UNIQUEIDENTIFIER NOT NULL,
    AssetID UNIQUEIDENTIFIER NOT NULL,
    BudgetID UNIQUEIDENTIFIER, -- Rastreabilidade se veio de orçamento
    OSStatus VARCHAR(20) NOT NULL DEFAULT 'Aberta', -- Aberta, Em Execução, Fechada, Cancelada
    TotalCost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    TotalPrice DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    Diagnosis VARCHAR(MAX),
    ChecklistPassed BIT DEFAULT 0,
    Notes VARCHAR(MAX),
    ClosedAt DATETIME2,
    CreatedAt DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT PK_WorkOrders PRIMARY KEY CLUSTERED (TenantID, WorkOrderID),
    CONSTRAINT FK_WorkOrders_Clients FOREIGN KEY (TenantID, ClientID) REFERENCES Clients(TenantID, ClientID),
    CONSTRAINT FK_WorkOrders_Assets FOREIGN KEY (TenantID, AssetID) REFERENCES Assets(TenantID, AssetID)
);

-- 10. Itens da OS (Requisições)
CREATE TABLE WorkOrderItems (
    WorkOrderItemID UNIQUEIDENTIFIER DEFAULT NEWID(),
    TenantID UNIQUEIDENTIFIER NOT NULL,
    WorkOrderID UNIQUEIDENTIFIER NOT NULL,
    ItemType VARCHAR(10) NOT NULL, -- PRODUCT / SERVICE
    ItemID UNIQUEIDENTIFIER NOT NULL,
    ItemName VARCHAR(150) NOT NULL,
    Quantity DECIMAL(18,3) NOT NULL DEFAULT 1.000,
    UnitCost DECIMAL(18,2) NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL,
    TotalCost DECIMAL(18,2) NOT NULL,
    TotalPrice DECIMAL(18,2) NOT NULL,
    IsDelivered BIT DEFAULT 0, -- Reservado (0) ou Entregue ao Técnico (1)

    CONSTRAINT PK_WorkOrderItems PRIMARY KEY CLUSTERED (TenantID, WorkOrderItemID),
    CONSTRAINT FK_WorkOrderItems_WorkOrders FOREIGN KEY (TenantID, WorkOrderID) REFERENCES WorkOrders(TenantID, WorkOrderID)
);

-- 11. Tabela de Compras (Entrada de Nota/Estoque)
CREATE TABLE Purchases (
    PurchaseID UNIQUEIDENTIFIER DEFAULT NEWID(),
    TenantID UNIQUEIDENTIFIER NOT NULL,
    PurchaseStatus VARCHAR(20) NOT NULL DEFAULT 'Necessidade', -- Necessidade, Pedido, NF Recebida
    Supplier VARCHAR(150) NOT NULL,
    InvoiceNumber VARCHAR(50),
    TotalAmount DECIMAL(18,2) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    ReceivedAt DATETIME2,

    CONSTRAINT PK_Purchases PRIMARY KEY CLUSTERED (TenantID, PurchaseID)
);

-- 12. Tabela de Lançamentos Financeiros (Contas a Receber e Pagar)
CREATE TABLE FinancialTransactions (
    TransactionID UNIQUEIDENTIFIER DEFAULT NEWID(),
    TenantID UNIQUEIDENTIFIER NOT NULL,
    EntryType VARCHAR(10) NOT NULL, -- RECEITA / DESPESA
    Category VARCHAR(50) NOT NULL, -- Serviço, Peça, Compra de Estoque, Aluguel
    SourceID UNIQUEIDENTIFIER, -- Link da OS ou da Compra
    DescriptionText VARCHAR(250) NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    DueDate DATE NOT NULL,
    PaymentDate DATE,
    CurrentStatus VARCHAR(20) NOT NULL DEFAULT 'Pendente', -- Pendente, Pago, Atrasado, Cancelado
    PaymentMethod VARCHAR(50),
    CreatedAt DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT PK_FinancialTransactions PRIMARY KEY CLUSTERED (TenantID, TransactionID)
);

-- 13. Caixa / Fluxo de Caixa Realizado
CREATE TABLE CashLedger (
    LedgerID UNIQUEIDENTIFIER DEFAULT NEWID(),
    TenantID UNIQUEIDENTIFIER NOT NULL,
    LedgerType VARCHAR(10) NOT NULL, -- ENTRADA / SAIDA
    Amount DECIMAL(18,2) NOT NULL,
    DescriptionText VARCHAR(250) NOT NULL,
    TransactionID UNIQUEIDENTIFIER NOT NULL,
    DateTimeRecorded DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT PK_CashLedger PRIMARY KEY CLUSTERED (TenantID, LedgerID),
    CONSTRAINT FK_CashLedger_FinancialTransactions FOREIGN KEY (TenantID, TransactionID) REFERENCES FinancialTransactions(TenantID, TransactionID)
);
`;
