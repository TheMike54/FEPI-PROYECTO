import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import EncabezadoContrato from '../components/ui/EncabezadoContrato.jsx';
import Boton from '../components/ui/Boton.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { api } from '../services/api.js';
import RegistroPagoForm from '../components/pagos/RegistroPagoForm.jsx';
import BannerContratoActivo from '../components/BannerContratoActivo.jsx';
import PestanasCiclo from '../components/PestanasCiclo.jsx';
import LinkHU from '../components/LinkHU.jsx';

// HU-20 — Tránsito a pago. CABLEADO al backend real (GET/POST /api/instruccion-pago): suficiencia
// presupuestal (art. 24), checklist de soportes (factura/CFDI metadatos + fianza de cumplimiento
// leída de garantías), semáforo del plazo (ancla = nota de autorización en bitácora) y generación
// de la instrucción de pago. SIN DUMMY: lo ausente (subida de archivos, semáforo sin ancla) se
// deshabilita con etiqueta; nada se inventa.

const moneda = (n) => (n == null ? '—' : `$ ${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

const COLOR_SEM = {
  verde: 'bg-green-100 text-exito',
  ambar: 'bg-amber-100 text-aviso',
  rojo:  'bg-red-100 text-peligro',
};

function SuficienciaPresupuestal({ suf }) {
  if (suf.sin_presupuesto) {
    return (
      <div className="bg-amber-50 border-l-4 border-aviso rounded-r-md p-5 mb-6">
        <h2 className="text-lg font-bold text-guinda mb-1">Verificación de suficiencia presupuestal (art. 24 LOPSRM)</h2>
        <p className="text-sm text-tinta-sec">
          ⚠️ No hay techo presupuestal cargado para <strong>{suf.dependencia || 's/dependencia'}</strong> ·
          ejercicio <strong>{suf.ejercicio ?? 's/ejercicio'}</strong>. Finanzas debe cargarlo abajo para verificar.
        </p>
      </div>
    );
  }
  const excede = suf.excede;
  return (
    <div className={`border-l-4 rounded-r-md p-5 mb-6 ${excede ? 'bg-red-50 border-peligro' : 'bg-white border-exito'}`}>
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-guinda">Verificación de suficiencia presupuestal (art. 24 LOPSRM)</h2>
        {excede ? (
          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-peligro" data-testid="badge-excede">
            ⚠ Excede el techo disponible
          </span>
        ) : (
          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-exito" data-testid="badge-suficiente">
            ✓ Dentro del techo presupuestal
          </span>
        )}
      </div>
      <div className="overflow-x-auto border border-borde rounded-md bg-white">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-borde"><td className="px-4 py-2 text-tinta-sec">Techo anual (ejercicio {suf.ejercicio})</td><td className="px-4 py-2 text-right font-mono">{moneda(suf.techo)}</td></tr>
            <tr className="border-b border-borde"><td className="px-4 py-2 text-tinta-sec">(−) Comprometido (autorizadas + pagadas)</td><td className="px-4 py-2 text-right font-mono">{moneda(suf.comprometido)}</td></tr>
            <tr className="border-b border-borde bg-pagina"><td className="px-4 py-2 font-semibold">(=) Disponible antes de esta estimación</td><td className="px-4 py-2 text-right font-mono font-semibold">{moneda(suf.disponible_antes)}</td></tr>
            <tr className="border-b border-borde"><td className="px-4 py-2 text-tinta-sec">(−) Esta estimación (neto)</td><td className="px-4 py-2 text-right font-mono">{moneda(suf.neto)}</td></tr>
            <tr className={excede ? 'bg-red-100' : 'bg-pagina'}><td className={`px-4 py-2 font-bold ${excede ? 'text-peligro' : 'text-guinda'}`}>(=) Disponible tras pago</td><td className={`px-4 py-2 text-right font-mono font-bold ${excede ? 'text-peligro' : 'text-guinda'}`}>{moneda(suf.disponible_despues)}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-tinta-sec mt-2">{suf.nota}</p>
    </div>
  );
}

function SoporteRow({ label, ok, detalle, children }) {
  return (
    <tr className="border-t border-borde">
      <td className="p-3">{label}</td>
      <td className="p-3 text-center">
        {ok
          ? <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-exito">✓ {detalle || 'Cargado'}</span>
          : <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-aviso">⏳ {detalle || 'Pendiente'}</span>}
      </td>
      <td className="p-3 text-right">{children}</td>
    </tr>
  );
}

export default function TransitoPago() {
  const { token, rol } = useSesion();
  const { soloLectura, nivel } = useVistaHU('HU-20');
  const { showToast } = useToast();
  const sinSesion = !token;
  const esFinanzas = nivel === 'E' && /* rol finanzas tiene 'E' aquí; contratista también */ true;

  const [contratos, setContratos] = useState([]);
  const [contratoId, setContratoId] = useState('');
  const [estimaciones, setEstimaciones] = useState([]);
  const [estimacionId, setEstimacionId] = useState('');
  const [transito, setTransito] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Forms de captura (metadatos, sin archivos).
  const [facturaDesc, setFacturaDesc] = useState('');
  const [cfdiFolio, setCfdiFolio] = useState('');
  const [techoVal, setTechoVal] = useState('');
  const [partidaVal, setPartidaVal] = useState('');

  // FASE 4 (rediseño por bloques) — WIZARD del tránsito a pago: Suficiencia → Soportes → Instrucción
  // (patrón del Alta/Estimación). Reusa los MISMOS componentes/testids; navegación libre entre pasos
  // (el gate duro es el botón "Generar instrucción", que ya exige suficiencia + soportes, art. 24/54).
  const [pasoPago, setPasoPago] = useState(0);
  const PASOS_PAGO = [
    { key: 'suficiencia', label: 'Suficiencia' },
    { key: 'soportes', label: 'Soportes' },
    { key: 'instruccion', label: 'Instrucción' },
    { key: 'registro', label: 'Registrar pago' }, // F6: HU-21 embebida como 4º paso (botón gateado a finanzas)
  ];

  useEffect(() => {
    if (sinSesion) return;
    api.listarContratos().then((l) => setContratos(Array.isArray(l) ? l : [])).catch(() => setContratos([]));
  }, [sinSesion]);

  const seleccionarContrato = useCallback(async (id) => {
    setContratoId(id); setEstimacionId(''); setEstimaciones([]); setTransito(null); setError(null);
    if (!id) return;
    try {
      const ests = await api.estimacionesDeContrato(id);
      // CA: el tránsito opera sobre estimaciones AUTORIZADAS (art. 54).
      setEstimaciones((Array.isArray(ests) ? ests : []).filter((e) => e.estado === 'autorizada'));
    } catch (e) {
      showToast(e.payload?.error || 'No se pudieron cargar las estimaciones');
    }
  }, [showToast]);

  const [searchParams] = useSearchParams();
  const contratoQuery = searchParams.get('contrato');
  useEffect(() => {
    // B6b/A-3A: preselecciona el contrato del ?contrato=ID (consistencia entre pantallas).
    if (sinSesion || !contratoQuery || contratoId) return;
    if (contratos.some((c) => String(c.id) === String(contratoQuery))) seleccionarContrato(String(contratoQuery));
  }, [sinSesion, contratoQuery, contratoId, contratos, seleccionarContrato]);

  const cargarTransito = useCallback(async (estId) => {
    if (!estId) { setTransito(null); return; }
    setCargando(true); setError(null);
    try {
      setTransito(await api.transitoEstimacion(estId));
    } catch (e) {
      const msg = e.payload?.error || 'No se pudo cargar el tránsito a pago';
      setError(msg); showToast(msg);
    } finally { setCargando(false); }
  }, [showToast]);

  const seleccionarEstimacion = (id) => { setEstimacionId(id); setFacturaDesc(''); setCfdiFolio(''); setPasoPago(0); cargarTransito(id); };

  const registrarSoporte = async (nombre, descripcion) => {
    try {
      await api.cargarSoporteTransito(estimacionId, { nombre, descripcion });
      await cargarTransito(estimacionId);
      showToast(`${nombre} registrado`);
    } catch (e) { showToast(e.payload?.error || `No se pudo registrar ${nombre}`); }
  };

  const guardarTecho = async () => {
    const t = Number(techoVal);
    if (!Number.isFinite(t) || t < 0) { showToast('Techo inválido'); return; }
    // ITEM 3.1 (art. 24 LOPSRM): la partida específica es obligatoria; la dependencia se manda por FK.
    if (!partidaVal.trim()) { showToast('La partida presupuestal específica es obligatoria (art. 24 LOPSRM)'); return; }
    if (transito.estimacion.dependencia_id == null) { showToast('El contrato no tiene dependencia asociada por FK (dato legacy); no se puede cargar el techo'); return; }
    try {
      await api.crearPresupuesto({
        ejercicio: transito.estimacion.ejercicio,
        dependenciaId: transito.estimacion.dependencia_id,
        partida: partidaVal.trim(),
        techo: t,
      });
      setTechoVal(''); setPartidaVal(''); await cargarTransito(estimacionId);
      showToast('Techo presupuestal cargado');
    } catch (e) { showToast(e.payload?.error || 'No se pudo cargar el techo (¿rol finanzas?)'); }
  };

  const generar = async () => {
    try {
      await api.generarInstruccionPago(estimacionId);
      await cargarTransito(estimacionId);
      showToast('Instrucción de pago generada');
    } catch (e) { showToast(e.payload?.error || 'No se pudo generar la instrucción'); }
  };

  const sem = transito?.semaforo_plazo;
  const suf = transito?.suficiencia;
  const sop = transito?.soportes;
  const instr = transito?.instruccion;
  const bloqueos = useMemo(() => {
    if (!transito) return [];
    const b = [];
    if (!transito.es_autorizada) b.push('La estimación no está autorizada.');
    if (suf?.sin_presupuesto) b.push('No hay techo presupuestal cargado para verificar la suficiencia (art. 24).');
    else if (suf?.excede) b.push('El neto excede el techo presupuestal disponible (art. 24 LOPSRM).');
    if (sop && !sop.obligatorios_ok) b.push('Faltan soportes obligatorios (factura, CFDI con folio, o fianza de cumplimiento vigente).');
    return b;
  }, [transito, suf, sop]);
  const puedeGenerar = !soloLectura && transito && !instr && bloqueos.length === 0;

  // BLOQUE 2 — gating secuencial del wizard de pago (igual que Alta/Estimación): no avanzas sin que el paso
  // ACTUAL esté correcto. Atrás libre. Solo aplica al stepper (Tipo A); no hay vistas TIPO B aquí.
  const pasoValidoPago = useCallback((p) => {
    if (!transito) return false;
    if (p === 0) return !!transito.es_autorizada && !!suf && !suf.sin_presupuesto && !suf.excede; // Suficiencia (art. 24)
    if (p === 1) return !!sop && !!sop.obligatorios_ok;                                           // Soportes obligatorios
    if (p === 2) return !!instr;                                                                  // Instrucción generada (art. 54)
    return true;                                                                                 // Registrar pago (último)
  }, [transito, suf, sop, instr]);
  const irPasoPago = useCallback((target) => {
    if (target <= pasoPago) { setPasoPago(target); return; }                                      // atrás: libre
    for (let p = pasoPago; p < target; p++) { if (!pasoValidoPago(p)) { setPasoPago(p); return; } }
    setPasoPago(target);
  }, [pasoPago, pasoValidoPago]);
  const motivoSiguientePago = !transito ? '' :
    pasoPago === 0 ? (transito.es_autorizada ? 'Carga el techo presupuestal y verifica la suficiencia (art. 24) para continuar.' : 'La estimación debe estar autorizada por la residencia (art. 54).') :
    pasoPago === 1 ? 'Carga los soportes obligatorios (factura, folio CFDI y fianza de cumplimiento vigente).' :
    pasoPago === 2 ? 'Genera la instrucción de pago para continuar al registro.' : '';

  return (
    <div>
      <HeaderVista
        huId="HU-20"
        titulo="Tránsito a pago: carga de soportes y verificación de suficiencia presupuestal"
        sprint="Sprint 5"
        rolAcademico="Contratista y finanzas"
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Pagos' }, { label: 'Tránsito a pago' }]}
      />

      <PestanasCiclo ciclo="pago" activo="transito" />

      {sinSesion && (
        <div className="bg-pagina border border-borde rounded-md px-4 py-3 mb-4 text-sm text-tinta-sec">
          Inicia sesión para gestionar el tránsito a pago.
        </div>
      )}

      {!sinSesion && (
        <div className="bg-white border border-borde rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 3A · P3 — hereda el contrato activo global en vez de re-seleccionarlo (banner read-only). */}
          <BannerContratoActivo seleccionar={seleccionarContrato} contratoId={contratoId} />
          <div>
            <label className="sg-label">Estimación autorizada</label>
            <select className="sg-input" value={estimacionId} onChange={(e) => seleccionarEstimacion(e.target.value)} disabled={!contratoId} data-testid="select-estimacion">
              <option value="">— Selecciona —</option>
              {estimaciones.map((e) => <option key={e.id} value={e.id}>Estimación {e.numero} · {moneda(e.neto)}</option>)}
            </select>
            {contratoId && estimaciones.length === 0 && (
              <p className="text-xs text-tinta-sec mt-1">Este contrato no tiene estimaciones autorizadas.</p>
            )}
          </div>
        </div>
      )}

      {cargando && <p className="text-sm text-tinta-sec mb-4">Cargando tránsito…</p>}
      {error && <div className="bg-red-50 border-l-4 border-peligro px-4 py-3 mb-4 text-sm text-peligro rounded-r-md" data-testid="banner-error">{error}</div>}

      {transito && !cargando && (
        <>
          <EncabezadoContrato
            titulo="Estimación"
            folio={`${transito.estimacion.folio} · Estimación ${transito.estimacion.numero}`}
            items={[
              { value: transito.estimacion.contratista || '—' },
              { label: 'Neto:', value: moneda(transito.estimacion.neto), resaltado: true },
            ]}
          />

          {/* WIZARD del tránsito (FASE 4): Suficiencia → Soportes → Instrucción. Navegación libre; el gate
              duro es "Generar instrucción" (exige suficiencia + soportes, art. 24 / 54 LOPSRM). */}
          <div className="text-xs font-semibold text-guinda mb-1" data-testid="paso-indicador-pago">Paso {pasoPago + 1} de {PASOS_PAGO.length}</div>
          <nav className="flex flex-wrap gap-2 my-6" data-testid="wizard-pago-pasos" aria-label="Pasos del tránsito a pago">
            {PASOS_PAGO.map((p, i) => {
              const estado = i === pasoPago ? 'curr' : i < pasoPago ? 'done' : 'todo';
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => irPasoPago(i)}
                  data-testid={`wpaso-pago-${p.key}`}
                  data-estado={estado}
                  aria-current={estado === 'curr' ? 'step' : undefined}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border ${estado === 'curr' ? 'bg-guinda text-white border-guinda' : estado === 'done' ? 'bg-guinda-soft text-guinda border-guinda/30' : 'bg-white text-tinta-sec border-borde'}`}
                >
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${estado === 'curr' ? 'bg-white text-guinda' : estado === 'done' ? 'bg-guinda text-white' : 'bg-pagina text-tinta-sec'}`}>{i + 1}</span>
                  {p.label}
                </button>
              );
            })}
          </nav>

          {/* PASO 1 · Suficiencia presupuestal (+ carga de techo de finanzas). */}
          {pasoPago === 0 && (
          <div data-testid="wstep-pago-suficiencia">
          <SuficienciaPresupuestal suf={suf} />

          {/* Carga de techo (finanzas) cuando falta presupuesto. */}
          {suf.sin_presupuesto && !soloLectura && (
            <div className="bg-white border border-borde rounded-md p-5 mb-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-tinta-sec mb-2">Cargar techo presupuestal (finanzas)</h3>
              {transito.estimacion.dependencia_id == null ? (
                <p className="text-sm text-aviso" data-testid="aviso-sin-dependencia-fk">
                  ⚠️ El contrato no tiene dependencia asociada por FK (dato legacy); no se puede ubicar la partida del art. 24 LOPSRM. Re-captura el alta o contacta a la administración.
                </p>
              ) : (
                <>
                  <div className="flex items-end gap-3 flex-wrap">
                    <div>
                      <label className="sg-label">Partida específica (art. 24 LOPSRM) <span className="text-peligro">*</span></label>
                      <input type="text" maxLength={60} className="sg-input max-w-[220px]" placeholder="p. ej. 6221" value={partidaVal} onChange={(e) => setPartidaVal(e.target.value)} data-testid="input-partida" />
                    </div>
                    <div>
                      <label className="sg-label">Techo de la partida ({transito.estimacion.dependencia || 's/dependencia'} · {transito.estimacion.ejercicio ?? 's/ejercicio'})</label>
                      <input type="number" min="0" step="any" className="sg-input max-w-[240px]" value={techoVal} onChange={(e) => setTechoVal(e.target.value)} data-testid="input-techo" />
                    </div>
                    <Boton onClick={guardarTecho} disabled={!partidaVal.trim()} data-testid="btn-cargar-techo">Cargar techo</Boton>
                  </div>
                  <p className="text-[11px] text-tinta-sec mt-2">El art. 24 LOPSRM ata la suficiencia a la <strong>partida o partidas específicas</strong>: la partida es obligatoria. El techo es el insumo de la <strong>suficiencia presupuestal</strong>; su carga la realiza <strong>finanzas</strong>. Sin partida y techo cargados, la suficiencia no es verificable y la instrucción no se genera.</p>
                </>
              )}
            </div>
          )}

          </div>
          )}

          {/* PASO 2 · Soportes obligatorios. */}
          {pasoPago === 1 && (
          <div data-testid="wstep-pago-soportes">
          <div className="bg-white border border-borde rounded-md p-5 mb-6">
            <h2 className="text-lg font-bold text-guinda mb-3">Soportes obligatorios</h2>
            <div className="overflow-x-auto border border-borde rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-pagina text-tinta-sec"><tr><th className="text-left p-3 font-semibold">Documento</th><th className="text-center p-3 font-semibold">Estado</th><th className="text-right p-3 font-semibold w-80">Registrar (metadato)</th></tr></thead>
                <tbody>
                  <SoporteRow label="Factura del periodo" ok={sop.factura.cargado} detalle={sop.factura.cargado ? 'Cargada' : 'Pendiente'}>
                    {!soloLectura && !sop.factura.cargado && (
                      <div className="flex items-center gap-2 justify-end">
                        <input className="sg-input max-w-[180px]" placeholder="Folio/descr. factura" value={facturaDesc} onChange={(e) => setFacturaDesc(e.target.value)} data-testid="input-factura" />
                        <Boton variante="secundario" onClick={() => registrarSoporte('Factura', facturaDesc)} data-testid="btn-cargar-factura">Registrar</Boton>
                      </div>
                    )}
                  </SoporteRow>
                  <SoporteRow label="CFDI (folio fiscal)" ok={sop.cfdi.cargado} detalle={sop.cfdi.cargado ? `Folio ${sop.cfdi.folio}` : 'Pendiente'}>
                    {!soloLectura && !sop.cfdi.cargado && (
                      <div className="flex items-center gap-2 justify-end">
                        <input className="sg-input max-w-[180px]" placeholder="Folio fiscal CFDI" value={cfdiFolio} onChange={(e) => setCfdiFolio(e.target.value)} data-testid="input-cfdi" />
                        <Boton variante="secundario" onClick={() => registrarSoporte('CFDI', cfdiFolio)} data-testid="btn-cargar-cfdi">Registrar</Boton>
                      </div>
                    )}
                  </SoporteRow>
                  <SoporteRow
                    label="Fianza de cumplimiento"
                    ok={!sop.fianza_cumplimiento.exigible || sop.fianza_cumplimiento.vigente}
                    detalle={!sop.fianza_cumplimiento.exigible ? 'No exigible' : (sop.fianza_cumplimiento.vigente ? `Vigente ${sop.fianza_cumplimiento.vigencia ? `hasta ${String(sop.fianza_cumplimiento.vigencia).slice(0,10)}` : ''}` : 'Vencida / sin vigencia')}
                  >
                    <span className="text-xs text-tinta-sec">{sop.fianza_cumplimiento.poliza ? `Póliza ${sop.fianza_cumplimiento.poliza}` : 'Leída de garantías (HU-01)'}</span>
                  </SoporteRow>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-tinta-sec mt-2" data-testid="nota-upload-deshabilitado">
              ⛔ Carga de archivo no disponible (falta infra de almacenamiento): se registran metadatos (folio CFDI) y la fianza se lee de las garantías del contrato.
            </p>
          </div>
          </div>
          )}

          {/* PASO 3 · Instrucción de pago (semáforo del plazo + generar + registro del pago HU-21). */}
          {pasoPago === 2 && (
          <div data-testid="wstep-pago-instruccion">

          {instr && (
            <div className="bg-green-50 border-l-4 border-exito px-4 py-3 mb-6 text-sm rounded-r-md" data-testid="aviso-instruccion-generada">
              <strong>✓ Instrucción de pago generada</strong> el {String(instr.fecha_instruccion).slice(0, 10)} ·
              estado <strong>{instr.estado}</strong> · monto {moneda(instr.monto)} · CFDI {instr.factura_cfdi || '—'}.
              {' '}Notificada a Finanzas. Plazo de pago: 20 días naturales (art. 54 LOPSRM).
            </div>
          )}

          {/* Semáforo del plazo de pago. */}
          <div className="bg-white border border-borde rounded-md p-5 mb-6">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h2 className="text-lg font-bold text-guinda">Semáforo del plazo de pago (art. 54 LOPSRM)</h2>
              {sem?.disponible ? (
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${COLOR_SEM[sem.color]}`} data-testid="semaforo-pago-badge" data-color={sem.color}>
                  Día {sem.dia_actual} de {sem.plazo} — {sem.color === 'verde' ? 'En tiempo' : sem.color === 'ambar' ? 'Próximo a vencer' : 'Vencido'}
                </span>
              ) : (
                <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-tinta-sec" data-testid="semaforo-pago-deshabilitado">
                  Sin fecha de autorización
                </span>
              )}
            </div>
            <p className="text-xs text-tinta-sec">{sem?.nota}</p>
            {sem?.disponible && sem.color === 'ambar' && (
              <p className="text-xs text-aviso mt-1">⚠️ El plazo entró en amarillo: avisar a Finanzas y Dependencia.</p>
            )}
          </div>

          {/* Bloqueos / generación. */}
          {!instr && bloqueos.length > 0 && (
            <div className="bg-amber-50 border-l-4 border-aviso px-4 py-3 mb-4 text-sm rounded-r-md" data-testid="aviso-bloqueo">
              <strong>⚠ Generación de instrucción de pago bloqueada.</strong>
              <ul className="list-disc list-inside mt-1 text-xs">{bloqueos.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          )}

          {!soloLectura && !instr && (
            <div className="flex justify-end">
              <Boton disabled={!puedeGenerar} onClick={generar} data-testid="btn-generar-instruccion">💸 Generar instrucción de pago</Boton>
            </div>
          )}

          {/* Tras la instrucción, Finanzas REGISTRA el pago (HU-21) — siguiente eslabón del ciclo de cobro. */}
          {instr && (
            <div className="mt-4 pt-3 border-t border-borde">
              <p className="text-sm text-tinta-sec mb-2">Emitida la instrucción, Finanzas <strong>registra el pago</strong> (importe = neto, no se paga dos veces — HU-21).</p>
              {/* NAV-C: /pagos/registro es HU-21 (contratista=null) → un <Link> crudo rebotaría al contratista.
                  LinkHU lo gatea por acceso (chip deshabilitado con motivo si el rol no puede registrar). */}
              <LinkHU hu="HU-21" to={`/pagos/registro?contrato=${transito.estimacion.contrato_id}`} className="sg-btn-secondary inline-block" data-testid="link-registrar-pago" actor="Lo registra Finanzas.">Ir a registrar el pago (HU-21) →</LinkHU>
            </div>
          )}
          </div>
          )}

          {/* F6 — PASO 4: Registrar pago (HU-21) EMBEBIDO. Reusa el componente compartido RegistroPagoForm
              (única fuente del POST /api/pagos); el botón se gatea a rol==='finanzas'. La ruta /pagos/registro
              se conserva (el enlace de arriba y los specs de HU-21 siguen válidos). */}
          {pasoPago === 3 && (
          <div data-testid="wstep-pago-registro">
            <p className="text-sm text-tinta-sec mb-4">
              Emitida la instrucción, <strong>Finanzas registra el pago</strong> de la estimación (importe = neto,
              no se paga dos veces — art. 54 LOPSRM).{rol !== 'finanzas' && ' El registro del pago lo ejecuta Finanzas.'}
            </p>
            <RegistroPagoForm contratoId={contratoId} soloLectura={rol !== 'finanzas'} />
          </div>
          )}

          {/* Navegación del wizard del tránsito (navegación libre; el gate es "Generar instrucción"). */}
          <div className="mt-6 flex justify-between items-center max-w-2xl">
            <button type="button" onClick={() => setPasoPago(Math.max(0, pasoPago - 1))} disabled={pasoPago === 0} className="px-4 py-2 text-tinta-sec hover:text-tinta disabled:opacity-40" data-testid="btn-watras-pago">← Atrás</button>
            {pasoPago < PASOS_PAGO.length - 1 && (
              <div className="text-right">
                <button type="button" onClick={() => irPasoPago(pasoPago + 1)} disabled={!pasoValidoPago(pasoPago)} className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed" data-testid="btn-wsiguiente-pago">Siguiente →</button>
                {/* A5/BLOQUE 2: candado con motivo. */}
                {!pasoValidoPago(pasoPago) && motivoSiguientePago && (
                  <p className="text-xs text-amber-700 mt-1" data-testid="wsiguiente-pago-motivo">{motivoSiguientePago}</p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <SeccionCriterios
        huId="HU-20"
        criterios={[
          { numero: 1, texto: 'El sistema verifica suficiencia presupuestal contra el techo anual y bloquea la generación de la instrucción de pago si el monto excede lo disponible (art. 24 LOPSRM).' },
          { numero: 2, texto: 'Un semáforo muestra el avance del plazo de 20 días naturales para pago (art. 54 LOPSRM), basado en la fecha de autorización (derivada de la nota de bitácora), y avisa al entrar en amarillo.' },
          { numero: 3, texto: 'La instrucción de pago solo puede generarse cuando todos los soportes obligatorios (factura, CFDI, estado de fianza de cumplimiento cuando el contrato lo exija) están cargados.' },
        ]}
      />
    </div>
  );
}
