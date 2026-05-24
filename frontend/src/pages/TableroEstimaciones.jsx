import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import {
  contratoDummy,
  estimacionesTableroDummy,
  pendientesEstimacionPorRol
} from '../data/dummy.js';

// Pipeline canonico de una estimacion aceptada. La vista no muestra rechazadas
// (CA-1: viven en HU-14 historial). El orden importa porque el stepper marca
// como "completado" todo lo anterior al estado actual.
const FASES = ['Presentada', 'En revisión', 'Autorizada', 'En pago', 'Pagada'];

// Colores para el badge — reutilizan la paleta de otras vistas (verde valida,
// ambar atencion, azul info, slate inicial).
const COLOR_ESTADO = {
  'Presentada':  'bg-slate-200 text-slate-700',
  'En revisión': 'bg-amber-100 text-sigecop-amber-attention',
  'Autorizada':  'bg-sigecop-blue-light text-sigecop-blue',
  'En pago':     'bg-sigecop-blue-light text-sigecop-blue',
  'Pagada':      'bg-green-100 text-sigecop-green-validation'
};

function EstadoBadge({ estado }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${COLOR_ESTADO[estado] || 'bg-slate-200 text-slate-600'}`}>
      {estado}
    </span>
  );
}

function MiniStepper({ estado }) {
  const idx = FASES.indexOf(estado);
  return (
    <div className="flex items-center gap-1.5 mt-3" aria-label={`Línea de tiempo: ${estado}`}>
      {FASES.map((fase, i) => {
        const completado = i < idx;
        const actual = i === idx;
        let dotCls = 'w-2.5 h-2.5 rounded-full border-2 ';
        if (actual) {
          dotCls += 'bg-sigecop-accent border-sigecop-accent';
        } else if (completado) {
          dotCls += 'bg-sigecop-blue border-sigecop-blue';
        } else {
          dotCls += 'bg-white border-slate-300';
        }
        const lineCls =
          'flex-1 h-0.5 ' + (i < idx ? 'bg-sigecop-blue' : 'bg-slate-200');
        return (
          <div key={fase} className="flex items-center flex-1 last:flex-none">
            <div className={dotCls} title={fase} />
            {i < FASES.length - 1 && <div className={lineCls} />}
          </div>
        );
      })}
    </div>
  );
}

function ContadoresFases({ estimaciones }) {
  const cuenta = FASES.map((fase) => ({
    fase,
    n: estimaciones.filter((e) => e.estado === fase).length
  }));
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {cuenta.map(({ fase, n }) => (
        <div key={fase} className="bg-white border border-slate-200 rounded-md p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            {fase}
          </div>
          <div className="text-2xl font-bold text-sigecop-blue mt-1">{n}</div>
        </div>
      ))}
    </div>
  );
}

function TarjetaEstimacion({ est }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Estimación
          </div>
          <div className="text-lg font-bold text-sigecop-blue">N.º {est.numero}</div>
        </div>
        <EstadoBadge estado={est.estado} />
      </div>
      <div className="text-sm text-slate-700">
        Periodo <strong>{est.periodo}</strong>
      </div>
      <div className="text-sm text-slate-700 font-mono mt-0.5">{est.monto}</div>
      <MiniStepper estado={est.estado} />
    </div>
  );
}

export default function TableroEstimaciones() {
  const { rol } = useSesion();
  // Mismo patron que HU-09 (EmisionNotas): el panel "Mis pendientes" cambia con
  // el rol activo en modo aplicacion; en modo proyecto (rol === null) se usa el
  // residente por defecto.
  const rolEfectivo = rol ?? 'residente';
  const pendientes = pendientesEstimacionPorRol[rolEfectivo] ?? [];

  return (
    <div>
      <HeaderVista
        huId="HU-17"
        titulo="Tablero de estimaciones"
        sprint="Sprint 8"
        rolAcademico="Residente"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Estimaciones' },
          { label: 'Tablero' }
        ]}
      />

      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[{ value: contratoDummy.contratista }]}
      />

      <ContadoresFases estimaciones={estimacionesTableroDummy} />

      <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-1">
          Estimaciones aceptadas y en proceso
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          No se muestran las rechazadas — su historial está en HU-14.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {estimacionesTableroDummy.map((est) => (
            <TarjetaEstimacion key={est.numero} est={est} />
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-1">
          Mis pendientes
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Pendientes para el rol activo. En modo proyecto se muestran los del residente.
        </p>
        {pendientes.length === 0 ? (
          <div className="text-sm text-slate-400 italic">
            No tienes pendientes en este momento.
          </div>
        ) : (
          <ul className="space-y-2">
            {pendientes.map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-800 bg-sigecop-blue-light/40 px-3 py-2 rounded-md"
              >
                <span className="text-sigecop-accent">▸</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SeccionCriterios
        huId="HU-17"
        criterios={[
          { numero: 1, texto: 'El tablero muestra solo estimaciones aceptadas y en proceso (no las rechazadas, que viven en el historial).' },
          { numero: 2, texto: 'El panel "Mis pendientes" filtra los pendientes según el rol del usuario autenticado.' }
        ]}
      />
    </div>
  );
}
