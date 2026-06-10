import Breadcrumb from '../ui/Breadcrumb.jsx';
import AvisoSoloLectura from '../ui/AvisoSoloLectura.jsx';
import { useVistaHU } from '../../context/SesionContext.jsx';

// Encabezado de las vistas internas: breadcrumb + título + AvisoSoloLectura.
// alta-v2: se eliminó la metadata académica (badge HU/sprint, "Rol: X", descripción de
// maqueta) que solo existía en el "modo proyecto". Las props `sprint`, `rolAcademico` y
// `descripcion` se conservan en la firma por COMPATIBILIDAD con las páginas (que las siguen
// pasando), pero ya NO se renderizan — así no hay que tocar las HU prototipo.
//
// Props:
//   huId, titulo, breadcrumb — usados.
//   sprint, rolAcademico, descripcion — inertes (compat).
export default function HeaderVista({
  huId,
  titulo,
  sprint,        // inerte (compat)
  rolAcademico,  // inerte (compat)
  descripcion,   // inerte (compat)
  breadcrumb
}) {
  const { soloLectura } = useVistaHU(huId);

  return (
    <>
      <Breadcrumb items={breadcrumb} />
      {/* UI-1: título en tinta (peso 500); el guinda queda para acentos/acciones. */}
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-medium text-tinta">{titulo}</h1>
      </div>
      {soloLectura && <AvisoSoloLectura />}
    </>
  );
}
