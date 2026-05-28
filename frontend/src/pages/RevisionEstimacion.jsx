import { useState, useMemo } from 'react';
import Tabs from '../components/ui/Tab.jsx';
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
  notasParaVincularDummy,
  fechaRecepcionEstimacionISO,
  tiposObservacionRevision,
  severidadesObservacionRevision
} from '../data/dummy.js';

const PLAZO_REVISION_DIAS = 15;

const moneda = (n) => {
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-$ ${abs}` : `$ ${abs}`;
};

const formatoFechaMx = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const hoyLabel = () => {
  const d = new Date();
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Lista de observaciones de una sección, con + Agregar y eliminar por entrada.
function ListaObservaciones({ seccionKey, observaciones, onChange, onAdd, onRemove, soloLectura }) {
  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Observaciones de esta sección ({observaciones.length})
        </h4>
        {!soloLectura && (
          <button
            type="button"
            className="text-xs text-sigecop-accent hover:underline"
            onClick={onAdd}
            data-testid={`btn-agregar-obs-${seccionKey}`}
          >
            + Agregar observación
          </button>
        )}
      </div>

      {observaciones.length === 0 ? (
        <p className="text-xs text-slate-500 italic">
          Sin observaciones registradas en esta sección.
        </p>
      ) : (
        <ul className="space-y-3">
          {observaciones.map((o, i) => (
            <li
              key={o.id}
              className="border border-slate-200 rounded-md p-3"
              data-testid={`obs-${seccionKey}-${i}`}
            >
              <textarea
                className="sg-input"
                rows={2}
                placeholder="Describe la observación…"
                value={o.texto}
                onChange={(e) => onChange(o.id, 'texto', e.target.value)}
                data-testid={`obs-${seccionKey}-${i}-texto`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 items-end">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5">
                    Tipo
                  </label>
                  <select
                    className="sg-input"
                    value={o.tipo}
                    onChange={(e) => onChange(o.id, 'tipo', e.target.value)}
                    data-testid={`obs-${seccionKey}-${i}-tipo`}
                  >
                    {tiposObservacionRevision.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-0.5">
                    Severidad
                  </label>
                  <select
                    className="sg-input"
                    value={o.severidad}
                    onChange={(e) => onChange(o.id, 'severidad', e.target.value)}
                    data-testid={`obs-${seccionKey}-${i}-severidad`}
                  >
                    {severidadesObservacionRevision.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {!soloLectura && (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline justify-self-end self-center"
                    onClick={() => onRemove(o.id)}
                    data-testid={`obs-${seccionKey}-${i}-eliminar`}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabCaratulaRevision({ seccionKey, observaciones, onChange, onAdd, onRemove, soloLectura }) {
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
      <ListaObservaciones
        seccionKey={seccionKey}
        observaciones={observaciones}
        onChange={onChange}
        onAdd={onAdd}
        onRemove={onRemove}
        soloLectura={soloLectura}
      />
    </div>
  );
}

function TabGeneradoresRevision({ seccionKey, observaciones, onChange, onAdd, onRemove, soloLectura }) {
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
      <ListaObservaciones
        seccionKey={seccionKey}
        observaciones={observaciones}
        onChange={onChange}
        onAdd={onAdd}
        onRemove={onRemove}
        soloLectura={soloLectura}
      />
    </div>
  );
}

function TabFotosRevision({ seccionKey, observaciones, onChange, onAdd, onRemove, soloLectura }) {
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
      <ListaObservaciones
        seccionKey={seccionKey}
        observaciones={observaciones}
        onChange={onChange}
        onAdd={onAdd}
        onRemove={onRemove}
        soloLectura={soloLectura}
      />
    </div>
  );
}

function TabSoportesRevision({ seccionKey, observaciones, onChange, onAdd, onRemove, soloLectura }) {
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
      <ListaObservaciones
        seccionKey={seccionKey}
        observaciones={observaciones}
        onChange={onChange}
        onAdd={onAdd}
        onRemove={onRemove}
        soloLectura={soloLectura}
      />
    </div>
  );
}

function TabNotasRevision({ seccionKey, observaciones, onChange, onAdd, onRemove, soloLectura }) {
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
      <ListaObservaciones
        seccionKey={seccionKey}
        observaciones={observaciones}
        onChange={onChange}
        onAdd={onAdd}
        onRemove={onRemove}
        soloLectura={soloLectura}
      />
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

// Semáforo del plazo de revisión (CA-3 — art. 54 LOPSRM). diaActual se calcula
// en vivo a partir de la fecha de recepción.
function SemaforoPlazoRevision({ diaActual, diaLimite }) {
  const diaSeguro = Math.max(0, diaActual);
  const pctRaw = (diaSeguro / diaLimite) * 100;
  const pct = Math.min(100, pctRaw);
  // Reglas de color exigidas: ≤7 verde, 8-12 amarillo, >12 rojo.
  const color = diaSeguro > 12 ? 'red' : diaSeguro >= 8 ? 'amber' : 'green';

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
    <div className="bg-white border border-slate-200 rounded-md p-4 mb-4" data-testid="semaforo-revision">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-slate-700">
          Plazo de revisión (art. 54 LOPSRM)
        </div>
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colorBadge}`}
          data-testid="semaforo-revision-badge"
          data-color={color}
        >
          Día {diaSeguro} de {diaLimite} — {etiqueta}
        </span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${colorBarra}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-500 mt-2">
        Plazo de revisión: 15 días naturales desde la recepción de la estimación
        ({formatoFechaMx(fechaRecepcionEstimacionISO)}). El semáforo se calcula en vivo.
      </p>
    </div>
  );
}

const SECCIONES_KEYS = ['caratula', 'generadores', 'fotos', 'soportes', 'notas'];

function obsInicial() {
  return Object.fromEntries(SECCIONES_KEYS.map((k) => [k, []]));
}

export default function RevisionEstimacion() {
  const { soloLectura } = useVistaHU('HU-15');

  // Observaciones por sección. Cada una con id local creciente.
  const [obs, setObs] = useState(obsInicial);
  const [nextId, setNextId] = useState(1);
  const [sinObservaciones, setSinObservaciones] = useState(false);

  // Flujo del proceso. estado controla qué bloque del panel de resolución se
  // habilita y el banner que se muestra al pie.
  // estado: 'en-revision' → 'turnada' → 'autorizada' | 'rechazada'
  const [estado, setEstado] = useState('en-revision');
  const [fechaTurnado, setFechaTurnado] = useState(null);
  const [fechaResolucion, setFechaResolucion] = useState(null);

  // Semáforo: diaActual se calcula en vivo respecto a la fecha de recepción.
  const diaActual = useMemo(() => {
    const recepcion = new Date(`${fechaRecepcionEstimacionISO}T00:00:00`);
    const diff = Date.now() - recepcion.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, []);

  // Helpers de manipulación de observaciones.
  const addObs = (seccionKey) => () => {
    setObs((prev) => ({
      ...prev,
      [seccionKey]: [...prev[seccionKey], {
        id: nextId,
        texto: '',
        tipo: tiposObservacionRevision[0],
        severidad: severidadesObservacionRevision[0]
      }]
    }));
    setNextId((n) => n + 1);
  };

  const changeObs = (seccionKey) => (obsId, campo, valor) => {
    setObs((prev) => ({
      ...prev,
      [seccionKey]: prev[seccionKey].map((o) => o.id === obsId ? { ...o, [campo]: valor } : o)
    }));
  };

  const removeObs = (seccionKey) => (obsId) => {
    setObs((prev) => ({
      ...prev,
      [seccionKey]: prev[seccionKey].filter((o) => o.id !== obsId)
    }));
  };

  // Conteos derivados.
  const totalObs = useMemo(
    () => SECCIONES_KEYS.reduce((acc, k) => acc + obs[k].length, 0),
    [obs]
  );

  // Pasos del flujo.
  const pasos = [
    {
      id: 'supervision',
      label: 'Supervisión',
      estado: estado === 'en-revision' ? 'En revisión' : 'Turnado ✓',
      activo: estado === 'en-revision',
      completado: estado !== 'en-revision'
    },
    {
      id: 'residencia',
      label: 'Residencia',
      estado: estado === 'en-revision' ? 'En espera'
        : estado === 'turnada' ? 'En revisión'
        : 'Resuelto ✓',
      activo: estado === 'turnada',
      completado: estado === 'autorizada' || estado === 'rechazada'
    },
    {
      id: 'resolucion',
      label: 'Resolución',
      estado: estado === 'autorizada' ? 'Autorizada'
        : estado === 'rechazada' ? 'Rechazada'
        : 'Pendiente',
      activo: estado === 'autorizada' || estado === 'rechazada',
      completado: false
    }
  ];

  // Botones del panel de resolución.
  const puedeTurnar = estado === 'en-revision' && (totalObs > 0 || sinObservaciones);
  const puedeAutorizar = estado === 'turnada';
  const puedeRechazar  = estado === 'turnada';

  const turnar = () => {
    if (!puedeTurnar) return;
    setEstado('turnada');
    setFechaTurnado(hoyLabel());
  };
  const autorizar = () => {
    if (!puedeAutorizar) return;
    setEstado('autorizada');
    setFechaResolucion(hoyLabel());
  };
  const rechazar = () => {
    if (!puedeRechazar) return;
    setEstado('rechazada');
    setFechaResolucion(hoyLabel());
  };

  // Edición efectiva: bloqueada por soloLectura O por estado fuera de revisión.
  const editableObs = !soloLectura && estado === 'en-revision';

  // Cada tab envuelve su contenido en RegionEditable para deshabilitar inputs
  // en lectura / tras turnar.
  const wrapTab = (node) => (
    <RegionEditable disabled={!editableObs}>{node}</RegionEditable>
  );

  // Plana de observaciones para el banner de rechazo.
  const observacionesPlanas = useMemo(() => {
    const lista = [];
    for (const k of SECCIONES_KEYS) {
      for (const o of obs[k]) {
        if (o.texto.trim()) lista.push({ ...o, seccion: k });
      }
    }
    return lista;
  }, [obs]);

  const tabs = [
    {
      label: 'Carátula',
      content: wrapTab(
        <TabCaratulaRevision
          seccionKey="caratula"
          observaciones={obs.caratula}
          onChange={changeObs('caratula')}
          onAdd={addObs('caratula')}
          onRemove={removeObs('caratula')}
          soloLectura={!editableObs}
        />
      )
    },
    {
      label: 'Números generadores',
      content: wrapTab(
        <TabGeneradoresRevision
          seccionKey="generadores"
          observaciones={obs.generadores}
          onChange={changeObs('generadores')}
          onAdd={addObs('generadores')}
          onRemove={removeObs('generadores')}
          soloLectura={!editableObs}
        />
      )
    },
    {
      label: 'Registro fotográfico',
      content: wrapTab(
        <TabFotosRevision
          seccionKey="fotos"
          observaciones={obs.fotos}
          onChange={changeObs('fotos')}
          onAdd={addObs('fotos')}
          onRemove={removeObs('fotos')}
          soloLectura={!editableObs}
        />
      )
    },
    {
      label: 'Soportes',
      content: wrapTab(
        <TabSoportesRevision
          seccionKey="soportes"
          observaciones={obs.soportes}
          onChange={changeObs('soportes')}
          onAdd={addObs('soportes')}
          onRemove={removeObs('soportes')}
          soloLectura={!editableObs}
        />
      )
    },
    {
      label: 'Notas vinculadas',
      content: wrapTab(
        <TabNotasRevision
          seccionKey="notas"
          observaciones={obs.notas}
          onChange={changeObs('notas')}
          onAdd={addObs('notas')}
          onRemove={removeObs('notas')}
          soloLectura={!editableObs}
        />
      )
    }
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
          { label: 'Recibida el', value: formatoFechaMx(fechaRecepcionEstimacionISO), resaltado: true }
        ]}
        margenAbajo="mb-4"
      />

      <IndicadorFlujo pasos={pasos} />
      <SemaforoPlazoRevision diaActual={diaActual} diaLimite={PLAZO_REVISION_DIAS} />

      {/* Banners de cambio de estado. */}
      {estado === 'turnada' && (
        <div
          className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 mb-4 rounded-r-md"
          data-testid="banner-turnada"
        >
          <div className="text-sm font-semibold text-sigecop-green-validation">
            ✓ Turnada a residencia el {fechaTurnado}.
          </div>
          <p className="text-sm text-slate-800 mt-1">
            Supervisión queda en lectura. Residencia puede autorizar o rechazar.
          </p>
        </div>
      )}
      {estado === 'autorizada' && (
        <div
          className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 mb-4 rounded-r-md"
          data-testid="banner-autorizada"
        >
          <div className="text-sm font-semibold text-sigecop-green-validation">
            ✓ Estimación autorizada el {fechaResolucion}.
          </div>
          <p className="text-sm text-slate-800 mt-1">
            La estimación queda en lectura total. Continúa el ciclo en tránsito a pago (HU-20).
          </p>
        </div>
      )}
      {estado === 'rechazada' && (
        <div
          className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 mb-4 rounded-r-md"
          data-testid="banner-rechazada"
        >
          <div className="text-sm font-semibold text-sigecop-amber-attention">
            ⚠ Estimación rechazada — debe ser reingresada (HU-16).
          </div>
          {observacionesPlanas.length > 0 ? (
            <>
              <p className="text-sm text-slate-800 mt-1">
                Observaciones a resolver ({observacionesPlanas.length}):
              </p>
              <ul className="list-disc list-inside text-sm text-slate-800 mt-1 space-y-0.5">
                {observacionesPlanas.map((o) => (
                  <li key={o.id}>
                    <strong className="capitalize">{o.seccion}</strong> · {o.tipo} · {o.severidad}: {o.texto}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-slate-800 mt-1">
              Sin observaciones registradas explícitamente — se rechaza por dictamen de residencia.
            </p>
          )}
        </div>
      )}

      <Tabs tabs={tabs} />

      {!soloLectura && estado !== 'autorizada' && estado !== 'rechazada' && (
        <div className="mt-6 bg-white border border-slate-200 rounded-md p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
            Panel de resolución
          </h2>

          {estado === 'en-revision' && (
            <>
              <p className="text-sm text-slate-700 mb-3">
                Supervisión está revisando la estimación. Para turnar a residencia debe haber
                al menos una observación registrada o marcar la estimación sin observaciones.
              </p>
              <label className="flex items-center gap-2 text-sm text-slate-800 mb-3">
                <input
                  type="checkbox"
                  checked={sinObservaciones}
                  onChange={(e) => setSinObservaciones(e.target.checked)}
                  data-testid="chk-sin-observaciones"
                />
                Marcar la estimación sin observaciones (apta para autorización).
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Total de observaciones registradas: <strong>{totalObs}</strong>.
              </p>
            </>
          )}
          {estado === 'turnada' && (
            <p className="text-sm text-slate-700 mb-3">
              Estimación turnada por supervisión. Residencia puede autorizar o rechazar.
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="sg-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!puedeTurnar}
              onClick={turnar}
              data-testid="btn-turnar"
              title={!puedeTurnar && estado === 'en-revision'
                ? 'Registra al menos una observación o marca "Sin observaciones".'
                : ''}
            >
              ➡ Turnar a residencia
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-md border border-red-500 text-red-700 font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              disabled={!puedeRechazar}
              onClick={rechazar}
              data-testid="btn-rechazar"
              title={!puedeRechazar ? 'Disponible para residencia tras el turnado de supervisión.' : ''}
            >
              ✗ Rechazar
            </button>

            <button
              type="button"
              className="sg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!puedeAutorizar}
              onClick={autorizar}
              data-testid="btn-autorizar"
              title={!puedeAutorizar ? 'Disponible para residencia tras el turnado de supervisión.' : ''}
            >
              ✓ Autorizar
            </button>
          </div>
        </div>
      )}

      <SeccionCriterios
        huId="HU-15"
        criterios={[
          { numero: 1, texto: 'La revisión permite ir sección por sección (carátula, generadores, registro fotográfico, soportes y notas) y registrar observaciones con tipo y severidad por concepto.' },
          { numero: 2, texto: 'La autorización queda condicionada al turnado secuencial: primero supervisión, luego residencia; residencia no puede resolver antes del turnado.' },
          { numero: 3, texto: 'El sistema controla el plazo de 15 días naturales de revisión conforme al art. 54 LOPSRM mediante un semáforo basado en la fecha real de recepción.' }
        ]}
      />
    </div>
  );
}
