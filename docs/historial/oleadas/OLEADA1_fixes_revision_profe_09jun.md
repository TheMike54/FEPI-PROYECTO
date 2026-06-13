# Oleada 1 — Paquete de fixes de la revisión del profe (9-10 jun 2026)

> Ejecuta el prompt O1 del plan maestro (`docs/Contexto Maestro y Plan Correcciones 09jun.md`).
> **LOCAL, sin commit/push.** Sin DDL. G1–G8, `permisos.js` y `server.js` intactos.
> Suite completa: ver resultado al pie. Para la clase del miércoles 10.

## Resumen por hallazgo

| # | Hallazgo | Qué se hizo | Archivos |
|---|---|---|---|
| P2 | Fecha de inicio debe aceptar pasadas | **NO SE REPRODUJO** (ver nota abajo): el código actual no tiene candado "≥ hoy" ni en frontend ni en backend; se probó el alta completa con fecha de hace una semana y GUARDÓ. Se blindó con spec de regresión | `e2e/o1-fixes-revision-profe.spec.js` (P2) |
| P5b | Aceptaba garantía con vigencia vencida (bug confirmado en vivo) | Se RECHAZA al capturar: `validarPaso(4)` exige vigencia ≥ hoy con mensaje claro; el backend la revalida (barrera real, patrón del tope de monto) | `AltaContrato.jsx`, `contratos.controller.js` |
| P5a | Avisar si la garantía excede el % esperado | **Modal de confirmación** (avisa, NO bloquea) al salir del paso 4 y al guardar: cumplimiento > 10% del monto, anticipo > %anticipo×monto. "Revisar montos" regresa; "Continuar de todos modos" sigue. La confirmación se recuerda por snapshot (si cambia un monto, re-pregunta) | `AltaContrato.jsx` |
| W2/W4a | "Asignación inicial" no es un motivo | Columna **Evento** (`Alta del contrato` \| `Sustitución` \| `Alta del rol`) separada de **Motivo** (vacío para el alta) en el roster (HU-02) y el expediente (HU-04). Derivado de `sustituye_a` en frontend, **sin DDL** | `RosterContrato.jsx`, `ConsultaExpediente.jsx` |
| W3 | Nota de sustitución: título genérico, motivo mal ligado, fecha en inglés | Título: `Sustitución de {rol}: {anterior} → {nueva}`. Cuerpo narrativo: *"Se sustituye a {anterior} como {rol}. Motivo del cambio: {motivo}. Entra {nueva} a partir del {fecha}."* Fecha **es-MX** ("10 de junio de 2026"); causa raíz del "Sat Jun 06": `String(fecha).slice(0,10)` sobre el `Date` que entrega pg | `bitacora.controller.js` (`textoNotaSustitucion` + `fechaLargaES`) |
| W4b | Encabezado del expediente mostraba al contratista ORIGINAL | El banner lee al **superintendente VIGENTE** de `api.rosterContrato` (fallback al snapshot del alta si no hay roster). El snapshot `contratos.contratista` NO se actualiza al sustituir; el vigente vive en el roster | `ConsultaExpediente.jsx`, `BannerContexto.jsx` (prop `testid` aditivo) |
| P12b | Catálogo del expediente sin clave | Columna **Clave** en la tabla (el payload ya la traía; solo estaba en el Excel) | `ConsultaExpediente.jsx` |
| P16 | Curva: no inicia en 0; sin tooltips | (a) Punto de **origen (inicio del contrato, 0%)** antepuesto a las 3 series cuando la ventana arranca en el periodo 1; (b) cada periodo grafica a su **CIERRE** (etiqueta = mes de `p.fin`, antes `p.inicio`); (c) **tooltip interactivo** al pasar el mouse (dibujado dentro del SVG + `<title>` nativo de respaldo) | `CurvaAvance.jsx` |
| P17 | Carátula sin número de estimación | Distintivo prominente **"Estimación No. {n} — Periodo {p} ({fechas})"** en la carátula viva: n = MAX+1 del historial (mismo correlativo que materializa el backend), p derivado del programa con `periodoQueContiene` | `IntegracionEstimacion.jsx` |

## ⚠️ P2 — nota importante para la clase

El candado de fecha **no existe en el código actual** (el mismo que corre en Render desde el push del 6-jun). Se verificó:
- `grep` exhaustivo de validaciones de fecha en frontend y backend: solo existen `inicio < término` y "actividad dentro del plazo" — nunca hubo "inicio ≥ hoy" (tampoco en el historial de git).
- Sonda Playwright contra el stack local: alta completa con `fechaInicio` de hace una semana → **guardó** (verificado en BD).

Lo que el profe vio probablemente fue **otro mensaje de validación atribuido a la fecha** (p. ej. el del programa de obra o campos faltantes), o estado viejo del navegador. **Sugerencia para mañana:** demostrarlo en vivo (el spec P2 lo deja amarrado) y, si el profe lo re-reproduce, capturar el mensaje EXACTO que muestra.

## Decisiones tomadas (y por qué)

1. **P2 sin cambios de código**: no se "quitó" nada porque no hay nada que quitar; inventar un cambio sería ruido. En su lugar: spec de regresión end-to-end que fija el comportamiento correcto.
2. **Vigencia vencida BLOQUEA / exceso de % solo AVISA**: es la semántica que pidió el profe (P5b "validar vigencia" como bug; P5a "no bloquear: avisar"). El bloqueo de vigencia también se revalida server-side (defensa en profundidad, patrón ya existente del tope de monto); la barrera del backend usa *hoy UTC − 1 día* para no rechazar por el desfase de zona horaria México (UTC−6) vs contenedor (UTC) — el gate exacto es el del frontend.
3. **Modal propio (no `window.confirm`) para P5a**: testeable con `data-testid`, lista los excesos con cifras, y recuerda la confirmación por snapshot — si el usuario luego cambia un monto, vuelve a preguntar. Cubre dos rutas: «Siguiente» del paso 4 y «Guardar» (con captura completa se puede editar garantías y guardar sin re-pasar por Siguiente).
4. **Evento derivado en frontend (sin DDL)**: `sustituye_a == null` distingue la fila inicial; el texto "Asignación inicial (alta del contrato)" sigue en BD (no se migra nada) pero ya no se muestra como motivo. Caso borde cubierto: un rol que se ASIGNA después (supervisión opcional) sin titular previo = "Alta del rol" y SÍ muestra su motivo.
5. **Encabezado vigente leído del roster (no se "arregla" el snapshot en BD)**: el plan S1 lo pide así; actualizar `contratos.contratista` al sustituir tocaría el endpoint transaccional (zona de Maiki) y el roster ya es la fuente de verdad del vigente.
6. **Nota de sustitución conserva los anclajes de la suite y la cita legal**: 'art. 125' y 'asentada al abrir' se mantienen textuales (lección 7: no romper asserts ajenos sin necesidad); `asunto` clampeado al `VARCHAR(200)`.
7. **Curva: el origen solo se antepone cuando la ventana visible arranca en el periodo 1** (en "últimos 3"/"último" no tiene sentido un punto de inicio). El tooltip se dibuja dentro del SVG (escala con el viewBox, sin matemática de DOM).
8. **P17 calcula el "próximo número" en el cliente solo como informativo**: el correlativo oficial sigue siendo el MAX+1 del backend al integrar; no se añadió endpoint ni columna.

## Tests (lección 7)

- **Nuevo** `e2e/o1-fixes-revision-profe.spec.js`: P2 (alta completa con fecha pasada guarda), P5b (vencida bloquea → corregida avanza), P5a (modal avisa → Revisar se queda → Continuar avanza), W2+P12b (expediente: Evento/Motivo + Clave).
- **Extendidos**: `hu-02-sustitucion-bitacora.spec.js` (banner del expediente = vigente; columna Evento; "Asignación inicial" ya no visible), `hu-05-curva-avance.spec.js` (P16: punto "Inicio" 0% + tooltips con valor), `estimacion-pantalla-unica.spec.js` (P17: "Estimación No. 1 — Periodo 1").
- Los textos que la suite ya asertaba de la nota de sustitución se conservaron (verde sin tocar esos asserts).

## Runbook de integración (Maiki)

1. Revisar el diff (frontend: `AltaContrato`, `ConsultaExpediente`, `RosterContrato`, `CurvaAvance`, `IntegracionEstimacion`, `BannerContexto`; backend: `contratos.controller` —zona congelada, 1 validación aditiva— y `bitacora.controller` —texto de la nota—).
2. `docker restart sigecop_backend` tras pull (backend no auto-recarga).
3. Suite local: `npx playwright test` (sin DDL: no hay migración que correr).
4. Commit + push a `main` → auto-deploy en Render. Smoke en producción: alta con fecha pasada, garantía vencida (bloquea), expediente (clave + evento), curva (tooltip), carátula (número).
