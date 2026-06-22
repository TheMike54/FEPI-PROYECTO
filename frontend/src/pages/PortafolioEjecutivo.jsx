import { useEffect, useMemo, useState } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import Kpi from '../components/ui/Kpi.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// HU-18 — Portafolio ejecutivo con semáforos. CABLEADO al backend real (GET /api/portafolio):
// es la ÚNICA vista del backlog que opera sobre MÚLTIPLES contratos. El semáforo, el avance
// (físico/programado/financiero por valor), los atrasos fechables, los pendientes y la penalización
// se calculan SERVER-SIDE (fuente única; reusa estimacion-prep/alertas/tablero). Aquí solo se
// presenta — NO se inventa ningún dato (sin dummy).

const SEMAFORO = {
  verde:    { dot: 'bg-exito',     badge: 'bg-green-100 text-exito', label: 'Verde'    },
  amarillo: { dot: 'bg-aviso',     badge: 'bg-amber-100 text-aviso', label: 'Amarillo' },
  rojo:     { dot: 'bg-peligro',   badge: 'bg-red-100 text-peligro', label: 'Rojo'     },
};

const pct = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);
const money = (v) => (v == null ? '—' : `$ ${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

function VariacionMesBadge({ delta }) {
  if (delta == null) {
    return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">sin dato</span>;
  }
  const d = Number(delta);
  if (d === 0) {
    return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">= igual</span>;
  }
  if (d > 0) {
    return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-exito">↑ {d} pp vs mes anterior</span>;
  }
  return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-peligro">↓ {d} pp vs mes anterior</span>;
}

function Contadores({ totales }) {
  const celdas = [
    { key: 'total', label: 'Total de contratos', valor: totales.contratos },
    { key: 'verde', label: SEMAFORO.verde.label, valor: totales.verde },
    { key: 'amarillo', label: SEMAFORO.amarillo.label, valor: totales.amarillo },
    { key: 'rojo', label: SEMAFORO.rojo.label, valor: totales.rojo },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {celdas.map((c) => (
        <div
          key={c.key}
          className="bg-white border border-borde rounded-md p-3 text-center"
          data-testid={c.key === 'total' ? undefined : `contador-${c.key}`}
        >
          <div className="flex items-center justify-center gap-2">
            {c.key !== 'total' && <span className={`inline-block w-2.5 h-2.5 rounded-full ${SEMAFORO[c.key].dot}`} />}
            <div className="text-[10px] uppercase tracking-wider text-tinta-sec font-semibold">{c.label}</div>
          </div>
          <div className="text-2xl font-bold text-guinda mt-1">{c.valor}</div>
        </div>
      ))}
    </div>
  );
}

function PanelDetalle({ contrato, onCerrar }) {
  const a = contrato.avance;
  const at = contrato.atrasos;
  return (
    <div className="bg-white border border-borde rounded-md p-5 mb-6 shadow-sm" data-testid="panel-detalle-contrato">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-tinta-sec font-semibold">Detalle del contrato</div>
          <div className="text-lg font-bold text-guinda">{contrato.folio}</div>
          <div className="text-sm text-tinta-sec">{contrato.contratista || '—'}</div>
        </div>
        <button
          type="button"
          className="text-tinta-sec hover:text-tinta text-sm"
          onClick={onCerrar}
          data-testid="btn-cerrar-detalle-contrato"
        >
          ✕ Cerrar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Kpi label="Avance físico" valor={pct(a.fisico_pct)} tono="guinda" />
        <Kpi label="Avance financiero" valor={pct(a.financiero_pct)} tono="guinda" />
        <Kpi
          label="Atrasos (días vencidos)"
          valor={at.dias_vencidos}
          tono={at.dias_vencidos > 0 ? 'peligro' : 'exito'}
        />
        <Kpi
          label="Penalizaciones"
          valor={contrato.penalizaciones == null ? '—' : money(contrato.penalizaciones)}
          tono={contrato.penalizaciones == null ? 'base' : 'peligro'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3 text-xs text-tinta-sec">
        <div>
          <span className="font-semibold text-tinta">Programado:</span> {pct(a.programado_pct)}
          {' · '}
          <span className="font-semibold text-tinta">Desviación:</span>{' '}
          {a.desviacion_pp == null ? 'sin programa' : `${a.desviacion_pp} pp`}
        </div>
        <div>
          <span className="font-semibold text-tinta">Conceptos en atraso:</span> {at.conceptos_en_atraso}
        </div>
        <div>
          <span className="font-semibold text-tinta">Pendientes:</span> {contrato.pendientes.total}{' '}
          ({contrato.pendientes.observaciones_abiertas} obs · {contrato.pendientes.rechazadas_sin_reingreso} rechazos)
        </div>
        <div>
          <span className="font-semibold text-tinta">Δ avance:</span>{' '}
          {contrato.comparacion.delta_pp == null ? 'sin dato' : `${contrato.comparacion.delta_pp} pp`}
        </div>
      </div>

      {contrato.semaforo.parcial && (
        <p className="text-xs text-aviso mt-3">⚠️ {contrato.semaforo.nota}</p>
      )}
      <p className="text-[11px] text-tinta-sec mt-2 italic">
        Plazos vencidos en autorización/pago no se evalúan (faltan sellos de fecha en el esquema; se omiten honestamente).
      </p>
    </div>
  );
}

function FilaContrato({ c, onSeleccionar, esActivo }) {
  const sem = SEMAFORO[c.semaforo.color];
  const tooltip = c.semaforo.desglose
    .map((d) => `${d.factor}: ${d.valor} (${d.puntos == null ? 'n/a' : `+${d.puntos}`})`)
    .join(' | ') + ` | Total: ${c.semaforo.total}${c.semaforo.parcial ? ' (parcial)' : ''}`;
  return (
    <tr
      onDoubleClick={() => onSeleccionar(c.folio)}
      className={`border-t border-borde cursor-pointer ${esActivo ? 'bg-pagina' : 'hover:bg-pagina/60'}`}
      title={tooltip}
      data-testid={`fila-portafolio-${c.folio}`}
    >
      <td className="p-3 text-center">
        <span
          className={`inline-block w-3 h-3 rounded-full ${sem.dot}`}
          data-testid={`semaforo-dot-${c.folio}`}
          data-color={c.semaforo.color}
        />
      </td>
      <td className="p-3 font-mono text-xs font-semibold">{c.folio}</td>
      <td className="p-3 text-tinta-sec">{c.contratista || '—'}</td>
      <td className="p-3 text-right font-mono">{pct(c.avance.fisico_pct)}</td>
      <td className="p-3"><VariacionMesBadge delta={c.comparacion.delta_pp} /></td>
      <td className="p-3 text-right">{c.pendientes.total}</td>
      <td className="p-3">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${sem.badge}`}
          data-testid={`semaforo-badge-${c.folio}`}
        >
          {sem.label}{c.semaforo.parcial ? ' *' : ''}
        </span>
      </td>
    </tr>
  );
}

function TablaContratos({ contratos, onSeleccionar, folioActivo }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-pagina text-tinta-sec">
          <tr>
            <th className="text-left p-3 font-semibold w-10"></th>
            <th className="text-left p-3 font-semibold">Folio</th>
            <th className="text-left p-3 font-semibold">Contratista</th>
            <th className="text-right p-3 font-semibold w-24">Avance físico</th>
            <th className="text-left p-3 font-semibold">vs mes anterior</th>
            <th className="text-right p-3 font-semibold w-24">Pendientes</th>
            <th className="text-left p-3 font-semibold w-24">Semáforo</th>
          </tr>
        </thead>
        <tbody>
          {contratos.map((c) => (
            <FilaContrato key={c.folio} c={c} onSeleccionar={onSeleccionar} esActivo={c.folio === folioActivo} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Agrupadores DISPONIBLES (fuente real). HU-18 (22-jun): se QUITÓ "Tipo de contratación" — el procedimiento
// de adjudicación no existe en el esquema, así que se eliminó la opción (antes salía deshabilitada / "no disponible",
// lo que se veía a medias) en lugar de ofrecer un agrupador inutilizable.
const AGRUPADORES = [
  { id: 'Ninguno', label: 'Ninguno', clave: () => null, disabled: false },
  { id: 'Contratista', label: 'Contratista', clave: (c) => c.contratista || '— sin contratista —', disabled: false },
  { id: 'Ejercicio fiscal', label: 'Ejercicio fiscal', clave: (c) => (c.ejercicio == null ? '— sin fecha de inicio —' : String(c.ejercicio)), disabled: false },
];

export default function PortafolioEjecutivo() {
  const { token } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;

  const [datos, setDatos] = useState(null);   // { rol, totales, contratos, umbrales }
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [folioSeleccionado, setFolioSeleccionado] = useState(null);
  const [agruparPor, setAgruparPor] = useState('Ninguno');

  useEffect(() => {
    if (sinSesion) return;
    setCargando(true);
    setError(null);
    api.portafolio()
      .then((d) => setDatos(d))
      .catch((e) => {
        const msg = e.payload?.error || 'No se pudo cargar el portafolio';
        setError(msg);
        showToast(msg);
      })
      .finally(() => setCargando(false));
  }, [sinSesion, showToast]);

  const contratos = datos?.contratos || [];
  const seleccionado = useMemo(
    () => contratos.find((c) => c.folio === folioSeleccionado) ?? null,
    [contratos, folioSeleccionado]
  );

  const grupos = useMemo(() => {
    const ag = AGRUPADORES.find((a) => a.id === agruparPor);
    if (!ag || ag.disabled || agruparPor === 'Ninguno') {
      return [{ label: null, contratos }];
    }
    const mapa = new Map();
    for (const c of contratos) {
      const k = ag.clave(c);
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k).push(c);
    }
    return [...mapa.entries()].map(([label, items]) => ({ label, contratos: items }));
  }, [agruparPor, contratos]);

  const totales = datos?.totales || { contratos: 0, verde: 0, amarillo: 0, rojo: 0 };

  return (
    <div>
      <HeaderVista
        huId="HU-18"
        titulo="Portafolio ejecutivo"
        sprint="Sprint 9"
        rolAcademico="Dependencia"
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Portafolio' }]}
      />

      {sinSesion && (
        <div className="bg-pagina border border-borde rounded-md px-4 py-3 mb-4 text-sm text-tinta-sec">
          Inicia sesión para consultar el portafolio de contratos.
        </div>
      )}
      {cargando && <p className="text-sm text-tinta-sec mb-4">Cargando portafolio…</p>}
      {error && (
        <div className="bg-red-50 border-l-4 border-peligro px-4 py-3 mb-4 text-sm text-peligro rounded-r-md" data-testid="banner-error">
          {error}
        </div>
      )}

      {!sinSesion && !cargando && !error && (
        <>
          <Contadores totales={totales} />

          {seleccionado && (
            <PanelDetalle contrato={seleccionado} onCerrar={() => setFolioSeleccionado(null)} />
          )}

          <div className="bg-white border border-borde rounded-md p-5 mb-4" data-testid="control-agrupar">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="sg-label">Agrupar por</label>
                <select
                  className="sg-input"
                  value={agruparPor}
                  onChange={(e) => setAgruparPor(e.target.value)}
                  data-testid="select-agrupar-por"
                >
                  {AGRUPADORES.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.disabled}>{a.label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-tinta-sec">
                  Doble clic sobre una fila para ver el detalle. El color del semáforo se calcula en el
                  servidor a partir de avance vs programado, atrasos en plazos y pendientes sin atender
                  (hover sobre la fila para ver el desglose). <strong>*</strong> = semáforo parcial (contrato
                  sin programa de obra). La comparación con el mes anterior es solo del <em>avance físico</em>.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-borde rounded-md overflow-hidden">
            <div className="px-6 py-3 border-b border-borde">
              <h2 className="text-sm font-bold uppercase tracking-wider text-tinta-sec">Contratos del portafolio</h2>
            </div>
            {contratos.length === 0 ? (
              <p className="px-6 py-6 text-sm text-tinta-sec italic">No hay contratos en tu portafolio.</p>
            ) : (
              grupos.map((g, gi) => (
                <div key={g.label ?? `grp-${gi}`} data-testid={`grupo-${g.label ?? 'todos'}`}>
                  {g.label && (
                    <div className="px-6 py-2 bg-pagina border-t border-borde">
                      <span className="text-xs uppercase tracking-wider text-guinda font-semibold">
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
              ))
            )}
          </div>
        </>
      )}

      <SeccionCriterios
        huId="HU-18"
        criterios={[
          { numero: 1, texto: 'Cada contrato del portafolio muestra un semáforo de color calculado a partir de tres factores: avance físico vs programado, atrasos en plazos legales y pendientes sin atender.' },
          { numero: 2, texto: 'Al hacer doble clic sobre un contrato se abre su detalle con indicadores físicos, financieros, atrasos y penalizaciones.' },
          { numero: 3, texto: 'El portafolio puede agruparse (por contratista o ejercicio fiscal) y comparar el avance del periodo actual contra el anterior.' },
        ]}
      />
    </div>
  );
}
