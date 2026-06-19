import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import EncabezadoContrato from '../components/ui/EncabezadoContrato.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import MatrizProgramaLectura from '../components/programa/MatrizProgramaLectura.jsx';
import EditorProgramaConvenio from '../components/convenios/EditorProgramaConvenio.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import { round2 } from '../utils/formato.js';

// HU-03 (Fundación) — cableado al backend REAL de convenios modificatorios (art. 59 LOPSRM).
// El backend YA EXISTE (tabla convenios_modificatorios inmutable + versionado del programa de
// obra). La fuente de la verdad es el backend: aquí NO se calcula monto ni se fabrican datos;
// el monto/deltas/clasificación SFP(art.102 RLOPSRM)/ajuste(art.59 Bis) se derivan server-side.
//
// ALCANCE (Fase 1 + Fase 2): convenio de PLAZO end-to-end + EDITOR de catálogo+matriz para los
// convenios de MONTO/PROGRAMA/MIXTO (re-captura del catálogo + el programa completos; el backend
// DERIVA el monto de Σ ROUND(cant×pu,2) y revalida cuadre 100% + la regla de no reducir bajo lo ya estimado (criterio de diseño) + guardrail) + historial
// inmutable + lectura de versiones del programa (reusa MatrizProgramaLectura). El editor precarga
// el programa VIGENTE (detalleContrato + leerProgramaObra), permite ajustar conceptos/celdas y
// agregar conceptos; los periodos son los vigentes (no se regeneran en Etapa 1).
//
// Quién crea: solo 'dependencia' (permisos.js HU-03 nivel 'E'); el resto entra en solo-consulta
// (HeaderVista emite el banner). El backend es la 2.ª barrera (403 si no eres autoridad).
//
// Guardrail del 25%: el backend BLOQUEA (400) si la variación supera CONVENIO_LIMITE_VARIACION_PCT
// (default 25, NO tope legal del art. 59). La UI MUESTRA el aviso al superar 25% (revisión SFP,
// art. 102 RLOPSRM) y 50% (ajuste de costos, art. 59 Bis) y refleja el 400 del backend si ocurre.

const fmtMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneda = (n) => (n == null ? '—' : fmtMXN.format(Number(n) || 0));
const round3 = (n) => Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;
const TOL_PROGRAMA = 0.0005; // espejo del backend/alta: cuadre 100% por concepto (media milésima)

// dd/mm/aaaa hh:mm de un TIMESTAMPTZ (sello del evento, art.… ; lección Pase 2.2: con hora).
const fechaHora = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const f = d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const h = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return `${f} ${h}`;
};
// dd/mm/aaaa de una columna DATE (sin corrimiento de zona; la `fecha` del convenio es DATE).
const fechaMX = (iso) => {
  const p = String(iso || '').slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : '—';
};

const TIPO_LABEL = { monto: 'Monto', plazo: 'Plazo', programa: 'Programa', mixto: 'Mixto (combinado)' };
// Fase 2: los cuatro tipos son creables (monto/programa/mixto usan el editor de matriz).
const TIPOS_CREABLES = ['plazo', 'monto', 'programa', 'mixto'];
const TIPOS_TODOS = ['plazo', 'monto', 'programa', 'mixto'];

const pct = (n) => (n == null ? '—' : `${Number(n) >= 0 ? '+' : ''}${round2(n)}%`);

// Adapta el snapshot de una versión (GET /convenios/version/:id) al shape que espera
// MatrizProgramaLectura: las celdas del snapshot referencian concepto POR CLAVE y periodo POR
// NÚMERO; el componente indexa por `${concepto.id}:${periodo.id}`, así que usamos clave/numero
// como id sintético (las keys cuadran sin tocar el componente).
function snapshotAMatriz(detalle) {
  if (!detalle) return null;
  const conceptos = (detalle.conceptos || []).map((c) => ({
    id: c.clave, clave: c.clave, concepto: c.concepto, cantidad: c.cantidad
  }));
  const periodosMap = new Map();
  (detalle.celdas || []).forEach((cel) => {
    if (!periodosMap.has(cel.periodo_numero)) {
      periodosMap.set(cel.periodo_numero, {
        id: cel.periodo_numero, numero: cel.periodo_numero, inicio: cel.periodo_inicio, fin: cel.periodo_fin
      });
    }
  });
  const periodos = [...periodosMap.values()].sort((a, b) => a.numero - b.numero);
  const celdas = (detalle.celdas || []).map((cel) => ({
    contrato_concepto_id: cel.concepto_clave, contrato_periodo_id: cel.periodo_numero, cantidad: cel.cantidad
  }));
  return { ciclo: `versión ${detalle.version?.numero ?? ''}`.trim(), periodos, conceptos, celdas };
}

export default function ConveniosModificatorios() {
  const { token } = useSesion();
  const { soloLectura } = useVistaHU('HU-03');
  const { showToast } = useToast();
  const sinSesion = !token;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [cargando, setCargando] = useState(false);
  const [detalle, setDetalle] = useState(null);       // detalleContrato (monto/plazo vigentes)
  const [convenios, setConvenios] = useState([]);
  const [versiones, setVersiones] = useState([]);

  // Formulario (solo tipo 'plazo' en esta pasada).
  const [tipo, setTipo] = useState('plazo');
  const [plazoNuevo, setPlazoNuevo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [folio, setFolio] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [subiendoOficioId, setSubiendoOficioId] = useState(null); // FASE 0C: oficio de aprobación del convenio
  const [autorizandoId, setAutorizandoId] = useState(null); // ITEM 3.2: acto de autorización del servidor facultado

  // Detalle de versión expandido (snapshot del programa).
  const [verVersionId, setVerVersionId] = useState(null);
  const [detalleVersion, setDetalleVersion] = useState(null);
  const [cargandoVersion, setCargandoVersion] = useState(false);

  // Fase 2 — editor de catálogo + matriz (convenios de monto/programa/mixto).
  const [cmConceptos, setCmConceptos] = useState([]); // [{rid, conceptoId?, existente, clave, concepto, unidad, cantidad, pu}]
  const [cmCeldas, setCmCeldas] = useState({});       // {"rid:numero": cantidad}
  const [cmPeriodos, setCmPeriodos] = useState([]);   // [{id, numero, inicio, fin}] vigentes (no se regeneran)
  const [cargandoEditor, setCargandoEditor] = useState(false);
  const [editorError, setEditorError] = useState(null);
  const ridSeq = useRef(0);        // contador para rid únicos de conceptos nuevos
  const precargaToken = useRef(0);  // invalida precargas en vuelo (anti race al cambiar contrato/tipo)

  const selected = useMemo(() => contratos.find((c) => String(c.id) === String(contratoId)) || null, [contratos, contratoId]);
  const plazoVigente = detalle?.plazo_dias != null ? Number(detalle.plazo_dias) : null;
  const montoVigente = detalle?.monto != null ? Number(detalle.monto) : null;

  // Qué toca el convenio según el tipo (mismo criterio que el backend: crearConvenio).
  const tocaPrograma = tipo === 'monto' || tipo === 'programa' || tipo === 'mixto';
  const tocaPlazo = tipo === 'plazo' || tipo === 'mixto';

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const cargarContrato = useCallback(async (id) => {
    if (!id) { setDetalle(null); setConvenios([]); setVersiones([]); return; }
    setCargando(true);
    try {
      const [det, conv] = await Promise.all([
        api.detalleContrato(id).catch(() => null),
        api.convenios(id)
      ]);
      setDetalle(det);
      setConvenios(Array.isArray(conv?.convenios) ? conv.convenios : []);
      setVersiones(Array.isArray(conv?.versiones) ? conv.versiones : []);
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a los convenios de este contrato' : 'No se pudieron cargar los convenios');
      setDetalle(null); setConvenios([]); setVersiones([]);
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  const seleccionarContrato = useCallback((id) => {
    setContratoId(id);
    setConvenios([]); setVersiones([]); setDetalle(null);
    setVerVersionId(null); setDetalleVersion(null);
    setPlazoNuevo(''); setMotivo(''); setFolio('');
    setCmConceptos([]); setCmCeldas({}); setCmPeriodos([]); setEditorError(null);
    precargaToken.current++; // invalida cualquier precarga del contrato anterior aún en vuelo
    cargarContrato(id);
  }, [cargarContrato]);

  // O6: acceso directo desde el expediente (HU-04) vía ?contrato=ID — preselecciona en cuanto la lista
  // esté cargada y mientras el usuario no haya elegido otro a mano (mismo patrón que AlertasAtraso).
  const [searchParams] = useSearchParams();
  const contratoQuery = searchParams.get('contrato');
  useEffect(() => {
    if (sinSesion || !contratoQuery || contratoId) return;
    if (contratos.some((c) => String(c.id) === String(contratoQuery))) {
      seleccionarContrato(String(contratoQuery));
    }
  }, [sinSesion, contratoQuery, contratoId, contratos, seleccionarContrato]);

  // Precarga el editor con el programa VIGENTE: catálogo con P.U. (detalleContrato) + periodos y
  // celdas (leerProgramaObra). Las celdas del vigente se reindexan por rid sintético + periodo.
  // Guarda anti-race: si entra otra precarga (o cambia el contrato) mientras esta espera, su token
  // queda obsoleto y NO aplica su setState (evita que datos viejos pisen el estado actual).
  const precargarEditor = useCallback(async () => {
    if (!contratoId) return;
    const token = ++precargaToken.current;
    setCargandoEditor(true); setEditorError(null);
    try {
      const [det, prog] = await Promise.all([
        detalle ? Promise.resolve(detalle) : api.detalleContrato(contratoId),
        api.leerProgramaObra(contratoId),
      ]);
      if (token !== precargaToken.current) return; // precarga obsoleta: descártala
      const catalogo = Array.isArray(det?.conceptos) ? det.conceptos : [];
      const ridPorId = new Map();
      const conceptosEditor = catalogo.map((c) => {
        const rid = `c${c.id}`;
        ridPorId.set(c.id, rid);
        return {
          rid, conceptoId: c.id, existente: true,
          clave: c.clave || '', concepto: c.concepto || '', unidad: c.unidad || '',
          cantidad: c.cantidad != null ? String(c.cantidad) : '',
          pu: c.pu != null ? String(c.pu) : '',
        };
      });
      const periodosEditor = (Array.isArray(prog?.periodos) ? prog.periodos : [])
        .map((p) => ({ id: p.id, numero: p.numero, inicio: p.inicio, fin: p.fin }))
        .sort((a, b) => a.numero - b.numero);
      const numeroPorId = new Map(periodosEditor.map((p) => [p.id, p.numero]));
      const celdasEditor = {};
      for (const cel of (Array.isArray(prog?.celdas) ? prog.celdas : [])) {
        const rid = ridPorId.get(cel.contrato_concepto_id);
        const numero = numeroPorId.get(cel.contrato_periodo_id);
        if (rid != null && numero != null) celdasEditor[`${rid}:${numero}`] = String(cel.cantidad);
      }
      setCmConceptos(conceptosEditor);
      setCmPeriodos(periodosEditor);
      setCmCeldas(celdasEditor);
    } catch (e) {
      if (token !== precargaToken.current) return; // precarga obsoleta: no pises el estado actual
      setEditorError(e.status === 403 ? 'No tienes acceso al programa de este contrato' : 'No se pudo cargar el programa vigente del contrato');
      setCmConceptos([]); setCmPeriodos([]); setCmCeldas({});
    } finally {
      if (token === precargaToken.current) setCargandoEditor(false);
    }
  }, [contratoId, detalle]);

  // Al pasar a un tipo que toca el programa (con contrato + detalle cargados), precarga el editor.
  useEffect(() => {
    if (tocaPrograma && contratoId && detalle) precargarEditor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tocaPrograma, contratoId, detalle]);

  // --- Handlers del editor ---
  const setCmConceptoField = useCallback((idx, field, value) => {
    setCmConceptos((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }, []);
  const addCmConcepto = useCallback(() => {
    const rid = `n${ridSeq.current++}`;
    setCmConceptos((prev) => [...prev, { rid, existente: false, clave: '', concepto: '', unidad: '', cantidad: '', pu: '' }]);
  }, []);
  const removeCmConcepto = useCallback((idx) => {
    const target = cmConceptos[idx];
    if (!target || target.existente) return; // los conceptos existentes no se borran (catálogo completo)
    setCmConceptos((prev) => prev.filter((_, i) => i !== idx));
    setCmCeldas((cs) => {
      const next = {};
      for (const [k, v] of Object.entries(cs)) if (!k.startsWith(`${target.rid}:`)) next[k] = v;
      return next;
    });
  }, [cmConceptos]);
  const setCmCelda = useCallback((rid, numero, value) => {
    setCmCeldas((prev) => ({ ...prev, [`${rid}:${numero}`]: value }));
  }, []);

  // Preview EN VIVO del delta de plazo (espejo del cálculo server-side, solo informativo).
  const plazoNuevoNum = Number(plazoNuevo) || 0;
  const deltaPlazoPct = (plazoVigente && plazoVigente > 0 && plazoNuevoNum > 0)
    ? round2(((plazoNuevoNum - plazoVigente) / plazoVigente) * 100)
    : null;

  // Derivaciones del editor (monto al centavo + cuadre 100% por concepto). El backend revalida.
  const cmMontoNuevo = useMemo(
    () => round2(cmConceptos.reduce((s, c) => s + round2((Number(c.cantidad) || 0) * (Number(c.pu) || 0)), 0)),
    [cmConceptos]
  );
  const cmResumen = useMemo(
    () => cmConceptos.map((c) => {
      const contratado = round3(Number(c.cantidad) || 0);
      const planeado = round3(cmPeriodos.reduce((s, p) => s + (Number(cmCeldas[`${c.rid}:${p.numero}`]) || 0), 0));
      return { rid: c.rid, contratado, planeado, restante: round3(contratado - planeado) };
    }),
    [cmConceptos, cmPeriodos, cmCeldas]
  );
  const cmCuadra = cmResumen.length > 0 && cmPeriodos.length > 0 && cmResumen.every((r) => Math.abs(r.restante) <= TOL_PROGRAMA);
  // Cada concepto requiere clave + cantidad > 0 + P.U. > 0. El > 0 (no >= 0) impide poner en CERO
  // un concepto EXISTENTE (que el backend no puede borrar): un 0 accidental sería pérdida de dato.
  const cmCamposOk = cmConceptos.length > 0 && cmConceptos.every((c) => String(c.clave).trim() && Number(c.cantidad) > 0 && Number(c.pu) > 0);
  const cmSinDup = new Set(cmConceptos.map((c) => String(c.clave).trim())).size === cmConceptos.length;
  const cmDeltaMontoPct = (montoVigente != null && montoVigente > 0)
    ? round2(((cmMontoNuevo - montoVigente) / montoVigente) * 100)
    : null;

  // Avisos EN VIVO de los umbrales (informativos; el backend bloquea con el guardrail). Toma el
  // mayor |delta| aplicable según el tipo: plazo (tocaPlazo) y/o monto (tocaPrograma).
  const absPlazo = (tocaPlazo && deltaPlazoPct != null) ? Math.abs(deltaPlazoPct) : null;
  const absMonto = (tocaPrograma && cmDeltaMontoPct != null) ? Math.abs(cmDeltaMontoPct) : null;
  const hayDelta = absPlazo != null || absMonto != null;
  const absDeltaMax = Math.max(absPlazo ?? 0, absMonto ?? 0);
  const superaSfp = hayDelta && absDeltaMax > 25;    // art. 102 RLOPSRM (+ guardrail bloquea)
  const superaAjuste = hayDelta && absDeltaMax > 50; // art. 59 Bis LOPSRM
  const deltaDesc = [
    absPlazo != null ? `plazo ${pct(deltaPlazoPct)}` : null,
    absMonto != null ? `monto ${pct(cmDeltaMontoPct)}` : null,
  ].filter(Boolean).join(' · ');

  // Validez por tipo (espeja las exigencias del backend; el botón se gatea con esto, salvo el
  // guardrail 25% que es aviso + rechazo server-side, como en el plazo de Fase 1).
  const plazoCambiaOk = plazoNuevoNum > 0 && plazoVigente != null && plazoNuevoNum !== plazoVigente;
  const programaOk = cmCamposOk && cmSinDup && cmCuadra;
  const datosOk = motivo.trim().length > 0 && (
    tipo === 'plazo' ? plazoCambiaOk
      : tipo === 'mixto' ? (programaOk && plazoCambiaOk)
        : programaOk // monto | programa
  );
  const puedeRegistrar = !soloLectura && !registrando && !cargandoEditor && datosOk;

  const handleRegistrar = useCallback(async () => {
    if (!puedeRegistrar) return;
    setRegistrando(true);
    try {
      const payload = { tipo, motivo: motivo.trim() };
      if (folio.trim()) payload.folio = folio.trim();
      if (tocaPlazo) payload.plazo_nuevo_dias = plazoNuevoNum;
      if (tocaPrograma) {
        // Catálogo NUEVO completo (el backend deriva el monto y casa por clave).
        payload.conceptos = cmConceptos.map((c) => ({
          clave: String(c.clave).trim(), concepto: c.concepto || '', unidad: c.unidad || '',
          cantidad: Number(c.cantidad) || 0, pu: Number(c.pu) || 0,
        }));
        // Programa NUEVO completo (solo celdas > 0; el backend revalida cuadre 100%).
        const celdas = [];
        for (const c of cmConceptos) {
          for (const p of cmPeriodos) {
            const v = Number(cmCeldas[`${c.rid}:${p.numero}`]) || 0;
            if (v > 0) celdas.push({ clave: String(c.clave).trim(), periodoNumero: p.numero, cantidad: v });
          }
        }
        payload.celdas = celdas;
      }
      const res = await api.crearConvenio(Number(contratoId), payload);
      const avisos = [];
      if (res.requiere_revision_sfp) avisos.push('requiere revisión SFP (art. 102 RLOPSRM)');
      if (res.requiere_ajuste_costos) avisos.push('da derecho a ajuste de costos (art. 59 Bis)');
      const ref = folio.trim() || res.folio || `CM-${String(res.numero).padStart(3, '0')}`;
      const cambios = [];
      if (res.plazo_anterior_dias !== res.plazo_nuevo_dias) cambios.push(`plazo ${res.plazo_anterior_dias}→${res.plazo_nuevo_dias} días`);
      if (String(res.monto_anterior) !== String(res.monto_nuevo)) cambios.push(`monto ${moneda(res.monto_anterior)}→${moneda(res.monto_nuevo)}`);
      // O6: el convenio asentó su nota en la bitácora (en vivo) o quedó diferida si aún no hay bitácora.
      const notaMsg = res.nota_diferida
        ? ' · su nota de bitácora se asentará al abrir la bitácora'
        : (res.nota ? ` · nota de bitácora #${res.nota.numero} asentada` : '');
      showToast(`Convenio ${ref} registrado${cambios.length ? ' (' + cambios.join(' · ') + ')' : ''}${avisos.length ? ' · ' + avisos.join(' · ') : ''}${notaMsg}.`);
      setPlazoNuevo(''); setMotivo(''); setFolio('');
      setCmConceptos([]); setCmCeldas({}); setCmPeriodos([]);
      await cargarContrato(contratoId); // recarga vigente + historial; la precarga del editor se redispara
    } catch (e) {
      const msg = e.payload?.error || (
        e.status === 403 ? 'Solo la dependencia o el residente asignado puede registrar convenios'
          : e.status === 409 ? 'Conflicto de versión del programa; recarga e inténtalo de nuevo'
            : 'No se pudo registrar el convenio');
      showToast(msg);
    } finally {
      setRegistrando(false);
    }
  }, [puedeRegistrar, tipo, motivo, folio, tocaPlazo, tocaPrograma, plazoNuevoNum, cmConceptos, cmPeriodos, cmCeldas, contratoId, showToast, cargarContrato]);

  // FASE 0C (profe 16-jun) — OFICIO DE APROBACIÓN del convenio: subir (PDF, append-only) y verlo.
  const subirOficio = useCallback(async (convenioId, file) => {
    if (!file || subiendoOficioId) return;
    if (file.type !== 'application/pdf') { showToast('El oficio debe ser un PDF'); return; }
    setSubiendoOficioId(convenioId);
    try {
      await api.subirOficioConvenio(convenioId, file);
      showToast('Oficio de aprobación cargado. El convenio queda con su soporte documental.');
      await cargarContrato(contratoId); // recarga el historial → tiene_oficio = true
    } catch (e) {
      showToast(e.status === 409 ? 'El convenio ya tiene su oficio (inmutable)'
        : e.status === 403 ? 'Solo la dependencia o el residente asignado puede subir el oficio'
          : (e.message || 'No se pudo subir el oficio'));
    } finally {
      setSubiendoOficioId(null);
    }
  }, [subiendoOficioId, showToast, cargarContrato, contratoId]);

  // ITEM 3.2 — ACTO de AUTORIZACIÓN del servidor facultado (dependencia) sobre un convenio 'registrado'
  // (art. 59 párr. 3 LOPSRM). Guardrail art. 102: si la variación > 25% sin oficio, el backend responde
  // 409 y aquí se enlaza a cargar el oficio.
  const autorizar = useCallback(async (convenioId) => {
    if (autorizandoId) return;
    setAutorizandoId(convenioId);
    try {
      await api.autorizarConvenio(convenioId);
      showToast('Convenio AUTORIZADO por el servidor facultado (art. 59 LOPSRM).');
      await cargarContrato(contratoId);
    } catch (e) {
      const err = e.payload?.error || '';
      showToast(
        e.status === 409 && /25\s*%/.test(err) ? 'La variación supera el 25% (art. 102 RLOPSRM): carga el oficio de aprobación antes de autorizar.'
          : e.status === 409 ? (err || 'El convenio ya está autorizado')
            : e.status === 403 ? 'Solo el servidor facultado (dependencia) puede autorizar el convenio (art. 59 LOPSRM)'
              : (err || 'No se pudo autorizar el convenio')
      );
    } finally {
      setAutorizandoId(null);
    }
  }, [autorizandoId, showToast, cargarContrato, contratoId]);

  const verOficio = useCallback(async (convenioId) => {
    try {
      const blob = await api.descargarOficioConvenio(convenioId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      showToast(e.message || 'No se pudo abrir el oficio');
    }
  }, [showToast]);

  const verVersion = useCallback(async (versionId) => {
    if (verVersionId === versionId) { setVerVersionId(null); setDetalleVersion(null); return; }
    setVerVersionId(versionId);
    setDetalleVersion(null);
    setCargandoVersion(true);
    try {
      const d = await api.versionPrograma(versionId);
      setDetalleVersion(d);
    } catch (e) {
      showToast(e.status === 403 ? 'No tienes acceso a esta versión' : 'No se pudo cargar la versión');
      setVerVersionId(null);
    } finally {
      setCargandoVersion(false);
    }
  }, [verVersionId, showToast]);

  return (
    <div>
      <HeaderVista
        huId="HU-03"
        titulo="Trámite de convenios modificatorios"
        sprint="Sprint 6"
        rolAcademico="Dependencia"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Contratos' },
          { label: 'Convenios modificatorios' }
        ]}
      />

      {sinSesion && (
        <div className="bg-pagina border border-borde rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión para consultar o registrar convenios modificatorios.
        </div>
      )}

      <div className="bg-white border border-borde rounded-lg p-4 mb-6 max-w-2xl">
        <label className="sg-label">Contrato</label>
        <select
          className="sg-input"
          value={contratoId}
          onChange={(e) => seleccionarContrato(e.target.value)}
          disabled={sinSesion}
          data-testid="select-contrato"
        >
          <option value="">— Selecciona un contrato —</option>
          {contratos.map((c) => <option key={c.id} value={c.id}>{c.folio} · {c.objeto}</option>)}
        </select>
      </div>

      {!sinSesion && !contratoId && (
        <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para ver sus convenios y versiones del programa.</p>
      )}
      {cargando && <p className="text-sm text-slate-500 mb-4">Cargando convenios…</p>}

      {selected && !cargando && (
        <>
          <EncabezadoContrato
            titulo="Contrato"
            folio={selected.folio}
            items={[
              { value: selected.contratista || detalle?.contratista || '—' },
              { label: 'Monto vigente:', value: moneda(montoVigente), resaltado: true },
              { label: 'Plazo vigente:', value: plazoVigente != null ? `${plazoVigente} días` : '—', resaltado: true }
            ]}
          />

          {/* Formulario de creación — SOLO dependencia (nivel 'E'); el resto ve solo-consulta. */}
          {!soloLectura && (
            <div className="bg-white border border-borde rounded-lg p-6 mb-6">
              <h2 className="text-lg font-bold text-sigecop-blue mb-1">Nuevo convenio modificatorio</h2>
              <p className="text-xs text-slate-500 mb-4">
                Art. 59 LOPSRM. Convenios de <strong>plazo</strong>, <strong>monto</strong>, <strong>programa</strong> o
                <strong> mixto</strong>. Para monto/programa/mixto se re-captura el catálogo y el programa completos
                (el monto se DERIVA, no se teclea); el sistema versiona el programa de forma inmutable al registrar.
              </p>

              <RegionEditable disabled={soloLectura}>
                <div className="space-y-4">
                  <div>
                    <label className="sg-label">Tipo de convenio *</label>
                    <select
                      className="sg-input max-w-xs"
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                      data-testid="cm-tipo"
                    >
                      {TIPOS_TODOS.map((t) => (
                        <option key={t} value={t} disabled={!TIPOS_CREABLES.includes(t)}>
                          {TIPO_LABEL[t]}{TIPOS_CREABLES.includes(t) ? '' : ' (próxima entrega)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {tocaPlazo && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="sg-label">Plazo vigente</label>
                        <input
                          className="sg-input bg-pagina"
                          value={plazoVigente != null ? `${plazoVigente} días` : '—'}
                          readOnly
                          disabled
                          data-testid="cm-plazo-vigente"
                        />
                        <p className="text-xs text-slate-500 mt-1">Derivado del contrato (no editable).</p>
                      </div>
                      <div>
                        <label className="sg-label">Nuevo plazo (días) *</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="sg-input"
                          value={plazoNuevo}
                          onChange={(e) => setPlazoNuevo(e.target.value)}
                          data-testid="cm-plazo-nuevo"
                        />
                        {deltaPlazoPct != null && (
                          <p className="text-xs text-slate-600 mt-1" data-testid="cm-delta-plazo">
                            Variación: <strong>{pct(deltaPlazoPct)}</strong> vs plazo vigente.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Editor de catálogo + matriz (convenios de monto/programa/mixto). */}
                  {tocaPrograma && (
                    <div>
                      {cargandoEditor && <p className="text-sm text-slate-500">Cargando programa vigente…</p>}
                      {editorError && (
                        <div className="bg-peligro-bg border-l-4 border-peligro px-4 py-3 text-sm text-peligro rounded-r-md" data-testid="cm-editor-error">
                          {editorError}
                        </div>
                      )}
                      {!cargandoEditor && !editorError && (
                        <>
                          <EditorProgramaConvenio
                            conceptos={cmConceptos}
                            periodos={cmPeriodos}
                            celdas={cmCeldas}
                            soloLectura={soloLectura}
                            onConceptoField={setCmConceptoField}
                            onAddConcepto={addCmConcepto}
                            onRemoveConcepto={removeCmConcepto}
                            onCelda={setCmCelda}
                            resumen={cmResumen}
                            montoNuevo={cmMontoNuevo}
                            cuadra={cmCuadra}
                          />
                          {cmDeltaMontoPct != null && (
                            <p className="text-xs text-slate-600 mt-2" data-testid="cm-delta-monto">
                              Variación de monto: <strong>{pct(cmDeltaMontoPct)}</strong> ({moneda(montoVigente)} → {moneda(cmMontoNuevo)}).
                            </p>
                          )}
                          {!cmSinDup && (
                            <p className="text-xs text-peligro mt-1" data-testid="cm-claves-dup">Hay claves de concepto repetidas; corrige antes de registrar.</p>
                          )}
                          {cmSinDup && !cmCamposOk && cmConceptos.length > 0 && (
                            <p className="text-xs text-peligro mt-1" data-testid="cm-campos-incompletos">Cada concepto requiere clave, cantidad &gt; 0 y P.U. &gt; 0 (un concepto existente no se pone en cero).</p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="sg-label">Motivo / dictamen técnico * <span className="text-slate-400">(art. 99 RLOPSRM)</span></label>
                    <textarea
                      className="sg-input"
                      rows={3}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Razones fundadas y explícitas del convenio (dictamen técnico)…"
                      data-testid="cm-motivo"
                    />
                  </div>

                  <div className="max-w-xs">
                    <label className="sg-label">Folio del convenio <span className="text-slate-400">· opcional</span></label>
                    <input
                      className="sg-input"
                      value={folio}
                      onChange={(e) => setFolio(e.target.value)}
                      placeholder="Se genera CM-NNN si lo dejas vacío"
                      data-testid="cm-folio"
                    />
                  </div>

                  {/* Avisos EN VIVO de los umbrales (informativos; el backend es la fuente de la verdad). */}
                  {superaSfp && (
                    <div
                      className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm text-slate-800 rounded-r-md"
                      data-testid="aviso-sfp"
                    >
                      ⚠️ La variación (<strong>{deltaDesc}</strong>) supera el 25%: dispara
                      <strong> revisión de la Secretaría de la Función Pública</strong> (RLOPSRM art. 102).
                      El sistema tiene un guardrail configurable en 25% (decisión de configuración, NO el tope
                      legal del art. 59) que <strong>rechazará el registro</strong> mientras esté activo.
                    </div>
                  )}
                  {superaAjuste && (
                    <div
                      className="bg-aviso-bg border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm text-slate-800 rounded-r-md"
                      data-testid="aviso-ajuste"
                    >
                      ⚠️ Supera el 50%: el contratista puede solicitar <strong>ajuste de costos</strong>
                      indirectos y de financiamiento (LOPSRM art. 59 Bis).
                    </div>
                  )}
                </div>
              </RegionEditable>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed"
                  disabled={!puedeRegistrar}
                  onClick={handleRegistrar}
                  data-testid="btn-registrar-convenio"
                >
                  {registrando ? 'Registrando…' : 'Registrar convenio modificatorio'}
                </button>
              </div>
            </div>
          )}

          {/* Historial INMUTABLE de convenios (sin editar/anular: corregir = convenio nuevo). */}
          <div className="bg-white border border-borde rounded-lg overflow-hidden mb-6">
            <div className="px-6 py-3 border-b border-borde">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Convenios del contrato ({convenios.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="tabla-convenios">
                <thead className="bg-pagina text-tinta-sec">
                  <tr>
                    <th className="text-left p-3 font-semibold">N.º / folio</th>
                    <th className="text-left p-3 font-semibold">Tipo</th>
                    <th className="text-left p-3 font-semibold">Registrado</th>
                    <th className="text-left p-3 font-semibold">Cambio</th>
                    <th className="text-left p-3 font-semibold">Motivo</th>
                    <th className="text-left p-3 font-semibold">Avisos</th>
                    <th className="text-left p-3 font-semibold">Estado / autoriza</th>
                    <th className="text-left p-3 font-semibold">Nota de bitácora</th>
                    <th className="text-left p-3 font-semibold">Oficio de aprobación</th>
                  </tr>
                </thead>
                <tbody>
                  {convenios.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-slate-400 italic" data-testid="conv-vacio">
                        Este contrato no tiene convenios modificatorios registrados.
                      </td>
                    </tr>
                  ) : (
                    convenios.map((c) => (
                      <tr key={c.id} className="border-t border-borde align-top" data-testid={`fila-convenio-${c.id}`}>
                        <td className="p-3">
                          <div className="font-mono text-xs">{c.folio || `CM-${String(c.numero).padStart(3, '0')}`}</div>
                          <div className="text-[11px] text-slate-400">{fechaMX(c.fecha)}</div>
                        </td>
                        <td className="p-3">{TIPO_LABEL[c.tipo] || c.tipo}</td>
                        <td className="p-3 text-xs text-slate-600">{fechaHora(c.created_at)}</td>
                        <td className="p-3 text-xs">
                          {(c.monto_anterior != null || c.monto_nuevo != null) && (
                            <div>Monto: {moneda(c.monto_anterior)} → {moneda(c.monto_nuevo)} <span className="text-slate-400">({pct(c.delta_monto_pct)})</span></div>
                          )}
                          {(c.plazo_anterior_dias != null || c.plazo_nuevo_dias != null) && (
                            <div>Plazo: {c.plazo_anterior_dias ?? '—'} → {c.plazo_nuevo_dias ?? '—'} días <span className="text-slate-400">({pct(c.delta_plazo_pct)})</span></div>
                          )}
                        </td>
                        <td className="p-3 text-slate-700 max-w-xs">{c.motivo}</td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {c.requiere_revision_sfp && (
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-aviso-bg text-aviso border border-aviso/30" data-testid={`badge-sfp-${c.id}`}>
                                Revisión SFP (art. 102)
                              </span>
                            )}
                            {c.requiere_ajuste_costos && (
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-aviso-bg text-aviso border border-aviso/30">
                                Ajuste de costos (art. 59 Bis)
                              </span>
                            )}
                            {!c.requiere_revision_sfp && !c.requiere_ajuste_costos && (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-xs" data-testid={`conv-estado-${c.id}`}>
                          {c.estado === 'registrado' ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-block w-fit px-2 py-0.5 rounded text-[11px] font-semibold bg-aviso-bg text-aviso border border-aviso/30" data-testid={`conv-badge-registrado-${c.id}`}>
                                Pendiente de autorización
                              </span>
                              {!soloLectura && (
                                <button
                                  type="button"
                                  className="w-fit text-sigecop-accent hover:underline font-semibold disabled:text-slate-400 disabled:no-underline"
                                  disabled={autorizandoId != null}
                                  onClick={() => autorizar(c.id)}
                                  data-testid={`conv-autorizar-${c.id}`}
                                >
                                  {autorizandoId === c.id ? 'Autorizando…' : '✔ Autorizar convenio'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-block w-fit px-2 py-0.5 rounded text-[11px] font-semibold bg-exito-bg text-exito" data-testid={`conv-badge-autorizado-${c.id}`}>
                                Autorizado
                              </span>
                              <span className="text-[11px] text-slate-500">{c.autorizado_por_nombre || '—'}{c.autorizado_en ? ` · ${fechaHora(c.autorizado_en)}` : ''}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-xs" data-testid={`conv-nota-${c.id}`}>
                          {c.nota_numero != null ? (
                            <span className="inline-flex items-center gap-1 text-sigecop-accent font-semibold" title={c.nota_asunto || ''}>🔗 Nota #{c.nota_numero}</span>
                          ) : (
                            <span className="text-amber-700" data-testid={`conv-nota-pendiente-${c.id}`}>pendiente (al abrir bitácora)</span>
                          )}
                        </td>
                        <td className="p-3 text-xs">
                          {c.tiene_oficio ? (
                            <button
                              type="button"
                              className="text-sigecop-accent hover:underline font-semibold"
                              onClick={() => verOficio(c.id)}
                              data-testid={`conv-oficio-ver-${c.id}`}
                            >
                              📎 Ver oficio
                            </button>
                          ) : soloLectura ? (
                            <span className="text-slate-400">pendiente de oficio</span>
                          ) : (
                            <label className="inline-flex items-center gap-1 cursor-pointer text-sigecop-accent hover:underline" data-testid={`conv-oficio-subir-${c.id}`}>
                              {subiendoOficioId === c.id ? 'Subiendo…' : '⬆ Subir oficio (PDF)'}
                              <input
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                disabled={subiendoOficioId != null}
                                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; subirOficio(c.id, f); }}
                              />
                            </label>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="px-6 py-2 text-[11px] text-slate-400 border-t border-borde">
              Un convenio registrado es inalterable (art. 59 LOPSRM / art. 99 RLOPSRM): no se edita ni se anula; corregir = convenio nuevo.
            </p>
          </div>

          {/* Versiones del programa de obra (snapshots inmutables). Lectura. */}
          <div className="bg-white border border-borde rounded-lg overflow-hidden mb-6">
            <div className="px-6 py-3 border-b border-borde">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Versiones del programa de obra ({versiones.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="tabla-versiones">
                <thead className="bg-pagina text-tinta-sec">
                  <tr>
                    <th className="text-left p-3 font-semibold">Versión</th>
                    <th className="text-center p-3 font-semibold">Estado</th>
                    <th className="text-right p-3 font-semibold">Monto</th>
                    <th className="text-right p-3 font-semibold">Plazo</th>
                    <th className="text-left p-3 font-semibold">Creada</th>
                    <th className="text-left p-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {versiones.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400 italic" data-testid="versiones-vacio">
                        El programa de obra está en su versión original (ningún convenio lo ha modificado).
                      </td>
                    </tr>
                  ) : (
                    versiones.map((v) => (
                      <tr key={v.id} className="border-t border-borde" data-testid={`fila-version-${v.id}`}>
                        <td className="p-3 font-semibold">
                          v{v.numero}{v.convenio_id == null ? <span className="ml-1 text-[11px] font-normal text-slate-400">(original)</span> : null}
                        </td>
                        <td className="p-3 text-center">
                          {v.vigente
                            ? <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-exito-bg text-exito">Vigente</span>
                            : <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-slate-600">Sustituida</span>}
                        </td>
                        <td className="p-3 text-right">{moneda(v.monto)}</td>
                        <td className="p-3 text-right">{v.plazo_dias != null ? `${v.plazo_dias} días` : '—'}</td>
                        <td className="p-3 text-xs text-slate-600">{fechaHora(v.created_at)}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            className="text-sigecop-blue hover:underline text-xs font-semibold"
                            onClick={() => verVersion(v.id)}
                            data-testid={`btn-ver-version-${v.id}`}
                          >
                            {verVersionId === v.id ? 'Ocultar' : 'Ver programa'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {verVersionId != null && (
              <div className="px-6 py-4 border-t border-borde bg-pagina" data-testid="detalle-version">
                {cargandoVersion && <p className="text-sm text-slate-500">Cargando snapshot del programa…</p>}
                {!cargandoVersion && detalleVersion && (
                  <MatrizProgramaLectura programa={snapshotAMatriz(detalleVersion)} />
                )}
              </div>
            )}
          </div>
        </>
      )}

      <SeccionCriterios
        huId="HU-03"
        criterios={[
          { numero: 1, texto: 'El convenio modificatorio (art. 59 LOPSRM) registra tipo, motivo (dictamen técnico, art. 99 RLOPSRM), fecha/hora y autoridad; el monto y los porcentajes de variación los deriva el sistema (no se teclean).' },
          { numero: 2, texto: 'El sistema avisa cuando la variación supera el 25% (revisión de la SFP, RLOPSRM art. 102) o el 50% (ajuste de costos, LOPSRM art. 59 Bis), sin que esos umbrales sean topes del art. 59.' },
          { numero: 3, texto: 'Cada convenio que toca el programa genera una versión NUEVA (snapshot), sin alterar las anteriores; un convenio registrado es inalterable (corregir = convenio nuevo).' }
        ]}
      />

      <p className="mt-4 text-xs text-slate-500 italic text-center">
        Fundamento: art. 59 y 59 Bis LOPSRM · arts. 99, 100, 102 RLOPSRM.
      </p>
    </div>
  );
}
