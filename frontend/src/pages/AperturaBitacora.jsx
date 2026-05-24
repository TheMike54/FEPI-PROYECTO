import { useState } from 'react';
import Breadcrumb from '../components/ui/Breadcrumb.jsx';
import BadgeSprint from '../components/ui/BadgeSprint.jsx';
import CardCriterioAceptacion from '../components/ui/CardCriterioAceptacion.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import AvisoSoloLectura from '../components/ui/AvisoSoloLectura.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import { partesBitacoraDummy, contratoDummy } from '../data/dummy.js';

function ParteCard({ parte, valores, onChange }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-5">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-sigecop-blue text-white flex items-center justify-center font-bold flex-shrink-0">
          {parte.num}
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-sigecop-accent uppercase tracking-wider">
            Parte {parte.num}
          </div>
          <div className="font-bold text-slate-900">{parte.titulo}</div>
        </div>
        <span className="inline-block px-2 py-1 bg-green-100 text-sigecop-green-validation text-xs font-semibold rounded">
          ✓ Designado
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="sg-label">Firmante autorizado</label>
          <input
            className="sg-input"
            value={valores.firmante}
            onChange={(e) => onChange('firmante', e.target.value)}
          />
        </div>
        <div>
          <label className="sg-label">{parte.cargoLabel}</label>
          <input
            className="sg-input"
            value={valores.cargo}
            onChange={(e) => onChange('cargo', e.target.value)}
          />
        </div>
        <div>
          <label className="sg-label">Correo electrónico</label>
          <input
            type="email"
            className="sg-input"
            value={valores.correo}
            onChange={(e) => onChange('correo', e.target.value)}
          />
        </div>
        <div>
          <label className="sg-label">Firma electrónica</label>
          <input
            disabled
            className="sg-input bg-slate-100 cursor-not-allowed text-slate-400"
            value="Disponible en Sprint siguiente"
            readOnly
          />
        </div>
      </div>
    </div>
  );
}

export default function AperturaBitacora() {
  const { showToast } = useToast();
  const { soloLectura, mostrarMeta } = useVistaHU('HU-08');
  const [estado, setEstado] = useState(
    partesBitacoraDummy.reduce((acc, p) => {
      acc[p.num] = { firmante: p.firmante, cargo: p.cargo, correo: p.correo };
      return acc;
    }, {})
  );

  const handleChange = (num) => (campo, valor) => {
    setEstado((prev) => ({ ...prev, [num]: { ...prev[num], [campo]: valor } }));
  };

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Inicio', href: '/' },
          { label: 'Bitácora' },
          { label: 'Apertura' }
        ]}
      />

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-sigecop-blue">
          Apertura formal de la bitácora del contrato
        </h1>
        <BadgeSprint codigo="HU-08" sprint="Sprint 1" />
      </div>

      {soloLectura && <AvisoSoloLectura />}

      <div className="bg-blue-50 border-l-4 border-sigecop-blue px-4 py-3 mb-6 rounded-r-md">
        <div className="text-xs font-semibold text-sigecop-blue uppercase">Contrato seleccionado</div>
        <div className="font-bold text-slate-900 mt-1">
          {contratoDummy.folio} · {contratoDummy.objeto}
        </div>
        <div className="text-xs text-slate-600 mt-0.5">{contratoDummy.contratista}</div>
      </div>

      <h2 className="text-lg font-bold text-sigecop-blue mb-4">
        Designación de firmantes autorizados
      </h2>

      <div className="space-y-4">
        {partesBitacoraDummy.map((p) => (
          <ParteCard
            key={p.num}
            parte={p}
            valores={estado[p.num]}
            onChange={handleChange(p.num)}
          />
        ))}
      </div>

      <div className="mt-6 bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 rounded-r-md">
        <div className="text-sm font-semibold text-sigecop-amber-attention">⚠️ Evento formal inalterable</div>
        <p className="text-sm text-slate-800 mt-1">
          Esta apertura se registrará como evento formal inalterable conforme al art. 46 último párrafo
          LOPSRM y a los arts. 122-123 RLOPSRM. Una vez abierta, la fecha y hora quedan registradas
          y no pueden modificarse.
        </p>
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
            Abrir bitácora
          </button>
        </div>
      )}

      {mostrarMeta && (
        <section className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
            Criterios de aceptación
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CardCriterioAceptacion
              numero={1}
              texto="Existe una bitácora única por contrato con las tres partes ligadas y sus firmantes autorizados."
            />
            <CardCriterioAceptacion
              numero={2}
              texto="La fecha y hora de apertura queda registrada como evento formal inalterable."
            />
          </div>
        </section>
      )}
    </div>
  );
}
