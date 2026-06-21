import { Link } from 'react-router-dom';
import { useContratoActivo } from '../../context/ContratoActivoContext.jsx';
import { useSesion } from '../../context/SesionContext.jsx';
import { nivelDe } from '../../data/permisos.js';
import { historiasUsuario } from '../../data/dummy.js';

// Miga de pan. FIX (de raíz): los niveles INTERMEDIOS ahora son ENLACES a su sección aunque la página NO pase
// `href` — el destino se infiere de un mapa sección→ruta. El último nivel (la pantalla actual) NO es enlace.
// El `?contrato` activo se añade a las rutas por-contrato (no a Inicio ni a las que ya traen query). Esto se
// arregla SOLO aquí porque el breadcrumb aparece en casi todas las pantallas; no toca gating ni zona congelada.
const SECCION_RUTA = {
  inicio: '/',
  estimaciones: '/estimaciones/integracion',
  'estimación': '/estimaciones/integracion',
  bitacora: '/bitacora/ambiente',
  'bitácora': '/bitacora/ambiente',
  seguimiento: '/seguimiento/trabajos-terminados',
  avance: '/seguimiento/trabajos-terminados',
  pagos: '/pagos/transito',
  pago: '/pagos/transito',
  reportes: '/reportes',
  'administración': '/admin/empresas',
  administracion: '/admin/empresas',
  contratos: '/contratos/expediente',
  contrato: '/contratos/expediente',
};
const norm = (s) => String(s || '').trim().toLowerCase();
// NAV-B — mapa ruta→HU del catálogo: para NO enlazar un destino que el rol no puede abrir (WithLayout lo
// rebotaría a Inicio). Solo LEE permisos.js/dummy.js; no toca gating ni zona congelada.
const HU_POR_RUTA = Object.fromEntries(historiasUsuario.filter((h) => h.codigo !== 'HU-00').map((h) => [h.ruta, h.codigo]));

export default function Breadcrumb({ items }) {
  const { contratoId } = useContratoActivo();
  const { rol } = useSesion();
  const q = contratoId ? `?contrato=${contratoId}` : '';
  return (
    <nav className="text-xs text-slate-500 mb-2" aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          let href = item.href || SECCION_RUTA[norm(item.label)] || null;
          // NAV-B — si el destino es una HU del catálogo que el rol NO puede abrir, queda como TEXTO (no enlace
          // que rebota). Las rutas que no son HU (SoloRol) siguen enlazando como antes (acceso amplio).
          const base = href && href !== '/' ? href.split('?')[0] : href;
          const huDestino = base ? HU_POR_RUTA[base] : null;
          const accesible = huDestino ? nivelDe(huDestino, rol) !== null : true;
          if (href && href !== '/' && !href.includes('?')) href = `${href}${q}`;
          const esEnlace = href && !isLast && accesible;
          return (
            <li key={i} className="flex items-center gap-1">
              {esEnlace ? (
                <Link to={href} className="hover:text-sigecop-blue transition-colors">{item.label}</Link>
              ) : (
                <span className={isLast ? 'font-semibold text-slate-700' : ''}>{item.label}</span>
              )}
              {!isLast && <span className="text-slate-400 mx-1">›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
