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
  minutasDummy,
  visitasDummy,
  tiposVisitaDummy,
  acuerdosDummy,
  periodosAcuerdosDummy
} from '../data/dummy.js';

function EstadoVisitaBadge({ estado }) {
  const colors = {
    'Realizada':  'bg-green-100 text-sigecop-green-validation',
    'Programada': 'bg-sigecop-blue-light text-sigecop-blue',
    'Cancelada':  'bg-slate-200 text-slate-600'
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[estado] || 'bg-slate-200 text-slate-600'}`}>
      {estado}
    </span>
  );
}

function EstadoAcuerdoBadge({ estado }) {
  const colors = {
    'Cumplido':   'bg-green-100 text-sigecop-green-validation',
    'Pendiente':  'bg-amber-100 text-sigecop-amber-attention',
    'En proceso': 'bg-sigecop-blue-light text-sigecop-blue'
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[estado] || 'bg-slate-200 text-slate-600'}`}>
      {estado}
    </span>
  );
}

// Pestaña Minutas. Recibe el estado y los setters del padre porque Tabs
// desmonta los inactivos (ver fix C-01 en HU-01).
function TabMinutas({ form, setForm, showToast }) {
  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Registrar minuta</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="sg-label">Fecha</label>
          <input type="date" className="sg-input" value={form.fecha} onChange={set('fecha')} />
        </div>
        <div>
          <label className="sg-label">Tema</label>
          <input className="sg-input" placeholder="p. ej. Reunión de avance mensual" value={form.tema} onChange={set('tema')} />
        </div>
        <div className="md:col-span-2">
          <label className="sg-label">Asistentes</label>
          <input className="sg-input" placeholder="Residente, Supervisión, Contratista…" value={form.asistentes} onChange={set('asistentes')} />
        </div>
        <div className="md:col-span-2">
          <label className="sg-label">Adjuntar minuta</label>
          <input type="file" className="sg-input" />
          <p className="text-xs text-slate-500 mt-1">PDF firmado del acta. (Dummy: el archivo no se sube.)</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="sg-btn-primary"
          onClick={() => showToast('Pendiente para Sprint siguiente.')}
        >
          Registrar minuta
        </button>
      </div>

      <h3 className="text-lg font-bold text-sigecop-blue mt-8 mb-3">Minutas registradas</h3>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left p-3 font-semibold">Fecha</th>
              <th className="text-left p-3 font-semibold">Tema</th>
              <th className="text-left p-3 font-semibold">Asistentes</th>
              <th className="text-right p-3 font-semibold">Acuerdos</th>
            </tr>
          </thead>
          <tbody>
            {minutasDummy.map((m) => (
              <tr key={m.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="p-3 font-mono text-xs">{m.fecha}</td>
                <td className="p-3 font-semibold">{m.tema}</td>
                <td className="p-3 text-slate-700">{m.asistentes}</td>
                <td className="p-3 text-right font-mono">{m.acuerdos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Pestaña Agenda de visitas. Mismo patrón que minutas.
function TabVisitas({ form, setForm, showToast }) {
  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Agendar visita</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="sg-label">Fecha</label>
          <input type="date" className="sg-input" value={form.fecha} onChange={set('fecha')} />
        </div>
        <div>
          <label className="sg-label">Tipo</label>
          <select className="sg-input" value={form.tipo} onChange={set('tipo')}>
            {tiposVisitaDummy.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="sg-label">Responsable</label>
          <input className="sg-input" placeholder="p. ej. Supervisión" value={form.responsable} onChange={set('responsable')} />
        </div>
        <div className="md:col-span-2">
          <label className="sg-label">Objetivo</label>
          <textarea
            className="sg-input"
            rows="3"
            placeholder="Descripción breve del objetivo de la visita."
            value={form.objetivo}
            onChange={set('objetivo')}
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="sg-btn-primary"
          onClick={() => showToast('Pendiente para Sprint siguiente.')}
        >
          Agendar visita
        </button>
      </div>

      <h3 className="text-lg font-bold text-sigecop-blue mt-8 mb-3">Visitas</h3>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left p-3 font-semibold">Fecha</th>
              <th className="text-left p-3 font-semibold">Tipo</th>
              <th className="text-left p-3 font-semibold">Responsable</th>
              <th className="text-left p-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visitasDummy.map((v) => (
              <tr key={v.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="p-3 font-mono text-xs">{v.fecha}</td>
                <td className="p-3">{v.tipo}</td>
                <td className="p-3 text-slate-700">{v.responsable}</td>
                <td className="p-3"><EstadoVisitaBadge estado={v.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Pestaña Acuerdos — consultativa. El filtro de periodo DEBE seguir vivo en
// modo lectura, por eso esta pestaña NO va envuelta en RegionEditable.
function TabAcuerdos({ periodo, setPeriodo }) {
  const resultados = useMemo(() => {
    if (periodo === 'Todos') return acuerdosDummy;
    return acuerdosDummy.filter((a) => a.periodo === periodo);
  }, [periodo]);

  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Acuerdos y compromisos</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="sg-label">Periodo</label>
          <select className="sg-input" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            {periodosAcuerdosDummy.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left p-3 font-semibold">Acuerdo</th>
              <th className="text-left p-3 font-semibold">Origen</th>
              <th className="text-left p-3 font-semibold">Responsable</th>
              <th className="text-left p-3 font-semibold">Compromiso</th>
              <th className="text-left p-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {resultados.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400 italic">
                  Sin acuerdos para el periodo seleccionado.
                </td>
              </tr>
            ) : (
              resultados.map((a) => (
                <tr key={a.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-semibold">{a.acuerdo}</td>
                  <td className="p-3 text-slate-700">{a.origen}</td>
                  <td className="p-3">{a.responsable}</td>
                  <td className="p-3 font-mono text-xs">{a.compromiso}</td>
                  <td className="p-3"><EstadoAcuerdoBadge estado={a.estado} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MinutasVisitas() {
  const { showToast } = useToast();
  const { soloLectura } = useVistaHU('HU-11');

  // Estado por pestaña en el padre — Tabs desmonta el inactivo, así que sin
  // esto se perdería al cambiar de pestaña (mismo patrón que HU-01).
  const [formMinuta, setFormMinuta] = useState({
    fecha: '',
    tema: '',
    asistentes: ''
  });
  const [formVisita, setFormVisita] = useState({
    fecha: '',
    tipo: tiposVisitaDummy[0],
    responsable: '',
    objetivo: ''
  });
  const [periodoAcuerdos, setPeriodoAcuerdos] = useState(periodosAcuerdosDummy[0]);

  // Envolvemos sólo el contenido de las pestañas de captura. La de Acuerdos
  // se queda fuera de RegionEditable porque es consulta (igual que HU-10).
  const wrap = (node) => <RegionEditable disabled={soloLectura}>{node}</RegionEditable>;

  const tabs = [
    {
      label: 'Minutas',
      content: wrap(<TabMinutas form={formMinuta} setForm={setFormMinuta} showToast={showToast} />)
    },
    {
      label: 'Agenda de visitas',
      content: wrap(<TabVisitas form={formVisita} setForm={setFormVisita} showToast={showToast} />)
    },
    {
      label: 'Acuerdos',
      content: <TabAcuerdos periodo={periodoAcuerdos} setPeriodo={setPeriodoAcuerdos} />
    }
  ];

  return (
    <div>
      <HeaderVista
        huId="HU-11"
        titulo="Minutas y agenda de visitas"
        sprint="Sprint 7"
        rolAcademico="Residente"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Bitácora' },
          { label: 'Minutas y visitas' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[{ value: contratoDummy.contratista }]}
      />

      <Tabs tabs={tabs} />

      <SeccionCriterios
        huId="HU-11"
        criterios={[
          { numero: 1, texto: 'Las minutas y visitas registradas son visibles para los usuarios autorizados del contrato.' },
          { numero: 2, texto: 'Se pueden consultar los acuerdos y compromisos derivados, filtrados por contrato y periodo.' }
        ]}
      />
    </div>
  );
}
