# SIGECOP — Respaldo de contexto (estado REAL reconciliado)

> Reconciliado con: auditoría read-only de Claude Code (2026-06-02), el red-team del plan A2
> (Claude Code), el Plan de Paralelización, y DECISIONES.md (lo vigente). Donde un doc viejo
> contradice el código, manda el código. Reemplaza versiones anteriores.
>
> **Nota de fuentes:** el red-team de A2 es de justo antes del commit de A1; la auditoría es
> posterior y confirma que A1 aterrizó. La auditoría buscó `contrato_programa` (no existe); el
> diseño real de A2 usa `programa_obra` + `contrato_periodos` y vive en el plan, aún NO escrito
> en `schema.sql`/borrador. Por eso A2 = **diseñado, no construido**.

---

## 1. Qué es

**SIGECOP** — app web de gestión de contratos de obra pública bajo ley mexicana
(**LOPSRM / RLOPSRM / LFD**). Proyecto académico de **FEPY** (carpeta `FEPI/`).
- Verdad de fondo (Nivel 1): texto literal de `LOPSRM.pdf` / `Reg_LOPSRM.pdf` + el profesor.
- Prioridad para dudas: Nivel 1 = ley/reglamento + profesor; Nivel 2 = Claude propone, Maiki decide.

## 2. Stack (confirmado en código)

React 18 + Vite + Tailwind (JS) · Node 20 + Express + **PostgreSQL** (`pg`) · Docker/docker-compose ·
desplegado en **Render** (auto-deploy desde `main`, `RUN_MIGRATIONS=true`).
> ⚠️ **Deadline duro: el PostgreSQL gratis de Render expira el 25 de junio.** Marca el cierre.

## 3. Equipo y método de trabajo

- **Trabajando ahora:** Maiki + Claude (chat) + Claude Code.
- **Plan de paralelización FINALIZADO** (6 personas, 3 mini-equipos de 2; 3 semanas; equipo 1 ya hizo
  sprints 1–3 en producción). Ejecución (ramas, branch protection, partir esquema): **pendiente según
  la auditoría** — confirmar si ya arrancó.
- **Maiki = Fundación + único integrador** (jala ramas, prueba en local, mergea a `main`, despliega).
  Los equipos nunca despliegan.
- **Flujo:** Claude chat = prompts/revisión/síntesis · Claude Code = planificador+ejecutor con filesystem.
- **Profesor:** retroalimenta por audios → transcritos → incorporados. Vocabulario/ediciones
  autoritativos (Nivel 1): "aperturar" (no "abrir"); "criterios de aceptación"; criterios como
  aseveraciones verificables, máx. 3, puntos Fibonacci.

## 4. Dominio

- **5 roles:** Residente, Contratista, Supervisión, Dependencia, Finanzas. Superintendente va **dentro
  de Contratista**.
- **3 niveles de permiso/vista:** ejecuta / consulta / sin acceso. Control de Accesos = servicio
  transversal (no módulo). Login sin selector de rol.
- **22 HU (HU-00…HU-21).**
- **Fundamento legal:** art. 117 (HU-04), 125 (HU-09 + sustitución de personas), 59/59 Bis (HU-03),
  54 (HU-13 plazo 6 días; periodos), 118 (HU-06/estimación), 99 (enmienda de programa por convenio),
  143 (HU-12 amortización), 191 LFD (5 al millar), 52 Bis (HU-08), 130 (HU-14), 55 (HU-20),
  45 fr. IX (clave de concepto), 45 fr. X (programa de ejecución → A2).

## 5. Estado REAL hoy

### Funciona end-to-end vs PostgreSQL (7 HU 🟢)
HU-00 login (bcrypt+JWT) · HU-01 alta+catálogo · HU-08 apertura bitácora · HU-09 notas (folio atómico) ·
HU-10 consulta notas · HU-12 estimación (carátula server-side: amortización art. 143, 5 al millar
art. 191 LFD; valida exceso art. 118 y periodo art. 54) · HU-21 pago. Inmutabilidad por 7 triggers;
identidad desde JWT. Solo 6 routers (auth, usuarios, contratos, bitacora, pagos, estimaciones).

### Prototipo dummy (15 HU 🟡): HU-02,03,04,05,06,07,11,13,14,15,16,17,18,19,20.

### Base de datos
- **16 tablas aplicadas** en `schema.sql` (incl. `contrato_actividades` = modelo VIEJO de programa,
  texto libre) + 7 triggers + seed (4 usuarios demo, contrato `OP-2026-DEMO-001`).
- **12 cambios en `Borrador_DDL` — NO aplicados:** `contrato_roster`, `+retencion_cmic`,
  `convenios_modificatorios`+`convenio_conceptos`, `concepto_avance`, `garantia_endosos`,
  `alerta_atraso`, `minutas`+`visitas`, `+enviada_en/por`+`reemplaza_a`, `estimacion_observaciones`,
  `presupuesto_anual`+`instruccion_pago`. (El borrador **NO** incluye aún las tablas de A2.)

### Infra: local levanta sin errores (3 contenedores Up). Render desplegado y operativo.

### Modo proyecto: **INTACTO** — decisión de quitarlo tomada, NO ejecutada en código. Complejidad de
remoción: baja (ninguna lógica de negocio depende del `modo`; mover `/solicitud-acceso` a ruta
pública, no borrar).

## 6. ⭐ Fase A2 — estado reconciliado

**A2 = rehacer el programa de obra como matriz `programa_obra` (conceptos del catálogo × periodos),
con tabla `contrato_periodos` generada por algoritmo de periodos.** Reemplaza el modelo viejo de texto
libre. Desbloquea HU-05, HU-06 y el versionado de HU-03.

- **A1 ✅ TERMINADO** (commit `69456f2`): catálogo. A1.1 migración (14/14) · A1.2 backend (14/14) ·
  A1.3 frontend/e2e (build + spec 2/2). Trae clave UNIQUE (art. 45 fr. IX), monto derivado read-only,
  importe⇄PU bidireccional. A1 ≠ A2.

- **A2 ✅ DISEÑADO Y RED-TEAMEADO · ❌ NO construido ni migrado:**
  - **Algoritmo de periodos verificado** con brute-force (toda fecha 2024–2030 × plazo 1..400 × ambos
    ciclos → 0 huecos, 0 solapes, cumple art. 54; feb/bisiesto/cruce de año/último parcial OK).
  - Escala **NUMERIC(14,3)** = catálogo. Invariante **Σ planeado ≤ contratado (art. 118) validada en
    SQL** (sin epsilon). Reemplazo DELETE+INSERT (programa_obra es hoja). Freeze post-estimación con
    excepción enmienda-por-convenio (art. 99). Lock `pg_advisory_xact_lock(2, contratoId)`.
  - **NO está en `schema.sql` ni en el borrador** (la auditoría confirmó que el esquema sigue con
    `contrato_actividades`). No hay commit de A2.

  **7 correcciones (C1–C7) a plegar ANTES de construir:**
  | # | Corrección |
  |---|---|
  | C1 🔴 | Freeze debe distinguir origen: `edicion_manual` (bloqueada post-estimación) vs `enmienda_convenio` (exenta, art. 99). Diseñar `guardarMatriz(..., convenio_id?)`. |
  | C2 🔴 | Tomar `pg_advisory_xact_lock(2, $contratoId)` al inicio del BEGIN del guardado (evita TOCTOU con la integración). |
  | C3 | Detección de freeze = `EXISTS(... estado <> 'rechazada')`, no `estado='integrada'`. |
  | C4 | `RETURNING id` → Map(clave→id); rechazar orphans con 400 antes del INSERT. |
  | C5 | DELETE por subconsulta: `WHERE contrato_concepto_id IN (SELECT id FROM contrato_conceptos WHERE contrato_id=$1)`. |
  | C6 | Una sola `guardarMatriz(client, contratoId, celdasPorId)`; el alta traduce clave→id antes. |
  | C7 | Validar invariante en SQL NUMERIC (3 dec), no en float JS. |

  **Decisiones de producto a documentar (no bloquean):** periodos de 1 día en cortes exactos (recomendado
  fusionar); concepto con Σ=0 (¿aviso, no error?); regeneración de periodos al cambiar plazo por
  convenio = follow-on de HU-03.

| | |
|---|---|
| **HECHO** | A1 completo. **A2 construido y probado en local** (Claude Code, 6 capas verdes; SIN commit/push/deploy, `main` intacto en `d840855`): `contrato_periodos` + `programa_obra` + `contratos.ciclo_estimacion` reemplazan a `contrato_actividades`; matriz concepto×periodo, celda=cantidad, Σ≤contratado en SQL (art. 118); C1–C7 plegadas en `lib/programa.js: guardarMatriz`. Periodos anclados a `masUnMes` → cada periodo es válido para estimación (art. 54). El **selector de ciclo mensual/quincenal ya está incluido en A2** (confirmado). Entregable: `docs/A2_ENTREGABLE_Maiki.md` + `docs/A2_DIFFS.patch`. **Además: paquete 4.x del alta construido y probado (sin commit)** — wizard (Siguiente + validación por paso + Guardar solo al final + popup); errores que dicen el campo (+ `contratos.monto` → `NUMERIC(18,2)` para obras muy grandes); anticipo→uploader de PDF (`contrato_documentos.tipo`, UNIQUE por tipo). Entregables `docs/CORRECCION_ALTA_4x_*`. |
| **PENDIENTE — la "otra mitad" de A2** | (1) ⚠️ **HU-12 NO valida aún** estimado ≤ planeado-del-periodo contra `programa_obra` (hoy solo art. 118 acumulado) — es el punto del profe ("sin esto no validas estimaciones"); toca el core financiero congelado, Code lo dejó **propuesto, no hecho**. (2) **HU-05 (curva)** queda huérfana al deprecar `contrato_actividades` → releer desde `programa_obra`. |
| **YA INTEGRADO (en `main`, desplegado)** | **`553cda0`**: A2 + 4.x (deploy a Render verificado ✅, tablas + columnas confirmadas). **`c9fba02`**: alta **v2** (gating uniforme 🔒, banner de error que el usuario cierra, garantía bloqueada si excede el contrato, PDFs cargables durante captura, "ver info" solo lectura, **regla del 100%** Σ=contratado ±0.0005, **modo proyecto ELIMINADO**, seed a 6 cuentas, migraciones idempotentes) + **v3** (PDF firmado = paso final **obligatorio** para guardar, gateado en UI). ⚠️ El PDF obligatorio está gateado **solo en UI, no en servidor** (enforcement server-side toca `contratos.controller.js`, congelado → follow-on con HU-12). e2e local: 127 passed / 8 fixme / 0 failed. Render redesplegando desde `c9fba02`. |
| **SIGUIENTE PASO** | Verificar el deploy de `c9fba02` en Render (logs + login con las 6 cuentas + recorrer alta) → si los 6 usuarios no aparecen en la BD existente, correr el runbook **§D** (reset + reseed de Render; destructivo). Luego, una pasada al core congelado: validación de estimación contra `programa_obra` (HU-12) + **enforcement server-side del PDF firmado** + re-cablear HU-05 + convertir los 8 tests `fixme` a integración. |

> **Confirmado por el profesor (audio 2026-06-01):** el programa de obra son **conceptos** (no
> "actividades") repartidos en periodos; el ciclo es **mes o quincena** elegido al configurar el
> contrato (art. 54); la celda = unidades del concepto por periodo; **no se puede asignar más de lo
> autorizado** (art. 118); debe **cuadrar con el catálogo** y alimentar la validación de estimaciones.
> Validar en la vista (no hasta el final); captura simple aceptada (drag-and-drop ideal, no obligatorio).

## 6b. Correcciones del profesor — audio 2026-06-01 (Nivel 1)

> Las citas de artículos las dijo el profe/equipo; el texto literal de `LOPSRM.pdf`/`Reg_LOPSRM.pdf` es
> la verdad final (verificar). Claude no es abogado: lo interpretativo va marcado "validar".

| Corrección | Fundamento citado | Estado |
|---|---|---|
| Programa de obra = conceptos del catálogo en matriz por periodos (mes/quincena) | art. 54 + 45 fr. X | = **A2** (a construir) |
| No exceder lo autorizado (programa y estimación) | art. 118 | Parcial: estimación ya valida; programa = A2 |
| **Sustitución de personas:** residente/superintendente/supervisión pueden cambiar; NO se borra, se sustituye; tabla 1:N, solo uno activo, preserva histórico | art. 125 | **PENDIENTE** — `contrato_roster` en borrador, no aplicado. Requisito legal NO cumplido hoy |
| Bitácora apertura: datos mínimos (fecha, partes, nombre/firma autorizada, domicilios/teléfonos, datos del contrato, alcance descriptivo) | art. 123 fr. III | PENDIENTE — verificar HU-08 ("tienen que añadir eso") |
| Notas tipificadas por rol (~5 por rol; el contratista hace más que "solicitud") | art. 122 / 125 | PENDIENTE — ampliar/verificar HU-09 |
| Tag/clave para búsqueda eficiente de notas | — | Confirmar en HU-10 (el profe quiere el tag) |
| Anticipo sobre umbral: PDF de autorización (no solo aviso) | (verificar art. — ¿50?) | ✅ **RESUELTO en 4.x** — el aviso habilita el uploader (`contrato_documentos.tipo`). Parametrizable/para el profe: umbral (30 vs 50), obligatorio-vs-habilitado, autorización del titular vs residente |
| Validar en la vista por campo + errores que dicen dónde + "Siguiente"/Guardar solo al final | queja del profe | ✅ **RESUELTO en 4.x** — wizard con validación por paso, Guardar al final + popup, errores mapeados al campo |
| Fecha de apertura de bitácora = día de inicio del contrato | — | PENDIENTE (regla de negocio) |
| CMIC / aportación de capacitación visible en la estimación | LFD/CMIC (no LOPSRM) | A confirmar tasa — el profe confirma que VA; mostrará estimaciones reales para la cifra |
| Plazo de firma de notas en **días naturales**, está en la LEY (no reglamento) | LOPSRM (verificar art. y nº de días) | A verificar |
| Token de sesión con expiración (1–2 h) | — | Verificar (seguridad) |
| Contrato nuevo = vacío, sin datos dummy precargados | — | Alineado con quitar modo proyecto/dummy |
| Supervisión registrada como empresa; dependencias/empresas como catálogos, no texto libre | — | Mejora pendiente (prioridad baja) |
| Folio del contrato = captura del usuario (UNIQUE) | C4 | **CONFIRMADO** por el profe |

## 7. Plan de paralelización (finalizado; ejecución parcial)

**Modelo:** repo único; Render solo de `main`; cada equipo en su rama (nunca `main`); branch protection
(solo Maiki aprueba PRs); Maiki único integrador; integración continua (no big-bang).
**Dominios:** Equipo 1 (Maiki+Iván) = Fundación (A2/programa matriz, bitácora-notas legal, anticipo,
sustitución de personas) · Equipo 2 = Contrato · Equipo 3 = Estimación→Pago. *(Partición borrador.)*

> ⚠️ **Unificar partición de equipos (Code lo señaló):** hay dos versiones en circulación — ¿2 o 3
> equipos?, y HU-05/HU-06 ¿van en Equipo 2 o Equipo 3? Definir antes de repartir. Nota: ahora mismo
> solo trabajan **Maiki + Claude + Code**, así que esto está en pausa hasta activar equipos.

**Ejecutado (según auditoría):** CLAUDE.md (zona congelada), CODEOWNERS (@TheMike54), prompts por
equipo, SETUP_LOCAL + GUIA_TRABAJO_EQUIPOS.
**Pendiente:** crear ramas de equipo (hoy solo `main`), activar branch protection en GitHub, limpiar las
specs de Paquete 1 (CI verde, precondición), arrancar equipos.

> ⚠️ **Corrección (Code lo señaló):** el plan original proponía partir el esquema en
> `00_core/10_equipo2/20_equipo3`, pero **D-1 ya decidió UN solo `schema.sql`** (partición "de papel",
> solo Maiki edita). Vale D-1 — **partir el esquema NO es tarea pendiente**, salvo que se reverse D-1.

## 8. CI y pruebas — está ROJO

- CI (`.github/workflows/e2e.yml`): solo Playwright del frontend; no levanta backend/Postgres.
- **Suite ROJA por causa conocida:** ~20 specs "modo proyecto" se rompieron al desplegar **Paquete 1**
  (control de acceso: fuerza elegir rol + filtra por rol). Esperaban el browse-sin-rol viejo. La
  corrección = actualizar esas specs a la conducta de Paquete 1 (tarea ya prevista en el plan). El
  "299/305 verde" histórico es PREVIO al cableado.
- `hu-registro.spec.js` requiere backend real (`test.skip` en CI).
- Varias HU ya cableadas (08/09/10/12/21) tienen specs escritas contra el dummy → revisar/reescribir.

## 9. Bloqueos y dudas abiertas

**Bloqueos (por impacto):**
1. **A2 — falta la otra mitad.** Modelo + captura construidos, probados e **integrados** (553cda0).
   Falta: validación de estimación contra `programa_obra` (HU-12, core financiero congelado) y re-cableo
   de **HU-05** (curva, huérfana). *Fundación.*
2. **Sustitución de personas (`contrato_roster`, art. 125)** — requisito legal NO cumplido (punteros
   escalares sin histórico; tabla en borrador). Riesgo en la defensa. *Fundación.*
3. **CI** — alta v2 limpió ~20 specs viejas + reescribió 3 de alta; quedan **8 tests en `test.fixme`**
   (HU-08 firmar, HU-12 inputs, HU-21 pago) a convertir en tests de integración (rompieron al quitar el
   modo demo; las pantallas funcionan). Además las 4 specs lentas (~15 min) siguen siendo riesgo de timeout.
4. **Modo proyecto: ELIMINADO en alta v2** (pendiente de integrar/desplegar). Antes era bloqueo; ya resuelto.
5. **Branch protection: EXISTE** (regla PR, confirmada en el push del 553cda0). Enforcea para el equipo
   (no-admins → PR obligatorio); Maiki la **bypassa como owner** (sus pushes saltan PR y el gate de CI).
6. **Deadline Render 25 jun** (PostgreSQL gratis expira).

**Para el profe (Nivel 1):**
- ✅ **Programa al 100% — RESUELTO** (Σ planeado = contratado; construido en alta v2). Soporte literal
  **firme: RLOPSRM art. 45 A fr. X + LOPSRM art. 52** (certeza alta). ⚠️ **Citas a corregir antes de
  presentar:** NO usar RLOPSRM art. 59 (es revisión de proposiciones) ni RLOPSRM 64-A-I-a (es licitación);
  los convenios son **art. 59 LOPSRM** (la ley). Las variaciones de obra se ajustan después por convenio.
- ⚠️ **Convenio — artículo a verificar:** el código de A2 usa **art. 99 LOPSRM** para la excepción de
  convenio, pero los convenios modificatorios son **art. 59 LOPSRM**. Confirmar cuál aplica contra el
  texto literal (los números chocan entre LOPSRM y RLOPSRM).
- **CMIC / 2 al millar:** base LFD/CMIC (no LOPSRM); tasa y aplicabilidad a confirmar.
- **Plazo de firma de notas:** nº de días naturales — verificar artículo.
- **Notificaciones (U3):** alcance Etapa 1 (hoy solo indicadores in-app).
- **Folio del contrato (C4):** ya es captura UNIQUE — solo confirmar.

**Higiene del repo:** borrar `Matriz_Control_Accesos_SIGECOP (1).md` (duplicado); actualizar la nota
"todo esqueleto" de `DECISIONES.md`; mantener `Cuentas_Prueba_SIGECOP.md` fuera del repo.

## 10. Preferencias de trabajo con Claude

Directo, sin relleno · trabajar estrictamente sobre archivos provistos · tablas comparativas para
decisiones · enmarcar para presentar al profesor · explicar el *porqué* de herramientas/conceptos ·
comando `/auditar` (verificar solo contra fuentes tangibles, citar artículo+fracción, marcar certeza,
solo reportar).

---
*FIN DEL RESPALDO — reconciliado 2026-06-02 (auditoría + red-team A2 + plan de paralelización).*
