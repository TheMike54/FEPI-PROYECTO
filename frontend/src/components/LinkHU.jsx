import { Link } from 'react-router-dom';
import { useSesion, useVistaHU } from '../context/SesionContext.jsx';

// Enlace consciente del acceso. Resuelve los "callejones a Inicio": si el destino NO es accesible para el
// rol actual (la guarda de ruta redirigiría a Inicio), en vez de un <Link> que rebota MUDO, muestra un chip
// DESHABILITADO con la razón ("lo hace X actor"). Así el usuario nuevo entiende el reparto de actores.
//
// Gating:
//  - `hu`    → rutas del catálogo HU (WithLayout/nivelDe). Accesible si nivelDe(hu, rol) !== null.
//  - `roles` → rutas fijas (SoloRol, sin HU). Accesible si el rol está en la lista.
// NO toca zona congelada: solo LEE permisos.js / SesionContext. Conserva data-testid y className en AMBOS
// estados (para que los selectores e2e sigan encontrándolo).
export default function LinkHU({ hu, roles, to, className = '', actor, children, ...rest }) {
  const { rol } = useSesion();
  const { sinAcceso } = useVistaHU(hu); // hook siempre llamado; si no hay `hu`, se ignora y manda `roles`
  const accesible = roles ? roles.includes(rol) : !sinAcceso;
  if (accesible) {
    return (
      <Link to={to} className={className} {...rest}>
        {children}
      </Link>
    );
  }
  const motivo = actor || 'Esta acción la realiza otro participante del contrato.';
  return (
    <span
      {...rest}
      role="link"
      aria-disabled="true"
      title={motivo}
      className={`${className} opacity-60 cursor-not-allowed pointer-events-none`.trim()}
    >
      {children}
      <span className="block text-[10px] font-normal mt-0.5 opacity-90">🔒 {motivo}</span>
    </span>
  );
}
