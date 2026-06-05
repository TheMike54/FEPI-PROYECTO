import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// HU-06 Fase 4 — cableado al backend real (/api/trabajos). Cada captura es una cantidad
// EJECUTADA imputada a un concepto del catálogo, a un periodo del programa (derivado de la
// fecha) y respaldada por una nota de bitácora tipo `avance`. La verdad la calcula el
// backend; la validación del cliente es solo guía:
//  · art. 118 RLOPSRM (BLOQUEO): Σ ejecutado por concepto ≤ contratado → el backend devuelve 409.
//  · nota `avance` REQUERIDA si cantidad > 0 → 400.
//  · exceso vs programa por periodo → ALERTA (no bloquea), la devuelve el POST/PATCH.
//  · captura EDITABLE (POST/PATCH/DELETE), no append-only.

const EPS = 1e-6;
const num = (n) => (Number(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 3 });
// dd/mm/aaaa sin corrimiento de zona horaria (parte de fecha de un ISO/Date).
const fechaMX = (iso) => {
  const p = (iso || '').slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : '—';
};
// Periodo cuyo [inicio, fin] contiene la fecha (mosaico contiguo sin solapes → a lo sumo
// uno). Espeja derivarPeriodo del backend; null si ninguno aplica o la fecha es inválida.
function derivarPeriodo(periodos, fecha) {
  const f = (fecha || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return null;
  return periodos.find((p) => p.inicio.slice(0, 10) <= f && p.fin.slice(0, 10) >= f) || null;
}

const FORM_VACIO = { conceptoId: '', cantidad: '', fecha: '', notaId: '', observaciones: '' };

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
  const [notas, setNotas] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [alertasPost, setAlertasPost] = useState([]);

  // Edición inline de una entrada: { id, cantidad, notaId, observaciones } o null.
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
  const notaById = useMemo(() => {
    const m = new Map();
    for (const n of notas) m.set(n.id, n);
    return m;
  }, [notas]);
  const periodoById = useMemo(() => {
    const m = new Map();
    for (const p of periodos) m.set(p.id, p);
    return m;
  }, [periodos]);

  // Carga inicial: contratos del usuario.
  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const recargar = useCallback(async (id) => {
    const data = await api.trabajosDeContrato(id);
    setConceptos(Array.isArray(data?.conceptos) ? data.conceptos : []);
    setAvances(Array.isArray(data?.avances) ? data.avances : []);
    setPeriodos(Array.isArray(data?.periodos) ? data.periodos : []);
    setPrograma(Array.isArray(data?.programa) ? data.programa : []);
    setNotas(Array.isArray(data?.notas) ? data.notas : []);
  }, []);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id);
    setConceptos([]); setAvances([]); setPeriodos([]); setPrograma([]); setNotas([]);
    setForm(FORM_VACIO); setAlertasPost([]); setEdicion(null);
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

  const setCampo = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  // ---- Validación en vivo del NUEVO avance (guía; el backend es la verdad) ----
  const conceptoSel = form.conceptoId ? conceptoById.get(Number(form.conceptoId)) : null;
  const cantNueva = Number(form.cantidad) || 0;
  const periodoDerivado = useMemo(() => derivarPeriodo(periodos, form.fecha), [periodos, form.fecha]);

  const validacion = useMemo(() => {
    if (!conceptoSel) return { excede: false, requiereNota: false, acumNuevo: 0, alertaPeriodo: null };
    const contratada = Number(conceptoSel.cantidad_contratada);
    const acumNuevo = Number(conceptoSel.acumulado_ejecutado) + cantNueva;
    const excede = acumNuevo > contratada + EPS;
    const requiereNota = cantNueva > 0 && !form.notaId;

    // Alerta por periodo (NO bloquea): Σ ejecutado hasta el periodo derivado + esta cantidad
    // vs Σ planeado (programa_obra) hasta cp.fin. Solo si hay periodo y el concepto tiene programa.
    let alertaPeriodo = null;
    if (periodoDerivado) {
      const cid = Number(form.conceptoId);
      const celdas = programa.filter((p) => p.contrato_concepto_id === cid);
      if (celdas.length > 0) {
        const finCorte = periodoDerivado.fin.slice(0, 10);
        const planeado = celdas.reduce((s, p) => {
          const per = periodoById.get(p.contrato_periodo_id);
          return per && per.fin.slice(0, 10) <= finCorte ? s + Number(p.cantidad) : s;
        }, 0);
        const ejec = avances.reduce((s, a) => {
          if (a.contrato_concepto_id !== cid || !a.contrato_periodo_id) return s;
          const per = periodoById.get(a.contrato_periodo_id);
          return per && per.fin.slice(0, 10) <= finCorte ? s + Number(a.cantidad) : s;
        }, 0);
        const ejecutado = ejec + cantNueva;
        if (ejecutado > planeado + EPS) alertaPeriodo = { ejecutado, planeado, periodo_numero: periodoDerivado.numero };
      }
    }
    return { excede, requiereNota, acumNuevo, alertaPeriodo };
  }, [conceptoSel, cantNueva, form.notaId, form.conceptoId, periodoDerivado, programa, avances, periodoById]);

  const fechaOk = /^\d{4}-\d{2}-\d{2}$/.test(form.fecha);
  const puedeGuardar = !soloLectura && !guardando && !!conceptoSel && cantNueva > 0
    && fechaOk && !validacion.excede && !validacion.requiereNota;

  const registrar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true); setAlertasPost([]);
    try {
      const r = await api.registrarAvance({
        contrato_concepto_id: Number(form.conceptoId),
        cantidad: cantNueva,
        fecha: form.fecha,
        nota_id: form.notaId ? Number(form.notaId) : null,
        observaciones: form.observaciones || null
      });
      showToast('Avance registrado');
      setAlertasPost(Array.isArray(r?.alertas) ? r.alertas : []);
      setForm(FORM_VACIO);
      await recargar(contratoId);
    } catch (e) {
      // Errores localizados del backend tal cual (409 art.118; 400 nota/forma; 403 no parte).
      showToast(e.payload?.error || e.message || 'No se pudo registrar el avance');
    } finally {
      setGuardando(false);
    }
  };

  // ---- Edición de una entrada existente ----
  const abrirEdicion = (a) => setEdicion({
    id: a.id,
    cantidad: String(a.cantidad),
    notaId: a.nota_id ? String(a.nota_id) : '',
    observaciones: a.observaciones || ''
  });
  const setEdicionCampo = (campo, valor) => setEdicion((prev) => ({ ...prev, [campo]: valor }));

  const guardarEdicion = async () => {
    if (!edicion) return;
    const cant = Number(edicion.cantidad) || 0;
    if (cant > 0 && !edicion.notaId) {
      showToast('Se requiere una nota tipo `avance` cuando la cantidad es mayor a 0 (art. 125 fr. II)');
      return;
    }
    setGuardando(true); setAlertasPost([]);
    try {
      const r = await api.actualizarAvance(edicion.id, {
        cantidad: cant,
        nota_id: edicion.notaId ? Number(edicion.notaId) : null,
        observaciones: edicion.observaciones || null
      });
      showToast('Avance actualizado');
      setAlertasPost(Array.isArray(r?.alertas) ? r.alertas : []);
      setEdicion(null);
      await recargar(contratoId);
    } catch (e) {
      showToast(e.payload?.error || e.message || 'No se pudo actualizar el avance');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    setGuardando(true); setAlertasPost([]);
    try {
      await api.eliminarAvance(id);
      showToast('Avance eliminado');
      if (edicion && edicion.id === id) setEdicion(null);
      await recargar(contratoId);
    } catch (e) {
      showToast(e.payload?.error || e.message || 'No se pudo eliminar el avance');
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

      {sinSesion && (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión en modo aplicación para cargar tus contratos y registrar avance.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-md p-4 mb-6 max-w-2xl">
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
        <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para registrar el avance ejecutado por concepto.</p>
      )}
      {cargando && <p className="text-sm text-slate-500 mb-4">Cargando trabajos del contrato…</p>}

      {selected && !cargando && (
        <>
          <BannerContexto
            variant="slate"
            folio={selected.folio}
            folioLabel="Contrato"
            extra={[
              { value: selected.contratista || '—' },
              { label: 'Conceptos:', value: String(conceptos.length), resaltado: true }
            ]}
          />

          {alertasPost.length > 0 && (
            <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 mb-4 text-sm text-slate-800 rounded-r-md" data-testid="alertas-periodo">
              <div className="font-semibold text-amber-800 mb-1">⚠️ Avance por encima de lo planeado en el programa (no bloquea)</div>
              <ul className="list-disc pl-5 space-y-1">
                {alertasPost.map((a, i) => <li key={i}>{a.mensaje}</li>)}
              </ul>
            </div>
          )}

          {/* --- Resumen ejecutado por concepto (lectura) --- */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden mb-6">
            <div className="px-6 py-3 border-b border-slate-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Avance ejecutado acumulado por concepto del catálogo
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="tabla-conceptos">
                <thead className="bg-slate-50 text-slate-700">
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
                        <tr key={c.contrato_concepto_id} className="border-t border-slate-200 hover:bg-slate-50" data-fila-id={c.contrato_concepto_id}>
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

          {/* --- Captura de un nuevo avance --- */}
          {!soloLectura && (
            <RegionEditable disabled={soloLectura}>
              <div className="bg-white border border-slate-200 rounded-md p-4 mb-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Registrar avance ejecutado
                </h2>

                {notas.length === 0 && (
                  <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 mb-4 text-sm text-slate-800 rounded-r-md">
                    ⚠️ No hay notas de bitácora tipo «avance» en este contrato —{' '}
                    <Link to="/bitacora/notas" className="text-sigecop-blue underline">emite una en HU-09 primero</Link>.
                    Sin ella no podrás registrar cantidades mayores a 0 (art. 125 fr. II).
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
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
                    <label className="sg-label">Cantidad ejecutada</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className={`sg-input text-right font-mono ${validacion.excede ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                      value={form.cantidad}
                      onChange={(e) => setCampo('cantidad', e.target.value)}
                      data-testid="cap-cantidad"
                    />
                    {conceptoSel && (
                      <p className="text-xs text-slate-500 mt-1">
                        Acum. nuevo: <span className={`font-mono ${validacion.excede ? 'text-red-700 font-bold' : ''}`}>{num(validacion.acumNuevo)}</span> / {num(conceptoSel.cantidad_contratada)} contratada
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="sg-label">Fecha de ejecución</label>
                    <input
                      type="date"
                      className="sg-input"
                      value={form.fecha}
                      onChange={(e) => setCampo('fecha', e.target.value)}
                      data-testid="cap-fecha"
                    />
                    {fechaOk && (
                      <p className="text-xs text-slate-500 mt-1">
                        {periodoDerivado
                          ? <>Periodo: <strong>#{periodoDerivado.numero}</strong> ({fechaMX(periodoDerivado.inicio)} – {fechaMX(periodoDerivado.fin)})</>
                          : 'La fecha no cae en ningún periodo del programa (se guarda sin periodo).'}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="sg-label">Nota de bitácora (tipo avance){cantNueva > 0 ? ' *' : ''}</label>
                    <select
                      className={`sg-input ${validacion.requiereNota ? 'border-amber-400' : ''}`}
                      value={form.notaId}
                      onChange={(e) => setCampo('notaId', e.target.value)}
                      disabled={notas.length === 0}
                      data-testid="cap-nota"
                    >
                      <option value="">— Selecciona nota —</option>
                      {notas.map((n) => (
                        <option key={n.id} value={n.id}>#{n.numero} · {n.asunto || 'Avance'} · {fechaMX(n.fecha)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
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

                {validacion.excede && (
                  <div className="mt-4 bg-red-50 border-l-4 border-red-500 px-4 py-3 text-sm text-red-800 rounded-r-md" data-testid="aviso-exceso">
                    ⛔ <strong>La cantidad acumulada excede lo contratado</strong> en este concepto. El sistema no permite
                    registrar cantidades por encima del catálogo (art. 118 RLOPSRM); ajusta la cantidad o tramita un convenio
                    modificatorio (HU-03).
                  </div>
                )}
                {!validacion.excede && validacion.requiereNota && (
                  <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-500 px-4 py-3 text-sm text-slate-800 rounded-r-md" data-testid="aviso-requiere-nota">
                    ⚠️ Selecciona una nota de bitácora tipo «avance» para registrar una cantidad mayor a 0 (art. 125 fr. II).
                  </div>
                )}
                {!validacion.excede && validacion.alertaPeriodo && (
                  <div className="mt-4 bg-amber-50 border-l-4 border-amber-400 px-4 py-3 text-sm text-amber-800 rounded-r-md" data-testid="aviso-periodo">
                    ⚠️ El avance acumulado hasta el periodo #{validacion.alertaPeriodo.periodo_numero} ({num(validacion.alertaPeriodo.ejecutado)}) supera lo
                    PLANEADO en el programa ({num(validacion.alertaPeriodo.planeado)}). Es una <strong>alerta</strong>, no un bloqueo
                    (art. 45 ap. A fr. X RLOPSRM + art. 52 LOPSRM).
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
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Avances registrados ({avances.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="tabla-avances">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left p-3 font-semibold">Concepto</th>
                    <th className="text-right p-3 font-semibold">Cantidad</th>
                    <th className="text-left p-3 font-semibold">Fecha</th>
                    <th className="text-left p-3 font-semibold">Periodo</th>
                    <th className="text-left p-3 font-semibold">Nota</th>
                    <th className="text-left p-3 font-semibold">Observaciones</th>
                    {!soloLectura && <th className="text-center p-3 font-semibold w-40">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {avances.length === 0 ? (
                    <tr><td colSpan={soloLectura ? 6 : 7} className="p-6 text-center text-slate-400 italic">Sin avances registrados.</td></tr>
                  ) : (
                    avances.map((a) => {
                      const c = conceptoById.get(a.contrato_concepto_id);
                      const per = a.contrato_periodo_id ? periodoById.get(a.contrato_periodo_id) : null;
                      const editando = edicion && edicion.id === a.id;
                      return (
                        <tr key={a.id} className={`border-t border-slate-200 ${editando ? 'bg-sigecop-blue-light' : 'hover:bg-slate-50'}`} data-avance-id={a.id}>
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
                          <td className="p-3">{fechaMX(a.fecha)}</td>
                          <td className="p-3">{per ? `#${per.numero}` : <span className="text-slate-400">—</span>}</td>
                          <td className="p-3">
                            {editando ? (
                              <select
                                className="sg-input"
                                value={edicion.notaId}
                                onChange={(e) => setEdicionCampo('notaId', e.target.value)}
                                disabled={notas.length === 0}
                                data-testid={`edit-nota-${a.id}`}
                              >
                                <option value="">— Sin nota —</option>
                                {notas.map((n) => <option key={n.id} value={n.id}>#{n.numero} · {fechaMX(n.fecha)}</option>)}
                              </select>
                            ) : (a.nota_id ? `#${a.nota_numero ?? a.nota_id}` : <span className="text-slate-400">—</span>)}
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
                                  <button type="button" className="text-xs text-sigecop-blue hover:underline mr-3" onClick={() => abrirEdicion(a)} data-testid={`btn-editar-${a.id}`}>Editar</button>
                                  <button type="button" className="text-xs text-red-600 hover:underline" disabled={guardando} onClick={() => eliminar(a.id)} data-testid={`btn-eliminar-${a.id}`}>Eliminar</button>
                                </>
                              )}
                            </td>
                          )}
                        </tr>
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
          { numero: 1, texto: 'Cada cantidad capturada queda ligada al concepto del catálogo correspondiente y a una nota de bitácora del periodo (tipo entrega de obra o avance).' },
          { numero: 2, texto: 'El sistema acumula el avance ejecutado por concepto y muestra el porcentaje de avance contra lo contratado en vivo, periodo a periodo.' },
          { numero: 3, texto: 'El sistema bloquea el registro cuando la cantidad acumulada excede la contratada (art. 118 RLOPSRM).' }
        ]}
      />

      <p className="mt-4 text-xs text-slate-500 italic text-center">
        Fundamento: art. 118 RLOPSRM (cantidad sobre contratada sin orden no es pagable).
      </p>
    </div>
  );
}
