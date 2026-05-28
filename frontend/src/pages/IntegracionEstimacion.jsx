import { useState, useMemo } from 'react';
import Tabs from '../components/ui/Tab.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import {
  contratoDummy,
  generadoresEstimacionDummy,
  fotosEstimacionDummy,
  soportesEstimacionDummy,
  notasBitacoraDummy,
  tiposNotaCatalogo
} from '../data/dummy.js';

// Periodo de la estimación dummy — alimenta los filtros por defecto del modal.
const PERIODO_DESDE = '2026-05-01';
const PERIODO_HASTA = '2026-05-31';

const moneda = (n) => {
  const abs = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return n < 0 ? `-$ ${abs}` : `$ ${abs}`;
};

// Calcula la carátula a partir de los generadores y los parámetros del contrato.
// Subtotal = Σ (cantidad_periodo × precio_unitario). Las deductivas y el % de
// anticipo vienen del contratoDummy.
function calcularCaratula(filas, anticipoPct, deductivas) {
  const subtotal = filas.reduce(
    (sum, f) => sum + (Number(f.periodo) || 0) * (f.pu || 0),
    0
  );
  const anticipoAmortizado = subtotal * (anticipoPct / 100);
  const retencion = subtotal * 0.005;
  const total = subtotal - anticipoAmortizado - retencion - deductivas;
  return { subtotal, anticipoAmortizado, retencion, deductivas, total };
}

// Normalización ILIKE sin acentos — la misma que HU-10.
function normalizar(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function TabCaratula({ caratula, anticipoPct }) {
  const renglones = [
    {
      label: 'Subtotal del periodo',
      importe: caratula.subtotal,
      tipo: 'positivo',
      formula: 'Σ (cantidad_periodo × precio_unitario) de los números generadores'
    },
    {
      label: `(−) Amortización de anticipo (${anticipoPct}%)`,
      importe: -caratula.anticipoAmortizado,
      tipo: 'deduccion',
      formula: `subtotal × ${anticipoPct / 100} (art. 50 LOPSRM)`
    },
    {
      label: '(−) Retención 5 al millar (art. 191 LFD)',
      importe: -caratula.retencion,
      tipo: 'deduccion',
      formula: 'subtotal × 0.005'
    },
    {
      label: '(−) Deductivas por penalización',
      importe: -caratula.deductivas,
      tipo: 'deduccion',
      formula: 'Deductivas registradas en el contrato'
    },
    {
      label: '(=) Total a pagar',
      importe: caratula.total,
      tipo: 'neto',
      formula: 'subtotal − amortización − retención − deductivas'
    }
  ];

  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Carátula de cálculo</h3>
      <p className="text-xs text-slate-500 mb-2 italic">
        Los importes se recalculan en vivo a partir de los números generadores. Pasa el cursor
        sobre cada renglón para ver la fórmula aplicada.
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-md mb-4">
        <table className="w-full text-sm" data-testid="tabla-caratula">
          <tbody>
            {renglones.map((r, i) => {
              const esNeto = r.tipo === 'neto';
              return (
                <tr
                  key={i}
                  className={`border-t border-slate-200 ${esNeto ? 'bg-sigecop-blue-light font-bold' : ''}`}
                  title={r.formula}
                  data-tipo={r.tipo}
                >
                  <td className={`px-4 py-3 ${esNeto ? 'text-sigecop-blue' : 'text-slate-800'}`}>
                    {r.label}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${esNeto ? 'text-sigecop-blue text-base' : 'text-slate-800'}`}
                    data-testid={esNeto ? 'caratula-total' : undefined}
                  >
                    {moneda(r.importe)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-3 text-sm text-blue-900 rounded-r-md">
        El 5 al millar se retiene conforme al <strong>art. 191 de la Ley Federal de Derechos</strong> sobre
        el importe de cada estimación. La amortización del anticipo se aplica conforme al{' '}
        <strong>art. 50 LOPSRM</strong>, proporcionalmente al avance del periodo.
      </div>
    </div>
  );
}

function TabGeneradores({ filas, onPeriodoChange }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Números generadores del periodo</h3>
      <p className="text-sm text-slate-600 mb-3">
        Captura las cantidades ejecutadas este periodo. El sistema calcula automáticamente
        el subtotal, el acumulado y el % de avance contra el catálogo del contrato.
      </p>

      <div className="overflow-x-auto border border-slate-200 rounded-md mb-3">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2">Concepto</th>
              <th className="text-left px-3 py-2 w-20">Unidad</th>
              <th className="text-right px-3 py-2 w-28">Contratado</th>
              <th className="text-right px-3 py-2 w-32">PU</th>
              <th className="text-right px-3 py-2 w-36">Este periodo</th>
              <th className="text-right px-3 py-2 w-28">Acumulado</th>
              <th className="text-right px-3 py-2 w-24">% avance</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr
                key={f.idx}
                className={`border-t border-slate-200 ${f.excede ? 'bg-red-50' : 'hover:bg-slate-50'}`}
              >
                <td className="px-3 py-2">
                  {f.excede && <span title="Excede lo contratado" className="text-red-600 mr-1">⚠</span>}
                  {f.concepto}
                </td>
                <td className="px-3 py-2 text-slate-600">{f.unidad}</td>
                <td className="px-3 py-2 text-right">{f.contratado.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono text-xs text-slate-600">
                  {moneda(f.pu)}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={`sg-input text-right ${f.excede ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                    value={f.periodo}
                    onChange={(e) => onPeriodoChange(f.idx, e.target.value)}
                    data-testid={`gen-periodo-${f.idx}`}
                  />
                </td>
                <td className={`px-3 py-2 text-right font-semibold ${f.excede ? 'text-red-700' : ''}`}>
                  {f.acumulado.toLocaleString()}
                </td>
                <td className={`px-3 py-2 text-right ${f.excede ? 'text-red-700 font-bold' : ''}`}>
                  {f.avance}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filas.some((f) => f.excede) ? (
        <div
          className="bg-red-50 border-l-4 border-red-500 px-4 py-3 text-sm text-red-800 rounded-r-md"
          data-testid="aviso-exceso"
        >
          <strong>⚠ La cantidad acumulada excede lo contratado en el catálogo</strong> en uno o más
          conceptos. Para integrar la estimación, ajusta las cantidades del periodo o gestiona un
          convenio modificatorio (art. 118 RLOPSRM).
        </div>
      ) : (
        <div className="bg-green-50 border-l-4 border-sigecop-green-validation px-4 py-3 text-sm text-sigecop-green-validation rounded-r-md">
          ✓ Todas las cantidades acumuladas están dentro de lo contratado.
        </div>
      )}
    </div>
  );
}

function TabFotografico({ descripciones, onDescripcionChange }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Registro fotográfico del periodo</h3>
      <p className="text-sm text-slate-600 mb-4">Carga de imágenes disponible en Sprint siguiente.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fotosEstimacionDummy.map((f) => (
          <div key={f.id} className="border border-slate-200 rounded-md overflow-hidden">
            <div className="aspect-video bg-slate-100 flex flex-col items-center justify-center text-slate-400">
              <div className="text-5xl mb-2">📷</div>
              <p className="text-xs px-4 text-center">Foto del avance — carga en Sprint siguiente</p>
            </div>
            <div className="p-3 bg-white border-t border-slate-200">
              <label className="sg-label">Descripción</label>
              <input
                className="sg-input"
                value={descripciones[f.id] ?? ''}
                onChange={(e) => onDescripcionChange(f.id, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabSoportes() {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Soportes documentales</h3>
      <p className="text-sm text-slate-600 mb-4">Documentos requeridos para integrar la estimación.</p>

      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left p-3 font-semibold">Documento</th>
              <th className="text-left p-3 font-semibold">Estado</th>
              <th className="text-center p-3 font-semibold w-40">Acción</th>
            </tr>
          </thead>
          <tbody>
            {soportesEstimacionDummy.map((s, i) => (
              <tr key={i} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="p-3">{s.documento}</td>
                <td className="p-3">
                  {s.cargado ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-sigecop-green-validation">
                      {s.estado}
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-slate-600">
                      {s.estado}
                    </span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <button
                    type="button"
                    disabled
                    title="Carga real en Sprint siguiente"
                    className="px-3 py-1.5 bg-slate-200 text-slate-400 rounded text-xs cursor-not-allowed"
                  >
                    📤 Cargar soporte
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">Carga real disponible en Sprint siguiente.</p>
    </div>
  );
}

const FILTROS_BUSCADOR_INICIAL = {
  tipo: 'Todos',
  fechaDesde: PERIODO_DESDE,
  fechaHasta: PERIODO_HASTA,
  firmante: 'Todos',
  vinculo: 'Todas',
  palabraClave: ''
};

// Modal de búsqueda y selección de notas — mismos filtros que HU-10 con AND.
// Recibe `yaVinculadas` (Set de folios) para excluirlas y `onConfirmar` con la
// lista de notas seleccionadas en esta apertura del modal.
function BuscadorNotasModal({ abierto, onCerrar, onConfirmar, yaVinculadas }) {
  const [filtros, setFiltros] = useState(FILTROS_BUSCADOR_INICIAL);
  const [seleccionadas, setSeleccionadas] = useState(new Set());

  const firmantesUnicos = useMemo(() => {
    const set = new Set(notasBitacoraDummy.map((n) => n.firmante));
    return ['Todos', ...Array.from(set).sort()];
  }, []);

  const setF = (k) => (e) => setFiltros({ ...filtros, [k]: e.target.value });

  const resultados = useMemo(() => {
    if (!abierto) return [];
    const palabraNorm = normalizar(filtros.palabraClave);
    return notasBitacoraDummy.filter((n) => {
      if (yaVinculadas.has(n.folio)) return false;
      if (filtros.tipo !== 'Todos' && n.tipo !== filtros.tipo) return false;
      if (filtros.fechaDesde && n.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && n.fecha > filtros.fechaHasta) return false;
      if (filtros.firmante !== 'Todos' && n.firmante !== filtros.firmante) return false;
      if (filtros.vinculo === 'Vinculadas' && !n.vinculadaA) return false;
      if (filtros.vinculo === 'Sin vínculo' && n.vinculadaA) return false;
      if (palabraNorm) {
        const haystack = normalizar(`${n.asunto || ''} ${n.contenido || ''}`);
        if (!haystack.includes(palabraNorm)) return false;
      }
      return true;
    });
  }, [abierto, filtros, yaVinculadas]);

  const toggle = (folio) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(folio)) next.delete(folio);
      else next.add(folio);
      return next;
    });
  };

  const limpiarYCerrar = () => {
    setFiltros(FILTROS_BUSCADOR_INICIAL);
    setSeleccionadas(new Set());
    onCerrar();
  };

  const confirmar = () => {
    const notas = resultados.filter((n) => seleccionadas.has(n.folio));
    onConfirmar(notas);
    setFiltros(FILTROS_BUSCADOR_INICIAL);
    setSeleccionadas(new Set());
  };

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4"
      data-testid="modal-buscar-notas"
    >
      <div className="bg-white rounded-md shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-sigecop-blue">Buscar y vincular notas de bitácora</h3>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-700 text-xl leading-none"
            onClick={limpiarYCerrar}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="sg-label">Tipo</label>
              <select className="sg-input" value={filtros.tipo} onChange={setF('tipo')} data-testid="mb-tipo">
                <option>Todos</option>
                {tiposNotaCatalogo.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="sg-label">Fecha desde</label>
              <input type="date" className="sg-input" value={filtros.fechaDesde} onChange={setF('fechaDesde')} />
            </div>
            <div>
              <label className="sg-label">Fecha hasta</label>
              <input type="date" className="sg-input" value={filtros.fechaHasta} onChange={setF('fechaHasta')} />
            </div>
            <div>
              <label className="sg-label">Firmante</label>
              <select className="sg-input" value={filtros.firmante} onChange={setF('firmante')}>
                {firmantesUnicos.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="sg-label">Vínculo</label>
              <select className="sg-input" value={filtros.vinculo} onChange={setF('vinculo')}>
                <option>Todas</option>
                <option>Vinculadas</option>
                <option>Sin vínculo</option>
              </select>
            </div>
            <div>
              <label className="sg-label">Palabra clave</label>
              <input
                className="sg-input"
                value={filtros.palabraClave}
                onChange={setF('palabraClave')}
                placeholder="ILIKE sin acentos"
                data-testid="mb-palabra"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-3">
          <table className="w-full text-sm" data-testid="mb-tabla-resultados">
            <thead className="bg-slate-50 text-slate-700 sticky top-0">
              <tr>
                <th className="w-10 p-2"></th>
                <th className="text-left p-2 font-semibold">Folio</th>
                <th className="text-left p-2 font-semibold">Tipo</th>
                <th className="text-left p-2 font-semibold">Fecha</th>
                <th className="text-left p-2 font-semibold">Firmante</th>
                <th className="text-left p-2 font-semibold">Asunto</th>
              </tr>
            </thead>
            <tbody>
              {resultados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-400 italic">
                    Sin resultados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                resultados.map((n) => (
                  <tr key={n.folio} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={seleccionadas.has(n.folio)}
                        onChange={() => toggle(n.folio)}
                        aria-label={`Seleccionar ${n.folio}`}
                      />
                    </td>
                    <td className="p-2 font-mono text-xs">{n.folio}</td>
                    <td className="p-2">{n.tipo}</td>
                    <td className="p-2">{n.fecha}</td>
                    <td className="p-2">{n.firmante}</td>
                    <td className="p-2 text-slate-700">{n.asunto}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 text-slate-600 hover:text-slate-900"
            onClick={limpiarYCerrar}
          >
            Cancelar
          </button>
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

function TabNotasVinculadas({ vinculadas, onAbrirBuscador, onQuitar, soloLectura }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-bold text-sigecop-blue">
          Notas vinculadas a esta estimación ({vinculadas.length})
        </h3>
        {!soloLectura && (
          <button
            type="button"
            className="sg-btn-secondary"
            onClick={onAbrirBuscador}
            data-testid="btn-abrir-buscador-notas"
          >
            🔍 Buscar y vincular notas de bitácora
          </button>
        )}
      </div>

      <p className="text-sm text-slate-600 mb-4">
        Selecciona las notas de bitácora que respaldan esta estimación. Las notas vinculadas
        forman parte de la entidad de la estimación junto con la carátula, los generadores, las
        fotos y los soportes documentales.
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
              <tr>
                <td colSpan="6" className="p-6 text-center text-slate-400 italic">
                  Sin notas vinculadas. Usa el botón "Buscar y vincular notas de bitácora".
                </td>
              </tr>
            ) : (
              vinculadas.map((n) => (
                <tr key={n.folio} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs">{n.folio}</td>
                  <td className="p-3">{n.tipo}</td>
                  <td className="p-3">{n.fecha}</td>
                  <td className="p-3">{n.firmante}</td>
                  <td className="p-3 text-slate-700">{n.asunto}</td>
                  <td className="p-3 text-center">
                    {!soloLectura && (
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => onQuitar(n.folio)}
                      >
                        Quitar
                      </button>
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

export default function IntegracionEstimacion() {
  const { soloLectura } = useVistaHU('HU-12');

  // Estado de cantidades por periodo — vive en el padre para no perderse al cambiar de tab.
  const [periodos, setPeriodos] = useState(
    generadoresEstimacionDummy.reduce((acc, g, i) => {
      acc[i] = g.periodoDefault;
      return acc;
    }, {})
  );

  // Notas de bitácora vinculadas a la estimación (acumulan tras cada confirmación
  // del modal). El estado del modal es independiente.
  const [notasVinculadas, setNotasVinculadas] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Descripciones de fotos en el padre — el tab se desmonta al cambiar de pestaña.
  const [descripcionesFotos, setDescripcionesFotos] = useState(
    fotosEstimacionDummy.reduce((acc, f) => {
      acc[f.id] = f.descripcion;
      return acc;
    }, {})
  );

  const handleDescripcionFoto = (id, valor) => {
    setDescripcionesFotos((prev) => ({ ...prev, [id]: valor }));
  };

  // Generadores con cálculo de exceso, acumulado y % de avance.
  const filasGeneradores = useMemo(() => {
    return generadoresEstimacionDummy.map((g, i) => {
      const periodo = Number(periodos[i]) || 0;
      const acumulado = g.anteriorAcum + periodo;
      const excede = acumulado > g.contratado;
      const avance = g.contratado > 0 ? Math.round((acumulado / g.contratado) * 100) : 0;
      return { ...g, idx: i, periodo, acumulado, excede, avance };
    });
  }, [periodos]);

  const hayExceso = filasGeneradores.some((f) => f.excede);

  // Carátula viva — depende de las cantidades del periodo y de los parámetros
  // del contrato (anticipoPct + deductivasPenalizacion).
  const caratula = useMemo(
    () => calcularCaratula(
      filasGeneradores,
      contratoDummy.anticipoPct,
      contratoDummy.deductivasPenalizacion
    ),
    [filasGeneradores]
  );

  const handlePeriodoChange = (idx, valor) => {
    setPeriodos((prev) => ({ ...prev, [idx]: valor }));
  };

  const foliosVinculados = useMemo(
    () => new Set(notasVinculadas.map((n) => n.folio)),
    [notasVinculadas]
  );

  const handleConfirmarBuscador = (notas) => {
    setNotasVinculadas((prev) => [...prev, ...notas]);
    setModalAbierto(false);
  };

  const handleQuitarVinculada = (folio) => {
    setNotasVinculadas((prev) => prev.filter((n) => n.folio !== folio));
  };

  // Estado local de "integrada" — el prototipo refleja el evento sin backend.
  const [integrada, setIntegrada] = useState(false);

  // Envolvemos el contenido de cada tab — NO el componente Tabs — para que en
  // solo-lectura los inputs queden disabled pero la navegación entre pestañas
  // siga viva.
  const wrapTab = (node) => (
    <RegionEditable disabled={soloLectura}>{node}</RegionEditable>
  );

  const tabs = [
    {
      label: 'Carátula',
      content: wrapTab(<TabCaratula caratula={caratula} anticipoPct={contratoDummy.anticipoPct} />)
    },
    {
      label: 'Números generadores',
      content: wrapTab(
        <TabGeneradores filas={filasGeneradores} onPeriodoChange={handlePeriodoChange} />
      )
    },
    {
      label: 'Registro fotográfico',
      content: wrapTab(
        <TabFotografico descripciones={descripcionesFotos} onDescripcionChange={handleDescripcionFoto} />
      )
    },
    { label: 'Soportes', content: wrapTab(<TabSoportes />) },
    {
      label: `Notas vinculadas (${notasVinculadas.length})`,
      content: wrapTab(
        <TabNotasVinculadas
          vinculadas={notasVinculadas}
          onAbrirBuscador={() => setModalAbierto(true)}
          onQuitar={handleQuitarVinculada}
          soloLectura={soloLectura}
        />
      )
    }
  ];

  const handleIntegrar = () => {
    if (hayExceso || integrada) return;
    setIntegrada(true);
  };

  return (
    <div>
      <HeaderVista
        huId="HU-12"
        titulo="Apertura del periodo e integración de la estimación"
        sprint="Sprint 3"
        rolAcademico="Contratista"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Estimaciones' },
          { label: 'Integración del periodo' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[
          { label: 'Periodo:', value: 'Mayo 2026', resaltado: true },
          { label: 'Estimación', value: 'EST-2026-003', resaltado: true }
        ]}
      />

      {integrada && (
        <div
          className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 mb-4 rounded-r-md"
          data-testid="aviso-integrada"
        >
          <div className="text-sm font-semibold text-sigecop-green-validation">
            ✓ Estimación integrada
          </div>
          <p className="text-sm text-slate-800 mt-1">
            La estimación quedó integrada como entidad única: carátula calculada, generadores,
            registro fotográfico, soportes y {notasVinculadas.length} nota(s) de bitácora vinculada(s).
          </p>
        </div>
      )}

      {hayExceso && (
        <div
          className="bg-red-50 border-l-4 border-red-500 px-4 py-3 mb-4 text-sm text-red-800 rounded-r-md"
        >
          <strong>⚠ Integración bloqueada:</strong> uno o más conceptos en "Números generadores"
          exceden lo contratado. Ajusta las cantidades en ese tab o tramita un convenio
          modificatorio (art. 118 RLOPSRM).
        </div>
      )}

      <Tabs tabs={tabs} />

      {!soloLectura && !integrada && (
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="sg-btn-secondary" disabled>
            Guardar borrador
          </button>
          <button
            type="button"
            className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed"
            onClick={handleIntegrar}
            disabled={hayExceso}
            title={hayExceso ? 'Hay conceptos que exceden lo contratado' : ''}
            data-testid="btn-integrar"
          >
            Integrar estimación
          </button>
        </div>
      )}

      <SeccionCriterios
        huId="HU-12"
        criterios={[
          { numero: 1, texto: 'La estimación se guarda como una sola entidad que contiene carátula, generadores, registro fotográfico, soportes y notas vinculadas seleccionadas del buscador de bitácora.' },
          { numero: 2, texto: 'La carátula calcula automáticamente anticipo amortizado, retenciones legales (5 al millar, art. 191 LFD) y deductivas por penalizaciones según el contrato.' },
          { numero: 3, texto: 'El sistema bloquea la integración cuando una cantidad por concepto excede la cantidad contratada en el catálogo (art. 118 RLOPSRM).' }
        ]}
      />

      <BuscadorNotasModal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onConfirmar={handleConfirmarBuscador}
        yaVinculadas={foliosVinculados}
      />
    </div>
  );
}
