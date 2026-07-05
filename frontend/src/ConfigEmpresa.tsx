import { useEffect, useMemo, useState } from 'react';

type Props = {
  token: string;
};

type EmpresaForm = {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  telefone: string;
  whatsapp: string;
  email: string;
  site: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  observacao: string;
  validade_orcamento_dias: string;
  texto_rodape_orcamento: string;
  logo_url: string;
};

const API_BASE = '/api';

const vazio: EmpresaForm = {
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  inscricao_estadual: '',
  inscricao_municipal: '',
  telefone: '',
  whatsapp: '',
  email: '',
  site: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  observacao: '',
  validade_orcamento_dias: '7',
  texto_rodape_orcamento: 'Orçamento sujeito à aprovação do cliente. Produtos no orçamento não representam baixa de estoque.',
  logo_url: '',
};

function texto(valor: unknown) {
  if (valor === null || valor === undefined) return '';
  return String(valor);
}

function apenasDigitos(valor: string) {
  return valor.replace(/\D/g, '');
}

function mascaraCnpj(valor: string) {
  const digitos = apenasDigitos(valor).slice(0, 14);

  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 5) return `${digitos.slice(0, 2)}.${digitos.slice(2)}`;
  if (digitos.length <= 8) return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5)}`;
  if (digitos.length <= 12) return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8)}`;

  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12, 14)}`;
}

function mascaraCep(valor: string) {
  const digitos = apenasDigitos(valor).slice(0, 8);

  if (digitos.length <= 5) return digitos;

  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

function mascaraTelefone(valor: string) {
  const digitos = apenasDigitos(valor).slice(0, 11);

  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;

  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

function mascaraIe(valor: string) {
  return valor
    .toUpperCase()
    .replace(/[^A-Z0-9.\-/ ]/g, '')
    .slice(0, 20);
}

function mascaraUf(valor: string) {
  return valor
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 2);
}

function formatarData(valor: string) {
  if (!valor) return '';

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;

  return data.toLocaleString('pt-BR');
}

function normalizarForm(dados: any): EmpresaForm {
  return {
    razao_social: texto(dados.razao_social),
    nome_fantasia: texto(dados.nome_fantasia),
    cnpj: mascaraCnpj(texto(dados.cnpj)),
    inscricao_estadual: mascaraIe(texto(dados.inscricao_estadual)),
    inscricao_municipal: texto(dados.inscricao_municipal),
    telefone: mascaraTelefone(texto(dados.telefone)),
    whatsapp: mascaraTelefone(texto(dados.whatsapp)),
    email: texto(dados.email),
    site: texto(dados.site),
    cep: mascaraCep(texto(dados.cep)),
    endereco: texto(dados.endereco),
    numero: texto(dados.numero),
    complemento: texto(dados.complemento),
    bairro: texto(dados.bairro),
    cidade: texto(dados.cidade),
    uf: mascaraUf(texto(dados.uf)),
    observacao: texto(dados.observacao),
    validade_orcamento_dias: texto(dados.validade_orcamento_dias || '7'),
    texto_rodape_orcamento: texto(dados.texto_rodape_orcamento || vazio.texto_rodape_orcamento),
    logo_url: texto(dados.logo_url),
  };
}

export default function ConfigEmpresa({ token }: Props) {
  const [form, setForm] = useState<EmpresaForm>(vazio);
  const [formOriginal, setFormOriginal] = useState<EmpresaForm>(vazio);
  const [atualizadoEm, setAtualizadoEm] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const alterado = useMemo(() => JSON.stringify(form) !== JSON.stringify(formOriginal), [form, formOriginal]);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function carregar() {
    setCarregando(true);
    setErro('');
    setSucesso('');

    try {
      const resposta = await fetch(`${API_BASE}/configuracoes/empresa`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const corpo = await resposta.json();

      if (!resposta.ok) {
        setErro(corpo?.mensagem || 'Falha ao carregar dados da empresa.');
        return;
      }

      const carregado = normalizarForm(corpo?.dados ?? {});

      setForm(carregado);
      setFormOriginal(carregado);
      setAtualizadoEm(texto(corpo?.dados?.atualizado_em));
    } catch {
      setErro('Falha de conexão ao carregar dados da empresa.');
    } finally {
      setCarregando(false);
    }
  }

  async function salvar() {
    setSalvando(true);
    setErro('');
    setSucesso('');

    try {
      const resposta = await fetch(`${API_BASE}/configuracoes/empresa`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          validade_orcamento_dias: Number(form.validade_orcamento_dias || 0),
        }),
      });

      const textoResposta = await resposta.text();
      let corpo: any = null;

      try {
        corpo = textoResposta ? JSON.parse(textoResposta) : null;
      } catch {
        corpo = textoResposta;
      }

      if (!resposta.ok) {
        setErro(typeof corpo === 'string' ? corpo : corpo?.mensagem || 'Falha ao salvar dados da empresa.');
        return;
      }

      await carregar();

      setSucesso(corpo?.mensagem || 'Dados da empresa salvos com sucesso.');

      setTimeout(() => {
        document.getElementById('status-salvar-empresa')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    } catch {
      setErro('Falha de conexão ao salvar dados da empresa.');
    } finally {
      setSalvando(false);
    }
  }


  function setCampo(campo: keyof EmpresaForm, valor: string) {
    let ajustado = valor;

    if (campo === 'cnpj') ajustado = mascaraCnpj(valor);
    if (campo === 'telefone') ajustado = mascaraTelefone(valor);
    if (campo === 'whatsapp') ajustado = mascaraTelefone(valor);
    if (campo === 'cep') ajustado = mascaraCep(valor);
    if (campo === 'inscricao_estadual') ajustado = mascaraIe(valor);
    if (campo === 'uf') ajustado = mascaraUf(valor);
    if (campo === 'validade_orcamento_dias') ajustado = apenasDigitos(valor).slice(0, 3);

    setForm((atual) => ({ ...atual, [campo]: ajustado }));
    setSucesso('');
  }

  return (
    <section className="card">
      <div className="ct">
        <div>
          <h3>Dados da empresa emissora</h3>
          <p>Essas informações aparecerão no cabeçalho do orçamento impresso e futuramente no envio por WhatsApp.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {alterado && <span className="badge bg-a">Alterações pendentes</span>}
          <span className="badge bg-b">{carregando ? 'Carregando' : 'Configuração'}</span>
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
          {atualizadoEm && <span> Última atualização: {formatarData(atualizadoEm)}.</span>}
        </div>
      )}

      <div className="g g2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="ct">
            <div>
              <h3>Identificação</h3>
              <p>Dados fiscais e comerciais da oficina.</p>
            </div>
          </div>

          <Campo label="Razão social">
            <input className="inp" value={form.razao_social} onChange={(e) => setCampo('razao_social', e.target.value)} />
          </Campo>

          <Campo label="Nome fantasia">
            <input className="inp" value={form.nome_fantasia} onChange={(e) => setCampo('nome_fantasia', e.target.value)} />
          </Campo>

          <div className="fg">
            <Campo label="CNPJ">
              <input
                className="inp"
                value={form.cnpj}
                onChange={(e) => setCampo('cnpj', e.target.value)}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                maxLength={18}
              />
            </Campo>

            <Campo label="Inscrição estadual">
              <input
                className="inp"
                value={form.inscricao_estadual}
                onChange={(e) => setCampo('inscricao_estadual', e.target.value)}
                placeholder="ISENTO ou número da IE"
                maxLength={20}
              />
            </Campo>
          </div>

          <Campo label="Inscrição municipal">
            <input className="inp" value={form.inscricao_municipal} onChange={(e) => setCampo('inscricao_municipal', e.target.value)} />
          </Campo>
        </div>

        <div className="card">
          <div className="ct">
            <div>
              <h3>Contato</h3>
              <p>Canais exibidos no orçamento.</p>
            </div>
          </div>

          <div className="fg">
            <Campo label="Telefone">
              <input
                className="inp"
                value={form.telefone}
                onChange={(e) => setCampo('telefone', e.target.value)}
                placeholder="(19) 3681-3681"
                inputMode="tel"
                maxLength={15}
              />
            </Campo>

            <Campo label="WhatsApp">
              <input
                className="inp"
                value={form.whatsapp}
                onChange={(e) => setCampo('whatsapp', e.target.value)}
                placeholder="(19) 98161-6232"
                inputMode="tel"
                maxLength={15}
              />
            </Campo>
          </div>

          <Campo label="E-mail">
            <input className="inp" value={form.email} onChange={(e) => setCampo('email', e.target.value)} inputMode="email" />
          </Campo>

          <Campo label="Site / Instagram">
            <input className="inp" value={form.site} onChange={(e) => setCampo('site', e.target.value)} />
          </Campo>

          <Campo label="URL da logo">
            <input className="inp" value={form.logo_url} onChange={(e) => setCampo('logo_url', e.target.value)} placeholder="Opcional por enquanto" />
          </Campo>
        </div>
      </div>

      <div className="g g2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="ct">
            <div>
              <h3>Endereço</h3>
              <p>Endereço completo da empresa emissora.</p>
            </div>
          </div>

          <div className="fg">
            <Campo label="CEP">
              <input
                className="inp"
                value={form.cep}
                onChange={(e) => setCampo('cep', e.target.value)}
                placeholder="13720-000"
                inputMode="numeric"
                maxLength={9}
              />
            </Campo>

            <Campo label="UF">
              <input className="inp" value={form.uf} onChange={(e) => setCampo('uf', e.target.value)} maxLength={2} placeholder="SP" />
            </Campo>
          </div>

          <Campo label="Endereço">
            <input className="inp" value={form.endereco} onChange={(e) => setCampo('endereco', e.target.value)} />
          </Campo>

          <div className="fg">
            <Campo label="Número">
              <input className="inp" value={form.numero} onChange={(e) => setCampo('numero', e.target.value)} />
            </Campo>

            <Campo label="Complemento">
              <input className="inp" value={form.complemento} onChange={(e) => setCampo('complemento', e.target.value)} />
            </Campo>
          </div>

          <div className="fg">
            <Campo label="Bairro">
              <input className="inp" value={form.bairro} onChange={(e) => setCampo('bairro', e.target.value)} />
            </Campo>

            <Campo label="Cidade">
              <input className="inp" value={form.cidade} onChange={(e) => setCampo('cidade', e.target.value)} />
            </Campo>
          </div>
        </div>

        <div className="card">
          <div className="ct">
            <div>
              <h3>Orçamento impresso</h3>
              <p>Textos que serão usados na impressão do orçamento.</p>
            </div>
          </div>

          <Campo label="Validade do orçamento em dias">
            <input
              className="inp"
              value={form.validade_orcamento_dias}
              onChange={(e) => setCampo('validade_orcamento_dias', e.target.value)}
              inputMode="numeric"
              maxLength={3}
            />
          </Campo>

          <Campo label="Texto de rodapé do orçamento">
            <textarea
              className="inp"
              style={{ minHeight: 96, resize: 'vertical' }}
              value={form.texto_rodape_orcamento}
              onChange={(e) => setCampo('texto_rodape_orcamento', e.target.value)}
            />
          </Campo>

          <Campo label="Observações internas">
            <textarea
              className="inp"
              style={{ minHeight: 74, resize: 'vertical' }}
              value={form.observacao}
              onChange={(e) => setCampo('observacao', e.target.value)}
            />
          </Campo>
        </div>
      </div>

      <div
        id="status-salvar-empresa"
        className={erro ? 'ins am' : sucesso ? 'ins gr' : alterado ? 'ins' : 'ins'}
        style={{ marginBottom: 14 }}
      >
        {erro ? (
          <>
            <strong>Atenção:</strong> {erro}
          </>
        ) : sucesso ? (
          <>
            <strong>OK:</strong> {sucesso}
            {atualizadoEm && <span> Última atualização: {formatarData(atualizadoEm)}.</span>}
          </>
        ) : alterado ? (
          <>
            <strong>Alterações pendentes:</strong> clique em salvar para gravar os dados da empresa.
          </>
        ) : (
          <>
            <strong>Status:</strong> dados carregados.
            {atualizadoEm && <span> Última atualização: {formatarData(atualizadoEm)}.</span>}
          </>
        )}
      </div>

      <div
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 5,
          padding: '12px 0 0',
          background: 'linear-gradient(180deg, rgba(15,18,25,0), rgba(15,18,25,0.98) 28%)',
        }}
      >
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="ct">
            <div>
              <h3>{alterado ? 'Alterações pendentes' : 'Dados da empresa'}</h3>
              <p>
                {alterado
                  ? 'Existem alterações ainda não salvas.'
                  : atualizadoEm
                    ? `Última atualização: ${formatarData(atualizadoEm)}.`
                    : 'Dados carregados.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="btn bo" onClick={carregar} disabled={carregando || salvando}>
                Recarregar
              </button>
              <button id="btn-salvar-dados-empresa" className="btn bp" onClick={salvar} disabled={salvando || carregando || !alterado}>
                {salvando ? 'Salvando...' : alterado ? 'Salvar alterações' : 'Salvo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
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
