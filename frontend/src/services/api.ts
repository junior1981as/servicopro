import { Client, Product, Service, Asset, Schedule, Budget, WorkOrder, Purchase, FinancialTransaction, CashLedger, Employee, ProductHistoryEntry, FormaPagamento, FormaPagamentoParcela } from '../types';

const API_BASE_URL = '/api';

class ApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('servicopro_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  public async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options?.headers
      }
    });

    if (response.status === 401) {
      localStorage.removeItem('servicopro_token');
      window.location.reload();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      let errorMessage = `API Error: ${response.statusText}`;
      try {
        const textData = await response.text();
        if (textData) {
          try {
            const errData = JSON.parse(textData);
            if (errData && (errData.error || errData.message)) {
              errorMessage = errData.error || errData.message;
              if (errData.details) {
                errorMessage += `\n\nDetalhes: ${errData.details}`;
              }
            } else if (errData && errData.title) {
              errorMessage = errData.title; // For ProblemDetails
            } else if (typeof errData === 'string') {
              errorMessage = errData;
            }
          } catch (e) {
            errorMessage = textData;
          }
        }
      } catch (e) {}
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return null as any;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  private getActiveTenantId(): string {
    const t = localStorage.getItem('servicopro_tenant');
    if (t) {
      try { return JSON.parse(t).id; } catch (e) {}
    }
    return 't-oficina-01'; // Default fallback
  }

  // --- Cadastros ---
  async getClients(): Promise<Client[]> {
    const data = await this.request<any[]>('/cadastros/clientes');
    const tid = this.getActiveTenantId();
    return data.map(c => ({
      id: c.id,
      codigo: c.codigo,
      tenantId: tid,
      name: c.nome,
      email: c.email || '',
      phone: c.telefone || '',
      document: c.documento || '',
      cep: c.cep || '',
      rua: c.rua || '',
      numero: c.numero || '',
      bairro: c.bairro || '',
      cidade: c.cidade || '',
      estado: c.estado || '',
      rg: c.rg || '',
      ie: c.inscricaoEstadual || '',
      partnerType: c.tipoParceiro || 'Cliente',
      formaPagamentoPadraoId: c.formaPagamentoPadraoId,
      isActive: c.ativo !== undefined ? c.ativo : true,
      createdAt: c.criadoEm || new Date().toISOString()
    }));
  }

  async getProducts(): Promise<Product[]> {
    const data = await this.request<any[]>('/cadastros/produtos');
    const tid = this.getActiveTenantId();
    return data.map(p => ({
      id: p.id,
      codigo: p.codigo,
      tenantId: tid,
      name: p.nome,
      sku: p.sku || p.id.substring(0, 8).toUpperCase(),
      sellingPrice: p.precoVenda,
      costPrice: p.precoCusto,
      currentStock: p.estoqueAtual,
      minimumStock: p.estoqueMinimo,
      unit: p.unidade || 'UN',
      cfopCodigo: p.cfopCodigo ? p.cfopCodigo.toString() : null,
      ncmCodigo: p.ncmCodigo ? p.ncmCodigo.toString() : null,
      ean: p.ean || '',
      createdAt: new Date().toISOString()
    }));
  }

  async getProductHistory(id: string): Promise<ProductHistoryEntry[]> {
    return await this.request<ProductHistoryEntry[]>(`/cadastros/produtos/${id}/historico`);
  }

  async getCfops(): Promise<any[]> {
    return await this.request<any[]>('/cadastros/cfops');
  }

  async getNcms(): Promise<any[]> {
    return await this.request<any[]>('/cadastros/ncms');
  }

  async getServices(): Promise<Service[]> {
    const data = await this.request<any[]>('/cadastros/servicos');
    const tid = this.getActiveTenantId();
    return data.map(s => ({
      id: s.id,
      codigo: s.codigo,
      tenantId: tid,
      name: s.nome,
      price: s.valorUnitario,
      cost: s.custo || 0,
      estimatedDurationHours: s.duracaoEstimadaHoras || 1,
      createdAt: new Date().toISOString()
    }));
  }

  async getAssets(): Promise<Asset[]> {
    const data = await this.request<any[]>('/cadastros/ativos');
    const tid = this.getActiveTenantId();
    return data.map(a => ({
      id: a.id,
      codigo: a.codigo,
      tenantId: tid,
      clientId: a.clienteId,
      clientName: a.cliente?.nome || 'Desconhecido',
      name: a.descricao,
      brand: a.marca || '',
      model: a.modelo || '',
      serialNumber: a.placaOuIdentificador || '',
      additionalInfo: a.informacoesAdicionais || '',
      createdAt: new Date().toISOString()
    }));
  }

  async getEmployees(): Promise<Employee[]> {
    const data = await this.request<any[]>('/cadastros/funcionarios');
    const tid = this.getActiveTenantId();
    return data.map(e => ({
      id: e.id,
      codigo: e.codigo,
      tenantId: tid,
      nome: e.nome,
      cargo: e.cargo,
      especialidade: e.especialidade,
      ativo: e.ativo,
      email: e.email,
      cep: e.cep,
      rua: e.rua,
      numero: e.numero,
      bairro: e.bairro,
      cidade: e.cidade,
      estado: e.estado
    }));
  }

  async createClient(clientData: Partial<Client>): Promise<Client> {
    const payload = {
      nome: clientData.name,
      documento: clientData.document,
      email: clientData.email,
      telefone: clientData.phone,
      cep: clientData.cep,
      rua: clientData.rua,
      numero: clientData.numero,
      bairro: clientData.bairro,
      cidade: clientData.cidade,
      estado: clientData.estado,
      rg: clientData.rg,
      inscricaoEstadual: clientData.ie,
      tipoParceiro: clientData.partnerType || 'Cliente',
      formaPagamentoPadraoId: clientData.formaPagamentoPadraoId
    };
    return this.request<any>('/cadastros/clientes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async createEmployee(employeeData: Partial<Employee>): Promise<Employee> {
    const payload = {
      nome: employeeData.nome,
      cargo: employeeData.cargo,
      especialidade: employeeData.especialidade,
      ativo: employeeData.ativo ?? true,
      email: employeeData.email,
      cep: employeeData.cep,
      rua: employeeData.rua,
      numero: employeeData.numero,
      bairro: employeeData.bairro,
      cidade: employeeData.cidade,
      estado: employeeData.estado
    };
    return this.request<any>('/cadastros/funcionarios', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const payload = {
      nome: productData.name,
      sku: productData.sku,
      precoCusto: productData.costPrice || 0,
      precoVenda: productData.sellingPrice || 0,
      estoqueAtual: productData.currentStock || 0,
      estoqueMinimo: productData.minimumStock || 0,
      unidade: productData.unit || 'UN',
      ncmCodigo: productData.ncmCodigo,
      cfopCodigo: productData.cfopCodigo ? parseInt(productData.cfopCodigo, 10) : null,
      ean: productData.ean || ''
    };
    return this.request<any>('/cadastros/produtos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async createService(serviceData: Partial<Service>): Promise<Service> {
    const payload = {
      nome: serviceData.name,
      valorUnitario: serviceData.price || 0,
      custo: serviceData.cost || 0,
      duracaoEstimadaHoras: serviceData.estimatedDurationHours || 1
    };
    return this.request<any>('/cadastros/servicos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async createAsset(assetData: Partial<Asset>): Promise<Asset> {
    const payload = {
      clienteId: assetData.clientId,
      descricao: assetData.name,
      placaOuIdentificador: assetData.serialNumber,
      marca: assetData.brand,
      modelo: assetData.model,
      informacoesAdicionais: assetData.additionalInfo
    };
    return this.request<any>('/cadastros/ativos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // --- DELETE & UPDATE ---
  
  async updateClient(clientData: Client): Promise<void> {
    const payload = {
      nome: clientData.name,
      documento: clientData.document,
      email: clientData.email,
      telefone: clientData.phone,
      cep: clientData.cep,
      rua: clientData.rua,
      numero: clientData.numero,
      bairro: clientData.bairro,
      cidade: clientData.cidade,
      estado: clientData.estado,
      rg: clientData.rg,
      inscricaoEstadual: clientData.ie,
      tipoParceiro: clientData.partnerType || 'Cliente',
      formaPagamentoPadraoId: clientData.formaPagamentoPadraoId
    };
    await this.request(`/cadastros/clientes/${clientData.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async updateEmployee(employeeData: Employee): Promise<void> {
    const payload = {
      nome: employeeData.nome,
      cargo: employeeData.cargo,
      especialidade: employeeData.especialidade,
      ativo: employeeData.ativo,
      email: employeeData.email,
      cep: employeeData.cep,
      rua: employeeData.rua,
      numero: employeeData.numero,
      bairro: employeeData.bairro,
      cidade: employeeData.cidade,
      estado: employeeData.estado
    };
    await this.request(`/cadastros/funcionarios/${employeeData.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  // --- Formas de Pagamento ---

  async getFormasPagamento(): Promise<FormaPagamento[]> {
    const data = await this.request<any[]>('/cadastros/formaspagamento');
    const tid = this.getActiveTenantId();
    return data.map(f => ({
      id: f.id,
      tenantId: tid,
      codigo: f.codigo,
      descricao: f.descricao,
      ativo: f.ativo,
      parcelas: (f.parcelas || []).map((p: any) => ({
        id: p.id,
        formaPagamentoId: p.formaPagamentoId,
        numeroParcela: p.numeroParcela,
        diasVencimento: p.diasVencimento,
        porcentagemValor: p.porcentagemValor,
        taxaOuDesconto: p.taxaOuDesconto
      }))
    }));
  }

  async createFormaPagamento(forma: Partial<FormaPagamento>): Promise<FormaPagamento> {
    const payload = {
      tenantId: this.getActiveTenantId(),
      codigo: forma.codigo,
      descricao: forma.descricao,
      ativo: forma.ativo ?? true,
      parcelas: forma.parcelas || []
    };
    return this.request<any>('/cadastros/formaspagamento', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateFormaPagamento(forma: FormaPagamento): Promise<void> {
    const payload = {
      id: forma.id,
      tenantId: forma.tenantId || this.getActiveTenantId(),
      codigo: forma.codigo,
      descricao: forma.descricao,
      ativo: forma.ativo,
      parcelas: forma.parcelas || []
    };
    await this.request(`/cadastros/formaspagamento/${forma.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async deleteFormaPagamento(id: string): Promise<void> {
    await this.request(`/cadastros/formaspagamento/${id}`, {
      method: 'DELETE'
    });
  }

  async deleteClient(id: string): Promise<void> {
    await this.request(`/cadastros/clientes/${id}`, { method: 'DELETE' });
  }

  async deleteEmployee(id: string): Promise<void> {
    await this.request(`/cadastros/funcionarios/${id}`, { method: 'DELETE' });
  }

  async updateProduct(productData: Product): Promise<void> {
    const payload = {
      nome: productData.name,
      sku: productData.sku,
      precoCusto: productData.costPrice || 0,
      precoVenda: productData.sellingPrice || 0,
      estoqueAtual: productData.currentStock || 0,
      estoqueMinimo: productData.minimumStock || 0,
      unidade: productData.unit || 'UN',
      ncmCodigo: productData.ncmCodigo,
      cfopCodigo: productData.cfopCodigo ? parseInt(productData.cfopCodigo, 10) : null,
      ean: productData.ean || ''
    };
    await this.request(`/cadastros/produtos/${productData.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async deleteProduct(id: string): Promise<void> {
    await this.request(`/cadastros/produtos/${id}`, { method: 'DELETE' });
  }

  async updateService(serviceData: Service): Promise<void> {
    const payload = {
      nome: serviceData.name,
      valorUnitario: serviceData.price,
      custo: serviceData.cost,
      duracaoEstimadaHoras: serviceData.estimatedDurationHours
    };
    await this.request(`/cadastros/servicos/${serviceData.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async deleteService(id: string): Promise<void> {
    await this.request(`/cadastros/servicos/${id}`, { method: 'DELETE' });
  }

  async updateAsset(assetData: Asset): Promise<void> {
    const payload = {
      clienteId: assetData.clientId,
      descricao: assetData.name,
      placaOuIdentificador: assetData.serialNumber,
      marca: assetData.brand,
      modelo: assetData.model,
      informacoesAdicionais: assetData.additionalInfo
    };
    await this.request(`/cadastros/ativos/${assetData.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async deleteAsset(id: string): Promise<void> {
    await this.request(`/cadastros/ativos/${id}`, { method: 'DELETE' });
  }

  // --- Agendamentos ---
  async getSchedules(): Promise<Schedule[]> {
    const data = await this.request<any[]>('/agendamentos');
    const tid = this.getActiveTenantId();
    return data.map(a => ({
      id: a.id,
      tenantId: tid,
      clientId: a.clientId,
      clientName: a.clientName || '',
      assetId: a.assetId,
      assetName: a.assetName || '',
      dateTime: a.dateTime,
      description: a.description || '',
      status: a.status,
      workOrderId: a.workOrderId,
      createdAt: a.createdAt
    }));
  }

  async createSchedule(schedule: Partial<Schedule>): Promise<Schedule> {
    return await this.request<any>('/agendamentos', {
      method: 'POST',
      body: JSON.stringify(schedule)
    });
  }

  async updateSchedule(schedule: Schedule): Promise<void> {
    await this.request(`/agendamentos/${schedule.id}`, {
      method: 'PUT',
      body: JSON.stringify(schedule)
    });
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.request(`/agendamentos/${id}`, { method: 'DELETE' });
  }

  // --- Orçamentos ---
  async getBudgets(): Promise<Budget[]> {
    const data = await this.request<any[]>('/orcamentos');
    const tid = this.getActiveTenantId();
    return data.map(b => ({
      ...b,
      tenantId: tid
    }));
  }

  async createBudget(budget: Partial<Budget>): Promise<Budget> {
    return await this.request<any>('/orcamentos', {
      method: 'POST',
      body: JSON.stringify(budget)
    });
  }

  async updateBudgetStatus(id: string, status: string, workOrderId?: string): Promise<void> {
    await this.request(`/orcamentos/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, workOrderId })
    });
  }

  // --- Ordens de Serviço ---
  async getWorkOrders(): Promise<WorkOrder[]> {
    const data = await this.request<any[]>('/os');
    const tid = this.getActiveTenantId();
    return data.map(o => {
      let status = o.status;
      if (status === 'EmExecucao') status = 'Em Execução';
      if (status === 'Concluida') status = 'Concluída';
      return {
        ...o,
        status,
        createdAt: o.openedAt || o.createdAt,
        tenantId: tid,
        totalPrice: o.totalPrice || 0,
        totalCost: o.totalCost || 0,
        items: o.items || []
      };
    });
  }

  async createWorkOrder(wo: Partial<WorkOrder>): Promise<WorkOrder> {
    return await this.request<any>('/os', {
      method: 'POST',
      body: JSON.stringify({
        ...wo,
        openingKm: wo.openingKm
      })
    });
  }

  async updateWorkOrder(id: string, wo: Partial<WorkOrder>): Promise<void> {
    await this.request(`/os/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...wo,
        openingKm: wo.openingKm
      })
    });
  }

  async closeWorkOrder(id: string, diagnosis: string, discount: number = 0): Promise<void> {
    await this.request(`/os/${id}/fechar`, {
      method: 'POST',
      body: JSON.stringify({ diagnosis, discount })
    });
  }

  async cancelWorkOrder(id: string): Promise<void> {
    await this.request(`/os/${id}/cancelar`, { method: 'POST' });
  }

  async deleteWorkOrder(id: string): Promise<void> {
    await this.request(`/os/${id}`, { method: 'DELETE' });
  }

  // --- Compras ---
  async getPurchases(): Promise<Purchase[]> {
    const data = await this.request<any[]>('/compras');
    const tid = this.getActiveTenantId();
    return data.map(p => ({
      ...p,
      tenantId: tid,
      items: p.items?.map((i: any) => ({
        ...i,
        costPrice: i.unitCost !== undefined ? i.unitCost : i.costPrice
      })) || []
    }));
  }

  async createPurchase(purchase: Partial<Purchase>): Promise<Purchase> {
    const payload = {
      ...purchase,
      items: purchase.items?.map(i => ({ ...i, unitCost: i.costPrice }))
    };
    return await this.request<any>('/compras', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updatePurchase(id: string, purchase: Partial<Purchase>): Promise<void> {
    const payload = {
      ...purchase,
      items: purchase.items?.map(i => ({ ...i, unitCost: i.costPrice }))
    };
    await this.request(`/compras/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async receivePurchaseInvoice(id: string, invoiceNumber: string, dueDate: string, totalAmount?: number, items?: any[]): Promise<void> {
    const mappedItems = items?.map(i => ({ ...i, unitCost: i.costPrice }));
    await this.request(`/compras/${id}/receber`, {
      method: 'POST',
      body: JSON.stringify({ invoiceNumber, dueDate, totalAmount, items: mappedItems })
    });
  }

  async cancelPurchase(id: string): Promise<void> {
    await this.request(`/compras/${id}/cancelar`, {
      method: 'POST'
    });
  }

  // --- Financeiro ---
  async getTransactions(): Promise<FinancialTransaction[]> {
    const data = await this.request<any[]>('/financeiro/transacoes');
    const tid = this.getActiveTenantId();
    return data.map(t => ({
      ...t,
      tenantId: tid
    }));
  }

  async getContasBancarias(): Promise<any[]> {
    return this.request<any[]>('/financeiro/contas-bancarias');
  }

  async createContaBancaria(data: { nome: string; tipo: string; saldoInicial: number; banco: string; agencia: string; numeroConta: string; ativo: boolean }): Promise<void> {
    await this.request('/financeiro/contas-bancarias', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateContaBancaria(id: string, data: { nome: string; tipo: string; banco: string; agencia: string; numeroConta: string; ativo: boolean }): Promise<void> {
    await this.request(`/financeiro/contas-bancarias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async payTransaction(id: string, paymentMethod: string, contaBancariaId: string, paymentDate?: string): Promise<void> {
    await this.request(`/financeiro/transacoes/${id}/pagar`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod, contaBancariaId, paymentDate })
    });
  }

  async editTransaction(id: string, data: { dueDate?: string; amount?: number; desconto?: number; description?: string }): Promise<void> {
    await this.request(`/financeiro/transacoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async parcelarTransaction(id: string, formaPagamentoId: string | null, parcelas?: number): Promise<void> {
    await this.request(`/financeiro/transacoes/${id}/parcelar`, {
      method: 'POST',
      body: JSON.stringify({ formaPagamentoId, parcelas })
    });
  }

  async reverseTransaction(id: string): Promise<void> {
    await this.request(`/financeiro/transacoes/${id}/estornar`, {
      method: 'POST'
    });
  }

  async undoTransactionSource(id: string): Promise<void> {
    await this.request(`/financeiro/transacoes/${id}/desfazer`, {
      method: 'POST'
    });
  }

  async getCashLedger(): Promise<CashLedger[]> {
    const data = await this.request<any[]>('/financeiro/livro-caixa');
    const tid = this.getActiveTenantId();
    return data.map(c => ({
      ...c,
      tenantId: tid
    }));
  }

  // --- Admin / SaaS ---
  async getSaaSTenants(): Promise<any[]> {
    return await this.request<any[]>('/admin/tenants');
  }

  async provisionSaaSTenant(data: { 
    nomeCliente: string, 
    razaoSocial?: string,
    documento?: string,
    telefone?: string,
    cep?: string,
    rua?: string,
    numero?: string,
    bairro?: string,
    cidade?: string,
    estado?: string,
    inscricaoEstadual?: string,
    valorMensalidade?: number,
    nomeBanco: string, 
    adminEmail: string, 
    adminSenha: string 
  }): Promise<any> {
    return await this.request<any>('/admin/tenants/provisionar', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateSaaSTenant(id: string, data: any): Promise<void> {
    await this.request(`/admin/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteSaaSTenant(id: string): Promise<void> {
    await this.request(`/admin/tenants/${id}`, {
      method: 'DELETE'
    });
  }
}

export const api = new ApiService();
