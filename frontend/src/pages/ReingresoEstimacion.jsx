import { useState } from 'react';
import { useToast } from '../components/ui/Toast.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import {
  contratoDummy,
  observacionesRechazoDummy,
  historicoVersionesDummy,
  reingresoBannerDummy
} from '../data/dummy.js';

function SeveridadBadge({ severidad }) {
  const colors = {
    'Alta':  'bg-red-100 text-red-700',
    'Media': 'bg-amber-100 text-sigecop-amber-attention',
    'Baja':  'bg-slate-200 text-slate-700'
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[severidad] || 'bg-slate-200 text-slate-600'}`}>
      {severidad}
    </span>
  );
}

function EstadoVersionBadge({ estado }) {
  const colors = {
    'Aceptada':   'bg-green-100 text-sigecop-green-validation',
    'Rechazada':  'bg-red-100 text-red-700',
    'Borrador':   'bg-slate-200 text-slate-600',
    'En proceso': 'bg-sigecop-blue-light text-sigecop-blue'
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[estado] || 'bg-slate-200 text-slate-600'}`}>
      {estado}
    </span>
  );
}

export default function ReingresoEstimacion() {
  const { showToast } = useToast();
  const { soloLectura } = useVistaHU('HU-16');
  const [nota, setNota] = useState('');
  const [confirmado, setConfirmado] = useState(false);

  const puedeReingresar = nota.trim().length > 0 && confirmado;

  return (
    <div>
      <HeaderVista
        huId="HU-16"
        titulo="Reingreso de estimación tras rechazo"
        sprint="Sprint 8"
        rolAcademico="Contratista"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Estimaciones' },
          { label: 'Reingreso' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[
          { value: contratoDummy.contratista },
          {
            value: (
              <>
                Estimación {reingresoBannerDummy.numero} · {reingresoBannerDummy.periodo} ·{' '}
                <span className="text-red-700 font-bold">RECHAZADA</span>
              </>
            )
          }
        ]}
      />

      {/* Observaciones de la version rechazada — display, fuera de RegionEditable. */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden mb-6">
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Observaciones de la versión rechazada
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              className="sg-btn-secondary"
              onClick={() => showToast('Pendiente para Sprint siguiente.')}
            >
              ⬇ Descargar PDF
            </button>
            <button
              type="button"
              className="sg-btn-secondary"
              onClick={() => showToast('Pendiente para Sprint siguiente.')}
            >
              ⬇ Descargar Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3 font-semibold w-10">#</th>
                <th className="text-left p-3 font-semibold">Concepto</th>
                <th className="text-left p-3 font-semibold">Observación</th>
                <th className="text-left p-3 font-semibold w-28">Severidad</th>
              </tr>
            </thead>
            <tbody>
              {observacionesRechazoDummy.map((o, i) => (
                <tr key={o.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs">{i + 1}</td>
                  <td className="p-3 font-semibold">{o.concepto}</td>
                  <td className="p-3 text-slate-700">{o.observacion}</td>
                  <td className="p-3"><SeveridadBadge severidad={o.severidad} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nueva version — captura, en RegionEditable. */}
      <RegionEditable disabled={soloLectura}>
        <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
            Nueva versión
          </h2>
          <div className="mb-4">
            <label className="sg-label">Nota de atención a observaciones</label>
            <textarea
              className="sg-input"
              rows="4"
              placeholder="Describe cómo se atendieron las observaciones de la versión rechazada."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 mb-4">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
            />
            Confirmo que atendí las observaciones de la versión rechazada.
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              className="sg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!puedeReingresar}
              onClick={() => showToast('Pendiente para Sprint siguiente.')}
            >
              Reingresar estimación (nueva versión)
            </button>
          </div>
        </div>
      </RegionEditable>

      {/* Historico de versiones — display, evidencia CA-1. */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Histórico de versiones
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            La nueva versión se trata como bloque completo independiente; la rechazada
            queda como histórico vinculado.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3 font-semibold w-24">Versión</th>
                <th className="text-left p-3 font-semibold">Fecha</th>
                <th className="text-left p-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {historicoVersionesDummy.map((v) => (
                <tr key={v.version} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-mono font-semibold">{v.version}</td>
                  <td className="p-3 text-slate-700">{v.fecha}</td>
                  <td className="p-3"><EstadoVersionBadge estado={v.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SeccionCriterios
        huId="HU-16"
        criterios={[
          { numero: 1, texto: 'La nueva versión se trata como bloque completo independiente y la versión rechazada queda como histórico vinculado.' },
          { numero: 2, texto: 'El listado de observaciones de la versión rechazada está disponible para descarga en PDF o Excel.' }
        ]}
      />
    </div>
  );
}
