import { useState } from 'react';
import { useToast } from '../components/ui/Toast.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import { contratoDummy, estimacionesParaPagoDummy, pagosRegistradosDummy } from '../data/dummy.js';

export default function RegistroPago() {
  const { showToast } = useToast();
  const { soloLectura } = useVistaHU('HU-21');
  const hoy = new Date().toISOString().slice(0, 10);

  const [estimacion, setEstimacion] = useState(estimacionesParaPagoDummy[0].etiqueta);
  const [fecha, setFecha] = useState(hoy);
  const [importe, setImporte] = useState('1,285,750.00');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');

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

      <div className="bg-white border border-slate-200 rounded-md p-6 mb-6">
        <h2 className="text-lg font-bold text-sigecop-blue mb-4">Datos del pago</h2>

        <RegionEditable disabled={soloLectura}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="sg-label">Estimación a pagar *</label>
            <select className="sg-input" value={estimacion} onChange={(e) => setEstimacion(e.target.value)}>
              {estimacionesParaPagoDummy.map((e) => (
                <option key={e.folio}>{e.etiqueta}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="sg-label">Fecha de pago *</label>
            <input type="date" className="sg-input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>

          <div>
            <label className="sg-label">Importe pagado (MXN) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                className="sg-input pl-7"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
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
            />
          </div>

          <div className="md:col-span-2">
            <label className="sg-label">Observaciones</label>
            <textarea
              className="sg-input"
              rows={3}
              placeholder="Notas adicionales sobre el pago (opcional)"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
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
              className="sg-btn-primary"
              onClick={() => showToast('Pendiente para Sprint siguiente.')}
            >
              Registrar pago
            </button>
          </div>
        )}
        </RegionEditable>
      </div>

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200">
          <h2 className="text-lg font-bold text-sigecop-blue">Pagos registrados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
              {pagosRegistradosDummy.map((p, i) => (
                <tr key={i} className="border-t border-slate-200 hover:bg-slate-50">
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
          { numero: 2, texto: 'Quedan capturados fecha, importe, referencia bancaria y usuario que realizó el registro.' }
        ]}
      />
    </div>
  );
}
