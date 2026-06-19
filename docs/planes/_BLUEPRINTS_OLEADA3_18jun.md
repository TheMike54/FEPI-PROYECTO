# Blueprints Oleada 3 (persistidos para continuidad) — 18-jun

> Detalle quirurgico de cada item (workflow wy60hy21h). Para retomar tras compactacion de contexto.


## ITEM 3.1 — HU-20 techo presupuestal a fondo: partida obligatoria + join por FK dependencia_id (art. 24 LOPSRM)

**Decision legal:** DECISION: (a) la PARTIDA pasa a OBLIGATORIA al cargar el techo y la unicidad del techo se mueve a (ejercicio, dependencia_id, partida); (b) el join contrato-presupuesto se hace por la FK dependencia_id (usuarios.id), no por el texto dependencia. FUNDAMENTO: art. 24 parr. 2 LOPSRM (confirmado en docs/legal/lopsrm.txt lineas 773-776): "Las dependencias y entidades... podran convocar, adjudicar o contratar... siempre y cuando cuenten previamente con la suficiencia presupuestaria en la PARTIDA O PARTIDAS ESPECIFICAS y se sujeten al calendario de gasto correspondiente." La ley ata la suficiencia a la PARTIDA especifica, no a un techo generico por dependencia, por lo que exigir partida cumple la letra del art. 24. El uso de dependencia_id (FK) en vez del texto es decision de INTEGRIDAD REFERENCIAL (no legal): hoy contratos.dependencia es texto DERIVADO del nombre de la cuenta (contratos.controller.js:362 const dependencia=dep.nombre), por lo que un renombre rompe el join silenciosamente; la FK contratos.dependencia_id a usuarios(id) ya existe (schema.sql:285) y es el id estable.

**Cita:** verificada — art. 24 parr. 2 LOPSRM (Ultima Reforma DOF 14-11-2025): "Las dependencias y entidades, bajo su responsabilidad, podran convocar, adjudicar o contratar obras y servicios relacionados con las mismas, siempre y cuando cuenten previamente con la suficiencia presupuestaria en la partida o partidas especificas y se sujeten al calendario de gasto correspondiente."

**Toca congelado:** true · **Riesgo:** medio · **Endpoint:** ninguno (se modifican los existentes POST/GET /api/instruccion-pago/presupuesto y GET /api/instruccion-pago/estimacion/:id)

**Archivos:**
- [libre] `backend/src/controllers/instruccion-pago.controller.js` :: crearPresupuesto, calcularSuficiencia, generarInstruccion, consultarPresupuesto, cargarEstimacionContrato — NO congelado. Grueso del cambio: exigir partida en crearPresupuesto; cambiar los 4 puntos donde se busca/joina el techo para usar dependencia_id (FK) + partida en vez de dependencia (texto).
- [libre] `backend/scripts/migracion_hu20_partida_fk.sql` :: DDL nueva (archivo a crear) — Migracion ADITIVA E IDEMPOTENTE: ADD COLUMN presupuesto_anual.dependencia_id; backfill desde el texto; partida NOT NULL; mover UNIQUE a (ejercicio, dependencia_id, partida). NO se edita schema.sql.
- [CONGELADO] `backend/src/db/schema.sql` :: presupuesto_anual (1199-1209) y contratos.dependencia_id (285) — CONGELADO. Solo lectura. La DDL nueva va en backend/scripts/, no aqui. Maiki la replica al final de schema.sql tras validar en local.
- [libre] `backend/src/routes/instruccion-pago.routes.js` :: GET/POST /presupuesto — NO congelado. Sin cambios de montaje; solo se documenta que POST /presupuesto exige partida (validacion en el controller). server.js NO se toca.
- [libre] `frontend/src/pages/TransitoPago.jsx` :: guardarTecho (139-147), formulario carga techo (234-245) — NO congelado. Anadir input obligatorio de partida y enviar partida + dependenciaId en api.crearPresupuesto; bloquear guardar si falta partida. Hoy el payload (143) no manda partida ni dependencia_id.
- [libre] `frontend/src/services/api.js` :: crearPresupuesto, consultarPresupuesto (111-112) — NO congelado. crearPresupuesto ya pasa el payload tal cual (sirve para anadir partida/dependenciaId). consultarPresupuesto puede quedar igual.
- [CONGELADO] `backend/src/controllers/contratos.controller.js` :: crearContrato — CONGELADO. Solo lectura: confirma que dependencia_id ya se inserta en el alta (384) y que el texto se deriva del nombre (362). No requiere cambios.

**Cambio:**

PARTE (a) PARTIDA OBLIGATORIA.
1) instruccion-pago.controller.js crearPresupuesto (355-379). ANTES: partida = ...|| null (sin validar); INSERT ON CONFLICT (ejercicio, dependencia) DO UPDATE. DESPUES: partida = ...||''; if(!partida) return 400 'La partida presupuestal especifica es obligatoria (art. 24 LOPSRM)'; resolver dependenciaId; INSERT (ejercicio, dependencia_id, dependencia, partida, techo, descripcion, creado_por) ON CONFLICT (ejercicio, dependencia_id, partida) DO UPDATE SET techo=EXCLUDED.techo, descripcion=EXCLUDED.descripcion.
2) TransitoPago.jsx guardarTecho (139) + formulario (234-245). ANTES: crearPresupuesto({ejercicio,dependencia,techo}). DESPUES: estado partidaVal; input 'Partida especifica' obligatorio; if(!partidaVal.trim()) showToast+return; enviar {ejercicio, dependenciaId: transito.estimacion.dependencia_id, partida: partidaVal.trim(), techo}.

PARTE (b) JOIN POR FK dependencia_id.
3) cargarEstimacionContrato (41-52): anadir c.dependencia_id al SELECT (hoy solo trae c.dependencia texto).
4) calcularSuficiencia (62-99): recibir dependenciaId. ANTES: WHERE ejercicio=$1 AND dependencia=$2 (texto); comprometido JOIN WHERE c.dependencia=$1. DESPUES: SELECT id,techo,partida WHERE ejercicio=$1 AND dependencia_id=$2; comprometido WHERE c.dependencia_id=$1 AND EXTRACT(YEAR FROM c.fecha_inicio)=$2 AND e.estado IN('autorizada','pagada') AND e.id distinto de $3.
5) generarInstruccion (278-313): el bloque tx con FOR UPDATE cambia el WHERE del techo y del comprometido igual que (4), usando est.dependencia_id. El INSERT instruccion_pago(presupuesto_anual_id,...) (309) queda igual.
6) RESOLUCION DE PARTIDA POR CONTRATO (clave del cuadre): hoy 1 techo por (ejercicio,dependencia). Etapa 1 (minima invasion, sin tocar alta congelado): si existe 1 partida para (ejercicio,dependencia_id) usar esa (retrocompat); si 0, sin_presupuesto/409 (como hoy); si hay varias, follow-on. Mantener invariante 1 partida por dependencia y ejercicio, con partida YA obligatoria y la UNIQUE incluyendola (crece sin migracion destructiva). Multi-partida real por contrato = contratos.partida_id (CONGELADO), DIFF para Maiki, fuera de este item.
7) consultarPresupuesto (334-349): aceptar dependenciaId (o seguir aceptando dependencia para retrocompat); filtrar por dependencia_id si llega.
8) estadoTransito (187-203): exponer estimacion.dependencia_id (disponible tras (3)) para que el frontend mande el id en guardarTecho.

**DDL:**

```sql
backend/scripts/migracion_hu20_partida_fk.sql (ADITIVO E IDEMPOTENTE; NO editar schema.sql):

-- ITEM 3.1 (HU-20): partida obligatoria + FK dependencia_id. Fundamento art.24 parr.2 LOPSRM.
-- Aplicar local y luego Render con runbook (--single-transaction -v ON_ERROR_STOP=1). Maiki replica en schema.sql.

ALTER TABLE presupuesto_anual ADD COLUMN IF NOT EXISTS dependencia_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_presupuesto_anual_dependencia_id ON presupuesto_anual(dependencia_id);

-- Backfill: resolver dependencia_id desde el texto (nombre de la cuenta dependencia).
UPDATE presupuesto_anual p SET dependencia_id = u.id FROM usuarios u
 WHERE p.dependencia_id IS NULL AND u.rol = 'dependencia'
   AND lower(btrim(regexp_replace(u.nombre,'\s+',' ','g'))) = lower(btrim(regexp_replace(p.dependencia,'\s+',' ','g')));

-- Partida obligatoria a nivel dato: placeholder auditable antes de NOT NULL (no falla con datos viejos).
UPDATE presupuesto_anual SET partida = 'SIN_PARTIDA_MIGRACION' WHERE partida IS NULL OR btrim(partida) = '';
ALTER TABLE presupuesto_anual ALTER COLUMN partida SET NOT NULL;

-- Mover unicidad de (ejercicio,dependencia) a (ejercicio,dependencia_id,partida). Guard sobre pg_constraint.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uq_presupuesto_anual') THEN
    ALTER TABLE presupuesto_anual DROP CONSTRAINT uq_presupuesto_anual;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uq_presupuesto_anual_fk_partida') THEN
    ALTER TABLE presupuesto_anual ADD CONSTRAINT uq_presupuesto_anual_fk_partida UNIQUE (ejercicio, dependencia_id, partida);
  END IF;
END $$;
-- NOTA: el ON CONFLICT del controller pasa a (ejercicio, dependencia_id, partida); el texto dependencia se conserva denormalizado. Probar 2-3 veces en local.
```

**Spec:** Smoke local (NO en CI, requiere backend+BD) tras aplicar migracion y montar ruta:
1) POST /api/instruccion-pago/presupuesto (rol finanzas) SIN partida da 400 'La partida ... es obligatoria (art. 24 LOPSRM)'.
2) POST con partida valida + dependenciaId da 201; fila con dependencia_id y partida no nula.
3) Dos contratos de dependencias DISTINTAS con usuarios del mismo nombre (o uno renombrado): GET estimacion/:id de cada uno toma el techo de SU dependencia_id, no se cruzan (lo que el join por texto si cruzaba).
4) generarInstruccion con techo por (ejercicio,dependencia_id,partida): 201 e instruccion_pago.presupuesto_anual_id apunta a la partida correcta; el comprometido suma solo estimaciones de contratos con el mismo dependencia_id.
5) Retrocompat: contratos legacy con dependencia_id NULL (seed OP-2026-DEMO-001) dan sin_presupuesto/409 controlado (no 500). Spec backend con test.skip(!!process.env.CI). Frontend Playwright: boton 'Cargar techo' disabled sin partida.

**Notas:** HALLAZGOS: (1) contratos.dependencia_id YA EXISTE (schema.sql:285, FK a usuarios(id)) y se inserta en el alta (contratos.controller.js:384), no hace falta crearlo. (2) El texto contratos.dependencia es DERIVADO del nombre de la cuenta (contratos.controller.js:362 const dependencia=dep.nombre), por lo que el join por texto del controller HU-20 (instruccion-pago.controller.js lineas 72, 81, 284, 295) es fragil ante renombres; este item lo arregla. (3) presupuesto_anual HOY NO tiene dependencia_id (solo texto + partida nullable, schema.sql:1202-1203); por eso la columna es nueva. (4) El propio controller ya admite (comentario linea 18) que 'join por texto sin FK = deuda tecnica conocida'; este item la salda.
ZONA CONGELADA tocada: schema.sql (presupuesto_anual / contratos.dependencia_id) NO se edita; el cambio de esquema va como migracion en backend/scripts/ y Maiki lo replica. Ningun otro congelado se toca (server.js, auth, permisos.js, App.jsx; estimaciones/contratos controllers solo se leen).
PUNTO ABIERTO PARA MAIKI (no bloquea): multi-partida real por contrato exigiria contratos.partida_id (CONGELADO). Este blueprint NO lo anade: mantiene invariante 1 partida por (ejercicio,dependencia) en Etapa 1 con UNIQUE y columna partida listas para crecer sin migracion destructiva.
LEGAL: art. 24 verificado literal en docs/legal/lopsrm.txt (767-776). El sustento de 'partida especifica' es el parr. 2; el resto (Hacienda, casos excepcionales) no aplica. No se difiere al profe: resuelto por la letra de la ley.

**Veredicto verif:** APROBADO (con 2 observaciones menores, no bloqueantes)

---

## ITEM 3.2 — Convenio con acto de AUTORIZACION explicito del servidor facultado (art. 59 LOPSRM)

**Decision legal:** Hoy `autorizado_por` se llena con `req.user.id` (quien REGISTRA) en el mismo INSERT que crea el convenio (convenios.controller.js:265): no existe un acto formal de autorizacion separado. La ley exige separarlos.

FUNDAMENTO VERIFICADO en docs/legal:
- LOPSRM art. 59, parrafo 3 (lopsrm.txt:3236-3237, reforma DOF 14-11-2025), texto literal: "Los convenios senalados en los parrafos anteriores deberan ser autorizados por la persona servidora publica que se determine en los lineamientos de la dependencia o entidad de que se trate, a que se refiere el articulo 1 Quinquies de esta Ley." -> El convenio NO surte efecto hasta que la persona FACULTADA lo AUTORIZA; acto distinto del registro/captura.
- RLOPSRM art. 99 parrafo 1 (reg.txt:3771-3774): "...debiendo el residente sustentarlo en un dictamen tecnico que funde y motive las causas..." -> el RESIDENTE SUSTENTA (registra el motivo/dictamen).
- RLOPSRM art. 99 parrafo 5 (reg.txt:3786-3789): los convenios "deberan ser suscritos por el servidor publico que haya firmado el contrato, quien lo sustituya o quien este facultado para ello." -> la AUTORIZACION/suscripcion la hace el servidor facultado, NO el residente que lo sustenta.
- RLOPSRM art. 102 parrafo 1 + fr. I-III (reg.txt:3818-3833): cuando la modificacion implique variacion > 25% del monto original o del plazo, debe revisarse indirectos/financiamiento y, en los supuestos fr. I-III, "Sera necesario solicitar de manera justificada la autorizacion de la Secretaria de la Funcion Publica" -> >25% exige soporte documental (oficio) antes de surtir efecto.
- LOPSRM art. 59 Bis (lopsrm.txt:3262): el tope del 50% es ajuste de costos indirectos/financiamiento, no es disparador de autorizacion. Se conserva como flag (requiere_ajuste_costos), no toca el flujo.

DECISION DE FLUJO (resuelta con la ley): dividir el acto unico en DOS fases append-only sobre la MISMA fila inmutable:
1) REGISTRO (estado='registrado'): lo crea residente/dependencia/created_by (autoridad actual de crearConvenio; art. 99 p1: el residente sustenta el dictamen). Captura tipo/motivo/conceptos/celdas/plazo y re-cuadra el programa. La programa_version que crea queda como BORRADOR (vigente=false) para no superseder el programa real antes de autorizar.
2) AUTORIZACION (estado='autorizado'): acto formal del servidor FACULTADO = rol 'dependencia' (art. 59 p3 + art. 99 p5; coincide con permisos.js HU-03 nivel 'E' = dependencia). Llena autorizado_por=JWT del facultado + autorizado_en=NOW(). SOLO al autorizar la version del programa se vuelve vigente y supersede la anterior (el convenio "surte efecto").
GUARDRAIL art. 102: si |delta_monto_pct|>25 o |delta_plazo_pct|>25, la autorizacion exige que el convenio YA tenga su oficio/soporte cargado (EXISTS en contrato_documentos por convenio_id; ya existe subirOficioConvenio) -> 409 si falta. Materializa "exigir oficio/soporte antes de surtir efecto" del item.

NOTA sobre el rol 'facultado': la ley remite a los "lineamientos de la dependencia" (art. 1 Quinquies, lopsrm.txt:156). Como el sistema no modela lineamientos por dependencia, se mapea al rol 'dependencia' (el servidor publico que firma/suscribe el contrato). Es defendible y conservador. El ACTO de autorizacion separado es LEY DURA (art. 59 p3) y se implementa.

**Cita:** verificada — LOPSRM art. 59 p3 (autorizacion por servidor facultado, lineamientos art. 1 Quinquies) + RLOPSRM art. 99 p1 (residente sustenta dictamen) y p5 (suscripcion por servidor facultado) + RLOPSRM art. 102 fr. I-III (>25% requiere autorizacion/soporte SFP). Tope 50% = LOPSRM art. 59 Bis (solo flag de ajuste de costos, no toca el flujo).

**Toca congelado:** true · **Riesgo:** alto · **Endpoint:** POST /api/convenios/:convenioId/autorizar (acto formal de autorizacion; nueva funcion autorizarConvenio en convenios.controller + sub-ruta en convenios.routes, ya montado como /api/convenios en server.js: NO toca server.js)

**Archivos:**
- [CONGELADO] `backend/src/controllers/convenios.controller.js` :: crearConvenio — ANTES (lineas 233-286): inserta el convenio con autorizado_por=req.user.id (quien registra) y, si toca programa, marca la programa_version NUEVA como vigente=true superseding la anterior de inmediato (lineas 284-285) -> registro y autorizacion son el mismo acto, surte efecto al registrar. DESPUES: (1) el INSERT pasa estado='registrado', autorizado_por=NULL, autorizado_en=NULL (la columna autorizado_por NO se llena aqui). (2) El bloque (F) re-cuadre+version se MANTIENE pero la nueva programa_version se inserta con vigente=false (BORRADOR) y NO se ejecuta el UPDATE ... SET vigente=false de la version anterior (linea 284) -> ese supersede se mueve a autorizarConvenio. (3) Respuesta 201 devuelve estado:'registrado' + aviso 'pendiente de autorizacion del servidor facultado (art. 59 LOPSRM)'. (4) La nota O6 de bitacora: RECOMENDADO moverla a autorizarConvenio para que la bitacora refleje el convenio que SURTIO efecto; si se deja aqui, etiquetarla 'registro de convenio'. Este controller lo edita Maiki via DIFF (toca trigger/version, integridad).
- [libre] `backend/src/controllers/convenios.controller.js` :: autorizarConvenio (NUEVA) — Funcion NUEVA en el mismo controller. POST /api/convenios/:convenioId/autorizar. Transaccional (patron de crearConvenio): (1) cargar convenio + contrato FOR UPDATE; 404 si no existe. (2) AUTORIDAD = servidor facultado: req.user.rol==='dependencia' (art. 59 p3 + art. 99 p5; coincide con permisos.js HU-03 'E'); 403 si no. (3) si convenio.estado<>'registrado' -> 409 'ya autorizado'. (4) GUARDRAIL art. 102: si Math.abs(delta_monto_pct)>25 OR Math.abs(delta_plazo_pct)>25, EXISTS(SELECT 1 FROM contrato_documentos WHERE convenio_id=$1) -> si NO hay oficio, 409 'La variacion supera el 25% (art. 102 RLOPSRM): carga el oficio/soporte de aprobacion antes de autorizar'. (5) pg_advisory_xact_lock(2, contratoId) (mismo classid que crearConvenio/guardarMatriz). (6) UPDATE convenios_modificatorios SET estado='autorizado', autorizado_por=$jwt, autorizado_en=NOW() WHERE id=$1 (el trigger permite la transicion NULL->valor). (7) si el convenio tocaba programa (existe programa_version con convenio_id=este y vigente=false): UPDATE programa_version SET vigente=false, supersedido_en=NOW() WHERE contrato_id=$c AND vigente AND id<>$nuevaVer; UPDATE programa_version SET vigente=true WHERE id=$nuevaVer -> AHORA surte efecto. (8) asentar nota O6 en bitacora si se movio aqui. COMMIT. Devolver estado:'autorizado', autorizado_por, autorizado_en.
- [CONGELADO] `backend/src/controllers/convenios.controller.js` :: listarConvenios — El SELECT (lineas 82-88) ya trae cm.* -> expondra estado y autorizado_en automaticamente tras la DDL, ademas de autorizado_por_nombre (NULL mientras 'registrado') y tiene_oficio. Sin cambio estructural obligatorio. El front usa estado para distinguir 'pendiente de autorizacion' de 'autorizado'.
- [libre] `backend/src/routes/convenios.routes.js` :: router (sub-ruta /autorizar) — ANTES: get/post /contrato/:id, get /version/:versionId, post|get /:convenioId/oficio. DESPUES: importar autorizarConvenio y agregar router.post('/:convenioId/autorizar', autorizarConvenio). El router YA esta montado como /api/convenios en server.js, asi que la sub-ruta NO toca server.js (congelado). DIFF para Maiki.
- [libre] `frontend/src/services/api.js` :: api (bloque convenios, lineas 213-247) — DESPUES: agregar autorizarConvenio: (convenioId) => request(`/convenios/${convenioId}/autorizar`, { method: 'POST' }). No congelado.
- [libre] `frontend/src/pages/ConveniosModificatorios.jsx` :: vista de convenios — DESPUES: (1) badge de estado por convenio ('Pendiente de autorizacion' vs 'Autorizado' + autorizado_en + autorizado_por_nombre). (2) si la sesion es rol 'dependencia' (useVistaHU('HU-03').nivel==='E') y el convenio esta 'registrado': boton 'Autorizar convenio' -> api.autorizarConvenio; manejar el 409 del guardrail art.102 mostrando 'Carga el oficio de aprobacion (art. 102 RLOPSRM) antes de autorizar' y enlazar al boton de subir oficio existente. (3) mientras 'registrado', etiquetar la version del programa como BORRADOR (no vigente). Frontend puro.
- [libre] `backend/scripts/migracion_convenio_autorizacion.sql` :: DDL aditiva (NUEVA) — Migracion idempotente del campo ddl. En backend/scripts/, NO en schema.sql. Maiki la integra a schema.sql y la corre en Render.

**Cambio:**

Separar el acto unico actual (registrar==autorizar, autorizado_por=quien registra) en DOS actos append-only sobre la fila inmutable: REGISTRO (estado='registrado', residente/dependencia sustenta el dictamen art. 99 p1; la programa_version nueva queda BORRADOR vigente=false y NO supersede aun) y AUTORIZACION (POST /:convenioId/autorizar, acto del servidor FACULTADO=rol dependencia art. 59 p3 + art. 99 p5, sella autorizado_por+autorizado_en y recien AHI la version surte efecto/supersede). GUARDRAIL art. 102: si la variacion de monto o plazo supera 25%, la autorizacion exige el oficio/soporte ya cargado (409 si falta) -> no surte efecto sin soporte. DDL aditiva idempotente: +columnas estado y autorizado_en (autorizado_por ya existe), backfill de convenios viejos a 'autorizado', y CREATE OR REPLACE del trigger de inmutabilidad para permitir SOLO la transicion controlada registrado->autorizado, congelando todo lo demas. Frontend: badge de estado + boton 'Autorizar' visible solo a rol dependencia sobre convenios 'registrado'.

**DDL:**

```sql
backend/scripts/migracion_convenio_autorizacion.sql (idempotente, NO editar schema.sql):

-- ITEM 3.2 - Acto de AUTORIZACION explicito del convenio (LOPSRM art. 59 p3).
-- DDL ADITIVA E IDEMPOTENTE. Maiki la integra a schema.sql y la aplica en Render
-- con runbook (--single-transaction -v ON_ERROR_STOP=1).

-- 1) Estado del convenio y sello de autorizacion.
ALTER TABLE convenios_modificatorios
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'autorizado'
    CHECK (estado IN ('registrado','autorizado'));
ALTER TABLE convenios_modificatorios
  ADD COLUMN IF NOT EXISTS autorizado_en TIMESTAMPTZ;

-- Backfill: convenios viejos (flujo de 1 acto) ya surtian efecto -> 'autorizado',
-- autorizado_en = created_at (sello derivado).
UPDATE convenios_modificatorios SET autorizado_en = created_at
  WHERE autorizado_en IS NULL AND estado = 'autorizado';

CREATE INDEX IF NOT EXISTS idx_convenios_estado ON convenios_modificatorios(contrato_id, estado);

-- 2) Reemplazar el trigger de inmutabilidad: permite SOLO la transicion controlada
--    registrado->autorizado (autorizado_por NULL->valor, autorizado_en NULL->valor,
--    estado registrado->autorizado). nota_id NULL->valor se mantiene (O6). Todo lo
--    demas congelado. IDEMPOTENTE via CREATE OR REPLACE FUNCTION.
CREATE OR REPLACE FUNCTION sigecop_convenio_inmutable() RETURNS trigger AS $func$
BEGIN
  IF NEW.contrato_id IS DISTINCT FROM OLD.contrato_id
     OR NEW.numero IS DISTINCT FROM OLD.numero
     OR NEW.folio IS DISTINCT FROM OLD.folio
     OR NEW.tipo IS DISTINCT FROM OLD.tipo
     OR NEW.fundamento IS DISTINCT FROM OLD.fundamento
     OR NEW.motivo IS DISTINCT FROM OLD.motivo
     OR NEW.fecha IS DISTINCT FROM OLD.fecha
     OR NEW.monto_anterior IS DISTINCT FROM OLD.monto_anterior
     OR NEW.monto_nuevo IS DISTINCT FROM OLD.monto_nuevo
     OR NEW.plazo_anterior_dias IS DISTINCT FROM OLD.plazo_anterior_dias
     OR NEW.plazo_nuevo_dias IS DISTINCT FROM OLD.plazo_nuevo_dias
     OR NEW.delta_monto_pct IS DISTINCT FROM OLD.delta_monto_pct
     OR NEW.delta_plazo_pct IS DISTINCT FROM OLD.delta_plazo_pct
     OR NEW.requiere_revision_sfp IS DISTINCT FROM OLD.requiere_revision_sfp
     OR NEW.requiere_ajuste_costos IS DISTINCT FROM OLD.requiere_ajuste_costos
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Un convenio modificatorio registrado es inalterable (art. 59 LOPSRM / art. 99 RLOPSRM)';
  END IF;
  IF OLD.nota_id IS NOT NULL AND NEW.nota_id IS DISTINCT FROM OLD.nota_id THEN
    RAISE EXCEPTION 'El convenio ya tiene su nota de bitacora ligada; el vinculo es inmutable';
  END IF;
  IF OLD.estado = 'autorizado' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    RAISE EXCEPTION 'El convenio ya esta autorizado y surtio efecto; es inalterable';
  END IF;
  IF OLD.estado = 'registrado' AND NEW.estado NOT IN ('registrado','autorizado') THEN
    RAISE EXCEPTION 'Transicion de estado de convenio invalida';
  END IF;
  IF OLD.autorizado_por IS NOT NULL AND NEW.autorizado_por IS DISTINCT FROM OLD.autorizado_por THEN
    RAISE EXCEPTION 'El autorizador del convenio es inmutable';
  END IF;
  IF OLD.autorizado_en IS NOT NULL AND NEW.autorizado_en IS DISTINCT FROM OLD.autorizado_en THEN
    RAISE EXCEPTION 'El sello de autorizacion del convenio es inmutable';
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;
-- (el trigger trg_convenio_inmutable ya apunta a esta funcion; no se recrea)

NOTA: autorizado_por YA existe (schema.sql:1360); solo se levanta su congelamiento absoluto para permitir NULL->valor. Probar 2-3x en local antes de Render.
```

**Spec:** Smoke local (Playwright con sesion real inyectada, test.skip(!!process.env.CI)) sobre el stack docker: (1) registrar convenio como RESIDENTE -> estado='registrado', autorizado_por NULL, programa_version nueva vigente=false (BORRADOR), monto/programa AUN no superseded. (2) POST /autorizar como residente/contratista -> 403. (3) autorizar como DEPENDENCIA con variacion <=25% sin oficio -> 200, estado='autorizado', autorizado_en sellado, version pasa a vigente=true y supersede la anterior. (4) registrar convenio con variacion de monto >25% e intentar autorizar SIN oficio -> 409 (art. 102); subir oficio (subirOficioConvenio) y reintentar -> 200. (5) re-autorizar un convenio ya 'autorizado' -> 409. (6) trigger directo en psql: UPDATE de monto_nuevo/motivo -> EXCEPTION (identidad inmutable); UPDATE estado autorizado->registrado -> EXCEPTION. (7) backfill: convenio viejo (pre-migracion) queda estado='autorizado' con autorizado_en=created_at.

**Notas:** RIESGO ALTO por tres acoplamientos: (a) toca el trigger sigecop_convenio_inmutable (integridad/zona congelada) -> CREATE OR REPLACE idempotente, probar 2-3x antes de Render con backup. (b) Cambia la semantica del re-cuadre del programa: hoy crearConvenio supersede la version al registrar; con el flujo de 2 actos la version nueva queda BORRADOR (vigente=false) hasta autorizar -> verificar que HU-12 (estimaciones) y HU-06 (avance) sigan leyendo la version VIGENTE correcta mientras un convenio esta 'registrado' (no deben ver el borrador). Si E3 asume que registrar = vigente, coordinar con Maiki. (c) DECISION menor [validar profe]: si el mismo servidor 'dependencia' puede registrar Y autorizar (separacion de funciones) -> por defecto SI se permite; la ley no lo prohibe (art. 99 p5: 'quien haya firmado el contrato... o quien este facultado'). El backfill asume que todos los convenios existentes ya surtieron efecto (correcto: el flujo viejo los hacia vigentes al registrar). El rol 'facultado'='dependencia' es el mapeo conservador a 'lineamientos art. 1 Quinquies' (no hay modelo de lineamientos por dependencia). server.js NO se toca (router /api/convenios ya montado; solo se agrega la sub-ruta /autorizar en convenios.routes).

**Veredicto verif:** APROBADO CON RESERVA: el acto de autorizacion separado esta bien fundado y es implementable, pero la afirmacion central de flujo ('surte efecto solo al autorizar') NO se cumple por causa raiz no resuelta.

---

## ITEM 3.3 — Avance fisico (concepto_avance / HU-06): pasar de editable (PATCH/DELETE) a append-only con correccion vinculada

**Decision legal:** DECISION: APPEND-ONLY. El registro de avance fisico debe ser append-only; corregir = registro NUEVO vinculado al original (no editar ni borrar la entrada). Fundamento verificado en docs/legal/reg.txt (RLOPSRM, art. 123, lineas 4521+):

1) Art. 123 fr. VI (texto literal confirmado): "Se prohibira la modificacion de las notas ya firmadas, inclusive para el responsable de la anotacion original". Cada avance >0 genera y se LIGA (nota_id) a una nota de bitacora tipo 'avance' (trabajos.controller.js: registrarAvance, insertarNotaAtomica). Esa nota es inmutable por el trigger sigecop_nota_inmutable (schema.sql L451-478, "Una nota de bitacora es inalterable (art. 123 fr. VI RLOPSRM)"). Pero HOY el PATCH (actualizarAvance) cambia concepto_avance.cantidad SIN regenerar ni anular la nota ligada -> queda una nota que dice una cantidad y un dato de avance que dice otra. El propio controller lo admite en su comentario (L326-327): "la nota original queda como el asiento del registro inicial (editar la cantidad no la regenera - limitacion documentada)". Eso CONTRADICE fr. VI: el respaldo formal del avance (la nota firmada/aceptada) ya no concuerda con el dato. El DELETE (eliminarAvance) es peor: borra el dato pero deja la nota huerfana (nota_id ON DELETE NO ACTION) -> hecho asentado en bitacora sin sustento.

2) Art. 123 fr. VII (texto literal confirmado): "Cuando se cometa algun error... la nota debera anularse por quien la emita, senalando enseguida... que esta ha quedado anulada y debiendo abrir... otra nota con el numero consecutivo que le corresponda y con la descripcion correcta". Es decir, la ley YA define el mecanismo de correccion: anular + nota nueva consecutiva, NUNCA sobrescribir.

3) Art. 123 fr. VIII (texto literal confirmado): "No se debera sobreponer ni anadir texto alguno a las notas de Bitacora... de ser necesario adicionar un texto, se debera abrir otra nota haciendo referencia a la de origen". Refuerza: corregir = registro nuevo que referencia al de origen.

PATRON DEL PROYECTO (consistente con la ley): el proyecto YA implementa exactamente esto para las notas (bitacora.controller.js: anularNota L749-803 -> UPDATE estado='anulada' + insertarNotaAtomica correctiva con vinculada_a) y declara append-only para pagos, estimaciones, generadores, endosos y roster (schema.sql, triggers sigecop_*_inmutable). El propio schema de concepto_avance (L1017-1018) anticipa la decision: "NO append-only (la HU-06 define su flujo de captura/correccion; CANDIDATO A TRIGGER APPEND-ONLY en su fase de logica)". Esta es esa fase.

CONCLUSION: la entrada de avance es el dato que sustenta la nota de bitacora inmutable (fr. VI) y alimenta la curva ejecutada (HU-05) y el art. 118 (tope contratado). Editarla/borrarla rompe la cadena nota<->dato que la ley exige inmutable. SE RECOMIENDA append-only: corregir = registro de correccion NUEVO vinculado al original, con su PROPIA nota de bitacora consecutiva (espejo de anularNota). NO hay articulo que respalde editar/borrar un avance asentado.

**Cita:** verificada — RLOPSRM art. 123 fr. VI, VII y VIII (verificadas literal en docs/legal/reg.txt L4521-4570). Tope contratado: art. 118 RLOPSRM (L4462). Datos minimos de la nota: art. 123 fr. II.

**Toca congelado:** false · **Riesgo:** medio · **Endpoint:** POST /api/trabajos/:id/corregir (corregirAvance) — reemplaza a PATCH /api/trabajos/:id y DELETE /api/trabajos/:id, que se ELIMINAN. requireRole('contratista'); acotado por esParteOSupervision.

**Archivos:**
- [libre] `backend/src/controllers/trabajos.controller.js` :: actualizarAvance, eliminarAvance, registrarAvance, corregirAvance (nueva) — NO congelado (controller de dominio Equipo 2). CAMBIO NUCLEAR. (a) Eliminar actualizarAvance (PATCH) y eliminarAvance (DELETE) -> reemplazar por una unica funcion corregirAvance (POST /:id/corregir) que es el espejo de bitacora.controller.anularNota: en una sola tx (BEGIN) -> FOR UPDATE de la fila original + FOR UPDATE de contrato_conceptos (cierre art.118, mismo patron actual L239/L350); valida esParteOSupervision; marca la entrada original como anulada (UPDATE concepto_avance SET estado='anulada', anulada_por=req.user.id, anulada_en=NOW() WHERE id=$1 AND estado='vigente' -> permitido por el nuevo trigger); inserta una entrada NUEVA con la cantidad corregida, mismo contrato_concepto_id y contrato_periodo_id, reemplaza_a=idOriginal, registrado_por=req.user.id (JWT); revalida art.118 sobre el acumulado EXCLUYENDO las entradas anuladas (ver acumuladoEjecutado); genera y LIGA su propia nota de bitacora tipo 'avance' consecutiva (insertarNotaAtomica, texto 'Correccion de avance #N: dice X, debe decir Y', vinculada/diferida igual que el POST); COMMIT. (b) acumuladoEjecutado (L64-72): anadir 'AND estado = \'vigente\'' para que las entradas anuladas NO cuenten en el tope art.118 ni en la curva. (c) validarProgramaPeriodo (subconsulta de ejecutado L104-111): anadir 'AND ca.estado = \'vigente\''. (d) trabajosDeContrato (lectura, L146-194): exponer estado/reemplaza_a/anulada_en por entrada (el historial completo es visible, vigentes+anuladas, como las notas anuladas se ven en la bitacora); el acumulado_ejecutado del bloque conceptos (L149-150) tambien filtra estado='vigente'.
- [libre] `backend/src/routes/trabajos.routes.js` :: router.patch('/:id'), router.delete('/:id'), router.post('/:id/corregir') (nueva) — NO congelado (router de dominio, lo monta Maiki). ANTES: router.patch('/:id', requireRole('contratista'), actualizarAvance); router.delete('/:id', requireRole('contratista'), eliminarAvance). DESPUES: borrar ambas lineas y dejar solo router.post('/:id/corregir', requireRole('contratista'), corregirAvance). El GET y el POST '/' quedan igual.
- [libre] `backend/scripts/avance_append_only.sql` :: (migracion idempotente nueva) — DDL aditiva e idempotente (NO se edita schema.sql, que esta congelado). 1) ALTER TABLE concepto_avance ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente','anulada')); 2) ADD COLUMN IF NOT EXISTS reemplaza_a INTEGER REFERENCES concepto_avance(id) ON DELETE NO ACTION; 3) ADD COLUMN IF NOT EXISTS anulada_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL; 4) ADD COLUMN IF NOT EXISTS anulada_en TIMESTAMPTZ; 5) CREATE INDEX IF NOT EXISTS idx_concepto_avance_reemplaza ON concepto_avance(reemplaza_a); 6) trigger de inmutabilidad espejo de sigecop_nota_inmutable (CREATE OR REPLACE FUNCTION sigecop_avance_inmutable... BEFORE UPDATE: bloquea cualquier cambio salvo la transicion estado 'vigente'->'anulada' (con anulada_por/anulada_en); RAISE EXCEPTION 'Un avance fisico registrado es append-only (art. 123 fr. VI RLOPSRM); corregir = registro nuevo vinculado'); DROP TRIGGER IF EXISTS + CREATE TRIGGER. Guards con information_schema/pg_constraint si aplica. Probar 2-3x en local. Datos existentes: el DEFAULT 'vigente' los marca correctamente, sin backfill.
- [libre] `frontend/src/pages/TrabajosTerminados.jsx` :: abrirEdicion, guardarEdicion, eliminar, render de acciones (L511-516) — NO congelado. Reemplazar los botones 'Editar' (btn-editar) y 'Eliminar' (btn-eliminar, L513-514) por un solo boton 'Corregir' que abre un formulario 'dice / debe decir' (cantidad actual -> cantidad corregida + observaciones) y llama al nuevo api.corregirAvance(id, payload). Las entradas con estado='anulada' se muestran tachadas/atenuadas con su vinculo a la correctiva (espejo de como la bitacora muestra notas anuladas). El comentario L18 'captura EDITABLE (PATCH/DELETE): no append-only' se reescribe a 'append-only: corregir = registro nuevo vinculado (art.123 fr.VI/VII)'.
- [libre] `frontend/src/services/api.js` :: actualizarAvance, eliminarAvance (L193-194), corregirAvance (nueva) — NO congelado. Borrar actualizarAvance y eliminarAvance; anadir corregirAvance: (id, payload) => request(`/trabajos/${id}/corregir`, { method: 'POST', body: JSON.stringify(payload) }). registrarAvance y trabajosDeContrato quedan igual.
- [CONGELADO] `backend/src/controllers/bitacora.controller.js` :: anularNota, insertarNotaAtomica — NO se edita: es el PATRON A REPLICAR (modelo verificado de annul-and-replace por art.123 fr.VII, L749-803). corregirAvance reusa insertarNotaAtomica (ya exportada e importada en trabajos.controller L27). Solo referencia.

**Cambio:**

ANTES: concepto_avance es editable y borrable. trabajos.controller expone PATCH /:id (actualizarAvance: UPDATE cantidad/observaciones, NO regenera la nota ligada -> nota dice X, dato dice Y) y DELETE /:id (eliminarAvance: DELETE de la fila, deja la nota huerfana). El propio codigo admite la limitacion (L326-327) y el schema la deja pendiente (L1017-1018 'candidato a trigger append-only').

DESPUES: concepto_avance es append-only. Se elimina PATCH y DELETE; se anade POST /:id/corregir (corregirAvance), espejo exacto de bitacora.controller.anularNota: en una tx -> marca la entrada original estado='vigente'->'anulada' (anulada_por/anulada_en del JWT), inserta una entrada NUEVA con la cantidad corregida (reemplaza_a=original, mismo periodo/concepto), revalida art.118 contando solo vigentes, y genera+liga su PROPIA nota de bitacora consecutiva ('dice/debe decir'). Un trigger sigecop_avance_inmutable (migracion aditiva) blinda la regla a nivel BD: solo permite la transicion vigente->anulada, ninguna otra mutacion. acumuladoEjecutado y validarProgramaPeriodo filtran estado='vigente' para que las anuladas no cuenten en el tope art.118 ni en la curva HU-05. El front cambia 'Editar/Eliminar' por 'Corregir' (formulario dice/debe decir) y muestra las anuladas con su vinculo. Asi la cadena dato<->nota inmutable (art.123 fr.VI) queda integra y la correccion sigue el mecanismo legal (fr.VII/VIII): anular + registro nuevo consecutivo vinculado, nunca sobrescribir.

**DDL:**

```sql
backend/scripts/avance_append_only.sql (idempotente): ALTER TABLE concepto_avance ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente','anulada')); ADD COLUMN IF NOT EXISTS reemplaza_a INTEGER REFERENCES concepto_avance(id) ON DELETE NO ACTION; ADD COLUMN IF NOT EXISTS anulada_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL; ADD COLUMN IF NOT EXISTS anulada_en TIMESTAMPTZ; CREATE INDEX IF NOT EXISTS idx_concepto_avance_reemplaza ON concepto_avance(reemplaza_a); + CREATE OR REPLACE FUNCTION sigecop_avance_inmutable() (BEFORE UPDATE: solo permite estado vigente->anulada; RAISE EXCEPTION en cualquier otra mutacion, mensaje cita art.123 fr.VI RLOPSRM) + DROP TRIGGER IF EXISTS trg_concepto_avance_inmutable ON concepto_avance; CREATE TRIGGER ... BEFORE UPDATE ... EXECUTE FUNCTION sigecop_avance_inmutable(). Espejo de sigecop_nota_inmutable (schema.sql L451-478).
```

**Spec:** backend smoke/spec nuevo: (1) POST /trabajos crea avance vigente con su nota; (2) PATCH y DELETE a /trabajos/:id devuelven 404 (rutas eliminadas); (3) POST /trabajos/:id/corregir marca el original 'anulada', crea entrada nueva con reemplaza_a y una nota de bitacora consecutiva 'dice/debe decir'; (4) el acumulado art.118 cuenta SOLO vigentes (corregir 100->80 baja el acumulado a 80, no 180); (5) corregir excediendo lo contratado -> 409 art.118; (6) UPDATE directo en BD a una fila vigente (cambiar cantidad sin pasar por anulacion) -> el trigger sigecop_avance_inmutable lanza excepcion. Frontend spec (TrabajosTerminados): boton 'Corregir' presente, 'Editar'/'Eliminar' ausentes; entrada anulada se muestra tachada con vinculo a la correctiva. Specs que requieran backend: test.skip(!!process.env.CI, 'requiere backend').

**Notas:** No toca zona congelada: trabajos.controller.js y trabajos.routes.js son del Equipo 2 (no estan en la lista congelada); la DDL va en backend/scripts/ (no se edita schema.sql, que SI esta congelado). El unico archivo congelado referenciado (bitacora.controller.js) NO se edita: solo se reusa insertarNotaAtomica (ya importada en trabajos.controller L27) y se replica el patron de anularNota. RIESGO MEDIO por: (a) es cambio de contrato de API (rompe a cualquier consumidor de PATCH/DELETE -> el unico es el front, ya cubierto); (b) la migracion toca una tabla con datos (mitigado: DEFAULT 'vigente' los deja correctos, sin backfill, idempotente, probar 2-3x local antes de Render). Despues de implementar: actualizar ESTADO_ACTUAL.md (L308/L464/L571 mencionan HU-06/concepto_avance: documentar que pasa a append-only) y revisar la historia HU-06 (el criterio 'captura editable' ya no concuerda -> actualizarlo a 'correccion = registro nuevo vinculado, art.123 fr.VII'). PUNTO ABIERTO MENOR (resoluble por ley, no bloquea): quien EMITE la nota de correccion — hoy el avance lo registra el contratista (art.123 fr.II/III, responsable de registros); la correctiva mantiene el mismo emisor (req.user.id), consistente con anularNota ('solo el emisor anula su nota'). El art.123 fr.VII dice 'la nota debera anularse POR QUIEN LA EMITA' -> el contratista corrige su propio avance; coherente.

**Veredicto verif:** APROBADO

---

## ITEM 3.4 — Dependencia NO sustituible — explícito en UI + hardening defensivo (art. 125 RLOPSRM)

**Decision legal:** RESUELTA con base en texto literal (NO validar_profe). Art. 125 fr. I inciso g) RLOPSRM (docs/legal/reg.txt línea 4620, encabezado; inciso g) en líneas 4636-4637) dice textualmente que al residente le corresponde registrar en la Bitácora: "La sustitución del superintendente, del anterior residente y de la supervisión". El precepto ENUMERA EXACTAMENTE TRES sujetos sustituibles — superintendente, (anterior) residente y supervisión — y NO incluye a la dependencia contratante. Concuerda con contratos.controller.js:395 (congelado): "dependencia NO entra al roster (no firma la bitácora; art. 123 RLOPSRM)". CONCLUSIÓN LEGAL: la dependencia contratante (cuenta rol 'dependencia', cacheada en contratos.dependencia_id) NO es sujeto de sustitución del roster; el catálogo de roles sustituibles es cerrado a {residente, superintendente, supervision}.

**Cita:** verificada — RLOPSRM art. 125 fr. I inciso g): "La sustitución del superintendente, del anterior residente y de la supervisión" (docs/legal/reg.txt, encabezado del art. 125 en línea 4620; inciso g) en líneas 4636-4637). Enumeración cerrada de tres sujetos sustituibles; la dependencia contratante NO está incluida. Concordante con art. 123 RLOPSRM (la dependencia no firma la bitácora) referenciado en contratos.controller.js:395.

**Toca congelado:** false · **Riesgo:** bajo · **Endpoint:** ninguno

**Archivos:**
- [libre] `frontend/src/pages/RosterContrato.jsx` :: RosterContrato (componente) — ROLES/ROL_LABEL (L13-18), subtítulo (L109-113), bloque roster-vigente (~L143-183), formulario sust-rol (L189-192) — CAMBIO A (núcleo del item): hacer EXPLÍCITO que la dependencia no es sustituible. (1) Añadir bloque informativo de solo-lectura 'roster-dependencia-fija' que muestre la Dependencia contratante del contrato seleccionado (texto c.dependencia ya disponible en estado `contratos` vía api.listarContratos) con badge 'No sustituible (art. 125 RLOPSRM)'. (2) Aclaración breve junto al selector sust-rol y/o en el subtítulo: 'La dependencia contratante no se sustituye por esta vía (art. 125 fr. I g RLOPSRM); el roster aplica solo a residente, superintendente y supervisión'. NO añadir 'dependencia' a ROLES/ROL_LABEL (mantener catálogo cerrado a 3). Sin DDL, sin tocar api.js.
- [libre] `backend/src/controllers/roster.controller.js` :: sustituirPersona() — whitelists ROLES_ROSTER/COL_CACHE/ROL_CUENTA (L22-28), guard de rol (L92), UPDATE contratos (L212) — CAMBIO B (hardening OPCIONAL; archivo NUEVO de Fundación, NO en zona congelada). El blindaje YA existe: L92 rechaza con 400 cualquier rol fuera de {residente,superintendente,supervision} ANTES de escribir, y L212 usa COL_CACHE[rol] (whitelist sin 'dependencia_id') como única escritura a contratos → dependencia_id es inmutable por este endpoint hoy. Opcional: (B1) comentario-invariante junto a COL_CACHE documentando 'dependencia_id NUNCA es caché del roster — no agregar dependencia a estas whitelists'; (B2) aserción redundante hasOwnProperty(COL_CACHE,rol) antes del UPDATE L212. Cero cambio del camino feliz.
- [libre] `frontend/e2e/roster-sustitucion.spec.js` :: describe BLOQUE 3b — junto al test 'ID inexistente 400' (L105-112) — CAMBIO C: añadir test de regresión 'dependencia NO sustituible → 400': POST sustituir con rol:'dependencia' → expect 400; opcional assert dependencia_id sin cambios. test.skip(!!process.env.CI). Reutiliza helper crearContratoB1. NO modificar tests existentes.
- [CONGELADO] `backend/src/controllers/contratos.controller.js` :: crearContrato() — INSERT contratos (L373-395) y comentario L395 — SOLO LECTURA (CONGELADO). Confirma el fundamento: dependencia_id se escribe ÚNICAMENTE en el alta (L384) y el comentario L395 dice 'dependencia NO entra al roster (no firma la bitácora; art. 123 RLOPSRM)'. No hay otro write-path a dependencia_id. No se modifica.

**Cambio:**

DIAGNÓSTICO: el backend YA está blindado estructuralmente (no falta el guard de datos). El item se reduce a (A) hacerlo EXPLÍCITO en la UI y (B) endurecimiento defensivo + test de regresión. NINGÚN cambio toca lógica de cálculo ni el caché de dependencia_id (que solo se escribe en el alta).

== POR QUÉ EL BACKEND YA ESTÁ BLINDADO (evidencia) ==
roster.controller.js define tres whitelists fijas (no user input): ROLES_ROSTER=['residente','superintendente','supervision'] (L22), ROL_CUENTA (L26) y COL_CACHE={residente:'residente_id',superintendente:'superintendente_id',supervision:'supervision_id'} (L28). 'dependencia'/'dependencia_id' NO aparecen en ninguna. En sustituirPersona():
  - L92: `if (!ROLES_ROSTER.includes(rol)) return res.status(400)...` → un body con rol:'dependencia' se rechaza ANTES de cualquier escritura (400, mensaje "rol inválido (residente | superintendente | supervision)").
  - L212: la ÚNICA escritura a contratos es `UPDATE contratos SET ${COL_CACHE[rol]} = $1 ...`. COL_CACHE[rol] solo puede resolver a residente_id/superintendente_id/supervision_id; jamás a dependencia_id (whitelist cerrada, comentada L211 "COL_CACHE es whitelist fija, sin inyección").
  Por tanto dependencia_id es INMUTABLE por este endpoint hoy. El guard existe por construcción.

== CAMBIO A (UI explícita) — frontend/src/pages/RosterContrato.jsx ==
Objetivo: que la pantalla DIGA que la dependencia no se sustituye (hoy simplemente no la lista, lo cual es correcto pero implícito).
A1. Constante ROLES (L18) y ROL_LABEL (L13-17): NO añadir 'dependencia' (mantener cerrado a 3). Antes->después: sin cambio de datos, solo se documenta.
A2. Añadir una tarjeta informativa de solo-lectura en el panel "roster-vigente" (después del map de ROLES, ~L182) o en el panel del formulario, que muestre la Dependencia contratante VIGENTE (de data.vigente no viene; usar el dato del contrato/listado) con un badge "No sustituible (art. 125 RLOPSRM)". Como leerRoster NO devuelve la dependencia, la fuente más simple sin tocar backend es el objeto del contrato seleccionado en `contratos` (api.listarContratos) que ya está en estado; mostrar c.dependencia (texto) del contrato elegido.
   Antes: la dependencia no aparece en la pantalla del roster.
   Después: bloque data-testid="roster-dependencia-fija" con texto: "Dependencia contratante: {dependencia} — Parte contratante; no es sustituible. La sustitución del roster aplica solo a residente, superintendente y supervisión (art. 125 fr. I inciso g RLOPSRM)."
A3. En el subtítulo (<p> L109-113) o junto al selector de rol del formulario (sust-rol, L189-192), añadir una aclaración breve: "La dependencia contratante no se sustituye por esta vía (art. 125 RLOPSRM)." Esto refuerza por qué el <select> de rol solo ofrece 3 opciones.
   Sin DDL, sin tocar api.js (rosterContrato/sustituirPersona ya existen, L171-172).

== CAMBIO B (hardening defensivo, archivo NO congelado) — roster.controller.js ==
roster.controller.js NO está en la lista de zona congelada (la lista congela contratos/estimaciones/usuarios/bitacora controllers, pero roster.controller es archivo NUEVO de Fundación). Cambios de defensa en profundidad, cero alteración de comportamiento existente:
B1. Reforzar el comentario/aserción de invariante junto a COL_CACHE (L27-28): documentar explícitamente "dependencia_id NUNCA es columna de caché del roster (art. 125 RLOPSRM no la lista). No agregar 'dependencia' a estas whitelists." 
B2. (Opcional, defensa redundante) Aserción dura antes del UPDATE (L212): `if (!Object.prototype.hasOwnProperty.call(COL_CACHE, rol)) { await client.query('ROLLBACK'); return res.status(400)...; }`. Es redundante con L92 pero blinda contra futuras reordenaciones del flujo. Antes->después: añade una línea guard sin cambiar el camino feliz.
   NOTA: si Maiki prefiere no tocar roster.controller, el CAMBIO B es OPCIONAL — el blindaje ya existe por L92+L28. El CAMBIO A (UI) es el núcleo del item.

== CAMBIO C (test de regresión) — frontend/e2e/roster-sustitucion.spec.js ==
Añadir, junto al test existente "el backend sigue rechazando un ID inexistente (400)" (L105-112), un test gemelo que fije el contrato legal: POST /roster/contrato/:id/sustituir con body { rol:'dependencia', nuevoUsuarioId:<cuenta válida>, motivo:'x' } DEBE devolver 400 y NO alterar contratos.dependencia_id. 
   Esqueleto: reutiliza crearContratoB1(request); hace el POST con rol:'dependencia'; expect(r.status()).toBe(400); (opcional) re-lee el contrato y verifica que la dependencia siguió igual. Marcar test.skip(!!process.env.CI,'requiere backend') por convención del repo.

**Spec:** frontend/e2e/roster-sustitucion.spec.js — AÑADIR un test (gemelo del de L105-112 "ID inexistente 400") dentro del describe de BLOQUE 3b: 'la dependencia NO es sustituible por el roster (art. 125 RLOPSRM) → 400'. POST /roster/contrato/:id/sustituir con { rol:'dependencia', nuevoUsuarioId:<id válido>, motivo:'intento dependencia' } → expect 400; opcional: GET del contrato y assert que dependencia_id no cambió. test.skip(!!process.env.CI,'requiere backend'). NO modificar specs existentes.

**Notas:** Estado real: el guard de DATOS ya existe (no falta). La sustitución no puede tocar dependencia_id porque (a) 'dependencia' no está en ROLES_ROSTER → 400 en L92 antes de escribir, y (b) la única escritura a contratos (L212) usa COL_CACHE que solo mapea a residente_id/superintendente_id/supervision_id. dependencia_id se setea solo en el alta (contratos.controller, congelado). Por eso el item es: (A) UI explícita 'no sustituible' — el verdadero entregable —, (B) hardening defensivo opcional en roster.controller (archivo NUEVO de Fundación, NO congelado), y (C) test de regresión que fije el 400. Riesgo bajo: A es presentación pura; B/C no alteran el camino feliz. Decisión legal cerrada sin profe (texto literal del art. 125 fr. I g verificado en docs/legal/reg.txt:4620,4636-4637). Único toque a archivo congelado = lectura de contratos.controller para evidencia (no se edita).

**Veredicto verif:** APROBADO con correccion menor de cita

---

## ITEM 3.5 — Re-seed de cuentas ligadas a empresas (modelo 1 EMPRESA : N CUENTAS) para probar el acotamiento por empresa

**Decision legal:** El seed se apoya en art. 43 RLOPSRM (verificado en docs/legal/reg.txt, lineas 1444-1462): "El registro unico de contratistas senalado en el articulo 74 Bis de la Ley... se integrara con la informacion que proporcionen los contratistas... Los contratistas solicitaran su inscripcion en el registro unico de contratistas a las dependencias y entidades, las cuales, previa validacion de la informacion presentada por el contratista... llevaran a cabo la inscripcion correspondiente." Esto fundamenta el modelo de catalogo/padron de empresas (tabla empresas con tipo dependencia/contratista/supervision y estado por_validar/validada) y el acotamiento: cada dependencia gestiona sus propias contrataciones. DECISION: el script de seed crea empresas YA 'validada' (son fixtures de prueba pre-aprobados, equivalente a "previa validacion" del art. 43; el flujo de auto-registro real las nace 'por_validar', pero un seed de demostracion las da por inscritas). Las cuentas demo se vinculan a su empresa via usuarios.empresa_id, igual que el backfill que ya hace schema.sql. Es seed de PRUEBA: no altera runtime ni reglas legales, solo materializa datos.

**Cita:** verificada — art. 43 RLOPSRM (registro unico de contratistas / padron; verificado en docs/legal/reg.txt lineas 1444-1462). Marco del catalogo de empresas; el seed solo materializa datos de prueba.

**Toca congelado:** false · **Riesgo:** bajo · **Endpoint:** ninguno

**Archivos:**
- [libre] `backend/scripts/reseed_cuentas.sql` :: DO $$ blocks + INSERT...SELECT WHERE NOT EXISTS + INSERT...ON CONFLICT(email) DO NOTHING + UPDATE...WHERE empresa_id IS NULL — ARCHIVO NUEVO. Script SQL idempotente que (1) asegura las 3 empresas demo existentes con su tipo correcto; (2) siembra 2-3 empresas mas (1 dependencia 'Dependencia Sur Demo' + 1-2 constructoras + 1 supervision adicionales); (3) crea/asegura por INSERT...ON CONFLICT(email) DO NOTHING N cuentas por empresa (varias personas de la misma constructora/dependencia/supervision); (4) backfillea usuarios.empresa_id por forma normalizada. Reusa el hash bcrypt de 'Sigecop2026!' ($2a$10$n4rhCkjJeeKM0GPpL8lUbenEoUFhckkQRHnui1SYG6z6/PbM.7qBy) ya presente en schema.sql para que las cuentas nuevas logueen con la misma contrasena. NO toca schema.sql.
- [libre] `backend/scripts/reseed_cuentas.js` :: main() — ARCHIVO NUEVO. Wrapper Node identico en patron a seed_demo.js: lee reseed_cuentas.sql, lo ejecuta con pool.query(sql) (transaccion implicita multi-statement: si algo falla revierte), imprime resumen, cierra el pool.
- [libre] `backend/package.json` :: scripts — AGREGAR script npm 'reseed:cuentas': 'node scripts/reseed_cuentas.js' al bloque scripts (junto a seed:demo/reset:demo/consolidar:empresas). Config no congelada; cambio de 1 linea aditiva. DIFF: anadir la linea "reseed:cuentas": "node scripts/reseed_cuentas.js", tras la de seed:demo.
- [CONGELADO] `backend/src/db/schema.sql` :: tabla empresas + usuarios.empresa_id + seed demo — SOLO LECTURA (congelado, referencia). Provee: tabla empresas (id, nombre, creado_en, tipo DEFAULT 'contratista', estado DEFAULT 'validada'; CHECKs tipo IN dependencia/contratista/supervision, estado IN por_validar/validada; uq_empresas_nombre_norm = lower(btrim(regexp_replace(nombre,'\\s+',' ','g')))); usuarios.empresa_id INTEGER REFERENCES empresas(id); patron del seed demo de empresas (1537-1577) y de usuarios (679-695). El script NUEVO copia EXACTAMENTE esos patrones de normalizacion e idempotencia.
- [CONGELADO] `backend/src/lib/acceso.js` :: esParteOSupervision — SOLO LECTURA (congelado, referencia). Define el acotamiento que el seed debe hacer testeable: operativos (residente/contratista/supervision) acotados por PARTICIPACION; finanzas ve todo; DEPENDENCIA acotada solo si la fila trae dependencia_empresa_id y el JWT trae empresa_id -> compara contrato.dependencia_empresa_id === usuario.empresa_id. Implicacion: para probar A-no-ve-B en dependencia hacen falta >=2 cuentas dependencia con empresa_id DISTINTO + contratos cuyo dependencia_id apunte a cada una.
- [CONGELADO] `backend/src/controllers/contratos.controller.js` :: listarContratos — SOLO LECTURA (congelado, referencia). listarContratos (linea ~519) deriva dependencia_empresa_id = du.empresa_id (empresa de la cuenta dependencia_id del contrato) y post-filtra con esParteOSupervision. Confirma que el acotamiento dependencia se evalua sobre la EMPRESA del dependencia_id del contrato -> el seed debe poblar contratos.dependencia_id con la cuenta dependencia correcta de cada empresa.
- [CONGELADO] `backend/src/controllers/auth.controller.js` :: login — SOLO LECTURA (congelado, referencia). login firma empresa_id en el JWT (linea 59); register resuelve-o-crea empresa y guarda empresa_id en el SELECT (nunca en token). Confirma que basta con poblar usuarios.empresa_id en BD para que el acotamiento se active al loguear (el JWT lo recoge solo).
- [libre] `backend/scripts/seed_demo.sql` :: seed de empresas/usuarios/contratos demo — SOLO LECTURA (referencia, no congelado). Patron de seed idempotente a imitar: bloques DO $$, RAISE EXCEPTION si faltan cuentas, idempotencia por borrado-en-orden / WHERE NOT EXISTS. reseed_cuentas.sql se ejecuta ANTES de seed_demo.sql (primero cuentas+empresas, luego contratos que las referencian).

**Cambio:**

ANTES: el unico seed de cuentas-empresa vive en schema.sql (lineas 1555-1577): 3 empresas (Dependencia Demo, Constructora Demo, Supervision Externa Demo) y 6 cuentas demo, en relacion 1 empresa : 1 cuenta (cada cuenta operativa va a una empresa distinta; solo residente/dependencia/finanzas/profe comparten Dependencia Demo). Con eso NO se puede demostrar el acotamiento por empresa: hay UNA sola dependencia (todas las cuentas dependencia ven los mismos contratos) y UNA constructora con una sola persona.\n\nDESPUES: nuevo backend/scripts/reseed_cuentas.{sql,js} (+ npm run reseed:cuentas) que materializa 1 EMPRESA : N CUENTAS sin tocar schema.sql:\n\n(0) PRECONDICION/IDEMPOTENCIA: el .sql empieza con DO $$ que verifica que existe la tabla empresas y la columna usuarios.empresa_id (RAISE EXCEPTION 'aplica schema.sql primero' si no). Todo es re-ejecutable: empresas via INSERT...SELECT WHERE NOT EXISTS sobre forma normalizada (copia de schema.sql:1555-1565); usuarios via INSERT...ON CONFLICT(email) DO NOTHING; vinculacion via UPDATE ... WHERE empresa_id IS NULL (no pisa cambios manuales). Sin DROP/DELETE de datos reales.\n\n(1) ASEGURA las 3 empresas demo y tipos (mismo backfill que schema.sql:1713-1714: Dependencia Demo->dependencia, Supervision Externa Demo->supervision, Constructora Demo->contratista). estado='validada'.\n\n(2) SIEMBRA empresas nuevas (estado='validada'): 'Dependencia Sur Demo' (tipo dependencia, la SEGUNDA dependencia, clave para A-no-ve-B); 'Constructora Patito SA de CV' (contratista); 'Constructora Norte SA' (contratista, opcional 3a); 'Supervision Tecnica Sur Demo' (supervision).\n\n(3) SIEMBRA N CUENTAS por empresa (password 'Sigecop2026!' reusando el hash bcrypt; rol efectivo directo, estado 'activo' por DEFAULT):\n - Constructora Demo: contratista@sigecop.test (ya) + super2.demo@sigecop.test + super3.demo@sigecop.test (rol contratista) = 3 personas de la MISMA constructora.\n - Constructora Patito SA de CV: patito1@sigecop.test, patito2@sigecop.test (contratista).\n - Dependencia Demo: dependencia@/residente@/finanzas@ (ya) + residente2.demo@sigecop.test (residente).\n - Dependencia Sur Demo: dependencia.sur@sigecop.test (dependencia) + residente.sur@sigecop.test (residente).\n - Supervision Externa Demo: supervision@ (ya) + superv2.demo@sigecop.test (supervision).\n - Supervision Tecnica Sur Demo: superv.sur@sigecop.test (supervision).\n\n(4) VINCULA cada cuenta a su empresa por UPDATE...empresa_id usando match por nombre normalizado (lower(btrim(regexp_replace(nombre,'\\s+',' ','g')))), patron de schema.sql:1572-1577; solo donde empresa_id IS NULL.\n\nRESULTADO testeable: (a) dependencia@sigecop.test (Dependencia Demo) NO ve los contratos de Dependencia Sur Demo y viceversa -> demuestra el acotamiento dependencia de lib/acceso.js (requiere que algun contrato tenga dependencia_id = la cuenta de Dependencia Sur; cubrir con un contrato extra sembrado para esa dependencia, ver notas). (b) Varias personas comparten una constructora -> el acotamiento operativo por participacion sigue correcto (compartir empresa NO da acceso cruzado a contratos donde no se participa).\n\nORDEN DE USO: npm run reseed:cuentas (cuentas+empresas) y luego npm run seed:demo (contratos). El doc del script indica este orden.

**DDL:**

```sql
ninguna (es seed de datos de prueba, NO DDL; no toca schema.sql). El script vive en backend/scripts/reseed_cuentas.sql y solo hace INSERT/UPDATE idempotentes sobre tablas ya existentes (empresas, usuarios).
```

**Spec:** Smoke manual (no e2e en CI). 1) Aplicar schema.sql (RUN_MIGRATIONS) en BD local. 2) cd backend && npm run reseed:cuentas -> imprime resumen sin error, re-ejecutable 2-3 veces sin duplicar (uq_empresas_nombre_norm + ON CONFLICT(email)). 3) Verificacion SQL: SELECT e.nombre, e.tipo, count(u.id) AS cuentas FROM empresas e LEFT JOIN usuarios u ON u.empresa_id=e.id GROUP BY e.id ORDER BY e.nombre; -> cada empresa con >=2 cuentas donde aplica, >=2 empresas tipo='dependencia'. 4) Acotamiento: login dependencia@sigecop.test vs dependencia.sur@sigecop.test y GET /api/contratos -> cada uno ve solo los contratos cuyo dependencia_id pertenece a SU empresa (requiere un contrato sembrado para cada dependencia). 5) Login super2.demo@sigecop.test con Sigecop2026! -> 200 (hash reutilizado valido).

**Notas:** CLAVES PARA MAIKI: (1) El acotamiento dependencia de lib/acceso.js se evalua sobre la EMPRESA del dependencia_id del CONTRATO (du.empresa_id en listarContratos), NO sobre el residente. Para que A-no-ve-B sea visible hacen falta contratos cuyo contratos.dependencia_id apunte a la cuenta dependencia de cada empresa. Este item solo crea cuentas/empresas; conviene que el seed de contratos siembre >=1 contrato con dependencia_id = 'dependencia.sur@sigecop.test' (puede anexarse al final de reseed_cuentas.sql o al seed_demo.sql). (2) Operativos: compartir empresa entre varios contratistas NO da acceso cruzado a contratos donde no participan -> correcto, demuestra que 1:N no rompe el acotamiento. (3) Reusar el hash bcrypt de 'Sigecop2026!' evita versionar contrasenas (el hash ya esta en schema.sql, no es texto plano). (4) Cuentas nuevas nacen estado='activo' (DEFAULT) para loguear sin aprobacion. (5) Idempotencia critica: NO usar ON CONFLICT contra uq_empresas_nombre_norm (indice funcional, requeriria nombrar la expresion) -> usar INSERT...SELECT WHERE NOT EXISTS de schema.sql:1555-1565. DECISIONES PARA MAIKI: cuantas constructoras (2 minimo, 3 opcional); nombres exactos de cuentas/empresas; si el contrato extra para Dependencia Sur va en este script o en seed_demo.sql.

**Veredicto verif:** APROBADO

---
