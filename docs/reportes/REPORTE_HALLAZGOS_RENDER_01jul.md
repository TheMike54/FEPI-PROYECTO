# Reporte — Hallazgos de pruebas de Maiki (ciclo completo + convenios) · 01-jul (noche)

**Método:** verificación en código Y en ley (texto literal en `docs/legal/`), reproducción en vivo (API +
Playwright + PDF real), fix solo de lo que resultó bug. Un commit por hallazgo. **LOCAL, sin push, sin
deploy.** Zona congelada intacta; conservados los fixes de convenios (`70ee939`/`af9f578`), las 5 oleadas,
el art. 125 y el selector.

| # | Hallazgo | Veredicto | Fix |
|---|---|---|---|
| H0 | Versiones del programa no se ven tras convenio (salvo plazo) | **NO reproducible en el código actual** (era el código viejo en Render) + mejora | folio/tipo del convenio por versión |
| H1 | Techo no bloquea + $1,000 sospechoso | **BUG real** (HU-21 brincaba la suficiencia) + $1,000 = captura de prueba | gate art. 24 al pagar + fallback monto del contrato |
| H2 | ¿Estimar solo algunos conceptos? | **NO es bug** (art. 54 LOPSRM / art. 130 fr. I RLOPSRM) | nota informativa en el wizard |
| H3 | Documento no se imprime completo | **BUG real** (overlay `fixed` recortaba a 1 página) | CSS print + `data-print-overlay` (5 documentos) |

---

## H0 — Versiones del programa tras convenio

**Investigado.** El backend versiona el programa para **TODOS los tipos que traen programa** (con `70ee939`
los 4 lo traen: el frontend siempre envía catálogo+celdas y `plazo` también reacomoda). No hay filtro por
tipo ni en `listarConvenios` ni en la tabla de versiones del frontend; no hay caché de detalle.

**Verificación en vivo (a/b/c por tipo, contrato 7021):**
- **MONTO** (API): 201 → v3 **vigente** con monto nuevo ($2,587,506); catálogo 01=141 y celda 01/P2=41 en BD;
  el historial lo lista (CM-002).
- **PROGRAMA** (UI Playwright): convenios 3→4, versiones 4→5, matriz de la versión vigente visible con el
  reacomodo; historial CM-004.
- **MIXTO** (UI Playwright): convenios +1, versiones +1, encabezado actualizado en vivo (monto $2,587,611 ·
  plazo 230) y toast "+1 periodo al programa"; historial CM-003.
- **PLAZO** ya se veía (convenio de Maiki, v2).

**Por qué Maiki lo vio:** Render corre `origin/main` (`be18c78`), **sin B8 ni la sesión de convenios**: ahí
(a) un convenio de plazo NO versiona el programa, y (b) el editor viejo — sin cajita, sin regla de oro y sin
columnas de periodos nuevos — hacía que el cuadre al 100% de monto/programa/mixto no se completara (botón
bloqueado) → sin registro no hay nada que reflejar. **El fix integral ya está en `70ee939`, pendiente de
deploy.** En la BD local solo existía el convenio de plazo de Maiki (los intentos de los otros tipos nunca
se registraron), consistente con este diagnóstico.

**Mejora aplicada (visibilidad del reflejo):** cada fila de "Versiones del programa de obra" ahora dice QUÉ
convenio la creó — folio y tipo (`v3 · CM-002 (Monto)`), backend `listarConvenios` (LEFT JOIN convenios) +
frontend. Verificado en vivo con screenshot: v1 (original) → v2 · 12345 (Plazo) → v3 · CM-002 (Monto) → v4 ·
CM-003 (Mixto) → v5 · CM-004 (Programa) VIGENTE, con montos/plazos evolucionando.

Contrato 7021 restaurado al estado post-Maiki (su convenio de plazo intacto; mis 3 convenios de prueba
eliminados, v2 devuelta a vigente, residuo 0).

## H1 — Techo presupuestal (HU-20/HU-21)

**A) ¿Debe bloquear? SÍ.** Art. 24 LOPSRM (texto literal, reforma 16-04-2025): párr. 1 — *"la…
presupuestación y el gasto de las obras… se sujetará a las disposiciones específicas del Presupuesto de
Egresos de la Federación, así como a lo previsto en la Ley Federal de Presupuesto y Responsabilidad
Hacendaria"*; párr. 2 — *"siempre y cuando cuenten **previamente** con la suficiencia presupuestaria en la
partida o partidas específicas"*. Es requisito **duro**, no informativo (la excepción del párr. 3 es de
Hacienda para CONVOCAR, y aun así exige adecuaciones presupuestarias previas).

**El bug real:** los gates existían en `generarInstruccion` (HU-20: 409 si excede, con `FOR UPDATE`
anti-carrera) y en el wizard (paso Suficiencia no avanza con `excede`; botón Generar bloqueado) — **pero el
REGISTRO DEL PAGO (HU-21, `registrarPago`) no verificaba nada presupuestal** ("pago directo sin tránsito").
Por ahí "dejó continuar igual". **Fix:** `registrarPago` ahora verifica la suficiencia DENTRO de la misma
transacción (con `FOR UPDATE` del contrato y de la partida) y rechaza con **409 art. 24** si el neto excede
el disponible.

**B) ¿De dónde sale el techo?** El $1,000 es la fila `presupuesto_anual id=101` (ejercicio 2025, partida
'4242'), **capturada a mano por la cuenta de finanzas hoy a las 00:01** — dato de PRUEBA de Maiki (a las
00:15 capturó otra de $10M para 2026); el upsert del endpoint permite corregirla. La **fuente legal del
techo SÍ existe** (el presupuesto autorizado con suficiencia en la partida específica, art. 24 párrs. 1-2 →
dato externo que Finanzas captura), así que la partida capturada sigue siendo la fuente PRIMARIA. La regla
de Maiki se aplicó como **fallback**: **sin partida capturada, techo = monto vigente del contrato**
(comprometido = Σ neto autorizadas+pagadas del contrato; pagar sobre el monto pactado carece de soporte
contractual — las ampliaciones van por convenio, art. 59 LOPSRM) **[validar profe]**. Con el fallback la
verificación SIEMPRE opera (antes, sin techo cargado el tránsito se congelaba pidiendo capturarlo y el pago
directo pasaba sin control). La **fuente es visible** en pantalla (`suf-fuente`).

**Smoke en vivo:** estimación 2866 ($608,125 — la del screenshot) → GET fuente='partida', techo $1,000,
excede; POST /api/pagos → **409 art. 24** (antes 201). Estimación 2900 (contrato sin dependencia) → GET
fuente='contrato', techo $100,000 = monto del contrato, disponible $52,240 (antes "no verificable").
Flujo feliz: pago 2842 dentro del techo de $10M → **201**. Todo revertido (residuo 0).

**HU actualizadas:** HU-20 criterio 1 (fuente en dos niveles) y HU-21 criterio 5 nuevo (suficiencia también
al pagar) + fundamento.

## H2 — Estimar solo algunos conceptos del periodo

**NO es bug — confirmado en el texto literal:**
- **Art. 54 LOPSRM:** *"Las estimaciones **de los trabajos ejecutados**… se deberán formular con una
  periodicidad no mayor de un mes"* — se estima lo EJECUTADO, no lo programado.
- **Art. 130 fr. I RLOPSRM:** los tipos de estimación reconocidos son *"I. De trabajos ejecutados"* (+
  adicionales/gastos no recuperables/ajustes) — no existe la "estimación de todo el catálogo".
- **Art. 127 RLOPSRM:** las cantidades presentadas *"deberán corresponder a la secuencia y tiempo previsto
  en el programa"* — el programa acota el máximo, no obliga el mínimo.

Un concepto sin avance en el periodo simplemente no se estima (se estimará cuando avance). Además #24
(cantidad = avance, solo lectura) ya garantiza la correspondencia con lo ejecutado — dejar CONC-02 en 0 es
el comportamiento correcto. **Fix aplicado (opcional del hallazgo):** nota informativa en la leyenda del
paso Generadores del wizard (HU-12) citando art. 54 / art. 130 fr. I, para que dejar conceptos en 0 no se
lea como error. #24 intacto.

## H3 — El documento de estimación no se imprimía completo

**Causa raíz:** los 5 documentos imprimibles (carátula de estimación, nota, avance físico, bitácora,
finiquito) comparten el patrón modal `position:fixed inset-0 overflow-auto` + `data-print-area`. En el
flujo de impresión, un ancestro **`fixed` recorta el contenido al alto del viewport → solo salía la primera
página**. Una nota corta cabía (nunca se notó); la carátula completa (carátula + firmas + generadores +
soportes + resumen por partida + hojas generadoras ≈ 4,000px) se cortaba.

**Fix (CSS global + marca en 5 componentes):** en `@media print` (con `body.doc-nota-abierto`), el overlay
(`data-print-overlay`) pasa a `position:absolute` anclado arriba con altura libre y `overflow:visible`, y el
área entra en flujo normal (`relative`) para paginar completa; también se abren los `overflow-x-auto` /
`overflow-hidden` internos (tablas anchas). Marcados los 5 overlays.

**Verificación con el PDF REAL** (motor de impresión de Chromium, `page.pdf()` sobre la estimación 2866):
**7 páginas completas** — p1-2 carátula (secciones 1-2 sin IVA + sección 3 con IVA y neto) + firmas del
ciclo con fechas reales; p3 resumen de generadores; p4 generador por concepto con foto; p5 soportes y notas
de bitácora; p6 resumen por partida (importes con letra + 4 firmas); p7 hoja generadora (foto + 3 firmas).
Documento de 3,973px vs viewport de 720px: antes solo salía la página 1. Computed styles en print
verificados (overlay absolute/visible, altura libre).

---

## Estado final
- `vite build` + `node -c` verdes. Un commit por hallazgo, en `main`, **sin push**.
- Contratos/estimaciones de prueba restaurados: 7021 post-Maiki (su convenio de plazo intacto), pago de
  prueba revertido, CFDIs temporales eliminados — residuo 0.
- Zona congelada intacta (`pagos.controller` / `instruccion-pago.controller` / `convenios.controller` NO
  son congelados). Conservado todo lo previo (convenios `70ee939`, 5 oleadas, art. 125, selector).
