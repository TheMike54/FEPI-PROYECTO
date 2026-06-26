# REPORTE — Sesión grande (18-jun-2026): HU-20 + Ambientes de sistema

> **Modo:** autónomo (Maiki ausente), **LOCAL sin commit/push** (Maiki revisa el diff e integra).
> **Continúa** a la sesión E2 (ver `REPORTE_SESION_AUTONOMA_E2_18jun.md`).
> **Regla de oro aplicada:** agrupar la experiencia **sin fundir las historias** (cada HU conserva su ruta,
> pantalla, ficha y criterios; los ambientes solo ENVUELVEN y ENCADENAN con `Link` + lectura read-only).
> **Resolución de `[validar profe]`:** resueltos con base en la ley (cita el artículo exacto) o, si no hay
> fundamento, default conservador marcado como "sin base legal — criterio del profe". **Cero citas inventadas.**

---

## Tablero de checkpoints (suite tras cada bloque)

| Bloque | Entregable | Suite | Verificación adversarial |
|---|---|---|---|
| **E2** | HU-02 Fianzas + HU-11 Minutas (backend real) | **267/8/0** ✅ | APROBADO (1 cita falsa corregida fr.III→fr.X, `registrada_por` añadido) |
| **A — HU-20** | Tránsito a pago integrado (PR `feat/e3-hu-20`) | **265/8/0** ✅ | **APROBADO** (citas reales, gates correctos, TOCTOU art.24 cerrado) |
| **B.1 — Ambiente bitácora** | `/bitacora/ambiente` (cascarón apertura→firma→notas→consulta→minutas) | **271/8/0** ✅ | citas art. 123 fr. III/X verificadas (E2/A) |
| **B.2 — Ambiente expediente/reportes** | `/contratos/expediente-ambiente` (HU-04 + HU-19) | **277/8/0** ✅ | navegación-only |
| **B.3 — Ambiente pago** | `/pagos/ambiente` (HU-15→HU-20→HU-21→HU-24) | **284/8/0** ✅ | citas art. 24/54/55/64 verificadas (A) |
| **B.4 — Ambiente finiquito** | `/contratos/cierre` (cascarón que delega a HU-24) | **290/8/0** ✅ | citas art. 64/170 verificadas (A) |
| **B.5 — Ambiente convenios** | `/contratos/convenio-ambiente` (HU-03 + oficio + HU-04) | **302/8/0** ✅ | navegación-only |
| **B.6 — Ambiente avance** | `/seguimiento/ambiente` (HU-06→HU-05→HU-07) | **302/8/0** ✅ | navegación-only |
| **B.7 — MACRO ciclo de vida** | `/contratos/ciclo-vida` (14 bloques, AL FINAL) | **305/8/0** ✅ | gating por rol verificado |
| **B — verif. adversarial 7 ambientes** | UltraCode (regla de oro + citas) | — | **APROBADO**: funde_historias=false, permisos.js intacto, 10 citas reales, 0 falsas |

> **Regla de Maiki:** si la suite queda ROJA en cualquier bloque, NO se sigue con el siguiente. Hasta aquí
> **ningún bloque quedó rojo**.

---

## BLOQUE A — HU-20 Tránsito a pago (integrado del PR `feat/e3-hu-20`)

**Qué se hizo:**
- `git fetch` + diff del PR (al día con `main`, 2 merges de `origin/main`). **PR limpio:** no toca App.jsx,
  permisos.js, schema.sql ni middlewares; usa tablas existentes (`presupuesto_anual`, `instruccion_pago`,
  `estimacion_soportes`, `contrato_garantias`) → **sin DDL**.
- Traídos al working tree los archivos nuevos (`instruccion-pago.controller.js`, `…routes.js`,
  `TransitoPago.jsx`, spec). Fusionadas a mano las 6 líneas de `api.js` (tenía edits de E2) y los docs.
- **Montaje (zona congelada, forma permitida):** `require` + `app.use('/api/instruccion-pago', …)` en
  `server.js`. **App.jsx/permisos.js NO se tocaron** (la ruta `/pagos/transito` ya existía y la pantalla usa
  `useVistaHU('HU-20')`; `permisos.js` ya tenía la fila HU-20).
- **Gate de finiquito añadido** (esta sesión): `generarInstruccion` y `cargarSoporte` rechazan (409) si el
  contrato está `cerrado` — art. 64 LOPSRM (extinción de derechos/obligaciones) + art. 170 fr. VI RLOPSRM.
- **TOCTOU del art. 24 cerrado** (corrección de la verificación adversarial): la suficiencia presupuestal +
  el INSERT de la instrucción ahora corren en **una transacción con `SELECT … FOR UPDATE`** sobre la fila del
  techo → dos instrucciones de la misma dependencia/ejercicio se serializan y no pueden exceder el techo.
- **Spec viejo de la maqueta consolidado:** se borró `hu-20-transito.spec.js` (probaba el prototipo); queda
  el del PR `hu-20-transito-pago.spec.js` (acceso por rol + cableado).

**Smoke (todos los gates, server-side):** sin techo→409 · sin soportes→409 · todo OK→201 (emitida, monto =
neto $208,500.00, redondeo al centavo) · duplicado→409 (UNIQUE) · no-autorizada→409 (art. 54) · excede
techo→409 (art. 24) · contrato cerrado→409 (art. 64).

**Verificación adversarial (UltraCode):** **APROBADO.** gates correctos, no toca congelado; **todas las
citas verificadas literales contra los PDF (art. 24/54/64/48-II/55 LOPSRM, 170 fr. VI RLOPSRM), cero
inventadas.** Única debilidad explotable real (TOCTOU) → corregida.

---

## BLOQUE B — Ambientes de sistema

### B.1 — Ambiente de BITÁCORA (`/bitacora/ambiente`)
**Cascarón** que encadena, por bloques, el hilo legal de la bitácora **sin fundir las HU**:
1. Contrato y estado de la bitácora (`api.bitacoraDeContrato`: abierta?, firmas X/Y, completa).
2. Abrir la bitácora (HU-08) → `Link /bitacora/apertura`.
3. Firma conjunta (Por Firmar) → `Link /bitacora/por-firmar` (muestra X/Y firmadas).
4. Emitir notas (HU-09) → `Link /bitacora/notas`, **en candado salvo `bitacora.completa`** (art. 123 fr. III
   RLOPSRM — la nota de apertura fija el plazo de firma; las notas solo se emiten sobre apertura firmada por
   todos). Mismo candado que ya aplica la pantalla de emisión (no se reimplementa).
5. Consultar/buscar/exportar (HU-10) → `Link /bitacora/consulta`.
6. Minutas, visitas y acuerdos (HU-11) → `Link /bitacora/minutas`. **Ya funcional** (E2) — se actualizó el
   plan, que lo marcaba "maqueta · sin backend".

**Montaje:** `AmbienteBitacora.jsx` (nuevo); ruta `SoloRol roles=['residente','contratista','supervision']`
en `App.jsx`; sección "Bitácora" en `Sidebar.jsx` (fuera del catálogo). **`permisos.js` NO se tocó.**
**Regla de oro:** cada HU conserva su ruta/ficha; si se borra el ambiente, todas siguen intactas.
**Spec:** `ambiente-bitacora.spec.js` (6 tests: acceso por rol + 6 bloques + enlaces a rutas reales +
candado con el contrato demo). **Suite 271/8/0.**

### B.2 — Ambiente de EXPEDIENTE Y REPORTES (`/contratos/expediente-ambiente`)
Ciclo faltante (§4 del plan): "arma el expediente y exporta el paquete". Encadena **HU-04** (expediente
consolidado) + **HU-19** (reportes) sin fundirlas. 3 bloques: (1) contrato + resumen read-only
(`detalleContrato` + nº de estimaciones); (2) `Link /contratos/expediente`; (3) `Link /reportes`.
**Montaje:** `AmbienteExpediente.jsx`; `SoloRol roles=['residente','contratista','supervision','dependencia']`
(finanzas fuera: solo tiene reportes, no expediente); sección "Expediente y reportes" en Sidebar. **Spec**
`ambiente-expediente.spec.js` (6 tests). **Suite 277/8/0.**

### B.3 — Ambiente de PAGO (`/pagos/ambiente`)
Ciclo de cobro. Envuelve **HU-15→HU-20→HU-21→HU-24** sin fundirlas. 5 bloques: (1) estimación autorizada
read-only (`estimacionesDeContrato` filtra `autorizada`) + enlaces HU-14/HU-15; (2) tránsito a pago (HU-20,
**ya real** — el plan lo marcaba placeholder); (3) instrucción de pago (salida de HU-20); (4) registro
(HU-21); (5) cierre con pagos (`listarPagos`) + enlace al finiquito. **El enlace al finiquito se gatea por
rol** (SoloRol dependencia/residente; contratista/finanzas ven nota informativa, no un enlace que rebota).
**Orden legal resuelto:** autorización (art. 54) → suficiencia/instrucción (art. 24) → pago; el plazo de 20
días del art. 54 **AVISA, no bloquea** (es la fecha límite para pagar; vencerla genera gastos financieros,
art. 55) — default conservador, [validar profe]. **Montaje:** `AmbientePago.jsx`; `SoloRol
roles=['finanzas','contratista','residente','dependencia']` (supervisión excluida: null en HU-20/HU-21);
sección "Pago" en Sidebar. **Spec** `ambiente-pago.spec.js` (7 tests). **Suite 284/8/0.**

### B.4 — Ambiente de FINIQUITO / cierre (`/contratos/cierre`)
Cascarón que **envuelve HU-24** y **delega el cierre** a `/contratos/finiquito` (NO ejecuta
`cerrarFiniquito`). 7 bloques read-only: contrato → prerrequisito bitácora (art. 64: el finiquito es nota de
bitácora) → estimaciones al saldo → pagos → **saldo en vivo** (`finiquitoPrep`) → cierre delegado (link
deshabilitado si falta bitácora) → documento art. 170 + constancia. **Montaje:** `AmbienteFiniquito.jsx`;
`SoloRol roles=['dependencia','residente']`; link en la sección roster/finiquito del Sidebar. **Spec**
`ambiente-finiquito.spec.js` (6 tests). **Suite 290/8/0.**

### B.5 — Ambiente de CONVENIO modificatorio (`/contratos/convenio-ambiente`)
Ciclo **episódico**. Envuelve **HU-03 + oficio (FASE 0C) + reflejo en bitácora/expediente** sin fundirlas. 6
bloques: contrato+convenios → registrar (HU-03, lee `?contrato=`) → variaciones/aviso SFP read-only
(`api.convenios` es **objeto** `{convenios,versiones}`) → oficio (`descargarOficioConvenio`) → asiento en
bitácora (copy "elige el contrato": HU-10 no preselecciona) → expediente (igual). **Header sin HeaderVista**
(evita el banner "solo lectura" de HU-03 para roles 'C'). **Guardrail 25%** parametrizable, [validar profe]
(art. 59/59 Bis regulan convenios; el % es criterio administrativo SFP). **Montaje:** `AmbienteConvenio.jsx`;
`SoloRol roles=['dependencia','residente','contratista','supervision']`; sección "Convenios" en Sidebar.
**Spec** `ambiente-convenio.spec.js` (6 tests, asevera Δ plazo 211→241 **no** marcas SFP). **Suite 302/8/0.**

### B.6 — Ambiente de AVANCE y seguimiento (`/seguimiento/ambiente`)
Encadena **HU-06→HU-05→HU-07** sin fundirlas. 5 bloques: contrato+programa → registrar avance (HU-06, art.
118) → curva+KPIs read-only (`prep.avance`, **misma fuente que HU-05**) → atrasos (HU-07, `?contrato=`) →
evidencia fotográfica = **placeholder pendiente Equipo 2** (HU-06 no sube fotos). **Roles:**
`['contratista','residente','supervision']` (**NO 'superintendente'** — no existe; = contratista).
**Dependencia** (con 'C' en HU-05) **queda fuera por decisión** [validar Maiki/profe], no por olvido.
**Montaje:** `AmbienteAvance.jsx`; sección "Seguimiento" en Sidebar. **Spec** `ambiente-avance.spec.js` (6
tests). **Suite 302/8/0.**

### B.7 — MACRO: Ciclo de vida del contrato (`/contratos/ciclo-vida`) — AL FINAL
Índice ordenado que **enlaza todas las HU y los sub-ambientes** en orden (14 bloques), sin lógica de negocio.
Cada bloque se **gatea por los roles que pueden abrir su destino** (no se ofrece un enlace que rebota); donde
no, nota informativa. **Bloque 11 (pago HU-21) = informativo** (lo ejecuta Finanzas, excluida del recorrido)
+ enlace al ambiente de pago para los roles que sí lo ven. Enlaza a los **sub-ambientes** (bitácora,
seguimiento, convenios, estimación, expediente, cierre) para no duplicar. **Roles:**
`['residente','contratista','supervision','dependencia']` (**Finanzas excluida**). **No se tocó el `.filter`
del catálogo del Sidebar.** **Montaje:** `CicloVidaContrato.jsx`; sección "Ciclo del contrato" en Sidebar.
**Spec** `ciclo-vida.spec.js` (3 tests: presencia de los 14 bloques + gating por rol, no navegación). **Suite
305/8/0.**

---

## Zona congelada tocada (revisión línea por línea de Maiki)

| Archivo | Qué se tocó | Forma |
|---|---|---|
| `backend/server.js` | montaje de `/api/instruccion-pago` (HU-20) — `require` + `app.use` | montaje permitido |
| `backend/src/db/schema.sql` | **nada nuevo en BLOQUE A/B** (HU-20 usa tablas existentes; los ambientes no tocan BD) | — |
| `frontend/src/App.jsx` | **7 imports + 7 rutas `<SoloRol>`** (una por ambiente) | montaje permitido |
| `frontend/src/components/layout/Sidebar.jsx` | **6 secciones nuevas** (bitácora, expediente, pago, convenios, seguimiento, ciclo) + 1 link en roster/finiquito; **NO se tocó el `.filter` del catálogo de HU** | link especial fuera del catálogo |
| `frontend/src/data/permisos.js` | **INTACTO** (cero cambios) | — |

**Archivos nuevos (no congelados):** 7 páginas `Ambiente*.jsx`/`CicloVidaContrato.jsx` + 7 specs + (HU-20)
`instruccion-pago.controller.js`/`…routes.js`/`TransitoPago.jsx`/`hu-20-transito-pago.spec.js`.

## Tabla de `[validar profe]` resueltos (punto | decisión | artículo)

| Punto | Decisión aplicada | Fundamento |
|---|---|---|
| HU-20: comprometido = Σ neto autorizadas+pagadas | Aplicado (interpretación conservadora de "compromiso") | art. 24 LOPSRM (suficiencia en partida); el detalle exacto = criterio del profe |
| HU-20: umbrales del semáforo | ✅ **RESUELTO (criterio del equipo, 18-jun):** reframeado a **días vencidos** del plazo de pago — VERDE 0 · ÁMBAR 1-10 · ROJO > 10; centralizado en `lib/umbrales-semaforo.js`. [validar profe] removido. | criterio del equipo (defaults provisionales, configurables); el plazo de 20 días es art. 54 LOPSRM |
| HU-18: umbrales del semáforo del portafolio | ✅ **RESUELTO (criterio del equipo, 18-jun):** avance vs programado VERDE ≥95% / ÁMBAR 85-95% / ROJO <85%; días vencidos 0 / 1-10 / >10; centralizado en `lib/umbrales-semaforo.js`. [validar profe] removido. | criterio del equipo; el plazo de revisión de 15 días es art. 54 LOPSRM |
| HU-20: exigibilidad de la fianza | Exigible si hay garantía de cumplimiento registrada; si no, no bloquea | art. 48 fr. II LOPSRM (regla general) + excepción (art. 50) |
| HU-20: gate de finiquito (rechazar contrato cerrado) | Implementado (409) | **art. 64 LOPSRM** (extinción de obligaciones) + **art. 170 fr. VI RLOPSRM** |
| HU-20: quién genera la instrucción / carga soportes | Contratista o Finanzas (ambos) | **sin base legal literal** — criterio del profe (coincide con permisos) |
| HU-20: carrera del techo (art. 24) | Cerrada con tx + `FOR UPDATE` sobre el techo | art. 24 LOPSRM (suficiencia debe ser real, no burlable) |
| Pago: orden legal del ciclo | autorización (54) → suficiencia/instrucción (24) → pago | art. 54 + art. 24 LOPSRM |
| Pago: plazo de 20 días ¿bloquea o avisa? | **AVISA** (es la fecha límite para pagar; vencerla genera mora) | art. 54 (plazo) + art. 55 LOPSRM (gastos financieros) |
| Bitácora: cita del candado de emisión | art. 123 fr. III RLOPSRM (nota de apertura / plazo de firma) | art. 123 fr. III RLOPSRM |
| HU-11: vínculo de minutas (corregido en E2) | fr. III → **fr. X** RLOPSRM | art. 123 fr. X RLOPSRM (ratificar minutas en la Bitácora) |
| Convenios: umbral del 25% | ✅ **RESUELTO (criterio del equipo, 18-jun):** superar el 25% del monto/plazo **AVISA, NO bloquea** (se quitó el bloqueo 400; el backend crea el convenio con `aviso_variacion`). Specs HU-03 actualizados (33%/30% → 201 + aviso). | referido al **art. 59 LOPSRM** (modificación de contratos); el % es referencia administrativa (RLOPSRM art. 102) |
| Avance: dependencia no registra | ✅ **RESUELTO (criterio del equipo, 18-jun):** confirmado que la dependencia **NO registra avance** (solo consulta la curva, HU-05); está enforced en el backend (`trabajos.routes` exige `requireRole('contratista')` + HU-06 `null` para dependencia en `permisos.js`). [validar] removido del ambiente. | decisión del equipo; enforced por el router (no requiere cambio de código) |

## Verificación adversarial de los 7 ambientes (UltraCode)

**Veredicto: APROBADO — sin hallazgos que corregir.**
- **`funde_historias = false`**: los 7 son cascarones de navegación que ENVUELVEN las HU con `Link` + lecturas
  read-only (`api.*` GET); sin reescribir lógica, sin duplicar captura, sin borrar vistas, **sin recalcular
  monto/carátula/saldo/déficit** (el finiquito DELEGA el cierre a HU-24; el avance toma los % de `prep.avance`,
  misma fuente que la curva).
- **`toca_permisos_o_logica = false`**: `permisos.js` **INTACTO** (git diff vacío); `App.jsx` (+29/−0) solo
  imports + rutas `<SoloRol>` a paths nuevos; `Sidebar.jsx` (+102/−0) solo secciones nuevas gateadas por rol;
  **no se tocó el `.filter` del catálogo de HU**.
- **Citas legales: las 10 verificadas literales contra los PDF, CERO falsas** (art. 24/54/55/59/59 Bis/64
  LOPSRM; art. 118/123 fr. III/123 fr. X/170 RLOPSRM). El verificador confirmó además que **no se
  reintrodujo** el rol inexistente `'superintendente'` (es término legal, no rol del sistema = contratista) y
  que las exclusiones de rol están documentadas como decisiones, no olvidos.

## Conclusión global

Sesión cerrada con **los tres bloques sólidos y la suite verde tras cada uno** (E2 267/8/0 · HU-20 265/8/0 ·
ambientes 305/8/0). Ambas verificaciones adversariales (HU-20 y los 7 ambientes) **aprobadas, con todas las
citas legales reales**. Nada quedó rojo; **no se hizo push** — todo local para revisión e integración de Maiki.

**Para integrar (orden sugerido):** (1) HU-20 (revisar el mount en `server.js` + el gate de finiquito + la tx
del techo); (2) los 7 ambientes (revisar las 7 rutas `SoloRol` de `App.jsx` y las 6 secciones del `Sidebar`).
Ninguno necesita migración de esquema.

**Actualización (18-jun, criterio del equipo):** los 3 `[validar profe]` sin base legal que quedaban
(umbrales del semáforo HU-18/HU-20, umbral del 25% en convenios, dependencia en avance) se **resolvieron como
criterio del equipo** y se fijaron en código (ver la tabla de arriba): umbrales centralizados en
`backend/src/lib/umbrales-semaforo.js` (avance ≥95/85-95/<85, días vencidos 0/1-10/>10); el convenio >25%
**avisa, no bloquea** (art. 59 LOPSRM); la dependencia **no registra avance** (enforced por el router). Siguen
siendo configurables si el profe pide otros valores.
