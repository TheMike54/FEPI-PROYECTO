import { useState, useMemo } from 'react';
import { useToast } from '../components/ui/Toast.jsx';
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

export default function HistorialEstimaciones() {
  const { showToast } = useToast();
  // Vista consultativa: HeaderVista y SeccionCriterios leen el modo internamente.
  const [periodo, setPeriodo] = useState('Todos');
  const [estado, setEstado] = useState('Todos');

  const filas = useMemo(() => {
    return historialEstimacionesDummy.filter((h) => {
      if (periodo !== 'Todos' && h.periodo !== periodo) return false;
      if (estado !== 'Todos' && h.estado !== estado) return false;
      return true;
    });
  }, [periodo, estado]);

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
            <select className="sg-input" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              {periodosHistorialDummy.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="sg-label">Estado</label>
            <select className="sg-input" value={estado} onChange={(e) => setEstado(e.target.value)}>
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
            onClick={() => showToast('Pendiente para Sprint siguiente.')}
          >
            ⬇ Exportar historial
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3 font-semibold">Estimación</th>
                <th className="text-left p-3 font-semibold">Periodo</th>
                <th className="text-center p-3 font-semibold">Versión</th>
                <th className="text-center p-3 font-semibold">Estado</th>
                <th className="text-right p-3 font-semibold">Importe</th>
                <th className="text-left p-3 font-semibold">Fecha</th>
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
                filas.map((h, i) => (
                  <tr key={i} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs">{h.estimacion}</td>
                    <td className="p-3">{h.periodo}</td>
                    <td className="p-3 text-center font-semibold">{h.version}</td>
                    <td className="p-3 text-center"><EstadoBadge estado={h.estado} /></td>
                    <td className="p-3 text-right font-semibold">{h.importe}</td>
                    <td className="p-3">{h.fecha}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        El historial conserva todas las versiones del ciclo de cobro, incluyendo las rechazadas, para fiscalización y trazabilidad.
      </p>

      <SeccionCriterios
        huId="HU-14"
        criterios={[
          { numero: 1, texto: 'El historial muestra todas las estimaciones del contrato, incluyendo las versiones rechazadas.' },
          { numero: 2, texto: 'Por cada periodo solo puede haber una estimación aceptada; las versiones previas quedan marcadas como rechazadas.' }
        ]}
      />
    </div>
  );
}
