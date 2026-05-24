export const ROLES = [
  { id: 'residente',   nombre: 'Residente de obra' },
  { id: 'contratista', nombre: 'Contratista / Superintendente' },
  { id: 'supervision', nombre: 'Supervisión' },
  { id: 'dependencia', nombre: 'Dependencia / Contratante' },
  { id: 'finanzas',    nombre: 'Finanzas' },
];

// Nivel por HU y rol: 'E' = ejecuta (vista completa) · 'C' = consulta (solo lectura)
// · ausente/null = sin acceso (no aparece en sidebar)
export const PERMISOS = {
  'HU-01': { residente:'E', contratista:'C', supervision:'C', dependencia:'C', finanzas:null },
  'HU-02': { residente:'C', contratista:null, supervision:null, dependencia:'E', finanzas:'C' },
  'HU-03': { residente:'C', contratista:'C', supervision:'C', dependencia:'E', finanzas:null },
  'HU-04': { residente:'E', contratista:'C', supervision:'C', dependencia:'C', finanzas:null },
  'HU-07': { residente:'E', contratista:null, supervision:'C', dependencia:null, finanzas:null },
  'HU-08': { residente:'E', contratista:'C', supervision:'C', dependencia:null, finanzas:null },
  'HU-09': { residente:'E', contratista:'E', supervision:'E', dependencia:null, finanzas:null },
  'HU-10': { residente:'E', contratista:'C', supervision:'C', dependencia:null, finanzas:null },
  'HU-12': { residente:'C', contratista:'E', supervision:'C', dependencia:null, finanzas:null },
  'HU-14': { residente:'E', contratista:'C', supervision:null, dependencia:'C', finanzas:null },
  'HU-15': { residente:'E', contratista:null, supervision:'E', dependencia:'C', finanzas:null },
  'HU-20': { residente:'C', contratista:'E', supervision:null, dependencia:'C', finanzas:'E' },
  'HU-21': { residente:'C', contratista:null, supervision:null, dependencia:'C', finanzas:'E' },
};
// HU-00 (login) es transversal: no se filtra.

export function nivelDe(huId, rolId) {
  if (!rolId) return 'E';            // sin rol (modo proyecto) = todo visible
  return PERMISOS[huId]?.[rolId] ?? null;
}
