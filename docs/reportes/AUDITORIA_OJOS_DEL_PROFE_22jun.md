# Auditoría "a los ojos del profe" (22-jun) · SIGECOP

> **Encargo (Maiki):** auditar **solo lo que el profe VE en una demo de pantalla** (no backend, no API, no deuda técnica), comparado con las historias y sus audios, recorriendo los 24 contratos demo. Para cada hallazgo: qué, pantalla, cómo lo vería, gravedad, fix + esfuerzo. **Solo reporte; NO se aplicó nada.**
> **Contexto:** revisión normal mañana (2h) · preentrega a fondo miér/jue (3h, con margen de corrección) · entrega final viernes (2h). Objetivo: llegar **sólido a la vista**.
> **Método:** 8 agentes por área de pantalla + verificación viva (solo-lectura) sobre los 24 contratos demo. Refleja el estado **ya con los fixes de hoy** aplicados.

## TL;DR — dos arreglos cambian la percepción del 80%

El sistema **funciona** (el código está bien). Lo que se ve "a medias o roto" en la demo viene casi todo de **dos causas**, ambas **baratas**:

1. **🔴 Los DATOS demo están viejos/sucios.** Empresas-basura con números, folios "PRUEBA-HU-XX", fechas del programa **ya vencidas** (todo sale rojo/atrasado/vencido), garantías todas verdes, "Por firmar" vacío, ningún contrato cerrado, sin techo presupuestal 2026 (el pago se atora). El profe abre casi cualquier pantalla y ve algo que **parece fallido o de juguete**, aunque el cálculo sea correcto. → **Re-sembrar la BD demo** (nombres realistas + fechas relativas a hoy + estados variados) es el **mayor salto de calidad con el menor esfuerzo**.
2. **🔴 Hay códigos "HU-XX" impresos por toda la UI** (el chip de pestañas "Estimación · HU-12", banners "(HU-13)/(HU-15)", "HU-08/09", "su historial está en HU-14"…). El profe **ya dijo que eso le molesta** (mandó quitar el "HU-15"). → Limpiar el chip de `PestanasCiclo` (1 componente arregla casi todas las pantallas) + un barrido de "(HU-XX)" → nombre natural. Casi todo **trivial**.

Después de esos dos, quedan ajustes de **color/leyenda** (la matriz que el profe ya notó) y **textos de jerga/meta sueltos**.

> **Nota:** varios hallazgos de un reporte previo **YA se arreglaron hoy** (HU-15 impreso en HU-13, agrupador "Tipo de contratación", KPI financiero de la curva, reporte 4). Se marcan ✅ al final para no re-trabajarlos.

---

## A) 🔴 DATOS DEMO — lo que el profe NOTA SEGURO (el bloque de mayor impacto)

> **Todos se arreglan con un re-seed** (datos, no código, no zona congelada). Esto es lo #1 a hacer antes de mañana.

| # | Qué ve el profe | Pantalla | Fix (solo datos) | Esf. |
|---|---|---|---|---|
| A1 | **191 de 201 empresas son basura** ("Constructora O3 1781335337707", "Grupo Mismo 178…"): inundan el selector de Empresa al registrarse | Registro (`SeleccionRol`/`/solicitud-acceso`), chip de empresa | Borrar las empresas con timestamp en el nombre; dejar las ~10 reales; que el seed e2e no las cree visibles | bajo |
| A2 | **187 solicitudes de registro basura** pendientes ("Pedro Empresa 178…", correos @sigecop.test) — y el badge de la campana marca 187 | Solicitudes de registro, campana/Centro | Purgar usuarios `pendiente` con email `@sigecop.test`/nombre con timestamp; limpiar el teardown e2e | bajo |
| A3 | **Folios "PRUEBA-HU-01..24" y objeto "PRUEBA HU-01 · …"** + contratista "Carlos **Contratista Demo**" en todas las listas/modales | Alta→Registrados, modal Ver info, Portafolio, modal de contrato | Re-seed con folios realistas ("OP-2026-0001") y objetos/contratistas verosímiles | medio |
| A4 | **Matriz de avance TODA roja** y avance 0% en ~9 contratos: el programa vence 2026-05-31 (< hoy) → todo "Atraso" | HU-05 curva/matriz | Re-seed del programa con fechas que **abarquen hoy** (inicio ~−2 meses, fin ~+1 mes) → atraso parcial creíble + aparece el ámbar "por venir" | bajo |
| A5 | **Semáforo de revisión ROJO "Vencido"** en PRUEBA-HU-15 (el contrato canónico de HU-15): se presentó 19 días antes de hoy | HU-13 presentación / HU-15 revisión | Refrescar `enviada_en` a `CURRENT_DATE − 3` para que caiga dentro de los 15 días | bajo |
| A6 | **Todas las garantías verdes** y los 3 contadores ("≤5/≤15/≤30 días") en **0** → no se puede demostrar el criterio 2 de fianzas (el que el profe pidió revisar) | HU-02 fianzas | Fechar algunas garantías cerca de hoy (~3, ~12, ~25 días) para mostrar rojo/ámbar/amarillo | bajo |
| A7 | **"Por firmar" SIEMPRE vacío** (las 17 aperturas ya firmadas 3/3) → no se demuestra la firma por cuenta (HU-08) | Por firmar | Dejar 1-2 contratos con apertura **sin firmar** alguna parte | bajo |
| A8 | **Ningún contrato cerrado / 0 finiquitos** → nunca se ve el estado final de HU-24 (documento de finiquito, "CERRADO") salvo cerrando uno en vivo (irreversible) | Finiquito, Portafolio | Sembrar **un contrato ya cerrado con finiquito** (p. ej. PRUEBA-HU-24) | bajo |
| A9 | **Sin techo presupuestal 2026** → el wizard de Tránsito a pago se **atora en el paso 1** con "⚠️ No hay techo presupuestal" | HU-20 tránsito a pago | Sembrar `presupuesto_anual` ejercicio **2026 / dependencia 4** con partida → suficiencia "Dentro del techo" | bajo |
| A10 | **Padrón "Por validar" vacío** → no se demuestra el flujo estrella de HU-23 (validar/fusionar duplicados) | Padrón de empresas | Sembrar 1-2 empresas `por_validar` (una duplicada) | bajo |

**Datos demo — lo_nota_seguro pero secundario (libro/tablas vacías):**
- **Casi todos los contratos tienen una sola nota** (la apertura) → el libro de bitácora y el buscador de notas salen vacíos (no se lucen HU-09/HU-10). *Fix: sembrar varias notas de distintos tipos en 2-3 contratos.* (medio)
- **Sin convenio de monto/programa** → la tabla "Versiones del programa" sale vacía aun en PRUEBA-HU-03 (su convenio es de plazo). *Fix: sembrar un convenio de monto en un contrato.* (bajo)
- **Garantías sin PDF** → el botón 👁 "Ver PDF" no aparece en ninguna fila (criterio 3 de fianzas, que el profe repasó 2×). *Fix: cargar un PDF de ejemplo en una garantía.* (bajo)
- **Aviso no bloqueante de HU-06 irreproducible** (en el seed, programado == contratado → choca antes con el art. 118). *Fix: en PRUEBA-HU-06 dejar un concepto con programado < contratado.* (bajo)
- **Sin pago en PRUEBA-HU-05** (el contrato homónimo de la curva) → el financiero sale plano 0%. *Fix: sembrar un pago en HU-05, o demostrar la curva con HU-24 (~69.5%).* (bajo)

> **Recomendación:** un **único script de re-seed "demo del profe"** que cargue 24 contratos con nombres realistas, **fechas relativas a hoy**, y estados representativos (varios vigentes con avance parcial, ≥1 atrasado de verdad, ≥1 con todo el ciclo de estimación, ≥1 pagado, **1 cerrado con finiquito**, garantías por vencer, aperturas con firmas pendientes, notas variadas, techo presupuestal 2026). Esto resuelve **A1–A10 + los secundarios de un golpe**.

---

## B) 🔴 CÓDIGOS "HU-XX" IMPRESOS EN PANTALLA — lo_nota_seguro (el profe ya lo objetó)

| # | Qué ve el profe | Pantalla | Fix | Esf. |
|---|---|---|---|---|
| B1 | **Chip "Ciclo · HU-XX"** en la barra de pestañas: "Estimación · HU-12", "Pago · HU-20", "Convenio · HU-03", "Finiquito · HU-24", "Expediente · HU-04", "Tablero HU-17" — en **casi todas** las pantallas de ciclo | `PestanasCiclo.jsx` (chip) | Mostrar solo el nombre del ciclo ("Estimación"), sin "· HU-XX"; `RANGOS_CICLO` también imprime "HU 20–21" | trivial (1 componente, arregla muchas) |
| B2 | Banners/enlaces del ciclo de estimación: "(HU-13)", "(HU-15)", "(HU-21)", "(HU-04)" en el éxito de integrar, paso 4, barra financiera, enlace "Ir a presentar" | Integración (`IntegracionEstimacion.jsx`) | "(HU-13)"→"(Presentación)", "(HU-15)"→"(Revisión)", "(HU-21)"→"(Registro del pago)", "(HU-04)"→"(Expediente)" | trivial |
| B3 | "**(HU-08/09)**" y "(HU-10)" en los avisos de Consulta/Emisión de notas | Consulta/Emisión de notas | Quitar los "(HU-..)" del texto visible | trivial |
| B4 | "su historial está en **HU-14**" y botón a HU-12 en el Tablero | Tablero | "HU-14"→"el Historial de estimaciones"; "HU-12"→"Integrar estimación" | trivial |
| B5 | Toasts/banners de Revisión: "reingresarse **(HU-16)**", "tránsito a pago **(HU-20)**" | Revisión | "(HU-16)"→"(Reingreso)", "(HU-20)"→"(Tránsito a pago)" | trivial |
| B6 | "…pasará a **HU-20**" + "provisional" bajo "Fecha de autorización" del pago | Registro de pago | Quitar "pasará a HU-20" y "provisional" | trivial |
| B7 | "El detalle … vive en sus **HU (12–21)**" en el Expediente (y queda en el PDF) | Expediente | "…se consulta en el módulo de Estimaciones" | trivial |
| B8 | **Indicador de pantalla DUPLICADO** (chip dorado arriba + píldora flotante abajo-derecha, ambos "HU-12") | AppShell | Quitar el flotante; dejar el de arriba (que el profe usa de ancla). Opcional: quitar "· HU-XX" del de arriba | trivial |

> Casi todo es **reemplazo de texto**; B1 (el chip de `PestanasCiclo`) es el de mayor cobertura.

---

## C) 🔴/🟡 COLOR Y LEYENDA — el profe ya notó que "no cuadran"

| # | Qué ve el profe | Pantalla | Fix | Esf. |
|---|---|---|---|---|
| C1 | **Matriz de avance: los colores NO coinciden con la leyenda.** "Ejecutado (verde)" se ve **oliva oscuro** y "por venir (ámbar)" se ve **café/marrón** — porque usan tokens de **texto** (`sigecop-green-validation`, `sigecop-amber-attention`) como relleno de celda | HU-05 matriz + swatches | Usar tokens de **relleno** reales (verde/ámbar brillantes, p. ej. `bg-emerald-500`/`bg-amber-400`) en celdas y swatches | trivial |
| C2 | **Ámbar vs amarillo indistinguibles** en fianzas (el profe lo preguntó: "explícame la diferencia entre ámbar y amarillo") — dos amarillos pálidos casi iguales | HU-02 fianzas (badges + KPI) | Dar al corte ≤30 días un color claramente distinto del ámbar; añadir ícono/punto además del color | bajo |
| C3 | **Verde con dos significados** en la MISMA pantalla: en la curva S verde = financiero (#10b981); en la matriz verde = ejecutado (oliva) | HU-05 | Unificar: "ejecutado" mismo verde en curva y matriz; mover "financiero" a otro color (dorado/acento) | bajo |
| C4 | **Guinda vs azul a medias:** la barra es guinda, pero el Inicio (h1, chip "Acceso:"), el modal "¿En qué contrato…?" y los **encabezados de tablas del Expediente** salen en azul; y `/solicitud-acceso` es una pantalla **azul** completa que no coincide con el resto | Inicio, modal de contrato, Expediente (thead), SolicitudRegistro | Unificar tokens a guinda en esos puntos; reskinear o redirigir `/solicitud-acceso` | medio |

---

## D) 🟡 TEXTOS DE JERGA / META / NOTAS INTERNAS visibles en pantalla

- **Alta:** `[Fase B pendiente de validar con el profe…]` en el paso Plan de amortización; el campo "% de pena por atraso" pide **fracción 0–1** pero la etiqueta dice "%" (teclear "5" = 500%); "El 5 al millar … se carga automáticamente" afirmado como hecho (es parametrizable/`[validar]`).
- **Pago/convenio:** "⛔ Carga de archivo **no disponible (falta infra de almacenamiento)**" en Soportes; "**guardrail** configurable", "**snapshot** del programa", "el backend lo **revalida en SQL**", "Σ ROUND(cant × P.U., 2)" en el editor de convenios; **aviso "Revisión SFP (art. 102)"** que el profe pidió quitar.
- **Curva:** "mismo número que el `financiero_pct` canónico" (nombre de variable en `<code>`).
- **Vistas ejecutivas:** "Plazos vencidos … faltan **sellos de fecha en el esquema**" (Portafolio detalle); "Ancla: … **(pendiente de confirmar)**" en Reportes; banner del padrón cita "art. 43 RLOPSRM" como definitivo (internamente `[validar]`).
- **Fianzas:** desfase historia↔pantalla — la historia menciona "**fecha de emisión**" de la póliza, pero el modal solo pide "fecha de vencimiento".

> Todos son **texto** (trivial/bajo). El de la **pena como fracción** conviene tratarlo (es un campo donde el profe puede equivocarse a la vista).

---

## E) 🟡 PANTALLAS A MEDIAS / AFORDANCIA / DETALLES

- **Precio alzado (Alta):** el selector ofrece "Obra pública a precio alzado" y "Servicios", pero al elegirlos **el wizard no cambia** (sigue exigiendo catálogo y deriva el monto). La historia promete "captura manual del monto". **El profe ya lo levantó como duda.** *Fix (decisión del profe): o se implementa la rama de monto manual, o se quitan esas opciones del select. (alto / o trivial si se quitan)*.
- **Convenio sin bitácora:** el backend ya bloquea (409, fix de hoy), pero la pantalla **no avisa antes**: botón habilitado + toast de error tras el clic. El profe pidió "que te redireccione". *Fix: banner persistente + botón deshabilitado con enlace a abrir bitácora (copiar el patrón de Finiquito, que sí lo hace).* (medio)
- **Visita en fecha pasada** sigue diciendo "Programada" (la visita demo es 25/04, ya pasó). *Fix: dato (fecha futura) o etiqueta "Vencida".* (bajo)
- **Historial:** columna "Versión" siempre "—"; "Fecha de revisión/pago" en "—" aun en pagadas; fecha de nota como "Mar 2026" (sin día). *Fix: quitar la columna muerta / poblar u ocultar las fechas.* (bajo-medio)
- **Portafolio:** se abre con **doble clic** y la única pista es texto gris pequeño → un clic simple "no hace nada". *Fix: icono "Ver detalle" por fila o abrir con clic simple.* (bajo)
- **Carátula:** renglón "Retención por atraso $0.00" siempre gris (pena no pactada en el seed). *Fix: ocultarlo si no hay pena, o sembrar una pena.* (bajo)
- **Registro público** ofrece "Finanzas" y "Dependencia" como roles auto-solicitables. *Fix/validar: limitar a roles externos.* (bajo)

---

## F) ✅ YA RESUELTO HOY (constancia — no re-reportar)
- "HU-15" impreso en la presentación (HU-13) → ahora "Plazo de revisión". 
- Agrupador "Tipo de contratación" deshabilitado (HU-18) → **quitado**.
- KPI/serie "Financiero" 0% con pagos posteriores al fin del programa (HU-05) → **corregido** (PRUEBA-HU-24 muestra ~69.5%).
- Reporte 4 (Observaciones) → habilitado y exporta (solo queda un comentario obsoleto en el código, no visible).

---

## Plan de ataque sugerido (alto impacto / bajo esfuerzo primero)

1. **Re-seed "demo del profe"** (bloque A entero) — *el mayor salto visual, esfuerzo bajo-medio, solo datos.* **Hacer antes de mañana.**
2. **Limpiar códigos "HU-XX"** (bloque B) — empezar por el chip de `PestanasCiclo` (B1) + barrido de "(HU-XX)" — *trivial, alta cobertura.*
3. **Colores de la matriz y ámbar/amarillo** (C1, C2) — *trivial/bajo, el profe ya los notó.*
4. **Textos de jerga/meta sueltos** (bloque D) — *trivial, mientras se editan las pantallas.*
5. **Precio alzado** (E) — *decisión del profe (quitar opciones es trivial; implementarlo es alto).*
6. Resto (guinda/azul, afordancia del portafolio, historial) — *para la preentrega.*

> **No apliqué nada.** Esto es el mapa para que decidas qué corregir antes de cada revisión. Lo más rentable: **el re-seed (A) + el barrido de "HU-XX" (B) + los colores (C1/C2)** — todo de bajo esfuerzo y altísimo impacto visual, justo lo que el profe mira primero.
