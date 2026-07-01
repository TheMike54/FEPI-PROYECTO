import { useState } from 'react';
import { useSimulacionFecha } from '../../context/SimulacionFechaContext.jsx';

// PASTILLA DE FECHA DE SIMULACIÓN (barra superior, siempre visible para todos los roles). Muestra la
// "fecha actual del sistema" (por defecto = hoy real). Al desplegar: periodo anterior / siguiente
// (±1 mes), fecha exacta (date picker) y "volver a hoy real". Cuando la fecha simulada ≠ hoy real, la
// pastilla se RESALTA (borde/fondo dorado + "SIM") para dejar OBVIO que se está en modo simulación.
//
// ⚠️ Es un LENTE DE LECTURA: cambia solo la fecha con la que se calculan/muestran alertas, vencimientos
// y semáforos. NO escribe nada en la base de datos (ver context/SimulacionFechaContext + services/api.js).
// Colores institucionales: guinda #691C32 / dorado #BC955C.

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fechaLegible(iso) {
  const p = String(iso || '').slice(0, 10).split('-');
  if (p.length !== 3) return '—';
  return `${p[2]} ${MESES[Number(p[1]) - 1] || '??'} ${p[0]}`;
}

export default function SelectorFechaSimulacion() {
  const {
    fechaRef, hoyReal, esSimulando, setFecha, volverAHoy, periodoAnterior, periodoSiguiente,
  } = useSimulacionFecha();
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={esSimulando ? `Fecha de simulación: ${fechaRef}. Clic para cambiar.` : 'Fecha del sistema. Clic para simular otra fecha.'}
        title={esSimulando
          ? `SIMULANDO ${fechaRef} · hoy real: ${hoyReal}. Solo cambia cómo se ven alertas/vencimientos; no modifica la base de datos.`
          : `Fecha del sistema: ${fechaRef} (hoy real). Clic para "ver" el sistema desde otra fecha (alertas, vencimientos, plazos).`}
        data-testid="selector-fecha-sim"
        data-simulando={esSimulando ? '1' : '0'}
        className={
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ' +
          (esSimulando
            ? 'bg-dorado text-guinda-dark border-2 border-white/70 shadow-sm ring-1 ring-dorado'
            : 'bg-white/10 border border-white/30 text-white hover:bg-white/20')
        }
      >
        <span aria-hidden="true">📅</span>
        <span className="max-w-[8.5rem] truncate">{fechaLegible(fechaRef)}</span>
        {esSimulando && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded bg-guinda text-white text-[9px] font-bold leading-none tracking-wide">SIM</span>
        )}
        <span className="opacity-70" aria-hidden="true">▾</span>
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} aria-hidden="true" data-testid="sim-backdrop" />
          <div
            data-testid="drop-fecha-sim"
            className="absolute left-0 mt-2 z-50 w-72 max-w-[92vw] bg-white text-tinta rounded-lg shadow-xl border border-borde overflow-hidden"
          >
            <div className="px-4 py-2.5 border-b border-borde font-semibold text-sm flex items-center gap-2 text-guinda">
              📅 Fecha del sistema
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-[11px] text-tinta-ter leading-snug">
                Lente de <strong>solo lectura</strong>: cambia cómo se ven alertas de atraso, vencimientos
                y plazos. <strong>No modifica la base de datos</strong> ni ningún registro.
              </p>

              <div>
                <div className="text-[11px] text-tinta-ter uppercase tracking-wide mb-1">Fecha de referencia</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={periodoAnterior}
                    data-testid="sim-periodo-anterior"
                    title="Periodo anterior (−1 mes)"
                    className="w-8 h-8 rounded-md border border-borde hover:bg-guinda-soft text-guinda font-bold flex items-center justify-center"
                  >
                    ◀
                  </button>
                  <input
                    type="date"
                    value={fechaRef}
                    onChange={(e) => setFecha(e.target.value)}
                    data-testid="sim-datepicker"
                    className="flex-1 min-w-0 border border-borde rounded-md px-2 py-1.5 text-sm text-tinta focus:outline-none focus:ring-2 focus:ring-dorado"
                  />
                  <button
                    type="button"
                    onClick={periodoSiguiente}
                    data-testid="sim-periodo-siguiente"
                    title="Periodo siguiente (+1 mes)"
                    className="w-8 h-8 rounded-md border border-borde hover:bg-guinda-soft text-guinda font-bold flex items-center justify-center"
                  >
                    ▶
                  </button>
                </div>
              </div>

              <div className="text-xs">
                {esSimulando ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-dorado/20 text-guinda-dark font-medium" data-testid="sim-estado">
                    ⚠️ Simulando · hoy real: {hoyReal}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 text-tinta-ter" data-testid="sim-estado">
                    En tiempo real
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={volverAHoy}
                disabled={!esSimulando}
                data-testid="sim-volver-hoy"
                className={
                  'w-full text-sm font-semibold rounded-md px-3 py-2 transition ' +
                  (esSimulando
                    ? 'bg-guinda text-white hover:bg-guinda-dark'
                    : 'bg-slate-100 text-tinta-ter cursor-not-allowed')
                }
              >
                Volver a hoy real ({hoyReal})
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
