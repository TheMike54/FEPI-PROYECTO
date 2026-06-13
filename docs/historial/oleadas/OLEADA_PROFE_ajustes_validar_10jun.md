# Oleada O-PROFE — ajustes de las respuestas del profe a los `[validar]` — 10 jun 2026

> **LOCAL, sin commit/push**, sobre `main` (con O1..O7). Componentes guinda (UI-1). Cuatro ajustes que
> aterrizan las decisiones del profe. **NO se tocó** `server.js`, la lógica de cálculo de carátula (G1-G8),
> ni el candado del art. 118.

## ¿Hubo DDL? **SÍ — uno** (item 3, el tipo de nota 'atraso'). Los demás items NO son DDL.
`INSERT` aditivo e idempotente en `bitacora_nota_tipos` (`ON CONFLICT (clave) DO NOTHING`). Requiere migrar
la BD de Render (runbook abajo). Los items 1, 2 y 4 son lógica/etiquetas/cita, sin cambio de esquema.

## 1) Emisor de notas: las de CONSECUENCIA las avala el RESIDENTE (art. 53)
El profe: las notas con consecuencia económica/contractual (**atraso**, **convenio**) las debe emitir/avalar el
**residente del contrato** (art. 53 LOPSRM), no quien dispara la acción. Las de **HECHO** (sustitución, avance)
se quedan firmadas por quien las hizo.

| Nota | Antes (emisor) | Después (emisor) |
|---|---|---|
| **Atraso** (`asentarAtraso`, O5) | `req.user.id` (quien asienta) | **`residente_id` del contrato** |
| **Convenio** (live, `crearConvenio`, O6) | `req.user.id` (puede ser dependencia) | **`residente_id` del contrato** |
| **Convenio** (diferido, drain en `abrirBitacora`) | `req.user.id` | **`residente_id` del contrato** |
| Sustitución / Avance (de HECHO) | `req.user.id` | **`req.user.id`** (sin cambio) |

Fallback defensivo `residente_id || req.user.id` (un contrato siempre tiene residente). **Smoke confirmado:** un
convenio creado por **dependencia** asienta la nota con emisor = **residente**.

## 2) Avance que excede el periodo: de BLOQUEO a AVISO
El profe: adelantar avance a **precios pactados NO requiere convenio**. El sistema **avisa pero deja registrar**.
**Solo BLOQUEA** el art. 118 (acumulado > **monto del contrato**, ya existía) o introducir **conceptos fuera de
catálogo** (imposible en avance: el avance siempre es de un concepto del catálogo).

- `trabajos.controller`: `validarProgramaPeriodo` devuelve `{ aviso }` (antes `{ error }`); `registrarAvance`
  (POST) y `actualizarAvance` (PATCH) **ya no hacen ROLLBACK+409** por programa: registran y devuelven
  `aviso_programa` en la respuesta. El **art. 118 sigue bloqueando** (409) en ambos. Mensajes sin "requiere convenio".
- `TrabajosTerminados.jsx`: el botón **ya no se deshabilita** por `noProgramado`/`excedePeriodo` (solo por
  `excede118`); los avisos pasaron de rojo ⛔ a **ámbar ⚠ no bloqueante** ("verificar monto/conceptos nuevos. Se
  puede registrar"); el toast muestra el `aviso_programa` del backend.

## 3) Tipo de nota propio `atraso` (DDL)
El profe: la nota de atraso debe tener **tipo propio** en el catálogo, no `'otro'`+tag. Se agregó `'atraso'` a
`bitacora_nota_tipos` (etiqueta "Atraso de obra respecto del programa de ejecución", `rol_emisor` **residente**,
art. 125 fr. I). `asentarAtraso` pasó de `tipo:'otro'` a `tipo:'atraso'` (conserva `tag:'atraso'` para búsqueda).

## 4) Corrección legal: amortización del anticipo = art. 138 RLOPSRM (no 143)
Sweep `art. 143`→`art. 138` en **código, specs y docs** (incluye el mensaje de error del plan de amortización en
`contratos.controller` y el badge de la carátula en `IntegracionEstimacion`). Se excluyeron `frontend/dist/`
(artefacto de build) y `render_backup_*.sql` (dumps). **Verificación: cero `art. 143` restantes** en fuentes.
- **Ojo `[validar profe]`:** las **penas por atraso** ya citaban **art. 138/139 RLOPSRM** (pre-existente, NO se
  tocó). Ahora la amortización (138) y las penas (138/139) comparten el "138" — conviene confirmar que no se
  solapan en el reglamento (la amortización podría ser una fracción específica del 138). Trabajamos con **ley
  reformada (abril 2025) + reglamento viejo**; el reglamento aplica solo en lo que no se oponga a la ley.

## Tests (lección 7)
- **`o4-avance-periodo.spec.js`** reescrito: el avance que excede el periodo → **201 + `aviso_programa`** (no 409);
  concepto no programado → 201 + aviso; **nuevo test: el art. 118 SIGUE bloqueando** (1100 > 1000 contratado → 409);
  el convenio que amplía el periodo → el avance siguiente **ya no lleva aviso**.
- **`o2-plan-amortizacion.spec.js`**: la aserción del error pasó a `toContain('138')`.
- **Sin cambios y verdes**: `hu-07-alertas-atraso` (emisor/tipo), `hu-06-trabajos-terminados`, `o6-convenios-bitacora`,
  `hu-03-convenios`, `detalle-indicador-atraso`, `estimacion-pantalla-unica`.
- **Nuevo test PATCH**: editar un avance a una cantidad que excede el periodo → 200 + `aviso_programa` (no bloquea).
- **Suite completa: 252 passed · 8 skipped · 0 failed.** `vite build` ✓.

## Revisión adversarial (3 lentes) + correcciones
- **Backend del avance SEGURO**: `validarProgramaPeriodo` no bloquea (devuelve `{aviso}`), el **art. 118 sigue
  bloqueando 409** en POST y PATCH. **Cita 143→138 limpia**: cero `art. 143` activos; las penas siguen en 138/139.
- Correcciones aplicadas: (1) comentarios obsoletos que aún decían "BLOQUEA" para el periodo → "AVISA" (header de
  `trabajos.controller`, su comentario del POST, y `api.js`); (2) **`guardarEdicion` (PATCH) ahora muestra el
  `aviso_programa`** en el toast (antes solo el POST); (3) test e2e del PATCH con aviso.
- **`[validar]` (declinado por alcance):** la revisión señaló que las notas DIFERIDAS de **avance** y **sustitución**
  (las que se asientan al abrir la bitácora) usan como emisor a **quien abre la bitácora** (el residente), no a
  `registrado_por` (el actor original). Como pediste que las notas de **HECHO** "se quedan igual", **no lo cambié**;
  además, por art. 125 la sustitución es nota de residente y el tipo `avance` es de supervisión (terreno legal
  Nivel-1). Queda anotado para que tú/el profe decidan si el emisor de la nota diferida de hecho debe ser el actor original.

## Runbook de integración (Maiki) — **con migración (item 3)**
1. **Migrar la BD** (el tipo 'atraso' es DDL). Render: backup → aplicar el `INSERT ... ON CONFLICT DO NOTHING`
   de `bitacora_nota_tipos` (o re-correr `init.js` con `RUN_MIGRATIONS`, que ejecuta `schema.sql` idempotente).
   Local ya aplicado por psql. Probar 2-3× (idempotente).
2. `docker restart sigecop_backend` (cambiaron `alertas`, `convenios`, `bitacora`, `trabajos`). Frontend recarga con Vite.
3. Smoke: registrar un avance que exceda el periodo → se registra con aviso (no bloquea); art. 118 sigue bloqueando.
   Crear un convenio como dependencia → la nota de bitácora sale con emisor = residente. Asentar atraso → tipo 'atraso'.
4. **Para el profe** `[validar]`: (a) ¿la amortización (138) y las penas por atraso (138/139) se solapan en el
   reglamento viejo, o son fracciones distintas?; (b) confirmar el texto literal del art. 138 (amortización proporcional).

## Archivos tocados
Backend: `alertas.controller.js`, `convenios.controller.js`, `bitacora.controller.js`, `trabajos.controller.js`,
`db/schema.sql` (**DDL** tipo 'atraso' + cita), y por la cita 143→138: `contratos.controller.js`,
`estimaciones.controller.js`, `programa.controller.js`. Frontend: `pages/TrabajosTerminados.jsx`, y por la cita:
`pages/IntegracionEstimacion.jsx`, `pages/AltaContrato.jsx`, `pages/ConsultaExpediente.jsx`. Tests:
`o4-avance-periodo.spec.js` (reescrito), `o2-plan-amortizacion.spec.js` + comentario en `estimacion-pantalla-unica.spec.js`.
Docs: sweep 143→138 en ~15 archivos de `docs/` + `CLAUDE.md` (+ `.patch` históricos). **DDL: 1 (tipo 'atraso').**
