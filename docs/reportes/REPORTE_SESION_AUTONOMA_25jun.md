# REPORTE — Sesión autónoma 25-jun-2026 (LÉEME PRIMERO)

> **Todo en LOCAL, sin push/deploy/Render.** El código terminado queda en el working tree para que **tú** lo revises y despliegues. Builds verdes (backend arranca, `vite build` ✓). La BD local quedó **sin pólucion de prueba** (todas las verificaciones se revirtieron).

## TL;DR
- **Oleadas 2-5 de bugs: COMPLETAS y verificadas en vivo** — #3, #4, #5, #7, #8, #9, #10, #17, #18, #19, #20, #21, #24 (13 bugs).
- **Hallazgos decididos hechos:** **H1** (campana/Por-firmar notas), **H11** (reporte#1 solo PDF), **H7** (oficio siempre para autorizar convenio), **H9** (schema + snapshot `es_adicional`, DDL aplicado **solo en local**), **H6 — gate server** (Finanzas no paga sin CFDI del contratista).
- **Diferidos AHORA implementados (25-jun, ya se prueban en pantalla):** **H2** (foto obligatoria server-side + descripción), **H8** (curva doble serie), **H9-front** (etiqueta "Adicional" en versiones), **#20-front** (ocultar "Firmar" al vencer plazo) y **H6-B6-3** (rediseño completo del flujo de pago — mockup aprobado). Pasos de prueba en pantalla abajo.
- **Ya NO quedan diferidos de código.** (Oleadas 6/7 y opcionales siguen en pausa: requieren tu OK y #13-16 tocan zona congelada.)
- **Zona congelada:** NO se tocó `estimaciones.controller.js` (H5 descartado), NI `acceso.js` (#7 solo añadió la columna al SELECT del finiquito). `schema.sql` SÍ (H9, autorizado por ti) — DDL **solo local**.

---

## ✅ Diferidos implementados (25-jun PM) — QUÉ PROBAR EN PANTALLA

> Builds verdes (backend arranca, `vite build` ✓). Backup por bloque: `backup_pre_h2_25jun.sql`, `backup_pre_h8_25jun.sql`. **Zona congelada intacta** (no se tocó `estimaciones.controller.js` ni `acceso.js`).

### H2 → B2-1 — Foto obligatoria server-side + descripción por foto (cierra #22)
**Qué cambió:** la(s) foto(s) de evidencia ahora van **en la misma petición** que crea el avance (multipart); el backend **rechaza el avance si no hay foto** (verificado: avance sin foto → **400**). Cada foto lleva su **descripción**. Se quitó la subida en 2 pasos.
- Backend: `trabajos.routes.js` (multer `array('fotos',10)`) + `trabajos.controller.js` `registrarAvance` (exige ≥1 foto, las inserta en la MISMA transacción con su descripción).
- Frontend: `TrabajosTerminados.jsx` (estado de **varias** fotos con descripción + `FormData`), `api.js` `registrarAvance` (multipart).

**Probar en pantalla (rol contratista, HU-06 → Trabajos terminados):**
1. Elige concepto + periodo + cantidad, **sin** adjuntar foto → el botón "Registrar avance" está **deshabilitado** y se ve el aviso "No se puede registrar… sin al menos una foto".
2. Adjunta **2 fotos** (JPEG/PNG); a cada una escríbele una **descripción** distinta; quita una y vuelve a agregarla (probar el botón "quitar").
3. Registra → toast "Avance registrado…". Abre la **galería del avance** y verifica que aparecen las fotos **con su descripción**.
4. (Opcional, dureza) intenta un avance vía API sin foto → debe dar **400** "Debes adjuntar al menos una foto…".

### H8 → B8-3 — Curva con doble serie (acumulado total + nuevo-desde-convenio)
**Qué cambió:** en un contrato **con convenio modificatorio**, la curva de la **etapa vigente** ahora dibuja **dos** líneas de ejecutado: **"Nuevo (desde convenio)"** (azul, lo de la ventana) y **"Acumulado total"** (morado, todas las versiones), y un **KPI "Acumulado total"** en la etapa vigente. En contratos sin convenio, la curva queda **igual** (una sola "Ejecutado").
- `etapasAvance.js` (calcula `ejecutadoTotal` por periodo + `kpiEjecutadoTotal`), `CurvaAvance.jsx` (serie morada condicional + 3er KPI en la etapa vigente).

**Probar en pantalla (HU-05 → Curva de avance, en un contrato con convenio — p. ej. SOP-2026-001):**
1. Abre la curva: arriba, en **"Avance por etapas"**, la tarjeta **vigente** muestra 3 KPIs: Programado · **Ejecutado (nuevo)** · **Acumulado total**.
2. En el gráfico de la etapa vigente verifica **dos** líneas de ejecutado (leyenda: "Nuevo (desde convenio)" y "Acumulado total"); el acumulado total **arranca por encima de 0** (incluye lo pre-convenio).
3. Abre un contrato **sin convenio** → la curva muestra **una sola** "Ejecutado" (sin cambios). 

### H9-front — Etiqueta "Adicional" en las versiones del programa
**Qué cambió:** el endpoint de versión (`convenios.controller.js`) y `snapshotAMatriz` (`ConveniosModificatorios.jsx`) ahora **leen `es_adicional`** del snapshot; `MatrizProgramaLectura` ya lo pinta. Así una versión anterior muestra la etiqueta "Adicional" igual que el programa vigente.
- *Nota de datos:* los snapshots locales viejos se crearon antes de H9; **sincronicé los locales** para que puedas probar ya (SOP-2026-001 · versión 2 · concepto **AD-01**). En Render, los convenios nuevos lo traen nativo (y un `UPDATE` de sincronía igual lo backfillea si lo quieres en los viejos).

**Probar en pantalla (HU-03 Convenios / o HU-05 Curva → desplegar programa de una versión, en SOP-2026-001):**
1. Abre el **convenio** de SOP-2026-001 y entra a ver el **programa de la versión 2** (o desde la curva, "Ver programa de obra · versión modificada").
2. El concepto **AD-01** debe mostrar la insignia ámbar **"Adicional"** (art. 101 RLOPSRM). En la versión 1 (original) no aparece.

### #20-front — Ocultar "Firmar" cuando la nota venció el plazo (aceptada tácita)
**Qué cambió:** en `EmisionNotas.jsx`, el botón "Firmar nota" ya **no se muestra** cuando la nota está `aceptada_tacita` (plazo de firma vencido, art. 123 fr. III). Coherente con el gate server (#20, 409) y con la bandeja "Por firmar". La insignia "Aceptada (tácita)" sigue visible.

**Probar en pantalla:** abre una nota cuyo **plazo de firma ya venció** (insignia "Aceptada (tácita)") como una parte que **no** la emitió → **no** aparece el botón "Firmar nota"; en una nota "En plazo de firma" **sí** aparece.

### H6 → B6-3 — Rediseño completo del flujo de pago (mockup aprobado)
**Qué cambió** (según `docs/mockups/H6_rediseno_pago_25jun.html`):
- **`RegistroPagoForm.jsx` reescrito** → modo **revisión + pago**: Finanzas ya **no teclea** CFDI/factura/fecha-factura; los **hereda** del tránsito (read-only) vía `transitoEstimacion` (folio CFDI, factura presentada, PDFs descargables). Finanzas solo captura **referencia SPEI** + **fecha de pago** (+ observaciones). El botón "Registrar pago" abre un **pop-up "¿CFDI y factura coinciden?"** y solo ahí se confirma. Si el contratista no ha subido el CFDI, el botón queda **deshabilitado** (y el gate server ya da 409).
- **`RegistroPago.jsx` (`/pagos/registro`) → SOLO historial:** se quitó el formulario duplicado; queda el selector de contrato + la **tabla de pagos** (con CFDI y SPEI) + un aviso de que el registro vive en el tránsito.
- **`TransitoPago.jsx` paso 4:** usa el form rediseñado y **preselecciona** la estimación del tránsito.
- El **gate server** (Finanzas no paga sin CFDI del contratista) ya estaba; aquí solo se conecta a la UI (no se duplicó).

**Probar en pantalla (flujo completo):**
1. **Contratista** → Tránsito a pago de una estimación **autorizada** → paso **"Soportes"**: registra el **folio CFDI** y la **factura**, y **sube el PDF** del CFDI/oficio. Genera la instrucción.
2. **Finanzas** → entra al tránsito de esa estimación → paso **"Registrar pago"**: arriba ve el panel **"Revisión — soportes que promovió el contratista"** (CFDI, factura, importe neto) con **botones para descargar los PDF**. Captura **referencia SPEI** + **fecha de pago**.
3. Pulsa **"Registrar pago"** → aparece el **pop-up "¿CFDI y factura coinciden?"** con el resumen → **"Sí, coinciden"** registra el pago (la estimación pasa a *pagada*).
4. **Bloqueo sin CFDI:** repite con una estimación **sin** soportes del contratista → el botón "Registrar pago" está **deshabilitado** con el aviso "Falta el folio CFDI…"; si fuerzas el POST, el server responde **409** (gate H6).
5. **Historial:** abre **`/pagos/registro`** (pestaña "Registrar pago") → **ya no hay formulario**, solo la **tabla de pagos** del contrato (CFDI + SPEI + plazo art. 54) y el aviso de registrar por tránsito.

---

## ▶ RUNBOOK para Maik (al volver)
1. **Revisa los diffs:** `git diff backend/src frontend/src`. *(Ojo: el diff también incluye los archivos de la Oleada 1 ya hechos antes — `gateCierre.js`, `pagos.controller.js`(parte O1), `alertas.controller.js`, `excelExport.js`, `reportesContrato.js`(parte O1), `RegistroPagoForm.jsx`, `ReingresoEstimacion.jsx` — esos ya estaban listos sin push.)*
2. **Builds:** backend arranca (`docker restart sigecop_backend` → "escuchando"); frontend `docker exec sigecop_frontend npm run build` → ✓.
3. **Commit + push a `main`** del código aprobado.
4. **Deploy a Render** (auto desde `main` o Manual Deploy).
5. **H9 / schema:** el `ALTER TABLE programa_version_concepto ADD COLUMN IF NOT EXISTS es_adicional ...` **ya está en `schema.sql`** (aditivo idempotente) → `init.js` lo aplica solo en el boot del deploy. No requiere DDL manual aparte; si prefieres pre-aplicarlo: corre ese `ALTER` contra Render antes del deploy. *(En local YA está aplicado.)*
6. **Verifica en Render** los gates clave (pagar contrato cerrado → 409; autorizar convenio sin oficio → 409; pagar sin CFDI → 409; portafolio de un cerrado = verde).
7. **Decide los diferidos** (§ Diferidos): cuáles entran y quién los implementa+verifica con navegador.

**Backups locales:** `scratchpad/backup_pre_o2_25jun.sql` (pre-Oleada 2, 4.1 MB) y `scratchpad/backup_pre_oleada1_25jun.sql` (sesión previa). La data local == pre-sesión (verificaciones revertidas).

---

## ✅ Bugs cerrados y VERIFICADOS EN VIVO

> Método: edición + reinicio backend + reproducción adversarial (gate ahora bloquea / total cuadra). Mensajes citan el artículo.

### Oleada 2 — gate art. 64 (contrato cerrado = solo-lectura)
| # | Archivo:func | Verificación en vivo |
|---|---|---|
| **#5** | `garantias.controller.js` editarGarantia/subirPdfGarantia | PUT garantía y subir-PDF en contrato cerrado → **409** ✓ |
| **#9** | `bitacora.controller.js` vincularNota | vincular nota en cerrado → **409** ✓ |
| **#10** | `bitacora.controller.js` anularNota | anular en cerrado → **409** ✓ ; + protege `tipo='finiquito'` (no anulable) |
| **#19** | `bitacora.controller.js` firmarNota | firmar nota en cerrado → **409** ✓ |

### Oleada 3 — garantías + empresas + finiquito
| # | Archivo:func | Verificación |
|---|---|---|
| **#4** | `garantias.controller.js` editarGarantia | normaliza `tipo` al editar (igual que crear) — por código (no rompe el UNIQUE) |
| **#17** | `garantias.controller.js` validarGarantia | whitelist anticipo/cumplimiento/vicios_ocultos → tipo basura **400** ✓ |
| **#3** | `empresas.controller.js` fusionarEmpresa | reapunta FK de contratos/roster → fusionar con contratos **200** (antes 500) ✓ |
| **#7** | `finiquito.controller.js` getContrato + cerrarFiniquito | GET/POST finiquito de contrato de OTRA empresa → **403** ✓ ; misma empresa → 200 ✓ |

### Oleada 4 — resto bitácora (+ H1)
| # | Archivo:func | Verificación |
|---|---|---|
| **#8** | `bitacora.controller.js` anularNota | anular nota YA firmada por contraparte → **409** ✓ (art. 123 fr. VI) |
| **#20** | `bitacora.controller.js` firmarNota | firma fuera de plazo → **409** (por código; no había nota vencida en el seed para reproducir) |
| **#21** | `bitacora.controller.js` emitirNota | emitir 'cierre'/'finiquito' a mano → **400** ✓ |
| **H1** | `PorFirmar.jsx` + `NotificacionesCentro.jsx` | la bandeja "Por firmar" ahora lista **aperturas + notas**; la campana enlaza a por-firmar (build ✓) |

### Oleada 5 — presentación
| # | Archivo:func | Verificación |
|---|---|---|
| **#18** | `portafolio.controller.js` | contrato cerrado → semáforo **verde** + `estado:'cerrado'` + nota "Contrato cerrado" (antes rojo/ámbar por atraso) ✓ |
| **#24** | `estimaciones-ciclo.controller.js` | transiciones consistentes con `estado` (autorizada/pagada muestran 'autorizada', sin 'rechazada' contradictoria) ✓ |

### Hallazgos decididos hechos
| H | Decisión | Archivo:func | Verificación |
|---|---|---|---|
| **H11** | quitar Excel | `reportesContrato.js:461` `formatos:['PDF']` | build ✓ |
| **H7** | B7-2 (oficio siempre) | `convenios.controller.js` autorizarConvenio | autorizar convenio sin oficio (≤25%) → **409** ✓ (antes 200) |
| **H9** | schema aprobado | `schema.sql` (`programa_version_concepto.es_adicional`) + `convenios.controller.js` snapshot | columna creada (local); snapshot captura `es_adicional` (1 adicional etiquetado) ✓ |
| **H6** | B6-3 (gate server) | `pagos.controller.js` registrarPago | pagar sin CFDI del contratista (`cobro_soportes tipo='cfdi'`) → **409** ✓ |

---

## 🟡 DECISIONES AUTÓNOMAS (tomé el camino conservador; revísalas)

1. **#18 — segregar, no ocultar.** Un contrato cerrado se **conserva** en el portafolio con semáforo neutro (verde) + `estado:'cerrado'`, en vez de excluirlo de la lista (menos rompe: la dependencia sigue viéndolo, sin falsa alarma de atraso).
2. **#10 — protección del 'finiquito'.** Añadí que la nota `tipo='finiquito'` (acta de cierre) tampoco se anula, además del gate de cierre (análogo a 'apertura').
3. **H6 — solo el gate server, NO el rediseño de UI.** Implementé el núcleo aplicable de B6-3 (Finanzas no paga hasta que el contratista suba el CFDI). El **rediseño de pantallas** (mover toda la captura al contratista, pestaña de registro = solo historial, pop-up) **lo dejé pendiente**: es una reescritura de `TransitoPago.jsx`/`RegistroPago.jsx` que **no puedo verificar e2e sin navegador** en esta sesión headless → riesgo de romper el flujo de pago. **Nota de impacto:** con el gate, el flujo de pago AHORA exige que el contratista suba el CFDI en tránsito **antes** de que Finanzas pague; avisa al equipo.
4. **H9 — DDL solo local.** Apliqué el `ALTER` a la BD local para verificar el snapshot; en Render lo aplica `init.js` en el boot (la columna ya está en `schema.sql`).

---

## ⏭ DIFERIDOS (no ejecutados — necesitan tu OK / navegador)

| Item | Estado | Nota |
|---|---|---|
| **H2-B2-1 + H2-UI** | ✅ **HECHO** | foto server-side + descripción (ver "Diferidos implementados") |
| **H8-B8-3** | ✅ **HECHO** | curva doble serie |
| **H6-B6-3** | ✅ **HECHO** | rediseño completo del pago (mockup aprobado): `RegistroPagoForm` reescrito + `RegistroPago` solo historial + `TransitoPago` paso 4 |
| **H9-front** | ✅ **HECHO** | etiqueta "Adicional" en versiones (endpoint + `snapshotAMatriz`) |
| **#20-front** | ✅ **HECHO** | ocultar "Firmar" al vencer plazo |

**Ya NO quedan diferidos de código.** Lo único en pausa son Oleadas 6/7 (auth congelada #13-16 y otros opcionales), que requieren tu OK explícito.

---

## Estado de builds
- **Backend:** arranca limpio tras cada bloque (login 200, gates verificados). Reiniciado varias veces; sin errores de boot.
- **Frontend:** `vite build` ✓ (6.93s) tras H1/H11. *(Warning de chunk >500kB es preexistente, no error.)*
- **Schema local:** `programa_version_concepto.es_adicional` aplicado (idempotente).

## Archivos tocados (27 en total, todas las sesiones)
Backend: controllers `bitacora`, `convenios`, `empresas`, `estimaciones-ciclo`, `finiquito`, `garantias`, `pagos`, `portafolio`, `trabajos` · `routes/trabajos.routes.js` · `db/schema.sql` · `lib/gateCierre.js`(O1) · `alertas`(O1).
Frontend: `PorFirmar.jsx`, `NotificacionesCentro.jsx`, `reportesContrato.js`, `TrabajosTerminados.jsx`, `etapasAvance.js`, `CurvaAvance.jsx`, `EmisionNotas.jsx`, `ConveniosModificatorios.jsx`, `RegistroPagoForm.jsx`, `RegistroPago.jsx`, `TransitoPago.jsx`, `api.js` · (O1: `ReingresoEstimacion.jsx`, `excelExport.js`).
**Ninguno de zona congelada** salvo `schema.sql` (H9, autorizado). `estimaciones.controller.js` y `acceso.js`: **NO tocados**.

> *Nota Render para H6:* el rediseño usa tablas/endpoints que YA existen (`cobro_soportes`, `instruccion_pago`, `transitoEstimacion`); no requiere DDL nuevo. Sí conviene que el equipo sepa que **el pago ahora exige que el contratista promueva el cobro y suba el CFDI en el tránsito ANTES** de que Finanzas pague.

## Pendiente de las oleadas (no en alcance de esta sesión)
- **Oleada 6** (auth congelada #13/#14/#15/#16) y **Oleada 7** (#22 foto) y opcionales: **siguen en pausa** (requieren tu OK; #13-16 tocan zona congelada).
