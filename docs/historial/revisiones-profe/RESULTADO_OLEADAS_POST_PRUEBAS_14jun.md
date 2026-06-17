# Resultado — Plan de correcciones post-pruebas (oleadas A/CITAS/B/PAGO/C) · 14-15 jun 2026

> Ejecución de `docs/contexto-claude/PLAN_CORRECCIONES_POST_PRUEBAS_14jun.md` de inicio a fin.
> **LOCAL, sin commit/push** (Maiki revisa el diff e integra). Verificado con la suite Playwright + `vite build`
> + revisión adversarial por oleada (workflow de 6 agentes).
>
> **Método:** las 5 oleadas obligatorias se implementaron y verificaron. Cada cambio en **zona congelada** se
> hizo solo donde el plan lo autoriza y es **comentario/cita o el gate explícito**; se listan abajo para tu
> revisión línea por línea.

---

## Qué se hizo, por oleada

### OLEADA A — bugs de frontend (P2, P3) · 🟢 seguro
- **Apertura duplicada (P2):** la nota #1 ya no se pinta dos veces — se quitó del libro (`EmisionNotas.jsx`) y se
  conserva solo en su panel dedicado, al que se le añadió un botón **“Ver como documento”** (`btn-doc-apertura`).
  El contador “Ver bitácora (N)” ahora cuenta solo las notas además de la apertura.
- **Documento de la apertura “pendiente” (P2):** `DocumentoNota.jsx` ahora recibe `aperturaFirmantes` y, cuando la
  nota es de tipo `apertura`, muestra las **firmas reales** de la firma conjunta (antes salía todo “Pendiente”,
  porque la nota #1 tiene `firmado_en=NULL` por diseño). Cableado en `EmisionNotas.jsx`, `ConsultaNotas.jsx` (HU-10)
  e implícitamente seguro en `IntegracionEstimacion.jsx` (que ya excluye la apertura).
- **Total del expediente doble-contado (P3):** `ConsultaExpediente.jsx` excluye del “Total neto estimado” las
  estimaciones `rechazada` (su reingreso HU-16 ya aporta su neto → no se cuenta dos veces). Las rechazadas se
  siguen mostrando por trazabilidad.
- **Archivos:** `EmisionNotas.jsx`, `DocumentoNota.jsx`, `ConsultaExpediente.jsx`, `ConsultaNotas.jsx`.

### OLEADA CITAS — citas legales (sin cambiar cálculos) · 🟢 + 🔴 comentarios congelados
Mapeo corregido y verificado contra los PDF (`docs/legal/`):
- **Amortización proporcional de la carátula/estimación → `art. 143 fr. I RLOPSRM`** (ya no 138).
- **Plan de aplicación del anticipo capturado en el alta → `art. 138 párr. 3 RLOPSRM`** (conserva 138).
- **Penas por atraso / retención por atraso → `art. 46 Bis LOPSRM + arts. 86-90 RLOPSRM`** (ya no 138/139).
- **IVA → `art. 2 fr. XIX RLOPSRM`** (ya estaba correcto, sin cambios).
- **`art. 139 RLOPSRM` (anticipo > 50% → aviso SFP)** se **conserva** donde aplica (`AltaContrato.jsx:588`).
- **Archivos:** `IntegracionEstimacion.jsx`, `AltaContrato.jsx`, `ConsultaExpediente.jsx`, `reportesContrato.js`,
  `programa.controller.js`, `ESTADO_ACTUAL.md`, specs `o2-plan-amortizacion`, `estimacion-pantalla-unica`,
  `estimacion-retencion-atraso`; + comentarios en `estimaciones.controller.js` y `contratos.controller.js` (🔴 congelado).
- **Verificación de completitud:** `git grep "138/139|138 fr. I"` sobre `*.js *.jsx` y `ESTADO_ACTUAL.md` → **VACÍO**.

### OLEADA B — nota automática de estimación (art. 125 RLOPSRM) · 🟢 seguro (no congelado)
- En `estimaciones-ciclo.controller.js` (dominio E3, no congelado):
  - **Al PRESENTAR** (HU-13): nota `sup_estimaciones`, emisor = superintendente — *“Solicitud de aprobación de
    estimaciones”* (**art. 125 fr. II-b**).
  - **Al AUTORIZAR** (HU-15): nota `res_estimaciones`, emisor = residente — *“Autorización de estimaciones”*
    (**art. 125 fr. I-b**).
  - Ambas: atómicas (envuelto en transacción), se **ligan** a la estimación (`estimacion_notas`), y si **no hay
    bitácora abierta** simplemente **no se asientan** (no se difieren ni bloquean la transición). Tipos ya existían
    en `bitacora_nota_tipos` (sin DDL). Candados de estado (`WHERE estado=…`, `EXISTS turnado`) intactos.

### OLEADA PAGO — candado estricto a solo “Autorizada” (art. 54) · 🟢 seguro (no congelado)
- En `pagos.controller.js`: el pago **solo procede** con `estado === 'autorizada'`; pagar una `integrada`/`enviada`
  → **409** citando art. 54. Cálculo del importe (= neto), no-doble-pago, `FOR UPDATE` y `fecha_pago ≥ integrada_en`
  intactos.

### OLEADA C — gate de rol cruzado del roster (P1) · 🔴 toca `usuarios.routes.js`/`usuarios.controller.js` (autorizado por el plan)
- **`usuarios.routes.js`:** `/usuarios/asignables` pasa de `requireRole('residente')` a
  `requireRole('residente','dependencia')` (los dos roles que operan la sustitución, según `App.jsx`). El resto de
  `/usuarios/*` (listar, aprobar, rechazar) **sigue exclusivo de dependencia**.
- **`usuarios.controller.js`:** `ROLES_ASIGNABLES += 'residente'` (aditivo, solo expone datos públicos) para que el
  slot residente liste por el mismo endpoint.
- **`RosterContrato.jsx`:** los 3 slots usan `/asignables`; se **eliminó el `.catch(()=>[])` silencioso** → ahora un
  403 se muestra (`sust-elegibles-error`) en vez de un selector vacío engañoso.
- **No se tocó** `permisos.js`, `auth.middleware.js`, `App.jsx`.

---

## Revisión adversarial (workflow, 6 agentes) — veredicto

| Oleada | Veredicto | Hallazgo |
|---|---|---|
| A | ✅ correcto | (1 minor ya **CORREGIDO**: `ConsultaNotas.jsx` HU-10 no pasaba `aperturaFirmantes` → arreglado) |
| CITAS | ✅ correcto | mapeo legal correcto en los 10 archivos; 0 residuos; (1 nit de scope, sin defecto) |
| B | ✅ correcto | transacción/emisor/fracción/guard-sin-bitácora/liga correctos; sin fugas de client |
| PAGO | ✅ correcto | candado estricto + orden de checks + cálculo intacto |
| C | ✅ correcto | gate exacto (no sobre-expone administración); 403 ya no silenciado (2 nits de comentario **corregidos**) |
| FROZEN + completitud | ✅ correcto | en archivos congelados solo cambios autorizados; **0 citas obsoletas** restantes |

---

## Cambios en ZONA CONGELADA (revisar línea por línea antes de integrar)

> Todos son **comentario/cita** o el **gate autorizado** por la Oleada C. **Ninguna lógica de cálculo (G1-G8),
> auth, ni schema** se tocó.

- `backend/src/controllers/estimaciones.controller.js` — 3 comentarios de cita (amortización 138→143; pena 138/139→46 Bis+86-90).
- `backend/src/controllers/contratos.controller.js` — comentario pena (→46 Bis+86-90); comentario plan (→138 párr.3);
  string del mensaje de error del plan de amortización (→“138 párr. 3”; sigue conteniendo “138”, el spec o2 no se rompe).
- `backend/src/routes/usuarios.routes.js` — gate `/asignables` → `requireRole('residente','dependencia')`.
- `backend/src/controllers/usuarios.controller.js` — `ROLES_ASIGNABLES += 'residente'` + mensaje 400 + comentario.

> `schema.sql` **no se tocó** (sus comentarios con 138 quedan a tu criterio; no estaban en el alcance del plan).

---

## Verificación

- **`vite build`** (check de CI): ✅ 478 módulos, build OK (solo el warning pre-existente de tamaño de chunk).
- **`node --check`** en los 7 controllers/rutas editados del backend: ✅.
- **Specs dirigidos** (stack docker local, login real): **verde** — o7-flujo (incl. pago `integrada`→409),
  pago-fecha-integrada, hu-19-reportes, hu-04, hu-09, hu-10, o8-notas-estimacion, nota-fecha-hora,
  roster-sustitucion (8/8), hu-02-sustitucion, alta-personas-roster.
- **Specs actualizados** (lección 7 — documentaban conducta vieja):
  - `o7-flujo-estimacion.spec.js`: el test del “pago permisivo” pasa a afirmar el **rechazo 409** (estricto).
  - `pago-fecha-integrada.spec.js` y `hu-19-reportes.spec.js`: el seed ahora **presenta→turna→autoriza** antes de pagar.
  - `roster-sustitucion.spec.js`: el test que documentaba el bug P1 (lista vacía por 403) ahora afirma que el slot
    residente **sí** lista candidatos (bug corregido).
  - comentarios de cita en specs `o2`, `estimacion-pantalla-unica`, `estimacion-retencion-atraso`.
- **Suite completa:** ✅ **258 passed / 8 skipped / 0 failed** (7.6 min) — objetivo 258/8/0 cumplido.

---

## Lo que NO entra (opcionales/decisión, fuera de las 5 oleadas)

- **C3** (emisor de la nota DIFERIDA de hecho = actor original), **E1** (PDF de fianza HU-02), **E4** (regenerar
  periodos tras convenio de plazo), **B4** (2 al millar CMIC parametrizable) — opcionales, decisión de Maiki.
- **UX**: P5 (selector de periodo en estimación), P6 (columna clave en generadores), P7 (prellenar jurídicos),
  P9 (quitar buscador presentacional), P10 (link “Por firmar”) — “Oleada UX” sugerida tras la demo.
- **E2/E3 de equipos:** HU-11 minuta↔nota, generadores/soportes art. 132, HU-18/HU-20.

---

*Sin commit/push. Cambios listos para tu revisión del diff e integración.*
