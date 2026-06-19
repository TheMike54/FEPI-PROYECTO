# Decisión pendiente — código muerto dudoso (13-jun-2026)

> **Fase 4 del plan.** Re-verificado HOY contra `main = d6abfdd` (por si alguna oleada los cableó):
> **siguen sin importadores**. **NO se borró nada** — esta tabla es para que Maiki decida.
> Cuando digas "borra X", una micro-fase borra solo eso, corre la suite y confirma verde.

| # | Artefacto | ¿0 usos hoy? | Evidencia (grep en `frontend/src` + `frontend/e2e`) | Recomendación |
|---|---|---|---|---|
| 1 | `frontend/src/components/ui/Card.jsx` | ✅ sí | `from '…/ui/Card.jsx'` → **0** importadores (excluyendo su propia def y `CardCriterioAceptacion`) | **Borrar** — componente de librería del reskin UI-1 nunca cableado; si se necesita, está en git. *Conservar solo si planeas construir UI nueva con él.* |
| 2 | `frontend/src/components/ui/Badge.jsx` | ✅ sí | `from '…/ui/Badge.jsx'` → **0** importadores (los badges de estado en uso son inline / otros) | **Borrar** — mismo caso que Card. |
| 3 | `frontend/src/components/ui/CardCriterioAceptacion.jsx` | ✅ sí | `from '…/CardCriterioAceptacion'` → **0** importadores; el render real de criterios usa `SeccionCriterios.jsx` | **Borrar** — variante superada por `SeccionCriterios.jsx`. |
| 4 | wrapper `api.health` (`frontend/src/services/api.js:27`) | ✅ sí (sin caller en front) | `.health(` / `api.health` → **0** callers fuera de su definición. *(El endpoint `GET /api/health` SÍ se usa: healthcheck de Render, server-side.)* | **Borrar opcional** (impacto ~0; es 1 línea). O conservar por si se añade un indicador de salud en el front. **No tocar el endpoint** (zona congelada `server.js`). |

**Excluido a propósito:** `frontend/src/components/ui/BadgeSprint.jsx` — stub de compatibilidad
**intencional** (retorna `null`, comentario en cabecera). **Se conserva**, no se evalúa para borrado.

**Nota de alcance:** los 4 son **frontend** y de bajo riesgo. Borrarlos no cambia comportamiento (0 usos);
la suite e2e no debería moverse de `258/8/0`. La micro-fase de borrado, si la autorizas, va en la **Fase 5**
(limpieza), idealmente tras la demo.
