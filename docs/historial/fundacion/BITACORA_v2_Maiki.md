# Pasada BITÁCORA (HU-08/09/10) — Entregable para Maiki

**Fecha:** 2026-06-03 · **Autor:** Claude Code (Fundación) · **Para revisión de:** Maiki (integrador).
**Base:** working tree sobre `c9fba02` (con alta-v4 ya aplicado). **Disciplina / Nivel 1:** construido y probado
en LOCAL; **sin commit/push/deploy, `main` intacto**. Citas LITERALES leídas del PDF `docs/Reg_LOPSRM.pdf`.
Lo interpretativo `[validar]`, lo no determinable `[no determinable]`. Code no es abogado.

> **Patch incremental:** `docs/BITACORA_v2_DIFFS.patch` (**solo esta pasada**, 9 archivos; separado del de alta-v4). Verificado `git apply -R --check` limpio; no incluye `AltaContrato.jsx`/`_helpers.js`/`alta-v4-*` ni los docs `xlsx/md` ajenos.

---

## 0. Citas literales (RLOPSRM, leídas del PDF) — fundamento de la pasada

- **Art. 122.** "El uso de la Bitácora es obligatorio en cada uno de los contratos de obras y servicios. Su elaboración, control y seguimiento se hará por medios remotos de comunicación electrónica…".
- **Art. 123 fr. III** (datos mínimos de la APERTURA): "Se deberá **iniciar con una nota especial** relacionando como mínimo la **fecha de apertura, datos generales de las partes involucradas, nombre y firma del personal autorizado, domicilios y teléfonos, datos particulares del contrato y alcances descriptivos de los trabajos y de las características del sitio** donde se desarrollarán… Además… se establecerá un **plazo máximo para la firma de las notas, debiendo acordar las partes que se tendrán por aceptadas una vez vencido el plazo**".
- **Art. 123 fr. V.** "Todas las notas deberán **numerarse en forma seriada y fecharse consecutivamente** respetando, sin excepción, el orden establecido".
- **Art. 123 fr. VI.** "Se **prohibirá la modificación de las notas ya firmadas**, inclusive para el responsable de la anotación original".
- **Art. 123 fr. VII.** "Cuando se cometa algún error… **la nota deberá anularse por quien la emita, señalando enseguida… que ésta ha quedado anulada** y debiendo abrir, de ser necesario, **otra nota con el número consecutivo** que le corresponda y con la descripción correcta".
- **Art. 125** (eventos/notas por rol): **fr. I — al RESIDENTE** (autoriza/aprueba): a) modificaciones a proyecto ejecutivo/procedimiento/calidad/programas; b) autorización de estimaciones; c) ajuste de costos; d) conceptos no previstos y cantidades adicionales; e) convenios modificatorios; f) terminación anticipada o rescisión; g) sustitución de superintendente/residente anterior/supervisión; h) suspensiones; i) conciliaciones y convenios; j) caso fortuito/fuerza mayor; k) terminación de los trabajos. **fr. II — al SUPERINTENDENTE** (solicita/avisa): a) solicitud de modificaciones; b) solicitud de aprobación de estimaciones; c) falta o atraso en el pago de estimaciones; d) solicitud de ajuste de costos; e) solicitud de conceptos no previstos/cantidades adicionales; f) solicitud de convenios modificatorios; g) aviso de terminación. **fr. III — a la SUPERVISIÓN**: a) avance físico y financiero; b) pruebas de calidad; c) seguridad, higiene y ambiente; d) acuerdos de juntas. Último párrafo: "…sin perjuicio de que los responsables… puedan anotar… **cualesquiera otros** que se presenten y que sean de relevancia".

---

## 1. La APERTURA ES la primera nota (folio #1) — punto 1

**Antes:** la apertura vivía solo en `bitacora_aperturas` (acta JSONB); el "Libro" listaba solo `bitacora_notas`, así que la primera nota emitida salía con folio #1.
**Ahora:** al aperturar, el backend **inserta una `bitacora_notas` tipo `'apertura'` con `numero = 1`** (la "nota especial" de inicio, art. 123 fr. III); las notas emitidas después arrancan en **#2** (`MAX(numero)+1`). El profe: *"¿Cuál es la primer nota? La de la apertura, es la 1"*. La nota #1 se muestra como tarjeta prominente (`data-testid="apertura-nota"`, BIT-0001) con su firma conjunta. Su firma NO es la del emisor sino la **conjunta** (`bitacora_firmantes`); `firmado_en` queda NULL. *No se puede anular ni emitir a mano* (guards en `anularNota`/`emitirNota`).

## 2. Firmar notas — botón + flujo (punto 2)

**Lectura de "qué notas requieren firma de qué roles"** (art. 123 fr. III): la **APERTURA** requiere la **firma de TODOS los participantes** (residente + superintendente + supervisión si aplica) — firma conjunta. Las **demás notas** tienen un *plazo de firma* y "se tendrán por aceptadas una vez vencido el plazo": la firma de una nota la hace la **contraparte** (cualquier parte que no es el emisor); si no firma, se acepta **tácitamente** al vencer (ya se derivaba).

**Implementado:**
- **Firma de la apertura** (ya existía el backend `POST /:aperturaId/firmar` + bandeja `Por firmar`): se **agregó el botón también en la nota #1** de la vista de notas (`btn-firmar-apertura`), mostrando quién firmó + fecha/hora y el conteo X/Y (`apertura-firma-estado`).
- **Firma de notas por la contraparte** (nuevo): tabla append-only `bitacora_nota_firmas` + `POST /bitacora/notas/:notaId/firmar` + botón `btn-firmar-nota-{folio}`. Valida: ser parte del contrato, **no ser el emisor** (el emisor ya firmó al emitir), nota no anulada; registra firmante + rol + fecha/hora; UNIQUE por (nota, usuario). No firma la apertura por esta vía.

## 3. Candado de emisión (SERVER-SIDE) — punto 3

**Antes:** `emitirNota` no checaba la firma de la apertura → con una sola firma dejaba emitir (bug del profe).
**Ahora:** `emitirNota` rechaza con **409** si quedan firmas pendientes de la apertura (`count(*) FILTER (WHERE NOT firmado) FROM bitacora_firmantes`). Validado en el **servidor** (no solo UI). La UI lo refleja: banner `gate-emision` + botón "Emitir" deshabilitado hasta `apertura_completa`. Fundamento: art. 123 fr. III (la bitácora "se deberá iniciar con una nota especial" firmada por el personal autorizado). `[validar]` el detalle exacto con el profe.

## 4. Tipos de nota por rol completos (art. 125) + tag — punto 4

**Antes:** catálogo COLAPSADO (residente: 4 coarse; superintendente: 2; supervisión: 4). **Ahora:** lista **EXACTA** del art. 125 por rol — **residente 11 (fr. I a–k)** + apertura + cierre = 13 activos; **superintendente 7 (fr. II a–g)**; **supervisión 4 (fr. III a–d)**; + `otro` (último párrafo). Los 4 coarse previos (`autorizacion/aprobacion/solicitud/aviso`) se **ocultan** (`activo=false`, no se borran → notas viejas conservan su etiqueta y FK). El selector de emisión filtra `activo=true` por rol.
**TAG de búsqueda** (lo pidió el profe, "los tipos van embebidos"): columna `bitacora_notas.tag` (opcional, la captura el emisor), chip violeta en las notas y en los resultados, e incluida en la **búsqueda** de HU-10 (junto con asunto, contenido y etiqueta del tipo).

## 5. Datos mínimos de la apertura (art. 123 fr. III) — punto 5

Se agregan a la captura de apertura y se **congelan en el acta**: **domicilio y teléfono de la dependencia**, **domicilio y teléfono del contratista**, **alcance/descripción de los trabajos** y **características del sitio** (columnas nuevas en `bitacora_aperturas` + en el `acta` JSONB). La apertura **exige** estos campos (la UI bloquea "Iniciar apertura" hasta capturarlos: `md-incompleto`). Se muestran en la vista de solo lectura (`acta-domicilios`). Además, **`fecha_apertura` = fecha de inicio del contrato** (el profe: *"tiene que ser el mismo día"*) — antes se usaba la entrega del sitio. `[validar]` la regla "mismo día" y si los datos mínimos deben ser estrictamente obligatorios.

## 6. UI — protagonismo de la nota — punto 6

`EmisionNotas` reestructurada: la **emisión/respuesta es la parte central** (formulario grande y prominente); el **libro de bitácora va detrás de un botón "Ver bitácora (n)"** (`btn-ver-bitacora`) que lo expande. La apertura (nota #1) y el candado quedan arriba como contexto.

## 7. Anular nota — mi lectura `[validar]` — punto 7

**Lectura del texto literal:** el art. 123 **fr. VII** SÍ contempla anular —pero **por quien la emite**, **sin borrar** ("señalando… que ésta ha quedado anulada") y **abriendo otra nota con el número consecutivo** y la descripción correcta (rectificación). El art. 123 **fr. VI** prohíbe **modificar** notas ya firmadas. La implementación **ya cumplía** y se conserva/endurece:
- Solo el **emisor** anula su nota (fr. VII "por quien la emita").
- **Nunca borra:** la original pasa a `estado='anulada'` (trigger de inmutabilidad lo permite solo como transición emitida→anulada) y se **genera una nota correctiva consecutiva** "dice/debe decir" vinculada (fr. VII).
- Se **bloquea** anular si ya fue respondida por la contraparte, y **la apertura (#1) NO se anula** (guard nuevo).
- **`[validar]`:** si una nota **ya aceptada** (tácita o firmada por la contraparte) puede anularse es interpretativo (tensión fr. VI vs fr. VII). Hoy se bloquea si fue *respondida*; el caso "aceptada tácita y luego anular" queda `[validar]` con el profe. La postura segura (la actual): **no se borra nunca**; corregir = nota nueva.

---

## Pruebas (local, verde)

| Capa | Resultado |
|---|---|
| `vite build` | ✅ 465 módulos, EXIT 0 |
| **Smoke backend** (`backend/scripts/smoke-bitacora-v2.mjs`) | ✅ **15/15** (apertura=nota#1; candado 409 con 0 y con 2/3 firmas; firma conjunta completa; emisión post-firma folio #2; tag; firma de nota por contraparte; emisor no puede; anular apertura→403; anular nota→correctiva #3; catálogo art. 125) |
| **E2E UI** (`frontend/e2e/bitacora-v2.spec.js`) | ✅ **5/5** (a apertura=nota#1 · b firma con botón registra firmante · c candado sin firma completa · d tipos por rol · e datos mínimos incl. teléfono/domicilio · f búsqueda por tag) |
| Migración idempotente sobre BD existente | ✅ aplica 2× limpio (`psql --single-transaction`); catálogo residente 13 / superint. 7 / superv. 4 / otro 1 |
| **Suite e2e completa** | ✅ **136 passed · 8 skipped (los 8 fixme, sin empeorar) · 0 failed** (baseline con alta-v4 = 131 → +5) |

**No-regresión:** login (`hu-registro`), contrato/alta v2-v4, estimación (12/13/15/16), pago (21), bitácora shell (08/09/10) → verde.

---

## Archivos tocados

| Archivo | Cambio | ¿Permitido? |
|---|---|---|
| `backend/src/db/schema.sql` | **Solo se AGREGÓ** la sección "PASADA BITÁCORA" al final (B1 datos mínimos, B2 catálogo art.125 + `activo`, B3 tag, B4 firmas de nota). No se tocó contrato/alta/A2/estimación. | Migración = rol de Maiki (Fundación). Aditiva/idempotente. |
| `backend/src/controllers/bitacora.controller.js` | apertura=nota#1, datos mínimos, candado de emisión, `firmarNota`, guard anular apertura, payload con firmas/tag/apertura. | Dominio bitácora (no congelado). |
| `backend/src/routes/bitacora.routes.js` | + `POST /notas/:notaId/firmar`. | Dominio bitácora. |
| `backend/scripts/smoke-bitacora-v2.mjs` | **Nuevo** — smoke funcional. | Nuevo. |
| `frontend/src/services/api.js` | **+1 método** `firmarNota`. | No congelado (no es login/permisos/sesión). |
| `frontend/src/pages/AperturaBitacora.jsx` | captura/visualización de datos mínimos; fecha de apertura. | HU-08 (objetivo). |
| `frontend/src/pages/EmisionNotas.jsx` | reestructura (nota central + "Ver bitácora"), apertura=#1 + firma, candado UI, firma de notas, tag. | HU-09 (objetivo). |
| `frontend/src/components/notas/BuscadorNotas.jsx` | tag en búsqueda + chip. | HU-10 (objetivo). |
| `frontend/e2e/bitacora-v2.spec.js` | **Nuevo** — e2e (a)–(f). | Nuevo. |

**NO se tocó:** login/auth, permisos.js, SesionContext.jsx, App.jsx, contratos.*, estimaciones.*, programa.*, alta (AltaContrato.jsx es de alta-v4, no de esta pasada), ni las 15 HU prototipo.

---

## RUNBOOK (incluye migración a Render)

### Local (ya aplicado y probado)
```powershell
# init.js está GATEADO por RUN_MIGRATIONS en server.js → un restart local NO re-aplica el schema.
# Para aplicar la migración a la BD local (idempotente, single-transaction):
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 --single-transaction < backend/src/db/schema.sql
docker restart sigecop_backend         # carga el controller/rutas nuevos (no auto-recarga)
node backend/scripts/smoke-bitacora-v2.mjs    # 15/15
cd frontend; npx playwright test bitacora-v2.spec.js   # 5/5
```

### Render (la ejecuta Maiki)
1. **Backup primero** (irreversible): dashboard de Render (Backups) o `pg_dump "$DATABASE_URL" > backup.sql`.
2. **Migrar** (la migración es **aditiva e idempotente**: `ADD COLUMN IF NOT EXISTS`, `INSERT … ON CONFLICT DO NOTHING`, `CREATE TABLE/TRIGGER IF NOT EXISTS`, guards `pg_constraint`; los `UPDATE` solo desactivan/reordenan tipos coarse). Dos vías:
   - **Deploy con `RUN_MIGRATIONS=true`** → `initDb()` re-aplica `schema.sql` en una transacción al arrancar; o
   - **Manual:** `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f backend/src/db/schema.sql`.
3. **Verificar:** `psql "$DATABASE_URL" -c "SELECT rol_emisor, count(*) FROM bitacora_nota_tipos WHERE activo GROUP BY 1;"` (residente 13, superintendente 7, supervisión 4) y `SELECT to_regclass('public.bitacora_nota_firmas');`.
4. **Nota de datos:** las bitácoras **ya aperturadas antes** de esta migración **no tienen** retroactivamente la nota #1 (apertura): solo las **nuevas** la registran. Si se quiere backfill, es un script aparte (no incluido) — `[no determinable]` si el profe lo exige para históricos.

---

## `[validar]` / `[no determinable]` (consolidado)
- **`[validar]`** plazo de firma de notas: el art. 123 fr. III dice que el plazo lo **acuerdan las partes**; default 2 días (parametrizable por contrato). El profe: "checarle cuántos días… o se establecen previo acuerdo".
- **`[validar]`** `fecha_apertura` = inicio del contrato ("mismo día"); y si los datos mínimos son estrictamente obligatorios para aperturar.
- **`[validar]`** anular una nota ya **aceptada** (tácita/firmada): tensión art. 123 fr. VI vs fr. VII (hoy: nunca se borra; se bloquea si fue respondida).
- **`[no determinable]`** bitácora convencional (art. 124) y de servicios (art. 126) — fuera de alcance (electrónica). Backfill de nota #1 para bitácoras históricas. Mecanismo real de sustitución de personas (art. 125 fr. I g) = pieza de Fundación, no de esta pasada.

*Fin. Patch: `docs/BITACORA_v2_DIFFS.patch`. Probado en local: smoke 15/15, e2e bitácora 5/5, suite 136/8-skip/0-fail. `main` en `c9fba02`, sin commit.*
