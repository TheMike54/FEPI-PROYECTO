# PLAN — Evidencia fotográfica del avance físico / estimación (21-jun)

> **Tipo:** plan razonado (NO implementación). No toca código ni `schema.sql`. LOCAL, sin push.
> **Demo objetivo:** 24-jun (≈3 días).
> **Encargo del profe:** carga de **fotos reales** del avance físico / estimación. Hoy es solo placeholder; es parte de la **versión final** (NO "Etapa 2" ni "fase diferida").
> **Alcance ACOTADO (respetar):** SOLO fotos del **avance físico (HU-06)** y donde el **expediente (HU-04)** las pida. **NO** carga de archivos en todo el sistema, **NO** PDFs de soporte. Solo fotos del avance.
>
> **✅ ESTADO (21-jun): IMPLEMENTADO.** Fotos JPEG/PNG como BYTEA en `estimacion_fotos` (4 columnas `mime/tamano/contenido/subido_por`) + `/api/estimacion-fotos` + galería en el expediente; migración plegada a `schema.sql`. Este documento queda como referencia de diseño.

---

## 0. Resumen ejecutivo (TL;DR)

| Pregunta | Respuesta |
|---|---|
| **¿Dónde se guardan las fotos?** | **Binario en PostgreSQL (`bytea`)** — el sistema YA lo hace para todos los PDFs (minutas, garantías, contrato, oficio de convenio). Es lo único que **sobrevive a un redeploy de Render** (disco efímero) sin credenciales externas ni tiempo de integración. |
| **¿Qué ya existe?** | Tablas `estimacion_fotos` y `estimacion_soportes` ya están en `schema.sql`, **pero solo con metadatos** (sin columnas binarias). Multer ya está instalado y montado en 4 routers. El patrón completo de subida/descarga binaria ya está resuelto y probado (minutas/garantías). |
| **¿Falta DDL?** | Sí, **mínima y aditiva**: 4 columnas `ADD COLUMN IF NOT EXISTS` sobre `estimacion_fotos` (mime, tamaño, contenido `bytea`, quién la subió). Idéntico patrón al de garantías (líneas 1674-1678 del schema). |
| **¿Toca zona congelada?** | Solo `schema.sql` (migración aditiva idempotente → la corre **Maiki**) y el montaje en `server.js` (1 línea → Maiki). **Toda la lógica nueva va en controller/route NUEVOS** (no congelados). No se tocan controllers core. |
| **¿Viable bien en 3 días?** | **Sí, en su versión mínima segura:** reutiliza ~80% de código ya escrito (multer + bytea + FormData). Riesgo de romper lo verde: BAJO si no se toca el cálculo de la carátula ni el flujo del avance, solo se le **adjunta** la foto. |
| **Recomendación** | Implementar la **VERSIÓN MÍNIMA SEGURA** (§5): foto en `bytea`, 1-5 por avance/estimación, redimensionada en cliente con `<canvas>`, sin galería elaborada, copiando el patrón de PDF. |

---

## 1. DÓNDE SE GUARDAN LAS FOTOS — decisión crítica (Render borra el disco)

**El problema central:** Render usa filesystem **efímero**. Cualquier archivo escrito a disco (p. ej. `multer.diskStorage`, o una carpeta `/uploads`) **se BORRA en cada redeploy** y entre reinicios del contenedor. Como solo Maiki despliega y el auto-deploy salta con cada push a `main`, guardar fotos en disco = perderlas la próxima vez que se integre algo. **Descartado de raíz.**

El sistema ya resolvió esto para PDFs: los guarda **inline como `bytea` en PostgreSQL**. La BD de Render **sí persiste**. Es la opción consistente con lo que ya hace el proyecto.

### Tabla comparativa de almacenamiento

| Opción | Persiste en Render | Esfuerzo a 3 días | Credenciales / config nueva | Consistencia con el proyecto | Contras |
|---|---|---|---|---|---|
| **(a) `bytea` en PostgreSQL** ✅ **RECOMENDADA** | **Sí** (la BD persiste) | **Bajo** — copiar patrón PDF ya probado | **Ninguna** | **Total** (PDFs ya van así) | Hincha la BD si no se limita tamaño → se mitiga redimensionando en cliente (§3) y `fileSize` en multer. `bytea` no es ideal para archivos muy grandes, pero fotos JPEG ≤ ~500 KB-2 MB están bien. |
| (b1) Cloudinary | Sí (externo) | **Alto/Riesgoso** — SDK nuevo, cuenta, API key/secret en env de Render, firmar uploads, manejar URLs | API key + secret + cloud name | Nula (nada externo hoy) | Dependencia de un 3º; secretos en Render; a 3 días es riesgo de demo (si falla la cuenta/cuota, no hay fotos). |
| (b2) AWS S3 | Sí (externo) | **Muy alto** — bucket, IAM, SDK, presigned URLs, CORS del bucket | Access key + secret + región + bucket | Nula | El más pesado de configurar; sobreingeniería para Etapa 1. |
| (b3) Supabase Storage | Sí (externo) | **Alto** — proyecto Supabase, bucket, policies RLS, SDK | URL + anon/service key | Nula | Otra plataforma que aprender/configurar en 3 días; políticas de acceso aparte del JWT actual. |
| (c) Disco local del contenedor (`/uploads`) | **NO** ❌ | Bajo | Ninguna | Baja | **Se BORRA en cada redeploy.** Inservible en Render. Descartada. |
| (c') Repo git (commitear las fotos) | Sí | Bajo | Ninguna | Nula | Ensucia el repo, no escala, fotos = datos de demo, no de código. Descartada. |

### Recomendación

**(a) `bytea` en PostgreSQL.** Razones, en orden:

1. **Funciona en Render sin más** — la BD persiste; el disco no. Ninguna opción externa aporta una garantía mayor para una demo a 3 días.
2. **Cero credenciales nuevas** — no hay que tocar las env vars de Render ni meter secretos (la regla del proyecto prohíbe contraseñas/secretos versionados).
3. **Patrón ya probado** — minutas y garantías ya suben/descargan binarios así; es copiar, no inventar. Reduce el riesgo de romper algo verde.
4. **Consistencia** — el `schema.sql` ya documenta (líneas 585-604) que la carga real de `estimacion_fotos`/`estimacion_soportes` quedaría en `BYTEA`. El plan solo **activa** lo que el esquema ya anticipó.

> **Mitigación del único contra (peso en BD):** redimensionar en el cliente con `<canvas>` antes de subir (§3) + `limits.fileSize` en multer (p. ej. 3 MB) + validar `mimetype` (JPEG/PNG) + magic bytes en el server. Una foto de obra a 1280-1600 px de ancho y calidad JPEG 0.7 pesa típicamente 150-400 KB. Con 5 fotos por avance, el impacto en la BD es marginal para Etapa 1.

---

## 2. QUÉ YA EXISTE (placeholder + tablas + patrón)

### 2.1 El placeholder actual (frontend)

- **`frontend/src/pages/IntegracionEstimacion.jsx`** (PASO 4 · "Soportes y notas", líneas ~968-977):
  - `data-testid="wstep-soportes"` y un aviso ámbar `data-testid="soportes-fotos-alcance"` que dice literalmente:
    > "El **registro fotográfico** de soportes **no es un requisito legal** de la estimación: el expediente del art. 132 RLOPSRM se integra con números generadores y notas de bitácora firmadas."
  - Comentario de código: *"fotos fuera de Etapa 1"*.
  - **⚠ Este texto contradice el encargo del profe y el propio art. 132 fr. IV** (que SÍ lista fotografías). Hay que **reemplazar** el aviso por el cargador real (no solo añadir, para no dar mensaje contradictorio). El `data-testid="soportes-fotos-alcance"` lo asume al menos un test de la suite (rastrear y actualizar).

- **`frontend/src/pages/TrabajosTerminados.jsx`** = **HU-06** (registro de avance físico por periodo). NO tiene placeholder de fotos hoy; aquí hay que **agregar** el cargador (es el punto natural de captura del avance). El form imputa `contrato_concepto_id` + `periodo_numero` + `cantidad` vía `api.registrarAvance` → `POST /api/trabajos`.

- **`frontend/src/services/reportesContrato.js`** (línea 304): el diccionario de etiquetas de observaciones de la revisión técnica YA contempla la sección `fotos: 'Fotos'` (junto a `caratula`, `generadores`, `soportes`, `notas`). O sea, el modelo de revisión técnica HU-15 **ya nombra** "Fotos" como una sección observable de la estimación.

- **`frontend/src/services/api.js`**: NO hay todavía `subirFotoAvance`/`descargarFotoAvance`. Pero ya existen 3 métodos clon-ables: `subirDocumento`/`subirPdfGarantia`/`subirPdfMinuta` y sus `descargar*` (FormData + `fetch` con `Authorization`, sin fijar `Content-Type`).

### 2.2 Las tablas (schema.sql, líneas 585-604)

Ya están creadas, **pero solo con metadatos** (sin binario):

```sql
-- (4) Soportes documentales y registro fotográfico (esqueleto, art. 132 fr. IV
--     RLOPSRM). La carga real de archivos (BYTEA) queda DIFERIDA ... aquí solo viven las filas-metadatos.
CREATE TABLE IF NOT EXISTS estimacion_soportes ( id, estimacion_id, nombre, descripcion, created_at );
CREATE TABLE IF NOT EXISTS estimacion_fotos    ( id, estimacion_id, nombre, descripcion, created_at );
```

**Conclusión:** se reaprovecha la **estructura** (id, FK, nombre, descripción, timestamp, índices) — pero **falta el binario**. Hay que agregar columnas `bytea` + mime + tamaño + autor. NO hace falta crear la tabla; solo `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

> **Punto de diseño que hay que resolver (decisión para Maiki, §7):** `estimacion_fotos` cuelga de `estimacion_id`. Pero el **avance físico HU-06** se captura contra `contrato_concepto_id` + `periodo`, **sin estimación todavía** (la foto del avance se toma ANTES de integrar la estimación). Dos caminos:
> - **Opción A (recomendada, menos cambios):** las fotos se cargan en la **integración de estimación** (`IntegracionEstimacion.jsx`, PASO 4) contra `estimacion_id` → calza con la tabla actual sin tocar su FK. Cumple el art. 132 (documentos de la estimación) literalmente.
> - **Opción B:** permitir foto también en el **registro de avance HU-06** → requeriría una tabla `avance_fotos` colgando de `concepto_avance` (la fila del avance), o una columna polimórfica. Más DDL, más riesgo. Dejar para después del 24 si el profe insiste en que la foto se cargue en el momento del avance.
>
> Para la demo del 24, **Opción A** cubre el encargo legal (fotos en los documentos de la estimación) con el menor riesgo. Ver §7.

### 2.3 El patrón de subida/descarga ya resuelto (a copiar tal cual)

**Multer YA está** (`backend/package.json` → `"multer": "^1.4.5-lts.1"`) y montado en 4 routers: `contratos.routes.js`, `convenios.routes.js`, `garantias.routes.js`, `minutas.routes.js`.

**Backend — patrón (de `minutas.routes.js` + `minutas.controller.js`):**

```js
// route
const upload = multer({
  storage: multer.memoryStorage(),                       // ← memoria, NO disco (Render)
  limits: { fileSize: 10 * 1024 * 1024 },                // ← bajar a ~3 MB para fotos
  fileFilter: (req, file, cb) => (file.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error(...))),
});                                                       // ← cambiar filtro a image/jpeg|image/png
router.post('/:id/foto', subirFoto, subirFotoController);
router.get('/:fotoId/foto', descargarFotoController);

// controller — guardar (lo importante: el buffer va DIRECTO al parámetro bytea, sin decode hex)
const { buffer, originalname, mimetype, size } = req.file;
// validación de magic bytes (PDF usa %PDF; para JPEG = FF D8 FF, PNG = 89 50 4E 47)
await pool.query(
  'UPDATE estimacion_fotos SET nombre=$1, mime=$2, tamano=$3, contenido=$4 WHERE id=$5',
  [originalname, mimetype, size, buffer, id]);

// controller — descargar/visualizar
res.setHeader('Content-Type', row.mime || 'image/jpeg');
res.setHeader('Content-Length', row.tamano);
res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.nombre)}"`);
return res.status(200).send(row.contenido);  // bytea → buffer → send
```

**Frontend — patrón (de `api.js`, `subirPdfMinuta`/`descargarPdfMinuta`):**

```js
subirFotoEstimacion: (id, file) => {
  const fd = new FormData(); fd.append('documento', file);   // mismo nombre de campo
  const token = localStorage.getItem('sigecop_token');
  return fetch(`${API_URL}/.../${id}/foto`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd })
    .then(...);   // NO fijar Content-Type: el navegador pone el boundary multipart
},
```

**Acceso/seguridad:** copiar `esParteOSupervision(req.user, contrato)` (de `lib/acceso.js`) para lectura, y el gate de rol para escritura (en HU-06 la escritura es del contratista; en estimación, quien la integra). El `registrado_por`/`subido_por` sale del **JWT**, nunca del body (regla del proyecto).

---

## 3. FLUJO DE UI

### 3.1 Dónde se sube (recomendado: integración de estimación, PASO 4)

- En **`IntegracionEstimacion.jsx`**, PASO 4 ("Soportes y notas"): **reemplazar el aviso `soportes-fotos-alcance`** por un bloque "Registro fotográfico (art. 132 fr. IV RLOPSRM)" con:
  - `<input type="file" accept="image/jpeg,image/png" multiple>` (o de a una).
  - Lista/miniaturas de las fotos ya cargadas a esta estimación (nombre + descripción opcional + botón ver/eliminar mientras la estimación NO esté integrada/inmutable).
  - Mensaje de límites: "JPEG o PNG, hasta 5 fotos, máx. 3 MB c/u".
- (Opción B futura) En **`TrabajosTerminados.jsx`** (HU-06): un cargador análogo junto al form de avance, si el profe pide la foto en el momento de la captura del avance.

### 3.2 Cómo se ven después (expediente HU-04)

- En **`ConsultaExpediente.jsx`** (HU-04): una sección/galería "Registro fotográfico de las estimaciones" — miniaturas que abren la imagen a tamaño completo (vía `GET .../foto`, sirve `inline`). Solo lectura.
- Reutilizar el patrón "tiene_pdf" de minutas: el listado devuelve `(contenido IS NOT NULL) AS tiene_foto` para no traer el binario en la lista; el binario solo se pide al abrir cada foto.
- La galería respeta `useVistaHU('HU-04')` (solo lectura por participación).

### 3.3 Validaciones y límites

| Capa | Validación |
|---|---|
| **Cliente (antes de subir)** | `accept="image/jpeg,image/png"`; rechazar > N MB; **redimensionar con `<canvas>`** a máx. ~1600 px de ancho y re-encodear JPEG calidad ~0.7 (reduce 5 MB → ~300 KB). Esto protege la BD `bytea`. Tope de cantidad (p. ej. ≤ 5 por estimación). |
| **Multer (route)** | `memoryStorage` (NO disco), `limits.fileSize` (~3 MB), `fileFilter` que solo deja `image/jpeg`/`image/png`. |
| **Controller (server, fuente de verdad)** | Magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`); `esParteOSupervision` para acceso; rol correcto para escritura; `subido_por` del JWT; rechazar si la estimación ya es inmutable (no se cargan fotos a una estimación integrada/autorizada — append-only). |

> **Redimensionar en cliente** es la pieza que hace viable y seguro el `bytea`: sin ella, una foto de celular (3-8 MB) hincharía la BD. Con `<canvas>` el cliente sube una imagen ya liviana.

---

## 4. RIESGO Y ZONA CONGELADA

| Elemento | ¿Congelado? | Cómo se maneja | Riesgo |
|---|---|---|---|
| `schema.sql` (DDL nueva) | **Sí** (solo Maiki) | **Migración ADITIVA e IDEMPOTENTE**: `ALTER TABLE estimacion_fotos ADD COLUMN IF NOT EXISTS {mime, tamano, contenido bytea, subido_por}` — idéntico al patrón de garantías (líneas 1674-1678). La tabla ya existe; NO se altera nada existente. **La corre Maiki** con backup. | **Bajo** — aditivo, no rompe filas/columnas existentes. |
| `server.js` (montaje router) | **Sí** (solo Maiki) | 1 línea: `app.use('/api/estimacion-fotos', estimacionFotosRoutes)` (o reusar `/api/trabajos` si va por HU-06). Patrón ya repetido 20+ veces. **Lo monta Maiki.** | **Muy bajo** — montaje aditivo. |
| Controllers core (auth/usuarios/contratos/estimaciones) | **Sí** (solo Maiki) | **NO se tocan.** Toda la lógica va en **`backend/src/controllers/estimacion-fotos.controller.js` + `estimacion-fotos.routes.js` NUEVOS** (no congelados). | **Cero** si se respeta. |
| `App.jsx` / `permisos.js` / `SesionContext.jsx` | **Sí** | **NO se tocan.** El cargador vive dentro de páginas ya ruteadas (Integración de estimación HU-12/HU-13, Expediente HU-04). | **Cero** si se respeta. |
| Multer instalado | n/a | **Ya está** y montado en 4 routers. No hay que instalar nada. | n/a |
| Cálculo de carátula / cuadre al centavo | **Congelado conceptual** | La foto es un **adjunto** colgado de la estimación; **NO entra en ningún cálculo financiero**. No toca amortización, 5 al millar, exceso, ni el `Σ ROUND(cant×pu,2)`. | **Cero** — separado del dinero. |
| Inmutabilidad de la estimación | Sí (trigger) | Las filas de `estimacion_fotos` cuelgan por FK `ON DELETE CASCADE`; **no se modifican filas de `estimaciones`** → el trigger `sigecop_estimacion_inmutable` no se dispara. Regla: no permitir subir/borrar foto tras integrar (append-only en espíritu). | **Bajo.** |
| Suite e2e verde | n/a | El placeholder `data-testid="soportes-fotos-alcance"` se **reemplaza** → hay que **buscar y actualizar** el/los test(s) que lo asersionan, si no la suite se pone roja. | **Medio** — es el único punto que toca verde existente; identificable con un grep del testid. |

**Probabilidad de romper algo verde:** BAJA, concentrada en (1) el test del placeholder reemplazado y (2) cualquier test que cuente columnas/tablas. Mitigable revisando la suite antes de pedir merge (regla del proyecto: smoke local).

---

## 5. ESFUERZO REAL A 3 DÍAS + VERSIÓN MÍNIMA SEGURA

**Veredicto honesto:** **SÍ es viable hacerlo bien en su versión mínima segura**, precisamente porque ~80% ya está escrito (multer, bytea, FormData, descarga binaria, acceso por participación). Lo nuevo es: 4 columnas, 1 controller + 1 route nuevos, 2-3 métodos en `api.js`, 1 cargador en UI, 1 galería en UI, y arreglar el placeholder + su test. No hay que aprender ninguna plataforma externa ni manejar secretos.

### VERSIÓN MÍNIMA SEGURA (lo que entra al 24)

- Foto en **`bytea` en PostgreSQL** (Opción 1a + tabla `estimacion_fotos` con columnas nuevas).
- Carga en **un solo punto: PASO 4 de la integración de estimación** (Opción A del §2.2) — calza con la FK actual, cumple el art. 132 al pie.
- **1-5 fotos por estimación**, JPEG/PNG, redimensionadas en cliente, ≤ 3 MB.
- **Galería simple en el expediente HU-04** (miniaturas → abrir grande), solo lectura.
- **Sin** carga en el momento del avance HU-06 (eso es Opción B, follow-on). **Sin** edición de fotos (append: subir/eliminar antes de integrar; tras integrar, inmutable). **Sin** descripciones ricas (un `nombre` y `descripcion` opcional bastan).
- Reemplazar el aviso `soportes-fotos-alcance` por el cargador + actualizar el test.

### Desglose de tareas (horas estimadas)

| # | Tarea | Archivos | Zona | Horas |
|---|---|---|---|---|
| 1 | DDL aditiva: 4 columnas en `estimacion_fotos` (`mime`, `tamano`, `contenido bytea`, `subido_por`) — **bloque para Maiki**, NO editar schema directo | (bloque DDL en `backend/scripts/` para Maiki) | congelada → Maiki | 0.5 |
| 2 | Controller nuevo `estimacion-fotos.controller.js` (listar, subir, descargar, eliminar-si-no-integrada) copiando minutas/garantías | `backend/src/controllers/` (nuevo) | no congelada | 2.5 |
| 3 | Route nuevo `estimacion-fotos.routes.js` (multer image filter + fileSize + magic bytes) | `backend/src/routes/` (nuevo) | no congelada | 1.0 |
| 4 | Montaje en `server.js` (1 línea) — **bloque para Maiki** | `backend/server.js` | congelada → Maiki | 0.25 |
| 5 | `api.js`: `listarFotosEstimacion`, `subirFotoEstimacion`, `descargarFotoEstimacion`, `eliminarFotoEstimacion` | `frontend/src/services/api.js` | no congelada | 1.0 |
| 6 | Helper cliente: redimensionar imagen con `<canvas>` antes de subir | `frontend/src/utils/` (nuevo) o inline | no congelada | 1.5 |
| 7 | UI cargador en `IntegracionEstimacion.jsx` PASO 4 (reemplaza aviso) + lista de cargadas | `frontend/src/pages/IntegracionEstimacion.jsx` | no congelada | 2.5 |
| 8 | UI galería en `ConsultaExpediente.jsx` (HU-04), solo lectura | `frontend/src/pages/ConsultaExpediente.jsx` | no congelada | 2.0 |
| 9 | Arreglar/actualizar el/los test(s) del `data-testid="soportes-fotos-alcance"` + smoke manual de carga/descarga | `frontend/tests/` | no congelada | 1.5 |
| 10 | Actualizar `ESTADO_ACTUAL.md` + historia (HU-06/HU-12 o HU nueva) + cita legal | `docs/` | no congelada | 1.0 |
| | **TOTAL aprox.** | | | **~13.75 h** |

**Caben en 3 días** con margen, siempre que: (a) Maiki corra la DDL y monte el router temprano (tareas 1 y 4 son su cuello de botella), y (b) se respete el alcance acotado (no añadir carga genérica de archivos). Si el tiempo aprieta, lo recortable sin perder el encargo es la galería elaborada del expediente (tarea 8 → reducir a una lista de enlaces "Ver foto").

---

## 6. FUNDAMENTO LEGAL — art. 132 fr. IV RLOPSRM (texto verificado)

Verificado contra `docs/legal/reg_utf8.txt`, líneas 4778-4795. **Texto literal:**

> **Artículo 132.-** Los documentos que deberán acompañarse a cada estimación serán determinados por cada dependencia o entidad, atendiendo a las características, complejidad y magnitud de los trabajos, los cuales serán, **entre otros**, los siguientes:
> I. Números generadores;
> II. Notas de Bitácora;
> III. Croquis;
> **IV. Controles de calidad, pruebas de laboratorio y fotografías;**
> V. Análisis, cálculo e integración de los importes correspondientes a cada estimación;
> VI. Avances de obra, tratándose de contratos a precio alzado, y
> VII. Informe del cumplimiento de la operación y mantenimiento [...].

**Lectura para el plan:**

- La fracción que respalda las **fotografías** es la **IV** (no una fracción "de fotos" aparte). El encargo cita "art. 132 fr. IV RLOPSRM" → **correcto y verificado**.
- El art. 132 dice que los documentos los **determina cada dependencia** "entre otros" → las fotografías son un documento **potestativo/discrecional** de la dependencia, no obligatorio en todo caso. Por eso el placeholder actual ("no es un requisito legal") **no es del todo falso en abstracto**, pero **contradice el encargo expreso del profe**, que para esta obra SÍ pide fotos. La implementación las habilita; la dependencia decide exigirlas.
- La fracción IV agrupa fotografías con controles de calidad y pruebas de laboratorio. El **alcance acotado** del encargo manda implementar **solo fotos** (no laboratorio ni croquis). Coherente con la ley: se cubre una de las cosas de la fr. IV.
- `Cobertura_Legal_Reglamento.md` (línea 42) ya mapea **art. 132 → HU-12** ("Documentos de la estimación: generadores, notas, fotos, cálculo") y `Auditoria_Legal_SIGECOP.md` (línea 58) ya declaraba la fr. IV → "tab 3 (registro fotográfico)". O sea, el proyecto **ya tenía previsto** el registro fotográfico; estaba como placeholder. Este plan lo activa.

> **No hay nada `[validar profe]` en la cita** — el texto del 132 fr. IV está verificado al pie. Lo único a confirmar con el profe es el **alcance operativo** (¿foto en la integración de estimación —Opción A— o también en el momento del avance HU-06 —Opción B—?), que es decisión de diseño, no de ley.

---

## 7. Decisiones para Maiki

1. **Almacenamiento:** ¿se confirma **`bytea` en PostgreSQL** (recomendado, consistente con PDFs y a prueba de Render)? Las alternativas externas (Cloudinary/S3/Supabase) NO se recomiendan a 3 días por credenciales + riesgo de demo.
2. **Punto de carga (alcance):** ¿**Opción A** (fotos en la integración de estimación, contra `estimacion_id` — calza con la tabla actual, cero cambio de FK, cubre el art. 132) o también **Opción B** (foto en el momento del avance HU-06, que exigiría una tabla `avance_fotos` nueva)? **Recomiendo A para el 24** y B como follow-on si el profe lo pide.
3. **DDL:** confirmar el bloque aditivo (4 columnas `ADD COLUMN IF NOT EXISTS` sobre `estimacion_fotos`) para que **Maiki lo integre a `schema.sql` + Render** con backup. El equipo entrega el bloque en `backend/scripts/`, no edita el schema.
4. **Montaje:** confirmar el nombre de la ruta (`/api/estimacion-fotos` propio, vs. colgar de `/api/estimaciones` congelado — **se recomienda router NUEVO propio** para no tocar el controller congelado). Maiki lo monta en `server.js`.
5. **Límites:** confirmar tope (≤ 5 fotos/estimación, ≤ 3 MB, JPEG/PNG, redimensión cliente ~1600 px). Ajustables.
6. **Historia + estado:** ¿la evidencia fotográfica se documenta como ampliación de **HU-12** (documentos de la estimación) o como **HU nueva** (siguiente número libre, sin renumerar)? Tras implementar hay que actualizar `ESTADO_ACTUAL.md` y la(s) historia(s).
7. **Test del placeholder:** confirmar que se puede **eliminar/reescribir** el `data-testid="soportes-fotos-alcance"` y su aserción (cambia de "no es requisito" a "cargador de fotos").

---

### Apéndice — archivos clave (rutas absolutas)

- Tablas (esqueleto): `C:\Users\migue\Downloads\Proyectofepy\sigecop\backend\src\db\schema.sql` (líneas 585-604; patrón DDL aditiva 1674-1678).
- Placeholder estimación: `C:\Users\migue\Downloads\Proyectofepy\sigecop\frontend\src\pages\IntegracionEstimacion.jsx` (líneas ~968-977, `data-testid="soportes-fotos-alcance"`).
- Avance físico HU-06: `C:\Users\migue\Downloads\Proyectofepy\sigecop\frontend\src\pages\TrabajosTerminados.jsx`.
- Expediente HU-04: `C:\Users\migue\Downloads\Proyectofepy\sigecop\frontend\src\pages\ConsultaExpediente.jsx`.
- Patrón PDF backend (a copiar): `backend\src\routes\minutas.routes.js`, `backend\src\controllers\minutas.controller.js` (subir/descargar); `backend\src\routes\garantias.routes.js`.
- Patrón PDF frontend (a copiar): `frontend\src\services\api.js` (`subirPdfMinuta`/`descargarPdfMinuta`/`subirPdfGarantia`/`subirDocumento`).
- Montaje routers: `backend\server.js` (líneas 6-27 imports, 45-76 `app.use`).
- Etiqueta "Fotos" ya existente en revisión técnica: `frontend\src\services\reportesContrato.js` (línea 304).
- Ley verificada: `docs\legal\reg_utf8.txt` (art. 132, líneas 4778-4795); mapeo: `docs\legal\Cobertura_Legal_Reglamento.md` (línea 42), `docs\legal\Auditoria_Legal_SIGECOP.md` (línea 58).
