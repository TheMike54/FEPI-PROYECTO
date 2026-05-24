import { useState, useMemo } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { portafolioContratosDummy } from '../data/dummy.js';

// HU-18 es la unica vista del backlog que opera sobre MULTIPLES contratos, no
// sobre el C-2026-0042 fijo. Por eso no se usa BannerContexto: el "contexto"
// aqui son los contadores agregados del portafolio.

// El semaforo se calcularia a partir del avance fisico, atrasos acumulados y
// pendientes operativos. En esta demo el color viene servido en el dummy.
const SEMAFORO = {
  verde:    { dot: 'bg-sigecop-green-validation', badge: 'bg-green-100 text-sigecop-green-validation', label: 'Verde'    },
  amarillo: { dot: 'bg-sigecop-amber-attention',  badge: 'bg-amber-100 text-sigecop-amber-attention',  label: 'Amarillo' },
  rojo:     { dot: 'bg-red-500',                  badge: 'bg-red-100 text-red-700',                    label: 'Rojo'     }
};

function Contadores({ contratos }) {
  const total = contratos.length;
  const por = (color) => contratos.filter((c) => c.semaforo === color).length;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="bg-white border border-slate-200 rounded-md p-3 text-center">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          Total de contratos
        </div>
        <div className="text-2xl font-bold text-sigecop-blue mt-1">{total}</div>
      </div>
      {['verde', 'amarillo', 'rojo'].map((c) => (
        <div key={c} className="bg-white border border-slate-200 rounded-md p-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${SEMAFORO[c].dot}`} />
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              {SEMAFORO[c].label}
            </div>
          </div>
          <div className="text-2xl font-bold text-sigecop-blue mt-1">{por(c)}</div>
        </div>
      ))}
    </div>
  );
}

function PanelDetalle({ contrato, onCerrar }) {
  const ind = contrato.indicadores;
  return (
    <div className="bg-white border border-slate-200 rounded-md p-5 mb-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Detalle del contrato
          </div>
          <div className="text-lg font-bold text-sigecop-blue">{contrato.folio}</div>
          <div className="text-sm text-slate-700">{contrato.contratista}</div>
        </div>
        <button
          type="button"
          className="text-slate-500 hover:text-slate-900 text-sm"
          onClick={onCerrar}
        >
          ✕ Cerrar
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Avance físico
          </div>
          <div className="text-2xl font-bold text-sigecop-blue mt-1">{ind.avanceFisico}%</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Avance financiero
          </div>
          <div className="text-2xl font-bold text-sigecop-blue mt-1">{ind.avanceFinanciero}%</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Penalizaciones
          </div>
          <div className={`text-2xl font-bold mt-1 ${ind.penalizaciones > 0 ? 'text-red-700' : 'text-sigecop-green-validation'}`}>
            {ind.penalizaciones > 0 ? `$ ${ind.penalizaciones.toLocaleString('en-US')}` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortafolioEjecutivo() {
  const [folioSeleccionado, setFolioSeleccionado] = useState(null);
  const seleccionado = useMemo(
    () => portafolioContratosDummy.find((c) => c.folio === folioSeleccionado) ?? null,
    [folioSeleccionado]
  );

  return (
    <div>
      <HeaderVista
        huId="HU-18"
        titulo="Portafolio ejecutivo"
        sprint="Sprint 9"
        rolAcademico="Dependencia"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Portafolio' }
        ]}
      />

      <Contadores contratos={portafolioContratosDummy} />

      {seleccionado && (
        <PanelDetalle
          contrato={seleccionado}
          onCerrar={() => setFolioSeleccionado(null)}
        />
      )}

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Contratos del portafolio
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Doble clic sobre un renglón para ver el detalle del contrato.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3 font-semibold w-10"></th>
                <th className="text-left p-3 font-semibold">Folio</th>
                <th className="text-left p-3 font-semibold">Contratista</th>
                <th className="text-right p-3 font-semibold w-20">Avance</th>
                <th className="text-left p-3 font-semibold">Estado</th>
                <th className="text-left p-3 font-semibold w-24">Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {portafolioContratosDummy.map((c) => {
                const sem = SEMAFORO[c.semaforo];
                const esActivo = c.folio === folioSeleccionado;
                return (
                  <tr
                    key={c.folio}
                    onDoubleClick={() => setFolioSeleccionado(c.folio)}
                    className={`border-t border-slate-200 cursor-pointer ${esActivo ? 'bg-sigecop-blue-light/50' : 'hover:bg-slate-50'}`}
                    title="Doble clic para abrir el detalle"
                  >
                    <td className="p-3 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${sem.dot}`} />
                    </td>
                    <td className="p-3 font-mono text-xs font-semibold">{c.folio}</td>
                    <td className="p-3 text-slate-700">{c.contratista}</td>
                    <td className="p-3 text-right font-mono">{c.avance}%</td>
                    <td className="p-3 text-slate-700">{c.estado}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${sem.badge}`}>
                        {sem.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <SeccionCriterios
        huId="HU-18"
        criterios={[
          { numero: 1, texto: 'Cada contrato del portafolio muestra un semáforo de color calculado a partir de avance físico, atrasos y pendientes.' },
          { numero: 2, texto: 'Al hacer doble clic sobre un contrato se abre su detalle con indicadores físicos, financieros y penalizaciones.' }
        ]}
      />
    </div>
  );
}
