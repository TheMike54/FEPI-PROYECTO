# AUDITORÍA DE CÓDIGO MUERTO — SIGECOP · 18-jun-2026 (solo análisis, NADA borrado)

> Encargo de Maiki: tras mover mucho (cascarones "Ambiente*" → wizards), encontrar lo que quedó sin uso.
> **Recorrido del código REAL** (frontend `src/` + backend `src/` + `e2e/`) con `grep`/`find`, no de memoria,
> y una **2ª pasada ADVERSARIAL** que intentó PROBAR que cada "muerto" en realidad se usa (por import / `<Link>` /
> `page.goto` / montaje / ciclo-de-vida). **No se borró nada.** Tú decides con esto.

## 0. Conclusión (honesta)
**Hay MUY poco código muerto real.** El rediseño dejó los cascarones `Ambiente*` **sin entrada directa en el
sidebar, pero NO muertos**: cada uno conserva su ruta en `App.jsx`, su spec e2e (`page.goto`) y —clave— está
**enlazado desde `CicloVidaContrato.jsx`** (el macro "Ciclo de vida", que SÍ sigue en el sidebar). La pasada
adversarial **tumbó 3 falsos positivos** (SeccionCriterios, HeaderVista, `dummy.js`: parecían muertos pero los
usan 23 / ~30 páginas / la navegación). Lo realmente borrable es **pequeño y de bajo valor** (ruido, no peso).

## 1. 🟢 SEGURO DE BORRAR (cero referencias reales — verificado por grep adversarial)
| Ruta | Qué es | Evidencia (0 refs) | Nota |
|---|---|---|---|
| `frontend/src/components/ui/BadgeSprint.jsx` | Componente neutralizado (`return null`, vestigio del modo proyecto) | grep exhaustivo en `src`/`e2e`/`App.jsx`/`Sidebar.jsx`: **0 imports, 0 renders** | **Borrable tal cual** (nadie lo importa). |
| `loginComo` (export en `frontend/e2e/_helpers.js`) | Alias de `enterAppMode` | **0 usos** en los 68 specs (sí se usan los demás helpers) | Borrar **solo esa función**; el archivo se queda (lo importan 64 specs). |
| ~25 exports de maqueta en `frontend/src/data/dummy.js` | Datos dummy del "modo proyecto" (`programaObraDummy`, `fianzasListadoDummy`, `notasRecientesDummy`, `historialEstimacionesDummy`, `caratulaEstimacionDummy`, `soportesPagoDummy`, … 25 en total) | grep: **0 refs** en `src` | Borrar **esos exports**; **CONSERVAR `historiasUsuario`** (crítico: navegación/sidebar) **y `contratoDummy`** (lo usa `_PLANTILLA_VISTA.jsx:42`). |
| Comentarios editoriales obsoletos | `App.jsx` (menciona "modo proyecto"/"atajo demo"/"SoloModoProyecto"), `dummy.js:515` ("vistasPropuesta eliminado") | Son comentarios; describen estado pasado | Cosmético; bórralos si molestan. |
| `frontend/src/pages/_PLANTILLA_VISTA.jsx` | Plantilla para vistas nuevas | 0 refs; su header dice "NO se enruta — sólo referencia" | **Muerto INTENCIONAL.** Decides: dejarlo como plantilla o quitarlo. |

> **Valor de borrar esto:** bajo. No "pesa" en runtime (nada se importa/ejecuta), no afecta el bundle de forma
> notable, no rompe la suite. Es **limpieza de ruido**, opcional.

## 2. 🟡 DUDOSO (inerte pero REFERENCIADO — borrarlo exige tocar muchos sitios)
| Ruta | Qué es | Evidencia | Riesgo de borrar |
|---|---|---|---|
| `frontend/src/components/vista/SeccionCriterios.jsx` | Componente que **retorna `null`** (la metadata académica se quitó) | Pero está **importado y renderizado en 23 páginas** (`AltaContrato:2063`, `ConveniosModificatorios:835`, `EnvioEstimacion:323`, +20) | No es borrable solo: hay que quitar 23 `<SeccionCriterios>` + sus imports. **Riesgo bajo** (no renderiza nada) pero **churn medio** (23 archivos). |
| Props inertes `sprint` / `rolAcademico` / `descripcion` de `HeaderVista.jsx` | Props que se aceptan pero **ya no se renderizan** (metadata académica eliminada) | ~30 páginas las siguen pasando | Quitarlas = refactor coordinado en ~30 páginas. **Bajo riesgo, churn alto.** (HeaderVista en sí **está VIVO**: tiene `useVistaHU` + `AvisoSoloLectura`.) |

## 3. 🔴 NO TOCAR (parece muerto pero SE USA — la pasada adversarial lo probó)
- **Los 7 `Ambiente*.jsx`** (`AmbienteBitacora`, `AmbienteAvance`, `AmbientePago`, `AmbienteConvenio`,
  `AmbienteFiniquito`, `AmbienteExpediente`, `AmbienteEstimacion`): cada uno tiene **ruta en `App.jsx`** +
  **spec e2e** (`ambiente-*.spec.js` con `page.goto`) + está **enlazado desde `CicloVidaContrato.jsx`** (el
  macro "Ciclo de vida", que sí está en el sidebar → Vistas ejecutivas). `AmbienteBitacora` y `AmbienteAvance`
  además SON la entrada de su ciclo en el sidebar plano. **Borrar uno = quitar también su ruta + spec + el link
  del ciclo-de-vida.** No son "huérfanos": perdieron la entrada directa, no el uso.
- **`AmbienteEstimacion.jsx`** (10 líneas, redirige/envuelve al wizard): vivo (ruta + spec `fase5` + ciclo-vida).
- **`CicloVidaContrato.jsx`**: vivo (sidebar + spec + es quien mantiene vivos los Ambiente*).
- **`SeccionCriterios.jsx` / `HeaderVista.jsx` / `dummy.js` / `_helpers.js`**: **la 1ª pasada los marcó muertos;
  la adversarial los REFUTÓ** (23 / ~30 / navegación / 64 specs los usan). Por eso este reporte distingue
  "archivo vivo con partes inertes" (🟡) de "archivo muerto" (🟢).
- **Todas las páginas de HU + transversales** (Inicio, AltaContrato, SeleccionRol, SolicitudRegistro, etc.): vivas.

## 4. Recomendación
- **A 6 días de la entrega: NO es necesario borrar nada.** El código muerto real (BadgeSprint, `loginComo`, ~25
  dummy exports, comentarios) es **inerte** (no se ejecuta ni se envía de forma problemática); limpiarlo es
  cosmético y **no justifica el riesgo de tocar** justo antes de entregar.
- **Si quieres tree limpio (opcional, ~20 min, riesgo casi nulo):** borra `BadgeSprint.jsx`, la función
  `loginComo`, y los ~25 exports de `dummy.js` (conservando `historiasUsuario`/`contratoDummy`). Build + suite
  para confirmar. Eso es TODO lo 🟢 de verdad.
- **Deja para POST-entrega:** lo 🟡 (quitar `SeccionCriterios` de 23 páginas, props inertes de HeaderVista) — es
  churn amplio por beneficio cosmético.
- **NUNCA** toques los `Ambiente*` ni `CicloVidaContrato` sin antes decidir el destino del macro "Ciclo de vida"
  (si lo conservas, ellos se quedan).

*Auditoría con `grep`/`find` sobre el código real + verificación adversarial (16 agentes). Nada borrado. La
adversarial corrigió 3 falsos positivos — por eso clasifica fino entre "archivo muerto" y "parte inerte".*
