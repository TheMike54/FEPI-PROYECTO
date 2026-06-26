# SIGECOP — Plan de resolución de pendientes (preentrega 25-jun → entrega 26-jun)

> **Qué es esto:** propuesta de ejecución para que **Maiki apruebe**. Una ficha por pendiente (P0–P5 + Anexo A)
> con enfoque, archivos reales verificados contra el repo, si toca zona congelada, si necesita mockup, riesgo,
> esfuerzo, dependencias y cita legal. **NADA de esto está implementado.** Insumos: `docs/pendientes/PENDIENTES_MAESTRO_25jun.md`,
> `docs/audios/Combinado_2026-06-25_2145.md`, `docs/mockups/estimacion_completa_25jun.html` (APROBADO),
> `docs/estado/ESTADO_ACTUAL.md`, `CLAUDE.md` (zona congelada).
>
> **Cómo evalúa el profe (regla de oro del plan):** palomita/tache, **solo en pantalla**, sin crédito parcial.
> Por eso P1 (lo que VE) manda sobre todo lo interno. **Code trabaja LOCAL sin commit; Maiki revisa diffs e integra.**

---

## 0. Decisiones abiertas — SURFACE, NO resolver (cerrar ANTES de tocar código)

Estas dos no las decide Code. Van primero porque bloquean parte del batch.

| # | Decisión | Quién | Por qué urge |
|---|---|---|---|
| **D1 (P2-2)** | **¿Se quita la foto OBLIGATORIA de avance?** Hay **conflicto directo**: el 25-jun el profe dijo *"foto obligatoria NO va ahí… bórralo"* y *"¿por qué estamos hablando de fotos?"*; pero `TrabajosTerminados.jsx:143` ya la implementó como **obligatoria server-side** el 25-jun (`fotos.length > 0` gatea el registro, línea 270), citando art. 132 fr. IV RLOPSRM (que es **discrecional**, no obligatorio). La memoria del equipo siempre dijo: foto = **criterio del equipo, NO ley**. **Si el profe la quiere fuera, hay que revertir el gate** (volverla opcional) y avisar al equipo (P5-3a). | **Maiki/profe** | Si se deja obligatoria y el profe la quiere fuera = **tache visible**. Es revertir un gate, no construir. |
| **D2 (P1-9a)** | **Verificar EN PANTALLA** que la sustitución de roster **ya bloquea** con notas/firmas pendientes (Maiki cree que sí; el código `roster.controller.js` tiene el guard). No es construir: es **probar y palomear**. | **Maiki** (prueba en vivo) | Si ya funciona, P1-9 se reduce a (b) y (c). Si no, sube de prioridad. |
| **D3 (carátula IVA)** | ✅ **RESUELTA (25-jun, Maiki):** Secciones 1 y 2 **sin IVA** (art. 2 fr. XIX RLOPSRM); **Sección 3 "Del neto a recibir" CON IVA** (16% estimación − 16% amortización), como el formato GACM real. **Ya implementado en T1** (`DocumentoCaratula.jsx`): IVA derivado en presentación, no muta la carátula inmutable; cuadra al centavo con el `neto` del backend. | ~~Maiki/profe~~ cerrada | Bloque 3 = recap con IVA. |

---

## 1. Orden de ejecución sugerido (~24 h)

Prioridad: **lo que el profe ve en pantalla (P1) primero**, agrupado por "una corrida = mismo dominio, sin recompilar a ciegas".

### 🟢 BATCH A — "alta + carátula visibles" (frontend puro · sin mockup nuevo · NO toca congelado) — **arrancar ya**
Todo vive en páginas/componentes editables. Es lo más barato y lo que más palomitas da.
1. **P1-1** carátula: exponer TODOS los campos (incl. **importe de anticipo**) en el preview del wizard — *los datos ya los manda el backend*.
2. **P1-5** unidad obligatoria (gate cliente en el catálogo del alta).
3. **P1-6** rechazar negativos (gate cliente en la matriz del programa).
4. **P1-4** validación de fechas (inicio coherente + anticipo ↔ vigencia de fianza).
5. **P1-8** scope a un contrato (quitar las superficies cross-contract que queden) + quitar cola "Por firmar" global.
6. **P2-5** (#20) ocultar botón firmar cuando venció el plazo (cosmético; backend ya da 409).

### 🟡 BATCH B — "generadores + selectores" (necesitan mockup; el de estimación YA está aprobado)
7. **P1-2** generadores: resumen global + generador por concepto + soportes por generador → **el mockup `estimacion_completa_25jun.html` ya lo define**; se ejecuta contra él.
8. **P1-3** selector de contraparte (empresa → persona filtrada) en el alta → mockup mínimo o directo (es claro).
9. **P1-7** nota de apertura con formato exacto + re-añadir identificación del presentante → **mockup mínimo del formato** (no hay foto del formato aún).

### 🟠 BATCH C — "reglas de roster" (lógica, NO congelado)
10. **P3-1** supervisión externa puede ser de **otra empresa** (exime a supervisión de la REGLA 4).
11. **P1-9 b/c** extender el guard de sustitución a los **3 roles** + **regla temporal de firmas** (saliente no firma tras su baja; entrante no firma antes de su alta).

### 🔴 BATCH D — REQUIERE OK MAIKI (zona congelada) — entregar como **diff/propuesta**, no aplicar
- Endurecimiento server-side de **P1-4 / P1-5** (`contratos.controller::crearContrato`).
- Rechazo server-side de **P1-6** (`lib/programa.js::guardarMatriz`, lo consume el controller congelado → coordinar).
- **P3-3 / P0-2** sesión `token_version` (auth congelado) — atado al reparto de cuentas.

### 🔵 PARALELO (no es Code) — Maiki / equipo humano
- **P0-1** `pg_dump` de respaldo de Render. **P0-2** reparto de 23 cuentas (runbook). **P2-1..P2-4 + P1-9a + P1-7-flujo**: **verificar en pantalla** (no construir). **P4** entregable académico (riesgos + planes + resultados).

> **Justificación del batching:** A es 100% frontend en archivos no congelados → una sola corrida, smoke al final, cero riesgo de schema/auth. B depende de mockup (regla del proyecto: no mandar generadores/selector/nota "a ciegas"). C es backend no congelado de un solo dominio (`roster`). D se separa porque tocar `crearContrato`/`guardarMatriz`/auth exige revisión de Maiki y backup previo. El PENDIENTES ya proponía juntar P1-4/5/6/8 con la carátula; lo confirmo y le saco P1-2/3/7 al batch barato porque sí necesitan mockup.

---

## 2. Fichas por pendiente

> **Leyenda zona congelada:** ⚠️ **OK MAIKI** = el archivo está en la lista congelada de `CLAUDE.md`; **no se edita**, se entrega diff o se usa el patrón de archivo nuevo. ✅ **libre** = editable por Code en local.

---

### P0 — Bloqueantes de demo

#### P0-1 · Respaldo de la BD de Render (`pg_dump`)
- **Enfoque:** `pg_dump` de la base pagada **ya**, para no depender del free de nuevo. Guardar el dump fuera del repo.
- **Archivos:** ninguno de código. Runbook existente `docs/planes/RUNBOOK_BD_RENDER_21jun.md`.
- **Congelada:** N/A (operativo). **Mockup:** no. **Riesgo:** bajo. **Esfuerzo:** S (15 min).
- **Dependencias:** ninguna. **Cita:** N/A.
- **Responsable:** **Maiki** (no Code).

#### P0-2 · Reparto de cuentas al equipo en Render
- **Enfoque:** ejecutar `REPARTO_EQUIPO_RENDER_25jun.md` (backup → seed 23 cuentas → reasignar SOP-002..006 → verificar). **Sin esto el equipo no prueba.** Atado a P3-3 (la sesión única `last-login-wins` los saca entre sí).
- **Archivos:** scripts en `backend/scripts/` (seed de cuentas) + el runbook citado.
- **Congelada:** N/A (operativo Maiki). **Mockup:** no. **Riesgo:** medio (toca la BD viva). **Esfuerzo:** M.
- **Dependencias:** **bloquea** que el equipo verifique P2-*. Relacionado con **P3-3**.
- **Cita:** N/A. **Responsable:** **Maiki**.

---

### P1 — 🟥 Taches en pantalla (máxima prioridad)

#### P1-1 · Carátula de estimación incompleta
- **Enfoque:** el documento imprimible (`DocumentoCaratula.jsx`) **ya** trae los 3 bloques y todos los importes (incl. `importe_anticipo`). El hueco que vio el profe está en el **preview del wizard** (paso "Carátula") y en el **etiquetado**: exponer TODOS los campos del Anexo A (importe del contrato, estimado acumulado anterior, estimación actual, acumulado actual, saldo por estimar, **importe de anticipo**, amortización de esta estimación, neto) y renombrar a las **3 secciones literales** del profe/mockup ("1. Importes sin incluir IVA · 2. Del anticipo · 3. Del neto a recibir"). **Los datos YA vienen del backend** (`estimaciones.controller.js::detalleEstimacion` líneas 519-538 devuelve `acumulados.sin_iva` y `acumulados.anticipo`; `estimacion-prep.controller.js:54,165` devuelve `contrato.importe_anticipo` para el preview) → **no se toca backend**.
- **Archivos:** `frontend/src/pages/IntegracionEstimacion.jsx` (preview de carátula) · `frontend/src/components/estimacion/DocumentoCaratula.jsx` (relabel a 3 secciones + verificar Sección 3 según D3). Referencia: `docs/mockups/estimacion_completa_25jun.html`.
- **Congelada:** ✅ **libre** (ambos son página/componente, no congelados; el backend NO se toca). **Mockup:** **sí — ya aprobado** (`estimacion_completa_25jun.html`).
- **Riesgo:** bajo (presentación). **Esfuerzo:** M.
- **Dependencias:** **D3** (decisión IVA Sección 3). Comparte demo con P1-2.
- **Cita:** importes **sin IVA** (RLOPSRM art. 2 fr. XIX); amortización proporcional (RLOPSRM art. 143 fr. I); estimación presenta/autoriza, plazo 15 días (LOPSRM art. 54); 5 al millar (LFD art. 191 `[validar]`).

#### P1-2 · Generadores de estimación incompletos
- **Enfoque:** tres faltantes según el mockup: **(a)** cuadro **resumen global por concepto** ("el resumen de todo lo que estás estimando"); **(b)** **generador por concepto** (concepto+clave, unidad, cantidad según proyecto/catálogo, ejecutado del periodo, total estimado); **(c)** **soportes vinculados a CADA generador** con su **nota de bitácora de entrega** (no soportes genéricos). El backend ya persiste generadores (`estimacion_generadores`) y la carátula ya pinta un "Resumen de conceptos" (`DocumentoCaratula.jsx:162-209`); falta el **detalle por generador** + el **vínculo soporte↔generador↔nota**. La foto por generador ya existe (`FotosEstimacion.jsx` modo `porGenerador`, follow-on 23-jun) y la carga binaria de soportes (`cobro_soportes`) también — hay que **mostrarlos vinculados** al renglón.
- **Archivos:** `frontend/src/pages/IntegracionEstimacion.jsx` (paso Generadores/Soportes) · `frontend/src/components/FotosEstimacion.jsx` · `frontend/src/components/estimacion/DocumentoCaratula.jsx` (resumen) · lectura `frontend/src/services/api.js`. **Si falta exponer el vínculo soporte→nota desde el backend** → revisar `estimacion-prep.controller.js` / `estimaciones-ciclo.controller.js` (**ambos NO congelados**, Equipo 3).
- **Congelada:** ✅ **libre** (páginas + controllers de ciclo no congelados). **Mockup:** **sí — ya aprobado**.
- **Riesgo:** medio (es lo que más miró el profe). **Esfuerzo:** **L**.
- **Dependencias:** P1-1 (misma pantalla). Necesita que el contrato demo tenga generadores con periodo en curso (datos seed).
- **Cita:** números generadores art. 132 RLOPSRM (fr. IV foto); soporte ligado a nota de bitácora arts. 122-125 RLOPSRM; la residencia autoriza verificando generadores art. 113 fr. IX RLOPSRM `[validar]`.

#### P1-3 · Alta — selector de contraparte (empresa) + persona
- **Enfoque:** añadir en el alta un **selector de EMPRESA (contratista)** y, dependiente de él, el **selector de PERSONA filtrado a esa empresa** (nombre real, no cuenta del sistema). El profe fue explícito: **NO rehacer el schema a N:M**; solo exponer el selector apoyado en lo que ya está en la base. Ya existe el endpoint `api.personasDeEmpresa(id)` → `GET /empresas/:id/personas` y `api.listarAsignables(rol)`; los asignables ya cargan `empresa`/`empresa_id` (`AltaContrato.jsx:298-327`). Es **frontend**: agregar el `<select>` de empresa, filtrar la lista de personas por la empresa elegida, y mostrar el **nombre** (no la cuenta). Aplica igual a contratista (superintendente) y supervisión.
- **Archivos:** `frontend/src/pages/AltaContrato.jsx` (bloque "Equipo del contrato", `select-superintendente` y supervisión) · lectura `frontend/src/services/api.js` (`personasDeEmpresa`, `listarAsignables`). Endpoint backend: `backend/src/controllers/empresas.controller.js` (**NO congelado**) — ya existe, no se toca.
- **Congelada:** ✅ **libre** (página + endpoint existente). `contratos.controller::crearContrato` sigue recibiendo `superintendenteId`/`dependenciaId` igual → **no se toca el congelado**. **Mockup:** **conviene mockup mínimo** (es claro, pero el profe palomeará "el cierre de esa pantalla").
- **Riesgo:** medio. **Esfuerzo:** M.
- **Dependencias:** que el padrón de empresas tenga personas asociadas (seed). El profe dijo *"el cierre de esta primera página = contraparte + selector de persona"*.
- **Cita:** modelo empresa→persona = decisión ya confirmada (no se cita ley; es diseño); supervisión = tercero independiente (criterio).

#### P1-4 · Validación de fechas (rota)
- **Enfoque:** en el alta, validar **inicio coherente** (no permitir fechas absurdas), **fecha de anticipo ↔ vigencia de la fianza/póliza** (deben corresponder), y mantener **plazo = días naturales con fin derivado** (ya existe `derivarTermino`). El profe demostró que **dejó guardar** una fecha mala y un anticipo que no coincide con la póliza. Reforzar el `validarPaso` del cliente (visible) y proponer el espejo server-side a Maiki (ver P1-4-back).
- **Archivos:** `frontend/src/pages/AltaContrato.jsx` (`validarPaso`, fechas: `dg-fecha`/`fechaInicio:258`, garantías `garantia-vigencia:684`, `anticipo-input:630`).
- **Congelada:** ✅ **libre** (cliente). **Mockup:** no.
- **Riesgo:** medio (no romper el cuadre del alta que ya funciona). **Esfuerzo:** M.
- **Dependencias:** ninguna. **Cita:** plazo en días naturales / fin derivado del plazo (criterio, alta certeza); anticipo art. 50 LOPSRM.

##### P1-4-back · Endurecimiento server-side de fechas — ⚠️ **OK MAIKI**
- **Enfoque:** el gate cliente lo puede saltar quien pegue al API directo. Proponer validación de fechas en `crearContrato`.
- **Archivos:** `backend/src/controllers/contratos.controller.js::crearContrato` — **CONGELADO**. **No editar:** entregar **diff** a Maiki.
- **Congelada:** ⚠️ **OK MAIKI**. **Riesgo:** alto (núcleo del alta). **Esfuerzo:** S. **Dependencias:** P1-4. **Cita:** ídem.

#### P1-5 · Unidad obligatoria en conceptos
- **Enfoque:** bloquear guardar un concepto **sin unidad** (incluido el caso "Otro" con texto vacío). Hoy el catálogo del alta tiene `concepto-unidad-${i}` con opción "Otro" → input libre (`AltaContrato.jsx:363-378`); el profe guardó "Otro" con unidad vacía. Reforzar `validarPaso` del catálogo para exigir `unidad` no vacía por fila.
- **Archivos:** `frontend/src/pages/AltaContrato.jsx` (`validarPaso` del paso catálogo).
- **Congelada:** ✅ **libre** (cliente). **Mockup:** no. **Riesgo:** bajo. **Esfuerzo:** S.
- **Dependencias:** ninguna (batcheable con P1-4/6). **Cita:** catálogo con unidades RLOPSRM art. 45 ap. A `[validar]`.

##### P1-5-back · Unidad obligatoria server-side — ⚠️ **OK MAIKI**
- **Enfoque:** `crearContrato` hoy valida clave/cantidad/pu por fila (ESTADO_ACTUAL §5.1) pero **no** la unidad. Proponer que exija `unidad` no vacía (400).
- **Archivos:** `backend/src/controllers/contratos.controller.js::crearContrato` — **CONGELADO**, diff a Maiki.
- **Congelada:** ⚠️ **OK MAIKI**. **Riesgo:** medio. **Esfuerzo:** S. **Dependencias:** P1-5.

#### P1-6 · Cantidades negativas
- **Enfoque:** rechazar negativos en la **matriz del programa** (y montos). En el cliente: `min={0}` en los inputs de la matriz + `validarPaso` que rechace `< 0` con mensaje claro (hoy "pasa a la siguiente y ya no deja", pero deja teclearlo y verlo). El profe: *"debería no dejar."*
- **Archivos:** `frontend/src/pages/AltaContrato.jsx` (matriz del programa, `validarPaso`).
- **Congelada:** ✅ **libre** (cliente). **Mockup:** no. **Riesgo:** bajo. **Esfuerzo:** S.
- **Dependencias:** batcheable con P1-4/5. **Cita:** criterio (no ley).

##### P1-6-back · Rechazo server-side de negativos — ⚠️ **coordinar con Maiki**
- **Enfoque:** `lib/programa.js::guardarMatriz` hoy **ignora** `cantidad <= 0` (línea 173: `if (!(Number(c.cantidad) > 0)) continue;`) — los salta en silencio, no los rechaza. Proponer **rechazar `cantidad < 0`** (throw) y seguir saltando `=0`/vacío (celda no asignada).
- **Archivos:** `backend/src/lib/programa.js::guardarMatriz`. **Matiz:** `lib/programa.js` **NO está en la lista congelada**, pero lo **consume `crearContrato` (congelado)** → cambiar su comportamiento afecta al alta. **Coordinar con Maiki** aunque el archivo sea editable.
- **Congelada:** ⚠️ archivo libre pero **OK MAIKI por dependencia**. **Riesgo:** medio. **Esfuerzo:** S. **Dependencias:** P1-6.

#### P1-7 · Nota de apertura con formato exacto + presentante + flujo de 2 pantallas
- **Enfoque:** tres cosas: **(a)** la primera nota debe imprimir el **formato exacto**: No. de bitácora, **fecha y hora**, dependencia, contratista, contrato, objeto/concepto del contrato; **(b)** **re-añadir la identificación del presentante** (la quitaron; el profe: *"es la ley"*) — el presentante = residente que apertura, del JWT; **(c)** verificar el **flujo de 2 pantallas**: tras el alta, el sistema debe **llevar a abrir la bitácora**. *Hallazgo:* el redirect **ya existe** (`AltaContrato.jsx:1831-1836` → `navigate('/bitacora/apertura?contrato=...')`) y la apertura ya captura datos mínimos art. 123 fr. III (`AperturaBitacora.jsx`); el profe dijo que **no se lo pidió** → primero **verificar en pantalla** por qué no disparó, luego ajustar formato + presentante.
- **Archivos:** `frontend/src/pages/AperturaBitacora.jsx` (render del acta) · `frontend/src/components/notas/DocumentoNota.jsx` (nota imprimible) · `backend/src/controllers/bitacora.controller.js` (`resumenApertura`/`abrirBitacora` — **NO congelado**, agregar presentante a la redacción) · verificar `AltaContrato.jsx:1831-1836` (redirect).
- **Congelada:** ✅ **libre** (`bitacora.controller` no está congelado; páginas tampoco). **Mockup:** **sí — mockup mínimo del formato de la nota** (no hay foto del formato).
- **Riesgo:** medio. **Esfuerzo:** M.
- **Dependencias:** verificación de flujo (P1-7c) primero. **Cita:** bitácora de **uso obligatorio** RLOPSRM art. 122; datos/registro de notas arts. 123-125 RLOPSRM (datos mínimos art. 123 fr. III; aceptación tácita al vencer el plazo); la apertura abre antes de la fecha de inicio (LOPSRM `[validar art. exacto]`).

#### P1-8 · Scope a un solo contrato + quitar cola cross-contract
- **Enfoque:** al elegir un contrato, **dejar de ver los demás**. Hoy `AppShell.jsx` ya filtra los pendientes por contrato activo (`enContrato(p.contrato_id)`, línea 199) y ya se retiró el botón ✍️ separado (líneas 269-271). Falta: (1) **quitar la cola "Por firmar" global** que aún sobrevive en el footer del pop-up (`/bitacora/por-firmar` sin `?contrato=`, líneas 427) — el profe **aceptó quitarla**; (2) revisar que las listas (selector de contrato en cada pantalla) respeten el contrato activo (`ContratoActivoContext`/`BannerContratoActivo` ya existen). Es presentación.
- **Archivos:** `frontend/src/components/ui/AppShell.jsx` (pop-up campana / "Por firmar") · `frontend/src/context/ContratoActivoContext.jsx` · `frontend/src/components/BannerContratoActivo.jsx` · `frontend/src/components/layout/Sidebar.jsx`.
- **Congelada:** ✅ **libre** (`SesionContext.jsx` SÍ es congelado, pero `ContratoActivoContext.jsx` **no**). **Mockup:** no. **Riesgo:** bajo. **Esfuerzo:** M.
- **Dependencias:** ninguna. **Cita:** N/A (criterio de UX que pidió el profe).

#### P1-9 · Sustitución de roster con pendientes
- **(a) — SURFACE/verificar (D2):** confirmar **en pantalla** que ya bloquea sustituir con notas/firmas pendientes (el guard existe en `roster.controller.js`). **No es construir.** → Maiki.
- **(b) Enfoque:** extender el guard de sustitución a los **3 roles** (residente, superintendente, líder de supervisión) — verificar que `ROLES_ROSTER` ya los cubre y que el guard de pendientes corre para los tres.
- **(c) Enfoque:** **regla temporal de firmas:** el saliente no firma después de su fecha de baja; el entrante no firma antes de su alta. Apoyarse en `contrato_roster` (`vigencia_desde`/`vigencia_hasta`) para gatear la firma por fecha.
- **Archivos:** `backend/src/controllers/roster.controller.js` (**NO congelado**) · `frontend/src/pages/RosterContrato.jsx` (UI) · firma de notas: `backend/src/controllers/bitacora.controller.js` (gate temporal de firma). 
- **Congelada:** ✅ **libre**. **Mockup:** no. **Riesgo:** medio (c toca la lógica de firmas). **Esfuerzo:** (b) S · (c) M.
- **Dependencias:** (a) decide alcance. Relacionado con **P3-1** (mismo archivo). **Cita:** sustitución de personas art. 125 RLOPSRM (se sustituye, no se borra; dependencia no sustituible fr. I g); supervisión = tercero (criterio confirmado por el profe).

---

### P2 — 🟧 Hecho pero SIN verificar en pantalla (NO construir: probar con ojos)

#### P2-1 · H6 rediseño de pago (el grande)
- **Enfoque:** **verificar end-to-end**: contratista sube CFDI/factura/bancarios → finanzas solo revisa+paga → **pop-up "¿CFDI y factura coinciden?"** → pestaña "registro" = solo historial. Ya implementado (memoria 22-23-jun: cola global finanzas + `cobro_soportes` BYTEA).
- **Archivos a mirar:** `frontend/src/pages/TransitoPago.jsx` · `frontend/src/pages/AmbientePago.jsx` · `frontend/src/components/pagos/RegistroPagoForm.jsx` · `frontend/src/pages/RegistroPago.jsx` · `backend/src/controllers/instruccion-pago.controller.js` · `backend/src/controllers/pagos.controller.js` (congelado, solo lectura).
- **Congelada:** N/A (solo verificar). **Mockup:** no. **Riesgo:** medio (el profe se detuvo MUCHO aquí). **Esfuerzo:** M (prueba). **Dependencias:** datos demo con estimación autorizada. **Cita:** estimación presenta/autoriza art. 54 LOPSRM; pago solo `autorizada`.

#### P2-2 · H2 foto obligatoria en avance — ⚠️ **CONFLICTO (ver D1)**
- **Enfoque:** **decidir D1 primero.** Si el profe la quiere fuera → **revertir el gate obligatorio** a opcional (`TrabajosTerminados.jsx:270` quita `&& fotos.length > 0`) y avisar al equipo (P5-3a). Si se queda → solo verificar.
- **Archivos:** `frontend/src/pages/TrabajosTerminados.jsx` (gate línea 270; subcomponente `FotosDeAvance`) · `backend/src/controllers/avance-fotos.controller.js` · `backend/src/controllers/trabajos.controller.js` (validación server-side si existe).
- **Congelada:** ✅ **libre**. **Mockup:** no. **Riesgo:** bajo (es revertir). **Esfuerzo:** S. **Dependencias:** **D1**. **Cita:** art. 132 fr. IV RLOPSRM es **discrecional** (por eso NO debe ser obligación legal).

#### P2-3 · H8 curva doble serie
- **Enfoque:** verificar las **2 tarjetas** (original congelada al cambiar versión + vigente) y la doble serie (acumulado total + nuevo desde convenio).
- **Archivos:** `frontend/src/pages/CurvaAvance.jsx` · `frontend/src/utils/etapasAvance.js`.
- **Congelada:** N/A (verificar). **Mockup:** no. **Riesgo:** bajo. **Esfuerzo:** S. **Cita:** versionado del programa art. 59 LOPSRM (convenio).

#### P2-4 · H9 etiqueta "Adicional" visible
- **Enfoque:** verificar que la etiqueta "Adicional" se ve en las versiones del programa. El backend ya expone `es_adicional` (`programa.controller.js:28`).
- **Archivos:** `frontend/src/components/programa/MatrizProgramaLectura.jsx` · `frontend/src/pages/CurvaAvance.jsx`.
- **Congelada:** N/A (verificar). **Mockup:** no. **Riesgo:** bajo. **Esfuerzo:** S. **Cita:** conceptos adicionales art. 101/102 RLOPSRM `[validar]`.

#### P2-5 · #20-front: ocultar botón firmar al vencer el plazo
- **Enfoque:** ocultar/deshabilitar el botón firmar cuando venció el plazo (backend ya devuelve 409). Cosmético.
- **Archivos:** `frontend/src/pages/EmisionNotas.jsx` y/o `frontend/src/pages/PorFirmar.jsx`.
- **Congelada:** ✅ **libre**. **Mockup:** no. **Riesgo:** bajo. **Esfuerzo:** S. **Dependencias:** batcheable con BATCH A. **Cita:** aceptación tácita al vencer plazo art. 123 fr. III RLOPSRM.

---

### P3 — 🟨 Implementar (decidido)

#### P3-1 · H13 supervisión externa de otra empresa
- **Enfoque:** el profe **resolvió**: la supervisión externa **SÍ** puede ligarse a otra empresa (a diferencia de contratista/residente). Hoy `roster.controller.js` REGLA 4 (líneas 192-201) exige **misma empresa para todos** al sustituir. Cambio: **eximir al rol supervisión** de la comparación de empresa (mantenerla para contratista/superintendente).
- **Archivos:** `backend/src/controllers/roster.controller.js` (REGLA 4, líneas 192-201). Revisar también el aviso de "misma empresa" en el alta (`AltaContrato.jsx:320-331`, ya es aviso, no bloqueo — coherente).
- **Congelada:** ✅ **libre**. **Mockup:** no. **Riesgo:** medio (regla de negocio). **Esfuerzo:** S.
- **Dependencias:** mismo archivo que P1-9 b/c → hacerlos juntos (BATCH C). **Cita:** la supervisión es un contrato aparte / tercero; sustitución art. 125 RLOPSRM; la ley **no** obliga a misma empresa (el profe lo confirmó).

#### P3-2 · H12 quién ve el portafolio
- **Enfoque:** **DEJAR COMO ESTÁ.** Decisión del profe: no tocar (hay incoherencia matriz/back/front documentada que NO se corrige).
- **Archivos:** ninguno. **Congelada:** N/A. **Riesgo:** N/A. **Esfuerzo:** 0. **Cita:** N/A.

#### P3-3 · Manejo de sesión (last-login-wins) — ⚠️ **OK MAIKI (auth congelado)**
- **Enfoque:** el profe criticó que "cualquier sesión debería matar la anterior". Ya hay diseño previo (`token_version`, memoria 22-jun). Es **auth = zona congelada**. **No editar.** Entregar propuesta/diff a Maiki. Atado a **P0-2** (sin reparto de cuentas, el equipo se saca entre sí al compartir cuenta).
- **Archivos:** `backend/src/controllers/auth.controller.js` + `backend/src/middlewares/auth.middleware.js` — **CONGELADOS**.
- **Congelada:** ⚠️ **OK MAIKI**. **Mockup:** no. **Riesgo:** alto (auth). **Esfuerzo:** M. **Dependencias:** P0-2. **Cita:** N/A.

---

### P4 — 📄 Entregable académico (NO es código — fácil de olvidar)
> El profe (audio 9:43 PM y 4:22 PM): documentación que va a revisar mañana. **No lo construye Code; lo prepara el equipo.** Lo incluyo porque "puede pesar en la calificación y no está en ningún doc de código".

| ID | Item | Enfoque | Esfuerzo |
|---|---|---|---|
| **P4-1** | Análisis de riesgos **de al menos 4 semanas a la fecha** (ideal 3 meses) | Tabla/documento de riesgos por semana (probabilidad/impacto/mitigación), retroactivo 4 semanas. | M |
| **P4-2** | Planes ejecutados **ESCRITOS con registro** | El profe: *"escritos no van a contar"* sin registro → necesita **evidencia de una junta con registro** (minuta/acta). Redactar planes + acta de junta. | M |
| **P4-3** | Resultados de esos planes **por semana** + cómo se ajustó el análisis | Bitácora semanal de resultados + ajuste del análisis de riesgo. | M |

- **Congelada:** N/A. **Mockup:** no. **Riesgo:** medio (peso en nota). **Responsable:** **equipo humano**, no Code.

---

### P5 — ⬜ Menor / en pausa

| ID | Item | Enfoque | Estado |
|---|---|---|---|
| **P5-1** | Oleada 6 (auth: #13 aprobarUsuario, #14 email vacío, #15 empresa supervisión tipo, #16 login case-sensitive) | **EN PAUSA** — zona congelada (auth), nadie los ve en UI normal. ⚠️ **OK MAIKI** si se retoman. | Pausa |
| **P5-2** | Opcionales #25–30 | Cosméticos, sin atender. | Pausa |
| **P5-3** | **Avisar al equipo** (operativo): (a) foto de avance — **revisar tras D1**; (b) finanzas no paga sin CFDI del contratista; (c) H3/H4/H10 son falsos positivos (no perder tiempo). | No-código. Responsable: Maiki/equipo. | — |

---

## 3. Resumen: qué requiere OK de Maiki (zona congelada o coordinación)

| Ítem | Archivo congelado / razón | Patrón propuesto |
|---|---|---|
| P1-4-back | `contratos.controller::crearContrato` | Diff a Maiki (no editar) |
| P1-5-back | `contratos.controller::crearContrato` | Diff a Maiki |
| P1-6-back | `lib/programa.js` (libre, pero lo llama `crearContrato`) | Coordinar con Maiki |
| P3-3 | `auth.controller` + `auth.middleware` | Diff a Maiki |
| P0-2 | reparto en Render (BD viva) | Operativo Maiki |
| P5-1 | auth (oleada 6) | Solo si se retoma, con OK |

**Todo lo demás (P1-1, P1-2, P1-3, P1-4/5/6 cliente, P1-7, P1-8, P1-9 b/c, P3-1, P2-2 reversión, P2-5) es editable por Code en local sin tocar zona congelada.**

## 4. Notas de verificación previas (ya comprobadas contra el repo)
- Backend **ya devuelve** todos los importes de carátula (incl. anticipo): `estimaciones.controller.js:508-538` y `estimacion-prep.controller.js:54,165` → **P1-1 es presentación pura**.
- `lib/programa.js:173` **salta** negativos (no los rechaza) → **P1-6** es cambio de comportamiento.
- `roster.controller.js:192-201` exige misma empresa a **todos** → **P3-1** = eximir supervisión.
- `TrabajosTerminados.jsx:270` **ya** hace la foto **obligatoria** → **P2-2/D1** es revertir, no construir.
- Redirect alta→apertura **ya existe** (`AltaContrato.jsx:1831-1836`) → **P1-7c** es verificar, no crear.
- `AppShell.jsx:199` ya acota pendientes al contrato activo; queda quitar la cola global `/bitacora/por-firmar` (línea 427) → **P1-8**.
- Endpoint `personasDeEmpresa` ya existe (`api.js:145`) → **P1-3** es frontend.

> **Fin del plan.** Propuesta para aprobación de Maiki. Cero cambios de código aplicados en esta sesión.
