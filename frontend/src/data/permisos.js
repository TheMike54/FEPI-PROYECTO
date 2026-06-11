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
  'HU-05': { residente:'E', contratista:'C', supervision:'C', dependencia:'C', finanzas:null },
  'HU-06': { residente:'C', contratista:'E', supervision:'C', dependencia:null, finanzas:null },
  'HU-07': { residente:'E', contratista:null, supervision:'C', dependencia:null, finanzas:null },
  'HU-08': { residente:'E', contratista:'C', supervision:'C', dependencia:null, finanzas:null },
  'HU-09': { residente:'E', contratista:'E', supervision:'E', dependencia:null, finanzas:null },
  'HU-10': { residente:'E', contratista:'C', supervision:'C', dependencia:null, finanzas:null },
  'HU-11': { residente:'E', contratista:'C', supervision:'C', dependencia:null, finanzas:null },
  'HU-12': { residente:'C', contratista:'E', supervision:'C', dependencia:null, finanzas:null },
  // RECONCILIACIÓN O7↔HU-15 (11-jun): HU-13 REGRESA a su sentido original (el contratista PRESENTA la
  // estimación; espejo de HU-12). La revisión/autorización del art. 54 la implementa HU-15 (supervisión +
  // residencia). Se revierte la inversión temporal de O7: contratista 'E', residente 'C'.
  'HU-13': { residente:'C', contratista:'E', supervision:'C', dependencia:null, finanzas:null },
  'HU-14': { residente:'E', contratista:'C', supervision:null, dependencia:'C', finanzas:null },
  'HU-15': { residente:'E', contratista:null, supervision:'E', dependencia:'C', finanzas:null },
  'HU-16': { residente:'C', contratista:'E', supervision:null, dependencia:null, finanzas:null },
  'HU-17': { residente:'E', contratista:'C', supervision:'C', dependencia:'C', finanzas:null },
  'HU-18': { residente:'C', contratista:null, supervision:'C', dependencia:'E', finanzas:null },
  'HU-19': { residente:'E', contratista:'C', supervision:'C', dependencia:'C', finanzas:'C' },
  'HU-20': { residente:'C', contratista:'E', supervision:null, dependencia:'C', finanzas:'E' },
  'HU-21': { residente:'C', contratista:null, supervision:null, dependencia:'C', finanzas:'E' },
};
// HU-00 (login) es transversal: no se filtra.

export function nivelDe(huId, rolId) {
  // Default SEGURO: sin rol seleccionado = SIN acceso (nunca "ejecutar todo"). El
  // ruteo (App.jsx) obliga a elegir rol/login antes de entrar, así que este caso no
  // debería renderizar vistas; el null es la red de seguridad si algo lo llamara.
  if (!rolId) return null;
  return PERMISOS[huId]?.[rolId] ?? null;
}
