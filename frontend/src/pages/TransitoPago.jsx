import { useMemo, useState } from 'react';
import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import {
  contratoDummy,
  presupuestoDummy,
  soportesPagoDummy,
  fechaAutorizacionOffsetDias
} from '../data/dummy.js';

const moneda = (n) => `$ ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function diasEntre(desdeISO, hastaDate) {
  const desde = new Date(desdeISO + 'T00:00:00');
  const ms = hastaDate.getTime() - desde.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

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
          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700" data-testid="badge-excede">
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
                    data-testid="input-monto-estimacion"
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
                    data-testid={`btn-toggle-${s.id}`}
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

function SemaforoPlazoPago({ diaActual, diaLimite = 20 }) {
  // Reglas del usuario: verde ≤10, ámbar 11-17, rojo >17.
  const verde = diaActual <= 10;
  const ambar = diaActual > 10 && diaActual <= 17;
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
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colorBadge}`}
          data-testid="semaforo-pago-badge"
          data-color={verde ? 'verde' : ambar ? 'ambar' : 'rojo'}
        >
          Día {diaActual} de {diaLimite} — {etiqueta}
        </span>
      </div>

      <div className="h-3 bg-slate-200 rounded-full overflow-hidden relative">
        <div className={`h-full ${colorBarra} transition-all`} style={{ width: `${pct}%` }} />
        <div className="absolute inset-0 flex">
          <div className="border-r border-white/60" style={{ width: '50%' }} />
          <div className="border-r border-white/60" style={{ width: '35%' }} />
          <div style={{ width: '15%' }} />
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 text-[10px] text-slate-500">
        <div>0-10 d · Verde</div>
        <div className="text-center">11-17 d · Amarillo</div>
        <div className="text-right">18-20 d · Rojo</div>
      </div>

      <p className="text-xs text-slate-500 mt-3">
        El sistema notifica a Finanzas y Dependencia automáticamente al entrar en amarillo.
      </p>
    </div>
  );
}

function AvisoInstruccionGenerada({ fecha, monto }) {
  return (
    <div
      className="bg-green-50 border-l-4 border-sigecop-green-validation px-4 py-3 mb-4 text-sm text-slate-800 rounded-r-md"
      data-testid="aviso-instruccion-generada"
    >
      <strong>✓ Instrucción de pago generada el {fecha}.</strong>{' '}
      Notificación enviada a Finanzas. Plazo de pago: 20 días naturales (art. 54 LOPSRM).
      <div className="text-xs text-slate-600 mt-1">Monto: {monto}</div>
    </div>
  );
}

function NotificacionFinanzas({ fechaHora, monto }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-5 mb-6" data-testid="notificacion-finanzas">
      <h2 className="text-lg font-bold text-sigecop-blue mb-3">Notificación a Finanzas</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Destinatario
          </div>
          <div className="text-slate-900 mt-0.5">Finanzas · {contratoDummy.dependencia}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Fecha y hora
          </div>
          <div className="text-slate-900 mt-0.5 font-mono">{fechaHora}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Monto
          </div>
          <div className="text-slate-900 mt-0.5 font-mono">{monto}</div>
        </div>
      </div>
    </div>
  );
}

export default function TransitoPago() {
  const { soloLectura } = useVistaHU('HU-20');

  const [montoEstimacion, setMontoEstimacion] = useState(String(presupuestoDummy.estimacion));
  const [soportes, setSoportes] = useState(soportesPagoDummy);
  const [instruccion, setInstruccion] = useState(null); // { fechaHora, monto }

  // Calculo del dia actual del plazo a partir de la fecha de autorizacion.
  // fechaAutorizacion = HOY - fechaAutorizacionOffsetDias.
  const { fechaAutorizacionISO, diaActual } = useMemo(() => {
    const hoy = new Date();
    const fa = new Date(hoy);
    fa.setDate(hoy.getDate() - fechaAutorizacionOffsetDias);
    // Fecha LOCAL (no toISOString(), que es UTC y adelanta un dia despues de las
    // 18:00 en Mexico UTC-6) para que el conteo "Dia X de 20" sea determinista.
    const iso = `${fa.getFullYear()}-${String(fa.getMonth() + 1).padStart(2, '0')}-${String(fa.getDate()).padStart(2, '0')}`;
    return { fechaAutorizacionISO: iso, diaActual: diasEntre(iso, hoy) };
  }, []);

  const toggleSoporte = (id) => {
    setSoportes((prev) => prev.map((s) => s.id === id ? { ...s, cargado: !s.cargado } : s));
  };

  const todosCargados = useMemo(() => soportes.every((s) => s.cargado), [soportes]);
  const disponibleAntes = presupuestoDummy.techo - presupuestoDummy.comprometido;
  const excedePresupuesto = Number(montoEstimacion) > disponibleAntes;
  const puedeGenerar = todosCargados && !excedePresupuesto && !instruccion;

  const handleGenerar = () => {
    const ahora = new Date();
    const fechaHora = ahora.toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    setInstruccion({ fechaHora, monto: moneda(Number(montoEstimacion)) });
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
          { label: 'Estimación', value: 'EST-2026-003', resaltado: true, sufijo: `autorizada el ${fechaAutorizacionISO}` },
          { label: 'Neto', value: '$ 1,285,750.00', resaltado: true }
        ]}
      />

      {instruccion && (
        <>
          <AvisoInstruccionGenerada fecha={instruccion.fechaHora} monto={instruccion.monto} />
          <NotificacionFinanzas fechaHora={instruccion.fechaHora} monto={instruccion.monto} />
        </>
      )}

      <RegionEditable disabled={soloLectura || !!instruccion}>
        <SuficienciaPresupuestal montoEstimacion={montoEstimacion} onMontoChange={setMontoEstimacion} />
        <SoportesObligatorios soportes={soportes} onToggle={toggleSoporte} />
      </RegionEditable>

      <SemaforoPlazoPago diaActual={diaActual} diaLimite={20} />

      {!puedeGenerar && !instruccion && (
        <div className="bg-amber-50 border-l-4 border-sigecop-amber-attention px-4 py-3 mb-4 text-sm text-slate-800 rounded-r-md" data-testid="aviso-bloqueo">
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
            className="sg-btn-primary"
            disabled={!puedeGenerar}
            onClick={handleGenerar}
            title={!puedeGenerar ? 'Hay bloqueos pendientes — revisa los avisos arriba' : ''}
            data-testid="btn-generar-instruccion"
          >
            💸 Generar instrucción de pago
          </button>
        </div>
      )}

      <SeccionCriterios
        huId="HU-20"
        criterios={[
          { numero: 1, texto: 'El sistema verifica suficiencia presupuestal contra el techo anual y bloquea la generación de la instrucción de pago si el monto excede lo disponible (art. 24 LOPSRM).' },
          { numero: 2, texto: 'Un semáforo muestra el avance del plazo de 20 días naturales para pago (art. 54 LOPSRM), basado en la fecha de autorización, y avisa al entrar en amarillo.' },
          { numero: 3, texto: 'La instrucción de pago solo puede generarse cuando todos los soportes obligatorios (factura, CFDI, estado de fianza de cumplimiento cuando el contrato lo exija) están cargados.' }
        ]}
      />
    </div>
  );
}
