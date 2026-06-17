import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { monedaMXN as moneda } from '../utils/formato.js';

// FASE 5 (revisión profe 16-jun) — AMBIENTE DE ESTIMACIÓN como FLUJO POR BLOQUES (tipo el alta).
// El profe: "están ocupando una interfaz para muchas cosas… aíslalo en un contexto donde estás en la 4…
// empiezas por los generadores… te dan el resumen… la carátula te dice lo que vas a cobrar… adjunta los
// soportes, las notas… cerrar, candadito, ¿seguro?… a revisión. El historial va aparte."
//
// CASCARÓN: este ambiente ENVUELVE el cálculo y el flujo existentes (NO los reescribe). La carátula viva
// la calcula el backend (GET /api/estimacion-prep, la MISMA que usa HU-12); aquí solo se muestra. El bloque
// de GENERADORES es un PLACEHOLDER hasta que el Equipo 3 entregue su captura; mientras tanto, la integración
// y el envío reales siguen en HU-12 (Integración) y HU-13 (Presentación), a los que este ambiente enlaza.
// El historial/resumen NO vive aquí: es HU-14 (otra pantalla), como pidió el profe.

const soloFecha = (s) => (s ? String(s).slice(0, 10) : '');
const ddmm = (s) => { const p = soloFecha(s).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}` : '—'; };

// Cabecera de cada bloque del wizard (numerada, tipo el alta). `estado`: activo | pendiente | listo.
function Bloque({ n, titulo, estado = 'activo', children, pendienteE3 = false }) {
  const color = pendienteE3 ? 'border-amber-300' : estado === 'listo' ? 'border-sigecop-green-validation' : 'border-borde';
  return (
    <section className={`bg-white border ${color} rounded-lg overflow-hidden`} data-testid={`bloque-est-${n}`}>
      <div className="px-5 py-3 bg-pagina border-b border-borde flex items-center gap-3">
        <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${pendienteE3 ? 'bg-amber-100 text-amber-800' : 'bg-guinda-soft text-guinda'}`}>{n}</span>
        <h2 className="text-base font-medium text-tinta">{titulo}</h2>
        {pendienteE3 && <span className="ml-auto text-[11px] uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded" data-testid={`pendiente-e3-${n}`}>Pendiente · Equipo 3</span>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function AmbienteEstimacion() {
  const { token } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [periodos, setPeriodos] = useState([]);
  const [periodoNum, setPeriodoNum] = useState('');
  const [prep, setPrep] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [cerrarConfirmado, setCerrarConfirmado] = useState(false);

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id); setPeriodos([]); setPeriodoNum(''); setPrep(null); setCerrarConfirmado(false);
    if (!id) return;
    try {
      const pr = await api.leerProgramaObra(id);
      setPeriodos(Array.isArray(pr?.periodos) ? pr.periodos : []);
    } catch (_) { setPeriodos([]); }
  }, []);

  const seleccionarPeriodo = useCallback(async (num) => {
    setPeriodoNum(num); setPrep(null); setCerrarConfirmado(false);
    const per = periodos.find((p) => String(p.numero) === String(num));
    if (!contratoId || !per) return;
    setCargando(true);
    try {
      // Reusa la MISMA carátula viva que HU-12 (no se recalcula aquí).
      setPrep(await api.preparacionEstimacion(contratoId, soloFecha(per.fin)));
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a este contrato' : 'No se pudo cargar la carátula');
    } finally { setCargando(false); }
  }, [contratoId, periodos, showToast]);

  const av = prep?.avance || {};
  const disponibles = Array.isArray(prep?.conceptos) ? prep.conceptos.filter((c) => Number(c.disponible_periodo) > 0).length : 0;

  return (
    <div className="space-y-4">
      <HeaderVista
        huId="HU-12"
        titulo="Ambiente de estimación (flujo por bloques)"
        sprint="Sprint 9"
        rolAcademico="Contratista"
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Estimaciones' }, { label: 'Nueva estimación' }]}
      />

      <div className="bg-sigecop-blue-light border-l-4 border-sigecop-blue px-4 py-3 rounded-r-md text-sm text-slate-700" data-testid="ambiente-cascaron-aviso">
        <strong>Ambiente aislado de una estimación</strong>, por bloques (como el alta). La carátula la calcula
        el sistema automáticamente. El <strong>bloque de generadores</strong> está pendiente del Equipo 3; mientras
        tanto, la integración y el envío reales se hacen en sus pantallas (enlazadas en el último bloque). El
        <strong> historial</strong> de estimaciones vive aparte (su propia pantalla).
      </div>

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm text-slate-600">
          Inicia sesión para armar una estimación.
        </div>
      )}

      {/* BLOQUE 1 — Nueva estimación: contrato + periodo. */}
      <Bloque n={1} titulo="Nueva estimación — contrato y periodo" estado={periodoNum ? 'listo' : 'activo'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
          <div>
            <label className="sg-label">Contrato</label>
            <select className="sg-input" value={contratoId} onChange={(e) => seleccionarContrato(e.target.value)} disabled={sinSesion} data-testid="select-contrato">
              <option value="">— Selecciona un contrato —</option>
              {contratos.map((c) => <option key={c.id} value={c.id}>{c.folio} · {c.objeto}</option>)}
            </select>
          </div>
          <div>
            <label className="sg-label">Periodo a estimar</label>
            <select className="sg-input" value={periodoNum} onChange={(e) => seleccionarPeriodo(e.target.value)} disabled={!contratoId || periodos.length === 0} data-testid="select-periodo">
              <option value="">— Selecciona el periodo —</option>
              {periodos.map((p) => <option key={p.numero} value={p.numero}>Periodo {p.numero} ({ddmm(p.inicio)}–{ddmm(p.fin)})</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">El número de estimación lo asigna el sistema al integrar (no se teclea); las fechas salen del periodo elegido.</p>
      </Bloque>

      {/* BLOQUE 2 — Generadores (PLACEHOLDER E3). */}
      <Bloque n={2} titulo="Números generadores por concepto" pendienteE3>
        <p className="text-sm text-slate-700">
          Aquí se capturan los <strong>números generadores</strong> de cada concepto (la medición que respalda
          lo ejecutado en el periodo). Al terminar, arman el <strong>concentrado</strong> que alimenta la carátula.
        </p>
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-3" data-testid="generadores-placeholder">
          ⏳ <strong>Pendiente del Equipo 3.</strong> Cuando entreguen su captura de generadores, este bloque se
          cablea aquí (la estructura del ambiente ya está lista). Por ahora, las cantidades se capturan en la
          pantalla de Integración (HU-12).
        </p>
      </Bloque>

      {/* BLOQUE 3 — Carátula automática (LA EXISTENTE, read-only). */}
      <Bloque n={3} titulo="Carátula automática" estado={prep ? 'listo' : 'activo'}>
        {!prep ? (
          <p className="text-sm text-slate-400 italic">Selecciona contrato y periodo para ver la carátula que calcula el sistema.</p>
        ) : (
          <div data-testid="caratula-automatica">
            <p className="text-xs text-slate-500 mb-3">
              La carátula la calcula el sistema (la misma del flujo de integración): avance físico/programado/
              financiero y el anticipo a amortizar. El detalle de subtotal, amortización, 5 al millar y neto lo
              materializa el backend al integrar (no se recalcula aquí).
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><div className="text-xs text-slate-500">Avance físico</div><div className="font-semibold">{av.fisico_pct == null ? '—' : `${av.fisico_pct}%`}</div></div>
              <div><div className="text-xs text-slate-500">Programado</div><div className="font-semibold">{av.planeado_pct == null ? '—' : `${av.planeado_pct}%`}</div></div>
              <div><div className="text-xs text-slate-500">Financiero</div><div className="font-semibold">{av.financiero_pct == null ? '—' : `${av.financiero_pct}%`}</div></div>
              <div><div className="text-xs text-slate-500">Anticipo a amortizar</div><div className="font-semibold">{moneda(prep.contrato?.importe_anticipo)}</div></div>
            </div>
            <p className="text-xs text-slate-500 mt-2" data-testid="caratula-disponibles">{disponibles} concepto(s) con cantidad disponible para estimar en este periodo (art. 118).</p>
          </div>
        )}
      </Bloque>

      {/* BLOQUE 4 — Complementar. */}
      <Bloque n={4} titulo="Complementar datos de la estimación">
        <p className="text-sm text-slate-700">Cuánto se ha estimado, cuánto falta y cuánto es de este periodo: el sistema lo completa con la carátula. Los ajustes manuales (deductivas, observaciones) se complementan en la integración.</p>
      </Bloque>

      {/* BLOQUE 5 — Soportes / notas / fotos. */}
      <Bloque n={5} titulo="Soportes, notas de bitácora y registro fotográfico">
        <ul className="text-sm text-slate-700 list-disc list-inside space-y-1">
          <li><strong>Notas de bitácora:</strong> se vinculan las notas firmadas del periodo (ya disponible en el flujo de integración).</li>
          <li className="text-amber-800"><strong>Soportes y registro fotográfico:</strong> <span data-testid="soportes-placeholder">⏳ pendiente del Equipo 3</span> (estructura lista para cablear).</li>
        </ul>
      </Bloque>

      {/* BLOQUE 6 — Cierre con candado. */}
      <Bloque n={6} titulo="Cierre de la estimación (candado de confirmación)">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={cerrarConfirmado} onChange={(e) => setCerrarConfirmado(e.target.checked)} disabled={!prep} data-testid="check-cierre" />
          ¿Seguro que vas a cerrar esta estimación? (revisa que generadores, carátula y soportes estén completos)
        </label>
      </Bloque>

      {/* BLOQUE 7 — Envío a revisión (DELEGA al flujo real). */}
      <Bloque n={7} titulo="Envío a revisión">
        <p className="text-sm text-slate-700 mb-3">
          Con la estimación cerrada se <strong>integra</strong> y luego se <strong>presenta a revisión</strong> (no a
          pago directo). Mientras el bloque de generadores llega del Equipo 3, estas dos acciones se realizan en sus
          pantallas; este ambiente las envuelve y las enlaza:
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/estimaciones/integracion" className={`sg-btn-primary ${cerrarConfirmado && prep ? '' : 'pointer-events-none opacity-50'}`} data-testid="link-integrar">
            Integrar la estimación (HU-12) →
          </Link>
          <Link to="/estimaciones/envio" className="sg-btn-secondary" data-testid="link-presentar">
            Presentar a revisión (HU-13) →
          </Link>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Una estimación se presenta <strong>una sola vez</strong>; ya presentada/autorizada no se vuelve a presentar
          (candado por estado). El <strong>historial</strong> de estimaciones está en su propia pantalla.
        </p>
      </Bloque>
    </div>
  );
}
