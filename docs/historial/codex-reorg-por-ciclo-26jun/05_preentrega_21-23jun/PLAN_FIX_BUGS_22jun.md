# Plan de corrección de bugs (22-jun) · SIGECOP

> **Encargo (Maiki):** plan + propuestas para resolver los bugs **#1, #2, #3** (+ el chico **#4**) de
> `docs/reportes/HALLAZGOS_PRUEBAS_22jun.md`. **NO se implementa nada todavía** — esto se aprueba primero.
> Para cada fix: el cambio exacto (`archivo:línea`), qué cambia, riesgo, si toca zona congelada, y cómo verificar.
> **Base:** `main = cb10b27`, LOCAL, leído del código real. **Ordenado por riesgo** (bajo → medio).

## Resumen — qué se toca y riesgo

| Fix | Qué | Riesgo | Archivos | ¿Congelado? | Esfuerzo |
|---|---|---|---|---|---|
| **#1** | Deep-link de "firmar nota" → pantalla donde sí se firma | 🟢 bajo | `NotificacionesCentro.jsx` (1 línea) | No | trivial |
| **#2** | Borrar botón redundante "Ir a registrar el pago" | 🟢 bajo | `TransitoPago.jsx` (borra 9 líneas) | No | bajo |
| **#4** | Aclarar el copy del placeholder de fotos en Avance | 🟢 muy bajo | `AmbienteAvance.jsx` (texto) | No | trivial |
| **#3** | **Gate de cierre uniforme en 10 endpoints** (contrato cerrado = solo-lectura) | 🟡 medio | `lib/gateCierre.js` (nuevo) + 6 controllers | No core; `bitacora.controller` es sensible | medio |

> **El que importa para la integridad es el #3** (va último por ser el de mayor riesgo, no por menor prioridad).
> Los tres frontend (#1/#2/#4) son cambios chicos y visibles en la demo; conviene aplicarlos juntos.

---

## 🟢 Fix #1 — Notificación de "firmar nota" lleva a una pantalla sin acción de firmar

**Qué cambia:** en `frontend/src/components/NotificacionesCentro.jsx:124`, el ítem de **nota pendiente** apunta a `/bitacora/consulta` (solo busca/exporta; no firma). La pantalla donde **sí** se firma una nota es `EmisionNotas.jsx` (ruta `/bitacora/notas`: tiene `firmarNota` + botón `btn-firmar-nota-<n>`).

**Cambio exacto (1 línea):**
```diff
  {notas.map((n) => (
-   <Item key={`nt-${n.id}`} to={`/bitacora/consulta?contrato=${n.contrato_id}`} onClick={onClose}
+   <Item key={`nt-${n.id}`} to={`/bitacora/notas?contrato=${n.contrato_id}`} onClick={onClose}
      principal={`Nota #${n.numero} — ${n.contrato_folio || 'contrato'}`}
      secundario={n.asunto || n.tipo_etiqueta || 'Bitácora · nota'} />
  ))}
```
`EmisionNotas.jsx` ya lee `?contrato=` y preselecciona el contrato (L117-122), así que el destino queda funcional.

**Mejora opcional (recomendada, bajo riesgo):** pasar también la nota exacta — `to={`/bitacora/notas?contrato=${n.contrato_id}&nota=${n.id}`}` — y en `EmisionNotas.jsx` leer `searchParams.get('nota')` para auto-expandir el libro (`setVerBitacora(true)`) y resaltar la tarjeta `nota-${n.numero}`, igual que `PorFirmar.jsx:88` resalta por `?contrato`. *(Es un add-on; el fix de 1 línea ya resuelve el bug reportado.)*

**Riesgo:** 🟢 bajo. Solo cambia un destino de navegación; no toca lógica, datos ni backend. La firma de **aperturas** (L119 → `/bitacora/por-firmar`) NO se toca.
**Zona congelada:** No (`NotificacionesCentro.jsx` es componente de presentación; no es `App.jsx`/`permisos.js`/auth).

**Verificación:**
1. Con una cuenta que sea parte del roster (residente/superintendente/supervisión) y tenga una **nota emitida por otro** pendiente de su firma → abrir la campana → grupo "Por firmar" → clic en la nota.
2. **Esperado:** aterriza en `/bitacora/notas` con el contrato preseleccionado y el botón "✓ Firmar (aceptar) nota" visible; firmar funciona (la nota sale de la lista de pendientes).
3. **Regresión:** la notificación de **apertura** sigue llevando a `/bitacora/por-firmar` y firma igual.

---

## 🟢 Fix #2 — Pago: botón "Ir a registrar el pago (HU-21)" duplica el paso 4 del wizard

**Qué cambia:** en `frontend/src/pages/TransitoPago.jsx`, el paso 3 (instrucción) pinta, tras generar la instrucción, un `LinkHU` que **saca al usuario fuera** a `/pagos/registro` (`link-registrar-pago`, L425). Eso duplica el **paso 4 embebido** (`RegistroPagoForm`, L440), al que se llega con "Siguiente →" (`btn-wsiguiente-pago`, L449). Se elimina el link redundante.

**Cambio exacto (borrar L419-427, el bloque `{instr && (...)}`):**
```diff
  {!soloLectura && !instr && (
    <div className="flex justify-end">
      <Boton disabled={!puedeGenerar} onClick={generar} data-testid="btn-generar-instruccion">💸 Generar instrucción de pago</Boton>
    </div>
  )}

- {/* Tras la instrucción, Finanzas REGISTRA el pago (HU-21) — siguiente eslabón del ciclo de cobro. */}
- {instr && (
-   <div className="mt-4 pt-3 border-t border-borde">
-     <p className="text-sm text-tinta-sec mb-2">Emitida la instrucción, Finanzas <strong>registra el pago</strong> (importe = neto, no se paga dos veces — HU-21).</p>
-     {/* NAV-C: /pagos/registro es HU-21 (contratista=null) → un <Link> crudo rebotaría al contratista.
-         LinkHU lo gatea por acceso (chip deshabilitado con motivo si el rol no puede registrar). */}
-     <LinkHU hu="HU-21" to={`/pagos/registro?contrato=${transito.estimacion.contrato_id}`} className="sg-btn-secondary inline-block" data-testid="link-registrar-pago" actor="Lo registra Finanzas.">Ir a registrar el pago (HU-21) →</LinkHU>
-   </div>
- )}
  </div>
  )}
```
**Se conservan sin tocar:** `btn-generar-instruccion` (L415, acto HU-20, distinto), el aviso de instrucción generada, el **paso 4 embebido** (`wstep-pago-registro` + `RegistroPagoForm`, L434-442) y la navegación `btn-wsiguiente-pago` (L449). **NO se borra** la ruta `/pagos/registro` ni `RegistroPago.jsx` (tienen otros enlaces vivos: `PestanasCiclo.jsx:32`, `AmbienteFiniquito.jsx:143`, `AmbientePago.jsx:151`).

> **Cuidado con el JSX:** borrar exactamente L419-427. El `</div>` (L428) y el `)}` (L429) que siguen cierran el **contenedor del paso 3** y deben quedar intactos.

**Riesgo:** 🟢 bajo. Quita un camino de navegación duplicado; el `POST /api/pagos` sigue siendo único (vía `RegistroPagoForm`), con su gate a finanzas y el no-doble-pago server-side intactos.
**Zona congelada:** No (`TransitoPago.jsx` es presentación).

**Verificación:**
1. Como **finanzas**, recorrer el wizard de tránsito a pago de una estimación autorizada: paso 1 suficiencia → 2 soportes → 3 generar instrucción → **paso 4 registra el pago** (embebido). El pago se registra y la estimación pasa a "pagada".
2. **Esperado:** en el paso 3 ya **no** aparece "Ir a registrar el pago →"; el único camino es "Siguiente →" al paso 4.
3. **Regresión / e2e:** `frontend/e2e/pago-wizard.spec.js` NO asierta sobre `link-registrar-pago` (solo sobre `btn-generar-instruccion`, `wstep-pago-registro`, `btn-registrar-pago`, `pago-solo-finanzas`) → la suite no se rompe. Correr `npx playwright test pago-wizard` para confirmar.
4. **Acceso directo:** `/pagos/registro` sigue accesible desde sus otros enlaces (PestañasCiclo / ambientes).

---

## 🟢 Fix #4 — Avance: el placeholder de fotos dice "no disponible" (parece error)

**Qué cambia:** en `frontend/src/pages/AmbienteAvance.jsx` (bloque 5, L148-157) el texto dice que la evidencia fotográfica *"no está disponible en esta versión"*, lo cual **confunde** porque la foto **sí** se sube/ve — pero **por estimación, en el Expediente** (art. 132 fr. IV RLOPSRM: las fotografías acompañan a cada estimación). Solo hay que **alinear el copy** para que no parezca un bug.

**Cambio propuesto (texto, sin lógica):** reemplazar el contenido del bloque 5 (L149-157) por algo como:
```jsx
<Bloque n={5} titulo="Evidencia fotográfica">
  <p className="text-sm text-slate-700">
    El registro fotográfico se carga y consulta <strong>por estimación, en el Expediente</strong> (HU-04):
    la ley ubica las fotografías como soporte de <strong>cada estimación</strong> (art. 132 fr. IV RLOPSRM),
    no del avance por periodo. El avance por concepto se sustenta con los números ejecutados y su nota de bitácora.
  </p>
  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 mt-3" data-testid="evidencia-placeholder">
    📷 Para subir o ver fotos, abre el <strong>Expediente</strong> del contrato → "Resumen de estimaciones" →
    botón "+ Agregar foto" en cada estimación.
  </p>
</Bloque>
```
*(Mantener el `data-testid="evidencia-placeholder"` por si algún spec lo referencia.)* Opcional: alinear también el comentario de cabecera `AmbienteAvance.jsx:25` para que no diga "no existe todavía".

**Riesgo:** 🟢 muy bajo. Solo texto; no cambia comportamiento. **Zona congelada:** No.
**Verificación:** abrir el ambiente de Avance → bloque 5 muestra el texto nuevo (apunta al Expediente, sin "no disponible"); confirmar que la subida real en **Expediente → Resumen de estimaciones → "+ Agregar foto"** sigue funcionando (no se tocó). `npx playwright test` no debe romperse (el testid se conserva).

---

## 🟡 Fix #3 — EL GRAVE: un contrato cerrado (finiquito) debe ser SOLO-LECTURA

**Problema:** el gate de cierre (`contratos.estado === 'cerrado'`) solo está en el ciclo de **estimación/pago**. Faltan **10 endpoints** que siguen mutando un contrato finiquitado: nota, minuta, visita, avance, corregir-avance, convenio (crear/autorizar), garantía, endoso y sustitución de roster.

**Fundamento legal (🟢 verbatim, `lopsrm_utf8.txt` art. 64 último párrafo):**
> *"Determinado el saldo total, la dependencia o entidad pondrá a disposición del contratista el pago correspondiente… debiendo, en forma simultánea, **levantar el acta administrativa que dé por extinguidos los derechos y obligaciones** asumidos por ambas partes en el contrato."*

Extinguidos los derechos/obligaciones → **no caben actos nuevos**. Reforzado por arts. 168/170/172 RLOPSRM (el saldo y el ejecutado quedan fijados en el finiquito). **[validar]:** la fracción exacta del art. 170 que cita el código del finiquito no se verificó verbatim — confirmar al integrar.

### 3.1 — El helper (archivo NUEVO, aditivo): `backend/src/lib/gateCierre.js`

**Decisión de diseño (a aprobar):** propongo un **predicado**, NO un `assertContratoAbierto` que lance excepción. Razón: estos endpoints envuelven todo en `try { … } catch (err) { 500 }`; un `throw` desde un "assert" caería en ese `catch` y devolvería **500**, no el **409** que queremos. El patrón que **ya funciona** en el repo es el de `estimaciones-ciclo.controller.js::gateContratoCerrado` (devuelve booleano y el caller decide). Lo generalizo:

```js
// backend/src/lib/gateCierre.js — Gate de cierre transversal (art. 64 LOPSRM / 170 RLOPSRM).
// Un contrato 'cerrado' (finiquito elaborado) es SOLO-LECTURA: el art. 64 declara "extinguidos los
// derechos y obligaciones". Predicado (NO lanza): cada caller hace ROLLBACK (si está en transacción) + 409.
// `db` admite el pool o el client de una transacción → sirve igual en endpoints tx y no-tx.
const { pool } = require('../db/pool');

async function contratoCerrado(db, contratoId) {
  const r = await db.query('SELECT estado FROM contratos WHERE id = $1', [contratoId]);
  return r.rowCount > 0 && r.rows[0].estado === 'cerrado';
}
function msgCerrado(accion) {
  return `El contrato ya está cerrado (finiquito elaborado); ${accion}. El saldo se liquida por el finiquito (art. 64 LOPSRM).`;
}
module.exports = { contratoCerrado, msgCerrado };
```

**Por qué un SELECT propio (y no leer el `estado` de los SELECT que ya hacen los endpoints):** así **no se altera el shape** de ninguna consulta/loader compartido (varios `getContrato` los usan también las pantallas de lectura) → menor superficie de error. El SELECT extra es por PK (índice primario): costo despreciable. *(Alternativa válida si prefieres cero queries extra: añadir `estado`/`c.estado AS contrato_estado` al SELECT que cada endpoint ya hace y checar inline; lo indico por endpoint abajo. Recomiendo el helper por uniformidad.)*

> **Solo AGREGA un candado.** En ningún endpoint se cambia otra lógica: el gate es un `if (cerrado) → 409` colocado **después** de las validaciones de existencia (404) y autoría (403) ya existentes, y **antes** de la mutación.

### 3.2 — Los 10 endpoints (punto de inserción exacto)

| # | Acción | `archivo:función` | ¿Tx? | `contratoId` disponible | Insertar el gate… |
|---|---|---|:---:|---|---|
| 1 | Emitir nota | `bitacora.controller.js::emitirNota` (L541) | Sí (`client`) | `apertura.contrato_id` (de `cargarAperturaYRol`, L398) | tras el check `rolEnContrato` (L560) |
| 2 | Crear minuta | `minutas.controller.js::crearMinuta` (L50) | No (`pool`) | `id` (param) | tras `puedeRegistrar` (L56) |
| 3 | Crear visita | `minutas.controller.js::crearVisita` (L147) | No (`pool`) | `id` (param) | tras `puedeRegistrar` (L153) |
| 4 | Registrar avance | `trabajos.controller.js::registrarAvance` (L213) | Sí (`client`) | `concepto.contrato_id` | tras `esParteOSupervision` (L247) |
| 5 | Corregir avance | `trabajos.controller.js::corregirAvance` (L330) | Sí (`client`) | `concepto.contrato_id` | tras `esParteOSupervision` (L359) |
| 6 | Crear convenio | `convenios.controller.js::crearConvenio` (L114) | Sí (`client`) | `contratoId` (param) | tras el check `puede` (L152) |
| 7 | Autorizar convenio | `convenios.controller.js::autorizarConvenio` (L335) | Sí (`client`) | `conv.contrato_id` *(añadir `cm.contrato_id` al SELECT L346)* | tras `conv.estado !== 'registrado'` (L353) |
| 8 | Crear garantía | `garantias.controller.js::crearGarantia` (L80) | No (`pool`) | `id` (param) | tras `puedeGestionar` (L86) |
| 9 | Registrar endoso | `garantias.controller.js::registrarEndoso` (L132) | No (`pool`) | `g.contrato_id` (de `getGarantiaConContrato`) | tras `puedeGestionar` (L138) |
| 10 | Sustituir roster | `roster.controller.js::sustituirPersona` (L88) | Sí (`client`) | `contratoId` (param) | tras el check `puede` (L124) |

**Snippet para endpoints NO transaccionales** (minutas crear/visita, garantías crear/endoso) — `pool`:
```js
const { contratoCerrado, msgCerrado } = require('../lib/gateCierre');
// … tras el 404 (contrato/garantía no encontrada) y el 403 (autoría):
if (await contratoCerrado(pool, id /* o g.contrato_id */)) {
  return res.status(409).json({ error: msgCerrado('no se registran minutas') }); // ajustar el texto de la acción
}
```

**Snippet para endpoints transaccionales** (emitirNota, registrar/corregir avance, crear/autorizar convenio, sustituir roster) — `client`, hay que `ROLLBACK` antes del 409:
```js
const { contratoCerrado, msgCerrado } = require('../lib/gateCierre');
// … dentro del BEGIN, tras cargar el contrato/concepto/apertura y sus checks 404/403:
if (await contratoCerrado(client, apertura.contrato_id /* o concepto.contrato_id / contratoId / conv.contrato_id */)) {
  await client.query('ROLLBACK');
  return res.status(409).json({ error: msgCerrado('no se emiten notas') }); // ajustar el texto de la acción
}
```
Textos de acción sugeridos por endpoint: `'no se emiten notas'`, `'no se registran minutas'`, `'no se agendan visitas'`, `'no se registra avance'`, `'no se corrige avance'`, `'no se registran convenios'`, `'no se autorizan convenios'`, `'no se registran garantías'`, `'no se registran endosos'`, `'no se sustituyen personas del roster'`.

> **Nota para #7 (autorizarConvenio):** su SELECT (L346-349) no trae `cm.contrato_id`; añadir `cm.contrato_id` a la lista del SELECT (cambio mínimo) para tener el id, o llamar `contratoCerrado(client, …)` con un id obtenido aparte. Es el único endpoint que necesita tocar su SELECT.

### 3.3 — La EXCEPCIÓN legítima: el pago NO se bloquea

**`pagos.controller.js::registrarPago` (L24) — NO se le agrega el gate.** Confirmado en el código:
- Ya exige estimación **`autorizada`** (L72, art. 54) y no-doble-pago (L73-74).
- `finiquito.controller.js::calcularFiniquito` (L33-54) **suma el neto de estimaciones `('autorizada','pagada')` y resta lo pagado** → una estimación autorizada **antes** del cierre, aún sin pagar, queda como **saldo a favor del contratista en el propio finiquito**.
- El art. 64 manda *"poner a disposición del contratista el pago correspondiente"*: concretar ese pago **cumple** el finiquito, no es una mutación nueva.

→ Pagar una estimación **autorizada antes del cierre** debe **seguir permitiéndose**. (No se puede colar una estimación nueva porque integrar/presentar/autorizar **sí** están gateados en el ciclo.) Decisión de alcance final: tú/profe.

### 3.4 — Zona congelada

Ninguno de los 10 endpoints está en la lista **congelada-core** de `CLAUDE.md` (auth, usuarios, contratos, estimaciones). Detalle:
- `minutas`, `garantias`, `trabajos`, `convenios`, `roster` → **no congelados**.
- `bitacora.controller.js` (emitirNota) → **no está en la lista congelada, pero es SENSIBLE** (núcleo de inmutabilidad/folio atómico). El cambio es aditivo (un `if` + 409 antes de `insertarNotaAtomica`), pero **márcalo para tu revisión** antes de tocarlo.
- `lib/gateCierre.js` es **archivo nuevo** (aditivo).
- `estimaciones.controller.js` (integrar) ya tiene el gate inline — **no se toca** (es congelado-core).

> **TOCTOU (limitación menor, conocida):** hay una ventana mínima entre el `SELECT estado` y la mutación. Como el finiquito es un acto deliberado y único, y los triggers ya blindan lo previo, la pre-comprobación basta. Si quieres rigor absoluto, en los endpoints transaccionales se puede leer con `FOR UPDATE` la fila del contrato (varios ya la bloquean: `crearConvenio`/`roster` hacen `FOR UPDATE`). No es necesario para Etapa 1.

### 3.5 — Cómo verificar (cada endpoint)

**Preparación:** elegir dos contratos del seed — uno que vas a **cerrar** y otro **abierto** (p. ej. `PRUEBA-HU-24` y `PRUEBA-HU-08`). Cerrar el primero elaborando su **finiquito** (`finiquito.controller` → `estado='cerrado'`).

**Prueba A (contrato CERRADO → rechaza, 409):** intentar **cada** una de las 10 acciones sobre el contrato cerrado (por UI o API). **Esperado:** `409` con el mensaje de `msgCerrado(...)` en las 10.

**Prueba B (contrato ABIERTO → sigue permitiendo):** las **mismas** 10 acciones sobre el contrato abierto. **Esperado:** funcionan igual que hoy (201/200), sin regresión.

**Prueba C (la excepción del pago):** en un contrato **cerrado** que tenga una estimación **autorizada antes del cierre** sin pagar → registrar el pago. **Esperado:** **se permite** (201, estimación → 'pagada'); el finiquito ya la contemplaba como saldo.

**Prueba D (regresión del ciclo ya gateado):** integrar/presentar/autorizar/pagar-instrucción sobre el contrato cerrado → siguen dando **409** como hoy (no se rompe lo existente).

**Smoke automatizado:** `cd frontend && npx playwright test` (stack local arriba) — objetivo: que la suite siga **verde** (estos gates solo añaden un 409 en un estado que los specs normales no ejercen). Si algún spec siembra acciones sobre un contrato que termina cerrado, ajustarlo.

---

## Orden de ejecución sugerido (cuando lo apruebes)

1. **#1, #2, #4** (frontend, riesgo bajo) en una pasada → correr `npx playwright test` + `vite build`.
2. **#3** (backend): primero `lib/gateCierre.js`, luego los **9 endpoints no-sensibles** (minutas, garantías, trabajos, convenios, roster), probar A/B/C/D; al final el **#1 emitirNota** (`bitacora`, sensible) con tu visto bueno. Reiniciar backend tras editar (`docker restart sigecop_backend`).
3. Smoke completo + actualizar `ESTADO_ACTUAL.md` (zona congelada/§7) y, si quieres, una HU/nota de la regla "contrato cerrado = solo-lectura".

## Qué NO se toca (invariantes)
- `permisos.js`, `App.jsx`, `auth`, `schema.sql`, `server.js`, `pool.js`, `lib/acceso.js` → **intactos**.
- Lógica existente de cada endpoint → **intacta**; el #3 solo **agrega** un `if (cerrado) → 409`.
- Ruta `/pagos/registro` y `RegistroPago.jsx` → **se conservan** (#2).
- El **pago** de estimaciones autorizadas antes del cierre → **se conserva** (#3, excepción).

> **No implementé nada.** Apruébalo (o ajústalo) y procedo a ejecutarlo en el orden de arriba, LOCAL y sin push.
> Único **[validar]** abierto: la fracción exacta del **art. 170 RLOPSRM** citada en el mensaje del gate.
