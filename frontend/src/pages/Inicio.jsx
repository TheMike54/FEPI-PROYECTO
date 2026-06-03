import { Link } from 'react-router-dom';
import { historiasUsuario } from '../data/dummy.js';
import { ROLES, nivelDe } from '../data/permisos.js';
import { useSesion } from '../context/SesionContext.jsx';

export default function Inicio() {
  const { rol } = useSesion();
  const rolActivo = ROLES.find((r) => r.id === rol);

  // Control por rol: el dashboard solo muestra las HU accesibles para el rol
  // (consistente con el Sidebar y con la guarda de ruta).
  const tarjetas = historiasUsuario
    .filter((hu) => hu.codigo !== 'HU-00' && nivelDe(hu.codigo, rol) !== null)
    .map((hu) => ({ ...hu, nivel: nivelDe(hu.codigo, rol) }));

  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="font-serif text-5xl font-bold text-sigecop-blue mb-2">SIGECOP</h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Sistema de Gestión Técnico-Administrativa de Contratos de Obra Pública
        </p>
        {rolActivo && (
          <div className="mt-4 inline-block px-3 py-1 bg-sigecop-blue-light text-sigecop-blue text-xs font-semibold uppercase tracking-wider rounded-full">
            Acceso: {rolActivo.nombre}
          </div>
        )}
      </div>

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
                <span className="text-[10px] uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                  lectura
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

    </div>
  );
}
