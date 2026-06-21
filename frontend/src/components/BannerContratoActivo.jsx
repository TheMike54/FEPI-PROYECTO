import { useEffect } from 'react';
import { useContratoActivo } from '../context/ContratoActivoContext.jsx';

// 3A · P3 — reemplaza el <select de contrato> repetido de cada pantalla por un banner read-only que muestra el
// CONTRATO ACTIVO global y lo HEREDA: en cuanto hay contrato activo, llama al `seleccionar` propio de la página
// (que carga sus datos), sin que el usuario re-elija. "Cambiar" reabre el modal. Si no hay contrato activo no se
// pinta nada (el modal bloqueante ya está cubriendo la pantalla).
export default function BannerContratoActivo({ seleccionar, contratoId: contratoIdLocal }) {
  const { contrato, contratoId, pedirCambio } = useContratoActivo();

  useEffect(() => {
    if (contratoId && String(contratoId) !== String(contratoIdLocal)) {
      seleccionar(String(contratoId));
    }
  }, [contratoId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!contratoId) return null;
  return (
    <div className="flex items-center gap-3 bg-sigecop-blue-light border border-sigecop-blue/20 rounded-md px-3 py-2 mb-3 text-sm" data-testid="banner-contrato-activo">
      <span>
        📄 Contrato activo: <strong className="text-sigecop-blue">{contrato?.folio || '—'}</strong>
        {contrato?.objeto ? <span className="text-slate-500"> · {contrato.objeto}</span> : null}
      </span>
      <button
        type="button"
        onClick={pedirCambio}
        className="ml-auto text-xs font-semibold bg-white border border-sigecop-blue/30 text-sigecop-blue rounded px-2.5 py-1 hover:bg-sigecop-blue-light"
        data-testid="btn-cambiar-contrato"
      >
        Cambiar
      </button>
    </div>
  );
}
