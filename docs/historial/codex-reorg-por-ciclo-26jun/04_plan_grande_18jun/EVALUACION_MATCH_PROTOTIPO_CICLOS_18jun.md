# EVALUACIÓN — match del sistema real vs `sigecop-prototipo-ciclos.html` (ÚNICO mockup válido) · 18-jun

> **Encargo de Maiki:** el único mockup definitivo es `docs/mockups/sigecop-prototipo-ciclos.html` (por
> ciclos). Evaluar — **sin implementar** — qué tan lejos está el real y si conviene el "match completo"
> (**sidebar plano + stepper interno por ciclo + botones "en paralelo"**) a **6 días de la entrega**.
> Clasificación VERDE/AMARILLO/ROJO + recomendación honesta. **Nada implementado.** Local.

## 0. Resumen de una línea
La **sustancia** del mockup (los **wizards con stepper**) ya existe en el real para Alta, Estimación, Pago y
Bitácora. Lo que **difiere de fondo es el ARMAZÓN de navegación**: el mockup es **lista plana de ciclos +
stepper arriba + "en paralelo" dentro de cada ciclo**; el real es **acordeón** (grupos + sub-items
colapsables) con las historias de lectura como **sub-items del sidebar**. Aplanar el sidebar es **solo
presentación**, pero es **ancho**: **31 specs asertan la estructura del sidebar** y **57 navegan por él** →
romper eso a 6 días es el riesgo real. **Recomendación: el match seguro es quitar el residuo "Recorrido por
bloques" (VERDE); el rediseño completo a sidebar plano conviene DESPUÉS de la entrega.**

---

## 1. DIFERENCIA DE ESTRUCTURA (confirmada)

| | Mockup `prototipo-ciclos` | Sistema real (`Sidebar.jsx`) |
|---|---|---|
| Sidebar | **Lista PLANA** de ciclos (un `nav-item` por flujo; sin acordeón, sin sub-items, sin "Recorrido") | **Acordeón**: grupos (Flujos/Vistas/Administración) con **sub-items colapsables** (chevron ▸/▾) |
| Dentro del ciclo | **Stepper** de pasos arriba (wizard) + sección **"En paralelo"** con botones a las historias de lectura | El ciclo abre en su pantalla; los pasos del wizard SÍ están dentro (los que son wizard); las lecturas viven como **sub-items del sidebar**, no dentro |
| Historias de lectura | Botones **"en paralelo"** DENTRO del ciclo (Revisión, Historial, Consulta, Minutas, Curva, Alertas) | **Sub-items del sidebar** (gateados por rol) |
| "Recorrido por bloques" | **No existe** | Existe en 6 flujos (residuo "7 ambientes") |

**Qué habría que cambiar para que el real quede como el mockup:**
1. **`Sidebar.jsx`:** reescribir `GRUPOS`/render a **lista plana** de ciclos (un item por flujo) — quitar el
   acordeón y TODOS los sub-items del sidebar.
2. **Reubicar** cada sub-item de lectura **DENTRO de su ciclo** como botón "en paralelo": Estimación →
   Revisión/Reingreso/Historial; Bitácora → Consulta/Minutas; Avance → Curva/Alertas; (Pago → Registrar pago
   como **paso**, no paralelo). Esto toca ~5 páginas (`IntegracionEstimacion`, `AmbienteBitacora`/bitácora,
   avance, etc.) para añadir esos enlaces internos — si no, esas pantallas quedan **inaccesibles** al salir del
   sidebar.
3. **Stepper interno:** ya está en los wizards (Alta, Estimación, Pago, Bitácora). Avance/Convenios/Finiquito =
   *pantalla*, Expediente = *visor* → sin stepper (correcto).
4. **Quitar** los 6 "Recorrido por bloques".

> Nota clave: aplanar el sidebar **no es solo borrar el acordeón** — obliga a **mover la navegación de las
> lecturas al interior de cada ciclo**. Ese "mover" es lo que dispara el costo y el riesgo en specs.

---

## 2. Ciclo por ciclo — ¿el real ya se comporta así?

| Ciclo | Tipo (mockup) | Estado real | Qué falta para el match |
|---|---|---|---|
| **Alta de contrato** | wizard | ✅ wizard 7 pasos en el padre | Nada (el stepper ya está). |
| **Ciclo de estimación** | wizard | ✅ wizard 5 pasos en el padre (`/estimaciones/integracion`); cascarón redirige; sin "Recorrido" | Solo si se aplana: mover Revisión/Reingreso/Historial de sub-items a "en paralelo" dentro. |
| **Bitácora** | wizard | 🟡 el wizard existe pero en `/bitacora/ambiente` (sub-item "Recorrido"); el padre es `/bitacora/apertura` (HU-08) | Padre = wizard + Consulta/Minutas "en paralelo". **Toca gating del padre** (nivelDe→roles). |
| **Avance y seguimiento** | pantalla | 🟡 padre `/seguimiento/trabajos-terminados` (HU-06) correcto como *pantalla*; Curva/Alertas son sub-items; sobra "Recorrido" | Quitar "Recorrido"; mover Curva/Alertas a "en paralelo" dentro. |
| **Pago y tránsito** | wizard | 🟡 padre = wizard 3 pasos (Suficiencia/Soportes/Instrucción) + **enlace** a Registrar pago; sobra "Recorrido" (`/pagos/ambiente`) | El mockup tiene **4º paso "Registrar pago"** (HU-21 embebido); en el real es pantalla aparte. Quitar "Recorrido". |
| **Convenios** | pantalla | ✅ padre `/contratos/modificatorios` (HU-03); sobra "Recorrido" | Quitar "Recorrido". |
| **Cierre / finiquito** | pantalla | ✅ padre `/contratos/finiquito` (HU-24); sobra "Recorrido" | Quitar "Recorrido". |
| **Expediente** | visor | ✅ padre `/contratos/expediente` (HU-04); sobra "Cierre documental" | Quitar el sub-item. |
| **Portafolio / Tablero / Reportes** | pantalla | ✅ idéntico | Nada. |
| **Administración** (Padrón/Roster/Solicitudes) | — | ✅ idéntico | Nada. |

> **Lectura:** la PARTE WIZARD (lo que da valor visible al profe) **ya coincide**. La diferencia restante es
> casi toda **dónde vive la navegación de las lecturas** (sidebar vs dentro del ciclo) + el residuo.

---

## 3. Riesgo y esfuerzo del match COMPLETO (sidebar plano + steppers + en paralelo)

| Cambio | ¿Toca gating/lógica/backend? | Archivos | Specs afectados | Esfuerzo | Color |
|---|---|---|---|---|---|
| **Quitar "Recorrido por bloques" (6)** | NO (solo `Sidebar.jsx`) | 1 + 3 specs (`page.goto`) | ~3 | ~15-30 min | 🟢 **VERDE** |
| **Aplanar el sidebar** (quitar acordeón + sub-items) | NO en sí, pero **rompe la navegación**: **31 specs asertan `aside a[href=…]`** (presencia/ausencia por rol) y **57 navegan con `goToViaSidebar`** | `Sidebar.jsx` + helpers de test | **~20-35** (las de acceso por rol + las que navegan a sub-items: notas×6, consulta×2, envio, minutas, fianzas, revision×4, …) | ~1 día (cambio + re-estabilizar suite, cada corrida ~10 min) | 🔴 **ROJO** (ancho; alto churn de specs) |
| **"En paralelo" dentro de cada ciclo** (mover lecturas al interior) | NO (presentación) pero toca **~5 páginas** | 5-6 páginas | varias (las que navegaban por sidebar a esas lecturas) | ~medio día | 🟡 **AMARILLO** |
| **Bitácora padre = wizard** | **SÍ (resolución de gating del padre)** | `Sidebar.jsx` | nav de bitácora | bajo | 🟡 **AMARILLO** |
| **Pago: 4º paso "Registrar pago" embebido (HU-21)** | **SÍ (mezcla HU-20/HU-21, su form/validaciones)** | `TransitoPago` + `RegistroPago` | `hu-21`, `pago-fecha-integrada`, `pago-wizard` | medio-alto | 🔴 **ROJO** |
| **Steppers de los wizards** | — ya hechos | — | — | 0 | 🟢 **VERDE (hecho)** |

**Por qué el aplanado es ROJO a 6 días:** no es "difícil" técnicamente (es presentación), es **ancho y
frágil**. La suite está verde (338/8/0) en parte porque **31 specs codifican la estructura actual del sidebar**
(qué HU aparece/no aparece por rol, navegación por acordeón). Cambiar el modelo de navegación obliga a
reescribir esas ~20-35 specs **a mano**, y cada error se detecta en corridas de ~10 min. El riesgo real:
**desestabilizar una suite verde y una navegación que YA funciona, justo antes de entregar**, por un cambio
**estético** (la sustancia —wizards— ya está).

---

## 4. Recomendación honesta (a 6 días)

**SÍ haría ahora (seguro):**
- 🟢 **Quitar los 6 "Recorrido por bloques"/"Cierre documental"** del sidebar + arreglar 3 specs a `page.goto`.
  Es el match de mayor valor visible y menor riesgo: deja el sidebar **sin residuo** y cada flujo con su padre
  → pantalla principal. ~15-30 min, suite sigue verde.

**NO haría antes de entregar (riesgo/beneficio malo):**
- 🔴 **El aplanado completo del sidebar** (lista plana + mover lecturas a "en paralelo"). Es el cambio más
  ancho y frágil (≈20-35 specs), y es **estético**: la funcionalidad del mockup (wizards con stepper) **ya
  está**. A 6 días, el riesgo de romper algo verde supera el beneficio.
- 🔴 **Pago: 4º paso embebido** (toca HU-21) y 🟡 **Bitácora padre=wizard** (toca gating). Mejor después.

**Dejaría para DESPUÉS de la entrega (proyecto coherente, con calma):**
- El **rediseño a sidebar plano + steppers + "en paralelo"** como una tanda dedicada: reescribir `Sidebar.jsx`,
  añadir los enlaces "en paralelo" en ~5 páginas, y **re-escribir las ~20-35 specs de navegación** con suite
  verde por checkpoint. Es ~1-1.5 días bien hechos, no un parche de última hora.

**La verdad sin adornos:** a 6 días, **el "match completo" NO conviene** — es un cambio de armazón amplio,
puramente presentacional, sobre una base que ya funciona y ya tiene los wizards. Con **solo quitar el residuo**
quedas alineado en lo esencial (cada ciclo lleva a su pantalla/wizard, sin "Recorrido"), sin arriesgar la
entrega. El sidebar seguiría siendo **acordeón** en vez de **plano** — diferencia visual, no funcional. Si
para el profe el *look* plano es imprescindible, lo hago, pero es **el cambio con más probabilidad de
romper algo verde** de todos los que hemos hablado, y lo correcto es agendarlo como tanda propia, no meterlo
con prisa.

> **Si decides el aplanado igual:** dímelo y te entrego primero un **plan por checkpoints** (Sidebar plano →
> suite; "en paralelo" por ciclo → suite; specs por tanda) para hacerlo sin dejar la suite roja en ningún punto.

---

*Evaluación leída del único mockup válido (`sigecop-prototipo-ciclos.html`: estructura `nav-item` plana,
`"tipo"` por ciclo, `"pasos"` y `"paralelo":[…]`) vs el sistema real (`Sidebar.jsx`, `App.jsx`, páginas y
wizards) y la suite e2e (conteo real de specs que dependen del sidebar). Nada implementado.*
