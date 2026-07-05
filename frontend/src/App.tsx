import { useEffect, useMemo, useState, type ReactNode } from 'react';
import PainelOsCentroOperacional from './PainelOsCentroOperacional';
import { salvarOsAtiva } from './osAtivaStore';
import OrcamentoItens from './OrcamentoItens';
import ConfigEmpresa from './ConfigEmpresa';
import ClienteAtivoVinculoGuard from './ClienteAtivoVinculoGuard';

type Tenant = {
  id: string;
  nome: string;
  banco: string;
};

type UsuarioSessao = {
  id: string;
  nome: string;
  email: string;
  papeis: string[];
};

type LoginResponse = {
  status: string;
  accessToken: string;
  tokenType: string;
  expiresAtUtc: string;
  usuario: UsuarioSessao;
  tenant: Tenant;
};

type Pagina =
  | 'dashboard'
  | 'wizard'
  | 'agenda'
  | 'orcamentos'
  | 'ordens'
  | 'clientes'
  | 'ativos'
  | 'produtos'
  | 'servicos'
  | 'compras'
  | 'financeiro'
  | 'fiscal'
  | 'config';

type CadastroPagina = 'clientes' | 'ativos' | 'produtos' | 'servicos';
type OperacaoPagina = 'agenda' | 'orcamentos' | 'ordens';

type ApiLista<T> = {
  status: string;
  tabela: string;
  total: number;
  dados: T[];
};

type Cliente = {
  id: number;
  nome: string;
  tipo: string;
  documento?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  observacao?: string | null;
  ativo: number;
};

type Ativo = {
  id: number;
  cliente_id?: number | null;
  descricao: string;
  tipo: string;
  identificacao?: string | null;
  marca?: string | null;
  modelo?: string | null;
  ano?: number | null;
  status: string;
  observacao?: string | null;
  ativo: number;
};

type Produto = {
  id: number;
  nome: string;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
  preco_venda: number;
  observacao?: string | null;
  ativo: number;
};

type Servico = {
  id: number;
  nome: string;
  descricao?: string | null;
  preco_base: number;
  observacao?: string | null;
  ativo: number;
};

type Agendamento = {
  id: number;
  cliente_id?: number | null;
  ativo_id?: number | null;
  data_agendamento: string;
  hora_agendamento?: string | null;
  tipo: string;
  descricao: string;
  responsavel?: string | null;
  status: string;
  observacao?: string | null;
  ativo: number;
};

type Orcamento = {
  id: number;
  cliente_id?: number | null;
  ativo_id?: number | null;
  agendamento_id?: number | null;
  numero?: string | null;
  descricao: string;
  valor_servicos: number;
  valor_produtos: number;
  valor_desconto: number;
  valor_total: number;
  status: string;
  observacao?: string | null;
  ativo: number;
};

type OrdemServico = {
  id: number;
  cliente_id?: number | null;
  ativo_id?: number | null;
  agendamento_id?: number | null;
  orcamento_id?: number | null;
  numero?: string | null;
  descricao: string;
  problema_relatado?: string | null;
  diagnostico?: string | null;
  km_abertura?: number | string | null;
  data_abertura?: string | null;
  data_encerramento?: string | null;
  valor_servicos: number;
  valor_produtos: number;
  valor_desconto: number;
  valor_total: number;
  status: string;
  observacao?: string | null;
  ativo: number;
};


type ItemServicoOs = {
  id: number;
  ordem_servico_id: number;
  servico_id?: number | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  status?: string | null;
  observacao?: string | null;
  ativo: number;
};

type ItemProdutoOs = {
  id: number;
  ordem_servico_id: number;
  produto_id?: number | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  status?: string | null;
  observacao?: string | null;
  ativo: number;
};

type CadastroState = {
  clientes: Cliente[];
  ativos: Ativo[];
  produtos: Produto[];
  servicos: Servico[];
};

type OperacaoState = {
  agendamentos: Agendamento[];
  orcamentos: Orcamento[];
  ordens: OrdemServico[];
};

const API_BASE = '/api';

const paginas: Record<Pagina, string> = {
  dashboard: 'Visão Geral',
  wizard: 'Novo Atendimento',
  agenda: 'Agenda',
  orcamentos: 'Orçamentos',
  ordens: 'Ordens de Serviço',
  clientes: 'Clientes',
  ativos: 'Ativos',
  produtos: 'Produtos',
  servicos: 'Serviços',
  compras: 'Compras',
  financeiro: 'Financeiro',
  fiscal: 'Fiscal',
  config: 'Configurações',
};

const menu: Array<{ grupo: string; itens: Array<{ id: Pagina; icone: string; label: string }> }> = [
  {
    grupo: 'Início',
    itens: [
      { id: 'dashboard', icone: '🏠', label: 'Visão Geral' },
      { id: 'wizard', icone: '✨', label: 'Novo Atendimento' },
    ],
  },
  {
    grupo: 'Operação',
    itens: [
      { id: 'agenda', icone: '📅', label: 'Agenda' },
      { id: 'orcamentos', icone: '🧾', label: 'Orçamentos' },
      { id: 'ordens', icone: '🛠️', label: 'Ordens de Serviço' },
    ],
  },
  {
    grupo: 'Cadastros',
    itens: [
      { id: 'clientes', icone: '👥', label: 'Clientes' },
      { id: 'ativos', icone: '🚗', label: 'Ativos' },
      { id: 'produtos', icone: '📦', label: 'Produtos' },
      { id: 'servicos', icone: '🧰', label: 'Serviços' },
    ],
  },
  {
    grupo: 'Financeiro & Fiscal',
    itens: [
      { id: 'compras', icone: '📥', label: 'Compras' },
      { id: 'financeiro', icone: '💰', label: 'Financeiro' },
      { id: 'fiscal', icone: '🏛️', label: 'Fiscal' },
    ],
  },
  {
    grupo: 'Sistema',
    itens: [{ id: 'config', icone: '⚙️', label: 'Configurações' }],
  },
];

const cadastroInicial: CadastroState = {
  clientes: [],
  ativos: [],
  produtos: [],
  servicos: [],
};

const operacaoInicial: OperacaoState = {
  agendamentos: [],
  orcamentos: [],
  ordens: [],
};

type ModalVisualAppOpcoes = {
  titulo: string;
  mensagem: string;
  badge?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  tipo?: 'aviso' | 'perigo' | 'sucesso';
};

function escaparHtmlModalApp(valor: unknown) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function mostrarModalVisualApp(opcoes: ModalVisualAppOpcoes): Promise<boolean> {
  return new Promise((resolve) => {
    const existente = document.getElementById('modal-visual-app-servicopro');
    if (existente) existente.remove();

    const badge = opcoes.badge || 'Atenção';
    const textoConfirmar = opcoes.textoConfirmar || 'Entendi';
    const textoCancelar = opcoes.textoCancelar || '';
    const tipo = opcoes.tipo || 'aviso';

    const corBadgeFundo =
      tipo === 'perigo' ? 'rgba(240, 90, 90, 0.14)' :
      tipo === 'sucesso' ? 'rgba(65, 210, 130, 0.14)' :
      'rgba(245, 158, 66, 0.14)';

    const corBadgeTexto =
      tipo === 'perigo' ? '#f08a8a' :
      tipo === 'sucesso' ? '#74e4a5' :
      '#f5b35f';

    const classeConfirmar = tipo === 'perigo' ? 'btn bd' : 'btn bp';

    const overlay = document.createElement('div');
    overlay.id = 'modal-visual-app-servicopro';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '9999';
    overlay.style.background = 'rgba(0, 0, 0, 0.72)';
    overlay.style.backdropFilter = 'blur(3px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '24px';

    overlay.innerHTML = `
      <div role="dialog" aria-modal="true" style="width:min(640px,96vw);background:#171b25;border:1px solid rgba(79,124,255,.55);border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,.55);color:#e9eefc;overflow:hidden;">
        <div style="padding:18px 20px 14px 20px;border-bottom:1px solid rgba(255,255,255,.08);">
          <div style="display:inline-flex;align-items:center;padding:4px 10px;margin-bottom:12px;border-radius:999px;background:${corBadgeFundo};color:${corBadgeTexto};font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">
            ${escaparHtmlModalApp(badge)}
          </div>
          <h3 style="margin:0 0 8px 0;font-size:18px;font-weight:800;">${escaparHtmlModalApp(opcoes.titulo)}</h3>
          <p style="margin:0;color:#aeb8d8;line-height:1.6;font-size:14px;">${escaparHtmlModalApp(opcoes.mensagem)}</p>
        </div>
        <div style="padding:16px 20px;display:flex;justify-content:flex-end;gap:10px;">
          ${
            textoCancelar
              ? `<button type="button" data-modal-cancelar="1" class="btn bo" style="min-width:110px;">${escaparHtmlModalApp(textoCancelar)}</button>`
              : ''
          }
          <button type="button" data-modal-confirmar="1" class="${classeConfirmar}" style="min-width:120px;">
            ${escaparHtmlModalApp(textoConfirmar)}
          </button>
        </div>
      </div>
    `;

    function fechar(resultado: boolean) {
      overlay.remove();
      document.removeEventListener('keydown', tratarTecla);
      resolve(resultado);
    }

    function tratarTecla(event: KeyboardEvent) {
      if (event.key === 'Escape') fechar(false);
    }

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) fechar(false);
      const alvo = event.target as HTMLElement;
      if (alvo?.dataset?.modalCancelar === '1') fechar(false);
      if (alvo?.dataset?.modalConfirmar === '1') fechar(true);
    });

    document.addEventListener('keydown', tratarTecla);
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.querySelector<HTMLButtonElement>('[data-modal-confirmar="1"]')?.focus();
    }, 50);
  });
}

function App() {
  const [pagina, setPagina] = useState<Pagina>('dashboard');
  const [ordemCentralAbertaId, setOrdemCentralAbertaId] = useState('');
  const [editandoOrdemId, setEditandoOrdemId] = useState('');
  const [abaCentralOs, setAbaCentralOs] = useState<'resumo' | 'requisicoes' | 'historico' | 'acoes'>('resumo');
  const [osItensServicos, setOsItensServicos] = useState<ItemServicoOs[]>([]);
  const [osItensProdutos, setOsItensProdutos] = useState<ItemProdutoOs[]>([]);
  const [tipoItemOsAberto, setTipoItemOsAberto] = useState<'servico' | 'produto' | ''>('');
  const [itemServicoOsEditandoId, setItemServicoOsEditandoId] = useState<number | null>(null);
  const [itemProdutoOsEditandoId, setItemProdutoOsEditandoId] = useState<number | null>(null);
  const [excluindoItemOsChave, setExcluindoItemOsChave] = useState('');
  const [itemServicoOsForm, setItemServicoOsForm] = useState({
    servico_id: '',
    descricao: '',
    quantidade: '1',
    valor_unitario: '0,00',
    valor_total: '0,00',
    observacao: '',
  });
  const [itemProdutoOsForm, setItemProdutoOsForm] = useState({
    produto_id: '',
    descricao: '',
    quantidade: '1',
    valor_unitario: '0,00',
    valor_total: '0,00',
    observacao: '',
  });

  useEffect(() => {
    function irParaOrdensServico() {
      setPagina('ordens');
      setOrdemCentralAbertaId('');
      setAbaCentralOs('resumo');
    }

    window.addEventListener('servicopro:navegar-ordens', irParaOrdensServico);

    return () => {
      window.removeEventListener('servicopro:navegar-ordens', irParaOrdensServico);
    };
  }, []);
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [tenantId, setTenantId] = useState('oficina');
  const [email, setEmail] = useState('admin@servicopro.local');
  const [senha, setSenha] = useState('123456');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const [cadastros, setCadastros] = useState<CadastroState>(cadastroInicial);
  const [operacao, setOperacao] = useState<OperacaoState>(operacaoInicial);

  const [carregandoDados, setCarregandoDados] = useState(false);
  const [erroDados, setErroDados] = useState('');
  const [sucessoDados, setSucessoDados] = useState('');
  const [busca, setBusca] = useState('');
  const [filtrosOsLista, setFiltrosOsLista] = useState({
    dataInicial: '',
    dataFinal: '',
    cliente: '',
    ativo: '',
    descricao: '',
    status: 'todas',
  });
  const [ordemGridOs, setOrdemGridOs] = useState<{
    coluna: 'numero' | 'descricao' | 'cliente' | 'ativo' | 'placa' | 'data_abertura' | 'km_abertura' | 'valor_total' | 'status';
    direcao: 'asc' | 'desc';
  }>({
    coluna: 'data_abertura',
    direcao: 'desc',
  });

  const [clienteForm, setClienteForm] = useState({
    nome: '',
    tipo: 'PF',
    documento: '',
    telefone: '',
    email: '',
    endereco: '',
    observacao: '',
  });

  const [ativoForm, setAtivoForm] = useState({
    cliente_id: '',
    descricao: '',
    tipo: 'Equipamento',
    identificacao: '',
    marca: '',
    modelo: '',
    ano: '',
    status: 'Ativo',
    observacao: '',
  });

  const [produtoForm, setProdutoForm] = useState({
    nome: '',
    unidade: 'UN',
    estoque_atual: '0',
    estoque_minimo: '0',
    preco_venda: '0',
    observacao: '',
  });

  const [servicoForm, setServicoForm] = useState({
    nome: '',
    descricao: '',
    preco_base: '0',
    observacao: '',
  });

  const [agendamentoForm, setAgendamentoForm] = useState({
    cliente_id: '',
    ativo_id: '',
    data_agendamento: dataHoje(),
    hora_agendamento: '09:00',
    tipo: 'Atendimento',
    descricao: '',
    responsavel: 'Administrador',
    status: 'Agendado',
    observacao: '',
  });

  const [orcamentoForm, setOrcamentoForm] = useState({
    cliente_id: '',
    ativo_id: '',
    agendamento_id: '',
    numero: '',
    descricao: '',
    valor_servicos: '0',
    valor_produtos: '0',
    valor_desconto: '0',
    valor_total: '0',
    status: 'Aberto',
    observacao: '',
  });

  const [ordemForm, setOrdemForm] = useState({
    cliente_id: '',
    ativo_id: '',
    agendamento_id: '',
    orcamento_id: '',
    numero: '',
    descricao: '',
    problema_relatado: '',
    diagnostico: '',
    km_abertura: '',
    data_abertura: dataHoje(),
    data_encerramento: '',
    valor_servicos: '0',
    valor_produtos: '0',
    valor_desconto: '0',
    valor_total: '0',
    status: 'Aberta',
    observacao: '',
  });

  const paginaCadastro = isCadastroPagina(pagina) ? pagina : null;
  const paginaOperacao = isOperacaoPagina(pagina) ? pagina : null;

  useEffect(() => {
    const tokenSalvo = localStorage.getItem('servicopro_token');
    const usuarioSalvo = localStorage.getItem('servicopro_usuario');
    const tenantSalvo = localStorage.getItem('servicopro_tenant');

    if (tokenSalvo && usuarioSalvo && tenantSalvo) {
      setToken(tokenSalvo);
      setUsuario(JSON.parse(usuarioSalvo));
      setTenant(JSON.parse(tenantSalvo));
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    carregarTudo(token);
    carregarItensOrdemServico(token);
  }, [token]);

  useEffect(() => {
    if (!token || !paginaCadastro) return;
    carregarCadastro(paginaCadastro, token);
    if (paginaCadastro === 'ativos') carregarCadastro('clientes', token);
  }, [pagina, token]);

  useEffect(() => {
    if (!token || !paginaOperacao) return;
    carregarOperacao(paginaOperacao, token);
    if (paginaOperacao === 'agenda' || paginaOperacao === 'orcamentos' || paginaOperacao === 'ordens') {
      carregarCadastro('clientes', token);
      carregarCadastro('ativos', token);
    }
  }, [pagina, token]);

  async function login() {
    setErro('');
    setCarregando(true);

    try {
      const resposta = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: email, email, senha, password: senha, tenant: tenantId, tenantId }),
      });

      if (!resposta.ok) {
        setErro('Usuário, senha ou empresa inválidos.');
        return;
      }

      const dados = (await resposta.json()) as LoginResponse;

      localStorage.setItem('servicopro_token', dados.accessToken);
      localStorage.setItem('servicopro_usuario', JSON.stringify(dados.usuario));
      localStorage.setItem('servicopro_tenant', JSON.stringify(dados.tenant));

      setToken(dados.accessToken);
      setUsuario(dados.usuario);
      setTenant(dados.tenant);
      setPagina('dashboard');
    } catch {
      setErro('Falha ao conectar na API.');
    } finally {
      setCarregando(false);
    }
  }

  function logout() {
    localStorage.removeItem('servicopro_token');
    localStorage.removeItem('servicopro_usuario');
    localStorage.removeItem('servicopro_tenant');

    setToken(null);
    setUsuario(null);
    setTenant(null);
    setPagina('dashboard');
    setCadastros(cadastroInicial);
    setOperacao(operacaoInicial);
  }

  async function carregarTudo(tokenAtual = token) {
    if (!tokenAtual) return;
    setCarregandoDados(true);
    setErroDados('');

    try {
      await Promise.all([
        carregarTodosCadastros(tokenAtual, false),
        carregarTodasOperacoes(tokenAtual, false),
      ]);
    } finally {
      setCarregandoDados(false);
    }
  }

  async function carregarTodosCadastros(tokenAtual = token, controlarLoading = true) {
    if (!tokenAtual) return;
    if (controlarLoading) setCarregandoDados(true);
    setErroDados('');

    try {
      const tipos: CadastroPagina[] = ['clientes', 'ativos', 'produtos', 'servicos'];

      const respostas = await Promise.all(
        tipos.map(async (tipo) => {
          const resposta = await fetch(`${API_BASE}/${tipo}`, {
            headers: { Authorization: `Bearer ${tokenAtual}` },
          });

          if (resposta.status === 401) return { tipo, status: 401, dados: [] };

          if (!resposta.ok) return { tipo, status: resposta.status, dados: [] };

          const json = (await resposta.json()) as ApiLista<Cliente | Ativo | Produto | Servico>;
          return { tipo, status: 200, dados: json.dados ?? [] };
        }),
      );

      if (respostas.some((item) => item.status === 401)) {
        logout();
        return;
      }

      const algumErro = respostas.find((item) => item.status !== 200);
      if (algumErro) {
        setErroDados(`Falha ao carregar ${paginas[algumErro.tipo].toLowerCase()}.`);
        return;
      }

      setCadastros({
        clientes: (respostas.find((item) => item.tipo === 'clientes')?.dados ?? []) as Cliente[],
        ativos: (respostas.find((item) => item.tipo === 'ativos')?.dados ?? []) as Ativo[],
        produtos: (respostas.find((item) => item.tipo === 'produtos')?.dados ?? []) as Produto[],
        servicos: (respostas.find((item) => item.tipo === 'servicos')?.dados ?? []) as Servico[],
      });
    } catch {
      setErroDados('Falha de conexão ao carregar cadastros.');
    } finally {
      if (controlarLoading) setCarregandoDados(false);
    }
  }

  async function carregarTodasOperacoes(tokenAtual = token, controlarLoading = true) {
    if (!tokenAtual) return;
    if (controlarLoading) setCarregandoDados(true);
    setErroDados('');

    try {
      const mapa = [
        { tipo: 'agenda' as OperacaoPagina, endpoint: 'agendamentos' },
        { tipo: 'orcamentos' as OperacaoPagina, endpoint: 'orcamentos' },
        { tipo: 'ordens' as OperacaoPagina, endpoint: 'ordens-servico' },
      ];

      const respostas = await Promise.all(
        mapa.map(async (item) => {
          const resposta = await fetch(`${API_BASE}/${item.endpoint}`, {
            headers: { Authorization: `Bearer ${tokenAtual}` },
          });

          if (resposta.status === 401) return { tipo: item.tipo, status: 401, dados: [] };

          if (!resposta.ok) return { tipo: item.tipo, status: resposta.status, dados: [] };

          const json = (await resposta.json()) as ApiLista<Agendamento | Orcamento | OrdemServico>;
          return { tipo: item.tipo, status: 200, dados: json.dados ?? [] };
        }),
      );

      if (respostas.some((item) => item.status === 401)) {
        logout();
        return;
      }

      const algumErro = respostas.find((item) => item.status !== 200);
      if (algumErro) {
        setErroDados(`Falha ao carregar ${paginas[algumErro.tipo].toLowerCase()}.`);
        return;
      }

      setOperacao({
        agendamentos: (respostas.find((item) => item.tipo === 'agenda')?.dados ?? []) as Agendamento[],
        orcamentos: (respostas.find((item) => item.tipo === 'orcamentos')?.dados ?? []) as Orcamento[],
        ordens: (respostas.find((item) => item.tipo === 'ordens')?.dados ?? []) as OrdemServico[],
      });
    } catch {
      setErroDados('Falha de conexão ao carregar operação.');
    } finally {
      if (controlarLoading) setCarregandoDados(false);
    }
  }

  async function carregarCadastro(tipo: CadastroPagina, tokenAtual = token) {
    if (!tokenAtual) return;
    setCarregandoDados(true);
    setErroDados('');

    try {
      const resposta = await fetch(`${API_BASE}/${tipo}`, {
        headers: { Authorization: `Bearer ${tokenAtual}` },
      });

      if (resposta.status === 401) {
        logout();
        return;
      }

      if (!resposta.ok) {
        setErroDados(`Falha ao carregar ${paginas[tipo].toLowerCase()}.`);
        return;
      }

      const dados = (await resposta.json()) as ApiLista<Cliente | Ativo | Produto | Servico>;

      setCadastros((atual) => ({
        ...atual,
        [tipo]: dados.dados ?? [],
      }));
    } catch {
      setErroDados(`Falha de conexão ao carregar ${paginas[tipo].toLowerCase()}.`);
    } finally {
      setCarregandoDados(false);
    }
  }

  async function carregarOperacao(tipo: OperacaoPagina, tokenAtual = token) {
    if (!tokenAtual) return;

    const endpoint = endpointOperacao(tipo);
    setCarregandoDados(true);
    setErroDados('');

    try {
      const resposta = await fetch(`${API_BASE}/${endpoint}`, {
        headers: { Authorization: `Bearer ${tokenAtual}` },
      });

      if (resposta.status === 401) {
        logout();
        return;
      }

      if (!resposta.ok) {
        setErroDados(`Falha ao carregar ${paginas[tipo].toLowerCase()}.`);
        return;
      }

      const dados = (await resposta.json()) as ApiLista<Agendamento | Orcamento | OrdemServico>;

      setOperacao((atual) => ({
        ...atual,
        [chaveOperacao(tipo)]: dados.dados ?? [],
      }));
    } catch {
      setErroDados(`Falha de conexão ao carregar ${paginas[tipo].toLowerCase()}.`);
    } finally {
      setCarregandoDados(false);
    }
  }

  async function criarRegistro(tipo: CadastroPagina, payload: Record<string, unknown>) {
    if (!token) return;

    setErroDados('');
    setSucessoDados('');
    setCarregandoDados(true);

    try {
      const resposta = await fetch(`${API_BASE}/${tipo}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (resposta.status === 401) {
        logout();
        return;
      }

      if (!resposta.ok) {
        const texto = await resposta.text();
        setErroDados(texto || `Falha ao criar registro em ${paginas[tipo]}.`);
        return;
      }

      setSucessoDados('Registro criado com sucesso.');
      await carregarCadastro(tipo);

      if (tipo === 'clientes') {
        setClienteForm({ nome: '', tipo: 'PF', documento: '', telefone: '', email: '', endereco: '', observacao: '' });
      }

      if (tipo === 'ativos') {
        setAtivoForm({
          cliente_id: '',
          descricao: '',
          tipo: 'Equipamento',
          identificacao: '',
          marca: '',
          modelo: '',
          ano: '',
          status: 'Ativo',
          observacao: '',
        });
      }

      if (tipo === 'produtos') {
        setProdutoForm({ nome: '', unidade: 'UN', estoque_atual: '0', estoque_minimo: '0', preco_venda: '0', observacao: '' });
      }

      if (tipo === 'servicos') {
        setServicoForm({ nome: '', descricao: '', preco_base: '0', observacao: '' });
      }
    } catch {
      setErroDados('Falha de conexão ao criar registro.');
    } finally {
      setCarregandoDados(false);
    }
  }

  async function criarOperacao(tipo: OperacaoPagina, payload: Record<string, unknown>): Promise<number | null> {
    if (!token) return null;

    const endpoint = endpointOperacao(tipo);

    setErroDados('');
    setSucessoDados('');
    setCarregandoDados(true);

    try {
      const resposta = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (resposta.status === 401) {
        logout();
        return null;
      }

      if (!resposta.ok) {
        const texto = await resposta.text();
        setErroDados(texto || `Falha ao criar registro em ${paginas[tipo]}.`);
        return null;
      }

      let respostaJson: any = null;
      try {
        respostaJson = await resposta.json();
      } catch {
        respostaJson = null;
      }

      const idCorpo = Number(respostaJson?.id);
      const location = resposta.headers.get('Location') || '';
      const idLocation = Number(location.split('/').filter(Boolean).pop());
      const idCriado = Number.isFinite(idCorpo) && idCorpo > 0
        ? idCorpo
        : Number.isFinite(idLocation) && idLocation > 0
          ? idLocation
          : null;

      setSucessoDados('Registro criado com sucesso.');
      await carregarOperacao(tipo);

      if (tipo === 'agenda') {
        setAgendamentoForm({
          cliente_id: '',
          ativo_id: '',
          data_agendamento: dataHoje(),
          hora_agendamento: '09:00',
          tipo: 'Atendimento',
          descricao: '',
          responsavel: 'Administrador',
          status: 'Agendado',
          observacao: '',
        });
      }

      if (tipo === 'orcamentos') {
        setOrcamentoForm({
          cliente_id: '',
          ativo_id: '',
          agendamento_id: '',
          numero: '',
          descricao: '',
          valor_servicos: '0',
          valor_produtos: '0',
          valor_desconto: '0',
          valor_total: '0',
          status: 'Aberto',
          observacao: '',
        });
      }

      if (tipo === 'ordens') {
        setOrdemForm({
          cliente_id: '',
          ativo_id: '',
          agendamento_id: '',
          orcamento_id: '',
          numero: '',
          descricao: '',
          problema_relatado: '',
          diagnostico: '',
          km_abertura: '',
          data_abertura: dataHoje(),
          data_encerramento: '',
          valor_servicos: '0',
          valor_produtos: '0',
          valor_desconto: '0',
          valor_total: '0',
          status: 'Aberta',
          observacao: '',
        });
      }
      return idCriado;
    } catch {
      setErroDados('Falha de conexão ao criar registro operacional.');
      return null;
    } finally {
      setCarregandoDados(false);
    }
  }



  async function carregarItensOrdemServico(tokenAtual = token) {
    if (!tokenAtual) return;

    try {
      const [respServicos, respProdutos] = await Promise.all([
        fetch(`${API_BASE}/ordens-servico-itens-servicos`, {
          headers: { Authorization: `Bearer ${tokenAtual}` },
        }),
        fetch(`${API_BASE}/ordens-servico-itens-produtos`, {
          headers: { Authorization: `Bearer ${tokenAtual}` },
        }),
      ]);

      if (respServicos.status === 401 || respProdutos.status === 401) {
        logout();
        return;
      }

      if (respServicos.ok) {
        const json = await respServicos.json();
        setOsItensServicos(json.dados ?? []);
      }

      if (respProdutos.ok) {
        const json = await respProdutos.json();
        setOsItensProdutos(json.dados ?? []);
      }
    } catch {
      setErroDados('Falha ao carregar itens da OS.');
    }
  }

  function limparItemServicoOsForm() {
    setItemServicoOsEditandoId(null);
    setItemServicoOsForm({
      servico_id: '',
      descricao: '',
      quantidade: '1',
      valor_unitario: '0,00',
      valor_total: '0,00',
      observacao: '',
    });
  }

  function limparItemProdutoOsForm() {
    setItemProdutoOsEditandoId(null);
    setItemProdutoOsForm({
      produto_id: '',
      descricao: '',
      quantidade: '1',
      valor_unitario: '0,00',
      valor_total: '0,00',
      observacao: '',
    });
  }

  async function salvarItemServicoOs(ordemId: number): Promise<boolean> {
    if (!token || !ordemId) return false;

    setErroDados('');
    setSucessoDados('');
    setCarregandoDados(true);

    try {
      const editandoId = itemServicoOsEditandoId;
      const resposta = await fetch(
        editandoId
          ? `${API_BASE}/ordens-servico-itens-servicos/${editandoId}`
          : `${API_BASE}/ordens-servico-itens-servicos`,
        {
          method: editandoId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ordem_servico_id: ordemId,
            servico_id: itemServicoOsForm.servico_id ? Number(itemServicoOsForm.servico_id) : null,
            descricao: itemServicoOsForm.descricao,
            quantidade: numeroDecimalBr(itemServicoOsForm.quantidade || '1'),
            valor_unitario: numeroDecimalBr(itemServicoOsForm.valor_unitario),
            valor_total: numeroDecimalBr(itemServicoOsForm.valor_total),
            status: 'Lançado',
            observacao: itemServicoOsForm.observacao || null,
            ativo: 1,
          }),
        }
      );

      const texto = await resposta.text();
      let corpo: any = null;

      try {
        corpo = texto ? JSON.parse(texto) : null;
      } catch {
        corpo = texto;
      }

      if (!resposta.ok) {
        setErroDados(typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao lançar serviço na OS.');
        return false;
      }

      setSucessoDados(typeof corpo === 'string' ? 'Serviço salvo na OS.' : corpo?.mensagem || 'Serviço salvo na OS.');
      limparItemServicoOsForm();
      setTipoItemOsAberto('');
      await carregarItensOrdemServico();
      await carregarOperacao('ordens');
      return true;
    } catch {
      setErroDados('Falha de conexão ao lançar serviço na OS.');
      return false;
    } finally {
      setCarregandoDados(false);
    }
  }

  async function salvarItemProdutoOs(ordemId: number): Promise<boolean> {
    if (!token || !ordemId) return false;

    setErroDados('');
    setSucessoDados('');
    setCarregandoDados(true);

    try {
      const editandoId = itemProdutoOsEditandoId;
      const resposta = await fetch(
        editandoId
          ? `${API_BASE}/ordens-servico-itens-produtos/${editandoId}`
          : `${API_BASE}/ordens-servico-itens-produtos`,
        {
          method: editandoId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ordem_servico_id: ordemId,
            produto_id: itemProdutoOsForm.produto_id ? Number(itemProdutoOsForm.produto_id) : null,
            descricao: itemProdutoOsForm.descricao,
            quantidade: numeroDecimalBr(itemProdutoOsForm.quantidade || '1'),
            valor_unitario: numeroDecimalBr(itemProdutoOsForm.valor_unitario),
            valor_total: numeroDecimalBr(itemProdutoOsForm.valor_total),
            status: 'Lançado',
            observacao: itemProdutoOsForm.observacao || null,
            ativo: 1,
          }),
        }
      );

      const texto = await resposta.text();
      let corpo: any = null;

      try {
        corpo = texto ? JSON.parse(texto) : null;
      } catch {
        corpo = texto;
      }

      if (!resposta.ok) {
        setErroDados(typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao lançar produto/peça na OS.');
        return false;
      }

      setSucessoDados(typeof corpo === 'string' ? 'Produto/peça salvo na OS.' : corpo?.mensagem || 'Produto/peça salvo na OS.');
      limparItemProdutoOsForm();
      setTipoItemOsAberto('');
      await carregarItensOrdemServico();
      await carregarOperacao('ordens');
      return true;
    } catch {
      setErroDados('Falha de conexão ao lançar produto/peça na OS.');
      return false;
    } finally {
      setCarregandoDados(false);
    }
  }


  function editarItemServicoOs(item: ItemServicoOs) {
    setItemServicoOsEditandoId(Number(item.id));
    setItemProdutoOsEditandoId(null);
    setItemServicoOsForm({
      servico_id: item.servico_id ? String(item.servico_id) : '',
      descricao: item.descricao || '',
      quantidade: String(item.quantidade ?? 1),
      valor_unitario: String(item.valor_unitario ?? 0),
      valor_total: String(item.valor_total ?? 0),
      observacao: item.observacao || '',
    });
    setTipoItemOsAberto('servico');
  }

  function editarItemProdutoOs(item: ItemProdutoOs) {
    setItemProdutoOsEditandoId(Number(item.id));
    setItemServicoOsEditandoId(null);
    setItemProdutoOsForm({
      produto_id: item.produto_id ? String(item.produto_id) : '',
      descricao: item.descricao || '',
      quantidade: String(item.quantidade ?? 1),
      valor_unitario: String(item.valor_unitario ?? 0),
      valor_total: String(item.valor_total ?? 0),
      observacao: item.observacao || '',
    });
    setTipoItemOsAberto('produto');
  }

  async function excluirItemServicoOs(item: ItemServicoOs) {
    const confirmado = await mostrarModalVisualApp({
      titulo: 'Excluir serviço da OS?',
      badge: 'Confirmação',
      tipo: 'perigo',
      mensagem: `O serviço "${item.descricao}" será removido da OS e os totais serão recalculados. Esta ação ficará registrada em log.`,
      textoConfirmar: 'Excluir serviço',
      textoCancelar: 'Voltar',
    });

    if (!confirmado || !token) return;

    setExcluindoItemOsChave(`servico-${item.id}`);
    setErroDados('');
    setSucessoDados('');

    try {
      const resposta = await fetch(`${API_BASE}/ordens-servico-itens-servicos/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const texto = await resposta.text();
      let corpo: any = null;

      try {
        corpo = texto ? JSON.parse(texto) : null;
      } catch {
        corpo = texto;
      }

      if (!resposta.ok) {
        setErroDados(typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao excluir serviço da OS.');
        return;
      }

      setSucessoDados(typeof corpo === 'string' ? 'Serviço excluído da OS.' : corpo?.mensagem || 'Serviço excluído da OS.');
      await carregarItensOrdemServico();
      await carregarOperacao('ordens');
    } catch {
      setErroDados('Falha de conexão ao excluir serviço da OS.');
    } finally {
      setExcluindoItemOsChave('');
    }
  }

  async function excluirItemProdutoOs(item: ItemProdutoOs) {
    const confirmado = await mostrarModalVisualApp({
      titulo: 'Excluir produto/peça da OS?',
      badge: 'Confirmação',
      tipo: 'perigo',
      mensagem: `O produto/peça "${item.descricao}" será removido da OS e os totais serão recalculados. Esta ação ficará registrada em log.`,
      textoConfirmar: 'Excluir produto',
      textoCancelar: 'Voltar',
    });

    if (!confirmado || !token) return;

    setExcluindoItemOsChave(`produto-${item.id}`);
    setErroDados('');
    setSucessoDados('');

    try {
      const resposta = await fetch(`${API_BASE}/ordens-servico-itens-produtos/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const texto = await resposta.text();
      let corpo: any = null;

      try {
        corpo = texto ? JSON.parse(texto) : null;
      } catch {
        corpo = texto;
      }

      if (!resposta.ok) {
        setErroDados(typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao excluir produto/peça da OS.');
        return;
      }

      setSucessoDados(typeof corpo === 'string' ? 'Produto/peça excluído da OS.' : corpo?.mensagem || 'Produto/peça excluído da OS.');
      await carregarItensOrdemServico();
      await carregarOperacao('ordens');
    } catch {
      setErroDados('Falha de conexão ao excluir produto/peça da OS.');
    } finally {
      setExcluindoItemOsChave('');
    }
  }

  async function atualizarOrdemServico(id: number, payload: Record<string, unknown>): Promise<boolean> {
    if (!token || !id) return false;

    setErroDados('');
    setSucessoDados('');
    setCarregandoDados(true);

    try {
      const resposta = await fetch(`${API_BASE}/ordens-servico/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (resposta.status === 401) {
        logout();
        return false;
      }

      if (!resposta.ok) {
        const texto = await resposta.text();
        setErroDados(texto || 'Falha ao atualizar ordem de serviço.');
        return false;
      }

      setSucessoDados('OS atualizada com sucesso.');
      await carregarOperacao('ordens');
      return true;
    } catch {
      setErroDados('Falha de conexão ao atualizar ordem de serviço.');
      return false;
    } finally {
      setCarregandoDados(false);
    }
  }

  if (!token || !usuario || !tenant) {
    return (
      <main className="login">
        <section className="lLeft">
          <div className="brand">
            <div className="bmark">⚡</div>
            ServiçoPro
          </div>

          <div className="lhero">
            <h1>Gestão inteligente para quem presta serviços.</h1>
            <p>
              ERP completo com agenda, OS, financeiro e fiscal — desenhado para oficinas, técnicos
              e prestadores de serviços que querem organização sem complicação.
            </p>

            <div className="chips">
              <span className="chip">✓ Multiempresa isolada</span>
              <span className="chip">✓ OS como centro do processo</span>
              <span className="chip">✓ NFS-e via integrador</span>
              <span className="chip">✓ Fluxo de caixa manual</span>
            </div>
          </div>

          <div className="lfloat">
            <strong>Login real ativado</strong>
            <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>
              A sessão é salva no navegador e pode ser encerrada pelo botão Sair.
            </p>
            <div className="mbar">
              <span />
            </div>
            <span style={{ fontSize: 11, color: 'var(--t3)' }}>
              Operação
            </span>
          </div>
        </section>

        <section className="lRight">
          <div className="lpanel">
            <h2>Bem-vindo de volta</h2>
            <p className="sub">Selecione a empresa e acesse o painel.</p>

            <div className="field">
              <label className="lbl">Empresa</label>
              <select className="inp" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
                <option value="oficina">Oficina Modelo São José</option>
                <option value="tecnico">Técnico Manutenção Express</option>
                <option value="assistencia">Assistência Técnica Central</option>
              </select>
            </div>

            <div className="field">
              <label className="lbl">Usuário</label>
              <input className="inp" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="field">
              <label className="lbl">Senha</label>
              <input
                className="inp"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') login();
                }}
              />
            </div>

            {erro && (
              <div className="ins am" style={{ marginBottom: 12 }}>
                <strong>Atenção:</strong> {erro}
              </div>
            )}

            <button className="btnMain" onClick={login} disabled={carregando}>
              {carregando ? 'Entrando...' : 'Entrar no sistema →'}
            </button>

            <p className="lnote">Teste MVP · admin@servicopro.local · senha 123456</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sbrand">
          <div className="bmark">⚡</div>
          ServiçoPro
        </div>

        <div className="tenant-b">
          <div className="t-lbl">Empresa conectada</div>
          <div className="t-name">{tenant.nome}</div>
          <span className="t-db">{tenant.banco}</span>
        </div>

        <div className="side-chart">
          <div className="side-chart-head">
            <span>OS hoje</span>
            <strong>{operacao.ordens.length}</strong>
          </div>
          <div className="chart-bars">
            {[5, 8, 6, 11, 7, 9, Math.max(1, operacao.ordens.length)].map((valor, index) => (
              <div
                key={index}
                className={index === 6 ? 'bar today' : valor === 11 ? 'bar high' : 'bar'}
                style={{ height: Math.max(10, Math.round((valor / 11) * 40)) }}
              />
            ))}
          </div>
          <div className="chart-days">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Hoje'].map((dia) => (
              <span key={dia}>{dia}</span>
            ))}
          </div>
          <div className="chart-stat">
            <span>operação real</span>
            <strong>{operacao.agendamentos.length} ag.</strong>
          </div>
        </div>

        <nav>
          {menu.map((grupo) => (
            <div className="ng" key={grupo.grupo}>
              <div className="ng-lbl">{grupo.grupo}</div>
              {grupo.itens.map((item) => (
                <button
                  key={item.id}
                  className={`nb ${pagina === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setPagina(item.id);
                    setBusca('');
                    setErroDados('');
                    setSucessoDados('');

                                        if (item.id === 'orcamentos') {
                      window.dispatchEvent(new Event('servicopro:orcamentos:voltar-grid'));
                    }

if (item.id === 'ordens') {
                      setOrdemCentralAbertaId('');
                      setAbaCentralOs('resumo');
                    }
                  }}
                >
                  <span className="ni">{item.icone}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sfooter">
          <div className="user-row">
            <div className="user-av">{usuario.nome.substring(0, 1).toUpperCase()}</div>
            <div className="user-info">
              <strong>{usuario.nome}</strong>
              <span>{usuario.email}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>
            ↩ Sair da conta
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="tr">
            <button
              className="btn bo bsm"
              onClick={() => {
                if (paginaCadastro) carregarCadastro(paginaCadastro);
                else if (paginaOperacao) carregarOperacao(paginaOperacao);
                else carregarTudo();
              }}
              disabled={carregandoDados}
            >
              {carregandoDados ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button className="btn ba bsm" onClick={() => setPagina('wizard')}>
              Fluxo guiado ✨
            </button>
            <div className="tav">{usuario.nome.substring(0, 1).toUpperCase()}</div>
          </div>
        </header>

        <main className={`content ${pagina === 'orcamentos' || pagina === 'ordens' ? 'sp-content-operacional-limpo' : ''}`}>
          <div className="sh">
            <div className="sh-l">
              <div className="ey">Operação</div>
              <h2>{paginas[pagina]}</h2>
              <p>
                Dados carregados com segurança para esta empresa.
              </p>
            </div>
          </div>

          {pagina === 'dashboard' ? (
            <Dashboard
              tenant={tenant}
              usuario={usuario}
              cadastros={cadastros}
              operacao={operacao}
              carregando={carregandoDados}
              erro={erroDados}
            />
          ) : paginaCadastro ? (
            <CadastroModulo
              pagina={paginaCadastro}
              busca={busca}
              cadastros={cadastros}
              carregando={carregandoDados}
              erro={erroDados}
              sucesso={sucessoDados}
              clienteForm={clienteForm}
              setClienteForm={setClienteForm}
              ativoForm={ativoForm}
              setAtivoForm={setAtivoForm}
              produtoForm={produtoForm}
              setProdutoForm={setProdutoForm}
              servicoForm={servicoForm}
              setServicoForm={setServicoForm}
              criarRegistro={criarRegistro}
            />
          ) : pagina === 'orcamentos' ? (
            <div className="tl sp-orcamentos-page">
              <div className="sp-orcamento-criacao-modal-host">
              <OperacaoModulo
                pagina={pagina}
                busca={busca}
                cadastros={cadastros}
                operacao={operacao}
                carregando={carregandoDados}
                erro={erroDados}
                sucesso={sucessoDados}
                agendamentoForm={agendamentoForm}
                setAgendamentoForm={setAgendamentoForm}
                orcamentoForm={orcamentoForm}
                setOrcamentoForm={setOrcamentoForm}
                ordemForm={ordemForm}
                setOrdemForm={setOrdemForm}
                criarOperacao={criarOperacao}
              />
              </div>

              <div style={{ marginTop: 18 }}>
                <OrcamentoItens
                  token={token}
                  cadastros={cadastros}
                  orcamentos={operacao.orcamentos}
                  busca={busca}
                  onOrcamentosAtualizados={() => carregarOperacao('orcamentos')}
                />
              </div>
            </div>
          ) : pagina === 'ordens' ? (
            (() => {
              const ordensFiltradas = ordenarListaOs(
                aplicarFiltrosListaOs(
                  operacao.ordens as OrdemServico[],
                  cadastros.clientes,
                  cadastros.ativos,
                  busca,
                  filtrosOsLista
                ),
                cadastros.clientes,
                cadastros.ativos,
                ordemGridOs
              );

              const criandoNovaOs = ordemCentralAbertaId === '__nova__';

              const ordemSelecionada = ordemCentralAbertaId && !criandoNovaOs
                ? (operacao.ordens.find((item) => String(item.id) === String(ordemCentralAbertaId)) as OrdemServico | undefined)
                : undefined;

              const clienteOs = ordemSelecionada
                ? cadastros.clientes.find((item) => Number(item.id) === Number(ordemSelecionada.cliente_id)) || null
                : null;

              const ativoOs = ordemSelecionada
                ? cadastros.ativos.find((item) => Number(item.id) === Number(ordemSelecionada.ativo_id)) || null
                : null;

              const agendaOs = ordemSelecionada
                ? operacao.agendamentos.find((item) => Number(item.id) === Number(ordemSelecionada.agendamento_id)) || null
                : null;

              const orcamentoOs = ordemSelecionada
                ? operacao.orcamentos.find((item) => Number(item.id) === Number(ordemSelecionada.orcamento_id)) || null
                : null;

              const editandoOrdem = Boolean(
                ordemSelecionada &&
                editandoOrdemId &&
                String(ordemSelecionada.id) === String(editandoOrdemId)
              );

              const itensServicosDaOs = ordemSelecionada
                ? osItensServicos.filter((item) => String(item.ordem_servico_id) === String(ordemSelecionada.id) && Number(item.ativo ?? 1) !== 0)
                : [];

              const itensProdutosDaOs = ordemSelecionada
                ? osItensProdutos.filter((item) => String(item.ordem_servico_id) === String(ordemSelecionada.id) && Number(item.ativo ?? 1) !== 0)
                : [];

              const podeEditarItensDaOs = Boolean(
                ordemSelecionada &&
                String(ordemSelecionada.status || '').trim().toLowerCase() === 'aberta'
              );

              function abrirNovaOrdem() {
                setOrdemForm({
                  cliente_id: '',
                  ativo_id: '',
                  agendamento_id: '',
                  orcamento_id: '',
                  numero: '',
                  descricao: '',
                  problema_relatado: '',
                  diagnostico: '',
                  km_abertura: '',
                  data_abertura: dataHoje(),
                  data_encerramento: '',
                  valor_servicos: '0',
                  valor_produtos: '0',
                  valor_desconto: '0',
                  valor_total: '0',
                  status: 'Aberta',
                  observacao: '',
                });

                setEditandoOrdemId('');
                setOrdemCentralAbertaId('__nova__');
                setAbaCentralOs('resumo');
              }

              function abrirOrdem(ordem: OrdemServico) {
                const id = String(ordem.id);
                setEditandoOrdemId('');
                setOrdemCentralAbertaId(id);
                setAbaCentralOs('resumo');
                salvarOsAtiva({
                  id,
                  numero: ordem.numero || `OS-${ordem.id}`,
                  status: ordem.status || 'Aberta',
                  descricao: ordem.descricao || ordem.problema_relatado || '',
                });
                void carregarItensOrdemServico();
              }

              function iniciarEditarOrdem(ordem: OrdemServico) {
                const id = String(ordem.id);

                setOrdemForm({
                  cliente_id: ordem.cliente_id ? String(ordem.cliente_id) : '',
                  ativo_id: ordem.ativo_id ? String(ordem.ativo_id) : '',
                  agendamento_id: ordem.agendamento_id ? String(ordem.agendamento_id) : '',
                  orcamento_id: ordem.orcamento_id ? String(ordem.orcamento_id) : '',
                  numero: ordem.numero || '',
                  descricao: ordem.descricao || '',
                  problema_relatado: ordem.problema_relatado || '',
                  diagnostico: ordem.diagnostico || '',
                  km_abertura: ordem.km_abertura === undefined || ordem.km_abertura === null ? '' : String(ordem.km_abertura),
                  data_abertura: ordem.data_abertura ? String(ordem.data_abertura).slice(0, 10) : dataHoje(),
                  data_encerramento: ordem.data_encerramento ? String(ordem.data_encerramento).slice(0, 10) : '',
                  valor_servicos: String(ordem.valor_servicos ?? 0),
                  valor_produtos: String(ordem.valor_produtos ?? 0),
                  valor_desconto: String(ordem.valor_desconto ?? 0),
                  valor_total: String(ordem.valor_total ?? 0),
                  status: ordem.status || 'Aberta',
                  observacao: ordem.observacao || '',
                });

                setOrdemCentralAbertaId(id);
                setEditandoOrdemId(id);
                setAbaCentralOs('resumo');
              }

              function voltarParaOrdens() {
                setEditandoOrdemId('');
                setOrdemCentralAbertaId('');
                setAbaCentralOs('resumo');
              }

              function imprimirOrdem(ordem: OrdemServico) {
                void imprimirOsSelecionada({
                  token,
                  ordem,
                  cliente: cadastros.clientes.find((item) => Number(item.id) === Number(ordem.cliente_id)) || null,
                  ativo: cadastros.ativos.find((item) => Number(item.id) === Number(ordem.ativo_id)) || null,
                  agenda: operacao.agendamentos.find((item) => Number(item.id) === Number(ordem.agendamento_id)) || null,
                  orcamento: operacao.orcamentos.find((item) => Number(item.id) === Number(ordem.orcamento_id)) || null,
                  produtos: cadastros.produtos,
                });
              }

              function origemDaOs(ordem: OrdemServico) {
                if (ordem.agendamento_id && ordem.orcamento_id) return 'Agenda + Orçamento';
                if (ordem.agendamento_id) return 'Agenda';
                if (ordem.orcamento_id) return 'Orçamento';
                return 'OS direta';
              }

              return (
                <div className="tl">
                  <section className="card" id="lista-ordens-servico-detalhe">
                    <div className="ct">
                      <div>
                        <h3>
                          {criandoNovaOs ? 'Nova ordem de serviço' : ordemSelecionada ? 'Resumo da OS' : 'Ordens de Serviço'}
                          {ordemSelecionada && (
                            <span className={`badge ${badgeClass(ordemSelecionada.status)}`} style={{ marginLeft: 8 }}>
                              {ordemSelecionada.status || 'Aberta'}
                            </span>
                          )}
                        </h3>
                        <p>
                          {criandoNovaOs
                            ? 'Preencha somente os dados essenciais. Depois de salvar, a OS será aberta automaticamente.'
                            : ordemSelecionada
                              ? editandoOrdem
                                ? 'Edite os dados principais da OS. Valores, status, agenda e orçamento ficam fora desta etapa.'
                                : 'Resumo, vínculos e itens da ordem de serviço.'
                              : 'Consulte, filtre e acompanhe as ordens de serviço.'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {ordemSelecionada || criandoNovaOs ? (
                          <button className="btn bo bsm" onClick={voltarParaOrdens}>
                            ← Voltar para ordens
                          </button>
                        ) : (
                          <button
                            className="btn bp bsm"
                            type="button"
                            onClick={abrirNovaOrdem}
                            title="Abrir uma OS direta, sem orçamento ou agenda obrigatórios."
                          >
                            + Abrir nova OS
                          </button>
                        )}

                        <button
                          className="btn bo bsm"
                          onClick={() => carregarOperacao('ordens')}
                          disabled={carregandoDados}
                        >
                          {carregandoDados ? 'Atualizando...' : 'Atualizar'}
                        </button>
                      </div>
                    </div>

                    {erroDados && (
                      <div className="ins am" style={{ marginBottom: 14 }}>
                        <strong>Atenção:</strong> {erroDados}
                      </div>
                    )}

                    {carregandoDados && (
                      <div className="ins" style={{ marginBottom: 14 }}>
                        <strong>Atualizando:</strong> carregando ordens de serviço do tenant.
                      </div>
                    )}

                    {!ordemSelecionada && !criandoNovaOs && (
                      <>
                        <FiltrosListaOrdens
                          filtros={filtrosOsLista}
                          setFiltros={setFiltrosOsLista}
                          totalFiltrado={ordensFiltradas.length}
                          totalGeral={operacao.ordens.length}
                        />

                        <TabelaOrdens
                          dados={ordensFiltradas}
                          clientes={cadastros.clientes}
                          ativos={cadastros.ativos}
                          ordemSelecionadaId={ordemCentralAbertaId}
                          onSelecionar={abrirOrdem}
                          onImprimir={imprimirOrdem}
                          onEditar={iniciarEditarOrdem}
                                                  ordemGrid={ordemGridOs}
                          onOrdenar={(coluna) => {
                            setOrdemGridOs((atual) => ({
                              coluna,
                              direcao: atual.coluna === coluna && atual.direcao === 'asc' ? 'desc' : 'asc',
                            }));
                          }}
/>

                        <div className="ins" style={{ marginTop: 14 }}>
                          <strong>Orientação:</strong> selecione uma OS para consultar detalhes, imprimir ou evoluir o atendimento.
                        </div>
                      </>
                    )}

                    {criandoNovaOs && (
                      <div id="painel-nova-os">
                        <div className="card" style={{ marginBottom: 14 }}>
                          <div className="ct">
                            <div>
                              <h3>Nova ordem de serviço direta</h3>
                              <p>
                                Use este fluxo para abrir uma OS sem depender de orçamento ou agenda. Depois de salvar, o detalhe da OS criada será aberto automaticamente.
                              </p>
                            </div>
                            <span className="badge bg-b">OS direta</span>
                          </div>

                          <FormOrdemServicoCompacta
                            pagina={pagina}
                            busca={busca}
                            cadastros={cadastros}
                            operacao={operacao}
                            carregando={carregandoDados}
                            erro={erroDados}
                            sucesso={sucessoDados}
                            agendamentoForm={agendamentoForm}
                            setAgendamentoForm={setAgendamentoForm}
                            orcamentoForm={orcamentoForm}
                            setOrcamentoForm={setOrcamentoForm}
                            ordemForm={ordemForm}
                            setOrdemForm={setOrdemForm}
                            criarOperacao={criarOperacao}
                            onOrdemCriada={(idCriado) => {
                              if (idCriado) {
                                setOrdemCentralAbertaId(String(idCriado));
                                setSucessoDados('OS criada com sucesso. Abrindo detalhe da OS.');
                                return;
                              }

                              setOrdemCentralAbertaId('');
                              setSucessoDados('OS criada com sucesso. Atualize a lista para abrir a nova OS.');
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {ordemSelecionada && (
                      <div id="painel-detalhe-os">
                        <div className="card" style={{ marginBottom: 14 }}>
                          <div className="ct">
                            <div>
                              <h3>
                                {ordemSelecionada.numero || `OS-${ordemSelecionada.id}`} — {ordemSelecionada.descricao || ordemSelecionada.problema_relatado || 'Sem descrição'}
                                <span className={`badge ${badgeClass(ordemSelecionada.status)}`} style={{ marginLeft: 8 }}>
                                  {ordemSelecionada.status || 'Aberta'}
                                </span>
                              </h3>
                              <p>
                                Origem: {origemDaOs(ordemSelecionada)}.
                              </p>
                            </div>

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <button
                                className={editandoOrdem ? 'btn bo bsm' : 'btn ba bsm'}
                                onClick={() => {
                                  if (editandoOrdem) {
                                    setEditandoOrdemId('');
                                    return;
                                  }

                                  iniciarEditarOrdem(ordemSelecionada);
                                }}
                              >
                                {editandoOrdem ? 'Cancelar edição' : 'Editar OS'}
                              </button>
                              <button className="btn bo bsm" onClick={() => imprimirOrdem(ordemSelecionada)}>
                                Imprimir OS
                              </button>
                              <button className="btn bo bsm" disabled title="Fechamento da OS sera habilitado em etapa controlada.">
                                Fechar OS
                              </button>
                              <button className="btn bd bsm" disabled title="Cancelamento da OS sera habilitado em etapa controlada.">
                                Cancelar OS
                              </button>
                            </div>
                          </div>

                          {editandoOrdem && (
                            <FormEditarOrdemServicoCompacta
                              ordemForm={ordemForm}
                              setOrdemForm={setOrdemForm}
                              cadastros={cadastros}
                              carregando={carregandoDados}
                              onCancelar={() => setEditandoOrdemId('')}
                              onSalvar={async (payload) => {
                                if (!ordemSelecionada) return false;

                                const atualizado = await atualizarOrdemServico(Number(ordemSelecionada.id), payload);
                                if (atualizado) {
                                  setEditandoOrdemId('');
                                }

                                return atualizado;
                              }}
                            />
                          )}

                          <div className="orc-contexto-grid">
                            <div className="orc-contexto-card">
                              <div className="orc-contexto-titulo">
                                <span>Cliente</span>
                                <strong>{clienteOs?.nome || 'Cliente não vinculado'}</strong>
                              </div>
                              <div className="orc-contexto-linhas">
                                <div className="orc-contexto-linha">
                                  <span>Documento</span>
                                  <strong>{clienteOs?.documento || 'Não informado'}</strong>
                                </div>
                                <div className="orc-contexto-linha">
                                  <span>Telefone</span>
                                  <strong>{clienteOs?.telefone || 'Não informado'}</strong>
                                </div>
                                <div className="orc-contexto-linha">
                                  <span>E-mail</span>
                                  <strong>{clienteOs?.email || 'Não informado'}</strong>
                                </div>
                              </div>
                            </div>

                            <div className="orc-contexto-card">
                              <div className="orc-contexto-titulo">
                                <span>Veículo / ativo</span>
                                <strong>{ativoOs?.descricao || 'Ativo não vinculado'}</strong>
                              </div>
                              <div className="orc-contexto-linhas">
                                <div className="orc-contexto-linha">
                                  <span>Identificação</span>
                                  <strong>{ativoOs?.identificacao || 'Não informado'}</strong>
                                </div>
                                <div className="orc-contexto-linha">
                                  <span>Marca / modelo</span>
                                  <strong>{[ativoOs?.marca, ativoOs?.modelo].filter(Boolean).join(' / ') || 'Não informado'}</strong>
                                </div>
                                <div className="orc-contexto-linha">
                                  <span>Ano / status</span>
                                  <strong>{[ativoOs?.ano, ativoOs?.status].filter(Boolean).join(' · ') || 'Não informado'}</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="orc-contexto-grid">
                            <div className="orc-contexto-card">
                              <div className="orc-contexto-titulo">
                                <span>Dados da OS</span>
                                <strong>{ordemSelecionada.descricao || ordemSelecionada.problema_relatado || 'Sem descrição'}</strong>
                              </div>
                              <div className="orc-contexto-linhas">
                                <div className="orc-contexto-linha">
                                  <span>Descrição da OS</span>
                                  <strong>{ordemSelecionada.descricao || 'Sem descrição'}</strong>
                                </div>
                                <div className="orc-contexto-linha">
                                  <span>Problema relatado</span>
                                  <strong>{ordemSelecionada.problema_relatado || 'Não informado'}</strong>
                                </div>
                                <div className="orc-contexto-linha">
                                  <span>Diagnóstico</span>
                                  <strong>{ordemSelecionada.diagnostico || 'Não informado'}</strong>
                                </div>
                                <div className="orc-contexto-linha">
                                  <span>Data abertura</span>
                                  <strong>{formatarDataOs(ordemSelecionada.data_abertura)}</strong>
                                </div>
                                <div className="orc-contexto-linha">
                                  <span>KM abertura</span>
                                  <strong>{formatarKmOs(ordemSelecionada.km_abertura)}</strong>
                                </div>
                                <div className="orc-contexto-linha">
                                  <span>Origem</span>
                                  <strong>{origemDaOs(ordemSelecionada)}</strong>
                                </div>
                              </div>
                            </div>

                            <div className="orc-contexto-card">
                              <div className="orc-contexto-titulo">
                                <span>Vínculos</span>
                                <strong>{orcamentoOs ? `${orcamentoOs.numero || `ORC-${orcamentoOs.id}`} · ${orcamentoOs.status}` : 'Sem orçamento vinculado'}</strong>
                              </div>
                              <div className="orc-contexto-linhas">
                                <div className="orc-contexto-linha">
                                  <span>Agenda</span>
                                  <strong>
                                    {agendaOs
                                      ? `${formatarDataOs(agendaOs.data_agendamento)} ${agendaOs.hora_agendamento || ''}`.trim()
                                      : 'Sem agenda'}
                                  </strong>
                                </div>
                                <div className="orc-contexto-linha">
                                  <span>Orçamento</span>
                                  <strong>{orcamentoOs ? moeda(orcamentoOs.valor_total) : 'Sem orçamento'}</strong>
                                </div>
                                <div className="orc-contexto-linha">
                                  <span>Status</span>
                                  <strong>{ordemSelecionada.status || 'Aberta'}</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="orc-resumo-grid">
                            <div className="orc-resumo-card">
                              <span>Serviços</span>
                              <strong>{moeda(ordemSelecionada.valor_servicos)}</strong>
                            </div>
                            <div className="orc-resumo-card">
                              <span>Produtos</span>
                              <strong>{moeda(ordemSelecionada.valor_produtos)}</strong>
                            </div>
                            <div className="orc-resumo-card">
                              <span>Desconto</span>
                              <strong>{moeda(ordemSelecionada.valor_desconto)}</strong>
                            </div>
                            <div className="orc-resumo-card orc-resumo-card-total">
                              <span>Total</span>
                              <strong>{moeda(ordemSelecionada.valor_total)}</strong>
                            </div>
                          </div>
                        </div>
                        <div className="orc-itens-header">
                          <div>
                            <h3>Itens da OS</h3>
                            <p>Inclua serviços e produtos/peças diretamente na ordem selecionada.</p>
                          </div>
                          <div className="orc-itens-acoes">
                            <button
                              className="btn bo bsm"
                              type="button"
                              disabled={!podeEditarItensDaOs}
                              title={podeEditarItensDaOs ? 'Adicionar serviço' : 'Só é permitido alterar itens com OS Aberta.'}
                              onClick={() => {
                                limparItemServicoOsForm();
                                setItemProdutoOsEditandoId(null);
                                setTipoItemOsAberto('servico');
                              }}
                            >
                              + Adicionar serviço
                            </button>
                            <button
                              className="btn bo bsm"
                              type="button"
                              disabled={!podeEditarItensDaOs}
                              title={podeEditarItensDaOs ? 'Adicionar produto/peça' : 'Só é permitido alterar itens com OS Aberta.'}
                              onClick={() => {
                                limparItemProdutoOsForm();
                                setItemServicoOsEditandoId(null);
                                setTipoItemOsAberto('produto');
                              }}
                            >
                              + Adicionar produto/peça
                            </button>
                          </div>
                        </div>

                        {ordemSelecionada && tipoItemOsAberto === 'servico' && (
                          <ModalItemOs
                            titulo={itemServicoOsEditandoId ? 'Alterar serviço da OS' : 'Adicionar serviço na OS'}
                            subtitulo={itemServicoOsEditandoId ? 'Altere os dados do serviço. A ação será registrada em log.' : 'Lance um serviço executado ou previsto para esta OS.'}
                            onFechar={() => {
                              limparItemServicoOsForm();
                              setTipoItemOsAberto('');
                            }}
                          >
                            <FormItemServicoOs
                              form={itemServicoOsForm}
                              setForm={setItemServicoOsForm}
                              servicos={cadastros.servicos}
                              carregando={carregandoDados}
                              modo={itemServicoOsEditandoId ? 'alterar' : 'adicionar'}
                              onCancelar={() => {
                                limparItemServicoOsForm();
                                setTipoItemOsAberto('');
                              }}
                              onSalvar={() => salvarItemServicoOs(Number(ordemSelecionada.id))}
                            />
                          </ModalItemOs>
                        )}

                        {ordemSelecionada && tipoItemOsAberto === 'produto' && (
                          <ModalItemOs
                            titulo={itemProdutoOsEditandoId ? 'Alterar produto/peça da OS' : 'Adicionar produto/peça na OS'}
                            subtitulo={itemProdutoOsEditandoId ? 'Altere os dados do produto/peça. A ação será registrada em log.' : 'Lance uma peça ou produto aplicado nesta OS. Esta etapa não baixa estoque automaticamente.'}
                            onFechar={() => {
                              limparItemProdutoOsForm();
                              setTipoItemOsAberto('');
                            }}
                          >
                            <FormItemProdutoOs
                              form={itemProdutoOsForm}
                              setForm={setItemProdutoOsForm}
                              produtos={cadastros.produtos}
                              carregando={carregandoDados}
                              modo={itemProdutoOsEditandoId ? 'alterar' : 'adicionar'}
                              onCancelar={() => {
                                limparItemProdutoOsForm();
                                setTipoItemOsAberto('');
                              }}
                              onSalvar={() => salvarItemProdutoOs(Number(ordemSelecionada.id))}
                            />
                          </ModalItemOs>
                        )}

                        <div className="orc-itens-grid">
                          <div className="card">
                            <div className="ct">
                              <div>
                                <h3>Serviços da OS</h3>
                                <p>Serviços lançados nesta ordem de serviço.</p>
                              </div>
                              <span className="badge bg-b">Serviços</span>
                            </div>

                            <ListaItensServicoOs
                              itens={itensServicosDaOs}
                              podeEditar={podeEditarItensDaOs}
                              excluindoChave={excluindoItemOsChave}
                              onEditar={editarItemServicoOs}
                              onExcluir={excluirItemServicoOs}
                            />

                            <div className="ins" style={{ marginTop: 12 }}>
                              <strong>Total de serviços:</strong> {moeda(ordemSelecionada.valor_servicos)}
                            </div>
                          </div>

                          <div className="card">
                            <div className="ct">
                              <div>
                                <h3>Produtos / peças da OS</h3>
                                <p>Produtos e peças lançados nesta ordem de serviço.</p>
                              </div>
                              <span className="badge bg-b">Produtos</span>
                            </div>

                            <ListaItensProdutoOs
                              itens={itensProdutosDaOs}
                              produtos={cadastros.produtos}
                              podeEditar={podeEditarItensDaOs}
                              excluindoChave={excluindoItemOsChave}
                              onEditar={editarItemProdutoOs}
                              onExcluir={excluirItemProdutoOs}
                            />

                            <div className="ins" style={{ marginTop: 12 }}>
                              <strong>Total de produtos/peças:</strong> {moeda(ordemSelecionada.valor_produtos)}
                            </div>
                          </div>
                        </div>
</div>
                    )}
                  </section>
                </div>
              );
            })()
          ) : paginaOperacao ? (
            <OperacaoModulo
              pagina={paginaOperacao}
              busca={busca}
              cadastros={cadastros}
              operacao={operacao}
              carregando={carregandoDados}
              erro={erroDados}
              sucesso={sucessoDados}
              agendamentoForm={agendamentoForm}
              setAgendamentoForm={setAgendamentoForm}
              orcamentoForm={orcamentoForm}
              setOrcamentoForm={setOrcamentoForm}
              ordemForm={ordemForm}
              setOrdemForm={setOrdemForm}
              criarOperacao={criarOperacao}
            />
          ) : pagina === 'config' ? (
            <ConfigEmpresa token={token} />
          ) : pagina === 'wizard' ? (
            <WizardOperacional />
          ) : (
            <ModuloEmConstrucao pagina={pagina} />
          )}
        </main>
      </section>
    </div>
  );
}

function Dashboard({
  tenant,
  usuario,
  cadastros,
  operacao,
  carregando,
  erro,
}: {
  tenant: Tenant;
  usuario: UsuarioSessao;
  cadastros: CadastroState;
  operacao: OperacaoState;
  carregando: boolean;
  erro: string;
}) {
  return (
    <>
      
      <ClienteAtivoVinculoGuard clientes={cadastros.clientes} ativos={cadastros.ativos} />
{carregando && (
        <div className="ins" style={{ marginBottom: 14 }}>
          <strong>Atualizando:</strong> carregando dados reais do tenant.
        </div>
      )}

      {erro && (
        <div className="ins am" style={{ marginBottom: 14 }}>
          <strong>Atenção:</strong> {erro}
        </div>
      )}

      <div className="g g-dash" style={{ marginBottom: 14 }}>
        <Metric label="Clientes" value={String(cadastros.clientes.length)} hint="Cadastro real" icon="👥" type="ac" />
        <Metric label="Ativos" value={String(cadastros.ativos.length)} hint="Vinculados aos clientes" icon="🚗" type="am" />
        <Metric label="Agendamentos" value={String(operacao.agendamentos.length)} hint="Agenda real" icon="📅" type="gr" />
        <Metric label="Ordens de Serviço" value={String(operacao.ordens.length)} hint="Operação real" icon="🛠️" type="pu" />
      </div>

      <div className="g gw">
        <div className="dash-col">
          <div className="card">
            <div className="ct">
              <div>
                <h3>Sessão ativa</h3>
                <p>Login real concluído com vínculo de empresa.</p>
              </div>
              <span className="badge bg-g">Autenticado</span>
            </div>

            <div className="tl">
              <TimelineItem n="1" title="Usuário" text={`${usuario.nome} · ${usuario.email}`} />
              <TimelineItem n="2" title="Tenant" text={`${tenant.nome} · banco ${tenant.banco}`} />
              <TimelineItem
                n="3"
                title="Operação"
                text="Agenda, orçamentos e ordens de serviço conectados aos endpoints reais."
              />
            </div>
          </div>

          <div className="card">
            <div className="ct">
              <div>
                <h3>Agenda real</h3>
                <p>Próximos atendimentos registrados no banco do tenant.</p>
              </div>
            </div>
            <TabelaAgendamentos dados={operacao.agendamentos.slice(0, 5)} clientes={cadastros.clientes} ativos={cadastros.ativos} />
          </div>
        </div>

        <div className="dash-col">
          <div className="card">
            <div className="ct">
              <div>
                <h3>Fluxo principal</h3>
                <p>Ciclo operacional do ServiçoPro.</p>
              </div>
            </div>

            <div className="fs">
              {['Cliente', 'Ativo', 'Agenda', 'Orçamento', 'OS'].map((etapa, index) => (
                <div className={`fb ${index <= 4 ? 'on' : ''}`} key={etapa}>
                  <div className="fb-n">{String(index + 1).padStart(2, '0')}</div>
                  <strong>{etapa}</strong>
                  <span>{index < 2 ? 'Cadastro real' : 'Operação real'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="ct">
              <div>
                <h3>Resumo operacional</h3>
                <p>Totais carregados diretamente da API.</p>
              </div>
            </div>

            <SimpleTable
              heads={['Módulo', 'Total', 'Origem']}
              rows={[
                ['Agenda', String(operacao.agendamentos.length), '/api/agendamentos'],
                ['Orçamentos', String(operacao.orcamentos.length), '/api/orcamentos'],
                ['Ordens de Serviço', String(operacao.ordens.length), '/api/ordens-servico'],
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function CadastroModulo(props: CadastroModuloProps) {
  const { pagina, busca, cadastros, carregando, erro, sucesso } = props;

  const dadosFiltrados = useMemo(() => {
    const texto = busca.trim().toLowerCase();
    const fonte = cadastros[pagina];

    if (!texto) return fonte;

    return fonte.filter((item) => JSON.stringify(item).toLowerCase().includes(texto));
  }, [busca, cadastros, pagina]);

  return (
    <div className="g" style={{ gridTemplateColumns: 'minmax(320px, 0.85fr) minmax(0, 1.6fr)' }}>
      <div className="card">
        <div className="ct">
          <div>
            <h3>Novo registro</h3>
            <p>Gravação real no banco do tenant autenticado.</p>
          </div>
          <span className="badge bg-b">{carregando ? 'Processando' : 'Pronto'}</span>
        </div>

        {erro && (
          <div className="ins am" style={{ marginBottom: 12 }}>
            <strong>Erro:</strong> {erro}
          </div>
        )}

        {sucesso && (
          <div className="ins" style={{ marginBottom: 12 }}>
            <strong>OK:</strong> {sucesso}
          </div>
        )}

        {pagina === 'clientes' && <FormCliente {...props} />}
        {pagina === 'ativos' && <FormAtivo {...props} />}
        {pagina === 'produtos' && <FormProduto {...props} />}
        {pagina === 'servicos' && <FormServico {...props} />}
      </div>

      <div className="card">
        <div className="ct">
          <div>
            <h3>Lista de {paginas[pagina]}</h3>
            <p>
              {dadosFiltrados.length} registro(s) exibido(s). Origem: <strong>/api/{pagina}</strong>
            </p>
          </div>
          <span className="badge bg-g">API real</span>
        </div>

        {pagina === 'clientes' && <TabelaClientes dados={dadosFiltrados as Cliente[]} />}
        {pagina === 'ativos' && <TabelaAtivos dados={dadosFiltrados as Ativo[]} clientes={cadastros.clientes} />}
        {pagina === 'produtos' && <TabelaProdutos dados={dadosFiltrados as Produto[]} />}
        {pagina === 'servicos' && <TabelaServicos dados={dadosFiltrados as Servico[]} />}
      </div>
    </div>
  );
}

function OperacaoModulo(props: OperacaoModuloProps) {
  const { pagina, busca, operacao, carregando, erro, sucesso } = props;

  const dadosFonte =
    pagina === 'agenda'
      ? operacao.agendamentos
      : pagina === 'orcamentos'
        ? operacao.orcamentos
        : operacao.ordens;

  const dadosFiltrados = useMemo(() => {
    const texto = busca.trim().toLowerCase();

    if (!texto) return dadosFonte;

    return dadosFonte.filter((item) => JSON.stringify(item).toLowerCase().includes(texto));
  }, [busca, dadosFonte]);

  return (
    <div className="g" style={{ gridTemplateColumns: 'minmax(320px, 0.85fr) minmax(0, 1.6fr)' }}>
      <div className="card">
        <div className="ct">
          <div>
            <h3>{pagina === 'orcamentos' ? 'Novo orçamento' : 'Novo registro'}</h3>
            <p>
              {pagina === 'orcamentos'
                ? 'Informe cliente, ativo e uma descrição opcional. Os valores serão calculados pelos itens.'
                : 'Gravação real no banco do tenant autenticado.'}
            </p>
          </div>
          <span className="badge bg-b">{carregando ? 'Processando' : 'Pronto'}</span>
        </div>

        {erro && (
          <div className="ins am" style={{ marginBottom: 12 }}>
            <strong>Erro:</strong> {erro}
          </div>
        )}

        {sucesso && (
          <div className="ins" style={{ marginBottom: 12 }}>
            <strong>OK:</strong> {sucesso}
          </div>
        )}

        {pagina === 'agenda' && (
          <>
            <PainelAgendaGerarOs operacao={operacao} cadastros={props.cadastros} />
            <div style={{ height: 14 }} />
            <FormAgendamento {...props} />
          </>
        )}
        {pagina === 'orcamentos' && <FormOrcamento {...props} />}
        {pagina === 'ordens' && <FormOrdemServico {...props} />}
      </div>

      <div className="card">
        <div className="ct">
          <div>
            <h3>Lista de {paginas[pagina]}</h3>
            <p>
              {dadosFiltrados.length} registro(s) exibido(s). Origem:{' '}
              <strong>/api/{endpointOperacao(pagina)}</strong>
            </p>
          </div>
          <span className="badge bg-g">API real</span>
        </div>

        {pagina === 'agenda' && (
          <TabelaAgendamentos dados={dadosFiltrados as Agendamento[]} clientes={props.cadastros.clientes} ativos={props.cadastros.ativos} />
        )}
        {pagina === 'orcamentos' && (
          <TabelaOrcamentos dados={dadosFiltrados as Orcamento[]} clientes={props.cadastros.clientes} ativos={props.cadastros.ativos} />
        )}
        {pagina === 'ordens' && (
          <TabelaOrdens dados={dadosFiltrados as OrdemServico[]} clientes={props.cadastros.clientes} ativos={props.cadastros.ativos} />
        )}
      </div>
    </div>
  );
}

type CadastroModuloProps = {
  pagina: CadastroPagina;
  busca: string;
  cadastros: CadastroState;
  carregando: boolean;
  erro: string;
  sucesso: string;
  clienteForm: {
    nome: string;
    tipo: string;
    documento: string;
    telefone: string;
    email: string;
    endereco: string;
    observacao: string;
  };
  setClienteForm: React.Dispatch<React.SetStateAction<{
    nome: string;
    tipo: string;
    documento: string;
    telefone: string;
    email: string;
    endereco: string;
    observacao: string;
  }>>;
  ativoForm: {
    cliente_id: string;
    descricao: string;
    tipo: string;
    identificacao: string;
    marca: string;
    modelo: string;
    ano: string;
    status: string;
    observacao: string;
  };
  setAtivoForm: React.Dispatch<React.SetStateAction<{
    cliente_id: string;
    descricao: string;
    tipo: string;
    identificacao: string;
    marca: string;
    modelo: string;
    ano: string;
    status: string;
    observacao: string;
  }>>;
  produtoForm: {
    nome: string;
    unidade: string;
    estoque_atual: string;
    estoque_minimo: string;
    preco_venda: string;
    observacao: string;
  };
  setProdutoForm: React.Dispatch<React.SetStateAction<{
    nome: string;
    unidade: string;
    estoque_atual: string;
    estoque_minimo: string;
    preco_venda: string;
    observacao: string;
  }>>;
  servicoForm: {
    nome: string;
    descricao: string;
    preco_base: string;
    observacao: string;
  };
  setServicoForm: React.Dispatch<React.SetStateAction<{
    nome: string;
    descricao: string;
    preco_base: string;
    observacao: string;
  }>>;
  criarRegistro: (tipo: CadastroPagina, payload: Record<string, unknown>) => Promise<void>;
};

type OperacaoModuloProps = {
  pagina: OperacaoPagina;
  busca: string;
  cadastros: CadastroState;
  operacao: OperacaoState;
  carregando: boolean;
  erro: string;
  sucesso: string;
  agendamentoForm: {
    cliente_id: string;
    ativo_id: string;
    data_agendamento: string;
    hora_agendamento: string;
    tipo: string;
    descricao: string;
    responsavel: string;
    status: string;
    observacao: string;
  };
  setAgendamentoForm: React.Dispatch<React.SetStateAction<{
    cliente_id: string;
    ativo_id: string;
    data_agendamento: string;
    hora_agendamento: string;
    tipo: string;
    descricao: string;
    responsavel: string;
    status: string;
    observacao: string;
  }>>;
  orcamentoForm: {
    cliente_id: string;
    ativo_id: string;
    agendamento_id: string;
    numero: string;
    descricao: string;
    valor_servicos: string;
    valor_produtos: string;
    valor_desconto: string;
    valor_total: string;
    status: string;
    observacao: string;
  };
  setOrcamentoForm: React.Dispatch<React.SetStateAction<{
    cliente_id: string;
    ativo_id: string;
    agendamento_id: string;
    numero: string;
    descricao: string;
    valor_servicos: string;
    valor_produtos: string;
    valor_desconto: string;
    valor_total: string;
    status: string;
    observacao: string;
  }>>;
  ordemForm: {
    cliente_id: string;
    ativo_id: string;
    agendamento_id: string;
    orcamento_id: string;
    numero: string;
    descricao: string;
    problema_relatado: string;
    diagnostico: string;
    km_abertura: string;
    data_abertura: string;
    data_encerramento: string;
    valor_servicos: string;
    valor_produtos: string;
    valor_desconto: string;
    valor_total: string;
    status: string;
    observacao: string;
  };
  setOrdemForm: React.Dispatch<React.SetStateAction<{
    cliente_id: string;
    ativo_id: string;
    agendamento_id: string;
    orcamento_id: string;
    numero: string;
    descricao: string;
    problema_relatado: string;
    diagnostico: string;
    valor_servicos: string;
    valor_produtos: string;
    valor_desconto: string;
    valor_total: string;
    status: string;
    observacao: string;
  }>>;
  criarOperacao: (tipo: OperacaoPagina, payload: Record<string, unknown>) => Promise<number | null>;
};

function FormCliente({ clienteForm, setClienteForm, criarRegistro, carregando }: CadastroModuloProps) {
  return (
    <div className="tl">
      <Campo label="Nome">
        <input className="inp" value={clienteForm.nome} onChange={(e) => setClienteForm((v) => ({ ...v, nome: e.target.value }))} placeholder="Nome do cliente" />
      </Campo>

      <Campo label="Tipo">
        <select className="inp" value={clienteForm.tipo} onChange={(e) => setClienteForm((v) => ({ ...v, tipo: e.target.value }))}>
          <option value="PF">Pessoa física</option>
          <option value="PJ">Pessoa jurídica</option>
        </select>
      </Campo>

      <Campo label="Documento">
        <input className="inp" value={clienteForm.documento} onChange={(e) => setClienteForm((v) => ({ ...v, documento: e.target.value }))} placeholder="CPF/CNPJ" />
      </Campo>

      <Campo label="Telefone">
        <input className="inp" value={clienteForm.telefone} onChange={(e) => setClienteForm((v) => ({ ...v, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
      </Campo>

      <Campo label="E-mail">
        <input className="inp" value={clienteForm.email} onChange={(e) => setClienteForm((v) => ({ ...v, email: e.target.value }))} placeholder="cliente@email.com" />
      </Campo>

      <Campo label="Endereço">
        <input className="inp" value={clienteForm.endereco} onChange={(e) => setClienteForm((v) => ({ ...v, endereco: e.target.value }))} placeholder="Endereço completo" />
      </Campo>

      <Campo label="Observação">
        <input className="inp" value={clienteForm.observacao} onChange={(e) => setClienteForm((v) => ({ ...v, observacao: e.target.value }))} placeholder="Observações gerais" />
      </Campo>

      <button className="btnMain" disabled={carregando || !clienteForm.nome.trim()} onClick={() => criarRegistro('clientes', { ...limparPayload(clienteForm), ativo: 1 })}>
        Salvar cliente
      </button>
    </div>
  );
}

function FormAtivo({ ativoForm, setAtivoForm, cadastros, criarRegistro, carregando }: CadastroModuloProps) {
  return (
    <div className="tl">
      <Campo label="Cliente">
        <select className="inp" value={ativoForm.cliente_id} onChange={(e) => setAtivoForm((v) => ({ ...v, cliente_id: e.target.value }))}>
          <option value="">Sem vínculo</option>
          {cadastros.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
          ))}
        </select>
      </Campo>

      <Campo label="Descrição">
        <input className="inp" value={ativoForm.descricao} onChange={(e) => setAtivoForm((v) => ({ ...v, descricao: e.target.value }))} placeholder="Ex.: Honda CG 160" />
      </Campo>

      <Campo label="Tipo">
        <input className="inp" value={ativoForm.tipo} onChange={(e) => setAtivoForm((v) => ({ ...v, tipo: e.target.value }))} placeholder="Veículo, equipamento..." />
      </Campo>

      <Campo label="Identificação">
        <input className="inp" value={ativoForm.identificacao} onChange={(e) => setAtivoForm((v) => ({ ...v, identificacao: e.target.value }))} placeholder="Placa, série, código..." />
      </Campo>

      <Campo label="Marca / Modelo">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input className="inp" value={ativoForm.marca} onChange={(e) => setAtivoForm((v) => ({ ...v, marca: e.target.value }))} placeholder="Marca" />
          <input className="inp" value={ativoForm.modelo} onChange={(e) => setAtivoForm((v) => ({ ...v, modelo: e.target.value }))} placeholder="Modelo" />
        </div>
      </Campo>

      <Campo label="Ano">
        <input className="inp" value={ativoForm.ano} onChange={(e) => setAtivoForm((v) => ({ ...v, ano: e.target.value }))} placeholder="2024" />
      </Campo>

      <button
        className="btnMain"
        disabled={carregando || !ativoForm.descricao.trim()}
        onClick={() =>
          criarRegistro('ativos', {
            ...limparPayload(ativoForm),
            cliente_id: ativoForm.cliente_id ? Number(ativoForm.cliente_id) : null,
            ano: ativoForm.ano ? Number(ativoForm.ano) : null,
            ativo: 1,
          })
        }
      >
        Salvar ativo
      </button>
    </div>
  );
}

function FormProduto({ produtoForm, setProdutoForm, criarRegistro, carregando }: CadastroModuloProps) {
  return (
    <div className="tl">
      <Campo label="Nome">
        <input className="inp" value={produtoForm.nome} onChange={(e) => setProdutoForm((v) => ({ ...v, nome: e.target.value }))} placeholder="Nome do produto" />
      </Campo>

      <Campo label="Unidade">
        <input className="inp" value={produtoForm.unidade} onChange={(e) => setProdutoForm((v) => ({ ...v, unidade: e.target.value }))} placeholder="UN, JG, LT..." />
      </Campo>

      <Campo label="Estoque e preço">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="lbl">Estoque atual</label>
            <input className="inp" value={produtoForm.estoque_atual} onChange={(e) => setProdutoForm((v) => ({ ...v, estoque_atual: e.target.value }))} placeholder="Ex.: 10" inputMode="decimal" />
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label className="lbl">Estoque mínimo</label>
            <input className="inp" value={produtoForm.estoque_minimo} onChange={(e) => setProdutoForm((v) => ({ ...v, estoque_minimo: e.target.value }))} placeholder="Ex.: 2" inputMode="decimal" />
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label className="lbl">Preço de venda</label>
            <input className="inp" value={produtoForm.preco_venda} onChange={(e) => setProdutoForm((v) => ({ ...v, preco_venda: e.target.value }))} placeholder="Ex.: 28,28" inputMode="decimal" />
          </div>
        </div>
      </Campo>

      <Campo label="Observação">
        <input className="inp" value={produtoForm.observacao} onChange={(e) => setProdutoForm((v) => ({ ...v, observacao: e.target.value }))} placeholder="Observações" />
      </Campo>

      <button
        className="btnMain"
        disabled={carregando || !produtoForm.nome.trim()}
        onClick={() =>
          criarRegistro('produtos', {
            ...limparPayload(produtoForm),
            estoque_atual: numeroDecimalBr(produtoForm.estoque_atual),
            estoque_minimo: numeroDecimalBr(produtoForm.estoque_minimo),
            preco_venda: numeroDecimalBr(produtoForm.preco_venda),
            ativo: 1,
          })
        }
      >
        Salvar produto
      </button>
    </div>
  );
}

function FormServico({ servicoForm, setServicoForm, criarRegistro, carregando }: CadastroModuloProps) {
  return (
    <div className="tl">
      <Campo label="Nome">
        <input className="inp" value={servicoForm.nome} onChange={(e) => setServicoForm((v) => ({ ...v, nome: e.target.value }))} placeholder="Nome do serviço" />
      </Campo>

      <Campo label="Descrição">
        <input className="inp" value={servicoForm.descricao} onChange={(e) => setServicoForm((v) => ({ ...v, descricao: e.target.value }))} placeholder="Descrição do serviço" />
      </Campo>

      <Campo label="Preço base">
        <input className="inp" value={servicoForm.preco_base} onChange={(e) => setServicoForm((v) => ({ ...v, preco_base: e.target.value }))} placeholder="0" inputMode="decimal" />
      </Campo>

      <Campo label="Observação">
        <input className="inp" value={servicoForm.observacao} onChange={(e) => setServicoForm((v) => ({ ...v, observacao: e.target.value }))} placeholder="Observações" />
      </Campo>

      <button
        className="btnMain"
        disabled={carregando || !servicoForm.nome.trim()}
        onClick={() =>
          criarRegistro('servicos', {
            ...limparPayload(servicoForm),
            preco_base: numeroDecimalBr(servicoForm.preco_base),
            ativo: 1,
          })
        }
      >
        Salvar serviço
      </button>
    </div>
  );
}

function PainelAgendaGerarOs({
  operacao,
  cadastros,
}: {
  operacao: OperacaoState;
  cadastros: CadastroState;
}) {
  const [agendamentoId, setAgendamentoId] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [ultimaOsGerada, setUltimaOsGerada] = useState<{
    id: number | string;
    numero?: string;
    status?: string;
    agendamentoId?: number | string;
  } | null>(null);

  const agendamentosElegiveis = useMemo(() => {
    return operacao.agendamentos
      .filter((agenda) => agenda.ativo !== 0)
      .filter((agenda) => !String(agenda.status || '').toLowerCase().includes('cancel'));
  }, [operacao.agendamentos]);

  const agendamentoSelecionado = agendamentosElegiveis.find((agenda) => String(agenda.id) === String(agendamentoId));
  const osVinculada = operacao.ordens.find((ordem) => Number(ordem.agendamento_id) === Number(agendamentoId) && ordem.ativo !== 0);
  const osGeradaParaAgendaSelecionada =
    ultimaOsGerada && Number(ultimaOsGerada.agendamentoId) === Number(agendamentoId)
      ? ultimaOsGerada
      : null;
  const osReferencia = osVinculada || osGeradaParaAgendaSelecionada;

  function nomeClienteAgenda(agenda: Agendamento) {
    const cliente = cadastros.clientes.find((item) => Number(item.id) === Number(agenda.cliente_id));
    return cliente?.nome || 'Cliente não vinculado';
  }

  function nomeAtivoAgenda(agenda: Agendamento) {
    const ativo = cadastros.ativos.find((item) => Number(item.id) === Number(agenda.ativo_id));
    return ativo?.descricao || 'Ativo não vinculado';
  }

  function rotuloAgenda(agenda: Agendamento) {
    const data = agenda.data_agendamento ? formatarData(agenda.data_agendamento) : 'Sem data';
    const hora = agenda.hora_agendamento || '';
    return `${data}${hora ? ` ${hora}` : ''} · ${nomeClienteAgenda(agenda)} · ${agenda.descricao || 'Sem descrição'}`;
  }

  function irParaOrdensServico() {
    window.dispatchEvent(new Event('servicopro:navegar-ordens'));
  }

  async function gerarOs() {
    if (!agendamentoSelecionado) {
      await mostrarModalVisualApp({
        titulo: 'Selecione um agendamento',
        mensagem: 'Escolha um agendamento não cancelado para gerar a OS.',
        textoConfirmar: 'Entendi',
      });
      return;
    }

    if (osReferencia) {
      await mostrarModalVisualApp({
        titulo: 'Agenda já possui OS',
        badge: 'Informação',
        mensagem: `Este agendamento já possui a OS ${osReferencia.numero || `OS-${osReferencia.id}`} vinculada. Use Ordens de Serviço para continuar o atendimento.`,
        textoConfirmar: 'Entendi',
      });
      return;
    }

    const confirmado = await mostrarModalVisualApp({
      titulo: 'Gerar OS a partir da agenda?',
      badge: 'Confirmação',
      mensagem: 'Será criada uma Ordem de Serviço Aberta usando cliente, ativo e descrição do agendamento. O orçamento continuará opcional dentro do processo da OS.',
      textoConfirmar: 'Gerar OS',
      textoCancelar: 'Voltar',
    });

    if (!confirmado) return;

    const tokenAtual = localStorage.getItem('servicopro_token');

    if (!tokenAtual) {
      await mostrarModalVisualApp({
        titulo: 'Sessão expirada',
        mensagem: 'Faça login novamente para gerar a OS.',
        textoConfirmar: 'Entendi',
      });
      return;
    }

    setCarregando(true);

    try {
      const resposta = await fetch(`${API_BASE}/agendamentos/${agendamentoSelecionado.id}/gerar-os`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenAtual}` },
      });

      const bruto = await resposta.text();
      let corpo: any = null;

      try {
        corpo = bruto ? JSON.parse(bruto) : null;
      } catch {
        corpo = bruto;
      }

      if (!resposta.ok) {
        await mostrarModalVisualApp({
          titulo: 'OS não foi gerada',
          mensagem: typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao gerar OS a partir da agenda.',
          textoConfirmar: 'Entendi',
        });
        return;
      }

      if (corpo?.ordemServico) {
        setUltimaOsGerada(corpo.ordemServico);
      }

      await mostrarModalVisualApp({
        titulo: 'OS gerada com sucesso',
        badge: 'Sucesso',
        tipo: 'sucesso',
        mensagem: corpo?.ordemServico?.numero
          ? `A ${corpo.ordemServico.numero} foi criada e vinculada ao agendamento. Agora continue o atendimento em Ordens de Serviço.`
          : 'A Ordem de Serviço foi criada e vinculada ao agendamento. Agora continue o atendimento em Ordens de Serviço.',
        textoConfirmar: 'Entendi',
      });
    } catch {
      await mostrarModalVisualApp({
        titulo: 'Falha de conexão',
        mensagem: 'Não foi possível gerar a OS. Verifique a conexão e tente novamente.',
        textoConfirmar: 'Entendi',
      });
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 0, marginBottom: 0 }}>
      <div className="ct">
        <div>
          <h3>Gerar OS pela Agenda</h3>
          <p>Todo agendamento não cancelado pode originar uma Ordem de Serviço. Depois de gerar, continue o atendimento em Ordens de Serviço; o orçamento continua opcional no processo.</p>
        </div>
        <span className="badge bg-b">Agenda → OS</span>
      </div>

      <div className="tl">
        <Campo label="Agendamento">
          <select
            className="inp"
            value={agendamentoId}
            onChange={(e) => {
              setAgendamentoId(e.target.value);
              if (ultimaOsGerada && Number(ultimaOsGerada.agendamentoId) !== Number(e.target.value)) {
                setUltimaOsGerada(null);
              }
            }}
          >
            <option value="">Selecione um agendamento</option>
            {agendamentosElegiveis.map((agenda) => (
              <option key={agenda.id} value={agenda.id}>
                {rotuloAgenda(agenda)}
              </option>
            ))}
          </select>
        </Campo>

        {agendamentoSelecionado && (
          <div className="ins" style={{ marginBottom: 12 }}>
            <strong>Resumo:</strong>{' '}
            {nomeClienteAgenda(agendamentoSelecionado)} · {nomeAtivoAgenda(agendamentoSelecionado)} · {agendamentoSelecionado.status}
            {osReferencia && (
              <>
                {' '}· OS vinculada: <strong>{osReferencia.numero || `OS-${osReferencia.id}`}</strong>
                {' '}· Status: <strong>{osReferencia.status || 'Aberta'}</strong>
              </>
            )}
          </div>
        )}

        {osReferencia ? (
          <button className="btnMain" disabled={carregando} onClick={irParaOrdensServico}>
            Ir para Ordens de Serviço
          </button>
        ) : (
          <button className="btnMain" disabled={carregando || !agendamentoId} onClick={gerarOs}>
            {carregando ? 'Gerando OS...' : 'Gerar OS'}
          </button>
        )}
      </div>
    </div>
  );
}



function filtrarAtivosPorCliente(ativos: any[], clienteId: unknown) {
  const idCliente = String(clienteId ?? '').trim();

  if (!idCliente) return ativos;

  return ativos.filter((ativo: any) => {
    const idClienteAtivo = String(
      ativo?.cliente_id ??
      ativo?.clienteId ??
      ativo?.id_cliente ??
      ativo?.cliente?.id ??
      ''
    ).trim();

    return !idClienteAtivo || idClienteAtivo === idCliente;
  });
}

function FormAgendamento({
  agendamentoForm,
  setAgendamentoForm,
  cadastros,
  criarOperacao,
  carregando,
}: OperacaoModuloProps) {
  return (
    <div className="tl">
      <Campo label="Cliente">
        <select className="inp" value={agendamentoForm.cliente_id} onChange={(e) => setAgendamentoForm((v) => ({ ...v, cliente_id: e.target.value, ativo_id: '' }))}>
          <option value="">Sem vínculo</option>
          {cadastros.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
          ))}
        </select>
      </Campo>

      <Campo label="Ativo">
        <select className="inp" value={agendamentoForm.ativo_id} onChange={(e) => setAgendamentoForm((v) => ({ ...v, ativo_id: e.target.value }))}>
          <option value="">Sem vínculo</option>
          {filtrarAtivosPorCliente(cadastros.ativos, agendamentoForm.cliente_id).map((ativo) => (
            <option key={ativo.id} value={ativo.id}>{ativo.descricao}</option>
          ))}
        </select>
      </Campo>

      <Campo label="Data e hora">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input className="inp" type="date" value={agendamentoForm.data_agendamento} onChange={(e) => setAgendamentoForm((v) => ({ ...v, data_agendamento: e.target.value }))} />
          <input className="inp" type="time" value={agendamentoForm.hora_agendamento} onChange={(e) => setAgendamentoForm((v) => ({ ...v, hora_agendamento: e.target.value }))} />
        </div>
      </Campo>

      <Campo label="Tipo">
        <input className="inp" value={agendamentoForm.tipo} onChange={(e) => setAgendamentoForm((v) => ({ ...v, tipo: e.target.value }))} placeholder="Atendimento, revisão..." />
      </Campo>

      <Campo label="Descrição">
        <input className="inp" value={agendamentoForm.descricao} onChange={(e) => setAgendamentoForm((v) => ({ ...v, descricao: e.target.value }))} placeholder="Descrição do atendimento" />
      </Campo>

      <Campo label="Responsável">
        <input className="inp" value={agendamentoForm.responsavel} onChange={(e) => setAgendamentoForm((v) => ({ ...v, responsavel: e.target.value }))} placeholder="Responsável" />
      </Campo>

      <Campo label="Status">
        <select className="inp" value={agendamentoForm.status} onChange={(e) => setAgendamentoForm((v) => ({ ...v, status: e.target.value }))}>
          <option value="Agendado">Agendado</option>
          <option value="Confirmado">Confirmado</option>
          <option value="Em atendimento">Em atendimento</option>
          <option value="Cancelado">Cancelado</option>
        </select>
      </Campo>

      <button
        className="btnMain"
        disabled={carregando || !agendamentoForm.descricao.trim()}
        onClick={() =>
          criarOperacao('agenda', {
            ...limparPayload(agendamentoForm),
            cliente_id: agendamentoForm.cliente_id ? Number(agendamentoForm.cliente_id) : null,
            ativo_id: agendamentoForm.ativo_id ? Number(agendamentoForm.ativo_id) : null,
            ativo: 1,
          })
        }
      >
        Salvar agendamento
      </button>
    </div>
  );
}

function FormOrcamento({
  orcamentoForm,
  setOrcamentoForm,
  cadastros,
  operacao,
  criarOperacao,
  carregando,
}: OperacaoModuloProps) {
  const agendamentosFiltrados = operacao.agendamentos.filter((agendamento) => {
    const mesmoCliente = !orcamentoForm.cliente_id || String(agendamento.cliente_id ?? '') === String(orcamentoForm.cliente_id);
    const mesmoAtivo = !orcamentoForm.ativo_id || String(agendamento.ativo_id ?? '') === String(orcamentoForm.ativo_id);
    return mesmoCliente && mesmoAtivo;
  });

  async function salvarOrcamento() {
    const idCriado = await criarOperacao('orcamentos', {
      cliente_id: orcamentoForm.cliente_id ? Number(orcamentoForm.cliente_id) : null,
      ativo_id: orcamentoForm.ativo_id ? Number(orcamentoForm.ativo_id) : null,
      agendamento_id: orcamentoForm.agendamento_id ? Number(orcamentoForm.agendamento_id) : null,
      descricao: orcamentoForm.descricao?.trim() || '',
      observacao: orcamentoForm.observacao?.trim() || '',
      valor_servicos: 0,
      valor_produtos: 0,
      valor_desconto: 0,
      valor_total: 0,
      status: 'Aberto',
      ativo: 1,
    });

    if (idCriado) {
      window.dispatchEvent(new Event('servicopro:orcamentos:voltar-grid'));
    }
  }

  return (
    <div className="tl form-orcamento-limpo">
      <div className="ins sp-orcamento-form-dica">
        <strong>Próximo passo:</strong> depois de criar, abra o orçamento para lançar serviços e produtos.
      </div>

      <div className="sp-orcamento-form-grid">
        <Campo label="Cliente">
          <select
            className="inp"
            value={orcamentoForm.cliente_id}
            onChange={(e) =>
              setOrcamentoForm((v) => ({
                ...v,
                cliente_id: e.target.value,
                ativo_id: '',
                agendamento_id: '',
              }))
            }
          >
            <option value="">Selecione o cliente</option>
            {cadastros.clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
            ))}
          </select>
        </Campo>

        <Campo label="Ativo / veículo / equipamento">
          <select
            className="inp"
            value={orcamentoForm.ativo_id}
            onChange={(e) =>
              setOrcamentoForm((v) => ({
                ...v,
                ativo_id: e.target.value,
                agendamento_id: '',
              }))
            }
          >
            <option value="">Selecione o ativo</option>
            {filtrarAtivosPorCliente(cadastros.ativos, orcamentoForm.cliente_id).map((ativo) => (
              <option key={ativo.id} value={ativo.id}>{ativo.descricao}</option>
            ))}
          </select>
        </Campo>

        <Campo label="Agendamento">
          <select
            className="inp"
            value={orcamentoForm.agendamento_id}
            onChange={(e) => setOrcamentoForm((v) => ({ ...v, agendamento_id: e.target.value }))}
          >
            <option value="">Sem vínculo</option>
            {agendamentosFiltrados.map((agendamento) => (
              <option key={agendamento.id} value={agendamento.id}>{agendamento.descricao}</option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo label="Descrição do orçamento">
        <input
          className="inp"
          value={orcamentoForm.descricao}
          onChange={(e) => setOrcamentoForm((v) => ({ ...v, descricao: e.target.value }))}
          placeholder="Descrição do orçamento (opcional)"
        />
      </Campo>

      <Campo label="Observação">
        <textarea
          className="inp"
          value={orcamentoForm.observacao}
          onChange={(e) => setOrcamentoForm((v) => ({ ...v, observacao: e.target.value }))}
          placeholder="Observações internas ou condição combinada (opcional)"
          rows={3}
        />
      </Campo>

      <button
        className="btnMain"
        disabled={carregando || !orcamentoForm.cliente_id}
        onClick={salvarOrcamento}
      >
        {carregando ? 'Criando orçamento...' : 'Criar orçamento'}
      </button>
    </div>
  );
}

function orcamentosDisponiveisParaOs(orcamentos: any[], clienteId: unknown, ativoId: unknown) {
  const idCliente = String(clienteId ?? '').trim();
  const idAtivo = String(ativoId ?? '').trim();

  if (!idCliente || !idAtivo) {
    return [];
  }

  return orcamentos.filter((orcamento: any) => {
    const ativo = Number(orcamento?.ativo ?? 1) !== 0;
    const mesmoCliente = String(orcamento?.cliente_id ?? '') === idCliente;
    const mesmoAtivo = String(orcamento?.ativo_id ?? '') === idAtivo;
    const status = String(orcamento?.status ?? '').trim().toLowerCase();

    const statusValido =
      status === 'aprovado' ||
      status === 'aprovada';

    return ativo && mesmoCliente && mesmoAtivo && statusValido;
  });
}





function ModalItemOs({
  titulo,
  subtitulo,
  children,
  onFechar,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
  onFechar: () => void;
}) {
  return (
    <div className="sp-os-item-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onFechar();
    }}>
      <div className="sp-os-item-modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="sp-os-item-modal-head">
          <div>
            <span className="badge bg-b">Itens da OS</span>
            <h3>{titulo}</h3>
            <p>{subtitulo}</p>
          </div>
          <button className="btn bo bsm" type="button" onClick={onFechar}>Fechar</button>
        </div>
        {children}
      </div>
    </div>
  );
}


function FormItemServicoOs({
  form,
  setForm,
  servicos,
  carregando,
  onSalvar,
  onCancelar,
  modo = 'adicionar',
}: {
  form: {
    servico_id: string;
    descricao: string;
    quantidade: string;
    valor_unitario: string;
    valor_total: string;
    observacao: string;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    servico_id: string;
    descricao: string;
    quantidade: string;
    valor_unitario: string;
    valor_total: string;
    observacao: string;
  }>>;
  servicos: Servico[];
  carregando: boolean;
  onSalvar: () => void;
  onCancelar: () => void;
  modo?: 'adicionar' | 'alterar';
}) {
  function selecionarServico(id: string) {
    const servico = servicos.find((item) => String(item.id) === String(id));
    const valorUnitario = servico ? Number(servico.preco_base ?? 0) : 0;

    setForm((atual) => ({
      ...atual,
      servico_id: id,
      descricao: servico?.nome || atual.descricao,
      valor_unitario: String(valorUnitario),
      valor_total: String(valorUnitario * numeroDecimalBr(atual.quantidade || '1')),
    }));
  }

  function alterarQuantidade(quantidade: string) {
    setForm((atual) => ({
      ...atual,
      quantidade,
      valor_total: String(numeroDecimalBr(quantidade || '1') * numeroDecimalBr(atual.valor_unitario)),
    }));
  }

  function alterarValorUnitario(valor: string) {
    setForm((atual) => ({
      ...atual,
      valor_unitario: valor,
      valor_total: String(numeroDecimalBr(atual.quantidade || '1') * numeroDecimalBr(valor)),
    }));
  }

  return (
    <div className="os-item-form-card">
      <div className="ct">
        <div>
          <h3>{modo === 'alterar' ? 'Alterar serviço' : 'Adicionar serviço'}</h3>
          <p>{modo === 'alterar' ? 'Revise os dados e salve a alteração.' : 'Lance um serviço executado ou previsto para esta OS.'}</p>
        </div>
        <span className="badge bg-b">Serviço</span>
      </div>

      <div className="os-form-compacto">
        <Campo label="Serviço">
          <select className="inp" value={form.servico_id} onChange={(event) => selecionarServico(event.target.value)}>
            <option value="">Selecione um serviço</option>
            {servicos.map((servico) => (
              <option key={servico.id} value={servico.id}>
                {servico.nome} · {moeda(servico.preco_base)}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Descrição">
          <input className="inp" value={form.descricao} onChange={(event) => setForm((v) => ({ ...v, descricao: event.target.value }))} placeholder="Descrição do serviço" />
        </Campo>

        <div className="os-form-compacto-grid os-form-compacto-grid-3">
          <Campo label="Quantidade">
            <input className="inp" value={form.quantidade} onChange={(event) => alterarQuantidade(event.target.value)} inputMode="decimal" />
          </Campo>

          <Campo label="Valor unitário">
            <input className="inp" value={form.valor_unitario} onChange={(event) => alterarValorUnitario(event.target.value)} inputMode="decimal" />
          </Campo>

          <Campo label="Total">
            <input className="inp" value={form.valor_total} readOnly />
          </Campo>
        </div>

        <Campo label="Observação">
          <textarea className="inp os-textarea" value={form.observacao} onChange={(event) => setForm((v) => ({ ...v, observacao: event.target.value }))} />
        </Campo>

        <div className="os-edicao-acoes">
          <button className="btn bo" type="button" onClick={onCancelar} disabled={carregando}>Cancelar</button>
          <button className="btnMain" type="button" onClick={onSalvar} disabled={carregando || !form.descricao.trim()}>
            {carregando ? 'Salvando...' : modo === 'alterar' ? 'Salvar alteração' : '+ Adicionar serviço'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormItemProdutoOs({
  form,
  setForm,
  produtos,
  carregando,
  onSalvar,
  onCancelar,
  modo = 'adicionar',
}: {
  form: {
    produto_id: string;
    descricao: string;
    quantidade: string;
    valor_unitario: string;
    valor_total: string;
    observacao: string;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    produto_id: string;
    descricao: string;
    quantidade: string;
    valor_unitario: string;
    valor_total: string;
    observacao: string;
  }>>;
  produtos: Produto[];
  carregando: boolean;
  onSalvar: () => void;
  onCancelar: () => void;
  modo?: 'adicionar' | 'alterar';
}) {
  function selecionarProduto(id: string) {
    const produto = produtos.find((item) => String(item.id) === String(id));
    const valorUnitario = produto ? Number(produto.preco_venda ?? 0) : 0;

    setForm((atual) => ({
      ...atual,
      produto_id: id,
      descricao: produto?.nome || atual.descricao,
      valor_unitario: String(valorUnitario),
      valor_total: String(valorUnitario * numeroDecimalBr(atual.quantidade || '1')),
    }));
  }

  function alterarQuantidade(quantidade: string) {
    setForm((atual) => ({
      ...atual,
      quantidade,
      valor_total: String(numeroDecimalBr(quantidade || '1') * numeroDecimalBr(atual.valor_unitario)),
    }));
  }

  function alterarValorUnitario(valor: string) {
    setForm((atual) => ({
      ...atual,
      valor_unitario: valor,
      valor_total: String(numeroDecimalBr(atual.quantidade || '1') * numeroDecimalBr(valor)),
    }));
  }

  return (
    <div className="os-item-form-card">
      <div className="ct">
        <div>
          <h3>{modo === 'alterar' ? 'Alterar produto/peça' : 'Adicionar produto/peça'}</h3>
          <p>{modo === 'alterar' ? 'Revise os dados e salve a alteração.' : 'Lance uma peça ou produto aplicado nesta OS. Esta etapa não baixa estoque automaticamente.'}</p>
        </div>
        <span className="badge bg-b">Produto</span>
      </div>

      <div className="os-form-compacto">
        <Campo label="Produto/peça">
          <select className="inp" value={form.produto_id} onChange={(event) => selecionarProduto(event.target.value)}>
            <option value="">Selecione um produto</option>
            {produtos.map((produto) => (
              <option key={produto.id} value={produto.id}>
                {produto.nome} · {moeda(produto.preco_venda)} · estoque {produto.estoque_atual}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Descrição">
          <input className="inp" value={form.descricao} onChange={(event) => setForm((v) => ({ ...v, descricao: event.target.value }))} placeholder="Descrição do produto/peça" />
        </Campo>

        <div className="os-form-compacto-grid os-form-compacto-grid-3">
          <Campo label="Quantidade">
            <input className="inp" value={form.quantidade} onChange={(event) => alterarQuantidade(event.target.value)} inputMode="decimal" />
          </Campo>

          <Campo label="Valor unitário">
            <input className="inp" value={form.valor_unitario} onChange={(event) => alterarValorUnitario(event.target.value)} inputMode="decimal" />
          </Campo>

          <Campo label="Total">
            <input className="inp" value={form.valor_total} readOnly />
          </Campo>
        </div>

        <Campo label="Observação">
          <textarea className="inp os-textarea" value={form.observacao} onChange={(event) => setForm((v) => ({ ...v, observacao: event.target.value }))} />
        </Campo>

        <div className="os-edicao-acoes">
          <button className="btn bo" type="button" onClick={onCancelar} disabled={carregando}>Cancelar</button>
          <button className="btnMain" type="button" onClick={onSalvar} disabled={carregando || !form.descricao.trim()}>
            {carregando ? 'Salvando...' : modo === 'alterar' ? 'Salvar alteração' : '+ Adicionar produto/peça'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ListaItensServicoOs({
  itens,
  podeEditar,
  excluindoChave,
  onEditar,
  onExcluir,
}: {
  itens: ItemServicoOs[];
  podeEditar: boolean;
  excluindoChave: string;
  onEditar: (item: ItemServicoOs) => void;
  onExcluir: (item: ItemServicoOs) => void;
}) {
  if (itens.length === 0) {
    return <div className="ins"><strong>Nenhum serviço lançado.</strong> Use + Adicionar serviço para incluir o primeiro item.</div>;
  }

  return (
    <div className="tw os-itens-tabela">
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Qtd.</th>
            <th>Unitário</th>
            <th>Total</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id}>
              <td>{item.descricao}</td>
              <td>{formatarKmOs(item.quantidade)}</td>
              <td>{moeda(item.valor_unitario)}</td>
              <td>{moeda(item.valor_total)}</td>
              <td>
                <div className="os-item-acoes">
                  <button className="btn ba bsm" type="button" disabled={!podeEditar} onClick={() => onEditar(item)}>
                    Alterar
                  </button>
                  <button
                    className="btn bd bsm"
                    type="button"
                    disabled={!podeEditar || excluindoChave === `servico-${item.id}`}
                    onClick={() => onExcluir(item)}
                  >
                    {excluindoChave === `servico-${item.id}` ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListaItensProdutoOs({
  itens,
  produtos,
  podeEditar,
  excluindoChave,
  onEditar,
  onExcluir,
}: {
  itens: ItemProdutoOs[];
  produtos: Produto[];
  podeEditar: boolean;
  excluindoChave: string;
  onEditar: (item: ItemProdutoOs) => void;
  onExcluir: (item: ItemProdutoOs) => void;
}) {
  if (itens.length === 0) {
    return <div className="ins"><strong>Nenhum produto/peça lançado.</strong> Use + Adicionar produto/peça para incluir o primeiro item.</div>;
  }

  return (
    <div className="tw os-itens-tabela">
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Produto</th>
            <th>Qtd.</th>
            <th>Unitário</th>
            <th>Total</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => {
            const produto = produtos.find((p) => Number(p.id) === Number(item.produto_id));

            return (
              <tr key={item.id}>
                <td>{item.descricao}</td>
                <td>{produto?.nome || '-'}</td>
                <td>{formatarKmOs(item.quantidade)}</td>
                <td>{moeda(item.valor_unitario)}</td>
                <td>{moeda(item.valor_total)}</td>
                <td>
                  <div className="os-item-acoes">
                    <button className="btn ba bsm" type="button" disabled={!podeEditar} onClick={() => onEditar(item)}>
                      Alterar
                    </button>
                    <button
                      className="btn bd bsm"
                      type="button"
                      disabled={!podeEditar || excluindoChave === `produto-${item.id}`}
                      onClick={() => onExcluir(item)}
                    >
                      {excluindoChave === `produto-${item.id}` ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


function FormEditarOrdemServicoCompacta({
  ordemForm,
  setOrdemForm,
  cadastros,
  carregando,
  onSalvar,
  onCancelar,
}: Pick<OperacaoModuloProps, 'ordemForm' | 'setOrdemForm' | 'cadastros' | 'carregando'> & {
  onSalvar: (payload: Record<string, unknown>) => Promise<boolean>;
  onCancelar: () => void;
}) {
  async function salvarEdicao() {
    await onSalvar({
      cliente_id: ordemForm.cliente_id ? Number(ordemForm.cliente_id) : null,
      ativo_id: ordemForm.ativo_id ? Number(ordemForm.ativo_id) : null,
      descricao: ordemForm.descricao,
      problema_relatado: ordemForm.problema_relatado || null,
      diagnostico: ordemForm.diagnostico || null,
      km_abertura: ordemForm.km_abertura ? numeroDecimalBr(ordemForm.km_abertura) : null,
      data_abertura: ordemForm.data_abertura || null,
      observacao: ordemForm.observacao || null,
    });
  }

  const salvarBloqueado =
    carregando ||
    !String(ordemForm.cliente_id || '').trim() ||
    !String(ordemForm.ativo_id || '').trim() ||
    !String(ordemForm.descricao || '').trim();

  return (
    <div className="os-edicao-card">
      <div className="ct">
        <div>
          <h3>Editar dados principais da OS</h3>
          <p>Altere somente os dados cadastrais da ordem. Itens, valores, status e fechamento serão tratados em etapas específicas.</p>
        </div>
        <span className="badge bg-b">Edição</span>
      </div>

      <div className="os-form-compacto">
        <div className="os-form-compacto-grid os-form-compacto-grid-2">
          <Campo label="Cliente">
            <select
              className="inp"
              value={ordemForm.cliente_id}
              onChange={(e) => setOrdemForm((v) => ({ ...v, cliente_id: e.target.value, ativo_id: '' }))}
            >
              <option value="">Selecione o cliente</option>
              {cadastros.clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
              ))}
            </select>
          </Campo>

          <Campo label="Ativo">
            <select
              className="inp"
              value={ordemForm.ativo_id}
              onChange={(e) => setOrdemForm((v) => ({ ...v, ativo_id: e.target.value }))}
              disabled={!ordemForm.cliente_id}
            >
              <option value="">{ordemForm.cliente_id ? 'Selecione o ativo' : 'Selecione o cliente primeiro'}</option>
              {filtrarAtivosPorCliente(cadastros.ativos, ordemForm.cliente_id).map((ativo) => (
                <option key={ativo.id} value={ativo.id}>{ativo.descricao}</option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="os-form-compacto-grid os-form-compacto-grid-2">
          <Campo label="Data abertura">
            <input
              className="inp"
              type="date"
              value={ordemForm.data_abertura}
              onChange={(e) => setOrdemForm((v) => ({ ...v, data_abertura: e.target.value }))}
            />
          </Campo>

          <Campo label="KM abertura">
            <input
              className="inp"
              value={ordemForm.km_abertura}
              onChange={(e) => setOrdemForm((v) => ({ ...v, km_abertura: e.target.value }))}
              inputMode="decimal"
              placeholder="Ex.: 123456"
            />
          </Campo>
        </div>

        <Campo label="Descrição da OS">
          <input
            className="inp"
            value={ordemForm.descricao}
            onChange={(e) => setOrdemForm((v) => ({ ...v, descricao: e.target.value }))}
            placeholder="Descrição da OS"
          />
        </Campo>

        <Campo label="Problema relatado">
          <textarea
            className="inp os-textarea"
            value={ordemForm.problema_relatado}
            onChange={(e) => setOrdemForm((v) => ({ ...v, problema_relatado: e.target.value }))}
            placeholder="Problema informado pelo cliente"
          />
        </Campo>

        <Campo label="Diagnóstico">
          <textarea
            className="inp os-textarea"
            value={ordemForm.diagnostico}
            onChange={(e) => setOrdemForm((v) => ({ ...v, diagnostico: e.target.value }))}
            placeholder="Diagnóstico inicial"
          />
        </Campo>

        <Campo label="Observação">
          <textarea
            className="inp os-textarea"
            value={ordemForm.observacao}
            onChange={(e) => setOrdemForm((v) => ({ ...v, observacao: e.target.value }))}
            placeholder="Observações internas"
          />
        </Campo>

        <div className="os-edicao-acoes">
          <button className="btn bo" type="button" onClick={onCancelar} disabled={carregando}>
            Cancelar
          </button>
          <button className="btnMain" type="button" onClick={salvarEdicao} disabled={salvarBloqueado}>
            {carregando ? 'Salvando...' : 'Salvar alterações da OS'}
          </button>
        </div>
      </div>
    </div>
  );
}


function FormOrdemServicoCompacta({
  ordemForm,
  setOrdemForm,
  cadastros,
  criarOperacao,
  carregando,
  onOrdemCriada,
}: OperacaoModuloProps & { onOrdemCriada?: (idCriado: number | null) => void }) {
  async function salvarNovaOsCompacta() {
    const idCriado = await criarOperacao('ordens', {
      ...limparPayload(ordemForm),
      cliente_id: ordemForm.cliente_id ? Number(ordemForm.cliente_id) : null,
      ativo_id: ordemForm.ativo_id ? Number(ordemForm.ativo_id) : null,
      agendamento_id: null,
      orcamento_id: null,
      numero: '',
      km_abertura: ordemForm.km_abertura ? numeroDecimalBr(ordemForm.km_abertura) : null,
      data_abertura: ordemForm.data_abertura || null,
      data_encerramento: null,
      valor_servicos: 0,
      valor_produtos: 0,
      valor_desconto: 0,
      valor_total: 0,
      status: 'Aberta',
      ativo: 1,
    });

    onOrdemCriada?.(idCriado);
  }

  const salvarBloqueado =
    carregando ||
    !String(ordemForm.cliente_id || '').trim() ||
    !String(ordemForm.ativo_id || '').trim() ||
    !String(ordemForm.descricao || '').trim();

  return (
    <div className="os-form-compacto">
      <div className="os-form-compacto-grid os-form-compacto-grid-2">
        <Campo label="Cliente">
          <select
            className="inp"
            value={ordemForm.cliente_id}
            onChange={(e) => setOrdemForm((v) => ({ ...v, cliente_id: e.target.value, ativo_id: '', orcamento_id: '' }))}
          >
            <option value="">Selecione o cliente</option>
            {cadastros.clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
            ))}
          </select>
        </Campo>

        <Campo label="Ativo">
          <select
            className="inp"
            value={ordemForm.ativo_id}
            onChange={(e) => setOrdemForm((v) => ({ ...v, ativo_id: e.target.value, orcamento_id: '' }))}
            disabled={!ordemForm.cliente_id}
          >
            <option value="">{ordemForm.cliente_id ? 'Selecione o ativo' : 'Selecione o cliente primeiro'}</option>
            {filtrarAtivosPorCliente(cadastros.ativos, ordemForm.cliente_id).map((ativo) => (
              <option key={ativo.id} value={ativo.id}>{ativo.descricao}</option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="os-form-compacto-grid os-form-compacto-grid-2">
        <Campo label="Data abertura">
          <input
            className="inp"
            type="date"
            value={ordemForm.data_abertura}
            onChange={(e) => setOrdemForm((v) => ({ ...v, data_abertura: e.target.value }))}
          />
        </Campo>

        <Campo label="KM abertura">
          <input
            className="inp"
            value={ordemForm.km_abertura}
            onChange={(e) => setOrdemForm((v) => ({ ...v, km_abertura: e.target.value }))}
            inputMode="decimal"
            placeholder="Ex.: 123456"
          />
        </Campo>
      </div>

      <Campo label="Descrição da OS">
        <input
          className="inp"
          value={ordemForm.descricao}
          onChange={(e) => setOrdemForm((v) => ({ ...v, descricao: e.target.value }))}
          placeholder="Ex.: Manutenção corretiva, revisão, diagnóstico..."
        />
      </Campo>

      <Campo label="Problema relatado">
        <textarea
          className="inp os-textarea"
          value={ordemForm.problema_relatado}
          onChange={(e) => setOrdemForm((v) => ({ ...v, problema_relatado: e.target.value }))}
          placeholder="Descreva o problema informado pelo cliente"
        />
      </Campo>

      <Campo label="Diagnóstico inicial">
        <textarea
          className="inp os-textarea"
          value={ordemForm.diagnostico}
          onChange={(e) => setOrdemForm((v) => ({ ...v, diagnostico: e.target.value }))}
          placeholder="Registre a avaliação inicial, se houver"
        />
      </Campo>

      <Campo label="Observação">
        <textarea
          className="inp os-textarea"
          value={ordemForm.observacao}
          onChange={(e) => setOrdemForm((v) => ({ ...v, observacao: e.target.value }))}
          placeholder="Observações internas da abertura da OS"
        />
      </Campo>

      <div className="ins" style={{ marginTop: 4 }}>
        <strong>Fluxo compacto:</strong> a OS será aberta como Aberta, sem orçamento, sem agenda, sem valores e sem encerramento. Depois de salvar, o sistema abrirá automaticamente o detalhe da OS.
      </div>

      <button
        className="btnMain"
        disabled={salvarBloqueado}
        onClick={salvarNovaOsCompacta}
      >
        {carregando ? 'Salvando...' : 'Salvar e abrir OS'}
      </button>
    </div>
  );
}


function FormOrdemServico({
  ordemForm,
  setOrdemForm,
  cadastros,
  operacao,
  criarOperacao,
  carregando,
}: OperacaoModuloProps) {
  function selecionarOrcamentoNaOs(orcamentoId: string) {
    const orcamento = operacao.orcamentos.find((item) => String(item.id) === String(orcamentoId));

    setOrdemForm((atual) => ({
      ...atual,
      orcamento_id: orcamentoId,
      cliente_id: orcamento?.cliente_id ? String(orcamento.cliente_id) : atual.cliente_id,
      ativo_id: orcamento?.ativo_id ? String(orcamento.ativo_id) : atual.ativo_id,
      valor_servicos: orcamento ? String(orcamento.valor_servicos ?? 0) : atual.valor_servicos,
      valor_produtos: orcamento ? String(orcamento.valor_produtos ?? 0) : atual.valor_produtos,
      valor_desconto: orcamento ? String(orcamento.valor_desconto ?? 0) : atual.valor_desconto,
      valor_total: orcamento ? String(orcamento.valor_total ?? 0) : atual.valor_total,
      descricao: orcamento?.descricao ? `OS referente ao orçamento ${orcamento.numero || `ORC-${orcamento.id}`}: ${orcamento.descricao}` : atual.descricao,
    }));
  }

  const orcamentoSelecionado = operacao.orcamentos.find((item) => String(item.id) === String(ordemForm.orcamento_id));

  return (
    <div className="tl">
      <Campo label="Cliente">
        <select className="inp" value={ordemForm.cliente_id} onChange={(e) => setOrdemForm((v) => ({ ...v, cliente_id: e.target.value, ativo_id: '', orcamento_id: '' }))}>
          <option value="">Sem vínculo</option>
          {cadastros.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
          ))}
        </select>
      </Campo>

      <Campo label="Ativo">
        <select className="inp" value={ordemForm.ativo_id} onChange={(e) => setOrdemForm((v) => ({ ...v, ativo_id: e.target.value, orcamento_id: '' }))}>
          <option value="">Sem vínculo</option>
          {filtrarAtivosPorCliente(cadastros.ativos, ordemForm.cliente_id).map((ativo) => (
            <option key={ativo.id} value={ativo.id}>{ativo.descricao}</option>
          ))}
        </select>
      </Campo>

      <Campo label="Orçamento">
        <select className="inp" value={ordemForm.orcamento_id} onChange={(e) => selecionarOrcamentoNaOs(e.target.value)}>
          <option value="">Sem vínculo</option>
          {orcamentosDisponiveisParaOs(operacao.orcamentos, ordemForm.cliente_id, ordemForm.ativo_id)
            .map((orcamento) => (
              <option key={orcamento.id} value={orcamento.id}>
                {rotuloOrcamentoParaOs(orcamento)}
              </option>
            ))}
        </select>

        {!ordemForm.cliente_id || !ordemForm.ativo_id ? (
          <div className="ins" style={{ marginTop: 8 }}>
            Selecione cliente e ativo para listar somente orçamentos aprovados compatíveis.
          </div>
        ) : null}

        {ordemForm.cliente_id && ordemForm.ativo_id && !orcamentoSelecionado && (
          <div className="ins" style={{ marginTop: 8 }}>
            Apenas orçamentos aprovados do mesmo cliente e ativo ficam disponíveis para vínculo.
          </div>
        )}

        {orcamentoSelecionado && (
          <div className="ins" style={{ marginTop: 8 }}>
            <strong>Orçamento selecionado:</strong>{' '}
            {orcamentoSelecionado.numero || `ORC-${orcamentoSelecionado.id}`} · {orcamentoSelecionado.status} · {moeda(Number(orcamentoSelecionado.valor_total || 0))}
          </div>
        )}
      </Campo>

      <Campo label="Número">
        <input className="inp" value={ordemForm.numero} onChange={(e) => setOrdemForm((v) => ({ ...v, numero: e.target.value }))} placeholder="Ex.: OS-0002" />
      </Campo>

      <Campo label="Descrição">
        <input className="inp" value={ordemForm.descricao} onChange={(e) => setOrdemForm((v) => ({ ...v, descricao: e.target.value }))} placeholder="Descrição da OS" />
      </Campo>

      <Campo label="Problema relatado">
        <input className="inp" value={ordemForm.problema_relatado} onChange={(e) => setOrdemForm((v) => ({ ...v, problema_relatado: e.target.value }))} placeholder="Problema informado pelo cliente" />
      </Campo>

      <Campo label="Diagnóstico">
        <input className="inp" value={ordemForm.diagnostico} onChange={(e) => setOrdemForm((v) => ({ ...v, diagnostico: e.target.value }))} placeholder="Diagnóstico inicial" />
      </Campo>

      <Campo label="Dados de abertura e encerramento">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="lbl">KM abertura</label>
            <input className="inp" value={ordemForm.km_abertura} onChange={(e) => setOrdemForm((v) => ({ ...v, km_abertura: e.target.value }))} inputMode="decimal" placeholder="Ex.: 123456" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="lbl">Data abertura</label>
            <input className="inp" type="date" value={ordemForm.data_abertura} onChange={(e) => setOrdemForm((v) => ({ ...v, data_abertura: e.target.value }))} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="lbl">Data encerramento</label>
            <input className="inp" type="date" value={ordemForm.data_encerramento} onChange={(e) => setOrdemForm((v) => ({ ...v, data_encerramento: e.target.value }))} />
          </div>
        </div>
      </Campo>

      <Campo label="Valores">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="lbl">Serviços</label>
            <input className="inp" value={ordemForm.valor_servicos} onChange={(e) => setOrdemForm((v) => ({ ...v, valor_servicos: e.target.value }))} inputMode="decimal" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="lbl">Produtos</label>
            <input className="inp" value={ordemForm.valor_produtos} onChange={(e) => setOrdemForm((v) => ({ ...v, valor_produtos: e.target.value }))} inputMode="decimal" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="lbl">Desconto</label>
            <input className="inp" value={ordemForm.valor_desconto} onChange={(e) => setOrdemForm((v) => ({ ...v, valor_desconto: e.target.value }))} inputMode="decimal" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="lbl">Total</label>
            <input className="inp" value={ordemForm.valor_total} onChange={(e) => setOrdemForm((v) => ({ ...v, valor_total: e.target.value }))} inputMode="decimal" />
          </div>
        </div>
      </Campo>

      <Campo label="Status">
        <select className="inp" value={ordemForm.status} onChange={(e) => setOrdemForm((v) => ({ ...v, status: e.target.value }))}>
          <option value="Aberta">Aberta</option>
          <option value="Em Execução">Em Execução</option>
          <option value="Fechada">Fechada</option>
          <option value="Cancelada">Cancelada</option>
        </select>
      </Campo>

      <button
        className="btnMain"
        disabled={carregando || !ordemForm.descricao.trim()}
        onClick={() =>
          criarOperacao('ordens', {
            ...limparPayload(ordemForm),
            cliente_id: ordemForm.cliente_id ? Number(ordemForm.cliente_id) : null,
            ativo_id: ordemForm.ativo_id ? Number(ordemForm.ativo_id) : null,
            agendamento_id: ordemForm.agendamento_id ? Number(ordemForm.agendamento_id) : null,
            orcamento_id: ordemForm.orcamento_id ? Number(ordemForm.orcamento_id) : null,
            km_abertura: ordemForm.km_abertura ? numeroDecimalBr(ordemForm.km_abertura) : null,
            data_abertura: ordemForm.data_abertura || null,
            data_encerramento: ordemForm.data_encerramento || null,
            valor_servicos: numeroDecimalBr(ordemForm.valor_servicos),
            valor_produtos: numeroDecimalBr(ordemForm.valor_produtos),
            valor_desconto: numeroDecimalBr(ordemForm.valor_desconto),
            valor_total: numeroDecimalBr(ordemForm.valor_total),
            ativo: 1,
          })
        }
      >
        Salvar ordem de serviço
      </button>
    </div>
  );
}

function TabelaClientes({ dados }: { dados: Cliente[] }) {
  return (
    <Table
      heads={['ID', 'Nome', 'Tipo', 'Documento', 'Telefone', 'E-mail', 'Status']}
      rows={dados.map((item) => [
        String(item.id),
        item.nome,
        item.tipo,
        item.documento || '-',
        item.telefone || '-',
        item.email || '-',
        item.ativo ? 'Ativo' : 'Inativo',
      ])}
    />
  );
}

function TabelaAtivos({ dados, clientes }: { dados: Ativo[]; clientes: Cliente[] }) {
  return (
    <Table
      heads={['ID', 'Descrição', 'Tipo', 'Cliente', 'Identificação', 'Marca/Modelo', 'Status']}
      rows={dados.map((item) => {
        const cliente = clientes.find((c) => c.id === item.cliente_id);
        return [
          String(item.id),
          item.descricao,
          item.tipo,
          cliente?.nome || '-',
          item.identificacao || '-',
          [item.marca, item.modelo].filter(Boolean).join(' / ') || '-',
          item.status || (item.ativo ? 'Ativo' : 'Inativo'),
        ];
      })}
    />
  );
}

function TabelaProdutos({ dados }: { dados: Produto[] }) {
  return (
    <Table
      heads={['ID', 'Nome', 'Un.', 'Estoque', 'Mínimo', 'Preço', 'Status']}
      rows={dados.map((item) => [
        String(item.id),
        item.nome,
        item.unidade,
        String(item.estoque_atual),
        String(item.estoque_minimo),
        moeda(item.preco_venda),
        item.estoque_atual <= item.estoque_minimo ? 'Mínimo' : 'OK',
      ])}
    />
  );
}

function TabelaServicos({ dados }: { dados: Servico[] }) {
  return (
    <Table
      heads={['ID', 'Nome', 'Descrição', 'Preço base', 'Status']}
      rows={dados.map((item) => [
        String(item.id),
        item.nome,
        item.descricao || '-',
        moeda(item.preco_base),
        item.ativo ? 'Ativo' : 'Inativo',
      ])}
    />
  );
}

function TabelaAgendamentos({ dados, clientes, ativos }: { dados: Agendamento[]; clientes: Cliente[]; ativos: Ativo[] }) {
  return (
    <Table
      heads={['ID', 'Data', 'Hora', 'Descrição', 'Cliente', 'Ativo', 'Status']}
      rows={dados.map((item) => {
        const cliente = clientes.find((c) => c.id === item.cliente_id);
        const ativo = ativos.find((a) => a.id === item.ativo_id);
        return [
          String(item.id),
          formatarData(item.data_agendamento),
          item.hora_agendamento || '-',
          item.descricao,
          cliente?.nome || '-',
          ativo?.descricao || '-',
          item.status || '-',
        ];
      })}
    />
  );
}

function TabelaOrcamentos({ dados, clientes, ativos }: { dados: Orcamento[]; clientes: Cliente[]; ativos: Ativo[] }) {
  return (
    <Table
      heads={['ID', 'Número', 'Descrição', 'Cliente', 'Ativo', 'Total', 'Status']}
      rows={dados.map((item) => {
        const cliente = clientes.find((c) => c.id === item.cliente_id);
        const ativo = ativos.find((a) => a.id === item.ativo_id);
        return [
          String(item.id),
          item.numero || '-',
          item.descricao,
          cliente?.nome || '-',
          ativo?.descricao || '-',
          moeda(item.valor_total),
          item.status || '-',
        ];
      })}
    />
  );
}


type ImpressaoOsEntrada = {
  token: string;
  ordem: any;
  cliente?: any | null;
  ativo?: any | null;
  agenda?: any | null;
  orcamento?: any | null;
  produtos?: any[] | null;
  empresa?: any | null;
};

async function imprimirOsSelecionada({ token, ordem, cliente, ativo, agenda, orcamento, produtos = [] }: ImpressaoOsEntrada) {
  const ordemId = String(ordem?.id || '');

  const [itensServicos, itensProdutos, empresa] = await Promise.all([
    carregarListaImpressaoOs(token, 'ordens-servico-itens-servicos'),
    carregarListaImpressaoOs(token, 'ordens-servico-itens-produtos'),
    carregarEmpresaEmitenteImpressaoOs(token),
  ]);

  const dadosImpressao = {
    ordem,
    cliente,
    ativo,
    agenda,
    orcamento,
    empresa,
    itensServicos: itensServicos.filter((item: any) => String(item.ordem_servico_id || '') === ordemId && Number(item.ativo ?? 1) !== 0),
    itensProdutos: itensProdutos
      .filter((item: any) => String(item.ordem_servico_id || '') === ordemId && Number(item.ativo ?? 1) !== 0)
      .map((item: any) => enriquecerProdutoImpressaoOs(item, produtos)),
  };

  const html = montarHtmlImpressaoOs(dadosImpressao);
  const janela = window.open('', '_blank', 'width=1040,height=760');

  if (!janela) {
    return;
  }

  janela.document.open();
  janela.document.write(html);
  janela.document.close();
}


async function carregarEmpresaEmitenteImpressaoOs(token: string) {
  try {
    const resposta = await fetch(`${API_BASE}/configuracoes/empresa`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resposta.ok) return null;

    const json = await resposta.json();
    return json?.dados ?? null;
  } catch {
    return null;
  }
}

async function carregarListaImpressaoOs(token: string, endpoint: string) {
  try {
    const resposta = await fetch(`${API_BASE}/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resposta.ok) return [];

    const json = await resposta.json();
    return Array.isArray(json?.dados) ? json.dados : [];
  } catch {
    return [];
  }
}


function enriquecerProdutoImpressaoOs(item: any, produtos: any[] | null | undefined) {
  const lista = Array.isArray(produtos) ? produtos : [];
  const produtoId = item?.produto_id ?? item?.produtoId ?? item?.id_produto ?? item?.cod_produto;
  const produto = lista.find((p: any) => String(p.id) === String(produtoId));

  const descricao =
    item?.produto_descricao ||
    item?.produto_nome ||
    item?.produto ||
    item?.descricao_produto ||
    item?.descricao ||
    produto?.descricao ||
    produto?.nome ||
    produto?.produto ||
    (produtoId ? `Produto #${produtoId}` : '-');

  return {
    ...item,
    produto_descricao: descricao,
  };
}

function montarHtmlImpressaoOs({
  ordem,
  cliente,
  ativo,
  agenda,
  orcamento,
  empresa,
  itensServicos,
  itensProdutos,
}: {
  ordem: any;
  cliente?: any | null;
  ativo?: any | null;
  agenda?: any | null;
  orcamento?: any | null;
  empresa?: any | null;
  itensServicos: any[];
  itensProdutos: any[];
}) {
  const numeroOs = textoPrintOs(ordem?.numero, `OS-${ordem?.id || ''}`);
  const statusOs = textoPrintOs(ordem?.status, 'Aberta');
  const descricaoOs = textoPrintOs(ordem?.descricao || ordem?.problema_relatado, 'Sem descrição informada');
  const clienteNome = valorCampoPrintOs(cliente, ['nome', 'razao_social', 'nome_fantasia'], 'Cliente não vinculado');
  const clienteDocumento = valorCampoPrintOs(cliente, ['documento', 'cpf_cnpj', 'cpf', 'cnpj', 'identificacao_fiscal'], 'Não informado');
  const clienteTelefone = valorCampoPrintOs(cliente, ['telefone', 'celular', 'whatsapp', 'fone'], 'Não informado');
  const clienteEmail = valorCampoPrintOs(cliente, ['email'], 'Não informado');

  const ativoDescricao = valorCampoPrintOs(ativo, ['descricao', 'nome', 'placa', 'identificacao'], 'Ativo não vinculado');
  const ativoIdentificacao = valorCampoPrintOs(ativo, ['identificacao', 'placa', 'serie', 'chassi'], 'Não informado');
  const ativoMarcaModelo = [
    valorCampoPrintOs(ativo, ['marca'], ''),
    valorCampoPrintOs(ativo, ['modelo'], ''),
    valorCampoPrintOs(ativo, ['ano', 'ano_modelo', 'ano_fabricacao'], ''),
  ].filter(Boolean).join(' / ') || 'Não informado';

  const agendaDescricao = agenda
    ? `${textoPrintOs(agenda.data_agendamento, 'Sem data')}${agenda.hora_agendamento ? ` ${agenda.hora_agendamento}` : ''} · ${textoPrintOs(agenda.descricao, '-')}`
    : 'Sem agenda vinculada';

  const orcamentoDescricao = orcamento
    ? `${textoPrintOs(orcamento.numero, `ORC-${orcamento.id}`)} · ${textoPrintOs(orcamento.status, 'Sem status')} · ${moedaPrintOs(orcamento.valor_total)}`
    : 'Sem orçamento vinculado';

  const nomeEmpresa = textoPrintOs(empresa?.nome_fantasia || empresa?.razao_social, 'Empresa emissora');
  const razaoSocial = textoPrintOs(empresa?.razao_social, nomeEmpresa);
  const cnpjEmpresa = textoPrintOs(empresa?.cnpj, '-');
  const inscricaoEstadual = textoPrintOs(empresa?.inscricao_estadual, '-');
  const inscricaoMunicipal = textoPrintOs(empresa?.inscricao_municipal, '-');
  const enderecoEmitente = enderecoEmpresaPrintOs(empresa);
  const contatoEmitente = blocoContatoEmpresaPrintOs(empresa);

  const linhasServicos = linhasTabelaPrintOs(
    itensServicos,
    ['descricao', 'quantidade', 'valor_unitario', 'valor_total'],
    ['Serviço', 'Qtd', 'Unitário', 'Total'],
    ['texto', 'numero', 'moeda', 'moeda'],
    4,
  );

  const linhasProdutos = linhasTabelaPrintOs(
    itensProdutos,
    ['descricao', 'quantidade', 'valor_unitario', 'valor_total'],
    ['Produto / peça', 'Qtd', 'Unitário', 'Total'],
    ['texto', 'numero', 'moeda', 'moeda'],
    4,
  );

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Ordem de Serviço ${escaparPrintOs(numeroOs)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 10mm 11mm 9mm 11mm;
      color: #111827;
      background: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5px;
    }
    .pagina { max-width: 980px; margin: 0 auto; }
    .topo {
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: 12px;
      align-items: start;
      border-bottom: 2px solid #111827;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .empresa h1 {
      margin: 0 0 4px;
      font-size: 20px;
      letter-spacing: -0.03em;
    }
    .empresa p { margin: 2px 0; color: #374151; }
    .meta {
      border: 1px solid #d1d5db;
      border-radius: 10px;
      padding: 10px;
      text-align: right;
      background: #f9fafb;
    }
    .meta .titulo {
      text-transform: uppercase;
      color: #374151;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .08em;
    }
    .meta .numero {
      font-size: 22px;
      font-weight: 900;
      color: #111827;
      margin: 3px 0;
    }
    .status {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      background: #dbeafe;
      color: #1d4ed8;
      font-weight: 800;
      font-size: 9px;
    }
    .duas-colunas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }
    .box {
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 8px;
      break-inside: avoid;
    }
    h2 {
      margin: 0 0 7px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #1f2937;
    }
    .grid2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .campo {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 5px 6px;
      background: #fff;
    }
    .label {
      color: #6b7280;
      font-size: 8.5px;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: .05em;
      margin-bottom: 2px;
    }
    .valor {
      color: #111827;
      font-weight: 700;
      min-height: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    th {
      background: #f3f4f6;
      color: #374151;
      padding: 6px;
      border: 1px solid #e5e7eb;
      text-align: left;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    td {
      padding: 5px 6px;
      border: 1px solid #e5e7eb;
      vertical-align: top;
      font-size: 10px;
    }
    .num { text-align: right; white-space: nowrap; }
    .vazio {
      color: #6b7280;
      text-align: center;
      font-style: italic;
    }
    .resumo-final {
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: 12px;
      align-items: start;
      margin-top: 6px;
      break-inside: avoid;
    }
    .totais {
      border: 1px solid #d1d5db;
      border-radius: 8px;
      overflow: hidden;
      font-size: 10px;
    }
    .totais .linha {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 6px 8px;
      border-bottom: 1px solid #e5e7eb;
      background: #fff;
    }
    .totais .linha:nth-child(odd) { background: #f9fafb; }
    .totais .linha:last-child { border-bottom: 0; }
    .totais .final {
      font-size: 14px;
      font-weight: 900;
      background: #f3f4f6 !important;
    }
    .assinaturas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 45px;
      margin-top: 28px;
      break-inside: avoid;
    }
    .assinatura {
      border-top: 1px solid #111827;
      text-align: center;
      padding-top: 5px;
      color: #374151;
      font-size: 9.5px;
    }
    .rodape {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 8.8px;
      text-align: center;
      break-inside: avoid;
    }
    @media print {
      body { padding: 10mm 11mm 9mm 11mm; }
      .pagina { max-width: none; }
      .box { break-inside: avoid; }
      tr { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="pagina">
    <section class="topo">
      <div class="empresa">
        <h1>${escaparPrintOs(nomeEmpresa)}</h1>
        <p class="razao">${escaparPrintOs(razaoSocial)}</p>
        <p>CNPJ: ${escaparPrintOs(cnpjEmpresa)} | IE: ${escaparPrintOs(inscricaoEstadual)} | IM: ${escaparPrintOs(inscricaoMunicipal)}</p>
        <p>${escaparPrintOs(enderecoEmitente)}</p>
        <p>${escaparPrintOs(contatoEmitente)}</p>
      </div>

      <div class="meta">
        <div class="titulo">Ordem de Serviço</div>
        <div class="numero">${escaparPrintOs(numeroOs)}</div>
        <p><span class="status">${escaparPrintOs(statusOs)}</span></p>
        <p>Emissão: <strong>${escaparPrintOs(new Date().toLocaleDateString('pt-BR'))}</strong></p>
      </div>
    </section>

    <section class="duas-colunas">
      <div class="box">
        <h2>Cliente / proprietário</h2>
        <div class="grid2">
          <div class="campo"><div class="label">Nome</div><div class="valor">${escaparPrintOs(clienteNome)}</div></div>
          <div class="campo"><div class="label">CPF/CNPJ</div><div class="valor">${escaparPrintOs(clienteDocumento)}</div></div>
          <div class="campo"><div class="label">Telefone / WhatsApp</div><div class="valor">${escaparPrintOs(clienteTelefone)}</div></div>
          <div class="campo"><div class="label">E-mail</div><div class="valor">${escaparPrintOs(clienteEmail)}</div></div>
        </div>
      </div>

      <div class="box">
        <h2>Ativo / veículo / equipamento</h2>
        <div class="grid2">
          <div class="campo"><div class="label">Descrição</div><div class="valor">${escaparPrintOs(ativoDescricao)}</div></div>
          <div class="campo"><div class="label">Identificação</div><div class="valor">${escaparPrintOs(ativoIdentificacao)}</div></div>
          <div class="campo" style="grid-column: 1 / -1;"><div class="label">Marca / modelo / ano</div><div class="valor">${escaparPrintOs(ativoMarcaModelo)}</div></div>
        </div>
      </div>
    </section>

    <section class="box">
      <h2>Dados da OS</h2>
      <div class="grid2">
        <div class="campo"><div class="label">Descrição</div><div class="valor">${escaparPrintOs(descricaoOs)}</div></div>
        <div class="campo"><div class="label">Problema relatado</div><div class="valor">${escaparPrintOs(textoPrintOs(ordem?.problema_relatado, '-'))}</div></div>
        <div class="campo"><div class="label">Diagnóstico</div><div class="valor">${escaparPrintOs(textoPrintOs(ordem?.diagnostico, '-'))}</div></div>
        <div class="campo"><div class="label">Data abertura</div><div class="valor">${escaparPrintOs(formatarDataOs(ordem?.data_abertura))}</div></div>
        <div class="campo"><div class="label">KM abertura</div><div class="valor">${escaparPrintOs(formatarKmOs(ordem?.km_abertura))}</div></div>
        <div class="campo"><div class="label">Agenda vinculada</div><div class="valor">${escaparPrintOs(agendaDescricao)}</div></div>
        <div class="campo"><div class="label">Orçamento vinculado</div><div class="valor">${escaparPrintOs(orcamentoDescricao)}</div></div>
      </div>
    </section>

    <section class="box">
      <h2>Serviços da OS</h2>
      <table>
        <thead>${cabecalhoTabelaPrintOs(['Serviço', 'Qtd', 'Unitário', 'Total'], [false, true, true, true])}</thead>
        <tbody>${linhasServicos}</tbody>
      </table>
    </section>

    <section class="box">
      <h2>Produtos / peças da OS</h2>
      <table>
        <thead>${cabecalhoTabelaPrintOs(['Produto / peça', 'Qtd', 'Unitário', 'Total'], [false, true, true, true])}</thead>
        <tbody>${linhasProdutos}</tbody>
      </table>
    </section>

    <section class="resumo-final">
      <div class="box" style="margin: 0;">
        <h2>Observações</h2>
        <p>Documento gerado a partir da Central da Ordem de Serviço. Este documento apresenta os serviços e peças/produtos vinculados à OS.</p>
      </div>

      <div class="totais">
        <div class="linha"><span>Serviços</span><strong>${moedaPrintOs(ordem?.valor_servicos)}</strong></div>
        <div class="linha"><span>Produtos / peças</span><strong>${moedaPrintOs(ordem?.valor_produtos)}</strong></div>
        <div class="linha"><span>Desconto</span><strong>${moedaPrintOs(ordem?.valor_desconto)}</strong></div>
        <div class="linha final"><span>Total</span><strong>${moedaPrintOs(ordem?.valor_total)}</strong></div>
      </div>
    </section>

    <section class="assinaturas">
      <div class="assinatura">${escaparPrintOs(nomeEmpresa)}</div>
      <div class="assinatura">${escaparPrintOs(clienteNome)}</div>
    </section>

    <footer class="rodape">
      Documento emitido por ${escaparPrintOs(nomeEmpresa)} via ServiçoPro ERP em ${escaparPrintOs(new Date().toLocaleString('pt-BR'))}.
    </footer>
  </div>

  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`;
}

function linhasTabelaPrintOs(itens: any[], campos: string[], _cabecalhos: string[], tipos: string[], colSpan: number) {
  if (!itens.length) {
    return `<tr><td class="vazio" colspan="${colSpan}">Nenhum registro encontrado.</td></tr>`;
  }

  return itens.map((item) => {
    const tds = campos.map((campo, index) => {
      const tipo = tipos[index];
      const bruto = valorCampoPrintOs(item, [campo], '-');
      const valor = tipo === 'moeda'
        ? moedaPrintOs(bruto)
        : tipo === 'numero'
          ? textoPrintOs(bruto, '0')
          : textoPrintOs(bruto, '-');

      return `<td class="${tipo === 'moeda' || tipo === 'numero' ? 'num' : ''}">${escaparPrintOs(valor)}</td>`;
    }).join('');

    return `<tr>${tds}</tr>`;
  }).join('');
}

function cabecalhoTabelaPrintOs(cabecalhos: string[], numericos: boolean[]) {
  return `<tr>${cabecalhos.map((cabecalho, index) => `<th class="${numericos[index] ? 'num' : ''}">${escaparPrintOs(cabecalho)}</th>`).join('')}</tr>`;
}


function enderecoEmpresaPrintOs(empresa: any | null | undefined) {
  if (!empresa) return '';

  return [
    empresa.endereco,
    empresa.numero ? `nº ${empresa.numero}` : '',
    empresa.complemento,
    empresa.bairro,
    empresa.cidade && empresa.uf ? `${empresa.cidade}/${empresa.uf}` : empresa.cidade || empresa.uf,
    empresa.cep ? `CEP ${empresa.cep}` : '',
  ]
    .filter((item) => item && String(item).trim())
    .join(' - ');
}

function blocoContatoEmpresaPrintOs(empresa: any | null | undefined) {
  if (!empresa) return '';

  return [
    empresa.telefone ? `Tel.: ${empresa.telefone}` : '',
    empresa.whatsapp ? `WhatsApp: ${empresa.whatsapp}` : '',
    empresa.email ? `E-mail: ${empresa.email}` : '',
    empresa.site ? `Site: ${empresa.site}` : '',
  ]
    .filter((item) => item && String(item).trim())
    .join(' | ');
}

function valorCampoPrintOs(objeto: any, campos: string[], padrao = '-') {
  if (!objeto) return padrao;

  for (const campo of campos) {
    const valor = objeto?.[campo];

    if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
      return String(valor);
    }
  }

  return padrao;
}

function textoPrintOs(valor: unknown, padrao = '-') {
  if (valor === undefined || valor === null || String(valor).trim() === '') return padrao;
  return String(valor);
}

function moedaPrintOs(valor: unknown) {
  const numeroValor = Number(valor || 0);

  return numeroValor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function escaparPrintOs(valor: unknown) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}




function normalizarTextoFiltroOs(valor: unknown) {
  return String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function dataFiltroOs(valor: unknown) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return '';

  const texto = String(valor).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    return texto.slice(0, 10);
  }

  if (/^\d{2}\/\d{2}\/\d{4}/.test(texto)) {
    const [dia, mes, ano] = texto.slice(0, 10).split('/');
    return `${ano}-${mes}-${dia}`;
  }

  const data = new Date(texto);
  if (!Number.isNaN(data.getTime())) {
    return data.toISOString().slice(0, 10);
  }

  return '';
}

function statusFiltroOs(status: unknown) {
  const texto = normalizarTextoFiltroOs(status || 'Aberta');

  if (texto.includes('cancel')) return 'canceladas';
  if (texto.includes('encer') || texto.includes('fech')) return 'encerradas';
  if (texto.includes('aprov')) return 'aprovadas';
  if (texto.includes('abert')) return 'abertas';

  return texto || 'sem-status';
}


type ColunaOrdenacaoOs =
  | 'numero'
  | 'descricao'
  | 'cliente'
  | 'ativo'
  | 'placa'
  | 'data_abertura'
  | 'km_abertura'
  | 'valor_total'
  | 'status';

function valorOrdenacaoOs(
  ordem: OrdemServico,
  clientes: Cliente[],
  ativos: Ativo[],
  coluna: ColunaOrdenacaoOs
) {
  const cliente = clientes.find((item) => Number(item.id) === Number(ordem.cliente_id));
  const ativo = ativos.find((item) => Number(item.id) === Number(ordem.ativo_id));

  if (coluna === 'numero') return normalizarTextoFiltroOs(ordem.numero || `OS-${ordem.id}`);
  if (coluna === 'descricao') return normalizarTextoFiltroOs(ordem.descricao || ordem.problema_relatado || '');
  if (coluna === 'cliente') return normalizarTextoFiltroOs(cliente?.nome || '');
  if (coluna === 'ativo') return normalizarTextoFiltroOs(ativo?.descricao || '');
  if (coluna === 'placa') return normalizarTextoFiltroOs(ativo?.identificacao || '');
  if (coluna === 'data_abertura') return dataFiltroOs(ordem.data_abertura);
  if (coluna === 'km_abertura') return numeroDecimalBr(ordem.km_abertura || 0);
  if (coluna === 'valor_total') return Number(ordem.valor_total || 0);
  if (coluna === 'status') return normalizarTextoFiltroOs(ordem.status || '');

  return '';
}

function ordenarListaOs(
  ordens: OrdemServico[],
  clientes: Cliente[],
  ativos: Ativo[],
  ordemGrid: {
    coluna: ColunaOrdenacaoOs;
    direcao: 'asc' | 'desc';
  }
) {
  const multiplicador = ordemGrid.direcao === 'asc' ? 1 : -1;

  return [...ordens].sort((a, b) => {
    const valorA = valorOrdenacaoOs(a, clientes, ativos, ordemGrid.coluna);
    const valorB = valorOrdenacaoOs(b, clientes, ativos, ordemGrid.coluna);

    if (typeof valorA === 'number' || typeof valorB === 'number') {
      return ((Number(valorA) || 0) - (Number(valorB) || 0)) * multiplicador;
    }

    return String(valorA).localeCompare(String(valorB), 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    }) * multiplicador;
  });
}


function aplicarFiltrosListaOs(
  ordens: OrdemServico[],
  clientes: Cliente[],
  ativos: Ativo[],
  buscaGlobal: string,
  filtros: {
    dataInicial: string;
    dataFinal: string;
    cliente: string;
    ativo: string;
    descricao: string;
    status: string;
  }
) {
  const busca = normalizarTextoFiltroOs(buscaGlobal);
  const clienteFiltro = normalizarTextoFiltroOs(filtros.cliente);
  const ativoFiltro = normalizarTextoFiltroOs(filtros.ativo);
  const descricaoFiltro = normalizarTextoFiltroOs(filtros.descricao);
  const statusSelecionado = filtros.status || 'todas';

  return ordens.filter((ordem) => {
    const cliente = clientes.find((item) => Number(item.id) === Number(ordem.cliente_id));
    const ativo = ativos.find((item) => Number(item.id) === Number(ordem.ativo_id));

    const dataAbertura = dataFiltroOs(ordem.data_abertura);
    const descricaoOs = normalizarTextoFiltroOs(`${ordem.numero || `OS-${ordem.id}`} ${ordem.descricao || ''} ${ordem.problema_relatado || ''}`);
    const nomeCliente = normalizarTextoFiltroOs(cliente?.nome || '');
    const textoAtivo = normalizarTextoFiltroOs(`${ativo?.descricao || ''} ${ativo?.identificacao || ''} ${ativo?.marca || ''} ${ativo?.modelo || ''}`);
    const statusOs = statusFiltroOs(ordem.status);

    const textoGeral = normalizarTextoFiltroOs([
      ordem.numero || `OS-${ordem.id}`,
      ordem.descricao,
      ordem.problema_relatado,
      ordem.diagnostico,
      ordem.status,
      ordem.data_abertura,
      ordem.km_abertura,
      ordem.valor_total,
      cliente?.nome,
      cliente?.documento,
      cliente?.telefone,
      cliente?.email,
      ativo?.descricao,
      ativo?.identificacao,
      ativo?.marca,
      ativo?.modelo,
      ativo?.ano,
    ].join(' '));

    if (busca && !textoGeral.includes(busca)) return false;

    if (filtros.dataInicial && (!dataAbertura || dataAbertura < filtros.dataInicial)) return false;
    if (filtros.dataFinal && (!dataAbertura || dataAbertura > filtros.dataFinal)) return false;

    if (clienteFiltro && !nomeCliente.includes(clienteFiltro)) return false;
    if (ativoFiltro && !textoAtivo.includes(ativoFiltro)) return false;
    if (descricaoFiltro && !descricaoOs.includes(descricaoFiltro)) return false;

    if (statusSelecionado !== 'todas' && statusOs !== statusSelecionado) return false;

    return true;
  });
}


function formatarDataOs(valor: unknown) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return '-';

  const textoValor = String(valor).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(textoValor)) {
    const [ano, mes, dia] = textoValor.slice(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }

  const data = new Date(textoValor);
  if (!Number.isNaN(data.getTime())) {
    return data.toLocaleDateString('pt-BR');
  }

  return textoValor;
}

function formatarKmOs(valor: unknown) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return '-';

  const numero = Number(String(valor).replace(/\./g, '').replace(',', '.'));

  if (!Number.isFinite(numero)) return String(valor);

  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}


function FiltrosListaOrdens({
  filtros,
  setFiltros,
  totalFiltrado,
  totalGeral,
}: {
  filtros: {
    dataInicial: string;
    dataFinal: string;
    cliente: string;
    ativo: string;
    descricao: string;
    status: string;
  };
  setFiltros: React.Dispatch<React.SetStateAction<{
    dataInicial: string;
    dataFinal: string;
    cliente: string;
    ativo: string;
    descricao: string;
    status: string;
  }>>;
  totalFiltrado: number;
  totalGeral: number;
}) {
  function atualizar(campo: keyof typeof filtros, valor: string) {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
  }

  function limpar() {
    setFiltros({
      dataInicial: '',
      dataFinal: '',
      cliente: '',
      ativo: '',
      descricao: '',
      status: 'todas',
    });
  }

  const algumFiltro =
    filtros.dataInicial ||
    filtros.dataFinal ||
    filtros.cliente ||
    filtros.ativo ||
    filtros.descricao ||
    filtros.status !== 'todas';

  return (
    <div className="os-filtros-card">
      <div className="os-filtros-head">
        <div>
          <strong>Filtros da OS</strong>
          <span>
            Exibindo {totalFiltrado} de {totalGeral} ordens
          </span>
        </div>
        <button className="btn bo bsm" type="button" onClick={limpar} disabled={!algumFiltro}>
          Limpar filtros
        </button>
      </div>

      <div className="os-filtros-grid">
        <Campo label="Data inicial">
          <input
            className="inp"
            type="date"
            value={filtros.dataInicial}
            onChange={(event) => atualizar('dataInicial', event.target.value)}
          />
        </Campo>

        <Campo label="Data final">
          <input
            className="inp"
            type="date"
            value={filtros.dataFinal}
            onChange={(event) => atualizar('dataFinal', event.target.value)}
          />
        </Campo>

        <Campo label="Cliente">
          <input
            className="inp"
            value={filtros.cliente}
            onChange={(event) => atualizar('cliente', event.target.value)}
            placeholder="Nome do cliente"
          />
        </Campo>

        <Campo label="Placa / ativo">
          <input
            className="inp"
            value={filtros.ativo}
            onChange={(event) => atualizar('ativo', event.target.value)}
            placeholder="Placa, identificação ou veículo"
          />
        </Campo>

        <Campo label="Descrição da OS">
          <input
            className="inp"
            value={filtros.descricao}
            onChange={(event) => atualizar('descricao', event.target.value)}
            placeholder="Descrição, problema ou número"
          />
        </Campo>

        <Campo label="Status">
          <select className="inp" value={filtros.status} onChange={(event) => atualizar('status', event.target.value)}>
            <option value="todas">Todas</option>
            <option value="abertas">Abertas</option>
            <option value="encerradas">Encerradas/Fechadas</option>
            <option value="canceladas">Canceladas</option>
            <option value="aprovadas">Aprovadas</option>
          </select>
        </Campo>
      </div>
    </div>
  );
}


function TabelaOrdens({
  dados,
  clientes,
  ativos,
  onSelecionar,
  onImprimir,
  onEditar,
  ordemSelecionadaId,
  ordemGrid,
  onOrdenar,
}: {
  dados: OrdemServico[];
  clientes: Cliente[];
  ativos: Ativo[];
  onSelecionar?: (ordem: OrdemServico) => void;
  onImprimir?: (ordem: OrdemServico) => void;
  onEditar?: (ordem: OrdemServico) => void;
  ordemSelecionadaId?: string;
  ordemGrid?: {
    coluna: ColunaOrdenacaoOs;
    direcao: 'asc' | 'desc';
  };
  onOrdenar?: (coluna: ColunaOrdenacaoOs) => void;
}) {
  const mostrarAcoes = Boolean(onSelecionar || onImprimir || onEditar);

  function thOrdenavel(coluna: ColunaOrdenacaoOs, label: string) {
    const ativa = ordemGrid?.coluna === coluna;
    const seta = ativa ? (ordemGrid?.direcao === 'asc' ? ' ↑' : ' ↓') : '';

    return (
      <th>
        <button
          className={`os-th-sort ${ativa ? 'ativo' : ''}`}
          type="button"
          onClick={() => onOrdenar?.(coluna)}
          title={`Ordenar por ${label}`}
        >
          {label}{seta}
        </button>
      </th>
    );
  }

  if (dados.length === 0) {
    return (
      <div className="ins">
        <strong>Nenhuma OS encontrada.</strong> Ajuste o filtro ou use o fluxo recomendado do módulo.
      </div>
    );
  }

  return (
    <div className="tw">
      <table>
        <thead>
          <tr>
            {thOrdenavel('numero', 'OS')}
            {thOrdenavel('descricao', 'Descrição')}
            {thOrdenavel('cliente', 'Cliente')}
            {thOrdenavel('ativo', 'Ativo')}
            {thOrdenavel('placa', 'Placa')}
            {thOrdenavel('data_abertura', 'Data abertura')}
            {thOrdenavel('km_abertura', 'KM abertura')}
            {thOrdenavel('valor_total', 'Total')}
            {thOrdenavel('status', 'Status')}
            {mostrarAcoes && <th>Ação</th>}
          </tr>
        </thead>
        <tbody>
          {dados.map((item) => {
            const cliente = clientes.find((c) => Number(c.id) === Number(item.cliente_id));
            const ativo = ativos.find((a) => Number(a.id) === Number(item.ativo_id));
            const selecionada = ordemSelecionadaId ? String(item.id) === String(ordemSelecionadaId) : false;

            return (
              <tr
                key={item.id}
                onClick={onSelecionar ? () => onSelecionar(item) : undefined}
                title={onSelecionar ? 'Clique para abrir o detalhe da OS' : undefined}
                style={{
                  cursor: onSelecionar ? 'pointer' : undefined,
                  background: selecionada ? 'rgba(79, 124, 255, 0.12)' : undefined,
                }}
              >
                <td>{item.numero || `OS-${item.id}`}</td>
                <td>{item.descricao || item.problema_relatado || '-'}</td>
                <td>{cliente?.nome || '-'}</td>
                <td>{ativo?.descricao || '-'}</td>
                <td>{ativo?.identificacao || '-'}</td>
                <td>{formatarDataOs(item.data_abertura)}</td>
                <td>{formatarKmOs(item.km_abertura)}</td>
                <td>{moeda(item.valor_total)}</td>
                <td>
                  <span className={`badge ${badgeClass(item.status || '-')}`}>{item.status || '-'}</span>
                </td>
                {mostrarAcoes && (
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {onSelecionar && (
                        <button
                          className="btn ba bsm"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelecionar(item);
                          }}
                        >
                          Abrir OS
                        </button>
                      )}

                      {onImprimir && (
                        <button
                          className="btn bo bsm"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onImprimir(item);
                          }}
                        >
                          Imprimir
                        </button>
                      )}

                      {onEditar && (
                        <button
                          className="btn bo bsm"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditar(item);
                          }}
                          title="Edição completa será habilitada no próximo patch."
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


function Table({
  heads,
  rows,
  onRowClick,
  selectedRowIndex = -1,
}: {
  heads: string[];
  rows: string[][];
  onRowClick?: (rowIndex: number) => void;
  selectedRowIndex?: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="ins">
        <strong>Nenhum registro encontrado.</strong> Ajuste o filtro ou use o fluxo recomendado do módulo.
      </div>
    );
  }

  return (
    <div className="tw">
      <table>
        <thead>
          <tr>
            {heads.map((head) => (
              <th key={head}>{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={onRowClick ? () => onRowClick(rowIndex) : undefined}
              title={onRowClick ? 'Clique para abrir a central da OS' : undefined}
              style={{
                cursor: onRowClick ? 'pointer' : undefined,
                background: selectedRowIndex === rowIndex ? 'rgba(79, 124, 255, 0.12)' : undefined,
              }}
            >
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>
                  {cellIndex === row.length - 1 ? <span className={`badge ${badgeClass(cell)}`}>{cell}</span> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label className="lbl">{label}</label>
      {children}
    </div>
  );
}

function WizardOperacional() {
  return (
    <div className="card">
      <div className="ct">
        <div>
          <h3>Fluxo guiado</h3>
          <p>Base operacional real já disponível para Agenda, Orçamentos e Ordens de Serviço.</p>
        </div>
        <span className="badge bg-b">Operação</span>
      </div>

      <div className="fs">
        {['Cliente', 'Ativo', 'Agenda', 'Orçamento', 'OS'].map((etapa, index) => (
          <div className="fb on" key={etapa}>
            <div className="fb-n">{String(index + 1).padStart(2, '0')}</div>
            <strong>{etapa}</strong>
            <span>{index < 2 ? 'Cadastro real' : 'Operação real'}</span>
          </div>
        ))}
      </div>

      <div className="ins" style={{ marginTop: 14 }}>
        <strong>Validação:</strong> use os menus Agenda, Orçamentos e Ordens de Serviço para testar criação e persistência.
      </div>
    </div>
  );
}

function ModuloEmConstrucao({ pagina }: { pagina: Pagina }) {
  return (
    <div className="card">
      <div className="ct">
        <div>
          <h3>{paginas[pagina]}</h3>
          <p>Módulo preservado para evolução incremental nas próximas fases.</p>
        </div>
        <span className="badge bg-b">Em construção</span>
      </div>

      <div className="ins">
        <strong>Próxima implementação:</strong> conectar este módulo aos endpoints reais da API e
        ao banco do tenant.
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  icon,
  type,
}: {
  label: string;
  value: string;
  hint: string;
  icon: string;
  type: string;
}) {
  return (
    <div className={`card mc mc-${type}`}>
      <div className="mc-ico">{icon}</div>
      <div className="mc-val">{value}</div>
      <div className="mc-lbl">{label}</div>
      <div className="mc-bar">
        <span style={{ width: '70%' }} />
      </div>
      <div className="mc-hint">{hint}</div>
    </div>
  );
}

function TimelineItem({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="ti">
      <div className="td">{n}</div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function SimpleTable({ heads, rows }: { heads: string[]; rows: string[][] }) {
  return <Table heads={heads} rows={rows} />;
}

function isCadastroPagina(pagina: Pagina): pagina is CadastroPagina {
  return pagina === 'clientes' || pagina === 'ativos' || pagina === 'produtos' || pagina === 'servicos';
}

function isOperacaoPagina(pagina: Pagina): pagina is OperacaoPagina {
  return pagina === 'agenda' || pagina === 'orcamentos' || pagina === 'ordens';
}

function endpointOperacao(pagina: OperacaoPagina) {
  if (pagina === 'agenda') return 'agendamentos';
  if (pagina === 'orcamentos') return 'orcamentos';
  return 'ordens-servico';
}

function chaveOperacao(pagina: OperacaoPagina): keyof OperacaoState {
  if (pagina === 'agenda') return 'agendamentos';
  if (pagina === 'orcamentos') return 'orcamentos';
  return 'ordens';
}

function limparPayload<T extends Record<string, string>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).map(([chave, valor]) => [chave, valor.trim() === '' ? null : valor.trim()]),
  );
}

function rotuloOrcamentoParaOs(orcamento: Orcamento) {
  const numero = orcamento.numero || `ORC-${String(orcamento.id).padStart(4, '0')}`;
  const status = orcamento.status || 'Sem status';
  const total = moeda(Number(orcamento.valor_total || 0));

  return `${numero} · ${status} · ${total}`;
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function numeroDecimalBr(valor: string | number | null | undefined) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  if (valor === null || valor === undefined) return 0;

  let texto = String(valor)
    .trim()
    .replace(/R\$/gi, '')
    .replace(/\s/g, '');

  if (!texto) return 0;

  const temVirgula = texto.includes(',');
  const temPonto = texto.includes('.');

  if (temVirgula && temPonto) {
    const ultimaVirgula = texto.lastIndexOf(',');
    const ultimoPonto = texto.lastIndexOf('.');

    if (ultimaVirgula > ultimoPonto) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    } else {
      texto = texto.replace(/,/g, '');
    }
  } else if (temVirgula) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (temPonto) {
    const partes = texto.split('.');
    const ultimaParte = partes[partes.length - 1];

    if (partes.length === 2 && ultimaParte.length <= 2) {
      texto = texto;
    } else {
      texto = texto.replace(/\./g, '');
    }
  }

  const numero = Number(texto);

  if (!Number.isFinite(numero)) return 0;

  return numero;
}

function formatarData(valor: string) {
  if (!valor) return '-';

  const parteData = valor.substring(0, 10);
  const partes = parteData.split('-');

  if (partes.length !== 3) return valor;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function dataHoje() {
  return new Date().toISOString().substring(0, 10);
}

function badgeClass(status: string) {
  const texto = status.toLowerCase();

  if (texto.includes('ativo') || texto.includes('ok') || texto.includes('confirmado') || texto.includes('aprovado')) return 'bg-g';
  if (texto.includes('mínimo') || texto.includes('pendente') || texto.includes('aberto') || texto.includes('agendado') || texto.includes('aberta')) return 'bg-b';
  if (texto.includes('inativo') || texto.includes('crítico') || texto.includes('vencido') || texto.includes('cancel')) return 'bg-r';
  if (texto.includes('execução') || texto.includes('atendimento')) return 'bg-c';

  return 'bg-b';
}

export default App;
