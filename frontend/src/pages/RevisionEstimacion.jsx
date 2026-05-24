import { useState } from 'react';
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

function ObservacionInput({ valor, onChange }) {
  return (
    <div className="mt-4">
      <label className="sg-label">Observación de esta sección</label>
      <textarea
        className="sg-input"
        rows={3}
        placeholder="Notas, observaciones o pendientes para esta sección..."
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TabCaratulaRevision({ observacion, onObsChange }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Carátula de la estimación</h3>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <tbody>
            {caratulaEstimacionDummy.map((c, i) => {
              const esNeto = c.tipo === 'neto';
              return (
                <tr key={i} className={`border-t border-slate-200 ${esNeto ? 'bg-sigecop-blue-light font-bold' : ''}`}>
                  <td className={`px-4 py-3 ${esNeto ? 'text-sigecop-blue' : 'text-slate-800'}`}>{c.concepto}</td>
                  <td className={`px-4 py-3 text-right font-mono ${esNeto ? 'text-sigecop-blue text-base' : 'text-slate-800'}`}>
                    {moneda(c.importe)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ObservacionInput valor={observacion} onChange={onObsChange} />
    </div>
  );
}

function TabGeneradoresRevision({ observacion, onObsChange }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Números generadores (revisión)</h3>
      <p className="text-sm text-slate-600 mb-3">
        Cantidades reportadas por el contratista — solo lectura desde revisión.
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2">Concepto</th>
              <th className="text-left px-3 py-2 w-20">Unidad</th>
              <th className="text-right px-3 py-2 w-28">Contratado</th>
              <th className="text-right px-3 py-2 w-32">Este periodo</th>
              <th className="text-right px-3 py-2 w-28">Acumulado</th>
              <th className="text-right px-3 py-2 w-24">% avance</th>
            </tr>
          </thead>
          <tbody>
            {generadoresEstimacionDummy.map((g, i) => {
              const acumulado = g.anteriorAcum + g.periodoDefault;
              return (
                <tr key={i} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-3 py-2">{g.concepto}</td>
                  <td className="px-3 py-2 text-slate-600">{g.unidad}</td>
                  <td className="px-3 py-2 text-right">{g.contratado.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{g.periodoDefault.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-semibold">{acumulado.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{g.avancePct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ObservacionInput valor={observacion} onChange={onObsChange} />
    </div>
  );
}

function TabFotosRevision({ observacion, onObsChange }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Registro fotográfico</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fotosEstimacionDummy.map((f) => (
          <div key={f.id} className="border border-slate-200 rounded-md overflow-hidden">
            <div className="aspect-video bg-slate-100 flex flex-col items-center justify-center text-slate-400">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-xs px-4 text-center">Foto del avance</p>
            </div>
            <div className="p-3 bg-white border-t border-slate-200 text-sm text-slate-700">
              {f.descripcion}
            </div>
          </div>
        ))}
      </div>
      <ObservacionInput valor={observacion} onChange={onObsChange} />
    </div>
  );
}

function TabSoportesRevision({ observacion, onObsChange }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Soportes documentales</h3>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left p-3 font-semibold">Documento</th>
              <th className="text-left p-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {soportesEstimacionDummy.map((s, i) => (
              <tr key={i} className="border-t border-slate-200">
                <td className="p-3">{s.documento}</td>
                <td className="p-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                    s.cargado ? 'bg-green-100 text-sigecop-green-validation' : 'bg-slate-200 text-slate-600'
                  }`}>{s.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ObservacionInput valor={observacion} onChange={onObsChange} />
    </div>
  );
}

function TabNotasRevision({ observacion, onObsChange }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Notas vinculadas al periodo</h3>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left p-3 font-semibold">Folio</th>
              <th className="text-left p-3 font-semibold">Tipo</th>
              <th className="text-left p-3 font-semibold">Fecha</th>
              <th className="text-left p-3 font-semibold">Tema</th>
            </tr>
          </thead>
          <tbody>
            {notasParaVincularDummy.map((n) => (
              <tr key={n.folio} className="border-t border-slate-200 hover:bg-slate-50">
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
      <ObservacionInput valor={observacion} onChange={onObsChange} />
    </div>
  );
}

// Indicador visual de los 3 pasos del flujo (CA-2).
function IndicadorFlujo({ pasos }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-4 mb-4">
      <div className="flex items-center justify-between gap-2">
        {pasos.map((p, i) => {
          const colorBg = p.activo ? 'bg-sigecop-blue text-white'
            : p.completado ? 'bg-sigecop-green-validation text-white'
            : 'bg-slate-200 text-slate-500';
          const colorTxt = p.activo ? 'text-sigecop-blue'
            : p.completado ? 'text-sigecop-green-validation'
            : 'text-slate-500';
          return (
            <div key={p.id} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold mb-1 ${colorBg}`}>
                  {p.completado ? '✓' : i + 1}
                </div>
                <div className={`text-xs font-semibold ${colorTxt}`}>{p.label}</div>
                <div className="text-[10px] text-slate-500">{p.estado}</div>
              </div>
              {i < pasos.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 ${p.completado ? 'bg-sigecop-green-validation' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Semáforo del plazo de revisión (CA-3 — art. 54 LOPSRM).
function SemaforoPlazoRevision({ diaActual, diaLimite }) {
  const pct = Math.min(100, (diaActual / diaLimite) * 100);
  const verde = pct < 60;
  const ambar = pct >= 60 && pct < 90;
  const rojo = pct >= 90;
  const color = rojo ? 'red' : ambar ? 'amber' : 'green';

  const colorBadge = color === 'green' ? 'bg-green-100 text-sigecop-green-validation'
    : color === 'amber' ? 'bg-amber-100 text-sigecop-amber-attention'
    : 'bg-red-100 text-red-700';

  const colorBarra = color === 'green' ? 'bg-sigecop-green-validation'
    : color === 'amber' ? 'bg-sigecop-amber-attention'
    : 'bg-red-500';

  const etiqueta = color === 'green' ? 'En tiempo'
    : color === 'amber' ? 'Por vencer'
    : 'Vencido';

  return (
    <div className="bg-white border border-slate-200 rounded-md p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-slate-700">
          Plazo de revisión (art. 54 LOPSRM)
        </div>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colorBadge}`}>
          Día {diaActual} de {diaLimite} — {etiqueta}
        </span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${colorBarra}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-500 mt-2">
        Plazo de revisión: 15 días naturales. Si se excede, se notifica a las partes y se libera la presunción de aceptación.
      </p>
    </div>
  );
}

export default function RevisionEstimacion() {
  const { showToast } = useToast();
  const { soloLectura } = useVistaHU('HU-15');

  // Observaciones por sección — viven en el padre para no perderse al cambiar de tab.
  const [obs, setObs] = useState({
    caratula: '',
    generadores: '',
    fotos: '',
    soportes: '',
    notas: ''
  });
  const setObsKey = (k) => (v) => setObs((prev) => ({ ...prev, [k]: v }));

  // Pasos del flujo (CA-2). Avanzan al turnar y al resolver.
  const [pasoActivo, setPasoActivo] = useState('supervision');
  const pasos = [
    {
      id: 'supervision',
      label: 'Supervisión',
      estado: pasoActivo === 'supervision' ? 'En revisión' : 'Turnado ✓',
      activo: pasoActivo === 'supervision',
      completado: pasoActivo !== 'supervision'
    },
    {
      id: 'residencia',
      label: 'Residencia',
      estado: pasoActivo === 'supervision' ? 'En espera'
        : pasoActivo === 'residencia' ? 'En revisión'
        : 'Resuelto ✓',
      activo: pasoActivo === 'residencia',
      completado: pasoActivo === 'resolucion'
    },
    {
      id: 'resolucion',
      label: 'Resolución',
      estado: pasoActivo === 'resolucion' ? 'Emitida' : 'Pendiente',
      activo: pasoActivo === 'resolucion',
      completado: false
    }
  ];

  const turnarASupervision = () => {
    setPasoActivo('residencia');
    showToast('Estimación turnada a residencia. Pendiente para Sprint siguiente.');
  };

  const resolver = (decision) => {
    setPasoActivo('resolucion');
    showToast(`Estimación ${decision}. Pendiente para Sprint siguiente.`);
  };

  const enSupervision = pasoActivo === 'supervision';
  const enResidencia  = pasoActivo === 'residencia';

  // Envolvemos el contenido de cada tab — NO el componente Tabs — para que en
  // lectura los inputs queden disabled pero la navegación entre pestañas siga viva.
  const wrapTab = (node) => (
    <RegionEditable disabled={soloLectura}>{node}</RegionEditable>
  );

  const tabs = [
    { label: 'Carátula',             content: wrapTab(<TabCaratulaRevision    observacion={obs.caratula}    onObsChange={setObsKey('caratula')} />) },
    { label: 'Números generadores',  content: wrapTab(<TabGeneradoresRevision observacion={obs.generadores} onObsChange={setObsKey('generadores')} />) },
    { label: 'Registro fotográfico', content: wrapTab(<TabFotosRevision       observacion={obs.fotos}       onObsChange={setObsKey('fotos')} />) },
    { label: 'Soportes',             content: wrapTab(<TabSoportesRevision    observacion={obs.soportes}    onObsChange={setObsKey('soportes')} />) },
    { label: 'Notas vinculadas',     content: wrapTab(<TabNotasRevision       observacion={obs.notas}       onObsChange={setObsKey('notas')} />) }
  ];

  return (
    <div>
      <HeaderVista
        huId="HU-15"
        titulo="Recepción, revisión técnica y autorización de la estimación"
        sprint="Sprint 4"
        rolAcademico="Supervisión y residencia (revisión secuencial)"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Estimaciones' },
          { label: 'Revisión' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[
          { label: 'Estimación', value: 'EST-2026-003', resaltado: true },
          { label: 'Recibida el', value: '23/05/2026', resaltado: true }
        ]}
        margenAbajo="mb-4"
      />

      <IndicadorFlujo pasos={pasos} />
      <SemaforoPlazoRevision diaActual={8} diaLimite={15} />

      <Tabs tabs={tabs} />

      {!soloLectura && (
      <div className="mt-6 bg-white border border-slate-200 rounded-md p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
          Panel de resolución
        </h2>

        {enSupervision && (
          <p className="text-sm text-slate-700 mb-3">
            Supervisión está revisando la estimación. Al turnar, la responsabilidad pasa a residencia.
          </p>
        )}
        {enResidencia && (
          <p className="text-sm text-slate-700 mb-3">
            Estimación turnada por supervisión. Residencia puede autorizar o rechazar.
          </p>
        )}
        {pasoActivo === 'resolucion' && (
          <div className="bg-green-50 border-l-4 border-sigecop-green-validation px-4 py-2 mb-3 text-sm text-sigecop-green-validation rounded-r-md">
            ✓ Resolución emitida. El historial conserva la decisión y los soportes.
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="sg-btn-secondary"
            disabled={!enSupervision}
            onClick={turnarASupervision}
            title={!enSupervision ? 'Supervisión ya turnó la estimación' : ''}
          >
            ➡ Turnar a residencia
          </button>

          <button
            type="button"
            className="px-4 py-2 rounded-md border border-red-500 text-red-700 font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            disabled={!enResidencia}
            title={enSupervision ? 'Disponible para residencia tras el turnado de supervisión' : ''}
            onClick={() => resolver('rechazada')}
          >
            ✗ Rechazar
          </button>

          <button
            type="button"
            className="sg-btn-primary"
            disabled={!enResidencia}
            title={enSupervision ? 'Disponible para residencia tras el turnado de supervisión' : ''}
            onClick={() => resolver('autorizada')}
          >
            ✓ Autorizar
          </button>
        </div>

        {enSupervision && (
          <p className="text-xs text-slate-500 mt-3 text-right">
            "Autorizar" y "Rechazar" se habilitan solo cuando supervisión ha turnado a residencia.
          </p>
        )}
      </div>
      )}

      <SeccionCriterios
        huId="HU-15"
        criterios={[
          { numero: 1, texto: 'La revisión permite revisar sección por sección y dejar observaciones puntuales en cada una (carátula, generadores, registro fotográfico, soportes y notas).' },
          { numero: 2, texto: 'La autorización queda condicionada al turnado secuencial: primero supervisión, luego residencia; residencia no puede resolver antes del turnado.' },
          { numero: 3, texto: 'El sistema controla el plazo de 15 días naturales de revisión conforme al art. 54 LOPSRM mediante un semáforo visible para los actores.' }
        ]}
      />
    </div>
  );
}
