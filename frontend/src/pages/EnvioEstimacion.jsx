import { useState, useEffect, useMemo, useCallback } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { labelEstadoEstimacion } from '../data/estadoEstimacion.js';

// HU-13 (O7) — REVISIÓN Y AUTORIZACIÓN de la estimación por la RESIDENCIA. El profe CONFIRMÓ invertir
// el flujo (art. 54 LOPSRM): el CONTRATISTA PRESENTA (HU-12, estado interno 'integrada' = "Presentada");
// la RESIDENCIA REVISA y AUTORIZA aquí (estado interno 'enviada' = "Autorizada", reusando el sello
// enviada_en/por). SIN migrar datos: el backend conserva la transición integrada->enviada y solo cambia
// el candado de actor (superintendente -> RESIDENTE) y las etiquetas. La verdad del dinero vive en HU-12.
//
// Plazos art. 54 LOPSRM como REFERENCIA VISUAL (NO bloqueantes en esta fase):
//   · Presentación: el contratista presenta dentro de 6 días naturales del corte del periodo (informativo).
//   · Autorización: la residencia autoriza dentro de 15 días naturales DESDE LA PRESENTACIÓN (integrada_en).
//   · Pago: finanzas paga dentro de 20 días naturales DESDE LA AUTORIZACIÓN (enviada_en) — informativo aquí.

const PLAZO_AUTORIZACION_DIAS = 15; // residencia autoriza (desde la presentación)
const PLAZO_PRESENTACION_DIAS = 6;  // contratista presenta (desde el corte) — informativo
const PLAZO_PAGO_DIAS = 20;         // finanzas paga (desde la autorización) — informativo

const fmtMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneda = (n) => fmtMXN.format(Number(n) || 0);

// dd/mm/aaaa hh:mm a partir de un ISO/Date (acuse de autorización). null si no hay.
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
  enviada:    'bg-green-100 text-sigecop-green-validation',
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
  const [autorizandoId, setAutorizandoId] = useState(null);

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

  // O7: AUTORIZAR (reusa POST /enviar; el backend sella enviada_en/por como sello de autorización).
  const handleAutorizar = useCallback(async (est) => {
    if (soloLectura || autorizandoId) return;
    setAutorizandoId(est.id);
    try {
      const res = await api.enviarEstimacion(est.id);
      setEstimaciones((prev) => prev.map((e) => (
        e.id === est.id ? { ...e, estado: res.estado, enviada_en: res.enviada_en, enviada_por: res.enviada_por } : e
      )));
      showToast(`Estimación N.º ${est.numero} autorizada. Inicia el plazo de pago (20 días, art. 54 LOPSRM).`);
    } catch (e) {
      const msg = e.status === 409 ? (e.message || 'La estimación no se puede autorizar en su estado actual')
        : e.status === 403 ? 'Solo el residente del contrato puede revisar y autorizar sus estimaciones'
        : 'No se pudo autorizar la estimación';
      showToast(msg);
      cargarEstimaciones(contratoId);
    } finally {
      setAutorizandoId(null);
    }
  }, [soloLectura, autorizandoId, showToast, cargarEstimaciones, contratoId]);

  const autorizables = useMemo(() => estimaciones.filter((e) => e.estado === 'integrada'), [estimaciones]);

  return (
    <div>
      <HeaderVista
        huId="HU-13"
        titulo="Revisión y autorización de la estimación"
        sprint="Sprint 8"
        rolAcademico="Residente"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Estimaciones' },
          { label: 'Revisión y autorización' }
        ]}
      />

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión para revisar y autorizar estimaciones.
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
        <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para revisar las estimaciones presentadas.</p>
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
                {!soloLectura && autorizables.length > 0 && (
                  <span className="ml-2 font-normal normal-case text-slate-500">
                    · {autorizables.length} por autorizar
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
                        Este contrato no tiene estimaciones presentadas todavía.
                      </td>
                    </tr>
                  ) : (
                    estimaciones.map((e) => {
                      // 'integrada' (Presentada): plazo de AUTORIZACIÓN (15 días desde la presentación).
                      const semAut = e.estado === 'integrada' ? semaforo(e.integrada_en, PLAZO_AUTORIZACION_DIAS) : null;
                      // 'enviada' (Autorizada): plazo de PAGO (20 días desde la autorización) — informativo.
                      const semPago = e.estado === 'enviada' ? semaforo(e.enviada_en, PLAZO_PAGO_DIAS) : null;
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
                                      ? `Presentada dentro de los ${PLAZO_PRESENTACION_DIAS} días del corte (art. 54).`
                                      : `Presentada fuera de los ${PLAZO_PRESENTACION_DIAS} días del corte (hace ${pres.transcurridos} días, art. 54).`}
                                  </div>
                                )}
                                {semAut && (
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${SEMAFORO_CLASE[semAut.nivel]}`}>
                                    {semAut.nivel === 'vencido'
                                      ? `Autorización: día ${semAut.transcurridos} de ${PLAZO_AUTORIZACION_DIAS} · plazo vencido`
                                      : `Autorización: día ${semAut.transcurridos} de ${PLAZO_AUTORIZACION_DIAS} · ${semAut.restantes} días restantes`}
                                  </span>
                                )}
                                {!soloLectura && (
                                  <button
                                    type="button"
                                    className="sg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed block"
                                    onClick={() => handleAutorizar(e)}
                                    disabled={autorizandoId === e.id}
                                    data-testid={`btn-autorizar-${e.id}`}
                                  >
                                    {autorizandoId === e.id ? 'Autorizando…' : 'Autorizar estimación'}
                                  </button>
                                )}
                              </div>
                            )}

                            {e.estado === 'enviada' && (
                              <div className="space-y-1" data-testid={`sello-autorizacion-${e.id}`}>
                                <div className="text-xs text-slate-600">
                                  ✓ Autorizada el {fechaHoraMX(e.enviada_en) || '—'}
                                </div>
                                {semPago && (
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${SEMAFORO_CLASE[semPago.nivel]}`}>
                                    {semPago.nivel === 'vencido'
                                      ? `Pago: día ${semPago.transcurridos} de ${PLAZO_PAGO_DIAS} · plazo vencido`
                                      : `Pago: día ${semPago.transcurridos} de ${PLAZO_PAGO_DIAS} · ${semPago.restantes} días restantes`}
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
            Al autorizar, el sistema sella la fecha y hora exacta del acto (art. 54 LOPSRM) y la estimación
            queda <strong>autorizada</strong> y disponible para pago (finanzas, HU-21). El plazo de pago de 20
            días naturales se cuenta desde esta fecha de autorización.
          </p>
        </>
      )}

      <SeccionCriterios
        huId="HU-13"
        criterios={[
          { numero: 1, texto: 'La residencia revisa la estimación presentada por el contratista y la autoriza; quedan registradas la fecha y hora exacta de la autorización (art. 54 LOPSRM).' },
          { numero: 2, texto: 'Solo se puede autorizar una estimación en estado presentada; una vez autorizada no se vuelve a autorizar (folio inmutable).' },
          { numero: 3, texto: 'Al autorizarse, inicia el plazo de pago de 20 días naturales (finanzas, art. 54 LOPSRM), mostrado como semáforo derivado de la fecha de autorización.' }
        ]}
      />

      <p className="mt-4 text-xs text-slate-500 italic text-center">
        Fundamento: art. 54 LOPSRM (6 días presentación + 15 días autorización por la residencia + 20 días pago).
      </p>
    </div>
  );
}
