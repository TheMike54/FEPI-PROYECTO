import { useState, useMemo } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import { fianzasListadoDummy, contratoDummy } from '../data/dummy.js';

const TIPOS_POLIZA = ['Cumplimiento', 'Anticipo', 'Vicios ocultos'];

// Convierte el offset relativo (días desde hoy) en una fecha real y su label
// DD/MM/YYYY. Hace setHours(0) para evitar desfases por hora del cliente.
function fechaDesdeOffset(dias) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return d;
}

function fechaALabel(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fechaAISO(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Calcula días entre hoy 00:00 y la fecha ISO destino. Positivo = futuro.
function diasHastaFecha(fechaISO) {
  if (!fechaISO) return 0;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dest = new Date(fechaISO + 'T00:00:00');
  return Math.round((dest - hoy) / (1000 * 60 * 60 * 24));
}

// Determina el badge según el rango de días al vencimiento.
function badgePorDias(dias) {
  if (dias < 0) {
    return {
      color: 'rojo',
      estado: `Vencida hace ${Math.abs(dias)} d`,
      clase: 'bg-red-100 text-red-700 border border-red-300'
    };
  }
  if (dias <= 5) {
    return {
      color: 'rojo',
      estado: `Vence en ${dias} d`,
      clase: 'bg-red-100 text-red-700 border border-red-300'
    };
  }
  if (dias <= 15) {
    return {
      color: 'ambar',
      estado: `Vence en ${dias} d`,
      clase: 'bg-amber-100 text-sigecop-amber-attention border border-amber-300'
    };
  }
  if (dias <= 30) {
    return {
      color: 'amarillo',
      estado: `Vence en ${dias} d`,
      clase: 'bg-yellow-50 text-yellow-800 border border-yellow-300'
    };
  }
  return {
    color: 'verde',
    estado: 'Vigente',
    clase: 'bg-green-100 text-sigecop-green-validation border border-green-300'
  };
}

// Próximo folio correlativo F-2026-XXXXX leyendo el máximo del listado actual.
function proximoFolio(polizas) {
  let max = 0;
  for (const p of polizas) {
    const m = (p.folio || '').match(/F-\d{4}-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `F-2026-${String(max + 1).padStart(5, '0')}`;
}

const moneda = (n) =>
  `$ ${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FORM_VACIO = {
  tipo: TIPOS_POLIZA[0],
  afianzadora: '',
  folio: '',
  monto: '',
  fechaEmisionISO: '',
  fechaVencimientoISO: '',
  archivoPdf: ''
};

// Modal de agregar/editar póliza. `editando` define el modo (texto del botón).
function ModalPoliza({ abierto, modo, valores, onCambio, onArchivo, onCerrar, onConfirmar, datosOk }) {
  if (!abierto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4"
      data-testid="modal-agregar-poliza"
    >
      <div className="bg-white rounded-md shadow-lg max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-sigecop-blue">
            {modo === 'editar' ? 'Editar póliza' : 'Agregar nueva póliza'}
          </h3>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-700 text-xl leading-none"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="sg-label">Tipo *</label>
            <select
              className="sg-input"
              value={valores.tipo}
              onChange={(e) => onCambio('tipo', e.target.value)}
              data-testid="mp-tipo"
            >
              {TIPOS_POLIZA.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="sg-label">Afianzadora *</label>
            <input
              className="sg-input"
              value={valores.afianzadora}
              onChange={(e) => onCambio('afianzadora', e.target.value)}
              data-testid="mp-afianzadora"
            />
          </div>
          <div>
            <label className="sg-label">Número de póliza *</label>
            <input
              className="sg-input"
              value={valores.folio}
              onChange={(e) => onCambio('folio', e.target.value)}
              data-testid="mp-folio"
            />
          </div>
          <div>
            <label className="sg-label">Monto afianzado (MXN) *</label>
            <input
              type="number"
              min="0"
              step="any"
              className="sg-input"
              value={valores.monto}
              onChange={(e) => onCambio('monto', e.target.value)}
              data-testid="mp-monto"
            />
          </div>
          <div>
            <label className="sg-label">Fecha de emisión *</label>
            <input
              type="date"
              className="sg-input"
              value={valores.fechaEmisionISO}
              onChange={(e) => onCambio('fechaEmisionISO', e.target.value)}
              data-testid="mp-emision"
            />
          </div>
          <div>
            <label className="sg-label">Fecha de vencimiento *</label>
            <input
              type="date"
              className="sg-input"
              value={valores.fechaVencimientoISO}
              onChange={(e) => onCambio('fechaVencimientoISO', e.target.value)}
              data-testid="mp-vencimiento"
            />
          </div>
          <div className="md:col-span-2">
            <label className="sg-label">Archivo PDF de la póliza *</label>
            <input
              type="file"
              accept="application/pdf"
              className="block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-sigecop-blue-light file:text-sigecop-blue hover:file:bg-sigecop-accent hover:file:text-white"
              onChange={onArchivo}
              data-testid="mp-archivo"
            />
            {valores.archivoPdf && (
              <p className="text-xs text-slate-600 mt-1">
                Archivo seleccionado: <strong>{valores.archivoPdf}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 text-slate-600 hover:text-slate-900"
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed"
            disabled={!datosOk}
            onClick={onConfirmar}
            data-testid="mp-confirmar"
          >
            {modo === 'editar' ? 'Guardar cambios' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de vista previa del PDF — placeholder visual (sin descarga real).
function ModalVerPdf({ abierto, archivo, onCerrar }) {
  if (!abierto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4"
      data-testid="modal-ver-pdf"
    >
      <div className="bg-white rounded-md shadow-lg max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-sigecop-blue">Vista previa de la póliza</h3>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-700 text-xl leading-none"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="border-2 border-dashed border-slate-300 rounded-md p-8 bg-slate-50 text-center">
          <div className="text-6xl mb-3">📄</div>
          <div className="text-sm text-slate-700">
            Vista previa: <strong className="font-mono">{archivo}</strong>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            El visor incrustado se conecta al storage del backend en SRV-02-04.
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="sg-btn-secondary"
            onClick={onCerrar}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RegistroFianzas() {
  const { soloLectura } = useVistaHU('HU-02');

  // Lista de pólizas en memoria. Calcula la fecha de vencimiento real desde
  // diasOffset al primer render y la guarda como fechaVencimientoISO; a partir
  // de ahí toda la lógica trabaja con fechas absolutas (incluye las nuevas).
  const [polizas, setPolizas] = useState(() =>
    fianzasListadoDummy.map((p) => ({
      ...p,
      fechaVencimientoISO: fechaAISO(fechaDesdeOffset(p.diasOffset))
    }))
  );

  // Estado del modal de agregar/editar.
  const [modal, setModal] = useState({ abierto: false, modo: 'agregar', folioEditando: null });
  const [form, setForm] = useState(FORM_VACIO);

  // Estado del modal de Ver PDF.
  const [pdfModal, setPdfModal] = useState({ abierto: false, archivo: '' });

  const abrirAgregar = () => {
    setForm({
      ...FORM_VACIO,
      folio: proximoFolio(polizas)
    });
    setModal({ abierto: true, modo: 'agregar', folioEditando: null });
  };

  const abrirEditar = (poliza) => {
    setForm({
      tipo: poliza.tipo,
      afianzadora: poliza.afianzadora,
      folio: poliza.folio,
      monto: String(poliza.monto || ''),
      fechaEmisionISO: '', // emisión legacy es label; campo vacío en edición
      fechaVencimientoISO: poliza.fechaVencimientoISO,
      archivoPdf: poliza.archivoPdf || ''
    });
    setModal({ abierto: true, modo: 'editar', folioEditando: poliza.folio });
  };

  const cerrarModal = () => {
    setModal({ abierto: false, modo: 'agregar', folioEditando: null });
    setForm(FORM_VACIO);
  };

  const handleCambio = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleArchivo = (e) => {
    const archivo = e.target.files?.[0];
    setForm((prev) => ({ ...prev, archivoPdf: archivo?.name || '' }));
  };

  const datosOk =
    form.tipo &&
    form.afianzadora.trim().length > 0 &&
    form.folio.trim().length > 0 &&
    Number(form.monto) > 0 &&
    form.fechaEmisionISO &&
    form.fechaVencimientoISO &&
    form.archivoPdf.trim().length > 0;

  const confirmar = () => {
    if (!datosOk) return;
    const fechaVencDate = new Date(form.fechaVencimientoISO + 'T00:00:00');
    const nueva = {
      folio: form.folio.trim(),
      tipo: form.tipo,
      afianzadora: form.afianzadora.trim(),
      monto: Number(form.monto),
      fechaEmisionLabel: form.fechaEmisionISO
        ? fechaALabel(new Date(form.fechaEmisionISO + 'T00:00:00'))
        : '',
      fechaVencimientoISO: form.fechaVencimientoISO,
      diasOffset: diasHastaFecha(form.fechaVencimientoISO),
      archivoPdf: form.archivoPdf,
      tienePdf: true,
      esNueva: modal.modo === 'agregar'
    };
    if (modal.modo === 'editar') {
      setPolizas((prev) =>
        prev.map((p) => (p.folio === modal.folioEditando ? { ...nueva, esNueva: false } : p))
      );
    } else {
      setPolizas((prev) => [nueva, ...prev]);
    }
    cerrarModal();
  };

  const abrirVerPdf = (archivo) => setPdfModal({ abierto: true, archivo });
  const cerrarVerPdf = () => setPdfModal({ abierto: false, archivo: '' });

  // Conteo en vivo de pólizas próximas a vencer en 5/15/30 días (acumulativo:
  // "en 30" incluye también las "en 15" y "en 5").
  const conteo = useMemo(() => {
    let c5 = 0, c15 = 0, c30 = 0;
    for (const p of polizas) {
      const dias = diasHastaFecha(p.fechaVencimientoISO);
      if (dias <= 30) c30++;
      if (dias <= 15) c15++;
      if (dias <= 5) c5++;
    }
    return { c5, c15, c30 };
  }, [polizas]);

  return (
    <div>
      <HeaderVista
        huId="HU-02"
        titulo="Registro de fianzas y garantías"
        sprint="Sprint 6"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Contratos' },
          { label: 'Registro de fianzas' }
        ]}
      />

      <BannerContexto
        variant="blue"
        folio={contratoDummy.folio}
        contratista={contratoDummy.contratista}
        extra={[{ value: contratoDummy.objeto }]}
      />

      {/* Tarjetas de conteo en vivo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-red-200 rounded-md p-4 shadow-sm" data-testid="card-5d">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Por vencer ≤ 5 días</div>
          <div className="text-3xl font-bold text-red-600 mt-1">{conteo.c5}</div>
          <div className="text-xs text-slate-600">pólizas en alerta crítica</div>
        </div>
        <div className="bg-white border border-amber-200 rounded-md p-4 shadow-sm" data-testid="card-15d">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Por vencer ≤ 15 días</div>
          <div className="text-3xl font-bold text-sigecop-amber-attention mt-1">{conteo.c15}</div>
          <div className="text-xs text-slate-600">pólizas requieren gestión</div>
        </div>
        <div className="bg-white border border-yellow-200 rounded-md p-4 shadow-sm" data-testid="card-30d">
          <div className="text-xs text-slate-500 uppercase tracking-wider">Por vencer ≤ 30 días</div>
          <div className="text-3xl font-bold text-yellow-700 mt-1">{conteo.c30}</div>
          <div className="text-xs text-slate-600">pólizas en seguimiento</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-sigecop-blue">
            Pólizas de fianza del contrato ({polizas.length})
          </h2>
          {!soloLectura && (
            <button
              type="button"
              className="sg-btn-primary"
              onClick={abrirAgregar}
              data-testid="btn-agregar-poliza"
            >
              + Agregar nueva póliza
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="tabla-polizas">
            <thead className="bg-slate-50">
              <tr className="text-slate-700">
                <th className="text-left p-3 font-semibold">Tipo</th>
                <th className="text-left p-3 font-semibold">Folio</th>
                <th className="text-left p-3 font-semibold">Afianzadora</th>
                <th className="text-right p-3 font-semibold">Monto</th>
                <th className="text-center p-3 font-semibold">Vencimiento</th>
                <th className="text-center p-3 font-semibold">Alerta</th>
                <th className="text-center p-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {polizas.map((p) => {
                const dias = diasHastaFecha(p.fechaVencimientoISO);
                const badge = badgePorDias(dias);
                const fechaVencLabel = fechaALabel(new Date(p.fechaVencimientoISO + 'T00:00:00'));
                return (
                  <tr
                    key={p.folio}
                    className={`border-t border-slate-200 ${p.esNueva ? 'bg-green-50' : 'hover:bg-slate-50'}`}
                    data-testid={p.esNueva ? `fila-poliza-nueva-${p.folio}` : undefined}
                    data-badge={badge.color}
                  >
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 bg-sigecop-blue-light text-sigecop-blue text-xs font-semibold rounded">
                        {p.tipo}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">{p.folio}</td>
                    <td className="p-3">{p.afianzadora}</td>
                    <td className="p-3 text-right font-mono text-xs">{moneda(p.monto)}</td>
                    <td className="p-3 text-center text-xs">{fechaVencLabel}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${badge.clase}`}
                      >
                        {badge.estado}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          title="Ver PDF de la póliza"
                          className="text-sigecop-accent hover:text-sigecop-blue text-lg"
                          onClick={() => abrirVerPdf(p.archivoPdf)}
                          data-testid={`btn-ver-pdf-${p.folio}`}
                        >
                          👁
                        </button>
                        {!soloLectura && (
                          <button
                            type="button"
                            title="Editar póliza"
                            className="text-slate-500 hover:text-sigecop-blue"
                            onClick={() => abrirEditar(p)}
                            data-testid={`btn-editar-${p.folio}`}
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        <strong>⚖️ Fundamento:</strong> Art. 48 LOPSRM — las fianzas se otorgan dentro de los
        15 días naturales siguientes a la notificación del fallo.
      </p>

      <SeccionCriterios
        huId="HU-02"
        criterios={[
          { numero: 1, texto: 'La póliza queda ligada al contrato con afianzadora, vigencia y monto registrados.' },
          { numero: 2, texto: 'El sistema emite alerta cuando faltan 30, 15 y 5 días para el vencimiento (configurable).' },
          { numero: 3, texto: 'La póliza registrada puede consultarse en formato PDF desde el listado de fianzas del contrato.' }
        ]}
      />

      <ModalPoliza
        abierto={modal.abierto}
        modo={modal.modo}
        valores={form}
        onCambio={handleCambio}
        onArchivo={handleArchivo}
        onCerrar={cerrarModal}
        onConfirmar={confirmar}
        datosOk={datosOk}
      />

      <ModalVerPdf
        abierto={pdfModal.abierto}
        archivo={pdfModal.archivo}
        onCerrar={cerrarVerPdf}
      />
    </div>
  );
}
