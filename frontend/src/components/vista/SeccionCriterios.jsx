import CardCriterioAceptacion from '../ui/CardCriterioAceptacion.jsx';
import { useVistaHU } from '../../context/SesionContext.jsx';

// Sección "Criterios de aceptación" al pie de cada vista.
// Se autoesconde en modo aplicación (donde no debe mostrarse metadata académica).
//
// Props:
//   huId      — ID de la HU para derivar mostrarMeta del contexto.
//   criterios — array de { numero, texto }.
export default function SeccionCriterios({ huId, criterios }) {
  const { mostrarMeta } = useVistaHU(huId);
  if (!mostrarMeta) return null;

  // Mismo criterio de columnas que las vistas actuales:
  // 1 criterio → 1 col, 2 → md:2, 3+ → md:3.
  const cols = criterios.length === 2
    ? 'md:grid-cols-2'
    : criterios.length >= 3
      ? 'md:grid-cols-3'
      : 'md:grid-cols-1';

  return (
    <section className="mt-10">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
        Criterios de aceptación
      </h2>
      <div className={`grid grid-cols-1 ${cols} gap-3`}>
        {criterios.map((c) => (
          <CardCriterioAceptacion key={c.numero} numero={c.numero} texto={c.texto} />
        ))}
      </div>
    </section>
  );
}
