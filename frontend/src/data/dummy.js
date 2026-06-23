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
    titulo: 'Atraso por concepto',
    descripcion: 'Tabla automática de los conceptos con déficit (programado − ejecutado) en unidades, medido al periodo vigente. Sin umbrales; distinto del avance ponderado.',
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
  // HU-16 (reingreso de estimación) RETIRADO de la UI por decisión del profe (22-jun): un rechazo se
  // resuelve volviendo a INTEGRAR (HU-12) y PRESENTAR (HU-13); la rechazada queda en el historial con su
  // motivo. Se quita de historiasUsuario para que NO aparezca en el sidebar ("Otras pantallas"), Inicio ni
  // breadcrumb. La página ReingresoEstimacion.jsx y el endpoint /reingresar se CONSERVAN (código muerto
  // inofensivo). Para revivirlo, descomenta este bloque.
  // {
  //   codigo: 'HU-16',
  //   titulo: 'Reingreso de estimación tras rechazo',
  //   descripcion: 'Reingreso como nueva versión independiente con histórico vinculado; observaciones descargables en PDF o Excel.',
  //   sprint: 'Sprint 8',
  //   icono: '↩️',
  //   ruta: '/estimaciones/reingreso'
  // },
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
