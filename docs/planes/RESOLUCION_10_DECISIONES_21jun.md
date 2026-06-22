# Resolución de las 10 decisiones pendientes del profe — SIGECOP

> **Origen:** `docs/planes/PLAN_ENTREGA_24jun.md` §11 (lista corta de decisiones a confirmar el 24-jun).
> **Encargo (Maiki, 21-jun):** el profe **no** las revisará antes del 24 → resolverlas **con base en la LEY**.
> Para cada una: análisis + propuesta, **sin implementar** nada (este doc es solo análisis/decisión).
> **Estado del sistema base:** `main = cb10b27` (21-jun), desplegado en Render.

## Metodología (cómo se resolvió cada una)

1. **Qué hace HOY el sistema** — verificado contra el **código real** (`archivo:función`/`archivo:línea`), no asumido.
2. **Búsqueda en la ley** — sobre el **texto literal** del repo:
   - LOPSRM (Última Reforma **DOF 14-11-2025**): `docs/legal/lopsrm_utf8.txt`
   - RLOPSRM (Última Reforma **DOF 24-02-2023**): `docs/legal/reg_utf8.txt`
   - LFD: `docs/legal/LFD.pdf`
3. **Clasificación de certeza:**
   - **🟢 Alta certeza legal** — la ley resuelve; se cita **artículo + fracción exactos** con su **texto verbatim**.
   - **🟡 Criterio de diseño** — la ley calla o solo es interpretativa; se propone bajo criterio y se **explica por qué**. No se inventa cita: donde no hay base literal, se dice.
4. **Impacto de cambiar** — ¿toca código?, ¿**zona congelada**?, esfuerzo y riesgo.
5. **Prioridad antes del 24-jun.**

> **Verificación de citas (doble pasada):** cada cita la produjo un analista que la copió del `.txt`/PDF, y
> después un **verificador adversarial** la re-buscó en el texto literal e intentó refutarla. Todas las citas de
> este doc están **confirmadas verbatim** con su artículo y fracción correctos. Donde un fragmento une párrafos
> **no contiguos**, se citan **por separado** (lo señala la nota). El método ya tropezó antes con las trampas
> conocidas (138 vs 143, 86-88 vs 86-90, fr. I vs III); aquí se evitaron.

> **⚠️ La ley la confirma el profe (Nivel 1).** Esto fija el **comportamiento por defecto** con su fundamento;
> no sustituye su ratificación. Pero al estar **anclado a la ley vigente**, es defendible tal cual el 24-jun.

---

## Resumen ejecutivo (las 10 de un vistazo)

| # | Decisión | Recomendación | Certeza | ¿Código? | ¿Congelado? | Prioridad |
|---|---|---|---|---|---|---|
| 1 | Cédula profesional | **Quitar** la obligatoriedad | 🟢 Alta | Sí (front, 1 línea) | No | **Alta** |
| 2 | Anticipo 30% + PDF en servidor | **Sí, debe bloquear server-side** (matiz: permitir >30% con autorización) | 🟢 Alta | Sí | **Sí** | Media (impl. post-24) |
| 3 | Plazo art. 54 ("Enviar") | **Mantener aviso**, NO inhabilitar | 🟢 Alta | No | No | **Alta** |
| 4 | Amortización carátula | **Mantener proporcional** + corregir cita | 🟢 Alta | Solo texto | No (la corrección) | Media |
| 5 | Umbrales del semáforo | **Dejar como están** (pago=ley, salud=criterio) | 🟡 Criterio (pago 🟢) | No | No | Media |
| 6 | Convenio >25% | **Mantener avisar** + corregir copy stale | 🟢 Alta | Solo texto | No | Media |
| 7 | CMIC / 2 al millar | **No aplica** (5 al millar sí) | 🟢 Alta | No | No (no activar) | Media |
| 8 | Catálogo de dependencias | **No crear tabla**; ya está separado | 🟡 Criterio | Opcional | No | Media |
| 9 | Súper-entidad OBRA | **Fuera de Etapa 1** → Etapa 2 | 🟡 Criterio | Sí (estructural) | **Sí** | **Baja** |
| 10 | Emisor de nota | **Conservar rol + nombre** | 🟢 Alta | No | No | Media |

### Orden recomendado de resolución (por acción antes del 24)

**🔴 Grupo 1 — Cierra antes del 24 con cambio barato (incoherencias visibles en la demo):**
1. **#1 Cédula** → quitarla (petición explícita del profe; 1 línea + limpieza; la ley no la exige).
2. **#6 Convenio >25%** → corregir el **copy/comentarios stale** del frontend que dicen "bloquea (400)" cuando el backend **solo avisa**.
3. **#4 Amortización** → corregir la **cita mal puesta** (`art. 50` → `art. 143 fr. I`) en `AltaContrato.jsx` y reencuadrar el "plan" como art. 138.

**🟡 Grupo 2 — Llevar respuesta cerrada + cita lista (sin tocar código; defender el statu quo):**
4. **#3 Plazo art. 54** — mantener aviso; cita lista (la ley no sanciona presentar tarde).
5. **#7 CMIC 2 al millar** — no aplica; el **5 al millar sí** (art. 191 LFD). Las fotos del profe lo confirman.
6. **#5 Umbrales** — pago anclado a ley (20 días); salud (95/85) = criterio configurable.
7. **#10 Emisor de nota** — conservar rol + nombre (art. 123 fr. III).
8. **#8 Dependencias** — ya separadas (`empresas.tipo` + 3 pestañas del padrón); no crear tabla.

**🟢 Grupo 3 — Decisión legal cerrada; implementación/alcance posterior:**
9. **#2 Anticipo server-side** — **sí** debe bloquear (art. 50 fr. IV), pero toca **zona congelada** + el "problema de tiempo" del PDF → **1ª oleada post-24**.
10. **#9 Súper-entidad OBRA** — fuera de alcance Etapa 1 → **Etapa 2**.

---

# Fichas detalladas

## 🔴 Grupo 1 — Cerrar antes del 24 (cambio barato)

---

### Decisión 1 — Cédula profesional: ¿se quita o se conserva?

**Recomendación: 🟢 QUITAR la obligatoriedad de la cédula profesional.** Es lo que el profe pidió y la ley federal **no** la exige.

**Qué hace hoy:** el campo "Cédula profesional" del responsable técnico es **obligatorio en el alta**, pero solo en el **frontend**: vive en `REQ_JURIDICOS = ['firmanteDependencia','cargoFirmante','representanteLegal','cedulaProfesional']` (`frontend/src/pages/AltaContrato.jsx:186`) y se pinta `required` en `TabJuridicos` (`:551`). El **backend es agnóstico**: `crearContrato` (`contratos.controller.js`) solo serializa el bloque jurídico como JSONB opaco (`datos_juridicos`) — no conoce ni valida la cédula (grep `cedula` en `backend/src` = 0). Se muestra de vuelta en `ConsultaExpediente.jsx` de forma **condicional**.

**Ley (búsqueda exhaustiva):**
- **LOPSRM art. 46** — enumera **taxativamente** el contenido del contrato (fracciones I–XVI, + XV Bis/XV Ter añadidas DOF 16-04-2025). **Ninguna** exige cédula profesional. La fr. IV pide *"Acreditación de la existencia y personalidad del licitante adjudicado"*, no una cédula.
- **LOPSRM art. 53** — mide la idoneidad del **residente** por *"los conocimientos, habilidades… el grado académico; la experiencia… el desarrollo profesional…"* (criterios cualitativos), **sin** exigir cédula.
- **RLOPSRM art. 61 fr. VI-b) y VII** — la personalidad se acredita con *"escrituras públicas… identificación oficial"* y documentos para suscribir el contrato, **no** con cédula.
- **Verificación negativa:** la cadena **"cédula profesional" tiene 0 coincidencias** en `lopsrm_utf8.txt` y en `reg_utf8.txt`. (Las "cédula" que sí aparecen son *"cédula de avances y pagos programados"*, un documento de programación de obra, no una credencial.)

**Certeza:** 🟢 **Alta certeza legal.** La ley **resuelve por inexistencia**: no impone la cédula como requisito de formalización. La cédula viene de reglamentos **locales** de construcción (DRO), no de LOPSRM/RLOPSRM.

**⚠️ Corrección a un default previo:** el default **B1** documentado (`TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md`) decía *"se mantiene exigida (criterio Fundación, conservador)"*. Eso **choca de frente** con la petición explícita del profe y con la verificación legal. **Se corrige:** la cédula **no** se mantiene obligatoria. Quitar un requisito que la ley no obliga **no relaja ninguna norma**.

**Impacto / esfuerzo:** **bajo, no congelado.** Mínimo: quitar `'cedulaProfesional'` de `REQ_JURIDICOS` (`AltaContrato.jsx:186`) → deja de bloquear el guardado. Para retirarla del todo: quitar el `required` (`:551`), ajustar el banner (`:556`) y limpiar la clave en `JURIDICOS_INICIALES`/`ETIQUETA_JURIDICO`. **Sin migración** (`datos_juridicos` es JSONB libre; `ConsultaExpediente` ya la pinta condicional). Revisar 1–2 specs e2e que pudieran asertar el campo como requerido.

**Prioridad: ALTA.** Petición **directa** del profe, **visible en la demo** del alta, barata y cierra una incoherencia (hoy el sistema obliga a capturar lo que el profe mandó quitar).

---

### Decisión 6 — Convenio >25%: ¿avisar o bloquear? ¿el umbral?

**Recomendación: 🟢 MANTENER "avisar" (no bloquear) al crear.** El default B5 es correcto. **Corregir** el copy/comentarios *stale* del frontend que afirman que el backend **bloquea (400)** — el código real **solo avisa**.

**Qué hace hoy:** al **crear** el convenio el sistema **avisa**, no bloquea (`convenios.controller.js::crearConvenio`, comentario explícito *"superar el 25% ya NO bloquea"*). El umbral es **parametrizable**: `LIMITE_PCT = Number(process.env.CONVENIO_LIMITE_VARIACION_PCT ?? 25)`. Al superarlo devuelve `aviso_variacion` + flags server-side `requiere_revision_sfp` (>25%, art. 102) y `requiere_ajuste_costos` (>50%, art. 59 Bis). El **único** punto donde el 25% gatea algo es `autorizarConvenio`: si la variación >25% y **no** se cargó el oficio de aprobación → **409** (no deja **autorizar** hasta subirlo). Es un **guardrail documental en la autorización**, no un tope de creación. **Incoherencia:** `ConveniosModificatorios.jsx` (comentarios líneas 31/281/287 y copy 595-599) dice que el backend **bloquea (400)** al crear — eso es *stale* respecto a `crearConvenio`.

**Ley:**
- **LOPSRM art. 59** (vigente, reformado DOF 16-04-2025): la facultad de modificar es *"dentro de su presupuesto autorizado… por razones fundadas y explícitas… siempre y cuando no impliquen variaciones sustanciales al objeto del proyecto original"* (párr. 1); y *"Dichas modificaciones no podrán, en modo alguno, afectar las condiciones que se refieran a la naturaleza y características esenciales del objeto del contrato original…"* (párr. 2). El párr. 3: los convenios *"deberán ser autorizados por la persona servidora pública que se determine en los lineamientos…"*.
  > **⚠️ El art. 59 vigente NO contiene ningún 25%.** Su límite es **cualitativo** (no variaciones sustanciales). Verificado: **"veinticinco por ciento"/"25%" = 0 coincidencias en LOPSRM.**
- **RLOPSRM art. 102** (única fuente del 25% en el repo): *"…cuando la modificación a los contratos implique aumento o reducción por una diferencia superior al **veinticinco por ciento** del importe original… o del plazo de ejecución, el Área responsable… deberán revisar los indirectos y el financiamiento… **Será necesario solicitar… la autorización de la Secretaría de la Función Pública**, en los siguientes casos: I… II… III…"*. → El 25% **dispara requisitos** (revisión de indirectos/financiamiento + autorización SFP en los supuestos I-III), **no es un tope que prohíba** el convenio.
- **LOPSRM art. 59 Bis:** el **50%** (*"…superior al cincuenta por ciento del importe original…"*) da **derecho** al contratista a solicitar **ajuste de costos indirectos y financiamiento** — tampoco es un tope.
- **RLOPSRM art. 99:** exige **dictamen técnico** del residente *"que funde y motive las causas"* y suscripción por el servidor facultado.

**Certeza:** 🟢 **Alta.** Avisar (no bloquear) es lo legalmente correcto: el límite real del art. 59 es **cualitativo**; el 25% (art. 102 RLOPSRM) y el 50% (art. 59 Bis) son **clasificadores que disparan requisitos/derechos**, no bloqueos. Bloquear la creación al 25% sería **más estricto que la ley**.

> **Nota de vigencia importante:** el RLOPSRM (2023) remite *"al cuarto párrafo del artículo 59 de la Ley"*; tras la reforma LOPSRM **DOF 14-11-2025** ese párrafo-tope **ya no existe** en su forma anterior. El 25% sobrevive como **referencia administrativa** de revisión/SFP (reglamento), **no como tope legal**. **Citar "art. 59 LOPSRM 25%" sería incorrecto/desactualizado.**

**Impacto / esfuerzo:** **bajo, no congelado** (texto). Corregir comentarios y copy de `ConveniosModificatorios.jsx` para que digan: crear = **aviso**; el bloqueo real es **no poder autorizar** un convenio >25% sin cargar el oficio (art. 102/99). Conservar el guardrail documental de `autorizarConvenio` (es correcto y luce en la demo). Mantener 25% (parametrizable) + flag 50%.

**Prioridad: MEDIA.** El comportamiento sustantivo ya es correcto; lo accionable (cerrar el copy que dice "bloquea 400") es barato y evita que el profe note la incoherencia en el módulo de convenios.

---

### Decisión 4 — Amortización: ¿carátula obedece el plan editable o proporcional?

**Recomendación: 🟢 MANTENER la carátula PROPORCIONAL** (no implementar la "Fase B" de obedecer un plan editable). **Corregir** una **cita legal mal puesta** en el alta.

**Qué hace hoy:** dos mecanismos **no conectados**:
1. **Carátula (lo que paga)** — **proporcional, server-side, congelado:** `estimaciones.controller.js::integrarEstimacion` calcula `amortizacion = ROUND(subtotal × anticipo%/100, 2)`. **No lee** `plan_amortizacion`.
2. **Plan editable (solo expediente)** — capturado en el alta (`plan_amortizacion`), con default **proporcional al programa** y reglas R2/R3, **nunca leído por la carátula**. Los propios comentarios del código lo dicen: *"La carátula (G2) NO usa este plan todavía [Fase B pendiente]"*.
- **Fotos del profe** (`docs/Referencias-estimaciones/`, **carátulas reales del GACM / NAICM, AUTODESK INC, estimación #17, 2017**): la amortización es un **% fijo aplicado a cada estimación** (6.24% en esa foto) con **saldo acumulado del anticipo** (amortizado acumulado 16.21%, saldo por amortizar 83.79%), **sin** plan front/back-loaded. **Confirman empíricamente el modelo proporcional.**

**Ley:**
- **RLOPSRM art. 143 fr. I** *(decisiva):* *"El anticipo se amortizará del importe de cada estimación… conforme al programa de ejecución convenido; **dicha amortización deberá ser proporcional al porcentaje de anticipo otorgado**, sin perjuicio de lo dispuesto en la fracción III incisos a), b) y c)…"*. → **La proporcionalidad es un mandato, no una opción de diseño.**
- **RLOPSRM art. 143 fr. III inciso d):** *"En caso de que exista un saldo faltante por amortizar, éste deberá liquidarse totalmente en la estimación final."* (cierre del modelo: el residuo se salda al final).
- **RLOPSRM art. 138 párr. 3:** *"Previamente a la entrega del anticipo, el contratista deberá presentar… un programa en el que se establezca la forma en que se aplicará dicho anticipo…"*. → Este es el **"programa de aplicación"** (cómo el contratista **gasta** el anticipo antes de iniciar), **distinto** de la **amortización por estimación** (art. 143).

**Certeza:** 🟢 **Alta.** La carátula proporcional **es el cumplimiento de la ley** (art. 143 fr. I). Una "Fase B" que permitiera amortizar todo al inicio o al final **contradiría** el art. 143 fr. I (salvo los reajustes tasados de la fr. III: atrasos, multiejercicio). El plan editable cubre **legítimamente** el art. 138, **pero no autoriza** a dejar de amortizar proporcionalmente.

**⚠️ Corrección de cita en el código (solo texto):** `AltaContrato.jsx` (líneas ~629 y ~723) atribuye la fórmula de amortización al **"art. 50 LOPSRM"**. El art. 50 regula el **otorgamiento** del anticipo (tope 30%, finalidad, entrega), **no** la amortización. La fórmula proporcional vive en **art. 143 fr. I RLOPSRM** (como ya citan bien otras líneas del mismo archivo). Corregir ambas líneas. *(Ojo: las citas del art. 50 fr. II/IV para el tope/autorización del anticipo **sí** están bien y no se tocan.)*

**Impacto / esfuerzo:** mantener proporcional = **esfuerzo nulo**. La corrección de cita + reencuadrar el copy del "plan" como **art. 138** = **solo texto, fuera de zona congelada**. Implementar la Fase B de verdad = **riesgo ALTO** sobre el núcleo financiero congelado (`estimaciones.controller`) y **legalmente improcedente** si es front/back-loading → **no antes del 24** (ni después como libre redistribución).

**Prioridad: MEDIA.** El cálculo ya es correcto; lo valioso es **no prometerle al profe una Fase B ilegal** y corregir la cita visible.

---

## 🟡 Grupo 2 — Respuesta cerrada + cita (sin tocar código)

---

### Decisión 3 — Plazo de presentación (art. 54): ¿inhabilitar "Enviar" o avisar?

**Recomendación: 🟢 MANTENER solo el AVISO ámbar; NO inhabilitar el botón.** No tocar código.

**Qué hace hoy:** solo **avisa**. `EnvioEstimacion.jsx` pinta un texto ámbar *"Fuera de los 6 días para presentar… (art. 54)"* pero el botón "Presentar" solo se deshabilita mientras se está enviando (estado de carga), **nunca por el plazo**. El backend `estimaciones-ciclo.controller.js::enviarEstimacion` **no lee** el corte ni compara contra plazo alguno; permite presentar aunque hayan pasado los 6 días.

**Ley:**
- **LOPSRM art. 54:** *"El contratista deberá presentarlas a la residencia **dentro de los seis días naturales** siguientes a la fecha de corte… la residencia… contará con un plazo **no mayor de quince días naturales**… En el supuesto de que surjan diferencias técnicas o numéricas que no puedan ser autorizadas dentro de dicho plazo, **éstas se resolverán e incorporarán en la siguiente estimación.**"* → Fija un **plazo de orden**, pero **no** le anexa **sanción, caducidad ni preclusión**; el cierre demuestra que el trabajo ejecutado **no se pierde** (se arrastra).
- **LOPSRM art. 55:** la única consecuencia económica por mora en este tramo recae sobre la **dependencia** (*"deberá pagar gastos financieros…"*), **no** sobre el contratista por presentar tarde.

**Certeza:** 🟢 **Alta.** No hay norma que imponga preclusión al contratista. **Inhabilitar el botón sería más restrictivo que la LOPSRM** y le quitaría el derecho a cobrar trabajo ejecutado. Además rompería el seed/demo (estimaciones de periodos antiguos quedarían imposibles de presentar).

**Impacto / esfuerzo:** la recomendación es **no cambiar nada** → esfuerzo/riesgo nulos. *(Mejora opcional, no urgente: registrar la fecha de presentación tardía como **sello** —`enviada_en` ya existe— para trazabilidad, nunca bloquear.)*

**Prioridad: ALTA** (de **respuesta**, no de código). Pregunta directa del profe sobre un flujo visible (HU-13); conviene llegar con la cita lista para defender **por qué NO se inhabilita**.

---

### Decisión 7 — CMIC / 2 al millar: ¿tasa, base, aplica?

**Recomendación: 🟢 NO aplicar el 2 al millar** (mantenerlo fuera de la carátula). El **5 al millar sí** se aplica y es obligatorio.

**Qué hace hoy:** la carátula calcula **una sola** retención fiscal: el **5 al millar (0.5%)** sobre el subtotal sin IVA (`estimaciones.controller.js`: `ROUND(s.subtotal * 0.005, 2) AS retencion`; `schema.sql:540` lo documenta como *"5 al millar, art. 191 LFD"*). **No existe** parámetro, columna ni renglón de UI para el 2 al millar: está **documentado como diferido, no implementado**.

**Ley:**
- **LFD art. 191:** *"…los contratistas con quienes se celebren contratos de obra pública… pagarán un derecho equivalente al **cinco al millar sobre el importe de cada una de las estimaciones de trabajo**."* + párr. 2: *"Las oficinas pagadoras… al hacer el pago de las estimaciones de obra, **retendrán** el importe del derecho…"*. → El **5 al millar es federal, obligatorio**, exactamente lo que el sistema ya hace.
- **Verificación negativa exhaustiva:** **"2 al millar" / "dos al millar" / "CMIC" = 0 coincidencias** en LFD, RLOPSRM y LOPSRM. (En LFD, los demás "al millar" son del **sector financiero** —CNBV—, no de obra. En RLOPSRM, "industria de la construcción" aparece solo en **precios unitarios** —`Cm`/`Ko`—, no como aportación CMIC.)

**Certeza:** 🟢 **Alta.** El 5 al millar lo resuelve el art. 191 LFD. El 2 al millar lo resuelve **por inexistencia**: es una **aportación a la Cámara Mexicana de la Industria de la Construcción (CMIC/ICIC)** de **base contractual** (o estatal), **no un derecho federal**. Solo aplicaría si un contrato concreto lo pacta. Las **carátulas reales del profe (GACM) tampoco traen** renglón de 2 al millar.

**⚠️ Matiz al default B2:** decía *"parametrizable; default no aplica"*. Hoy **no es un parámetro vivo** (no existe tal knob): es **no implementado / diferido**. La conclusión (no aplica) es correcta; el matiz es preciso.

**Impacto / esfuerzo:** dejarlo como está = nulo. **Activarlo = follow-on de Maiki** y toca **zona congelada** (`estimaciones.controller` + `schema.sql`: nueva columna `cmic_pct` por contrato, snapshot por estimación, renglón restado del neto, 7 reportes) → riesgo de descuadre **sin base legal** → fuera de alcance Etapa 1.

**Prioridad: MEDIA** (narrativa legal). Pregunta directa del profe; llegar con la distinción **5 al millar (federal, art. 191 LFD) vs 2 al millar (contractual CMIC)**.

---

### Decisión 5 — Umbrales del semáforo (≥95/85; 0/1-10/>10): ¿están bien?

**Recomendación: 🟢/🟡 DEJARLOS como están.** No tocar código antes del 24; la entrega es la **explicación**.

**Qué hace hoy:** dos semáforos, ambos server-side, con cortes centralizados en `backend/src/lib/umbrales-semaforo.js` (no congelado):
- **(a) Salud de cartera (HU-18, `portafolio.controller.js`):** combina factores; el de avance usa desviación = programado% − físico% → ≤5pp verde (≥95% cumplido), 5-15pp ámbar (85-95%), >15pp rojo.
- **(b) Plazo de pago (HU-20, `instruccion-pago.controller.js::semaforoPlazo`):** cuenta días vencidos contra `PLAZO_PAGO_DIAS = 20`; buckets 0 / 1-10 / >10. Anclado a la fecha de la nota de autorización; sin ancla, se **deshabilita**.

**Ley:**
- **LOPSRM art. 54:** *"…en un plazo **no mayor a veinte días naturales**, contados a partir de la fecha en que hayan sido autorizadas…"* (pago) y *"…**quince días naturales**…"* (revisión). → **ancla legal** del semáforo de pago (`PLAZO_PAGO_DIAS=20`) y del factor de revisión (`=15`).
- **LOPSRM art. 55:** la mora genera gastos financieros → **justifica** tener un semáforo de plazo.
- **RLOPSRM art. 2 fr. VII:** *"**Avance físico:** el porcentaje de los trabajos ejecutados y verificados por el residente… en relación a los trabajos contemplados en el programa de ejecución convenido"* → **fundamenta la métrica** de salud (avance físico vs programado).
- **Verificación negativa:** *"noventa y cinco / ochenta y cinco / 95% / 85% / salud / cartera / tolerancia / desviación"* = **0 coincidencias**. Los **cortes 95/85 no los fija ninguna ley**.

**Certeza:** la **mitad legal** está anclada (🟢 los 20/15 días); la **otra mitad** (los cortes 95/85 y la subdivisión 0/1-10/>10 de los días vencidos) es **🟡 criterio de diseño** (la ley no gradúa el incumplimiento, solo marca el límite). El código **ya separa con precisión** lo legal del criterio.

**Impacto / esfuerzo:** cambiar un umbral = editar 2-3 literales en `umbrales-semaforo.js` + `docker restart` → **bajo, no congelado**, ningún dato migra. *(Mejora opcional post-24: que el ámbar de pago dispare **antes** de vencer —p. ej. faltando 5 días— y no solo después.)*

**Prioridad: MEDIA.** Ambos semáforos se ven en la demo; conviene poder decir: **el plazo de pago de 20 días es ley (art. 54); los cortes intermedios son criterio configurable y documentado.**

---

### Decisión 10 — Emisor de nota: ¿solo rol o rol + nombre?

**Recomendación: 🟢 CONSERVAR rol + nombre.** No tocar código.

**Qué hace hoy:** el emisor se identifica por **rol + nombre**, y la identidad **siempre sale del JWT** (`emisor_id = req.user.id`, nunca del body). `bitacora.controller.js` devuelve `emisor_nombre`, `emisor_correo` y `rol_emisor` (del catálogo `bitacora_nota_tipos`). Se muestra en `EmisionNotas.jsx` (*"Emisor: {nombre} · {rol}"*), `DocumentoNota.jsx` (columnas Nombre/Rol separadas, emisor marcado) y `BuscadorNotas.jsx` (columna "Firmante" = solo nombre).

**Ley:**
- **RLOPSRM art. 123 fr. III** *(decisiva):* la nota de apertura debe relacionar *"…**nombre y firma del personal autorizado**… la inscripción de los documentos que **identifiquen oficialmente al residente** y, en su caso, al supervisor, así como al superintendente… **quienes serán los responsables para realizar registros en la Bitácora**…"*. → La ley identifica a quien asienta notas **por nombre**, no solo por cargo.
- **RLOPSRM art. 123 fr. II:** el contenido de cada nota precisa *"…responsabilidad si la hubiere…"* (la **trazabilidad de responsabilidad** es parte del contenido).
- **RLOPSRM art. 125:** reparte la responsabilidad de registro por cargo (residente fr. I, superintendente fr. II, supervisión fr. III) → cada nota tiene un responsable **nominalmente identificable según su cargo**.

> **Corrección a la "pista" original:** el respaldo del **nombre** está en la **fr. III** (no en la fr. II, que lista el contenido). Verificado.

**Certeza:** 🟢 **Alta.** Rol + nombre cumple ambas dimensiones (función contractual + identificación nominal); **solo-rol no satisface** la identificación que pide la fr. III, y degradaría la auditabilidad de la bitácora.

**Impacto / esfuerzo:** la recomendación es **no cambiar** → nulo. *(Cosmético opcional: en `BuscadorNotas.jsx` la columna se llama "Firmante" y muestra solo el nombre; rotularla "Emisor" y añadir el rol entre paréntesis alinearía con las otras vistas. No afecta cumplimiento ni demo.)*

**Prioridad: MEDIA.** Statu quo ya correcto; valor = dejar documentada la respuesta legal (art. 123 fr. III).

---

### Decisión 8 — Catálogo de dependencias / vista de empresas / separar dependencias

**Recomendación: 🟡 NO crear una tabla `dependencias` separada antes del 24.** El modelo actual ya cubre lo que pregunta el profe.

**Qué hace hoy:** el sistema **ya separa** dependencias de privadas, **sin** tabla aparte: con una columna **`empresas.tipo`** (`'dependencia' | 'contratista' | 'supervision'`) sobre la tabla única `empresas` (índice único funcional normalizado anti-duplicados). `EmpresasPadron.jsx` (`SoloRol dependencia`) ya presenta **tres pestañas**: "Padrón de contratistas/supervisión", "Por validar" (con detección de duplicados + **Fusionar**) y **"Dependencias"** (las muestra aparte). La "dependencia" del contrato es un `usuario` rol `dependencia` (`contratos.dependencia_id`) cuya `empresa_id` apunta a una `empresa` tipo `'dependencia'`. **No existe** una tabla `dependencias` con RFC/clave de ente ni alta administrable como catálogo.

**Ley:**
- **RLOPSRM art. 43 / LOPSRM art. 74 Bis:** el **registro único de contratistas** (privados) lo **administra la SFP** en la Plataforma federal (CompraNet/BEOP); las dependencias **validan/inscriben** a los contratistas. La ley confirma que **dependencia y contratista son partes distintas**, pero **no prescribe la estructura de datos** (tabla única + discriminador vs. tablas separadas) ni obliga a un "catálogo de dependencias" local.
  > *(Precisión de la cita art. 43: la frase "El citado registro será diseñado y administrado por la SFP" está en el **párrafo 4**, no el 2; el contenido y la atribución a la SFP son correctos.)*

**Certeza:** 🟡 **Criterio de diseño.** La ley resuelve la **separación conceptual** pero **no** la estructura. Bajo criterio, **tabla única + `tipo`** es la opción correcta para Etapa 1 (máxima cobertura, mínimo costo, sin tocar zona congelada).

**Impacto / esfuerzo:**
- **Barato (hacer ya, alto valor):** en la demo, **mostrar las 3 pestañas** para sustentar la separación; y **cerrar una incoherencia**: hoy `resolverOCrearEmpresa` deja que **cualquier** registro cree una empresa tipo `'dependencia'` por texto libre, lo que contradice *"padrón administrado por la dependencia"* (art. 43). Mejora: que las dependencias **no** se auto-registren por texto libre y se den de alta explícitamente desde la pestaña "Dependencias" (POST en el controller **nuevo**, sin DDL).
- **Medio (opcional, no demo):** columnas **aditivas** `rfc`/`clave_ente` a `empresas` gateadas por `tipo='dependencia'` (sigue sin tabla nueva).
- **Descartar para Etapa 1:** re-modelar `contratos.dependencia_id` hacia FK a tabla propia → arrastra **zona congelada** (`schema.sql`, `contratos.controller`, `lib/acceso.js`); el registro real es federal (SFP).

**Prioridad: MEDIA.** Ya está mayormente resuelto; lo único accionable barato es cerrar el auto-registro de dependencias por texto libre.

---

## 🟢 Grupo 3 — Decisión cerrada; implementación/alcance posterior

---

### Decisión 2 — Anticipo: ¿umbral 30% + PDF deben bloquear en el SERVIDOR?

**Recomendación: 🟢 SÍ, debe bloquear server-side** — con el matiz correcto: **no rechazar el >30%, sino exigir la autorización escrita**. La **decisión legal está cerrada**; la **implementación** toca zona congelada → 1ª oleada post-24.

**Qué hace hoy:** el umbral (30%) y la exigencia del PDF de autorización viven **solo en el cliente** (`AltaContrato.jsx:40` `ANTICIPO_UMBRAL_PDF = 30`; candado en `validarPaso` `:1601`). El backend `crearContrato` solo valida `0 ≤ anticipoPct ≤ 100`; **no** exige el PDF ni bloquea sobre el 30%. El contrato se crea **sin** PDF; el PDF se liga **después** por `subirDocumento` (sí estricto: solo residente, magic-bytes `%PDF`, append-only, `tipo='anticipo_autorizacion'`). → Una llamada **directa a la API** puede crear un contrato con anticipo >30% **sin** autorización (ESTADO_ACTUAL §5.1, *"Solo-cliente"*).

**Ley:**
- **LOPSRM art. 50 fr. II:** *"Las dependencias y entidades podrán otorgar **hasta un treinta por ciento** de la asignación presupuestaria correspondiente al contrato para cada ejercicio…"* (tope ordinario).
- **LOPSRM art. 50 fr. IV** *(decisiva):* *"Cuando las condiciones de los trabajos lo requieran, el porcentaje de anticipo **podrá ser mayor al treinta por ciento**… en cuyo caso **será necesaria la autorización escrita de la persona titular de la dependencia o entidad** o de la persona en quien éste haya delegado tal facultad;"*. → La autorización escrita es un **requisito de validez** cuando el anticipo supera el 30%.

**Certeza:** 🟢 **Alta.** La ley convierte la autorización escrita en **requisito** (art. 50 fr. IV). Un requisito legal **eludible desde el cliente no es una garantía**; el propio `CLAUDE.md` exige candados sensibles **server-side** (fuente única de verdad). **Matiz:** el >30% **no se rechaza** (la fr. IV lo permite); lo que se exige es la **autorización**. El 30% queda **parametrizable** (la ley fija el tope en 30, fr. II).

**Impacto / esfuerzo:** **medio/medio, ZONA CONGELADA.** `crearContrato` está congelado (→ vía Maiki/Fundación). Hay un **"problema de tiempo"**: hoy el PDF se sube **después** del INSERT, así que el servidor no lo ve al crear. Opciones: (a) **check de finalización** server-side que marque el contrato como completo solo si existe `contrato_documentos.tipo='anticipo_autorizacion'` cuando anticipo >umbral (menos invasiva al cuadre G1-G8); (b) que el front mande el PDF en el **mismo multipart** del alta y `crearContrato` lo valide transaccionalmente. Conservar la estrictez ya existente de `subirDocumento`.

**Prioridad: MEDIA (decisión cerrada; implementación post-24).** Para la demo, el **wizard ya bloquea** correctamente (el evaluador por UI no lo ve fallar); el hueco solo se expone llamando la API directo. Es la **corrección server-side de mayor valor jurídico pendiente del alta** → 1ª oleada si no da tiempo antes.

---

### Decisión 9 — Súper-entidad OBRA (varios contratos bajo una obra): ¿entra al alcance?

**Recomendación: 🟡 NO en Etapa 1 → diferir a Etapa 2.**

**Qué hace hoy:** **contrato-céntrico.** La raíz es `contratos` (`schema.sql`, sin `obra_id`); **no existe** tabla `obras`. `listarContratos` no agrupa por obra; `PortafolioEjecutivo.jsx` lista contratos sin agruparlos. *(Decisión nueva: no estaba en la tabla de defaults.)*

**Ley:**
- **LOPSRM art. 3:** *"…se consideran **obras públicas** los trabajos que tengan por objeto construir, instalar, ampliar, adecuar, remodelar, restaurar, conservar, mantener, modificar y demoler bienes inmuebles…"*. → Define la **obra como los trabajos en sí** (objeto del contrato).
- **Verificación negativa:** LOPSRM **no contempla ni exige** una "súper-entidad", "agrupador" ni "portafolio de obras" que agrupe varios contratos (0 coincidencias).
  > *(Precisión: el art. 3 no **prohíbe** agrupar contratos; simplemente **no lo contempla ni lo exige**. La presentación correcta es "la ley no define ni obliga a tal entidad", no "lo prohíbe".)*

**Certeza:** 🟡 **Criterio de diseño** (silencio legal). Es una decisión de **alcance**, no de cumplimiento.

**Impacto / esfuerzo:** **alto, ZONA CONGELADA.** Una tabla raíz `obras` + `obra_id` toca `schema.sql` (congelado) y re-cablea `contratos.controller`, `lib/acceso.js`, portafolio y `App.jsx`. **Alto riesgo, nulo valor para la demo.** *(Si urgiera algo barato: agrupar el Portafolio por **objeto/ubicación**, o una columna `codigo_obra` **sin FK** como etiqueta — sin re-modelar.)*

**Prioridad: BAJA.** No la exige la ley, no se demuestra en la demo, es cara sobre zona congelada → **Etapa 2**.

---

## Para llevar a la reunión del 24 (frases-respuesta)

| # | Si el profe pregunta… | Respuesta de una línea |
|---|---|---|
| 1 | "¿La cédula no la habíamos quitado?" | *"Sí, la quitamos: la ley federal (art. 46/53 LOPSRM, 61 RLOPSRM) no la exige."* |
| 2 | "¿El anticipo >30% se bloquea en el servidor?" | *"La ley (art. 50 fr. IV) exige autorización escrita arriba del 30%; hoy se valida en el cliente, lo movemos al servidor en la 1ª oleada."* |
| 3 | "¿Y si presenta la estimación tarde?" | *"Se avisa, no se bloquea: el art. 54 no sanciona presentar tarde; lo no resuelto se arrastra a la siguiente."* |
| 4 | "¿Puedo amortizar todo al final?" | *"No: el art. 143 fr. I RLOPSRM obliga a amortizar **proporcional**; sus propias carátulas del GACM lo confirman."* |
| 5 | "¿De dónde salen los umbrales?" | *"El plazo de pago (20 días) es ley (art. 54); los cortes 95/85 son criterio nuestro, configurable."* |
| 6 | "¿El convenio >25% se bloquea?" | *"Se avisa: la ley 2025 quitó el 25%; el 25% es del reglamento (art. 102) y solo dispara revisión/SFP, no bloqueo. Para **autorizarlo** sí pedimos el oficio."* |
| 7 | "¿Y el 2 al millar?" | *"No aplica: solo el 5 al millar es federal (art. 191 LFD); el 2 al millar es aportación CMIC, contractual, y sus carátulas reales no lo traen."* |
| 8 | "¿Separaron dependencias de empresas?" | *"Sí: mismas tablas con tipo, y el padrón las muestra en pestaña aparte. No hace falta tabla nueva (el registro real es de la SFP, art. 74 Bis)."* |
| 9 | "¿Una obra con varios contratos?" | *"La ley trata la obra como objeto del contrato (art. 3); agrupar varios bajo una obra es Etapa 2 (re-modela todo)."* |
| 10 | "¿Quién emitió la nota?" | *"Rol + nombre: el art. 123 fr. III RLOPSRM exige identificar por nombre al responsable del registro."* |

---

## Apéndice — Correcciones a defaults/citas previas detectadas en esta pasada

1. **Cédula (B1):** el default *"se mantiene exigida"* **se invierte** → quitarla (la ley no la exige; el profe la pidió quitar).
2. **Convenio 25% (B5):** la conducta (avisar) es correcta, pero el **fundamento** debe ser **art. 102 RLOPSRM** (reglamento 2023), **no** "art. 59 LOPSRM 25%" — ese 25% **ya no existe** en la LOPSRM 2025. Además corregir el **copy stale** del frontend que dice "bloquea (400)".
3. **Amortización (A2):** correcta (proporcional, art. 143 fr. I), pero **corregir la cita** `art. 50 LOPSRM` → `art. 143 fr. I RLOPSRM` en `AltaContrato.jsx` (líneas ~629/~723), y reencuadrar el "plan editable" como **programa de aplicación del art. 138**, no como plan de amortización.
4. **CMIC 2 al millar (B2):** la conclusión (no aplica) es correcta, pero **no es "parametrizable"** hoy — es **no implementado/diferido**.
5. **Verificación de citas:** todas las del doc están confirmadas verbatim. Las que un análisis presentó como bloque continuo uniendo párrafos no contiguos (art. 59 LOPSRM, art. 99 RLOPSRM, art. 43 RLOPSRM) se citan aquí **por párrafos separados**; no cambia ninguna conclusión.

> **Fuera de alcance de este doc (encargo: solo análisis):** no se modificó código. Las acciones de los Grupos 1-2
> (cédula, copy de convenio, cita de amortización) son cambios **frontend baratos y fuera de zona congelada**; las
> del Grupo 3 (enforcement del anticipo, súper-obra) tocan **zona congelada** y las decide/implementa **Maiki**.
