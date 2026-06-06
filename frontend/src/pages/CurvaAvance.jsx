import { useState, useEffect, useMemo, useCallback } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// HU-05 Fase única — cableado al backend real (SOLO frontend; compone en cliente).
// Fuentes (endpoints existentes, sin tocar backend):
//  · PROGRAMADO: api.leerProgramaObra → celdas (cantidad planeada por concepto×periodo).
//  · EJECUTADO:  api.trabajosDeContrato → avances (cantidad ejecutada imputada a periodo) +
//                conceptos.acumulado_ejecutado (para el % de avance global/por concepto).
//  · FINANCIERO: api.listarPagos(contratoId) → por periodo, Σ pagos.importe con fecha_pago ≤ periodo.fin
//                ÷ contrato.monto ×100. MISMA definición que el financiero_pct canónico (pagado ÷ monto),
//                solo acumulada por fecha → curva real cuyo último punto coincide con ese número. Incluye
//                los periodos ya iniciados (inicio ≤ hoy), cortando en hoy el periodo en curso (alineado
//                con ejecutado). NO se usa estimación-prep:
//                su financiero_pct no se acota por periodo_fin (saldría plano). El GET de pagos está
//                acotado por PARTICIPACIÓN (no es finanzas-only), así que lo leen los roles de HU-05.
// Las 3 series son % ACUMULADO sobre el eje X = periodos del programa (ordenados por numero).

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const dISO = (v) => (v == null ? '' : String(v).slice(0, 10)); // DATE/ISO -> 'AAAA-MM-DD'
const mesCorto = (iso) => { const mm = Number(dISO(iso).slice(5, 7)); return MESES[mm - 1] || ''; };
const num = (n) => (Number(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 3 });
const fmtPct = (n) => (n == null ? '—' : `${Number(n).toFixed(1)}%`);
function hoyISO() {
  const d = new Date();
  const z = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

// Colores de celda Gantt (paleta SIGECOP): ejecutado (verde), atraso (rojo: programado
// vencido sin ejecutar), pendiente (ámbar: programado por venir), vacío (sin programa).
const COLOR_CELDA = {
  ejecutado: 'bg-sigecop-green-validation',
  atraso:    'bg-red-400',
  pendiente: 'bg-sigecop-amber-attention',
  vacio:     'bg-slate-200'
};

const TONO_KPI = {
  base:   'text-sigecop-blue',
  ok:     'text-sigecop-green-validation',
  alerta: 'text-sigecop-amber-attention'
};

// Curva S en SVG inline — sin dependencias. Series con valores null se cortan (la curva
// ejecutada/financiera se detiene en hoy). `hoyIndex` dibuja el marcador vertical "hoy".
function CurvaSVG({ datos, hoyIndex }) {
  const w = 720, h = 320, padL = 44, padR = 16, padT = 16, padB = 36;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  if (!datos || datos.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-400 italic text-sm">
        Sin datos para los filtros aplicados.
      </div>
    );
  }

  const n = datos.length;
  const xFor = (i) => padL + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const yFor = (pct) => padT + innerH - (innerH * Math.max(0, Math.min(100, pct))) / 100;
  const yTicks = [0, 25, 50, 75, 100];

  const series = [
    { key: 'programado', label: 'Programado', color: '#0D2F5A' },
    { key: 'ejecutado',  label: 'Ejecutado',  color: '#2563eb' },
    { key: 'financiero', label: 'Financiero', color: '#10b981' }
  ];

  // Path que SALTA los null (varios segmentos M…L…): así la serie se corta en hoy.
  const linea = (key) => {
    const segs = [];
    let cur = '';
    datos.forEach((d, i) => {
      const v = d[key];
      if (v == null) { if (cur) { segs.push(cur); cur = ''; } return; }
      cur += `${cur === '' ? 'M' : 'L'} ${xFor(i)} ${yFor(v)} `;
    });
    if (cur) segs.push(cur);
    return segs.join(' ');
  };

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="w-full h-auto"
           role="img" aria-label="Curva S de avance del contrato">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={yFor(t)} y2={yFor(t)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={padL - 8} y={yFor(t) + 4} fontSize="11" fill="#64748b" textAnchor="end">{t}%</text>
          </g>
        ))}

        {/* Marcador "hoy" — línea vertical en el periodo actual. */}
        {hoyIndex != null && hoyIndex >= 0 && hoyIndex < n && (
          <g>
            <line x1={xFor(hoyIndex)} x2={xFor(hoyIndex)} y1={padT} y2={padT + innerH}
                  stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x={xFor(hoyIndex)} y={padT - 4} fontSize="10" fill="#ef4444" textAnchor="middle">hoy</text>
          </g>
        )}

        {datos.map((d, i) => (
          <text key={i} x={xFor(i)} y={h - padB + 18} fontSize="11" fill="#64748b" textAnchor="middle">{d.label}</text>
        ))}

        {series.map((s) => (
          <g key={s.key}>
            <path d={linea(s.key)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {datos.map((d, i) => (d[s.key] == null ? null : (
              <circle key={i} cx={xFor(i)} cy={yFor(d[s.key])} r="3.5" fill={s.color} />
            )))}
          </g>
        ))}
      </svg>

      <div className="flex flex-wrap gap-4 justify-center mt-2 text-xs">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-slate-700">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KPI({ label, valor, tono, sub }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${TONO_KPI[tono] || TONO_KPI.base}`}>{valor}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function CurvaAvance() {
  const { token } = useSesion();
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');

  // Datos crudos del contrato seleccionado.
  const [programa, setPrograma] = useState(null);   // { periodos, conceptos, celdas }
  const [trabajos, setTrabajos] = useState(null);   // { conceptos, avances, periodos }
  const [pagos, setPagos] = useState([]); // { fecha_pago, importe } del contrato (para la curva financiero)
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Filtros (criterio 2).
  const [conceptoFiltro, setConceptoFiltro] = useState('Todos'); // 'Todos' | String(contrato_concepto_id)
  const [rango, setRango] = useState('todo');                    // 'todo' | 'ultimos3' | 'ultimo'

  const selected = useMemo(
    () => contratos.find((c) => String(c.id) === String(contratoId)) || null,
    [contratos, contratoId]
  );

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id);
    setPrograma(null); setTrabajos(null); setPagos([]); setError(null);
    setConceptoFiltro('Todos'); setRango('todo');
    if (!id) return;
    setCargando(true);
    try {
      // PROGRAMADO + EJECUTADO en paralelo.
      const [prog, trab] = await Promise.all([
        api.leerProgramaObra(id),
        api.trabajosDeContrato(id)
      ]);
      setPrograma(prog);
      setTrabajos(trab);

      // FINANCIERO: pagos del contrato (se acumulan por fecha en el memo). El GET está acotado por
      // participación; si fallara (p. ej. 403 de borde) se omite la serie financiera sin romper la vista
      // (programado, ejecutado, matriz y % siguen).
      try {
        const pg = await api.listarPagos(id);
        setPagos(Array.isArray(pg) ? pg : []);
      } catch (_) {
        setPagos([]);
      }
    } catch (e) {
      const msg = e.status === 403 ? 'No tienes acceso al programa de este contrato' : (e.payload?.error || 'No se pudieron cargar los datos del contrato');
      setError(msg);
      showToast(msg);
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  // ---- Derivaciones ----
  const periodosAll = useMemo(() => {
    const ps = (programa?.periodos || []).slice();
    ps.sort((a, b) => a.numero - b.numero);
    return ps;
  }, [programa]);

  const conceptos = useMemo(() => {
    // Catálogo del programa + acumulado ejecutado (de trabajos), unidos por id.
    const ejecById = new Map((trabajos?.conceptos || []).map((c) => [c.contrato_concepto_id, Number(c.acumulado_ejecutado) || 0]));
    return (programa?.conceptos || []).map((c) => ({
      id: c.id, clave: c.clave, concepto: c.concepto, unidad: c.unidad,
      contratado: Number(c.cantidad) || 0,
      ejecutado: ejecById.get(c.id) || 0
    }));
  }, [programa, trabajos]);

  // Celdas planeadas y ejecutadas por (concepto, periodo).
  const planeadoMap = useMemo(() => {
    const m = new Map();
    for (const cel of (programa?.celdas || [])) m.set(`${cel.contrato_concepto_id}|${cel.contrato_periodo_id}`, Number(cel.cantidad) || 0);
    return m;
  }, [programa]);
  const ejecCeldaMap = useMemo(() => {
    const m = new Map();
    for (const a of (trabajos?.avances || [])) {
      if (a.contrato_periodo_id == null) continue; // sin imputación: no entra a la serie ni a la celda
      const k = `${a.contrato_concepto_id}|${a.contrato_periodo_id}`;
      m.set(k, (m.get(k) || 0) + (Number(a.cantidad) || 0));
    }
    return m;
  }, [trabajos]);

  const hoy = hoyISO();
  // Periodo actual: el que contiene hoy; si hoy es posterior a todos, el último; si es anterior a todos, ninguno.
  const periodoActualNum = useMemo(() => {
    if (periodosAll.length === 0) return null;
    const dentro = periodosAll.find((p) => dISO(p.inicio) <= hoy && dISO(p.fin) >= hoy);
    if (dentro) return dentro.numero;
    const ultimo = periodosAll[periodosAll.length - 1];
    return hoy > dISO(ultimo.fin) ? ultimo.numero : null; // anterior al inicio del contrato => sin marcador
  }, [periodosAll, hoy]);

  // FINANCIERO acumulado por periodo: Σ pagos.importe con fecha_pago ≤ corte ÷ monto ×100. Misma
  // definición que el financiero_pct canónico (pagado÷monto), acumulada por fecha. Incluye los periodos
  // YA INICIADOS (inicio ≤ hoy); para el periodo EN CURSO el corte es hoy (no su fin), de modo que su
  // punto = Σ pagos ≤ hoy ÷ monto y la curva financiero termina alineada con ejecutado. Periodos futuros
  // sin punto. null global si no hay monto (no se puede normalizar).
  const financieroMap = useMemo(() => {
    const m = {};
    const monto = Number(selected?.monto) || 0;
    if (monto <= 0 || periodosAll.length === 0) return m;
    const pgs = pagos.map((p) => ({ f: dISO(p.fecha_pago), imp: Number(p.importe) || 0 }));
    for (const p of periodosAll) {
      if (dISO(p.inicio) > hoy) continue;                     // periodo futuro: sin punto
      const cutoff = dISO(p.fin) <= hoy ? dISO(p.fin) : hoy;  // periodo en curso: corta en hoy
      const acum = pgs.reduce((s, x) => (x.f && x.f <= cutoff ? s + x.imp : s), 0);
      m[p.numero] = (acum / monto) * 100;
    }
    return m;
  }, [pagos, selected, periodosAll, hoy]);

  // Ventana de periodos visibles (filtro de rango): recorta columnas/curvas; los acumulados
  // se siguen calculando desde el inicio del contrato (numero ≤ p.numero).
  const periodosVisibles = useMemo(() => {
    if (rango === 'ultimo') return periodosAll.slice(-1);
    if (rango === 'ultimos3') return periodosAll.slice(-3);
    return periodosAll;
  }, [periodosAll, rango]);

  const conceptoSelId = conceptoFiltro === 'Todos' ? null : Number(conceptoFiltro);
  const conceptosFiltrados = useMemo(
    () => (conceptoSelId == null ? conceptos : conceptos.filter((c) => c.id === conceptoSelId)),
    [conceptos, conceptoSelId]
  );

  // Denominador de las curvas PROGRAMADO/EJECUTADO: Σ contratado del filtro.
  const denom = useMemo(
    () => conceptosFiltrados.reduce((s, c) => s + c.contratado, 0),
    [conceptosFiltrados]
  );

  // Series por periodo VISIBLE (acumulado hasta numero ≤ p.numero).
  const datosCurva = useMemo(() => {
    const idsFiltro = new Set(conceptosFiltrados.map((c) => c.id));
    return periodosVisibles.map((p) => {
      let prog = 0, ejec = 0;
      for (const cid of idsFiltro) {
        for (const q of periodosAll) {
          if (q.numero > p.numero) break;
          prog += planeadoMap.get(`${cid}|${q.id}`) || 0;
          ejec += ejecCeldaMap.get(`${cid}|${q.id}`) || 0;
        }
      }
      const programado = denom > 0 ? (prog / denom) * 100 : null;
      // EJECUTADO se detiene en hoy: null para periodos futuros (numero > periodo actual).
      const muestraEjec = periodoActualNum != null && p.numero <= periodoActualNum;
      const ejecutado = (denom > 0 && muestraEjec) ? (ejec / denom) * 100 : null;
      // FINANCIERO (nivel contrato): solo periodos con dato (inicio ≤ hoy) en financieroMap.
      const financiero = financieroMap[p.numero] != null ? financieroMap[p.numero] : null;
      return { label: mesCorto(p.inicio), numero: p.numero, programado, ejecutado, financiero };
    });
  }, [periodosVisibles, periodosAll, conceptosFiltrados, planeadoMap, ejecCeldaMap, denom, periodoActualNum, financieroMap]);

  const hoyIndex = useMemo(() => {
    const i = periodosVisibles.findIndex((p) => p.numero === periodoActualNum);
    return i >= 0 ? i : null;
  }, [periodosVisibles, periodoActualNum]);

  // KPIs en hoy (o último punto visible si hoy no cae en la ventana).
  const kpis = useMemo(() => {
    if (datosCurva.length === 0) return { programado: null, ejecutado: null, financiero: null };
    const enHoy = datosCurva.find((d) => d.numero === periodoActualNum);
    const ref = enHoy || datosCurva[datosCurva.length - 1];
    return { programado: ref.programado, ejecutado: ref.ejecutado, financiero: ref.financiero };
  }, [datosCurva, periodoActualNum]);
  const desviacion = (kpis.ejecutado != null && kpis.programado != null) ? kpis.ejecutado - kpis.programado : null;

  // % de avance (criterio 3): global = Σ ejecutado ÷ Σ contratado; por concepto = ejec_c ÷ contratado_c.
  const avanceGlobal = useMemo(() => {
    const cont = conceptos.reduce((s, c) => s + c.contratado, 0);
    const ejec = conceptos.reduce((s, c) => s + c.ejecutado, 0);
    return cont > 0 ? (ejec / cont) * 100 : null;
  }, [conceptos]);

  // Color de una celda de la matriz.
  const colorCelda = (cid, p) => {
    const planeado = planeadoMap.get(`${cid}|${p.id}`) || 0;
    if (planeado <= 0) return 'vacio';
    const ejec = ejecCeldaMap.get(`${cid}|${p.id}`) || 0;
    if (ejec > 0) return 'ejecutado';
    return dISO(p.fin) < hoy ? 'atraso' : 'pendiente';
  };

  const hayContrato = !!selected;
  const sinPrograma = hayContrato && !cargando && !error && periodosAll.length === 0;

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

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión en modo aplicación para consultar el programa y la curva de avance.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-md p-4 mb-6 max-w-2xl">
        <label className="sg-label">Contrato</label>
        <select
          className="sg-input"
          value={contratoId}
          onChange={(e) => seleccionarContrato(e.target.value)}
          disabled={sinSesion}
          data-testid="select-contrato"
        >
          <option value="">— Selecciona un contrato —</option>
          {contratos.map((c) => <option key={c.id} value={c.id}>{c.folio} · {c.objeto}</option>)}
        </select>
      </div>

      {!sinSesion && !contratoId && (
        <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para ver su programa de obra y la curva de avance.</p>
      )}
      {cargando && <p className="text-sm text-slate-500 mb-4">Cargando programa y avance…</p>}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 mb-4 text-sm text-red-800 rounded-r-md" data-testid="banner-error">
          {error}
        </div>
      )}

      {selected && !cargando && !error && (
        <>
          <BannerContexto
            variant="slate"
            folio={selected.folio}
            folioLabel="Contrato"
            extra={[
              { value: selected.contratista || '—' },
              { label: 'Avance físico global:', value: fmtPct(avanceGlobal), resaltado: true }
            ]}
          />

          {sinPrograma && (
            <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 mb-6 text-sm text-slate-800 rounded-r-md">
              ⚠️ Este contrato no tiene programa de obra (periodos) configurado; no hay curva ni matriz que graficar.
              El avance físico global se calcula sobre lo ejecutado.
            </div>
          )}

          {/* Filtros (criterio 2). */}
          <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="sg-label">Concepto</label>
                <select className="sg-input" value={conceptoFiltro} onChange={(e) => setConceptoFiltro(e.target.value)} data-testid="filtro-concepto">
                  <option value="Todos">Todos</option>
                  {conceptos.map((c) => (
                    <option key={c.id} value={c.id}>{(c.clave ? `${c.clave} · ` : '')}{c.concepto}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="sg-label">Periodo</label>
                <select className="sg-input" value={rango} onChange={(e) => setRango(e.target.value)} data-testid="filtro-periodo">
                  <option value="todo">Todo el contrato</option>
                  <option value="ultimos3">Últimos 3 periodos</option>
                  <option value="ultimo">Último periodo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Catálogo de conceptos + % de avance por concepto (criterio 3). */}
          <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Catálogo de conceptos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Clave</th>
                    <th className="px-3 py-2 text-left">Concepto</th>
                    <th className="px-3 py-2 text-left">Unidad</th>
                    <th className="px-3 py-2 text-right">Cant. contratada</th>
                    <th className="px-3 py-2 text-right">Ejecutado</th>
                    <th className="px-3 py-2 text-right">% Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {conceptos.length === 0 ? (
                    <tr><td colSpan="6" className="px-3 py-4 text-slate-400 italic text-center">Sin catálogo de conceptos.</td></tr>
                  ) : conceptos.map((c) => {
                    const resaltado = conceptoSelId != null && c.id === conceptoSelId;
                    const pct = c.contratado > 0 ? (c.ejecutado / c.contratado) * 100 : null;
                    return (
                      <tr key={c.id} className={`border-t border-slate-100 ${resaltado ? 'bg-sigecop-blue-light' : ''}`}>
                        <td className="px-3 py-2 font-mono text-xs text-slate-500">{c.clave || '—'}</td>
                        <td className="px-3 py-2 font-semibold text-slate-700">{c.concepto}</td>
                        <td className="px-3 py-2 text-slate-600">{c.unidad}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{num(c.contratado)}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{num(c.ejecutado)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-sigecop-blue">{fmtPct(pct)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* KPIs (en hoy). */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <KPI label="Programado (acum. a hoy)" valor={fmtPct(kpis.programado)} tono="base" />
            <KPI label="Ejecutado (acum. a hoy)"  valor={fmtPct(kpis.ejecutado)}  tono="base" />
            <KPI label="Financiero (acum. a hoy)" valor={fmtPct(kpis.financiero)} tono="base" />
            <KPI
              label="Desviación (ejec. − prog.)"
              valor={desviacion == null ? '—' : `${desviacion > 0 ? '+' : ''}${desviacion.toFixed(1)}%`}
              tono={desviacion == null ? 'base' : (desviacion < 0 ? 'alerta' : 'ok')}
              sub={desviacion == null ? undefined : (desviacion < 0 ? 'Avance por debajo del programa' : 'Avance en o por encima del programa')}
            />
          </div>

          {/* Curva S (criterio 2). */}
          <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
              Curva S — programado · ejecutado · financiero
            </h2>
            <CurvaSVG datos={datosCurva} hoyIndex={hoyIndex} />
            <p className="text-xs text-slate-500 mt-3 text-center">
              Programado llega al 100%; ejecutado y financiero se detienen en <strong>hoy</strong> (marcador).{' '}
              Financiero = Σ pagos hasta el periodo ÷ monto del contrato (mismo número que el{' '}
              <code>financiero_pct</code> canónico, acumulado por fecha), a nivel contrato
              {conceptoSelId != null && <strong> (no se desglosa por concepto en Etapa 1)</strong>}.
            </p>
          </div>

          {/* Matriz programa de obra (criterio 1). */}
          <div className="bg-white border border-slate-200 rounded-md p-5 mb-6" data-testid="seccion-gantt">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Programa de obra — concepto × periodo</h2>
              <div className="text-xs text-slate-600">
                Avance físico global:{' '}
                <span className="font-bold text-sigecop-blue text-base" data-testid="avance-global">{fmtPct(avanceGlobal)}</span>
              </div>
            </div>

            {periodosVisibles.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Sin periodos en el programa de obra.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ borderSpacing: 0 }}>
                  <thead>
                    <tr className="text-slate-600 uppercase tracking-wider">
                      <th className="px-2 py-2 text-left">Concepto</th>
                      {periodosVisibles.map((p) => (
                        <th key={p.id} className="px-2 py-2 text-center" title={`${dISO(p.inicio)} – ${dISO(p.fin)}`}>
                          #{p.numero}<br /><span className="font-normal normal-case text-slate-400">{mesCorto(p.inicio)}</span>
                        </th>
                      ))}
                      <th className="px-2 py-2 text-right">% Avance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conceptosFiltrados.map((c) => {
                      const pct = c.contratado > 0 ? (c.ejecutado / c.contratado) * 100 : null;
                      return (
                        <tr key={c.id} className="border-t border-slate-100">
                          <td className="px-2 py-2 font-semibold text-slate-700 whitespace-nowrap">
                            {(c.clave ? `${c.clave} · ` : '')}{c.concepto}
                          </td>
                          {periodosVisibles.map((p) => {
                            const estado = colorCelda(c.id, p);
                            return (
                              <td key={p.id} className="px-1 py-1">
                                <div className={`h-6 rounded ${COLOR_CELDA[estado]}`}
                                     title={`${c.concepto} · #${p.numero}: ${estado}`} data-estado={estado} />
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 text-right font-semibold text-sigecop-blue">{fmtPct(pct)}</td>
                        </tr>
                      );
                    })}
                    {conceptosFiltrados.length === 0 && (
                      <tr><td className="px-2 py-4 text-slate-400 italic text-center" colSpan={periodosVisibles.length + 2}>Sin filas para el concepto seleccionado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-xs text-slate-700">
              <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded bg-sigecop-green-validation" /><span>Ejecutado</span></div>
              <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded bg-red-400" /><span>Atraso (programado vencido sin ejecutar)</span></div>
              <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded bg-sigecop-amber-attention" /><span>Programado por venir</span></div>
              <div className="flex items-center gap-2"><span className="inline-block w-4 h-3 rounded bg-slate-200" /><span>No programado</span></div>
            </div>
          </div>
        </>
      )}

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
