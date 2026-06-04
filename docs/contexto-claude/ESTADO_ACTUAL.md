# SIGECOP — Estado actual REAL del sistema (auditoría read-only)

**Fecha:** 2026-06-02 · **Modo:** SOLO LECTURA (no se modificó código ni docs). · **Tipo:** documento interno.

**Cómo se verificó (para que confíes en esto, no en docs viejos):**
- Lectura directa de archivos reales: `schema.sql` completo, `server.js`, controllers/routes, páginas del frontend, `api.js`, `docker-compose.yml`, `render.yaml`, CI, specs.
- `git log` completo + `git branch -a` + `grep` propio sobre el repo (clasificación página-por-página de quién importa `dummy` vs `api`).
- **Verificación en vivo:** `docker ps` (stack local corriendo) + `WebFetch` a las URLs de Render.
- Cada afirmación lleva evidencia `archivo:línea`. Lo que **no** se pudo determinar de los archivos va marcado **[NO DETERMINABLE]** — no se inventó.
- Donde un documento del repo (p. ej. `DECISIONES.md`) **contradice el código real**, se marca **[DOC DESACTUALIZADO]** y manda el código.

---

## 1. Resumen (en llano)

SIGECOP es una app web de gestión de contratos de obra pública (LOPSRM/RLOPSRM/LFD): React+Vite+Tailwind al frente, Node+Express+PostgreSQL atrás, desplegada en Render. **El esqueleto está vivo y es real donde importa:** login, alta de contrato con catálogo (cuadre exacto al centavo), bitácora (apertura + notas tipificadas + consulta), integración de estimación con carátula calculada server-side, y registro de pago **funcionan end-to-end contra PostgreSQL**. El resto de las pantallas (15 de 22 HU) son **prototipos con datos de muestra (`dummy`)**: la interfaz está hecha y calcula, pero todavía **no** guarda nada en la base. El sistema **levanta sin errores en local** (los 3 contenedores corriendo ahora) y **está desplegado y respondiendo en Render**. Dos cosas grandes que el equipo decidió pero que **aún NO están ejecutadas en el código**: (1) **rehacer el programa de obra (Fase A2)** — sigue el modelo viejo de texto libre; (2) **quitar el "modo proyecto"** — sigue intacto. Ambas son trabajo de fundación (tuyo) y bloquean a los equipos.

---

## 2. Estructura real del repo

```
sigecop/
├── backend/         Node+Express+PG. server.js + src/{controllers,routes,middlewares,lib,db}, Dockerfile
│   └── src/db/schema.sql   ← UN archivo, 16 tablas, triggers, seed (autor único: Maiki)
├── frontend/        React+Vite+Tailwind. src/{pages,components,services,context,data}, e2e/ (Playwright)
│   ├── src/services/api.js ← única puerta al backend (25 funciones fetch)
│   └── src/data/dummy.js   ← datos de muestra de los prototipos + metadata de rutas
├── docs/            documentación (mezcla entregable / interno / borrador)
├── docker-compose.yml · render.yaml · .github/workflows/e2e.yml · .github/CODEOWNERS
├── CLAUDE.md        reglas del proyecto + zona congelada
└── .env (NO trackeado) / .env.example
```

**Entregable vs interno vs basura (docs/):**

| Clase | Archivos |
|---|---|
| **Entregable académico** | Auditoria_Legal_SIGECOP.md, Cobertura_Legal_{LOPSRM,Reglamento}.md, Auditoria_Coherencia_F3.md, + binarios (Estudio_Factibilidad.docx, Historias_Usuario.xlsx, matriz_DEFINITIVA.xlsx, Plan_Riesgos.xlsx, Maquetas, diagramas, PDFs de ley) |
| **Interno (NO entregar)** | Revision_Profesor_Sprint1-2 (nombra al profe), Plan_Particion_3Equipos, Prompts_Accion_Equipos, Borrador_DDL, DECISIONES.md, Fichas_Trazabilidad, Acordeon_Defensa, Matriz_Control_Accesos, SETUP_LOCAL, GUIA_TRABAJO_EQUIPOS, **este archivo** |
| **Secreto (gitignored, NO subir)** | Cuentas_Prueba_SIGECOP.md (contraseñas en claro), comandos usuario.txt |
| **Basura / duplicado** | `Matriz_Control_Accesos_SIGECOP (1).md` (copia duplicada, untracked → borrar una), `frontend/src/pages/_PLANTILLA_VISTA.jsx` (plantilla, no es página real), backups `render_backup_*`, `*_BACKUP_*.xlsx` |

**Docs desactualizados detectados (contradicen el código real HOY):**

| Documento | Lo que dice | Realidad en código | Severidad |
|---|---|---|---|
| **DECISIONES.md §4.1** (~líneas 93-99) | "El backend es un **esqueleto**; las vistas usan **datos de muestra**." | **FALSO ya:** 7 HU son backend real (login, alta, bitácora, estimación, pago). | Media — confunde el estado |
| **DECISIONES.md §1.3** | Describe el "modo proyecto" como **característica de diseño** establecida. | Sigue en el código, **pero el equipo decidió retirarlo**; DECISIONES.md no refleja esa decisión. | Media |
| **Fichas_Trazabilidad.md** | "305 tests E2E verde." | Ese número es de un commit **anterior** al cableado real (era el prototipo); **no se re-verificó** tras cablear (ver §8). | Media |
| **Matriz_Control_Accesos_SIGECOP.md** | Promete matriz **22 HU × 5 roles**. | Solo tiene **4 HU** (01/08/12/21); ella misma se marca "pendiente". | Baja |
| **docs/README.md** | Lista entregables como si estuvieran en `docs/`. | Rutas no claras (varios binarios podrían estar en `FEPI/` o fuera). [NO DETERMINABLE] | Baja |

> Nota: **`Borrador_DDL_Tablas_Nuevas_SIGECOP.md` NO está desactualizado** — está correctamente marcado "BORRADOR — NO APLICADO". Es diseño anticipado, no estado.

---

## 3. ¿Qué funciona HOY, de verdad?

### 3.1 Backend — los 6 routers montados ejecutan PostgreSQL real (ninguno es esqueleto)

`server.js:29-34` monta 6 routers; **todos** consultan PG con transacciones donde toca:

| Router | Endpoints | Real PG |
|---|---|---|
| `/api/auth` | POST /login, POST /register | ✅ bcrypt + JWT |
| `/api/usuarios` | GET /?estado, GET /asignables?rol, PATCH /:id/aprobar, PATCH /:id/rechazar | ✅ |
| `/api/contratos` | POST /, GET /, GET /:id, POST /:id/documento, GET /:id/documento[/meta] | ✅ transacción cabecera+bloques; PDF en BYTEA append-only |
| `/api/bitacora` | POST /apertura, GET /pendientes, POST /:id/firmar, GET /nota-tipos, GET /contrato/:id[/notas], POST /:id/notas, GET /:id/notas, POST /notas/:id/anular, POST /notas/:id/vincular | ✅ folio correlativo atómico (`pg_advisory_xact_lock`) |
| `/api/pagos` | POST /, GET /contrato/:id | ✅ append-only; plazo art. 54 derivado en lectura |
| `/api/estimaciones` | POST /, GET /contrato/:id/avance, GET /contrato/:id, GET /:id | ✅ carátula server-side; valida exceso art. 118 y periodo art. 54; lock por contrato |

**Lógica de dominio real:** monto derivado `Σ ROUND(cant×pu,2)` sin tolerancia (alta); carátula (amortización art. 143, retención 5 al millar art. 191 LFD, neto) calculada en SQL NUMERIC; inmutabilidad por **7 triggers**; identidad (`registrado_por`/`integrada_por`/firmas) sale del **JWT**, no del body. *No hay endpoints fuera de estos 6 routers* (todo lo demás vive como prototipo en el frontend).

### 3.2 Frontend — cableado real vs prototipo (verificado con grep propio)

Clasificación decisiva (qué página importa `api.js` vs `data/dummy.js`):

- **Cableadas a backend real (9 páginas):** `SeleccionRol` (login), `SolicitudesRegistro` (aprobación), `PorFirmar` (firmas), `AperturaBitacora` (HU-08), `EmisionNotas` (HU-09), `ConsultaNotas` (HU-10), `IntegracionEstimacion` (HU-12), `RegistroPago` (HU-21), y **`AltaContrato` (HU-01)** que mezcla API real + `dummy` solo como ejemplo inicial del formulario.
- **Prototipo dummy puro (sin `api`, 15 HU):** RegistroFianzas(02), ConveniosModificatorios(03), ConsultaExpediente(04), CurvaAvance(05), TrabajosTerminados(06), AlertasAtraso(07), MinutasVisitas(11), EnvioEstimacion(13), HistorialEstimaciones(14), RevisionEstimacion(15), ReingresoEstimacion(16), TableroEstimaciones(17), PortafolioEjecutivo(18), ExportacionReportes(19), TransitoPago(20).

### 3.3 Base de datos — 16 tablas reales en `schema.sql`; 12 cambios en borrador (no aplicados)

**Aplicadas (16):** `usuarios`, `contratos`, `contrato_conceptos`, `contrato_actividades`, `contrato_garantias`, `contrato_documentos`, `bitacora_aperturas`, `bitacora_firmantes`, `bitacora_nota_tipos`, `bitacora_notas`, `estimaciones`, `estimacion_generadores`, `estimacion_notas`, `estimacion_soportes`, `estimacion_fotos`, `pagos`. **7 triggers** de inmutabilidad. **Seed:** 4 usuarios demo + 1 contrato `OP-2026-DEMO-001` (contraseña `Sigecop2026!`).

**En `Borrador_DDL` — NO aplicadas a `schema.sql` (12):** `contrato_roster` (sustitución personas, ALTA legal), `ALTER estimaciones +retencion_cmic` (CMIC), `convenios_modificatorios`+`convenio_conceptos` (HU-03), `concepto_avance` (HU-06), `garantia_endosos` (HU-02), `alerta_atraso` (HU-07), `minutas`+`visitas` (HU-11), `ALTER estimaciones +enviada_en/por +reemplaza_a` (HU-13/16), `estimacion_observaciones` (HU-15), `presupuesto_anual`+`instruccion_pago` (HU-20). **Ninguna integrada.**

### 3.4 ¿Levanta en local? ¿Render?

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿Levanta en local sin errores? | **SÍ.** | `docker compose config` válido; `docker ps` = 3 contenedores `Up` (db healthy, backend, frontend); `GET localhost:4000/api/health` → `status: ok`; `localhost:5173` sirve la app. |
| ¿Está corriendo ahora? | **SÍ**, los 3 contenedores arriba. | `docker ps` (al momento de la auditoría) |
| ¿Render desplegado y funcionando? | **SÍ.** Frontend (estático) sirve la app; backend **vivo** (free-tier hace *spin-down*: 1ª llamada dio 503 dormido, luego `/` respondió 404 de Express = servidor despierto y respondiendo; solo expone `/api/*`). | WebFetch a `sigecop-frontend.onrender.com` (HTML ok) y `sigecop-backend.onrender.com/` (404 Express). `render.yaml`: auto-deploy desde `main`, `RUN_MIGRATIONS=true`. |

> Matiz honesto: no se obtuvo un `200 ok` fresco de `/api/health` en Render porque la 1ª llamada cayó en el *cold-start* (503) y la respuesta queda cacheada 15 min. El 404 en la raíz **prueba que el backend está levantado**. Para ver el `ok`, vuelve a pegarle a `/api/health` (despierto ya).

---

## 4. Estado del "modo proyecto"

**Decisión del equipo:** quedarse solo en modo aplicación. **Estado en código: INTACTO — no se ejecutó la remoción.** No hay commit de remoción; los commits "feat(modo-aplicacion)" **agregaron** el modo app *junto* al modo proyecto, no lo quitaron.

Dónde vive todavía (todo verificado):

| Pieza | Archivo:línea |
|---|---|
| Estado `modo` (default `'proyecto'`) + `setModo`/`cambiarModo` | `SesionContext.jsx:13,59,62` |
| Toggle "Modo proyecto / aplicación" en el header | `Header.jsx:5-30` |
| Atajo demo (botones de rol **sin login real**) | `SeleccionRol.jsx:306-340` |
| Guarda `SoloModoProyecto` + ruta `/solicitud-acceso` | `App.jsx:66-70,101` |
| Metadata académica condicional (`mostrarMeta = !enModoApp`) | `SesionContext.jsx:82-97`, `HeaderVista.jsx:24`, `SeccionCriterios.jsx:11`, `BadgeSprint.jsx:4-6` |
| Filtrado "Propuestas"/badges de sprint | `Inicio.jsx:7-8,46-101`, `Sidebar.jsx:7-8,130-170` |
| `vistasPropuesta` (solo `solicitud-acceso`) | `dummy.js:516-524` |

> **Importante (no romper al quitarlo):** `historiasUsuario` en `dummy.js` **NO es del modo proyecto** — es metadata de rutas/menú que usan `App.jsx`/`Inicio.jsx`/`Sidebar.jsx`. Y `/solicitud-acceso` (registro) tiene backend real (`POST /api/auth/register`): al quitar el modo, **muévela a ruta pública**, no la borres. Complejidad de la remoción: BAJA (ninguna lógica de negocio depende de `modo`).

---

## 5. Inventario de las 22 HU

**Leyenda:** 🟢 end-to-end real (PG) · 🟡 prototipo dummy (UI sin backend). *(No hay "naranja" real: el grep confirmó que cada página o llama a `api` o importa `dummy`; el único matiz es el export client-side, ver notas.)*

| HU | Título | Estado | Depende de |
|---|---|---|---|
| HU-00 | Login / control de accesos | 🟢 | — |
| HU-01 | Alta y configuración del contrato | 🟢 *(alta+catálogo real; el "programa" usa el modelo viejo, ver A2)* | — |
| HU-02 | Registro de fianzas/garantías | 🟡 | tabla `garantia_endosos` (pídela a Maiki) |
| HU-03 | Convenios modificatorios | 🟡 | **A2** + migración+endpoint (Fundación) |
| HU-04 | Consulta integrada del expediente | 🟡 | GET `/contratos/:id` (ya da bloques) |
| HU-05 | Programa y curva de avance | 🟡 | **A2** + HU-06 |
| HU-06 | Trabajos terminados por concepto | 🟡 | **A2** + tabla `concepto_avance` |
| HU-07 | Alertas de atraso | 🟡 | tabla `alerta_atraso` |
| HU-08 | Apertura de bitácora | 🟢 | HU-01 |
| HU-09 | Emisión de notas tipificadas | 🟢 | HU-08 |
| HU-10 | Consulta y búsqueda de notas | 🟢 *(lectura real; export xlsx es client-side)* | HU-08 |
| HU-11 | Minutas, visitas e inspecciones | 🟡 | tablas `minutas`/`visitas` |
| HU-12 | Integración de la estimación | 🟢 *(guardado+carátula real; soportes/fotos = esqueleto)* | HU-01, HU-08 |
| HU-13 | Envío de la estimación | 🟡 | columnas `enviada_en/por` |
| HU-14 | Historial de estimaciones | 🟡 *(importa dummy, NO api)* | HU-12 |
| HU-15 | Recepción/revisión/autorización | 🟡 | tabla `estimacion_observaciones` |
| HU-16 | Reingreso tras rechazo | 🟡 | columna `reemplaza_a` |
| HU-17 | Tablero de estimaciones | 🟡 | HU-12/13 |
| HU-18 | Vista ejecutiva / portafolio | 🟡 | datos de todos los contratos |
| HU-19 | Exportación de reportes (7) | 🟡 | datos reales por HU |
| HU-20 | Tránsito a pago | 🟡 *(importa dummy, NO api)* | tablas `presupuesto_anual`/`instruccion_pago` |
| HU-21 | Registro del pago efectuado | 🟢 | HU-20 (FK `pagos.estimacion_id` hoy nullable) |

**Total: 7 🟢 reales · 15 🟡 prototipo.** *(Corrige al lector automático que había marcado HU-14 y HU-20 como "parcial": mi grep prueba que importan `dummy` y no `api`.)*

---

## 6. ⭐ Estado de la Fase A2 (lo más importante)

**A2 = rehacer el programa de obra como CONCEPTOS DEL CATÁLOGO repartidos en PERIODOS (matriz concepto × periodo)**, reemplazando el modelo de texto libre. Define el ciclo de estimación y desbloquea HU-05, HU-06 y el versionado de HU-03.

### ¿Qué fue "A1"? — ✅ TERMINADO
Commit **`69456f2`** (Maiki). Catálogo con **cuadre exacto al centavo** (monto derivado `Σ ROUND(cant×pu,2)`, sin tolerancia), **clave de concepto** capturable y obligatoria (UNIQUE por contrato, art. 45 fr. IX), `pu`/`pu_snapshot` ensanchados a `NUMERIC(16,4)`. Está en producción (`schema.sql:684-728`, `contratos.controller.js`, `AltaContrato.jsx`). A1 ≠ A2.

### A2 — ❌ SOLO PLANEADO (ni siquiera diseñado en el borrador)
- **Esquema:** sigue el modelo VIEJO → `contrato_actividades` (`schema.sql:157-169`): columnas `actividad TEXT, inicio DATE, termino DATE, peso NUMERIC` = **texto libre con peso, NO ligado a `contrato_conceptos` ni a periodos.** **No existe** ninguna tabla `contrato_programa` en `schema.sql`.
- **Git:** el último commit de feature es A1; **no hay commit de A2.** `contrato_programa` aparece **solo en los docs de plan**, en ningún archivo de código.
- **Borrador DDL:** ⚠️ **hallazgo importante** — el borrador **tampoco define `contrato_programa`.** Su mapa de tablas tiene `concepto_avance` (avance **EJECUTADO**, HU-06) y `convenio_conceptos`, pero **ninguna tabla del programa PLANEADO** (concepto×periodo). El prompt de Fundación sí la describe como "diseña primero el DDL tipo `contrato_programa`", pero ese DDL **aún no está escrito**.

**Conclusión:** A2 está en estado **(c) solo planeado**, y de hecho **un paso antes**: falta diseñar su DDL.

| | Estado |
|---|---|
| **HECHO** | A1 (cuadre + clave). La intención y el fundamento legal (art. 45 fr. X RLOPSRM: "programa de ejecución conforme al catálogo, calendarizado por periodos") están claros en los prompts/plan. |
| **PENDIENTE** | (1) **Diseñar el DDL** de la matriz concepto×periodo (no está ni en el borrador). (2) Validar Σ cantidad_planeada por concepto ≤ contratado (art. 118). (3) Migrar idempotente a `schema.sql`. (4) Cablear alta (`AltaContrato.jsx` + `contratos.controller.js`). (5) Conectar el ciclo de estimación (qué es "periodo" para HU-12). |
| **SIGUIENTE PASO concreto** | Maiki: **escribir el DDL de `contrato_programa` en `Borrador_DDL`** (hoy ausente), confirmarlo con el profe, y aplicarlo con el runbook. Hasta entonces HU-05/06/03 siguen bloqueadas. |

**Dependientes de A2:** HU-05 🟡 (bloqueada), HU-06 🟡 (bloqueada, además necesita `concepto_avance`), versionado HU-03 🟡 (bloqueado). HU-12 funciona pero su "periodo" queda **impreciso** sin A2 (el generador estima por concepto, sin un programa planeado contra el cual contrastar).

---

## 7. Estado del plan de paralelización (ejecutado vs papel)

| Elemento del plan | ¿En el repo? | Evidencia |
|---|---|---|
| `CLAUDE.md` con zona congelada | ✅ Sí | `CLAUDE.md:15-32` (18 archivos) |
| `CODEOWNERS` de fundación | ✅ Sí | `.github/CODEOWNERS` (auto-asigna `@TheMike54`) |
| Esquema en **1 solo** `schema.sql` (D-1) | ✅ Sí | archivo único, 16 tablas |
| Prompts por equipo | ✅ Sí | `docs/Prompts_Accion_Equipos_SIGECOP.md` |
| Guía SETUP_LOCAL + GUIA_TRABAJO_EQUIPOS | ✅ Sí | `docs/` |
| Ramas `feat/e2-*` / `feat/e3-*` | ❌ **No existen** | `git branch -a` solo muestra `main` |
| Partición código por equipo (E2/E3) | ⏳ Solo papel | todo el código real vive en `main`, sin separar |
| Branch protection en GitHub (que el CODEOWNERS **bloquee** el merge) | **[NO DETERMINABLE]** desde el repo | el propio `.github/CODEOWNERS:5-9` avisa que sin la regla en Settings→Branches, solo *pide* review, no bloquea |
| Decisiones D-3…D-10 | ⏳ Resueltas en papel (§0.2 del plan) | no hay código que las ejecute |
| Remoción del modo proyecto (§6 del plan) | ❌ No ejecutada | ver §4 |

**Resumen:** la **fundación/gobernanza está montada** (CLAUDE.md, CODEOWNERS, esquema único, prompts, guías). Lo que **falta ejecutar**: crear las ramas de equipo, activar branch protection en GitHub, y arrancar el trabajo paralelo. El plan está listo para empezar; aún no empezó la ramificación.

---

## 8. CI y pruebas

- **CI (`.github/workflows/e2e.yml`):** corre **solo Playwright en el frontend** (`npm run test:e2e`). **No levanta backend ni Postgres.** Sube artifacts solo si falla.
- **`playwright.config.js`:** `webServer = npm run dev` (Vite :5173), `fullyParallel:false`, `reuseExistingServer:!CI`, chromium, retries=1.
- **22 specs** en `frontend/e2e/`: **21** corren contra `dummy` en memoria (patrón modo-proyecto + `enterAppMode(rol)`); **1** (`hu-registro.spec.js`) requiere backend real y está `test.skip(!!process.env.CI)` → solo corre en local.

⚠️ **[OJO — RIESGO, no verificado en esta auditoría]:** el lector automático asumió "las 21 deberían pasar", pero **no se re-ejecutó la suite**. Varias HU (08/09/10/12/21) **ya NO usan dummy sino API real**; sus specs de modo-proyecto fueron escritas contra el prototipo. El "305/305 verde" / "133/133" que aparece en commits y en `Fichas_Trazabilidad.md` es **previo al cableado**. **Hay que correr el CI para saber el verde real de hoy** — es plausible que specs de las HU ya cableadas fallen o necesiten reescribirse como autenticadas (lo que el plan §7 ya anticipaba). **[NO DETERMINABLE]** sin ejecutar.

---

## 9. Bloqueos y dudas abiertas

**Bloqueos técnicos (orden de impacto):**
1. **A2 (programa de obra)** — bloquea HU-05, HU-06, versionado HU-03. Falta hasta el **diseño del DDL** (§6). *Trabajo de fundación, tuyo.*
2. **Sustitución de personas (Paquete F, `contrato_roster`)** — **requisito legal (art. 125)** que hoy **NO se cumple**: `contratos` usa punteros escalares sin histórico; la tabla está en borrador, no aplicada. Riesgo en la defensa.
3. **Modo proyecto sin remover** — mantiene ambigüedad y specs frágiles; el plan dice quitarlo. *Fundación.*
4. **Specs de E2E desincronizadas** con el cableado real (§8) — verificar verde real.
5. **Branch protection no confirmada** — sin ella, cualquiera podría mergear a `main` saltando el CODEOWNERS. Actívala en GitHub.

**Decisiones que dependen del profe (NO las decide Code):**
- **CMIC / 2 al millar:** base **LFD / aportación CMIC** (NO LOPSRM); **tasa y si aplica en Etapa 1 = a confirmar.** No está en `schema.sql` (sería `ALTER estimaciones +retencion_cmic`, en borrador). ⚠️ si se agrega, **hay que meter `retencion_cmic` también al trigger `sigecop_estimacion_inmutable`** o quedaría editable tras integrar.
- **Convenios modificatorios (HU-03):** confirmar alcance **art. 59 / 59 Bis** (versionado del catálogo) — depende de A2.
- **Notificaciones (U3):** alcance Etapa 1. Hoy solo hay indicadores in-app (semáforos derivados); email/push sería Etapa 2.
- **Folio del contrato (C4):** ya implementado como **captura** del usuario (UNIQUE) — solo confirmar que así se queda.

**Higiene del repo (rápida, no bloqueante):** borrar `docs/Matriz_Control_Accesos_SIGECOP (1).md` (duplicado); actualizar la nota de `DECISIONES.md` (ya no es "todo esqueleto"); mantener `Cuentas_Prueba_SIGECOP.md` fuera del repo.

---

### Apéndice — Correcciones aplicadas sobre docs viejos / lectores automáticos
1. **HU-14 y HU-20** NO son "cableadas parciales": importan `dummy` y **no** `api` (grep propio) → 🟡 prototipo. 2. **HU-10** es 🟢 real (lectura desde backend); el único pedazo client-side es el export xlsx. 3. **`contrato_actividades`** tiene columnas `actividad/inicio/termino/peso` (no `titulo/descripcion` como citó un lector). 4. **DECISIONES.md** describe el backend como "esqueleto": **desactualizado**, 7 HU son reales. 5. **Render**: se elevó de "no determinable" a **desplegado y operativo** vía WebFetch (frontend HTML ok + backend 404-de-Express tras despertar del spin-down). 6. **CI**: se bajó de "todas pasan" a **"no re-verificado; riesgo por cableado"** — honesto.
