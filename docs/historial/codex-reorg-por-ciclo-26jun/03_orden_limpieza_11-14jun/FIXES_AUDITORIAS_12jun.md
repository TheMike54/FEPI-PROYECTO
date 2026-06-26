# SIGECOP — Fixes chicos y seguros de las auditorías (12-jun-2026)

> Arreglos puntuales surgidos de la sesión de auditoría 11-12 jun (`REPORTE_SESION_ORDEN_11jun.md` §8).
> **LOCAL, sin commit/push**, sobre `main` (`4f8430d`). **No se tocó lógica de negocio** (G1-G8, cálculos,
> `permisos.js`, `server.js`, `schema.sql`, controllers de estimación/contratos). Solo specs, un seed nuevo
> y normalización de un input de frontend. Suite final: **258 passed / 8 skipped / 0 failed**.

---

## 1. Test frágil `hu-17-tablero.spec.js:66` — acotado

**Problema:** el assert del contador `contador-estado-rechazada` usaba `toContainText('1')`, pero esa
métrica es **global al residente** (cuenta las rechazadas de TODOS sus contratos). Cualquier rechazada
acumulada en la BD de prueba lo rompía (de hecho, en la sesión previa mostró `6`).

**Fix (solo spec):** se reemplazó por una validación numérica **`>= 1`** (la rechazada que siembra el
propio test), robusta a datos acumulados. La exclusión de la rechazada del grid (CA-1) ya la cubre el
assert `card(5).toHaveCount(0)` justo arriba, así que no se pierde cobertura.

```js
const txtRechazadas = (await page.getByTestId('contador-estado-rechazada').textContent()) ?? '';
const nRechazadas = Number((txtRechazadas.match(/\d+/) ?? ['0'])[0]);
expect(nRechazadas, 'al menos la rechazada sembrada').toBeGreaterThanOrEqual(1);
```

**Verificado en los dos escenarios (lo pidió Maiki):**
- **BD fresca** (0 rechazadas stray): `hu-17` 7/7 ✅.
- **BD acumulada** (sembré 3 rechazadas stray del residente → contador ≈4): `hu-17:66` ✅ (con el assert
  viejo habría fallado, "4" no contiene "1").

## 2. Higiene de seeds — `o7-flujo` ahora limpia en `afterAll`

**Problema:** `o7-flujo-estimacion.spec.js` crea en cada test un contrato `E2E-RECON-<ts>-<rand>` (uno con
estimación `rechazada`) vía API REAL, y **no limpiaba**. Como estimaciones/pagos son append-only, la BD
acumulaba contratos y rechazadas entre corridas (causa raíz del fallo de HU-17 en la sesión previa).

**Fix (solo specs/seeds):**
- Nuevo `backend/scripts/unseed_o7_recon.sql` que revierte los `E2E-RECON-%` en el **orden correcto de FKs**
  (descubierto al probarlo): `pagos` → `estimaciones` → `contratos`. (Un DELETE directo del contrato falla:
  `pagos.estimacion_id` y `estimacion_generadores.contrato_concepto_id` son `ON DELETE NO ACTION`.)
- `test.afterAll(() => runSql('unseed_o7_recon.sql'))` en `o7-flujo`, con el mismo helper `runSql` que ya
  usan `hu-14`/`hu-17`.

**Verificado:** `o7-flujo` 5/5 ✅ y tras el `afterAll` quedan **0** contratos `E2E-RECON` (antes se
acumulaban). Los triggers de inmutabilidad son `BEFORE UPDATE` (no bloquean el DELETE).

**`hu-15-revision`: NO requiere cambio.** Aunque la auditoría lo listó, su única mención de "rechazar" es
un **comentario** (L7): el spec cubre solo la capa de acceso/carga sin seed y **no crea ninguna rechazada**.

## 3. Normalización de email en login (frontend) — corregido

**Problema (auditoría HU-00 §8.2):** el registro guarda el correo en minúsculas (server-side), pero el
login lo comparaba **tal cual se teclea** → quien se registró como `Maiki@x.com` no entraba con
`maiki@x.com`.

**Fix (solo frontend, `SeleccionRol.jsx`; NO se tocó `auth.controller`):** el input se normaliza a
**minúsculas + trim** antes de mandarse, en login (`login(email.trim().toLowerCase(), …)`) y —por simetría—
en el registro (el backend ya lo normalizaba, ahora cliente y servidor coinciden).

**Verificado:** `vite build` ✅; las cuentas demo de la suite son minúsculas, así que no hay regresión.

## 4. Scratch de la raíz — ya limpio

Los `.tmp_*.cjs` / `.work_*` de auditorías previas **ya se habían eliminado** y el commit `4f8430d` incluyó
los patrones `.tmp_*` / `.work_*` en `.gitignore`. Verificado: no quedan scratch sueltos.

---

## Archivos tocados (sin commit)

| Archivo | Tipo |
|---|---|
| `frontend/e2e/hu-17-tablero.spec.js` | spec (assert `>= 1`) |
| `frontend/e2e/o7-flujo-estimacion.spec.js` | spec (import helper + `afterAll`) |
| `backend/scripts/unseed_o7_recon.sql` | **nuevo** seed de limpieza (no es producción) |
| `frontend/src/pages/SeleccionRol.jsx` | frontend (normaliza email; NO toca auth) |

**Cero** cambios en controllers, `schema.sql`, `server.js`, `permisos.js`, cálculos o lógica de negocio.

## Pendientes que NO hice (requieren tu decisión / tocan producción)

- **Acotar la métrica del contador a nivel contrato** en el backend del tablero: sería lo "ideal" pero toca
  el controller de tablero (producción). El fix de spec (`>= 1`) basta para la robustez; si quieres la
  métrica por-contrato, es una mejora de E3.
- **Endurecer el login server-side** (que `auth.controller` también haga `lower(email)` en la consulta):
  no lo toqué (es backend de auth). El fix de frontend resuelve el caso de uso; el server-side queda como
  recomendación por si entran cuentas por otra vía (API directa).
- **Higiene de otros specs**: revisé todos los que tocan `rechazada` (`hu-14` ya limpia, `hu-17` ya limpia,
  `hu-15` no crea, `o7-flujo` ahora limpia). No encontré otros acumuladores de rechazadas.
