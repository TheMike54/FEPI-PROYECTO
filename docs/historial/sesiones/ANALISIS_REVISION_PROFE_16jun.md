# Análisis — Revisión del profe 16-jun-2026 (extracción estructurada para el plan)

> Extracción de los puntos técnicos del audio del 16-jun (transcripción en docs/audios/).
> Sirve de insumo para que Claude Code arme el plan ejecutable. Clasificado por responsable y prioridad.
> Contexto de fechas: hoy 16-jun · PRE-ENTREGA 24-jun (1-4pm) · revisión final ~lunes siguiente ·
> calificaciones máx. 26-jun · BD free de Render expira ~25-jun (coincide con la entrega — CRÍTICO).

---

## 1. Estimaciones — aislar el ambiente, flujo por bloques (EL GRANDE) — Maiki + depende de E3
**Problema (profe):** una sola interfaz mezcla resumen/historial + integración + presentación → "todo atascado",
"confunde", "no aíslas el ambiente de estimación".
**Lo que quiere:** un ambiente AISLADO por estimación, como un wizard por BLOQUES (igual que el alta de contrato):
1. Nueva estimación → eliges número/periodo (ya sabe las fechas del periodo, no las re-pide).
2. **Empiezas por los GENERADORES** por concepto → al terminar se arma el resumen (todos los conceptos juntos).
3. La **carátula se genera sola** (lo que vas a cobrar, 5 al millar, amortización, retenciones).
4. Complementas datos; ves cuánto se ha estimado / cuánto falta / cuánto es este periodo.
5. Adjuntas soportes, notas de bitácora, archivo fotográfico.
6. **Cierras con candado de confirmación** ("¿seguro que vas a cerrarla?") → envías a REVISIÓN.
**El historial/resumen de estimaciones va APARTE** (es otra historia; no se mezcla con la integración).
**Citas:** "empiezas por los generadores… te dan el resumen… complementas… la carátula te dice lo que vas a cobrar…
adjunta los soportes, las notas"; "como el de alta de contrato, para que vaya por bloque".
**Dependencia:** los generadores son de E3 (art. 132). El wizard/estructura lo puede armar Maiki sobre lo existente,
pero el bloque 2 (generadores) necesita el trabajo de E3. NO tocar el cálculo de la carátula (congelado): el wizard
lo ENVUELVE, no lo reescribe.

## 2. Finiquito — historia NUEVA obligatoria (HU-24) — Maiki (verificar ley)
**Profe:** "debe haber un cierre a fuerzas, hay que agregar finiquito… sin finiquito no se puede cerrar el contrato".
"El finiquito es una nota de bitácora y el cálculo de todo lo que te debo / lo que me debes."
**Alcance:** al cerrar el contrato, calcular saldos (total estimado vs total pagado, amortización pendiente,
retenciones, penas), determinar saldo a favor/en contra, y asentar una **nota de bitácora de finiquito**. Es lo que
permite cerrar/extinguir el contrato.
**Verificar la ley (PASO 0):** finiquito y cierre — candidatos LOPSRM art. 64 y RLOPSRM arts. 168-172 (recepción,
finiquito, acta de extinción). Code debe leer el PDF y citar lo exacto antes de implementar.
**Nota:** "no debe ser tan complicado si tienes todos los demás datos" — reusa estimaciones/pagos existentes.

## 3. Expediente (HU-04) — 3 ajustes — Maiki, se puede YA
a) **Oficio de aprobación del convenio modificatorio:** falta una sección de "documento de aprobación" — poder
   SUBIR el oficio que aprueba el convenio; en el expediente se muestra como soporte. (Hoy solo está la gestión + la
   nota de bitácora.) "el soporte es que te lo aprobaron… falta la sección de documento de aprobación, es un oficio."
b) **Quitar la ejecución del bloque de programa:** el expediente muestra lo CONTRATADO (programa), NO la ejecución/
   avance. "aquí tienes que quitar esto… no estás viendo la ejecución, eso lo ves en los indicadores, en la curva."
c) **Limpiar el buscador del expediente:** quitar campos sin sentido para un expediente de UN solo contrato (empresa
   y folio no aplican: "no voy a encontrar más que una sola empresa", "un solo folio"). Revisar qué campos sí sirven.

## 4. Presentar estimación — validar por ESTADO correctamente — Maiki, se puede YA
**Profe:** "ya la presentaste, no puedes volver a presentar; si está rechazada, sí; si nunca se presentó, sí".
Hoy la validación que impide re-presentar funciona "de churro" (validó por conceptos, no por estado). Corregir para
que el candado sea explícitamente por ESTADO de presentación. El trabajo sobrante NO se re-presenta: va en otra
estimación posterior o se ajusta en el finiquito.

## 5. Apertura de bitácora — redacción con TODOS los datos del alta — E2 (Maiki asegura el dato)
**Profe:** la nota de apertura ya tiene redacción, pero "te falta todo el show… la obra ubicada, cuyo objeto es tal,
ubicada en tal… todo lo del alta de contrato debe estar ahí en el documento de la nota."
La redacción de la apertura debe incluir objeto, ubicación, monto, plazo, partes, etc. — todos los datos del alta.

## 6. Confirmado que YA cumple (no rehacer)
- Plan de amortización: ya NO deja 0/0/todo-al-último (el profe lo verificó). Sigue abierto solo el [validar] del
  mínimo legal exacto.
- Empresas: catálogo seleccionable (lo vio).
- Apertura ya tiene redacción (falta completarla — punto 5).

---

## Clasificación rápida
| Punto | Responsable | ¿Se puede ya? | Tamaño |
|---|---|---|---|
| 3. Expediente (oficio + quitar ejecución + buscador) | Maiki (HU-04) | SÍ | Chico-medio |
| 4. Presentar por estado | Maiki | SÍ | Chico |
| 2. Finiquito (HU-24) | Maiki | SÍ (verificar ley) | Medio-grande |
| 1. Estimación: wizard por bloques | Maiki + E3 (generadores) | Parcial (estructura sí; generadores dependen de E3) | GRANDE |
| 5. Apertura redacción completa | E2 | Por PR de E2 | Medio |

## Pendiente NO técnico — CRÍTICO
- 🔴 **Decisión BD Render (A pagar / B migrar).** El free expira ~25-jun, JUSTO en la ventana de entrega (pre-entrega
  24, calificaciones 26). Si se cae a media entrega, es catastrófico. DECIDIR YA.
