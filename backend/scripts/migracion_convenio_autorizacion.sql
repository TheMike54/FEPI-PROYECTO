-- ============================================================================
-- ITEM 3.2 (Oleada 3) — Acto de AUTORIZACIÓN explícito del convenio por el servidor FACULTADO.
-- Fundamento verificado en docs/legal:
--   · LOPSRM art. 59 párr. 3 (lopsrm.txt): los convenios "deberán ser autorizados por la persona
--     servidora pública que se determine en los lineamientos de la dependencia o entidad..." → el
--     ACTO de autorización es distinto del registro/captura (que sustenta el residente, art. 99 p1).
--   · RLOPSRM art. 99 párr. 5: suscripción por el servidor facultado (no el residente que sustenta).
--   · RLOPSRM art. 102 fr. I-III: variación > 25% del monto/plazo exige autorización/soporte (oficio).
-- El rol facultado se mapea al rol 'dependencia' (servidor que firma/suscribe el contrato; los
-- "lineamientos" del art. 1 Quinquies no están modelados por dependencia → mapeo conservador).
--
-- ALCANCE (Etapa 1): esta migración + el endpoint /autorizar SELLAN el acto de autorización
-- (estado + autorizado_en) de forma append-only. La modificación MATERIAL del programa/monto se sigue
-- aplicando en el REGISTRO (crearConvenio), como hoy. Diferir el EFECTO material hasta la autorización
-- exige rehacer cómo HU-12 (estimaciones)/HU-06 (avance) leen el catálogo vivo → follow-on para Maiki.
--
-- ADITIVA E IDEMPOTENTE. NO se edita schema.sql (congelado): Maiki la integra a schema.sql y la aplica
-- en Render con el runbook (--single-transaction -v ON_ERROR_STOP=1). Probar 2-3 veces en local.
-- ============================================================================

-- 1) Estado del convenio + sello del acto de autorización (autorizado_por YA existe, schema.sql:1360).
ALTER TABLE convenios_modificatorios
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'autorizado'
    CHECK (estado IN ('registrado', 'autorizado'));
ALTER TABLE convenios_modificatorios
  ADD COLUMN IF NOT EXISTS autorizado_en TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_convenios_estado ON convenios_modificatorios(contrato_id, estado);

-- 2) Reemplazar el trigger de inmutabilidad ANTES del backfill: el trigger viejo bloquea CUALQUIER
--    UPDATE de un convenio con nota ligada (OLD.nota_id IS NOT NULL), lo que rompería el backfill del
--    sello. El nuevo permite SOLO la transición controlada registrado→autorizado (estado, autorizado_por
--    NULL→valor, autorizado_en NULL→valor) y conserva nota_id NULL→valor (asiento diferido O6). Todo lo
--    demás sigue CONGELADO. IDEMPOTENTE (CREATE OR REPLACE).
CREATE OR REPLACE FUNCTION sigecop_convenio_inmutable() RETURNS trigger AS $func$
BEGIN
  -- Identidad CONGELADA (lo sustantivo del convenio registrado). autorizado_por sale del bloque de
  -- identidad: ahora se permite su sello NULL→valor en la autorización (ver más abajo).
  IF NEW.contrato_id            IS DISTINCT FROM OLD.contrato_id
     OR NEW.numero              IS DISTINCT FROM OLD.numero
     OR NEW.folio               IS DISTINCT FROM OLD.folio
     OR NEW.tipo                IS DISTINCT FROM OLD.tipo
     OR NEW.fundamento          IS DISTINCT FROM OLD.fundamento
     OR NEW.motivo              IS DISTINCT FROM OLD.motivo
     OR NEW.fecha               IS DISTINCT FROM OLD.fecha
     OR NEW.monto_anterior      IS DISTINCT FROM OLD.monto_anterior
     OR NEW.monto_nuevo         IS DISTINCT FROM OLD.monto_nuevo
     OR NEW.plazo_anterior_dias IS DISTINCT FROM OLD.plazo_anterior_dias
     OR NEW.plazo_nuevo_dias    IS DISTINCT FROM OLD.plazo_nuevo_dias
     OR NEW.delta_monto_pct     IS DISTINCT FROM OLD.delta_monto_pct
     OR NEW.delta_plazo_pct     IS DISTINCT FROM OLD.delta_plazo_pct
     OR NEW.requiere_revision_sfp  IS DISTINCT FROM OLD.requiere_revision_sfp
     OR NEW.requiere_ajuste_costos IS DISTINCT FROM OLD.requiere_ajuste_costos
     OR NEW.created_at          IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Un convenio modificatorio registrado es inalterable (art. 59 LOPSRM / art. 99 RLOPSRM)';
  END IF;
  -- nota_id: solo NULL→valor (asiento diferido al abrir la bitácora); una vez ligada, inmutable.
  IF OLD.nota_id IS NOT NULL AND NEW.nota_id IS DISTINCT FROM OLD.nota_id THEN
    RAISE EXCEPTION 'El convenio ya tiene su nota de bitácora ligada; el vínculo es inmutable';
  END IF;
  -- estado: SOLO la transición controlada registrado→autorizado (ITEM 3.2, art. 59 párr. 3 LOPSRM).
  IF OLD.estado = 'autorizado' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    RAISE EXCEPTION 'El convenio ya está autorizado y surtió efecto; es inalterable (art. 59 LOPSRM)';
  END IF;
  IF OLD.estado = 'registrado' AND NEW.estado NOT IN ('registrado', 'autorizado') THEN
    RAISE EXCEPTION 'Transición de estado de convenio inválida';
  END IF;
  -- autorizado_por / autorizado_en: solo NULL→valor (sello del acto de autorización), una sola vez.
  IF OLD.autorizado_por IS NOT NULL AND NEW.autorizado_por IS DISTINCT FROM OLD.autorizado_por THEN
    RAISE EXCEPTION 'El autorizador del convenio es inmutable';
  END IF;
  IF OLD.autorizado_en IS NOT NULL AND NEW.autorizado_en IS DISTINCT FROM OLD.autorizado_en THEN
    RAISE EXCEPTION 'El sello de autorización del convenio es inmutable';
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;
-- (el trigger trg_convenio_inmutable ya apunta a esta función; no se recrea)

-- 3) Backfill (YA con el trigger nuevo activo): los convenios viejos (flujo de 1 acto: registrar ==
--    autorizar) YA surtieron efecto → quedan 'autorizado' (DEFAULT) con autorizado_en = created_at
--    (sello derivado). El trigger nuevo permite el sello autorizado_en NULL→valor.
UPDATE convenios_modificatorios SET autorizado_en = created_at
 WHERE autorizado_en IS NULL AND estado = 'autorizado';
