import { useState } from 'react';
import Breadcrumb from '../components/ui/Breadcrumb.jsx';
import BadgeSprint from '../components/ui/BadgeSprint.jsx';
import CardCriterioAceptacion from '../components/ui/CardCriterioAceptacion.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import AvisoSoloLectura from '../components/ui/AvisoSoloLectura.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import { notasRecientesDummy, tiposNotaResidente, contratoDummy } from '../data/dummy.js';

function NotaPreviewCard({ nota }) {
  const colorClasses = {
    blue: 'bg-sigecop-blue-light text-sigecop-blue',
    amber: 'bg-amber-100 text-sigecop-amber-attention',
    green: 'bg-green-100 text-sigecop-green-validation'
  };
  return (
    <div className="border border-slate-200 rounded-md p-3 hover:bg-slate-50 cursor-pointer transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colorClasses[nota.color] || colorClasses.blue}`}>
          {nota.folio} · {nota.tipo}
        </span>
        <span className="text-xs text-slate-500">{nota.fecha}</span>
      </div>
      <div className="text-xs text-slate-700">{nota.asunto}</div>
      <div className="text-xs text-slate-500 mt-1">Por: {nota.autor}</div>
    </div>
  );
}

export default function EmisionNotas() {
  const { showToast } = useToast();
  const { soloLectura, mostrarMeta } = useVistaHU('HU-09');
  const [tipo, setTipo] = useState(tiposNotaResidente[0]);
  const [asunto, setAsunto] = useState('Solicitud de aclaración sobre cimentación del eje 8-A');
  const [contenido, setContenido] = useState(
    'Se requiere al contratista aclarar el procedimiento de cimentación propuesto para el eje 8-A, considerando los hallazgos del estudio de mecánica de suelos del 12/05/2026. La aclaración deberá presentarse en un plazo no mayor a 3 días hábiles para no afectar el programa de obra.'
  );
  const [vinculo, setVinculo] = useState('— Sin vínculo —');

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Inicio', href: '/' },
          { label: 'Bitácora' },
          { label: 'Emisión de notas' }
        ]}
      />

      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-sigecop-blue">
          Emisión y respuesta de notas tipificadas con firma
        </h1>
        <BadgeSprint codigo="HU-09" sprint="Sprint 2" />
      </div>
      <p className="text-sm text-slate-600 mb-6">
        Tipo de nota disponible según rol autorizado (art. 125 RLOPSRM).
      </p>

      {soloLectura && <AvisoSoloLectura />}

      <div className="bg-blue-50 border-l-4 border-sigecop-blue px-4 py-3 mb-6 rounded-r-md">
        <div className="text-xs font-semibold text-sigecop-blue uppercase">Contrato · Bitácora</div>
        <div className="font-bold text-slate-900 mt-1">
          {contratoDummy.folio} · {contratoDummy.objeto}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: notas recientes */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
            Notas recientes del contrato
          </h2>
          <div className="space-y-2">
            {notasRecientesDummy.map((n) => (
              <NotaPreviewCard key={n.folio} nota={n} />
            ))}
          </div>
        </div>

        {/* Columna derecha: formulario de nueva nota */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-md p-6">
          <h2 className="text-lg font-bold text-sigecop-blue mb-4">Emisión de nueva nota</h2>

          <fieldset disabled={soloLectura} className="contents">
          <div className="space-y-4">
            <div>
              <label className="sg-label">Tipo de nota (según rol)</label>
              <select
                className="sg-input"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                {tiposNotaResidente.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Solo aparecen los tipos de nota que corresponden a tu rol (art. 125 RLOPSRM).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="sg-label">Folio asignado</label>
                <input
                  disabled
                  className="sg-input bg-slate-100 cursor-not-allowed text-slate-500"
                  value="Se asignará al firmar"
                  readOnly
                />
              </div>
              <div>
                <label className="sg-label">Fecha</label>
                <input disabled className="sg-input bg-slate-100" value={hoy} readOnly />
              </div>
            </div>

            <div>
              <label className="sg-label">Asunto *</label>
              <input
                className="sg-input"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
              />
            </div>

            <div>
              <label className="sg-label">Contenido de la nota *</label>
              <textarea
                className="sg-input"
                rows={6}
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
              />
            </div>

            <div>
              <label className="sg-label">Vincular a nota previa</label>
              <select
                className="sg-input"
                value={vinculo}
                onChange={(e) => setVinculo(e.target.value)}
              >
                <option>— Sin vínculo —</option>
                <option>N-041 · Acuerdo sobre modificación</option>
                <option>N-040 · Recepción de trabajos</option>
              </select>
            </div>

            <div className="bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 text-sm text-slate-800 rounded-r-md">
              ⚠️ <strong>Una vez firmada, esta nota será inmutable.</strong> Si necesitas corregir
              algo después, deberás emitir una nueva nota vinculada a ésta.
            </div>

            <div>
              <label className="sg-label">Firma electrónica</label>
              <div className="border-2 border-dashed border-slate-300 rounded-md p-6 text-center bg-slate-50">
                <p className="text-sm text-slate-500">Disponible en Sprint siguiente</p>
                <p className="text-xs text-slate-400 mt-1">
                  Firmante: <strong>Ing. Carlos Hernández García</strong> · Cédula 7845612
                </p>
              </div>
            </div>

            {!soloLectura && (
              <div className="flex justify-end gap-3 pt-2">
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
                  🔒 Firmar y emitir nota
                </button>
              </div>
            )}
          </div>
          </fieldset>
        </div>
      </div>

      {mostrarMeta && (
        <section className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
            Criterios de aceptación
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <CardCriterioAceptacion
              numero={1}
              texto="Solo aparecen los tipos de nota que corresponden al rol del usuario."
            />
            <CardCriterioAceptacion
              numero={2}
              texto="Una nota firmada queda inmutable y solo puede corregirse emitiendo una nueva nota vinculada."
            />
            <CardCriterioAceptacion
              numero={3}
              texto="Cada nota queda registrada con folio, fecha, firmante y vínculo opcional a nota previa."
            />
          </div>
        </section>
      )}
    </div>
  );
}
