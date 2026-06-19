# PLAN MAESTRO DE EJECUCIÓN — de inicio a fin (18-jun-2026)

> **Qué es.** El plan grande que **orquesta** los planes chicos ya entregados, de principio a fin, en fases con
> punto de control. No repite su detalle; los **referencia** y fija el **orden, las dependencias y los
> checkpoints**.
>
> **Planes que ejecuta:**
> - `docs/planes/PLAN_MITIGACION_HALLAZGOS_18jun.md` (Oleadas 1-3: bugs, faltantes, ley)
> - `docs/planes/PLAN_REDISENO_BLOQUES_WIZARD_18jun.md` (Oleada 4: wizards por flujo) + `docs/mockups/sigecop-rediseno-bloques.html`
> - `docs/REPORTE_REESTRUCTURACION_HISTORIAS_POR_CICLOS.md` (reestructura del doc de historias)
> - Hallazgos verificados: `docs/INTERPRETACION_DE_HALLAZGOS.md`
>
> **Reglas permanentes (en TODAS las fases):** local sin push (Maiki integra) · **zona congelada intocable**
> salvo formas permitidas · **suite verde tras cada tanda** · **historias sincronizadas** tras cada cambio de
> comportamiento · **la reestructura NO cambia requisitos** (regla de oro del reporte de historias) · lo legal
> interpretativo lo confirma el profe.

---

## FASE 0 — Acuerdos previos con el profe (sin código) 🗣️
> Desbloquea lo que después no se puede deshacer barato.

| Decisión | Por qué ahora |
|---|---|
| **Reestructura de historias por ciclos** — ¿conservar números de HU (recomendado) o renumerar? | Define cómo se escribe el doc nuevo (§4 del reporte). |
| **Audio del profe** — confirmar "quitar buscar/vincular notas firmadas porque todo va en una pantalla" | Es lo único que podría **tocar un requisito**; hay que pactarlo, no imponerlo. |
| **Avance: ¿append-only o editable con nota?** (hallazgo INT-01) | Cambia el modelo de datos del avance. |
| **Evidencia fotográfica: ¿entra en Etapa 1?** (C-02) | Define si hay backend nuevo (fotos) o se suaviza el copy. |
| **Modelo "1 empresa : N cuentas"** para dependencias (L4) | Define el re-seed de cuentas. |

**Salida de Fase 0:** un OK del profe a la reestructura (organizativa, sin cambiar requisitos) + las 4
decisiones legales/alcance. **Sin esto, las Fases 3-5 se posponen, no se adivinan.**

---

## FASE 1 — Oleada 1: quick wins (bugs + cierres legales) 🐛 · 1 tanda
> Lo que más se nota, bajo riesgo, sin esperar acuerdos.

- Finiquito bloquea el ciclo (INT-03) · Minutas muestran folio no id (NOTAS-VINC-01) · Endoso valida monto/
  vigencia (L1) · Quitar placeholder falso de generadores (C-01) · Atraso no se duplica (INT-02, DDL aditiva) ·
  Sidebar con rango de HU (UX-1).
- **Congelado para Maiki:** guard de finiquito en `estimaciones.controller`; columna/tabla de atraso en `schema.sql`.
- **Checkpoint:** suite verde + specs negativos nuevos. Historias: sin cambio de requisito (son fixes).

---

## FASE 2 — Oleada 2: notificaciones + funcionalidad derivada 🚧 · 1-2 tandas

- **Campana unificada** (🔔+✍️ en una, con tipos) + avisos de **nota por firmar** y **solicitudes** (NOTIF-1/2/3) ·
  Consulta de notas muestra vínculos minuta/avance (NOTAS-VINC-02) · HU-19 reporte #4 (endpoint de observaciones) ·
  Ciclo de vida con progreso real · Ver "mi info / empresa" (UX-2).
- **Congelado para Maiki:** routers nuevos (notas-pendientes, observaciones-por-contrato) montados en `server.js`;
  flags de vínculo en `bitacora.controller`.
- **Checkpoint:** suite verde (cuidar/actualizar testids de campana). Historias: sin cambio de requisito.

---

## FASE 3 — Prueba de concepto: WIZARD de Estimación + su historia reestructurada ⭐ · 2 tandas
> **El punto de validación de todo el rediseño.** Aquí se prueba el patrón antes de replicarlo.

1. **Construir el wizard "Nueva estimación"** (Periodo→Generadores→Carátula→Soportes→Integrar→Presentar)
   reusando los componentes de HU-12/HU-13 como pasos (mismos `data-testid` de captura → suite de HU-12 verde).
   Incluir el fix de la **"turnar" de HU-15** (botón al lado de lo cargado, no dentro del formulario).
2. **Reemplazar/redirigir** el cascarón "Recorrido por bloques" de estimación → el wizard ES el recorrido.
3. **Reestructurar la HISTORIA del Ciclo de estimación** a la **vista por ciclos** (HU-12..17 agrupadas), con el
   cuadro **"paso del wizard ↔ criterio de qué HU"** + **checklist de conservación** (criterio viejo == nuevo).
- **Congelado:** ninguno nuevo (es UI + reuso); rutas con el patrón existente.
- **Checkpoint:** suite verde + **historias del ciclo sincronizadas + checklist revisable por el profe**.
- **DECISIÓN tras la fase:** ¿el patrón convence? → si sí, se replica (Fase 4); si no, se ajusta o se queda solo
  el acordeón actual. **Aquí Maiki/profe deciden si el rediseño escala.**

---

## FASE 4 — Oleada 3 (ley) + replicar el wizard a los otros ciclos ⚖️ · 2-3 tandas
> Solo si la Fase 3 convenció. En paralelo, los cierres legales que necesitan más cuidado.

- **Ley/revisión a fondo:** HU-20 techo presupuestal (partida + FK, art. 24) · Convenio con acto de
  autorización (art. 59 párr. 3 / 102) · Dependencia no sustituible explícito (art. 125) · Re-seed de cuentas
  ligadas a empresas (script dedicado, modelo 1 empresa:N cuentas).
- **Replicar el wizard** a **Pago** (alta factibilidad), luego **Bitácora** (apertura+firma; consulta/minutas en
  paralelo) y **Avance** (registrar; curva/alertas en paralelo) — **un flujo por tanda**, suite verde + historia
  del ciclo reestructurada + checklist cada vez.
- **Congelado para Maiki:** según cada item (ver plan de mitigación).
- **Checkpoint:** suite verde por flujo; historias sincronizadas; lo legal validado por el profe.

---

## FASE 5 — Cierres y pulido 🏁 · 1 tanda
- Evidencia fotográfica del avance **solo si el profe la metió en Etapa 1** (Fase 0); si no, suavizar el copy a
  "fuera de alcance".
- Pulidos pendientes, verificación adversarial del conjunto, **ESTADO_ACTUAL + historias finales sincronizadas**,
  reporte de cierre.

---

## FASE 6 — Reporte extenso de cierre para CLAUDE IA (handoff) 📒 · 1 tanda · pidió Maiki
> **Qué.** Un único documento **exhaustivo y autocontenido** (`docs/REPORTE_EJECUCION_PLAN_GRANDE_<fecha>.md`)
> que narre **todo lo que se hizo** de inicio a fin, escrito para que **cualquier instancia futura de Claude
> (o Maiki, o el profe) retome el proyecto sin contexto previo**. No reemplaza a `ESTADO_ACTUAL.md` (ese es el
> estado vivo); este es el **registro del esfuerzo** de esta ronda.
>
> **Contenido obligatorio (por fase y por hallazgo):**
> 1. **Resumen ejecutivo** — qué se atacó, qué quedó cerrado, qué quedó pendiente (y por qué).
> 2. **Por cada hallazgo (INT-01…/§)** — síntoma → causa raíz → cambio aplicado (`archivo:función`, antes→después) →
>    cita legal (LOPSRM/RLOPSRM/LFD) o `[validar profe]` → spec que lo blinda → resultado.
> 3. **Zona congelada tocada** — lista exacta de diffs entregados a Maiki para integrar (con el porqué de cada uno).
> 4. **DDL aditiva** — cada migración idempotente, en qué tabla, y el runbook de aplicación en Render.
> 5. **Rediseño por ciclos** — qué wizard se construyó, qué historias integra, el **checklist de conservación**
>    (criterio viejo == nuevo) y el mockup/prototipo de referencia.
> 6. **Suite** — nº de specs antes/después, los specs nuevos, los flaky conocidos.
> 7. **Decisiones del profe pendientes** — la lista de §"Mapa de decisiones" con su estado.
> 8. **Cómo retomar** — siguiente paso recomendado, ramas/PRs, qué falta para la entrega.
>
> **Se redacta al FINAL**, con el diario de cada fase ya cerrado (cada checkpoint deja su nota → este reporte la
> consolida). **Checkpoint:** Maiki lo lee y confirma que con SOLO ese doc se entiende todo el trabajo.

---

## Vista de dependencias (qué bloquea a qué)
```
FASE 0 (acuerdos profe) ──┬──▶ FASE 1 (quick wins)         [no depende de acuerdos → puede ir YA]
                          ├──▶ FASE 2 (notificaciones)     [no depende de acuerdos → puede ir YA]
                          └──▶ FASE 3 (wizard Estimación + historia)  ◀── requiere OK de reestructura + audio
                                      │
                                      └─(si convence)─▶ FASE 4 (ley + replicar wizards) ─▶ FASE 5 (cierres) ─▶ FASE 6 (reporte Claude IA)
```
> **Fases 1 y 2 NO esperan al profe** (son bugs/UX sin cambio de requisito) → se pueden arrancar de inmediato.
> **Fase 3 en adelante** sí espera el OK de la reestructura y el audio.

---

## Tabla de control (para palomear por fase)
| Fase | Entregable | Toca congelado | Checkpoint |
|---|---|---|---|
| 0 | Acuerdos profe (5) | — | OK del profe documentado |
| 1 | Oleada 1 (6 fixes) | estimaciones.controller, schema.sql | suite verde + specs negativos |
| 2 | Campana unificada + 4 faltantes | server.js (routers), bitacora.controller | suite verde |
| 3 | Wizard Estimación + historia del ciclo | — | suite verde + historias + checklist |
| 4 | Ley (4) + wizards Pago/Bitácora/Avance | varios (ver mitigación) | suite verde por flujo + historias |
| 5 | Cierres (fotos/pulido) | — | suite verde + ESTADO_ACTUAL + reporte |
| 6 | **Reporte extenso para Claude IA** (handoff) | — | Maiki confirma que con SOLO ese doc se entiende todo |

---

## Mi recomendación de arranque
1. **Hoy mismo:** **Fase 1** (no espera a nadie; cierra los bugs que más se notan).
2. **En paralelo:** tú llevas la **Fase 0** con el profe (OK reestructura + audio + 4 decisiones).
3. **Cuando vuelvas con el OK:** **Fase 3** (wizard de Estimación como prueba de concepto) — y de ahí se decide
   si escala. Así nunca comprometemos el sistema entero antes de validar que el patrón te (y le) convence.

> *Plan maestro — orquesta los planes chicos ya entregados. Local, sin push. Lo legal lo confirma el profe; la
> reestructura de historias NO cambia requisitos (solo reorganiza).*
