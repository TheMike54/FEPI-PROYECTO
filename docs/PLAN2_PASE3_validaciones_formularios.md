# Plan Maestro 2 — Pase 3: Validaciones y formularios

**Autor:** Maiki (TheMike54) · **Fecha:** 2026-06-05 · **Base:** `main` @ `6829da6` (Plan2 Pase 1 integrado)
**Estado:** HECHO en LOCAL. **Sin commit / sin push** (decisión de Maiki).
**Resultado de pruebas:** suite e2e completa **184 passed · 8 skipped (`test.fixme` conocidos) · 0 failed** · `vite build` OK.

> Núcleo que NO se tocó: gating/100%/cuadre del alta (G1–G8). **Cero archivos de la zona congelada** (CLAUDE.md): el cambio de pago vive en `pagos.controller.js` (no congelado) y los de registro son frontend-puro (la columna `nombre`, `auth.controller.js` y `SesionContext.jsx` quedan intactos).

---

## 1) Pago (HU-21) — la fecha del pago no puede ser anterior a la integración de la estimación

**Qué:** al registrar un pago, se rechaza con **HTTP 400** si `fecha_pago` es anterior al **día** en que se integró la estimación (`estimaciones.integrada_en`). No se paga antes de que la estimación se integre. **El cálculo del monto NO se tocó** (`importe = est.neto`).

**Dónde:** `backend/src/controllers/pagos.controller.js`, función `registrarPago` (único endpoint de creación de pagos, `POST /api/pagos`, gateado a rol `finanzas`).

**Cómo:**
1. El `SELECT` de la estimación (con `FOR UPDATE`) ahora trae también `integrada_en`.
2. Justo **después** del check de no-doble-pago y **antes** de `const importe = est.neto`, se compara por día en UTC:

```js
if (est.integrada_en) {
  const diaIntegracion = new Date(est.integrada_en).toISOString().slice(0, 10); // 'AAAA-MM-DD' (UTC)
  if (fechaPago < diaIntegracion) {
    await client.query('ROLLBACK');
    return res.status(400).json({ error: `La fecha de pago (${fechaPago}) no puede ser anterior a la fecha de integración de la estimación (${diaIntegracion})` });
  }
}
```

**Decisiones de diseño:**
- **Comparación por DÍA, no por instante.** `fecha_pago` es `DATE` (sin hora); `integrada_en` es `TIMESTAMPTZ` (con hora y zona). Comparar el `DATE` (medianoche) contra el `TIMESTAMPTZ` crudo penalizaría injustamente un pago el mismo día que la integración. Se normaliza a día UTC en ambos lados.
- **El mismo día de la integración SÍ es válido** (comparación estricta `<`): solo se rechazan días estrictamente anteriores.
- `fechaPago` ya viene validada como `'AAAA-MM-DD'` (regex + `Date` parseable, línea 38), por lo que la comparación lexicográfica de strings equivale a la cronológica.
- Sigue el patrón de error **dentro de la transacción** (hace `ROLLBACK` y devuelve 400), igual que las demás validaciones del endpoint. Como va antes del cálculo/INSERT, si rechaza nunca se llega a tocar el monto.

**[validar con el profe]:** el fundamento legal exacto de "no pagar antes de integrar". Refuerza la coherencia temporal del plazo de pago de 20 días naturales (art. 54 LOPSRM) que la HU-21 ya deriva. La tolerancia "mismo día válido" también conviene confirmarla.

---

## 2) Garantía de anticipo (alta) — monto auto-derivado read-only

**Qué:** en el paso *"Garantías, penalizaciones y amortización"* del alta, al elegir **tipo de póliza = Anticipo** el monto se **auto-llena** y queda **read-only**: `monto = (% de anticipo) × (monto del contrato)`. Ejemplo guía: **30 % de $1,000,000 = $300,000**.

**Dónde:** `frontend/src/pages/AltaContrato.jsx` (componente `AltaContrato` + sub-componente `TabGarantias`). **Frontend-puro**; el backend (`contratos.controller.js`, congelado) ya valida `monto ≤ monto del contrato` y persiste el monto tal cual — el derivado siempre lo cumple.

**Cómo (3 piezas):**
1. **`useEffect` de sincronía** en el padre (deps `[anticipoPct, montoDerivado]`): cuando cambia el % de anticipo o el monto del contrato, recalcula el monto de **cada** póliza tipo Anticipo en el `state` `garantias`. Usa el setter funcional (lee `prev`, sin meter `garantias` en deps) y un guard `cambio` para devolver `prev` sin cambios y **evitar el bucle de render**.
2. **`onChange` del `select` de tipo**: al elegir `Anticipo`, hace `onPatch(i, { tipo, monto: derivado })` en el mismo tick (porque el `useEffect` no se dispara con un cambio solo de `garantias`); para cualquier otro tipo, `onPatch(i, { tipo })`.
3. **Input de monto**: cuando la fila es Anticipo se pinta `readOnly` (fondo gris) con un hint "Derivado: N% × monto del contrato (no editable)" (`data-testid="garantia-monto-derivado-i"`). El `value` sale del `state` (que ya está sincronizado), así que `validarPaso(4)` y el payload de guardado leen el monto derivado correcto.

Se cableó el prop `onPatch={mkPatch(setGarantias)}` (el helper `mkPatch` ya existía).

**Por qué el monto vive en el `state` (y no solo visual):** `validarPaso(4)` lee `g.monto` para sus reglas (`> 0`, `≤ montoDerivado`, fianza de anticipo obligatoria si `%>0`) y el payload de guardado usa `g.monto`. Por eso el derivado se **escribe al state**, no solo se muestra.

**Núcleo intacto:** no se tocó `validarPaso` (1206–1338) ni la navegación lineal (`irAPaso`, `pasoMaxAlcanzado`, `tabsBloqueados`). El derivado = `montoContrato × ap/100` con `ap ∈ [0,100]` da `∈ [0, montoContrato]`, así que **siempre** pasa la barrera `monto ≤ monto del contrato` (con `ap=100` da `= montoContrato`, y la comparación de "excede" es estricta `>`).

**Fundamento:** art. 48 fr. I LOPSRM (la fianza de anticipo garantiza **la totalidad** del monto de los anticipos) + art. 50 LOPSRM (% de anticipo). El monto de la fianza = anticipo otorgado = `% × monto del contrato`.

**Ajuste colateral (tests):** el helper `altaLlenarGarantias({conAnticipo})` y el spec `alta-v5-navegacion-lineal (3c)` **ya no teclean** el monto del anticipo (es read-only); el caller fija `anticipo-input` (>0) antes y el monto se deriva solo.

---

## 3) Registro de usuario — nombre(s) y apellido(s) en dos campos obligatorios

**Qué:** el registro captura **dos campos obligatorios separados** — *"Nombre(s)"* y *"Apellido(s)"*. Al guardar se **concatenan** en el campo `nombre` existente. **No se rompe** ningún lugar que muestre el nombre ni el backfill demo: la columna `usuarios.nombre` (fuente única), el JWT, `login`, `SesionContext` y los ~7+ displays/JOINs leen el mismo `nombre` concatenado, sin cambios.

**Dónde (frontend-puro, 2 formularios):**
- `frontend/src/pages/SeleccionRol.jsx` → `FormRegistro` (vista por defecto del login; testids `reg-nombres` / `reg-apellidos`).
- `frontend/src/pages/SolicitudRegistro.jsx` → página pública `/solicitud-acceso` (testids `sol-nombres` / `sol-apellidos`).

**Cómo (en ambos):**
1. Un solo `state` `nombre` → dos estados `nombres` y `apellidos`.
2. Validación: si falta `nombre(s)` → *"Captura tu(s) nombre(s)."*; si falta `apellido(s)` → *"Captura tu(s) apellido(s)."* (ambos obligatorios por separado).
3. Concatenación: `const nombre = \`${nombres.trim()} ${apellidos.trim()}\`.replace(/\s+/g, ' ').trim();` y se envía a `api.register({ nombre, ... })` **exactamente como antes**.
4. Se conserva `esNombreCompleto(nombre)` sobre el concatenado (espejo del candado del backend, ≥2 palabras) como cinturón-y-tirantes.

**Backend: intacto.** `auth.controller.js` (zona congelada) sigue recibiendo el mismo campo `nombre` y aplicando su validación `esNombreCompleto`. No se partió la columna ni se tocó el seed/backfill demo.

**Fundamento:** art. 123 RLOPSRM (el nombre completo del personal aparece en la bitácora).

---

## 4) Pruebas

**Specs nuevos**
- `frontend/e2e/pago-fecha-integrada.spec.js` (API-directa): siembra contrato + PDF firmado + estimación integrada, luego:
  - **RECHAZO**: `fecha_pago` anterior a `integrada_en` → **400** con mensaje sobre la integración.
  - **FELIZ**: `fecha_pago` = día de integración → **201** e `importe = neto` (cálculo intacto).
  - **FELIZ**: `fecha_pago` posterior → **201**.
- `frontend/e2e/garantia-anticipo-autofill.spec.js` (UI): **30 % × $1,000,000 = $300,000** auto-llenado, **read-only**, reactivo al % (10 % → $100,000); una póliza no-anticipo conserva el monto editable.

**Specs actualizados**
- `frontend/e2e/hu-registro.spec.js`: flujo completo con los dos campos separados (prueba la concatenación end-to-end vía el nombre del header); test reescrito *"exige nombre(s) Y apellido(s) por separado"* (falta apellido → error; falta nombre → error).
- `frontend/e2e/_helpers.js` (`altaLlenarGarantias`) y `frontend/e2e/alta-v5-navegacion-lineal.spec.js` (3c): el monto del anticipo ya no se teclea (es derivado read-only); (3c) ahora **verifica** el derivado (`20 % × $5,000 = $1,000`).

**Resultado:** `npx playwright test` (stack Docker local) → **184 passed · 8 skipped · 0 failed** (los 8 son `test.fixme` conocidos de los forms de HU-12/HU-21 pendientes de cablear). `vite build` (gate de CI) OK.

---

## 5) Runbook (local; sin deploy)

Sin cambio de esquema → **sin migración**. Cambio de backend → reinicio del contenedor (no auto-recarga); cambios de frontend → Vite HMR.

```powershell
# 1) Stack local (engine de Docker arriba)
docker compose up -d                 # db (5432), backend (4000), frontend (5173)
docker restart sigecop_backend       # backend NO auto-recarga: recargar tras editar su código

# 2) Verificar que responden
#    backend: POST /api/auth/login {} -> 400 (vivo) ; frontend: http://localhost:5173 -> 200

# 3) Suite e2e (desde frontend/, con el stack arriba)
cd frontend
npx playwright test                                  # suite completa
npx playwright test e2e/pago-fecha-integrada.spec.js e2e/garantia-anticipo-autofill.spec.js e2e/hu-registro.spec.js   # solo lo de este pase

# 4) Gate de CI
npm run build                                         # vite build (los e2e NO corren en CI)
```

**Si más adelante se despliega** (lo coordina Maiki, NO ahora): no hay migración de esquema; basta `push` a `main` (auto-deploy Render). La validación de pago es lógica aditiva server-side; verificar el smoke de HU-21 contra el esquema vigente antes de empujar.

---

## 6) Archivos tocados

| Archivo | Tipo | Cambio |
|---|---|---|
| `backend/src/controllers/pagos.controller.js` | backend (no congelado) | `integrada_en` en SELECT + validación 400 de fecha |
| `frontend/src/pages/AltaContrato.jsx` | frontend | `useEffect` de sincronía + `TabGarantias` (select/monto derivado read-only) + cablear `onPatch` |
| `frontend/src/pages/SeleccionRol.jsx` | frontend | split nombre(s)/apellido(s) + concatenación |
| `frontend/src/pages/SolicitudRegistro.jsx` | frontend | split nombre(s)/apellido(s) + concatenación |
| `frontend/e2e/pago-fecha-integrada.spec.js` | test (nuevo) | pago vs `integrada_en` |
| `frontend/e2e/garantia-anticipo-autofill.spec.js` | test (nuevo) | garantía anticipo derivada |
| `frontend/e2e/hu-registro.spec.js` | test | nuevos testids + test de campos separados |
| `frontend/e2e/_helpers.js` | test | `altaLlenarGarantias`: anticipo derivado |
| `frontend/e2e/alta-v5-navegacion-lineal.spec.js` | test | (3c) verifica el derivado |

Parche completo: `docs/PLAN2_PASE3_validaciones_formularios.patch`.
