import { useState, useMemo } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import {
  contratoDummy,
  curvaAvanceDummy,
  conceptosCurvaDummy,
  periodosCurvaDummy
} from '../data/dummy.js';

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

      <SeccionCriterios
        huId="HU-05"
        criterios={[
          { numero: 1, texto: 'La pantalla grafica las tres curvas (programado, ejecutado, financiero) en un solo gráfico.' },
          { numero: 2, texto: 'Los filtros por concepto y periodo modifican la gráfica y los porcentajes calculados.' }
        ]}
      />
    </div>
  );
}
