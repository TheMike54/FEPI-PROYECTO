# Hoja para la reunión con el profe — sprint 3 (mañana 6:30–8)

**Objetivo:** cerrar 6 decisiones que dejamos marcadas `[validar]`, mencionar 1 pendiente de estimación, proponer 2 HU nuevas y acordar sincronizar las historias. Todo está construido o es presentación; ninguna decisión bloquea lo que ya funciona.

---

## A. Decisiones a confirmar (las dejamos así por defecto; necesito tu visto bueno)

| # | Tema | Cómo lo dejamos | Por qué / artículo | Pregunta concreta |
|---|------|-----------------|--------------------|-------------------|
| 1 | **IVA en estimaciones** | Carátula de avance **sin IVA**; el IVA entra solo en el pago real | El IVA no es LOPSRM/RLOPSRM, es ley del SAT. La estimación mide avance de obra (art. 2 fr. XIX LOPSRM), no factura | ¿Confirmas carátula sin IVA y el IVA aparte en el pago? |
| 2 | **Regla del 100%** | El catálogo y el programa deben sumar **exacto** (`=`) | Lo que la ley fija es el **tope** ≤ contratado (art. 118 RLOPSRM); el "exacto" es regla de negocio para forzar cuadre | ¿Exacto, o permitimos cargar parcial e ir completando? |
| 3 | **Nombre de usuario** | Exige **nombre + apellidos** (≥2 palabras) | Aparece en la bitácora; "Iván" solo no identifica | ¿"≥2 palabras" es suficiente o quieres un formato más estricto? |
| 4 | **Dependencia no firma la bitácora** | La dependencia es parte contratante pero **no firma**; el residente la representa, por eso queda fuera del roster | art. 123 RLOPSRM (el residente lleva la bitácora) | ¿Correcto que la dependencia no firme? |
| 5 | **Autoridad de sustitución** | Se registra quién sustituye y por qué (histórico append-only) | art. 125 fr. I inciso g) RLOPSRM | ¿Quién autoriza una sustitución y qué dato mínimo pides? |
| 6 | **Apertura de bitácora — fecha y datos** | Fecha = inicio; datos mínimos: domicilio+teléfono (dependencia y contratista), alcance, características del sitio | P1 encontró "previo a la fecha de inicio" (art. 52 Ter); tú dijiste "= inicio" | ¿Fecha = inicio? ¿El set de datos mínimos está completo? |

---

## B. Pendiente de fondo en estimación (lo único que falta de lo que pediste)

- **La nota de estimación debe incluir retención por atraso y avance físico/financiero.** Es lógica nueva en HU-12: calcular retención cuando la obra va atrasada vs. programa (art. 138/139 RLOPSRM) y mostrar avance físico vs. financiero. → **Pregunta:** ¿qué % de retención por atraso aplicamos y cómo lo disparas (por periodo, por concepto)?

---

## C. HU nuevas a proponer (sprint 3)

**HU — Contexto de contrato al iniciar sesión**
> *Como residente, al entrar al sistema quiero quedar "casado" con el contrato en el que trabajo, para no tener que elegirlo en cada pantalla (bitácora, estimación, alertas).*
> Simple: un selector de contrato al login (o por defecto si solo tengo uno) que fija el contexto de la sesión.

**HU — Super-entidad "Obra" + tablero de control**
> *Como dependencia/dirección quiero agrupar los contratos de una misma obra (p. ej. el aeropuerto con sus pistas y edificios) bajo una "Obra", y ver un tablero con el avance y el gasto consolidado.*
> Relacionada con HU-17 (tablero, Equipo 3). El profe la situó como "cuando lleguemos ahí" → definir alcance del sprint.

---

## D. Proceso

- **Actualizar `Historias_Usuario.xlsx`.** El código avanzó (P1–P4, roster, alta nueva, alertas, expediente) y las historias quedaron desfasadas. Como tú programas y revisas desde las HU, hay que sincronizarlas. → Acordar quién las actualiza y para cuándo.

---

## E. Para mostrar en vivo (ya desplegado)
- Alta con catálogo cuadrado + regla 100% + garantías + dependencia obligatoria + anticipo >30% pide PDF.
- Roster con histórico de sustituciones (lo pediste explícitamente) + bitácora inmutable ante sustitución.
- Ciclo estimación→pago blindado: monto = neto del servidor, ligado a estimación real, tope por periodo, acumulados/saldos.
- HU-04 consulta de expediente y HU-07 alertas de atraso (Equipo 2).
