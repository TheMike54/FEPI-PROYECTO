import { useState } from 'react';
import Breadcrumb from '../components/ui/Breadcrumb.jsx';
import BadgeSprint from '../components/ui/BadgeSprint.jsx';
import CardCriterioAceptacion from '../components/ui/CardCriterioAceptacion.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { contratoDummy, estimacionesParaPagoDummy, pagosRegistradosDummy } from '../data/dummy.js';

export default function RegistroPago() {
  const { showToast } = useToast();
  const hoy = new Date().toISOString().slice(0, 10);

  const [estimacion, setEstimacion] = useState(estimacionesParaPagoDummy[0].etiqueta);
  const [fecha, setFecha] = useState(hoy);
  const [importe, setImporte] = useState('1,285,750.00');
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Inicio', href: '/' },
          { label: 'Pagos' },
          { label: 'Registro de pago' }
        ]}
      />

      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-sigecop-blue">Registro del pago efectuado</h1>
        <BadgeSprint codigo="HU-21" sprint="Sprint 2" />
      </div>
      <p className="text-sm text-slate-600 mb-6">Rol: Finanzas</p>

      <div className="bg-slate-100 border-l-4 border-slate-400 px-4 py-3 mb-6 rounded-r-md">
        <div className="text-xs font-semibold text-slate-600 uppercase">Contexto</div>
        <div className="text-sm text-slate-800 mt-1">
          Contrato <strong>{contratoDummy.folio}</strong> · {contratoDummy.contratista} · Estimación <strong>EST-2026-003</strong> (mayo 2026)
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-6 mb-6">
        <h2 className="text-lg font-bold text-sigecop-blue mb-4">Datos del pago</h2>

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

      <section className="mt-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
          Criterios de aceptación
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CardCriterioAceptacion
            numero={1}
            texto="El registro del pago marca la estimación como pagada y actualiza el avance financiero del contrato."
          />
          <CardCriterioAceptacion
            numero={2}
            texto="Quedan capturados fecha, importe, referencia bancaria y usuario que realizó el registro."
          />
        </div>
      </section>
    </div>
  );
}
