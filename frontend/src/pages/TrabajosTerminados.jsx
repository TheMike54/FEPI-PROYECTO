import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import EncabezadoContrato from '../components/ui/EncabezadoContrato.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import BannerContratoActivo from '../components/BannerContratoActivo.jsx';
import PestanasCiclo from '../components/PestanasCiclo.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { redimensionarImagen } from '../utils/imagen.js';

// HU-06 v2 (O4, 10-jun) — registro de avance POR PERIODO + NOTA automática + validación contra el
// programa VIGENTE (P14 del profe). Cada captura imputa una cantidad ejecutada a un concepto del
// catálogo y a un PERIODO del programa (SELECTOR, ya no fecha libre). El backend es la verdad:
//  · art. 118 RLOPSRM (BLOQUEO): Σ ejecutado por concepto ≤ contratado → 409.
//  · programa vigente por periodo (AVISO, O-PROFE): si el avance excede lo programado del periodo o el
//    concepto no estaba programado → se REGISTRA igual con aviso (adelantar a precios pactados no
//    requiere convenio); el backend devuelve aviso_programa. Solo art. 118 y conceptos fuera de catálogo bloquean.
//  · NOTA automática de bitácora tipo `avance` (se genera sola; diferida si no hay bitácora abierta).
//  · captura EDITABLE (PATCH/DELETE): no append-only.

const EPS = 1e-6;
const num = (n) => (Number(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 3 });
const fechaMX = (iso) => {
  const p = (iso || '').slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : '—';
};

const FORM_VACIO = { conceptoId: '', periodoNumero: '', cantidad: '', observaciones: '' };

// FIX 23-jun (Maiki): galería de EVIDENCIA FOTOGRÁFICA del AVANCE (HU-06). Espejo del patrón YA PROBADO de
// FotosEstimacion.jsx, adaptado a los endpoints de avance (api.listarFotosAvance / descargarFotoAvance /
// subirFotoAvance / eliminarFotoAvance). El backend (tabla avance_fotos en BYTEA) ya estaba completo; lo que
// faltaba era LISTAR y PINTAR lo subido. Una instancia por registro de avance (como una galería por estimación).
// Flujo completo: subir (con redimensionarImagen → no choca con el tope de 5 MB de multer) → ver de inmediato
// (recarga tras el POST) → eliminar (con recarga). Los blob URLs se revocan al recargar y al desmontar (sin fugas).
function FotosDeAvance({ avanceId, soloLectura = false }) {
  const [fotos, setFotos] = useState([]);      // metadatos de las fotos de ESTE avance
  const [urls, setUrls] = useState({});         // fotoId -> blobURL (descargado con Authorization)
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const urlsRef = useRef({});                   // espejo de `urls` para revocar al desmontar sin capturar estado viejo

  const setUrlsSafe = useCallback((updater) => {
    setUrls((prev) => { const next = typeof updater === 'function' ? updater(prev) : updater; urlsRef.current = next; return next; });
  }, []);

  const cargar = useCallback(async () => {
    if (!avanceId) return;
    setCargando(true); setError('');
    try {
      const lista = await api.listarFotosAvance(avanceId);
      const arr = Array.isArray(lista) ? lista : [];
      const nuevos = {};
      await Promise.all(arr.map(async (f) => { try { nuevos[f.id] = await api.descargarFotoAvance(f.id); } catch { /* skip */ } }));
      setFotos(arr);
      setUrlsSafe((prev) => { Object.values(prev).forEach((u) => { try { URL.revokeObjectURL(u); } catch { /* noop */ } }); return nuevos; });
    } catch { setError('No se pudieron cargar las fotos'); setFotos([]); }
    finally { setCargando(false); }
  }, [avanceId, setUrlsSafe]);

  useEffect(() => { cargar(); }, [cargar]);
  // Libera los blob URLs al desmontar (usa el ref para no fugar la última tanda cargada).
  useEffect(() => () => { Object.values(urlsRef.current).forEach((u) => { try { URL.revokeObjectURL(u); } catch { /* noop */ } }); }, []);

  // Sube una foto y RECARGA la galería: la recién subida aparece sola (resuelve el "no sé si se guardó").
  const subir = useCallback(async (file) => {
    if (!file) return;
    setSubiendo(true); setError('');
    try {
      const liviana = await redimensionarImagen(file);   // baja una foto de celular (>5 MB) por debajo del tope de multer
      await api.subirFotoAvance(avanceId, liviana, '');
      await cargar();
    } catch (err) { setError(err.message || 'No se pudo subir la foto'); }
    finally { setSubiendo(false); }
  }, [avanceId, cargar]);

  const onEliminar = async (fotoId) => {
    setError('');
    try { await api.eliminarFotoAvance(fotoId); await cargar(); }
    catch (err) { setError(err.message || 'No se pudo eliminar'); }
  };

  return (
    <div data-testid={`fotos-avance-${avanceId}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-tinta-ter">📷 Evidencia fotográfica del avance (art. 132 fr. IV RLOPSRM)</span>
        {!soloLectura && (
          <label className="text-[11px] font-semibold text-sigecop-blue hover:underline cursor-pointer whitespace-nowrap" data-testid={`foto-avance-subir-${avanceId}`}>
            {subiendo ? 'Subiendo…' : '+ Agregar foto'}
            <input type="file" accept="image/jpeg,image/png" className="hidden"
              onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; subir(f); }}
              disabled={subiendo} />
          </label>
        )}
      </div>
      {error && <p className="text-[11px] text-red-600 mb-1">{error}</p>}
      {cargando ? (
        <p className="text-[11px] text-tinta-ter">Cargando…</p>
      ) : fotos.length === 0 ? (
        <p className="text-[11px] text-tinta-ter">Sin fotos de este avance.{soloLectura ? '' : ' Sube JPEG/PNG (se redimensionan automáticamente).'}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {fotos.map((f) => (
            <div key={f.id} className="relative group">
              <a href={urls[f.id] || '#'} target="_blank" rel="noopener noreferrer" title={f.nombre || 'foto'}>
                {urls[f.id]
                  ? <img src={urls[f.id]} alt={f.nombre || 'foto de avance'} className="w-20 h-20 object-cover rounded border border-borde" />
                  : <div className="w-20 h-20 rounded border border-borde bg-pagina flex items-center justify-center text-base">📷</div>}
              </a>
              {!soloLectura && (
                <button type="button" onClick={() => onEliminar(f.id)} title="Eliminar foto"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-[11px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition" data-testid={`foto-avance-eliminar-${f.id}`}>×</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TrabajosTerminados() {
  const { token } = useSesion();
  const { soloLectura } = useVistaHU('HU-06');
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');

  const [conceptos, setConceptos] = useState([]);
  const [avances, setAvances] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [programa, setPrograma] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  // H2-B2-1 (25-jun): el registro de avance EXIGE ≥1 foto de evidencia (server-side); cada foto lleva descripción.
  // Estado: lista de { file, descripcion, key }.
  const [fotos, setFotos] = useState([]);

  // Edición inline de una entrada: { id, cantidad, observaciones } o null.
  const [edicion, setEdicion] = useState(null);

  const selected = useMemo(
    () => contratos.find((c) => String(c.id) === String(contratoId)) || null,
    [contratos, contratoId]
  );
  const conceptoById = useMemo(() => {
    const m = new Map();
    for (const c of conceptos) m.set(c.contrato_concepto_id, c);
    return m;
  }, [conceptos]);
  const periodoById = useMemo(() => {
    const m = new Map();
    for (const p of periodos) m.set(p.id, p);
    return m;
  }, [periodos]);
  // numero del periodo a partir de su id (los avances guardan contrato_periodo_id).
  const numeroDePeriodoId = useCallback((pid) => {
    const p = pid != null ? periodoById.get(pid) : null;
    return p ? p.numero : null;
  }, [periodoById]);
  const tienePrograma = programa.length > 0;

  // Carga inicial: contratos del usuario.
  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const recargar = useCallback(async (id) => {
    const data = await api.trabajosDeContrato(id);
    setConceptos(Array.isArray(data?.conceptos) ? data.conceptos : []);
    setAvances(Array.isArray(data?.avances) ? data.avances : []);
    const pers = Array.isArray(data?.periodos) ? data.periodos : [];
    setPeriodos(pers);
    setPrograma(Array.isArray(data?.programa) ? data.programa : []);
    // FIX 22-jun (profe): preselecciona el periodo EN CURSO (el que contiene hoy) o, si el contrato ya
    // terminó, el último que ya inició. El avance se reporta sobre el periodo vigente, no uno libre.
    const hoy = new Date().toISOString().slice(0, 10);
    const vig = pers.find((p) => String(p.inicio).slice(0, 10) <= hoy && hoy <= String(p.fin).slice(0, 10))
      || [...pers].reverse().find((p) => String(p.inicio).slice(0, 10) <= hoy) || null;
    if (vig) setForm((f) => (f.periodoNumero ? f : { ...f, periodoNumero: String(vig.numero) }));
  }, []);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id);
    setConceptos([]); setAvances([]); setPeriodos([]); setPrograma([]);
    setForm(FORM_VACIO); setEdicion(null);
    if (!id) return;
    setCargando(true);
    try {
      await recargar(id);
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a este contrato' : 'No se pudieron cargar los trabajos del contrato');
    } finally {
      setCargando(false);
    }
  }, [recargar, showToast]);

  // B6b: preselecciona el contrato del ?contrato=ID al venir del ambiente de avance (sin re-seleccionar a mano).
  const [searchParams] = useSearchParams();
  const contratoQuery = searchParams.get('contrato');
  useEffect(() => {
    if (sinSesion || !contratoQuery || contratoId) return;
    if (contratos.some((c) => String(c.id) === String(contratoQuery))) seleccionarContrato(String(contratoQuery));
  }, [sinSesion, contratoQuery, contratoId, contratos, seleccionarContrato]);

  const setCampo = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  // ---- Renglón del programa para el concepto + periodo seleccionados (referencia P14) ----
  const conceptoSel = form.conceptoId ? conceptoById.get(Number(form.conceptoId)) : null;
  const periodoSel = form.periodoNumero ? periodos.find((p) => String(p.numero) === String(form.periodoNumero)) || null : null;
  // FIX 22-jun: número del periodo EN CURSO (para marcarlo en el selector).
  const periodoVigenteNum = (() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const v = periodos.find((p) => String(p.inicio).slice(0, 10) <= hoy && hoy <= String(p.fin).slice(0, 10))
      || [...periodos].reverse().find((p) => String(p.inicio).slice(0, 10) <= hoy);
    return v ? v.numero : null;
  })();
  const cantNueva = Number(form.cantidad) || 0;

  // Programado del periodo, programado acumulado (≤ periodo sel) y ejecutado acumulado (≤ periodo sel),
  // todo sobre el concepto seleccionado. Espeja el cálculo del backend (programa_obra por periodo).
  const refPrograma = useMemo(() => {
    if (!conceptoSel || !periodoSel) return null;
    const cid = conceptoSel.contrato_concepto_id;
    const celdas = programa.filter((p) => p.contrato_concepto_id === cid);
    const programadoPeriodo = celdas.reduce((s, p) => {
      const per = periodoById.get(p.contrato_periodo_id);
      return per && per.numero === periodoSel.numero ? s + Number(p.cantidad) : s;
    }, 0);
    const programadoAcum = celdas.reduce((s, p) => {
      const per = periodoById.get(p.contrato_periodo_id);
      return per && per.numero <= periodoSel.numero ? s + Number(p.cantidad) : s;
    }, 0);
    const ejecutadoAcum = avances.reduce((s, a) => {
      if (a.contrato_concepto_id !== cid || !a.contrato_periodo_id) return s;
      const n = numeroDePeriodoId(a.contrato_periodo_id);
      return n != null && n <= periodoSel.numero ? s + Number(a.cantidad) : s;
    }, 0);
    const disponible = Math.max(0, programadoAcum - ejecutadoAcum);
    const conceptoTieneCeldas = celdas.length > 0;
    return { programadoPeriodo, programadoAcum, ejecutadoAcum, disponible, conceptoTieneCeldas };
  }, [conceptoSel, periodoSel, programa, periodoById, avances, numeroDePeriodoId]);

  // Validación en vivo (guía; el backend es la verdad):
  const validacion = useMemo(() => {
    if (!conceptoSel) return {};
    const contratada = Number(conceptoSel.cantidad_contratada);
    const acumNuevo = Number(conceptoSel.acumulado_ejecutado) + cantNueva;
    const excede118 = acumNuevo > contratada + EPS;
    let noProgramado = false, excedePeriodo = false;
    if (tienePrograma && refPrograma && periodoSel && cantNueva > 0) {
      if (refPrograma.programadoAcum <= EPS) noProgramado = true;
      else if (refPrograma.ejecutadoAcum + cantNueva > refPrograma.programadoAcum + EPS) excedePeriodo = true;
    }
    return { acumNuevo, excede118, noProgramado, excedePeriodo };
  }, [conceptoSel, cantNueva, tienePrograma, refPrograma, periodoSel]);

  // O-PROFE: SOLO el art. 118 (acumulado sobre lo contratado) BLOQUEA el registro. noProgramado y
  // excedePeriodo son AVISOS (no bloquean): adelantar avance a precios pactados no requiere convenio.
  const puedeGuardar = !soloLectura && !guardando && !!conceptoSel && !!periodoSel && cantNueva > 0
    && !validacion.excede118; // D1 (26-jun): la foto de evidencia es OPCIONAL (art. 132 fr. IV RLOPSRM es discrecional)

  // Toggle "Ejecuté todo lo programado del periodo" → autollena la cantidad con lo disponible.
  const autollenarTodo = () => {
    if (!refPrograma) return;
    setCampo('cantidad', String(refPrograma.disponible));
  };

  const registrar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      // H2-B2-1 (25-jun): la(s) foto(s) van EN LA MISMA petición que crea el avance (multipart). Se redimensionan
      // en cliente antes de enviar; el backend exige ≥1 foto (cierra #22) y guarda la descripción por foto.
      const fd = new FormData();
      fd.append('contrato_concepto_id', String(Number(form.conceptoId)));
      fd.append('periodo_numero', String(Number(form.periodoNumero)));
      fd.append('cantidad', String(cantNueva));
      if (form.observaciones) fd.append('observaciones', form.observaciones);
      const descripciones = [];
      for (const f of fotos) {
        const liviana = await redimensionarImagen(f.file);
        fd.append('fotos', liviana, (f.file && f.file.name) || 'foto.jpg');
        descripciones.push(f.descripcion || '');
      }
      fd.append('descripciones', JSON.stringify(descripciones));
      const r = await api.registrarAvance(fd);
      const baseMsg = r?.nota_diferida ? 'Avance registrado. La nota de bitácora se asentará al abrir la bitácora.' : 'Avance registrado y nota de bitácora asentada.';
      const avisos = [r?.aviso_periodo, r?.aviso_programa].filter(Boolean);
      showToast(avisos.length ? `${baseMsg} ⚠ ${avisos.join(' · ')}` : baseMsg);
      setForm(FORM_VACIO);
      setFotos([]);
      await recargar(contratoId);
    } catch (e) {
      // 409 art.118 / programa por periodo; 400 forma; 403 no parte — mensaje del backend tal cual.
      showToast(e.payload?.error || e.message || 'No se pudo registrar el avance');
    } finally {
      setGuardando(false);
    }
  };

  // ---- Edición de una entrada existente (cantidad / observaciones; la nota es de sistema) ----
  const abrirEdicion = (a) => setEdicion({ id: a.id, cantidad: String(a.cantidad), observaciones: a.observaciones || '' });
  const setEdicionCampo = (campo, valor) => setEdicion((prev) => ({ ...prev, [campo]: valor }));

  // FIX 3.3 — append-only: "corregir" NO edita la fila; anula la original y registra una NUEVA vinculada
  // (con su nota "dice/debe decir"). art. 123 fr. VI/VII RLOPSRM.
  const guardarEdicion = async () => {
    if (!edicion) return;
    setGuardando(true);
    try {
      const r = await api.corregirAvance(edicion.id, {
        cantidad: Number(edicion.cantidad) || 0,
        observaciones: edicion.observaciones || null
      });
      showToast(r?.aviso_programa ? `Avance corregido (registro nuevo). ⚠ ${r.aviso_programa}` : 'Avance corregido: se anuló la entrada anterior y se registró la corrección.');
      setEdicion(null);
      await recargar(contratoId);
    } catch (e) {
      showToast(e.payload?.error || e.message || 'No se pudo corregir el avance');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <HeaderVista
        huId="HU-06"
        titulo="Registro de trabajos terminados"
        sprint="Sprint 7"
        rolAcademico="Contratista"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Seguimiento' },
          { label: 'Trabajos terminados' }
        ]}
      />

      <PestanasCiclo ciclo="avance" activo="trabajos" />

      {sinSesion && (
        <div className="bg-pagina border border-borde rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión en modo aplicación para cargar tus contratos y registrar avance.
        </div>
      )}

      {/* P3 (3A): el contrato se HEREDA del contrato activo global; el banner carga datos vía el mismo
          handler que usaba el <select> y ofrece "Cambiar". Sin contrato activo, el modal bloqueante cubre. */}
      <BannerContratoActivo seleccionar={seleccionarContrato} contratoId={contratoId} />

      {!sinSesion && !contratoId && (
        <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para registrar el avance ejecutado por concepto y periodo.</p>
      )}
      {cargando && <p className="text-sm text-slate-500 mb-4">Cargando trabajos del contrato…</p>}

      {selected && !cargando && (
        <>
          <EncabezadoContrato
            titulo="Contrato"
            folio={selected.folio}
            items={[
              { value: selected.contratista || '—' },
              { label: 'Conceptos:', value: String(conceptos.length), resaltado: true }
            ]}
          />

          {/* --- Resumen ejecutado por concepto (lectura) --- */}
          <div className="bg-white border border-borde rounded-lg overflow-hidden mb-6">
            <div className="px-6 py-3 border-b border-borde">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Avance ejecutado acumulado por concepto del catálogo
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="tabla-conceptos">
                <thead className="bg-pagina text-tinta-sec">
                  <tr>
                    <th className="text-left p-3 font-semibold">Clave</th>
                    <th className="text-left p-3 font-semibold">Concepto</th>
                    <th className="text-center p-3 font-semibold">Unidad</th>
                    <th className="text-right p-3 font-semibold">Contratada</th>
                    <th className="text-right p-3 font-semibold">Ejecutado acum.</th>
                    <th className="text-right p-3 font-semibold">% avance</th>
                  </tr>
                </thead>
                <tbody>
                  {conceptos.length === 0 ? (
                    <tr><td colSpan="6" className="p-6 text-center text-slate-400 italic">Este contrato no tiene catálogo de conceptos.</td></tr>
                  ) : (
                    conceptos.map((c) => {
                      const contratada = Number(c.cantidad_contratada);
                      const ejec = Number(c.acumulado_ejecutado);
                      const pct = contratada > 0 ? (ejec / contratada) * 100 : 0;
                      return (
                        <tr key={c.contrato_concepto_id} className="border-t border-borde hover:bg-pagina" data-fila-id={c.contrato_concepto_id}>
                          <td className="p-3 font-mono text-xs text-slate-500">{c.clave || '—'}</td>
                          <td className="p-3 font-semibold">{c.concepto}</td>
                          <td className="p-3 text-center text-slate-500">{c.unidad}</td>
                          <td className="p-3 text-right font-mono">{num(contratada)}</td>
                          <td className="p-3 text-right font-mono">{num(ejec)}</td>
                          <td className="p-3 text-right font-mono text-sigecop-blue">{pct.toFixed(1)}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* --- Captura de un nuevo avance (por PERIODO) --- */}
          {!soloLectura && (
            <RegionEditable disabled={soloLectura}>
              <div className="bg-white border border-borde rounded-lg p-4 mb-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Registrar avance ejecutado
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Selecciona el concepto y el <strong>periodo</strong> del programa. La nota de bitácora del avance se
                  genera automáticamente (art. 125 fr. II). El registro se valida contra lo programado del periodo.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="sg-label">Concepto del catálogo</label>
                    <select
                      className="sg-input"
                      value={form.conceptoId}
                      onChange={(e) => setCampo('conceptoId', e.target.value)}
                      data-testid="cap-concepto"
                    >
                      <option value="">— Selecciona un concepto —</option>
                      {conceptos.map((c) => (
                        <option key={c.contrato_concepto_id} value={c.contrato_concepto_id}>
                          {(c.clave ? `${c.clave} · ` : '')}{c.concepto} ({c.unidad})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="sg-label">Periodo del programa</label>
                    <select
                      className="sg-input"
                      value={form.periodoNumero}
                      onChange={(e) => setCampo('periodoNumero', e.target.value)}
                      data-testid="cap-periodo"
                      disabled={periodos.length === 0}
                    >
                      <option value="">— Selecciona un periodo —</option>
                      {periodos.map((p) => (
                        <option key={p.id} value={p.numero}>Periodo {p.numero} ({fechaMX(p.inicio)} – {fechaMX(p.fin)}){p.numero === periodoVigenteNum ? ' — en curso' : ''}</option>
                      ))}
                    </select>
                    {periodos.length === 0 && (
                      <p className="text-xs text-amber-700 mt-1">Este contrato no tiene programa por periodos; no se puede registrar avance por periodo.</p>
                    )}
                  </div>
                </div>

                {/* Renglón del programa del concepto seleccionado para el periodo (referencia P14). */}
                {conceptoSel && periodoSel && refPrograma && (
                  <div className="mt-4 bg-guinda-soft border border-guinda/20 rounded-lg p-4" data-testid="ref-programa">
                    <div className="text-xs font-semibold uppercase tracking-wider text-guinda mb-2">Programa del concepto en el periodo {periodoSel.numero}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div><span className="block text-xs text-slate-500">Programado del periodo</span><span className="font-mono font-semibold" data-testid="ref-programado-periodo">{num(refPrograma.programadoPeriodo)}</span></div>
                      <div><span className="block text-xs text-slate-500">Programado acum.</span><span className="font-mono font-semibold" data-testid="ref-programado-acum">{num(refPrograma.programadoAcum)}</span></div>
                      <div><span className="block text-xs text-slate-500">Ejecutado acum.</span><span className="font-mono font-semibold" data-testid="ref-ejecutado-acum">{num(refPrograma.ejecutadoAcum)}</span></div>
                      <div><span className="block text-xs text-slate-500">Disponible</span><span className="font-mono font-semibold text-guinda" data-testid="ref-disponible">{num(refPrograma.disponible)}</span></div>
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-borde-fuerte text-guinda"
                        checked={cantNueva > 0 && Math.abs(cantNueva - refPrograma.disponible) < EPS}
                        onChange={(e) => { if (e.target.checked) autollenarTodo(); else setCampo('cantidad', ''); }}
                        data-testid="toggle-todo-periodo"
                        disabled={refPrograma.disponible <= 0}
                      />
                      Ejecuté todo lo programado del periodo ({num(refPrograma.disponible)})
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="sg-label">Cantidad ejecutada</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className={`sg-input text-right font-mono ${validacion.excede118 ? 'border-red-500 ring-2 ring-red-200' : (validacion.noProgramado || validacion.excedePeriodo) ? 'border-amber-400 ring-2 ring-amber-100' : ''}`}
                      value={form.cantidad}
                      onChange={(e) => setCampo('cantidad', e.target.value)}
                      data-testid="cap-cantidad"
                    />
                    {conceptoSel && (
                      <p className="text-xs text-slate-500 mt-1">
                        Acum. total: <span className={`font-mono ${validacion.excede118 ? 'text-red-700 font-bold' : ''}`}>{num(validacion.acumNuevo)}</span> / {num(conceptoSel.cantidad_contratada)} contratada
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="sg-label">Observaciones (opcional)</label>
                    <input
                      type="text"
                      className="sg-input"
                      value={form.observaciones}
                      onChange={(e) => setCampo('observaciones', e.target.value)}
                      data-testid="cap-observaciones"
                    />
                  </div>
                </div>

                {/* H2-B2-1 — Fotos de evidencia REQUERIDAS (≥1), con descripción por foto. Se adjuntan AL registrar. */}
                <div className="mt-4">
                  <label className="sg-label">
                    Fotos de evidencia <span className="text-red-600">*</span>
                    <span className="text-xs font-normal text-slate-500"> (al menos una — se adjuntan al registrar; puedes agregar varias)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    className="sg-input"
                    onChange={(e) => {
                      const nuevas = Array.from(e.target.files || []).map((file) => ({ file, descripcion: '', key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}` }));
                      if (nuevas.length) setFotos((prev) => [...prev, ...nuevas]);
                      e.target.value = '';
                    }}
                    data-testid="cap-foto-evidencia"
                  />
                  {fotos.length === 0
                    ? <p className="text-xs text-tinta-ter mt-1" data-testid="foto-evidencia-falta">Opcional: puedes adjuntar fotos de evidencia (art. 132 fr. IV RLOPSRM, discrecional).</p>
                    : (
                      <ul className="mt-2 space-y-2" data-testid="foto-evidencia-ok">
                        {fotos.map((f, i) => (
                          <li key={f.key} className="flex items-center gap-2 text-xs">
                            <span className="text-emerald-700 shrink-0">📷 {f.file.name}</span>
                            <input
                              type="text"
                              className="sg-input flex-1 py-1 text-xs"
                              placeholder="Descripción de esta foto (opcional)"
                              value={f.descripcion}
                              maxLength={300}
                              onChange={(e) => setFotos((prev) => prev.map((x, j) => (j === i ? { ...x, descripcion: e.target.value } : x)))}
                              data-testid={`foto-descripcion-${i}`}
                            />
                            <button type="button" className="text-red-600 hover:underline shrink-0" onClick={() => setFotos((prev) => prev.filter((_, j) => j !== i))} data-testid={`foto-quitar-${i}`}>quitar</button>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>

                {validacion.excede118 && (
                  <div className="mt-4 bg-red-50 border-l-4 border-red-500 px-4 py-3 text-sm text-red-800 rounded-r-md" data-testid="aviso-exceso">
                    ⛔ <strong>La cantidad acumulada excede lo contratado</strong> en este concepto (art. 118 RLOPSRM). Ajusta la cantidad o tramita un convenio modificatorio (HU-03).
                  </div>
                )}
                {!validacion.excede118 && validacion.noProgramado && (
                  <div className="mt-4 bg-amber-50 border-l-4 border-amber-400 px-4 py-3 text-sm text-amber-800 rounded-r-md" data-testid="aviso-no-programado">
                    ⚠ El concepto <strong>no está programado en el periodo {periodoSel?.numero}</strong> (ni antes). Verifica el monto y los conceptos nuevos. <strong>Se puede registrar</strong> (adelantar a precios pactados no requiere convenio).
                  </div>
                )}
                {!validacion.excede118 && !validacion.noProgramado && validacion.excedePeriodo && (
                  <div className="mt-4 bg-amber-50 border-l-4 border-amber-400 px-4 py-3 text-sm text-amber-800 rounded-r-md" data-testid="aviso-excede-periodo">
                    ⚠ <strong>Excede lo programado del periodo {periodoSel?.numero}</strong>: ejecutado acumulado {num(refPrograma?.ejecutadoAcum)} + {num(cantNueva)} supera lo programado {num(refPrograma?.programadoAcum)}. Verifica el monto y los conceptos nuevos. <strong>Se puede registrar</strong> (no requiere convenio).
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed"
                    disabled={!puedeGuardar}
                    onClick={registrar}
                    data-testid="btn-registrar-avance"
                  >
                    {guardando ? 'Registrando…' : 'Registrar avance'}
                  </button>
                </div>
              </div>
            </RegionEditable>
          )}

          {/* --- Entradas de avance registradas --- */}
          <div className="bg-white border border-borde rounded-lg overflow-hidden">
            <div className="px-6 py-3 border-b border-borde">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Avances registrados ({avances.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="tabla-avances">
                <thead className="bg-pagina text-tinta-sec">
                  <tr>
                    <th className="text-left p-3 font-semibold">Concepto</th>
                    <th className="text-right p-3 font-semibold">Cantidad</th>
                    <th className="text-left p-3 font-semibold">Periodo</th>
                    <th className="text-left p-3 font-semibold">Nota (bitácora)</th>
                    <th className="text-left p-3 font-semibold">Observaciones</th>
                    {!soloLectura && <th className="text-center p-3 font-semibold w-40">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {avances.length === 0 ? (
                    <tr><td colSpan={soloLectura ? 5 : 6} className="p-6 text-center text-slate-400 italic">Sin avances registrados.</td></tr>
                  ) : (
                    avances.map((a) => {
                      const c = conceptoById.get(a.contrato_concepto_id);
                      const per = a.contrato_periodo_id ? periodoById.get(a.contrato_periodo_id) : null;
                      const editando = edicion && edicion.id === a.id;
                      return (
                        <Fragment key={a.id}>
                        <tr className={`border-t border-borde ${editando ? 'bg-sigecop-blue-light' : 'hover:bg-pagina'}`} data-avance-id={a.id}>
                          <td className="p-3">{c ? c.concepto : `#${a.contrato_concepto_id}`}</td>
                          <td className="p-3 text-right font-mono">
                            {editando ? (
                              <input
                                type="number" min="0" step="any"
                                className="sg-input text-right font-mono w-28"
                                value={edicion.cantidad}
                                onChange={(e) => setEdicionCampo('cantidad', e.target.value)}
                                data-testid={`edit-cantidad-${a.id}`}
                              />
                            ) : num(a.cantidad)}
                          </td>
                          <td className="p-3">{per ? `Periodo ${per.numero}` : <span className="text-slate-400">—</span>}</td>
                          <td className="p-3">
                            {a.nota_id
                              ? `#${a.nota_numero ?? a.nota_id}`
                              : (Number(a.cantidad) > 0
                                  ? <span className="text-amber-700 text-xs" data-testid={`nota-pendiente-${a.id}`}>pendiente (al abrir bitácora)</span>
                                  : <span className="text-slate-400">—</span>)}
                          </td>
                          <td className="p-3 text-slate-700">
                            {editando ? (
                              <input
                                type="text"
                                className="sg-input"
                                value={edicion.observaciones}
                                onChange={(e) => setEdicionCampo('observaciones', e.target.value)}
                                data-testid={`edit-obs-${a.id}`}
                              />
                            ) : (a.observaciones || <span className="text-slate-400">—</span>)}
                          </td>
                          {!soloLectura && (
                            <td className="p-3 text-center whitespace-nowrap">
                              {editando ? (
                                <>
                                  <button type="button" className="text-xs text-sigecop-green-validation hover:underline mr-3" disabled={guardando} onClick={guardarEdicion} data-testid={`btn-guardar-edit-${a.id}`}>Guardar</button>
                                  <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => setEdicion(null)}>Cancelar</button>
                                </>
                              ) : (
                                <>
                                  {/* FIX 3.3 — append-only: las entradas vigentes se CORRIGEN (registro nuevo); las anuladas
                                      quedan en el histórico marcadas. Ya no hay "Editar"/"Eliminar". */}
                                  {a.estado === 'anulada' ? (
                                    <span className="text-xs text-slate-400 italic" data-testid={`avance-anulado-${a.id}`}>anulada (corregida)</span>
                                  ) : (
                                    <button type="button" className="text-xs text-sigecop-blue hover:underline" onClick={() => abrirEdicion(a)} data-testid={`btn-corregir-${a.id}`}>Corregir</button>
                                  )}
                                </>
                              )}
                            </td>
                          )}
                        </tr>
                        {/* FIX 23-jun (Maiki): galería de evidencia fotográfica de ESTE avance (subir → ver → eliminar). */}
                        <tr className="border-t border-borde/60 bg-pagina/40" data-testid={`fotos-avance-row-${a.id}`}>
                          <td colSpan={soloLectura ? 5 : 6} className="px-6 pb-4 pt-0">
                            <FotosDeAvance avanceId={a.id} soloLectura={soloLectura || a.estado === 'anulada'} />
                          </td>
                        </tr>
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <SeccionCriterios
        huId="HU-06"
        criterios={[
          { numero: 1, texto: 'Cada cantidad capturada queda ligada al concepto del catálogo y al PERIODO del programa, y genera una nota de bitácora del avance (art. 125 fr. II).' },
          { numero: 2, texto: 'El sistema AVISA (no bloquea) si el avance del periodo excede lo programado o el concepto no estaba programado: adelantar a precios pactados no requiere convenio (se registra, verificando monto/conceptos).' },
          { numero: 3, texto: 'El sistema BLOQUEA el registro solo cuando la cantidad acumulada excede la contratada (art. 118 RLOPSRM) o se introducen conceptos fuera del catálogo.' }
        ]}
      />

      <p className="mt-4 text-xs text-slate-500 italic text-center">
        Fundamento: art. 118 RLOPSRM (cantidad sobre contratada sin orden no es pagable) + art. 45-A-X RLOPSRM / art. 52 LOPSRM (programa por periodo).
      </p>
    </div>
  );
}
