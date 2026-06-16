# Reporte — Pulido de UX / consistencia · 14-15 jun 2026

> Ejecución de `docs/PLAN_PULIDO_UX_14jun.md`. **Solo presentación** (JSX/Tailwind/microcopia/estados/
> consistencia). **LOCAL, sin commit/push.** Cero zona congelada, cero endpoints/queries/validaciones/cálculo.
> Verificado con `vite build` + suite Playwright (objetivo 258/8/0). Descubrimiento de la Fase 2 con un
> workflow de 6 agentes (36 hallazgos); se aplicaron los seguros de mayor impacto y se anota el resto.

---

## FASE 1 — P5, P6, P7, P9, P10 (aplicados)

| # | Cambio | Archivo(s) | Nota de seguridad |
|---|---|---|---|
| **P5** | **Selector de periodo del programa** en la captura de estimación: al elegirlo autocompleta las fechas. | `IntegracionEstimacion.jsx` | Se CONSERVAN los inputs `periodo-inicio`/`periodo-fin` (editables, con sus testids) → los specs que los rellenan siguen verdes. No cambia el dato enviado ni el cálculo. |
| **P6** | **Columna "Clave"** del concepto en la tabla de generadores. | `IntegracionEstimacion.jsx` | La `clave` ya venía del endpoint `estimacion-prep` (no se tocó backend). |
| **P7** | **Prefill de jurídicos** desde las cuentas: representante ← superintendente, firmante ← dependencia. | `AltaContrato.jsx` | Solo rellena si el campo está **vacío** (no pisa lo tecleado), editable, sin validación nueva. `[validar profe]` si deben ser esas personas. |
| **P9** | **Quitado el buscador presentacional** muerto del header. | `AppShell.jsx` | No tenía testid ni handler; ningún spec lo referencia. |
| **P10** | **Acceso "Por firmar"** (✍️) junto a la campana, para residente/contratista/supervisión. | `AppShell.jsx` | Enlaza a la ruta existente `/bitacora/por-firmar` (`data-testid="link-por-firmar"`). |

---

## FASE 2 — barrido proactivo (aplicados)

Todos **presentación pura**, `data-testid` y textos asercionados conservados.

| Pantalla / archivo | Aspereza | Pulido aplicado |
|---|---|---|
| **Inicio** (`Inicio.jsx`) | Hero gigante "SIGECOP" duplicado (la marca ya está en la barra); grid vacío sin mensaje; badge "lectura" gris de prototipo. | Encabezado sobrio ("Inicio" + apoyo); **estado vacío** ("No tienes módulos…", `inicio-sin-modulos`); badge **"Solo lectura"** homologado al estilo guinda. |
| **Login** (`SeleccionRol.jsx`) | Sin foco inicial en el correo. | `autoFocus` en el campo Correo. |
| **Revisión HU-15** (`RevisionEstimacion.jsx`) | **Estado CRUDO** visible ('Enviada'/'Autorizada') en el selector y el banner. | Usa `labelEstadoEstimacion` → "Presentada"/"Autorizada"/… consistente con HU-12/13/21. |
| **Convenios HU-03** (`ConveniosModificatorios.jsx`) | "Superseded" (inglés) en la tabla de versiones. | → **"Sustituida"** (español). |
| **Reportes HU-19** (`ExportacionReportes.jsx`, `reportesContrato.js`) | Jerga de dev al usuario: "Sin fuente — falta GET de observaciones…". | → "No disponible aún" + descripción del reporte 4 reescrita para el usuario. |
| **Estimación HU-12** (`IntegracionEstimacion.jsx`, ModalDetalle) | Tipo/estado de nota CRUDOS (`n.tipo`, `n.estado`); `% avance` sin decimal fijo; botón "📄 documento" en minúscula. | Tipo → `tipo_etiqueta`; estado → "Emitida"/"Anulada"; `% avance` a 1 decimal; botón → "📄 Ver como documento". |
| **Buscador de notas** (`BuscadorNotas.jsx`) | Microcopia divergente: "En plazo" vs "En plazo de firma"; "📄 documento" min. | Unificado a "En plazo de firma" y "📄 Ver como documento" (igual que HU-09). |
| **Documento de nota** (`DocumentoNota.jsx`) | Botón "🖨 Ver como documento / Imprimir" redundante (el modal YA es el documento). | → "🖨 Imprimir documento". |
| **Alertas HU-07** (`AlertasAtraso.jsx`) | El **error** se pintaba en ámbar (igual que un aviso). | Banner de error en **rojo** (semántica), `aviso-error` conservado. |
| **Alta HU-01** (`AltaContrato.jsx`) | Botones de solo-ícono "✕" sin `aria-label`. | `aria-label` en "Quitar concepto" / "Quitar póliza" (a11y). |

---

## Detectado pero NO aplicado (decisión de Maiki / lote futuro)

> Seguros pero de menor prioridad, o con un matiz que conviene decidir/validar.

- **`window.confirm` → Modal guinda** en (a) confirmación de "empresa nueva" del registro y (b) eliminar avance (HU-06). **NO aplicado:** `window.confirm` es un gate de control de flujo síncrono; cambiarlo a Modal reestructura el submit/handler (toca comportamiento) — fuera del alcance de pulido.
- **Unificar formato de moneda** a `utils/formato.js` (`monedaMXN`) en `RegistroPago.jsx` ('$ ' en-US), `ConsultaExpediente.jsx` ('$ ' en-US) y `TableroEstimaciones.jsx`. **Cuidado:** `hu-17-tablero.spec.js` asercióna el monto **con** el espacio (`'$ 199,000.'`); unificar el Tablero exige actualizar ese spec (lección 7). Recomiendo hacerlo como un mini-lote propio.
- **Estado vacío del selector de contrato** ("No tienes contratos asignados") en HU-04/05/06/07 y en las 3 vistas de bitácora cuando `listarContratos()` devuelve `[]`. Seguro; pendiente por tiempo.
- **Remapear la paleta cruda** (slate/red/amber) a tokens guinda en `ExportacionReportes.jsx` (la página más "fuera de estilo" del set). Seguro; cosmético amplio.
- **Microcopia de carga unificada** ("Cargando…" vs "Consultando bitácora…" vs "Cargando convenios…") y cajas de carga/vacío/error consistentes en Alta→Registrados, Convenios y Roster. Seguro; baja prioridad.
- **`EncabezadoContrato`** en Roster (HU-22) para igualar el contexto de contrato de las demás páginas. Seguro.
- **`DocumentoNota.fechaHora`** usa formato 'long' vs el 'short' del resto (defendible en un documento-acta; decisión de estilo).
- **Pie institucional** en la pantalla de login (LOPSRM/RLOPSRM/dependencia). Cosmético.

---

## Confirmación de alcance

- **Backend:** sin cambios de lógica. El único archivo `*/services|controllers` tocado es `frontend/src/services/reportesContrato.js` (texto de una **descripción** de reporte; cero lógica/cálculo). **Ningún** controller/route/endpoint/query/validación/`schema.sql`/`permisos.js`/`server.js`/trigger tocado.
- **`data-testid` y textos asercionados:** conservados (P5 mantiene los inputs de fecha; los botones de documento conservan su testid; `aviso-error`, `inicio-sin-modulos` nuevos no rompen nada).
- **`vite build`:** ✅ (478 módulos). **Suite Playwright:** ✅ **258 passed / 8 skipped / 0 failed** (8.3 min) — objetivo 258/8/0 cumplido, sin regresiones.

*Sin commit/push. Listo para tu revisión del diff.*
