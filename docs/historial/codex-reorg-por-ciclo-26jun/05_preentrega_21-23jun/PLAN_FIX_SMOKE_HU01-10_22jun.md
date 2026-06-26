# Plan de fix — 4 bugs de HU-01 a HU-10 (22-jun) · SIGECOP

> **Origen:** `docs/reportes/HALLAZGOS_SMOKE_HU01-10_22jun.md`.
> **Encargo (Maiki):** plan exacto por bug (archivo:línea, qué cambia, riesgo, zona congelada, cómo verificar). **NO aplicar** hasta tu OK.
> **Base:** `main = cb10b27`, LOCAL. Stack arriba (verificación viva solo-lectura).

## Resumen

| Bug | Fix | Zona congelada | Riesgo | Esfuerzo |
|---|---|---|---|---|
| **P23** 🔴 convenio/avance sin bitácora | Gate "exige bitácora abierta" (409 + redirect) — copia el patrón de "atraso" | **No** | bajo | bajo |
| **P4** 🟡 100M días → 500 | Cota máxima de plazo → 400 claro + mapear codes de fecha PG | **No** | bajo | bajo |
| **P5** 🟡 financiero 0% en la curva | Corte del periodo terminal = hoy (solo graficación) | **No** | muy bajo | trivial |
| **P1** ⚠️ garantía dup por mayúsculas | Alinear keys en el frontend del alta + normalizar en HU-02 + sanear datos | **No** (recomendado) / Sí (opcional) | bajo | bajo |

> **Los 4 fixes recomendados quedan FUERA de zona congelada.** Para P1 hay una variante de blindaje que sí toca congelado; la dejo como opcional y **recomiendo NO usarla**.

---

## 🔴 P23 — Convenio y avance deben EXIGIR bitácora abierta

**Qué cambia:** hoy `crearConvenio` y `registrarAvance`/`corregirAvance`, si no hay bitácora abierta, **no bloquean** y difieren la nota. El profe lo pidió explícito (audio 21-jun): *"no se puede integrar un convenio modificatorio si no está abierta la bitácora… que te redireccione primero a abrir bitácora"* / avance *"que no deje hacer esto a menos de que la bitácora ya está abierta"* (art. 122 RLOPSRM: *"El uso de la Bitácora es obligatorio"*).

**Patrón a copiar — ya existe en "atraso"** (`alertas.controller.js:207-212`):
```js
const bit = await client.query('SELECT id FROM bitacora_aperturas WHERE contrato_id = $1', [contratoId]);
if (bit.rowCount === 0) {
  await client.query('ROLLBACK');
  return res.status(409).json({ error: 'El contrato no tiene bitácora abierta; ábrela para asentar … (art. 123 RLOPSRM).' });
}
```

**Endpoints que toca (todos NO congelados):**
- `backend/src/controllers/convenios.controller.js::crearConvenio`
- `backend/src/controllers/trabajos.controller.js::registrarAvance` y `::corregirAvance`
- (Frontend) `ConveniosModificatorios.jsx` / `EditorProgramaConvenio` y `TrabajosTerminados.jsx`

**Fix exacto — CONVENIO (`crearConvenio`):**
1. **Gate temprano:** justo después del check de autoría `puede` (`convenios.controller.js:152`, junto al gate de cierre que ya agregamos), añadir:
```js
const bitOK = await client.query('SELECT id FROM bitacora_aperturas WHERE contrato_id = $1', [contratoId]);
if (bitOK.rowCount === 0) {
  await client.query('ROLLBACK');
  return res.status(409).json({ error: 'El contrato no tiene bitácora abierta; ábrela primero para registrar el convenio (art. 122 RLOPSRM).' });
}
```
   *(Temprano = falla antes de mutar el catálogo; todo en la misma tx, ROLLBACK limpio.)*
2. **Quitar la rama diferida:** en `:248-260` la nota se asienta **siempre** (`bit.rowCount` ya nunca es 0); quitar `nota_diferida:true` del response (`:298-312`).
3. **Limpiar código muerto:** borrar el barrido de convenios de `abrirBitacora` (`bitacora.controller.js:253-273`), que ya no aplicará.

**Fix exacto — AVANCE (`registrarAvance`):** tras el check `esParteOSupervision` (`trabajos.controller.js:247`, junto al gate de cierre):
```js
const bitId = await bitacoraAbiertaId(client, concepto.contrato_id);
if (!bitId) {
  await client.query('ROLLBACK');
  return res.status(409).json({ error: 'El contrato no tiene bitácora abierta; ábrela para registrar el avance (art. 122 RLOPSRM).' });
}
```
   Igual en `corregirAvance` (tras su `esParteOSupervision`, ~`:359`). La nota se asienta **siempre** (`:280` ya tiene `bitId`); borrar el barrido de avances de `abrirBitacora` (`:227-246`) y el `nota_diferida` del response.

**Frontend (lo que pidió el profe, "redireccióname"):** si la bitácora no está abierta, deshabilitar el botón de registrar + aviso con enlace a `/bitacora/apertura?contrato=…`. *(Detecta el estado con un GET de bitácora del contrato que ya existe.)*

**¿Aditivo?** Sí: el cambio **agrega** un 409 antes de mutar; el resto de la lógica (cuadre, versionado, nota) queda igual, solo que la nota se asienta siempre (en vez de diferirse). El borrado de los barridos es limpieza de código que ya no se ejecuta.

### Resolución del [validar] — ¿sustitución y estimación también?
- **Sustitución de roster** (`roster.controller.js::sustituirPersona`): **RECOMIENDO exigir bitácora también.** Misma lógica del profe + ley: el art. 125 fr. I g) RLOPSRM manda que el residente **registre la sustitución en la bitácora** → sin bitácora no hay dónde registrarla. Hoy difiere igual que avance/convenio. Mismo patrón. **Pero el profe NO la nombró → márcalo `[validar]`** y aplícalo en la misma tanda si lo apruebas (riesgo bajo, consistente).
- **Estimación presentar/autorizar** (`estimaciones-ciclo.controller.js`): **RECOMIENDO NO bloquear (por ahora).** Hoy es "atómico-o-omite": sin bitácora, la transición del ciclo de cobro **procede** y la nota simplemente no se asienta (no difiere, no bloquea). Bloquear el **ciclo de cobro** (art. 54) sobre la bitácora es más invasivo y el profe no lo mencionó. **`[validar]`**: si el profe lo quiere, conviene **diferir** la nota (como avance/convenio antes) en vez de omitirla, no bloquear el cobro. Decisión tuya/del profe.

**Cómo verificar (smoke, como el de los 10 endpoints):**
1. Contrato **sin** bitácora abierta → intentar crear convenio / registrar avance → **409** con el mensaje art. 122.
2. Mismo contrato, **abrir bitácora** → repetir → **201** y la nota queda asentada (no diferida).
3. Front: con bitácora cerrada, el botón está deshabilitado + enlace a abrir bitácora.
4. Regresión: `npx playwright test hu-03-convenios hu-06` (ajustar specs que asumían el diferido). Atraso sigue igual (ya exigía bitácora).

---

## 🟡 P4 — Plazo gigantesco (~100M días) → 500

**Qué cambia:** `convenios.controller.js:124` valida `plazo_nuevo_dias` solo como `> 0` (sin cota superior). En `:199` se calcula `new Date(fecha_inicio + (plazo-1)·86400000).toISOString()`; con ~100M días el `Date` de JS desborda (±8.64e15 ms) → `RangeError` → catch externo → 500.

**Ley:** **no hay tope numérico de plazo** (art. 59 / 59 Bis: el 50% es disparador de ajuste de costos, no un cap — verificado verbatim). → la cota máxima es **criterio de diseño**.

**Fix exacto (`convenios.controller.js`, NO congelado):**
1. Cota máxima junto a la validación de `:124` (o en `:131` donde se valida `tocaPlazo && plazoNuevo == null`):
```js
const PLAZO_MAX_DIAS = 36500; // ~100 años: holgado para cualquier obra real (criterio de diseño, sin tope legal)
if (plazoNuevo != null && plazoNuevo > PLAZO_MAX_DIAS) {
  return res.status(400).json({ error: `El plazo del convenio (${plazoNuevo} días) excede el máximo permitido (${PLAZO_MAX_DIAS} días ≈ 100 años); revisa el dato.` });
}
```
   *(Va antes del `pool.connect()`/BEGIN, como las demás validaciones de forma; no necesita tx.)*
2. **Red de seguridad** (defensa en profundidad): ampliar el catch interno (`:316-318`) para mapear codes de overflow de fecha de PostgreSQL (`22007` invalid_datetime_format / `22008` datetime_field_overflow) a **400**, igual que ya hace con `22003` para el monto.

**Tope propuesto y justificación:** **36,500 días (~100 años).** Ninguna obra pública real se acerca; es absurdo-seguro (rechaza el 100M y cualquier dato erróneo) y queda lejísimos del quiebre técnico (JS Date ≈ 99.9M días, PG DATE ≈ 3.65M días). Si prefieres más holgado/estricto es un número, no ley → **`[validar]`** contigo. El profe ya pidió justo esto: *"que mejor ponga algo como excediste muchos días."*

**Zona congelada:** No. **Riesgo:** bajo (solo agrega una validación de entrada + un mapeo de error).

**Cómo verificar:** convenio de plazo con `plazo_nuevo_dias = 100000000` → **400** *"excede el máximo…"* (no 500); con `120` → registra normal (201 + aviso si aplica); con `36501` → 400; con `36500` → 201.

---

## 🟡 P5 — El financiero de la curva sale 0% (bug de graficación, no de cálculo)

**Qué cambia:** el financiero canónico es correcto (`Σ pagos / monto`); el bug está en `CurvaAvance.jsx:298`:
```js
const cutoff = dISO(p.fin) <= hoy ? dISO(p.fin) : hoy;  // periodo en curso: corta en hoy
```
Cuando **todo el programa ya venció** (no hay periodo "en curso"), cada periodo corta en su `fin`, y un pago **posterior al fin del último periodo** (normal: el pago llega hasta 20 días tras autorizar, art. 54) **cae fuera de toda ventana** → la serie financiera y el KPI "Financiero a hoy" salen 0% pese al 20.85%/69.50% real.

**Fix exacto (`CurvaAvance.jsx`, FRONTEND, NO congelado, NO toca el cálculo):** que el **periodo terminal** acumule todos los pagos hasta hoy. En el `for` del `financieroMap` (`:296-301`), para el último periodo usar `hoy` como corte:
```js
const esUltimo = p.numero === periodosAll[periodosAll.length - 1].numero;
const cutoff = esUltimo ? hoy : (dISO(p.fin) <= hoy ? dISO(p.fin) : hoy);
```
   Así el último punto financiero = `Σ pagos ≤ hoy / monto` = el canónico, aunque el pago sea posterior al fin del programa. **No toca backend ni el cálculo canónico** (`estimacion-prep`/`portafolio` siguen igual).

**Zona congelada:** No. **Riesgo:** muy bajo (un solo `cutoff` del punto terminal).

**Cómo verificar:** abrir la curva de PRUEBA-HU-04 (pago $208,500, posterior al fin del programa) → el KPI "Financiero a hoy" y el último punto de la serie financiera deben marcar **20.85%** (hoy marcan 0%); HU-24 → **69.50%**. Añadir un e2e en `hu-05-curva-avance.spec.js` con pago posterior al fin del programa. **`[validar]` UX:** ¿extender el eje X más allá del programa cuando hay pagos posteriores, o solo corregir el punto/KPI? Lo mínimo es que el KPI deje de marcar 0%.

---

## ⚠️ P1 — Garantía duplicada por mayúsculas (recomendación SIN tocar schema)

**Qué cambia:** el `UNIQUE(contrato_id, tipo)` es case-sensitive; el alta graba **`'Cumplimiento'`** (`AltaContrato.jsx:88-90`) y HU-02 graba **`'cumplimiento'`** (`RegistroFianzas.jsx:14-18`) → no colisionan, y HU-02 no filtra el legacy capitalizado → deja grabar el segundo. *(El insert del alta `contratos.controller.js:430` es **zona congelada**; por eso el fix ataca el ORIGEN en el frontend.)*

**Fix RECOMENDADO (todo FUERA de zona congelada):**
1. **Frontend — alinear las keys del alta** (`AltaContrato.jsx:88-90`): que `TIPOS_GARANTIA` use las **mismas keys canónicas** que HU-02 (`cumplimiento` / `anticipo` / `vicios_ocultos` / `otra`), con su label para mostrar. Así el alta **manda la key canónica** y el `UNIQUE` muerde igual que en HU-02. *(Elimina el mismatch en el origen; no toca `contratos.controller`.)*
2. **Defensa backend HU-02** (`garantias.controller.js:97`, NO congelado): normalizar `tipo` a minúsculas/slug antes del INSERT, por si un cliente manda variantes:
```js
const tipo = String(b.tipo).trim().toLowerCase().replace(/\s+/g, '_'); // 'Vicios ocultos' -> 'vicios_ocultos'
```
3. **Saneamiento de datos** (una vez, sin schema): `UPDATE contrato_garantias SET tipo = lower(replace(tipo,' ','_')) WHERE tipo <> lower(replace(tipo,' ','_'));` *(en la BD viva hoy ya están en minúsculas → 0 filas; aplica si en Render hubiera capitalizados).*

**Por qué SIN tocar schema basta (mi recomendación):** los puntos de inserción de garantías son **dos** (alta + HU-02). Alineando la key en el alta (frontend) y normalizando en HU-02 (backend no congelado), ambos escriben la misma forma canónica y el `UNIQUE` existente ya los rechaza. **Es igual de robusto en la práctica** y evita la zona congelada. *(El insert congelado `contratos.controller.js:430` ni se toca: solo persiste lo que el frontend ya manda canónico.)*

**Variante de blindaje (OPCIONAL, ZONA CONGELADA — recomiendo NO usarla):** índice único funcional sobre `lower(tipo)`. Script aparte (aditivo, idempotente), **solo si quieres "cinturón y tirantes"** contra futuras vías de inserción:
```sql
-- backend/scripts/migracion_garantias_tipo_lower.sql  (ZONA CONGELADA: schema.sql, lo integras tú)
DROP INDEX IF EXISTS contrato_garantias_contrato_id_tipo_key;  -- el UNIQUE actual es case-sensitive
CREATE UNIQUE INDEX IF NOT EXISTS uq_contrato_garantias_tipo_norm
  ON contrato_garantias (contrato_id, lower(replace(tipo,' ','_')));
```
   ⚠️ Requiere datos ya saneados (paso 3) o el índice falla por duplicados. **Recomendación: NO aplicarlo**; con 1+2+3 queda cerrado y fuera de congelado.

**Zona congelada:** **No** (fix recomendado). Sí (variante opcional del índice). **Riesgo:** bajo.

**Cómo verificar:** dar de alta un contrato por la UI (alta) → la garantía de cumplimiento queda como `'cumplimiento'` (no `'Cumplimiento'`); ir a HU-02 → "Cumplimiento" ya **no** aparece como tipo disponible (está filtrado) → no se puede agregar un segundo; intentar por API un 2º `tipo` variante → 409. `SELECT contrato_id,tipo,count(*) … HAVING count(*)>1` → 0 filas.

---

## Orden sugerido (cuando lo apruebes)
1. **P5** (frontend, trivial, sin riesgo) + **P1 paso 1** (frontend keys).
2. **P4** (backend, validación de entrada).
3. **P23** (backend gate + frontend redirect; el de mayor valor — lo pidió el profe) + decisión del `[validar]` (sustitución sí / estimación no, salvo que el profe diga).
4. **P1 paso 2-3** (normalizar HU-02 + sanear datos).
5. Smoke por bug + `npx playwright test` de los specs afectados + `vite build`. Backend no auto-recarga → `docker restart sigecop_backend`.

> **Nada de esto está aplicado.** Apruébalo (o ajústalo) y lo ejecuto LOCAL sin push, con su smoke como en las tandas anteriores.
> **`[validar]` pendientes:** (a) ¿sustitución y/o estimación también exigen bitácora? (recomiendo: sustitución sí, estimación no); (b) valor del tope de plazo (36500 días); (c) UX de la curva (extender eje X o solo el KPI).
