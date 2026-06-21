import { Link } from 'react-router-dom';
import { useSesion } from '../context/SesionContext.jsx';
import { nivelDe } from '../data/permisos.js';
import { useContratoActivo } from '../context/ContratoActivoContext.jsx';

// P4-ALT — BARRA DE PESTAÑAS-ENLACE de un ciclo. Cada pestaña NAVEGA a su pantalla hermana (rutas que YA
// existen); NO incrusta componentes. Va ARRIBA de cada pantalla del ciclo; el wizard/gating de la pantalla
// queda intacto por debajo. Las pestañas de lectura/otro-actor se gatean por acceso (HU o rol): si el rol no
// tiene acceso, la pestaña se ve deshabilitada (nunca rebota). REGLA TIPO B: las lecturas son enlaces, no bloquean.
// Solo presentación/navegación: NO toca lógica ni zona congelada (lee permisos.js / contrato activo).
const CICLOS = {
  avance: [
    { key: 'trabajos', label: 'Registrar avance', to: '/seguimiento/trabajos-terminados', hu: 'HU-06' },
    { key: 'curva', label: 'Curva de avance', to: '/seguimiento/curva-avance', hu: 'HU-05' },
    { key: 'alertas', label: 'Atrasos', to: '/seguimiento/alertas', hu: 'HU-07' },
  ],
  bitacora: [
    { key: 'bitacora', label: 'Bitácora', to: '/bitacora/ambiente', roles: ['residente', 'contratista', 'supervision'] },
    { key: 'consulta', label: 'Consultar notas', to: '/bitacora/consulta', hu: 'HU-10' },
    { key: 'minutas', label: 'Minutas y visitas', to: '/bitacora/minutas', hu: 'HU-11' },
  ],
  estimacion: [
    { key: 'integrar', label: 'Integrar', to: '/estimaciones/integracion', hu: 'HU-12' },
    { key: 'presentar', label: 'Presentar', to: '/estimaciones/envio', hu: 'HU-13' },
    { key: 'revision', label: 'Revisión', to: '/estimaciones/revision', hu: 'HU-15' },
    { key: 'reingreso', label: 'Reingreso', to: '/estimaciones/reingreso', hu: 'HU-16' },
    { key: 'historial', label: 'Historial', to: '/estimaciones/historial', hu: 'HU-14' },
    { key: 'tablero', label: 'Tablero', to: '/estimaciones/tablero', hu: 'HU-17' },
  ],
  pago: [
    { key: 'transito', label: 'Tránsito y pago', to: '/pagos/transito', hu: 'HU-20' },
    { key: 'registro', label: 'Registro del pago', to: '/pagos/registro', hu: 'HU-21' },
  ],
  convenio: [
    { key: 'convenio', label: 'Convenio', to: '/contratos/modificatorios', hu: 'HU-03' },
    { key: 'consulta', label: 'Bitácora', to: '/bitacora/consulta', hu: 'HU-10' },
    { key: 'expediente', label: 'Expediente', to: '/contratos/expediente', hu: 'HU-04' },
  ],
  expediente: [
    { key: 'expediente', label: 'Expediente', to: '/contratos/expediente', hu: 'HU-04' },
    { key: 'reportes', label: 'Reportes', to: '/reportes', hu: 'HU-19' },
  ],
  finiquito: [
    { key: 'finiquito', label: 'Finiquito', to: '/contratos/finiquito', roles: ['dependencia', 'residente'] },
    { key: 'expediente', label: 'Expediente', to: '/contratos/expediente', hu: 'HU-04' },
  ],
};

// FRENTE 2 — RANGO de HU por ciclo, FUENTE ÚNICA del chip "Ciclo · HU XX–YY". Antes el chip estaba hardcodeado
// en el título de cada ambiente (7 pantallas) y desaparecía al cambiar a una pestaña hermana. Al renderizarlo
// aquí (PestanasCiclo está en TODAS las pantallas de cada ciclo), el chip aparece CONSISTENTE en todas, discreto.
const RANGOS_CICLO = {
  avance: 'HU 05–07',
  bitacora: 'HU 08–11',
  estimacion: 'HU 12–17',
  pago: 'HU 20–21',
  convenio: 'HU-03',
  expediente: 'HU 04 · 19',
  finiquito: 'HU-24',
};

// BUG 2 — el chip muestra el CICLO + la HU PUNTUAL de la pantalla actual (p. ej. "Avance · HU-05"), no el
// rango. La HU puntual sale de la pestaña ACTIVA (cada ruta del ciclo = una HU exacta, ver CICLOS arriba).
// Si la pantalla no es una pestaña con HU (índice del ambiente, o pestaña gateada por rol como bitácora/
// finiquito), cae al RANGO del ciclo (es una vista general, no una HU puntual).
const CICLO_LABEL = {
  avance: 'Avance', bitacora: 'Bitácora', estimacion: 'Estimación', pago: 'Pago',
  convenio: 'Convenio', expediente: 'Expediente', finiquito: 'Finiquito',
};

export default function PestanasCiclo({ ciclo, activo }) {
  const { rol } = useSesion();
  const { contratoId } = useContratoActivo();
  const q = contratoId ? `?contrato=${contratoId}` : '';
  const tabs = CICLOS[ciclo] || [];
  if (tabs.length === 0) return null;
  const base = 'px-3 py-2 text-sm font-semibold border-b-2 -mb-0.5 whitespace-nowrap';
  // BUG 2 — HU puntual de la pantalla actual = HU de la pestaña activa; si no aplica, rango del ciclo.
  const tabActiva = tabs.find((t) => t.key === activo);
  const huActual = tabActiva && tabActiva.hu ? tabActiva.hu : null;
  const chipTexto = RANGOS_CICLO[ciclo]
    ? `${CICLO_LABEL[ciclo] || 'Ciclo'} · ${huActual || RANGOS_CICLO[ciclo]}`
    : null;
  return (
    <div className="flex flex-wrap items-center gap-1 border-b-2 border-borde mb-4 overflow-x-auto" data-testid="pestanas-ciclo" role="tablist">
      {/* FRENTE 2 — chip discreto del ciclo (fuente única). data-testid conservado (no se asierta en specs). */}
      {chipTexto && (
        <span className="mr-2 inline-block text-[11px] font-normal text-sigecop-blue bg-sigecop-blue-light border border-sigecop-blue/20 rounded-full px-2 py-0.5 whitespace-nowrap" data-testid="chip-ciclo-hu">
          {chipTexto}
        </span>
      )}
      {tabs.map((t) => {
        const accesible = t.roles ? t.roles.includes(rol) : nivelDe(t.hu, rol) !== null;
        if (t.key === activo) {
          return (
            <span key={t.key} data-testid={`pestana-${t.key}`} aria-current="page" className={`${base} text-guinda border-guinda`}>
              {t.label}
            </span>
          );
        }
        if (!accesible) {
          return (
            <span key={t.key} data-testid={`pestana-${t.key}`} title="No disponible para tu rol en este ciclo" className={`${base} text-slate-300 border-transparent cursor-not-allowed`}>
              {t.label}
            </span>
          );
        }
        return (
          <Link key={t.key} to={`${t.to}${q}`} data-testid={`pestana-${t.key}`} className={`${base} text-tinta-sec border-transparent hover:text-guinda hover:border-guinda/30`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
