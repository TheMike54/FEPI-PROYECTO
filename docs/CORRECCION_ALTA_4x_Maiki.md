# Corrección del alta de contratos (Paquete 4.x) — Entregable para Maiki

**Fecha:** 2026-06-02 · **Autor:** Claude Code (Fundación) · **Para revisión de:** Maiki.
**Disciplina (igual que A2):** construido y **probado en LOCAL**; **sin commit/push/deploy**, **`main` intacto** (solo working tree → diffs). **Nivel 1 = ley literal + profesor** (audio 2026-06-01 en `docs/`). Lo interpretativo va **[validar]**; lo no verificable, **[no determinable]**. Code no es abogado.

> **Patch SEPARADO de A2:** `docs/CORRECCION_ALTA_4x_DIFFS.patch` (508 líneas, 4 archivos) contiene **solo** estas correcciones — se generó diffeando contra un snapshot del working tree **post-A2**, así que **no re-incluye los cambios de A2** aunque caigan en los mismos archivos. Archivo nuevo: `frontend/e2e/4x-alta-correcciones.spec.js`.

---

## 0. Resumen

| # | Corrección | Estado | Zona congelada tocada |
|---|---|---|---|
| 4.1 | Wizard: "Siguiente" por paso (gated por validación en vista) + "Guardar" solo al final + confirmación + no perder datos | ✅ hecho | `AltaContrato.jsx` |
| 4.2 | Errores que dicen DÓNDE + ensanche del `monto` que desbordaba | ✅ hecho (con diagnóstico) | `AltaContrato.jsx`, `contratos.controller.js`, `schema.sql` |
| 4.3 | Selector de ciclo de estimación | ✅ **ya estaba (lo trajo A2)** — verificado, sin cambio nuevo | (de A2, no de este patch) |
| 4.4 | Anticipo sobre umbral → exige/habilita PDF de autorización (no solo aviso) | ✅ hecho | `AltaContrato.jsx`, `api.js`, `contratos.controller.js`, `schema.sql` |

---

## 4.1 — Wizard: "Siguiente" por paso + "Guardar" solo al final

**Profe (literal):** *"¿no debería decir siguiente en lugar de guardar?… cuando llegue al 6 ya es guardar… me vas a hacer capturar todo y poner guardar está mal y me vas a borrar todo… validen en la vista."*

**Qué cambié (`AltaContrato.jsx`):**
- El alta es un **wizard** sobre los pasos de captura ya existentes: `0 Datos generales → 1 Catálogo → 2 Programa de obra → 3 Jurídicos → 4 Garantías/anticipo`. (Los pasos `5 PDF firmado` y `6 Registrados` son **auxiliares**, post-guardado.)
- Botón **"Siguiente →"** por paso. **No deja avanzar** hasta que el paso actual sea válido: refactoricé la validación monolítica en **`validarPaso(idx)`** (validación EN LA VISTA, por campo) y la disparo tanto en "Siguiente" como al hacer clic en una pestaña hacia adelante (`irAPaso`).
- **"Guardar contrato"** aparece **solo en el último paso de captura (4)**. Tras guardar, el botón se vuelve **"Adjuntar PDF firmado →"** (evita re-guardar y guía al PDF).
- Al pulsar Guardar: **popup de confirmación** `"¿Seguro de guardar el contrato?"`.
- **No se pierden los datos** al cambiar de paso (el estado del formulario vive en el componente; las pestañas solo cambian de vista). Se conserva el modal de **"¿Descartar los cambios?"** en *Cancelar* y se añadió un **aviso del navegador "¿seguro de salir?"** (`beforeunload`) ante recarga/cierre con cambios sin guardar.
- **[Marcado] Persistencia del borrador ante recarga completa = NO implementada** (opcional, como pediste). Tampoco se bloquea la navegación SPA a otra vista (saldría sin aviso si hace clic en el sidebar). Si lo quieres, es un follow-on (router blocker).

> **Nota de compatibilidad (importante):** en **modo demostración** (sin sesión real) no hay superintendente asignable (la API responde 403 sin token), así que el wizard **no puede gatear** ahí; por eso el **gating aplica solo con sesión real** y en demo la navegación es libre. Esto preserva los specs existentes (que corren en demo).

---

## 4.2 — Errores que dicen DÓNDE (+ diagnóstico del desbordamiento)

**Profe:** *"no me avisa dónde tengo el error… validen en la vista."*

### Diagnóstico (con evidencia, reproducido contra la BD real)

| Hecho | Evidencia |
|---|---|
| `contratos.monto` era **`NUMERIC(14,2)`** → tope **< 10¹²** | `information_schema`; `(1000000000000.00)::numeric(14,2)` → **22003** "precision 14, scale 2 must round to absolute value less than 10^12" |
| El **ejemplo exacto del profe** (C1 800×15 000, C2 6 000×33 333.33, C3 4 000×4 000 = **$228M**) **NO desborda** | `SELECT (SUM(ROUND(cant×pu,2)))::numeric(14,2)` → `227999999.80`, sin error |
| El desborde aparece con **obra grande**: 1 000 000 m² × $1 500 000 = **1.5×10¹²** | reproduce 22003 |

**Conclusión:** es un **valor legítimo que no cabe** (no captura inválida) → **ensanché la columna**. `contratos.monto` **`NUMERIC(14,2) → NUMERIC(18,2)`** (16 enteros, < 10¹⁶: holgura para cualquier obra real). Verificado: el contrato de 1.5×10¹² que antes daba 22003 **ahora guarda (201)** y el monto persiste exacto.

### Qué cambié
- **`schema.sql`** (Paquete 4.x): `ALTER TABLE contratos ALTER COLUMN monto TYPE NUMERIC(18,2)` (idempotente, guard por `information_schema`).
- **`contratos.controller.js`**: el cast del monto derivado pasó de `::numeric(14,2)` a `::numeric(18,2)` (en sintonía con la columna).
- **Mensajes que dicen DÓNDE** (nunca el error crudo): el handler de `22003` ahora dice *"Revisa la cantidad o el precio unitario de algún concepto, o que el monto total no sea demasiado grande."*
- **Validación por campo EN LA VISTA antes de avanzar** (4.1): `validarPaso(1)` revisa que `cantidad < 10¹¹`, `pu < 10¹²` y `monto derivado < 10¹⁶`, con mensaje específico por concepto. Así el usuario casi nunca llega al error de BD; el backend queda de respaldo.

---

## 4.3 — Selector de ciclo de estimación  (ya estaba: lo trajo A2)

**Verificado primero, como pediste.** A2 ya añadió el **selector mensual/quincenal** (`data-testid="select-ciclo"`) al inicio del paso *Programa de obra*, alimentando la generación de periodos (mensual → ~12 columnas en 365 días; quincenal → ~24). Fundamento art. 54. **No hay cambio nuevo en este patch** para 4.3 — pertenece al patch de A2 (`docs/A2_DIFFS.patch`). Lo dejo listado para que conste que el gap está cerrado.

---

## 4.4 — Anticipo sobre umbral → PDF de autorización (no solo aviso)

**Profe:** *"sí permite mayor al 50, pero tiene que haber un documento… que se dé la opción de subir un PDF, aprobación… responsabilidad del residente."*

**Qué cambié:**
- **Backend (reutiliza el patrón de PDF existente, BYTEA):** añadí `contrato_documentos.tipo` (`'contrato'` por defecto | `'anticipo_autorizacion'`) con CHECK + `UNIQUE(contrato_id, tipo)` → **dos PDFs por contrato, uno por tipo, cada uno inmutable** (el trigger append-only existente bloquea UPDATE; el "uno por tipo" lo cuida el controller + el UNIQUE). `subirDocumento`/`documentoMeta`/`descargarDocumento` aceptan `?tipo=` (default `'contrato'`, **compatibilidad total**). Sube **solo el residente asignado**. El sistema **NO valida el contenido** del PDF (responsabilidad del residente), solo lo guarda ligado.
- **Frontend:** en el paso de garantías, cuando el % de anticipo supera el umbral, el aviso **deja de ser informativo** y muestra el **uploader de la autorización** (`AnticipoAutorizacionPDF`, reusa `api.subirDocumento(id, file, 'anticipo_autorizacion')`). Como el contrato debe existir primero (igual que el PDF firmado), si aún no se guardó muestra *"guarda primero el contrato; luego adjunta la autorización"*; ya guardado, habilita la subida y refleja el estado adjuntado.

### [PARAMETRIZABLE — lo decide el profe, no Code]
- **Umbral exacto:** hoy `ANTICIPO_UMBRAL_PDF = 30` (art. 50 fr. IV LOPSRM: autorización escrita del titular > 30%). El profe dijo **30% y 50% en momentos distintos** — confirmar. El >50% (informar a la SFP, art. 139 RLOPSRM) se mantiene como aviso adicional.
- **¿Obligatorio o solo habilitado?** Hoy **habilitado + requerido visualmente**, **no bloquea el guardado inicial** (no puede: el PDF se adjunta *después* de crear el contrato, igual que el PDF firmado). Si debe ser bloqueante, hay que rediseñar el flujo (guardar en 2 fases). **Confirmar.**
- **¿Autorización de quién?** titular de la dependencia / SFP / residente — el texto legal habla del **titular** (art. 50 fr. IV); el profe mencionó *"responsabilidad del residente"*. **Confirmar contra el texto literal** del art. 50 LOPSRM. **[validar]**

---

## Decisiones parametrizables / para el profe (consolidado)

| # | Decisión | Default actual | A confirmar |
|---|---|---|---|
| 4.4-a | Umbral de anticipo que exige PDF | 30% (`ANTICIPO_UMBRAL_PDF`) | ¿30 o 50? (art. 50 fr. IV vs práctica) |
| 4.4-b | ¿PDF obligatorio (bloqueante) u opcional? | Habilitado/requerido, no bloquea el guardado | ¿Bloquear hasta adjuntarlo? (implica guardado en 2 fases) |
| 4.4-c | ¿Autorización del titular o del residente? | Texto dice "titular" (art. 50 fr. IV) | Verificar art. 50 LOPSRM literal **[validar]** |
| 4.2-a | Tope del monto | `NUMERIC(18,2)` (< 10¹⁶) | ¿Suficiente? (cubre cualquier obra real; subir más si lo pide) |

---

## Zona congelada tocada (yo, Fundación)

- `backend/src/db/schema.sql` — sección **"Paquete 4.x"** (monto→18,2; `contrato_documentos.tipo`).
- `backend/src/controllers/contratos.controller.js` — cast monto (4.2), mensaje 22003 (4.2), `tipo` en subir/meta/descargar (4.4).
- `frontend/src/pages/AltaContrato.jsx` — wizard (4.1), validación por campo (4.2), anticipo PDF (4.4).
- `frontend/src/services/api.js` — `tipo` en documento (4.4). *(no congelado, pero listado)*
- **NO** se tocó `contratos.routes.js` (el `tipo` viaja por query en las rutas existentes) ni nada de A2.

## Evidencia de pruebas (local, verde)

| Capa | Resultado |
|---|---|
| Migración 4.x idempotente ×3 | OK; `monto`→(18,2); `contrato_documentos.tipo` + CHECK + UNIQUE |
| Smoke HTTP 4.2/4.4 | **7/7** (contrato 1.5×10¹² → 201; monto exacto; 2 PDFs por tipo; meta por tipo; re-subida → 409) |
| `vite build` (= CI) | OK |
| E2E alta (hu-01 + a2 + 4x) | **6/6** *(tras corregir un TDZ que introduje, ver abajo)* |
| E2E HU reales (bitácora 08/09, estimación 12, pago 21) | **14/14 passed** (exit 0, sin regresión). *(Observación: estas 4 specs tardan ~15 min por esperas de `networkidle` en modo demo — pre-existente, no de este paquete; riesgo de timeout de CI, ya listado como "CI rojo" en el respaldo.)* |

> **Bug propio detectado y corregido:** al primer intento, el alta tronaba con `ReferenceError: Cannot access 'dirty' before initialization` (puse dos `useEffect` que referencian `dirty`/`contratoGuardadoId` **antes** de declararlos → TDZ en el array de dependencias). Lo moví después de las declaraciones; **6/6 verde en 9 s**. Lección: el error inflaba los e2e a timeouts de 30 s (de ahí una corrida previa lentísima).

## RUNBOOK de aplicación

1. **Revisa** `docs/CORRECCION_ALTA_4x_DIFFS.patch` + `frontend/e2e/4x-alta-correcciones.spec.js`. (Está separado de `A2_DIFFS.patch`.)
2. **Local limpio:** `docker compose down -v && docker compose up -d --build` (corre A2 + 4.x en el primer `up`).
3. **Pruebas:**
   ```powershell
   docker exec sigecop_db psql -U sigecop -d sigecop_db -c "\d contrato_documentos"   # tipo + uq_contrato_documentos_tipo
   docker exec sigecop_frontend npm run build
   # desde frontend/: e2e del alta + HU reales
   npx playwright test e2e/hu-01-alta-catalogo.spec.js e2e/a2-programa-obra.spec.js e2e/4x-alta-correcciones.spec.js e2e/hu-08-apertura-bitacora.spec.js e2e/hu-12-integracion-estimacion.spec.js e2e/hu-21-registro-pago.spec.js --reporter=list
   ```
4. **Verifica código viejo sobre esquema nuevo:** un alta sin anticipo y sin PDF de autorización sigue funcionando; los documentos existentes quedaron `tipo='contrato'`.
5. **Migración a Render:** aditiva e idempotente (`ALTER ... TYPE`, `ADD COLUMN IF NOT EXISTS`, guards). El `ALTER COLUMN monto TYPE` reescribe la tabla una vez (rápido en tablas chicas); con datos grandes, hazlo en ventana. Backup → `psql --single-transaction -v ON_ERROR_STOP=1` → smoke → push.
6. **No mezclar con el `.xlsx`:** `docs/Historias_Usuario.xlsx` sigue modificado en el working tree y **no es de esta corrida**.

---
*Fin. Diffs 4.x: `docs/CORRECCION_ALTA_4x_DIFFS.patch`. A2 (aparte): `docs/A2_DIFFS.patch` + `docs/A2_ENTREGABLE_Maiki.md`. Nada commiteado; `main` intacto.*
