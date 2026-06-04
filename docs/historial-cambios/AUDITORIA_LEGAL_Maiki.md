# Auditoría legal de citas — SIGECOP (Pasada 1/4 de fundación)

**Autor:** Maiki (Fundación) · **Fecha:** 2026-06-04 · **Sobre:** main `690b64f` · **Tipo:** entregable interno.

Verificación de **todas** las citas legales del código y docs contra el **texto literal** de `docs/legal/`:
**LOPSRM** (DOF 14-11-2025), **RLOPSRM** (DOF 24-02-2023), **LFD**. Cada veredicto pega el fragmento literal.
**No soy abogado: lo legal lo confirma el profe.** Lo no sustentado en texto va marcado `[sin fundamento verificable]`.

> **Cómo se verificó:** `pdftotext -enc UTF-8` de los 3 PDF + lectura artículo por artículo. La numeración se
> validó contra ESTE texto (la reforma DOF 14-11-2025 renumera respecto de versiones viejas).

---

## 0. Resumen ejecutivo

- **2 errores inequívocos CORREGIDOS en código + docs vivos** (patch de correcciones aplicado, suite verde):
  1. **Convenio modificatorio: `art. 99 LOPSRM` → `art. 59 LOPSRM`.** El art. 99 LOPSRM es **ARBITRAJE**.
  2. **Datos de la nota de apertura: `art. 122 RLOPSRM` → `art. 123 fr. III RLOPSRM`.** El art. 122 es solo "uso obligatorio de la Bitácora"; los datos mínimos están en el 123 fr. III.
- **1 imprecisión CORREGIDA** (menor): `art. 46 último párrafo LOPSRM` citado para "evento inalterable" → ese párrafo es el *medio electrónico*; la inalterabilidad es `art. 123 fr. VI RLOPSRM`.
- **Regla del 100%: la cita ESTÁ BIEN y el `45-A-X` SÍ EXISTE** (al contrario de lo que temía la auditoría previa). Pero el texto **no exige numéricamente `=`**; lo único *duro* es `≤` (art. 118). Análisis + recomendación abajo. **No se cambió**: patch separado condicional listo.
- **2 suposiciones del prompt CORREGIDAS por el texto literal:**
  - "anticipo >30% = art. 50 **fr. II**" → en realidad es **fr. IV** (fr. II es el *hasta* 30%). El código ya citaba fr. IV → **CORRECTO, no se tocó**.
  - "45-A-X no parece existir" → **sí existe** (RLOPSRM art. 45 apartado A fracción X).
- **`2 al millar` CMIC** = `[sin fundamento verificable]` en textos federales (no está en LOPSRM/RLOPSRM/LFD).

---

## 1. Tabla cita-por-cita (con fragmento literal)

### 1.1 ❌ Errores corregidos

| # | Cita usada (dónde) | Veredicto | Artículo/fracción REAL + **fragmento literal** |
|---|---|---|---|
| E1 | **`art. 99 LOPSRM`** = convenio/enmienda · `lib/programa.js`, `programa.controller.js`, `Borrador_DDL`, `contexto_respaldo` | **CORREGIR → art. 59 LOPSRM** | **art. 99 LOPSRM** (lo citado) dice: *"El **arbitraje** podrá preverse en cláusula expresa en el contrato o por convenio escrito posterior a su celebración…"* → es arbitraje. **art. 59 LOPSRM** (correcto): *"Las dependencias y entidades, podrán… **modificar los contratos** sobre la base de precios unitario… **mediante convenios**, siempre y cuando no impliquen variaciones sustanciales…"*. (El RLOPSRM art. 99 también regula el convenio a nivel reglamento, pero la cita de **ley** es la 59; se usa 59 para alinear con HU-03.) |
| E2 | **`art. 122 RLOPSRM`** = datos/grupos de la 1ª nota · `schema.sql`, `bitacora.controller.js`, `AperturaBitacora.jsx`, `dummy.js` | **CORREGIR → art. 123 fr. III RLOPSRM** | **art. 122 RLOPSRM** (lo citado) dice solo: *"El **uso** de la Bitácora es **obligatorio** en cada uno de los contratos…"* (no lista datos). **art. 123 fr. III** (correcto): *"Se deberá iniciar con una **nota especial** relacionando como mínimo la fecha de apertura, datos generales de las partes… **domicilios y teléfonos**, datos particulares del contrato y **alcances descriptivos de los trabajos y de las características del sitio**…"* (+ "plazo máximo para la firma de las notas… se tendrán por aceptadas una vez vencido el plazo"). |
| E3 | **`art. 46 último párrafo LOPSRM`** = "evento inalterable" · `AperturaBitacora.jsx:288` | **CORREGIR (impreciso)** | El **último párrafo** del art. 46 LOPSRM dice: *"En la elaboración, control y seguimiento de la bitácora, se deberán utilizar **medios remotos de comunicación electrónica**…"* (no habla de inalterabilidad). La fuerza vinculante está en el **penúltimo** párrafo (*"…el contrato, sus anexos y la **bitácora**… son los instrumentos que **vinculan a las partes**…"*) y la **inalterabilidad** en **art. 123 fr. VI RLOPSRM**: *"Se **prohibirá la modificación** de las notas ya firmadas, inclusive para el responsable de la anotación original"*. → reformulado en la vista. |

### 1.2 ✅ Citas confirmadas CORRECTAS (fragmento literal)

| Cita | **Fragmento literal** que la sostiene |
|---|---|
| **art. 24 párr. 2 LOPSRM** (suficiencia presupuestaria, HU-20) | *"…podrán convocar, adjudicar o contratar… siempre y cuando **cuenten previamente con la suficiencia presupuestaria en la partida o partidas específicas**…"* |
| **art. 45 ap. A fr. IX RLOPSRM** (catálogo = presupuesto) | *"**Catálogo de conceptos**, conteniendo descripción, unidades… cantidades de trabajo, precios unitarios… **Este documento formará el presupuesto de la obra** que servirá para formalizar el contrato…"* |
| **art. 45 ap. A fr. X RLOPSRM** (programa por periodos) — **EXISTE** | *"**Programa de ejecución convenido conforme al catálogo de conceptos** con sus erogaciones, **calendarizado y cuantificado de acuerdo a los periodos**… **del total de los conceptos de trabajo**, utilizando preferentemente diagramas de barras, o bien, redes de actividades con ruta crítica…"* |
| **art. 46 Bis LOPSRM** (penas por atraso, deductivas) | *"Las **penas convencionales** se aplicarán **por atraso** en la ejecución de los trabajos…"* |
| **art. 47 LOPSRM** (15 días firmar contrato; garantía cumplimiento) | *"…en defecto de tales previsiones, **dentro de los quince días naturales** siguientes… No podrá **formalizarse contrato** alguno que no se encuentre **garantizado** de acuerdo con lo dispuesto en la **fracción II del artículo 48**…"* |
| **art. 48 LOPSRM** (garantías fr. I anticipo, fr. II cumplimiento; exención = últ. párr.) | *"…deberán **garantizar**: I. Los **anticipos**…; II. El **cumplimiento** de los contratos…"* · últ. párr.: *"…podrá **exceptuar** a los contratistas de presentar la garantía del cumplimiento del contrato…"* |
| **art. 50 fr. IV LOPSRM** (anticipo **>30%** → autorización titular) | *"Cuando las condiciones de los trabajos lo requieran, el porcentaje de anticipo **podrá ser mayor al treinta por ciento**… será necesaria la **autorización escrita de la persona titular** de la dependencia o entidad…"* |
| **art. 50 fr. V LOPSRM** (anticipo plurianual último trimestre) | *"Cuando los trabajos **rebasen más de un ejercicio**… se inicien en el **último trimestre**… otorgar como anticipo **hasta el monto total** de la asignación…"* |
| **art. 52 párr. 2 LOPSRM** (programa = base del avance) | *"El **programa de ejecución convenido** en el contrato y sus modificaciones, **será la base conforme al cual se medirá el avance** en la ejecución de los trabajos."* |
| **art. 52 Ter últ. párr. LOPSRM** (apertura previa al inicio) | *"El Residente deberá **abrir la Bitácora con una nota de apertura previo a la fecha de inicio** de los trabajos establecida en el contrato…"* |
| **art. 54 párr. 1 LOPSRM** (6 días presentación; 15 días revisión, HU-13/15) | *"…deberá presentarlas a la residencia dentro de los **seis días naturales** siguientes a la fecha de corte… la residencia para realizar la revisión y autorización… contará con un plazo no mayor de **quince días naturales**…"* |
| **art. 54 párr. 2 LOPSRM** (20 días pago, HU-20) | *"Las estimaciones… deberán pagarse… en un plazo no mayor a **veinte días naturales**, contados a partir de la fecha en que hayan sido autorizadas por la residencia… y que el contratista haya presentado la **factura**…"* |
| **art. 59 LOPSRM** (convenio modificatorio) | *"…modificar los contratos sobre la base de precios unitario… **mediante convenios**…"* |
| **art. 59 Bis LOPSRM** (>50% → ajuste costos indirectos) | *"Cuando la modificación… implique aumento o reducción por una **diferencia superior al cincuenta por ciento** del importe original… podrá solicitar el **ajuste de costos indirectos y del financiamiento**…"* |
| **art. 118 RLOPSRM** (no exceder lo contratado) | *"Si el contratista realiza trabajos por **mayor valor del contratado, sin mediar orden por escrito**… **no tendrá derecho a reclamar pago** alguno por ello…"* |
| **art. 122 RLOPSRM** (uso obligatorio de bitácora) | *"El **uso** de la Bitácora es **obligatorio** en cada uno de los contratos de obras y servicios."* |
| **art. 123 fr. V/VI/VII/VIII/XII RLOPSRM** (folio, inalterable, anulación, adición, cierre) | V: *"Todas las notas deberán **numerarse en forma seriada y fecharse consecutivamente**…"* · VI: *"Se **prohibirá la modificación** de las notas ya firmadas…"* · VII: *"…la nota deberá **anularse** por quien la emita… **abrir… otra nota con el número consecutivo**… con la descripción correcta"* · VIII: *"…de ser necesario adicionar un texto, se deberá **abrir otra nota haciendo referencia a la de origen**"* · XII: *"El residente, el superintendente y, en su caso, el supervisor deberán **resolver y cerrar** invariablemente todas las notas…"* |
| **art. 125 fr. I/II/III RLOPSRM** (tipos de nota por rol) | I (residente): autoriza/aprueba; II (superintendente): solicita/avisa; III (supervisión): avance/calidad/seguridad/juntas. **Sustitución = fr. I inciso g)** → *"La **sustitución del superintendente, del anterior residente y de la supervisión**"*. |
| **art. 128 RLOPSRM** (retención fiscal sobre la estimación) | *"…deberán considerar para su pago los **derechos e impuestos** que les sean aplicables, así como **retener** el importe de los mismos…"* |
| **art. 132 fr. I/II/IV RLOPSRM** (expediente de estimación) | *"I. **Números generadores**; II. **Notas de Bitácora**; … IV. Controles de calidad, pruebas de laboratorio y **fotografías**…"* |
| **art. 139 RLOPSRM** (anticipo >50% → informar a SFP) | *"…anticipo **superior al cincuenta por ciento**… deberá **informar a la Secretaría de la Función Pública, previamente a la entrega del anticipo**, señalando las razones…"* |
| **art. 143 fr. I RLOPSRM** (amortización proporcional) | *"El anticipo se amortizará del importe de cada estimación… dicha amortización deberá ser **proporcional al porcentaje de anticipo otorgado**…"* |
| **art. 185 RLOPSRM** (precio unitario por unidad de concepto) | *"…se considerará como **precio unitario** el importe de la remuneración o pago total que debe cubrirse al contratista **por unidad de concepto terminado** y ejecutado…"* |
| **art. 2 fr. XIX RLOPSRM** (monto ejercido SIN IVA) | *"Monto total ejercido: el importe… **sin considerar el impuesto al valor agregado**;"* |
| **art. 191 LFD** (5 al millar) | *"…obra pública y de servicios relacionados con la misma, pagarán un derecho equivalente al **cinco al millar**…"* (servicio de vigilancia, inspección y control). |

### 1.3 ⚠️ `[sin fundamento verificable]` / a confirmar con el profe

| Cita / regla | Estado | Nota |
|---|---|---|
| **"2 al millar" / CMIC** | `[sin fundamento federal]` | NO aparece en LOPSRM/RLOPSRM/LFD (los "al millar" del LFD son de valores/CNBV, no obra pública). Es **aportación estatal CMIC/ICIC** de capacitación. El código ya lo marca "no LOPSRM, DIFERIDO" → consistente. **No se tocó.** |
| **Mecanismo de alerta in-app** (HU-07) | operativo | La base del atraso sí es legal (art. 45-A-X programa + art. 46 Bis penas), pero la *alerta in-app* en sí no tiene artículo literal. |
| **Agenda de visitas/inspecciones** (HU-11) | operativo | `minutas` = juntas (art. 125 fr. III d); la *agenda de visitas* no tiene artículo específico. |
| **Cédula profesional al alta** | ya marcado | El código ya dice `[validar — no exigida por LOPSRM/RLOPSRM federal al alta]`. Consistente. |
| **art. 31-V LOPSRM** (conteo de días del término) | no verificado a fondo | Convención de derivación del término. **RLOPSRM art. 100** sí confirma "los periodos se expresarán en **días naturales**". Baja prioridad. |
| **art. 61 RLOPSRM** (docs del representante legal) | no verificado a fondo | Plausible (proposición/acreditación del licitante). Baja prioridad. |

---

## 2. La REGLA DEL 100% — análisis y recomendación (NO se cambió)

**Cita en código:** *"Σ planeado = contratado por concepto: RLOPSRM art. 45 ap. A fr. X + LOPSRM art. 52"* (`lib/programa.js`, `AltaContrato.jsx`).

**Lo que el texto SÍ dice (verificado literal):**
- **RLOPSRM 45-A-X EXISTE** y obliga un *"Programa de ejecución convenido conforme al catálogo de conceptos… **del total de los conceptos de trabajo**"*.
- **LOPSRM 52 párr. 2 EXISTE** y dice que el *"programa de ejecución convenido… **será la base conforme al cual se medirá el avance**"*.
- **RLOPSRM 118** prohíbe **exceder** lo contratado sin orden escrita.
- **RLOPSRM 127**: *"Las cantidades de trabajos presentadas en las estimaciones deberán **corresponder a la secuencia y tiempo previsto en el programa de ejecución convenido**"*.

**Lo que el texto NO dice:** en ningún artículo aparece la obligación numérica de que `Σ planeado` sea **exactamente** igual a lo contratado (`=`). Lo **duro y literal** es solo **no exceder** (`≤`, art. 118). El `=` (bloquear también el *faltante*) es una **interpretación razonable** de *"del total de los conceptos de trabajo"* (45-A-X) + *"base del avance"* (52), reforzada por el **dibujo del profe** (distribuye todo), pero **no es mandato verbatim**.

**Recomendación:** **mantener el 100% exacto** es defensible y alinea con 45-A-X + el dibujo del profe → **dejarlo como está** y **confirmarlo con el profe**. Si el profe acepta **parcial**, lo único que la ley compele es `≤` (art. 118) → aplicar el **patch separado** `AUDITORIA_LEGAL_100pct_a_parcial_DIFFS.patch` (revierte a `≤`: bloquea solo el exceso, permite el faltante).

> El patch separado toca `lib/programa.js` (HAVING solo-exceso), `programa.controller.js`, `AltaContrato.jsx` (validación + textos) y `e2e/a2-programa-obra.spec.js` (que hoy testea explícitamente que "parcial NO se permite"; el patch lo reescribe a "parcial permitido / exceso bloquea"). **Está PREPARADO y VALIDADO en local** (aplicado transitoriamente → suite **148 passed · 8 skipped · 0 failed** con el spec actualizado → **revertido**); queda **SIN aplicar** en el working tree — se aplica solo si tú lo apruebas.

---

## 3. Correcciones aplicadas (patch `AUDITORIA_LEGAL_correcciones_DIFFS.patch`)

Comportamiento-neutral (solo comentarios y texto de UI/citas). 8 archivos, 17/17:
- **Código:** `backend/src/lib/programa.js` (99→59 ×3), `backend/src/controllers/programa.controller.js` (99→59 ×2), `backend/src/db/schema.sql` (122→123 fr. III), `backend/src/controllers/bitacora.controller.js` (122→123 fr. III), `frontend/src/pages/AperturaBitacora.jsx` (122→123 fr. III ×2 + art. 46 reformulado), `frontend/src/data/dummy.js` (122→123 fr. III ×2).
- **Docs vivos:** `docs/contexto-claude/Borrador_DDL_Tablas_Nuevas_SIGECOP.md` (99→59 ×2), `docs/contexto-claude/SIGECOP_contexto_respaldo.md` (99→59 ×2).

**NO editado (lo decides tú):** los `_DIFFS.patch` y `_Maiki.md` de `historial-cambios/` son **registros congelados** de pasadas anteriores (documentan el estado al momento); también `A2_ENTREGABLE_Maiki.md` repite `art. 99` en 5 puntos. No reescribo historia. Ocurrencias en registros históricos a tu criterio: `A2_ENTREGABLE_Maiki.md:44,60,73,88,184` (art. 99→59) y los `.patch` de A2/ALTA_v2. Si quieres, los barro en una pasada de "errata".

## 4. Runbook

**Correcciones (comportamiento-neutral):**
```bash
git apply docs/historial-cambios/AUDITORIA_LEGAL_correcciones_DIFFS.patch   # ya aplicado en el working tree
docker restart sigecop_backend && curl -s localhost:4000/api/health         # {"status":"ok"}
cd frontend && npm run test:e2e                                              # suite verde
```
Render: no requiere migración (no toca esquema funcional; el único cambio en `schema.sql` es un **comentario**). Entra con el push normal de `main`.

**Patch del 100%→parcial (condicional, solo si el profe acepta parcial):**
```bash
git apply docs/historial-cambios/AUDITORIA_LEGAL_100pct_a_parcial_DIFFS.patch
docker restart sigecop_backend
cd frontend && npm run test:e2e   # incluye el a2-programa-obra.spec.js ya actualizado a "parcial permitido"
```

## 5. Archivos tocados (esta pasada)

| Archivo | Cambio |
|---|---|
| `backend/src/lib/programa.js` | **M** — 99→59 (×3) |
| `backend/src/controllers/programa.controller.js` | **M** — 99→59 (×2) |
| `backend/src/db/schema.sql` | **M** — 122→123 fr. III (comentario) |
| `backend/src/controllers/bitacora.controller.js` | **M** — 122→123 fr. III (comentario) |
| `frontend/src/pages/AperturaBitacora.jsx` | **M** — 122→123 fr. III + art. 46 reformulado |
| `frontend/src/data/dummy.js` | **M** — 122→123 fr. III (×2, comentarios) |
| `docs/contexto-claude/Borrador_DDL_Tablas_Nuevas_SIGECOP.md` | **M** — 99→59 |
| `docs/contexto-claude/SIGECOP_contexto_respaldo.md` | **M** — 99→59 |
| `docs/historial-cambios/AUDITORIA_LEGAL_Maiki.md` | **nuevo** — este doc |
| `docs/historial-cambios/AUDITORIA_LEGAL_correcciones_DIFFS.patch` | **nuevo** — patch correcciones |
| `docs/historial-cambios/AUDITORIA_LEGAL_100pct_a_parcial_DIFFS.patch` | **nuevo** — patch condicional (NO aplicado) |

**Suite Playwright (sobre el estado solo-correcciones):** **148 passed · 8 skipped · 0 failed** (3.9 min) → verde, sin regresión, los **8 fixme intactos** (las correcciones son comentario/texto, comportamiento-neutral).
