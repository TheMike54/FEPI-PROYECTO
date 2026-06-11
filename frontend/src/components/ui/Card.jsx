// UI-1: tarjeta blanca estándar del sistema de diseño (superficie sobre página #FAFAF8).
// Props: titulo (opcional, sentence case peso 500) · acciones (nodo a la derecha del título) ·
// className extra · testid. Sin lógica: solo presentación.
export default function Card({ titulo, acciones, children, className = '', testid }) {
  return (
    <section className={`bg-white border border-borde rounded-lg p-5 ${className}`} data-testid={testid}>
      {(titulo || acciones) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {titulo && <h2 className="text-sm font-medium text-tinta-sec uppercase tracking-wider">{titulo}</h2>}
          {acciones}
        </div>
      )}
      {children}
    </section>
  );
}
