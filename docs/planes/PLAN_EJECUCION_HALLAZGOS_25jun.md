# PLAN DE EJECUCIÓN — hallazgos del equipo · 25-jun-2026

> Basado en `AUDITORIA_HALLAZGOS_EQUIPO_25jun.md`. **NO se tocó código — esto es para que lo califiques.** Organizado por lo que requiere de ti: **A)** listo para ejecutar · **B)** decisión de diseño (te doy opciones) · **C)** decisión legal (cito, no decido) · **D)** aclaraciones al equipo (0 código).
> Zonas: `✅ libre` · `⚠️ CONGELADA <archivo>` (tu OK) · `🗄️ SCHEMA` (DDL, autor único = tú).

---

## A) NO REQUIEREN DECISIÓN — listos para ejecutar

### H1 🐛 — Campana "firmar" → Consulta; "Por firmar" no lista notas pendientes  · **bundle con #20 (Oleada 4)**
- **Archivos:** `frontend/src/components/NotificacionesCentro.jsx:128` (el enlace de "firmar" navega a `/bitacora/notas` en vez de la pantalla de firmas) · `frontend/src/pages/PorFirmar.jsx:26` (solo carga `api.pendientesPorFirmar()` = **solo aperturas**, `bitacora.controller.js:328-344`) · `backend/src/controllers/notas-pendientes.controller.js:9` (el endpoint `notasPendientes` SÍ existe pero PorFirmar no lo consume).
- **Fix concreto:** en `PorFirmar.jsx` cargar **también** `api.notasPendientes()` y listar **aperturas + notas pendientes** (cada nota con su `btn-firmar-nota`); ajustar el título; y corregir el destino del enlace de la campana para notas. *(No re-implementar firmas: reusar los botones de `EmisionNotas`.)*
- **Tamaño/riesgo:** mediano · medio. **Zona:** ✅ libre (front + `notas-pendientes`/`bitacora` controllers, no congelados).
- **Oleada:** **Oleada 4**, junto con **#20** (misma pantalla "Por firmar" / firmas de notas).

### H9 🐛 — La etiqueta `es_adicional` no se guarda en el snapshot de versiones  · **🗄️ REQUIERE TU OK DE SCHEMA**
- **Archivos:** `backend/src/db/schema.sql:1639-1648` (`programa_version_concepto` **sin** columna `es_adicional`) 🗄️ · `backend/src/controllers/convenios.controller.js:53-55` (el `INSERT … SELECT` del snapshot omite `es_adicional`) ✅ · `frontend/src/components/programa/MatrizProgramaLectura.jsx:92` + `ConveniosModificatorios.jsx` (mapeo de la versión a matriz) ✅.
- **Fix concreto:** (1) DDL **aditivo idempotente**: `ALTER TABLE programa_version_concepto ADD COLUMN IF NOT EXISTS es_adicional BOOLEAN NOT NULL DEFAULT false;` (2) incluir `es_adicional` en el `SELECT` del snapshot; (3) mapearlo en la matriz de versión.
- **Tamaño/riesgo:** chico · bajo, **pero toca schema → runbook de migración en Render** (igual que el fix de idempotencia). **Migración de datos:** los snapshots ya existentes quedan `es_adicional=false` (si alguna versión histórica tenía adicionales, no se re-etiqueta — aceptable para demo; las nuevas sí). **Zona:** 🗄️ SCHEMA + `convenios.controller.js` (libre).
- **Oleada:** **nueva** (no estaba en O2-5). Ejecuto **solo con tu OK de schema**. *(Ojo: "ver versiones anteriores" que pidió el equipo **ya existe** vía `tabla-versiones`; lo único que falta es la etiqueta.)*

### H11 🎨 — Reporte #1 "Avance físico": quitar Excel, dejar solo PDF  · **quick win**
- **Archivos:** `frontend/src/services/reportesContrato.js:461` (`CATALOGO_REPORTES[0].formatos = ['PDF','Excel']`).
- **Fix concreto:** cambiar a `formatos: ['PDF']`. El handler `avanceFisicoExcel` (`HANDLERS[1].Excel`) se puede dejar (código muerto) o quitar.
- **Tamaño/riesgo:** **trivial (1 línea)** · bajo. **Zona:** ✅ libre.
- **Oleada:** standalone (lo ejecuto cuando digas; es 1 línea + build).

> **A en una frase:** H1 y H11 los puedo ejecutar ya con tu OK general; **H9 necesita además tu OK explícito de schema** (DDL + deploy).

---

## B) REQUIEREN TU DECISIÓN DE DISEÑO (Nivel 2) — elige opción, NO escribí el fix

### H2 — Fotos de avance (descripción por foto + obligatoriedad)
> Contexto: **múltiples fotos YA funciona**; "descripción por foto" es un add de UI sencillo (`TrabajosTerminados.jsx:75` hoy manda `''`). La **decisión** es la **obligatoriedad** de foto (el server hoy no la valida = **bug #22**).

| Opción | Qué implica | Pro | Contra |
|---|---|---|---|
| **B2-1 Hard-block real** | foto ≥1 obligatoria **server-side** dentro de la transacción de `registrarAvance` (foto en el mismo POST o diferir el INSERT hasta confirmar foto) + descripción por foto | cierra #22 de verdad; cumple el criterio A1 | mediano: cambia el flujo de subida (hoy la foto va en un POST aparte) |
| **B2-2 Soft (solo UI) + descripción** | mantener el bloqueo solo en el front (ya existe) + agregar descripción por foto; sin gate server | chico, sin tocar el flujo | NO cierra #22 (un POST directo sigue creando avance sin foto) |
| **B2-3 Diferido** | crear el avance en estado "incompleto" y exigir la foto para pasarlo a "vigente" | cumple sin cambiar el POST de foto | más complejo; nuevo estado |
- **Zona (cualquiera):** ✅ libre (`trabajos.controller.js`, `TrabajosTerminados.jsx`, `avance-fotos.controller.js`). **Nota:** la foto es **criterio del equipo (A1), NO ley** (art. 132 fr. IV es discrecional) → tú decides si es hard o soft.

### H5 — Soportes/notas (paso 4 de integración): vincular nota obligatoria y/o por tipo
| Opción | Qué implica | Pro | Contra |
|---|---|---|---|
| **B5-1 Solo guiar** | filtrar el buscador a tipo `sup_estimaciones` **firmada**, pero mantener el vínculo **opcional** | chico; orienta sin bloquear | no fuerza el soporte documental |
| **B5-2 Obligatorio + tipo** | filtrar a `sup_estimaciones` firmada **Y** exigir ≥1 vínculo para avanzar (gate front + back) | fuerza el soporte (lo que pide el equipo) | mediano; **el gate server toca `estimaciones.controller.js` = ⚠️ CONGELADA**; obliga a crear+firmar la nota antes |
| **B5-3 Varios tipos** | permitir un **conjunto** de tipos relacionados firmados, obligatorio | flexible | hay que definir el catálogo de tipos válidos |
- **Zona:** front ✅ libre; **enforcement server ⚠️ CONGELADA (`estimaciones.controller.js`)** → si eliges B5-2/B5-3 con server, necesito tu OK de congelado. **Ley:** art. 132 fr. II RLOPSRM (notas como soporte de estimación).

### H6 — Rediseño del flujo de pago (CFDI contratista → finanzas)
> Contexto: **parte ya existe** (follow-on 23-jun: el contratista sube CFDI/oficio binario en `cobro_soportes`; finanzas hereda el CFDI).

| Opción | Qué implica | Pro | Contra |
|---|---|---|---|
| **B6-1 Mínimo** | gate server en `pagos.controller.js:registrarPago` que exija `cobro_soportes` (CFDI/oficio) antes de pagar **+** pop-up "¿CFDI y factura coinciden?" | chico-mediano; cierra el hueco sin reorganizar pantallas | no quita la captura duplicada |
| **B6-2 Medio** | B6-1 **+** convertir la pestaña "registro del pago" en **solo-historial** (quitar la captura, que ya vive en tránsito paso 4) | alinea con lo pedido | mediano; reorganiza la UI de la pestaña |
| **B6-3 Completo** | rediseño total: contratista llena CFDI/factura + sube PDFs; finanzas **solo revisa y paga**; pop-up | exactamente lo que pidió el equipo | grande; varias pantallas + backend |
- **Zona:** ✅ libre (`pagos.controller.js`, `instruccion-pago.controller.js`, `TransitoPago.jsx`, `RegistroPagoForm.jsx`). **Nota:** B6 se cruza con #12 (Oleada 5, selector en cerrado) — conviene coordinarlos.

### H7 — Convenio: ¿exigir el oficio PDF para autorizar SIEMPRE?
> Hoy: **crear** convenio ya exige indicar oficio para **todos** (`convenios.controller.js:133`); **autorizar** solo exige el **PDF cargado** si la variación **>25%** (`:405-410`).

| Opción | Qué implica | Pro | Contra |
|---|---|---|---|
| **B7-1 Dejar como está** | PDF cargado solo obligatorio >25% | 0 trabajo | el equipo quiere PDF siempre |
| **B7-2 PDF siempre al autorizar** | exigir el PDF cargado antes de autorizar **todo** convenio (quitar la condición >25%) | alinea con art. 99 (soporte previo para todo convenio); cierra el pedido | chico-mediano; más fricción para convenios chicos |
| **B7-3 PDF al crear** | exigir el PDF (no solo indicarlo) desde la creación | el soporte existe desde el inicio | cambia el momento de carga |
- **Zona:** ✅ libre (`convenios.controller.js`). **Ley (tensión):** art. 99 RLOPSRM (soporte/dictamen previo para TODO convenio) vs art. 102 (revisión SFP solo >25%). *(Roza lo legal — si dudas del "soporte previo", confírmalo con el profe.)*

### H8 — Curva: etapa vigente ¿acumulativa o particionada? (↔ #28)
> Hoy: **particionada** por la fecha del convenio (`etapasAvance.js:47-50`); la vigente arranca ejecutado=0 y se etiqueta "Ejecutado (nuevo)".

| Opción | Qué implica | Pro | Contra |
|---|---|---|---|
| **B8-1 Particionada + leyenda** | dejar el cálculo; agregar leyenda "Ejecutado (nuevo) = solo avances posteriores al convenio" | trivial; no toca el cálculo | el equipo esperaba acumulado |
| **B8-2 Acumulativa** | la etapa vigente acumula previo + nuevo (`etapasAvance.js:47`) | intuitivo para el usuario | cambia el cálculo; pierde la semántica "qué se ejecutó bajo el programa nuevo"; **resolver junto con #28** |
| **B8-3 Doble serie** | graficar AMBAS (acumulado total + nuevo desde convenio) | información completa | más complejo de graficar |
- **Zona:** ✅ libre (`etapasAvance.js`, `CurvaAvance.jsx`). **Nota:** decide esto **junto con #28** (Oleada/opcional) — son la misma lógica de etapas.

---

## C) REQUIEREN TU DECISIÓN LEGAL — cito el artículo y la tensión; NO decido

### H12 ⚖️ — ¿Quién puede ver el Portafolio (HU-18)?
- **Lo verificado (hay incoherencia real a corregir igual):** `portafolio.controller.js:65` deja ver a `['dependencia','finanzas']` (`acceso.js:16`), pero `permisos.js:32` marca `HU-18: {finanzas:null, contratista:null}`, y la ruta `/portafolio` en `App.jsx` **no tiene gate por rol** → **matriz, backend y front se contradicen.**
- **Ley (sin decidir):** no existe artículo que diga quién consulta una "cartera/portafolio agregado" (es un instrumento de gestión que diseñó el equipo). Tensión: **art. 43 RLOPSRM** (la dependencia administra el padrón → "dueño = dependencia") vs **art. 53 LOPSRM / 113 RLOPSRM** (residente/supervisión ejecutan → necesitan visión) y **finanzas** (art. 54/55, autoriza pagos). **art. 74 Bis** = transparencia, pero refiere a CompraNet/padrón, no al portafolio interno.
- **Opciones (tú eliges):** **(A)** solo dependencia (gestión) · **(B)** dependencia + residente/supervisión + finanzas (información). **En cualquier caso** hay que **alinear matriz/backend/front** (hoy se contradicen). **Zona:** ⚠️ CONGELADA (`permisos.js`, `acceso.js`, `App.jsx`) + libres (controller/página) → tu OK de congelado.
- **Bundle:** misma pantalla que **#18** (Oleada 5).

### H13 ⚖️ — Sustituir la supervisión EXTERNA: ¿debe permitirse otra empresa?
- **Lo verificado:** `roster.controller.js:198-205` aplica la **REGLA 4** (sustituto de la **misma empresa**) a **todos** los roles. El propio código admite que es **"criterio del equipo (default conservador), NO literal de ley"**.
- **Ley (sin decidir):** **art. 125 fr. I g RLOPSRM** solo ordena **registrar** la sustitución (no restringe empresa); **art. 53 LOPSRM** permite supervisión **por contrato (externa)**. Tensión: ¿tratar a la supervisión externa como interna (REGLA 4) o permitir cambiarla a otra **firma** de supervisión?
- **Opciones (tú eliges):** **(A)** mantener REGLA 4 igual · **(B)** exceptuar supervisión (permitir otra firma de supervisión) · **(C)** avisar pero no bloquear. **Zona:** ✅ libre (`roster.controller.js`). *Es interpretación → la confirma el profe, no Code.*

---

## D) ACLARACIONES AL EQUIPO (0 código — para que se las pases)

**H3 — "Quiten el botón Corregir de los avances."** No es un error: el sistema **sí permite corregir** un avance, solo que **no lo sobrescribe** — la ley (art. 123 fr. VI/VII RLOPSRM) exige que toda corrección quede como un **registro nuevo** con una nota "dice/debe decir", para que haya constancia. Por eso el avance original queda marcado "anulada (corregida)" sin botón (es histórico, inmutable) y el botón "Corregir" solo aparece en el avance **vigente**. Quitarlo rompería el cumplimiento legal de la bitácora. *(Si lo que quieren es que no se pueda corregir EN ABSOLUTO, eso sería un cambio de regla que decide Maik/el profe, no un bug.)*

**H4 — "Deja registrar avance en un periodo que aún no empieza."** Verificado en el código: **no lo deja.** Si eliges un periodo cuyo inicio es futuro (p. ej. empieza el 30/06 y hoy es 25/06), el sistema responde **error 409: "el periodo aún no inicia… no se puede reportar avance de trabajo no ejecutado"**. Lo más probable es que confundieran un **periodo ya cerrado** (que sí permite registro tardío, pero **avisa**) con un periodo **futuro** (que se bloquea). Si lo reproducen, manden el **folio + número de periodo + fecha** exactos y lo revisamos, pero el gate está y funciona.

**H10 — "El convenio lo autorizó la dependencia pero la nota aparece emitida por el residente."** No es un error: es así **por ley**. Son **dos actos distintos** — (1) la **nota** del convenio en la bitácora la emite/avala el **residente del contrato** (art. 53 LOPSRM: el residente representa a la dependencia en la bitácora); (2) la **autorización** formal del convenio la hace la **dependencia** (art. 59 p3) y queda registrada aparte (sello "autorizado por"). Por eso la nota dice "Residente" aunque la autorización la diera la dependencia. *(Si quieren que la pantalla muestre también quién autorizó, eso sí sería una mejora de presentación que decide Maik.)*

---

## Resumen — ejecutar ya vs esperar decisión

| # | Título | Categoría | ¿Ejecutable ya? | Espera de ti |
|---|---|---|---|---|
| **H1** | Campana/Por firmar notas | 🐛 bug | **Sí** (con OK general) | — · bundle #20 (O4) |
| **H11** | Quitar Excel reporte #1 | 🎨 quick win | **Sí** (1 línea) | — |
| **H9** | `es_adicional` en snapshot | 🐛 bug | Casi | **OK de SCHEMA** |
| **H2** | Foto descripción/obligatoria | 🎨 diseño | No | **Elegir B2-1/2/3** |
| **H5** | Vincular nota obligatoria | 🎨 diseño | No | **Elegir B5-1/2/3** (B5-2/3 = congelado) |
| **H6** | Flujo de pago CFDI | 🎨 diseño | No | **Elegir B6-1/2/3** |
| **H7** | Oficio convenio siempre | 🎨 diseño | No | **Elegir B7-1/2/3** |
| **H8** | Curva acumulativa/particionada | 🎨 diseño | No | **Elegir B8-1/2/3** (↔ #28) |
| **H12** | Quién ve portafolio | ⚖️ legal | No | **Decisión legal A/B** (+ congelado) |
| **H13** | Sustituir supervisión externa | ⚖️ legal | No | **Decisión legal A/B/C** |
| **H3, H4, H10** | Falsos positivos | — | n/a | Solo aclarar al equipo (§D) |

**Ejecutable de inmediato con tu OK:** H1, H11 (+ H9 si apruebas el schema). **Todo lo demás espera tu elección de opción / decisión legal.**
