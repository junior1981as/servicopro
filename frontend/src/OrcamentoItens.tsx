import { useEffect, useMemo, useState } from 'react';

type Props = {
  token: string;
  cadastros: {
    clientes: any[];
    ativos: any[];
    produtos: any[];
    servicos: any[];
  };
  orcamentos: Orcamento[];
  busca: string;
  onOrcamentosAtualizados: () => Promise<void>;
};

type ApiLista<T> = {
  status: string;
  total: number;
  dados: T[];
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

type ItemServicoOrcamento = {
  id: number;
  orcamento_id: number;
  servico_id?: number | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  desconto_percentual?: number | null;
  desconto_valor?: number | null;
  valor_liquido?: number | null;
  observacao?: string | null;
  ativo: number;
};

type ItemProdutoOrcamento = {
  id: number;
  orcamento_id: number;
  produto_id?: number | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  desconto_percentual?: number | null;
  desconto_valor?: number | null;
  valor_liquido?: number | null;
  observacao?: string | null;
  ativo: number;
};


type EmpresaEmissora = {
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  site?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  observacao?: string;
  validade_orcamento_dias?: number;
  texto_rodape_orcamento?: string;
  logo_url?: string;
};

type OrdemServicoVinculadaOrcamento = {
  id: number;
  numero?: string | null;
  orcamento_id?: number | null;
  status?: string | null;
  ativo?: number | null;
};

type AbaItens = 'servicos' | 'produtos';

const API_BASE = '/api';

function numero(valor: unknown, padrao = 0): number {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : padrao;

  if (typeof valor === 'string') {
    const limpo = valor.trim();
    if (!limpo) return padrao;

    const normalizado = limpo.includes(',')
      ? limpo.replace(/\./g, '').replace(',', '.')
      : limpo;

    const n = Number(normalizado);
    return Number.isFinite(n) ? n : padrao;
  }

  return padrao;
}

function decimal(valor: unknown): number {
  return numero(valor, 0);
}

function moeda(valor: unknown): string {
  return numero(valor, 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function texto(valor: unknown, padrao = '-'): string {
  if (valor === null || valor === undefined) return padrao;
  const s = String(valor).trim();
  return s.length ? s : padrao;
}

function nomeCadastro(item: any): string {
  return texto(item?.nome ?? item?.descricao, `#${item?.id ?? ''}`);
}

function precoServico(servico: any): number {
  return numero(servico?.preco_base ?? servico?.valor_unitario ?? servico?.valor ?? servico?.preco, 0);
}

function precoProduto(produto: any): number {
  return numero(produto?.preco_venda ?? produto?.valor_unitario ?? produto?.valor ?? produto?.preco, 0);
}


function escaparHtml(valor: unknown): string {
  return texto(valor, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function dataAtualPtBr(): string {
  return new Date().toLocaleDateString('pt-BR');
}

function adicionarDias(data: Date, dias: number): Date {
  const novaData = new Date(data);
  novaData.setDate(novaData.getDate() + dias);
  return novaData;
}

function dataPtBr(data: Date): string {
  return data.toLocaleDateString('pt-BR');
}

function valorCampo(obj: any, nomes: string[], padrao = '-') {
  for (const nome of nomes) {
    const valor = obj?.[nome];
    if (valor !== null && valor !== undefined && String(valor).trim()) return String(valor).trim();
  }

  return padrao;
}

function statusBloqueiaAlteracaoItens(status?: string | null) {
  const valor = String(status ?? '').toLowerCase();
  return valor.includes('encerr') || valor.includes('cancel') || valor.includes('fechad');
}

function statusPermiteAprovarOs(status?: string | null) {
  const valor = String(status ?? '').toLowerCase();
  return Boolean(valor) && !valor.includes('aprov') && !statusBloqueiaAlteracaoItens(valor);
}

function statusOrcamentoFinalizado(status?: string | null) {
  const valor = String(status ?? '').toLowerCase();
  return valor.includes('aprov') || valor.includes('reprov') || valor.includes('cancel');
}

function statusOrcamentoAprovado(status?: string | null) {
  return String(status ?? '').toLowerCase().includes('aprov');
}

function statusOrcamentoReprovado(status?: string | null) {
  return String(status ?? '').toLowerCase().includes('reprov');
}

function statusOrcamentoCancelado(status?: string | null) {
  return String(status ?? '').toLowerCase().includes('cancel');
}

function badgeClasse(status: string) {
  const s = status.toLowerCase();

  if (s.includes('aprov')) return 'bg-g';
  if (s.includes('reprov')) return 'bg-r';
  if (s.includes('cancel')) return 'bg-r';
  if (s.includes('aberto')) return 'bg-b';
  if (s.includes('rascunho')) return 'bg-a';

  return 'bg-c';
}


function LinhaContextoOrcamento({
  label,
  valor,
}: {
  label: string;
  valor: unknown;
}) {
  return (
    <div className="orc-contexto-linha">
      <span>{label}</span>
      <strong>{texto(valor, 'Não informado')}</strong>
    </div>
  );
}

function ResumoValorOrcamento({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: unknown;
  destaque?: boolean;
}) {
  return (
    <div className={destaque ? 'orc-resumo-card orc-resumo-card-total' : 'orc-resumo-card'}>
      <span>{label}</span>
      <strong>{moeda(valor)}</strong>
    </div>
  );
}


type FiltrosOrcamentoLista = {
  tipoData: string;
  dataInicial: string;
  dataFinal: string;
  validadeInicial: string;
  validadeFinal: string;
  aprovacaoInicial: string;
  aprovacaoFinal: string;
  cliente: string;
  placa: string;
  descricao: string;
  status: string;
};

type ColunaOrdenacaoOrcamento =
  | 'numero'
  | 'descricao'
  | 'cliente'
  | 'ativo'
  | 'placa'
  | 'data_orcamento'
  | 'validade'
  | 'data_aprovacao'
  | 'valor_total'
  | 'status';

function normalizarTextoOrcamentoLista(valor: unknown) {
  return String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function dataIsoOrcamentoLista(valor: unknown) {
  if (valor === null || valor === undefined || String(valor).trim() === '') return '';

  const textoData = String(valor).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(textoData)) return textoData.slice(0, 10);

  if (/^\d{2}\/\d{2}\/\d{4}/.test(textoData)) {
    const [dia, mes, ano] = textoData.slice(0, 10).split('/');
    return `${ano}-${mes}-${dia}`;
  }

  const data = new Date(textoData);
  if (!Number.isNaN(data.getTime())) return data.toISOString().slice(0, 10);

  return '';
}

function dataPtBrOrcamentoLista(valor: unknown) {
  const iso = dataIsoOrcamentoLista(valor);
  if (!iso) return '-';

  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function dataBaseOrcamentoLista(orcamento: Orcamento) {
  return dataIsoOrcamentoLista(
    (orcamento as any).criado_em ??
    (orcamento as any).data_orcamento ??
    (orcamento as any).data_cadastro ??
    (orcamento as any).atualizado_em
  );
}

function dataValidadeOrcamentoLista(orcamento: Orcamento, validadeDias: number) {
  const baseIso = dataBaseOrcamentoLista(orcamento);
  if (!baseIso) return '';

  const data = new Date(`${baseIso}T00:00:00`);
  if (Number.isNaN(data.getTime())) return '';

  data.setDate(data.getDate() + Math.max(0, validadeDias || 0));
  return data.toISOString().slice(0, 10);
}

function dataAprovacaoOrcamentoLista(orcamento: Orcamento) {
  const dataAprovacao = dataIsoOrcamentoLista((orcamento as any).data_aprovacao);
  if (dataAprovacao) return dataAprovacao;

  if (statusOrcamentoAprovado(orcamento.status)) {
    return dataIsoOrcamentoLista((orcamento as any).atualizado_em);
  }

  return '';
}

function statusFiltroOrcamentoLista(status: unknown) {
  const textoStatus = normalizarTextoOrcamentoLista(status || 'Aberto');

  if (textoStatus.includes('aprov')) return 'aprovados';
  if (textoStatus.includes('reprov')) return 'reprovados';
  if (textoStatus.includes('cancel')) return 'cancelados';
  if (textoStatus.includes('rascun')) return 'rascunhos';
  if (textoStatus.includes('abert')) return 'abertos';

  return textoStatus || 'sem-status';
}

function aplicarFiltrosOrcamentosLista(
  orcamentos: Orcamento[],
  clientes: any[],
  ativos: any[],
  buscaGlobal: string,
  filtros: FiltrosOrcamentoLista,
  validadeDias: number
) {
  const busca = normalizarTextoOrcamentoLista(buscaGlobal);
  const clienteFiltro = normalizarTextoOrcamentoLista(filtros.cliente);
  const placaFiltro = normalizarTextoOrcamentoLista(filtros.placa);
  const descricaoFiltro = normalizarTextoOrcamentoLista(filtros.descricao);
  const statusSelecionado = filtros.status || 'todos';

  return orcamentos.filter((orcamento) => {
    if (orcamento.ativo === 0) return false;

    const cliente = clientes.find((item) => Number(item.id) === Number(orcamento.cliente_id));
    const ativo = ativos.find((item) => Number(item.id) === Number(orcamento.ativo_id));

    const dataOrcamento = dataBaseOrcamentoLista(orcamento);
    const dataValidade = dataValidadeOrcamentoLista(orcamento, validadeDias);
    const dataAprovacao = dataAprovacaoOrcamentoLista(orcamento);

    const nomeCliente = normalizarTextoOrcamentoLista(nomeCadastro(cliente));
    const textoAtivo = normalizarTextoOrcamentoLista([
      valorCampo(ativo, ['identificacao', 'placa', 'serie', 'chassi'], ''),
      valorCampo(ativo, ['descricao'], ''),
      valorCampo(ativo, ['marca'], ''),
      valorCampo(ativo, ['modelo'], ''),
      valorCampo(ativo, ['ano', 'ano_modelo', 'ano_fabricacao'], ''),
    ].join(' '));
    const textoDescricao = normalizarTextoOrcamentoLista(`${orcamento.numero || `ORC-${orcamento.id}`} ${orcamento.descricao || ''} ${orcamento.observacao || ''}`);
    const statusOrcamento = statusFiltroOrcamentoLista(orcamento.status);

    const textoGeral = normalizarTextoOrcamentoLista([
      orcamento.numero || `ORC-${orcamento.id}`,
      orcamento.descricao,
      orcamento.observacao,
      orcamento.status,
      orcamento.valor_total,
      dataOrcamento,
      dataValidade,
      dataAprovacao,
      nomeCadastro(cliente),
      valorCampo(cliente, ['documento', 'cpf_cnpj', 'cpf', 'cnpj'], ''),
      valorCampo(cliente, ['telefone', 'celular', 'whatsapp'], ''),
      valorCampo(cliente, ['email'], ''),
      textoAtivo,
    ].join(' '));

    if (busca && !textoGeral.includes(busca)) return false;

    const tipoData = filtros.tipoData || 'orcamento';
    const dataSelecionada =
      tipoData === 'validade'
        ? dataValidade
        : tipoData === 'aprovacao'
          ? dataAprovacao
          : dataOrcamento;

    if (filtros.dataInicial && (!dataSelecionada || dataSelecionada < filtros.dataInicial)) return false;
    if (filtros.dataFinal && (!dataSelecionada || dataSelecionada > filtros.dataFinal)) return false;

    if (clienteFiltro && !nomeCliente.includes(clienteFiltro)) return false;
    if (placaFiltro && !textoAtivo.includes(placaFiltro)) return false;
    if (descricaoFiltro && !textoDescricao.includes(descricaoFiltro)) return false;

    if (statusSelecionado !== 'todos' && statusOrcamento !== statusSelecionado) return false;

    return true;
  });
}

function valorOrdenacaoOrcamentoLista(
  orcamento: Orcamento,
  clientes: any[],
  ativos: any[],
  coluna: ColunaOrdenacaoOrcamento,
  validadeDias: number
) {
  const cliente = clientes.find((item) => Number(item.id) === Number(orcamento.cliente_id));
  const ativo = ativos.find((item) => Number(item.id) === Number(orcamento.ativo_id));

  if (coluna === 'numero') return normalizarTextoOrcamentoLista(orcamento.numero || `ORC-${orcamento.id}`);
  if (coluna === 'descricao') return normalizarTextoOrcamentoLista(orcamento.descricao || '');
  if (coluna === 'cliente') return normalizarTextoOrcamentoLista(nomeCadastro(cliente));
  if (coluna === 'ativo') return normalizarTextoOrcamentoLista(nomeCadastro(ativo));
  if (coluna === 'placa') return normalizarTextoOrcamentoLista(valorCampo(ativo, ['identificacao', 'placa', 'serie', 'chassi'], ''));
  if (coluna === 'data_orcamento') return dataBaseOrcamentoLista(orcamento);
  if (coluna === 'validade') return dataValidadeOrcamentoLista(orcamento, validadeDias);
  if (coluna === 'data_aprovacao') return dataAprovacaoOrcamentoLista(orcamento);
  if (coluna === 'valor_total') return numero(orcamento.valor_total, 0);
  if (coluna === 'status') return normalizarTextoOrcamentoLista(orcamento.status);

  return '';
}

function ordenarOrcamentosLista(
  orcamentos: Orcamento[],
  clientes: any[],
  ativos: any[],
  ordemGrid: {
    coluna: ColunaOrdenacaoOrcamento;
    direcao: 'asc' | 'desc';
  },
  validadeDias: number
) {
  const multiplicador = ordemGrid.direcao === 'asc' ? 1 : -1;

  return [...orcamentos].sort((a, b) => {
    const valorA = valorOrdenacaoOrcamentoLista(a, clientes, ativos, ordemGrid.coluna, validadeDias);
    const valorB = valorOrdenacaoOrcamentoLista(b, clientes, ativos, ordemGrid.coluna, validadeDias);

    if (typeof valorA === 'number' || typeof valorB === 'number') {
      return ((Number(valorA) || 0) - (Number(valorB) || 0)) * multiplicador;
    }

    return String(valorA).localeCompare(String(valorB), 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    }) * multiplicador;
  });
}



function FiltrosListaOrcamentos({
  filtros,
  totalFiltrado,
  totalGeral,
  onAlterar,
  onLimpar,
}: {
  filtros: FiltrosOrcamentoLista;
  totalFiltrado: number;
  totalGeral: number;
  onAlterar: (campo: keyof FiltrosOrcamentoLista, valor: string) => void;
  onLimpar: () => void;
}) {
  const algumFiltro =
    filtros.dataInicial ||
    filtros.dataFinal ||
    filtros.cliente ||
    filtros.placa ||
    filtros.descricao ||
    filtros.status !== 'todos' ||
    filtros.tipoData !== 'orcamento';

  return (
    <div className="orc-filtros-card compacto">
      <div className="orc-filtros-head">
        <div>
          <strong>Filtros</strong>
          <span>Exibindo {totalFiltrado} de {totalGeral} orçamentos</span>
        </div>
      </div>

      <div className="orc-filtros-grid compacto">
        <CampoOrcFiltro label="Data por">
          <select className="inp" value={filtros.tipoData || 'orcamento'} onChange={(event) => onAlterar('tipoData', event.target.value)}>
            <option value="orcamento">Data do orçamento</option>
            <option value="validade">Validade do orçamento</option>
            <option value="aprovacao">Data de aprovação</option>
          </select>
        </CampoOrcFiltro>

        <CampoOrcFiltro label="Início">
          <input className="inp" type="date" value={filtros.dataInicial} onChange={(event) => onAlterar('dataInicial', event.target.value)} />
        </CampoOrcFiltro>

        <CampoOrcFiltro label="Fim">
          <input className="inp" type="date" value={filtros.dataFinal} onChange={(event) => onAlterar('dataFinal', event.target.value)} />
        </CampoOrcFiltro>

        <CampoOrcFiltro label="Cliente">
          <input className="inp" value={filtros.cliente} onChange={(event) => onAlterar('cliente', event.target.value)} placeholder="Cliente" />
        </CampoOrcFiltro>

        <CampoOrcFiltro label="Placa / Ativo">
          <input className="inp" value={filtros.placa} onChange={(event) => onAlterar('placa', event.target.value)} placeholder="Placa ou ativo" />
        </CampoOrcFiltro>

        <CampoOrcFiltro label="Descrição">
          <input className="inp" value={filtros.descricao} onChange={(event) => onAlterar('descricao', event.target.value)} placeholder="Descrição / Nº" />
        </CampoOrcFiltro>

        <CampoOrcFiltro label="Status">
          <select className="inp" value={filtros.status} onChange={(event) => onAlterar('status', event.target.value)}>
            <option value="todos">Todos</option>
            <option value="abertos">Abertos</option>
            <option value="rascunhos">Rascunhos</option>
            <option value="aprovados">Aprovados</option>
            <option value="reprovados">Reprovados</option>
            <option value="cancelados">Cancelados</option>
          </select>
        </CampoOrcFiltro>

        <div className="orc-filtro-acao">
          <button className="btn bo bsm" type="button" onClick={onLimpar} disabled={!algumFiltro}>
            Limpar filtros
          </button>
        </div>
      </div>
    </div>
  );
}

function CampoOrcFiltro({ label, children }: { label: string; children: any }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TabelaOrcamentosOperacional({
  dados,
  clientes,
  ativos,
  validadeDias,
  ordemGrid,
  onOrdenar,
  onSelecionar,
  onImprimir,
  onAprovar,
  carregando,
}: {
  dados: Orcamento[];
  clientes: any[];
  ativos: any[];
  validadeDias: number;
  ordemGrid: {
    coluna: ColunaOrdenacaoOrcamento;
    direcao: 'asc' | 'desc';
  };
  onOrdenar: (coluna: ColunaOrdenacaoOrcamento) => void;
  onSelecionar: (id: number) => void;
  onImprimir: (id: number) => void;
  onAprovar: (id: number) => void;
  carregando: boolean;
}) {
  function thOrdenavel(coluna: ColunaOrdenacaoOrcamento, label: string) {
    const ativa = ordemGrid.coluna === coluna;
    const seta = ativa ? (ordemGrid.direcao === 'asc' ? ' ↑' : ' ↓') : '';

    return (
      <th>
        <button className={`orc-th-sort ${ativa ? 'ativo' : ''}`} type="button" onClick={() => onOrdenar(coluna)} title={`Ordenar por ${label}`}>
          {label}{seta}
        </button>
      </th>
    );
  }

  if (dados.length === 0) {
    return <div className="ins am"><strong>Nenhum orçamento encontrado.</strong> Ajuste os filtros ou crie um novo orçamento.</div>;
  }

  return (
    <div className="tw orc-grid-operacional">
      <table>
        <thead>
          <tr>
            {thOrdenavel('numero', 'Orçamento')}
            {thOrdenavel('descricao', 'Descrição')}
            {thOrdenavel('cliente', 'Cliente')}
            {thOrdenavel('ativo', 'Ativo')}
            {thOrdenavel('placa', 'Placa')}
            {thOrdenavel('data_orcamento', 'Data orçamento')}
            {thOrdenavel('validade', 'Validade')}
            {thOrdenavel('data_aprovacao', 'Data aprovação')}
            {thOrdenavel('valor_total', 'Total')}
            {thOrdenavel('status', 'Status')}
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((orcamento) => {
            const cliente = clientes.find((item) => Number(item.id) === Number(orcamento.cliente_id));
            const ativo = ativos.find((item) => Number(item.id) === Number(orcamento.ativo_id));
            const aprovado = statusOrcamentoAprovado(orcamento.status);
            const reprovado = statusOrcamentoReprovado(orcamento.status);
            const cancelado = statusOrcamentoCancelado(orcamento.status);
            const podeAprovar = !aprovado && !reprovado && !cancelado && numero(orcamento.valor_total, 0) > 0;

            return (
              <tr
                key={orcamento.id}
                className="orc-grid-linha-clicavel"
                onClick={() => onSelecionar(orcamento.id)}
                title="Clique para abrir o orçamento"
              >
                <td>{texto(orcamento.numero, `ORC-${orcamento.id}`)}</td>
                <td>{texto(orcamento.descricao)}</td>
                <td>{nomeCadastro(cliente)}</td>
                <td>{nomeCadastro(ativo)}</td>
                <td>{valorCampo(ativo, ['identificacao', 'placa', 'serie', 'chassi'], '-')}</td>
                <td>{dataPtBrOrcamentoLista(dataBaseOrcamentoLista(orcamento))}</td>
                <td>{dataPtBrOrcamentoLista(dataValidadeOrcamentoLista(orcamento, validadeDias))}</td>
                <td>{dataPtBrOrcamentoLista(dataAprovacaoOrcamentoLista(orcamento))}</td>
                <td>{moeda(orcamento.valor_total)}</td>
                <td><span className={`badge ${badgeClasse(orcamento.status || 'Aberto')}`}>{orcamento.status || 'Aberto'}</span></td>
                <td>
                  <div className="orc-grid-acoes" onClick={(event) => event.stopPropagation()}>
                    <button className="btn ba bsm" type="button" onClick={() => onSelecionar(orcamento.id)}>Abrir</button>
                    <button className="btn bo bsm" type="button" onClick={() => onImprimir(orcamento.id)}>Imprimir</button>
                    {!aprovado && !reprovado && !cancelado && (
                      <button className="btn bg bsm" type="button" disabled={carregando || !podeAprovar} onClick={() => onAprovar(orcamento.id)}>
                        Aprovar
                      </button>
                    )}
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


export default function OrcamentoItens({
  token,
  cadastros,
  orcamentos,
  busca,
  onOrcamentosAtualizados,
}: Props) {
  const [itensServicos, setItensServicos] = useState<ItemServicoOrcamento[]>([]);
  const [itensProdutos, setItensProdutos] = useState<ItemProdutoOrcamento[]>([]);
  const [ordensServico, setOrdensServico] = useState<OrdemServicoVinculadaOrcamento[]>([]);
  const [orcamentosAtualizados, setOrcamentosAtualizados] = useState<Orcamento[]>(orcamentos);
  const [empresaEmissoraLista, setEmpresaEmissoraLista] = useState<EmpresaEmissora | null>(null);
  const [filtrosOrcamentoLista, setFiltrosOrcamentoLista] = useState<FiltrosOrcamentoLista>({
    tipoData: 'orcamento',
    dataInicial: '',
    dataFinal: '',
    validadeInicial: '',
    validadeFinal: '',
    aprovacaoInicial: '',
    aprovacaoFinal: '',
    cliente: '',
    placa: '',
    descricao: '',
    status: 'todos',
  });
  const [ordemGridOrcamento, setOrdemGridOrcamento] = useState<{
    coluna: ColunaOrdenacaoOrcamento;
    direcao: 'asc' | 'desc';
  }>({
    coluna: 'data_orcamento',
    direcao: 'desc',
  });

  const [orcamentoSelecionadoId, setOrcamentoSelecionadoId] = useState<string>('');
  const [abaAtiva, setAbaAtiva] = useState<AbaItens>('servicos');
  const [painelAdicionarAberto, setPainelAdicionarAberto] = useState(false);
  const [itemServicoEditandoId, setItemServicoEditandoId] = useState<number | null>(null);
  const [itemProdutoEditandoId, setItemProdutoEditandoId] = useState<number | null>(null);
  const [modoCriacao, setModoCriacao] = useState(false);

  const [carregando, setCarregando] = useState(false);
  const [excluindoItem, setExcluindoItem] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [servicoForm, setServicoForm] = useState({
    servico_id: '',
    descricao: '',
    quantidade: '1',
    valor_unitario: '0,00',
    valor_total: '0,00',
    desconto_percentual: '0',
    desconto_valor: '0,00',
    valor_liquido: '0,00',
    observacao: '',
  });

  const [produtoForm, setProdutoForm] = useState({
    produto_id: '',
    descricao: '',
    quantidade: '1',
    valor_unitario: '0,00',
    valor_total: '0,00',
    desconto_percentual: '0',
    desconto_valor: '0,00',
    valor_liquido: '0,00',
    observacao: '',
  });

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    setOrcamentosAtualizados(orcamentos);
  }, [orcamentos]);
  useEffect(() => {
    document.body.classList.toggle('sp-orcamento-criando', modoCriacao);
    controlarCardsNativosOrcamento();

    return () => {
      document.body.classList.remove('sp-orcamento-criando');
      restaurarCardsNativosOrcamento();
    };
  }, [modoCriacao, orcamentoSelecionadoId]);

  useEffect(() => {
    function aoSolicitarVoltarGridOrcamentos() {
      voltarParaGridOrcamentos();
    }

    window.addEventListener('servicopro:orcamentos:voltar-grid', aoSolicitarVoltarGridOrcamentos);

    return () => {
      window.removeEventListener('servicopro:orcamentos:voltar-grid', aoSolicitarVoltarGridOrcamentos);
    };
  }, []);

  const validadeDiasLista = numero(empresaEmissoraLista?.validade_orcamento_dias, 7);

  const orcamentosFiltrados = useMemo(() => {
    const filtrados = aplicarFiltrosOrcamentosLista(
      orcamentosAtualizados,
      cadastros.clientes,
      cadastros.ativos,
      busca,
      filtrosOrcamentoLista,
      validadeDiasLista
    );

    return ordenarOrcamentosLista(
      filtrados,
      cadastros.clientes,
      cadastros.ativos,
      ordemGridOrcamento,
      validadeDiasLista
    );
  }, [
    busca,
    orcamentosAtualizados,
    cadastros.clientes,
    cadastros.ativos,
    filtrosOrcamentoLista,
    ordemGridOrcamento,
    validadeDiasLista,
  ]);

  const orcamentoSelecionado = useMemo(() => {
    const id = Number(orcamentoSelecionadoId);
    return orcamentosAtualizados.find((item) => item.id === id) || orcamentos.find((item) => item.id === id);
  }, [orcamentoSelecionadoId, orcamentosAtualizados, orcamentos]);

  const clienteDoOrcamentoSelecionado = useMemo(() => {
    if (!orcamentoSelecionado?.cliente_id) return null;
    return cadastros.clientes.find((item) => Number(item.id) === Number(orcamentoSelecionado.cliente_id)) || null;
  }, [orcamentoSelecionado, cadastros.clientes]);

  const ativoDoOrcamentoSelecionado = useMemo(() => {
    if (!orcamentoSelecionado?.ativo_id) return null;
    return cadastros.ativos.find((item) => Number(item.id) === Number(orcamentoSelecionado.ativo_id)) || null;
  }, [orcamentoSelecionado, cadastros.ativos]);

  const itensServicosDoOrcamento = useMemo(() => {
    const id = Number(orcamentoSelecionadoId);
    return itensServicos.filter((item) => item.orcamento_id === id && item.ativo !== 0);
  }, [itensServicos, orcamentoSelecionadoId]);

  const itensProdutosDoOrcamento = useMemo(() => {
    const id = Number(orcamentoSelecionadoId);
    return itensProdutos.filter((item) => item.orcamento_id === id && item.ativo !== 0);
  }, [itensProdutos, orcamentoSelecionadoId]);

  const totalItensAtivos = itensServicosDoOrcamento.length + itensProdutosDoOrcamento.length;

  const ordemServicoVinculadaAoOrcamento = useMemo(() => {
    const id = Number(orcamentoSelecionadoId);
    if (!id) return null;

    return ordensServico.find((ordem) => ordem.orcamento_id === id && ordem.ativo !== 0) ?? null;
  }, [ordensServico, orcamentoSelecionadoId]);

  const orcamentoAprovado = statusOrcamentoAprovado(orcamentoSelecionado?.status);
  const orcamentoReprovado = statusOrcamentoReprovado(orcamentoSelecionado?.status);
  const orcamentoCancelado = statusOrcamentoCancelado(orcamentoSelecionado?.status);
  const orcamentoFinalizado = statusOrcamentoFinalizado(orcamentoSelecionado?.status);
  const orcamentoPodeSerAprovado = Boolean(orcamentoSelecionado) && !orcamentoAprovado && !orcamentoReprovado && !orcamentoCancelado && totalItensAtivos > 0 && numero(orcamentoSelecionado.valor_total, 0) > 0;
  const itensBloqueadosPorOrdemServico = statusBloqueiaAlteracaoItens(ordemServicoVinculadaAoOrcamento?.status);
  const itensBloqueadosPorStatusOrcamento = orcamentoFinalizado;
  const itensBloqueados = itensBloqueadosPorOrdemServico || itensBloqueadosPorStatusOrcamento;
  const osPodeSerAprovada = statusPermiteAprovarOs(ordemServicoVinculadaAoOrcamento?.status);
  const orcamentoPodeSerCanceladoVisualmente = orcamentoAprovado && !orcamentoCancelado && !ordemServicoVinculadaAoOrcamento;


  useEffect(() => {
    if (itensBloqueados && painelAdicionarAberto) {
      setPainelAdicionarAberto(false);
    }
  }, [itensBloqueados, painelAdicionarAberto]);

  function cardComTitulo(titulo: string) {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.card'));

    return cards.find((card) => {
      const h3 = card.querySelector('h3');
      return h3?.textContent?.trim().toLowerCase() === titulo.toLowerCase();
    });
  }

  function controlarCardsNativosOrcamento() {
    const host = document.querySelector<HTMLElement>('.sp-orcamento-criacao-modal-host');
    const moduloOperacao = host?.querySelector<HTMLElement>(':scope > .g, .g');
    const cards = host ? Array.from(host.querySelectorAll<HTMLElement>('.card, section.card')) : [];

    const cardNovoRegistro = cards[0] || null;
    const cardListaNativa = cards[1] || null;

    if (!host || !cardNovoRegistro) return;

    cardNovoRegistro.style.display = modoCriacao ? 'block' : 'none';

    if (cardListaNativa) {
      cardListaNativa.style.display = 'none';
    }

    if (modoCriacao) {
      document.body.classList.add('sp-orcamento-criando');

      Object.assign(host.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '10080',
        display: 'grid',
        placeItems: 'center',
        padding: '22px',
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(7px)',
        WebkitBackdropFilter: 'blur(7px)',
        overflow: 'auto',
        pointerEvents: 'auto',
      });

      if (moduloOperacao) {
        Object.assign(moduloOperacao.style, {
          display: 'block',
          width: 'min(940px, calc(100vw - 56px))',
          maxWidth: '940px',
          margin: '0 auto',
        });
      }

      Object.assign(cardNovoRegistro.style, {
        position: 'relative',
        zIndex: '10081',
        width: '100%',
        maxHeight: 'min(84vh, 720px)',
        overflow: 'auto',
        margin: '0',
        padding: '24px',
        background: 'linear-gradient(180deg, #1b1f2b 0%, #151923 48%, #111620 100%)',
        border: '1px solid rgba(94, 129, 255, 0.56)',
        borderRadius: '18px',
        boxShadow: '0 36px 120px rgba(0, 0, 0, 0.88), 0 0 0 1px rgba(79, 124, 255, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        opacity: '1',
        visibility: 'visible',
        pointerEvents: 'auto',
      });
    } else {
      document.body.classList.remove('sp-orcamento-criando');

      host.removeAttribute('style');

      if (moduloOperacao) {
        moduloOperacao.removeAttribute('style');
      }

      if (cardNovoRegistro) {
        cardNovoRegistro.removeAttribute('style');
        cardNovoRegistro.style.display = 'none';
      }

      if (cardListaNativa) {
        cardListaNativa.style.display = 'none';
      }
    }
  }

  function restaurarCardsNativosOrcamento() {
    const host = document.querySelector<HTMLElement>('.sp-orcamento-criacao-modal-host');
    const moduloOperacao = host?.querySelector<HTMLElement>(':scope > .g, .g');
    const cards = host ? Array.from(host.querySelectorAll<HTMLElement>('.card, section.card')) : [];

    document.body.classList.remove('sp-orcamento-criando');

    host?.removeAttribute('style');
    moduloOperacao?.removeAttribute('style');

    cards.forEach((card) => {
      card.removeAttribute('style');
    });
  }


  async function carregarEmpresaEmissora(): Promise<EmpresaEmissora | null> {
    try {
      const resposta = await fetch(`${API_BASE}/configuracoes/empresa`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resposta.ok) return null;

      const corpo = await resposta.json();
      return corpo?.dados ?? null;
    } catch {
      return null;
    }
  }

  async function carregarTudo() {
    setCarregando(true);
    setErro('');

    try {
      const [respItensServicos, respItensProdutos, respOrcamentos, respOrdensServico, respEmpresaEmissora] = await Promise.all([
        getLista<ItemServicoOrcamento>('/orcamentos-itens-servicos'),
        getLista<ItemProdutoOrcamento>('/orcamentos-itens-produtos'),
        getLista<Orcamento>('/orcamentos'),
        getLista<OrdemServicoVinculadaOrcamento>('/ordens-servico'),
        carregarEmpresaEmissora(),
      ]);

      setItensServicos(respItensServicos);
      setItensProdutos(respItensProdutos);
      setOrcamentosAtualizados(respOrcamentos);
      setOrdensServico(respOrdensServico);
      setEmpresaEmissoraLista(respEmpresaEmissora);
    } catch {
      setErro('Falha ao carregar itens do orçamento.');
    } finally {
      setCarregando(false);
    }
  }

  async function getLista<T>(endpoint: string) {
    const resposta = await fetch(`${API_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resposta.ok) throw new Error(endpoint);

    const json = (await resposta.json()) as ApiLista<T>;
    return json.dados ?? [];
  }

  async function interpretarResposta(resposta: Response) {
    const bruto = await resposta.text();

    try {
      return bruto ? JSON.parse(bruto) : null;
    } catch {
      return bruto;
    }
  }

  function aplicarTotaisRetornados(corpo: any) {
    const retorno = corpo?.orcamento;
    if (!retorno?.id) return;

    setOrcamentosAtualizados((atuais) =>
      atuais.map((orcamento) =>
        orcamento.id === retorno.id
          ? {
              ...orcamento,
              valor_servicos: numero(retorno.valorServicos, orcamento.valor_servicos),
              valor_produtos: numero(retorno.valorProdutos, orcamento.valor_produtos),
              valor_desconto: numero(retorno.valorDesconto, orcamento.valor_desconto),
              valor_total: numero(retorno.valorTotal, orcamento.valor_total),
            }
          : orcamento,
      ),
    );
  }

  async function sincronizarAposMudanca(corpo: any) {
    aplicarTotaisRetornados(corpo);
    await carregarTudo();

    try {
      await onOrcamentosAtualizados();
    } catch {
      // A tela local ja foi atualizada.
    }
  }

  function limparServicoForm() {
    setItemServicoEditandoId(null);
    setServicoForm({
      servico_id: '',
      descricao: '',
      quantidade: '1',
      valor_unitario: '0,00',
      valor_total: '0,00',
      desconto_percentual: '0',
      desconto_valor: '0,00',
      valor_liquido: '0,00',
      observacao: '',
    });
  }

  function limparProdutoForm() {
    setItemProdutoEditandoId(null);
    setProdutoForm({
      produto_id: '',
      descricao: '',
      quantidade: '1',
      valor_unitario: '0,00',
      valor_total: '0,00',
      desconto_percentual: '0',
      desconto_valor: '0,00',
      valor_liquido: '0,00',
      observacao: '',
    });
  }

  async function postJson(endpoint: string, payload: Record<string, unknown>, tipo: AbaItens) {
    setCarregando(true);
    setErro('');
    setSucesso('');

    try {
      const resposta = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const corpo: any = await interpretarResposta(resposta);

      if (!resposta.ok) {
        setErro(typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao gravar item do orçamento.');
        return;
      }

      setSucesso(corpo?.mensagem || 'Item lançado e orçamento recalculado.');

      if (tipo === 'servicos') limparServicoForm();
      if (tipo === 'produtos') limparProdutoForm();
      setPainelAdicionarAberto(false);

      await sincronizarAposMudanca(corpo);
    } catch {
      setErro('Falha de conexão ao gravar item do orçamento.');
    } finally {
      setCarregando(false);
    }
  }

  async function putJson(endpoint: string, payload: Record<string, unknown>, tipo: AbaItens) {
    setCarregando(true);
    setErro('');
    setSucesso('');

    try {
      const resposta = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const corpo: any = await interpretarResposta(resposta);

      if (!resposta.ok) {
        setErro(typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao alterar item do orçamento.');
        return;
      }

      setSucesso(corpo?.mensagem || 'Item alterado e orçamento recalculado.');

      if (tipo === 'servicos') limparServicoForm();
      if (tipo === 'produtos') limparProdutoForm();
      setPainelAdicionarAberto(false);

      await sincronizarAposMudanca(corpo);
    } catch {
      setErro('Falha de conexão ao alterar item do orçamento.');
    } finally {
      setCarregando(false);
    }
  }

  async function deleteJson(endpoint: string, mensagemSucesso: string, tipo: AbaItens, itemId: number) {
    setCarregando(true);
    setErro('');
    setSucesso('');

    try {
      const resposta = await fetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const corpo: any = await interpretarResposta(resposta);

      if (!resposta.ok) {
        setErro(typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao excluir item do orçamento.');
        return;
      }

      if (tipo === 'servicos') {
        setItensServicos((atuais) => atuais.map((item) => (item.id === itemId ? { ...item, ativo: 0 } : item)));
      } else {
        setItensProdutos((atuais) => atuais.map((item) => (item.id === itemId ? { ...item, ativo: 0 } : item)));
      }

      aplicarTotaisRetornados(corpo);
      setSucesso(corpo?.mensagem || mensagemSucesso);

      await carregarTudo();

      try {
        await onOrcamentosAtualizados();
      } catch {
        // A tela local ja foi atualizada.
      }
    } catch {
      setErro('Falha de conexão ao excluir item do orçamento.');
    } finally {
      setCarregando(false);
      setExcluindoItem('');
    }
  }

  async function recalcularOrcamento() {
    if (!orcamentoSelecionadoId) return;

    setCarregando(true);
    setErro('');
    setSucesso('');

    try {
      const resposta = await fetch(`${API_BASE}/orcamentos/${orcamentoSelecionadoId}/recalcular`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const corpo: any = await interpretarResposta(resposta);

      if (!resposta.ok) {
        setErro(typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao recalcular orçamento.');
        return;
      }

      aplicarTotaisRetornados(corpo);
      setSucesso(corpo?.mensagem || 'Orçamento recalculado com sucesso.');

      await carregarTudo();

      try {
        await onOrcamentosAtualizados();
      } catch {
        // A tela local ja foi atualizada.
      }
    } catch {
      setErro('Falha de conexão ao recalcular orçamento.');
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovoOrcamento() {
    setModoCriacao(true);
    setOrcamentoSelecionadoId('');
    setErro('');
    setPainelAdicionarAberto(false);
    setSucesso('Modo criação: preencha o formulário de novo orçamento acima e salve. Depois clique no orçamento para adicionar itens.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selecionarOrcamento(id: number) {
    setModoCriacao(false);
    setOrcamentoSelecionadoId(String(id));
    setErro('');
    setSucesso('');
    setPainelAdicionarAberto(false);
    setAbaAtiva('servicos');
    limparServicoForm();
    limparProdutoForm();

    setTimeout(() => {
      document.getElementById('painel-itens-orcamento')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function voltarParaGridOrcamentos() {
    setModoCriacao(false);
    setOrcamentoSelecionadoId('');
    setErro('');
    setSucesso('');
    setPainelAdicionarAberto(false);
    setItemServicoEditandoId(null);
    setItemProdutoEditandoId(null);
    limparServicoForm();
    limparProdutoForm();

    setTimeout(() => {
      document.getElementById('lista-orcamentos-itens')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function voltarParaLista() {
    voltarParaGridOrcamentos();
  }


  async function reprovarOrcamento() {
    const id = Number(orcamentoSelecionadoId);

    if (!id) {
      setErro('Selecione um orçamento.');
      return;
    }

    const confirmado = await mostrarModalOrcamento({
      titulo: 'Reprovar orçamento?',
      badge: 'Confirmação',
      tipo: 'perigo',
      mensagem: 'Este orçamento será marcado como reprovado e não poderá ser usado para gerar uma OS. Para uma nova negociação, será necessário replicar ou criar outro orçamento.',
      textoConfirmar: 'Reprovar orçamento',
      textoCancelar: 'Voltar',
    });

    if (!confirmado) return;

    setCarregando(true);
    setErro('');
    setSucesso('');

    try {
      const resposta = await fetch(`${API_BASE}/orcamentos/${id}/reprovar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const corpo: any = await interpretarResposta(resposta);

      if (!resposta.ok) {
        setErro(typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao reprovar orçamento.');
        return;
      }

      setSucesso(corpo?.mensagem || 'Orçamento reprovado com sucesso.');

      setOrcamentosAtualizados((lista) =>
        lista.map((orcamento) =>
          orcamento.id === id
            ? {
                ...orcamento,
                status: 'Reprovado',
              }
            : orcamento
        )
      );

      await carregarTudo();
    } catch {
      setErro('Falha de conexão ao reprovar orçamento.');
    } finally {
      setCarregando(false);
    }
  }


  type ModalOrcamentoOpcoes = {
    titulo: string;
    mensagem: string;
    badge?: string;
    textoConfirmar?: string;
    textoCancelar?: string;
    tipo?: 'aviso' | 'perigo';
  };

  function mostrarModalOrcamento(opcoes: ModalOrcamentoOpcoes): Promise<boolean> {
    return new Promise((resolve) => {
      const modalExistente = document.getElementById('modal-aviso-aprovacao-orcamento');
      if (modalExistente) modalExistente.remove();

      const badge = opcoes.badge || 'Atenção';
      const textoConfirmar = opcoes.textoConfirmar || 'Entendi';
      const textoCancelar = opcoes.textoCancelar || '';
      const tipo = opcoes.tipo || 'aviso';

      const corBadgeFundo = tipo === 'perigo' ? 'rgba(240, 90, 90, 0.14)' : 'rgba(245, 158, 66, 0.14)';
      const corBadgeTexto = tipo === 'perigo' ? '#f08a8a' : '#f5b35f';
      const classeConfirmar = tipo === 'perigo' ? 'btn bd' : 'btn bp';

      const overlay = document.createElement('div');
      overlay.id = 'modal-aviso-aprovacao-orcamento';
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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-orcamento"
          style="
            width: min(640px, 96vw);
            background: #171b25;
            border: 1px solid rgba(79, 124, 255, 0.55);
            border-radius: 16px;
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
            color: #e9eefc;
            overflow: hidden;
          "
        >
          <div style="padding: 18px 20px 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.08);">
            <div
              style="
                display: inline-flex;
                align-items: center;
                padding: 4px 10px;
                margin-bottom: 12px;
                border-radius: 999px;
                background: ${corBadgeFundo};
                color: ${corBadgeTexto};
                font-size: 11px;
                font-weight: 800;
                letter-spacing: .08em;
                text-transform: uppercase;
              "
            >
              ${escaparHtml(badge)}
            </div>

            <h3 id="titulo-modal-orcamento" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800;">
              ${escaparHtml(opcoes.titulo)}
            </h3>

            <p style="margin: 0; color: #aeb8d8; line-height: 1.6; font-size: 14px;">
              ${escaparHtml(opcoes.mensagem)}
            </p>
          </div>

          <div style="padding: 16px 20px; display: flex; justify-content: flex-end; gap: 10px;">
            ${
              textoCancelar
                ? `<button type="button" data-modal-cancelar="1" class="btn bo" style="min-width: 110px;">${escaparHtml(textoCancelar)}</button>`
                : ''
            }
            <button
              type="button"
              data-modal-confirmar="1"
              class="${classeConfirmar}"
              style="min-width: 120px;"
            >
              ${escaparHtml(textoConfirmar)}
            </button>
          </div>
        </div>
      `;

      function fecharModal(resultado: boolean) {
        overlay.remove();
        document.removeEventListener('keydown', tratarTecla);
        resolve(resultado);
      }

      function tratarTecla(event: KeyboardEvent) {
        if (event.key === 'Escape') fecharModal(false);
      }

      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) fecharModal(false);

        const alvo = event.target as HTMLElement;
        if (alvo?.dataset?.modalCancelar === '1') fecharModal(false);
        if (alvo?.dataset?.modalConfirmar === '1') fecharModal(true);
      });

      document.addEventListener('keydown', tratarTecla);
      document.body.appendChild(overlay);

      setTimeout(() => {
        const botao = overlay.querySelector<HTMLButtonElement>('[data-modal-confirmar="1"]');
        botao?.focus();
      }, 50);
    });
  }

  function mostrarAvisoAprovacaoOrcamento(mensagem: string) {
    void mostrarModalOrcamento({
      titulo: 'Orçamento não pode ser aprovado',
      mensagem,
      textoConfirmar: 'Entendi',
    });
  }

  function mensagemBloqueioAlteracaoOrcamento() {
    if (itensBloqueadosPorOrdemServico) {
      return `Este orçamento possui uma OS vinculada com status ${ordemServicoVinculadaAoOrcamento?.status}. Por segurança, os itens não podem ser alterados nessa situação.`;
    }

    if (orcamentoAprovado) {
      return 'Este orçamento já foi aprovado. Para alterar serviços ou produtos, cancele este orçamento e gere um novo orçamento a partir dele.';
    }

    if (orcamentoReprovado) {
      return 'Este orçamento está reprovado e não pode ser alterado. Para nova negociação, replique ou crie outro orçamento.';
    }

    if (orcamentoCancelado) {
      return 'Este orçamento está cancelado e não pode ser alterado. Para nova negociação, replique ou crie outro orçamento.';
    }

    return 'Este orçamento não pode ser alterado nesta situação.';
  }

  function mostrarAvisoAlteracaoOrcamento() {
    void mostrarModalOrcamento({
      titulo: 'Orçamento não pode ser alterado',
      mensagem: mensagemBloqueioAlteracaoOrcamento(),
      textoConfirmar: 'Entendi',
    });
  }

  function confirmarCancelamentoOrcamento() {
    return mostrarModalOrcamento({
      titulo: 'Cancelar orçamento aprovado?',
      badge: 'Confirmação',
      tipo: 'perigo',
      mensagem: 'Ao cancelar este orçamento, ele ficará bloqueado para alterações e não poderá mais ser aprovado ou usado para gerar OS. Depois você poderá criar/replicar outro orçamento para uma nova negociação.',
      textoConfirmar: 'Cancelar orçamento',
      textoCancelar: 'Voltar',
    });
  }


  async function cancelarOrcamento() {
    const id = Number(orcamentoSelecionadoId);

    if (!id) {
      setErro('Selecione um orçamento para cancelar.');
      return;
    }

    const confirmado = await confirmarCancelamentoOrcamento();
    if (!confirmado) return;

    setCarregando(true);
    setErro('');
    setSucesso('');

    try {
      const resposta = await fetch(`${API_BASE}/orcamentos/${id}/cancelar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const corpo: any = await interpretarResposta(resposta);

      if (!resposta.ok) {
        await mostrarModalOrcamento({
          titulo: 'Orçamento não pode ser cancelado',
          mensagem: typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao cancelar orçamento.',
          textoConfirmar: 'Entendi',
        });
        return;
      }

      setOrcamentosAtualizados((lista) =>
        lista.map((orcamento) =>
          orcamento.id === id
            ? {
                ...orcamento,
                status: corpo?.orcamento?.status || 'Cancelado',
              }
            : orcamento
        )
      );

      setSucesso(corpo?.mensagem || 'Orçamento cancelado com sucesso.');
      await carregarTudo();

      try {
        await onOrcamentosAtualizados();
      } catch {
        // A tela local ja foi atualizada.
      }
    } catch {
      await mostrarModalOrcamento({
        titulo: 'Falha de conexão',
        mensagem: 'Não foi possível cancelar o orçamento. Verifique a conexão e tente novamente.',
        textoConfirmar: 'Entendi',
      });
    } finally {
      setCarregando(false);
    }
  }


  async function aprovarOrcamento(idInformado?: number) {
    const id = idInformado ?? Number(orcamentoSelecionadoId);
    const orcamentoAlvo =
      orcamentosAtualizados.find((orcamento) => Number(orcamento.id) === Number(id)) ||
      orcamentos.find((orcamento) => Number(orcamento.id) === Number(id)) ||
      orcamentoSelecionado;

    const totalServicosAlvo = itensServicos.filter((item) => Number(item.orcamento_id) === Number(id) && item.ativo !== 0).length;
    const totalProdutosAlvo = itensProdutos.filter((item) => Number(item.orcamento_id) === Number(id) && item.ativo !== 0).length;
    const totalItensAlvo = totalServicosAlvo + totalProdutosAlvo;
    const valorTotalAlvo = numero(orcamentoAlvo?.valor_total, 0);
    const statusAlvo = String(orcamentoAlvo?.status ?? '').toLowerCase();

    if (!id) {
      setErro('Selecione um orçamento para aprovar.');
      return;
    }

    if (statusAlvo.includes('aprov')) {
      setErro('Este orçamento já está aprovado.');
      return;
    }

    if (statusAlvo.includes('reprov')) {
      setErro('Orçamento reprovado não pode ser aprovado. Replique ou crie um novo orçamento.');
      return;
    }

    if (statusAlvo.includes('cancel')) {
      setErro('Orçamento cancelado não pode ser aprovado. Replique ou crie um novo orçamento.');
      return;
    }

    if (totalItensAlvo <= 0 || valorTotalAlvo <= 0) {
      setErro('');
      setSucesso('');
      mostrarAvisoAprovacaoOrcamento(
        'Este orçamento está sem itens ou com valor total zerado. Inclua ao menos um serviço ou produto/peça com valor maior que zero antes de aprovar.'
      );
      return;
    }

    setCarregando(true);
    setErro('');
    setSucesso('');

    try {
      const resposta = await fetch(`${API_BASE}/orcamentos/${id}/aprovar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const corpo: any = await interpretarResposta(resposta);

      if (!resposta.ok) {
        setErro(typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao aprovar orçamento.');
        return;
      }

      aplicarTotaisRetornados(corpo);

      setOrcamentosAtualizados((atuais) =>
        atuais.map((orcamento) =>
          orcamento.id === id
            ? {
                ...orcamento,
                status: 'Aprovado',
                valor_servicos: numero(corpo?.orcamento?.valorServicos, orcamento.valor_servicos),
                valor_produtos: numero(corpo?.orcamento?.valorProdutos, orcamento.valor_produtos),
                valor_desconto: numero(corpo?.orcamento?.valorDesconto, orcamento.valor_desconto),
                valor_total: numero(corpo?.orcamento?.valorTotal, orcamento.valor_total),
              }
            : orcamento,
        ),
      );

      setSucesso(corpo?.mensagem || 'Orçamento aprovado com sucesso.');
      await carregarTudo();

      try {
        await onOrcamentosAtualizados();
      } catch {
        // A tela local ja foi atualizada.
      }
    } catch {
      setErro('Falha de conexão ao aprovar orçamento.');
    } finally {
      setCarregando(false);
    }
  }


  function nomeClienteDoOrcamento(orcamento: Orcamento) {
    const cliente = cadastros.clientes.find((item) => Number(item.id) === Number(orcamento.cliente_id));
    return nomeCadastro(cliente);
  }

  function clienteDoOrcamento(orcamento: Orcamento) {
    return cadastros.clientes.find((item) => Number(item.id) === Number(orcamento.cliente_id));
  }

  function nomeAtivoDoOrcamento(orcamento: Orcamento) {
    const ativo = cadastros.ativos.find((item) => Number(item.id) === Number(orcamento.ativo_id));
    return nomeCadastro(ativo);
  }

  function ativoDoOrcamento(orcamento: Orcamento) {
    return cadastros.ativos.find((item) => Number(item.id) === Number(orcamento.ativo_id));
  }

  function itensServicoParaImpressao(orcamentoId: number) {
    return itensServicos.filter((item) => item.orcamento_id === orcamentoId && item.ativo !== 0);
  }

  function itensProdutoParaImpressao(orcamentoId: number) {
    return itensProdutos.filter((item) => item.orcamento_id === orcamentoId && item.ativo !== 0);
  }

  function enderecoEmpresa(empresa: EmpresaEmissora | null) {
    if (!empresa) return '';

    const partes = [
      empresa.endereco,
      empresa.numero ? `nº ${empresa.numero}` : '',
      empresa.complemento,
      empresa.bairro,
      empresa.cidade && empresa.uf ? `${empresa.cidade}/${empresa.uf}` : empresa.cidade || empresa.uf,
      empresa.cep ? `CEP ${empresa.cep}` : '',
    ].filter((item) => item && String(item).trim());

    return partes.join(' - ');
  }

  function blocoContatoEmpresa(empresa: EmpresaEmissora | null) {
    if (!empresa) return '';

    const partes = [
      empresa.telefone ? `Tel.: ${empresa.telefone}` : '',
      empresa.whatsapp ? `WhatsApp: ${empresa.whatsapp}` : '',
      empresa.email ? `E-mail: ${empresa.email}` : '',
      empresa.site ? `Site: ${empresa.site}` : '',
    ].filter((item) => item && String(item).trim());

    return partes.join(' | ');
  }

  function percentualImpressao(valor: unknown) {
    const percentual = numero(valor, 0);
    return percentual.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  function linhaImpressao(item: ItemServicoOrcamento | ItemProdutoOrcamento) {
    const valorBruto = numero(item.valor_total, 0);
    const descontoValor = numero(item.desconto_valor ?? 0, 0);
    const descontoPercentual = numero(item.desconto_percentual ?? 0, 0);
    const valorLiquido = valorLiquidoItem(item);
    const descontoTexto =
      descontoValor > 0 || descontoPercentual > 0
        ? `${moeda(descontoValor)}${descontoPercentual > 0 ? ` (${percentualImpressao(descontoPercentual)}%)` : ''}`
        : moeda(0);

    return `
      <tr>
        <td>${escaparHtml(item.descricao)}</td>
        <td class="num">${numero(item.quantidade).toLocaleString('pt-BR')}</td>
        <td class="num">${moeda(item.valor_unitario)}</td>
        <td class="num">${moeda(valorBruto)}</td>
        <td class="num">${descontoTexto}</td>
        <td class="num">${moeda(valorLiquido)}</td>
      </tr>
    `;
  }

  function montarHtmlImpressaoOrcamento(orcamento: Orcamento, empresa: EmpresaEmissora | null) {
    const cliente = clienteDoOrcamento(orcamento);
    const ativo = ativoDoOrcamento(orcamento);

    const servicos = itensServicoParaImpressao(orcamento.id);
    const produtos = itensProdutoParaImpressao(orcamento.id);

    const linhasServicos = servicos.length
      ? servicos.map((item) => linhaImpressao(item)).join('')
      : '<tr><td colspan="4" class="vazio">Nenhum serviço lançado.</td></tr>';

    const linhasProdutos = produtos.length
      ? produtos.map((item) => linhaImpressao(item)).join('')
      : '<tr><td colspan="4" class="vazio">Nenhum produto/peça lançado.</td></tr>';

    const numeroOrcamento = texto(orcamento.numero, `ORC-${orcamento.id}`);
    const validadeDias = numero(empresa?.validade_orcamento_dias, 7);
    const validade = dataPtBr(adicionarDias(new Date(), validadeDias));

    const nomeEmpresa = texto(empresa?.nome_fantasia || empresa?.razao_social, 'Empresa emissora');
    const razaoSocial = texto(empresa?.razao_social, nomeEmpresa);
    const cnpj = texto(empresa?.cnpj, '-');
    const inscricaoEstadual = texto(empresa?.inscricao_estadual, '-');
    const inscricaoMunicipal = texto(empresa?.inscricao_municipal, '-');
    const textoRodape = texto(
      empresa?.texto_rodape_orcamento,
      'Orçamento sujeito à aprovação do cliente. Produtos no orçamento não representam baixa de estoque.',
    );

    const clienteNome = nomeClienteDoOrcamento(orcamento);
    const clienteDocumento = valorCampo(cliente, ['documento', 'cpf_cnpj', 'cpf', 'cnpj', 'identificacao_fiscal'], '-');
    const clienteTelefone = valorCampo(cliente, ['telefone', 'celular', 'whatsapp', 'fone'], '-');
    const clienteEmail = valorCampo(cliente, ['email'], '-');
    const clienteEndereco = [
      valorCampo(cliente, ['endereco', 'logradouro'], ''),
      valorCampo(cliente, ['numero'], ''),
      valorCampo(cliente, ['bairro'], ''),
      valorCampo(cliente, ['cidade'], ''),
      valorCampo(cliente, ['uf'], ''),
    ]
      .filter((item) => item && item !== '-')
      .join(' - ') || '-';

    const ativoDescricao = nomeAtivoDoOrcamento(orcamento);
    const ativoTipo = valorCampo(ativo, ['tipo', 'tipo_ativo'], '-');
    const ativoMarca = valorCampo(ativo, ['marca'], '-');
    const ativoModelo = valorCampo(ativo, ['modelo'], '-');
    const ativoAno = valorCampo(ativo, ['ano', 'ano_modelo', 'ano_fabricacao'], '-');
    const ativoIdentificacao = valorCampo(ativo, ['identificacao', 'placa', 'serie', 'chassi'], '-');
    const ativoObservacao = valorCampo(ativo, ['observacao', 'descricao_complementar'], '-');

    return `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Orçamento ${escaparHtml(numeroOrcamento)}</title>
  <style>
    * { box-sizing: border-box; }
    @page {
      size: A4;
      margin: 0;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      margin: 0;
      padding: 10mm 11mm 9mm 11mm;
      background: #fff;
      font-size: 9.8px;
      line-height: 1.24;
    }
    .pagina {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }
    .topo {
      display: grid;
      grid-template-columns: 1fr 220px;
      gap: 12px;
      border-bottom: 2px solid #111827;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .empresa h1 {
      margin: 0 0 2px;
      font-size: 20px;
      letter-spacing: -0.04em;
      color: #111827;
    }
    .empresa .razao {
      font-weight: 700;
      margin-bottom: 2px;
    }
    .empresa p,
    .meta p {
      margin: 1px 0;
      color: #374151;
    }
    .meta {
      text-align: right;
      border-left: 1px solid #d1d5db;
      padding-left: 10px;
    }
    .meta .titulo {
      font-size: 9px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-weight: 700;
    }
    .meta .numero {
      font-size: 19px;
      font-weight: 800;
      color: #111827;
      margin: 2px 0 4px;
    }
    .status {
      display: inline-block;
      padding: 2px 7px;
      border: 1px solid #9ca3af;
      border-radius: 999px;
      font-weight: 700;
      color: #111827;
      font-size: 10px;
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
    .duas-colunas .box {
      margin-bottom: 0;
    }
    .box h2 {
      font-size: 12px;
      margin: 0 0 6px;
      color: #111827;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
    }
    .grid2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 10px;
    }
    .grid3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px 10px;
    }
    .campo .label {
      font-size: 7.8px;
      text-transform: uppercase;
      letter-spacing: .07em;
      color: #6b7280;
      font-weight: 800;
      margin-bottom: 1px;
    }
    .campo .valor {
      font-size: 10px;
      font-weight: 700;
      color: #111827;
      min-height: 13px;
    }
    .desc-compacta {
      display: grid;
      grid-template-columns: 1.15fr .85fr;
      gap: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5px;
    }
    th {
      background: #f3f4f6;
      color: #374151;
      font-size: 8.8px;
      text-transform: uppercase;
      letter-spacing: .05em;
      padding: 5px 6px;
      border: 1px solid #d1d5db;
      text-align: left;
    }
    td {
      padding: 5px 6px;
      border: 1px solid #e5e7eb;
      vertical-align: top;
      font-size: 10px;
    }
    .num {
      text-align: right;
      white-space: nowrap;
    }
    .vazio {
      color: #6b7280;
      text-align: center;
      font-style: italic;
    }
    .resumo-final {
      display: grid;
      grid-template-columns: 1fr 265px;
      gap: 12px;
      align-items: start;
      margin-top: 6px;
      break-inside: avoid;
    }
    .observacoes {
      color: #4b5563;
      font-size: 9.5px;
    }
    .observacoes p {
      margin: 0 0 4px;
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
    .totais .linha:nth-child(odd) {
      background: #f9fafb;
    }
    .totais .linha:last-child {
      border-bottom: 0;
    }
    .totais .final {
      font-size: 14px;
      font-weight: 900;
      color: #111827;
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
        <h1>${escaparHtml(nomeEmpresa)}</h1>
        <p class="razao">${escaparHtml(razaoSocial)}</p>
        <p>CNPJ: ${escaparHtml(cnpj)} | IE: ${escaparHtml(inscricaoEstadual)} | IM: ${escaparHtml(inscricaoMunicipal)}</p>
        <p>${escaparHtml(enderecoEmpresa(empresa))}</p>
        <p>${escaparHtml(blocoContatoEmpresa(empresa))}</p>
      </div>

      <div class="meta">
        <div class="titulo">Orçamento</div>
        <div class="numero">${escaparHtml(numeroOrcamento)}</div>
        <p><span class="status">${escaparHtml(orcamento.status)}</span></p>
        <p>Emissão: <strong>${escaparHtml(dataAtualPtBr())}</strong></p>
        <p>Validade: <strong>${escaparHtml(validade)}</strong></p>
      </div>
    </section>

    <section class="duas-colunas">
      <div class="box">
        <h2>Cliente / proprietário</h2>
        <div class="grid2">
          <div class="campo">
            <div class="label">Nome</div>
            <div class="valor">${escaparHtml(clienteNome)}</div>
          </div>
          <div class="campo">
            <div class="label">CPF/CNPJ</div>
            <div class="valor">${escaparHtml(clienteDocumento)}</div>
          </div>
          <div class="campo">
            <div class="label">Telefone / WhatsApp</div>
            <div class="valor">${escaparHtml(clienteTelefone)}</div>
          </div>
          <div class="campo">
            <div class="label">E-mail</div>
            <div class="valor">${escaparHtml(clienteEmail)}</div>
          </div>
          <div class="campo" style="grid-column: 1 / -1;">
            <div class="label">Endereço</div>
            <div class="valor">${escaparHtml(clienteEndereco)}</div>
          </div>
        </div>
      </div>

      <div class="box">
        <h2>Ativo / veículo / equipamento</h2>
        <div class="grid2">
          <div class="campo">
            <div class="label">Descrição</div>
            <div class="valor">${escaparHtml(ativoDescricao)}</div>
          </div>
          <div class="campo">
            <div class="label">Identificação / placa / série</div>
            <div class="valor">${escaparHtml(ativoIdentificacao)}</div>
          </div>
          <div class="campo">
            <div class="label">Tipo</div>
            <div class="valor">${escaparHtml(ativoTipo)}</div>
          </div>
          <div class="campo">
            <div class="label">Marca / modelo / ano</div>
            <div class="valor">${escaparHtml(`${ativoMarca} / ${ativoModelo} / ${ativoAno}`)}</div>
          </div>
          <div class="campo" style="grid-column: 1 / -1;">
            <div class="label">Observação</div>
            <div class="valor">${escaparHtml(ativoObservacao)}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="box">
      <h2>Descrição do orçamento</h2>
      <div class="desc-compacta">
        <div class="campo">
          <div class="label">Descrição</div>
          <div class="valor">${escaparHtml(orcamento.descricao)}</div>
        </div>
        <div class="campo">
          <div class="label">Observação</div>
          <div class="valor">${escaparHtml(orcamento.observacao || '-')}</div>
        </div>
      </div>
    </section>

    <section class="box">
      <h2>Serviços</h2>
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th class="num">Qtd</th>
            <th class="num">Unitário</th>
            <th class="num">Bruto</th>
            <th class="num">Desc.</th>
            <th class="num">Líquido</th>
          </tr>
        </thead>
        <tbody>${linhasServicos}</tbody>
      </table>
    </section>

    <section class="box">
      <h2>Produtos / peças</h2>
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th class="num">Qtd</th>
            <th class="num">Unitário</th>
            <th class="num">Bruto</th>
            <th class="num">Desc.</th>
            <th class="num">Líquido</th>
          </tr>
        </thead>
        <tbody>${linhasProdutos}</tbody>
      </table>
    </section>

    <section class="resumo-final">
      <div class="observacoes">
        <p><strong>Condições e observações:</strong></p>
        <p>${escaparHtml(textoRodape)}</p>
        <p>Produtos/peças descritos neste orçamento não representam baixa de estoque. A movimentação definitiva ocorre conforme regra operacional da ordem de serviço.</p>
      </div>

      <div class="totais">
        <div class="linha">
          <span>Serviços</span>
          <strong>${moeda(orcamento.valor_servicos)}</strong>
        </div>
        <div class="linha">
          <span>Produtos / peças</span>
          <strong>${moeda(orcamento.valor_produtos)}</strong>
        </div>
        <div class="linha">
          <span>Desconto</span>
          <strong>${moeda(orcamento.valor_desconto)}</strong>
        </div>
        <div class="linha final">
          <span>Total líquido</span>
          <strong>${moeda(orcamento.valor_total)}</strong>
        </div>
      </div>
    </section>

    <section class="assinaturas">
      <div class="assinatura">${escaparHtml(nomeEmpresa)}</div>
      <div class="assinatura">${escaparHtml(clienteNome)}</div>
    </section>

    <footer class="rodape">
      Documento emitido pelo ServiçoPro ERP em ${escaparHtml(new Date().toLocaleString('pt-BR'))}.
    </footer>
  </div>

  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>
    `;
  }


  async function gerarOrdemServicoDoOrcamento() {
    if (!token || !orcamentoSelecionado) {
      setErro('Selecione um orçamento para gerar a OS.');
      return;
    }

    if (ordemServicoVinculadaAoOrcamento) {
      setSucesso(`Este orçamento já possui OS vinculada: ${ordemServicoVinculadaAoOrcamento.numero || `OS-${ordemServicoVinculadaAoOrcamento.id}`}.`);
      return;
    }

    if (!orcamentoAprovado) {
      setErro('Somente orçamento aprovado pode gerar OS.');
      return;
    }

    if (orcamentoReprovado || orcamentoCancelado) {
      setErro('Orçamento reprovado ou cancelado não pode gerar OS.');
      return;
    }

    if (numero(orcamentoSelecionado.valor_total, 0) <= 0) {
      setErro('Orçamento com valor total zero não pode gerar OS.');
      return;
    }

    const confirmado = await mostrarModalOrcamento({
      titulo: 'Gerar OS a partir deste orçamento?',
      mensagem: 'A OS será criada vinculada a este orçamento, copiando cliente, ativo, valores e itens aprovados. Produtos copiados para a OS não baixam estoque; a baixa real continua acontecendo somente na requisição da OS.',
      badge: 'Confirmação',
      textoConfirmar: 'Gerar OS',
      textoCancelar: 'Voltar',
      tipo: 'aviso',
    });

    if (!confirmado) return;

    setCarregando(true);
    setErro('');
    setSucesso('');

    try {
      const resposta = await fetch(`${API_BASE}/orcamentos/${orcamentoSelecionado.id}/gerar-os`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const textoResposta = await resposta.text();
      let corpo: any = null;

      try {
        corpo = textoResposta ? JSON.parse(textoResposta) : null;
      } catch {
        corpo = textoResposta;
      }

      if (!resposta.ok) {
        setErro(typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao gerar OS a partir do orçamento.');
        return;
      }

      const osGerada = corpo?.ordemServico;
      setSucesso(corpo?.mensagem || 'OS gerada com sucesso a partir do orçamento.');

      await carregarTudo();
      onOrcamentosAtualizados();

      if (osGerada?.id) {
        setTimeout(() => {
          setSucesso(`OS ${osGerada.numero || `OS-${osGerada.id}`} vinculada ao orçamento com sucesso.`);
        }, 120);
      }
    } catch {
      setErro('Falha de conexão ao gerar OS a partir do orçamento.');
    } finally {
      setCarregando(false);
    }
  }

  async function aprovarOrdemServico() {
    if (!ordemServicoVinculadaAoOrcamento) {
      setErro('Não há OS vinculada a este orçamento para aprovar.');
      return;
    }

    setCarregando(true);
    setErro('');
    setSucesso('');

    try {
      const resposta = await fetch(`${API_BASE}/ordens-servico/${ordemServicoVinculadaAoOrcamento.id}/aprovar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const corpo: any = await interpretarResposta(resposta);

      if (!resposta.ok) {
        setErro(typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao aprovar OS.');
        return;
      }

      setSucesso(corpo?.mensagem || 'OS aprovada com sucesso.');
      await carregarTudo();
    } catch {
      setErro('Falha de conexão ao aprovar OS.');
    } finally {
      setCarregando(false);
    }
  }

  async function imprimirOrcamento(idInformado?: number) {
    const id = idInformado ?? Number(orcamentoSelecionadoId);
    const orcamento =
      orcamentosAtualizados.find((item) => item.id === id) ||
      orcamentos.find((item) => item.id === id);

    if (!orcamento) {
      setErro('Selecione um orçamento para imprimir.');
      return;
    }

    setErro('');
    setSucesso('');

    const empresa = await carregarEmpresaEmissora();

    if (!empresa) {
      setErro('Não foi possível carregar os dados da empresa emissora. Confira a tela Configurações.');
      return;
    }

    const html = montarHtmlImpressaoOrcamento(orcamento, empresa);
    const janela = window.open('', '_blank', 'width=1040,height=760');

    if (!janela) {
      setErro('O navegador bloqueou a janela de impressão. Permita pop-ups para este site.');
      return;
    }

    janela.document.open();
    janela.document.write(html);
    janela.document.close();

    setSucesso('Orçamento enviado para impressão.');
  }

  function formatarMoedaCampo(valor: unknown) {
    return numero(valor, 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatarPercentualCampo(valor: unknown) {
    return numero(valor, 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  function calcularValoresItemComDesconto(
    quantidadeValor: unknown,
    valorUnitarioValor: unknown,
    descontoPercentualValor: unknown,
    descontoValorValor: unknown,
  ) {
    const quantidade = decimal(quantidadeValor || '1') || 1;
    const valorUnitario = decimal(valorUnitarioValor);
    const valorTotal = quantidade * valorUnitario;
    let descontoPercentual = decimal(descontoPercentualValor);
    let descontoValor = decimal(descontoValorValor);

    if (descontoPercentual < 0) descontoPercentual = 0;
    if (descontoPercentual > 100) descontoPercentual = 100;
    if (descontoValor < 0) descontoValor = 0;

    if (descontoPercentual > 0 && descontoValor <= 0) {
      descontoValor = valorTotal * descontoPercentual / 100;
    }

    if (descontoValor > valorTotal) descontoValor = valorTotal;

    if (descontoValor > 0 && descontoPercentual <= 0 && valorTotal > 0) {
      descontoPercentual = descontoValor / valorTotal * 100;
    }

    const valorLiquido = Math.max(0, valorTotal - descontoValor);

    return {
      valor_total: formatarMoedaCampo(valorTotal),
      desconto_percentual: formatarPercentualCampo(descontoPercentual),
      desconto_valor: formatarMoedaCampo(descontoValor),
      valor_liquido: formatarMoedaCampo(valorLiquido),
    };
  }

  function valorLiquidoItem(item: ItemServicoOrcamento | ItemProdutoOrcamento) {
    return numero(item.valor_liquido ?? item.valor_total, 0);
  }

  function normalizarValoresServico() {
    setServicoForm((atual) => ({
      ...atual,
      valor_unitario: formatarMoedaCampo(atual.valor_unitario),
      desconto_percentual: formatarPercentualCampo(atual.desconto_percentual),
      desconto_valor: formatarMoedaCampo(atual.desconto_valor),
      ...calcularValoresItemComDesconto(atual.quantidade, atual.valor_unitario, atual.desconto_percentual, atual.desconto_valor),
    }));
  }

  function normalizarValoresProduto() {
    setProdutoForm((atual) => ({
      ...atual,
      valor_unitario: formatarMoedaCampo(atual.valor_unitario),
      desconto_percentual: formatarPercentualCampo(atual.desconto_percentual),
      desconto_valor: formatarMoedaCampo(atual.desconto_valor),
      ...calcularValoresItemComDesconto(atual.quantidade, atual.valor_unitario, atual.desconto_percentual, atual.desconto_valor),
    }));
  }

  function selecionarServico(servicoId: string) {
    const servico = cadastros.servicos.find((item) => String(item.id) === servicoId);
    const valor = precoServico(servico);

    setServicoForm((atual) => ({
      ...atual,
      servico_id: servicoId,
      descricao: servico ? nomeCadastro(servico) : '',
      valor_unitario: formatarMoedaCampo(valor),
      ...calcularValoresItemComDesconto(atual.quantidade || '1', valor, '0', '0'),
    }));
  }

  function alterarQuantidadeServico(quantidade: string) {
    setServicoForm((atual) => ({
      ...atual,
      quantidade,
      ...calcularValoresItemComDesconto(quantidade || '1', atual.valor_unitario, atual.desconto_percentual, atual.desconto_valor),
    }));
  }

  function selecionarProduto(produtoId: string) {
    const produto = cadastros.produtos.find((item) => String(item.id) === produtoId);
    const valor = precoProduto(produto);

    setProdutoForm((atual) => ({
      ...atual,
      produto_id: produtoId,
      descricao: produto ? nomeCadastro(produto) : '',
      valor_unitario: formatarMoedaCampo(valor),
      ...calcularValoresItemComDesconto(atual.quantidade || '1', valor, '0', '0'),
    }));
  }

  function alterarQuantidadeProduto(quantidade: string) {
    setProdutoForm((atual) => ({
      ...atual,
      quantidade,
      ...calcularValoresItemComDesconto(quantidade || '1', atual.valor_unitario, atual.desconto_percentual, atual.desconto_valor),
    }));
  }

  function salvarItemServico() {
    if (!orcamentoSelecionadoId) {
      setErro('Selecione um orçamento.');
      return;
    }

    if (itensBloqueados) {
      mostrarAvisoAlteracaoOrcamento();
      return;
    }

    if (!servicoForm.descricao.trim()) {
      setErro('Informe ou selecione um serviço.');
      return;
    }

    const payload = {
      orcamento_id: numero(orcamentoSelecionadoId),
      servico_id: servicoForm.servico_id ? numero(servicoForm.servico_id) : null,
      descricao: servicoForm.descricao,
      quantidade: decimal(servicoForm.quantidade),
      valor_unitario: decimal(servicoForm.valor_unitario),
      valor_total: decimal(servicoForm.valor_total),
      desconto_percentual: decimal(servicoForm.desconto_percentual),
      desconto_valor: decimal(servicoForm.desconto_valor),
      valor_liquido: decimal(servicoForm.valor_liquido),
      observacao: servicoForm.observacao || null,
      ativo: 1,
    };

    if (itemServicoEditandoId) {
      putJson(`/orcamentos-itens-servicos/${itemServicoEditandoId}`, payload, 'servicos');
      return;
    }

    postJson('/orcamentos-itens-servicos', payload, 'servicos');
  }

  function salvarItemProduto() {
    if (!orcamentoSelecionadoId) {
      setErro('Selecione um orçamento.');
      return;
    }

    if (itensBloqueados) {
      mostrarAvisoAlteracaoOrcamento();
      return;
    }

    if (!produtoForm.descricao.trim()) {
      setErro('Informe ou selecione um produto.');
      return;
    }

    const payload = {
      orcamento_id: numero(orcamentoSelecionadoId),
      produto_id: produtoForm.produto_id ? numero(produtoForm.produto_id) : null,
      descricao: produtoForm.descricao,
      quantidade: decimal(produtoForm.quantidade),
      valor_unitario: decimal(produtoForm.valor_unitario),
      valor_total: decimal(produtoForm.valor_total),
      desconto_percentual: decimal(produtoForm.desconto_percentual),
      desconto_valor: decimal(produtoForm.desconto_valor),
      valor_liquido: decimal(produtoForm.valor_liquido),
      observacao: produtoForm.observacao || null,
      ativo: 1,
    };

    if (itemProdutoEditandoId) {
      putJson(`/orcamentos-itens-produtos/${itemProdutoEditandoId}`, payload, 'produtos');
      return;
    }

    postJson('/orcamentos-itens-produtos', payload, 'produtos');
  }

  function editarServico(item: ItemServicoOrcamento) {
    if (itensBloqueados) {
      mostrarAvisoAlteracaoOrcamento();
      return;
    }

    setErro('');
    setSucesso('');
    setAbaAtiva('servicos');
    setItemServicoEditandoId(item.id);
    setItemProdutoEditandoId(null);
    setServicoForm({
      servico_id: item.servico_id ? String(item.servico_id) : '',
      descricao: item.descricao || '',
      quantidade: String(item.quantidade ?? 1),
      valor_unitario: formatarMoedaCampo(item.valor_unitario ?? 0),
      valor_total: formatarMoedaCampo(item.valor_total ?? 0),
      desconto_percentual: formatarPercentualCampo(item.desconto_percentual ?? 0),
      desconto_valor: formatarMoedaCampo(item.desconto_valor ?? 0),
      valor_liquido: formatarMoedaCampo(item.valor_liquido ?? item.valor_total ?? 0),
      observacao: item.observacao || '',
    });
    setPainelAdicionarAberto(true);
  }

  function editarProduto(item: ItemProdutoOrcamento) {
    if (itensBloqueados) {
      mostrarAvisoAlteracaoOrcamento();
      return;
    }

    setErro('');
    setSucesso('');
    setAbaAtiva('produtos');
    setItemProdutoEditandoId(item.id);
    setItemServicoEditandoId(null);
    setProdutoForm({
      produto_id: item.produto_id ? String(item.produto_id) : '',
      descricao: item.descricao || '',
      quantidade: String(item.quantidade ?? 1),
      valor_unitario: formatarMoedaCampo(item.valor_unitario ?? 0),
      valor_total: formatarMoedaCampo(item.valor_total ?? 0),
      desconto_percentual: formatarPercentualCampo(item.desconto_percentual ?? 0),
      desconto_valor: formatarMoedaCampo(item.desconto_valor ?? 0),
      valor_liquido: formatarMoedaCampo(item.valor_liquido ?? item.valor_total ?? 0),
      observacao: item.observacao || '',
    });
    setPainelAdicionarAberto(true);
  }

  async function excluirServico(item: ItemServicoOrcamento) {
    if (itensBloqueados) {
      mostrarAvisoAlteracaoOrcamento();
      return;
    }

    const confirmado = await mostrarModalOrcamento({
      titulo: 'Excluir serviço do orçamento?',
      badge: 'Confirmação',
      tipo: 'perigo',
      mensagem: `O serviço "${item.descricao}" será removido deste orçamento e os totais serão recalculados. Esta ação não pode ser desfeita automaticamente.`,
      textoConfirmar: 'Excluir serviço',
      textoCancelar: 'Voltar',
    });

    if (!confirmado) return;

    setExcluindoItem(`servico-${item.id}`);
    deleteJson(
      `/orcamentos-itens-servicos/${item.id}`,
      'Serviço excluído do orçamento e totais recalculados.',
      'servicos',
      item.id,
    );
  }

  async function excluirProduto(item: ItemProdutoOrcamento) {
    if (itensBloqueados) {
      mostrarAvisoAlteracaoOrcamento();
      return;
    }

    const confirmado = await mostrarModalOrcamento({
      titulo: 'Excluir produto/peça do orçamento?',
      badge: 'Confirmação',
      tipo: 'perigo',
      mensagem: `O produto/peça "${item.descricao}" será removido deste orçamento e os totais serão recalculados. O estoque não será alterado por esta exclusão.`,
      textoConfirmar: 'Excluir produto',
      textoCancelar: 'Voltar',
    });

    if (!confirmado) return;

    setExcluindoItem(`produto-${item.id}`);
    deleteJson(
      `/orcamentos-itens-produtos/${item.id}`,
      'Produto excluído do orçamento e totais recalculados. Estoque não foi alterado.',
      'produtos',
      item.id,
    );
  }

  function abrirPainelAdicionar(tipo: AbaItens) {
    setAbaAtiva(tipo);
    setPainelAdicionarAberto(true);
  }

  function alternarPainelAdicionar(tipo: AbaItens) {
    if (itensBloqueados) {
      mostrarAvisoAlteracaoOrcamento();
      return;
    }

    setAbaAtiva(tipo);
    if (tipo === 'servicos') limparServicoForm();
    if (tipo === 'produtos') limparProdutoForm();
    setPainelAdicionarAberto((aberto) => (abaAtiva === tipo ? !aberto : true));
  }

  return (
    <section className="card" id="lista-orcamentos-itens">
      <div className="ct">
        <div>
          <h3>
              {orcamentoSelecionado ? 'Resumo do orçamento' : 'Orçamentos'}
              {orcamentoSelecionado && (
                <span className={`badge ${badgeClasse(orcamentoSelecionado.status)}`} style={{ marginLeft: 8 }}>
                  {orcamentoSelecionado.status}
                </span>
              )}
            </h3>
          <p>
            {orcamentoSelecionado
              ? 'Resumo, valores e itens do orçamento selecionado.'
              : 'Consulte, filtre e acompanhe os orçamentos.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {orcamentoSelecionado ? (
            <button className="btn bo bsm" onClick={voltarParaLista}>
              ← Voltar para orçamentos
            </button>
          ) : (
            <button className="btn bp bsm" onClick={abrirNovoOrcamento}>
              + Criar orçamento
            </button>
          )}

          <button className="btn bo bsm" onClick={carregarTudo} disabled={carregando}>
            {carregando ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {erro && (
        <div className="ins am" style={{ marginBottom: 14 }}>
          <strong>Atenção:</strong> {erro}
        </div>
      )}

      {sucesso && (
        <div className="ins gr" style={{ marginBottom: 14 }}>
          <strong>OK:</strong> {sucesso}
        </div>
      )}
      {!orcamentoSelecionado && (
        <>
          <FiltrosListaOrcamentos
            filtros={filtrosOrcamentoLista}
            totalFiltrado={orcamentosFiltrados.length}
            totalGeral={orcamentosAtualizados.filter((item) => item.ativo !== 0).length}
            onAlterar={(campo, valor) => setFiltrosOrcamentoLista((atual) => ({ ...atual, [campo]: valor }))}
            onLimpar={() => setFiltrosOrcamentoLista({
              tipoData: 'orcamento',
              dataInicial: '',
              dataFinal: '',
              validadeInicial: '',
              validadeFinal: '',
              aprovacaoInicial: '',
              aprovacaoFinal: '',
              cliente: '',
              placa: '',
              descricao: '',
              status: 'todos',
            })}
          />

          <TabelaOrcamentosOperacional
            dados={orcamentosFiltrados}
            clientes={cadastros.clientes}
            ativos={cadastros.ativos}
            validadeDias={validadeDiasLista}
            ordemGrid={ordemGridOrcamento}
            onOrdenar={(coluna) => {
              setOrdemGridOrcamento((atual) => ({
                coluna,
                direcao: atual.coluna === coluna && atual.direcao === 'asc' ? 'desc' : 'asc',
              }));
            }}
            onSelecionar={selecionarOrcamento}
            onImprimir={imprimirOrcamento}
            onAprovar={aprovarOrcamento}
            carregando={carregando}
          />

          <div className="ins">
            <strong>Orientação:</strong> selecione um orçamento para consultar, imprimir ou manter itens.
          </div>
        </>
      )}


      {orcamentoSelecionado && (
        <div id="painel-itens-orcamento">
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="ct">
              <div>
                <h3>
                  {texto(orcamentoSelecionado.numero, `ORC-${orcamentoSelecionado.id}`)} — {orcamentoSelecionado.descricao || 'Sem descrição'}
                  <span className={`badge ${badgeClasse(orcamentoSelecionado.status)}`} style={{ marginLeft: 8 }}>{orcamentoSelecionado.status}</span>
                </h3>
                <p>
                  {totalItensAtivos} item(ns) ativo(s). Produtos no orçamento não baixam estoque.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {ordemServicoVinculadaAoOrcamento && osPodeSerAprovada && (
                  <button className="btn bg bsm" onClick={aprovarOrdemServico} disabled={carregando}>
                    Aprovar OS
                  </button>
                )}
                {!orcamentoFinalizado && (
                  <button
                    className={orcamentoPodeSerAprovado ? 'btn bg bsm' : 'btn bo bsm'}
                    onClick={() => aprovarOrcamento()}
                    disabled={carregando}
                    title={
                      totalItensAtivos <= 0 || numero(orcamentoSelecionado.valor_total, 0) <= 0
                        ? 'Ao clicar, o sistema avisará que orçamento sem itens ou com valor zerado não pode ser aprovado.'
                        : 'Aprovar este orçamento.'
                    }
                  >
                    Aprovar orçamento
                  </button>
                )}
                {!orcamentoAprovado && !orcamentoReprovado && !orcamentoCancelado && (
                  <button className="btn bd bsm" onClick={() => reprovarOrcamento()} disabled={carregando}>
                    Reprovar orçamento
                  </button>
                )}

                {orcamentoAprovado && !ordemServicoVinculadaAoOrcamento && !orcamentoReprovado && !orcamentoCancelado && (
                  <button
                    className="btn bg bsm"
                    type="button"
                    onClick={gerarOrdemServicoDoOrcamento}
                    disabled={carregando || !orcamentoSelecionadoId || numero(orcamentoSelecionado.valor_total, 0) <= 0}
                    title="Criar uma OS vinculada a este orçamento aprovado."
                  >
                    Gerar OS
                  </button>
                )}

                {ordemServicoVinculadaAoOrcamento && (
                  <button
                    className="btn bo bsm"
                    type="button"
                    disabled
                    title="Este orçamento já possui OS vinculada."
                  >
                    OS vinculada
                  </button>
                )}

                {orcamentoPodeSerCanceladoVisualmente && (
                  <button className="btn bd bsm" onClick={cancelarOrcamento} disabled={carregando}>
                    Cancelar orçamento
                  </button>
                )}
                <button className="btn bo bsm" onClick={() => imprimirOrcamento()} disabled={carregando || !orcamentoSelecionadoId}>
                  Imprimir orçamento
                </button>
                {!orcamentoFinalizado && (
                  <button className="btn bo bsm" onClick={recalcularOrcamento} disabled={carregando || !orcamentoSelecionadoId}>
                    {carregando ? 'Recalculando...' : 'Recalcular'}
                  </button>
                )}
              </div>
            </div>

            <div className="orc-contexto-grid">
              <div className="orc-contexto-card">
                <div className="orc-contexto-titulo">
                  <span>Cliente</span>
                  <strong>
                    {clienteDoOrcamentoSelecionado ? nomeCadastro(clienteDoOrcamentoSelecionado) : 'Cliente não vinculado'}
                  </strong>
                </div>
                <div className="orc-contexto-linhas">
                  <LinhaContextoOrcamento
                    label="Documento"
                    valor={valorCampo(clienteDoOrcamentoSelecionado, ['documento', 'cpf_cnpj', 'cpf', 'cnpj', 'identificacao_fiscal'], 'Não informado')}
                  />
                  <LinhaContextoOrcamento
                    label="Telefone"
                    valor={valorCampo(clienteDoOrcamentoSelecionado, ['telefone', 'celular', 'whatsapp', 'fone'], 'Não informado')}
                  />
                  <LinhaContextoOrcamento
                    label="E-mail"
                    valor={valorCampo(clienteDoOrcamentoSelecionado, ['email'], 'Não informado')}
                  />
                </div>
              </div>

              <div className="orc-contexto-card">
                <div className="orc-contexto-titulo">
                  <span>Veículo / ativo</span>
                  <strong>
                    {ativoDoOrcamentoSelecionado ? nomeCadastro(ativoDoOrcamentoSelecionado) : 'Ativo não vinculado'}
                  </strong>
                </div>
                <div className="orc-contexto-linhas">
                  <LinhaContextoOrcamento
                    label="Identificação"
                    valor={valorCampo(ativoDoOrcamentoSelecionado, ['identificacao', 'placa', 'serie', 'chassi'], 'Não informado')}
                  />
                  <LinhaContextoOrcamento
                    label="Marca / modelo"
                    valor={[valorCampo(ativoDoOrcamentoSelecionado, ['marca'], ''), valorCampo(ativoDoOrcamentoSelecionado, ['modelo'], '')].filter(Boolean).join(' / ') || 'Não informado'}
                  />
                  <LinhaContextoOrcamento
                    label="Ano / status"
                    valor={[valorCampo(ativoDoOrcamentoSelecionado, ['ano', 'ano_modelo', 'ano_fabricacao'], ''), valorCampo(ativoDoOrcamentoSelecionado, ['status'], '')].filter(Boolean).join(' · ') || 'Não informado'}
                  />
                </div>
              </div>
            </div>

            <div className="orc-resumo-grid">
              <ResumoValorOrcamento label="Serviços" valor={orcamentoSelecionado.valor_servicos} />
              <ResumoValorOrcamento label="Produtos" valor={orcamentoSelecionado.valor_produtos} />
              <ResumoValorOrcamento label="Desconto" valor={orcamentoSelecionado.valor_desconto} />
              <ResumoValorOrcamento label="Total" valor={orcamentoSelecionado.valor_total} destaque />
            </div>
          </div>

          {itensBloqueadosPorStatusOrcamento && (
            <div className="ins am orc-aviso-finalizado" style={{ marginBottom: 14 }}>
              <strong>Orçamento finalizado:</strong> este orçamento está {orcamentoSelecionado.status?.toLowerCase() || 'finalizado'} e não permite recalcular, incluir, alterar ou excluir itens. Use imprimir ou volte para a lista.
            </div>
          )}

          {itensBloqueadosPorOrdemServico && (
            <div className="ins am" style={{ marginBottom: 14 }}>
              <strong>Itens bloqueados:</strong> existe OS vinculada com status {ordemServicoVinculadaAoOrcamento?.status}. Não é permitido alterar serviços/produtos nesta situação.
            </div>
          )}

          <div className="orc-itens-header">
            <div>
              <h3>Itens do orçamento</h3>
              <p>{orcamentoFinalizado ? 'Itens disponíveis apenas para consulta.' : 'Serviços e produtos do orçamento.'}</p>
            </div>
            {!itensBloqueados && (
              <div className="orc-itens-acoes">
                <button
                  className={abaAtiva === 'servicos' && painelAdicionarAberto ? 'btn bp bsm' : 'btn ba bsm'}
                  onClick={() => alternarPainelAdicionar('servicos')}
                  disabled={carregando}
                >
                  {abaAtiva === 'servicos' && painelAdicionarAberto ? 'Recolher serviço' : '+ Adicionar serviço'}
                </button>
                <button
                  className={abaAtiva === 'produtos' && painelAdicionarAberto ? 'btn bp bsm' : 'btn ba bsm'}
                  onClick={() => alternarPainelAdicionar('produtos')}
                  disabled={carregando}
                >
                  {abaAtiva === 'produtos' && painelAdicionarAberto ? 'Recolher produto/peça' : '+ Adicionar produto/peça'}
                </button>
              </div>
            )}
          </div>

          <div className="orc-itens-grid">
            <div className="card orc-card-lista-itens">
              <div className="ct">
                <div>
                  <h3>Serviços lançados</h3>
                  <p>{itensServicosDoOrcamento.length} serviço(s) ativo(s). Exclusão recalcula o orçamento.</p>
                </div>
              </div>

              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>Serviço</th>
                      <th>Qtd</th>
                      <th>Unitário</th>
                      <th>Bruto</th>
                      <th>Desc.</th>
                      <th>Líquido</th>
                      {!itensBloqueados && <th>Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {itensServicosDoOrcamento.length === 0 ? (
                      <tr>
                        <td colSpan={itensBloqueados ? 6 : 7}>Nenhum serviço adicionado.</td>
                      </tr>
                    ) : (
                      itensServicosDoOrcamento.map((item) => (
                        <tr key={item.id}>
                          <td>{item.descricao}</td>
                          <td>{item.quantidade}</td>
                          <td>{moeda(item.valor_unitario)}</td>
                          <td>{moeda(item.valor_total)}</td>
                          <td>{moeda(item.desconto_valor ?? 0)}</td>
                          <td>{moeda(valorLiquidoItem(item))}</td>
                          {!itensBloqueados && (
                            <td>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button
                                  className="btn ba bsm"
                                  onClick={() => editarServico(item)}
                                  disabled={carregando}
                                >
                                  Alterar
                                </button>
                                <button
                                  className="btn bd bsm"
                                  onClick={() => excluirServico(item)}
                                  disabled={carregando || excluindoItem === `servico-${item.id}`}
                                >
                                  {excluindoItem === `servico-${item.id}` ? 'Excluindo...' : 'Excluir'}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card orc-card-lista-itens">
              <div className="ct">
                <div>
                  <h3>Produtos/peças lançados</h3>
                  <p>{itensProdutosDoOrcamento.length} produto(s) ativo(s). Exclusão não altera estoque.</p>
                </div>
              </div>

              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>Produto/peça</th>
                      <th>Qtd</th>
                      <th>Unitário</th>
                      <th>Bruto</th>
                      <th>Desc.</th>
                      <th>Líquido</th>
                      {!itensBloqueados && <th>Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {itensProdutosDoOrcamento.length === 0 ? (
                      <tr>
                        <td colSpan={itensBloqueados ? 6 : 7}>Nenhum produto adicionado.</td>
                      </tr>
                    ) : (
                      itensProdutosDoOrcamento.map((item) => (
                        <tr key={item.id}>
                          <td>{item.descricao}</td>
                          <td>{item.quantidade}</td>
                          <td>{moeda(item.valor_unitario)}</td>
                          <td>{moeda(item.valor_total)}</td>
                          <td>{moeda(item.desconto_valor ?? 0)}</td>
                          <td>{moeda(valorLiquidoItem(item))}</td>
                          {!itensBloqueados && (
                            <td>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button
                                  className="btn ba bsm"
                                  onClick={() => editarProduto(item)}
                                  disabled={carregando}
                                >
                                  Alterar
                                </button>
                                <button
                                  className="btn bd bsm"
                                  onClick={() => excluirProduto(item)}
                                  disabled={carregando || excluindoItem === `produto-${item.id}`}
                                >
                                  {excluindoItem === `produto-${item.id}` ? 'Excluindo...' : 'Excluir'}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {abaAtiva === 'servicos' && painelAdicionarAberto && (
            <div className="card orc-card-adicionar" style={{ marginBottom: 14 }}>
              <div className="ct">
                <div>
                  <h3>{itemServicoEditandoId ? 'Alterar serviço' : 'Adicionar serviço'}</h3>
                  <p>{itemServicoEditandoId ? 'Altere quantidade, valor ou desconto e salve para recalcular o orçamento.' : 'Inclua o serviço no orçamento. Feche esta janela para voltar à lista de itens.'}</p>
                </div>
              </div>

              <div className="orc-form-compacto">
                <div className="field">
                  <label className="lbl">Serviço cadastrado</label>
                  <select className="inp" value={servicoForm.servico_id} onChange={(event) => selecionarServico(event.target.value)}>
                    <option value="">Selecione...</option>
                    {cadastros.servicos
                      .filter((item) => item.ativo !== 0)
                      .map((servico) => (
                        <option key={servico.id} value={servico.id}>
                          {nomeCadastro(servico)} - {moeda(precoServico(servico))}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="field">
                  <label className="lbl">Descrição</label>
                  <input
                    className="inp"
                    value={servicoForm.descricao}
                    onChange={(event) => setServicoForm((atual) => ({ ...atual, descricao: event.target.value }))}
                  />
                </div>

                <div className="orc-form-valores orc-form-valores-desconto">
                  <div className="field">
                    <label className="lbl">Quantidade</label>
                    <input className="inp" value={servicoForm.quantidade} onChange={(event) => alterarQuantidadeServico(event.target.value)} />
                  </div>
                  <div className="field">
                    <label className="lbl">Valor unitário</label>
                    <input
                      className="inp"
                      value={servicoForm.valor_unitario}
                      onChange={(event) =>
                        setServicoForm((atual) => ({
                          ...atual,
                          valor_unitario: event.target.value,
                          ...calcularValoresItemComDesconto(atual.quantidade, event.target.value, atual.desconto_percentual, atual.desconto_valor),
                        }))
                      }
                    
                      onBlur={normalizarValoresServico}/>
                  </div>
                  <div className="field">
                    <label className="lbl">Bruto</label>
                    <input className="inp" value={servicoForm.valor_total} readOnly />
                  </div>
                  <div className="field">
                    <label className="lbl">Desc. %</label>
                    <input
                      className="inp"
                      value={servicoForm.desconto_percentual}
                      onChange={(event) =>
                        setServicoForm((atual) => ({
                          ...atual,
                          desconto_valor: '0,00',
                          ...calcularValoresItemComDesconto(atual.quantidade, atual.valor_unitario, event.target.value, '0'),
                        }))
                      }
                    
                      onBlur={normalizarValoresServico}/>
                  </div>
                  <div className="field">
                    <label className="lbl">Desc. R$</label>
                    <input
                      className="inp"
                      value={servicoForm.desconto_valor}
                      onChange={(event) =>
                        setServicoForm((atual) => ({
                          ...atual,
                          desconto_percentual: '0',
                          ...calcularValoresItemComDesconto(atual.quantidade, atual.valor_unitario, '0', event.target.value),
                        }))
                      }
                    
                      onBlur={normalizarValoresServico}/>
                  </div>
                  <div className="field">
                    <label className="lbl">Líquido</label>
                    <input className="inp" value={servicoForm.valor_liquido} readOnly />
                  </div>
                </div>
              </div>

              <div className="orc-form-acoes">
                <button className="btn bp" onClick={salvarItemServico} disabled={carregando || !orcamentoSelecionadoId}>
                  {carregando ? 'Salvando...' : itemServicoEditandoId ? 'Salvar alteração' : '+ Adicionar serviço'}
                </button>
                <button className="btn bo" onClick={limparServicoForm} disabled={carregando}>
                  Limpar
                </button>
                <button className="btn bo" onClick={() => setPainelAdicionarAberto(false)} disabled={carregando}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {abaAtiva === 'produtos' && painelAdicionarAberto && (
            <div className="card orc-card-adicionar" style={{ marginBottom: 14 }}>
              <div className="ct">
                <div>
                  <h3>{itemProdutoEditandoId ? 'Alterar produto/peça' : 'Adicionar produto/peça'}</h3>
                  <p>{itemProdutoEditandoId ? 'Altere quantidade, valor ou desconto e salve para recalcular o orçamento.' : 'Inclua o produto previsto no orçamento. A baixa real ocorre apenas na requisição da OS.'}</p>
                </div>
              </div>

              <div className="orc-form-compacto">
                <div className="field">
                  <label className="lbl">Produto cadastrado</label>
                  <select className="inp" value={produtoForm.produto_id} onChange={(event) => selecionarProduto(event.target.value)}>
                    <option value="">Selecione...</option>
                    {cadastros.produtos
                      .filter((item) => item.ativo !== 0)
                      .map((produto) => (
                        <option key={produto.id} value={produto.id}>
                          {nomeCadastro(produto)} - {moeda(precoProduto(produto))}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="field">
                  <label className="lbl">Descrição</label>
                  <input
                    className="inp"
                    value={produtoForm.descricao}
                    onChange={(event) => setProdutoForm((atual) => ({ ...atual, descricao: event.target.value }))}
                  />
                </div>

                <div className="orc-form-valores orc-form-valores-desconto">
                  <div className="field">
                    <label className="lbl">Quantidade</label>
                    <input className="inp" value={produtoForm.quantidade} onChange={(event) => alterarQuantidadeProduto(event.target.value)} />
                  </div>
                  <div className="field">
                    <label className="lbl">Valor unitário</label>
                    <input
                      className="inp"
                      value={produtoForm.valor_unitario}
                      onChange={(event) =>
                        setProdutoForm((atual) => ({
                          ...atual,
                          valor_unitario: event.target.value,
                          ...calcularValoresItemComDesconto(atual.quantidade, event.target.value, atual.desconto_percentual, atual.desconto_valor),
                        }))
                      }
                    
                      onBlur={normalizarValoresProduto}/>
                  </div>
                  <div className="field">
                    <label className="lbl">Bruto</label>
                    <input className="inp" value={produtoForm.valor_total} readOnly />
                  </div>
                  <div className="field">
                    <label className="lbl">Desc. %</label>
                    <input
                      className="inp"
                      value={produtoForm.desconto_percentual}
                      onChange={(event) =>
                        setProdutoForm((atual) => ({
                          ...atual,
                          desconto_valor: '0,00',
                          ...calcularValoresItemComDesconto(atual.quantidade, atual.valor_unitario, event.target.value, '0'),
                        }))
                      }
                    
                      onBlur={normalizarValoresProduto}/>
                  </div>
                  <div className="field">
                    <label className="lbl">Desc. R$</label>
                    <input
                      className="inp"
                      value={produtoForm.desconto_valor}
                      onChange={(event) =>
                        setProdutoForm((atual) => ({
                          ...atual,
                          desconto_percentual: '0',
                          ...calcularValoresItemComDesconto(atual.quantidade, atual.valor_unitario, '0', event.target.value),
                        }))
                      }
                    
                      onBlur={normalizarValoresProduto}/>
                  </div>
                  <div className="field">
                    <label className="lbl">Líquido</label>
                    <input className="inp" value={produtoForm.valor_liquido} readOnly />
                  </div>
                </div>
              </div>

              <div className="orc-form-acoes">
                <button className="btn bp" onClick={salvarItemProduto} disabled={carregando || !orcamentoSelecionadoId}>
                  {carregando ? 'Salvando...' : itemProdutoEditandoId ? 'Salvar alteração' : '+ Adicionar produto/peça'}
                </button>
                <button className="btn bo" onClick={limparProdutoForm} disabled={carregando}>
                  Limpar
                </button>
                <button className="btn bo" onClick={() => setPainelAdicionarAberto(false)} disabled={carregando}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
