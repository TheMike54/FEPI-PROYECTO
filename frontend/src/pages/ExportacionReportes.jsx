import { useState, useEffect, useCallback } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU, useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { CATALOGO_REPORTES, PERIODOS_REPORTE, HANDLERS } from '../services/reportesContrato.js';

// HU-19 — Exportación de los 7 reportes definidos del contrato. Cableado a datos REALES
// (sin dummy). La generación (PDF/Excel) vive en services/reportesContrato.js y corre en el
// cliente; aquí solo se selecciona contrato + período y se cargan las fuentes por endpoint.

function BotonFormato({ reporteId, formato, disabled, onExport }) {
  const handler = HANDLERS[reporteId]?.[formato];
  return (
    <button
      type="button"
      className="sg-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={disabled || !handler}
      onClick={() => onExport(reporteId, formato)}
      data-testid={`btn-exportar-${reporteId}-${formato.toLowerCase()}`}
    >
      ⬇ {formato}
    </button>
  );
}

export default function ExportacionReportes() {
  const { soloLectura } = useVistaHU('HU-19');
  const { token } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [contrato, setContrato] = useState(null);
  const [periodo, setPeriodo] = useState(PERIODOS_REPORTE[0]);
  const [datos, setDatos] = useState(null); // { programa, trabajos, pagos, historial, prep, notas, convenios }
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id);
    setDatos(null); setError(null);
    const sel = contratos.find((c) => String(c.id) === String(id)) || null;
    setContrato(sel);
    if (!id) return;
    setCargando(true);
    try {
      // Fuentes acotadas por participación en el backend. Las que pueden faltar legítimamente
      // (bitácora sin aperturar, contrato sin convenios) se degradan a null/[] sin romper la vista.
      const [programa, trabajos, historial, prep] = await Promise.all([
        api.leerProgramaObra(id).catch(() => null),
        api.trabajosDeContrato(id).catch(() => null),
        api.historialEstimaciones(id).catch(() => []),
        api.preparacionEstimacion(id).catch(() => null)
      ]);
      const [pagos, notas, convenios] = await Promise.all([
        api.listarPagos(id).catch(() => []),
        api.notasDeContrato(id).catch(() => null), // 404 si no hay bitácora aperturada
        api.convenios(id).catch(() => null)
      ]);
      setDatos({ programa, trabajos, pagos, historial, prep, notas, convenios });
    } catch (e) {
      const msg = e.status === 403 ? 'No tienes acceso a este contrato' : (e.payload?.error || 'No se pudieron cargar los datos del contrato');
      setError(msg);
      showToast(msg);
    } finally {
      setCargando(false);
    }
  }, [contratos, showToast]);

  const exportar = useCallback((reporteId, formato) => {
    const handler = HANDLERS[reporteId]?.[formato];
    if (!handler || !contrato || !datos) return;
    try {
      handler(datos, contrato, periodo);
    } catch (e) {
      const msg = 'No se pudo generar el reporte';
      setError(msg);
      showToast(msg);
    }
  }, [contrato, datos, periodo, showToast]);

  const hayContrato = !!contrato && !!datos && !cargando && !error;
  const sinBitacora = !!datos && !datos.notas;

  // Un botón se deshabilita si: solo lectura, no hay contrato/datos, el reporte no tiene
  // fuente (4), o requiere bitácora y el contrato no la tiene aperturada (5).
  const botonDeshabilitado = (r) =>
    soloLectura || !hayContrato || !r.disponible || (r.requiereBitacora && sinBitacora);

  return (
    <div>
      <HeaderVista
        huId="HU-19"
        titulo="Exportación de reportes"
        sprint="Sprint 9"
        rolAcademico="Residente"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Reportes' }
        ]}
      />

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión en modo aplicación para exportar los reportes del contrato.
        </div>
      )}

      {/* Selector de contrato — fuente de todos los reportes. */}
      <div className="bg-white border border-slate-200 rounded-md p-4 mb-6 max-w-2xl">
        <label className="sg-label">Contrato</label>
        <select
          className="sg-input"
          value={contratoId}
          onChange={(e) => seleccionarContrato(e.target.value)}
          disabled={sinSesion}
          data-testid="select-contrato-reporte"
        >
          <option value="">— Selecciona un contrato —</option>
          {contratos.map((c) => <option key={c.id} value={c.id}>{c.folio} · {c.objeto}</option>)}
        </select>
      </div>

      {!sinSesion && !contratoId && (
        <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para exportar sus reportes.</p>
      )}
      {cargando && <p className="text-sm text-slate-500 mb-4">Cargando datos del contrato…</p>}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 mb-4 text-sm text-red-800 rounded-r-md" data-testid="banner-error">
          {error}
        </div>
      )}

      {hayContrato && (
        <BannerContexto
          variant="slate"
          folio={contrato.folio}
          folioLabel="Contrato"
          extra={[{ value: contrato.contratista || '—' }]}
        />
      )}

      {/* Selector de periodo — acota el rango de fechas donde aplica (CA-2). */}
      <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
          Periodo del reporte
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="sg-label">Periodo</label>
            <select
              className="sg-input"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              data-testid="select-periodo-reporte"
            >
              {PERIODOS_REPORTE.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center">
            <p className="text-xs text-slate-500">
              El periodo acota el rango de fechas incluido cuando aplica (avance físico,
              financiero, bitácora), pero no cambia el contenido predefinido del reporte (CA-2).
              Ancla: el dato más reciente del contrato (pendiente de confirmar).
            </p>
          </div>
        </div>
      </div>

      {/* Lista de reportes — los botones de exportar viven en RegionEditable (solo lectura los deshabilita). */}
      <RegionEditable disabled={soloLectura}>
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Reportes disponibles
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              7 reportes definidos por el alcance del proyecto. Cada botón genera el archivo real
              (PDF con jsPDF, Excel con exceljs) a partir de los datos del contrato seleccionado.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left p-3 font-semibold w-10">#</th>
                  <th className="text-left p-3 font-semibold">Reporte</th>
                  <th className="text-left p-3 font-semibold">Descripción</th>
                  <th className="text-left p-3 font-semibold w-56">Exportar</th>
                </tr>
              </thead>
              <tbody>
                {CATALOGO_REPORTES.map((r) => (
                  <tr key={r.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs">{r.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{r.nombre}</td>
                    <td className="p-3 text-slate-700">
                      {r.descripcion}
                      {!r.disponible && (
                        <span className="ml-2 inline-block text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          Sin fuente — depende de HU-15
                        </span>
                      )}
                      {r.disponible && r.requiereBitacora && sinBitacora && hayContrato && (
                        <span className="ml-2 inline-block text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
                          Sin bitácora aperturada
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {r.formatos.map((f) => (
                          <BotonFormato
                            key={f}
                            reporteId={r.id}
                            formato={f}
                            disabled={botonDeshabilitado(r)}
                            onExport={exportar}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </RegionEditable>

      <SeccionCriterios
        huId="HU-19"
        criterios={[
          { numero: 1, texto: 'Cada uno de los 7 reportes definidos genera un archivo descargable en el formato establecido (PDF, Excel o ambos según el reporte).' },
          { numero: 2, texto: 'El usuario puede seleccionar el periodo (mensual, trimestral, acumulado) sin alterar el contenido predefinido del reporte.' }
        ]}
      />
    </div>
  );
}
