# Auditoría legal del proyecto SIGECOP

**Fecha:** 24 de mayo de 2026
**Alcance de esta corrida:** verificación de las citas legales de los documentos del proyecto contra el texto literal de la ley y el reglamento vigentes.
**Comando:** `/auditar`

---

## Metodología y fuentes

Toda afirmación de esta auditoría se verifica contra **fuentes tangibles**, sin inventar ni deducir:

- **LOPSRM.pdf** — Ley de Obras Públicas y Servicios Relacionados con las Mismas. Última reforma **DOF 14-11-2025** (texto vigente).
- **Reg_LOPSRM.pdf** — Reglamento de la LOPSRM. Última reforma **DOF 24-02-2023** (texto vigente).
- **LFD.pdf** — Ley Federal de Derechos. Última reforma **DOF 07-11-2025** (texto vigente).
- Archivos del proyecto: Historias_Usuario.xlsx, matriz_DEFINITIVA.xlsx, vistas del sistema.

**Nivel de certeza** de cada hallazgo:
- **ALTA** — coincide con el texto literal del artículo (citado abajo).
- **BAJA** — interpretación que requiere validación de un especialista en obra pública. *Claude no es abogado.*

**Árbol de prioridad ante dudas:** nivel 1 = ley/reglamento + profesor; nivel 2 = se propone y el usuario elige.

---

## 1. Verificación legal de las citas (lo que el profesor puede preguntar)

Esta tabla cruza cada cita legal de los documentos con el texto real de la ley. **Todas las de abajo coinciden con el texto literal (certeza ALTA).**

### HU-01 — Alta de contrato → Art. 46 LOPSRM
El art. 46 lista el contenido obligatorio del contrato. Coincide con lo que HU-01 captura en un solo flujo:
- Fracc. I: partes (dependencia y contratista)
- Fracc. V: descripción de trabajos + planos, programas y presupuestos
- Fracc. VI: precio, plazos, forma de pago
- Fracc. VII: plazo de ejecución
- Fracc. VIII: anticipos y su amortización
- Fracc. IX: garantías
- Fracc. X: penas convencionales, retenciones y descuentos

**Cita textual (Art. 46, último párrafo):** "el contrato, sus anexos y la bitácora de los trabajos son los instrumentos que vinculan a las partes en sus derechos y obligaciones."
**Veredicto:** ✅ Coincide. Certeza ALTA.
**Nota:** la reforma DOF 16-04-2025 agregó que "La formalización de los contratos será realizada en la Plataforma" y obliga a medios electrónicos para la bitácora. Útil tenerlo presente si el profesor pregunta por digitalización.

### Penas convencionales → Art. 46 Bis LOPSRM
**Cita textual:** "En ningún caso las penas convencionales podrán ser superiores, en su conjunto, al monto de la garantía de cumplimiento."
Además, el artículo prevé **retenciones económicas** a las estimaciones en proceso por atraso, recuperables en estimaciones siguientes.
**Veredicto:** ✅ Coincide con el tratamiento de penalizaciones/deductivas del proyecto. Certeza ALTA.

### HU-02 — Registro de fianzas → Art. 48 LOPSRM
**Cita textual:** el art. 48 obliga a garantizar "I. Los anticipos que reciban" y "II. El cumplimiento de los contratos", con plazo de 15 días naturales para presentarlas.
**Veredicto:** ✅ Las pólizas de **anticipo** y **cumplimiento** de HU-02 coinciden. Certeza ALTA.
**Pendiente:** la póliza de **vicios ocultos** (tercera de HU-02) NO se fundamenta en el art. 48 sino en el art. 66 LOPSRM (garantía por defectos y vicios ocultos tras recepción). *No se verificó el art. 66 en esta corrida — pendiente de extraer su texto.*

### HU-12 — Integración de estimación → Art. 132 RLOPSRM
El art. 132 lista los documentos que acompañan a cada estimación. Coincide casi exacto con los tabs de HU-12:
- Fracc. I: **Números generadores** → tab 2 ✅
- Fracc. II: **Notas de Bitácora** → tab 5 (notas vinculadas) ✅
- Fracc. IV: controles de calidad, pruebas de laboratorio y **fotografías** → tab 3 (registro fotográfico) ✅
- Fracc. V: **análisis, cálculo e integración de importes** → tab 1 (carátula de cálculo) ✅
**Veredicto:** ✅ Coincide con fuerza. Certeza ALTA. Esta es de las correspondencias más sólidas del proyecto.

### Amortización del anticipo → Art. 50 LOPSRM
**Cita textual (Art. 50, fracc. II):** las dependencias "podrán otorgar **hasta un treinta por ciento** de la asignación presupuestaria correspondiente al contrato".
**Veredicto:** ✅ El 30% usado en la vista HU-12 coincide con el **máximo legal**. Certeza ALTA.
**Matiz a tener presente:** el 30% es el **tope**, no un valor fijo; el porcentaje real lo pacta cada contrato. Si el profesor pregunta, la respuesta correcta es "usamos el máximo del art. 50 como ejemplo".

### Plazos de estimación → Art. 54 LOPSRM (la cita más importante)
El art. 54 fija tres plazos que el proyecto usa literalmente:
- **6 días naturales** para que el contratista presente la estimación a la residencia → usado en HU-13.
- **15 días naturales** para que la residencia revise y autorice → usado en HU-15 (semáforo de revisión).
- **20 días naturales** para el pago, contados desde la autorización → usado en HU-20 (semáforo de pago).
**Veredicto:** ✅ Los tres plazos coinciden EXACTOS con el texto. Certeza ALTA. Esta es la columna vertebral legal del flujo de estimación-pago.

### HU-08 — Apertura de bitácora → Art. 122 RLOPSRM + Art. 46 LOPSRM
**Cita textual (Art. 122):** "El uso de la Bitácora es obligatorio en cada uno de los contratos de obras y servicios. Su elaboración, control y seguimiento se hará por medios remotos de comunicación electrónica."
**Veredicto:** ✅ Coincide. Certeza ALTA.

### HU-09 — Emisión de notas según rol → Art. 125 RLOPSRM (respaldo muy fuerte)
El art. 125 asigna a cada rol los tipos de nota que puede registrar:
- **Residente** (fracc. I): autoriza estimaciones, autoriza modificaciones, aprueba convenios, etc.
- **Superintendente/contratista** (fracc. II): solicita aprobación de estimaciones, solicita modificaciones, reporta atraso de pago, etc.
- **Supervisión** (fracc. III): registra avance físico y financiero, pruebas de calidad, seguridad, etc.
**Veredicto:** ✅ La decisión "tipo de nota disponible según rol autorizado" (HU-09) está respaldada literalmente. Certeza ALTA. Este artículo también respalda la matriz de permisos.

### HU-20 — Suficiencia presupuestal → Art. 24 LOPSRM
**Cita textual:** las dependencias "podrán convocar, adjudicar o contratar obras... siempre y cuando cuenten previamente con la **suficiencia presupuestaria** en la partida o partidas específicas".
**Veredicto:** ✅ La verificación presupuestal de HU-20 (bloquear si excede el techo) coincide con el principio del art. 24. Certeza ALTA.


### HU-03 — Convenios modificatorios → Art. 59 LOPSRM
**Cita textual:** "Las dependencias y entidades, podrán... modificar los contratos sobre la base de precios unitario... mediante convenios, siempre y cuando no impliquen variaciones sustanciales al objeto del proyecto original." Plazo de suscripción: 45 días naturales.
**Veredicto:** ✅ Coincide. El rol "dependencia" de HU-03 está respaldado ("Las dependencias y entidades... podrán modificar"). Certeza ALTA.

### HU-02 (tercera póliza) — Vicios ocultos → Art. 66 LOPSRM
**Cita textual:** "Concluidos los trabajos, el contratista quedará obligado a responder de los defectos... vicios ocultos... Los trabajos se garantizarán durante un plazo de **doce meses**... deberán constituir fianza por el equivalente al **diez por ciento** del monto total ejercido... o carta de crédito irrevocable por el **cinco por ciento**... o fideicomiso por el cinco por ciento."
**Veredicto:** ✅ Respalda la póliza de vicios ocultos de HU-02. Certeza ALTA.

---

## 2. Hallazgos que requieren tu decisión (árbol de prioridad)

### H-1 — HU-15: "supervisión y residencia" en la revisión de estimaciones — RESUELTO ✅
**Tipo:** estaba marcado como posible adición sin fundamento; tras revisar el reglamento, queda RESPALDADO.
**Qué dicen las fuentes (las tres se complementan):**
- **Art. 114 RLOPSRM:** "el residente podrá auxiliarse por la supervisión... Cuando no se cuente con el auxilio de la supervisión, las funciones a que se refiere el artículo 115 estarán a cargo de la residencia." → La supervisión es auxiliar técnico del residente.
- **Art. 115-X RLOPSRM (cita textual):** la supervisión debe "**Revisar las estimaciones**... comprobar que dichas estimaciones incluyan la **amortización de anticipos, las retenciones económicas, las penas** [convencionales]." → La supervisión SÍ revisa estimaciones, por mandato del reglamento.
- **Art. 113-IX RLOPSRM (cita textual):** es función de la residencia "**Autorizar las estimaciones**, verificando que cuenten con los números generadores que las respalden." → La residencia autoriza.
- **Art. 54 LOPSRM:** confirma que la residencia revisa y autoriza dentro de los 15 días.
**Veredicto:** el flujo de HU-15 (supervisión revisa → turna → residencia autoriza) coincide con el modelo del reglamento: supervisión como filtro técnico que revisa la estimación (art. 115-X), residencia como autoridad que la autoriza (art. 113-IX + art. 54). **Certeza ALTA.** HU-15 está blindada.
**Nota:** el art. 113 RLOPSRM describe funciones de la RESIDENCIA (no de la supervisión); las de la supervisión están en el art. 115. Conviene citar ambos correctamente ante el profesor.

### H-2 — HU-04: acceso del contratista al expediente
**Tipo:** decisión sin impedimento legal (nivel 2 del árbol).
**Qué dicen las fuentes:** ni la LOPSRM ni el reglamento prohíben que el contratista consulte el expediente del contrato que ejecuta. El art. 46 (contenido del contrato) y el art. 125-II (el superintendente registra solicitudes en bitácora) suponen que el contratista conoce y opera sobre el contrato.
**Tu decisión previa:** indicaste que el contratista SÍ debería tener acceso.
**Veredicto:** como no hay impedimento legal, tu criterio aplica.
**Acción recomendada:** agregar al contratista nivel **Consulta** en HU-04, y **corregir también `matriz_DEFINITIVA.xlsx`** (agregar la X de Contratista en SRV-01-04) para que documento y sistema coincidan. Sin ese ajuste en la fuente, quedaría una contradicción interna que el profesor podría señalar.

### H-3 — Anticipo 30% en HU-12 como valor fijo
**Tipo:** precisión, no error.
**Qué dice la fuente:** art. 50-II = "hasta un 30%". Es el máximo, no un valor obligatorio.
**Recomendación:** mantener el 30% como ejemplo (es el tope legal), pero si se quiere blindar, añadir una nota en la vista: "porcentaje máximo conforme al art. 50 LOPSRM; el real se pacta en el contrato". Certeza ALTA sobre el dato legal.

### H-4 — Retención del 5 al millar (Art. 191 LFD) — RESUELTO ✅
**Cita textual (Art. 191 LFD):** "los contratistas con quienes se celebren contratos de obra pública... pagarán un derecho equivalente al **cinco al millar sobre el importe de cada una de las estimaciones de trabajo**." Además: "Las oficinas pagadoras... al hacer el pago de las estimaciones de obra, **retendrán el importe del derecho**."
**Veredicto:** ✅ Respalda exacto la retención del 5 al millar de HU-12. El cálculo de la vista ($1,850,000 × 0.005 = $9,250) es correcto. Certeza ALTA. (Verificado contra LFD.pdf, DOF 07-11-2025.)

---

## 3. Resumen

| Verificación | Resultado | Certeza |
|--------------|-----------|---------|
| HU-01 ↔ Art. 46 (contenido contrato) | ✅ Coincide | ALTA |
| Penas ↔ Art. 46 Bis | ✅ Coincide | ALTA |
| HU-02 ↔ Art. 48 (anticipo+cumplimiento) | ✅ Coincide | ALTA |
| HU-02 vicios ocultos ↔ Art. 66 (12 meses, fianza 10% o 5%) | ✅ Coincide | ALTA |
| HU-12 ↔ Art. 132 (docs de estimación) | ✅ Coincide fuerte | ALTA |
| Amortización ↔ Art. 50 (30% máximo) | ✅ Coincide (es tope) | ALTA |
| Plazos 6/15/20 días ↔ Art. 54 | ✅ Coinciden exactos | ALTA |
| HU-08 ↔ Art. 122 (bitácora) | ✅ Coincide | ALTA |
| HU-09 roles ↔ Art. 125 (notas por rol) | ✅ Coincide fuerte | ALTA |
| HU-20 ↔ Art. 24 (suficiencia presupuestal) | ✅ Coincide | ALTA |
| HU-15 supervisión revisa (115-X) + residencia autoriza (113-IX, 54) | ✅ Coincide | ALTA |
| HU-04 acceso contratista | ⚠️ A decidir (H-2) | — |
| 5 al millar ↔ Art. 191 LFD | ✅ Coincide exacto | ALTA |
| HU-03 modificatorios ↔ Art. 59 (sin variación sustancial, 45 días) | ✅ Coincide | ALTA |

**Conclusión:** las citas legales centrales del proyecto **coinciden con el texto vigente de la LOPSRM y su reglamento**. Quedan 2 puntos a decidir (H-1 supervisión en HU-15, H-2 acceso del contratista) y 2 pendientes de fuente (art. 66 para vicios ocultos, art. 191 LFD para el 5 al millar).

---

## Pendientes para completar la auditoría

1. ✅ ~~Art. 66 LOPSRM (vicios ocultos) y Art. 59 LOPSRM (modificatorios)~~ — VERIFICADOS, certeza ALTA.
2. ✅ ~~Art. 191 LFD (5 al millar)~~ — VERIFICADO contra LFD.pdf (DOF 07-11-2025), certeza ALTA.
3. ✅ ~~Art. 113 / 114 / 115 RLOPSRM~~ — VERIFICADOS. H-1 resuelto: supervisión revisa (115-X), residencia autoriza (113-IX). **Fase 1 COMPLETA.**
4. ⬜ Fase 2 (cobertura legal): leer LOPSRM + reglamento + LFD completos buscando artículos que respalden servicios no citados.
5. ⬜ Fase 3 (coherencia interna y vocabulario) documento por documento con `/auditar [documento]`.
