import { useState, useEffect, useMemo, useCallback } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// HU-13 (Equipo 3) — cableado al backend real. ENVÍO de la estimación: el superintendente
// (rol 'E') envía una estimación 'integrada'; el backend sella enviada_en/por y avanza el
// estado a 'enviada' (POST /estimaciones-ciclo/estimacion/:id/enviar). La fuente de la verdad
// es el backend; aquí NO se calcula dinero ni se fabrican datos.
//
// Art. 54 LOPSRM: el envío ARRANCA el plazo de revisión (15 días naturales). El semáforo se
// DERIVA en lectura desde enviada_en (no hay contador persistido). El plazo de PRESENTACIÓN
// (6 días tras el corte del periodo) se muestra como indicador informativo; el bloqueo duro
// vs alerta es decisión Nivel 1 [a confirmar con el profe], por eso no veta el envío aquí.

const PLAZO_REVISION_DIAS = 15;   // art. 54: revisión de supervisión
const PLAZO_PRESENTACION_DIAS = 6; // art. 54: presentación tras el corte (informativo)

const fmtMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneda = (n) => fmtMXN.format(Number(n) || 0);

// dd/mm/aaaa hh:mm a partir de un ISO/Date (acuse de envío). null si no hay.
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
  enviada:    'bg-amber-100 text-sigecop-amber-attention',
  autorizada: 'bg-green-100 text-sigecop-green-validation',
  pagada:     'bg-green-100 text-sigecop-green-validation',
  rechazada:  'bg-red-100 text-red-700'
};
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function EstadoBadge({ estado }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${ESTADO_CLASE[estado] || 'bg-slate-200 text-slate-600'}`}>
      {cap(estado)}
    </span>
  );
}

const MS_DIA = 86400000;
// Semáforo DERIVADO del sello de envío (art. 54: 15 días naturales de revisión).
function semaforoRevision(enviadaEnIso) {
  if (!enviadaEnIso) return null;
  const inicio = new Date(enviadaEnIso);
  if (Number.isNaN(inicio.getTime())) return null;
  const transcurridos = Math.max(0, Math.floor((Date.now() - inicio.getTime()) / MS_DIA));
  const restantes = PLAZO_REVISION_DIAS - transcurridos;
  let nivel = 'ok';
  if (restantes <= 0) nivel = 'vencido';
  else if (restantes <= 5) nivel = 'alerta';
  return { transcurridos, restantes, nivel };
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
  const [enviandoId, setEnviandoId] = useState(null);

  const selected = useMemo(() => contratos.find((c) => String(c.id) === String(contratoId)) || null, [contratos, contratoId]);

  // Carga inicial: contratos del usuario (acotados por el backend).
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

  const handleEnviar = useCallback(async (est) => {
    if (soloLectura || enviandoId) return;
    setEnviandoId(est.id);
    try {
      const res = await api.enviarEstimacion(est.id);
      // Refleja el sello que devolvió el backend (fuente única de la verdad).
      setEstimaciones((prev) => prev.map((e) => (
        e.id === est.id ? { ...e, estado: res.estado, enviada_en: res.enviada_en, enviada_por: res.enviada_por } : e
      )));
      showToast(`Estimación N.º ${est.numero} enviada. Inicia el plazo de revisión (art. 54 LOPSRM).`);
    } catch (e) {
      const msg = e.status === 409 ? (e.message || 'La estimación no se puede enviar en su estado actual')
        : e.status === 403 ? 'Solo el superintendente del contrato puede enviar sus estimaciones'
        : 'No se pudo enviar la estimación';
      showToast(msg);
      // Re-sincroniza por si el estado cambió en el servidor (p. ej. ya estaba enviada).
      cargarEstimaciones(contratoId);
    } finally {
      setEnviandoId(null);
    }
  }, [soloLectura, enviandoId, showToast, cargarEstimaciones, contratoId]);

  const enviables = useMemo(() => estimaciones.filter((e) => e.estado === 'integrada'), [estimaciones]);

  return (
    <div>
      <HeaderVista
        huId="HU-13"
        titulo="Envío de la estimación"
        sprint="Sprint 8"
        rolAcademico="Contratista"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Estimaciones' },
          { label: 'Envío' }
        ]}
      />

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión para enviar estimaciones.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-md p-4 mb-6 max-w-2xl">
        <label className="sg-label">Contrato</label>
        <select
          className="sg-input"
          value={contratoId}
          onChange={(e) => seleccionarContrato(e.target.value)}
          disabled={sinSesion}
          data-testid="select-contrato"
        >
          <option value="">— Selecciona un contrato —</option>
          {contratos.map((c) => <option key={c.id} value={c.id}>{c.folio} · {c.objeto}</option>)}
        </select>
      </div>

      {!sinSesion && !contratoId && (
        <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para ver sus estimaciones por enviar.</p>
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
                {!soloLectura && enviables.length > 0 && (
                  <span className="ml-2 font-normal normal-case text-slate-500">
                    · {enviables.length} por enviar
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
                      const sem = semaforoRevision(e.enviada_en);
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
                              <div className="space-y-2">
                                {pres && (
                                  <div className={`text-xs ${pres.dentro ? 'text-slate-500' : 'text-sigecop-amber-attention'}`}>
                                    {pres.dentro
                                      ? `Dentro del periodo de presentación (art. 54: ${PLAZO_PRESENTACION_DIAS} días desde el corte).`
                                      : `Fuera del periodo de presentación de ${PLAZO_PRESENTACION_DIAS} días (corte hace ${pres.transcurridos} días, art. 54).`}
                                  </div>
                                )}
                                {!soloLectura && (
                                  <button
                                    type="button"
                                    className="sg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleEnviar(e)}
                                    disabled={enviandoId === e.id}
                                    data-testid={`btn-enviar-${e.id}`}
                                  >
                                    {enviandoId === e.id ? 'Enviando…' : 'Enviar estimación'}
                                  </button>
                                )}
                              </div>
                            )}

                            {e.estado === 'enviada' && (
                              <div className="space-y-1" data-testid={`semaforo-plazo-${e.id}`}>
                                <div className="text-xs text-slate-600" data-testid={`sello-envio-${e.id}`}>
                                  ✓ Enviada el {fechaHoraMX(e.enviada_en) || '—'}
                                </div>
                                {sem && (
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${SEMAFORO_CLASE[sem.nivel]}`}>
                                    {sem.nivel === 'vencido'
                                      ? `Revisión: día ${sem.transcurridos} de ${PLAZO_REVISION_DIAS} · plazo vencido`
                                      : `Revisión: día ${sem.transcurridos} de ${PLAZO_REVISION_DIAS} · ${sem.restantes} días restantes`}
                                  </span>
                                )}
                              </div>
                            )}

                            {!['integrada', 'enviada'].includes(e.estado) && (
                              <span className="text-xs text-slate-400 italic">—</span>
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
            Al enviar, el sistema sella la fecha y hora exacta del acuse (art. 54 LOPSRM) y la
            estimación queda como pendiente de revisión para residencia y supervisión. El conteo
            del plazo de revisión continúa en HU-15 tomando esta fecha de envío como inicio.
          </p>
        </>
      )}

      <SeccionCriterios
        huId="HU-13"
        criterios={[
          { numero: 1, texto: 'Al enviar la estimación quedan registradas la fecha y hora exacta de recepción; la estimación queda pendiente de revisión para residencia y supervisión.' },
          { numero: 2, texto: 'Solo se puede enviar una estimación en estado integrada; una vez enviada no se puede volver a enviar (folio inmutable).' },
          { numero: 3, texto: 'Al enviarse, inicia el plazo de revisión de 15 días naturales (supervisión, art. 54 LOPSRM), mostrado como semáforo derivado de la fecha de envío.' }
        ]}
      />

      <p className="mt-4 text-xs text-slate-500 italic text-center">
        Fundamento: art. 54 LOPSRM (6 días presentación + 15 días revisión + 5 días autorización + 20 días pago).
      </p>
    </div>
  );
}
