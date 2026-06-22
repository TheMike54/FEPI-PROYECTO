# Hallazgos de pruebas — diagnóstico + resolución legal (22-jun) · SIGECOP

> **Encargo (Maiki, 22-jun):** probando salieron errores y dudas. Diagnóstico (causa raíz `archivo:línea` + fix
> propuesto) de 4 bugs + verificación del registro fotográfico + resolución **con base en la ley** de 3 puntos.
> **NO se cambió código** — solo diagnóstico y resolución; Maiki revisa y decide qué se aplica.
> **Base:** `main = cb10b27`, LOCAL. Código y ley leídos de fuente real (`docs/legal/*.txt`, `LFD.pdf`), no de memoria.

## Método y verificación
- **Bugs:** cada uno se reprodujo contra el código real, con causa raíz `archivo:línea` exacta y fix propuesto (sin implementar).
- **Resoluciones legales (5-7):** si la ley resuelve → cita **artículo+fracción verbatim** (🟢 alta certeza); si no → criterio de diseño explicado (🟡). **No se inventan citas.**
- **Doble pasada:** analista + **verificador adversarial** que re-buscó cada cita en el texto literal. Todas las citas de este doc están **confirmadas verbatim**; donde un análisis unió párrafos no contiguos, se citan separados.
- **Corrección de anclaje:** las funciones de la **supervisión** son el **art. 115 RLOPSRM** (no el 116; el 116 es "supervisión por terceros"). El residente es el 113.

## Resumen ejecutivo

| # | Hallazgo | 🔴🟡🟢 | ¿Bug? | Base | Esfuerzo | ¿Congelado? |
|---|---|---|---|---|---|---|
| 1 | Notif. "firmar nota" lleva a Consultar (no se firma) | 🟡 | Sí | ruteo | bajo (1 línea) | No |
| 2 | Pago: botón "Ir a registrar pago" duplica el paso 4 | 🟡 | Sí | UX | bajo | No |
| 3 | **Contrato cerrado sigue aceptando nota/minuta/avance/convenio/garantía/roster** | **🔴** | Sí | art. 64 LOPSRM | medio (11 endpoints) | Parcial |
| 4 | Registro fotográfico: solo en Expediente, NO en Avance ni wizard | 🟡 | Parcial | art. 132 fr. IV RLOPSRM | bajo | No |
| 5 | Acotamiento por empresa (solicitudes/alta/roster) | 🟡 | — | criterio | medio | Sí (a/b) |
| 6 | Minutas/visitas → ¿nota automática? | 🟢 | — | art. 115 fr. VIII RLOPSRM | medio | No |
| 7 | Responsable de visita → ¿ligado a supervisión? | 🟡 | — | criterio (art. 53/114/115) | bajo | No |

### Orden recomendado antes del 24
1. **🔴 #3** (integridad + ley: un contrato finiquitado debe ser solo-lectura) — es el más serio.
2. **🟡 #1** y **🟡 #2** (un cambio chico cada uno, visibles en la demo).
3. **🟡 #4** (aclarar el copy + decidir alcance; importante: hoy NO funciona en Avance ni en el wizard, contra lo que se creía).
4. **🟢 #6** (la nota automática de minuta de junta tiene base legal dura; es lo que pidió el profe "todo tiene nota").
5. **🟡 #7** (input libre → selector; cambio chico).
6. **🟡 #5** (mayormente "no agregar acotamientos sin base legal"; **NO** forzar misma-empresa en el alta — sería error legal).

---

# BUGS

## 🟡 Bug 1 — La notificación "firmar nota" lleva a Consultar notas (donde no se puede firmar)

**Confirmado.** Bug de **ruteo**, no de funcionalidad.

**Estado actual:** el Centro de notificaciones (`frontend/src/components/NotificacionesCentro.jsx`, abierto por la campana de `AppShell.jsx:440`) pinta el grupo "Por firmar" con dos tipos de ítem:
- **Aperturas** (`NotificacionesCentro.jsx:119`) → `/bitacora/por-firmar` ✅ correcto (`PorFirmar.jsx` firma aperturas con `api.firmarApertura`).
- **Notas** (`NotificacionesCentro.jsx:124`) → **`/bitacora/consulta`** ❌ = `ConsultaNotas.jsx`, pantalla que **solo busca/exporta/imprime**; **no tiene acción de firmar**.

**Causa raíz:** `NotificacionesCentro.jsx:124` — el `to` de la nota vale `/bitacora/consulta?contrato=${n.contrato_id}`. La pantalla donde **sí** se firma una nota es **`EmisionNotas.jsx`** (ruta `/bitacora/notas`, `App.jsx:86`): ahí está `firmarNota` (`EmisionNotas.jsx:178` → `api.firmarNota` → `POST /api/bitacora/notas/:notaId/firmar`, `bitacora.controller.js:879`) y el botón **"✓ Firmar (aceptar) nota"** (`btn-firmar-nota-${n.numero}`, `EmisionNotas.jsx:237`), que se muestra justo a la población que devuelve `/api/notas-pendientes`. **La UI de firma de nota SÍ existe** (no es un hueco mayor; mi hipótesis inicial se descarta).

**Fundamento:** art. 123 fr. III RLOPSRM (las notas *"se tendrán por aceptadas una vez vencido el plazo"*) — la notificación tiene ventana de tiempo; por eso importa que el enlace lleve a donde se pueda firmar antes de que venza. Es contexto, no base legal del bug.

**Fix propuesto (no implementado):**
- **Mínimo (1 línea, no congelado):** en `NotificacionesCentro.jsx:124` cambiar el `to` a **`/bitacora/notas?contrato=${n.contrato_id}`** (`EmisionNotas` ya lee `?contrato=` y preselecciona el contrato).
- **Mejora opcional (bajo):** pasar también `&nota=${n.id}` y que `EmisionNotas` lo lea para auto-expandir el libro (`setVerBitacora(true)`) y resaltar la tarjeta `nota-${n.numero}`, igual que `PorFirmar.jsx:88` resalta por `?contrato`. Así el deep-link cae sobre la nota exacta.

---

## 🟡 Bug 2 — Pago: el botón "Ir a registrar el pago (HU-21)" duplica el paso 4 del wizard

**Confirmado.** De los tres botones que conviven, **solo uno es redundante**.

**Estado actual:** el wizard de tránsito a pago tiene 4 pasos (`TransitoPago.jsx:110-116`). En el **paso 3** ("Instrucción") aparecen:
- `btn-generar-instruccion` (`TransitoPago.jsx:415`) — **NO redundante**: genera la instrucción de pago (HU-20, art. 54).
- `link-registrar-pago` "Ir a registrar el pago (HU-21) →" (`TransitoPago.jsx:425`) — **REDUNDANTE**: `LinkHU` que **navega FUERA** a `/pagos/registro` (página suelta), obligando a re-seleccionar contrato/estimación.

El **paso 4** (`TransitoPago.jsx:434-442`) **embebe** `RegistroPagoForm` (única fuente del `POST /api/pagos`), al que se llega con `btn-wsiguiente-pago` "Siguiente →" (`:449`). Es decir: el registro ya vive dentro del wizard; el link del paso 3 es un **remanente** del diseño previo (antes de F6, cuando el registro solo vivía en `/pagos/registro`).

**Fix propuesto (no implementado):**
- **Eliminar** el bloque `{instr && (...)}` de `TransitoPago.jsx:420-427` que contiene el `link-registrar-pago` (`:425`).
- **Conservar:** `btn-generar-instruccion` (`:415`, acto HU-20 distinto), `btn-wsiguiente-pago` (`:449`, navegación legítima) y el paso 4 embebido.
- **NO** eliminar la ruta `/pagos/registro` ni `RegistroPago.jsx`: siguen siendo el **acceso directo de Finanzas** y tienen otros enlaces vivos (`PestanasCiclo.jsx:32`, `AmbienteFiniquito.jsx:143`, `AmbientePago.jsx:151`).
- **No rompe e2e:** `pago-wizard.spec.js` no asierta sobre `link-registrar-pago` (solo sobre los que se conservan). Gating a finanzas intacto (`soloLectura={rol!=='finanzas'}` + `requireRole('finanzas')` server-side).

> Confirmas tu intuición: dejar **solo el flujo del wizard** (1 suficiencia → 2 soportes → 3 instrucción → 4 registro).

---

## 🔴 Bug 3 — Un contrato cerrado (finiquito) sigue aceptando notas, minutas, avances, convenios, garantías y sustituciones

**Confirmado y es el más serio.** El gate de cierre solo blinda el ciclo de estimación/pago; **todo lo demás sigue abierto** tras el finiquito.

**Estado actual:** el finiquito cierra el contrato (`finiquito.controller.js:154`: `UPDATE contratos SET estado='cerrado'`). El gate `gateContratoCerrado` **existe y bloquea**, pero **solo** en: `estimaciones-ciclo.controller.js` (×7: presentar/observar/eliminar-obs/turnar/autorizar/rechazar/reingresar), `estimaciones.controller.js` (integrar, `:126`), `instruccion-pago.controller.js` (soportes `:234`, instrucción `:267`). **La cadena `'cerrado'` aparece SOLO en esos 4 archivos.**

**Causa raíz:** el gate "FIX 1.1" se construyó como **helper local del dominio estimación/pago** (`estimaciones-ciclo.controller.js:27`), no como gate **transversal**. Ningún otro controller mutante carga el `estado` del contrato ni lo valida → tras `'cerrado'` siguen abiertas todas las demás vías de creación.

**Barrido completo — acciones disponibles tras cerrar:**

| Acción | Endpoint (`archivo:función`) | ¿gateado hoy? | ¿debe bloquear? |
|---|---|:---:|:---:|
| Emitir nota | `bitacora.controller.js:emitirNota` (L541-591) | ❌ | ✅ |
| Crear minuta | `minutas.controller.js:crearMinuta` (L50-69) | ❌ | ✅ |
| Crear visita | `minutas.controller.js:crearVisita` (L147-163) | ❌ | ✅ |
| Registrar avance | `trabajos.controller.js:registrarAvance` (L213) | ❌ | ✅ |
| Corregir avance | `trabajos.controller.js:corregirAvance` (L330) | ❌ | ✅ |
| Crear convenio | `convenios.controller.js:crearConvenio` (L114) | ❌ | ✅ |
| Autorizar convenio | `convenios.controller.js:autorizarConvenio` (L335) | ❌ | ✅ |
| Registrar garantía | `garantias.controller.js:crearGarantia` (L80) | ❌ | ✅ |
| Registrar endoso | `garantias.controller.js:registrarEndoso` (L132) | ❌ | ✅ |
| Sustituir roster | `roster.controller.js:sustituirPersona` (L88) | ❌ | ✅ |
| **Registrar pago** | `pagos.controller.js:registrarPago` (L24) | ❌ | **❌ (excepción)** |

**Excepción legítima — el pago:** `registrarPago` exige estimación **autorizada** (`:72`, art. 54), y `calcularFiniquito` (`finiquito.controller.js:33-54`) **suma el neto de estimaciones `('autorizada','pagada')` y resta lo pagado**: una estimación autorizada-no-pagada al cierre queda como **saldo a favor del contratista en el propio finiquito**. El art. 64 manda *"poner a disposición del contratista el pago correspondiente"* del saldo: concretar ese pago es **cumplir** el finiquito, no una mutación nueva. → **No bloquear el pago** de estimaciones autorizadas antes del cierre (decisión de alcance final = tú/profe).

**Fundamento (🟢 verificado verbatim):** **art. 64 LOPSRM, último párrafo** (`lopsrm_utf8.txt`): *"Determinado el saldo total, la dependencia o entidad pondrá a disposición del contratista el pago correspondiente… debiendo, en forma simultánea, **levantar el acta administrativa que dé por extinguidos los derechos y obligaciones** asumidos por ambas partes en el contrato."* → extinguidos derechos/obligaciones, **no caben actos nuevos** (notas, modificaciones, garantías, sustituciones). Reforzado por arts. 168/170/172 RLOPSRM (finiquito, contenido, acta de extinción) — el importe ejecutado y el saldo quedan **fijados** en el documento de finiquito.
> **[validar]** El número de fracción de art. 170 (fr. IV/VI) que cita el código (`instruccion-pago.controller.js:265`) **no** se verificó verbatim en esta pasada; confírmalo al integrar.

**Fix propuesto (no implementado):** gate **uniforme** y reutilizable.
1. Crear `backend/src/lib/gateCierre.js` con `assertContratoAbierto(client, contratoId)` → `SELECT estado FROM contratos WHERE id=$1`; si `'cerrado'` → 409 con el mensaje legal (art. 64 LOPSRM / 170 RLOPSRM). Reusa la redacción del helper existente.
2. Aplicarlo **dentro de la transacción**, tras cargar el contrato, en los 10 endpoints mutantes nuevos (varios hoy ni siquiera traen `estado` en su `SELECT`: `minutas.getContrato` L11-14, `garantias.getContrato` L34-37, `roster` L110-112, `convenios.crearConvenio` L146 → añadirlo).
3. **Regla:** solo se bloquea **crear algo nuevo**; lo generado antes del cierre queda inmutable por los triggers existentes (no se toca). **Excepción:** el pago (arriba).

**Zona congelada:** los controllers del barrido (`bitacora`, `minutas`, `trabajos`, `convenios`, `garantias`, `roster`) **no** están en la lista congelada, pero el módulo nuevo `lib/gateCierre.js` y cualquier montaje deben pasar por ti. Esfuerzo **medio** (11 endpoints / 7 archivos; ~3-5 líneas por endpoint siguiendo el patrón probado).

---

## 🟡 Bug 4 — Registro fotográfico: solo en el Expediente, NO en Avance ni en el wizard de estimación

**Verificado end-to-end.** Funciona, pero **en un solo lugar** — y **no** donde creías.

**Dónde SÍ funciona (camino del usuario):** **Expediente** (Consulta de expediente, HU-04) → el contrato debe tener **al menos una estimación** → en "Resumen de estimaciones" (`ConsultaExpediente.jsx:474`), por cada estimación se pinta una tarjeta con el componente **`FotosEstimacion`** (`ConsultaExpediente.jsx:523`, props `estimacionId={e.id}`). Ahí está **"+ Agregar foto"** (`foto-subir-<id>`, input JPEG/PNG, redimensiona en cliente con `utils/imagen.js`) → `api.subirFotoEstimacion` → galería con `api.listarFotosEstimacion` + miniaturas con `api.descargarFotoEstimacion` (blob con Authorization) + eliminar. **Backend completo y montado:** `/api/estimacion-fotos` (`server.js:28,81`), controller con acceso por `esParteOSupervision` y `subido_por` del JWT, multer en memoria JPEG/PNG 5MB; tabla `estimacion_fotos` plegada e idempotente en `schema.sql:597-614` (**sin bomba latente**).
> Condición: que exista la estimación (sin estimaciones, el bloque no se pinta) y que el rol abra el expediente con edición (`useVistaHU('HU-04')`; en solo-lectura solo se ve la galería, sin "+ Agregar").

**Dónde NO funciona (corrige tu suposición):**
- **Wizard de Integración de estimación** (`IntegracionEstimacion.jsx:968-975`, paso 4): **no monta** `FotosEstimacion` — solo un **aviso de texto** (`soportes-fotos-alcance`) que redirige al Expediente.
- **Avance** (`AmbienteAvance.jsx:148-156`, bloque 5): es un **placeholder** que dice *"no está disponible en esta versión"* (el comentario `:25` lo confirma: HU-06 no sube fotos).
- Además, `FotosEstimacion` **solo acepta `estimacionId`** (no `contratoId`), así que no podría colgar fotos en Avance (que es por periodo, sin estimación creada).

→ **La afirmación "funciona para avance y estimación" es FALSA:** funciona solo vía Expediente, colgado de estimaciones.

**Fundamento (🟢 verificado verbatim):** **art. 132 fr. IV RLOPSRM** (`reg_utf8.txt:4788`): *"IV. Controles de calidad, pruebas de laboratorio y **fotografías**;"* — dentro del art. 132, que lista los documentos que acompañan a **cada estimación**. → El lugar **legalmente correcto** de la foto es la **estimación/expediente**; el render actual está alineado con la ley.

**Fix propuesto (decisión de alcance, no implementar):**
- **(A) Recomendado — aclarar copy:** aceptar que el punto único es el Expediente (alineado con art. 132 fr. IV) y **corregir el copy contradictorio** del placeholder de `AmbienteAvance.jsx:151-156` ("no disponible" → "se cargan en el Expediente por estimación"). Cero riesgo.
- **(B) Opcional — galería en el wizard:** montar `<FotosEstimacion estimacionId={...}/>` en el paso 4 de `IntegracionEstimacion.jsx`, condicionado a que la estimación ya exista. Solo frontend.
- **(C) Fuera de Etapa 1 — fotos por periodo en Avance:** requiere entidad destino nueva (HU-06 no crea estimación) + ampliar el componente a `contratoId` + DDL/endpoint. No trivial.

---

# RESOLUCIONES CON BASE EN LA LEY

## 🟡 Punto 5 — Acotamiento por empresa: solicitudes de registro, alta y roster

**Resolución por sub-pregunta.** La ley **no** modela "empresa de la dependencia"; el acotamiento es **criterio de diseño/seguridad**, no mandato.

**Qué hace hoy:**
- **(a) Aprobar solicitudes:** `usuarios.controller.js::aprobarUsuario/rechazarUsuario` (L64-118) hacen `UPDATE` por `:id` **sin comparar empresa** del aprobador vs solicitante. La ruta gatea `requireRole('dependencia')` → **cualquier** dependencia puede aprobar a **cualquier** solicitante. El JWT trae `empresa_id` pero aprobar/rechazar no lo usan.
- **(b) Alta de contrato:** `crearContrato` (L329-355) valida contra BD que las partes tengan el **rol+estado** correcto, pero **no** exige misma empresa entre superintendente y supervisión.
- **(c) Roster:** `sustituirPersona` (L159-172) **ya** exige misma empresa (REGLA 4, guard 409; fail-open si el saliente tiene `empresa_id` NULL); `ROLES_ROSTER` excluye `'dependencia'` (no sustituible).

**Ley (🟢 citas verificadas, pero resuelven por AUSENCIA):**
- **art. 43 RLOPSRM** + **art. 74 Bis LOPSRM:** el padrón/registro es de **CONTRATISTAS**, **centralizado** en la Plataforma (SFP); *"Los contratistas solicitarán su inscripción… a las dependencias y entidades, las cuales, previa validación… llevarán a cabo la inscripción"*. **Cualquier** dependencia valida e inscribe; la ley **no** acota por "su empresa".
- **art. 125 fr. I g) RLOPSRM:** *"Al residente le corresponderá registrar… g) La sustitución del superintendente, del anterior residente y de la supervisión"* → resuelve **quién registra** (residente) y **qué roles** son sustituibles (no la dependencia); **no** exige misma empresa.

**Certeza:** 🟡 **criterio de diseño** (la ley resuelve por ausencia: no obliga a acotar por empresa).

**Resolución:**
- **(a)** **NO** bloquear la aprobación por empresa en Etapa 1: "empresa de la dependencia" no es concepto legal, y un contratista recién registrado **aún no tiene contrato** con quien comparar empresa. Conservar la **traza** (`aprobado_por` ya se guarda). Si el profe lo quiere, que sea **seguridad documentada**, marcado **[validar profe]**.
- **(b)** **NO** forzar misma-empresa contratista↔supervisión — **sería un ERROR legal**: la supervisión suele ser **externa/independiente** (art. 53 párr. 4: responsabilidad **solidaria**, son partes distintas). Mantener solo la validación de rol+estado.
- **(c)** **Conservar** el guard 409 misma-empresa del roster: criterio correcto (el contrato se liga a la **empresa**, no a la persona).
- **Deuda real de seguridad** (mayor que (a)/(b)): el **fail-open per-contrato** del acotamiento de dependencia (`lib/acceso.js`): los gates por id directo no acotan. Endurecerlo es la prioridad de fondo, también **[validar profe]** en su alcance.

**Impacto:** zona congelada (`usuarios`/`contratos`/`acceso`), esfuerzo medio. **Prioridad baja** para el 24 (la acción correcta es **no** agregar acotamientos sin base legal).

---

## 🟢 Punto 6 — Minutas y visitas: ¿nota de bitácora automática?

**Resolución (🟢 alta certeza):** **distinguir minuta de JUNTA de visita simple.**

**Qué hace hoy:** el vínculo minuta/visita↔nota es **manual y opcional** (`minutas.controller.js`: `vincularNotaMinuta`/`vincularNotaVisita` ligan una nota **existente**); **nunca** llaman a `insertarNotaAtomica`. Es decir, hoy **no** hay nota automática.

**Ley (verificada verbatim):**
- **art. 115 fr. VIII RLOPSRM** (funciones de la **supervisión**): *"Celebrar juntas de trabajo con el superintendente o con la residencia para analizar el estado, avance, problemas y alternativas de solución, **consignando en las minutas y en la Bitácora los acuerdos tomados** y dar seguimiento a los mismos"* → la **minuta de junta** se consigna **obligatoriamente también en la Bitácora**. *(Corrige el "ORO" del análisis previo: es art. **115**, no 116.)*
- **art. 123 fr. X RLOPSRM:** *"**Cuando se requiera**, **se podrán** ratificar en la Bitácora las instrucciones emitidas vía oficios, minutas, memoranda y circulares…"* → **potestativo**: el vínculo de una minuta/visita simple es **manual/opcional**.
- **art. 123 fr. XI RLOPSRM:** *"Deberá utilizarse la Bitácora para **asuntos trascendentes**…"* → una visita rutinaria no trascendente no exige nota.

**Resolución:**
- **Minuta de JUNTA de trabajo** (con acuerdos) → **nota AUTOMÁTICA** (`insertarNotaAtomica`, exige bitácora abierta), porque el art. 115 fr. VIII **obliga** a consignar los acuerdos en la Bitácora. Esto realiza el "todo lo que se hace debe tener nota" del profe **con base legal dura**.
- **Visita simple** → **NO automática**; vínculo **manual** (art. 123 fr. X potestativo / fr. XI solo trascendentes). Recomendable exigir bitácora abierta también para el vínculo manual (coherencia con el uso obligatorio de la Bitácora, art. 122).

**Matiz honesto:** el art. 115 fr. VIII obliga a *consignar* los acuerdos; que se haga *automáticamente con `insertarNotaAtomica`* es **decisión de implementación** sobre una base legal dura (el sistema cumple el mandato; la automatización en sí no es literal). El actor/redacción de esa nota debe reflejar que es **acuerdo de junta de trabajo** (función de supervisión), no cualquier minuta.

**Impacto:** `minutas.controller.js` y `bitacora.controller.js` no son zona congelada; `insertarNotaAtomica` ya se reusa (avance/convenio/sustitución). Esfuerzo **medio**. **Prioridad media** (es lo que pidió el profe).

---

## 🟡 Punto 7 — Responsable de la visita: ¿ligado a supervisión (no libre)?

**Resolución (🟡 criterio, con respaldo legal fuerte):** cambiar el **texto libre** por un **selector de rol del roster**; pero **no** imponer "siempre supervisión" (la ley no fija un único responsable).

**Qué hace hoy:** **texto LIBRE.** `minutas.controller.js::crearVisita` (L147-162) toma `b.responsable` del body y solo hace `String().trim()` → `visitas.responsable TEXT` (`schema.sql:1837`). El frontend (`MinutasVisitas.jsx:120`) es un `<input>` libre (placeholder "Supervisión"). El único gating es de **actor** (residente asignado para agendar); el **contenido** del campo no está ligado a ninguna cuenta/rol → se puede escribir cualquier cosa.

**Ley (🟢 7 citas verificadas):**
- **art. 53 LOPSRM párr. 1:** la **residencia** *"será la responsable de la supervisión, vigilancia, control y revisión de los trabajos… deberá estar ubicada en el sitio"*.
- **art. 53 LOPSRM párr. 4:** *"La supervisión será **responsable solidaria** junto con el residente…"*.
- **art. 115 fr. V/VI/VIII RLOPSRM:** la **supervisión** vigila la ejecución, da seguimiento al programa y celebra las juntas.
- **art. 114 párr. 2 RLOPSRM** *(clave):* *"**Cuando no se cuente con el auxilio de la supervisión**, las funciones a que se refiere el artículo 115… estarán **a cargo de la residencia**."*
- **art. 113 fr. I RLOPSRM:** la **residencia** también *"Supervisar, vigilar, controlar y revisar la ejecución"*.

**Certeza:** 🟡 **criterio de diseño** — la ley asigna la vigilancia a **roles designados** (no a texto libre), **pero no fija un único responsable**: sin supervisión contratada, las funciones recaen en la residencia (art. 114 párr. 2); hay responsabilidad solidaria (art. 53 párr. 4).

**Resolución:** reemplazar el `<input>` libre por un **`<select>` de roles del roster**, no editable a mano:
- Default **Supervisión** cuando el contrato tiene `supervision_id`; **Residencia** cuando no lo tiene (art. 114 párr. 2).
- El valor guardado se **deriva del roster** (`supervision_id`/`residente_id`), no de texto.
- **Antes del 24 (mínimo):** `<select>` de 2 opciones con default según `supervision_id`. El **blindaje server-side** (validar que el responsable coincida con un rol del roster) = follow-on.

**Impacto:** no congelado, esfuerzo **bajo**. **Prioridad media** (el input libre actual permite valores arbitrarios, lo que contradice que la responsabilidad de obra es de roles designados).

---

## Cierre — qué tocar y qué pasa por ti

| Acción | Archivos | ¿Congelado? | Esfuerzo |
|---|---|---|---|
| #1 fix deep-link nota | `NotificacionesCentro.jsx:124` | No | bajo |
| #2 borrar link redundante | `TransitoPago.jsx:420-427` | No | bajo |
| #3 gate de cierre uniforme | `lib/gateCierre.js` (nuevo) + 10 endpoints en bitacora/minutas/trabajos/convenios/garantias/roster | helper nuevo → tú lo montas | medio |
| #4 alinear copy fotos (A) | `AmbienteAvance.jsx:151`, `IntegracionEstimacion.jsx:974` | No | bajo |
| #6 nota auto de minuta de junta | `minutas.controller.js` + `insertarNotaAtomica` | No | medio |
| #7 responsable = select de roster | `MinutasVisitas.jsx` + `crearVisita` | No | bajo |
| #5 acotamiento empresa | (recomendación: **no** agregar; **[validar profe]** el fail-open de `lib/acceso.js`) | Sí (a/b) | — |

> **Recordatorio:** **no implementé nada.** Todo lo de arriba es diagnóstico/resolución para que decidas qué se aplica.
> Lo único 🔴 es el **#3** (contrato cerrado debe ser solo-lectura, art. 64 LOPSRM); el resto son 🟡/🟢.
> Las citas legales están verificadas verbatim contra `docs/legal/*.txt`; el único **[validar]** abierto es la **fracción exacta del art. 170 RLOPSRM** que cita el código del finiquito.
