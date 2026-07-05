import { useEffect, useState } from 'react';
import OsEstoque from './OsEstoque';
import { lerOsAtivaInfo, OS_ATIVA_EVENT, type OsAtivaInfo } from './osAtivaStore';

type Props = Record<string, unknown>;

export default function OsEstoqueComOsAtiva(props: Props) {
  const [osAtiva, setOsAtiva] = useState<OsAtivaInfo | null>(() => lerOsAtivaInfo());

  useEffect(() => {
    function atualizar(event: Event) {
      const detalhe = (event as CustomEvent<OsAtivaInfo>).detail;
      setOsAtiva(detalhe?.id ? detalhe : lerOsAtivaInfo());
    }

    window.addEventListener(OS_ATIVA_EVENT, atualizar as EventListener);

    return () => {
      window.removeEventListener(OS_ATIVA_EVENT, atualizar as EventListener);
    };
  }, []);

  const rotuloOs = osAtiva?.numero || (osAtiva?.id ? `OS #${osAtiva.id}` : '');

  return (
    <>
      {osAtiva?.id && (
        <div className="ins" style={{ marginBottom: 12 }}>
          <strong>OS ativa selecionada no Centro operacional:</strong> {rotuloOs}
          {osAtiva.status ? ` · ${osAtiva.status}` : ''}. Os lançamentos abaixo usarão esta OS automaticamente.
        </div>
      )}

      <OsEstoque {...(props as any)} osAtivaId={osAtiva?.id || ''} />
    </>
  );
}
