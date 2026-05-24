// Alias semántico de <fieldset disabled className="contents">.
// Usar para envolver zonas de captura (inputs, selects, textareas) que deben
// deshabilitarse en modo lectura. NO usar para filtros de búsqueda (decisión
// consciente: los filtros siguen funcionando en lectura).
//
// La clase Tailwind `contents` hace que el fieldset desaparezca del layout pero
// sus descendientes hereden disabled.
export default function RegionEditable({ disabled, children }) {
  return (
    <fieldset disabled={disabled} className="contents">
      {children}
    </fieldset>
  );
}
