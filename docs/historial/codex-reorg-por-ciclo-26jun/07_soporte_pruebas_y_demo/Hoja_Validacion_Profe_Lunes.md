# SIGECOP — Hoja de validación con el profe · revisión del lunes

> Todas las decisiones pendientes que necesitan tu confirmación, en una página para palomear.
> Cada una trae: **la pregunta**, **lo que el sistema hace hoy**, y **nuestra recomendación**.
> Marca: ✔ = como está / ✖ = cambiar / ✎ = ajuste.

---

## A. Flujo y reglas de estimación

**A1. Reingreso de estimación rechazada (HU-16).**
Hoy el reingreso **copia la carátula tal cual** (misma cifra), sirve si el rechazo fue por forma/documentación.
¿Debe permitir **corregir cantidades/montos** cuando el rechazo fue por números, o el copy basta para esta etapa?
*Recomendación: el copy basta para Etapa 1; corregir montos = re-integrar vía HU-12.* → [ ]

**A2. Candado de pago.**
Hoy el pago es **permisivo** (acepta integrada/presentada/autorizada). ¿Debe **endurecerse a solo "Autorizada"**
(finanzas no paga algo no autorizado, art. 54)? *Recomendación: sí endurecer, en una pasada propia.* → [ ]

**A3. Plazos del art. 54 (6 / 15 / 20 días).**
Hoy son **referencia visual (semáforo), no bloquean**. ¿Deben pasar a **candado duro** (p. ej. no presentar fuera de
los 6 días)? *Recomendación: dejarlos informativos; bloquear sería rígido.* → [ ]

**A4. Nota automática de estimación (P4).**
El Reglamento la pide (art. 125 fr. II-a "solicitud de aprobación" → superintendente; fr. I-b "autorización" → residente).
Hoy **no se genera**. ¿La cableamos (nota al presentar y al autorizar)? *Recomendación: sí, ya hay fundamento.* → [ ]

---

## B. Amortización y temas legales/contables

**B1. Amortización en la carátula (Fase B).**
Confirmado en sesión previa: la carátula se queda **proporcional** (% anticipo × importe), no editable.
El plan libre del alta gobierna solo la *entrega*. ¿Se confirma definitivo? *Recomendación: sí (art. 138).* → [ ]

**B2. Cita del art. 138 vs 143.**
Ya corregimos la amortización a **art. 138 RLOPSRM** (no 143). Confirmar el número correcto en tu fuente. → [ ]

**B3. Solape 138 / 139.**
La amortización (138) y las **penas por atraso** (138/139) comparten el "138". ¿Son fracciones distintas del mismo
artículo o hay que separarlas? → [ ]

**B4. 2 al millar (CMIC) y 5 al millar (art. 191 LFD).**
El 5 al millar fiscal ya está separado de la pena por atraso. El **2 al millar CMIC** es contractual (sin base en
LFD/RLOPSRM). ¿Se incluye en la carátula o se omite? *Recomendación: confirmar si aplica al contrato.* → [ ]

**B5. IVA.**
La carátula calcula **sin IVA** (catálogo = monto sin IVA, art. 2-XIX). ¿Se confirma que el IVA va aparte? → [ ]

---

## C. Notas de bitácora

**C1. Emisor de notas de consecuencia.**
Ya quedó: **atraso y convenio** los emite el **residente** (art. 53); sustitución y avance, quien los hizo.
¿Se confirma? → [ ]

**C2. Tipo de nota de atraso.**
Ya creamos el **tipo propio 'atraso'** en el catálogo (en vez de 'otro'+tag), como pediste. Confirmar. → [ ]

**C3. Emisor de la nota DIFERIDA de hecho.**
Cuando una nota de avance/sustitución se difiere y se asienta al **abrir la bitácora**, hoy el emisor es **quien abre
la bitácora** (el residente), no el actor original. ¿Está bien, o debe quedar el actor original? → [ ]

---

## D. Reglas del alta (HU-01)

**D1. Fecha de inicio pasada (P8).**
Hoy **no se valida** (se puede capturar un contrato ya iniciado con su fecha real). ¿Debe **validarse** (no permitir
fecha pasada) o dejarse abierto? *Nota: hay casos reales de contratos ya iniciados.* → [ ]

**D2. Cédula profesional (P11).**
Hoy el alta **sí la exige**. ¿Confirmas que debe pedirse? (No tiene base federal explícita; quedó por criterio.) → [ ]

**D3. Datos jurídicos.**
Hoy son texto libre (JSONB), el backend no los valida estructuradamente. ¿Suficiente para la etapa? → [ ]

---

## E. Brechas: construir vs ajustar la ficha

**E1. HU-02 — fianza como PDF.**
Hoy la póliza guarda **solo el nombre** del archivo, no sube el PDF. ¿Se construye la subida real, o basta el dato? → [ ]

**E2. HU-11 — vincular minuta/visita a una nota.**
**No está construido** (la columna existe pero huérfana). ¿Se construye (E2) o se quita el criterio de la ficha? → [ ]

**E3. HU-13 — bloqueo de los 6 días.**
El aviso de presentar dentro de 6 días **no bloquea** (es semáforo). ¿Debe bloquear? *(ligado a A3).* → [ ]

**E4. Periodos tras convenio de plazo (P12).**
Al ampliar el plazo con un convenio, los **periodos del programa no se regeneran** automáticamente. ¿Se construye la
regeneración o se documenta como limitación? → [ ]

---

## F. Observaciones de HU-15

**F1. Granularidad de observaciones.**
Hoy las observaciones de la revisión se guardan **por sección**. La ficha pedía "por concepto" (sería cambio de
esquema). ¿Basta por sección? → [ ]

**F2. Fecha de recepción (art. 54).**
El semáforo de 15 días corre desde `enviada_en` (= la **presentación** del contratista). ¿Cuenta como fecha de
**recepción**, o se requiere un sello de recepción separado? → [ ]

---

## G. Lo más importante (no es validación, es entrega)

**G1. Generadores y soportes (art. 132).** E3 lo tiene pendiente. Es lo que más esperas ver. → estado: en construcción.
**G2. HU-18, HU-20, HU-11** (maquetas) — en cola de E3/E2.

---

### Resumen de lo ya resuelto contigo (solo confirmar, no discutir)
Flujo invertido (art. 54) ✔ · amortización proporcional ✔ · emisor de notas por tipo ✔ · tipo 'atraso' ✔ ·
avance que excede el periodo avisa (no bloquea) ✔ · cita 138 ✔.
