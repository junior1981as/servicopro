import React, { useEffect, useMemo, useState } from 'react';

type Props = {
  token: string;
  cadastros: {
    clientes: any[];
    ativos: any[];
    produtos: any[];
    servicos: any[];
  };
  operacao: {
    agendamentos: any[];
    orcamentos: any[];
    ordens: any[];
  };
  busca: string;
  osAtivaId?: string;
};

const API_BASE = '/api';

type ApiLista<T> = {
  status: string;
  total: number;
  dados: T[];
};

type ItemServico = {
  id: number;
  ordem_servico_id: number;
  servico_id?: number | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  status: string;
};

type ItemProduto = {
  id: number;
  ordem_servico_id: number;
  produto_id?: number | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  status: string;
};

type RequisicaoEstoque = {
  id: number;
  ordem_servico_id: number;
  produto_id: number;
  quantidade_solicitada: number;
  quantidade_baixada: number;
  status: string;
  observacao?: string | null;
};

type MovimentacaoEstoque = {
  id: number;
  produto_id: number;
  ordem_servico_id?: number | null;
  requisicao_estoque_id?: number | null;
  tipo: string;
  quantidade: number;
  estoque_anterior: number;
  estoque_posterior: number;
  origem: string;
  observacao?: string | null;
  criado_em: string;
};

type ProdutoAtualizado = {
  id: number;
  nome: string;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
  preco_venda: number;
};

export default function OsEstoque({ token, cadastros, operacao, busca, osAtivaId = '' }: Props) {
  const [itensServicos, setItensServicos] = useState<ItemServico[]>([]);
  const [itensProdutos, setItensProdutos] = useState<ItemProduto[]>([]);
  const [requisicoes, setRequisicoes] = useState<RequisicaoEstoque[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [produtos, setProdutos] = useState<ProdutoAtualizado[]>(cadastros.produtos as ProdutoAtualizado[]);

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const ordemPadrao = osAtivaId || (operacao.ordens[0]?.id ? String(operacao.ordens[0].id) : '');

  const [servicoForm, setServicoForm] = useState({
    ordem_servico_id: ordemPadrao,
    servico_id: '',
    descricao: '',
    quantidade: '1',
    valor_unitario: '0',
    valor_total: '0',
    status: 'Lancado',
    observacao: '',
  });

  const [produtoForm, setProdutoForm] = useState({
    ordem_servico_id: ordemPadrao,
    produto_id: '',
    descricao: '',
    quantidade: '1',
    valor_unitario: '0',
    valor_total: '0',
    status: 'Reservado',
    observacao: '',
  });

  const [requisicaoForm, setRequisicaoForm] = useState({
    ordem_servico_id: ordemPadrao,
    produto_id: '',
    quantidade_solicitada: '1',
    status: 'Solicitada',
    observacao: '',
  });

  useEffect(() => {
    if (!ordemPadrao) return;

    setServicoForm((v) => ({ ...v, ordem_servico_id: ordemPadrao }));
    setProdutoForm((v) => ({ ...v, ordem_servico_id: ordemPadrao }));
    setRequisicaoForm((v) => ({ ...v, ordem_servico_id: ordemPadrao }));
  }, [ordemPadrao]);

  useEffect(() => {
    carregarTudo();
  }, [token]);

  const ordensFiltradas = useMemo(() => {
    const texto = busca.trim().toLowerCase();
    const fonte = osAtivaId
      ? operacao.ordens.filter((item) => String(item.id) === String(osAtivaId))
      : operacao.ordens;

    if (!texto) return fonte;
    return fonte.filter((item) => JSON.stringify(item).toLowerCase().includes(texto));
  }, [busca, operacao.ordens, osAtivaId]);

  const itensServicosFiltrados = useMemo(() => {
    if (!osAtivaId) return itensServicos;
    return itensServicos.filter((item) => String(item.ordem_servico_id) === String(osAtivaId));
  }, [itensServicos, osAtivaId]);

  const itensProdutosFiltrados = useMemo(() => {
    if (!osAtivaId) return itensProdutos;
    return itensProdutos.filter((item) => String(item.ordem_servico_id) === String(osAtivaId));
  }, [itensProdutos, osAtivaId]);

  const requisicoesFiltradas = useMemo(() => {
    if (!osAtivaId) return requisicoes;
    return requisicoes.filter((item) => String(item.ordem_servico_id) === String(osAtivaId));
  }, [requisicoes, osAtivaId]);

  const movimentacoesFiltradas = useMemo(() => {
    if (!osAtivaId) return movimentacoes;
    return movimentacoes.filter((item) => String(item.ordem_servico_id || '') === String(osAtivaId));
  }, [movimentacoes, osAtivaId]);

  const ordemAtiva = useMemo(() => {
    if (!osAtivaId) return null;
    return operacao.ordens.find((ordem: any) => String(ordem.id) === String(osAtivaId)) || null;
  }, [operacao.ordens, osAtivaId]);

  const rotuloOrdemAtiva = ordemAtiva
    ? `${ordemAtiva.numero || `OS ${ordemAtiva.id}`} - ${ordemAtiva.descricao || 'Sem descrição'}`
    : osAtivaId
      ? `OS ${osAtivaId}`
      : '';


  async function carregarTudo() {
    setCarregando(true);
    setErro('');

    try {
      const [
        respItensServicos,
        respItensProdutos,
        respRequisicoes,
        respMovimentacoes,
        respProdutos,
      ] = await Promise.all([
        getLista<ItemServico>('/ordens-servico-itens-servicos'),
        getLista<ItemProduto>('/ordens-servico-itens-produtos'),
        getLista<RequisicaoEstoque>('/requisicoes-estoque'),
        getLista<MovimentacaoEstoque>('/movimentacoes-estoque'),
        getLista<ProdutoAtualizado>('/produtos'),
      ]);

      setItensServicos(respItensServicos);
      setItensProdutos(respItensProdutos);
      setRequisicoes(respRequisicoes);
      setMovimentacoes(respMovimentacoes);
      setProdutos(respProdutos);
    } catch {
      setErro('Falha ao carregar itens da OS, requisições ou movimentações.');
    } finally {
      setCarregando(false);
    }
  }

  async function getLista<T>(endpoint: string) {
    const resposta = await fetch(`${API_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resposta.ok) {
      throw new Error(endpoint);
    }

    const json = (await resposta.json()) as ApiLista<T>;
    return json.dados ?? [];
  }

  async function postJson(endpoint: string, payload: Record<string, unknown>) {
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

      const texto = await resposta.text();
      let corpo: any = null;

      try {
        corpo = texto ? JSON.parse(texto) : null;
      } catch {
        corpo = texto;
      }

      if (!resposta.ok) {
        if (corpo?.erro === 'ESTOQUE_INSUFICIENTE') {
          setErro(
            `Estoque insuficiente para ${corpo.produto}. Estoque atual: ${corpo.estoqueAtual}. Quantidade solicitada: ${corpo.quantidadeSolicitada}.`,
          );
          return;
        }

        setErro(typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao gravar registro.');
        return;
      }

      setSucesso(corpo?.mensagem || 'Registro criado com sucesso.');
      await carregarTudo();
    } catch {
      setErro('Falha de conexão ao gravar registro.');
    } finally {
      setCarregando(false);
    }
  }

  function salvarItemServico() {
    postJson('/ordens-servico-itens-servicos', {
      ordem_servico_id: numero(servicoForm.ordem_servico_id),
      servico_id: servicoForm.servico_id ? numero(servicoForm.servico_id) : null,
      descricao: servicoForm.descricao,
      quantidade: decimal(servicoForm.quantidade),
      valor_unitario: decimal(servicoForm.valor_unitario),
      valor_total: decimal(servicoForm.valor_total),
      status: servicoForm.status,
      observacao: servicoForm.observacao || null,
      ativo: 1,
    });

    setServicoForm((v) => ({
      ...v,
      servico_id: '',
      descricao: '',
      quantidade: '1',
      valor_unitario: '0',
      valor_total: '0',
      status: 'Lancado',
      observacao: '',
    }));
  }

  function salvarItemProduto() {
    postJson('/ordens-servico-itens-produtos', {
      ordem_servico_id: numero(produtoForm.ordem_servico_id),
      produto_id: produtoForm.produto_id ? numero(produtoForm.produto_id) : null,
      descricao: produtoForm.descricao,
      quantidade: decimal(produtoForm.quantidade),
      valor_unitario: decimal(produtoForm.valor_unitario),
      valor_total: decimal(produtoForm.valor_total),
      status: produtoForm.status,
      observacao: produtoForm.observacao || null,
      ativo: 1,
    });

    setProdutoForm((v) => ({
      ...v,
      produto_id: '',
      descricao: '',
      quantidade: '1',
      valor_unitario: '0',
      valor_total: '0',
      status: 'Reservado',
      observacao: '',
    }));
  }

  function salvarRequisicao() {
    postJson('/requisicoes-estoque', {
      ordem_servico_id: numero(requisicaoForm.ordem_servico_id),
      produto_id: numero(requisicaoForm.produto_id),
      quantidade_solicitada: decimal(requisicaoForm.quantidade_solicitada),
      status: requisicaoForm.status,
      observacao: requisicaoForm.observacao || 'Requisição criada pela tela da OS.',
      ativo: 1,
    });

    setRequisicaoForm((v) => ({
      ...v,
      produto_id: '',
      quantidade_solicitada: '1',
      status: 'Solicitada',
      observacao: '',
    }));
  }

  function selecionarServico(servicoId: string) {
    const servico = cadastros.servicos.find((item: any) => String(item.id) === servicoId);
    setServicoForm((v) => ({
      ...v,
      servico_id: servicoId,
      descricao: servico?.nome || v.descricao,
      valor_unitario: servico?.preco_base != null ? String(servico.preco_base).replace('.', ',') : v.valor_unitario,
      valor_total: servico?.preco_base != null ? String(servico.preco_base).replace('.', ',') : v.valor_total,
    }));
  }

  function selecionarProdutoItem(produtoId: string) {
    const produto = produtos.find((item) => String(item.id) === produtoId);
    setProdutoForm((v) => ({
      ...v,
      produto_id: produtoId,
      descricao: produto?.nome || v.descricao,
      valor_unitario: produto?.preco_venda != null ? String(produto.preco_venda).replace('.', ',') : v.valor_unitario,
      valor_total: produto?.preco_venda != null ? String(produto.preco_venda).replace('.', ',') : v.valor_total,
    }));
  }

  function selecionarProdutoRequisicao(produtoId: string) {
    setRequisicaoForm((v) => ({ ...v, produto_id: produtoId }));
  }

  return (
    <div className="tl">
      {erro && (
        <div className="ins am">
          <strong>Erro:</strong> {erro}
        </div>
      )}

      {sucesso && (
        <div className="ins">
          <strong>OK:</strong> {sucesso}
        </div>
      )}

      <div className="g g-dash" style={{ marginBottom: 14 }}>
        <MetricMini label="Ordens" value={String(operacao.ordens.length)} hint="/api/ordens-servico" />
        <MetricMini label="Serviços na OS" value={String(itensServicosFiltrados.length)} hint="/api/ordens-servico-itens-servicos" />
        <MetricMini label="Produtos na OS" value={String(itensProdutosFiltrados.length)} hint="/api/ordens-servico-itens-produtos" />
        <MetricMini label="Movimentações" value={String(movimentacoesFiltradas.length)} hint="/api/movimentacoes-estoque" />
      </div>

      <div className="g" style={{ gridTemplateColumns: 'minmax(360px, 0.9fr) minmax(0, 1.5fr)' }}>
        <div className="card">
          <div className="ct">
            <div>
              <h3>Requisição de estoque</h3>
              <p>Ao salvar, o estoque é baixado imediatamente e uma movimentação SAIDA_OS é registrada.</p>
            </div>
            <span className="badge bg-g">Baixa imediata</span>
          </div>

          <Campo label="Ordem de Serviço">
            {osAtivaId ? (
              <div className="ins">
                <strong>Usando OS ativa:</strong> {rotuloOrdemAtiva}
              </div>
            ) : (
              <select
                className="inp"
                value={requisicaoForm.ordem_servico_id}
                onChange={(e) => setRequisicaoForm((v) => ({ ...v, ordem_servico_id: e.target.value }))}
              >
                <option value="">Selecione</option>
                {operacao.ordens.map((ordem: any) => (
                  <option key={ordem.id} value={ordem.id}>
                    {ordem.numero || `OS ${ordem.id}`} - {ordem.descricao}
                  </option>
                ))}
              </select>
            )}
          </Campo>

          <Campo label="Produto / peça">
            <select
              className="inp"
              value={requisicaoForm.produto_id}
              onChange={(e) => selecionarProdutoRequisicao(e.target.value)}
            >
              <option value="">Selecione</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} · estoque atual {produto.estoque_atual}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Quantidade solicitada">
            <input
              className="inp"
              value={requisicaoForm.quantidade_solicitada}
              onChange={(e) => setRequisicaoForm((v) => ({ ...v, quantidade_solicitada: e.target.value }))}
              inputMode="decimal"
              placeholder="Ex.: 1"
            />
          </Campo>

          <Campo label="Observação">
            <input
              className="inp"
              value={requisicaoForm.observacao}
              onChange={(e) => setRequisicaoForm((v) => ({ ...v, observacao: e.target.value }))}
              placeholder="Motivo da requisição"
            />
          </Campo>

          <button
            className="btnMain"
            disabled={carregando || !requisicaoForm.ordem_servico_id || !requisicaoForm.produto_id}
            onClick={salvarRequisicao}
          >
            Baixar peça na OS
          </button>
        </div>

        <div className="card">
          <div className="ct">
            <div>
              <h3>Estoque atual dos produtos</h3>
              <p>Atualizado após cada requisição de estoque.</p>
            </div>
            <button className="btn bo bsm" onClick={carregarTudo} disabled={carregando}>
              {carregando ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>

          <Table
            heads={['ID', 'Produto', 'Un.', 'Estoque', 'Mínimo', 'Preço', 'Status']}
            rows={produtos.map((produto) => [
              String(produto.id),
              produto.nome,
              produto.unidade,
              String(produto.estoque_atual),
              String(produto.estoque_minimo),
              moeda(produto.preco_venda),
              produto.estoque_atual <= produto.estoque_minimo ? 'Mínimo' : 'OK',
            ])}
          />
        </div>
      </div>

      <div className="g" style={{ gridTemplateColumns: 'minmax(360px, 0.9fr) minmax(0, 1.5fr)', marginTop: 14 }}>
        <div className="card">
          <div className="ct">
            <div>
              <h3>Serviço lançado na OS</h3>
              <p>Registra mão de obra/serviço executado.</p>
            </div>
            <span className="badge bg-b">OS</span>
          </div>

          <Campo label="Ordem de Serviço">
            {osAtivaId ? (
              <div className="ins">
                <strong>Usando OS ativa:</strong> {rotuloOrdemAtiva}
              </div>
            ) : (
              <select className="inp" value={servicoForm.ordem_servico_id} onChange={(e) => setServicoForm((v) => ({ ...v, ordem_servico_id: e.target.value }))}>
                <option value="">Selecione</option>
                {operacao.ordens.map((ordem: any) => (
                  <option key={ordem.id} value={ordem.id}>
                    {ordem.numero || `OS ${ordem.id}`} - {ordem.descricao}
                  </option>
                ))}
              </select>
            )}
          </Campo>

          <Campo label="Serviço cadastrado">
            <select className="inp" value={servicoForm.servico_id} onChange={(e) => selecionarServico(e.target.value)}>
              <option value="">Sem vínculo</option>
              {cadastros.servicos.map((servico: any) => (
                <option key={servico.id} value={servico.id}>
                  {servico.nome} · {moeda(servico.preco_base || 0)}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Descrição">
            <input className="inp" value={servicoForm.descricao} onChange={(e) => setServicoForm((v) => ({ ...v, descricao: e.target.value }))} />
          </Campo>

          <Campo label="Quantidade / Valor unitário / Total">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <input className="inp" value={servicoForm.quantidade} onChange={(e) => setServicoForm((v) => ({ ...v, quantidade: e.target.value }))} inputMode="decimal" />
              <input className="inp" value={servicoForm.valor_unitario} onChange={(e) => setServicoForm((v) => ({ ...v, valor_unitario: e.target.value }))} inputMode="decimal" />
              <input className="inp" value={servicoForm.valor_total} onChange={(e) => setServicoForm((v) => ({ ...v, valor_total: e.target.value }))} inputMode="decimal" />
            </div>
          </Campo>

          <button className="btnMain" disabled={carregando || !servicoForm.ordem_servico_id || !servicoForm.descricao.trim()} onClick={salvarItemServico}>
            Lançar serviço na OS
          </button>
        </div>

        <div className="card">
          <div className="ct">
            <div>
              <h3>Serviços lançados</h3>
              <p>{itensServicosFiltrados.length} registro(s) exibido(s) para a OS ativa.</p>
            </div>
            <span className="badge bg-g">API real</span>
          </div>

          <Table
            heads={['ID', 'OS', 'Descrição', 'Qtd.', 'Unitário', 'Total', 'Status']}
            rows={itensServicosFiltrados.map((item) => [
              String(item.id),
              String(item.ordem_servico_id),
              item.descricao,
              String(item.quantidade),
              moeda(item.valor_unitario),
              moeda(item.valor_total),
              item.status,
            ])}
          />
        </div>
      </div>

      <div className="g" style={{ gridTemplateColumns: 'minmax(360px, 0.9fr) minmax(0, 1.5fr)', marginTop: 14 }}>
        <div className="card">
          <div className="ct">
            <div>
              <h3>Produto lançado na OS</h3>
              <p>Lança produto/peça como item da OS. A baixa física ocorre pela requisição de estoque.</p>
            </div>
            <span className="badge bg-b">Item</span>
          </div>

          <Campo label="Ordem de Serviço">
            {osAtivaId ? (
              <div className="ins">
                <strong>Usando OS ativa:</strong> {rotuloOrdemAtiva}
              </div>
            ) : (
              <select className="inp" value={produtoForm.ordem_servico_id} onChange={(e) => setProdutoForm((v) => ({ ...v, ordem_servico_id: e.target.value }))}>
                <option value="">Selecione</option>
                {operacao.ordens.map((ordem: any) => (
                  <option key={ordem.id} value={ordem.id}>
                    {ordem.numero || `OS ${ordem.id}`} - {ordem.descricao}
                  </option>
                ))}
              </select>
            )}
          </Campo>

          <Campo label="Produto cadastrado">
            <select className="inp" value={produtoForm.produto_id} onChange={(e) => selecionarProdutoItem(e.target.value)}>
              <option value="">Sem vínculo</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} · estoque {produto.estoque_atual}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Descrição">
            <input className="inp" value={produtoForm.descricao} onChange={(e) => setProdutoForm((v) => ({ ...v, descricao: e.target.value }))} />
          </Campo>

          <Campo label="Quantidade / Valor unitário / Total">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <input className="inp" value={produtoForm.quantidade} onChange={(e) => setProdutoForm((v) => ({ ...v, quantidade: e.target.value }))} inputMode="decimal" />
              <input className="inp" value={produtoForm.valor_unitario} onChange={(e) => setProdutoForm((v) => ({ ...v, valor_unitario: e.target.value }))} inputMode="decimal" />
              <input className="inp" value={produtoForm.valor_total} onChange={(e) => setProdutoForm((v) => ({ ...v, valor_total: e.target.value }))} inputMode="decimal" />
            </div>
          </Campo>

          <button className="btnMain" disabled={carregando || !produtoForm.ordem_servico_id || !produtoForm.descricao.trim()} onClick={salvarItemProduto}>
            Lançar produto na OS
          </button>
        </div>

        <div className="card">
          <div className="ct">
            <div>
              <h3>Produtos lançados</h3>
              <p>{itensProdutosFiltrados.length} registro(s) exibido(s) para a OS ativa.</p>
            </div>
            <span className="badge bg-g">API real</span>
          </div>

          <Table
            heads={['ID', 'OS', 'Descrição', 'Qtd.', 'Unitário', 'Total', 'Status']}
            rows={itensProdutosFiltrados.map((item) => [
              String(item.id),
              String(item.ordem_servico_id),
              item.descricao,
              String(item.quantidade),
              moeda(item.valor_unitario),
              moeda(item.valor_total),
              item.status,
            ])}
          />
        </div>
      </div>

      <div className="g" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
        <div className="card">
          <div className="ct">
            <div>
              <h3>Requisições de estoque</h3>
              <p>{requisicoesFiltradas.length} requisição(ões) registrada(s) para a OS ativa.</p>
            </div>
            <span className="badge bg-g">Baixada</span>
          </div>

          <Table
            heads={['ID', 'OS', 'Produto', 'Solicitada', 'Baixada', 'Status']}
            rows={requisicoesFiltradas.map((item) => {
              const produto = produtos.find((p) => p.id === item.produto_id);
              return [
                String(item.id),
                String(item.ordem_servico_id),
                produto?.nome || String(item.produto_id),
                String(item.quantidade_solicitada),
                String(item.quantidade_baixada),
                item.status,
              ];
            })}
          />
        </div>

        <div className="card">
          <div className="ct">
            <div>
              <h3>Movimentações de estoque</h3>
              <p>Rastreabilidade de saídas vinculadas à OS.</p>
            </div>
            <span className="badge bg-g">SAIDA_OS</span>
          </div>

          <Table
            heads={['ID', 'Tipo', 'Produto', 'Qtd.', 'Antes', 'Depois']}
            rows={movimentacoesFiltradas.map((item) => {
              const produto = produtos.find((p) => p.id === item.produto_id);
              return [
                String(item.id),
                item.tipo,
                produto?.nome || String(item.produto_id),
                String(item.quantidade),
                String(item.estoque_anterior),
                String(item.estoque_posterior),
              ];
            })}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="ct">
          <div>
            <h3>Ordens de Serviço</h3>
            <p>{ordensFiltradas.length} ordem(ns) exibida(s).</p>
          </div>
          <span className="badge bg-g">API real</span>
        </div>

        <Table
          heads={['ID', 'Número', 'Descrição', 'Total', 'Status']}
          rows={ordensFiltradas.map((ordem: any) => [
            String(ordem.id),
            ordem.numero || '-',
            ordem.descricao || '-',
            moeda(ordem.valor_total || 0),
            ordem.status || '-',
          ])}
        />
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="lbl">{label}</label>
      {children}
    </div>
  );
}

function Table({ heads, rows }: { heads: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return (
      <div className="ins">
        <strong>Nenhum registro encontrado.</strong>
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
            <tr key={rowIndex}>
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

function MetricMini({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card mc mc-ac">
      <div className="mc-val">{value}</div>
      <div className="mc-lbl">{label}</div>
      <div className="mc-bar">
        <span style={{ width: '70%' }} />
      </div>
      <div className="mc-hint">{hint}</div>
    </div>
  );
}

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function decimal(valor: string) {
  if (!valor || valor.trim() === '') return 0;

  const normalizado = valor
    .trim()
    .replace(/\./g, '')
    .replace(',', '.');

  const numero = Number(normalizado);

  if (Number.isNaN(numero)) return 0;

  return numero;
}

function numero(valor: string) {
  const convertido = Number(valor);
  return Number.isNaN(convertido) ? 0 : convertido;
}

function badgeClass(status: string) {
  const texto = status.toLowerCase();

  if (texto.includes('baixada') || texto.includes('saida') || texto.includes('saída') || texto.includes('ok')) return 'bg-g';
  if (texto.includes('reserv') || texto.includes('lançado') || texto.includes('lancado')) return 'bg-b';
  if (texto.includes('erro') || texto.includes('insuficiente') || texto.includes('cancel')) return 'bg-r';

  return 'bg-b';
}
