import { useState, useMemo } from 'react';
import Tabs from '../components/ui/Tab.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import {
  contratoDummy,
  caratulaEstimacionDummy,
  generadoresEstimacionDummy,
  fotosEstimacionDummy,
  soportesEstimacionDummy,
  notasParaVincularDummy
} from '../data/dummy.js';

const moneda = (n) => {
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-$ ${abs}` : `$ ${abs}`;
};

function TabCaratula() {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Carátula de cálculo</h3>
      <div className="overflow-x-auto border border-slate-200 rounded-md mb-4">
        <table className="w-full text-sm">
          <tbody>
            {caratulaEstimacionDummy.map((c, i) => {
              const esNeto = c.tipo === 'neto';
              return (
                <tr
                  key={i}
                  className={`border-t border-slate-200 ${esNeto ? 'bg-sigecop-blue-light font-bold' : ''}`}
                >
                  <td className={`px-4 py-3 ${esNeto ? 'text-sigecop-blue' : 'text-slate-800'}`}>
                    {c.concepto}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${esNeto ? 'text-sigecop-blue text-base' : 'text-slate-800'}`}>
                    {moneda(c.importe)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-3 text-sm text-blue-900 rounded-r-md">
        El 5 al millar se retiene conforme al <strong>art. 191 de la Ley Federal de Derechos</strong> sobre el importe de cada estimación. La amortización del anticipo se aplica conforme al <strong>art. 50 LOPSRM</strong>, proporcionalmente al avance del periodo.
      </div>
    </div>
  );
}

function TabGeneradores({ filas, onPeriodoChange }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Números generadores del periodo</h3>
      <p className="text-sm text-slate-600 mb-3">
        Captura las cantidades ejecutadas este periodo. El sistema calcula automáticamente el acumulado y el % de avance contra el catálogo del contrato.
      </p>

      <div className="overflow-x-auto border border-slate-200 rounded-md mb-3">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2">Concepto</th>
              <th className="text-left px-3 py-2 w-20">Unidad</th>
              <th className="text-right px-3 py-2 w-28">Contratado</th>
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
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={`sg-input text-right ${f.excede ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                    value={f.periodo}
                    onChange={(e) => onPeriodoChange(f.idx, e.target.value)}
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
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 text-sm text-red-800 rounded-r-md">
          <strong>⚠ La cantidad acumulada excede lo contratado en el catálogo</strong> en uno o más conceptos. Para integrar la estimación, ajusta las cantidades del periodo o gestiona un convenio modificatorio (CA-3).
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

function TabSoportes({ showToast }) {
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

function TabNotasVinculadas({ seleccionadas, toggle, showToast }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Notas de bitácora vinculadas</h3>
      <p className="text-sm text-slate-600 mb-4">
        Selecciona las notas del periodo que se vinculan a esta estimación como soporte documental.
      </p>

      <div className="overflow-x-auto border border-slate-200 rounded-md mb-4">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="w-10 p-3"></th>
              <th className="text-left p-3 font-semibold">Folio</th>
              <th className="text-left p-3 font-semibold">Tipo</th>
              <th className="text-left p-3 font-semibold">Fecha</th>
              <th className="text-left p-3 font-semibold">Tema</th>
            </tr>
          </thead>
          <tbody>
            {notasParaVincularDummy.map((n) => (
              <tr key={n.folio} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="p-3 text-center">
                  <input
                    type="checkbox"
                    checked={seleccionadas.has(n.folio)}
                    onChange={() => toggle(n.folio)}
                  />
                </td>
                <td className="p-3 font-mono text-xs">{n.folio}</td>
                <td className="p-3">
                  <span className="inline-block px-2 py-0.5 bg-sigecop-blue-light text-sigecop-blue text-xs font-semibold rounded">
                    {n.tipo}
                  </span>
                </td>
                <td className="p-3">{n.fecha}</td>
                <td className="p-3 text-slate-700">{n.tema}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="sg-btn-secondary"
          disabled={seleccionadas.size === 0}
          onClick={() => showToast('Pendiente para Sprint siguiente.')}
        >
          📎 Vincular {seleccionadas.size > 0 ? `(${seleccionadas.size})` : ''} notas seleccionadas
        </button>
      </div>
    </div>
  );
}

export default function IntegracionEstimacion() {
  const { showToast } = useToast();
  const { soloLectura } = useVistaHU('HU-12');

  // Estado de cantidades por periodo — vive en el padre para no perderse al cambiar de tab.
  const [periodos, setPeriodos] = useState(
    generadoresEstimacionDummy.reduce((acc, g, i) => {
      acc[i] = g.periodoDefault;
      return acc;
    }, {})
  );

  const [notasSeleccionadas, setNotasSeleccionadas] = useState(new Set());

  // Estado en el padre — TabFotografico se desmonta al cambiar de pestaña (fix C-02).
  const [descripcionesFotos, setDescripcionesFotos] = useState(
    fotosEstimacionDummy.reduce((acc, f) => {
      acc[f.id] = f.descripcion;
      return acc;
    }, {})
  );

  const handleDescripcionFoto = (id, valor) => {
    setDescripcionesFotos((prev) => ({ ...prev, [id]: valor }));
  };

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

  const handlePeriodoChange = (idx, valor) => {
    setPeriodos((prev) => ({ ...prev, [idx]: valor }));
  };

  const toggleNota = (folio) => {
    setNotasSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(folio)) next.delete(folio);
      else next.add(folio);
      return next;
    });
  };

  // Envolvemos el contenido de cada tab — NO el componente Tabs — para que en
  // lectura los inputs queden disabled pero la navegación entre pestañas siga viva.
  const wrapTab = (node) => (
    <RegionEditable disabled={soloLectura}>{node}</RegionEditable>
  );

  const tabs = [
    { label: 'Carátula', content: wrapTab(<TabCaratula />) },
    {
      label: 'Números generadores',
      content: wrapTab(<TabGeneradores filas={filasGeneradores} onPeriodoChange={handlePeriodoChange} />)
    },
    {
      label: 'Registro fotográfico',
      content: wrapTab(<TabFotografico descripciones={descripcionesFotos} onDescripcionChange={handleDescripcionFoto} />)
    },
    { label: 'Soportes', content: wrapTab(<TabSoportes showToast={showToast} />) },
    {
      label: 'Notas vinculadas',
      content: wrapTab(
        <TabNotasVinculadas
          seleccionadas={notasSeleccionadas}
          toggle={toggleNota}
          showToast={showToast}
        />
      )
    }
  ];

  const handleIntegrar = () => {
    if (hayExceso) {
      showToast('No se puede integrar: hay conceptos que exceden lo contratado (CA-3).');
      return;
    }
    showToast('Pendiente para Sprint siguiente.');
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

      {hayExceso && (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 mb-4 text-sm text-red-800 rounded-r-md">
          <strong>⚠ Integración bloqueada:</strong> uno o más conceptos en "Números generadores" exceden lo contratado. Ajusta las cantidades en ese tab o tramita un convenio modificatorio.
        </div>
      )}

      <Tabs tabs={tabs} />

      {!soloLectura && (
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="sg-btn-secondary"
            onClick={() => showToast('Pendiente para Sprint siguiente.')}
          >
            Guardar borrador
          </button>
          <button
            type="button"
            className="sg-btn-primary"
            onClick={handleIntegrar}
            disabled={hayExceso}
            title={hayExceso ? 'Hay conceptos que exceden lo contratado' : ''}
          >
            Integrar estimación
          </button>
        </div>
      )}

      <SeccionCriterios
        huId="HU-12"
        criterios={[
          { numero: 1, texto: 'La estimación se guarda como una sola entidad que contiene carátula, generadores, registro fotográfico, soportes y notas vinculadas.' },
          { numero: 2, texto: 'La carátula calcula automáticamente anticipo amortizado, retenciones legales (5 al millar) y deductivas por penalizaciones según el contrato.' },
          { numero: 3, texto: 'El sistema bloquea la integración cuando una cantidad por concepto excede la cantidad contratada en el catálogo (art. 118 RLOPSRM).' }
        ]}
      />
    </div>
  );
}
