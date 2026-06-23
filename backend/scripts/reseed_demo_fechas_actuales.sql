-- =====================================================================
-- RESEED DEMO — fechas actuales para el CICLO DE ESTIMACIÓN (BLOQUE 1, 22-jun)
-- =====================================================================
-- El seed original deja los periodos en mar–may (todos PASADOS respecto a hoy), así que no se puede
-- demostrar "solo se estima al cerrar el periodo". Este script ajusta el contrato demo 6936 (PRUEBA-HU-12)
-- a fechas RELATIVAS a CURRENT_DATE:
--   · Periodo 1 = mes ANTERIOR  → VENCIDO   (estimable)
--   · Periodo 2 = mes ACTUAL    → EN CURSO  (NO estimable: aún no cierra)
--   · Periodo 3 = mes SIGUIENTE → FUTURO    (NO estimable)
-- Y reporta AVANCE en el periodo vencido (para demostrar "jalar del avance" al integrar la estimación).
--
-- NO toca el schema. Idempotente (se puede correr varias veces; recalcula fechas y reescribe el avance).
-- Aplicar:  docker exec -i sigecop_db psql -U sigecop -d sigecop_db -f - < backend/scripts/reseed_demo_fechas_actuales.sql
-- =====================================================================
DO $$
DECLARE
  cid INT := 6936;                               -- contrato demo (PRUEBA-HU-12): residente@ / contratista@
  m0  DATE := date_trunc('month', CURRENT_DATE)::date;  -- primer día del mes actual
  p1  INT;
BEGIN
  -- 1) Periodos relativos a hoy (vencido / en curso / futuro).
  UPDATE contrato_periodos SET inicio = (m0 - INTERVAL '1 month')::date, fin = (m0 - INTERVAL '1 day')::date
    WHERE contrato_id = cid AND numero = 1 RETURNING id INTO p1;
  UPDATE contrato_periodos SET inicio = m0, fin = (m0 + INTERVAL '1 month' - INTERVAL '1 day')::date
    WHERE contrato_id = cid AND numero = 2;
  UPDATE contrato_periodos SET inicio = (m0 + INTERVAL '1 month')::date, fin = (m0 + INTERVAL '2 month' - INTERVAL '1 day')::date
    WHERE contrato_id = cid AND numero = 3;

  -- 2) Estado limpio de avance para el demo (NO borra estimaciones: trazabilidad).
  DELETE FROM concepto_avance WHERE contrato_concepto_id IN (SELECT id FROM contrato_conceptos WHERE contrato_id = cid);

  -- 3) Avance reportado en el periodo VENCIDO (p1) = la cantidad PROGRAMADA de ese periodo (trabajo terminado),
  --    para que la integración de la estimación lo "jale del avance".
  INSERT INTO concepto_avance (contrato_concepto_id, contrato_periodo_id, cantidad, fecha, estado, registrado_por)
  SELECT po.contrato_concepto_id, p1, po.cantidad, (m0 - INTERVAL '1 day')::date, 'vigente', c.superintendente_id
    FROM programa_obra po
    JOIN contratos c ON c.id = cid
   WHERE po.contrato_periodo_id = p1 AND po.cantidad > 0;

  -- 4) PDF firmado del contrato (HU-01): la integración de estimaciones lo EXIGE (gate server-side). Para el
  --    demo basta con que exista una fila tipo='contrato' (el check es SELECT 1). Dummy idempotente.
  INSERT INTO contrato_documentos (contrato_id, nombre, mime, tamano, contenido, tipo)
  SELECT cid, 'contrato_demo.pdf', 'application/pdf', 8, '\x255044462d312e34'::bytea, 'contrato'
  WHERE NOT EXISTS (SELECT 1 FROM contrato_documentos WHERE contrato_id = cid AND tipo = 'contrato');
  -- Si el anticipo supera 30%, también la autorización del anticipo (art. 50 fr. IV LOPSRM).
  INSERT INTO contrato_documentos (contrato_id, nombre, mime, tamano, contenido, tipo)
  SELECT cid, 'anticipo_demo.pdf', 'application/pdf', 8, '\x255044462d312e34'::bytea, 'anticipo_autorizacion'
  FROM contratos c
  WHERE c.id = cid AND COALESCE(c.anticipo_pct, 0) > 30
    AND NOT EXISTS (SELECT 1 FROM contrato_documentos WHERE contrato_id = cid AND tipo = 'anticipo_autorizacion');

  RAISE NOTICE 'Reseed 6936: periodo 1 (vencido) id=%, avance en el vencido + PDF firmado dummy.', p1;
END $$;
