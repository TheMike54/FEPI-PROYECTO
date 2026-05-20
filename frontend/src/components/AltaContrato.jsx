import { useState } from 'react';
import { Link } from 'react-router-dom';

const TABS = [
  { id: 'datos', label: 'Datos generales' },
  { id: 'catalogo', label: 'Catálogo de conceptos' },
  { id: 'programa', label: 'Programa de obra' },
  { id: 'juridicos', label: 'Datos jurídicos' },
  { id: 'garantias', label: 'Garantías, penalizaciones y amortización' },
  { id: 'pdf', label: 'PDF firmado' }
];

export default function AltaContrato() {
  const [activeTab, setActiveTab] = useState('datos');
  const idx = TABS.findIndex((t) => t.id === activeTab);
  const next = TABS[idx + 1];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <nav className="text-xs text-slate-500 mb-1">
            <Link to="/" className="hover:text-sigecop-blue">Inicio</Link>
            <span className="mx-2">/</span>
            <span>Contratos</span>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Alta</span>
          </nav>
          <h1 className="text-2xl font-bold text-sigecop-blue">Alta de contratos</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 mb-6 text-sm text-slate-800">
          <strong className="text-sigecop-amber-attention">Aviso:</strong> Los campos marcados con <span className="text-red-600">*</span> son obligatorios.
        </div>

        <div className="sg-card p-0 overflow-hidden">
          <div className="border-b border-slate-200 overflow-x-auto">
            <div className="flex min-w-max">
              {TABS.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === t.id
                      ? 'border-sigecop-blue text-sigecop-blue bg-sigecop-blue-light'
                      : 'border-transparent text-slate-600 hover:text-sigecop-blue'
                  }`}
                >
                  <span className="text-xs text-slate-400 mr-2">{i + 1}.</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'datos' && <TabDatosGenerales />}
            {activeTab === 'catalogo' && <TabCatalogoConceptos />}
            {activeTab === 'programa' && <TabProgramaObra />}
            {activeTab === 'juridicos' && <TabDatosJuridicos />}
            {activeTab === 'garantias' && <TabGarantias />}
            {activeTab === 'pdf' && <TabPdfFirmado />}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-3">
            <button type="button" className="px-4 py-2 text-slate-600 hover:text-slate-900">
              Cancelar
            </button>
            <button type="button" className="sg-btn-secondary">
              Guardar borrador
            </button>
            {next && (
              <button
                type="button"
                className="sg-btn-primary"
                onClick={() => setActiveTab(next.id)}
              >
                Siguiente: {next.label} →
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

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

function TabDatosGenerales() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Folio del contrato" required>
        <input className="sg-input" placeholder="OP-2026-XXX-NNN" />
      </Field>
      <Field label="Tipo de contrato" required>
        <select className="sg-input">
          <option>Obra pública (precios unitarios)</option>
          <option>Obra pública (precio alzado)</option>
          <option>Servicios relacionados con obra pública</option>
        </select>
      </Field>
      <div className="md:col-span-2">
        <Field label="Objeto del contrato" required>
          <textarea className="sg-input" rows="2" placeholder="Descripción del objeto contractual" />
        </Field>
      </div>
      <Field label="Contratista" required>
        <input className="sg-input" placeholder="Razón social" />
      </Field>
      <Field label="Dependencia contratante" required>
        <input className="sg-input" placeholder="Ej. Secretaría de Obras Públicas" />
      </Field>
      <Field label="Monto (MXN)" required>
        <input className="sg-input" type="number" placeholder="0.00" />
      </Field>
      <Field label="Plazo (días naturales)" required>
        <input className="sg-input" type="number" placeholder="0" />
      </Field>
      <Field label="Fecha de inicio" required>
        <input className="sg-input" type="date" />
      </Field>
      <Field label="Fecha de término" required>
        <input className="sg-input" type="date" />
      </Field>
    </div>
  );
}

function TabCatalogoConceptos() {
  return (
    <div>
      <p className="text-sm text-slate-600 mb-3">Catálogo de conceptos del contrato (precios unitarios).</p>
      <table className="w-full border border-slate-200 text-sm">
        <thead className="bg-sigecop-blue-light text-sigecop-blue">
          <tr>
            <th className="text-left px-3 py-2">Concepto</th>
            <th className="text-left px-3 py-2 w-24">Unidad</th>
            <th className="text-right px-3 py-2 w-28">Cantidad</th>
            <th className="text-right px-3 py-2 w-32">P.U.</th>
            <th className="text-right px-3 py-2 w-32">Importe</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map((i) => (
            <tr key={i} className="border-t border-slate-200">
              <td className="px-3 py-2"><input className="sg-input" placeholder="Descripción del concepto" /></td>
              <td className="px-3 py-2"><input className="sg-input" placeholder="m³" /></td>
              <td className="px-3 py-2"><input className="sg-input text-right" type="number" /></td>
              <td className="px-3 py-2"><input className="sg-input text-right" type="number" /></td>
              <td className="px-3 py-2 text-right text-slate-500">$ 0.00</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="mt-3 text-sm text-sigecop-accent hover:underline">+ Agregar concepto</button>
    </div>
  );
}

function TabProgramaObra() {
  return (
    <div>
      <p className="text-sm text-slate-600 mb-3">Programa de obra: actividades calendarizadas.</p>
      <table className="w-full border border-slate-200 text-sm">
        <thead className="bg-sigecop-blue-light text-sigecop-blue">
          <tr>
            <th className="text-left px-3 py-2">Actividad</th>
            <th className="text-left px-3 py-2 w-40">Fecha de inicio</th>
            <th className="text-left px-3 py-2 w-40">Fecha de término</th>
            <th className="text-right px-3 py-2 w-24">% peso</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map((i) => (
            <tr key={i} className="border-t border-slate-200">
              <td className="px-3 py-2"><input className="sg-input" placeholder="Descripción de la actividad" /></td>
              <td className="px-3 py-2"><input className="sg-input" type="date" /></td>
              <td className="px-3 py-2"><input className="sg-input" type="date" /></td>
              <td className="px-3 py-2"><input className="sg-input text-right" type="number" placeholder="0" /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="mt-3 text-sm text-sigecop-accent hover:underline">+ Agregar actividad</button>
    </div>
  );
}

function TabDatosJuridicos() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Firmante autorizado de la dependencia" required>
        <input className="sg-input" placeholder="Nombre completo" />
      </Field>
      <Field label="Cargo del firmante (dependencia)" required>
        <input className="sg-input" placeholder="Ej. Director de Obras Públicas" />
      </Field>
      <Field label="Cédula profesional (responsable técnico)" required hint="Ingresar cédula vigente del DRO o responsable técnico">
        <input className="sg-input" placeholder="XXXXXXXX" />
      </Field>
      <Field label="Representante legal del contratista" required>
        <input className="sg-input" placeholder="Nombre completo" />
      </Field>
      <Field label="No. de poder notarial">
        <input className="sg-input" placeholder="Ej. Escritura Núm. 12,345" />
      </Field>
      <Field label="Notaría">
        <input className="sg-input" placeholder="Notaría Pública Núm. X" />
      </Field>
    </div>
  );
}

function TabGarantias() {
  return (
    <div className="space-y-4">
      <table className="w-full border border-slate-200 text-sm">
        <thead className="bg-sigecop-blue-light text-sigecop-blue">
          <tr>
            <th className="text-left px-3 py-2">Tipo de póliza</th>
            <th className="text-left px-3 py-2">Afianzadora</th>
            <th className="text-left px-3 py-2 w-32">No. de póliza</th>
            <th className="text-right px-3 py-2 w-32">Monto</th>
            <th className="text-left px-3 py-2 w-40">Vigencia</th>
          </tr>
        </thead>
        <tbody>
          {['Anticipo', 'Cumplimiento', 'Vicios ocultos'].map((tipo) => (
            <tr key={tipo} className="border-t border-slate-200">
              <td className="px-3 py-2 font-medium">{tipo}</td>
              <td className="px-3 py-2"><input className="sg-input" placeholder="Afianzadora" /></td>
              <td className="px-3 py-2"><input className="sg-input" /></td>
              <td className="px-3 py-2"><input className="sg-input text-right" type="number" /></td>
              <td className="px-3 py-2"><input className="sg-input" type="date" /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm">
        <strong>Penalización 5 al millar — Art. 191 LFD:</strong> Se aplicará automáticamente el 5 al millar
        sobre el monto del contrato como derecho de inspección y vigilancia conforme al artículo 191 de la
        Ley Federal de Derechos.
      </div>

      <div className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 text-sm">
        <strong>Amortización de anticipo — Art. 50 LOPSRM:</strong> El anticipo otorgado deberá amortizarse
        proporcionalmente en cada estimación, conforme al artículo 50 de la Ley de Obras Públicas y Servicios
        Relacionados con las Mismas.
      </div>
    </div>
  );
}

function TabPdfFirmado() {
  return (
    <div>
      <Field label="Contrato firmado en PDF" required hint="Sube el PDF del contrato con las firmas de las partes (máx. 20 MB)">
        <div className="border-2 border-dashed border-slate-300 rounded-md p-8 text-center hover:border-sigecop-accent transition-colors">
          <div className="text-4xl text-slate-300">📄</div>
          <p className="mt-2 text-sm text-slate-600">Arrastra y suelta el archivo aquí, o</p>
          <button type="button" className="sg-btn-secondary mt-3">Seleccionar archivo</button>
          <p className="mt-2 text-xs text-slate-400">Formatos aceptados: .pdf</p>
        </div>
      </Field>
    </div>
  );
}
