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

// Carga estimación + contrato (cols de acceso + dependencia/fecha para suficiencia).
async function cargarEstimacionContrato(id) {
  const r = await pool.query(
    `SELECT e.id, e.contrato_id, e.numero, e.estado, e.neto, e.periodo_inicio, e.periodo_fin,
            c.folio, c.contratista, c.dependencia, c.dependencia_id, c.fecha_inicio, c.monto,
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

// Suficiencia presupuestal (art. 24 párr. 2 LOPSRM). Excluye la estimación actual del "comprometido"
// para mostrar el disponible ANTES de este pago. ITEM 3.1: el join contrato↔presupuesto se hace por la
// FK `dependencia_id` (estable), no por el texto `dependencia` (que se rompe al renombrar la cuenta).
// Etapa 1 mantiene el invariante de 1 partida por (ejercicio, dependencia_id); si hubiera varias, el
// techo de la dependencia = Σ de sus partidas (el comprometido es a nivel dependencia porque los
// contratos aún no portan partida_id → multi-partida real por contrato = follow-on para Maiki).
// techo=null si no hay techo cargado.
async function calcularSuficiencia(dependenciaId, dependencia, ejercicio, estimacionId, neto) {
  const out = {
    ejercicio, dependencia, dependencia_id: dependenciaId ?? null,
    techo: null, presupuesto_id: null,
    comprometido: '0.00', disponible_antes: null, neto: r2(neto).toFixed(2),
    disponible_despues: null, excede: null, sin_presupuesto: true,
    nota: 'comprometido = Σ neto autorizadas+pagadas de la dependencia (por FK dependencia_id) + ejercicio (suficiencia previa, art. 24 párr. 2 LOPSRM). Techo por (ejercicio, dependencia_id, partida); Etapa 1 = 1 partida por dependencia.',
  };
  if (dependenciaId == null || ejercicio == null) return out; // sin FK/fecha → no se puede ubicar la partida (legacy)
  const p = await pool.query(
    'SELECT id, techo, partida FROM presupuesto_anual WHERE ejercicio = $1 AND dependencia_id = $2 ORDER BY id',
    [ejercicio, dependenciaId]
  );
  if (p.rowCount === 0) return out; // sin techo cargado → CA-1 no verificable (sin inventar)

  // Techo de la dependencia/ejercicio (Σ de sus partidas; en Etapa 1 hay exactamente una).
  const techo = p.rows.reduce((s, r) => s + Number(r.techo), 0);
  const cq = await pool.query(
    `SELECT COALESCE(SUM(e.neto),0) AS comprometido
       FROM estimaciones e JOIN contratos c ON c.id = e.contrato_id
      WHERE c.dependencia_id = $1 AND EXTRACT(YEAR FROM c.fecha_inicio) = $2
        AND e.estado IN ('autorizada','pagada') AND e.id <> $3`,
    [dependenciaId, ejercicio, estimacionId]
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
      calcularSuficiencia(est.dependencia_id, est.dependencia, ejercicio, est.id, est.neto),
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
    // FIX 22-jun (profe): el CONTRATISTA promueve su cobro (sube CFDI, oficio, datos bancarios SPEI);
    // finanzas solo REVISA la cola y paga. La promoción es del contratista, no de finanzas.
    if (req.user.rol !== 'contratista') {
      return res.status(403).json({ error: 'Solo el contratista promueve su cobro (sube CFDI, oficio y datos bancarios). Finanzas revisa la cola y paga.' });
    }
    // FIX 22-jun: los datos bancarios SPEI son NUMÉRICOS (clave de rastreo / CLABE). Se validan al cargarlos.
    if (/spei|bancari|clabe/i.test(nombre) && descripcion && !/^\d{6,30}$/.test(descripcion.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Los datos bancarios (SPEI/CLABE) deben ser numéricos.' });
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
    // FIX 22-jun (profe): el CONTRATISTA promueve su cobro (genera la solicitud); finanzas la revisa en la cola y paga.
    if (req.user.rol !== 'contratista') {
      return res.status(403).json({ error: 'Solo el contratista promueve su cobro. Finanzas revisa la cola de solicitudes y paga.' });
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
    // ITEM 3.1: si el contrato no porta dependencia_id (legacy), no se puede ubicar la partida por FK
    // → 409 controlado (NO 500), igual que "sin techo cargado".
    if (est.dependencia_id == null) {
      return res.status(409).json({ error: `El contrato no tiene dependencia asociada por FK (dato legacy); no se puede verificar la suficiencia presupuestal por partida (art. 24 LOPSRM).` });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const p = await client.query(
        'SELECT id, techo FROM presupuesto_anual WHERE ejercicio = $1 AND dependencia_id = $2 ORDER BY id FOR UPDATE',
        [ejercicio, est.dependencia_id]
      );
      if (p.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `No hay techo presupuestal cargado para (${est.dependencia || 's/dependencia'}, ejercicio ${ejercicio || 's/ejercicio'}); carga la partida específica para verificar la suficiencia (art. 24 LOPSRM).` });
      }
      // Techo de la dependencia/ejercicio (Σ de sus partidas; en Etapa 1 hay exactamente una). La
      // instrucción se liga a la primera partida (presupuesto_anual_id); multi-partida = follow-on.
      const techo = p.rows.reduce((s, r) => s + Number(r.techo), 0);
      const presupuestoId = p.rows[0].id;
      const cq = await client.query(
        `SELECT COALESCE(SUM(e.neto),0) AS comprometido
           FROM estimaciones e JOIN contratos c ON c.id = e.contrato_id
          WHERE c.dependencia_id = $1 AND EXTRACT(YEAR FROM c.fecha_inicio) = $2
            AND e.estado IN ('autorizada','pagada') AND e.id <> $3`,
        [est.dependencia_id, ejercicio, est.id]
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
        [est.id, presupuestoId, neto, sop.folio_cfdi, req.user.id]
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
const TIPOS_ARCHIVO_COBRO = ['cfdi', 'oficio', 'otro'];
function esPdf(buffer) {
  return !!buffer && buffer.length > 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46; // '%PDF'
}

// POST /api/instruccion-pago/estimacion/:id/archivo — sube un PDF (multipart, campo 'documento'); body.tipo ∈ cfdi|oficio|otro.
async function subirArchivoCobro(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Falta el archivo (campo "documento")' });
    if (!esPdf(req.file.buffer)) return res.status(400).json({ error: 'El archivo no es un PDF válido' });
    let tipo = typeof req.body?.tipo === 'string' ? req.body.tipo.trim().toLowerCase() : 'otro';
    if (!TIPOS_ARCHIVO_COBRO.includes(tipo)) tipo = 'otro';

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

module.exports = { estadoTransito, cargarSoporte, generarInstruccion, consultarPresupuesto, crearPresupuesto, colaCobro, porCobrar, subirArchivoCobro, listarArchivosCobro, descargarArchivoCobro };
