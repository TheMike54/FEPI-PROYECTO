import { useState, useEffect, useMemo, useCallback } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import MatrizProgramaLectura from '../components/programa/MatrizProgramaLectura.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';

// HU-03 (Fundación) — cableado al backend REAL de convenios modificatorios (art. 59 LOPSRM).
// El backend YA EXISTE (tabla convenios_modificatorios inmutable + versionado del programa de
// obra). La fuente de la verdad es el backend: aquí NO se calcula monto ni se fabrican datos;
// el monto/deltas/clasificación SFP(art.102 RLOPSRM)/ajuste(art.59 Bis) se derivan server-side.
//
// ALCANCE de esta pasada (Fase 1): convenio de PLAZO end-to-end + historial inmutable de
// convenios + lectura de las versiones del programa (reusa MatrizProgramaLectura). El convenio
// de MONTO/PROGRAMA/MIXTO exige re-capturar el catálogo + la matriz completos (el backend
// deriva el monto de Σ cant×pu, no se teclea) → editor de matriz = follow-on; aquí se ofrece
// solo el tipo 'plazo' para crear, y los demás se listan deshabilitados.
//
// Quién crea: solo 'dependencia' (permisos.js HU-03 nivel 'E'); el resto entra en solo-consulta
// (HeaderVista emite el banner). El backend es la 2.ª barrera (403 si no eres autoridad).
//
// Guardrail del 25%: el backend BLOQUEA (400) si la variación supera CONVENIO_LIMITE_VARIACION_PCT
// (default 25, NO tope legal del art. 59). La UI MUESTRA el aviso al superar 25% (revisión SFP,
// art. 102 RLOPSRM) y 50% (ajuste de costos, art. 59 Bis) y refleja el 400 del backend si ocurre.

const fmtMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneda = (n) => (n == null ? '—' : fmtMXN.format(Number(n) || 0));
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

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
// Solo 'plazo' es creable en esta pasada (los otros exigen el editor de matriz, follow-on).
const TIPOS_CREABLES = ['plazo'];
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

  // Detalle de versión expandido (snapshot del programa).
  const [verVersionId, setVerVersionId] = useState(null);
  const [detalleVersion, setDetalleVersion] = useState(null);
  const [cargandoVersion, setCargandoVersion] = useState(false);

  const selected = useMemo(() => contratos.find((c) => String(c.id) === String(contratoId)) || null, [contratos, contratoId]);
  const plazoVigente = detalle?.plazo_dias != null ? Number(detalle.plazo_dias) : null;
  const montoVigente = detalle?.monto != null ? Number(detalle.monto) : null;

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
    cargarContrato(id);
  }, [cargarContrato]);

  // Preview EN VIVO del delta de plazo (espejo del cálculo server-side, solo informativo).
  const plazoNuevoNum = Number(plazoNuevo) || 0;
  const deltaPlazoPct = (plazoVigente && plazoVigente > 0 && plazoNuevoNum > 0)
    ? round2(((plazoNuevoNum - plazoVigente) / plazoVigente) * 100)
    : null;
  const absDelta = deltaPlazoPct != null ? Math.abs(deltaPlazoPct) : null;
  const superaSfp = absDelta != null && absDelta > 25;    // art. 102 RLOPSRM (+ guardrail bloquea)
  const superaAjuste = absDelta != null && absDelta > 50; // art. 59 Bis LOPSRM

  const datosOk = tipo === 'plazo'
    && plazoNuevoNum > 0
    && plazoVigente != null
    && plazoNuevoNum !== plazoVigente
    && motivo.trim().length > 0;
  const puedeRegistrar = !soloLectura && !registrando && datosOk;

  const handleRegistrar = useCallback(async () => {
    if (soloLectura || registrando) return;
    if (tipo !== 'plazo') return; // los otros tipos exigen el editor de matriz (follow-on)
    setRegistrando(true);
    try {
      const payload = { tipo: 'plazo', motivo: motivo.trim(), plazo_nuevo_dias: plazoNuevoNum };
      if (folio.trim()) payload.folio = folio.trim();
      const res = await api.crearConvenio(Number(contratoId), payload);
      const avisos = [];
      if (res.requiere_revision_sfp) avisos.push('requiere revisión SFP (art. 102 RLOPSRM)');
      if (res.requiere_ajuste_costos) avisos.push('da derecho a ajuste de costos (art. 59 Bis)');
      // El 201 no incluye `folio`; usa el capturado (si lo hubo) o el correlativo CM-NNN.
      const ref = folio.trim() || res.folio || `CM-${String(res.numero).padStart(3, '0')}`;
      showToast(`Convenio ${ref} registrado (plazo ${res.plazo_anterior_dias}→${res.plazo_nuevo_dias} días)${avisos.length ? ' · ' + avisos.join(' · ') : ''}.`);
      setPlazoNuevo(''); setMotivo(''); setFolio('');
      await cargarContrato(contratoId); // recarga: el plazo vigente y el historial cambiaron
    } catch (e) {
      const msg = e.payload?.error || (
        e.status === 403 ? 'Solo la dependencia o el residente asignado puede registrar convenios'
          : e.status === 409 ? 'Conflicto de versión del programa; recarga e inténtalo de nuevo'
            : 'No se pudo registrar el convenio');
      showToast(msg);
    } finally {
      setRegistrando(false);
    }
  }, [soloLectura, registrando, tipo, motivo, plazoNuevoNum, folio, contratoId, showToast, cargarContrato]);

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
        <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 mb-4 text-sm text-slate-600">
          Inicia sesión para consultar o registrar convenios modificatorios.
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
        <p className="text-sm text-slate-500 mb-4">Selecciona un contrato para ver sus convenios y versiones del programa.</p>
      )}
      {cargando && <p className="text-sm text-slate-500 mb-4">Cargando convenios…</p>}

      {selected && !cargando && (
        <>
          <BannerContexto
            variant="slate"
            titulo="Contrato"
            folio={selected.folio}
            extra={[
              { value: selected.contratista || detalle?.contratista || '—' },
              { label: 'Monto vigente:', value: moneda(montoVigente), resaltado: true },
              { label: 'Plazo vigente:', value: plazoVigente != null ? `${plazoVigente} días` : '—', resaltado: true }
            ]}
          />

          {/* Formulario de creación — SOLO dependencia (nivel 'E'); el resto ve solo-consulta. */}
          {!soloLectura && (
            <div className="bg-white border border-slate-200 rounded-md p-6 mb-6">
              <h2 className="text-lg font-bold text-sigecop-blue mb-1">Nuevo convenio modificatorio</h2>
              <p className="text-xs text-slate-500 mb-4">
                Art. 59 LOPSRM. En esta versión se registra el convenio de <strong>plazo</strong>;
                los de monto/programa/mixto requieren re-capturar el catálogo y el programa (próxima entrega).
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

                  {tipo === 'plazo' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="sg-label">Plazo vigente</label>
                        <input
                          className="sg-input bg-slate-50"
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
                      ⚠️ La variación de plazo (<strong>{pct(deltaPlazoPct)}</strong>) supera el 25%: dispara
                      <strong> revisión de la Secretaría de la Función Pública</strong> (RLOPSRM art. 102).
                      El sistema tiene un guardrail configurable en 25% (decisión de configuración, NO el tope
                      legal del art. 59) que <strong>rechazará el registro</strong> mientras esté activo.
                    </div>
                  )}
                  {superaAjuste && (
                    <div
                      className="bg-amber-50 border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm text-slate-800 rounded-r-md"
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
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden mb-6">
            <div className="px-6 py-3 border-b border-slate-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Convenios del contrato ({convenios.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="tabla-convenios">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left p-3 font-semibold">N.º / folio</th>
                    <th className="text-left p-3 font-semibold">Tipo</th>
                    <th className="text-left p-3 font-semibold">Registrado</th>
                    <th className="text-left p-3 font-semibold">Cambio</th>
                    <th className="text-left p-3 font-semibold">Motivo</th>
                    <th className="text-left p-3 font-semibold">Avisos</th>
                    <th className="text-left p-3 font-semibold">Autoriza</th>
                  </tr>
                </thead>
                <tbody>
                  {convenios.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400 italic" data-testid="conv-vacio">
                        Este contrato no tiene convenios modificatorios registrados.
                      </td>
                    </tr>
                  ) : (
                    convenios.map((c) => (
                      <tr key={c.id} className="border-t border-slate-200 align-top" data-testid={`fila-convenio-${c.id}`}>
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
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-sigecop-amber-attention border border-amber-300" data-testid={`badge-sfp-${c.id}`}>
                                Revisión SFP (art. 102)
                              </span>
                            )}
                            {c.requiere_ajuste_costos && (
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-sigecop-amber-attention border border-amber-300">
                                Ajuste de costos (art. 59 Bis)
                              </span>
                            )}
                            {!c.requiere_revision_sfp && !c.requiere_ajuste_costos && (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-xs">{c.autorizado_por_nombre || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="px-6 py-2 text-[11px] text-slate-400 border-t border-slate-100">
              Un convenio registrado es inalterable (art. 59 LOPSRM / art. 99 RLOPSRM): no se edita ni se anula; corregir = convenio nuevo.
            </p>
          </div>

          {/* Versiones del programa de obra (snapshots inmutables). Lectura. */}
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden mb-6">
            <div className="px-6 py-3 border-b border-slate-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Versiones del programa de obra ({versiones.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="tabla-versiones">
                <thead className="bg-slate-50 text-slate-700">
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
                      <tr key={v.id} className="border-t border-slate-200" data-testid={`fila-version-${v.id}`}>
                        <td className="p-3 font-semibold">
                          v{v.numero}{v.convenio_id == null ? <span className="ml-1 text-[11px] font-normal text-slate-400">(original)</span> : null}
                        </td>
                        <td className="p-3 text-center">
                          {v.vigente
                            ? <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-sigecop-green-validation">Vigente</span>
                            : <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-slate-600">Superseded</span>}
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
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50" data-testid="detalle-version">
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
