import { useState, useEffect, useCallback, useRef } from 'react';
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

// Unidades estandar del catalogo (simbolos correctos) + opcion "Otro" (texto libre).
const UNIDADES = ['m', 'm²', 'm³', 'ml', 'cm', 'kg', 'ton', 'pza', 'lote', 'jornal', '%'];

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

function TabDatosGenerales({ datos, set }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Datos generales del contrato</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Folio del contrato" required>
          <input className="sg-input" value={datos.folio} onChange={set('folio')} />
        </Field>
        <Field label="Tipo de contrato" required>
          <select className="sg-input" value={datos.tipo} onChange={set('tipo')}>
            <option>Obra pública sobre la base de precios unitarios</option>
            <option>Obra pública a precio alzado</option>
            <option>Servicios relacionados con obra pública</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Objeto del contrato" required>
            <input className="sg-input" value={datos.objeto} onChange={set('objeto')} />
          </Field>
        </div>
        <Field label="Contratista" required>
          <input className="sg-input" value={datos.contratista} onChange={set('contratista')} />
        </Field>
        <Field label="Dependencia" required>
          <input className="sg-input" value={datos.dependencia} onChange={set('dependencia')} />
        </Field>
        <Field label="Monto (MXN)" required>
          <input type="number" min="0" step="0.01" className="sg-input" value={datos.monto} onChange={set('monto')} />
        </Field>
        <Field label="Plazo (días naturales)" required>
          <input type="number" min="1" step="1" className="sg-input" value={datos.plazoDias} onChange={set('plazoDias')} />
        </Field>
        <Field label="Fecha de inicio" required>
          <input type="date" className="sg-input" value={datos.fechaInicio} onChange={set('fechaInicio')} />
        </Field>
        <Field label="Fecha de término" required>
          <input type="date" className="sg-input" value={datos.fechaTermino} onChange={set('fechaTermino')} />
        </Field>
      </div>

      <div className="mt-4 bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm text-slate-800">
        <strong>Campos marcados con *</strong> son obligatorios. Si no se completan, el sistema no permite guardar.
      </div>
    </div>
  );
}

function TabCatalogo({ rows, onCell, onPatch, onAdd, onRemove, soloLectura }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Catálogo de conceptos</h3>
      <p className="text-sm text-slate-600 mb-3">
        Conceptos del contrato sobre la base de precios unitarios. Bloque opcional: puedes dejarlo vacío.
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
              // "Otro" si el flag esta puesto o si la unidad guardada no es estandar.
              const esOtro = c.unidadOtro || (c.unidad !== '' && !UNIDADES.includes(c.unidad));
              const unidadSel = esOtro ? 'Otro' : c.unidad;
              return (
                <tr key={c.rid} className="border-t border-slate-200">
                  <td className="px-2 py-1"><input className="sg-input" value={c.concepto} onChange={onCell(i, 'concepto')} disabled={soloLectura} /></td>
                  <td className="px-2 py-1">
                    <select
                      className="sg-input"
                      value={unidadSel}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === 'Otro') onPatch(i, { unidadOtro: true, unidad: '' });
                        else onPatch(i, { unidadOtro: false, unidad: v });
                      }}
                      disabled={soloLectura}
                    >
                      <option value="">—</option>
                      {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                      <option value="Otro">Otro…</option>
                    </select>
                    {esOtro && (
                      <input
                        className="sg-input mt-1"
                        placeholder="Especifica la unidad"
                        maxLength={20}
                        value={c.unidad}
                        onChange={onCell(i, 'unidad')}
                        disabled={soloLectura}
                      />
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
        </table>
      </div>
      <button type="button" onClick={onAdd} disabled={soloLectura} className="mt-3 text-sm text-sigecop-accent hover:underline disabled:opacity-40">
        + Agregar concepto
      </button>
    </div>
  );
}

function TabPrograma({ rows, onCell, onAdd, onRemove, soloLectura }) {
  const total = Math.round(rows.reduce((s, p) => s + (Number(p.peso) || 0), 0) * 100) / 100;
  let avisoCls = '';
  let avisoMsg = '';
  if (rows.length > 0) {
    if (total > 100) {
      avisoCls = 'text-red-700 bg-red-50 border-red-300';
      avisoMsg = `Suma de %peso: ${total}% — excede 100%. No se puede guardar; ajusta los pesos.`;
    } else if (total === 100) {
      avisoCls = 'text-green-700 bg-green-50 border-green-300';
      avisoMsg = `Suma de %peso: ${total}% ✓`;
    } else {
      avisoCls = 'text-amber-800 bg-amber-50 border-amber-300';
      avisoMsg = `Suma de %peso: ${total}% — parcial (faltan ${Math.round((100 - total) * 100) / 100}% para llegar a 100%).`;
    }
  }
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Programa de obra</h3>
      <p className="text-sm text-slate-600 mb-3">
        Actividades calendarizadas. Bloque opcional: puedes dejarlo vacío.
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
              <tr key={p.rid} className="border-t border-slate-200">
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
        <Field label="Firmante autorizado de la dependencia">
          <input className="sg-input" value={datos.firmanteDependencia} onChange={set('firmanteDependencia')} />
        </Field>
        <Field label="Cargo del firmante">
          <input className="sg-input" value={datos.cargoFirmante} onChange={set('cargoFirmante')} />
        </Field>
        <Field label="Representante legal del contratista">
          <input className="sg-input" value={datos.representanteLegal} onChange={set('representanteLegal')} />
        </Field>
        <Field label="Cédula profesional del responsable técnico" hint="Ingresar cédula vigente del DRO">
          <input className="sg-input" value={datos.cedulaProfesional} onChange={set('cedulaProfesional')} />
        </Field>
        <Field label="No. de poder notarial">
          <input className="sg-input" value={datos.poderNotarial} onChange={set('poderNotarial')} />
        </Field>
        <Field label="Notaría">
          <input className="sg-input" value={datos.notaria} onChange={set('notaria')} />
        </Field>
      </div>
      <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 px-4 py-3 text-sm text-blue-900">
        Bloque opcional. Se guarda junto con el contrato como un solo registro (campo <code>datos_juridicos</code>).
      </div>
    </div>
  );
}

function TabGarantias({ rows, onCell, onAdd, onRemove, anticipoPct, setAnticipoPct, soloLectura }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Garantías, penalizaciones y amortización</h3>

      <div className="mb-4 max-w-xs">
        <Field label="% de anticipo otorgado" hint="Base de la amortización (art. 50 LOPSRM). Opcional.">
          <input type="number" min="0" max="100" step="0.01" className="sg-input" value={anticipoPct} onChange={(e) => setAnticipoPct(e.target.value)} disabled={soloLectura} />
        </Field>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-md mb-4">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2 w-40">Tipo de póliza</th>
              <th className="text-left px-3 py-2">Afianzadora</th>
              <th className="text-left px-3 py-2 w-40">No. de póliza</th>
              <th className="text-right px-3 py-2 w-40">Monto</th>
              <th className="text-left px-3 py-2 w-44">Vigencia</th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.rid} className="border-t border-slate-200">
                <td className="px-2 py-1"><input className="sg-input" value={p.tipo} onChange={onCell(i, 'tipo')} disabled={soloLectura} /></td>
                <td className="px-2 py-1"><input className="sg-input" value={p.afianzadora} onChange={onCell(i, 'afianzadora')} disabled={soloLectura} /></td>
                <td className="px-2 py-1"><input className="sg-input font-mono text-xs" value={p.poliza} onChange={onCell(i, 'poliza')} disabled={soloLectura} /></td>
                <td className="px-2 py-1"><input type="number" min="0" step="0.01" className="sg-input text-right" value={p.monto} onChange={onCell(i, 'monto')} disabled={soloLectura} /></td>
                <td className="px-2 py-1"><input type="date" className="sg-input" value={p.vigencia} onChange={onCell(i, 'vigencia')} disabled={soloLectura} /></td>
                <td className="px-2 py-1 text-center">
                  <button type="button" onClick={() => onRemove(i)} disabled={soloLectura} className="text-red-500 hover:text-red-700 disabled:opacity-30" title="Quitar póliza">✕</button>
                </td>
              </tr>
            ))}
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
    try {
      setMeta(await api.documentoMeta(contratoId));
    } catch (err) {
      if (err.status === 404) setMeta(null);
      else showToast('No se pudo consultar el PDF ligado');
    } finally {
      setCargando(false);
    }
  }, [contratoId, showToast]);

  useEffect(() => { cargarMeta(); }, [cargarMeta]);

  const onArchivo = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showToast('Solo se permiten archivos PDF');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('El PDF excede el límite de 10 MB');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setSubiendo(true);
    try {
      await api.subirDocumento(contratoId, file);
      showToast('PDF firmado adjuntado: ' + file.name);
      await cargarMeta();
    } catch (err) {
      showToast(err.message || 'No se pudo subir el PDF');
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const obtener = async (descargar) => {
    try {
      const blob = await api.descargarDocumento(contratoId);
      const url = URL.createObjectURL(blob);
      if (descargar) {
        const a = document.createElement('a');
        a.href = url;
        a.download = (meta && meta.nombre) || 'documento.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        window.open(url, '_blank', 'noopener');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      showToast(err.message || 'No se pudo obtener el PDF');
    }
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
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={onArchivo}
              disabled={soloLectura || subiendo}
              className="block mx-auto text-sm"
            />
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
    try {
      await api.subirDocumento(id, file);
      showToast('PDF adjuntado al contrato.');
      onRecargar();
    } catch (err) {
      showToast(err.message || 'No se pudo subir el PDF');
    } finally {
      setSubiendoId(null);
      setTargetId(null);
    }
  };

  const verDescargar = async (id, descargar) => {
    try {
      let nombre = 'documento.pdf';
      if (descargar) {
        try { const m = await api.documentoMeta(id); if (m && m.nombre) nombre = m.nombre; } catch (_) { /* usa default */ }
      }
      const blob = await api.descargarDocumento(id);
      const url = URL.createObjectURL(blob);
      if (descargar) {
        const a = document.createElement('a');
        a.href = url; a.download = nombre;
        document.body.appendChild(a); a.click(); a.remove();
      } else {
        window.open(url, '_blank', 'noopener');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      showToast(err.message || 'No se pudo obtener el PDF');
    }
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
        <button type="button" onClick={onRecargar} className="text-sm text-sigecop-accent hover:underline" disabled={loading}>
          ↻ Recargar
        </button>
      </div>
      {loading && <p className="text-sm text-slate-500">Cargando…</p>}
      {!loading && errorMsg && (
        <p className="text-sm text-slate-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">{errorMsg}</p>
      )}
      {!loading && !errorMsg && contratos.length === 0 && (
        <p className="text-sm text-slate-500">No hay contratos registrados todavía.</p>
      )}
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

export default function AltaContrato() {
  const { showToast } = useToast();
  const { soloLectura } = useVistaHU('HU-01');
  const { token } = useSesion();
  const sinSesion = !token;

  const [datosGenerales, setDatosGenerales] = useState({
    folio: 'C-2026-0042',
    tipo: 'Obra pública sobre la base de precios unitarios',
    objeto: 'Construcción de edificio administrativo en av. principal',
    contratista: 'Constructora XYZ S.A. de C.V.',
    dependencia: 'Secretaría de Obras Públicas',
    monto: 12450000,
    plazoDias: 180,
    fechaInicio: '2026-06-01',
    fechaTermino: '2026-11-28'
  });
  const [datosJuridicos, setDatosJuridicos] = useState({
    firmanteDependencia: 'Lic. María Pérez García',
    cargoFirmante: 'Directora de Obras',
    representanteLegal: 'Lic. Juan Ramírez Soto',
    cedulaProfesional: '8475612',
    poderNotarial: 'Escritura Núm. 12,345',
    notaria: 'Notaría Pública Núm. 47 — Acapulco, Gro.'
  });
  const [anticipoPct, setAnticipoPct] = useState(30);

  // Bloques-lista editables (precargados con datos de ejemplo para la demo).
  // rid = id estable por fila (solo UI, NO se envia al backend) para las keys de
  // React, de modo que editar/borrar filas no provoque parpadeo ni perdida de foco.
  const ridCounter = useRef(0);
  const nextRid = () => (ridCounter.current += 1);

  const [conceptos, setConceptos] = useState(() =>
    conceptosDummy.map((c) => ({ rid: nextRid(), concepto: c.concepto, unidad: c.unidad, cantidad: c.cantidad, pu: c.pu }))
  );
  const [programa, setPrograma] = useState(() =>
    programaObraDummy.map((a) => ({ rid: nextRid(), actividad: a.actividad, inicio: a.inicio, termino: a.termino, peso: a.peso }))
  );
  const [garantias, setGarantias] = useState(() =>
    polizasGarantiaDummy.map((g) => ({ rid: nextRid(), tipo: g.tipo, afianzadora: g.afianzadora, poliza: g.poliza, monto: g.monto, vigencia: g.vigencia }))
  );

  const setDatosGen = (k) => (e) => setDatosGenerales((prev) => ({ ...prev, [k]: e.target.value }));
  const setDatosJur = (k) => (e) => setDatosJuridicos((prev) => ({ ...prev, [k]: e.target.value }));

  // Helpers de edicion de filas para los bloques-lista.
  const mkCell = (setter) => (i, key) => (e) =>
    setter((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: e.target.value } : r)));
  const mkAdd = (setter, vacio) => () => setter((prev) => [...prev, { ...vacio, rid: nextRid() }]);
  const mkRemove = (setter) => (i) => setter((prev) => prev.filter((_, idx) => idx !== i));
  // Fusiona un objeto parcial en una fila (p. ej. unidad + flag unidadOtro a la vez).
  const mkPatch = (setter) => (i, patch) => setter((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const [contratos, setContratos] = useState([]);
  const [loadingLista, setLoadingLista] = useState(false);
  const [errorLista, setErrorLista] = useState(null);
  const [guardando, setGuardando] = useState(false);
  // id del contrato recien guardado: habilita ligar el PDF firmado (HU-01) despues.
  const [contratoGuardadoId, setContratoGuardadoId] = useState(null);

  const cargarContratos = useCallback(async () => {
    if (sinSesion) return;
    setLoadingLista(true);
    setErrorLista(null);
    try {
      const lista = await api.listarContratos();
      setContratos(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setErrorLista('No se pudieron cargar los contratos');
    } finally {
      setLoadingLista(false);
    }
  }, [sinSesion]);

  useEffect(() => {
    cargarContratos();
  }, [cargarContratos]);

  const handleGuardar = async () => {
    if (guardando || soloLectura) return;
    // Bloquea si el programa de obra EXCEDE 100% (una suma <100% sí se permite).
    const sumaPeso = Math.round(programa.reduce((s, a) => s + (Number(a.peso) || 0), 0) * 100) / 100;
    if (sumaPeso > 100) {
      showToast(`El programa de obra suma ${sumaPeso}% (excede 100%). Ajusta los pesos antes de guardar.`);
      return;
    }
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
        fechaTermino: datosGenerales.fechaTermino,
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
      if (err.status === 409) {
        showToast('El folio ya existe');
      } else if (err.status === 400) {
        const f = err.payload?.faltantes?.join(', ');
        showToast(f ? `Faltan campos: ${f}` : (err.message || 'Revisa los datos del formulario'));
      } else if (err.status === 403) {
        showToast('Solo el residente puede crear contratos');
      } else if (err.status === 401) {
        showToast('Tu sesión expiró. Vuelve a iniciar sesión.');
      } else {
        showToast('No se pudo guardar el contrato');
      }
    } finally {
      setGuardando(false);
    }
  };

  const wrapTab = (node) => (
    <RegionEditable disabled={soloLectura}>{node}</RegionEditable>
  );

  const tabs = [
    { label: 'Datos generales', content: wrapTab(<TabDatosGenerales datos={datosGenerales} set={setDatosGen} />) },
    { label: 'Catálogo de conceptos', content: wrapTab(
      <TabCatalogo
        rows={conceptos}
        onCell={mkCell(setConceptos)}
        onPatch={mkPatch(setConceptos)}
        onAdd={mkAdd(setConceptos, { concepto: '', unidad: '', cantidad: '', pu: '' })}
        onRemove={mkRemove(setConceptos)}
        soloLectura={soloLectura}
      />
    ) },
    { label: 'Programa de obra', content: wrapTab(
      <TabPrograma
        rows={programa}
        onCell={mkCell(setPrograma)}
        onAdd={mkAdd(setPrograma, { actividad: '', inicio: '', termino: '', peso: '' })}
        onRemove={mkRemove(setPrograma)}
        soloLectura={soloLectura}
      />
    ) },
    { label: 'Datos jurídicos', content: wrapTab(<TabJuridicos datos={datosJuridicos} set={setDatosJur} />) },
    { label: 'Garantías, penalizaciones y amortización', content: wrapTab(
      <TabGarantias
        rows={garantias}
        onCell={mkCell(setGarantias)}
        onAdd={mkAdd(setGarantias, { tipo: '', afianzadora: '', poliza: '', monto: '', vigencia: '' })}
        onRemove={mkRemove(setGarantias)}
        anticipoPct={anticipoPct}
        setAnticipoPct={setAnticipoPct}
        soloLectura={soloLectura}
      />
    ) },
    { label: 'PDF firmado', content: wrapTab(<TabPdfFirmado contratoId={contratoGuardadoId} soloLectura={soloLectura} />) },
    { label: 'Registrados', content: (
      <TabRegistrados
        contratos={contratos}
        loading={loadingLista}
        errorMsg={errorLista}
        sinSesion={sinSesion}
        onRecargar={cargarContratos}
        soloLectura={soloLectura}
      />
    ) }
  ];

  return (
    <div>
      <HeaderVista
        huId="HU-01"
        titulo="Alta de contratos"
        sprint="Sprint 1"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Contratos' },
          { label: 'Alta de contratos' }
        ]}
      />

      <Tabs tabs={tabs} />

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className="px-4 py-2 text-slate-600 hover:text-slate-900">
          Cancelar
        </button>
        <button
          type="button"
          className="sg-btn-primary"
          disabled={soloLectura || guardando}
          onClick={handleGuardar}
        >
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
