# SIGECOP — Reporte de limpieza de mantenibilidad (Fase 5 · 13-jun-2026)

> **LOCAL, sin commit/push.** Comportamiento IDÉNTICO (mismo output, mismos testids). Cada tanda se probó
> con la **suite completa** (objetivo `258 passed · 8 skipped · 0 failed`); ninguna tanda quedó roja, así
> que nada se revirtió. Verificación **adversarial** (segundo agente que intentó refutar la equivalencia):
> **EQUIVALENTE** en todo. NO se tocó zona congelada (auth, G1-G8, cálculo de carátula, `permisos.js`,
> `server.js`, `schema.sql`, triggers). **Backend NO tocado.**

---

## Micro-fase — borrado de código muerto autorizado

Borrado (re-confirmado 0 importadores antes de cada uno):
- `frontend/src/components/ui/Card.jsx`, `Badge.jsx`, `CardCriterioAceptacion.jsx` (componentes huérfanos del reskin UI-1, sin importadores).
- Wrapper `api.health` en `frontend/src/services/api.js` (sin caller; el endpoint `/api/health` server-side NO se tocó).

`BadgeSprint.jsx` **conservado** (stub de compatibilidad intencional). **Suite: 258/8/0.** ✅

---

## Tanda 1 — DRY de formato de moneda

**Nuevo:** `frontend/src/utils/formato.js` con `fmtMXN` (Intl es-MX, MXN, 2 decimales) y
`monedaMXN = (n) => fmtMXN.format(Number(n) || 0)`.

**Migrados (eliminado el `const fmtMXN`+`const moneda` local, byte-idéntico):**
`EnvioEstimacion.jsx`, `HistorialEstimaciones.jsx`, `IntegracionEstimacion.jsx`, `RevisionEstimacion.jsx`
(via `import { monedaMXN as moneda }` → los call sites `moneda(...)` quedan iguales) +
`EditorProgramaConvenio.jsx` (via `import { fmtMXN }`, usa `.format()` directo).

**Por qué es equivalente:** las 5 copias usaban EXACTAMENTE el mismo `Intl.NumberFormat('es-MX', {style:
'currency', currency:'MXN', minimumFractionDigits:2, maximumFractionDigits:2})` y el mismo `Number(n)||0`.
Un `Intl.NumberFormat` es stateless para formatear → compartir la instancia da el mismo string.

**NO tocadas (formatos DISTINTOS, a propósito):** `TableroEstimaciones`/`TransitoPago` (`$ `+`en-US`, con
espacio), `ConveniosModificatorios` (`moneda` con guard `'—'`), `AperturaBitacora` (`formatoMXN` sin
`minimumFractionDigits`), `ConsultaExpediente`/`RegistroFianzas` (custom). **Suite: 258/8/0.** ✅

---

## Tanda 2 — DRY de fecha+hora corta

**Añadido a** `utils/formato.js`: `fechaHora = (s) => (s ? new Date(s).toLocaleString('es-MX', {dateStyle:
'short', timeStyle:'short'}) : '')`.

**Migrados (byte-idénticos):** `AperturaBitacora.jsx`, `EmisionNotas.jsx`, `PorFirmar.jsx` (pages) y
`components/notas/BuscadorNotas.jsx`.

**Por qué es equivalente:** las 4 copias eran idénticas (`dateStyle/timeStyle: 'short'`, fallback `''`); solo
cambiaba el nombre del parámetro (`s`/`f`), irrelevante.

**NO tocadas (variantes distintas):** `IntegracionEstimacion` (`fechaHora` con fallback `'—'`),
`DocumentoNota` (`dateStyle:'long'`), `EnvioEstimacion`/`RevisionEstimacion` (`fechaHoraMX`, otra impl),
`ConveniosModificatorios`/`TransitoPago` (multi-línea). **Suite: 258/8/0.** ✅

---

## Verificación adversarial (segundo agente)

Un agente independiente leyó el `git diff` completo e intentó **refutar** la equivalencia. Veredicto:
**EQUIVALENTE** en ambas tandas. Confirmó: (a) opciones de Intl byte-idénticas; (b) cero referencias rotas a
`fmtMXN` tras quitar el const local; (c) las variantes distintas siguen **locales e intactas** (riesgo
principal bien manejado); (d) call sites preservados por el alias `monedaMXN as moneda`; (e) rutas relativas
correctas (`../utils` en pages, `../../utils` en components), sin dobles declaraciones.

---

## Archivos tocados (sin commit)
**Nuevo:** `frontend/src/utils/formato.js`. **Modificados:** `EnvioEstimacion`, `HistorialEstimaciones`,
`IntegracionEstimacion`, `RevisionEstimacion`, `AperturaBitacora`, `EmisionNotas`, `PorFirmar`,
`EditorProgramaConvenio`, `BuscadorNotas`, `services/api.js`. **Borrados:** `ui/Card.jsx`, `ui/Badge.jsx`,
`ui/CardCriterioAceptacion.jsx`. **Cero backend / schema / permisos / server / cálculos / queries / testids.**

---

## Refactors MAYORES recomendados (para DESPUÉS de la entrega/demo)

> No se hicieron ahora por riesgo (cambian salida que la suite asercióna, o necesitan herramienta). Hacerlos
> tras la demo, incrementales, con la suite como red.

1. **Unificar monedas de formatos DISTINTOS** (cambia strings que la suite verifica → requiere actualizar
   specs): decidir UN formato canónico y migrar `TableroEstimaciones`/`TransitoPago` (`$ `+en-US),
   `ConveniosModificatorios` (guard `'—'`), `AperturaBitacora` (`formatoMXN`), `ConsultaExpediente`,
   `RegistroFianzas`. Parametrizar el fallback (`'—'` vs `''`/`'$0.00'`).
2. **Más helpers de fecha:** `fechaMX` (dd/mm/aaaa) en `HistorialEstimaciones`/`IntegracionEstimacion`/
   `ConveniosModificatorios`/`TrabajosTerminados`/`RosterContrato`; `soloFecha` (slice 0,10) en varias;
   `dISO`/`hoyISO` duplicados en `CurvaAvance`/`reportesContrato`; `fechaHoraMX`. Verificar byte-identidad
   caso por caso; algunos difieren en fallback y cambiarían salida.
3. **`round2`/`r2`** (redondeo a 2 decimales con EPSILON) duplicado en `EditorProgramaConvenio`,
   `IntegracionEstimacion`, `reportesContrato` → extraer a `utils/formato.js`. *(OJO: es redondeo de
   PRESENTACIÓN/preview; no tocar el cálculo server-side de la carátula.)*
4. **Añadir ESLint** (no está configurado): con `no-unused-vars` se podrían quitar imports/vars muertos de
   forma fiable. Hoy NO se hizo barrido amplio de imports sin usar por ese motivo (riesgo de error manual).
5. **Componentes casi-duplicados:** revisar si `BannerContexto` / `BannerSoloConsulta` / `AvisoSoloLectura`
   se pueden unificar (requiere análisis de comportamiento; NO trivial).
6. **Backend (con cuidado, idealmente con tests unitarios):** extraer helpers locales repetidos en
   controllers solo si son trivialmente equivalentes. **No** tocar queries/validaciones/cálculos/flujo.

> **Estado final de la suite: 258 passed · 8 skipped · 0 failed.** Sin commit, sin push.
