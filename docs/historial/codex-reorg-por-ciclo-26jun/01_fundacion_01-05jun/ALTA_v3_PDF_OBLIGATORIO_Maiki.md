# Alta-v3 — PDF firmado OBLIGATORIO como último paso del wizard — Entregable para Maiki

**Fecha:** 2026-06-03 · **Autor:** Claude Code (Fundación) · **Para revisión de:** Maiki (integrador).
**Disciplina / Nivel 1:** construido y probado en LOCAL; **sin commit/push/deploy, `main` intacto** (`553cda0`).
**Nivel 1 = ley literal (LOPSRM/RLOPSRM/LFD) + profesor.** Lo interpretativo va `[validar]`; lo no verificable `[no determinable]`. Code no es abogado.

> **Este ajuste va ENCIMA de alta-v2** (que sigue sin commitear en el working tree). El patch es **incremental y separado**: `docs/ALTA_v3_PDF_OBLIGATORIO_DIFFS.patch` (**solo este cambio**, 4 archivos), generado diffeando contra el baseline alta-v2 respaldado, NO contra `HEAD`. Por tanto **no re-incluye nada de alta-v2**.

---

## 0. Qué pediste y qué hice

| # | Requisito | Estado |
|---|---|---|
| 1 | El paso **"6. PDF firmado" es el ÚLTIMO** del wizard | ✅ `PASOS_WIZARD = [0..5]`, `ULTIMO_PASO_WIZARD = 5` |
| 2 | El botón **"Guardar contrato" vive en ese paso** (no antes) | ✅ Guardar solo cuando `tabActivo === 5` |
| 3 | Guardado **GATEADO**: botón deshabilitado hasta subir el PDF firmado | ✅ `disabled={… \|\| !pdfFirmadoFile}` + `validarPaso(5)` (doble gateo) |
| 4 | Se conserva alta-v2 (1.5): el PDF se adjunta **durante la captura** y se sube al guardar | ✅ sin cambios en el mecanismo (`pdfFirmadoFile` → `subirDocumento` tras `crearContrato`) |
| 5 | Pasos **1–5 conservan "Siguiente"** con el gating uniforme de v2 | ✅ "Siguiente" en `tabActivo < 5`; "Guardar" solo en `=== 5` |
| 6 | El **gating del PDF de anticipo** (>umbral) **no se rompe** | ✅ intacto (ver §4) |
| 7 | Fundamento legal marcado `[validar]`, **sin asumir artículo** | ✅ (ver §3) |

**Archivos de ZONA CONGELADA tocados por este ajuste: NINGUNO.** (A diferencia de alta-v2, que tocó `schema.sql`, `init.js`, `contratos.controller.js`, `App.jsx`, `SesionContext.jsx`.)

---

## 1. Qué cambié (4 archivos, ninguno congelado)

### `frontend/src/pages/AltaContrato.jsx` (no congelado) — el cambio de fondo
- **El PDF firmado pasa a ser el último paso del wizard.** `PASOS_WIZARD` ahora es `[0,1,2,3,4,5]` y `ULTIMO_PASO_WIZARD = 5` (antes `[0..4]` / `4`). El paso 5 ya no es "auxiliar post-guardado": es el cierre obligatorio del wizard. Solo **"Registrados" (6)** queda como pestaña auxiliar de consulta.
- **Botón "Guardar contrato" movido y gateado.** Vive solo en `tabActivo === 5` (paso PDF firmado) y está **deshabilitado** mientras no haya PDF: `disabled={soloLectura || guardando || !pdfFirmadoFile}`. Cuando no hay PDF, se muestra una pista (`data-testid="guardar-bloqueado-hint"`: *"Adjunta el PDF firmado para habilitar el guardado."*).
- **Doble gateo (defensa).** `validarPaso(5)` devuelve error si `!pdfFirmadoFile && !contratoGuardadoId`. Como `validar()` (guardado final) recorre `PASOS_WIZARD`, el guardado queda bloqueado por validación **además** del botón deshabilitado.
- **Se eliminó el botón `btn-ir-pdf`** ("Adjuntar PDF firmado →" post-guardado): ya no aplica, porque el PDF se adjunta **antes** de guardar. Tras guardar, en el paso 5 aparece **"Ver contratos registrados →"** (`data-testid="btn-ver-registrados"`) que lleva a la pestaña Registrados.
- **Pasos 1–5 sin cambios funcionales:** "Siguiente" sigue en `tabActivo < ULTIMO_PASO_WIZARD` con el gating uniforme de v2 (`irAPaso` valida `[origen, destino)`); "Atrás" libre; banner de error persistente intacto.
- **`TabPdfFirmado` (precaptura):** texto reforzado a *"Adjunta el PDF firmado del contrato \* (obligatorio para guardar)"* + nota `data-testid="pdf-firmado-requerido"` con el marcador `[validar el fundamento con el profe]`.
- **`tabsConError`:** añade el paso 5 si `errores.pdfFirmadoFalta`. **`ERR0`:** nuevo flag `pdfFirmadoFalta`. **`tabsBloqueados`:** se agregan `pdfFirmadoFile`/`contratoGuardadoId` a las deps (los lee `validarPaso(5)`); el resultado es **invariante** porque el paso 5 es el último → su validez nunca bloquea otra pestaña (comentado en el código).

### `frontend/e2e/_helpers.js` (no congelado)
- Nuevo helper **`altaAdjuntarPdfFirmado(page)`**: adjunta un PDF **en memoria** (`setInputFiles` con `buffer`, sin fixture en disco) en el input de precaptura del paso PDF firmado, y espera la confirmación "se adjuntará al guardar".

### `frontend/e2e/hu-01-alta-catalogo.spec.js` (no congelado)
- El test de guardado ahora **avanza un paso más** (garantías → PDF firmado), comprueba que **Guardar está deshabilitado sin PDF**, adjunta el PDF (`altaAdjuntarPdfFirmado`), verifica que **se habilita**, guarda, y luego abre "Ver info" desde Registrados (navegando con el nuevo `btn-ver-registrados`).

### `frontend/e2e/4x-alta-correcciones.spec.js` (no congelado)
- Reescrito el test **"Guardar solo al final"**: garantías ya **no** es el último paso (sigue "Siguiente"); el último es **PDF firmado**, donde aparece "Guardar" **deshabilitado** sin PDF.
- **Nuevo test** *"alta-v3 el PDF firmado es OBLIGATORIO para guardar (gate del botón)"*: sin PDF → botón bloqueado + pista; adjuntar → habilita y la pista desaparece; quitar → vuelve a bloquear.

> `a2-programa-obra.spec.js` **no necesitó cambios** (no guarda; opera sobre el paso programa).

---

## 2. Cómo queda el flujo del wizard

```
1. Datos generales →  2. Catálogo →  3. Programa →  4. Jurídicos →  5. Garantías  →  6. PDF firmado
   [Siguiente]         [Siguiente]    [Siguiente]    [Siguiente]      [Siguiente]      [Guardar contrato]
                                                                                        └─ DESHABILITADO
                                                                                           hasta adjuntar el PDF
   (— Registrados es pestaña auxiliar de consulta, fuera de la progresión —)
```
- Llegar al paso 6 exige que **1–5 sean válidos** (gating de v2 sin cambios; las pestañas posteriores a un paso inválido siguen bloqueadas con 🔒).
- El paso 6 es **alcanzable sin el PDF** (hay que entrar para adjuntarlo): `validarPaso(5)` solo gatea el **guardado**, no la navegación hacia el paso (consistente con `irAPaso`, que valida `[origen, destino)` y no el destino).
- **No se puede guardar un contrato sin su PDF firmado.** Doble candado: botón `disabled` + `validar()`.

---

## 3. Fundamento legal — `[validar]`, sin asumir artículo

La regla de producto es: **el contrato se formaliza con la firma; el PDF firmado es la evidencia de esa formalización, por eso es requisito para registrarlo.** En la UI y los comentarios esto va marcado **`[validar el fundamento con el profe]`**. **NO se asume ningún número de artículo** (LOPSRM/RLOPSRM/LFD): que exista una cita literal que ate "no hay contrato registrable sin PDF firmado" lo **confirma el profe** (Nivel 1: no lo decide Code).

---

## 4. PDF de autorización de anticipo — NO se rompió (punto 5)

El PDF de autorización de anticipo (>umbral) **sigue exactamente como en alta-v2**: vive en el paso 5 (Garantías), se puede adjuntar durante la captura (1.6) y **NO es bloqueante** (decisión **D-5**, parametrizable, pendiente del profe: umbral 30%, no obligatorio). Este ajuste **no lo toca** y **no introduce** un gate nuevo para él. El gate del **PDF firmado del contrato** (paso 6) es **independiente** del flujo de anticipo (paso 5), así que su gating "sigue satisfecho". Si el profe decidiera que el PDF de anticipo debe ser obligatorio cuando supera el umbral, ese sería un gate aparte en `validarPaso(4)` — **flagueado, no hecho** aquí.

---

## 5. Alcance deliberadamente NO cubierto

- **Enforcement server-side del "PDF obligatorio": `[no determinable]` / fuera de alcance.** Hoy el guardado son **dos requests**: `POST /contratos` (crea la fila) y luego `POST …/documentos` (sube el PDF, BYTEA + FK). Hacer "no existe contrato sin PDF" a nivel servidor exigiría volver el alta **transaccional con el PDF en un solo request multipart**, lo que toca `contratos.controller.js` (**zona congelada**) y rompe "cambios pequeños y revisables". El requisito que pediste ("el botón Guardar deshabilitado hasta subir el PDF") es **gating de UI** y así está implementado. Igual que en alta-v2, si la subida del PDF fallara *después* de crear la fila, el contrato quedaría guardado sin PDF (aviso por toast) — **límite heredado de v2**; convertirlo en atómico es decisión de Maiki (tocaría el core).

---

## 6. Evidencia de pruebas (local, verde)

| Capa | Resultado |
|---|---|
| `vite build` (frontend) | ✅ 465 módulos, EXIT=0 |
| Specs de alta (4x, hu-01, a2) | ✅ 11/11 (incluye el test nuevo del gate) |
| **Suite e2e completa** | ✅ **127 passed · 8 skipped(fixme) · 0 failed** (baseline v2 era 126 passed · 8 fixme · 0 failed → **+1** por el test nuevo) |
| Patch incremental | ✅ forward-apply sobre baseline v2 reproduce IDÉNTICO mis 4 archivos; `git apply -R --check` limpio |

**No-regresión confirmada por la suite real:** gating/banner/garantía (`4x`), "ver info" (`hu-01`), regla del 100% (`a2`), **login** (`hu-registro` + todos los `enterAppMode`), **bitácora** (`hu-08/09/10/11`), **estimación** (`hu-12/13/15/16`), **pago** (`hu-21`) → todo verde. **Los 8 `test.fixme` siguen en 8** (no empeoraron).

---

## 7. Confirmación de disciplina

- **`main` intacto:** `HEAD = 553cda0` (sin commits).
- **alta-v2 intacto en el working tree:** los 45 archivos modificados siguen siendo los mismos (edité 4 que **ya** estaban en ese set por v2 → el conteo no cambió; no creé ni revertí archivos fuente). `git apply -R` de mi patch sobre el working tree reproduce el baseline alta-v2 exacto. Los docs `docs/ALTA_v2_DIFFS.patch` y `docs/ALTA_v2_Maiki.md` **no se tocaron**.
- **Zona congelada tocada por este ajuste:** **NINGUNA**.
- **Sin commit / push / deploy.** Solo working tree + 2 docs nuevos (`docs/ALTA_v3_PDF_OBLIGATORIO_*`).

---

## 8. Runbook para aplicar/revisar (Maiki)

```powershell
# Estás sobre el working tree con alta-v2 + alta-v3 YA aplicados. Para revisar SOLO este ajuste:
git --no-pager apply --stat docs/ALTA_v3_PDF_OBLIGATORIO_DIFFS.patch   # 4 archivos
# Si partieras de un árbol SOLO-alta-v2 (sin este ajuste) y quisieras aplicarlo:
#   git apply docs/ALTA_v3_PDF_OBLIGATORIO_DIFFS.patch
# Build + e2e (stack local arriba):
cd frontend; npm run build          # EXIT 0
npx playwright test                 # 127 passed · 8 skipped · 0 failed
```

*Fin. Patch: `docs/ALTA_v3_PDF_OBLIGATORIO_DIFFS.patch`. Nada commiteado; `main` en 553cda0. Probado en local: build OK, e2e 127/8-skipped/0-fail. Lo legal, `[validar]` con el profe.*
