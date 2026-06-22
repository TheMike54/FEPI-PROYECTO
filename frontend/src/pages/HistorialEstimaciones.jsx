import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { descargarExcelHoja } from '../services/excelExport.js';
import LinkHU from '../components/LinkHU.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import PestanasCiclo from '../components/PestanasCiclo.jsx';
import EncabezadoContrato from '../components/ui/EncabezadoContrato.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import BannerContratoActivo from '../components/BannerContratoActivo.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { labelEstadoEstimacion } from '../data/estadoEstimacion.js';
import { monedaMXN as moneda } from '../utils/formato.js';

// HU-14 (Equipo 3) — cableado al backend real. Historial del ciclo de cobro: todas
// las estimaciones del contrato (incl. rechazadas) en orden cronológico, con su estado
// y sus transiciones. La fuente de la verdad es el backend (GET historial); aquí solo
// se DERIVA el modelo de vista que ya consumía la UI (sin tocar su estructura).

// moneda: utilidad compartida (utils/formato.js)
// dd/mm/aaaa sin corrimiento de zona (parte de fecha de un ISO/Date). null si no hay.
const fechaMX = (iso) => {
  const p = (iso || '').slice(0, 10).split('-');
  return p.length === 3 && p[0] ? `${p[2]}/${p[1]}/${p[0]}` : null;
};
// Etiqueta de periodo "Abr 2026" a partir del inicio (agrupa el filtro por mes).
const fmtMes = new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const periodoLabel = (iso) => {
  const s = (iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '—';
  const txt = fmtMes.format(new Date(s + 'T00:00:00Z')).replace('.', '');
  return txt.charAt(0).toUpperCase() + txt.slice(1);
};

// Estados reales del ciclo (schema: integrada→enviada→autorizada→pagada|rechazada).
const ESTADO_CLASE = {
  integrada:  'bg-sigecop-blue-light text-sigecop-blue',
  enviada:    'bg-aviso-bg text-aviso',
  autorizada: 'bg-exito-bg text-exito',
  pagada:     'bg-exito-bg text-exito',
  rechazada:  'bg-peligro-bg text-peligro'
};
function EstadoBadge({ estado }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${ESTADO_CLASE[estado] || 'bg-slate-200 text-slate-600'}`}>
      {labelEstadoEstimacion(estado)}
    </span>
  );
}

function FilaDetalle({ label, valor }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
        {label}
      </div>
      <div className="text-sm text-slate-900 mt-0.5">{valor ?? <span className="text-slate-400 italic">—</span>}</div>
    </div>
  );
}

// Drawer lateral con el expediente compacto de la estimación seleccionada.
function PanelDetalle({ estimacion, onCerrar }) {
  if (!estimacion) return null;
  return (
    <div className="fixed inset-0 z-50 flex" data-testid={`panel-detalle-estimacion-${estimacion.id}`}>
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onCerrar}
        data-testid="panel-detalle-backdrop"
      />
      <div className="relative ml-auto w-full max-w-md h-full bg-white shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-borde">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Expediente
            </div>
            <h3 className="text-lg font-bold text-sigecop-blue">
              {estimacion.estimacion} · {estimacion.version}
            </h3>
          </div>
          <button
            type="button"
            className="text-slate-500 hover:text-slate-800 text-xl leading-none"
            onClick={onCerrar}
            data-testid="btn-cerrar-detalle"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="p-5 space-y-4">
          <FilaDetalle label="Periodo" valor={estimacion.periodo} />
          <FilaDetalle
            label="Estado"
            valor={<EstadoBadge estado={estimacion.estado} />}
          />
          <FilaDetalle label="Importe" valor={estimacion.importe} />
          <FilaDetalle label="Fecha de presentación" valor={estimacion.fechaPresentacion} />
          <FilaDetalle label="Fecha de revisión" valor={estimacion.fechaRevision} />
          <FilaDetalle label="Fecha de pago" valor={estimacion.fechaPago} />

          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
              Observaciones
            </div>
            {estimacion.observaciones.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                Sin observaciones registradas para esta versión.
              </p>
            ) : (
              <ul className="list-disc list-inside text-sm text-slate-800 space-y-1">
                {estimacion.observaciones.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Exporta las filas filtradas a un .xlsx real usando exceljs.
function exportarHistorialExcel(filas, folioContrato) {
  const datos = filas.map((f) => ({
    Estimación: f.estimacion,
    Versión: f.version,
    Periodo: f.periodo,
    Estado: labelEstadoEstimacion(f.estado),
    Importe: f.importe,
    'Fecha presentación': f.fechaPresentacion ?? '',
    'Fecha revisión':     f.fechaRevision     ?? '',
    'Fecha pago':         f.fechaPago         ?? ''
  }));
  descargarExcelHoja(`historial_${folioContrato}.xlsx`, 'Historial', datos);
}

// Convierte una estimación del backend (carátula + transiciones) al modelo de vista que
// ya consumían la tabla y el panel. Opción A: el ciclo se modela con COLUMNAS de
// `estimaciones`. La línea de tiempo se deriva de e.transiciones; hoy solo existe el
// evento de integración, así que revisión/pago quedan en null hasta que HU-13/15/21
// añadan sus columnas (el backend ya tiene el punto de extensión marcado).
function aVistaHistorial(e) {
  const trans = Array.isArray(e.transiciones) ? e.transiciones : [];
  const revision = [...trans].reverse().find((t) => t.estado === 'autorizada' || t.estado === 'rechazada');
  const pago = trans.find((t) => t.estado === 'pagada');
  return {
    id: e.id,
    estimacion: `EST-${String(e.numero).padStart(3, '0')}`,
    version: '—', // el modelo real no versiona: una corrección es un registro nuevo (futuro)
    periodo: periodoLabel(e.periodo_inicio),
    estado: e.estado,
    importe: moneda(e.neto),
    fechaPresentacion: e.enviada_en ? fechaMX(e.enviada_en) : '—', // HU-14 (22-jun): la "Fecha de presentación" es la del envío real (enviada_en); '—' si aún no se ha presentado
    fechaRevision: revision ? fechaMX(revision.en) : null,
    fechaPago: pago ? fechaMX(pago.en) : null,
    observaciones: [] // HU-15: estimacion_observaciones — no se fabrican datos hasta que exista
  };
}

export default function HistorialEstimaciones() {
  const { token } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [cargando, setCargando] = useState(false);
  const [historial, setHistorial] = useState([]);

  const [periodo, setPeriodo] = useState('Todos');
  const [estado, setEstado] = useState('Todos');
  const [seleccionada, setSeleccionada] = useState(null);

  const selected = useMemo(() => contratos.find((c) => String(c.id) === String(contratoId)) || null, [contratos, contratoId]);

  // Carga inicial: contratos del usuario (acotados por el backend).
  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id);
    setHistorial([]); setSeleccionada(null); setPeriodo('Todos'); setEstado('Todos');
    if (!id) return;
    setCargando(true);
    try {
      const data = await api.historialEstimaciones(id);
      setHistorial(Array.isArray(data) ? data.map(aVistaHistorial) : []);
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso al historial de este contrato' : 'No se pudo cargar el historial de estimaciones');
      setHistorial([]);
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  const [searchParams] = useSearchParams();
  const contratoQuery = searchParams.get('contrato');
  // B6b/A-3A: preselecciona el contrato del ?contrato=ID (consistencia entre pantallas).
  useEffect(() => {
    if (sinSesion || !contratoQuery || contratoId) return;
    if (contratos.some((c) => String(c.id) === String(contratoQuery))) seleccionarContrato(String(contratoQuery));
  }, [sinSesion, contratoQuery, contratoId, contratos, seleccionarContrato]);

  // Opciones de filtro DERIVADAS de los datos (no de un dummy fijo).
  const periodosOpts = useMemo(
    () => ['Todos', ...Array.from(new Set(historial.map((h) => h.periodo)))],
    [historial]
  );
  const estadosOpts = useMemo(
    () => ['Todos', ...Array.from(new Set(historial.map((h) => h.estado)))],
    [historial]
  );

  const filas = useMemo(() => {
    return historial.filter((h) => {
      if (periodo !== 'Todos' && h.periodo !== periodo) return false;
      if (estado !== 'Todos' && h.estado !== estado) return false;
      return true;
    });
  }, [historial, periodo, estado]);

  const handleExportar = () => exportarHistorialExcel(filas, selected ? selected.folio : 'contrato');

  return (
    <div>
      <HeaderVista
        huId="HU-14"
        titulo="Historial de estimaciones del contrato"
        sprint="Sprint 5"
        rolAcademico="Residente"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Estimaciones' },
          { label: 'Historial' }
        ]}
      />

      <PestanasCiclo ciclo="estimacion" activo="historial" />

      {sinSesion && (
        <div className="bg-pagina border border-borde rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión en modo aplicación para consultar el historial de estimaciones.
        </div>
      )}

      {/* 3A·P3: hereda el contrato activo global en vez de re-seleccionarlo */}
      <BannerContratoActivo seleccionar={seleccionarContrato} contratoId={contratoId} />

      {!sinSesion && !contratoId && (
        <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para ver el historial de sus estimaciones.</p>
      )}
      {cargando && <p className="text-sm text-slate-500 mb-4">Cargando historial…</p>}

      {selected && (
        <>
          <EncabezadoContrato
            titulo="Contrato"
            folio={selected.folio}
            items={[{ value: selected.contratista || '—' }]}
          />

          <div className="bg-white border border-borde rounded-lg p-5 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="sg-label">Periodo</label>
                <select
                  className="sg-input"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  data-testid="he-periodo"
                >
                  {periodosOpts.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="sg-label">Estado</label>
                <select
                  className="sg-input"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  data-testid="he-estado"
                >
                  {estadosOpts.map((s) => <option key={s} value={s}>{s === 'Todos' ? 'Todos' : labelEstadoEstimacion(s)}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-borde rounded-lg overflow-hidden">
            <div className="px-6 py-3 border-b border-borde flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Resultados ({filas.length})
              </h2>
              <button
                type="button"
                className="sg-btn-secondary"
                onClick={handleExportar}
                data-testid="btn-exportar-historial"
              >
                ⬇ Exportar historial
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="tabla-historial">
                <thead className="bg-pagina text-tinta-sec">
                  <tr>
                    <th className="text-left p-3 font-semibold">Estimación</th>
                    <th className="text-left p-3 font-semibold">Periodo</th>
                    <th className="text-center p-3 font-semibold">Versión</th>
                    <th className="text-center p-3 font-semibold">Estado</th>
                    <th className="text-right p-3 font-semibold">Importe</th>
                    <th className="text-left p-3 font-semibold">Fecha de presentación</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center">
                        {historial.length === 0 ? (
                          <div className="max-w-md mx-auto">
                            <p className="text-sm text-slate-600 font-medium">
                              Este contrato aún no tiene estimaciones registradas.
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Las estimaciones se incorporan al historial al integrarlas en el ciclo de estimación.
                            </p>
                            <LinkHU
                              hu="HU-12"
                              to={`/estimaciones/integracion${contratoId ? `?contrato=${contratoId}` : ''}`}
                              className="sg-btn-secondary inline-block mt-3"
                            >
                              Integrar estimación →
                            </LinkHU>
                          </div>
                        ) : (
                          <div className="max-w-md mx-auto">
                            <p className="text-sm text-slate-600 font-medium">
                              Ninguna estimación coincide con los filtros aplicados.
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Ajusta el periodo o el estado para ver más resultados. Sí hay estimaciones en este contrato.
                            </p>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filas.map((h) => (
                      <tr
                        key={h.id}
                        className="border-t border-borde hover:bg-sigecop-blue-light cursor-pointer"
                        data-testid={`fila-historial-${h.id}`}
                        onClick={() => setSeleccionada(h)}
                      >
                        <td className="p-3 font-mono text-xs">{h.estimacion}</td>
                        <td className="p-3">{h.periodo}</td>
                        <td className="p-3 text-center font-semibold">{h.version}</td>
                        <td className="p-3 text-center"><EstadoBadge estado={h.estado} /></td>
                        <td className="p-3 text-right font-semibold">{h.importe}</td>
                        <td className="p-3">{h.fechaPresentacion ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Click en una fila para ver el expediente compacto. El historial conserva todas las
            estimaciones del ciclo de cobro, incluyendo las rechazadas, para fiscalización y trazabilidad.
          </p>
        </>
      )}

      <PanelDetalle estimacion={seleccionada} onCerrar={() => setSeleccionada(null)} />

      <SeccionCriterios
        huId="HU-14"
        criterios={[
          { numero: 1, texto: 'El historial muestra todas las estimaciones del contrato en orden cronológico, incluyendo las versiones rechazadas.' },
          { numero: 2, texto: 'Los filtros permiten consultar por periodo, estado o ambos combinados (lógica Y).' },
          { numero: 3, texto: 'Cada estimación del historial puede abrirse para ver su expediente completo.' }
        ]}
      />
    </div>
  );
}
