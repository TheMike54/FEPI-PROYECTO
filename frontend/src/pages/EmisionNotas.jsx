import { useState, useEffect, useCallback, useMemo } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// HU-09 conectado al backend. Pasada bitácora:
//  · La APERTURA es la nota #1 (art. 123 fr. III); su firma es CONJUNTA (todos los participantes).
//  · CANDADO de emisión (server-side): no se emite hasta que la apertura esté firmada por TODOS.
//  · Firma de notas por la CONTRAPARTE (botón). UN emisor por nota (art. 125); folio del servidor.
//  · La emisión/respuesta es la PARTE CENTRAL; el libro va detrás de "Ver bitácora".

const folioFmt = (n) => (n == null ? '—' : 'BIT-' + String(n).padStart(4, '0'));
const soloFecha = (s) => (s ? String(s).slice(0, 10) : '');
const fechaHora = (s) => (s ? new Date(s).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '');
const ROL_LABEL = { residente: 'Residente', superintendente: 'Superintendente', supervision: 'Supervisión' };

const ACEPTACION = {
  en_plazo:        { label: 'En plazo de firma',  cls: 'bg-amber-100 text-amber-800' },
  firmada:         { label: 'Firmada',            cls: 'bg-green-100 text-sigecop-green-validation' },
  aceptada_tacita: { label: 'Aceptada (tácita)',  cls: 'bg-green-100 text-sigecop-green-validation' },
  respondida:      { label: 'Respondida',         cls: 'bg-sigecop-blue-light text-sigecop-blue' },
  anulada:         { label: 'Anulada',            cls: 'bg-slate-200 text-slate-600' }
};

export default function EmisionNotas() {
  const { token, usuario } = useSesion();
  const { soloLectura } = useVistaHU('HU-09');
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [apertura, setApertura] = useState(null);   // { id } de bitacora_aperturas
  const [sinApertura, setSinApertura] = useState(false);
  const [tipos, setTipos] = useState([]);
  const [data, setData] = useState(null);           // respuesta de listarNotas
  const [cargando, setCargando] = useState(false);
  const [verBitacora, setVerBitacora] = useState(false); // punto 6: el libro va detrás de un botón
  const [firmando, setFirmando] = useState(null);   // id (apertura o nota) que se está firmando

  // Formulario (emitir o responder/vincular)
  const [respondiendoA, setRespondiendoA] = useState(null); // id de nota o null
  const [tipo, setTipo] = useState('');
  const [asunto, setAsunto] = useState('');
  const [tag, setTag] = useState('');
  const [contenido, setContenido] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Anulación (dice / debe decir)
  const [anulando, setAnulando] = useState(null);   // id de nota o null
  const [correccion, setCorreccion] = useState('');

  const miRol = data?.mi_rol || null;
  const esParte = !!miRol;
  const aperturaCompleta = data?.apertura_completa === true;
  const firmantesApertura = data?.apertura_firmantes || [];
  const miFirmaAperturaPendiente = firmantesApertura.some((f) => f.usuario_id === usuario?.id && !f.firmado);

  // PUNTO 4: solo los tipos VIGENTES (activos) del rol del usuario (art. 125), + 'otro'.
  const tiposDeMiRol = useMemo(
    () => tipos.filter((t) => t.activo !== false && (t.rol_emisor === miRol || t.rol_emisor === null) && t.clave !== 'apertura'),
    [tipos, miRol]
  );

  const numeroPorId = useMemo(() => {
    const m = {};
    (data?.notas || []).forEach((n) => { m[n.id] = n.numero; });
    return m;
  }, [data]);

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
    api.notaTipos().then((l) => setTipos(Array.isArray(l) ? l : [])).catch(() => setTipos([]));
  }, [sinSesion]);

  const cargarNotas = useCallback(async (aperturaId) => {
    setCargando(true);
    try {
      setData(await api.listarNotas(aperturaId));
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a las notas de este contrato' : 'No se pudieron cargar las notas');
      setData(null);
    } finally { setCargando(false); }
  }, [showToast]);

  const seleccionar = useCallback(async (id) => {
    setContratoId(id);
    setApertura(null); setSinApertura(false); setData(null);
    setRespondiendoA(null); setAnulando(null); setVerBitacora(false);
    if (!id) return;
    setCargando(true);
    try {
      const b = await api.bitacoraDeContrato(id); // 404 si no hay apertura
      setApertura({ id: b.id });
      await cargarNotas(b.id);
    } catch (e) {
      if (e.status === 404) setSinApertura(true);
      else if (e.status === 403) showToast('No tienes acceso a este contrato');
      else showToast('No se pudo consultar la bitácora');
    } finally { setCargando(false); }
  }, [cargarNotas, showToast]);

  useEffect(() => {
    if (tiposDeMiRol.length && !tiposDeMiRol.some((t) => t.clave === tipo)) {
      setTipo(tiposDeMiRol[0].clave);
    }
  }, [tiposDeMiRol]); // eslint-disable-line react-hooks/exhaustive-deps

  const iniciarRespuesta = (notaId) => {
    setRespondiendoA(notaId);
    setAsunto(''); setContenido(''); setTag(''); setAnulando(null);
    if (tiposDeMiRol.length) setTipo(tiposDeMiRol[0].clave);
  };
  const cancelarForm = () => { setRespondiendoA(null); setAsunto(''); setContenido(''); setTag(''); };

  const enviar = async () => {
    if (!tipo || !contenido.trim()) { showToast('Tipo y contenido son obligatorios'); return; }
    setEnviando(true);
    try {
      const payload = { tipo, asunto: asunto.trim(), contenido: contenido.trim(), tag: tag.trim() };
      if (respondiendoA) await api.vincularNota(respondiendoA, payload);
      else await api.emitirNota(apertura.id, payload);
      showToast(respondiendoA ? 'Respuesta vinculada emitida' : 'Nota emitida y firmada');
      cancelarForm();
      await cargarNotas(apertura.id);
    } catch (e) {
      showToast(e.message || 'No se pudo emitir la nota');
    } finally { setEnviando(false); }
  };

  const confirmarAnular = async () => {
    if (!correccion.trim()) { showToast('Escribe la corrección (dice / debe decir)'); return; }
    try {
      await api.anularNota(anulando, { contenido: correccion.trim() });
      showToast('Nota anulada; se generó la nota correctiva vinculada');
      setAnulando(null); setCorreccion('');
      await cargarNotas(apertura.id);
    } catch (e) {
      showToast(e.message || 'No se pudo anular la nota');
    }
  };

  // PUNTO 2 — firma de la APERTURA (conjunta, todos los participantes).
  const firmarApertura = async () => {
    if (!apertura) return;
    setFirmando('apertura');
    try {
      const r = await api.firmarApertura(apertura.id);
      showToast(r.completa ? 'Firmaste. La apertura quedó COMPLETA: ya pueden emitirse notas.' : 'Firmaste tu parte. Faltan otras firmas.');
      await cargarNotas(apertura.id);
    } catch (e) {
      showToast(e.status === 409 ? 'Ya habías firmado la apertura' : (e.message || 'No se pudo firmar'));
    } finally { setFirmando(null); }
  };

  // PUNTO 2 — firma de una NOTA por la contraparte (no el emisor).
  const firmarNota = async (notaId) => {
    setFirmando(notaId);
    try {
      await api.firmarNota(notaId);
      showToast('Firmaste (aceptaste) la nota.');
      await cargarNotas(apertura.id);
    } catch (e) {
      showToast(e.message || 'No se pudo firmar la nota');
    } finally { setFirmando(null); }
  };

  const notas = data?.notas || [];
  const notaApertura = notas.find((n) => n.tipo === 'apertura') || null;
  const notasResto = notas.filter((n) => n.tipo !== 'apertura');

  // Tarjeta de una nota del libro (no apertura): firmas, vínculo, responder/anular/firmar.
  const NotaCard = (n) => {
    const ac = ACEPTACION[n.aceptacion] || ACEPTACION.en_plazo;
    const soyEmisor = n.emisor_id === usuario?.id;
    const yaFirme = (n.firmas || []).some((f) => f.usuario_id === usuario?.id);
    const puedeAnular = !soloLectura && esParte && soyEmisor && n.estado === 'emitida' && n.aceptacion !== 'respondida';
    const puedeResponder = !soloLectura && esParte && n.estado === 'emitida';
    const puedeFirmar = !soloLectura && esParte && !soyEmisor && !yaFirme && n.estado === 'emitida';
    return (
      <div key={n.id} className={`border rounded-md p-3 ${n.estado === 'anulada' ? 'border-slate-200 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'}`} data-testid={`nota-${n.numero}`}>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <span className="px-2 py-0.5 rounded text-xs font-semibold font-mono bg-sigecop-blue-light text-sigecop-blue">
            {folioFmt(n.numero)} · {n.tipo_etiqueta || n.tipo}
          </span>
          <div className="flex items-center gap-2">
            {n.tag && <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-100 text-violet-800" data-testid={`tag-${n.numero}`}>#{n.tag}</span>}
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${ac.cls}`} data-testid={`aceptacion-${n.numero}`}>{ac.label}</span>
            <span className="text-xs text-slate-500">{soloFecha(n.fecha)}</span>
          </div>
        </div>
        {n.asunto && <div className="text-xs font-semibold text-slate-800">{n.asunto}</div>}
        <div className={`text-xs text-slate-600 mt-1 ${n.estado === 'anulada' ? 'line-through' : ''}`}>{n.contenido}</div>
        <div className="text-xs text-slate-500 mt-1">
          Emisor: {n.emisor_nombre || '—'}{n.rol_emisor ? ` · ${ROL_LABEL[n.rol_emisor] || n.rol_emisor}` : ''}
          {n.firmado_en ? ` · firmó ${fechaHora(n.firmado_en)}` : ''}
        </div>
        {(n.firmas || []).length > 0 && (
          <div className="text-xs text-sigecop-green-validation mt-1" data-testid={`firmas-nota-${n.numero}`}>
            ✓ Aceptada por: {(n.firmas).map((f) => `${f.nombre || ROL_LABEL[f.rol_en_firma] || f.rol_en_firma} (${fechaHora(f.firmado_en)})`).join(' · ')}
          </div>
        )}
        {n.vinculada_a && (
          <div className="text-xs text-sigecop-blue mt-1" data-testid={`vinculo-${n.numero}`}>↪ Vinculada a {folioFmt(numeroPorId[n.vinculada_a])}</div>
        )}
        {(puedeResponder || puedeAnular || puedeFirmar) && (
          <div className="mt-2 flex gap-4 flex-wrap">
            {puedeFirmar && (
              <button type="button" className="text-xs text-sigecop-green-validation font-semibold hover:underline disabled:opacity-50" disabled={firmando === n.id} onClick={() => firmarNota(n.id)} data-testid={`btn-firmar-nota-${n.numero}`}>
                {firmando === n.id ? 'Firmando…' : '✓ Firmar (aceptar) nota'}
              </button>
            )}
            {puedeResponder && (
              <button type="button" className="text-xs text-sigecop-blue hover:underline" onClick={() => iniciarRespuesta(n.id)} data-testid={`btn-responder-${n.numero}`}>↪ Responder / vincular</button>
            )}
            {puedeAnular && (
              <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => { setAnulando(n.id); setCorreccion(''); }} data-testid={`btn-anular-${n.numero}`}>Anular</button>
            )}
          </div>
        )}
        {anulando === n.id && (
          <div className="mt-2 border-t border-slate-200 pt-2" data-testid={`form-anular-${n.numero}`}>
            <label className="sg-label">Corrección — “dice / debe decir”</label>
            <textarea className="sg-input" rows={2} value={correccion} onChange={(e) => setCorreccion(e.target.value)} placeholder="Dice: … / Debe decir: …" />
            <div className="flex justify-end gap-2 mt-1">
              <button type="button" className="text-xs text-slate-500" onClick={() => { setAnulando(null); setCorreccion(''); }}>Cancelar</button>
              <button type="button" className="sg-btn-primary text-xs py-1" onClick={confirmarAnular} data-testid={`btn-confirmar-anular-${n.numero}`}>Anular y corregir</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <HeaderVista
        huId="HU-09"
        titulo="Emisión y respuesta de notas tipificadas con firma"
        sprint="Sprint 2"
        descripcion="Un emisor por nota según su rol en el contrato (art. 125 RLOPSRM); folio del servidor e inmutabilidad."
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Bitácora' }, { label: 'Emisión de notas' }]}
      />

      {sinSesion ? (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-6 text-center text-sm text-slate-600">
          Inicia sesión en modo aplicación para emitir o consultar notas de bitácora.
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-md p-4 mb-6 max-w-2xl">
            <label className="sg-label">Contrato</label>
            <select className="sg-input" value={contratoId} onChange={(e) => seleccionar(e.target.value)} data-testid="select-contrato">
              <option value="">— Selecciona un contrato —</option>
              {contratos.map((c) => <option key={c.id} value={c.id}>{c.folio} · {c.objeto}</option>)}
            </select>
          </div>

          {!contratoId && <p className="text-sm text-slate-500">Selecciona un contrato para ver su bitácora.</p>}
          {contratoId && cargando && <p className="text-sm text-slate-500">Cargando…</p>}
          {contratoId && sinApertura && (
            <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 rounded-r-md text-sm text-slate-800" data-testid="sin-apertura">
              Este contrato aún no tiene <strong>bitácora aperturada</strong>. Apértala primero en “Apertura de bitácora” (HU-08); las notas solo existen sobre una bitácora abierta.
            </div>
          )}

          {contratoId && !cargando && apertura && data && (
            <div className="space-y-6">
              {/* PUNTO 1 + 2: la APERTURA es la nota #1; su firma es conjunta (todos los participantes). */}
              {notaApertura && (
                <div className="border-2 border-sigecop-blue/20 rounded-md p-4 bg-sigecop-blue-light/30" data-testid="apertura-nota">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold font-mono bg-sigecop-blue text-white">{folioFmt(notaApertura.numero)} · Apertura de bitácora</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${aperturaCompleta ? 'bg-green-100 text-sigecop-green-validation' : 'bg-amber-100 text-amber-800'}`} data-testid="apertura-firma-estado">
                      Firma conjunta {firmantesApertura.filter((f) => f.firmado).length}/{firmantesApertura.length}{aperturaCompleta ? ' — COMPLETA' : ' — PENDIENTE'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">{notaApertura.contenido}</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                    {firmantesApertura.map((f) => (
                      <div key={f.usuario_id || f.rol_en_firma} className={`border rounded p-2 text-xs ${f.firmado ? 'border-sigecop-green-validation bg-sigecop-green-bg/40' : 'border-slate-200 bg-white'}`} data-testid={`apertura-firmante-${f.rol_en_firma}`}>
                        <div className="font-semibold text-slate-500 uppercase tracking-wider">{ROL_LABEL[f.rol_en_firma] || f.rol_en_firma}</div>
                        <div className="text-slate-800">{f.nombre || '—'}</div>
                        {f.firmado ? <div className="text-sigecop-green-validation font-semibold">✓ {fechaHora(f.firmado_en)}</div> : <div className="text-amber-700 font-semibold">Pendiente</div>}
                      </div>
                    ))}
                  </div>
                  {!soloLectura && miFirmaAperturaPendiente && (
                    <div className="mt-3">
                      <button type="button" className="sg-btn-primary text-sm disabled:opacity-50" disabled={firmando === 'apertura'} onClick={firmarApertura} data-testid="btn-firmar-apertura">
                        {firmando === 'apertura' ? 'Firmando…' : 'Firmar apertura (nota #1)'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PUNTO 3: candado de emisión — server-side; la UI lo refleja. */}
              {!aperturaCompleta && (
                <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 rounded-r-md text-sm text-amber-800" data-testid="gate-emision">
                  No se pueden emitir notas hasta que la <strong>apertura esté firmada por TODOS</strong> los participantes
                  ({firmantesApertura.filter((f) => f.firmado).length}/{firmantesApertura.length}). art. 123 fr. III RLOPSRM.
                </div>
              )}

              {/* PUNTO 6: la emisión/respuesta es la PARTE CENTRAL. */}
              {!esParte ? (
                <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-sm text-slate-600" data-testid="aviso-observador">
                  Consultas esta bitácora como <strong>{ROL_LABEL[usuario?.rol] || usuario?.rol || 'observador'}</strong>; solo las partes del contrato (residente, superintendente, supervisión) emiten notas (art. 125 RLOPSRM).
                </div>
              ) : soloLectura ? (
                <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-sm text-slate-600">Vista en solo lectura.</div>
              ) : (
                <div className="bg-white border-2 border-sigecop-accent/30 rounded-md p-6 shadow-sm" data-testid="form-nota">
                  <h2 className="text-lg font-bold text-sigecop-blue mb-4">
                    {respondiendoA ? `Responder a ${folioFmt(numeroPorId[respondiendoA])}` : 'Emitir nueva nota'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="sg-label">Tipo de nota (tu rol: {ROL_LABEL[miRol]})</label>
                      <select className="sg-input" value={tipo} onChange={(e) => setTipo(e.target.value)} data-testid="select-tipo">
                        {tiposDeMiRol.map((t) => <option key={t.clave} value={t.clave}>{t.etiqueta}</option>)}
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1">Tipos del art. 125 RLOPSRM para tu rol; “Otro” cubre eventos no tipificados (último párrafo).</p>
                    </div>
                    <div>
                      <label className="sg-label">Tag de búsqueda</label>
                      <input className="sg-input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="p. ej. EST-1, CONCEPTO-A1 (opcional)" maxLength={60} data-testid="input-tag" />
                      <p className="text-[11px] text-slate-500 mt-1">Etiqueta corta para buscar la nota luego (HU-10).</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="sg-label">Asunto</label>
                      <input className="sg-input" value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Asunto breve (opcional)" data-testid="input-asunto" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="sg-label">Contenido *</label>
                      <textarea className="sg-input" rows={5} value={contenido} onChange={(e) => setContenido(e.target.value)} placeholder="Redacción de la nota" data-testid="input-contenido" />
                    </div>
                  </div>
                  <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-3 py-2 text-xs text-slate-800 rounded-r-md mt-4">
                    ⚠️ Al emitir, <strong>firmas la nota</strong> y queda <strong>inmutable</strong>. Para corregir, emite una nota vinculada.
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    {respondiendoA && <button type="button" className="px-3 py-2 text-slate-600 text-sm" onClick={cancelarForm}>Cancelar</button>}
                    <button type="button" className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed" disabled={enviando || !contenido.trim() || !aperturaCompleta} onClick={enviar} data-testid="btn-emitir">
                      {enviando ? 'Emitiendo…' : (respondiendoA ? 'Emitir respuesta' : 'Emitir nota')}
                    </button>
                  </div>
                  {!aperturaCompleta && <p className="text-[11px] text-amber-700 mt-2 text-right">Emisión bloqueada hasta completar la firma de la apertura.</p>}
                </div>
              )}

              {/* PUNTO 6: el libro de bitácora va detrás de "Ver bitácora". */}
              <div>
                <button type="button" className="sg-btn-secondary text-sm" onClick={() => setVerBitacora((v) => !v)} data-testid="btn-ver-bitacora">
                  {verBitacora ? '▾ Ocultar bitácora' : `▸ Ver bitácora (${notas.length} nota${notas.length === 1 ? '' : 's'})`}
                </button>
                {verBitacora && (
                  <div className="mt-3 space-y-2" data-testid="lista-notas">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Libro de bitácora</h2>
                      <span className="text-xs text-slate-500">Plazo de firma: <strong>{data.plazo_firma_dias} día(s)</strong></span>
                    </div>
                    {notaApertura && NotaCard(notaApertura)}
                    {notasResto.length === 0 && <p className="text-sm text-slate-400 italic">Aún no hay notas además de la apertura.</p>}
                    {notasResto.map((n) => NotaCard(n))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <SeccionCriterios
        huId="HU-09"
        criterios={[
          { numero: 1, texto: 'Aparecen los tipos de nota que corresponden al rol del usuario, pudiendo incorporar también otro tipo de nota para eventos no tipificados.' },
          { numero: 2, texto: 'Una nota firmada queda inmutable; las correcciones se hacen generando una nota vinculada (formato "dice / debe decir"), sin alterar la original.' },
          { numero: 3, texto: 'Cada nota queda registrada con folio correlativo, fecha, firma del emisor y vínculo opcional a nota previa.' }
        ]}
      />
      <p className="mt-4 text-xs text-slate-500 italic text-center">Fundamento: arts. 122, 123 y 125 RLOPSRM.</p>
    </div>
  );
}
