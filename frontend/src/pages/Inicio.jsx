import { Link } from 'react-router-dom';
import { historiasUsuario } from '../data/dummy.js';

export default function Inicio() {
  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="font-serif text-5xl font-bold text-sigecop-blue mb-2">SIGECOP</h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Sistema de Gestión Técnico-Administrativa de Contratos de Obra Pública
        </p>
        <div className="mt-4 inline-block px-3 py-1 bg-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider rounded-full">
          Sprint 1 en construcción
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {historiasUsuario.map((hu) => (
          <Link
            key={hu.codigo}
            to={hu.ruta}
            className="sg-card hover:border-sigecop-accent hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">{hu.icono}</div>
              <span className="text-xs font-semibold text-sigecop-accent bg-sigecop-blue-light px-2 py-0.5 rounded">
                {hu.sprint}
              </span>
            </div>
            <div className="text-xs font-bold text-sigecop-accent uppercase tracking-wider mb-1">
              {hu.codigo}
            </div>
            <h3 className="font-bold text-slate-900 mb-2 group-hover:text-sigecop-blue transition-colors">
              {hu.titulo}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{hu.descripcion}</p>
            <div className="mt-4 text-xs font-semibold text-sigecop-accent group-hover:underline">
              Ver vista →
            </div>
          </Link>
        ))}
      </div>

      <footer className="mt-12 pt-6 border-t border-slate-200 text-xs text-slate-500 text-center">
        SIGECOP © {new Date().getFullYear()} — UAGRO · Etapa 1 · Vistas huecas para revisión visual
      </footer>
    </div>
  );
}
