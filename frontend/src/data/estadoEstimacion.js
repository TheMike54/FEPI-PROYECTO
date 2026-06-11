// O7 (10-jun) — Etiquetas del ciclo de la estimación (art. 54 LOPSRM). El profe CONFIRMÓ el flujo:
// el CONTRATISTA PRESENTA (HU-12), la RESIDENCIA REVISA y AUTORIZA (HU-13), finanzas PAGA (HU-21).
// Los estados INTERNOS del esquema NO cambian (sin migración de datos): solo cambian las ETIQUETAS de UI.
//   integrada  → "Presentada"  (el contratista la presentó; sello integrada_en/por, HU-12)
//   enviada    → "Autorizada"  (la residencia la autorizó; sello enviada_en/por reutilizado, HU-13)
//   autorizada → "Autorizada"  (estado VESTIGIAL del esquema; sin uso en el flujo cableado — se mapea
//                               igual por consistencia si llegara a aparecer)
//   pagada     → "Pagada"
//   rechazada  → "Rechazada"
export const ESTADO_ESTIMACION_LABEL = {
  integrada:  'Presentada',
  enviada:    'Autorizada',
  autorizada: 'Autorizada',
  pagada:     'Pagada',
  rechazada:  'Rechazada'
};

// Etiqueta de un estado; cae a Capitalizado del propio estado si fuera uno desconocido (defensivo).
export function labelEstadoEstimacion(estado) {
  if (ESTADO_ESTIMACION_LABEL[estado]) return ESTADO_ESTIMACION_LABEL[estado];
  return estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : estado;
}
