# PLAN DE EJECUCIÓN — match con `sigecop-prototipo-ciclos.html` (para aprobación de Maiki) · 18-jun

> **Para que Maiki lo revise ANTES de ejecutar.** NADA implementado. Local, sin push. Basado en un
> **re-análisis read-only del código real** (workflow `whjyup4ib`, 10 agentes: 7 de mapa + 3 adversariales),
> **reconciliado** contra el estado verificado (los wizards ya construidos esta ronda). Alcance YA decidido por
> Maiki (no se re-evalúa): sidebar plano + stepper por ciclo + "en paralelo" para TIPO B · Pago = HU-21
> embebido como 4º paso · Bitácora padre = wizard · quitar los 6 "Recorrido por bloques".

## 0. Hechos del re-análisis que mandan sobre el plan
- **El gating TIPO A es 100% server-side** (verificado: emisión exige firma `bitacora.controller:573`, presentar
  exige 'integrada', pago exige 'autorizada' `pagos.controller:72`, etc.). → Mover navegación **NO** puede
  romper el orden legal. El stepper de la UI es **espejo** del candado, no el candado.
- **`zona congelada intacta`** (verificado por la pasada adversarial): `permisos.js`, `acceso.js`,
  `auth.middleware.js` sin cambios. Bitácora-padre-wizard y Pago-HU21-paso-4 son **solo presentación**.
- **DE-RISKER CLAVE:** el helper `e2e/_helpers.js:expandirSidebarHasta` (L74-86) **ya hace early-return si el
  link está visible** (`if (await link.isVisible()) return`). → Si el sidebar plano deja los items de CICLO
  **siempre visibles**, las **~58 specs que navegan con `goToViaSidebar` a rutas-PADRE siguen verdes** sin tocar
  el helper. Solo rompen las que asertan **sub-items** en el sidebar y las `ambiente-*`.
- **Conteo real de specs (riesgo):** **31 asertan** el sidebar (`aside a[href]`), **58 navegan** por él. De las
  31, las que asertan **rutas-PADRE** (alta, integracion, transito, apertura, expediente, portafolio, tablero…)
  sobreviven; rompen las que asertan **sub-items que saldrán del sidebar** (≈10: hu-09/10/11/13/14/15/05/07/21/02)
  + las **6 `ambiente-*`** (su item se quita).
- **TIPO B (regla de oro):** Consultar(HU-10), Minutas(HU-11), Historial(HU-14), Revisión(HU-15), Reingreso(HU-16),
  Curva(HU-05), Alertas(HU-07), Tablero(HU-17), Expediente(HU-04) — **nunca se condicionan a un paso/candado**;
  solo a contrato + participación; estado vacío si no hay datos, nunca error. El modelo correcto YA existe en
  `AmbienteBitacora.jsx` (sección "En paralelo" renderizada incondicionalmente, L210-233).

## 1. Objetivo por ciclo (del mockup) — el "hecho" se mide contra esto
| Ciclo | tipo | Pasos (stepper TIPO A) | En paralelo (TIPO B) |
|---|---|---|---|
| Alta | wizard | Datos→Catálogo→Programa→Jurídicos→Garantías→Plan→PDF | — |
| Estimación | wizard | Periodo→Generadores→Carátula→Soportes→Integrar y presentar | Revisión(15)·Reingreso(16)·Historial(14)·Tablero(17) |
| Bitácora | wizard | Apertura→Firmas→Emitir | Consultar(10)·Minutas(11) |
| Pago | wizard | Suficiencia→Soportes→Instrucción→**Registrar pago(21)** | — |
| Avance | pantalla | Registrar avance | Curva(05)·Alertas(07) |
| Convenios | pantalla | Convenio (registrar+autorizar) | — |
| Finiquito | pantalla | Cierre / finiquito | — |
| Expediente | visor | — (todo lectura) | Expediente(04) |
| Sidebar | — | **Lista PLANA**: Ciclos (8) · Vistas ejecutivas (3) · Administración (3); sin acordeón, sin "Recorrido" | — |

---

## 2. FASES EN ORDEN DE EJECUCIÓN (menor → mayor riesgo; checkpoint de suite verde entre cada una)

> **Regla de cada fase:** (a) cambio → `cd frontend && npx vite build` → `npx playwright test <afectados>` →
> **suite completa** → captura comparada con el mockup. (b) **Done** = suite verde + captura ≈ mockup. (c)
> **Parada segura:** si un checkpoint deja la suite roja y NO se recupera en el mismo paso, **`git checkout`
> de los archivos de esa fase** (todo es local), se reporta y se detiene — NO se sigue a la siguiente fase.

### FASE 0 — DOCUMENTO PRIMERO (contrato de comportamiento) · 🟢 · ~0.5 h
- **Qué:** añadir a `docs/requisitos/HISTORIAS_POR_CICLOS.md` la **clasificación TIPO A/B por HU + condición
  de desbloqueo + la regla de oro** (la §1 del `ESTUDIO_FACTIBILIDAD_WIZARDS_PARALELOS_18jun.md`). Es el contrato
  escrito ANTES de mover navegación.
- **Toca:** 1 doc. **Specs:** 0. **Done:** doc revisable por el profe. **Parada:** n/a (no es código).

### FASE 1 — Quitar los 6 "Recorrido por bloques" del Sidebar · 🟢 · ~1 h
- **Qué:** borrar de `Sidebar.jsx` los 6 sub-items (L56 `/bitacora/ambiente`, L61 `/seguimiento/ambiente`, L65
  `/pagos/ambiente`, L68 `/contratos/convenio-ambiente`, L71 `/contratos/cierre`, L74 `/contratos/expediente-ambiente`).
  Las **rutas en `App.jsx` se conservan** (siguen accesibles por URL; NO se tocan).
- **Specs a reescribir (6):** `ambiente-bitacora`, `ambiente-avance`, `ambiente-pago`, `ambiente-convenio`,
  `ambiente-finiquito`, `ambiente-expediente` → cambiar `goToViaSidebar('/.../ambiente')`/`sidebarLinkFor` por
  `page.goto('/.../ambiente')` (patrón ya usado en `fase5-ambiente-estimacion.spec.js`). Quitar la aserción
  "el link aparece en el sidebar".
- **Verificar TIPO B:** n/a ("Recorrido" no es TIPO B). **Done:** build + suite verde; los 6 ambientes siguen
  abriendo por URL. **Parada:** revertir las líneas del Sidebar.

### FASE 2 — Ciclos "pantalla/visor": Avance · Convenios · Finiquito · Expediente · 🟢 · ~1–2 h
- **Qué:** son `pantalla`/`visor` en el mockup → el padre ya es la pantalla correcta. Único trabajo real:
  **Avance** debe exponer **Curva(05)/Alertas(07) como "en paralelo" DENTRO** de su pantalla de entrada
  (`AmbienteAvance.jsx` ya los tiene como sección paralela; confirmar que se renderizan siempre, sin candado).
  Convenios/Finiquito/Expediente: nada salvo lo ya hecho en F1.
- **Toca:** `AmbienteAvance.jsx` (mínimo, solo asegurar "en paralelo" siempre visible). **Specs:** ninguno nuevo
  (las HU-05/07 siguen en el sidebar hasta F5). **Verificar TIPO B:** Curva/Alertas accesibles aunque no haya
  avance registrado, con estado vacío. **Done:** suite verde + captura avance ≈ mockup ("Registrar" + 2 botones
  paralelos). **Parada:** revertir `AmbienteAvance.jsx`.

### FASE 3 — Bitácora: padre del flujo = el WIZARD · 🟡 · ~1 h
- **Qué:** en `Sidebar.jsx`, el flujo "Bitácora" hoy apunta a `/bitacora/apertura` (HU-08); cambiarlo para que
  el **padre lleve al wizard** `/bitacora/ambiente` (donde vive el stepper Apertura→Firma→Emitir + la sección
  paralela Consulta/Minutas, ya construido y verificado, L210-233 siempre visible). Apertura/Emisión quedan
  como pasos del wizard; Consulta/Minutas como "en paralelo".
- **Matiz (avisado):** el item del padre pasa de `{hu:'HU-08'}` (gateado por `nivelDe('HU-08')`) a
  `{ruta:'/bitacora/ambiente', roles:T}` (gateado por lista de roles). Es **equivalente** (residente/contratista/
  supervisión) y vive en `Sidebar.jsx`, **NO en permisos.js** — pero es el único cambio que toca *cómo se
  resuelve* el gating de un item. Si prefieres no tocarlo, esta fase se omite y Bitácora queda como F1 la dejó.
- **Specs:** los de navegación de bitácora (`bitacora-v2`, `hu-08/09/10/11`, `ambiente-bitacora` ya en F1) —
  validar que `/bitacora/apertura`, `/bitacora/notas`, etc. siguen abriendo (rutas intactas).
- **Verificar TIPO B:** Consulta/Minutas siempre accesibles (sección paralela incondicional). **Done:** suite
  verde + captura ≈ mockup. **Parada:** revertir la línea del padre en `Sidebar.jsx`.

### FASE 4 — Estimación: "en paralelo" DENTRO del ciclo · 🟡 · ~1–1.5 h
- **Qué:** en `IntegracionEstimacion.jsx` (el wizard, padre del ciclo) añadir un bloque **"En paralelo"**
  (patrón de `AmbienteBitacora`) con enlaces a **Revisión(15)/Reingreso(16)/Historial(14)/Tablero(17)** —
  rutas existentes `/estimaciones/revision|reingreso|historial|tablero`, **sin candado**, siempre visibles.
  `link-presentar` (HU-13) queda como acción del paso 5 (ya está).
- **Toca:** `IntegracionEstimacion.jsx` (añadir el bloque de enlaces). **NO** fusionar componentes (bajo riesgo).
  **Specs:** ninguno rompe aún (las rutas siguen en el sidebar hasta F5; el bloque es additivo).
- **Verificar TIPO B:** Historial/Revisión accesibles aunque no haya estimación integrada (estado vacío).
  **Done:** suite verde + captura ≈ mockup. **Parada:** revertir `IntegracionEstimacion.jsx`.

### FASE 5 — SIDEBAR PLANO (lista de ciclos; quitar acordeón y sub-items) · 🔴 · ~4–6 h
- **Qué:** reescribir el render de `Sidebar.jsx` a **lista plana**: los ciclos PADRE como `nav-item` directos
  (Ciclos 8 · Vistas 3 · Administración 3); **quitar el acordeón** (chevron `data-accordion-toggle`, `toggle`,
  `abiertos`) y **los sub-items** (Presentar/Revisión/Reingreso/Historial, Por firmar/Emitir/Consultar/Minutas,
  Curva/Alertas, Registro). Esas TIPO B ya quedaron accesibles **dentro de cada ciclo** (F2-F4) → no se pierden.
- **DE-RISKER:** mantener los items de ciclo **siempre visibles** → `expandirSidebarHasta` hace early-return
  (link visible) → **las ~58 specs que navegan a rutas-PADRE siguen verdes** sin tocar el helper.
- **Specs a reescribir (~10–15):**
  - Las que asertan **sub-item en el sidebar** (`aside a[href="/bitacora/notas|consulta|minutas"]`,
    `/estimaciones/envio|historial|revision|reingreso`, `/seguimiento/curva-avance|alertas`, `/pagos/registro`,
    `/contratos/fianzas`): cambiar la aserción "aparece en el sidebar" por "aparece como **botón 'en paralelo'
    dentro del ciclo**" (o quitar esa aserción y conservar la de acceso por ruta). Archivos: `hu-02,05,07,09,10,
    11,13,14,15,21` + `nav-modo-sistema`, `nav-diseno-screens` (aserciones de acordeón/chevron).
  - Las `ambiente-*` ya se arreglaron en F1.
- **Pre-check obligatorio:** un **smoke test del helper** (`expandirSidebarHasta` no rompe con sidebar plano) y
  correr la suite COMPLETA. **Verificar TIPO B:** test que cada TIPO B tenga enlace accesible **por rol** desde
  su ciclo. **Done:** suite verde + captura sidebar ≈ mockup (plano). **Parada:** `git checkout Sidebar.jsx` +
  los specs de la fase; reportar. (Es la fase con mayor probabilidad de checkpoint rojo.)

### FASE 6 — Pago: "Registrar pago" (HU-21) como 4º paso del wizard · 🔴 · ~3–4 h
- **Qué:** en `TransitoPago.jsx` añadir `{key:'registro', label:'Registrar pago'}` a `PASOS_PAGO` (3→4 pasos) y
  un paso `wstep-pago-registro` que **incrusta el formulario de HU-21** (campos de `RegistroPago.jsx`). El
  `link-registrar-pago` del paso 3 se vuelve avance al paso 4.
- **Gating crítico (avisado):** HU-21 es **solo finanzas**, pero el wizard de HU-20 lo ven contratista/finanzas
  → el **botón "Registrar pago" del paso 4 se gatea a `rol==='finanzas'`** (gate de UI; el backend
  `pagos.controller` ya valida estado='autorizada' y no toca rol — confirmado). 
- **Backwards-compat (recomendado por el análisis):** **conservar la ruta `/pagos/registro`** (HU-21 como TIPO B
  paralela) para que los specs viejos de HU-21 sigan pasando; el paso 4 reusa la MISMA lógica (extraer a un hook
  compartido para no duplicar `POST /api/pagos`).
- **Specs:** `pago-wizard` (3→4 pasos), `hu-20-transito-pago` (flujo condicional), `hu-21-registro-pago`
  (mantener si se conserva la ruta). **Done:** suite verde + captura ≈ mockup (4 pasos). **Parada:** revertir
  `TransitoPago.jsx`.

---

## 3. Qué NO se toca (en NINGUNA fase)
- `frontend/src/data/permisos.js`, `auth.middleware.js`, `lib/acceso.js` — **gating de rol/participación/empresa
  intacto** (verificado).
- La **lógica de los controllers** y sus **candados server-side** (TIPO A). El stepper es su espejo.
- `schema.sql` y las DDL (no se agregan; las 4 de esta ronda ya están).
- Las **rutas de `App.jsx`** (se conservan todas; solo cambia el render del Sidebar y el contenido de algunas
  páginas para añadir el bloque "en paralelo"). *(Excepción posible F6: extraer un hook compartido del pago —
  sigue sin tocar gating.)*

## 4. Esfuerzo y recortables (a 6 días)
| Fase | Riesgo | Esfuerzo | ¿Recortable? |
|---|---|---|---|
| F0 Documento | 🟢 | ~0.5 h | No (barato y valioso) |
| F1 Quitar "Recorrido" | 🟢 | ~1 h | No (cierra la inconsistencia visible) |
| F2 Avance/Conv/Fin/Exp | 🟢 | ~1–2 h | Parcial |
| F3 Bitácora padre=wizard | 🟡 | ~1 h | **Sí** (omitible; toca matiz de gating) |
| F4 Estimación "en paralelo" | 🟡 | ~1–1.5 h | Parcial |
| **F5 Sidebar plano** | 🔴 | **~4–6 h** | **SÍ — recortable** (es el grueso del churn de specs) |
| **F6 Pago HU-21 paso 4** | 🔴 | **~3–4 h** | **SÍ — recortable** (toca otra HU) |
| | | **Total ~12–16 h** | |

- **Mínimo seguro (si el tiempo aprieta): F0 + F1 + F2** (~3 h) → sidebar sin residuo, avance con paralelos,
  todo verde; ~80% del "look" del mockup sin tocar zona sensible.
- **Recomendado si hay margen: + F3 + F4** (~6 h total) → bitácora-wizard de entrada + estimación con paralelos.
- **Solo con tiempo holgado / post-entrega: F5 (sidebar plano) y F6 (HU-21 paso 4)** — son los 🔴; el match
  visual del *armazón plano* y del *4º paso* a cambio del mayor churn de specs.

## 5. Cómo verifico cada checkpoint (criterio de "hecho")
1. `cd frontend && npx vite build` (CI) verde.
2. `npx playwright test <specs de la fase>` verde; luego **suite completa** (`--reporter=line`) ≈ 338/8/0.
3. **Captura** de la pantalla del ciclo tocado vs el mockup (`sigecop-prototipo-ciclos.html`) — adjunto la
   comparación.
4. **Regla de oro TIPO B:** para CADA vista TIPO B del ciclo, comprobar (por rol) que el enlace existe y abre,
   aunque el wizard esté incompleto o sin datos.
5. **Parada segura:** suite roja irrecuperable en el paso → `git checkout` de los archivos de esa fase + reporte;
   no avanzo.

---

> **Resumen para tu OK:** el rediseño es **factible y de bajo riesgo lógico** (gating server-side intacto; el
> helper de tests ya tolera el sidebar plano). El riesgo real es **churn de specs**, concentrado en **F5** y
> **F6** (las 🔴). Propongo ejecutar **F0→F4 con checkpoints** (alto valor, bajo riesgo) y **decidir F5/F6
> aparte** según el tiempo. **No ejecuto nada hasta tu OK** (dime el alcance: "todo", "hasta F4", o "solo F0-F2").

*Plan fundado en re-análisis read-only del código real (workflow `whjyup4ib`), reconciliado con el estado
verificado. Nada implementado. Local, sin push.*
