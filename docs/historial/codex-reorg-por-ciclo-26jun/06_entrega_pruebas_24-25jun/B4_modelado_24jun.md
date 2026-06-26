# B4 — Más cantidad de un concepto existente: modelado (espera OK)

> **Mockup:** `docs/mockups/B4_mas_cantidad_concepto.html` (ábrelo en el navegador). 2 variantes de diseño.
> **NO implementado** — primero apruebas el mockup y el enfoque de modelado.

## El mockup (2 variantes)

| | Variante A — fila hija en la tabla | Variante B — panel "antes → después" |
|---|---|---|
| Cómo | El original congelado; debajo una **fila hija de "ampliación"** donde solo se teclea la cantidad extra | Botón **"Ampliar"** por concepto → panel con 3 cajas (original / +extra / total nuevo) |
| Pro | Todo en una tabla, jerarquía visual padre→hija, total inmediato | "Antes→después" explícito, imposible confundir el P.U., tabla limpia |
| Contra | Tabla más densa | Un clic más (abrir panel) |

**Ambas respetan los 3 anclajes no negociables:** original **congelado y visible** (chip gris) · **P.U. heredado/bloqueado** (candado 🔒 + chip "art. 59 LOPSRM", nunca campo libre) · **total actualizado** del concepto (cantidad original + extra, con importe).

Recomiendo **A** (menos fricción, todo a la vista); B es mejor si prefieres un paso explícito de confirmación.

## Cómo lo modelaría por detrás

Dos formas de guardar "más de lo mismo". El mockup las soporta a ambas; la diferencia es de datos:

### Opción 1 — Fila ADICIONAL que referencia al original *(recomendada)*
- Un `contrato_concepto` **nuevo** `es_adicional=true`, con **clave derivada** (p. ej. `CONC-01·A`), que **hereda
  concepto/unidad/P.U. del original** (el P.U. no se teclea). Vínculo al original por convención de clave o, si se
  quiere formal, una columna `origen_concepto_id` (**eso sí tocaría schema** → lo evitaría en Etapa 1).
- **Estimaciones/pagos/avance después:** el extra es **otro `contrato_concepto_id`** → se estima y paga como
  renglón propio (art. 101 RLOPSRM "administrar independientemente"); el % de avance del original no incluye el
  extra (se ve en el renglón de ampliación). El total del concepto se **deriva** sumando original + su ampliación
  (eso lo hace la vista, como en el mockup).
- **Pros:** respeta la inmutabilidad del original (no se reescribe nada congelado); encaja con lo que el sistema YA
  hace para adicionales (`es_adicional`, badge B5); el P.U. heredado cumple art. 59 sin tocar el original.
- **Contras:** el concepto aparece en 2 renglones (original + ampliación); el avance se reporta partido.

### Opción 2 — Delta sobre el original (subir su cantidad)
- Se incrementa `contrato_conceptos.cantidad` del **mismo** registro (misma clave, mismo P.U.).
- **Estimaciones/pagos/avance después:** mismo `contrato_concepto_id` → estimaciones existentes intactas, el extra
  se estima/paga sin renglones nuevos, % de avance correcto contra la nueva cantidad, un solo renglón.
- **Pros:** lo más fiel a la redacción del art. 59 ("cantidades adicionales… al P.U. pactado"); datos más limpios
  (un concepto, una fila).
- **Contras:** **rompe el principio "originales congelados"** que el equipo fijó (hoy el backend rechaza con 409
  `conceptoCongelado` cualquier cambio de cantidad del original); hay que relajar el freeze **solo** para
  "subir cantidad, mismo P.U." bajo convenio.

**Mi recomendación de datos:** **Opción 1** (fila adicional con clave derivada, sin `origen_concepto_id` para no
tocar schema). Es la de menor riesgo: no relaja la inmutabilidad, reusa el camino de adicionales ya probado, y el
"total del concepto" se deriva en la vista. Si prefieres datos más limpios y aceptas relajar el freeze, vamos por
la 2 — pero esa pelea con el criterio del profe de "congelar el original".

> Nota: el mockup muestra el **total actualizado** igual en ambas opciones; el usuario no ve la diferencia de
> modelado, solo "original + extra = total". La elección es de datos/trazabilidad, no de pantalla.

## ¿Toca zona congelada?

**Sí — `backend/src/controllers/convenios.controller.js` (congelado → requiere tu OK + PR).** Hoy ese controller:
- exige el **catálogo completo** y **rechaza** cualquier cambio a un original (409 `conceptoCongelado`, líneas ~225-235);
- solo inserta como adicional las **claves nuevas** (línea ~239).

Para B4 habría que:
- **Opción 1:** aceptar una clave derivada `es_adicional` que herede el P.U. del original (cambio acotado en la
  rama de inserción; **sin schema** si el vínculo es por convención de clave).
- **Opción 2:** permitir subir la cantidad del original bajo convenio, manteniendo P.U. y la guarda de no-reducir
  (ya existe, líneas ~188-191); más invasivo.

**Frontend** (`EditorProgramaConvenio.jsx` / `ConveniosModificatorios.jsx`): NO congelado, libre — ahí va el botón
"Ampliar", la fila hija/panel y el P.U. bloqueado del mockup.
**Schema:** no se toca en ninguna de las dos (salvo que quieras `origen_concepto_id` para el vínculo formal de la
Opción 1, que recomiendo dejar para después).

## Punto legal duro (recordatorio)
art. 59 LOPSRM: las **cantidades adicionales del mismo concepto se pagan al P.U. pactado originalmente**. Por eso el
mockup muestra el P.U. **bloqueado/heredado**, nunca como campo libre — en ambas variantes y ambas opciones de datos.

## Qué necesito de ti
1. **¿Variante A o B** del mockup?
2. **¿Opción de datos 1 (fila adicional, recomendada) u Opción 2 (delta sobre el original)?**
3. Tu **OK para tocar `convenios.controller.js`** (congelado) cuando implemente.

No programo la lógica hasta tu confirmación de estos 3 puntos.
