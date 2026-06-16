# SIGECOP — Historias de Usuario ACTUALIZADAS (12-jun-2026)

> **Reemplaza** (no borra) a `Historias_Usuario.xlsx` como la versión que refleja lo que el sistema
> **HACE HOY**. El xlsx original queda intacto. Cada criterio se leyó del código/UI real (auditoría
> con evidencia `archivo:línea`, ver `AUDITORIA_COHERENCIA_HU.md`). Generado en sesión autónoma.
>
> **Reglas respetadas:** los números HU-00..HU-21 y las historias Registro/Por Firmar **conservan su
> identidad**. Las funcionalidades construidas **sin ficha** reciben el siguiente número libre:
> **HU-22** (sustitución de personas/roster) y **HU-23** (catálogo de empresas).

---

## Índice

| ID | Título | Rol que ejecuta |
|---|---|---|
| HU-00 | Inicio de sesion por rol | Transversal (no se filtra por permisos |
| HU-01 | Alta de contratos | residente (nivel 'E', ejecuta) |
| HU-02 | Registro de fianzas y garantías | Dependencia ejecuta (nivel 'E') |
| HU-03 | Trámite y aplicación de convenios modificatorios | Dependencia (permisos |
| HU-04 | Consulta integrada del expediente contractual | residente = 'E' (ejecutor real) |
| HU-05 | Programa y curva de avance | residente='E' (ejecuta) |
| HU-06 | Registro de trabajos terminados por periodo | contratista (nivel 'E' en permisos |
| HU-07 | Alertas de atraso por concepto | Residente (nivel 'E', el unico que ejecuta: asienta el atras |
| HU-08 | Apertura formal de la bitácora del contrato | residente = 'E' (ejecuta la apertura) |
| HU-09 | Emisión y respuesta de notas tipificadas con firma | permisos |
| HU-10 | Consulta y búsqueda de notas de bitácora | Ejecuta (nivel 'E'): residente |
| HU-11 | Minutas, visitas y acuerdos (Registro de minutas, agenda de visitas y consulta de acuerdos) | Residente = ejecutor (nivel 'E') |
| HU-12 | Apertura del periodo e integración de la estimación | contratista (nivel 'E' en permisos |
| HU-13 | Envio/presentacion de la estimacion | Contratista (nivel 'E' en permisos |
| HU-14 | Historial de estimaciones del contrato | residente = 'E' (ejecutor) |
| HU-15 | Recepción, revisión técnica y autorización de la estimación | Ejecutan (nivel 'E') residente y supervision |
| HU-16 | Reingreso de estimación tras rechazo | contratista (nivel 'E' = ejecuta) en permisos |
| HU-17 | Tablero de estimaciones aceptadas y en proceso | residente (nivel 'E' en permisos |
| HU-18 | Portafolio ejecutivo con semaforos | dependencia es el unico ejecutor (nivel 'E') segun permisos |
| HU-19 | Exportación de los 7 reportes definidos del contrato | residente = 'E' (único ejecutor: descarga/exporta) |
| HU-20 | Tránsito a pago: carga de soportes y verificación de suficiencia presupuestal | Ejecutan (nivel 'E') contratista y finanzas (permisos |
| HU-21 | Registro del pago efectuado | finanzas = 'E' (UNICO ejecutor) |
| Registro | Registro de usuario con aprobacion | Solicitante (auto-registro PUBLICO, sin sesion, cualquier pe |
| Por Firmar | Firma de aperturas de bitácora pendientes (bandeja "Por firmar") | No está en permisos |
| HU-22 | Sustitucion de personas del roster (art. 125 fr. I g RLOPSRM) | dependencia y residente (App |
| HU-23 | Catalogo de empresas (Oleada O3) | Funcionalidad SIN gate de rol en permisos |

---

## HU-00 · Inicio de sesion por rol

**Rol real (quién ejecuta):** Transversal (no se filtra por permisos.js). Cualquier usuario activo de los 5 roles (residente, contratista, supervision, dependencia, finanzas) se autentica por el MISMO endpoint /auth/login. El rol NO lo selecciona el usuario al entrar: sale de la columna 'rol' del registro en BD (auth.controller.js:31,54,61). permisos.js no lista HU-00 (es transversal, comentario permisos.js:37); el rol gobierna el resto de las HU vias nivelDe().

**Historia:**
- **Como** usuario registrado y APROBADO del sistema (residente, contratista, supervision, dependencia o finanzas)
- **Deseo** iniciar sesion con mi correo y contrasena (sin elegir mi rol), de modo que el sistema obtenga mi rol desde mi cuenta en la base de datos, me persista la sesion (token JWT) y me muestre solo las HU/opciones que mi rol permite
- **A fin de** proteger la informacion del contrato y que cada accion formal quede asociada a mi identidad (id/nombre) y fecha-hora tomadas del token, no de lo que envie el cliente

**Criterios de aceptación (comportamiento actual del sistema):**
1. POST /auth/login recibe SOLO {email, password}: si falta alguno responde 400; si el correo no existe o la contrasena no coincide (bcrypt) responde 401 'Credenciales invalidas'; el frontend muestra el error en el banner auth-mensaje sin entrar.
2. Si la cuenta existe pero su estado no es 'activo', el login responde 403 con mensaje distinto para 'pendiente' y 'rechazado' (las altas nuevas no entran hasta que la dependencia las aprueba).
3. El rol NO se selecciona al entrar: se lee de la columna 'rol' del usuario y se firma en el JWT junto con id y nombre; el rol gobierna el acceso a cada HU via permisos.js, y App.jsx bloquea tanto el menu como el deep-link a una HU sin nivel para ese rol.
4. Tras un login exitoso la sesion se guarda en localStorage (token+user) y sobrevive a un refresco; 'Salir' la limpia. El token expira (8h por defecto) y un token invalido/expirado responde 401.
5. Toda accion formal (p.ej. notas de bitacora) registra al actor con req.user.id del JWT (nunca del body) y la fecha-hora con NOW() server-side.

**Fundamento legal:** art. 123 RLOPSRM (el nombre completo del actor debe quedar asentado; por eso el registro exige nombre + apellido[s])

**Pendientes / [validar profe]:**
- La ficha vieja pedia 'no permite continuar con campos vacios': hoy ese bloqueo es server-side (400). Decidir si se quiere ademas un candado de cliente (required / boton deshabilitado) o se acepta el comportamiento actual. [validar profe/Maiki]
- Asimetria de normalizacion de email: el registro guarda el correo en minusculas, pero el login lo busca tal cual se teclea. Confirmar si el login debe normalizar igual para evitar fallos por mayusculas. [validar Maiki]
- Gate de pago PERMISIVO mencionado en el contexto del flujo no es de HU-00, pero la deduccion de rol que habilita finanzas si lo es: confirmar que finanzas no requiere reglas extra de acceso. [validar profe]

---

## HU-01 · Alta de contratos

**Rol real (quién ejecuta):** residente (nivel 'E', ejecuta). El backend lo blinda con requireRole('residente') en POST /api/contratos. contratista/supervision/dependencia = 'C' (solo consulta); finanzas = sin acceso. Evidencia: frontend/src/data/permisos.js:12 y backend/src/routes/contratos.routes.js:45.

**Historia:**
- **Como** residente de obra
- **Deseo** dar de alta un contrato en un wizard de 7 pasos (datos generales, catalogo de conceptos, programa de obra como matriz concepto x periodo, datos juridicos, garantias/penalizaciones/% de anticipo, plan de amortizacion del anticipo y PDF firmado), donde el monto se DERIVA del catalogo y casi todo se valida en cliente y se revalida server-side en una sola transaccion
- **A fin de** tener el expediente del contrato en linea, integro y consultable solo por los actores que son parte del contrato

**Criterios de aceptación (comportamiento actual del sistema):**
1. El alta crea, en UNA sola transaccion (todo o nada), la cabecera del contrato + sus bloques hijos (conceptos, programa de obra como matriz concepto x periodo, garantias, plan de amortizacion y contrato_roster inicial). El folio es unico (un folio repetido devuelve 409). Solo el rol residente puede crear (requireRole('residente')).
2. El monto del contrato NO se captura: se deriva server-side como Sigma ROUND(cantidad x pu, 2) sobre el catalogo (sin IVA), con cuadre EXACTO al centavo. Cada concepto exige clave unica capturada por el usuario, descripcion, unidad, cantidad>0 y precio unitario>0. Sin catalogo (precio alzado) se captura el monto a mano (>0).
3. La fecha de termino se deriva server-side de inicio + (plazo-1) (no se confia en el cliente). El programa de obra es una matriz concepto x periodo (ciclo mensual o quincenal) cuyos periodos genera el backend; cada concepto debe sumar EXACTAMENTE lo contratado (cuadre al 100%, validado en SQL) y nada queda fuera del plazo.
4. El equipo se liga a cuentas reales validadas por rol y estado: superintendente (cuenta contratista aprobada, obligatorio) y dependencia (cuenta dependencia aprobada, obligatorio); supervision opcional. Las garantias obligatorias se exigen: cumplimiento siempre y anticipo si %anticipo>0, cada una con monto>0, monto <= monto del contrato y vigencia no vencida.
5. El PDF firmado del contrato es obligatorio para registrar y, una vez ligado, es inmutable (no se reemplaza, 409); solo lo sube el residente asignado y solo lo consultan los actores que son parte. Si %anticipo supera el 30% se exige ademas un segundo PDF de autorizacion del anticipo (umbral a validar con el profe). Con anticipo>0 se captura un plan de amortizacion por periodo que (a) suma EXACTAMENTE el anticipo al centavo (art. 138 parr. 3 RLOPSRM) y (b) **se liga al programa de obra (FASE 2, art. 143 fr. I RLOPSRM): ningun periodo amortiza mas que su importe programado y todo periodo con obra programada amortiza algo** (rechaza el plan 0/0/todo-al-ultimo). El default precargado es PROPORCIONAL al programa; validado en cliente (validarPaso) y server-side (crearContrato).

**Fundamento legal:** art. 45 fr. IX RLOPSRM (el catalogo con sus importes ES el presupuesto: monto derivado); art. 45 ap. A fr. X RLOPSRM (programa de obra conforme al catalogo, del total de los conceptos); art. 52 LOPSRM (programa como base para medir el avance / cuadre 100%); art. 54 LOPSRM (ciclo de estimacion / periodos); art. 118 RLOPSRM (Sigma planeado por concepto <= contratado); art. 50 fr. IV LOPSRM (anticipo > umbral requiere autorizacion escrita del titular); art. 139 RLOPSRM (anticipo > 50% se informa a la SFP); art. 50 fr. V LOPSRM (anticipo 100% solo en plurianual que inicia en el ultimo trimestre); art. 138 parr. 3 RLOPSRM (programa/forma de aplicacion del anticipo = el plan; Sigma plan = anticipo) y art. 143 fr. I RLOPSRM (amortizacion PROPORCIONAL del anticipo, ligada al programa — FASE 2; saldo a la estimacion final, art. 143 fr. III-d); art. 138 y 139 RLOPSRM (penas convencionales por atraso); art. 191 LFD (retencion del 5 al millar, citada en la vista); art. 47 y art. 48 fr. I y II LOPSRM (fianzas de anticipo y cumplimiento obligatorias); art. 46 fr. I y IV LOPSRM y RLOPSRM art. 61 (datos juridicos: firmante de la dependencia y representante legal del contratista); art. 123 RLOPSRM (la dependencia no firma la bitacora -> no entra al roster); art. 125 RLOPSRM (roster historico / sustitucion-no-borrar sembrado desde el alta)

**Pendientes / [validar profe]:**
- El umbral del 30% que dispara el PDF de autorizacion del anticipo: el valor exacto y su fundamento legal del UMBRAL estan marcados [validar profe] en el codigo (la exigencia de autorizacion escrita se apoya en art.50 fr.IV LOPSRM, pero el 30 no se asume de la ley).
- El plan de amortizacion es editable (con las reglas R2/R3 de FASE 2) y se persiste, pero la CARATULA de estimacion (G2) todavia amortiza proporcional al avance, no segun el plan capturado: 'Fase B pendiente de validar con el profe'. Tambien [validar profe]: si debe exigirse proporcionalidad ESTRICTA (art. 143 fr. I) en vez de la banda editable actual (R2/R3).
- La cedula profesional como dato juridico obligatorio se exige 'por decision de la Fundacion' [validar con el profe].
- El fundamento de exigir el PDF firmado para que el contrato exista/se formalice lo confirma el profe; el codigo NO asume numero de articulo para esa regla.
- El % de pena por atraso (penaConvencionalPct) y su tasa estan marcados [validar tasa con el profe].
- La ficha vieja menciona 'penalizaciones aplicables' como bloque: en el sistema actual se reduce a un % de pena por atraso opcional + avisos en la vista (5 al millar art.191 LFD, deductivas art.46 Bis); no hay un editor de penalizaciones por concepto.

---

## HU-02 · Registro de fianzas y garantías

**Rol real (quién ejecuta):** Dependencia ejecuta (nivel 'E'); Residente y Finanzas solo consultan (nivel 'C'); Contratista y Supervisión sin acceso (null). Evidencia: frontend/src/data/permisos.js:13 — 'HU-02': { residente:'C', contratista:null, supervision:null, dependencia:'E', finanzas:'C' }. Confirmado por hu-02-registro-fianzas.spec.js (dependencia ve botón Agregar; residente/finanzas ven aviso solo-consulta; contratista/supervisión no ven el enlace).

**Historia:**
- **Como** dependencia (ejecuta; residente y finanzas solo consultan; contratista y supervisión sin acceso)
- **Deseo** capturar y editar en una pantalla las pólizas de fianza del contrato (tipo, afianzadora, número de póliza, monto, fecha de emisión y de vencimiento, y el nombre del archivo PDF), ver para cada una un badge de color y contadores según los días que faltan para su vencimiento, calculados en el navegador
- **A fin de** tener a la vista el estado de vigencia de las garantías; nota: en el estado ACTUAL esta pantalla opera sobre una lista de demostración en memoria, no sobre el contrato real ni el backend

**Criterios de aceptación (comportamiento actual del sistema):**
1. La pantalla lista pólizas con tipo, folio, afianzadora, monto y fecha de vencimiento, y permite Agregar/Editar pólizas mediante un modal cuyo botón Registrar/Guardar se habilita solo si están todos los campos obligatorios (RegistroFianzas.jsx:325-332); los cambios viven en memoria (useState) y se pierden al recargar — no hay llamada a backend.
2. Cada fila muestra un badge y data-badge de color según días al vencimiento con umbrales FIJOS en código: rojo si vencida o ≤5 días, ámbar ≤15, amarillo ≤30, verde >30 (badgePorDias, RegistroFianzas.jsx:43-77); arriba hay tarjetas con el conteo de pólizas ≤5/≤15/≤30 días (líneas 366-414). No hay envío de alerta ni umbral configurable.
3. El botón 'Ver PDF' abre un modal placeholder que muestra el NOMBRE del archivo, no el documento (ModalVerPdf, RegistroFianzas.jsx:228-267); el PDF de la póliza no se sube ni se almacena en el backend.
4. Solo dependencia ve el botón 'Agregar nueva póliza' y los de Editar; residente y finanzas ven la pantalla en solo-consulta; contratista y supervisión no tienen acceso (useVistaHU('HU-02') + permisos.js:13).
5. La persistencia REAL de garantías ocurre en el alta del contrato (HU-01): se guardan en contrato_garantias y se exponen read-only en el expediente (HU-04); esta pantalla HU-02 NO está conectada a esos datos.

**Fundamento legal:** Art. 48 LOPSRM (pie de página de la pantalla, RegistroFianzas.jsx:507-509); Art. 98 fr. I y fr. II RLOPSRM (citados en el alta y en el comentario de schema.sql:967-972 para garantía_endosos; no operativos en HU-02)

**Pendientes / [validar profe]:**
- Conectar la pantalla al backend real: leer contrato_garantias del contrato en sesión y persistir altas/ediciones (hoy todo es dummy en memoria) [validar profe / Maiki].
- Almacenamiento real del PDF de la póliza (no existe columna ni subida); definir storage (mencionado como SRV-02-04 en el placeholder) [validar profe].
- Emisión REAL de alertas de vencimiento (30/15/5) y su 'configurabilidad': hoy son badges/contadores en el navegador con umbrales fijos; no hay motor de notificación en alertas.controller.js [validar profe].
- Historial de fianzas y endosos por modificatorios (parte de la HISTORIA): la tabla garantia_endosos existe en schema con trigger de inmutabilidad pero NO está cableada (sin controller/route); decidir si se implementa el ciclo de endosos (art.98 fr.II / art.99 RLOPSRM) [validar profe].
- Discrepancia de rol con la HISTORIA: la ficha dice 'Como dependencia', y el sistema lo respeta (dependencia='E'); confirmar que residente/finanzas deban quedar en solo-consulta y contratista/supervisión sin acceso.

---

## HU-03 · Trámite y aplicación de convenios modificatorios

**Rol real (quién ejecuta):** Dependencia (permisos.js:14 → HU-03 dependencia:'E'; residente/contratista/supervisión:'C' solo-consulta; finanzas:null sin acceso). PERO la 2.ª barrera del backend es MÁS amplia: convenios.controller.js:142 permite registrar a dependencia OR residente_id del contrato OR created_by del contrato. El spec confirma que un contratista recibe 403 (hu-03-convenios.spec.js:131-152).

**Historia:**
- **Como** dependencia (o el residente asignado / quien creó el contrato)
- **Deseo** registrar un convenio modificatorio del contrato de tipo monto, plazo, programa o mixto: capturo el tipo, el motivo (dictamen técnico) y, según el tipo, el catálogo+programa nuevos completos (el sistema deriva el monto de Σ ROUND(cantidad×P.U.,2), no lo tecleo) y/o el nuevo plazo; al registrarse, si toca el programa el sistema crea una versión nueva inmutable (snapshot de catálogo y celdas) y supersede la anterior, sincroniza el monto/plazo vigente del contrato, asienta una nota automática en la bitácora y clasifica la variación marcando flags de revisión SFP (>25%) y de derecho a ajuste de costos (>50%)
- **A fin de** documentar formalmente los cambios al contrato conforme al art. 59 LOPSRM (y dejar visible el derecho del art. 59 Bis cuando aplica), preservar el histórico inmutable de versiones del programa y poder consultar qué cambió, cuándo, por quién y por qué

**Criterios de aceptación (comportamiento actual del sistema):**
1. Solo dependencia, el residente asignado o el creador del contrato puede registrar convenios (las demás partes ven solo-consulta); el backend responde 403 a cualquier otro rol aunque se llame al endpoint directamente.
2. Al registrar un convenio que toca el programa (monto/programa/mixto) se crea una versión NUEVA inmutable del programa (catálogo + celdas), se marca vigente y se supersede la anterior sin alterarla; un convenio de PLAZO puro actualiza el plazo y la fecha de término del contrato pero no crea versión de programa.
3. El monto y los porcentajes de variación los deriva el sistema server-side (Σ ROUND(cantidad×P.U.,2), al centavo); el usuario nunca teclea el monto. El sistema rechaza (400) si el catálogo nuevo no incluye todos los conceptos, tiene claves repetidas, descuadra el programa, reduce un concepto por debajo de lo ya estimado (art. 118 RLOPSRM) o la variación de monto/plazo supera el guardrail parametrizable (default 25%).
4. Cada convenio queda registrado de forma inmutable con folio (capturado o CM-NNN), tipo, motivo/dictamen (art. 99 RLOPSRM), fecha/hora, autor (del JWT) y los flags requiere_revision_sfp (>25%, art. 102 RLOPSRM) y requiere_ajuste_costos (>50%, art. 59 Bis); no se edita ni se anula (corregir = convenio nuevo).
5. Al registrar el convenio se asienta una nota automática en la bitácora del contrato (en vivo si está abierta, diferida si aún no); las versiones del programa se pueden consultar leyendo su snapshot concepto×periodo.

**Fundamento legal:** art. 59 LOPSRM; art. 59 Bis LOPSRM; art. 99 RLOPSRM; art. 102 RLOPSRM; art. 118 RLOPSRM; art. 123 fr. III RLOPSRM; art. 45 fr. IX RLOPSRM

**Pendientes / [validar profe]:**
- ENDOSOS DE FIANZAS: la ficha vieja pedía que el modificatorio aplicara y registrara los endosos correspondientes a las fianzas; HU-03 NO lo construye (el controller nunca toca garantia_endosos). La tabla y la FK garantia_endosos.convenio_id existen (HU-02) pero no hay generación automática de endoso al registrar el convenio. Validar con el profe si HU-03 debe disparar el endoso o si queda como integración futura HU-02↔HU-03.
- fundamento art.59 vs art.59 Bis: el sistema funda SIEMPRE el convenio en art.59 y trata el 59 Bis como derecho adicional (flag), NO como régimen alternativo. La ficha pedía 'indicar si se rige por 59 o 59 Bis'. Confirmar que la interpretación flag (no toggle de fundamento) es la correcta legalmente.
- Autoridad que registra: comentario controller:140-143 marca '[validar con el profe]' que dependencia O residente O creador pueden registrar; la matriz frontend (permisos.js) solo da nivel 'E' a dependencia. Confirmar el conjunto exacto de roles autorizados.
- Emisor de la nota automática de bitácora = residente del contrato (O-PROFE), marcado '[validar profe]' en controller:235-244.
- Guardrail del 25% (CONVENIO_LIMITE_VARIACION_PCT): es decisión de configuración, no tope legal del art.59 (que en la reforma DOF 14-11-2025 no fija tope numérico). Confirmar valor/aplicabilidad con el profe.
- Regeneración de periodos al cambiar el plazo: hoy el convenio de plazo conserva los periodos vigentes (no los re-mapea); follow-on declarado en controller:194-195.

---

## HU-04 · Consulta integrada del expediente contractual

**Rol real (quién ejecuta):** residente = 'E' (ejecutor real). contratista/supervision/dependencia = 'C' (solo consulta). finanzas = null (sin acceso). Fuente: frontend/src/data/permisos.js:15. El acotamiento real "actores parte del contrato" es server-side en GET /contratos/:id (backend/src/controllers/contratos.controller.js:522-523 → 403 esParteOSupervision; ROLES_VEN_TODO en :475). Coincide con la ficha (residente), pero la ficha no menciona que contratista/supervision/dependencia consultan en solo-lectura.

**Historia:**
- **Como** residente (ejecuta); contratista, supervision y dependencia consultan en solo-lectura; finanzas sin acceso
- **Deseo** consultar en una sola vista el expediente completo del contrato, integrado en 9 bloques (configuracion con superintendente vigente, catalogo de conceptos, programa de obra, fianzas, plan de amortizacion del anticipo, documentos juridicos, roster/sustituciones de personas, convenios modificatorios y resumen de estimaciones), con un buscador por campo de logica Y y exportacion del expediente completo a un solo PDF
- **A fin de** obtener toda la informacion del contrato sin entrar a cada modulo, y poder imprimir/exportar un documento consolidado del expediente

**Criterios de aceptación (comportamiento actual del sistema):**
1. El expediente carga al seleccionar un contrato y muestra en una sola vista 9 bloques (configuracion, catalogo, programa, fianzas, plan de amortizacion, juridicos, roster/sustituciones, convenios, resumen de estimaciones); el acceso esta acotado server-side a quien es parte o supervision del contrato (403 en otro caso), y finanzas no ve la HU.
2. El bloque de configuracion muestra el superintendente VIGENTE tomado del roster (art.125), con fallback al snapshot de texto del alta.
3. El buscador filtra los bloques por campo (folio, contratista, empresa, objeto, periodo o tipo de documento) con logica Y por palabras; los bloques que no coinciden se ocultan SOLO en pantalla, no en el PDF.
4. El expediente completo se exporta como un solo PDF mediante 'Exportar expediente (PDF)' (impresion consolidada del navegador): oculta el chrome y fuerza abiertos los bloques colapsados u ocultos por busqueda. NO existe descarga individual por bloque.
5. El resumen de estimaciones lista N.º, periodo, estado etiquetado del ciclo y el total neto sumado de todas las estimaciones del contrato.

**Fundamento legal:** art. 45 fr. IX RLOPSRM (clave del concepto en el catalogo); art. 59 LOPSRM / art. 99 RLOPSRM (convenios modificatorios); art. 125 RLOPSRM (sustitucion de personas / roster); art. 138 fr. I RLOPSRM (plan de amortizacion del anticipo); art. 123 fr. III RLOPSRM (nota de bitacora asociada a sustitucion/convenio)

**Pendientes / [validar profe]:**
- La ficha vieja pedia 'descarga individual por bloque'; el profe lo cambio (O9) a un unico PDF consolidado. Confirmar con el profe que la descarga por documento individual queda DEFINITIVAMENTE fuera de alcance.
- Confirmar si el bloque 'documentos juridicos' (firmante dependencia, representante legal, poder notarial, equipo) cubre lo que la ficha entendia por 'documentos juridicos', o si se esperaba adjuntar archivos juridicos descargables (no implementado).
- El buscador aplica la logica Y entre PALABRAS dentro de un mismo campo; la ficha decia 'filtra por folio, contratista, objeto, periodo o tipo'. Validar si se esperaba combinar varios campos simultaneamente.
- Validar el alcance ampliado (4 bloques nuevos: amortizacion, roster, convenios, estimaciones) frente a la ficha original de 5 bloques.

---

## HU-05 · Programa y curva de avance

**Rol real (quién ejecuta):** residente='E' (ejecuta). contratista/supervision/dependencia='C' (solo consulta, ven aviso solo-lectura). finanzas=null (sin acceso: no aparece en sidebar ni Inicio). Evidencia: frontend/src/data/permisos.js:16 y spec hu-05-curva-avance.spec.js:10,171-181. Coincide con la ficha vieja (como=residente).

**Historia:**
- **Como** residente (ejecuta); contratista, supervision y dependencia consultan en solo lectura; finanzas sin acceso
- **Deseo** seleccionar un contrato y visualizar su programa de obra como matriz concepto x periodo (tipo Gantt con codigo de color de 4 estados: ejecutado, atraso, por-venir, no-programado), la curva S con tres series acumuladas (programado, ejecutado, financiero) que arrancan en 0% al inicio del contrato y se cortan en hoy con marcador, KPIs (programado/ejecutado/financiero a hoy y desviacion), un catalogo de conceptos con su % de avance, y filtros por concepto y por rango de periodo (Todo / Ultimos 3 / Ultimo) que recalculan matriz y curvas
- **A fin de** identificar a tiempo desviaciones entre lo planeado, lo ejecutado y lo cobrado para decidir oportunamente

**Criterios de aceptación (comportamiento actual del sistema):**
1. Tras seleccionar un contrato, la matriz concepto x periodo colorea cada celda en 4 estados: ejecutado (verde), atraso=programado vencido sin ejecutar (rojo), por venir (ambar), no programado (gris); incluye leyenda.
2. La curva S grafica 3 series acumuladas en %: programado (llega a 100%), ejecutado y financiero; las 3 parten de un punto Inicio=0% y ejecutado/financiero se detienen en el periodo de hoy (marcador vertical); cada punto muestra tooltip con su valor al pasar el mouse.
3. El filtro por concepto deja una sola fila en matriz/catalogo y recalcula las curvas programado/ejecutado; el filtro por periodo (Todo / Ultimos 3 / Ultimo) recorta columnas y curvas sin alterar los acumulados.
4. El sistema calcula y muestra el % de avance fisico global (Sigma ejecutado / Sigma contratado) en la cabecera y el % por concepto en catalogo y matriz, mas KPIs de programado/ejecutado/financiero a hoy y la desviacion (ejec - prog) con indicador de color.
5. El financiero se calcula a nivel contrato como Sigma pagos.importe con fecha_pago <= corte / monto x100 (no se desglosa por concepto en Etapa 1); todos los calculos derivan de endpoints reales acotados por participacion.

**Pendientes / [validar profe]:**
- El codigo NO cita ningun articulo de ley en esta vista; la ficha vieja tampoco. Confirmar con el profe si la curva S / formula del financiero requiere fundamento legal explicito.
- Financiero a nivel contrato (no por concepto) declarado como alcance Etapa 1 (aviso en CurvaAvance.jsx:523); validar con el profe si se exige desglose por concepto.
- Filtro de periodo por rango discreto (Todo/Ultimos 3/Ultimo) en lugar de un selector libre de periodo: validar si cumple la intencion de 'filtros por periodo' de la ficha.
- Gate de pago / flujo de estimaciones no toca esta HU (es solo visualizacion read-only), pero el financiero depende de pagos registrados aguas abajo; validar coherencia con el flujo reconciliado.
- Definicion de 'atraso' por celda (programado vencido por fin de periodo < hoy sin ejecucion) es interpretacion del sistema; confirmar con el profe si coincide con el criterio de desviacion esperado.

---

## HU-06 · Registro de trabajos terminados por periodo

**Rol real (quién ejecuta):** contratista (nivel 'E' en permisos.js linea 17: contratista:'E'). residente y supervision tienen 'C' (solo consulta). dependencia y finanzas = null (sin acceso). El router exige rol contratista para escribir (trabajos.routes.js:21-23) y permite contratista/residente/supervision para leer (linea 17).

**Historia:**
- **Como** contratista
- **Deseo** registrar por PERIODO del programa la cantidad ejecutada de cada concepto del catalogo, viendo en la misma pantalla el avance acumulado y el porcentaje contra lo contratado, donde cada captura genera automaticamente su nota de bitacora tipo 'avance' (o la difiere si la bitacora aun no esta abierta) y puedo editar o eliminar la captura
- **A fin de** alimentar la curva de avance ejecutado (HU-05) y la integracion de la estimacion con respaldo documental, sin poder registrar mas de lo contratado (art. 118 RLOPSRM)

**Criterios de aceptación (comportamiento actual del sistema):**
1. Al capturar avance debo elegir un CONCEPTO del catalogo y un PERIODO del programa (selector, no fecha libre); periodo_numero es obligatorio y debe existir en el contrato (si no, 400/aviso). La cantidad se redondea a 3 decimales antes de validar/guardar.
2. El sistema acumula el avance ejecutado por concepto (suma de todas las capturas) y muestra Contratada, Ejecutado acumulado y % de avance en la tabla por concepto; en el formulario muestra ademas el desglose programado/ejecutado/disponible del periodo elegido.
3. BLOQUEO (409, art. 118 RLOPSRM): rechaza la captura cuando el acumulado ejecutado total del concepto + la nueva cantidad excede lo contratado. Es el unico bloqueo (con candado FOR UPDATE para concurrencia).
4. AVISO no bloqueante: si el avance excede lo programado del periodo o el concepto no estaba programado, se REGISTRA igual (201) y devuelve un aviso_programa para verificar monto/conceptos (adelantar a precios pactados no requiere convenio).
5. Cada captura con cantidad > 0 genera una nota de bitacora automatica tipo 'avance' ligada al avance; si no hay bitacora abierta, la nota se DIFIERE (nota_id nulo) y se asienta sola al abrir la bitacora. La captura es editable (PATCH) y eliminable (DELETE), revalidando art. 118.
6. Acceso: solo el contratista captura/edita/elimina (nivel E); residente y supervision consultan (nivel C); dependencia y finanzas sin acceso. Acotado por participacion en el contrato (esParteOSupervision); registrado_por sale del JWT.

**Fundamento legal:** art. 118 RLOPSRM (cantidad sobre lo contratado sin orden no es pagable → bloqueo); art. 125 fr. II (la nota automatica del avance se cita asi en JSX:319 y 533); art. 45-A-X RLOPSRM / art. 52 LOPSRM (programa por periodo, citado en JSX:540)

**Pendientes / [validar profe]:**
- La nota automatica se crea SIEMPRE tipo 'avance'; la ficha vieja preveia tambien tipo 'entrega de obra' (NO construido). Confirmar con el profe si basta 'avance'.
- Emisor de la nota = quien registra (contratista). El codigo lo marca [validar] (controller:17, 271).
- Que el AVISO no bloqueante (adelantar a precios pactados sin convenio) sea el comportamiento legal correcto frente al art. 118 / convenios. Es interpretacion O-PROFE registrada en codigo, confirmar.
- Editar la cantidad de un avance NO regenera ni corrige la nota original (limitacion documentada en controller:322-324). Confirmar si es aceptable o requiere nota vinculada nueva (inmutabilidad).

---

## HU-07 · Alertas de atraso por concepto

**Rol real (quién ejecuta):** Residente (nivel 'E', el unico que ejecuta: asienta el atraso en bitacora). Supervision lo ve en nivel 'C' (consulta: tabla visible, sin boton Asentar). Contratista, dependencia y finanzas: null (sin acceso). Fuente: frontend/src/data/permisos.js:18 — 'HU-07': { residente:'E', contratista:null, supervision:'C', dependencia:null, finanzas:null }.

**Historia:**
- **Como** residente (ejecuta) o supervision (consulta) de un contrato
- **Deseo** consultar un panel automatico que, por contrato, liste los conceptos cuyo trabajo ejecutado acumulado va por debajo de lo programado acumulado al periodo en curso, mostrando el deficit en unidades del concepto, y (residente) poder asentar cada atraso como nota en la bitacora
- **A fin de** detectar y dejar constancia formal de los atrasos por concepto sin configurar umbrales ni canales, con un calculo derivado en vivo del programa vigente

**Criterios de aceptación (comportamiento actual del sistema):**
1. Al seleccionar un contrato (acotado por participacion; cuenta ajena -> 403), el panel lista automaticamente SOLO los conceptos con deficit > 0 = programado_acumulado(al periodo vigente, programa vigente) - ejecutado_acumulado(total), en las unidades del concepto, sin umbrales ni porcentajes ni cron.
2. El 'periodo vigente' es el periodo de mayor numero con inicio <= hoy; si el contrato aun no inicia su primer periodo, periodo_actual=null y no se muestra ningun atraso. Un concepto con ejecutado >= programado no aparece, y 'ir adelantado' nunca produce falso atraso.
3. El residente puede 'Asentar en bitacora' un atraso: genera una nota inmutable tipo 'atraso' con folio correlativo; exige bitacora abierta (si no, 409) y que el concepto tenga deficit > 0 ahora (si no, 409). El emisor de la nota es el residente del contrato (art. 53 LOPSRM).
4. La supervision (parte del contrato) ve la tabla en solo lectura, sin boton 'Asentar' (HTTP 403 si lo intenta por API). Contratista, dependencia y finanzas no tienen acceso a la vista ni al badge.
5. Al iniciar sesion, residente y supervision con atrasos ven un aviso in-app (banner en Inicio + numero en la campana) con el conteo de conceptos y contratos con deficit, acotado por participacion; los roles sin acceso a HU-07 no lo ven.

**Fundamento legal:** LOPSRM art. 52 (citado en el contenido de la nota de atraso); RLOPSRM art. 45 ap. A fr. X (citado en el contenido de la nota); RLOPSRM art. 123 (asiento del sistema en bitacora; exige bitacora abierta); LOPSRM art. 53 (emisor de la nota de consecuencia = residente)

**Pendientes / [validar profe]:**
- Toda la HISTORIA original (configurar conceptos a vigilar, umbral de atraso y canal sistema/correo) fue REEMPLAZADA por el profe (O5/P15) por el panel automatico; confirmar que la ficha se reescribe y no se reabre el modelo de configuracion.
- Notificacion por CORREO: no existe; solo aviso in-app. Confirmar con el profe si el canal correo queda descartado para Etapa 1.
- La tabla alerta_atraso del esquema se conserva pero esta MUERTA (sin lecturas/escrituras); decidir si se elimina o se documenta como obsoleta.
- Quien debe ser el emisor de la nota de atraso (hoy se fuerza residente_id por art. 53); validar contra art. 123 fr. III/XII (firmas del roster). [validar profe]
- Articulos citados en la nota (LOPSRM 52 / RLOPSRM 45 ap. A fr. X) los pone el codigo; lo legal lo confirma el profe.

---

## HU-08 · Apertura formal de la bitácora del contrato

**Rol real (quién ejecuta):** residente = 'E' (ejecuta la apertura); contratista/superintendente y supervisión = 'C' (consultan y luego firman su parte desde "Por firmar"); dependencia y finanzas = sin acceso a la vista. Evidencia: frontend/src/data/permisos.js:19 ('HU-08': { residente:'E', contratista:'C', supervision:'C', dependencia:null, finanzas:null }). El candado server-side es más estricto que el rol: solo el RESIDENTE ASIGNADO a ESE contrato (contrato.residente_id === req.user.id) puede aperturar — bitacora.controller.js:94; además requireRole('residente') en bitacora.routes.js:22.

**Historia:**
- **Como** residente de obra asignado al contrato
- **Deseo** aperturar la bitácora electrónica única del contrato seleccionando el equipo ya ligado a sus cuentas (residente y superintendente obligatorios; supervisión si existe), capturando la fecha de entrega del sitio, el plazo de firma de notas (días naturales, default 2) y los datos mínimos del art. 123 fr. III (domicilios y teléfonos de ambas partes, alcance de los trabajos y características del sitio); al confirmar, el sistema congela un acta-snapshot inmutable, la registra como nota #1 'apertura', deja una firma pendiente por cada miembro del equipo y asienta automáticamente cualquier sustitución/avance/convenio previo que aún no tuviera nota
- **A fin de** habilitar el registro formal e inalterable de eventos del contrato; la bitácora queda 'completa' solo cuando todas las partes firman desde su propia cuenta en 'Por firmar', y hasta entonces no pueden emitirse notas posteriores (art. 46 y 52 Bis LOPSRM; arts. 122-123 fr. III RLOPSRM)

**Criterios de aceptación (comportamiento actual del sistema):**
1. Existe una sola bitácora por contrato (UNIQUE; intento duplicado → 409). Solo el residente asignado a ESE contrato la apertura; el equipo (residente + superintendente obligatorios, supervisión opcional) se toma de las cuentas del contrato, sin nombres libres; sin superintendente asignado la apertura se rechaza (400).
2. La apertura registra apertura_en (timestamp inalterable por trigger) y fija fecha_apertura = fecha de inicio del contrato; la fecha de entrega del sitio (capturada) se conserva por separado en el acta. El acta y las firmas son inmutables (no se editan).
3. La primera nota (acta de apertura, folio #1, tipo 'apertura') congela: identificación del contrato, objeto, datos financieros (monto, anticipo, plazo), cronograma (inicio/término/entrega de sitio), datos mínimos del art. 123 fr. III (domicilios, teléfonos, alcance de trabajos, características del sitio) y el registro de firmantes con rol y cuenta.
4. Al aperturar se crea una firma PENDIENTE por cada miembro; nadie firma en la apertura. Cada parte firma después desde su cuenta ('Por firmar'); la apertura queda COMPLETA (estado derivado) cuando no quedan firmas pendientes. No se pueden emitir notas posteriores hasta que la apertura esté firmada por todos.
5. Al aperturar, si hubo sustituciones de personas, avances de trabajos o convenios modificatorios registrados antes y sin nota, el sistema asienta sus notas automáticamente (numeradas tras la #1) en la misma transacción.

**Fundamento legal:** art. 46 LOPSRM; art. 52 Bis LOPSRM; art. 122 RLOPSRM; art. 123 fr. III RLOPSRM; art. 123 fr. VI RLOPSRM; art. 125 fr. I g RLOPSRM (asiento de sustitución diferida)

**Pendientes / [validar profe]:**
- Regla 'mismo día': el código fija fecha_apertura = fecha de inicio del contrato, NO la fecha de entrega del sitio como decía la ficha vieja; el comentario del código lo marca como [validar] (hallazgo del profe, audio 2026-06-01). Confirmar cuál es la fecha legal de apertura.
- Asiento retroactivo (diferido) de notas de sustitución/avance/convenio al aperturar: el folio refleja el orden de asiento, no la fecha del hecho. El propio código lo deja [validar profe] (orden folio vs. fecha, art. 123 fr. V/VI).
- Plazo de firma de notas por defecto = 2 días naturales (Etapa 1); días hábiles y el plazo legal exacto quedan a confirmar.
- Quién debe firmar la apertura (firma conjunta): hoy se exige a TODO el roster (residente + superintendente + supervisión si aplica); confirmar con el profe si basta la contraparte directa.
- Los specs e2e de HU-08 (frontend/e2e/hu-08-apertura-bitacora.spec.js) están desactualizados: prueban un formulario dummy viejo (testids btn-firmar-1..3, data-parte, aviso-aperturada) que ya no existe en la página real cableada al backend; los tests interactivos están en test.fixme. Falta reescribirlos como integración con backend.

---

## HU-09 · Emisión y respuesta de notas tipificadas con firma

**Rol real (quién ejecuta):** permisos.js:20 da nivel 'E' (ejecuta) a residente, contratista y supervision; dependencia y finanzas = null (sin acceso). PERO el backend NO usa el rol global del JWT: deriva el rol-en-contrato por el equipo del contrato (residente_id/superintendente_id/supervision_id; cargarAperturaYRol bitacora.controller.js:373-389). El contratista inicia sesión y queda asignado como superintendente_id del contrato (o8-notas-estimacion.spec.js:25,33) → emite notas como rol 'superintendente' (art. 125 fr. II). Dependencia/finanzas pueden LEER la bitácora si son parte/supervisión (esParteOSupervision) pero no emiten (aviso-observador, EmisionNotas.jsx:324-327).

**Historia:**
- **Como** residente, superintendente (contratista) o supervisión, según el lugar que ocupo en el equipo del contrato
- **Deseo** emitir notas de bitácora tipificadas según mi rol-en-contrato (catálogo del art. 125 RLOPSRM, más 'otro' para eventos no tipificados), firmándolas automáticamente desde mi cuenta al emitir; responder/vincular notas previas y, si me equivoqué, anular mi nota generando una correctiva 'dice/debe decir', sin poder editar nunca la original; y que las demás partes puedan firmar (aceptar) mis notas o se acepten tácitamente al vencer el plazo
- **A fin de** documentar formalmente los eventos del contrato de forma trazable, inmutable y auditable (art. 123 fr. V y VI RLOPSRM)

**Criterios de aceptación (comportamiento actual del sistema):**
1. El selector de tipos muestra SOLO los tipos del art. 125 vigentes (activo=true) que corresponden a mi rol-en-contrato (residente / superintendente / supervisión) más 'otro'; el rol lo deriva el servidor del equipo del contrato y rechaza con 403 cualquier tipo que no corresponda a mi rol.
2. No se puede emitir NINGUNA nota hasta que la apertura (nota #1) esté firmada por TODOS los participantes; mientras falten firmas el botón está deshabilitado y el servidor responde 409.
3. Cada nota recibe folio correlativo BIT-NNNN sin saltos ni duplicados (UNIQUE por bitácora), fecha y hora, y queda firmada por su emisor (tomado del JWT) en el acto de emisión; puede vincularse opcionalmente a una nota previa de la misma bitácora.
4. Una nota emitida es inmutable (trigger): la única transición permitida es emitida→anulada y solo la ejecuta el emisor, que genera una nota correctiva vinculada 'dice/debe decir'; no se puede anular la nota de apertura ni una nota ya respondida por otra parte.
5. Las partes distintas del emisor pueden firmar (aceptar) la nota; si se completan todas las firmas del roster la nota queda 'firmada', y si vence el plazo de firma sin completarse se marca 'aceptada (tácita)'.

**Fundamento legal:** art. 122 RLOPSRM; art. 123 fr. III RLOPSRM; art. 123 fr. V RLOPSRM; art. 123 fr. VI RLOPSRM; art. 123 fr. VII RLOPSRM; art. 125 RLOPSRM (fr. I residente, fr. II superintendente, fr. III supervisión, último párrafo 'otros'); art. 53 LOPSRM (notas de consecuencia las avala el residente)

**Pendientes / [validar profe]:**
- Quién debe firmar una nota para considerarla aceptada: ¿todo el roster (residente+superintendente+supervisión) o basta la contraparte directa? (comentario [validar] en bitacora.controller.js:624).
- Asiento RETROACTIVO de notas automáticas diferidas (sustitución/avance/convenio) al abrir la bitácora: orden del folio vs. fecha real del hecho (art. 123 fr. V/VI) — marcado [validar profe] en bitacora.controller.js:172-173.
- La ficha vieja redacta el rol como 'residente, supervisión o contratista'; en el sistema el CONTRATISTA emite como rol 'superintendente' (art. 125 fr. II), no como 'contratista' directo — confirmar el mapeo con el profe.
- Plazo de firma/aceptación default = 2 días naturales, configurable 1-60 (schema.sql:393-402); confirmar días naturales vs hábiles.
- La ficha vieja menciona arts. 122 y 125; el código cita además 123 fr. III/V/VI/VII y 53 — confirmar fundamento completo.

---

## HU-10 · Consulta y búsqueda de notas de bitácora

**Rol real (quién ejecuta):** Ejecuta (nivel 'E'): residente. Consultan en solo-lectura (nivel 'C'): contratista y supervisión. Sin acceso (null): dependencia y finanzas. Fuente: frontend/src/data/permisos.js:21 ('HU-10': { residente:'E', contratista:'C', supervision:'C', dependencia:null, finanzas:null }). Nota: la consulta es de lectura, así que el componente NO bloquea filtros ni export para los roles 'C' (ConsultaNotas.jsx:20-21 comenta que soloLectura no bloquea la consulta; el spec hu-10 L80-87 verifica que el contratista/supervisión ven aviso de solo-consulta pero filtro-tipo sigue habilitado). Backend acota por participación: esParteOSupervision sobre el contrato (bitacora.controller.js:692), por lo que de facto cualquier parte del contrato (incl. created_by/dependencia y supervisión) puede leer las notas vía el endpoint aunque permisos.js oculte la UI a dependencia/finanzas.

**Historia:**
- **Como** residente del contrato (y, en solo-lectura, contratista o supervisión que participan en él)
- **Deseo** elegir un contrato en el que participo y buscar dentro de las notas de su bitácora combinando con lógica Y (AND) los filtros de tipo de nota, rango de fechas, firmante (emisor), vínculo (vinculadas / sin vínculo / todas) y palabra clave (insensible a acentos, sobre asunto, contenido, tag y tipo), ver los resultados en una tabla con su estado de aceptación, seleccionar varias notas y exportarlas a un archivo Excel (.xlsx)
- **A fin de** encontrar rápido la nota que necesito y poder referenciarla en estimaciones o reportes

**Criterios de aceptación (comportamiento actual del sistema):**
1. Tras seleccionar un contrato del que participo, la búsqueda devuelve únicamente las notas de su bitácora que cumplen SIMULTÁNEAMENTE todos los filtros aplicados (tipo, rango de fechas, firmante/emisor, vínculo y palabra clave); la palabra clave es insensible a acentos y mayúsculas y busca en asunto, contenido, tag y etiqueta de tipo.
2. Puedo seleccionar varias notas del resultado (individualmente o con 'seleccionar todas') y exportarlas a un archivo Excel (.xlsx) con las columnas Folio, Fecha, Tipo, Emisor, Vínculo, Asunto, Contenido y Estado; el botón de exportar solo aparece cuando hay al menos una nota seleccionada.
3. Si el contrato seleccionado no tiene bitácora aperturada, se muestra un aviso de que no hay notas que consultar (sin error duro).
4. Si no participo en el contrato, el backend deniega el acceso (403) y la UI lo informa sin revelar las notas; los roles dependencia y finanzas no ven la vista en el menú.
5. Cada fila muestra el estado de aceptación de la nota (En plazo / Firmada / Aceptada tácita / Respondida / Anulada) y la fecha con hora; el contratista y la supervisión pueden consultar y filtrar en modo solo-lectura.

**Fundamento legal:** Art. 125 RLOPSRM (un emisor por nota; el filtro 'firmante' opera sobre el emisor real — citado en BuscadorNotas.jsx:8-9); Art. 123 fr. III y fr. XII RLOPSRM (plazo de firma de notas y derivación del estado de aceptación firmada/tácita — citado en backend bitacora.controller.js:618-623)

**Pendientes / [validar profe]:**
- [validar profe] La ficha dice 'firmante' pero el sistema filtra por EMISOR de la nota (no por quien firma). Confirmar si 'firmante' debe seguir mapeando al emisor o agregarse un filtro por firmantes reales (bitacora_nota_firmas).
- [validar profe] La búsqueda por palabra clave incluye el tag y la etiqueta del tipo además de asunto/contenido (alcance mayor al literal de la ficha). Confirmar que es deseable.
- [validar profe] El export toma las notas seleccionadas de TODO lo cargado, no solo de los resultados visibles tras filtrar (la selección persiste al cambiar filtros). Confirmar si debe limitarse a los resultados filtrados o limpiar la selección al re-filtrar.
- [validar profe] El criterio 1 (filtros AND sobre datos reales) y el export .xlsx NO están cubiertos por la suite E2E (solo estructura/permisos); se validan por smoke manual contra el backend local. Decidir si se requiere cobertura automatizada.
- [validar profe] El estado de aceptación se MUESTRA/exporta pero NO es filtrable; evaluar si debería ser un filtro adicional.

---

## HU-11 · Minutas, visitas y acuerdos (Registro de minutas, agenda de visitas y consulta de acuerdos)

**Rol real (quién ejecuta):** Residente = ejecutor (nivel 'E'); contratista y supervision = solo consulta (nivel 'C'); dependencia y finanzas = sin acceso (null). Evidencia: frontend/src/data/permisos.js:22 ('HU-11': { residente:'E', contratista:'C', supervision:'C', dependencia:null, finanzas:null }).

**Historia:**
- **Como** Residente
- **Deseo** registrar minutas de reuniones (fecha, lugar, participantes, asunto y nombre del PDF), agendar visitas/inspecciones de campo (fecha, lugar, responsable, proposito) y consultar una lista de acuerdos filtrable por periodo, todo dentro de una pantalla con tres pestanas (Minutas, Agenda de visitas, Acuerdos)
- **A fin de** tener concentradas las reuniones, visitas y compromisos del contrato en un solo lugar para consulta

**Criterios de aceptación (comportamiento actual del sistema):**
1. La pantalla tiene 3 pestanas (Minutas, Agenda de visitas, Acuerdos); el residente ejecuta y contratista/supervision solo consultan (formularios deshabilitados con aviso de solo consulta); dependencia y finanzas no ven la HU.
2. Registrar minuta exige fecha + lugar + participantes + asunto + archivo PDF seleccionado; el boton permanece deshabilitado hasta completarlos y, al registrar, agrega la minuta arriba de la tabla con folio correlativo MIN-NNN y resaltado verde (solo en memoria de la sesion).
3. Agendar visita exige fecha + lugar + responsable + proposito; al agendar agrega la visita con folio VIS-NNN y estado 'Programada' (badge), solo en memoria de la sesion.
4. La pestana Acuerdos muestra una lista (dummy) filtrable por periodo (selector de mes); el filtro sigue activo incluso en modo solo consulta.
5. El boton 'Adjuntar como referencia en nota' abre un modal informativo que remite a HU-09; NO crea ni vincula ninguna nota.

**Pendientes / [validar profe]:**
- PERSISTENCIA: hoy todo es dummy en memoria (no se guarda nada). Construir backend (controller+route+mount) que use las tablas minutas/visitas ya definidas en schema.sql, con acotacion por contrato (esParteOSupervision) y registrada_por desde el JWT.
- SUBIDA REAL DEL PDF: hoy solo se captura el nombre del archivo (no se sube). El esquema preve pdf en BYTEA; definir si va a disco/BYTEA como contrato_documentos.
- VINCULO REAL minuta/visita -> nota de bitacora (criterio 3 de la ficha, hoy NO construido): implementar la escritura de minutas.nota_id desde HU-09 o desde aqui. [validar profe]: que tipo de nota (art. 125 fr. III inciso d RLOPSRM) y si la minuta firmada se congela.
- ACUERDOS DERIVADOS: hoy son una lista estatica sin origen real. Definir si los acuerdos se capturan/derivan de minutas (no hay tabla 'acuerdos' en el esquema) y si el filtro debe ser por contrato + periodo (la ficha pide ambos; hoy solo periodo).
- DISCREPANCIA UI vs ESQUEMA: campos de la UI (participantes, asunto, archivoPdf / responsable, estado Programada-Realizada-Cancelada) no coinciden con las columnas del schema.sql (titulo, acuerdos TEXT / tipo visita-inspeccion, resultado, estado agendada-realizada-cancelada). Reconciliar antes de cablear backend.
- Fundamento legal: el esquema cita art. 125 fr. III inciso d) RLOPSRM para minutas y marca visitas como operativas sin fundamento literal; el codigo no lo cita. Confirmar con el profe.

---

## HU-12 · Apertura del periodo e integración de la estimación

**Rol real (quién ejecuta):** contratista (nivel 'E' en permisos.js:23). residente='C', supervision='C', dependencia=null, finanzas=null. ADEMÁS, el backend exige IDENTIDAD: solo el superintendente_id del contrato integra (estimaciones.controller.js:123) — y el superintendente es siempre una cuenta de rol contratista (estimaciones.routes.js:14-19 requireRole('contratista') + control de identidad).

**Historia:**
- **Como** contratista (superintendente asignado al contrato; nivel 'E' en HU-12)
- **Deseo** integrar la estimación del periodo como un expediente único (carátula financiera + números generadores con snapshots de PU y cantidad contratada + notas de bitácora FIRMADAS vinculadas desde el buscador), capturando el volumen ejecutado por concepto y las deductivas, con una carátula viva de previsualización; al confirmar, el backend materializa la carátula (subtotal, amortización del anticipo, 5 al millar, deductivas, retención por atraso y neto sin IVA), asigna número correlativo y deja la estimación en estado 'Integrada' append-only
- **A fin de** presentar la estimación como expediente del periodo conforme al art.132 RLOPSRM, listo para que el contratista la PRESENTE (HU-13, dispara art.54), la supervisión la revise/turne y la residencia la autorice/rechace (HU-15)

**Criterios de aceptación (comportamiento actual del sistema):**
1. Solo el superintendente asignado al contrato integra (403 si no lo es), y solo si el contrato tiene su PDF firmado ligado (409); si el anticipo supera el umbral (default 30%) se exige además la autorización del titular ligada (art.50 fr.IV LOPSRM).
2. La carátula se calcula SERVER-SIDE (fuente única de verdad, append-only): subtotal=Σ ROUND(cant×pu,2); amortización=subtotal×anticipo_pct/100 (art.143 fr.I RLOPSRM, proporcional al avance); 5 al millar=subtotal×0.005 (art.191 LFD); deductivas manuales (>=0); retención por atraso=pena×subtotal si hay pena pactada y la obra va atrasada vs su programa (art.138/139); neto=subtotal−deducciones, SIN IVA (art.2 fr.XIX) y nunca negativo. El cliente solo muestra preview vivo.
3. El backend bloquea (409) si por concepto el acumulado (previo+periodo) excede lo CONTRATADO (art.118) o lo PLANEADO en el programa hasta el periodo (art.45 ap.A fr.X + art.52); la UI adelanta ambos topes con semáforo y deshabilita 'Confirmar'.
4. El periodo no excede un mes calendario (art.54) y no se traslapa con otra estimación NO rechazada del contrato (409); el número es correlativo atómico (MAX+1) por contrato.
5. Se vinculan únicamente notas de bitácora FIRMADAS del propio contrato (excluida la apertura), validadas por pertenencia en el backend; al integrar se guarda el expediente (carátula + generadores con snapshots + notas) y los snapshots de avance físico y financiero, en estado inicial 'Integrada'.

**Fundamento legal:** art.132 RLOPSRM (expediente de la estimación); art.138 fr.I RLOPSRM (amortización del anticipo); art.138/139 RLOPSRM (penas convencionales / retención por atraso); art.191 LFD (5 al millar); art.118 RLOPSRM (tope contratado por concepto); art.45 ap.A fr.X RLOPSRM + art.52 LOPSRM (tope planeado del programa); art.54 LOPSRM (periodo máximo 1 mes); art.2 fr.XIX RLOPSRM (sin IVA); art.46/46 Bis LOPSRM (deductivas económicas); art.50 fr.IV LOPSRM (autorización del titular sobre umbral de anticipo)

**Pendientes / [validar profe]:**
- Registro FOTOGRÁFICO y SOPORTES documentales del expediente (CA-1 ficha vieja) NO están construidos: TabPlaceholder existe (jsx:493-503) pero no se renderiza; sin tabla ni endpoint. Diferidos.
- La 'apertura del periodo' de la ficha se reduce HOY a capturar periodo inicio/fin (no hay entidad/acción formal de apertura separada de la integración).
- Definición de avance FÍSICO vs FINANCIERO y regla de disparo de la retención por atraso (global vs concepto, bruto vs neto) [validar profe] (controller:266, prep:135).
- CMIC / 2 al millar: parametrizable y DIFERIDO; tasa y aplicabilidad a confirmar (controller:293-294).
- Bloqueo DURO vs alerta para el tope del programa A2 (art.45-A-X/52): el código bloquea (409) pero anota [validar] (controller:239).
- Umbral del anticipo para exigir autorización del titular (art.50 fr.IV) y su parametrización (ANTICIPO_UMBRAL_PDF default 30%) [validar profe] (controller:138).

---

## HU-13 · Envio/presentacion de la estimacion

**Rol real (quién ejecuta):** Contratista (nivel 'E' en permisos.js:27 — HU-13 contratista='E', residente='C', supervision='C', dependencia/finanzas=null). El backend lo restringe aun mas: SOLO el superintendente asignado al contrato (superintendente_id === req.user.id), estimaciones-ciclo.controller.js:140-142. Residente y supervision solo consultan ('C').

**Historia:**
- **Como** contratista (concretamente el superintendente asignado al contrato)
- **Deseo** presentar formalmente una estimacion que ya integre (estado 'integrada'/"Integrada"), de modo que el sistema selle la fecha y hora exacta del acto y la estimacion pase a "Presentada" (estado interno 'enviada')
- **A fin de** dejar evidencia inmutable del momento de entrega y arrancar el plazo de revision/autorizacion del art. 54 LOPSRM que ejecutan la supervision y la residencia (HU-15)

**Criterios de aceptación (comportamiento actual del sistema):**
1. Solo el superintendente asignado al contrato puede presentar; al hacerlo el backend sella enviada_en=NOW() y enviada_por (tomado del JWT, no del body) y avanza el estado de 'integrada' a 'enviada' ("Integrada"->"Presentada"). Residente y supervision solo consultan; cualquier otro rol recibe 403.
2. Solo se puede presentar una estimacion en estado 'integrada': cualquier otro estado devuelve 409 y una ya presentada no se vuelve a presentar (boton desaparece en UI; backend 409 'La estimacion ya fue presentada', con UPDATE atomico que evita doble-presentacion en carrera).
3. La UI muestra el acuse con fecha y hora exacta ('Presentada el dd/mm/aaaa hh:mm') derivado de enviada_en.
4. Al quedar presentada, la UI muestra un semaforo del plazo de revision/autorizacion de 15 dias naturales (art. 54), DERIVADO en lectura desde enviada_en (sin contador persistido): 'Revision (HU-15): dia X de 15 / N dias restantes / plazo vencido'.
5. El plazo de 6 dias de presentacion (desde el corte = periodo_fin) es solo un aviso informativo (texto 'Dentro/Fuera de los 6 dias'); NO deshabilita el boton ni bloquea la presentacion fuera de plazo.

**Fundamento legal:** Art. 54 LOPSRM (plazo de presentacion de 6 dias y revision/autorizacion de 15 dias; citado en controller:109-121, jsx:16-22,256-257,303-305,320 y estadoEstimacion.js:1-7)

**Pendientes / [validar profe]:**
- Notificacion formal a residencia y supervision (criterio 1 de la ficha vieja): hoy NO existe como aviso push; la difusion es por consulta del historial (pull). [validar profe] si la 'notificacion formal' del art. 54 requiere un aviso/asiento explicito.
- El plazo de 6 dias para presentar NO bloquea (la ficha vieja lo pedia como candado del boton). Se degrado a aviso informativo no bloqueante. [validar profe] si presentar fuera de los 6 dias debe impedirse o solo advertirse.
- El plazo de 15 dias se MUESTRA como referencia visual pero NO dispara ninguna accion automatica al vencer (no hay afirmativa ficta ni autorizacion automatica en HU-13). [validar profe] consecuencia legal del vencimiento.
- La ficha vieja decia plazo de revision 'supervision'; hoy abarca supervision+residencia via HU-15. [validar profe] redaccion.

---

## HU-14 · Historial de estimaciones del contrato

**Rol real (quién ejecuta):** residente = 'E' (ejecutor). contratista y dependencia = 'C' (consulta). supervision y finanzas = null (sin acceso). Fuente: frontend/src/data/permisos.js:28. Nota: el backend (esParteOSupervision) acota por participacion, no por rol; en los specs el contratista (=superintendente del contrato) y la dependencia tambien CONSULTAN el historial via API real (hu-14-historial.spec.js:120-219).

**Historia:**
- **Como** residente (ejecutor); el contratista (superintendente del contrato) y la dependencia tambien pueden consultar
- **Deseo** consultar, por contrato, el listado de TODAS sus estimaciones (en cualquier estado: integrada/presentada/autorizada/rechazada/pagada) ordenadas por numero correlativo, con su estado actual e importe neto, filtrarlas por periodo (mes) y por estado con logica Y, abrir cada una en un panel de detalle resumido y exportar a Excel el resultado filtrado
- **A fin de** tener trazabilidad del ciclo de cobro del contrato, incluyendo las estimaciones rechazadas, para fiscalizacion

**Criterios de aceptación (comportamiento actual del sistema):**
1. Al seleccionar un contrato del que se es parte (o supervision), se listan TODAS sus estimaciones ordenadas por numero correlativo, incluyendo las que estan en estado 'rechazada', mostrando estimacion, periodo (mes), estado (badge), importe neto y fecha de presentacion.
2. Los filtros de Periodo (mes) y Estado operan con logica Y: una estimacion solo aparece si cumple AMBOS; las opciones de cada filtro se derivan de los datos cargados.
3. Click en una fila abre un panel lateral 'Expediente' (resumen) con periodo, estado, importe, fecha de presentacion, fecha de revision, fecha de pago y observaciones; se cierra con el boton o el backdrop.
4. El boton 'Exportar historial' descarga un .xlsx con las filas FILTRADAS (estimacion, version, periodo, estado, importe, fechas).
5. Un contrato sin estimaciones muestra estado vacio ('Sin estimaciones...', 'Resultados (0)') sin error; un usuario sin participacion recibe 403 traducido a un toast de sin acceso.

**Pendientes / [validar profe]:**
- [validar profe] La ficha vieja cita art. 130 RLOPSRM (tipos de estimacion) y art. 138 (versionado); el CODIGO de HU-14 no cita ningun articulo, por eso articulos_ley va vacio.
- CA-3 'expediente COMPLETO': el panel es un RESUMEN, no el expediente de HU-04. Decidir si CA-3 exige enlazar al expediente completo o el resumen basta.
- Fechas de revision y pago en el panel: el backend solo deriva transiciones 'integrada' y 'enviada'; NO empuja 'autorizada'/'rechazada'/'pagada' (punto de extension comentado pero no implementado, controller :65-68), por lo que fechaRevision y fechaPago salen siempre vacias aunque el estado ya haya avanzado por HU-15/HU-21. Falta cablear esas columnas para completar la linea de tiempo.
- Observaciones del panel: siempre vacias (HistorialEstimaciones.jsx:156); no se traen de HU-15 (estimacion_observaciones). Decidir si HU-14 debe mostrarlas.
- Concepto de 'versiones rechazadas' (HU-16): el modelo NO versiona (columna Version = '—'); una rechazada aparece como estado, no como version anterior vinculada. Confirmar si HU-14 debe mostrar el encadenamiento de versiones.

---

## HU-15 · Recepción, revisión técnica y autorización de la estimación

**Rol real (quién ejecuta):** Ejecutan (nivel 'E') residente y supervision; dependencia consulta ('C'); contratista y finanzas SIN acceso. Evidencia: frontend/src/data/permisos.js:29 — 'HU-15': { residente:'E', contratista:null, supervision:'E', dependencia:'C', finanzas:null }. El backend reparte el ejecutor por acto: supervisión (contrato.supervision_id) registra/elimina observaciones y turna; residencia (contrato.residente_id) autoriza/rechaza.

**Historia:**
- **Como** supervisión y residencia (revisión secuencial; la dependencia consulta)
- **Deseo** recibir la estimación PRESENTADA (estado 'enviada'), revisarla por las secciones disponibles (carátula, números generadores y notas de bitácora vinculadas, leídas del detalle real de la estimación), registrar observaciones con tipo (aclaración/corrección/rechazo) y severidad (menor/mayor/crítica) ancladas a una sección, turnar de supervisión a residencia (con o sin observaciones), y que la residencia —solo después del turnado— AUTORICE (estado→'autorizada') o RECHACE con motivo obligatorio (estado→'rechazada', generando una observación de rechazo dirigida al contratista)
- **A fin de** decidir sobre la estimación con revisión técnica trazable y controlando visualmente el plazo de 15 días naturales del art. 54 LOPSRM, en ejercicio de la responsabilidad de la residencia (art. 53 LOPSRM)

**Criterios de aceptación (comportamiento actual del sistema):**
1. La vista carga la estimación 'enviada'/'autorizada'/'rechazada' del contrato seleccionado y muestra carátula, números generadores y notas vinculadas del detalle real (GET /estimaciones/:id); las secciones 'fotos' y 'soportes' NO se muestran porque no hay archivos reales que exponer.
2. Solo la supervisión asignada (contrato.supervision_id) registra y elimina (sus propias) observaciones con tipo y severidad por sección, únicamente mientras la estimación está 'enviada' y NO ha sido turnada; tras turnar, su revisión queda cerrada (backend devuelve 409).
3. La supervisión turna a residencia solo si hay al menos una observación o marca explícitamente 'sin observaciones'; el turnado es requisito para resolver (autorizar/rechazar sin turnar → 409) y el superintendente/contratista no puede autorizar (→403).
4. Solo la residencia asignada (contrato.residente_id), y solo tras el turnado, autoriza (→'autorizada') o rechaza con motivo obligatorio (→'rechazada', insertando una observación tipo 'rechazo' dirigida al contratista); las acciones son atómicas y revalidadas server-side por rol y máquina de estados.
5. Un semáforo derivado en vivo desde enviada_en muestra el día N de 15 (verde ≤7, amarillo 8-12, rojo >12); es indicador informativo del art. 54 LOPSRM y NO bloquea las acciones al vencer.

**Fundamento legal:** art. 54 LOPSRM (plazo de revisión, citado en RevisionEstimacion.jsx:354 y controller:180); art. 53 LOPSRM (responsabilidad de residencia/supervisión — citado en la ficha vieja, no en el código del controller); art. 191 LFD (retención 5 al millar — citado en la carátula leída, jsx:192)

**Pendientes / [validar profe]:**
- ¿Las observaciones deben poder anclarse 'por concepto' (renglón del generador) y no solo por sección, como pedía la ficha CA-1? Hoy es por sección.
- ¿Es aceptable que las secciones 'registro fotográfico' y 'soportes' no se muestren (faltan archivos reales) aunque la ficha CA-1 las nombra? Backend ya las acepta.
- Umbrales del semáforo 7/12 días son del prototipo, no de ley: confirmar con el profe los cortes verde/amarillo/rojo y si debe haber bloqueo al vencer (hoy solo informa).
- ¿El plazo de 15 días debe correr desde la PRESENTACIÓN (enviada_en, como hoy) o desde una 'fecha de recepción' separada? En el flujo reconciliado se asumió que presentación = recepción a revisión.
- Validar emisor/firma legal de la autorización y del rechazo (hoy solo se sella estado + autor de la observación, sin firma formal).

---

## HU-16 · Reingreso de estimación tras rechazo

**Rol real (quién ejecuta):** contratista (nivel 'E' = ejecuta) en permisos.js:30. residente='C' (consulta/solo lectura); supervision/dependencia/finanzas=null (sin acceso, no aparece en sidebar ni inicio). El spec hu-16-reingreso.spec.js valida exactamente este reparto (contratista ejecuta, residente solo consulta, los otros 3 no ven la HU).

**Historia:**
- **Como** contratista
- **Deseo** abrir la pantalla de Reingreso, seleccionar un contrato y una estimación RECHAZADA real, ver las observaciones reales del rechazo (leídas de HU-15) con su severidad y descargarlas en PDF o Excel, capturar una nota de atención a observaciones, confirmar con una casilla que las atendí, y al pulsar 'Reingresar' crear una NUEVA versión real (bloque completo independiente) vinculada a la rechazada, con su trazabilidad de versiones derivada de datos reales
- **A fin de** re-presentar la estimación corrigiendo lo observado, conservando la trazabilidad fiscal con la versión rechazada y sin reiniciar el plazo de presentación del art. 54 LOPSRM

**Criterios de aceptación (comportamiento actual del sistema):**
1. La vista carga con un selector de contrato → estimación RECHAZADA (historial real, GET /estimaciones-ciclo/contrato/:id/historial, filtrando estado='rechazada' aún no reingresadas). Con rol contratista el panel de reingreso es editable; con residente carga en SOLO LECTURA; supervisión/dependencia/finanzas NO la ven (permisos.js:30; spec hu-16-reingreso.spec.js)
2. La tabla 'Observaciones de la versión rechazada' lista las observaciones REALES del rechazo (GET .../estimacion/:id/revision de HU-15: sección/tipo/severidad/descripción) y los botones 'Descargar PDF' (jsPDF) y 'Descargar Excel' (exceljs) generan el archivo con esos datos reales
3. El botón 'Reingresar estimación (nueva versión)' permanece deshabilitado hasta que la nota tenga texto Y la casilla de confirmación esté marcada (gate de control)
4. Al reingresar, el backend (POST .../estimacion/:id/reingresar) crea ATÓMICAMENTE una NUEVA estimación 'integrada' como bloque completo independiente (número correlativo propio, copiando generadores y carátula-snapshot de la rechazada) y la liga a la rechazada vía reemplaza_a; aparece el banner 'aviso-reingreso' y la tabla 'Trazabilidad de versiones' derivada del historial real (rechazada → reingreso). La rechazada permanece 'rechazada' (histórico vinculado). 1 rechazada → 1 reingreso (UNIQUE reemplaza_a; 2º intento → 409)
5. El plazo de presentación (art. 54 LOPSRM) NO se reinicia: la nueva versión nace con enviada_en=NULL y REFERENCIA el envío original de la rechazada (enviada_en), derivado en lectura sin contador persistido. Solo el superintendente del contrato reingresa (gate server-side; residencia → 403)

**Fundamento legal:** art. 54 LOPSRM (plazo de presentación que no se reinicia — [validar profe] la semántica exacta); trazabilidad fiscal de la versión rechazada (histórico vinculado, coherente con la inmutabilidad de estimaciones, art. 132 RLOPSRM).

**Pendientes / [validar profe]:**
- [validar profe] Semántica exacta de 'no reiniciar el plazo de presentación' del art. 54 LOPSRM: hoy la nueva versión referencia la enviada_en de la rechazada (derivado en lectura, sin reabrir el contador). Confirmar regla legal.
- [validar profe] El reingreso COPIA la carátula/generadores de la rechazada como bloque independiente (no re-deriva dinero: propaga el snapshot validado por HU-12). Confirmar si el reingreso debe permitir RE-CAPTURAR cantidades corregidas (re-integrar vía HU-12) en lugar de copiar el bloque.
- [validar/PARA MAIKI] La 'nota de atención a observaciones' es hoy un gate de control que NO se persiste (no hay columna; el esquema es de Fundación). Si debe quedar registrada, requiere DDL aditivo.
- [validar profe] Confirmar si se mantienen ambos formatos de descarga (PDF y Excel) de las observaciones o se consolida (coherencia con O9 expediente como un solo PDF).

---

## HU-17 · Tablero de estimaciones aceptadas y en proceso

**Rol real (quién ejecuta):** residente (nivel 'E' en permisos.js:31). En 'C' (consulta): contratista, supervision, dependencia. finanzas = null (sin acceso a la HU). El backend NO usa requireRole por rol global: acota por PARTICIPACION (esParteOSupervision); los roles operativos solo ven sus contratos y dependencia/finanzas verian todos, pero a finanzas el frontend le oculta la HU.

**Historia:**
- **Como** residente (ejecutor; contratista/supervision/dependencia en consulta; finanzas sin acceso)
- **Deseo** ver un tablero de SOLO LECTURA con las estimaciones de los contratos donde participo (dependencia ve todas), excluyendo las rechazadas del grid, donde cada estimacion muestra su linea de tiempo de 4 fases (Integrada -> Presentada -> Autorizada -> Pagada), su estado, periodo, monto neto y responsable; con indicadores agregados de cartera (numero de contratos, monto estimado, pagado y pendiente, conteos y montos por estado, antiguedad promedio en dias por estado) calculados server-side, filtros consultativos (estado/periodo/responsable) y un panel 'Mis pendientes' acotado a mi rol
- **A fin de** saber que estimacion esta en que estado y que requiere mi accion inmediata

**Criterios de aceptación (comportamiento actual del sistema):**
1. El grid 'Estimaciones aceptadas y en proceso' muestra solo estados con enGrid=true (integrada, enviada, autorizada, pagada) y EXCLUYE las rechazadas; las rechazadas SI se cuentan en los contadores/metricas por estado (controller:31-37,127; spec :66-75).
2. Cada tarjeta de estimacion muestra un mini-stepper de 4 fases que marca como completadas las fases anteriores al estado actual y resalta el estado vigente (jsx:57-78), mas estado, periodo (AAAA-MM), monto neto cuadrado y rol responsable (next-actor).
3. Los indicadores agregados se calculan server-side: totales de cartera (contratos, monto_estimado=Sigma neto no-rechazadas, monto_pagado, monto_pendiente), por_estado (n, monto_neto, monto_subtotal, antiguedad_prom_dias) y por_contrato (n, monto_neto, monto_pagado); el cliente solo da formato (controller:148-191).
4. El panel 'Mis pendientes' lista solo las estimaciones cuyo estado exige una accion que ejecuta el ROL del JWT del usuario: contratista presenta lo integrada y reingresa lo rechazada; supervision/residente revisa-autoriza lo enviada; finanzas paga lo autorizada (controller:43-48,169-181; spec :81-120).
5. La visibilidad esta acotada por participacion: roles operativos solo ven sus contratos; dependencia y finanzas verian todos, pero a finanzas el frontend le oculta la HU (permisos.js:31 finanzas=null; lib/acceso.js; spec :92-97,133-137,149-152).

**Fundamento legal:** art. 54 LOPSRM (periodo de la estimacion y flujo presentar/autorizar, citado en controller:21,44 y jsx:15)

**Pendientes / [validar profe]:**
- [validar profe] El 'avance' (fisico vs programado) que pedia la ficha vieja NO se construyo en el tablero: no hay calculo ni columna de avance. Decidir si el tablero debe incorporar avance fisico o si ese indicador vive solo en HU-06/HU-07.
- [validar profe] Los estados 'en revision' y 'en pago' de la ficha vieja NO son estados propios del modelo (el CHECK tiene 5: integrada/enviada/autorizada/pagada/rechazada). Hoy 'Presentada'(enviada) cubre la revision y 'Autorizada' cubre el previo-al-pago. Confirmar si basta con etiquetas/next-actor o se requieren sub-estados dedicados.
- [validar profe] Los indicadores agregados son de CARTERA (todos los contratos visibles del usuario), no de un unico contrato seleccionado como sugeria la ficha ('del contrato'). Hay desglose por_contrato, pero no un selector de contrato unico. Confirmar el alcance esperado.
- [validar profe] El gate de pago aguas abajo (HU-21) es PERMISIVO (acepta integrada/enviada/autorizada); el tablero asume el flujo art.54 reconciliado O7<->HU-15. Confirmar la maquina de estados definitiva.

---

## HU-18 · Portafolio ejecutivo con semaforos

**Rol real (quién ejecuta):** dependencia es el unico ejecutor (nivel 'E') segun permisos.js:32 ('HU-18': { residente:'C', contratista:null, supervision:'C', dependencia:'E', finanzas:null }). residente y supervision tienen acceso de SOLO LECTURA ('C'); contratista y finanzas NO tienen acceso (null). Coincide con la ficha vieja (Como: dependencia).

**Historia:**
- **Como** dependencia (con acceso de solo lectura para residencia y supervision; contratista y finanzas sin acceso)
- **Deseo** ver una lista de contratos del portafolio donde cada renglon muestra un semaforo de 3 colores (verde/amarillo/rojo) calculado en el cliente a partir de tres factores (desviacion de avance vs programado, dias vencidos en plazos y pendientes sin atender), con contadores agregados por color, badge de variacion del avance contra el mes anterior, agrupacion por contratista/ejercicio fiscal/tipo de contratacion, y panel de detalle (avance fisico, avance financiero, atrasos y penalizaciones) que se abre con doble clic
- **A fin de** identificar de un vistazo cuales contratos requieren atencion ejecutiva y abrir su detalle

**Criterios de aceptación (comportamiento actual del sistema):**
1. Cada renglon muestra un dot+badge de semaforo (verde total<=1, amarillo 2-3, rojo >=4) derivado en cliente sumando 0/1/2 puntos de los 3 factores (desviacionAvance, diasVencidos, pendientesSinAtender); el hover muestra el desglose factor:valor(+puntos)|Total.
2. La cabecera muestra 4 contadores: Total de contratos y conteo de contratos verde/amarillo/rojo.
3. El doble clic sobre un renglon abre un panel de detalle con avance fisico %, avance financiero %, atrasos (dias vencidos) y penalizaciones ($), con boton Cerrar.
4. El control 'Agrupar por' reorganiza la tabla por Contratista, Ejercicio fiscal o Tipo de contratacion (o Ninguno), mostrando un encabezado de grupo con el conteo.
5. Cada renglon muestra un badge de variacion del avance vs el mes anterior (↑/↓ N pp o '= igual').

**Pendientes / [validar profe]:**
- [validar profe] La vista opera 100% sobre datos DUMMY hardcodeados (5 contratos fijos en dummy.js); NO esta conectada a backend, no lee contratos reales ni 'mis contratos asignados' del usuario. Falta endpoint y cableado en api.js para que los semaforos/indicadores se deriven de datos reales (avance real, plazos LOPSRM/RLOPSRM, penalizaciones art.138/139).
- [validar profe] CA-3 'comparar periodo actual vs anterior' esta solo como badge por fila (avance del mes vs mes anterior), no como comparativa agregada del portafolio entre dos periodos seleccionables. Definir si se requiere selector de periodos y comparacion a nivel grupo/total.
- [validar profe] Los umbrales del semaforo (desviacion <=5/<=15, dias <=10, pendientes <=2) y el mapeo total->color son definidos por Code en portafolioLogica.js; confirmar las reglas y las cotas de cada factor.
- [validar profe] El factor 'atrasos en plazos legales' se simula con un campo numerico diasVencidos del dummy; definir contra que plazo legal real se computa (entrega de obra, autorizacion de estimacion art.54, etc.).
- [validar profe] Confirmar si residente y supervision deben tener acceso de solo lectura (hoy 'C' en permisos.js); la ficha vieja solo menciona a la dependencia.

---

## HU-19 · Exportación de los 7 reportes definidos del contrato

**Rol real (quién ejecuta):** residente = 'E' (único ejecutor: descarga/exporta). contratista, supervision, dependencia, finanzas = 'C' (solo consulta; vista en solo lectura, botones de exportar deshabilitados). Evidencia: frontend/src/data/permisos.js:33. Coincide con la ficha vieja ("Como | residente").

**Historia:**
- **Como** residente
- **Deseo** seleccionar un contrato (acotado a mi participación) y un periodo (Mensual, Trimestral o Acumulado), y descargar 6 de los 7 reportes definidos en su formato establecido (PDF y/o Excel), generados en el cliente a partir de los datos REALES del contrato; el séptimo reporte (Observaciones) aparece en la lista pero su exportación está deshabilitada por falta de fuente a nivel contrato
- **A fin de** llevar la información del sistema a oficios, presentaciones o expedientes de auditoría, con valores que cuadran a lo que persiste el backend (carátula, curva S, convenios) sin recalcularlos

**Criterios de aceptación (comportamiento actual del sistema):**
1. Tras seleccionar un contrato, los reportes 1 (Avance físico, PDF+Excel), 2 (Avance financiero, Excel), 3 (Listado de estimaciones, Excel), 5 (Bitácora, PDF), 6 (Histórico de modificatorios, Excel) y 7 (Penalizaciones, Excel) descargan un archivo real (jsPDF para PDF, exceljs para Excel) con nombre reporte_<id>_<slug>_<periodo>_<fecha>.<ext>.
2. El reporte 4 (Observaciones) se muestra en la lista pero su botón permanece deshabilitado con el badge 'Sin fuente — falta GET de observaciones a nivel contrato' (HU-15 solo las expone por estimación).
3. El selector de periodo (Mensual/Trimestral/Acumulado) solo acota el rango de fechas donde aplica y etiqueta el nombre del archivo; NO cambia las columnas ni el contenido predefinido del reporte.
4. Solo el residente ejecuta la exportación; contratista, supervisión, dependencia y finanzas ven la vista en solo lectura con aviso de solo consulta y todos los botones de exportar deshabilitados.
5. El reporte 5 (Bitácora) solo se exporta si el contrato tiene la bitácora aperturada; si no, su botón se deshabilita con el badge 'Sin bitácora aperturada'. Los reportes vuelcan tal cual los valores que persiste el backend (carátula, pagos, convenios) y muestran el estado de estimación con su etiqueta canónica (Integrada/Presentada/Autorizada/Rechazada/Pagada).

**Fundamento legal:** art. 54 LOPSRM (presentación de estimación / plazo, sello 'Presentada' R3); art. 59 / 59 Bis LOPSRM (convenios modificatorios y ajuste de costos, R6); art. 102 LOPSRM (revisión SFP en convenios, R6); art. 138/139 RLOPSRM (pena por atraso, R7) [validar profe]; art. 191 LFD (retención 5 al millar, R7); art. 46/46 Bis (deductivas / penas convencionales, R7)

**Pendientes / [validar profe]:**
- R4 Observaciones queda DESHABILITADO: no existe GET de observaciones a nivel contrato; opción futura = fan-out client-side de revisionEstimacion por estimación (fuera del alcance actual). La ficha pide los '7 reportes' pero hoy solo 6 exportan.
- R7: fundamento legal de la pena por atraso (art.138/139 RLOPSRM) — Nivel 1, lo confirma el profe; el número cuadra exacto (derivado de la carátula) pero la cita legal está pendiente.
- Ancla del recorte por periodo (Mensual=último mes, Trimestral=último trimestre, anclado al 'dato más reciente del conjunto'): marcado [validar profe] en código y UI.
- R2: comprometido/disponible presupuestal depende de HU-20 (presupuesto_anual); hoy el resumen lo rotula 'PENDIENTE'.
- Mejora opcional NO congelada (E3): exponer e.retencion_atraso en el SELECT de historialEstimaciones para leer la pena directa en vez de derivarla.

---

## HU-20 · Tránsito a pago: carga de soportes y verificación de suficiencia presupuestal

**Rol real (quién ejecuta):** Ejecutan (nivel 'E') contratista y finanzas (permisos.js:34 — contratista:'E', finanzas:'E'). Consultan (nivel 'C') residente y dependencia. Supervisión SIN acceso (null) — no ve la HU ni en sidebar ni en Inicio (confirmado por hu-20-transito.spec.js:104-107). Coincide con la ficha vieja ("Como: contratista y finanzas").

**Historia:**
- **Como** contratista o finanzas (ejecutan); residente y dependencia consultan; supervisión sin acceso
- **Deseo** que, en una pantalla de prototipo, el sistema muestre y simule el tránsito a pago de una estimación: (1) una verificación de suficiencia presupuestal que calcula 'disponible = techo - comprometido' y marca/bloquea cuando el monto editable excede ese disponible; (2) un semáforo del plazo de 20 días calculado en vivo desde una fecha de autorización (offset dummy, cae en ámbar) con umbrales 0-10 verde / 11-17 ámbar / 18-20 rojo; (3) un checklist de tres soportes (factura, CFDI, fianza) que se marcan como cargados con un toggle local; y al cumplir ambos gates, un botón que simula generar la instrucción de pago y muestra avisos de 'instrucción generada' y 'notificación a Finanzas'
- **A fin de** prototipar el flujo de tránsito a pago y los controles legales (art. 24 y art. 54 LOPSRM) en la UI, dejando lista la DDL de backend (presupuesto_anual, instruccion_pago) para la implementación real posterior

**Criterios de aceptación (comportamiento actual del sistema):**
1. La pantalla calcula y muestra 'disponible = techo - comprometido' sobre valores dummy (techo 15M, comprometido 11.2M) y deshabilita el botón de generar cuando el monto (editable) excede el disponible, mostrando badge rojo y aviso (art. 24 LOPSRM) — solo en cliente, sin verificación server-side.
2. La pantalla muestra un semáforo de 20 días calculado en vivo como HOY - fechaAutorización (offset dummy = 13 días → zona ámbar), con umbrales 0-10 verde / 11-17 ámbar / 18-20 rojo; el 'aviso al entrar en amarillo' y la 'notificación a Finanzas' son texto estático, no una notificación real.
3. El botón 'Generar instrucción de pago' solo se habilita cuando los tres soportes (factura, CFDI, fianza) están marcados como cargados (toggle de un booleano local, sin subida real de archivo); la fianza se exige siempre (sin la condicionalidad 'cuando el contrato lo exija').
4. Al pulsar generar, la app crea un objeto en estado local y muestra el banner 'Instrucción de pago generada' y la sección 'Notificación a Finanzas' (fecha-hora, monto), sin persistir nada en backend (la instrucción no se guarda en instruccion_pago) y congelando la vista (no se puede generar una segunda).
5. La HU respeta la matriz de acceso: contratista/finanzas ejecutan; residente/dependencia ven la vista en solo lectura (sin botón de generar, con aviso de consulta); supervisión no ve la HU en sidebar ni en Inicio.

**Fundamento legal:** art. 24 LOPSRM (suficiencia presupuestaria — citado en UI y schema.sql); art. 54 LOPSRM (plazo de pago de 20 días naturales — citado en UI y schema.sql); art. 55 LOPSRM (gastos financieros por incumplimiento del plazo — citado solo en la ficha vieja, no en el código)

**Pendientes / [validar profe]:**
- TODA la HU es prototipo dummy: no hay endpoints. La DDL (presupuesto_anual, instruccion_pago) existe en schema.sql pero ningún controller la usa. Falta implementar: cargar techo real, calcular Σ pagado + neto ≤ techo server-side, persistir la instrucción y notificar a Finanzas. [validar profe / Maiki: prioridad de implementación]
- El monto de la estimación es un input editable, no se deriva de la estimación autorizada real; el 'Neto' y 'EST-2026-003 autorizada' del banner son hardcoded. Definir cómo enlazar con la estimación autorizada (flujo HU-13/HU-15) y con la fecha de autorización real para el semáforo.
- Los umbrales del semáforo (verde ≤10 / ámbar 11-17 / rojo >17) son una decisión de UI del usuario, no derivados del art. 54. Confirmar la regla de aviso (¿amarillo a qué día?).
- La condicionalidad de la fianza ('cuando el contrato lo exija', art. 54 / garantías) no está implementada — la fianza se exige siempre. Definir la regla.
- No hay carga real de soportes (factura/CFDI/fianza son toggles en memoria). Falta el upload real y su almacenamiento.
- La notificación a Finanzas y el aviso al entrar en amarillo (art. 54) son texto estático, no notificaciones reales (in-app/correo). Definir el mecanismo de notificación de Etapa 1.
- El art. 55 LOPSRM (gastos financieros por mora) que cita la ficha vieja NO se refleja en el código (ni cálculo ni texto).

---

## HU-21 · Registro del pago efectuado

**Rol real (quién ejecuta):** finanzas = 'E' (UNICO ejecutor); residente = 'C' y dependencia = 'C' (solo consulta); contratista y supervision = null (sin acceso). Evidencia: frontend/src/data/permisos.js:35. El gate del backend POST /api/pagos exige requireRole('finanzas') (backend/src/routes/pagos.routes.js:10); la lectura GET /pagos/contrato/:id se acota por participacion con esParteOSupervision (pagos.controller.js:127). La ficha vieja dice "Como finanzas" -> coincide.

**Historia:**
- **Como** finanzas
- **Deseo** registrar el pago efectuado de una estimacion previamente integrada/presentada/autorizada del contrato, seleccionandola y aportando fecha de pago, referencia bancaria SPEI, folio fiscal CFDI y fecha de factura (y opcionalmente fecha de autorizacion y observaciones), tomando el importe automaticamente del neto de la estimacion
- **A fin de** cerrar el ciclo de esa estimacion dejandola en estado 'pagada' de forma inmutable y auditable, vinculada a un pago real con la identidad de quien lo registro

**Criterios de aceptación (comportamiento actual del sistema):**
1. Al registrar el pago, la estimacion seleccionada pasa a estado 'pagada' dentro de la MISMA transaccion del INSERT del pago (pagos.controller.js:55,100,101).
2. El importe del pago NO se teclea: el servidor lo fija igual al neto de la estimacion (importe = est.neto); en la UI se muestra read-only (pagos.controller.js:89; RegistroPago.jsx:163).
3. No se paga dos veces una misma estimacion: un segundo intento devuelve 409 (UNIQUE parcial uq_pagos_estimacion + chequeo + FOR UPDATE) (schema.sql:1501; pagos.controller.js:61,72-73).
4. Solo se paga una estimacion en estado integrada / enviada(presentada) / autorizada; 'pagada' y 'rechazada' devuelven 409 (pagos.controller.js:65-71).
5. La fecha de pago no puede ser anterior al dia en que la estimacion fue integrada (integrada_en); si lo es, 400 (pagos.controller.js:80-86).
6. Son obligatorios fecha de pago, referencia bancaria SPEI, folio fiscal CFDI y fecha de factura; el registrante (registrado_por) se toma del JWT y se muestra por nombre en la lista (pagos.controller.js:37-43,97,136).
7. El pago es inmutable: cualquier UPDATE sobre la tabla pagos es bloqueado por trigger (schema.sql:503-512).
8. La consulta de pagos esta acotada por participacion en el contrato y muestra un indicador derivado del plazo de 20 dias (art. 54) sin almacenarlo (pagos.controller.js:127,137-139).

**Fundamento legal:** art. 54 LOPSRM (medios electronicos de pago / plazo de pago); art. 191 LFD (citado en pie de pagina HU-21, RegistroPago.jsx:263); art. 118 RLOPSRM (citado en la UI como base del cuadre del importe, RegistroPago.jsx:164)

**Pendientes / [validar profe]:**
- Endurecer el candado de estado a SOLO 'autorizada' (hoy permisivo: integrada/enviada/autorizada) — decision de Maiki/profe (pagos.controller.js:67-71).
- Pago PARCIAL vs EXACTO: hoy importe = neto completo de la estimacion; falta validar si procede pago parcial (comentario pagos.controller.js:88).
- 'Actualizar el avance financiero del contrato' (CA-1 viejo): hoy solo se marca la estimacion 'pagada'; no hay un acumulado/indicador financiero del contrato que se recalcule — definir si se requiere.
- Fundamento legal de que la fecha de pago no pueda ser anterior a la integracion ([validar fundamento con el profe], pagos.controller.js:79).
- fecha_autorizacion es provisional: 'pasara a HU-20 (instruccion de pago)'; mientras tanto el plazo cae a fecha_factura (base_provisional) (RegistroPago.jsx:187,242).
- Reescribir/activar los tests del formulario que hoy estan en test.fixme tras la conversion a integracion (hu-21-registro-pago.spec.js:58,81).

---

## Registro · Registro de usuario con aprobacion

**Rol real (quién ejecuta):** Solicitante (auto-registro PUBLICO, sin sesion, cualquier persona) crea la cuenta 'pendiente'. La APROBACION/RECHAZO y el listado de pendientes los ejecuta EXCLUSIVAMENTE el rol 'dependencia' (backend: usuarios.routes.js:19 requireRole('dependencia'); frontend: App.jsx:97 SoloRol roles=['dependencia']). No esta en permisos.js (es una pantalla fuera del catalogo HU x rol; el gate vive en App.jsx y en las rutas backend).

**Historia:**
- **Como** persona sin cuenta (que se auto-registra) y, del otro lado, la dependencia que autoriza
- **Deseo** registrarme capturando nombre(s) y apellido(s) por separado, correo, rol que solicito (informativo), contrasena (min. 8 caracteres con confirmacion) y opcionalmente mi empresa (catalogo con autocomplete; si es nueva se da de alta), de modo que el sistema cree mi cuenta en estado 'pendiente' sin acceso ni rol; y que la dependencia revise las solicitudes pendientes, asigne el rol efectivo (que puede diferir del solicitado), apruebe o rechace, quedando trazado quien aprobo y cuando
- **A fin de** que solo las cuentas aprobadas por la dependencia puedan ingresar, con el rol que la autoridad confirme, y que el nombre completo del usuario identifique sin ambiguedad a quien interviene en la bitacora

**Criterios de aceptación (comportamiento actual del sistema):**
1. Auto-registro PUBLICO (sin sesion): captura nombre(s)+apellido(s) (ambos obligatorios, concatenados, se exige nombre completo >=2 palabras), correo (normalizado a minusculas, unico: correo repetido = 409), rol solicitado (informativo), contrasena >=8 con confirmacion, y empresa opcional. Crea la cuenta con estado='pendiente', rol=NULL y rol_solicitado=el solicitado; NO devuelve token ni otorga acceso.
2. Login bloquea toda cuenta con estado != 'activo' (403): informa 'pendiente de aprobacion por la dependencia' si esta pendiente y 'tu solicitud fue rechazada' si fue rechazada; en ambos casos no entra.
3. Solo el rol 'dependencia' ve el listado de solicitudes pendientes (GET /usuarios?estado=pendiente, ruta gateada) y puede aprobar o rechazar; cualquier otro rol o sin token no accede al panel.
4. Al aprobar, la dependencia DEBE elegir el rol efectivo (nunca se hereda el solicitado; falta de rol = 400): se fija rol, estado='activo', aprobado_por (tomado del JWT del aprobador) y aprobado_en=NOW(). Tras la aprobacion la cuenta ya puede ingresar con el rol asignado.
5. Al rechazar, la cuenta pasa a estado='rechazado' y queda fuera de las pendientes; el solicitante recibe el mensaje de rechazo al intentar entrar.

**Fundamento legal:** art. 123 RLOPSRM

**Pendientes / [validar profe]:**
- El umbral de 'nombre completo' (>=2 palabras, regex /\p{L}{2,}/gu) lo fijo la Fundacion como regla operativa; NO tiene articulo propio (la cita art.123 RLOPSRM es por la trazabilidad en bitacora). [validar redaccion con el profe]
- Existe una pagina standalone de registro HUERFANA en /solicitud-acceso (SolicitudRegistro.jsx) sin enlace desde la UI ni cobertura de spec: decidir si se elimina o se enlaza (la version viva es la inline de la pantalla de login). [decision Maiki]
- El bloque 'sin sesion / modo demostracion' del panel de solicitudes (SolicitudesRegistro.jsx) es residuo del modo proyecto EN RETIRADA: revisar al remover el modo proyecto.

---

## Por Firmar · Firma de aperturas de bitácora pendientes (bandeja "Por firmar")

**Rol real (quién ejecuta):** No está en permisos.js (la página vive FUERA del catálogo de HU; comentario explícito en App.jsx:99). El control de acceso se ejerce por la guarda de ruta `<SoloRol roles={['residente','contratista','supervision']}>` (frontend/src/App.jsx:75). El backend NO restringe por rol: cualquier usuario autenticado puede llamar GET /bitacora/pendientes y POST /bitacora/:id/firmar; lo que acota es ser firmante del roster de esa apertura (residente, superintendente o supervisión del contrato), no el rol nominal. Nota: dependencia y finanzas quedan fuera de la ruta del frontend.

**Historia:**
- **Como** firmante del roster de un contrato (residente, superintendente/contratista o supervisión)
- **Deseo** ver en una bandeja 'Por firmar' las aperturas de bitácora donde soy firmante y todavía no firmo, y firmar mi propia parte desde mi cuenta autenticada
- **A fin de** que mi firma quede registrada con mi identidad (del token) y fecha/hora, y que la apertura se marque como completa cuando todos los firmantes hayan firmado, habilitando la emisión de notas

**Criterios de aceptación (comportamiento actual del sistema):**
1. La bandeja (GET /bitacora/pendientes) lista SOLO las aperturas donde el usuario del token es firmante y aún no firmó (firmado=false), mostrando folio, objeto, su rol en la firma y la fecha de apertura; si no hay, muestra estado vacío.
2. Firmar (POST /bitacora/:aperturaId/firmar) registra firmado=true y firmado_en=NOW() para el usuario del JWT; la identidad sale del token, nunca del body; nadie puede firmar por otro.
3. Si el usuario no pertenece al roster de esa apertura -> 403; si ya había firmado -> 409 (la UI muestra el aviso correspondiente).
4. El estado 'completa' se DERIVA al leer: es completa cuando no quedan firmas pendientes (residente + superintendente + supervisión si aplica); la respuesta de firmar indica cuántas firmas faltan.
5. Mientras la apertura no esté firmada por TODOS los participantes, no se pueden emitir notas (candado server-side, art. 123 fr. III).

**Fundamento legal:** art. 123 fr. III RLOPSRM

**Pendientes / [validar profe]:**
- La ficha vieja no tiene número de HU (es 'Por Firmar', SRV-03-05 / MOD-03); confirmar con el profe si se le asigna identificador formal o queda como sub-historia de HU-08.
- Confirmar matriz de acceso: el backend NO filtra por rol nominal (cualquier autenticado llega al endpoint, solo el roster firma); la restricción de roles es únicamente la guarda de ruta del frontend (SoloRol residente/contratista/supervision). Validar si dependencia/finanzas deben quedar excluidas también server-side.
- Confirmar que la composición del roster de firmantes (residente + superintendente + supervisión-si-existe) es la lista de 'firmantes autorizados' esperada por el profe (art. 123 fr. III).

---

## HU-22 · Sustitucion de personas del roster (art. 125 fr. I g RLOPSRM) · 🆕 **NUEVA** (sin ficha previa)

**Rol real (quién ejecuta):** dependencia y residente (App.jsx:100 SoloRol roles=['dependencia','residente']; link Sidebar.jsx:92; backend roster.controller.js:113-116: dependencia O residente_id O created_by; GET leerRoster controller:40 esParteOSupervision; spec roster-sustitucion.spec.js:14,32). Fuera de permisos.js (grep sin coincidencias). Autoridad [validar profe] controller:110.</parameter>
<parameter name="titulo">DECOY-SLOT-4

**Historia:**
- **Como** Dependencia o residente asignado al contrato (nivel E; contratista, supervision y finanzas NO acceden)
- **Deseo** ver el roster vigente del contrato (residente, superintendente, supervision) con el historial de quien ocupo cada rol y desde cuando, y registrar una sustitucion seleccionando rol, una nueva persona (de una lista de cuentas reales activas con el rol de cuenta correcto) y un motivo obligatorio, de modo que el sistema cierre la asignacion anterior conservandola en el historico, cree la nueva como vigente ligada a la anterior, sincronice el cache de acceso del contrato y, si la bitacora esta abierta, asiente automaticamente la nota de sustitucion (si no, la difiera)
- **A fin de** cumplir el art. 125 fr. I inciso g RLOPSRM sustituyendo a la persona SIN borrarla, preservando la trazabilidad e integridad de firmas ya registradas (que conservan a su firmante original)

**Criterios de aceptación (comportamiento actual del sistema):**
1. Solo dependencia y residente ven el link y la pagina /contratos/roster (SoloRol); el resto se redirige. El backend solo permite sustituir si el usuario es dependencia, o el residente_id, o el creador del contrato (403 en otro caso).
2. La sustitucion exige rol valido, una nueva persona EXISTENTE, ACTIVA y con el rol de cuenta esperado (residente->residente, superintendente->contratista, supervision->supervision) y motivo NO vacio; 400 si no cumple; 400 'ya ocupa ese rol' si es el mismo titular.
3. En UNA transaccion: cierra la anterior (vigencia_hasta=hoy, queda en historico, NUNCA se borra), crea la nueva ACTIVA con sustituye_a y registrado_por del JWT, y sincroniza el cache escalar. El indice unico parcial garantiza una sola activa por rol; el trigger impide reasignar/re-cerrar.
4. Con bitacora abierta y titular anterior se asienta automatica y atomicamente una nota 'res_sustitucion'; sin bitacora la sustitucion se realiza igual y la nota se DIFIERE hasta abrir la bitacora.
5. La nueva persona SIEMPRE se selecciona de cuentas reales (no se teclea el ID); lista vacia -> aviso sin captura. Una firma previa conserva a su firmante original (no se tocan tablas bitacora_*).

**Fundamento legal:** art. 125 fr. I inciso g RLOPSRM; art. 123 fr. III RLOPSRM

**Pendientes / [validar profe]:**
- Autoridad para sustituir: dependencia O residente asignado O creador, [validar con el profe] (roster.controller.js:110-116).
- Emisor formal de la nota: hoy el ejecutor (JWT); [validar profe] si debe ser el residente (controller:183).
- Convencion rol-roster -> rol-cuenta (superintendente=contratista), [validar con el profe] (controller:23-24).
- Funcionalidad SIN ficha de HU (no en .work_hu_xlsx.txt ni permisos.js): falta formalizarla.
- Nota diferida: la fila queda con nota_id nulo hasta abrir la bitacora; verificar que al asentarse quede vinculada (controller:188).

---

## HU-23 · Catalogo de empresas (Oleada O3) · 🆕 **NUEVA** (sin ficha previa)

**Rol real (quién ejecuta):** Funcionalidad SIN gate de rol en permisos.js (no es una HU del catalogo HU x rol). El catalogo y el registro con empresa son PUBLICOS (sin token): el alta de la empresa la ejecuta CUALQUIER persona que se registra (rol solicitado libre: contratista/supervision/residente/etc.). El consumo del catalogo: (a) autocomplete en el registro = cualquiera (publico, sin sesion); (b) aviso "misma empresa" en el alta de contrato = quien tenga acceso al alta (residente, segun permisos de HU-01); (c) busqueda por empresa en el expediente = quien tenga acceso al expediente (ConsultaExpediente). No existe un endpoint de administracion del catalogo: se llena solo, por "resolver-o-crear" al registrarse.

**Historia:**
- **Como** como persona que se registra en el sistema (publico, sin sesion) y como residente que da de alta un contrato y como cualquier rol que consulta el expediente
- **Deseo** deseo que al registrarme ELIJA mi empresa de un SELECTOR del catalogo unico (sesion autonoma 16-jun; "el primero la crea, los siguientes la eligen, ya no la registro completo" — profe 09-jun), con la opcion explicita "registrar nueva empresa" solo si de verdad no existe; que el sistema deduplique por nombre normalizado FUERTE como segunda red (mayusculas/espacios + acentos + puntuacion + sufijos de razon social tipo 'SA de CV'), que el alta de contrato muestre la empresa de la cuenta elegida y me AVISE (sin bloquear) cuando superintendente y supervision son de la misma empresa, y que el expediente muestre la empresa de cada persona y permita buscar por empresa
- **A fin de** a fin de eliminar los duplicados de razon social ('patito'/'PAT'/'patito SA' como 3 empresas) que el profe senalo, dejar la empresa vinculada a cada persona como dicta 'catalogos: es lo de ley', y poder advertir cuando la supervision no es un tercero independiente del contratista

**Criterios de aceptación (comportamiento actual del sistema):**
1. Registro con empresa: el campo es un SELECTOR del catalogo (sesion autonoma 16-jun; data-testid reg-empresa-select) — NO texto libre, asi es imposible duplicar tecleando variantes. Se ELIGE una empresa existente; la opcion "➕ Registrar nueva empresa" revela un input (reg-empresa-nueva) solo cuando de verdad no existe, y al enviarla queda en el catalogo (GET /api/auth/empresas), disponible para los demas. Probado en o3-empresas.spec.js (registro NUEVA via selector).
2. Registro ELIGIENDO empresa existente del selector: NO se duplica (se manda el nombre EXACTO del catalogo). Segunda red FUERTE (FASE 3): si en la rama "nueva" se teclea una VARIANTE con acentos/puntuacion/sufijo de razon social ('Constructóra Demo' o 'Constructora Demo, S.A. de C.V.'), el backend (resolverOCrearEmpresa, normalizarNombreEmpresaFuerte) la resuelve a la MISMA empresa y el front avisa 'ya existe… selecciónala' (data-testid reg-empresa-existente). El indice unico debil uq_empresas_nombre_norm queda como respaldo. Probado en o3-empresas.spec.js (EXISTENTE via selector; variante por API reutiliza; aviso UI).
3. El campo Empresa es OPCIONAL: si se deja vacio, el registro sigue funcionando y usuarios.empresa_id queda NULL (retrocompatible); empresa_id viaja en los SELECT, nunca en el JWT.
4. Alta de contrato: cuando el superintendente y la supervision comparten empresa_id se muestra el aviso 'aviso-misma-empresa' con el nombre de la empresa y la leyenda de que la supervision debe ser un tercero independiente; el aviso NO bloquea el wizard y desaparece al cambiar la supervision. Probado en o3-empresas.spec.js (aviso misma empresa).
5. Expediente: muestra la empresa junto a cada persona del equipo y del roster, y permite buscar por 'empresa' filtrando los bloques (juridicos y roster) que no contienen el termino. Probado en o3-empresas.spec.js (expediente muestra empresa + busqueda por empresa).

**Pendientes / [validar profe]:**
- El aviso de 'misma empresa' (superintendente vs supervision) hoy AVISA pero NO bloquea; el propio codigo (AltaContrato.jsx:282) lo marca '[validar con el profe]' por si debe ser bloqueo duro.
- El feature no cita articulos en el codigo (la justificacion 'catalogos: es lo de ley' es verbal del profe, no hay numero de articulo en el codigo) -> sin cita legal verificable. Confirmar el fundamento legal del catalogo y de la regla supervision=tercero independiente.
- Hay DOS formularios de registro con la misma logica de empresa (SeleccionRol.jsx con testids reg-* y SolicitudRegistro.jsx con testids sol-*); ambos comparten ya el normalizador fuerte (frontend/src/data/empresa.js). Confirmar si ambos deben coexistir o si uno es legado (duplicacion a consolidar).
- FASE 3 (15-jun): las REGLAS de normalizacion fuerte (que sufijos de razon social se recortan, que se funde) estan [validar profe]; el match es conservador (no usa similitud difusa) para no fundir empresas legitimamente distintas. Para duplicados YA existentes en la BD hay un script de mantenimiento idempotente backend/scripts/consolidar_empresas.js (dry-run por defecto, --apply para fusionar: repunta usuarios.empresa_id a la canonica y borra las duplicadas). Un indice unico fuerte a nivel BD (DDL con funcion IMMUTABLE) queda como mejora opcional para Maiki.
- La extension de auth.controller.register la marca el propio doc OLEADA3 como 'tension de alcance' (el prompt pedia NO tocar auth core; se interpreto auth core = JWT/login/middleware). Confirmar con Maiki que la edicion de register es aceptable.
- El endpoint GET /api/auth/empresas es publico (sin token) y expone todas las razones sociales del catalogo; confirmar que eso es deseable (se asumio dato no sensible).

---
