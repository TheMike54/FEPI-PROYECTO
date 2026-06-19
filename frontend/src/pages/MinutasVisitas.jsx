import { useState, useEffect, useMemo, useCallback } from 'react';
import Tabs from '../components/ui/Tab.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// HU-11 (sesión E2 18-jun) — MINUTAS, VISITAS Y ACUERDOS, cableado al backend real (antes era maqueta).
// Minutas y visitas se persisten; el "adjuntar a nota" deja de ser informativo y LIGA la minuta/visita a una
// nota de bitácora del contrato (art. 123 fr. X RLOPSRM) SIN modificar la nota (relación, no edición). El
// PDF de la minuta es real. La pestaña Acuerdos deriva de los acuerdos capturados en las minutas del contrato.

const folioMin = (id) => `MIN-${String(id).padStart(3, '0')}`;
const folioVis = (id) => `VIS-${String(id).padStart(3, '0')}`;
const soloFecha = (s) => (s ? String(s).slice(0, 10) : '');
const fechaMx = (iso) => { const p = soloFecha(iso).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ''; };
const ESTADO_VIS = { agendada: 'Programada', realizada: 'Realizada', cancelada: 'Cancelada' };

function EstadoVisitaBadge({ estado }) {
  const label = ESTADO_VIS[estado] || estado;
  const colors = { Realizada: 'bg-green-100 text-sigecop-green-validation', Programada: 'bg-sigecop-blue-light text-sigecop-blue', Cancelada: 'bg-slate-200 text-slate-600' };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[label] || 'bg-slate-200 text-slate-600'}`}>{label}</span>;
}

// Modal "adjuntar a nota": ahora FUNCIONAL — selecciona una nota de la bitácora del contrato y persiste el vínculo.
function ModalAdjuntar({ abierto, tipo, item, notas, onCerrar, onVincular, guardando }) {
  const [notaId, setNotaId] = useState('');
  useEffect(() => { setNotaId(item?.nota_id ? String(item.nota_id) : ''); }, [item]);
  if (!abierto || !item) return null;
  const folio = tipo === 'minuta' ? folioMin(item.id) : folioVis(item.id);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" data-testid="modal-adjuntar-referencia">
      <div className="bg-white rounded-md shadow-lg max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-sigecop-blue mb-1">Adjuntar {tipo === 'minuta' ? 'la minuta' : 'la visita'} {folio} a una nota</h3>
        <p className="text-xs text-slate-500 mb-3">Se liga a una nota de bitácora del contrato (art. 123 fr. X RLOPSRM). NO modifica la nota firmada; es solo una referencia.</p>
        {notas.length === 0 ? (
          <p className="text-sm text-amber-700">Este contrato no tiene notas de bitácora todavía. Abre la bitácora y emite notas (HU-08/HU-09) para poder vincular.</p>
        ) : (
          <select className="sg-input" value={notaId} onChange={(e) => setNotaId(e.target.value)} data-testid="adjuntar-nota-select">
            <option value="">— Sin vincular —</option>
            {notas.map((n) => <option key={n.id} value={n.id}>#{n.numero} · {n.tipo_etiqueta || n.tipo} · {n.asunto || ''}</option>)}
          </select>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="px-4 py-2 text-slate-600 hover:text-slate-900" onClick={onCerrar} data-testid="btn-modal-cerrar">Cerrar</button>
          <button type="button" className="sg-btn-primary disabled:opacity-50" disabled={guardando || notas.length === 0} onClick={() => onVincular(notaId === '' ? null : Number(notaId))} data-testid="btn-vincular-nota">{guardando ? 'Guardando…' : 'Vincular'}</button>
        </div>
      </div>
    </div>
  );
}

function TabMinutas({ form, setForm, minutas, onRegistrar, onAdjuntar, soloLectura, hayContrato, guardando }) {
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const onFile = (e) => setForm((p) => ({ ...p, archivo: e.target.files?.[0] || null }));
  const datosOk = form.fecha && form.lugar.trim() && form.participantes.trim() && form.asunto.trim();
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Registrar minuta</h3>
      <RegionEditable disabled={soloLectura}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="sg-label">Fecha *</label><input type="date" className="sg-input" value={form.fecha} onChange={set('fecha')} data-testid="min-fecha" /></div>
          <div><label className="sg-label">Lugar *</label><input className="sg-input" placeholder="Sala de juntas — Residencia" value={form.lugar} onChange={set('lugar')} data-testid="min-lugar" /></div>
          <div className="md:col-span-2"><label className="sg-label">Participantes *</label><input className="sg-input" placeholder="Residente, Supervisión, Contratista…" value={form.participantes} onChange={set('participantes')} data-testid="min-participantes" /></div>
          <div className="md:col-span-2"><label className="sg-label">Asunto *</label><input className="sg-input" placeholder="Reunión de avance mensual" value={form.asunto} onChange={set('asunto')} data-testid="min-asunto" /></div>
          <div className="md:col-span-2"><label className="sg-label">Acuerdos</label><textarea className="sg-input" rows="2" placeholder="Acuerdos y compromisos de la minuta" value={form.acuerdos} onChange={set('acuerdos')} data-testid="min-acuerdos" /></div>
          <div className="md:col-span-2"><label className="sg-label">Adjuntar minuta (PDF)</label><input type="file" accept="application/pdf" className="sg-input" onChange={onFile} data-testid="min-archivo" />{form.archivo && <p className="text-xs text-slate-600 mt-1">Archivo: <strong>{form.archivo.name}</strong></p>}</div>
        </div>
      </RegionEditable>
      {!soloLectura && (
        <div className="mt-4 flex justify-end">
          <button type="button" className="sg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed" disabled={!datosOk || !hayContrato || guardando} title={!hayContrato ? 'Selecciona un contrato' : ''} onClick={onRegistrar} data-testid="btn-registrar-minuta">{guardando ? 'Registrando…' : 'Registrar minuta'}</button>
        </div>
      )}
      <h3 className="text-lg font-bold text-sigecop-blue mt-8 mb-3">Minutas registradas ({minutas.length})</h3>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm" data-testid="tabla-minutas">
          <thead className="bg-slate-50 text-slate-700"><tr>
            <th className="text-left p-3 font-semibold w-24">Folio</th><th className="text-left p-3 font-semibold">Fecha</th>
            <th className="text-left p-3 font-semibold">Lugar</th><th className="text-left p-3 font-semibold">Asunto</th>
            <th className="text-left p-3 font-semibold">Participantes</th><th className="text-left p-3 font-semibold">PDF</th>
            <th className="text-left p-3 font-semibold">Nota</th><th className="text-right p-3 font-semibold">Acción</th>
          </tr></thead>
          <tbody>
            {minutas.length === 0 ? (
              <tr><td colSpan="8" className="p-6 text-center text-slate-400 italic" data-testid="minutas-vacio">Sin minutas para este contrato.</td></tr>
            ) : minutas.map((m) => (
              <tr key={m.id} className="border-t border-slate-200 hover:bg-slate-50" data-testid={`minuta-${m.id}`}>
                <td className="p-3 font-mono text-xs">{folioMin(m.id)}</td>
                <td className="p-3 font-mono text-xs">{fechaMx(m.fecha)}</td>
                <td className="p-3">{m.lugar || '—'}</td>
                <td className="p-3 font-semibold">{m.titulo}</td>
                <td className="p-3 text-slate-700">{m.participantes || '—'}</td>
                <td className="p-3 text-xs">{m.tiene_pdf ? <button type="button" className="text-sigecop-accent hover:underline" onClick={() => onAdjuntar('verpdf-min', m)} data-testid={`btn-ver-pdf-min-${m.id}`}>👁 ver</button> : '—'}</td>
                <td className="p-3 text-xs" data-testid={`min-nota-${m.id}`}>{m.nota_id ? `#${m.nota_numero ?? m.nota_id}` : '—'}</td>
                <td className="p-3 text-right whitespace-nowrap">{!soloLectura && <button type="button" className="text-xs text-sigecop-accent hover:underline" onClick={() => onAdjuntar('minuta', m)} data-testid={`btn-adjuntar-${m.id}`}>📎 Adjuntar a nota</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabVisitas({ form, setForm, visitas, onAgendar, onAdjuntar, soloLectura, hayContrato, guardando }) {
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const datosOk = form.fecha && form.lugar.trim() && form.responsable.trim() && form.proposito.trim();
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Agendar visita</h3>
      <RegionEditable disabled={soloLectura}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="sg-label">Fecha *</label><input type="date" className="sg-input" value={form.fecha} onChange={set('fecha')} data-testid="vis-fecha" /></div>
          <div><label className="sg-label">Lugar *</label><input className="sg-input" placeholder="Frente de obra norte" value={form.lugar} onChange={set('lugar')} data-testid="vis-lugar" /></div>
          <div className="md:col-span-2"><label className="sg-label">Responsable *</label><input className="sg-input" placeholder="Supervisión" value={form.responsable} onChange={set('responsable')} data-testid="vis-responsable" /></div>
          <div className="md:col-span-2"><label className="sg-label">Propósito *</label><textarea className="sg-input" rows="3" placeholder="Descripción breve del propósito de la visita." value={form.proposito} onChange={set('proposito')} data-testid="vis-proposito" /></div>
        </div>
      </RegionEditable>
      {!soloLectura && (
        <div className="mt-4 flex justify-end">
          <button type="button" className="sg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed" disabled={!datosOk || !hayContrato || guardando} title={!hayContrato ? 'Selecciona un contrato' : ''} onClick={onAgendar} data-testid="btn-agendar-visita">{guardando ? 'Agendando…' : 'Agendar visita'}</button>
        </div>
      )}
      <h3 className="text-lg font-bold text-sigecop-blue mt-8 mb-3">Visitas ({visitas.length})</h3>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm" data-testid="tabla-visitas">
          <thead className="bg-slate-50 text-slate-700"><tr>
            <th className="text-left p-3 font-semibold w-24">Folio</th><th className="text-left p-3 font-semibold">Fecha</th>
            <th className="text-left p-3 font-semibold">Lugar</th><th className="text-left p-3 font-semibold">Responsable</th>
            <th className="text-left p-3 font-semibold">Propósito</th><th className="text-left p-3 font-semibold">Estado</th>
            <th className="text-left p-3 font-semibold">Nota</th><th className="text-right p-3 font-semibold">Acción</th>
          </tr></thead>
          <tbody>
            {visitas.length === 0 ? (
              <tr><td colSpan="8" className="p-6 text-center text-slate-400 italic" data-testid="visitas-vacio">Sin visitas para este contrato.</td></tr>
            ) : visitas.map((v) => (
              <tr key={v.id} className="border-t border-slate-200 hover:bg-slate-50" data-testid={`visita-${v.id}`}>
                <td className="p-3 font-mono text-xs">{folioVis(v.id)}</td>
                <td className="p-3 font-mono text-xs">{fechaMx(v.fecha_programada)}</td>
                <td className="p-3">{v.lugar || '—'}</td>
                <td className="p-3 text-slate-700">{v.responsable || '—'}</td>
                <td className="p-3 text-slate-700">{v.proposito || '—'}</td>
                <td className="p-3"><EstadoVisitaBadge estado={v.estado} /></td>
                <td className="p-3 text-xs" data-testid={`vis-nota-${v.id}`}>{v.nota_id ? `#${v.nota_numero ?? v.nota_id}` : '—'}</td>
                <td className="p-3 text-right whitespace-nowrap">{!soloLectura && <button type="button" className="text-xs text-sigecop-accent hover:underline" onClick={() => onAdjuntar('visita', v)} data-testid={`btn-adjuntar-vis-${v.id}`}>📎 Adjuntar a nota</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabAcuerdos({ minutas }) {
  const conAcuerdos = minutas.filter((m) => (m.acuerdos || '').trim());
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Acuerdos y compromisos (de las minutas del contrato)</h3>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700"><tr>
            <th className="text-left p-3 font-semibold">Minuta</th><th className="text-left p-3 font-semibold">Fecha</th>
            <th className="text-left p-3 font-semibold">Acuerdo</th><th className="text-left p-3 font-semibold">Nota vinculada</th>
          </tr></thead>
          <tbody>
            {conAcuerdos.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic">Sin acuerdos registrados en las minutas de este contrato.</td></tr>
            ) : conAcuerdos.map((m) => (
              <tr key={m.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="p-3 font-mono text-xs">{folioMin(m.id)} · {m.titulo}</td>
                <td className="p-3 font-mono text-xs">{fechaMx(m.fecha)}</td>
                <td className="p-3 text-slate-700">{m.acuerdos}</td>
                <td className="p-3 text-xs">{m.nota_id ? `#${m.nota_numero ?? m.nota_id}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MinutasVisitas() {
  const { token } = useSesion();
  const { soloLectura } = useVistaHU('HU-11');
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [minutas, setMinutas] = useState([]);
  const [visitas, setVisitas] = useState([]);
  const [notas, setNotas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [formMinuta, setFormMinuta] = useState({ fecha: '', lugar: '', participantes: '', asunto: '', acuerdos: '', archivo: null });
  const [formVisita, setFormVisita] = useState({ fecha: '', lugar: '', responsable: '', proposito: '' });
  const [modal, setModal] = useState({ abierto: false, tipo: '', item: null });

  useEffect(() => { if (!sinSesion) api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([])); }, [sinSesion]);

  const cargar = useCallback(async (id) => {
    if (!id) { setMinutas([]); setVisitas([]); setNotas([]); return; }
    try {
      const [m, v] = await Promise.all([api.minutasDeContrato(id), api.visitasDeContrato(id)]);
      setMinutas(Array.isArray(m?.minutas) ? m.minutas : []);
      setVisitas(Array.isArray(v?.visitas) ? v.visitas : []);
    } catch (e) { showToast(e.status === 403 ? 'No tienes acceso a este contrato' : 'No se pudieron cargar las minutas/visitas'); setMinutas([]); setVisitas([]); }
    try { const n = await api.notasDeContrato(id); setNotas(Array.isArray(n?.notas) ? n.notas : (Array.isArray(n) ? n : [])); } catch (_) { setNotas([]); }
  }, [showToast]);

  const seleccionar = (id) => { setContratoId(id); cargar(id); };

  const registrarMinuta = async () => {
    if (guardando || !contratoId) return; setGuardando(true);
    try {
      const res = await api.crearMinuta(contratoId, { titulo: formMinuta.asunto.trim(), fecha: formMinuta.fecha, lugar: formMinuta.lugar.trim(), participantes: formMinuta.participantes.trim(), acuerdos: formMinuta.acuerdos.trim() || null });
      if (formMinuta.archivo) await api.subirPdfMinuta(res.id, formMinuta.archivo);
      showToast('Minuta registrada.');
      setFormMinuta({ fecha: '', lugar: '', participantes: '', asunto: '', acuerdos: '', archivo: null });
      await cargar(contratoId);
    } catch (e) { showToast(e.status === 403 ? 'Solo el residente asignado puede registrar minutas' : (e.message || 'No se pudo registrar la minuta')); } finally { setGuardando(false); }
  };

  const agendarVisita = async () => {
    if (guardando || !contratoId) return; setGuardando(true);
    try {
      await api.crearVisita(contratoId, { fecha_programada: formVisita.fecha, lugar: formVisita.lugar.trim(), responsable: formVisita.responsable.trim(), proposito: formVisita.proposito.trim() });
      showToast('Visita agendada.');
      setFormVisita({ fecha: '', lugar: '', responsable: '', proposito: '' });
      await cargar(contratoId);
    } catch (e) { showToast(e.status === 403 ? 'Solo el residente asignado puede agendar visitas' : (e.message || 'No se pudo agendar la visita')); } finally { setGuardando(false); }
  };

  const onAdjuntar = async (tipo, item) => {
    if (tipo === 'verpdf-min') { try { const b = await api.descargarPdfMinuta(item.id); const u = URL.createObjectURL(b); window.open(u, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(u), 60000); } catch (e) { showToast(e.message || 'No se pudo abrir el PDF'); } return; }
    setModal({ abierto: true, tipo, item });
  };
  const vincular = async (notaId) => {
    if (guardando) return; setGuardando(true);
    try {
      if (modal.tipo === 'minuta') await api.vincularNotaMinuta(modal.item.id, notaId);
      else await api.vincularNotaVisita(modal.item.id, notaId);
      showToast(notaId ? 'Vinculado a la nota.' : 'Vínculo retirado.');
      setModal({ abierto: false, tipo: '', item: null });
      await cargar(contratoId);
    } catch (e) { showToast(e.message || 'No se pudo vincular'); } finally { setGuardando(false); }
  };

  const hayContrato = !!contratoId;
  const tabs = useMemo(() => [
    { label: 'Minutas', content: <TabMinutas form={formMinuta} setForm={setFormMinuta} minutas={minutas} onRegistrar={registrarMinuta} onAdjuntar={onAdjuntar} soloLectura={soloLectura} hayContrato={hayContrato} guardando={guardando} /> },
    { label: 'Agenda de visitas', content: <TabVisitas form={formVisita} setForm={setFormVisita} visitas={visitas} onAgendar={agendarVisita} onAdjuntar={onAdjuntar} soloLectura={soloLectura} hayContrato={hayContrato} guardando={guardando} /> },
    { label: 'Acuerdos', content: <TabAcuerdos minutas={minutas} /> },
  ], [formMinuta, formVisita, minutas, visitas, soloLectura, hayContrato, guardando]);

  return (
    <div>
      <HeaderVista huId="HU-11" titulo="Minutas y agenda de visitas" sprint="Sprint 7" rolAcademico="Residente"
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Bitácora' }, { label: 'Minutas y visitas' }]} />

      {sinSesion && <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">Inicia sesión para registrar minutas y visitas.</div>}

      <div className="bg-white border border-slate-200 rounded-md p-4 mb-6 max-w-2xl">
        <label className="sg-label">Contrato</label>
        <select className="sg-input" value={contratoId} onChange={(e) => seleccionar(e.target.value)} disabled={sinSesion} data-testid="select-contrato">
          <option value="">— Selecciona un contrato —</option>
          {contratos.map((c) => <option key={c.id} value={c.id}>{c.folio} · {c.objeto}</option>)}
        </select>
        {!contratoId && <p className="text-xs text-slate-500 mt-2">Selecciona un contrato para ver y registrar sus minutas y visitas.</p>}
      </div>

      <Tabs tabs={tabs} />

      <ModalAdjuntar abierto={modal.abierto} tipo={modal.tipo} item={modal.item} notas={notas}
        onCerrar={() => setModal({ abierto: false, tipo: '', item: null })} onVincular={vincular} guardando={guardando} />

      <SeccionCriterios huId="HU-11" criterios={[
        { numero: 1, texto: 'Las minutas (con su PDF y metadatos) y las visitas del contrato se registran y consultan desde la pantalla, ligadas al contrato.' },
        { numero: 2, texto: 'Los acuerdos capturados en las minutas se consultan en su pestaña, por contrato.' },
        { numero: 3, texto: 'Una minuta o visita puede adjuntarse como referencia a una nota de bitácora del contrato (art. 123 fr. X RLOPSRM), sin modificar la nota.' },
      ]} />
    </div>
  );
}
