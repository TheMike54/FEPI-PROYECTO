# AUDITORÍA — 13 hallazgos del equipo de pruebas · 25-jun-2026

> **Solo análisis. NO se tocó código.** Cada hallazgo verificado contra el código (archivo:línea), clasificado en 🐛 BUG / 🎨 DISEÑO (Nivel 2, lo decide Maik) / ⚖️ LEGAL (lo decide Maik con la ley), con veracidad (confirmado / parcial / **falso positivo**), overlap con `REPORTE_PRUEBAS_EXHAUSTIVAS_24jun.md`, tamaño/riesgo y zona congelada/schema.
> Fuente: texto del equipo en `docs/al darle en la campanita y tengo al.md`. El bloque "Avance" agrupaba varias peticiones → separadas en H2/H3/H4. Método: 13 agentes, 1 por hallazgo, verificación en código.

## Conteo

| Lente | Resultado |
|---|---|
| **Por categoría (cruda)** | 🐛 BUG 3 · 🎨 DISEÑO 8 · ⚖️ LEGAL 2 |
| **Por veracidad (lo que importa)** | 🐛 **2 bugs reales nuevos** (H1, H9) + 1 reactiva un bug ya conocido (**#22** vía H2) · ❌ **3 falsos positivos / correcto por diseño** (H3, H4, H10) · 🎨 **6 cambios de diseño** Nivel 2 (H2-UI, H5, H6, H7, H8, H11) · ⚖️ **2 dudas legales** (H12, H13) |

> **Los 3 que pediste verificar salieron como NO-bug:** H4 (periodo futuro **SÍ se bloquea**, el gate funciona) · H10 (emisor=residente es **correcto por diseño**, art. 53) · (+ H3 corregir es append-only correcto). Detalle abajo.

---

## 🐛 BUGS REALES

### H1 — Campana "firmar" lleva a Consulta de notas; "Por firmar" no lista notas pendientes · 🐛 BUG · confirmado
- **Evidencia:** `NotificacionesCentro.jsx:128` navega a `/bitacora/notas` (EmisionNotas, pantalla de emisión/consulta) en vez de `/bitacora/por-firmar`. `PorFirmar.jsx:26` carga **solo** `api.pendientesPorFirmar()` (que devuelve **solo aperturas**, `bitacora.controller.js:328-344`); el endpoint `notas-pendientes.controller.js:9` SÍ devuelve notas pendientes de firma, pero **PorFirmar nunca lo consume**. Por eso la nota a firmar no aparece en la bandeja.
- **Overlap:** parcial con **#20** (ambos sobre "Por firmar" + notas; #20 es el plazo de firma, H1 es la navegación + ausencia de notas en la bandeja).
- **Tamaño/riesgo:** mediano · medio · **zona libre.**
- **Recomendación:** en `PorFirmar.jsx` cargar también `api.notasPendientes()` y mostrar aperturas + notas (secciones), y/o corregir el destino del enlace de la campana. Coherente con #20 → **conviene atacarlo junto con #20 (Oleada 4)**.

### H9 — La etiqueta `es_adicional` no se guarda en el snapshot de versiones del programa · 🐛 BUG · parcial · 🗄️ SCHEMA
- **Evidencia:** `convenios.controller.js:53-55` arma el snapshot `INSERT INTO programa_version_concepto (...) SELECT clave,concepto,unidad,cantidad,pu,orden FROM contrato_conceptos ...` **sin `es_adicional`**; y `schema.sql:1639-1648` define `programa_version_concepto` **sin esa columna**. Resultado: el programa **vigente** sí puede mostrar la etiqueta (`MatrizProgramaLectura.jsx:92`), pero las **versiones anteriores no** (el campo no existe en el snapshot). *(Parte del H10-del-equipo / "Expediente": ver también su segunda mitad "ver versiones anteriores" — eso SÍ existe vía `tabla-versiones`, lo que falta es la etiqueta en el snapshot.)*
- **Overlap:** nuevo.
- **Tamaño/riesgo:** chico · bajo · **🗄️ SCHEMA** (añadir columna `es_adicional BOOLEAN DEFAULT false` a `programa_version_concepto`) + `convenios.controller.js` (no congelado).
- **Recomendación:** DDL aditivo idempotente (columna) + incluir `es_adicional` en el SELECT del snapshot + mapearlo en la matriz de versión. **Requiere tu OK de schema** (autor único: Maik).

---

## ❌ FALSOS POSITIVOS / CORRECTO POR DISEÑO (no tocar; aclarar al equipo)

### H4 — "Periodo futuro deja registrar avance" → **el gate SÍ funciona** · ❌ falso positivo
- **Evidencia:** `trabajos.controller.js:271-279` — el gate **existe y funciona**: `SELECT (inicio > CURRENT_DATE) AS futuro ...`; si `futuro` → `ROLLBACK` + **409** *"El periodo N aún no inicia (comienza el …); no se puede reportar avance de trabajo no ejecutado."* (FIX 22-jun, confirmado en el reporte línea 276).
- **Veredicto:** **NO es bug.** El equipo probablemente confundió **periodo cerrado** (registro tardío, que sí avisa y permite) con **periodo futuro** (que se rechaza). **Recomendación:** aclarar al equipo; pedir que reporten el folio/periodo exacto si lo reproducen, porque el código rechaza el futuro.

### H10 — "Nota de convenio autorizado por dependencia aparece emitida por el residente" → **correcto por diseño** · ❌ por diseño (art. 53)
- **Evidencia:** `convenios.controller.js:288-292` lo hace **a propósito**: comentario *"O-PROFE: la nota del CONVENIO es de CONSECUENCIA → la AVALA el RESIDENTE del contrato (art. 53 LOPSRM), no quien registra"*; `emisorId = contrato.residente_id`. Son **dos actos separados:** (1) la **nota** en bitácora la emite el **residente** (art. 53 / 125 fr. I-e); (2) la **autorización** formal la hace la **dependencia** (`autorizarConvenio`, art. 59 p3 / 99 p5) y solo sella `autorizado_por`, sin crear nota.
- **Veredicto:** **NO es bug**, es el diseño correcto que ya validó el profe. **Recomendación:** aclarar el flujo de dos actores al equipo. **Mejora opcional (DISEÑO, si quieres):** mostrar en el expediente quién **autorizó** (la dependencia) junto a la nota, para que no se lea como contradicción.

### H3 — "Quitar la acción Corregir de los avances" → **append-only correcto** · ❌ por diseño (art. 123 VI/VII)
- **Evidencia:** `TrabajosTerminados.jsx:646-650` muestra `btn-corregir` **solo** en avances `vigente`; el anulado queda "anulada (corregida)" sin botón. `trabajos.controller.js:382` bloquea re-corregir un anulado (409). Corregir = **anula + crea entrada nueva + nota "dice/debe decir"** (inmutabilidad, art. 123 fr. VI/VII RLOPSRM).
- **Veredicto:** **NO quitar.** El equipo asumió "no se puede corregir"; el sistema **sí permite UNA corrección** (append-only legal), no una sobrescritura. **Recomendación:** aclarar al equipo; quitar "Corregir" rompería el cumplimiento de inmutabilidad.

---

## 🎨 CAMBIOS DE DISEÑO (Nivel 2 — los decides tú; NO son bugs a "arreglar")

### H2 — Fotos de avance: descripción por foto + foto obligatoria · 🎨 DISEÑO (+ 🐛 #22 en el server) · parcial
- **Evidencia:** **Múltiples fotos: YA funciona** (`avance_fotos` sin UNIQUE `schema.sql:623`; UI en bucle `TrabajosTerminados.jsx:106-120`). **Descripción por foto: backend listo** (`avance_fotos.descripcion`, `avance-fotos.controller.js:72-75`) pero la **UI manda `''` hardcodeado** (`TrabajosTerminados.jsx:75`). **Foto obligatoria server-side: FALTA** (solo front `:269`; `registrarAvance` no valida) = **bug #22 ya conocido**.
- **Overlap:** **#22** (server-side foto). **Tamaño/riesgo:** mediano · medio · **zona libre.**
- **Recomendación:** (DISEÑO) añadir campo de descripción por foto en la UI y pasarlo en `subirFotoAvance`. (BUG #22, ya en el plan como Oleada 7) validar ≥1 foto server-side. *El "múltiples fotos" que pide el equipo **ya existe** — aclarar.*

### H5 — Soportes/notas (paso 4): solo vincular notas tipo "solicitud de aprobación" firmadas, y obligar a vincular · 🎨 DISEÑO · confirmado
- **Evidencia:** `IntegracionEstimacion.jsx:786-789` filtra notas solo por `aceptacion='firmada'` y `tipo!='apertura'` (sin restringir a `sup_estimaciones`); el modal permite cualquier nota firmada y el vínculo es **opcional**. El tipo `sup_estimaciones` ("Solicitud de aprobación de estimaciones") existe en el catálogo; `aceptacion='firmada'` ya implica firmada por el roster.
- **Overlap:** nuevo. **Tamaño/riesgo:** mediano · medio · **zona libre.**
- **Recomendación (decides tú):** (a) ¿exigir solo `sup_estimaciones` u otros tipos? (b) ¿hacer obligatorio vincular para avanzar? Si sí → gate en el paso 4 (front) + validación en `integrarEstimacion`. Es un **nuevo gate de flujo**, no un bug.

### H6 — Pago/tránsito: contratista sube CFDI/oficio + finanzas solo revisa/paga; pestaña de registro solo historial · 🎨 DISEÑO · parcial
- **Evidencia:** Parte **ya existe** (follow-on 23-jun): el contratista sube CFDI/oficio binario (`TransitoPago.jsx:414-429`, `instruccion-pago.controller.js:497-525` `cobro_soportes`) y finanzas **hereda** el CFDI. **Falta:** (1) gate en `pagos.controller.js:registrarPago` que exija que existan `cobro_soportes` antes de pagar; (2) pop-up de confirmación "CFDI y factura coinciden"; (3) la pestaña "registro del pago" aún muestra captura (el equipo la quiere solo-historial).
- **Overlap:** relacionado con #12 (selector en cerrado) pero **nuevo**. **Tamaño/riesgo:** mediano · medio · **zona libre.**
- **Recomendación (decides tú):** es rediseño de flujo de cobro. Definir el contrato exacto (qué sube el contratista, qué revisa finanzas, qué se oculta) antes de tocar.

### H7 — Convenio: exigir oficio PDF para autorizar **siempre** (no solo >25%) · 🎨 DISEÑO con matiz ⚖️ · parcial
- **Evidencia:** `convenios.controller.js:133` — **crear** convenio ya **rechaza sin oficio CUALQUIER convenio** (`if (!oficio) 409`, cita art. 99 RLOPSRM). `convenios.controller.js:405-410` — **autorizar** solo exige el oficio **subido (PDF)** si la variación **>25%** (art. 102). O sea: hoy ningún convenio llega a autorizarse sin haber indicado un oficio al crear; lo que varía es si se exige el **PDF cargado** al autorizar.
- **Overlap:** nuevo. **Tamaño/riesgo:** mediano · bajo · **zona libre** (`convenios.controller.js`).
- **Matiz legal:** art. 99 RLOPSRM (soporte/dictamen previo para TODO convenio) vs art. 102 (revisión SFP solo >25%). **Recomendación (decides tú):** opción más limpia = exigir la **carga del PDF** del oficio antes de autorizar **todo** convenio (no solo >25%), alineado con art. 99. Confirma el criterio de "soporte previo" con el profe.

### H8 — Curva: la "etapa vigente (post-convenio)" muestra ejecutado=0 · 🎨 DISEÑO/presentación · confirmado · (↔ #28)
- **Evidencia:** `utils/etapasAvance.js:47-50` particiona el ejecutado **por la fecha del convenio**: la etapa vigente arranca en `inicioVent=fecha del convenio`, así que sin avances con fecha ≥ convenio, ejecutado vigente = 0. `CurvaAvance.jsx:619` lo etiqueta *"Ejecutado (nuevo)"* (vigente) vs *"Ejecutado (congelado)"* (histórica). Es **partición por diseño** (documentada "no negociable: por la FECHA del convenio"), no un cálculo roto.
- **Overlap:** **complementa #28** (#28 = la etapa histórica se mueve con capturas retroactivas; H8 = la vigente arranca en 0 por partición).
- **Tamaño/riesgo:** mediano · medio · **zona libre.**
- **Recomendación (decides tú/profe):** decidir si la etapa vigente debe ser **acumulativa** (previo + nuevo) o **particionada** (solo lo posterior al convenio, como hoy). Mínimo: una **leyenda** que aclare "Ejecutado (nuevo) = solo avances posteriores al convenio". Relacionar con la resolución de #28.

### H11 — Reporte #1 "Avance físico": quitar Excel, dejar solo PDF · 🎨 DISEÑO · confirmado
- **Evidencia:** `reportesContrato.js:461` — `CATALOGO_REPORTES[0].formatos = ['PDF','Excel']`; `ExportacionReportes.jsx` pinta ambos botones (`btn-exportar-1-pdf`, `btn-exportar-1-excel`).
- **Overlap:** nuevo. **Tamaño/riesgo:** **trivial** · bajo · **zona libre.**
- **Recomendación (decides tú):** cambiar `formatos` a `['PDF']` (1 línea). Quick win si lo apruebas.

---

## ⚖️ DUDAS LEGALES (decides tú con la ley; aquí solo cito y expongo la tensión)

### H12 — ¿El Portafolio (HU-18) solo lo debe ver la dependencia? · ⚖️ LEGAL · confirmado
- **Evidencia (hay además una incoherencia real que arreglar):** `portafolio.controller.js:65` usa `ROLES_VEN_TODO=['dependencia','finanzas']` (`acceso.js:16`) → **finanzas ve todos** los contratos. Pero `permisos.js:32` define `HU-18: {finanzas:null, contratista:null}` (prohibido). Y la ruta `/portafolio` en `App.jsx` **no tiene gate por rol** (la UI queda libre). → matriz, backend y front **no concuerdan**.
- **Overlap:** distinto de #18 (#18 = contratos cerrados con semáforo; H12 = quién puede ver). **Nuevo.**
- **Tamaño/riesgo:** mediano · medio · **zona:** `permisos.js` ⚠️ CONGELADA (matriz), `acceso.js` ⚠️ CONGELADA (lib), `portafolio.controller.js` y `PortafolioEjecutivo.jsx` libres.
- **Ley (sin decidir):** **No hay artículo que diga quién consulta una "cartera/portafolio agregado"** — es un instrumento de gestión que diseñó el equipo. Tensión: **art. 43 RLOPSRM** (la dependencia administra el padrón → sugiere "dueño = dependencia") vs **art. 53 LOPSRM / 113 RLOPSRM** (residente/supervisión ejecutan → necesitan visión) y **finanzas** (art. 54/55, autoriza pagos → ¿necesita salud de cartera?). **Opciones:** (A) solo dependencia (gestión); (B) dependencia + residente/supervisión + finanzas (información). **Decides tú con el profe.** En cualquier caso hay que **alinear matriz/backend/front** (hoy se contradicen).

### H13 — Sustituir la supervisión **externa**: ¿debe permitirse otra empresa? · ⚖️ LEGAL · confirmado
- **Evidencia:** `roster.controller.js:198-205` — la REGLA 4 exige sustituto de la **MISMA empresa** para **todos** los roles (residente/superintendente/supervisión), sin distinción. El propio comentario (`:192-197`) admite que es **"criterio del equipo (default conservador)", NO literal de ley**: *"art. 125 fr. I g RLOPSRM solo obliga a REGISTRAR la sustitución en bitácora — 'no cambiar la empresa' no es literal de ley"*.
- **Overlap:** nuevo. **Tamaño/riesgo:** chico · bajo · **zona libre.**
- **Ley (sin decidir):** **art. 125 fr. I g RLOPSRM** solo ordena **registrar** la sustitución; no restringe la empresa. **art. 53 LOPSRM** permite supervisión **por contrato (externa)**. Tensión: la supervisión externa es un **tercero contratado** → cambiarla a otra **firma** de supervisión es plausible; aplicarle la REGLA 4 (misma empresa) la trata como interna. **Opciones:** (A) mantener REGLA 4 igual (conservador); (B) exceptuar supervisión (permitir otra firma de supervisión); (C) avisar pero no bloquear. **Decides tú con el profe** — es interpretación, no la decide Code.

---

## Relación con las Oleadas de bugs PENDIENTES (2-5)
> La auditoría **no cambia** el fondo de las Oleadas 2-5, pero **dos hallazgos tocan las mismas pantallas** y conviene bundlearlos:
- **H1 ↔ #20** (bitácora "Por firmar" / firmas) → si entras a #20 en **Oleada 4**, arregla H1 en la misma pasada.
- **H12 ↔ #18** (Portafolio) → si entras a #18 en **Oleada 5**, resuelve también la incoherencia de acceso de H12 (tras tu decisión legal).
- **H2 (server) = #22** → ya estaba como **Oleada 7** (criterio del equipo, no ley).
- El resto (H5/H6/H7/H8/H11 diseño; H13 legal; H9 schema) son **trabajo nuevo** fuera de las Oleadas 2-5.

## Recomendación de priorización (tú decides qué entra)
1. **Aclaraciones al equipo (0 código):** H3, H4, H10 son falsos positivos / correcto por diseño — explícalos para no "arreglar" lo que está bien.
2. **Quick wins de diseño si los apruebas:** H11 (quitar Excel, trivial), H2-UI (descripción por foto).
3. **Bundle con oleadas:** H1 con #20 (O4), H12-incoherencia con #18 (O5).
4. **Decisiones tuyas antes de tocar:** H12 y H13 (legal), H5/H6/H7/H8 (alcance de diseño), H9 (OK de schema).
