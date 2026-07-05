/**
 * Padrão global do ServiçoPro:
 * Enter em campos de formulário avança para o próximo campo útil.
 *
 * Regras:
 * - input/select: Enter avança.
 * - textarea: Enter mantém quebra de linha.
 * - Shift/Ctrl/Alt/Meta + Enter: comportamento nativo.
 * - botões: comportamento nativo.
 * - campos readonly/disabled/ocultos são ignorados.
 * - campo de busca global não é interceptado.
 */

function elementoVisivel(elemento: HTMLElement): boolean {
  const style = window.getComputedStyle(elemento);

  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (elemento.hasAttribute('hidden')) return false;

  const rect = elemento.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function elementoEditavel(elemento: HTMLElement): boolean {
  if (elemento instanceof HTMLInputElement) {
    const tiposIgnorados = new Set([
      'button',
      'submit',
      'reset',
      'checkbox',
      'radio',
      'file',
      'hidden',
      'image',
      'range',
      'color',
    ]);

    if (tiposIgnorados.has(elemento.type)) return false;
    if (elemento.disabled) return false;
    if (elemento.readOnly) return false;

    return true;
  }

  if (elemento instanceof HTMLSelectElement) {
    if (elemento.disabled) return false;
    return true;
  }

  return false;
}

function deveIgnorarAlvo(alvo: HTMLElement): boolean {
  if (alvo.closest('[data-enter-skip="true"]')) return true;
  if (alvo.closest('[data-enter-native="true"]')) return true;
  if (alvo.closest('.sw')) return true;
  if (alvo.classList.contains('sinp')) return true;

  if (alvo instanceof HTMLTextAreaElement) return true;
  if (alvo instanceof HTMLButtonElement) return true;
  if (alvo.isContentEditable) return true;

  return false;
}

function obterCamposNavegaveis(): HTMLElement[] {
  const seletores = [
    'input',
    'select',
    'textarea',
    'button',
  ].join(',');

  return Array.from(document.querySelectorAll<HTMLElement>(seletores))
    .filter((elemento) => {
      if (!elementoVisivel(elemento)) return false;

      if (elemento instanceof HTMLButtonElement) {
        if (elemento.disabled) return false;
        return true;
      }

      if (elemento instanceof HTMLTextAreaElement) {
        if (elemento.disabled) return false;
        if (elemento.readOnly) return false;
        return true;
      }

      return elementoEditavel(elemento);
    });
}

function focarElemento(elemento: HTMLElement) {
  elemento.focus();

  if (elemento instanceof HTMLInputElement || elemento instanceof HTMLTextAreaElement) {
    try {
      elemento.select();
    } catch {
      // Alguns tipos de input nao permitem select().
    }
  }
}

function avancarParaProximoCampo(alvo: HTMLElement) {
  const campos = obterCamposNavegaveis();
  const indiceAtual = campos.indexOf(alvo);

  if (indiceAtual < 0) return;

  const proximo = campos.slice(indiceAtual + 1).find((campo) => {
    if (campo instanceof HTMLButtonElement) return true;
    if (campo instanceof HTMLTextAreaElement) return true;
    return elementoEditavel(campo);
  });

  if (proximo) {
    focarElemento(proximo);
  }
}

function tratarEnterGlobal(evento: KeyboardEvent) {
  if (evento.defaultPrevented) return;
  if (evento.key !== 'Enter') return;
  if (evento.shiftKey || evento.ctrlKey || evento.altKey || evento.metaKey) return;

  const alvo = evento.target;
  if (!(alvo instanceof HTMLElement)) return;

  if (deveIgnorarAlvo(alvo)) return;

  if (!elementoEditavel(alvo)) return;

  evento.preventDefault();
  avancarParaProximoCampo(alvo);
}

declare global {
  interface Window {
    __servicoproEnterGlobalInstalado?: boolean;
  }
}

if (typeof window !== 'undefined' && !window.__servicoproEnterGlobalInstalado) {
  window.__servicoproEnterGlobalInstalado = true;
  document.addEventListener('keydown', tratarEnterGlobal, true);
}

export {};
