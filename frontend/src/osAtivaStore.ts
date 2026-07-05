export const OS_ATIVA_STORAGE_KEY = 'servicopro_os_ativa_id';
export const OS_ATIVA_OBJ_STORAGE_KEY = 'servicopro_os_ativa_obj';
export const OS_ATIVA_EVENT = 'servicopro:os-ativa-alterada';

export type OsAtivaInfo = {
  id: string;
  numero?: string;
  status?: string;
  descricao?: string;
};

export function normalizarOsAtiva(entrada: number | string | Partial<OsAtivaInfo> | null | undefined): OsAtivaInfo | null {
  if (entrada == null) return null;

  if (typeof entrada === 'object') {
    const id = String(entrada.id ?? '').trim();
    if (!id) return null;

    return {
      id,
      numero: entrada.numero ? String(entrada.numero) : undefined,
      status: entrada.status ? String(entrada.status) : undefined,
      descricao: entrada.descricao ? String(entrada.descricao) : undefined,
    };
  }

  const id = String(entrada).trim();
  if (!id) return null;

  return { id };
}

export function salvarOsAtiva(entrada: number | string | Partial<OsAtivaInfo> | null | undefined) {
  const os = normalizarOsAtiva(entrada);

  if (os?.id) {
    localStorage.setItem(OS_ATIVA_STORAGE_KEY, os.id);
    localStorage.setItem(OS_ATIVA_OBJ_STORAGE_KEY, JSON.stringify(os));
  } else {
    localStorage.removeItem(OS_ATIVA_STORAGE_KEY);
    localStorage.removeItem(OS_ATIVA_OBJ_STORAGE_KEY);
  }

  window.dispatchEvent(
    new CustomEvent(OS_ATIVA_EVENT, {
      detail: os || { id: '' },
    }),
  );
}

export function lerOsAtiva() {
  return localStorage.getItem(OS_ATIVA_STORAGE_KEY) || '';
}

export function lerOsAtivaInfo(): OsAtivaInfo | null {
  const bruto = localStorage.getItem(OS_ATIVA_OBJ_STORAGE_KEY);

  if (bruto) {
    try {
      const parsed = JSON.parse(bruto) as Partial<OsAtivaInfo>;
      const os = normalizarOsAtiva(parsed);
      if (os?.id) return os;
    } catch {
      // ignora storage antigo/corrompido
    }
  }

  const id = lerOsAtiva();
  return id ? { id } : null;
}
