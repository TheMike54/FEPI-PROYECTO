# VERIFICACIÓN de hallazgos del equipo — SIGECOP (26-jun-2026)

> Sesión de **diagnóstico** (solo lectura de código + `SELECT` a la BD local; PRUEBA-TR-* re-sembrados antes de
> probar). **No se arregló nada.** Cada hallazgo se confirmó/desmintió leyendo el código real y consultando la BD;
> los veredictos CIERTO pasaron además por un **pase adversarial** (un segundo agente intentó refutarlos). Cruzado
> con `docs/reportes/AUDITORIA_GENERAL_PRE_ENTREGA_26jun.md`.

## Tabla de dictámenes

| # | Hallazgo | Veredicto | Dónde se verificó | ¿Ya detectado? | Gravedad | ¿Lo ve el profe? | Arreglo |
|---|---|---|---|---|---|---|---|
| 1 | C1 NOTA-VENCIDA: botón "Firmar" activo aunque la nota venció | ❌ **FALSO** | `bitacora.controller.js:firmarNota` (409 :929-933) + `construirPayloadNotas` (:679); `EmisionNotas.jsx:203`; `notas-pendientes.controller.js:23` | ya | n/a | no | n/a |
| 2 | C5 FIRMA-VIGENCIA: el residente **saliente** puede firmar nota de hoy | ❌ **FALSO** | `bitacora.controller.js:firmarNota`/`cargarAperturaYRol` (:419-423, 923) | parcial | n/a | no | n/a |
| 3 | C2 FIANZA-VENCIDA: (a) badge verde · (b) deja estimar con fianza vencida | ⚠ **DEPENDE** | (a) `RegistroFianzas.jsx:38,252-260` · (b) `estimaciones.controller.js`/`estimacion-prep.controller.js` (sin gate) vs `instruccion-pago.controller.js:108-141` (sí gate) | parcial | baja | posible | riesgoso |
| 4 | C4 AMORT-MULTI: ¿amortización deja saldo negativo o topa? | ⚠ **DEPENDE** | `estimaciones.controller.js:integrarEstimacion` (:343,349 sin tope) + `detalleEstimacion` (:521-534 sin clamp); invariante art.118 (:242) | nuevo | baja | no | n/a |
| 5 | C3 CONVENIO-PLAZO: ¿autoriza sin PDF del oficio? | ❌ **FALSO** | `convenios.controller.js:autorizarConvenio` (gate :407-411) | ya | n/a | no | n/a |
| 6 | Integrar-4: filtro de notas vinculables (¿solo solicitud-aprobación firmada 100%?) | ❌ **FALSO** (tras adversarial) | `IntegracionEstimacion.jsx:795-798,782`; `estimaciones.controller.js:221-234`; HU-12 criterio 5 | nuevo | baja | no | n/a (endurecimiento opcional = riesgoso) |
| 7 | HU-23: dedup de empresas ¿bloquea o solo avisa? | ❌ **FALSO** | `empresas.controller.js:resolverOCrearEmpresa` (:78-83 reutiliza); aviso front `empresa.js`/`SeleccionRol.jsx:295-302` | ya | n/a | no | n/a |
| C6 | REVISION-VENCIDA (afirmativa ficta) | **No es bug** (decisión legal de Maiki) | ver §C6 | — | — | sí (semáforo) | — |

**Resumen:** de los 7 hallazgos reportados, **ninguno es un bug claro**: 5 son **FALSOS** (el sistema ya hace lo
correcto) y 2 son **DEPENDE** (decisiones de diseño / protegidos por un invariante, sin defecto observable). Quedan 3
puntos de **endurecimiento opcional** (todos tocarían zona congelada → solo Maiki).

---

## Detalle por hallazgo

### 1 · C1 NOTA-VENCIDA — ❌ FALSO
El sistema **ya** trata la nota vencida como aceptación tácita:
- **Backend:** `firmarNota` corta con **409** ("ya se considera aceptada tácitamente, art. 123 fr. III RLOPSRM") cuando `NOW() > nota.fecha + plazo_firma_dias` (`bitacora.controller.js:929-933`, confirmado en el contenedor en vivo).
- **Frontend:** `EmisionNotas.jsx:203` pone `puedeFirmar = false` cuando `aceptacion === 'aceptada_tacita'` → **el botón se oculta**. La bandeja "Por firmar" excluye las vencidas (`notas-pendientes.controller.js:23`); `ConsultaNotas` es solo lectura.
- **Evidencia BD:** nota #2 de PRUEBA-TR-NOTA-VENCIDA (id 3968, tipo aviso, emisor superintendente, fecha hace 5 días, `plazo_firma_dias=2`) → `plazo_vencido = t`, 0 firmas, sin respuesta → `aceptacion = 'aceptada_tacita'`.
- **Probable confusión del tester:** lo único verde que queda es la **insignia** "Aceptada (tácita)" (`bg-green-100`), que parece un botón pero es una etiqueta de estado. **Ya detectado** (corregido el 25/26-jun).

### 2 · C5 FIRMA-VIGENCIA — ❌ FALSO (tenía razón el reporte de FASE 2, no el tester)
El residente **saliente** (`residente@`) **no** puede firmar: recibe **403**.
- `firmarNota` deriva el rol con `cargarAperturaYRol`, que **solo** mira los punteros del contrato (`residente_id/superintendente_id/supervision_id`), **no** `created_by` ni `esParteOSupervision` (`:419-423`). Tras la sustitución (art. 125) el caché quedó sincronizado: `residente_id = 408` (entrante). Para `residente@` (id 1) → `rolEnContrato = null` → **403 "no eres parte"** (`:923`), **antes** de la regla temporal.
- `created_by = 1` da acceso de **lectura** (`esParteOSupervision`), pero **no de firma**.
- **Dictamen exacto:** (a) `residente@` → **403** para cualquier fecha (incl. hoy); (b) entrante `residente2.demo@` firmando la nota vieja (anterior a su alta) → **409** regla temporal; (c) entrante firmando una nota dentro de su vigencia / de hoy → **201**. **Solo el entrante** firma; el saliente nunca. **Parcialmente** documentado (la auditoría/FASE 2 ya anotaba este matiz).

### 3 · C2 FIANZA-VENCIDA — ⚠ DEPENDE (dos sub-claims)
- **(a) Badge verde → FALSO.** Con vigencia `2026-01-15`, `RegistroFianzas.jsx:38` cae en la rama `dias < 0` → color **rojo**, etiqueta "Vencida hace N d", clase `bg-red-100` (`:252-260`). Sale **rojo**, no verde.
- **(b) Deja estimar con fianza vencida → CIERTO de hecho, pero con matiz.** Ni `integrarEstimacion` ni `estimacion-prep` validan la vigencia de la fianza (0 coincidencias de "fianza/garant" en el control de estimación) → **abre el formulario e integra**. **Pero** el sistema **sí bloquea** la fianza vencida en el **pago** (`instruccion-pago.controller.js:108-141` → `fianzaOk=false` → **409** "fianza de cumplimiento vigente"). El punto legalmente relevante (no se paga sin fianza vigente) está cubierto; que la **estimación/medición** además se bloquee es **decisión de diseño/profe**, no un fallo claro de la ley.
- **Si se quisiera endurecer** (gate de fianza vigente también en la integración): tocaría `estimaciones.controller.js` (**zona congelada**) → **riesgoso, propuesta para Maiki**. Severidad baja.

### 4 · C4 AMORT-MULTI — ⚠ DEPENDE (no topa explícito, pero el invariante lo impide)
- La amortización **nunca** se topa: `amortizacion = ROUND(subtotal × pct/100, 2)` siempre (`:343,349`, sin `LEAST`/`min`); y `saldo_por_amortizar` en la carátula de lectura **no** lleva `GREATEST(...,0)` (`:521-534`) → si la amortización acumulada superara el anticipo, lo **mostraría negativo**.
- **Pero el saldo negativo no es alcanzable en operación normal:** (1) los 3 conceptos están al 100%, y el gate **art. 118** (`:242`) bloquea cantidad extra → una 4ª estimación tendría subtotal 0 → amort 0 → saldo sigue en 0; (2) la única vía de ampliar capacidad es un **convenio**, que recalcula el monto y por ende el `importe_anticipo` **en la misma proporción** (`convenios.controller.js:256-257`) → al amortizar los conceptos nuevos al 30% el saldo se mantiene ≥ 0. El tope es **indirecto** (invariante: Σ subtotales ≤ monto ⇒ Σ amortización ≤ anticipo).
- **Evidencia BD:** las 3 estimaciones amortizan 90k+90k+120k = **300,000 = anticipo exacto, saldo 0**; sin capacidad para una 4ª.
- **Dictamen a Aldo:** el código **no topa explícitamente** (es FALSO que "topa"), pero **tampoco deja saldo negativo** (es FALSO el bug) porque el invariante del art. 118 lo impide. Único residuo teórico: **drift de centavos** (Σ ROUND por estimación vs ROUND del total) en la amortización — a lo sumo ± centavos, nunca "el 30% encima". **Nuevo**, severidad baja.

### 5 · C3 CONVENIO-PLAZO — ❌ FALSO
El **backend bloquea** autorizar sin oficio: `autorizarConvenio`, antes de pasar a `autorizado`, ejecuta `SELECT 1 FROM contrato_documentos WHERE convenio_id=$1` y si no hay → **ROLLBACK + 409** "carga el oficio… en PDF (art. 99 RLOPSRM)" (`convenios.controller.js:407-411`).
- El oficio solo puede crearse por `subirOficueConvenio` (tipo `oficio_convenio`, valida `%PDF`, índice único 1 por convenio). El acto es único (`estado!=='registrado'→409`) y solo `dependencia`. Aplica a **todo** convenio, no solo >25%.
- El **front no pre-gatea** (el botón "Autorizar" se muestra si `estado==='registrado'`), pero el **enforcement real está en el backend** y bloquea. *(Nota: el seed `seed_demo_tr.sql` siembra un convenio ya autorizado sin oficio mediante INSERT directo — eso **bypassa** el endpoint; no es la ruta de la app.)* **Ya detectado** (auditoría: oficio exigido para todo convenio).

### 6 · Integrar-4 (filtro de notas vinculables) — ❌ FALSO (tras pase adversarial)
El finder inicial lo marcó CIERTO; el **pase adversarial lo refutó** y confirma que el comportamiento **conforma a la historia**:
- HU-12 criterio 5: *"Solo se vinculan notas de bitácora ya firmadas del propio contrato (sin la apertura), validadas por el sistema."* Eso es **exactamente** lo que hace `notasFirmadas = notasContrato.filter(n => n.aceptacion==='firmada' && n.tipo!=='apertura')` (`IntegracionEstimacion.jsx:795-798`).
- **Filtro de tipo:** la HU **no** exige restringir a "solicitud de aprobación"; el art. 132 fr. II es **enunciativo** (la propia UI lo dice). Mostrar varios tipos firmados es **correcto**, no un bug.
- **Obligatoriedad:** integrar con **0 notas** es **por diseño** (la HU no exige ≥1); `pasoValido(3)→true`.
- **Único residuo real (endurecimiento opcional):** el **backend** solo valida **pertenencia** de la nota al contrato (`estimaciones.controller.js:221-234`), no re-valida "firmada"/"no apertura" → por API directa un superintendente autorizado podría adjuntar una nota en plazo o la apertura del **mismo** contrato. **No observable por UI**, actor ya autorizado → severidad **baja**; si se quisiera blindar, tocaría `estimaciones.controller.js` (**congelado**) → propuesta para Maiki. **Nuevo.**

### 7 · HU-23 dedup de empresas — ❌ FALSO
El backend **sí deduplica de verdad**: no lanza error/409, pero **reutiliza** la empresa existente (no crea duplicado).
- Dos niveles en `resolverOCrearEmpresa`: (1) **débil** = índice único SQL sobre `lower(btrim(regexp_replace(nombre,'\s+',' ')))`; (2) **fuerte** = normalización que quita acentos, puntuación y **sufijos de razón social** (S.A. de C.V., S.C., …) y recorre el catálogo; si coincide → `return m.id` (**reutiliza**, `:78-83`).
- El **"aviso de duplicado"** que ve Roñis es una **nota verde informativa** del front (`text-exito`, "no se duplicará"), **no un error**; el submit no se bloquea porque **no hace falta**: cuando el aviso aparece (= hay match fuerte) el backend **reutiliza**. La premisa "avisa pero crea duplicado" **no se cumple**.
- **Precisión del umbral:** la dedup cubre variantes por mayúsculas/acentos/puntuación/sufijos; un nombre "casi igual" por **tipeo real** (p. ej. "Talere" vs "Talare") **sí** crearía empresa nueva — **pero** en ese caso el aviso **tampoco aparece** (el front usa la misma norma) → el síntoma literal reportado nunca ocurre. *(Edge case menor: el nivel 2 no tiene índice único, así que una carrera concurrente de dos variantes fuerte-equivalentes pero débil-distintas podría crear un duplicado que luego funde `consolidar_empresas.js` — concurrencia, no el caso del tester.)* **Ya detectado** (HU-23 ✅ en la auditoría).

### C6 · REVISION-VENCIDA — confirmación de estado (NO es bug, decisión legal de Maiki)
Qué hace **hoy** la pantalla con una estimación presentada hace >15 días:
- **Semáforo ROJO** "Día N de 15 — Vencido" bajo el título "Plazo de revisión (art. 54 LOPSRM)" (derivado en el frontend desde `enviada_en`).
- **El estado NO cambia solo:** sigue **"Presentada"** (`enviada`); no hay materialización de "afirmativa ficta", y esas palabras **no** aparecen en el frontend.
- **El botón "Autorizar" NO se bloquea por el plazo vencido:** la autorización/rechazo gatea **solo** por `estado !== 'enviada'` (`estimaciones-ciclo.controller.js:365,400,439`); **no hay gate de plazo**. El semáforo es **informativo**. Es decir, hoy se puede autorizar normalmente una estimación con el plazo vencido.
- **Decisión pendiente de Maiki/profe:** si el vencimiento debe (a) materializar la afirmativa ficta (auto-autorizar) o (b) rotularse explícitamente. **No lo dictaminamos como bug.**

---

## Cruce con la auditoría general (26-jun)
- **Ya detectados** previamente: #1 (botón oculto + 409), #5 (oficio exigido), #7 (dedup ✅). #2 estaba como **matiz** documentado.
- **Nuevos** de esta verificación: #4 (amortización sin tope explícito pero invariante-protegida), #6 (residuo de blindaje server-side de notas). #3(b) se relaciona con el hallazgo de la auditoría sobre la fianza en el pago (ahí el gate **sí** existe).

## Endurecimientos opcionales (todos RIESGOSOS — zona congelada, solo Maiki; no son bugs)
1. **#3(b):** gate de fianza de cumplimiento vigente también en la **integración** de estimación (hoy solo en el pago). Toca `estimaciones.controller.js`.
2. **#4:** `GREATEST(saldo_por_amortizar, 0)` en la carátula de lectura, por robustez visual. Toca `estimaciones.controller.js`.
3. **#6:** que el backend re-valide que la nota vinculada esté **firmada** y **no sea apertura** (hoy solo valida pertenencia). Toca `estimaciones.controller.js`.

> **Conclusión:** el reporte del equipo no arroja bugs reales que el profe vaya a ver en pantalla; el sistema ya
> impone los candados que el tester creía faltantes. Lo único accionable son tres **endurecimientos de defensa en
> profundidad** (no observables por UI) que requieren tocar la zona congelada y, por tanto, el OK de Maiki. **No se
> modificó nada en esta sesión.**
