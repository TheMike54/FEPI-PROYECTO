# PLAN DE SOLUCIÓN DE BUGS — SIGECOP · 25-jun-2026

> **Fuente:** `docs/pruebas/REPORTE_PRUEBAS_EXHAUSTIVAS_24jun.md` (30 bugs, verificación adversarial, con causa `archivo:línea` y fix). Este doc **NO arregla nada** — es el plan para que Maiki decida el orden y apruebe antes de tocar código.
>
> **Alcance:** 🔴 tache seguro + 🟠 alto + 🟡 medio (23 bugs pendientes). 🔵 bajos + ⚪ cosméticos van en **§ Opcional / después**.
>
> **✅ Bug #1 (PDF firmado) — CERRADO.** Resuelto con el backfill de `contrato_documentos tipo='contrato'` en Render (`PLAN_SEED_RENDER_25jun.md`). Era defecto de DATOS, no de la regla. No se incluye como pendiente.

## Estado de avance
- **✅ Oleada 1 — COMPLETA** (LOCAL, sin push · 25-jun): **#2, #12, #6, #11, #23** arreglados y **verificados en vivo** — gate de pago en contrato cerrado = 409; atraso cuenta solo avances `vigente`; totales Excel sin rechazadas; severidad fuera del Reingreso. Backup `scratchpad/backup_pre_oleada1_25jun.sql`. Build verde (frontend `vite build` + backend reiniciado). 7 archivos, todos NO congelados.
- ⏳ **Oleadas 2-5 — PENDIENTES** (retomar después): O2 (#5/#9/#10/#19 gate art. 64), O3 (#4/#17/#3/#7), O4 (#8/#20/#21), O5 (#18/#24).
- ⛔ Oleada 6 (auth congelada #13/#14/#15/#16), Oleada 7 (#22) y opcionales: fuera de alcance hasta nuevo OK.

## Leyenda
- **Zona:** `✅ libre` (se puede tocar) · `⚠️ CONGELADA` (pídele OK explícito a Maiki antes) · `🗄️ SCHEMA` (DDL, autor Maiki).
- **Tamaño:** trivial (1-5 líneas) · chico (1 función / 1 archivo) · mediano (varias funciones o cambia un flujo).
- Ningún bug de este plan requiere **migración de datos** salvo donde se indica `MIGRACIÓN`.

## Mapa rápido (bug → grupo → oleada sugerida)
| # | Sev | Zona | Grupo causa-raíz | Oleada |
|---|---|---|---|---|
| 2 | 🔴 | ✅ | A · gate art.64 (cerrado) | **1** |
| 12 | 🟠 | ✅ | A · espejo UI del #2 | **1** |
| 23 | 🟡 | ✅ | F · presentación (severidad) | **1** |
| 6 | 🟠 | ✅ | F · presentación (totales) | **1** |
| 11 | 🟠 | ✅ | E · atraso vigente | **1** |
| 5 | 🟠 | ✅ | A+C · gate art.64 en garantías | **2** |
| 9 | 🟠 | ✅ | A+B · gate art.64 en vincularNota | **2** |
| 10 | 🟠 | ✅ | A+B · gate art.64 + acta finiquito | **2** |
| 19 | 🟡 | ✅ | A+B · gate art.64 en firmarNota | **2** |
| 4 | 🟠 | ✅ | C · garantías (normalizar tipo) | **3** |
| 17 | 🟡 | ✅(+🗄️ opc) | C · garantías (whitelist tipo) | **3** |
| 3 | 🟠 | ✅ | H · fusionar empresa | **3** |
| 7 | 🟠 | ✅ (usa acceso.js) | G · finiquito IDOR empresa | **3** |
| 8 | 🟠 | ✅ | B · anular nota firmada | **4** |
| 20 | 🟡 | ✅ | B · firmar fuera de plazo | **4** |
| 21 | 🟡 | ✅ | B · emitir 'cierre'/'finiquito' | **4** |
| 18 | 🟡 | ✅ | F · portafolio incluye cerrados | **5** |
| 24 | 🟡 | ✅ | F · historial transiciones | **5** |
| 13 | 🟡 | ⚠️ | D · aprobarUsuario | **6** |
| 14 | 🟡 | ⚠️ | D · registro email vacío | **6** |
| 15 | 🟡 | ⚠️ | D · empresa supervisión tipo | **6** |
| 16 | 🟡 | ⚠️ | D · login case-sensitive | **6** |
| 22 | 🟡 | ✅ | I · avance sin foto (criterio equipo) | **7** |

---

## GRUPO A — Gate de cierre (art. 64 LOPSRM) faltante en contrato cerrado
> **Causa raíz común:** varios endpoints mutadores **no llaman** `contratoCerrado()/msgCerrado()` (`backend/src/lib/gateCierre.js`), a diferencia de `emitirNota`/`crearMinuta`/`crearVisita`/`registrarEndoso`/`crearGarantia`/instrucción de pago/convenios que SÍ lo aplican. **Arreglar de una sola pasada** añadiendo el mismo guard. Riesgo bajo (additivo: solo agrega un 409). `gateCierre.js` es lib compartida → avísale a Maiki que se toca.

### #2 🔴 TACHE SEGURO — Finanzas paga estimación autorizada de contrato YA finiquitado (doble liquidación)
- **Archivos:** `backend/src/controllers/pagos.controller.js` (`registrarPago` 24-135, lee solo `id` en :61) · `backend/src/lib/gateCierre.js:12-13` (la "EXCEPCIÓN" documentada).
- **Zona:** ✅ libre.
- **Fix:** en `registrarPago`, tras lockear/leer el contrato, leer `contratos.estado` y `if contratoCerrado → 409 msgCerrado('no se registran pagos')`; **eliminar la "EXCEPCIÓN" de `gateCierre.js:12-13`** (su premisa "el finiquito ya la descuenta" es falsa — el finiquito suma el neto de la #2 al saldo pero no la marca pagada).
- **Tamaño/riesgo:** chico · riesgo medio (ruta de dinero, pero solo agrega bloqueo). Sin migración.
- **Depende:** par con **#12** (espejo en UI). Mismo grupo que #5/#9/#10/#19.

### #12 🟠 ALTO — El selector de pago no excluye contratos cerrados (espejo UI del #2)
- **Archivos:** `frontend/src/components/pagos/RegistroPagoForm.jsx:19,47,77-79` · `frontend/src/pages/RegistroPago.jsx` (no consulta `contrato.estado`).
- **Zona:** ✅ libre.
- **Fix:** excluir/avisar cuando `contrato.estado==='cerrado'` (no listar la estimación como pagable o mostrar banner solo-lectura "el saldo se liquida por el finiquito").
- **Tamaño/riesgo:** chico · riesgo bajo. Sin migración.
- **Depende:** se arregla **junto con #2** (backend+UI la misma demo).

### #5 🟠 ALTO — Contrato cerrado acepta EDITAR garantía y SUBIR PDF de póliza
- **Archivos:** `backend/src/controllers/garantias.controller.js` `editarGarantia` 113-135 y `subirPdfGarantia` 172-189 (sin gate; `g` ya trae `contrato_id`).
- **Zona:** ✅ libre.
- **Fix:** anteponer `if (await contratoCerrado(pool, g.contrato_id)) return 409 msgCerrado('no se edita la garantía' / 'no se sube el PDF')`, igual que `crearGarantia:89` y `registrarEndoso:147`.
- **Tamaño/riesgo:** chico · riesgo bajo. Sin migración.
- **Depende:** mismo archivo que #4/#17 (Grupo C) → tocar `garantias.controller.js` una vez.

### #9 🟠 ALTO — `vincularNota` crea notas nuevas en contrato cerrado
- **Archivos:** `backend/src/controllers/bitacora.controller.js` `vincularNota` 811-861 (inserta en :847 sin gate).
- **Zona:** ✅ libre.
- **Fix:** antes de `insertarNotaAtomica`, replicar el chequeo de `emitirNota:563`: `if contratoCerrado(client, apertura.contrato_id) → 409 msgCerrado('no se vinculan notas')`.
- **Tamaño/riesgo:** trivial · riesgo bajo. Sin migración.
- **Depende:** mismo archivo que #8/#10/#19/#20/#21 (Grupo B) → una pasada a `bitacora.controller.js`.

### #10 🟠 ALTO — `anularNota` funciona en contrato cerrado y anula la nota de FINIQUITO
- **Archivos:** `backend/src/controllers/bitacora.controller.js` `anularNota` 755-806 (excepción solo 'apertura' en :774).
- **Zona:** ✅ libre.
- **Fix:** (a) anteponer gate `contratoCerrado → 409 msgCerrado('no se anulan notas')`; (b) proteger `tipo==='finiquito'` igual que 'apertura' (:774).
- **Tamaño/riesgo:** chico · riesgo bajo. Sin migración.
- **Depende:** misma función que **#8** (anularNota) → hacer #8+#10 juntos. Grupo B.

### #19 🟡 MEDIO — `firmarNota` permite firmar en contrato cerrado
- **Archivos:** `backend/src/controllers/bitacora.controller.js` `firmarNota` 882-918.
- **Zona:** ✅ libre.
- **Fix:** anteponer gate `contratoCerrado → 409`. *(Interpretativo: firmar podría tolerarse como "cerrar pendientes"; hoy es incoherente con emitir/minuta/visita. Confirmar criterio con el profe.)*
- **Tamaño/riesgo:** trivial · riesgo bajo. Sin migración.
- **Depende:** misma función que **#20** (firmarNota) → juntos. Grupo B.

---

## GRUPO B — Bitácora: inmutabilidad / validación de notas (`bitacora.controller.js`)
> Todo en `backend/src/controllers/bitacora.controller.js` (✅ libre). **Una sola pasada** al archivo cubre #8/#9/#10/#19/#20/#21.

### #8 🟠 ALTO — Anular una nota YA FIRMADA por la contraparte (viola art. 123 fr. VI)
- **Archivos:** `bitacora.controller.js` `anularNota` 778-784 (solo mira respuestas `vinculada_a`, no `bitacora_nota_firmas`).
- **Zona:** ✅ libre.
- **Fix:** guard: `if EXISTS (SELECT 1 FROM bitacora_nota_firmas WHERE nota_id=$1 AND usuario_id <> emisor) → 409` (la aceptación de la contraparte vive en esa tabla).
- **Tamaño/riesgo:** chico · riesgo bajo. Sin migración.
- **Depende:** misma función que **#10** → hacer juntos.

### #20 🟡 MEDIO — Nota firmable después de vencido el plazo (la bandeja la oculta)
- **Archivos:** `bitacora.controller.js` `firmarNota` 882-918 (no compara plazo) · `frontend/src/pages/EmisionNotas.jsx:200,236-239` (botón sin mirar `aceptada_tacita`).
- **Zona:** ✅ libre.
- **Fix:** añadir a `firmarNota` el mismo predicado de plazo de `notas-pendientes.controller.js:23` → 409 "plazo vencido (aceptada tácita)"; y ocultar el botón en `EmisionNotas` cuando `plazo_vencido/aceptada_tacita`.
- **Tamaño/riesgo:** chico · riesgo bajo. Sin migración.
- **Depende:** misma función que **#19** (firmarNota) → juntos.

### #21 🟡 MEDIO — Se puede emitir a mano una nota tipo 'cierre' / 'finiquito'
- **Archivos:** `bitacora.controller.js` `emitirNota:548` (solo bloquea 'apertura').
- **Zona:** ✅ libre.
- **Fix:** `if (['apertura','cierre','finiquito'].includes(tipo)) → 400` (asientos del sistema, no se emiten sueltos).
- **Tamaño/riesgo:** trivial · riesgo bajo. Sin migración. *(Nota: hay 3 notas de prueba 3916/3937/3940 en bitácora 1796 que Maiki debe limpiar a mano.)*

---

## GRUPO C — Garantías (`garantias.controller.js`)
> ✅ libre. **Una pasada** cubre #4/#17 (y #5 del Grupo A si se hace aquí). El alta HU-01 comparte la laxitud → flanco congelado (ver #17).

### #4 🟠 ALTO — `editarGarantia` rompe el UNIQUE 'una por tipo' por mayúsculas
- **Archivos:** `garantias.controller.js` `editarGarantia:127` (graba `String(b.tipo).trim()` crudo) vs `crearGarantia:96` (normaliza).
- **Zona:** ✅ libre.
- **Fix:** aplicar el mismo `tipoNorm = toLowerCase().replace(/\s+/g,'_')` en `editarGarantia` antes del UPDATE.
- **Tamaño/riesgo:** trivial · riesgo bajo. Sin migración.

### #17 🟡 MEDIO — Garantías acepta cualquier 'tipo' (sin whitelist)
- **Archivos:** `garantias.controller.js` `validarGarantia:27`, `crearGarantia:96-103` · **también** `backend/src/controllers/contratos.controller.js:173` (alta, **⚠️ CONGELADA**) · opcional CHECK en `schema.sql` (**🗄️ SCHEMA**).
- **Zona:** ✅ libre en HU-02; ⚠️ CONGELADA para el flanco del alta; 🗄️ SCHEMA si se añade CHECK.
- **Fix:** whitelist `['anticipo','cumplimiento','vicios_ocultos']` en `validarGarantia` tras normalizar; replicar en `contratos.controller.js` (PR a Maiki) y, opcional, `CHECK` idempotente en schema.
- **Tamaño/riesgo:** chico · riesgo bajo. **MIGRACIÓN opcional:** limpiar filas basura tipo 'xyz123' del seed de prueba.
- **Depende:** mismo archivo que #4/#5.

---

## GRUPO D — Auth / usuarios (⚠️ CONGELADA — requiere OK explícito de Maiki)
> Fixes triviales y aditivos, pero viven en archivos congelados → **batch a Maiki**. Ningún flujo de la UI web ve estos fallos (el front pre-normaliza); son defensa-en-profundidad y limpieza de datos.

### #13 🟡 MEDIO — `aprobarUsuario` cambia el rol de un usuario YA ACTIVO
- **Archivos:** `backend/src/controllers/usuarios.controller.js:78-84` (UPDATE sin `AND estado='pendiente'`).
- **Zona:** ⚠️ CONGELADA.
- **Fix:** añadir `AND estado='pendiente'` al WHERE; devolver 404/409 si `rowCount=0`.
- **Tamaño/riesgo:** trivial · riesgo bajo. Sin migración. *(No alcanzable desde la UI; solo PATCH manual.)*

### #14 🟡 MEDIO — Registro acepta correo vacío / solo espacios
- **Archivos:** `backend/src/controllers/auth.controller.js:86,100,119-124`.
- **Zona:** ⚠️ CONGELADA.
- **Fix:** validar `if (!emailNorm) → 400` **después** de normalizar (hoy chequea el original truthy).
- **Tamaño/riesgo:** trivial · riesgo bajo. Sin migración.

### #15 🟡 MEDIO — Empresa de supervisión nace con `tipo='contratista'`
- **Archivos:** `backend/src/controllers/auth.controller.js:108-110` (llamada sin 3er arg) · `empresas.controller.js:58,61,87` (default 'contratista').
- **Zona:** ⚠️ CONGELADA (el call-site está en auth).
- **Fix:** `resolverOCrearEmpresa(query, empresa, rolSol==='supervision' ? 'supervision' : 'contratista')`.
- **Tamaño/riesgo:** trivial · riesgo bajo. **MIGRACIÓN opcional:** `UPDATE empresas SET tipo='supervision'` para las mal clasificadas existentes.

### #16 🟡 MEDIO — Login sensible a mayúsculas en el correo
- **Archivos:** `backend/src/controllers/auth.controller.js:31-35` (WHERE con email crudo).
- **Zona:** ⚠️ CONGELADA.
- **Fix:** normalizar `String(email).trim().toLowerCase()` en login, simétrico con register.
- **Tamaño/riesgo:** trivial · riesgo bajo. Sin migración.

---

## GRUPO E — Atraso cuenta avances anulados

### #11 🟠 ALTO — HU-07 y badge de atrasos suman avances ANULADOS (oculta atrasos reales)
- **Archivos:** `backend/src/controllers/alertas.controller.js` `deficitsDeContrato` 56-58, `resumenAtrasos` 142-144, `alertasDetalle` 299.
- **Zona:** ✅ libre.
- **Fix:** añadir `AND estado='vigente'` a las **tres** subconsultas de `concepto_avance` (igual que ya hace `trabajos.controller.js`).
- **Tamaño/riesgo:** trivial · riesgo bajo. Sin migración. **Standalone.**

---

## GRUPO F — Presentación: reportes / portafolio / historial
> Capa de presentación (frontend services o controllers read-only). Riesgo bajo, alta visibilidad ante el profe. Ninguno toca cuadre server-side.

### #6 🟠 ALTO — Reportes #2 y #3 (Excel): TOTALES suma estimaciones RECHAZADAS
- **Archivos:** `frontend/src/services/reportesContrato.js` (#3: 289-298,316; #2: 233-245,272) · `excelExport.js:152`.
- **Zona:** ✅ libre.
- **Fix:** en la fila TOTALES excluir `estado==='rechazada'` (alinear con `ConsultaExpediente.jsx:484` y la métrica "Estimado" del propio #2). Las rechazadas se siguen MOSTRANDO por trazabilidad; solo no se suman.
- **Tamaño/riesgo:** chico · riesgo bajo. Sin migración.

### #23 🟡 MEDIO — Reingreso (HU-16) muestra columna 'Severidad' que el profe pidió quitar
- **Archivos:** `frontend/src/pages/ReingresoEstimacion.jsx:46-59,85,100,108,365,375`.
- **Zona:** ✅ libre (frontend puro).
- **Fix:** quitar `SeveridadBadge`, la clave 'Severidad' de `obsAFilas`, y las columnas de tabla/PDF/Excel — igual que ya se hizo en `RevisionEstimacion.jsx`.
- **Tamaño/riesgo:** chico · riesgo bajo. Sin migración. **Alta visibilidad demo** (el profe lo señaló).

### #18 🟡 MEDIO — Portafolio ejecutivo lista contratos CERRADOS con semáforo de 'atraso'
- **Archivos:** `backend/src/controllers/portafolio.controller.js:71-83` (no filtra ni expone `estado`).
- **Zona:** ✅ libre.
- **Fix:** excluir o segregar `estado='cerrado'` (o exponer `estado` para que los factores del semáforo omitan los cerrados).
- **Tamaño/riesgo:** chico · riesgo bajo. Sin migración.

### #24 🟡 MEDIO — Historial (HU-14) pinta transiciones contradictorias ('autorizada' + 'rechazada')
- **Archivos:** `backend/src/controllers/estimaciones-ciclo.controller.js:66-70,107-109`.
- **Zona:** ✅ libre.
- **Fix:** derivar las transiciones de forma consistente con `estimaciones.estado` (no pintar 'rechazada' si estado='autorizada'/'pagada'; pintar 'autorizada' cuando el estado lo implica aunque falte la nota `res_estimaciones`).
- **Tamaño/riesgo:** mediano · riesgo bajo (read-only). Sin migración.

---

## GRUPO G — Finiquito: aislamiento por empresa (seguridad)

### #7 🟠 ALTO — Finiquito por id directo NO acota por empresa (IDOR: ver/cerrar contrato ajeno)
- **Archivos:** `backend/src/controllers/finiquito.controller.js` `getContrato` 63-69 (no trae `dependencia_empresa_id`) y `cerrarFiniquito:113` (gate `rol==='dependencia'` sin empresa). Usa `lib/acceso.js` (**⚠️ CONGELADA, pero NO se edita**).
- **Zona:** ✅ libre (solo se edita finiquito.controller.js; `acceso.js` ya acota si la fila trae la columna).
- **Fix:** (1) agregar `du.empresa_id AS dependencia_empresa_id` al SELECT de `getContrato` (como `portafolio.controller.js:76`); (2) en `cerrarFiniquito` sustituir el gate `rol==='dependencia'` por `esParteOSupervision` + autoridad dependencia/residente.
- **Tamaño/riesgo:** chico · riesgo **medio** (ruta de autorización + operación terminal/inmutable). Sin migración. **MIGRACIÓN:** re-seed del contrato demo 7031 que la prueba cerró (ya cubierto por el seed de Render).

---

## GRUPO H — Padrón de empresas

### #3 🟠 ALTO — Fusionar empresa con contratos devuelve HTTP 500 (FK no reapuntada)
- **Archivos:** `backend/src/controllers/empresas.controller.js` `fusionarEmpresa` 183-203 (DELETE en :194). FKs `contratos.contratista_empresa_id/supervision_empresa_id` + `contrato_roster.empresa_id` (NO ACTION).
- **Zona:** ✅ libre.
- **Fix:** dentro de la misma transacción, **antes** del DELETE: `UPDATE contratos SET contratista_empresa_id=canon WHERE contratista_empresa_id=id` (+ `supervision_empresa_id`, + `contrato_roster.empresa_id`); corregir el comentario obsoleto :181-182.
- **Tamaño/riesgo:** chico · riesgo bajo (transaccional). Sin migración (reapunta en runtime). *(Decisión CASCADE-vs-reapuntar a nivel DDL la confirma Maiki; el reapunte no necesita schema.)*

---

## GRUPO I — Avance sin foto

### #22 🟡 MEDIO — El avance se registra SIN foto (la obligatoriedad A1 solo vive en el front)
- **Archivos:** `backend/src/controllers/trabajos.controller.js` `registrarAvance` 214-353 · `frontend/src/pages/TrabajosTerminados.jsx:269,290-293`.
- **Zona:** ✅ libre.
- **Fix:** validar ≥1 foto server-side, **atada a la creación** (foto en el mismo POST/transacción que el avance) en vez del upload separado post-creación.
- **Tamaño/riesgo:** **mediano** (cambia el flujo de subida) · riesgo medio. Sin migración.
- **Nota:** A1 es **criterio del equipo, NO ley** (art. 132 fr. IV es discrecional). Si la demo no lo necesita, puede ir al final o quedar como deuda. Confirmar con el profe si se exige.

---

# ORDEN SUGERIDO DE ATAQUE
> Prioridad: **(a) impacto en la demo del profe**, luego **(b) tamaño chico primero**, luego **(c) riesgo bajo primero**. Los que comparten archivo/causa se hacen en **una sola pasada**.

### 🌊 Oleada 1 — Visibles en la demo + fixes chicos (empezar aquí)
- **#2 + #12** — doble pago en contrato cerrado (backend + UI). *Tache seguro, financiero, lo más visible.*
- **#23** — quitar 'Severidad' del Reingreso. *El profe ya lo señaló; frontend puro, trivial.*
- **#6** — TOTALES de reportes sin sumar rechazadas. *Cifra oficial errónea muy visible.*
- **#11** — atraso deja de contar avances anulados. *Cumplimiento (art. 118); trivial, 3 subconsultas.*

### 🌊 Oleada 2 — Cerrar el gate art. 64 (una pasada por `bitacora.controller.js` + garantías + pago)
- **#5, #9, #10, #19** (+ ya #2) — añadir `contratoCerrado()` a los endpoints que faltan. *Coherencia legal: un contrato cerrado debe ser solo-lectura en TODO el dominio. Fixes chicos/triviales del mismo patrón.*

### 🌊 Oleada 3 — Integridad de datos + seguridad (chicos)
- **#4 + #17** — garantías: normalizar tipo al editar + whitelist (misma pasada que #5).
- **#3** — fusionar empresa reapuntando FKs (feature que el profe pidió).
- **#7** — finiquito: acotar por empresa (IDOR). *Riesgo medio: ruta de autorización terminal.*

### 🌊 Oleada 4 — Resto de bitácora (misma pasada al archivo)
- **#8, #20, #21** — anular nota firmada / firmar fuera de plazo / emitir 'cierre'-'finiquito'. *Cierra la limpieza de `bitacora.controller.js` ya abierta en Oleada 2.*

### 🌊 Oleada 5 — Presentación restante
- **#18** — portafolio excluye/segrega cerrados.
- **#24** — historial: transiciones consistentes con el estado final.

### 🌊 Oleada 6 — Zona CONGELADA (batch con OK de Maiki)
- **#13, #14, #15, #16** — defensa-en-profundidad en `auth.controller.js` / `usuarios.controller.js`. *Triviales y aditivos, pero congelados → un solo PR a Maiki. Ningún usuario de la UI los ve hoy.*

### 🌊 Oleada 7 — Deuda / criterio del equipo
- **#22** — foto de avance server-side. *Mediano, no es ley; confirmar con el profe si entra a la demo.*

---

# § Opcional / después — 🔵 bajos + ⚪ cosméticos
> Fuera del alcance pedido. Listados para no perderlos.

| # | Sev | Bug | Archivo:línea | Zona | Fix (1 línea) | Tamaño |
|---|---|---|---|---|---|---|
| 25 | 🔵 | Registro acepta correos sin formato (sin @) | `auth.controller.js` | ⚠️ CONGELADA | regex de formato tras normalizar (junto con #14) | trivial |
| 26 | 🔵 | Fecha de inicio fuera de rango devuelve 500 (no 400) | `contratos.controller.js:512` | ⚠️ CONGELADA | mapear SQLSTATE `22008` a 400 (ya mapea 22007/22P02) | trivial |
| 27 | 🔵 | Reporte #1 Excel sin datos = hoja totalmente en blanco | `reportesContrato.js` / `excelExport.js` | ✅ | emitir encabezados aunque no haya filas | chico |
| 28 | 🔵 | Etapa 'histórico congelado' de la curva se modifica con avances back-dateados | `frontend/src/utils/etapasAvance.js` + `CurvaAvance.jsx` | ✅ | particionar por momento de captura, no por `concepto_avance.fecha` | mediano |
| 29 | ⚪ | Reporte #4: la descripción promete columnas que no existen | `reportesContrato.js` / `ExportacionReportes` | ✅ | corregir el texto descriptivo | trivial |
| 30 | ⚪ | El reingreso reinicia de hecho el plazo art. 54 pese al aviso "no se reinicia" | HU-16 (copy o comportamiento) | ✅ | alinear aviso con el comportamiento real (decidir cuál es el correcto) | trivial |

---

## Notas para Maiki
- **Zona congelada tocada por el plan:** `auth.controller.js` (#14/#15/#16/#25), `usuarios.controller.js` (#13), `contratos.controller.js` (#17 flanco alta, #26). Todo lo demás es ✅ libre.
- **Schema (opcional):** solo #17 (CHECK de tipo de garantía) — aditivo idempotente si se decide.
- **`gateCierre.js`** es lib compartida: el #2 elimina su "EXCEPCIÓN" documentada — revisar que ningún otro flujo dependa de ella.
- **`lib/acceso.js`** (congelada) NO se edita en #7: el fix solo agrega la columna `dependencia_empresa_id` al SELECT del finiquito para que `acceso.js` acote.
- **Sin migración de datos** salvo: #15 (opcional, re-tipar empresas mal clasificadas), #17 (opcional, limpiar tipos basura), #7 (re-seed del 7031 ya cubierto por el seed de Render), #21 (limpiar 3 notas de prueba).
