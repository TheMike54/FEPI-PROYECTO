// Datos dummy para vistas huecas del Sprint 1.
// Fieles a docs/Maquetas_SIGECOP.html — no son datos reales del Sprint.

export const contratoDummy = {
  folio: 'C-2026-0042',
  tipo: 'Obra pública sobre la base de precios unitarios',
  objeto: 'Construcción de edificio administrativo en av. principal',
  contratista: 'Constructora XYZ S.A. de C.V.',
  dependencia: 'Secretaría de Obras Públicas',
  monto: '$ 12,450,000.00',
  plazo: '180 días naturales',
  fechaInicio: '2026-06-01',
  fechaTermino: '2026-11-28'
};

export const conceptosDummy = [
  { concepto: 'Excavación a cielo abierto, material tipo II', unidad: 'm³', cantidad: 1250, pu: 185.50 },
  { concepto: 'Concreto premezclado f\'c=250 kg/cm²', unidad: 'm³', cantidad: 420, pu: 2150.00 },
  { concepto: 'Acero de refuerzo fy=4200 kg/cm²', unidad: 'kg', cantidad: 18500, pu: 28.75 },
  { concepto: 'Cimbra de contacto para muros', unidad: 'm²', cantidad: 980, pu: 245.00 }
];

export const programaObraDummy = [
  { actividad: 'Preliminares y demolición', inicio: '2026-06-01', termino: '2026-06-30', peso: 15 },
  { actividad: 'Cimentación y estructura', inicio: '2026-07-01', termino: '2026-09-15', peso: 45 },
  { actividad: 'Acabados y entrega', inicio: '2026-09-16', termino: '2026-11-28', peso: 40 }
];

export const polizasGarantiaDummy = [
  { tipo: 'Anticipo', afianzadora: 'Afianzadora Sofimex', poliza: 'F-2026-08746', monto: 3735000, vigencia: '2026-08-28' },
  { tipo: 'Cumplimiento', afianzadora: 'Afianzadora Sofimex', poliza: 'F-2026-08745', monto: 1245000, vigencia: '2026-11-28' },
  { tipo: 'Vicios ocultos', afianzadora: '', poliza: '', monto: 0, vigencia: '' }
];

// HU-02 — Tabla de fianzas (formato del listado, no captura).
export const fianzasListadoDummy = [
  {
    tipo: 'Cumplimiento',
    folio: 'F-2026-08745',
    afianzadora: 'Afianzadora Sofimex',
    monto: '$ 1,245,000.00',
    vigenciaInicio: '01/06/2026',
    vigenciaFin: '28/11/2026',
    estado: 'Vigente',
    estadoColor: 'green',
    tienePdf: true
  },
  {
    tipo: 'Anticipo',
    folio: 'F-2026-08746',
    afianzadora: 'Afianzadora Sofimex',
    monto: '$ 3,735,000.00',
    vigenciaInicio: '01/06/2026',
    vigenciaFin: '28/08/2026',
    estado: 'Vence pronto',
    estadoColor: 'amber',
    tienePdf: true
  },
  {
    tipo: 'Vicios ocultos',
    folio: 'Por registrar',
    afianzadora: '—',
    monto: '—',
    vigenciaInicio: '',
    vigenciaFin: '—',
    estado: 'Pendiente',
    estadoColor: 'gray',
    tienePdf: false
  }
];

// HU-08 — Tres partes para apertura de bitácora.
export const partesBitacoraDummy = [
  {
    num: 1,
    titulo: 'Contratante (Dependencia)',
    firmante: 'Lic. María Pérez García',
    cargoLabel: 'Cargo',
    cargo: 'Directora de Obras',
    correo: 'mperez@sop.gob.mx'
  },
  {
    num: 2,
    titulo: 'Supervisión',
    firmante: 'Ing. Roberto López',
    cargoLabel: 'Empresa',
    cargo: 'Supervisora Especializada S.C.',
    correo: 'rlopez@supervisora.mx'
  },
  {
    num: 3,
    titulo: 'Contratista (Superintendente)',
    firmante: 'Arq. Carlos Mendoza',
    cargoLabel: 'Cédula profesional',
    cargo: '8475612',
    correo: 'cmendoza@constructora-xyz.mx'
  }
];

// HU-09 — Notas recientes (3 notas previas para la columna izquierda).
export const notasRecientesDummy = [
  {
    folio: 'N-042',
    tipo: 'Instrucción',
    fecha: 'Hoy 10:23',
    asunto: 'Solicitud de aclaración sobre eje 7-B...',
    autor: 'Residencia',
    color: 'blue'
  },
  {
    folio: 'N-041',
    tipo: 'Acuerdo',
    fecha: 'Ayer 16:45',
    asunto: 'Acuerdo sobre modificación menor del...',
    autor: 'Las tres partes',
    color: 'amber'
  },
  {
    folio: 'N-040',
    tipo: 'Confirm.',
    fecha: '14/05 11:20',
    asunto: 'Recepción de trabajos del eje 6...',
    autor: 'Supervisión',
    color: 'green'
  }
];

// Tipos de nota habilitados para rol Residente (art. 125 RLOPSRM).
// La maqueta solo muestra estos tres para el residente.
export const tiposNotaResidente = [
  'Instrucción (al contratista)',
  'Acuerdo (entre partes)',
  'Solicitud (de información o aclaración)'
];

// Cinco HU del Sprint 1 visual — usados por la landing y el sidebar.
export const historiasUsuario = [
  {
    codigo: 'HU-00',
    titulo: 'Iniciar sesión',
    descripcion: 'Acceso al sistema sin selector de rol — el sistema lo deduce internamente.',
    sprint: 'Sprint 1',
    icono: '🔐',
    ruta: '/login'
  },
  {
    codigo: 'HU-01',
    titulo: 'Alta de contratos',
    descripcion: 'Captura del contrato en 6 pestañas: datos, catálogo, programa, jurídicos, garantías y PDF.',
    sprint: 'Sprint 1',
    icono: '📋',
    ruta: '/contratos/alta'
  },
  {
    codigo: 'HU-02',
    titulo: 'Registro de fianzas',
    descripcion: 'Pólizas de cumplimiento, anticipo y vicios ocultos ligadas al contrato.',
    sprint: 'Sprint 6',
    icono: '🛡️',
    ruta: '/contratos/fianzas'
  },
  {
    codigo: 'HU-08',
    titulo: 'Apertura de bitácora',
    descripcion: 'Acto formal con las tres partes — evento inalterable conforme al art. 46 LOPSRM.',
    sprint: 'Sprint 1',
    icono: '📖',
    ruta: '/bitacora/apertura'
  },
  {
    codigo: 'HU-09',
    titulo: 'Emisión de notas',
    descripcion: 'Notas tipificadas con folio automático y firma electrónica (art. 125 RLOPSRM).',
    sprint: 'Sprint 2',
    icono: '✍️',
    ruta: '/bitacora/notas'
  }
];
