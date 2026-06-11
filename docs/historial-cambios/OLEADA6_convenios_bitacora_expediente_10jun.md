# Oleada O6 — Convenios visibles en bitácora y expediente — 10 jun 2026

> Hallazgo del equipo (W11), consistente con el patrón del sistema: la sustitución de personas (Pase 2.3)
> y el avance (O4) ya asientan su nota en la bitácora; el **convenio modificatorio** también es un hecho
> relevante (art. 123 fr. III RLOPSRM) y faltaba. **LOCAL, sin commit/push**, sobre `main` (con
> O1+UI+O2+O3+O4+O5 integrados). Componentes guinda (UI-1). **NO se tocó `permisos.js`, `server.js`,
> G1-G8 ni la inmutabilidad de bitácora/firmas.**

## ¿Hubo DDL? SÍ (aditivo + una transición controlada del trigger)

A diferencia de O4/O5 (sin DDL), O6 **sí** tiene DDL porque `convenios_modificatorios` **no** tenía
`nota_id` y su trigger de inmutabilidad **bloqueaba TODO `UPDATE`**. Cambios en `schema.sql` (aditivos,
idempotentes; ya aplicados a la BD local con psql — `init` está gateado por `RUN_MIGRATIONS`):

1. `ALTER TABLE convenios_modificatorios ADD COLUMN IF NOT EXISTS nota_id INTEGER REFERENCES bitacora_notas(id) ON DELETE NO ACTION;` + `CREATE INDEX IF NOT EXISTS idx_convenios_nota`. (`NO ACTION` = mismo idioma que `concepto_avance.nota_id`: la nota es inmutable, solo muere por la cascada del contrato.)
2. **Reescritura del trigger `sigecop_convenio_inmutable`**: antes lanzaba excepción ante CUALQUIER `UPDATE`; ahora **congela toda la identidad** (enumera todas las columnas) y permite **SOLO** ligar la nota una vez (`nota_id NULL→valor`). Es el mismo patrón de transición controlada de `programa_version` (que permite `vigente true→false`). Cualquier otro `UPDATE` (incluido re-ligar una nota ya puesta) sigue rechazándose.

**Por qué la transición es necesaria:** el caso EN VIVO crea la nota **antes** del `INSERT` y la liga en el propio `INSERT` (sin `UPDATE`, no toca el trigger). Pero el caso DIFERIDO (convenio registrado sin bitácora) liga la nota **después**, al abrir la bitácora → necesita un `UPDATE nota_id`, que sin esta transición el trigger vetaría.

## El cambio (patrón Pase 2.3 / O4, ya probado dos veces)

Registrar un convenio (de cualquier tipo: monto / plazo / programa / mixto) asienta una **nota automática**
de bitácora y la liga al convenio:

| | EN VIVO (hay bitácora) | DIFERIDO (no hay bitácora) |
|---|---|---|
| Cuándo se crea la nota | en el mismo `crearConvenio`, ANTES del `INSERT` | en `abrirBitacora` (drain), TRAS la nota #1 |
| `nota_id` del convenio | ligado en el `INSERT` (sin `UPDATE`) | `NULL` al registrar → `UPDATE` al abrir (transición permitida) |
| Respuesta de `POST /convenios` | `nota:{…}`, `nota_diferida:false` | `nota:null`, `nota_diferida:true`, `aviso:…` |

Texto de la nota (tipo `res_convenios` del catálogo art. 125 fr. I — ya existía; `tag='convenio'`):
*"Convenio modificatorio {folio}: {tipo}; variación {x}% sobre {monto|plazo}. Motivo: {motivo}."* El `{x}%`
se reporta según el tipo (monto/programa/mixto → monto; plazo/mixto → plazo). DIFERIDO añade *"Registrado
antes de abrir la bitácora; asentado al abrirla."*

### Backend (controllers de dominio — NO zona congelada)
- `bitacora.controller.js`: `textoNotaConvenio({folio,tipo,deltaMontoPct,deltaPlazoPct,motivo,diferida})` (exportado) + **drain** de convenios pendientes (`nota_id IS NULL`) en `abrirBitacora`, tras los de sustitución/avance. El `UPDATE nota_id` es la transición que el trigger permite.
- `convenios.controller.js`: en `crearConvenio`, si hay bitácora abierta se crea la nota (`insertarNotaAtomica`, folio atómico) **antes** del `INSERT` y se liga (`nota_id`); si no, se difiere. La respuesta incluye `nota`/`nota_diferida`/`aviso`. Todo en la MISMA transacción (si el re-cuadre del programa falla, también revierte la nota). **art. 118, guardrail, versionado y cuadre 100% intactos.**

### Frontend (componentes guinda UI-1)
- `ConsultaExpediente.jsx` (HU-04): bloque nuevo **"Convenios modificatorios"** (icono 📝) — historial **inmutable** (N.º/folio, tipo, cambio monto/plazo, motivo, fecha) + **estado de bitácora** por convenio (📝 asentada / pendiente al abrir, espejo del bloque Roster) + **link a las versiones** del programa (`/contratos/modificatorios?contrato=ID`, donde vive el visor de snapshots). Buscable. Carga vía `api.convenios` (mismo endpoint que HU-03; el `nota_id` viaja en `cm.*`).
- `ConveniosModificatorios.jsx` (HU-03): preselect `?contrato=` (para el link del expediente) + el toast de registro menciona la nota (asentada #N / diferida).

## Tests (lección 7)
- **Nuevo `o6-convenios-bitacora.spec.js` (7)**: EN VIVO (nota asentada + ligada) · DIFERIDO (nota_diferida → al abrir se asienta sola + se liga; valida la redacción completa "Registrado antes de abrir… asentado al abrirla") · **INMUTABILIDAD** reforzada (editar el motivo → trigger RECHAZA con mensaje "inalterable" Y el valor no cambió; re-ligar/desligar `nota_id` ya puesto → RECHAZA "inmutable") · **MIXTO** (la nota reporta monto% Y plazo%) · EXPEDIENTE (convenio + estado de bitácora + href del link a versiones) · EXPEDIENTE transición (pendiente → **asentada** tras abrir la bitácora, recargando la vista) · expediente sin convenios (bloque vacío).
- **`hu-03-convenios.spec.js` SIN cambios**: sigue verde (el seed SMOKE-HU03-001 no tiene bitácora → las notas se difieren, sin afectar sus asserts).
- **`hu-04-consulta-expediente.spec.js` SIN cambios**: sigue verde (no cuenta bloques exactos; el bloque 8 nuevo no rompe).
- Smoke de API (script efímero) verde (en vivo + diferido + ligado).
- **Suite completa: 239 passed · 8 skipped · 0 failed** (9.0 min, con la BD de prueba saneada). `vite build` ✓.

## Revisión adversarial (4 lentes) + higiene de la BD de prueba
- Workflow de revisión por lentes: **inmutabilidad/trigger ✓** (enumera las 17 columnas, deja fuera solo `nota_id`, permite NULL→valor una vez, DELETE intacto), **seguridad ✓** (emisor del JWT, acotamiento intacto). El "doble-asiento" marcado ALTA fue **falso positivo**: el drain corre dentro del `BEGIN/COMMIT` de `abrirBitacora` (atómico) y la apertura es única → si el UPDATE falla, todo revierte. Se **incorporaron** los huecos de cobertura reales que halló la lente de specs (inmutabilidad ambigua, falta de prueba de re-ligado, MIXTO, transición en el expediente).
- **Higiene de datos de prueba (no es de O6):** la primera corrida completa marcó 2 fallos (`detalle-indicador-atraso:77`, `plan2-programa-mes-por-mes:93`). Causa raíz: la BD local había acumulado **~1729 contratos** de cientos de corridas e2e; la lista "Registrados" (sin paginar) renderiza todos → DOM de 20k+ líneas → los `await` de 5s expiran. **La API es rápida** (resumen 51ms, alertas 9ms): no es backend ni O6 (esos specs no tocan código O6). Se hizo `TRUNCATE contratos CASCADE` (conserva usuarios/empresas/catálogos; los specs auto-siembran lo que necesitan) → los 2 specs pasan 7/7. Observación para seguimiento (fuera de O6): las listas del front no paginan.

## Runbook de integración (Maiki)
1. **HAY migración** (a diferencia de O4/O5). Runbook de despliegue con esquema:
   - backup → aplicar el bloque O6 de `schema.sql` con `psql --single-transaction -v ON_ERROR_STOP=1` (es idempotente: `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`).
   - verificar el código viejo sobre el esquema nuevo (la columna es nullable, FK opcional → no rompe lecturas previas) → `docker restart sigecop_backend` → push.
2. Smoke: registrar un convenio con bitácora abierta (la nota aparece) y sin bitácora (queda diferido; al abrir la bitácora se asienta). Ver el convenio en el expediente (HU-04).
3. **Para el profe**: el convenio queda asentado en la bitácora como los demás hechos. Pendientes `[validar]`: (a) emisor de la nota del convenio (quien registra, del JWT, vs. el residente formal); (b) en MIXTO la nota reporta monto Y plazo — confirmar redacción.

## Archivos tocados
Backend: `schema.sql` (**DDL**: `nota_id` + índice + trigger con transición), `convenios.controller.js`, `bitacora.controller.js` (`textoNotaConvenio` + drain + export). Frontend: `ConsultaExpediente.jsx` (bloque convenios), `ConveniosModificatorios.jsx` (`?contrato=` + toast). Test: `o6-convenios-bitacora.spec.js` (nuevo). **DDL: sí.**
