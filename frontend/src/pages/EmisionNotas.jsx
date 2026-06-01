import { useState, useEffect, useCallback, useMemo } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// HU-09 conectado al backend. UN emisor por nota (art. 125): el rol emisor lo deduce
// el servidor por el equipo del contrato; el folio es correlativo del backend; las
// correcciones/respuestas son notas vinculadas (la original nunca se edita).

const folioFmt = (n) => (n == null ? '—' : 'BIT-' + String(n).padStart(4, '0'));
const soloFecha = (s) => (s ? String(s).slice(0, 10) : '');
const fechaHora = (s) => (s ? new Date(s).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '');
const ROL_LABEL = { residente: 'Residente', superintendente: 'Superintendente', supervision: 'Supervisión' };

const ACEPTACION = {
  en_plazo:        { label: 'En plazo de firma',  cls: 'bg-amber-100 text-amber-800' },
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

  // Formulario (emitir o responder/vincular)
  const [respondiendoA, setRespondiendoA] = useState(null); // id de nota o null
  const [tipo, setTipo] = useState('');
  const [asunto, setAsunto] = useState('');
  const [contenido, setContenido] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Anulación (dice / debe decir)
  const [anulando, setAnulando] = useState(null);   // id de nota o null
  const [correccion, setCorreccion] = useState('');

  const miRol = data?.mi_rol || null;
  const esParte = !!miRol;

  const tiposDeMiRol = useMemo(
    () => tipos.filter((t) => t.rol_emisor === miRol || t.rol_emisor === null),
    [tipos, miRol]
  );

  // mapa id -> numero para mostrar los vínculos como folio legible.
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
    setRespondiendoA(null); setAnulando(null);
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

  // Fija un tipo por defecto válido cuando cambian los tipos disponibles.
  useEffect(() => {
    if (tiposDeMiRol.length && !tiposDeMiRol.some((t) => t.clave === tipo)) {
      setTipo(tiposDeMiRol[0].clave);
    }
  }, [tiposDeMiRol]); // eslint-disable-line react-hooks/exhaustive-deps

  const iniciarRespuesta = (notaId) => {
    setRespondiendoA(notaId);
    setAsunto(''); setContenido(''); setAnulando(null);
    if (tiposDeMiRol.length) setTipo(tiposDeMiRol[0].clave);
  };
  const cancelarForm = () => { setRespondiendoA(null); setAsunto(''); setContenido(''); };

  const enviar = async () => {
    if (!tipo || !contenido.trim()) { showToast('Tipo y contenido son obligatorios'); return; }
    setEnviando(true);
    try {
      const payload = { tipo, asunto: asunto.trim(), contenido: contenido.trim() };
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

  const notas = data?.notas || [];

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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Libro de bitácora */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Libro de bitácora ({notas.length})</h2>
                  <span className="text-xs text-slate-500">Plazo de firma: <strong>{data.plazo_firma_dias} día(s)</strong></span>
                </div>
                <div className="space-y-2" data-testid="lista-notas">
                  {notas.length === 0 && <p className="text-sm text-slate-400 italic">Aún no hay notas en esta bitácora.</p>}
                  {notas.map((n) => {
                    const ac = ACEPTACION[n.aceptacion] || ACEPTACION.en_plazo;
                    const soyEmisor = n.emisor_id === usuario?.id;
                    const puedeAnular = !soloLectura && esParte && soyEmisor && n.estado === 'emitida' && n.aceptacion !== 'respondida';
                    const puedeResponder = !soloLectura && esParte && n.estado === 'emitida';
                    return (
                      <div
                        key={n.id}
                        className={`border rounded-md p-3 ${n.estado === 'anulada' ? 'border-slate-200 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'}`}
                        data-testid={`nota-${n.numero}`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold font-mono bg-sigecop-blue-light text-sigecop-blue">
                            {folioFmt(n.numero)} · {n.tipo_etiqueta || n.tipo}
                          </span>
                          <div className="flex items-center gap-2">
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
                        {n.vinculada_a && (
                          <div className="text-xs text-sigecop-blue mt-1" data-testid={`vinculo-${n.numero}`}>↪ Vinculada a {folioFmt(numeroPorId[n.vinculada_a])}</div>
                        )}
                        {(puedeResponder || puedeAnular) && (
                          <div className="mt-2 flex gap-4">
                            {puedeResponder && (
                              <button type="button" className="text-xs text-sigecop-blue hover:underline" onClick={() => iniciarRespuesta(n.id)} data-testid={`btn-responder-${n.numero}`}>
                                ↪ Responder / vincular
                              </button>
                            )}
                            {puedeAnular && (
                              <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => { setAnulando(n.id); setCorreccion(''); }} data-testid={`btn-anular-${n.numero}`}>
                                Anular (dice/debe decir)
                              </button>
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
                  })}
                </div>
              </div>

              {/* Formulario emitir / responder */}
              <div className="lg:col-span-1">
                {!esParte ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-sm text-slate-600" data-testid="aviso-observador">
                    Consultas esta bitácora como <strong>{ROL_LABEL[usuario?.rol] || usuario?.rol || 'observador'}</strong>; solo las partes del contrato (residente, superintendente, supervisión) emiten notas (art. 125 RLOPSRM).
                  </div>
                ) : soloLectura ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-sm text-slate-600">Vista en solo lectura.</div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-md p-5" data-testid="form-nota">
                    <h2 className="text-base font-bold text-sigecop-blue mb-3">
                      {respondiendoA ? `Responder a ${folioFmt(numeroPorId[respondiendoA])}` : 'Emitir nueva nota'}
                    </h2>
                    <div className="space-y-3">
                      <div>
                        <label className="sg-label">Tipo de nota (tu rol: {ROL_LABEL[miRol]})</label>
                        <select className="sg-input" value={tipo} onChange={(e) => setTipo(e.target.value)} data-testid="select-tipo">
                          {tiposDeMiRol.map((t) => <option key={t.clave} value={t.clave}>{t.etiqueta}</option>)}
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">Solo los tipos que tu rol puede emitir; “Otro” cubre eventos no tipificados (art. 125, último párrafo).</p>
                      </div>
                      <div>
                        <label className="sg-label">Asunto</label>
                        <input className="sg-input" value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Asunto breve (opcional)" data-testid="input-asunto" />
                      </div>
                      <div>
                        <label className="sg-label">Contenido *</label>
                        <textarea className="sg-input" rows={5} value={contenido} onChange={(e) => setContenido(e.target.value)} placeholder="Redacción de la nota" data-testid="input-contenido" />
                      </div>
                      <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-3 py-2 text-xs text-slate-800 rounded-r-md">
                        ⚠️ Al emitir, <strong>firmas la nota</strong> y queda <strong>inmutable</strong>. Para corregir, emite una nota vinculada.
                      </div>
                      <div className="flex justify-end gap-2">
                        {respondiendoA && <button type="button" className="px-3 py-2 text-slate-600 text-sm" onClick={cancelarForm}>Cancelar</button>}
                        <button type="button" className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed" disabled={enviando || !contenido.trim()} onClick={enviar} data-testid="btn-emitir">
                          {enviando ? 'Emitiendo…' : (respondiendoA ? 'Emitir respuesta' : 'Emitir nota')}
                        </button>
                      </div>
                    </div>
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
