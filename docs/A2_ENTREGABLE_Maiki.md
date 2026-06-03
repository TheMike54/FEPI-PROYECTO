# A2 + Prevención sistémica — Entregable para Maiki

**Fecha:** 2026-06-02 · **Autor:** Claude Code (Fundación) · **Para revisión de:** Maiki (integrador).
**Nivel 1 = ley literal (LOPSRM/RLOPSRM/LFD) + profesor.** Lo interpretativo va marcado **[validar con especialista]** (Code no es abogado). Lo no verificable contra archivos = **[no determinable]**.

> **Reglas cumplidas en esta corrida:** PART 1 escribió código + migración **probados en LOCAL**; **NO** hay commit/push/deploy y **NO** se tocó `main` (solo el working tree → diffs). PARTES 2–4 son propuesta/reporte. **Fuentes Nivel 1 leídas:** `docs/WhatsApp Audio 2026-06-01..._transcript.txt` y `docs/SIGECOP_contexto_respaldo.md`.
>
> **Nota de memoria:** mi memoria persistente del proyecto contiene **solo 3 runbooks técnicos** (deploy Render, e2e-frontend-only, loop de stack local) — **[no determinable]**: no hay "audios previos" guardados en memoria; me apoyé en el transcript del repo. Si existían audios anteriores, no están en mi memoria.

---

## 0. Resumen ejecutivo

- **A2 (programa de obra = matriz concepto × periodo) está CONSTRUIDO y PROBADO en local**, plegando las 7 correcciones del red-team (C1–C7). Reemplaza el modelo viejo `contrato_actividades` (texto libre con %peso) por dos tablas (`contrato_periodos`, `programa_obra`) + columna `contratos.ciclo_estimacion`.
- **6 capas de prueba en verde** (detalle en §1.6): migración idempotente 3×, algoritmo de periodos brute-force (26 356 casos, 0 fallos), test de integración de `guardarMatriz` (7/7), smoke HTTP del alta (9/9), `vite build`, y e2e de la matriz (2/2).
- **Zona congelada tocada** (yo, Fundación): `schema.sql`, `contratos.controller.js`, `contratos.routes.js`, `AltaContrato.jsx`. Archivos **nuevos** (no congelados): `lib/programa.js`, `programa.controller.js`, 2 scripts de prueba, 1 spec e2e.
- **Decisión de producto que NO decide Code** (la marco para el profe): ¿el programa debe distribuir TODO (Σ=contratado) o se permite parcial/Σ=0 con aviso? Hoy quedó **parcial permitido** (solo bloquea exceso, art. 118).
- **Diffs:** `docs/A2_DIFFS.patch` (592 líneas, los 6 archivos tracked) + los 5 archivos nuevos van completos en el repo. **Runbook de aplicación:** §1.7.

---

# PARTE 1 — A2 construido (programa de obra = matriz concepto × periodo)

## 1.1 Qué es (confirmado por el profe, audio 2026-06-01)

El programa de obra **son los CONCEPTOS del catálogo** (no "actividades") repartidos en los **periodos** del ciclo de ejecución. Citas literales del profe:
- *"estas no son actividades, qué son conceptos, realmente estás acomodando esto"*
- *"este no es peso... tendría que ser aquí el número de elementos del concepto que vas a poner"* → la celda = **cantidad**, no %peso.
- *"la ley dice cada 15 [o] 30 días cuál es el periodo"* → ciclo **mensual o quincenal** (art. 54 LOPSRM).
- *"al final yo tengo aquí unos 800 y la teoría es que yo no me podría pasar"* → Σ por concepto **≤ contratado** (art. 118 RLOPSRM).
- *"debe de cuadrar con tu catálogo de conceptos... si no tienes esto no vas a poder validar estimaciones"* → el programa **alimenta la validación de estimaciones**.
- *"pueden hacer validaciones en vista... no necesariamente venir atrás"* → **validar en la vista**, no solo al guardar.

Ejemplo del profe (implementado tal cual en los tests): C1=800 (200+200+200+200), C2=6000, C3=4000.

## 1.2 Modelo de datos (ya en `schema.sql`, sección "Paquete A2")

| Objeto | Qué es | Notas |
|---|---|---|
| `contratos.ciclo_estimacion` | `'mensual'`/`'quincenal'` | nullable (contratos viejos NULL); lo exige el alta con programa |
| `contrato_periodos` | **columnas** de la matriz | `(contrato_id, numero, inicio, fin)`, `UNIQUE(contrato_id,numero)`; las genera el backend |
| `programa_obra` | **celdas** (tabla hoja) | `(contrato_concepto_id, contrato_periodo_id, cantidad NUMERIC(14,3))`, `UNIQUE(concepto,periodo)`, `CHECK(cantidad>=0)` |

`contrato_actividades` (modelo viejo) **se DEPRECA pero NO se borra** (conserva datos viejos; el alta ya no la escribe). **Fundamento Nivel 1:** art. 45 fr. X RLOPSRM (programa conforme al catálogo, por periodos), art. 54 LOPSRM (ciclo), art. 118 RLOPSRM (no exceder), art. 99 LOPSRM (enmienda por convenio).

## 1.3 Algoritmo de periodos (`backend/src/lib/programa.js: generarPeriodos`)

Mosaico **contiguo sin huecos ni solapes**: cada periodo arranca el día siguiente al fin del anterior; el primero en la fecha de inicio, el último recortado al término. El corte de cada periodo:
- **mensual** = `masUnMes(inicio)` — **misma semántica que `date + INTERVAL '1 month'` y que la validación de la estimación** en `estimaciones.controller.js` (con clamp de fin de mes: 31-ene → 28-feb).
- **quincenal** = `inicio + 15 días`.

**Insight clave (alineación con HU-12):** como cada periodo cumple por construcción `fin ≤ masUnMes(inicio)`, **cada periodo generado ES un periodo válido de estimación** (art. 54). Verificado brute-force: 26 356 casos (cada día de 2027 y 2028 × 18 plazos × 2 ciclos + bordes bisiesto/fin-de-mes/cruce-de-año) → **0 fallos**. Ejemplo del profe: contrato de 365 días mensual → **12 periodos** exactos.

## 1.4 `guardarMatriz` — las 7 correcciones del red-team plegadas

`guardarMatriz(client, contratoId, celdas, { convenioId? })` (en `lib/programa.js`, llamado dentro de la transacción del alta y del `PUT`):

| # | Corrección | Cómo quedó |
|---|---|---|
| C1 | freeze por origen | sin `convenioId` = edición manual (se congela); con `convenioId` = **enmienda por convenio, exenta** (art. 99) |
| C2 | lock anti-TOCTOU | `pg_advisory_xact_lock(2, contratoId)` al inicio — **el mismo** que usa la integración de estimación |
| C3 | detección de freeze | `EXISTS(estimaciones WHERE estado <> 'rechazada')` (no `='integrada'`) |
| C4 | huérfanos | el alta traduce clave→id con `RETURNING` y rechaza claves/periodos inexistentes con 400 |
| C5 | reemplazo | `DELETE FROM programa_obra WHERE contrato_concepto_id IN (SELECT id FROM contrato_conceptos WHERE contrato_id=$1)` |
| C6 | una sola función | `guardarMatriz` única; el alta y el `PUT` traducen clave→id antes de llamarla |
| C7 | invariante en SQL | `HAVING SUM(cantidad) > cc.cantidad` sobre NUMERIC(14,3), **sin epsilon** (art. 118) |

## 1.5 Endpoints y UI

- **Alta (congelado, `contratos.controller.js`):** acepta `ciclo` + `programa` (celdas `{clave, periodoNumero, cantidad}`), genera periodos, traduce y llama `guardarMatriz`. Errores mapeados: `PROGRAMA_EXCEDE`/`PROGRAMA_AJENO`→400, `PROGRAMA_CONGELADO`→409.
- **Nuevos (no congelado, `programa.controller.js` + rutas en `contratos.routes.js`):**
  - `GET /api/contratos/:id/programa` → `{ciclo, periodos, conceptos, celdas, reconciliacion}` (acceso por participación).
  - `PUT /api/contratos/:id/programa` → reemplaza la matriz (solo el **residente asignado**; identidad del JWT). Acepta `convenioId` (hook de la futura HU-03 = enmienda art. 99).
- **UI (congelado, `AltaContrato.jsx`):** el tab "Programa de obra" pasó a ser la **matriz** (filas=conceptos, columnas=periodos, celda=cantidad), con **selector de ciclo**, **Σ planeado / contratado / restante por concepto recalculados en vivo** y **aviso de exceso que bloquea guardar** (validación en la vista, como pidió el profe).

## 1.6 "Periodo" para HU-12 (definición explícita pedida)

Una **estimación de HU-12 corresponde a un `contrato_periodos`** del contrato: su `periodo_inicio`/`periodo_fin` deben coincidir con `contrato_periodos.inicio`/`fin` de un `numero`. Como esos periodos cumplen `fin ≤ masUnMes(inicio)`, pasan tal cual la validación de art. 54 que ya tiene `estimaciones.controller.js`. La celda `programa_obra(concepto, periodo)` es la **cantidad planeada** contra la que la estimación de ese periodo podrá validarse.

> ⚠️ **Follow-on NO incluido en A2 (importante):** HU-12 hoy valida solo *acumulado ≤ contratado* (art. 118), **no** *estimado ≤ planeado-del-periodo*. Cablear esa segunda validación (estimación contra `programa_obra`) es lo que cierra del todo *"el programa valida las estimaciones"* del profe. Es un cambio acotado en `estimaciones.controller.js` (zona congelada) — **lo dejo propuesto, no hecho**, porque toca el core financiero y conviene revisarlo aparte.

## 1.7 Evidencia de pruebas (todo local, todo verde)

| Capa | Comando | Resultado |
|---|---|---|
| Migración idempotente | `psql -f schema.sql` ×3 | 3/3 OK; tablas+constraints+FK correctos |
| Algoritmo de periodos | `node scripts/verificar-periodos.js` | **26 356 casos, 0 fallos**; profe→12 periodos |
| Integración `guardarMatriz` | `node scripts/test-programa-obra.js` | **7/7** (cuadre; exceso art.118; freeze C1/C3; enmienda art.99) |
| Smoke HTTP del alta | (script temporal, ya borrado) | **9/9** (alta+matriz 201; GET 12 periodos; exceso 400; sin ciclo 400; PUT 200) |
| Build frontend (= CI) | `npm run build` | OK (467 módulos) |
| E2E de la matriz | `npx playwright test a2-programa-obra` | **2/2** (ciclo↔periodos; restante en vivo + bloqueo de exceso) |

## RUNBOOK de aplicación (para Maiki)

> **No despliegues sin revisar el patch.** Estos archivos están en tu working tree, sin commitear.

1. **Revisa el diff:** `git diff` (o `docs/A2_DIFFS.patch`) + los 5 archivos nuevos. Zona congelada tocada: `schema.sql`, `contratos.controller.js`, `contratos.routes.js`, `AltaContrato.jsx`.
2. **Local en limpio:** `docker compose down -v && docker compose up -d --build` → confirma que el seed levanta con el esquema nuevo (la migración corre en el primer `up`).
3. **Re-corre las pruebas:**
   ```powershell
   docker exec sigecop_backend node scripts/verificar-periodos.js
   docker exec sigecop_backend node scripts/test-programa-obra.js
   docker exec sigecop_frontend npm run build
   docker restart sigecop_backend   # tras cualquier edición de backend
   ```
   + `npx playwright test e2e/a2-programa-obra.spec.js` desde `frontend/`.
4. **Verifica código viejo sobre esquema nuevo:** que HU-01/08/12/21 sigan funcionando (el alta vieja sin `programa` sigue creando contratos; `ciclo` queda NULL).
5. **Migración a Render (cuando integres):** backup → `psql --single-transaction -v ON_ERROR_STOP=1 -f schema.sql` → smoke → push a `main` (auto-deploy). La migración es **aditiva e idempotente** (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`); no reescribe datos.
6. **Commit sugerido:** rama de Fundación, mensaje tipo *"A2 — programa de obra = matriz concepto×periodo (art. 45 fr. X / 54 / 118 / 99); C1–C7; deprecación de contrato_actividades"*.
7. **OJO no-A2:** `docs/Historias_Usuario.xlsx` aparece modificado en tu working tree, **pero NO es de esta corrida** (ya estaba así al iniciar). No lo incluyas en el commit de A2 si no es intencional.

---

# PARTE 2 — Prevención sistémica (los patrones del profe)

El profe repite las mismas clases de error. Aquí van las **10 reglas** destiladas del transcript + el respaldo, con su fundamento y certeza, y el **mapeo contra las 22 HU**.

> **Método:** el mapeo es mi análisis directo (auditoría read-only + transcript), cross-checkeado con un barrido de 16 agentes. **Filtré las citas inventadas** de los agentes (p. ej. atribuir las fianzas al "art. 48"; el plazo de garantías NO es art. 48) y su confusión de *"el prototipo simula la regla"* con *"la regla se hace cumplir"*. **Regla de oro:** los 15 prototipos son **dummy sin backend** → cualquier regla que requiera *hacer cumplir* hoy está **PENDIENTE (a construir)**, aunque la UI ya la "muestre".

## Checklist de prevención (las 10 reglas)

| # | Regla | Fundamento | Certeza |
|---|---|---|---|
| 1 | Validación = **regla de negocio que BLOQUEA / exige documento**, no banner. (anticipo>30% → PDF de autorización **obligatorio**; >50% → informar a la SFP) | art. 50 fr. IV LOPSRM; art. 139 RLOPSRM | alta (profe literal: *"no debe ser informativo... no se acepta"*) |
| 2 | **No exceder** lo autorizado ni **negativos** | art. 118 RLOPSRM | alta (*"menos dos metros no existe"*) |
| 3 | **Cuadre exacto al centavo** donde hay dinero (acepta periódicos para cuadrar) | art. 45 fr. IX RLOPSRM | alta |
| 4 | **Sustituir, no borrar** personas/históricos (1:N, solo uno activo) | art. 125 RLOPSRM | alta |
| 5 | Todo **anclado al catálogo** de conceptos (no texto libre); clave del usuario | art. 45 fr. IX y X RLOPSRM | alta |
| 6 | **Datos mínimos legales** por documento (apertura; tipos de nota por rol) | art. 123 fr. III; 122/125 RLOPSRM | alta |
| 7 | **Folios correlativos + inmutabilidad** (apertura = nota #1; append-only) | art. 123 fr. V–VI RLOPSRM | alta |
| 8 | Registro **nuevo vacío** (sin dummy); **identidad del JWT** (no del body); **token con expiración** | — | media [validar]: en parte es buena práctica, no ley |
| 9 | **Reglas de fecha** (apertura = día de inicio del contrato; plazos en **días naturales**) | art. 54 LOPSRM; 123 fr. III RLOPSRM | media-alta [validar nº de días] |
| 10 | **Tag/clave** para búsqueda eficiente donde la ley mezcla tipos (notas) | — (mejora; deriva de art. 125) | media |

## Mapeo regla × HU (qué toca, estado real, corrección horneable)

**Estado:** ✅ cumple · 🟡 parcial · 🔴 pendiente (a construir) · — no aplica.

| Regla | HU que toca | Estado hoy | Corrección concreta para cablear bien a la primera |
|---|---|---|---|
| **1** Validación bloqueante | HU-01 anticipo · HU-02 fianzas · HU-13/15 plazos · HU-20 suficiencia | HU-01 🟡 (avisos **informativos**, no bloquean ni exigen PDF) · resto 🔴 dummy | Anticipo>30%: **exigir PDF** de autorización (subida obligatoria) y **bloquear** sin él; >50%: además registrar el aviso a SFP. HU-20: bloquear pago si Σpagado+neto > techo. Hacer la regla en **backend** (no solo vista). |
| **2** No exceder / no negativos | HU-01 programa (**=A2**) · HU-06 avance · HU-12 estimación · HU-20 | HU-01 ✅ (A2) · HU-12 ✅ (art.118) · HU-06 🔴 · HU-20 🔴 | HU-06: `concepto_avance` con `Σ ejecutado ≤ contratado` en SQL (espejo de A2). Inputs `min=0`, sin negativos en todos. |
| **3** Cuadre al centavo | HU-01 catálogo · HU-12 carátula · HU-19 reportes · HU-20/21 pago | HU-01 ✅ · HU-12 ✅ · HU-19/20/21 🟡 (montos client-side) | Donde haya dinero, **derivar server-side** con `ROUND(...,2)` NUMERIC y comparar sin tolerancia (reusar el motor de A1/HU-12). |
| **4** Sustituir, no borrar | **Transversal/Fundación** (roster del contrato) → afecta HU-01/08 y cualquier edición de persona | 🔴 **incumple la ley hoy** (punteros escalares sin histórico; `contrato_roster` en borrador, NO aplicado) | Aplicar `contrato_roster` (1:N, *solo uno activo*) + endpoint `POST /contratos/:id/sustituir` transaccional que sincroniza el cache. **Alta prioridad legal.** |
| **5** Anclar al catálogo | HU-03 convenio · HU-05/06 avance · HU-09 nota de entrega · HU-13–17 estimación · HU-19 reportes | HU-09 🟡 (nota jala concepto parcial) · resto 🔴 dummy con texto/IDs inventados | Todo lo que mencione un concepto **lo jala de `contrato_conceptos`** (selector, no texto). HU-06/05 leen `programa_obra` (A2), **no** `contrato_actividades`. |
| **6** Datos mínimos legales | HU-08 apertura · HU-09 tipos de nota · HU-02 fianza | HU-08 🟡 (faltan datos mín. art.123 fr.III) · HU-09 🟡 (cobertura del **contratista**/fr.II) · HU-02 🔴 | HU-08: añadir a la acta los mínimos del art.123 fr.III (partes, domicilios/teléfonos, alcance). HU-09: completar tipos del **superintendente** (art.125 fr.II — la lista larga que leyó el profe). |
| **7** Folios + inmutabilidad | HU-08/09 ✅ · HU-02/11/13–20 (al construir) | HU-08/09 ✅ (folio atómico + triggers) · prototipos 🔴 | **apertura = nota #1** (folio consecutivo desde ahí); todo registro formal **append-only** por trigger, como bitácora/estimación/pago. |
| **8** Vacío + JWT + token | HU-01 (dummy precargado) · todas | identidad JWT ✅ en las 7 reales · token 8h ✅ · HU-01 🟡 (dummy precargado) · prototipos 🔴 | Quitar el dummy del alta (coordinar con la **remoción del modo proyecto**). Al cablear cada prototipo: `registrado_por`/etc. **del JWT**, nunca del body. |
| **9** Reglas de fecha | HU-08 apertura=día inicio · HU-02 vigencia · HU-13/15/20 plazos | HU-08 🔴 (no fuerza apertura = inicio) · resto 🔴 | HU-08: validar `fecha_apertura == contrato.fecha_inicio`. Plazos (art.54): **días naturales** derivados server-side (6/15/20), semáforos como en HU-21. |
| **10** Tag/búsqueda | HU-10 notas · HU-09 | HU-10 🟡 (busca, pero el profe pidió **tag** explícito) | Añadir un **tag/clave** capturable a la nota para filtrar por tipo combinado (la ley *"embebe"* tipos en fr.II); índice para la búsqueda. |

**Las 7 HU reales (HU-00/01/08/09/10/12/21):** cumplen 2,3,5,7,8 en su núcleo; **les falta**: regla 1 (anticipo bloqueante, HU-01), regla 4 (sustitución, transversal), regla 6 (datos mín. apertura + tipos del contratista), regla 9 (apertura=día inicio).

## Cómo HORNEARLO (specs por equipo + CLAUDE.md)

1. **CLAUDE.md** — agregar una sección *"Reglas de oro de dominio (Nivel 1)"* con estas 10 reglas en una línea cada una + el artículo. Code la lee solo en cada sesión → cada HU se construye con ellas presentes.
2. **Prompts por equipo** (`Prompts_Accion_Equipos_SIGECOP.md`) — pegar al pie de cada prompt el subconjunto de reglas que tocan a ese equipo (E2: 1,2,5,6,7,9; E3: 1,2,3,5,7,9).
3. **Specs e2e como contrato de prevención** — por cada prototipo, antes de cablear, escribir 1 spec que **falle hoy y deba pasar** tras el cableado: "no deja exceder", "exige PDF", "jala del catálogo, no texto libre", "campo nuevo vacío". Patrón: el de `a2-programa-obra.spec.js` (validación en la vista).
4. **Backend reutilizable** — exponer helpers compartidos (como `lib/programa.js`): un `validarNoExcede(...)`, un `derivarMontoCentavos(...)`, el patrón append-only, para que cada equipo los reuse en vez de reinventar.

> Esto es **propuesta/reporte**: **NO** se modificó ninguna de las 15 HU prototipo.

---

# PARTE 3 — Evaluación crítica del respaldo (.md) y el .txt

## 3.1 Qué está MAL o desactualizado en `SIGECOP_contexto_respaldo.md`

1. **Contradicción del esquema partido (§7):** el respaldo lista como pendiente *"partir el esquema (`00_core/10_equipo2/20_equipo3`)"*, pero la decisión **D-1 ya resolvió lo contrario**: **UN solo `schema.sql`, autor único Maiki, NO se parte** (Plan_Particion §0.1 y CLAUDE.md). El respaldo se contradice; el modelo vigente es 1 archivo. **Corrige el respaldo** o confundirá a los equipos.
2. **A2 "diseñado, no construido" (§6):** cierto cuando se escribió; **ahora A2 está construido y probado** (esta corrida). Actualizar.
3. **"El borrador NO incluye las tablas de A2":** ya no — quedó registrado en `Borrador_DDL` (Parte A2). Actualizar.
4. **Equipos del §7 vs Plan_Particion:** el respaldo asigna *"Equipo 2 = Contrato (HU-02,03,04,05,07,11)"* y *"Equipo 3 = Estimación→Pago (HU-06,...)"*, **pero** `Plan_Particion`/`Prompts` ponen **HU-05/06 en Equipo 2** (avance físico, leen catálogo+notas). Hay **dos particiones distintas en circulación** (¿2 equipos? ¿3?). El respaldo dice "3 mini-equipos de 2" pero el Plan habla de Equipo 2 y Equipo 3 (+ Fundación). **Unifica la partición antes de repartir** o habrá choques de dominio.

## 3.2 Qué del .txt (profe) podría NO haber capturado el chat

- **El programa VALIDA las estimaciones (no solo "cuadra"):** el profe fue enfático — *"si no tienes esto no vas a poder validar estimaciones"*. El respaldo lo menciona como meta, pero **nadie marcó que HU-12 hoy NO valida estimado ≤ planeado-del-periodo** (solo art. 118 acumulado). Es el follow-on que dejé señalado en §1.6 — **es la mitad del punto del profe** y no estaba listado como gap.
- **`contrato_actividades` deja huérfana a HU-05:** la curva de avance (HU-05, `CurvaAvance.jsx`) está pensada sobre el modelo viejo. Al deprecarlo, **HU-05 debe releerse desde `programa_obra`** — no vi esto anotado en el respaldo.
- **Tipos de nota del contratista (art.125 fr.II):** el profe **leyó la lista larga** (solicitud de modificaciones, de estimaciones, ajuste de costos, conceptos no previstos, convenios, aviso de terminación...) y reclamó que el sistema solo ofrecía "solicitud". El respaldo lo menciona en una línea, pero conviene **subrayar que es una lista, no un tipo**.
- **Apertura = nota #1 con folio:** *"¿Cuál es la primer nota? La de la apertura, es la 1"* — el respaldo lo tiene, pero hoy `bitacora_aperturas` y `bitacora_notas` son tablas separadas; **verificar que el folio de notas arranque contando la apertura como #1** (no como #0/aparte).

## 3.3 Qué propongo YO que el chat no listó

1. **Anclar los periodos a `masUnMes` (no a chunks de 30 días):** lo implementé así a propósito para que **cada periodo generado sea automáticamente un periodo válido de estimación** (art. 54). Es la pieza que hace que A2 y HU-12 encajen sin código extra; el plan decía "algoritmo verificado" pero no esta **alineación**.
2. **Freeze como lógica de aplicación, no trigger:** para poder permitir la **excepción de enmienda por convenio (art. 99)**. Un trigger de BD sería demasiado rígido.
3. **Cierre Render 25-jun = riesgo de cronograma real:** con A2 recién hecho y HU-05/06/03 detrás, más sustitución de personas (legal) y CI rojo, **prioriza**: (1) sustitución de personas (legal, defensa), (2) cablear HU-12↔programa (cierra el punto del profe), (3) limpiar specs/CI. A2 ya no bloquea.
4. **CI rojo no lo arregla A2:** mis specs nuevas pasan, pero la suite sigue roja por las ~20 specs de modo proyecto. **No mezcles** "A2 verde" con "CI verde".
5. **Decisión "distribuir todo vs parcial":** la dejé como **parcial permitido** (red-team) pero **el dibujo del profe distribuye todo**. Esto **cambia si es error o aviso** — va a PART 4.

---

# PARTE 4 — Decisiones Nivel 1 abiertas (para tu reunión con el profe)

Parametrizables mientras tanto; **no las decide Code**.

| # | Decisión | Estado / default actual | Qué confirmar con el profe / ley |
|---|---|---|---|
| D-A | **CMIC / 2 al millar** | NO está en el esquema; sería `ALTER estimaciones +retencion_cmic` (parametrizable, DEFAULT 0) | Base **LFD / aportación CMIC** (NO LOPSRM). El profe **confirma que VA** (*"aportación para capacitación a la CMIC/IMIC... lo van a ver en la estimación"*); falta la **tasa** y si aplica en Etapa 1. **Si entra, meterla también al trigger `sigecop_estimacion_inmutable`.** [validar tasa] |
| D-B | **Plazo de firma de notas** | `bitacora_aperturas.plazo_firma_dias DEFAULT 2` (días naturales); aceptación tácita al vencer | El profe: *"días naturales... está en la ley... hay que checarle cuántos días son o se establecen previo acuerdo"*. art. 123 fr. III RLOPSRM fija la **aceptación tácita** pero el **número** parece quedar a convenio. **Confirmar: ¿número fijo en ley o por acuerdo?** [validar art.+nº] |
| D-C | **Programa: ¿distribuir TODO o parcial?** | Hoy **parcial permitido** (solo bloquea exceso, art. 118) | El **dibujo del profe distribuye todo** (Σ=contratado). ¿Σ debe ser exactamente lo contratado (error si no), o parcial/Σ=0 con aviso? **Decide el profe.** |
| D-D | **Convenios modificatorios (HU-03)** | No construido; depende de A2 (ya hecho) | Alcance **art. 59 / 59 Bis** LOPSRM: ¿qué versiona (monto/plazo/conceptos)? ¿re-genera periodos del programa? [validar alcance] |
| D-E | **Notificaciones (U3)** | Hoy solo indicadores in-app (semáforos derivados) | ¿Etapa 1 = solo in-app? ¿Email/push = Etapa 2? El profe pidió notificaciones pero no en esa historia. |
| D-F | **Anticipo >50% → SFP** | Hoy informativo | El profe ya decidió: **permite pero exige PDF**; ¿además el sistema debe *registrar/evidenciar* el aviso a la SFP o basta el PDF? [validar] |
| D-G | **Catálogos de dependencias/afianzadoras; supervisión como empresa** | Texto libre hoy | El profe: *"lo ideal sería que estos fueran catálogos contra esta dependencia"*. Mejora (prioridad baja) — ¿entra en Etapa 1? |
| D-H | **Folio del contrato** | Captura del usuario, UNIQUE | El profe lo **CONFIRMÓ** (*"es captura, no tengo que restar"*). Solo ratificar. ✅ |

---

*Fin del entregable. Diffs en `docs/A2_DIFFS.patch` + 5 archivos nuevos. Nada commiteado/desplegado; `main` intacto.*
