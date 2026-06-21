# AUDITORÍA FINAL — BUGS REPETIDOS + UX + TRAZABILIDAD HU (19-jun, ejecutado 20-jun)

> **Tras ejecutar el PLAN_SOLUCION_ERRORES_19jun.md.** Todo LOCAL, **sin push**, **sin tocar zona congelada**
> (salvo el diagnóstico del bug 4, marcado para la fase de BD). **Checkpoint: `vite build` verde después de CADA
> arreglo** (los e2e de Playwright requieren el stack docker levantado; no corren en CI — pendientes de smoke local).
> **Importante:** todos los bugs se reprodujeron en **Render (commit 4eaf044)**; verifiqué que el `HEAD` local **es
> exactamente `4eaf044`** (working tree solo con mis cambios) → el código auditado **es el desplegado**.

---

## 1. RESUMEN DE LO APLICADO (BLOQUE 1 + BLOQUE 2)

| # | Arreglo | Archivos | Build |
|---|---|---|---|
| 1 | **Jerga UI** fuera: badge flotante `HU-XX` (`AppShell.jsx`), `[Nivel 1 profe]`, `Etapa 1`, `(por bloques)` | AppShell, AmbienteAvance/Bitacora/Pago/Finiquito/Convenio/Expediente, CurvaAvance, IntegracionEstimacion, PortafolioEjecutivo, ReingresoEstimacion, EditorProgramaConvenio, CicloVidaContrato | ✅ |
| 2 | **Callejones a Inicio** → componente **`LinkHU`** (oculta/explica el link si el rol no tiene la HU) | **`components/LinkHU.jsx`** (nuevo) + IntegracionEstimacion, AmbienteAvance/Finiquito/Convenio/Pago | ✅ |
| 3 | **Tarjetas del Inicio** → Bitácora/Avance abren el **ambiente** (no la pantalla suelta) y marcan el sidebar | `Inicio.jsx` | ✅ |
| 4 | **Re-selección de contrato**: `?contrato` se preselecciona; **wizard de bitácora auto-salta** al paso ya logrado; `link-firmar` lleva el contrato | AmbienteBitacora, AperturaBitacora, EmisionNotas, ConsultaNotas, TrabajosTerminados, CurvaAvance | ✅ |
| 5 | **Convenio**: banner **persistente** que explica el "piso" de lo ya estimado (antes era un toast efímero) | ConveniosModificatorios | ✅ |
| 6 | **Candados con motivo**: el "Siguiente" gris dice POR QUÉ | AmbienteBitacora (+ estimación/pago en BLOQUE 2) | ✅ |
| 7 | **Bug 4 "Autorizar = error interno"**: diagnóstico (es esquema de Render, no código) — **no se editó backend** | — (ver §4) | — |
| 8 | **Solo campana**: se quitó el botón ✍️ "Por firmar" separado; su acceso vive en el pop-up de la campana | `AppShell.jsx` | ✅ |
| B2 | **Gating secuencial** como Alta: estimación (paso 0 exige periodo; paso 1 exige ≥1 línea) y pago (no avanzas sin suficiencia/soportes/instrucción) + motivos | IntegracionEstimacion, TransitoPago | ✅ |

---

## 2. (A) BUGS REPETIDOS EN VARIAS PANTALLAS — barrido sistemático

> Se revisó si cada patrón de bug existe en **otras** pantallas, no solo donde Maiki lo reportó. Resultado:
> **se aplicó el mismo fix a todas las repeticiones de bajo riesgo** (presentación/navegación). Build verde.

### A.1 Callejones a Inicio (links cross-actor que rebotan) — **patrón resuelto con `LinkHU`**
Causa común: `WithLayout` (`App.jsx:61-62`) y `SoloRol` redirigen a Inicio cuando el rol no tiene acceso al destino;
el frontend mostraba el link igual. `LinkHU` lo gatea por HU (`nivelDe`) o por `roles` (rutas SoloRol).

| Pantalla | Link (testid) → HU/ruta | Rol que rebotaba | Acción |
|---|---|---|---|
| IntegracionEstimacion | `par-revision` (HU-15) | **contratista** (dueño del wizard) | `LinkHU` ✅ |
| IntegracionEstimacion | `par-reingreso` (HU-16), `par-historial` (HU-14) | supervisión | `LinkHU` ✅ |
| AmbienteAvance | `link-alertas` (HU-07) | **contratista** | `LinkHU` ✅ |
| AmbienteFiniquito | `link-apertura`/`link-integracion`/`link-envio`/`link-consulta` (HU-08/12/13/10) | **dependencia** | `LinkHU` ✅ |
| AmbienteConvenio | `link-consulta` (HU-10) | **dependencia** | `LinkHU` ✅ |
| **AmbientePago** *(hallado en el barrido)* | `link-historial` (HU-14), `link-revision` (HU-15), `link-registro` (HU-21) | finanzas / contratista | `LinkHU` ✅ |
| **AmbientePago** *(hallado)* | `link-finiquito` (SoloRol dep/res) | finanzas / contratista | `LinkHU roles=[...]` ✅ |
| AltaContrato | `detalle-link-alertas` (HU-07) | — | **Ya estaba protegido** (`!sinAccesoAlertas`); es el patrón modelo. Sin cambio. |
| AmbienteExpediente | `link-expediente`/`link-reportes` (HU-04/19) | — | No rebota para sus roles. Sin cambio. |

### A.2 Re-selección de contrato (`?contrato` ignorado) — **patrón resuelto en 17 pantallas**
Antes solo **2 de 24** páginas leían `?contrato` (AlertasAtraso, ConveniosModificatorios). Ahora **17**.

- **Manual (FIX 4):** AperturaBitacora, EmisionNotas, ConsultaNotas, TrabajosTerminados, CurvaAvance + el
  auto-salto del wizard de bitácora (`AmbienteBitacora`) + `link-firmar` con `?contrato`.
- **Barrido (10 páginas más):** TransitoPago, RegistroPago, RevisionEstimacion, EnvioEstimacion,
  ReingresoEstimacion, HistorialEstimaciones, IntegracionEstimacion, ConsultaExpediente, Finiquito,
  ExportacionReportes — todas con el mismo patrón probado de `AlertasAtraso.jsx:67-74` (reutilizando su handler real
  de selección; sin tocar zona congelada). Build verde.
- *(Quedan sin `?contrato` solo páginas que NO reciben ese query desde ningún ambiente — p. ej. RegistroFianzas,
  MinutasVisitas se eligen desde su propio ciclo; si se quiere, se añade igual, es 1 efecto por página.)*

### A.3 Gating secuencial defectuoso (avanzar sin validar el paso) — **barrido de TODOS los wizards**
| Wizard | ¿Gating correcto antes? | Acción |
|---|---|---|
| **Alta de contrato** | ✅ correcto (`validarPaso` + `pasoMaxAlcanzado`) — **es el modelo** | sin cambio |
| **Estimación** (Integración) | ❌ **defectuoso**: `pasoValido` dejaba pasar el paso 0 (Periodo) y no exigía ≥1 línea | **corregido** ✅ |
| **Pago** (Tránsito) | ❌ **defectuoso**: `setPasoPago(pasoPago+1)` avanzaba **sin validar**; los chips saltaban libres | **corregido** (`pasoValidoPago` + `irPasoPago`) ✅ |
| **Bitácora** | ✅ correcto (gate por estado backend: abierta→firma→emitir) | sin cambio (+ motivo y auto-salto) |
| **Avance** / Revisión / Reingreso | no son steppers (bloques / máquina de estados) | n/a |

> **REGLA DE ORO TIPO B respetada:** el candado secuencial aplica **solo al stepper** (Tipo A). Las vistas
> "en paralelo" (Consultar, Historial, Curva, Alertas, Tablero, Expediente) **NO se bloquean** — `LinkHU` solo
> gatea por **acceso de rol** a la HU destino (lo mismo que ya hacía la guarda de ruta), no por estado del wizard.

### A.4 Candados sin motivo (botón gris mudo) — A5
Resueltos con texto explicativo: bitácora (`wsiguiente-bit-motivo`), estimación (`wsiguiente-motivo`),
pago (`wsiguiente-pago-motivo`). *(Alta ya tenía mensajes vía `validarPaso`; Finiquito ya tiene
`finiquito-sin-bitacora`.)*

### A.5 Tarjetas del Inicio divergentes — B3
Se revisaron **todas** las tarjetas del Inicio vs el sidebar: solo **Bitácora (HU-08)** y **Avance (HU-06)**
divergían (abrían la pantalla suelta). Corregidas. El resto ya coincidía.

---

## 3. (B) REDUCIR CLICS Y REDUNDANCIAS

### Aplicado (bajo riesgo, ya en este lote)
1. **Fin de la re-selección de contrato** (A.2): el usuario elige el contrato una vez y, al navegar con
   `?contrato`, las 17 pantallas lo **heredan** → se elimina 1 selección por salto.
2. **Wizard de bitácora auto-salta** al paso ya logrado (B7b): si la bitácora ya está aperturada y firmada,
   "Emitir notas" abre directo, sin re-pisar 2 pasos.
3. **Tarjetas del Inicio** llevan al ambiente correcto (B3): un clic menos y sin "pantalla incompleta".
4. **Notificaciones unificadas** (FIX 8): un solo centro (la campana) en vez de dos badges que confundían.

### Propuesto (decisión de Maiki — más grande)
1. **Contrato global (3A)** — ataca la raíz de la redundancia (ver §6). Es la mejora de mayor impacto en clics.
2. **Doble salto "ambiente → pantalla real"**: hoy sidebar → ambiente → pantalla son 2 clics. Para flujos muy
   usados (Avance/Bitácora) se podría permitir que la tarjeta/sidebar lleve directo a la acción más común
   (p. ej. "Registrar avance") con un enlace secundario al recorrido completo. **Riesgo medio** (cambia el modelo de
   navegación que ya conoces); lo dejo a tu decisión, no lo apliqué.
3. **Reportes**: 8 botones de exportar en una rejilla; se podría agrupar por reporte con un único botón
   "PDF/Excel" por fila para reducir ruido visual. Bajo riesgo, presentación; lo aplico si lo apruebas.

---

## 4. (C) CONSERVAR LA TRAZABILIDAD DE HU (limpia y discreta)

> Lo que se **quitó** (confunde / des-profesionaliza): el badge **flotante `HU-XX`** suelto en cada pantalla
> (`AppShell.jsx`), `[Nivel 1 profe]`, `Etapa 1`, `(por bloques)`. Lo que se **conservó** (trazabilidad legítima):

- **Sidebar:** se mantienen los *pills* de HU por ítem (no se tocó `Sidebar.jsx`) → el rango por ciclo sigue visible.
- **Ciclo de vida del contrato:** se **conservaron** los códigos HU en los títulos de cada bloque
  (p. ej. "Bitácora en operación (HU-09/10)", "Ejecución y seguimiento (HU-06/07/05)") — solo se quitó
  "recorrido por bloques". Es la vista de trazabilidad por excelencia para ti y el profe.
- **Cada pantalla** sigue declarando su `huId` en `HeaderVista` (metadato interno, no estorba al usuario).

**Propuesta para mostrarlo elegante y discreto (a tu OK, bajo riesgo):** un *chip* gris pequeño junto al título de
cada **ambiente** con el **rango del ciclo**, p. ej. `Ciclo de estimación · HU 12–17`, `Bitácora · HU 08–11`,
`Avance · HU 05–07`, `Pago · HU 20–21`. Es traza clara sin el código suelto flotante. Si lo apruebas, lo agrego en
los `HeaderVista` de los ambientes (1 prop, ~6 líneas).

---

## 5. Bug 4 — "Autorizar = error interno" — CAUSA RAÍZ REAL (re-investigada en 4eaf044)

**No es un bug de código ni de "autorizar por concepto" (eso no existe).** El único botón es **✓ Autorizar**
(`RevisionEstimacion.jsx:735`), que autoriza la estimación **completa** vía
`POST /estimaciones-ciclo/estimacion/:id/autorizar` (`estimaciones-ciclo.controller.js:469`).

**El 500 sale del asiento automático de la nota de bitácora**, dentro de la **misma transacción** que el UPDATE de
autorización (`estimaciones-ciclo.controller.js:507-518`): inserta una nota `tipo='res_estimaciones'`. Esa clave
**SÍ existe** en el catálogo (`schema.sql:883`, `ON CONFLICT DO NOTHING`) y la columna `tipo` se migra de ENUM a
`VARCHAR(40)` + FK (`schema.sql:409-428`). **El código es correcto** — en una BD con el schema **completo**, autorizar
funciona (por eso en local "fresco" sirve).

**Por qué truena EN RENDER:** `init.js` aplica TODO `schema.sql` en **una transacción** y `server.js:90-96` hace
`process.exit(1)` si falla (no queda a medias con la app viva). El catálogo `res_estimaciones` + la migración a
VARCHAR se agregaron en el commit **`7bb1b99`** (`git log -S 'res_estimaciones'`). **Conclusión:** la BD de Render
quedó migrada por un esquema **anterior** a `7bb1b99` y un deploy posterior **no re-corrió las migraciones**
(`RUN_MIGRATIONS` apagado en ese deploy, o la transacción de migración falló y nunca se corrigió). Resultado: en
Render `bitacora_notas.tipo` sigue ENUM (o falta la fila `res_estimaciones`/la FK) → el INSERT de la nota lanza
`invalid input value for enum` / violación de FK → **ROLLBACK → 500** y la estimación **no** queda autorizada.

**Confirmar (read-only, contra RENDER — Shell del backend, sin modificar nada):**
```bash
docker logs --tail 60 sigecop_backend     # (en Render: logs del servicio) tras pulsar Autorizar → línea "[autorizarEstimacion]"
psql "$DATABASE_URL" -c "SELECT data_type, udt_name FROM information_schema.columns WHERE table_name='bitacora_notas' AND column_name='tipo';"
psql "$DATABASE_URL" -c "SELECT clave FROM bitacora_nota_tipos WHERE clave='res_estimaciones';"
psql "$DATABASE_URL" -c "SELECT conname FROM pg_constraint WHERE conname='fk_bitacora_notas_tipo';"
```
- `udt_name='tipo_nota_bitacora'` (sigue ENUM) **o** la fila `res_estimaciones` ausente **o** la FK ausente → **causa confirmada**.

**Fix (ZONA CONGELADA → Maiki, en la fase de BD, con backup):** re-aplicar el `schema.sql` idempotente a Render
(o re-desplegar con `RUN_MIGRATIONS=true`), que convierte `tipo` a VARCHAR + agrega la FK + inserta el catálogo.
Runbook: backup → `psql --single-transaction -v ON_ERROR_STOP=1` → reverificar las 3 consultas → reiniciar.
**Esto se resuelve en la misma fase de limpieza/resiembra de Render (Parte 4 del PLAN_SOLUCION).**

**Opción de blindaje de código (PROPUESTA, no aplicada — server-side):** envolver el asiento de la nota
(`estimaciones-ciclo.controller.js:507-518`) en su **propio try/catch** para que un fallo de la nota **NO** tumbe la
autorización (el comentario del código ya dice que es "no bloqueante", pero hoy **sí** bloquea por ir en la misma
transacción). `estimaciones-ciclo.controller.js` **no** está en la lista literal de archivos congelados, pero es
**lógica server-side** → **lo dejo a tu decisión** (no lo toqué).

---

## 6. 3A — Riesgo de la versión mínima (NO ejecutado; espera tu OK)

**Qué es:** un contrato **activo global** + botón "Cambiar de contrato", para no re-elegirlo en cada pantalla.

**Versión mínima propuesta (la de menor riesgo):**
- **Archivos que toca:**
  1. **NUEVO** `src/context/ContratoActivoContext.jsx` (contexto + `localStorage` + lectura/escritura de `?contrato`).
  2. `src/App.jsx` *(CONGELADO)* — **solo envolver** con el provider (1 línea, sin tocar `WithLayout`/`SoloRol`/rutas).
     ⚠️ Es el único roce con zona congelada; si prefieres cero, se monta el provider en `Layout.jsx`/`AppShell.jsx`
     (no congelados) en vez de `App.jsx`.
  3. `src/components/ui/AppShell.jsx` — selector "Cambiar de contrato" junto al chip de empresa.
  4. Las páginas adoptan el contexto **de forma opcional** (usan el global si existe; conservan su `select-contrato`
     local como respaldo).
- **¿Roza SesionContext?** **NO** — se hace con un contexto NUEVO; `SesionContext.jsx` no se edita.
- **Specs (e2e) que podrían romperse:** los que dependen de elegir contrato vía `select-contrato` en cada pantalla
  podrían encontrar el contrato **ya** seleccionado (cambia el flujo del test, no la función). Estimado: los specs
  que tocan `select-contrato` (decenas) habría que revisarlos; por eso es **versión mínima opcional** (el select
  local se conserva → menos roturas).
- **Qué puede romper a 6 días:**
  - Vistas **multi-contrato** (Portafolio/Tablero/Padrón) **no** deben filtrarse por el contrato activo → hay que
    dejar el activo **opcional** (no filtro duro). Riesgo si se implementa como filtro global.
  - Páginas con efectos de carga al cambiar de contrato (p. ej. `ConveniosModificatorios` tiene `precargaToken`
    anti-carrera) → migrarlas a fondo es lo caro/riesgoso (L). La versión mínima las deja con su selector local.
- **Recomendación:** versión mínima (contexto + selector global + `?contrato` ya centralizado) entrega ~80% del
  beneficio sin la migración masiva ni tocar `SesionContext`. **La migración a fondo + gate post-login: después de
  los 6 días.** **Espero tu OK antes de tocar nada de 3A.**

---

## 7. Checkpoints y pendientes

- **Build (`vite build`) VERDE tras cada arreglo** (8 checkpoints + el del barrido `?contrato`). Ningún arreglo dejó
  la suite de compilación roja; no hubo que revertir nada.
- **e2e Playwright:** requieren el stack (`docker compose up`) — **no** corren en CI; recomiendo un **smoke local**
  de los flujos tocados (bitácora, estimación, pago, convenio) antes de desplegar. Algunos specs referencian
  `por-firmar-count`/`link-por-firmar` (botón ✍️ retirado en FIX 8) y el badge `HU-XX` → **hay que limpiar/ajustar
  esos specs** (lo acordamos en 3B; el build no depende de ellos).
- **Decisiones pendientes (Maiki):** (a) **bug 4** → re-aplicar schema a Render en la fase de BD (+ ¿blindaje del
  controller?); (b) **3A** → OK a la versión mínima; (c) **C** → chip de rango HU por ciclo; (d) **B** → doble salto
  ambiente/pantalla y rejilla de Reportes; (e) **B5-1** → mostrar el "piso" estimado *antes* del rechazo necesita un
  endpoint backend (estimado-por-concepto) = zona congelada.
- **NO push. NO se tocó la BD. Zona congelada intacta** (excepto el diagnóstico read-only del bug 4).
