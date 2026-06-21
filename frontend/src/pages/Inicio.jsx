import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { historiasUsuario } from '../data/dummy.js';
import { ROLES, nivelDe } from '../data/permisos.js';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { api } from '../services/api.js';

// BLOQUE 4 — Inicio modo-sistema (mockup `docs/mockups/sigecop-modo-sistema.html`): cuadrícula LIMPIA de los
// MÓDULOS PRINCIPALES del rol (entradas de flujo + vistas + administración), agrupados — NO la lista larga de
// todas las HU sueltas (los sub-pasos viven en el sidebar). SOLO presentación: respeta el gating real
// (`nivelDe` por HU, rol por ruta fija); NO cambia rutas, permisos ni contenido.

const HU = Object.fromEntries(historiasUsuario.map((h) => [h.codigo, h]));

// Módulos principales curados. item: { hu, icono?, label?, desc } (gated por nivelDe) o
// { ruta, roles, icono, label, desc } (gated por rol). Agrupados como el mockup.
const SECCIONES = [
  {
    titulo: 'Tus flujos',
    items: [
      { hu: 'HU-01', icono: '📄', label: 'Alta de contrato', desc: 'Captura un contrato nuevo (7 pasos).' },
      { hu: 'HU-12', icono: '📐', label: 'Ciclo de estimación', desc: 'Integra, presenta, revisa y autoriza.' },
      { ruta: '/bitacora/ambiente', roles: ['residente', 'contratista', 'supervision'], icono: '📓', label: 'Bitácora', desc: 'Apertura, notas, consulta y minutas.' },
      // NAV-F: unificado con el item del Sidebar ('Avance y seguimiento' → /seguimiento/trabajos-terminados),
      // la pantalla de acción directa que YA monta PestanasCiclo. Antes apuntaba a /seguimiento/ambiente y
      // divergía del sidebar (entrar por la tarjeta no resaltaba el menú). El ambiente sigue vivo para Ciclo de vida.
      { ruta: '/seguimiento/trabajos-terminados', roles: ['contratista', 'residente', 'supervision'], icono: '🏗️', label: 'Avance y seguimiento', desc: 'Trabajos, curva y alertas de atraso.' },
      { hu: 'HU-20', icono: '💳', label: 'Pago y tránsito', desc: 'Tránsito a pago y registro.' },
      { hu: 'HU-03', icono: '📝', label: 'Convenios', desc: 'Convenios modificatorios.' },
      { ruta: '/contratos/finiquito', roles: ['dependencia', 'residente'], icono: '🏁', label: 'Cierre / finiquito', desc: 'Finiquito y cierre del contrato.' },
      { hu: 'HU-04', icono: '🗂️', label: 'Expediente', desc: 'El contrato consolidado en bloques.' },
    ],
  },
  {
    titulo: 'Vistas ejecutivas',
    items: [
      { hu: 'HU-18', icono: '📊', label: 'Portafolio', desc: 'Cartera de contratos con semáforos.' },
      { hu: 'HU-17', icono: '📈', label: 'Tablero', desc: 'KPIs del ciclo de estimación.' },
      { hu: 'HU-19', icono: '📤', label: 'Reportes', desc: 'Exporta los reportes del contrato.' },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { ruta: '/admin/empresas', roles: ['dependencia'], icono: '🏢', label: 'Padrón de empresas', desc: 'Valida e inscribe empresas.' },
      { ruta: '/contratos/roster', roles: ['dependencia', 'residente'], icono: '👥', label: 'Roster del contrato', desc: 'Sustitución de personas.' },
      { ruta: '/usuarios/solicitudes', roles: ['dependencia'], icono: '✅', label: 'Solicitudes de registro', desc: 'Aprueba accesos al sistema.' },
    ],
  },
];

export default function Inicio() {
  const { rol, token } = useSesion();
  const rolActivo = ROLES.find((r) => r.id === rol);

  // O5 (HU-07 v2): AVISO al iniciar sesión — "Tienes N conceptos con déficit en M contratos", acotado por
  // participación en el backend. Solo para los roles con acceso a HU-07 (residente/supervisión).
  const { sinAcceso: sinAccesoAtraso } = useVistaHU('HU-07');
  const [resumenAtraso, setResumenAtraso] = useState(null);
  useEffect(() => {
    if (!token || sinAccesoAtraso) { setResumenAtraso(null); return; }
    let vivo = true;
    api.resumenAtrasos()
      .then((r) => { if (vivo) setResumenAtraso(r && typeof r === 'object' ? r : null); })
      .catch(() => { if (vivo) setResumenAtraso(null); });
    return () => { vivo = false; };
  }, [token, sinAccesoAtraso]);
  const hayAtrasos = resumenAtraso && Number(resumenAtraso.conceptos) > 0;

  // Resuelve un módulo a tarjeta {to, icono, label, desc, lectura} o null (no aplica al rol). Mismo gating
  // que el Sidebar y la guarda de ruta: HU por nivelDe; ruta fija por rol.
  const resolver = (it) => {
    if (it.hu) {
      const h = HU[it.hu];
      const nivel = h ? nivelDe(it.hu, rol) : null;
      if (!h || nivel === null) return null;
      return { to: h.ruta, icono: it.icono || h.icono, label: it.label || h.titulo, desc: it.desc || h.descripcion, lectura: nivel === 'C' };
    }
    if (!it.roles.includes(rol)) return null;
    return { to: it.ruta, icono: it.icono, label: it.label, desc: it.desc, lectura: false };
  };

  const secciones = SECCIONES
    .map((s) => ({ titulo: s.titulo, cards: s.items.map(resolver).filter(Boolean) }))
    .filter((s) => s.cards.length > 0);
  const totalCards = secciones.reduce((n, s) => n + s.cards.length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-sigecop-blue">Inicio</h1>
          <p className="text-sm text-slate-600">Gestión técnico-administrativa de contratos de obra pública (LOPSRM / RLOPSRM).</p>
        </div>
        {rolActivo && (
          <div className="inline-block px-3 py-1 bg-sigecop-blue-light text-sigecop-blue text-xs font-semibold uppercase tracking-wider rounded-full">
            Acceso: {rolActivo.nombre}
          </div>
        )}
      </div>

      {hayAtrasos && (
        <Link
          to="/seguimiento/alertas"
          className="flex flex-wrap items-center justify-between gap-3 bg-sigecop-amber-bg border-l-4 border-sigecop-amber-attention px-4 py-3 rounded mb-6 hover:shadow-md transition-all"
          data-testid="banner-atrasos"
        >
          <span className="text-sm font-semibold text-slate-800">
            ⚠ Tienes {resumenAtraso.conceptos} {resumenAtraso.conceptos === 1 ? 'concepto' : 'conceptos'} con déficit
            {' '}en {resumenAtraso.contratos} {resumenAtraso.contratos === 1 ? 'contrato' : 'contratos'}.
          </span>
          <span className="text-sm font-semibold text-sigecop-accent whitespace-nowrap">Ver atraso por concepto →</span>
        </Link>
      )}

      {totalCards === 0 && (
        <div className="bg-pagina border border-borde rounded-md px-4 py-8 text-center text-sm text-slate-600" data-testid="inicio-sin-modulos">
          <div className="text-3xl mb-2">📭</div>
          No tienes módulos disponibles con tu rol actual. Si crees que es un error, contacta a la dependencia.
        </div>
      )}

      {secciones.map((s) => (
        <section key={s.titulo} className="mb-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-tinta-ter mb-3">{s.titulo}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {s.cards.map((c) => (
              <Link
                key={c.to}
                to={c.to}
                className="sg-card hover:border-sigecop-accent hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{c.icono}</div>
                  {c.lectura && (
                    <span className="text-[10px] uppercase tracking-wider bg-sigecop-blue-light text-sigecop-blue font-semibold px-2 py-0.5 rounded">
                      Solo lectura
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 mb-1.5 group-hover:text-sigecop-blue transition-colors">{c.label}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{c.desc}</p>
                <div className="mt-4 text-xs font-semibold text-sigecop-accent group-hover:underline">Abrir →</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
