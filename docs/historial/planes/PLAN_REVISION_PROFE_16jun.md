# SIGECOP — Plan tras la revisión del profe · 16 jun 2026

> **Fuente real:** transcripción `docs/audios/WhatsApp Audio 2026-06-16 at 10.11.12 PM_transcript.txt` (25:39, profe
> Carlos Silva = Speaker B) + audio previo `docs/audios/...15-jun...` + `docs/REQUERIMIENTOS_PROFE_CONSOLIDADO.md`
> + estado real `docs/contexto-claude/ESTADO_ACTUAL.md`.
>
> **Reconciliación con `docs/ANALISIS_REVISION_PROFE_16jun.md`** (ya está en el repo, reconciliado el 16-jun):
> sus 6 puntos están **cubiertos 1:1** por este plan (mapa abajo). Las **FASE 1 (historias a lenguaje natural)** y
> **FASE 6 (patrón wizard al resto del sistema)** son **adiciones de Maiki** más allá de la extracción del audio
> (no están en el ANALISIS, no lo contradicen). Dos matices del ANALISIS quedaron afinados en este plan: el
> trabajo sobrante de un periodo (FASE 0D) y el dueño de la apertura (FASE 2).
>
> | Punto del ANALISIS | Aquí |
> |---|---|
> | 1. Estimaciones: wizard por bloques (EL GRANDE) | **FASE 5** |
> | 2. Finiquito HU-24 (verificar ley) | **FASE 4** (ley ya verificada: LOPSRM 64 + RLOPSRM 168-172) |
> | 3. Expediente: oficio + quitar ejecución + buscador | **FASE 0 (A/B/C)** |
> | 4. Presentar por estado | **FASE 0 (D)** |
> | 5. Apertura con todos los datos del alta | **FASE 2** (dueño E2 por PR; Maiki asegura el dato) |
> | 6. Confirmado YA cumple (amortización, empresas) | checklist #10 y #12 |
> | Pendiente CRÍTICO: decisión BD | **§7** |
>
> **Método (regla CLAUDE.md):** LOCAL, sin commit/push; Maiki integra. Respeta la **zona congelada** (auth,
> G1-G8, cálculo de carátula, `permisos.js`, `server.js`, triggers, `schema.sql` salvo aditivo idempotente).
> Todo **wizard ENVUELVE el cálculo/lógica existente, no lo reescribe.** Lee ESTADO_ACTUAL.md primero y mantén
> él + las historias sincronizados después de cada cambio. Cita el artículo o marca `[validar profe]`.

---

## 0. Reloj — calendario de entrega (del propio audio, [17:46]–[24:20])

| Fecha | Qué | Hora | Implicación |
|---|---|---|---|
| **Lun 22-jun** | Sesión de **detalles** con el profe (con scripts) | 2–3 pm | Llevar los quick-wins ya hechos + scripts de datos |
| **Mié 24-jun** | **PRE-ENTREGA** (pre-revisión como final, con chance de corregir) | 1–4 pm | **Deadline real de demostración**: todo lo que se va a calificar debe verse aquí |
| **Jue 25-jun** | Revisión / correcciones | — | También expira la BD free de Render (§9) |
| **Vie 26-jun** | **Último día para subir calificaciones** (máx. reposición) | — | Después de esto no hay margen |

**Plan del profe para la sesión de 3 h:** *"levantar un contrato completo desde cero, todo el flujo, con un
archivo que ya tenga todos los datos"* [24:52–25:22]. → refuerza la **FASE 3 (seed/scripts)**.

**Diagnóstico del profe sobre el avance:** *"apenas van como el 8… no hay nada de modificatorios, no hay nada
de las curvas de avance, tablero de control, ya nada más faltan 4 y 3"* [24:26] → faltan HU de **E2 (≈4)** y
**E3 (≈3)** que *"no se las ha visto porque no han corregido la anterior"* [24:49]. Maiki integra; este plan
cubre lo de Maiki + marca lo de equipos.

> **El profe LEE las historias en voz alta durante la revisión** ([03:10] *"léelo otra vez para ver qué dice"*;
> [19:29] lee toda la lista de HU). Por eso las **historias deben estar en lenguaje natural y legibles** → es
> una fase propia (FASE 1), no un adorno.

---

## 1. Clasificación de TODO lo que pidió (checklist maestro)

> **Dueño:** 🟢 Maiki (puedo YA) · 🔵 E2 (bitácora/documental) · 🟣 E3 (estimaciones/generadores) · ⚖️ decisión [validar profe/Maiki].
> **24-jun:** ✅ realista · 🟡 realista si se acota · ❌ no para el 24 (queda después).

| # | Pedido del profe / objetivo de Maiki | Min | Dueño | Esfuerzo | 24-jun |
|---|---|---|---|---|---|
| 1 | **Expediente:** falta la sección **"documento de aprobación" (oficio)** del convenio modificatorio | [01:16–02:06] | 🟢 Maiki (+🔵 si toca subir desde HU-03) | M | ✅ |
| 2 | **Expediente:** en el bloque de **programa** quitar la **ejecución/restante**; mostrar solo **lo contratado** | [02:06–02:35] | 🟢 Maiki | S | ✅ |
| 3 | **Expediente:** **limpiar el buscador** — quitar criterios sin sentido dentro de UN solo contrato (**empresa, folio**) | [03:16–05:25] | 🟢 Maiki | S | ✅ |
| 4 | **Presentar estimación POR ESTADO**: ya presentada = no se puede re-presentar; rechazada sí; nunca-presentada sí | [09:30–13:48], [17:46] | 🟢 Maiki | S-M | ✅ |
| 5 | **Historias de usuario a LENGUAJE NATURAL** (que el profe las lea; sin jerga técnica ni "E/C/—") | [03:10], [19:29], REQ §7 | 🟢 Maiki (solo el doc) | M | ✅ (independiente) |
| 6 | **Nota de apertura**: redacción/machote con **TODOS los datos del alta** (objeto, ubicación, partes, montos) + imprimir/PDF | [06:11–07:38] | 🔵 E2 / 🟢 Maiki (binding) | M | ✅ |
| 7 | **REDISEÑO ambiente de estimación por bloques** (wizard tipo alta): generadores→carátula auto→soportes/notas/fotos→cierre candado→envío a revisión; historial **aparte** | [11:18–17:46] | 🟢 Maiki (shell) + 🟣 E3 (generadores) | **XL** | 🟡 (completo es la meta del 24; depende de E3 en generadores/fotos) |
| 8 | **Patrón wizard al resto del sistema** (bitácora y otros flujos) — *"dar forma de sistema real, dejar de movernos entre pestañas"* | [11:18] | 🟢 Maiki + 🔵 E2 | **XL** | ❌ **POST-24** (visión de producto) |
| 9 | **FINIQUITO (HU-24, NUEVA, obligatoria para cerrar)**: nota de bitácora + cálculo de saldos a favor/en contra | [11:01], [18:55–20:32] | 🟢 Maiki | L | 🟡 (MVP acotado) |
| 10 | **Amortización**: "0,0,todo-al-último" no debe pasar; checar la ley el mínimo | [05:25–06:11] | 🟢 Maiki | — | ✅ **YA RESUELTO** (FASE 15-jun, art. 143-I) — solo demostrar |
| 11 | **Seed multi-contrato / scripts** para levantar el flujo desde cero y disparar alertas | [24:52–25:22] (+ 15-jun) | 🟢 Maiki | M | ✅ |
| 12 | Plan de amortización "faltaba" en el contrato de demo | [02:39–02:56] | — | — | **NO es bug**: ese contrato es viejo. Cubierto por el seed (#11) |
| 13 | Cerrar HU de equipos (modificatorios, curva, tablero) | [24:26] | 🔵🟣 | — | depende de PRs |

---

## 2. Orden de ejecución (maximiza lo demostrable el 24)

```
FASE 0  Quick-wins Maiki: expediente HU-04 (#1-2-3) + presentar-por-estado (#4)   ← PRIMERO, bajo riesgo
FASE 1  Historias de usuario a lenguaje natural (#5)                              ← INDEPENDIENTE, segura, el profe las lee
FASE 2  Nota de apertura con todos los datos del alta (#6)
FASE 3  SEED multi-contrato + scripts (#11)                                       ← habilita demostrar TODO + sesión "desde cero"
FASE 4  FINIQUITO HU-24 MVP (#9)                                                  ← cierra el hueco OBLIGATORIO
FASE 5  Rediseño del ambiente de ESTIMACIÓN por bloques (#7)                      ← el grande del 24; shell envuelve el cálculo
────────────────────────────  línea del 24-jun  ────────────────────────────
FASE 6  (POST-24) Patrón wizard al resto del sistema: bitácora y otros (#8)       ← visión "sistema real"
FASE 7  Pendientes de equipos (E2/E3) + decisiones [validar profe] (#13, ⚖️)
```

**FASE 1 es independiente** (solo toca el documento de historias): puede ejecutarse en cualquier momento, incluso
en paralelo a las demás. La pongo temprano porque el profe lee las historias en la revisión y porque no tiene riesgo.

**Realista para el 24:** FASES 0, 1, 2, 3, 4 **completas**; FASE 5 **completa en su shell** (ambiente aislado +
carátula automática + cierre/candado + envío a revisión envolviendo el cálculo actual), con los **generadores y
el registro fotográfico condicionados a E3**. FASES 6 y 7 **después del 24**.

---

## FASE 0 — Quick-wins de Maiki: Expediente HU-04 + estado de estimación

**Objetivo:** corregir las 3 cosas del expediente que el profe marcó en pantalla y blindar la regla de
"presentar por estado". Todo es **frontend** salvo, quizá, el endpoint del oficio del convenio.

**Justificación (audio):**
- Oficio del convenio: *"aquí en teoría tendría que haber un oficio… está autorizado es un oficio que diga
  'está aprobado tal convenio modificatorio'… Falta la sección de documento de aprobación, es un oficio"* [01:16–02:06].
- Programa sin ejecución: *"Aquí nada más estás viendo el programa de obra, no el avance. Tienes que quitar
  esto, lo contratado, no lo restante. No estás viendo la ejecución, eso lo ves en los indicadores, en la
  curva"* [02:06–02:35].
- Buscador: *"¿Por qué empresa? … el contrato es de una empresa, no voy a encontrar más que una sola… Tampoco
  el folio… Tú tienes un solo contrato, no tiene sentido esta búsqueda"* [04:08–05:20].

**Archivos probables:**
- `frontend/src/pages/ConsultaExpediente.jsx` — buscador (`CAMPOS` fila ~21-25: `folio/contratista/empresa/objeto/periodo`),
  `BloquePrograma` (~128), `BloqueConvenios` (~363).
- `frontend/src/components/programa/MatrizProgramaLectura.jsx` — verificar si pinta columnas de ejecutado/restante.
- Oficio del convenio: lectura desde el expediente; si hay que **subir** el oficio, endpoint nuevo en dominio
  convenios (`convenios.controller.js` NO está congelado) — patrón `subirDocumento` (PDF en BYTEA, `%PDF`,
  append-only). **No** tocar `server.js`: si requiere ruta nueva, pásamela.
- Doc: actualizar criterio del buscador en `docs/analisis-y-diseno/Historias_Usuario_ACTUALIZADAS_12jun.md` (HU-04).

**Riesgo:** **Bajo.** Es presentación + un posible upload acotado. El oficio puede chocar con la inmutabilidad
del convenio (trigger `convenios_modificatorios` solo deja `nota_id` NULL→valor): el oficio NO debe ser una
columna del convenio que se actualice; debe vivir en una tabla de documentos/soportes ligada por FK (aditivo)
o reusar `contrato_documentos` con un `tipo`. **Decisión a Maiki** marcada en el prompt.

**Dependencias:** ninguna dura. Si se decide *subir* el oficio (no solo mostrar), confirmar con Maiki la tabla.

**PROMPT:**
```
Soy Maiki. FASE 0 — quick-wins del EXPEDIENTE (HU-04) y de PRESENTAR estimación por estado, según la revisión
del profe del 16-jun. LOCAL, sin commit/push. NO toques zona congelada (App.jsx, permisos.js, server.js,
schema.sql salvo aditivo idempotente, auth, cálculo de carátula). Lee ESTADO_ACTUAL.md y la transcripción
docs/audios/WhatsApp Audio 2026-06-16*.txt antes de tocar nada.

(A) EXPEDIENTE — Programa sin ejecución [audio 02:06-02:35]:
En frontend/src/pages/ConsultaExpediente.jsx -> BloquePrograma (y components/programa/MatrizProgramaLectura.jsx),
el bloque de PROGRAMA debe mostrar SOLO lo contratado/programado. Quita cualquier columna o dato de "ejecutado",
"restante" o avance real de ese bloque (la ejecución se ve en indicadores/curva HU-05/07, no aquí). Verifica
primero si esas columnas existen ahí; si MatrizProgramaLectura se reusa en otras vistas donde SÍ debe mostrar
ejecución, parametrízalo con un flag (p.ej. soloContratado) en vez de borrar para todos.

(B) EXPEDIENTE — Buscador limpio [audio 03:16-05:25]:
El buscador del expediente filtra BLOQUES por campo y hoy ofrece folio/contratista/empresa/objeto/periodo. Dentro
de UN solo contrato, "empresa" y "folio" no tienen sentido (hay uno solo) — el profe lo objetó explícitamente.
Quita "empresa" y "folio" de los criterios. Revisa "contratista" y "objeto": también son únicos por contrato; si
solo sirven para navegar bloques, evalúa dejar únicamente "periodo" y/o "tipo de documento/bloque". Propón en el
reporte qué criterios quedan y por qué; no rompas los specs que prueben el buscador (ajústalos).

(C) EXPEDIENTE — Oficio de aprobación del convenio [audio 01:16-02:06]:
En el bloque Convenios del expediente debe aparecer una sección "Documento de aprobación (oficio)" del convenio
modificatorio: el soporte de que el convenio FUE APROBADO. Primero verifica si ese oficio ya se puede subir/leer
en alguna parte (HU-03 ConveniosModificatorios.jsx / convenios.controller.js).
 - Si ya existe el dato -> solo muéstralo en BloqueConvenios (link "ver oficio").
 - Si NO existe -> NECESITO DECISIÓN antes de implementar el upload: ¿tabla nueva de soportes de convenio
   (aditivo idempotente) o reusar contrato_documentos con un tipo='oficio_convenio'? NO toques el trigger de
   convenios_modificatorios (es append-only; el oficio no puede ser una columna que se UPDATE). Repórtame las dos
   opciones de DDL y NO ejecutes el upload hasta que yo elija. Mientras, deja la UI lista (sección + estado vacío
   "pendiente de cargar el oficio").

(D) PRESENTAR estimación POR ESTADO [audio 09:30-13:48, 17:46]:
HALLAZGO: el backend YA lo valida bien — estimaciones-ciclo.controller.js::enviarEstimacion (líneas ~154-159):
409 si estado==='enviada' ("ya fue presentada") y 409 si estado!=='integrada'. El bug que vio el profe fue de
FRONTEND: bloqueó por "excede lo planeado del periodo" (validación churro) y/o sigue OFRECIENDO "Presentar" en
estimaciones ya presentadas. Arregla el frontend (EnvioEstimacion.jsx / IntegracionEstimacion.jsx /
HistorialEstimaciones.jsx):
 - "Presentar" SOLO disponible/habilitado si el estado es 'integrada' o 'rechazada' (reingreso). Para 'enviada'
   (Presentada), 'autorizada', 'pagada': NO mostrar/ocultar la acción (el profe: "ya ni siquiera debe desplegar
   esto").
 - Cuando esté deshabilitado, el motivo debe ser el ESTADO ("La estimación ya fue presentada / autorizada"),
   NO "excede lo planeado". Que el mensaje cite que una estimación se presenta UNA sola vez (art. 54).
 - Matiz del sobrante (alineado con ANALISIS punto 4): lo prohibido es RE-PRESENTAR la MISMA estimación. El
   trabajo faltante/sobrante de un periodo SÍ puede cobrarse en una estimación POSTERIOR distinta (estimación
   nueva, no re-presentar la #1), o conciliarse al final en el FINIQUITO [audio 13:48-14:16]. NO bloquees crear
   estimaciones posteriores; solo bloquea volver a presentar una que ya se presentó.

Corre la suite (objetivo 258/8/0 — el seed no corre en tests; ajusta specs afectados). Actualiza ESTADO_ACTUAL.md
y el criterio del buscador en las historias (HU-04). Reporta con archivo:línea de cada cambio. NO push.
```

---

## FASE 1 — Reescribir las HISTORIAS DE USUARIO a lenguaje natural (para que el profe las LEA)

**Objetivo:** que `Historias_Usuario_ACTUALIZADAS_12jun.md` se lea como **lo que el usuario VE y HACE**, sin
jerga técnica, para que el profe las pueda leer en voz alta en la revisión sin tropezar con implementación.
**No cambia lo que el sistema hace; cambia cómo está redactado.**

**Justificación:**
- El profe **lee las historias en la revisión** y reacciona a la redacción [03:10 *"léelo otra vez para ver qué
  dice"*; 19:29 lee la lista completa].
- Principio del profe (`REQUERIMIENTOS_PROFE_CONSOLIDADO §7`): *"Historias de usuario como ficha simple (id,
  título, rol, qué hace, objetivo, 2-3 criterios como aseveraciones)"*. Una historia describe comportamiento
  observable, **no** la base de datos ni el backend.
- **Problema real hoy:** las historias están cargadas de jerga — `nivel 'E'/'C'/null`, `requireRole('residente')`,
  `POST /auth/login … 400/401/409`, `permisos.js:12`, nombres de tablas/funciones, `archivo:línea`. Ilegible
  para quien valida el producto, no el código.

**Qué se traduce (ejemplos reales del doc actual):**

| Hoy (jerga) | Reescrito (lenguaje natural) |
|---|---|
| "residente (nivel 'E', ejecuta)… requireRole('residente')… permisos.js:12" | "El **residente** da de alta el contrato; el contratista, la supervisión y la dependencia solo lo **consultan**; finanzas **no tiene acceso** a esta pantalla." |
| "POST /auth/login recibe SOLO {email,password}: si falta alguno responde 400" | "Si el usuario deja vacío el correo o la contraseña, el sistema **no lo deja entrar** y le avisa." |
| "el monto se DERIVA server-side como Σ ROUND(cant×pu,2)… cuadre al centavo" | "El sistema **calcula solo** el monto del contrato sumando los conceptos del catálogo; el usuario no lo teclea, y debe cuadrar **al centavo**." |
| "RegistroFianzas.jsx:325-332 (useState)… no hay llamada a backend" | "El usuario captura las pólizas en un formulario y las ve listadas con un semáforo de vencimiento." *(y el estado real maqueta/dummy se anota en una nota honesta, sin nombres de archivo)* |

**Archivos:** **SOLO** `docs/analisis-y-diseno/Historias_Usuario_ACTUALIZADAS_12jun.md` (+ su índice). **NO toca
código.** La **trazabilidad técnica** con `archivo:línea` ya vive en `docs/analisis-y-diseno/AUDITORIA_COHERENCIA_HU.md`
→ no se pierde al limpiarla de las historias.

**Riesgo:** **Muy bajo** (solo un documento). El único cuidado: **no alterar el significado** al simplificar — la
traducción de permisos debe ser **fiel** a `permisos.js` (quién ve / quién hace), y los **artículos legales se
conservan** (son parte de lo que el profe valida).

**Dependencias:** ninguna (por eso va temprano / puede ir en paralelo). Si la FASE 4 ya redactó HU-24 (finiquito),
incluirla aquí con el mismo estilo.

**Decisión a Maiki (en el prompt):** reescribir **sobre el mismo archivo** (recomendado — la evidencia técnica
queda en `AUDITORIA_COHERENCIA_HU.md`) **vs** mantener una versión "para el profe" separada de la técnica.

**PROMPT:**
```
Soy Maiki. FASE 1 — reescribir las HISTORIAS DE USUARIO a lenguaje natural para que el profe las LEA. LOCAL, sin
commit/push. NO toques código: el ÚNICO archivo que se edita es docs/analisis-y-diseno/Historias_Usuario_
ACTUALIZADAS_12jun.md (y su índice). La trazabilidad técnica archivo:línea ya vive en AUDITORIA_COHERENCIA_HU.md,
así que NO se pierde al limpiarla de las historias. (Decisión: reescribir SOBRE el mismo archivo —recomendado—;
si prefieres una versión separada "para el profe", dímelo antes.)

PRINCIPIO: una historia describe lo que el usuario VE y HACE en el sistema. FUERA de las historias: base de datos,
backend, frontend, endpoints (/auth/login, POST/GET, códigos 400/401/409), nombres de tablas/funciones/archivos,
"nivel E/C/null", permisos.js, requireRole, useVistaHU, JWT, useState, "server-side".

REGLAS:
1) Permisos a lenguaje natural: donde diga "residente: 'E'", "contratista: 'C'", "finanzas: null", traduce a quién
   VE y quién HACE, p.ej.: "El residente da de alta el contrato; el contratista, la supervisión y la dependencia
   solo lo consultan; finanzas no tiene acceso a esta pantalla." VERIFICA cada traducción contra permisos.js para
   que sea FIEL — no cambies quién puede qué.
2) Conserva la trazabilidad LEGAL: los artículos (LOPSRM/RLOPSRM/LFD) se quedan; son parte de lo que el profe
   valida. Mantén el bloque "Fundamento legal" de cada historia.
3) Criterios de aceptación como ASEVERACIONES de comportamiento observable (lo que pasa en pantalla), NO como
   contrato de API. 2-3 criterios claros por historia (principio del profe). Ej.: en vez de "POST /auth/login…
   400 si falta", escribe "Si deja vacío el correo o la contraseña, no lo deja entrar y le avisa."
4) NO cambies lo que el sistema HACE, solo cómo se redacta. Donde el estado real sea maqueta/dummy, dilo en una
   nota honesta y en lenguaje natural ("esta pantalla todavía opera sobre datos de demostración"), SIN nombres de
   archivo ni "useState". Si al reescribir detectas que una historia ya NO coincide con el sistema real, NO la
   "arregles" inventando: anótalo como hallazgo para Maiki.
5) Ficha uniforme por historia: ID · título · rol que ejecuta (en lenguaje natural) · "Como / Deseo / A fin de" ·
   2-3 criterios · Fundamento legal · Pendientes/[validar profe]. Reescribe TODAS (HU-00..23 + Registro + Por
   Firmar; incluye HU-24 finiquito si ya se redactó en su fase).
6) Mantén la cabecera que aclara que este doc reemplaza al xlsx y que la evidencia técnica vive en
   AUDITORIA_COHERENCIA_HU.md.

Al final, reporta: (a) lista de historias que, al limpiarlas, revelaron una posible discrepancia con el sistema
real (para que Maiki decida); (b) confirmación de que ninguna traducción de permisos cambió el acceso real. NO push.
```

---

## FASE 2 — Nota de apertura con TODOS los datos del alta

**Objetivo:** que el documento de la nota de apertura (machote, art. 123 fr. III) incluya **toda** la información
del alta del contrato (objeto, ubicación, partes, montos, fechas), redactado, listo para **imprimir/descargar PDF**.

**Justificación (audio):** *"En la redacción te falta todo el show… de la obra ubicada… aquí tendrá que estar
redactado con todos los datos que traes allá. El de la obra cuyo objeto es tal, ubicada en tal… Todo lo del
alta de contrato debe estar ahí en el documento de la nota… Para que lo imprima de una vez y si lo quiere
descargar"* [06:11–07:38].

**Archivos probables:**
- `frontend/src/pages/AperturaBitacora.jsx` (machote) y/o `frontend/src/pages/ConsultaNotas.jsx` + el componente
  de documento imprimible (`DocumentoNota.jsx`, patrón print O8/O9 con `body.doc-nota-abierto`).
- Lectura del contrato: `api.detalleContrato` / `api.contrato...` — los datos del alta ya persisten.
- Backend: probablemente **ninguno**. Si el machote se arma server-side en `bitacora.controller.js`, ajustar ahí
  (no congelado).

**Riesgo:** **Bajo-Medio.** Es composición de texto. ⚠️ **Posible brecha de dato:** el profe pide *"ubicada en
tal"* (ubicación/domicilio de la obra). ESTADO_ACTUAL lista `contratos.objeto` pero **no confirma un campo de
ubicación**. Si no existe: (a) usar lo que haya (el objeto suele incluir la ubicación en texto), o (b) agregar
`contratos.ubicacion` (aditivo, **decisión Maiki**, toca el alta). Marcar `[validar]` y NO agregar campo sin tu OK.

**Dueño / dependencias:** según el ANALISIS, la redacción de la apertura es **responsabilidad de E2 (llega por
PR)**; **Maiki asegura que el dato exista** (campos del alta disponibles) y puede hacer el **binding** como
respaldo si E2 no entrega a tiempo (es frontend puro, no toca la lógica de notas/firmas de E2). Si E2 ya lo trae
en su PR, Maiki solo revisa que incluya **todos** los datos del alta y lo integra. Coordinar para no duplicar.

**PROMPT:**
```
Soy Maiki. FASE 2 — la NOTA DE APERTURA debe redactarse con TODOS los datos del alta del contrato y ser
imprimible/descargable (feedback profe 16-jun, 06:11-07:38). LOCAL, sin commit/push. NO toques zona congelada ni
el cálculo. Bitácora es dominio de E2: limita el cambio al binding de datos y la redacción del machote/documento
imprimible; no reescribas la lógica de firmas ni el ciclo de notas.

1) Inventaria qué datos del alta existen (api de detalle del contrato): folio, objeto, montos (contratado,
   anticipo %, monto), fechas (inicio/fin, plazo), partes (dependencia, contratista/superintendente, supervisión,
   residente), resumen de catálogo/programa. Verifica si hay un campo de UBICACIÓN/domicilio de la obra. Si NO
   existe, NO lo agregues: repórtalo como [validar] (decisión Maiki: usar el objeto como va, o agregar
   contratos.ubicacion aditivo en el alta).
2) En el machote de apertura (AperturaBitacora.jsx) y/o el documento imprimible (DocumentoNota.jsx), redacta el
   cuerpo con TODOS esos datos en prosa formal (art. 46 últ. párr. / 52 Bis LOPSRM; 122/123 RLOPSRM ya citados):
   "...se levanta la presente bitácora de la obra cuyo objeto es <objeto>, ubicada en <ubicación>, contratada con
   <empresa/superintendente> por la <dependencia>, por un monto de <monto> con anticipo del <%>, plazo de <inicio>
   a <fin>...". Que NO queden placeholders vacíos: si un dato no aplica, omítelo limpio.
3) Imprimir/descargar PDF: reusa el patrón print existente (body.doc-nota-abierto / window.print), igual que O8/O9.
   No metas una librería nueva si ya hay print CSS.
4) Tests: el documento de apertura contiene objeto + partes + monto + fechas (asersiones por testid). Suite verde.
Actualiza ESTADO_ACTUAL.md y la HU de apertura (HU-08/09). Reporta archivo:línea. NO push.
```

---

## FASE 3 — SEED multi-contrato + scripts (para "levantar desde cero" y disparar alertas)

**Objetivo:** un paquete de datos que permita demostrar **cada** HU sin capturar a mano, incluido el tablero/
alertas (varios contratos con atraso real) y un contrato listo para la sesión "desde cero".

**Justificación (audio):** insistencia del 15-jun (*"generen datos dummy… formen su paquete… deben poder probar
con los datos que ya tienen… hagan cuatro o cinco scripts… seis contratos para el dashboard"*) y del 16-jun
(*"un contrato desde cero, el flujo completo, traemos un archivo que ya tenga todos los datos"* [24:52–25:22]).

**Estado:** ya existe `backend/scripts/seed_demo.sql` (FASE 1 del 15-jun): 1 contrato completo + 4 en atraso.
**Falta** alinearlo a lo que el profe pedirá el 24: varios contratos con **distinto avance** para el tablero
(HU-17/18), alertas que **salten** (contrato iniciado en enero → atraso de varios meses), y un contrato "limpio"
para llenarse en vivo. Verificar que el seed siga válido tras los cambios de FASE 0–2.

**Archivos probables:** `backend/scripts/seed_demo.sql` (+ `reset_demo.sql`/`reset_demo.js` ya presentes sin
commit), `docs/SEED_DEMO_SIGECOP.md`, `package.json` (`seed:demo`).

**Riesgo:** **Bajo** (datos, no lógica). Gotcha: idempotencia exige borrar hijos en orden por FKs `NO ACTION`
(incl. `convenio.nota_id`). No debe correr en la suite e2e (rompe conteos).

**Dependencias:** ninguna. Conviene **después** de FASE 0–2 para que el seed refleje el sistema corregido.

**PROMPT:**
```
Soy Maiki. FASE 3 — ampliar el SEED de datos demo para la pre-entrega del 24-jun. LOCAL, sin commit/push. Es un
script de DATOS, no toques lógica de producción. Parte de backend/scripts/seed_demo.sql (ya existe: 1 contrato
completo + 4 en atraso) y de reset_demo.sql/js.
1) Asegura que el seed siga 100% válido tras los cambios de FASE 0-2 (expediente, estado de estimación, apertura).
2) Carga un paquete que permita demostrar TODO el 24:
   - 1 contrato DEMO completo y coherente (catálogo que cuadra al centavo, programa A2 al 100%, garantías, plan de
     amortización proporcional al programa art.143-I, roster con empresas, bitácora ABIERTA con apertura firmada y
     redacción completa -FASE 2-, avance, y estimaciones en TODOS los estados: integrada/presentada/autorizada/
     pagada/rechazada+reingreso). Di el neto esperado de cada estimación.
   - 5-6 contratos con AVANCE distinto y alertas que SALTEN (uno iniciado en enero para que el tablero/alertas
     muestren atraso de varios meses) -> demostrar HU-07/17/18.
   - 1 contrato con convenio modificatorio + su oficio de aprobación (placeholder o real según FASE 0C).
   - 1 contrato "limpio" pensado para llenarlo EN VIVO en la sesión "desde cero".
3) Idempotente (borra hijos en orden correcto por FKs NO ACTION, incluido convenio.nota_id), invocable por
   npm run seed:demo, que NO corra en los tests. Que también cargue en Render (mismo script).
4) Actualiza docs/SEED_DEMO_SIGECOP.md con: cómo correrlo, qué deja, y un GUION POR HU (qué cuenta, qué pantalla,
   qué valor se ve) para el 24. Suite verde (258/8/0). Reporta. NO push.
```

---

## FASE 4 — FINIQUITO (HU-24, NUEVA y OBLIGATORIA para cerrar el contrato)

> **El profe la declaró obligatoria:** *"Debe haber un cierre a fuerzas, entonces hay que agregar finiquito"*
> [20:19]. *"Si no, no puede cerrar el contrato"* [19:26]. *"El finiquito es una nota de bitácora y el cálculo
> de todo lo que te debo, lo que me debes"* [20:25]. *"No debe ser tan complicado si tienes todos los demás
> datos"* [20:32]. Y es donde se resuelve el sobrante de un periodo no estimado [11:01, 13:05–13:48].

### 4.1 Fundamento legal — **VERIFICADO en los PDF** (no inventado)

**LOPSRM — Art. 64** (`docs/legal/LOPSRM.pdf`, verificado): el contratista comunica la conclusión → la
dependencia verifica y tiene **15 días naturales** para la **recepción física** (acta) → recibidos
físicamente, las partes (plazo del contrato, **máx. 60 días naturales**) elaboran el **finiquito**, *"en el que
se hará constar los **créditos a favor y en contra** que resulten para cada uno, describiendo el concepto
general que les dio origen y el **saldo resultante**"*. Determinado el **saldo total**, la dependencia pone a
disposición el pago **o** solicita el reintegro, y levanta el **acta administrativa que da por extinguidos los
derechos y obligaciones**.

**RLOPSRM — Sección IX "Del finiquito y terminación del contrato"** (`docs/legal/Reg_LOPSRM.pdf`, verificado):
- **Art. 168** — para terminar (parcial/total) las obligaciones, las partes elaboran el finiquito; se **anexa el
  acta de recepción física**; tras el finiquito solo subsisten las acciones derivadas + la garantía de vicios
  ocultos (art. 66).
- **Art. 169** — la dependencia **notifica** al contratista (rep. legal/superintendente) fecha, lugar y hora del
  finiquito.
- **Art. 170 — contenido mínimo del documento de finiquito** (este es el machote a construir):
  I. lugar/fecha/hora · II. nombre y **firma del residente, supervisor (si aplica) y superintendente** ·
  III. descripción de los trabajos y datos relevantes del contrato · IV. **importe contractual y real**
  (volúmenes realmente ejecutados + convenios) · V. **periodo de ejecución** (inicio/fin contractual y real +
  convenios) · VI. **relación de estimaciones** con los **créditos a favor y en contra** de cada parte y el
  **saldo resultante** · VII. razones de **penas convencionales / sobrecosto** · VIII. **datos de la estimación
  final** · IX. constancia de garantía de vicios ocultos · X. declaración de finiquito amplio. *(Si la
  liquidación es ≤15 días naturales tras la firma, el documento sirve como acta de extinción.)*
- **Art. 171** — **saldo a favor del contratista** → se liquida en el plazo del art. 54 párr. 2; **saldo a favor
  de la dependencia** → se deduce de pendientes o se exige reintegro (art. 55) / se hacen efectivas garantías.
- **Art. 172** — el **acta administrativa de extinción** forma parte del contrato (lugar/fecha/hora, asistentes,
  descripción, relación de obligaciones y forma/fecha de cumplimiento, …).

> **Mapa profe→ley:** "nota de bitácora" → el finiquito se **asienta como nota** (art. 123 / Sección IX);
> "lo que te debo / lo que me debes" → **créditos a favor y en contra + saldo resultante** (art. 64 / 170-VI).
> El sobrante no estimado de un periodo y las retenciones por atraso entran aquí como saldos.

### 4.2 Alcance MVP (acotado para el 24)

**Objetivo:** dado un contrato con su ciclo, producir un **finiquito** que (1) calcule el **saldo** server-side,
(2) lo asiente como **nota de bitácora** de cierre, (3) marque el **contrato cerrado**, (4) sea imprimible (art.
170). **Una sola vez** por contrato (append-only, inmutable).

**Cálculo del saldo (server-side, fuente única, cuadre al centavo):**
```
importe_real_ejecutado      = Σ ejecutado·pu por concepto (lo realmente hecho, art. 64 / 170-IV)
total_estimado_autorizado   = Σ subtotales de estimaciones autorizadas/pagadas
anticipo_no_amortizado      = anticipo − Σ amortizaciones aplicadas
retenciones_por_atraso      = pena convencional pendiente (art. 46 Bis + 86-90 RLOPSRM)
saldo_a_favor_contratista   = importe_real_ejecutado − ya_pagado − anticipo_no_amortizado − retenciones
                               (si > 0: a favor del contratista, art. 171; si < 0: a favor de la dependencia)
```
**[validar profe]** la fórmula exacta y qué se incluye (¿5 al millar pendiente? ¿deductivas? ¿sobrecosto?). El
profe dijo *"no debe ser tan complicado si tienes los demás datos"* — empezar simple y marcar lo dudoso.

**Archivos probables (NUEVOS, fuera de congelado):**
- DDL **aditivo idempotente** (pásamelo a Maiki, no edites schema.sql tú): tabla `finiquitos` (1:1 contrato,
  saldos, estado, append-only con trigger de inmutabilidad) y/o `contratos.estado='cerrado'` (columna aditiva).
- `backend/src/controllers/finiquito.controller.js` + `finiquito.routes.js` (NUEVOS; Maiki los monta en
  `server.js`). Patrón: JWT, `esParteOSupervision`, cálculo server-side, nota vía `insertarNotaAtomica` en la
  misma tx, append-only.
- `frontend/src/pages/Finiquito.jsx` (NUEVA) — la ruta y el permiso de HU-24 **probablemente NO existen** en
  `App.jsx`/`permisos.js` (zona congelada); **NO los agregues**: pásame el bloque y los monto yo.
- Documento imprimible art. 170 (reusar patrón print).
- Historia nueva **HU-24** en `docs/analisis-y-diseno/Historias_Usuario_ACTUALIZADAS_12jun.md` (siguiente número
  libre, sin renumerar; redáctala ya en **lenguaje natural** como en FASE 1).

**Riesgo:** **Medio-Alto.** Toca DDL (aditivo, lo integra Maiki), un endpoint financiero nuevo (server-side, debe
cuadrar), y ruta/permiso nuevos (congelados → los mete Maiki). El cálculo legal es `[validar profe]`. Por eso va
de MVP y con la fórmula marcada para confirmar.

**Dependencias:** necesita que el contrato tenga estimaciones y avance (cubierto por el seed FASE 3). La ruta/
permiso en `App.jsx`/`permisos.js` los integra Maiki.

**PROMPT:**
```
Soy Maiki. FASE 4 — FINIQUITO como HU-24 (NUEVA, obligatoria para cerrar el contrato; profe 16-jun 18:55-20:32).
LOCAL, sin commit/push. NO edites zona congelada (schema.sql, App.jsx, permisos.js, server.js, auth, cálculo de
carátula): donde necesites DDL, ruta o permiso, ENTRÉGAME el bloque y yo lo integro.

PASO 0 — LEY (ya verificada en este plan, reconfírmala en los PDF): LOPSRM art. 64 (créditos a favor/en contra,
saldo resultante, acta de extinción; recepción física 15 días, finiquito máx 60 días) y RLOPSRM Sección IX arts.
168-172 (168 finiquito + acta recepción física; 169 notificación; 170 CONTENIDO MÍNIMO del documento; 171 saldos a
favor de cada parte art.54/55; 172 acta de extinción). Cita el artículo en cada validación.

ALCANCE MVP:
1) DDL aditivo idempotente (pásamelo, no toques schema.sql): tabla finiquitos (1:1 con contrato; importe_real,
   total_pagado, anticipo_no_amortizado, retenciones, saldo, a_favor_de, estado; append-only con trigger de
   inmutabilidad como las demás) y columna aditiva contratos.estado/cerrado_en (o equivalente). Idempotente
   (IF NOT EXISTS / guards). Probar 2-3x en local.
2) backend NUEVO: finiquito.controller.js + finiquito.routes.js (yo los monto en server.js).
   - GET prep: calcula el saldo SERVER-SIDE (fuente única, cuadre al centavo) reusando las consultas de avance/
     estimaciones/amortización ya existentes: importe_real_ejecutado (Σ ejecutado·pu, art.64/170-IV),
     total_estimado/pagado, anticipo_no_amortizado, retenciones por atraso (art.46Bis/86-90). saldo a favor del
     contratista o de la dependencia (art.171). MARCA [validar profe] la fórmula exacta (¿5 al millar pendiente?,
     deductivas, sobrecosto).
   - POST cerrar: con JWT + esParteOSupervision; en UNA transacción: inserta el finiquito, asienta la NOTA DE
     BITÁCORA de finiquito (insertarNotaAtomica, emisor=residente art.53), y marca el contrato cerrado. Una sola
     vez por contrato (append-only; 409 si ya hay finiquito). NO permitir cerrar si faltan condiciones (define
     cuáles y márcalas).
3) frontend NUEVO: Finiquito.jsx con el resumen de saldos (a favor/en contra), el botón "Cerrar contrato
   (finiquito)" con confirmación, y el DOCUMENTO IMPRIMIBLE con el contenido mínimo del art. 170 (reusa el patrón
   print existente, no metas librería nueva). La ruta y el permiso de HU-24 en App.jsx/permisos.js: si NO existen,
   pásamelos y yo los integro; NO los edites tú.
4) Historia NUEVA HU-24 en docs/analisis-y-diseno/Historias_Usuario_ACTUALIZADAS_12jun.md (siguiente número libre,
   sin renumerar) en LENGUAJE NATURAL (estilo FASE 1), con criterios = comportamiento real. Tests del cálculo
   (saldo a favor / en contra / cero) y del cierre único. Suite verde. Actualiza ESTADO_ACTUAL.md. Reporta
   archivo:línea + el DDL y la ruta/permiso que debo integrar. NO push.
```

---

## FASE 5 — Rediseño del ambiente de estimación por bloques (el grande del 24)

> **Esto es lo que el profe calificará el 24.** Su queja de fondo: *"están ocupando una interfaz para muchas
> cosas… atascas todo en una sola cosa… no aíslas el ambiente de estimación porque está el resumen de todas las
> estimaciones"* [11:18–16:56]. Quiere un **flujo por bloques, como el alta**, en un **contexto aislado** de una
> estimación concreta.

> **Visión de Maiki (marco del rediseño):** el patrón "wizard por bloques" del alta es la **forma que debe tener
> SIGECOP como SISTEMA REAL** — guiar al usuario paso a paso en lugar de hacerlo "moverse entre pestañas". La
> estimación es **el primer flujo grande** que adopta ese patrón (y el calificable del 24); el resto del sistema
> lo seguirá **después** (FASE 6). **Regla invariante:** el wizard **ENVUELVE el cálculo/lógica existente** (zona
> congelada), nunca lo reescribe.

### 5.1 El flujo que pidió (literal, [14:33–17:46])

```
1. "Nueva estimación" → elijo NÚMERO de estimación (p.ej. la 4). No pide fechas (ya las sabe del periodo).
   Candado de estado: si esa estimación ya está presentada → no deja (FASE 0D ya lo cubre).
2. GENERADORES primero  → "empiezas por los generadores"  → al acabar dan el RESUMEN/concentrado (conceptos juntos).
3. Complemento de datos → "cuánto se ha estimado, cuánto falta, cuánto es este periodo".
4. CARÁTULA automática  → "la carátula ya te dice lo que vas a cobrar, el 5 al millar, etc." (ENVUELVE el cálculo).
5. SOPORTES + NOTAS + REGISTRO FOTOGRÁFICO → "adjunta los soportes, adjunta las notas".
6. CIERRE con CANDADO   → "cerrar, candadito, ¿seguro que vas a cerrarla?" + se despliega todo lo que llevó.
7. ENVÍO a REVISIÓN     → "¿quieres enviar? seguro. Enviar" → "No, a revisión. Revisión primero."
EL HISTORIAL VA APARTE  → "no me interesa ver el historial… va aparte… lo tenías en otra historia" (HU-14).
```

**Opción para estimar sin referencia de programa** [13:48–14:33]: cuando se estima fuera del molde del programa,
*"no pones la referencia del programa de obra, sino los conceptos que sí, le pones palomita, aceptar, y eso es lo
que vas a estimar"* — selección de conceptos con checkbox.

### 5.2 Alcance y partición

- **Shell del wizard (🟢 Maiki, realista 24):** un **ambiente aislado** (`/estimacion/nueva/:contrato` o modal a
  pantalla completa) que va por bloques (1, 3, 4, 6, 7) **envolviendo el cálculo y los endpoints existentes**
  (`estimacion-prep.controller.js` para "disponible/carátula viva" y `estimaciones.controller`/
  `estimaciones-ciclo` para integrar/presentar). **NO se reescribe el cálculo.** El resumen/historial se **saca**
  de este ambiente y queda en su pantalla (HU-14).
- **Bloque de GENERADORES (🟣 E3, dependencia):** el paso 2 depende de los **generadores de E3** (en el audio:
  *"esperemos que Lalo tenga cuenta… empiezas por los generadores"*). El shell debe **dejar el hueco** y
  enchufarlo cuando E3 entregue.
- **Soportes/notas/fotos (🟣 E3 + 🔵 notas):** el paso 5 reusa las notas firmadas vinculadas (O8, ya existe) y el
  esqueleto de soportes/fotos (E3, registro fotográfico art. 132).

**Archivos probables:**
- `frontend/src/pages/IntegracionEstimacion.jsx` (hoy mezcla todo) → se **descompone**: el cálculo/preview se
  conserva, la vista se reorganiza en bloques; el resumen sale a `HistorialEstimaciones.jsx`.
- Nueva página/contenedor del ambiente (p.ej. `frontend/src/pages/AmbienteEstimacion.jsx`) — ruta nueva
  (congelada → la integra Maiki).
- Reusa `estimacion-prep.controller.js`, `estimaciones-ciclo.controller.js` (no congelados). **Sin tocar** el
  cálculo de la carátula.

**Riesgo:** **Alto.** Reorganización grande de UI con dependencias (E3 generadores/soportes/fotos) y ruta nueva.
Para el 24 se entrega el **shell completo** (aislar + bloques + carátula automática + cierre/candado + envío a
revisión), con el bloque de generadores conectado **si** E3 ya lo tiene; si no, placeholder marcado.

**Dependencias:** **🟣 E3 generadores** (bloqueante del paso 2 completo) · ruta nueva (Maiki) · no romper el ciclo
reconciliado O7↔HU-15 ni los specs.

**PROMPT:**
```
Soy Maiki. FASE 5 — REDISEÑO del ambiente de estimación como FLUJO POR BLOQUES tipo el alta (profe 16-jun,
11:18-17:46). Es lo CALIFICABLE del 24. LOCAL, sin commit/push. REGLA DURA: el wizard ENVUELVE el cálculo y los
endpoints existentes; NO reescribas el cálculo de carátula ni G1-G8 (zona congelada). NO toques
App.jsx/permisos.js/server.js: si necesitas ruta nueva, pásamela y la integro yo.

MARCO (visión Maiki): este wizard es el primer flujo que le da a SIGECOP forma de SISTEMA REAL (guiar por pasos,
no "moverse entre pestañas"). El mismo patrón se llevará a otros flujos DESPUÉS (no en esta fase).

Lee primero ESTADO_ACTUAL.md §5.4 (carátula viva), estimacion-prep.controller.js, estimaciones-ciclo.controller.js
e IntegracionEstimacion.jsx para entender qué YA calcula el backend.

OBJETIVO: aislar el "ambiente de estimación" en un contexto propio (página o modal a pantalla completa) que va por
bloques, SACANDO de ahí el resumen/historial (el profe: "no aíslas el ambiente porque está el resumen… el historial
va aparte"). El historial se queda en HistorialEstimaciones.jsx (HU-14).

BLOQUES (envolviendo lo existente):
1) Nueva estimación: elegir NÚMERO de estimación; candado de estado (FASE 0D: si ya está presentada, no deja).
2) GENERADORES primero -> concentrado. DEPENDENCIA E3: si los generadores de E3 ya existen, enchúfalos; si no,
   deja el bloque como placeholder claramente marcado "pendiente E3" SIN romper el flujo. (También soporta estimar
   por SELECCIÓN de conceptos con checkbox cuando no se sigue el molde del programa, audio 13:48-14:33.)
3) Complemento de datos (cuánto estimado / falta / este periodo) — leídos de estimacion-prep (ya existe).
4) CARÁTULA AUTOMÁTICA: muestra la carátula que YA calcula el backend (subtotal, amortización, 5 al millar, neto).
   Es PREVIEW; el backend materializa la oficial al integrar. NO recalcular nada nuevo.
5) Soportes + notas firmadas (O8, ya existe) + registro fotográfico (esqueleto E3, placeholder si no está).
6) CIERRE con candado: "¿seguro que vas a cerrarla?" + desplegar TODO lo que llevó (resumen de la estimación).
7) ENVÍO a REVISIÓN (no a pago): reusa el endpoint enviar/presentar (estado 'integrada' -> 'enviada' = Presentada).

ENTREGABLE PARA EL 24: el SHELL completo (bloques 1,3,4,6,7 funcionando sobre el cálculo actual; 2 y 5 enchufados
si E3 los tiene, placeholder si no). No rompas el ciclo O7<->HU-15 ni los specs existentes (ajústalos). Marca con
TODO/[E3] lo que queda pendiente de generadores/soportes/fotos. Suite verde. Actualiza ESTADO_ACTUAL.md y las HU
de estimación (HU-12/13/14) en lenguaje natural. Reporta archivo:línea + la ruta nueva que debo integrar. NO push.
```

---

## FASE 6 — (POST-24) Patrón wizard al resto del sistema: bitácora y otros flujos

> **No es para el 24.** Es la **visión de producto de Maiki**: una vez probado el patrón en la estimación, llevar
> el **mismo flujo por bloques** a los demás procesos para que SIGECOP se sienta un **sistema real** y se deje de
> *"mover entre pestañas"*. Atiende de fondo la misma crítica del profe ([11:18]) más allá de la estimación.

**Candidatos al patrón (incremental, uno por iteración):**
- **Bitácora (🔵 E2 + 🟢 Maiki):** flujo guiado **abrir → emitir nota (machote por tipo, art. 125) → firmar →
  consultar**, en vez de saltar entre Apertura/Emisión/Consulta. Envuelve la lógica de notas/firmas existente.
  Conecta con FASE 2 (la apertura ya redacta con todos los datos) → es el siguiente natural.
- **Convenio modificatorio (HU-03):** **gestionar → subir oficio de aprobación (FASE 0C) → versionar programa →
  asentar nota** como un flujo de cierre, no pestañas sueltas.
- **Finiquito (HU-24):** ya nace como flujo de cierre (cálculo → revisión → candado → documento, FASE 4); encaja
  en el patrón sin trabajo extra.
- **Tejido conector:** una navegación por **ciclo de vida del contrato** (alta → bitácora → avance → estimación →
  convenios → finiquito) que reemplace el grid de pestañas — el alta y la estimación ya son wizards; el resto se
  va sumando.

**Realista:** **después del 24**, incremental, una pantalla a la vez. **Regla invariante** (igual que FASE 5):
cada flujo **envuelve** la lógica/cálculo existente (zona congelada), **no la reescribe**; bitácora es dominio de
E2 → se coordina por PR. **No bloquea la pre-entrega**; es dirección, no requisito calificable del 24.

**PROMPT (esqueleto, para después del 24 — NO ejecutar antes):**
```
Soy Maiki. FASE 6 (POST-24) — llevar el patrón "wizard por bloques" de la estimación a la BITÁCORA (y luego a
convenios). LOCAL, sin commit/push. REGLA: envolver la lógica existente, NO reescribirla; zona congelada intacta;
bitácora es de E2 -> coordinar por PR. Empezar por un flujo guiado de bitácora (abrir -> emitir nota por tipo ->
firmar -> consultar) que reuse el ciclo de notas/firmas actual y la apertura con datos completos de FASE 2.
Entregar UNA pantalla a la vez, con su historia en lenguaje natural y ESTADO_ACTUAL.md actualizado. (Detallar
alcance y archivos cuando se priorice, ya pasada la pre-entrega.) NO push.
```

---

## FASE 7 — Pendientes de equipos y decisiones (no para el 24 por Maiki)

**De equipos (por PR, no Maiki):**
- 🔵 **E2:** cerrar HU faltantes de bitácora/documental/avance que el profe aún no ve [24:26]; redacción narrativa
  de apertura (coordina con FASE 2); luego, el patrón wizard de bitácora (FASE 6).
- 🟣 **E3:** **generadores** reales (bloqueante de FASE 5 paso 2), soportes/carpeta y **registro fotográfico**
  (art. 132), tablero/curva pendientes [24:26].

**Decisiones `[validar profe]` / de Maiki (NO las decide Code):**
- ⚖️ Fórmula exacta del **finiquito** (qué saldos incluye: 5 al millar pendiente, deductivas, sobrecosto) — FASE 4.
- ⚖️ **Ubicación de la obra** como campo del alta (¿agregar `contratos.ubicacion`?) — FASE 2.
- ⚖️ **Oficio del convenio**: tabla nueva vs `contrato_documentos` con tipo — FASE 0C.
- ⚖️ Criterios finales del **buscador del expediente** (qué se queda además de quitar empresa/folio) — FASE 0B.
- ⚖️ Historias: ¿reescribir **sobre el mismo archivo** o versión "para el profe" separada de la técnica? — FASE 1.
- ⚖️ Amortización Fase B (¿la carátula obedece el plan editable o sigue proporcional? — hoy proporcional, art.
  143-I) — pendiente histórico.
- ⚖️ CMIC / 2 al millar; cédula profesional; vista de catálogo de Empresas; separar dependencias — pendientes
  históricos (`REQUERIMIENTOS_PROFE_CONSOLIDADO §8`).

---

## 6. Qué es realista para el 24-jun (resumen ejecutivo)

| Fase | Entregable | ¿24-jun? |
|---|---|---|
| 0 | Expediente (programa sin ejecución, buscador limpio, sección oficio del convenio) + presentar-por-estado | ✅ **Sí** |
| 1 | Historias de usuario en lenguaje natural (legibles por el profe) | ✅ **Sí** (independiente) |
| 2 | Nota de apertura con todos los datos del alta + imprimible | ✅ **Sí** |
| 3 | Seed multi-contrato + guion por HU | ✅ **Sí** |
| 4 | Finiquito HU-24 **MVP** (cálculo de saldo + nota + cierre + documento art. 170) | 🟡 **Sí, acotado** (fórmula `[validar]`) |
| 5 | Ambiente de estimación por bloques — **shell completo** (envuelve el cálculo) | 🟡 **Sí en su shell** (generadores/fotos dependen de E3) |
| 6 | Patrón wizard a bitácora y otros flujos | ❌ **No — POST-24** (visión de producto) |
| 7 | HU de E2/E3 + decisiones legales | ❌ **No** (PRs de equipo / profe) |

**Recomendación de foco para Maiki:** cerrar **FASES 0, 1, 2, 3, 4** al 100% (todo es tuyo y de bajo/medio
riesgo) y llevar la **FASE 5 como shell demostrable**. Eso convierte las quejas directas del profe en mejoras
visibles, deja las **historias legibles** (que él lee en la revisión), cubre el **cierre obligatorio** (finiquito)
y deja el **rediseño estructural encaminado**, dependiendo solo de que E3 entregue generadores. La **FASE 6**
(patrón wizard al resto del sistema) es la dirección a la que apunta todo esto, **después** del 24.

---

## 7. ⏰ Recordatorio — decisión de BD (expira ~25-jun, coincide con la entrega)

El **PostgreSQL plan free de Render expira ~25-jun-2026** (ESTADO_ACTUAL §8, riesgo #1) — **el mismo día que la
revisión/entrega**. El ANALISIS lo marca 🔴 **CRÍTICO, "DECIDIR YA"**: si la BD se cae a media entrega es
**catastrófico** (pre-entrega 24, calificaciones 26). Es una decisión **de Maiki, no técnica de este plan**, y no
se mueve sola — conviene resolverla **antes del lunes 22**:
- **Opción A — pagar** el plan para conservar la instancia y los datos.
- **Opción B — instancia nueva** + restore desde backup (runbook ensayado en O0,
  `docs/historial/oleadas/OLEADA0_continuidad_bd_09jun.md`).

**Acción mínima antes del 24:** tener un **backup fresco** y validado, y la demo capaz de levantarse **en local
con el seed (FASE 3)** por si la BD de Render cae justo en la entrega. **No dejar la pre-entrega dependiendo solo
de Render.**

---

> **Tras ejecutar cada fase (regla CLAUDE.md):** actualizar `docs/contexto-claude/ESTADO_ACTUAL.md` (cabecera +
> contenido), revisar/agregar la historia afectada (HU-24 para finiquito, sin renumerar) **en lenguaje natural**,
> citar el artículo o marcar `[validar profe]`, y no dejar dos docs de estado compitiendo. Suite objetivo
> 258/8/0. **Nada de push.**
