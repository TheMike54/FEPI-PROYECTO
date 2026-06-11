// UI-1: contenedor estándar de tablas — borde suave, esquinas redondeadas y scroll
// horizontal. El contenido (thead/tbody) lo pone cada vista: este wrapper NO impone
// columnas (las tablas del dominio son a la medida y sus data-testid no se tocan).
// Para encabezados usar la clase exportada thClass (gris claro, sentence case).
export const thClass = 'text-left px-3 py-2 text-xs font-medium text-tinta-sec uppercase tracking-wider bg-pagina';

export default function Tabla({ children, className = '', testid }) {
  return (
    <div className={`overflow-x-auto border border-borde rounded-lg ${className}`} data-testid={testid}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}
