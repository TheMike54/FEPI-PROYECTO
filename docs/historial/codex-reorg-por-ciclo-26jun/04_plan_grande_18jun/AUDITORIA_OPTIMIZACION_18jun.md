# AUDITORÍA DE OPTIMIZACIÓN / LIMPIEZA — SIGECOP · 18-jun-2026 (solo análisis)

> Encargo de Maiki: oportunidades reales de optimización/limpieza, con **valor HONESTO** a 6 días de la entrega
> (suite **340/8/0**; lo sensible es zona congelada: gating/auth/controllers/candados). Recorrido del código
> real (frontend + backend) con `grep`/`find`. **No se tocó nada.**

## 0. Veredicto honesto (léelo primero)
A **6 días de entregar, con la suite en verde y datos demo pequeños, la respuesta honesta es: casi nada vale la
pena AHORA.** Dos razones:
1. **Los ahorros de performance son teóricos a esta escala.** Las "ineficiencias" (subqueries N+1 en atrasos,
   falta de índice en suficiencia) cuestan milisegundos sobre tablas demo de decenas de filas. El beneficio real
   = ~0 hoy; vale cuando haya miles de estimaciones (producción real).
2. **Las mejoras de mantenibilidad son refactors que tocan MUCHOS archivos** (25-36 páginas/handlers) → riesgo
   de romper el verde por un beneficio estructural que no cambia lo que ve el profe.

**Lo único que limpiaría antes de entregar:** una extracción trivial de helpers duplicados (`round2`/`fechaMX`,
20 min, funciones puras). El resto: **post-entrega.**

---

## 1. ✅ VALE LA PENA (mejora real, bajo riesgo) — pero casi todo es POST-entrega
| Oportunidad | Dónde | Beneficio | Esfuerzo | Riesgo | Cuándo |
|---|---|---|---|---|---|
| **Extraer `round2`/`fechaMX` duplicados a `utils/formato.js`** | IntegracionEstimacion, ConveniosModificatorios, AltaContrato, HistorialEstimaciones (copias byte-idénticas) | −10/15 líneas; 1 sola fuente del redondeo (art. 45 fr. IX) | **Muy bajo (20 min)** | **Muy bajo** (funciones puras) | **El único que haría ANTES** (opcional) |
| `cargarEstimacionConContrato()` helper | `estimaciones-ciclo.controller`, `instruccion-pago.controller` (2 fetch casi idénticos) | 1 punto de verdad; el acceso se valida DESPUÉS (no cambia semántica) | Bajo | Muy bajo | Post-entrega |
| `gateContratoCerrado()` · `bitacoraAbiertaId()` · `montoDesdeConceptos()` helpers | 5-6 controllers repiten el chequeo inline | Dedup + consistencia de mensajes; menos copypaste | Muy bajo | Muy bajo (queries idempotentes) | Post-entrega |
| **`BloqueAmbiente` / `SeleccionContratoBloque` / `ResumenContrato`** (componentes presentacionales compartidos) | los 6 `Ambiente*.jsx` repiten `Bloque({n,titulo,estado})`, el selector de contrato y la grilla de KPIs | −~380 líneas duplicadas; cambios visuales en 1 lugar | Bajo (1-2 h) | Muy bajo (presentacional puro; e2e ya valida la estructura) | Post-entrega |
| Refactor `deficitsDeContrato`/`resumenAtrasos` (N subqueries SUM → 1 `GROUP BY`/window) | `alertas.controller.js` | Menos I/O; **real con muchos conceptos** | Medio | Bajo (read-only) | Post-entrega (hoy: ahorro teórico) |

## 2. 🟡 VALE (mejora menor / o churn amplio) — POST-entrega
| Oportunidad | Dónde | Por qué esperar |
|---|---|---|
| `useContratoSelector()` hook (listar→seleccionar→cargar en paralelo) | ~25 páginas repiten el patrón | Beneficio real (−~1.250 líneas) PERO tocar 25 páginas a 6 días = riesgo > beneficio. Ideal post-entrega. |
| `useWizardValidation()` (gating de pasos) | IntegracionEstimacion/Revision/Reingreso/Envio | Lógica compleja (modal de notas, sumas); preservar comportamiento exacto exige cuidado. Post-entrega. |
| Middleware `autorizaAcceso()` (centralizar `esParteOSupervision`) | 36 handlers | Mejora seguridad/mantenimiento, pero toca zona congelada/sensible. Post-entrega, con tests dedicados. |
| `bitacora.construirPayloadNotas`: 3·N `EXISTS` → `LEFT JOIN` | `bitacora.controller.js` | Perf real solo con muchas notas. Post-entrega. |
| Índice `(dependencia_id, estado, fecha_inicio)` en `estimaciones` (suficiencia) | `instruccion-pago.controller` | Requiere DDL; útil en producción, irrelevante a escala demo. Post-entrega + runbook. |
| `observaciones`: `COUNT FILTER` en SQL en vez de `.some()` en JS | `estimaciones-ciclo.controller` | Microoptimización; post-entrega. |
| Mover `ROL_CUENTA` a `lib/constants` | `roster.controller` | Cosmético; post-entrega. |
| Unificar `HeaderVista` vs Breadcrumb+h1 entre Ambiente* | AmbienteConvenio es el único sin HeaderVista | Consistencia visual menor; post-entrega. |

## 3. ❌ NO VALE LA PENA (mucho riesgo / poco beneficio)
| Oportunidad | Por qué NO |
|---|---|
| **Refactor de `AltaContrato.jsx` (2.073 líneas) en sub-componentes** | Es el archivo más grande, pero la suite (340 tests) **asercióna su comportamiento paso a paso**, y es **zona sensible** (alta = G1-G8, gating). Dividirlo a 6 días = alta probabilidad de romper el verde por **cero** beneficio funcional. Solo valdría con un cambio de negocio real. |
| Cualquier refactor de los controllers **congelados** (auth/usuarios/contratos/estimaciones) | Prohibido por CLAUDE.md; el riesgo de tocar el cuadre/gating no se justifica. |
| Optimizaciones de query "por performance" en general | A escala demo (decenas de filas) el ahorro es de milisegundos imperceptibles; el beneficio real llega en producción. No justifica riesgo ahora. |

## 4. RECOMENDACIÓN FINAL
- **ANTES de la entrega:** nada obligatorio. Si quieres un gesto de limpieza de riesgo casi nulo: extrae
  `round2`/`fechaMX` a `formato.js` (20 min) + lo 🟢 del reporte de código muerto (borrar `BadgeSprint`,
  `loginComo`, ~25 dummy exports). Build + suite y listo. **Todo lo demás, NO.**
- **DESPUÉS de la entrega (Etapa 2 / mantenimiento):** los componentes/hooks compartidos del frontend
  (`BloqueAmbiente`, `useContratoSelector`, `useWizardValidation`) y los helpers/queries del backend
  (`cargarEstimacionConContrato`, refactor de `deficits`, middleware de acceso, índices). Ahí el churn se paga
  con mantenibilidad/performance reales, sin la presión de la entrega.
- **Principio rector:** la suite 340/8/0 es tu activo más valioso a 6 días. **Ninguna optimización cosmética
  vale arriesgarla.** Optimiza cuando el costo de no hacerlo sea real (producción), no antes.

*Análisis sobre el código real (16 agentes, read-only). Veredictos del workflow templados con la realidad de
6 días + escala demo + zona congelada. Nada tocado.*
