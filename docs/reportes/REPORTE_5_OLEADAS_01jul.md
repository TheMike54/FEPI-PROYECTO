# Reporte — 5 oleadas para resolver los 17 bugs reales (post-entrega)

**Fecha:** 2026-07-01 · **Rama:** `main` · **LOCAL, sin push** (Maiki despliega tras revisar cada oleada).
**Fuente de verdad:** `docs/auditoria/AUDITORIA_BUGS_ESTIMACION_2026-07-01.md` + `PROPUESTAS_FIX_ESTIMACION_2026-07-01.md`.
**Método:** una oleada por commit, en orden; por oleada → `node -c` (backend) + `vite build` (frontend) verdes + **smoke en vivo** contra el stack local (`docker compose`).

**Autorización de zona congelada (Maiki):** solo `estimaciones.controller.js`, `estimaciones-ciclo.controller.js`,
`server.js`, `permisos.js` y **solo** para los fixes listados. **NO se tocó `permisos.js` ni `schema.sql`.**
Tablas/columnas nuevas vía `ensureSchema()` idempotente **+** `backend/scripts/migracion_*.sql` (registro para que
Maiki las pliegue a `schema.sql`).

| Oleada | Commit | Bugs |
|---|---|---|
| O1 — Expediente completo | `99b1751` | #4, #7, #8, #9, #25, #26 |
| O2 — Reglas server-side | `475a39c` | #2, #14, #24 |
| O3 — Convenios | `c11c8d2` | #11, #13 |
| O4 — Pago | `05bae6c` | #10, #17, #18, #20 |
| O5 — Pulido | `a226d97` | #15, #16 |

Total: **17 bugs**. Todos los commits con `node -c` + `vite build` verdes.

---

## Oleada 1 — Expediente completo (`99b1751`)

**Nuevos:** `backend/src/controllers/estimacion-soportes.controller.js` + `routes` + tabla
`estimacion_soportes_concepto` (`ensureSchema` + `migracion_estimacion_soportes.sql`);
`frontend/src/components/estimacion/ExpedienteEstimacion.jsx` (componente compartido).
**Montaje:** `server.js` (autorizado). **Editados:** `estimacion-fotos`, `estimaciones-ciclo` controllers/routes,
`api.js`, `RevisionEstimacion.jsx` (HU-15), `HistorialEstimaciones.jsx` (HU-14), `IntegracionEstimacion.jsx` (HU-12),
`AppShell.jsx`.

- **#4 Soportes documentales por concepto:** PDF/XLS/XLSX/CSV/TXT/imagen (magic bytes), 10 MB, participación,
  append-only. Upload staged en el paso 4 de HU-12 (se suben al integrar).
- **#7 HU-15 expediente completo:** pestañas Fotos y Soportes (antes ocultas) + observaciones por sección.
- **#9 HU-14 expediente completo:** el drawer abre carátula/generadores/notas/fotos/soportes/observaciones
  (reusa `ExpedienteEstimacion`); funciona en rechazadas.
- **#25 Reingreso conserva expediente:** copia `estimacion_notas`, `estimacion_fotos` y soportes al nuevo bloque
  (append-only; la rechazada intacta y trazable por `reemplaza_a`).
- **#26 Foto de concepto ajeno → 400** (antes se degradaba en silencio a foto general).
- **#8 Notificación de rechazo al contratista:** `GET /estimaciones-ciclo/rechazadas` (derivado del estado, sin
  tabla nueva; se limpia al reingresar/re-integrar) + campana en `AppShell`.

**Tests (smoke en vivo):**
- #4 PDF válido → **201**; `.exe` → **400**; lista muestra el soporte. ✔
- #26 concepto válido → **201** vinculada; concepto ajeno → **400**; sin concepto (general) → **201**. ✔
- #25 rechazada 2837 + soporte+foto → reingreso → nueva 2863 con soportes=1/fotos=1/gens=1; rechazada **intacta**. ✔
- #8 `rechazadas` devuelve el rechazo real con su motivo. ✔

---

## Oleada 2 — Reglas server-side (`475a39c`)

**Editados (congelado autorizado):** `estimaciones.controller` (#24), `estimaciones-ciclo.controller` (#2);
**no congelado:** `trabajos.controller` (#14), `bitacora.controller` (#2, `fecha_nota`), `IntegracionEstimacion.jsx`.

- **#14 Avance > programado del periodo = BLOQUEO DURO (409):** `validarProgramaPeriodo` pasa de aviso a bloqueo;
  adicional al art. 118 (tope contratado). Solo afecta capturas NUEVAS (no re-valida datos sembrados).
- **#2 Fecha jurídica de notas de estimación atada al PERIODO:** columna aditiva `fecha_nota` separada de
  `firmado_en` (firma real) y `fecha` (emisión = `NOW()`). presentar/autorizar derivan `fecha_nota` del fin del
  periodo; `body.fecha_nota` fuera del mes → 409. **El fix de vigencia de firma art.125 (usa `fecha`) queda intacto.**
- **#24 Cantidad estimada == avance reportado del periodo (HU-06):** `integrarEstimacion` exige por concepto
  `cantidad_periodo == SUM(concepto_avance vigente del periodo)` (mismo cálculo que `estimacion-prep`). Sin avance →
  no se puede estimar. Frontend: cantidades de SOLO LECTURA.

**Tests (smoke en vivo):**
- #14 avance 100000 sobre programa → **409**; avance 1 con holgura → **201**. ✔
- #2 `fecha_nota` body fuera del mes → **409**; presentación limpia → **200**; nota jurídica **2026-03** (mes del
  periodo) vs reloj **2026-07** (hoy); rollback limpio (estado sigue `integrada`). ✔
- #24 cantidad ≠ avance → **409** (desalineado); cantidad == avance → **201** (verificado con registro de avance +
  limpieza del demo). ✔

**⚠️ Reporte a Maiki (#14):** consulta de impacto = **0 contratos** con avance TOTAL sobre el programa. PERO a nivel
acumulado-al-periodo varios PRUEBA-*/DEMO tienen avance ADELANTADO (p.ej. concepto "colado" en el contrato 7021:
113 ejecutado vs 100 programado al periodo 1). **Los datos sembrados NO se tocan**; el bloqueo solo impide capturar
MÁS avance sobre esos conceptos ya adelantados (comportamiento buscado por la decisión de bloqueo duro).

---

## Oleada 3 — Convenios (`c11c8d2`)

**Editados:** `convenios.controller` (+ `migracion_convenio_registrado_por.sql`),
`components/convenios/EditorProgramaConvenio.jsx`.

- **#11 Prohibido agregar conceptos NUEVOS:** el backend rechaza (400) toda clave que no exista ya en el catálogo;
  por convenio solo se AJUSTA la CANTIDAD de los existentes (ampliar/reducir; el P.U. y la clave no cambian, art. 59
  LOPSRM) o el plazo. **Invierte** el criterio previo "congelar original + adicional". Frontend: se retiran los
  botones "+ Agregar concepto adicional" y "+ Ampliar"; cantidad/celdas de existentes pasan a editables.
- **#13 Separación de funciones:** `registrado_por` persistido; `autorizarConvenio` rechaza (409) si
  `autorizado_por === registrado_por`. Legacy (NULL) no bloquea. **PDF/oficio se mantiene exigido AL AUTORIZAR**
  (menos disruptivo, documentado).

**Tests (smoke en vivo):**
- #11 convenio con clave nueva → **400**. ✔
- #13 registrar → **201**; auto-autorizar (mismo dep) → **409**; autorizar con OTRO dep (dep2) → **200**. ✔
  (Contrato de prueba restaurado tras el smoke.)

**⚠️ Reporte a Maiki (#11):** solo **2 contratos** con `es_adicional=true` (PRUEBA-TR-CURVA-HISTORICA, SOP-2026-001);
son lectura HISTÓRICA — no se borran ni se rompe su consulta; solo se impide crear MÁS conceptos nuevos.

---

## Oleada 4 — Pago (`05bae6c`)

**Editados:** `instruccion-pago.controller` + `routes` (+ `migracion_datos_bancarios.sql`), `api.js`, `TransitoPago.jsx`.
**`permisos.js` NO se tocó** (los cambios de rol van en el controller + la UI).

- **#17 Fuente estructurada de datos bancarios:** nueva tabla `contratista_datos_bancarios` (por empresa,
  append-only, `validado_por`). Endpoints GET/POST `/instruccion-pago/datos-bancarios/empresa/:id`.
- **#18 CLABE = 18 dígitos + dígito de control** (algoritmo estándar), separada de la referencia SPEI.
- **#10 Roles:** el contratista deja de capturar datos bancarios (`cargarSoporte` los rechaza) y ya NO genera la
  instrucción; solo presenta CFDI/factura/oficio. **FINANZAS** captura/valida los datos bancarios y **genera la
  instrucción** (`generarInstruccion` → rol finanzas; exige datos bancarios vigentes). Frontend `TransitoPago`:
  panel de datos bancarios (captura solo finanzas), botón "Generar instrucción" gateado a finanzas.
- **#20 CFDI XML:** `subirArchivoCobro` acepta PDF **y** XML (multer + inicio XML con guarda anti-XXE
  DOCTYPE/ENTITY). El XML se guarda como CFDI con mime `application/xml` (soporta PDF y XML por CFDI **sin tocar el
  CHECK del `schema`**).

**Tests (smoke en vivo):**
- #17/#18 contratista POST bancarios → **403**; CLABE 17 díg → **400**; control inválido → **400**; CLABE válida →
  **201**; lectura OK. ✔
- #10 contratista `generarInstruccion` → **403**; finanzas pasa los gates de rol + bancarios (llega al gate de
  soportes). ✔
- #20 XML válido → **201** (mime `application/xml`); XML con DOCTYPE/ENTITY (XXE) → **400**; PDF → **201**. ✔

---

## Oleada 5 — Pulido (`a226d97`)

**Editados:** `alertas.controller` (#16), `AlertasAtraso.jsx` (#16), `CurvaAvance.jsx` (#15).

- **#15 Una sola curva vigente por defecto:** el desglose "Avance por etapas" (histórico + vigente, cuando hay
  convenio) se movió a un detalle COLAPSABLE (`<details>`); la curva consolidada vigente es la vista principal.
- **#16 Alertas de atraso en DÍAS:** `alertas.controller` devuelve `dias_atraso` por concepto además del déficit
  físico. Fórmula: días desde el fin del último periodo YA VENCIDO cuyo programa acumulado el ejecutado total aún
  cubría (= el último momento en que el concepto estuvo al día). Respeta la fecha simulada. Columna "Días de atraso"
  en la UI.

**Tests (smoke en vivo):**
- #16 contrato con déficit (7022) → 3 atrasos con `dias_atraso` 62/31/31 por concepto; contrato adelantado (7021) →
  0 atrasos. ✔

---

## Confirmaciones finales

- **`node -c` global (13 archivos backend):** VERDE. **`vite build`:** VERDE en cada oleada.
- **Esquema:** tablas `estimacion_soportes_concepto` y `contratista_datos_bancarios` creadas por `ensureSchema`;
  columnas `bitacora_notas.fecha_nota` y `convenios_modificatorios.registrado_por` creadas. **`schema.sql` NO se
  editó** (4 `migracion_*.sql` en `backend/scripts/` para que Maiki las pliegue).
- **Zona congelada:** `permisos.js` INTACTO; `schema.sql` INTACTO; los toques a `estimaciones`/`estimaciones-ciclo`/
  `server.js` son los fixes autorizados.
- **Pendiente Maiki:** desplegar oleada por oleada; plegar las 4 `migracion_*.sql`; revisar las historias afectadas
  (HU-06/07, HU-12/13/15, HU-03, HU-20/21); ratificar las decisiones documentadas (#24 cantidades solo lectura, #13
  PDF al autorizar) y la fórmula de días de atraso (#16, marcada como criterio de diseño).
