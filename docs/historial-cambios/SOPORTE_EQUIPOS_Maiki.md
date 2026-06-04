# Pasada SOPORTE EQUIPOS — esquema de desbloqueo (HU-02/06/07/11/13/15/16/20)

**Autor:** Maiki (Fundación) · **Fecha:** 2026-06-04 · **Tipo:** entregable interno · **Alcance:** SOLO esquema.

## Qué es y qué NO es

Crea las **tablas/columnas de soporte** que les faltaban a Equipo 2 y Equipo 3 para arrancar su lógica, de modo que queden **100% desbloqueados** antes de subirles la actualización. **Solo agrega esquema** (tablas, FKs, constraints, índices, un trigger append-only); **no toca la lógica del core** (alta, A2, estimación, bitácora). Los equipos construyen endpoints, validaciones y máquinas de estado **encima**.

- **Aditivo e idempotente.** Todo es `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` / guards sobre `pg_constraint`. Probado: aplica **2× limpio** con `psql --single-transaction -v ON_ERROR_STOP=1`, **sin reescribir datos** (105 contratos + 209 periodos + 108 celdas de programa intactos).
- **Núcleo intacto.** Las 3 columnas nuevas de `estimaciones` quedan **fuera** del trigger `sigecop_estimacion_inmutable` a propósito (ver HU-13/16); no se editó ningún trigger/controller del core.
- **NO incluye HU-03 (convenios).** Esa muta el core del programa (migración + endpoint) y va en su propia pasada. Aquí solo dejo el *gancho* (`garantia_endosos.convenio_id` como `INTEGER` suelto).
- **Archivo tocado:** `backend/src/db/schema.sql` (+256 líneas, una sección nueva al final). Nada más.

## Nivel 1 — citas legales verificadas contra el texto literal

Leí el texto literal en `docs/legal/` (**LOPSRM** reforma DOF 14-11-2025; **RLOPSRM** DOF 24-02-2023). No soy abogado: lo legal lo confirma el profe. Lo que no pude anclar a texto va marcado **[sin fundamento verificable]**.

| Tabla/columna | Cita **verificada** (texto literal) | Qué dice |
|---|---|---|
| `presupuesto_anual` | **art. 24 párr. 2 LOPSRM** | "…podrán convocar, adjudicar o contratar… siempre y cuando cuenten previamente con la **suficiencia presupuestaria en la partida o partidas específicas**…" |
| `instruccion_pago` | **art. 54 párr. 2 LOPSRM** | pago "en un plazo no mayor a **veinte días naturales**, contados a partir de la fecha en que hayan sido autorizadas por la residencia… y que el contratista haya presentado la factura" |
| `enviada_en/por`, `estimacion_observaciones` | **art. 54 párr. 1 LOPSRM** | contratista presenta a la residencia "dentro de los **seis días naturales**…"; la residencia revisa/autoriza en "plazo no mayor de **quince días naturales** siguientes a su presentación" |
| `concepto_avance` | **art. 118 RLOPSRM** | "Si el contratista realiza trabajos por **mayor valor del contratado, sin mediar orden por escrito**… no tendrá derecho a reclamar pago alguno por ello…" |
| `garantia_endosos` | **art. 98 fr. II RLOPSRM** (+ último párr. y art. 99 últ. párr.) | "En caso de la celebración de convenios para ampliar el monto o el plazo… se deberá realizar la **modificación correspondiente a la fianza**"; "Las modificaciones a las fianzas deberán formalizarse con la participación que corresponda a la afianzadora" |
| `minutas` | **art. 125 fr. III inciso d) RLOPSRM** | "acuerdos de **juntas de trabajo**" (tipo de nota que registra la supervisión; ya estaba en el catálogo `bitacora_nota_tipos`) |
| `alerta_atraso` (base) | **art. 45 ap. A fr. X RLOPSRM** (programa) + **art. 46 Bis LOPSRM** (penas por atraso) | el programa por periodos es la base contra la que se mide el atraso; la pena convencional es la consecuencia |
| `visitas` (agenda) · mecanismo de alerta in-app | **[sin fundamento verificable]** | la agenda de visitas/inspecciones y el disparo in-app son operativos; no hay artículo literal que los obligue como tales |

> ⚠️ **Corrección de cita** detectada al verificar: el endoso de fianza **NO** se ancla en el art. 48 LOPSRM (ese fija la *obligación de garantizar* anticipos/cumplimiento), sino en **art. 98 fr. II RLOPSRM** (la *modificación* de la fianza por convenio). El art. 48 queda como base del dominio de garantías (HU-02), no del endoso.

## Tabla por tabla (forma y por qué)

### HU-02 · `garantia_endosos` (Equipo 2)
Endosos/ajustes de las fianzas ya registradas en `contrato_garantias`. **Histórico append-only** (trigger `sigecop_garantia_endoso_inmutable`, `BEFORE UPDATE`, como notas/pagos): un endoso es un hecho inmutable. `garantia_id → contrato_garantias ON DELETE CASCADE`. **`convenio_id INTEGER` suelto** (sin FK): la tabla `convenios_modificatorios` es HU-03 y **no existe aún**; referenciarla rompería la migración. Mismo idioma que `pagos.estimacion_id` antes de HU-12 → HU-03 amarra la FK con un `ALTER` guardado. Las **alertas de vigencia 30/15/5** se derivan en lectura de `contrato_garantias.vigencia` (sin tabla).

### HU-06 · `concepto_avance` (Equipo 2)
Cantidad **ejecutada** por concepto. `contrato_concepto_id → contrato_conceptos CASCADE` (el contrato llega vía el concepto). `cantidad NUMERIC(14,3) CHECK (>= 0)` (sin negativos). El tope **art. 118** (Σ por concepto ≤ `contrato_conceptos.cantidad`) es **cruce de filas** → lo valida el controller HU-06 (como HU-12 ya valida el exceso). **`contrato_periodo_id` con `ON DELETE SET NULL`** (no cascade) **a propósito**: A2 edita la matriz por **DELETE+INSERT** (`lib/programa.js: guardarMatriz`) y puede regenerar `contrato_periodos`; con SET NULL el avance **sobrevive** (pierde el vínculo, no el dato). `nota_id → bitacora_notas ON DELETE NO ACTION` (la nota es inmutable; mismo idioma que `estimacion_notas`). **No** lleva trigger append-only: la HU-06 define su flujo de captura/corrección (candidato a append-only en su fase de lógica).

### HU-07 · `alerta_atraso` (Equipo 2)
**Configuración** de alertas por concepto (`umbral_pct`, `canal`, `activa`). El **disparo** (ejecutado < planeado) se **deriva en lectura** cruzando `programa_obra` vs `concepto_avance`; no se almacenan instancias. `canal` default `'sistema'` (in-app, Etapa 1); `'correo'` depende de D-9 (Etapa 2). Sin trigger (config editable).

### HU-11 · `minutas`, `visitas` (Equipo 2)
`minutas`: junta de trabajo con PDF en **BYTEA** (disco de Render efímero, como `contrato_documentos`) + `nota_id` (NO ACTION) para "adjuntar minuta como referencia en una nota" (HU-09). `visitas`: agenda de visitas/inspecciones con ciclo `agendada→realizada→cancelada`. Ambas FK a `contratos CASCADE`. **Documental/editable, sin trigger** (la HU-11 decide si una minuta firmada se congela).

### HU-13/16 · columnas en `estimaciones` (Equipo 3)
`enviada_en TIMESTAMPTZ`, `enviada_por → usuarios SET NULL` (sello de envío, arranca el plazo art. 54), `reemplaza_a → estimaciones SET NULL` (reingreso: la rechazada que sustituye; **no reinicia** el plazo). `UNIQUE(reemplaza_a)` = a lo sumo un reingreso por rechazada (varios NULL conviven).
**Disciplina (núcleo intacto):** estas columnas **no** se agregan a `sigecop_estimacion_inmutable`. Ese trigger congela la carátula comparando una **lista fija** de columnas y deja libre lo no listado → al ser columnas nuevas, son **mutables por el controller** (UPDATE estado + sellos) **sin tocar la lógica del core**. La inmutabilidad "una sola vez" (NULL→valor) la hace el controller HU-13/16. `reemplaza_a` con SET NULL toca **solo** esa columna (no protegida) → el trigger devuelve `NEW` sin bloquear; verificado.

### HU-15 · `estimacion_observaciones` (Equipo 3)
Observaciones de revisión por `seccion`/`tipo`/`severidad`, ciclo `abierta→solventada`, `turnado_a`. FK `estimacion_id → estimaciones CASCADE`. El **turnado supervisión→residencia** y el **semáforo de 15 días** (art. 54) los controla el controller. Editable (estado avanza), sin trigger.

### HU-20 · `presupuesto_anual`, `instruccion_pago` (Equipo 3)
`presupuesto_anual`: techo por `(ejercicio, dependencia)` (UNIQUE), `techo NUMERIC(18,2)` (escala de `contratos.monto`). El **bloqueo presupuestal** (Σ pagado + neto ≤ techo, art. 24) y el **semáforo de 20 días** (art. 54) los deriva el controller. `instruccion_pago`: orden formal de pago al autorizar; **una por estimación** (UNIQUE), `monto` = snapshot del neto, ciclo `emitida→notificada→cumplida/cancelada`, `notificado_finanzas_en` (in-app). `estimacion_id → estimaciones CASCADE`; `presupuesto_anual_id → SET NULL`. **Reconecta** el ciclo HU-20 → `pagos.estimacion_id` (HU-21). Sin trigger (ciclo editable; candidato a trigger "congela-contenido-deja-estado" como el de estimaciones en su fase de lógica).

## Decisiones de diseño (Nivel 2 — tu veto)

1. **Append-only solo en `garantia_endosos`.** Es el único *registro histórico puro* (un endoso es un hecho). Las demás tablas tienen **ciclo de vida** (`abierta→solventada`, `emitida→cumplida`, `agendada→realizada`) → un append-only ciego sería incorrecto; donde haga falta congelar contenido, el patrón correcto es el "congela-contenido-deja-estado" de `estimaciones`, que **dejo para la fase de lógica** de cada HU para no constreñir su diseño antes de tiempo. Si quieres que `instruccion_pago`/`concepto_avance` nazcan con ese trigger, te lo agrego.
2. **`reemplaza_a` y `enviada_*` fuera del trigger de estimaciones** (honra "no toques el core"). La inmutabilidad set-once la pone el controller HU-13/16.
3. **`concepto_avance.contrato_periodo_id = SET NULL`** por el DELETE+INSERT de A2 (preserva el dato ante regeneración de periodos). Caveat para HU-05/06: tras re-editar el programa habrá que **re-imputar** el avance a los periodos nuevos.
4. **`garantia_endosos.convenio_id` sin FK** hasta HU-03 (idioma `pagos.estimacion_id`).
5. **Validación art. 118 (≤ contratado) en app, no en CHECK:** es Σ de filas, no expresable como CHECK de una fila. Documentado dónde va (controller HU-06), igual que HU-12.

## Runbook de migración

> El esquema es la **fuente única**: `init.js` aplica `schema.sql` completo dentro de **una transacción** (BEGIN/COMMIT) = equivale a `psql --single-transaction`. Re-aplicarlo es idempotente.

**Local (lo que ya probé):**
```bash
# 1) Backup local (opcional, la BD local es reproducible)
docker exec -i sigecop_db pg_dump -U sigecop -d sigecop_db > backup_local_$(date +%Y%m%dT%H%M%S).sql
# 2) Aplicar (idempotente; correr 2× debe dar exit 0 sin ERROR)
docker exec -i sigecop_db psql -U sigecop -d sigecop_db --single-transaction -v ON_ERROR_STOP=1 < backend/src/db/schema.sql
# 3) Reiniciar backend y verificar
docker restart sigecop_backend
curl -s http://localhost:4000/api/health   # -> {"status":"ok",...}
```

**Render (cuando integres a `main`):**
1. **Backup primero:** `pg_dump` de la BD de Render (DATABASE_URL en `backend/.env`) a archivo con fecha.
2. **Aplicar la migración** con `psql "$DATABASE_URL" --single-transaction -v ON_ERROR_STOP=1 -f backend/src/db/schema.sql` y confirmar **exit 0** (rollback total si algo falla).
3. **Verificar código viejo sobre esquema nuevo:** las 8 tablas/3 columnas son nuevas y **nadie las lee aún** → el backend actual sigue funcionando igual (cero acoplamiento). Confirmar `GET /api/health` y un login real.
4. **Push a `main`** → auto-deploy. `RUN_MIGRATIONS=true` re-aplica `schema.sql` idempotente en el arranque (ya verificado en el paso 2, no debe cambiar nada).
5. **Solo tú despliegas.** No reinicia/borra datos: todo es `IF NOT EXISTS` / `ADD COLUMN ... ` nullable.

## Pruebas (local)

| Prueba | Resultado |
|---|---|
| `psql --single-transaction` aplicación #1 | **exit 0**, sin ERROR/FATAL |
| Aplicación #2 (idempotencia) | **exit 0**, sin ERROR/FATAL |
| 8 tablas nuevas creadas | ✔ |
| 3 columnas nuevas en `estimaciones` (tipos correctos) | ✔ |
| Datos intactos (usuarios=14, contratos=105, periodos=209, programa=108, demo presente) | ✔ |
| `garantia_endosos` append-only (UPDATE bloqueado) | **PASS** |
| `concepto_avance` CHECK cantidad ≥ 0 (negativo rechazado) | **PASS** |
| `estimacion_observaciones` / `instruccion_pago` estado/FK inválido rechazado | **PASS** |
| Backend reinicia con esquema nuevo (`/api/health` = ok) | ✔ |
| Suite Playwright completa (con el esquema nuevo ya aplicado) | **148 passed · 8 skipped · 0 failed** (3.9 min) → verde, sin regresión, los **8 fixme intactos** |

## Lo que sigue (cada equipo, sobre este esquema)

- **E2 HU-02:** endpoint CRUD de pólizas post-alta + endosos; alertas de vigencia derivadas.
- **E2 HU-06:** validar Σ `concepto_avance.cantidad` ≤ contratado (art. 118) en el controller; alimentar curva HU-05.
- **E2 HU-07/11:** cablear `alerta_atraso`/`minutas`/`visitas`.
- **E3 HU-13/15/16:** sellos de envío + observaciones + reingreso (semáforos art. 54 en app).
- **E3 HU-20:** bloqueo presupuestal (art. 24) + instrucción de pago + reconexión `pagos.estimacion_id`.
- **Fundación (otra pasada):** HU-03 convenios (amarra `garantia_endosos.convenio_id`), CMIC (D-8), sustitución de personas (`contrato_roster`).
