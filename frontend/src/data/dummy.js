// Datos dummy para vistas huecas del Sprint 1.
// Fieles a docs/Maquetas_SIGECOP.html — no son datos reales del Sprint.

export const contratoDummy = {
  folio: 'C-2026-0042',
  tipo: 'Obra pública sobre la base de precios unitarios',
  objeto: 'Construcción de edificio administrativo en av. principal',
  contratista: 'Constructora XYZ S.A. de C.V.',
  dependencia: 'Secretaría de Obras Públicas',
  monto: '$ 12,450,000.00',
  anticipo: '$ 3,735,000.00 (30%)',
  // HU-12 — Versiones numéricas para los cálculos en vivo de la carátula
  // (porcentaje del anticipo y deductivas por penalización). El texto humano
  // queda en `anticipo` para los formularios que sólo lo despliegan.
  anticipoPct: 30,
  deductivasPenalizacion: 0,
  plazo: '180 días naturales',
  fechaInicio: '2026-06-01',
  fechaTermino: '2026-11-28',
  // HU-08 — La fecha de entrega del sitio es el evento que dispara la apertura
  // formal de la bitácora (art. 123 fr. III RLOPSRM). Coincide con fechaInicio para el
  // contrato dummy, pero conceptualmente es un dato distinto.
  fechaEntregaSitio: '2026-06-01'
};

export const conceptosDummy = [
  { clave: 'EXC-01', concepto: 'Excavación a cielo abierto, material tipo II', unidad: 'm³', cantidad: 1250, pu: 185.50 },
  { clave: 'CON-01', concepto: 'Concreto premezclado f\'c=250 kg/cm²', unidad: 'm³', cantidad: 420, pu: 2150.00 },
  { clave: 'ACE-01', concepto: 'Acero de refuerzo fy=4200 kg/cm²', unidad: 'kg', cantidad: 18500, pu: 28.75 },
  { clave: 'CIM-01', concepto: 'Cimbra de contacto para muros', unidad: 'm²', cantidad: 980, pu: 245.00 }
];

export const programaObraDummy = [
  { actividad: 'Preliminares y demolición', inicio: '2026-06-01', termino: '2026-06-30', peso: 15 },
  { actividad: 'Cimentación y estructura', inicio: '2026-07-01', termino: '2026-09-15', peso: 45 },
  { actividad: 'Acabados y entrega', inicio: '2026-09-16', termino: '2026-11-28', peso: 40 }
];

export const polizasGarantiaDummy = [
  { tipo: 'Anticipo', afianzadora: 'Afianzadora Sofimex', poliza: 'F-2026-08746', monto: 3735000, vigencia: '2026-08-28' },
  { tipo: 'Cumplimiento', afianzadora: 'Afianzadora Sofimex', poliza: 'F-2026-08745', monto: 1245000, vigencia: '2026-11-28' },
  { tipo: 'Vicios ocultos', afianzadora: 'Afianzadora Sofimex', poliza: 'F-2026-08747', monto: 190685, vigencia: '2027-11-28' }
];

// HU-02 — Pólizas de fianza. El campo clave es `diasOffset`: días desde HOY
// hasta el vencimiento (positivo = futuro, negativo = vencida). El componente
// calcula la fecha real con today + diasOffset y el badge de color por rango.
// Esto hace que el cálculo de alertas sea determinista en el dummy sin atarse
// a fechas absolutas que envejecen.
export const fianzasListadoDummy = [
  {
    folio: 'F-2026-08745',
    tipo: 'Cumplimiento',
    afianzadora: 'Afianzadora Sofimex',
    monto: 1245000,
    fechaEmisionLabel: '01/06/2026',
    diasOffset: 185,          // > 30 → verde
    archivoPdf: 'cumplimiento_F-2026-08745.pdf',
    tienePdf: true
  },
  {
    folio: 'F-2026-08746',
    tipo: 'Anticipo',
    afianzadora: 'Afianzadora Sofimex',
    monto: 3735000,
    fechaEmisionLabel: '01/06/2026',
    diasOffset: 93,           // > 30 → verde
    archivoPdf: 'anticipo_F-2026-08746.pdf',
    tienePdf: true
  },
  {
    folio: 'F-2026-09001',
    tipo: 'Cumplimiento',
    afianzadora: 'Afianzadora Aserta',
    monto: 980000,
    fechaEmisionLabel: '12/03/2026',
    diasOffset: 30,           // ≤ 30 → amarillo claro
    archivoPdf: 'cumplimiento_F-2026-09001.pdf',
    tienePdf: true
  },
  {
    folio: 'F-2026-09014',
    tipo: 'Anticipo',
    afianzadora: 'Afianzadora Atlas',
    monto: 425000,
    fechaEmisionLabel: '14/12/2025',
    diasOffset: 15,           // ≤ 15 → ámbar
    archivoPdf: 'anticipo_F-2026-09014.pdf',
    tienePdf: true
  },
  {
    folio: 'F-2026-09027',
    tipo: 'Vicios ocultos',
    afianzadora: 'Afianzadora Insurgentes',
    monto: 125000,
    fechaEmisionLabel: '02/11/2025',
    diasOffset: 4,            // ≤ 5 → rojo (vence en días)
    archivoPdf: 'vicios_F-2026-09027.pdf',
    tienePdf: true
  },
  {
    folio: 'F-2026-08501',
    tipo: 'Cumplimiento',
    afianzadora: 'Afianzadora Sofimex',
    monto: 550000,
    fechaEmisionLabel: '20/10/2025',
    diasOffset: -7,           // < 0 → rojo (ya venció)
    archivoPdf: 'cumplimiento_F-2026-08501.pdf',
    tienePdf: true
  }
];

// HU-08 — Tres firmantes autorizados para la apertura formal (art. 123 fr. III RLOPSRM):
// residente de obra, supervisor externo (opcional — puede no existir en el
// contrato) y superintendente. La parte 2 lleva `opcional: true` para que la
// vista permita marcarla "no aplica".
export const partesBitacoraDummy = [
  {
    num: 1,
    titulo: 'Residente de obra',
    firmante: 'Ing. Carlos Hernández García',
    cargoLabel: 'Cédula profesional',
    cargo: '7845612',
    correo: 'chernandez@sop.gob.mx',
    opcional: false
  },
  {
    num: 2,
    titulo: 'Supervisor externo',
    firmante: 'Ing. Roberto López',
    cargoLabel: 'Empresa',
    cargo: 'Supervisora Especializada S.C.',
    correo: 'rlopez@supervisora.mx',
    opcional: true
  },
  {
    num: 3,
    titulo: 'Superintendente (Contratista)',
    firmante: 'Arq. Carlos Mendoza',
    cargoLabel: 'Cédula profesional',
    cargo: '8475612',
    correo: 'cmendoza@constructora-xyz.mx',
    opcional: false
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

// HU-09 — Tipos de nota habilitados por rol (art. 125 RLOPSRM, fraccs. I-III).
// Residente AUTORIZA/APRUEBA, Contratista SOLICITA/AVISA, Supervisión REGISTRA AVANCE.
// En modo aplicación se filtra por rol activo; en modo proyecto se usa el catálogo
// del residente como default (no rompe la vitrina académica).
export const tiposNotaPorRol = {
  residente: [
    'Autorización de estimación',
    'Autorización de convenio modificatorio',
    'Aprobación de ajuste de costos',
    'Autorización de conceptos no previstos y cantidades adicionales'
  ],
  contratista: [
    'Solicitud de aprobación de estimación',
    'Aviso de atraso en el pago de estimaciones',
    'Solicitud de convenio modificatorio',
    'Solicitud de conceptos no previstos y cantidades adicionales'
  ],
  supervision: [
    'Registro de avance físico y financiero',
    'Observación técnica de calidad',
    'Registro de incidencia en obra'
  ]
};

// HU-09 — Firmante de la nota según rol activo (datos de ejemplo). En modo
// proyecto (sin rol) se usa el del residente por defecto.
export const firmantePorRol = {
  residente:   'Ing. Carlos Hernández García · Cédula 7845612',
  contratista: 'Ing. Roberto Salas Méndez · Superintendente · Cédula 6610234',
  supervision: 'Arq. Laura Jiménez Ortiz · Supervisión externa · Cédula 5523109'
};

// Doce HU de los Sprints 1-5 visual — usadas por la landing y el sidebar.
// Orden = flujo lógico (login → contrato → consulta → fianzas → bitácora →
// estimación → revisión → historial → tránsito → pago).
export const historiasUsuario = [
  {
    codigo: 'HU-00',
    titulo: 'Iniciar sesión',
    descripcion: 'Acceso al sistema sin selector de rol — el sistema lo deduce internamente.',
    sprint: 'Sprint 1',
    icono: '🔐',
    ruta: '/'
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
    codigo: 'HU-04',
    titulo: 'Consulta de expediente',
    descripcion: 'Ver todos los elementos vigentes del contrato en una sola vista con buscador.',
    sprint: 'Sprint 4',
    icono: '🗂️',
    ruta: '/contratos/expediente'
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
  },
  {
    codigo: 'HU-10',
    titulo: 'Consulta de notas',
    descripcion: 'Buscar notas de bitácora por tipo, fecha, firmante o tema y adjuntarlas a estimaciones.',
    sprint: 'Sprint 3',
    icono: '🔍',
    ruta: '/bitacora/consulta'
  },
  {
    codigo: 'HU-12',
    titulo: 'Integración de estimación',
    descripcion: 'Integrar la estimación del periodo como expediente completo conforme al art. 132 RLOPSRM.',
    sprint: 'Sprint 3',
    icono: '🧾',
    ruta: '/estimaciones/integracion'
  },
  {
    codigo: 'HU-15',
    titulo: 'Revisión de estimación',
    descripcion: 'Supervisión y residencia revisan, observan y autorizan o rechazan la estimación.',
    sprint: 'Sprint 4',
    icono: '✅',
    ruta: '/estimaciones/revision'
  },
  {
    codigo: 'HU-14',
    titulo: 'Historial de estimaciones',
    descripcion: 'Trazabilidad completa del ciclo de cobro, incluyendo versiones rechazadas.',
    sprint: 'Sprint 5',
    icono: '📊',
    ruta: '/estimaciones/historial'
  },
  {
    codigo: 'HU-20',
    titulo: 'Tránsito a pago',
    descripcion: 'Verificación presupuestal, instrucción de pago y semáforo del plazo de 20 días.',
    sprint: 'Sprint 5',
    icono: '💸',
    ruta: '/pagos/transito'
  },
  {
    codigo: 'HU-21',
    titulo: 'Registro de pago',
    descripcion: 'Registrar el pago de una estimación y cerrar el ciclo de cobro del contrato.',
    sprint: 'Sprint 2',
    icono: '💵',
    ruta: '/pagos/registro'
  },
  {
    codigo: 'HU-03',
    titulo: 'Convenios modificatorios',
    descripcion: 'Registro de modificatorios (monto, plazo o conceptos) con histórico de versiones y aviso del 50% (art. 59 / 59 Bis LOPSRM).',
    sprint: 'Sprint 6',
    icono: '📝',
    ruta: '/contratos/modificatorios'
  },
  {
    codigo: 'HU-07',
    titulo: 'Configuración de alertas de atraso',
    descripcion: 'Definir umbrales por concepto del programa y canal de notificación. Las alertas se disparan cuando el avance real cae bajo el umbral.',
    sprint: 'Sprint 6',
    icono: '🔔',
    ruta: '/seguimiento/alertas'
  },
  {
    codigo: 'HU-05',
    titulo: 'Programa y curva de avance',
    descripcion: 'Gráfico comparativo de las curvas programado, ejecutado y financiero, con filtros por concepto y periodo.',
    sprint: 'Sprint 7',
    icono: '📈',
    ruta: '/seguimiento/curva-avance'
  },
  {
    codigo: 'HU-06',
    titulo: 'Registro de trabajos terminados',
    descripcion: 'Captura del avance del periodo por concepto del catálogo, con vínculo a la nota de bitácora y bloqueo si excede la cantidad contratada.',
    sprint: 'Sprint 7',
    icono: '🏗️',
    ruta: '/seguimiento/trabajos-terminados'
  },
  {
    codigo: 'HU-11',
    titulo: 'Minutas y agenda de visitas',
    descripcion: 'Registro de minutas y visitas del contrato, con consulta de los acuerdos y compromisos derivados, filtrables por periodo.',
    sprint: 'Sprint 7',
    icono: '📝',
    ruta: '/bitacora/minutas'
  },
  {
    codigo: 'HU-13',
    titulo: 'Envío de la estimación',
    descripcion: 'Envío formal de la estimación con acuse de fecha y hora, validando el plazo de 6 días naturales del art. 54 LOPSRM.',
    sprint: 'Sprint 8',
    icono: '📤',
    ruta: '/estimaciones/envio'
  },
  {
    codigo: 'HU-16',
    titulo: 'Reingreso de estimación tras rechazo',
    descripcion: 'Reingreso como nueva versión independiente con histórico vinculado; observaciones descargables en PDF o Excel.',
    sprint: 'Sprint 8',
    icono: '↩️',
    ruta: '/estimaciones/reingreso'
  },
  {
    codigo: 'HU-17',
    titulo: 'Tablero de estimaciones',
    descripcion: 'Visualización del ciclo de las estimaciones aceptadas y en proceso, con panel de pendientes filtrado por rol.',
    sprint: 'Sprint 8',
    icono: '📊',
    ruta: '/estimaciones/tablero'
  },
  {
    codigo: 'HU-18',
    titulo: 'Portafolio ejecutivo',
    descripcion: 'Tablero de varios contratos con semáforo por contrato y drill-down de avance físico, financiero y penalizaciones.',
    sprint: 'Sprint 9',
    icono: '🚦',
    ruta: '/portafolio'
  },
  {
    codigo: 'HU-19',
    titulo: 'Exportación de reportes',
    descripcion: 'Generación de los 7 reportes del contrato en PDF y Excel, con selector de periodo (mensual, trimestral, acumulado).',
    sprint: 'Sprint 9',
    icono: '📥',
    ruta: '/reportes'
  }
];

// HU-14 — Historial completo del ciclo de cobro (incluye versiones rechazadas).
// Cada fila lleva `id` único (folio+versión) para anclar el drawer del detalle.
// Las fechas de revisión y pago son null cuando aún no aplican; observaciones
// es lista vacía salvo en rechazadas.
export const historialEstimacionesDummy = [
  {
    id: 'EST-2026-001-v1',
    estimacion: 'EST-2026-001',
    periodo: 'Abr 2026',
    version: 'v1',
    estado: 'Aceptada',
    importe: '$ 980,500.00',
    fechaPresentacion: '10/04/2026',
    fechaRevision: '12/04/2026',
    fechaPago: '15/04/2026',
    observaciones: []
  },
  {
    id: 'EST-2026-002-v1',
    estimacion: 'EST-2026-002',
    periodo: 'May 2026',
    version: 'v1',
    estado: 'Rechazada',
    importe: '$ 1,150,000.00',
    fechaPresentacion: '12/05/2026',
    fechaRevision: '14/05/2026',
    fechaPago: null,
    observaciones: [
      'Diferencia en números generadores del concepto Excavación.',
      'Falta soporte fotográfico del armado del eje 7-B.',
      'Precio unitario fuera de catálogo en Acero de refuerzo.'
    ]
  },
  {
    id: 'EST-2026-002-v2',
    estimacion: 'EST-2026-002',
    periodo: 'May 2026',
    version: 'v2',
    estado: 'Aceptada',
    importe: '$ 1,120,300.00',
    fechaPresentacion: '16/05/2026',
    fechaRevision: '18/05/2026',
    fechaPago: '22/05/2026',
    observaciones: []
  },
  {
    id: 'EST-2026-003-v1',
    estimacion: 'EST-2026-003',
    periodo: 'May 2026',
    version: 'v1',
    estado: 'En proceso',
    importe: '$ 1,285,750.00',
    fechaPresentacion: '23/05/2026',
    fechaRevision: null,
    fechaPago: null,
    observaciones: []
  }
];

export const periodosHistorialDummy = ['Todos', 'Abr 2026', 'May 2026'];
export const estadosHistorialDummy = ['Todos', 'Aceptada', 'Rechazada', 'En proceso'];

// HU-04 — Bloques del expediente contractual (CA-1: los 5 bloques en una vista).
export const bloquesExpedienteDummy = [
  {
    id: 'configuracion',
    titulo: 'Configuración del contrato',
    icono: '⚙️',
    contenido: [
      { label: 'Folio',        valor: 'C-2026-0042' },
      { label: 'Objeto',       valor: 'Construcción de edificio administrativo en av. principal' },
      { label: 'Contratista',  valor: 'Constructora XYZ S.A. de C.V.' },
      { label: 'Dependencia',  valor: 'Secretaría de Obras Públicas' },
      { label: 'Monto',        valor: '$ 12,450,000.00 MXN' },
      { label: 'Plazo',        valor: '180 días naturales' },
      { label: 'Modalidad',    valor: 'Precios unitarios' },
      { label: 'Vigencia',     valor: '01/06/2026 — 28/11/2026' }
    ]
  }
];

// HU-15 — Pasos del flujo secuencial de revisión (CA-2).
export const pasosRevisionDummy = [
  { id: 'supervision', label: 'Supervisión', estado: 'En revisión' },
  { id: 'residencia',  label: 'Residencia',  estado: 'En espera' },
  { id: 'resolucion',  label: 'Resolución',  estado: 'Pendiente' }
];

// HU-15 — Fecha de recepción de la estimación (inicio del plazo de revisión de
// 15 días naturales del art. 54 LOPSRM). El componente calcula `diaActual` en
// vivo restando esta fecha a Date.now(). Está fija en el dummy para no atarse
// al envío real (HU-13 lo dispararía en producción).
export const fechaRecepcionEstimacionISO = '2026-05-15';

// HU-15 — Catálogos de los selects pequeños por observación.
export const tiposObservacionRevision = ['Aclaración', 'Corrección', 'Rechazo'];
export const severidadesObservacionRevision = ['Menor', 'Mayor', 'Crítica'];

// HU-20 — Suficiencia presupuestal (art. 24 LOPSRM).
export const presupuestoDummy = {
  techo: 15000000,
  comprometido: 11200000,
  estimacion: 1285750
};

// HU-20 — Soportes obligatorios para tránsito a pago.
export const soportesPagoDummy = [
  { id: 'factura',     documento: 'Factura del periodo',         cargado: true  },
  { id: 'cfdi',        documento: 'CFDI',                        cargado: true  },
  { id: 'fianza',      documento: 'Estado de cuenta de fianza',  cargado: false }
];

// HU-20 — Offset (en dias) desde la fecha de autorizacion hasta HOY. Se usa
// asi (en lugar de una fecha ISO fija) para que el calculo siempre arroje un
// valor estable que cae en zona ambar (11-17). El componente computa la fecha
// real con today - diasDesdeAutorizacion y muestra "Dia X de 20".
export const fechaAutorizacionOffsetDias = 13;

// alta-v2: el export `vistasPropuesta` (vistas "Propuesta" del modo proyecto) se eliminó
// junto con el modo proyecto. La ruta /solicitud-acceso ahora es PÚBLICA (ver App.jsx).

// HU-21 — Estimaciones disponibles para pago y pagos ya registrados.
export const estimacionesParaPagoDummy = [
  { folio: 'EST-2026-003', periodo: 'Mayo 2026', neto: 1285750.00, etiqueta: 'EST-2026-003 — Mayo 2026 — $1,285,750.00 neto' }
];

export const pagosRegistradosDummy = [
  { estimacion: 'EST-2026-001', fecha: '15/04/2026', importe: '$ 980,500.00', referencia: 'SPEI-4471', estado: 'Pagada' },
  { estimacion: 'EST-2026-002', fecha: '14/05/2026', importe: '$ 1,120,300.00', referencia: 'SPEI-5582', estado: 'Pagada' }
];

// HU-10 — Catálogo completo de tipos de nota (art. 125 RLOPSRM).
export const tiposNotaCatalogo = [
  'Instrucción',
  'Acuerdo',
  'Solicitud',
  'Confirmación',
  'Respuesta'
];

export const estatusNotaCatalogo = ['Firmada', 'Pendiente respuesta', 'Respondida'];

// HU-10 — Notas para consulta (6 notas con metadatos de búsqueda).
export const notasConsultaDummy = [
  { folio: 'NB-2026-0023', tipo: 'Instrucción',  fecha: '2026-05-18', firmante: 'María López',     estatus: 'Firmada',             tema: 'Inicio de obra' },
  { folio: 'NB-2026-0024', tipo: 'Solicitud',    fecha: '2026-05-19', firmante: 'Juan Pérez',      estatus: 'Pendiente respuesta', tema: 'Aclaración de concepto' },
  { folio: 'NB-2026-0025', tipo: 'Acuerdo',      fecha: '2026-05-20', firmante: 'Carlos Sánchez',  estatus: 'Firmada',             tema: 'Ajuste de programa' },
  { folio: 'NB-2026-0026', tipo: 'Respuesta',    fecha: '2026-05-21', firmante: 'María López',     estatus: 'Respondida',          tema: 'Aclaración de concepto' },
  { folio: 'NB-2026-0027', tipo: 'Confirmación', fecha: '2026-05-22', firmante: 'Juan Pérez',      estatus: 'Firmada',             tema: 'Entrega parcial' },
  { folio: 'NB-2026-0028', tipo: 'Instrucción',  fecha: '2026-05-23', firmante: 'María López',     estatus: 'Firmada',             tema: 'Corrección de acabados' }
];

// HU-12 — Carátula de cálculo de la estimación del periodo.
export const caratulaEstimacionDummy = [
  { concepto: 'Monto bruto de la estimación',                 importe:  1850000.00, tipo: 'positivo' },
  { concepto: '(-) Amortización de anticipo (30%)',           importe:  -555000.00, tipo: 'deduccion' },
  { concepto: '(-) Retención 5 al millar (art. 191 LFD)',     importe:    -9250.00, tipo: 'deduccion' },
  { concepto: '(-) Deductivas por penalización',              importe:        0.00, tipo: 'deduccion' },
  { concepto: '(=) Neto a pagar',                             importe:  1285750.00, tipo: 'neto' }
];

// HU-12 — Números generadores (acumulados del periodo). El campo `pu` (precio
// unitario en MXN) alimenta el cálculo en vivo del subtotal de la carátula.
export const generadoresEstimacionDummy = [
  { concepto: 'Excavación',        unidad: 'm³',  contratado: 1000, periodoDefault: 250, anteriorAcum: 350, avancePct: 60, pu:   185.50 },
  { concepto: 'Concreto f\'c=250', unidad: 'm³',  contratado:  500, periodoDefault:  80, anteriorAcum: 120, avancePct: 40, pu:  2150.00 },
  { concepto: 'Acero de refuerzo', unidad: 'ton', contratado:   50, periodoDefault:  12, anteriorAcum:  18, avancePct: 60, pu: 28750.00 },
  { concepto: 'Muros de block',    unidad: 'm²',  contratado:  800, periodoDefault: 150, anteriorAcum: 200, avancePct: 44, pu:   245.00 }
];

// HU-12 — Placeholders del registro fotográfico.
export const fotosEstimacionDummy = [
  { id: 1, descripcion: 'Cimentación eje A' },
  { id: 2, descripcion: 'Armado de columnas' },
  { id: 3, descripcion: 'Colado de losa nivel 1' },
  { id: 4, descripcion: 'Avance general del frente' }
];

// HU-12 — Soportes documentales requeridos.
export const soportesEstimacionDummy = [
  { documento: 'Factura del periodo',    estado: 'Pendiente de carga', cargado: false },
  { documento: 'CFDI',                   estado: 'Pendiente de carga', cargado: false },
  { documento: 'Reporte de laboratorio', estado: 'Cargado (dummy)',    cargado: true }
];

// HU-12 — Notas del periodo disponibles para vincular a la estimación.
export const notasParaVincularDummy = [
  { folio: 'NB-2026-0023', tipo: 'Instrucción', fecha: '18/05/2026', tema: 'Inicio de obra' },
  { folio: 'NB-2026-0025', tipo: 'Acuerdo',     fecha: '20/05/2026', tema: 'Ajuste de programa' },
  { folio: 'NB-2026-0027', tipo: 'Confirmación', fecha: '22/05/2026', tema: 'Entrega parcial' }
];

// HU-03 — Catálogo de tipos de modificatorio (art. 59 LOPSRM).
export const tiposConvenioModificatorio = ['Monto', 'Plazo', 'Conceptos', 'Mixto'];

// HU-03 — Histórico de versiones del contrato (dummy). El v1 es el contrato
// original; los siguientes corresponden a modificatorios aplicados.
export const historicoVersionesContratoDummy = [
  { version: 'v1 (original)', fecha: '01/06/2026', autor: 'Dependencia', tipo: '—',         motivo: 'Contrato inicial' },
  { version: 'v2',            fecha: '15/07/2026', autor: 'Dependencia', tipo: 'Conceptos', motivo: 'Ajuste de catálogo por obra adicional en eje 7-B' },
  { version: 'v3',            fecha: '02/09/2026', autor: 'Dependencia', tipo: 'Plazo',     motivo: 'Ampliación de 20 días por lluvias atípicas' }
];

// HU-03 — Umbral del 50% del contrato original (art. 59 Bis LOPSRM). Si la
// modificación lo rebasa, se activa el aviso del art. 59 Bis LOPSRM.
export const contratoBaseModificatorios = (() => {
  const montoOriginal = 12450000;
  const plazoOriginalDias = 180;
  return {
    montoOriginal,
    plazoOriginalDias,
    umbralMontoExtraordinario: montoOriginal * 0.5,
    umbralPlazoExtraordinario: plazoOriginalDias * 0.5,
  };
})();

// HU-07 — Catálogo de conceptos vigilables para alertas (dummy del programa).
export const conceptosAlertaDummy = [
  'Excavación',
  'Cimentación',
  'Estructura',
  'Albañilería',
  'Instalaciones'
];

// HU-05 — Curva S del contrato. % acumulado por mes para las 3 series. En una
// implementación real estos puntos vendrían del programa contratado, del avance
// reportado y de las estimaciones cobradas.
export const curvaAvanceDummy = [
  { mes: 'Jun', programado:   5, ejecutado:  4, financiero:  3 },
  { mes: 'Jul', programado:  15, ejecutado: 12, financiero: 10 },
  { mes: 'Ago', programado:  35, ejecutado: 30, financiero: 25 },
  { mes: 'Sep', programado:  60, ejecutado: 52, financiero: 45 },
  { mes: 'Oct', programado:  85, ejecutado: 75, financiero: 68 },
  { mes: 'Nov', programado: 100, ejecutado: 90, financiero: 82 }
];

// HU-05 — Catálogos de filtros consultativos (no van en RegionEditable).
export const conceptosCurvaDummy = ['Todos', 'Excavación', 'Cimentación', 'Estructura', 'Albañilería'];
export const periodosCurvaDummy = ['Todo el contrato', 'Últimos 3 meses', 'Último mes'];

// HU-05 — Catálogo de conceptos del programa (descripción, unidad, cantidad
// contratada). Las claves "concepto" coinciden con los filtros y con las filas
// del Gantt (programaObraGanttDummy).
export const catalogoConceptosCurvaDummy = [
  { concepto: 'Excavación',  descripcion: 'Excavación a cielo abierto, material tipo II',          unidad: 'm³',  cantidadContratada: 1250 },
  { concepto: 'Cimentación', descripcion: 'Concreto premezclado f\'c=250 kg/cm² en zapatas',       unidad: 'm³',  cantidadContratada:  420 },
  { concepto: 'Estructura',  descripcion: 'Acero de refuerzo fy=4200 kg/cm² y cimbra de muros',    unidad: 'ton', cantidadContratada:   80 },
  { concepto: 'Albañilería', descripcion: 'Muros de block y acabados de albañilería',              unidad: 'm²',  cantidadContratada:  980 }
];

// HU-05 — Matriz tipo Gantt: por cada concepto y mes del contrato, el estado.
// Estados:
//   'ejecutado'     → mes con avance real registrado (verde).
//   'programado'    → mes programado sin ejecutar todavía (ámbar — atraso o por venir).
//   'no-programado' → fuera del programa para ese concepto (gris claro).
// Los meses coinciden con curvaAvanceDummy para que el filtro de periodo recorte
// ambos (curva y Gantt) de forma consistente.
export const programaObraGanttDummy = [
  { concepto: 'Excavación',  porMes: { Jun: 'ejecutado',     Jul: 'ejecutado',     Ago: 'no-programado', Sep: 'no-programado', Oct: 'no-programado', Nov: 'no-programado' } },
  { concepto: 'Cimentación', porMes: { Jun: 'no-programado', Jul: 'ejecutado',     Ago: 'ejecutado',     Sep: 'programado',    Oct: 'no-programado', Nov: 'no-programado' } },
  { concepto: 'Estructura',  porMes: { Jun: 'no-programado', Jul: 'no-programado', Ago: 'ejecutado',     Sep: 'ejecutado',     Oct: 'programado',    Nov: 'no-programado' } },
  { concepto: 'Albañilería', porMes: { Jun: 'no-programado', Jul: 'no-programado', Ago: 'no-programado', Sep: 'ejecutado',     Oct: 'programado',    Nov: 'programado'    } }
];

// HU-06 — Conceptos del catálogo con avance previo, para captura del periodo.
// La validación de exceso bloquea el guardado si previo + capturado > contratada.
export const conceptosTrabajosDummy = [
  { id: 1, concepto: 'Excavación',  unidad: 'm³',  contratada: 1000, acumPrevio: 600 },
  { id: 2, concepto: 'Cimentación', unidad: 'm³',  contratada:  500, acumPrevio: 300 },
  { id: 3, concepto: 'Estructura',  unidad: 'ton', contratada:   80, acumPrevio:  40 }
];

// HU-06 — Notas de bitácora tipo "entrega" disponibles para vincular cada
// renglón del registro de avance al asiento de bitácora correspondiente.
export const notasEntregaDummy = [
  '— Sin vínculo —',
  'NOTA-2026-014 · Entrega de avance · 18/05/2026',
  'NOTA-2026-015 · Entrega de avance · 22/05/2026',
  'NOTA-2026-016 · Entrega de avance · 28/05/2026'
];

// HU-11 — Minutas ya registradas. Folio MIN-NNN correlativo. archivoPdf simula
// el nombre del archivo cargado (sin subirlo a ningún lado). La columna
// "acuerdos" es el conteo de compromisos derivados (se ven en la pestaña
// Acuerdos con su detalle).
export const minutasDummy = [
  { folio: 'MIN-001', fecha: '15/05/2026', lugar: 'Sala de juntas — Residencia', participantes: 'Residente, Superintendente, Supervisión', asunto: 'Reunión de avance mensual', archivoPdf: 'minuta_avance_mayo.pdf', acuerdos: 3 },
  { folio: 'MIN-002', fecha: '01/05/2026', lugar: 'Oficina de la Dependencia',   participantes: 'Residente, Dependencia, Contratista',     asunto: 'Junta de inicio de obra',   archivoPdf: 'minuta_inicio_obra.pdf', acuerdos: 2 }
];

// HU-11 — Visitas agendadas. Folio VIS-NNN correlativo. El estado conduce el
// color del badge en la tabla (Realizada / Programada / Cancelada).
export const visitasDummy = [
  { folio: 'VIS-001', fecha: '20/05/2026', lugar: 'Frente de obra norte', responsable: 'Supervisión', proposito: 'Inspección del armado de columnas',   estado: 'Realizada'  },
  { folio: 'VIS-002', fecha: '28/05/2026', lugar: 'Frente de obra norte', responsable: 'Residente',   proposito: 'Visita técnica conjunta del periodo', estado: 'Programada' },
  { folio: 'VIS-003', fecha: '03/06/2026', lugar: 'Frente de obra sur',   responsable: 'Supervisión', proposito: 'Inspección de cimentación',           estado: 'Programada' }
];

// HU-11 — Acuerdos derivados de minutas o visitas. El "periodo" agrupa por mes
// y conduce el filtro consultativo de la pestaña Acuerdos.
export const acuerdosDummy = [
  { id: 1, acuerdo: 'Entregar programa actualizado',  origen: 'Minuta 15/05', responsable: 'Contratista', compromiso: '22/05/2026', estado: 'Cumplido',   periodo: 'Mayo 2026' },
  { id: 2, acuerdo: 'Reparar acceso provisional',     origen: 'Visita 20/05', responsable: 'Contratista', compromiso: '25/05/2026', estado: 'Pendiente',  periodo: 'Mayo 2026' },
  { id: 3, acuerdo: 'Enviar fianza de vicios ocultos', origen: 'Minuta 01/05', responsable: 'Contratista', compromiso: '30/05/2026', estado: 'En proceso', periodo: 'Mayo 2026' }
];

// HU-11 — Catálogo de periodos consultables para el filtro de Acuerdos.
export const periodosAcuerdosDummy = ['Todos', 'Mayo 2026', 'Junio 2026'];

// HU-13 — Resumen de la estimación a enviar y datos del control de plazo.
// El usuario edita "diasDefault" desde la vista para alternar dentro/fuera de los
// 6 dias naturales del art. 54 LOPSRM y ver la doble respuesta.
export const envioEstimacionDummy = {
  numero: 3,
  periodo: 'Mayo 2026',
  conceptos: 12,
  monto: '$ 1,850,000.00',
  fechaCorte: '31/05/2026',
  diasDefault: 3
};

// HU-16 — Observaciones de la version rechazada. Cada una con severidad para
// que la tabla pueda usar el badge de color (alta/media/baja).
export const observacionesRechazoDummy = [
  { id: 1, concepto: 'Excavación',  observacion: 'Cantidad no coincide con bitácora',     severidad: 'Alta'  },
  { id: 2, concepto: 'Cimentación', observacion: 'Falta número generador',                severidad: 'Media' },
  { id: 3, concepto: 'Estructura',  observacion: 'Precio unitario fuera de catálogo',     severidad: 'Alta'  }
];

// HU-16 — Datos para el banner de contexto (rechazo de la estimacion en curso).
export const reingresoBannerDummy = {
  numero: 3,
  periodo: 'Mayo 2026'
};

// HU-16 — Historico de versiones de la estimacion 3. La nueva version se trata
// como bloque independiente y la rechazada queda vinculada como historico.
export const historicoVersionesDummy = [
  { version: 'v1', fecha: '02/06/2026',     estado: 'Rechazada' },
  { version: 'v2', fecha: '(en preparación)', estado: 'Borrador'  }
];

// HU-17 — Estimaciones en el tablero. Solo aceptadas y en proceso (CA-1: las
// rechazadas viven en el historial HU-14, no aqui). Los estados validos son
// 'Presentada' | 'En revisión' | 'Autorizada' | 'En pago' | 'Pagada'.
//
// Campos auxiliares (para filtros, montos agregados y "días en estado"):
//   · montoNum   — importe numérico (sin formato) para sumas y agregados.
//   · responsable — rol responsable del siguiente paso (driver del filtro).
//   · diasEnEstado — días transcurridos en el estado actual (alimenta el cálculo
//     del KPI "días promedio en cada estado" del tablero).
export const estimacionesTableroDummy = [
  { numero: 1, periodo: 'Feb 2026', monto: '$ 1,200,000.00', montoNum: 1200000, estado: 'Pagada',      responsable: 'finanzas',   diasEnEstado:  3 },
  { numero: 2, periodo: 'Mar 2026', monto: '$ 1,500,000.00', montoNum: 1500000, estado: 'En pago',     responsable: 'finanzas',   diasEnEstado:  8 },
  { numero: 3, periodo: 'Abr 2026', monto: '$ 1,750,000.00', montoNum: 1750000, estado: 'Autorizada',  responsable: 'dependencia', diasEnEstado:  2 },
  { numero: 4, periodo: 'May 2026', monto: '$ 1,850,000.00', montoNum: 1850000, estado: 'En revisión', responsable: 'supervision', diasEnEstado:  4 },
  { numero: 5, periodo: 'May 2026', monto: '$   900,000.00', montoNum:  900000, estado: 'Presentada',  responsable: 'residente',   diasEnEstado:  1 }
];

// HU-17 — Indicadores agregados del contrato (parte alta del tablero). El
// avance físico viene de la curva real (HU-05) y los días promedio en cada
// estado se computan en el componente a partir de diasEnEstado.
export const indicadoresContratoTableroDummy = {
  avanceFisicoPct: 78,
  montoTotalEstimado: 7200000,
  montoPagado: 1200000,
  montoPendiente: 6000000
};

// HU-17 — Catalogos de filtros del tablero (consultativos).
export const filtroEstadosTableroDummy = ['Todos', 'Presentada', 'En revisión', 'Autorizada', 'En pago', 'Pagada'];
export const filtroPeriodosTableroDummy = ['Todos', 'Feb 2026', 'Mar 2026', 'Abr 2026', 'May 2026'];
export const filtroResponsablesTableroDummy = ['Todos', 'residente', 'contratista', 'supervision', 'dependencia', 'finanzas'];

// HU-17 — Pendientes por rol para el panel "Mis pendientes". El catalogo usa
// las mismas claves de ROLES (residente, contratista, supervision, dependencia,
// finanzas). rol=null (modo proyecto) cae al default 'residente' en la vista.
export const pendientesEstimacionPorRol = {
  residente: [
    'Estimación 3 espera tu autorización',
    'Estimación 4 requiere tu visto final'
  ],
  contratista: [
    'Estimación 5 presentada, en espera de revisión'
  ],
  supervision: [
    'Estimación 4 espera tu revisión técnica'
  ],
  dependencia: [
    'Estimación 2 lista para programar el pago'
  ],
  finanzas: []
};

// HU-18 — Contratos del portafolio. Es la unica vista del backlog que opera
// sobre multiples contratos. El semaforo se DERIVA en el componente a partir
// de los tres factores crudos del campo `factores`:
//   · desviacionAvance — programado - real (positivo = atraso).
//   · diasVencidos     — dias vencidos en estimaciones/pagos.
//   · pendientesSinAtender — conteo de tareas sin cierre.
// Cada factor aporta 0/1/2 puntos; suma -> verde (0-1), amarillo (2-3), rojo (≥4).
// avanceMesAnterior alimenta el badge "vs mes anterior" del CA-3.
export const portafolioContratosDummy = [
  {
    folio: 'C-2026-0042', contratista: 'Constructora XYZ',          avance:  90,
    estado: 'Sin atraso',
    avanceMesAnterior: 85,
    ejercicioFiscal: '2026',
    tipoContratacion: 'Licitación pública',
    factores: { desviacionAvance:  -2, diasVencidos:  0, pendientesSinAtender: 0 },
    indicadores: { avanceFisico: 90, avanceFinanciero: 88, penalizaciones: 0 }
  },
  {
    folio: 'C-2026-0047', contratista: 'Constructora del Valle',    avance:  78,
    estado: 'Al corriente',
    avanceMesAnterior: 70,
    ejercicioFiscal: '2026',
    tipoContratacion: 'Invitación a 3',
    factores: { desviacionAvance:   3, diasVencidos:  0, pendientesSinAtender: 1 },
    indicadores: { avanceFisico: 78, avanceFinanciero: 75, penalizaciones: 0 }
  },
  {
    folio: 'C-2026-0038', contratista: 'Edificaciones del Norte',   avance:  65,
    estado: 'Atraso leve',
    avanceMesAnterior: 65,
    ejercicioFiscal: '2025',
    tipoContratacion: 'Licitación pública',
    factores: { desviacionAvance:  10, diasVencidos:  5, pendientesSinAtender: 1 },
    indicadores: { avanceFisico: 65, avanceFinanciero: 60, penalizaciones: 25_000 }
  },
  {
    folio: 'C-2026-0029', contratista: 'Obras y Proyectos SA',      avance: 100,
    estado: 'Finiquito pendiente',
    avanceMesAnterior: 100,
    ejercicioFiscal: '2025',
    tipoContratacion: 'Adjudicación directa',
    factores: { desviacionAvance:   0, diasVencidos:  3, pendientesSinAtender: 2 },
    indicadores: { avanceFisico: 100, avanceFinanciero: 95, penalizaciones: 0 }
  },
  {
    folio: 'C-2026-0051', contratista: 'Infraestructura del Bajío', avance:  40,
    estado: 'Atraso crítico + penalización',
    avanceMesAnterior: 38,
    ejercicioFiscal: '2026',
    tipoContratacion: 'Licitación pública',
    factores: { desviacionAvance:  25, diasVencidos: 18, pendientesSinAtender: 4 },
    indicadores: { avanceFisico: 40, avanceFinanciero: 35, penalizaciones: 180_000 }
  }
];

// HU-18 — Catalogo de opciones del control "Agrupar por".
export const agruparPorPortafolioDummy = ['Ninguno', 'Contratista', 'Ejercicio fiscal', 'Tipo de contratación'];

// HU-19 — Los 7 reportes definidos en el alcance del proyecto. Cada uno con
// los formatos en que se exporta (PDF, Excel o ambos). El catalogo cuadra con
// los handlers reales del componente (jsPDF/SheetJS).
export const reportesCatalogoDummy = [
  { id: 1, nombre: 'Avance físico vs programado', descripcion: 'Curva S + concepto × periodo (HU-05).',                 formatos: ['PDF', 'Excel'] },
  { id: 2, nombre: 'Avance financiero',           descripcion: 'Comprometido, autorizado, pagado y disponible por mes.',formatos: ['Excel']        },
  { id: 3, nombre: 'Listado de estimaciones',     descripcion: 'Una fila por estimación con versión, estado y fechas.', formatos: ['Excel']        },
  { id: 4, nombre: 'Listado de observaciones',    descripcion: 'Observaciones de la última versión rechazada.',         formatos: ['Excel']        },
  { id: 5, nombre: 'Bitácora completa',           descripcion: 'Notas cronológicas con folio, fecha, tipo, firmas.',    formatos: ['PDF']          },
  { id: 6, nombre: 'Histórico de modificatorios', descripcion: 'Versiones del contrato (art. 59 / 59 Bis LOPSRM).',     formatos: ['Excel']        },
  { id: 7, nombre: 'Penalizaciones y deductivas', descripcion: 'Penas convencionales por atraso por contrato.',         formatos: ['Excel']        }
];

// HU-19 — Catalogo del selector de periodo (consultativo).
export const periodosReportesDummy = ['Mensual', 'Trimestral', 'Acumulado'];

// HU-07 — Alertas ya configuradas (dummy). El folio A-NNN es correlativo y se
// usa para derivar el siguiente correlativo al crear una nueva alerta. El estado
// define la acción disponible (Activa → "Pausar"; Pausada → "Reanudar").
export const alertasConfiguradasDummy = [
  { folio: 'A-001', concepto: 'Cimentación',   umbral: 80, canal: 'Correo',   estado: 'Activa'  },
  { folio: 'A-002', concepto: 'Estructura',    umbral: 90, canal: 'Sistema',  estado: 'Activa'  },
  { folio: 'A-003', concepto: 'Instalaciones', umbral: 75, canal: 'Sistema',  estado: 'Pausada' }
];

// HU-07 — Avance simulado por concepto del programa (el "equivalente" al
// porcentaje que en una implementación real vendría de la curva ejecutada o de
// programaObraGanttDummy). Conduce la sección "Alertas disparadas": si el
// avance real es menor al umbral configurado, la alerta entra al timeline.
//
// Diseñado a propósito para que con las alertas de fábrica al menos una activa
// dispare (Cimentación 65% < umbral 80%) y una activa NO (Estructura 50%? con
// umbral 90 también dispara; la única no disparada es la pausada de
// Instalaciones — por estar Pausada se filtra del timeline).
export const avanceConceptoAlertaDummy = {
  'Excavación':    100,
  'Cimentación':    65,
  'Estructura':     50,
  'Albañilería':    30,
  'Instalaciones':  70
};

// HU-09 / HU-10 / HU-12 — Libro de bitácora unificado. Cada nota lleva folio
// correlativo `BIT-XXXX`, fecha ISO, tipo (catálogo de art. 125 RLOPSRM),
// firmante, rol del firmante, asunto + contenido (para búsqueda por palabra
// clave), y `vinculadaA` (folio de una nota previa o null). Las vistas:
//   · HU-09 lo lee para mostrar el libro y deriva el próximo folio.
//   · HU-10 lo filtra por tipo, fecha, firmante, vínculo y palabra clave.
//   · HU-12 lo expone en el buscador modal para vincular notas a la estimación.
export const notasBitacoraDummy = [
  { folio: 'BIT-0001', tipo: 'Instrucción',  fecha: '2026-05-02', firmante: 'Ing. Carlos Hernández García', rol: 'residente',   asunto: 'Inicio de obra y entrega del sitio',                          contenido: 'Se da formalmente inicio a la obra el día 01/06/2026 conforme al contrato C-2026-0042. Las firmas de la apertura quedan asentadas en este libro.',                vinculadaA: null,        color: 'blue'  },
  { folio: 'BIT-0002', tipo: 'Solicitud',    fecha: '2026-05-05', firmante: 'Arq. Carlos Mendoza',          rol: 'contratista', asunto: 'Solicitud de aclaración sobre cimentación del eje 7-B',       contenido: 'Se solicita aclaración sobre el procedimiento constructivo del eje 7-B considerando el estudio de mecánica de suelos del 12/05/2026.',                          vinculadaA: null,        color: 'amber' },
  { folio: 'BIT-0003', tipo: 'Respuesta',    fecha: '2026-05-06', firmante: 'Ing. Carlos Hernández García', rol: 'residente',   asunto: 'Respuesta a BIT-0002 — procedimiento de cimentación',         contenido: 'Atendiendo BIT-0002, se autoriza el procedimiento propuesto con ajuste menor en profundidad de zapatas para el eje 7-B.',                                       vinculadaA: 'BIT-0002',  color: 'green' },
  { folio: 'BIT-0004', tipo: 'Acuerdo',      fecha: '2026-05-10', firmante: 'Ing. Roberto López',           rol: 'supervision', asunto: 'Acuerdo sobre control de calidad del concreto',               contenido: 'Las tres partes acuerdan realizar pruebas de revenimiento y resistencia por cada colado, con muestreo conforme a la NMX-C-156.',                                  vinculadaA: null,        color: 'amber' },
  { folio: 'BIT-0005', tipo: 'Instrucción',  fecha: '2026-05-12', firmante: 'Ing. Carlos Hernández García', rol: 'residente',   asunto: 'Excavación zona norte',                                       contenido: 'Se instruye al contratista iniciar la excavación de la zona norte del predio conforme al programa de obra y al estudio topográfico vigente.',                     vinculadaA: null,        color: 'blue'  },
  { folio: 'BIT-0006', tipo: 'Avance',       fecha: '2026-05-14', firmante: 'Ing. Roberto López',           rol: 'supervision', asunto: 'Avance: armado de columnas eje A',                            contenido: 'La supervisión confirma la correcta ejecución del armado de columnas del eje A, conforme a planos estructurales y especificaciones técnicas.',                   vinculadaA: null,        color: 'green' },
  { folio: 'BIT-0007', tipo: 'Solicitud',    fecha: '2026-05-18', firmante: 'Arq. Carlos Mendoza',          rol: 'contratista', asunto: 'Solicitud de autorización para colado de losa nivel 1',      contenido: 'Se solicita autorización para el colado de la losa del nivel 1 programado para el 20/05/2026, anexando bitácora de armado.',                                    vinculadaA: null,        color: 'amber' },
  { folio: 'BIT-0008', tipo: 'Respuesta',    fecha: '2026-05-19', firmante: 'Ing. Carlos Hernández García', rol: 'residente',   asunto: 'Autorización de colado de losa nivel 1',                      contenido: 'Atendiendo BIT-0007, queda autorizado el colado de la losa del nivel 1 para el 20/05/2026, condicionado a la presencia del laboratorio de control.',             vinculadaA: 'BIT-0007',  color: 'green' },
  { folio: 'BIT-0009', tipo: 'Acuerdo',      fecha: '2026-05-22', firmante: 'Ing. Roberto López',           rol: 'supervision', asunto: 'Acuerdo sobre modificación menor en muros',                   contenido: 'Las tres partes acuerdan un ajuste menor en el espesor de muros del nivel 1 sin impacto en el alcance ni en el monto del contrato.',                              vinculadaA: null,        color: 'amber' },
  { folio: 'BIT-0010', tipo: 'Instrucción',  fecha: '2026-05-25', firmante: 'Ing. Carlos Hernández García', rol: 'residente',   asunto: 'Reanudación de trabajos tras lluvia',                         contenido: 'Se instruye al contratista la reanudación de actividades tras la suspensión por lluvia atípica del 24/05/2026, sin afectación al programa.',                      vinculadaA: null,        color: 'blue'  },
  { folio: 'BIT-0011', tipo: 'Entrega de obra', fecha: '2026-05-28', firmante: 'Ing. Roberto López',        rol: 'supervision', asunto: 'Entrega: trabajos del eje 6',                                  contenido: 'Se confirma la recepción de los trabajos del eje 6 conforme a especificaciones, dando paso a la estimación del periodo.',                                          vinculadaA: null,        color: 'green' },
  { folio: 'BIT-0012', tipo: 'Solicitud',    fecha: '2026-06-02', firmante: 'Arq. Carlos Mendoza',          rol: 'contratista', asunto: 'Solicitud de aprobación de estimación EST-2026-003',          contenido: 'Se solicita la aprobación de la estimación EST-2026-003 correspondiente al periodo de mayo 2026, anexando números generadores y soportes documentales.',          vinculadaA: null,        color: 'amber' }
];
