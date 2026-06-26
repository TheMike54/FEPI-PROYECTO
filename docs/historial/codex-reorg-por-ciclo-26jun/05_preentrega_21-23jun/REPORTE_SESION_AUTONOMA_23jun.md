# Reporte — Sesión autónoma 2026-06-23 (2 auditorías + 2 follow-on)

> **Modo:** autónomo (Code decide con base en la ley o criterio del equipo y lo reporta). **LOCAL, sin push.**
> **Build verde · login intacto · BD respaldada antes de tocar · residuo de smoke limpiado.**
> Orden ejecutado tal como lo pidió Maiki: PARTE 1 (auditoría A) → PARTE 2 (auditoría B) → PARTE 3 (ejecución).

---

## Entregables

### Parte 1 — Auditoría A: insumos para las 24 historias (SOLO LECTURA)
📄 **`docs/requisitos/INSUMOS_HISTORIAS_22jun.md`** (226 KB).
- 27 unidades auditadas (HU-00…24 + Registro + Por Firmar + HU-22 + HU-23), una ficha por HU con los 7
  apartados que pediste: identidad+roles, qué hace hoy paso a paso (con `archivo:función`), disparadores/
  precondiciones, **criterio de éxito observable** (registro/nota/notificación, no "pantalla azul"), qué genera
  al fallar, **¿cambió de comportamiento?** + brechas vs lo que pide el profe, y citas legales.
- Método: 11 agentes en paralelo por dominio, auditando el **código real en disco** (incluye los cambios sin
  commitear de las sesiones recientes) y contrastándolo con el feedback del profe de los audios 22-jun.
- **51 marcas** de cambio de comportamiento / BRECHA, p. ej.: HU-16 "reingreso" ya no es flujo aparte (el profe:
  "el reingreso es la integración otra vez"); HU-03 "registrar"→"promover" con soportes antes + adicionales
  etiquetados + curva versionada; HU-20 cobro promovido por el contratista + cola global; sesiones last-login-wins.
- El de audio `New Recording 39` (1653) NO es SIGECOP — es la clase de ADS sobre requisitos no funcionales
  (ISO 25010/FURPS); lo descarté para esta auditoría.

### Parte 2 — Auditoría B: puntos de exportación / reportes (SOLO LECTURA)
📄 **`docs/reportes/AUDITORIA_REPORTES_22jun.md`**.
- Tabla maestra de **~20 exportaciones reales + 10 huecos** + 1 ficha por cada una (ubicación `archivo:línea`,
  endpoint, tipo+librería, columnas, origen de datos, **estado real verificado**, diseño actual, HU).
- Veredicto: **el profe tiene razón** — ninguna exportación tiene formato/branding (PDF jsPDF sin tablas/acentos/
  logo; Excel volcado crudo sin estilos/numFmt). La **"curva en blanco" NO es bug**: es falta de datos seed con
  fechas vigentes; pero además la curva **no se exporta** ni va en el PDF del expediente.
- Hueco crítico señalado: **la carátula de estimación no se puede imprimir/exportar** (solo vive en pantalla),
  siendo el documento más importante para el profe. Lista priorizada de huecos para tus mockups.

---

## Parte 3 — Ejecución de los 2 follow-on

> Antes de tocar nada: **backup `pg_dump` de la BD local** →
> `…/scratchpad/backup_local_pre_followon_20260623.sql` (330 KB, exit 0).

### Follow-on (a) — FOTO POR RENGLÓN del generador · **HECHO ✅** (bajo riesgo, UI)
- El backend ya soportaba `estimacion_fotos.contrato_concepto_id` y `api.subirFotoEstimacion(...conceptoId)`;
  faltaba la UI. **No tocó esquema ni backend.**
- `frontend/src/components/FotosEstimacion.jsx`: nuevo modo **`porGenerador`** (opt-in, retrocompatible). Cuando
  está activo, trae los generadores de la estimación (`api.detalleEstimacion`) y muestra **un renglón por
  concepto** con su botón "+ Agregar foto" (sube pasando `contrato_concepto_id`) y su galería filtrada por
  concepto, más un grupo "General". Sin `porGenerador` se comporta exactamente como antes (testids preservados;
  ningún e2e los referencia → sin regresión).
- `frontend/src/pages/ConsultaExpediente.jsx`: el expediente activa `porGenerador` en la sección de evidencia.
- **Smoke API (residente, estimación 2749, concepto 7079 "Terracerías"):** subir → **201 ligada al concepto**;
  listar → trae `contrato_concepto_id: 7079`; descargar → **200 image/jpeg 22 B**; eliminar → limpio.

### Follow-on (b) — CARGA BINARIA del CFDI / oficio en la promoción de cobro · **HECHO ✅** (tocó esquema)
**Razonamiento + DDL (te lo muestro como pediste):** el cobro guardaba solo metadatos (`estimacion_soportes`:
folio CFDI como texto). Para el archivo se creó **una tabla nueva BYTEA**:

```sql
CREATE TABLE IF NOT EXISTS cobro_soportes (
  id SERIAL PRIMARY KEY,
  estimacion_id INTEGER NOT NULL REFERENCES estimaciones(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('cfdi','oficio','otro')),
  nombre TEXT, mime TEXT, tamano INTEGER,
  contenido BYTEA NOT NULL,
  subido_por INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cobro_soportes_estimacion ON cobro_soportes(estimacion_id);
```

- **Es aditivo limpio** (`CREATE TABLE/INDEX IF NOT EXISTS`, **sin ALTER de tablas existentes, sin tocar auth**) →
  cumplí tu condición y lo terminé. **No fue necesario pararme.** Aplicado a la BD local (idempotente: 2ª pasada
  = NOTICE skip, exit 0) y **plegado a `schema.sql`** con el patrón del repo (cero bomba latente en un deploy
  fresco). **Único toque a zona congelada de la sesión** (aditivo, autorizado por ti para este follow-on).
- Backend (extiende `instruccion-pago`, **NO congelado** — ya montado en `server.js`, sin tocarlo):
  `controllers/instruccion-pago.controller.js` (+ `subirArchivoCobro` solo contratista, valida magic-bytes `%PDF`;
  `listarArchivosCobro`; `descargarArchivoCobro` por participación = finanzas transversal; `estadoTransito` y
  `colaCobro` ahora exponen `archivos`). `routes/instruccion-pago.routes.js` (multer memoria, solo PDF, 10 MB).
- Frontend: `services/api.js` (3 funciones), `pages/TransitoPago.jsx` (el contratista sube CFDI/oficio en el
  paso Soportes — reemplaza el viejo aviso "⛔ carga no disponible"), `pages/AmbientePago.jsx` (columna
  "Soportes (PDF)" en la **cola global de finanzas** con descarga).
- **Smoke API:** contratista sube PDF (tipo cfdi) → **201**; `estadoTransito.archivos` poblado +
  `upload_archivos.disponible:true`; **finanzas descarga → 200 application/pdf 25 B**; finanzas-sube → **403**
  (gate correcto); en la **cola de finanzas** la fila trae `archivos:[{tipo:cfdi,nombre:smoke.pdf}]`.
  **Residuo limpiado**: `cobro_soportes=0`, `instruccion_2759=0`.

---

## Decisiones tomadas (base legal / criterio del equipo)
1. **`cobro_soportes` como tabla nueva** (no ALTER de `estimacion_soportes`): respeta tu regla de "aditivo sin
   alterar"; el binario va INLINE en BYTEA igual que `estimacion_fotos`/`minutas.pdf_*` (disco de Render efímero).
   Tipos `cfdi|oficio|otro` cubren lo que el profe pidió (CFDI del contratista + oficio de autorización del sistema).
2. **Quién sube / quién descarga:** subida **solo contratista** (art. 54 LOPSRM: el contratista promueve su cobro
   y presenta su factura/CFDI); descarga por participación con **finanzas transversal** (ya en `lib/acceso.js`).
   Bloqueo si el contrato está **cerrado** (finiquito, art. 64 LOPSRM), consistente con el resto del tránsito.
3. **Foto por generador, no por estimación:** el formato GACM pide evidencia "de cada uno de los generadores"
   (art. 132 fr. IV RLOPSRM); por eso el renglón es por concepto (`contrato_concepto_id`), con grupo "General"
   para lo no atribuible a un concepto. Se montó en el Expediente (donde la estimación ya existe y puede colgar
   fotos), no en la integración (la estimación aún no existe en ese punto).
4. **`estimaciones.controller` (congelado) NO se tocó:** `detalleEstimacion` no expone `clave`, así que el
   renglón se rotula con `orden + concepto + unidad` (lo que ya devuelve). Sin pedirte cambios de core.

---

## Estado de zona congelada
- **NO tocados esta sesión:** `server.js`, `auth.controller`, `auth.middleware`, `permisos.js`, `App.jsx`,
  `SesionContext`, `estimaciones.controller`, `contratos.controller`, `lib/acceso.js`.
  *(Los diffs que verás en esos archivos son de las sesiones autónomas previas, ya en el working tree antes de
  hoy — no son míos.)*
- **Único toque congelado mío:** `schema.sql` += bloque `cobro_soportes` (aditivo idempotente, autorizado por ti
  para el follow-on b). **Para Maiki:** ya está plegado a `schema.sql`; al desplegar a Render se crea solo (es
  `IF NOT EXISTS`); no requiere migración manual aparte.

## Archivos tocados esta sesión
| Archivo | Cambio |
|---|---|
| `backend/src/db/schema.sql` | + tabla `cobro_soportes` (aditiva idempotente) |
| `backend/src/controllers/instruccion-pago.controller.js` | + 3 handlers de archivo + `archivos` en estadoTransito/cola |
| `backend/src/routes/instruccion-pago.routes.js` | + multer PDF + 3 rutas |
| `frontend/src/services/api.js` | + 3 funciones de archivo de cobro |
| `frontend/src/pages/TransitoPago.jsx` | + subida CFDI/oficio (contratista) |
| `frontend/src/pages/AmbientePago.jsx` | + columna Soportes (PDF) con descarga (finanzas) |
| `frontend/src/components/FotosEstimacion.jsx` | + modo `porGenerador` |
| `frontend/src/pages/ConsultaExpediente.jsx` | activa `porGenerador` |
| `docs/requisitos/INSUMOS_HISTORIAS_22jun.md` | NUEVO (auditoría A) |
| `docs/reportes/AUDITORIA_REPORTES_22jun.md` | NUEVO (auditoría B) |

## Verificación de cierre
- ✅ `vite build` → built in 8.33 s (solo el warning de tamaño de chunk preexistente).
- ✅ Login de los 5 roles intacto (rol deducido del backend).
- ✅ `/api/health` ok.
- ✅ Residuo de smoke = 0 (`cobro_soportes`, `estimacion_fotos` smoke, `instruccion_pago` temporal).
- ✅ Backup local previo guardado.
- ⚠️ Smokes hechos a **nivel API** (la fuente de verdad; la UI llama exactamente esos endpoints) + build verde.
  No corrí Playwright contra la UI nueva. **NO push** (revisas el diff e integras).

---
*Sesión autónoma 2026-06-23. LOCAL sin push.*
