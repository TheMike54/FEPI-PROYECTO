# Regresión gating del alta — diagnóstico + endurecimiento + test que faltaba — Entregable para Maiki

**Fecha:** 2026-06-03 · **Autor:** Claude Code (Fundación) · **Base:** `0853e0c`. **Disciplina:** probado en
LOCAL; **sin commit/push/deploy, `main` intacto**. Lo no determinable, `[no determinable]`.

> **Patch incremental:** `docs/REGRESION_gating_alta_DIFFS.patch` (2 archivos; `git apply -R --check` limpio).

---

## 1. Diagnóstico de la causa raíz (honesto)

**No pude reproducir el síntoma exacto** ("Siguiente hasta Guardar con todo vacío") en el código commiteado
`0853e0c`. Evidencia, no opinión:

1. **El commit del Bug 1 (`0853e0c`) es GATING-NEUTRAL.** El `git diff 7bb1b99..0853e0c` de `AltaContrato.jsx`
   NO toca `irAPaso`, `validarPaso`, `pasoMaxAlcanzado`, `primerPasoInvalido`/`fronteraAccesible`/`tabsBloqueados`,
   ni el `onClick` de "Siguiente" (todos byte-idénticos a alta-v4). Solo cambió: el guardado exitoso
   (resetFormulario + redirigir a Registrados), `handleCancelar` (usa resetFormulario), y la barra de botones
   (quitó "Ver registrados →"). Ninguno toca el avance.
2. **Barrido empírico (logs reales del navegador):**
   - *Fresh, TODO vacío*, "Siguiente" ×7 → se queda en **"Datos generales"**; "Guardar" nunca aparece.
   - *Solo paso 1 lleno*, "Siguiente" ×7 → avanza **un** paso a **"Catálogo de conceptos"** y se queda ahí (sin
     concepto); "Guardar" nunca aparece.
   - *Tras guardar* → alta nueva → "Siguiente" vacío → gateado igual.
   El gating de "Siguiente" (validar el paso actual antes de avanzar; cada paso desbloquea solo el siguiente;
   nunca se llega a "Guardar" vacío) **está intacto**.

**Causa raíz del REPORTE (no del código fuente):** lo más probable es **estado servido obsoleto** (bundle/HMR
o caché del navegador, o un build viejo) cuando se probó: el código commiteado gatea correctamente. Si el
síntoma persiste con `0853e0c` recién levantado (hard-refresh / rebuild), necesito la **secuencia exacta +
consola**, porque los tests de abajo demuestran que el avance está bloqueado.

### Fragilidad LATENTE que sí introdujo el Bug 1 (y que endurecí)
Aunque no es explotable hoy, el Bug 1 dejó un estado **inconsistente**: al guardar hace `setTabActivo(6)`
(Registrados) con `pasoMaxAlcanzado = 0` → queda **`tabActivo (6) > pasoMaxAlcanzado (0)`**. En ese estado, la
rama "adelante" de `irAPaso` calcularía `destino = min(target, pasoMaxAlcanzado+1) ≤ tabActivo`, dejando el
loop de validación `for (p = tabActivo; p < destino)` **VACÍO** → avanzaría **sin validar**. Hoy NO se dispara
porque la pestaña Registrados no tiene botón "Siguiente"; pero es exactamente el tipo de hueco que rompería el
gating ante cualquier cambio futuro. **Es la causa raíz plausible de un avance-sin-validar.**

---

## 2. Arreglo (de raíz, defensivo)

En `irAPaso`, antes de calcular `destino`, se valida **explícitamente el paso ACTUAL**: si no es válido, NO se
avanza (se muestra el banner y se queda). Esto cierra el hueco del "loop vacío" sin importar la relación entre
`tabActivo` y `pasoMaxAlcanzado`, y hace el invariante **explícito** (inmune a futuros cambios de `destino`):

```js
const irAPaso = (target) => {
  if (target > ULTIMO_PASO_WIZARD) { setTabActivo(target); return; } // Registrados (libre)
  if (target <= tabActivo) { setTabActivo(target); return; }          // atrás (libre)
  const vActual = validarPaso(tabActivo);                             // ← DEFENSA EXPLÍCITA
  if (!vActual.ok) { setErrores(vActual.errores); setTabActivo(tabActivo); setErrorWizard(vActual.msg); return; }
  const destino = Math.min(target, pasoMaxAlcanzado + 1);
  for (let p = tabActivo; p < destino; p++) { /* …valida el prefijo… */ }
  ...
};
```
**Comportamiento-neutral en los flujos alcanzables** (cuando `tabActivo ≤ pasoMaxAlcanzado`, este check equivale
a la 1ª iteración del loop existente → mismo banner, mismo "no avanza"); solo AÑADE protección en el caso
`tabActivo > pasoMaxAlcanzado`. No cambié la lógica de `destino`/loop/affordance (cambiarla sin reproducir el
síntoma arriesgaría romper un gating correcto — disciplina Nivel 1).

---

## 3. El test que FALTABA (y por qué el anterior no agarró la regresión)

**Por qué el test anterior no la habría agarrado:** el único test que clicaba "Siguiente" en el paso vacío era
`4x-alta-correcciones.spec.js:1.1/1.3`, que hace **UN** clic y solo asercta que **aparece el banner** y que hay
**alguna pestaña bloqueada**. NO verifica que **se quede** en el paso 1 tras clics REPETIDOS, ni que **"Guardar"
nunca aparezca**. Una regresión donde "Siguiente" repetido avanzara se colaría con el banner del primer clic.

**Test nuevo** `frontend/e2e/alta-gating-regresion.spec.js` (3 escenarios, todos asertan que **NUNCA** aparece
`btn-guardar` con campos vacíos):
1. *Fresh, TODO vacío:* "Siguiente" ×8 → sigue en "Datos generales" (`dg-folio` visible) + banner + pestañas
   bloqueadas + sin "Guardar".
2. *Tras guardar y empezar alta nueva:* "Siguiente" ×8 → folio vacío + sin "Guardar" (cubre el path del Bug 1).
3. *Solo paso 1 lleno:* "Siguiente" ×8 → avanza un paso a "Catálogo" y se queda (cada paso desbloquea solo el
   siguiente) + sin "Guardar".

---

## 4. Verificación

| | Resultado |
|---|---|
| `vite build` | ✅ EXIT 0 |
| Test de regresión nuevo | ✅ **3/3** |
| Specs de alta (regresión + 4x + hu-01 + alta-v4) | ✅ **16/16** |
| **Suite e2e completa** | ✅ **141 passed · 8 skipped (los 8 fixme, sin empeorar) · 0 failed** (baseline 138 → +3 tests nuevos) |
| **Bug 1 intacto** | ✅ `hu-01:"BUG 1 — guardar: redirige a Registrados, limpia y re-bloquea"` y `alta-v4 (a2)` verdes |

---

## 5. Archivos tocados (2)
- `frontend/src/pages/AltaContrato.jsx` — defensa explícita del paso actual en `irAPaso` (+7 líneas; sin tocar `destino`/loop/affordance).
- `frontend/e2e/alta-gating-regresion.spec.js` — **nuevo**, el test que faltaba (3 escenarios).

**NO se tocó:** validarPaso, pasoMaxAlcanzado, tabsBloqueados, login/permisos/contrato/A2/estimación/bitácora, ni las 15 HU prototipo.

`[no determinable]`: la causa del síntoma observado por Maiki si NO era estado obsoleto — el código commiteado gatea (probado). Comparte la secuencia exacta + consola si reaparece con `0853e0c` recién levantado.

*Fin. Patch: `docs/REGRESION_gating_alta_DIFFS.patch`. Probado local: build OK, regresión 3/3, suite 141/8-skip/0-fail. `main` en `0853e0c`, sin commit.*
