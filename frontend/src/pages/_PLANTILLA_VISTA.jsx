// PLANTILLA para crear vistas nuevas en SIGECOP frontend.
// Este archivo NO se enruta — sólo sirve como referencia. Cópialo y renómbralo.
//
// ============================================================================
// CHECKLIST para agregar una vista (omitir un paso = la vista NO funciona):
// ============================================================================
//   1. Copiar este archivo como pages/NombreVista.jsx (sin el prefijo _).
//   2. Agregar el import + <Route path="..."> en App.jsx.
//   3. Agregar una entrada en historiasUsuario de data/dummy.js
//      (para que aparezca en Sidebar e Inicio).
//   4. Agregar permisos por rol en PERMISOS de data/permisos.js.
//      ⚠️ SI SE OLVIDA, la vista NO aparece en modo aplicación para ningún rol.
//   5. Llenar HeaderVista (huId, titulo, sprint, breadcrumb) y SeccionCriterios.
//
// ============================================================================
// Cuándo usar RegionEditable:
// ============================================================================
//   ✓ Zonas de captura: forms, grids de inputs editables, textareas, selects
//     que modifican el modelo, checkboxes que mutan estado.
//   ✗ Filtros de búsqueda/consulta: los inputs ahí son consultativos y deben
//     seguir funcionando en modo lectura (decisión consciente).
//   ✗ Componentes solo-display (semáforos, badges, banners informativos).
//
// ============================================================================
// Cuándo usar BannerContexto:
// ============================================================================
//   ✓ Vistas que operan sobre un contrato/estimación concreto y necesitan
//     anclarlo arriba (folio + datos adicionales).
//   variant='blue'  → línea principal en bold (sin <strong>), contratista debajo.
//                     Usado en: HU-02 fianzas, HU-08 apertura, HU-09 notas.
//   variant='slate' → línea principal en text-sm con valores en <strong> donde
//                     se pase resaltado:true. Usado en estimaciones y pagos.
//
// ============================================================================

import HeaderVista from '../components/vista/HeaderVista.jsx';
import BannerContexto from '../components/vista/BannerContexto.jsx';
import SeccionCriterios from '../components/vista/SeccionCriterios.jsx';
import RegionEditable from '../components/vista/RegionEditable.jsx';
import { useVistaHU } from '../context/SesionContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { contratoDummy } from '../data/dummy.js';

export default function PlantillaVista() {
  const { showToast } = useToast();
  // soloLectura se usa para condicionar botones primarios y RegionEditable.
  const { soloLectura } = useVistaHU('HU-XX');

  return (
    <div>
      <HeaderVista
        huId="HU-XX"
        titulo="Título de la vista"
        sprint="Sprint X"
        // rolAcademico="Residente"          // opcional: pone "Rol: X" bajo el título
        // descripcion="Texto explicativo"   // opcional: texto sin prefijo "Rol:"
        breadcrumb={[
          { label: 'Inicio', href: '/' },
          { label: 'Módulo' },
          { label: 'Nombre de la vista' }
        ]}
      />

      {/* Banner del contexto. Omitir si la vista no opera sobre un contrato concreto. */}
      <BannerContexto
        variant="slate"
        folio={contratoDummy.folio}
        folioLabel="Contrato"
        extra={[
          { value: contratoDummy.contratista }
          // { label: 'Estimación', value: 'EST-...', resaltado: true, sufijo: '(opcional)' }
        ]}
      />

      {/* Zona de captura — envolver en RegionEditable. */}
      <RegionEditable disabled={soloLectura}>
        <div className="bg-white border border-slate-200 rounded-md p-6">
          {/* form, inputs, selects, textareas */}
        </div>
      </RegionEditable>

      {/* Botones de acción primaria — ocultar en modo lectura. */}
      {!soloLectura && (
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="px-4 py-2 text-slate-600 hover:text-slate-900">
            Cancelar
          </button>
          <button
            type="button"
            className="sg-btn-primary"
            onClick={() => showToast('Pendiente para Sprint siguiente.')}
          >
            Acción principal
          </button>
        </div>
      )}

      <SeccionCriterios
        huId="HU-XX"
        criterios={[
          { numero: 1, texto: 'Primer criterio de aceptación...' },
          { numero: 2, texto: 'Segundo criterio de aceptación...' }
        ]}
      />
    </div>
  );
}
