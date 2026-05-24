// Banner de contexto del contrato (folio · contratista + datos extra opcionales).
// Replica el markup actual; variant elige el esquema de color.
//
// Props:
//   folio        — texto del folio del contrato (obligatorio).
//   contratista  — línea secundaria pequeña (opcional).
//   extra        — array de { label?, value } que se concatenan a la línea
//                  principal con separador " · ". Si label viene, se renderiza
//                  como "label: value", si no, solo el value.
//   variant      — 'slate' | 'blue' (default 'slate').
//   titulo       — encabezado pequeño en mayúsculas (default según variant).
export default function BannerContexto({
  folio,
  contratista,
  extra = [],
  variant = 'slate',
  titulo
}) {
  const styles = variant === 'blue'
    ? { bg: 'bg-blue-50',    border: 'border-sigecop-blue', label: 'text-sigecop-blue' }
    : { bg: 'bg-slate-100',  border: 'border-slate-400',     label: 'text-slate-600' };

  const tituloFinal = titulo ?? (variant === 'blue' ? 'Contrato' : 'Contexto');

  const partesPrincipal = [
    folio,
    ...extra.map((e) => (e.label ? `${e.label}: ${e.value}` : e.value))
  ].filter(Boolean);

  return (
    <div className={`${styles.bg} border-l-4 ${styles.border} px-4 py-3 mb-6 rounded-r-md`}>
      <div className={`text-xs font-semibold uppercase ${styles.label}`}>
        {tituloFinal}
      </div>
      <div className="font-bold text-slate-900 mt-1">
        {partesPrincipal.join(' · ')}
      </div>
      {contratista && (
        <div className="text-xs text-slate-600 mt-0.5">{contratista}</div>
      )}
    </div>
  );
}
