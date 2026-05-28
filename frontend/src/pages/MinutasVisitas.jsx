import { useState, useMemo } from 'react';
import Tabs from '../components/ui/Tab.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import {
  contratoDummy,
  minutasDummy,
  visitasDummy,
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

// Próximo folio MIN-NNN / VIS-NNN a partir del listado existente.
function siguienteFolio(items, prefijo) {
  let max = 0;
  const re = new RegExp(`^${prefijo}-(\\d+)$`);
  for (const it of items) {
    const m = (it.folio || '').match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefijo}-${String(max + 1).padStart(3, '0')}`;
}

// Modal informativo del placeholder consciente: el "adjuntar real" vive en
// HU-09 (Emisión de notas). Aquí solo dejamos el vínculo conceptual.
function ModalAdjuntarReferencia({ abierto, onCerrar, tipo, folio }) {
  if (!abierto) return null;
  const tipoCorto = tipo === 'minuta' ? 'minuta' : 'visita';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      data-testid="modal-adjuntar-referencia"
    >
      <div className="bg-white rounded-md shadow-lg max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-sigecop-blue mb-3">
          Crear nota vinculada en HU-09
        </h3>
        <p className="text-sm text-slate-700">
          Esta acción está disponible desde la vista de Emisión de notas (HU-09).
          Cuando crees una nota nueva, podrás seleccionar esta <strong>{tipoCorto} {folio}</strong>{' '}
          como referencia adjunta.
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            className="sg-btn-primary"
            onClick={onCerrar}
            data-testid="btn-modal-cerrar"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

function TabMinutas({ form, setForm, minutas, onRegistrar, onAdjuntar, soloLectura }) {
  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  // Capturar el nombre del archivo PDF (no se sube a ningún lado — solo se
  // guarda el nombre en estado para defender el flujo en la maqueta).
  const onFile = (e) => {
    const f = e.target.files?.[0];
    setForm((prev) => ({ ...prev, archivoPdf: f ? f.name : '' }));
  };

  const datosOk =
    form.fecha &&
    form.lugar.trim() &&
    form.participantes.trim() &&
    form.asunto.trim() &&
    form.archivoPdf;
  const puedeRegistrar = !soloLectura && datosOk;

  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Registrar minuta</h3>
      <RegionEditable disabled={soloLectura}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="sg-label">Fecha *</label>
            <input
              type="date"
              className="sg-input"
              value={form.fecha}
              onChange={set('fecha')}
              data-testid="min-fecha"
            />
          </div>
          <div>
            <label className="sg-label">Lugar *</label>
            <input
              className="sg-input"
              placeholder="p. ej. Sala de juntas — Residencia"
              value={form.lugar}
              onChange={set('lugar')}
              data-testid="min-lugar"
            />
          </div>
          <div className="md:col-span-2">
            <label className="sg-label">Participantes *</label>
            <input
              className="sg-input"
              placeholder="Residente, Supervisión, Contratista…"
              value={form.participantes}
              onChange={set('participantes')}
              data-testid="min-participantes"
            />
          </div>
          <div className="md:col-span-2">
            <label className="sg-label">Asunto *</label>
            <input
              className="sg-input"
              placeholder="p. ej. Reunión de avance mensual"
              value={form.asunto}
              onChange={set('asunto')}
              data-testid="min-asunto"
            />
          </div>
          <div className="md:col-span-2">
            <label className="sg-label">Adjuntar minuta (PDF) *</label>
            <input
              type="file"
              accept=".pdf"
              className="sg-input"
              onChange={onFile}
              data-testid="min-archivo"
            />
            <p className="text-xs text-slate-500 mt-1">
              Captura del nombre del archivo —{' '}
              {form.archivoPdf
                ? <strong>{form.archivoPdf}</strong>
                : 'aún sin archivo seleccionado'}.
            </p>
          </div>
        </div>
      </RegionEditable>

      {!soloLectura && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="sg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!puedeRegistrar}
            onClick={onRegistrar}
            data-testid="btn-registrar-minuta"
          >
            Registrar minuta
          </button>
        </div>
      )}

      <h3 className="text-lg font-bold text-sigecop-blue mt-8 mb-3">
        Minutas registradas ({minutas.length})
      </h3>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm" data-testid="tabla-minutas">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left p-3 font-semibold w-24">Folio</th>
              <th className="text-left p-3 font-semibold">Fecha</th>
              <th className="text-left p-3 font-semibold">Lugar</th>
              <th className="text-left p-3 font-semibold">Asunto</th>
              <th className="text-left p-3 font-semibold">Participantes</th>
              <th className="text-left p-3 font-semibold">PDF</th>
              <th className="text-right p-3 font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody>
            {minutas.map((m) => (
              <tr
                key={m.folio}
                className={`border-t border-slate-200 ${m.esNueva ? 'bg-green-50' : 'hover:bg-slate-50'}`}
                data-testid={`minuta-${m.folio}`}
              >
                <td className="p-3 font-mono text-xs">{m.folio}</td>
                <td className="p-3 font-mono text-xs">{m.fecha}</td>
                <td className="p-3">{m.lugar}</td>
                <td className="p-3 font-semibold">{m.asunto}</td>
                <td className="p-3 text-slate-700">{m.participantes}</td>
                <td className="p-3 font-mono text-xs">{m.archivoPdf}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="text-xs text-sigecop-accent hover:underline"
                    onClick={() => onAdjuntar('minuta', m.folio)}
                    data-testid={`btn-adjuntar-${m.folio}`}
                  >
                    📎 Adjuntar como referencia en nota
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabVisitas({ form, setForm, visitas, onAgendar, onAdjuntar, soloLectura }) {
  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const datosOk =
    form.fecha &&
    form.lugar.trim() &&
    form.responsable.trim() &&
    form.proposito.trim();
  const puedeAgendar = !soloLectura && datosOk;

  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Agendar visita</h3>
      <RegionEditable disabled={soloLectura}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="sg-label">Fecha *</label>
            <input
              type="date"
              className="sg-input"
              value={form.fecha}
              onChange={set('fecha')}
              data-testid="vis-fecha"
            />
          </div>
          <div>
            <label className="sg-label">Lugar *</label>
            <input
              className="sg-input"
              placeholder="p. ej. Frente de obra norte"
              value={form.lugar}
              onChange={set('lugar')}
              data-testid="vis-lugar"
            />
          </div>
          <div className="md:col-span-2">
            <label className="sg-label">Responsable *</label>
            <input
              className="sg-input"
              placeholder="p. ej. Supervisión"
              value={form.responsable}
              onChange={set('responsable')}
              data-testid="vis-responsable"
            />
          </div>
          <div className="md:col-span-2">
            <label className="sg-label">Propósito *</label>
            <textarea
              className="sg-input"
              rows="3"
              placeholder="Descripción breve del propósito de la visita."
              value={form.proposito}
              onChange={set('proposito')}
              data-testid="vis-proposito"
            />
          </div>
        </div>
      </RegionEditable>

      {!soloLectura && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="sg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!puedeAgendar}
            onClick={onAgendar}
            data-testid="btn-agendar-visita"
          >
            Agendar visita
          </button>
        </div>
      )}

      <h3 className="text-lg font-bold text-sigecop-blue mt-8 mb-3">
        Visitas ({visitas.length})
      </h3>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm" data-testid="tabla-visitas">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left p-3 font-semibold w-24">Folio</th>
              <th className="text-left p-3 font-semibold">Fecha</th>
              <th className="text-left p-3 font-semibold">Lugar</th>
              <th className="text-left p-3 font-semibold">Responsable</th>
              <th className="text-left p-3 font-semibold">Propósito</th>
              <th className="text-left p-3 font-semibold">Estado</th>
              <th className="text-right p-3 font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody>
            {visitas.map((v) => (
              <tr
                key={v.folio}
                className={`border-t border-slate-200 ${v.esNueva ? 'bg-green-50' : 'hover:bg-slate-50'}`}
                data-testid={`visita-${v.folio}`}
              >
                <td className="p-3 font-mono text-xs">{v.folio}</td>
                <td className="p-3 font-mono text-xs">{v.fecha}</td>
                <td className="p-3">{v.lugar}</td>
                <td className="p-3 text-slate-700">{v.responsable}</td>
                <td className="p-3 text-slate-700">{v.proposito}</td>
                <td className="p-3"><EstadoVisitaBadge estado={v.estado} /></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="text-xs text-sigecop-accent hover:underline"
                    onClick={() => onAdjuntar('visita', v.folio)}
                    data-testid={`btn-adjuntar-${v.folio}`}
                  >
                    📎 Adjuntar como referencia en nota
                  </button>
                </td>
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

const formatoFechaMx = (iso) => {
  // 'YYYY-MM-DD' → 'DD/MM/YYYY'
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export default function MinutasVisitas() {
  const { soloLectura } = useVistaHU('HU-11');

  // Estados locales que crecen con cada registro/agenda nueva.
  const [minutas, setMinutas] = useState(minutasDummy);
  const [visitas, setVisitas] = useState(visitasDummy);

  // Forms por pestaña. Viven en el padre porque Tabs desmonta el contenido
  // inactivo (mismo patrón usado en HU-01).
  const [formMinuta, setFormMinuta] = useState({
    fecha: '',
    lugar: '',
    participantes: '',
    asunto: '',
    archivoPdf: ''
  });
  const [formVisita, setFormVisita] = useState({
    fecha: '',
    lugar: '',
    responsable: '',
    proposito: ''
  });
  const [periodoAcuerdos, setPeriodoAcuerdos] = useState(periodosAcuerdosDummy[0]);

  // Modal "adjuntar como referencia en nota" — placeholder consciente HU-09.
  const [modal, setModal] = useState({ abierto: false, tipo: '', folio: '' });
  const abrirModalAdjuntar = (tipo, folio) => setModal({ abierto: true, tipo, folio });
  const cerrarModal = () => setModal({ abierto: false, tipo: '', folio: '' });

  const registrarMinuta = () => {
    const folio = siguienteFolio(minutas, 'MIN');
    const nueva = {
      folio,
      fecha: formatoFechaMx(formMinuta.fecha),
      lugar: formMinuta.lugar.trim(),
      participantes: formMinuta.participantes.trim(),
      asunto: formMinuta.asunto.trim(),
      archivoPdf: formMinuta.archivoPdf,
      acuerdos: 0,
      esNueva: true
    };
    setMinutas((prev) => [nueva, ...prev]);
    setFormMinuta({ fecha: '', lugar: '', participantes: '', asunto: '', archivoPdf: '' });
  };

  const agendarVisita = () => {
    const folio = siguienteFolio(visitas, 'VIS');
    const nueva = {
      folio,
      fecha: formatoFechaMx(formVisita.fecha),
      lugar: formVisita.lugar.trim(),
      responsable: formVisita.responsable.trim(),
      proposito: formVisita.proposito.trim(),
      estado: 'Programada',
      esNueva: true
    };
    setVisitas((prev) => [nueva, ...prev]);
    setFormVisita({ fecha: '', lugar: '', responsable: '', proposito: '' });
  };

  const tabs = [
    {
      label: 'Minutas',
      content: (
        <TabMinutas
          form={formMinuta}
          setForm={setFormMinuta}
          minutas={minutas}
          onRegistrar={registrarMinuta}
          onAdjuntar={abrirModalAdjuntar}
          soloLectura={soloLectura}
        />
      )
    },
    {
      label: 'Agenda de visitas',
      content: (
        <TabVisitas
          form={formVisita}
          setForm={setFormVisita}
          visitas={visitas}
          onAgendar={agendarVisita}
          onAdjuntar={abrirModalAdjuntar}
          soloLectura={soloLectura}
        />
      )
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

      <ModalAdjuntarReferencia
        abierto={modal.abierto}
        onCerrar={cerrarModal}
        tipo={modal.tipo}
        folio={modal.folio}
      />

      <SeccionCriterios
        huId="HU-11"
        criterios={[
          { numero: 1, texto: 'Las minutas (con su PDF y metadatos) y las visitas registradas son visibles para los usuarios autorizados del contrato.' },
          { numero: 2, texto: 'Se pueden consultar los acuerdos y compromisos derivados, filtrados por contrato y periodo.' },
          { numero: 3, texto: 'Una minuta o registro de visita puede adjuntarse como referencia en una nota de bitácora (HU-09).' }
        ]}
      />
    </div>
  );
}
