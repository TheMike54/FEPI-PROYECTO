# AUDITORÍA GENERAL PRE-ENTREGA — SIGECOP (26-jun-2026)

> Auditoría en dos frentes (técnica + contra las HU) sobre el **código real** (backend + frontend), con 4 barridos
> read-only por ciclo. Cada veredicto cita `archivo:función`. Luego: lo que **arreglé** (seguro, frontend) vs lo que
> **propongo** (riesgoso, requiere OK de Maiki). Trabajo en `main`, **sin push**. No se tocó zona congelada, schema,
> BD ni auth. Build de frontend **verde** tras los arreglos.

---

## PARTE 0 — Decisiones de organización (cerradas, sin cambios)

1. `historial/codex-reorg-por-ciclo-26jun/` → **se queda como referencia** (no canónica, nada borrado). ✔
2. `docs/Historias_Usuario_SIGECOP.md` (modificado por Maiki) → **no se tocó, no se movió, no se fusionó**. ✔ (Se usó **solo de lectura** como base de esta auditoría.)
3. `Referencias-estimaciones/` → **no se consolidó** (jpegs sin commitear intactos). ✔
4. `pendientes/` → se queda. ✔

---

## PARTE 1.B — HU por HU (✅ cumplida / ⚠ parcial / ❌ falta)

| HU | Veredicto | Dónde se confirmó | Nota |
|---|---|---|---|
| Acceso (login/sesión única/registro) | ✅ | `auth.controller.js:login/register`, `auth.middleware.js:23-32` | Rol deducido, last-login-wins, empresa-primero, correo único. |
| HU-23 Padrón empresas | ✅ | `empresas.controller.js:resolverOCrearEmpresa/validarEmpresa/fusionarEmpresa` | Dedup débil+fuerte; router `requireRole('dependencia')`. |
| HU-01 Alta de contrato | ✅ | `contratos.controller.js:crearContrato` | Monto/término derivados, todo-o-nada, programa 100%, redirige a abrir bitácora. |
| HU-02 Fianzas | ⚠ | `garantias.controller.js`, `RegistroFianzas.jsx:118` | Núcleo correcto; **el residente creador no puede gestionar por UI** (H1) y endoso de prórroga no refresca el badge de vigencia (H6). |
| HU-22 Sustitución | ✅ | `roster.controller.js:sustituirPersona` | Append-only, nota automática atómica, candados completos. Matiz: acceso del creador (H2). |
| HU-08 Apertura + Por firmar | ✅ | `bitacora.controller.js:abrirBitacora/firmarApertura`, `notas-pendientes.controller.js` | Bitácora única, nota #1, bandeja correcta. |
| HU-09 Notas | ✅ | `bitacora.controller.js:emitirNota/anularNota/firmarNota` | Folio atómico, rol→tipo, plazo/tácita, inmutabilidad, regla temporal de firma. |
| HU-10 Consulta notas | ✅ | `bitacora.controller.js:notasDeContrato`, `ConsultaNotas.jsx` | Acceso por participación, export con columnas exactas. |
| HU-11 Minutas/visitas | ⚠ | `minutas.controller.js` | Validaciones OK; **gate de contrato cerrado falta en vincular/subir-PDF** (#2). |
| HU-06 Registro de trabajos | ⚠ | `trabajos.controller.js:registrarAvance`, `TrabajosTerminados.jsx` | Art.118/periodo futuro/append-only OK; **foto obligatoria(doc) vs opcional(código) + UI contradictoria** (#1, UI **arreglada**); fotos sin gate cerrado/rol (#3). |
| HU-07 Alertas de atraso | ✅ | `alertas.controller.js` | Déficit en unidades positivas, idempotente, emisor=residente. |
| HU-05 Programa y curva | ✅ | `CurvaAvance.jsx`, `utils/etapasAvance.js` | 3 curvas desde 0%, desviación en positivo, doble serie por etapa con convenio. |
| HU-12 Integración estimación | ✅ | `estimaciones.controller.js:integrarEstimacion` (congelado) | Cuadre al centavo (Σ ROUND), amort 143-I, 5 al millar 191 LFD, neto sin IVA; gates completos. |
| HU-13 Presentación | ✅ | `estimaciones-ciclo.controller.js:enviarEstimacion` | Sello fecha/hora, nota automática, sin días negativos. |
| HU-15 Revisión/autorización | ✅ | `estimaciones-ciclo.controller.js:crearObservacion/turnar/autorizar/rechazar` | Severidad eliminada, TOCTOU cerrado. Matices: obs por sección no por generador (C); fila "turnado sin obs" (D). |
| HU-14 Historial | ✅ | `estimaciones-ciclo.controller.js:historialEstimaciones` | Todas incl. rechazadas, neto congelado. Cosmético: drawer "sin observaciones" (G). |
| HU-17 Tablero | ✅ | `tablero.controller.js:tableroEstimaciones` | Cuadre al centavo, Finanzas bloqueado server-side. **Pendiente "Reingresar (HU-16)" contradice el doc** (B). |
| HU-20 Tránsito a pago | ⚠ | `instruccion-pago.controller.js:generarInstruccion/colaCobro` | Art.24 con TOCTOU, CFDI por contratista, cola global OK; **instrucción se genera sin el PDF del CFDI** (H2-pago) y **fianza ausente no bloquea** (H3-pago); form de techo se mostraba al contratista (H5, **arreglado**). |
| HU-21 Registro de pago | ✅ | `pagos.controller.js:registrarPago` | SPEI numérica, no doble pago, no pagar sin avance, CFDI heredado, pop-up confirm. **Link "Registrar pago" caía en pantalla-historial** (H1, **arreglado**). |
| HU-03 Convenios | ⚠ | `convenios.controller.js:crearConvenio/autorizarConvenio` | Oficio previo, congela originales, adicionales art.101, oficio PDF para autorizar; **el efecto material se aplica al registrar, antes de autorizar** (H4 — riesgoso). |
| HU-04 Expediente | ✅ | `ConsultaExpediente.jsx` | Bloques con datos reales, etiqueta Adicional, foto por generador, export único. |
| HU-18 Portafolio | ✅ | `portafolio.controller.js`, `PortafolioEjecutivo.jsx:irAlExpediente` | Semáforo server-side, clic→expediente, cerrado=verde neutro. API: finanzas puede leerlo (H6-port). |
| HU-19 Reportes | ✅ | `services/reportesContrato.js` | PDF/Excel correcto por reporte, datos reales, gates de rol/bitácora. Texto "severidad" obsoleto (**arreglado**). |
| HU-24 Finiquito | ✅ | `finiquito.controller.js` | Saldo server-side, nota de cierre, append-only, IDOR cerrado por empresa. |
| HU-16 Reingreso | ⚠ | doc lo **retira**; `estimaciones-ciclo.routes.js:44` + `tablero.controller.js` lo mantienen | Endpoint vivo + pendiente "Reingresar" en tablero contradicen el doc (B). |

**Resumen:** **17 HU ✅ · 7 ⚠ · 0 ❌.** Ningún ❌: todo lo que la historia promete está implementado; los ⚠ son coherencia, bordes o pulido, no funciones ausentes.

---

## PARTE 1.A — Hallazgos técnicos (gravedad · ¿lo ve el profe? · seguro/riesgoso)

### Visibles al profe en pantalla
- **#1 HU-06 — foto: UI contradictoria** (asterisco rojo "*" + "al menos una" sobre un campo que el código hace **opcional**). Media · **Sí** · **SEGURO** → **ARREGLADO**. *(Ojo: la historia doc dice obligatoria; el doc lo reconcilia Maiki — no se tocó.)*
- **H1-pago HU-21 — "Registrar pago" caía en pantalla sin formulario** (`/pagos/registro` es solo historial). Media · **Sí** · **SEGURO** → **ARREGLADO** (link → `/pagos/transito`).
- **H5-pago HU-20 — el form "Cargar techo (finanzas)" se mostraba al contratista** (botón daba 403). Baja · **Sí** · **SEGURO** → **ARREGLADO** (gate `rol==='finanzas'`).
- **A HU-12 — Sección 3 con IVA 16% en el documento** vs nota de la historia "carátula **sin IVA**". Media · **Sí** · **[validar profe]** → propuesta (conflicto legal/alcance, no lo decide Code).
- **B HU-16/17 — "Reingresar la estimación (HU-16)"** aparece como pendiente en el tablero, contradiciendo el doc (que retira HU-16) y el mensaje de `EnvioEstimacion` ("vuelve a integrar, HU-12"). Media · **Sí** · texto en `tablero.controller.js` (no congelado) → propuesta de fix de texto.
- **H1-fianzas HU-02 — el residente creador no puede registrar fianzas por UI** (`permisos.js` HU-02 residente=C). Media · **Sí** · `permisos.js` **CONGELADO** → propuesta.
- **H6-fianzas HU-02 — endoso de prórroga no refresca el badge de vigencia** (sigue "Vencida"). Baja · posible · **SEGURO** (frontend) → propuesta de pulido.

### No visibles en pantalla (bordes / defensa en profundidad / API directa)
- **H2-fianzas/HU-22** — el residente **creador** conserva acceso tras ser sustituido (`lib/acceso.js` da acceso por `created_by`). Media · `lib/acceso.js` **CONGELADO** → propuesta.
- **H4-alta/HU-01** — el backend del alta no exige fianza de cumplimiento ni valida el catálogo de tipos (solo el frontend). Baja · `contratos.controller.js` **CONGELADO** → propuesta.
- **H5-registro** — empresa nueva en el registro siempre se tipifica 'contratista' (`auth.controller.js:register` no pasa `tipo`). Baja · `auth.controller.js` **CONGELADO** → propuesta.
- **H7-usuarios** — `rechazarUsuario` no expulsa una sesión ya activa. Baja · auth **CONGELADO** → propuesta.
- **#2 HU-11** — gate de contrato cerrado falta en `vincularNotaMinuta/vincularNotaVisita/subirPdfMinuta`. Baja-media · `minutas.controller.js` (no congelado) → propuesta backend.
- **#3 HU-06** — `avance-fotos` sin gate de cerrado y con escritura ancha (cualquier parte sube/borra). Baja-media · no congelado → propuesta backend.
- **#4 HU-06** — comentarios obsoletos ("EDITABLE PATCH/DELETE") cuando es append-only. Baja · → propuesta limpieza.
- **C HU-15** — observaciones por **sección**, no por generador/elemento como pide la historia. Baja-media · requiere DDL → propuesta.
- **D HU-15/19** — el "turnado sin observaciones" inserta una fila que contamina el reporte de observaciones. Baja · → propuesta (filtro o flag).
- **E HU-12** — "estimado acumulado anterior" en el **preview** puede diferir por centavos del documento oficial (el documento sí cuadra). Baja · **SEGURO** (frontend) → propuesta.
- **F HU-12** — `asignarGenerador` (nota↔generador) sin gate de estado/rol. Baja · → propuesta.
- **G HU-14** — drawer del historial siempre dice "Sin observaciones". Baja · **SEGURO** (frontend) → propuesta.
- **H HU-17** — "antigüedad por estado" cuenta desde la presentación para autorizadas/pagadas (faltan sellos). Baja · requiere DDL → propuesta.
- **H2-pago HU-20** — la instrucción de cobro se genera sin el PDF del CFDI (el pago sí lo exige; gate partido). Baja-media · `instruccion-pago.controller.js` (no congelado) → propuesta backend.
- **H3-pago HU-20** — fianza de cumplimiento **ausente** no bloquea (solo la vencida). Baja · no congelado → propuesta backend.
- **H4-convenio HU-03** — el convenio aplica el efecto material (monto/programa) al **registrar**, antes de autorizar. Media · core (toca cómo HU-12/06 leen el catálogo vivo) → **RIESGOSO**, propuesta.
- **H6-port HU-18** — finanzas puede leer todo el portafolio por API (UI lo oculta). Baja · `portafolio.routes.js` (no congelado) → propuesta.
- **H9-pago HU-21** — el pago confía en el CFDI del body (no lo deriva de la instrucción). Baja · rol de confianza → propuesta opcional.

---

## PARTE 2.A — ARREGLADO (seguro, frontend, no congelado) — build verde

| # | Archivo | Cambio |
|---|---|---|
| 1 | `frontend/src/pages/TrabajosTerminados.jsx` | HU-06: UI de foto alineada a **opcional** (quitado el asterisco rojo y el "(al menos una)"; etiqueta/comentario coherentes con el comportamiento real y el art. 132 fr. IV discrecional). |
| 2 | `frontend/src/pages/TransitoPago.jsx` | HU-20: el form "Cargar techo (finanzas)" ahora se gatea a `rol==='finanzas'` (el contratista ya no ve un form que le daba 403). |
| 3 | `frontend/src/services/reportesContrato.js` | HU-19: quitada la columna "severidad" del texto del reporte de observaciones (ya no existe). |
| 4 | `frontend/src/pages/AmbientePago.jsx` | HU-21: los dos links "Registrar pago" (cola de finanzas + macro) apuntan a `/pagos/transito` (donde sí se registra), no a `/pagos/registro` (que es solo historial). |

> Nota: no cambié testids (para no romper e2e); solo destinos de link, condiciones de render y textos visibles.

## PARTE 2.B — PROPUESTO (requiere OK de Maiki)

**Zona congelada (solo Maiki):**
- `permisos.js` HU-02: dar al residente creador nivel de gestión de fianzas (H1-fianzas). *Riesgo: matriz de acceso.*
- `lib/acceso.js`/`created_by`: que el residente sustituido pierda acceso (H2). *Riesgo: acotamiento en cadena.*
- `contratos.controller.js`: exigir fianza de cumplimiento + validar catálogo de tipos en el alta (H4-alta). *Riesgo: core del alta.*
- `auth.controller.js`: pasar el `tipo` de empresa según el rol solicitado (H5-registro); expulsar sesión al rechazar usuario activo (H7). *Riesgo: auth.*
- Desmontar el endpoint `/estimacion/:id/reingresar` y limpiar `permisos.js`/página HU-16 (B). *Riesgo: coherencia + matriz.*

**Legal / [validar profe] (no lo decide Code):**
- IVA en la Sección 3 del documento de estimación vs "carátula sin IVA" de la historia (A). *Hay tensión entre el mockup aprobado (con IVA) y la nota de la HU; lo confirma el profe.*

**Backend NO congelado (bajo riesgo, pero por prudencia lo propongo en vez de aplicarlo solo):**
- Gate de contrato cerrado en `minutas` (vincular/subir-PDF) (#2) y en `avance-fotos` (subir/eliminar) + acotar escritura a contratista (#3).
- Exigir el PDF del CFDI al generar la instrucción (H2-pago); tratar la **ausencia** de fianza de cumplimiento como bloqueo (H3-pago).
- Alinear el texto/acción del pendiente de tablero a "volver a integrar (HU-12)" (B-texto).
- Excluir a finanzas del portafolio por API (H6-port).
- Observación por generador (C), flag para el "turnado sin obs" (D), sellos de autorización/pago para antigüedad (H) — **requieren DDL** → vía Maiki.
- Limpieza de comentarios obsoletos (#4) y derivar el CFDI del pago de la instrucción (H9).

**Frontend de pulido (seguro, lo dejé como propuesta para no inflar el commit):**
- Refrescar el badge de vigencia de fianza con el último endoso de prórroga (H6-fianzas).
- Banner solo-lectura + botones deshabilitados en `RegistroFianzas` para contrato cerrado (H3-fianzas).
- Alinear el preview de "acumulado anterior" a Σ subtotales previos (E); mostrar observaciones reales en el drawer del historial (G).

---

## Veredicto general — ¿listo para que lo revise el profe?

**Sí, con riesgo bajo.** El sistema está **sólido**: 17/24 HU plenas, **0 faltantes**, cálculos **al centavo**, gates server-side reales (folio atómico, art.118, TOCTOU en turnar/autorizar/suficiencia, append-only, contrato cerrado), **ningún endpoint sin `authMiddleware`** y **ninguna pantalla que truene** detectada.

Los riesgos que el profe **podría tocar en pantalla** eran cuatro y **tres ya se arreglaron** (foto opcional coherente, link de pago que ya no es callejón, form de finanzas oculto al contratista); el cuarto (IVA en la Sección 3) es una **decisión legal del profe**, no un defecto. El quinto visible (pendiente "Reingresar HU-16" en el tablero) es un **texto** fácil de alinear (propuesto). El resto de los ⚠ son de coherencia, bordes o defensa en profundidad, en su mayoría **no visibles** y sin efecto en el flujo feliz.

**Recomendación:** aprobar los fixes de texto/coherencia propuestos de bajo riesgo (tablero HU-16, gates de cerrado en minutas/fotos, PDF en instrucción) y **resolver con el profe** el punto del IVA. Con eso, la demo de extremo a extremo queda sin sorpresas visibles.
