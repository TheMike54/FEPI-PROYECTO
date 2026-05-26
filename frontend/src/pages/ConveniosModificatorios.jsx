import { useState } from 'react';
import { useToast } from '../components/ui/Toast.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import {
  contratoDummy,
  tiposConvenioModificatorio,
  historicoVersionesContratoDummy,
  contratoBaseModificatorios
} from '../data/dummy.js';

const formatoMoneda = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0
});

export default function ConveniosModificatorios() {
  const { showToast } = useToast();
  const { soloLectura } = useVistaHU('HU-03');

  const [tipo, setTipo] = useState(tiposConvenioModificatorio[0]);
  const [descripcion, setDescripcion] = useState('Incorporación de partidas adicionales en cimentación del eje 8-A.');
  const [monto, setMonto] = useState(0);
  const [dias, setDias] = useState(0);
  const [motivo, setMotivo] = useState('');

  const { montoOriginal, plazoOriginalDias, umbralMontoExtraordinario, umbralPlazoExtraordinario } = contratoBaseModificatorios;
  const supera50 = monto > umbralMontoExtraordinario || dias > umbralPlazoExtraordinario;

  // El form pide monto y/o días según el tipo, pero ambos siempre disponibles
  // para que el aviso se mantenga reactivo si el usuario alterna.
  const requiereMonto = tipo === 'Monto' || tipo === 'Mixto' || tipo === 'Conceptos';
  const requierePlazo = tipo === 'Plazo' || tipo === 'Mixto';

  return (
    <div>
      <HeaderVista
        huId="HU-03"
        titulo="Trámite de convenios modificatorios"
        sprint="Sprint 6"
        rolAcademico="Dependencia"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Contratos' },
          { label: 'Convenios modificatorios' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[
          { value: contratoDummy.contratista },
          { label: 'Monto original:', value: formatoMoneda.format(montoOriginal), resaltado: true },
          { label: 'Plazo:', value: `${plazoOriginalDias} días`, resaltado: true }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal: formulario */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-md p-6">
          <h2 className="text-lg font-bold text-sigecop-blue mb-4">Nuevo convenio modificatorio</h2>

          <RegionEditable disabled={soloLectura}>
            <div className="space-y-4">
              <div>
                <label className="sg-label">Tipo de cambio</label>
                <select
                  className="sg-input"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  {tiposConvenioModificatorio.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Mixto cubre cambios combinados de monto y plazo.
                </p>
              </div>

              <div>
                <label className="sg-label">Descripción del cambio *</label>
                <textarea
                  className="sg-input"
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="sg-label">
                    Monto del cambio ($){!requiereMonto && <span className="text-slate-400"> · opcional</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="sg-input"
                    value={monto}
                    onChange={(e) => setMonto(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="sg-label">
                    Días de cambio{!requierePlazo && <span className="text-slate-400"> · opcional</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="sg-input"
                    value={dias}
                    onChange={(e) => setDias(Number(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div>
                <label className="sg-label">Motivo / justificación *</label>
                <textarea
                  className="sg-input"
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Fundamento técnico o legal del modificatorio…"
                />
              </div>

              {/* Validación visual del 50% — siempre visible para que el usuario
                  vea el régimen aplicable antes de firmar. */}
              {supera50 ? (
                <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm text-slate-800 rounded-r-md">
                  ⚠️ <strong>Esta modificación supera el 50%.</strong> Aplica el art. 59 Bis
                  LOPSRM: el contratista puede solicitar ajuste de costos indirectos y
                  financiamiento dentro de los 15 días siguientes a la formalización del
                  modificatorio.
                </div>
              ) : (
                <div className="bg-green-50 border-l-4 border-sigecop-green-validation px-4 py-3 text-sm text-slate-800 rounded-r-md">
                  ✅ Modificación conforme al art. 59 LOPSRM. Al no superar el 50% del contrato
                  original (≤ {formatoMoneda.format(umbralMontoExtraordinario)} y ≤ {umbralPlazoExtraordinario} días),
                  no se activa el ajuste de costos del art. 59 Bis.
                </div>
              )}
            </div>
          </RegionEditable>

          {!soloLectura && (
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="sg-btn-secondary"
                onClick={() => showToast('Pendiente para Sprint siguiente.')}
              >
                Guardar borrador
              </button>
              <button
                type="button"
                className="sg-btn-primary"
                onClick={() => showToast('Pendiente para Sprint siguiente.')}
              >
                Registrar convenio modificatorio
              </button>
            </div>
          )}
        </div>

        {/* Columna lateral: resumen del umbral */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
            Referencia del 50%
          </h2>
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-sm space-y-2">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Monto original</div>
              <div className="font-mono">{formatoMoneda.format(montoOriginal)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Umbral 50% (monto)</div>
              <div className="font-mono text-sigecop-amber-attention">
                {formatoMoneda.format(umbralMontoExtraordinario)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Plazo original</div>
              <div className="font-mono">{plazoOriginalDias} días</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Umbral 50% (plazo)</div>
              <div className="font-mono text-sigecop-amber-attention">{umbralPlazoExtraordinario} días</div>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de versiones — display, fuera del RegionEditable. */}
      <div className="mt-8 bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Histórico de versiones del contrato
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left p-3 font-semibold">Versión</th>
                <th className="text-left p-3 font-semibold">Fecha</th>
                <th className="text-left p-3 font-semibold">Autor</th>
                <th className="text-left p-3 font-semibold">Tipo</th>
                <th className="text-left p-3 font-semibold">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {historicoVersionesContratoDummy.map((v) => (
                <tr key={v.version} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-semibold">{v.version}</td>
                  <td className="p-3">{v.fecha}</td>
                  <td className="p-3">{v.autor}</td>
                  <td className="p-3">{v.tipo}</td>
                  <td className="p-3 text-slate-700">{v.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SeccionCriterios
        huId="HU-03"
        criterios={[
          { numero: 1, texto: 'Al autorizarse el modificatorio se generó una nueva versión del catálogo y del programa, sin alterar la versión anterior.' },
          { numero: 2, texto: 'El histórico de versiones registra fecha, autor y motivo del cambio para cada modificatorio.' }
        ]}
      />
    </div>
  );
}
