# Alta-v4 — Anticipo PDF obligatorio + gating estrictamente secuencial (fix de raíz) — Entregable para Maiki

**Fecha:** 2026-06-03 · **Autor:** Claude Code (Fundación) · **Para revisión de:** Maiki (integrador).
**Base:** `c9fba02` (árbol limpio; alta v2+v3 ya integradas). **Disciplina / Nivel 1:** construido y probado en
LOCAL; **sin commit/push/deploy, `main` intacto**. Lo interpretativo `[validar]`, lo no verificable `[no determinable]`. Code no es abogado.

> **Patch incremental:** `docs/ALTA_v4_GATING_DIFFS.patch` (**solo este ajuste**, 3 archivos, sobre `c9fba02`). Verificado: `git apply -R --check` limpio (es exactamente el delta v4) y no incluye los 2 docs ajenos (`Historias_Usuario.xlsx`, `SIGECOP_contexto_respaldo.md`) que ya estaban modificados de antes.

---

## 0. Resumen por punto

| # | Pedido | Estado |
|---|---|---|
| 1 | Anticipo > umbral (30%) ⇒ PDF de autorización **OBLIGATORIO** (bloquea avance y guardado; resuelve D-5; umbral parametrizable) | ✅ |
| 2 | Gating **estrictamente secuencial** (raíz): cada pestaña desbloquea SOLO la siguiente; no saltar; revisitar válidas | ✅ |
| 3 | Barrido de fugas similares + lista + arreglo (gating) / `[validar]` (legal) | ✅ (§3) |
| — | PDF firmado sigue obligatorio para guardar | ✅ (sin tocar; reforzado por el botón atado a la validez global) |

**Archivos de ZONA CONGELADA tocados: NINGUNO.** Solo: `frontend/src/pages/AltaContrato.jsx` (no congelado), `frontend/e2e/_helpers.js`, `frontend/e2e/alta-v4-gating.spec.js` (nuevo). **El enforcement server-side de los PDFs queda para la pasada de HU-12 al core** (lo pediste así) — `contratos.controller.js` NO se tocó.

> **Cómo investigué (raíz):** además de mi análisis, corrí una **auditoría adversarial multi-agente** (4 lentes: matemática del gating, documentos condicionales, requeridos por campo, consistencia save-vs-advance) sobre `AltaContrato.jsx`/`Tab.jsx`. Las fugas de §3 salen de esa auditoría + mi lectura; todas las `esFuga` accionables quedaron cerradas.

---

## 1. Anticipo PDF obligatorio sobre umbral (el BUG)

**Causa raíz:** `validarPaso(4)` validaba solo el rango del % (0–100) y las garantías; **nunca leía `pdfAnticipoFile` ni lo comparaba con el umbral**. El aviso "Autorización requerida" y el uploader eran **puramente visuales**. Como `irAPaso` y `validar()` (guardado) reusan `validarPaso`, se podía **avanzar del paso 4 y GUARDAR** con anticipo de 40/100% sin la autorización (la subida del PDF era best-effort *después* de crear el contrato).

**Fix (raíz, en la fuente única `validarPaso(4)`):**
```js
if (a > ANTICIPO_UMBRAL_PDF && !pdfAnticipoFile && !contratoGuardadoId) {
  return { ok:false, msg:`Anticipo ${a}% supera el ${ANTICIPO_UMBRAL_PDF}%: adjunta el PDF de
           autorización del anticipo (obligatorio para avanzar y guardar).`,
           errores:{ ...ERR0, anticipoPdfFalta:true } };
}
```
Como `irAPaso`, `tabsBloqueados` y `validar()` consumen `validarPaso`, el mismo candado **bloquea el avance del paso 4, bloquea las pestañas posteriores y bloquea el guardado** — igual que el PDF firmado. Se añadió el flag `anticipoPdfFalta` a `ERR0` y a `tabsConError` (punto rojo en la pestaña 4), y la UI del uploader ahora lleva `*` + nota **"Obligatorio: sin este PDF no se puede avanzar ni guardar"** (`data-testid="anticipo-pdf-requerido"`).

**D-5 resuelta** (Maiki): obligatorio por encima del umbral. **Umbral parametrizable**: sigue siendo el único knob `ANTICIPO_UMBRAL_PDF = 30` (comparación estricta `>`, consistente con el aviso). **El valor 30 y su fundamento legal son `[validar]` con el profe — NO se asume artículo del umbral** (la exigencia de "autorización escrita del titular" se apoya en la vista en art. 50 fr. IV LOPSRM, heredado; el % lo confirma el profe).

---

## 2. Gating estrictamente secuencial — fix de RAÍZ

**Por qué tenía fugas (diagnóstico):**
1. `tabsBloqueados` bloqueaba solo las pestañas **posteriores al primer paso inválido**. Como el paso 3 (jurídicos) es `{ok:true}` siempre y el 4 (garantías vacío) es válido vacuamente, **al completar 0/1/2 se desbloqueaban 3, 4 y 5 de golpe** (no "solo la siguiente").
2. `irAPaso(target)` solo validaba la cadena `[tabActivo, target)`. Como 3 y 4 pasaban por vacíos, **un click directo en la pestaña 5 saltaba 3 y 4 sin visitarlos**.
3. No se distinguía **"válido"** de **"alcanzado/visitado"**: un paso opcional vacío contaba para abrir los siguientes.

**Fix (raíz): se introduce `pasoMaxAlcanzado` (high-water mark) y una frontera única usada por afford­ance Y enforcement.**
```js
const [pasoMaxAlcanzado, setPasoMaxAlcanzado] = useState(0);
const primerPasoInvalido = (primer paso del wizard que NO valida, o ULTIMO+1);
const fronteraAccesible  = Math.min(pasoMaxAlcanzado + 1, primerPasoInvalido);
const pasoAccesible = (i) => i > ULTIMO ? true /*Registrados*/ : i <= fronteraAccesible;
```
- **`+1 sobre el máximo alcanzado`** ⇒ solo se desbloquea **la SIGUIENTE** pestaña (aunque las opcionales sean válidas, NO se abren en cascada).
- **`min con primerPasoInvalido`** ⇒ si se rompe un paso previo, **se re-bloquean las posteriores** al instante (cierra el "estado obsoleto").
- `irAPaso` adelante: `destino = min(target, pasoMaxAlcanzado + 1)` + valida el prefijo → **no se salta a una pestaña no alcanzada**; atrás (`target<=tabActivo`) libre para corregir; Registrados (auxiliar) libre.
- `tabsBloqueados` se computa **en vivo** desde `pasoAccesible` (se eliminó el `useMemo` con deps manuales → ya no hay riesgo de quedar desincronizado con `pdfAnticipoFile`/`pdfFirmadoFile`, que era una fuga latente).
- El botón **"Guardar"** ahora se deshabilita con la **validez global** (`primerPasoInvalido <= ULTIMO`), no solo con `!pdfFirmadoFile` → el affordance coincide con `validar()` (cierra la asimetría save-vs-advance).
- `handleCancelar` reinicia `pasoMaxAlcanzado = 0`.

Resultado: una pestaña desbloquea **únicamente la siguiente** y solo cuando la actual está completa+válida; las visitadas/válidas se revisitan; saltar a una no alcanzada es imposible; el guardado final (`validar()`) sigue siendo la red que recorre todos los pasos.

---

## 3. Barrido de fugas (auditoría) — lista y disposición

### Cerradas en este patch (fugas de gating reales)

| # | Fuga | Sev | Cómo se cerró |
|---|---|---|---|
| 1 | **Anticipo > umbral no exige el PDF** (se guardaba sin él) | **alta** | `validarPaso(4)` (§1) |
| 2 | Desbloqueo **en cascada** (3,4,5 de golpe) | media | `pasoMaxAlcanzado` + `fronteraAccesible` (§2) |
| 3 | `irAPaso` **salta** pasos vacuamente válidos | media | `destino = min(target, max+1)` (§2) |
| 4 | **Estado obsoleto**: romper un paso previo tras llegar al 5 dejaba guardar inválido (vía anticipo) | media | re-bloqueo `min(…,primerPasoInvalido)` + botón atado a validez global + fix #1 |
| 5 | **Asimetría** save-vs-advance: botón Guardar solo miraba `pdfFirmadoFile` | media | `disabled` atado a `primerPasoInvalido <= ULTIMO` |
| 6 | `tabsBloqueados` no dependía de `pdfAnticipoFile` (latente) | media | se eliminó el `useMemo` → se computa en vivo |
| 7 | `tabsConError` no marcaba el paso 4 sin PDF de anticipo | baja | flag `anticipoPdfFalta` añadido |
| 8 | Affordance off-by-one (pestaña tras el 1er inválido) | baja | el modelo de frontera lo vuelve consistente |

### Listadas como `[validar]` (interpretativo/legal — NO auto-arregladas, Nivel 1)

| # | Hallazgo | Por qué NO lo bloqueé |
|---|---|---|
| 9 | **Garantía con vigencia vencida** solo pinta `⚠` (warning), no bloquea | Si una fianza vencida al registrar debe **impedir** el alta es **legal/interpretativo** (vigencia art. 91 LOPSRM): bloquearlo podría frenar flujos legítimos (registro previo a renovación). **`[validar]` con el profe**; hoy queda como advertencia (no se presenta como error). |
| 10 | **Cédula profesional del DRO**: el hint dice "vigente" pero el paso jurídicos es **opcional** | ¿La cédula del DRO (y firmante/representante) son obligatorios? Es **decisión del profe**. No asumo: el bloque está rotulado "opcional". **`[validar]`**: si deben serlo, se exige en `validarPaso(3)`. |
| 11 | **Garantía**: con una póliza capturada solo se exige `tipo` + `monto>0` (afianzadora/poliza/vigencia libres) | Esos campos **no** se presentan como requeridos (sin `*` ni borde rojo) → no hay "requerido visual que no bloquea". El conjunto mínimo de una póliza es **decisión de negocio** → **`[validar]`**. |

### No-fugas confirmadas (informativo)
- **Registrados (pestaña 7)** navegable sin validar: **intencional** (consulta de solo lectura; el guardado vive solo en el paso 6). No permite guardar el borrador.
- `useEffect` que resetea `errores` en cada cambio: **cosmético**; el gating se recomputa en vivo desde `validarPaso` (no desde `errores`), así que no es fuga.
- **PDF firmado**: confirmado bien gateado (`validarPaso(5)` + botón + `validar()`).

---

## 4. Pruebas (local, verde)

| Capa | Resultado |
|---|---|
| `vite build` | ✅ 465 módulos, EXIT 0 |
| **Suite e2e completa** | ✅ **131 passed · 8 skipped (los 8 fixme, sin empeorar) · 0 failed** (baseline c9fba02 = 127 → **+4** por los tests nuevos) |
| Specs de alta (v4 + 4x + hu-01 + a2) | ✅ 15/15 |

**Tests nuevos** (`frontend/e2e/alta-v4-gating.spec.js`, login real):
- **(a)** anticipo > umbral sin PDF ⇒ "Siguiente" NO avanza (banner + sigue en garantías + pestaña PDF bloqueada); adjuntar la autorización habilita el avance.
- **(a2)** BUG cerrado end-to-end: con anticipo > umbral se exigen **ambos** PDFs (autorización para avanzar + firmado para guardar) → guarda OK con ambos.
- **(b)** no se puede saltar a una pestaña no alcanzada (posteriores bloqueadas; completar el paso 0 desbloquea solo el 1, no el 2).
- **(c)** cada pestaña desbloquea **SOLO la siguiente** (completado el paso 2, jurídicos se desbloquea pero garantías y PDF firmado siguen bloqueados — anti-cascada).
- **(d)** el firmado sigue obligatorio para guardar → cubierto por los tests v3 existentes (`4x`), que siguen verdes.

**No-regresión:** login (`hu-registro`), bitácora (`hu-08/09/10/11`), estimación (`hu-12/13/15/16`), pago (`hu-21`), y v2/v3 (gating/banner/garantía/ver-info/regla-100%) → todo verde.

---

## 5. Disciplina

- **`main` intacto:** `HEAD = c9fba02` (sin commits).
- **Zona congelada tocada: NINGUNA** (no se necesitó; el enforcement server-side se deja para HU-12, como pediste).
- **Cambios de código:** `AltaContrato.jsx` (M, +63/−27), `_helpers.js` (M, +14), `alta-v4-gating.spec.js` (nuevo, +93). Los 2 docs `xlsx/md` modificados son **ajenos** (no míos) y **no** entran en el patch.
- **Sin commit / push / deploy.** Entregables nuevos: `docs/ALTA_v4_GATING_*`.

`[no determinable]`: enforcement server-side de ambos PDFs (alta transaccional multipart) — fuera de alcance, va con la pasada de HU-12 al core congelado.

*Fin. Patch: `docs/ALTA_v4_GATING_DIFFS.patch`. Probado en local: build OK, e2e 131/8-skipped/0-fail. Lo legal y el umbral, `[validar]` con el profe.*
