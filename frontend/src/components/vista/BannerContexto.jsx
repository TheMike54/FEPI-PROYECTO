import { Fragment } from 'react';

// Banner de contexto del contrato.
//
// Props:
//   folio        — string del folio del contrato (opcional; si se omite, todo va
//                  en extra). En variant='blue' aparece sin <strong> (la línea
//                  principal ya está en font-bold). En variant='slate' aparece
//                  envuelto en <strong>.
//   folioLabel   — prefijo opcional antes del folio (ej. "Contrato"). Sólo aplica
//                  en variant='slate' (en blue se ignora).
//   contratista  — línea secundaria pequeña debajo (opcional). Pensada para
//                  variant='blue'; para slate el contratista suele ir como item
//                  de extra para que quede en la línea principal.
//   extra        — array de items que se concatenan a la línea principal con
//                  separador " · ". Cada item puede ser un string o un objeto
//                  { label?, value, resaltado?, sufijo? }:
//                    · label: texto que precede al valor (incluir ":" si se
//                      quiere mostrar dos puntos — ej. label: "Periodo:").
//                    · value: el valor (string o ReactNode).
//                    · resaltado: si true, value se renderiza en <strong>.
//                    · sufijo: texto que va después del value (ej. "autorizada",
//                      "(mayo 2026)").
//   variant      — 'slate' (default) | 'blue'.
//   titulo       — encabezado pequeño en mayúsculas (default según variant).
//   margenAbajo  — clase Tailwind del margen inferior (default 'mb-6';
//                  RevisionEstimacion usa 'mb-4').
export default function BannerContexto({
  folio,
  folioLabel,
  contratista,
  extra = [],
  variant = 'slate',
  titulo,
  margenAbajo = 'mb-6',
  testid // opcional: ancla para los specs (O1, 09-jun)
}) {
  // UI-1: paleta institucional — 'blue' (énfasis) pasa a guinda-soft; 'slate' a tarjeta blanca
  // con acento guinda. Solo clases; estructura y props intactas (lo usan ~10 vistas).
  const styles = variant === 'blue'
    ? { bg: 'bg-guinda-soft', border: 'border-guinda', label: 'text-guinda' }
    : { bg: 'bg-white border border-borde', border: 'border-l-guinda', label: 'text-tinta-sec' };

  const tituloFinal = titulo ?? (variant === 'blue' ? 'Contrato' : 'Contexto');

  const lineClass = variant === 'blue'
    ? 'font-bold text-slate-900 mt-1'
    : 'text-sm text-slate-800 mt-1';

  // Construir items de la línea principal.
  const items = [];

  if (folio) {
    if (variant === 'blue') {
      items.push(folio);
    } else {
      // slate: "<strong>folio</strong>" o "folioLabel <strong>folio</strong>"
      items.push(
        <>
          {folioLabel && <>{folioLabel} </>}
          <strong>{folio}</strong>
        </>
      );
    }
  }

  for (const item of extra) {
    if (typeof item === 'string') {
      items.push(item);
      continue;
    }
    const valor = item.resaltado ? <strong>{item.value}</strong> : item.value;
    items.push(
      <>
        {item.label && <>{item.label} </>}
        {valor}
        {item.sufijo && <> {item.sufijo}</>}
      </>
    );
  }

  return (
    <div className={`${styles.bg} border-l-4 ${styles.border} px-4 py-3 ${margenAbajo} rounded-r-md`} data-testid={testid}>
      <div className={`text-xs font-semibold uppercase ${styles.label}`}>
        {tituloFinal}
      </div>
      <div className={lineClass}>
        {items.map((item, i) => (
          <Fragment key={i}>
            {i > 0 && ' · '}
            {item}
          </Fragment>
        ))}
      </div>
      {contratista && (
        <div className="text-xs text-slate-600 mt-0.5">{contratista}</div>
      )}
    </div>
  );
}
