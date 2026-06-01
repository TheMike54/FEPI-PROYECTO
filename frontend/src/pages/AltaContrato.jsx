import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Tabs from '../components/ui/Tab.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { api } from '../services/api.js';
import { conceptosDummy, programaObraDummy, polizasGarantiaDummy } from '../data/dummy.js';

const formatoMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2
});

const UNIDADES = ['m', 'm²', 'm³', 'ml', 'cm', 'kg', 'ton', 'pza', 'lote', 'jornal', '%'];

// --- Reglas de dominio HU-01 ---
const IVA_RATE = 0.16;            // IVA derivado (solo se muestra, NO se guarda)
const TOLERANCIA_CATALOGO = 1;    // ±$1 entre Σ(catálogo) y el monto (subtotal sin IVA)
// El día de inicio cuenta como día 1; por eso término = inicio + (plazo − OFFSET_TERMINO_DIAS).
// Convención LOPSRM 31-V / RLOPSRM 100. Cambiar aquí si la convención cambia.
const OFFSET_TERMINO_DIAS = 1;
function derivarTermino(inicioISO, plazoDias) {
  if (!inicioISO || !Number.isFinite(plazoDias) || plazoDias <= 0) return '';
  const [y, m, d] = String(inicioISO).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + (plazoDias - OFFSET_TERMINO_DIAS));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

const ERR0 = { campos: {}, conceptoIdx: null, actividadIdx: null, garantiaIdx: null, catalogoMonto: false };

// Valores iniciales (también usados por "Cancelar"). Consistentes con las reglas:
// monto = Σ del catálogo dummy; plazo cubre el programa.
const DATOS_INICIALES = {
  folio: 'C-2026-0042',
  tipo: 'Obra pública sobre la base de precios unitarios',
  objeto: 'Construcción de edificio administrativo en av. principal',
  contratista: 'Constructora XYZ S.A. de C.V.',
  dependencia: 'Secretaría de Obras Públicas',
  monto: 1906850,
  plazoDias: 181,
  fechaInicio: '2026-06-01'
};
const JURIDICOS_INICIALES = {
  firmanteDependencia: 'Lic. María Pérez García',
  cargoFirmante: 'Directora de Obras',
  representanteLegal: 'Lic. Juan Ramírez Soto',
  cedulaProfesional: '8475612',
  poderNotarial: 'Escritura Núm. 12,345',
  notaria: 'Notaría Pública Núm. 47 — Acapulco, Gro.'
};

const inputCls = (err) => `sg-input${err ? ' border-red-500 ring-1 ring-red-400' : ''}`;

function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="sg-label">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function TabDatosGenerales({ datos, set, err }) {
  const e = err || {};
  const montoNum = Number(datos.monto) || 0;
  const terminoDerivado = derivarTermino(datos.fechaInicio, Number(datos.plazoDias));
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Datos generales del contrato</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Folio del contrato" required>
          <input className={inputCls(e.folio)} maxLength={50} value={datos.folio} onChange={set('folio')} />
        </Field>
        <Field label="Tipo de contrato" required>
          <select className={inputCls(e.tipo)} value={datos.tipo} onChange={set('tipo')}>
            <option>Obra pública sobre la base de precios unitarios</option>
            <option>Obra pública a precio alzado</option>
            <option>Servicios relacionados con obra pública</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Objeto del contrato" required>
            <input className={inputCls(e.objeto)} value={datos.objeto} onChange={set('objeto')} />
          </Field>
        </div>
        <Field label="Contratista" required>
          <input className={inputCls(e.contratista)} maxLength={200} value={datos.contratista} onChange={set('contratista')} />
        </Field>
        <Field label="Dependencia" required>
          <input className={inputCls(e.dependencia)} maxLength={200} value={datos.dependencia} onChange={set('dependencia')} />
        </Field>
        <Field label="Monto del contrato (subtotal sin IVA)" required hint="Debe coincidir con la suma del catálogo de conceptos.">
          <input type="number" min="0" step="0.01" className={inputCls(e.monto)} value={datos.monto} onChange={set('monto')} />
        </Field>
        <Field label="Plazo (días naturales)" required>
          <input type="number" min="1" step="1" className={inputCls(e.plazoDias)} value={datos.plazoDias} onChange={set('plazoDias')} />
        </Field>
        <Field label="Fecha de inicio" required>
          <input type="date" className={inputCls(e.fechaInicio)} value={datos.fechaInicio} onChange={set('fechaInicio')} />
        </Field>
        <Field label="Fecha de término (calculada)" hint="Se deriva del inicio + plazo (LOPSRM 31-V). No editable.">
          <input className="sg-input bg-slate-100 text-slate-700" value={terminoDerivado || '—'} readOnly data-testid="termino-derivado" />
        </Field>
      </div>

      <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 px-4 py-3 text-sm text-blue-900 grid grid-cols-1 md:grid-cols-3 gap-2">
        <div><span className="text-xs text-blue-700">Subtotal (sin IVA)</span><div className="font-semibold">{formatoMXN.format(montoNum)}</div></div>
        <div><span className="text-xs text-blue-700">IVA (16%) — derivado</span><div className="font-semibold">{formatoMXN.format(montoNum * IVA_RATE)}</div></div>
        <div><span className="text-xs text-blue-700">Total con IVA — derivado</span><div className="font-semibold" data-testid="total-con-iva">{formatoMXN.format(montoNum * (1 + IVA_RATE))}</div></div>
      </div>

      <div className="mt-3 bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm text-slate-800">
        <strong>Campos marcados con *</strong> son obligatorios. El IVA y el total son <strong>derivados</strong> (no se guardan).
      </div>
    </div>
  );
}

function TabCatalogo({ rows, onCell, onPatch, onAdd, onRemove, soloLectura, errIdx, monto }) {
  const total = rows.reduce((s, c) => s + (Number(c.cantidad) || 0) * (Number(c.pu) || 0), 0);
  const montoNum = Number(monto) || 0;
  const hayConceptos = rows.length > 0;
  const dif = total - montoNum;
  const cuadra = Math.abs(dif) <= TOLERANCIA_CATALOGO;
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Catálogo de conceptos</h3>
      <p className="text-sm text-slate-600 mb-3">
        Conceptos del contrato sobre la base de precios unitarios. Si capturas conceptos, su suma debe coincidir con el monto (subtotal sin IVA).
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2">Concepto</th>
              <th className="text-left px-3 py-2 w-32">Unidad</th>
              <th className="text-right px-3 py-2 w-32">Cantidad</th>
              <th className="text-right px-3 py-2 w-36">P.U.</th>
              <th className="text-right px-3 py-2 w-36">Importe</th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => {
              const importe = (Number(c.cantidad) || 0) * (Number(c.pu) || 0);
              const esOtro = c.unidadOtro || (c.unidad !== '' && !UNIDADES.includes(c.unidad));
              const unidadSel = esOtro ? 'Otro' : c.unidad;
              return (
                <tr key={c.rid} className={`border-t border-slate-200 ${errIdx === i ? 'bg-red-50' : ''}`}>
                  <td className="px-2 py-1 align-top"><input className="sg-input" value={c.concepto} onChange={onCell(i, 'concepto')} disabled={soloLectura} /></td>
                  <td className="px-2 py-1 align-top">
                    <select className="sg-input" value={unidadSel}
                      onChange={(e) => { const v = e.target.value; if (v === 'Otro') onPatch(i, { unidadOtro: true, unidad: '' }); else onPatch(i, { unidadOtro: false, unidad: v }); }}
                      disabled={soloLectura}>
                      <option value="">—</option>
                      {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                      <option value="Otro">Otro…</option>
                    </select>
                    {esOtro && (
                      <input className="sg-input mt-1" placeholder="Especifica la unidad" maxLength={20} value={c.unidad} onChange={onCell(i, 'unidad')} disabled={soloLectura} />
                    )}
                  </td>
                  <td className="px-2 py-1 align-top"><input type="number" min="0" step="0.001" className="sg-input text-right" value={c.cantidad} onChange={onCell(i, 'cantidad')} disabled={soloLectura} /></td>
                  <td className="px-2 py-1 align-top"><input type="number" min="0" step="0.01" className="sg-input text-right" value={c.pu} onChange={onCell(i, 'pu')} disabled={soloLectura} /></td>
                  <td className="px-3 py-2 text-right font-semibold whitespace-nowrap align-top">{formatoMXN.format(importe)}</td>
                  <td className="px-2 py-1 text-center align-top">
                    <button type="button" onClick={() => onRemove(i)} disabled={soloLectura} className="text-red-500 hover:text-red-700 disabled:opacity-30" title="Quitar concepto">✕</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-400">Sin conceptos. Agrega uno o deja el bloque vacío.</td></tr>
            )}
          </tbody>
          {hayConceptos && (
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td colSpan={4} className="px-3 py-2 text-right font-semibold text-slate-700">Total del catálogo (Σ cantidad × P.U.)</td>
                <td className="px-3 py-2 text-right font-bold text-sigecop-blue whitespace-nowrap" data-testid="catalogo-total">{formatoMXN.format(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {hayConceptos && (
        <div className={`mt-3 px-3 py-2 rounded border text-sm font-medium ${cuadra ? 'text-green-700 bg-green-50 border-green-300' : 'text-red-700 bg-red-50 border-red-300'}`} data-testid="catalogo-indicador">
          {cuadra
            ? `✓ El catálogo cuadra con el monto del contrato (${formatoMXN.format(total)}).`
            : `El catálogo suma ${formatoMXN.format(total)} y el monto (subtotal) es ${formatoMXN.format(montoNum)} — diferencia ${formatoMXN.format(Math.abs(dif))}. Deben coincidir (±$${TOLERANCIA_CATALOGO}).`}
        </div>
      )}
      <button type="button" onClick={onAdd} disabled={soloLectura} className="mt-3 text-sm text-sigecop-accent hover:underline disabled:opacity-40">
        + Agregar concepto
      </button>
    </div>
  );
}

function TabPrograma({ rows, onCell, onAdd, onRemove, soloLectura, errIdx }) {
  const total = Math.round(rows.reduce((s, p) => s + (Number(p.peso) || 0), 0) * 100) / 100;
  let avisoCls = '';
  let avisoMsg = '';
  if (rows.length > 0) {
    if (total > 100) { avisoCls = 'text-red-700 bg-red-50 border-red-300'; avisoMsg = `Suma de %peso: ${total}% — excede 100%. No se puede guardar; ajusta los pesos.`; }
    else if (total === 100) { avisoCls = 'text-green-700 bg-green-50 border-green-300'; avisoMsg = `Suma de %peso: ${total}% ✓`; }
    else { avisoCls = 'text-amber-800 bg-amber-50 border-amber-300'; avisoMsg = `Suma de %peso: ${total}% — parcial (faltan ${Math.round((100 - total) * 100) / 100}% para llegar a 100%).`; }
  }
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Programa de obra</h3>
      <p className="text-sm text-slate-600 mb-3">
        Actividades calendarizadas. Cada actividad debe caer dentro del plazo del contrato. Bloque opcional.
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2">Actividad</th>
              <th className="text-left px-3 py-2 w-44">Inicio</th>
              <th className="text-left px-3 py-2 w-44">Término</th>
              <th className="text-right px-3 py-2 w-28">% peso</th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.rid} className={`border-t border-slate-200 ${errIdx === i ? 'bg-red-50' : ''}`}>
                <td className="px-2 py-1"><input className="sg-input" value={p.actividad} onChange={onCell(i, 'actividad')} disabled={soloLectura} /></td>
                <td className="px-2 py-1"><input type="date" className="sg-input" value={p.inicio} onChange={onCell(i, 'inicio')} disabled={soloLectura} /></td>
                <td className="px-2 py-1"><input type="date" className="sg-input" value={p.termino} onChange={onCell(i, 'termino')} disabled={soloLectura} /></td>
                <td className="px-2 py-1"><input type="number" min="0" max="100" step="0.01" className="sg-input text-right" value={p.peso} onChange={onCell(i, 'peso')} disabled={soloLectura} /></td>
                <td className="px-2 py-1 text-center">
                  <button type="button" onClick={() => onRemove(i)} disabled={soloLectura} className="text-red-500 hover:text-red-700 disabled:opacity-30" title="Quitar actividad">✕</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-400">Sin actividades. Agrega una o deja el bloque vacío.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {avisoMsg && <div className={`mt-3 px-3 py-2 rounded border text-sm font-medium ${avisoCls}`}>{avisoMsg}</div>}
      <button type="button" onClick={onAdd} disabled={soloLectura} className="mt-3 text-sm text-sigecop-accent hover:underline disabled:opacity-40">
        + Agregar actividad
      </button>
    </div>
  );
}

function TabJuridicos({ datos, set }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Datos jurídicos</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Firmante autorizado de la dependencia"><input className="sg-input" value={datos.firmanteDependencia} onChange={set('firmanteDependencia')} /></Field>
        <Field label="Cargo del firmante"><input className="sg-input" value={datos.cargoFirmante} onChange={set('cargoFirmante')} /></Field>
        <Field label="Representante legal del contratista"><input className="sg-input" value={datos.representanteLegal} onChange={set('representanteLegal')} /></Field>
        <Field label="Cédula profesional del responsable técnico" hint="Ingresar cédula vigente del DRO"><input className="sg-input" value={datos.cedulaProfesional} onChange={set('cedulaProfesional')} /></Field>
        <Field label="No. de poder notarial"><input className="sg-input" value={datos.poderNotarial} onChange={set('poderNotarial')} /></Field>
        <Field label="Notaría"><input className="sg-input" value={datos.notaria} onChange={set('notaria')} /></Field>
      </div>
      <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 px-4 py-3 text-sm text-blue-900">
        Bloque opcional. Se guarda junto con el contrato como un solo registro (campo <code>datos_juridicos</code>).
      </div>
    </div>
  );
}

function TabGarantias({ rows, onCell, onAdd, onRemove, anticipoPct, setAnticipoPct, soloLectura, errIdx, errAnticipo }) {
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const ap = Number(anticipoPct) || 0;
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Garantías, penalizaciones y amortización</h3>

      <div className="mb-4 max-w-md">
        <Field label="% de anticipo otorgado" hint="Base de la amortización (art. 50 LOPSRM). 0–100%.">
          <input type="number" min="0" max="100" step="0.01" className={inputCls(errAnticipo)} value={anticipoPct} onChange={(e) => setAnticipoPct(e.target.value)} disabled={soloLectura} />
        </Field>
        {ap > 30 && <p className="text-xs text-amber-700 mt-2">⚠ Anticipo {ap}%: requiere <strong>autorización escrita del titular</strong> (art. 50 fr. IV LOPSRM).</p>}
        {ap > 50 && <p className="text-xs text-amber-700 mt-1">⚠ Anticipo {ap}%: además, <strong>informar a la Secretaría</strong> (art. 139 RLOPSRM).</p>}
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-md mb-4">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2 w-40">Tipo de póliza</th>
              <th className="text-left px-3 py-2">Afianzadora</th>
              <th className="text-left px-3 py-2 w-40">No. de póliza</th>
              <th className="text-right px-3 py-2 w-40">Monto</th>
              <th className="text-left px-3 py-2 w-48">Vigencia</th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const vencida = p.vigencia && p.vigencia < hoyStr;
              return (
                <tr key={p.rid} className={`border-t border-slate-200 ${errIdx === i ? 'bg-red-50' : ''}`}>
                  <td className="px-2 py-1 align-top"><input className="sg-input" value={p.tipo} onChange={onCell(i, 'tipo')} disabled={soloLectura} /></td>
                  <td className="px-2 py-1 align-top"><input className="sg-input" value={p.afianzadora} onChange={onCell(i, 'afianzadora')} disabled={soloLectura} /></td>
                  <td className="px-2 py-1 align-top"><input className="sg-input font-mono text-xs" value={p.poliza} onChange={onCell(i, 'poliza')} disabled={soloLectura} /></td>
                  <td className="px-2 py-1 align-top"><input type="number" min="0" step="0.01" className="sg-input text-right" value={p.monto} onChange={onCell(i, 'monto')} disabled={soloLectura} /></td>
                  <td className="px-2 py-1 align-top">
                    <input type="date" className="sg-input" value={p.vigencia} onChange={onCell(i, 'vigencia')} disabled={soloLectura} />
                    {vencida && <span className="block text-xs text-amber-600 mt-1">⚠ vigencia vencida</span>}
                  </td>
                  <td className="px-2 py-1 text-center align-top">
                    <button type="button" onClick={() => onRemove(i)} disabled={soloLectura} className="text-red-500 hover:text-red-700 disabled:opacity-30" title="Quitar póliza">✕</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-400">Sin pólizas. Agrega una o deja el bloque vacío.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={onAdd} disabled={soloLectura} className="mb-4 text-sm text-sigecop-accent hover:underline disabled:opacity-40">
        + Agregar póliza
      </button>

      <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm text-slate-800 mb-3">
        <strong>Penalizaciones — Art. 46 Bis LOPSRM:</strong> se aplicarán deductivas por atraso conforme al programa de obra. El 5 al millar (art. 191 LFD) se carga automáticamente sobre cada estimación.
      </div>
      <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-3 text-sm text-blue-900">
        <strong>Plan de amortización del anticipo — Art. 50 LOPSRM:</strong> el anticipo otorgado deberá amortizarse proporcionalmente al avance en cada estimación, conforme a la fórmula que prevé el art. 50 de la LOPSRM.
      </div>
    </div>
  );
}

function TabPdfFirmado({ contratoId, soloLectura }) {
  const { showToast } = useToast();
  const [meta, setMeta] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef(null);

  const cargarMeta = useCallback(async () => {
    if (!contratoId) { setMeta(null); return; }
    setCargando(true);
    try { setMeta(await api.documentoMeta(contratoId)); }
    catch (err) { if (err.status === 404) setMeta(null); else showToast('No se pudo consultar el PDF ligado'); }
    finally { setCargando(false); }
  }, [contratoId, showToast]);

  useEffect(() => { cargarMeta(); }, [cargarMeta]);

  const onArchivo = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { showToast('Solo se permiten archivos PDF'); if (inputRef.current) inputRef.current.value = ''; return; }
    if (file.size > 10 * 1024 * 1024) { showToast('El PDF excede el límite de 10 MB'); if (inputRef.current) inputRef.current.value = ''; return; }
    setSubiendo(true);
    try { await api.subirDocumento(contratoId, file); showToast('PDF firmado adjuntado: ' + file.name); await cargarMeta(); }
    catch (err) { showToast(err.message || 'No se pudo subir el PDF'); }
    finally { setSubiendo(false); if (inputRef.current) inputRef.current.value = ''; }
  };

  const obtener = async (descargar) => {
    try {
      const blob = await api.descargarDocumento(contratoId);
      const url = URL.createObjectURL(blob);
      if (descargar) { const a = document.createElement('a'); a.href = url; a.download = (meta && meta.nombre) || 'documento.pdf'; document.body.appendChild(a); a.click(); a.remove(); }
      else { window.open(url, '_blank', 'noopener'); }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { showToast(err.message || 'No se pudo obtener el PDF'); }
  };

  const formatoKB = (n) => `${(Number(n) / 1024).toFixed(0)} KB`;

  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">PDF firmado del contrato</h3>
      {!contratoId ? (
        <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm text-slate-800">
          Guarda primero el contrato (botón <strong>Guardar contrato</strong>); el PDF firmado se liga después, una vez que el contrato existe.
        </div>
      ) : (
        <>
          {meta ? (
            <div className="border border-slate-200 rounded-md p-4 mb-4 flex items-center justify-between gap-4 bg-slate-50">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate" title={meta.nombre}>📄 {meta.nombre}</p>
                <p className="text-xs text-slate-500">{formatoKB(meta.tamano)} · {meta.mime}</p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button type="button" onClick={() => obtener(false)} className="text-sm text-sigecop-accent hover:underline">Ver</button>
                <button type="button" onClick={() => obtener(true)} className="text-sm text-sigecop-accent hover:underline">Descargar</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 mb-4">{cargando ? 'Consultando…' : 'Aún no hay PDF firmado adjunto a este contrato.'}</p>
          )}
          <div className="border-2 border-dashed border-slate-300 rounded-md p-8 text-center bg-white">
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={onArchivo} disabled={soloLectura || subiendo} className="block mx-auto text-sm" />
            <p className="text-xs text-slate-400 mt-3">PDF firmado por las tres partes (máx. 10 MB). Se guarda en la base de datos.</p>
            {subiendo && <p className="text-sm text-sigecop-accent mt-2">Subiendo…</p>}
            {meta && <p className="text-xs text-slate-400 mt-1">Subir otro archivo reemplaza el actual.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function TabRegistrados({ contratos, loading, errorMsg, sinSesion, onRecargar, soloLectura }) {
  const { showToast } = useToast();
  const inputRef = useRef(null);
  const [targetId, setTargetId] = useState(null);
  const [subiendoId, setSubiendoId] = useState(null);

  const pedirArchivo = (id) => { setTargetId(id); if (inputRef.current) inputRef.current.click(); };

  const onArchivo = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    const id = targetId;
    if (!file || !id) return;
    if (file.type !== 'application/pdf') { showToast('Solo se permiten archivos PDF'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast('El PDF excede el límite de 10 MB'); return; }
    setSubiendoId(id);
    try { await api.subirDocumento(id, file); showToast('PDF adjuntado al contrato.'); onRecargar(); }
    catch (err) { showToast(err.message || 'No se pudo subir el PDF'); }
    finally { setSubiendoId(null); setTargetId(null); }
  };

  const verDescargar = async (id, descargar) => {
    try {
      let nombre = 'documento.pdf';
      if (descargar) { try { const m = await api.documentoMeta(id); if (m && m.nombre) nombre = m.nombre; } catch (_) { /* default */ } }
      const blob = await api.descargarDocumento(id);
      const url = URL.createObjectURL(blob);
      if (descargar) { const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); }
      else { window.open(url, '_blank', 'noopener'); }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { showToast(err.message || 'No se pudo obtener el PDF'); }
  };

  if (sinSesion) {
    return (
      <div>
        <h3 className="text-lg font-bold text-sigecop-blue mb-4">Contratos registrados</h3>
        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-4 py-6 text-center">
          Inicia sesión en modo aplicación para ver los contratos guardados.
        </p>
      </div>
    );
  }
  return (
    <div>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onArchivo} />
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-sigecop-blue">Contratos registrados</h3>
        <button type="button" onClick={onRecargar} className="text-sm text-sigecop-accent hover:underline" disabled={loading}>↻ Recargar</button>
      </div>
      {loading && <p className="text-sm text-slate-500">Cargando…</p>}
      {!loading && errorMsg && <p className="text-sm text-slate-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">{errorMsg}</p>}
      {!loading && !errorMsg && contratos.length === 0 && <p className="text-sm text-slate-500">No hay contratos registrados todavía.</p>}
      {!loading && !errorMsg && contratos.length > 0 && (
        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-sigecop-blue-light text-sigecop-blue">
              <tr>
                <th className="text-left px-3 py-2">Folio</th>
                <th className="text-left px-3 py-2">Objeto</th>
                <th className="text-left px-3 py-2">Contratista</th>
                <th className="text-right px-3 py-2 w-36">Monto</th>
                <th className="text-right px-3 py-2 w-24">Plazo</th>
                <th className="text-left px-3 py-2 w-32">Inicio</th>
                <th className="text-left px-3 py-2 w-56">PDF firmado</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => (
                <tr key={c.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{c.folio}</td>
                  <td className="px-3 py-2">{c.objeto}</td>
                  <td className="px-3 py-2">{c.contratista}</td>
                  <td className="px-3 py-2 text-right">{formatoMXN.format(Number(c.monto))}</td>
                  <td className="px-3 py-2 text-right">{c.plazo_dias} d</td>
                  <td className="px-3 py-2">{c.fecha_inicio?.slice(0, 10)}</td>
                  <td className="px-3 py-2">
                    {subiendoId === c.id ? (
                      <span className="text-xs text-sigecop-accent">Subiendo…</span>
                    ) : c.tiene_documento ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span title="Tiene PDF firmado">📄</span>
                        <button type="button" onClick={() => verDescargar(c.id, false)} className="text-xs text-sigecop-accent hover:underline">Ver</button>
                        <button type="button" onClick={() => verDescargar(c.id, true)} className="text-xs text-sigecop-accent hover:underline">Descargar</button>
                        {!soloLectura && <button type="button" onClick={() => pedirArchivo(c.id)} className="text-xs text-slate-500 hover:underline">Reemplazar</button>}
                      </div>
                    ) : (
                      !soloLectura
                        ? <button type="button" onClick={() => pedirArchivo(c.id)} className="text-xs text-sigecop-accent hover:underline">Subir PDF</button>
                        : <span className="text-xs text-slate-400">Sin PDF</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const REQ_GENERALES = ['folio', 'tipo', 'objeto', 'contratista', 'dependencia', 'monto', 'plazoDias', 'fechaInicio'];

export default function AltaContrato() {
  const { showToast } = useToast();
  const { soloLectura } = useVistaHU('HU-01');
  const { token } = useSesion();
  const sinSesion = !token;

  const ridCounter = useRef(0);
  const nextRid = () => (ridCounter.current += 1);
  const conceptosIniciales = () => conceptosDummy.map((c) => ({ rid: nextRid(), concepto: c.concepto, unidad: c.unidad, cantidad: c.cantidad, pu: c.pu }));
  const programaIniciales = () => programaObraDummy.map((a) => ({ rid: nextRid(), actividad: a.actividad, inicio: a.inicio, termino: a.termino, peso: a.peso }));
  const garantiasIniciales = () => polizasGarantiaDummy.map((g) => ({ rid: nextRid(), tipo: g.tipo, afianzadora: g.afianzadora, poliza: g.poliza, monto: g.monto, vigencia: g.vigencia }));

  const [datosGenerales, setDatosGenerales] = useState(() => ({ ...DATOS_INICIALES }));
  const [datosJuridicos, setDatosJuridicos] = useState(() => ({ ...JURIDICOS_INICIALES }));
  const [anticipoPct, setAnticipoPct] = useState(30);
  const [conceptos, setConceptos] = useState(conceptosIniciales);
  const [programa, setPrograma] = useState(programaIniciales);
  const [garantias, setGarantias] = useState(garantiasIniciales);

  const [errores, setErrores] = useState(ERR0);
  const [tabActivo, setTabActivo] = useState(0);

  const setDatosGen = (k) => (e) => setDatosGenerales((prev) => ({ ...prev, [k]: e.target.value }));
  const setDatosJur = (k) => (e) => setDatosJuridicos((prev) => ({ ...prev, [k]: e.target.value }));

  const mkCell = (setter) => (i, key) => (e) => setter((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: e.target.value } : r)));
  const mkAdd = (setter, vacio) => () => setter((prev) => [...prev, { ...vacio, rid: nextRid() }]);
  const mkRemove = (setter) => (i) => setter((prev) => prev.filter((_, idx) => idx !== i));
  const mkPatch = (setter) => (i, patch) => setter((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  useEffect(() => { setErrores(ERR0); }, [datosGenerales, datosJuridicos, anticipoPct, conceptos, programa, garantias]);

  const [contratos, setContratos] = useState([]);
  const [loadingLista, setLoadingLista] = useState(false);
  const [errorLista, setErrorLista] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [contratoGuardadoId, setContratoGuardadoId] = useState(null);

  const cargarContratos = useCallback(async () => {
    if (sinSesion) return;
    setLoadingLista(true); setErrorLista(null);
    try { const lista = await api.listarContratos(); setContratos(Array.isArray(lista) ? lista : []); }
    catch (err) { setErrorLista('No se pudieron cargar los contratos'); }
    finally { setLoadingLista(false); }
  }, [sinSesion]);

  useEffect(() => { cargarContratos(); }, [cargarContratos]);

  // Validacion en cliente con reglas de dominio. Requeridos todos juntos; el resto localizado.
  const validar = () => {
    const faltan = REQ_GENERALES.filter((k) => String(datosGenerales[k] ?? '').trim() === '');
    if (faltan.length) {
      const campos = {}; faltan.forEach((k) => { campos[k] = true; });
      return { tab: 0, msg: `Faltan campos: ${faltan.join(', ')}`, errores: { ...ERR0, campos } };
    }
    const montoNum = Number(datosGenerales.monto);
    if (!(montoNum > 0)) return { tab: 0, msg: 'El monto debe ser un número mayor a 0', errores: { ...ERR0, campos: { monto: true } } };
    if (!(Number.isInteger(Number(datosGenerales.plazoDias)) && Number(datosGenerales.plazoDias) > 0)) return { tab: 0, msg: 'El plazo debe ser un entero mayor a 0', errores: { ...ERR0, campos: { plazoDias: true } } };
    if (anticipoPct !== '' && anticipoPct !== null) {
      const a = Number(anticipoPct);
      if (!(a >= 0 && a <= 100)) return { tab: 4, msg: 'El % de anticipo debe estar entre 0 y 100', errores: { ...ERR0, campos: { anticipoPct: true } } };
    }
    // Regla 4: concepto con cantidad > 0 y P.U. > 0.
    for (let i = 0; i < conceptos.length; i++) {
      const c = conceptos[i];
      const cant = Number(c.cantidad); const pu = Number(c.pu);
      if (!String(c.concepto).trim() || !String(c.unidad).trim() || c.cantidad === '' || c.pu === '' || !(cant > 0) || !(pu > 0)) {
        return { tab: 1, msg: `Concepto #${i + 1}: concepto, unidad y cantidad/P.U. mayores a 0`, errores: { ...ERR0, conceptoIdx: i } };
      }
    }
    // Regla 1: Σ(catálogo) = monto (subtotal sin IVA), ±$1, solo si hay conceptos.
    if (conceptos.length > 0) {
      const total = conceptos.reduce((s, c) => s + (Number(c.cantidad) || 0) * (Number(c.pu) || 0), 0);
      if (Math.abs(total - montoNum) > TOLERANCIA_CATALOGO) {
        return { tab: 1, msg: `El catálogo (${formatoMXN.format(total)}) no cuadra con el monto (${formatoMXN.format(montoNum)}). Ajusta para que coincidan.`, errores: { ...ERR0, catalogoMonto: true } };
      }
    }
    // Regla 5: actividades dentro del plazo del contrato.
    const terminoDerivado = derivarTermino(datosGenerales.fechaInicio, Number(datosGenerales.plazoDias));
    for (let i = 0; i < programa.length; i++) {
      const a = programa[i];
      if (!String(a.actividad).trim() || !a.inicio || !a.termino || a.peso === '') return { tab: 2, msg: `Actividad #${i + 1}: revisa actividad, fechas y peso`, errores: { ...ERR0, actividadIdx: i } };
      if (a.termino < a.inicio) return { tab: 2, msg: `Actividad #${i + 1}: el término no puede ser anterior al inicio`, errores: { ...ERR0, actividadIdx: i } };
      const pp = Number(a.peso);
      if (!(pp >= 0 && pp <= 100)) return { tab: 2, msg: `Actividad #${i + 1}: el peso debe estar entre 0 y 100`, errores: { ...ERR0, actividadIdx: i } };
      if (a.inicio < datosGenerales.fechaInicio || a.termino > terminoDerivado) {
        return { tab: 2, msg: `Actividad #${i + 1}: debe estar dentro del plazo del contrato (${datosGenerales.fechaInicio} a ${terminoDerivado})`, errores: { ...ERR0, actividadIdx: i } };
      }
    }
    const sumaPeso = Math.round(programa.reduce((s, a) => s + (Number(a.peso) || 0), 0) * 100) / 100;
    if (sumaPeso > 100) return { tab: 2, msg: `El programa de obra suma ${sumaPeso}% (excede 100%). Ajusta los pesos antes de guardar.`, errores: ERR0 };
    for (let i = 0; i < garantias.length; i++) {
      if (!String(garantias[i].tipo).trim()) return { tab: 4, msg: `Garantía #${i + 1}: el tipo es obligatorio`, errores: { ...ERR0, garantiaIdx: i } };
    }
    return null;
  };

  const handleGuardar = async () => {
    if (guardando || soloLectura) return;
    const v = validar();
    if (v) { setErrores(v.errores); setTabActivo(v.tab); showToast(v.msg); return; }
    setErrores(ERR0);
    setGuardando(true);
    try {
      const payload = {
        folio: datosGenerales.folio,
        tipo: datosGenerales.tipo,
        objeto: datosGenerales.objeto,
        contratista: datosGenerales.contratista,
        dependencia: datosGenerales.dependencia,
        monto: Number(datosGenerales.monto),
        plazoDias: Number(datosGenerales.plazoDias),
        fechaInicio: datosGenerales.fechaInicio,
        anticipoPct: anticipoPct === '' || anticipoPct === null ? null : Number(anticipoPct),
        juridicos: datosJuridicos,
        conceptos: conceptos.map((c) => ({ concepto: c.concepto, unidad: c.unidad, cantidad: c.cantidad, pu: c.pu })),
        actividades: programa.map((a) => ({ actividad: a.actividad, inicio: a.inicio, termino: a.termino, peso: a.peso })),
        garantias: garantias.map((g) => ({ tipo: g.tipo, afianzadora: g.afianzadora, poliza: g.poliza, monto: g.monto, vigencia: g.vigencia }))
      };
      const creado = await api.crearContrato(payload);
      if (creado && creado.id) setContratoGuardadoId(creado.id);
      showToast('Contrato guardado: ' + payload.folio);
      cargarContratos();
    } catch (err) {
      if (err.status === 409) { setErrores({ ...ERR0, campos: { folio: true } }); setTabActivo(0); showToast('El folio ya existe'); }
      else if (err.status === 400) {
        const f = err.payload?.faltantes;
        if (f && f.length) { const campos = {}; f.forEach((k) => { campos[k] = true; }); setErrores({ ...ERR0, campos }); setTabActivo(0); showToast(`Faltan campos: ${f.join(', ')}`); }
        else { showToast(err.message || 'Revisa los datos del formulario'); }
      }
      else if (err.status === 403) showToast('Solo el residente puede crear contratos');
      else if (err.status === 401) showToast('Tu sesión expiró. Vuelve a iniciar sesión.');
      else showToast('No se pudo guardar el contrato');
    } finally { setGuardando(false); }
  };

  const handleCancelar = () => {
    if (soloLectura) return;
    if (!window.confirm('¿Descartar los cambios y reiniciar el formulario?')) return;
    setDatosGenerales({ ...DATOS_INICIALES });
    setDatosJuridicos({ ...JURIDICOS_INICIALES });
    setAnticipoPct(30);
    setConceptos(conceptosIniciales());
    setPrograma(programaIniciales());
    setGarantias(garantiasIniciales());
    setErrores(ERR0);
    setTabActivo(0);
    setContratoGuardadoId(null);
  };

  const tabsConError = useMemo(() => {
    const s = new Set();
    const c = errores.campos || {};
    if (REQ_GENERALES.some((k) => c[k])) s.add(0);
    if (errores.conceptoIdx != null || errores.catalogoMonto) s.add(1);
    if (errores.actividadIdx != null) s.add(2);
    if (c.anticipoPct || errores.garantiaIdx != null) s.add(4);
    return s;
  }, [errores]);

  const wrapTab = (node) => (<RegionEditable disabled={soloLectura}>{node}</RegionEditable>);

  const tabs = [
    { label: 'Datos generales', content: wrapTab(<TabDatosGenerales datos={datosGenerales} set={setDatosGen} err={errores.campos} />) },
    { label: 'Catálogo de conceptos', content: wrapTab(
      <TabCatalogo rows={conceptos} onCell={mkCell(setConceptos)} onPatch={mkPatch(setConceptos)} onAdd={mkAdd(setConceptos, { concepto: '', unidad: '', cantidad: '', pu: '' })} onRemove={mkRemove(setConceptos)} soloLectura={soloLectura} errIdx={errores.conceptoIdx} monto={datosGenerales.monto} />
    ) },
    { label: 'Programa de obra', content: wrapTab(
      <TabPrograma rows={programa} onCell={mkCell(setPrograma)} onAdd={mkAdd(setPrograma, { actividad: '', inicio: '', termino: '', peso: '' })} onRemove={mkRemove(setPrograma)} soloLectura={soloLectura} errIdx={errores.actividadIdx} />
    ) },
    { label: 'Datos jurídicos', content: wrapTab(<TabJuridicos datos={datosJuridicos} set={setDatosJur} />) },
    { label: 'Garantías, penalizaciones y amortización', content: wrapTab(
      <TabGarantias rows={garantias} onCell={mkCell(setGarantias)} onAdd={mkAdd(setGarantias, { tipo: '', afianzadora: '', poliza: '', monto: '', vigencia: '' })} onRemove={mkRemove(setGarantias)} anticipoPct={anticipoPct} setAnticipoPct={setAnticipoPct} soloLectura={soloLectura} errIdx={errores.garantiaIdx} errAnticipo={errores.campos.anticipoPct} />
    ) },
    { label: 'PDF firmado', content: wrapTab(<TabPdfFirmado contratoId={contratoGuardadoId} soloLectura={soloLectura} />) },
    { label: 'Registrados', content: (
      <TabRegistrados contratos={contratos} loading={loadingLista} errorMsg={errorLista} sinSesion={sinSesion} onRecargar={cargarContratos} soloLectura={soloLectura} />
    ) }
  ];

  return (
    <div>
      <HeaderVista
        huId="HU-01"
        titulo="Alta de contratos"
        sprint="Sprint 1"
        breadcrumb={[{ label: 'Inicio', href: '/' }, { label: 'Contratos' }, { label: 'Alta de contratos' }]}
      />

      <Tabs tabs={tabs} active={tabActivo} onTabChange={setTabActivo} tabsConError={tabsConError} />

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={handleCancelar} disabled={soloLectura} className="px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-40">Cancelar</button>
        <button type="button" className="sg-btn-primary" disabled={soloLectura || guardando} onClick={handleGuardar}>
          {guardando ? 'Guardando…' : 'Guardar contrato'}
        </button>
      </div>

      <SeccionCriterios
        huId="HU-01"
        criterios={[
          { numero: 1, texto: 'Existe un contrato con folio único que contiene catálogo de conceptos, programa de obra, elementos jurídicos, garantías, penalizaciones, plan de amortización del anticipo y PDF firmado.' },
          { numero: 2, texto: 'El sistema valida que los campos obligatorios estén llenos y el folio sea único antes de guardar.' },
          { numero: 3, texto: 'Existe un PDF firmado del contrato ligado al expediente, consultable por todos los actores autorizados.' }
        ]}
      />
    </div>
  );
}
