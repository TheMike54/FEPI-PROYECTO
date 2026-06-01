import { useState, useEffect, useMemo, useCallback } from 'react';
import Tabs from '../components/ui/Tab.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import BuscadorNotas, { useFiltrosNotas } from '../components/notas/BuscadorNotas.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// HU-12 Fase 3 — cableado al backend real. El superintendente del contrato integra
// la estimación del periodo como expediente (art. 132 RLOPSRM). Toda la verdad del
// dinero la calcula el backend al integrar; la carátula del cliente es SOLO preview.
// El buscador de notas REUSA el componente compartido de HU-10 (BuscadorNotas).

const fmtMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneda = (n) => fmtMXN.format(Number(n) || 0);
const num = (n) => (Number(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 4 });
// dd/mm/aaaa sin corrimiento de zona horaria (parte de fecha de un ISO/Date).
const fechaMX = (iso) => {
  const p = (iso || '').slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : '—';
};
const EPS = 1e-6;

const CLASE_ESTADO = {
  integrada: 'bg-sigecop-blue-light text-sigecop-blue',
  enviada: 'bg-amber-100 text-amber-800',
  autorizada: 'bg-green-100 text-sigecop-green-validation',
  pagada: 'bg-green-100 text-sigecop-green-validation',
  rechazada: 'bg-red-100 text-red-700'
};
const BadgeEstado = ({ estado }) => (
  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${CLASE_ESTADO[estado] || 'bg-slate-100 text-slate-600'}`}>
    {estado}
  </span>
);

// ---------------------------------------------------------------------------
// Modal de vinculación de notas — REUSA el BuscadorNotas de HU-10. El padre le
// pasa las notas REALES del contrato (notasDeContrato), el catálogo de tipos y
// el Set de ids ya vinculados (excluirIds). Se monta/desmonta por apertura, así
// que la selección arranca limpia cada vez.
// ---------------------------------------------------------------------------
function ModalVincularNotas({ onCerrar, onConfirmar, notas, tipos, yaVinculadas }) {
  const excluir = useMemo(() => new Set(yaVinculadas), [yaVinculadas]);
  const { filtros, setFiltro, limpiar, resultados, firmantesUnicos, numeroPorId } = useFiltrosNotas(notas, { excluirIds: excluir });
  const [seleccionadas, setSeleccionadas] = useState(() => new Set());

  const toggle = (id) => setSeleccionadas((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const toggleTodas = () => setSeleccionadas((prev) => {
    const todas = resultados.length > 0 && resultados.every((n) => prev.has(n.id));
    const n = new Set(prev);
    resultados.forEach((r) => (todas ? n.delete(r.id) : n.add(r.id)));
    return n;
  });

  const confirmar = () => onConfirmar(notas.filter((n) => seleccionadas.has(n.id)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4" data-testid="modal-vincular-notas">
      <div className="bg-white rounded-md shadow-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-sigecop-blue">Buscar y vincular notas de bitácora</h3>
          <button type="button" className="text-slate-400 hover:text-slate-700 text-xl leading-none" onClick={onCerrar} aria-label="Cerrar">×</button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-4">
          {notas.length === 0 ? (
            <p className="p-8 text-center text-slate-400 italic" data-testid="mb-sin-notas">
              Este contrato no tiene notas de bitácora para vincular.
            </p>
          ) : (
            <BuscadorNotas
              filtros={filtros}
              setFiltro={setFiltro}
              onLimpiar={limpiar}
              tipos={tipos}
              firmantesUnicos={firmantesUnicos}
              resultados={resultados}
              numeroPorId={numeroPorId}
              seleccionadas={seleccionadas}
              onToggle={toggle}
              onToggleTodas={toggleTodas}
              idPrefix="mb-"
            />
          )}
        </div>
        <div className="px-6 py-3 border-t border-slate-200 flex justify-end gap-3">
          <button type="button" className="px-4 py-2 text-slate-600 hover:text-slate-900" onClick={onCerrar}>Cancelar</button>
          <button
            type="button"
            className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed"
            disabled={seleccionadas.size === 0}
            onClick={confirmar}
            data-testid="mb-btn-confirmar"
          >
            Vincular {seleccionadas.size > 0 ? `(${seleccionadas.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detalle de una estimación del historial (PASO 7) — datos REALES del backend
// (GET /estimaciones/:id): carátula + generadores (importe/acumulado/% avance) +
// notas vinculadas + estado.
// ---------------------------------------------------------------------------
function ModalDetalle({ estimacion, onCerrar }) {
  const e = estimacion;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4" data-testid="modal-detalle">
      <div className="bg-white rounded-md shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-sigecop-blue">
            Estimación #{e.numero} · {fechaMX(e.periodo_inicio)} – {fechaMX(e.periodo_fin)} <BadgeEstado estado={e.estado} />
          </h3>
          <button type="button" className="text-slate-400 hover:text-slate-700 text-xl leading-none" onClick={onCerrar} aria-label="Cerrar">×</button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-2">Carátula</h4>
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-200"><td className="px-4 py-2">Subtotal</td><td className="px-4 py-2 text-right font-mono">{moneda(e.subtotal)}</td></tr>
                  <tr className="border-b border-slate-200"><td className="px-4 py-2">(−) Amortización de anticipo ({Number(e.anticipo_pct_snapshot)}%)</td><td className="px-4 py-2 text-right font-mono">−{moneda(e.amortizacion)}</td></tr>
                  <tr className="border-b border-slate-200"><td className="px-4 py-2">(−) Retención 5 al millar (art. 191 LFD)</td><td className="px-4 py-2 text-right font-mono">−{moneda(e.retencion)}</td></tr>
                  <tr className="border-b border-slate-200"><td className="px-4 py-2">(−) Deductivas</td><td className="px-4 py-2 text-right font-mono">−{moneda(e.deductivas)}</td></tr>
                  <tr className="bg-sigecop-blue-light font-bold"><td className="px-4 py-2 text-sigecop-blue">(=) Neto (sin IVA)</td><td className="px-4 py-2 text-right font-mono text-sigecop-blue" data-testid="detalle-neto">{moneda(e.neto)}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-1">Integró: {e.integrada_por_nombre || '—'} · {fechaMX(e.integrada_en)}</p>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-2">Números generadores</h4>
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left p-2 font-semibold">Concepto</th>
                    <th className="text-right p-2 font-semibold">PU</th>
                    <th className="text-right p-2 font-semibold">Este periodo</th>
                    <th className="text-right p-2 font-semibold">Acumulado</th>
                    <th className="text-right p-2 font-semibold">Importe</th>
                    <th className="text-right p-2 font-semibold">% avance</th>
                  </tr>
                </thead>
                <tbody>
                  {(e.generadores || []).map((g) => (
                    <tr key={g.id} className="border-t border-slate-200">
                      <td className="p-2">{g.concepto} <span className="text-slate-400">({g.unidad})</span></td>
                      <td className="p-2 text-right font-mono text-xs">{moneda(g.pu_snapshot)}</td>
                      <td className="p-2 text-right">{num(g.cantidad_periodo)}</td>
                      <td className="p-2 text-right">{num(g.acumulado)} <span className="text-slate-400 text-xs">/ {num(g.cantidad_contratada)}</span></td>
                      <td className="p-2 text-right font-mono">{moneda(g.importe)}</td>
                      <td className="p-2 text-right">{g.avance_pct != null ? `${Number(g.avance_pct)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-2">Notas vinculadas ({(e.notas || []).length})</h4>
            {(e.notas || []).length === 0 ? (
              <p className="text-sm text-slate-400 italic">Sin notas vinculadas.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="text-left p-2 font-semibold">Folio</th>
                      <th className="text-left p-2 font-semibold">Tipo</th>
                      <th className="text-left p-2 font-semibold">Fecha</th>
                      <th className="text-left p-2 font-semibold">Asunto</th>
                      <th className="text-left p-2 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(e.notas || []).map((n) => (
                      <tr key={n.nota_id} className="border-t border-slate-200">
                        <td className="p-2 font-mono text-xs">#{n.numero}</td>
                        <td className="p-2">{n.tipo}</td>
                        <td className="p-2">{fechaMX(n.fecha)}</td>
                        <td className="p-2 text-slate-700">{n.asunto || '—'}</td>
                        <td className="p-2">{n.estado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-3 border-t border-slate-200 flex justify-end">
          <button type="button" className="sg-btn-secondary" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// --------------------------- Tabs internos --------------------------------

function TabGeneradores({ filas, onCantidad }) {
  if (filas.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-bold text-sigecop-blue mb-4">Números generadores del periodo</h3>
        <p className="text-sm text-slate-500 italic">Este contrato no tiene catálogo de conceptos; no hay generadores que capturar.</p>
      </div>
    );
  }
  const hayExceso = filas.some((f) => f.excede);
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Números generadores del periodo</h3>
      <p className="text-sm text-slate-600 mb-3">
        Captura la cantidad ejecutada este periodo por concepto. El importe, el acumulado y el % de
        avance se calculan en vivo contra el catálogo y el acumulado previo (art. 118 RLOPSRM).
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-md mb-3">
        <table className="w-full text-sm" data-testid="tabla-generadores">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2">Concepto</th>
              <th className="text-left px-3 py-2 w-16">Unidad</th>
              <th className="text-right px-3 py-2 w-28">Contratado</th>
              <th className="text-right px-3 py-2 w-28">Acum. previo</th>
              <th className="text-right px-3 py-2 w-32">PU</th>
              <th className="text-right px-3 py-2 w-32">Este periodo</th>
              <th className="text-right px-3 py-2 w-32">Importe</th>
              <th className="text-right px-3 py-2 w-28">Acumulado</th>
              <th className="text-right px-3 py-2 w-24">% avance</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.contrato_concepto_id} className={`border-t border-slate-200 ${f.excede ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                <td className="px-3 py-2">
                  {f.excede && <span title="Excede lo contratado" className="text-red-600 mr-1">⚠</span>}
                  {f.concepto}
                </td>
                <td className="px-3 py-2 text-slate-600">{f.unidad}</td>
                <td className="px-3 py-2 text-right">{num(f.contratado)}</td>
                <td className="px-3 py-2 text-right text-slate-600">{num(f.anterior)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs text-slate-600">{moneda(f.pu)}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={`sg-input text-right ${f.excede ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                    value={f.valor}
                    onChange={(e) => onCantidad(f.contrato_concepto_id, e.target.value)}
                    data-testid={`gen-cantidad-${f.contrato_concepto_id}`}
                  />
                </td>
                <td className="px-3 py-2 text-right font-mono">{moneda(f.importe)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${f.excede ? 'text-red-700' : ''}`}>{num(f.acumulado)}</td>
                <td className={`px-3 py-2 text-right ${f.excede ? 'text-red-700 font-bold' : ''}`}>{f.avancePct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hayExceso ? (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 text-sm text-red-800 rounded-r-md" data-testid="aviso-exceso">
          <strong>⚠ La cantidad acumulada excede lo contratado</strong> en uno o más conceptos. Ajusta las
          cantidades o tramita un convenio modificatorio (art. 118 RLOPSRM). No se puede integrar así.
        </div>
      ) : (
        <div className="bg-green-50 border-l-4 border-sigecop-green-validation px-4 py-3 text-sm text-sigecop-green-validation rounded-r-md">
          ✓ Las cantidades acumuladas están dentro de lo contratado.
        </div>
      )}
    </div>
  );
}

function TabCaratula({ caratula, anticipoPct, deductivas, onDeductivas }) {
  const renglones = [
    { label: 'Subtotal del periodo', importe: caratula.subtotal, formula: 'Σ (cantidad_periodo × PU) de los generadores con avance' },
    { label: `(−) Amortización de anticipo (${anticipoPct}%)`, importe: -caratula.amortizacion, formula: `subtotal × ${anticipoPct}/100 (art. 143 fr. I RLOPSRM)` },
    { label: '(−) Retención 5 al millar (art. 191 LFD)', importe: -caratula.retencion, formula: 'subtotal × 0.005' }
  ];
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-1">Carátula de cálculo</h3>
      <p className="text-xs text-amber-700 mb-3 italic">
        Vista previa que recalcula al teclear. El neto OFICIAL lo materializa el backend al integrar
        (fuente única de verdad, sin IVA — art. 2 fr. XIX RLOPSRM).
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-md mb-4 max-w-2xl">
        <table className="w-full text-sm" data-testid="tabla-caratula-preview">
          <tbody>
            {renglones.map((r, i) => (
              <tr key={i} className="border-t border-slate-200" title={r.formula}>
                <td className="px-4 py-3 text-slate-800">{r.label}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-800">{moneda(r.importe)}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-200">
              <td className="px-4 py-3 text-slate-800">(−) Deductivas (manual)</td>
              <td className="px-4 py-2 text-right">
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="sg-input text-right w-40 inline-block"
                  value={deductivas}
                  onChange={(e) => onDeductivas(e.target.value)}
                  data-testid="caratula-deductivas"
                />
              </td>
            </tr>
            <tr className={`border-t border-slate-200 font-bold ${caratula.neto < 0 ? 'bg-red-50' : 'bg-sigecop-blue-light'}`}>
              <td className={`px-4 py-3 ${caratula.neto < 0 ? 'text-red-700' : 'text-sigecop-blue'}`}>(=) Neto a pagar (preview)</td>
              <td className={`px-4 py-3 text-right font-mono text-base ${caratula.neto < 0 ? 'text-red-700' : 'text-sigecop-blue'}`} data-testid="caratula-neto-preview">
                {moneda(caratula.neto)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {caratula.neto < 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 text-sm text-red-800 rounded-r-md mb-3">
          Las deductivas dejan el neto en negativo; el backend rechazará la integración (ajusta las deductivas).
        </div>
      )}
      <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-3 text-sm text-blue-900 rounded-r-md max-w-2xl">
        Amortización del anticipo conforme al <strong>art. 143 fr. I RLOPSRM</strong> y retención del{' '}
        <strong>5 al millar (art. 191 LFD)</strong>. La estimación se calcula <strong>sin IVA</strong>.
      </div>
    </div>
  );
}

function TabNotasVinculadas({ vinculadas, onAbrir, onQuitar, soloLectura }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-bold text-sigecop-blue">Notas vinculadas a esta estimación ({vinculadas.length})</h3>
        {!soloLectura && (
          <button type="button" className="sg-btn-secondary" onClick={onAbrir} data-testid="btn-abrir-buscador-notas">
            🔍 Buscar y vincular notas de bitácora
          </button>
        )}
      </div>
      <p className="text-sm text-slate-600 mb-4">
        Las notas de bitácora vinculadas forman parte del expediente de la estimación (art. 132 fr. II RLOPSRM).
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm" data-testid="tabla-notas-vinculadas">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left p-3 font-semibold">Folio</th>
              <th className="text-left p-3 font-semibold">Tipo</th>
              <th className="text-left p-3 font-semibold">Fecha</th>
              <th className="text-left p-3 font-semibold">Firmante</th>
              <th className="text-left p-3 font-semibold">Asunto</th>
              <th className="text-center p-3 font-semibold w-24">Quitar</th>
            </tr>
          </thead>
          <tbody>
            {vinculadas.length === 0 ? (
              <tr><td colSpan="6" className="p-6 text-center text-slate-400 italic">Sin notas vinculadas.</td></tr>
            ) : (
              vinculadas.map((n) => (
                <tr key={n.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs">#{n.numero}</td>
                  <td className="p-3">{n.tipo_etiqueta || n.tipo}</td>
                  <td className="p-3">{fechaMX(n.fecha)}</td>
                  <td className="p-3">{n.emisor_nombre || '—'}</td>
                  <td className="p-3 text-slate-700">{n.asunto || '—'}</td>
                  <td className="p-3 text-center">
                    {!soloLectura && (
                      <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => onQuitar(n.id)}>Quitar</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabPlaceholder({ titulo }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">{titulo}</h3>
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-md p-8 text-center text-slate-400">
        <div className="text-4xl mb-2">🗂️</div>
        <p className="text-sm">Carga de archivos diferida a una etapa siguiente (como en el prototipo).</p>
      </div>
    </div>
  );
}

// ------------------------------ Página ------------------------------------

export default function IntegracionEstimacion() {
  const { token, usuario } = useSesion();
  const { soloLectura } = useVistaHU('HU-12');
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [tipos, setTipos] = useState([]);

  const [avance, setAvance] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [notasContrato, setNotasContrato] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [cantidades, setCantidades] = useState({}); // { [contrato_concepto_id]: string }
  const [deductivas, setDeductivas] = useState('0');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFin, setPeriodoFin] = useState('');
  const [notasVinculadas, setNotasVinculadas] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);

  const [integrando, setIntegrando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorIntegrar, setErrorIntegrar] = useState(null);
  const [detalle, setDetalle] = useState(null);

  const selected = useMemo(() => contratos.find((c) => String(c.id) === String(contratoId)) || null, [contratos, contratoId]);
  const anticipoPct = selected && selected.anticipo_pct != null ? Number(selected.anticipo_pct) : 0;
  const esSuperintendente = selected && usuario && selected.superintendente_id === usuario.id;

  // Carga inicial: contratos del usuario + catálogo de tipos de nota (para el modal).
  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
    api.notaTipos().then((t) => setTipos(Array.isArray(t) ? t : [])).catch(() => setTipos([]));
  }, [sinSesion]);

  const recargarAvance = useCallback(async (id) => {
    const data = await api.avanceContrato(id);
    setAvance(Array.isArray(data) ? data : []);
  }, []);
  const recargarHistorial = useCallback(async (id) => {
    const data = await api.estimacionesDeContrato(id);
    setHistorial(Array.isArray(data) ? data : []);
  }, []);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id);
    setAvance([]); setHistorial([]); setNotasContrato([]);
    setCantidades({}); setDeductivas('0'); setPeriodoInicio(''); setPeriodoFin('');
    setNotasVinculadas([]); setResultado(null); setErrorIntegrar(null);
    if (!id) return;
    setCargando(true);
    try {
      await Promise.all([recargarAvance(id), recargarHistorial(id)]);
      // Notas del contrato para el modal (404 = sin bitácora → simplemente no hay notas).
      try {
        const n = await api.notasDeContrato(id);
        setNotasContrato(Array.isArray(n?.notas) ? n.notas : []);
      } catch (e) {
        if (e.status !== 404) throw e;
        setNotasContrato([]);
      }
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a las estimaciones de este contrato' : 'No se pudieron cargar los datos del contrato');
    } finally {
      setCargando(false);
    }
  }, [recargarAvance, recargarHistorial, showToast]);

  const filas = useMemo(() => avance.map((a) => {
    const valor = cantidades[a.contrato_concepto_id] ?? '';
    const periodo = Number(valor) || 0;
    const contratado = Number(a.cantidad_contratada);
    const anterior = Number(a.acumulado_anterior);
    const pu = Number(a.pu);
    const acumulado = anterior + periodo;
    const excede = acumulado > contratado + EPS;
    const avancePct = contratado > 0 ? (acumulado / contratado) * 100 : 0;
    return { ...a, valor, periodo, contratado, anterior, pu, acumulado, excede, avancePct, importe: periodo * pu };
  }), [avance, cantidades]);

  const hayExceso = filas.some((f) => f.excede);
  const hayLineas = filas.some((f) => f.periodo > 0);

  const caratula = useMemo(() => {
    const subtotal = filas.reduce((s, f) => s + (f.periodo > 0 ? f.importe : 0), 0);
    const amortizacion = subtotal * anticipoPct / 100;
    const retencion = subtotal * 0.005;
    const deduc = Number(deductivas) || 0;
    return { subtotal, amortizacion, retencion, neto: subtotal - amortizacion - retencion - deduc };
  }, [filas, anticipoPct, deductivas]);

  const onCantidad = (cid, valor) => setCantidades((prev) => ({ ...prev, [cid]: valor }));

  const idsVinculados = useMemo(() => notasVinculadas.map((n) => n.id), [notasVinculadas]);
  const confirmarNotas = (elegidas) => {
    setNotasVinculadas((prev) => {
      const existentes = new Set(prev.map((n) => n.id));
      return [...prev, ...elegidas.filter((n) => !existentes.has(n.id))];
    });
    setModalAbierto(false);
  };
  const quitarNota = (id) => setNotasVinculadas((prev) => prev.filter((n) => n.id !== id));

  const integrar = async () => {
    if (!contratoId || hayExceso || integrando) return;
    const generadores = filas.filter((f) => f.periodo > 0).map((f) => ({ contrato_concepto_id: f.contrato_concepto_id, cantidad_periodo: f.periodo }));
    if (generadores.length === 0) { showToast('Captura al menos un concepto con cantidad mayor a 0'); return; }
    if (!periodoInicio || !periodoFin) { showToast('Indica el periodo (inicio y fin)'); return; }
    setIntegrando(true); setErrorIntegrar(null);
    try {
      const est = await api.integrarEstimacion({
        contrato_id: Number(contratoId),
        periodo_inicio: periodoInicio,
        periodo_fin: periodoFin,
        deductivas: Number(deductivas) || 0,
        generadores,
        notas: notasVinculadas.map((n) => n.id)
      });
      setResultado(est);
      showToast(`Estimación #${est.numero} integrada`);
      // El acumulado y el historial cambiaron: recargar y limpiar el formulario.
      await Promise.all([recargarAvance(contratoId), recargarHistorial(contratoId)]);
      setCantidades({}); setDeductivas('0'); setPeriodoInicio(''); setPeriodoFin(''); setNotasVinculadas([]);
    } catch (e) {
      // Errores localizados del backend tal cual (400 periodo>1 mes / neto<0; 409
      // exceso art.118 / solape; 403 no superintendente).
      const msg = e.payload?.error || e.message || 'No se pudo integrar la estimación';
      setErrorIntegrar(msg);
      showToast(msg);
    } finally {
      setIntegrando(false);
    }
  };

  const verDetalle = async (id) => {
    try {
      const d = await api.detalleEstimacion(id);
      setDetalle(d);
    } catch (e) {
      showToast(e.payload?.error || 'No se pudo cargar el detalle');
    }
  };

  const wrapTab = (node) => <RegionEditable disabled={soloLectura}>{node}</RegionEditable>;

  const tabs = [
    { label: 'Carátula', content: wrapTab(<TabCaratula caratula={caratula} anticipoPct={anticipoPct} deductivas={deductivas} onDeductivas={setDeductivas} />) },
    { label: 'Números generadores', content: wrapTab(<TabGeneradores filas={filas} onCantidad={onCantidad} />) },
    { label: 'Registro fotográfico', content: wrapTab(<TabPlaceholder titulo="Registro fotográfico del periodo" />) },
    { label: 'Soportes', content: wrapTab(<TabPlaceholder titulo="Soportes documentales" />) },
    { label: `Notas vinculadas (${notasVinculadas.length})`, content: wrapTab(
      <TabNotasVinculadas vinculadas={notasVinculadas} onAbrir={() => setModalAbierto(true)} onQuitar={quitarNota} soloLectura={soloLectura} />
    ) }
  ];

  const integrarDeshabilitado = soloLectura || integrando || hayExceso || !hayLineas;

  return (
    <div>
      <HeaderVista
        huId="HU-12"
        titulo="Apertura del periodo e integración de la estimación"
        sprint="Sprint 3"
        rolAcademico="Contratista"
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Estimaciones' }, { label: 'Integración del periodo' }]}
      />

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión en modo aplicación para cargar tus contratos e integrar estimaciones.
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
        <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para integrar la estimación de su periodo.</p>
      )}
      {cargando && <p className="text-sm text-slate-500 mb-4">Cargando datos del contrato…</p>}

      {selected && (
        <>
          <BannerContexto
            variant="slate"
            folio={selected.folio}
            folioLabel="Contrato"
            extra={[
              { label: 'Contratista:', value: selected.contratista || '—' },
              { label: 'Anticipo:', value: `${anticipoPct}%`, resaltado: true },
              { label: 'Estimaciones:', value: String(historial.length), resaltado: true }
            ]}
          />

          {!soloLectura && !esSuperintendente && (
            <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 mb-4 text-sm text-amber-800 rounded-r-md">
              Solo el <strong>superintendente asignado</strong> a este contrato puede integrar estimaciones; el servidor rechazará el intento si no lo eres.
            </div>
          )}

          {resultado && (
            <div className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 mb-4 rounded-r-md" data-testid="banner-integrada">
              <div className="text-sm font-semibold text-sigecop-green-validation">✓ Estimación #{resultado.numero} integrada</div>
              <p className="text-sm text-slate-800 mt-1">
                Carátula oficial del backend (fuente de verdad): subtotal {moneda(resultado.subtotal)} − amortización {moneda(resultado.amortizacion)} − retención {moneda(resultado.retencion)} − deductivas {moneda(resultado.deductivas)} = <strong>neto {moneda(resultado.neto)}</strong> (sin IVA). Estado: <BadgeEstado estado={resultado.estado} />.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Quedó registrada como expediente del periodo. El envío y la revisión por supervisión/residencia son etapas posteriores (HU-13/HU-15), aún no implementadas.
              </p>
            </div>
          )}

          {errorIntegrar && (
            <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 mb-4 text-sm text-red-800 rounded-r-md" data-testid="banner-error">
              <strong>No se integró:</strong> {errorIntegrar}
            </div>
          )}

          {!soloLectura && (
            <div className="bg-white border border-slate-200 rounded-md p-4 mb-6 max-w-2xl">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Apertura del periodo</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="sg-label">Periodo — inicio</label>
                  <input type="date" className="sg-input" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} data-testid="periodo-inicio" />
                </div>
                <div>
                  <label className="sg-label">Periodo — fin</label>
                  <input type="date" className="sg-input" value={periodoFin} onChange={(e) => setPeriodoFin(e.target.value)} data-testid="periodo-fin" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Periodo máximo de un mes (art. 54); no puede traslaparse con otra estimación del contrato.</p>
            </div>
          )}

          <Tabs tabs={tabs} />

          {!soloLectura && (
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed"
                onClick={integrar}
                disabled={integrarDeshabilitado}
                title={hayExceso ? 'Hay conceptos que exceden lo contratado' : (!hayLineas ? 'Captura al menos un concepto con cantidad > 0' : '')}
                data-testid="btn-integrar"
              >
                {integrando ? 'Integrando…' : 'Integrar estimación'}
              </button>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">Historial de estimaciones del contrato</h2>
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-sm" data-testid="tabla-historial">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left p-3 font-semibold">#</th>
                    <th className="text-left p-3 font-semibold">Periodo</th>
                    <th className="text-left p-3 font-semibold">Estado</th>
                    <th className="text-right p-3 font-semibold">Subtotal</th>
                    <th className="text-right p-3 font-semibold">Neto</th>
                    <th className="text-left p-3 font-semibold">Integró</th>
                    <th className="text-center p-3 font-semibold w-24">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.length === 0 ? (
                    <tr><td colSpan="7" className="p-6 text-center text-slate-400 italic">Este contrato aún no tiene estimaciones integradas.</td></tr>
                  ) : (
                    historial.map((e) => (
                      <tr key={e.id} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className="p-3 font-mono">{e.numero}</td>
                        <td className="p-3">{fechaMX(e.periodo_inicio)} – {fechaMX(e.periodo_fin)}</td>
                        <td className="p-3"><BadgeEstado estado={e.estado} /></td>
                        <td className="p-3 text-right font-mono">{moneda(e.subtotal)}</td>
                        <td className="p-3 text-right font-mono">{moneda(e.neto)}</td>
                        <td className="p-3">{e.integrada_por_nombre || '—'}</td>
                        <td className="p-3 text-center">
                          <button type="button" className="text-xs text-sigecop-blue hover:underline" onClick={() => verDetalle(e.id)} data-testid={`btn-ver-detalle-${e.id}`}>Ver</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <SeccionCriterios
        huId="HU-12"
        criterios={[
          { numero: 1, texto: 'La estimación se integra como una sola entidad (carátula + números generadores + notas de bitácora vinculadas) calculada server-side.' },
          { numero: 2, texto: 'La carátula calcula amortización del anticipo, retención (5 al millar, art. 191 LFD) y deductivas; el neto es sin IVA (art. 2 fr. XIX RLOPSRM).' },
          { numero: 3, texto: 'El sistema bloquea la integración cuando una cantidad acumulada por concepto excede lo contratado (art. 118 RLOPSRM).' }
        ]}
      />

      {modalAbierto && (
        <ModalVincularNotas
          notas={notasContrato}
          tipos={tipos}
          yaVinculadas={idsVinculados}
          onConfirmar={confirmarNotas}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
      {detalle && <ModalDetalle estimacion={detalle} onCerrar={() => setDetalle(null)} />}
    </div>
  );
}
