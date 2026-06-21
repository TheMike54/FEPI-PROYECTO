import { NavLink, useLocation } from 'react-router-dom';
import { historiasUsuario } from '../../data/dummy.js';
import { nivelDe } from '../../data/permisos.js';
import { useSesion } from '../../context/SesionContext.jsx';

// F5 — SIDEBAR PLANO (match `docs/mockups/sigecop-prototipo-ciclos.html`): lista PLANA de ciclos, SIN acordeón.
// Cada ciclo es un item directo a su pantalla/wizard; las vistas TIPO B (sub-pasos del wizard y lecturas "en
// paralelo") ya viven DENTRO de cada ciclo, así que NO se listan en el sidebar. REGLA DE ORO: solo presentación/
// navegación — NO cambia rutas, contenido ni gating. Cada HU conserva su gating (nivelDe lee permisos.js, NO lo
// toca; rutas fijas por rol). Red de PROMOCIÓN: si un rol ve un HIJO pero NO el padre del ciclo (p. ej.
// dependencia ve Historial/Revisión/Curva pero no el padre del ciclo), el hijo se promueve a item plano para no
// perder acceso (ver Flujo()); la red "Otras pantallas" recoge cualquier HU no colocada.

const itemBase = 'flex items-center gap-2.5 px-3 py-2 text-[13.5px] transition-colors border-l-[3px]';
const linkClass = ({ isActive }) =>
  `${itemBase} flex-1 min-w-0 ${
    isActive ? 'bg-guinda-dark border-dorado text-white font-semibold' : 'border-transparent text-white/85 hover:bg-white/10 hover:text-white'
  }`;
const grupoClass = 'text-[10px] uppercase tracking-[0.1em] text-white/45 px-4 pt-4 pb-1.5';
const huPill = 'ml-auto text-[10px] text-white/40 font-medium flex-shrink-0';

// Índice HU-código → {ruta, titulo, icono}.
const HU = Object.fromEntries(historiasUsuario.map((h) => [h.codigo, h]));
const T = ['residente', 'contratista', 'supervision']; // equipo de bitácora/estimación

// Estructura por grupos → ciclos (items planos). Cada item:
//  · { hu } gated por nivelDe(hu, rol) !== null; ruta/título/icono de la HU.
//  · { ruta, roles, label, icono } ruta fija (ambiente/admin), gated por rol ∈ roles.
//  · `children` = sub-pasos/lecturas del ciclo. NO se renderizan bajo el padre (viven DENTRO del ciclo); se
//    conservan SOLO como red de promoción para roles que ven el hijo pero no el padre.
const GRUPOS = [
  {
    titulo: 'Ciclos',
    items: [
      { hu: 'HU-01', icono: '📄' },
      { hu: 'HU-02', icono: '🛡️', label: 'Fianzas / garantías' },
      { hu: 'HU-12', icono: '📐', label: 'Ciclo de estimación', children: [
        { hu: 'HU-13', label: 'Presentar' },
        { hu: 'HU-15', label: 'Revisión / autorización' },
        { hu: 'HU-16', label: 'Reingreso' },
        { hu: 'HU-14', label: 'Historial' },
      ] },
      { ruta: '/bitacora/ambiente', roles: T, icono: '📓', label: 'Bitácora', children: [
        { hu: 'HU-08', label: 'Apertura' },
        { ruta: '/bitacora/por-firmar', roles: T, label: 'Por firmar', icono: '✍️' },
        { hu: 'HU-09', label: 'Emitir notas' },
        { hu: 'HU-10', label: 'Consultar / buscar' },
        { hu: 'HU-11', label: 'Minutas y visitas' },
      ] },
      { ruta: '/seguimiento/trabajos-terminados', roles: ['contratista', 'residente', 'supervision'], icono: '🏗️', label: 'Avance y seguimiento', children: [
        { hu: 'HU-06', label: 'Registrar avance' },
        { hu: 'HU-05', label: 'Curva de avance' },
        { hu: 'HU-07', label: 'Alertas de atraso' },
      ] },
      { hu: 'HU-20', icono: '💳', label: 'Pago y tránsito', children: [
        { hu: 'HU-21', label: 'Registro del pago' },
      ] },
      { hu: 'HU-03', icono: '📝', label: 'Convenios' },
      { ruta: '/contratos/finiquito', roles: ['dependencia', 'residente'], label: 'Cierre / finiquito', icono: '🏁' },
      { hu: 'HU-04', icono: '🗂️', label: 'Expediente' },
    ],
  },
  {
    titulo: 'Vistas ejecutivas',
    items: [
      { hu: 'HU-18', icono: '📊', label: 'Portafolio' },
      { hu: 'HU-17', icono: '📈', label: 'Tablero' },
      { hu: 'HU-19', icono: '📤', label: 'Reportes' },
      { ruta: '/contratos/ciclo-vida', roles: ['residente', 'contratista', 'supervision', 'dependencia'], label: 'Ciclo de vida', icono: '🗺️' },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { ruta: '/admin/empresas', roles: ['dependencia'], label: 'Padrón de empresas', icono: '🏢' },
      { ruta: '/contratos/roster', roles: ['dependencia', 'residente'], label: 'Roster / sustitución', icono: '👥' },
      { ruta: '/usuarios/solicitudes', roles: ['dependencia'], label: 'Solicitudes de registro', icono: '✅' },
    ],
  },
];

// HU colocadas en algún ciclo o sub-paso (red de seguridad "Otras pantallas"). Solo cuenta códigos reales.
const codigosDe = (items) => items.flatMap((i) => [
  ...(i.hu && HU[i.hu] ? [i.hu] : []),
  ...(i.children ? codigosDe(i.children) : []),
]);
const HU_COLOCADAS = new Set(GRUPOS.flatMap((g) => codigosDe(g.items)));

// Pill de RANGO de HU por ciclo: min–max de los códigos (padre + sub-pasos). Un solo HU → "HU-12" (formato
// plano de siempre); varios → "HU 12–16". Ciclo sin HU real (p. ej. finiquito por ruta) → null (sin pill).
const rangoHU = (item) => {
  const nums = codigosDe([item]).map((c) => parseInt(c.slice(3), 10)).filter((n) => !Number.isNaN(n));
  if (nums.length === 0) return null;
  const min = Math.min(...nums), max = Math.max(...nums);
  const f = (n) => String(n).padStart(2, '0');
  return min === max ? `HU-${f(min)}` : `HU ${f(min)}–${f(max)}`;
};

export default function Sidebar({ abierto = true }) {
  const { rol, salirRol } = useSesion();
  const { pathname } = useLocation(); // NAV-E — para resaltar el padre del ciclo en sus rutas hermanas

  // Resuelve un item a forma renderizable {key, to, icono, label, pill, lectura} o null (no aplica al rol).
  const resolver = (item) => {
    if (item.hu) {
      const h = HU[item.hu];
      const nivel = h ? nivelDe(item.hu, rol) : null;
      if (!h || nivel === null) return null; // mismo gating que la versión plana
      return { key: item.hu, to: h.ruta, icono: item.icono || h.icono, label: item.label || h.titulo, pill: item.hu, lectura: nivel === 'C' };
    }
    if (!item.roles.includes(rol)) return null;
    return { key: item.ruta, to: item.ruta, icono: item.icono, label: item.label, pill: null, lectura: false };
  };

  // HU visibles que no quedaron en ningún ciclo → red de seguridad (no se pierde ningún enlace).
  const huSueltas = historiasUsuario
    .filter((h) => h.codigo !== 'HU-00' && !HU_COLOCADAS.has(h.codigo) && nivelDe(h.codigo, rol) !== null)
    .map((h) => ({ key: h.codigo, to: h.ruta, icono: h.icono, label: h.titulo, pill: h.codigo, lectura: nivelDe(h.codigo, rol) === 'C' }));

  // La pista de HU va discreta a la derecha (como el mockup). El estado "solo lectura" NO se rotula en el
  // sidebar (sí en Inicio) para no saturar y que los nombres quepan en una línea.
  const Pill = (r) => (r.pill ? <span className={huPill}>{r.pill}</span> : null);

  // F5: cada ciclo es un item PLANO (sin acordeón). Si el rol ve el PADRE del ciclo → se muestra SOLO el padre
  // (sus sub-pasos/lecturas viven DENTRO del ciclo: wizard + "en paralelo"). Si NO ve el padre pero SÍ algún
  // hijo → se PROMUEVEN los hijos accesibles a items planos (no se pierde acceso). Mismo gating; NO toca
  // permisos.js (equivalente a la promoción que ya existía en la versión con acordeón).
  const Flujo = (item) => {
    const r = resolver(item);
    const subs = (item.children || []).map(resolver).filter(Boolean);
    if (!r) {
      if (subs.length === 0) return null;
      return subs.map((s) => (
        <NavLink key={s.key} to={s.to} className={linkClass}>
          <span className="text-base leading-none flex-shrink-0">{s.icono}</span>
          <span className="leading-snug">{s.label}</span>
          {Pill(s)}
        </NavLink>
      ));
    }
    // El padre de un ciclo con sub-pasos muestra el RANGO de HU (HU 08–11); sin sub-pasos, su HU plano.
    const pillTexto = (item.children && item.children.length) ? (rangoHU(item) || r.pill) : r.pill;
    // NAV-E — el padre del ciclo queda RESALTADO también en sus rutas HERMANAS (sub-pasos/lecturas). Como no
    // están anidadas bajo el padre, el match por prefijo de NavLink no las cubría: se calcula el activo del
    // ciclo contra {ruta del padre + rutas de los hijos} (coincidencia exacta, sin falsos positivos entre ciclos).
    const rutasCiclo = [r.to, ...(item.children || []).map((ch) => (ch.hu ? HU[ch.hu]?.ruta : ch.ruta)).filter(Boolean)];
    const activoCiclo = rutasCiclo.some((rt) => pathname === rt);
    return (
      <NavLink key={r.key} to={r.to} end={r.to === '/'} className={({ isActive }) => linkClass({ isActive: isActive || activoCiclo })}>
        <span className="text-base leading-none flex-shrink-0">{r.icono}</span>
        <span className="leading-snug">{r.label}</span>
        {pillTexto && <span className={huPill}>{pillTexto}</span>}
      </NavLink>
    );
  };

  return (
    <aside
      data-testid="sidebar"
      aria-hidden={abierto ? undefined : true}
      className={`bg-guinda text-white flex-shrink-0 flex flex-col transition-[width] duration-200 ${abierto ? 'w-72 overflow-y-auto' : 'w-0 overflow-hidden'}`}
    >
      <div className="flex flex-col min-h-full pb-2">
        {/* Inicio (sin grupo, arriba). */}
        <div className="pt-2">
          <NavLink to="/" end className={linkClass}>
            <span className="text-base leading-none flex-shrink-0">🏠</span>
            <span className="leading-snug">Inicio</span>
          </NavLink>
        </div>

        {GRUPOS.map((g) => {
          // Un ciclo se muestra si el padre O algún hijo es accesible (ver promoción de hijos en Flujo).
          const visibles = g.items.filter((it) => resolver(it) || (it.children || []).some(resolver));
          if (visibles.length === 0) return null;
          return (
            <div key={g.titulo}>
              <div className={grupoClass}>{g.titulo}</div>
              <nav>{visibles.map(Flujo)}</nav>
            </div>
          );
        })}

        {huSueltas.length > 0 && (
          <div>
            <div className={grupoClass}>Otras pantallas</div>
            <nav>
              {huSueltas.map((s) => (
                <NavLink key={s.key} to={s.to} className={linkClass}>
                  <span className="text-base leading-none flex-shrink-0">{s.icono}</span>
                  <span className="leading-snug">{s.label}</span>
                  {Pill(s)}
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        <div className="mt-auto pt-5 px-3">
          <button
            type="button"
            onClick={salirRol}
            className="text-xs text-white/60 hover:text-white transition-colors"
          >
            ← Cambiar de rol
          </button>
        </div>
      </div>
    </aside>
  );
}
