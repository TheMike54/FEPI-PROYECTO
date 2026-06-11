import { useMemo, useState, useEffect, useCallback } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import EncabezadoContrato from '../components/ui/EncabezadoContrato.jsx';
import Kpi from '../components/ui/Kpi.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { api } from '../services/api.js';

// HU-17 — Tablero de estimaciones. Vista AGREGADA y de SOLO LECTURA del ciclo de
// las estimaciones que el usuario puede ver (acotamiento por participación en el
// backend). Toda la agregación (conteos y MONTOS por estado y por contrato) llega
// calculada SERVER-SIDE con los montos EXACTOS que HU-12 congeló (cuadre al
// centavo): el cliente solo da formato. Sin datos dummy.

// Pipeline canónico de una estimación en proceso (O7, art. 54 LOPSRM): Presentada (integrada, el
// contratista) → Autorizada (enviada, la residencia) → Pagada (finanzas). Sin 'rechazada' (vive en el
// historial, HU-14) ni la 'autorizada' VESTIGIAL del esquema (sin uso en el flujo cableado). El stepper
// marca como "completado" todo lo anterior al estado actual.
const FASES = [
  { estado: 'integrada',  label: 'Presentada' },
  { estado: 'enviada',    label: 'Autorizada' },
  { estado: 'pagada',     label: 'Pagada' },
];
const FASE_IDX = new Map(FASES.map((f, i) => [f.estado, i]));

// Colores del badge por ESTADO real — paleta de las demás vistas.
const COLOR_ESTADO = {
  integrada:  'bg-slate-200 text-slate-700',
  enviada:    'bg-aviso-bg text-aviso',
  autorizada: 'bg-sigecop-blue-light text-sigecop-blue',
  pagada:     'bg-exito-bg text-exito',
  rechazada:  'bg-peligro-bg text-peligro',
};

const NOMBRE_ROL = {
  residente:   'Residente',
  contratista: 'Contratista',
  supervision: 'Supervisión',
  dependencia: 'Dependencia',
  finanzas:    'Finanzas',
};

// El backend manda montos como string con 2 decimales (cuadre exacto). El cliente
// SOLO da formato de miles; no recalcula dinero.
const moneda = (n) =>
  `$ ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function EstadoBadge({ estado, etiqueta }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${COLOR_ESTADO[estado] || 'bg-slate-200 text-slate-600'}`}>
      {etiqueta || estado}
    </span>
  );
}

function MiniStepper({ estado }) {
  const idx = FASE_IDX.has(estado) ? FASE_IDX.get(estado) : -1;
  return (
    <div className="flex items-center gap-1.5 mt-3" aria-label={`Línea de tiempo: ${estado}`}>
      {FASES.map((fase, i) => {
        const completado = i < idx;
        const actual = i === idx;
        let dotCls = 'w-2.5 h-2.5 rounded-full border-2 ';
        if (actual) dotCls += 'bg-sigecop-accent border-sigecop-accent';
        else if (completado) dotCls += 'bg-sigecop-blue border-sigecop-blue';
        else dotCls += 'bg-white border-borde-fuerte';
        const lineCls = 'flex-1 h-0.5 ' + (i < idx ? 'bg-sigecop-blue' : 'bg-borde');
        return (
          <div key={fase.estado} className="flex items-center flex-1 last:flex-none">
            <div className={dotCls} title={fase.label} />
            {i < FASES.length - 1 && <div className={lineCls} />}
          </div>
        );
      })}
    </div>
  );
}

function IndicadoresAgregados({ totales, porEstado }) {
  return (
    <div className="bg-white border border-borde rounded-lg p-5 mb-6" data-testid="indicadores-agregados">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
        Indicadores agregados de la cartera
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Kpi label="Contratos" valor={totales.contratos} tono="guinda" testid="kpi-contratos" />
        <Kpi label="Monto total estimado" valor={moneda(totales.monto_estimado)} tono="guinda" testid="kpi-monto-estimado" />
        <Kpi label="Monto pagado" valor={moneda(totales.monto_pagado)} tono="exito" testid="kpi-monto-pagado" />
        <Kpi label="Monto pendiente" valor={moneda(totales.monto_pendiente)} tono="aviso" testid="kpi-monto-pendiente" />
      </div>

      <div className="border-t border-borde pt-3" data-testid="antiguedad-estado">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
          Antigüedad promedio por estado (días)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {porEstado.map((e) => (
            <div key={e.estado} className="text-center bg-pagina border border-borde rounded p-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">{e.etiqueta}</div>
              <div className="text-sm font-bold text-sigecop-blue">
                {e.antiguedad_prom_dias != null ? `${e.antiguedad_prom_dias} d` : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContadoresEstado({ porEstado }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6" data-testid="contadores-estado">
      {porEstado.map((e) => (
        <div
          key={e.estado}
          className="bg-white border border-borde rounded-lg p-3 text-center"
          data-testid={`contador-estado-${e.estado}`}
        >
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{e.etiqueta}</div>
          <div className="text-2xl font-bold text-sigecop-blue mt-1">{e.n}</div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{moneda(e.monto_neto)}</div>
        </div>
      ))}
    </div>
  );
}

function TarjetaEstimacion({ est }) {
  return (
    <div
      className="bg-white border border-borde rounded-lg p-4 hover:shadow-sm transition-shadow"
      data-testid={`tarjeta-est-${est.folio}-${est.numero}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            {est.folio} · Estimación
          </div>
          <div className="text-lg font-bold text-sigecop-blue">N.º {est.numero}</div>
        </div>
        <EstadoBadge estado={est.estado} etiqueta={est.etiqueta} />
      </div>
      <div className="text-sm text-slate-700">
        Periodo <strong>{est.periodo}</strong>
      </div>
      <div className="text-sm text-slate-700 font-mono mt-0.5">{moneda(est.neto)}</div>
      <div className="text-xs text-slate-500 mt-0.5">
        Responsable: <strong>{est.responsable ? (NOMBRE_ROL[est.responsable] ?? est.responsable) : '—'}</strong>
      </div>
      <MiniStepper estado={est.estado} />
    </div>
  );
}

export default function TableroEstimaciones() {
  const { rol } = useSesion();

  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [fEstado, setFEstado] = useState('Todos');
  const [fPeriodo, setFPeriodo] = useState('Todos');
  const [fResponsable, setFResponsable] = useState('Todos');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const d = await api.tableroEstimaciones();
      setData(d);
    } catch (e) {
      setError(e?.message || 'No se pudo cargar el tablero');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const tarjetas = data?.estimaciones ?? [];
  const porEstado = data?.por_estado ?? [];
  const totales = data?.totales ?? { contratos: 0, monto_estimado: '0.00', monto_pagado: '0.00', monto_pendiente: '0.00' };
  const pendientes = data?.mis_pendientes ?? [];

  // Catálogos de filtros derivados de los datos reales (consultativos, client-side).
  const opcionesEstado = useMemo(
    () => ['Todos', ...porEstado.filter((e) => e.en_grid).map((e) => e.estado)],
    [porEstado]
  );
  const opcionesPeriodo = useMemo(() => ['Todos', ...(data?.periodos ?? [])], [data]);
  const opcionesResponsable = useMemo(() => {
    const set = new Set(tarjetas.map((t) => t.responsable).filter(Boolean));
    return ['Todos', ...set];
  }, [tarjetas]);

  const etiquetaDeEstado = useMemo(
    () => new Map(porEstado.map((e) => [e.estado, e.etiqueta])),
    [porEstado]
  );

  const filtradas = useMemo(() => {
    return tarjetas.filter((t) => {
      if (fEstado !== 'Todos' && t.estado !== fEstado) return false;
      if (fPeriodo !== 'Todos' && t.periodo !== fPeriodo) return false;
      if (fResponsable !== 'Todos' && t.responsable !== fResponsable) return false;
      return true;
    });
  }, [tarjetas, fEstado, fPeriodo, fResponsable]);

  return (
    <div>
      <HeaderVista
        huId="HU-17"
        titulo="Tablero de estimaciones"
        sprint="Sprint 8"
        rolAcademico="Residente"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Estimaciones' },
          { label: 'Tablero' },
        ]}
      />

      {/* UI-1: EncabezadoContrato (sistema de diseño guinda); mismo contenido. */}
      <EncabezadoContrato
        titulo="Cartera"
        folio={`${totales.contratos} contrato(s)`}
        items={[{ value: `${data?.estimaciones?.length ?? 0} estimación(es) en proceso` }]}
      />

      {cargando ? (
        <div className="bg-white border border-borde rounded-lg p-8 text-center text-slate-400 italic" data-testid="tablero-cargando">
          Cargando tablero…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-5 text-sm text-red-700" data-testid="tablero-error">
          {error}
          <button onClick={cargar} className="ml-3 underline font-semibold">Reintentar</button>
        </div>
      ) : (
        <>
          <IndicadoresAgregados totales={totales} porEstado={porEstado} />

          <ContadoresEstado porEstado={porEstado} />

          {/* Filtros del tablero — consultativos, fuera de RegionEditable. */}
          <div className="bg-white border border-borde rounded-lg p-5 mb-6" data-testid="filtros-tablero">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="sg-label">Estado</label>
                <select className="sg-input" value={fEstado} onChange={(e) => setFEstado(e.target.value)} data-testid="filtro-estado">
                  {opcionesEstado.map((s) => (
                    <option key={s} value={s}>{s === 'Todos' ? 'Todos' : (etiquetaDeEstado.get(s) ?? s)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="sg-label">Periodo</label>
                <select className="sg-input" value={fPeriodo} onChange={(e) => setFPeriodo(e.target.value)} data-testid="filtro-periodo">
                  {opcionesPeriodo.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="sg-label">Responsable</label>
                <select className="sg-input" value={fResponsable} onChange={(e) => setFResponsable(e.target.value)} data-testid="filtro-responsable">
                  {opcionesResponsable.map((r) => (
                    <option key={r} value={r}>{r === 'Todos' ? 'Todos' : (NOMBRE_ROL[r] ?? r)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-borde rounded-lg p-5 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-1">
              Estimaciones aceptadas y en proceso ({filtradas.length})
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              No se muestran las rechazadas — su historial está en HU-14.
            </p>
            {filtradas.length === 0 ? (
              <div className="text-sm text-slate-400 italic" data-testid="tablero-vacio">
                Sin estimaciones con los filtros aplicados.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-estimaciones">
                {filtradas.map((est) => (
                  <TarjetaEstimacion key={`${est.folio}-${est.numero}`} est={est} />
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-borde rounded-lg p-5 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-1">Mis pendientes</h2>
            <p className="text-xs text-slate-500 mb-3">
              Pendientes para tu rol{rol ? ` (${NOMBRE_ROL[rol] ?? rol})` : ''}, según el estado de cada estimación.
            </p>
            {pendientes.length === 0 ? (
              <div className="text-sm text-slate-400 italic" data-testid="mis-pendientes-vacio">
                No tienes pendientes en este momento.
              </div>
            ) : (
              <ul className="space-y-2" data-testid="mis-pendientes">
                {pendientes.map((p) => (
                  <li
                    key={p.estimacion_id}
                    className="flex items-start gap-2 text-sm text-slate-800 bg-sigecop-blue-light/40 px-3 py-2 rounded-md"
                    data-testid="pendiente-item"
                  >
                    <span className="text-sigecop-accent">▸</span>
                    <span>
                      <strong>{p.folio} · Estimación N.º {p.numero}</strong> — {p.accion}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <SeccionCriterios
        huId="HU-17"
        criterios={[
          { numero: 1, texto: 'El tablero muestra solo estimaciones aceptadas y en proceso (no las rechazadas, que viven en el historial).' },
          { numero: 2, texto: 'Cada estimación muestra su línea de tiempo de estado, y el tablero da indicadores agregados (conteos y montos por estado y por contrato), calculados server-side.' },
          { numero: 3, texto: 'El panel "Mis pendientes" filtra los pendientes según el rol del usuario autenticado.' },
        ]}
      />
    </div>
  );
}
