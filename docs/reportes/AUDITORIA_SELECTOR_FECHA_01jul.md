# Auditoría del selector de fecha simulada — elegibilidad vs sello (todo el sistema)

**Fecha:** 2026-07-01 · **Rama:** `main` · **LOCAL, sin push.**
**Patrón aplicado:** la fecha simulada (`fecha_ref`) puede cambiar QUÉ se ve estimable/vencido/disponible
(ELEGIBILIDAD y estado visible = lecturas), pero NUNCA lo que se ESCRIBE (los SELLOS temporales —
`integrada_en`, `enviada_en`, `firmado_en`, `fecha` de nota, `fecha_pago`, `vigencia_desde`, `created_at`…—
son SIEMPRE la fecha real del servidor). `fecha_ref` no se persiste en ningún registro.

## Cómo fluye `fecha_ref`
- **Lecturas (GET):** `services/api.js` lo agrega automáticamente cuando hay simulación (backend lo lee con
  `fechaRefDe(req)` desde la query).
- **Escrituras con elegibilidad por tiempo (POST):** el frontend lo manda EXPLÍCITO en el body/FormData solo
  cuando hay simulación; el backend lo valida con `fechaRefDeValor(body.fecha_ref)` y lo usa SOLO para el gate
  de elegibilidad. Los sellos siguen `NOW()`/`CURRENT_DATE`/valor fijo del programa.

## Tabla de casos

| Archivo:función:línea | Qué decide | Clasif. | Sello real separado |
|---|---|---|---|
| `lib/fechaRef.js` | infraestructura (`fechaRefDe` query, `fechaRefDeValor` valor) | ✅ | n/a |
| `alertas.controller` (periodo vigente, déficit, `dias_atraso`) | atraso/días por concepto | ✅ ya | n/a |
| `portafolio.controller` (semáforo, días post-término, cortes de mes, art.54) | semáforo ejecutivo | ✅ ya | n/a |
| `tablero.controller` (`dias_en_estado`) | antigüedad por estado | ✅ ya | n/a |
| `instruccion-pago.controller::estadoTransito` (plazo art.54 + vigencia fianza) | semáforo de pago | ✅ ya | n/a |
| `bitacora.controller::construirPayloadNotas` (`plazo_vencido`→tácita) | estado de nota en consulta | ✅ ya | n/a |
| `estimaciones.controller::integrarEstimacion` (gate "periodo vencido") | ¿periodo estimable? | ✅ (fix 01-jul) | `integrada_en=NOW()` real ✅ |
| `trabajos.controller::registrarAvance` (gate futuro/cerrado) | ¿se puede reportar avance? | ❌→**ARREGLADO** | `fecha=periodo.fin` (fija) + nota `NOW()` real ✅ |
| **`notas-pendientes.controller::notasPendientes:23`** (`NOW()<=fecha+plazo`) | ¿nota "por firmar" o ya tácita? (campana) | ❌→**ARREGLADO** | firma real (`firmarNota`) usa `NOW()`; aquí no hay sello ✅ |
| **`RegistroFianzas.jsx::diasHasta:32`** (`new Date()`) | badges Vencida/Vence en/Vigente | ❌→**ARREGLADO** | `vigencia` es dato del usuario; badge es solo lectura ✅ |
| `RevisionEstimacion.jsx::semaforoRevision` (art.54, 15 días) | semáforo de revisión | ✅ ya (ahoraRefMs) | n/a |
| `EnvioEstimacion.jsx` (semáforo/presentación) | plazo de presentación | ✅ ya (ahoraRefMs) | n/a |
| `CurvaAvance.jsx::hoyISO` | corte/curva "a hoy" | ✅ ya (getFechaRef) | n/a |
| `TrabajosTerminados.jsx:241,277` (preselección/marcador de periodo) | asistencia visual (periodo en curso) | ❌→**ARREGLADO** (getFechaRef) | n/a |
| `bitacora.controller::firmarNota:950,952` (`NOW()`, `n.fecha` art.125) | plazo tácita + vigencia de firma (ESCRITURA) | ⚠️ no se toca | sello `firmado_en=NOW()`, vigencia usa `n.fecha` real ✅ |
| `garantias.controller::vigenciaVencida` | valida vigencia al CREAR/EDITAR fianza (ESCRITURA) | ⚠️ no se toca | validación de entrada con fecha real ✅ |
| `convenios.controller:319/328` (`fin<CURRENT_DATE`) | bloquear adicional en periodo pasado (ESCRITURA; moot: #11 ya prohíbe adicionales) | ⚠️ no se toca | escritura con fecha real ✅ |
| `AltaContrato.jsx::hoyISOAlta` (fecha_inicio/vigencia ≥ hoy) | validación de entrada al CREAR contrato | ⚠️ no se toca | datos del formulario, fecha real ✅ |
| `RegistroPagoForm.jsx:25` (default `fecha_pago`) | default de formulario (editable) | ⚠️ no se toca | default real, usuario puede cambiar ✅ |
| Sellos: `bitacora.controller:318/443` (`firmado_en/fecha=NOW()`), `estimaciones-ciclo:209` (`enviada_en=NOW()`), `finiquito:162` (`cerrado_en=NOW()`), `roster:153/215/220` (`vigencia_desde/hasta=CURRENT_DATE`), `usuarios:80` (`aprobado_en=NOW()`), `instruccion-pago:343` (`fecha_instruccion` DEFAULT), `convenios:336/414` (`supersedido_en/autorizado_en=NOW()`), defaults `created_at`… | sellos de auditoría | ⚠️ no se tocan | `NOW()`/`CURRENT_DATE` real ✅ |
| Timestamps de descarga/impresión/ID: `Toast.jsx`, `reportesContrato.js`, `Finiquito.jsx`, `HistorialEstimaciones.jsx`, `ConsultaNotas.jsx`, `ConsultaExpediente.jsx:724`, `ReingresoEstimacion.jsx`, `DocumentoAvanceFisico.jsx`, `DocumentoNota.jsx` | nombre/fecha de archivo, ids | 🔵 irrelevante | n/a |
| Resaltados visuales: `ConsultaExpediente.jsx:164`, `AltaContrato.jsx:1144` (`periodoQueContiene(new Date())`) | resaltar periodo en matriz de lectura | 🔵 cosmético | n/a |

## ❌ arreglados (detalle + verificación del sello real)

1. **`estimaciones.controller::integrarEstimacion` + `IntegracionEstimacion.jsx`** (fix 01-jul previo,
   commit `a94d3e4`): el gate "periodo vencido" usa `COALESCE(body.fecha_ref, CURRENT_DATE)`; el sello
   `integrada_en` NO está en el INSERT → `DEFAULT NOW()` real. **Verificado:** integrar con
   `fecha_ref=2026-09-01` → 201 con `integrada_en=2026-07-01` (hoy real).

2. **`trabajos.controller::registrarAvance` + `TrabajosTerminados.jsx`** (commit `a94d3e4`): el gate
   futuro/cerrado usa `COALESCE(body.fecha_ref, CURRENT_DATE)`; el sello del avance es `fecha=periodo.fin`
   (fecha fija del programa) y la nota `NOW()` real. **Verificado:** avance en periodo futuro sin fecha_ref →
   409 "aún no inicia"; con `fecha_ref=2026-08-01` → registrado con `fecha=2026-08-22` (periodo.fin, no la
   simulada).

3. **`notas-pendientes.controller::notasPendientes`** (esta pasada): el filtro del plazo de firma usa
   `COALESCE($2::timestamptz, NOW())`; al avanzar el tiempo simulado, las notas cuyo plazo venció salen de
   "por firmar" (se tienen por aceptadas tácitamente, art. 123 fr. III RLOPSRM). **No hay sello** (la firma
   real `firmarNota` usa `NOW()` real e intacto). **Verificado:** residente 5 notas (real) → 0 con
   `fecha_ref=2027-06-01`; supervisión 6 → 0.

4. **`RegistroFianzas.jsx::diasHasta`** (esta pasada): los badges de vencimiento (Vencida/Vence en/Vigente)
   se calculan con `getFechaRef()`. **No hay sello** (la `vigencia` es dato del usuario; la validación al
   crear/editar la fianza —`garantias.controller`— sigue en fecha real). Solo lectura.

## ⚠️ NO se tocan (a propósito) — sellos reales / validaciones de escritura
- `firmarNota` (art.125 vigencia usa `n.fecha` real; sello `firmado_en=NOW()`) → **PRUEBA-TR-FIRMA-VIGENCIA
  intacto** (no se modificó `bitacora.controller`).
- `garantias.controller::vigenciaVencida` (validación al crear/editar/endosar).
- `convenios.controller` (bloqueo de adicional en periodo pasado; además moot tras #11).
- `AltaContrato.jsx` (validación fecha_inicio/vigencia ≥ hoy al crear el contrato).
- `RegistroPagoForm` default de `fecha_pago` (editable por finanzas).
- Todos los `NOW()`/`CURRENT_DATE`/`DEFAULT` de sellos de auditoría.

## 🛑 Detenido para Maiki
**Ninguno.** Todos los casos ❌ eran seguros de arreglar (lecturas o gates de elegibilidad con sello real
separado). No se tocó zona congelada fuera de lo ya autorizado; no se arriesgó ningún sello; no se rompió
ningún fix previo (#2 fecha_nota atada al periodo, #14, #24, art.125). Build verde (frontend + backend).
