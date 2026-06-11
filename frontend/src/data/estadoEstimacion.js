// Etiquetas del ciclo de la estimación (art. 54 LOPSRM). RECONCILIACIÓN O7↔HU-15 (11-jun): con HU-15
// integrado, el flujo REAL es: el CONTRATISTA INTEGRA (HU-12) y PRESENTA (HU-13); SUPERVISIÓN revisa y
// turna y la RESIDENCIA AUTORIZA/RECHAZA (HU-15); finanzas PAGA (HU-21). Los estados INTERNOS del esquema
// NO cambian (sin migración): solo cambian las ETIQUETAS de UI. (O7 había etiquetado integrada="Presentada"
// y enviada="Autorizada" como solución temporal sin HU-15; aquí se reconcilia al flujo definitivo.)
//   integrada  → "Integrada"   (el contratista la integró; sello integrada_en/por, HU-12)
//   enviada    → "Presentada"  (el contratista la presentó; sello enviada_en/por, HU-13; arranca art. 54)
//   autorizada → "Autorizada"  (la residencia la autorizó tras turnado de supervisión, HU-15; ya NO es vestigial)
//   pagada     → "Pagada"
//   rechazada  → "Rechazada"   (la residencia la rechazó, HU-15)
export const ESTADO_ESTIMACION_LABEL = {
  integrada:  'Integrada',
  enviada:    'Presentada',
  autorizada: 'Autorizada',
  pagada:     'Pagada',
  rechazada:  'Rechazada'
};

// Etiqueta de un estado; cae a Capitalizado del propio estado si fuera uno desconocido (defensivo).
export function labelEstadoEstimacion(estado) {
  if (ESTADO_ESTIMACION_LABEL[estado]) return ESTADO_ESTIMACION_LABEL[estado];
  return estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : estado;
}
