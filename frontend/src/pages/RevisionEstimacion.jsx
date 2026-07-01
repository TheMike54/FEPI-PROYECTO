import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Tabs from '../components/ui/Tab.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import PestanasCiclo from '../components/PestanasCiclo.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import BannerContratoActivo from '../components/BannerContratoActivo.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { ahoraRefMs } from '../lib/fechaSimulada.js';
import { monedaMXN as moneda } from '../utils/formato.js';
import { labelEstadoEstimacion } from '../data/estadoEstimacion.js';
import { ContenidoFotos, ContenidoSoportes } from '../components/estimacion/ExpedienteEstimacion.jsx';

// HU-15 (Equipo 3) — cableado al backend real. Recepción, revisión técnica y autorización/
// rechazo de la estimación. Fuente de la verdad = backend; aquí NO se calcula dinero ni se
// fabrican datos (sin dummy). Carátula/generadores/notas se leen del detalle real de HU-12
// (GET /estimaciones/:id); fotos/soportes no se exponen como archivos reales → se ocultan.
//
// Ciclo (art. 54 LOPSRM): la estimación 'enviada' (HU-13) entra a revisión. Supervisión
// (contrato.supervision_id) registra observaciones por sección y TURNA a residencia;
// residencia (contrato.residente_id) AUTORIZA o RECHAZA, solo después del turnado. El
// semáforo de 15 días naturales se DERIVA de enviada_en (sello de envío). El backend
// revalida cada acción por rol y por máquina de estados.

const PLAZO_REVISION_DIAS = 15;

// Tipos de observación (texto). FIX 22-jun (profe): se ELIMINÓ la severidad — no hay término medio,
// toda observación cuenta por igual; si la estimación tiene observaciones, no está aprobada.
const TIPOS = [
  { value: 'aclaracion', label: 'Aclaración' },
  { value: 'correccion', label: 'Corrección' },
  { value: 'rechazo', label: 'Rechazo' }
];
const labelTipo = (v) => TIPOS.find((t) => t.value === v)?.label || v;

// moneda: utilidad compartida (utils/formato.js)

const fmtMes = new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const mesLabel = (iso) => {
  const s = (iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '—';
  const txt = fmtMes.format(new Date(s + 'T00:00:00Z')).replace('.', '');
  return txt.charAt(0).toUpperCase() + txt.slice(1);
};
const periodoLabel = (ini, fin) => {
  const a = mesLabel(ini); const b = mesLabel(fin);
  return a === b ? a : `${a} – ${b}`;
};

const fechaHoraMX = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const f = d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const h = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return `${f} ${h}`;
};

const MS_DIA = 86400000;
// Semáforo DERIVADO del sello de envío (art. 54: 15 días naturales de revisión).
function semaforoRevision(enviadaEnIso) {
  if (!enviadaEnIso) return null;
  const inicio = new Date(enviadaEnIso);
  if (Number.isNaN(inicio.getTime())) return null;
  // "Ahora" respeta la FECHA DE SIMULACIÓN (lente de solo lectura); real si no hay simulación.
  const transcurridos = Math.max(0, Math.floor((ahoraRefMs() - inicio.getTime()) / MS_DIA));
  const pct = Math.min(100, (transcurridos / PLAZO_REVISION_DIAS) * 100);
  // ≤7 verde, 8-12 amarillo, >12 rojo (reglas del prototipo).
  const color = transcurridos > 12 ? 'red' : transcurridos >= 8 ? 'amber' : 'green';
  const etiqueta = color === 'green' ? 'En tiempo' : color === 'amber' ? 'Por vencer' : 'Vencido';
  return { transcurridos, pct, color, etiqueta };
}

// BUG #7 (Oleada 1): la revisión ahora muestra el expediente COMPLETO — se agregan 'fotos' y 'soportes'
// (antes ocultas). El backend ya acepta observaciones en esas secciones (estimaciones-ciclo SECCIONES).
const SECCIONES = ['caratula', 'generadores', 'fotos', 'soportes', 'notas'];
const SECCION_LABEL = { caratula: 'Carátula', generadores: 'Números generadores', fotos: 'Registro fotográfico', soportes: 'Soportes documentales', notas: 'Notas vinculadas' };

const ESTADO_CLASE = {
  enviada:    'bg-amber-100 text-sigecop-amber-attention',
  autorizada: 'bg-green-100 text-sigecop-green-validation',
  pagada:     'bg-green-100 text-sigecop-green-validation',
  rechazada:  'bg-red-100 text-red-700'
};
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// --------------------------------------------------------------------------
// Lista + alta de observaciones de una sección (backend real).
// --------------------------------------------------------------------------
function ObservacionesSeccion({ seccionKey, observaciones, puedeEditar, onAgregar, onEliminar, agregando }) {
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState(TIPOS[0].value);

  const agregar = async () => {
    if (!texto.trim()) return;
    const ok = await onAgregar({ seccion: seccionKey, tipo, descripcion: texto.trim() });
    if (ok) { setTexto(''); setTipo(TIPOS[0].value); }
  };

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-2">
        Observaciones de esta sección ({observaciones.length})
      </h4>

      {observaciones.length === 0 ? (
        <p className="text-xs text-slate-500 italic">Sin observaciones registradas en esta sección.</p>
      ) : (
        <ul className="space-y-2">
          {observaciones.map((o, i) => (
            <li
              key={o.id}
              className="border border-slate-200 rounded-md p-3"
              data-testid={`obs-${seccionKey}-${i}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm text-slate-800">{o.descripcion}</div>
                {puedeEditar && (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline shrink-0"
                    onClick={() => onEliminar(o.id)}
                    data-testid={`obs-${seccionKey}-${i}-eliminar`}
                  >
                    Eliminar
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                <span className="inline-block px-2 py-0.5 bg-sigecop-blue-light text-sigecop-blue font-semibold rounded">
                  {labelTipo(o.tipo)}
                </span>
                <span className="text-slate-500">
                  {o.autor_nombre || '—'} · {fechaHoraMX(o.created_at) || '—'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {puedeEditar && (
        <div className="mt-3 border border-slate-200 rounded-md p-3 bg-slate-50">
          <textarea
            className="sg-input"
            rows={2}
            placeholder="Describe la observación…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            data-testid={`obs-${seccionKey}-nueva-texto`}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 items-end">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5">Tipo</label>
              <select className="sg-input" value={tipo} onChange={(e) => setTipo(e.target.value)} data-testid={`obs-${seccionKey}-nueva-tipo`}>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <button
              type="button"
              className="sg-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={agregar}
              disabled={!texto.trim() || agregando}
              data-testid={`btn-agregar-obs-${seccionKey}`}
            >
              + Agregar observación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Contenido real por sección (detalle de HU-12).
// --------------------------------------------------------------------------
function ContenidoCaratula({ detalle }) {
  if (!detalle) return <p className="text-sm text-slate-500">Cargando carátula…</p>;
  const filas = [
    { concepto: 'Subtotal (Σ generadores)', importe: detalle.subtotal },
    { concepto: `Amortización de anticipo (${Number(detalle.anticipo_pct_snapshot) || 0}%)`, importe: -Math.abs(Number(detalle.amortizacion) || 0) },
    { concepto: 'Retención 5 al millar (art. 191 LFD)', importe: -Math.abs(Number(detalle.retencion) || 0) },
    { concepto: 'Deductivas', importe: -Math.abs(Number(detalle.deductivas) || 0) }
  ];
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Carátula de la estimación</h3>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <tbody>
            {filas.map((c, i) => (
              <tr key={i} className="border-t border-slate-200">
                <td className="px-4 py-3 text-slate-800">{c.concepto}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-800">{moneda(c.importe)}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-200 bg-sigecop-blue-light font-bold">
              <td className="px-4 py-3 text-sigecop-blue">Importe neto del periodo</td>
              <td className="px-4 py-3 text-right font-mono text-sigecop-blue text-base">{moneda(detalle.neto)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContenidoGeneradores({ detalle }) {
  const gens = detalle?.generadores || [];
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Números generadores</h3>
      {gens.length === 0 ? (
        <p className="text-sm text-slate-500 italic">Esta estimación no tiene números generadores.</p>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-sigecop-blue-light text-sigecop-blue">
              <tr>
                <th className="text-left px-3 py-2">Concepto</th>
                <th className="text-left px-3 py-2 w-20">Unidad</th>
                <th className="text-right px-3 py-2 w-28">Contratado</th>
                <th className="text-right px-3 py-2 w-32">Este periodo</th>
                <th className="text-right px-3 py-2 w-28">Acumulado</th>
                <th className="text-right px-3 py-2 w-28">Importe</th>
                <th className="text-right px-3 py-2 w-24">% avance</th>
              </tr>
            </thead>
            <tbody>
              {gens.map((g) => (
                <tr key={g.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-3 py-2">{g.concepto}</td>
                  <td className="px-3 py-2 text-slate-600">{g.unidad}</td>
                  <td className="px-3 py-2 text-right">{Number(g.cantidad_contratada).toLocaleString('es-MX')}</td>
                  <td className="px-3 py-2 text-right">{Number(g.cantidad_periodo).toLocaleString('es-MX')}</td>
                  <td className="px-3 py-2 text-right font-semibold">{Number(g.acumulado).toLocaleString('es-MX')}</td>
                  <td className="px-3 py-2 text-right font-mono">{moneda(g.importe)}</td>
                  <td className="px-3 py-2 text-right">{g.avance_pct != null ? `${g.avance_pct}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ContenidoNotas({ detalle }) {
  const notas = detalle?.notas || [];
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Notas de bitácora vinculadas</h3>
      {notas.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No hay notas de bitácora vinculadas a esta estimación.</p>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3 font-semibold">Folio</th>
                <th className="text-left p-3 font-semibold">Tipo</th>
                <th className="text-left p-3 font-semibold">Fecha</th>
                <th className="text-left p-3 font-semibold">Asunto</th>
              </tr>
            </thead>
            <tbody>
              {notas.map((n) => (
                <tr key={n.nota_id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs">{n.numero}</td>
                  <td className="p-3">
                    <span className="inline-block px-2 py-0.5 bg-sigecop-blue-light text-sigecop-blue text-xs font-semibold rounded">{n.tipo}</span>
                  </td>
                  <td className="p-3">{n.fecha ? mesLabel(n.fecha) : '—'}</td>
                  <td className="p-3 text-slate-700">{n.asunto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Indicador visual de los 3 pasos del flujo (CA-2).
function IndicadorFlujo({ estado, turnada }) {
  const resuelta = estado === 'autorizada' || estado === 'rechazada';
  const pasos = [
    {
      id: 'supervision', label: 'Supervisión',
      estado: turnada || resuelta ? 'Turnado ✓' : 'En revisión',
      activo: !turnada && !resuelta, completado: turnada || resuelta
    },
    {
      id: 'residencia', label: 'Residencia',
      estado: resuelta ? 'Resuelto ✓' : turnada ? 'En revisión' : 'En espera',
      activo: turnada && !resuelta, completado: resuelta
    },
    {
      id: 'resolucion', label: 'Resolución',
      estado: estado === 'autorizada' ? 'Autorizada' : estado === 'rechazada' ? 'Rechazada' : 'Pendiente',
      activo: resuelta, completado: false
    }
  ];
  return (
    <div className="bg-white border border-slate-200 rounded-md p-4 mb-4">
      <div className="flex items-center justify-between gap-2">
        {pasos.map((p, i) => {
          const colorBg = p.activo ? 'bg-sigecop-blue text-white'
            : p.completado ? 'bg-sigecop-green-validation text-white' : 'bg-slate-200 text-slate-500';
          const colorTxt = p.activo ? 'text-sigecop-blue'
            : p.completado ? 'text-sigecop-green-validation' : 'text-slate-500';
          return (
            <div key={p.id} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold mb-1 ${colorBg}`}>
                  {p.completado ? '✓' : i + 1}
                </div>
                <div className={`text-xs font-semibold ${colorTxt}`}>{p.label}</div>
                <div className="text-[10px] text-slate-500">{p.estado}</div>
              </div>
              {i < pasos.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 ${p.completado ? 'bg-sigecop-green-validation' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SemaforoPlazoRevision({ enviadaEn }) {
  const sem = semaforoRevision(enviadaEn);
  if (!sem) return null;
  const colorBadge = sem.color === 'green' ? 'bg-green-100 text-sigecop-green-validation'
    : sem.color === 'amber' ? 'bg-amber-100 text-sigecop-amber-attention' : 'bg-red-100 text-red-700';
  const colorBarra = sem.color === 'green' ? 'bg-sigecop-green-validation'
    : sem.color === 'amber' ? 'bg-sigecop-amber-attention' : 'bg-red-500';
  return (
    <div className="bg-white border border-slate-200 rounded-md p-4 mb-4" data-testid="semaforo-revision">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-slate-700">Plazo de revisión (art. 54 LOPSRM)</div>
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colorBadge}`}
          data-testid="semaforo-revision-badge"
          data-color={sem.color}
        >
          Día {sem.transcurridos} de {PLAZO_REVISION_DIAS} — {sem.etiqueta}
        </span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${colorBarra}`} style={{ width: `${sem.pct}%` }} />
      </div>
      <p className="text-xs text-slate-500 mt-2">
        15 días naturales desde el envío de la estimación ({fechaHoraMX(enviadaEn) || '—'}). El semáforo se calcula en vivo.
      </p>
    </div>
  );
}

export default function RevisionEstimacion() {
  const { token, usuario } = useSesion();
  const { soloLectura } = useVistaHU('HU-15');
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [estimaciones, setEstimaciones] = useState([]);
  const [estimacionId, setEstimacionId] = useState('');
  const [revision, setRevision] = useState(null);   // estado de revisión (backend)
  const [detalle, setDetalle] = useState(null);      // carátula/generadores/notas (HU-12)
  const [cargandoEst, setCargandoEst] = useState(false);
  const [cargandoRev, setCargandoRev] = useState(false);
  const [accion, setAccion] = useState(false);       // acción en curso (deshabilita botones)
  const [sinObservaciones, setSinObservaciones] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const contratoSel = useMemo(() => contratos.find((c) => String(c.id) === String(contratoId)) || null, [contratos, contratoId]);

  // Carga inicial: contratos del usuario (acotados por el backend).
  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const cargarRevision = useCallback(async (id) => {
    if (!id) { setRevision(null); setDetalle(null); return; }
    setCargandoRev(true);
    try {
      const [rev, det] = await Promise.all([api.revisionEstimacion(id), api.detalleEstimacion(id)]);
      setRevision(rev);
      setDetalle(det);
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a la revisión de esta estimación' : 'No se pudo cargar la estimación');
      setRevision(null); setDetalle(null);
    } finally {
      setCargandoRev(false);
    }
  }, [showToast]);

  const cargarEstimaciones = useCallback(async (id) => {
    if (!id) { setEstimaciones([]); return; }
    setCargandoEst(true);
    try {
      const data = await api.historialEstimaciones(id);
      // Revisables/resueltas: enviada (en revisión) + autorizada/rechazada (consulta).
      const revisables = (Array.isArray(data) ? data : []).filter((e) => ['enviada', 'autorizada', 'rechazada'].includes(e.estado));
      setEstimaciones(revisables);
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a las estimaciones de este contrato' : 'No se pudieron cargar las estimaciones');
      setEstimaciones([]);
    } finally {
      setCargandoEst(false);
    }
  }, [showToast]);

  const seleccionarContrato = useCallback((id) => {
    setContratoId(id);
    setEstimacionId(''); setRevision(null); setDetalle(null); setEstimaciones([]);
    setSinObservaciones(false); setMotivoRechazo('');
    cargarEstimaciones(id);
  }, [cargarEstimaciones]);

  // B6b/A-3A: preselecciona el contrato del ?contrato=ID (consistencia entre pantallas).
  const [searchParams] = useSearchParams();
  const contratoQuery = searchParams.get('contrato');
  useEffect(() => {
    if (sinSesion || !contratoQuery || contratoId) return;
    if (contratos.some((c) => String(c.id) === String(contratoQuery))) seleccionarContrato(String(contratoQuery));
  }, [sinSesion, contratoQuery, contratoId, contratos, seleccionarContrato]);

  const seleccionarEstimacion = useCallback((id) => {
    setEstimacionId(id);
    setSinObservaciones(false); setMotivoRechazo('');
    cargarRevision(id);
  }, [cargarRevision]);

  // --- Observaciones ---
  const agregarObservacion = useCallback(async (payload) => {
    if (accion) return false;
    setAccion(true);
    try {
      await api.crearObservacionEstimacion(estimacionId, payload);
      await cargarRevision(estimacionId);
      return true;
    } catch (e) {
      showToast(e.message || 'No se pudo registrar la observación');
      return false;
    } finally {
      setAccion(false);
    }
  }, [accion, estimacionId, cargarRevision, showToast]);

  const eliminarObservacion = useCallback(async (obsId) => {
    if (accion) return;
    setAccion(true);
    try {
      await api.eliminarObservacionEstimacion(estimacionId, obsId);
      await cargarRevision(estimacionId);
    } catch (e) {
      showToast(e.message || 'No se pudo eliminar la observación');
    } finally {
      setAccion(false);
    }
  }, [accion, estimacionId, cargarRevision, showToast]);

  // --- Ciclo ---
  const turnar = useCallback(async () => {
    if (accion) return;
    setAccion(true);
    try {
      await api.turnarEstimacion(estimacionId, { sin_observaciones: sinObservaciones });
      await cargarRevision(estimacionId);
      showToast('Estimación turnada a residencia.');
    } catch (e) {
      showToast(e.message || 'No se pudo turnar la estimación');
    } finally {
      setAccion(false);
    }
  }, [accion, estimacionId, sinObservaciones, cargarRevision, showToast]);

  const autorizar = useCallback(async () => {
    if (accion) return;
    setAccion(true);
    try {
      await api.autorizarEstimacion(estimacionId);
      await cargarRevision(estimacionId);
      cargarEstimaciones(contratoId);
      showToast('Estimación autorizada. Continúa el ciclo en tránsito a pago.');
    } catch (e) {
      showToast(e.message || 'No se pudo autorizar la estimación');
    } finally {
      setAccion(false);
    }
  }, [accion, estimacionId, contratoId, cargarRevision, cargarEstimaciones, showToast]);

  const rechazar = useCallback(async () => {
    if (accion) return;
    if (!motivoRechazo.trim()) { showToast('Indica el motivo del rechazo.'); return; }
    setAccion(true);
    try {
      await api.rechazarEstimacion(estimacionId, { motivo: motivoRechazo.trim() });
      await cargarRevision(estimacionId);
      cargarEstimaciones(contratoId);
      showToast('Estimación rechazada. El contratista debe volver a integrarla y presentarla (HU-12).');
    } catch (e) {
      showToast(e.message || 'No se pudo rechazar la estimación');
    } finally {
      setAccion(false);
    }
  }, [accion, estimacionId, contratoId, motivoRechazo, cargarRevision, cargarEstimaciones, showToast]);

  // Observaciones agrupadas por sección.
  const obsPorSeccion = useMemo(() => {
    const m = Object.fromEntries(SECCIONES.map((k) => [k, []]));
    for (const o of (revision?.observaciones || [])) {
      if (m[o.seccion]) m[o.seccion].push(o);
    }
    return m;
  }, [revision]);

  const totalObs = revision?.observaciones?.length || 0;
  const estado = revision?.estado;
  const turnada = !!revision?.turnada;
  const esSupervision = !!revision?.es_supervision;
  const esResidencia = !!revision?.es_residencia;

  // Gating de acciones (el backend revalida por id de usuario y máquina de estados).
  const puedeRegistrar = !soloLectura && esSupervision && estado === 'enviada' && !turnada;
  const puedeTurnar = puedeRegistrar && (totalObs > 0 || sinObservaciones);
  const puedeResolver = !soloLectura && esResidencia && estado === 'enviada' && turnada;

  const tabs = SECCIONES.map((key) => ({
    label: SECCION_LABEL[key],
    content: (
      <div>
        {key === 'caratula' && <ContenidoCaratula detalle={detalle} />}
        {key === 'generadores' && <ContenidoGeneradores detalle={detalle} />}
        {key === 'fotos' && <ContenidoFotos estimacionId={estimacionId} contratoId={revision?.contrato_id} periodoInicio={revision?.periodo_inicio} periodoFin={revision?.periodo_fin} onError={showToast} />}
        {key === 'soportes' && <ContenidoSoportes estimacionId={estimacionId} onError={showToast} />}
        {key === 'notas' && <ContenidoNotas detalle={detalle} />}
        <ObservacionesSeccion
          seccionKey={key}
          observaciones={obsPorSeccion[key]}
          puedeEditar={puedeRegistrar}
          onAgregar={agregarObservacion}
          onEliminar={eliminarObservacion}
          agregando={accion}
        />
      </div>
    )
  }));

  return (
    <div>
      <HeaderVista
        huId="HU-15"
        titulo="Recepción, revisión técnica y autorización de la estimación"
        sprint="Sprint 4"
        rolAcademico="Supervisión y residencia (revisión secuencial)"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Estimaciones' },
          { label: 'Revisión' }
        ]}
      />

      <PestanasCiclo ciclo="estimacion" activo="revision" />

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión para revisar estimaciones.
        </div>
      )}

      {/* Selección de contrato + estimación. */}
      <div className="bg-white border border-slate-200 rounded-md p-4 mb-6 max-w-2xl space-y-4">
        {/* 3A·P3: hereda el contrato activo global en vez de re-seleccionarlo. */}
        <BannerContratoActivo seleccionar={seleccionarContrato} contratoId={contratoId} />
        {contratoId && (
          <div>
            <label className="sg-label">Estimación</label>
            <select
              className="sg-input"
              value={estimacionId}
              onChange={(e) => seleccionarEstimacion(e.target.value)}
              disabled={cargandoEst}
              data-testid="select-estimacion"
            >
              <option value="">— Selecciona una estimación —</option>
              {estimaciones.map((e) => (
                <option key={e.id} value={e.id}>
                  EST-{String(e.numero).padStart(3, '0')} · {periodoLabel(e.periodo_inicio, e.periodo_fin)} · {labelEstadoEstimacion(e.estado)}
                </option>
              ))}
            </select>
            {!cargandoEst && estimaciones.length === 0 && (
              <p className="text-xs text-slate-500 mt-1" data-testid="sin-estimaciones">
                Este contrato no tiene estimaciones enviadas para revisar.
              </p>
            )}
          </div>
        )}
      </div>

      {cargandoRev && <p className="text-sm text-slate-500 mb-4">Cargando estimación…</p>}

      {revision && detalle && !cargandoRev && (
        <>
          <BannerContexto
            variant="slate"
            folio={contratoSel?.folio}
            folioLabel="Contrato"
            extra={[
              { label: 'Estimación', value: `EST-${String(revision.numero).padStart(3, '0')}`, resaltado: true },
              { label: 'Estado', value: labelEstadoEstimacion(revision.estado) },
              { label: 'Neto', value: moneda(revision.neto), resaltado: true }
            ]}
            margenAbajo="mb-4"
          />

          <IndicadorFlujo estado={estado} turnada={turnada} />
          <SemaforoPlazoRevision enviadaEn={revision.enviada_en} />

          {/* Banners de estado. */}
          {estado === 'enviada' && turnada && (
            <div className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 mb-4 rounded-r-md" data-testid="banner-turnada">
              <div className="text-sm font-semibold text-sigecop-green-validation">✓ Turnada a residencia.</div>
              <p className="text-sm text-slate-800 mt-1">Supervisión queda en lectura. Residencia puede autorizar o rechazar.</p>
            </div>
          )}
          {estado === 'autorizada' && (
            <div className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 mb-4 rounded-r-md" data-testid="banner-autorizada">
              <div className="text-sm font-semibold text-sigecop-green-validation">✓ Estimación autorizada.</div>
              <p className="text-sm text-slate-800 mt-1">La estimación queda en lectura total. Continúa el ciclo en tránsito a pago (HU-20).</p>
            </div>
          )}
          {estado === 'rechazada' && (
            <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 mb-4 rounded-r-md" data-testid="banner-rechazada">
              <div className="text-sm font-semibold text-sigecop-amber-attention">⚠ Estimación rechazada — el contratista debe volver a integrarla y presentarla (HU-12).</div>
              <p className="text-sm text-slate-800 mt-1">Observaciones a resolver ({totalObs}):</p>
              <ul className="list-disc list-inside text-sm text-slate-800 mt-1 space-y-0.5">
                {(revision.observaciones || []).map((o) => (
                  <li key={o.id}>
                    <strong className="capitalize">{o.seccion}</strong> · {labelTipo(o.tipo)}: {o.descripcion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Tabs tabs={tabs} />

          {/* Panel de resolución (solo para quien puede actuar y mientras esté 'enviada'). */}
          {!soloLectura && estado === 'enviada' && (esSupervision || esResidencia) && (
            <div className="mt-6 bg-white border border-slate-200 rounded-md p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Panel de resolución</h2>

              {esSupervision && !turnada && (
                <>
                  <p className="text-sm text-slate-700 mb-3">
                    Supervisión revisa la estimación. Para turnar a residencia debe haber al menos una
                    observación registrada, o marcar la estimación sin observaciones.
                  </p>
                  <label className="flex items-center gap-2 text-sm text-slate-800 mb-3">
                    <input
                      type="checkbox"
                      checked={sinObservaciones}
                      onChange={(e) => setSinObservaciones(e.target.checked)}
                      disabled={totalObs > 0}
                      data-testid="chk-sin-observaciones"
                    />
                    Marcar la estimación sin observaciones (apta para autorización).
                  </label>
                  <p className="text-xs text-slate-500 mb-3">Total de observaciones registradas: <strong>{totalObs}</strong>.</p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="sg-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!puedeTurnar || accion}
                      onClick={turnar}
                      data-testid="btn-turnar"
                      title={!puedeTurnar ? 'Registra al menos una observación o marca "Sin observaciones".' : ''}
                    >
                      ➡ Turnar a residencia
                    </button>
                  </div>

                  {/* FIX 22-jun (profe): la supervisión puede RECHAZAR DIRECTO (sin turnar a residencia). */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-700 mb-2">
                      O bien, la supervisión puede <strong>rechazar directamente</strong> la estimación, sin turnarla a residencia.
                    </p>
                    <label className="sg-label">Motivo del rechazo</label>
                    <textarea
                      className="sg-input mb-3"
                      rows={2}
                      placeholder="Motivo del rechazo…"
                      value={motivoRechazo}
                      onChange={(e) => setMotivoRechazo(e.target.value)}
                      data-testid="motivo-rechazo-supervision"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="px-4 py-2 rounded-md border border-red-500 text-red-700 font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={accion || !motivoRechazo.trim()}
                        onClick={rechazar}
                        data-testid="btn-rechazar-supervision"
                        title={!motivoRechazo.trim() ? 'Indica el motivo del rechazo.' : ''}
                      >
                        ✗ Rechazar (supervisión)
                      </button>
                    </div>
                  </div>
                </>
              )}

              {esSupervision && turnada && (
                <p className="text-sm text-slate-700">Ya turnaste la estimación a residencia. Queda en su resolución.</p>
              )}

              {esResidencia && !turnada && (
                <p className="text-sm text-slate-700">La estimación aún no ha sido turnada por supervisión. No puedes resolverla todavía.</p>
              )}

              {esResidencia && turnada && (
                <>
                  <p className="text-sm text-slate-700 mb-3">Estimación turnada por supervisión. Puedes autorizar o rechazar.</p>
                  <label className="sg-label">Motivo (requerido para rechazar)</label>
                  <textarea
                    className="sg-input mb-3"
                    rows={2}
                    placeholder="Motivo del rechazo…"
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    data-testid="motivo-rechazo"
                  />
                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-md border border-red-500 text-red-700 font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!puedeResolver || accion || !motivoRechazo.trim()}
                      onClick={rechazar}
                      data-testid="btn-rechazar"
                      title={!motivoRechazo.trim() ? 'Indica el motivo del rechazo.' : ''}
                    >
                      ✗ Rechazar
                    </button>
                    <button
                      type="button"
                      className="sg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!puedeResolver || accion}
                      onClick={autorizar}
                      data-testid="btn-autorizar"
                    >
                      ✓ Autorizar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      <SeccionCriterios
        huId="HU-15"
        criterios={[
          { numero: 1, texto: 'La revisión permite ir sección por sección (carátula, generadores, registro fotográfico, soportes y notas) y registrar observaciones con su tipo por concepto; toda observación cuenta por igual (no hay niveles de severidad): si hay observaciones, la estimación no está aprobada.' },
          { numero: 2, texto: 'La autorización queda condicionada al turnado secuencial: primero supervisión, luego residencia; residencia no puede resolver antes del turnado.' },
          { numero: 3, texto: 'El sistema controla el plazo de 15 días naturales de revisión conforme al art. 54 LOPSRM mediante un semáforo basado en la fecha real de recepción.' }
        ]}
      />
    </div>
  );
}
