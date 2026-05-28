import { useState } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import { contratoDummy, estimacionesParaPagoDummy, pagosRegistradosDummy } from '../data/dummy.js';

// Acepta importes con comas y signo de pesos. Devuelve número, 0 si no parsea.
const importeNum = (s) => {
  const limpio = String(s || '').replace(/[$,\s]/g, '');
  const n = parseFloat(limpio);
  return Number.isFinite(n) ? n : 0;
};

const formatoMonedaMXN = (n) =>
  `$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// "2026-05-30" → "30/05/2026" para que las filas dummy y las nuevas coincidan en estilo.
const isoADDMMYY = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const isoALargo = (iso) => {
  if (!iso) return '';
  // Construimos con T00:00:00 para evitar desfase UTC en el cliente.
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', { dateStyle: 'long' });
};

export default function RegistroPago() {
  const { soloLectura } = useVistaHU('HU-21');
  const hoy = new Date().toISOString().slice(0, 10);

  // Campos del formulario.
  const [estimacion, setEstimacion] = useState(estimacionesParaPagoDummy[0].etiqueta);
  const [fecha, setFecha] = useState(hoy);
  const [importe, setImporte] = useState('1,285,750.00');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Pagos registrados en sesión — se suman encima del dummy. Cada uno marca
  // la estimación como pagada (estado local; sin backend).
  const [pagosLocales, setPagosLocales] = useState([]);
  // Datos del último pago para mostrar el banner verde.
  const [ultimoPago, setUltimoPago] = useState(null);

  // Todos los campos son obligatorios. El importe debe ser > 0.
  const datosOk =
    estimacion.trim().length > 0 &&
    !!fecha &&
    importeNum(importe) > 0 &&
    referencia.trim().length > 0 &&
    observaciones.trim().length > 0;

  const puedeRegistrar = !soloLectura && datosOk;

  const handleRegistrar = () => {
    if (!puedeRegistrar) return;
    // Extraer el folio EST-XXXX de la etiqueta del select.
    const folio = estimacion.split('—')[0].trim();
    const nuevoPago = {
      estimacion: folio,
      fecha: isoADDMMYY(fecha),
      importe: formatoMonedaMXN(importeNum(importe)),
      referencia: referencia.trim(),
      estado: 'Pagada',
      esLocal: true
    };
    setPagosLocales((prev) => [nuevoPago, ...prev]);
    setUltimoPago({
      fechaLegible: isoALargo(fecha),
      estimacionFolio: folio
    });
    // Limpia los campos no autocompletados — el flujo permite registrar más
    // pagos en la sesión.
    setReferencia('');
    setObservaciones('');
  };

  const todosPagos = [...pagosLocales, ...pagosRegistradosDummy];

  return (
    <div>
      <HeaderVista
        huId="HU-21"
        titulo="Registro del pago efectuado"
        sprint="Sprint 2"
        rolAcademico="Finanzas"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Pagos' },
          { label: 'Registro de pago' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[
          { value: contratoDummy.contratista },
          { label: 'Estimación', value: 'EST-2026-003', resaltado: true, sufijo: '(mayo 2026)' }
        ]}
      />

      {ultimoPago && (
        <div
          className="bg-sigecop-green-bg border-l-4 border-sigecop-green-validation px-4 py-3 mb-6 rounded-r-md"
          data-testid="aviso-pago-registrado"
        >
          <div className="text-sm font-semibold text-sigecop-green-validation">
            ✓ Pago registrado el {ultimoPago.fechaLegible}
          </div>
          <p className="text-sm text-slate-800 mt-1">
            Estimación <strong>{ultimoPago.estimacionFolio}</strong> marcada como{' '}
            <strong>pagada</strong>. Avance financiero actualizado.
          </p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-md p-6 mb-6">
        <h2 className="text-lg font-bold text-sigecop-blue mb-4">Datos del pago</h2>

        <RegionEditable disabled={soloLectura}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="sg-label">Estimación a pagar *</label>
              <select
                className="sg-input"
                value={estimacion}
                onChange={(e) => setEstimacion(e.target.value)}
                data-testid="pago-estimacion"
              >
                {estimacionesParaPagoDummy.map((e) => (
                  <option key={e.folio}>{e.etiqueta}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="sg-label">Fecha de pago *</label>
              <input
                type="date"
                className="sg-input"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                data-testid="pago-fecha"
              />
            </div>

            <div>
              <label className="sg-label">Importe pagado (MXN) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  className="sg-input pl-7"
                  value={importe}
                  onChange={(e) => setImporte(e.target.value)}
                  data-testid="pago-importe"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="sg-label">Referencia bancaria *</label>
              <input
                className="sg-input"
                placeholder="SPEI / folio de transferencia"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                data-testid="pago-referencia"
              />
            </div>

            <div className="md:col-span-2">
              <label className="sg-label">Observaciones *</label>
              <textarea
                className="sg-input"
                rows={3}
                placeholder="Notas del pago efectuado (obligatorio)"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                data-testid="pago-observaciones"
              />
            </div>
          </div>

          {!soloLectura && (
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="px-4 py-2 text-slate-600 hover:text-slate-900">
                Cancelar
              </button>
              <button
                type="button"
                className="sg-btn-primary disabled:bg-slate-300 disabled:cursor-not-allowed"
                disabled={!puedeRegistrar}
                onClick={handleRegistrar}
                data-testid="btn-registrar-pago"
              >
                Registrar pago
              </button>
            </div>
          )}
        </RegionEditable>
      </div>

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200">
          <h2 className="text-lg font-bold text-sigecop-blue">
            Pagos registrados ({todosPagos.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="tabla-pagos">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3 font-semibold">Estimación</th>
                <th className="text-left p-3 font-semibold">Fecha</th>
                <th className="text-right p-3 font-semibold">Importe</th>
                <th className="text-left p-3 font-semibold">Referencia</th>
                <th className="text-center p-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {todosPagos.map((p, i) => (
                <tr
                  key={`${p.estimacion}-${i}`}
                  className={`border-t border-slate-200 ${p.esLocal ? 'bg-green-50' : 'hover:bg-slate-50'}`}
                  data-testid={p.esLocal ? 'fila-pago-local' : undefined}
                >
                  <td className="p-3 font-mono text-xs">{p.estimacion}</td>
                  <td className="p-3">{p.fecha}</td>
                  <td className="p-3 text-right font-semibold">{p.importe}</td>
                  <td className="p-3 font-mono text-xs">{p.referencia}</td>
                  <td className="p-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-sigecop-green-validation">
                      {p.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SeccionCriterios
        huId="HU-21"
        criterios={[
          { numero: 1, texto: 'El registro del pago marca la estimación como pagada y actualiza el avance financiero del contrato.' },
          { numero: 2, texto: 'se encuentran todos o se encuentran los siguientes datos: fecha, importe, referencia bancaria y usuario que realizó el registro.' }
        ]}
      />
    </div>
  );
}
