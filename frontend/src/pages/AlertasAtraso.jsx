import { useState } from 'react';
import { useToast } from '../components/ui/Toast.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import {
  contratoDummy,
  conceptosAlertaDummy,
  alertasConfiguradasDummy
} from '../data/dummy.js';

function EstadoBadge({ estado }) {
  const map = {
    Activa:  'bg-green-100 text-sigecop-green-validation',
    Pausada: 'bg-slate-200 text-slate-600'
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${map[estado] || 'bg-slate-200 text-slate-600'}`}>
      {estado}
    </span>
  );
}

export default function AlertasAtraso() {
  const { showToast } = useToast();
  const { soloLectura } = useVistaHU('HU-07');

  const [concepto, setConcepto] = useState(conceptosAlertaDummy[0]);
  const [umbral, setUmbral] = useState(80);
  const [canal, setCanal] = useState('Correo');

  const accionPendiente = () => showToast('Pendiente para Sprint siguiente.');

  return (
    <div>
      <HeaderVista
        huId="HU-07"
        titulo="Configuración de alertas de atraso"
        sprint="Sprint 6"
        rolAcademico="Residente"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Seguimiento' },
          { label: 'Alertas de atraso' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[{ value: contratoDummy.contratista }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de nueva alerta */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-md p-6">
          <h2 className="text-lg font-bold text-sigecop-blue mb-4">Nueva alerta</h2>

          <RegionEditable disabled={soloLectura}>
            <div className="space-y-4">
              <div>
                <label className="sg-label">Concepto a vigilar</label>
                <select
                  className="sg-input"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                >
                  {conceptosAlertaDummy.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="sg-label">Umbral de atraso (%)</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  className="sg-input"
                  value={umbral}
                  onChange={(e) => setUmbral(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Notificar si el avance real es menor a <strong>{umbral}%</strong> del programado.
                </p>
              </div>

              <div>
                <label className="sg-label">Canal de notificación</label>
                <select
                  className="sg-input"
                  value={canal}
                  onChange={(e) => setCanal(e.target.value)}
                >
                  <option>Correo</option>
                  <option>En el sistema</option>
                  <option>Ambos</option>
                </select>
              </div>
            </div>
          </RegionEditable>

          {!soloLectura && (
            <div className="mt-6">
              <button
                type="button"
                className="sg-btn-primary w-full"
                onClick={accionPendiente}
              >
                Crear alerta
              </button>
            </div>
          )}
        </div>

        {/* Tabla de alertas configuradas */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Alertas configuradas ({alertasConfiguradasDummy.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left p-3 font-semibold">Concepto</th>
                  <th className="text-center p-3 font-semibold">Umbral</th>
                  <th className="text-left p-3 font-semibold">Canal</th>
                  <th className="text-center p-3 font-semibold">Estado</th>
                  {!soloLectura && (
                    <th className="text-right p-3 font-semibold">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {alertasConfiguradasDummy.map((a) => (
                  <tr key={a.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="p-3 font-semibold">{a.concepto}</td>
                    <td className="p-3 text-center font-mono">&lt; {a.umbral}%</td>
                    <td className="p-3">{a.canal}</td>
                    <td className="p-3 text-center"><EstadoBadge estado={a.estado} /></td>
                    {!soloLectura && (
                      <td className="p-3 text-right whitespace-nowrap">
                        {a.estado === 'Activa' ? (
                          <button
                            type="button"
                            className="text-xs text-sigecop-accent hover:underline mr-3"
                            onClick={accionPendiente}
                          >
                            Pausar
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-xs text-sigecop-accent hover:underline mr-3"
                            onClick={accionPendiente}
                          >
                            Reanudar
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:underline"
                          onClick={accionPendiente}
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SeccionCriterios
        huId="HU-07"
        criterios={[
          { numero: 1, texto: 'Se pueden crear, pausar y eliminar alertas por concepto sin alterar las del resto.' },
          { numero: 2, texto: 'El sistema solo dispara alertas cuando el avance real es menor al umbral configurado por el usuario.' }
        ]}
      />
    </div>
  );
}
