# SIGECOP — Plan de pulido de UX / consistencia · 14 jun 2026

> Para ejecutar con Claude Code. Objetivo: **detectar y aplicar mejoras de pulido** (UX, consistencia visual,
> microcopia, accesibilidad básica) que hagan la app verse y sentirse "de producto real" para la demo del profe —
> **SIN cambiar comportamiento ni lógica de negocio**.
> TODO local, sin commit/push. Maiki revisa e integra. Suite objetivo **258 passed / 8 skipped / 0 failed**.

---

## REGLAS DURAS (leer primero)
- **NO tocar zona congelada:** auth, G1-G8 del alta, lógica de cálculo de carátula, `permisos.js`, `server.js`,
  triggers de inmutabilidad, `schema.sql`. Tampoco endpoints, queries ni validaciones.
- **Pulido = presentación.** Solo JSX/markup, clases Tailwind, microcopia (textos visibles), orden visual,
  estados vacíos/carga/error, consistencia de componentes guinda. NADA que cambie qué hace un botón o qué se calcula.
- **Conservar** todos los `data-testid` y los textos que la suite asercióna (si un cambio de texto rompe un spec,
  conserva el texto o, si el cambio es intencional, actualiza SOLO ese spec — lección 7).
- **Trabaja en TANDAS pequeñas, corre la suite tras cada tanda; si algo se pone rojo, revierte esa tanda.**
- Si una mejora exige tocar lógica o no estás seguro de que es solo presentación, **NO la hagas**: anótala como
  recomendación.
- Respeta `ESTADO_ACTUAL.md` (léelo primero) y actualízalo si aplica.

---

## FASE 1 — Aplicar los pulidos YA identificados (P5, P6, P7, P9, P10)
Estos ya salieron del análisis del Word; son seguros.
1. **P5** — En la captura de estimación, el periodo hoy se **teclea como fecha** (`IntegracionEstimacion.jsx` ~819-826).
   Cámbialo a un **selector de periodo** del programa vigente (igual patrón que el avance HU-06), sin cambiar el
   cálculo ni el dato que se envía.
2. **P6** — En generadores, agregar la **columna "clave"** del concepto (consistencia con el resto de tablas).
3. **P7** — En el alta, **prellenar los datos jurídicos** (representante/firmante) desde las cuentas seleccionadas
   cuando sea posible; editable. Solo prefill de presentación, sin validación nueva.
4. **P9** — Quitar el **buscador presentacional** del header que no funciona (`AppShell.jsx` ~60-68), o dejarlo
   funcional si es trivial; preferible quitarlo para no mostrar algo muerto en la demo.
5. **P10** — Agregar un **enlace/acceso a "Por firmar"** junto a la campana de notificaciones.

## FASE 2 — Barrido PROACTIVO de pulido (encuentra tú los puntos)
Recorre las pantallas principales (login, alta, bitácora, expediente, estimación captura/revisión/pago, convenios,
avance, alertas, curva, tablero, reportes, roster) y **detecta y corrige** asperezas de presentación. Busca,
en concreto:
- **Estados vacíos** sin mensaje ("no hay estimaciones todavía", "sin contratos", etc.) en vez de tablas en blanco.
- **Estados de carga** (spinner/skeleton) donde hoy hay un salto o pantalla vacía mientras carga.
- **Errores que hoy se tragan o no se ven** (como el del roster que ya corregimos): que un fallo muestre un aviso claro.
- **Microcopia inconsistente:** botones/títulos con mayúsculas dispares, "guardar" vs "Guardar", textos en inglés
  sueltos, etiquetas técnicas (estados crudos como 'enviada' visibles en vez de su etiqueta).
- **Consistencia de componentes guinda:** tarjetas/botones/badges/tablas que no usen los componentes de
  `components/ui/` y se vean distintos; alinéalos.
- **Formato consistente:** montos siempre con $ y 2 decimales (usar `utils/formato.js`), fechas con el mismo
  formato, alineación de números a la derecha en tablas.
- **Jerarquía visual:** encabezados de página, breadcrumbs/contexto del contrato, espaciado disparejo.
- **Accesibilidad básica:** que los botones de solo-ícono tengan título/aria-label; contraste de texto sobre guinda.
- **Feedback al usuario:** que las acciones (guardar, firmar, presentar, pagar) muestren confirmación clara
  (toast/mensaje), no silencio.
- **Responsive básico:** tablas anchas (matriz del programa, catálogo) que no rompan en pantalla chica — al menos
  scroll horizontal contenido, no desbordamiento.

Para cada hallazgo: aplícalo si es claramente presentación y seguro; si tiene cualquier duda de comportamiento,
solo anótalo. Trabaja por pantalla, en tandas, suite verde tras cada una.

## FASE 3 — Cierre
- Suite completa **258/8/0** obligatorio.
- Entrega `docs/REPORTE_PULIDO_UX_14jun.md` con: (a) qué aplicaste por pantalla, (b) capturas antes/después si
  puedes, (c) una lista de "mejoras detectadas que NO apliqué por requerir lógica/decisión" para que Maiki las vea,
  (d) confirmación de que no se tocó zona congelada (diff de backend = solo lo permitido o nada).
- Actualiza `ESTADO_ACTUAL.md` si cambió algo relevante. NO push.

---

## PROMPT para pegar a Code
```
Soy Maiki. Ejecuta el plan docs/PLAN_PULIDO_UX_14jun.md (pulido de UX/consistencia, comportamiento idéntico). Lee primero docs/contexto-claude/ESTADO_ACTUAL.md. LOCAL, sin commit/push. NO toques zona congelada (auth, G1-G8, cálculo de carátula, permisos.js, server.js, triggers, schema.sql), ni endpoints/queries/validaciones. Solo presentación: JSX, Tailwind, microcopia, estados vacíos/carga/error, consistencia de componentes guinda y de formato. Conserva data-testid y textos asercionados; trabaja en tandas pequeñas y corre la suite tras cada una (revierte la tanda si se pone roja). Aplica primero P5/P6/P7/P9/P10 (Fase 1) y luego haz el barrido proactivo (Fase 2). Lo que requiera lógica o decisión, NO lo hagas: anótalo. Suite final 258/8/0. Entrega docs/REPORTE_PULIDO_UX_14jun.md con lo aplicado por pantalla + lo que dejaste para decisión. NO push.
```
