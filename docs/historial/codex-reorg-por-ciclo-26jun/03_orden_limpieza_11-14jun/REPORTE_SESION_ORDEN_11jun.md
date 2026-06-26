# SIGECOP — Reporte maestro: sesión de orden, documentación y limpieza (11–12 jun 2026)

> Sesión **autónoma**, sin supervisión. **TODO local, sin commit/push** (Maiki revisa e integra).
> **No se tocó lógica de producción** (controllers, G1-G8, permisos.js, server.js, schema.sql, endpoints).
> El único cambio de código fue eliminar 2 piezas de **código muerto de riesgo cero** (ver Frente 4).
> Base: `main` = `5ad41a2` (tras integrar HU-19).

---

## 0. Resumen ejecutivo

| Frente | Resultado | Entregable |
|---|---|---|
| 1 · Ordenar `docs/` | ✅ | `docs/historial/` (7 subcarpetas), `docs/HISTORIAL_PROYECTO.md`, `README.md` reescrito |
| 2 · Actualizar historias | ✅ | `analisis-y-diseno/Historias_Usuario_ACTUALIZADAS_12jun.md` + `.xlsx` |
| 3 · Coherencia HU↔sistema | ✅ | `analisis-y-diseno/AUDITORIA_COHERENCIA_HU.md` |
| 4 · Código muerto | ✅ | `docs/AUDITORIA_CODIGO_MUERTO.md` + 2 limpiezas riesgo cero |
| Cierre · Suite e2e | ✅ | **258 passed · 8 skipped · 0 failed** (un fallo de HU-17 por datos acumulados, NO por mis cambios → reset de BD; ver §6) |

**Nada se borró** en docs/ (solo se movió/renombró). **Ninguna decisión irreversible** se tomó sin dejarla
anotada (§7). Las brechas que requieren tu decisión están en §8.

---

## 1. Frente 1 — Orden de `docs/`

**Antes:** 135 archivos, planes/duplicados/contextos repetidos mezclados en la raíz y en
`historial-cambios/`. **Después:** raíz de `docs/` limpia (solo índices + personales gitignored).

- Creada **`docs/historial/`** con 7 subcarpetas por fase: `fundacion/` (47), `oleadas/` (15),
  `revisiones-profe/` (4), `integraciones-equipos/` (2), `planes/` (3), `contexto/` (8 versiones
  superadas), `_duplicados/` (1).
- **76 `git mv`** (renames detectados por git, historia preservada). `historial-cambios/` quedó vacía y se
  removió. Cada `*_Maiki.md` viajó con su `*_DIFFS.patch`.
- **Versiones canónicas promovidas** a `contexto-claude/` (de las 4 copias del contexto de respaldo se dejó
  la más completa como `SIGECOP_contexto_respaldo.md`; las otras 3, fechadas, en `historial/contexto/`).
  Igual con la Guía de Pruebas E2E (nueva vs vieja-069a71d), la Matriz de Accesos (completa vs corta) y el
  Contexto Maestro (final vs superado).
- **Nuevo `docs/HISTORIAL_PROYECTO.md`**: índice maestro narrado, cronológico (análisis → fundación →
  planes → revisión profe → oleadas O0-O9/UI → integraciones), con enlace a cada doc de respaldo.
- **`README.md`** reescrito a la nueva estructura.
- **Inventario completo** de los 70 `.md`: lo produjo un workflow de 14 agentes (clasificación
  vigente/histórico/version-superada + fase); es la base del HISTORIAL_PROYECTO.

**Seguridad de datos sensibles (importante):** al mover los archivos que el `.gitignore` protege por nombre
(material del profe, credenciales, transcripción, backup del xlsx), verifiqué con `git check-ignore` que
**siguen ignorados en sus nuevas rutas**. Renombré el transcript a `…_transcript.txt` para que siguiera
matcheando el patrón. Los 5 sensibles confirmados fuera de git.

## 2. Frente 2 — Historias de usuario actualizadas

`docs/analisis-y-diseno/Historias_Usuario_ACTUALIZADAS_12jun.md` (+ `.xlsx`, 27 hojas, formato espejo del
original). **El `Historias_Usuario.xlsx` original queda intacto.**

- **Números conservados:** HU-00..HU-21 y las historias nombradas *Registro* y *Por Firmar* mantienen su
  identidad (no se renumeró nada de lo existente).
- **Funcionalidades nuevas sin ficha → siguiente número libre:**
  - **HU-22** · Sustitución de personas del roster (art. 125 fr. I g RLOPSRM).
  - **HU-23** · Catálogo de empresas (Oleada O3).
- Cada historia (vieja y nueva) trae rol real ejecutor, *Como/Deseo/A fin de*, **criterios concretos leídos
  del código real**, fundamento legal citado y `[validar profe]` donde es interpretativo.
- Insumo: auditoría de 26 agentes (uno por HU), cada uno leyendo página + controller + spec.

## 3. Frente 3 — Auditoría de coherencia HU ↔ sistema

`docs/analisis-y-diseno/AUDITORIA_COHERENCIA_HU.md`. Tabla por HU (criterio | construido ✅/🟡/❌ |
evidencia `archivo:línea` | nota) + lo que el sistema hace y la ficha no documentaba.

**69 criterios auditados → 35 ✅ · 27 🟡 · 7 ❌.** Las **7 brechas duras** (criterio de ficha NO construido)
están en §8 — ninguna se construyó (como pediste). El objetivo se cumplió: ya no hay "criterios fantasma"
sin rastrear como el del plan de amortización.

## 4. Frente 4 — Código muerto

`docs/AUDITORIA_CODIGO_MUERTO.md`. Barrido frontend/backend/raíz, **verificado adversarialmente**.

- **Eliminado (riesgo CERO, verificado + suite verde):** en `IntegracionEstimacion.jsx` (no congelado),
  residuos del layout viejo de pestañas — el `import Tabs` sin usar y la función `TabPlaceholder` sin
  invocar. `vite build` ✅ + spec HU-12 ✅ tras la eliminación.
- **NO tocado (dudoso → tu decisión):** 3 componentes UI huérfanos (`Card`, `Badge`,
  `CardCriterioAceptacion`), el wrapper `api.health` sin caller, y la carpeta `FEPI/` (ya gitignored).
- **No-tocar:** `BadgeSprint.jsx` (stub de compatibilidad intencional, retorna `null`).
- **Higiene:** añadí `.tmp_*` y `.work_*` al `.gitignore` (el scratch de sesiones se colaba porque `*.tmp`
  es por extensión, no prefijo). Los archivos scratch de esta sesión se eliminaron al cierre.

## 5. Cambios en el árbol (git status, sin commit)

- **76 renames** (reorg docs/) · **2 archivos de código modificados** (`IntegracionEstimacion.jsx` limpieza
  + `.gitignore`) · **5 docs nuevos** (HISTORIAL_PROYECTO, AUDITORIA_CODIGO_MUERTO, AUDITORIA_COHERENCIA_HU,
  Historias_Usuario_ACTUALIZADAS `.md`+`.xlsx`) · **README/Matriz/Guía** actualizados.
- **Cero** cambios en `backend/`, `schema.sql`, `server.js`, `permisos.js`, controllers, endpoints.

## 6. Cierre — Suite e2e (incluye un fallo investigado y su causa raíz)

**Primera corrida completa:** 257 passed · **1 failed** · 8 skipped. El fallo:
`hu-17-tablero.spec.js:66` ("grid muestra las 4 estimaciones … EXCLUYE la rechazada").

**Diagnóstico (NO es mi cambio):** el assert que falla es la **métrica agregada**
`contador-estado-rechazada`, que esperaba `1` y recibió `6`. El grid SÍ excluyó bien la rechazada del
contrato sembrado (ese assert pasó). El contador cuenta las rechazadas del residente **a través de todos
sus contratos**, y la BD local llevaba **34 h acumulando** datos de corridas previas (722 contratos
acumulados). Verificado por SQL: **5 estimaciones `rechazada`** de contratos viejos donde el residente es
parte + **1** que siembra el propio test = los **6** del contador.

> Mi única modificación de código fue quitar código muerto en `IntegracionEstimacion.jsx` (**página de
> HU-12**), que ni se carga en el test de HU-17 ni puede crear estimaciones. Imposible que sea la causa.
> Es **fragilidad pre-existente** del test ante datos acumulados (el contador es global al residente).

**Acción (la sancionada por el proyecto): reset de la BD local.** Confirmé que es seguro —las 6 cuentas
demo y el esquema completo viven en `schema.sql`, montado en `docker-entrypoint-initdb.d`, así que un
volumen fresco las recrea solas— y que ningún seed que corre antes de HU-17 deja rechazadas sin limpiar
(hu-14 tiene unseed; hu-15-revision no crea rechazadas; o7-flujo corre después). `docker compose down -v
&& up --build` → BD fresca (1 contrato demo, 0 estimaciones, 6 cuentas) → re-corrida de la suite.

**Resultado final: 258 passed · 8 skipped · 0 failed** ✅ — exactamente el objetivo. Confirma que la única
modificación de código (limpieza de código muerto) no alteró comportamiento, y que el fallo de la primera
corrida era 100% datos acumulados. Stack local arriba y limpio (1 contrato demo).

## 7. Decisiones que tomé y por qué

1. **Estructura `historial/` por fase** (no por fecha plana): el proyecto tiene fases claras (fundación →
   oleadas → integraciones) y agrupa mejor para entender la historia. Las pasadas de fundación y las
   oleadas son las dos masas grandes; cada una su carpeta.
2. **Conservar duplicados en `_duplicados/` y versiones viejas en `historial/contexto/`** en vez de
   borrarlas (lo pediste): nada se pierde, pero la raíz queda limpia. Elegí la "versión vigente" de cada
   familia comparando contenido (no solo fecha de commit), p. ej. el contexto de respaldo más completo.
3. **HU-22/HU-23 para roster y empresas**: son las únicas dos funcionalidades construidas sin ficha. Tomé
   el siguiente número libre tras HU-21 sin tocar las existentes. *Registro* y *Por Firmar* ya tenían
   historia (aunque sin número), así que las dejé como están.
4. **Entregables de historias en `.md` Y `.xlsx`**: el `.md` es más fácil de revisar y enlazar; el `.xlsx`
   respeta el formato del profe. Generé ambos desde la misma fuente auditada; el original intacto.
5. **Limpieza de código muerto: solo los 2 de riesgo cero**, ambos en una página no congelada, ambos
   confirmados por un segundo agente adversarial y por `vite build` + spec. Los componentes UI huérfanos
   los dejé como *dudoso* porque son piezas de un sistema de diseño que podrían cablearse — borrarlas es tu
   decisión, no riesgo cero.
6. **`.gitignore` `.tmp_*`/`.work_*`**: cambio de orden, no de producción; evita que el scratch de sesiones
   se cuele al repo. Bajo riesgo y reversible.
7. **No regeneré `Fichas_Trazabilidad.md` ni la matriz `matriz_DEFINITIVA.xlsx`**: quedan como estaban
   (foto vieja). La fuente de verdad actualizada es `Historias_Usuario_ACTUALIZADAS` + `AUDITORIA_COHERENCIA`.
   Actualizarlas sería trabajo adicional que conviene que decidas tú.
8. **Reset de la BD local (no de código) ante el fallo de HU-17** (§6): tras confirmar que el fallo era
   datos acumulados (no mi cambio) y que el reset es seguro (cuentas demo en `schema.sql`), reseteé el
   volumen en vez de "arreglar" el test. **NO toqué el test ni el código de HU-17** (es de E3 y modificarlo
   sería cambiar lógica). *Recomendación:* el test del contador es frágil a datos acumulados; valdría la
   pena que E3 lo acote al contrato sembrado (no a la métrica global del residente) — anotado en §8.2.

## 8. Brechas y recomendaciones que requieren TU decisión

### 8.1 Criterios de ficha NO construidos (de la auditoría de coherencia)
| HU | Criterio no construido | Recomendación |
|---|---|---|
| HU-02 | Póliza de fianza consultable como PDF desde el listado | El modal solo guarda el **nombre** del archivo, no lo sube. Decidir: construir subida real de PDF de fianzas, o ajustar la ficha. |
| HU-04 | Descarga **individual** de documentos por bloque | Sustituida a propósito en O9 por **un PDF único** del expediente. Confirmar con el profe que el entregable único satisface el requisito. |
| HU-07 (×3) | Alertas configurables (crear/pausar), umbral del usuario, canal de notificación | HU-07 se **rediseñó** en O5 a panel automático de déficit (decisión del profe). La ficha vieja quedó obsoleta: **ajustar la ficha** al nuevo diseño (ya hecho en la versión actualizada). |
| HU-11 | Adjuntar minuta/visita como referencia en una nota | NO construido; la columna `minutas.nota_id` existe pero está huérfana. Decidir si se construye el vínculo o se quita el criterio. |
| HU-13 | Botón "Enviar" se bloquea al vencer los 6 días | Degradado a **aviso no bloqueante** (permite presentar fuera de plazo). Confirmar con el profe si debe bloquear o solo avisar. |

### 8.2 Otras recomendaciones
- **Test frágil `hu-17-tablero.spec.js:66`**: el assert del contador `contador-estado-rechazada` espera
  exactamente `1`, pero la métrica es **global al residente** (cuenta rechazadas de todos sus contratos),
  así que cualquier dato acumulado en la BD lo rompe. *Recomendación (E3):* acotar el assert al contrato
  sembrado o usar `>= 1`, no `== 1`. Hoy se sostiene reseteando la BD antes de la corrida.
- **Higiene de BD de prueba**: 722 contratos acumulados en 34 h de corridas. Conviene resetear el volumen
  (`down -v && up --build`) periódicamente, o que los seeds `o7-flujo`/etc. limpien en `afterAll`.
- **Componentes UI huérfanos** (`Card`, `Badge`, `CardCriterioAceptacion`): cablear o borrar en un PR aparte.
- **HU-00**: el bloqueo de "campos vacíos" en login es solo server-side (400); valorar candado de cliente.
  Y la asimetría de normalización de email (registro en minúsculas, login tal cual) — posible bug de UX.
- **Decisiones legales abiertas** que la auditoría volvió a marcar `[validar profe]`: amortización Fase B
  (carátula vs plan), gate de pago permisivo, ancla de periodo de reportes, fundamento pena por atraso
  138/139 RLOPSRM, 2 al millar CMIC. Ya estaban en tu lista; las consolidé por HU en los nuevos docs.

## 9. Para integrar (cuando revises)

Todo está **local, sin commit**. Sugerencia de revisión: (1) `git status` para ver los 76 renames + 5 docs
nuevos; (2) hojear `docs/HISTORIAL_PROYECTO.md`; (3) revisar la limpieza de `IntegracionEstimacion.jsx`
(`git diff`); (4) decidir las brechas de §8. No hay DDL ni cambios de backend.
