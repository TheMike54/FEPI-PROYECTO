import Breadcrumb from '../ui/Breadcrumb.jsx';
import BadgeSprint from '../ui/BadgeSprint.jsx';
import AvisoSoloLectura from '../ui/AvisoSoloLectura.jsx';
import { useVistaHU } from '../../context/SesionContext.jsx';

// Encapsula el header de las vistas internas (breadcrumb + título + badge HU/sprint
// + opcional "Rol: X" + AvisoSoloLectura cuando aplica). Replica el markup actual
// para que la migración sea visualmente idéntica.
export default function HeaderVista({ huId, titulo, sprint, rolAcademico, breadcrumb }) {
  const { soloLectura } = useVistaHU(huId);

  // Cuando hay "Rol: X", el contenedor del título cierra con mb-1 (porque el <p>
  // ya aporta mb-6 abajo). Cuando no hay rol, el contenedor cierra con mb-6.
  const mbTitulo = rolAcademico ? 'mb-1' : 'mb-6';

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
      {soloLectura && <AvisoSoloLectura />}
    </>
  );
}
