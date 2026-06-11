// UI-1: botón del sistema de diseño. primario = guinda sólido · secundario = outline guinda.
// Reusa las clases sg-btn-* (styles/index.css) para que el botón "a mano" y el componente
// rindan idéntico. Props extra (type, onClick, disabled, data-testid…) pasan tal cual.
const VARIANTE = {
  primario: 'sg-btn-primary',
  secundario: 'sg-btn-secondary'
};

export default function Boton({ variante = 'primario', className = '', children, ...props }) {
  return (
    <button type="button" className={`${VARIANTE[variante] || VARIANTE.primario} ${className}`} {...props}>
      {children}
    </button>
  );
}
