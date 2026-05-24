import Breadcrumb from '../ui/Breadcrumb.jsx';
import BadgeSprint from '../ui/BadgeSprint.jsx';
import AvisoSoloLectura from '../ui/AvisoSoloLectura.jsx';
import { useVistaHU } from '../../context/SesionContext.jsx';

// Encapsula el header de las vistas internas (breadcrumb + título + badge HU/sprint
// + opcional "Rol: X" o descripción + AvisoSoloLectura). Replica el markup actual.
//
// Props:
//   huId, titulo, sprint, breadcrumb — obligatorios.
//   rolAcademico — opcional, renderiza <p>Rol: {rolAcademico}</p> bajo el título.
//   descripcion  — opcional, renderiza <p>{descripcion}</p> bajo el título (sin
//                  prefijo "Rol:"). Útil cuando la vista tiene un texto explicativo
//                  en lugar de un rol (ej. HU-09 "Tipo de nota disponible según
//                  rol autorizado..."). Mutuamente excluyente con rolAcademico.
export default function HeaderVista({
  huId,
  titulo,
  sprint,
  rolAcademico,
  descripcion,
  breadcrumb
}) {
  const { soloLectura } = useVistaHU(huId);

  // Cuando hay subtítulo (rol o descripción), el contenedor del título cierra
  // con mb-1 (porque el <p> ya aporta mb-6 abajo). Sin subtítulo, mb-6.
  const tieneSubtitulo = !!rolAcademico || !!descripcion;
  const mbTitulo = tieneSubtitulo ? 'mb-1' : 'mb-6';

  return (
    <>
      <Breadcrumb items={breadcrumb} />
      <div className={`flex items-start justify-between ${mbTitulo}`}>
        <h1 className="text-2xl font-bold text-sigecop-blue">{titulo}</h1>
        <BadgeSprint codigo={huId} sprint={sprint} />
      </div>
      {rolAcademico && (
        <p className="text-sm text-slate-600 mb-6">Rol: {rolAcademico}</p>
      )}
      {descripcion && (
        <p className="text-sm text-slate-600 mb-6">{descripcion}</p>
      )}
      {soloLectura && <AvisoSoloLectura />}
    </>
  );
}
