import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Tabs from '../components/ui/Tab.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { api } from '../services/api.js';
// alta-v2 (4.2): el alta arranca VACÍA (sin datos dummy). Ya no se importa conceptosDummy
// ni polizasGarantiaDummy.

const formatoMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2
});

const UNIDADES = ['m', 'm²', 'm³', 'ml', 'cm', 'kg', 'ton', 'pza', 'lote', 'jornal', '%'];

// --- 4.2: límites de las columnas NUMERIC (DEBEN ir en sintonía con schema.sql) ---
// cantidad NUMERIC(14,3) → 11 enteros (<10^11); pu NUMERIC(16,4) → 12 enteros (<10^12);
// monto NUMERIC(18,2) (ENSANCHADO en 4.2, antes 14,2) → 16 enteros (<10^16). Validar en la
// vista contra estos topes evita el error crudo 22003 de Postgres al guardar.
const MAX_CANTIDAD = 1e11;
const MAX_PU = 1e12;
const MAX_MONTO = 1e16;

// --- 4.4 + alta-v4: umbral de % de anticipo que EXIGE el PDF de autorización ---
// D-5 RESUELTA (Maiki): por ENCIMA del umbral el PDF de autorización es OBLIGATORIO (bloquea
// avance y guardado del paso de garantías), igual que el PDF firmado. PARAMETRIZABLE: este es
// el ÚNICO knob del umbral. El % exacto y su fundamento legal son [validar] con el profe — NO se
// asume artículo del umbral (la exigencia de autorización escrita del titular se apoya, en la
// vista, en art. 50 fr. IV LOPSRM, pero el valor 30 lo confirma el profe).
const ANTICIPO_UMBRAL_PDF = 30;

// --- Reglas de dominio HU-01 ---
const IVA_RATE = 0.16;            // IVA derivado (solo se muestra, NO se guarda)

// Cuadre EXACTO (A1.3): el monto se DERIVA del catálogo = Σ ROUND(cantidad×pu, 2). No hay
// captura de monto ni tolerancia. round2/round4 replican el redondeo del backend (NUMERIC).
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const round3 = (n) => Math.round((Number(n) + Number.EPSILON) * 1e3) / 1e3;
const round4 = (n) => Math.round((Number(n) + Number.EPSILON) * 1e4) / 1e4;
// alta-v2 (punto 3): regla del 100% del programa. La cantidad del programa es NUMERIC(14,3);
// la tolerancia de redondeo es media milésima (igual que el backend: ABS(Δ) > 0.0005).
const TOL_PROGRAMA = 0.0005;
// Importe del renglón = ROUND(cantidad×pu, 2) como STRING '0.00' ('' si falta cantidad/pu).
const importeDe = (cantidad, pu) => {
  const cant = Number(cantidad);
  if (!(cant > 0) || pu === '' || pu == null || !(Number(pu) >= 0)) return '';
  return round2(cant * Number(pu)).toFixed(2);
};
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

// Fecha ISO (yyyy-mm-dd) -> dd/mm/aaaa (es-MX), sin corrimiento de zona horaria.
const fmtFechaES = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : String(iso).slice(0, 10);
};

// Una fila de garantía está "vacía" si no tiene NINGÚN dato capturado. Si tiene
// cualquier dato, debe estar completa (al menos monto > 0); a medias se bloquea.
const garantiaVacia = (g) => !(
  String(g.tipo || '').trim() || String(g.afianzadora || '').trim() ||
  String(g.poliza || '').trim() || (g.monto !== '' && g.monto != null) ||
  String(g.vigencia || '').trim()
);

// alta-v5: tipos canónicos de póliza (select). Cumplimiento y Anticipo son las EXIGIBLES por ley
// (art. 48 fr. II y fr. I LOPSRM); "Vicios ocultos" es POST-recepción (art. 66, no exigible al alta)
// y "Otra" para pólizas adicionales. El valor se persiste tal cual en contrato_garantias.tipo
// (VARCHAR(40), con UNIQUE(contrato_id, tipo) → una póliza por tipo). Todas las etiquetas ≤ 40 chars.
const TIPO_CUMPLIMIENTO = 'Cumplimiento';
const TIPO_ANTICIPO = 'Anticipo';
const TIPOS_GARANTIA = [TIPO_CUMPLIMIENTO, TIPO_ANTICIPO, 'Vicios ocultos', 'Otra'];

// alta-v5: campos requeridos por póliza (RLOPSRM art. 98 fr. I: la póliza de fianza debe contener
// previsiones mínimas —incl. vigencia—; el conjunto identificatorio lo fija el proyecto).
const polizaCompleta = (g) =>
  String(g.tipo || '').trim() !== '' &&
  String(g.afianzadora || '').trim() !== '' &&
  String(g.poliza || '').trim() !== '' &&
  Number(g.monto) > 0 &&
  String(g.vigencia || '').trim() !== '';

const ERR0 = { campos: {}, conceptoIdx: null, programaError: false, garantiaIdx: null, catalogoMonto: false, pdfFirmadoFalta: false, anticipoPdfFalta: false, garantiasFaltan: false };

// alta-v2 (4.2): valores iniciales VACÍOS (también usados por "Cancelar"). El contrato nuevo
// arranca en blanco; el `tipo` mantiene la primera opción del select (campo obligatorio que
// siempre tiene un valor válido).
// Corrección profe (04-jun): contratista/dependencia YA NO son texto libre (pasan a CUENTAS
// seleccionadas: contratista = superintendente; dependencia = dependenciaId). Por eso salen de aquí.
const DATOS_INICIALES = {
  folio: '',
  tipo: 'Obra pública sobre la base de precios unitarios',
  objeto: '',
  plazoDias: '',
  fechaInicio: '',
  penaConvencionalPct: '' // Etapa C: % de pena por atraso (opcional, fracción 0–1)
};
const JURIDICOS_INICIALES = {
  firmanteDependencia: '',
  cargoFirmante: '',
  representanteLegal: '',
  cedulaProfesional: '',
  poderNotarial: '',
  notaria: ''
};

// alta-v5: datos jurídicos OBLIGATORIOS (mínimo de formalización). Fundamento por campo:
//  · firmanteDependencia + cargoFirmante: art. 46 fr. I LOPSRM (dependencia/entidad convocante) +
//    art. 47/48 LOPSRM (la persona servidora pública facultada para firmar el contrato).
//  · representanteLegal: art. 46 fr. IV LOPSRM (acreditación de existencia y personalidad del
//    licitante adjudicado) + RLOPSRM art. 61 fr. VI-b)/VII (facultades del representante para
//    suscribir el contrato).
//  · cedulaProfesional: [validar] — LOPSRM/RLOPSRM federal NO la exigen al alta (el responsable/DRO
//    deriva de reglamentos de construcción locales y de la responsabilidad profesional). Se exige
//    por decisión de la Fundación; confirmar el fundamento con el profe.
// poderNotarial/notaria quedan OPCIONALES (una de varias formas de acreditar personalidad) [validar].
const REQ_JURIDICOS = ['firmanteDependencia', 'cargoFirmante', 'representanteLegal', 'cedulaProfesional'];
const ETIQUETA_JURIDICO = {
  firmanteDependencia: 'firmante de la dependencia',
  cargoFirmante: 'cargo del firmante',
  representanteLegal: 'representante legal',
  cedulaProfesional: 'cédula profesional'
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

function TabDatosGenerales({ datos, set, err, equipo, montoDerivado }) {
  const e = err || {};
  const eq = equipo || {};
  const montoNum = Number(montoDerivado) || 0;
  const terminoDerivado = derivarTermino(datos.fechaInicio, Number(datos.plazoDias));
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Datos generales del contrato</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Folio del contrato" required>
          <input className={inputCls(e.folio)} maxLength={50} value={datos.folio} onChange={set('folio')} data-testid="dg-folio" />
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
            <input className={inputCls(e.objeto)} value={datos.objeto} onChange={set('objeto')} data-testid="dg-objeto" />
          </Field>
        </div>
        {/* Corrección profe (04-jun): la dependencia (parte contratante) se SELECCIONA de una cuenta
            registrada rol 'dependencia' (antes texto libre). El contratista NO va aquí: es la cuenta
            del superintendente (Equipo del contrato), quien firma la bitácora. */}
        <Field label="Dependencia (cuenta contratante)" required hint="Cuenta registrada con rol dependencia.">
          <select className={inputCls(eq.errDependencia)} value={eq.dependenciaId || ''} onChange={(ev) => eq.setDependenciaId(ev.target.value)} data-testid="dg-dependencia">
            <option value="">— Selecciona —</option>
            {(eq.asignablesDependencia || []).map((u) => <option key={u.id} value={u.id}>{u.nombre} · {u.email}</option>)}
          </select>
          {(eq.asignablesDependencia || []).length === 0 && (
            <p className="text-xs text-amber-700 mt-1" data-testid="sin-dependencias">No hay cuentas de dependencia aprobadas; debe registrarse y aprobarse al menos una cuenta con rol dependencia.</p>
          )}
        </Field>
        <Field label="Monto del contrato (derivado del catálogo)" hint="Σ de los importes del catálogo (sin IVA). No se captura; se deriva al centavo.">
          <input className="sg-input bg-slate-100 text-slate-700" value={montoNum ? formatoMXN.format(montoNum) : '—'} readOnly data-testid="monto-derivado" />
        </Field>
        <Field label="Plazo (días naturales)" required>
          <input type="number" min="1" step="1" className={inputCls(e.plazoDias)} value={datos.plazoDias} onChange={set('plazoDias')} data-testid="dg-plazo" />
        </Field>
        <Field label="Fecha de inicio" required>
          <input type="date" lang="es-MX" className={inputCls(e.fechaInicio)} value={datos.fechaInicio} onChange={set('fechaInicio')} data-testid="dg-fecha" />
        </Field>
        <Field label="Fecha de término (calculada)" hint="Se deriva del inicio + plazo (LOPSRM 31-V). No editable.">
          <input className="sg-input bg-slate-100 text-slate-700" value={terminoDerivado ? fmtFechaES(terminoDerivado) : '—'} readOnly data-testid="termino-derivado" />
        </Field>
        {/* Etapa C: % de pena por atraso (penas convencionales, art. 138/139 RLOPSRM). OPCIONAL. */}
        <Field label="% de pena por atraso (opcional)" hint="Penas convencionales por atraso (art. 138/139 RLOPSRM). Fracción 0–1 (ej. 0.05 = 5%). Vacío = sin pena.">
          <input type="number" min="0" max="1" step="0.0001" className={inputCls(e.penaConvencionalPct)} value={datos.penaConvencionalPct} onChange={set('penaConvencionalPct')} data-testid="dg-pena" placeholder="0.05" />
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

      <div className="mt-6 pt-5 border-t border-slate-200">
        <h3 className="text-lg font-bold text-sigecop-blue mb-1">Equipo del contrato</h3>
        <p className="text-sm text-slate-600 mb-3">
          Quienes firmarán la apertura de la bitácora. Cada miembro firma <strong>desde su propia cuenta</strong>; no se capturan nombres a mano.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Residente (tú)">
            <input className="sg-input bg-slate-100 text-slate-700" value={eq.usuarioNombre || '—'} readOnly data-testid="equipo-residente" />
          </Field>
          {/* Corrección profe (04-jun): esta cuenta ES el contratista (su superintendente de obra),
              seleccionado de cuentas registradas. Firma la bitácora y queda en el contrato_roster. */}
          <Field label="Contratista · superintendente de obra" required hint="Cuenta de contratista aprobada; firma la bitácora.">
            <select className={inputCls(eq.errSuperintendente)} value={eq.superintendenteId || ''} onChange={(ev) => eq.setSuperintendenteId(ev.target.value)} data-testid="select-superintendente">
              <option value="">— Selecciona —</option>
              {(eq.asignablesContratista || []).map((u) => <option key={u.id} value={u.id}>{u.nombre} · {u.email}</option>)}
            </select>
          </Field>
          <Field label="Supervisión (opcional)" hint="Cuenta de supervisión aprobada.">
            <select className="sg-input" value={eq.supervisionId || ''} onChange={(ev) => eq.setSupervisionId(ev.target.value)} data-testid="select-supervision">
              <option value="">— Sin supervisión —</option>
              {(eq.asignablesSupervision || []).map((u) => <option key={u.id} value={u.id}>{u.nombre} · {u.email}</option>)}
            </select>
          </Field>
        </div>
        {(eq.asignablesContratista || []).length === 0 && (
          <p className="text-xs text-amber-700 mt-2">No hay cuentas de contratista aprobadas; la dependencia debe aprobar al menos una para poder asignar superintendente.</p>
        )}
      </div>
    </div>
  );
}

function TabCatalogo({ rows, onCell, onPatch, onAdd, onRemove, soloLectura, errIdx, onCantidad, onPu, onImporte, onImporteBlur, montoDerivado }) {
  const total = Number(montoDerivado) || 0; // = Σ importes = monto derivado, exacto al centavo
  const hayConceptos = rows.length > 0;
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Catálogo de conceptos</h3>
      <p className="text-sm text-slate-600 mb-3">
        Conceptos sobre la base de precios unitarios. Cada concepto lleva su <strong>clave</strong> (la defines tú). El <strong>monto se DERIVA</strong> = Σ de los importes; teclea el P.U. <em>o</em> el importe (el otro se calcula).
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2 w-28">Clave</th>
              <th className="text-left px-3 py-2">Concepto</th>
              <th className="text-left px-3 py-2 w-28">Unidad</th>
              <th className="text-right px-3 py-2 w-28">Cantidad</th>
              <th className="text-right px-3 py-2 w-32">P.U.</th>
              <th className="text-right px-3 py-2 w-36">Importe</th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => {
              const esOtro = c.unidadOtro || (c.unidad !== '' && !UNIDADES.includes(c.unidad));
              const unidadSel = esOtro ? 'Otro' : c.unidad;
              return (
                <tr key={c.rid} className={`border-t border-slate-200 ${errIdx === i ? 'bg-red-50' : ''}`}>
                  <td className="px-2 py-1 align-top"><input className="sg-input font-mono text-xs" maxLength={40} placeholder="p.ej. AD.01" value={c.clave || ''} onChange={onCell(i, 'clave')} disabled={soloLectura} data-testid={`concepto-clave-${i}`} /></td>
                  <td className="px-2 py-1 align-top"><input className="sg-input" value={c.concepto} onChange={onCell(i, 'concepto')} disabled={soloLectura} data-testid={`concepto-concepto-${i}`} /></td>
                  <td className="px-2 py-1 align-top">
                    <select className="sg-input" value={unidadSel}
                      onChange={(e) => { const v = e.target.value; if (v === 'Otro') onPatch(i, { unidadOtro: true, unidad: '' }); else onPatch(i, { unidadOtro: false, unidad: v }); }}
                      disabled={soloLectura} data-testid={`concepto-unidad-${i}`}>
                      <option value="">—</option>
                      {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                      <option value="Otro">Otro…</option>
                    </select>
                    {esOtro && (
                      <input className="sg-input mt-1" placeholder="Especifica la unidad" maxLength={20} value={c.unidad} onChange={onCell(i, 'unidad')} disabled={soloLectura} />
                    )}
                  </td>
                  <td className="px-2 py-1 align-top"><input type="number" min="0" step="0.001" className="sg-input text-right" value={c.cantidad} onChange={onCantidad(i)} disabled={soloLectura} data-testid={`concepto-cantidad-${i}`} /></td>
                  <td className="px-2 py-1 align-top"><input type="number" min="0" step="0.0001" className="sg-input text-right" value={c.pu} onChange={onPu(i)} disabled={soloLectura} data-testid={`concepto-pu-${i}`} /></td>
                  <td className="px-2 py-1 align-top"><input type="number" min="0" step="0.01" className="sg-input text-right font-semibold" value={c.importe || ''} onChange={onImporte(i)} onBlur={onImporteBlur(i)} disabled={soloLectura} data-testid={`concepto-importe-${i}`} /></td>
                  <td className="px-2 py-1 text-center align-top">
                    <button type="button" onClick={() => onRemove(i)} disabled={soloLectura} className="text-red-500 hover:text-red-700 disabled:opacity-30" title="Quitar concepto">✕</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-4 text-center text-slate-400">Sin conceptos. Agrega al menos uno (el monto se deriva del catálogo).</td></tr>
            )}
          </tbody>
          {hayConceptos && (
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td colSpan={5} className="px-3 py-2 text-right font-semibold text-slate-700">Monto del contrato (Σ importes)</td>
                <td className="px-3 py-2 text-right font-bold text-sigecop-blue whitespace-nowrap" data-testid="catalogo-total">{formatoMXN.format(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {hayConceptos && (
        <div className="mt-3 px-3 py-2 rounded border text-sm font-medium text-green-700 bg-green-50 border-green-300" data-testid="catalogo-indicador">
          ✓ Cuadre exacto: el monto del contrato es la suma de los importes ({formatoMXN.format(total)}), al centavo, sin tolerancia.
        </div>
      )}
      <button type="button" onClick={onAdd} disabled={soloLectura} className="mt-3 text-sm text-sigecop-accent hover:underline disabled:opacity-40">
        + Agregar concepto
      </button>
    </div>
  );
}

// --- A2: generador de periodos en cliente (ESPEJO de backend/src/lib/programa.js) ---
// Solo para pintar la matriz en vivo; el backend regenera de forma autoritativa.
function masUnMesC(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  let ny = y, nm = m + 1; if (nm > 12) { nm = 1; ny += 1; }
  const ult = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, ult)).padStart(2, '0')}`;
}
function addDiasC(iso, n) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d)); dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}
function generarPeriodosC(fechaInicio, plazoDias, ciclo) {
  if (!fechaInicio || !(Number(plazoDias) > 0) || (ciclo !== 'mensual' && ciclo !== 'quincenal')) return [];
  const termino = addDiasC(fechaInicio, Number(plazoDias) - 1);
  const out = []; let inicio = String(fechaInicio).slice(0, 10); let n = 0;
  while (inicio <= termino && n < 1000) {
    n += 1;
    const corte = ciclo === 'mensual' ? masUnMesC(inicio) : addDiasC(inicio, 15);
    let fin = addDiasC(corte, -1); if (fin > termino) fin = termino;
    out.push({ numero: n, inicio, fin }); inicio = addDiasC(fin, 1);
  }
  return out;
}

// A2 — Programa de obra = matriz CONCEPTO × PERIODO (art. 45 fr. X RLOPSRM).
// Filas = conceptos del catálogo (con su clave); columnas = periodos del ciclo (art. 54);
// celda = cantidad planeada. Validación EN LA VISTA: Σ por concepto ≤ contratado (art. 118),
// con el restante recalculándose en vivo (lo pidió el profe; el backend lo revalida en SQL).
function TabProgramaMatriz({ conceptos, periodos, ciclo, setCiclo, celdas, setCelda, soloLectura }) {
  const resumen = conceptos.map((c) => {
    const contratado = round3(Number(c.cantidad) || 0);
    const planeado = round3(periodos.reduce((s, p) => s + (Number(celdas[`${c.rid}:${p.numero}`]) || 0), 0));
    const restante = round3(contratado - planeado);
    return { rid: c.rid, contratado, planeado, restante };
  });
  // alta-v2 (punto 3): regla del 100% — cada concepto debe CUADRAR (|restante| <= tolerancia).
  const noCuadra = resumen.some((r) => Math.abs(r.restante) > TOL_PROGRAMA);
  const conceptosOk = resumen.length > 0 && periodos.length > 0 && !noCuadra;
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-1">Programa de obra (catálogo × periodos)</h3>
      <p className="text-sm text-slate-600 mb-3">
        El programa son los <strong>conceptos del catálogo</strong> repartidos en los <strong>periodos del ciclo</strong>. La celda es la <strong>cantidad</strong> que planeas ejecutar de ese concepto en ese periodo. La suma por concepto debe <strong>cuadrar al 100% de lo contratado</strong> (programa convenido del total de los conceptos: RLOPSRM art. 45-A-X + LOPSRM art. 52); el restante se recalcula en vivo y debe quedar en <strong>0</strong>.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-sm font-medium text-slate-700">Ciclo de estimación (art. 54):</label>
        <select className="sg-input w-auto" value={ciclo} onChange={(e) => setCiclo(e.target.value)} disabled={soloLectura} data-testid="select-ciclo">
          <option value="mensual">Mensual (cada ~30 días)</option>
          <option value="quincenal">Quincenal (cada 15 días)</option>
        </select>
        <span className="text-sm text-slate-500" data-testid="periodos-count">{periodos.length} periodo{periodos.length === 1 ? '' : 's'}</span>
      </div>

      {conceptos.length === 0 ? (
        <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm text-slate-800">
          Captura primero el <strong>catálogo de conceptos</strong>: el programa reparte esos conceptos en los periodos.
        </div>
      ) : periodos.length === 0 ? (
        <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm text-slate-800">
          Define la <strong>fecha de inicio</strong>, el <strong>plazo</strong> (Datos generales) y el <strong>ciclo</strong> para generar los periodos.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="text-sm">
            <thead className="bg-sigecop-blue-light text-sigecop-blue">
              <tr>
                <th className="text-left px-3 py-2 sticky left-0 bg-sigecop-blue-light w-28">Clave</th>
                <th className="text-left px-3 py-2 w-56">Concepto</th>
                {periodos.map((p) => (
                  <th key={p.numero} className="text-right px-2 py-2 w-24" title={`${fmtFechaES(p.inicio)} – ${fmtFechaES(p.fin)}`}>
                    P{p.numero}
                    <div className="text-[10px] font-normal text-blue-700">{fmtFechaES(p.inicio).slice(0, 5)}</div>
                  </th>
                ))}
                <th className="text-right px-2 py-2 w-24">Σ planeado</th>
                <th className="text-right px-2 py-2 w-24">Contratado</th>
                <th className="text-right px-2 py-2 w-24">Restante</th>
              </tr>
            </thead>
            <tbody>
              {conceptos.map((c, i) => {
                const r = resumen[i];
                const cuadra = Math.abs(r.restante) <= TOL_PROGRAMA;
                const restCls = cuadra ? 'text-green-700 font-semibold' : r.restante < 0 ? 'text-red-700 font-bold' : 'text-amber-700';
                return (
                  <tr key={c.rid} className={`border-t border-slate-200 ${!cuadra ? (r.restante < 0 ? 'bg-red-50' : 'bg-amber-50') : ''}`}>
                    <td className="px-3 py-1 font-mono text-xs sticky left-0 bg-white">{c.clave || '—'}</td>
                    <td className="px-3 py-1 truncate max-w-[14rem]" title={c.concepto}>{c.concepto || '—'}</td>
                    {periodos.map((p) => (
                      <td key={p.numero} className="px-1 py-1">
                        <input type="number" min="0" step="0.001"
                          className="sg-input text-right text-xs w-20"
                          value={celdas[`${c.rid}:${p.numero}`] || ''}
                          onChange={(e) => setCelda(c.rid, p.numero, e.target.value)}
                          disabled={soloLectura}
                          data-testid={`celda-${i}-${p.numero}`} />
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right font-semibold" data-testid={`planeado-${i}`}>{r.planeado}</td>
                    <td className="px-2 py-1 text-right text-slate-600">{r.contratado}</td>
                    <td className={`px-2 py-1 text-right ${restCls}`} data-testid={`restante-${i}`}>{r.restante}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {resumen.length > 0 && periodos.length > 0 && noCuadra && (
        <div className="mt-3 px-3 py-2 rounded border text-sm font-medium text-red-700 bg-red-50 border-red-300" data-testid="programa-descuadre">
          El programa <strong>no cuadra al 100%</strong>: hay conceptos con restante ≠ 0 (faltante o exceso). No se puede guardar/avanzar hasta que cada concepto sume <strong>exactamente lo contratado</strong> (RLOPSRM art. 45-A-X + LOPSRM art. 52).
        </div>
      )}
      {conceptosOk && (
        <div className="mt-3 px-3 py-2 rounded border text-sm font-medium text-green-700 bg-green-50 border-green-300" data-testid="programa-cuadra">
          ✓ El programa cuadra al 100%: cada concepto suma exactamente lo contratado.
        </div>
      )}
    </div>
  );
}

function TabJuridicos({ datos, set, err = {} }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Datos jurídicos</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Firmante autorizado de la dependencia" required><input className={inputCls(err.firmanteDependencia)} value={datos.firmanteDependencia} onChange={set('firmanteDependencia')} data-testid="jur-firmante" /></Field>
        <Field label="Cargo del firmante" required><input className={inputCls(err.cargoFirmante)} value={datos.cargoFirmante} onChange={set('cargoFirmante')} data-testid="jur-cargo" /></Field>
        <Field label="Representante legal del contratista" required><input className={inputCls(err.representanteLegal)} value={datos.representanteLegal} onChange={set('representanteLegal')} data-testid="jur-representante" /></Field>
        <Field label="Cédula profesional del responsable técnico" required hint="Cédula vigente del responsable. [validar el fundamento con el profe — no exigida por LOPSRM/RLOPSRM federal al alta]"><input className={inputCls(err.cedulaProfesional)} value={datos.cedulaProfesional} onChange={set('cedulaProfesional')} data-testid="jur-cedula" /></Field>
        <Field label="No. de poder notarial" hint="Opcional"><input className="sg-input" value={datos.poderNotarial} onChange={set('poderNotarial')} data-testid="jur-poder" /></Field>
        <Field label="Notaría" hint="Opcional"><input className="sg-input" value={datos.notaria} onChange={set('notaria')} data-testid="jur-notaria" /></Field>
      </div>
      <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 px-4 py-3 text-sm text-blue-900">
        <strong>Obligatorio para formalizar.</strong> El firmante de la dependencia y su cargo (art. 46 fr. I LOPSRM) y el representante legal del contratista (art. 46 fr. IV LOPSRM; RLOPSRM art. 61 fr. VI-b/VII) son mínimos de formalización. La cédula profesional se exige por decisión de la Fundación <span className="text-slate-500">[validar con el profe]</span>. Poder notarial y notaría son opcionales. Se guarda como un solo registro (<code>datos_juridicos</code>).
      </div>
    </div>
  );
}

// 4.4: subida de la AUTORIZACIÓN del anticipo (PDF). Reutiliza el patrón de PDF del
// contrato (BYTEA, append-only), con `tipo='anticipo_autorizacion'`. El sistema NO valida
// el contenido (responsabilidad del residente); solo lo guarda ligado al contrato.
// 4.4 + alta-v2 (1.6): subida de la AUTORIZACIÓN del anticipo (PDF). Con el contrato ya
// guardado sube directo (BYTEA, append-only). DURANTE la captura (sin contrato aún) retiene el
// File en el padre (pendingFile/onPickFile) y se sube al guardar. tipo='anticipo_autorizacion'.
function AnticipoAutorizacionPDF({ contratoId, soloLectura, pendingFile, onPickFile }) {
  const { showToast } = useToast();
  const [meta, setMeta] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef(null);

  const cargarMeta = useCallback(async () => {
    if (!contratoId) { setMeta(null); return; }
    try { setMeta(await api.documentoMeta(contratoId, 'anticipo_autorizacion')); }
    catch (err) { if (err.status === 404) setMeta(null); else showToast('No se pudo consultar la autorización del anticipo'); }
  }, [contratoId, showToast]);
  useEffect(() => { cargarMeta(); }, [cargarMeta]);

  const validarPdf = (file) => {
    if (file.type !== 'application/pdf') { showToast('Solo se permiten archivos PDF'); return false; }
    if (file.size > 10 * 1024 * 1024) { showToast('El PDF excede el límite de 10 MB'); return false; }
    return true;
  };

  const onArchivo = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file || !validarPdf(file)) return;
    if (!contratoId) { onPickFile(file); return; } // 1.6: retener hasta guardar
    setSubiendo(true);
    try { await api.subirDocumento(contratoId, file, 'anticipo_autorizacion'); showToast('Autorización del anticipo adjuntada'); await cargarMeta(); }
    catch (err) { showToast(err.message || 'No se pudo subir la autorización'); }
    finally { setSubiendo(false); }
  };

  if (meta) {
    return <p className="text-sm text-green-800 mt-2" data-testid="anticipo-pdf-ok">✓ Autorización adjuntada: <strong>{meta.nombre}</strong> ({(Number(meta.tamano) / 1024).toFixed(0)} KB). Es inmutable.</p>;
  }
  return (
    <div className="mt-2" data-testid="anticipo-pdf-uploader">
      {/* alta-v4: el PDF de autorización es OBLIGATORIO sobre el umbral (bloquea avance y guardado). */}
      <p className="text-sm font-semibold text-blue-900 mb-1">Adjunta la autorización escrita (PDF) <span className="text-red-600">*</span>:</p>
      {pendingFile && !contratoId ? (
        <p className="text-sm text-green-800" data-testid="anticipo-pdf-pendiente-file">📎 {pendingFile.name} — se adjuntará al guardar el contrato.{' '}
          <button type="button" className="text-red-600 hover:underline" onClick={() => onPickFile(null)} disabled={soloLectura}>quitar</button>
        </p>
      ) : (
        <>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={onArchivo} disabled={soloLectura || subiendo} className="block text-sm" data-testid="anticipo-pdf-input" />
          {!contratoId && <p className="text-xs text-amber-700 mt-1" data-testid="anticipo-pdf-requerido"><strong>Obligatorio:</strong> sin este PDF no se puede avanzar ni guardar (anticipo &gt; {ANTICIPO_UMBRAL_PDF}%). <span className="text-slate-400">[validar el umbral con el profe]</span></p>}
          {subiendo && <p className="text-sm text-sigecop-accent mt-1">Subiendo…</p>}
        </>
      )}
    </div>
  );
}

function TabGarantias({ rows, onCell, onAdd, onRemove, anticipoPct, setAnticipoPct, soloLectura, errIdx, errAnticipo, contratoId, montoContrato, pdfAnticipoFile, setPdfAnticipoFile }) {
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  const ap = Number(anticipoPct) || 0;
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Garantías, penalizaciones y amortización</h3>

      <div className="mb-4 max-w-md">
        <Field label="% de anticipo otorgado" hint="Base de la amortización (art. 50 LOPSRM). 0–100%.">
          <input type="number" min="0" max="100" step="0.01" className={inputCls(errAnticipo)} value={anticipoPct} onChange={(e) => setAnticipoPct(e.target.value)} disabled={soloLectura} data-testid="anticipo-input" />
        </Field>
        {ap > ANTICIPO_UMBRAL_PDF && (
          <div className="mt-3 bg-blue-50 border-l-4 border-blue-500 px-4 py-3 text-sm text-blue-900 space-y-2" data-testid="avisos-anticipo">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Autorización requerida</div>
            <p>Conforme al <strong>art. 50 fr. IV de la LOPSRM</strong>, un anticipo mayor al {ANTICIPO_UMBRAL_PDF}% requiere <strong>autorización escrita del titular</strong> de la dependencia o entidad. <strong>Adjunta el PDF de la autorización</strong> (el sistema lo guarda ligado al contrato; no valida su contenido — es responsabilidad del residente).</p>
            {ap > 50 && <p>Además, conforme al <strong>art. 139 del RLOPSRM</strong>, un anticipo mayor al 50% debe informarse a la Secretaría (SFP) antes de su entrega.</p>}
            {ap >= 100 && <p>El 100% solo procede en contrato plurianual que inicia en el último trimestre (art. 50 fr. V LOPSRM).</p>}
            {/* 4.4 + 1.6: el aviso HABILITA subir la autorización (durante la captura o post-guardado). */}
            <AnticipoAutorizacionPDF contratoId={contratoId} soloLectura={soloLectura} pendingFile={pdfAnticipoFile} onPickFile={setPdfAnticipoFile} />
          </div>
        )}
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-md mb-4">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2 w-44">Tipo de póliza <span className="text-red-400">*</span></th>
              <th className="text-left px-3 py-2">Afianzadora <span className="text-red-400">*</span></th>
              <th className="text-left px-3 py-2 w-40">No. de póliza <span className="text-red-400">*</span></th>
              <th className="text-right px-3 py-2 w-40">Monto <span className="text-red-400">*</span></th>
              <th className="text-left px-3 py-2 w-48">Vigencia <span className="text-red-400">*</span></th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const vencida = p.vigencia && p.vigencia < hoyStr;
              // alta-v2 (1.4): marca EN VIVO si la garantía excede el monto del contrato.
              const excede = Number(p.monto) > 0 && montoContrato > 0 && Number(p.monto) > montoContrato;
              return (
                <tr key={p.rid} className={`border-t border-slate-200 ${(errIdx === i || excede) ? 'bg-red-50' : ''}`}>
                  <td className="px-2 py-1 align-top">
                    <select className={inputCls(errIdx === i && !String(p.tipo).trim())} value={p.tipo} onChange={onCell(i, 'tipo')} disabled={soloLectura} data-testid={`garantia-tipo-${i}`}>
                      <option value="">— Selecciona —</option>
                      {TIPOS_GARANTIA.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1 align-top"><input className="sg-input" value={p.afianzadora} onChange={onCell(i, 'afianzadora')} disabled={soloLectura} data-testid={`garantia-afianzadora-${i}`} /></td>
                  <td className="px-2 py-1 align-top"><input className="sg-input font-mono text-xs" value={p.poliza} onChange={onCell(i, 'poliza')} disabled={soloLectura} data-testid={`garantia-poliza-${i}`} /></td>
                  <td className="px-2 py-1 align-top">
                    <input type="number" min="0" step="0.01" className={`sg-input text-right${excede ? ' border-red-500 ring-1 ring-red-400' : ''}`} value={p.monto} onChange={onCell(i, 'monto')} disabled={soloLectura} data-testid={`garantia-monto-${i}`} />
                    {excede && <span className="block text-xs text-red-600 mt-1" data-testid={`garantia-excede-${i}`}>⚠ excede el monto del contrato</span>}
                  </td>
                  <td className="px-2 py-1 align-top">
                    <input type="date" lang="es-MX" className="sg-input" value={p.vigencia} onChange={onCell(i, 'vigencia')} disabled={soloLectura} data-testid={`garantia-vigencia-${i}`} />
                    {vencida && <span className="block text-xs text-amber-600 mt-1">⚠ vigencia vencida</span>}
                  </td>
                  <td className="px-2 py-1 text-center align-top">
                    <button type="button" onClick={() => onRemove(i)} disabled={soloLectura} className="text-red-500 hover:text-red-700 disabled:opacity-30" title="Quitar póliza">✕</button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-400">Sin pólizas. Agrega al menos la fianza de <strong>cumplimiento</strong> (obligatoria).</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={onAdd} disabled={soloLectura} className="mb-3 text-sm text-sigecop-accent hover:underline disabled:opacity-40">
        + Agregar póliza
      </button>

      {/* alta-v5: estado de las fianzas OBLIGATORIAS por ley. Es indicativo; el gate DURO (bloquea
          avance/guardado) vive en validarPaso(4). Cumplimiento siempre; anticipo si %anticipo>0. */}
      <div className="mb-4 text-sm" data-testid="garantias-requeridas">
        {(() => {
          const tieneCumpl = rows.some((g) => g.tipo === TIPO_CUMPLIMIENTO && polizaCompleta(g));
          const requiereAnt = (Number(anticipoPct) || 0) > 0;
          const tieneAnt = rows.some((g) => g.tipo === TIPO_ANTICIPO && polizaCompleta(g));
          const faltan = [];
          if (!tieneCumpl) faltan.push('cumplimiento');
          if (requiereAnt && !tieneAnt) faltan.push('anticipo');
          return faltan.length
            ? <span className="block text-red-700 bg-red-50 border border-red-300 rounded px-3 py-2" data-testid="garantias-faltan">Falta(n) la(s) fianza(s) obligatoria(s): <strong>{faltan.join(' y ')}</strong>. La de cumplimiento es obligatoria siempre (art. 47 + art. 48 fr. II LOPSRM){requiereAnt ? '; la de anticipo, por haber % de anticipo > 0 (art. 48 fr. I)' : ''}.</span>
            : <span className="block text-green-700 bg-green-50 border border-green-300 rounded px-3 py-2" data-testid="garantias-ok">✓ Fianzas obligatorias capturadas (cumplimiento{requiereAnt ? ' y anticipo' : ''}).</span>;
        })()}
      </div>

      <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm text-slate-800 mb-3">
        <strong>Penalizaciones — Art. 46 Bis LOPSRM:</strong> se aplicarán deductivas por atraso conforme al programa de obra. El 5 al millar (art. 191 LFD) se carga automáticamente sobre cada estimación.
      </div>
      <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-3 text-sm text-blue-900">
        <strong>Plan de amortización del anticipo — Art. 50 LOPSRM:</strong> el anticipo otorgado deberá amortizarse proporcionalmente al avance en cada estimación, conforme a la fórmula que prevé el art. 50 de la LOPSRM.
      </div>
    </div>
  );
}

// 1.5: PDF firmado del contrato. Con el contrato ya guardado, sube/consulta directo (BYTEA,
// append-only). DURANTE la captura (sin contrato aún) retiene el File en el padre
// (pendingFile/onPickFile) y se sube al guardar — el usuario puede adjuntarlo sin guardar antes.
function TabPdfFirmado({ contratoId, soloLectura, pendingFile, onPickFile }) {
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

  const validarPdf = (file) => {
    if (file.type !== 'application/pdf') { showToast('Solo se permiten archivos PDF'); return false; }
    if (file.size > 10 * 1024 * 1024) { showToast('El PDF excede el límite de 10 MB'); return false; }
    return true;
  };

  const onArchivo = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file || !validarPdf(file)) return;
    if (!contratoId) { onPickFile(file); return; } // 1.5: retener hasta guardar
    setSubiendo(true);
    try { await api.subirDocumento(contratoId, file); showToast('PDF firmado adjuntado: ' + file.name); await cargarMeta(); }
    catch (err) { showToast(err.message || 'No se pudo subir el PDF'); }
    finally { setSubiendo(false); }
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
        <div className="border-2 border-dashed border-slate-300 rounded-md p-6 bg-white" data-testid="pdf-firmado-precaptura">
          {/* alta-v3: PDF firmado OBLIGATORIO — es el último paso del wizard y gatea el guardado. */}
          <p className="text-sm font-semibold text-slate-800 mb-2">Adjunta el PDF firmado del contrato <span className="text-red-600">*</span> (obligatorio para guardar):</p>
          {pendingFile ? (
            <p className="text-sm text-green-800" data-testid="pdf-firmado-pendiente-file">📎 {pendingFile.name} — se adjuntará al guardar el contrato.{' '}
              <button type="button" className="text-red-600 hover:underline" onClick={() => onPickFile(null)} disabled={soloLectura}>quitar</button>
            </p>
          ) : (
            <>
              <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={onArchivo} disabled={soloLectura} className="block text-sm" data-testid="pdf-firmado-input-precaptura" />
              <p className="text-xs text-amber-700 mt-2" data-testid="pdf-firmado-requerido">Sin el PDF firmado <strong>no se puede registrar</strong> el contrato (se formaliza con la firma). <span className="text-slate-400">[validar el fundamento con el profe]</span></p>
            </>
          )}
          <p className="text-xs text-slate-400 mt-3">PDF firmado por las partes (máx. 10 MB). Se guarda en la base de datos al crear el contrato; una vez ligado es inmutable.</p>
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
          {meta ? (
            <div className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 text-sm text-slate-800">
              El documento firmado es <strong>inmutable</strong>: una vez adjuntado no se reemplaza.
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-300 rounded-md p-8 text-center bg-white">
              <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={onArchivo} disabled={soloLectura || subiendo} className="block mx-auto text-sm" />
              <p className="text-xs text-slate-400 mt-3">PDF firmado por las partes (máx. 10 MB). Se guarda en la base de datos.</p>
              {subiendo && <p className="text-sm text-sigecop-accent mt-2">Subiendo…</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// alta-v2 (2.2): bloque de documentos del contrato (PDF firmado + autorización de anticipo),
// solo Ver/Descargar. Consulta documentoMeta por tipo para saber si cada uno existe.
function DocumentosDetalle({ contratoId }) {
  const { showToast } = useToast();
  const [metas, setMetas] = useState({ contrato: undefined, anticipo_autorizacion: undefined });

  useEffect(() => {
    let vivo = true;
    const pedir = async (tipo) => {
      try { const m = await api.documentoMeta(contratoId, tipo === 'contrato' ? undefined : tipo); return m; }
      catch (_) { return null; }
    };
    (async () => {
      const [c, a] = await Promise.all([pedir('contrato'), pedir('anticipo_autorizacion')]);
      if (vivo) setMetas({ contrato: c, anticipo_autorizacion: a });
    })();
    return () => { vivo = false; };
  }, [contratoId]);

  const verPdf = async (tipo, descargar) => {
    try {
      const tipoQuery = tipo === 'contrato' ? undefined : tipo;
      let nombre = 'documento.pdf';
      if (descargar) { try { const m = await api.documentoMeta(contratoId, tipoQuery); if (m?.nombre) nombre = m.nombre; } catch (_) { /* default */ } }
      const blob = await api.descargarDocumento(contratoId, tipoQuery);
      const url = URL.createObjectURL(blob);
      if (descargar) { const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); }
      else window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { showToast(e.message || 'No se pudo obtener el PDF'); }
  };

  const fila = (tipo, etiqueta) => {
    const m = metas[tipo];
    return (
      <div className="flex items-center justify-between gap-3 border border-slate-200 rounded px-3 py-2" data-testid={`doc-${tipo}`}>
        <div className="min-w-0">
          <div className="font-semibold text-slate-800">{etiqueta}</div>
          <div className="text-xs text-slate-500 truncate">{m === undefined ? 'Consultando…' : m ? `${m.nombre} · ${(Number(m.tamano) / 1024).toFixed(0)} KB` : 'Sin documento'}</div>
        </div>
        {m && (
          <div className="flex gap-3 flex-shrink-0">
            <button type="button" onClick={() => verPdf(tipo, false)} className="text-sm text-sigecop-accent hover:underline">Ver</button>
            <button type="button" onClick={() => verPdf(tipo, true)} className="text-sm text-sigecop-accent hover:underline">Descargar</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {fila('contrato', 'PDF firmado del contrato')}
      {fila('anticipo_autorizacion', 'Autorización del anticipo (PDF)')}
    </div>
  );
}

// alta-v2 (2.1): modal de DETALLE en SOLO LECTURA. Reúne todo lo capturado del contrato
// (detalleContrato: cabecera + conceptos + garantías + jurídicos) y la matriz del programa
// (leerProgramaObra), sin inputs editables. (2.2) muestra/descarga ambos PDFs.
function ModalDetalleContrato({ contratoId, onClose }) {
  const [data, setData] = useState(null);
  const [programa, setPrograma] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setCargando(true); setError(null);
      try {
        const d = await api.detalleContrato(contratoId);
        if (vivo) setData(d);
        try { const p = await api.leerProgramaObra(contratoId); if (vivo) setPrograma(p); } catch (_) { /* contrato sin programa */ }
      } catch (e) { if (vivo) setError(e.message || 'No se pudo cargar el contrato'); }
      finally { if (vivo) setCargando(false); }
    })();
    return () => { vivo = false; };
  }, [contratoId]);

  const jur = data && data.datos_juridicos
    ? (typeof data.datos_juridicos === 'string' ? (() => { try { return JSON.parse(data.datos_juridicos); } catch { return null; } })() : data.datos_juridicos)
    : null;

  const Campo = ({ label, valor }) => (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-slate-800">{valor === '' || valor === null || valor === undefined ? '—' : valor}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={onClose} data-testid="modal-detalle">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 sticky top-0 bg-white rounded-t-lg z-10">
          <h3 className="text-lg font-bold text-sigecop-blue">Información del contrato{data?.folio ? ` · ${data.folio}` : ''}</h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900 text-xl font-bold leading-none" aria-label="Cerrar" data-testid="modal-detalle-cerrar">✕</button>
        </div>
        <div className="px-6 py-5 space-y-6 text-sm">
          <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-600">Vista de <strong>solo lectura</strong> — refleja lo capturado al dar de alta el contrato. No es editable.</div>
          {cargando && <p className="text-slate-500">Cargando…</p>}
          {error && <p className="text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
          {data && (
            <>
              <section>
                <h4 className="font-bold text-sigecop-blue mb-3">Datos generales</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Campo label="Folio" valor={data.folio} />
                  <Campo label="Tipo" valor={data.tipo} />
                  <Campo label="Objeto" valor={data.objeto} />
                  <Campo label="Contratista" valor={data.contratista} />
                  <Campo label="Dependencia" valor={data.dependencia} />
                  <Campo label="Monto del contrato" valor={formatoMXN.format(Number(data.monto) || 0)} />
                  <Campo label="Plazo (días)" valor={data.plazo_dias} />
                  <Campo label="Inicio" valor={fmtFechaES(data.fecha_inicio)} />
                  <Campo label="Término" valor={fmtFechaES(data.fecha_termino)} />
                  <Campo label="Anticipo" valor={data.anticipo_pct != null ? `${data.anticipo_pct}%` : '—'} />
                  <Campo label="Ciclo de estimación" valor={data.ciclo_estimacion || '—'} />
                  <Campo label="Residente" valor={data.residente_nombre} />
                  <Campo label="Superintendente" valor={data.superintendente_nombre} />
                  <Campo label="Supervisión" valor={data.supervision_nombre} />
                </div>
              </section>

              {Array.isArray(data.conceptos) && data.conceptos.length > 0 && (
                <section>
                  <h4 className="font-bold text-sigecop-blue mb-3">Catálogo de conceptos</h4>
                  <div className="overflow-x-auto border border-slate-200 rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-sigecop-blue-light text-sigecop-blue"><tr>
                        <th className="text-left px-3 py-2">Clave</th><th className="text-left px-3 py-2">Concepto</th>
                        <th className="text-left px-3 py-2">Unidad</th><th className="text-right px-3 py-2">Cantidad</th>
                        <th className="text-right px-3 py-2">P.U.</th><th className="text-right px-3 py-2">Importe</th>
                      </tr></thead>
                      <tbody>
                        {data.conceptos.map((c) => (
                          <tr key={c.id} className="border-t border-slate-200">
                            <td className="px-3 py-1 font-mono text-xs">{c.clave || '—'}</td>
                            <td className="px-3 py-1">{c.concepto}</td>
                            <td className="px-3 py-1">{c.unidad}</td>
                            <td className="px-3 py-1 text-right">{c.cantidad}</td>
                            <td className="px-3 py-1 text-right">{formatoMXN.format(Number(c.pu) || 0)}</td>
                            <td className="px-3 py-1 text-right">{formatoMXN.format(round2((Number(c.cantidad) || 0) * (Number(c.pu) || 0)))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {programa && Array.isArray(programa.reconciliacion) && programa.reconciliacion.length > 0 && (
                <section>
                  <h4 className="font-bold text-sigecop-blue mb-3">Programa de obra (resumen por concepto)</h4>
                  <div className="overflow-x-auto border border-slate-200 rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-sigecop-blue-light text-sigecop-blue"><tr>
                        <th className="text-left px-3 py-2">Clave</th><th className="text-left px-3 py-2">Concepto</th>
                        <th className="text-right px-3 py-2">Contratado</th><th className="text-right px-3 py-2">Planeado</th><th className="text-right px-3 py-2">Restante</th>
                      </tr></thead>
                      <tbody>
                        {programa.reconciliacion.map((r) => (
                          <tr key={r.contrato_concepto_id} className="border-t border-slate-200">
                            <td className="px-3 py-1 font-mono text-xs">{r.clave || '—'}</td>
                            <td className="px-3 py-1">{r.concepto}</td>
                            <td className="px-3 py-1 text-right">{r.contratado}</td>
                            <td className="px-3 py-1 text-right">{r.planeado}</td>
                            <td className="px-3 py-1 text-right">{r.restante}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Ciclo: {programa.ciclo || '—'} · {Array.isArray(programa.periodos) ? programa.periodos.length : 0} periodo(s).</p>
                </section>
              )}

              {Array.isArray(data.garantias) && data.garantias.length > 0 && (
                <section>
                  <h4 className="font-bold text-sigecop-blue mb-3">Garantías</h4>
                  <div className="overflow-x-auto border border-slate-200 rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-sigecop-blue-light text-sigecop-blue"><tr>
                        <th className="text-left px-3 py-2">Tipo</th><th className="text-left px-3 py-2">Afianzadora</th>
                        <th className="text-left px-3 py-2">No. póliza</th><th className="text-right px-3 py-2">Monto</th><th className="text-left px-3 py-2">Vigencia</th>
                      </tr></thead>
                      <tbody>
                        {data.garantias.map((g) => (
                          <tr key={g.id} className="border-t border-slate-200">
                            <td className="px-3 py-1">{g.tipo}</td>
                            <td className="px-3 py-1">{g.afianzadora || '—'}</td>
                            <td className="px-3 py-1 font-mono text-xs">{g.poliza || '—'}</td>
                            <td className="px-3 py-1 text-right">{formatoMXN.format(Number(g.monto) || 0)}</td>
                            <td className="px-3 py-1">{fmtFechaES(g.vigencia)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {jur && (jur.firmanteDependencia || jur.representanteLegal || jur.cedulaProfesional || jur.poderNotarial || jur.notaria || jur.cargoFirmante) && (
                <section>
                  <h4 className="font-bold text-sigecop-blue mb-3">Datos jurídicos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Campo label="Firmante de la dependencia" valor={jur.firmanteDependencia} />
                    <Campo label="Cargo del firmante" valor={jur.cargoFirmante} />
                    <Campo label="Representante legal" valor={jur.representanteLegal} />
                    <Campo label="Cédula profesional" valor={jur.cedulaProfesional} />
                    <Campo label="Poder notarial" valor={jur.poderNotarial} />
                    <Campo label="Notaría" valor={jur.notaria} />
                  </div>
                </section>
              )}

              <section>
                <h4 className="font-bold text-sigecop-blue mb-3">Documentos</h4>
                <DocumentosDetalle contratoId={contratoId} />
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TabRegistrados({ contratos, loading, errorMsg, sinSesion, onRecargar, soloLectura }) {
  const { showToast } = useToast();
  const inputRef = useRef(null);
  const [targetId, setTargetId] = useState(null);
  const [subiendoId, setSubiendoId] = useState(null);
  const [detalleId, setDetalleId] = useState(null); // alta-v2 (2.1): contrato abierto en el modal

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
          Inicia sesión para ver los contratos guardados.
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
                <th className="text-left px-3 py-2 w-44">Información</th>
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
                  <td className="px-3 py-2">{fmtFechaES(c.fecha_inicio)}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => setDetalleId(c.id)} className="text-xs text-sigecop-accent hover:underline" data-testid={`ver-info-${c.id}`}>Ver info del contrato</button>
                  </td>
                  <td className="px-3 py-2">
                    {subiendoId === c.id ? (
                      <span className="text-xs text-sigecop-accent">Subiendo…</span>
                    ) : c.tiene_documento ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span title="Tiene PDF firmado">📄</span>
                        <button type="button" onClick={() => verDescargar(c.id, false)} className="text-xs text-sigecop-accent hover:underline">Ver</button>
                        <button type="button" onClick={() => verDescargar(c.id, true)} className="text-xs text-sigecop-accent hover:underline">Descargar</button>
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
      {detalleId && <ModalDetalleContrato contratoId={detalleId} onClose={() => setDetalleId(null)} />}
    </div>
  );
}

// Corrección profe (04-jun): contratista/dependencia ya no se validan como texto aquí (son cuentas:
// superintendenteId y dependenciaId, validados aparte en validarPaso(0)).
const REQ_GENERALES = ['folio', 'tipo', 'objeto', 'plazoDias', 'fechaInicio'];
// 4.1 + alta-v3 (PDF firmado OBLIGATORIO): pasos del WIZARD de creación (captura). El PDF
// firmado (5) es ahora el ÚLTIMO paso del wizard: el botón "Guardar contrato" vive ahí y queda
// GATEADO (deshabilitado hasta adjuntar el PDF firmado; validarPaso(5)). Solo "Registrados" (6)
// queda como pestaña auxiliar de consulta, fuera de la progresión obligatoria.
const PASOS_WIZARD = [0, 1, 2, 3, 4, 5];
const ULTIMO_PASO_WIZARD = 5;
// alta-v5.1: índice de la pestaña auxiliar "Registrados" (lista de contratos guardados, SOLO
// LECTURA). Va justo DESPUÉS del último paso del wizard y queda FUERA del gating lineal de la
// captura: es navegable SIEMPRE (captura vacía, a medias o completa), sin permitir saltarse pasos.
const IDX_REGISTRADOS = ULTIMO_PASO_WIZARD + 1;

export default function AltaContrato() {
  const { showToast } = useToast();
  const { soloLectura } = useVistaHU('HU-01');
  const { token, usuario } = useSesion();
  const sinSesion = !token;

  const ridCounter = useRef(0);
  const nextRid = () => (ridCounter.current += 1);
  // alta-v2 (4.2): el alta arranca SIN conceptos ni garantías (contrato vacío).
  const conceptosIniciales = () => [];
  const garantiasIniciales = () => [];

  const [datosGenerales, setDatosGenerales] = useState(() => ({ ...DATOS_INICIALES }));
  const [datosJuridicos, setDatosJuridicos] = useState(() => ({ ...JURIDICOS_INICIALES }));
  const [anticipoPct, setAnticipoPct] = useState(''); // alta-v2 (4.2): arranca vacío
  const [conceptos, setConceptos] = useState(conceptosIniciales);
  // A2: programa de obra = matriz concepto × periodo. ciclo (mensual/quincenal) define las
  // columnas; celdas[`${rid}:${numero}`] = cantidad planeada del concepto en el periodo.
  const [ciclo, setCiclo] = useState('mensual');
  const [celdas, setCeldas] = useState({});
  const setCelda = (rid, numero, value) => setCeldas((prev) => ({ ...prev, [`${rid}:${numero}`]: value }));
  const [garantias, setGarantias] = useState(garantiasIniciales);

  const periodos = useMemo(
    () => generarPeriodosC(datosGenerales.fechaInicio, datosGenerales.plazoDias, ciclo),
    [datosGenerales.fechaInicio, datosGenerales.plazoDias, ciclo]
  );

  // Equipo del contrato (ligado a cuentas). El residente es el usuario actual.
  // Corrección profe (04-jun): la dependencia también es una CUENTA seleccionada (parte contratante).
  const [superintendenteId, setSuperintendenteId] = useState('');
  const [supervisionId, setSupervisionId] = useState('');
  const [dependenciaId, setDependenciaId] = useState('');
  const [asignablesContratista, setAsignablesContratista] = useState([]);
  const [asignablesSupervision, setAsignablesSupervision] = useState([]);
  const [asignablesDependencia, setAsignablesDependencia] = useState([]);

  const [errores, setErrores] = useState(ERR0);
  const [tabActivo, setTabActivo] = useState(0);
  // alta-v4 (gating estrictamente secuencial): máximo paso del wizard alcanzado legítimamente.
  // Solo avanza vía irAPaso (de a un paso, validando el actual). Es el "high-water mark": NO baja
  // si después se invalida un paso anterior (de eso se encarga `primerPasoInvalido`). La frontera
  // accesible = min(pasoMaxAlcanzado + 1, primerPasoInvalido): así solo se desbloquea la SIGUIENTE
  // pestaña (no todas de golpe) y se re-bloquean las posteriores si se rompe un paso previo.
  const [pasoMaxAlcanzado, setPasoMaxAlcanzado] = useState(0);
  // alta-v5.1: paso de captura desde el que se entró a "Registrados", para poder VOLVER sin perder
  // la captura en progreso. El formulario vive en el padre y sobrevive el cambio de pestaña; este
  // puntero solo recuerda a dónde regresar (no se resetea ni se da por guardada la captura).
  // SEÑAL DETERMINISTA (no depende de `dirty`): null = NO hay sesión de captura activa (formulario
  // limpio / recién guardado) → en Registrados se ofrece «+ Capturar nuevo contrato»; un número
  // (0..ULTIMO) = se entró a Registrados desde una captura activa → se ofrece «← Volver a la captura».
  const [pasoPrevioCaptura, setPasoPrevioCaptura] = useState(null);
  // alta-v2 (1.3): mensaje de error del wizard PERSISTENTE — el usuario lo cierra con la ✕;
  // NO se auto-descarta como el Toast (que dura 3 s). Se limpia al cerrar, al avanzar bien,
  // al guardar o al cancelar.
  const [errorWizard, setErrorWizard] = useState(null);
  // alta-v2 (1.5/1.6): PDFs SELECCIONADOS DURANTE la captura (antes de guardar). Se retienen
  // en el padre (sobreviven al cambio de pestaña) y se suben automáticamente tras crear el
  // contrato (el documento se liga a un contrato existente: BYTEA + FK, así que la persistencia
  // ocurre al guardar, pero el usuario puede adjuntar sin haber guardado primero).
  const [pdfFirmadoFile, setPdfFirmadoFile] = useState(null);
  const [pdfAnticipoFile, setPdfAnticipoFile] = useState(null);

  const setDatosGen = (k) => (e) => setDatosGenerales((prev) => ({ ...prev, [k]: e.target.value }));
  const setDatosJur = (k) => (e) => setDatosJuridicos((prev) => ({ ...prev, [k]: e.target.value }));

  const mkCell = (setter) => (i, key) => (e) => setter((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: e.target.value } : r)));
  const mkAdd = (setter, vacio) => () => setter((prev) => [...prev, { ...vacio, rid: nextRid() }]);
  const mkRemove = (setter) => (i) => setter((prev) => prev.filter((_, idx) => idx !== i));
  const mkPatch = (setter) => (i, patch) => setter((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  // --- Captura del catálogo con cuadre EXACTO (A1.3) ---
  // pu es el dato canónico; importe = ROUND(cantidad×pu, 2). Teclear el importe back-solea pu
  // a 4 decimales y el importe "snapea" al valor real (en blur). El monto del contrato se
  // DERIVA = Σ importes (lo deriva también el backend; no se captura ni se envía en el payload).
  const setConcepto = (i, patch) => setConceptos((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const onConceptoCantidad = (i) => (e) => { const cantidad = e.target.value; setConceptos((prev) => prev.map((r, idx) => (idx === i ? { ...r, cantidad, importe: importeDe(cantidad, r.pu) } : r))); };
  const onConceptoPu = (i) => (e) => { const pu = e.target.value; setConceptos((prev) => prev.map((r, idx) => (idx === i ? { ...r, pu, importe: importeDe(r.cantidad, pu) } : r))); };
  const onConceptoImporte = (i) => (e) => setConcepto(i, { importe: e.target.value }); // crudo mientras se teclea
  const onConceptoImporteBlur = (i) => () => setConceptos((prev) => prev.map((r, idx) => {
    if (idx !== i || r.importe === '' || r.importe == null) return r;
    const cant = Number(r.cantidad), imp = Number(r.importe);
    if (!(cant > 0) || !(imp >= 0)) return r;
    const pu = round4(imp / cant);
    return { ...r, pu: String(pu), importe: importeDe(r.cantidad, pu) }; // snapea al importe real resultante
  }));
  const montoDerivado = round2(conceptos.reduce((s, c) => s + (Number(importeDe(c.cantidad, c.pu)) || 0), 0));

  useEffect(() => { setErrores(ERR0); }, [datosGenerales, datosJuridicos, anticipoPct, conceptos, celdas, ciclo, garantias, superintendenteId, supervisionId, dependenciaId]);

  // Cuentas asignables al equipo (solo el residente puede consultarlas; si el rol
  // no es residente la API responde 403 y dejamos las listas vacías).
  useEffect(() => {
    if (sinSesion) return;
    api.listarAsignables('contratista').then((l) => setAsignablesContratista(Array.isArray(l) ? l : [])).catch(() => setAsignablesContratista([]));
    api.listarAsignables('supervision').then((l) => setAsignablesSupervision(Array.isArray(l) ? l : [])).catch(() => setAsignablesSupervision([]));
    api.listarAsignables('dependencia').then((l) => setAsignablesDependencia(Array.isArray(l) ? l : [])).catch(() => setAsignablesDependencia([]));
  }, [sinSesion]);

  const [contratos, setContratos] = useState([]);
  const [loadingLista, setLoadingLista] = useState(false);
  const [errorLista, setErrorLista] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [contratoGuardadoId, setContratoGuardadoId] = useState(null);
  // 4.1: "sucio" = el usuario tocó el formulario y aún no guardó (para el aviso de salir).
  const [dirty, setDirty] = useState(false);
  const montadoRef = useRef(false);

  const cargarContratos = useCallback(async () => {
    if (sinSesion) return;
    setLoadingLista(true); setErrorLista(null);
    try { const lista = await api.listarContratos(); setContratos(Array.isArray(lista) ? lista : []); }
    catch (err) { setErrorLista('No se pudieron cargar los contratos'); }
    finally { setLoadingLista(false); }
  }, [sinSesion]);

  useEffect(() => { cargarContratos(); }, [cargarContratos]);

  // 4.1: marca el formulario como "sucio" en el primer cambio real (no en el montaje).
  // (Va DESPUÉS de declarar dirty/montadoRef/contratoGuardadoId: sus dependencias se
  // evalúan en orden de código, así que referenciarlas antes daría TDZ.)
  useEffect(() => {
    if (!montadoRef.current) { montadoRef.current = true; return; }
    setDirty(true);
  }, [datosGenerales, datosJuridicos, anticipoPct, conceptos, celdas, ciclo, garantias, superintendenteId, supervisionId, dependenciaId]);

  // 4.1: aviso del navegador "¿seguro de salir?" ante recarga/cierre con cambios sin guardar.
  // (Persistencia del borrador ante recarga = NO implementada — opcional; ver doc.)
  useEffect(() => {
    const handler = (e) => { if (dirty && !contratoGuardadoId) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, contratoGuardadoId]);

  // 4.1/4.2: validación POR PASO (en la vista). Cada paso del wizard se valida antes de
  // avanzar; `validar()` (abajo) corre todos los pasos para el guardado final. Devuelve
  // { ok } o { ok:false, msg, errores }. Pasos: 0 generales · 1 catálogo · 2 programa ·
  // 3 jurídicos · 4 garantías/anticipo.
  const validarPaso = (idx) => {
    if (idx === 0) {
      const faltan = REQ_GENERALES.filter((k) => String(datosGenerales[k] ?? '').trim() === '');
      if (faltan.length) {
        const campos = {}; faltan.forEach((k) => { campos[k] = true; });
        return { ok: false, msg: `Faltan campos: ${faltan.join(', ')}`, errores: { ...ERR0, campos } };
      }
      if (!(Number.isInteger(Number(datosGenerales.plazoDias)) && Number(datosGenerales.plazoDias) > 0)) return { ok: false, msg: 'El plazo debe ser un entero mayor a 0', errores: { ...ERR0, campos: { plazoDias: true } } };
      if (!superintendenteId) return { ok: false, msg: 'Asigna el contratista (superintendente de obra) del contrato', errores: { ...ERR0, campos: { superintendente: true } } };
      // Corrección profe (04-jun): la dependencia es una cuenta seleccionada (parte contratante).
      if (!dependenciaId) return { ok: false, msg: 'Selecciona la dependencia (cuenta contratante registrada)', errores: { ...ERR0, campos: { dependencia: true } } };
      return { ok: true };
    }
    if (idx === 1) {
      // El monto se DERIVA del catálogo → se exige al menos un concepto.
      if (conceptos.length === 0) return { ok: false, msg: 'Captura al menos un concepto: el monto del contrato se deriva del catálogo.', errores: { ...ERR0, catalogoMonto: true } };
      const claves = new Set();
      for (let i = 0; i < conceptos.length; i++) {
        const c = conceptos[i];
        const cant = Number(c.cantidad); const pu = Number(c.pu);
        const clave = String(c.clave || '').trim();
        if (!clave) return { ok: false, msg: `Concepto #${i + 1}: la clave es obligatoria (la defines tú).`, errores: { ...ERR0, conceptoIdx: i } };
        if (clave.length > 40) return { ok: false, msg: `Concepto #${i + 1}: la clave excede 40 caracteres.`, errores: { ...ERR0, conceptoIdx: i } };
        if (claves.has(clave)) return { ok: false, msg: `Concepto #${i + 1}: la clave "${clave}" está repetida; cada clave debe ser única.`, errores: { ...ERR0, conceptoIdx: i } };
        claves.add(clave);
        if (!String(c.concepto).trim() || !String(c.unidad).trim() || c.cantidad === '' || c.pu === '' || !(cant > 0) || !(pu > 0)) {
          return { ok: false, msg: `Concepto #${i + 1}: concepto, unidad y cantidad/P.U. mayores a 0`, errores: { ...ERR0, conceptoIdx: i } };
        }
        // 4.2: topes de las columnas NUMERIC (evita el 22003 crudo al guardar; di DÓNDE).
        if (cant >= MAX_CANTIDAD) return { ok: false, msg: `Concepto #${i + 1}: la cantidad es demasiado grande (máx. ${MAX_CANTIDAD.toLocaleString('es-MX')}).`, errores: { ...ERR0, conceptoIdx: i } };
        if (pu >= MAX_PU) return { ok: false, msg: `Concepto #${i + 1}: el precio unitario es demasiado grande (máx. ${MAX_PU.toLocaleString('es-MX')}).`, errores: { ...ERR0, conceptoIdx: i } };
      }
      // 4.2: el monto derivado no puede exceder la capacidad de la columna.
      if (montoDerivado >= MAX_MONTO) return { ok: false, msg: `El monto del contrato (${formatoMXN.format(montoDerivado)}) excede el máximo permitido. Revisa cantidades y precios unitarios.`, errores: { ...ERR0, catalogoMonto: true } };
      return { ok: true };
    }
    if (idx === 2) {
      // alta-v2 (punto 3): REGLA DEL 100%. El programa = matriz concepto × periodo debe
      // distribuir Σ planeado = contratado por CADA concepto (± tolerancia de redondeo).
      // Fundamento: RLOPSRM art. 45 ap. A fr. X (programa conforme al catálogo, del total de
      // los conceptos) + LOPSRM art. 52 (base para medir el avance). Sin negativos. El backend
      // (guardarMatriz, C7) revalida el cuadre en SQL. (Antes: parcial permitido, solo exceso.)
      if (Object.values(celdas).some((v) => v !== '' && Number(v) < 0)) {
        return { ok: false, msg: 'El programa de obra no admite cantidades negativas.', errores: { ...ERR0, programaError: true } };
      }
      if (conceptos.length === 0) {
        return { ok: false, msg: 'Captura primero el catálogo de conceptos: el programa los reparte en los periodos.', errores: { ...ERR0, programaError: true } };
      }
      if (periodos.length === 0) {
        return { ok: false, msg: 'Define la fecha de inicio, el plazo y el ciclo para generar los periodos del programa.', errores: { ...ERR0, programaError: true } };
      }
      for (let i = 0; i < conceptos.length; i++) {
        const c = conceptos[i];
        const contratado = round3(Number(c.cantidad) || 0);
        const planeado = round3(periodos.reduce((s, p) => s + (Number(celdas[`${c.rid}:${p.numero}`]) || 0), 0));
        const restante = round3(contratado - planeado);
        if (Math.abs(restante) > TOL_PROGRAMA) {
          const detalle = restante > 0 ? `faltan ${restante}` : `sobran ${round3(-restante)}`;
          return { ok: false, msg: `Programa: el concepto "${c.clave || c.concepto}" debe sumar el 100% (planeado ${planeado} vs contratado ${contratado}; ${detalle}). RLOPSRM art. 45-A-X + LOPSRM art. 52.`, errores: { ...ERR0, programaError: true } };
        }
      }
      return { ok: true };
    }
    if (idx === 3) {
      // alta-v5: datos jurídicos OBLIGATORIOS (mínimo de formalización). Antes era opcional
      // (`{ ok: true }`). Fundamento por campo en REQ_JURIDICOS/ETIQUETA_JURIDICO (arriba):
      // art. 46 fr. I y IV LOPSRM; RLOPSRM art. 61; cédula profesional [validar].
      const faltan = REQ_JURIDICOS.filter((k) => String(datosJuridicos[k] ?? '').trim() === '');
      if (faltan.length) {
        const campos = {}; faltan.forEach((k) => { campos[k] = true; });
        return { ok: false, msg: `Datos jurídicos: completa ${faltan.map((k) => ETIQUETA_JURIDICO[k]).join(', ')} (obligatorios para formalizar — art. 46 fr. I y IV LOPSRM).`, errores: { ...ERR0, campos } };
      }
      return { ok: true };
    }
    if (idx === 4) {
      const a = Number(anticipoPct) || 0; // anticipo vacío = 0 = sin anticipo
      if (anticipoPct !== '' && anticipoPct !== null) {
        if (!(a >= 0 && a <= 100)) return { ok: false, msg: 'El % de anticipo debe estar entre 0 y 100', errores: { ...ERR0, campos: { anticipoPct: true } } };
        // alta-v4 (BUG REPORTADO / D-5 resuelta): anticipo > umbral ⇒ el PDF de autorización del
        // anticipo es OBLIGATORIO. Bloquea el AVANCE del paso Y el GUARDADO (mismo candado que el
        // PDF firmado, vía validar()). pdfAnticipoFile = adjuntado en captura; contratoGuardadoId =
        // ya-guardado (se subió al guardar). Fundamento del umbral [validar] con el profe.
        if (a > ANTICIPO_UMBRAL_PDF && !pdfAnticipoFile && !contratoGuardadoId) {
          return { ok: false, msg: `Anticipo ${a}% supera el ${ANTICIPO_UMBRAL_PDF}%: adjunta el PDF de autorización del anticipo (obligatorio para avanzar y guardar).`, errores: { ...ERR0, anticipoPdfFalta: true } };
        }
      }
      // alta-v5: validez por póliza capturada (campos requeridos) + sin tipos duplicados (la BD tiene
      // UNIQUE(contrato_id, tipo)). Una fila TOTALMENTE vacía se ignora aquí; la obligatoriedad de
      // cumplimiento/anticipo se exige más abajo.
      const tiposVistos = new Set();
      for (let i = 0; i < garantias.length; i++) {
        const g = garantias[i];
        if (garantiaVacia(g)) continue;
        if (!String(g.tipo).trim()) return { ok: false, msg: `Garantía #${i + 1}: selecciona el tipo de póliza.`, errores: { ...ERR0, garantiaIdx: i } };
        if (tiposVistos.has(g.tipo)) return { ok: false, msg: `Garantía #${i + 1}: ya hay una póliza de tipo "${g.tipo}"; cada tipo se captura una sola vez.`, errores: { ...ERR0, garantiaIdx: i } };
        tiposVistos.add(g.tipo);
        if (!String(g.afianzadora).trim()) return { ok: false, msg: `Garantía #${i + 1} (${g.tipo}): la afianzadora es obligatoria.`, errores: { ...ERR0, garantiaIdx: i } };
        if (!String(g.poliza).trim()) return { ok: false, msg: `Garantía #${i + 1} (${g.tipo}): el número de póliza es obligatorio.`, errores: { ...ERR0, garantiaIdx: i } };
        if (!(Number(g.monto) > 0)) return { ok: false, msg: `Garantía #${i + 1} (${g.tipo}): indica un monto mayor a 0.`, errores: { ...ERR0, garantiaIdx: i } };
        if (!String(g.vigencia).trim()) return { ok: false, msg: `Garantía #${i + 1} (${g.tipo}): la vigencia es obligatoria.`, errores: { ...ERR0, garantiaIdx: i } };
        // alta-v2 (1.4): una garantía no puede exceder el monto del contrato (la vista la marca
        // EN VIVO; aquí se bloquea el avance; el backend la revalida).
        if (Number(g.monto) > montoDerivado) return { ok: false, msg: `Garantía #${i + 1}: el monto (${formatoMXN.format(Number(g.monto))}) no puede exceder el monto del contrato (${formatoMXN.format(montoDerivado)}).`, errores: { ...ERR0, garantiaIdx: i } };
      }
      // alta-v5: fianzas OBLIGATORIAS por ley. CUMPLIMIENTO siempre (art. 47: "No podrá formalizarse
      // contrato alguno que no se encuentre garantizado de acuerdo con lo dispuesto en la fracción II
      // del artículo 48"; art. 48 fr. II). ANTICIPO solo si %anticipo>0 (art. 48 fr. I: garantizar
      // "los anticipos que reciban... por la totalidad del monto de los anticipos").
      const tieneCumplimiento = garantias.some((g) => g.tipo === TIPO_CUMPLIMIENTO && polizaCompleta(g) && Number(g.monto) <= montoDerivado);
      if (!tieneCumplimiento) {
        return { ok: false, msg: 'Falta la fianza de CUMPLIMIENTO (obligatoria para formalizar — art. 47 + art. 48 fr. II LOPSRM). Agrega la póliza de cumplimiento con todos sus datos.', errores: { ...ERR0, garantiasFaltan: true } };
      }
      if (a > 0) {
        const tieneAnticipo = garantias.some((g) => g.tipo === TIPO_ANTICIPO && polizaCompleta(g) && Number(g.monto) <= montoDerivado);
        if (!tieneAnticipo) {
          return { ok: false, msg: `Con anticipo ${a}% (> 0), la fianza de ANTICIPO es obligatoria (art. 48 fr. I LOPSRM). Agrega la póliza de anticipo con todos sus datos.`, errores: { ...ERR0, garantiasFaltan: true } };
        }
      }
      return { ok: true };
    }
    if (idx === 5) {
      // alta-v3: el PDF firmado es OBLIGATORIO para registrar el contrato. Debe estar
      // adjuntado (retenido durante la captura, 1.5) ANTES de guardar; el botón "Guardar"
      // también queda deshabilitado sin él (doble gateo: vista + validación). [validar] — el
      // fundamento (el contrato se formaliza/existe una vez firmado) lo CONFIRMA el profe;
      // NO se asume número de artículo. `contratoGuardadoId` cubre el caso ya-guardado.
      if (!pdfFirmadoFile && !contratoGuardadoId) {
        return { ok: false, msg: 'El PDF firmado del contrato es obligatorio: adjúntalo en el último paso para poder guardar.', errores: { ...ERR0, pdfFirmadoFalta: true } };
      }
      return { ok: true };
    }
    return { ok: true };
  };

  // Validación completa para el guardado final: corre todos los pasos del wizard.
  const validar = () => {
    for (const p of PASOS_WIZARD) {
      const v = validarPaso(p);
      if (!v.ok) return { tab: p, msg: v.msg, errores: v.errores };
    }
    return null;
  };

  // alta-v4 (gating ESTRICTAMENTE SECUENCIAL — fix de raíz): navegación del wizard.
  //  · Registrados (target > ULTIMO): pestaña auxiliar de consulta → libre.
  //  · Atrás (target <= tabActivo): libre, para corregir pasos previos.
  //  · Adelante: SOLO de a un paso sobre el máximo alcanzado (destino = min(target, max+1)) y
  //    validando el prefijo [tabActivo, destino). El primer paso inválido detiene el avance y
  //    muestra su error. Así una pestaña desbloquea ÚNICAMENTE la siguiente (no todas de golpe),
  //    no se salta a una no alcanzada, y los pasos opcionales (jurídicos/garantías vacíos) ya no
  //    abren el resto en cascada. Los errores van al banner PERSISTENTE (1.3).
  const irAPaso = (target) => {
    if (target > ULTIMO_PASO_WIZARD) { setTabActivo(target); return; } // auxiliar (Registrados)
    if (target <= tabActivo) { setTabActivo(target); return; }          // atrás libre
    // DEFENSA EXPLÍCITA (fix de raíz): NUNCA avanzar si el paso ACTUAL no es válido. El loop de
    // prefijo de abajo ya lo hacía cuando `pasoMaxAlcanzado >= tabActivo`; pero si por algún flujo
    // queda `tabActivo > pasoMaxAlcanzado` (p.ej. tras guardar, que hace setTabActivo(Registrados)
    // con pasoMaxAlcanzado=0), `destino` podría ser ≤ tabActivo y dejar el loop VACÍO → avanzaría
    // sin validar. Validar el paso actual de entrada cierra ese hueco sin importar el estado.
    const vActual = validarPaso(tabActivo);
    if (!vActual.ok) { setErrores(vActual.errores); setTabActivo(tabActivo); setErrorWizard(vActual.msg); return; }
    const destino = Math.min(target, pasoMaxAlcanzado + 1);             // solo un paso nuevo
    for (let p = tabActivo; p < destino; p++) {
      const v = validarPaso(p);
      if (!v.ok) { setErrores(v.errores); setTabActivo(p); setErrorWizard(v.msg); return; }
    }
    setErrores(ERR0);
    setErrorWizard(null);
    setTabActivo(destino);
    setPasoMaxAlcanzado((m) => Math.max(m, destino));
  };

  const handleGuardar = async () => {
    if (guardando || soloLectura) return;
    const v = validar();
    if (v) { setErrores(v.errores); setTabActivo(v.tab); setErrorWizard(v.msg); return; }
    // 4.1: confirmación explícita antes de guardar (último paso del wizard).
    if (!window.confirm('¿Seguro de guardar el contrato?')) return;
    setErrores(ERR0);
    setErrorWizard(null);
    setGuardando(true);
    try {
      const payload = {
        folio: datosGenerales.folio,
        tipo: datosGenerales.tipo,
        objeto: datosGenerales.objeto,
        // Corrección profe (04-jun): contratista/dependencia ya no van como texto; el backend deriva
        // el texto del nombre de la cuenta (contratista = superintendente; dependencia = dependenciaId).
        plazoDias: Number(datosGenerales.plazoDias),
        fechaInicio: datosGenerales.fechaInicio,
        // Etapa C: % de pena por atraso (opcional, fracción 0–1). Vacío → null (sin pena).
        penaConvencionalPct: datosGenerales.penaConvencionalPct === '' || datosGenerales.penaConvencionalPct == null
          ? null : Number(datosGenerales.penaConvencionalPct),
        superintendenteId: Number(superintendenteId),
        supervisionId: supervisionId ? Number(supervisionId) : null,
        dependenciaId: dependenciaId ? Number(dependenciaId) : null,
        anticipoPct: anticipoPct === '' || anticipoPct === null ? null : Number(anticipoPct),
        juridicos: datosJuridicos,
        // monto NO se envía: el backend lo deriva = Σ ROUND(cantidad×pu,2). clave por concepto.
        conceptos: conceptos.map((c) => ({ clave: String(c.clave || '').trim(), concepto: c.concepto, unidad: c.unidad, cantidad: c.cantidad, pu: c.pu })),
        // A2: ciclo + programa de obra (matriz). Solo celdas con cantidad > 0; el backend
        // genera los periodos y valida Σ ≤ contratado (art. 118).
        ciclo,
        programa: conceptos.flatMap((c) => periodos.map((p) => {
          const v = celdas[`${c.rid}:${p.numero}`];
          return (v !== undefined && v !== '' && Number(v) > 0)
            ? { clave: String(c.clave || '').trim(), periodoNumero: p.numero, cantidad: Number(v) }
            : null;
        }).filter(Boolean)),
        // alta-v5: defensa-en-profundidad: solo se persisten pólizas COMPLETAS (polizaCompleta). El
        // guardado ya pasó por validar() (todos los pasos), que exige cumplimiento/anticipo completos;
        // este filtro hace explícito en el borde de persistencia que nunca se manda una póliza a medias.
        garantias: garantias.filter((g) => polizaCompleta(g)).map((g) => ({ tipo: g.tipo, afianzadora: g.afianzadora, poliza: g.poliza, monto: g.monto, vigencia: g.vigencia }))
      };
      const creado = await api.crearContrato(payload);
      const nuevoId = creado && creado.id ? creado.id : null;
      setDirty(false); // ya guardado, no avisar al salir (los PDFs se suben con nuevoId, abajo)
      // alta-v2 (1.5/1.6): sube los PDFs que el usuario adjuntó DURANTE la captura. El contrato
      // ya existe → ahora se ligan (BYTEA + FK). Si alguno falla, el contrato igual quedó guardado.
      if (nuevoId && pdfFirmadoFile) {
        try { await api.subirDocumento(nuevoId, pdfFirmadoFile); setPdfFirmadoFile(null); }
        catch (e) { showToast('Contrato guardado, pero el PDF firmado no se adjuntó: ' + (e.message || 'error')); }
      }
      if (nuevoId && pdfAnticipoFile) {
        try { await api.subirDocumento(nuevoId, pdfAnticipoFile, 'anticipo_autorizacion'); setPdfAnticipoFile(null); }
        catch (e) { showToast('Contrato guardado, pero la autorización del anticipo no se adjuntó: ' + (e.message || 'error')); }
      }
      setErrorWizard(null);
      // BUG 1: alta exitosa → limpia TODOS los campos (alta nueva vacía + pestañas re-bloqueadas)
      // y REDIRIGE a "Registrados". Ya no hay estado de éxito con "Ver registrados →".
      resetFormulario();
      setTabActivo(IDX_REGISTRADOS); // pestaña "Registrados"
      await cargarContratos();
      showToast('Contrato guardado: ' + payload.folio + '. Disponible en Registrados.');
    } catch (err) {
      // alta-v2 (1.3): los errores del guardado también van al banner PERSISTENTE.
      if (err.status === 409) { setErrores({ ...ERR0, campos: { folio: true } }); setTabActivo(0); setErrorWizard('El folio ya existe; usa uno distinto.'); }
      else if (err.status === 400) {
        const f = err.payload?.faltantes;
        if (f && f.length) { const campos = {}; f.forEach((k) => { campos[k] = true; }); setErrores({ ...ERR0, campos }); setTabActivo(0); setErrorWizard(`Faltan campos: ${f.join(', ')}`); }
        else { setErrorWizard(err.message || 'Revisa los datos del formulario'); }
      }
      else if (err.status === 403) setErrorWizard('Solo el residente puede crear contratos.');
      else if (err.status === 401) setErrorWizard('Tu sesión expiró. Vuelve a iniciar sesión.');
      else setErrorWizard('No se pudo guardar el contrato.');
    } finally { setGuardando(false); }
  };

  // BUG 1: deja el wizard como un alta NUEVA — todos los campos vacíos, sin PDFs, errores
  // limpios y el gating re-bloqueado (pasoMaxAlcanzado=0 → solo el paso 1 accesible). Lo usan
  // "Cancelar" y el guardado exitoso. NO fija tabActivo (cada caller decide a dónde ir).
  const resetFormulario = () => {
    setDatosGenerales({ ...DATOS_INICIALES });
    setDatosJuridicos({ ...JURIDICOS_INICIALES });
    setAnticipoPct('');
    setSuperintendenteId('');
    setSupervisionId('');
    setDependenciaId('');
    setConceptos(conceptosIniciales());
    setCiclo('mensual');
    setCeldas({});
    setGarantias(garantiasIniciales());
    setErrores(ERR0);
    setErrorWizard(null);
    setPdfFirmadoFile(null);
    setPdfAnticipoFile(null);
    setPasoMaxAlcanzado(0); // re-bloquea: vuelve al paso 1
    setPasoPrevioCaptura(null); // alta-v5.1: ya no hay sesión de captura activa (Registrados → "nuevo")
    setContratoGuardadoId(null);
    setDirty(false);
    montadoRef.current = false; // re-armar el detector de "sucio"
  };

  const handleCancelar = () => {
    if (soloLectura) return;
    if (!window.confirm('¿Descartar los cambios y reiniciar el formulario?')) return;
    resetFormulario();
    setTabActivo(0);
  };

  const tabsConError = useMemo(() => {
    const s = new Set();
    const c = errores.campos || {};
    if (REQ_GENERALES.some((k) => c[k]) || c.superintendente || c.dependencia) s.add(0);
    if (errores.conceptoIdx != null || errores.catalogoMonto) s.add(1);
    if (errores.programaError) s.add(2);
    if (REQ_JURIDICOS.some((k) => c[k])) s.add(3); // alta-v5: jurídicos obligatorios
    if (c.anticipoPct || errores.garantiaIdx != null || errores.anticipoPdfFalta || errores.garantiasFaltan) s.add(4); // alta-v4: +PDF anticipo; alta-v5: +fianzas obligatorias
    if (errores.pdfFirmadoFalta) s.add(5); // alta-v3: PDF firmado obligatorio (último paso)
    return s;
  }, [errores]);

  // alta-v5 (RAÍZ del nuevo modelo de navegación): se ELIMINA el "desbloqueo progresivo clicable"
  // (la fuente repetida de fugas de gating). Durante la captura, los NOMBRES de las pestañas NO
  // navegan: solo se avanza/retrocede con «Siguiente» (que valida el paso actual) y «Atrás». Los
  // nombres se vuelven clicables SOLO cuando la captura está COMPLETA y válida: todos los pasos
  // válidos (primerPasoInvalido > ULTIMO) Y el PDF firmado cargado; en ese estado, saltar/revisar
  // es libre y seguro (no hay nada que gatear). Esto elimina de raíz la clase de bugs de saltar
  // pestañas. Se CONSERVA irAPaso (Siguiente/Atrás + hardening) y el reset+redirect al guardar.
  //  · primerPasoInvalido: primer paso del wizard que NO valida (o ULTIMO+1 si todos validan) —
  //    sigue alimentando el botón Guardar (validez global) y ahora también capturaCompleta.
  const primerPasoInvalido = (() => {
    for (const p of PASOS_WIZARD) { if (!validarPaso(p).ok) return p; }
    return ULTIMO_PASO_WIZARD + 1;
  })();
  // Captura completa = TODOS los pasos válidos (incluye jurídicos obligatorios=paso 3, garantías
  // obligatorias=paso 4 y PDF firmado=paso 5) Y PDF firmado presente (adjuntado o ya-guardado).
  // (validarPaso(5) ya exige el PDF; el segundo conjunto lo hace EXPLÍCITO e inmune a cambios futuros.)
  const capturaCompleta = (primerPasoInvalido > ULTIMO_PASO_WIZARD) && (!!pdfFirmadoFile || !!contratoGuardadoId);
  // tabsBloqueados: durante la captura, todos los PASOS DE CAPTURA salvo el activo quedan
  // deshabilitados (los nombres no navegan); con la captura completa, ninguno (salto/revisión libre).
  // alta-v5.1: "Registrados" (IDX_REGISTRADOS) NUNCA se bloquea — es la lista de guardados en solo
  // lectura, navegable siempre; por eso el bucle llega solo hasta ULTIMO_PASO_WIZARD (excluye Registrados).
  const tabsBloqueados = (() => {
    const s = new Set();
    if (capturaCompleta) return s;
    for (let i = 0; i <= ULTIMO_PASO_WIZARD; i++) { if (i !== tabActivo) s.add(i); }
    return s;
  })();
  // Click en el NOMBRE de una pestaña.
  //  · "Registrados" (IDX_REGISTRADOS): SIEMPRE navega (lista de guardados en solo lectura), aun
  //    durante la captura. NO se pierde la captura en progreso (el formulario vive en el padre y
  //    sobrevive el cambio de pestaña); se recuerda el paso para volver con «← Volver a la captura».
  //    Solo lleva a la lista: NO entra a ningún paso de captura ni permite saltarse el orden.
  //  · Pasos de CAPTURA (0..ULTIMO): NO navegan durante la captura (gating lineal intacto: solo
  //    «Siguiente»/«Atrás»); con la captura completa, salto/revisión libre por nombre.
  const clicNombrePestaña = (target) => {
    if (target === IDX_REGISTRADOS) {
      if (tabActivo <= ULTIMO_PASO_WIZARD) setPasoPrevioCaptura(tabActivo);
      setErrores(ERR0);
      setErrorWizard(null);
      setTabActivo(IDX_REGISTRADOS);
      return;
    }
    if (!capturaCompleta) return; // pasos de captura: gating lineal (solo Siguiente/Atrás)
    setErrores(ERR0);
    setErrorWizard(null);
    setTabActivo(target);
  };

  const wrapTab = (node) => (<RegionEditable disabled={soloLectura}>{node}</RegionEditable>);

  const tabs = [
    { label: 'Datos generales', content: wrapTab(<TabDatosGenerales datos={datosGenerales} set={setDatosGen} err={errores.campos} montoDerivado={montoDerivado} equipo={{
      usuarioNombre: usuario?.nombre,
      asignablesContratista, asignablesSupervision, asignablesDependencia,
      superintendenteId, setSuperintendenteId, supervisionId, setSupervisionId,
      dependenciaId, setDependenciaId,
      errSuperintendente: errores.campos?.superintendente,
      errDependencia: errores.campos?.dependencia
    }} />) },
    { label: 'Catálogo de conceptos', content: wrapTab(
      <TabCatalogo rows={conceptos} onCell={mkCell(setConceptos)} onPatch={mkPatch(setConceptos)}
        onCantidad={onConceptoCantidad} onPu={onConceptoPu} onImporte={onConceptoImporte} onImporteBlur={onConceptoImporteBlur}
        onAdd={mkAdd(setConceptos, { clave: '', concepto: '', unidad: '', cantidad: '', pu: '', importe: '' })}
        onRemove={mkRemove(setConceptos)} soloLectura={soloLectura} errIdx={errores.conceptoIdx} montoDerivado={montoDerivado} />
    ) },
    { label: 'Programa de obra', content: wrapTab(
      <TabProgramaMatriz conceptos={conceptos} periodos={periodos} ciclo={ciclo} setCiclo={setCiclo} celdas={celdas} setCelda={setCelda} soloLectura={soloLectura} />
    ) },
    { label: 'Datos jurídicos', content: wrapTab(<TabJuridicos datos={datosJuridicos} set={setDatosJur} err={errores.campos} />) },
    { label: 'Garantías, penalizaciones y amortización', content: wrapTab(
      <TabGarantias rows={garantias} onCell={mkCell(setGarantias)} onAdd={mkAdd(setGarantias, { tipo: '', afianzadora: '', poliza: '', monto: '', vigencia: '' })} onRemove={mkRemove(setGarantias)} anticipoPct={anticipoPct} setAnticipoPct={setAnticipoPct} soloLectura={soloLectura} errIdx={errores.garantiaIdx} errAnticipo={errores.campos.anticipoPct} contratoId={contratoGuardadoId} montoContrato={montoDerivado} pdfAnticipoFile={pdfAnticipoFile} setPdfAnticipoFile={setPdfAnticipoFile} />
    ) },
    { label: 'PDF firmado', content: wrapTab(<TabPdfFirmado contratoId={contratoGuardadoId} soloLectura={soloLectura} pendingFile={pdfFirmadoFile} onPickFile={setPdfFirmadoFile} />) },
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

      {/* alta-v5: onTabChange = clicNombrePestaña (los nombres solo navegan con la captura completa).
          «Siguiente»/«Atrás» siguen llamando a irAPaso (validador) directamente, abajo. */}
      <Tabs tabs={tabs} active={tabActivo} onTabChange={clicNombrePestaña} tabsConError={tabsConError} tabsBloqueados={tabsBloqueados}
        tituloBloqueado="Durante la captura navega con «Siguiente» y «Atrás»; los nombres se habilitan al completar todo (incluido el PDF firmado)." />

      {/* alta-v2 (1.3): banner de error del wizard PERSISTENTE — no se auto-descarta; el usuario
          lo cierra con la ✕. Reemplaza al Toast efímero para los errores de validación/guardado. */}
      {errorWizard && (
        <div role="alert" data-testid="error-wizard" className="mt-4 flex items-start gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="flex-1">{errorWizard}</span>
          <button type="button" onClick={() => setErrorWizard(null)} className="text-red-600 hover:text-red-900 font-bold leading-none" aria-label="Cerrar mensaje de error" data-testid="error-wizard-cerrar">✕</button>
        </div>
      )}

      {/* 4.1 + alta-v3: barra del wizard. "Siguiente" por paso (gateado en la vista) en los pasos
          1–5; "Guardar contrato" SOLO en el último paso (6 · PDF firmado) y DESHABILITADO hasta
          adjuntar el PDF firmado (obligatorio). Tras guardar → consulta en "Registrados". */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" onClick={handleCancelar} disabled={soloLectura} className="px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-40">Cancelar</button>
        <div className="flex items-center gap-3">
          {tabActivo > 0 && tabActivo <= ULTIMO_PASO_WIZARD && (
            <button type="button" onClick={() => irAPaso(tabActivo - 1)} disabled={soloLectura} className="px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-40" data-testid="btn-atras">← Atrás</button>
          )}
          {tabActivo < ULTIMO_PASO_WIZARD ? (
            <button type="button" onClick={() => irAPaso(tabActivo + 1)} disabled={soloLectura} className="sg-btn-primary" data-testid="btn-siguiente">Siguiente →</button>
          ) : tabActivo === ULTIMO_PASO_WIZARD ? (
            <>
              {/* alta-v3: el PDF firmado es OBLIGATORIO; sin él el botón "Guardar" está bloqueado. */}
              {!pdfFirmadoFile && (
                <span className="text-xs text-amber-700" data-testid="guardar-bloqueado-hint">Adjunta el PDF firmado para habilitar el guardado.</span>
              )}
              {/* alta-v4: el "disabled" refleja la validez GLOBAL (primerPasoInvalido), no solo el
                  PDF firmado. BUG 1: al guardar con éxito se limpia TODO y se redirige a
                  "Registrados" (ya NO hay estado de éxito con "Ver registrados →"). */}
              <button type="button" className="sg-btn-primary" disabled={soloLectura || guardando || primerPasoInvalido <= ULTIMO_PASO_WIZARD} onClick={handleGuardar} data-testid="btn-guardar">
                {guardando ? 'Guardando…' : 'Guardar contrato'}
              </button>
            </>
          ) : pasoPrevioCaptura != null ? (
            // alta-v5.1: en "Registrados" CON una captura activa (se entró desde un paso del wizard).
            // El botón VUELVE al paso donde se estaba capturando SIN resetear: preserva los datos (no
            // se pierden en silencio ni se dan por guardados). Para descartar está «Cancelar» (con confirmación).
            <button type="button" className="sg-btn-primary" disabled={soloLectura} onClick={() => { setErrores(ERR0); setErrorWizard(null); setTabActivo(pasoPrevioCaptura); }} data-testid="btn-volver-captura">← Volver a la captura</button>
          ) : (
            // alta-v5: en "Registrados" con el formulario LIMPIO (recién guardado o nunca tocado) los
            // nombres de pestaña no navegan en captura, así que la vía explícita al wizard es este botón.
            <button type="button" className="sg-btn-primary" disabled={soloLectura} onClick={() => { resetFormulario(); setTabActivo(0); }} data-testid="btn-nueva-alta">+ Capturar nuevo contrato</button>
          )}
        </div>
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
