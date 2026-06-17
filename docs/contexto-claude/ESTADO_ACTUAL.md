# SIGECOP — Estado actual del sistema (documento canónico)

> **Este es el documento ÚNICO y canónico del estado del sistema.** `CLAUDE.md` ordena leerlo ANTES de
> cualquier tarea y mantenerlo actualizado DESPUÉS de cualquier cambio. Si algo aquí contradice otro doc,
> **manda éste** (y manda el código sobre éste). No debe haber un segundo doc de estado compitiendo: la foto
> vieja del 02-jun quedó archivada en `docs/historial/contexto/ESTADO_ACTUAL_02jun.md`.
>
> **Propósito:** que cualquier desarrollador (o Claude en otra sesión) pueda **retomar el proyecto sin
> contexto previo**. Todo lo de aquí está **verificado contra el código/git real** (no asumido). Tono
> honesto: lo que funciona y lo que es maqueta están marcados como tales.
>
> **Cabecera de versión:** fecha **2026-06-17**, `main = 75797e2` (oleadas A/CITAS/B/PAGO/C + pulido UX ya
> commiteados) + **cambios LOCALES sin commit** de tres sesiones:
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
>
> **Docs hermanos:** historia completa → `docs/HISTORIAL_PROYECTO.md` · historias de usuario vigentes
> (criterios = sistema real) → `docs/analisis-y-diseno/Historias_Usuario_ACTUALIZADAS_12jun.md` · auditoría
> criterio-por-criterio → `docs/analisis-y-diseno/AUDITORIA_COHERENCIA_HU.md`.

---

## 1. Estado general

**Qué es:** SIGECOP es una app web de **gestión técnico-administrativa de contratos de obra pública** bajo
ley mexicana (LOPSRM / RLOPSRM / LFD): alta de contratos con catálogo y programa de obra, bitácora
electrónica con notas firmadas, avance físico, ciclo de estimación (integración → presentación → revisión →
autorización → pago), convenios modificatorios, reportes y control de accesos por rol y por participación en
el contrato. Proyecto académico (UAGRO, Etapa 1), 6 personas en 3 frentes.

**Punto actual:** `main = d6abfdd` (2026-06-13). Desplegado en Render. Stack y esquema maduros; el **ciclo
núcleo (alta → bitácora → avance → estimación → autorización → pago) funciona end-to-end** contra backend
real. **Ya no quedan pantallas de maqueta pura:** todas las HU del catálogo tienen backend real.

**% funcional (por HU, honesto):** de 27 unidades (HU-00..24 + Registro + Por Firmar + HU-22 roster + HU-23
empresas), **~27 funcionan end-to-end** (≈100% del catálogo); **0 maquetas**. **HU-18 portafolio** pasó a
funcional (17-jun); **HU-02 fianzas y HU-11 minutas** pasaron a funcional (sesión E2 18-jun: `GET/POST
/api/garantias` y `/api/minutas`, PDF, endosos, vínculo a nota); **HU-20 tránsito a pago** pasó a funcional
(sesión grande 18-jun, PR `feat/e3-hu-20`: `GET/POST /api/instruccion-pago`, suficiencia art. 24, semáforo
art. 54, instrucción de pago real). **Sobre los números generadores (art. 132 RLOPSRM): SON funcionales** —
se capturan en la integración de la estimación (HU-12) y se persisten; lo único pendiente es el **bloque de
captura DEDICADO del cascarón de estimación (FASE 5)**, que hoy delega a HU-12 (es un refinamiento de UX, no
funcionalidad faltante). Detalle exacto en §7.

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
   nota↔estimación) · `estimacion_observaciones` (HU-15) · `estimacion_soportes`/`estimacion_fotos`
   (esqueleto BYTEA diferido).
7. **Pagos/presupuesto:** `pagos` (índice único parcial = no-doble-pago) · `presupuesto_anual` (HU-20) ·
   `instruccion_pago` (HU-20).
8. **Convenios + versionado (HU-03):** `convenios_modificatorios` · `programa_version` (índice único parcial
   `WHERE vigente`) · `programa_version_concepto` + `programa_version_celda` (snapshots).
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
| `convenios_modificatorios` | transición | ligar `nota_id` NULL→valor (asiento diferido, una vez) |
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
  (no obedece el plan; Fase B `[validar profe]`). `[validar profe]`: proporcionalidad estricta vs. esta
  banda editable.
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

- **Integraciones de equipo recientes:** **HU-15** (revisión técnica E3: supervisión observa/turna,
  residencia autoriza/rechaza; reconcilió O7) · **HU-19** (7 reportes client-side jsPDF/exceljs).

---

## 7. Qué falta (honesto)

### 7.1 Pantallas MAQUETA (sin backend, dummy puro)
**Ya no quedan.** Las tres últimas se cerraron en junio:
- **HU-18 Portafolio** → funcional (17-jun): `GET /api/portafolio` (`portafolio.controller.js`, solo
  lectura, acotado por participación vía `ROLES_VEN_TODO`/`lib/acceso`) calcula el semáforo server-side
  desde datos reales. Umbrales y la definición de "avance físico" quedan **`[validar profe]`** (ver HU-18).
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

### 7.3 `[validar profe]` abiertos (decisiones legales, NO las decide Code)
- ~~Gate de pago permisivo~~ → **RESUELTO (OLEADA PAGO): endurecido a SOLO `'autorizada'`** (art. 54).
- Amortización **Fase B** (¿la carátula obedece el plan editable o sigue proporcional? — sigue proporcional, art. 143 fr. I).
- Ancla de periodo de los reportes (HU-19); 2 al millar CMIC (sin fundamento federal, solo si el contrato lo
  pacta); emisor de la nota DIFERIDA de hecho (JWT vs actor original) [C3, opcional].

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
- **Código muerto dudoso** (NO tocar sin decisión de Maiki, ver `docs/analisis-y-diseno/AUDITORIA_CODIGO_MUERTO.md`):
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
| HU-03 | Convenios modificatorios | ✅ |
| HU-04 | Expediente contractual | ✅ |
| HU-05 | Programa y curva de avance | ✅ |
| HU-06 | Trabajos terminados por periodo | ✅ |
| HU-07 | Alertas de atraso por concepto | ✅ (rediseñado a panel automático) |
| HU-08 | Apertura de bitácora | ✅ |
| HU-09 | Notas tipificadas con firma | ✅ |
| HU-10 | Consulta/búsqueda de notas | ✅ |
| HU-11 | Minutas, visitas y acuerdos | ✅ (sesión E2 18-jun: `/api/minutas` CRUD minutas/visitas + PDF + vínculo a nota de bitácora art. 123 fr. X RLOPSRM, sin alterar la nota) |
| HU-12 | Integración de estimación | ✅ |
| HU-13 | Envío/presentación de estimación | ✅ (bloqueo 6 días = solo aviso) |
| HU-14 | Historial de estimaciones | ✅ (línea de tiempo incompleta) |
| HU-15 | Revisión técnica y autorización | ✅ |
| HU-16 | Reingreso tras rechazo | ✅ (reingreso real: nueva versión bloque indep. ligada por `reemplaza_a`; plazo art. 54 no se reinicia) |
| HU-17 | Tablero de estimaciones | ✅ |
| HU-18 | Portafolio ejecutivo con semáforos | ✅ (integración 17-jun: semáforo server-side `GET /api/portafolio`, acotado por participación; umbrales/avance físico `[validar profe]`) |
| HU-19 | Exportación de 7 reportes | ✅ (R4 observaciones pendiente) |
| HU-20 | Tránsito a pago / suficiencia presupuestal | ✅ (sesión grande 18-jun, PR `feat/e3-hu-20`: `GET/POST /api/instruccion-pago`; suficiencia art. 24 server-side, semáforo plazo 20 días art. 54 anclado en nota de autorización, soportes factura/CFDI + fianza leída de garantías, instrucción real 1×estimación UNIQUE, **gate de finiquito** art. 64/170; `[validar profe]` resueltos con base legal en la historia) |
| HU-21 | Registro del pago | ✅ (gate ESTRICTO: solo `autorizada`, art. 54) |
| Registro | Auto-registro con aprobación de dependencia | ✅ |
| Por Firmar | Firma de aperturas pendientes | ✅ |
| HU-22 | Sustitución de personas / roster (art. 125) | ✅ |
| HU-23 | Catálogo de empresas | ✅ (registro por **SELECTOR del catálogo**, no texto libre — sesión autónoma 16-jun; + deduplicación FUERTE que funde acentos/puntuación/sufijos de razón social como segunda red — FASE 3 15-jun) |
| HU-24 | Finiquito y cierre del contrato | ✅ (FASE 4, 17-jun: `GET/POST /api/finiquito/contrato/:id`; saldo server-side = Σ neto autorizada/pagada − pagos − anticipo no amortizado − `ajustes_finales` parametrizables `[validar profe]`; asienta nota de bitácora `finiquito` y cierra el contrato (`contratos.estado='cerrado'`); 1 por contrato, append-only; documento art. 170 imprimible. art. 64 LOPSRM / 168-172 RLOPSRM) |

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

Pasada de coherencia entre **este doc** y `docs/analisis-y-diseno/Historias_Usuario_ACTUALIZADAS_12jun.md`:
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
