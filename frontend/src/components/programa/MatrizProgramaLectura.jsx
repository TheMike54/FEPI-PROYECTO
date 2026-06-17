import { useMemo } from 'react';

// Pase 1 (Plan 2) — Matriz CONCEPTO × PERIODO del programa de obra en SOLO LECTURA.
// Espejo read-only de TabProgramaMatriz del alta (art. 45 fr. X RLOPSRM): filas = conceptos
// del catálogo, columnas = periodos del ciclo (art. 54), celda = cantidad planeada. Reutilizable
// en el detalle de Registrados, el expediente (HU-04) y la captura de estimación (HU-12), en vez
// del resumen por concepto. Los datos salen de GET /api/contratos/:id/programa (leerProgramaObra):
//   programa = { ciclo, periodos:[{id,numero,inicio,fin}], conceptos:[{id,clave,concepto,cantidad}],
//               celdas:[{contrato_concepto_id,contrato_periodo_id,cantidad}], reconciliacion? }

// Fecha ISO (YYYY-MM-DD) → "dd/mm" sin corrimiento de zona horaria.
function ddmm(iso) {
  const p = String(iso || '').slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : '—';
}
// Redondeo a 3 decimales (espejo del round3 de la matriz del alta; las cantidades son NUMERIC(14,3)).
const r3 = (n) => Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;

// Número (1..n) del periodo cuyo rango [inicio, fin] contiene la fecha ISO dada; null si ninguno.
// Lo usa cada vista para resaltar el "periodo actual" donde aplique (comparación lexicográfica de
// ISO, sin construir Date → sin sesgo de zona horaria).
export function periodoQueContiene(periodos, iso) {
  if (!Array.isArray(periodos) || !iso) return null;
  const f = String(iso).slice(0, 10);
  const p = periodos.find((x) => String(x.inicio).slice(0, 10) <= f && f <= String(x.fin).slice(0, 10));
  return p ? p.numero : null;
}

// `mostrarRestante`: la columna "Restante" (contratado − Σ planeado) es un control de cuadre del
// programa. En el EXPEDIENTE (HU-04) el profe pidió mostrar SOLO lo contratado/programado, no el
// "restante" (revisión 16-jun: "lo contratado, no lo restante… la ejecución se ve en la curva, no aquí").
// Por eso el expediente la pasa en false; las vistas de captura/cuadre (alta, estimación) la dejan en true.
export default function MatrizProgramaLectura({ programa, periodoResaltadoNumero = null, mostrarRestante = true }) {
  const periodos = Array.isArray(programa?.periodos) ? programa.periodos : [];
  const conceptos = Array.isArray(programa?.conceptos) ? programa.conceptos : [];
  const celdas = Array.isArray(programa?.celdas) ? programa.celdas : [];

  // Índice por "ccId:pId" → cantidad, para pintar cada celda en O(1).
  const celdaMap = useMemo(() => {
    const m = new Map();
    celdas.forEach((c) => m.set(`${c.contrato_concepto_id}:${c.contrato_periodo_id}`, c.cantidad));
    return m;
  }, [celdas]);

  if (periodos.length === 0 || conceptos.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic" data-testid="matriz-programa-vacia">
        Este contrato no tiene programa de obra (matriz concepto × periodo) registrado.
      </p>
    );
  }

  return (
    <div data-testid="matriz-programa">
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2 sticky left-0 bg-sigecop-blue-light w-28">Clave</th>
              <th className="text-left px-3 py-2 w-56">Concepto</th>
              {periodos.map((p) => {
                const hot = p.numero === periodoResaltadoNumero;
                return (
                  <th
                    key={p.id ?? p.numero}
                    className={`text-right px-2 py-2 w-24 ${hot ? 'bg-blue-200 text-blue-900' : ''}`}
                    title={`${ddmm(p.inicio)} – ${ddmm(p.fin)}`}
                    data-testid={`matriz-periodo-${p.numero}`}
                  >
                    P{p.numero}{hot ? ' •' : ''}
                    <div className="text-[10px] font-normal text-blue-700">{ddmm(p.inicio)}</div>
                  </th>
                );
              })}
              <th className="text-right px-2 py-2 w-24">Σ planeado</th>
              <th className="text-right px-2 py-2 w-24">Contratado</th>
              {mostrarRestante && <th className="text-right px-2 py-2 w-24">Restante</th>}
            </tr>
          </thead>
          <tbody>
            {conceptos.map((c, i) => {
              const planeado = r3(periodos.reduce((s, p) => s + (Number(celdaMap.get(`${c.id}:${p.id}`)) || 0), 0));
              const contratado = r3(Number(c.cantidad) || 0);
              const restante = r3(contratado - planeado);
              const cuadra = Math.abs(restante) <= 0.001;
              const restCls = cuadra ? 'text-green-700' : restante < 0 ? 'text-red-700 font-bold' : 'text-amber-700';
              return (
                <tr key={c.id ?? i} className="border-t border-slate-200">
                  <td className="px-3 py-1 font-mono text-xs sticky left-0 bg-white">{c.clave || '—'}</td>
                  <td className="px-3 py-1 truncate max-w-[14rem]" title={c.concepto}>{c.concepto || '—'}</td>
                  {periodos.map((p) => {
                    const v = Number(celdaMap.get(`${c.id}:${p.id}`)) || 0;
                    const hot = p.numero === periodoResaltadoNumero;
                    return (
                      <td
                        key={p.id ?? p.numero}
                        className={`px-2 py-1 text-right ${hot ? 'bg-blue-50 font-semibold' : ''} ${v > 0 ? 'text-slate-800' : 'text-slate-300'}`}
                        data-testid={`matriz-celda-${i}-${p.numero}`}
                      >
                        {v > 0 ? r3(v) : '·'}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1 text-right font-semibold">{planeado}</td>
                  <td className="px-2 py-1 text-right text-slate-600">{contratado}</td>
                  {mostrarRestante && <td className={`px-2 py-1 text-right ${restCls}`}>{restante}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 mt-1">
        Ciclo: {programa.ciclo || '—'} · {periodos.length} periodo{periodos.length === 1 ? '' : 's'}. La celda es la cantidad planeada del concepto en ese periodo (art. 45 fr. X RLOPSRM){periodoResaltadoNumero ? ' · • = periodo actual' : ''}.
      </p>
    </div>
  );
}
