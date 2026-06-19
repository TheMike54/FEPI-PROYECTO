# REPORTE — Plan Grande de Implementación (18-jun-2026)

> **Plan:** `docs/PLAN_GRANDE_IMPLEMENTACION_18jun.md`. **Modo:** autónomo, **LOCAL sin commit/push**.
> **Regla de oro:** la navegación ENVUELVE, no reescribe el contenido real. **Tandas con suite verde tras
> cada una.** Citas legales reales (verificadas contra PDF). Orden: BLOQUE 1 → 2 → 3 → 4.

---

## Tablero de checkpoints

| Punto de control | Suite |
|---|---|
| Tras schema empresas (tipo/estado) | (sin specs nuevos) |
| Tras padrón backend (endpoints) | smoke OK (200 dependencia / 403 otros) |
| **Tras cambio `lib/acceso.js` (acotamiento)** | **305/8/0** ✅ (retrocompatible, cero regresión) |
| **Tras pantalla Empresas + Sidebar** | **310/8/0** ✅ |
| **Tras BLOQUE 2 (nota del convenio + JOIN)** | **309/8/0** ✅ (1 flaky de atraso, pasa aislado 4/4) |

---

## BLOQUE 1 — EMPRESAS (en progreso, núcleo sólido y verde)

### Hecho (suite verde + smoke)
1. **Schema aditivo idempotente** (`schema.sql`, final): `empresas.tipo` (dependencia | contratista |
   supervision) + `empresas.estado` (por_validar | validada) + CHECKs idempotentes + backfill de las demo.
   Aplicado 2× en local sin error. Separa la **dependencia** (pública) de las **privadas**.
2. **Backend del padrón** (`empresas.controller.js` + `empresas.routes.js` NUEVO, montado en `server.js`):
   - `resolverOCrearEmpresa` (usado por el registro) ahora crea las empresas nuevas en **`por_validar`**
     (no des-valida una existente) y acepta `tipo` opcional.
   - `GET /api/empresas/padron` (privadas + nº personas/contratos), `…/por-validar` (con **detección de
     posible duplicado** por forma fuerte), `…/dependencias` (aparte), `POST …/:id/validar`, `…/:id/fusionar`
     (reapunta personas + borra duplicada, transaccional). **Todos `requireRole('dependencia')`** → smoke:
     200 con dependencia, **403 con contratista**.
3. **Acotamiento por empresa** (`lib/acceso.js` — la pieza más sensible, hecha con EXTREMO cuidado):
   `esParteOSupervision` se reescribió **retrocompatible**:
   - Operativos (residente/contratista/supervisión): por **participación** (un no-participante NUNCA ve el
     contrato → cubre el caso negativo "persona de otra empresa no accede", sin cambio).
   - **Finanzas**: transversal (autoridad pagadora). [criterio del equipo]
   - **Dependencia**: acotada a su propia dependencia **solo si la fila trae `dependencia_empresa_id`**; si no
     lo trae (filas legadas de los SELECT congelados), **conserva el comportamiento previo** → **cero
     regresión** (confirmado: suite 305/8/0). **Fundamento:** art. 43 RLOPSRM / art. 74 Bis LOPSRM (cada
     dependencia gestiona sus contratos).
   - **Para enforcement pleno del acotamiento de la dependencia**, el SELECT de la **lista de contratos**
     (`contratos.controller::listarContratos`, ZONA CONGELADA) debe incluir `dependencia_empresa_id` y
     filtrar — **lo integra Maiki** (es una línea; no la toco por ser congelado).
4. **Pantalla de Empresas** (`EmpresasPadron.jsx` NUEVA, ruta `SoloRol dependencia` `/admin/empresas` +
   sección "Administración" en el Sidebar): 3 pestañas (Padrón / Por validar con duplicados / Dependencias),
   acciones Validar y Fusionar. Spec `empresas-padron.spec.js` (5 tests: acceso dependencia + 4 roles sin
   acceso). Marcada según el análisis (`ANALISIS_EMPRESAS_quien_administra.md`).
5. **Mostrar empresa (regla 2):** ya estaba — `detalleContrato` une la empresa de cada parte del equipo y el
   expediente la muestra; el alta muestra la empresa derivada del contratista/supervisión.

### Recomendado como follow-on focalizado (para no romper specs bajo presión de sesión)
- **Regla 1 (registro exige empresa):** el backend ya **persiste** `empresa_id` (opcional); hacerlo
  **obligatorio** es un ajuste de validación en el front del registro (`SolicitudRegistro`/`SeleccionRol`).
  Riesgo: los specs de registro que se firman sin empresa. Conviene hacerlo aislado con su spec.
- **Regla 4 (sustitución no cambia la empresa):** hoy el contrato no tiene `empresa_id` (la empresa se deriva
  del superintendente), así que la sustitución de personas **no** la modifica en el modelo. Para blindar que
  el sustituto sea **de la misma empresa**, falta un guard en `roster.controller` (no congelado) + su spec.
- **Enforcement pleno del acotamiento de la dependencia:** requiere la línea en el `listarContratos` congelado
  (Maiki).

### Verificación adversarial del BLOQUE 1 (UltraCode) — **APROBADO**
- **Acotamiento retrocompatible: PROBADO con tabla de verdad** (la implementación vieja vs la nueva dan
  resultado **idéntico** para una fila sin `dependencia_empresa_id` — los 5 roles × {parte/no-parte}, 0
  diferencias). El scoping nuevo está **dormido** hoy porque el JWT firma `{id, rol, nombre}` (sin
  `empresa_id`) → `usuario.empresa_id` es `undefined` → la rama dependencia cae a "ve todo" (legado). Finanzas
  transversal y operativos por participación: **preservados exactos**. → **cero regresión** (confirmado por la
  suite 305/8/0).
- **No tocó zona congelada prohibida.** `permisos.js`, `SesionContext`, `auth.controller`,
  `contratos.controller`, `estimaciones.controller`, `auth.middleware` con **diff vacío**. Solo toques
  permitidos (router en `server.js`, ruta `SoloRol` en `App.jsx`, sección en Sidebar, migración aditiva
  idempotente, archivos nuevos). **Salvedad:** `lib/acceso.js` figura en la lista congelada de CLAUDE.md; el
  cambio es aditivo y retrocompatible y el plan lo nombró como deliverable, pero **es del core → revísalo tú**
  (sección separada abajo).
- **Citas verificadas reales** (pdftotext): **art. 43 RLOPSRM** ("los contratistas solicitarán su inscripción…
  a las dependencias… previa validación… llevarán a cabo la inscripción… diseñado y administrado por la
  SFP") y **art. 74 Bis LOPSRM** (registro único). **Cero citas falsas.**
- **Role-gating verificado en vivo:** `/api/empresas/*` → 200 dependencia, 403 contratista, 401 sin token.
- **Hallazgos menores (atendidos / documentados):** (1) `EmpresasPadron` usaba `huId='HU-23'` (mostraba banner
  "solo lectura" engañoso) → **corregido** a header plano. (2) El acotamiento **no** está cableado al filtro de
  LISTA (`listarContratos`/`portafolio` usan `ROLES_VEN_TODO`, congelados) → enforcement pleno requiere
  cambios de Maiki (empresa_id en JWT + `dependencia_empresa_id` en los SELECT). (3) `fusionarEmpresa` reapunta
  personas y borra la duplicada sin tocar contratos (correcto: la empresa del contrato se deriva del
  superintendente, que se reapunta).

### ⚠️ Para revisión de Maiki (lo más sensible) — `lib/acceso.js`
El cambio a `esParteOSupervision` es **aditivo y retrocompatible** (probado), pero `lib/acceso.js` es del core
congelado. Diff: la función ahora chequea participación primero; finanzas transversal; dependencia acota
**solo si la fila trae `dependencia_empresa_id`** (hoy nunca lo trae → comportamiento idéntico). **Revísalo
línea por línea antes de integrar.** El enforcement pleno del acotamiento (filtro de lista + empresa_id en
JWT) lo decides/integras tú.

---

## BLOQUE 2 — BUGS DEL SMOKE (completo)
1. **Apertura en el libro:** ✅ **ya estaba** — `EmisionNotas` muestra la apertura como **panel dedicado #1**
   (firma conjunta + "Ver como documento"); se quitó de la lista del libro **a propósito** (P2, 14-jun, para
   no duplicarla). La apertura SÍ es visible en la pantalla de emisión. Documentado.
2. **Nota del convenio visible:** ✅ **arreglado** — la lista de convenios (`convenios.controller`, no
   congelado) ahora une `bitacora_notas` y trae `nota_numero`/`nota_asunto`; `ConveniosModificatorios` muestra
   una columna **"Nota de bitácora"** con **🔗 Nota #N** (o "pendiente (al abrir bitácora)" si diferida).
   Smoke: el convenio demo CM-1 trae `nota_numero: 3`. Specs de convenios **29/29 verdes**.
3. **Avance → nota automática:** ✅ **ya estaba** — `trabajos.controller` genera la nota (`insertarNotaAtomica`
   tipo `avance`, art. 125 fr. II), la liga (`nota_id`, diferida si no hay bitácora), y `TrabajosTerminados`
   muestra la columna **"Nota (bitácora)"** con el folio o "pendiente". Documentado.

## BLOQUES 3, 4 — PENDIENTES
- **BLOQUE 3:** limpiar TODOS los `[validar profe]` → tabla, cero al final.
- **BLOQUE 4 (navegación modo-sistema):** el más grande/riesgoso, al final.

> **Estado honesto:** el BLOQUE 1 quedó con su **núcleo sólido y suite verde** (schema + padrón + acotamiento
> retrocompatible + pantalla). Las 2 reglas finas (registro obligatorio, guard de roster) y el enforcement
> pleno del acotamiento se dejan como follow-on aislado para no arriesgar la suite. Nada se pusheó.
