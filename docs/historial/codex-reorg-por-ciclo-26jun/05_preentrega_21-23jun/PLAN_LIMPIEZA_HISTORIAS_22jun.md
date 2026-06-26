# Plan para dejar las 24 historias EXCELENTES (22-jun) · SIGECOP

> **Encargo (Maiki, Bloque 3):** plan robusto para limpiar `docs/requisitos/Historias_Usuario_ACTUALIZADAS_12jun.md` (el entregable que califica el profe) **sin cambiar requisitos ni citas** — solo redacción, orden y limpieza. **PROPUESTA, no aplicar** hasta tu OK. Incluye 4-5 ejemplos verbatim para aprobar el ESTILO.
> **Insumos:** `docs/reportes/HALLAZGOS_SMOKE_HU01-10_22jun.md` (HU-01..10) + `docs/reportes/HALLAZGOS_HISTORIAS_HU11-24_22jun.md` (HU-11..24) + los audios del profe (21-jun) + la ley.

---

## PASO A — ¿Qué son los "Criterios adoptados"? (lo que pediste explicar)

Cada historia tiene, debajo del **Fundamento legal**, un bloque titulado **"Criterios adoptados (resueltos — ver TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md)"**.

**Qué son:** son las **decisiones de diseño que tomó el equipo** cuando la ley o el profe **no especificaban** un detalle. Por ejemplo: "¿qué tasa lleva el 2 al millar?", "¿el aviso de convenio >25% bloquea o solo avisa?", "¿qué cortes tiene el semáforo?". Cuando no había respuesta dura, el equipo **eligió un valor por defecto** ("default conservador"), lo etiquetó con un **código** (A3, B7, B2…) y lo registró en ese bloque, con enlace a la tabla maestra `TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md`.

**Qué función tuvieron:** fueron la **bitácora de "por qué resolvimos así"** — trazabilidad interna para (a) no dejar marcas `[validar profe]` sueltas, (b) recordar qué falta confirmar con el profe, y (c) que cualquiera del equipo entienda una decisión sin volver a discutirla. **Tienen valor; no se tiran.**

**Por qué conviene SACARLOS del documento que ve el profe:**
1. **El profe lo pidió literal** (audio 21-jun): *"Criterios adoptados… le va a dar cáncer al PO… que me los ponga en otro archivo por si acaso."*
2. **Hablan en idioma del equipo, no del usuario:** códigos A/B, "default conservador", "[PARA MAIKI]", "ficha vieja", nombres de archivos y de personas, referencias a docs internos. Un Product Owner que lee eso se confunde y desconfía de la historia.
3. **No son requisitos:** una historia de usuario debe tener **Historia + Criterios de aceptación + Fundamento legal**. Las deliberaciones internas son otro género de documento.

**Qué hacemos con ellos:** **se MUEVEN íntegros** a `docs/requisitos/CRITERIOS_ADOPTADOS_INTERNO.md` (nuevo), **conservándolos** y con una nota al inicio explicando qué son (lo de arriba). Así el profe lee historias limpias y el equipo no pierde la trazabilidad.

> **Las 24 historias tienen este bloque** (verificado: HU-00..24 + Registro + Por Firmar = **27 unidades**). Todos van al archivo interno.

---

## PASO B — El plan de limpieza (6 acciones)

### 1. Quitar tecnicismos (lenguaje del usuario, no del programador)
Reescribir en lenguaje llano, **conservando el comportamiento y las citas**. Términos a reemplazar (detectados en las 24): *append-only, folio correlativo, (nota) tipificada, redondea a 3 decimales, inmutable, atómico/de una sola vez, snapshot, idempotente, previsualiza en vivo, normalizado fuerte, retrocompatible, follow-on, FK, dato legado, sincroniza el caché, máquina de estados (estado → X)*.

### 2. Quitar menciones meta/internas
Eliminar del cuerpo de la historia: *"se quitaron los filtros porque…", "criterio del equipo / default conservador", "hallazgo del profe audio…", "respaldo al dato de alta", "[PARA MAIKI]", "ficha vieja", "antes era una maqueta / se degradó / hecho desactualizado", "Estado: Funcional (sesión E2 18-jun)", nombres de archivos (`lib/umbrales-semaforo.js`), referencias a docs internos (`TABLA_VALIDAR_PROFE_RESUELTOS`), atribuciones con fecha ("— profe 09-jun")*.

### 3. Mover TODOS los "Criterios adoptados" a archivo interno
Crear **`docs/requisitos/CRITERIOS_ADOPTADOS_INTERNO.md`** con: (a) una cabecera que explique qué son (PASO A), y (b) los **27 bloques** movidos íntegros, agrupados por HU. La historia queda solo con Historia + Criterios + Fundamento legal.

### 4. Especificar la pantalla donde es ambiguo
Reemplazar "el formulario / la pantalla / la vista" por el **nombre + ruta** reales:

| Historia | "…" ambiguo | Pantalla real |
|---|---|---|
| HU-06 | "en el formulario" | **Registrar avance** (`/seguimiento/trabajos-terminados`) |
| HU-12 | "la pantalla / vista previa" | **Integración del periodo** (`/estimaciones/integracion`), paso 3 "Carátula" |
| HU-15 | "la vista" | **Revisión / autorización** (`/estimaciones/revision`) |
| HU-16 | "la pantalla de Reingreso" | **Reingreso de estimación** (`/estimaciones/reingreso`); el contrato se **hereda** |
| HU-18 | "una lista de contratos" | **Portafolio ejecutivo** (`/portafolio`) |
| HU-21 | "la pantalla" | **Registro del pago** (`/pagos/registro`) |
| HU-22 | "el enlace y la pantalla" | **Roster / sustitución** (`/contratos/roster`) |

### 5. Reordenar por FLUJO del sistema (sin renumerar los IDs)
El profe: *"las historias nada más que las cambie de lugar en el punto MD"* (conservar HU-00…HU-24). Orden propuesto (alta → … → consultas):

`HU-00 → Registro → HU-23 → HU-01 → HU-02 → HU-22 → HU-08 → Por Firmar → HU-09 → HU-10 → HU-11 → HU-05 → HU-06 → HU-07 → HU-12 → HU-13 → HU-15 → HU-16 → HU-20 → HU-21 → HU-03 → HU-24 → HU-04 → HU-14 → HU-17 → HU-18 → HU-19`

(login → cuentas/empresa → alta → fianzas → roster → bitácora → notas → minutas → avance/curva/atraso → estimación → revisión → reingreso → tránsito a pago → pago → convenio → finiquito → **consultas** al final).

### 6. Conservar los fundamentos legales
El profe los aprobó (*"cada historia tiene un fundamento… eso está bien"*). **Las citas NO se tocan** — solo se reescribe el lenguaje técnico a su alrededor. Las citas señaladas como "a verificar" (tabla B del reporte HU-11..24) **se revisan antes, no se cambian a ciegas**.

### 7. Ajustes de texto ya detectados (incluir en la limpieza)
- **HU-03 c1:** "recibe un aviso de acceso denegado" → **"vista solo de consulta para tu rol"** (lo que el sistema realmente muestra; el profe lo señaló).
- **HU-03 c6:** quitar *"diferir el efecto material… coordinado con el equipo de estimaciones"* (obsoleto; el profe: *"eso ya hay que quitarlo"*).
- **HU-02:** quitar *"y el nombre del archivo PDF"* (el profe lo pidió).
- **HU-04 c2:** quitar *"con respaldo al dato del alta si hiciera falta"*; **c3:** quitar *"(se quitaron los filtros… porque no aportan)"*.
- **HU-01 "precio alzado":** marcar como **DUDA del profe** (no inventar qué es): *"el profe no entendió el término; pendiente de aclarar en qué pantalla aplica."*
- **HU-13/HU-20/HU-21:** quitar el código interno **"HU-15"/"HU-20"** del texto de cara al usuario y los bloques **"[PARA MAIKI]"**.
- **HU-21:** corregir/ratificar la cita *"art. 118 citado en la pantalla"* (la pantalla no lo cita).
- **HU-12 / HU-14:** alinear el texto con la realidad (fotos diferidas al Expediente; "Fecha de presentación" — decidir si se corrige el dato del sistema o la etiqueta, ver posibles bugs).

> **Los "posibles bugs" (tabla A del reporte HU-11..24) NO son parte de esta limpieza de texto** — son corrección de sistema, decisión aparte. Aquí solo se ajusta la **redacción** de la historia para que no prometa algo que el sistema no hace; el bug en sí lo decides tú.

---

## PASO C — Ejemplos verbatim (aprueba el ESTILO antes de tocar nada)

**Ej. 1 — HU-06 (tecnicismo "append-only"):**
> **Original:** "…la captura es **append-only**: no se edita ni se elimina; corregir un error anula la entrada anterior y registra una nueva vinculada (con nota 'dice / debe decir', art. 123 fr. VI/VII RLOPSRM)."
> **Propuesto:** "…la captura no se edita ni se elimina; para corregir un error, la captura anterior queda **anulada** y se registra una nueva ligada a ella (con nota 'dice / debe decir', art. 123 fr. VI/VII RLOPSRM)."
> *(Se conserva la cita; se quita la palabra técnica.)*

**Ej. 2 — HU-11 (tecnicismo "folio correlativo" + dato inexistente):**
> **Original:** "…se agrega arriba de la tabla con **folio correlativo y resaltado verde**."
> **Propuesto:** "…se agrega arriba de la tabla con su **número de minuta**."
> *(Además "resaltado verde" no existe en el sistema — se quita.)*

**Ej. 3 — HU-18 (jerga: fórmula interna del semáforo):**
> **Original:** "Cada renglón muestra un semáforo (verde si la suma es 1 o menos, amarillo 2-3, rojo 4 o más) obtenido al **sumar 0/1/2 puntos de los tres factores… calculado en el servidor a partir de datos reales**."
> **Propuesto:** "Cada renglón muestra un semáforo de color (verde / amarillo / rojo) según su nivel de riesgo, combinando tres factores: la desviación del avance frente a lo programado, los días vencidos en plazos y los pendientes sin atender."
> *(La aritmética 0/1/2 y los cortes van al anexo técnico, no a la historia.)*

**Ej. 4 — HU-21 (tecnicismo "inmutable"):**
> **Original:** "…dejándola en estado 'Pagada' **de forma inmutable y auditable**."
> **Propuesto:** "…dejándola en estado 'Pagada' de forma **definitiva**: una vez registrada ya no puede modificarse, y queda constancia de quién y cuándo."

**Ej. 5 — Estructura: mover un bloque "Criterios adoptados" (HU-20):**
> **En la historia (se QUITA):** todo el bloque *"Criterios adoptados en la integración… Comprometido = Σ neto…; Cortes del semáforo…; [PARA MAIKI] Ancla definitiva del plazo…"*.
> **En `CRITERIOS_ADOPTADOS_INTERNO.md` (se CONSERVA), bajo "## HU-20":** el bloque íntegro, tal cual, con su trazabilidad. La historia queda con Historia + Criterios + Fundamento legal limpios.

> Si apruebas este estilo, aplico las 6 acciones a las 24 historias en una pasada, **respaldando primero** `Historias_Usuario_ACTUALIZADAS_12jun.md` en `docs/historial/requisitos/`.

---

## BLOQUE 4 — Verificación legal art. 123 vs 125 (HU-09)

**Veredicto: la historia ESTÁ BIEN. No hay que cambiar la cita.** El profe leyó "art. 125" como "123", pero **125 es el artículo correcto** para los tipos de nota.

- **Para los TIPOS de nota por rol → art. 125 RLOPSRM (correcto).** HU-09 criterio 1 dice *"El selector de tipos muestra solo los **tipos del art. 125** vigentes que corresponden a mi lugar en el equipo."* Verificado verbatim (`reg_utf8.txt:4620-4646`):
  > *"Artículo 125.- Cuando se presenten cualquiera de los eventos que a continuación se relacionan, se deberá efectuar el registro en la Bitácora mediante la nota correspondiente… **I. Al residente le corresponderá registrar:** a) La autorización de modificaciones…; b) La autorización de estimaciones;… e) La autorización de convenios modificatorios;… g) La sustitución del superintendente…; … **II. Al superintendente corresponderá registrar:** …"*
  → El art. 125 **es** el catálogo de tipos de nota por rol. La cita es **correcta**.

- **Para el PLAZO DE FIRMA / ACEPTACIÓN TÁCITA → art. 123 fr. III RLOPSRM (correcto).** HU-09 criterio 5 (*"si vence el plazo de firma sin completarse se marca 'aceptada (tácita)'"*) tiene como fundamento `art. 123 fr. III`. Verificado verbatim (`reg_utf8.txt:4550-4551`):
  > *"…se establecerá un plazo máximo para la firma de las notas, debiendo acordar las partes que **se tendrán por aceptadas una vez vencido el plazo**;"*
  → El art. 123 fr. III **es** el de la aceptación tácita. La cita es **correcta**.

**Conclusión:** HU-09 usa **ambos artículos en su lugar correcto** (125 = tipos; 123 fr. III = firma/tácita). El profe se confundió al leer; **no se cambia nada**. *(En la limpieza, solo conviene asegurar que el texto deje claro qué cubre cada artículo, sin tocar los números.)*

---

> **Nada aplicado.** Apruebas el estilo (PASO C) y procedo con las 6 acciones a las 24 historias + crear `CRITERIOS_ADOPTADOS_INTERNO.md`, respaldando antes en `docs/historial/requisitos/`. **No cambio requisitos ni citas.**
