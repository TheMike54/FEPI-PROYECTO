import { useState, useMemo } from 'react';
import { descargarExcelHoja } from '../services/excelExport.js';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import {
  contratoDummy,
  historialEstimacionesDummy,
  periodosHistorialDummy,
  estadosHistorialDummy
} from '../data/dummy.js';

function EstadoBadge({ estado }) {
  const map = {
    'Aceptada':   'bg-green-100 text-sigecop-green-validation',
    'Rechazada':  'bg-red-100 text-red-700',
    'En proceso': 'bg-amber-100 text-sigecop-amber-attention'
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${map[estado] || 'bg-slate-200 text-slate-600'}`}>
      {estado}
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
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
    Estado: f.estado,
    Importe: f.importe,
    'Fecha presentación': f.fechaPresentacion ?? '',
    'Fecha revisión':     f.fechaRevision     ?? '',
    'Fecha pago':         f.fechaPago         ?? ''
  }));
  descargarExcelHoja(`historial_${folioContrato}.xlsx`, 'Historial', datos);
}

export default function HistorialEstimaciones() {
  const [periodo, setPeriodo] = useState('Todos');
  const [estado, setEstado] = useState('Todos');
  const [seleccionada, setSeleccionada] = useState(null);

  const filas = useMemo(() => {
    return historialEstimacionesDummy.filter((h) => {
      if (periodo !== 'Todos' && h.periodo !== periodo) return false;
      if (estado !== 'Todos' && h.estado !== estado) return false;
      return true;
    });
  }, [periodo, estado]);

  const handleExportar = () => exportarHistorialExcel(filas, contratoDummy.folio);

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

      <BannerContexto
        variant="slate"
        titulo="Contrato"
        folio={contratoDummy.folio}
        extra={[{ value: contratoDummy.contratista }]}
      />

      <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
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
              {periodosHistorialDummy.map((p) => <option key={p}>{p}</option>)}
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
              {estadosHistorialDummy.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between">
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
            <thead className="bg-slate-50 text-slate-700">
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
                  <td colSpan="6" className="p-8 text-center text-slate-400 italic">
                    Sin estimaciones con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filas.map((h) => (
                  <tr
                    key={h.id}
                    className="border-t border-slate-200 hover:bg-sigecop-blue-light cursor-pointer"
                    data-testid={`fila-historial-${h.id}`}
                    onClick={() => setSeleccionada(h)}
                  >
                    <td className="p-3 font-mono text-xs">{h.estimacion}</td>
                    <td className="p-3">{h.periodo}</td>
                    <td className="p-3 text-center font-semibold">{h.version}</td>
                    <td className="p-3 text-center"><EstadoBadge estado={h.estado} /></td>
                    <td className="p-3 text-right font-semibold">{h.importe}</td>
                    <td className="p-3">{h.fechaPresentacion}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Click en una fila para ver el expediente compacto. El historial conserva todas las
        versiones del ciclo de cobro, incluyendo las rechazadas, para fiscalización y trazabilidad.
      </p>

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
