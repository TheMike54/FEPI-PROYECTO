# SIGECOP — Auditoría de código muerto (12-jun-2026)

> Barrido del repo (frontend `src`/`e2e`, backend `src`/`server.js`, package.json, raíz) buscando código
> sin usar, clasificado por **riesgo de borrado**. Detectado con greps exhaustivos y **verificado
> adversarialmente** (un segundo agente intentó refutar cada hallazgo de riesgo cero). Sesión autónoma.
>
> **Regla aplicada:** solo se eliminó lo de **riesgo CERO y verificable** (imports/funciones sin ninguna
> referencia, que un linter marcaría, sin cambio de comportamiento). Todo lo **dudoso** y **no-tocar** solo
> se lista con recomendación, para que **Maiki decida**.

---

## ✅ Eliminado en esta sesión (riesgo CERO, verificado + suite verde)

Ambos en `frontend/src/pages/IntegracionEstimacion.jsx` (HU-12, **no** zona congelada), residuos del
layout viejo basado en pestañas (la página se reescribió a vista única en Etapa A):

| Qué | Evidencia de que estaba muerto |
|---|---|
| `import Tabs from '../components/ui/Tab.jsx'` (L2) | `Tabs` solo aparecía en esa línea y en un comentario (L243). **0** usos `<Tabs` en el archivo. Otras páginas (AltaContrato, MinutasVisitas, RevisionEstimacion) sí usan `Tabs` con su propio import — intactas. |
| `function TabPlaceholder({ titulo })` (L493-503) | Definida y **nunca** invocada/exportada/referenciada. Único match de `TabPlaceholder` en todo el repo era su definición. |

**Verificación:** `vite build` ✅ + spec `hu-12-integracion-estimacion` ✅ (3 passed / 2 skipped) tras la
eliminación. No altera comportamiento.

---

## 🟡 DUDOSO — NO se tocó (requiere decisión de Maiki)

### Componentes UI huérfanos (del sistema de diseño UI-1, sin importadores)
Ningún archivo los importa hoy; no hay barrel `index.js`. Son piezas del sistema de diseño guinda que
quedaron sin cablear. **Recomendación:** conservar si se planea usarlos en futuras vistas; si no, borrarlos
en un PR aparte (no es riesgo cero porque son componentes "de librería", podrían cablearse después).

| Archivo | Qué es |
|---|---|
| `frontend/src/components/ui/Card.jsx` | Tarjeta blanca del sistema de diseño. 0 importadores. |
| `frontend/src/components/ui/Badge.jsx` | Pill/badge de estado. 0 importadores (ojo: existe `BadgeSprint.jsx`, distinto). |
| `frontend/src/components/ui/CardCriterioAceptacion.jsx` | Tarjeta de criterio con checkboxes Sí/No. 0 importadores (el que sí se usa para criterios es `SeccionCriterios.jsx`). |

### Wrapper de API sin caller
| Ubicación | Nota |
|---|---|
| `frontend/src/services/api.js:27` — `health: () => request('/health')` | Sin ningún caller en el frontend. El endpoint `GET /api/health` existe inline en `server.js:28` (no en `routes/`), probablemente para health-check de Render. **Recomendación:** conservar el wrapper (es trivial y el endpoint es legítimo) o quitarlo si se confirma que nadie lo usará desde el front. NO tocar el endpoint (zona congelada `server.js`). |

### Archivos de trabajo en la raíz del repo (scratch de ESTA sesión y previas)
Untracked (no versionados), pero ensucian el árbol. **Recomendación:** borrar — son artefactos de
trabajo, no parte de la app. *(Los `.work_*` de esta sesión se limpian al cierre; los `.tmp_*.cjs` son de
una auditoría previa.)*

`.tmp_check_exports.cjs` · `.tmp_scan_unused.cjs` · `.work_audit.json` · `.work_deadcode.json` ·
`.work_gen_docs.py` · `.work_gen_xlsx.py` · `.work_hu_xlsx.txt`

> ⚠️ El `.gitignore` **no** cubre los prefijos `.tmp_*`/`.work_*` (el patrón `*.tmp` es por extensión, no
> prefijo). **Recomendación:** añadir `.tmp_*` y `.work_*` al `.gitignore` para que el scratch no se cuele.

### Carpeta `FEPI/` en la raíz del repo
10 archivos de material de referencia/fases tempranas (PDFs de la ley, Trazabilidad v1, diagramas, zips).
Ya está en `.gitignore` (`FEPI/`), así que no se versiona. **Recomendación:** dejarla (material de
consulta de Maiki); no es código.

---

## 🚫 NO-TOCAR (huérfano a propósito)

| Archivo | Por qué se conserva |
|---|---|
| `frontend/src/components/ui/BadgeSprint.jsx` | Componente **neutralizado** (retorna `null`) tras quitar el modo proyecto. Su comentario de cabecera dice explícitamente que se conserva con su firma "por si alguna página lo importa, para no romper el build". Es un stub de compatibilidad intencional. Borrarlo es decisión de Maiki, no automática. |

---

## Notas de método y alcance

- **Dependencias de `package.json`:** el barrido no encontró dependencias claramente sin usar que fueran
  riesgo cero (varias se usan vía config: tailwind/postcss/autoprefixer, `@playwright/test` en specs, `pg`
  vía pool, `exceljs`/`jspdf` en reportes). No se quitó ninguna (alterar el lockfile/build no es riesgo cero).
- **Endpoints sin caller:** fuera de `/health` (arriba), no se hallaron rutas montadas sin consumidor que
  fueran seguras de marcar; los endpoints son zona congelada (`server.js`/controllers) y no se tocan.
- **Specs huérfanos:** no se encontraron specs e2e que prueben páginas inexistentes (todas las rutas de
  `App.jsx` tienen su página; las specs vigentes corresponden a HU reales).
- **`_PLANTILLA_VISTA.jsx`** se excluyó del barrido (plantilla intencional) y los `scripts/` de backend
  (herramientas CLI que se invocan a mano).
