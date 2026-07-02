// HU-20 (Equipo 3): Tránsito a pago — carga de soportes, verificación de suficiencia presupuestal
// (art. 24 LOPSRM) y generación de la instrucción de pago. PASO SEPARADO post-autorización: NO toca
// el autorizar de HU-15 (core/congelado); opera sobre una estimación ya 'autorizada'.
//
// Usa tablas que YA EXISTEN (sin cambios de esquema): presupuesto_anual, instruccion_pago,
// estimacion_soportes, contrato_garantias. Acotado por participación (lib/acceso.js).
//
// FUENTES y cruxes (todos marcados):
//   · CA-2 ancla del plazo (art. 54/55): DERIVADA de la bitácora — la nota de autorización que
//     inserta autorizarEstimacion (tipo='res_estimaciones', tag='estimacion', ligada por
//     estimacion_notas) con su `fecha` es el momento real de autorización (plazo derivado de la nota
//     de autorización = criterio del equipo, default conservador, sin columna nueva; base art. 54
//     LOPSRM). Si no hay esa nota (contrato sin bitácora al autorizar) → semáforo DESHABILITADO (sin
//     inventar); el ancla canónica requiere `autorizada_en` en estimaciones (PARA MAIKI, ver routes).
//   · CA-1 disponible = techo(presupuesto_anual por dependencia+ejercicio) − comprometido
//     (Σ neto de estimaciones 'autorizada'+'pagada' de esa dependencia+ejercicio, EXCLUYENDO la
//     actual); suficiencia presupuestal previa = art. 24 LOPSRM. Join contrato→presupuesto por
//     dependencia (texto) + ejercicio (year de fecha_inicio), SIN FK — deuda técnica conocida
//     (criterio del equipo, no legal).
//   · CA-3 soportes: folio CFDI (texto) + estado de fianza de cumplimiento LEÍDA de
//     contrato_garantias. La subida de ARCHIVOS binarios NO existe (sin BYTEA ni multer) → el
//     frontend la deshabilita; aquí solo se registran METADATOS (estimacion_soportes).
const { pool } = require('../db/pool');
const { esParteOSupervision } = require('../lib/acceso');
const { PLAZO_DIAS_VENCIDOS } = require('../lib/umbrales-semaforo');
// LENTE DE SIMULACIÓN — SOLO LECTURA: "hoy" simulado opcional (?fecha_ref) para el semáforo de plazo
// (art. 54) y la vigencia de la fianza. Solo lo pasa el GET de tránsito; las escrituras (cargar soporte,
// generar instrucción) NO lo pasan → usan la fecha REAL del servidor. No persiste nada.
const { fechaRefDe } = require('../lib/fechaRef');
// "Hoy" efectivo (medianoche local) para los cálculos de lectura: fecha simulada si viene, real si no.
function hoyRef(fechaRef) {
  return fechaRef ? new Date(`${fechaRef}T00:00:00`) : new Date(new Date().toDateString());
}

// Plazo de pago: 20 días naturales — base legal LITERAL (art. 54 LOPSRM: "deberán pagarse… en un plazo no
// mayor a veinte días naturales"). Si se excede, el art. 55 LOPSRM genera gastos financieros (mora).
const PLAZO_PAGO_DIAS = 20;                 // art. 54 LOPSRM (20 días naturales)
// Semáforo del plazo en DÍAS VENCIDOS (días pasados de los 20 del art. 54): 0 VERDE · 1-10 ÁMBAR · > 10
// ROJO. CRITERIO DEL EQUIPO (defaults provisionales, configurables); centralizado con el portafolio
// (HU-18) en backend/src/lib/umbrales-semaforo.js → `PLAZO_DIAS_VENCIDOS`.

// Soportes obligatorios capturables como metadato (la fianza se LEE aparte de garantías).
const SOPORTE_FACTURA = 'Factura';
const SOPORTE_CFDI = 'CFDI';

const r2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

// BUG #17 (Oleada 4): FUENTE ÚNICA ESTRUCTURADA de los datos bancarios del contratista (antes texto libre
// del contratista en estimacion_soportes). Los CAPTURA/VALIDA finanzas; la instrucción de pago los LEE de
// aquí. Por EMPRESA (la razón social que cobra); append-only con validado_por. Tabla aditiva idempotente
// (no se toca schema.sql; migracion en backend/scripts/migracion_datos_bancarios.sql).
let _ensuredBancarios = null;
function ensureBancarios() {
  if (_ensuredBancarios) return _ensuredBancarios;
  _ensuredBancarios = pool.query(`
    CREATE TABLE IF NOT EXISTS contratista_datos_bancarios (
      id           SERIAL PRIMARY KEY,
      empresa_id   INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      clabe        VARCHAR(18) NOT NULL,
      banco        TEXT NOT NULL,
      titular      TEXT NOT NULL,
      cuenta       TEXT,
      vigente      BOOLEAN NOT NULL DEFAULT true,
      validado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_datos_bancarios_vigente ON contratista_datos_bancarios(empresa_id) WHERE vigente;
  `).catch((e) => { console.error('[instruccion-pago ensureBancarios]', e.message); _ensuredBancarios = null; throw e; });
  return _ensuredBancarios;
}
ensureBancarios().catch(() => {});

// BUG #18: CLABE mexicana = EXACTAMENTE 18 dígitos + dígito de control (algoritmo estándar, pesos 3-7-1).
// No se confunde con la referencia/clave de rastreo SPEI (que tiene su propia forma).
function clabeValida(clabe) {
  if (!/^\d{18}$/.test(clabe)) return false;
  const pesos = [3, 7, 1];
  let suma = 0;
  for (let i = 0; i < 17; i++) suma += (Number(clabe[i]) * pesos[i % 3]) % 10;
  const control = (10 - (suma % 10)) % 10;
  return control === Number(clabe[17]);
}

// BUG #20: ¿el buffer parece un XML (CFDI) bien formado en su inicio? Guarda contra XXE: rechaza DOCTYPE/
// ENTITY (no se parsea el XML aquí; solo se ALMACENA como soporte, pero se protege el contenido).
function esXml(buffer) {
  if (!buffer || buffer.length < 5) return false;
  const s = buffer.toString('utf8', 0, Math.min(buffer.length, 1024)).replace(/^﻿/, '').replace(/^\s+/, '');
  if (!(s.startsWith('<?xml') || s.startsWith('<'))) return false;
  if (/<!DOCTYPE/i.test(s) || /<!ENTITY/i.test(s)) return false; // anti-XXE
  return true;
}

// Carga estimación + contrato (cols de acceso + dependencia/fecha para suficiencia).
async function cargarEstimacionContrato(id) {
  const r = await pool.query(
    `SELECT e.id, e.contrato_id, e.numero, e.estado, e.neto, e.periodo_inicio, e.periodo_fin,
            c.folio, c.contratista, c.dependencia, c.dependencia_id, c.fecha_inicio, c.monto,
            c.estado AS contrato_estado, c.cerrado_en,
            c.created_by, c.residente_id, c.superintendente_id, c.supervision_id,
            (SELECT empresa_id FROM usuarios u WHERE u.id = c.superintendente_id) AS contratista_empresa_id
       FROM estimaciones e JOIN contratos c ON c.id = e.contrato_id
      WHERE e.id = $1`,
    [id]
  );
  return r.rowCount ? r.rows[0] : null;
}

function ejercicioDe(fechaInicio) {
  if (!fechaInicio) return null;
  const y = new Date(fechaInicio).getUTCFullYear();
  return Number.isFinite(y) ? y : null;
}

// Suficiencia presupuestal (art. 24 párrs. 1-2 LOPSRM: el GASTO se sujeta al PEF/LFPRH y la suficiencia
// en la partida específica es requisito PREVIO). Excluye la estimación actual del "comprometido"
// para mostrar el disponible ANTES de este pago. ITEM 3.1: el join contrato↔presupuesto se hace por la
// FK `dependencia_id` (estable), no por el texto `dependencia` (que se rompe al renombrar la cuenta).
// Etapa 1 mantiene el invariante de 1 partida por (ejercicio, dependencia_id); si hubiera varias, el
// techo de la dependencia = Σ de sus partidas (el comprometido es a nivel dependencia porque los
// contratos aún no portan partida_id → multi-partida real por contrato = follow-on para Maiki).
//
// H1 (01-jul, regla de Maiki): FUENTE del techo en dos niveles —
//   · 'partida'  = techo capturado por finanzas en presupuesto_anual (la fuente legal: el presupuesto
//     autorizado con suficiencia en la partida específica, art. 24 párr. 2). Preferente si existe.
//   · 'contrato' = FALLBACK cuando NO hay partida capturada: techo = monto vigente del contrato y
//     comprometido = Σ neto autorizadas+pagadas DEL CONTRATO. Base: el monto pactado se contrató con
//     suficiencia previa (art. 24 párr. 2) y pagar por encima de él carece de soporte contractual (las
//     ampliaciones van por convenio, art. 59 LOPSRM). Criterio del equipo [validar profe].
// Con el fallback la verificación SIEMPRE opera (antes: sin techo cargado → "no verificable").
async function calcularSuficiencia(dependenciaId, dependencia, ejercicio, estimacionId, neto, contrato = null) {
  const out = {
    ejercicio, dependencia, dependencia_id: dependenciaId ?? null,
    techo: null, presupuesto_id: null, fuente: null,
    comprometido: '0.00', disponible_antes: null, neto: r2(neto).toFixed(2),
    disponible_despues: null, excede: null, sin_presupuesto: true,
    nota: 'Techo: partida capturada (ejercicio, dependencia_id) o, sin partida, el monto vigente del contrato (regla del equipo). Comprometido = Σ neto autorizadas+pagadas del ámbito de la fuente (suficiencia previa, art. 24 párr. 2 LOPSRM).',
  };
  const netoR = r2(neto);
  let techo = null; let comprometido = null; let fuente = null; let presupuestoId = null;
  if (dependenciaId != null && ejercicio != null) {
    const p = await pool.query(
      'SELECT id, techo, partida FROM presupuesto_anual WHERE ejercicio = $1 AND dependencia_id = $2 ORDER BY id',
      [ejercicio, dependenciaId]
    );
    if (p.rowCount > 0) {
      // Techo de la dependencia/ejercicio (Σ de sus partidas; en Etapa 1 hay exactamente una).
      techo = p.rows.reduce((s, r) => s + Number(r.techo), 0);
      presupuestoId = p.rows[0].id;
      fuente = 'partida';
      const cq = await pool.query(
        `SELECT COALESCE(SUM(e.neto),0) AS comprometido
           FROM estimaciones e JOIN contratos c ON c.id = e.contrato_id
          WHERE c.dependencia_id = $1 AND EXTRACT(YEAR FROM c.fecha_inicio) = $2
            AND e.estado IN ('autorizada','pagada') AND e.id <> $3`,
        [dependenciaId, ejercicio, estimacionId]
      );
      comprometido = Number(cq.rows[0].comprometido);
    }
  }
  if (fuente == null && contrato && contrato.id != null && contrato.monto != null) {
    // FALLBACK 'contrato' (H1): sin partida capturada, el techo es el monto vigente del contrato.
    techo = Number(contrato.monto);
    fuente = 'contrato';
    const cq = await pool.query(
      `SELECT COALESCE(SUM(neto),0) AS comprometido FROM estimaciones
        WHERE contrato_id = $1 AND estado IN ('autorizada','pagada') AND id <> $2`,
      [contrato.id, estimacionId]
    );
    comprometido = Number(cq.rows[0].comprometido);
  }
  if (fuente == null) return out; // ni partida ni datos del contrato (no debería ocurrir)

  const disponibleAntes = r2(techo - comprometido);
  return {
    ...out,
    techo: techo.toFixed(2),
    presupuesto_id: presupuestoId,
    fuente,
    comprometido: r2(comprometido).toFixed(2),
    disponible_antes: disponibleAntes.toFixed(2),
    neto: netoR.toFixed(2),
    disponible_despues: r2(disponibleAntes - netoR).toFixed(2),
    excede: netoR > disponibleAntes,
    sin_presupuesto: false,
  };
}

// Checklist de soportes (CA-3): factura + CFDI (metadatos) y fianza de cumplimiento (leída de garantías).
// `fechaRef` (SOLO LECTURA) = "hoy" simulado para evaluar la vigencia de la fianza; null => hoy real
// (lo que usan las escrituras que no lo pasan).
async function leerSoportes(estimacionId, contratoId, fechaRef = null) {
  const sop = await pool.query(
    'SELECT id, nombre, descripcion, created_at FROM estimacion_soportes WHERE estimacion_id = $1 ORDER BY created_at, id',
    [estimacionId]
  );
  const hay = (clave) => sop.rows.find((s) => (s.nombre || '').trim().toLowerCase() === clave.toLowerCase());
  const factura = hay(SOPORTE_FACTURA) || null;
  const cfdi = hay(SOPORTE_CFDI) || null;

  // Fianza de cumplimiento: se LEE de contrato_garantias (alta HU-01); sin carga nueva.
  const g = await pool.query(
    `SELECT poliza, afianzadora, vigencia FROM contrato_garantias
      WHERE contrato_id = $1 AND tipo ILIKE '%cumplimiento%' ORDER BY id DESC LIMIT 1`,
    [contratoId]
  );
  const exigible = g.rowCount > 0; // exigible si hay garantía de cumplimiento registrada del contrato (art. 48 fr. II LOPSRM)
  const fila = g.rows[0] || null;
  const vigente = exigible ? (fila.vigencia == null || new Date(fila.vigencia) >= hoyRef(fechaRef)) : false;

  const facturaOk = !!factura;
  const cfdiOk = !!(cfdi && (cfdi.descripcion || '').trim()); // CFDI exige folio fiscal en descripcion
  const fianzaOk = !exigible || vigente; // si no es exigible, no bloquea
  return {
    metadatos: sop.rows,
    factura: { cargado: facturaOk, descripcion: factura?.descripcion || null, fecha: factura?.created_at || null },
    cfdi: { cargado: cfdiOk, folio: cfdi?.descripcion || null },
    fianza_cumplimiento: {
      exigible, vigente,
      poliza: fila?.poliza || null, afianzadora: fila?.afianzadora || null, vigencia: fila?.vigencia || null,
      nota: 'exigible = existe garantía de cumplimiento registrada del contrato (art. 48 fr. II LOPSRM)',
    },
    obligatorios_ok: facturaOk && cfdiOk && fianzaOk,
    folio_cfdi: cfdi?.descripcion?.trim() || null,
  };
}

// Ancla del plazo (CA-2): fecha de la nota de autorización en bitácora ligada a la estimación.
async function anclaAutorizacion(estimacionId) {
  const r = await pool.query(
    `SELECT MIN(bn.fecha) AS autorizada_en
       FROM estimacion_notas en JOIN bitacora_notas bn ON bn.id = en.nota_id
      WHERE en.estimacion_id = $1 AND bn.tipo = 'res_estimaciones' AND bn.tag = 'estimacion'`,
    [estimacionId]
  );
  return r.rows[0]?.autorizada_en || null;
}

// `fechaRef` (SOLO LECTURA) = "hoy" simulado para contar días vencidos; null => hoy real.
function semaforoPlazo(anclaAutISO, facturaISO, fechaRef = null) {
  if (!anclaAutISO) {
    return {
      disponible: false,
      nota: 'Sin fecha de autorización registrada (la nota de autorización requiere bitácora abierta al autorizar).',
    };
  }
  // HU-20 (22-jun) — art. 54 LOPSRM: el plazo de pago de 20 días corre "a partir de la fecha en que hayan sido
  // autorizadas por la residencia Y que el contratista haya presentado la factura". → el ancla es la MÁS TARDÍA de
  // las dos. Sin factura presentada, el plazo AÚN NO corre (no se muestran días vencidos prematuros).
  if (!facturaISO) {
    return {
      disponible: false,
      nota: 'El plazo de pago de 20 días (art. 54 LOPSRM) aún no corre: falta la presentación de la factura.',
    };
  }
  const anclaISO = new Date(anclaAutISO) >= new Date(facturaISO) ? anclaAutISO : facturaISO;
  const ancla = new Date(anclaISO);
  const hoy = hoyRef(fechaRef);
  const dias = Math.max(0, Math.floor((hoy - new Date(ancla.toDateString())) / 86400000));
  const diasVencidos = Math.max(0, dias - PLAZO_PAGO_DIAS); // días pasados del plazo de pago de 20 (art. 54)
  const color = diasVencidos <= PLAZO_DIAS_VENCIDOS.verde_max ? 'verde'
    : (diasVencidos <= PLAZO_DIAS_VENCIDOS.ambar_max ? 'ambar' : 'rojo');
  return {
    disponible: true, ancla: anclaISO, dia_actual: dias, dias_vencidos: diasVencidos, plazo: PLAZO_PAGO_DIAS, color,
    fuente: 'la más tardía de: autorización (bitácora) y presentación de la factura (art. 54 LOPSRM)',
    nota: 'Días vencidos = días pasados del plazo de pago de 20 días (art. 54 LOPSRM). Umbrales 0 / 1-10 / >10 días vencidos: criterio del equipo (defaults provisionales, configurables).',
  };
}

// GET /api/instruccion-pago/estimacion/:id — estado de tránsito (suficiencia, soportes, semáforo, instrucción).
async function estadoTransito(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
    const est = await cargarEstimacionContrato(id);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (!esParteOSupervision(req.user, est)) return res.status(403).json({ error: 'No tienes acceso a esta estimación' });

    const fechaRef = fechaRefDe(req); // SOLO LECTURA: "hoy" simulado o null (=> hoy real). No persiste.
    const ejercicio = ejercicioDe(est.fecha_inicio);
    const [suficiencia, soportes, ancla, ip, arch] = await Promise.all([
      calcularSuficiencia(est.dependencia_id, est.dependencia, ejercicio, est.id, est.neto,
        { id: est.contrato_id, monto: est.monto }), // H1: fallback 'contrato' si no hay partida capturada
      leerSoportes(est.id, est.contrato_id, fechaRef),
      anclaAutorizacion(est.id),
      pool.query('SELECT * FROM instruccion_pago WHERE estimacion_id = $1', [est.id]),
      pool.query('SELECT id, tipo, nombre, mime, tamano, subido_por, created_at FROM cobro_soportes WHERE estimacion_id = $1 ORDER BY id', [est.id]),
    ]);

    return res.status(200).json({
      estimacion: {
        id: est.id, numero: est.numero, contrato_id: est.contrato_id, folio: est.folio,
        contratista: est.contratista, dependencia: est.dependencia, dependencia_id: est.dependencia_id ?? null, ejercicio,
        estado: est.estado, neto: r2(est.neto).toFixed(2),
        periodo_inicio: est.periodo_inicio, periodo_fin: est.periodo_fin,
        contratista_empresa_id: est.contratista_empresa_id ?? null, // BUG #10/#17: empresa para leer/validar datos bancarios
      },
      es_autorizada: est.estado === 'autorizada',
      // Cierre del contrato (art. 64 LOPSRM): si está finiquitado, no se generan nuevas instrucciones.
      contrato_cerrado: est.contrato_estado === 'cerrado',
      suficiencia,
      soportes,
      semaforo_plazo: semaforoPlazo(ancla, soportes.factura?.fecha || null, fechaRef),
      instruccion: ip.rowCount ? ip.rows[0] : null,
      // FOLLOW-ON b (22-jun): soportes binarios de cobro (CFDI/oficio) cargados (tabla cobro_soportes, BYTEA).
      archivos: arch.rows,
      // El contratista sube el PDF del CFDI / oficio de autorización; Finanzas lo descarga desde la cola.
      upload_archivos: { disponible: true, nota: 'El contratista sube el PDF del CFDI y/o del oficio de autorización; Finanzas los descarga desde la cola.' },
    });
  } catch (err) {
    console.error('[estadoTransito]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/instruccion-pago/estimacion/:id/soportes — registra METADATOS de un soporte (contratista/finanzas).
// body: { nombre, descripcion }. Para CFDI, descripcion = folio fiscal. NO sube archivos.
async function cargarSoporte(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
    const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
    const descripcion = typeof req.body?.descripcion === 'string' ? req.body.descripcion.trim() : '';
    if (!nombre) return res.status(400).json({ error: 'El nombre del soporte es obligatorio' });

    const est = await cargarEstimacionContrato(id);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (!esParteOSupervision(req.user, est)) return res.status(403).json({ error: 'No tienes acceso a esta estimación' });
    // BUG #10/#17 (Oleada 4): el CONTRATISTA solo presenta CFDI / factura / oficio. Los DATOS BANCARIOS ya
    // NO los captura aquí (texto libre) — los captura/valida FINANZAS en su fuente estructurada
    // (contratista_datos_bancarios). Se rechaza intentar registrar datos bancarios como soporte.
    if (req.user.rol !== 'contratista') {
      return res.status(403).json({ error: 'Solo el contratista presenta sus soportes de cobro (CFDI, factura, oficio). Los datos bancarios los captura Finanzas.' });
    }
    if (/spei|bancari|clabe|cuenta/i.test(nombre)) {
      return res.status(400).json({ error: 'Los datos bancarios (CLABE/SPEI) ya no se capturan como soporte del contratista: los captura y valida Finanzas en el registro de datos bancarios.' });
    }
    // Consistencia con generarInstruccion: si el contrato está cerrado (finiquito), no se cargan soportes
    // nuevos del tránsito a pago (art. 64 LOPSRM: derechos y obligaciones extinguidos).
    if (est.contrato_estado === 'cerrado') {
      return res.status(409).json({ error: 'El contrato ya está cerrado (finiquito elaborado); no se cargan soportes de tránsito a pago (art. 64 LOPSRM).' });
    }

    const ins = await pool.query(
      'INSERT INTO estimacion_soportes (estimacion_id, nombre, descripcion) VALUES ($1, $2, $3) RETURNING id, nombre, descripcion, created_at',
      [id, nombre, descripcion || null]
    );
    return res.status(201).json(ins.rows[0]);
  } catch (err) {
    console.error('[cargarSoporte]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/instruccion-pago/estimacion/:id — genera la instrucción de pago (estado 'emitida').
// Gate: estimación 'autorizada' + suficiencia OK (art. 24) + soportes obligatorios OK.
async function generarInstruccion(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });

    const est = await cargarEstimacionContrato(id);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (!esParteOSupervision(req.user, est)) return res.status(403).json({ error: 'No tienes acceso a esta estimación' });
    // BUG #10 (Oleada 4, decisión de Maiki): FINANZAS genera la instrucción de pago (el contratista solo
    // presenta CFDI/factura/oficio). Invierte el criterio previo "el contratista promueve".
    if (req.user.rol !== 'finanzas') {
      return res.status(403).json({ error: 'Solo Finanzas genera la instrucción de pago (tras validar los datos bancarios y revisar los soportes). El contratista solo presenta CFDI, factura y oficio.' });
    }
    // Gate de cierre: si el contrato ya tiene finiquito elaborado (estado 'cerrado'), NO se genera una
    // nueva instrucción de pago. Al determinarse el saldo del finiquito quedan "extinguidos los derechos y
    // obligaciones asumidos por ambas partes en el contrato" (art. 64 LOPSRM); la relación de estimaciones
    // queda fija en el documento de finiquito (art. 170 fr. VI RLOPSRM). Cualquier saldo pendiente se
    // liquida por el finiquito, no por nuevas instrucciones de estimación.
    if (est.contrato_estado === 'cerrado') {
      return res.status(409).json({ error: 'El contrato ya está cerrado (finiquito elaborado); no se generan nuevas instrucciones de pago. El saldo se liquida por el finiquito (art. 64 LOPSRM / art. 170 RLOPSRM).' });
    }
    // Gate de ciclo: solo sobre estimación AUTORIZADA por la residencia (art. 54 LOPSRM).
    if (est.estado !== 'autorizada') {
      return res.status(409).json({ error: `Solo se genera la instrucción sobre una estimación AUTORIZADA (estado actual: '${est.estado}')` });
    }

    // CA-3: soportes obligatorios (lectura, fuera de la tx).
    const sop = await leerSoportes(est.id, est.contrato_id);
    if (!sop.obligatorios_ok) {
      return res.status(409).json({ error: 'Faltan soportes obligatorios (factura, CFDI con folio, o fianza de cumplimiento vigente).', soportes: sop });
    }
    // BUG #10/#17 (Oleada 4): la instrucción LEE los datos bancarios de la fuente ESTRUCTURADA
    // (contratista_datos_bancarios). Finanzas debe haberlos capturado/validado para la empresa del
    // contratista ANTES de instruir el pago. Sin datos bancarios vigentes → 409 (no se paga a ciegas).
    await ensureBancarios().catch(() => {});
    const empresaContratista = est.contratista_empresa_id ?? null;
    if (empresaContratista == null) {
      return res.status(409).json({ error: 'El contratista del contrato no tiene empresa asociada; no se pueden validar los datos bancarios para el pago.' });
    }
    const db = await pool.query('SELECT id, clabe FROM contratista_datos_bancarios WHERE empresa_id = $1 AND vigente = true', [empresaContratista]);
    if (db.rowCount === 0) {
      return res.status(409).json({ error: 'Finanzas debe capturar y validar los datos bancarios (CLABE) del contratista antes de generar la instrucción de pago.', requiereDatosBancarios: true, empresa_id: empresaContratista });
    }

    // CA-1: suficiencia presupuestal (art. 24) DENTRO de una transacción que BLOQUEA la fila del techo
    // (SELECT ... FOR UPDATE) y recomputa el comprometido y el INSERT en la MISMA tx. Cierra la carrera
    // TOCTOU: dos instrucciones de la misma dependencia/ejercicio se serializan, no pueden exceder el techo.
    // H1 (01-jul, regla de Maiki): si NO hay partida capturada, el techo cae al MONTO VIGENTE del contrato
    // (fallback 'contrato'); la verificación SIEMPRE opera (antes: sin techo cargado → 409 "cárgalo").
    const ejercicio = ejercicioDe(est.fecha_inicio);
    const neto = r2(est.neto);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let techo = null; let presupuestoId = null; let comprometido = null; let fuente = null;
      if (est.dependencia_id != null && ejercicio != null) {
        const p = await client.query(
          'SELECT id, techo FROM presupuesto_anual WHERE ejercicio = $1 AND dependencia_id = $2 ORDER BY id FOR UPDATE',
          [ejercicio, est.dependencia_id]
        );
        if (p.rowCount > 0) {
          // Techo de la dependencia/ejercicio (Σ de sus partidas; en Etapa 1 hay exactamente una). La
          // instrucción se liga a la primera partida (presupuesto_anual_id); multi-partida = follow-on.
          techo = p.rows.reduce((s, r) => s + Number(r.techo), 0);
          presupuestoId = p.rows[0].id;
          fuente = 'partida';
          const cq = await client.query(
            `SELECT COALESCE(SUM(e.neto),0) AS comprometido
               FROM estimaciones e JOIN contratos c ON c.id = e.contrato_id
              WHERE c.dependencia_id = $1 AND EXTRACT(YEAR FROM c.fecha_inicio) = $2
                AND e.estado IN ('autorizada','pagada') AND e.id <> $3`,
            [est.dependencia_id, ejercicio, est.id]
          );
          comprometido = Number(cq.rows[0].comprometido);
        }
      }
      if (fuente == null) {
        // FALLBACK 'contrato' (H1): lock del contrato (serializa el disponible) y techo = monto vigente.
        const c = await client.query('SELECT id, monto FROM contratos WHERE id = $1 FOR UPDATE', [est.contrato_id]);
        techo = Number(c.rows[0].monto);
        fuente = 'contrato';
        const cq = await client.query(
          `SELECT COALESCE(SUM(neto),0) AS comprometido FROM estimaciones
            WHERE contrato_id = $1 AND estado IN ('autorizada','pagada') AND id <> $2`,
          [est.contrato_id, est.id]
        );
        comprometido = Number(cq.rows[0].comprometido);
      }
      const disponibleAntes = r2(techo - comprometido);
      if (neto > disponibleAntes) {
        await client.query('ROLLBACK');
        const fuenteTxt = fuente === 'partida' ? 'el techo de la partida capturada' : 'el monto vigente del contrato (sin partida capturada)';
        return res.status(409).json({ error: `El neto ($${neto.toFixed(2)}) excede el disponible ($${disponibleAntes.toFixed(2)}) contra ${fuenteTxt}; requiere ampliación/adecuación presupuestal (art. 24 LOPSRM).`, suficiencia: { techo: techo.toFixed(2), comprometido: r2(comprometido).toFixed(2), disponible_antes: disponibleAntes.toFixed(2), neto: neto.toFixed(2), fuente } });
      }

      // Inserta la instrucción (UNIQUE estimacion_id evita doble). monto = neto snapshot (ROUND al centavo).
      const ins = await client.query(
        `INSERT INTO instruccion_pago
           (estimacion_id, presupuesto_anual_id, monto, factura_cfdi, soportes_ok, estado, instruida_por, notificado_finanzas_en)
         VALUES ($1, $2, $3, $4, true, 'emitida', $5, NOW())
         RETURNING *`,
        [est.id, presupuestoId, neto, sop.folio_cfdi, req.user.id]
      );
      await client.query('COMMIT');
      return res.status(201).json({
        ok: true,
        instruccion: ins.rows[0],
        suficiencia: { techo: techo.toFixed(2), comprometido: r2(comprometido).toFixed(2), disponible_antes: disponibleAntes.toFixed(2), disponible_despues: r2(disponibleAntes - neto).toFixed(2), neto: neto.toFixed(2), fuente },
      });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      if (e.code === '23505') return res.status(409).json({ error: 'Ya existe una instrucción de pago para esta estimación' });
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[generarInstruccion]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/instruccion-pago/presupuesto?ejercicio=&dependenciaId=  (o &dependencia= para retrocompat) — consulta el techo (lectura).
async function consultarPresupuesto(req, res) {
  try {
    const ejercicio = Number(req.query.ejercicio);
    const dependenciaId = Number.isInteger(Number(req.query.dependenciaId)) && Number(req.query.dependenciaId) > 0 ? Number(req.query.dependenciaId) : null;
    const dependencia = typeof req.query.dependencia === 'string' ? req.query.dependencia.trim() : '';
    if (!Number.isInteger(ejercicio) || (dependenciaId == null && !dependencia)) {
      return res.status(400).json({ error: 'ejercicio y dependenciaId (o dependencia) son requeridos' });
    }
    // ITEM 3.1: preferir el join por FK dependencia_id; texto solo como retrocompat (legacy).
    const r = dependenciaId != null
      ? await pool.query('SELECT * FROM presupuesto_anual WHERE ejercicio = $1 AND dependencia_id = $2 ORDER BY id', [ejercicio, dependenciaId])
      : await pool.query('SELECT * FROM presupuesto_anual WHERE ejercicio = $1 AND dependencia = $2 ORDER BY id', [ejercicio, dependencia]);
    return res.status(200).json(r.rowCount ? r.rows[0] : null);
  } catch (err) {
    console.error('[consultarPresupuesto]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/instruccion-pago/presupuesto — carga/actualiza el techo de una PARTIDA específica (rol finanzas).
// ITEM 3.1 (art. 24 párr. 2 LOPSRM): la PARTIDA específica es OBLIGATORIA (la ley ata la suficiencia a la
// partida, no a un techo genérico) y la dependencia se referencia por FK `dependenciaId` (estable), no por
// texto. La unicidad del techo es (ejercicio, dependencia_id, partida).
// Criterio del equipo (default conservador): la carga del techo es administración presupuestal (rol finanzas).
async function crearPresupuesto(req, res) {
  try {
    const ejercicio = Number(req.body?.ejercicio);
    const dependenciaId = Number.isInteger(Number(req.body?.dependenciaId)) && Number(req.body.dependenciaId) > 0 ? Number(req.body.dependenciaId) : null;
    const techo = Number(req.body?.techo);
    const partida = typeof req.body?.partida === 'string' ? req.body.partida.trim() : '';
    const descripcion = typeof req.body?.descripcion === 'string' ? req.body.descripcion.trim() : null;
    if (!Number.isInteger(ejercicio) || ejercicio < 2000 || ejercicio > 2100) return res.status(400).json({ error: 'ejercicio inválido (2000-2100)' });
    if (!partida) return res.status(400).json({ error: 'La partida presupuestal específica es obligatoria (art. 24 LOPSRM)' });
    if (dependenciaId == null) return res.status(400).json({ error: 'dependenciaId (cuenta de la dependencia) es requerido' });
    if (!Number.isFinite(techo) || techo < 0) return res.status(400).json({ error: 'techo inválido (>= 0)' });

    // Resolver el texto denormalizado desde la cuenta (autoridad = la FK). Debe ser rol 'dependencia'.
    const u = await pool.query("SELECT nombre FROM usuarios WHERE id = $1 AND rol = 'dependencia'", [dependenciaId]);
    if (u.rowCount === 0) return res.status(400).json({ error: 'La dependencia indicada no existe o la cuenta no es una dependencia' });
    const dependencia = u.rows[0].nombre;

    const up = await pool.query(
      `INSERT INTO presupuesto_anual (ejercicio, dependencia_id, dependencia, partida, techo, descripcion, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (ejercicio, dependencia_id, partida)
       DO UPDATE SET techo = EXCLUDED.techo, descripcion = EXCLUDED.descripcion
       RETURNING *`,
      [ejercicio, dependenciaId, dependencia, partida, r2(techo), descripcion, req.user.id]
    );
    return res.status(201).json(up.rows[0]);
  } catch (err) {
    console.error('[crearPresupuesto]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// GET /api/instruccion-pago/cola — COLA GLOBAL de solicitudes de cobro para FINANZAS (FIX 22-jun, profe):
// todas las instrucciones de pago 'emitida' (de TODOS los contratos), con su contrato/estimación/neto/
// fecha, para que finanzas REVISE (folio fiscal, firmas) y mande a cobranza, SIN tener que entrar contrato
// por contrato. El profe: "una cola de solicitudes de cobro, cada una a qué contrato pertenece". Acotada por
// participación: finanzas (transversal) ve todas; los roles operativos solo las de sus contratos.
async function colaCobro(req, res) {
  try {
    const r = await pool.query(
      `SELECT ip.id AS instruccion_id, ip.estado, ip.monto, ip.factura_cfdi, ip.notificado_finanzas_en, ip.instruida_por,
              e.id AS estimacion_id, e.numero AS estimacion_numero, e.estado AS estimacion_estado,
              e.periodo_inicio, e.periodo_fin,
              c.id AS contrato_id, c.folio, c.contratista, c.dependencia,
              c.created_by, c.residente_id, c.superintendente_id, c.supervision_id,
              EXISTS (SELECT 1 FROM pagos p WHERE p.estimacion_id = e.id) AS pagada,
              COALESCE((SELECT json_agg(json_build_object('id', cs.id, 'tipo', cs.tipo, 'nombre', cs.nombre) ORDER BY cs.id)
                          FROM cobro_soportes cs WHERE cs.estimacion_id = e.id), '[]'::json) AS archivos
         FROM instruccion_pago ip
         JOIN estimaciones e ON e.id = ip.estimacion_id
         JOIN contratos c ON c.id = e.contrato_id
        WHERE ip.estado = 'emitida'
        ORDER BY ip.notificado_finanzas_en ASC NULLS LAST, ip.id ASC`
    );
    const filas = r.rows
      .filter((row) => esParteOSupervision(req.user, row))
      .map((row) => ({
        instruccion_id: row.instruccion_id, estado: row.estado, monto: r2(row.monto).toFixed(2),
        factura_cfdi: row.factura_cfdi, notificado_finanzas_en: row.notificado_finanzas_en,
        estimacion_id: row.estimacion_id, estimacion_numero: row.estimacion_numero, estimacion_estado: row.estimacion_estado,
        periodo_inicio: row.periodo_inicio, periodo_fin: row.periodo_fin,
        contrato_id: row.contrato_id, folio: row.folio, contratista: row.contratista, dependencia: row.dependencia,
        pagada: !!row.pagada,
        archivos: Array.isArray(row.archivos) ? row.archivos : [],
      }));
    return res.status(200).json(filas);
  } catch (err) { console.error('[colaCobro]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// G5 (23-jun, profe): NOTIFICACIÓN "ve a presentar documentos a cobro". Estimaciones AUTORIZADAS por la
// residencia (art. 54 LOPSRM) que AÚN NO tienen instrucción de pago promovida (el contratista todavía no
// presentó sus documentos). Se DERIVA, sin tabla nueva. Acotado por participación (esParteOSupervision): el
// contratista ve las de sus contratos; finanzas (transversal) y dependencia las ven también.
async function porCobrar(req, res) {
  try {
    const r = await pool.query(
      `SELECT e.id AS estimacion_id, e.numero AS estimacion_numero, e.neto,
              e.periodo_inicio, e.periodo_fin,
              c.id AS contrato_id, c.folio, c.contratista,
              c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
         FROM estimaciones e
         JOIN contratos c ON c.id = e.contrato_id
        WHERE e.estado = 'autorizada'
          AND NOT EXISTS (SELECT 1 FROM instruccion_pago ip WHERE ip.estimacion_id = e.id)
        ORDER BY e.id`
    );
    const filas = r.rows
      .filter((row) => esParteOSupervision(req.user, row))
      .map((row) => ({
        estimacion_id: row.estimacion_id, estimacion_numero: row.estimacion_numero,
        neto: r2(row.neto).toFixed(2), periodo_inicio: row.periodo_inicio, periodo_fin: row.periodo_fin,
        contrato_id: row.contrato_id, folio: row.folio, contratista: row.contratista,
      }));
    return res.status(200).json(filas);
  } catch (err) { console.error('[porCobrar]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// ── FOLLOW-ON b (22-jun, profe): CARGA BINARIA del CFDI / oficio de autorización ─────────────────────
// El profe: el CONTRATISTA promueve su cobro y SUBE sus soportes (CFDI + oficio de autorización que genera el
// sistema); Finanzas los DESCARGA desde la cola y paga. Binario INLINE en BYTEA (tabla cobro_soportes, aditiva).
// subido_por = JWT, nunca del body. Acceso por participación (finanzas transversal en lib/acceso).
const TIPOS_ARCHIVO_COBRO = ['cfdi', 'oficio', 'otro']; // BUG #20: el XML del CFDI se guarda como 'cfdi' con mime application/xml (soporta PDF y XML por CFDI, sin tocar el CHECK del schema)
function esPdf(buffer) {
  return !!buffer && buffer.length > 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46; // '%PDF'
}

// POST /api/instruccion-pago/estimacion/:id/archivo — sube un PDF (multipart, campo 'documento'); body.tipo ∈ cfdi|oficio|otro.
async function subirArchivoCobro(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Falta el archivo (campo "documento")' });
    // BUG #20: se acepta PDF o XML (CFDI). El XML se valida bien-formado en su inicio + guarda anti-XXE.
    const isPdf = esPdf(req.file.buffer);
    const isXml = esXml(req.file.buffer);
    if (!isPdf && !isXml) return res.status(400).json({ error: 'El archivo debe ser un PDF o un XML (CFDI) válido.' });
    let tipo = typeof req.body?.tipo === 'string' ? req.body.tipo.trim().toLowerCase() : 'otro';
    if (!TIPOS_ARCHIVO_COBRO.includes(tipo)) tipo = 'otro';
    // Un XML es el CFDI en formato XML: se clasifica como 'cfdi' (el mime application/xml lo distingue del PDF).
    if (isXml && tipo !== 'oficio') tipo = 'cfdi';

    const est = await cargarEstimacionContrato(id);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (!esParteOSupervision(req.user, est)) return res.status(403).json({ error: 'No tienes acceso a esta estimación' });
    // El contratista promueve su cobro y sube sus soportes (CFDI/oficio); finanzas solo descarga y paga.
    if (req.user.rol !== 'contratista') {
      return res.status(403).json({ error: 'Solo el contratista sube los soportes de cobro (CFDI / oficio). Finanzas los descarga de la cola y paga.' });
    }
    if (est.contrato_estado === 'cerrado') {
      return res.status(409).json({ error: 'El contrato ya está cerrado (finiquito elaborado); no se cargan soportes de cobro (art. 64 LOPSRM).' });
    }
    const { buffer, originalname, mimetype, size } = req.file;
    const r = await pool.query(
      `INSERT INTO cobro_soportes (estimacion_id, tipo, nombre, mime, tamano, contenido, subido_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, tipo, nombre, mime, tamano, subido_por, created_at`,
      [id, tipo, originalname || `${tipo}.pdf`, mimetype || 'application/pdf', size, buffer, req.user.id]
    );
    return res.status(201).json(r.rows[0]);
  } catch (err) { console.error('[subirArchivoCobro]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// GET /api/instruccion-pago/estimacion/:id/archivos — metadatos (no el binario) de los soportes de cobro (por participación).
async function listarArchivosCobro(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
    const est = await cargarEstimacionContrato(id);
    if (!est) return res.status(404).json({ error: 'Estimación no encontrada' });
    if (!esParteOSupervision(req.user, est)) return res.status(403).json({ error: 'No tienes acceso a esta estimación' });
    const r = await pool.query(
      'SELECT id, tipo, nombre, mime, tamano, subido_por, created_at FROM cobro_soportes WHERE estimacion_id = $1 ORDER BY id',
      [id]
    );
    return res.status(200).json(r.rows);
  } catch (err) { console.error('[listarArchivosCobro]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// GET /api/instruccion-pago/archivo/:archivoId — sirve el PDF (inline) por participación (finanzas transversal).
async function descargarArchivoCobro(req, res) {
  try {
    const archivoId = Number(req.params.archivoId);
    if (!Number.isInteger(archivoId) || archivoId <= 0) return res.status(400).json({ error: 'archivo inválido' });
    const r = await pool.query(
      `SELECT cs.nombre, cs.mime, cs.tamano, cs.contenido,
              c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
         FROM cobro_soportes cs
         JOIN estimaciones e ON e.id = cs.estimacion_id
         JOIN contratos c ON c.id = e.contrato_id
        WHERE cs.id = $1`,
      [archivoId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Archivo no encontrado' });
    const f = r.rows[0];
    if (!esParteOSupervision(req.user, f)) return res.status(403).json({ error: 'No tienes acceso a este archivo' });
    if (!f.contenido) return res.status(404).json({ error: 'El archivo no tiene contenido' });
    res.setHeader('Content-Type', f.mime || 'application/pdf');
    res.setHeader('Content-Length', f.tamano);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(f.nombre || 'soporte.pdf')}"`);
    return res.status(200).send(f.contenido);
  } catch (err) { console.error('[descargarArchivoCobro]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// GET /api/instruccion-pago/datos-bancarios/empresa/:empresaId — datos bancarios VIGENTES del contratista
// (por empresa). Lectura: finanzas (transversal) o un usuario de esa misma empresa. BUG #17.
async function leerDatosBancarios(req, res) {
  try {
    await ensureBancarios();
    const empresaId = Number(req.params.empresaId);
    if (!Number.isInteger(empresaId) || empresaId <= 0) return res.status(400).json({ error: 'empresa inválida' });
    if (req.user.rol !== 'finanzas' && req.user.empresa_id !== empresaId) {
      return res.status(403).json({ error: 'No tienes acceso a los datos bancarios de esta empresa' });
    }
    const r = await pool.query(
      `SELECT db.id, db.empresa_id, db.clabe, db.banco, db.titular, db.cuenta, db.validado_por,
              u.nombre AS validado_por_nombre, db.created_at
         FROM contratista_datos_bancarios db LEFT JOIN usuarios u ON u.id = db.validado_por
        WHERE db.empresa_id = $1 AND db.vigente = true ORDER BY db.id DESC LIMIT 1`,
      [empresaId]
    );
    return res.status(200).json(r.rowCount ? r.rows[0] : null);
  } catch (err) { console.error('[leerDatosBancarios]', err); return res.status(500).json({ error: 'Error interno' }); }
}

// POST /api/instruccion-pago/datos-bancarios/empresa/:empresaId — FINANZAS captura/valida los datos
// bancarios del contratista (BUG #10/#17/#18). CLABE = 18 dígitos + control (#18). Append-only: la anterior
// deja de ser vigente. body: { clabe, banco, titular, cuenta? }.
async function guardarDatosBancarios(req, res) {
  try {
    await ensureBancarios();
    const empresaId = Number(req.params.empresaId);
    if (!Number.isInteger(empresaId) || empresaId <= 0) return res.status(400).json({ error: 'empresa inválida' });
    if (req.user.rol !== 'finanzas') return res.status(403).json({ error: 'Solo Finanzas captura y valida los datos bancarios del contratista.' });
    const b = req.body || {};
    const clabe = String(b.clabe || '').replace(/\s/g, '');
    const banco = typeof b.banco === 'string' ? b.banco.trim() : '';
    const titular = typeof b.titular === 'string' ? b.titular.trim() : '';
    const cuenta = typeof b.cuenta === 'string' ? (b.cuenta.trim() || null) : null;
    // BUG #18: CLABE exactamente 18 dígitos (no se confunde con la referencia SPEI) + dígito de control.
    if (!/^\d{18}$/.test(clabe)) return res.status(400).json({ error: 'La CLABE debe tener exactamente 18 dígitos.' });
    if (!clabeValida(clabe)) return res.status(400).json({ error: 'La CLABE tiene 18 dígitos pero su dígito de control no es válido; revisa el número.' });
    if (!banco) return res.status(400).json({ error: 'El banco es obligatorio.' });
    if (!titular) return res.status(400).json({ error: 'El titular de la cuenta es obligatorio.' });
    const emp = await pool.query('SELECT 1 FROM empresas WHERE id = $1', [empresaId]);
    if (emp.rowCount === 0) return res.status(404).json({ error: 'La empresa indicada no existe' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE contratista_datos_bancarios SET vigente = false WHERE empresa_id = $1 AND vigente = true', [empresaId]);
      const ins = await client.query(
        `INSERT INTO contratista_datos_bancarios (empresa_id, clabe, banco, titular, cuenta, vigente, validado_por)
         VALUES ($1,$2,$3,$4,$5,true,$6)
         RETURNING id, empresa_id, clabe, banco, titular, cuenta, validado_por, created_at`,
        [empresaId, clabe, banco, titular, cuenta, req.user.id]
      );
      await client.query('COMMIT');
      return res.status(201).json(ins.rows[0]);
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
  } catch (err) { console.error('[guardarDatosBancarios]', err); return res.status(500).json({ error: 'Error interno' }); }
}

module.exports = { estadoTransito, cargarSoporte, generarInstruccion, consultarPresupuesto, crearPresupuesto, colaCobro, porCobrar, subirArchivoCobro, listarArchivosCobro, descargarArchivoCobro, leerDatosBancarios, guardarDatosBancarios };
