import { useEffect } from 'react';
import { CurvaSVG } from '../../pages/CurvaAvance.jsx';
import { curvaS, ganttSemaforo, periodosOrdenados, recortarPeriodos, hoyISO } from '../../services/reportesContrato.js';

// REPORTE 1 (HU-19) · REDISEÑO 24-jun (Maiki) — DOCUMENTO IMPRIMIBLE de "Avance físico vs programado".
// Reemplaza el jsPDF crudo por el patrón window.print de la carátula (body.doc-nota-abierto + data-print-area
// + @media print). NO recalcula nada nuevo: reusa curvaS() y ganttSemaforo() de reportesContrato.js (misma
// definición que la curva de pantalla, HU-05) y el componente CurvaSVG de CurvaAvance. Si no hay programa, el
// documento sale con encabezados y un aviso, nunca con datos ficticios.
// Mockup: banda guinda · 3 métricas (Programado a hoy, Ejecutado a hoy, Desviación como "Atraso de X%"
// SIEMPRE positivo) · curva S de 3 series · matriz concepto×periodo con semáforo + leyenda.

const dISO = (v) => (v == null ? '' : String(v).slice(0, 10));
const fechaMX = () => new Date().toLocaleDateString('es-MX', { dateStyle: 'long' });
const pct1 = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);

// Semáforo de la matriz (misma paleta que CurvaAvance.COLOR_CELDA).
const COLOR_CELDA = {
  ejecutado: 'bg-sigecop-green-validation',
  atraso:    'bg-red-400',
  pendiente: 'bg-sigecop-amber-attention',
  vacio:     'bg-slate-200'
};

export default function DocumentoAvanceFisico({ datos, contrato, periodo, onCerrar }) {
  useEffect(() => {
    document.body.classList.add('doc-nota-abierto');
    return () => document.body.classList.remove('doc-nota-abierto');
  }, []);

  const d = datos || {};
  const c = contrato || {};
  const hoy = hoyISO();
  const periodos = periodosOrdenados(d.programa);
  const visibles = recortarPeriodos(periodos, periodo);
  const visSet = new Set(visibles.map((p) => p.numero));

  // Periodo actual (el que contiene hoy; si hoy es posterior a todos, el último; antes de todos, ninguno).
  const periodoActualNum = (() => {
    if (!periodos.length) return null;
    const dentro = periodos.find((p) => dISO(p.inicio) <= hoy && dISO(p.fin) >= hoy);
    if (dentro) return dentro.numero;
    const ult = periodos[periodos.length - 1];
    return hoy > dISO(ult.fin) ? ult.numero : null;
  })();

  // Curva S (3 series) acotada al periodo visible + punto de origen 0% (igual que la curva de pantalla).
  const curva = curvaS(d.programa, d.trabajos, d.pagos, c.monto)
    .filter((x) => visSet.has(x.numero))
    .map((x) => ({ label: x.mes, numero: x.numero, programado: x.programado, ejecutado: x.ejecutado, financiero: x.financiero }));
  const primero = periodos[0];
  if (curva.length && primero && visibles[0]?.numero === primero.numero) {
    const iniciado = dISO(primero.inicio) <= hoy;
    curva.unshift({
      label: 'Inicio', numero: 0, esOrigen: true,
      programado: 0,
      ejecutado: iniciado ? 0 : null,
      financiero: (iniciado && Number(c.monto) > 0) ? 0 : null
    });
  }
  const hoyIndex = (() => { const i = curva.findIndex((x) => !x.esOrigen && x.numero === periodoActualNum); return i >= 0 ? i : null; })();

  // 3 métricas "a hoy": valores del periodo actual (o el último con ejecutado).
  const ref = curva.find((x) => x.numero === periodoActualNum)
    || [...curva].reverse().find((x) => x.ejecutado != null)
    || curva[curva.length - 1] || {};
  const progHoy = ref.programado ?? null;
  const ejecHoy = ref.ejecutado ?? null;
  // Desviación SIEMPRE en positivo como "Atraso" (mockup): atraso = max(0, programado − ejecutado).
  const atraso = (progHoy != null && ejecHoy != null) ? Math.max(0, progHoy - ejecHoy) : null;

  const semaforo = ganttSemaforo(d.programa, d.trabajos, visibles, hoy);
  const printColor = { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' };
  const hayCurva = curva.length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black bg-opacity-40 p-4 overflow-auto" data-testid="documento-avance-fisico">
      <div className="bg-white rounded-md shadow-lg max-w-4xl w-full my-6" data-print-area style={printColor}>
        {/* Barra de acciones (NO se imprime) */}
        <div className="px-6 py-3 border-b border-borde flex items-center justify-between" data-print-ocultar>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Reporte 1 · Avance físico vs programado</h3>
          <div className="flex gap-2">
            <button type="button" className="sg-btn-primary" onClick={() => window.print()} data-testid="btn-imprimir-avance-fisico">🖨 Imprimir / PDF</button>
            <button type="button" className="text-slate-500 hover:text-slate-800 text-xl leading-none" onClick={onCerrar} aria-label="Cerrar">×</button>
          </div>
        </div>

        {/* Banda guinda */}
        <div className="bg-guinda text-white px-8 py-4" style={printColor}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest opacity-90">SIGECOP · Reporte de avance (HU-19)</div>
              <div className="text-xl font-bold leading-tight">Avance físico vs programado</div>
            </div>
            <div className="text-right text-xs">
              <div className="uppercase tracking-wider opacity-90">Periodo</div>
              <div className="font-semibold text-sm">{periodo}</div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 text-sm text-tinta leading-relaxed space-y-5">
          {/* Datos del contrato */}
          <div className="text-xs text-slate-600">
            <span className="font-semibold">Contrato:</span> <span className="font-mono">{c.folio || '—'}</span>
            {c.contratista ? ` · ${c.contratista}` : ''}{c.objeto ? ` · ${c.objeto}` : ''}
            <span className="block text-slate-400">Generado: {fechaMX()}</span>
          </div>

          {/* 3 métricas a hoy */}
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-borde rounded-md px-4 py-3 bg-pagina">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Programado a hoy</div>
              <div className="text-lg font-bold text-tinta" data-testid="metrica-programado">{pct1(progHoy)}</div>
            </div>
            <div className="border border-borde rounded-md px-4 py-3 bg-pagina">
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Ejecutado a hoy</div>
              <div className="text-lg font-bold text-tinta" data-testid="metrica-ejecutado">{pct1(ejecHoy)}</div>
            </div>
            <div className={`border rounded-md px-4 py-3 ${atraso != null && atraso > 0.05 ? 'border-red-300 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`} style={printColor}>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Desviación</div>
              <div className={`text-lg font-bold ${atraso != null && atraso > 0.05 ? 'text-red-700' : 'text-emerald-700'}`} data-testid="metrica-desviacion">
                {atraso == null ? '—' : atraso > 0.05 ? `Atraso de ${atraso.toFixed(1)}%` : 'Sin atraso'}
              </div>
            </div>
          </div>

          {/* Curva S (programado · ejecutado · financiero) */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-guinda mb-1">Curva S — programado · ejecutado · financiero</div>
            <div className="border border-borde rounded-md p-4">
              {hayCurva
                ? <CurvaSVG datos={curva} hoyIndex={hoyIndex} />
                : <p className="text-sm text-slate-400 italic text-center py-8">Este contrato no tiene programa de obra para el periodo seleccionado; no hay curva que graficar.</p>}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Las series inician en 0% al inicio del contrato; programado llega a 100% y ejecutado/financiero se detienen en <strong>hoy</strong>.
              Financiero = Σ pagos ÷ monto del contrato (mismo número que la curva de la pantalla HU-05).
            </p>
          </div>

          {/* Matriz concepto × periodo con semáforo */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-guinda mb-1">Programa de obra — concepto × periodo (semáforo)</div>
            <div className="overflow-x-auto border border-borde rounded-md">
              <table className="w-full text-[11px]" data-testid="avance-matriz">
                <thead className="bg-pagina text-slate-700">
                  <tr>
                    <th className="text-left p-2 font-semibold">Concepto</th>
                    {visibles.map((p) => (
                      <th key={p.id} className="p-2 font-semibold text-center" title={`${dISO(p.inicio)} – ${dISO(p.fin)}`}>#{p.numero}<br /><span className="font-normal text-slate-400">{p.numero}</span></th>
                    ))}
                    <th className="text-right p-2 font-semibold">% Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {semaforo.length === 0 || visibles.length === 0 ? (
                    <tr><td colSpan={visibles.length + 2} className="p-3 text-center text-slate-400 italic">Sin programa de obra que mostrar.</td></tr>
                  ) : semaforo.map((row, idx) => (
                    <tr key={idx} className="border-t border-borde">
                      <td className="p-2 whitespace-nowrap">{(row.clave ? `${row.clave} · ` : '')}{row.concepto}</td>
                      {row.celdas.map((cel, i) => (
                        <td key={i} className="p-1">
                          <div className={`h-5 rounded ${COLOR_CELDA[cel.estado]}`} style={printColor} title={`#${cel.numero}: ${cel.estado}`} data-estado={cel.estado} />
                        </td>
                      ))}
                      <td className="p-2 text-right font-mono text-sigecop-blue">{pct1(row.pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Leyenda */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-[11px] text-slate-700">
              <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded bg-sigecop-green-validation" style={printColor} /><span>Ejecutado</span></div>
              <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded bg-red-400" style={printColor} /><span>Atraso (vencido sin ejecutar)</span></div>
              <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded bg-sigecop-amber-attention" style={printColor} /><span>Programado por venir</span></div>
              <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded bg-slate-200" style={printColor} /><span>No programado</span></div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 border-t border-borde pt-2">
            Documento generado por SIGECOP a partir del programa de obra, los trabajos terminados (HU-06) y los pagos del contrato.
            El periodo "{periodo}" acota el rango de columnas/curva, sin alterar el contenido del reporte (CA-2, HU-19).
          </p>
        </div>
      </div>
    </div>
  );
}
