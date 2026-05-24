# Cobertura legal del proyecto SIGECOP — LOPSRM

**Fecha:** 24 de mayo de 2026
**Fase:** 2 (cobertura) — Sub-bloque 1 de 3: **LOPSRM**
**Fuente:** LOPSRM.pdf, última reforma DOF 14-11-2025 (texto vigente), 104 artículos.
**Comando:** `/auditar`

---

## Qué es este reporte (y en qué se diferencia del de verificación)

La auditoría de **verificación** (Fase 1) revisó que las citas de tus documentos coincidan con la ley. Esta auditoría de **cobertura** hace lo inverso: recorre **los 104 artículos de la LOPSRM** preguntando *¿este artículo debería respaldar algún servicio de SIGECOP y no está citado?* — para encontrar huecos antes que el profesor.

**Clasificación de cada artículo:**
- ✅ **Cubierto** — ya citado/reflejado en los documentos del proyecto.
- ⚠️ **Hueco** — artículo relevante a la ejecución del contrato que SIGECOP podría/debería reflejar y no cita.
- ⬜ **Fuera de alcance** — existe en la ley pero corresponde a fases que SIGECOP legítimamente no cubre (licitación/adjudicación previa, finiquito/Etapa 2, procedimientos contenciosos).

**Recordatorio:** Claude no es abogado. La relevancia se marca con certeza ALTA (el artículo trata literalmente del tema) o BAJA (interpretación).

---

## Resumen de cobertura

| Categoría | Artículos | Comentario |
|-----------|-----------|------------|
| ✅ Cubiertos | 9 | Las citas centrales (46, 46Bis, 48, 50, 54, 59, 66, 24 + bitácora) |
| ⚠️ Huecos a revisar | 6 | Detallados abajo — ninguno crítico, son de fundamentación o alcance |
| ⬜ Fuera de alcance | 89 | Licitación/adjudicación (1-45), finiquito (64-65,68-69), Plataforma y contencioso (74-104) |

**Conclusión:** SIGECOP cubre correctamente el núcleo de la ejecución contractual. Los 6 huecos son oportunidades de reforzar fundamentación, no errores. El más relevante es el **art. 53** (base legal del rol residente).

---

## ⚠️ Huecos detectados (lo accionable)

### Hueco 1 — Art. 53: residencia de obra (el más importante)
**Cita textual:** "Las dependencias y entidades establecerán la residencia de obra... será la responsable de la supervisión, vigilancia, control y revisión de los trabajos, **incluyendo la aprobación de las estimaciones**."
**Por qué importa:** es la **base legal del rol Residente**, el actor central de SIGECOP, y fundamenta que el residente apruebe estimaciones (HU-15). Hoy ningún documento lo cita.
**Recomendación:** agregar el art. 53 como fundamento del stakeholder Residente en `matriz_DEFINITIVA.xlsx` (hoja Stakeholders) y como respaldo de HU-15. Certeza ALTA.

### Hueco 2 — Art. 52: inicio de ejecución y base de medición del avance
**Cita textual:** "La entrega [del inmueble] deberá constar en la Bitácora... El programa de ejecución convenido en el contrato... será la base conforme al cual se medirá el avance."
**Por qué importa:** fundamenta la apertura de bitácora (HU-08) y la medición de avance contra programa (HU-05, HU-12 generadores).
**Recomendación:** citar art. 52 como respaldo adicional de HU-05/HU-08. Certeza ALTA. Prioridad media.

### Hueco 3 — Art. 52 Bis: obligatoriedad de la Bitácora en la LEY
**Situación:** HU-08 cita el art. 46 LOPSRM y el art. 122 del reglamento, pero la **ley** también establece la bitácora en el art. 52 Bis. Citar solo el reglamento para una obligación que también está en la ley es una fundamentación incompleta que el profesor podría señalar.
**Recomendación:** agregar art. 52 Bis LOPSRM junto al 122 RLOPSRM en HU-08. Certeza ALTA. Prioridad media.

### Hueco 4 — Art. 55: gastos financieros por mora en el pago
**Cita textual:** "En caso de incumplimiento en los pagos de estimaciones... deberá pagar gastos financieros conforme a una tasa..."
**Por qué importa:** el semáforo de 20 días de HU-20 alerta del plazo, pero no menciona la consecuencia legal de incumplirlo (gastos financieros). Reflejarlo haría el semáforo más completo.
**Recomendación:** opcional — agregar nota en HU-20 de que el incumplimiento del plazo de 20 días (art. 54) genera gastos financieros (art. 55). Certeza ALTA. Prioridad baja.

### Hueco 5 — Art. 59 Bis: modificaciones que exceden el 50%
**Cita textual:** "Cuando la modificación en los convenios implique aumento o reducción por una diferencia superior al cincuenta por ciento..."
**Por qué importa:** complementa HU-03 (modificatorios, que cita el art. 59). El 59 Bis pone un límite cuantitativo relevante.
**Recomendación:** citar 59 Bis junto al 59 en HU-03. Certeza ALTA. Prioridad baja (HU-03 aún es backlog).

### Hueco 6 — Art. 60: suspensión temporal de los trabajos
**Cita textual:** "Las dependencias y entidades podrán suspender temporalmente... los trabajos contratados por cualquier causa justificada."
**Situación:** SIGECOP no tiene HU de suspensión. El reglamento (art. 125-I-h) la trata como evento de bitácora. Es una figura de la fase de ejecución, así que técnicamente está en el alcance temporal de SIGECOP, pero el equipo no la cubrió.
**Recomendación:** es una **decisión de alcance** (nivel 2 del árbol). Opciones: (a) declararla explícitamente fuera de alcance de Etapa 1 en la matriz (como ya se hizo con finiquito), o (b) agregar una HU futura de suspensión. Recomiendo (a) para mantener coherencia. Certeza ALTA sobre que el artículo existe; la decisión es tuya.

---

## Clasificación completa de los 104 artículos

### Título I — Disposiciones generales (arts. 1–23): mayormente FUERA DE ALCANCE
Arts. 1–20: objeto de la ley, definiciones, planeación, medio ambiente, contratación entre entes públicos. ⬜ Fuera de alcance (marco general y planeación previa).
- **Art. 21** (programas de obra): relevante a HU-05 (programa/curva). ⚠️ Relevancia indirecta — el programa que SIGECOP visualiza nace aquí. Certeza BAJA. Opcional citar.
- **Art. 22–23** (publicación en Plataforma, obras multianuales): ⬜ Fuera de alcance.

### Título II — Procedimientos de contratación (arts. 24–45): FUERA DE ALCANCE
Licitación, convocatorias, juntas de aclaraciones, presentación de proposiciones, fallo, adjudicación directa, invitación a tres. ⬜ Todo fuera de alcance: SIGECOP arranca con el contrato YA adjudicado.
- **Excepción Art. 24** (suficiencia presupuestal): ✅ Cubierto — citado en HU-20.

### Título III — De los contratos (arts. 46–73): CORAZÓN DE SIGECOP
| Art. | Tema | Estado |
|------|------|--------|
| 46 | Contenido del contrato | ✅ Cubierto (HU-01) |
| 46 Bis | Penas convencionales y retenciones | ✅ Cubierto (penalizaciones) |
| 47 | Firma del contrato | ⬜ Fuera de alcance (formalización previa) |
| 48 | Garantías (anticipo, cumplimiento) | ✅ Cubierto (HU-02) |
| 49 | A favor de quién se constituyen garantías | ⬜ Contexto, no requiere HU |
| 50 | Anticipos y amortización | ✅ Cubierto (HU-12) |
| 51 | Abstención de contratar (conflicto interés) | ⬜ Fuera de alcance |
| 52 | Inicio de ejecución, medición del avance | ⚠️ **Hueco 2** |
| 52 Bis | Bitácora obligatoria (en la ley) | ⚠️ **Hueco 3** |
| 52 Ter | Excepciones de bitácora convencional | ⬜ Contexto del 52 Bis |
| 53 | Residencia de obra | ⚠️ **Hueco 1 (importante)** |
| 54 | Estimaciones y plazos (6/15/20 días) | ✅ Cubierto (HU-12,13,15,20) |
| 55 | Gastos financieros por mora | ⚠️ **Hueco 4** |
| 56–58 | Ajuste de costos | ⬜ Decisión de alcance (SIGECOP no cubre ajuste de costos; conviene declararlo) |
| 59 | Convenios modificatorios | ✅ Cubierto (HU-03) |
| 59 Bis | Modificación >50% | ⚠️ **Hueco 5** |
| 59 Ter | Precio alzado no modificable | ⬜ Contexto (SIGECOP usa precios unitarios) |
| 60 | Suspensión de trabajos | ⚠️ **Hueco 6** |
| 61, 61 Bis | Rescisión administrativa | ⬜ Decisión de alcance (no cubierto; conviene declarar) |
| 62–63 | Procedimiento de suspensión/rescisión/terminación | ⬜ Fuera de alcance (asociado a 60-61) |
| 64–65 | Conclusión y recepción de trabajos | ⬜ Fuera de alcance (Etapa 2 / finiquito, ya declarado) |
| 66 | Vicios ocultos (garantía 12 meses) | ✅ Cubierto (HU-02 tercera póliza) |
| 67 | Responsabilidad del contratista | ⬜ Contexto, no requiere HU |
| 68–69 | Recepción y operación de obra concluida | ⬜ Fuera de alcance (Etapa 2) |
| 70–73 | Obras por administración directa | ⬜ Fuera de alcance (SIGECOP es por contrato, no admin. directa) |

### Título IV+ — Plataforma, sanciones, inconformidades, conciliación, arbitraje (arts. 74–104): FUERA DE ALCANCE
- Arts. 74–74 Septies (Plataforma CompraNet/equivalente): ⬜ Fuera de alcance — es infraestructura federal, no el sistema del proyecto.
- Arts. 75–82 (verificación y sanciones): ⬜ Fuera de alcance (facultad de la Secretaría de la Función Pública).
- Arts. 83–104 (inconformidades, conciliación, arbitraje, controversias): ⬜ Fuera de alcance (procedimientos contenciosos).

---

## Recomendaciones priorizadas

| Prioridad | Acción | Fundamento |
|-----------|--------|------------|
| **Alta** | Citar **art. 53** como base del rol Residente (Stakeholders + HU-15) | Es la base legal del actor central; su ausencia es lo más notable |
| Media | Agregar **art. 52 Bis** (bitácora en la ley) junto al 122 RLOPSRM en HU-08 | Fundamentación completa ley+reglamento |
| Media | Citar **art. 52** como respaldo de medición de avance (HU-05/HU-08) | Refuerza el vínculo programa↔avance |
| Baja | Declarar explícitamente **fuera de alcance**: ajuste de costos (56-58), suspensión (60), rescisión (61) | Coherencia con lo ya declarado para finiquito |
| Baja | Citar **59 Bis** en HU-03; nota de **art. 55** en HU-20 | Complementos cuando esas HU salgan de backlog |

---

## Pendientes de la Fase 2

- ⬜ **Sub-bloque 2: Reglamento (RLOPSRM)** — cobertura de sus artículos (≈ 200+). Próxima corrida.
- ⬜ **Sub-bloque 3: LFD** — solo el art. 191 (5 al millar) es relevante a obra pública; el resto de la LFD son derechos de otras materias. Se despacha rápido confirmando que no hay otros derechos aplicables a estimaciones de obra.
