# Bugfix — alta-v4 reset + nota "firmada" + etiqueta — Entregable para Maiki

**Fecha:** 2026-06-03 · **Autor:** Claude Code (Fundación) · **Para revisión de:** Maiki (integrador).
**Base:** `7bb1b99` (alta-v4 + bitácora-v2 ya en main). **Disciplina / Nivel 1:** probado en LOCAL; **sin
commit/push/deploy, `main` intacto**. Lo interpretativo `[validar]`, lo no determinable `[no determinable]`.

> **Patch incremental:** `docs/BUGFIX_alta_bitacora_DIFFS.patch` (8 archivos; `git apply -R --check` limpio).

---

## BUG 1 — Alta: al guardar, resetear y redirigir a "Registrados"

**Causa raíz.** En `handleGuardar` (éxito) se fijaba `contratoGuardadoId` y se **conservaban** todos los
campos; el paso 6 mostraba un estado de éxito con **"Ver contratos registrados →"** y las pestañas quedaban
desbloqueadas (porque `pasoMaxAlcanzado` seguía alto). Nunca se limpiaba el formulario ni se re-bloqueaba.

**Arreglo.** Extraje `resetFormulario()` (campos vacíos, sin PDFs, errores limpios, **`pasoMaxAlcanzado=0`** →
re-bloquea y vuelve al paso 1). Lo usan "Cancelar" y el **guardado exitoso**. Tras guardar bien:
`resetFormulario()` + `setTabActivo(6)` (Registrados) + `await cargarContratos()`. Se **eliminó**
`setContratoGuardadoId(nuevoId)` (los PDFs se suben con el `nuevoId` local) y la rama del botón
**"Ver contratos registrados →"** (ya no hay estado de éxito; navega solo). Resultado: un alta nueva arranca
**vacía y bloqueada**; al guardar, el contrato aparece en Registrados.

`frontend/src/pages/AltaContrato.jsx`.

---

## BUG 2 — Notas: el estado no pasaba a "firmada" aunque firmaran todos

**Causa raíz (diagnosticada).** En `construirPayloadNotas`, el estado de aceptación se derivaba como
`anulada → respondida → (plazo_vencido ⇒ aceptada_tácita) → en_plazo`. **NUNCA miraba las firmas reales**
(`bitacora_nota_firmas`, las firmas de la contraparte). Por eso una nota con el emisor firmado (al emitir) Y
las contrapartes firmadas seguía en **"En plazo de firma"**: el estado **solo** cambiaba al **vencer el plazo**
(tácita) o al ser respondida, ignorando que ya habían firmado antes. No faltaba un firmante: faltaba **computar
las firmas**.

**Arreglo.** Se computa el **roster** del contrato (residente + superintendente + supervisión si aplica) y, por
nota, el conjunto de firmantes = `{emisor}` (firmó al emitir) ∪ `{bitacora_nota_firmas.usuario_id}`. Si los
firmantes **cubren todo el roster → `firmada` de inmediato** (sin esperar al plazo). La **tácita por
vencimiento** aplica **solo si NO** se completaron las firmas. La apertura (#1) → `firmada` cuando su firma
conjunta está completa. Nueva etiqueta "Firmada" (verde) en HU-09 y HU-10.

`backend/src/controllers/bitacora.controller.js`, `frontend/src/pages/EmisionNotas.jsx`, `frontend/src/components/notas/BuscadorNotas.jsx`.

### Cita literal — QUIÉNES firman/aceptan una nota (RLOPSRM)
- **Art. 123 fr. III:** "…se establecerá un **plazo máximo para la firma de las notas**, debiendo acordar **las partes** que se tendrán por aceptadas una vez vencido el plazo".
- **Art. 123 fr. XII:** "**El residente, el superintendente y, en su caso, el supervisor** deberán **resolver y cerrar** invariablemente **todas las notas que les correspondan**…".

**Lectura aplicada:** "las partes" = el roster del contrato (residente + superintendente + supervisión), las
mismas que firman la apertura (art. 123 fr. III, "personal autorizado"). El emisor firma al emitir; las demás
partes aceptan; al estar **todas**, la nota queda **firmada**; si vence el plazo sin todas, **tácita**.
**`[validar]`** la alternativa más estricta-literal de fr. XII (que baste la **contraparte directa** "a quien
le corresponde" la nota, no todo el roster); dejé el cómputo en **todo el roster** porque es lo que el profe
demostró (emisor + contratista + supervisión, todos con fecha/hora) y es coherente con la apertura.

---

## BUG 3 — Etiqueta con placeholder de desarrollo

El botón decía **"Anular (dice/debe decir)"** — se coló la anotación de desarrollo. Queda **"Anular"** (término
del art. 123 fr. VII: "la nota deberá **anularse** por quien la emita"). El campo de captura de la corrección
sigue rotulado *"dice / debe decir"* (es la instrucción del formato, no un placeholder de etiqueta).
`frontend/src/pages/EmisionNotas.jsx`.

---

## Pruebas (local, verde)

| Capa | Resultado |
|---|---|
| `vite build` | ✅ EXIT 0 |
| **Smoke backend** (`smoke-bitacora-v2.mjs`) | ✅ **18/18** (incluye: firma INCOMPLETA ≠ 'firmada'; **todas las firmas → 'firmada'** sin esperar al plazo) |
| **E2E** (hu-01 · alta-v4-gating · bitacora-v2) | ✅ **14/14** (BUG 1 reset+redirect; BUG 2 "Firmada"; BUG 3 "Anular") |
| **Suite e2e completa** | ✅ **138 passed · 8 skipped (los 8 fixme, sin empeorar) · 0 failed** (baseline 136 → +2 tests nuevos) |

**Tests añadidos/actualizados:** `hu-01` ("BUG 1 — guardar: redirige a Registrados, limpia y re-bloquea"; el
de guardar ya no usa `btn-ver-registrados`), `alta-v4-gating` (a2 → redirige a Registrados), `bitacora-v2`
("(BUG 2+3) nota con TODAS las firmas → 'Firmada'; botón 'Anular' sin placeholder").

**No-regresión:** login, contrato/alta v2-v4, bitácora-v2, estimación, pago → verde.

---

## Archivos tocados (8)
- `backend/src/controllers/bitacora.controller.js` — BUG 2: cómputo de "firmada" contra el roster.
- `frontend/src/pages/AltaContrato.jsx` — BUG 1: `resetFormulario` + reset/redirect al guardar; quita "Ver registrados →".
- `frontend/src/pages/EmisionNotas.jsx` — BUG 2 (etiqueta "Firmada") + BUG 3 (botón "Anular").
- `frontend/src/components/notas/BuscadorNotas.jsx` — BUG 2: etiqueta/color de "Firmada" en HU-10.
- `backend/scripts/smoke-bitacora-v2.mjs`, `frontend/e2e/{hu-01,alta-v4-gating,bitacora-v2}.spec.js` — pruebas.

**NO se tocó:** login/auth, permisos, SesionContext, App.jsx, contratos.*, estimaciones.*, programa/A2, schema.sql (sin migración nueva), ni las 15 HU prototipo.

---

## `[validar]` / `[no determinable]`
- **`[validar]`** quiénes firman una nota: usé **todo el roster** (art. 123 fr. III "las partes" + apertura);
  la lectura más estricta de fr. XII podría bastar con la **contraparte directa**. Confirmar con el profe.
- **`[validar]`** ¿una nota **ya firmada** debería poder anularse? (tensión art. 123 fr. VI "no modificar notas
  ya firmadas" vs fr. VII "anular por error"). **No cambié** la lógica de anular en este bugfix (sigue
  bloqueando solo si fue *respondida*); es un endurecimiento aparte si el profe lo pide.
- **`[no determinable]`** sin cambios de esquema en este bugfix (todo es lógica de derivación + UI).

*Fin. Patch: `docs/BUGFIX_alta_bitacora_DIFFS.patch`. Probado local: smoke 18/18, e2e 14/14, suite 138/8-skip/0-fail. `main` en `7bb1b99`, sin commit.*
