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

// Carga estimación + contrato (cols de acceso + dependencia/fecha para suficiencia).
async function cargarEstimacionContrato(id) {
  const r = await pool.query(
    `SELECT e.id, e.contrato_id, e.numero, e.estado, e.neto, e.periodo_inicio, e.periodo_fin,
            c.folio, c.contratista, c.dependencia, c.fecha_inicio, c.monto,
            c.estado AS contrato_estado, c.cerrado_en,
            c.created_by, c.residente_id, c.superintendente_id, c.supervision_id
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

// Suficiencia presupuestal (art. 24). Excluye la estimación actual del "comprometido" para mostrar
// el disponible ANTES de este pago (paralelo a la carátula del maqueta). techo=null si no hay partida.
async function calcularSuficiencia(dependencia, ejercicio, estimacionId, neto) {
  const out = {
    ejercicio, dependencia,
    techo: null, presupuesto_id: null,
    comprometido: '0.00', disponible_antes: null, neto: r2(neto).toFixed(2),
    disponible_despues: null, excede: null, sin_presupuesto: true,
    nota: 'comprometido = Σ neto autorizadas+pagadas de la dependencia/ejercicio (suficiencia previa, art. 24 LOPSRM); join por texto sin FK = deuda técnica conocida (criterio del equipo, no legal)',
  };
  if (!dependencia || ejercicio == null) return out; // sin dependencia/fecha → no se puede ubicar la partida
  const p = await pool.query(
    'SELECT id, techo FROM presupuesto_anual WHERE ejercicio = $1 AND dependencia = $2',
    [ejercicio, dependencia]
  );
  if (p.rowCount === 0) return out; // sin techo cargado → CA-1 no verificable (sin inventar)

  const techo = Number(p.rows[0].techo);
  const cq = await pool.query(
    `SELECT COALESCE(SUM(e.neto),0) AS comprometido
       FROM estimaciones e JOIN contratos c ON c.id = e.contrato_id
      WHERE c.dependencia = $1 AND EXTRACT(YEAR FROM c.fecha_inicio) = $2
        AND e.estado IN ('autorizada','pagada') AND e.id <> $3`,
    [dependencia, ejercicio, estimacionId]
  );
  const comprometido = Number(cq.rows[0].comprometido);
  const disponibleAntes = r2(techo - comprometido);
  const netoR = r2(neto);
  return {
    ...out,
    techo: techo.toFixed(2),
    presupuesto_id: p.rows[0].id,
    comprometido: r2(comprometido).toFixed(2),
    disponible_antes: disponibleAntes.toFixed(2),
    neto: netoR.toFixed(2),
    disponible_despues: r2(disponibleAntes - netoR).toFixed(2),
    excede: netoR > disponibleAntes,
    sin_presupuesto: false,
  };
}

// Checklist de soportes (CA-3): factura + CFDI (metadatos) y fianza de cumplimiento (leída de garantías).
async function leerSoportes(estimacionId, contratoId) {
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
  const vigente = exigible ? (fila.vigencia == null || new Date(fila.vigencia) >= new Date(new Date().toDateString())) : false;

  const facturaOk = !!factura;
  const cfdiOk = !!(cfdi && (cfdi.descripcion || '').trim()); // CFDI exige folio fiscal en descripcion
  const fianzaOk = !exigible || vigente; // si no es exigible, no bloquea
  return {
    metadatos: sop.rows,
    factura: { cargado: facturaOk, descripcion: factura?.descripcion || null },
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

function semaforoPlazo(anclaISO) {
  if (!anclaISO) {
    return {
      disponible: false,
      nota: 'Sin fecha de autorización registrada (la nota de autorización requiere bitácora abierta al autorizar). ' +
            'El ancla canónica requiere el sello autorizada_en (PARA MAIKI).',
    };
  }
  const ancla = new Date(anclaISO);
  const hoy = new Date(new Date().toDateString());
  const dias = Math.max(0, Math.floor((hoy - new Date(ancla.toDateString())) / 86400000));
  const diasVencidos = Math.max(0, dias - PLAZO_PAGO_DIAS); // días pasados del plazo de pago de 20 (art. 54)
  const color = diasVencidos <= PLAZO_DIAS_VENCIDOS.verde_max ? 'verde'
    : (diasVencidos <= PLAZO_DIAS_VENCIDOS.ambar_max ? 'ambar' : 'rojo');
  return {
    disponible: true, ancla: anclaISO, dia_actual: dias, dias_vencidos: diasVencidos, plazo: PLAZO_PAGO_DIAS, color,
    fuente: 'bitácora (nota de autorización res_estimaciones)',
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

    const ejercicio = ejercicioDe(est.fecha_inicio);
    const [suficiencia, soportes, ancla, ip] = await Promise.all([
      calcularSuficiencia(est.dependencia, ejercicio, est.id, est.neto),
      leerSoportes(est.id, est.contrato_id),
      anclaAutorizacion(est.id),
      pool.query('SELECT * FROM instruccion_pago WHERE estimacion_id = $1', [est.id]),
    ]);

    return res.status(200).json({
      estimacion: {
        id: est.id, numero: est.numero, contrato_id: est.contrato_id, folio: est.folio,
        contratista: est.contratista, dependencia: est.dependencia, ejercicio,
        estado: est.estado, neto: r2(est.neto).toFixed(2),
        periodo_inicio: est.periodo_inicio, periodo_fin: est.periodo_fin,
      },
      es_autorizada: est.estado === 'autorizada',
      // Cierre del contrato (art. 64 LOPSRM): si está finiquitado, no se generan nuevas instrucciones.
      contrato_cerrado: est.contrato_estado === 'cerrado',
      suficiencia,
      soportes,
      semaforo_plazo: semaforoPlazo(ancla),
      instruccion: ip.rowCount ? ip.rows[0] : null,
      // CA-3: la subida de archivos binarios no está disponible (sin infra de almacenamiento).
      upload_archivos: { disponible: false, nota: 'carga de archivo no disponible (falta infra de almacenamiento)' },
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
    if (!['contratista', 'finanzas'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'Solo el contratista o finanzas pueden cargar soportes' }); // criterio del equipo (default conservador): contratista aporta soportes, finanzas opera el pago
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
    if (!['contratista', 'finanzas'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'Solo el contratista o finanzas pueden generar la instrucción de pago' }); // criterio del equipo (default conservador): contratista/finanzas en el tránsito a pago
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

    // CA-1: suficiencia presupuestal (art. 24) DENTRO de una transacción que BLOQUEA la fila del techo
    // (SELECT ... FOR UPDATE) y recomputa el comprometido y el INSERT en la MISMA tx. Cierra la carrera
    // TOCTOU: dos instrucciones de la misma dependencia/ejercicio se serializan, no pueden exceder el techo.
    const ejercicio = ejercicioDe(est.fecha_inicio);
    const neto = r2(est.neto);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const p = await client.query(
        'SELECT id, techo FROM presupuesto_anual WHERE ejercicio = $1 AND dependencia = $2 FOR UPDATE',
        [ejercicio, est.dependencia]
      );
      if (p.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `No hay techo presupuestal cargado para (${est.dependencia || 's/dependencia'}, ${ejercicio || 's/ejercicio'}); no se puede verificar la suficiencia (art. 24).` });
      }
      const techo = Number(p.rows[0].techo);
      const cq = await client.query(
        `SELECT COALESCE(SUM(e.neto),0) AS comprometido
           FROM estimaciones e JOIN contratos c ON c.id = e.contrato_id
          WHERE c.dependencia = $1 AND EXTRACT(YEAR FROM c.fecha_inicio) = $2
            AND e.estado IN ('autorizada','pagada') AND e.id <> $3`,
        [est.dependencia, ejercicio, est.id]
      );
      const comprometido = Number(cq.rows[0].comprometido);
      const disponibleAntes = r2(techo - comprometido);
      if (neto > disponibleAntes) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `El neto ($${neto.toFixed(2)}) excede el disponible ($${disponibleAntes.toFixed(2)}); requiere ampliación presupuestal (art. 24 LOPSRM).`, suficiencia: { techo: techo.toFixed(2), comprometido: r2(comprometido).toFixed(2), disponible_antes: disponibleAntes.toFixed(2), neto: neto.toFixed(2) } });
      }

      // Inserta la instrucción (UNIQUE estimacion_id evita doble). monto = neto snapshot (ROUND al centavo).
      const ins = await client.query(
        `INSERT INTO instruccion_pago
           (estimacion_id, presupuesto_anual_id, monto, factura_cfdi, soportes_ok, estado, instruida_por, notificado_finanzas_en)
         VALUES ($1, $2, $3, $4, true, 'emitida', $5, NOW())
         RETURNING *`,
        [est.id, p.rows[0].id, neto, sop.folio_cfdi, req.user.id]
      );
      await client.query('COMMIT');
      return res.status(201).json({
        ok: true,
        instruccion: ins.rows[0],
        suficiencia: { techo: techo.toFixed(2), comprometido: r2(comprometido).toFixed(2), disponible_antes: disponibleAntes.toFixed(2), disponible_despues: r2(disponibleAntes - neto).toFixed(2), neto: neto.toFixed(2) },
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

// GET /api/instruccion-pago/presupuesto?ejercicio=&dependencia= — consulta el techo (lectura).
async function consultarPresupuesto(req, res) {
  try {
    const ejercicio = Number(req.query.ejercicio);
    const dependencia = typeof req.query.dependencia === 'string' ? req.query.dependencia.trim() : '';
    if (!Number.isInteger(ejercicio) || !dependencia) {
      return res.status(400).json({ error: 'ejercicio y dependencia son requeridos' });
    }
    const r = await pool.query(
      'SELECT * FROM presupuesto_anual WHERE ejercicio = $1 AND dependencia = $2',
      [ejercicio, dependencia]
    );
    return res.status(200).json(r.rowCount ? r.rows[0] : null);
  } catch (err) {
    console.error('[consultarPresupuesto]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// POST /api/instruccion-pago/presupuesto — carga/actualiza el techo (rol finanzas).
// Criterio del equipo (default conservador): la carga del techo es administración presupuestal (rol finanzas);
// se conserva aquí por cercanía a la verificación de suficiencia (art. 24 LOPSRM).
async function crearPresupuesto(req, res) {
  try {
    const ejercicio = Number(req.body?.ejercicio);
    const dependencia = typeof req.body?.dependencia === 'string' ? req.body.dependencia.trim() : '';
    const techo = Number(req.body?.techo);
    const partida = typeof req.body?.partida === 'string' ? req.body.partida.trim() : null;
    const descripcion = typeof req.body?.descripcion === 'string' ? req.body.descripcion.trim() : null;
    if (!Number.isInteger(ejercicio) || ejercicio < 2000 || ejercicio > 2100) return res.status(400).json({ error: 'ejercicio inválido (2000-2100)' });
    if (!dependencia) return res.status(400).json({ error: 'dependencia es requerida' });
    if (!Number.isFinite(techo) || techo < 0) return res.status(400).json({ error: 'techo inválido (>= 0)' });

    const up = await pool.query(
      `INSERT INTO presupuesto_anual (ejercicio, dependencia, partida, techo, descripcion, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (ejercicio, dependencia)
       DO UPDATE SET techo = EXCLUDED.techo, partida = EXCLUDED.partida, descripcion = EXCLUDED.descripcion
       RETURNING *`,
      [ejercicio, dependencia, partida, r2(techo), descripcion, req.user.id]
    );
    return res.status(201).json(up.rows[0]);
  } catch (err) {
    console.error('[crearPresupuesto]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { estadoTransito, cargarSoporte, generarInstruccion, consultarPresupuesto, crearPresupuesto };
