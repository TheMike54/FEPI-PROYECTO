import { useState, useMemo } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import {
  contratoDummy,
  curvaAvanceDummy,
  conceptosCurvaDummy,
  periodosCurvaDummy,
  catalogoConceptosCurvaDummy,
  programaObraGanttDummy
} from '../data/dummy.js';

// Avance por concepto: ejecutadas / (ejecutadas + programadas) sobre los meses
// visibles. Devuelve null si el concepto no tiene celdas en ese periodo, para
// distinguir "sin dato" de "0% real".
function avancePorConcepto(fila, mesesVisibles) {
  let ejec = 0;
  let prog = 0;
  for (const m of mesesVisibles) {
    const e = fila.porMes[m];
    if (e === 'ejecutado') ejec++;
    else if (e === 'programado') prog++;
  }
  const denom = ejec + prog;
  if (denom === 0) return null;
  return Math.round((ejec / denom) * 100);
}

// Colores de celda Gantt — alineados a la paleta SIGECOP (verde validación,
// ámbar atención, slate-200 para no-programado).
const COLOR_CELDA_GANTT = {
  ejecutado:        'bg-sigecop-green-validation',
  programado:       'bg-sigecop-amber-attention',
  'no-programado':  'bg-slate-200'
};

// Curva S en SVG inline — sin dependencias extra. Las 3 series comparten ejes;
// el SVG es responsivo (viewBox + preserveAspectRatio).
function CurvaSVG({ datos }) {
  const w = 720;
  const h = 320;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  // Si no hay datos (filtro vacío), evitar dividir entre cero.
  if (!datos || datos.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-400 italic text-sm">
        Sin datos para los filtros aplicados.
      </div>
    );
  }

  const n = datos.length;
  const xFor = (i) => padL + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const yFor = (pct) => padT + innerH - (innerH * pct) / 100;

  const linea = (key) =>
    datos.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d[key])}`).join(' ');

  const yTicks = [0, 25, 50, 75, 100];

  const series = [
    { key: 'programado', label: 'Programado', color: '#0D2F5A' },
    { key: 'ejecutado',  label: 'Ejecutado',  color: '#2563eb' },
    { key: 'financiero', label: 'Financiero', color: '#10b981' }
  ];

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto"
        role="img"
        aria-label="Curva S de avance del contrato"
      >
        {/* Grid horizontal */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={padL}
              x2={w - padR}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text x={padL - 8} y={yFor(t) + 4} fontSize="11" fill="#64748b" textAnchor="end">
              {t}%
            </text>
          </g>
        ))}

        {/* Eje X — etiquetas de mes */}
        {datos.map((d, i) => (
          <text
            key={d.mes}
            x={xFor(i)}
            y={h - padB + 18}
            fontSize="11"
            fill="#64748b"
            textAnchor="middle"
          >
            {d.mes}
          </text>
        ))}

        {/* Curvas */}
        {series.map((s) => (
          <g key={s.key}>
            <path
              d={linea(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {datos.map((d, i) => (
              <circle
                key={i}
                cx={xFor(i)}
                cy={yFor(d[s.key])}
                r="3.5"
                fill={s.color}
              />
            ))}
          </g>
        ))}
      </svg>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 justify-center mt-2 text-xs">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-slate-700">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KPI({ label, valor, tono, sub }) {
  const tonos = {
    base:   'text-sigecop-blue',
    ok:     'text-sigecop-green-validation',
    alerta: 'text-sigecop-amber-attention'
  };
  return (
    <div className="bg-white border border-slate-200 rounded-md p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
        {label}
      </div>
      <div className={`text-3xl font-bold mt-1 ${tonos[tono] || tonos.base}`}>{valor}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function CurvaAvance() {
  // Vista consultativa: HeaderVista lee el modo internamente para mostrar el
  // AvisoSoloLectura cuando aplique; los filtros NO van en RegionEditable.
  const [concepto, setConcepto] = useState(conceptosCurvaDummy[0]);
  const [periodo, setPeriodo] = useState(periodosCurvaDummy[0]);

  // Los filtros recortan los puntos visibles. "Todos" + "Todo el contrato" deja
  // la curva completa; los demás dan un slice para que el cambio sea visible.
  const datos = useMemo(() => {
    let base = curvaAvanceDummy;
    if (periodo === 'Últimos 3 meses') base = base.slice(-3);
    if (periodo === 'Último mes') base = base.slice(-1);
    // "Todos" deja las 3 series; cualquier concepto específico atenúa la curva
    // ejecutada al 70% para simular el subconjunto del concepto. Vista hueca.
    if (concepto !== 'Todos') {
      base = base.map((d) => ({
        ...d,
        ejecutado:  Math.round(d.ejecutado  * 0.7),
        financiero: Math.round(d.financiero * 0.7)
      }));
    }
    return base;
  }, [concepto, periodo]);

  // KPIs del último punto visible.
  const ultimo = datos[datos.length - 1] || { programado: 0, ejecutado: 0, financiero: 0 };
  const desviacion = ultimo.ejecutado - ultimo.programado;

  // Gantt — meses visibles espejan el filtro de periodo. Filas filtradas si el
  // usuario elige un concepto específico (las demás se ocultan).
  const mesesVisibles = useMemo(() => {
    const todos = curvaAvanceDummy.map((d) => d.mes);
    if (periodo === 'Últimos 3 meses') return todos.slice(-3);
    if (periodo === 'Último mes') return todos.slice(-1);
    return todos;
  }, [periodo]);

  const filasGantt = useMemo(() => {
    if (concepto === 'Todos') return programaObraGanttDummy;
    return programaObraGanttDummy.filter((f) => f.concepto === concepto);
  }, [concepto]);

  const filasConAvance = useMemo(
    () => filasGantt.map((f) => ({ ...f, avance: avancePorConcepto(f, mesesVisibles) })),
    [filasGantt, mesesVisibles]
  );

  // Avance global = suma de celdas ejecutadas / total de celdas programadas
  // (ejec. + prog.) sobre el subconjunto visible. Sigue el mismo recorte que la
  // curva para que los porcentajes sean coherentes con el filtro.
  const avanceGlobal = useMemo(() => {
    let ejec = 0;
    let prog = 0;
    for (const f of filasGantt) {
      for (const m of mesesVisibles) {
        const e = f.porMes[m];
        if (e === 'ejecutado') ejec++;
        else if (e === 'programado') prog++;
      }
    }
    const denom = ejec + prog;
    if (denom === 0) return null;
    return Math.round((ejec / denom) * 100);
  }, [filasGantt, mesesVisibles]);

  // Mapa concepto -> % de avance para la columna de la tabla catálogo. Se
  // calcula sobre el catálogo completo (no sobre filasGantt) para que la tabla
  // siempre liste todos los conceptos aunque el filtro elija solo uno.
  const avancePorConceptoMap = useMemo(() => {
    const map = {};
    for (const f of programaObraGanttDummy) {
      map[f.concepto] = avancePorConcepto(f, mesesVisibles);
    }
    return map;
  }, [mesesVisibles]);

  return (
    <div>
      <HeaderVista
        huId="HU-05"
        titulo="Programa y curva de avance"
        sprint="Sprint 7"
        rolAcademico="Residente"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Seguimiento' },
          { label: 'Curva de avance' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[{ value: contratoDummy.contratista }]}
      />

      {/* Filtros consultativos — NO van en RegionEditable. */}
      <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="sg-label">Concepto</label>
            <select
              className="sg-input"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
            >
              {conceptosCurvaDummy.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="sg-label">Periodo</label>
            <select
              className="sg-input"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            >
              {periodosCurvaDummy.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Catálogo de conceptos — tabla con descripción, unidad, cantidad
          contratada y % de avance por concepto. El concepto filtrado se resalta
          con fondo azul claro. */}
      <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
          Catálogo de conceptos
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Concepto</th>
                <th className="px-3 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-left">Unidad</th>
                <th className="px-3 py-2 text-right">Cant. contratada</th>
                <th className="px-3 py-2 text-right">% Avance</th>
              </tr>
            </thead>
            <tbody>
              {catalogoConceptosCurvaDummy.map((c) => {
                const resaltado = concepto !== 'Todos' && c.concepto === concepto;
                const avance = avancePorConceptoMap[c.concepto];
                return (
                  <tr
                    key={c.concepto}
                    className={`border-t border-slate-100 ${resaltado ? 'bg-sigecop-blue-light' : ''}`}
                  >
                    <td className="px-3 py-2 font-semibold text-slate-700">{c.concepto}</td>
                    <td className="px-3 py-2 text-slate-600">{c.descripcion}</td>
                    <td className="px-3 py-2 text-slate-600">{c.unidad}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{c.cantidadContratada.toLocaleString('es-MX')}</td>
                    <td className="px-3 py-2 text-right font-semibold text-sigecop-blue">
                      {avance == null ? '—' : `${avance}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPI label="Programado (acum.)" valor={`${ultimo.programado}%`} tono="base" />
        <KPI label="Ejecutado (acum.)"  valor={`${ultimo.ejecutado}%`}  tono="base" />
        <KPI label="Financiero (acum.)" valor={`${ultimo.financiero}%`} tono="base" />
        <KPI
          label="Desviación (ejec. − prog.)"
          valor={`${desviacion > 0 ? '+' : ''}${desviacion}%`}
          tono={desviacion < 0 ? 'alerta' : 'ok'}
          sub={desviacion < 0 ? 'Avance por debajo del programa' : 'Avance en o por encima del programa'}
        />
      </div>

      {/* Gráfico */}
      <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
          Curva S — programado · ejecutado · financiero
        </h2>
        <CurvaSVG datos={datos} />
      </div>

      {/* Programa de obra — matriz tipo Gantt: filas = concepto del catálogo,
          columnas = meses del contrato (acotadas por filtro de periodo). El
          color de cada celda distingue ejecutado/programado/no-programado. */}
      <div
        className="bg-white border border-slate-200 rounded-md p-5 mb-6"
        data-testid="seccion-gantt"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Programa de obra — concepto × periodo
          </h2>
          <div className="text-xs text-slate-600">
            Avance físico global:{' '}
            <span
              className="font-bold text-sigecop-blue text-base"
              data-testid="avance-global"
            >
              {avanceGlobal == null ? '—' : `${avanceGlobal}%`}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ borderSpacing: 0 }}>
            <thead>
              <tr className="text-slate-600 uppercase tracking-wider">
                <th className="px-2 py-2 text-left">Concepto</th>
                {mesesVisibles.map((m) => (
                  <th key={m} className="px-2 py-2 text-center">{m}</th>
                ))}
                <th className="px-2 py-2 text-right">% Avance</th>
              </tr>
            </thead>
            <tbody>
              {filasConAvance.map((f) => (
                <tr key={f.concepto} className="border-t border-slate-100">
                  <td className="px-2 py-2 font-semibold text-slate-700 whitespace-nowrap">
                    {f.concepto}
                  </td>
                  {mesesVisibles.map((m) => {
                    const estado = f.porMes[m] || 'no-programado';
                    return (
                      <td key={m} className="px-1 py-1">
                        <div
                          className={`h-6 rounded ${COLOR_CELDA_GANTT[estado]}`}
                          title={`${f.concepto} · ${m}: ${estado}`}
                          aria-label={`${f.concepto} ${m} ${estado}`}
                          data-estado={estado}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-right font-semibold text-sigecop-blue">
                    {f.avance == null ? '—' : `${f.avance}%`}
                  </td>
                </tr>
              ))}
              {filasConAvance.length === 0 && (
                <tr>
                  <td
                    className="px-2 py-4 text-slate-400 italic text-center"
                    colSpan={mesesVisibles.length + 2}
                  >
                    Sin filas para el concepto seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Leyenda de colores */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-3 rounded bg-sigecop-green-validation" />
            <span>Ejecutado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-3 rounded bg-sigecop-amber-attention" />
            <span>Programado sin ejecutar (atraso o por venir)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-3 rounded bg-slate-200" />
            <span>No programado</span>
          </div>
        </div>
      </div>

      <SeccionCriterios
        huId="HU-05"
        criterios={[
          { numero: 1, texto: 'La vista muestra el programa de obra como matriz concepto × periodo (tipo Gantt), con el catálogo de conceptos y un código de color que distingue lo ejecutado de lo no ejecutado.' },
          { numero: 2, texto: 'La vista grafica las tres curvas (programado, ejecutado, financiero) y los filtros por concepto y periodo recalculan tanto la matriz como las curvas.' },
          { numero: 3, texto: 'El sistema calcula y muestra el porcentaje de avance global y por concepto.' }
        ]}
      />
    </div>
  );
}
