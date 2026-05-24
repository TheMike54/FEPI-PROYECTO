import { useState, useMemo } from 'react';
import { useToast } from '../components/ui/Toast.jsx';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import { contratoDummy, presupuestoDummy, soportesPagoDummy } from '../data/dummy.js';

const moneda = (n) => `$ ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function SuficienciaPresupuestal({ montoEstimacion, onMontoChange }) {
  const monto = Number(montoEstimacion) || 0;
  const disponibleAntes = presupuestoDummy.techo - presupuestoDummy.comprometido;
  const disponibleDespues = disponibleAntes - monto;
  const excede = monto > disponibleAntes;

  const colorClasses = excede
    ? 'bg-red-50 border-red-500'
    : 'bg-white border-slate-200';

  return (
    <div className={`border-l-4 rounded-r-md p-5 mb-6 ${colorClasses} ${excede ? '' : 'border-l-4 border-l-sigecop-green-validation'}`}>
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-sigecop-blue">
          Verificación de suficiencia presupuestal
        </h2>
        {excede ? (
          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
            ⚠ Excede el techo disponible
          </span>
        ) : (
          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-sigecop-green-validation">
            ✓ Dentro del techo presupuestal
          </span>
        )}
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-md mb-3 bg-white">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 text-slate-700">Techo presupuestal anual (art. 24 LOPSRM)</td>
              <td className="px-4 py-3 text-right font-mono">{moneda(presupuestoDummy.techo)}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 text-slate-700">(-) Comprometido a la fecha</td>
              <td className="px-4 py-3 text-right font-mono">{moneda(presupuestoDummy.comprometido)}</td>
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-800">(=) Disponible antes de esta estimación</td>
              <td className="px-4 py-3 text-right font-mono font-semibold">{moneda(disponibleAntes)}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 text-slate-700">(-) Esta estimación (monto editable)</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-slate-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={`sg-input text-right max-w-[200px] ${excede ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                    value={montoEstimacion}
                    onChange={(e) => onMontoChange(e.target.value)}
                  />
                </div>
              </td>
            </tr>
            <tr className={excede ? 'bg-red-100' : 'bg-sigecop-blue-light'}>
              <td className={`px-4 py-3 font-bold ${excede ? 'text-red-700' : 'text-sigecop-blue'}`}>
                (=) Disponible tras pago
              </td>
              <td className={`px-4 py-3 text-right font-mono font-bold ${excede ? 'text-red-700' : 'text-sigecop-blue'}`}>
                {moneda(disponibleDespues)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {excede ? (
        <div className="bg-red-50 border-l-4 border-red-500 px-4 py-3 text-sm text-red-800 rounded-r-md">
          <strong>⚠ Excede el techo presupuestal disponible (art. 24 LOPSRM).</strong>
          {' '}Requiere ampliación presupuestal antes de generar la instrucción de pago.
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Si el monto excede el disponible, el sistema bloquea la generación de la instrucción de pago.
        </p>
      )}
    </div>
  );
}

function SoportesObligatorios({ soportes, onToggle }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
      <h2 className="text-lg font-bold text-sigecop-blue mb-3">Soportes obligatorios</h2>
      <p className="text-sm text-slate-600 mb-3">
        Los tres documentos deben estar cargados para generar la instrucción de pago.
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left p-3 font-semibold">Documento</th>
              <th className="text-center p-3 font-semibold">Estado</th>
              <th className="text-center p-3 font-semibold w-40">Acción</th>
            </tr>
          </thead>
          <tbody>
            {soportes.map((s) => (
              <tr key={s.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="p-3">{s.documento}</td>
                <td className="p-3 text-center">
                  {s.cargado ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-sigecop-green-validation">
                      ✓ Cargado
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-sigecop-amber-attention">
                      ⏳ Pendiente
                    </span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <button
                    type="button"
                    className="text-xs px-3 py-1 rounded border border-sigecop-accent text-sigecop-accent hover:bg-sigecop-blue-light transition-colors"
                    onClick={() => onToggle(s.id)}
                  >
                    {s.cargado ? 'Marcar pendiente' : 'Marcar como cargado'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SemaforoPlazoPago({ diaActual = 6, diaLimite = 20 }) {
  const verde = diaActual <= 12;
  const ambar = diaActual > 12 && diaActual <= 17;
  const rojo  = diaActual > 17;

  const colorBadge = verde ? 'bg-green-100 text-sigecop-green-validation'
    : ambar ? 'bg-amber-100 text-sigecop-amber-attention'
    : 'bg-red-100 text-red-700';
  const colorBarra = verde ? 'bg-sigecop-green-validation'
    : ambar ? 'bg-sigecop-amber-attention'
    : 'bg-red-500';
  const etiqueta = verde ? 'Verde (en tiempo)'
    : ambar ? 'Amarillo (próximo a vencer)'
    : 'Rojo (vencido)';
  const pct = Math.min(100, (diaActual / diaLimite) * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-sigecop-blue">
          Semáforo del plazo de pago (art. 54 LOPSRM)
        </h2>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colorBadge}`}>
          Día {diaActual} de {diaLimite} — {etiqueta}
        </span>
      </div>

      <div className="h-3 bg-slate-200 rounded-full overflow-hidden relative">
        <div className={`h-full ${colorBarra} transition-all`} style={{ width: `${pct}%` }} />
        <div className="absolute inset-0 flex">
          <div className="border-r border-white/60" style={{ width: '60%' }} />
          <div className="border-r border-white/60" style={{ width: '25%' }} />
          <div style={{ width: '15%' }} />
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 text-[10px] text-slate-500">
        <div>0-12 d · Verde</div>
        <div className="text-center">13-17 d · Amarillo</div>
        <div className="text-right">18-20 d · Rojo</div>
      </div>

      <p className="text-xs text-slate-500 mt-3">
        El sistema notifica a Finanzas y Dependencia automáticamente al entrar en amarillo.
      </p>
    </div>
  );
}

export default function TransitoPago() {
  const { showToast } = useToast();
  const { soloLectura } = useVistaHU('HU-20');

  const [montoEstimacion, setMontoEstimacion] = useState(String(presupuestoDummy.estimacion));
  const [soportes, setSoportes] = useState(soportesPagoDummy);

  const toggleSoporte = (id) => {
    setSoportes((prev) => prev.map((s) => s.id === id ? { ...s, cargado: !s.cargado } : s));
  };

  const todosCargados = useMemo(() => soportes.every((s) => s.cargado), [soportes]);
  const disponibleAntes = presupuestoDummy.techo - presupuestoDummy.comprometido;
  const excedePresupuesto = Number(montoEstimacion) > disponibleAntes;
  const puedeGenerar = todosCargados && !excedePresupuesto;

  const handleGenerar = () => {
    if (excedePresupuesto) {
      showToast('Bloqueado: excede el techo presupuestal disponible (art. 24 LOPSRM).');
      return;
    }
    if (!todosCargados) {
      showToast('Bloqueado: faltan soportes obligatorios por cargar.');
      return;
    }
    showToast('Pendiente para Sprint siguiente.');
  };

  return (
    <div>
      <HeaderVista
        huId="HU-20"
        titulo="Tránsito a pago: carga de soportes y verificación de suficiencia presupuestal"
        sprint="Sprint 5"
        rolAcademico="Contratista y finanzas"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Pagos' },
          { label: 'Tránsito a pago' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[
          { label: 'Estimación', value: 'EST-2026-003', resaltado: true, sufijo: 'autorizada' },
          { label: 'Neto', value: '$ 1,285,750.00', resaltado: true }
        ]}
      />

      <RegionEditable disabled={soloLectura}>
        <SuficienciaPresupuestal montoEstimacion={montoEstimacion} onMontoChange={setMontoEstimacion} />
        <SoportesObligatorios soportes={soportes} onToggle={toggleSoporte} />
      </RegionEditable>

      <SemaforoPlazoPago diaActual={6} diaLimite={20} />

      {!puedeGenerar && (
        <div className="bg-amber-50 border-l-4 border-sigecop-amber-attention px-4 py-3 mb-4 text-sm text-slate-800 rounded-r-md">
          <strong>⚠ Generación de instrucción de pago bloqueada.</strong>
          <ul className="list-disc list-inside mt-1 text-xs text-slate-700">
            {excedePresupuesto && <li>El monto excede el techo presupuestal disponible (art. 24 LOPSRM).</li>}
            {!todosCargados && <li>Hay soportes obligatorios pendientes de carga.</li>}
          </ul>
        </div>
      )}

      {!soloLectura && (
        <div className="flex justify-end gap-3">
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
            disabled={!puedeGenerar}
            onClick={handleGenerar}
            title={!puedeGenerar ? 'Hay bloqueos pendientes — revisa los avisos arriba' : ''}
          >
            💸 Generar instrucción de pago
          </button>
        </div>
      )}

      <SeccionCriterios
        huId="HU-20"
        criterios={[
          { numero: 1, texto: 'El sistema verifica suficiencia presupuestal contra el techo anual y bloquea la generación de la instrucción de pago si el monto excede lo disponible (art. 24 LOPSRM).' },
          { numero: 2, texto: 'Un semáforo muestra el avance del plazo de 20 días naturales para pago (art. 54 LOPSRM) y emite alertas al entrar en amarillo.' },
          { numero: 3, texto: 'La instrucción de pago solo puede generarse cuando todos los soportes obligatorios (factura, CFDI, estado de fianza) están cargados.' }
        ]}
      />
    </div>
  );
}
