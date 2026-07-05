import { useEffect } from 'react';

type Props = {
  clientes: any[];
  ativos: any[];
};

function normalizar(valor: unknown) {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function clienteIdDoAtivo(ativo: any) {
  return String(
    ativo?.cliente_id ??
    ativo?.clienteId ??
    ativo?.id_cliente ??
    ativo?.cliente?.id ??
    ativo?.cliente_codigo ??
    '',
  ).trim();
}

function clienteNomeDoAtivo(ativo: any) {
  const cliente = ativo?.cliente;

  if (typeof cliente === 'string') return cliente;

  return String(
    ativo?.cliente_nome ??
    ativo?.nome_cliente ??
    ativo?.proprietario ??
    ativo?.proprietario_nome ??
    cliente?.nome ??
    cliente?.razao_social ??
    '',
  ).trim();
}

function assinaturaAtivo(ativo: any) {
  return normalizar([
    ativo?.id,
    ativo?.descricao,
    ativo?.nome,
    ativo?.identificacao,
    ativo?.placa,
    ativo?.serie,
    ativo?.codigo,
    ativo?.marca,
    ativo?.modelo,
    [ativo?.marca, ativo?.modelo].filter(Boolean).join(' '),
  ].join(' '));
}

function assinaturaCliente(cliente: any) {
  return normalizar([
    cliente?.id,
    cliente?.nome,
    cliente?.razao_social,
    cliente?.documento,
    cliente?.telefone,
    cliente?.email,
  ].join(' '));
}

function optionBateCliente(option: HTMLOptionElement, cliente: any) {
  const texto = normalizar(`${option.value} ${option.textContent}`);
  const id = normalizar(cliente?.id);
  const nome = assinaturaCliente(cliente);

  return (!!id && normalizar(option.value) === id) || (!!nome && texto.includes(nome.split(' ')[0]) && nome.split(' ').some((p) => p.length > 3 && texto.includes(p)));
}

function optionBateAtivo(option: HTMLOptionElement, ativo: any) {
  const texto = normalizar(`${option.value} ${option.textContent}`);
  const id = normalizar(ativo?.id);
  const assinatura = assinaturaAtivo(ativo);
  const partes = assinatura.split(' ').filter((p) => p.length > 2);

  return (
    (!!id && normalizar(option.value) === id) ||
    (!!id && texto.includes(id)) ||
    partes.some((p) => texto.includes(p))
  );
}

function clienteSelecionadoPorSelect(select: HTMLSelectElement, clientes: any[]) {
  const option = select.selectedOptions?.[0];
  if (!option) return null;

  const porValue = clientes.find((cliente) => String(cliente?.id) === String(select.value));
  if (porValue) return porValue;

  return clientes.find((cliente) => optionBateCliente(option, cliente)) || null;
}

function ativoPorOption(option: HTMLOptionElement, ativos: any[]) {
  const porValue = ativos.find((ativo) => String(ativo?.id) === String(option.value));
  if (porValue) return porValue;

  return ativos.find((ativo) => optionBateAtivo(option, ativo)) || null;
}

function selectPareceCliente(select: HTMLSelectElement, clientes: any[]) {
  const contexto = normalizar([
    select.name,
    select.id,
    select.getAttribute('aria-label'),
    select.closest('.field')?.textContent,
    select.parentElement?.textContent,
  ].join(' '));

  if (contexto.includes('cliente')) return true;

  const options = Array.from(select.options).slice(0, 8);
  return options.some((option) => clientes.some((cliente) => optionBateCliente(option, cliente)));
}

function selectPareceAtivo(select: HTMLSelectElement, ativos: any[]) {
  const contexto = normalizar([
    select.name,
    select.id,
    select.getAttribute('aria-label'),
    select.closest('.field')?.textContent,
    select.parentElement?.textContent,
  ].join(' '));

  if (contexto.includes('ativo') || contexto.includes('veiculo') || contexto.includes('veiculo / ativo')) return true;

  const options = Array.from(select.options).slice(0, 8);
  return options.some((option) => ativos.some((ativo) => optionBateAtivo(option, ativo)));
}

function ativoPertenceAoCliente(ativo: any, cliente: any) {
  if (!ativo || !cliente) return true;

  const idClienteAtivo = clienteIdDoAtivo(ativo);
  const idCliente = String(cliente?.id ?? '').trim();

  if (idClienteAtivo && idCliente) {
    return idClienteAtivo === idCliente;
  }

  const nomeClienteAtivo = normalizar(clienteNomeDoAtivo(ativo));
  const nomeCliente = assinaturaCliente(cliente);

  if (nomeClienteAtivo && nomeCliente) {
    return nomeCliente.includes(nomeClienteAtivo) || nomeClienteAtivo.includes(nomeCliente) || nomeCliente.split(' ').some((p) => p.length > 3 && nomeClienteAtivo.includes(p));
  }

  return true;
}

function aviso(card: HTMLElement, mostrar: boolean, texto: string) {
  let el = card.querySelector('[data-cliente-ativo-aviso="1"]') as HTMLDivElement | null;

  if (!mostrar) {
    el?.remove();
    return;
  }

  if (!el) {
    el = document.createElement('div');
    el.setAttribute('data-cliente-ativo-aviso', '1');
    el.className = 'ins am';
    el.style.marginBottom = '12px';

    const primeiroCampo = card.querySelector('.field');
    if (primeiroCampo?.parentElement) {
      primeiroCampo.parentElement.insertBefore(el, primeiroCampo);
    } else {
      card.prepend(el);
    }
  }

  el.innerHTML = `<strong>Atenção:</strong> ${texto}`;
}

function aplicar(clientes: any[], ativos: any[]) {
  if (!clientes.length || !ativos.length) return;

  const containers = Array.from(document.querySelectorAll('.card, form, section, main')) as HTMLElement[];

  for (const container of containers) {
    const selects = Array.from(container.querySelectorAll('select')) as HTMLSelectElement[];

    const clienteSelect = selects.find((select) => selectPareceCliente(select, clientes));
    const ativoSelect = selects.find((select) => selectPareceAtivo(select, ativos));

    if (!clienteSelect || !ativoSelect || clienteSelect === ativoSelect) continue;

    const cliente = clienteSelecionadoPorSelect(clienteSelect, clientes);

    if (!cliente) {
      aviso(container, false, '');
      continue;
    }

    let selecionadoInvalido = false;

    Array.from(ativoSelect.options).forEach((option) => {
      if (!option.value) {
        option.disabled = false;
        option.hidden = false;
        return;
      }

      const ativo = ativoPorOption(option, ativos);
      const pertence = ativoPertenceAoCliente(ativo, cliente);

      option.disabled = !pertence;
      option.hidden = !pertence;

      if (option.selected && !pertence) {
        selecionadoInvalido = true;
      }
    });

    if (selecionadoInvalido) {
      ativoSelect.value = '';
      ativoSelect.dispatchEvent(new Event('input', { bubbles: true }));
      ativoSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const ativoAtual = ativoSelect.selectedOptions?.[0] ? ativoPorOption(ativoSelect.selectedOptions[0], ativos) : null;
    const invalido = !!ativoAtual && !ativoPertenceAoCliente(ativoAtual, cliente);

    const botoes = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[];
    botoes.forEach((botao) => {
      const texto = normalizar(botao.textContent);
      const ehSalvar = texto.includes('salvar') || texto.includes('gerar') || texto.includes('lançar') || texto.includes('lancar') || texto.includes('agendar');
      if (ehSalvar) {
        botao.disabled = invalido;
        botao.setAttribute('data-bloqueio-cliente-ativo', invalido ? '1' : '0');
      }
    });

    aviso(
      container,
      invalido,
      'O ativo/veículo selecionado não pertence ao cliente informado. Escolha um ativo vinculado ao proprietário correto.',
    );

    ativoSelect.setAttribute('data-vinculo-cliente-ativo-aplicado', String(cliente?.id ?? ''));
  }
}

export default function ClienteAtivoVinculoGuard({ clientes, ativos }: Props) {
  useEffect(() => {
    const executar = () => aplicar(clientes || [], ativos || []);

    executar();

    const timers = [
      window.setTimeout(executar, 100),
      window.setTimeout(executar, 350),
      window.setTimeout(executar, 800),
      window.setTimeout(executar, 1500),
    ];

    const observer = new MutationObserver(() => executar());

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'disabled'],
    });

    document.body.addEventListener('change', executar, true);
    document.body.addEventListener('input', executar, true);
    document.body.addEventListener('click', executar, true);
    document.body.addEventListener('focusin', executar, true);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      observer.disconnect();
      document.body.removeEventListener('change', executar, true);
      document.body.removeEventListener('input', executar, true);
      document.body.removeEventListener('click', executar, true);
      document.body.removeEventListener('focusin', executar, true);
    };
  }, [clientes, ativos]);

  return null;
}
