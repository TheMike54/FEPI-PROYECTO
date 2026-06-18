import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { historiasUsuario } from '../../data/dummy.js';
import { nivelDe } from '../../data/permisos.js';
import { useSesion } from '../../context/SesionContext.jsx';

// BLOQUE 4 — navegación modo-sistema (mockup `docs/mockups/sigecop-modo-sistema.html`). Pase de diseño/UX:
// sidebar GUINDA institucional, grupos por flujo y sub-pasos COLAPSABLES (acordeón) para que no se amontone.
// REGLA DE ORO: SOLO presentación/navegación — NO cambia rutas, contenido ni gating. Cada HU sigue con su
// propia ruta e identificable (no se funden). Se conserva CADA href con su MISMO gating (HU por `nivelDe`
// —lee permisos.js, no lo toca—; rutas fijas por rol). `permisos.js` NO se toca.
//
// ACORDEÓN ↔ SUITE: los sub-items se ocultan al colapsar. La suite navega con `aside a[href=...]`; los
// helpers de test (`goToViaSidebar`/`sidebarLinkFor`, e2e/_helpers.js) expanden el flujo antes de hacer clic
// (cada chevron lleva `data-accordion-toggle`). Es plumbing de test, no lógica de navegación.

const itemBase = 'flex items-center gap-2.5 px-3 py-2 text-[13.5px] transition-colors border-l-[3px]';
const linkClass = ({ isActive }) =>
  `${itemBase} flex-1 min-w-0 ${
    isActive ? 'bg-guinda-dark border-dorado text-white font-semibold' : 'border-transparent text-white/85 hover:bg-white/10 hover:text-white'
  }`;
const subLinkClass = ({ isActive }) =>
  `flex items-center gap-2 pl-9 pr-3 py-1.5 text-[12.5px] transition-colors border-l-[3px] ${
    isActive ? 'bg-guinda-dark border-dorado text-white font-medium' : 'border-transparent text-white/70 hover:bg-white/8 hover:text-white'
  }`;
const grupoClass = 'text-[10px] uppercase tracking-[0.1em] text-white/45 px-4 pt-4 pb-1.5';
const huPill = 'ml-auto text-[10px] text-white/40 font-medium flex-shrink-0';

// Índice HU-código → {ruta, titulo, icono}.
const HU = Object.fromEntries(historiasUsuario.map((h) => [h.codigo, h]));
const T = ['residente', 'contratista', 'supervision']; // equipo de bitácora/estimación

// Estructura por grupos → flujos → (sub-pasos). Cada item:
//  · { hu } gated por nivelDe(hu, rol) !== null; ruta/título/icono de la HU.
//  · { ruta, roles, label, icono } ruta fija (ambiente/admin), gated por rol ∈ roles.
//  · `children` = sub-pasos (mismos tipos). Un flujo con children es un ACORDEÓN.
const GRUPOS = [
  {
    titulo: 'Flujos',
    items: [
      { hu: 'HU-01', icono: '📄', children: [{ hu: 'HU-02', label: 'Fianzas / garantías' }] },
      { hu: 'HU-12', icono: '📐', label: 'Ciclo de estimación', children: [
        { hu: 'HU-13', label: 'Presentar' },
        { hu: 'HU-15', label: 'Revisión / autorización' },
        { hu: 'HU-16', label: 'Reingreso' },
        { hu: 'HU-14', label: 'Historial' },
        { ruta: '/estimaciones/ambiente', roles: T, label: 'Recorrido por bloques', icono: '🧱' },
      ] },
      { hu: 'HU-08', icono: '📓', label: 'Bitácora', children: [
        { ruta: '/bitacora/por-firmar', roles: T, label: 'Por firmar', icono: '✍️' },
        { hu: 'HU-09', label: 'Emitir notas' },
        { hu: 'HU-10', label: 'Consultar / buscar' },
        { hu: 'HU-11', label: 'Minutas y visitas' },
        { ruta: '/bitacora/ambiente', roles: T, label: 'Recorrido por bloques', icono: '📒' },
      ] },
      { hu: 'HU-06', icono: '🏗️', label: 'Avance y seguimiento', children: [
        { hu: 'HU-05', label: 'Curva de avance' },
        { hu: 'HU-07', label: 'Alertas de atraso' },
        { ruta: '/seguimiento/ambiente', roles: T, label: 'Recorrido por bloques', icono: '📈' },
      ] },
      { hu: 'HU-20', icono: '💳', label: 'Pago y tránsito', children: [
        { hu: 'HU-21', label: 'Registro del pago' },
        { ruta: '/pagos/ambiente', roles: ['finanzas', 'contratista', 'residente', 'dependencia'], label: 'Recorrido por bloques', icono: '💸' },
      ] },
      { hu: 'HU-03', icono: '📝', label: 'Convenios', children: [
        { ruta: '/contratos/convenio-ambiente', roles: ['dependencia', 'residente', 'contratista', 'supervision'], label: 'Recorrido por bloques', icono: '📐' },
      ] },
      { ruta: '/contratos/finiquito', roles: ['dependencia', 'residente'], label: 'Cierre / finiquito', icono: '🏁', children: [
        { ruta: '/contratos/cierre', roles: ['dependencia', 'residente'], label: 'Recorrido por bloques', icono: '🧾' },
      ] },
      { hu: 'HU-04', icono: '🗂️', label: 'Expediente', children: [
        { ruta: '/contratos/expediente-ambiente', roles: ['residente', 'contratista', 'supervision', 'dependencia'], label: 'Cierre documental (por bloques)', icono: '📑' },
      ] },
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

// HU colocadas en algún flujo o sub-paso (red de seguridad "Otras pantallas"). Solo cuenta códigos reales.
const codigosDe = (items) => items.flatMap((i) => [
  ...(i.hu && HU[i.hu] ? [i.hu] : []),
  ...(i.children ? codigosDe(i.children) : []),
]);
const HU_COLOCADAS = new Set(GRUPOS.flatMap((g) => codigosDe(g.items)));

export default function Sidebar() {
  const { rol, salirRol } = useSesion();
  const { pathname } = useLocation();

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

  // Flujo (padre) cuyo propio enlace o alguno de sus hijos corresponde a la pantalla actual → abierto por defecto.
  const flowKeyForPath = () => {
    for (const g of GRUPOS) {
      for (const it of g.items) {
        const r = resolver(it);
        if (!r) continue;
        if (r.to === pathname) return r.key;
        for (const ch of it.children || []) {
          const rc = resolver(ch);
          if (rc && rc.to === pathname) return r.key;
        }
      }
    }
    return null;
  };

  const [abiertos, setAbiertos] = useState({});
  // Abre el flujo de la pantalla actual (sin cerrar lo que el usuario haya abierto).
  useEffect(() => {
    const k = flowKeyForPath();
    if (k) setAbiertos((prev) => (prev[k] ? prev : { ...prev, [k]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, rol]);
  const toggle = (key) => setAbiertos((prev) => ({ ...prev, [key]: !prev[key] }));

  // HU visibles que no quedaron en ningún flujo → red de seguridad (no se pierde ningún enlace).
  const huSueltas = historiasUsuario
    .filter((h) => h.codigo !== 'HU-00' && !HU_COLOCADAS.has(h.codigo) && nivelDe(h.codigo, rol) !== null)
    .map((h) => ({ key: h.codigo, to: h.ruta, icono: h.icono, label: h.titulo, pill: h.codigo, lectura: nivelDe(h.codigo, rol) === 'C' }));

  // La pista de HU va discreta a la derecha (como el mockup). El estado "solo lectura" NO se rotula en el
  // sidebar (sí en Inicio) para no saturar y que los nombres quepan en una línea.
  const Pill = (r) => (r.pill ? <span className={huPill}>{r.pill}</span> : null);

  // Renderiza un item de flujo (con su acordeón de sub-pasos si aplica).
  const Flujo = (item) => {
    const r = resolver(item);
    const subs = (item.children || []).map(resolver).filter(Boolean);
    // GATING: si el PADRE del flujo no es accesible para el rol pero SÍ lo es algún HIJO (p. ej.
    // dependencia ve "Curva" HU-05 pero no el padre "Avance" HU-06), se PROMUEVEN los hijos accesibles a
    // items planos → no se pierde ningún enlace (equivalente a la lista plana anterior). NO cambia gating.
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
    const tieneSubs = subs.length > 0;
    const abierto = !!abiertos[r.key];
    return (
      <div key={r.key}>
        <div className="flex items-stretch">
          <NavLink to={r.to} end={r.to === '/'} className={linkClass}>
            <span className="text-base leading-none flex-shrink-0">{r.icono}</span>
            <span className="leading-snug">{r.label}</span>
            {Pill(r)}
          </NavLink>
          {tieneSubs && (
            <button
              type="button"
              onClick={() => toggle(r.key)}
              data-accordion-toggle={r.key}
              aria-expanded={abierto}
              aria-label={`${abierto ? 'Colapsar' : 'Expandir'} ${r.label}`}
              title={abierto ? 'Colapsar' : 'Expandir'}
              className="px-3 text-white/45 hover:text-white transition-colors text-[10px] flex items-center flex-shrink-0"
            >
              {abierto ? '▾' : '▸'}
            </button>
          )}
        </div>
        {tieneSubs && abierto && (
          <div className="py-0.5">
            {subs.map((s) => (
              <NavLink key={s.key} to={s.to} className={subLinkClass}>
                {s.icono && <span className="text-sm leading-none flex-shrink-0 opacity-80">{s.icono}</span>}
                <span className="leading-snug">{s.label}</span>
                {Pill(s)}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-72 bg-guinda text-white flex-shrink-0 overflow-y-auto flex flex-col">
      <div className="flex flex-col min-h-full pb-2">
        {/* Inicio (sin grupo, arriba). */}
        <div className="pt-2">
          <NavLink to="/" end className={linkClass}>
            <span className="text-base leading-none flex-shrink-0">🏠</span>
            <span className="leading-snug">Inicio</span>
          </NavLink>
        </div>

        {GRUPOS.map((g) => {
          // Un flujo se muestra si el padre O algún hijo es accesible (ver promoción de hijos en Flujo).
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
