import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import EncabezadoContrato from '../components/ui/EncabezadoContrato.jsx';
import Kpi from '../components/ui/Kpi.jsx';
import BannerContratoActivo from '../components/BannerContratoActivo.jsx';
import PestanasCiclo from '../components/PestanasCiclo.jsx';
import LinkHU from '../components/LinkHU.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { getFechaRef } from '../lib/fechaSimulada.js';
import { derivarEtapas } from '../utils/etapasAvance.js';
import MatrizProgramaLectura from '../components/programa/MatrizProgramaLectura.jsx';

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
// "Hoy" que usa la curva (marcador vertical, cortes de series ejecutado/financiero, colores de celda
// atraso/pendiente). Respeta la FECHA DE SIMULACIÓN (lente de solo lectura): si hay una fecha simulada
// activa devuelve esa; si no, la fecha real. Así la curva refleja el mismo "hoy" que el resto del
// sistema bajo simulación, sin escribir nada. Ver lib/fechaSimulada.js.
function hoyISO() {
  return getFechaRef();
}
const fechaMXCorta = (s) => { const p = String(s || '').slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : '—'; };
const moneda = (n) => (n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(n) || 0));

// Colores de celda Gantt (paleta SIGECOP): ejecutado (verde), atraso (rojo: programado
// vencido sin ejecutar), pendiente (ámbar: programado por venir), vacío (sin programa).
const COLOR_CELDA = {
  ejecutado: 'bg-sigecop-green-validation',
  atraso:    'bg-red-400',
  pendiente: 'bg-sigecop-amber-attention',
  vacio:     'bg-slate-200'
};

// Curva S en SVG inline — sin dependencias. Series con valores null se cortan (la curva
// ejecutada/financiera se detiene en hoy). `hoyIndex` dibuja el marcador vertical "hoy".
// O1-P16b (revisión profe, 09-jun): tooltip interactivo — "el graficador te debe dar el valor
// cuando pongas el mouse". Círculo de hit invisible (r=10) por punto; el tooltip se dibuja
// DENTRO del SVG (escala con el viewBox, sin matemática de DOM) + <title> nativo de respaldo.
export function CurvaSVG({ datos, hoyIndex, contratoQ = '' }) {
  const w = 720, h = 320, padL = 44, padR = 16, padT = 16, padB = 36;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const [hover, setHover] = useState(null); // { punto, serieLabel, valor, x, y }

  if (!datos || datos.length === 0) {
    return (
      <div className="h-80 flex flex-col items-center justify-center text-center px-4">
        <p className="text-sm text-slate-600 max-w-md">
          Aún no hay avance ejecutado; la curva se llena al registrar trabajos terminados (HU-06).
          Si filtraste por concepto o periodo, prueba ampliar el filtro.
        </p>
        <LinkHU
          hu="HU-06"
          to={`/seguimiento/trabajos-terminados${contratoQ}`}
          className="sg-btn-secondary mt-3"
          actor="Lo registra el Contratista"
        >
          Registrar avance →
        </LinkHU>
      </div>
    );
  }

  const n = datos.length;
  const xFor = (i) => padL + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const yFor = (pct) => padT + innerH - (innerH * Math.max(0, Math.min(100, pct))) / 100;
  const yTicks = [0, 25, 50, 75, 100];

  // H8-B8-3 (25-jun) — en las curvas POR ETAPA (con convenio) se grafican DOS series de ejecutado:
  // "nuevo desde el convenio" (ventana) y "acumulado total" (todas las versiones). En la curva normal,
  // sin `ejecutadoTotal`, se mantiene una sola serie "Ejecutado".
  const tieneTotal = datos.some((d) => d.ejecutadoTotal != null);
  const series = [
    { key: 'programado', label: 'Programado', color: '#0D2F5A' },
    { key: 'ejecutado',  label: tieneTotal ? 'Nuevo (desde convenio)' : 'Ejecutado',  color: '#2563eb' },
    ...(tieneTotal ? [{ key: 'ejecutadoTotal', label: 'Acumulado total', color: '#7c3aed' }] : []),
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
              <g key={i}>
                <circle cx={xFor(i)} cy={yFor(d[s.key])} r="3.5" fill={s.color} />
                {/* P16b: área de hit más grande que el punto, con tooltip nativo de respaldo. */}
                <circle
                  cx={xFor(i)} cy={yFor(d[s.key])} r="10" fill="transparent" style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHover({ punto: d, serieLabel: s.label, valor: d[s.key], x: xFor(i), y: yFor(d[s.key]) })}
                  onMouseLeave={() => setHover(null)}
                  data-testid={`curva-pt-${s.key}-${i}`}
                >
                  <title>{`${d.esOrigen ? 'Inicio' : `Periodo ${d.numero} (${d.label})`} · ${s.label}: ${Number(d[s.key]).toFixed(1)}%`}</title>
                </circle>
              </g>
            )))}
          </g>
        ))}

        {/* P16b: tooltip dibujado en coordenadas del SVG (escala con el viewBox). */}
        {hover && (() => {
          const texto = `${hover.punto.esOrigen ? 'Inicio' : `P${hover.punto.numero} · ${hover.punto.label}`} — ${hover.serieLabel}: ${Number(hover.valor).toFixed(1)}%`;
          const tw = texto.length * 6.4 + 14;
          const tx = Math.max(padL, Math.min(w - padR - tw, hover.x - tw / 2));
          const ty = hover.y - 34 < 2 ? hover.y + 14 : hover.y - 34;
          return (
            <g data-testid="curva-tooltip" pointerEvents="none">
              <rect x={tx} y={ty} width={tw} height={22} rx="4" fill="#0f172a" opacity="0.92" />
              <text x={tx + tw / 2} y={ty + 15} fontSize="11" fill="#ffffff" textAnchor="middle">{texto}</text>
            </g>
          );
        })()}
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
  const [versiones, setVersiones] = useState([]); // G1: versiones del programa (convenios) → monto por versión, para congelar el % financiero histórico
  const [snapshotsVer, setSnapshotsVer] = useState({}); // B: {versionId → {conceptos,celdas}} para derivar las ETAPAS (Propuesta B)
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
    setPrograma(null); setTrabajos(null); setPagos([]); setVersiones([]); setSnapshotsVer({}); setError(null);
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
      // G1: versiones del programa (convenios) para congelar el % financiero histórico (monto por versión).
      // Si el contrato no tiene convenios, el endpoint devuelve versiones=[] y el financiero usa el monto vigente.
      try {
        const conv = await api.convenios(id);
        const vers = Array.isArray(conv?.versiones) ? conv.versiones : [];
        setVersiones(vers);
        // B (Propuesta B): si hay convenio (≥ 2 versiones), carga los snapshots de cada versión para derivar
        // las ETAPAS (original congelado + vigente). Sin convenio → no se cargan (la vista normal aplica).
        if (vers.length >= 2) {
          const snaps = {};
          await Promise.all(vers.map(async (v) => {
            try { const d = await api.versionPrograma(v.id); snaps[v.id] = { conceptos: d.conceptos || [], celdas: d.celdas || [] }; } catch (_) { /* omite esa versión */ }
          }));
          setSnapshotsVer(snaps);
        } else {
          setSnapshotsVer({});
        }
      } catch (_) {
        setVersiones([]); setSnapshotsVer({});
      }
    } catch (e) {
      const msg = e.status === 403 ? 'No tienes acceso al programa de este contrato' : (e.payload?.error || 'No se pudieron cargar los datos del contrato');
      setError(msg);
      showToast(msg);
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  // B6b: preselecciona el contrato del ?contrato=ID al venir del ambiente de avance (sin re-seleccionar a mano).
  const [searchParams] = useSearchParams();
  const contratoQuery = searchParams.get('contrato');
  useEffect(() => {
    if (sinSesion || !contratoQuery || contratoId) return;
    if (contratos.some((c) => String(c.id) === String(contratoQuery))) seleccionarContrato(String(contratoQuery));
  }, [sinSesion, contratoQuery, contratoId, contratos, seleccionarContrato]);

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
      es_adicional: !!c.es_adicional, // B5: distinguir adicionales de convenio (art. 101 RLOPSRM) también en la curva
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
  // G1 (23-jun, profe "26% hoy, 13% mañana"): monto del contrato VIGENTE a una fecha = el de la versión del
  // programa (snapshot por convenio) cuya ventana [created_at, supersedido_en) contiene esa fecha. Así el %
  // financiero de un periodo ya cerrado NO se re-escala cuando un convenio posterior sube el monto: cada punto
  // se divide por el monto que regía entonces. Sin convenios, versiones=[] → siempre el monto vigente (idéntico
  // al comportamiento previo, sin regresión).
  const montoEnFecha = useCallback((fechaISO) => {
    const base = Number(selected?.monto) || 0;
    const vs = (versiones || []).filter((v) => Number(v.monto) > 0 && v.created_at);
    if (vs.length === 0 || !fechaISO) return base;
    const aplica = vs.filter((v) => dISO(v.created_at) <= fechaISO && (!v.supersedido_en || dISO(v.supersedido_en) > fechaISO));
    if (aplica.length) return Number(aplica[aplica.length - 1].monto);
    // Fecha anterior a toda versión registrada → usa la versión más antigua (programa original v1).
    const ordenadas = [...vs].sort((a, b) => dISO(a.created_at).localeCompare(dISO(b.created_at)));
    return Number(ordenadas[0].monto) || base;
  }, [versiones, selected]);

  const financieroMap = useMemo(() => {
    const m = {};
    if (periodosAll.length === 0) return m;
    const baseMonto = Number(selected?.monto) || 0;
    if (baseMonto <= 0 && (versiones || []).length === 0) return m;  // sin monto y sin versiones: no se puede normalizar
    const pgs = pagos.map((p) => ({ f: dISO(p.fecha_pago), imp: Number(p.importe) || 0 }));
    const ultimoNum = periodosAll[periodosAll.length - 1]?.numero;
    for (const p of periodosAll) {
      if (dISO(p.inicio) > hoy) continue;                     // periodo futuro: sin punto
      // P5 (22-jun): el periodo terminal (y el periodo en curso) acumulan TODOS los pagos hasta hoy → un pago
      // posterior al fin del programa ya NO queda fuera de la ventana (el KPI 'Financiero a hoy' deja de marcar 0%).
      const cutoff = (p.numero === ultimoNum || dISO(p.fin) > hoy) ? hoy : dISO(p.fin);
      const montoCorte = montoEnFecha(cutoff);                // G1: monto vigente a la fecha de corte del periodo
      if (!(montoCorte > 0)) continue;
      const acum = pgs.reduce((s, x) => (x.f && x.f <= cutoff ? s + x.imp : s), 0);
      m[p.numero] = (acum / montoCorte) * 100;
    }
    return m;
  }, [pagos, selected, periodosAll, hoy, versiones, montoEnFecha]);

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
  // O1-P16a (revisión profe, 09-jun): cada periodo grafica a su CIERRE (label = mes de p.fin; el
  // acumulado del periodo se alcanza al terminar el periodo, no al empezarlo) y las 3 series
  // INICIAN EN 0 en el inicio del contrato ("no has hecho nada; el programado va en cero; en el
  // primer periodo es el primer avance"): se antepone el punto (inicio, 0%) cuando la ventana
  // visible arranca en el primer periodo (en ventanas recortadas el origen no aplica).
  const datosCurva = useMemo(() => {
    const idsFiltro = new Set(conceptosFiltrados.map((c) => c.id));
    const puntos = periodosVisibles.map((p) => {
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
      return { label: mesCorto(p.fin), numero: p.numero, programado, ejecutado, financiero };
    });
    const primero = periodosAll[0];
    if (puntos.length > 0 && primero && periodosVisibles[0].numero === primero.numero) {
      const iniciado = dISO(primero.inicio) <= hoy; // contrato ya iniciado → ejecutado/financiero parten de 0
      puntos.unshift({
        label: 'Inicio', numero: 0, esOrigen: true,
        programado: denom > 0 ? 0 : null,
        ejecutado: denom > 0 && iniciado ? 0 : null,
        financiero: iniciado && Number(selected?.monto) > 0 ? 0 : null
      });
    }
    return puntos;
  }, [periodosVisibles, periodosAll, conceptosFiltrados, planeadoMap, ejecCeldaMap, denom, periodoActualNum, financieroMap, hoy, selected]);

  // B (Propuesta B) — ETAPAS por versión del programa. Vacío si el contrato NO tiene convenio (sin regresión).
  const etapas = useMemo(
    () => derivarEtapas({ versiones, snapshots: snapshotsVer, avances: trabajos?.avances, hoy }),
    [versiones, snapshotsVer, trabajos, hoy]
  );

  // El índice de "hoy" se busca sobre datosCurva (que puede traer el punto de origen antepuesto).
  const hoyIndex = useMemo(() => {
    const i = datosCurva.findIndex((d) => !d.esOrigen && d.numero === periodoActualNum);
    return i >= 0 ? i : null;
  }, [datosCurva, periodoActualNum]);

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
  const contratoQ = contratoId ? `?contrato=${contratoId}` : '';

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

      <PestanasCiclo ciclo="avance" activo="curva" />

      {sinSesion && (
        <div className="bg-pagina border border-borde rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión en modo aplicación para consultar el programa y la curva de avance.
        </div>
      )}

      {/* 3A · P3 — hereda el contrato activo global (antes: <select> de contrato). */}
      <BannerContratoActivo seleccionar={seleccionarContrato} contratoId={contratoId} />

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
          {/* UI-1: EncabezadoContrato (sistema de diseño guinda); mismo contenido. */}
          <EncabezadoContrato
            titulo="Contrato"
            folio={selected.folio}
            items={[
              { value: selected.contratista || '—' },
              { label: 'Avance físico global:', value: fmtPct(avanceGlobal), resaltado: true }
            ]}
          />

          {sinPrograma && (
            <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 mb-6 text-sm text-slate-800 rounded-r-md">
              ⚠️ Este contrato aún no tiene programa de obra (periodos) configurado, así que no hay curva ni matriz que graficar.
              La curva se habilita cuando el contrato cuente con su programa de obra; mientras tanto, el avance físico global se sigue calculando sobre lo ejecutado.
            </div>
          )}

          {/* Filtros (criterio 2). */}
          <div className="bg-white border border-borde rounded-lg p-5 mb-6">
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
          <div className="bg-white border border-borde rounded-lg p-5 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Catálogo de conceptos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-pagina text-tinta-sec uppercase tracking-wider text-xs">
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
                        <td className="px-3 py-2 font-semibold text-slate-700">
                          {c.concepto}
                          {c.es_adicional && <span className="ml-2 inline-block text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5 align-middle" title="Concepto ADICIONAL de convenio modificatorio (art. 101 RLOPSRM): se administra por separado de los originales.">Adicional</span>}
                        </td>
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
            <Kpi label="Programado (acum. a hoy)" valor={fmtPct(kpis.programado)} tono="base" />
            <Kpi label="Ejecutado (acum. a hoy)"  valor={fmtPct(kpis.ejecutado)}  tono="base" />
            <Kpi label="Financiero (acum. a hoy)" valor={fmtPct(kpis.financiero)} tono="base" />
            <Kpi
              label="Desviación vs programa"
              valor={desviacion == null ? '—'
                : desviacion < 0 ? `Atraso de ${Math.abs(desviacion).toFixed(1)}%`
                : desviacion > 0 ? `Adelanto de ${desviacion.toFixed(1)}%`
                : 'En programa'}
              tono={desviacion == null ? 'base' : (desviacion < 0 ? 'aviso' : 'exito')}
              sub={desviacion == null ? undefined : (desviacion < 0 ? 'Avance por debajo del programa' : desviacion > 0 ? 'Avance por encima del programa' : 'Avance conforme al programa')}
            />
          </div>

          {/* B (Propuesta B) — AVANCE POR ETAPAS (versión del programa). Solo si hay convenio (≥ 2 versiones):
              el % del plan ORIGINAL queda CONGELADO (histórico, no se re-escala) y la etapa VIGENTE arranca un %
              nuevo sobre el plan modificado. El ejecutado se parte por la fecha del convenio (art. 59/101). */}
          {etapas.length >= 2 && (
            <div className="bg-white border border-borde rounded-lg p-5 mb-6" data-testid="avance-etapas">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-1">
                Avance por etapas (versión del programa)
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Al entrar un convenio modificatorio, el avance del <strong>plan original</strong> se congela como
                histórico (no se re-escala) y arranca una etapa <strong>vigente</strong> sobre el plan modificado
                (art. 59 LOPSRM; los adicionales se administran aparte, art. 101 RLOPSRM).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {etapas.map((et) => (
                  <div key={et.versionId} className={`border rounded-lg overflow-hidden ${et.vigente ? 'border-guinda/40' : 'border-borde'}`} data-testid={`etapa-${et.vigente ? 'vigente' : 'historico'}-${et.numero}`}>
                    <div className={`px-4 py-2.5 border-b flex items-center justify-between ${et.vigente ? 'bg-guinda-soft border-guinda/20' : 'bg-slate-100 border-borde'}`}>
                      <h3 className={`text-sm font-bold ${et.vigente ? 'text-guinda' : 'text-slate-700'}`}>
                        {et.vigente ? 'Etapa vigente · desde el convenio modificatorio' : (et.numero === 1 ? 'Etapa original · plan inicial' : `Etapa ${et.numero} · histórico`)}
                      </h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wide rounded px-2 py-0.5 border ${et.vigente ? 'bg-guinda-soft text-guinda border-guinda/30' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                        {et.vigente ? 'Vigente' : 'Histórico · congelado'}
                      </span>
                    </div>
                    <div className="p-4">
                      <CurvaSVG datos={et.curva} hoyIndex={null} contratoQ={contratoQ} />
                      <div className={`grid ${et.vigente ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mt-3`}>
                        <div className="border border-borde rounded-md px-3 py-2">
                          <div className="text-[10px] uppercase tracking-wider text-slate-500">{et.vigente ? 'Programado a hoy' : 'Programado al corte'}</div>
                          <div className="text-lg font-bold text-slate-700" data-testid={`etapa-prog-${et.numero}`}>{fmtPct(et.kpiProgramado)}</div>
                        </div>
                        <div className="border border-borde rounded-md px-3 py-2">
                          <div className="text-[10px] uppercase tracking-wider text-slate-500">{et.vigente ? 'Ejecutado (nuevo)' : 'Ejecutado (congelado)'}</div>
                          <div className="text-lg font-bold text-sigecop-blue" data-testid={`etapa-ejec-${et.numero}`}>{fmtPct(et.kpiEjecutado)}</div>
                        </div>
                        {/* H8-B8-3: en la etapa vigente, KPI del ACUMULADO TOTAL (todas las versiones) sobre el plan vigente. */}
                        {et.vigente && (
                          <div className="border border-guinda/30 rounded-md px-3 py-2 bg-guinda-soft/40">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500">Acumulado total</div>
                            <div className="text-lg font-bold text-guinda" data-testid={`etapa-ejec-total-${et.numero}`}>{fmtPct(et.kpiEjecutadoTotal)}</div>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2">
                        Plan Σ {num(et.denom)} · {et.nPeriodos} periodo(s) · {et.vigente ? `vigente (corte a hoy ${fechaMXCorta(et.fechaCorte)})` : `histórico hasta ${fechaMXCorta(et.fechaCorte)}`}.
                      </p>

                      {/* B-Variante 1 (aprobada) — desplegable INLINE del programa de obra de ESTA versión (v1 original /
                          v2 modificada): periodos con fechas + matriz concepto×periodo. Datos de api.versionPrograma. */}
                      {et.programa && et.programa.periodos.length > 0 && (
                        <details className={`mt-3 border rounded-md ${et.vigente ? 'border-guinda/30' : 'border-borde'}`} data-testid={`etapa-programa-${et.numero}`}>
                          <summary className={`px-3 py-2 text-[13px] font-semibold flex items-center justify-between cursor-pointer rounded-md ${et.vigente ? 'bg-guinda-soft text-guinda' : 'bg-pagina text-sigecop-blue'}`}>
                            <span>📋 Ver programa de obra · {et.vigente ? 'versión modificada' : 'versión original'}</span>
                            <span className="text-tinta-ter">▾</span>
                          </summary>
                          <div className="p-3 border-t border-borde">
                            <p className="text-[11px] text-slate-500 mb-2">
                              {et.programa.plazoDias != null ? <>Plazo <strong>{et.programa.plazoDias} días</strong> · </> : null}
                              {et.programa.periodos.length} periodo(s){et.programa.monto != null ? <> · monto del plan <strong>{moneda(et.programa.monto)}</strong></> : null}.
                            </p>
                            <MatrizProgramaLectura programa={et.programa} mostrarRestante={false} />
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Curva S (criterio 2). */}
          <div className="bg-white border border-borde rounded-lg p-5 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
              Curva S — programado · ejecutado · financiero{etapas.length >= 2 ? ' (consolidado sobre el plan vigente)' : ''}
            </h2>
            {etapas.length >= 2 && (
              <p className="text-xs text-amber-800 bg-amber-50 border-l-4 border-sigecop-amber-attention px-4 py-2 mb-3 rounded-r-md" data-testid="curva-consolidado-aviso">
                Esta curva es el <strong>consolidado sobre el plan vigente</strong> (denominador actual). El avance del
                plan original <strong>sin re-escalar</strong> se ve arriba, en <strong>«Avance por etapas»</strong>.
              </p>
            )}
            <CurvaSVG datos={datosCurva} hoyIndex={hoyIndex} contratoQ={contratoQ} />
            <p className="text-xs text-slate-500 mt-3 text-center">
              Las curvas inician en <strong>0%</strong> al inicio del contrato y cada periodo grafica a su{' '}
              <strong>cierre</strong> (pasa el mouse sobre un punto para ver su valor).{' '}
              Programado llega al 100%; ejecutado y financiero se detienen en <strong>hoy</strong> (marcador).{' '}
              Financiero = Σ pagos hasta el periodo ÷ monto del contrato (mismo número que el{' '}
              <code>financiero_pct</code> canónico, acumulado por fecha), a nivel contrato
              {conceptoSelId != null && <strong> (el financiero se reporta a nivel contrato, no por concepto)</strong>}.
            </p>
            {(versiones || []).length > 1 && (
              <p className="text-xs text-amber-700 mt-2 text-center bg-amber-50 border border-amber-200 rounded-md px-3 py-2" data-testid="curva-nota-convenio">
                ⓘ Este contrato tiene <strong>convenio(s) modificatorio(s)</strong>. El % <strong>financiero histórico</strong> se calcula con el
                monto vigente en cada periodo (<strong>no se re-escala</strong> al subir el monto con un convenio). El programado/ejecutado se
                miden sobre el alcance vigente; los conceptos adicionales se administran por separado (art. 101 RLOPSRM).
              </p>
            )}
          </div>

          {/* Matriz programa de obra (criterio 1). */}
          <div className="bg-white border border-borde rounded-lg p-5 mb-6" data-testid="seccion-gantt">
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
                    <tr className="text-tinta-sec uppercase tracking-wider">
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
                            {c.es_adicional && <span className="ml-2 inline-block text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5 align-middle" title="Concepto ADICIONAL de convenio modificatorio (art. 101 RLOPSRM).">Adicional</span>}
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
