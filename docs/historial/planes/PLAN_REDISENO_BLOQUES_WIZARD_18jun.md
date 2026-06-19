# PLAN DE REDISEÑO — "un flujo = un wizard que integra sus historias" (bloques)

> **El hallazgo más fuerte.** Hoy cada flujo (Ciclo de estimación, Bitácora, Avance, Pago) aparece en el menú
> como **historias sueltas Y, al lado, un "Recorrido por bloques"** que es un **cascarón de enlaces** (no
> integra captura). Es confuso y "programar a lo menso". Maiki quiere que se vea **como el Alta de contrato**:
> un **wizard de pasos encadenados** que **integra** las historias de ese flujo en **una sola pantalla**, sin
> amontonar, y que el "recorrido por bloques" **deje de ser una pantalla aparte** y **sea** esa pantalla.
>
> **Mockup visual:** `docs/mockups/sigecop-rediseno-bloques.html` (ábrelo en el navegador). Compáralo con el
> actual `docs/mockups/sigecop-modo-sistema.html`.
>
> **Este plan NO se implementa aún** — es para que lo analices y fijes el alcance (idealmente escuchando de
> nuevo el audio del profe sobre "quitar lo innecesario porque todo va en una sola pantalla").

---

## 1. La idea en una frase
**Cada flujo principal es un WIZARD** (pasos numerados, gating secuencial) que **reusa los componentes de
captura que YA existen** y los presenta como pasos — exactamente el patrón del **Alta de contrato**. Las
pantallas de **solo lectura** (consultar, historial) **no se encadenan**: quedan **en paralelo**, siempre
accesibles.

> **Principio de oro (igual que en navegación):** el wizard **ENVUELVE y REUSA**; **no reescribe** la lógica
> ni el backend. Los componentes de captura (TabGeneradores, TabCarátula, formulario de notas, etc.) ya
> existen y funcionan — solo se **reordenan como pasos** y se les pone el gating del Alta.

---

## 2. Por qué el Alta de contrato es el modelo
`AltaContrato.jsx` ya tiene **todo el andamiaje reutilizable**:
- **Barra de pasos clicables** (1·Datos generales → 2·Catálogo → … → 7·PDF) con estado done/curr/todo.
- **Gating secuencial:** `tabActivo` + `pasoMaxAlcanzado` (solo avanzas si el paso actual es válido).
- **Semáforos de cuadre** (programa 100%, plan = anticipo) que habilitan/bloquean el avance.
- **Persistencia de captura** entre pasos sin perder lo tecleado.

> Reutilizar ese patrón evita reinventar; el wizard de cada flujo es "el Alta, con otros pasos".

---

## 3. Qué flujos se vuelven wizard (factibilidad) y cuáles NO

| Flujo | ¿Wizard? | Pasos propuestos | Notas |
|---|---|---|---|
| **Ciclo de estimación** | 🟢 **SÍ (insignia)** | Periodo → **Generadores** → Carátula → Soportes/Notas → **Integrar y Presentar** | La captura real ya existe en HU-12; el cascarón actual ya tiene los 7 bloques mapeados. |
| **Pago y tránsito** | 🟢 **SÍ** | Suficiencia (techo/partida) → Soportes (factura/CFDI/fianza) → Instrucción → **Registrar pago** | Ya es secuencial (HU-20→HU-21). |
| **Bitácora** | 🟡 **PARCIAL** | Apertura → **Firmar (3 partes)** → Emitir notas | **Consultar** y **Minutas** quedan **en paralelo** (lectura / episódico), NO en el wizard. |
| **Avance** | 🟡 **PARCIAL** | Registrar avance del periodo → (ver Curva / Alertas en paralelo) | Curva y Alertas son lectura → en paralelo. |
| **Convenios** | 🔴 **NO** | — | Es un **acto puntual** (un formulario + su autorización, ver Oleada 3 §6.2). Un wizard de 1 paso no aporta. |
| **Expediente** | 🔴 **NO** | — | Es un **visor de solo lectura** consolidado, no una captura encadenada. |

> **La excepción que pediste está cubierta:** *consultar bitácora no se puede bloquear*. En el rediseño,
> Consultar/Buscar y el Historial **viven fuera del wizard**, siempre accesibles (son lectura).

---

## 4. EL FLUJO INSIGNIA — Wizard de Estimación (a detalle)

### 4.1 Mapeo actual → nuevo
Hoy la captura está partida entre `IntegracionEstimacion.jsx` (real) y `AmbienteEstimacion.jsx` (cascarón de 7
bloques con placeholders). El wizard los **fusiona**:

| Paso del wizard | Reusa (ya existe) | Hoy estaba en |
|---|---|---|
| **1 · Periodo** | selector contrato + periodo | AmbienteEstimacion Bloque 1 |
| **2 · Generadores** | **`TabGeneradores`** (captura real de volumen/concepto, art. 132 fr. I) | HU-12 — **ya funciona** (el "pendiente E3" era falso, §4.1) |
| **3 · Carátula** | preview server-side (subtotal − amort − 5 al millar = neto) + semáforo de plan | HU-12 (TabCarátula) + Ambiente Bloque 3 |
| **4 · Soportes y notas** | vincular **notas firmadas** del periodo (real) + *(fotos: ver C-02)* | HU-12 (Notas vinculadas) + Ambiente Bloque 5 |
| **5 · Integrar y presentar** | candado de cierre + **Integrar** (HU-12) + **Presentar** (HU-13) | Ambiente Bloque 6/7 (hoy solo links) |

> Resultado: **una sola pantalla** "Nueva estimación" con 5 pasos clicables, que reemplaza tanto la pantalla de
> integración suelta como el cascarón "Recorrido por bloques".

### 4.2 La REVISIÓN/AUTORIZACIÓN (HU-15) es OTRO wizard, de otro actor
El ciclo no termina en presentar: **supervisión turna → residencia autoriza/rechaza**. Eso es de **otros
roles**, así que es un **wizard aparte** (gated a supervisión/residencia), no parte del wizard del contratista:

- **Paso A (supervisión):** revisar carátula/generadores → registrar observaciones (opcional) → **Turnar**.
- **Paso B (residencia):** revisar → **Autorizar** / **Rechazar (con motivo)**.

> **Fix que pediste (§ hallazgo 8c):** hoy el "turnar" vive **dentro del formulario** de observaciones (te deja
> llenar tipo/descripción y solo turnas al subir). En el wizard, **Turnar** es un **botón de acción del paso**,
> separado del formulario de observaciones (las observaciones son opcionales; turnar es la acción). Igual
> Autorizar/Rechazar.

### 4.3 Mockup ASCII del wizard de Estimación
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Nueva estimación · OBRA-2026-PRUEBA-FINAL                         HU 12–13     │
│  ① Periodo ──▶ ② Generadores ──▶ ③ Carátula ──▶ ④ Soportes ──▶ ⑤ Integrar      │
│  ●done        ●curr           ○todo          ○todo         ○todo                │
├──────────────────────────────────────────────────────────────────────────────┤
│  ② NÚMEROS GENERADORES (volumen ejecutado en el periodo)        art. 132 fr. I │
│  ┌────────┬───────────────────┬──────┬──────────┬──────────┬───────────────┐   │
│  │ Clave  │ Concepto          │ P.U. │ Cant.этого│ Importe  │ % acumulado   │   │
│  ├────────┼───────────────────┼──────┼──────────┼──────────┼───────────────┤   │
│  │ C-01   │ Limpieza y trazo  │  50  │ [ 1000 ] │ 50,000   │ ███████ 100%  │   │
│  │ C-02   │ Excavación        │ 200  │ [  250 ] │ 50,000   │ ███ 50%       │   │
│  └────────┴───────────────────┴──────┴──────────┴──────────┴───────────────┘   │
│  Subtotal del periodo: $100,000.00     ⚠ no excede lo planeado (art. 118) ✓     │
│                                            [ ← Periodo ]   [ Carátula → ]       │
└──────────────────────────────────────────────────────────────────────────────┘
```
*(El paso ③ Carátula muestra subtotal − amortización − 5 al millar = **neto**, con el semáforo del plan; ⑤
tiene el candado de confirmación + Integrar + Presentar.)*

---

## 5. Cómo se reconcilia con el SIDEBAR (navegación)
Hoy: `Ciclo de estimación` (padre) + sub: Presentar, Revisión, Reingreso, Historial, **Recorrido por bloques**.
Con el rediseño:

```
📐 Ciclo de estimación                (= el WIZARD "Nueva estimación", pasos 1-5)
   › Revisión / autorización          (wizard del otro actor: supervisión/residencia)
   › Reingreso                        (caso de la rechazada)
   › Historial                        (SOLO LECTURA — en paralelo, no encadenado)
```
- **Desaparece** "Recorrido por bloques" como item separado: **el padre YA es el recorrido** (el wizard).
- **Historial** y **Consultar** (en bitácora) se quedan como sub-items de **lectura** (siempre accesibles).
- Cero cambios de `href` para las pantallas que la suite ya navega (solo el cascarón ambiente se
  reemplaza/redirige).

---

## 6. Estrategia de MIGRACIÓN (incremental y suite-safe)
> Riesgo alto si se hace de un golpe. Se hace **un flujo a la vez**, con suite verde tras cada uno.

1. **Estimación primero** (mayor valor, patrón ya existe):
   - Crear el wizard reutilizando `TabGeneradores`/`TabCaratula`/notas de `IntegracionEstimacion` como pasos
     (mismos componentes, mismos `data-testid` de captura → la suite de HU-12 sigue verde).
   - Aplicar el gating del Alta (`tabActivo`/`pasoMaxAlcanzado`).
   - Apuntar la ruta `/estimaciones/integracion` (o la del ambiente) al wizard; **conservar los testids** que
     usan los specs (`tabla-generadores`, `btn-integrar-estimacion`, etc.) o actualizar sus specs en la pasada.
   - Quitar el cascarón `AmbienteEstimacion` (o convertirlo en redirect al wizard).
2. **Pago** (segundo, ya es secuencial).
3. **Bitácora** (apertura+firma como wizard; consultar/minutas en paralelo).
4. **Avance** (registrar como paso; curva/alertas en paralelo).

**Reglas de la migración:**
- **No tocar backend** (la captura ya persiste igual); es reordenamiento de UI.
- **No tocar** `permisos.js`/`App.jsx`/auth/`SesionContext`. Las rutas se montan con el patrón existente.
- **Conservar `data-testid`** de captura o actualizar specs **en la misma tanda**.
- **Suite verde** tras cada flujo; si un flujo no queda sólido, se deja documentado y no se fuerza.

---

## 7. Decisiones que necesito de ti / del profe antes de construir
1. **Alcance:** ¿wizard de verdad (captura integrada) o solo "que no se amontone el menú"? Si es lo segundo, el
   **acordeón que ya hicimos basta** y esto no se construye. *(Conviene escuchar el audio.)*
2. **"Quitar lo innecesario":** el profe mencionó **quitar buscar/vincular notas firmadas** del flujo de
   estimación porque "todo va en una pantalla". ¿Lo movemos al paso 4 (Soportes) y quitamos la pantalla suelta?
3. **Evidencia fotográfica (C-02):** ¿entra en Etapa 1? Si sí, el paso 4 lleva subida de fotos (trabajo real:
   columna BYTEA + multer); si no, el placeholder se suaviza a "fuera de alcance".
4. **Orden de flujos:** ¿Estimación primero (mi recomendación) o cuál?

---

## 8. Esfuerzo y riesgo
| Flujo | Esfuerzo | Riesgo | Por qué |
|---|---|---|---|
| Estimación | 🟨 medio | medio | Reusa componentes; el riesgo es la suite (testids) — manejable |
| Pago | 🟨 medio | bajo | Ya secuencial |
| Bitácora | 🟨 medio | medio | Separar lo encadenable (apertura/firma) de lo paralelo (consulta) |
| Avance | 🟩 bajo | bajo | Pocos pasos |
| Evidencia fotográfica | 🟥 alto | — | Backend nuevo (fotos) — solo si entra en alcance |

> **Recomendación:** construir **solo Estimación** como **prueba de concepto** del rediseño, dejarlo sólido y
> verde, y con eso tú (y el profe) deciden si se replica al resto. Así no comprometemos el sistema entero antes
> de validar que el patrón convence.

---

*Plan de diseño — basado en la estructura real de `AltaContrato.jsx`, `IntegracionEstimacion.jsx` y
`AmbienteEstimacion.jsx`, y en los hallazgos verificados de `docs/INTERPRETACION_DE_HALLAZGOS.md`. Nada
implementado; es para analizar y fijar alcance.*
