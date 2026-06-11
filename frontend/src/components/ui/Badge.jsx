// UI-1: badge/pill suave de estado. Fondo pastel + texto fuerte (paleta institucional).
// variante: exito | aviso | peligro | info (guinda) | neutro.
const VARIANTE = {
  exito: 'bg-exito-bg text-exito',
  aviso: 'bg-aviso-bg text-aviso',
  peligro: 'bg-peligro-bg text-peligro',
  info: 'bg-guinda-soft text-guinda',
  neutro: 'bg-pagina text-tinta-sec border border-borde'
};

export default function Badge({ variante = 'neutro', children, className = '', testid, title }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${VARIANTE[variante] || VARIANTE.neutro} ${className}`}
      data-testid={testid}
      title={title}
    >
      {children}
    </span>
  );
}
