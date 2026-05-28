import { useMemo, useState } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { portafolioContratosDummy, agruparPorPortafolioDummy } from '../data/dummy.js';
import { calcularSemaforo } from '../data/portafolioLogica.js';

// HU-18 es la unica vista del backlog que opera sobre MULTIPLES contratos, no
// sobre el C-2026-0042 fijo. Por eso no se usa BannerContexto: el "contexto"
// aqui son los contadores agregados del portafolio.

// Estilo del semaforo (mismo color para badge y dot).
const SEMAFORO = {
  verde:    { dot: 'bg-sigecop-green-validation', badge: 'bg-green-100 text-sigecop-green-validation', label: 'Verde'    },
  amarillo: { dot: 'bg-sigecop-amber-attention',  badge: 'bg-amber-100 text-sigecop-amber-attention',  label: 'Amarillo' },
  rojo:     { dot: 'bg-red-500',                  badge: 'bg-red-100 text-red-700',                    label: 'Rojo'     }
};

function VariacionMesBadge({ actual, anterior }) {
  const delta = actual - anterior;
  if (delta === 0) {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
        = igual
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-sigecop-green-validation">
        ↑ {delta} pp vs mes anterior
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
      ↓ {delta} pp vs mes anterior
    </span>
  );
}

function Contadores({ contratos }) {
  const total = contratos.length;
  const por = (color) => contratos.filter((c) => c._semaforo.color === color).length;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="bg-white border border-slate-200 rounded-md p-3 text-center">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          Total de contratos
        </div>
        <div className="text-2xl font-bold text-sigecop-blue mt-1">{total}</div>
      </div>
      {['verde', 'amarillo', 'rojo'].map((c) => (
        <div key={c} className="bg-white border border-slate-200 rounded-md p-3 text-center" data-testid={`contador-${c}`}>
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
  const f = contrato.factores;
  return (
    <div className="bg-white border border-slate-200 rounded-md p-5 mb-6 shadow-sm" data-testid="panel-detalle-contrato">
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
          data-testid="btn-cerrar-detalle-contrato"
        >
          ✕ Cerrar
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            Atrasos (días vencidos)
          </div>
          <div className={`text-2xl font-bold mt-1 ${f.diasVencidos > 0 ? 'text-red-700' : 'text-sigecop-green-validation'}`}>
            {f.diasVencidos}
          </div>
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

function FilaContrato({ c, onSeleccionar, esActivo }) {
  const sem = SEMAFORO[c._semaforo.color];
  // Tooltip nativo con desglose del semaforo.
  const tooltip = c._semaforo.desglose
    .map((d) => `${d.factor}: ${d.valor} (+${d.puntos})`)
    .join(' | ') + ` | Total: ${c._semaforo.total}`;
  return (
    <tr
      key={c.folio}
      onDoubleClick={() => onSeleccionar(c.folio)}
      className={`border-t border-slate-200 cursor-pointer ${esActivo ? 'bg-sigecop-blue-light/50' : 'hover:bg-slate-50'}`}
      title={tooltip}
      data-testid={`fila-portafolio-${c.folio}`}
    >
      <td className="p-3 text-center">
        <span
          className={`inline-block w-3 h-3 rounded-full ${sem.dot}`}
          data-testid={`semaforo-dot-${c.folio}`}
          data-color={c._semaforo.color}
        />
      </td>
      <td className="p-3 font-mono text-xs font-semibold">{c.folio}</td>
      <td className="p-3 text-slate-700">{c.contratista}</td>
      <td className="p-3 text-right font-mono">{c.avance}%</td>
      <td className="p-3"><VariacionMesBadge actual={c.avance} anterior={c.avanceMesAnterior} /></td>
      <td className="p-3 text-slate-700">{c.estado}</td>
      <td className="p-3">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${sem.badge}`}
          data-testid={`semaforo-badge-${c.folio}`}
        >
          {sem.label}
        </span>
      </td>
    </tr>
  );
}

function TablaContratos({ contratos, onSeleccionar, folioActivo }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th className="text-left p-3 font-semibold w-10"></th>
            <th className="text-left p-3 font-semibold">Folio</th>
            <th className="text-left p-3 font-semibold">Contratista</th>
            <th className="text-right p-3 font-semibold w-20">Avance</th>
            <th className="text-left p-3 font-semibold">vs mes anterior</th>
            <th className="text-left p-3 font-semibold">Estado</th>
            <th className="text-left p-3 font-semibold w-24">Semáforo</th>
          </tr>
        </thead>
        <tbody>
          {contratos.map((c) => (
            <FilaContrato
              key={c.folio}
              c={c}
              onSeleccionar={onSeleccionar}
              esActivo={c.folio === folioActivo}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PortafolioEjecutivo() {
  const [folioSeleccionado, setFolioSeleccionado] = useState(null);
  const [agruparPor, setAgruparPor] = useState('Ninguno');

  // Enriquecer cada contrato con el semaforo calculado (memoizado). El dummy
  // solo trae factores crudos; el color se deriva aqui (CA-1 estricto).
  const contratosConSemaforo = useMemo(
    () => portafolioContratosDummy.map((c) => ({ ...c, _semaforo: calcularSemaforo(c.factores) })),
    []
  );

  const seleccionado = useMemo(
    () => contratosConSemaforo.find((c) => c.folio === folioSeleccionado) ?? null,
    [contratosConSemaforo, folioSeleccionado]
  );

  // Agrupar (Ninguno -> grupo unico con label vacio).
  const grupos = useMemo(() => {
    if (agruparPor === 'Ninguno') {
      return [{ label: null, contratos: contratosConSemaforo }];
    }
    const claveFn = {
      'Contratista':         (c) => c.contratista,
      'Ejercicio fiscal':    (c) => c.ejercicioFiscal,
      'Tipo de contratación': (c) => c.tipoContratacion
    }[agruparPor];
    const mapa = new Map();
    for (const c of contratosConSemaforo) {
      const k = claveFn(c);
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k).push(c);
    }
    return [...mapa.entries()].map(([label, contratos]) => ({ label, contratos }));
  }, [agruparPor, contratosConSemaforo]);

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

      <Contadores contratos={contratosConSemaforo} />

      {seleccionado && (
        <PanelDetalle
          contrato={seleccionado}
          onCerrar={() => setFolioSeleccionado(null)}
        />
      )}

      <div className="bg-white border border-slate-200 rounded-md p-5 mb-4" data-testid="control-agrupar">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="sg-label">Agrupar por</label>
            <select
              className="sg-input"
              value={agruparPor}
              onChange={(e) => setAgruparPor(e.target.value)}
              data-testid="select-agrupar-por"
            >
              {agruparPorPortafolioDummy.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-slate-500">
              Doble clic sobre una fila para ver el detalle. El color del semáforo
              se calcula a partir de avance vs programado, atrasos en plazos y
              pendientes (hover sobre la fila para ver el desglose).
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Contratos del portafolio
          </h2>
        </div>
        {grupos.map((g, gi) => (
          <div key={g.label ?? `grp-${gi}`} data-testid={`grupo-${g.label ?? 'todos'}`}>
            {g.label && (
              <div className="px-6 py-2 bg-sigecop-blue-light/40 border-t border-slate-200">
                <span className="text-xs uppercase tracking-wider text-sigecop-blue font-semibold">
                  {agruparPor}: {g.label} ({g.contratos.length})
                </span>
              </div>
            )}
            <TablaContratos
              contratos={g.contratos}
              onSeleccionar={setFolioSeleccionado}
              folioActivo={folioSeleccionado}
            />
          </div>
        ))}
      </div>

      <SeccionCriterios
        huId="HU-18"
        criterios={[
          { numero: 1, texto: 'Cada contrato del portafolio muestra un semáforo de color calculado a partir de tres factores: avance físico vs programado, atrasos en plazos legales y pendientes sin atender.' },
          { numero: 2, texto: 'Al hacer doble clic sobre un contrato se abre su detalle con indicadores físicos, financieros, atrasos y penalizaciones.' },
          { numero: 3, texto: 'El portafolio puede agruparse (por contratista, ejercicio fiscal o tipo de contratación) y comparar el periodo actual contra el anterior.' }
        ]}
      />
    </div>
  );
}
