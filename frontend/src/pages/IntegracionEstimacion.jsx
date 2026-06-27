import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LinkHU from '../components/LinkHU.jsx';
import PestanasCiclo from '../components/PestanasCiclo.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import EncabezadoContrato from '../components/ui/EncabezadoContrato.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { labelEstadoEstimacion } from '../data/estadoEstimacion.js';
import { monedaMXN as moneda, round2 } from '../utils/formato.js';
import DocumentoNota from '../components/notas/DocumentoNota.jsx';
import DocumentoCaratula from '../components/estimacion/DocumentoCaratula.jsx';
import MatrizProgramaLectura, { periodoQueContiene } from '../components/programa/MatrizProgramaLectura.jsx';
import BannerContratoActivo from '../components/BannerContratoActivo.jsx';

// HU-12 Fase 3 — cableado al backend real. El superintendente del contrato integra
// la estimación del periodo como expediente (art. 132 RLOPSRM). Toda la verdad del
// dinero la calcula el backend al integrar; la carátula del cliente es SOLO preview.

// moneda: utilidad compartida (utils/formato.js)
const num = (n) => (Number(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 4 });
// Redondeo a 2 decimales (centavos), ESPEJO del r2() del backend: la carátula viva muestra
// EXACTAMENTE lo que materializará el server (importe=ROUND(cant×pu,2); amort/retención ROUND a 2).
// Barra de avance (0–100%) con etiqueta. Presentación pura.
function BarraAvance({ label, pct, color, testid }) {
  const v = pct == null ? null : Math.max(0, Math.min(100, Number(pct)));
  return (
    <div data-testid={testid}>
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span><span className="font-mono">{v == null ? '—' : `${v.toFixed(1)}%`}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${v == null ? 0 : v}%` }} />
      </div>
    </div>
  );
}
// dd/mm/aaaa sin corrimiento de zona horaria (parte de fecha de un ISO/Date). Para fechas tipo DATE
// (periodos, integrada_en) que NO llevan hora; NO cambiar.
const fechaMX = (iso) => {
  const p = (iso || '').slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : '—';
};
// Pase 2.2: para la fecha de una NOTA de bitácora (columna TIMESTAMPTZ) se muestra fecha Y HORA,
// mismo formato es-MX que la bitácora. Solo para notas; las demás celdas siguen con fechaMX.
const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const EPS = 1e-6;

const CLASE_ESTADO = {
  integrada: 'bg-sigecop-blue-light text-sigecop-blue',
  enviada: 'bg-amber-100 text-amber-800',
  autorizada: 'bg-green-100 text-sigecop-green-validation',
  pagada: 'bg-green-100 text-sigecop-green-validation',
  rechazada: 'bg-red-100 text-red-700'
};
const BadgeEstado = ({ estado }) => (
  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${CLASE_ESTADO[estado] || 'bg-slate-100 text-slate-600'}`}>
    {labelEstadoEstimacion(estado)}
  </span>
);

// ---------------------------------------------------------------------------
// Reporte fotográfico del avance del periodo — paso 4 del wizard de estimación.
// Muestra las fotos del avance (avance_fotos) agrupadas por concepto para el
// periodo que se está estimando (art. 132 fr. IV RLOPSRM).
// ---------------------------------------------------------------------------
function FotosAvancePeriodo({ fotos, cargando }) {
  const [urls, setUrls] = useState({});

  useEffect(() => {
    if (!fotos || fotos.length === 0) { setUrls({}); return; }
    let activo = true;
    const nuevos = {};
    Promise.all(fotos.map(async (f) => {
      try {
        const url = await api.descargarFotoAvance(f.id);
        if (activo) nuevos[f.id] = url;
      } catch { /* skip foto con error */ }
    })).then(() => {
      if (activo) setUrls((prev) => {
        Object.values(prev).forEach((u) => { try { URL.revokeObjectURL(u); } catch { /* noop */ } });
        return { ...nuevos };
      });
    });
    return () => {
      activo = false;
      Object.values(nuevos).forEach((u) => { try { URL.revokeObjectURL(u); } catch { /* noop */ } });
    };
  }, [fotos]);

  useEffect(() => () => {
    setUrls((prev) => {
      Object.values(prev).forEach((u) => { try { URL.revokeObjectURL(u); } catch { /* noop */ } });
      return {};
    });
  }, []);

  if (cargando) return <p className="text-sm text-slate-500 italic py-4">Cargando reporte fotográfico…</p>;
  if (!fotos || fotos.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic py-4" data-testid="fotos-avance-vacias">
        Sin reporte fotográfico del avance para este periodo.
      </p>
    );
  }

  // Agrupar por contrato_concepto_id preservando el orden de aparición
  const grupos = [];
  const idx = {};
  fotos.forEach((f) => {
    const k = f.contrato_concepto_id;
    if (idx[k] == null) { idx[k] = grupos.length; grupos.push({ key: k, clave: f.clave, concepto: f.concepto, unidad: f.unidad, fotos: [] }); }
    grupos[idx[k]].fotos.push(f);
  });

  return (
    <div className="space-y-5" data-testid="fotos-avance-periodo">
      {grupos.map((g) => (
        <div key={g.key}>
          <p className="text-xs font-semibold text-slate-600 mb-2">
            <span className="font-mono text-sigecop-blue">{g.clave}</span> — {g.concepto} <span className="text-slate-400">({g.unidad})</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {g.fotos.map((f) => (
              <div key={f.id} className="border border-slate-200 rounded-md overflow-hidden" data-testid={`foto-avance-${f.id}`}>
                {urls[f.id]
                  ? <a href={urls[f.id]} target="_blank" rel="noopener noreferrer">
                      <img src={urls[f.id]} alt={f.nombre} className="w-full h-36 object-cover" />
                    </a>
                  : <div className="w-full h-36 bg-slate-100 flex items-center justify-center text-2xl">📷</div>}
                <div className="p-2">
                  <p className="text-xs text-slate-700 leading-snug">{f.descripcion || <span className="italic text-slate-400">Sin descripción</span>}</p>
                  <p className="text-[10px] text-slate-400 mt-1 truncate">{f.nombre}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detalle de una estimación del historial (PASO 7) — datos REALES del backend
// (GET /estimaciones/:id): carátula + generadores (importe/acumulado/% avance) +
// notas vinculadas + estado.
// ---------------------------------------------------------------------------
function ModalDetalle({ estimacion, onCerrar, onVerDocumento, onVerCaratula }) {
  const e = estimacion;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4" data-testid="modal-detalle">
      <div className="bg-white rounded-md shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-sigecop-blue">
            Estimación #{e.numero} · {fechaMX(e.periodo_inicio)} – {fechaMX(e.periodo_fin)} <BadgeEstado estado={e.estado} />
          </h3>
          <button type="button" className="text-slate-400 hover:text-slate-700 text-xl leading-none" onClick={onCerrar} aria-label="Cerrar">×</button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-2">Carátula</h4>
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-200"><td className="px-4 py-2">Subtotal</td><td className="px-4 py-2 text-right font-mono">{moneda(e.subtotal)}</td></tr>
                  <tr className="border-b border-slate-200"><td className="px-4 py-2">(−) Amortización de anticipo ({Number(e.anticipo_pct_snapshot)}%)</td><td className="px-4 py-2 text-right font-mono">−{moneda(e.amortizacion)}</td></tr>
                  <tr className="border-b border-slate-200"><td className="px-4 py-2">(−) Retención 5 al millar (art. 191 LFD)</td><td className="px-4 py-2 text-right font-mono">−{moneda(e.retencion)}</td></tr>
                  <tr className="border-b border-slate-200"><td className="px-4 py-2">(−) Deductivas</td><td className="px-4 py-2 text-right font-mono">−{moneda(e.deductivas)}</td></tr>
                  <tr className="bg-sigecop-blue-light font-bold"><td className="px-4 py-2 text-sigecop-blue">(=) Neto (sin IVA)</td><td className="px-4 py-2 text-right font-mono text-sigecop-blue" data-testid="detalle-neto">{moneda(e.neto)}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-1">Integró: {e.integrada_por_nombre || '—'} · {fechaMX(e.integrada_en)}</p>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-2">Números generadores</h4>
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left p-2 font-semibold">Concepto</th>
                    <th className="text-right p-2 font-semibold">PU</th>
                    <th className="text-right p-2 font-semibold">Este periodo</th>
                    <th className="text-right p-2 font-semibold">Acumulado</th>
                    <th className="text-right p-2 font-semibold">Importe</th>
                    <th className="text-right p-2 font-semibold">% avance</th>
                  </tr>
                </thead>
                <tbody>
                  {(e.generadores || []).map((g) => (
                    <tr key={g.id} className="border-t border-slate-200">
                      <td className="p-2">{g.concepto} <span className="text-slate-400">({g.unidad})</span></td>
                      <td className="p-2 text-right font-mono text-xs">{moneda(g.pu_snapshot)}</td>
                      <td className="p-2 text-right">{num(g.cantidad_periodo)}</td>
                      <td className="p-2 text-right">{num(g.acumulado)} <span className="text-slate-400 text-xs">/ {num(g.cantidad_contratada)}</span></td>
                      <td className="p-2 text-right font-mono">{moneda(g.importe)}</td>
                      <td className="p-2 text-right">{g.avance_pct != null ? `${Number(g.avance_pct).toFixed(1)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-2">Notas vinculadas ({(e.notas || []).length})</h4>
            {(e.notas || []).length === 0 ? (
              <p className="text-sm text-slate-400 italic">Sin notas vinculadas.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="text-left p-2 font-semibold">Folio</th>
                      <th className="text-left p-2 font-semibold">Tipo</th>
                      <th className="text-left p-2 font-semibold">Fecha</th>
                      <th className="text-left p-2 font-semibold">Asunto</th>
                      <th className="text-left p-2 font-semibold">Estado</th>
                      <th className="text-left p-2 font-semibold">Documento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(e.notas || []).map((n) => (
                      <tr key={n.nota_id} className="border-t border-slate-200">
                        <td className="p-2 font-mono text-xs">#{n.numero}</td>
                        <td className="p-2">{n.tipo_etiqueta || n.tipo}</td>
                        <td className="p-2">{fechaHora(n.fecha)}</td>
                        <td className="p-2 text-slate-700">{n.asunto || '—'}</td>
                        <td className="p-2">{n.estado === 'anulada' ? 'Anulada' : 'Emitida'}</td>
                        <td className="p-2">
                          <button type="button" className="text-xs text-guinda font-semibold hover:underline whitespace-nowrap" onClick={() => onVerDocumento(n)} data-testid={`btn-doc-detalle-${n.numero}`}>
                            📄 Ver como documento
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" className="sg-btn-primary" onClick={() => onVerCaratula(e)} data-testid="btn-ver-caratula-doc">📄 Ver / Imprimir carátula</button>
          <button type="button" className="sg-btn-secondary" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// --------------------------- Tabs internos --------------------------------

function TabGeneradores({ filas, onCantidad, tienePlan }) {
  if (filas.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-bold text-sigecop-blue mb-4">Números generadores del periodo</h3>
        <p className="text-sm text-slate-500 italic">Este contrato no tiene catálogo de conceptos; no hay generadores que capturar.</p>
      </div>
    );
  }
  const hayExceso = filas.some((f) => f.excede);
  const hayExcesoPlan = filas.some((f) => f.excedePlan);
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-1">1 · Captura del volumen ejecutado</h3>
      <p className="text-sm text-slate-600 mb-3">
        Teclea la cantidad ejecutada este periodo por concepto. Importe, acumulado y % de avance se
        calculan en vivo. El <strong>semáforo de plan</strong> marca en rojo si superas lo planeado para
        el periodo (adelanta la validación del servidor, art. 45-A-X/52 + 118 RLOPSRM); el neto oficial lo confirma el backend.
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-md mb-3">
        <table className="w-full text-sm" data-testid="tabla-generadores">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2 w-20">Clave</th>
              <th className="text-left px-3 py-2">Concepto</th>
              <th className="text-left px-3 py-2 w-16">Unidad</th>
              {/* FIX 22-jun (profe): columnas del RESUMEN GACM (copia literal del formato de la estimación). */}
              <th className="text-right px-3 py-2 w-28" title="Cantidad contratada (según proyecto)">Según proyecto</th>
              <th className="text-right px-3 py-2 w-28" title="Estimado hasta la estimación anterior">Hasta est. anterior</th>
              {tienePlan && <th className="text-right px-3 py-2 w-28" title="Planeado en el programa hasta este periodo (curva S)">Planeado</th>}
              {tienePlan && <th className="text-right px-3 py-2 w-28" title="Disponible para estimar este periodo = planeado − ya estimado">Disp. periodo</th>}
              <th className="text-right px-3 py-2 w-32">Precio unitario</th>
              <th className="text-right px-3 py-2 w-32">De esta estimación</th>
              <th className="text-right px-3 py-2 w-32">Importe</th>
              <th className="text-right px-3 py-2 w-28">Total estimado</th>
              <th className="text-right px-3 py-2 w-28" title="Por ejecutar = según proyecto − total estimado">Por ejecutar</th>
              <th className="text-right px-3 py-2 w-24">% avance</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const malo = f.excede || f.excedePlan;
              return (
              <tr key={f.contrato_concepto_id} className={`border-t border-slate-200 ${malo ? 'bg-red-50' : 'hover:bg-slate-50'}`} data-testid={`gen-fila-${f.contrato_concepto_id}`} data-excede-plan={f.excedePlan ? 'true' : undefined}>
                <td className="px-3 py-2 font-mono text-xs text-slate-500" data-testid={`gen-clave-${f.contrato_concepto_id}`}>{f.clave || '—'}</td>
                <td className="px-3 py-2">
                  {malo && <span title={f.excede ? 'Excede lo contratado (art. 118)' : 'Excede lo planeado para el periodo'} className="text-red-600 mr-1">⚠</span>}
                  {f.concepto}
                  {f.es_adicional && <span className="ml-2 inline-block text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5 align-middle" title="Concepto ADICIONAL de convenio modificatorio (art. 101 RLOPSRM): se administra y estima por separado de los originales." data-testid={`gen-adicional-${f.contrato_concepto_id}`}>Adicional</span>}
                </td>
                <td className="px-3 py-2 text-slate-600">{f.unidad}</td>
                <td className="px-3 py-2 text-right">{num(f.contratado)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{num(f.anterior)}</td>
                {tienePlan && <td className="px-3 py-2 text-right text-slate-600" data-testid={`gen-planeado-${f.contrato_concepto_id}`}>{f.planeado == null ? '—' : num(f.planeado)}</td>}
                {tienePlan && <td className={`px-3 py-2 text-right font-semibold ${f.excedePlan ? 'text-red-700' : 'text-sigecop-green-validation'}`} data-testid={`gen-disponible-${f.contrato_concepto_id}`}>{num(f.disponible)}</td>}
                <td className="px-3 py-2 text-right font-mono text-xs text-slate-600">{moneda(f.pu)}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={`sg-input text-right ${malo ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                    value={f.valor}
                    onChange={(e) => onCantidad(f.contrato_concepto_id, e.target.value)}
                    data-testid={`gen-cantidad-${f.contrato_concepto_id}`}
                  />
                </td>
                <td className="px-3 py-2 text-right font-mono">{moneda(f.importe)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${malo ? 'text-red-700' : ''}`}>{num(f.acumulado)}</td>
                <td className="px-3 py-2 text-right text-slate-600" data-testid={`gen-por-ejecutar-${f.contrato_concepto_id}`}>{num(Math.max(0, f.contratado - f.acumulado))}</td>
                <td className={`px-3 py-2 text-right ${malo ? 'text-red-700 font-bold' : ''}`}>{f.avancePct.toFixed(1)}%</td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
      {hayExcesoPlan && (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 text-sm text-red-800 rounded-r-md mb-2" data-testid="semaforo-plan-exceso">
          <strong>⚠ Excede lo planeado para el periodo</strong> en uno o más conceptos (programa de obra,
          art. 45 ap. A fr. X RLOPSRM + art. 52 LOPSRM). Reduce la cantidad o ajusta el programa. No se puede confirmar así.
        </div>
      )}
      {hayExceso ? (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 text-sm text-red-800 rounded-r-md" data-testid="aviso-exceso">
          <strong>⚠ La cantidad acumulada excede lo contratado</strong> en uno o más conceptos. Ajusta las
          cantidades o tramita un convenio modificatorio (art. 118 RLOPSRM). No se puede integrar así.
        </div>
      ) : !hayExcesoPlan && (
        <div className="bg-green-50 border-l-4 border-sigecop-green-validation px-4 py-3 text-sm text-sigecop-green-validation rounded-r-md">
          ✓ Las cantidades están dentro de lo contratado{tienePlan ? ' y de lo planeado para el periodo' : ''}.
        </div>
      )}
    </div>
  );
}

function TabCaratula({ caratula, anticipoPct, deductivas, onDeductivas, acumulados, numeroEstimacion, periodoNumero, periodoInicio, periodoFin, contrato }) {
  const renglones = [
    { label: 'Importe bruto del periodo', importe: caratula.subtotal, formula: 'Σ ROUND(volumen ejecutado × PU, 2) de los generadores con avance' },
    { label: `(−) Amortización de anticipo (${anticipoPct}%)`, importe: -caratula.amortizacion, formula: `subtotal × ${anticipoPct}/100 — art. 143 fr. I RLOPSRM`, art: 'art. 143 RLOPSRM' },
    { label: '(−) Retención 5 al millar (0.5%)', importe: -caratula.retencion, formula: 'subtotal × 0.005 — art. 191 LFD', art: 'art. 191 LFD' }
  ];
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-1">2 · Carátula del periodo (viva)</h3>
      {/* O1-P17 (revisión profe, 09-jun): "¿cuál estoy presentando? Tiene que ser número… la 8
          corresponde a tal mes, porque está relacionado con el programa de obra". El número es el
          PRÓXIMO correlativo del contrato (el backend lo materializa con MAX+1 al integrar) y el
          periodo se deriva del programa (periodo cuyo cierre coincide con el periodo-fin capturado). */}
      {numeroEstimacion != null && (
        <div className="mb-3">
          <span className="inline-block text-base font-bold text-sigecop-blue bg-sigecop-blue-light border border-slate-200 rounded px-3 py-1" data-testid="caratula-numero-estimacion">
            Estimación No. {numeroEstimacion}
            {periodoNumero != null && ` — Periodo ${periodoNumero}`}
            {(periodoInicio || periodoFin) && (
              <span className="font-normal text-sm text-slate-600"> ({fechaMX(periodoInicio) || '…'} – {fechaMX(periodoFin) || '…'})</span>
            )}
          </span>
        </div>
      )}
      {/* FIX 22-jun (profe): encabezado del documento de estimación (formato GACM): descripción de obra,
          contrato, fecha del contrato y contratista. Cero libertad creativa: copia del formato del GACM. */}
      {contrato && (
        <div className="border border-slate-200 rounded-md mb-4 max-w-2xl overflow-hidden" data-testid="caratula-encabezado-doc">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-200"><td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600 w-56">Descripción de la obra o servicio</td><td className="px-4 py-2 text-slate-800">{contrato.objeto || '—'}</td></tr>
              <tr className="border-b border-slate-200"><td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600">Contrato</td><td className="px-4 py-2 font-mono text-slate-800">{contrato.folio || '—'}</td></tr>
              <tr className="border-b border-slate-200"><td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600">Fecha del contrato</td><td className="px-4 py-2 text-slate-800">{fechaMX(contrato.fecha_inicio) || '—'}</td></tr>
              <tr><td className="px-4 py-2 bg-slate-50 font-semibold text-slate-600">Contratista</td><td className="px-4 py-2 text-slate-800">{contrato.contratista || '—'}</td></tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-amber-700 mb-3 italic">
        Vista previa que recalcula al teclear. El neto OFICIAL lo materializa el backend al integrar
        (fuente única de verdad, sin IVA — art. 2 fr. XIX RLOPSRM).
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-md mb-4 max-w-2xl">
        <table className="w-full text-sm" data-testid="tabla-caratula-preview">
          <tbody>
            {renglones.map((r, i) => (
              <tr key={i} className="border-t border-slate-200" title={r.formula}>
                <td className="px-4 py-3 text-slate-800">
                  {r.label}
                  {r.art && <span className="ml-2 inline-block text-[10px] font-semibold text-guinda bg-guinda-soft border border-guinda/20 rounded px-1.5 py-0.5 cursor-help align-middle" title={r.formula} data-testid={`caratula-art-${i}`}>ⓘ {r.art}</span>}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-800">{moneda(r.importe)}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-200">
              <td className="px-4 py-3 text-slate-800">(−) Deductivas (manual)</td>
              <td className="px-4 py-2 text-right">
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="sg-input text-right w-40 inline-block"
                  value={deductivas}
                  onChange={(e) => onDeductivas(e.target.value)}
                  data-testid="caratula-deductivas"
                />
              </td>
            </tr>
            {/* Etapa C (pena convencional por atraso, art. 46 Bis LOPSRM + arts. 86-88 RLOPSRM, tope art. 90 RLOPSRM; parametrizable por contrato, default 0 hasta fijar el %): renglón PREVISTO en $0. */}
            <tr className={`border-t border-slate-200 ${caratula.retencionAtraso > 0 ? 'text-red-700' : 'text-slate-400'}`} title="Penas convencionales por atraso (art. 46 Bis LOPSRM + arts. 86-88 RLOPSRM, tope art. 90 RLOPSRM). Aplica si hay % de pena pactado en el contrato y la obra va atrasada vs su programa al periodo.">
              <td className="px-4 py-3">(−) Retención por atraso {caratula.atraso && <span className="text-[10px] uppercase tracking-wide bg-red-100 text-red-700 border border-red-200 rounded px-1.5 py-0.5 ml-1" data-testid="badge-atraso">atraso</span>}</td>
              <td className="px-4 py-3 text-right font-mono" data-testid="caratula-retencion-atraso">{moneda(caratula.retencionAtraso)}</td>
            </tr>
            <tr className={`border-t border-slate-200 font-bold ${caratula.neto < 0 ? 'bg-red-50' : 'bg-sigecop-blue-light'}`}>
              <td className={`px-4 py-3 ${caratula.neto < 0 ? 'text-red-700' : 'text-sigecop-blue'}`}>(=) Neto a pagar (preview)</td>
              <td className={`px-4 py-3 text-right font-mono text-base ${caratula.neto < 0 ? 'text-red-700' : 'text-sigecop-blue'}`} data-testid="caratula-neto-preview">
                {moneda(caratula.neto)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {caratula.neto < 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 text-sm text-red-800 rounded-r-md mb-3">
          Las deductivas dejan el neto en negativo; el backend rechazará la integración (ajusta las deductivas).
        </div>
      )}
      {acumulados && (
        <div className="overflow-x-auto border border-slate-200 rounded-md mb-4 max-w-2xl" data-testid="tabla-saldos">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700"><tr>
              <th className="text-left px-4 py-2 font-semibold">Acumulado del contrato (sin IVA)</th>
              <th className="text-right px-4 py-2 font-semibold">Importe</th>
              <th className="text-right px-4 py-2 font-semibold w-20">%</th>
            </tr></thead>
            <tbody>
              <tr className="border-t border-slate-200"><td className="px-4 py-2">Importe del contrato</td><td className="px-4 py-2 text-right font-mono">{moneda(acumulados.monto)}</td><td className="px-4 py-2 text-right text-slate-400">100%</td></tr>
              <tr className="border-t border-slate-200"><td className="px-4 py-2">Estimado acumulado anterior</td><td className="px-4 py-2 text-right font-mono">{moneda(acumulados.estAnt)}</td><td className="px-4 py-2 text-right text-slate-500">{acumulados.pct(acumulados.estAnt)}</td></tr>
              <tr className="border-t border-slate-200"><td className="px-4 py-2">(+) Esta estimación (periodo)</td><td className="px-4 py-2 text-right font-mono" data-testid="saldo-estimacion-actual">{moneda(acumulados.estActual)}</td><td className="px-4 py-2 text-right text-slate-500">{acumulados.pct(acumulados.estActual)}</td></tr>
              <tr className="border-t border-slate-200 font-semibold"><td className="px-4 py-2">(=) Estimado acumulado</td><td className="px-4 py-2 text-right font-mono" data-testid="saldo-acumulado">{moneda(acumulados.estAcum)}</td><td className="px-4 py-2 text-right">{acumulados.pct(acumulados.estAcum)}</td></tr>
              <tr className="border-t border-slate-200 font-semibold text-sigecop-blue"><td className="px-4 py-2">Saldo por estimar</td><td className="px-4 py-2 text-right font-mono" data-testid="saldo-por-estimar">{moneda(acumulados.saldoPorEstimar)}</td><td className="px-4 py-2 text-right">{acumulados.pct(acumulados.saldoPorEstimar)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
      {/* FIX 22-jun (profe): bloque de FIRMAS del formato GACM (residente, superintendente, supervisión
          externa y autorizó/dependencia). Bloque imprimible para firma; los nombres salen del roster. */}
      {contrato && (
        <div className="mt-6 mb-4 max-w-3xl" data-testid="caratula-firmas">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Firmas</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { rol: 'Residente de obra', nombre: contrato.residente_nombre },
              { rol: 'Superintendente', nombre: contrato.superintendente_nombre },
              { rol: 'Supervisión externa', nombre: contrato.supervision_nombre },
              { rol: 'Autorizó (dependencia)', nombre: contrato.dependencia },
            ].map((f, i) => (
              <div key={i} className="text-center">
                <div className="border-b border-slate-400 h-10 mb-1" />
                <div className="text-xs font-semibold text-slate-700">{f.nombre || '—'}</div>
                <div className="text-[11px] text-slate-500">{f.rol}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-guinda-soft border-l-4 border-guinda px-4 py-3 text-sm text-tinta rounded-r-md max-w-2xl">
        Amortización del anticipo conforme al <strong>art. 143 fr. I RLOPSRM</strong> y retención del{' '}
        <strong>5 al millar (art. 191 LFD)</strong>. La estimación se calcula <strong>sin IVA</strong>.
      </div>
    </div>
  );
}


// ------------------------------ Página ------------------------------------

export default function IntegracionEstimacion() {
  const { token, usuario } = useSesion();
  const { soloLectura } = useVistaHU('HU-12');
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');

  const [avance, setAvance] = useState([]);
  // Etapa A: datos derivados (solo lectura) para el semáforo de plan + saldos + barras de avance.
  const [prep, setPrep] = useState(null);
  const [programa, setPrograma] = useState(null); // Pase 1: matriz A2 para el panel "Ver programa de obra"
  const [historial, setHistorial] = useState([]);
  const [notasContrato, setNotasContrato] = useState([]);
  const [cargando, setCargando] = useState(false);
  // O8 (b): nota abierta como documento imprimible (DocumentoNota) o null.
  const [notaDoc, setNotaDoc] = useState(null);

  const [cantidades, setCantidades] = useState({}); // { [contrato_concepto_id]: string }
  const [deductivas, setDeductivas] = useState('0');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFin, setPeriodoFin] = useState('');
  const [fotosAvance, setFotosAvance] = useState([]);
  const [cargandoFotos, setCargandoFotos] = useState(false);

  const [integrando, setIntegrando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorIntegrar, setErrorIntegrar] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [caratulaDoc, setCaratulaDoc] = useState(null);  // G3: estimación a mostrar como documento imprimible

  // FASE 3 (rediseño por bloques) — WIZARD "Nueva estimación": la captura se presenta como pasos
  // encadenados (patrón del Alta), reusando los MISMOS componentes/testids. `paso` = índice activo;
  // `cierreConfirmado` = candado del último paso (art. del cascarón FASE 5: "¿seguro que vas a cerrar?").
  const [paso, setPaso] = useState(0);
  const [cierreConfirmado, setCierreConfirmado] = useState(false);

  const selected = useMemo(() => contratos.find((c) => String(c.id) === String(contratoId)) || null, [contratos, contratoId]);
  const anticipoPct = selected && selected.anticipo_pct != null ? Number(selected.anticipo_pct) : 0;
  const esSuperintendente = selected && usuario && selected.superintendente_id === usuario.id;

  // Carga inicial: contratos del usuario.
  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const recargarAvance = useCallback(async (id) => {
    const data = await api.avanceContrato(id);
    setAvance(Array.isArray(data) ? data : []);
  }, []);
  const recargarHistorial = useCallback(async (id) => {
    const data = await api.estimacionesDeContrato(id);
    setHistorial(Array.isArray(data) ? data : []);
  }, []);
  // Etapa A: prep (semáforo de plan/saldos/barras). El planeado se acota al periodo elegido
  // (mismo corte cp.fin <= periodo_fin que valida el server); sin periodo, planeado total de referencia.
  const recargarPrep = useCallback(async (id, pFin) => {
    try { setPrep(await api.preparacionEstimacion(id, pFin || undefined)); }
    catch (_) { setPrep(null); }
  }, []);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id);
    setAvance([]); setPrep(null); setPrograma(null); setHistorial([]); setNotasContrato([]);
    setCantidades({}); setDeductivas('0'); setPeriodoInicio(''); setPeriodoFin('');
    setFotosAvance([]); setResultado(null); setErrorIntegrar(null);
    setPaso(0); setCierreConfirmado(false); // wizard: vuelve al paso 1 al cambiar de contrato
    if (!id) return;
    setCargando(true);
    try {
      await Promise.all([recargarAvance(id), recargarHistorial(id), recargarPrep(id, '')]);
      // Pase 1: matriz del programa de obra para el panel plegable (404/sin programa → null).
      try { setPrograma(await api.leerProgramaObra(id)); } catch (_) { setPrograma(null); }
      // Notas del contrato para el modal (404 = sin bitácora → simplemente no hay notas).
      try {
        const n = await api.notasDeContrato(id);
        setNotasContrato(Array.isArray(n?.notas) ? n.notas : []);
      } catch (e) {
        if (e.status !== 404) throw e;
        setNotasContrato([]);
      }
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a las estimaciones de este contrato' : 'No se pudieron cargar los datos del contrato');
    } finally {
      setCargando(false);
    }
  }, [recargarAvance, recargarHistorial, recargarPrep, showToast]);

  const [searchParams] = useSearchParams();
  const contratoQuery = searchParams.get('contrato');
  useEffect(() => {
    // B6b/A-3A: preselecciona el contrato del ?contrato=ID (consistencia entre pantallas).
    if (sinSesion || !contratoQuery || contratoId) return;
    if (contratos.some((c) => String(c.id) === String(contratoQuery))) seleccionarContrato(String(contratoQuery));
  }, [sinSesion, contratoQuery, contratoId, contratos, seleccionarContrato]);

  // Etapa A: al fijar/cambiar el periodo-fin, recalcular el plan acotado a ese corte (el semáforo
  // "disponible este periodo" usa planeado hasta cp.fin <= periodo_fin, igual que el server).
  useEffect(() => {
    if (!contratoId || !periodoFin) return;
    recargarPrep(contratoId, periodoFin);
  }, [contratoId, periodoFin, recargarPrep]);

  // (c) FIX 22-jun (profe): al elegir el periodo, PRELLENA cada concepto del periodo con su AVANCE
  // terminado reportado en ese periodo (jalar de las notas/avance); el usuario solo MODIFICA. Solo
  // cuando prep ya trae los datos del periodo exacto (avance_periodo/programado_periodo).
  useEffect(() => {
    if (!periodoFin || !prep || !Array.isArray(prep.conceptos)) return;
    const next = {};
    prep.conceptos.forEach((p) => {
      if (p.programado_periodo != null && p.programado_periodo > 0 && p.avance_periodo != null) {
        next[p.contrato_concepto_id] = String(p.avance_periodo);
      }
    });
    setCantidades(next);
  }, [periodoFin, prep]);

  // Datos de plan por concepto (semáforo): del endpoint de solo lectura (Etapa A).
  const prepMap = useMemo(() => {
    const m = new Map();
    if (prep && Array.isArray(prep.conceptos)) prep.conceptos.forEach((p) => m.set(p.contrato_concepto_id, p));
    return m;
  }, [prep]);
  const tienePlan = !!(prep && prep.tiene_programa);
  // Clave + es_adicional por concepto para el documento de estimación (detalleEstimacion no las trae;
  // las leemos del prep, que sí lista el catálogo). Se pasa a DocumentoCaratula sin tocar el backend.
  const metaPorConcepto = useMemo(() => {
    const o = {};
    if (prep && Array.isArray(prep.conceptos)) {
      prep.conceptos.forEach((p) => { o[p.contrato_concepto_id] = { clave: p.clave, es_adicional: p.es_adicional }; });
    }
    return o;
  }, [prep]);
  // Pase 1: periodo a resaltar en el panel del programa = el periodo cuya fecha-fin coincide con el
  // periodo-fin capturado; si no, el que contiene esa fecha (o la de hoy como referencia).
  const periodoResaltadoEstim = useMemo(() => {
    const ps = Array.isArray(programa?.periodos) ? programa.periodos : [];
    if (ps.length === 0) return null;
    if (periodoFin) {
      const exacto = ps.find((p) => String(p.fin).slice(0, 10) === periodoFin);
      if (exacto) return exacto.numero;
    }
    return periodoQueContiene(ps, periodoFin || periodoInicio || new Date().toISOString().slice(0, 10));
  }, [programa, periodoFin, periodoInicio]);

  const filas = useMemo(() => avance
    .filter((a) => {
      // FIX 22-jun (profe): (b) SOLO los conceptos de ESE periodo. Sin periodo elegido, muestra todos
      // (referencia); con periodo, solo los que tienen plan en ese periodo exacto (programado_periodo>0).
      if (!periodoFin) return true;
      const pp = prepMap.get(a.contrato_concepto_id);
      return !!(pp && pp.programado_periodo != null && pp.programado_periodo > 0);
    })
    .map((a) => {
    const valor = cantidades[a.contrato_concepto_id] ?? '';
    const periodo = Number(valor) || 0;
    const contratado = Number(a.cantidad_contratada);
    const anterior = Number(a.acumulado_anterior);
    const pu = Number(a.pu);
    const acumulado = anterior + periodo;
    const excede = acumulado > contratado + EPS; // art. 118 (tope contratado, candado duro existente)
    const avancePct = contratado > 0 ? (acumulado / contratado) * 100 : 0;
    // Semáforo de PLAN (adelanta G5/A2: no estimar más de lo planeado hasta el periodo, art. 45-A-X/52).
    const p = prepMap.get(a.contrato_concepto_id);
    const planeado = p && p.planeado_hasta_periodo != null ? Number(p.planeado_hasta_periodo) : null;
    const disponible = p ? Number(p.disponible_periodo) : Math.max(0, contratado - anterior);
    const excedePlan = planeado != null && periodo > disponible + EPS;
    return { ...a, clave: (p && p.clave) || a.clave || null, es_adicional: !!(p && p.es_adicional), valor, periodo, contratado, anterior, pu, acumulado, excede,
      planeado, disponible, excedePlan, avancePct, importe: round2(periodo * pu) };
  }), [avance, cantidades, prepMap, periodoFin]);

  const hayExceso = filas.some((f) => f.excede);          // art. 118 (contratado)
  const hayExcesoPlan = filas.some((f) => f.excedePlan);  // plan del periodo (semáforo)
  const hayLineas = filas.some((f) => f.periodo > 0);

  // O1-P17 (revisión profe, 09-jun): número de la estimación EN FORMACIÓN = MAX(numero)+1 del
  // historial del contrato (informativo; el correlativo OFICIAL lo materializa el backend con el
  // mismo MAX+1 al integrar). Se muestra prominente en la carátula, ligado al periodo del programa.
  const proximoNumeroEstimacion = useMemo(
    () => historial.reduce((m, e) => Math.max(m, Number(e.numero) || 0), 0) + 1,
    [historial]
  );

  // Carátula VIVA con el MISMO redondeo del backend (r2). Renglón "retención por atraso" PREVISTO
  // pero en $0 (Etapa C: pena por atraso, art. 46 Bis LOPSRM + arts. 86-88 RLOPSRM, tope art. 90 RLOPSRM; parametrizable, default 0 hasta fijar el %); no se calcula aquí.
  // Etapa C: datos para la retención por atraso (del prep, solo lectura): % de pena pactado y los
  // valores para medir el atraso GLOBAL (ejecutado vs programado al periodo).
  const penaPct = prep?.contrato?.pena_convencional_pct != null ? Number(prep.contrato.pena_convencional_pct) : null;
  const planeadoValor = prep?.avance?.planeado_valor != null ? Number(prep.avance.planeado_valor) : 0;
  const fisicoPrev = prep?.avance?.fisico_ejecutado != null ? Number(prep.avance.fisico_ejecutado) : 0;
  const tieneProgValor = !!(prep?.tiene_programa) && planeadoValor > 0;

  const caratula = useMemo(() => {
    const subtotal = round2(filas.reduce((s, f) => s + (f.periodo > 0 ? f.importe : 0), 0));
    const amortizacion = round2(subtotal * anticipoPct / 100);
    const retencion = round2(subtotal * 0.005);
    const deduc = round2(Number(deductivas) || 0);
    // Etapa C: retención por atraso = pena × bruto SI hay pena pactada Y el contrato va atrasado
    // (ejecutado = ya_estimado + ESTA estimación < programado al periodo). Espejo del cálculo del server.
    const ejecutadoLive = fisicoPrev + subtotal;
    const atraso = penaPct != null && tieneProgValor && ejecutadoLive < planeadoValor - 1e-6;
    const retencionAtraso = atraso ? round2(penaPct * subtotal) : 0;
    return { subtotal, amortizacion, retencion, deduc, retencionAtraso, atraso,
      neto: round2(subtotal - amortizacion - retencion - deduc - retencionAtraso) };
  }, [filas, anticipoPct, deductivas, penaPct, planeadoValor, fisicoPrev, tieneProgValor]);

  // Acumulados/saldos (estilo carátula real, sin IVA): estimado acumulado anterior (del prep:
  // Σ ya_estimado×PU) + esta estimación (subtotal vivo) = acumulado; saldo = monto − acumulado.
  const acumulados = useMemo(() => {
    if (!prep || !prep.contrato) return null;
    const monto = Number(prep.contrato.monto) || 0;
    const estAnt = Number(prep.avance?.fisico_ejecutado) || 0;
    const estActual = caratula.subtotal;
    const estAcum = round2(estAnt + estActual);
    const saldoPorEstimar = round2(monto - estAcum);
    const pct = (x) => (monto > 0 ? `${(x / monto * 100).toFixed(1)}%` : '—');
    return { monto, estAnt, estActual, estAcum, saldoPorEstimar, pct };
  }, [prep, caratula.subtotal]);

  const onCantidad = (cid, valor) => setCantidades((prev) => ({ ...prev, [cid]: valor }));

  // --- WIZARD: pasos + gating (atrás libre; adelante valida el paso actual, como el Alta) ---
  const PASOS = [
    { key: 'periodo', label: 'Periodo' },
    { key: 'generadores', label: 'Generadores' },
    { key: 'caratula', label: 'Carátula' },
    { key: 'soportes', label: 'Soportes y notas' },
    { key: 'integrar', label: 'Integrar y presentar' },
  ];
  const ULTIMO_PASO = PASOS.length - 1;
  // Gate de AVANCE (no de integración): solo bloquea por EXCESO (art. 118 / plan del periodo) y neto<0.
  // El periodo y "al menos una línea" se exigen en el botón Integrar (paso 5), conservando el
  // comportamiento original (periodo y líneas eran requisitos de integrar, no de navegar/capturar).
  // BLOQUE 2 — gating secuencial como en el Alta: no avanzas sin que el paso ACTUAL esté completo/correcto.
  const pasoValido = useCallback((p) => {
    if (p === 0) return !!periodoInicio && !!periodoFin;               // Periodo: requiere inicio y fin
    if (p === 1) return hayLineas && !hayExceso && !hayExcesoPlan;     // Generadores: ≥1 línea y sin exceso (contratado/plan)
    if (p === 2) return caratula.neto >= 0;                           // Carátula: neto no negativo
    return true;                                                      // Soportes (opcional) / Integrar: navegación libre
  }, [periodoInicio, periodoFin, hayLineas, hayExceso, hayExcesoPlan, caratula.neto]);
  const irAPaso = useCallback((target) => {
    setErrorIntegrar(null);
    if (target <= paso) { setPaso(target); return; }                    // atrás: libre (corregir)
    for (let p = paso; p < target; p++) { if (!pasoValido(p)) { setPaso(p); return; } } // adelante: valida el prefijo
    setPaso(target);
  }, [paso, pasoValido]);

  // O8 (b): abrir el documento de una nota desde el ModalDetalle del historial.
  // La nota puede venir mínima (nota_id/numero); se resuelve a la nota COMPLETA desde notasContrato.
  const verDocumentoNota = useCallback((n) => {
    const id = n.id ?? n.nota_id;
    setNotaDoc(notasContrato.find((x) => x.id === id) || n);
  }, [notasContrato]);

  // Carga el reporte fotográfico del avance al entrar al paso 4 (Soportes).
  // La nota de bitácora la crea el backend automáticamente al integrar — no hay que vincularla.
  useEffect(() => {
    if (paso !== 3 || !contratoId || !periodoInicio || !periodoFin) return;
    setCargandoFotos(true);
    api.avanceFotosDelPeriodo(contratoId, periodoInicio, periodoFin)
      .then((data) => setFotosAvance(Array.isArray(data) ? data : []))
      .catch(() => setFotosAvance([]))
      .finally(() => setCargandoFotos(false));
  }, [paso, contratoId, periodoInicio, periodoFin]);

  const integrar = async () => {
    if (!contratoId || hayExceso || hayExcesoPlan || integrando) return;
    const generadores = filas.filter((f) => f.periodo > 0).map((f) => ({ contrato_concepto_id: f.contrato_concepto_id, cantidad_periodo: f.periodo }));
    if (generadores.length === 0) { showToast('Captura al menos un concepto con cantidad mayor a 0'); return; }
    if (!periodoInicio || !periodoFin) { showToast('Indica el periodo (inicio y fin)'); return; }
    setIntegrando(true); setErrorIntegrar(null);
    try {
      const est = await api.integrarEstimacion({
        contrato_id: Number(contratoId),
        periodo_inicio: periodoInicio,
        periodo_fin: periodoFin,
        deductivas: Number(deductivas) || 0,
        generadores,
        notas: []
      });
      setResultado(est);
      showToast(`Estimación #${est.numero} integrada`);
      // El acumulado y el historial cambiaron: recargar y limpiar el formulario.
      await Promise.all([recargarAvance(contratoId), recargarHistorial(contratoId)]);
      setCantidades({}); setDeductivas('0'); setPeriodoInicio(''); setPeriodoFin(''); setFotosAvance([]);
    } catch (e) {
      // Errores localizados del backend tal cual (400 periodo>1 mes / neto<0; 409
      // exceso art.118 / solape; 403 no superintendente).
      const msg = e.payload?.error || e.message || 'No se pudo integrar la estimación';
      setErrorIntegrar(msg);
      showToast(msg);
    } finally {
      setIntegrando(false);
    }
  };

  const verDetalle = async (id) => {
    try {
      const d = await api.detalleEstimacion(id);
      setDetalle(d);
    } catch (e) {
      showToast(e.payload?.error || 'No se pudo cargar el detalle');
    }
  };

  const wrapTab = (node) => <RegionEditable disabled={soloLectura}>{node}</RegionEditable>;

  // Avance físico-financiero (live): ejecutado/estimado acumulado vs programado (curva S).
  const avanceFisicoPct = acumulados && acumulados.monto > 0
    ? (acumulados.estAnt + caratula.subtotal) / acumulados.monto * 100 : null;

  const integrarDeshabilitado = soloLectura || integrando || hayExceso || hayExcesoPlan || !hayLineas;

  return (
    <div>
      <HeaderVista
        huId="HU-12"
        titulo="Apertura del periodo e integración de la estimación"
        sprint="Sprint 3"
        rolAcademico="Contratista"
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Estimaciones' }, { label: 'Integración del periodo' }]}
      />

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión en modo aplicación para cargar tus contratos e integrar estimaciones.
        </div>
      )}

      {/* 3A · P3 — hereda el contrato activo global (antes <select> de contrato); el banner carga
          los datos via seleccionarContrato(idGlobal) y permite "Cambiar". */}
      <BannerContratoActivo seleccionar={seleccionarContrato} contratoId={contratoId} />

      {!sinSesion && !contratoId && (
        <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para integrar la estimación de su periodo.</p>
      )}
      {cargando && <p className="text-sm text-slate-500 mb-4">Cargando datos del contrato…</p>}

      {selected && (
        <>
          {/* UI-1: EncabezadoContrato (sistema de diseño guinda); mismo contenido. */}
          <EncabezadoContrato
            titulo="Contrato"
            folio={selected.folio}
            items={[
              { label: 'Contratista:', value: selected.contratista || '—' },
              { label: 'Anticipo:', value: `${anticipoPct}%`, resaltado: true },
              { label: 'Estimaciones:', value: String(historial.length), resaltado: true }
            ]}
          />

          {!soloLectura && !esSuperintendente && (
            <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 mb-4 text-sm text-amber-800 rounded-r-md">
              Solo el <strong>superintendente asignado</strong> a este contrato puede integrar estimaciones; el servidor rechazará el intento si no lo eres.
            </div>
          )}

          {resultado && (
            <div className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 mb-4 rounded-r-md" data-testid="banner-integrada">
              <div className="text-sm font-semibold text-sigecop-green-validation">✓ Estimación #{resultado.numero} integrada</div>
              <p className="text-sm text-slate-800 mt-1">
                Carátula oficial del backend (fuente de verdad): subtotal {moneda(resultado.subtotal)} − amortización {moneda(resultado.amortizacion)} − retención {moneda(resultado.retencion)} − deductivas {moneda(resultado.deductivas)} = <strong>neto {moneda(resultado.neto)}</strong> (sin IVA). Estado: <BadgeEstado estado={resultado.estado} />.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Quedó registrada como expediente del periodo (art. 132 RLOPSRM). La <strong>presentación</strong> (HU-13) y la <strong>revisión técnica/autorización</strong> (HU-15, art. 54 LOPSRM) son las etapas siguientes.
              </p>
            </div>
          )}

          {errorIntegrar && (
            <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 mb-4 text-sm text-red-800 rounded-r-md" data-testid="banner-error">
              <strong>No se integró:</strong> {errorIntegrar}
            </div>
          )}

          {/* F4 — EN PARALELO (TIPO B): vistas de lectura / de otro actor del ciclo de estimación, SIEMPRE
              accesibles (no dependen del paso del wizard); solo requieren contrato seleccionado. Regla de oro:
              una TIPO B nunca se condiciona a un candado. */}
          {/* P4-ALT — barra de pestañas-enlace del ciclo de estimación (reemplaza el bloque "EN PARALELO").
              Son enlaces a las pantallas hermanas (lectura/otro actor), gateados por acceso; el wizard y su
              gating secuencial quedan INTACTOS por debajo. */}
          <PestanasCiclo ciclo="estimacion" activo="integrar" />

          {/* WIZARD "Nueva estimación" (FASE 3): pasos encadenados (patrón del Alta), reusando la MISMA
              captura/testids. Atrás libre; Siguiente valida el paso actual. El historial va aparte (abajo). */}
          <div className="text-xs font-semibold text-guinda mb-1" data-testid="paso-indicador">Paso {paso + 1} de {PASOS.length}</div>
          <nav className="flex flex-wrap gap-2 mb-6" data-testid="wizard-estimacion-pasos" aria-label="Pasos de la estimación">
            {PASOS.map((p, i) => {
              const estado = i === paso ? 'curr' : i < paso ? 'done' : 'todo';
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => irAPaso(i)}
                  data-testid={`wpaso-${p.key}`}
                  data-estado={estado}
                  aria-current={estado === 'curr' ? 'step' : undefined}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border ${estado === 'curr' ? 'bg-guinda text-white border-guinda' : estado === 'done' ? 'bg-guinda-soft text-guinda border-guinda/30' : 'bg-white text-slate-500 border-slate-200'}`}
                >
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${estado === 'curr' ? 'bg-white text-guinda' : estado === 'done' ? 'bg-guinda text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {estado === 'done' ? '✓' : i + 1}
                  </span>
                  {p.label}
                </button>
              );
            })}
          </nav>

          {/* PASO 1 · Periodo (apertura). */}
          {paso === 0 && wrapTab(
            <div className="bg-white border border-slate-200 rounded-md p-4 max-w-2xl" data-testid="wstep-periodo">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">1 · Apertura del periodo</h2>
              {/* P5 (pulido UX 14-jun): selector de periodo del programa vigente; autocompleta las fechas. */}
              {Array.isArray(programa?.periodos) && programa.periodos.length > 0 && (
                <div className="mb-4">
                  <label className="sg-label">Periodo del programa</label>
                  <select
                    className="sg-input"
                    data-testid="periodo-selector"
                    value={programa.periodos.find((p) => String(p.fin).slice(0, 10) === periodoFin)?.numero ?? ''}
                    onChange={(e) => {
                      const p = programa.periodos.find((x) => String(x.numero) === e.target.value);
                      if (p) { setPeriodoInicio(String(p.inicio).slice(0, 10)); setPeriodoFin(String(p.fin).slice(0, 10)); }
                    }}
                  >
                    <option value="">— Elige un periodo del programa —</option>
                    {programa.periodos.map((p) => {
                      // FIX 22-jun (profe): solo se estima un periodo VENCIDO (mes terminado). Los periodos
                      // en curso / futuros se muestran deshabilitados con su estado.
                      const fin = String(p.fin).slice(0, 10);
                      const ini = String(p.inicio).slice(0, 10);
                      const hoy = new Date().toISOString().slice(0, 10);
                      const vencido = fin < hoy;
                      const enCurso = ini <= hoy && hoy <= fin;
                      const etiqueta = vencido ? 'vencido · estimable' : enCurso ? 'en curso · aún no cierra' : 'futuro';
                      return (
                        <option key={p.numero} value={p.numero} disabled={!vencido}>
                          Periodo {p.numero} ({ini} — {fin}) · {etiqueta}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Solo se estima un periodo <strong>vencido</strong> (mes terminado). Al elegirlo se cargan las cantidades terminadas del avance; tú solo las afinas.</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="sg-label">Periodo — inicio</label>
                  <input type="date" className="sg-input" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} data-testid="periodo-inicio" />
                </div>
                <div>
                  <label className="sg-label">Periodo — fin</label>
                  <input type="date" className="sg-input" value={periodoFin} onChange={(e) => setPeriodoFin(e.target.value)} data-testid="periodo-fin" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Periodo máximo de un mes (art. 54); no puede traslaparse con otra estimación del contrato.</p>
            </div>
          )}

          {/* PASO 2 · Generadores (captura) + barras de avance + programa de obra. */}
          {paso === 1 && (
          <div className="space-y-6" data-testid="wstep-generadores">
            {wrapTab(<TabGeneradores filas={filas} onCantidad={onCantidad} tienePlan={tienePlan} />)}

            {prep && (
              <div className="bg-white border border-slate-200 rounded-md p-4" data-testid="barras-avance">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Avance del contrato</h3>
                <div className="space-y-3 max-w-2xl">
                  {/* FIX 22-jun (profe): el "avance físico" muestra lo REPORTADO (HU-06), no Σ estimaciones
                      (antes salía 14.9%). Se separa del "avance estimado" (valor estimado acumulado). */}
                  <BarraAvance label="Avance físico (ejecutado reportado, HU-06)" pct={prep.avance?.fisico_real_pct} color="bg-sigecop-accent" testid="barra-fisico" />
                  <BarraAvance label="Avance estimado acumulado (valor estimado, incl. esta estimación)" pct={avanceFisicoPct} color="bg-sigecop-accent/60" testid="barra-estimado" />
                  {tienePlan && <BarraAvance label="Avance programado (curva S del programa hasta el periodo)" pct={prep.avance?.planeado_pct} color="bg-blue-400" testid="barra-programado" />}
                  <BarraAvance label="Avance financiero (pagado acumulado / monto)" pct={prep.avance?.financiero_pct} color="bg-emerald-400" testid="barra-financiero" />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Sin IVA (art. 2 fr. XIX RLOPSRM). Físico = obra ejecutada/estimada en valor; financiero = lo efectivamente pagado (HU-21). Al integrar se guarda el snapshot de ambos avances en la estimación.
                </p>
              </div>
            )}

            {/* Pase 1 (Plan 2): panel plegable con el programa de obra MES POR MES (matriz concepto ×
                periodo), con el periodo capturado resaltado. Solo lectura; no afecta el cálculo. */}
            {programa && Array.isArray(programa.periodos) && programa.periodos.length > 0 && (
              <details className="bg-white border border-slate-200 rounded-md" data-testid="panel-programa-obra">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold uppercase tracking-wider text-slate-700">
                  Ver programa de obra (mes por mes)
                </summary>
                <div className="px-4 pb-4">
                  <MatrizProgramaLectura programa={programa} periodoResaltadoNumero={periodoResaltadoEstim} />
                </div>
              </details>
            )}

          </div>
          )}

          {/* PASO 3 · Carátula (viva). */}
          {paso === 2 && (
            <div data-testid="wstep-caratula">
              {wrapTab(<TabCaratula caratula={caratula} anticipoPct={anticipoPct} deductivas={deductivas} onDeductivas={setDeductivas} acumulados={acumulados}
                numeroEstimacion={proximoNumeroEstimacion} periodoNumero={periodoResaltadoEstim} periodoInicio={periodoInicio} periodoFin={periodoFin} contrato={selected} />)}
            </div>
          )}

          {/* PASO 4 · Soportes — reporte fotográfico del avance del periodo (art. 132 fr. IV RLOPSRM).
               La nota de bitácora se crea automáticamente en el backend al integrar; no hay que vincularla. */}
          {paso === 3 && (
            <div className="space-y-4" data-testid="wstep-soportes">
              {wrapTab(
                <div className="bg-white border border-slate-200 rounded-lg p-4" data-testid="fotos-avance-periodo-wrapper">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
                    Reporte fotográfico del avance (art. 132 fr. IV RLOPSRM)
                  </h3>
                  <FotosAvancePeriodo fotos={fotosAvance} cargando={cargandoFotos} />
                </div>
              )}
              {/* A2 — Checklist de los documentos de la estimación (art. 132 RLOPSRM). Lista ENUNCIATIVA
                  ("entre otros… los determinará cada dependencia"): se muestran las 7 fracciones, dónde vive
                  cada una en el sistema y su estado. Presentación pura. */}
              <div className="bg-white border border-borde rounded-lg p-4" data-testid="checklist-art132">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-1">Documentos de la estimación (art. 132 RLOPSRM)</h3>
                <p className="text-[11px] text-slate-500 mb-3">La lista del art. 132 es <strong>enunciativa</strong> («los documentos… serán determinados por cada dependencia o entidad… entre otros»). Cobertura en el sistema:</p>
                <ul className="space-y-1.5 text-sm">
                  {[
                    { fr: 'I', t: 'Números generadores', donde: 'Capturados en el paso 2 (Generadores).', estado: 'incluido' },
                    { fr: 'II', t: 'Notas de bitácora', donde: 'Se genera automáticamente al integrar la estimación.', estado: 'incluido' },
                    { fr: 'III', t: 'Croquis', donde: 'Se adjunta en el Expediente del contrato (HU-04), si la obra lo amerita.', estado: 'dependencia' },
                    { fr: 'IV', t: 'Controles de calidad, pruebas de laboratorio y fotografías', donde: fotosAvance.length ? `${fotosAvance.length} foto(s) del avance del periodo adjunta(s) en este paso.` : 'Reporte fotográfico del avance visible arriba; controles/pruebas como soporte documental adicional.', estado: fotosAvance.length ? 'incluido' : 'pendiente' },
                    { fr: 'V', t: 'Análisis, cálculo e integración de los importes', donde: 'Es la carátula de la estimación (paso 3).', estado: 'incluido' },
                    { fr: 'VI', t: 'Avances de obra (contratos a precio alzado)', donde: /alzado/i.test(selected?.tipo || '') ? 'Aplica: contrato a precio alzado.' : 'No aplica: contrato a base de precios unitarios.', estado: /alzado/i.test(selected?.tipo || '') ? 'dependencia' : 'na' },
                    { fr: 'VII', t: 'Informe de cumplimiento de operación y mantenimiento', donde: 'Según lo establezca el contrato.', estado: 'dependencia' },
                  ].map((r) => (
                    <li key={r.fr} className="flex items-start gap-2" data-testid={`art132-fr-${r.fr}`}>
                      <span className="font-mono text-[11px] text-slate-400 w-6 shrink-0">{r.fr}.</span>
                      <span className="flex-1">
                        <span className="font-medium text-tinta">{r.t}</span>
                        <span className="block text-[11px] text-slate-500">{r.donde}</span>
                      </span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 border shrink-0 ${
                        r.estado === 'incluido' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : r.estado === 'pendiente' ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : r.estado === 'na' ? 'bg-slate-50 text-slate-500 border-slate-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
                        {r.estado === 'incluido' ? '✓ En el sistema' : r.estado === 'pendiente' ? 'Pendiente' : r.estado === 'na' ? 'No aplica' : 'Lo determina la dependencia'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* PASO 5 · Cierre (candado), integración y presentación. */}
          {paso === 4 && (
            <div data-testid="wstep-integrar">
              {wrapTab(
                <div className="bg-white border border-slate-200 rounded-md p-4 max-w-2xl">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">5 · Cierre, integración y presentación</h2>
                  <label className="flex items-center gap-2 text-sm text-slate-700 mb-3">
                    <input type="checkbox" checked={cierreConfirmado} onChange={(e) => setCierreConfirmado(e.target.checked)} data-testid="check-cierre" />
                    ¿Seguro que vas a cerrar esta estimación? (revisa generadores, carátula y notas)
                  </label>
                  {(hayExceso || hayExcesoPlan) && (
                    <p className="text-xs text-red-700 mb-2" data-testid="confirmar-bloqueado-hint">
                      {hayExceso ? 'Hay conceptos que exceden lo contratado (art. 118).' : 'Hay conceptos que exceden lo planeado para el periodo.'} No se puede confirmar.
                    </p>
                  )}
                  {(!periodoInicio || !periodoFin) && (
                    <p className="text-xs text-amber-700 mb-2">Falta indicar el periodo (paso 1) para poder integrar.</p>
                  )}
                  <button
                    type="button"
                    className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed"
                    onClick={integrar}
                    disabled={integrarDeshabilitado || !cierreConfirmado || !periodoInicio || !periodoFin}
                    title={hayExceso ? 'Hay conceptos que exceden lo contratado' : hayExcesoPlan ? 'Hay conceptos que exceden lo planeado del periodo' : (!hayLineas ? 'Captura al menos un concepto con cantidad > 0' : '')}
                    data-testid="btn-integrar"
                  >
                    {integrando ? 'Integrando…' : 'Confirmar e integrar estimación'}
                  </button>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-sm text-slate-700 mb-2">Integrada la estimación, se <strong>presenta a revisión</strong> (art. 54 LOPSRM); no se paga directo. Una estimación se presenta una sola vez.</p>
                    <Link to="/estimaciones/envio" className="sg-btn-secondary inline-block" data-testid="link-presentar">Ir a presentar a revisión (HU-13) →</Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navegación del wizard (Atrás libre; Siguiente valida el paso actual, como el Alta). */}
          <div className="mt-6 flex justify-between items-center max-w-2xl">
            <button type="button" onClick={() => irAPaso(paso - 1)} disabled={paso === 0} className="px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-40" data-testid="btn-watras">← Atrás</button>
            {paso < ULTIMO_PASO && (
              <div className="text-right">
                <button type="button" onClick={() => irAPaso(paso + 1)} disabled={!pasoValido(paso)} className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed" data-testid="btn-wsiguiente">Siguiente →</button>
                {/* A5/BLOQUE 2: candado con motivo. */}
                {!pasoValido(paso) && (
                  <p className="text-xs text-amber-700 mt-1" data-testid="wsiguiente-motivo">
                    {paso === 0
                      ? 'Indica el periodo (inicio y fin) para continuar.'
                      : paso === 1
                        ? (hayExceso || hayExcesoPlan ? 'Corrige los generadores que exceden lo contratado o el plan del periodo.' : 'Captura al menos un concepto con cantidad mayor a 0.')
                        : 'Las deductivas dejan el neto en negativo; corrígelas.'}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Historial de estimaciones del contrato</h2>
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-sm" data-testid="tabla-historial">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left p-3 font-semibold">#</th>
                    <th className="text-left p-3 font-semibold">Periodo</th>
                    <th className="text-left p-3 font-semibold">Estado</th>
                    <th className="text-right p-3 font-semibold">Subtotal</th>
                    <th className="text-right p-3 font-semibold">Neto</th>
                    <th className="text-left p-3 font-semibold">Integró</th>
                    <th className="text-center p-3 font-semibold w-24">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.length === 0 ? (
                    <tr><td colSpan="7" className="p-6 text-center text-slate-400 italic">Este contrato aún no tiene estimaciones integradas.</td></tr>
                  ) : (
                    historial.map((e) => (
                      <tr key={e.id} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className="p-3 font-mono">{e.numero}</td>
                        <td className="p-3">{fechaMX(e.periodo_inicio)} – {fechaMX(e.periodo_fin)}</td>
                        <td className="p-3"><BadgeEstado estado={e.estado} /></td>
                        <td className="p-3 text-right font-mono">{moneda(e.subtotal)}</td>
                        <td className="p-3 text-right font-mono">{moneda(e.neto)}</td>
                        <td className="p-3">{e.integrada_por_nombre || '—'}</td>
                        <td className="p-3 text-center">
                          <button type="button" className="text-xs text-sigecop-blue hover:underline" onClick={() => verDetalle(e.id)} data-testid={`btn-ver-detalle-${e.id}`}>Ver</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <SeccionCriterios
        huId="HU-12"
        criterios={[
          { numero: 1, texto: 'La estimación se integra como una sola entidad (carátula + números generadores + notas de bitácora vinculadas) calculada server-side.' },
          { numero: 2, texto: 'La carátula calcula amortización del anticipo, retención (5 al millar, art. 191 LFD) y deductivas; el neto es sin IVA (art. 2 fr. XIX RLOPSRM).' },
          { numero: 3, texto: 'El sistema bloquea la integración cuando una cantidad acumulada por concepto excede lo contratado (art. 118 RLOPSRM).' }
        ]}
      />

      {detalle && <ModalDetalle estimacion={detalle} onCerrar={() => setDetalle(null)} onVerDocumento={verDocumentoNota} onVerCaratula={setCaratulaDoc} />}
      {notaDoc && <DocumentoNota nota={notaDoc} contrato={selected} onCerrar={() => setNotaDoc(null)} />}
      {caratulaDoc && <DocumentoCaratula estimacion={caratulaDoc} contrato={selected} clavesPorConcepto={metaPorConcepto} onCerrar={() => setCaratulaDoc(null)} />}
    </div>
  );
}
