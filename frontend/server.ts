import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db_servicopro.json");

app.use(express.json());

// Helper to load database
function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    const seedData = {
      clientes: [
        {
          id: 1,
          nome: "Carlos Roberto de Souza",
          tipo: "Física",
          documento: "123.456.789-00",
          telefone: "(11) 98888-7777",
          email: "carlos.souza@email.com",
          endereco: "Rua das Flores, 123 - Centro",
          observacao: "Cliente antigo da oficina.",
          ativo: 1
        },
        {
          id: 2,
          nome: "Oficina Auto Speed S/A",
          tipo: "Jurídica",
          documento: "98.765.432/0001-21",
          telefone: "(11) 3333-4444",
          email: "contato@autospeed.com",
          endereco: "Av. Principal, 500 - Distrito Industrial",
          observacao: "Parceiro estratégico.",
          ativo: 1
        },
        {
          id: 3,
          nome: "Beatriz Martins",
          tipo: "Física",
          documento: "222.333.444-55",
          telefone: "(11) 97777-6666",
          email: "beatriz.martins@email.com",
          endereco: "Rua dos Pinheiros, 45 - Pinheiros",
          observacao: "Atendimento preferencial.",
          ativo: 1
        }
      ],
      ativos: [
        {
          id: 1,
          cliente_id: 1,
          descricao: "Fiat Uno Way 1.0",
          tipo: "Veículo",
          identificacao: "ABC-1234",
          marca: "Fiat",
          modelo: "Uno Way 1.0",
          ano: 2015,
          status: "Em uso",
          observacao: "Revisões em dia",
          ativo: 1
        },
        {
          id: 2,
          cliente_id: 2,
          descricao: "Notebook Lenovo ThinkPad L14",
          tipo: "Equipamento",
          identificacao: "SN-LNV-44552",
          marca: "Lenovo",
          modelo: "ThinkPad L14",
          ano: 2022,
          status: "Em uso",
          observacao: "Trocar pasta térmica na OS",
          ativo: 1
        },
        {
          id: 3,
          cliente_id: 3,
          descricao: "Ar Condicionado Split Electrolux 12k BTU",
          tipo: "Eletrodoméstico",
          identificacao: "SN-ELEC-7788",
          marca: "Electrolux",
          modelo: "Split 12k BTU",
          ano: 2020,
          status: "Manutenção",
          observacao: "Vazamento de gás",
          ativo: 1
        }
      ],
      produtos: [
        {
          id: 1,
          nome: "Pastilha de Freio Dianteira Uno",
          unidade: "UN",
          estoque_atual: 15,
          estoque_minimo: 5,
          preco_venda: 120.00,
          observacao: "Marca Cobreq",
          ativo: 1
        },
        {
          id: 2,
          nome: "Óleo de Motor Selenia 5W30 Sintético",
          unidade: "LT",
          estoque_atual: 48,
          estoque_minimo: 10,
          preco_venda: 45.00,
          observacao: "Galão 1 Litro",
          ativo: 1
        },
        {
          id: 3,
          nome: "Filtro de Óleo Uno 1.0",
          unidade: "UN",
          estoque_atual: 22,
          estoque_minimo: 5,
          preco_venda: 35.00,
          observacao: "Marca Fram",
          ativo: 1
        },
        {
          id: 4,
          nome: "Gás Refrigerante R410A",
          unidade: "KG",
          estoque_atual: 12,
          estoque_minimo: 3,
          preco_venda: 85.00,
          observacao: "Para ar condicionados",
          ativo: 1
        },
        {
          id: 5,
          nome: "Pasta Térmica de Alta Performance Arctic MX-4",
          unidade: "UN",
          estoque_atual: 8,
          estoque_minimo: 2,
          preco_venda: 60.00,
          observacao: "Seringa 4g",
          ativo: 1
        }
      ],
      servicos: [
        {
          id: 1,
          nome: "Troca de Pastilha de Freio Dianteira",
          descricao: "Mão de obra para substituição das pastilhas de freio dianteiras.",
          preco_base: 150.00,
          observacao: "Tempo estimado: 1h",
          ativo: 1
        },
        {
          id: 2,
          nome: "Revisão e Limpeza de Ar Condicionado",
          descricao: "Higienização completa, limpeza dos filtros, verificação de pressão e carga de gás se necessário.",
          preco_base: 250.00,
          observacao: "Tempo estimado: 2h",
          ativo: 1
        },
        {
          id: 3,
          nome: "Formatação com Backup e Manutenção Física",
          descricao: "Instalação limpa de OS, limpeza interna profunda, troca de pasta térmica.",
          preco_base: 180.00,
          observacao: "Tempo estimado: 3h",
          ativo: 1
        },
        {
          id: 4,
          nome: "Diagnóstico Elétrico e Eletrônico Avançado",
          descricao: "Escaneamento de injeção eletrônica, diagnóstico de chicotes e sensores.",
          preco_base: 200.00,
          observacao: "Tempo estimado: 1.5h",
          ativo: 1
        }
      ],
      agendamentos: [
        {
          id: 1,
          cliente_id: 1,
          ativo_id: 1,
          data_agendamento: "2026-07-06",
          hora_agendamento: "09:00",
          descricao: "Revisão de freio e troca de óleo",
          status: "Pendente",
          criado_em: "2026-07-04T10:00:00.000Z",
          atualizado_em: "2026-07-04T10:00:00.000Z",
          ativo: 1
        },
        {
          id: 2,
          cliente_id: 3,
          ativo_id: 3,
          data_agendamento: "2026-07-07",
          hora_agendamento: "14:00",
          descricao: "Higienização de ar condicionado que não está gelando",
          status: "Pendente",
          criado_em: "2026-07-04T11:00:00.000Z",
          atualizado_em: "2026-07-04T11:00:00.000Z",
          ativo: 1
        }
      ],
      orcamentos: [
        {
          id: 1,
          numero: "ORC-0001",
          cliente_id: 1,
          ativo_id: 1,
          descricao: "Orçamento inicial para revisão do Uno",
          valor_total: 350.00,
          status: "Pendente",
          criado_em: "2026-07-04T12:00:00.000Z",
          atualizado_em: "2026-07-04T12:00:00.000Z",
          ativo: 1
        }
      ],
      orcamentos_itens_servicos: [
        {
          id: 1,
          orcamento_id: 1,
          servico_id: 1,
          quantidade: 1,
          preco_unitario: 150.00,
          valor_total: 150.00,
          observacao: "Serviço padrão",
          ativo: 1
        }
      ],
      orcamentos_itens_produtos: [
        {
          id: 1,
          orcamento_id: 1,
          produto_id: 1,
          quantidade: 1,
          preco_unitario: 120.00,
          valor_total: 120.00,
          observacao: "Cobreq dianteiro",
          ativo: 1
        },
        {
          id: 2,
          orcamento_id: 1,
          produto_id: 2,
          quantidade: 2,
          preco_unitario: 40.00,
          valor_total: 80.00,
          observacao: "Óleo Selenia",
          ativo: 1
        }
      ],
      ordens_servico: [
        {
          id: 1,
          numero: "OS-0001",
          cliente_id: 1,
          ativo_id: 1,
          agendamento_id: 1,
          orcamento_id: 1,
          descricao: "Revisão e manutenção de freio dianteiro - Uno",
          problema_relatado: "Pedal de freio baixo e chiado na frenagem",
          data_abertura: "2026-07-04T15:30:00.000Z",
          km_abertura: 85200,
          valor_total: 350.00,
          status: "Em Andamento",
          criado_em: "2026-07-04T15:30:00.000Z",
          atualizado_em: "2026-07-04T15:30:00.000Z",
          ativo: 1
        }
      ],
      ordens_servico_itens_servicos: [
        {
          id: 1,
          ordem_servico_id: 1,
          servico_id: 1,
          quantidade: 1,
          preco_unitario: 150.00,
          valor_total: 150.00,
          observacao: "Mão de obra autorizada pelo orçamento",
          ativo: 1
        }
      ],
      ordens_servico_itens_produtos: [
        {
          id: 1,
          ordem_servico_id: 1,
          produto_id: 1,
          quantidade: 1,
          preco_unitario: 120.00,
          valor_total: 120.00,
          observacao: "Cobreq dianteiro",
          ativo: 1
        },
        {
          id: 2,
          ordem_servico_id: 1,
          produto_id: 2,
          quantidade: 2,
          preco_unitario: 40.00,
          valor_total: 80.00,
          observacao: "Óleo Selenia",
          ativo: 1
        }
      ],
      requisicoes_estoque: [
        {
          id: 1,
          ordem_servico_id: 1,
          produto_id: 1,
          quantidade: 1,
          status: "Atendida",
          solicitante: "Mecânico João",
          data_solicitacao: "2026-07-04T16:00:00.000Z",
          ativo: 1
        },
        {
          id: 2,
          ordem_servico_id: 1,
          produto_id: 2,
          quantidade: 2,
          status: "Atendida",
          solicitante: "Mecânico João",
          data_solicitacao: "2026-07-04T16:05:00.000Z",
          ativo: 1
        }
      ],
      movimentacoes_estoque: [
        {
          id: 1,
          produto_id: 1,
          tipo: "Saída",
          quantidade: 1,
          origem: "OS-0001",
          data_movimentacao: "2026-07-04T16:00:00.000Z",
          observacao: "Baixa automática da OS",
          ativo: 1
        },
        {
          id: 2,
          produto_id: 2,
          tipo: "Saída",
          quantidade: 2,
          origem: "OS-0001",
          data_movimentacao: "2026-07-04T16:05:00.000Z",
          observacao: "Baixa automática da OS",
          ativo: 1
        }
      ],
      empresa: {
        id: 1,
        nome_fantasia: "ServiçoPro Oficina e Tecnologia",
        razao_social: "ServiçoPro Soluções Digitais Ltda",
        cnpj: "12.345.678/0001-90",
        inscricao_estadual: "111.222.333.444",
        telefone: "(11) 98765-4321",
        email: "suporte@servicopro.local",
        endereco: "Av. Paulista, 1000 - Bela Vista",
        cidade: "São Paulo",
        uf: "SP",
        cep: "01310-100",
        regime_tributario: "Simples Nacional"
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(seedData, null, 2), "utf-8");
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// 1. Auth Endpoint
app.post("/api/auth/login", (req, res) => {
  const { email, senha } = req.body;
  if (email === "admin@servicopro.local" && senha === "123456") {
    return res.json({
      status: "ok",
      accessToken: "token_mock_servicopro_123456",
      tokenType: "Bearer",
      expiresAtUtc: "2026-12-31T23:59:59Z",
      usuario: {
        id: "1",
        nome: "Administrador ServiçoPro",
        email: "admin@servicopro.local",
        papeis: ["admin", "user"]
      },
      tenant: {
        id: "oficina",
        nome: "Oficina ServiçoPro",
        banco: "servicopro_oficina"
      }
    });
  }
  return res.status(401).json({
    erro: "CREDENCIAIS_INVALIDAS",
    mensagem: "Usuário, senha ou empresa inválidos."
  });
});

// 2. Company config endpoints
app.get("/api/configuracoes/empresa", (req, res) => {
  const db = loadDb();
  res.json({
    status: "ok",
    dados: db.empresa
  });
});

app.post("/api/configuracoes/empresa", (req, res) => {
  const db = loadDb();
  db.empresa = { ...db.empresa, ...req.body };
  saveDb(db);
  res.json({
    status: "ok",
    dados: db.empresa,
    mensagem: "Configuração atualizada com sucesso."
  });
});

app.put("/api/configuracoes/empresa", (req, res) => {
  const db = loadDb();
  db.empresa = { ...db.empresa, ...req.body };
  saveDb(db);
  res.json({
    status: "ok",
    dados: db.empresa,
    mensagem: "Configuração atualizada com sucesso."
  });
});

// Helper mapping for table names
function getTableKey(endpoint: string): string {
  if (endpoint === "ordens-servico") return "ordens_servico";
  if (endpoint === "ordens-servico-itens-servicos") return "ordens_servico_itens_servicos";
  if (endpoint === "ordens-servico-itens-produtos") return "ordens_servico_itens_produtos";
  if (endpoint === "orcamentos-itens-servicos") return "orcamentos_itens_servicos";
  if (endpoint === "orcamentos-itens-produtos") return "orcamentos_itens_produtos";
  if (endpoint === "requisicoes-estoque") return "requisicoes_estoque";
  if (endpoint === "movimentacoes-estoque") return "movimentacoes_estoque";
  return endpoint;
}

// Custom operational flows
// A. Generate OS from Agenda
app.post("/api/agendamentos/:id/gerar-os", (req, res) => {
  const id = parseInt(req.params.id);
  const db = loadDb();
  const agendamento = db.agendamentos.find((a: any) => a.id === id);
  if (!agendamento) {
    return res.status(404).json({ erro: "NAO_ENCONTRADO", mensagem: "Agendamento não encontrado." });
  }

  // Generate OS
  const nextId = db.ordens_servico.length > 0 ? Math.max(...db.ordens_servico.map((o: any) => o.id)) + 1 : 1;
  const novaOs = {
    id: nextId,
    numero: `OS-${String(nextId).padStart(4, "0")}`,
    cliente_id: agendamento.cliente_id,
    ativo_id: agendamento.ativo_id,
    agendamento_id: agendamento.id,
    orcamento_id: null,
    descricao: agendamento.descricao,
    problema_relatado: agendamento.descricao,
    data_abertura: new Date().toISOString(),
    km_abertura: 0,
    valor_total: 0,
    status: "Aberta",
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    ativo: 1
  };

  db.ordens_servico.push(novaOs);
  agendamento.status = "OS Gerada";
  saveDb(db);

  res.json({
    status: "ok",
    id: novaOs.id,
    dados: novaOs,
    mensagem: "Ordem de serviço gerada com sucesso pela Agenda!"
  });
});

// B. Generate OS from Estimate
app.post("/api/orcamentos/:id/gerar-os", (req, res) => {
  const id = parseInt(req.params.id);
  const db = loadDb();
  const orcamento = db.orcamentos.find((o: any) => o.id === id);
  if (!orcamento) {
    return res.status(404).json({ erro: "NAO_ENCONTRADO", mensagem: "Orçamento não encontrado." });
  }

  // Generate OS
  const nextId = db.ordens_servico.length > 0 ? Math.max(...db.ordens_servico.map((o: any) => o.id)) + 1 : 1;
  const novaOs = {
    id: nextId,
    numero: `OS-${String(nextId).padStart(4, "0")}`,
    cliente_id: orcamento.cliente_id,
    ativo_id: orcamento.ativo_id,
    agendamento_id: null,
    orcamento_id: orcamento.id,
    descricao: orcamento.descricao,
    problema_relatado: orcamento.descricao || "Gerada a partir do Orçamento",
    data_abertura: new Date().toISOString(),
    km_abertura: 0,
    valor_total: orcamento.valor_total,
    status: "Aberta",
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    ativo: 1
  };

  db.ordens_servico.push(novaOs);

  // Copy estimate service items to OS service items
  const estServicos = db.orcamentos_itens_servicos.filter((item: any) => item.orcamento_id === id && item.ativo !== 0);
  estServicos.forEach((item: any) => {
    const sId = db.ordens_servico_itens_servicos.length > 0 ? Math.max(...db.ordens_servico_itens_servicos.map((i: any) => i.id)) + 1 : 1;
    db.ordens_servico_itens_servicos.push({
      id: sId,
      ordem_servico_id: novaOs.id,
      servico_id: item.servico_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      valor_total: item.valor_total,
      observacao: item.observacao || "Copiado do orçamento",
      ativo: 1
    });
  });

  // Copy estimate product items to OS product items
  const estProdutos = db.orcamentos_itens_produtos.filter((item: any) => item.orcamento_id === id && item.ativo !== 0);
  estProdutos.forEach((item: any) => {
    const pId = db.ordens_servico_itens_produtos.length > 0 ? Math.max(...db.ordens_servico_itens_produtos.map((i: any) => i.id)) + 1 : 1;
    db.ordens_servico_itens_produtos.push({
      id: pId,
      ordem_servico_id: novaOs.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      valor_total: item.valor_total,
      observacao: item.observacao || "Copiado do orçamento",
      ativo: 1
    });

    // Automatically register a stock request and warehouse movement for the application
    const reqId = db.requisicoes_estoque.length > 0 ? Math.max(...db.requisicoes_estoque.map((r: any) => r.id)) + 1 : 1;
    db.requisicoes_estoque.push({
      id: reqId,
      ordem_servico_id: novaOs.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      status: "Atendida",
      solicitante: "Processamento Automático",
      data_solicitacao: new Date().toISOString(),
      ativo: 1
    });

    const movId = db.movimentacoes_estoque.length > 0 ? Math.max(...db.movimentacoes_estoque.map((m: any) => m.id)) + 1 : 1;
    db.movimentacoes_estoque.push({
      id: movId,
      produto_id: item.produto_id,
      tipo: "Saída",
      quantidade: item.quantidade,
      origem: novaOs.numero,
      data_movimentacao: new Date().toISOString(),
      observacao: "Baixa automática da OS",
      ativo: 1
    });

    // Decrease quantity in product inventory
    const prod = db.produtos.find((p: any) => p.id === item.produto_id);
    if (prod) {
      prod.estoque_atual = Math.max(0, prod.estoque_atual - item.quantidade);
    }
  });

  orcamento.status = "Aprovado";
  saveDb(db);

  res.json({
    status: "ok",
    id: novaOs.id,
    dados: novaOs,
    mensagem: "Ordem de serviço gerada e itens vinculados com sucesso!"
  });
});

// C. Recalculate Estimate Totals
app.post("/api/orcamentos/:id/recalcular", (req, res) => {
  const id = parseInt(req.params.id);
  const db = loadDb();
  const orcamento = db.orcamentos.find((o: any) => o.id === id);
  if (!orcamento) {
    return res.status(404).json({ erro: "NAO_ENCONTRADO", mensagem: "Orçamento não encontrado." });
  }

  const servicosVal = db.orcamentos_itens_servicos
    .filter((item: any) => item.orcamento_id === id && item.ativo !== 0)
    .reduce((acc: number, item: any) => acc + (item.preco_unitario * item.quantidade), 0);

  const produtosVal = db.orcamentos_itens_produtos
    .filter((item: any) => item.orcamento_id === id && item.ativo !== 0)
    .reduce((acc: number, item: any) => acc + (item.preco_unitario * item.quantidade), 0);

  orcamento.valor_total = servicosVal + produtosVal;
  saveDb(db);

  res.json({
    status: "ok",
    dados: orcamento
  });
});

// D. Approve, Reprove, Cancel Estimate
app.post("/api/orcamentos/:id/aprovar", (req, res) => {
  const id = parseInt(req.params.id);
  const db = loadDb();
  const orcamento = db.orcamentos.find((o: any) => o.id === id);
  if (orcamento) orcamento.status = "Aprovado";
  saveDb(db);
  res.json({ status: "ok", dados: orcamento });
});

app.post("/api/orcamentos/:id/reprovar", (req, res) => {
  const id = parseInt(req.params.id);
  const db = loadDb();
  const orcamento = db.orcamentos.find((o: any) => o.id === id);
  if (orcamento) orcamento.status = "Reprovado";
  saveDb(db);
  res.json({ status: "ok", dados: orcamento });
});

app.post("/api/orcamentos/:id/cancelar", (req, res) => {
  const id = parseInt(req.params.id);
  const db = loadDb();
  const orcamento = db.orcamentos.find((o: any) => o.id === id);
  if (orcamento) orcamento.status = "Cancelado";
  saveDb(db);
  res.json({ status: "ok", dados: orcamento });
});

// E. Approve/Close Work Order
app.post("/api/ordens-servico/:id/aprovar", (req, res) => {
  const id = parseInt(req.params.id);
  const db = loadDb();
  const os = db.ordens_servico.find((o: any) => o.id === id);
  if (os) os.status = "Concluída";
  saveDb(db);
  res.json({ status: "ok", dados: os });
});

// F. Stock request and movement logging helpers
app.post("/api/requisicoes-estoque", (req, res) => {
  const db = loadDb();
  const nextId = db.requisicoes_estoque.length > 0 ? Math.max(...db.requisicoes_estoque.map((r: any) => r.id)) + 1 : 1;
  const reqEstoque = {
    id: nextId,
    ordem_servico_id: req.body.ordem_servico_id,
    produto_id: req.body.produto_id,
    quantidade: req.body.quantidade,
    status: req.body.status || "Atendida",
    solicitante: req.body.solicitante || "Mecânico",
    data_solicitacao: new Date().toISOString(),
    ativo: 1
  };
  db.requisicoes_estoque.push(reqEstoque);

  // Auto log a movement as well
  const movId = db.movimentacoes_estoque.length > 0 ? Math.max(...db.movimentacoes_estoque.map((m: any) => m.id)) + 1 : 1;
  const osNum = db.ordens_servico.find((o: any) => o.id === req.body.ordem_servico_id)?.numero || `OS-${req.body.ordem_servico_id}`;
  db.movimentacoes_estoque.push({
    id: movId,
    produto_id: req.body.produto_id,
    tipo: "Saída",
    quantidade: req.body.quantidade,
    origem: osNum,
    data_movimentacao: new Date().toISOString(),
    observacao: "Baixa manual via requisição",
    ativo: 1
  });

  // Decrease quantity in product inventory
  const prod = db.produtos.find((p: any) => p.id === req.body.produto_id);
  if (prod) {
    prod.estoque_atual = Math.max(0, prod.estoque_atual - req.body.quantidade);
  }

  saveDb(db);
  res.status(201).json({ status: "criado", dados: reqEstoque });
});

// Generic CRUD handlers
app.get("/api/:tipo", (req, res) => {
  const db = loadDb();
  const key = getTableKey(req.params.tipo);
  const table = db[key];
  if (!table) {
    return res.status(404).json({ error: `Tabela '${req.params.tipo}' não encontrada.` });
  }
  res.json({
    status: "ok",
    tabela: req.params.tipo,
    total: table.length,
    dados: table
  });
});

app.post("/api/:tipo", (req, res) => {
  const db = loadDb();
  const key = getTableKey(req.params.tipo);
  const table = db[key];
  if (!table) {
    return res.status(404).json({ error: `Tabela '${req.params.tipo}' não encontrada.` });
  }

  const nextId = table.length > 0 ? Math.max(...table.map((item: any) => item.id)) + 1 : 1;
  const item = {
    id: nextId,
    ...req.body,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    ativo: 1
  };

  // If adding to products/services directly on OS or Estimate, make sure total fields are set or recalculated
  if (key === "ordens_servico_itens_servicos" || key === "ordens_servico_itens_produtos") {
    item.valor_total = (item.preco_unitario || item.preco_base || 0) * (item.quantidade || 1);
  }
  if (key === "orcamentos_itens_servicos" || key === "orcamentos_itens_produtos") {
    item.valor_total = (item.preco_unitario || item.preco_base || 0) * (item.quantidade || 1);
  }

  table.push(item);

  // Recalculate OS value total if applicable
  if (key === "ordens_servico_itens_servicos" || key === "ordens_servico_itens_produtos") {
    const osId = item.ordem_servico_id;
    const os = db.ordens_servico.find((o: any) => o.id === osId);
    if (os) {
      const servicosVal = db.ordens_servico_itens_servicos
        .filter((i: any) => i.ordem_servico_id === osId && i.ativo !== 0)
        .reduce((acc: number, i: any) => acc + (i.preco_unitario * i.quantidade), 0);
      const produtosVal = db.ordens_servico_itens_produtos
        .filter((i: any) => i.ordem_servico_id === osId && i.ativo !== 0)
        .reduce((acc: number, i: any) => acc + (i.preco_unitario * i.quantidade), 0);
      os.valor_total = servicosVal + produtosVal;
    }
  }

  // Recalculate Estimate value total if applicable
  if (key === "orcamentos_itens_servicos" || key === "orcamentos_itens_produtos") {
    const estId = item.orcamento_id;
    const est = db.orcamentos.find((o: any) => o.id === estId);
    if (est) {
      const servicosVal = db.orcamentos_itens_servicos
        .filter((i: any) => i.orcamento_id === estId && i.ativo !== 0)
        .reduce((acc: number, i: any) => acc + (i.preco_unitario * i.quantidade), 0);
      const produtosVal = db.orcamentos_itens_produtos
        .filter((i: any) => i.orcamento_id === estId && i.ativo !== 0)
        .reduce((acc: number, i: any) => acc + (i.preco_unitario * i.quantidade), 0);
      est.valor_total = servicosVal + produtosVal;
    }
  }

  saveDb(db);

  res.status(201).json({
    status: "criado",
    id: item.id,
    tabela: req.params.tipo,
    dados: item,
    mensagem: "Registro criado com sucesso."
  });
});

app.put("/api/:tipo/:id", (req, res) => {
  const db = loadDb();
  const id = parseInt(req.params.id);
  const key = getTableKey(req.params.tipo);
  const table = db[key];
  if (!table) {
    return res.status(404).json({ error: `Tabela '${req.params.tipo}' não encontrada.` });
  }

  const index = table.findIndex((item: any) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `Registro com ID ${id} não encontrado.` });
  }

  const oldItem = table[index];
  const item = {
    ...oldItem,
    ...req.body,
    atualizado_em: new Date().toISOString()
  };

  if (key === "ordens_servico_itens_servicos" || key === "ordens_servico_itens_produtos" ||
      key === "orcamentos_itens_servicos" || key === "orcamentos_itens_produtos") {
    item.valor_total = (item.preco_unitario || 0) * (item.quantidade || 1);
  }

  table[index] = item;

  // Recalculate OS value total if applicable
  if (key === "ordens_servico_itens_servicos" || key === "ordens_servico_itens_produtos") {
    const osId = item.ordem_servico_id;
    const os = db.ordens_servico.find((o: any) => o.id === osId);
    if (os) {
      const servicosVal = db.ordens_servico_itens_servicos
        .filter((i: any) => i.ordem_servico_id === osId && i.ativo !== 0)
        .reduce((acc: number, i: any) => acc + (i.preco_unitario * i.quantidade), 0);
      const produtosVal = db.ordens_servico_itens_produtos
        .filter((i: any) => i.ordem_servico_id === osId && i.ativo !== 0)
        .reduce((acc: number, i: any) => acc + (i.preco_unitario * i.quantidade), 0);
      os.valor_total = servicosVal + produtosVal;
    }
  }

  // Recalculate Estimate value total if applicable
  if (key === "orcamentos_itens_servicos" || key === "orcamentos_itens_produtos") {
    const estId = item.orcamento_id;
    const est = db.orcamentos.find((o: any) => o.id === estId);
    if (est) {
      const servicosVal = db.orcamentos_itens_servicos
        .filter((i: any) => i.orcamento_id === estId && i.ativo !== 0)
        .reduce((acc: number, i: any) => acc + (i.preco_unitario * i.quantidade), 0);
      const produtosVal = db.orcamentos_itens_produtos
        .filter((i: any) => i.orcamento_id === estId && i.ativo !== 0)
        .reduce((acc: number, i: any) => acc + (i.preco_unitario * i.quantidade), 0);
      est.valor_total = servicosVal + produtosVal;
    }
  }

  saveDb(db);

  res.json({
    status: "ok",
    dados: item,
    mensagem: "Registro atualizado com sucesso."
  });
});

app.delete("/api/:tipo/:id", (req, res) => {
  const db = loadDb();
  const id = parseInt(req.params.id);
  const key = getTableKey(req.params.tipo);
  const table = db[key];
  if (!table) {
    return res.status(404).json({ error: `Tabela '${req.params.tipo}' não encontrada.` });
  }

  const index = table.findIndex((item: any) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `Registro com ID ${id} não encontrado.` });
  }

  // Let's do a soft delete or a hard delete. In C#, they usually do soft or hard delete depending on design.
  // We can just filter out or remove, but wait, setting `ativo = 0` is expected in C# lists (`filter(item => item.ativo !== 0)`).
  // Let's soft delete by setting `ativo = 0` so history is preserved, or actually remove if it's item lists! Let's soft delete.
  const deletedItem = table[index];
  deletedItem.ativo = 0;

  // Recalculate OS value total if applicable
  if (key === "ordens_servico_itens_servicos" || key === "ordens_servico_itens_produtos") {
    const osId = deletedItem.ordem_servico_id;
    const os = db.ordens_servico.find((o: any) => o.id === osId);
    if (os) {
      const servicosVal = db.ordens_servico_itens_servicos
        .filter((i: any) => i.ordem_servico_id === osId && i.ativo !== 0)
        .reduce((acc: number, i: any) => acc + (i.preco_unitario * i.quantidade), 0);
      const produtosVal = db.ordens_servico_itens_produtos
        .filter((i: any) => i.ordem_servico_id === osId && i.ativo !== 0)
        .reduce((acc: number, i: any) => acc + (i.preco_unitario * i.quantidade), 0);
      os.valor_total = servicosVal + produtosVal;
    }
  }

  // Recalculate Estimate value total if applicable
  if (key === "orcamentos_itens_servicos" || key === "orcamentos_itens_produtos") {
    const estId = deletedItem.orcamento_id;
    const est = db.orcamentos.find((o: any) => o.id === estId);
    if (est) {
      const servicosVal = db.orcamentos_itens_servicos
        .filter((i: any) => i.orcamento_id === estId && i.ativo !== 0)
        .reduce((acc: number, i: any) => acc + (i.preco_unitario * i.quantidade), 0);
      const produtosVal = db.orcamentos_itens_produtos
        .filter((i: any) => i.orcamento_id === estId && i.ativo !== 0)
        .reduce((acc: number, i: any) => acc + (i.preco_unitario * i.quantidade), 0);
      est.valor_total = servicosVal + produtosVal;
    }
  }

  saveDb(db);

  res.json({
    status: "ok",
    mensagem: "Registro excluído com sucesso."
  });
});

async function startServer() {
  loadDb(); // Ensure db is initialized

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ServiçoPro Backend] Running on http://localhost:${PORT}`);
  });
}

startServer();
