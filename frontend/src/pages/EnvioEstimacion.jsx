import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import PestanasCiclo from '../components/PestanasCiclo.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import BannerContratoActivo from '../components/BannerContratoActivo.jsx';
import { api } from '../services/api.js';
import { labelEstadoEstimacion } from '../data/estadoEstimacion.js';
import { monedaMXN as moneda } from '../utils/formato.js';

// HU-13 — PRESENTACIÓN de la estimación por el CONTRATISTA (art. 54 LOPSRM). RECONCILIACIÓN O7↔HU-15
// (11-jun): O7 había puesto aquí la autorización del residente porque HU-15 no existía; con HU-15
// integrado, HU-13 REGRESA a su sentido original — el contratista (superintendente) PRESENTA la
// estimación 'integrada' (Integrada) → 'enviada' (Presentada). La revisión técnica y la autorización
// (supervisión turna → residencia autoriza/rechaza) viven en HU-15. La verdad del dinero vive en HU-12.
//
// Plazos art. 54 LOPSRM como REFERENCIA VISUAL (NO bloqueantes):
//   · Presentación: el contratista presenta dentro de 6 días naturales del corte del periodo (informativo).
//   · Revisión/autorización: corre 15 días naturales DESDE LA PRESENTACIÓN (enviada_en) — se muestra sobre
//     las ya presentadas (la resolución la ejecuta HU-15).

const PLAZO_REVISION_DIAS = 15;     // revisión/autorización (HU-15) desde la presentación
const PLAZO_PRESENTACION_DIAS = 6;  // el contratista presenta (desde el corte) — informativo

// moneda: utilidad compartida (utils/formato.js)

// dd/mm/aaaa hh:mm a partir de un ISO/Date (acuse de presentación). null si no hay.
const fechaHoraMX = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const f = d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const h = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return `${f} ${h}`;
};

// Etiqueta de periodo "Ene 2026 – Ene 2026" (sin corrimiento de zona).
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

const ESTADO_CLASE = {
  integrada:  'bg-sigecop-blue-light text-sigecop-blue',
  enviada:    'bg-amber-100 text-amber-800',
  autorizada: 'bg-green-100 text-sigecop-green-validation',
  pagada:     'bg-green-100 text-sigecop-green-validation',
  rechazada:  'bg-red-100 text-red-700'
};

function EstadoBadge({ estado }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${ESTADO_CLASE[estado] || 'bg-slate-200 text-slate-600'}`}>
      {labelEstadoEstimacion(estado)}
    </span>
  );
}

const MS_DIA = 86400000;
// Semáforo DERIVADO de un SELLO (fecha ISO) y un PLAZO en días naturales. nivel: ok/alerta/vencido.
function semaforo(selloIso, plazoDias) {
  if (!selloIso) return null;
  const inicio = new Date(selloIso);
  if (Number.isNaN(inicio.getTime())) return null;
  const transcurridos = Math.max(0, Math.floor((Date.now() - inicio.getTime()) / MS_DIA));
  const restantes = plazoDias - transcurridos;
  let nivel = 'ok';
  if (restantes <= 0) nivel = 'vencido';
  else if (restantes <= 5) nivel = 'alerta';
  return { transcurridos, restantes, nivel, plazoDias };
}

const SEMAFORO_CLASE = {
  ok:      'bg-green-100 text-sigecop-green-validation',
  alerta:  'bg-amber-100 text-sigecop-amber-attention',
  vencido: 'bg-red-100 text-red-700'
};

// Plazo de presentación (informativo): días transcurridos desde el corte (periodo_fin).
function presentacion(periodoFinIso) {
  const s = (periodoFinIso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const corte = new Date(s + 'T00:00:00Z');
  const transcurridos = Math.floor((Date.now() - corte.getTime()) / MS_DIA);
  return { transcurridos, dentro: transcurridos >= 0 && transcurridos <= PLAZO_PRESENTACION_DIAS };
}

export default function EnvioEstimacion() {
  const { token } = useSesion();
  const { soloLectura } = useVistaHU('HU-13');
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [cargando, setCargando] = useState(false);
  const [estimaciones, setEstimaciones] = useState([]);
  const [presentandoId, setPresentandoId] = useState(null);

  const selected = useMemo(() => contratos.find((c) => String(c.id) === String(contratoId)) || null, [contratos, contratoId]);

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const cargarEstimaciones = useCallback(async (id) => {
    if (!id) { setEstimaciones([]); return; }
    setCargando(true);
    try {
      const data = await api.historialEstimaciones(id);
      setEstimaciones(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a las estimaciones de este contrato' : 'No se pudieron cargar las estimaciones');
      setEstimaciones([]);
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  const seleccionarContrato = useCallback((id) => {
    setContratoId(id);
    setEstimaciones([]);
    cargarEstimaciones(id);
  }, [cargarEstimaciones]);

  const [searchParams] = useSearchParams();
  const contratoQuery = searchParams.get('contrato');
  useEffect(() => {
    // B6b/A-3A: preselecciona el contrato del ?contrato=ID (consistencia entre pantallas).
    if (sinSesion || !contratoQuery || contratoId) return;
    if (contratos.some((c) => String(c.id) === String(contratoQuery))) seleccionarContrato(String(contratoQuery));
  }, [sinSesion, contratoQuery, contratoId, contratos, seleccionarContrato]);

  // PRESENTAR (POST /enviar; el backend sella enviada_en/por = la presentación, art. 54; gate superintendente).
  const handlePresentar = useCallback(async (est) => {
    if (soloLectura || presentandoId) return;
    setPresentandoId(est.id);
    try {
      const res = await api.enviarEstimacion(est.id);
      setEstimaciones((prev) => prev.map((e) => (
        e.id === est.id ? { ...e, estado: res.estado, enviada_en: res.enviada_en, enviada_por: res.enviada_por } : e
      )));
      showToast(`Estimación N.º ${est.numero} presentada. Inicia el plazo de revisión (15 días, art. 54 LOPSRM).`);
    } catch (e) {
      const msg = e.status === 409 ? (e.message || 'La estimación no se puede presentar en su estado actual')
        : e.status === 403 ? 'Solo el superintendente del contrato puede presentar sus estimaciones'
        : 'No se pudo presentar la estimación';
      showToast(msg);
      cargarEstimaciones(contratoId);
    } finally {
      setPresentandoId(null);
    }
  }, [soloLectura, presentandoId, showToast, cargarEstimaciones, contratoId]);

  const presentables = useMemo(() => estimaciones.filter((e) => e.estado === 'integrada'), [estimaciones]);

  return (
    <div>
      <HeaderVista
        huId="HU-13"
        titulo="Presentación de la estimación"
        sprint="Sprint 8"
        rolAcademico="Contratista"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Estimaciones' },
          { label: 'Presentación' }
        ]}
      />

      <PestanasCiclo ciclo="estimacion" activo="presentar" />

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión para presentar tus estimaciones.
        </div>
      )}

      {/* 3A · P3 — hereda el contrato activo global (banner read-only) en vez de re-seleccionarlo */}
      <BannerContratoActivo seleccionar={seleccionarContrato} contratoId={contratoId} />

      {!sinSesion && !contratoId && (
        <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para presentar sus estimaciones integradas.</p>
      )}
      {cargando && <p className="text-sm text-slate-500 mb-4">Cargando estimaciones…</p>}

      {selected && !cargando && (
        <>
          <BannerContexto
            variant="slate"
            titulo="Contrato"
            folio={selected.folio}
            extra={[{ value: selected.contratista || '—' }]}
          />

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden mb-6">
            <div className="px-6 py-3 border-b border-slate-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Estimaciones del contrato ({estimaciones.length})
                {!soloLectura && presentables.length > 0 && (
                  <span className="ml-2 font-normal normal-case text-slate-500">
                    · {presentables.length} por presentar
                  </span>
                )}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="tabla-envio">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left p-3 font-semibold">Estimación</th>
                    <th className="text-left p-3 font-semibold">Periodo</th>
                    <th className="text-center p-3 font-semibold">Estado</th>
                    <th className="text-right p-3 font-semibold">Neto</th>
                    <th className="text-left p-3 font-semibold">Plazo / acción</th>
                  </tr>
                </thead>
                <tbody>
                  {estimaciones.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400 italic" data-testid="envio-vacio">
                        Este contrato no tiene estimaciones integradas todavía.
                      </td>
                    </tr>
                  ) : (
                    estimaciones.map((e) => {
                      // 'enviada' (Presentada): semáforo de revisión/autorización (15 días desde la presentación, HU-15).
                      const semRev = e.estado === 'enviada' ? semaforo(e.enviada_en, PLAZO_REVISION_DIAS) : null;
                      // 'integrada' (Integrada): referencia del plazo de presentación (6 días del corte).
                      const pres = e.estado === 'integrada' ? presentacion(e.periodo_fin) : null;
                      return (
                        <tr
                          key={e.id}
                          className="border-t border-slate-200 align-top"
                          data-testid={`fila-envio-${e.id}`}
                        >
                          <td className="p-3 font-mono text-xs">EST-{String(e.numero).padStart(3, '0')}</td>
                          <td className="p-3">{periodoLabel(e.periodo_inicio, e.periodo_fin)}</td>
                          <td className="p-3 text-center"><EstadoBadge estado={e.estado} /></td>
                          <td className="p-3 text-right font-semibold">{moneda(e.neto)}</td>
                          <td className="p-3">
                            {e.estado === 'integrada' && (
                              <div className="space-y-2" data-testid={`semaforo-plazo-${e.id}`}>
                                {pres && (
                                  <div className={`text-xs ${pres.dentro ? 'text-slate-500' : 'text-sigecop-amber-attention'}`}>
                                    {pres.dentro
                                      ? `Dentro de los ${PLAZO_PRESENTACION_DIAS} días para presentar desde el corte (art. 54).`
                                      : `Fuera de los ${PLAZO_PRESENTACION_DIAS} días para presentar desde el corte (hace ${pres.transcurridos} días, art. 54).`}
                                  </div>
                                )}
                                {!soloLectura && (
                                  <button
                                    type="button"
                                    className="sg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed block"
                                    onClick={() => handlePresentar(e)}
                                    disabled={presentandoId === e.id}
                                    data-testid={`btn-presentar-${e.id}`}
                                  >
                                    {presentandoId === e.id ? 'Presentando…' : 'Presentar estimación'}
                                  </button>
                                )}
                              </div>
                            )}

                            {e.estado === 'enviada' && (
                              <div className="space-y-1" data-testid={`sello-presentacion-${e.id}`}>
                                <div className="text-xs text-slate-600">
                                  ✓ Presentada el {fechaHoraMX(e.enviada_en) || '—'}
                                </div>
                                {semRev && (
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${SEMAFORO_CLASE[semRev.nivel]}`}>
                                    {semRev.nivel === 'vencido'
                                      ? `Plazo de revisión: día ${semRev.transcurridos} de ${PLAZO_REVISION_DIAS} · plazo vencido`
                                      : `Plazo de revisión: día ${semRev.transcurridos} de ${PLAZO_REVISION_DIAS} · ${semRev.restantes} días restantes`}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Revisión profe 16-jun: la disponibilidad de "Presentar" se gobierna por
                                ESTADO, no por la validación de montos. Una estimación se presenta UNA sola
                                vez: ya autorizada/pagada no se vuelve a presentar; rechazada se vuelve a
                                presentar mediante REINGRESO (HU-16), no aquí. */}
                            {(e.estado === 'autorizada' || e.estado === 'pagada') && (
                              <span className="text-xs text-slate-500 italic" data-testid={`no-presentable-${e.id}`}>
                                Ya {labelEstadoEstimacion(e.estado).toLowerCase()} — una estimación se presenta una sola vez (art. 54 LOPSRM).
                              </span>
                            )}
                            {e.estado === 'rechazada' && (
                              <span className="text-xs text-slate-500" data-testid={`no-presentable-${e.id}`}>
                                Rechazada — para volver a presentarla, créala de nuevo en{' '}
                                <Link to="/estimaciones/reingreso" className="text-sigecop-accent hover:underline font-semibold">Reingreso</Link> (HU-16).
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-2">
            Al presentar, el sistema sella la fecha y hora exacta del acto (art. 54 LOPSRM) y la estimación
            queda <strong>presentada</strong>; arranca el plazo de revisión de 15 días naturales para que la
            supervisión y la residencia la revisen y autoricen (HU-15).
          </p>
        </>
      )}

      <SeccionCriterios
        huId="HU-13"
        criterios={[
          { numero: 1, texto: 'El contratista presenta la estimación integrada; quedan registradas la fecha y hora exacta de la presentación (art. 54 LOPSRM).' },
          { numero: 2, texto: 'Solo se puede presentar una estimación en estado integrada; una vez presentada no se vuelve a presentar (folio inmutable).' },
          { numero: 3, texto: 'Al presentarse, inicia el plazo de revisión/autorización de 15 días naturales (supervisión + residencia, HU-15), mostrado como semáforo derivado de la fecha de presentación.' }
        ]}
      />

      <p className="mt-4 text-xs text-slate-500 italic text-center">
        Fundamento: art. 54 LOPSRM (6 días para presentar + 15 días de revisión/autorización + pago).
      </p>
    </div>
  );
}
