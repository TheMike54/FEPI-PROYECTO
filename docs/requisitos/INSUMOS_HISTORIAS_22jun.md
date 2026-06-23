# INSUMOS PARA LAS 24 HISTORIAS DE USUARIO — auditoría del código real

> **Fecha:** 2026-06-23 · **Tipo:** SOLO LECTURA (no se tocó código) · **Base:** working tree (código real en
> disco, incluye los cambios sin commitear de las sesiones recientes — bitácora obligatoria, avance por periodo
> actual + foto + no-corregir, estimación-ciclo, cobro promovido por contratista + cola global, convenios con
> adicionales, sesiones last-login-wins, etc.). · **Método:** 11 agentes en paralelo por dominio, cada uno
> auditando el código real y contrastándolo con el feedback del profe (audios 22-jun).
>
> **Para qué sirve:** Maiki va a reescribir las 24 historias en .md con el formato EXACTO que pidió el profe:
> - **QUÉ HACE** el sistema (la ACCIÓN real, no la pantalla; nada de "asistente de 7 pasos" ni tecnicismos).
> - **CRITERIO DE ÉXITO VERIFICABLE:** cómo sabe él que funcionó sin llenar todo — "generó tal registro",
>   "mandó tal notificación", "el registro no queda con datos vacíos", "cambió de estado X→Y".
> - El **deseo = la ACCIÓN** (deseo reemplazar / promover / estimar / promover cobro), nunca "deseo ver".
>
> Cada sección trae 7 apartados: (1) Identidad y roles, (2) Qué hace hoy paso a paso con `archivo:función`,
> (3) Disparadores y precondiciones, (4) Criterio de éxito observable, (5) Qué genera al fallar, (6) ¿Cambió de
> comportamiento? + brechas vs lo que el profe quiere, (7) Citas legales.
>
> **Cómo leerlo:** lo que el sistema **HACE** está fundado en el código (citado). Lo que el profe **QUIERE** y
> el sistema aún no hace está marcado como **BRECHA** — eso le dice a Maiki qué falta antes de la entrega.

---

## Índice de unidades (orden de flujo)

| Cluster | Unidades |
|---|---|
| Acceso y sesiones | HU-00, Registro, Sesiones |
| Empresas y roster | HU-23, HU-22 |
| Alta y fianzas | HU-01, HU-02 |
| Bitácora | HU-08, Por Firmar, HU-09, HU-10, HU-11 |
| Avance | HU-05, HU-06, HU-07 |
| Estimación (integración) | HU-12, HU-13 |
| Estimación (revisión/reingreso) | HU-15, HU-16, HU-14, HU-17 |
| Pago | HU-20, HU-21 |
| Convenios | HU-03 |
| Expediente/Portafolio/Reportes | HU-04, HU-18, HU-19 |
| Finiquito | HU-24 |

---


## Acceso y sesiones

### HU-00 — Inicio de sesión por rol (autenticación y deducción de rol)

1. **Identidad:** HU-00 (login). Es transversal — `permisos.js:37` lo declara explícitamente: "HU-00 (login) es transversal: no se filtra", y `nivelDe` no tiene entrada para HU-00. La EJECUTAN los 5 roles (`residente`, `contratista`, `supervision`, `dependencia`, `finanzas`); cualquier persona con cuenta `activo` se autentica. No hay "consulta" — o entras o no entras. El **rol NO se elige**: lo deduce el sistema de la columna `usuarios.rol` y lo firma en el JWT (esto cumple lo que pidió el profe: "el login deduce el rol, no se elige").

2. **Qué hace HOY, de verdad (paso a paso):**
   - **Front:** el usuario teclea correo + contraseña en `SeleccionRol.jsx:FormLogin` (no hay selector de rol). El correo se normaliza a minúsculas+trim ANTES de mandarlo (`SeleccionRol.jsx:40`: `login(email.trim().toLowerCase(), password)`), simétrico con cómo lo guardó el registro.
   - `SesionContext.jsx:login` (línea 34) llama `api.login` → `api.js:36` POST `/auth/login`.
   - **Backend `auth.controller.js:login` (línea 24):** valida que vengan email y password (400 si falta). Busca el usuario por email: `SELECT id, nombre, email, password_hash, rol, estado, empresa_id ... WHERE email = $1 LIMIT 1` (línea 31-33). Si no existe → 401 "Credenciales inválidas".
   - Compara la contraseña con `bcrypt.compare` (línea 42). Si no coincide → 401 "Credenciales inválidas".
   - **Gate de estado** (línea 50): si `estado !== 'activo'` → 403; mensaje según estado: `'rechazado'` → "Tu solicitud de acceso fue rechazada. Contacta a la dependencia" (`MSG_RECHAZADA`); cualquier otro (pendiente) → "Tu cuenta está pendiente de aprobación por la dependencia" (`MSG_PENDIENTE`). Devuelve también `estado` en el cuerpo.
   - **SESIÓN ÚNICA (last-login-wins)** (línea 55-60): `UPDATE usuarios SET token_version = token_version + 1 WHERE id = $1 RETURNING token_version`. Esto invalida cualquier token anterior de esa cuenta. Toma el nuevo `tv`.
   - **Firma del JWT** (línea 62-68): `jwt.sign({ id, rol, nombre, empresa_id, tv }, JWT_SECRET, { expiresIn: '8h' por default })`. El **rol viaja en el token** — el cliente nunca lo elige.
   - Responde 200 con `{ token, user: { id, nombre, rol } }` (línea 70-73).
   - **Front:** `SesionContext.jsx:34-41` guarda `token` en `localStorage` (`sigecop_token`) y `user` en `sigecop_user`, y fija `setRol(user.rol)`. Al recargar (F5) se restaura de `localStorage` (`SesionContext.jsx:19-32`).

3. **Disparadores y precondiciones:** cuenta con `estado='activo'` (las demo y las previas nacen `activo` por DEFAULT — `schema.sql:35`; las altas por auto-registro nacen `pendiente`). Credenciales correctas (email existente + bcrypt OK). Todo se valida **server-side** en `auth.controller.js`. El front solo normaliza el correo (cosmético) y no replica el gate de estado.

4. **Criterio de éxito observable:** al iniciar sesión con cuenta activa, el sistema **emite un token JWT firmado con el rol deducido de la BD** (no elegido) y **incrementa `usuarios.token_version`** (queda registrado, no vacío). El front entra al shell con el rol correspondiente. Verificable: el `user` devuelto trae `rol` correcto; en BD `token_version` subió +1; un F5 conserva la sesión.

5. **Qué genera al fallar:**
   - Falta email/password → **400** `{ error: 'email y password son requeridos' }`.
   - Email inexistente o contraseña mala → **401** `{ error: 'Credenciales inválidas' }` (mismo mensaje para no filtrar cuáles correos existen).
   - Cuenta pendiente → **403** `{ error: 'Tu cuenta está pendiente de aprobación por la dependencia', estado: 'pendiente' }`.
   - Cuenta rechazada → **403** `{ error: 'Tu solicitud de acceso fue rechazada. Contacta a la dependencia', estado: 'rechazado' }`.
   - El front muestra el mensaje en el banner `auth-mensaje` (`SeleccionRol.jsx:43`).

6. **¿Cambió de comportamiento?** **SÍ.** Antes (modo proyecto / "atajo de rol demo") el rol se ELEGÍA en una pantalla de selección de rol; ahora el rol viene del login real y lo deduce el backend (`SesionContext.jsx:5-6` comenta "se eliminó el modo proyecto... el rol viene del login real"). Esto se alinea con el profe ("el login deduce el rol, no se elige"). Además se añadió la sesión única (ver punto 6 de la regla de SESIONES abajo). NOTA: el nombre del componente sigue siendo `SeleccionRol.jsx` (nombre histórico), pero ya NO selecciona rol: solo hace login/registro. Esto es solo un nombre de archivo desfasado, no una brecha funcional.

7. **Citas legales:** la autenticación en sí no tiene artículo. El gate de estado (aprobación por dependencia) se apoya en el control de acceso institucional; es **[validar]** (interpretativo, sin artículo en el código). El JWT firma `empresa_id` para el acotamiento por participación (relacionado con arts. de participación de obra, pero el login no cita ninguno explícito).

---

### Registro — Auto-registro de persona con aprobación de la dependencia

1. **Identidad:** Auto-registro público (sin HU-NN propia en `permisos.js`; el panel de aprobación es la HU/pantalla `SolicitudesRegistro`, gateada solo a `dependencia`). Lo EJECUTA cualquier persona nueva (ruta pública, sin token). La **aprobación/rechazo la EJECUTA solo `dependencia`** (`usuarios.routes.js:22` `router.use(requireRole('dependencia'))`); ningún otro rol consulta ese panel — los demás roles que entran a `SolicitudesRegistro` ven el aviso "Esta administración es exclusiva del rol Dependencia" (`SolicitudesRegistro.jsx:92`).

2. **Qué hace HOY, de verdad (paso a paso):**
   - **Captura (2 pantallas equivalentes):** `SeleccionRol.jsx:FormRegistro` (pestaña "Crear cuenta" en el login) y la página pública `SolicitudRegistro.jsx` (ruta `/solicitud-acceso`). Ambas piden: nombre(s) y apellido(s) en DOS campos obligatorios, correo, rol solicitado (`<select>` de `ROLES`), empresa (selector del catálogo), contraseña + confirmación.
   - **Empresa PRIMERO (FIX 22-jun, profe):** en `SolicitudRegistro.jsx:140-169` la empresa es el bloque "1 · Empresa" ANTES de los datos de la persona, con el copy "Te registras **dentro de una empresa**". Cumple el feedback del profe ("el registro debe ser de una PERSONA bajo una empresa ya existente"). La empresa se ELIGE del padrón (`api.listarEmpresas()` → GET `/auth/empresas`, público) o se registra una nueva (`__nueva__`).
   - **Validaciones de cliente** (`SolicitudRegistro.jsx:44-80` / `SeleccionRol.jsx:137-174`): nombre(s) y apellido(s) no vacíos; se concatenan en `nombre = "nombres apellidos"`; `esNombreCompleto` exige ≥2 palabras de ≥2 letras (`/\p{L}{2,}/gu`); contraseña ≥8; coinciden; empresa obligatoria para `contratista`/`supervision` (`empresaObligatoriaPara`, `empresa.js:13`).
   - **Front llama** `api.register({ nombre, email, password, rolSolicitado, empresa })` (`api.js:37` POST `/auth/register`). Nota: `SeleccionRol.jsx:179` manda el email ya en minúsculas (`.toLowerCase()`); `SolicitudRegistro.jsx:84` manda `email.trim()` SIN `toLowerCase` (el backend normaliza igual, así que no hay diferencia efectiva).
   - **Backend `auth.controller.js:register` (línea 79):** valida nombre/email/password (400). Espejo server-side de `esNombreCompleto` (línea 91). Password ≥8 (línea 94). `rolSolicitado` solo se acepta si está en `ROLES_VALIDOS`, si no → `rolSol = null` (línea 99) — es solo informativo.
   - **Empresa server-side:** normaliza email a minúsculas+trim (línea 100). Si vino `empresa` (texto), `resolverOCrearEmpresa(query, empresa)` la resuelve-o-crea con match fuerte (línea 109) → `empresaId`. Refuerzo: si rol es `contratista`/`supervision` y `empresaId == null` → **400** (línea 114-117) "La empresa es obligatoria para contratista y supervisión."
   - **INSERT** (línea 119-124): `INSERT INTO usuarios (nombre, email, password_hash, rol, rol_solicitado, estado, empresa_id) VALUES ($1,$2,$3, NULL, $4, 'pendiente', $5)`. El **rol efectivo nace NULL**; solo se guarda `rol_solicitado`; `estado='pendiente'`.
   - Responde **201** `{ mensaje: 'Tu cuenta quedó pendiente de aprobación por la dependencia', usuario: {...} }`. **NO devuelve token** — la persona no puede entrar todavía.
   - **Aprobación (dependencia):** `SolicitudesRegistro.jsx` lista los pendientes (`api.listarUsuarios('pendiente')` → GET `/usuarios?estado=pendiente`). La dependencia DEBE elegir el rol a otorgar en `select-rol` (no se hereda el solicitado: `SolicitudesRegistro.jsx:27`, `setRolElegido` inicia en `''`). "Aprobar" → `api.aprobarUsuario(id, rol)` → PATCH `/usuarios/:id/aprobar`. `usuarios.controller.js:aprobarUsuario` (línea 64) exige rol válido (400 si no), y hace `UPDATE usuarios SET rol=$1, estado='activo', aprobado_por=$2 (del JWT), aprobado_en=NOW()` (línea 78-83). "Rechazar" → `rechazarUsuario` (línea 97): `UPDATE ... SET estado='rechazado'`.

3. **Disparadores y precondiciones:** registro es público (no requiere token; `auth.routes.js` no lleva `authMiddleware`). Precondición de empresa: contratista/supervisión exigen empresa (front + server). Para aprobar/rechazar: token de rol `dependencia` (gate server-side `usuarios.routes.js:22`). El email es UNIQUE en BD (`schema.sql:25`).

4. **Criterio de éxito observable:**
   - Registro: se **crea un registro de usuario** con `estado='pendiente'`, `rol=NULL`, `rol_solicitado` poblado y `empresa_id` vinculado (NO vacío para contratista/supervisión). NO se emite token. El front muestra "Tu cuenta quedó pendiente de aprobación".
   - Aprobación: la cuenta **cambia de estado `pendiente`→`activo`** y se le **fija el rol elegido por la dependencia** (no el solicitado), con `aprobado_por`/`aprobado_en` registrados (trazabilidad, no vacío). A partir de ahí ya puede iniciar sesión.
   - Es ÚNICO: el email es UNIQUE, así que no hay dos cuentas con el mismo correo.

5. **Qué genera al fallar:**
   - Falta nombre/email/password → **400** "nombre, email y password son requeridos".
   - Nombre de una sola palabra → **400** "Captura tu nombre y apellido(s): el nombre completo aparece en la bitácora (art. 123 RLOPSRM)."
   - Password <8 → **400** "La contraseña debe tener al menos 8 caracteres".
   - Contratista/supervisión sin empresa → **400** "La empresa es obligatoria para contratista y supervisión."
   - Email duplicado → **409** "Ese correo ya está registrado" (`err.code === '23505'`).
   - Error interno → **500** "Error interno".
   - Aprobar sin elegir rol → cliente bloquea ("Elige el rol a otorgar antes de aprobar.", `SolicitudesRegistro.jsx:46`); server: **400** "Debes indicar el rol a otorgar (rol válido requerido)".
   - Aprobar/rechazar id inexistente → **404** "Usuario no encontrado".

6. **¿Cambió de comportamiento?** **SÍ.** (a) Antes el registro era una maqueta del modo proyecto sin backend; ahora es real (POST `/auth/register`, estado `pendiente`) — `SolicitudRegistro.jsx:7-11`. (b) FIX 22-jun: la empresa pasó a ser lo PRIMERO y se elige del padrón (no texto libre), alineado con "registro de una persona bajo una empresa ya existente". (c) El nombre se captura en dos campos (nombre+apellido) y se exige nombre completo (corrección profe 04-jun, art. 123 RLOPSRM). **No detecto brecha** contra lo pedido por el profe en este dominio; el modelo "persona dentro de empresa" ya está implementado. Única observación menor: el detalle del modelo N:M empresa↔persona y el endurecimiento de `acceso.js` quedan como pendientes del cluster de empresas (no de este cluster).

7. **Citas legales:** nombre completo obligatorio → **art. 123 RLOPSRM** (citado en `auth.controller.js:11-12,92` — la bitácora debe asentar a las personas; el umbral exacto ≥2 palabras es **[validar]**, criterio de la Fundación). Empresa obligatoria para contratista/supervisión → criterio del equipo **[validar]** (`empresa.js:8-11`, "default conservador, B19"). Aprobación por dependencia como autoridad → **[validar]** (interpretativo, sin artículo en código).

---

### SESIONES — Una sesión nueva invalida la anterior (last-login-wins / token_version)

1. **Identidad:** Regla transversal de sesión única (no es una HU con nivel en `permisos.js`). Aplica a TODOS los roles que se autentican. No hay "ejecuta vs consulta": es un mecanismo de seguridad automático del login + middleware.

2. **Qué hace HOY, de verdad (paso a paso):** **SÍ existe el mecanismo `token_version` (last-login-wins) y está completo en código.**
   - **Columna en BD:** `schema.sql:358` — `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;` (aditivo e idempotente). Comentario en `schema.sql:356-357` lo explica como FIX 22-jun del profe.
   - **Login incrementa la versión:** `auth.controller.js:57-60` — `UPDATE usuarios SET token_version = token_version + 1 ... RETURNING token_version`, y firma ese `tv` en el JWT (`auth.controller.js:65`). Cada login produce un `tv` nuevo y único por cuenta.
   - **Middleware valida la versión:** `auth.middleware.js:23-32` — si el token trae `payload.tv !== undefined`, hace `SELECT token_version FROM usuarios WHERE id = $1`; si el usuario no existe o `token_version !== payload.tv` → **401** `{ error: 'Tu sesión se cerró porque iniciaste sesión en otro dispositivo. Vuelve a iniciar sesión.', sesionReemplazada: true }`. Como el login posterior subió `token_version`, el `tv` del token VIEJO ya no coincide → ese token queda invalidado de inmediato en su siguiente request.
   - **Retrocompatibilidad / fail-open:** un token VIEJO sin `tv` se acepta (no rompe sesiones emitidas antes del cambio) — `auth.middleware.js:21,23`. Si la consulta a BD falla (p. ej. columna ausente), se hace `catch` y se deja pasar (fail-open) para no tumbar la app — `auth.middleware.js:29-31`.
   - **Front cierra sesión limpio:** `api.js:21-26` — al recibir 401 con `sesionReemplazada`, borra `sigecop_token`/`sigecop_user` de `localStorage`, marca `sessionStorage 'sigecop_sesion_reemplazada'='1'` y redirige a `/` (login).

3. **Disparadores y precondiciones:** se dispara con CADA login (incrementa `token_version`) y con CADA request autenticado (el middleware compara). Precondición para que aplique: el token debe traer `tv` (todos los tokens nuevos lo traen). **Validación server-side** (middleware) — el front solo reacciona al 401.

4. **Criterio de éxito observable:** al iniciar sesión por SEGUNDA vez (mismo usuario, otro dispositivo/navegador), la PRIMERA sesión queda **invalidada**: el siguiente request de la primera sesión recibe 401 `sesionReemplazada` y es expulsada al login con el aviso "Tu sesión se cerró porque iniciaste sesión en otro dispositivo." Verificable: en BD `token_version` subió; el token viejo deja de funcionar; solo la última sesión sigue viva. (Coincide con el smoke citado en memoria: "2º-login-mata-1º".)

5. **Qué genera al fallar (o al detectar sesión reemplazada):** **401** con cuerpo `{ error: 'Tu sesión se cerró porque iniciaste sesión en otro dispositivo. Vuelve a iniciar sesión.', sesionReemplazada: true }`. El front borra credenciales y redirige al login. Si falla la BD durante el chequeo → fail-open (deja pasar, log en consola `[authMiddleware token_version]`) — esto es deliberado para no bloquear toda la app por un fallo de BD.

6. **¿Cambió de comportamiento?** **SÍ — este es el cambio central del feedback del profe.** El profe (22-jun) dijo: *"Cualquier sesión debería matar la anterior"* — antes el sistema permitía multisesión (varios tokens vivos a la vez / conflicto de rol). HOY el código YA implementa last-login-wins vía `token_version`: login incrementa + middleware valida. **No hay brecha:** el mecanismo está en las tres capas (schema, controller, middleware) y el front cierra la sesión expulsada. Única matización a reportar a Maiki: el chequeo es **fail-open** (si la columna no existe en Render o la BD falla, no invalida). Por eso es importante que la migración `token_version` esté aplicada en Render; si no está, la regla no surte efecto silenciosamente. La columna ya está plegada a `schema.sql:358` (idempotente), así que basta con que el deploy haya corrido el schema.

7. **Citas legales:** no aplica artículo de LOPSRM/RLOPSRM/LFD — es una regla de seguridad/sesión. **[validar]** solo en cuanto a si "matar la anterior" debe ser estricto (fail-closed) en producción; hoy es fail-open por diseño (comentario `auth.middleware.js:22`).


## Empresas y sustitución de personas (roster)

### HU-23 — Catálogo / Padrón de Empresas

**1. Identidad**
- **Número/título:** HU-23 — Catálogo y padrón de empresas (registro de la empresa antes que la persona; validación e inscripción al padrón por la dependencia).
- **Rol que la EJECUTA (nivel E):** **Dependencia**. Es la única que administra el padrón: `backend/src/routes/empresas.routes.js:12` aplica `requireRole('dependencia')` a TODO el router `/api/empresas/*`, y la ruta de la pantalla `frontend/src/App.jsx:130` es `<SoloRol roles={['dependencia']}>`.
- **Roles que solo CONSULTAN (nivel C):** No hay nivel C definido en `permisos.js` — **HU-23 NO existe en `frontend/src/data/permisos.js`** (la matriz solo llega a HU-21). La pantalla de administración vive fuera del catálogo de HU (ruta `SoloRol`, igual que solicitudes/finiquito). Hay sin embargo un punto de "consulta/escritura limitada" para TODOS los demás roles: el **catálogo público** `GET /api/auth/empresas` (`empresas.controller.js:103 listarEmpresas`) que cualquier persona usa al registrarse, sin token — solo expone `id, nombre` (no PII).

**2. Qué hace HOY, de verdad (paso a paso)**
- **a) La empresa nace en el registro de la persona (empresa-primero).** En `frontend/src/pages/SolicitudRegistro.jsx` la sección visible es "1 · Empresa" y luego "2 · Tus datos (dentro de la empresa)" (`SolicitudRegistro.jsx:140-171`): el usuario **elige su empresa de un `<select>` del padrón** (`sol-empresa-select`, líneas 148-153) o escoge "➕ Registrar nueva empresa…" y teclea el nombre (`sol-empresa-nueva`, 156-158). El catálogo se carga con `api.listarEmpresas()` (línea 36).
- **b) Anti-duplicado en vivo (cliente).** Si teclea una nueva, un helper `empresaExistentePorNombre(empresas, empresaNueva)` (`SolicitudRegistro.jsx:160`, de `data/empresa.js`) avisa "✓ Ya existe «X»: mejor selecciónala arriba".
- **c) Empresa obligatoria para empresas privadas.** `empresaObligatoriaPara(rolSolicitado)` (línea 77) bloquea el envío si el rol es contratista/supervisión y no hay empresa: "Elige tu empresa: es obligatoria para contratista y supervisión."
- **d) Resolver-o-crear en el backend.** Al registrar, `auth.controller` llama a `resolverOCrearEmpresa(q, nombre, tipo)` (`empresas.controller.js:58`). Resuelve por nombre en **dos niveles**: nivel 1 = forma normalizada débil (lower + trim + colapso de espacios) contra el índice único funcional `uq_empresas_nombre_norm` (`schema.sql:1721`); nivel 2 = **match fuerte** `normalizarNombreEmpresaFuerte` (`empresas.controller.js:32`) que funde acentos, puntuación y sufijos de razón social ("S.A. de C.V.", "S de RL", etc., lista `SUFIJOS_RAZON_SOCIAL` líneas 27-31), recorriendo el catálogo con `ORDER BY id ASC` (apunta siempre al menor id = misma canónica que `consolidar_empresas.js`). Si no hay match, **INSERT** con `estado='por_validar'` (línea 87). Si una existente ya existe, **NO** se re-valida (no se "des-valida").
- **e) La dependencia administra el padrón** en `frontend/src/pages/EmpresasPadron.jsx`, con tres pestañas (`EmpresasPadron.jsx:13-27`):
  - **Padrón** (`GET /api/empresas/padron`, `listarPadron` `empresas.controller.js:120`): lista contratistas/supervisión con conteo de personas (subquery sobre `usuarios.empresa_id`) y de **contratos contados por la EMPRESA DEL CONTRATO** (`COALESCE(c.contratista_empresa_id, su.empresa_id)` y `supervision_empresa_id`, líneas 128-132) — fix 22-jun para no derivarlo del usuario. Ordena las `por_validar` primero. Cada fila se expande y carga las cuentas de esa empresa vía `GET /api/empresas/:id/personas` (`listarPersonas` línea 208, lee `usuarios.empresa_id`, modelo 1 empresa : N cuentas).
  - **Por validar** (`GET /api/empresas/por-validar`, `listarPorValidar` línea 142): las auto-registradas pendientes, **con detección de posible duplicado** contra una empresa ya `validada` por forma fuerte (líneas 146-151) → expone `posible_duplicado: {id, nombre}`.
  - **Dependencias** (`GET /api/empresas/dependencias`, `listarDependencias` línea 157): catálogo aparte de las entidades públicas (`tipo='dependencia'`) con conteo de contratos.
- **f) Acciones de la dependencia:**
  - **Validar:** `POST /api/empresas/:id/validar` (`validarEmpresa` línea 170) → `UPDATE empresas SET estado='validada'`. Toast "Empresa validada e inscrita al padrón (art. 43 RLOPSRM)" (`EmpresasPadron.jsx:98`).
  - **Fusionar:** `POST /api/empresas/:id/fusionar` body `{canonica_id}` (`fusionarEmpresa` línea 183), transaccional: reapunta `usuarios.empresa_id` de la duplicada a la canónica y **borra la duplicada** (líneas 193-194). Rechaza fusionar consigo misma (400). No toca contratos directamente (cuelgan de personas).
- **g) Esquema** (`schema.sql:1712-1726, 1889-1904`): tabla `empresas (id, nombre, creado_en, tipo, estado)` con `tipo IN ('dependencia','contratista','supervision')` y `estado IN ('por_validar','validada')`; índice único funcional `uq_empresas_nombre_norm`; `usuarios.empresa_id` (FK, NULL retrocompat); columnas `contratos.contratista_empresa_id` / `supervision_empresa_id` y `contrato_roster.empresa_id` (todas aditivas, con backfill desde la empresa del usuario asignado).

**3. Disparadores y precondiciones**
- **Para crear empresa:** basta que alguien se registre y nombre una empresa que no exista (auto-alta, server-side en `resolverOCrearEmpresa`). No requiere autorización previa: nace `por_validar`.
- **Para administrar padrón / validar / fusionar:** sesión con rol **dependencia** (gate server-side `requireRole('dependencia')` en el router, `empresas.routes.js:12`; gate cliente `SoloRol` en `App.jsx:130`). La validación de id (`Number.isInteger(id) > 0`) está server-side (`validarEmpresa:172`, `fusionarEmpresa:186`).
- **Empresa obligatoria** para contratista/supervisión: validado **solo en cliente** (`SolicitudRegistro.jsx:77`); no hay evidencia de un rechazo server-side equivalente en este cluster.
- El alta de contrato (`AltaContrato.jsx`) ya **persiste la empresa con la que firma cada parte** en el contrato: envía `contratistaEmpresaId` / `supervisionEmpresaId` (`AltaContrato.jsx:1791-1792`), que el backend guarda en `contratos.contratista_empresa_id/supervision_empresa_id` (`contratos.controller.js:375-392`) o las deriva del usuario si vienen vacías (retrocompat).

**4. Criterio de éxito observable**
- Al registrarse alguien con empresa nueva: **aparece una fila NUEVA en `empresas`** con ese nombre, `estado='por_validar'`, y la persona queda con `usuarios.empresa_id` apuntando a ella (verificable en la pestaña "Por validar" y al expandir la fila en "Padrón"). **No se crea un duplicado** si ya existía una equivalente (normalización débil/fuerte): el registro **reusa** la empresa existente.
- Al validar: el `estado` cambia **`por_validar` → `validada`** (la fila pasa de chip ámbar "Por validar · validar" a chip verde "Validada", `EmpresasPadron.jsx:142-144`); toast con cita art. 43.
- Al fusionar: la empresa duplicada **desaparece** de `empresas` y sus cuentas quedan reapuntadas a la canónica (la canónica sube su conteo de personas). Respuesta `{ok:true, fusionada, canonica}`.
- "Es único": la unicidad la garantiza el índice `uq_empresas_nombre_norm` (no quedan dos "Patito"/"PATITO "). "El registro no queda con datos vacíos": `nombre` es `NOT NULL`; al elegir del padrón se hereda el nombre canónico.

**5. Qué genera al fallar**
- `validarEmpresa`: id inválido → **400** "id inválido"; empresa inexistente → **404** "Empresa no encontrada".
- `fusionarEmpresa`: falta id/canónica → **400** "id y canonica_id son requeridos"; misma empresa → **400** "No se puede fusionar una empresa consigo misma"; canónica inexistente → **404** "La empresa canónica no existe"; error → **500** "Error interno" (rollback).
- Acceso sin rol dependencia → **403** del `requireRole` (router) / redirect del `SoloRol` (cliente).
- Registro sin empresa siendo contratista/supervisión → mensaje cliente "Elige tu empresa: es obligatoria para contratista y supervisión." (`SolicitudRegistro.jsx:78`).
- Carrera de dos altas simultáneas → el INSERT lanza `23505` y `resolverOCrearEmpresa` reintenta el SELECT (líneas 89-96), devolviendo el id existente (no duplica).

**6. ¿Cambió de comportamiento? — SÍ**
- **Modelo invertido (empresa-primero): YA aplicado en gran parte.** El profe (22-jun) pidió: "lo más general es la EMPRESA, luego las personas… para hacer un contrato eliges una empresa YA registrada del padrón; si no está, la registras y queda disponible para TODOS; das de alta una persona BAJO esa empresa". El código HOY cumple: el registro presenta "1 · Empresa / 2 · Tus datos (dentro de la empresa)" (`SolicitudRegistro.jsx:140,171`), elige del padrón o registra nueva que queda disponible para todos, y el conteo de contratos del padrón ya se calcula por la **empresa del contrato** (no derivada del usuario, fix 22-jun en `listarPadron`). El contrato persiste su empresa (`contratos.controller.js` y `AltaContrato.jsx`).
- **BRECHAS / tensiones que Maiki debe saber:**
  1. **El alta de contrato NO deja elegir una empresa independiente del padrón;** la empresa del contrato se **deriva de la persona elegida** (`AltaContrato.jsx:1791` toma `empresa_id` del superintendente/supervisión seleccionado). El profe dijo "eliges una empresa YA registrada del padrón… y das de alta una persona BAJO esa empresa" → idealmente el orden es empresa→persona también en el alta. Hoy es persona→(su)empresa. Esto es coherente con el modelo 1 persona : 1 empresa, pero **no es un selector de empresa independiente** (N:M no soportado).
  2. **"Supervisión externa se vincula a OTRA empresa":** el sistema solo **AVISA** (no bloquea) si superintendente y supervisión comparten empresa (`AltaContrato.jsx:320-331`, `aviso-misma-empresa`). El profe lo enuncia como regla; hoy es criterio del equipo (aviso). [validar]
  3. **HU-23 no está en `permisos.js`** (la pantalla va por `SoloRol`), así que no hay niveles E/C formales documentados para esta HU — es deliberado pero conviene anotarlo.
  4. **"Empresa obligatoria" es solo cliente** (no hay rechazo server-side en este cluster).

**7. Citas legales**
- **Art. 43 RLOPSRM** — la dependencia valida/inscribe el padrón de contratistas/supervisión (citado en `empresas.controller.js:114, 169`, `EmpresasPadron.jsx:98,116-118`, `App.jsx:129`). 
- **Art. 74 Bis LOPSRM** — padrón (citado en `empresas.routes.js:2`, `EmpresasPadron.jsx:8`).
- Estado `por_validar` al auto-registrar y la des-validación condicionada: criterio de diseño atado a art. 43 (`empresas.controller.js:55-57`). La regla "supervisión = tercero independiente" es **[validar]** (hoy aviso, no bloqueo).

---

### HU-22 — Sustitución de personas del roster (art. 125)

**1. Identidad**
- **Número/título:** HU-22 — Sustitución de personas del roster del contrato (residente / superintendente / supervisión); visualizar equipo vigente con histórico y ejecutar la sustitución conservando el histórico.
- **Rol que la EJECUTA (nivel E):** **Dependencia** y **Residente asignado**. Ruta `frontend/src/App.jsx:140` = `<SoloRol roles={['dependencia','residente']}>`. La autoridad real la revalida el backend: `roster.controller.js:122-125` permite si `req.user.rol === 'dependencia'` **o** `contrato.residente_id === req.user.id` **o** `contrato.created_by === req.user.id`.
- **Roles que solo CONSULTAN (nivel C):** El **GET del roster** (`/api/roster/contrato/:id`, `leerRoster`) lo puede leer **cualquier parte o supervisión del contrato** (gate `esParteOSupervision`, `roster.controller.js:48`) — es decir contratista y supervisión ven el roster vigente+histórico pero **no pueden sustituir** (la página solo se les muestra a dependencia/residente vía `SoloRol`, así que en la práctica el GET lo consume esa pantalla). **HU-22 tampoco está en `permisos.js`** (fuera del catálogo de HU, igual que el roster/finiquito).

**2. Qué hace HOY, de verdad (paso a paso)**
- **a) Visualizar equipo vigente + histórico.** `GET /api/roster/contrato/:id` (`leerRoster` `roster.controller.js:38`) devuelve `{vigente, historial}`. El **vigente por rol** prefiere la fila ACTIVA del roster (`vigencia_hasta IS NULL`); si el contrato aún no está versionado, lo **deriva del puntero escalar** `contratos.{residente_id,superintendente_id,supervision_id}` para no mostrar el rol vacío (`COL_CACHE`, líneas 70-78). El historial trae nombre, email, **empresa** (`JOIN empresas ue`, línea 60), `vigencia_desde/hasta`, `motivo`, `sustituye_a`, `registrado_por`, `nota_id`. En `frontend/src/pages/RosterContrato.jsx` se pinta una tarjeta por rol con "Vigente desde…" y una tabla histórica con columnas Persona / Desde / Hasta / **Evento** / Motivo (`RosterContrato.jsx:160-176`); "Asignación inicial (alta del contrato)" se muestra como evento "Alta del contrato" y no como motivo (`eventoDe`/`motivoDe`, líneas 101-103).
- **b) Ejecutar la sustitución.** Formulario (`RosterContrato.jsx:184-228`): elige **rol** (`sust-rol`), **nueva persona de un `<select>`** poblado por `api.listarAsignables(ROL_CUENTA[rol])` (líneas 70-81; ya NO se permite teclear el id a mano — B-1), y **motivo obligatorio** (`sust-motivo`). Envía `POST /api/roster/contrato/:id/sustituir` body `{rol, nuevoUsuarioId, motivo}` (línea 87).
- **c) Backend transaccional** (`sustituirPersona` `roster.controller.js:89`): valida cuerpo (rol en whitelist, nuevoUsuarioId entero, **motivo obligatorio**); abre transacción + `pg_advisory_xact_lock(3, contratoId)` (línea 109); `SELECT … FOR UPDATE` del contrato; chequea autoridad; verifica contrato no cerrado; **exige bitácora abierta**; valida que el nuevo exista, esté **activo** y tenga el rol-de-cuenta esperado (`ROL_CUENTA`, líneas 134-139); resuelve la fila ACTIVA anterior (la **siembra** desde el puntero escalar si el contrato aún no estaba versionado, líneas 149-158); **verifica pendientes** y **misma empresa**; luego:
  - **(1) Cierra** la asignación anterior (`UPDATE … SET vigencia_hasta = CURRENT_DATE`, línea 210) — NO se borra, queda en histórico. Cierra primero y luego inserta para que el índice único parcial nunca vea dos activas.
  - **(2) Crea** la nueva fila ACTIVA ligada por `sustituye_a` (líneas 213-217), `registrado_por` del JWT.
  - **(3) Asienta nota de bitácora** automática y atómica (`insertarNotaAtomica` + `textoNotaSustitucion`, tipo `res_sustitucion`, tag `sustitucion`, emisor = quien ejecuta, líneas 234-245) si hay bitácora y hubo titular anterior; vincula `nota_id` a la nueva fila. Si NO hubiera bitácora, la difiere (pero ver punto 3: hoy ya se exige bitácora abierta, así que el diferimiento es prácticamente inalcanzable).
  - **(4) Sincroniza el caché escalar** `UPDATE contratos SET <col> = nuevoUsuarioId` (línea 251) — único punto de escritura, lo lee `lib/acceso.js`.
  - **COMMIT** y responde 201 con `{ok, rol, anterior_usuario_id, nuevo_usuario_id, nueva_asignacion_id, es_alta, nota, nota_diferida, aviso}`.
- **d) Inmutabilidad** (`schema.sql:1402-1425`): trigger `sigecop_roster_transicion` impide reasignar la identidad de una fila; solo permite cerrarla (NULL→fecha) UNA vez. `usuario_id` es `ON DELETE RESTRICT` (no se puede borrar a una persona del roster, solo sustituirla). Índice único parcial `uq_contrato_roster_activo` (línea 1397): una sola activa por (contrato, rol).
- **e) La persona sustituida pierde acceso al contrato** porque `lib/acceso.js:esParteOSupervision` lee el **caché escalar** (`residente_id`/`superintendente_id`/`supervision_id`), que ahora apunta al sustituto (paso 4). La saliente conserva su histórico en `contrato_roster`. Las **firmas pasadas** siguen atadas al firmante original (este controller no toca `bitacora_*`).

**3. Disparadores y precondiciones (todas server-side salvo donde se indique)**
- **Autoridad:** dependencia (cualquier contrato) o residente asignado / `created_by` (su contrato) → si no, **403** (`roster.controller.js:122-125`).
- **Contrato NO cerrado** (finiquito): `contratoCerrado(client, contratoId)` → **409** con `msgCerrado(...)` (líneas 126-127), art. 64 LOPSRM.
- **Bitácora abierta obligatoria:** `SELECT … FROM bitacora_aperturas` → si no hay, **409** "El contrato no tiene bitácora abierta; ábrela primero…" (líneas 131-132, P23 22-jun, art. 122/125).
- **Nuevo válido:** existe / activo / rol-de-cuenta correcto (400 en cada caso, líneas 136-139).
- **Motivo obligatorio:** server-side (línea 101) y cliente (`RosterContrato.jsx:84`).
- **No es la misma persona** que ya ocupa el rol → 400 (línea 165).
- **Sin pendientes:** la persona saliente no debe tener notas de bitácora pendientes de SU firma dentro de plazo (ver punto 5). Server-side, líneas 171-190.
- **Misma empresa:** el sustituto debe pertenecer a la MISMA empresa que la saliente (fail-open si la saliente no tiene empresa). Server-side, líneas 198-205.
- **Candidatos del selector:** `GET /usuarios/asignables?rol=` (cliente, `RosterContrato.jsx:73`); si 403 muestra error explícito (no silencia).

**4. Criterio de éxito observable**
- **Se genera un registro nuevo, no se edita:** aparece una fila NUEVA en `contrato_roster` con `vigencia_hasta=NULL` (vigente), `sustituye_a` = id de la anterior, `motivo` lleno, `registrado_por`; la fila anterior queda con `vigencia_hasta=CURRENT_DATE` (histórico, no borrada). En la UI: la persona anterior pasa a gris con su fecha "Hasta", la nueva queda "vigente" (`RosterContrato.jsx:167-172`).
- **Se manda/asienta una nota de bitácora** tipo `res_sustitucion` documentando la sustitución (con nombre anterior, nuevo, motivo, fecha), **vinculada** a la nueva asignación (`nota_id`). La respuesta trae `nota: {id, numero, tipo}` — "no generó solo un registro, mandó la nota".
- **El estado de acceso cambia:** el caché escalar del contrato pasa a apuntar al sustituto → la saliente **pierde acceso** al contrato y el sustituto lo gana (efecto en `lib/acceso.js`).
- **Es único:** el índice único parcial garantiza una sola persona activa por (contrato, rol).
- **No queda vacío:** `motivo` no puede ir vacío; `nuevoUsuarioId` debe ser una cuenta real, activa y del rol correcto.
- Toast de éxito: "Sustitución registrada. La persona anterior queda en el histórico (no se borra)." (`RosterContrato.jsx:88`).

**5. Qué genera al fallar (HTTP + mensaje exacto del código)**
- Sin autoridad → **403** "Solo la dependencia o el residente asignado puede sustituir personas del roster".
- Contrato cerrado → **409** `msgCerrado('no se sustituyen personas del roster')`.
- Sin bitácora → **409** "El contrato no tiene bitácora abierta; ábrela primero para registrar la sustitución (art. 122 / 125 RLOPSRM)."
- Rol fuera de whitelist (incluida 'dependencia') → **400** "rol inválido (residente | superintendente | supervision)".
- `nuevoUsuarioId` inválido → **400** "nuevoUsuarioId inválido".
- Motivo vacío → **400** "El motivo de la sustitución es obligatorio (art. 125 fr. I g RLOPSRM)".
- Nuevo inexistente → **400** "El usuario nuevo no existe"; no activo → **400** "El usuario nuevo no está activo"; rol de cuenta no coincide → **400** `Para el rol "X" se requiere una cuenta de tipo "Y"`.
- Misma persona → **400** "La persona indicada ya ocupa ese rol".
- **Pendientes (NUEVO requisito profe) → 409:** "No se puede sustituir: la persona saliente tiene N nota(s) de bitácora pendiente(s) de su firma. Debe firmarlas (o vencer su plazo) antes de ser sustituida (art. 125 RLOPSRM)." + `{pendientes:N}` (líneas 183-188). "Pendiente" se define como: nota emitida por OTRA parte (`emisor_id IS DISTINCT FROM` el saliente), que el saliente **no ha firmado** (`NOT EXISTS` en `bitacora_nota_firmas`) y aún **dentro del plazo de firma** (`now() <= bn.fecha + (ba.plazo_firma_dias || ' days')::interval`, líneas 172-179).
- Distinta empresa → **409** "El sustituto debe pertenecer a la MISMA empresa que la persona saliente: la sustitución cambia a la persona, no la empresa del contrato (art. 125 RLOPSRM; el contrato se liga a la empresa)."
- Choque de concurrencia (`23505`) → **409** "Conflicto de concurrencia en el roster; reintenta".

**6. ¿Cambió de comportamiento? — SÍ**
- **El "deseo" ya NO es "ver":** la HU implementa las DOS acciones que pidió el profe — (a) visualizar equipo vigente + histórico (`leerRoster` + tarjetas/tabla), y (b) **ACCIÓN reemplazar/registrar** persona con **motivo obligatorio**, cerrando la asignación anterior (histórico) y creando la nueva vigente (`sustituirPersona` pasos 1-2). Coincide con el feedback.
- **NUEVO requisito "no sustituir a quien tiene pendientes": IMPLEMENTADO con guard 409** (líneas 171-189). Verificación: SÍ lo hace el código, con el criterio "nota de otra parte sin firmar y dentro de plazo". **Matiz/[validar]:** el profe no fijó la regla exacta; el código solo cuenta **notas de bitácora** pendientes de firma — no contempla otros tipos de "pendiente" (p. ej. estimaciones por firmar) si los hubiera. Marcar como criterio del equipo.
- **La persona sustituida pierde acceso al contrato y conserva su histórico:** SÍ (caché escalar reapuntado + histórico intacto). Coincide.
- **Dependencia NO sustituible (art. 125 fr. I g):** SÍ — `ROLES_ROSTER` solo admite `residente/superintendente/supervision` y `COL_CACHE` no expone `dependencia_id` (líneas 23-35); aviso explícito en la UI (`RosterContrato.jsx:115-121`). Coincide.
- **Tensión del plazo de firma del sustituto (2 días vs fecha de la nota):** el profe lo dejó al equipo. **BRECHA / no resuelto en este cluster:** el `plazo_firma_dias` (default **2 días**, art. 123 fr. III) vive en la apertura de bitácora (`bitacora.controller.js:60-62`) y se usa para CALCULAR pendientes del saliente; **no hay lógica que recalcule/ajuste el plazo de firma del SUSTITUTO** tras la sustitución. La nota de sustitución se asienta con la fecha del momento, pero la relación "el sustituto firma en 2 días" no está modelada explícitamente. Anótalo como pendiente de decisión.
- **Restricción "misma empresa":** SÍ se aplica (409). Es **criterio del equipo [validar]** (el art. 125 fr. I g solo obliga a registrar la sustitución; "no cambiar la empresa" no es literal). El profe dijo que la sustitución cambia a la persona, no la empresa — coherente, pero conviene confirmarlo.

**7. Citas legales**
- **Art. 125 fr. I inciso g) RLOPSRM** (literal, verificado en `docs/legal/reg.txt` según comentario `roster.controller.js:23-28`): al residente le corresponde registrar en la bitácora "la sustitución del superintendente, del anterior residente y de la supervisión" → fundamento del whitelist de roles, del motivo obligatorio y de la nota. La **dependencia no figura** → no sustituible.
- **Art. 122 RLOPSRM** — bitácora obligatoria → fundamento del gate "bitácora abierta" (`roster.controller.js:128-132`).
- **Art. 123 fr. III RLOPSRM** — la bitácora asienta los hechos relevantes (la sustitución lo es) y fija el plazo de firma/aceptación (default 2 días) (`roster.controller.js:220`, `bitacora.controller.js:60`).
- **Art. 64 LOPSRM** — contrato cerrado = solo lectura (gate de finiquito, `roster.controller.js:126`).
- **[validar]:** la regla de "pendientes" (qué cuenta como pendiente), la regla "mismo-empresa" del sustituto, la AUTORIDAD para autorizar la sustitución (dependencia o residente/creador) y el ajuste del plazo de firma del sustituto son **criterio del equipo**, no literal de ley (comentarios `roster.controller.js:118-121, 170, 192-197`).


## Alta de contrato y fianzas

### HU-01 — Alta de contratos de obra pública

**1. Identidad**
- **Número / título:** HU-01 — Alta (registro) de un contrato de obra pública.
- **Rol que la EJECUTA (nivel `E`):** `residente` (Residente de obra). En `permisos.js:12`: `'HU-01': { residente:'E', contratista:'C', supervision:'C', dependencia:'C', finanzas:null }`. El backend confirma que solo el residente crea: `crearContrato` toma `req.user.id` como `residente_id`/`created_by` (sin parámetro de rol-arbitrario), y el front muestra el error 403 "Solo el residente puede crear contratos" (`AltaContrato.jsx:1850`).
- **Roles que solo CONSULTAN (nivel `C`):** `contratista`, `supervision`, `dependencia`. **Finanzas: SIN acceso** (`finanzas:null`).

**2. Qué hace HOY, de verdad (paso a paso)**
El residente da de alta un contrato completo en una sola operación atómica. El front es un wizard de varias pestañas (Datos generales → Catálogo → Programa → Jurídicos → Garantías → Plan de amortización → PDF firmado), pero eso es implementación; la ACCIÓN es "registrar el contrato y sus bloques como una sola entidad".
- **Captura de cabecera** (`AltaContrato.jsx:TabDatosGenerales`, ~208): folio, tipo, objeto, ubicación (opcional), plazo en días, fecha de inicio, % de pena por atraso (opcional). La **fecha de término NO se captura: se DERIVA** = inicio + (plazo − 1) tanto en front (`derivarTermino`, AltaContrato:61) como en backend (`contratos.controller.js:24 derivarTermino`, `fechaTerminoDerivada` línea 66). El residente queda como tal automáticamente (cuenta del token); el **contratista/superintendente** y la **dependencia** se eligen de `<select>` de cuentas aprobadas (NO texto libre); la supervisión es opcional.
- **Catálogo de conceptos** (`TabCatalogo`, ~339): cada renglón lleva clave (la captura el usuario), concepto, unidad, cantidad, P.U. El **monto NO se captura: se DERIVA** = Σ ROUND(cantidad×pu, 2). El cálculo autoritativo lo hace Postgres en el backend (`contratos.controller.js:132-149`, `SELECT SUM(ROUND(t.cant*t.pu,2))::numeric(18,2)`), no el cliente. Sin catálogo (precio alzado) sí se captura el monto (línea 145-148).
- **Programa de obra** (`TabProgramaMatriz`, ~447): matriz concepto × periodo; el ciclo (mensual/quincenal) define los periodos, que **genera el backend** (`generarPeriodos`, controller línea 209). Cada concepto debe sumar el 100% de lo contratado; `guardarMatriz` (lib/programa) revalida el cuadre en SQL dentro de la transacción (controller línea 470).
- **Datos jurídicos** (`TabJuridicos`, ~543): firmante de la dependencia, su cargo, representante legal del contratista, cédula profesional (obligatorios) + poder notarial/notaría (opcionales). Se guardan como un solo JSONB en `contratos.datos_juridicos` (controller línea 397; schema `ALTER TABLE contratos ADD COLUMN ... datos_juridicos JSONB`, schema.sql:131).
- **Garantías** (`TabGarantias`, ~620): % de anticipo + pólizas (ver HU-02). Si el anticipo supera el umbral (30%, `ANTICIPO_UMBRAL_PDF`, AltaContrato:40) se exige adjuntar el PDF de autorización del titular (art. 50 fr. IV). El monto de la fianza de anticipo se DERIVA (% × monto, read-only, AltaContrato:679-680).
- **Plan de amortización** (paso `PASO_PLAN_AMORT`): por periodo; default proporcional al programa (art. 143 fr. I), Σ = anticipo al centavo. Se persiste en `plan_amortizacion` (controller línea 475-480; schema.sql:1694).
- **Persistencia transaccional** (`crearContrato`, controller líneas 364-483): un solo `BEGIN…COMMIT` inserta la cabecera en `contratos` (línea 386), siembra el `contrato_roster` con residente+superintendente(+supervisión) (línea 412-420, art. 125), inserta `contrato_conceptos` (424-432), `contrato_actividades` (433-439), `contrato_garantias` (440-447), `contrato_periodos` + programa vía `guardarMatriz` (450-471) y `plan_amortizacion` (475-480). Devuelve `201 { id, folio }`.
- **PDF firmado** del contrato (y, si aplica, autorización del anticipo): se suben DESPUÉS de crear, ligados por `nuevoId` (`AltaContrato.jsx:1821-1828`), vía `subirDocumento` (controller línea 623), guardados en `contrato_documentos` como BYTEA (schema.sql:191), append-only por tipo (409 si ya existe, línea 654).
- **CRÍTICO — apertura de bitácora forzada:** tras guardar, el front redirige a `/bitacora/apertura?contrato=<id>` (`AltaContrato.jsx:1834-1836`) con el mensaje "Contrato guardado: <folio>. Abre su bitácora para poder operar el contrato." El bloqueo REAL (server-side) NO está en el alta sino en los endpoints de operación: estimación (`estimaciones-ciclo.controller.js:177-180`), avance (`trabajos.controller.js:256-258`), convenio (`convenios.controller.js:169-170`), sustitución (`roster.controller.js:131-132`) y atraso (`alertas.controller.js:208-211`) devuelven **409** si `bitacora_aperturas` no tiene fila para ese contrato.

**3. Disparadores y precondiciones**
- Debe existir al menos una cuenta aprobada con rol `contratista` y una con rol `dependencia` (los `<select>` se vacían si no, AltaContrato:247-249/317-319; el backend revalida rol+estado='activo' contra la BD, controller líneas 340-355).
- Validaciones server-side (no se confía en el cliente): campos requeridos (controller 53-58), plazo entero > 0 (60-63), longitudes (71-76), anticipo 0-100 (78-81), pena 0-1 (86-89), cuadre del catálogo y del programa al 100% (`guardarMatriz`), Σ del plan de amortización = anticipo exacto (275-277), reglas R2/R3 del plan (305-316).
- No hay precondición de "bitácora abierta" para crear el contrato (correcto: la bitácora se abre DESPUÉS del alta).

**4. Criterio de éxito observable**
- Se genera **un** registro en `contratos` con `id` y `folio`, y queda **completo, no a medias**: por la transacción, o se guardan cabecera + todos los bloques o no se guarda nada (ROLLBACK, controller 484-489).
- El `monto` NO queda vacío ni capturado a mano: es exactamente Σ ROUND(cantidad×pu,2) (verificable: el indicador "Cuadre exacto" en AltaContrato:406-408 y el total del catálogo coinciden al centavo con el monto guardado).
- La `fecha_termino` NO queda vacía: se deriva del inicio+plazo.
- Quedan filas en `contrato_roster` (residente + superintendente, opc. supervisión) con motivo "Asignación inicial (alta del contrato)".
- El profe lo verifica así: crea un contrato → recibe el folio → es **redirigido a abrir la bitácora** → al intentar estimar/avanzar/conveniar SIN bitácora abierta, el sistema lo **rechaza con 409** (no lo deja operar). Folio único: un segundo alta con el mismo folio da 409 "El folio ya existe".

**5. Qué genera al fallar**
- Campos faltantes: `400 {error:'Faltan campos requeridos', faltantes:[…]}` (controller 56).
- Folio repetido: `409 {error:'El folio ya existe'}` (501-503).
- Clave de concepto repetida: `400 'Hay una clave de concepto repetida…'` (504-506).
- Programa que no cuadra: `400 PROGRAMA_DESCUADRE` con `detalles` (494-496); el front lo bloquea antes con `data-testid="programa-descuadre"` (AltaContrato:530).
- Plan de amortización que no suma el anticipo: `400 'El plan de amortización debe sumar exactamente el anticipo…(art. 138 párr. 3 RLOPSRM)'` (276).
- Garantía a medias / que excede el monto / vencida: `400` con mensaje específico (175-192).
- Sin contratista o sin dependencia válidos: `400` (333/336/344/348).
- Front: banner persistente de error y salto al paso afectado (`handleGuardar` catch, 1842-1853).

**6. ¿Cambió de comportamiento? — SÍ**
- **SÍ (lo que el profe pidió y YA está implementado):**
  1. El monto **se deriva del catálogo**, no se captura (controller 132-149; UI read-only AltaContrato:251-252). ✔ alineado al feedback.
  2. **Forzar abrir la bitácora antes de operar.** El profe sospechaba que el gate vivía en avance/estimación/convenio y NO en el alta — **confirmado tal cual**: el alta solo *redirige* (UI, AltaContrato:1834-1836); el bloqueo real (409 "no tiene bitácora abierta, art. 122 RLOPSRM") está en los endpoints de estimación/avance/convenio/sustitución/atraso (citados en §2). Esto es lo correcto: el alta no puede exigir bitácora porque la bitácora se abre después.
- **BRECHA / matiz para Maiki:** la historia NO debe describir "asistente de 7 pasos" (el profe lo prohibió expresamente); el wizard es elección de implementación. La acción es "dar de alta el contrato". La redacción vieja con pasos debe reescribirse a la ACCIÓN. Además, el front fuerza la apertura por *redirección* (un residente podría volver al menú y operar otra cosa), pero el candado de fondo es server-side, así que el contrato queda inoperable hasta abrir bitácora — esto es robusto y conviene decirlo en la historia como criterio de éxito ("sin bitácora no se puede estimar/avanzar/conveniar").

**7. Citas legales**
- Monto = catálogo/presupuesto: art. 45 fr. IX RLOPSRM (controller 10-12, 131).
- Derivación del término: convención LOPSRM 31-V / RLOPSRM 100 (controller 21-22) `[validar]` (interpretativo del offset).
- Programa de obra = conceptos repartidos: art. 45 fr. X RLOPSRM + art. 52 LOPSRM (AltaContrato:461, 1577); tope Σ ≤ contratado art. 118 RLOPSRM (controller 199).
- Anticipo: tope 30% art. 50 fr. II; autorización escrita del titular si > 30% art. 50 fr. IV; > 50% informar a SFP art. 139 RLOPSRM; 100% solo plurianual último trimestre art. 50 fr. V (AltaContrato:38-40, 635-637).
- Plan de amortización: art. 138 párr. 3 + art. 143 fr. I y III-d RLOPSRM (controller 230-235, 311-314).
- Penas por atraso: art. 46 Bis LOPSRM + arts. 86-88 RLOPSRM, tope art. 90 (controller 82-85).
- Datos jurídicos: art. 46 fr. I y IV LOPSRM, RLOPSRM art. 61 fr. VI-b/VII; cédula profesional marcada como **criterio del equipo / `[validar]`** (no exigida por ley federal al alta, AltaContrato:180-183).
- Roster (sustitución 1:N): art. 125 fr. I-g RLOPSRM (controller 405-411).

---

### HU-02 — Registro de fianzas y garantías (y endosos)

**1. Identidad**
- **Número / título:** HU-02 — Registro y gestión de las pólizas de fianza/garantía de un contrato (incluye endosos).
- **Rol que la EJECUTA (nivel `E`):** `dependencia`. En `permisos.js:13`: `'HU-02': { residente:'C', contratista:null, supervision:null, dependencia:'E', finanzas:'C' }`. **Pero ojo (matiz vs el código):** el backend autoriza la GESTIÓN (crear/editar/endosar/subir PDF) a `puedeGestionar` = rol `dependencia` **O** el residente asignado **O** el creador del contrato (`garantias.controller.js:42-44`). O sea, **el residente también puede gestionar por el backend, aunque en `permisos.js` aparezca como `C`** (porque él crea las garantías desde el alta HU-01). Maiki debe decidir si esto es intencional.
- **Roles que solo CONSULTAN (nivel `C`):** `residente` y `finanzas` (en la matriz). **contratista y supervision: SIN acceso** a la pantalla. La LECTURA del controller (`listarGarantias`, `descargarPdfGarantia`) sí se abre a cualquier parte del contrato vía `esParteOSupervision` (líneas 59, 198).

**2. Qué hace HOY, de verdad (paso a paso)**
Las garantías ya nacen con el contrato (HU-01 las inserta en `contrato_garantias`). HU-02 es la pantalla que las **gestiona, lee, endosa y les liga el PDF real**.
- **Listar** (`RegistroFianzas.jsx`, hereda el contrato activo global vía `BannerContratoActivo`): `GET /api/garantias/contrato/:id` → `listarGarantias` (controller 53-77) devuelve las pólizas con `tiene_pdf` y sus `endosos`. La pantalla pinta tarjetas de alerta (≤5/≤15/≤30 días) y una tabla con tipo, póliza, afianzadora, monto, vencimiento, badge de vigencia y conteo de endosos (RegistroFianzas:225-277).
- **Crear póliza** (`POST /api/garantias/contrato/:id` → `crearGarantia`, controller 81-109): valida tipo, monto>0, monto ≤ monto del contrato, vigencia no vencida (`validarGarantia`, 26-33). **Canonicaliza el `tipo`** a clave (minúsculas + guion bajo) antes de insertar (`tipoNorm`, línea 96) para que el `UNIQUE(contrato_id, tipo)` muerda aunque HU-01 mandara 'Cumplimiento' y HU-02 'cumplimiento'. Graba `registrado_por` desde el JWT (línea 102).
- **Editar póliza** (`PUT /api/garantias/:garantiaId` → `editarGarantia`, 113-135): `contrato_garantias` es editable (sin trigger append-only). Revalida los mismos campos. **NOTA:** `editarGarantia` NO canonicaliza el tipo (usa `String(b.tipo).trim()`, línea 127), pero en el modal de edición el tipo está deshabilitado (RegistroFianzas:60), así que no se cambia.
- **Endoso (ampliación/prórroga)** (`POST /api/garantias/:garantiaId/endoso` → `registrarEndoso`, 139-168): registra un ajuste de la garantía existente en `garantia_endosos` (motivo: ampliacion_monto / prorroga_vigencia / mixto / otro; nuevo_monto y/o nueva_vigencia, observaciones). Es **append-only**: la tabla tiene trigger `BEFORE UPDATE` de inmutabilidad (schema.sql:1041-1044). Exige que el endoso traiga el dato que su motivo ajusta (líneas 157-161). Graba `registrado_por` del JWT (línea 166).
- **PDF de la póliza** (`POST /api/garantias/:garantiaId/pdf` → `subirPdfGarantia`, 172-189): guarda el binario en `contrato_garantias.pdf_contenido` (BYTEA), validando magic bytes `%PDF` (línea 178). Es **reemplazable** (UPDATE, a diferencia del PDF del contrato que es inmutable). Descarga: `GET /api/garantias/:garantiaId/pdf` → `descargarPdfGarantia` (192-205), por participación.

**3. Disparadores y precondiciones**
- Precondición: el contrato debe existir (404 si no, controller 86) y el usuario debe poder gestionar (`puedeGestionar`, 403 si no, línea 87).
- **Contrato cerrado (finiquito) = solo-lectura:** `crearGarantia` (línea 89) y `registrarEndoso` (línea 147) verifican `contratoCerrado` y devuelven **409** (art. 64 LOPSRM). `editarGarantia` y `subirPdfGarantia` NO tienen ese gate — **brecha menor**: se podría editar una póliza o subirle PDF a un contrato ya cerrado.
- Una garantía **por tipo** por contrato (UNIQUE `contrato_id, tipo`, schema.sql:184); el front oculta del `<select>` los tipos ya presentes (RegistroFianzas:152, `tiposDisponibles`) y deshabilita "Agregar" si ya están los 3 (línea 237).
- Validación de campos: solo server-side completa (`validarGarantia`); el modal valida `datosOk` (tipo+afianzadora+monto>0+vigencia, RegistroFianzas:162) pero NO bloquea vigencia vencida en cliente (lo hace el backend).

**4. Criterio de éxito observable**
- Crear: se genera **una** fila en `contrato_garantias` ligada al contrato, con afianzadora, póliza, monto y vigencia **no vacíos** (el backend rechaza monto≤0 o sin tipo). Respuesta `201` con la garantía.
- Endoso: se genera **un** registro NUEVO en `garantia_endosos` (no se altera la póliza original); el conteo "N endoso(s)" sube en la tabla (`endosos-count-<id>`, RegistroFianzas:261). El profe lo verifica: amplía la vigencia → aparece un endoso ligado a la MISMA garantía, no una segunda póliza.
- PDF: la póliza muestra el ojo 👁 para verlo (`tiene_pdf`), y el PDF real abre en pestaña nueva.
- Vigencia: el badge cambia de estado (Vigente → Vence en N d → Vencida) según la fecha.

**5. Qué genera al fallar**
- Tipo duplicado: `409 'El contrato ya tiene una garantía de tipo "X"; edítala en vez de crear otra (una por tipo, art. 48 LOPSRM).'` (controller 106).
- Monto inválido / excede contrato / vigencia vencida: `400` con mensaje de `validarGarantia` (27-31). El front muestra el toast.
- Sin permiso: `403 'Solo la dependencia o el residente asignado puede registrar/editar/endosar…'` (87/119/145/183).
- Contrato cerrado: `409` con `msgCerrado('no se registran garantías'/'…endosos')` (89/147).
- Endoso sin el dato que su motivo exige: `400 'Un endoso por ampliación de monto requiere el nuevo monto…(art. 91 RLOPSRM)'` / '…prórroga…requiere la nueva vigencia…' / 'El endoso no modifica nada…' (159-161).
- PDF no válido: `400 'El archivo no es un PDF válido'` (179); > 10 MB: `400 'El PDF supera el límite de 10 MB'` (routes 22).

**6. ¿Cambió de comportamiento? — SÍ**
- **El reclamo del profe ("No sirve actualizar [ampliar vigencia creando otra póliza]; debe ser un ENDOSO sobre la existente"): RESUELTO en el código.** Ampliar vigencia/monto se hace por `registrarEndoso` → `garantia_endosos` ligado a la MISMA `garantia_id` (controller 139-168, append-only). NO se inserta otra póliza. La UI tiene botón "+ endoso" por fila (RegistroFianzas:266) y modal de endoso (líneas 86-114). ✔ alineado.
- **"Una garantía por tipo (art. 48)": RESUELTO** por el `UNIQUE(contrato_id, tipo)` + canonicalización del tipo (P1, 22-jun, controller 93-96) que cerró el bug de que 'Cumplimiento' (HU-01) y 'cumplimiento' (HU-02) se contaran como tipos distintos y permitieran dos del mismo tipo.
- **"PDF real en BYTEA": RESUELTO** (`pdf_contenido BYTEA`, schema.sql:1181 y ALTER 1865; `subirPdfGarantia`).
- **"Endosos art. 91 RLOPSRM": citado y aplicado** (controller 137-138; trigger de inmutabilidad).
- **BRECHAS para Maiki:**
  1. La matriz `permisos.js` da HU-02 a `dependencia='E'` y `residente='C'`, pero el backend permite gestionar al residente/creador (controller 42-44). Inconsistencia de altitud: la historia debería decir quién EJECUTA de verdad (dependencia y el residente que creó el contrato).
  2. `editarGarantia` y `subirPdfGarantia` carecen del gate de contrato cerrado (art. 64) que sí tienen crear/endosar.
  3. La pantalla RegistroFianzas ofrece solo 3 tipos (cumplimiento/anticipo/vicios_ocultos, RegistroFianzas:14-18), mientras el alta HU-01 ofrece además "Otra" (AltaContrato:90) — desalineación menor del catálogo de tipos.
  4. El esquema base de `contrato_garantias` (schema.sql:175-185) **no** trae las columnas de PDF ni `registrado_por`; se añaden por `ALTER TABLE … ADD COLUMN IF NOT EXISTS` más abajo (schema.sql:1862-1866). Funciona, pero conviene saber que el bloque base y las columnas de HU-02 viven separados.

**7. Citas legales**
- Garantía de anticipo (fr. I) y de cumplimiento (fr. II), dentro de 15 días del fallo: art. 48 LOPSRM (controller 4-5, RegistroFianzas:280-282). "No formalizar sin garantía de cumplimiento": art. 47 LOPSRM (AltaContrato:1629-1635).
- Vicios ocultos: art. 66 LOPSRM (controller 5).
- Endoso = ajuste de la garantía por modificación de monto/plazo: art. 91 RLOPSRM (que remite a la fr. II y último párrafo del art. 98 RLOPSRM) (controller 5-8, 137-138; schema.sql cabecera de `garantia_endosos`).
- Garantía de cumplimiento ≥ 10% del monto: art. 91 RLOPSRM (controller 6) — **mencionado en comentario, NO validado como mínimo en código** (solo se valida monto ≤ contrato, no monto ≥ 10%); marcar como posible `[validar]`/brecha si el profe lo quiere exigido.
- Contrato cerrado = solo-lectura: art. 64 LOPSRM (controller 88-89, 146-147).


## Bitácora: apertura, firma, notas, consulta, minutas

### HU-08 — Apertura formal de la bitácora del contrato

**1. Identidad**
- Número/título: HU-08, "Apertura formal de la bitácora del contrato".
- ROL que la EJECUTA (nivel E): `residente` (`permisos.js:19` → `HU-08: { residente:'E', ... }`). Y dentro del backend, no basta el rol genérico: solo el **residente ASIGNADO a ESE contrato** (`contrato.residente_id === req.user.id`) puede aperturar (`bitacora.controller.js:97`).
- Solo CONSULTAN (nivel C): `contratista` y `supervision` (`permisos.js:19`). `dependencia` y `finanzas` = sin acceso (null).

**2. Qué hace HOY, de verdad (paso a paso)**
1. El residente entra a `AperturaBitacora.jsx`, hereda el contrato activo global (`BannerContratoActivo`, `AperturaBitacora.jsx:225`) o llega por `?contrato=ID` (`AperturaBitacora.jsx:170`). Al seleccionar, el front consulta `GET /api/bitacora/contrato/:id` (`bitacoraDeContrato`, `bitacora.controller.js:348`); si responde 404, no hay bitácora y se ofrece aperturar.
2. El front exige **todos los datos mínimos del art. 123 fr. III** antes de habilitar el botón: domicilios y teléfonos de las dos partes, descripción de los trabajos y características del sitio (`minDataCompleta`, `AperturaBitacora.jsx:137`), más fecha de entrega del sitio y plazo de firma (default 2 días, `AperturaBitacora.jsx:131`).
3. El front llama `POST /api/bitacora/apertura` (`abrirBitacora`, `bitacora.controller.js:50`). El controller, en una transacción:
   - Lee el contrato (`bitacora.controller.js:84`); valida que el solicitante sea el residente asignado (403 si no, `:97`) y que exista superintendente asignado (400 si no, `:102`).
   - Arma el roster de firmantes pendientes: residente + superintendente (+ supervisión si hay) (`:108`), congelando nombre/correo de cada cuenta (`:117`).
   - Construye el **acta inmutable** (`construirActa`, `bitacora.controller.js:10`): identificación, domicilios/teléfonos, objeto, ubicación, descripción de trabajos, características del sitio, datos financieros (monto/anticipo/plazo), cronograma (inicio/fin/entrega de sitio) y firmas.
   - Inserta en `bitacora_aperturas` con `fecha_apertura = contrato.fecha_inicio` (la bitácora se abre el día de **inicio del contrato**, `bitacora.controller.js:133-144`).
   - Inserta una fila `bitacora_firmantes` con `firmado=false` por cada miembro (`:150`).
   - Inserta la **nota #1 tipo 'apertura'** con una narrativa formal redactada a partir de TODOS los datos del alta (folio, objeto, ubicación, partes, monto en MXN, anticipo, plazo, fechas de inicio/fin y entrega de sitio) (`resumenApertura`, `bitacora.controller.js:172-187`); su firma es la conjunta, así que nace con `firmado_en = NULL`.
   - Asienta de forma **DIFERIDA** las notas de hechos ocurridos antes de abrir la bitácora: sustituciones de roster (`:196`), avances ya capturados (`:227`) y convenios ya registrados (`:253`), numerándolas tras la #1.
4. El front muestra la bitácora en solo-lectura (`BitacoraReadOnly`, `AperturaBitacora.jsx:19`) con el acta y el tablero de firmas (cuántas de cuántas).

**3. Disparadores y precondiciones**
- Contrato existente con **residente y superintendente asignados** (server-side: 400 sin superintendente, `:102`; 403 si no eres el residente, `:97`).
- Datos mínimos art. 123 fr. III obligatorios: validados en cliente (`minDataCompleta`, `AperturaBitacora.jsx:137`) y normalizados server-side (`:68-76`), pero **el controller NO los rechaza si llegan vacíos** — solo el front los exige. BRECHA menor: no hay 400 server-side por datos mínimos faltantes.
- Una sola bitácora por contrato: el `UNIQUE` provoca 409 (`err.code === '23505'`, `:284`).
- Esta apertura es la **precondición transversal** de otras HU: sin `bitacora_aperturas` para el contrato, el sistema devuelve 409 al registrar avance (`trabajos.controller.js:256`), convenio (`convenios.controller.js:170`), integrar estimación (`estimaciones.controller.js:71`) y presentar/autorizar estimación (`estimaciones-ciclo.controller.js:177,517`).

**4. Criterio de éxito observable**
- Se crea **una** fila en `bitacora_aperturas` (no se duplica: 2.ª apertura del mismo contrato = 409).
- Se genera la **nota #1 tipo 'apertura'** con contenido NO vacío y redactado (folio, objeto, partes, monto, plazo, fechas) — verificable abriendo "Ver como documento".
- Quedan creadas N filas `bitacora_firmantes` (una por parte del equipo), todas `firmado=false`.
- El acta NO debe quedar con campos vacíos: domicilios, teléfonos, descripción y sitio constan en `acta` y se muestran en `BitacoraReadOnly` (`AperturaBitacora.jsx:65-83`).
- `fecha_apertura` = fecha de inicio del contrato; HTTP 201 con el objeto bitácora.

**5. Qué genera al fallar**
- `contratoId` inválido → 400 `"contratoId inválido"` (`:54`).
- Falta fecha de entrega de sitio → 400 `"Falta la fecha de entrega del sitio"` (`:58`).
- `plazoFirmaDias` fuera de [1,60] → 400 (`:64`).
- No eres el residente asignado → 403 `"Solo el residente asignado a este contrato puede aperturar su bitácora"` (`:99`).
- Sin superintendente → 400 `"El contrato no tiene superintendente asignado; asigna el equipo antes de aperturar"` (`:104`).
- Bitácora ya existente → 409 `"Ya existe una bitácora para este contrato"` (`:284`).
- Contrato inexistente → 404 (`:92` / `:285`).

**6. ¿Cambió de comportamiento? SÍ**
- La apertura es **obligatoria y bloqueante** para todo el ciclo: avance/estimación/convenio devuelven 409 sin bitácora (gates 22-jun en cuatro controllers citados arriba). Antes esos actos se diferían; ahora la bitácora se exige primero. Coincide con el profe ("sin bitácora abierta no se puede registrar avance, estimación ni convenio").
- La apertura ahora **se redacta con los datos del alta** (narrativa formal, `:172`) y **define residente/superintendente/supervisión** como firmantes ligados a cuenta (`:108`). Coincide con el profe ("la apertura debe redactarse con los datos del alta y definir quién es residente/superintendente").
- El **plazo de firma default = 2 días** (`:62`, `schema.sql:402`). Coincide con el profe ("Días para firmar = 2").
- BRECHA: los datos mínimos del art. 123 fr. III no se validan server-side (solo cliente). Maiki debería añadir el 400 server-side para que "el registro no quede con datos vacíos" sea garantizado por backend, no por la UI.

**7. Citas legales**
- Arts. 122-123 RLOPSRM (uso obligatorio de la bitácora; nota especial de inicio); art. 123 fr. III (datos mínimos, plazo de firma); art. 46 LOPSRM (la bitácora vincula a las partes). Citadas en `bitacora.controller.js:8,60,158-182` y `AperturaBitacora.jsx:297,320`. La regla "fecha_apertura = inicio del contrato" se documenta como **criterio del equipo** apoyado en el audio del profe (`:133-136`) — marcar **[validar]** si el profe quiere otra fecha.

---

### "Por Firmar" — Firma de aperturas pendientes (parte de HU-08, identidad/firma conjunta)

**1. Identidad**
- No es una HU numerada propia: es la bandeja de **firma conjunta de la apertura** (nota #1), complemento de HU-08. No tiene fila en `permisos.js`; la ruta es transversal a quien sea firmante.
- La EJECUTA cada **parte del roster** (residente, superintendente, supervisión) desde su propia cuenta. No hay nivel C: o eres firmante (puedes firmar) o el endpoint te devuelve 403.

**2. Qué hace HOY, de verdad (paso a paso)**
1. `PorFirmar.jsx` carga `GET /api/bitacora/pendientes` (`pendientesPorFirmar`, `bitacora.controller.js:328`): devuelve las aperturas donde el usuario del token tiene una fila `bitacora_firmantes` con `firmado=false`, con folio/objeto/su rol/fecha de apertura (`:330`).
2. La tabla lista cada pendiente con su rol ("Tu parte") y un botón **Firmar** (`PorFirmar.jsx:86-98`). Deep-link: si llega `?contrato=ID`, resalta esas filas (`:88`).
3. Al pulsar Firmar, llama `POST /api/bitacora/:aperturaId/firmar` (`firmarApertura`, `bitacora.controller.js:293`): verifica que el usuario sea firmante (403 si no, `:304`), que no haya firmado ya (409, `:305`), y hace la **transición controlada** `firmado=false → true` con `firmado_en=NOW()` (`:307`). El trigger `sigecop_firma_transicion` (`schema.sql:314`) solo permite esa transición.
4. Responde si la apertura quedó **completa** (`pendientes === 0`, `:319`). La misma firma puede hacerse desde `EmisionNotas.jsx` (`firmarApertura`, `EmisionNotas.jsx:165`).

**3. Disparadores y precondiciones**
- Existe una `bitacora_apertura` con firmas pendientes para el usuario. Server-side: solo aparecen y solo se firman las propias (`f.usuario_id = $1`, `:335`; 403 server-side, `:304`).
- Cada quien firma **solo su parte** (no se firma por otro): garantizado server-side por el `WHERE usuario_id = req.user.id`.

**4. Criterio de éxito observable**
- La fila `bitacora_firmantes` del usuario pasa a `firmado=true` con `firmado_en` no vacío (sello de fecha/hora).
- Cuando TODAS las partes firman, la apertura queda **completa** (`completa: pendientes===0`, `:320`); esto es lo que **habilita la emisión de notas** (gate del PUNTO 3, ver HU-09).
- La firma es **append-only**: no se puede re-firmar (409) ni reasignar (trigger).

**5. Qué genera al fallar**
- `aperturaId` inválido → 400 (`:297`).
- No eres firmante → 403 `"No eres firmante de esta apertura"` (`:304`; toast "No eres firmante de esta apertura", `PorFirmar.jsx:41`).
- Ya firmaste → 409 `"Ya firmaste esta apertura"` (`:305`/`:313`; toast "Ya habías firmado esta apertura", `PorFirmar.jsx:40`).

**6. ¿Cambió de comportamiento? SÍ (parcial)**
- La firma de la apertura es **por cuenta y por rol** (firma conjunta derivada de todas las firmas), y al completarse desbloquea la emisión de notas. Coincide con el profe en que la apertura define y vincula a las partes. El profe NO pidió explícitamente esta bandeja; es la mecánica de firma conjunta del equipo.

**7. Citas legales**
- Art. 123 fr. III RLOPSRM (la nota de inicio se firma por el personal autorizado; plazo de firma). Inmutabilidad de la firma: trigger `sigecop_firma_transicion` (`schema.sql:314`), apoyado en art. 123 fr. VI.

---

### HU-09 — Emisión y respuesta de notas tipificadas con firma

**1. Identidad**
- Número/título: HU-09, "Emisión y respuesta de notas tipificadas con firma".
- EJECUTAN (nivel E): `residente`, `contratista`, `supervision` (`permisos.js:20` → todos 'E'). Es la única HU del cluster con tres ejecutores.
- Sin acceso: `dependencia`, `finanzas` (null). Server-side, además, solo las **partes firmantes del contrato** (residente/superintendente/supervisión por punteros del contrato) pueden emitir; quien no es parte recibe 403 (`bitacora.controller.js:561`).

**2. Qué hace HOY, de verdad (paso a paso)**
1. `EmisionNotas.jsx` selecciona contrato, resuelve su apertura (`bitacoraDeContrato`) y carga `GET /api/bitacora/:aperturaId/notas` (`listarNotas`, `bitacora.controller.js:686` → `construirPayloadNotas`, `:602`).
2. **Gate de emisión (server-side, PUNTO 3):** no se puede emitir hasta que la **apertura esté firmada por TODOS** (`emitirNota` cuenta firmantes pendientes y devuelve 409 con el número de firmas faltantes, `bitacora.controller.js:569-577`). La UI lo refleja con el banner `gate-emision` (`EmisionNotas.jsx:330`) y deshabilita el botón (`:376`).
3. El catálogo de tipos viene de `GET /api/bitacora/nota-tipos` (`listarNotaTipos`, `:865`); el front muestra solo los tipos **del rol del usuario** + 'otro' (`tiposDeMiRol`, `EmisionNotas.jsx:72`). El backend valida rol↔tipo contra `bitacora_nota_tipos.rol_emisor` (`validarTipoParaRol`, `:416`; 403 si el rol no puede ese tipo, `:421`).
4. **Emitir nota** (`POST /api/bitacora/:aperturaId/notas`, `emitirNota`, `:542`): valida tipo/contenido, rechaza tipo 'apertura' a mano (`:548`), exige apertura completa, inserta con folio correlativo atómico (`insertarNotaAtomica`, advisory lock + MAX+1, `:428`) y `firmado_en=NOW()` (**el emisor firma al emitir**). HTTP 201.
5. **Firmar (aceptar) una nota** como contraparte (`POST /api/bitacora/notas/:notaId/firmar`, `firmarNota`, `:882`): el emisor no puede (409, `:899`); inserta en `bitacora_nota_firmas` (append-only, `ON CONFLICT DO NOTHING`, `:901`).
6. **Responder/vincular** (`POST /api/bitacora/notas/:notaId/vincular`, `vincularNota`, `:811`): crea una nota NUEVA que referencia la original (`vinculada_a`), sin tocar la original; verifica que la nota destino sea de la misma bitácora (`:839`).
7. **Corregir = anular + nota correctiva** (`POST /api/bitacora/notas/:notaId/anular`, `anularNota`, `:755`): solo el emisor (`:775`), solo si está 'emitida' y no respondida (`:776,782`); marca la original 'anulada' y crea una nota correctiva vinculada con el texto "dice/debe decir" (`:786-793`). La nota de apertura no se anula (403, `:774`).
8. El estado de **aceptación se DERIVA** en `construirPayloadNotas` (`:660-671`): 'firmada' si todo el roster firmó antes del plazo; 'respondida' si otra parte respondió; 'aceptada_tacita' si venció el plazo sin firmas; 'en_plazo' en otro caso; 'anulada' si lo está.
9. El emisor se muestra como **rol + nombre** (`emisor_nombre` + `rol_emisor`, `EmisionNotas.jsx:217`; payload `:611-613`).

**3. Disparadores y precondiciones**
- Bitácora aperturada (404 si no, `:560`).
- **Apertura firmada por TODOS** los participantes (409 server-side, `:574`) — precondición dura para emitir.
- Ser parte firmante del contrato (403 si no, `:561`).
- Rol↔tipo válido (403, `:421`).
- Contrato NO cerrado por finiquito (409 `art. 64 LOPSRM`, `:563`).
- Para firmar nota: no ser el emisor (409, `:899`); para anular: ser el emisor y que no esté respondida (`:775,782`).

**4. Criterio de éxito observable**
- Se genera **una** fila en `bitacora_notas` con folio correlativo (sin saltos, `UNIQUE(bitacora_id,numero)`, `schema.sql:443`), emisor del JWT, `firmado_en` no vacío (el emisor firma al emitir) y contenido NO vacío.
- Al firmar como contraparte: nueva fila en `bitacora_nota_firmas`; la nota pasa a 'firmada' cuando el roster completo firmó.
- Corrección: la original queda 'anulada' y aparece una **nota correctiva vinculada** ("dice/debe decir") con `vinculada_a` apuntando al folio anterior — el profe lo verifica viendo "↪ Vinculada a BIT-XXXX".
- El emisor se ve con **rol + nombre**; la nota es inmutable (trigger `sigecop_nota_inmutable`, `schema.sql:454`).

**5. Qué genera al fallar**
- Falta tipo → 400 `"Falta el tipo de nota"` (`:546`); tipo 'apertura' → 400 `"La nota de apertura (folio #1) la genera la apertura de bitácora, no se emite a mano"` (`:548`); falta contenido → 400 (`:549`); contenido >5000 → 400 (`:550`).
- Apertura no firmada por todos → 409 `"No se pueden emitir notas hasta que la apertura esté firmada por TODOS los participantes (faltan N firma(s))."` (`:576`).
- Rol no autorizado al tipo → 403 `Tu rol (…) no puede emitir notas de tipo "…"` (`:421`).
- Contrato cerrado → 409 (`:563`). Firmar siendo emisor → 409 `"El emisor ya firmó la nota al emitirla; la firma aquí es de la contraparte"` (`:899`). Anular ya respondida → 409 (`:782`).

**6. ¿Cambió de comportamiento? SÍ**
- El **emisor se ve (rol + nombre)** y **firma automáticamente al emitir** (`firmado_en=NOW()`, `:433`). Coincide con el profe ("el emisor debe verse; el que genera la nota la firma automáticamente").
- Las demás partes tienen **"emplazo de firma"**: firman vía `bitacora_nota_firmas`, o se acepta tácitamente al vencer el **plazo de 2 días** (`construirPayloadNotas` deriva 'aceptada_tacita', `:668`). Coincide con el profe.
- **Corrección = nota NUEVA vinculada** que referencia el folio anterior ("dice/debe decir", `:789`). Coincide con el profe.
- El **candado de emisión** ahora exige apertura firmada por TODOS (antes bastaba una firma; bug corregido, `:565-568`).
- Sin brecha relevante respecto al feedback del profe en este punto.

**7. Citas legales**
- Art. 125 RLOPSRM (un emisor por nota; tipos por rol; "otro" para no tipificados); art. 123 fr. III (plazo de firma / aceptación tácita); fr. V (folio correlativo); fr. VI (inmutabilidad); fr. VII (anulación por error); fr. VIII y XII (respuesta/resolución). Todas citadas en `bitacora.controller.js` y `schema.sql:440-481`.

---

### HU-10 — Consulta y búsqueda de notas de bitácora

**1. Identidad**
- Número/título: HU-10, "Consulta y búsqueda de notas de bitácora".
- EJECUTA (nivel E): `residente` (`permisos.js:21`). CONSULTAN (nivel C): `contratista`, `supervision`. Sin acceso: `dependencia`, `finanzas`. En la práctica todos los que tengan acceso consultan igual — `soloLectura` no bloquea la búsqueda (`ConsultaNotas.jsx:24-27`).

**2. Qué hace HOY, de verdad (paso a paso)**
1. `ConsultaNotas.jsx` elige contrato (banner activo) y carga `GET /api/bitacora/contrato/:id/notas` (`notasDeContrato`, `bitacora.controller.js:715`), que resuelve la apertura del contrato y reusa `construirPayloadNotas` (mismo payload que HU-09, con estado de aceptación derivado).
2. El acceso se verifica **sobre el contrato** (participación, `esParteOSupervision`) ANTES de revelar si tiene bitácora (`:725`).
3. Los filtros son **AND, client-side** (`useFiltrosNotas`, `BuscadorNotas.jsx:60`): tipo, fecha desde/hasta, firmante (= emisor), vínculo (Vinculadas/Sin vínculo/Todas) y palabra clave. La palabra clave busca en asunto + contenido + **tag** + etiqueta del tipo, normalizando acentos (`normalizarTexto`, `:16,92`).
4. La tabla muestra folio, tipo (+ tag), fecha y hora, firmante, **vínculo/respaldos** (a nota, y flags `minuta`/`visita`/`avance` derivados por el backend en `:620-622`), asunto y estado de aceptación (`BuscadorNotas.jsx:182-258`).
5. Selección múltiple → **Exportar a Excel** (exceljs client-side, `ConsultaNotas.jsx:113`) con columnas Folio/Fecha/Tipo/Emisor/Vínculo/Asunto/Contenido/Estado.
6. "Ver como documento" abre `DocumentoNota.jsx` (membrete + encabezado + cuerpo + firmantes con rol y hora; para la apertura usa las firmas conjuntas de `aperturaFirmantes`, `DocumentoNota.jsx:32-43`).

**3. Disparadores y precondiciones**
- Ser parte/supervisión del contrato (403 server-side, `:725`).
- Contrato con bitácora aperturada (404 → aviso "sin bitácora" con CTA a HU-08, `ConsultaNotas.jsx:184`).

**4. Criterio de éxito observable**
- La búsqueda devuelve solo notas que cumplen **todos** los filtros simultáneamente (AND); el contador refleja el número (`contador-resultados`, `BuscadorNotas.jsx:178`).
- Se pueden seleccionar varias y **exportar un .xlsx** con esas columnas; cada fila muestra el emisor (no vacío) y su estado de aceptación.
- El vínculo de cada nota es visible (a nota previa y/o flags minuta/visita/avance).

**5. Qué genera al fallar**
- Sin acceso → 403 (toast "No tienes acceso a las notas de este contrato", `ConsultaNotas.jsx:69`).
- Sin bitácora → 404 → aviso `aviso-sin-bitacora` (`:184`).
- Filtros sin coincidencias → "Sin resultados con los filtros aplicados" (`BuscadorNotas.jsx:207`). El export no hace nada si no hay selección (`:114`).

**6. ¿Cambió de comportamiento? SÍ (menor)**
- La consulta ahora muestra **rol + nombre del emisor** y el **tag** estructurado de búsqueda (el profe pidió búsqueda eficiente sin leer el texto embebido; `BuscadorNotas.jsx:92`). También muestra qué notas respaldan minuta/visita/avance (`tiene_minuta/visita/avance`). El profe no dio feedback directo sobre HU-10 en este dominio; los cambios son consecuencia de HU-09/HU-11.
- La búsqueda y export son **client-side** sobre el payload del backend; sin brecha funcional, pero el filtrado no es server-side (no escala a libros enormes) — nota para Maiki, no exigido por el profe.

**7. Citas legales**
- Art. 132 fr. II RLOPSRM (notas de bitácora vinculadas a la estimación, base del concepto de "qué notas respaldan qué"). Acceso por participación: `lib/acceso.js`. El estado de aceptación deriva del art. 123 fr. III/XII (ver HU-09).

---

### HU-11 — Minutas, visitas y acuerdos

**1. Identidad**
- Número/título: HU-11, "Minutas y agenda de visitas" (en pantalla); el dominio cubre minutas, visitas y acuerdos.
- EJECUTA (nivel E): `residente` (`permisos.js:22`). CONSULTAN (nivel C): `contratista`, `supervision`. Sin acceso: `dependencia`, `finanzas`. Server-side, **registrar/agendar/vincular** lo restringe a quien es residente del contrato o su creador (`puedeRegistrar`, `minutas.controller.js:18`); leer es por participación (`esParteOSupervision`).

**2. Qué hace HOY, de verdad (paso a paso)**
1. `MinutasVisitas.jsx` (3 pestañas: Minutas, Agenda de visitas, Acuerdos) elige contrato y carga `GET /api/minutas/contrato/:id` (`listarMinutas`, `:31`), `GET /api/minutas/contrato/:id/visitas` (`listarVisitas`, `:133`) y las notas del contrato (para el modal de vínculo) (`MinutasVisitas.jsx:210-214`).
2. **Registrar minuta** (`POST /api/minutas/contrato/:id`, `crearMinuta`, `:51`): exige título, fecha, **lugar y participantes** (validados server-side, `:61-65`); valida que `nota_id` (si se manda) pertenezca a la bitácora del contrato (`:67`); persiste en `minutas`. El **PDF** se sube aparte (`POST /api/minutas/:minutaId/pdf`, `subirPdfMinuta`, `:100`; valida magic bytes `%PDF`, `:106`, límite 10 MB en la ruta, `minutas.routes.js:16`).
3. **Agendar visita** (`POST /api/minutas/contrato/:id/visitas`, `crearVisita`, `:153`): exige fecha programada, **lugar, responsable y propósito** (server-side, `:163-167`); estado inicial 'agendada'.
4. **Vincular a una nota** (modal `ModalAdjuntar`): `PATCH /api/minutas/:minutaId/nota` (`vincularNotaMinuta`, `:85`) o `PATCH /api/minutas/visita/:visitaId/nota` (`vincularNotaVisita`, `:178`). Solo el residente (`puedeRegistrar`, 403); la nota debe ser de la bitácora del mismo contrato (`notaDelContrato`, `:22`). El vínculo NO modifica la nota (es una relación, `minutas.controller.js:1-7`).
5. **Acuerdos**: pestaña que deriva los acuerdos capturados en las minutas del contrato (`TabAcuerdos`, `MinutasVisitas.jsx:160`).
6. La consulta muestra el **folio de la nota** vinculada (`bn.numero`, `:42,144`), no el id interno.

**3. Disparadores y precondiciones**
- Contrato existente (404, `:56`).
- Para registrar/agendar/vincular: ser el residente asignado/creador (403 `puedeRegistrar`, `:57,159,91`).
- Contrato NO cerrado por finiquito (409 art. 64, `:59,161`).
- Para vincular: debe existir al menos una nota de la bitácora del contrato (si no, el modal lo avisa: "Este contrato no tiene notas… HU-08/HU-09", `MinutasVisitas.jsx:41`); la nota debe ser del mismo contrato (400 si no, `:67,93,189`).
- NO hay gate de "bitácora abierta" para crear la minuta/visita en sí (a diferencia de avance/convenio); solo el **vínculo** exige una nota existente.

**4. Criterio de éxito observable**
- Se genera **una** fila en `minutas` (o `visitas`) ligada al contrato, con lugar/participantes (o responsable/propósito) NO vacíos, y `registrada_por` del JWT.
- Si se subió PDF: `tiene_pdf=true` y se puede ver (`GET /api/minutas/:minutaId/pdf`, `:116`).
- Al vincular: `minutas.nota_id`/`visitas.nota_id` queda con el folio de una nota del propio contrato; la nota original NO cambia (verificable: su contenido/estado siguen iguales). En HU-10 la nota muestra el flag "minuta"/"visita".
- El acuerdo capturado aparece en la pestaña Acuerdos con su minuta y nota vinculada.

**5. Qué genera al fallar**
- Falta título/fecha/lugar/participantes (minuta) → 400 con mensaje específico (`:61-65`), p. ej. `"El lugar de la minuta es obligatorio"`.
- Falta fecha/lugar/responsable/propósito (visita) → 400 (`:163-167`).
- No eres el residente → 403 `"Solo el residente asignado al contrato puede registrar minutas"` / `"…agendar visitas"` / `"…vincular…"` (`:57,159,91,187`).
- Contrato cerrado → 409 (`:59,161`). Nota ajena → 400 `"La nota indicada no pertenece a la bitácora de este contrato"` (`:67,93,189`). PDF no válido → 400 `"El archivo no es un PDF válido"` (`:106`); >10 MB → 400 (`minutas.routes.js:22`).

**6. ¿Cambió de comportamiento? SÍ**
- El "adjuntar a nota" dejó de ser informativo y **persiste el vínculo** minuta/visita ↔ nota de bitácora **sin alterar la nota** (relación, no edición). Coincide con el profe ("minutas/visitas se vinculan a una nota de bitácora art. 123 fr. X sin alterarla").
- Se validan server-side **lugar/participantes** (minuta) y **lugar/responsable/propósito** (visita) — antes solo el front (`:63-65,164-167`).
- BRECHA respecto a memoria de hallazgos previos: el campo "responsable" de la visita es **texto libre** (`vis-responsable`, `MinutasVisitas.jsx:120`), no un select del roster del contrato — el profe sugirió que el responsable salga del roster (art. 114). No implementado: marcar para Maiki.
- BRECHA: crear una minuta/visita NO exige bitácora abierta (solo el vínculo necesita una nota existente). Si el profe quiere que toda actividad de bitácora viva dentro de una bitácora abierta, faltaría ese gate aquí (a diferencia de avance/convenio/estimación).

**7. Citas legales**
- Art. 123 fr. X RLOPSRM ("se podrán ratificar en la Bitácora las instrucciones emitidas vía oficios, minutas, memoranda y circulares…") — fundamento del vínculo minuta↔nota (`minutas.controller.js:4-6`). Inmutabilidad de la nota vinculada: art. 123 fr. VI (el trigger queda intacto). El responsable de visita desde el roster sería art. 114 / 53 LOPSRM — **[validar]** (pendiente).


## Programa/curva de avance, trabajos terminados y alertas de atraso

### HU-05 — Programa y curva de avance

**1. Identidad**
- Número/título: HU-05 — Programa y curva de avance (matriz concepto × periodo + curva S programado/ejecutado/financiero + % de avance físico).
- ROL que la EJECUTA (nivel E): **residente** (`permisos.js:16` → `'HU-05': { residente:'E', ... }`).
- Roles que solo CONSULTAN (nivel C): **contratista, supervisión, dependencia** (todos `'C'`). **finanzas: `null`** (sin acceso a esta HU).
- IMPORTANTE: aunque el rol académico es "Residente", esta pantalla NO escribe nada en backend; es 100% lectura/composición en cliente. El nivel E vs C aquí solo gobierna si la región es editable, pero no hay nada que editar — la HU no tiene captura.

**2. Qué hace HOY, de verdad (paso a paso)**
La página (`frontend/src/pages/CurvaAvance.jsx`) es un **compositor de solo lectura** que NO toca backend nuevo: arma todo en cliente a partir de tres endpoints existentes.
1. Hereda el contrato activo global vía `<BannerContratoActivo>` (`CurvaAvance.jsx:424`); ya no hay `<select>` de contrato. También preselecciona por `?contrato=ID` (`CurvaAvance.jsx:238-241`).
2. Al seleccionar contrato, `seleccionarContrato` (`CurvaAvance.jsx:202-233`) dispara **en paralelo**: `api.leerProgramaObra(id)` (→ `GET /contratos/:id/programa`, da periodos+conceptos+celdas planeadas) y `api.trabajosDeContrato(id)` (→ controller `trabajos.controller.js:trabajosDeContrato`, da conceptos con `acumulado_ejecutado` + avances). Luego, en un `try` aparte, `api.listarPagos(id)` para la curva financiera (si falla, se omite la serie sin romper la vista, `CurvaAvance.jsx:220-225`).
3. **Curva PROGRAMADA**: `datosCurva` (`CurvaAvance.jsx:334-364`) acumula `planeadoMap` (celdas `programa_obra`) hasta cada periodo ÷ `denom` (Σ contratado del filtro) ×100. Llega al 100%.
4. **Curva EJECUTADA**: acumula `ejecCeldaMap` (Σ `concepto_avance.cantidad` por celda, solo avances CON `contrato_periodo_id`, `CurvaAvance.jsx:266-274`) ÷ `denom` ×100. **Se corta en "hoy"**: es `null` para periodos con `numero > periodoActualNum` (`CurvaAvance.jsx:347`).
5. **Curva FINANCIERA**: `financieroMap` (`CurvaAvance.jsx:291-306`) = Σ `pagos.importe` con `fecha_pago ≤ corte` ÷ `selected.monto` ×100; el periodo en curso/terminal corta en hoy (FIX P5 22-jun, `CurvaAvance.jsx:299-301`) para que un pago posterior al fin del programa no quede fuera de la ventana.
6. **Punto de origen (Inicio, 0%)**: cuando la ventana arranca en el primer periodo, antepone un punto `{label:'Inicio', numero:0, programado:0, ejecutado:0 si iniciado, financiero:0 si iniciado y hay monto}` (`CurvaAvance.jsx:353-362`). Esto materializa el reclamo del profe "las 3 series inician en 0".
7. **% avance físico global**: `avanceGlobal` (`CurvaAvance.jsx:382-386`) = Σ `c.ejecutado` ÷ Σ `c.contratado` ×100, donde `c.ejecutado` viene de `trabajos.conceptos.acumulado_ejecutado`. Se muestra en el `EncabezadoContrato` ("Avance físico global", `CurvaAvance.jsx:444`) y en la matriz (`data-testid="avance-global"`, `CurvaAvance.jsx:554`). **% por concepto**: `ejecutado/contratado ×100` por fila (`CurvaAvance.jsx:499`, `:576`).
8. **KPIs** (`CurvaAvance.jsx:373-379`): Programado/Ejecutado/Financiero "a hoy" + **Desviación** = `ejecutado − programado`; se rotula como **"Atraso de X%"** si negativo, **"Adelanto de X%"** si positivo (`CurvaAvance.jsx:522-528`), usando `Math.abs` — atiende el feedback del profe de no mostrar "−61%".
9. **Matriz tipo Gantt** (`CurvaAvance.jsx:549-609`): celda por concepto×periodo coloreada con `colorCelda` (`:389-395`): `ejecutado` (verde) si Σ ejecutado>0, `atraso` (rojo) si planeado>0 y `fin < hoy` sin ejecutar, `pendiente` (ámbar) si planeado>0 por venir, `vacio` (gris) si planeado=0.
10. **Filtros** (`CurvaAvance.jsx:455-477`): por concepto (`Todos`/id) y por rango de periodos (`todo`/`ultimos3`/`ultimo`); recalculan matriz y curva.

**3. Disparadores y precondiciones**
- Requiere: sesión (`token`), contrato seleccionado/activo, y que el usuario sea PARTE del contrato (el backend de `trabajosDeContrato` y `leerProgramaObra` aplican `esParteOSupervision` → 403 si no, `trabajos.controller.js:142-144`).
- Para que la **curva ejecutada** muestre algo: tiene que existir `concepto_avance` CON `contrato_periodo_id` (los avances sin periodo no entran a la celda ni a la serie, `CurvaAvance.jsx:269`). Esto NO se valida server-side aquí; es composición de cliente.
- Para que haya curva/matriz: el contrato debe tener programa (periodos). Si no, muestra el banner "Este contrato aún no tiene programa de obra" (`CurvaAvance.jsx:448-453`) y solo conserva el % físico global.
- "hoy" / periodo actual: se calcula en cliente con `hoyISO()` y `periodoActualNum` (`CurvaAvance.jsx:276-284`).

**4. Criterio de éxito observable**
- HU-05 **no genera ningún registro ni notificación** (es lectura). El criterio verificable es de PRESENTACIÓN: con un contrato que tiene programa y al menos un avance imputado a periodo, el profe debe ver: (a) la **curva ejecutada partiendo de 0% en "Inicio"** y subiendo, NO en blanco ni plana; (b) el **% de avance físico global ≠ del valor errado anterior** — ahora deriva de `Σ ejecutado ÷ Σ contratado`; con 0 avances debe leerse 0%, no "14.9%"; (c) la **desviación rotulada "Atraso de X%"** (texto positivo), nunca "−X%"; (d) la matriz con celdas verdes donde hubo ejecución y rojas donde venció sin ejecutar.
- "El registro no queda con datos vacíos": en el sentido de la curva, las 3 series tienen punto de origen 0% y la financiera ya no se queda en 0 por la ventana (FIX P5).

**5. Qué genera al fallar**
- Sin acceso al contrato: el GET devuelve **403** y la página muestra banner rojo "No tienes acceso al programa de este contrato" (`CurvaAvance.jsx:227`, `:430-434`, `data-testid="banner-error"`).
- Sin programa: banner ámbar "⚠️ Este contrato aún no tiene programa de obra (periodos) configurado…" (`CurvaAvance.jsx:449-452`).
- Sin avance ejecutado: la curva muestra el estado vacío con CTA "Registrar avance →" hacia HU-06 (`CurvaAvance.jsx:59-75`).
- Otros errores de carga: toast + `error` con `e.payload?.error` (`CurvaAvance.jsx:227`).

**6. ¿Cambió de comportamiento? SÍ.**
- El profe vio la curva **en blanco/0 (rota)** y el % de avance **mal (14.9% cuando debía ser 0 o 50%)**. El código actual ya trae las correcciones de 22-jun:
  - El **% físico global se deriva de `Σ ejecutado ÷ Σ contratado`** (`CurvaAvance.jsx:382-386`), no de un `fisico_pct` pre-calculado dudoso → con 0 avances da 0%.
  - Las 3 series ahora **inician en 0% (punto "Inicio")** y cada periodo grafica a su cierre (`CurvaAvance.jsx:353-362`), corrigiendo la curva "en blanco".
  - La desviación se rotula **"Atraso de X%"/"Adelanto de X%"** con `Math.abs` (`CurvaAvance.jsx:522-528`) — atiende directamente "no existe avance negativo".
  - FIX P5 (financiero): el corte por periodo terminal acumula pagos hasta hoy (`CurvaAvance.jsx:299-301`) para que el financiero no se quede en 0%.
- **BRECHA / observación para Maiki**: el `AmbienteAvance.jsx` (el cascarón que enlaza a esta HU) muestra KPIs de avance tomados de OTRA fuente (`prep.avance` de estimacion-prep: `av.fisico_pct`, `av.planeado_pct`, `av.financiero_pct`, `AmbienteAvance.jsx:127-132`), mientras la pantalla HU-05 deriva el físico de `Σ ejecutado ÷ Σ contratado`. Son dos definiciones distintas de "% físico" conviviendo; el comentario del propio archivo dice que usa "la MISMA fuente que la curva", pero la curva real (CurvaAvance) NO usa `prep.avance` para el físico global. Posible número discrepante entre el ambiente y la pantalla. Conviene que Maiki confirme que `fisico_pct` (prep) == `avanceGlobal` (curva) o unifique.

**7. Citas legales**
- Programa por periodos: art. 52 LOPSRM + art. 45 apartado A fr. X RLOPSRM (`CurvaAvance.jsx` comentarios; schema `:1142-1143`).
- El concepto de "atraso/desviación" se ata al programa (45-A-X) y a las penas convencionales del art. 46 Bis LOPSRM (schema `:1144`). El render del % y de la curva en sí es operativo (presentación) → **[validar]** que el profe acepte la definición de "físico = Σ ejecutado ÷ Σ contratado" y "financiero = Σ pagado ÷ monto".

---

### HU-06 — Trabajos terminados por periodo (avance físico, con evidencia fotográfica)

**1. Identidad**
- Número/título: HU-06 — Registro de trabajos terminados (cantidad ejecutada por concepto, imputada a un periodo del programa, con nota automática de bitácora y foto de evidencia).
- ROL que la EJECUTA (nivel E): **contratista** (`permisos.js:17` → `'HU-06': { contratista:'E', ... }`). El router lo refuerza: `POST /` y `POST /:id/corregir` exigen `requireRole('contratista')` (`trabajos.routes.js:20,22`).
- Roles que solo CONSULTAN (nivel C): **residente, supervisión** (`'C'`; el GET acepta `contratista, residente, supervision`, `trabajos.routes.js:16`). **dependencia y finanzas: `null`** (fuera de la HU).

**2. Qué hace HOY, de verdad (paso a paso)**
La acción es **registrar trabajos terminados (avance ejecutado)**. Pantalla: `frontend/src/pages/TrabajosTerminados.jsx`; backend: `backend/src/controllers/trabajos.controller.js`.
1. El contratista hereda el contrato activo (`<BannerContratoActivo>`, `TrabajosTerminados.jsx:266`); `seleccionarContrato`→`recargar` llama `api.trabajosDeContrato(id)` (`trabajos.controller.js:trabajosDeContrato`, `:130-209`), que devuelve conceptos (con `acumulado_ejecutado`), avances, periodos, programa y notas tipo `avance`.
2. **Preselección de periodo en curso**: `recargar` (`TrabajosTerminados.jsx:87-92`) preselecciona el periodo que CONTIENE hoy (o el último ya iniciado). Esto materializa "estás en ese periodo, solo se reporta de ese periodo".
3. El contratista elige concepto + periodo + cantidad. Hay un **toggle "Ejecuté todo lo programado del periodo"** (`TrabajosTerminados.jsx:387-397`, `autollenarTodo` `:176-179`) que autollena con `refPrograma.disponible` = programado_acum − ejecutado_acum (atiende "opción de ejecutar todo el programa" del profe).
4. `registrar` (`TrabajosTerminados.jsx:181-205`) → `api.registrarAvance` → `POST /api/trabajos` → `registrarAvance` (`trabajos.controller.js:214-353`). Server-side, dentro de una transacción con `FOR UPDATE` sobre el concepto (cierre de carrera art. 118, `:241`):
   - Valida forma: `contrato_concepto_id`, `cantidad ≥ 0` cuantizada a 3 decimales (`q3`), `periodo_numero` requerido (`:216-229`).
   - Acceso por participación (`esParteOSupervision`, `:245`) → 403.
   - **Gate contrato cerrado/finiquito** (`contratoCerrado`, `:250-253`) → 409 (art. 64 LOPSRM).
   - **Gate bitácora abierta OBLIGATORIA** (`bitacoraAbiertaId`, `:256-259`) → 409 "El contrato no tiene bitácora abierta; ábrela primero… (art. 122 RLOPSRM)".
   - El periodo debe existir en el programa (`:262-266`) → 400.
   - **Periodo FUTURO bloqueado** (`:271-279`): si `inicio > CURRENT_DATE` → 409 "El periodo N aún no inicia (comienza el …); no se puede reportar avance de trabajo no ejecutado." Periodo YA CERRADO se permite pero con `aviso_periodo` (registro tardío, `:280-282`).
   - **Programa por periodo = AVISO, NO bloqueo** (`validarProgramaPeriodo`, `:92-118`, `:288-291`): si excede lo programado del periodo o el concepto no estaba programado, se registra igual y devuelve `aviso_programa` (el profe: adelantar a precios pactados no requiere convenio).
   - **art. 118 = BLOQUEO DURO** (`:294-298`): `acumulado ejecutado + cantidad > contratada` → 409 "Excede lo contratado (art. 118 RLOPSRM) en: <concepto>".
5. **Nota automática de bitácora tipo `avance`**: si `cantidad > 0` y hay bitácora abierta, inserta nota atómica con `insertarNotaAtomica` + `textoNotaAvance` (`trabajos.controller.js:307-318`; texto en `bitacora.controller.js:479-488`: "Avance de trabajos — <concepto>: se ejecutaron X <unidad> en el periodo N…"). Se liga `nota_id` al avance. Si NO hubiera bitácora… ya no llega aquí porque el gate previo lo bloquea (la rama "diferida" del código `:330-336` quedó **muerta** tras P23). El INSERT en `concepto_avance` fija `fecha = periodo.fin` (`:326`).
6. **Evidencia fotográfica**: en la tabla de avances, cada fila vigente tiene un control "📷 Foto" (`TrabajosTerminados.jsx:539-543`) → `subirFotoAv` → `api.subirFotoAvance(avanceId, file)` → `POST /api/avance-fotos/avance/:avanceId` (controller `avance-fotos.controller.js:subirFoto`, `:62-79`). Valida JPEG/PNG por magic bytes + multer (5 MB), guarda BYTEA inline en tabla `avance_fotos`, `subido_por` del JWT.
7. **Corrección (append-only)**: el botón "Corregir" (`TrabajosTerminados.jsx:537`) NO edita: abre edición inline y al guardar llama `api.corregirAvance` → `POST /api/trabajos/:id/corregir` → `corregirAvance` (`trabajos.controller.js:360-462`): (1) **anula** la original (`estado vigente→anulada`, el trigger BD solo permite esa transición sin tocar datos, schema `:1098-1121`); (2) revalida art. 118 sobre vigentes; (3) inserta una entrada NUEVA con `reemplaza_a = original`; (4) genera nota "dice X, debe decir Y" (`:423-431`, cita art. 123 fr. VI/VII RLOPSRM).

**3. Disparadores y precondiciones**
- **Bitácora abierta** (server-side, 409 art. 122 RLOPSRM) — exigida tanto en registrar como en corregir (`:256-259`, `:392-393`).
- **Contrato no cerrado/finiquitado** (server-side, 409 art. 64, `:250-253`, `:390-391`).
- **Periodo seleccionado debe existir y no ser futuro** (server-side: 400 si no existe, 409 si futuro, `:262-279`).
- art. 118 acumulado ≤ contratado (server-side, 409, `:294-298`). En cliente también hay validación-guía `excede118` que deshabilita el botón (`TrabajosTerminados.jsx:161,172-173`), pero el backend es la verdad.
- Foto: se sube por separado tras registrar (control por fila); el JPEG/PNG y el tamaño se validan en multer + magic bytes server-side (`avance-fotos.routes.js:12-19`, `avance-fotos.controller.js:68`).

**4. Criterio de éxito observable**
- Al registrar un avance válido: **se genera UNA entrada `concepto_avance` vigente** (no editable) + **UNA nota de bitácora tipo `avance` única, con folio** ("se ejecutaron X <unidad> en el periodo N"), ligada por `nota_id`. El profe verifica: aparece la fila en "Avances registrados" con su número de nota `#N` (`TrabajosTerminados.jsx:504-510`), y la nota NO tiene datos vacíos (trae concepto, cantidad, unidad, periodo). Respuesta HTTP **201** con `{avance, nota:{id,numero,tipo}}` (`trabajos.controller.js:332-342`).
- Al subir foto: **se crea UNA fila `avance_fotos` con contenido BYTEA**, respuesta 201 `{...tiene_foto:true}` (`avance-fotos.controller.js:78`); el toast confirma "Evidencia fotográfica del avance guardada".
- Al corregir: la entrada anterior queda como **"anulada (corregida)"** (`TrabajosTerminados.jsx:534`) y aparece una entrada NUEVA + una nota "dice/debe decir". El estado del dato cambió vigente→anulada y NO se borró.

**5. Qué genera al fallar**
- Sin bitácora: **409** "El contrato no tiene bitácora abierta; ábrela primero para registrar el avance (art. 122 RLOPSRM)." (`:258`).
- Periodo futuro: **409** "El periodo N aún no inicia (comienza el …); no se puede reportar avance de trabajo no ejecutado." (`:278`).
- Exceso art. 118: **409** "Excede lo contratado (art. 118 RLOPSRM) en: <concepto>" (`:297`). En cliente, banner rojo `data-testid="aviso-exceso"`: "⛔ **La cantidad acumulada excede lo contratado** en este concepto (art. 118 RLOPSRM)…" (`TrabajosTerminados.jsx:431-435`) — coincide casi literal con el mensaje que pidió el profe ("La cantidad acumulada excede lo contratado").
- Exceso de programado / concepto no programado: NO bloquea — **aviso** ámbar `aviso_programa`/`data-testid="aviso-no-programado"`/`"aviso-excede-periodo"` (`TrabajosTerminados.jsx:436-445`; backend `:103,:115`).
- Contrato cerrado: **409** `msgCerrado('no se registra avance')` (`:252`).
- Foto inválida: **400** "El archivo no es una imagen JPEG/PNG válida" / "La imagen supera el límite de 5 MB" (`avance-fotos.controller.js:68`, `avance-fotos.routes.js:23`).
- Sin acceso: **403** "No tienes acceso a este contrato" (`:247`).

**6. ¿Cambió de comportamiento? SÍ (varios FIX), pero con UNA BRECHA importante.**
- **Solo periodo actual (profe)**: PARCIALMENTE atendido. El periodo FUTURO sí está bloqueado server-side (409, `:271-279`) y el periodo en curso se preselecciona (`:87-92`). PERO el periodo YA CERRADO **se permite** (registro tardío con aviso, `:280-282`). El profe dijo "estás en ese periodo, solo se puede reportar de ese periodo" — si su intención era prohibir TAMBIÉN periodos pasados, esto es una **BRECHA parcial** (hoy pasado = permitido-con-aviso, no bloqueado). Maiki debe confirmar si pasado debe ser bloqueo o aviso.
- **Nota automática de bitácora + bitácora obligatoria (profe)**: atendido (P23, 22-jun) — ahora exige bitácora abierta (409) en vez de diferir. La nota tipo `avance` se genera sola.
- **art. 118 "no excede lo contratado" con el mensaje exacto**: atendido (`:297` + banner cliente).
- **Corrección = nota nueva vinculada, NO editar (profe)**: atendido a nivel BACKEND y BD (append-only, trigger, `corregirAvance` anula+registra nuevo con nota "dice/debe decir"). **BRECHA DE UI a vigilar**: el botón sigue rotulándose **"Corregir"** y abre una **edición INLINE** de la cantidad (`TrabajosTerminados.jsx:493-501,537`), que VISUALMENTE parece "editar el renglón". Aunque por debajo NO edita (anula + crea registro nuevo), el profe dijo "si existe un botón que edita, es BRECHA". El comportamiento real es correcto (append-only), pero la AFFORDANCE visual (campo editable en la misma fila) puede leerse como edición → conviene que Maiki ajuste el copy/UX (p. ej. "Registrar corrección" con campos nuevos, no input sobre la fila) para que no parezca edición. Reportado como brecha de presentación, no de lógica.
- **Evidencia fotográfica al registrar (profe)**: atendido en backend (tabla `avance_fotos`, endpoint, validación) y existe el control "📷 Foto". **BRECHA de momento**: la foto se sube DESPUÉS de registrar, por fila, como acción separada y OPCIONAL; NO se "pide" como parte obligatoria del registro (el profe dijo "al registrar el avance se debe pedir y guardar foto"). Hoy un avance puede quedar SIN foto. Maiki debe decidir si la foto es obligatoria en el flujo de captura.
- **"avance negativo" no existe**: atendido — `cantidad ≥ 0` (CHECK en schema `:1071` + validación `:221`); no hay captura de negativos.

**7. Citas legales**
- art. 118 RLOPSRM (cantidad por mayor valor de lo contratado sin orden = no pagable) — BLOQUEO (`:297`, schema `:1050-1051`).
- art. 122 RLOPSRM (bitácora) — exigencia de bitácora abierta (`:258`).
- art. 125 fr. II RLOPSRM (entrega de concepto) — nota automática de avance (`bitacora.controller.js:486`).
- art. 123 fr. VI/VII RLOPSRM (append-only / corregir = registro vinculado) — corrección (`:428`, schema `:1082`).
- art. 64 LOPSRM (contrato cerrado = solo lectura) — gate finiquito (`:252`).
- art. 132 fr. IV / 122 RLOPSRM (evidencia fotográfica) — `avance-fotos.controller.js:1`. (El emisor de la nota de avance = contratista se marca como criterio del equipo bajo art. 123 fr. II RLOPSRM, `:303` — **[validar]** si el profe quiere otro emisor.)

---

### HU-07 — Alertas de atraso por concepto

**1. Identidad**
- Número/título: HU-07 — Atraso por concepto (déficit automático en unidades = programado acumulado − ejecutado acumulado, al periodo vigente; con acción "Asentar en bitácora").
- ROL que la EJECUTA (nivel E): **residente** (`permisos.js:18` → `'HU-07': { residente:'E', ... }`). El "Asentar en bitácora" lo gatea el frontend por `soloLectura` (`AlertasAtraso.jsx:87,182`).
- Rol que solo CONSULTA (nivel C): **supervisión** (`'C'`). **contratista, dependencia, finanzas: `null`** (fuera de la HU). Nota: el GET `alertasDeContrato` y `asentarAtraso` acotan por `esParteOSupervision` server-side, pero el router de alertas no exige rol específico en este flujo (el gate de rol vive en `permisos.js`/frontend); dependencia/finanzas ven todo vía `venTodo` en `resumenAtrasos`/`alertasDetalle` (`alertas.controller.js:122,279`).

**2. Qué hace HOY, de verdad (paso a paso)**
Panel **automático, sin configuración** (rediseño P15). Pantalla: `frontend/src/pages/AlertasAtraso.jsx`; backend: `backend/src/controllers/alertas.controller.js`.
1. Selección de contrato (hereda activo, `AlertasAtraso.jsx:133`; preselección por `?contrato=ID` y resaltado por `?concepto=ID`, `:69-77`) → `api.alertasDeContrato(id)` → `GET /api/alertas/contrato/:id` → `alertasDeContrato` (`:84-113`).
2. **Cálculo del déficit** (`deficitsDeContrato`, `:48-80`): por cada concepto del catálogo, `programado_acumulado` = Σ `programa_obra` en periodos con `numero ≤ periodo_actual` (`periodoActualDe` = mayor periodo con `inicio ≤ CURRENT_DATE`, `:34-44`); `ejecutado_acumulado` = Σ `concepto_avance.cantidad` **TOTAL** (no acotado a periodo, para que ir adelantado nunca cause falso atraso, `:56-58`); `deficit = q3(programado − ejecutado)`. Solo se devuelven las filas con `deficit > EPS` (`:100`).
3. El frontend pinta la tabla "Conceptos en atraso" con Programado acum., Ejecutado acum. y **Déficit en unidades** (`AlertasAtraso.jsx:174-225`), rotulando el periodo de medición (`:160-164`). Un concepto sin déficit no aparece; si ninguno tiene déficit muestra "Sin atrasos: lo ejecutado va al día…" (`:189-191`).
4. **Asentar en bitácora** (residente): `asentar` (`AlertasAtraso.jsx:86-99`) → `api.asentarAtraso` → `POST /api/alertas/contrato/:id/asentar` → `asentarAtraso` (`:168-270`): valida acceso (403), que el concepto pertenezca al contrato (404), recalcula el déficit ACTUAL (409 si ya no hay atraso), **exige bitácora abierta** (409 art. 123, `:208-212`), **idempotencia** un solo asiento por (concepto, periodo) vía tabla `atraso_asentado` + UNIQUE `uq_atraso_asentado` (pre-check 409 + red dura 23505→409, `:214-225,262-264`), y genera la **nota tipo `atraso`** con `insertarNotaAtomica`+`textoNotaAtraso` (`:227-237`; texto "Atraso registrado — <concepto>: déficit de X <unidad> respecto del programa al periodo N…", `bitacora.controller.js:497-507`). **Emisor = `residente_id` del contrato** (nota de consecuencia, art. 53 LOPSRM, `:231-233`).
5. **Aviso global al login**: `resumenAtrasos` (`GET /api/alertas/resumen`, `:119-163`) cuenta conceptos/contratos con déficit acotado por participación (`venTodo` para dependencia/finanzas) → alimenta el badge de la campana. `alertasDetalle` (`GET /api/alertas/detalle?contrato=ID`, `:276-325`) da las FILAS accionables para el Centro de Notificaciones (LIMIT 100).

**3. Disparadores y precondiciones**
- El panel se **recalcula al consultar** (sin cron, sin tabla de instancias): basta seleccionar contrato. El "periodo actual" = mayor periodo con `inicio ≤ CURRENT_DATE` (`:38`). Si ninguno arrancó → no hay programado acumulado → no hay déficit (mensaje "El contrato aún no inicia su primer periodo", `AlertasAtraso.jsx:163`).
- Para **asentar**: bitácora abierta (server-side 409, `:208-212`), déficit > 0 ahora (server-side 409, `:202-205`), no asentado antes para ese (concepto, periodo) (server-side 409 idempotencia). El gate de rol residente para mostrar el botón es solo-cliente (`soloLectura`), pero el cálculo, la participación y la idempotencia son server-side.
- La config previa (umbral/canal de la tabla `alerta_atraso`) quedó **RETIRADA**: la tabla existe (schema `:1148-1157`) pero ya NO se usa (`alertas.controller.js:18`).

**4. Criterio de éxito observable**
- Consulta: el profe ve la lista de conceptos en atraso con su **Déficit en unidades del concepto** (`fila-atraso-<id>`, `deficit-<id>`, `AlertasAtraso.jsx:199,205`). Un concepto al día NO aparece. El déficit se muestra como cantidad POSITIVA "X <unidad>", nunca como "% negativo".
- Asentar: **se genera UNA nota de bitácora tipo `atraso`, única (folio), con emisor = residente del contrato**, y **UNA fila en `atraso_asentado`** ligada a la nota. Respuesta 201 `{ok, deficit, unidad, periodo, nota:{id,numero,tipo,tag}}` (`:246-254`); el frontend confirma "Atraso de "<concepto>" asentado en la bitácora (nota #N)" (`AlertasAtraso.jsx:93`). La nota NO queda con datos vacíos (concepto, déficit, unidad, periodo, fundamento legal). Reintentar el mismo concepto/periodo NO duplica (idempotencia → 409).

**5. Qué genera al fallar**
- Sin bitácora al asentar: **409** "El contrato no tiene bitácora abierta; ábrela para asentar el atraso en la bitácora (art. 123 RLOPSRM)." (`:211`).
- Concepto sin atraso: **409** "El concepto "<concepto>" no tiene atraso al periodo actual; nada que asentar." (`:204`).
- Ya asentado: **409** "El atraso del concepto "<concepto>" ya fue asentado en la bitácora para el periodo N; no se duplica." (`:224`) o, por carrera, "El atraso de ese concepto ya fue asentado para el periodo; no se duplica." (`:264`).
- Concepto ajeno al contrato: **404** "El concepto no pertenece a este contrato" (`:194`).
- Sin acceso: **403** "No tienes acceso al atraso de este contrato" (`:93,:186`); en el frontend, banner rojo `data-testid="aviso-error"` (`AlertasAtraso.jsx:140`).

**6. ¿Cambió de comportamiento? SÍ.**
- **"La alerta debe dispararse si el avance no corresponde al mes" (profe)**: atendido — el déficit se mide al **periodo VIGENTE** (`programado_acum al periodo actual − ejecutado_acum`, `:48-80`), así que si lo ejecutado no alcanza lo programado del/los periodo(s) hasta hoy, aparece la fila de atraso. Es automático y sin umbral (rediseño P15).
- **"avance negativo no existe / decir atraso del X%" (profe)**: en HU-07 el atraso siempre se expresa como **déficit POSITIVO en unidades** (no en % ni negativo), lo cual respeta el espíritu del feedback. NOTA: HU-07 reporta en UNIDADES, no en "%"; el "atraso del 61.9%" que pidió el profe vive más bien en el KPI de desviación de HU-05 (que sí dice "Atraso de X%"). No es brecha, son dos vistas: HU-07 = unidades por concepto; HU-05 = % ponderado. El propio panel aclara la diferencia (`AlertasAtraso.jsx:123-130`).
- El emisor de la nota de atraso pasó a ser el **residente del contrato** (consecuencia, art. 53), no quien dispara (O-PROFE, `:231-233`); tipo de nota propio `atraso` en vez de `'otro'+tag`.
- Sin brechas funcionales detectadas frente al feedback de este dominio para HU-07.

**7. Citas legales**
- Base contra la que se mide el atraso: art. 52 LOPSRM + art. 45 ap. A fr. X RLOPSRM (`bitacora.controller.js:504`, schema `:1142`).
- Consecuencia del atraso: penas convencionales art. 46 Bis LOPSRM (schema `:1144`).
- Asiento del atraso en bitácora: art. 123 RLOPSRM (`:211`, `bitacora.controller.js:505`).
- Emisor = residente: art. 53 LOPSRM (`:231-233`).
- El mecanismo de alerta in-app en sí es operativo, **[sin fundamento legal literal]** (declarado así en el schema `:1145`).


## Estimación: integración y presentación (ciclo de cobro, carátula GACM)

### HU-12 — Apertura del periodo e integración de la estimación (carátula, generadores y evidencia fotográfica)

**1. Identidad**
- **Número/título:** HU-12 — "Apertura del periodo e integración de la estimación" (la página lo titula así; `IntegracionEstimacion.jsx:853`).
- **Rol que la EJECUTA (nivel E):** `contratista` (`permisos.js:23`). PERO el gate real del backend NO es el rol global "contratista": es la **posición en el contrato** — solo el `superintendente_id` del contrato integra (`estimaciones.controller.js:146-149`). El rol académico mostrado en la UI es "Contratista" (`IntegracionEstimacion.jsx:855`).
- **Solo consultan (nivel C):** `residente` y `supervision` (`permisos.js:23`). `dependencia` y `finanzas` = `null` (sin acceso a la HU). En backend cualquier parte/supervisión ve el detalle/avance vía `esParteOSupervision` (`estimaciones.controller.js:435,475,560`), pero solo el superintendente escribe.

**2. Qué hace HOY, de verdad (paso a paso)**
La integración es UNA transacción server-side en `integrarEstimacion` (`estimaciones.controller.js:49-422`):
1. **Validación de forma (400):** `contrato_id` entero, `periodo_inicio`/`periodo_fin` con patrón `AAAA-MM-DD`, fin ≥ inicio, y el periodo no excede 1 mes calendario (`masUnMes`, art. 54) — `:56-66`.
2. **Gate bitácora abierta (409):** sin fila en `bitacora_aperturas` para el contrato, NO integra; devuelve `requiereBitacora:true` para que el front redirija (`:71-74`, art. 122 RLOPSRM). FIX 22-jun.
3. **Gate periodo VENCIDO (409):** compara `periodo_fin < CURRENT_DATE`; si el periodo aún no cierra, rechaza con `periodoNoCerrado:true` (`:79-82`, art. 54). **Este es el fix directo al feedback del profe** ("no se puede estimar antes de que cierre el periodo").
4. **Normaliza `deductivas`** (manual, opcional, ≥0, redondea a 2; `:84-92`) y **filtra generadores**: cuantiza `cantidad_periodo` a 4 decimales (`q4`), descarta ≤0, exige ≥1 línea, sin conceptos repetidos (`:94-113`).
5. Abre transacción. Carga contrato (404 si no existe; `:132-137`). **Gate finiquito (409):** si `contrato.estado==='cerrado'`, no integra (`:142-145`, art. 64 LOPSRM). **Gate superintendente (403)** (`:146-149`).
6. **Gate PDF firmado (409):** exige `contrato_documentos tipo='contrato'`; si anticipo > umbral (default 30%, `ANTICIPO_UMBRAL_PDF`), exige además `tipo='anticipo_autorizacion'` (`:163-169`, art. 50 fr. IV).
7. **Advisory lock por contrato** (`:177`) → **no-solape de periodos** contra estimaciones no rechazadas (409; `:181-192`).
8. **Snapshot de conceptos del catálogo** (PU + cantidad contratada; `:196-206`); valida que pertenezcan al contrato (400 si ajenos).
9. **Acumulado previo por concepto** (Σ `cantidad_periodo` de estimaciones no rechazadas; `:209-218`).
10. **Validación notas** (cada `nota_id` debe colgar de la bitácora del contrato; 400 si ajenas; `:221-234`, art. 132 fr. II).
11. **Art. 118 por línea (409):** acumulado + periodo ≤ contratado (`:236-256`). **Endurecimiento A2:** si hay programa, acumulado ≤ planeado hasta el periodo (curva S; `:258-285`, art. 45-A-X + 52).
12. **Carátula server-side (motor único Postgres NUMERIC):** `subtotal = Σ ROUND(cant×pu,2)`; `amortización = ROUND(subtotal×anticipo%/100,2)` (art. 143 fr. I); `retención = ROUND(subtotal×0.005,2)` (5 al millar, art. 191 LFD); `retencion_atraso` (pena por atraso si aplica); `neto = subtotal − amort − retención − deductivas − retencion_atraso` (`:338-358`). Calcula `avance_fisico_pct`/`avance_financiero_pct` snapshot (`:362-365`). Si neto<0 → 400 (`:367-370`).
13. **Numeración correlativa atómica** (MAX+1; `:373-377`), INSERT en `estimaciones` con estado `'integrada'` (`:379-391`), inserta generadores con snapshots (`:394-401`) y notas vinculadas (`:402-407`). COMMIT → 201 con la carátula oficial.

**Front (`IntegracionEstimacion.jsx`):** wizard de 5 pasos — Periodo / Generadores / Carátula / Soportes y notas / Integrar (`PASOS`, `:753-759`). El selector de periodo del programa **deshabilita periodos en curso/futuros** (`disabled={!vencido}`, `:972`). Al elegir periodo, **prellena cada concepto con su avance ya reportado** (`avance_periodo`) sin recaptura (`:646-655`) y **filtra a solo los conceptos del periodo** (`programado_periodo>0`, `:676-683`). La carátula viva (`TabCaratula`) muestra encabezado GACM (descripción de obra, contrato, fecha del contrato, contratista; `:368-379`) y **bloque de firmas** (residente, superintendente, supervisión externa, autorizó/dependencia; `:449-467`). El "resumen de generadores" GACM está en la tabla de captura con columnas "Según proyecto / Hasta est. anterior / Planeado / Disp. periodo / PU / De esta estimación / Importe / Total estimado / Por ejecutar / % avance" (`TabGeneradores`, `:273-316`).

**3. Disparadores y precondiciones**
- **Bitácora del contrato abierta** (server, 409; `:71-74`).
- **Periodo vencido** (server, 409; `:79-82`) — periodo_fin < hoy.
- **Periodo ≤ 1 mes y sin solape** (server, 400/409; `:64-66`, `:181-192`).
- **Contrato no cerrado** (server, 409; `:142-145`).
- **Solo el superintendente del contrato** (server, 403; `:146-149`).
- **PDF de contrato firmado ligado** + autorización de anticipo si >30% (server, 409; `:163-169`).
- **≥1 generador con avance, sin exceder contratado/plan** (server, 400/409; `:107-113`, `:236-285`). En el cliente, el wizard también bloquea avanzar de paso (`pasoValido`, `:765-770`) — pero es solo-cliente, la fuente de verdad es el server.
- Notas vinculadas: opcionales, pero si se envían deben ser de la bitácora del contrato (server, 400; `:221-234`).

**4. Criterio de éxito observable**
- Se **genera un registro único** en `estimaciones` con estado `'integrada'` y un **número correlativo** propio del contrato (`uq_estimaciones_numero`, schema `:548`). Respuesta 201 con `subtotal, amortizacion, retencion, deductivas, neto` calculados (`:410`).
- El registro **NO queda con datos vacíos**: subtotal/amortización/retención/neto son `NOT NULL` (schema `:541-545`); `integrada_por` sale del JWT, `integrada_en = NOW()` (schema `:546-547`); hay ≥1 generador con `cantidad_periodo > 0` (CHECK schema `:569`).
- **Estado:** (no existía) → `integrada`.
- Verificable por el profe: "integré la estimación del periodo de mayo y me dio la **Estimación No. N** con su neto sin IVA; quedó congelada (no la puedo editar) y trae sus generadores y la(s) nota(s) que la soportan". La carátula es inmutable por trigger (`sigecop_estimacion_inmutable`, schema `:649-672`).

**5. Qué genera al fallar**
Mensajes exactos del código:
- Periodo no cerrado: `"No se puede estimar el periodo aún: cierra el {fecha} (hoy es {hoy}). Solo se estima un periodo ya VENCIDO al terminar el mes (art. 54 LOPSRM)."` (409; `:81`).
- Sin bitácora: `"La bitácora del contrato no está abierta; ábrela primero para integrar la estimación (art. 122 RLOPSRM)."` (409 + `requiereBitacora`; `:73`).
- No superintendente: `"Solo el superintendente asignado a este contrato puede integrar estimaciones"` (403; `:148`).
- Contrato cerrado: `"El contrato ya está cerrado (finiquito elaborado); no se integran estimaciones..."` (409; `:144`).
- Excede contratado: `"Excede lo contratado (art. 118 RLOPSRM) en: {conceptos}"` (409; `:254`). Excede plan: `"Excede lo PLANEADO en el programa hasta este periodo (art. 45 ap. A fr. X RLOPSRM + art. 52 LOPSRM): {conceptos}"` (409; `:283`).
- Periodo > 1 mes: `"El periodo de la estimación no puede exceder un mes (art. 54)"` (400; `:65`). Solape: `"El periodo se traslapa con la(s) estimación(es): {nums}"` (409; `:191`).
- Neto negativo: `"Las deducciones (deductivas / retención por atraso) no pueden dejar el neto en negativo"` (400; `:369`).
- Front: muestra el `error` del backend tal cual en banner (`IntegracionEstimacion.jsx:824-826,906-908`) y el toast.

**6. ¿Cambió de comportamiento? SÍ.**
- **Periodo vencido (NUEVO, atiende al profe):** antes se podía integrar cualquier periodo; ahora se bloquea server-side si `periodo_fin >= hoy` (`:79-82`). **Cumplido.**
- **Jalar del avance, no recapturar (atiende al profe):** `estimacion-prep` ahora expone `avance_periodo`/`programado_periodo` por concepto del periodo exacto (`estimacion-prep.controller.js:85-100,155-159`) y el front **prellena** las cantidades (`IntegracionEstimacion.jsx:646-655`). **Cumplido a nivel cliente** — pero el backend `integrarEstimacion` **NO verifica que `cantidad_periodo` coincida con el avance reportado**: acepta lo que mande el cliente mientras no exceda contratado/plan. **BRECHA parcial:** el profe dice "no recaptures"; el prellenado lo logra, pero un cliente que mande por API otra cantidad pasa (no hay candado server-side que ate la estimación al avance HU-06).
- **Solo conceptos del periodo (atiende al profe):** el front filtra (`:676-683`) — pero es **solo-cliente**; el backend acepta cualquier concepto del contrato. **BRECHA parcial.**
- **Avance físico ≠ Σ estimaciones (fix 14.9%):** `estimacion-prep` ahora calcula `fisico_real_pct` desde `concepto_avance` vigente (HU-06), separado del estimado acumulado (`estimacion-prep.controller.js:73-83,178-180`; barra en `IntegracionEstimacion.jsx:1006-1007`). **Cumplido.**
- **Carátula GACM literal (atiende al profe):** encabezado (descripción, contrato, fecha del contrato, contratista; `:368-379`), firmas (`:449-467`), resumen de generadores con columnas GACM (`:273-316`), sin IVA, amortización art. 143, 5 al millar art. 191. **Mayormente cumplido.** **BRECHAS:** (a) el encabezado distingue "Contratista" pero **no separa explícitamente CONTRATISTA (empresa) vs SUPERINTENDENTE (persona)** como dos campos distintos del encabezado — el profe lo pidió expresamente; en firmas sí aparecen ambos, pero en el encabezado solo va `contratista`. (b) **No hay generación de un PDF/documento descargable** de la carátula GACM: es una vista en pantalla, no un documento exportable. (c) Faltan en la vista los campos GACM "importe estimado acumulado anterior / importe de la estimación actual" como tales — sí existen en el detalle (`detalleEstimacion` `acumulados`, `:519-534`) y en el preview (`tabla-saldos`, `:429-446`), pero no como un documento GACM unificado.
- **Evidencia fotográfica por concepto (atiende al profe):** la columna `estimacion_fotos.contrato_concepto_id` existe (schema `:635`) y `subirFoto` la acepta/valida (`estimacion-fotos.controller.js:73-79`). **BRECHA grande:** en `IntegracionEstimacion.jsx` **NO se monta `FotosEstimacion` ni hay UI para subir foto por generador durante la integración** — el paso "Soportes y notas" (`:1042-1051`) solo dice que las fotos se cargan "por estimación en el Expediente (HU-04)" y `FotosEstimacion.jsx` **no envía `contrato_concepto_id`** (`:40`, solo `estimacionId`). Es decir: el backend soporta foto-por-concepto, pero el front todavía no la captura por renglón. El profe pidió "cada generador con evidencia fotográfica por concepto" → **falta el cableado UI**.
- **Botón "notas" suelto eliminado (atiende al profe):** en el wizard ya no hay botón "notas" suelto; las notas se vinculan dentro del paso "Soportes y notas" (`:1042-1046`). Sin embargo, el profe dijo "al integrar genera nota+soportes+imágenes": HU-12 vincula notas existentes pero **no asienta una nota automática al integrar** (eso sí ocurre al presentar/autorizar en HU-13/HU-15). **BRECHA parcial** si el profe esperaba un asiento automático al integrar.

**7. Citas legales**
- Art. 132 RLOPSRM (estimación = expediente: carátula + generadores + notas; trigger de inmutabilidad). Art. 132 fr. II (notas), fr. IV (fotos/soportes).
- Art. 118 RLOPSRM (acumulado ≤ contratado).
- Art. 143 fr. I RLOPSRM (amortización del anticipo). *(Nota: el comentario del schema `:542` dice "art. 138 fr. I"; el controller y la UI usan 143 fr. I — `:343`, `IntegracionEstimacion.jsx:345`. Inconsistencia de cita a revisar.)*
- Art. 191 LFD (5 al millar). Art. 2 fr. XIX RLOPSRM (monto sin IVA).
- Art. 54 LOPSRM (periodicidad mensual, periodo vencido). Art. 122 RLOPSRM (operar dentro de bitácora abierta).
- Art. 50 fr. IV LOPSRM (autorización del titular si anticipo > umbral) — `[validar]` el umbral exacto. Art. 64 LOPSRM (finiquito extingue derechos).
- Art. 45 ap. A fr. X RLOPSRM + art. 52 LOPSRM (programa por periodos / base del avance) — endurecimiento A2. Art. 46 Bis LOPSRM + arts. 86-88/90 RLOPSRM (penas por atraso, `retencion_atraso`) — `[validar]` el % parametrizable.

---

### HU-13 — Presentación de la estimación

**1. Identidad**
- **Número/título:** HU-13 — "Presentación de la estimación" (`EnvioEstimacion.jsx:181`).
- **Rol que la EJECUTA (nivel E):** `contratista` (`permisos.js:27`). Gate real backend: solo el `superintendente_id` del contrato (misma posición que integra; `estimaciones-ciclo.controller.js:162-164`).
- **Solo consultan (nivel C):** `residente` y `supervision` (`permisos.js:27`). `dependencia`/`finanzas` = `null`. La lectura del historial está acotada por `esParteOSupervision` (`estimaciones-ciclo.controller.js:51-53`).

**2. Qué hace HOY, de verdad (paso a paso)**
La presentación es `enviarEstimacion` (POST `/api/estimaciones-ciclo/estimacion/:id/enviar`; `estimaciones-ciclo.controller.js:143-227`):
1. Valida `id` (`:146`). Carga estimación + equipo del contrato (404 si no existe; `:149-158`).
2. **Gate finiquito:** si el contrato está cerrado, 409 (`:159`, art. 64).
3. **Gate posición:** solo el superintendente del contrato presenta (403; `:162-164`).
4. **Máquina de estados:** solo desde `'integrada'`; si ya está `'enviada'` → 409 "ya fue presentada"; otro estado → 409 (`:167-172`).
5. **Gate bitácora abierta (NUEVO, 409):** sin `bitacora_aperturas` para el contrato → no presenta, `requiereBitacora:true` (`:177-183`, art. 122). FIX 22-jun.
6. **Sello atómico + nota automática (transacción):** `UPDATE ... SET estado='enviada', enviada_en=NOW(), enviada_por=$2 WHERE id=$1 AND estado='integrada'` (el WHERE serializa la doble-presentación; rowCount=0 → 409; `:190-200`). Si hay bitácora, **asienta nota automática** tipo `sup_estimaciones` "Solicitud de aprobación de la estimación No. N" vía `insertarNotaAtomica`, y la vincula en `estimacion_notas` (`:204-216`, art. 125 fr. II-b). COMMIT → 200 con `{estado, enviada_en, enviada_por, nota}`.

**Front (`EnvioEstimacion.jsx`):** lista las estimaciones del contrato (`historialEstimaciones`); por cada `'integrada'` muestra el plazo de presentación y el botón "Presentar estimación" (`:261-284`). El cálculo de días usa `presentacion(periodo_fin)` (`:92-104`): `transcurridos = floor((hoy − periodo_fin)/día)`; si es negativo (`antesDelCorte`), muestra **"El periodo aún no termina: faltan N días para el corte..."** (`:265-266`); si dentro de 6 días, "dentro del plazo"; si fuera, "hace N días". Tras presentar, muestra "✓ Presentada el {fecha hora}" y el semáforo de revisión de 15 días derivado de `enviada_en` (`:286-298`). Estados `autorizada`/`pagada`/`rechazada` no se vuelven a presentar (`:305-316`).

**3. Disparadores y precondiciones**
- Estimación en estado **`'integrada'`** (server, 409; `:170`).
- **Bitácora abierta** (server, 409; `:177-183`).
- **Contrato no cerrado** (server, 409; `:159`).
- **Solo el superintendente del contrato** (server, 403; `:162-164`).
- **Importante (BRECHA):** el periodo cerrado se valida en HU-12 al **integrar**, no aquí al presentar. `enviarEstimacion` **no re-verifica `periodo_fin < hoy`** server-side; el front solo lo muestra como texto informativo (no deshabilita el botón "Presentar"). En la práctica una estimación con periodo no cerrado no debería existir (HU-12 lo bloquea), pero si existiera, presentar no la frena.

**4. Criterio de éxito observable**
- **Estado:** `integrada` → `enviada` (etiqueta UI "Presentada"; `estadoEstimacion.js` vía `labelEstadoEstimacion`).
- Se **sella fecha y hora exacta**: `enviada_en = NOW()`, `enviada_por` = JWT (schema `:1217-1218`). Esto **arranca el plazo del art. 54** (15 días de revisión, derivado en lectura).
- Se **genera una notificación/nota única**: nota automática de bitácora tipo `sup_estimaciones` "Solicitud de aprobación de la estimación No. N" (`:207-214`), vinculada a la estimación. NO queda con datos vacíos: trae asunto, contenido (con periodo y cita art. 125 fr. II-b) y emisor del JWT.
- Verificable por el profe: "presenté la estimación; cambió a **Presentada**, quedó la **fecha/hora del acto** y se asentó **una sola nota** en la bitácora pidiendo su aprobación; si la presento de nuevo, me dice que ya fue presentada".

**5. Qué genera al fallar**
- No integrada: `"No se puede presentar una estimación en estado '{estado}'"` (409; `:171`). Ya presentada: `"La estimación ya fue presentada"` (409; `:168,199`).
- Sin bitácora: `"La bitácora del contrato no está abierta; ábrela primero para presentar la estimación (art. 122 RLOPSRM)."` (409 + `requiereBitacora`; `:179-182`).
- No superintendente: `"Solo el superintendente asignado a este contrato puede presentar sus estimaciones"` (403; `:163`).
- Contrato cerrado: `"El contrato ya está cerrado (finiquito elaborado); no se presentan estimaciones..."` (409; via `gateContratoCerrado`, `:29`).
- Front traduce: 409 → mensaje del backend, 403 → "Solo el superintendente...", otro → "No se pudo presentar la estimación" (`EnvioEstimacion.jsx:164-167`).

**6. ¿Cambió de comportamiento? SÍ.**
- **Bug "-22 días" (atiende al profe): CORREGIDO.** Antes la resta de días salía negativa y mostraba "hace -22 días". Ahora `presentacion()` detecta `antesDelCorte` (transcurridos<0) y muestra **"El periodo aún no termina: faltan N días para el corte"** (`:92-104`, `:265-266`). **Cumplido** a nivel de mensaje. *(Matiz: el cálculo de días en HU-13 se basa en `periodo_fin` que ES el final del periodo, así que ya cuenta contra el final — correcto. El feedback "restar al final no al inicio" queda satisfecho.)*
- **Gate bitácora al presentar (NUEVO):** antes solo se omitía la nota si no había bitácora, pero **dejaba presentar**; ahora bloquea la presentación sin bitácora (`:174-183`). Cierra la asimetría del ciclo.
- **BRECHA respecto al profe "no se presenta si el periodo no cerró":** NO hay re-validación server-side del periodo cerrado en `enviarEstimacion`. El front lo muestra como texto pero **el botón "Presentar" no se deshabilita** cuando el periodo no ha cerrado. Si el profe quiere un candado duro también en presentar (defensa en profundidad), **falta**. Hoy la garantía vive solo en HU-12 (integrar).

**7. Citas legales**
- Art. 54 LOPSRM (plazos: 6 días para presentar desde el corte + 15 días de revisión/autorización; `enviada_en` arranca el conteo). Las constantes `PLAZO_PRESENTACION_DIAS=6` y `PLAZO_REVISION_DIAS=15` (`EnvioEstimacion.jsx:25-26`) son la lectura del art. 54 — `[validar]` los días exactos con el profe.
- Art. 122 RLOPSRM (operar dentro de bitácora abierta).
- Art. 125 fr. II-b RLOPSRM (la nota automática de "solicitud de aprobación de estimaciones" la registra el superintendente; `:201-214`).
- Art. 64 LOPSRM (finiquito extingue derechos → no se presenta).

**Nota transversal para Maiki (tabla `estimacion_soportes`):** la tabla existe (schema `:591-598`, "esqueleto, carga de archivos DIFERIDA") pero **ningún controller del cluster la usa** — las fotos viven en `estimacion_fotos` (con BYTEA), no en `estimacion_soportes`. El profe habla de "soportes"; hoy soportes = notas vinculadas + fotos, y `estimacion_soportes` está muerta. Tampoco existe carga binaria de CFDI/oficio ligada a la estimación (pendiente conocido).


## Estimación: revisión/autorización, reingreso, historial y tablero

### HU-15 — Recepción, revisión técnica y autorización/rechazo de la estimación

1. **Identidad:** HU-15. La **EJECUTAN (nivel E)** dos roles, de forma secuencial: **Supervisión** (`supervision:'E'`) registra observaciones y turna; **Residencia/Residente** (`residente:'E'`) autoriza o rechaza tras el turnado (`permisos.js:29`). Solo **CONSULTA (nivel C)**: **Dependencia** (`dependencia:'C'`). **Sin acceso:** Contratista (`null`) y Finanzas (`null`). El acotamiento de LECTURA es por participación (`esParteOSupervision`, `lib/acceso`), pero cada ACCIÓN de escritura revalida que el `req.user.id` sea exactamente el `supervision_id` o `residente_id` del contrato.

2. **Qué hace HOY, de verdad (paso a paso):**
   - El residente/supervisión selecciona contrato → estimación. La lista solo trae estimaciones en estado `enviada/autorizada/rechazada` (`RevisionEstimacion.jsx:409`); las `integrada` aún no entran a revisión.
   - Al seleccionar, el front llama `GET /api/estimaciones-ciclo/estimacion/:id/revision` (`estimaciones-ciclo.controller.js:revisionEstimacion`, línea 292) + `GET /estimaciones/:id` (detalle de HU-12). La respuesta de revisión trae: estado, `enviada_en`, `observaciones[]`, `turnada` (booleano derivado de si hay alguna observación con `turnado_a='residencia'`), y las banderas `es_supervision`/`es_residencia` calculadas comparando `req.user.id` contra los punteros del contrato (`controller:317-318`).
   - La UI muestra la estimación dividida en **secciones**: Carátula, Números generadores y Notas vinculadas (`RevisionEstimacion.jsx:74`; fotos/soportes se ocultan por no tener archivos reales). Los datos base se leen del detalle de HU-12 y **no se editan** aquí; las observaciones se ven sobre el documento.
   - **Supervisión registra observaciones** por sección vía `POST .../observaciones` (`crearObservacion`, línea 330). Cada observación lleva `seccion` (caratula/generadores/fotos/soportes/notas), `tipo` (`aclaracion`/`correccion`/`rechazo`) y `descripcion` obligatoria; el `autor_id` sale del JWT. Solo se permite en estado `enviada` y ANTES de turnar (`controller:348-353`). Puede eliminar SU propia observación (`eliminarObservacion`, línea 370), también solo antes de turnar.
   - **Supervisión turna a residencia** vía `POST .../turnar` (`turnarEstimacion`, línea 409). Hay un `SELECT ... FOR UPDATE` sobre la estimación que serializa el doble-turnado (línea 430). Si hay observaciones, las marca `turnado_a='residencia'`; si no hay y el front manda `sin_observaciones:true`, inserta un **marcador** ("Turnada a residencia sin observaciones de supervisión.", línea 460) para dejar constancia de quién/cuándo turnó. Si no hay observaciones y no se marcó "sin observaciones", devuelve 409 (línea 448).
   - **Residencia autoriza** vía `POST .../autorizar` (`autorizarEstimacion`, línea 479). Exige que `req.user.id === residente_id`, estado `enviada` y turnado previo. El `UPDATE` es atómico y revalida el turnado DENTRO del WHERE con un `EXISTS turnado_a='residencia'` (línea 506) para cerrar el TOCTOU. Al autorizar, **asienta una nota automática de bitácora** tipo `res_estimaciones` ("Autorización de la estimación No. N…", art. 125 fr. I-b RLOPSRM) si la bitácora está abierta, y la vincula en `estimacion_notas` (líneas 514-528).
   - **Rechazo** vía `POST .../rechazar` (`rechazarEstimacion`, línea 544). **FIX 22-jun (profe):** ahora pueden rechazar tanto la residencia (tras turnado) como la **supervisión directo, sin turnar** (líneas 557-572). El `UPDATE` pone `estado='rechazada'` y, en la misma transacción, inserta una observación `tipo='rechazo'`, `turnado_a='contratista'` con el motivo (líneas 588-593). Si quien rechaza es solo residencia, el WHERE exige el turnado; si es supervisión, no (línea 580).
   - El front muestra un **stepper de 3 pasos** (Supervisión → Residencia → Resolución, `IndicadorFlujo`, línea 286) y un **semáforo de plazo** derivado de `enviada_en` (15 días, `SemaforoPlazoRevision`, línea 333).

3. **Disparadores y precondiciones:**
   - Precondición dura: la estimación debe estar en estado `enviada` (presentada por el contratista en HU-13). Todos los endpoints de escritura validan `est.estado === 'enviada'` server-side (líneas 348, 422, 490, 565).
   - Autorizar/rechazar-por-residencia exigen **turnado previo** (`estaTurnada`, validado además dentro del UPDATE atómico).
   - Gate de **contrato cerrado**: si el contrato tiene `estado='cerrado'` (finiquito), todos los endpoints devuelven 409 (`gateContratoCerrado`, art. 64 LOPSRM, líneas 347/382/421/489/564).
   - Validación de **rol por participación** server-side (no solo cliente): supervisión y residencia se comparan contra los punteros reales del contrato.

4. **Criterio de éxito observable (cómo lo verifica el profe):**
   - **Registrar observación:** genera una fila en `estimacion_observaciones` con sección, tipo, descripción NO vacía y autor; HTTP 201 con el registro. El profe ve la observación listada en la sección sin que el documento base cambie.
   - **Turnar:** las observaciones quedan `turnado_a='residencia'` (o se crea el marcador); la bandera `turnada=true` aparece en la siguiente carga y el stepper avanza a "Residencia". Supervisión queda en lectura.
   - **Autorizar:** la estimación cambia de estado **enviada → autorizada** y se **genera la nota automática de bitácora** `res_estimaciones` vinculada (registro real, no vacío). El front avisa "Estimación autorizada. Continúa el ciclo en tránsito a pago."
   - **Rechazar:** estado **enviada → rechazada** + se genera una observación de rechazo dirigida al contratista (`turnado_a='contratista'`) con motivo NO vacío. El profe ve el motivo registrado y al contratista enterado.

5. **Qué genera al fallar:**
   - Observación sin descripción → 400 `"La descripción de la observación es obligatoria"` (línea 340).
   - Observar/turnar sin ser supervisión → 403 `"Solo la supervisión asignada al contrato puede registrar observaciones"` (345) / `"...puede turnar la estimación"` (419).
   - Turnar sin observaciones ni marca → 409 `"Registra al menos una observación o marca la estimación sin observaciones para turnar"` (448).
   - Autorizar sin turnado → 409 `"La estimación aún no ha sido turnada por supervisión"` (494).
   - Autorizar/observar en estado no `enviada` → 409 `"No se puede autorizar una estimación '<estado>'"` (491) / `"No se pueden registrar observaciones en una estimación '<estado>'"` (349).
   - Rechazar sin motivo → 400 `"El motivo del rechazo es obligatorio"` (552).
   - Contrato cerrado → 409 `"El contrato ya está cerrado (finiquito elaborado); no se autorizan estimaciones..."` (29).

6. **¿Cambió de comportamiento? SÍ.**
   - **Severidad eliminada (FIX 22-jun, profe):** el código YA NO acepta/pide `severidad` en `crearObservacion` (línea 338, comentario explícito; el front quitó el selector, `RevisionEstimacion.jsx:28-34`). **PERO** el campo `severidad` sigue existiendo en el schema con `DEFAULT 'menor'` (`schema.sql:1272`) y la constante `SEVERIDADES` sigue declarada en el controller (línea 247). Brecha menor: residuos de severidad.
   - **Supervisión puede rechazar directo (FIX 22-jun, profe):** antes solo la residencia rechazaba con turnado previo; ahora supervisión rechaza sin turnar (líneas 557-572 + botón `btn-rechazar-supervision` en el front).
   - **Coincide con el profe** en: revisión secuencial supervisión→residencia, dependencia solo consulta, observaciones por sección con tipos aclaración/corrección/rechazo, motivo de rechazo obligatorio, rechazo genera observación dirigida al contratista, plazo 15 días (art. 54/58 — ver punto 7), documentos base no se modifican.
   - **BRECHAS vs lo que pide el profe:**
     - El profe pidió que el criterio de éxito sea **"genera un REGISTRO + NOTIFICACIÓN al rol"**. La autorización/rechazo generan el registro (nota de bitácora / observación), pero **no se dispara una notificación explícita dirigida al contratista** ("presenta tus documentos a pago") desde estos endpoints; solo hay un `showToast` en el cliente. No hay tabla de notificaciones tocada aquí.
     - El profe dijo que al autorizar la residencia **genera la ORDEN DE PAGO**. En el código, autorizar solo cambia el estado a `autorizada`; la orden/instrucción de pago la genera HU-20 (`instruccion-pago.controller.js`) en un paso aparte, no automáticamente al autorizar. Brecha de encadenamiento.

7. **Citas legales:**
   - **art. 54 LOPSRM** — presentación/revisión de estimaciones y plazo de revisión (citado en `controller:243`, `RevisionEstimacion.jsx:22-26` y el schema `1262-1264`). El semáforo usa 15 días naturales.
   - **art. 58** — el profe lo cita como el plazo de 15 días naturales; el código cita art. 54 para el mismo plazo. **[validar]** cuál es el artículo exacto del plazo (54 vs 58) — confirmar con el profe.
   - **art. 125 fr. I-b RLOPSRM** — nota de bitácora automática al autorizar (`controller:514-523`).
   - **art. 64 LOPSRM** — gate de contrato cerrado (`controller:24-29`).

---

### HU-16 — Reingreso de estimación tras rechazo

1. **Identidad:** HU-16. La **EJECUTA (nivel E)** el **Contratista** (`contratista:'E'`, `permisos.js:30`), específicamente el `superintendente_id` del contrato. Solo **CONSULTA (nivel C)**: **Residente** (`residente:'C'`). **Sin acceso:** Supervisión, Dependencia, Finanzas (`null`).

2. **Qué hace HOY, de verdad (paso a paso):**
   - El contratista selecciona contrato → "estimación rechazada". El front filtra como **reingresables** las que están en `rechazada` y aún no tienen un reingreso (ninguna otra las referencia vía `reemplaza_a`, `ReingresoEstimacion.jsx:152-155`).
   - Carga las observaciones de la versión rechazada con `GET .../revision` (las mismas de HU-15) y las muestra; ofrece **descargar el listado de observaciones en PDF/Excel** (`exportarObservacionesPdf/Excel`, líneas 89-127).
   - El contratista escribe una "Nota de atención a observaciones" (texto **NO persistido**, solo control de pantalla — el propio front lo dice: "no se almacena de forma permanente", línea 401) y marca un checkbox de confirmación.
   - Al confirmar, llama `POST /api/estimaciones-ciclo/estimacion/:id/reingresar` con `{confirmacion:true}` (`reingresarEstimacion`, línea 636). El backend:
     - Exige `confirmacion===true` (400 si falta, línea 643).
     - Valida que `req.user.id === superintendente_id` (línea 652) y que la estimación esté en estado `rechazada` (línea 658).
     - Toma un `pg_advisory_xact_lock` por contrato (línea 664), verifica unicidad (`SELECT ... WHERE reemplaza_a = id`, línea 668; blindado por `UNIQUE(reemplaza_a)`).
     - Calcula número correlativo nuevo (`MAX(numero)+1`, línea 675).
     - **INSERTA una fila nueva** en `estimaciones` copiando la carátula congelada de la rechazada (subtotal/amortización/retención/deductivas/neto/anticipo_pct_snapshot), `estado='integrada'`, `integrada_por` del JWT, `reemplaza_a = id de la rechazada` (líneas 684-695). `enviada_en/por` quedan NULL.
     - Copia los números generadores con sus snapshots (líneas 699-705).
     - Devuelve 201 con la nueva estimación + `reemplaza_a` + `plazo_origen_enviada_en` (el `enviada_en` de la rechazada, para no reiniciar el plazo).
   - El front muestra una **tabla de trazabilidad** (rechazada + su reingreso vinculado, derivada de `reemplaza_a`, líneas 232-238).

3. **Disparadores y precondiciones:**
   - La estimación debe estar en estado **`rechazada`** (validado server-side, línea 658).
   - Solo el `superintendente_id` del contrato (server-side, línea 652).
   - Unicidad 1-rechazada → 1-reingreso (pre-chequeo + `UNIQUE(reemplaza_a)`, `schema.sql:1226-1227`).
   - Gate de contrato cerrado (art. 64, línea 655).
   - El "atendí las observaciones" es solo un booleano de control (no hay validación de contenido).

4. **Criterio de éxito observable:**
   - Genera una **fila NUEVA en `estimaciones`** con número correlativo propio, `estado='integrada'`, `reemplaza_a` apuntando a la rechazada, y copia de carátula+generadores (no vacía, montos idénticos al snapshot validado). HTTP 201.
   - La rechazada **permanece** en el histórico, vinculada; el plazo del art. 54 **no se reinicia** (`enviada_en` nuevo = NULL; se referencia el de la rechazada).
   - El profe verifica: aparece una nueva estimación "integrada" lista para volver a presentarse, y la rechazada sigue visible con su motivo.

5. **Qué genera al fallar:**
   - Sin `confirmacion` → 400 `"Debes confirmar que atendiste las observaciones de la versión rechazada"` (644).
   - No es el superintendente → 403 `"Solo el superintendente asignado a este contrato puede reingresar sus estimaciones"` (653).
   - Estimación no rechazada → 409 `"Solo se puede reingresar una estimación 'rechazada' (estado actual: '<estado>')"` (659).
   - Ya reingresada → 409 `"Esta estimación rechazada ya fue reingresada"` (671 y, por la restricción UNIQUE en carrera, 717).
   - Contrato cerrado → 409 (art. 64).

6. **¿Cambió de comportamiento? SÍ — y es la BRECHA MÁS IMPORTANTE del cluster.**
   - **El profe dice que NO debe existir "reingreso" como historia/flujo aparte:** *"el reingreso no es otra cosa más que la integración otra vez"*; rechazar = volver a integrar (HU-12) y volver a presentar (HU-13); la supervisión revisa **TODO** otra vez, no "te corrijo solo estos 5"; el histórico muestra la rechazada solo para saber por qué se rechazó.
   - **El código SÍ tiene un flujo "reingresar" separado:** endpoint dedicado `POST .../reingresar`, función `reingresarEstimacion`, página propia `ReingresoEstimacion.jsx`, columna `reemplaza_a` con `UNIQUE`, y una pantalla con su propia HU en el menú. Esto **contradice directamente** lo que pide el profe.
   - **Detalle del conflicto:** el reingreso actual **COPIA** la carátula y generadores de la rechazada (no obliga a re-capturar / re-integrar desde cero), nace `'integrada'` ligada por `reemplaza_a`, y limita a 1 reingreso por rechazada. El profe quiere que sea simplemente **integrar otra vez** (un INGRESO NUEVO normal vía HU-12, sin tope de 1, sin copia automática, con revisión completa de nuevo). Además, la nota de atención a observaciones **no se persiste** (deuda técnica reconocida en el propio código, línea 633).
   - **Recomendación para Maiki (lo que falta):** **HU-16 debería DESAPARECER como historia/pantalla independiente** y volverse parte de HU-12 (integrar) + HU-15 (la rechazada queda en el histórico con su motivo). Mientras el código mantenga `reingresarEstimacion`, `reemplaza_a` y la página, hay **brecha**: el sistema modela el reingreso como versión vinculada/copiada (1→1) en vez de un ingreso nuevo. Otra inconsistencia menor: el front de reingreso aún pinta **badges de severidad** (`SeveridadBadge`, `SEVERIDAD_LABEL`, líneas 46-59) y la columna "Severidad" en la tabla/exportación, pese a que HU-15 ya eliminó la severidad — la severidad llegará vacía/`'menor'` por default.

7. **Citas legales:**
   - **art. 54 LOPSRM** — el reingreso **no reinicia** el plazo de presentación (citado en `controller:618-619` y `ReingresoEstimacion.jsx:312-314`). **[validar]** si la ley realmente sostiene que el reingreso conserva el plazo original, o si (como sugiere el profe) un reingreso = ingreso nuevo y por tanto arrancaría su propio plazo — esto es interpretativo y choca con la visión del profe; confírmalo.
   - **art. 64 LOPSRM** — gate de contrato cerrado.

---

### HU-14 — Historial de estimaciones del contrato

1. **Identidad:** HU-14. La **EJECUTA (nivel E)** el **Residente** (`residente:'E'`, `permisos.js:28`). **CONSULTAN (nivel C):** Contratista y Dependencia. **Sin acceso:** Supervisión, Finanzas (`null`). En la práctica es una vista de **solo lectura** para todos (no muta nada); el "E" del residente solo le da entrada de menú.

2. **Qué hace HOY, de verdad (paso a paso):**
   - El usuario selecciona contrato (heredando el contrato activo global). El front llama `GET /api/estimaciones-ciclo/contrato/:contratoId/historial` (`historialEstimaciones`, `estimaciones-ciclo.controller.js:38`).
   - El backend acota por participación (`esParteOSupervision`; 404 si el contrato no existe, 403 si no es parte, líneas 50-53) y trae **TODAS** las estimaciones del contrato, incluidas las rechazadas, ordenadas por número correlativo (= orden de integración, línea 67).
   - Para cada estimación arma un arreglo `transiciones[]` **derivado de las columnas de la propia fila** (Opción A, sin tabla de transiciones): siempre incluye el evento `integrada` (con `integrada_en`/`por`); y si tiene `enviada_en`, agrega el evento `enviada` (líneas 74-96). Devuelve también `reemplaza_a`, montos de carátula, periodos y estado vigente.
   - El front (`HistorialEstimaciones.jsx:aVistaHistorial`, línea 146) mapea cada fila a la vista: estimación `EST-NNN`, periodo, estado (con label vía `labelEstadoEstimacion`), importe (neto), **Fecha de presentación = `enviada_en`** (línea 157). Calcula `fechaRevision` buscando una transición `autorizada`/`rechazada` y `fechaPago` buscando `pagada` (líneas 148-159) — **pero esas transiciones nunca llegan del backend** (ver brecha), así que quedan en null.
   - La tabla permite filtrar por periodo y estado (lógica Y), exportar a Excel, y abrir un drawer "expediente compacto" por fila. El estado muestra `Integrada/Presentada/Autorizada/Pagada/Rechazada` vía `estadoEstimacion.js`.

3. **Disparadores y precondiciones:**
   - Requiere sesión y ser parte del contrato (acotamiento server-side).
   - No tiene precondiciones de estado: lista lo que haya, incluso 0 estimaciones (muestra CTA a HU-12).

4. **Criterio de éxito observable:**
   - Lista **todas** las estimaciones del contrato en orden cronológico, incluidas las **rechazadas** (CA-1, trazabilidad fiscal), cada una con su estado vigente real, importe neto y fecha de presentación.
   - El profe verifica: una estimación rechazada NO desaparece del historial; el estado mostrado coincide con el real (integrada/presentada/autorizada/pagada/rechazada); el importe = neto congelado.

5. **Qué genera al fallar:**
   - Contrato inexistente → 404 `"El contrato indicado no existe"` (50).
   - Sin acceso → 403 `"No tienes acceso al historial de estimaciones de este contrato"` (52).
   - En el front, error 403 → toast `"No tienes acceso al historial de este contrato"`; otros → `"No se pudo cargar el historial de estimaciones"` (línea 195). Es de solo lectura, no hay validaciones de escritura.

6. **¿Cambió de comportamiento? SÍ (parcialmente).**
   - **FIX 22-jun:** "Fecha de presentación" ahora es la del **envío real (`enviada_en`)**, con '—' si no se ha presentado (línea 157), en vez de un dato fabricado.
   - **BRECHAS vs lo que pide el profe (línea de tiempo completa):**
     - El profe pregunta si el historial refleja **autorizada/rechazada/pagada** o solo integrada/enviada. **Hoy la línea de tiempo (`transiciones`) solo tiene los eventos `integrada` y `enviada`** (`controller:74-96`). Los eventos `autorizada`, `rechazada` y `pagada` están **comentados como punto de extensión pendiente** porque **no existen las columnas de sello** `autorizada_en`/`rechazada_en`/`pagada_en` en `estimaciones` (confirmado: el schema solo tiene `integrada_en` y `enviada_en`; pagos.controller solo hace `UPDATE ... estado='pagada'` sin sellar fecha, línea 118).
     - Consecuencia: el **`estado` actual SÍ es correcto** (refleja autorizada/rechazada/pagada porque es la columna `estado`), pero las **columnas "Fecha de revisión" y "Fecha de pago" del historial quedan SIEMPRE vacías** (`fechaRevision`/`fechaPago` = null), y el drawer **"Observaciones" está hardcodeado a `[]`** (línea 160; no lee `estimacion_observaciones`). Para Maiki: faltan columnas de sello de tiempo (`autorizada_en/por`, `rechazada_en/por`, `pagada_en/por`) y traer las observaciones reales para que el historial sea una verdadera línea de tiempo.
     - La columna "Versión" siempre muestra "—" (línea 153): el modelo no versiona y no aprovecha `reemplaza_a` para numerar v1/v2 en esta vista.

7. **Citas legales:**
   - **art. 54 LOPSRM** — `enviada_en` como sello que arranca el plazo (`controller:87`).
   - **art. 132 RLOPSRM** — carátula inmutable (contexto del detalle). Trazabilidad fiscal de rechazadas es **[validar]** (criterio de diseño, no artículo citado en el código).

---

### HU-17 — Tablero de estimaciones

1. **Identidad:** HU-17. La **EJECUTA (nivel E)** el **Residente** (`residente:'E'`, `permisos.js:31`). **CONSULTAN (nivel C):** Contratista, Supervisión y Dependencia. **Sin acceso:** **Finanzas** (`finanzas:null`) — y desde el FIX 22-jun también bloqueado server-side. Es una vista **agregada y de solo lectura** (no muta nada).

2. **Qué hace HOY, de verdad (paso a paso):**
   - El front llama `GET /api/tablero/estimaciones` (`tablero.controller.js:tableroEstimaciones`, línea 65), sin parámetros.
   - El backend trae todas las estimaciones del usuario con su carátula (montos congelados) + punteros del contrato, deriva `dias_en_estado` en SQL desde el sello más reciente (`enviada_en` si existe, si no `integrada_en`, con `GREATEST(0,...)`, líneas 74-83), y **acota por participación** en JS (`esParteOSupervision`, línea 87). Dependencia y finanzas verían todo según `ROLES_VEN_TODO`, pero a finanzas se le bloquea por completo (ver punto 5).
   - Agrega server-side: **conteos y montos por estado** (los 5 estados, aunque haya 0), **por contrato**, **totales de cartera** (monto estimado = Σ neto de no-rechazadas; pagado = Σ neto de pagadas; pendiente = estimado − pagado), y **antigüedad promedio por estado** (líneas 89-167).
   - Construye **tarjetas del grid** que EXCLUYEN las rechazadas (`enGrid:false` para rechazada, línea 36; CA-1: la rechazada cuenta como métrica pero no se muestra en el grid). Cada tarjeta lleva estado, etiqueta, `responsable` (el next-actor, no quién la hizo), periodo, neto, subtotal, días en estado.
   - Construye **"Mis pendientes"**: estimaciones cuyo estado exige una acción del **rol del usuario autenticado** (`req.user.rol` del JWT), con la acción concreta (`PENDIENTE_POR_ESTADO`, líneas 43-48 y 169-184).
   - El front (`TableroEstimaciones.jsx`) pinta KPIs, contadores por estado, un mini-stepper por tarjeta (Integrada→Presentada→Autorizada→Pagada, línea 21), filtros (estado/periodo/responsable) y la lista de pendientes.

3. **Disparadores y precondiciones:**
   - Requiere sesión. Acotamiento por participación server-side.
   - No exige estado previo: agrega lo que el usuario pueda ver. Si no hay estimaciones, muestra estado vacío con CTA a HU-12.

4. **Criterio de éxito observable:**
   - Muestra cada estimación **aceptada/en proceso** (integrada/presentada/autorizada/pagada) con su estado, periodo, **cantidad (neto)** y línea de tiempo; las **rechazadas NO aparecen en el grid** pero sí cuentan en las métricas.
   - Los **montos por estado y totales cuadran al centavo** (mismos netos congelados por HU-12, calculados server-side).
   - "Mis pendientes" lista solo lo que le toca actuar al rol logueado.
   - El profe verifica: una estimación **autorizada/presentada** aparece con su cantidad y se distingue su estado; los totales de cartera son consistentes.

5. **Qué genera al fallar:**
   - **Finanzas** → 403 `"El tablero de estimaciones no está disponible para Finanzas."` (línea 69, FIX 22-jun: antes solo se ocultaba en UI vía `permisos.js`).
   - Error general → 500 `"Error interno"`; el front muestra bloque de error con botón "Reintentar".

6. **¿Cambió de comportamiento? SÍ.**
   - **FIX 22-jun (CA-5):** Finanzas ahora se bloquea server-side (antes solo en la UI).
   - **Coincide con el profe** en: muestra autorizada/presentada con cantidad y estado; las rechazadas no se muestran en el grid (viven en HU-14); montos server-side.
   - **Sobre la "fecha":** el profe pide que el tablero muestre autorizada/presentada **con cantidad y fecha**. El tablero muestra cantidad (neto) y `dias_en_estado` (antigüedad), pero **no muestra la fecha calendario de cada transición** (no hay `autorizada_en`/`pagada_en` que mostrar — misma brecha de columnas de sello que HU-14). Brecha menor: la "fecha" mostrada es derivada (días en estado / `enviada_en`), no la fecha exacta de autorización/pago.
   - **Etiqueta de `responsable`:** la tarjeta muestra "Responsable: <rol que debe actuar a continuación>", no quién la generó. Puede confundir al profe (parece el dueño, es el next-actor). **[validar]** redacción.

7. **Citas legales:**
   - **art. 54 LOPSRM** — pipeline del ciclo de estimación (`tablero.controller.js:21-29`, `TableroEstimaciones.jsx:17`).
   - El bloqueo a Finanzas y la exclusión de rechazadas del grid son **criterios de diseño/[validar]**, no artículos citados en el código.


## Tránsito a pago, promoción de cobro y registro del pago

### HU-20 — Tránsito a pago: suficiencia presupuestal y promoción de cobro por el contratista

**1. Identidad**
- **Número/Título:** HU-20 — "Tránsito a pago: carga de soportes y verificación de suficiencia presupuestal" (título actual en `TransitoPago.jsx:228`).
- **Rol que la EJECUTA (nivel E):** `contratista` y `finanzas` (ambos `'E'` en `permisos.js:34` — `{ residente:'C', contratista:'E', supervision:null, dependencia:'C', finanzas:'E' }`). PERO el backend ahora **restringe la acción de escritura al `contratista`**: subir soportes (`cargarSoporte`) y generar la instrucción (`generarInstruccion`) devuelven 403 si `req.user.rol !== 'contratista'` (`instruccion-pago.controller.js:240` y `:275`). La acción exclusiva de **finanzas** dentro de esta HU es cargar el techo presupuestal (`POST /presupuesto`, `requireRole('finanzas')` en `instruccion-pago.routes.js:20`).
- **Solo consultan (nivel C):** `residente` y `dependencia`. `supervision` = `null` (sin acceso).
- **Nota de incoherencia para Maiki:** la matriz de `permisos.js` da `'E'` a finanzas en HU-20, pero el controller hoy NIEGA a finanzas las dos escrituras del tránsito (solo el contratista promueve). El frontend (`TransitoPago.jsx:91`) tiene una variable muerta `esFinanzas = ... && true` que no se usa para gatear; el gating real lo impone el backend con 403.

**2. Qué hace HOY, de verdad (paso a paso)**
1. **Selección.** El usuario hereda/elige el contrato (`BannerContratoActivo`) y luego una **estimación AUTORIZADA** (`TransitoPago.jsx:248`; el front filtra `e.estado === 'autorizada'` en `:129`).
2. **Carga del estado de tránsito.** `GET /api/instruccion-pago/estimacion/:id` → `estadoTransito` (`instruccion-pago.controller.js:186`). Acota por participación con `esParteOSupervision` (`:192`, 403 si no es parte). Devuelve en paralelo (`:195`): suficiencia, soportes, ancla de plazo y la instrucción existente.
3. **Suficiencia presupuestal (art. 24).** `calcularSuficiencia` (`:67`) ubica el techo por **FK `dependencia_id` + ejercicio** (year de `fecha_inicio`) en `presupuesto_anual` (`:76`). `comprometido = Σ neto de estimaciones 'autorizada'+'pagada'` de esa dependencia/ejercicio EXCLUYENDO la actual (`:84`). `disponible_antes = techo − comprometido`; `excede = neto > disponible_antes` (`:102`). Si no hay FK o no hay techo cargado → `sin_presupuesto: true` (`:75`,`:80`).
4. **Carga del techo (solo finanzas).** Si falta techo, finanzas captura **partida específica obligatoria + monto** → `POST /presupuesto` → `crearPresupuesto` (`:388`). Resuelve el nombre de la dependencia desde la cuenta FK (`:401`), `UPSERT` por `(ejercicio, dependencia_id, partida)` (`:408`).
5. **Soportes (CA-3).** `leerSoportes` (`:108`): factura y CFDI son **metadatos** en `estimacion_soportes` (match por `nombre` 'Factura'/'CFDI'); el CFDI exige folio fiscal no vacío en `descripcion` (`:128`). La **fianza de cumplimiento** se LEE de `contrato_garantias` (`:118`, art. 48 fr. II), exigible si existe registro, vigente si `vigencia >= hoy`. `obligatorios_ok = factura && cfdi && fianza` (`:139`).
6. **El CONTRATISTA promueve subiendo soportes.** `POST /estimacion/:id/soportes` → `cargarSoporte` (`:227`). Gate de rol contratista (`:240`). Si el `nombre` casa `spei|bancari|clabe`, valida que `descripcion` sea **numérica** `^\d{6,30}$` (`:244`). Inserta metadato en `estimacion_soportes` (`:253`).
7. **Semáforo de plazo (art. 54).** `anclaAutorizacion` (`:145`) toma `MIN(fecha)` de la nota de bitácora `tipo='res_estimaciones', tag='estimacion'` ligada por `estimacion_notas`. `semaforoPlazo` (`:155`): el plazo de 20 días corre desde **la fecha más tardía entre autorización y presentación de factura**; sin factura no corre (`:165`). Color por días vencidos (verde 0 / ámbar 1-10 / rojo >10).
8. **Generar instrucción.** `POST /estimacion/:id` → `generarInstruccion` (`:266`). Gate contratista (`:275`), gate contrato no-cerrado (`:283`, art. 64), gate estado `autorizada` (`:287`, art. 54), soportes obligatorios (`:293`). Suficiencia DENTRO de tx con `SELECT ... FOR UPDATE` sobre el techo (`:310`, cierra TOCTOU); si `neto > disponible` → 409 (`:331`). `INSERT INTO instruccion_pago` estado `'emitida'`, `monto = neto`, `factura_cfdi = folio`, `notificado_finanzas_en = NOW()` (`:337`). UNIQUE por estimación evita doble (`:352`).
9. **Cola global de finanzas.** `GET /api/instruccion-pago/cola` → `colaCobro` (`:425`): TODAS las instrucciones `'emitida'` de TODOS los contratos, con folio del contrato, contratista, periodo, neto, folio CFDI y flag `pagada` (`:433`). Post-filtra por `esParteOSupervision` (`:441`) — finanzas (transversal) ve todas; roles operativos solo las suyas. Se pinta en `AmbientePago.jsx:107-149` (tabla `data-testid="cola-cobro"`).

**3. Disparadores y precondiciones**
- **Estado `autorizada`** de la estimación (server-side, `:287`; el front además solo lista autorizadas).
- **Soportes obligatorios cargados** (factura + CFDI con folio + fianza vigente si exigible) — server-side `:293`.
- **Techo presupuestal cargado** para (ejercicio, dependencia_id, partida); sin él → 409 (`:316`).
- **`dependencia_id` no nulo** (FK); legacy sin FK → 409 (`:304`).
- **Contrato no cerrado** (art. 64) — server-side `:283`.
- **Rol contratista** para promover — server-side `:240`,`:275`.
- Datos bancarios SPEI **numéricos** si el soporte es bancario — server-side `:244`.
- El semáforo además requiere ancla de autorización (nota de bitácora) y factura presentada para "correr"; si faltan, queda **deshabilitado** (no inventa días).

**4. Criterio de éxito observable**
- Tras promover, **existe una fila en `instruccion_pago`** para esa estimación, estado `'emitida'`, `monto = neto` al centavo, `factura_cfdi` = folio, `notificado_finanzas_en` con sello (NO vacío), `instruida_por` = id del JWT del contratista. Respuesta 201 con `{ ok: true, instruccion, suficiencia }` (`:345`).
- La **solicitud aparece en la cola global de finanzas** (`GET /cola`) con su contrato, contratista, periodo, neto y folio CFDI — sin entrar contrato por contrato.
- En UI: aviso verde "✓ Instrucción de pago generada … estado emitida … Notificada a Finanzas" (`TransitoPago.jsx:378`).
- El profe lo verifica así: "se generó la instrucción (registro único por estimación, sin doble), trae monto y folio CFDI no vacíos, y aparece en la cola de finanzas indicando a qué contrato pertenece".

**5. Qué genera al fallar**
- No-contratista promoviendo: 403 `"Solo el contratista promueve su cobro. Finanzas revisa la cola de solicitudes y paga."` (`:276`).
- Estimación no autorizada: 409 `"Solo se genera la instrucción sobre una estimación AUTORIZADA (estado actual: '<estado>')"` (`:288`).
- Sin techo: 409 `"No hay techo presupuestal cargado para (<dep>, ejercicio <año>); carga la partida específica…(art. 24 LOPSRM)."` (`:316`).
- Excede techo: 409 `"El neto ($X) excede el disponible ($Y); requiere ampliación presupuestal (art. 24 LOPSRM)."` (`:333`).
- Sin FK dependencia (legacy): 409 (`:305`).
- Faltan soportes: 409 `"Faltan soportes obligatorios (factura, CFDI con folio, o fianza de cumplimiento vigente)."` (`:294`).
- Contrato cerrado: 409 art. 64 (`:284`).
- Datos bancarios no numéricos: 400 `"Los datos bancarios (SPEI/CLABE) deben ser numéricos."` (`:245`).
- Doble instrucción: 409 `"Ya existe una instrucción de pago para esta estimación"` (`:352`, UNIQUE).
- Sin acceso por participación: 403 (`:192`,`:237`,`:273`).

**6. ¿Cambió de comportamiento? — SÍ (parcial; con BRECHA importante)**
- **CAMBIÓ:** el profe (22-jun) pidió que **el CONTRATISTA promueva su cobro** y que **finanzas reciba una cola GLOBAL**. Ambas cosas YA están en código: la promoción es exclusiva del contratista (403 a finanzas, `:240`/`:275`) y existe `colaCobro` global (`:425`) pintada en `AmbientePago.jsx`. Antes finanzas (o cualquier parte) podía generar la instrucción; ahora no.
- **CAMBIÓ:** la validación de **SPEI numérica** en datos bancarios (`:244`) es nueva (FIX 22-jun).
- **BRECHA 1 — falta el paso "residencia genera orden de pago y NOTIFICA al contratista 'presenta documentos a pago'".** Al autorizar (`estimaciones-ciclo.controller.js:479` `autorizarEstimacion`) SOLO se escribe una nota de bitácora; **NO se genera ninguna notificación dirigida al contratista** que le diga "presenta tus documentos a pago", ni una "orden de pago" como artefacto previo. El contratista debe llegar al tránsito por su cuenta. El profe describió esa notificación como parte del flujo correcto; hoy no existe como registro/notificación.
- **BRECHA 2 — "DATOS DE CUENTA BANCARIA como soporte nuevo".** El profe pidió que el contratista suba **CFDI + oficio de autorización + datos de cuenta bancaria** como soportes. El código SOLO trata como obligatorios **Factura + CFDI + fianza** (`leerSoportes:139`). Los "datos bancarios" se pueden subir como metadato libre (y se validan numéricos si el nombre casa el patrón), pero **NO son soporte obligatorio** ni hay campo/checklist explícito para "oficio de autorización" ni "cuenta bancaria". La factura como soporte sigue siendo "Factura" además del CFDI, cuando el profe habló del CFDI como la factura electrónica.
- **BRECHA 3 — carga de archivos binarios inexistente.** El profe habla de "subir los soportes" (oficio, CFDI). El sistema **solo registra METADATOS**, no archivos (`estadoTransito:217` `upload_archivos.disponible:false`; UI `nota-upload-deshabilitado`). El folio fiscal se "valida" solo como texto no vacío, NO contra el SAT.

**7. Citas legales**
- Suficiencia presupuestal en la **partida específica**: art. 24 párr. 2 LOPSRM (literal en `schema.sql:1285`, comentarios `:60`,`:296`).
- Plazo de pago 20 días naturales: art. 54 LOPSRM (`:27-29`); mora por exceso: art. 55 LOPSRM (`:28`).
- Gate solo sobre estimación autorizada: art. 54 LOPSRM (`:287`).
- Fianza de cumplimiento exigible: art. 48 fr. II LOPSRM (`:123`).
- Contrato cerrado / finiquito: art. 64 LOPSRM + art. 170 fr. VI RLOPSRM (`:283`).
- Exceso sobre lo contratado (no usado aquí, citado como límite): art. 118 RLOPSRM (`AmbientePago.jsx:21`).
- **`[validar]`:** umbrales del semáforo (0 / 1-10 / >10 días vencidos) = criterio del equipo, no ley (`:30`,`:181`). El "ancla del plazo = nota de bitácora" es criterio del equipo (sin columna `autorizada_en` canónica; pendiente Maiki, `instruccion-pago.routes.js:41-51`). Que la carga del techo sea rol finanzas = criterio del equipo (`:387`).

---

### HU-21 — Registro del pago efectuado por Finanzas

**1. Identidad**
- **Número/Título:** HU-21 — "Registro del pago efectuado" (`RegistroPago.jsx:65`).
- **Rol que la EJECUTA (nivel E):** `finanzas` (`permisos.js:35` — `{ residente:'C', contratista:null, supervision:null, dependencia:'C', finanzas:'E' }`). Doble candado: ruta `requireRole('finanzas')` (`pagos.routes.js:10`) y, en el form, `rol === 'finanzas'` para habilitar el botón (`RegistroPagoForm.jsx:54`).
- **Solo consultan (nivel C):** `residente` y `dependencia` (ven los pagos del contrato vía `GET /pagos/contrato/:id`, acotado por participación). `contratista` y `supervision` = `null` en la matriz, aunque la lectura de pagos del backend usa `esParteOSupervision` y no la matriz.

**2. Qué hace HOY, de verdad (paso a paso)**
1. **Selección.** Finanzas elige contrato (`RegistroPago.jsx`) o llega desde la cola (`AmbientePago` → `/pagos/registro?contrato=ID`) o desde el 4º paso del wizard (`TransitoPago.jsx:431`). El formulario es un componente compartido `RegistroPagoForm` (única fuente del POST, `RegistroPagoForm.jsx:8-12`).
2. **Estimaciones pagables.** El form lista solo estimaciones con estado `'autorizada'` (`PAGABLES = new Set(['autorizada'])`, `:19`,`:46`).
3. **Captura.** Estimación a pagar, fecha de pago, **referencia bancaria SPEI (solo dígitos, filtrada al teclear** `:128`), folio fiscal CFDI, **fecha de factura (input con `max=hoy`** `:139`), fecha de autorización (opcional), observaciones. El **importe NO se teclea**: se muestra read-only = neto de la estimación (`:117`).
4. **POST `/api/pagos`** → `registrarPago` (`pagos.controller.js:24`). Validaciones de forma 400: contrato y estimación requeridos (`:37-38`), fecha pago válida (`:39`), referencia requerida y **numérica** `^\d{6,100}$` (`:40-43`), folio CFDI requerido ≤60 (`:44-45`), fecha de factura válida y **no futura** (`:46-48`), fecha autorización opcional válida (`:50-53`).
5. **Transacción** (`:60`): existe contrato (`:61`), estimación con `FOR UPDATE` (`:66`), pertenece al contrato (`:69`), no `'pagada'`/`'rechazada'` (`:70-71`), **debe estar `'autorizada'`** (`:76`, art. 54), no tiene pago previo (`:77`).
6. **Gate de avance físico (FIX 22-jun).** Exige al menos un `concepto_avance` con `estado='vigente'` del contrato; si no, 409 (`:82-91`).
7. **Gate fecha de pago ≥ integración** de la estimación (`:98-104`).
8. **Inserción.** `importe = est.neto` (server-side, `:107`); `INSERT INTO pagos` con `registrado_por = req.user.id` (JWT) (`:109`); **UPDATE estimación → `'pagada'`** en la misma tx (`:118`); COMMIT; 201 con la fila del pago (`:120`).
9. **Inmutabilidad.** El pago es append-only: trigger `trg_pago_inmutable` lanza excepción en cualquier UPDATE (`schema.sql:515`).
10. **Lectura.** `GET /api/pagos/contrato/:id` → `pagosDeContrato` (`:135`), acota por participación (`:145`, 403 si no), deriva `dias_transcurridos = fecha_pago − GREATEST(fecha_autorizacion, fecha_factura)` y `plazo_cumplido (<=20)` (`:155-156`). Tabla en `RegistroPago.jsx:99-137`.

**3. Disparadores y precondiciones**
- Estado de estimación = **`autorizada`** (server-side `:76`; front lista solo autorizadas).
- **Avance físico vigente reportado** del contrato (server-side `:82`).
- Estimación no pagada y sin pago previo (`:70`,`:77`).
- Fecha de pago ≥ fecha de integración (`:100`).
- Fecha de factura no futura (server `:48` + UI `max` `:139`).
- Referencia numérica (server `:43` + UI filtra letras `:128`).
- Rol finanzas (ruta `:10` + form `:54`).
- Todas las precondiciones financieras se validan **server-side**; la UI las refleja pero la fuente de verdad es el controller.

**4. Criterio de éxito observable**
- Tras registrar, **existe una fila en `pagos`** ligada por `estimacion_id` (no NULL), con `importe = neto` de la estimación, `referencia` numérica, `factura_cfdi`, `fecha_factura`, `registrado_por` = id de finanzas (del JWT, no del body) — **ningún campo obligatorio vacío**.
- La **estimación cambia de estado `autorizada → pagada`** (`:118`).
- **No se paga dos veces** (UNIQUE/`FOR UPDATE` + chequeo `dup`, `:77`).
- En la tabla del contrato aparece el pago con el indicador de plazo de 20 días.
- El profe lo verifica así: "registró el pago (un solo registro, no doble), el importe es el neto (no tecleado), la estimación pasó a pagada, y se ve quién lo registró — el registro no quedó con datos vacíos".

**5. Qué genera al fallar**
- No finanzas: 403 de `requireRole('finanzas')` (ruta `:10`).
- Estimación no autorizada: 409 `"Solo puede pagarse una estimación AUTORIZADA por la residencia (art. 54 LOPSRM); estado actual: <estado>"` (`:76`).
- Ya pagada: 409 `"Esta estimación ya está pagada"` (`:70`) / `"Esta estimación ya tiene un pago registrado"` (`:78`,`:123`).
- Rechazada: 409 `"No se puede pagar una estimación rechazada"` (`:71`).
- **Sin avance físico:** 409 `"No se puede pagar: el contrato no tiene avance físico reportado (HU-06). Registra el avance antes de pagar."` (`:90`).
- Referencia no numérica: 400 `"La referencia bancaria (clave de rastreo SPEI) debe ser numérica (solo dígitos)"` (`:43`).
- Factura futura: 400 `"La fecha de la factura (<fecha>) no puede ser futura"` (`:48`).
- Fecha pago < integración: 400 (`:102`).
- Sin acceso a lectura: 403 (`:146`).
- Intento de UPDATE/edición de un pago: excepción de BD `"Un pago registrado es inalterable (registro de auditoria)."` (`schema.sql:511`).

**6. ¿Cambió de comportamiento? — SÍ**
- **CAMBIÓ:** gate estricto a estado `'autorizada'` (antes el conjunto permisivo incluía `'integrada'`/`'enviada'`; comentario `:72-76`). Pagar una integrada/enviada contradecía el art. 54.
- **CAMBIÓ (FIX 22-jun, profe):** (a) referencia SPEI **numérica** server-side (`:43`) — antes aceptaba letras; (b) fecha de factura **no futura** (`:48`) — "no emito una factura un mes después"; (c) **no pagar sin avance físico reportado** (`:82`) — "acabas de pagar y no tienes reportado tu avance".
- **CAMBIÓ:** el importe ya no se teclea (se deriva del neto, `:107`/`RegistroPagoForm.jsx:117`); endurecido a estimación real con no-doble-pago.
- **BRECHA — "Finanzas NO captura la factura":** el profe quiere que finanzas SOLO revise (folio fiscal y cuenta) y pague; que el CFDI/cuenta los suba el contratista en HU-20. HOY finanzas **sí captura** `factura_cfdi`, `fecha_factura` y `referencia` en el formulario de HU-21 (`RegistroPagoForm.jsx:133`,`:139`,`:128`). Es decir, **la factura/CFDI se re-teclea en el pago** en lugar de heredarse de los soportes que subió el contratista en el tránsito (`instruccion_pago.factura_cfdi`). No hay enlace que pre-llene HU-21 desde la instrucción ni validación de que coincidan. Esto es la BRECHA central que señaló el profe ("hoy puede que la capture").
- **BRECHA — validación del folio fiscal:** el profe quiere que finanzas "valide el folio fiscal del CFDI". HOY solo se valida longitud (≤60) y no-vacío (`:44-45`); no hay verificación real ni cotejo contra el folio que viene en `instruccion_pago`.
- **BRECHA — "dispersión/pago" como acción de finanzas separada:** no existe un paso explícito de marcar la solicitud de la cola como "pagada/dispersada" desde la cola; el registro del pago (HU-21) es lo que implícitamente la saca (`colaCobro` muestra `pagada = EXISTS pago`), pero la instrucción `instruccion_pago.estado` **permanece `'emitida'`** tras pagar (nunca avanza a `'cumplida'`); la cola la filtra por `estado='emitida'` y por el flag derivado `pagada`, así que una instrucción pagada **sigue en estado emitida** en la tabla aunque desaparezca de pendientes por el flag. Posible inconsistencia de estado para Maiki.

**7. Citas legales**
- Pago solo de lo autorizado + plazo: art. 54 LOPSRM (`:76`, `RegistroPago.jsx:68`).
- Mora por exceso de plazo: art. 55 LOPSRM (citado en `RegistroPago.jsx:150`).
- Avance físico previo al pago: derivado de HU-06 (criterio del profe; sin artículo explícito en el código — **[validar]** la base legal exacta).
- Referencia por medios electrónicos (SPEI): art. 54 (`schema.sql:496`).
- 5 al millar / inspección: art. 191 LFD (citado en `RegistroPago.jsx:150`; aplica a la carátula, no al pago en sí).
- Inmutabilidad del pago (append-only): criterio de diseño/auditoría (sin artículo; **[validar]**).
- **[validar]:** "pago exacto del neto, no parcial" = criterio del equipo, default conservador (`pagos.controller.js:106`); arts. 127-128 RLOPSRM citados en `RegistroPago.jsx:150` como fundamento general del pago — confirmar pertinencia con el profe.


## Convenios modificatorios (HU-03)

### HU-03 — Trámite de convenios modificatorios (monto, plazo, programa; conceptos adicionales etiquetados y curva versionada)

**1. Identidad**
- **Número / título:** HU-03 — "Trámite de convenios modificatorios" (título en pantalla: `frontend/src/pages/ConveniosModificatorios.jsx:430`; encabezado del formulario "Promover convenio modificatorio", línea 471; botón "Promover convenio modificatorio", línea 643).
- **Rol que la EJECUTA (nivel E):** `dependencia` (servidor facultado). En `frontend/src/data/permisos.js:14`: `'HU-03': { residente:'C', contratista:'C', supervision:'C', dependencia:'E', finanzas:null }`.
- **Roles que solo CONSULTAN (nivel C):** `residente`, `contratista`, `supervision`. `finanzas` = `null` (sin acceso, no aparece en sidebar).
- **Matiz importante (backend ≠ permisos.js):** aunque la UI solo da nivel `E` a `dependencia`, el backend de **registro** (`crearConvenio`) acepta como autoridad a `dependencia` O al `residente_id` asignado O al `created_by` del contrato (`convenios.controller.js:163`). En cambio el **acto de autorización** (`autorizarConvenio`) SOLO lo permite a `dependencia` (`:376`). Hay, por tanto, una asimetría: el residente puede REGISTRAR pero no AUTORIZAR.

**2. Qué hace HOY, de verdad (paso a paso)**

Flujo de REGISTRO (`POST /api/convenios/contrato/:id` → `convenios.controller.js:115 crearConvenio`):
1. El usuario abre la pantalla, selecciona contrato (hereda el contrato activo global vía `BannerContratoActivo`, `ConveniosModificatorios.jsx:449`; también lee `?contrato=ID`, `:171`). Se cargan en paralelo el detalle del contrato y `api.convenios(id)` que trae convenios + versiones del programa (`:142-148`).
2. Elige **tipo**: `plazo | monto | programa | mixto` (`:488`; el backend valida en `:127`). Captura **motivo/dictamen** (`:574` textarea, obligatorio), **oficio de soporte** (referencia textual, obligatorio, `:583`) y folio opcional (`:595`).
3. Para tipos que tocan el programa (`monto/programa/mixto`), la página **precarga el programa vigente** (catálogo con P.U. + periodos + celdas) en el `EditorProgramaConvenio` (`precargarEditor`, `:182`). El editor pinta las filas **existentes con clave, cantidad, PU y celdas en solo-lectura** (`disabled={soloLectura || c.existente}` en `EditorProgramaConvenio.jsx:69,82,85,164`) y permite **agregar conceptos nuevos** (`addCmConcepto`, `:236`).
4. Al "Promover", arma payload con `tipo, motivo, oficio`, `plazo_nuevo_dias` (si toca plazo) y `conceptos[]` + `celdas[]` completos (si toca programa) (`handleRegistrar`, `:306-329`). El **monto NO se teclea**: lo deriva el backend.
5. Backend (transaccional): toma `pg_advisory_xact_lock(2, contratoId)` (`:156`), `FOR UPDATE` del contrato (`:158`), valida autoridad (`:163`), gate de **contrato cerrado** (`contratoCerrado`, `:166`) y **bitácora abierta** (`:169`).
6. Si toca programa: pre-valida que no haya conceptos sin clave (`:177`), que ningún concepto se reduzca por debajo de lo ya estimado (`:181-191`), y que el catálogo nuevo incluya TODOS los existentes (`:193-196`).
7. **Snapshot perezoso de v1** del programa original si aún no existe (`snapshotVersion(...,1,null,true)`, `:206`).
8. Aplica la modificación al estado vivo: si toca plazo, recalcula `fecha_termino` y actualiza `contratos.plazo_dias` (`:213-218`); si toca programa, recorre el catálogo enviado: los **conceptos originales se CONGELAN** (cualquier cambio de cantidad/PU devuelve 409, `:226-234`), los **conceptos nuevos se INSERTAN con `es_adicional=true`** (`:239-242`) y se recalcula el monto canónico `Σ ROUND(cant×pu,2)` actualizando `contratos.monto` (`:246-247`).
9. Calcula deltas % de monto y plazo, y banderas `requiere_revision_sfp` (>25%, art.102) y `requiere_ajuste_costos` (>50%, art.59 Bis) (`:252-257`).
10. Asienta **nota automática de bitácora** (`tipo:'res_convenios'`, emisor = `residente_id`, `insertarNotaAtomica` + `textoNotaConvenio`, `:274-285`); la liga en el mismo INSERT.
11. Inserta el convenio **INMUTABLE** con `estado='registrado'`, `autorizado_por=NULL` (`:292-301`).
12. Si toca programa: bloquea celdas de adicionales en periodos ya cerrados (`fin < CURRENT_DATE`, `:309-322`), recuadra con `guardarMatriz(...,{convenioId})`, **supersede la versión vigente** (`vigente=false`, `supersedido_en=NOW()`) y crea la **nueva versión snapshot** (`:325-327`).
13. Responde 201 con monto/plazo anterior y nuevo, deltas, banderas, `programa_version_id`, `estado:'registrado'`, `aviso_autorizacion`, `aviso_variacion`, info de nota (`:333-347`).

Flujo de OFICIO (PDF de aprobación): `POST /api/convenios/:convenioId/oficio` (`subirOficioConvenio`, `:426`) guarda un PDF (multer memoria, revalida magic bytes `%PDF`) en `contrato_documentos` con `tipo='oficio_convenio'`, **append-only** (un solo oficio por convenio, `:445`). Se ve con `GET /api/convenios/:convenioId/oficio` (`descargarOficioConvenio`, `:457`).

Flujo de AUTORIZACIÓN: `POST /api/convenios/:convenioId/autorizar` (`autorizarConvenio`, `:372`) sella `estado='autorizado'`, `autorizado_por`, `autorizado_en` sobre un convenio en estado `registrado`. Si la variación >25% exige que el oficio YA esté cargado (`:397-403`). El trigger `sigecop_convenio_inmutable` (`schema.sql:1540`) solo permite la transición controlada `registrado→autorizado` una sola vez.

Versiones del programa: `GET /api/convenios/version/:versionId` (`detalleVersion`, `:97`) devuelve el snapshot inmutable (catálogo + celdas) que la UI pinta con `MatrizProgramaLectura` (`ConveniosModificatorios.jsx:844`). Tablas: `programa_version`, `programa_version_concepto`, `programa_version_celda` (`schema.sql:1592,1634,1648`).

**3. Disparadores y precondiciones**
- **Oficio de soporte ANTES de capturar (server-side):** sin la referencia del `oficio` el backend devuelve **409** y no procede (`:133`, `requiereOficio:true`). Esto materializa el "primero los soportes" del profe **a nivel de REFERENCIA textual** (que se concatena al motivo, `:134`), no de PDF: el PDF se adjunta DESPUÉS de registrar (`subirOficioConvenio`).
- **Bitácora abierta (server-side):** exige `bitacora_aperturas` para el contrato, si no, **409** "ábrela primero… (art. 122 RLOPSRM)" (`:169-170`).
- **Contrato no cerrado (server-side):** gate art.64 (`contratoCerrado`, `:166`).
- **Motivo obligatorio (server-side):** 400 si vacío (`:128`).
- **Catálogo completo cuando toca programa (server-side):** debe incluir todos los conceptos existentes (`:193-196`) y cuadrar al 100% por concepto (revalidado por `guardarMatriz`).
- **No reducir bajo lo estimado (server-side):** 400 si la cantidad nueva < lo ya estimado en estimaciones no rechazadas (`:181-190`).
- **No adicionar a periodo pasado (server-side):** 409 si un concepto adicional carga cantidad en un periodo con `fin < CURRENT_DATE` (`:319-322`).
- **Cota de plazo (server-side):** 400 si `plazo_nuevo_dias > 36500` (`:141-142`).
- **Autorización exige oficio cargado si >25% (server-side):** 409 (`:397-403`).
- **Solo-cliente (gating del botón):** `datosOk` exige motivo + oficio + cuadre + (plazo distinto / programa OK) (`ConveniosModificatorios.jsx:299-304`); avisos de umbral 25%/50% son informativos (`:288-289`).

**4. Criterio de éxito observable**
- **Genera UN registro inmutable** en `convenios_modificatorios` con número correlativo, folio (capturado o `CM-NNN`), tipo, motivo (que **NO queda vacío**: el backend lo exige y le antepone `[Oficio de soporte: …]`), monto_anterior→monto_nuevo, plazo_anterior→plazo_nuevo, deltas %, y `estado='registrado'`. Verificable en la tabla del historial (`tabla-convenios`, `:657`).
- **Mandó UNA notificación/nota de bitácora** vinculada (`nota_id`), visible como "🔗 Nota #N" en la columna "Nota de bitácora" (`:741`); si no había bitácora se difiere y se asienta al abrirla.
- **Cambió de estado el programa:** si tocó el programa, aparece una **versión nueva "Vigente"** y la anterior pasa a "Sustituida" en `tabla-versiones` (`:817-818`); el monto/plazo del contrato quedan sincronizados.
- **Conceptos adicionales quedan etiquetados** `es_adicional=true` en `contrato_conceptos` (`:239`), distinguibles de los originales (que NO se movieron).
- **Autorización:** el convenio pasa de chip "Pendiente de autorización" a "Autorizado" con autorizador y fecha (`:716-737`); el toast confirma "Convenio AUTORIZADO por el servidor facultado".
- El folio NO queda vacío (default `CM-NNN`, `:265`) y los deltas se DERIVAN (no se teclean).

**5. Qué genera al fallar (HTTP + mensaje exacto)**
- Sin oficio: **409** `"Sube/indica primero el oficio de solicitud o autorización del convenio: el soporte es previo a capturarlo (art. 99 RLOPSRM)."` (`:133`).
- Sin bitácora: **409** `"El contrato no tiene bitácora abierta; ábrela primero para registrar el convenio (art. 122 RLOPSRM)."` (`:170`).
- Tipo inválido: **400** `"tipo inválido (monto|plazo|programa|mixto)"` (`:127`).
- Motivo vacío: **400** `"El motivo (razones fundadas y explícitas / dictamen técnico, art. 99 RLOPSRM) es obligatorio"` (`:128`).
- Modificar un concepto original: **409** `'El concepto original "X" no se modifica por convenio (se congela)… Los cambios se agregan como conceptos ADICIONALES…'` (`:233`).
- Reducir bajo lo estimado: **400** `'El concepto "X" no puede reducirse a N: ya hay M estimado…'` (`:190`).
- Adicionar a periodo cerrado: **409** `'No se puede adicionar el concepto "X" al periodo #N: ese periodo ya cerró…'` (`:321`).
- Falta algún concepto del catálogo: **400** `'El catálogo nuevo debe incluir TODOS los conceptos existentes; faltan: …'` (`:196`).
- Plazo > 36500: **400** `'El plazo del convenio (N días) excede el máximo permitido (36500 días ≈ 100 años)…'` (`:142`).
- Contrato cerrado: **409** vía `msgCerrado('no se registran convenios')` (`:166`).
- No autoridad: **403** `"Solo la dependencia o el residente asignado puede registrar convenios"` (`:164`).
- Autorizar sin ser dependencia: **403** `"Solo el servidor facultado (dependencia) puede autorizar el convenio (art. 59 LOPSRM)"` (`:376`).
- Autorizar ya autorizado: **409** `"El convenio ya está autorizado; el acto de autorización es único (art. 59 LOPSRM)"` (`:390`).
- Autorizar >25% sin oficio: **409** `"La variación supera el 25% (art. 102 RLOPSRM): carga el oficio/soporte de aprobación antes de autorizar."` (`:401`).
- **AVISO (no bloqueo):** si la variación supera el 25%/50%, responde 201 igual con `aviso_variacion` y banderas `requiere_revision_sfp`/`requiere_ajuste_costos` (`:341,256-257`); el front muestra `aviso-sfp`/`aviso-ajuste` (`:606,617`).

**6. ¿Cambió de comportamiento? — SÍ (parcialmente; con BRECHAS)**

El profe (22-jun) pidió un cambio fuerte. Estado real frente a cada punto:
- ✅ **"Promover" no "registrar":** el copy YA dice "Promover convenio modificatorio" y el toast "promovido" (`:643,341`). Cambió.
- ✅ **Oficio ANTES de capturar:** YA se exige una **referencia** de oficio antes de registrar (409 si falta, `:133`). **BRECHA:** se exige solo el TEXTO; el **PDF** se sube DESPUÉS de registrar (`subirOficioConvenio` opera sobre un convenio ya creado). El profe quiere los SOPORTES (oficio de solicitud, de autorización, soportes técnicos) cargados como documentos ANTES de capturar — hoy es una sola referencia textual + un único PDF posterior.
- ✅ **Tipos monto/plazo/programa:** los 4 (incluido mixto) son creables.
- ✅ **Conceptos originales se CONGELAN:** YA implementado (409 si se intentan mover, `:233`; inputs deshabilitados en el editor). Cambió.
- ✅ **Adicionales etiquetados aparte y en histórico:** YA se insertan con `es_adicional=true` (`:239`). **BRECHA crítica:** la bandera `es_adicional` **se ESCRIBE pero no se LEE en ningún otro lugar** (búsqueda confirmada: solo aparece en `schema.sql` y en el INSERT de `convenios.controller.js`). No hay distinción visible "regular vs adicional" en estimaciones, pagos, generadores ni en la tabla de convenios del front. El profe quiere que se estimen EN PARALELO y se paguen DISTINTO, y que el histórico diga cuál es cuál — eso AÚN NO existe en el ciclo de estimación/pago.
- ✅ **No adicionar a periodo pasado:** YA implementado (409, `:319-322`). Cambió.
- ✅ **Programa nuevo SUMA adicionales sin tocar originales:** YA (originales congelados + adicionales nuevos; monto recalculado). Cambió.
- ⚠️ **Curva anterior CONGELADA / nueva curva con otro marco / % recalculado sobre nuevo total:** **BRECHA grande.** El versionado del PROGRAMA sí se congela (`programa_version`), pero la **curva de avance (`CurvaAvance.jsx`) NO conoce versiones ni convenios** (búsqueda confirmada: no hay referencia a `programa_version`/`convenio`/`version`). La curva financiera normaliza siempre sobre `selected.monto` vigente (`CurvaAvance.jsx:293,303`), que ya incluye los adicionales sumados. No existe "congelar la curva histórica" ni "nueva curva con nuevo marco de referencia": al registrar un convenio que sube el monto, el denominador cambia y el % histórico se re-escala — exactamente el efecto "hoy 26%, mañana 13%" que el profe quiere evitar. AÚN NO se refleja lo pedido.
- ✅ **Reducción de conceptos posible:** permitida mientras no baje de lo ya estimado (`:181-190`). Parcial: el caso del profe (reducir un concepto ya autorizado externamente) se admite salvo por el piso de lo estimado, que es criterio de diseño del equipo, no ley.
- ⚠️ **"El sistema NO soporta el trámite de autorización; solo REFLEJA lo autorizado fuera":** hay tensión de diseño. El código SÍ introdujo un acto de autorización interno (`autorizarConvenio`, estado `registrado→autorizado`), lo cual va en sentido CONTRARIO a la visión del profe de que el sistema solo refleje lo ya autorizado externamente. **BRECHA conceptual:** Maiki debe decidir si ese estado interno es "reflejo de la autorización externa" (renombrarlo/recontextualizarlo) o eliminarlo. Además el `DEFAULT 'autorizado'` de la columna `estado` (`schema.sql:1536`) contradice el INSERT explícito `'registrado'` (`:297`) — convive por el backfill de convenios viejos, pero conviene documentarlo.

**7. Citas legales**
- **Convenio modificatorio:** LOPSRM **art. 59** (modificación de contratos; comentario `convenios.controller.js:2-7`). El profe añade **art. 59 / 59 Bis**.
- **Ajuste de costos >50%:** LOPSRM **art. 59 Bis** (`:29,257`).
- **Revisión SFP >25%:** RLOPSRM **art. 102** (`:28,256,397`). El umbral del 25% es referencia administrativa, NO tope del art. 59 (`:23-25`).
- **Dictamen técnico / motivo / suscripción:** RLOPSRM **art. 99** (párr. 1 sustento del residente; párr. 5 suscripción del servidor facultado) (`:7,128,164,365`).
- **Bitácora obligatoria:** RLOPSRM **art. 122** (`:167,170`).
- **Nota de bitácora del convenio:** RLOPSRM **art. 123 fr. III / fr. XI / 125 fr. I** (`:267`, `bitacora.controller.js:526`); emisor residente por LOPSRM **art. 53** (`:280-281`).
- **Acto de autorización:** LOPSRM **art. 59 párr. 3** + art. 1 Quinquies + RLOPSRM art. 99 párr. 5 / art. 102 fr. I-III (`:361-365`).
- **Contrato cerrado solo-lectura:** LOPSRM **art. 64** (`:165`).
- **Cuadre al centavo:** RLOPSRM **art. 45 fr. IX** (`:31`).
- **Cota de plazo (36500 días):** **[validar]** — criterio de diseño, sin tope legal numérico (`:139-141`).
- **No reducir bajo lo ya estimado:** **[validar]** — criterio de diseño del equipo, sin cita legal directa (el art. 118 trata excedentes, no reducciones) (`:180-181`).


## Expediente, portafolio ejecutivo y exportación de reportes

### HU-04 — Consulta integrada del expediente contractual

**1. Identidad**
- Número/título: HU-04, "Consulta integrada del expediente contractual" (encabezado real en `ConsultaExpediente.jsx:729`).
- Rol que la EJECUTA (nivel E): **residente** (`permisos.js:15` → `'HU-04': { residente:'E', ... }`).
- Roles que solo CONSULTAN (nivel C): **contratista, supervisión, dependencia**. Finanzas: **sin acceso** (`finanzas:null`). El acceso a CADA contrato se acota además por participación server-side en `detalleContrato` (`contratos.controller.js:597` → `esParteOSupervision`), así que el nivel E del residente no le da acceso a contratos donde no es parte.

**2. Qué hace HOY, de verdad (paso a paso)**
1. Al entrar (`ConsultaExpediente.jsx:549`) la página llama `api.listarContratos()` y llena el selector de contratos accesibles. El contrato puede venir preseleccionado por `?contrato=ID` (efecto `:591`) — es el punto de entrada desde el portafolio (HU-18) y desde notificaciones.
2. Al elegir un contrato, `seleccionarContrato` (`:556`) hace una carga en cascada con tolerancia a fallos: `api.detalleContrato(id)` (obligatorio) y luego, cada uno con `try/catch` que degrada a null/[]: `leerProgramaObra`, `rosterContrato`, `planAmortizacion`, `convenios`, `estimacionesDeContrato`. Si el contrato no es accesible, `detalleContrato` devuelve 403/404 y se muestra el aviso correspondiente (`:578`).
3. El backend `detalleContrato` (`contratos.controller.js:562`) trae `contratos.*` + nombres de las 3 personas del equipo + **empresa de cada persona** leída de la COLUMNA del contrato (`contratista_empresa_id`/`supervision_empresa_id`, con COALESCE a la del usuario para legados; `:584-589`). Luego carga en paralelo los bloques hijos `contrato_conceptos`, `contrato_actividades`, `contrato_garantias` (`:602`). Antes de responder valida acceso con `esParteOSupervision` (`:597`).
4. La página arma 9 bloques colapsables (memo `bloques`, `:598`): Configuración (con **superintendente VIGENTE del roster**, no el snapshot del alta; `BloqueConfiguracion` `:83`), Catálogo de conceptos (muestra la **CLAVE** del concepto, `BloqueCatalogo` `:106-127`), Programa de obra (matriz mes×concepto si hay A2, si no la tabla vieja de actividades; `BloquePrograma` `:146`), Fianzas (`:200`), Plan de amortización del anticipo (`:267`), Documentos jurídicos + equipo con empresa (`:232`), Roster/sustituciones art.125 (`:317`), Convenios modificatorios con su nota de bitácora y oficio de aprobación descargable (`:382`), y Resumen de estimaciones con galería de fotos por estimación (`BloqueEstimaciones` `:474`, `FotosEstimacion` `:523`).
5. El buscador (`:714`) filtra qué BLOQUES se ven, solo por dos criterios: **Tipo de documento** y **Periodo** (`CAMPOS_BUSQUEDA` `:27`), con lógica Y (`terminos.every` `:717`).
6. "Exportar expediente (PDF)" (`:799`) NO genera un PDF por bloque: usa `window.print()` sobre una vista de impresión consolidada (CSS print: todos los bloques quedan en el DOM, `oculto`/colapsado se fuerza visible al imprimir; `BloqueExpediente` `:57`, membrete de impresión `:812`).

**3. Disparadores y precondiciones**
- Requiere sesión (token) y haber elegido un contrato; sin contrato muestra guía (`:746`).
- Precondición real de visibilidad: ser PARTE del contrato (o dependencia/finanzas que ven todo) — validado **server-side** en `detalleContrato` (`:597`) y en cada endpoint hijo (p. ej. `observaciones`/`convenios`). El front solo manda el token.
- El expediente NO exige que el contrato esté en ningún estado: es un visor read-only que va mostrando lo que ya existe; cada bloque vacío muestra "Este contrato no tiene…" + guía (`BloqueVacio` `:39`).

**4. Criterio de éxito observable**
- El profe selecciona un contrato y ve, en UNA sola vista, los 9 bloques con datos reales. Verificable: el catálogo muestra **clave + concepto** (columna "Clave", `:116-127`), la configuración muestra el **superintendente vigente** (testid `config-super-vigente`), y los convenios (si los hay) muestran **originales→adicionales** mediante las versiones del programa y la fila de cambio Monto/Plazo anterior→nuevo (`:427-432`).
- "Exportar expediente" produce **un solo documento** imprimible (diálogo de impresión del navegador con todos los bloques), sin descargas sueltas por bloque.
- Ningún bloque queda "a medias": un bloque sin datos dice explícitamente que no tiene esa información, no aparece vacío sin explicación.

**5. Qué genera al fallar**
- Contrato ajeno: `detalleContrato` responde **403** `{ error: 'No tienes acceso a este contrato' }` (`:598`); la UI muestra "No tienes acceso a este contrato." (`:579`).
- Contrato inexistente: **404** `{ error: 'Contrato no encontrado' }` (`:593`); UI: "Contrato no encontrado." (`:580`).
- Los bloques hijos que fallan (403/404/red) se degradan silenciosamente a vacío (`try/catch` en `:571-576`) — no rompen la vista, solo el bloque sale como "no registrado".
- Búsqueda sin coincidencias: bloque de aviso "Ningún bloque del expediente coincide con tu búsqueda" + botón limpiar (`:826`).

**6. ¿Cambió de comportamiento?** **SÍ.**
- El profe (22-jun) pidió: quitar la "búsqueda de empresa" y el "folio de consulta integrada"; mostrar conceptos con su clave; ver originales+adicionales con modificatorios.
- **Clave de concepto: HECHO** — el catálogo ya muestra la columna "Clave" (`:116`, `:127`, testid `exp-concepto-clave-${i}`).
- **Búsqueda de empresa: HECHO (parcial)** — `CAMPOS_BUSQUEDA` se redujo a solo `documento` y `periodo` (`:27-30`); las opciones de folio/contratista/empresa YA NO aparecen en el selector de la UI. **BRECHA menor:** las ramas `campo === 'empresa'` y `campo === 'contratista'`/`folio` siguen vivas en `haceMatch` (`:621-623`, `:676`, `:687`) pero quedan **inertes** (inalcanzables desde la UI). Si Maiki quiere dejar el código limpio, conviene borrarlas; funcionalmente ya no se ofrecen.
- **"Folio de consulta integrada": HECHO** — no existe ningún folio/identificador de consulta generado; el título dice "Consulta integrada del expediente" pero no genera ningún folio. No encontré rastro de un "folio de consulta" en el código actual, así que ya está quitado o nunca llegó a producción.
- **Originales + adicionales con modificatorios: PARCIAL / posible BRECHA.** El expediente muestra los convenios y un link a "Ver versiones del programa" (`:455-465`), y el catálogo muestra los conceptos vigentes. Pero **dentro del bloque Catálogo NO hay una marca visual "original" vs "adicional"** por concepto — eso depende de la columna `es_adicional` que mencionan las notas de sesiones recientes; el detalle de conceptos (`detalleContrato`) trae `contrato_conceptos.*` (`:603`) sin distinguir/etiquetar adicionales en el render del expediente. **A confirmar con Maiki:** si el profe espera ver la etiqueta "adicional" junto a cada concepto agregado por convenio dentro del expediente, eso aún no se pinta aquí (vive en el módulo de convenios/programa, no en el bloque Catálogo de HU-04).

**7. Citas legales**
- Clave de concepto obligatoria/visible: **art. 45 fr. IX RLOPSRM** (comentario `:115`).
- Programa de obra: **art. 24 párr. 2 / art. 45 fr. X RLOPSRM** (matriz concepto×periodo).
- Plan de amortización: **art. 143 fr. I + art. 138 párr. 3 RLOPSRM** (`:277`).
- Roster/sustituciones: **art. 125 RLOPSRM** (`:325`); nota de bitácora por sustitución **art. 123 fr. III** (`:328`).
- Convenios: **art. 59 LOPSRM / art. 99 RLOPSRM** (`:404`).
- Evidencia fotográfica: **art. 132 fr. IV RLOPSRM** (`:518`).

---

### HU-18 — Portafolio ejecutivo con semáforos

**1. Identidad**
- Número/título: HU-18, "Portafolio ejecutivo" (`PortafolioEjecutivo.jsx:264`).
- Rol que la EJECUTA (nivel E): **dependencia** (`permisos.js:32` → `'HU-18': { dependencia:'E', ... }`).
- Roles que solo CONSULTAN (nivel C): **residente, supervisión**. Contratista y finanzas: **sin acceso** (`contratista:null, finanzas:null`). Aunque finanzas no entra a esta vista, el backend `ROLES_VEN_TODO` sí permitiría a dependencia/finanzas ver todos los contratos si llegaran (`portafolio.controller.js:65`).

**2. Qué hace HOY, de verdad (paso a paso)**
1. La página (`PortafolioEjecutivo.jsx:228`) llama `api.portafolio()` → `GET /api/portafolio` (montado en `server.js:65`). Es la ÚNICA vista que opera sobre MÚLTIPLES contratos.
2. El backend `portafolio` (`portafolio.controller.js:62`) selecciona los contratos accesibles (dependencia/finanzas ven todos; operativos solo donde son parte; `:71-83`) y post-filtra por empresa con `esParteOSupervision` (`:87`).
3. Por cada contrato calcula SERVER-SIDE: avance físico por VALOR (Σ cantidad_periodo×pu de estimaciones no rechazadas ÷ monto; `:100-116`), programado por valor (`:120`), financiero (Σ pagos ÷ monto; `:133`), penalización real de la carátula (retencion_atraso + deductivas; `:143-145`), rechazadas sin reingreso (`:147-150`), días en estado 'enviada' (art.54; `:151-152`), observaciones abiertas (`:161`), y déficit físico por concepto (mismo CTE que HU-07 alertas; `:173`).
4. Arma el **semáforo** con 3 factores puntuados 0/1/2 (`puntaje` `:47`): (1) desviación avance vs programado, umbrales `DESVIACION_PP {ok:5, alerta:15}` (`umbrales-semaforo.js:18`); (2) días de plazo legal vencido (ejecución art.52/54 + art.54 revisión >15d; `:221-225`), un déficit físico lo eleva a ámbar mínimo (`:238`); (3) pendientes sin atender (obs abiertas + rechazadas sin reingreso, umbral `{ok:0, alerta:2}`). El color sale de la suma: ≤1 verde, 2-3 amarillo, ≥4 rojo (`colorDe` `:55`). Sin programa de obra el factor avance no se evalúa → semáforo **parcial** (`:244`).
5. Devuelve `{ rol, umbrales, totales:{contratos,verde,amarillo,rojo}, contratos:[...] }` (`:310`). Cada contrato trae `semaforo.desglose` (factor/valor/puntos) que la UI muestra en el tooltip de la fila (`PortafolioEjecutivo.jsx:138`).
6. La UI pinta contadores por color (`Contadores` `:39`), tabla de contratos (`TablaContratos` `:179`) con dot + badge de semáforo, avance físico, Δ vs mes anterior (`VariacionMesBadge` `:25`) y pendientes. Permite agrupar por Contratista o Ejercicio fiscal (`AGRUPADORES` `:207`; se QUITÓ "Tipo de contratación" porque el procedimiento de adjudicación no existe en el esquema, `:204`).
7. **Clic en el semáforo (dot o badge) navega al EXPEDIENTE** del contrato: `irAlExpediente` (`:136`) hace `navigate('/contratos/expediente?contrato=${c.contrato_id}')`. El **doble clic sobre la fila** abre el `PanelDetalle` in-place con KPIs físico/financiero/atrasos/penalizaciones (`:65`, handler `onDoubleClick` `:143`).

**3. Disparadores y precondiciones**
- Requiere sesión. No exige ningún estado del contrato; agrega todos los accesibles.
- El cálculo y el semáforo son **100% server-side** (`:18` comentario "Todo el cálculo y el SEMÁFORO se hacen SERVER-SIDE"); el front solo presenta y navega.
- Acotamiento por participación/empresa server-side (`:87`).

**4. Criterio de éxito observable**
- El profe abre el portafolio y ve cada contrato con un semáforo de color: verde = buen estado (≤1 punto), amarillo = varios atrasos/pendientes (2-3), rojo = grave (≥4). Verificable con los testids `semaforo-dot-${folio}` / `semaforo-badge-${folio}` y `data-color`.
- **Al hacer CLIC en el semáforo lo lleva al expediente de ESE contrato** (criterio explícito del profe): verificable porque el dot/badge es un `<button onClick={irAlExpediente}>` que navega a `/contratos/expediente?contrato=ID` (`:136`, `:149-157`, `:165-173`), y ConsultaExpediente preselecciona ese contrato por `?contrato=` (`ConsultaExpediente.jsx:591`). El criterio en pantalla lo dice literal: "Clic en el semáforo para ir al expediente del contrato" (`:307`).
- Contadores totales por color cuadran con la suma de filas (`totales` `:313`).

**5. Qué genera al fallar**
- Sin contratos accesibles: responde 200 con `totales` en 0 y `contratos: []` (`:88-95`); la UI muestra "No hay contratos en tu portafolio." (`:321`).
- Error de carga: banner rojo "No se pudo cargar el portafolio" + toast (`:231-233`, testid `banner-error`).
- Error interno backend: **500** `{ error: 'Error interno' }` (`:317`).
- No hay códigos 400/403 propios: el acceso se resuelve por filtrado de filas, no por rechazo.

**6. ¿Cambió de comportamiento?** **SÍ, parcialmente; con una BRECHA importante.**
- Profe (22-jun): semáforo verde/amarillo/rojo; clic en el semáforo → expediente; "el ejecutivo debe darse cuenta de que algo está mal (ej.: pagaste sin avance reportado → reporte de riesgos)"; verificar que el clic navegue al expediente.
- **Clic → expediente: HECHO.** Antes el semáforo era decorativo; ahora dot y badge son botones que navegan a `/contratos/expediente?contrato=ID` (`:136`). Verificado en código. La fila se reservó para el doble-clic que abre el detalle in-place.
- **Semáforo verde/amarillo/rojo con significado: HECHO** y server-side (criterio del equipo en `umbrales-semaforo.js`, configurable).
- **"Tipo de contratación" eliminado: HECHO** (`:204`) — antes salía deshabilitado/"no disponible"; ahora simplemente no se ofrece.
- **BRECHA: "reporte de riesgos / pagaste sin avance reportado".** El profe quiere que el ejecutivo detecte anomalías concretas tipo "se pagó sin avance reportado". **Eso NO existe como tal.** Busqué en `portafolio.controller.js` y no hay ninguna detección de "pago > avance" ni un panel/reporte de riesgos (la búsqueda de `pago.*sin.*avance|riesgo|pagaste` no arrojó coincidencias). Lo más cercano es que el financiero_pct y el físico_pct se calculan por separado (`:209-211`) y el detalle los muestra lado a lado, pero **el sistema no marca explícitamente la incoherencia "financiero > físico"** ni la incorpora como factor del semáforo ni como alerta. Maiki: si el profe espera ver señalado "pagaste sin avance", falta construir esa regla (comparar `financiero_pct` vs `fisico_pct` y marcar riesgo cuando el pagado supere el avance físico/reportado).

**7. Citas legales**
- Plazo de revisión de estimación (factor 2): **art. 54 LOPSRM**, 15 días naturales (`:36-38`, `PLAZO_ART54_REVISION_DIAS`).
- Plazo de ejecución vencido: **art. 52/54 LOPSRM** (`:69`).
- Penalización real de la carátula: **art. 46 Bis LOPSRM + 86-88 RLOPSRM** (vía retencion_atraso + deductivas; cf. carátula).
- Umbrales del semáforo (5pp/15pp, 0/1-10 días, 0/1-2 pendientes): **[validar]** — son criterio del equipo, sin fundamento legal del número exacto (`umbrales-semaforo.js:3`, `portafolio.controller.js:22`). Configurables en un solo punto.

---

### HU-19 — Exportación de los reportes definidos del contrato

**1. Identidad**
- Número/título: HU-19, "Exportación de reportes" (`ExportacionReportes.jsx:117`).
- Rol que la EJECUTA (nivel E): **residente** (`permisos.js:33` → `'HU-19': { residente:'E', ... }`).
- Roles que solo CONSULTAN (nivel C): **contratista, supervisión, dependencia, finanzas** (todos C). En esta HU el nivel C deshabilita los botones de exportar vía `useVistaHU('HU-19').soloLectura` (`:34`, `botonDeshabilitado` `:109`) — los roles C ven la lista pero no descargan.

**2. Qué hace HOY, de verdad (paso a paso)**
1. La página (`ExportacionReportes.jsx:47`) carga contratos accesibles. Al elegir contrato, `seleccionarContrato` (`:52`) carga en paralelo TODAS las fuentes con tolerancia a fallos: `leerProgramaObra`, `trabajosDeContrato`, `historialEstimaciones`, `preparacionEstimacion`, `listarPagos`, `notasDeContrato` (404 si no hay bitácora), `convenios`, `observacionesContrato` (`:62-73`). Guarda todo en `datos`.
2. Permite elegir **periodo** (Mensual/Trimestral/Acumulado, `:163`) que SOLO acota el rango de fechas, no el contenido (CA-2; `ventanaPeriodo` en `reportesContrato.js:65`).
3. Muestra la tabla de los **7 reportes definidos** (`CATALOGO_REPORTES` `reportesContrato.js:406`) con botones por formato. Al exportar (`exportar` `:92`) llama al handler cliente correspondiente (`HANDLERS` `:418`) que genera PDF (jsPDF) o Excel (exceljs vía `excelExport.js`).
4. La generación corre 100% en el cliente; no toca backend ni server.js (`reportesContrato.js:2`).

**Los 7 reportes y su estado REAL (auditado contra el código):**
| # | Reporte | Formato(s) | Handler | Estado real |
|---|---|---|---|---|
| 1 | Avance físico vs programado | PDF + Excel | `avanceFisicoPDF`/`Excel` (`:187`/`:223`) | **Funciona.** Curva S (programado/ejecutado/financiero) + matriz concepto×periodo. La curva REUSA la definición corregida de `CurvaAvance.financieroMap`: periodo en curso corta en hoy, futuros = null (`curvaS` `:92`). Si no hay programa: "Sin programa de obra para el periodo seleccionado." (`:200`). |
| 2 | Avance financiero | Excel | `avanceFinancieroExcel` (`:241`) | **Funciona.** Por estimación (subtotal/amortización/retención/deductivas/pena atraso/neto) + resumen pagado. Marca pendiente: "Comprometido/disponible presupuestal — PENDIENTE depende de HU-20" (`:268`). |
| 3 | Listado de estimaciones | Excel | `estimacionesExcel` (`:279`) | **Funciona.** Una fila por estimación con estado etiquetado, importes y sellos integrada/presentada. |
| 4 | Listado de observaciones | Excel | `observacionesExcel` (`:306`) | **Funciona AHORA** (era el que estaba deshabilitado). FIX 2.2 cableó la fuente nivel contrato `GET /api/observaciones/contrato/:id` (`observaciones.controller.js:8`, montado `server.js:77`). En el catálogo ya está `disponible: true` (`:410`). |
| 5 | Bitácora completa | PDF | `bitacoraPDF` (`:329`) | **Funciona, con candado:** `requiereBitacora: true` (`:411`); si el contrato no tiene bitácora aperturada el botón se deshabilita y muestra "Sin bitácora aperturada" (`ExportacionReportes.jsx:216`). |
| 6 | Histórico de modificatorios | Excel | `modificatoriosExcel` (`:357`) | **Funciona.** Convenios con deltas de monto/plazo, revisión SFP, ajuste de costos. |
| 7 | Penalizaciones y deductivas | Excel | `penalizacionesExcel` (`:387`) | **Funciona.** Distingue pena por atraso (derivada), 5 al millar fiscal y deductivas + pena % pactada. |

**3. Disparadores y precondiciones**
- Requiere sesión y contrato seleccionado; fuentes acotadas por participación server-side.
- Nivel C / `soloLectura` deshabilita TODOS los botones (`:110`).
- Reporte 5 (bitácora) requiere bitácora aperturada (`requiereBitacora`); si `datos.notas` es null el botón se bloquea (`sinBitacora` `:105`).
- El reporte 4 ya NO está deshabilitado (tiene fuente). No quedan reportes con `disponible:false` en el catálogo actual.

**4. Criterio de éxito observable**
- El profe selecciona contrato + periodo, hace clic en un formato y **se descarga un archivo real** con datos del contrato (PDF con jsPDF / Excel con exceljs), no un volcado vacío ni dummy. Si una fuente viene vacía, el archivo sale con encabezados y sin filas (válido), nunca con relleno ficticio (`reportesContrato.js:4`).
- Los 7 reportes están listados y exportables (excepto los candados legítimos: bitácora sin aperturar deshabilita el #5).
- El periodo cambia el RANGO de fechas pero no las columnas del reporte (CA-2).

**5. Qué genera al fallar**
- Contrato ajeno al cargar fuentes: `seleccionarContrato` captura **403** y muestra "No tienes acceso a este contrato" (banner + toast; `:76`).
- Fuente individual que falla (p. ej. sin bitácora, sin convenios): se degrada a null/[] sin romper la vista (`.catch()` por fuente, `:62-73`).
- Error al generar el archivo: `try/catch` en `exportar` muestra "No se pudo generar el reporte" (`:98`).
- Botón deshabilitado (sin permiso E, sin contrato/datos, reporte sin fuente, o bitácora faltante): no exporta (`botonDeshabilitado` `:109`).

**6. ¿Cambió de comportamiento?** **SÍ.**
- Profe (22-jun): los 7 reportes deben tener FORMATO y DISEÑO (no volcado crudo); vio pestañas que NO funcionan (curva en blanco/0).
- **Curva en blanco/0: ATENDIDO en la lógica.** La curva del reporte 1 ahora REUSA la definición corregida de `CurvaAvance.financieroMap` (fix O1): periodo en curso corta en hoy, futuros = null, ejecutado se detiene en el periodo actual (`curvaS` `:88-151`). Esto era exactamente el bug "curva en blanco/0" que el profe vio en pantalla; el reporte ahora calcula igual que la pantalla corregida. **BRECHA / a verificar en vivo:** el comentario dice que coincide con la curva en pantalla, pero el profe reportó haberla visto en 0/blanco — si en su corrida la pantalla de CurvaAvance (HU-05) aún se ve mal por datos (seed con fechas pasadas, periodos futuros sin avance), el reporte heredará el mismo "0%". Esto es dato/seed, no fórmula. El reseed con fechas actuales (`reseed_demo_fechas_actuales.sql`) mitiga esto pero hay que confirmarlo con un contrato cuyo periodo actual ya tenga avance.
- **Reporte 4 (observaciones) ya no está roto:** antes estaba `disponible:false` por falta de fuente; ahora tiene endpoint y exporta (`disponible:true` `:410`).
- **Formato/diseño: PARCIAL — posible BRECHA respecto a lo que pide el profe.** El profe quiere "formato y diseño", no volcado crudo. Lo que hay HOY:
  - Los **Excel** (reportes 2,3,4,6,7) son **tablas planas json→hoja** vía `descargarExcelHoja`/`Multihoja` (`excelExport.js:24-49`): encabezados desde las claves del primer objeto y filas; **sin estilos, sin logo, sin formato de moneda, sin anchos de columna** — es exactamente "volcado a tabla". Si el profe espera Excel con diseño (membretes, formato), esto sigue siendo crudo.
  - Los **PDF** (reportes 1 y 5) sí tienen un encabezado mínimo con título, contrato y fecha (`encabezadoPDF` `:173`), pero son texto monoespaciado línea por línea (`doc.text(...)` con separadores `|`), **sin tablas formateadas ni curva graficada** (la "curva S" del PDF es una tabla de texto, no una gráfica). 
  - **Conclusión para Maiki:** la HU "funciona" (genera los 7 archivos con datos reales y la curva ya no se calcula en 0), pero el "formato y diseño" que pidió el profe está a nivel básico; los Excel son tablas sin estilo y los PDF son texto plano. Si el profe insiste en diseño, falta trabajo de presentación (esa parte fina la cubre otra auditoría según el encargo).

**7. Citas legales**
- Pena por atraso (reportes 2 y 7): **art. 46 Bis LOPSRM + arts. 86-88 RLOPSRM** (mecánica) + **art. 90 RLOPSRM** (tope) — derivada de la carátula (`reportesContrato.js:44-51`, `:393`).
- Retención 5 al millar: **art. 191 LFD** (retención fiscal, no pena; `:394`).
- Deductivas/penas convencionales: **art. 46 / 46 Bis** (`:384`).
- Modificatorios (reporte 6): **art. 59 / 59 Bis LOPSRM**; revisión SFP **art. 102 RLOPSRM**; ajuste de costos **art. 59 Bis** (`:355`, `:370-371`).
- Observaciones de revisión (reporte 4): **HU-15** (art. 54 LOPSRM, revisión técnica) (`observaciones.controller.js:1`).
- Plazo del periodo en la curva: **art. 54 LOPSRM** (corte en hoy).

---

**Notas transversales para Maiki (rutas absolutas):**
- Backend expediente: `C:\Users\migue\Downloads\Proyectofepy\sigecop\backend\src\controllers\contratos.controller.js` (función `detalleContrato`, líneas 562-618).
- Backend portafolio: `C:\Users\migue\Downloads\Proyectofepy\sigecop\backend\src\controllers\portafolio.controller.js`.
- Backend observaciones (fuente reporte 4): `C:\Users\migue\Downloads\Proyectofepy\sigecop\backend\src\controllers\observaciones.controller.js`.
- Front expediente: `...\frontend\src\pages\ConsultaExpediente.jsx`; cascarón de navegación: `...\AmbienteExpediente.jsx`.
- Front portafolio: `...\frontend\src\pages\PortafolioEjecutivo.jsx` (clic→expediente en `irAlExpediente`, líneas 136-173).
- Reportes (lógica): `...\frontend\src\services\reportesContrato.js`; exportador Excel crudo: `...\frontend\src\services\excelExport.js`; página: `...\frontend\src\pages\ExportacionReportes.jsx`.
- **3 BRECHAS clave a resolver:** (a) HU-18 NO detecta "pagaste sin avance reportado" / no hay reporte de riesgos; (b) HU-04 no etiqueta "original vs adicional" por concepto dentro del bloque Catálogo; (c) HU-19 genera los 7 archivos con datos reales pero los Excel son tablas sin estilo y los PDF son texto plano (no "diseño"), y la curva del reporte 1 hereda el "0%" de la pantalla si el seed tiene periodos sin avance.


## Finiquito y cierre del contrato (HU-24)

### HU-24 — Finiquito y cierre del contrato (contrato cerrado = solo lectura)

**1. Identidad**
- **Número / título:** HU-24 — Finiquito y cierre del contrato. El profe la pidió explícitamente ("debe haber un cierre a fuerzas, hay que agregar finiquito… el finiquito es una nota de bitácora y el cálculo de todo lo que te debo / lo que me debes", revisión 16-jun). Es una HU agregada (FASE 4), NUMERO LIBRE, no renumera nada.
- **ROL que la EJECUTA (nivel E):** **Dependencia** o **Residente** asignado al contrato. NO está en `frontend/src/data/permisos.js` (HU-24 quedó fuera del catálogo de HU, igual que roster/expediente). El acceso a la pantalla se controla por ruta: `frontend/src/App.jsx:103` (`/contratos/finiquito` → `<SoloRol roles={['dependencia','residente']}>`) y `App.jsx:119` (`/contratos/cierre` → mismos roles). La autoridad real para CERRAR la valida el backend (`finiquito.controller.js:113`): `req.user.rol === 'dependencia' || contrato.residente_id === req.user.id || contrato.created_by === req.user.id`.
- **Roles que solo CONSULTAN (nivel C):** el front limita el botón de cierre con `puedeCerrar = ['dependencia','residente'].includes(rol)` (`Finiquito.jsx:86`); cualquier otro rol que llegue a la pantalla ve el desglose pero recibe el mensaje "Solo la dependencia o el residente asignado puede elaborar el finiquito" (`Finiquito.jsx:230`). El cálculo de saldo en modo lectura (GET) lo puede ver cualquier parte/supervisión del contrato (`finiquito.controller.js:79`, `esParteOSupervision`). **OJO/BRECHA:** dado que HU-24 no está en `permisos.js`, no hay matriz HU×rol formal para ella; el único gate de rol es `SoloRol` + autoridad server-side. Maiki decide si quiere registrarla en `permisos.js`.

**2. Qué hace HOY, de verdad (paso a paso)**

*Preparación (read-only) — GET `/api/finiquito/contrato/:id` → `finiquito.controller.js:73 prepararFiniquito`:*
1. Valida id entero positivo (`:76`), carga el contrato con `getContrato` (`:63`, lee `estado`, `cerrado_en`, `monto`, `anticipo_pct` y punteros de equipo), 404 si no existe.
2. Acota por participación: `esParteOSupervision(req.user, contrato)` → 403 si el usuario no es parte/supervisión (`:79`).
3. Calcula el desglose server-side con `calcularFiniquito` (`:29`); admite `?ajustes=` para simular `ajustes_finales` SIN persistir (`:81-82`).
4. Reporta si ya hay finiquito (`SELECT * FROM finiquitos`, `:84`) y si hay bitácora abierta (`SELECT 1 FROM bitacora_aperturas`, `:85`), y devuelve `{ contrato, desglose, tiene_bitacora, finiquito, nota_legal }`.

*Cálculo del saldo — `calcularFiniquito` (`finiquito.controller.js:29`):*
- (A) `Σ neto` y `Σ amortizacion` de `estimaciones WHERE estado IN ('autorizada','pagada')` (`:33-36`). El neto NO se recalcula: reusa el neto ya cuadrado de la carátula.
- (B) `Σ importe` de `pagos` del contrato (`:40-41`).
- (C) `anticipo = monto × anticipo_pct/100`; `anticipo_no_amortizado = max(0, anticipo − amortización aplicada)` (`:44-45`, art. 143).
- (D) `importe_real_ejecutado = Σ (concepto_avance.cantidad × contrato_conceptos.pu)` — informativo (`:47-51`, art. 170 fr. IV; NO entra al saldo).
- **Saldo:** `saldo = importe_neto_aprobado − total_pagado − anticipo_no_amortizado − ajustes_finales` (`:54`). `a_favor_de`: `'contratista'` si `saldo > 0.005`, `'dependencia'` si `< −0.005`, `'ninguno'` en cero (`:55`).

*Cierre formal — POST `/api/finiquito/contrato/:id` → `finiquito.controller.js:98 cerrarFiniquito` (transaccional):*
1. `BEGIN` + `SELECT ... FOR UPDATE` sobre el contrato (serializa el cierre, `:109`).
2. Autoridad: dependencia / residente asignado / creador (`:113`), si no → ROLLBACK + 403 (`:114`).
3. Idempotencia/append-only: si `estado === 'cerrado'` → 409 (`:116`); si ya existe fila en `finiquitos` → 409 (`:117-118`).
4. Exige **bitácora abierta** (`SELECT id FROM bitacora_aperturas`, `:120`) → 409 si no hay (`:121`), porque el finiquito ES una nota de bitácora.
5. Recalcula el desglose con el `client` de la transacción (`:123`).
6. Asienta la **nota de bitácora** tipo `'finiquito'` con `insertarNotaAtomica` (`:139`), emisor = `contrato.residente_id || req.user.id` (art. 53), con redacción art. 170: importe real ejecutado, neto autorizado, pagado, anticipo no amortizado, ajustes, saldo y a-favor-de, observaciones y la cláusula de extinción art. 172 (`:131-138`).
7. `INSERT INTO finiquitos (...)` con todos los componentes del saldo + `nota_id` + `elaborado_por = req.user.id` (`:145-151`).
8. `UPDATE contratos SET estado = 'cerrado', cerrado_en = NOW()` (`:154`).
9. `COMMIT` y responde 201 con `{ ok, finiquito, desglose, nota:{id,numero,tipo}, contrato:{id,folio,estado:'cerrado'} }` (`:157-161`).

*El gate de "contrato cerrado = solo lectura" (transversal):* helper `backend/src/lib/gateCierre.js` (`contratoCerrado(db, contratoId)` lee `contratos.estado === 'cerrado'`; `msgCerrado(accion)` arma el mensaje). Aplicado HOY en:
- **Avance físico:** `trabajos.controller.js:250` (registrar) y `:391` (corregir).
- **Roster / sustitución de personas:** `roster.controller.js:127`.
- **Convenios:** `convenios.controller.js:166` (registrar) y `:392` (autorizar).
- **Minutas / visitas:** `minutas.controller.js:59` (minuta) y `:161` (visita).
- **Garantías / endosos:** `garantias.controller.js:89` (garantía) y `:147` (endoso).
- **Notas de bitácora:** `bitacora.controller.js:563`.
- **Estimaciones (ciclo):** `estimaciones-ciclo.controller.js:27 gateContratoCerrado` aplicado en presentar (`:159`), observaciones (`:347`, `:382`), turnar (`:421`), autorizar (`:489`), rechazar (`:564`), reingresar (`:655`).
- **Integración de estimación (core congelado):** `estimaciones.controller.js:142` bloquea integrar.
- **Excepción deliberada — pagos:** `pagos.controller.js` NO llama el gate; pagar una estimación ya autorizada antes del cierre SÍ procede (el finiquito la descuenta como saldo), documentado en `gateCierre.js:12-13`.

*Front:* `Finiquito.jsx` (pantalla de HU-24): banner de contrato activo, desglose en vivo, input de `ajustes_finales` (`:189`), confirmación en dos pasos (`:213`, `:221`) y documento imprimible art. 170 (`DocumentoFiniquito`, `:36`). `AmbienteFiniquito.jsx` es un cascarón read-only de 7 bloques (`/contratos/cierre`) que recorre prerrequisitos (bitácora, estimaciones, pagos, saldo) y DELEGA el POST a HU-24 (no ejecuta `cerrarFiniquito`).

**3. Disparadores y precondiciones**
- **Bitácora abierta** (`bitacora_aperturas` del contrato): validada **server-side** (`finiquito.controller.js:120-121`, 409) y reflejada en el front (`Finiquito.jsx:203` aviso + botón deshabilitado `:213`; `AmbienteFiniquito.jsx:111` bloque candado).
- **Contrato aún 'vigente'** (no cerrado) y **sin finiquito previo**: server-side (`:116-118`), append-only / 1 por contrato (UNIQUE en `finiquitos.contrato_id`, schema `:1819`).
- **Autoridad** dependencia/residente/creador: server-side (`:113`).
- **Acceso por participación** para preparar (GET): server-side (`:79`).
- **No exige estimaciones ni pagos previos:** el saldo se deriva de lo que haya (puede cerrarse con saldo cero). No hay precondición de "todas las estimaciones pagadas" ni de garantía de vicios ocultos cargada — el documento solo MENCIONA la subsistencia de art. 66 (`Finiquito.jsx:71`).

**4. Criterio de éxito observable** (cómo lo verifica el profe sin llenar todo)
- **GENERA un registro único en `finiquitos`** (1 fila, UNIQUE por contrato) con saldo, `a_favor_de`, todos los componentes y `elaborado_por`. NO queda con datos vacíos: `importe_neto_aprobado`, `total_pagado`, `anticipo_no_amortizado`, `saldo`, `a_favor_de` son `NOT NULL` (schema `:1820-1825`).
- **GENERA una nota de bitácora** tipo `'finiquito'` (con número de folio) ligada por `nota_id`; el profe la ve en la bitácora (HU-10) con la relación de importes y la cláusula de extinción.
- **CAMBIA de estado el contrato: vigente → 'cerrado'** y sella `cerrado_en` con la hora del cierre.
- **El sistema dice a favor de quién** queda el saldo (contratista paga / dependencia reintegra / cero) en texto, no solo número.
- **El contrato cerrado queda en SOLO LECTURA:** intentar después una nota / avance / estimación / convenio / minuta / garantía / sustitución devuelve 409 (ver punto 2). El finiquito es inalterable (trigger `trg_finiquito_inmutable`, schema `:1849`).
- Respuesta exitosa: HTTP **201** con `contrato.estado === 'cerrado'` y `nota.numero`.

**5. Qué genera al fallar**
- id inválido → **400** `"contrato inválido"` (`:100`).
- Contrato inexistente → **404** `"Contrato no encontrado"` (`:110`).
- Sin autoridad → **403** `"Solo la dependencia o el residente asignado puede elaborar el finiquito"` (`:114`).
- Ya cerrado → **409** `"El contrato ya está cerrado (finiquito elaborado)"` (`:116`).
- Ya tiene finiquito → **409** `"Este contrato ya tiene finiquito"` (`:118`).
- Sin bitácora abierta → **409** `"Abre la bitácora del contrato antes de elaborar el finiquito (el finiquito se asienta como nota de bitácora)"` (`:121`).
- Excepción no controlada → **500** `"Error interno"` con ROLLBACK (`:166-168`).
- **Solo-lectura tras cierre:** cualquier acto nuevo devuelve **409** con el patrón `msgCerrado` → `"El contrato ya está cerrado (finiquito elaborado); <acción concreta>. El saldo se liquida por el finiquito (art. 64 LOPSRM)."` (p.ej. `"…no se registra avance…"`, `"…no se emiten notas…"`, `"…no se registran convenios…"`). Para estimaciones el mensaje equivalente sale de `gateContratoCerrado` (`estimaciones-ciclo.controller.js:29`).
- Front: el toast muestra el texto del 409/403 tal cual (`Finiquito.jsx:140-142`).

**6. ¿Cambió de comportamiento?** **SÍ.**
- **Antes:** el finiquito existía y cerraba el contrato, pero el estado `'cerrado'` solo bloqueaba INTEGRAR estimaciones y PAGAR; el resto de actos (nota, minuta, avance, convenio, garantía, roster) seguían aceptándose en un contrato cerrado — **brecha #3🔴 reportada el 22-jun**.
- **Ahora:** se creó `lib/gateCierre.js` (helper `contratoCerrado` + `msgCerrado`) y se aplicó en **8 dominios** (avance, roster, convenios+autorización, minutas, visitas, garantías, endosos, notas) y en **todo el ciclo de estimación** (presentar/observar/turnar/autorizar/rechazar/reingresar). Esto **cumple lo que el profe pidió el 22-jun**: "un contrato cerrado queda en SOLO LECTURA (no acepta nota/avance/estimación/convenio)". La excepción de pagos es deliberada y está documentada (art. 64: el saldo se liquida por el finiquito).
- **Saldo server-side:** ya estaba y se conserva (`calcularFiniquito`); cumple el requisito del profe.
- **Documento art. 170:** existe como vista imprimible (`Finiquito.jsx:36 DocumentoFiniquito`).
- **BRECHAS que quedan (para Maiki):**
  - **El gate de avance/notas/etc. usa `contratoCerrado` que SOLO lee `estado='cerrado'`; NO usa `FOR UPDATE`.** No es transaccional con la lectura del recurso, pero el cierre sí toma `FOR UPDATE` sobre el contrato, así que el riesgo de carrera es bajo. [validar] si se exige atomicidad estricta.
  - **El "documento art. 170" no se genera/persiste como entregable formal** (binario/PDF en el expediente); es solo una vista imprimible en pantalla. Si el profe quiere el acta de extinción (art. 172) como documento subido/archivado, **falta**. El código solo asienta la cláusula de extinción en la nota.
  - **HU-24 no está en `permisos.js`** (no hay matriz HU×rol). El gate de rol es `SoloRol` + autoridad server-side. Si el profe exige que aparezca formalmente entre las HU, Maiki debe registrarla.
  - **`ajustes_finales` sigue parametrizable con default 0** (deductivas finales / sobrecosto / 5-al-millar pendiente): el profe AÚN no confirmó qué conceptos entran al saldo final → `[validar]`.
  - **No hay precondición de garantía de vicios ocultos** (art. 66) ni de "obra recibida" antes de cerrar; el documento solo la menciona. Si el profe lo exige como gate, **falta**.

**7. Citas legales**
- **Cierre y finiquito:** LOPSRM **art. 64** (elaborar el finiquito, créditos a favor/en contra, saldo resultante, poner a disposición el pago o solicitar reintegro, acta que extingue derechos y obligaciones) — base del solo-lectura. Verificado en comentarios del controller (`:2-7`) y schema (`:1796-1800`).
- **Procedimiento de finiquito:** RLOPSRM **Sección IX, arts. 168-172** — 168 (finiquito), **170** (contenido mínimo del documento), **171** (saldos a favor de cada parte), **172** (acta de extinción). (`finiquito.controller.js:5-7`, schema `:1799-1800`).
- **Saldo / estimaciones autorizadas:** LOPSRM **art. 54** (importe neto estimado y autorizado, `:31`).
- **Anticipo no amortizado:** RLOPSRM **art. 143** (`:43`, `:1822`).
- **Importe real ejecutado:** RLOPSRM **art. 170 fr. IV** (informativo, `:46`, `Finiquito.jsx:61`).
- **Emisor de la nota = residente:** LOPSRM **art. 53** (`:125`, schema `:1835`).
- **Garantía por vicios ocultos subsistente:** LOPSRM **art. 66** (solo mencionada en el documento, `Finiquito.jsx:71`) — `[validar]` si debe ser gate.
- **`ajustes_finales`:** sin artículo fijo; criterio del equipo, default 0 → **`[validar]`** con el profe (`:19-20`).


---

*Insumos generados en sesión autónoma 2026-06-23. Solo lectura. No se modificó código. Las brechas marcadas son lo que el profe pidió y el sistema aún no refleja al 100%.*
