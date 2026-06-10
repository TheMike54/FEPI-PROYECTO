// UI-1: modal estándar (extraído del modal de exceso de garantía de O1, que fue el primero
// con este patrón). Backdrop oscuro + panel blanco redondeado. Sin estado propio: el caller
// decide cuándo montarlo/desmontarlo (igual que el original).
// Props: titulo · children (cuerpo) · pie (nodo con los botones, alineado a la derecha) ·
// testid (va en el BACKDROP, como en el modal original) · maxW (clase, default max-w-lg).
export default function Modal({ titulo, children, pie, testid, maxW = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid={testid}>
      <div className={`bg-white rounded-lg shadow-xl ${maxW} w-full mx-4 p-5`}>
        {titulo && <h3 className="text-base font-semibold text-guinda mb-2">{titulo}</h3>}
        {children}
        {pie && <div className="flex justify-end gap-3 mt-4">{pie}</div>}
      </div>
    </div>
  );
}
