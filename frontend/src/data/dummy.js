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
export const historialEstimacionesDummy = [
  { estimacion: 'EST-2026-001', periodo: 'Abr 2026', version: 'v1', estado: 'Aceptada',   importe: '$ 980,500.00',   fecha: '10/04/2026' },
  { estimacion: 'EST-2026-002', periodo: 'May 2026', version: 'v1', estado: 'Rechazada',  importe: '$ 1,150,000.00', fecha: '12/05/2026' },
  { estimacion: 'EST-2026-002', periodo: 'May 2026', version: 'v2', estado: 'Aceptada',   importe: '$ 1,120,300.00', fecha: '16/05/2026' },
  { estimacion: 'EST-2026-003', periodo: 'May 2026', version: 'v1', estado: 'En proceso', importe: '$ 1,285,750.00', fecha: '23/05/2026' }
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

// Vistas propuestas — fuera del backlog de 22 HU. Solo se muestran en modo proyecto.
export const vistasPropuesta = [
  {
    id: 'solicitud-acceso',
    titulo: 'Solicitud de registro',
    descripcion: 'Inscripción de nuevos usuarios al sistema. Requiere aprobación de la dependencia. Vista propuesta para validación.',
    icono: '📝',
    ruta: '/solicitud-acceso',
    etiqueta: 'Propuesta · a validar'
  }
];

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

// HU-12 — Números generadores (acumulados del periodo).
export const generadoresEstimacionDummy = [
  { concepto: 'Excavación',              unidad: 'm³',  contratado: 1000, periodoDefault: 250, anteriorAcum: 350, avancePct: 60 },
  { concepto: 'Concreto f\'c=250',       unidad: 'm³',  contratado:  500, periodoDefault:  80, anteriorAcum: 120, avancePct: 40 },
  { concepto: 'Acero de refuerzo',       unidad: 'ton', contratado:   50, periodoDefault:  12, anteriorAcum:  18, avancePct: 60 },
  { concepto: 'Muros de block',          unidad: 'm²',  contratado:  800, periodoDefault: 150, anteriorAcum: 200, avancePct: 44 }
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

// HU-11 — Minutas ya registradas. La columna "acuerdos" es el conteo de los
// compromisos derivados (se consultan en la pestaña Acuerdos con su detalle).
export const minutasDummy = [
  { id: 1, fecha: '15/05/2026', tema: 'Reunión de avance mensual', asistentes: 'Residente, Superintendente, Supervisión', acuerdos: 3 },
  { id: 2, fecha: '01/05/2026', tema: 'Junta de inicio de obra',   asistentes: 'Residente, Dependencia, Contratista',     acuerdos: 2 }
];

// HU-11 — Visitas agendadas. El estado conduce el color del badge en la tabla.
export const visitasDummy = [
  { id: 1, fecha: '20/05/2026', tipo: 'Inspección',     responsable: 'Supervisión', estado: 'Realizada'  },
  { id: 2, fecha: '28/05/2026', tipo: 'Visita de obra', responsable: 'Residente',   estado: 'Programada' },
  { id: 3, fecha: '03/06/2026', tipo: 'Inspección',     responsable: 'Supervisión', estado: 'Programada' }
];

// HU-11 — Catálogo del select de tipo de visita.
export const tiposVisitaDummy = ['Visita de obra', 'Inspección'];

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
export const estimacionesTableroDummy = [
  { numero: 1, periodo: 'Feb 2026', monto: '$ 1,200,000.00', estado: 'Pagada'      },
  { numero: 2, periodo: 'Mar 2026', monto: '$ 1,500,000.00', estado: 'En pago'     },
  { numero: 3, periodo: 'Abr 2026', monto: '$ 1,750,000.00', estado: 'Autorizada'  },
  { numero: 4, periodo: 'May 2026', monto: '$ 1,850,000.00', estado: 'En revisión' },
  { numero: 5, periodo: 'May 2026', monto: '$   900,000.00', estado: 'Presentada'  }
];

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
// sobre multiples contratos. El campo "semaforo" se calcularia a partir de
// avance fisico + atrasos + pendientes; en la demo viene servido en el dummy.
export const portafolioContratosDummy = [
  {
    folio: 'C-2026-0042', contratista: 'Constructora XYZ',          avance:  90,
    estado: 'Sin atraso',              semaforo: 'verde',
    indicadores: { avanceFisico: 90, avanceFinanciero: 88, penalizaciones: 0 }
  },
  {
    folio: 'C-2026-0047', contratista: 'Constructora del Valle',    avance:  78,
    estado: 'Al corriente',            semaforo: 'verde',
    indicadores: { avanceFisico: 78, avanceFinanciero: 75, penalizaciones: 0 }
  },
  {
    folio: 'C-2026-0038', contratista: 'Edificaciones del Norte',   avance:  65,
    estado: 'Atraso leve',             semaforo: 'amarillo',
    indicadores: { avanceFisico: 65, avanceFinanciero: 60, penalizaciones: 25_000 }
  },
  {
    folio: 'C-2026-0029', contratista: 'Obras y Proyectos SA',      avance: 100,
    estado: 'Finiquito pendiente',     semaforo: 'amarillo',
    indicadores: { avanceFisico: 100, avanceFinanciero: 95, penalizaciones: 0 }
  },
  {
    folio: 'C-2026-0051', contratista: 'Infraestructura del Bajío', avance:  40,
    estado: 'Atraso crítico + penalización', semaforo: 'rojo',
    indicadores: { avanceFisico: 40, avanceFinanciero: 35, penalizaciones: 180_000 }
  }
];

// HU-19 — Los 7 reportes definidos en el alcance del proyecto. Cada uno con
// los formatos en que se exporta (PDF, Excel o ambos).
export const reportesCatalogoDummy = [
  { id: 1, nombre: 'Avance físico',     descripcion: 'Avance por concepto del catálogo y curva S.',          formatos: ['PDF', 'Excel'] },
  { id: 2, nombre: 'Avance financiero', descripcion: 'Estimaciones cobradas, retenciones y amortizaciones.', formatos: ['PDF', 'Excel'] },
  { id: 3, nombre: 'Estimaciones',      descripcion: 'Listado completo de estimaciones y sus versiones.',    formatos: ['Excel']       },
  { id: 4, nombre: 'Observaciones',     descripcion: 'Observaciones a estimaciones y bitácora.',             formatos: ['PDF', 'Excel'] },
  { id: 5, nombre: 'Bitácora',          descripcion: 'Notas técnicas, firmas y respuestas del periodo.',     formatos: ['PDF']         },
  { id: 6, nombre: 'Modificatorios',    descripcion: 'Convenios modificatorios (art. 59 / 59 Bis LOPSRM).',  formatos: ['PDF']         },
  { id: 7, nombre: 'Penalizaciones',    descripcion: 'Cálculo de penas convencionales por atraso.',          formatos: ['Excel']       }
];

// HU-19 — Catalogo del selector de periodo (consultativo).
export const periodosReportesDummy = ['Mensual', 'Trimestral', 'Acumulado'];

// HU-07 — Alertas ya configuradas (dummy). El estado define la acción disponible.
export const alertasConfiguradasDummy = [
  { id: 1, concepto: 'Cimentación',   umbral: 80, canal: 'Correo',   estado: 'Activa'  },
  { id: 2, concepto: 'Estructura',    umbral: 90, canal: 'Ambos',    estado: 'Activa'  },
  { id: 3, concepto: 'Instalaciones', umbral: 75, canal: 'En el sistema', estado: 'Pausada' }
];
