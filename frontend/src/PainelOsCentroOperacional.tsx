import { useEffect, useMemo, useState } from 'react';
import { salvarOsAtiva } from './osAtivaStore';

type Cliente = {
  id: number;
  nome: string;
};

type Ativo = {
  id: number;
  descricao: string;
};

type Agendamento = {
  id: number;
  cliente_id?: number | null;
  ativo_id?: number | null;
  data_agendamento?: string | null;
  hora_agendamento?: string | null;
  descricao?: string | null;
  status?: string | null;
  ativo: number;
};

type Orcamento = {
  id: number;
  numero?: string | null;
  status?: string | null;
  valor_total?: number | null;
  ativo: number;
};

type OrdemServico = {
  id: number;
  cliente_id?: number | null;
  ativo_id?: number | null;
  agendamento_id?: number | null;
  orcamento_id?: number | null;
  numero?: string | null;
  descricao?: string | null;
  problema_relatado?: string | null;
  diagnostico?: string | null;
  km_abertura?: number | string | null;
  data_abertura?: string | null;
  data_encerramento?: string | null;
  valor_total?: number | null;
  status?: string | null;
  ativo: number;
};

type Props = {
  operacao: {
    agendamentos: Agendamento[];
    orcamentos: Orcamento[];
    ordens: OrdemServico[];
  };
  cadastros: {
    clientes: Cliente[];
    ativos: Ativo[];
  };
  busca: string;
  ordemSelecionadaId?: string;
  onSelecionarOrdem?: (id: string) => void;
  ocultarSeletorQuandoExterno?: boolean;
};


function formatarDataPainelOs(valor: unknown) {
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

function formatarKmPainelOs(valor: unknown) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return '-';

  const numero = Number(String(valor).replace(/\./g, '').replace(',', '.'));

  if (!Number.isFinite(numero)) return String(valor);

  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function dinheiro(valor: number | null | undefined) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0));
}

export default function PainelOsCentroOperacional({ operacao, cadastros, busca, ordemSelecionadaId: ordemSelecionadaIdExterno, onSelecionarOrdem, ocultarSeletorQuandoExterno = false }: Props) {
  const [ordemSelecionadaId, setOrdemSelecionadaId] = useState('');

  const textoBusca = busca.trim().toLowerCase();

  const ordensDisponiveis = useMemo(() => {
    const fonte = operacao.ordens.filter((ordem) => ordem.ativo !== 0);

    if (!textoBusca) return fonte;

    return fonte.filter((ordem) => JSON.stringify(ordem).toLowerCase().includes(textoBusca));
  }, [operacao.ordens, textoBusca]);

  const ordemSelecionadaIdEfetivo = ordemSelecionadaIdExterno || ordemSelecionadaId;

  const ordemSelecionada =
    ordensDisponiveis.find((ordem) => String(ordem.id) === String(ordemSelecionadaIdEfetivo)) ||
    ordensDisponiveis[0] ||
    null;

  function clienteDaOs(ordem: OrdemServico) {
    return cadastros.clientes.find((cliente) => Number(cliente.id) === Number(ordem.cliente_id));
  }

  function ativoDaOs(ordem: OrdemServico) {
    return cadastros.ativos.find((ativo) => Number(ativo.id) === Number(ordem.ativo_id));
  }

  function agendaDaOs(ordem: OrdemServico) {
    return operacao.agendamentos.find((agenda) => Number(agenda.id) === Number(ordem.agendamento_id));
  }

  function orcamentoDaOs(ordem: OrdemServico) {
    return operacao.orcamentos.find((orcamento) => Number(orcamento.id) === Number(ordem.orcamento_id));
  }

  function origemDaOs(ordem: OrdemServico) {
    if (ordem.agendamento_id && ordem.orcamento_id) return 'Agenda + Orçamento';
    if (ordem.agendamento_id) return 'Agenda';
    if (ordem.orcamento_id) return 'Orçamento';
    return 'OS direta';
  }

  function proximoPasso(ordem: OrdemServico) {
    const status = String(ordem.status || '').toLowerCase();

    if (status.includes('fech') || status.includes('conclu')) {
      return 'Atendimento finalizado. Próximo passo: financeiro/fiscal.';
    }

    if (status.includes('cancel')) {
      return 'OS cancelada. Não seguir com requisições.';
    }

    if (ordem.orcamento_id) {
      return 'Continue pelas requisições da OS: serviços, peças e baixa de estoque.';
    }

    return 'Sem orçamento vinculado. Pode seguir com requisições diretas da OS.';
  }

  useEffect(() => {
    if (ordemSelecionada?.id) {
      salvarOsAtiva({
        id: String(ordemSelecionada.id),
        numero: ordemSelecionada.numero || `OS-${ordemSelecionada.id}`,
        status: ordemSelecionada.status || 'Aberta',
        descricao: ordemSelecionada.descricao || ordemSelecionada.problema_relatado || '',
      });
    }
  }, [ordemSelecionada?.id]);

  const cliente = ordemSelecionada ? clienteDaOs(ordemSelecionada) : null;
  const ativo = ordemSelecionada ? ativoDaOs(ordemSelecionada) : null;
  const agenda = ordemSelecionada ? agendaDaOs(ordemSelecionada) : null;
  const orcamento = ordemSelecionada ? orcamentoDaOs(ordemSelecionada) : null;

  return (
    <div className="card">
      <div className="ct">
        <div>
          <h3>Centro operacional da OS</h3>
          <p>Acompanhe origem, orçamento opcional, requisições, estoque aplicado e próximos passos.</p>
        </div>
        <span className="badge bg-b">OS ativa no fluxo</span>
      </div>

      {ordensDisponiveis.length === 0 ? (
        <div className="ins">
          Nenhuma OS encontrada para o filtro atual. Gere uma OS pela Agenda ou crie uma OS direta.
        </div>
      ) : (
        <div className="tl">
          {!ocultarSeletorQuandoExterno && (
            <div className="field">
              <label className="lbl">OS em atendimento</label>
              <select
                className="inp"
                value={ordemSelecionada ? String(ordemSelecionada.id) : ''}
                onChange={(event) => {
                  setOrdemSelecionadaId(event.target.value);
                  onSelecionarOrdem?.(event.target.value);
                }}
              >
                {ordensDisponiveis.map((ordem) => (
                  <option key={ordem.id} value={ordem.id}>
                    {(ordem.numero || `OS-${ordem.id}`)} · {ordem.status || 'Aberta'} · {ordem.descricao || ordem.problema_relatado || 'Sem descrição'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {ordemSelecionada && (
            <div
              className="card"
              style={{
                padding: 14,
                borderColor: 'rgba(79, 124, 255, 0.24)',
                background: 'rgba(255,255,255,0.025)',
              }}
            >
              <div className="ct" style={{ marginBottom: 10 }}>
                <div>
                  <div className="ey">Ordem de Serviço selecionada</div>
                  <h3 style={{ marginBottom: 4 }}>{ordemSelecionada.numero || `OS-${ordemSelecionada.id}`}</h3>
                  <p>{ordemSelecionada.descricao || ordemSelecionada.problema_relatado || 'Sem descrição informada.'}</p>
                </div>
                <span className="badge bg-b">{ordemSelecionada.status || 'Aberta'}</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div className="ins" style={{ margin: 0 }}>
                  <div className="lbl">Cliente</div>
                  <strong>{cliente?.nome || 'Sem cliente'}</strong>
                </div>

                <div className="ins" style={{ margin: 0 }}>
                  <div className="lbl">Ativo</div>
                  <strong>{ativo?.descricao || 'Sem ativo'}</strong>
                </div>

                <div className="ins" style={{ margin: 0 }}>
                  <div className="lbl">Data abertura</div>
                  <strong>{formatarDataPainelOs(ordemSelecionada.data_abertura)}</strong>
                </div>

                <div className="ins" style={{ margin: 0 }}>
                  <div className="lbl">KM abertura</div>
                  <strong>{formatarKmPainelOs(ordemSelecionada.km_abertura)}</strong>
                </div>

                <div className="ins" style={{ margin: 0 }}>
                  <div className="lbl">Origem</div>
                  <strong>{origemDaOs(ordemSelecionada)}</strong>
                </div>

                <div className="ins" style={{ margin: 0 }}>
                  <div className="lbl">Total</div>
                  <strong>{dinheiro(ordemSelecionada.valor_total)}</strong>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div className="ins" style={{ margin: 0 }}>
                  <div className="lbl">Agenda vinculada</div>
                  <strong>
                    {agenda
                      ? `${agenda.data_agendamento || 'Sem data'}${agenda.hora_agendamento ? ` ${agenda.hora_agendamento}` : ''}`
                      : ordemSelecionada.agendamento_id
                        ? `Agenda #${ordemSelecionada.agendamento_id}`
                        : 'Sem agenda'}
                  </strong>
                  {agenda?.descricao && <p style={{ marginTop: 4 }}>{agenda.descricao}</p>}
                </div>

                <div className="ins" style={{ margin: 0 }}>
                  <div className="lbl">Orçamento vinculado</div>
                  <strong>
                    {orcamento
                      ? `${orcamento.numero || `ORC-${orcamento.id}`} · ${orcamento.status || 'Sem status'}`
                      : ordemSelecionada.orcamento_id
                        ? `Orçamento #${ordemSelecionada.orcamento_id}`
                        : 'Sem orçamento'}
                  </strong>
                  {orcamento && <p style={{ marginTop: 4 }}>Total orçamento: {dinheiro(orcamento.valor_total)}</p>}
                </div>
              </div>

              <div className="ins" style={{ margin: 0 }}>
                <strong>Próximo passo:</strong> {proximoPasso(ordemSelecionada)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
