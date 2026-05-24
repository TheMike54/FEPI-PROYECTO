import Header from '../components/layout/Header.jsx';
import { ROLES } from '../data/permisos.js';
import { useSesion } from '../context/SesionContext.jsx';

const ICONOS = {
  residente:   '👷',
  contratista: '🏗️',
  supervision: '🔎',
  dependencia: '🏛️',
  finanzas:    '💰'
};

const DESCRIPCIONES = {
  residente:   'Supervisa la obra por la dependencia, autoriza estimaciones y abre bitácora.',
  contratista: 'Integra estimaciones, captura generadores y emite notas técnicas.',
  supervision: 'Revisa técnicamente las estimaciones y emite observaciones.',
  dependencia: 'Carga fianzas, da seguimiento al expediente y valida tránsito a pago.',
  finanzas:    'Verifica suficiencia presupuestal y registra los pagos efectuados.'
};

export default function SeleccionRol() {
  const { setRol } = useSesion();

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="bg-blue-50 border-l-4 border-sigecop-accent px-4 py-3 mb-8 rounded-r-md">
            <div className="text-sm font-semibold text-sigecop-blue mb-1">
              ℹ️ Modo demostración
            </div>
            <p className="text-sm text-slate-700">
              La selección de rol es temporal para mostrar el sistema "trabajando".
              En el sistema final, el login (HU-00) deducirá el rol automáticamente
              sin selector.
            </p>
          </div>

          <h1 className="text-2xl font-bold text-sigecop-blue mb-1">Ingresar como…</h1>
          <p className="text-sm text-slate-600 mb-6">
            Elige un rol para ver las pantallas y permisos que le corresponden.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRol(r.id)}
                className="sg-card text-left hover:border-sigecop-accent hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl">{ICONOS[r.id]}</div>
                  <div className="flex-1">
                    <h2 className="font-bold text-sigecop-blue group-hover:underline">
                      {r.nombre}
                    </h2>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-snug">
                  {DESCRIPCIONES[r.id]}
                </p>
                <div className="mt-4 text-xs font-semibold text-sigecop-accent">
                  Entrar →
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
