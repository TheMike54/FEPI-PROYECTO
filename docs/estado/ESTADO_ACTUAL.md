# SIGECOP — Estado actual del sistema (documento canónico)

> **🔄 Actualización 2026-07-01 (SELECTOR DE FECHA DE SIMULACIÓN — lente de SOLO LECTURA).** Nueva pastilla
> en la barra superior (visible para todos los roles) que permite "ver" el sistema desde una fecha distinta
> a la real para probar **alertas de atraso, vencimientos de plazos/notas y semáforos** sin escribir NADA en
> la BD. **Es un LENTE DE LECTURA, no un editor:** solo cambia la fecha de REFERENCIA con la que se CALCULA;
> jamás altera `fecha_creacion`/`fecha_nota`/`integrada_en` ni ningún sello. **Mecánica:** el frontend agrega
> `?fecha_ref=YYYY-MM-DD` **solo a peticiones GET** (nunca a escrituras); el backend lo honra únicamente en
> handlers de LECTURA vía `COALESCE($N::date, CURRENT_DATE)` (null ⇒ hoy real ⇒ **cero regresión**). Las
> ESCRITURAS (crear nota, integrar/enviar/autorizar estimación, registrar avance, firmar, pagar, generar
> instrucción) **siempre** usan `NOW()`/`CURRENT_DATE` real. **El fix de vigencia de firma art. 125 (commit
> `1ea4077`, `bitacora.controller::firmarNota`) queda INTACTO** (usa `n.fecha`, no "hoy"; es escritura, no
> recibe `fecha_ref`). **Zona congelada NO tocada.** NUEVOS: `backend/src/lib/fechaRef.js`,
> `frontend/src/lib/fechaSimulada.js`, `context/SimulacionFechaContext.jsx`,
> `components/ui/SelectorFechaSimulacion.jsx`. EDITADOS (solo lecturas): `alertas`/`tablero`/`portafolio`/
> `instruccion-pago`/`bitacora` controllers + `services/api.js` + `Layout.jsx` + `AppShell.jsx` +
> `pages/CurvaAvance.jsx` (su `hoyISO()` respeta la fecha simulada). Build `vite build` verde. **LOCAL,
> commit en `main` sin push.** **[para Maiki]** el selector es una utilidad de PRUEBA/demo transversal (no un
> flujo de negocio LOPSRM); queda a tu criterio si merece una HU-25 formal o vive como herramienta interna.
>
> **🔄 Actualización 2026-06-26 (HU-06 avance).** Sobre el estado del 24-jun: **la foto de evidencia del avance
> volvió a ser OBLIGATORIA** (decisión consciente del equipo/Maiki, no ley; el art. 132 fr. IV es discrecional) y ahora
> el **backend la valida** (`trabajos.controller:registrarAvance` → 400 sin foto), no solo el frontend → **bug #22
> CERRADO**. Además, las **observaciones de las fotos de avance se pueden anotar/editar después de subirlas** (nuevo
> `PATCH /api/avance-fotos/:id` → `avance-fotos.controller:editarFoto`; `FotosDeAvance` con campo y ✎ inline). Detalle:
> `docs/reportes/HU06_FOTO_OBLIGATORIA_Y_OBSERVACIONES_26jun.md`. **LOCAL, sin push; pendiente desplegar `main`.**
>
> **🔄 Actualización 2026-06-24 (cierre de jornada, antes de reinicio de PC).**
> **Git: `main` local = `d941024`** — DOS commits por delante de Render. **Render sigue en `cb10b27` (deploy del
> 21-jun): NADA de 22/23/24-jun está desplegado.** Working tree con **trabajo local sin commit** (≈16 archivos no
> congelados + docs nuevos). **TODO en LOCAL; nada se subió a Render esta semana.** Build `vite build` verde.
>
> **A) Ya COMMITEADO en `main` local (ahead de Render):**
> - **`ad92f19` (23-jun) — 7 brechas + HU-16 desconectado + severidad limpia:** G1 carátula GACM **exportable**
>   (documento imprimible), G2 conceptos **adicionales** etiquetados, G3 **notificación de cobro** al autorizar,
>   G4 **curva versionada** (denominador financiero congela por versión del programa), G5 **riesgos** en
>   portafolio (pago-sin-avance), G6 **cierre de instrucción** de pago, G7 **fechas** en historial. **HU-16
>   reingreso DESCONECTADO** del catálogo (el rechazo se reintegra por HU-12) y **`severidad` limpiada** de la
>   lógica (queda residuo en schema con DEFAULT, ver bugs).
> - **`d941024` — galería de fotos de avance HU-06 (fix A1 base):** `TrabajosTerminados.jsx` ahora **lista, ve y
>   elimina** las fotos del avance (antes solo subía y no se veían); con redimensionado en cliente.
>
> **B) Trabajo de HOY en working tree (LOCAL, SIN commit — pendiente que Maiki revise diffs e integre):**
> - **A1 — foto OBLIGATORIA al registrar avance (CRITERIO DEL EQUIPO, no ley):** el botón "Registrar avance"
>   se deshabilita sin foto; la foto se sube en el mismo flujo (POST avance → sube foto a su id). *La ley NO lo
>   exige (art. 132 fr. IV es discrecional); marcado como criterio. El backend aún NO la valida → **bug #22**.*
> - **A2 — checklist art. 132** en el paso 4 de integración (las 7 fracciones, dónde vive cada una y su estado).
> - **A3 + Propuesta B — CURVA POR ETAPAS (versión del programa):** al entrar un convenio, el % del **plan
>   original se CONGELA** como histórico (no se re-escala) y arranca una etapa **vigente** sobre el plan
>   modificado; el ejecutado se parte por la **fecha del convenio**. Cada tarjeta de etapa tiene un **desplegable
>   «Ver programa de obra»** (Variante 1) ligado a SU versión (v1/v2): periodos con fechas + matriz
>   concepto×periodo + total. Resuelve el "26% hoy, 13% mañana". Solo frontend (`utils/etapasAvance.js` nuevo +
>   `CurvaAvance.jsx`), reusa `api.versionPrograma`/`MatrizProgramaLectura`. **Cierra la brecha de curva no-versionada.**
> - **B4 — ampliar cantidad de un concepto existente en convenio:** panel «Ampliar» (Variante B) con cajas
>   original/+extra/total; el **P.U. se HEREDA del original (art. 59 LOPSRM)**, nunca se teclea. Modelo: fila
>   adicional con clave derivada `CONC-01-A`. **Enforce server-side aplicado** en `convenios.controller.js`
>   (autorizado por Maiki, +6 líneas aditivas): rechaza 400 si la ampliación no hereda el P.U.
> - **B5 — etiqueta "Adicional"** ahora también en la matriz del programa y la curva (`programa.controller.js`
>   expone `es_adicional` — 1 línea al SELECT, autorizada).
> - **8 reportes REDISEÑADOS con formato/branding (cierra brecha HU-19/HU-12):** **Carátula de estimación** como
>   documento PDF (banda guinda, bloques importes/amortización/neto, resumen de conceptos GACM, firmas
>   Elaboró/Revisó/Autorizó/Vo.Bo.); **R1 avance físico** y **R5 bitácora** como documentos imprimibles
>   (`window.print`, patrón carátula, curva S y semáforo reusados); **R2/R3/R4/R6/R7** Excel con diseño
>   (helper `descargarExcelReporte`: título y encabezado guinda #691C32, moneda, TOTALES en negrita, métricas
>   en dorado #BC955C, anchos). Quitó `jspdf` (−380 KB). Datos reales verificados; e2e `hu-19` actualizado.
>
> **C) Datos y documentos de QA generados HOY:**
> - **10 contratos `SOP-2026-001..010`** sembrados en la **BD local** (obras reales de Guerrero, cuadre exacto
>   al centavo, alta completa + bitácora con acta de inicio firmada). El SQL vive en
>   `scratchpad/seed_10_contratos.sql` (**no** en `backend/scripts/` aún — moverlo si se quiere reusable).
>   `SOP-2026-001` tiene además convenio v1/v2 + 1 avance (demo de la curva por etapas).
> - **`docs/pruebas/CATALOGO_CAMPOS_SISTEMA.md`** — 40 pantallas, **247 campos** (tipo, obligatoriedad,
>   validaciones front+back, citas de ley). Reutilizable: la próxima sesión solo verifica cambios.
> - **`docs/pruebas/REPORTE_PRUEBAS_EXHAUSTIVAS_24jun.md`** — **30 bugs confirmados** (verificación adversarial),
>   2 falsos positivos descartados. Repartidos: **2 tache-seguro, 10 alto, 12 medio, 4 bajo, 2 cosmético**.
> - **`docs/pruebas/PLAN_PRUEBAS_POSITIVAS_24jun.md`** (98 casos) y **`PLAN_PRUEBAS_NEGATIVAS_24jun.md`**
>   (117 casos) — **215 casos** para el equipo humano, columnas listas para palomear; el negativo marca
>   `[BUG CONOCIDO #N]` donde un gate falla.
>
> **D) 🔴 PENDIENTES (lo más urgente, al 24-jun):**
> 1. **Bug #1 (tache seguro) — backfill del PDF firmado en 28 contratos demo:** integrar estimación falla con
>    "El contrato no tiene su PDF firmado ligado" en TODOS los SOP/PRUEBA-HU salvo PRUEBA-HU-12. El gate es
>    correcto; el seed no liga el PDF. Hay que sembrar `contrato_documentos` tipo='contrato' para los demos
>    **antes de cualquier demo del flujo de estimación**.
> 2. **Bug #2 (tache seguro) — gate de pago en contrato cerrado:** Finanzas puede pagar una estimación de un
>    contrato YA finiquitado (doble liquidación, art. 64). Falta el gate de cierre en `pagos.controller`.
> 3. **Resto del reporte:** gates art. 64 faltantes en garantías/bitácora (bugs #5/#9/#10/#19), validaciones de
>    registro (#14/#16/#25), foto de avance no validada en backend (#22), etc. Todo priorizado en el reporte.
> 4. **Integración por Maiki:** revisar los diffs del working tree, commitear lo aprobado, y decidir el
>    **despliegue a Render** (que va 2+ commits y todo el trabajo de 22-24 atrás).
>
> **NO se tocó código ni schema en esta actualización de docs (24-jun, cierre).** Reportes de detalle:
> `docs/reportes/IMPLEMENTACION_etapas_avance_24jun.md`, `IMPLEMENTACION_HALLAZGOS_24jun.md`,
> `B4_implementacion_24jun.md`.

> **🔄 Actualización 2026-06-23 (sesión autónoma, LOCAL sin push) — 2 auditorías + 2 follow-on:**
> - **Auditorías (solo lectura):** `docs/requisitos/INSUMOS_HISTORIAS_22jun.md` (insumos de las 27 unidades para
>   reescribir las historias en el formato del profe: qué hace + criterio de éxito + ¿cambió? + brechas, con
>   `archivo:función` y cita legal) y `docs/reportes/AUDITORIA_REPORTES_22jun.md` (mapa de ~20 exportaciones +
>   10 huecos; veredicto: salida cruda sin formato; la "curva en blanco" = datos seed, no bug; carátula de
>   estimación no exportable = hueco crítico).
> - **Follow-on (a) — foto por generador (HU-12/04):** `FotosEstimacion.jsx` gana modo `porGenerador` (renglón
>   por concepto, sube con `contrato_concepto_id`, galería filtrada); activado en el expediente. UI pura, sin
>   esquema ni backend. Smoke API verde.
> - **Follow-on (b) — carga binaria del CFDI/oficio en el cobro (HU-20):** tabla NUEVA `cobro_soportes` (BYTEA,
>   aditiva idempotente, ya plegada a `schema.sql`); el **contratista** sube el PDF (CFDI/oficio, valida `%PDF`,
>   solo contratista, gate de contrato cerrado art. 64) en `TransitoPago`, y **Finanzas** lo descarga desde la
>   **cola global** (`AmbientePago`). Endpoints en `instruccion-pago` (no congelado): `POST .../estimacion/:id/archivo`,
>   `GET .../estimacion/:id/archivos`, `GET .../archivo/:archivoId`. Smoke API verde; residuo limpiado.
> - **Único toque a zona congelada:** `schema.sql` += `cobro_soportes` (aditivo, autorizado por Maiki para este
>   follow-on). NO se tocaron auth, `server.js`, `permisos.js`, `App.jsx`, ni los controllers congelados.
>   Build `vite build` verde; login de los 5 roles intacto. Reporte: `docs/reportes/REPORTE_SESION_AUTONOMA_23jun.md`.
>
> **🔄 Actualización 2026-06-21 (CIERRE DE JORNADA) — `main = cb10b27`, DESPLEGADO en Render (reconstruido
> desde cero hoy):** cerró la fase de BD + 2 bugs + evidencia fotográfica + datos de prueba. **Hecho hoy:**
> - **2 bugs corregidos:** (a) el **contrato activo ya NO se hereda entre cuentas** — `ContratoActivoContext`
>   guarda el dueño (`sigecop.contratoActivoUser`), limpia al cerrar/cambiar de sesión y el modal "Elige tu
>   contrato" se relanza; (b) el **chip de HU muestra la HU PUNTUAL** (no el rango): `PestanasCiclo` →
>   "Ciclo · HU-XX", + un **indicador de HU GLOBAL** (chip dorado en la barra superior, `AppShell`,
>   `indicador-hu-top`) visible en TODAS las pantallas.
> - **Evidencia fotográfica IMPLEMENTADA** (ya NO es placeholder/diferida): fotos como **BYTEA en
>   `estimacion_fotos`** (4 columnas `mime/tamano/contenido/subido_por`); subida + galería en el expediente
>   (`components/FotosEstimacion.jsx`, `utils/imagen.js` redimensiona en cliente), endpoint
>   `/api/estimacion-fotos` (`estimacion-fotos.controller`+`routes` nuevos, montados en `server.js`),
>   validación magic-bytes JPEG/PNG, acotado por participación, `subido_por` del JWT. Fundamento art. 132 fr. IV
>   RLOPSRM.
> - **Datos de prueba:** **24 contratos `PRUEBA-HU-01..24`** (base idéntica al centavo, varía solo el estado;
>   `backend/scripts/seed_demo_24.sql`) + **9 empresas realistas** (`reseed_cuentas.sql`) + **cuentas por
>   empresa en el padrón** (fila expandible → sub-tabla Nombre·Correo·Rol·Estado; `GET /api/empresas/:id/personas`,
>   `EmpresasPadron.jsx`).
> - **Bug 4 "Autorizar = Error interno" RESUELTO:** era el schema incompleto en Render (`bitacora_notas.tipo`
>   ENUM viejo sin migrar); al reaplicar `schema.sql` quedó **`tipo = VARCHAR(40)`** + catálogo
>   `res_estimaciones`/`res_convenios`.
> - **Render reconstruido desde cero** (backup → DROP SCHEMA → `schema.sql` → migraciones → reseed → 24
>   contratos; runbook en `docs/planes/RUNBOOK_BD_RENDER_21jun.md`). **Confirmado por Maiki: 9 empresas, 24 contratos,
>   columnas de foto OK, curva/convenio/pago funcionando.**
> - **5 migraciones plegadas a `schema.sql`** (avance append-only, `atraso_asentado`, `estimacion_fotos`, hu20
>   partida_fk, convenio_autorizacion): el patrón "migración sin plegar en `schema.sql`" (que hacía reventar
>   pantallas en un deploy fresco — fue la causa raíz del 500 de la **curva de avance HU-05** en Render) quedó
>   **cerrado de raíz**. Verificado: `schema.sql` desde cero exit 0 + 2ª pasada idempotente; **cero bombas
>   latentes** (auditoría de todo `backend/scripts/`). Zona congelada (`schema.sql`, `server.js`) tocada SOLO
>   de forma aditiva, autorizada e integrada por Maiki.
>
> **QUÉ FALTA (próxima sesión):**
> 1. **Smoke COMPLETO de los 24 contratos `PRUEBA-HU-*` en Render** (recorrer cada estado/HU y confirmar que
>    cada pantalla carga sin error con los datos nuevos).
> 2. **Resolver las 10 decisiones del profe** (las legales de Nivel 1 que ratifica el profe, no Code: están
>    cerradas con un default documentado — ver `docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md` y la
>    Hoja de Validación — pero faltan SU confirmación).
> 3. **Revisar el plan de amortización contra los datos/fotos que traiga el profe** (Fase B: ¿la carátula G2
>    debe OBEDECER al plan capturado? art. 143 fr. I RLOPSRM — hoy la carátula es proporcional, no lee el plan).
> 4. **Ensayar el guion de la demo del 24-jun** con los 24 contratos (`docs/pruebas/PLAN_PRUEBAS_24_CONTRATOS.md`
>    + `CONTRATOS_PRUEBA_ESQUEMA.md`).

> **Este es el documento ÚNICO y canónico del estado del sistema.** `CLAUDE.md` ordena leerlo ANTES de
> cualquier tarea y mantenerlo actualizado DESPUÉS de cualquier cambio. Si algo aquí contradice otro doc,
> **manda éste** (y manda el código sobre éste). No debe haber un segundo doc de estado compitiendo: la foto
> vieja del 02-jun quedó archivada en `docs/historial/contexto/ESTADO_ACTUAL_02jun.md`.
>
> **Propósito:** que cualquier desarrollador (o Claude en otra sesión) pueda **retomar el proyecto sin
> contexto previo**. Todo lo de aquí está **verificado contra el código/git real** (no asumido). Tono
> honesto: lo que funciona y lo que es maqueta están marcados como tales.
>
> **Cabecera de versión (HISTÓRICA — superada por la cabecera de arriba: `main = cb10b27`, TODO ya commiteado
> y desplegado):** la línea base de las entradas 1–14 de abajo fue **2026-06-18**, `main = 75797e2` (oleadas
> A/CITAS/B/PAGO/C + pulido UX ya commiteados) + cambios entonces LOCALES de varias sesiones (entradas 1–13; las más recientes:
> **OLEADA 1** quick wins/errores (11), **OLEADA 2** notificaciones + funcionalidad (12) y **OLEADA 3**
> ley/reglas de negocio 3/5 (13), todas con citas verificadas en `docs/legal` — suite **333/8/0**).
>
> **REDISEÑO MATCH-MOCKUP (18-jun, F0–F6)** sobre todo lo anterior (`docs/planes/PLAN_REDISENO_MATCH_MOCKUP_18jun.md`
> → `docs/reportes/REPORTE_REDISENO_MATCH_MOCKUP_18jun.md`, capturas en `docs/reportes/screens-match-mockup/`):
> **sidebar PLANO por ciclos** (sin acordeón; CICLOS / VISTAS EJECUTIVAS / ADMINISTRACIÓN; los sub-pasos y
> lecturas viven DENTRO de cada ciclo; la "promoción de huérfanos" conserva el acceso de roles que ven un hijo
> pero no el padre). **Bitácora** (padre = wizard Apertura→Firma→Emitir + Consulta/Minutas en paralelo),
> **Estimación** (wizard 5 pasos + bloque "EN PARALELO": Revisión/Reingreso/Historial/Tablero) y **Pago**
> (wizard 4 pasos: Suficiencia→Soportes→Instrucción→**Registrar pago HU-21 embebido**, form compartido
> `components/pagos/RegistroPagoForm.jsx` = única fuente del POST `/api/pagos`, **botón gateado a finanzas**,
> ruta `/pagos/registro` conservada). **Regla de oro:** las vistas TIPO B nunca se condicionan a un paso/candado.
> Es **100% presentación/navegación + tests** (helper `goToViaSidebar` con fallback a `page.goto`): **cero
> backend, zona congelada intacta** (`permisos.js`/`auth`/`acceso`/controllers/`schema.sql`/rutas `App.jsx` sin
> tocar). Suite **340/8/0**. Detalle de las entradas previas:
> (1) **Revisión del profe 15-jun** (`docs/planes/PLAN_REVISION_PROFE_15jun.md`): FASE 2 reglas del plan de
> amortización (proporcional al programa, art. 143 fr. I), FASE 3 deduplicación fuerte de empresas, FASE 1
> seed de datos demo (`backend/scripts/seed_demo.sql`, `docs/SEED_DEMO_SIGECOP.md`).
> (2) **Sesión autónoma de empresas 16-jun** (`docs/planes/PLAN_SESION_AUTONOMA_EMPRESAS_15jun.md`): el
> registro de empresa pasó de texto libre a **SELECTOR del catálogo** (imposible duplicar); consolidado de
> requerimientos del profe (`docs/REQUERIMIENTOS_PROFE_CONSOLIDADO.md`); convenio HU-03 en el seed;
> **reorganización de `docs/`** (planes/, reportes/, referencias/).
> (3) **Revisión del profe 16-jun, FASES 0-3** (`docs/planes/PLAN_REVISION_PROFE_16jun.md`): **FASE 0**
> expediente HU-04 (programa sin "restante", buscador solo tipo-doc/periodo, **oficio de aprobación del
> convenio** reusando `contrato_documentos` con `convenio_id`/`tipo='oficio_convenio'`) + presentar
> estimación **por estado** (mensaje claro en HU-13); **FASE 1** historias reescritas a **lenguaje natural**
> (sin jerga; evidencia técnica queda en `AUDITORIA_COHERENCIA_HU.md`); **FASE 2** campo **`contratos.ubicacion`**
> (alta, opcional) + nota de apertura **redactada con todos los datos del alta** (objeto/ubicación/partes/
> monto/anticipo/plazo/fechas), imprimible; **FASE 3** seed con ubicación + oficio del convenio.
> (4) **Integración + FASES 4-5 (17-jun)**: **PARTE A** integró **HU-18 Portafolio** (rama `feat/e3-hu-18`,
> `GET /api/portafolio` montado en `server.js`, semáforo server-side acotado por participación; ya no es
> maqueta); **PARTE B / FASE 4** construyó el **FINIQUITO (HU-24)** (DDL aditiva `finiquitos` + `contratos.estado`,
> `controllers/finiquito` + `/api/finiquito`, saldo server-side, nota de bitácora, cierre, documento art. 170;
> ruta `SoloRol` en `App.jsx` y link en Sidebar — **`permisos.js` NO se tocó**); **PARTE C / FASE 5** construyó
> el **ambiente de estimación por bloques** como **CASCARÓN** (`AmbienteEstimacion.jsx`, envuelve la carátula
> existente vía `estimacion-prep`; el bloque **dedicado** de **generadores** y el de **soportes/fotos** son
> placeholders del cascarón que **delegan a HU-12** — los números generadores en sí SÍ se capturan y persisten
> en la integración HU-12, art. 132 RLOPSRM; integración/envío reales se delegan a HU-12/HU-13; historial
> aparte). Suite **265/8/0**.
> (5) **Sesión autónoma E2 (18-jun, `docs/planes/PLAN_SESION_AUTONOMA_E2_18jun.md`)**: cerró dos maquetas con
> backend real. **HU-02 fianzas** → `garantias.controller` + `/api/garantias` (CRUD por pantalla, una garantía
> por tipo art. 48 LOPSRM, **PDF real** en `contrato_garantias.pdf_*`, **endosos** art. 91 RLOPSRM);
> `RegistroFianzas.jsx` cableado. **HU-11 minutas/visitas** → `minutas.controller` + `/api/minutas` (CRUD +
> PDF + **vínculo minuta/visita↔nota** de bitácora art. 123 fr. X RLOPSRM, sin alterar la nota);
> `MinutasVisitas.jsx` cableado. Schema **aditivo** (garantías pdf_*; minutas.participantes; visitas.lugar/
> responsable/nota_id). Seed cubre ambas. Montaje: 2 routers en `server.js` (**`permisos.js`/`App.jsx` NO se
> tocaron**: HU-02/HU-11 ya tenían ruta). Suite **267/8/0**. **Actualízala** cuando edites este doc.
> (6) **Sesión grande (18-jun, BLOQUE A)**: integró **HU-20 Tránsito a pago** (PR `feat/e3-hu-20`):
> `instruccion-pago.controller` + `/api/instruccion-pago` montado en `server.js`. Suficiencia presupuestal
> server-side (art. 24), semáforo del plazo 20 días (art. 54) anclado en la nota de autorización, checklist
> de soportes (factura/CFDI metadatos + fianza leída de garantías), instrucción de pago real (1×estimación,
> UNIQUE). **Esta sesión añadió un gate de finiquito** (rechaza generar si el contrato está 'cerrado', art.
> 64 LOPSRM / 170 RLOPSRM) y **resolvió todos los `[validar profe]`** con base legal (ver historia HU-20).
> Usa tablas existentes (`presupuesto_anual`/`instruccion_pago`/`estimacion_soportes`), **sin DDL**. Se
> consolidó el spec viejo de la maqueta (`hu-20-transito.spec.js` borrado; el del PR `hu-20-transito-pago`
> queda). **`permisos.js`/`App.jsx` NO se tocaron** (HU-20 ya tenía ruta). Suite **268/8/0**.
> **BLOQUE B — 7 AMBIENTES de sistema** (cascarones de navegación por bloques que ENVUELVEN las HU sin
> fundirlas, patrón `AmbienteEstimacion`): **bitácora** (`/bitacora/ambiente`), **expediente/reportes**
> (`/contratos/expediente-ambiente`), **pago** (`/pagos/ambiente`), **finiquito** (`/contratos/cierre`),
> **convenios** (`/contratos/convenio-ambiente`), **avance** (`/seguimiento/ambiente`) y el **MACRO ciclo de
> vida** (`/contratos/ciclo-vida`, 14 bloques, al final). Cada uno = página nueva en `src/pages/` + ruta
> `<SoloRol>` en `App.jsx` + sección nueva en `Sidebar.jsx`, **fuera del catálogo de HU** (`permisos.js`
> INTACTO; **NO son HU nuevas**, son navegación — como `AmbienteEstimacion`). Solo `Link` + lectura
> read-only; cero lógica de negocio, cero DDL. Spec por ambiente (`ambiente-*.spec.js`, `ciclo-vida.spec.js`).
> Suite final **305/8/0**. Reporte: `docs/reportes/REPORTE_SESION_GRANDE_18jun.md`.
> (7) **Plan Grande (18-jun, `docs/PLAN_GRANDE_IMPLEMENTACION_18jun.md`) — BLOQUES 1-2 hechos (de 4):**
> **BLOQUE 1 (Empresas):** schema aditivo `empresas.tipo`/`estado`; backend del padrón
> (`empresas.controller` + `/api/empresas/*` SOLO dependencia: padrón/por-validar con dedup/validar/fusionar);
> **acotamiento por empresa** en `lib/acceso.js` **RETROCOMPATIBLE** (dormido hasta que el JWT traiga
> `empresa_id`; finanzas transversal, operativos por participación, dependencia acota su dependencia si la
> fila trae `dependencia_empresa_id` — el SELECT congelado `listarContratos` lo integra Maiki); pantalla
> **`EmpresasPadron.jsx`** (`SoloRol dependencia` `/admin/empresas`). Citas art. 43 RLOPSRM / 74 Bis LOPSRM.
> Verif adversarial **APROBADA**. Follow-on: registro *obligar* empresa + guard de roster + enforcement de
> lista. **BLOQUE 2 (bugs):** nota del convenio visible (columna "Nota de bitácora", `convenios.controller`
> +JOIN); apertura en libro y avance→nota auto **ya estaban**. Suite **309/8/0** (1 flaky). Reporte:
> `docs/reportes/REPORTE_PLAN_GRANDE_18jun.md`. **BLOQUE 3 HECHO** (ver entrada 9); **pendiente BLOQUE 4**
> (navegación modo-sistema). **`lib/acceso.js` (core) tocado aditivo → revisión de Maiki.**
> (8) **Acotamiento por empresa ENCENDIDO (18-jun, sesión dedicada, `docs/reportes/REPORTE_ACOTAMIENTO_EMPRESA_18jun.md`):**
> el acotamiento de (7) dejó de estar dormido. **JWT (`auth.controller`) ahora firma `empresa_id`** (aditivo:
> conserva `{id,rol,nombre}`, añade `empresa_id: usuario.empresa_id ?? null`; `auth.middleware` SIN cambios —
> `req.user=payload` ya lo expone). **`listarContratos` y `portafolio`** traen `dependencia_empresa_id` en el
> SELECT y aplican post-filtro `esParteOSupervision`. **Efecto:** cada **dependencia** ve solo los contratos de
> SU empresa (A-no-ve-B probado con `Dependencia Norte`/`dep2`); operativos por participación y finanzas
> transversal SIN cambio; token viejo/`empresa_id` NULL = legado (fail-open). Suite **309/8/0** (mismo flaky,
> pasa aislado); verif adversarial **sin refutaciones**. **LIMITACIÓN (de alcance, decisión de Maiki):** el
> acotamiento es **solo de LISTA**; los gates per-contrato (detalle, bitácora, estimaciones, convenios,
> garantías, finiquito, pagos…) fetchan el contrato **sin** `dependencia_empresa_id` → siguen fail-open por id
> directo. Extenderlo a esos gates = **follow-on**. **Zona congelada (`auth.controller`/`contratos.controller`)
> tocada aditivo → revisión de Maiki; LOCAL sin push.**
> (9) **BLOQUE 3 del Plan Grande (18-jun, `docs/reportes/REPORTE_BLOQUES_3_4_18jun.md`):** **3a —
> `[validar profe]` a CERO** en código vivo, historias y auditoría (159 marcas resueltas; tabla
> `docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md` con A1-A18 citas + B1-B20 criterio; **citas
> verificadas contra el texto literal de `docs/legal/`** — corrigió pena=46 Bis+86-88, art. 46 fr. I/III,
> art. 123 fr. VI=inmutabilidad, art. 125=registro). Tocó comentarios en zona congelada
> (`schema.sql`/`contratos`/`estimaciones`, CERO lógica). **`auth.controller.js`: Maiki aplicó a mano (18-jun,
> aprobado por él) el guard de REGLA 1 en `register` + resolvió el comentario `[validar]` de la regla del
> nombre → NO quedan marcas `[validar]` en auth; NO revertir.** **3b — REGLA 1 COMPLETA:** empresa OBLIGATORIA
> para contratista/supervisión, **frontend + backend**: front `SeleccionRol`/`SolicitudRegistro` +
> `ROLES_EMPRESA_OBLIGATORIA`/`empresaObligatoriaPara` en `data/empresa.js`; backend = guard en `register`
> (`if ROLES_EMPRESA_OBLIGATORIA.includes(rolSol) && empresaId==null → 400`), aplicado por Maiki. Login 5 roles
> OK + registro sin empresa rechaza (probado por Maiki). **3c — REGLA 4:** la sustitución exige
> MISMA empresa (`roster.controller` guard 409; retrocompat fail-open; verificado API 409/201; seed del
> sustituto hereda la empresa de `contratista@`). Specs negativos nuevos (registro sin empresa; sustitución
> de otra empresa). **`permisos.js`/`App.jsx`/auth NO se tocaron.** LOCAL sin push.
> (10) **BLOQUE 4 — navegación modo-sistema (18-jun, `docs/reportes/REPORTE_BLOQUES_3_4_18jun.md`):** marco de
> navegación del mockup `docs/mockups/sigecop-modo-sistema.html` sobre el real, en 4 tandas (suite verde tras
> cada una). REGLA DE ORO: el marco ENVUELVE, NO reescribe contenido. **Sidebar.jsx** (no congelado) reescrito
> a **grupos por flujo** (Flujos · Vistas ejecutivas · Administración + sub-pasos + ambientes "por bloques"),
> conservando CADA `href` con su MISMO gating (HU por `nivelDe` —lee `permisos.js`, no lo toca—; rutas fijas
> por rol) + red de seguridad "Otras pantallas" (ningún enlace desaparece; cada HU sigue identificable por su
> pill, no se funden). **AppShell.jsx** (no congelado): **chip de empresa** (empresa_id del JWT → catálogo),
> **indicador de HU** abajo-derecha (`useLocation`, FUERA de `<main>`), y **pop-ups** de "Por firmar"
> (datos reales HU-08 `/bitacora/pendientes`) y **campana** (notificaciones + atraso), con backdrop;
> `campana-atrasos` y su gating intactos. Helper `expectMetadataAcademicaOculta` acotado a `<main>` (el
> indicador de HU de navegación vive fuera; el invariante real se conserva). Spec nuevo
> `nav-modo-sistema.spec.js` (5). **Suite final 317/8/0.** **NO se tocó zona congelada** (permisos.js/App.jsx/
> auth/SesionContext intactos). GOTCHA de sesión: limpié ~2050 contratos de prueba que polucionaron la BD
> local (folios E2E-*/BITUI*/SMOKE-*/CHK*/NORTE-*) — hacían fallar el flaky `detalle-indicador-atraso:77`
> (no es bug de BLOQUE 4, verificado revirtiendo AppShell). LOCAL sin push.
> **PASE DE DISEÑO (después, solo UX, `docs/reportes/REPORTE_DISENO_NAV_BLOQUE4_18jun.md`):** `Sidebar.jsx`
> → **guinda institucional** + **acordeones** (flujos con sub-pasos colapsables, default solo el flujo actual)
> + ancho sin truncar; `Inicio.jsx` → **cuadrícula curada de módulos principales por rol** (deja de listar los
> 15 sub-HU). Helpers de test expanden el acordeón (`sidebarLinkFor` async). Fix de gating: hijos accesibles
> con padre inaccesible se **promueven a items planos** (ningún enlace se pierde). Suite **323/8/0**. Capturas
> en `docs/reportes/screens-bloque4-diseno/`. NO tocó href/gating/permisos.js/App.jsx/auth/contenido.
>
> (11) **OLEADA 1 — quick wins / errores (18-jun, `docs/reportes/OLEADA1_FIXES_18jun.md`):** Fase 1 del
> `PLAN_MAESTRO_EJECUCION_18jun.md`. 6 fixes, **5/5 citas verificadas contra `docs/legal`**: **1.1** el
> finiquito (`contratos.estado='cerrado'`) **bloquea TODO el ciclo de estimación** (integrar/enviar/turnar/
> autorizar/rechazar/reingresar → 409, **art. 64 LOPSRM**; gate en `estimaciones-ciclo` + el **congelado**
> `estimaciones.controller::integrarEstimacion`, espejo del de `instruccion-pago`); **1.2** minutas/visitas
> muestran el **folio** de la nota (`bn.numero`), no el id (`minutas.controller`+`MinutasVisitas.jsx`, art. 123
> fr. X RLOPSRM); **1.3** el **endoso** exige el dato de su motivo (ampliación→monto, prórroga→vigencia;
> vacío→400; `garantias.controller`, art. 91 RLOPSRM); **1.4** se quitó el cartel **falso** "Pendiente Equipo 3"
> de generadores (ya están en HU-12) + CTA (`AmbienteEstimacion.jsx`); **1.5** el atraso **no se duplica** (un
> asiento por concepto/periodo; `alertas.controller` + **DDL nueva `atraso_asentado`** en
> `backend/scripts/migracion_atraso_asentado.sql`, NO en `schema.sql` → **falta integrar + Render por Maiki**);
> **1.6** el sidebar rotula el **rango** de HU por flujo (`HU 08–11`, `Sidebar.jsx`). Specs negativos nuevos
> (1.1/1.3/1.5). **Congelado tocado:** `estimaciones.controller` (gate, aditivo) → diff a Maiki. Suite
> **326/8/0**.
>
> (12) **OLEADA 2 — notificaciones + funcionalidad (18-jun, `docs/reportes/OLEADA2_FIXES_18jun.md`):** Fase 2
> del plan maestro. **2.1** la consulta de notas muestra chips de **vínculo** (minuta/visita/avance) por nota
> (`bitacora.controller` **congelado** + `BuscadorNotas.jsx`); **2.2** el **reporte #4 de HU-19**
> (observaciones) ya exporta — endpoint NUEVO `GET /api/observaciones/contrato/:id` + `reportesContrato.js`;
> **2.3** el **ciclo de vida** muestra **progreso real** por bloque (Hecho/En curso/Pendiente, derivado de las
> lecturas, defensivo; `CicloVidaContrato.jsx`); **2.4** el avatar abre **"mi info / mi empresa"** (nombre,
> rol, correo, empresa nombre+tipo+estado) — endpoint NUEVO `GET /api/yo` + `AppShell.jsx`; **2.5** **campana
> UNIFICADA** (badge = firmas+atrasos+solicitudes; dropdown en secciones; endpoint NUEVO `GET
> /api/notas-pendientes`; conserva TODOS los testids del BLOQUE 4). **Congelado tocado:** `bitacora.controller`
> (3 EXISTS aditivos) + `server.js` (montaje de 3 routers nuevos) → diff a Maiki. **Sin DDL nueva.** Suite
> **331/8/0**.
>
> (13) **OLEADA 3 — ley/reglas de negocio (18-jun, `docs/reportes/OLEADA3_FIXES_18jun.md`):** Fase 4-ley.
> Maiki autorizó decidir TODO lo legal con `docs/legal`. **HECHO (3/5):** **3.3** el avance físico es
> **APPEND-ONLY** (art. 123 fr. VI/VII RLOPSRM): se eliminaron PATCH/DELETE de `trabajos.controller`, se añadió
> `POST /trabajos/:id/corregir` (anula la original + registro nuevo vinculado + nota "dice/debe decir"), trigger
> `sigecop_avance_inmutable` (DDL `backend/scripts/avance_append_only.sql`), acumulados cuentan solo
> `estado='vigente'`; **3.4** **dependencia NO sustituible** (art. 125 fr. I g): el guard ya existía (whitelist
> `ROLES_ROSTER`), se reforzó ley + UI + spec; **3.5** **re-seed 1 empresa : N cuentas** (art. 43,
> `backend/scripts/reseed_cuentas.*` + `npm run reseed:cuentas`). **COMPLETA (5/5):** **3.1** **HU-20 partida
> obligatoria + join por FK `dependencia_id`** (art. 24 párr. 2 LOPSRM): `crearPresupuesto` exige partida
> (400) y resuelve el texto desde la cuenta; suficiencia/instrucción joinan por `dependencia_id` (no el texto);
> legacy `dependencia_id` NULL → 409 controlado; DDL `migracion_hu20_partida_fk.sql` (UNIQUE →
> `(ejercicio, dependencia_id, partida)`); front `TransitoPago` input partida + `dependenciaId`. **3.2**
> **convenio con acto de AUTORIZACIÓN explícito** (art. 59 párr. 3 + 99 p5 + 102 RLOPSRM): el convenio nace
> `estado='registrado'` (`autorizado_por`=NULL); endpoint NUEVO `POST /api/convenios/:id/autorizar` (rol
> dependencia, guardrail art. 102 >25% exige oficio) sella `estado/autorizado_por/autorizado_en`; DDL
> `migracion_convenio_autorizacion.sql` (re-escribe el trigger `sigecop_convenio_inmutable`). **ALCANCE 3.2
> `[validar]`:** se implementa el ACTO de autorización; el EFECTO material del convenio sigue aplicándose en
> el registro (diferirlo toca lectura del catálogo vivo en HU-12/HU-06 = follow-on para Maiki). **DDL nuevas
> en `backend/scripts/`** → Maiki integra a `schema.sql` + Render. Suite **337/8/0** (+4 specs nuevos).
> (14) **REDISEÑO POR WIZARDS (Fases 3-6 del plan maestro, 18-jun):** "un flujo = un wizard" replicado a 4
> ciclos — **Estimación** (`IntegracionEstimacion`, 5 pasos, insignia; el cascarón `AmbienteEstimacion`
> redirige), **Pago** (`TransitoPago`, 3 pasos + enlace a HU-21), **Bitácora** (`AmbienteBitacora`, 3 pasos +
> Consulta/Minutas en paralelo), **Avance** (`AmbienteAvance`, Registrar + Curva/Atrasos en paralelo). Reusan
> la captura real y los `data-testid` (gating estilo Alta); **`permisos.js`/`App.jsx` NO se tocaron**.
> Historias reestructuradas por ciclos (`docs/requisitos/HISTORIAS_POR_CICLOS.md`, referencia + checklist
> de conservación, NO cambia requisitos). **(Corrección 21-jun: la evidencia fotográfica se IMPLEMENTÓ después
> — ver cabecera — ya NO es "fuera de alcance".)** Reporte de cierre: `docs/REPORTE_EJECUCION_PLAN_GRANDE_18jun.md`.
> Suite **337/8/0**.
>
> **Docs hermanos:** historia completa → `docs/HISTORIAL_PROYECTO.md` · historias de usuario vigentes
> (criterios = sistema real) → `docs/requisitos/Historias_Usuario_ACTUALIZADAS_12jun.md` · auditoría
> criterio-por-criterio → `docs/requisitos/AUDITORIA_COHERENCIA_HU.md`.

---

## 1. Estado general

**Qué es:** SIGECOP es una app web de **gestión técnico-administrativa de contratos de obra pública** bajo
ley mexicana (LOPSRM / RLOPSRM / LFD): alta de contratos con catálogo y programa de obra, bitácora
electrónica con notas firmadas, avance físico, ciclo de estimación (integración → presentación → revisión →
autorización → pago), convenios modificatorios, reportes y control de accesos por rol y por participación en
el contrato. Proyecto académico (UAGRO, Etapa 1), 6 personas en 3 frentes.

**Punto actual:** `main = cb10b27` (2026-06-21). Desplegado en Render (**reconstruido desde cero el 21-jun**:
backup→DROP→schema→migraciones→reseed→24 contratos). Stack y esquema maduros; el **ciclo
núcleo (alta → bitácora → avance → estimación → autorización → pago) funciona end-to-end** contra backend
real. **Ya no quedan pantallas de maqueta pura:** todas las HU del catálogo tienen backend real.

**% funcional (por HU, honesto):** de 27 unidades (HU-00..24 + Registro + Por Firmar + HU-22 roster + HU-23
empresas), **~27 funcionan end-to-end** (≈100% del catálogo); **0 maquetas**. **HU-18 portafolio** pasó a
funcional (17-jun); **HU-02 fianzas y HU-11 minutas** pasaron a funcional (sesión E2 18-jun: `GET/POST
/api/garantias` y `/api/minutas`, PDF, endosos, vínculo a nota); **HU-20 tránsito a pago** pasó a funcional
(sesión grande 18-jun, PR `feat/e3-hu-20`: `GET/POST /api/instruccion-pago`, suficiencia art. 24, semáforo
art. 54, instrucción de pago real). **Sobre los números generadores (art. 132 RLOPSRM): SON funcionales** —
se capturan en la integración de la estimación (HU-12) y se persisten; lo único pendiente es el **bloque
dedicado de generadores** del cascarón (delega a HU-12; refinamiento de UX). **La evidencia fotográfica del
cascarón YA está implementada (21-jun: `FotosEstimacion`, fotos BYTEA en `estimacion_fotos`, art. 132 fr. IV).**
Detalle exacto en §7.

---

## 2. Cómo levantarlo

### Local (Docker)
```bash
docker compose up -d --build     # --build obligatorio tras 'down -v' (gotcha multer)
```
Tres servicios (`docker-compose.yml`):

| Servicio | Contenedor | Puerto host | Detalle |
|---|---|---|---|
| PostgreSQL 16 | `sigecop_db` | **5432** | `schema.sql` montado en `/docker-entrypoint-initdb.d/01_schema.sql` → se aplica solo en **volumen fresco** |
| Backend (Node/Express) | `sigecop_backend` | **4000** | **NO auto-recarga**: tras editar backend → `docker restart sigecop_backend` |
| Frontend (Vite) | `sigecop_frontend` | **5173** | Vite HMR (sí recarga solo) |

- **Reset total de la BD local:** `docker compose down -v && docker compose up -d --build`. En volumen
  fresco, `schema.sql` recrea tablas **y las 5 cuentas demo** (van en el propio schema). 722 contratos de
  prueba se acumulan con las corridas e2e → resetear de vez en cuando.
- **Gotcha `DATABASE_URL`:** el backend monta `./backend:/app`, que incluye `backend/.env` (apunta a
  Render). `docker-compose.yml` fija `DATABASE_URL: ""` para que `dotenv` no lo sobreescriba y `pool.js`
  use la rama `DB_*` local. Sin esto, el backend local pegaría a la BD de Render.

### Cuentas demo (en `schema.sql`, contraseña común `Sigecop2026!`)
`residente@sigecop.test` · `contratista@sigecop.test` · `supervision@sigecop.test` ·
`dependencia@sigecop.test` · `finanzas@sigecop.test` (rol = la columna `usuarios.rol`; el login deduce el
rol, no se elige). *(Doc interno con credenciales reales: `docs/Cuentas_Prueba_SIGECOP.md`, gitignored.)*

### Suite e2e (Playwright)
```bash
cd frontend && npx playwright test            # 273 tests; objetivo: 265 passed / 8 skipped / 0 failed
npx playwright test hu-12-integracion-estimacion   # un spec
```
- **Requiere el stack local arriba** (login real contra backend+BD). Los specs hacen `test.skip(!!CI)`:
  **en CI NO corren** (CI = solo `vite build`). Se corren en local.
- 46 archivos `.spec.js` en `frontend/e2e/`. Algunos siembran datos vía SQL (`backend/scripts/seed_*.sql`)
  y limpian en `afterAll` (`unseed_*.sql`).

### Render (producción — **solo Maiki despliega**, auto-deploy desde `main`)
`render.yaml`:
- **DB:** PostgreSQL 16, **plan free** (⚠️ expira ~25-jun-2026, ver §8).
- **backend** (`runtime: docker`, `healthCheckPath: /api/health`): `DATABASE_URL` ← de la DB (property
  `connectionString`); `JWT_SECRET` generado; `JWT_EXPIRES_IN=8h`; **`RUN_MIGRATIONS="true"`**;
  `NODE_ENV=production`.
- **frontend** (`runtime: static`, `npm run build` → `dist`): `VITE_API_URL=https://sigecop-backend.onrender.com/api`.
- **Migraciones:** `server.js:66` → si `RUN_MIGRATIONS==='true'` llama `initDb()` (`src/db/init.js`), que
  aplica `schema.sql` dentro de **una transacción** (BEGIN/COMMIT, ROLLBACK total si falla = equivalente a
  `psql --single-transaction -v ON_ERROR_STOP=1`). El schema es **idempotente** (`CREATE ... IF NOT EXISTS`,
  guards), así que re-aplicarlo en cada deploy no rompe nada.
- **Runbook de migración con esquema:** backup → migrar single-transaction → verificar código viejo sobre
  esquema nuevo → push. (Ver `docs/historial/oleadas/OLEADA0_continuidad_bd_09jun.md`.)

---

## 3. Arquitectura técnica

### Stack y versiones
- **Frontend:** React 18.3 + Vite 5.4 + Tailwind 3.4 + react-router-dom 6.26. Export: `jspdf` 4.2 +
  `exceljs` 4.4. Test: `@playwright/test` 1.60. Node ≥18.
- **Backend:** Node (≥18) + Express 4.19 + `pg` 8.13 (SQL crudo, sin ORM) + `jsonwebtoken` 9 + `bcryptjs` 2.4
  + `multer` 1.4 (PDFs en BYTEA) + `cors` + `dotenv`. Scripts: `start` = `node server.js`, `dev` = `--watch`.
- **BD:** PostgreSQL 16.

### Estructura de carpetas (real)
```
backend/
  server.js                 # monta routers + initDb gateado por RUN_MIGRATIONS  [CONGELADO]
  Dockerfile
  src/
    controllers/            # 15 controllers (ver abajo)
    routes/                 # un router por dominio
    db/  schema.sql [CONGELADO] · init.js [CONG] · pool.js [CONG]
    lib/  acceso.js (esParteOSupervision) [CONG] · programa.js (guardarMatriz)
    middlewares/  auth.middleware.js (JWT, requireRole) [CONGELADO]
  scripts/  crear-usuario.js · borrar-usuario.js · seed_*.sql · unseed_*.sql
frontend/
  src/
    pages/                  # 28 archivos (una página por HU + auxiliares + _PLANTILLA_VISTA.jsx)
    components/ui/          # 15 componentes del sistema de diseño guinda
    components/vista/        # HeaderVista, SeccionCriterios, RegionEditable, BannerContexto...
    context/SesionContext.jsx   # sesión/JWT, useVistaHU  [CONGELADO]
    data/permisos.js        # matriz HU×rol (E/C/null)  [CONGELADO]
    data/estadoEstimacion.js# etiquetas de estado de estimación
    services/api.js         # cliente HTTP (todas las llamadas)
    services/reportesContrato.js · excelExport.js   # HU-19
    App.jsx                 # rutas + guardas de acceso  [CONGELADO]
  e2e/                      # 46 specs Playwright + _helpers.js
docs/                       # ver HISTORIAL_PROYECTO.md
render.yaml · docker-compose.yml
```

**Backend — 15 controllers:** `auth`, `usuarios`, `contratos`, `bitacora`, `pagos`, `estimaciones`,
`estimaciones-ciclo`, `estimacion-prep`, `roster`, `convenios`, `alertas`, `trabajos`, `tablero`,
`empresas`, `programa(lib)`. **Routers montados** en `server.js`: `/api/{auth, usuarios, contratos,
bitacora, pagos, estimaciones, roster, convenios, alertas, estimacion-prep, estimaciones-ciclo, trabajos,
tablero}` (+ `empresas` vía `/api/auth`).

### ⛔ Zona congelada (de `CLAUDE.md`) — NO editar salvo Maiki por PR
Sostienen auth, control de acceso, cuadre exacto e integridad financiera. **Backend:** `server.js`,
`src/db/{schema.sql, init.js, pool.js}`, `middlewares/auth.middleware.js`, `lib/acceso.js`,
`controllers/routes` de **auth, usuarios, contratos, estimaciones**. **Frontend:** `App.jsx`,
`data/permisos.js`, `context/SesionContext.jsx`. *(Nota: `estimaciones-ciclo` y `estimacion-prep` NO están
congelados — son de Equipo 3.)*

**Convenciones clave:** un solo `schema.sql` (autor único Maiki); migraciones aditivas e idempotentes;
cálculos sensibles server-side (fuente única de verdad); registros formales append-only (triggers);
`registrado_por`/`integrada_por`/etc. salen del **JWT**, nunca del body; cita el artículo (LOPSRM/RLOPSRM/
LFD) en cada validación, o marca `[validar profe]`.

---

## 4. Modelo de datos (`backend/src/db/schema.sql`, **34 tablas**)

### Dominios (tabla → FK principal)
1. **Auth/usuarios:** `usuarios` (ENUM `rol_usuario`, `usuario_estado` pendiente/activo/rechazado; `rol`
   nullable + `rol_solicitado`; `empresa_id`, `aprobado_por` self-FK).
2. **Contrato + catálogo + programa + garantías + jurídicos:** `contratos` (raíz; FKs equipo →`usuarios SET
   NULL`; JSONB `datos_juridicos/penalizacion/amortizacion`; `pena_convencional_pct`) · `contrato_conceptos`
   (catálogo, `clave` capturable art. 45 fr. IX) · `contrato_periodos` + `programa_obra` (matriz A2
   concepto×periodo) · `contrato_actividades` (programa VIEJO, **deprecado**) · `contrato_garantias` ·
   `contrato_documentos` (PDFs en BYTEA) · `plan_amortizacion` (O2).
3. **Roster/sustitución (art. 125):** `contrato_roster` (histórico 1:N (contrato,rol)→persona; índice único
   parcial `WHERE vigencia_hasta IS NULL` = una activa).
4. **Bitácora + notas + firmas:** `bitacora_aperturas` (1 por contrato) · `bitacora_firmantes` (firma
   conjunta) · `bitacora_nota_tipos` (catálogo art. 125 por rol) · `bitacora_notas` (folio único por
   bitácora; `vinculada_a` self-FK) · `bitacora_nota_firmas`.
5. **Avance/trabajos/alertas:** `concepto_avance` (HU-06, ejecutado por concepto+periodo) · `alerta_atraso`
   (HU-07, el disparo se DERIVA en lectura).
6. **Estimación + ciclo:** `estimaciones` (carátula materializada; `estado` ∈ integrada/enviada/autorizada/
   pagada/rechazada; `reemplaza_a` self-FK para HU-16) · `estimacion_generadores` · `estimacion_notas` (N:M
   nota↔estimación) · `estimacion_observaciones` (HU-15) · `estimacion_soportes` (esqueleto) · **`estimacion_fotos`
   (IMPLEMENTADA 21-jun: `mime`/`tamano`/`contenido` BYTEA/`subido_por`; evidencia fotográfica real, art. 132 fr. IV)**.
7. **Pagos/presupuesto:** `pagos` (índice único parcial = no-doble-pago) · `presupuesto_anual` (HU-20; ITEM
   3.1: `partida` **NOT NULL** + FK `dependencia_id`, UNIQUE `(ejercicio, dependencia_id, partida)`) ·
   `instruccion_pago` (HU-20).
8. **Convenios + versionado (HU-03):** `convenios_modificatorios` (ITEM 3.2: `estado` ∈ `registrado`/
   `autorizado` + `autorizado_en`; el acto de autorización lo sella el servidor facultado) · `programa_version`
   (índice único parcial `WHERE vigente`) · `programa_version_concepto` + `programa_version_celda` (snapshots).
9. **Empresas (O3):** `empresas` (índice único FUNCIONAL normalizado, mata duplicados).
10. **Minutas/visitas (HU-11):** `minutas` · `visitas`. **Endosos (HU-02):** `garantia_endosos`.
11. **Finiquito (HU-24, FASE 4):** `finiquitos` (1:1 contrato, append-only con trigger `sigecop_finiquito_inmutable`;
    saldo + `a_favor_de` + `nota_id`) · `contratos.estado` (`vigente`/`cerrado`) + `cerrado_en` (aditivo) ·
    tipo de nota `finiquito` en `bitacora_nota_tipos`.

### Triggers de inmutabilidad (**12**, todos `BEFORE UPDATE FOR EACH ROW`; ninguno toca DELETE)
Dos clases: **bloqueo total** (cualquier UPDATE falla) y **transición controlada** (compara columna a
columna con `IS DISTINCT FROM` y deja pasar UNA transición). **Patrón clave:** "el estado avanza pero el
contenido se congela" — así HU-13/15/16 avanzan el ciclo sin tocar la carátula.

| Tabla | Tipo | Qué deja mutar |
|---|---|---|
| `bitacora_aperturas` | bloqueo total | nada tras aperturar |
| `bitacora_firmantes` | transición | `firmado` false→true (firmar) |
| `contrato_documentos` | bloqueo total | PDF no se reemplaza |
| `bitacora_notas` | transición | `estado` emitida→anulada (corrección = nota nueva vinculada) |
| `pagos` | bloqueo total | auditoría |
| `estimaciones` | transición | congela carátula (subtotal/amort/retención/neto/...); **deja libre `estado`** + sellos de ciclo (`enviada_*`, `reemplaza_a`, `retencion_atraso`, `avance_*_pct`) |
| `estimacion_generadores` | bloqueo total | append-only |
| `bitacora_nota_firmas` | bloqueo total | firma append-only |
| `garantia_endosos` | bloqueo total | histórico de endoso |
| `contrato_roster` | transición | cerrar `vigencia_hasta` NULL→fecha (sustituir, una vez) |
| `convenios_modificatorios` | transición | ligar `nota_id` NULL→valor (asiento diferido) **+ ITEM 3.2:** `estado` registrado→autorizado y sello `autorizado_por`/`autorizado_en` NULL→valor (acto de autorización, art. 59 p3) |
| `programa_version` | transición | `vigente` true→false (supersedido) |

> **FKs `NO ACTION` deliberadas** (`nota_id`, `estimacion_id` en pagos, `contrato_concepto_id` en
> generadores, `sustituye_a`, `convenio_id`): un `SET NULL` dispararía un UPDATE que el trigger
> append-only abortaría; el chequeo diferido a fin de sentencia deja pasar la cascada del contrato.

---

## 5. Flujos críticos (con archivo:función)

### 5.1 Gating del alta (G1-G8) — `contratos.controller.js::crearContrato` + `AltaContrato.jsx`
Dos capas: **wizard cliente** (gating secuencial) y **validación dura server-side** (la única barrera real;
el cliente puede saltarse). Wizard de 7 pasos (`AltaContrato.jsx:1221`): datos+equipo, catálogo, programa
(matriz), jurídicos, garantías/anticipo, plan de amortización (**se omite sin anticipo**), PDF firmado;
+ "Registrados" (auxiliar). El gating secuencial usa `pasoMaxAlcanzado` (`irAPaso:1609`,
`destino = min(target, pasoMaxAlcanzado+1)` → solo se avanza **un paso** y se revalida el actual).

**Candados DUROS server-side (`crearContrato`):**
- **Cuadre catálogo = monto al centavo:** el monto **no se captura**, se DERIVA `Σ ROUND(cant×pu, 2)` en SQL
  (`:127-148`). Por fila: clave ≤40, cantidad>0, pu>0.
- **Folio único:** constraint UNIQUE en BD → catch `23505` → 409 (`:435`).
- **Personas validadas contra BD (no body):** `superintendenteId` debe ser cuenta `contratista` activa;
  `dependenciaId` rol `dependencia`; `residente_id`/`created_by` salen del **JWT** (`:280-334`).
- **Programa:** con matriz, exige cuadre Σ planeado = contratado por concepto (`guardarMatriz` →
  `PROGRAMA_DESCUADRE` 400).
- **Plan de amortización (FASE 2, 15-jun):** Σ del plan = exactamente `ROUND(monto×anticipoPct/100, 2)`
  (art. 138 párr. 3) **y** ligado al programa de obra (art. 143 fr. I RLOPSRM): **R3** ningún periodo
  amortiza más que su importe programado (`Σ ROUND(cant×pu,2)` del periodo); **R2** todo periodo con obra
  programada amortiza algo (rechaza el plan 0/0/todo-al-último). El **default** precargado es
  **proporcional al programa** (no cuotas iguales). Validado en `crearContrato` (server) y
  `AltaContrato.jsx::validarPaso`/`TabPlanAmortizacion` (cliente). La carátula G2 **sigue proporcional**
  (no obedece el plan; Fase B). Proporcionalidad estricta vs. esta banda editable = criterio del equipo
  resuelto (§7.3 / tabla B-amortización): se mantiene la banda editable (cumple art. 143 fr. I).
- Todo **transaccional** (BEGIN/COMMIT/ROLLBACK).

⚠️ **Solo-cliente (el backend NO los exige):** PDF firmado obligatorio, anticipo>30% exige PDF de
autorización, fianza cumplimiento/anticipo obligatorias, jurídicos completos. El backend crea el contrato
sin PDF (se liga después por `subirDocumento`, que sí es estricto: solo residente, magic bytes `%PDF`,
append-only). → *Endurecer server-side es trabajo pendiente (de Maiki/Fundación).*

### 5.2 Ciclo de estimación reconciliado (O7↔HU-15)
Estados internos (columna `estimaciones.estado`, CHECK `schema.sql:544`) vs etiquetas UI
(`data/estadoEstimacion.js:11`):

| Estado interno | Etiqueta UI | Transición — endpoint — candado de identidad (JWT vs columna del contrato) |
|---|---|---|
| `integrada` | **Integrada** | alta `POST /api/estimaciones` (`estimaciones.controller::integrarEstimacion`); `superintendente_id===user.id` (contratista) |
| `enviada` | **Presentada** | `POST /estimaciones-ciclo/estimacion/:id/enviar` (`enviarEstimacion`); `superintendente_id===user.id`; arranca art. 54; **asienta nota `sup_estimaciones`** (art. 125 fr. II-b, OLEADA B) si hay bitácora |
| (turnado) | — | supervisión registra observaciones y **turna** (`turnarEstimacion:350`); `supervision_id===user.id` (el turnado se modela como `estimacion_observaciones.turnado_a='residencia'`, no como estado) |
| `autorizada` | **Autorizada** | `.../autorizar` (`autorizarEstimacion`); `residente_id===user.id` + turnado previo; **asienta nota `res_estimaciones`** (art. 125 fr. I-b, OLEADA B) si hay bitácora |
| `rechazada` | **Rechazada** | `.../rechazar` (`rechazarEstimacion:459`); `residente_id===user.id`; inserta obs `tipo='rechazo'` → `turnado_a='contratista'` |
| (reingreso) | — | **HU-16** `.../reingresar` (`reingresarEstimacion`); `superintendente_id===user.id`; crea NUEVA estimación `'integrada'` (bloque indep., `numero` MAX+1, copia generadores+carátula) ligada a la rechazada por `reemplaza_a` (atómico). NO reinicia el plazo art. 54 (derivado en lectura desde la `enviada_en` de la rechazada). 1 rechazada → 1 reingreso (`UNIQUE reemplaza_a`) |
| `pagada` | **Pagada** | `POST /api/pagos` (`pagos.controller::registrarPago`); `requireRole('finanzas')` + **SOLO estado `autorizada`** (art. 54, OLEADA PAGO) |

- **Vocabulario cruzado a propósito:** estado interno `enviada` = etiqueta "Presentada", endpoint `/enviar`
  (por compatibilidad). No confundir.
- **Gate de pago ESTRICTO** (`pagos.controller`, OLEADA PAGO 14-jun): paga **SOLO** el estado `autorizada`
  (el art. 54 LOPSRM hace de la autorización de la residencia el disparador del pago); pagar una
  `integrada`/`enviada` → **409**. Salvaguardas: `FOR UPDATE`, no-doble-pago, importe = `est.neto`
  server-side, `fecha_pago ≥ integrada_en`.
- **Fórmula del neto** (server-side, SQL, `estimaciones.controller:312`):
  `neto = subtotal − amortización − retención(5 al millar, art.191 LFD) − deductivas − retencion_atraso`.
  `amortización = ROUND(subtotal×anticipo%/100,2)` (art. 143 fr. I RLOPSRM). `retencion_atraso` (art. 46
  Bis LOPSRM / arts. 86-90 RLOPSRM, Etapa C) solo si hay pena pactada + programa + atraso. **Sin IVA**. Candados art. 118
  (acumulado ≤ contratado y ≤ planeado A2) y art. 54 (periodicidad).
- **Historial (HU-14, `historialEstimaciones:22`)** deriva la línea de tiempo de la propia fila (Opción A,
  no hay tabla de transiciones). Hoy solo refleja `integrada` + `enviada`; **autorizada/rechazada/pagada NO
  aparecen** porque faltan columnas-sello (`autorizada_en/_por`, etc.) — punto de extensión pendiente.

### 5.3 Notas automáticas — patrón atómico vs diferido (`bitacora.controller.js`)
Núcleo: **`insertarNotaAtomica(client, ...)` (`:404`)** — recibe el `client` de la tx del llamador (la nota
vive en el MISMO BEGIN/COMMIT que el evento); toma advisory lock por bitácora y asigna folio
`MAX(numero)+1`.
- **Atómico (en vivo):** si el contrato tiene bitácora abierta, el evento asienta su nota en la misma tx y
  (cuando aplica) liga `nota_id`. Emisores: sustitución (`roster`, emisor=JWT), avance (`trabajos`,
  emisor=JWT), convenio (`convenios`, emisor=`residente_id`, art. 53), atraso (`alertas`, emisor=`residente_id`;
  **única que EXIGE bitácora**, 409 si no hay), y **estimación (OLEADA B, `estimaciones-ciclo`): presentar →
  `sup_estimaciones` (emisor=superintendente, art. 125 fr. II-b) y autorizar → `res_estimaciones`
  (emisor=residente, fr. I-b)** — se ligan a la estimación (`estimacion_notas`) y, si NO hay bitácora, NO se
  asientan (no se difieren ni bloquean la transición).
- **Diferido:** sin bitácora, el evento NO se bloquea y deja `nota_id=NULL`; al **`abrirBitacora`** (`:47`)
  se asientan solas (3 barridos `WHERE nota_id IS NULL`: sustituciones, avances, convenios), numeradas tras
  la nota #1 'apertura'. El flag `diferida:true` solo añade al texto "ocurrida el …; asentada al abrir".
- **Distinción legal:** notas de HECHO (avance/sustitución) → emisor = quien ejecuta; notas de CONSECUENCIA
  (convenio/atraso) → emisor = `residente_id` (art. 53).

### 5.4 Carátula viva (`estimacion-prep.controller.js` + `IntegracionEstimacion.jsx`)
- **`GET /api/estimacion-prep/contrato/:id?periodo_fin=…`** (`preparacionEstimacion:16`, read-only, acotado
  por participación) reusa **las mismas consultas que el POST de integración** para que el "disponible"
  coincida exacto con lo que validará el server. Devuelve por concepto `ya_estimado`,
  `planeado_hasta_periodo`, `disponible_periodo = max(0, min(planeado,contratado) − ya_estimado)` (art. 118)
  + bloque `avance` (físico/programado/financiero) + `pena_convencional_pct`.
- **El front refleja, NO decide:** `IntegracionEstimacion.jsx` calcula una **preview** de carátula con
  `round2` (espejo del `r2()` server, `:24`), semáforo de plan que **deshabilita Confirmar**
  (`integrarDeshabilitado:741` si `hayExceso||hayExcesoPlan`), saldos y barras. Al integrar, el backend
  **materializa la carátula oficial** (el banner de éxito muestra los números del backend, no la preview).
  Cabecera del archivo: "Toda la verdad del dinero la calcula el backend; la carátula del cliente es SOLO
  preview."

---

## 6. Cómo se trabaja el proyecto (método — clave para continuidad)

- **Maiki (TheMike54) integra y es el ÚNICO que despliega** a Render (auto-deploy desde `main`). Nadie
  commitea a `main` salvo Maiki.
- **Equipos por dominio:** **Fundación (Maiki)** = auth, alta, control de accesos, estimación core, esquema.
  **Equipo 2** = bitácora/documental/avance (HU-02,04,05,06,07,08,09,10,11). **Equipo 3** = estimaciones
  (ciclo)/pagos/reportes (HU-13,14,15,16,17,18,19,20,21). Ramas `feat/e2-*` y `feat/e3-*`.
- **Ciclo de integración:** los equipos entregan por **PR**; Maiki los revisa/rebasa sobre `main`/integra en
  una rama `integracion-huXX` local, corre la suite, y solo él pushea. **Claude Code construye en local sin
  push** (el usuario revisa el diff e integra).
- **Reglas duras:** cuadre EXACTO al centavo; inmutabilidad append-only (corregir = registro nuevo
  vinculado); cita el artículo de ley o marca **`[validar profe]`** (lo legal lo confirma el profe Carlos
  Silva, no Code); zona congelada.
- **Patrón de oleadas** (correcciones post-revisión del profe, ver `HISTORIAL_PROYECTO.md`):

| Oleada | Qué hizo |
|---|---|
| O0 | Backup/restore de la BD de Render (expira 25-jun) |
| O1 | Paquete de 7 fixes de la revisión del profe |
| O2 | Plan de amortización (forma de aplicación) del anticipo (art. 138 párr. 3) |
| O3 | Catálogo de empresas (autocomplete en registro) |
| O4 | HU-06 v2: avance por periodo + nota automática + bloqueo vs programa |
| O5 | HU-07 v2: panel automático de déficit por concepto (en unidades) |
| O6 | Convenio asienta nota en bitácora + bloque en expediente |
| O7 | Flujo art. 54: contratista presenta / residencia autoriza (luego reconciliado con HU-15) |
| O8 | Notas firmadas vinculadas a la estimación + vista documento |
| O9 | Expediente: un solo PDF (print) en vez de descargables prototipo |
| O-PROFE | Aterriza decisiones del profe (emisor notas=residente, exceso=aviso, cita 143→138) |
| UI-1/UI-2 | Reskin institucional guinda (remapeo de tokens + componentes `ui/`) |
| FASE 15-jun | Revisión del profe: (2) plan de amortización proporcional al programa + reglas R2/R3 (art. 143 fr. I); (3) deduplicación FUERTE de empresas (acentos/sufijos de razón social); (1) **seed de datos demo** (`backend/scripts/seed_demo.sql`) — paquete de 5 contratos (1 completo + 4 en atraso) para demostrar cualquier HU. LOCAL sin commit. |
| Sesión autónoma 16-jun | EMPRESAS: el registro pasó de texto libre (`<datalist>`) a **SELECTOR del catálogo** + "➕ registrar nueva" (imposible duplicar, profe 09-jun: "ya la elijo, no la registro completo"); empresa explícita en el alta (derivada de la cuenta). Consolidado de TODOS los audios del profe (`docs/REQUERIMIENTOS_PROFE_CONSOLIDADO.md`). Convenio HU-03 en el seed. Reorg de `docs/` (planes/reportes/referencias). LOCAL sin commit. |
| FASES 0-3 17-jun (profe 16-jun) | **F0** expediente HU-04 (programa sin "restante" vía flag `mostrarRestante` en `MatrizProgramaLectura`; buscador solo tipo-doc/periodo; **oficio de aprobación del convenio**: migración aditiva en `contrato_documentos` (`convenio_id`, `tipo='oficio_convenio'`, índices parciales) + endpoints en `convenios.controller`/`routes` + UI en `ConveniosModificatorios`/`ConsultaExpediente`) + presentar **por estado** (mensajería en `EnvioEstimacion`). **F1** historias a lenguaje natural. **F2** `contratos.ubicacion` (aditivo; alta `crearContrato`) + apertura redactada con todos los datos del alta (`bitacora.controller::resumenApertura`, fix de fechas Date→ISO). **F3** seed con ubicación + oficio. Specs nuevos: `fase0c-oficio-convenio`, `fase2-apertura-redaccion`. LOCAL sin commit. |

> **Datos demo a demanda (FASE 1, 15-jun):** `backend/scripts/seed_demo.sql` (`npm run seed:demo`, idempotente,
> NO corre en tests) carga `OBRA-2026-DEMO-01` (contrato completo: ciclo de estimación en los 5 estados +
> reingreso, bitácora firmada, plan, garantías) + `OBRA-2026-ATRASO-01..04` (en atraso, para el tablero/
> alertas), todos sobre las mismas cuentas/empresas demo. Guion de prueba por HU en `docs/SEED_DEMO_SIGECOP.md`.
> Script de mantenimiento `consolidar_empresas.js` (dry-run/`--apply`) funde duplicados previos.
>
> **Datos de prueba ampliados (21-jun):** `backend/scripts/seed_demo_24.sql` siembra **24 contratos
> `PRUEBA-HU-01..24`** (base idéntica al centavo, varía solo el estado) + `reseed_cuentas.sql` deja **9 empresas
> realistas** con cuentas por empresa. Para la demo del profe; esquema en `docs/pruebas/CONTRATOS_PRUEBA_ESQUEMA.md`
> + checklist `docs/pruebas/PLAN_PRUEBAS_24_CONTRATOS.md`.

- **Integraciones de equipo recientes:** **HU-15** (revisión técnica E3: supervisión observa/turna,
  residencia autoriza/rechaza; reconcilió O7) · **HU-19** (7 reportes client-side jsPDF/exceljs).

---

## 7. Qué falta (honesto)

### 7.1 Pantallas MAQUETA (sin backend, dummy puro)
**Ya no quedan.** Las tres últimas se cerraron en junio:
- **HU-18 Portafolio** → funcional (17-jun): `GET /api/portafolio` (`portafolio.controller.js`, solo
  lectura, acotado por participación vía `ROLES_VEN_TODO`/`lib/acceso`) calcula el semáforo server-side
  desde datos reales. Umbrales y la definición de "avance físico" = criterio del equipo resuelto (§7.3 /
  tabla B4/B7; umbrales parametrizables, avance medido sin IVA art. 2 fr. XIX RLOPSRM).
- **HU-02 Fianzas / HU-11 Minutas** → funcionales (sesión E2 18-jun); ver §7.2.
- **HU-20 Tránsito a pago** → funcional (sesión grande 18-jun, PR `feat/e3-hu-20`): `instruccion-pago.controller.js`
  + `/api/instruccion-pago`. Suficiencia presupuestal server-side (art. 24), semáforo del plazo de 20 días
  anclado en la nota de autorización (art. 54), checklist de soportes (factura/CFDI metadatos + fianza leída
  de garantías), instrucción de pago real (1 por estimación, UNIQUE) y **gate de finiquito** (rechaza si el
  contrato está 'cerrado', art. 64 LOPSRM / 170 RLOPSRM). `TransitoPago.jsx` cableado (ya no dummy).
  `[validar profe]` resueltos con base legal en la historia HU-20 (comprometido, umbrales, exigibilidad de
  fianza, finiquito, quién genera).

### 7.2 Parcial / brechas de criterio (auditoría: 69 criterios → 35✅/27🟡/**7❌**)
- ~~**HU-02 Fianzas:** pantalla dummy~~ → **FUNCIONAL (sesión E2 18-jun):** `garantias.controller.js` +
  `/api/garantias` (CRUD por la pantalla, **una garantía por tipo** UNIQUE, art. 48 LOPSRM; **PDF real** en
  `contrato_garantias.pdf_*`; **endosos** vía `garantia_endosos`, art. 91 RLOPSRM). `RegistroFianzas.jsx`
  cableado al backend (selector de contrato; ya no dummy).
- **HU-13:** funcional contra backend, pero el **bloqueo de los 6 días (art. 54) es solo aviso ámbar**, no
  candado (el botón Presentar no consulta el plazo).
- **HU-04:** la descarga individual por bloque se cambió (O9) por un PDF único — confirmar con el profe que
  el entregable único satisface el requisito.
- **HU-07:** rediseñado (O5) a panel automático → se perdieron los criterios viejos de alertas
  configurables/umbral/canal (la ficha vieja quedó obsoleta; ya actualizada).

### 7.3 `[validar profe]` — CERRADOS a CERO (BLOQUE 3a, 18-jun)
**Ya NO quedan marcas `[validar profe]` en el código, las historias ni la auditoría** (verificado por grep).
Cada una se resolvió con **cita legal verificada contra el texto literal** (LOPSRM/RLOPSRM/LFD en `docs/legal/`)
o con **criterio del equipo (default conservador)** documentado. La tabla completa (punto · decisión · fundamento)
está en **`docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md`** (A1-A18 con cita, B1-B20 criterio). Lo legal
sigue siendo confirmable por el profe; esto fija el comportamiento por defecto, sin marcas sueltas. Defaults
clave: pago solo `'autorizada'` (art. 54); amortización proporcional (art. 143 fr. I); pena por atraso = art. 46
Bis + 86-88 RLOPSRM (corregido, NO "86-90"/"138/139"); 2 al millar CMIC parametrizable, default no aplica;
ajustes del finiquito parametrizables (default 0). **`auth.controller.js`: Maiki resolvió a mano (18-jun) la
marca `[validar]` de la regla del nombre (≥2 palabras → criterio del equipo, art. 123 fr. III RLOPSRM) y aplicó
el guard de REGLA 1 en `register`. NO quedan marcas `[validar]` en auth; es el estado deseado, no revertir.**

### 7.4 PRs/ramas de equipo
`feat/e3-hu-16`, `feat/e3-hu-18`, `feat/e3-hu-19`, `feat/e3-hu-20` **ya existen** en origin y están
**integrados localmente** (pendientes de push por Maiki). HU-11/minutas se construyó directo en la sesión E2
(sin rama de equipo). **Ya no hay maquetas pendientes de backend.**

---

## 8. Deuda técnica y riesgos

- ⏰ **Reloj de la BD de Render:** el PostgreSQL **plan free expira ~25-jun-2026**. Decisión pendiente
  (pagar plan vs instancia nueva); runbook de backup/restore ensayado en O0. **Es el riesgo #1.**
- ~~**Tablas muertas** (DDL sin controller): `instruccion_pago`, `presupuesto_anual` (HU-20),
  `garantia_endosos` (HU-02)~~ → **YA SE USAN:** `garantia_endosos` por HU-02 (sesión E2) e
  `instruccion_pago`/`presupuesto_anual` por HU-20 (PR `feat/e3-hu-20`). Sin tablas muertas pendientes de
  esos dominios.
- **Código muerto dudoso** (NO tocar sin decisión de Maiki, ver `docs/historial/analisis-y-diseno/AUDITORIA_CODIGO_MUERTO.md`):
  componentes UI huérfanos `Card.jsx`, `Badge.jsx`, `CardCriterioAceptacion.jsx` (0 importadores);
  `BadgeSprint.jsx` es stub de compatibilidad intencional (retorna `null`); `api.health` sin caller.
- **Higiene de BD de prueba:** la BD local acumula contratos/estimaciones entre corridas e2e (722 contratos
  vistos). Tests con métricas globales son frágiles (se acotó `hu-17`; `o7-flujo` ahora limpia en
  `afterAll`). Resetear con `down -v && up --build` periódicamente.
- **Listas sin paginar:** las vistas de listado (contratos, historial, tablero) traen todo sin paginación —
  escalará mal con muchos contratos.
- **Historial de estimación incompleto:** no refleja autorización/rechazo/pago (faltan columnas-sello).
- **Enforcement del alta solo-cliente:** PDF firmado, anticipo>umbral, fianzas obligatorias y jurídicos solo
  se exigen en el frontend; un cliente que pegue al API directo puede saltárselos.
- **Specs e2e de HU-08 desactualizados:** `frontend/e2e/hu-08-apertura-bitacora.spec.js` prueba un formulario
  dummy viejo (testids `btn-firmar-1..3`, `data-parte`) que ya no existe; los tests interactivos están en
  `test.fixme` (parte de los 8 skipped de la suite). Falta reescribirlos como integración con backend real.

---

## 9. Glosario

### Historias de usuario (HU)
| HU | Título | Estado |
|---|---|---|
| HU-00 | Inicio de sesión por rol | ✅ |
| HU-01 | Alta de contratos | ✅ (enforcement parcial solo-cliente; plan de amortización proporcional al programa + R2/R3, art. 143 fr. I — FASE 2 15-jun) |
| HU-02 | Registro de fianzas y garantías | ✅ (sesión E2 18-jun: `/api/garantias` CRUD + PDF real + endosos art. 91 RLOPSRM; una garantía por tipo, art. 48 LOPSRM) |
| HU-03 | Convenios modificatorios | ✅ · **ITEM 3.2 (Oleada 3):** acto de **autorización** del servidor facultado separado del registro (`POST /api/convenios/:id/autorizar`, art. 59 p3 + guardrail art. 102 >25%) |
| HU-04 | Expediente contractual | ✅ |
| HU-05 | Programa y curva de avance | ✅ (el 500 en Render —migración `avance_append_only` sin plegar en `schema.sql`— se corrigió el 21-jun plegándola) |
| HU-06 | Trabajos terminados por periodo | ✅ |
| HU-07 | Alertas de atraso por concepto | ✅ (rediseñado a panel automático) |
| HU-08 | Apertura de bitácora | ✅ |
| HU-09 | Notas tipificadas con firma | ✅ |
| HU-10 | Consulta/búsqueda de notas | ✅ |
| HU-11 | Minutas, visitas y acuerdos | ✅ (sesión E2 18-jun: `/api/minutas` CRUD minutas/visitas + PDF + vínculo a nota de bitácora art. 123 fr. X RLOPSRM, sin alterar la nota) |
| HU-12 | Integración de estimación | ✅ · **FASE 3 (rediseño):** la pantalla es un **WIZARD de 5 pasos** (Periodo→Generadores→Carátula→Soportes→Integrar, patrón del Alta) que reusa la captura real; el cascarón `AmbienteEstimacion` redirige aquí. Historia por ciclos en `docs/requisitos/HISTORIAS_POR_CICLOS.md` (conserva requisitos) · **evidencia fotográfica (21-jun): fotos BYTEA en `estimacion_fotos` + galería en el expediente, art. 132 fr. IV** |
| HU-13 | Envío/presentación de estimación | ✅ (bloqueo 6 días = solo aviso) |
| HU-14 | Historial de estimaciones | ✅ (línea de tiempo incompleta) |
| HU-15 | Revisión técnica y autorización | ✅ |
| HU-16 | Reingreso tras rechazo | ✅ (reingreso real: nueva versión bloque indep. ligada por `reemplaza_a`; plazo art. 54 no se reinicia) |
| HU-17 | Tablero de estimaciones | ✅ |
| HU-18 | Portafolio ejecutivo con semáforos | ✅ (integración 17-jun: semáforo server-side `GET /api/portafolio`, acotado por participación; umbrales/avance físico = criterio resuelto §7.3) |
| HU-19 | Exportación de 7 reportes | ✅ (R4 observaciones pendiente) |
| HU-20 | Tránsito a pago / suficiencia presupuestal | ✅ (sesión grande 18-jun, PR `feat/e3-hu-20`: `GET/POST /api/instruccion-pago`; suficiencia art. 24 server-side, semáforo plazo 20 días art. 54 anclado en nota de autorización, soportes factura/CFDI + fianza leída de garantías, instrucción real 1×estimación UNIQUE, **gate de finiquito** art. 64/170; `[validar profe]` resueltos con base legal en la historia) · **ITEM 3.1 (Oleada 3):** partida específica **obligatoria** + join por FK `dependencia_id` (art. 24 párr. 2) |
| HU-21 | Registro del pago | ✅ (gate ESTRICTO: solo `autorizada`, art. 54) |
| Registro | Auto-registro con aprobación de dependencia | ✅ |
| Por Firmar | Firma de aperturas pendientes | ✅ |
| HU-22 | Sustitución de personas / roster (art. 125) | ✅ |
| HU-23 | Catálogo de empresas | ✅ (registro por **SELECTOR del catálogo**, no texto libre — sesión autónoma 16-jun; + deduplicación FUERTE que funde acentos/puntuación/sufijos de razón social como segunda red — FASE 3 15-jun) · **padrón con cuentas por empresa (fila expandible → Nombre·Correo·Rol·Estado, 21-jun) + 9 empresas realistas en el seed** |
| HU-24 | Finiquito y cierre del contrato | ✅ (FASE 4, 17-jun: `GET/POST /api/finiquito/contrato/:id`; saldo server-side = Σ neto autorizada/pagada − pagos − anticipo no amortizado − `ajustes_finales` parametrizables (criterio resuelto §7.3, default 0); asienta nota de bitácora `finiquito` y cierra el contrato (`contratos.estado='cerrado'`); 1 por contrato, append-only; documento art. 170 imprimible. art. 64 LOPSRM / 168-172 RLOPSRM) |

### Términos legales y de obra
- **Estimación:** documento periódico que valoriza el avance ejecutado para cobro (art. 54 LOPSRM).
- **Carátula:** resumen financiero de la estimación (subtotal, amortización, retenciones, deductivas, neto).
- **Amortización del anticipo:** descuento proporcional del anticipo en cada estimación (art. 143 fr. I RLOPSRM; el plan de aplicación del alta es art. 138 párr. 3).
- **5 al millar:** retención fiscal 0.5% sobre el subtotal (art. 191 LFD) — para vigilancia SFP. NO es pena.
- **Retención por atraso / pena convencional:** descuento por incumplimiento de programa (art. 46 Bis LOPSRM + arts. 86-90 RLOPSRM; 88 retención vía nota, 90 tope 20%).
- **Deductivas:** retenciones económicas por trabajos mal ejecutados/penas (art. 46/46 Bis LOPSRM).
- **Números generadores:** soporte de medición que justifica las cantidades de la estimación.
- **Convenio modificatorio:** acuerdo que cambia monto/plazo/conceptos (art. 59 / 59 Bis LOPSRM).
- **Bitácora:** registro formal e inmutable de eventos de la obra (art. 46 último párrafo / 52 Bis LOPSRM,
  reglamentado por art. 122/123 RLOPSRM).
- **Roster / sustitución de personas:** cambio de representantes del contrato; se SUSTITUYE, no se borra
  (art. 125 RLOPSRM).
- **Art. 118 RLOPSRM:** el acumulado ejecutado por concepto no puede exceder lo contratado (ni lo planeado).
- **Art. 53 LOPSRM:** responsabilidad de la residencia (por eso es emisor de notas de consecuencia).
- **Niveles de acceso (permisos.js):** `E` = edita/ejecuta · `C` = solo consulta · `null` = sin acceso.

---

## 10. Coherencia con las historias de usuario (verificada 13-jun-2026)

Pasada de coherencia entre **este doc** y `docs/requisitos/Historias_Usuario_ACTUALIZADAS_12jun.md`:
**concuerdan** (ambos leídos del código real). **Ya no hay maquetas:** HU-02, HU-11, HU-18 y HU-20 pasaron a
funcionales (junio); las historias de cada una se actualizaron a su comportamiento real con su fundamento
legal y sus `[validar profe]` resueltos. Coinciden también en: HU-14 línea de tiempo incompleta (el backend
solo empuja `integrada`/`enviada`), HU-13 bloqueo de 6 días = solo aviso, HU-07 rediseñado (panel
automático), gate de pago estricto (`autorizada`). **Los números generadores SÍ son funcionales** (captura
en HU-12, art. 132 RLOPSRM); el único pendiente es el bloque de captura dedicado del cascarón de estimación
(FASE 5), que delega a HU-12.

**Sin discrepancias de fondo.** Salvedades menores anotadas:
- Las historias son **criterio-por-criterio** (más granulares en los `[validar profe]`); este doc es la foto
  de sistema. Si divergen, **manda el código**; al actualizar uno, revisar el otro (ver regla en `CLAUDE.md`).
- El siguiente número de HU libre es **HU-25** (HU-24 ya es el finiquito; HU-22 roster y HU-23 empresas ya existen).
- Las historias detectaron specs de **HU-08** desactualizados (`test.fixme`) — añadido a §8 de este doc.
