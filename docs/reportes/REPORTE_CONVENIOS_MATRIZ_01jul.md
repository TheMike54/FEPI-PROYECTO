# Reporte — Auditoría + corrección de convenios por tipo (matriz) · 01-jul

**Sesión:** auditar los 4 tipos de convenio contra la matriz correcta y arreglar TODO lo que no cumpla.
**Base:** B8 de `REPORTE_EJECUCION_HALLAZGOS_01jul.md` (ahí se tocaron convenios por primera vez).
**Método:** backend + frontend (ninguno congelado) · `node -c` + `vite build` verdes · smoke en vivo por tipo
(API + Playwright) · **LOCAL, sin push, sin deploy.** Zona congelada intacta
(schema.sql / permisos.js / auth / server.js no tocados).

**Archivos tocados (4, ninguno congelado):**
- `backend/src/controllers/convenios.controller.js` (M) — matriz por tipo + regla de oro server-side.
- `frontend/src/components/convenios/EditorProgramaConvenio.jsx` (M) — cajita +/− + freeze de periodos.
- `frontend/src/pages/ConveniosModificatorios.jsx` (M) — editor en los 4 tipos + predicción de periodos.
- `frontend/src/utils/periodosConvenio.js` (NUEVO) — espejo cliente de `extenderPeriodosPorPlazo`.

---

## 1. La matriz correcta (lo que cada tipo DEBE hacer)

| Tipo | Catálogo (cantidades) | Programa (calendario) | Periodos |
|---|---|---|---|
| **programa** | CONGELADO | reacomodar | — |
| **monto** | **cajita +/− (ajuste)** | reacomodar | — |
| **plazo** | CONGELADO | reacomodar | **añade nuevos** |
| **mixto** | **cajita +/− (ajuste)** | reacomodar | **añade nuevos** |

Diferencias reales: **cantidades** (cajita) solo MONTO y MIXTO · **añadir periodos** solo PLAZO y MIXTO ·
**reacomodar** los 4. **Regla de oro transversal (los 4):** los periodos ACTUAL y PASADOS son intocables;
solo el FUTURO se edita (protege lo ya ejecutado/estimado — #14/#24 — y las FKs).

---

## 2. Auditoría: qué encontré fuera de la matriz (antes de esta sesión)

| # | Tipo | Hallazgo | Estado |
|---|---|---|---|
| A | monto/mixto | **La cajita de ajuste +/− DESAPARECIÓ** (la cantidad se tecleaba directo, sin “original/ajuste/final”). | ✅ arreglado |
| B | mixto | Al aumentar días **NO se veían los periodos nuevos** para reacomodar (el backend SÍ los añadía; el editor no los mostraba). | ✅ arreglado |
| C | plazo | **No reacomodaba** el calendario: el editor no se mostraba para plazo (solo el input de días). | ✅ arreglado |
| D | programa | El catálogo **no estaba congelado en la UI** (dejaba teclear cantidad, que el backend luego rechazaba). | ✅ arreglado |
| E | los 4 | La **regla de oro NO estaba implementada** (se podían modificar periodos actuales/pasados). | ✅ arreglado (back + front) |

---

## 3. Backend — matriz por tipo + regla de oro (`convenios.controller.js`)

Se **desacopló** la lógica en flags independientes (antes un solo `tocaPrograma` mezclaba todo):

```
ajustaCantidad = monto | mixto     → la cajita cambia la CANTIDAD (catálogo)
tocaPlazo      = plazo | mixto     → extiende el plazo y AÑADE periodos (append-only, D4)
traePrograma   = hay conceptos+celdas → REACOMODA el calendario (los 4 tipos)
requierePrograma = monto|programa|mixto (obligatorio); plazo lo trae OPCIONAL
```

- **Catálogo congelado (programa/plazo):** si un concepto cambia de cantidad y `!ajustaCantidad` → **400**
  (“un convenio de PROGRAMA/PLAZO no cambia cantidades: el catálogo va CONGELADO”). Monto/mixto sí ajustan.
- **plazo ahora REACOMODA:** al enviar el programa (con el catálogo congelado), `traePrograma` se activa y
  el calendario se re-cuadra igual que en programa. Antes plazo no versionaba el programa.
- **REGLA DE ORO (nueva, transversal):** antes de mutar se **fotografía** el programa vigente
  (`storedCeldas`, por `concepto×periodo`). En el re-cuadre (F), toda celda de un periodo **no-futuro**
  (`inicio <= CURRENT_DATE`, **fecha REAL del servidor**, nunca la simulada) que difiera del snapshot → **409**
  (“No se puede modificar el periodo #N: es ACTUAL o PASADO”). El FUTURO sí es editable. Vale también para
  la cajita: el delta de monto/mixto solo puede aterrizar en periodos futuros.
- **Conservado:** #11/D3 (sin claves nuevas — 400 `conceptoNuevoProhibido`), P.U. congelado (art. 59),
  no-reducir bajo lo ya estimado, append-only de `extenderPeriodosPorPlazo`, y el **fix del bug de los 1000
  periodos** (fecha_inicio::text + guarda ISO) que sigue intacto.

---

## 4. Frontend — cajita + editor para los 4 tipos + periodos nuevos

### Cajita restaurada (monto/mixto) — `EditorProgramaConvenio.jsx`
Nueva prop `permiteAjuste` (monto/mixto). La celda de cantidad pasa a 3 partes (mockup de Maiki):
- **Cant. original** CONGELADA (gris, solo lectura) — `data-testid cm-cant-original-N`.
- **Ajuste (+/−)** editable al lado — `cm-concepto-ajuste-N`.
- **Cant. final = original + ajuste** (calculada) — `cm-cant-final-N`; el **importe recalcula con la final**.

En **programa/plazo** la cantidad se muestra en **solo lectura** (catálogo congelado, sin cajita).

### Editor en los 4 tipos + regla de oro visual
- El editor ahora se muestra para **los 4 tipos** (antes solo monto/programa/mixto). En plazo aparece con el
  catálogo congelado para poder reacomodar.
- **Freeze visual:** las celdas de periodos ACTUAL/PASADOS quedan **deshabilitadas** (grises, candado 🔒,
  tooltip); solo las futuras se editan. “Hoy” = fecha REAL del navegador (UTC, casa con `CURRENT_DATE`).

### Predicción de periodos nuevos (fix del bug de mixto) — `utils/periodosConvenio.js`
- `periodosAgregadosPorPlazo()` es el **espejo EXACTO** de `extenderPeriodosPorPlazo` (misma cadencia,
  misma numeración, **misma guarda ISO** contra el bug de 1000 periodos).
- Cuando plazo/mixto amplían el plazo, esas columnas se pintan marcadas **NUEVO** (verde) y son editables:
  el usuario reacomoda el delta en ellas **en el mismo convenio**. El payload las envía; el backend ya las
  creó (mismo número) para cuando resuelve las celdas.
- **Verificado que casa con el backend:** para 7021 plazo 88→120 el cliente predice P4 `19/09→18/10` y
  P5 `19/10→20/10` — **idénticos** a los que el backend generó. Fecha basura → `[]`; plazo desbocado → tope 1000.

---

## 5. Smoke EN VIVO por tipo (contrato 7021: P1 pasado, P2/P3 futuros)

### Backend (API real, dependencia/residente)

| Caso | Resultado |
|---|---|
| **programa** reacomodar (catálogo 121 fijo, mueve 01 de P2 a P2+P3 futuros) | **201** · monto igual · 0 periodos · P1=100 intacto |
| **monto** cajita 01 121→141, delta +20 al FUTURO P2 | **201** · monto +240 · P1=100 intacto |
| **plazo** 88→120 (catálogo congelado + reacomodar) | **201** · monto igual · **+2 periodos** (P4/P5) |
| **mixto** cantidad 01→131 + plazo 88→120 + reacomodar | **201** · cantidad 131 · **+2 periodos** · P1=100 intacto |
| **mixto FE-mirror**: cajita 01 +20 aterriza en el periodo **NUEVO P4** | **201** · 01/P4=20 · monto +240 · P1=100 |
| (–) programa que cambia cantidad | **400** catálogo congelado |
| (–) reacomodar un periodo PASADO (P1) | **409** regla de oro |
| (–) monto con delta en periodo PASADO | **409** regla de oro |

### Frontend (Playwright, cuenta dependencia, en vivo)
4/4 verde: **MONTO** (cajita original/ajuste/final; ajuste +20 → final=orig+20; P1 deshabilitado, P2
habilitado) · **PROGRAMA** (sin cajita, cantidad deshabilitada, regla de oro) · **PLAZO** (editor visible,
catálogo congelado, plazo 120 → columnas NUEVO P4/P5 visibles y editables) · **MIXTO** (cajita + periodos
NUEVO + P1 congelado). Screenshots confirmaron la cajita (importe $1,692.00 = 141×12) y las columnas NUEVO.

---

## 6. Regresión — cero fallas nuevas

`vite build` verde · `node -c` verde. La suite `hu-03-convenios` + `convenio-autorizacion` reporta **17
fallas**, pero son **PRE-EXISTENTES (stale), NO de esta sesión**: se verificó con los cambios *stasheados*
(baseline) y el conteo y los tests fallidos son **idénticos**. Causa raíz: usan `select-contrato`, un testid
**eliminado en una sesión previa** (la selección de contrato migró a `?contrato=` + banner “Contrato
activo”), y algunos afirman comportamiento del editor VIEJO que ya contradice #11/D3 (agregar concepto
nuevo, cambiar P.U.). **Follow-on separado:** refrescar esa spec al nuevo mecanismo de selección (afecta ~39
specs, fuera del alcance de esta corrección).

---

## 7. Estado final
- Matriz **verificada tipo por tipo** (✅ los 4) en código y con smoke en vivo (API + UI).
- Cajita **restaurada** · fix de **mixto** (añade periodos y se reacomoda en ellos) · **regla de oro**
  (periodos pasados intocables) en back y front · hallazgos similares (C plazo reacomoda, D catálogo
  congelado en UI) arreglados.
- Contratos de prueba **restaurados, residuo 0** (7021 prístino; 7072 sin residuo; 7112 conserva sus 2
  convenios de seed legítimos).
- Zona congelada intacta · fix art. 125, 5 oleadas y selector de fecha conservados.
- **LOCAL, sin push, sin deploy.**
