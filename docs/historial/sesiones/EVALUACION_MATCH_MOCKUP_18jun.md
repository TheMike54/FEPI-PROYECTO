# EVALUACIÓN — ¿"match total" con el mockup aprobado? (análisis, NO ejecución) · 18-jun-2026

> **Encargo de Maiki:** evaluar con criterio (no ejecutar) qué tanto conviene alinear la navegación real con
> los mockups aprobados (`docs/mockups/sigecop-modo-sistema.html` = navegación; `sigecop-prototipo-ciclos.html`
> = ciclos/wizards), a **6 días de la entrega**. Clasificación **VERDE / AMARILLO / ROJO** + recomendación
> honesta. **Nada implementado.** Local. El alcance lo decide Maiki tras leer esto.

## 0. Resumen de una línea
El **marco** (guinda, grupos, acordeón, Inicio por rol, barra superior) **ya coincide** con `modo-sistema`. Lo
que quedó "a medias" son **residuos**: el item **"Recorrido por bloques" en 6 flujos** (que **NO existe en
ninguno de los dos mockups**) y dos flujos cuyo wizard no está en el padre (Bitácora, Pago-registrar). **Casi
todo el match seguro es quitar residuos (VERDE).** Lo que obligaría a tocar gating o pantallas de otra HU es
**poco beneficio / más riesgo** y conviene **dejarlo para después de la entrega**.

---

## 1. AUDITORÍA 1:1 — mockup vs sistema real

### 1.A Marco de navegación (`sigecop-modo-sistema.html` ↔ `Sidebar.jsx` / `AppShell.jsx`)
| Elemento del mockup | Estado en el real | Diferencia |
|---|---|---|
| Sidebar **guinda institucional** | ✅ idéntico | — |
| Grupos **Flujos / Vistas ejecutivas / Administración** | ✅ idéntico | `GRUPOS` en `Sidebar.jsx` |
| Sub-pasos **colapsables (acordeón)** con chevron ▸/▾ | ✅ idéntico | `data-accordion-toggle` |
| **Inicio por rol** (tarjetas agrupadas, no 24 HU sueltas) | ✅ idéntico | — |
| **Barra superior**: chip de empresa · 🔔 campana · ✍️ Por firmar · salir | ✅ idéntico | — |
| Indicador discreto de **HU** de la pantalla | ✅ idéntico | — |
| **"Recorrido por bloques"** como item | ❌ **NO está en el mockup** | El real lo tiene de más (6×) → **residuo** |

### 1.B Ciclos / wizards (`sigecop-prototipo-ciclos.html` ↔ páginas reales)
> El mockup de ciclos clasifica cada flujo como **wizard** (pasos), **pantalla** o **visor**, en una **lista
> plana** (sin acordeón) y **sin** "Recorrido por bloques".

| Flujo (mockup: tipo) | Pasos del mockup | Estado real | Diferencia |
|---|---|---|---|
| **Alta de contrato** (wizard) | 7 pasos | ✅ **idéntico** (`AltaContrato`, wizard 7 pasos en el padre) | — |
| **Ciclo de estimación** (wizard) | Periodo · Generadores · Carátula · Soportes/notas · Integrar y presentar | ✅ **idéntico** (`IntegracionEstimacion`, mismos 5 pasos, en el padre `/estimaciones/integracion`; cascarón redirige; sin "Recorrido") | — (es el modelo ya logrado) |
| **Bitácora** (wizard) | Apertura · Firma · Emitir (+ Consulta/Minutas en paralelo) | 🟡 **parcial** | El wizard real existe (`AmbienteBitacora`, mismos pasos + paralelos) pero vive en `/bitacora/ambiente` (sub-item "Recorrido"), **no en el padre** (que es `/bitacora/apertura`, HU-08) |
| **Pago y tránsito** (wizard) | Suficiencia · Soportes · Instrucción · **Registrar pago** | 🟡 **parcial** | El padre `/pagos/transito` ya es wizard de **3 pasos** (Suficiencia/Soportes/Instrucción) + **enlace** a Registrar pago (HU-21, pantalla aparte). El mockup mete "Registrar pago" como **4º paso dentro** del wizard. Además sobra el item "Recorrido" (`/pagos/ambiente`, macro) |
| **Avance y seguimiento** (pantalla) | Registrar (+ Curva/Alertas en paralelo) | 🟡 **parcial** | Padre `/seguimiento/trabajos-terminados` (HU-06) + Curva/Alertas como sub-items = correcto para "pantalla". Sobra el item "Recorrido" (`/seguimiento/ambiente`) |
| **Convenios** (pantalla) | — | 🟡 **parcial** | Padre `/contratos/modificatorios` (HU-03) correcto. Sobra "Recorrido" (`/contratos/convenio-ambiente`) |
| **Cierre / finiquito** (pantalla) | — | 🟡 **parcial** | Padre `/contratos/finiquito` (HU-24) correcto. Sobra "Recorrido" (`/contratos/cierre`) |
| **Expediente** (visor) | — | 🟡 **parcial** | Padre `/contratos/expediente` (HU-04) correcto. Sobra "Cierre documental (por bloques)" (`/contratos/expediente-ambiente`) |
| **Portafolio / Tablero / Reportes / Ciclo de vida** (pantalla) | — | ✅ **idéntico** | — |
| **Administración** (Padrón / Roster / Solicitudes) | — | ✅ **idéntico** | — |
| **Lista PLANA de ciclos** (sin acordeón) | — | 🟡 **difiere a propósito** | El real usa **acordeón** (grupos + sub-items colapsables) porque sigue el OTRO mockup aprobado (`modo-sistema`). Los dos mockups no coinciden entre sí en esto |

---

## 2. Por cada diferencia: ¿match total? SÍ/NO + por qué (riesgo · esfuerzo · specs · beneficio a 6 días)

### D1 — Quitar "Recorrido por bloques" de los 6 flujos
- **¿Match total? SÍ.** No está en NINGÚN mockup; es residuo de la tanda "7 ambientes".
- **Riesgo:** BAJO — solo `Sidebar.jsx` (presentación/navegación). NO toca gating, lógica ni backend (las rutas `/.../ambiente` siguen existiendo, solo salen del menú).
- **Esfuerzo:** BAJO (borrar 6 entradas del array `GRUPOS`).
- **Specs:** rompe ~3 (`ambiente-bitacora`, `ambiente-avance`, `ambiente-pago` navegan por el sidebar con `goToViaSidebar`/`sidebarLinkFor`). Arreglo trivial: cambiarlos a `page.goto('/.../ambiente')` (las rutas existen), igual que ya se hizo con `fase5-ambiente-estimacion`. Es test, no lógica.
- **Beneficio:** ALTO — elimina exactamente la inconsistencia que notaste; deja el sidebar igual al mockup y consistente con Estimación.
- **Veredicto: SÍ, recomendado.**

### D2 — Bitácora: que el PADRE sea el wizard (no `/bitacora/apertura`)
- **¿Match total? PARCIAL/condicionado.** El mockup marca Bitácora como wizard; el wizard real existe pero en el sub-item.
- **Riesgo:** MEDIO — para que el padre apunte al wizard hay que cambiar su definición de `{ hu:'HU-08' }` (gateado por `nivelDe('HU-08')`) a `{ ruta:'/bitacora/ambiente', roles:T }` (gateado por lista de roles). Es **equivalente en la práctica** (residente/contratista/supervisión), pero **técnicamente cambia cómo se resuelve el gating** del item — y pediste no tocar gating.
- **Esfuerzo:** BAJO-MEDIO. **Specs:** podría afectar specs de navegación de bitácora.
- **Beneficio:** MEDIO (match literal "bitácora = wizard"). Pero la bitácora ya es funcional vía padre (Apertura) + sub-pasos; el wizard envolvente es un "extra" guiado.
- **Veredicto: NO ahora (dejar para después).** Si lo quieres literal, es una decisión tuya por el matiz de gating.

### D3 — Pago: "Registrar pago" como 4º PASO dentro del wizard (no enlace a HU-21)
- **¿Match total? NO conviene tal cual.**
- **Riesgo:** MEDIO-ALTO — embeber `RegistroPago` (HU-21, con su propio formulario, validaciones y gating: importe=neto, no-doble-pago, fecha ≥ integración) como paso del wizard de HU-20 mezcla dos HU y toca la pantalla/specs de HU-21.
- **Esfuerzo:** MEDIO-ALTO. **Specs:** afecta `hu-21-registro-pago`, `pago-fecha-integrada`, `pago-wizard`.
- **Beneficio:** BAJO — el **enlace** "Ir a registrar el pago" ya encadena el flujo; el usuario llega igual. La separación incluso es defendible (HU-21 es otro acto, de finanzas).
- **Veredicto: NO (dejar para después de la entrega).**

### D4 — Sidebar PLANO (estilo `prototipo-ciclos`) en vez de acordeón
- **¿Match total? NO conviene.** Los dos mockups aprobados se contradicen: `modo-sistema` = acordeón (lo que ya tienes), `prototipo-ciclos` = lista plana.
- **Riesgo:** MEDIO (rehacer el render del sidebar). **Esfuerzo:** MEDIO. **Beneficio:** BAJO — el real **ya coincide** con un mockup aprobado (`modo-sistema`); aplanarlo perdería la navegación por sub-pasos (Presentar/Revisión/Historial, Consulta/Minutas) que es útil.
- **Veredicto: NO (es churn sin beneficio; ya matchea modo-sistema).**

### D5 — Lo que YA está idéntico (Alta, Estimación, Vistas, Administración, marco guinda)
- **Veredicto: nada que hacer.** ✅

---

## 3. Clasificación VERDE / AMARILLO / ROJO

| Cambio | Color | Por qué |
|---|---|---|
| **D1** Quitar "Recorrido por bloques" (6 items) + arreglar 3 specs a `page.goto` | 🟢 **VERDE** | Solo presentación; cero gating/lógica/backend; match exacto a ambos mockups; cierra tu queja. Recomendado. |
| **D2** Bitácora padre = wizard | 🟡 **AMARILLO** | Beneficio medio pero **cambia la resolución de gating del padre** (dijiste no tocar gating). Solo si tú lo apruebas; si no, dejar. |
| **D3** Pago "Registrar pago" como 4º paso | 🔴 **ROJO** | Mezcla HU-20/HU-21, toca pantalla y specs de HU-21, beneficio bajo (el enlace ya funciona). |
| **D4** Sidebar plano (ciclos) en vez de acordeón | 🔴 **ROJO** | El real ya matchea `modo-sistema`; aplanar pierde sub-navegación y es churn. |
| **D5** Alta/Estimación/Vistas/Admin/marco | 🟢 **VERDE (ya hecho)** | Idénticos. |

---

## 4. Recomendación final (honesta, a 6 días de la entrega)

**SÍ haría (seguro, antes de entregar) — solo esto:**
- **D1:** quitar los 6 "Recorrido por bloques"/"Cierre documental" del `Sidebar.jsx` y arreglar los 3 specs
  `ambiente-*` para que naveguen por URL (`page.goto`). Es ~10–15 min, riesgo bajísimo, y deja la navegación
  **consistente con Estimación y con AMBOS mockups**. Es el 90% del "match" que percibes que falta, sin tocar
  nada sensible. Tras el cambio: `vite build` + correr la suite (debe seguir verde).

**NO haría ahora (riesgo/beneficio malo a 6 días):**
- **D3** (Pago registrar-pago como paso embebido) y **D4** (aplanar el sidebar). Tocan zona sensible o son
  churn sin beneficio real para el profe.

**Dejaría para DESPUÉS de la entrega (decisión tuya):**
- **D2** (Bitácora padre = wizard): es un “lindo de tener” que toca el matiz de gating del padre; mejor con
  calma post-entrega. Mientras tanto, con D1 hecho, Bitácora queda como padre (Apertura) + sub-pasos
  (Por firmar/Emitir/Consultar/Minutas) — completa y limpia.

**En una frase:** con **solo D1** cierras la inconsistencia que viste y quedas alineado al mockup de forma
segura; D2 es opcional/post-entrega; D3 y D4 no convienen. Cuando decidas el alcance, te paso el plan a
ejecutar (probablemente solo D1).

---

*Evaluación leída del sistema real (`Sidebar.jsx`, `App.jsx`, páginas `Ambiente*`, los wizards) y de los dos
mockups aprobados. Nada implementado. El "Recorrido por bloques" no aparece en ninguno de los dos mockups: es
residuo de la tanda transicional de "7 ambientes", no parte del diseño objetivo.*
