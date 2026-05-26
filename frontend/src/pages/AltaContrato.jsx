import { useState, useEffect, useCallback } from 'react';
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

function TabCatalogo() {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Catálogo de conceptos</h3>
      <p className="text-sm text-slate-600 mb-3">Conceptos del contrato sobre la base de precios unitarios.</p>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2">Concepto</th>
              <th className="text-left px-3 py-2 w-20">Unidad</th>
              <th className="text-right px-3 py-2 w-28">Cantidad</th>
              <th className="text-right px-3 py-2 w-32">P.U.</th>
              <th className="text-right px-3 py-2 w-36">Importe</th>
            </tr>
          </thead>
          <tbody>
            {conceptosDummy.map((c, i) => (
              <tr key={i} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2">{c.concepto}</td>
                <td className="px-3 py-2 text-slate-600">{c.unidad}</td>
                <td className="px-3 py-2 text-right">{c.cantidad.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">${c.pu.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-semibold">
                  ${(c.cantidad * c.pu).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="mt-3 text-sm text-sigecop-accent hover:underline">
        + Agregar concepto
      </button>
    </div>
  );
}

function TabPrograma() {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Programa de obra</h3>
      <p className="text-sm text-slate-600 mb-3">Actividades calendarizadas mes a mes.</p>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2">Actividad</th>
              <th className="text-left px-3 py-2 w-36">Inicio</th>
              <th className="text-left px-3 py-2 w-36">Término</th>
              <th className="text-right px-3 py-2 w-24">% peso</th>
            </tr>
          </thead>
          <tbody>
            {programaObraDummy.map((p, i) => (
              <tr key={i} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2">{p.actividad}</td>
                <td className="px-3 py-2">{p.inicio}</td>
                <td className="px-3 py-2">{p.termino}</td>
                <td className="px-3 py-2 text-right font-semibold">{p.peso}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="mt-3 text-sm text-sigecop-accent hover:underline">
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
        <Field label="Firmante autorizado de la dependencia" required>
          <input className="sg-input" value={datos.firmanteDependencia} onChange={set('firmanteDependencia')} />
        </Field>
        <Field label="Cargo del firmante" required>
          <input className="sg-input" value={datos.cargoFirmante} onChange={set('cargoFirmante')} />
        </Field>
        <Field label="Representante legal del contratista" required>
          <input className="sg-input" value={datos.representanteLegal} onChange={set('representanteLegal')} />
        </Field>
        <Field label="Cédula profesional del responsable técnico" required hint="Ingresar cédula vigente del DRO">
          <input className="sg-input" value={datos.cedulaProfesional} onChange={set('cedulaProfesional')} />
        </Field>
        <Field label="No. de poder notarial">
          <input className="sg-input" value={datos.poderNotarial} onChange={set('poderNotarial')} />
        </Field>
        <Field label="Notaría">
          <input className="sg-input" value={datos.notaria} onChange={set('notaria')} />
        </Field>
      </div>
    </div>
  );
}

function TabGarantias() {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">Garantías, penalizaciones y amortización</h3>

      <div className="overflow-x-auto border border-slate-200 rounded-md mb-4">
        <table className="w-full text-sm">
          <thead className="bg-sigecop-blue-light text-sigecop-blue">
            <tr>
              <th className="text-left px-3 py-2">Tipo de póliza</th>
              <th className="text-left px-3 py-2">Afianzadora</th>
              <th className="text-left px-3 py-2 w-36">No. de póliza</th>
              <th className="text-right px-3 py-2 w-36">Monto</th>
              <th className="text-left px-3 py-2 w-40">Vigencia</th>
            </tr>
          </thead>
          <tbody>
            {polizasGarantiaDummy.map((p) => (
              <tr key={p.tipo} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{p.tipo}</td>
                <td className="px-3 py-2">{p.afianzadora || <span className="text-slate-400 italic">Por registrar</span>}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.poliza || <span className="text-slate-400 italic">—</span>}</td>
                <td className="px-3 py-2 text-right">
                  {p.monto ? `$ ${p.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : <span className="text-slate-400 italic">—</span>}
                </td>
                <td className="px-3 py-2">{p.vigencia || <span className="text-slate-400 italic">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

function TabPdfFirmado() {
  return (
    <div>
      <h3 className="text-lg font-bold text-sigecop-blue mb-4">PDF firmado del contrato</h3>
      <div className="border-2 border-dashed border-slate-300 rounded-md p-10 text-center bg-slate-50">
        <div className="text-5xl text-slate-300 mb-2">📄</div>
        <p className="text-sm text-slate-600 mb-1">Carga real disponible en Sprint siguiente</p>
        <p className="text-xs text-slate-400">Aquí se subirá el PDF firmado por las tres partes (máx. 20 MB).</p>
        <button type="button" disabled className="mt-4 px-4 py-2 bg-slate-200 text-slate-400 rounded-md text-sm cursor-not-allowed">
          Seleccionar archivo (deshabilitado)
        </button>
      </div>
    </div>
  );
}

function TabRegistrados({ contratos, loading, errorMsg, sinSesion, onRecargar }) {
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
  const setDatosGen = (k) => (e) => setDatosGenerales((prev) => ({ ...prev, [k]: e.target.value }));
  const setDatosJur = (k) => (e) => setDatosJuridicos((prev) => ({ ...prev, [k]: e.target.value }));

  const [contratos, setContratos] = useState([]);
  const [loadingLista, setLoadingLista] = useState(false);
  const [errorLista, setErrorLista] = useState(null);
  const [guardando, setGuardando] = useState(false);

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
        fechaTermino: datosGenerales.fechaTermino
      };
      await api.crearContrato(payload);
      showToast('Contrato guardado: ' + payload.folio);
      cargarContratos();
    } catch (err) {
      if (err.status === 409) {
        showToast('El folio ya existe');
      } else if (err.status === 400) {
        const f = err.payload?.faltantes?.join(', ');
        showToast(f ? `Faltan campos: ${f}` : 'Faltan campos');
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
    { label: 'Catálogo de conceptos', content: wrapTab(<TabCatalogo />) },
    { label: 'Programa de obra', content: wrapTab(<TabPrograma />) },
    { label: 'Datos jurídicos', content: wrapTab(<TabJuridicos datos={datosJuridicos} set={setDatosJur} />) },
    { label: 'Garantías, penalizaciones y amortización', content: wrapTab(<TabGarantias />) },
    { label: 'PDF firmado', content: wrapTab(<TabPdfFirmado />) },
    { label: 'Registrados', content: (
      <TabRegistrados
        contratos={contratos}
        loading={loadingLista}
        errorMsg={errorLista}
        sinSesion={sinSesion}
        onRecargar={cargarContratos}
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
          className="sg-btn-secondary"
          disabled={soloLectura || guardando}
          onClick={() => showToast('Pendiente para Sprint siguiente.')}
        >
          Guardar borrador
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
