# Historias de usuario — VISTA POR CICLOS (rediseño por wizards)

> **Qué es.** Una vista que **agrupa** las historias por **ciclo/flujo** (no la lista plana HU-01…HU-24) y
> muestra, por cada wizard, el cuadro **"paso del wizard ↔ criterio de qué HU"** + un **checklist de
> conservación** (criterio viejo == criterio nuevo). **NO reescribe los requisitos**: la fuente de la verdad
> sigue siendo `Historias_Usuario_ACTUALIZADAS_12jun.md` (esta vista la **referencia**, una sola fuente, cero
> divergencia). Nace con el rediseño de bloques (`docs/planes/PLAN_REDISENO_BLOQUES_WIZARD_18jun.md`).
>
> **REGLA DE ORO (acuerdo con el profe).** La reestructura es **organizativa**: agrupa, aclara y muestra cómo
> se integran en el wizard. **NO relaja, NO agrega ni quita requisitos.** Cada criterio funcional de cada HU
> **sobrevive literal** (o solo se aclara). El checklist de abajo lo demuestra HU por HU.

## 0. Cómo leer
- Cada historia **conserva su número** (HU-12 sigue siendo HU-12) y **sus criterios** (los de
  `Historias_Usuario_ACTUALIZADAS_12jun.md`). Aquí solo se agrupan por ciclo y se mapean a los pasos del wizard.
- Un **PASO del wizard ≠ una historia**: los pasos son los **criterios internos de UNA** historia (p. ej.
  HU-12). Un **WIZARD** sí abarca varias historias del mismo ciclo, encadenadas.

## 0.1 Clasificación TIPO A / TIPO B (qué se bloquea y qué NUNCA se bloquea) — contrato de comportamiento

> **Eje del rediseño "por ciclos".** Cada ciclo tiene dos clases de historia:
> - **TIPO A — PASO SECUENCIAL (wizard con candado):** orden obligatorio; no avanzas al siguiente paso sin
>   completar el anterior. El candado es **server-side** (lo enforce el backend, no solo la UI); el stepper de
>   la pantalla es su **espejo**.
> - **TIPO B — VISTA SIEMPRE ACCESIBLE ("en paralelo"):** lectura que **NUNCA se bloquea**. Se ve en cualquier
>   momento aunque el wizard esté incompleto o no haya datos.
>
> **🔱 REGLA DE ORO (no se rompe):** una vista **TIPO B nunca** se condiciona a un paso del wizard ni a un
> candado. Su única precondición es **contrato seleccionado + participación** (lo que ya valida el backend). Si
> no hay datos, muestra **estado vacío** ("aún no hay …"), **nunca un error de bloqueo**.

| Ciclo | TIPO A (paso · condición de desbloqueo) | TIPO B (siempre accesible · por qué) |
|---|---|---|
| **Alta** (HU-01/02) | Datos→Catálogo→Programa→Jurídicos→Garantías→Plan→PDF (cada paso valida el anterior; cuadre 100% / plan = anticipo) | — |
| **Estimación** (HU-12/13/14/15/16/17) | Periodo→Generadores(no excede contratado/plan, art.118/45-A-X)→Carátula(neto≥0)→Soportes→Integrar(PDF firmado + candado) → **Presentar** (exige 'integrada') | **HU-14 Historial**, **HU-15 Revisión/autorización** (otro actor; supervisión turna→residencia autoriza), **HU-16 Reingreso** (acción gated a 'rechazada', pero la vista abre siempre), **HU-17 Tablero** — lectura/otro-actor, sin candado |
| **Bitácora** (HU-08/09/10/11) | Apertura→Firma(exige abierta)→**Emitir** (exige apertura FIRMADA por todos, art.123 fr.III) | **HU-10 Consultar** (consulta permanente del libro, art.123), **HU-11 Minutas** — sin candado; estado vacío si no hay apertura |
| **Pago** (HU-20/21) | Suficiencia(techo+partida, art.24)→Soportes→Instrucción(exige 'autorizada')→**Registrar pago** (HU-21, exige 'autorizada', no doble pago; botón solo finanzas) | — |
| **Avance** (HU-05/06/07) | Registrar avance (acción única; no excede contratado, art.118) | **HU-05 Curva**, **HU-07 Alertas** — lectura, siempre accesibles |
| **Convenios** (HU-03) | Registrar → Autorizar (servidor facultado, art.59 p3) — en una pantalla | — |
| **Finiquito** (HU-24) | Cierre/finiquito (acto único; exige bitácora abierta) | — |
| **Expediente** (HU-04) | — (visor) | **HU-04 Expediente** — solo lectura, siempre accesible |

> **Nota de gating:** los candados TIPO A viven en los controllers (server-side, verificado: `bitacora.controller`
> emisión exige firma; `estimaciones-ciclo` presentar exige 'integrada'; `pagos.controller` exige 'autorizada';
> `finiquito.controller` exige bitácora). El rediseño de navegación **no los toca**; el stepper los refleja.

---

## Mapa de ciclos
| Ciclo | Historias | ¿Wizard? | Estado del rediseño |
|---|---|---|---|
| Alta de contrato | HU-01, HU-02 | ✅ (ya existía) | hecho (wizard de 7 pasos) |
| **Ciclo de estimación** | **HU-12, 13, 14, 15, 16, 17** | ✅ insignia | ✅ **wizard hecho (FASE 3)** |
| Pago y tránsito | HU-20, 21 | ✅ wizard (4 pasos, HU-21 embebido) | ✅ Fase 4 + match |
| Bitácora | HU-08, 09, 10, 11 | ✅ wizard (+ paralelos) | ✅ Fase 4 |
| Avance y seguimiento | HU-05, 06, 07 | 🟡 pantalla + paralelos | ✅ Fase 4 |
| Convenios / Cierre / Expediente | HU-03 / HU-24 / HU-04 | 🔴 pantalla/visor | quedan igual (acto/visor) |
| Transversales | HU-00, HU-22, HU-23, Registro, Por firmar | — | pantallas propias |

---

## CICLO: Ciclo de estimación → HU-12, 13, 14, 15, 16, 17

**Wizard "Nueva estimación" (contratista/superintendente)** — `/estimaciones/integracion`. Integra **HU-12**
(integrar) y enlaza a **HU-13** (presentar). En paralelo (no encadenadas): **HU-15** Revisión/autorización
(otro actor: supervisión/residencia), **HU-16** Reingreso, **HU-14** Historial (lectura), **HU-17** Tablero.

### Paso del wizard ↔ criterio de qué HU
| Paso del wizard | Reusa (componente real) | Criterio que materializa |
|---|---|---|
| **1 · Periodo** | selector de contrato + periodo (selector del programa + fechas) | HU-12 cr. 4 (periodo ≤ 1 mes, no traslape, correlativo) |
| **2 · Generadores** | `TabGeneradores` (volumen ejecutado por concepto) + barras de avance + programa | HU-12 cr. 3 (semáforo art. 118 / plan) y cr. 2 (insumo del subtotal) |
| **3 · Carátula** | `TabCaratula` (subtotal − amortización − 5 al millar − deductivas − atraso = neto, vivo) | HU-12 cr. 2 (carátula server-side, sin IVA, no negativo) |
| **4 · Soportes y notas** | `TabNotasVinculadas` + modal de notas FIRMADAS | HU-12 cr. 5 (solo notas firmadas, sin apertura) |
| **5 · Integrar y presentar** | candado de cierre + `Integrar` (HU-12) + enlace a `Presentar` (HU-13) | HU-12 cr. 1 (superintendente + PDF + anticipo) e integra; enlace a HU-13 |

> El paso 4 incluye el **registro fotográfico**, ya **IMPLEMENTADO (21-jun)**: fotos JPEG/PNG como BYTEA en
> `estimacion_fotos`, subida/galería en el expediente (art. 132 fr. IV RLOPSRM). La **revisión/autorización
> (HU-15)** es un **wizard aparte de otro actor** (supervisión turna → residencia autoriza/rechaza).

### Checklist de conservación (criterio viejo == criterio nuevo)
**HU-12 · Integración de la estimación**
- [x] **cr. 1** (solo superintendente asignado + PDF firmado ligado + autorización del titular si anticipo
  > umbral, art. 50 fr. IV) → **conservado**: la autoridad y los candados los valida el backend al integrar
  (paso 5); el wizard no los relaja (el aviso de "solo el superintendente" y el 409 del server siguen).
- [x] **cr. 2** (carátula calculada server-side: subtotal/amortización art. 143 fr. I/5 al millar art. 191
  LFD/deductivas/atraso/neto sin IVA art. 2 fr. XIX, no negativo) → **conservado**: mismo `TabCaratula` (paso
  3), misma vista previa viva, mismo neto oficial al integrar.
- [x] **cr. 3** (bloqueo por exceso de lo contratado art. 118 y de lo planeado art. 45 ap. A fr. X / art. 52,
  con semáforo que deshabilita Confirmar) → **conservado y reforzado**: el semáforo sigue en `TabGeneradores`
  (paso 2) y ahora **además bloquea el avance** al paso siguiente y el botón Integrar.
- [x] **cr. 4** (periodo ≤ 1 mes art. 54, sin traslape, número correlativo seguro) → **conservado**: la captura
  del periodo (paso 1) y la validación del server al integrar son las mismas.
- [x] **cr. 5** (solo notas firmadas del contrato, sin la apertura; al integrar guarda el expediente +
  snapshot de avance físico/financiero) → **conservado**: mismo modal/filtro de notas firmadas (paso 4) y mismo
  guardado al integrar.

**HU-13 · Presentación de la estimación**
- [x] **cr. 1-5** → **conservados sin cambio**: la presentación sigue siendo su **propia pantalla**
  (`/estimaciones/envio`), enlazada desde el paso 5 del wizard. El wizard NO altera el sello de presentación,
  el candado de "una sola vez", el acuse ni el semáforo de 15 días (art. 54). Solo agrega el **enlace** para ir
  a presentar tras integrar.

> **HU-14/15/16/17** no cambian: son pantallas en paralelo (Historial, Revisión/autorización, Reingreso,
> Tablero); el wizard no toca sus criterios.

---

## CICLO: Pago y tránsito → HU-20, 21  ✅ **wizard hecho (FASE 4)**

**Wizard "Tránsito a pago" (contratista/finanzas)** — `/pagos/transito`. Integra **HU-20** (suficiencia →
soportes → instrucción) y enlaza a **HU-21** (registrar pago). El **ambiente de pago** (`/pagos/ambiente`)
se conserva como **macro del ciclo de cobro** (overview con enlaces a HU-14/15/20/21/24): NO era un
placeholder redundante, así que NO se eliminó (a diferencia del cascarón de estimación).

### Paso del wizard ↔ criterio de qué HU
| Paso | Reusa (componente real) | Criterio que materializa |
|---|---|---|
| **1 · Suficiencia** | `SuficienciaPresupuestal` + carga de techo/partida (finanzas) | HU-20 cr. 1 (suficiencia art. 24, partida obligatoria — ITEM 3.1) |
| **2 · Soportes** | tabla factura/CFDI/fianza de cumplimiento | HU-20 cr. 3 (soportes obligatorios) |
| **3 · Instrucción** | semáforo del plazo (20 días art. 54) + `Generar instrucción` + enlace a HU-21 | HU-20 cr. 2 (semáforo) y la emisión de la instrucción; enlace a HU-21 |

### Checklist de conservación
**HU-20 · Tránsito a pago** — [x] cr. 1-3 **conservados**: misma suficiencia (con partida obligatoria del
ITEM 3.1), mismos soportes, mismo semáforo y mismo gate de "Generar instrucción" (`puedeGenerar` = suficiencia
OK + soportes OK + estimación autorizada + sin instrucción previa). El wizard solo los presenta por pasos y
agrega el **enlace** a registrar el pago (HU-21).
**HU-21 · Registro del pago** — [x] **conservado sin cambio**: sigue siendo su **propia pantalla**
(`/pagos/registro`), enlazada desde el paso 3. Candados (importe = neto, no doble pago, solo autorizada,
fecha ≥ integración) intactos.

## CICLO: Bitácora → HU-08, 09, 10, 11  ✅ **wizard hecho (FASE 4)**

**Wizard del hilo legal** — `/bitacora/ambiente`. Pasos encadenados (uno a la vez, gating estilo Alta):
**1·Apertura (HU-08) → 2·Firma conjunta → 3·Emitir notas (HU-09)**. **Consultar (HU-10)** y **Minutas
(HU-11)** quedan **en paralelo** (lectura/episódico, SIEMPRE accesibles, no encadenadas — "consultar la
bitácora no se puede bloquear"). Cada paso enlaza a su pantalla real (no funde las HU).

| Paso | Enlaza a | Gating |
|---|---|---|
| **1 · Apertura** | `/bitacora/apertura` (HU-08) | — (siempre) |
| **2 · Firma conjunta** | `/bitacora/por-firmar` | exige bitácora **abierta** |
| **3 · Emitir notas** | `/bitacora/notas` (HU-09) | **candado**: apertura **firmada por todos** (art. 123 fr. III RLOPSRM) |

**Checklist:** [x] HU-08/09 **conservados** (la apertura, la firma y el candado de emisión son los mismos; el
wizard solo los ordena por pasos). [x] HU-10/11 **conservados e intactos** (pantallas en paralelo).

## CICLO: Avance y seguimiento → HU-05, 06, 07  ✅ **hecho (FASE 4)**

**Ambiente de avance** — `/seguimiento/ambiente`. La **acción** del flujo es **registrar el avance (HU-06)**;
**Curva (HU-05)** y **Atrasos (HU-07)** van **en paralelo** (lectura). La **evidencia fotográfica** ya está
**IMPLEMENTADA (21-jun)**: fotos JPEG/PNG como BYTEA en `estimacion_fotos`, galería en el expediente (art. 132
fr. IV RLOPSRM). El **registro de avance (HU-06) es append-only**: no se edita ni se
elimina; corregir = anular la entrada anterior y registrar una nueva vinculada (art. 123 fr. VI/VII RLOPSRM).
**Checklist:** [x] HU-05/06/07 **conservados** (registro con tope art. 118 y corrección append-only; curva y
alertas como lectura; sin cambio de requisitos).

---

*Vista por ciclos — referencia (no sustituye) a `Historias_Usuario_ACTUALIZADAS_12jun.md`. Conserva números y
criterios; la reestructura es organizativa (regla de oro). Crece un ciclo por vez, a la par del wizard.*
