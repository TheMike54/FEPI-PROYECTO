import { useState, useEffect, useCallback } from 'react';
import Tabs from '../ui/Tab.jsx';
import { api } from '../../services/api.js';
import { monedaMXN as moneda } from '../../utils/formato.js';

// EXPEDIENTE DE ESTIMACIÓN — componentes COMPARTIDOS (Oleada 1, bugs #7 y #9). Antes la revisión (HU-15) y
// el historial (HU-14) mostraban un expediente INCOMPLETO (sin fotos ni soportes). Aquí viven:
//   · ContenidoFotos    — evidencia fotográfica de la estimación + reporte fotográfico del avance del periodo.
//   · ContenidoSoportes — soportes documentales por concepto (PDF/XLS/CSV/TXT/imagen, bug #4).
//   · ExpedienteEstimacionReadOnly — expediente COMPLETO de solo lectura (carátula, generadores, notas,
//     fotos, soportes) para el drawer del historial (HU-14), reusando estos mismos renderers.
// Todo es SOLO LECTURA (la captura vive en HU-12; las observaciones, en HU-15). Fuente = backend.

const fmtFechaHora = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const dISO = (v) => (v == null ? '' : String(v).slice(0, 10));
const ICONO_TIPO = { pdf: '📄', xlsx: '📊', xls: '📊', csv: '📑', txt: '📄', imagen: '🖼️', archivo: '📦' };

// Abre un binario del backend (foto/soporte) en una pestaña nueva (crea un object URL con el token).
async function abrirBlob(promesa, onError) {
  try {
    const url = await promesa;
    window.open(url, '_blank', 'noopener');
  } catch (e) {
    if (onError) onError(e.message || 'No se pudo abrir el archivo');
  }
}

// -------------------------------------------------------------------------------------------------
// FOTOS — evidencia de la estimación + reporte fotográfico del avance del periodo (solo lectura).
// -------------------------------------------------------------------------------------------------
export function ContenidoFotos({ estimacionId, contratoId, periodoInicio, periodoFin, onError }) {
  const [fotosEst, setFotosEst] = useState([]);
  const [fotosAvance, setFotosAvance] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!estimacionId) return;
    let vivo = true;
    setCargando(true);
    const pEst = api.listarFotosEstimacion(estimacionId).catch(() => []);
    const pAv = (contratoId && periodoInicio && periodoFin)
      ? api.avanceFotosDelPeriodo(contratoId, dISO(periodoInicio), dISO(periodoFin)).catch(() => [])
      : Promise.resolve([]);
    Promise.all([pEst, pAv]).then(([fe, fa]) => {
      if (!vivo) return;
      setFotosEst(Array.isArray(fe) ? fe : []);
      setFotosAvance(Array.isArray(fa) ? fa : []);
    }).finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [estimacionId, contratoId, periodoInicio, periodoFin]);

  const total = fotosEst.length + fotosAvance.length;
  return (
    <div data-testid="expediente-fotos">
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Registro fotográfico</h3>
      {cargando && <p className="text-sm text-slate-500">Cargando fotos…</p>}
      {!cargando && total === 0 && (
        <p className="text-sm text-slate-500 italic">Esta estimación no tiene evidencia fotográfica ni reporte de avance del periodo.</p>
      )}

      {fotosEst.length > 0 && (
        <div className="mb-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Fotos de la estimación ({fotosEst.length})</h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fotosEst.map((f) => (
              <li key={`ef-${f.id}`} className="border border-slate-200 rounded-md p-3 flex items-start justify-between gap-2" data-testid={`foto-est-${f.id}`}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">🖼️ {f.nombre}</div>
                  {f.descripcion && <div className="text-xs text-slate-500">{f.descripcion}</div>}
                  <div className="text-[11px] text-slate-400">{fmtFechaHora(f.created_at)}</div>
                </div>
                <button type="button" className="text-xs text-sigecop-blue hover:underline shrink-0"
                  onClick={() => abrirBlob(api.descargarFotoEstimacion(f.id), onError)}>Ver</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fotosAvance.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Reporte fotográfico del avance del periodo ({fotosAvance.length})</h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fotosAvance.map((f) => (
              <li key={`af-${f.id}`} className="border border-slate-200 rounded-md p-3 flex items-start justify-between gap-2" data-testid={`foto-avance-${f.id}`}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">🖼️ {f.nombre}</div>
                  <div className="text-xs text-slate-500">{f.clave ? `${f.clave} · ` : ''}{f.concepto || ''}</div>
                  {f.descripcion && <div className="text-xs text-slate-500">{f.descripcion}</div>}
                </div>
                <button type="button" className="text-xs text-sigecop-blue hover:underline shrink-0"
                  onClick={() => abrirBlob(api.descargarFotoAvance(f.id), onError)}>Ver</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// SOPORTES — documentos de soporte técnico por concepto (solo lectura; descarga por participación).
// -------------------------------------------------------------------------------------------------
export function ContenidoSoportes({ estimacionId, onError }) {
  const [soportes, setSoportes] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!estimacionId) return;
    let vivo = true;
    setCargando(true);
    api.listarSoportesEstimacion(estimacionId)
      .then((l) => { if (vivo) setSoportes(Array.isArray(l) ? l : []); })
      .catch(() => { if (vivo) setSoportes([]); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [estimacionId]);

  return (
    <div data-testid="expediente-soportes">
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Soportes documentales</h3>
      {cargando && <p className="text-sm text-slate-500">Cargando soportes…</p>}
      {!cargando && soportes.length === 0 && (
        <p className="text-sm text-slate-500 italic">Esta estimación no tiene soportes documentales (PDF, hojas de cálculo, etc.).</p>
      )}
      {soportes.length > 0 && (
        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3 font-semibold">Archivo</th>
                <th className="text-left p-3 font-semibold">Concepto</th>
                <th className="text-left p-3 font-semibold">Descripción</th>
                <th className="text-left p-3 font-semibold">Subido</th>
                <th className="text-right p-3 font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {soportes.map((s) => (
                <tr key={s.id} className="border-t border-slate-200 hover:bg-slate-50" data-testid={`soporte-${s.id}`}>
                  <td className="p-3">{ICONO_TIPO[s.tipo] || '📎'} {s.nombre} <span className="text-[10px] uppercase text-slate-400">{s.tipo}</span></td>
                  <td className="p-3 text-slate-600">{s.concepto_clave ? `${s.concepto_clave} · ${s.concepto_nombre || ''}` : <span className="text-slate-400">General</span>}</td>
                  <td className="p-3 text-slate-600">{s.descripcion || '—'}</td>
                  <td className="p-3 text-slate-500 text-xs">{s.subido_por_nombre || '—'} · {fmtFechaHora(s.created_at)}</td>
                  <td className="p-3 text-right">
                    <button type="button" className="text-xs text-sigecop-blue hover:underline"
                      onClick={() => abrirBlob(api.descargarSoporteEstimacion(s.id), onError)}>Ver / descargar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// Renderers de solo lectura para el historial (HU-14): carátula / generadores / notas.
// -------------------------------------------------------------------------------------------------
function CaratulaRO({ d }) {
  if (!d) return <p className="text-sm text-slate-500">Cargando…</p>;
  const filas = [
    { c: 'Subtotal (Σ generadores)', v: d.subtotal },
    { c: `Amortización de anticipo (${Number(d.anticipo_pct_snapshot) || 0}%)`, v: -Math.abs(Number(d.amortizacion) || 0) },
    { c: 'Retención 5 al millar (art. 191 LFD)', v: -Math.abs(Number(d.retencion) || 0) },
    { c: 'Deductivas', v: -Math.abs(Number(d.deductivas) || 0) },
  ];
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-md">
      <table className="w-full text-sm"><tbody>
        {filas.map((f, i) => (
          <tr key={i} className="border-t border-slate-200"><td className="px-4 py-2.5 text-slate-800">{f.c}</td><td className="px-4 py-2.5 text-right font-mono">{moneda(f.v)}</td></tr>
        ))}
        <tr className="border-t border-slate-200 bg-sigecop-blue-light font-bold"><td className="px-4 py-2.5 text-sigecop-blue">Importe neto del periodo</td><td className="px-4 py-2.5 text-right font-mono text-sigecop-blue">{moneda(d.neto)}</td></tr>
      </tbody></table>
    </div>
  );
}
function GeneradoresRO({ d }) {
  const gens = d?.generadores || [];
  if (gens.length === 0) return <p className="text-sm text-slate-500 italic">Sin números generadores.</p>;
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-md">
      <table className="w-full text-sm">
        <thead className="bg-sigecop-blue-light text-sigecop-blue"><tr>
          <th className="text-left px-3 py-2">Concepto</th><th className="text-right px-3 py-2">Este periodo</th><th className="text-right px-3 py-2">Importe</th>
        </tr></thead>
        <tbody>{gens.map((g) => (
          <tr key={g.id} className="border-t border-slate-200"><td className="px-3 py-2">{g.concepto}</td><td className="px-3 py-2 text-right">{Number(g.cantidad_periodo).toLocaleString('es-MX')}</td><td className="px-3 py-2 text-right font-mono">{moneda(g.importe)}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}
function NotasRO({ d }) {
  const notas = d?.notas || [];
  if (notas.length === 0) return <p className="text-sm text-slate-500 italic">Sin notas de bitácora vinculadas.</p>;
  return (
    <ul className="space-y-2">{notas.map((n) => (
      <li key={n.nota_id} className="border border-slate-200 rounded-md p-3 text-sm">
        <span className="inline-block px-2 py-0.5 bg-sigecop-blue-light text-sigecop-blue text-xs font-semibold rounded mr-2">{n.tipo}</span>
        <span className="font-mono text-xs text-slate-500">#{n.numero}</span> — {n.asunto}
      </li>
    ))}</ul>
  );
}
function ObservacionesRO({ observaciones }) {
  if (!observaciones || observaciones.length === 0) return <p className="text-sm text-slate-500 italic">Sin observaciones registradas.</p>;
  return (
    <ul className="space-y-2">{observaciones.map((o) => (
      <li key={o.id} className="border border-slate-200 rounded-md p-3 text-sm" data-testid={`exp-obs-${o.id}`}>
        <div className="flex items-center gap-2 mb-1 text-[11px]">
          <span className="px-2 py-0.5 bg-sigecop-blue-light text-sigecop-blue font-semibold rounded capitalize">{o.seccion}</span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-semibold rounded">{o.tipo}</span>
          <span className="text-slate-400">{o.autor_nombre || '—'} · {fmtFechaHora(o.created_at)}</span>
        </div>
        <div className="text-slate-800">{o.descripcion}</div>
      </li>
    ))}</ul>
  );
}

// EXPEDIENTE COMPLETO de solo lectura (HU-14). Carga detalle + revisión (observaciones) al abrir.
export function ExpedienteEstimacionReadOnly({ estimacionId, onError }) {
  const [detalle, setDetalle] = useState(null);
  const [revision, setRevision] = useState(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!estimacionId) return;
    setCargando(true);
    try {
      const [det, rev] = await Promise.all([
        api.detalleEstimacion(estimacionId).catch(() => null),
        api.revisionEstimacion(estimacionId).catch(() => null),
      ]);
      setDetalle(det); setRevision(rev);
    } finally { setCargando(false); }
  }, [estimacionId]);
  useEffect(() => { cargar(); }, [cargar]);

  const contratoId = detalle?.contrato_id || revision?.contrato_id;
  const pIni = detalle?.periodo_inicio || revision?.periodo_inicio;
  const pFin = detalle?.periodo_fin || revision?.periodo_fin;
  const observaciones = revision?.observaciones || [];

  const tabs = [
    { label: 'Carátula', content: <CaratulaRO d={detalle} /> },
    { label: 'Generadores', content: <GeneradoresRO d={detalle} /> },
    { label: 'Notas', content: <NotasRO d={detalle} /> },
    { label: 'Fotos', content: <ContenidoFotos estimacionId={estimacionId} contratoId={contratoId} periodoInicio={pIni} periodoFin={pFin} onError={onError} /> },
    { label: 'Soportes', content: <ContenidoSoportes estimacionId={estimacionId} onError={onError} /> },
    { label: `Observaciones (${observaciones.length})`, content: <ObservacionesRO observaciones={observaciones} /> },
  ];

  if (cargando && !detalle) return <p className="text-sm text-slate-500" data-testid="expediente-cargando">Cargando expediente…</p>;
  return <div data-testid="expediente-readonly"><Tabs tabs={tabs} /></div>;
}
