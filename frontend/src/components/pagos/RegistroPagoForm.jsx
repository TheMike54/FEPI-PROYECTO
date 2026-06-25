import { useState, useEffect, useCallback } from 'react';
import RegionEditable from '../vista/RegionEditable.jsx';
import { useSesion } from '../../context/SesionContext.jsx';
import { useToast } from '../ui/Toast.jsx';
import { api } from '../../services/api.js';
import { labelEstadoEstimacion } from '../../data/estadoEstimacion.js';

// H6-B6-3 (25-jun) — REDISEÑO del registro de pago (mockup aprobado: docs/mockups/H6_rediseno_pago_25jun.html).
// El CFDI y la factura los captura el CONTRATISTA en el tránsito a pago (paso "Soportes"); aquí Finanzas SOLO
// REVISA esos datos (read-only, heredados del tránsito) y agrega lo suyo: referencia SPEI + fecha de pago. Un
// POP-UP "¿CFDI y factura coinciden?" confirma antes de pagar. El importe lo deriva el servidor del neto de la
// estimación (no se teclea). El gate server (pagos.controller registrarPago) YA exige que el contratista haya
// subido el CFDI (cobro_soportes tipo='cfdi') antes de pagar — aquí NO se duplica, solo se conecta a la UI.
// El botón "Registrar pago" se gatea a rol==='finanzas' (art. 54 LOPSRM) además del soloLectura del contenedor.

const mxn = (n) => `$ ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtFecha = (s) => { if (!s) return '—'; const [y, m, d] = String(s).slice(0, 10).split('-'); return (y && m && d) ? `${d}/${m}/${y}` : '—'; };
const soloDia = (s) => (s ? String(s).slice(0, 10) : '');
// El backend (pagos.controller registrarPago) SOLO paga estimaciones 'autorizada' por la residencia (art. 54).
const PAGABLES = new Set(['autorizada']);

export default function RegistroPagoForm({ contratoId, soloLectura = false, onRegistrado, estimacionIdInicial = '' }) {
  const { rol } = useSesion();
  const { showToast } = useToast();
  const hoy = new Date().toISOString().slice(0, 10);

  const [estimaciones, setEstimaciones] = useState([]); // estimaciones PAGABLES del contrato
  const [registrando, setRegistrando] = useState(false);
  const [ultimo, setUltimo] = useState(null);
  const [contratoCerrado, setContratoCerrado] = useState(false); // #12: contrato cerrado = solo-lectura (art. 64)
  const [confirmando, setConfirmando] = useState(false);         // pop-up "¿CFDI y factura coinciden?"

  // Finanzas SOLO captura esto:
  const [estimacionId, setEstimacionId] = useState('');
  const [fechaPago, setFechaPago] = useState(hoy);
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // HEREDADO del tránsito (read-only): lo que promovió el contratista (CFDI, factura, PDFs).
  const VACIO = { cargando: false, cfdi: '', facturaDesc: '', facturaFecha: '', archivos: [] };
  const [hered, setHered] = useState(VACIO);

  const estSel = estimaciones.find((e) => String(e.id) === String(estimacionId)) || null;
  const importeNeto = estSel ? estSel.neto : null; // el importe lo DERIVA el servidor del neto

  const cargarEstimaciones = useCallback(async (cid) => {
    if (!cid) { setEstimaciones([]); setContratoCerrado(false); return; }
    try {
      // #12: en un contrato cerrado (finiquito) el saldo se liquida por el finiquito (art. 64); no se ofrecen
      // estimaciones pagables ni se habilita el registro. El backend (registrarPago) también lo bloquea.
      const det = await api.detalleContrato(cid).catch(() => null);
      const cerrado = !!det && det.estado === 'cerrado';
      setContratoCerrado(cerrado);
      if (cerrado) { setEstimaciones([]); return; }
      const list = await api.estimacionesDeContrato(cid);
      setEstimaciones((Array.isArray(list) ? list : []).filter((e) => PAGABLES.has(e.estado)));
    } catch (e) { setEstimaciones([]); setContratoCerrado(false); }
  }, []);

  useEffect(() => { setEstimacionId(''); setUltimo(null); cargarEstimaciones(contratoId); }, [contratoId, cargarEstimaciones]);

  // Si se llega desde la cola global de finanzas con ?estimacion=, preselecciona esa estimación.
  useEffect(() => {
    if (estimacionIdInicial && estimaciones.some((e) => String(e.id) === String(estimacionIdInicial))) {
      setEstimacionId(String(estimacionIdInicial));
    }
  }, [estimacionIdInicial, estimaciones]);

  // H6 (profe "Finanzas solo revisa lo que ya viene"): al elegir la estimación, HEREDA del tránsito el folio
  // CFDI, la factura (descripción + fecha de presentación) y los PDF de soporte que subió el contratista.
  useEffect(() => {
    if (!estimacionId) { setHered(VACIO); return; }
    let vivo = true;
    setHered((h) => ({ ...h, cargando: true }));
    api.transitoEstimacion(estimacionId)
      .then((t) => {
        if (!vivo) return;
        setHered({
          cargando: false,
          cfdi: (t?.instruccion?.factura_cfdi) || (t?.soportes?.folio_cfdi) || '',
          facturaDesc: t?.soportes?.factura?.descripcion || '',
          facturaFecha: soloDia(t?.soportes?.factura?.fecha) || '',
          archivos: Array.isArray(t?.archivos) ? t.archivos : [],
        });
      })
      .catch(() => { if (vivo) setHered(VACIO); });
    return () => { vivo = false; };
  }, [estimacionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const descargar = async (id) => {
    try { const url = await api.descargarArchivoCobro(id); window.open(url, '_blank'); }
    catch (e) { showToast(e.message || 'No se pudo descargar el soporte'); }
  };

  // Para pagar: estimación + fecha pago + referencia SPEI + (CFDI y fecha de factura HEREDADOS del contratista).
  const heredadoOk = !!hered.cfdi && !!hered.facturaFecha;
  const requeridosOk = estimacionId && fechaPago && referencia.trim() && heredadoOk;
  const puedeRegistrar = rol === 'finanzas' && !soloLectura && !contratoCerrado && !!contratoId && requeridosOk && !registrando;

  const limpiar = () => { setEstimacionId(''); setReferencia(''); setObservaciones(''); setFechaPago(hoy); };

  const registrar = async () => {
    setConfirmando(false);
    if (!contratoId || !estimacionId) { showToast('Selecciona la estimación a pagar'); return; }
    setRegistrando(true);
    try {
      // El importe NO se envía (el servidor lo deriva del neto). El CFDI y la fecha de factura van HEREDADOS
      // del tránsito (los promovió el contratista); Finanzas solo agrega la referencia SPEI y la fecha de pago.
      const payload = {
        contrato_id: Number(contratoId),
        estimacion_id: Number(estimacionId),
        fecha_pago: fechaPago,
        referencia: referencia.trim(),
        factura_cfdi: hered.cfdi.trim(),
        fecha_factura: hered.facturaFecha,
        observaciones: observaciones.trim() || undefined,
      };
      const creado = await api.registrarPago(payload);
      setUltimo({ ref: creado.estimacion_ref, fecha: fmtFecha(creado.fecha_pago), importe: creado.importe });
      showToast('Pago registrado · la estimación quedó marcada como pagada');
      limpiar();
      await cargarEstimaciones(contratoId);
      if (onRegistrado) onRegistrado();
    } catch (e) {
      showToast(e.message || 'No se pudo registrar el pago');
    } finally { setRegistrando(false); }
  };

  return (
    <>
      {ultimo && (
        <div className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 mb-6 rounded-r-md" data-testid="aviso-pago-registrado">
          <div className="text-sm font-semibold text-sigecop-green-validation">✓ Pago registrado</div>
          <p className="text-sm text-slate-800 mt-1">
            <strong>{ultimo.ref}</strong> · {ultimo.fecha} · {mxn(ultimo.importe)}. La estimación quedó marcada como <strong>pagada</strong>.
          </p>
          <p className="text-xs text-slate-500 mt-1">Siguiente: el contrato continúa a su <strong>finiquito</strong> cuando todas las estimaciones autorizadas estén pagadas (art. 64 LOPSRM).</p>
        </div>
      )}

      <div className="bg-white border border-borde rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-sigecop-blue mb-1">Registro del pago — revisión y pago (Finanzas)</h2>
        <p className="text-xs text-slate-500 mb-4">
          El <strong>CFDI y la factura</strong> los promueve el <strong>contratista</strong> en el tránsito a pago; aquí los
          <strong> revisas</strong> y agregas la <strong>referencia SPEI</strong> y la <strong>fecha de pago</strong> (art. 54 LOPSRM).
        </p>
        <RegionEditable disabled={soloLectura}>
          {contratoCerrado && (
            <div className="bg-amber-50 border-l-4 border-sigecop-amber-attention px-4 py-3 mb-3 rounded-r-md" data-testid="pago-contrato-cerrado">
              <p className="text-sm text-amber-800">Este contrato ya está <strong>cerrado</strong> (finiquito elaborado): es solo-lectura. El saldo se liquida por el <strong>finiquito</strong>; no se registran pagos por separado (art. 64 LOPSRM).</p>
            </div>
          )}

          <div>
            <label className="sg-label">Estimación a pagar * <span className="text-[11px] font-normal text-slate-500">(autorizada, no pagada)</span></label>
            <select className="sg-input" value={estimacionId} onChange={(e) => setEstimacionId(e.target.value)} data-testid="pago-estimacion">
              <option value="">— Selecciona la estimación —</option>
              {estimaciones.map((e) => (
                <option key={e.id} value={e.id}>Estimación #{e.numero} · {labelEstadoEstimacion(e.estado)} · {fmtFecha(e.periodo_inicio)}–{fmtFecha(e.periodo_fin)} · neto {mxn(e.neto)}</option>
              ))}
            </select>
            {!contratoCerrado && estimaciones.length === 0 && <p className="text-[11px] text-amber-700 mt-1">Este contrato no tiene estimaciones pagables (autorizadas, no pagadas).</p>}
          </div>

          {/* H6 — REVISIÓN (solo lectura): lo que promovió el contratista en el tránsito a pago. */}
          {estimacionId && (
            <div className="mt-4 border border-emerald-200 bg-emerald-50/40 rounded-lg p-4" data-testid="pago-revision-soportes">
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3">Revisión — soportes que promovió el contratista (solo lectura)</div>
              {hered.cargando ? <p className="text-sm text-slate-500">Cargando soportes del tránsito…</p> : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="sg-label">Importe a pagar (neto)</label>
                      <div className="sg-input bg-pagina font-semibold" data-testid="pago-importe-neto">{importeNeto != null ? mxn(importeNeto) : '—'}</div>
                      <p className="text-[11px] text-slate-500 mt-1">Derivado del servidor (neto). No editable (art. 54).</p>
                    </div>
                    <div>
                      <label className="sg-label">Folio CFDI (del contratista)</label>
                      <div className="sg-input bg-pagina" data-testid="pago-cfdi-heredado">{hered.cfdi || '— (el contratista no lo ha subido)'}</div>
                    </div>
                    <div>
                      <label className="sg-label">Factura presentada</label>
                      <div className="sg-input bg-pagina">{hered.facturaDesc || '—'}{hered.facturaFecha ? ` · ${fmtFecha(hered.facturaFecha)}` : ''}</div>
                    </div>
                  </div>
                  {hered.archivos.length > 0 ? (
                    <div className="flex flex-wrap gap-3 mt-3 text-xs" data-testid="pago-soportes-pdf">
                      {hered.archivos.map((a) => (
                        <button key={a.id} type="button" className="font-semibold text-sigecop-accent hover:underline" onClick={() => descargar(a.id)} data-testid={`pago-soporte-${a.id}`}>
                          ⬇ {(a.tipo || 'PDF').toUpperCase()} · {a.nombre || 'soporte.pdf'}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-700 mt-2" data-testid="pago-sin-soportes">
                      El contratista aún no ha subido el PDF del CFDI/oficio en el tránsito a pago. No se puede pagar hasta que lo haga (art. 54 LOPSRM).
                    </p>
                  )}
                  {!heredadoOk && (
                    <p className="text-[11px] text-amber-700 mt-2" data-testid="pago-falta-cfdi">
                      Falta el folio CFDI o la factura del contratista. Finanzas no captura esos datos: los promueve el contratista en el tránsito a pago.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* CAPTURA de Finanzas (solo lo suyo). */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="sg-label">Fecha de pago *</label>
              <input type="date" className="sg-input" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} data-testid="pago-fecha" />
            </div>
            <div>
              <label className="sg-label">Referencia SPEI (clave de rastreo) *</label>
              {/* La clave de rastreo SPEI es numérica; se filtran letras al escribir. */}
              <input className="sg-input" inputMode="numeric" pattern="\d*" placeholder="Clave de rastreo SPEI (solo dígitos)" value={referencia} onChange={(e) => setReferencia(e.target.value.replace(/\D/g, ''))} data-testid="pago-referencia" />
            </div>
            <div className="md:col-span-2">
              <label className="sg-label">Observaciones</label>
              <textarea className="sg-input" rows={2} placeholder="Notas del pago efectuado (opcional)" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} data-testid="pago-observaciones" />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className="px-4 py-2 text-slate-600 hover:text-slate-900" onClick={limpiar}>Limpiar</button>
            <button type="button" className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed" disabled={!puedeRegistrar} onClick={() => setConfirmando(true)} data-testid="btn-registrar-pago">
              {registrando ? 'Registrando…' : 'Registrar pago'}
            </button>
          </div>
          {rol !== 'finanzas' && (
            <p className="text-[11px] text-slate-500 mt-2 text-right" data-testid="pago-solo-finanzas">El registro del pago lo ejecuta Finanzas (art. 54 LOPSRM).</p>
          )}
        </RegionEditable>
      </div>

      {/* H6 — POP-UP de confirmación "¿CFDI y factura coinciden?" antes de registrar el pago. */}
      {confirmando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" data-testid="pago-confirmar-modal">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-3xl mb-2">🧾</div>
            <h3 className="text-lg font-bold text-sigecop-blue mb-1">¿El CFDI y la factura coinciden?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Antes de registrar el pago, confirma que el <strong>folio CFDI</strong> y la <strong>factura</strong> que subió el contratista
              coinciden con los documentos físicos/fiscales que estás revisando.
            </p>
            <ul className="text-xs text-slate-600 bg-pagina border border-borde rounded-md p-3 mb-4 space-y-1">
              <li>· CFDI <strong>{hered.cfdi || '—'}</strong></li>
              <li>· Factura <strong>{hered.facturaDesc || '—'}{hered.facturaFecha ? ` · ${fmtFecha(hered.facturaFecha)}` : ''}</strong></li>
              <li>· Importe <strong>{importeNeto != null ? mxn(importeNeto) : '—'}</strong> · SPEI <strong>{referencia || '—'}</strong></li>
            </ul>
            <div className="flex justify-end gap-3">
              <button type="button" className="px-4 py-2 text-slate-600 hover:text-slate-900" onClick={() => setConfirmando(false)} data-testid="pago-confirmar-no">Revisar de nuevo</button>
              <button type="button" className="sg-btn-primary" onClick={registrar} data-testid="pago-confirmar-si">Sí, coinciden — registrar pago</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
