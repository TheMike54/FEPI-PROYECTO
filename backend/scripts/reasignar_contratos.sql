-- reasignar_contratos.sql — Re-asigna SOP-2026-002..006 a las cuentas de cada persona. Idempotente.
-- SOP-2026-001 NO se toca. contratos: UPDATE (sin trigger). roster: DELETE vigentes + INSERT (el trigger no
-- intercepta DELETE). bitácora: append-only → NO se toca (queda histórica, válida). PDF: cuelga del contrato.
-- Persistido al repo desde el Apéndice B de docs/pruebas/REPARTO_EQUIPO_RENDER_25jun.md (26-jun). Validado en LOCAL.
-- CORRER DESPUÉS de reseed_cuentas.sql + reparto_extra.sql.
CREATE OR REPLACE FUNCTION pg_temp.reasignar(p_folio TEXT, p_res TEXT, p_con TEXT, p_sup TEXT, p_dep TEXT)
RETURNS VOID AS $$
DECLARE
  v_cid INT; f_ini DATE;
  u_res INT; e_res INT;
  u_con INT; n_con TEXT; e_con INT;
  u_sup INT; e_sup INT;
  u_dep INT; n_dep TEXT;
BEGIN
  SELECT id, fecha_inicio INTO v_cid, f_ini FROM contratos WHERE folio=p_folio;
  IF v_cid IS NULL THEN RAISE EXCEPTION 'Contrato % no existe', p_folio; END IF;
  SELECT id, empresa_id            INTO u_res, e_res FROM usuarios WHERE email=p_res;
  SELECT id, nombre, empresa_id    INTO u_con, n_con, e_con FROM usuarios WHERE email=p_con;
  SELECT id, empresa_id            INTO u_sup, e_sup FROM usuarios WHERE email=p_sup;
  SELECT id, nombre                INTO u_dep, n_dep FROM usuarios WHERE email=p_dep;
  IF u_res IS NULL OR u_con IS NULL OR u_sup IS NULL OR u_dep IS NULL THEN
    RAISE EXCEPTION 'Falta alguna cuenta del set para % (res=% con=% sup=% dep=%)', p_folio, p_res, p_con, p_sup, p_dep;
  END IF;

  UPDATE contratos SET
    residente_id=u_res, superintendente_id=u_con, supervision_id=u_sup, dependencia_id=u_dep,
    created_by=u_res, contratista=n_con, dependencia=n_dep,
    contratista_empresa_id=e_con, supervision_empresa_id=e_sup
  WHERE id=v_cid;

  DELETE FROM contrato_roster WHERE contrato_id=v_cid AND vigencia_hasta IS NULL;
  INSERT INTO contrato_roster (contrato_id, rol, usuario_id, vigencia_desde, motivo, registrado_por, empresa_id) VALUES
    (v_cid,'residente',       u_res, f_ini,'Re-asignación a equipo de prueba (reparto 25-jun)', u_res, e_res),
    (v_cid,'superintendente', u_con, f_ini,'Re-asignación a equipo de prueba (reparto 25-jun)', u_res, e_con),
    (v_cid,'supervision',     u_sup, f_ini,'Re-asignación a equipo de prueba (reparto 25-jun)', u_res, e_sup);
END $$ LANGUAGE plpgsql;

SELECT pg_temp.reasignar('SOP-2026-002','residente2.demo@sigecop.test','super2.demo@sigecop.test','superv2.demo@sigecop.test','dependencia.sur@sigecop.test'); -- Aldo
SELECT pg_temp.reasignar('SOP-2026-003','residente.sur@sigecop.test',  'super3.demo@sigecop.test','superv.sur@sigecop.test',  'dep2@sigecop.test');            -- Roñis
SELECT pg_temp.reasignar('SOP-2026-004','residente.norte@sigecop.test','patito1@sigecop.test',    'superv.norte@sigecop.test','dependencia4@sigecop.test');     -- Leo
SELECT pg_temp.reasignar('SOP-2026-005','residente4@sigecop.test',     'patito2@sigecop.test',    'superv4@sigecop.test',     'dependencia5@sigecop.test');     -- Van
SELECT pg_temp.reasignar('SOP-2026-006','residente5@sigecop.test',     'pacifico1@sigecop.test',  'superv5@sigecop.test',     'dependencia6@sigecop.test');     -- Chinos

SELECT c.folio,
  (SELECT email FROM usuarios WHERE id=c.residente_id)       AS residente,
  (SELECT email FROM usuarios WHERE id=c.superintendente_id) AS superintendente,
  (SELECT email FROM usuarios WHERE id=c.supervision_id)     AS supervision,
  (SELECT email FROM usuarios WHERE id=c.dependencia_id)     AS dependencia,
  (SELECT count(*) FROM contrato_roster r WHERE r.contrato_id=c.id AND r.vigencia_hasta IS NULL) AS roster_vig,
  (SELECT count(*) FROM contrato_documentos d WHERE d.contrato_id=c.id AND d.tipo='contrato')    AS pdf,
  (SELECT count(*) FROM bitacora_aperturas b WHERE b.contrato_id=c.id)                           AS bitacora
FROM contratos c WHERE c.folio IN
 ('SOP-2026-002','SOP-2026-003','SOP-2026-004','SOP-2026-005','SOP-2026-006')
ORDER BY c.folio;
