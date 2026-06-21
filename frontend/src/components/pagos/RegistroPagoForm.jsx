import { useState, useEffect, useCallback } from 'react';
import RegionEditable from '../vista/RegionEditable.jsx';
import { useSesion } from '../../context/SesionContext.jsx';
import { useToast } from '../ui/Toast.jsx';
import { api } from '../../services/api.js';
import { labelEstadoEstimacion } from '../../data/estadoEstimacion.js';

// F6 — Formulario de REGISTRO DE PAGO (HU-21) REUTILIZABLE. Lo usan: la pantalla /pagos/registro (RegistroPago)
// y el 4º paso del wizard de tránsito a pago (TransitoPago). Es la ÚNICA fuente del POST /api/pagos (vía
// api.registrarPago) — no se duplica la lógica. El botón "Registrar pago" se gatea a rol==='finanzas' (art. 54
// LOPSRM: el pago lo ejecuta Finanzas) ADEMÁS del soloLectura del contenedor. El importe lo DERIVA el servidor
// del neto de la estimación (no se teclea); no se paga dos veces (candado server-side en pagos.controller).

const mxn = (n) => `$ ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtFecha = (s) => { if (!s) return '—'; const [y, m, d] = String(s).slice(0, 10).split('-'); return (y && m && d) ? `${d}/${m}/${y}` : '—'; };
// BLOQUE C (HU-21) — el backend (pagos.controller registrarPago) SOLO paga estimaciones 'autorizada' por la
// residencia (art. 54 LOPSRM); ofrecer 'integrada'/'enviada' producía un 409 al registrar. Sincronizado: el
// selector solo lista lo que el backend acepta. (No se toca la lógica server-side, que es la fuente de verdad.)
const PAGABLES = new Set(['autorizada']);

export default function RegistroPagoForm({ contratoId, soloLectura = false, onRegistrado }) {
  const { rol } = useSesion();
  const { showToast } = useToast();
  const hoy = new Date().toISOString().slice(0, 10);

  const [estimaciones, setEstimaciones] = useState([]); // estimaciones PAGABLES del contrato
  const [registrando, setRegistrando] = useState(false);
  const [ultimo, setUltimo] = useState(null);

  // Formulario
  const [estimacionId, setEstimacionId] = useState('');
  const [fechaPago, setFechaPago] = useState(hoy);
  const [referencia, setReferencia] = useState('');
  const [facturaCfdi, setFacturaCfdi] = useState('');
  const [fechaFactura, setFechaFactura] = useState('');
  const [fechaAutorizacion, setFechaAutorizacion] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const estSel = estimaciones.find((e) => String(e.id) === String(estimacionId)) || null;
  const importeNeto = estSel ? estSel.neto : null; // el importe lo DERIVA el servidor del neto

  const cargarEstimaciones = useCallback(async (cid) => {
    if (!cid) { setEstimaciones([]); return; }
    try {
      const list = await api.estimacionesDeContrato(cid);
      setEstimaciones((Array.isArray(list) ? list : []).filter((e) => PAGABLES.has(e.estado)));
    } catch (e) { setEstimaciones([]); }
  }, []);

  useEffect(() => { setEstimacionId(''); setUltimo(null); cargarEstimaciones(contratoId); }, [contratoId, cargarEstimaciones]);

  const requeridosOk = estimacionId && fechaPago && referencia.trim() && facturaCfdi.trim() && fechaFactura;
  // El registro lo EJECUTA Finanzas (art. 54); el contenedor además puede imponer soloLectura.
  const puedeRegistrar = rol === 'finanzas' && !soloLectura && !!contratoId && requeridosOk && !registrando;

  const limpiar = () => {
    setEstimacionId(''); setReferencia(''); setFacturaCfdi('');
    setFechaFactura(''); setFechaAutorizacion(''); setObservaciones(''); setFechaPago(hoy);
  };

  const registrar = async () => {
    if (!contratoId) { showToast('Selecciona un contrato'); return; }
    if (!estimacionId) { showToast('Selecciona la estimación a pagar'); return; }
    setRegistrando(true);
    try {
      // El importe NO se envía: el servidor lo deriva del neto de la estimación (no arbitrario).
      const payload = {
        contrato_id: Number(contratoId),
        estimacion_id: Number(estimacionId),
        fecha_pago: fechaPago,
        referencia: referencia.trim(),
        factura_cfdi: facturaCfdi.trim(),
        fecha_factura: fechaFactura,
        fecha_autorizacion: fechaAutorizacion || undefined,
        observaciones: observaciones.trim() || undefined
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
        <h2 className="text-lg font-bold text-sigecop-blue mb-4">Datos del pago</h2>
        <RegionEditable disabled={soloLectura}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="sg-label">Estimación a pagar * <span className="text-[11px] font-normal text-slate-500">(autorizada, no pagada)</span></label>
              <select className="sg-input" value={estimacionId} onChange={(e) => setEstimacionId(e.target.value)} data-testid="pago-estimacion">
                <option value="">— Selecciona la estimación —</option>
                {estimaciones.map((e) => (
                  <option key={e.id} value={e.id}>Estimación #{e.numero} · {labelEstadoEstimacion(e.estado)} · {fmtFecha(e.periodo_inicio)}–{fmtFecha(e.periodo_fin)} · neto {mxn(e.neto)}</option>
                ))}
              </select>
              {estimaciones.length === 0 && <p className="text-[11px] text-amber-700 mt-1">Este contrato no tiene estimaciones pagables (autorizadas, no pagadas).</p>}
            </div>

            <div>
              <label className="sg-label">Importe a pagar (neto de la estimación)</label>
              <div className="sg-input bg-pagina font-semibold" data-testid="pago-importe-neto">{importeNeto != null ? mxn(importeNeto) : '—'}</div>
              <p className="text-[11px] text-slate-500 mt-1">Derivado del servidor (neto de la estimación). No editable (art. 54 LOPSRM / cuadre).</p>
            </div>
            <div>
              <label className="sg-label">Fecha de pago *</label>
              <input type="date" className="sg-input" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} data-testid="pago-fecha" />
            </div>

            <div>
              <label className="sg-label">Referencia bancaria (SPEI) *</label>
              <input className="sg-input" placeholder="Clave de rastreo / folio de transferencia" value={referencia} onChange={(e) => setReferencia(e.target.value)} data-testid="pago-referencia" />
            </div>
            <div>
              <label className="sg-label">Folio fiscal (CFDI) *</label>
              <input className="sg-input" placeholder="UUID del CFDI" value={facturaCfdi} onChange={(e) => setFacturaCfdi(e.target.value)} data-testid="pago-cfdi" />
            </div>

            <div>
              <label className="sg-label">Fecha de la factura *</label>
              <input type="date" className="sg-input" value={fechaFactura} onChange={(e) => setFechaFactura(e.target.value)} data-testid="pago-fecha-factura" />
            </div>
            <div>
              <label className="sg-label">Fecha de autorización de la estimación</label>
              <input type="date" className="sg-input" value={fechaAutorizacion} onChange={(e) => setFechaAutorizacion(e.target.value)} data-testid="pago-fecha-autorizacion" />
              <p className="text-[11px] text-slate-500 mt-1">Opcional · provisional — pasará a HU-20 (instrucción de pago).</p>
            </div>

            <div className="md:col-span-2">
              <label className="sg-label">Observaciones</label>
              <textarea className="sg-input" rows={2} placeholder="Notas del pago efectuado (opcional)" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} data-testid="pago-observaciones" />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className="px-4 py-2 text-slate-600 hover:text-slate-900" onClick={limpiar}>Limpiar</button>
            <button type="button" className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed" disabled={!puedeRegistrar} onClick={registrar} data-testid="btn-registrar-pago">
              {registrando ? 'Registrando…' : 'Registrar pago'}
            </button>
          </div>
          {rol !== 'finanzas' && (
            <p className="text-[11px] text-slate-500 mt-2 text-right" data-testid="pago-solo-finanzas">El registro del pago lo ejecuta Finanzas (art. 54 LOPSRM).</p>
          )}
        </RegionEditable>
      </div>
    </>
  );
}
