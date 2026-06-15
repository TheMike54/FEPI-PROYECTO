import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { historiasUsuario } from '../data/dummy.js';
import { ROLES, nivelDe } from '../data/permisos.js';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';
import { api } from '../services/api.js';

export default function Inicio() {
  const { rol, token } = useSesion();
  const rolActivo = ROLES.find((r) => r.id === rol);

  // O5 (HU-07 v2): AVISO al iniciar sesión — "Tienes N conceptos con déficit en M contratos", acotado
  // por participación en el backend. Solo para los roles con acceso a HU-07 (residente/supervisión).
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

  // Control por rol: el dashboard solo muestra las HU accesibles para el rol
  // (consistente con el Sidebar y con la guarda de ruta).
  const tarjetas = historiasUsuario
    .filter((hu) => hu.codigo !== 'HU-00' && nivelDe(hu.codigo, rol) !== null)
    .map((hu) => ({ ...hu, nivel: nivelDe(hu.codigo, rol) }));

  return (
    <div>
      {/* Pulido UX 14-jun: encabezado de página sobrio (la marca SIGECOP ya vive en la barra superior);
          se evita el hero gigante duplicado de prototipo. */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
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

      {/* Pulido UX 14-jun: estado vacío explícito si el rol no tiene módulos (antes quedaba en blanco). */}
      {tarjetas.length === 0 && (
        <div className="bg-pagina border border-borde rounded-md px-4 py-8 text-center text-sm text-slate-600" data-testid="inicio-sin-modulos">
          <div className="text-3xl mb-2">📭</div>
          No tienes módulos disponibles con tu rol actual. Si crees que es un error, contacta a la dependencia.
        </div>
      )}
      {tarjetas.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tarjetas.map((hu) => (
          <Link
            key={hu.codigo}
            to={hu.ruta}
            className="sg-card hover:border-sigecop-accent hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">{hu.icono}</div>
              {hu.nivel === 'C' && (
                <span className="text-[10px] uppercase tracking-wider bg-sigecop-blue-light text-sigecop-blue font-semibold px-2 py-0.5 rounded">
                  Solo lectura
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 mb-2 group-hover:text-sigecop-blue transition-colors">
              {hu.titulo}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{hu.descripcion}</p>
            <div className="mt-4 text-xs font-semibold text-sigecop-accent group-hover:underline">
              Abrir →
            </div>
          </Link>
        ))}
      </div>
      )}

    </div>
  );
}
