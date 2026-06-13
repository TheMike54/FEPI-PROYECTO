# SIGECOP — Auditoría de coherencia Historia ↔ Sistema (12-jun-2026)

> **Objetivo:** que no se repita lo del "plan de amortización" (un criterio en la ficha que no estaba
> construido). Cada criterio de cada historia se contrastó contra el código real. **Nada se construyó**
> en esta auditoría: las brechas se anotan como recomendación para que **Maiki/el profe** decidan.
>
> Leyenda **construido**: ✅ sí · 🟡 parcial · ❌ no. Evidencia = `archivo:línea` / endpoint / spec.

## Resumen ejecutivo

- Criterios de ficha auditados: **69** → ✅ 35 · 🟡 27 · ❌ 7
- Historias revisadas: **26** (HU-00..HU-21 + Registro + Por Firmar + 2 nuevas HU-22/HU-23).

### ❌ Criterios de ficha NO construidos (brechas duras — requieren decisión)

| HU | Criterio de la ficha (no construido) | Por qué / qué hay en su lugar |
|---|---|---|
| HU-02 | La póliza registrada puede consultarse en formato PDF desde el listado de fianzas del contrato. | El campo 'Archivo PDF' del modal solo captura el NOMBRE del archivo (handleArchivo, RegistroFianzas.jsx:320-323); no se sube ni se almacena. 'Ver PDF' muestra un ícono y el nombre, nunca el documento. |
| HU-04 | Cada documento del expediente puede descargarse INDIVIDUALMENTE desde su bloque. | El comportamiento se INVIRTIO respecto a la ficha: ya NO hay descarga por bloque; hay UNA sola exportacion del expediente completo a PDF via impresion consolidada del navegador (print CSS + window.pri |
| HU-07 | Se pueden crear, pausar y eliminar alertas por concepto sin alterar las del resto. | El modelo de configuracion por el usuario fue ELIMINADO en el rediseno del profe (O5/P15). Ya no se crean ni se pausan alertas: el panel deriva el atraso automaticamente al consultar. Quedan dummies m |
| HU-07 | La alerta solo dispara cuando el avance real es menor al umbral configurado por el usuario. | El disparo NO depende de un umbral del usuario: aparece cualquier concepto cuyo ejecutado va por debajo de lo programado al periodo en curso. El umbral configurable se sustituyo por 'deficit > 0' fijo |
| HU-07 | La notificacion se entrega por el canal elegido al configurar la alerta (sistema o correo). | No hay seleccion de canal. El aviso es siempre dentro del sistema (banner + campana) y solo se muestra a los roles con acceso a HU-07 (gateado por useVistaHU('HU-07').sinAcceso en Inicio.jsx:14 y AppS |
| HU-11 | Una minuta o registro de visita puede adjuntarse como referencia en una nota de bitacora (HU-09). | Funcionalidad NO construida: es texto que remite a HU-09. El adjuntar/vincular real nunca ocurre. La columna minutas.nota_id existe en el esquema pero esta huerfana (sin codigo que la escriba). |
| HU-13 | El boton Enviar se deshabilita cuando se vencen los 6 dias naturales del periodo de presentacion (art. 54 LOPSRM) | Decision de diseno CAMBIADA: el plazo de 6 dias se degrado de candado a referencia visual no bloqueante (aviso ambar 'Fuera de los 6 dias'). El sistema permite presentar fuera de plazo. |

> 🟡 Los criterios **parciales** (difieren de lo pedido pero existen) se detallan por HU abajo;
> son candidatos a **ajustar la ficha** al comportamiento real, no necesariamente a construir.

---

## HU-00 · Inicio de sesion por rol

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| Valida usuario y contrasena, bloquea acceso si son invalidos y no permite continuar con campos vacios | 🟡 parcial | backend/src/controllers/auth.controller.js:26-28 (campos vacios -> 400 'email y password son requeridos'), :36-43 (usuario inexistente o password mal -> 401 'Credenciales invalidas' via bcrypt.compare). Frontend muestra  | Validacion de invalidos y vacios SI existe, pero el bloqueo de 'campos vacios' es SERVER-SIDE (400): el frontend NO tiene 'required' ni deshabilita el boton con campos vacios (SeleccionRol.jsx:54-80, inputs sin required, |
| Deduce el rol a partir del identificador, sin que el usuario lo seleccione, y muestra solo las pantallas/opciones de ese rol | ✅ sí | El login solo envia {email,password} (api.js:28, SesionContext.jsx:34-35); el rol sale de la columna 'rol' de la BD y se firma en el JWT (auth.controller.js:31,53-54,61). El control por rol se aplica con permisos.js (PER | Matiz: el 'identificador' es el email, no un usuario aparte. El rol lo ASIGNA la dependencia al aprobar el alta (no se autodeduce del email); el usuario solo SOLICITA un rol informativo al registrarse (auth.controller.js |
| Cada accion registrada queda asociada al nombre del usuario y fecha/hora | ✅ sí | El JWT lleva {id, rol, nombre} (auth.controller.js:53-54). Los registros formales toman el actor del JWT, nunca del body: p.ej. notas de bitacora insertan emisor_id=req.user.id y firmado_en/fecha con NOW() (bitacora.cont | Se cumple via id+timestamp server-side; el 'nombre' visible viaja en el token. La regla de nombre COMPLETO (>=2 palabras) refuerza este criterio para la bitacora art.123 RLOPSRM (auth.controller.js:18,78-82). |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- Auto-registro publico con aprobacion: existe POST /auth/register que crea la cuenta en estado 'pendiente' (sin token) y la dependencia la aprueba/asigna rol despues (auth.controller.js:68-119; flujo e2e completo en hu-registro.spec.js:38-104). La ficha vieja no menciona alta de cuentas.
- Tercer estado de bloqueo de login: cuenta no 'activo' -> 403 con mensaje distinto segun pendiente ('pendiente de aprobacion por la dependencia') o rechazada ('tu solicitud fue rechazada'), incluyendo el campo estado (auth.controller.js:20-21,48-51).
- Persistencia de sesion en localStorage (sigecop_token / sigecop_user): un F5 no pierde el login y restaura rol/usuario (SesionContext.jsx:10-32). Logout limpia ambos (SesionContext.jsx:43-49).
- JWT con expiracion (JWT_EXPIRES_IN o 8h por defecto); token invalido/expirado -> 401 (auth.controller.js:55-56, auth.middleware.js:11-17).
- Regla de nombre completo (>=2 palabras, /\p{L}{2,}/gu) exigida en registro, cliente y servidor (auth.controller.js:18,80; SeleccionRol.jsx:99,146), citando art.123 RLOPSRM.
- Contrasena minima de 8 caracteres en registro (auth.controller.js:83; SeleccionRol.jsx:150).
- Empresa opcional (catalogo O3) vinculada en el registro via resolverOCrearEmpresa, sin afectar login/JWT (auth.controller.js:96-99, empresa_id nunca va al token).
- Lista cerrada de 5 roles validos en backend (ROLES_VALIDOS, auth.controller.js:7) espejo de ROLES en frontend (permisos.js:1-7).
- Email se normaliza a lower+trim en el registro (auth.controller.js:89), pero NO en el login (la busqueda usa el email tal cual, auth.controller.js:30-32) -> posible asimetria de mayusculas no documentada.

**Recomendaciones / [validar profe]:**
- La ficha vieja pedia 'no permite continuar con campos vacios': hoy ese bloqueo es server-side (400). Decidir si se quiere ademas un candado de cliente (required / boton deshabilitado) o se acepta el comportamiento actual. [validar profe/Maiki]
- Asimetria de normalizacion de email: el registro guarda el correo en minusculas, pero el login lo busca tal cual se teclea. Confirmar si el login debe normalizar igual para evitar fallos por mayusculas. [validar Maiki]
- Gate de pago PERMISIVO mencionado en el contexto del flujo no es de HU-00, pero la deduccion de rol que habilita finanzas si lo es: confirmar que finanzas no requiere reglas extra de acceso. [validar profe]

---

## HU-01 · Alta de contratos

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| Existe un contrato con folio unico que contiene en UNA sola entidad todos los bloques: datos generales, equipo (residente/superintendente/supervision) ligado a  | ✅ sí | backend/src/controllers/contratos.controller.js:319-415 (transaccion unica: INSERT contratos + contrato_roster + contrato_conceptos + contrato_actividades + contrato_garantias + contrato_periodos/guardarMatriz + plan_amo | Matiz importante: el PDF firmado NO entra en la misma transaccion del alta. El contrato se crea primero (POST /api/contratos) y el PDF se sube despues en un 2do request (POST /:id/documento), aunque la VISTA lo retiene d |
| No permite guardar hasta que: todos los obligatorios esten llenos, folio unico, suma del catalogo = monto (subtotal SIN IVA), cada concepto con cantidad y PU >  | ✅ sí | REQUIRED_FIELDS=['folio','tipo','objeto','plazoDias','fechaInicio'] (controller:16-18). Monto DERIVADO = SUM(ROUND(cantidad*pu,2)) sin IVA (controller:138). cantidad>0 y pu>0 por concepto (controller:124-125). termino DE | El sistema ENDURECIO el criterio mas alla de lo pedido: el programa de obra exige cuadre EXACTO al 100% por concepto (Sigma planeado = contratado, guardarMatriz/PROGRAMA_DESCUADRE), no solo 'dentro del plazo'. Garantias: |
| El PDF firmado es parte del expediente, ligado cuando se cargue, INMUTABLE una vez cargado (no se reemplaza) y consultable por los actores autorizados. | ✅ sí | Append-only por tipo: si ya existe documento de ese tipo -> 409 'es inmutable y no se puede reemplazar' (controller:577-582). Solo el residente ASIGNADO sube (controller:573-575). Consulta acotada por participacion: docu | La inmutabilidad es por TIPO de documento ('contrato' y 'anticipo_autorizacion' son dos slots independientes, cada uno append-only). No hay trigger de BD citado aqui; la inmutabilidad la impone el controller (chequeo de  |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- El monto del contrato NO se captura: se DERIVA server-side = Sigma ROUND(cantidad*pu,2) con NUMERIC de Postgres (misma formula que el subtotal de estimaciones), cuadre EXACTO al centavo sin tolerancia (controller:127-148). Es la 'fuente unica de verdad' del presupuesto (art.45 fr.IX RLOPSRM). La ficha vieja decia 'suma del catalogo = monto' pero el monto ni siquiera viaja en el body.
- El programa de obra es una MATRIZ concepto x periodo (art.45 ap.A fr.X RLOPSRM) con ciclo mensual/quincenal (art.54), no 'actividades mes a mes' de texto libre. Exige cuadre al 100% por concepto (Sigma planeado = contratado); el backend lo revalida en SQL (guardarMatriz, codigo PROGRAMA_DESCUADRE). Los periodos los genera el backend, no se confia en el cliente (controller:195-227).
- Plan de amortizacion del anticipo EDITABLE por periodo (paso 5 del wizard), con default proporcional al centavo si no se manda; Sigma cuotas = monto del anticipo EXACTO (art.138 fr.I RLOPSRM). Solo aparece con anticipo>0; sin anticipo el paso se OMITE. La caratula G2 todavia amortiza proporcional [Fase B pendiente profe] (controller:229-269, AltaContrato.jsx:1554-1576).
- Equipo del contrato ligado a CUENTAS reales y validadas (no texto): superintendente=cuenta rol 'contratista' aprobada (OBLIGATORIO), dependencia=cuenta rol 'dependencia' aprobada (OBLIGATORIO), supervision=cuenta rol 'supervision' (OPCIONAL). El texto de las columnas contratista/dependencia se DERIVA del nombre de la cuenta. Correccion del profe 04-jun (controller:271-312).
- Se siembra contrato_roster (historico 1:N, art.125) DESDE EL ALTA dentro de la transaccion: residente, superintendente y supervision (la dependencia NO entra al roster porque no firma la bitacora, art.123). Habilita la sustitucion-no-borrar (controller:340-355).
- Segundo PDF: 'autorizacion del anticipo' (tipo='anticipo_autorizacion'), OBLIGATORIO cuando %anticipo > 30% (ANTICIPO_UMBRAL_PDF). Bloquea avance y guardado. La vista cita art.50 fr.IV LOPSRM y avisa de art.139 RLOPSRM (>50% -> informar a SFP) y art.50 fr.V (100% solo plurianual ultimo trimestre). El umbral 30 esta [validar profe] (AltaContrato.jsx:33-39,505-589,1503-1513).
- Gating del wizard estrictamente secuencial (pasoMaxAlcanzado high-water mark): una pestana solo desbloquea la SIGUIENTE, no se salta pasos; tras guardar resetea el formulario y redirige a 'Registrados' (AltaContrato.jsx:1609-1626,1713-1756).
- Campo opcional % de pena por atraso (penaConvencionalPct, fraccion 0-1, penas convencionales art.138/139 RLOPSRM) capturado en datos generales; vacio = sin pena (controller:82-88).
- Validaciones de coherencia/limites no documentadas: garantia con vigencia vencida se rechaza (vigencia >= hoy, con offset UTC-1 dia, controller:183-192); garantia no puede exceder el monto del contrato (controller:177-182); clave de concepto OBLIGATORIA y UNIQUE(contrato_id, clave) capturada por el usuario (controller:110-118); topes NUMERIC para evitar 22003; objeto del contrato es campo requerido (no estaba explicito en la ficha).
- Acceso de lectura segmentado: listarContratos/detalleContrato — dependencia y finanzas ven TODOS; operativos (residente/contratista/supervision) solo los contratos donde son parte (ROLES_VEN_TODO + esParteOSupervision, controller:462-543).

**Recomendaciones / [validar profe]:**
- El umbral del 30% que dispara el PDF de autorizacion del anticipo: el valor exacto y su fundamento legal del UMBRAL estan marcados [validar profe] en el codigo (la exigencia de autorizacion escrita se apoya en art.50 fr.IV LOPSRM, pero el 30 no se asume de la ley).
- El plan de amortizacion es editable y se persiste, pero la CARATULA de estimacion (G2) todavia amortiza proporcional, no segun el plan capturado: 'Fase B pendiente de validar con el profe'.
- La cedula profesional como dato juridico obligatorio se exige 'por decision de la Fundacion' [validar con el profe].
- El fundamento de exigir el PDF firmado para que el contrato exista/se formalice lo confirma el profe; el codigo NO asume numero de articulo para esa regla.
- El % de pena por atraso (penaConvencionalPct) y su tasa estan marcados [validar tasa con el profe].
- La ficha vieja menciona 'penalizaciones aplicables' como bloque: en el sistema actual se reduce a un % de pena por atraso opcional + avisos en la vista (5 al millar art.191 LFD, deductivas art.46 Bis); no hay un editor de penalizaciones por concepto.

---

## HU-02 · Registro de fianzas y garantías

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| La póliza queda ligada al contrato con afianzadora, vigencia y monto registrados. | 🟡 parcial | RegistroFianzas.jsx:276-359 (CRUD 100% en useState, sin api.js — no importa servicios); persistencia REAL solo existe vía el alta HU-01: contratos.controller.js:378 INSERT INTO contrato_garantias (contrato_id, tipo, afia | El vínculo póliza↔contrato con afianzadora/vigencia/monto SÍ se materializa, pero en el alta del contrato (HU-01), no en esta pantalla. RegistroFianzas siempre muestra fianzasListadoDummy (dummy.js:50) con un contratoDum |
| El sistema emite alerta cuando faltan 30, 15 y 5 días para el vencimiento (configurable). | 🟡 parcial | RegistroFianzas.jsx:43-77 badgePorDias() con umbrales 30/15/5 HARDCODEADOS + tarjetas de conteo (líneas 366-414). No hay motor real: alertas.controller.js no menciona garantías/fianzas/vigencia (grep vacío); no hay corre | Son badges visuales y contadores calculados en el navegador sobre la lista en memoria. NO es 'configurable' (umbrales fijos en código) ni hay emisión real de alerta. Las únicas barreras de vigencia reales viven en el alt |
| La póliza registrada puede consultarse en formato PDF desde el listado de fianzas del contrato. | ❌ no | ModalVerPdf en RegistroFianzas.jsx:228-267 es un placeholder visual ('El visor incrustado se conecta al storage del backend en SRV-02-04', línea 253). El backend NO guarda el PDF de la póliza: el INSERT de garantías (con | El campo 'Archivo PDF' del modal solo captura el NOMBRE del archivo (handleArchivo, RegistroFianzas.jsx:320-323); no se sube ni se almacena. 'Ver PDF' muestra un ícono y el nombre, nunca el documento. |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- Edición de pólizas in-situ: botón ✏️ (RegistroFianzas.jsx:485-495) abre el mismo modal precargado para editar una póliza ya listada — no estaba en la ficha. Es solo dummy (muta useState).
- Folio correlativo automático F-2026-XXXXX: proximoFolio() (RegistroFianzas.jsx:79-87) sugiere el siguiente número al agregar.
- Tipos de póliza fijos en esta pantalla: Cumplimiento / Anticipo / Vicios ocultos (TIPOS_POLIZA, RegistroFianzas.jsx:8) — sin 'Otra' (el alta HU-01 sí ofrece 'Otra', AltaContrato.jsx:90).
- Tabla garantia_endosos con trigger de inmutabilidad append-only (schema.sql:977-1003), preparada para endosos por convenio (art.98 fr.II / art.99 RLOPSRM), PERO está MUERTA: ningún controller/route/server.js la lee ni escribe (grep en backend vacío). Cubriría el 'historial de fianzas y sus endosos por modificatorios' de la HISTORIA, que no se construyó.
- Las garantías capturadas en el alta SÍ se exponen read-only en el expediente HU-04: detalleContrato devuelve garantias.rows (contratos.controller.js:527-537, SELECT FROM contrato_garantias), pero esa lectura real NO la usa la pantalla HU-02.
- Validaciones de coherencia de garantía en el alta (no en HU-02): monto de póliza no puede exceder el monto del contrato (contratos.controller.js:180-182) y vigencia no puede estar vencida al formalizar (líneas 187-191, cita revisión profe 09-jun).
- Cita legal en la pantalla: Art. 48 LOPSRM (15 días naturales para otorgar fianzas) como pie de página (RegistroFianzas.jsx:506-509).

**Recomendaciones / [validar profe]:**
- Conectar la pantalla al backend real: leer contrato_garantias del contrato en sesión y persistir altas/ediciones (hoy todo es dummy en memoria) [validar profe / Maiki].
- Almacenamiento real del PDF de la póliza (no existe columna ni subida); definir storage (mencionado como SRV-02-04 en el placeholder) [validar profe].
- Emisión REAL de alertas de vencimiento (30/15/5) y su 'configurabilidad': hoy son badges/contadores en el navegador con umbrales fijos; no hay motor de notificación en alertas.controller.js [validar profe].
- Historial de fianzas y endosos por modificatorios (parte de la HISTORIA): la tabla garantia_endosos existe en schema con trigger de inmutabilidad pero NO está cableada (sin controller/route); decidir si se implementa el ciclo de endosos (art.98 fr.II / art.99 RLOPSRM) [validar profe].
- Discrepancia de rol con la HISTORIA: la ficha dice 'Como dependencia', y el sistema lo respeta (dependencia='E'); confirmar que residente/finanzas deban quedar en solo-consulta y contratista/supervisión sin acceso.

---

## HU-03 · Trámite y aplicación de convenios modificatorios

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| Al registrarse el modificatorio se genera una nueva versión del catálogo y del programa, sin alterar la versión anterior | ✅ sí | convenios.controller.js:182-184 (snapshot perezoso de v1 antes de mutar), 263-279 (re-cuadre + nueva versión vigente, supersede la anterior con vigente=false/supersedido_en); schema.sql:1412-1477 (programa_version + conc | MATIZ FUERTE: la versión nueva SOLO se crea cuando el convenio toca el programa (tipos monto/programa/mixto, controller:118 tocaPrograma, :265). Un convenio de PLAZO PURO actualiza contratos.plazo_dias/fecha_termino pero |
| El sistema indica si el modificatorio se rige por el art. 59 (ordinario) o por el art. 59 Bis (ajuste de costos cuando se supera 50% del monto o del plazo) | 🟡 parcial | convenios.controller.js:225 fundamento SIEMPRE='art59' (NO hay rama que lo ponga en 'art59bis', aunque el CHECK lo permite, schema.sql:1344); en su lugar marca FLAGS: requiere_revision_sfp si \|Δ\|>25% (art.102 RLOPSRM,  | DIFIERE de la ficha: el sistema NO clasifica 'ordinario vs 59 Bis' como un fundamento alternativo; el convenio se funda SIEMPRE en art.59 y el 59 Bis se trata como un DERECHO ADICIONAL (flag requiere_ajuste_costos), no c |
| El histórico de versiones registra fecha, autor y motivo del cambio, y los endosos correspondientes a las fianzas asociadas al modificatorio | 🟡 parcial | FECHA: convenios_modificatorios.fecha (DATE) + created_at (TIMESTAMPTZ) schema.sql:1346,1356, mostrados en jsx:610,613. AUTOR: autorizado_por del JWT (controller:258 req.user.id), join a usuarios.nombre (controller:76-78 | Fecha+autor+motivo: SÍ. Endosos a fianzas: NO construido en HU-03. La tabla garantia_endosos existe con FK garantia_endosos.convenio_id→convenios_modificatorios (schema.sql:1479-1492) pero la pertenece a HU-02 (Equipo 2, |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- Guardrail de variación PARAMETRIZABLE que BLOQUEA el registro: si |Δmonto| o |Δplazo| > CONVENIO_LIMITE_VARIACION_PCT (default 25), el backend responde 400 y NO crea el convenio (controller:24,169-180; spec hu-03-convenios.spec.js:190-205 plazo +33% → 400, y :407-422 monto +30% → 400). Es decisión de configuración, NO tope legal del art.59 (la ficha no lo menciona).
- Candado art. 118 RLOPSRM: un convenio de programa NO puede reducir la cantidad contratada de un concepto por debajo de lo ya estimado en estimaciones no rechazadas → 400 (controller:152-163; spec :388-405).
- Cuadre 100% por concepto (Σ celdas = cantidad contratada, tolerancia media milésima) revalidado server-side vía guardarMatriz; la UI bloquea el botón si descuadra (jsx:266,291,304; spec :295-319).
- Monto y % de variación DERIVADOS server-side (Σ ROUND(cant×pu,2), fuente única al centavo art.45 fr.IX); el usuario NO teclea el monto, solo cantidad/PU del catálogo (controller:212-214,219; jsx:254-273; comentario jsx:13-16).
- Nota AUTOMÁTICA en la bitácora al registrar el convenio (O6): si hay bitácora abierta se asienta en vivo y se liga (nota_id), si no, se DIFIERE y se asienta al abrir la bitácora; emisor = residente_id del contrato, tipo 'res_convenios', tag 'convenio' (controller:231-249,282-283; schema.sql:1363-1369; spec o6-convenios-bitacora.spec.js).
- El catálogo NUEVO debe incluir TODOS los conceptos existentes (catálogo completo) y sin claves repetidas, o 400 (controller:125-127,164-168).
- Acotamiento por participación: solo partes/supervisión del contrato pueden listar convenios/versiones (esParteOSupervision, controller:73,95); 403 en otro caso.
- Inmutabilidad total: convenios_modificatorios y programa_version son append-only (triggers schema.sql:1402-1404 y la transición controlada :1432-1451); el router NO expone PATCH/DELETE (convenios.routes.js:10-12); corregir = convenio nuevo (UI sin controles de edición, spec :207-223).
- Tipos de convenio: monto, plazo, programa y mixto (4 tipos, controller:116; jsx:55), todos creables — la ficha solo hablaba de 'monto, plazo o conceptos'.
- Convenio de plazo recalcula fecha_termino desde fecha_inicio + (plazo-1) días; la regeneración de periodos por cambio de plazo queda como follow-on, el programa conserva los periodos vigentes (controller:191-196).
- Acceso directo desde el expediente HU-04 vía query ?contrato=ID que preselecciona el contrato (jsx:160-169).

**Recomendaciones / [validar profe]:**
- ENDOSOS DE FIANZAS: la ficha vieja pedía que el modificatorio aplicara y registrara los endosos correspondientes a las fianzas; HU-03 NO lo construye (el controller nunca toca garantia_endosos). La tabla y la FK garantia_endosos.convenio_id existen (HU-02) pero no hay generación automática de endoso al registrar el convenio. Validar con el profe si HU-03 debe disparar el endoso o si queda como integración futura HU-02↔HU-03.
- fundamento art.59 vs art.59 Bis: el sistema funda SIEMPRE el convenio en art.59 y trata el 59 Bis como derecho adicional (flag), NO como régimen alternativo. La ficha pedía 'indicar si se rige por 59 o 59 Bis'. Confirmar que la interpretación flag (no toggle de fundamento) es la correcta legalmente.
- Autoridad que registra: comentario controller:140-143 marca '[validar con el profe]' que dependencia O residente O creador pueden registrar; la matriz frontend (permisos.js) solo da nivel 'E' a dependencia. Confirmar el conjunto exacto de roles autorizados.
- Emisor de la nota automática de bitácora = residente del contrato (O-PROFE), marcado '[validar profe]' en controller:235-244.
- Guardrail del 25% (CONVENIO_LIMITE_VARIACION_PCT): es decisión de configuración, no tope legal del art.59 (que en la reforma DOF 14-11-2025 no fija tope numérico). Confirmar valor/aplicabilidad con el profe.
- Regeneración de periodos al cambiar el plazo: hoy el convenio de plazo conserva los periodos vigentes (no los re-mapea); follow-on declarado en controller:194-195.

---

## HU-04 · Consulta integrada del expediente contractual

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| El expediente muestra en UNA sola vista los 5 bloques (configuracion, catalogo, programa, fianzas, documentos juridicos); consulta acotada a actores parte del c | ✅ sí | frontend/src/pages/ConsultaExpediente.jsx:554-649 (array bloques) y :764-769 (render unico de TODOS los bloques). Acotamiento server-side: backend/src/controllers/contratos.controller.js:522-523 (403 si !esParteOSupervis | Se construyo AMPLIADO: ademas de los 5 bloques de la ficha (config, catalogo, programa, fianzas, juridicos) hoy hay 9 bloques: + Plan de amortizacion del anticipo, Roster/sustituciones (art.125), Convenios modificatorios |
| El buscador filtra los bloques por folio, contratista, objeto, periodo o tipo de documento, con logica Y. | ✅ sí | frontend/src/pages/ConsultaExpediente.jsx:20-27 (CAMPOS_BUSQUEDA: folio, contratista, empresa, objeto, periodo, documento) y :652-656 (logica Y = terminos.every sobre haceMatch). Spec hu-04 O9:282-299 verifica que la bus | Cumple los 5 campos de la ficha + agrega un campo 'Empresa' (O3, catalogo de empresas del profe) no previsto en la ficha. La logica Y opera por PALABRAS dentro del campo elegido (split por espacios), no combinando varios |
| Cada documento del expediente puede descargarse INDIVIDUALMENTE desde su bloque. | ❌ no | RETIRADO deliberadamente en O9. ConsultaExpediente.jsx:15-18 (comentario: 'Se RETIRARON los descargables prototipo... reemplazados por UN solo PDF') y :742-752 (unico boton 'Exportar expediente (PDF)' = window.print). Sp | El comportamiento se INVIRTIO respecto a la ficha: ya NO hay descarga por bloque; hay UNA sola exportacion del expediente completo a PDF via impresion consolidada del navegador (print CSS + window.print). Cambio de crite |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- Bloque 'Plan de amortizacion del anticipo' (art.138 fr.I RLOPSRM) en lectura: ConsultaExpediente.jsx:248-290, alimentado por api.planAmortizacion (services/api.js:45).
- Bloque 'Roster y sustituciones de personas' (art.125 RLOPSRM): historico 1:N con vigente/sustituido y estado de la nota de bitacora asociada. ConsultaExpediente.jsx:298-356, api.rosterContrato (api.js:115).
- Bloque 'Convenios modificatorios' (art.59 LOPSRM / art.99 RLOPSRM): historial inmutable + estado de su nota + link al visor de versiones del programa (HU-03). ConsultaExpediente.jsx:363-427, api.convenios (api.js:156).
- Bloque 'Resumen de estimaciones' (ciclo de cobro HU-12..21): N.º, periodo, estado (etiqueta del util estadoEstimacion.js) y total neto sumado. ConsultaExpediente.jsx:432-475, api.estimacionesDeContrato (api.js:107). Spec O9:252-266.
- Configuracion muestra 'Superintendente vigente' derivado del roster (art.125), con fallback al snapshot del alta: ConsultaExpediente.jsx:65-86 (testid config-super-vigente). Spec O9:203-204.
- Exportacion a PDF como documento consolidado: oculta el chrome (selector/buscador/sidebar/topbar) y fuerza ABIERTOS los bloques colapsados y los ocultos por busqueda al imprimir (print:block). ConsultaExpediente.jsx:36-61, 755-775. Specs O9:221-239, 268-299.
- Catalogo muestra la CLAVE del concepto (art.45 fr.IX RLOPSRM, revision profe O1-P12b): ConsultaExpediente.jsx:97-109.
- El expediente se carga seleccionando un contrato de un <select> (api.listarContratos); ya NO hay datos dummy. Manejo de errores 403/404/otro con mensajes distintos: ConsultaExpediente.jsx:502-532, 679-701.
- Cada persona del equipo/roster muestra su EMPRESA del catalogo (O3): ConsultaExpediente.jsx:237-241, 331.

**Recomendaciones / [validar profe]:**
- La ficha vieja pedia 'descarga individual por bloque'; el profe lo cambio (O9) a un unico PDF consolidado. Confirmar con el profe que la descarga por documento individual queda DEFINITIVAMENTE fuera de alcance.
- Confirmar si el bloque 'documentos juridicos' (firmante dependencia, representante legal, poder notarial, equipo) cubre lo que la ficha entendia por 'documentos juridicos', o si se esperaba adjuntar archivos juridicos descargables (no implementado).
- El buscador aplica la logica Y entre PALABRAS dentro de un mismo campo; la ficha decia 'filtra por folio, contratista, objeto, periodo o tipo'. Validar si se esperaba combinar varios campos simultaneamente.
- Validar el alcance ampliado (4 bloques nuevos: amortizacion, roster, convenios, estimaciones) frente a la ficha original de 5 bloques.

---

## HU-05 · Programa y curva de avance

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| Crit 1: matriz concepto x periodo tipo Gantt con catalogo de conceptos y codigo de color que distingue ejecutado de no-ejecutado | ✅ sí | CurvaAvance.jsx:528-588 (seccion-gantt: tabla concepto x periodo); colorCelda CurvaAvance.jsx:363-369 + COLOR_CELDA:37-42; leyenda:582-587; tabla catalogo:462-496; spec tablaGantt() linea 45-47 | El color va MAS ALLA de ejecutado/no-ejecutado: 4 estados (ejecutado verde, atraso rojo=programado vencido sin ejecutar, pendiente ambar=por venir, vacio gris=no programado). La ficha solo pedia distinguir ejecutado de n |
| Crit 2: grafica las 3 curvas (programado, ejecutado, financiero) y los filtros por concepto y periodo recalculan matriz y curvas | ✅ sí | CurvaSVG con 3 series CurvaAvance.jsx:68-72; datosCurva:308-338 (programado/ejecutado/financiero); filtro concepto data-testid filtro-concepto:443; filtro periodo filtro-periodo:452; rango recorta periodosVisibles:284-28 | El filtro de periodo es por RANGO discreto (Todo / Ultimos 3 / Ultimo), no un selector libre de periodo/fecha. Financiero es a nivel CONTRATO (Sigma pagos/monto), NO se desglosa por concepto (aviso explicito linea 523).  |
| Crit 3: calcula y muestra el porcentaje de avance global y por concepto | ✅ sí | avanceGlobal = Sigma ejecutado / Sigma contratado CurvaAvance.jsx:356-360, mostrado en Encabezado'Avance fisico global':426-427 y avance-global:533; % por concepto pct=ejecutado/contratado en tabla catalogo:481,489 y en  | Calculo client-side derivado de conceptos.acumulado_ejecutado (trabajos) sobre cantidad contratada (programa). La ficha vieja dejo este criterio sin checkbox de Resultado (linea 140); aqui esta construido. |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- KPIs en cabecera (4 tarjetas): Programado/Ejecutado/Financiero acumulados a hoy + Desviacion (ejec - prog) con tono semaforo aviso/exito. CurvaAvance.jsx:347-353,499-509. La ficha vieja no menciona KPIs ni desviacion explicita.
- Cuarta serie de informacion (financiero) trazada por FECHA DE PAGO acumulada: Sigma pagos.importe con fecha_pago <= corte / monto x100, alineada con el financiero_pct canonico. CurvaAvance.jsx:268-280. La ficha no especifica la formula del financiero.
- Marcador vertical 'hoy' en la curva S (linea roja punteada) y corte de las series ejecutado/financiero en hoy (periodos futuros sin punto). CurvaAvance.jsx:98-105,255-261,320-324. No documentado en la ficha.
- Tooltip interactivo al pasar el mouse sobre cada punto de la curva (revision profe O1-P16b): el graficador da el valor; tooltip SVG + <title> nativo. CurvaAvance.jsx:114-143, spec linea 120-139. No documentado.
- Punto de ORIGEN 'Inicio'=0% antepuesto cuando la ventana arranca en el primer periodo (las 3 curvas parten de 0; revision profe O1-P16a). CurvaAvance.jsx:327-336. No documentado.
- Selector de contrato obligatorio: filtros/curva/matriz solo aparecen tras elegir un contrato; lista via api.listarContratos acotada por participacion. CurvaAvance.jsx:182-218,394-406. La ficha vieja no menciona seleccion de contrato (asume contexto dado).
- Manejo de contrato SIN programa (sin periodos): banner ambar y aun asi calcula avance fisico global sobre lo ejecutado. CurvaAvance.jsx:372,430-435.
- Degradacion: si falla la lectura de pagos (403 de borde) se omite la serie financiera sin romper la vista. CurvaAvance.jsx:205-210.
- Resaltado de fila en catalogo cuando hay concepto filtrado (bg-sigecop-blue-light). CurvaAvance.jsx:480,483. No documentado.

**Recomendaciones / [validar profe]:**
- El codigo NO cita ningun articulo de ley en esta vista; la ficha vieja tampoco. Confirmar con el profe si la curva S / formula del financiero requiere fundamento legal explicito.
- Financiero a nivel contrato (no por concepto) declarado como alcance Etapa 1 (aviso en CurvaAvance.jsx:523); validar con el profe si se exige desglose por concepto.
- Filtro de periodo por rango discreto (Todo/Ultimos 3/Ultimo) en lugar de un selector libre de periodo: validar si cumple la intencion de 'filtros por periodo' de la ficha.
- Gate de pago / flujo de estimaciones no toca esta HU (es solo visualizacion read-only), pero el financiero depende de pagos registrados aguas abajo; validar coherencia con el flujo reconciliado.
- Definicion de 'atraso' por celda (programado vencido por fin de periodo < hoy sin ejecucion) es interpretacion del sistema; confirmar con el profe si coincide con el criterio de desviacion esperado.

---

## HU-06 · Registro de trabajos terminados por periodo

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| Cada cantidad capturada queda ligada al concepto del catalogo y a una nota de bitacora del periodo (tipo 'entrega de obra' o 'avance'). | 🟡 parcial | backend/src/controllers/trabajos.controller.js:289-295 (INSERT en concepto_avance con contrato_concepto_id + nota_id); la nota se crea con tipo 'avance' en linea 283 (insertarNotaAtomica tipo:'avance', tag:'avance'). NO  | Ligado a concepto: SI. Nota automatica: SI pero SIEMPRE tipo 'avance' (nunca 'entrega de obra'). Ademas la nota NO se liga a un periodo (se liga al avance, que si tiene contrato_periodo_id). Cambio de diseno O4: la nota  |
| El sistema acumula el avance ejecutado por concepto y muestra el porcentaje de avance contra lo contratado en vivo, periodo a periodo. | ✅ sí | backend/src/controllers/trabajos.controller.js:147-148 (acumulado_ejecutado = COALESCE(SUM(ca.cantidad)) por concepto). frontend/src/pages/TrabajosTerminados.jsx:290-300 (tabla por concepto: Contratada, Ejecutado acum.,  | El % se muestra como acumulado total por concepto (no desglosado periodo-a-periodo en la tabla principal). El desglose por periodo aparece como referencia en el formulario de captura (ref-programa: programadoPeriodo/prog |
| El sistema bloquea el registro cuando la cantidad acumulada excede la contratada (art. 118 RLOPSRM). | ✅ sí | backend/src/controllers/trabajos.controller.js:262-267 (acum + cantidad > cantidad_contratada + EPS → 409 'Excede lo contratado (art. 118 RLOPSRM)'). Mismo candado en PATCH lineas 384-389. Spec o4-avance-periodo.spec.js: | Bloqueo DURO server-side (409), con lock FOR UPDATE sobre el concepto (cierre de carrera, linea 237/347). En el frontend tambien se previene: puedeGuardar exige !validacion.excede118 (JSX:147-148) y muestra aviso rojo (J |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- SELECTOR DE PERIODO (P14 del profe): el avance ya NO usa fecha libre; se imputa a un PERIODO del programa via periodo_numero requerido (controller:222-225; JSX:340-356 selector cap-periodo). La fecha del avance se fija al CIERRE del periodo (periodo.fin, controller:294).
- AVISO NO BLOQUEANTE vs programa vigente (O-PROFE): si el avance excede lo programado del periodo o el concepto no estaba programado, se REGISTRA igual (201) y devuelve aviso_programa; NO bloquea (controller:82-115, 256-260; aviso en JSX:418-427). Razon citada en codigo: 'adelantar a precios pactados no requiere convenio'. Solo el art.118 y conceptos fuera de catalogo bloquean.
- CAPTURA EDITABLE (no append-only): existen PATCH /api/trabajos/:id (editar cantidad/observaciones, revalida art.118, controller:325-410) y DELETE /api/trabajos/:id (eliminar entrada, controller:413-446). La UI tiene botones Editar/Eliminar inline (JSX:504-518). Limitacion documentada: editar la cantidad NO regenera la nota original (controller:322-324).
- NOTA DIFERIDA: si no hay bitacora abierta, el avance se registra con nota_id NULL y la nota se asienta automaticamente al abrir la bitacora (controller:275-287, 299; respuesta nota_diferida=true; UI muestra 'pendiente (al abrir bitacora)' JSX:490). Spec o4 lineas 137-159.
- TOGGLE 'Ejecute todo lo programado del periodo': autollena la cantidad con lo disponible (programadoAcum - ejecutadoAcum) del concepto/periodo (JSX:151-154, 369-379; toggle-todo-periodo). Spec o4 lineas 178-179.
- CUANTIZACION a 3 decimales (q3, controller:29): cantidad se redondea a NUMERIC(14,3) antes de validar e insertar, para que el art.118 cuadre exacto. EPS_CANT=1e-6 permite acumulado == contratado (linea 33).
- ACOTAMIENTO POR PARTICIPACION server-side: todo endpoint valida esParteOSupervision(req.user, contrato) → 403 si no es parte/supervision (controller:139, 241, 351, 428). registrado_por sale SIEMPRE del JWT (req.user.id), nunca del body (controller:294).
- El GET tambien devuelve 'notas' tipo 'avance' vinculables (controller:184-192), pero el frontend actual NO las usa (no aparecen en TrabajosTerminados.jsx; la nota se genera sola).

**Recomendaciones / [validar profe]:**
- La nota automatica se crea SIEMPRE tipo 'avance'; la ficha vieja preveia tambien tipo 'entrega de obra' (NO construido). Confirmar con el profe si basta 'avance'.
- Emisor de la nota = quien registra (contratista). El codigo lo marca [validar] (controller:17, 271).
- Que el AVISO no bloqueante (adelantar a precios pactados sin convenio) sea el comportamiento legal correcto frente al art. 118 / convenios. Es interpretacion O-PROFE registrada en codigo, confirmar.
- Editar la cantidad de un avance NO regenera ni corrige la nota original (limitacion documentada en controller:322-324). Confirmar si es aceptable o requiere nota vinculada nueva (inmutabilidad).

---

## HU-07 · Alertas de atraso por concepto

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| Se pueden crear, pausar y eliminar alertas por concepto sin alterar las del resto. | ❌ no | backend/src/controllers/alertas.controller.js:18 ('La config previa (umbral/canal) queda RETIRADA: la tabla alerta_atraso se conserva pero ya no se usa'). El router (backend/src/routes/alertas.routes.js:14-21) solo expon | El modelo de configuracion por el usuario fue ELIMINADO en el rediseno del profe (O5/P15). Ya no se crean ni se pausan alertas: el panel deriva el atraso automaticamente al consultar. Quedan dummies muertos en frontend/s |
| La alerta solo dispara cuando el avance real es menor al umbral configurado por el usuario. | ❌ no | alertas.controller.js:48-80 (deficitsDeContrato): el atraso = programado_acumulado(al periodo vigente) - ejecutado_acumulado, filtrado por deficit > EPS_CANT (1e-6) en alertasDeContrato:100. No existe la palabra 'umbral' | El disparo NO depende de un umbral del usuario: aparece cualquier concepto cuyo ejecutado va por debajo de lo programado al periodo en curso. El umbral configurable se sustituyo por 'deficit > 0' fijo. |
| La notificacion se entrega por el canal elegido al configurar la alerta (sistema o correo). | ❌ no | No existe ningun canal de notificacion ni envio de correo. Busque 'correo'/'email'/'canal'/'notif' en alertas.controller.js y alertas.routes.js: ausentes. La unica 'notificacion' es in-app: banner en Inicio (Inicio.jsx:4 | No hay seleccion de canal. El aviso es siempre dentro del sistema (banner + campana) y solo se muestra a los roles con acceso a HU-07 (gateado por useVistaHU('HU-07').sinAcceso en Inicio.jsx:14 y AppShell.jsx:33). |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- El panel se opera POR CONTRATO: un selector de contrato (AlertasAtraso.jsx:128-139, testid select-contrato) acotado server-side por participacion (esParteOSupervision); la ficha vieja no menciona seleccion de contrato.
- El atraso se mide en UNIDADES del concepto (m3, etc.), no en porcentaje. La tabla muestra Programado acum. / Ejecutado acum. / Deficit con la unidad (AlertasAtraso.jsx:183-211).
- 'Periodo actual' = el periodo de mayor numero del contrato cuyo inicio ya paso (inicio <= CURRENT_DATE); si ninguno arranco, periodo_actual=null y no hay atraso (alertas.controller.js:34-44; AlertasAtraso.jsx:166-170). La ficha no habla de periodos.
- ejecutado_acumulado = SUMA TOTAL de concepto_avance del concepto (no acotado al periodo), de modo que 'ir adelantado' nunca genera falso atraso (alertas.controller.js:10-12,56-58).
- Usa el programa VIGENTE: los convenios modificatorios reescriben programa_obra en vivo y el calculo lo refleja (alertas.controller.js:8-9; criterio 2 de la vista, AlertasAtraso.jsx:239).
- Accion 'Asentar en bitacora' (residente): genera una nota inmutable tipo 'atraso' (tag='atraso') con folio atomico reutilizando insertarNotaAtomica/textoNotaAtraso de bitacora.controller.js:473-483. Emisor de la nota = residente_id del contrato por art. 53 LOPSRM, no quien dispara (alertas.controller.js:218-224).
- Asentar EXIGE bitacora abierta: sin apertura -> 409 (no se difiere, por ser un snapshot en vivo); citando art. 123 RLOPSRM (alertas.controller.js:208-212).
- Asentar valida que el concepto tenga deficit > 0 AHORA: sin atraso -> 409 'no tiene atraso' (alertas.controller.js:202-205).
- Asentar exige que el concepto pertenezca al contrato -> 404 si es ajeno (alertas.controller.js:190-194).
- Endpoint GET /alertas/resumen alimenta el AVISO al login: cuenta conceptos y contratos con deficit, acotado por participacion (dependencia/finanzas verian todo, pero el frontend NO les muestra el badge por no tener acceso a HU-07). Controller: alertas.controller.js:119-163.
- La nota de atraso cita LOPSRM art. 52 y RLOPSRM art. 45 ap. A fr. X en su contenido (bitacora.controller.js:479-481).
- El recalculo es siempre al consultar; NO hay cron ni proceso programado (alertas.controller.js:4; AlertasAtraso.jsx:12).

**Recomendaciones / [validar profe]:**
- Toda la HISTORIA original (configurar conceptos a vigilar, umbral de atraso y canal sistema/correo) fue REEMPLAZADA por el profe (O5/P15) por el panel automatico; confirmar que la ficha se reescribe y no se reabre el modelo de configuracion.
- Notificacion por CORREO: no existe; solo aviso in-app. Confirmar con el profe si el canal correo queda descartado para Etapa 1.
- La tabla alerta_atraso del esquema se conserva pero esta MUERTA (sin lecturas/escrituras); decidir si se elimina o se documenta como obsoleta.
- Quien debe ser el emisor de la nota de atraso (hoy se fuerza residente_id por art. 53); validar contra art. 123 fr. III/XII (firmas del roster). [validar profe]
- Articulos citados en la nota (LOPSRM 52 / RLOPSRM 45 ap. A fr. X) los pone el codigo; lo legal lo confirma el profe.

---

## HU-08 · Apertura formal de la bitácora del contrato

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| CA-1: Bitácora única por contrato, con representantes (residente, superintendente, supervisión si existe) ligados a sus cuentas en el sistema. No se capturan no | ✅ sí | UNIQUE por contrato: schema.sql:217-219 (uq_bitacora_aperturas_contrato UNIQUE(contrato_id)) + el controller mapea 23505→409 (bitacora.controller.js:260). Roster derivado de las cuentas del contrato: bitacora.controller. | Cumple plenamente. Refuerzo no pedido por la ficha: el superintendente es OBLIGATORIO para aperturar (bitacora.controller.js:99-102 → 400; gate frontend tieneSuperintendente, AperturaBitacora.jsx:134,159). |
| CA-2: La fecha y hora de apertura (fecha de entrega del sitio) queda registrada como evento formal inalterable. Cada autorizado firma desde su propia cuenta; la | 🟡 parcial | Evento inalterable: trigger BEFORE UPDATE sigecop_bitacora_inalterable bloquea todo cambio (schema.sql:251-254); apertura_en TIMESTAMPTZ DEFAULT NOW() (schema.sql:208). Cada quien firma desde SU cuenta: POST /:aperturaId | El comportamiento real separa dos fechas: fecha_apertura = inicio del contrato (inmutable) y entrega del sitio = dato capturado del acta. Difiere de la redacción literal de la ficha vieja que las equiparaba. |
| CA-3: La primera nota registra los datos obligatorios: identificación del contrato, objeto, datos financieros, cronograma contractual y registro de firmas (art. | ✅ sí | El acta-snapshot inmutable (construirActa, bitacora.controller.js:9-43) congela: identificación (folio, dependencia, contratista), objeto, datos_financieros (monto, anticipo_pct, plazo_dias), cronograma (inicio, fin, ent | EXCEDE la ficha: añade los datos mínimos del art. 123 fr. III RLOPSRM (domicilios y teléfonos de las partes, alcance/descripción de trabajos y características del sitio), capturados y obligatorios para aperturar, y conge |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- Datos mínimos OBLIGATORIOS del art. 123 fr. III RLOPSRM como gate de apertura: domicilio/teléfono de dependencia y contratista + alcance de trabajos + características del sitio. La ficha vieja NO los menciona. Frontend exige los 6 campos (minDataCompleta, AperturaBitacora.jsx:127-130,159; aviso md-incompleto línea 280) y el backend los normaliza y persiste en columnas dedicadas (bitacora.controller.js:65-73; schema.sql:863-868).
- Parámetro plazo_firma_dias (días naturales, default 2, rango 1-60) capturado en la apertura para la aceptación tácita de notas posteriores (art. 123 fr. III). No está en la ficha. bitacora.controller.js:58-62; schema.sql:396-401; UI input-plazo-firma AperturaBitacora.jsx:264-266.
- La apertura se registra COMO la nota #1 del libro (tipo 'apertura', estado 'emitida', firmado_en NULL porque su firma es la conjunta). bitacora.controller.js:154-167. La ficha habla de 'primera nota' pero no de su numeración formal ni de que las demás notas arranquen en #2.
- Asientos DIFERIDOS automáticos al aperturar: si antes de abrir la bitácora hubo sustituciones de roster, avances de trabajos o convenios modificatorios sin nota, la apertura genera sus notas (numeradas tras la #1) dentro de la misma transacción. bitacora.controller.js:169-249. Totalmente fuera del alcance de la ficha vieja.
- Candado server-side para EMITIR notas posteriores: no se puede emitir ninguna nota hasta que la apertura esté firmada por TODOS los participantes (bitacora.controller.js:543-551, 409). La ficha solo pide que la apertura quede 'completa' cuando todos firmen, no este candado de emisión.
- La apertura NO firma a nadie al crearse: deja una firma PENDIENTE por miembro y cada quien firma luego desde la bandeja 'Por firmar' (GET /bitacora/pendientes, bitacora.controller.js:304-320). El texto de la UI lo aclara: 'Nadie firma aquí' (AperturaBitacora.jsx:233).
- Lectura acotada por participación: GET /bitacora/contrato/:id devuelve 403 si el usuario no es parte ni supervisión del contrato (esParteOSupervision, bitacora.controller.js:335-337). La ficha no especifica control de acceso a la consulta.

**Recomendaciones / [validar profe]:**
- Regla 'mismo día': el código fija fecha_apertura = fecha de inicio del contrato, NO la fecha de entrega del sitio como decía la ficha vieja; el comentario del código lo marca como [validar] (hallazgo del profe, audio 2026-06-01). Confirmar cuál es la fecha legal de apertura.
- Asiento retroactivo (diferido) de notas de sustitución/avance/convenio al aperturar: el folio refleja el orden de asiento, no la fecha del hecho. El propio código lo deja [validar profe] (orden folio vs. fecha, art. 123 fr. V/VI).
- Plazo de firma de notas por defecto = 2 días naturales (Etapa 1); días hábiles y el plazo legal exacto quedan a confirmar.
- Quién debe firmar la apertura (firma conjunta): hoy se exige a TODO el roster (residente + superintendente + supervisión si aplica); confirmar con el profe si basta la contraparte directa.
- Los specs e2e de HU-08 (frontend/e2e/hu-08-apertura-bitacora.spec.js) están desactualizados: prueban un formulario dummy viejo (testids btn-firmar-1..3, data-parte, aviso-aperturada) que ya no existe en la página real cableada al backend; los tests interactivos están en test.fixme. Falta reescribirlos como integración con backend.

---

## HU-09 · Emisión y respuesta de notas tipificadas con firma

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| Aparecen los tipos de nota que corresponden al rol del usuario, pudiendo incorporar también otro tipo de nota para eventos no tipificados (art. 122 y 125 RLOPSR | ✅ sí | frontend/src/pages/EmisionNotas.jsx:69-72 (tiposDeMiRol: filtra activo!=false y rol_emisor===miRol\|\|null, excluye 'apertura'); backend/src/controllers/bitacora.controller.js:392-400 (validarTipoParaRol: 403 si rol_emis | El rol que decide los tipos NO es el rol del login sino el rol-en-contrato derivado del equipo (residente_id/superintendente_id/supervision_id). 'otro' cubre eventos no tipificados (art. 125 último párrafo). Tipos viejos |
| Una nota firmada queda inmutable; las correcciones se hacen generando una nota vinculada (formato «dice / debe decir»), sin alterar la original. | ✅ sí | backend/src/db/schema.sql:448-475 (trigger sigecop_nota_inmutable: BEFORE UPDATE bloquea cualquier cambio salvo la única transición emitida→anulada); bitacora.controller.js:722-773 (anularNota: solo el emisor, marca orig | La original NO se edita: pasa a 'anulada' (estado) y nace una nota NUEVA vinculada. No se puede anular si ya fue respondida por otra parte (bitacora.controller.js:745-749) ni la nota de apertura #1 (741). El emisor firma |
| Cada nota queda registrada con folio correlativo, fecha, firma de quien la emite desde su propia cuenta y vínculo opcional a nota previa. | ✅ sí | bitacora.controller.js:404-414 (insertarNotaAtomica: pg_advisory_xact_lock + numero=MAX+1 por bitácora, emisorId del JWT, firmado_en=NOW(), vinculadaA opcional); schema.sql:434-439 (UNIQUE(bitacora_id,numero) sin saltos, | Folio formato BIT-0001 (EmisionNotas.jsx:15). 'fecha' es TIMESTAMPTZ → la UI muestra fecha Y HORA (Pase 2.2, EmisionNotas.jsx:16-18,200). El emisor sale del JWT (no del body) → 'desde su propia cuenta' garantizado server |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- CANDADO DE EMISIÓN server-side: NO se puede emitir ninguna nota hasta que la APERTURA (nota #1) esté firmada por TODOS los participantes; 409 si faltan firmas (bitacora.controller.js:539-551); la UI lo refleja con banner gate-emision y deshabilita el botón (EmisionNotas.jsx:316-321,362). La ficha vieja no lo menciona.
- FIRMA DE LA NOTA POR LA CONTRAPARTE (aceptación): además de la firma del emisor, las OTRAS partes firman/aceptan la nota vía POST /notas/:id/firmar (bitacora.controller.js:849-885, append-only en bitacora_nota_firmas, 409 si el emisor intenta firmar su propia nota o si ya firmó). UI: btn-firmar-nota (EmisionNotas.jsx:167-176,225-228).
- ACEPTACIÓN TÁCITA por vencimiento del plazo: si vence plazo_firma_dias sin completarse firmas, la nota se marca 'aceptada_tacita' (art. 123 fr. III); si se completan TODAS las firmas del roster antes del plazo → 'firmada' (construirPayloadNotas, bitacora.controller.js:625-636). Estados visibles: en_plazo/firmada/aceptada_tacita/respondida/anulada (EmisionNotas.jsx:21-27).
- RESPONDER / VINCULAR sin anular: una parte puede crear una nota nueva que referencia otra (respuesta/adición, art. 123 fr. VIII/XII) sin tocar la original, vía POST /notas/:id/vincular (bitacora.controller.js:778-828); valida que la nota referenciada pertenezca a la MISMA bitácora (806-809). UI: btn-responder (EmisionNotas.jsx:230-231).
- NOTAS AUTOMÁTICAS del sistema asentadas en la misma bitácora: sustitución de personas (res_sustitucion, art.125 fr.I g), avance (avance, art.125 fr.II), atraso (tipo 'atraso', art.125 fr.I), convenio (res_convenios, art.59 LOPSRM). Se generan en vivo o DIFERIDAS al abrir la bitácora (bitacora.controller.js:174-249, 416-504). La ficha vieja solo contempla emisión manual.
- La nota de APERTURA es la nota #1 del libro (tipo 'apertura'), generada por la apertura de bitácora; NO se emite ni se anula a mano (bitacora.controller.js:163-167,524,741); su firma es la CONJUNTA de todos los participantes, no la del emisor.
- VER NOTA COMO DOCUMENTO IMPRIMIBLE (O8): cada nota se abre como documento membretado imprimible (DocumentoNota.jsx, btn-doc-nota, EmisionNotas.jsx:218-221,402). Disponible siempre, solo lectura.
- TAG de búsqueda opcional por nota (lo pidió el profe) para HU-10 (EmisionNotas.jsx:344-346; bitacora.controller.js:511-514).
- Límites de captura server-side: contenido <=5000 chars, asunto <=200, tag <=60 (bitacora.controller.js:526-528).

**Recomendaciones / [validar profe]:**
- Quién debe firmar una nota para considerarla aceptada: ¿todo el roster (residente+superintendente+supervisión) o basta la contraparte directa? (comentario [validar] en bitacora.controller.js:624).
- Asiento RETROACTIVO de notas automáticas diferidas (sustitución/avance/convenio) al abrir la bitácora: orden del folio vs. fecha real del hecho (art. 123 fr. V/VI) — marcado [validar profe] en bitacora.controller.js:172-173.
- La ficha vieja redacta el rol como 'residente, supervisión o contratista'; en el sistema el CONTRATISTA emite como rol 'superintendente' (art. 125 fr. II), no como 'contratista' directo — confirmar el mapeo con el profe.
- Plazo de firma/aceptación default = 2 días naturales, configurable 1-60 (schema.sql:393-402); confirmar días naturales vs hábiles.
- La ficha vieja menciona arts. 122 y 125; el código cita además 123 fr. III/V/VI/VII y 53 — confirmar fundamento completo.

---

## HU-10 · Consulta y búsqueda de notas de bitácora

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| La búsqueda devuelve solo las notas que cumplen simultáneamente TODOS los filtros aplicados (tipo, fecha, firmante, vínculo y palabra clave) — lógica Y/AND. | ✅ sí | frontend/src/components/notas/BuscadorNotas.jsx:77-96 (useFiltrosNotas.resultados): cadena de early-returns dentro de un solo notas.filter → equivale a AND. Filtros: tipo (L81 n.tipo===filtros.tipo), fecha desde/hasta (L | El campo de la ficha 'firmante' se implementa como filtro por EMISOR de la nota (un emisor por nota, art.125), no por quién firma — así lo documenta el comentario BuscadorNotas.jsx:8 y la columna se rotula 'Firmante' (L1 |
| Se pueden seleccionar varias notas del resultado y exportarlas en formato Excel. | ✅ sí | Selección múltiple: checkbox por fila (BuscadorNotas.jsx:214-221, onToggle) + 'seleccionar todas' (L185-190, onToggleTodas); estado Set en ConsultaNotas.jsx:33,70-91. Export Excel real con ExcelJS: ConsultaNotas.jsx:2 (i | Detalle de comportamiento: exportar() filtra sobre `notas` (todo lo cargado), NO sobre `resultados` (lo filtrado visible) — ConsultaNotas.jsx:98. Como la selección persiste al cambiar filtros (seleccionadas NO se limpia  |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- Selección de contrato como paso previo obligatorio: la ficha no menciona que el usuario debe elegir un contrato de los que participa antes de poder buscar. ConsultaNotas.jsx:45-66 (seleccionarContrato) carga GET /bitacora/contrato/:id/notas (api.js:94); sin contrato se muestra 'Selecciona un contrato…' (ConsultaNotas.jsx:170-172).
- Manejo de 'sin bitácora aperturada': si el contrato no tiene apertura el backend responde 404 y la UI muestra un aviso ámbar 'Este contrato aún no tiene bitácora aperturada' (ConsultaNotas.jsx:57-58, 174-178; backend bitacora.controller.js:700).
- Control de acceso por participación server-side (no en la ficha): GET /bitacora/contrato/:id/notas valida esParteOSupervision sobre el contrato ANTES de revelar la bitácora; 403 si no participa, manejado en UI con toast 'No tienes acceso…' (bitacora.controller.js:692-694; ConsultaNotas.jsx:60).
- Columna/filtro Estado de aceptación derivado por el backend (firmada / en_plazo / aceptada_tacita / respondida / anulada), mostrado como badge y exportado, no contemplado en la ficha (BuscadorNotas.jsx:34-48, 239-243; lógica server bitacora.controller.js:627-638). NO es filtrable, solo se muestra/exporta.
- Búsqueda de palabra clave insensible a acentos/mayúsculas (normalizarTexto NFD, BuscadorNotas.jsx:15-20) — equivalente a ILIKE+unaccent; la ficha solo dice 'palabra clave'.
- Fecha de la nota mostrada con HORA (TIMESTAMPTZ, formato es-MX), introducido por Pase 2.2 (BuscadorNotas.jsx:52-54, 229); el filtro por rango sigue comparando solo la fecha (L82-84).
- Acción 'ver documento' por nota (vista imprimible DocumentoNota) integrada en el buscador vía onVerDocumento (ConsultaNotas.jsx:35,202,213; BuscadorNotas.jsx:244-250) — funcionalidad O8, ajena a la ficha de consulta/export.
- El catálogo de Tipos del filtro proviene de datos reales GET /bitacora/nota-tipos (api.js:91; ConsultaNotas.jsx:42), y la lista de Firmantes se deriva dinámicamente de los emisores presentes en las notas cargadas (BuscadorNotas.jsx:66-69), no de listas fijas.
- El buscador es un componente reutilizable (BuscadorNotas) que HU-12 reusa como modal para vincular notas a la estimación (comentario BuscadorNotas.jsx:4-6); no documentado en la ficha de HU-10.

**Recomendaciones / [validar profe]:**
- [validar profe] La ficha dice 'firmante' pero el sistema filtra por EMISOR de la nota (no por quien firma). Confirmar si 'firmante' debe seguir mapeando al emisor o agregarse un filtro por firmantes reales (bitacora_nota_firmas).
- [validar profe] La búsqueda por palabra clave incluye el tag y la etiqueta del tipo además de asunto/contenido (alcance mayor al literal de la ficha). Confirmar que es deseable.
- [validar profe] El export toma las notas seleccionadas de TODO lo cargado, no solo de los resultados visibles tras filtrar (la selección persiste al cambiar filtros). Confirmar si debe limitarse a los resultados filtrados o limpiar la selección al re-filtrar.
- [validar profe] El criterio 1 (filtros AND sobre datos reales) y el export .xlsx NO están cubiertos por la suite E2E (solo estructura/permisos); se validan por smoke manual contra el backend local. Decidir si se requiere cobertura automatizada.
- [validar profe] El estado de aceptación se MUESTRA/exporta pero NO es filtrable; evaluar si debería ser un filtro adicional.

---

## HU-11 · Minutas, visitas y acuerdos (Registro de minutas, agenda de visitas y consulta de acuerdos)

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| Las minutas (PDF + metadatos) y las visitas registradas son visibles para los usuarios autorizados del contrato. | 🟡 parcial | frontend/src/pages/MinutasVisitas.jsx:419-420 (useState con minutasDummy/visitasDummy), tablas en :186-226 y :307-347; permisos en permisos.js:22; spec hu-11-minutas.spec.js:89-98 (contratista/supervision ven tablas, for | La VISIBILIDAD por rol existe (tablas + aviso solo-consulta), pero los datos son dummy en memoria (data/dummy.js:683-694), NO hay backend ni persistencia. El PDF solo captura el nombre del archivo, no se sube (MinutasVis |
| Se pueden consultar los acuerdos y compromisos derivados, filtrados por contrato y periodo. | 🟡 parcial | frontend/src/pages/MinutasVisitas.jsx:354-405 (TabAcuerdos) filtra acuerdosDummy por periodo; periodosAcuerdosDummy en dummy.js:705; spec hu-11-minutas.spec.js:100-112 (filtro Mayo 2026 -> 3 filas, Junio 2026 -> vacio). | Solo filtra por PERIODO (selector de mes, no rango), NO por contrato (un solo contratoDummy). Acuerdos son lista dummy estatica (dummy.js:698-702), NO derivados de minutas/visitas reales: no hay tabla 'acuerdos' en schem |
| Una minuta o registro de visita puede adjuntarse como referencia en una nota de bitacora (HU-09). | ❌ no | frontend/src/pages/MinutasVisitas.jsx:55-85 ModalAdjuntarReferencia es un modal INFORMATIVO ('placeholder consciente', comentario :53-54); el boton :213-220 / :334-341 solo abre el modal que dice 'Esta accion esta dispon | Funcionalidad NO construida: es texto que remite a HU-09. El adjuntar/vincular real nunca ocurre. La columna minutas.nota_id existe en el esquema pero esta huerfana (sin codigo que la escriba). |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- FOLIADO AUTOMATICO no documentado en la ficha: la pantalla genera folios correlativos MIN-NNN y VIS-NNN (MinutasVisitas.jsx:42-51 siguienteFolio, usado en :445 y :461).
- CAMPOS REALES de minuta difieren de 'metadatos' generico: fecha, lugar, participantes, asunto y archivoPdf (MinutasVisitas.jsx:97-102, todos obligatorios para habilitar el boton). El backend schema.sql:1070-1086 usa 'titulo' y 'acuerdos' (TEXT) que la UI NO captura.
- AGENDA DE VISITAS con campos propios: fecha, lugar, responsable, proposito y estado (Programada/Realizada/Cancelada) con badges de color (MinutasVisitas.jsx:16-27, 231-347). El schema.sql:1090-1101 modela visitas con tipo (visita/inspeccion), fecha_programada, fecha_realizada, proposito, resultado, estado (agendada/realizada/cancelada) — distinto a la UI.
- GATING de boton por datos completos: 'Registrar minuta' y 'Agendar visita' quedan disabled hasta llenar todos los campos requeridos (MinutasVisitas.jsx:97-103, 234-239); cubierto por spec hu-11-minutas.spec.js:7-12.
- MODO SOLO LECTURA por rol: useVistaHU('HU-11') aplica soloLectura (MinutasVisitas.jsx:416); forms se deshabilitan via RegionEditable y se oculta el boton para contratista/supervision (:108, :169, :244, :290); el filtro de Acuerdos PERMANECE editable en lectura (comentario :352-353, spec :100-112).
- TABLA minutas tiene columna nota_id (FK a bitacora_notas) y pdf en BYTEA prevista, SIN trigger de inmutabilidad (schema.sql:1062-1102) — diseno backend preparado pero no implementado en codigo.
- El comentario del esquema cita fundamento legal art. 125 fr. III inciso d) RLOPSRM (acuerdos de juntas de trabajo) para minutas, y marca la agenda de visitas como operativa SIN fundamento legal literal (schema.sql:1064-1067). El codigo frontend NO cita ningun articulo.

**Recomendaciones / [validar profe]:**
- PERSISTENCIA: hoy todo es dummy en memoria (no se guarda nada). Construir backend (controller+route+mount) que use las tablas minutas/visitas ya definidas en schema.sql, con acotacion por contrato (esParteOSupervision) y registrada_por desde el JWT.
- SUBIDA REAL DEL PDF: hoy solo se captura el nombre del archivo (no se sube). El esquema preve pdf en BYTEA; definir si va a disco/BYTEA como contrato_documentos.
- VINCULO REAL minuta/visita -> nota de bitacora (criterio 3 de la ficha, hoy NO construido): implementar la escritura de minutas.nota_id desde HU-09 o desde aqui. [validar profe]: que tipo de nota (art. 125 fr. III inciso d RLOPSRM) y si la minuta firmada se congela.
- ACUERDOS DERIVADOS: hoy son una lista estatica sin origen real. Definir si los acuerdos se capturan/derivan de minutas (no hay tabla 'acuerdos' en el esquema) y si el filtro debe ser por contrato + periodo (la ficha pide ambos; hoy solo periodo).
- DISCREPANCIA UI vs ESQUEMA: campos de la UI (participantes, asunto, archivoPdf / responsable, estado Programada-Realizada-Cancelada) no coinciden con las columnas del schema.sql (titulo, acuerdos TEXT / tipo visita-inspeccion, resultado, estado agendada-realizada-cancelada). Reconciliar antes de cablear backend.
- Fundamento legal: el esquema cita art. 125 fr. III inciso d) RLOPSRM para minutas y marca visitas como operativas sin fundamento literal; el codigo no lo cita. Confirmar con el profe.

---

## HU-12 · Apertura del periodo e integración de la estimación

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| CA-1: La estimación se guarda como UNA sola entidad que contiene carátula, generadores, registro fotográfico, soportes y notas vinculadas seleccionadas del busc | 🟡 parcial | estimaciones.controller.js:49-384 (integrarEstimacion en UNA transacción inserta estimaciones + estimacion_generadores + estimacion_notas, estado='integrada'); notas vía buscador en IntegracionEstimacion.jsx:70-132 (Moda | La entidad-única (carátula+generadores+notas) existe y es append-only por trigger. Faltan 2 de los 5 componentes del expediente: registro fotográfico y soportes (diferidos). |
| CA-2: La carátula calcula automáticamente anticipo amortizado, retenciones legales (5 al millar art.191 LFD) y deductivas según el contrato. | ✅ sí | estimaciones.controller.js:312-332 (WITH SQL server-side): subtotal=Σ ROUND(cant×pu,2); amortizacion=ROUND(subtotal×anticipo_pct/100,2) [art.138 fr.I]; retencion=ROUND(subtotal×0.005,2) [5 al millar art.191 LFD]; deducti | Amplía la ficha: server materializa la carátula (cliente=preview), añade retención por ATRASO (penas art.138/139, l.319-321) condicional a pena pactada+atraso, y snapshots avance_fisico_pct/avance_financiero_pct. anticip |
| CA-3: El sistema BLOQUEA la integración cuando una cantidad por concepto excede la cantidad contratada en el catálogo (art.118 RLOPSRM). | ✅ sí | estimaciones.controller.js:212-232 (por línea: acumulado_anterior+cantidad_periodo > contratado+EPS → 409 'Excede lo contratado (art.118 RLOPSRM)'). Frontend lo adelanta: jsx:624 (f.excede) deshabilita btn-integrar (jsx: | Endurecido más allá de la ficha: también valida tope PLANEADO del programa A2 hasta el periodo (controller:234-260, 409 art.45-A-X+art.52) con semáforo de plan en la UI (jsx:630, banner semaforo-plan-exceso). El art.118  |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- GATING del PDF firmado server-side (estimaciones.controller.js:139-145): no integra si el contrato no tiene su PDF 'contrato' ligado (409 'formalización pendiente, HU-01'); si anticipo>umbral (default 30%) exige doc 'anticipo_autorizacion' (art.50 fr.IV LOPSRM).
- RESTRICCIÓN DE IDENTIDAD: solo el superintendente asignado (superintendente_id===req.user.id) integra (controller:123, 403); banner en UI (jsx:804-808).
- PERIODO máximo 1 mes calendario (art.54): controller:64-66 rechaza periodo_fin>periodo_inicio+1mes (400). La ficha vieja NO cita art.54 en HU-12.
- NO-SOLAPE de periodos: no puede traslaparse con otra estimación NO rechazada del contrato (controller:155-168, 409).
- NUMERACIÓN correlativa atómica MAX(numero)+1 bajo pg_advisory_xact_lock (controller:153, 347-351); UI muestra el próximo número ligado al periodo del programa (jsx:642-645, O1-P17).
- ESTADO inicial 'integrada' = etiqueta 'Integrada' (controller:358, estadoEstimacion.js:12). El flujo posterior (Presentada HU-13 / Autorizada-Rechazada HU-15 / Pagada HU-21) NO ocurre aquí.
- NETO no puede quedar negativo: deductivas+retención por atraso que lo dejen <0 → 400 (controller:341-344); preview lo avisa (jsx:403-407).
- Snapshots de avance FÍSICO y FINANCIERO calculados/guardados al integrar (controller:335-339) + barras en UI (jsx:849-861, barras-avance). [validar definición].
- SOLO se vinculan notas FIRMADAS y se EXCLUYE la apertura (#1): filtro frontend jsx:689-692 (aceptacion==='firmada' && tipo!=='apertura'); cada nota se ve como documento imprimible (DocumentoNota, O8). Spec o8-notas-estimacion.spec.js:95-129.
- Endpoint SOLO LECTURA /api/estimacion-prep (estimacion-prep.controller.js) que alimenta semáforo de plan/saldos/barras reusando las consultas del POST para que 'disponible este periodo' coincida exacto con el server.
- Panel plegable del PROGRAMA DE OBRA mes-por-mes (matriz concepto×periodo) con periodo resaltado (jsx:863-874, MatrizProgramaLectura; Pase 1), solo lectura.
- DEDUCTIVAS son retenciones ECONÓMICAS (art.46/46 Bis LOPSRM), distintas del 5 al millar FISCAL (controller:291-294); validadas >=0.

**Recomendaciones / [validar profe]:**
- Registro FOTOGRÁFICO y SOPORTES documentales del expediente (CA-1 ficha vieja) NO están construidos: TabPlaceholder existe (jsx:493-503) pero no se renderiza; sin tabla ni endpoint. Diferidos.
- La 'apertura del periodo' de la ficha se reduce HOY a capturar periodo inicio/fin (no hay entidad/acción formal de apertura separada de la integración).
- Definición de avance FÍSICO vs FINANCIERO y regla de disparo de la retención por atraso (global vs concepto, bruto vs neto) [validar profe] (controller:266, prep:135).
- CMIC / 2 al millar: parametrizable y DIFERIDO; tasa y aplicabilidad a confirmar (controller:293-294).
- Bloqueo DURO vs alerta para el tope del programa A2 (art.45-A-X/52): el código bloquea (409) pero anota [validar] (controller:239).
- Umbral del anticipo para exigir autorización del titular (art.50 fr.IV) y su parametrización (ANTICIPO_UMBRAL_PDF default 30%) [validar profe] (controller:138).

---

## HU-13 · Envio/presentacion de la estimacion

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| Al enviar la estimacion quedan registradas la fecha y hora exacta de recepcion, y queda notificacion formal a residencia y supervision | 🟡 parcial | backend/src/controllers/estimaciones-ciclo.controller.js:156 (SET estado='enviada', enviada_en=NOW(), enviada_por=$2) sella fecha/hora exacta del acto. Frontend lo muestra: EnvioEstimacion.jsx:277 ('Presentada el '+fecha | El sello fecha/hora SI esta (server-side, atomico). La 'notificacion formal' como acto explicito NO se construyo: la difusion es pull (consulta del historial), no push. |
| El boton Enviar se deshabilita cuando se vencen los 6 dias naturales del periodo de presentacion (art. 54 LOPSRM) | ❌ no | EnvioEstimacion.jsx:260-269: el boton 'Presentar estimacion' solo se desactiva mientras la peticion esta en curso (disabled={presentandoId===e.id}); NO depende del plazo. El plazo de 6 dias es SOLO informativo: presentac | Decision de diseno CAMBIADA: el plazo de 6 dias se degrado de candado a referencia visual no bloqueante (aviso ambar 'Fuera de los 6 dias'). El sistema permite presentar fuera de plazo. |
| Al enviarse, inicia automaticamente el plazo de revision de 15 dias naturales (supervision, art. 54 LOPSRM) | ✅ sí | El plazo de 15 dias se DERIVA en lectura desde enviada_en, no se persiste contador: PLAZO_REVISION_DIAS=15 (jsx:21), semaforo() (jsx:68-78) y render del badge 'Revision (HU-15): dia X de 15 / N dias restantes' en filas ' | La revision real (observar/turnar/autorizar) la ejecuta HU-15; HU-13 solo arranca y muestra el semaforo. El criterio decia 'supervision' pero hoy el plazo abarca supervision+residencia (HU-15). |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- Maquina de estados estricta: solo se presenta desde estado 'integrada' (controller:148-150 -> 409 "No se puede presentar una estimacion en estado '<estado>'"). La ficha vieja no menciona la precondicion de estado.
- Inmutabilidad / no re-presentar: si ya esta 'enviada' devuelve 409 'La estimacion ya fue presentada' (controller:145-146), y el UPDATE atomico WHERE estado='integrada' blinda la doble-presentacion en carrera (controller:154-163). En UI el boton desaparece tras presentar (jsx:251 condiciona a estado==='integrada'; spec hu-13:138 verifica que ya no existe).
- Candado de actor MAS estricto que la ficha: no es 'el contratista' generico sino SOLO el superintendente del contrato (controller:140); 403 'Solo el superintendente asignado a este contrato puede presentar sus estimaciones'. Espejo de quien INTEGRA en HU-12. Probado en o7-flujo:75 (residente NO presenta -> 403).
- Acotamiento de lectura por participacion: el historial que alimenta la vista (api.historialEstimaciones) exige esParteOSupervision (controller:35-37 -> 403). El frontend lo maneja: EnvioEstimacion.jsx:121 muestra 'No tienes acceso a las estimaciones de este contrato'.
- Etiquetas de UI reconciliadas (O7->HU-15, 11-jun): estado interno 'integrada'="Integrada", 'enviada'="Presentada" (estadoEstimacion.js:12-13; labelEstadoEstimacion). El path del endpoint sigue siendo /enviar por compatibilidad de API aunque la accion se llama 'Presentar' (routes:29, controller:115).
- registrado_por sale del JWT, no del body: enviada_por = req.user.id (controller:156,159), cumpliendo el patron de CLAUDE.md.
- Aviso ambar de plazo de presentacion (6 dias) informativo: jsx:253-259 distingue 'Dentro de los 6 dias para presentar desde el corte' vs 'Fuera ... (hace N dias)'; calculado desde periodo_fin (el corte). No existia en la ficha como elemento de UI separado del candado.
- Vista solo-consulta para residente/supervision (nivel 'C'): useVistaHU('HU-13').soloLectura oculta el boton Presentar (jsx:97,260) y muestra aviso de solo lectura; probado en hu-13 spec:146-160 (residente ve 'Integrada' sin boton).

**Recomendaciones / [validar profe]:**
- Notificacion formal a residencia y supervision (criterio 1 de la ficha vieja): hoy NO existe como aviso push; la difusion es por consulta del historial (pull). [validar profe] si la 'notificacion formal' del art. 54 requiere un aviso/asiento explicito.
- El plazo de 6 dias para presentar NO bloquea (la ficha vieja lo pedia como candado del boton). Se degrado a aviso informativo no bloqueante. [validar profe] si presentar fuera de los 6 dias debe impedirse o solo advertirse.
- El plazo de 15 dias se MUESTRA como referencia visual pero NO dispara ninguna accion automatica al vencer (no hay afirmativa ficta ni autorizacion automatica en HU-13). [validar profe] consecuencia legal del vencimiento.
- La ficha vieja decia plazo de revision 'supervision'; hoy abarca supervision+residencia via HU-15. [validar profe] redaccion.

---

## HU-14 · Historial de estimaciones del contrato

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| El historial muestra todas las estimaciones del contrato en orden cronologico, incluyendo las versiones rechazadas. | 🟡 parcial | backend/src/controllers/estimaciones-ciclo.controller.js:41-52 (SELECT de TODAS las estimaciones del contrato, sin filtrar por estado, ORDER BY e.numero) + :84 (estado: e.estado incluye 'rechazada'). Frontend HistorialEs | El orden cronologico es por e.numero (correlativo de integracion), no por fecha. Las estimaciones rechazadas SI aparecen como estado. PERO el concepto de 'versiones rechazadas' (una nueva version que reemplaza a la recha |
| Los filtros permiten consultar por periodo, estado o ambos combinados (logica Y). | ✅ sí | HistorialEstimaciones.jsx:208-214 (filter con dos condiciones AND: periodo y estado). Opciones DERIVADAS de los datos (:199-206). Spec hu-14-historial.spec.js:152-169 prueba explicitamente la conjuncion: combo que matche | Los filtros son por mes (periodoLabel 'Ene 2026') y por estado del ciclo. Se montan SOLO al seleccionar un contrato (spec :128-136). El filtro de periodo agrupa por mes de inicio, no por rango de fechas libre. |
| Cada estimacion del historial puede abrirse para ver su expediente completo. | 🟡 parcial | HistorialEstimaciones.jsx:60-120 (PanelDetalle drawer) + :332 onClick setSeleccionada. Spec hu-14-historial.spec.js:171-185 abre el panel y verifica 'Expediente' + EST-001 + cerrar. PERO no es el expediente COMPLETO (HU- | El panel NO abre el expediente completo de HU-04; es un drawer resumido. Ademas: (a) observaciones SIEMPRE vacio (HistorialEstimaciones.jsx:156, no se traen del backend); (b) fechaRevision y fechaPago SIEMPRE null porque |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- Exportacion a Excel del historial FILTRADO: boton 'Exportar historial' genera un .xlsx real con exceljs (HistorialEstimaciones.jsx:122-135, :298-305, import :2 descargarExcelHoja). La ficha vieja no menciona exportacion en HU-14 (solo aparece en HU-16 para observaciones).
- Panel/drawer lateral 'Expediente' como modal de detalle, no navegacion a otra pagina (HistorialEstimaciones.jsx:60-120). Muestra periodo, estado (badge), importe, fecha presentacion, fecha revision, fecha pago y observaciones.
- El historial es READ-ONLY puro: el endpoint no muta nada y se sirve por GET /api/estimaciones-ciclo/contrato/:id/historial (controller :1-2, route :24).
- Acotamiento por PARTICIPACION (no solo por rol): el backend devuelve el historial a quien es parte o supervision del contrato (esParteOSupervision, controller :35), respondiendo 404 si el contrato no existe y 403 si no participa (:34-37). El frontend traduce 403 a un toast 'No tienes acceso al historial de este contrato' (HistorialEstimaciones.jsx:191).
- La columna 'Importe' muestra el NETO de la caratula (controller :91 neto; frontend :153 moneda(e.neto)), no el subtotal ni el monto bruto.
- Estados y etiquetas del ciclo reconciliado: integrada='Integrada', enviada='Presentada', autorizada='Autorizada', pagada='Pagada', rechazada='Rechazada' (data/estadoEstimacion.js:12-16; badge HistorialEstimaciones.jsx:33-46).
- Selector de contrato obligatorio: sin contrato seleccionado no hay tabla ni filtros, solo guia 'Selecciona un contrato' (HistorialEstimaciones.jsx:252-253; spec :128-136). Los contratos del selector vienen acotados por el backend (api.listarContratos, :179).
- Caso vacio sin error: contrato sin estimaciones cae en 'Sin estimaciones con los filtros aplicados.' y 'Resultados (0)', sin toast de error (spec :207-218; frontend :320-325).

**Recomendaciones / [validar profe]:**
- [validar profe] La ficha vieja cita art. 130 RLOPSRM (tipos de estimacion) y art. 138 (versionado); el CODIGO de HU-14 no cita ningun articulo, por eso articulos_ley va vacio.
- CA-3 'expediente COMPLETO': el panel es un RESUMEN, no el expediente de HU-04. Decidir si CA-3 exige enlazar al expediente completo o el resumen basta.
- Fechas de revision y pago en el panel: el backend solo deriva transiciones 'integrada' y 'enviada'; NO empuja 'autorizada'/'rechazada'/'pagada' (punto de extension comentado pero no implementado, controller :65-68), por lo que fechaRevision y fechaPago salen siempre vacias aunque el estado ya haya avanzado por HU-15/HU-21. Falta cablear esas columnas para completar la linea de tiempo.
- Observaciones del panel: siempre vacias (HistorialEstimaciones.jsx:156); no se traen de HU-15 (estimacion_observaciones). Decidir si HU-14 debe mostrarlas.
- Concepto de 'versiones rechazadas' (HU-16): el modelo NO versiona (columna Version = '—'); una rechazada aparece como estado, no como version anterior vinculada. Confirmar si HU-14 debe mostrar el encadenamiento de versiones.

---

## HU-15 · Recepción, revisión técnica y autorización de la estimación

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| CA-1: revisión sección por sección (carátula, generadores, registro fotográfico, soportes y notas) y registrar observaciones con tipo y severidad por concepto | 🟡 parcial | frontend RevisionEstimacion.jsx:75 SECCIONES=['caratula','generadores','notas'] con comentario 'fotos/soportes ocultas (sin datos reales)'; tabs render solo esas 3 (jsx:538-555). Observaciones con tipo (jsx:24-28 aclarac | La revisión NO es por las 5 secciones de la ficha: 'fotos' y 'soportes' se ocultan en el frontend por no tener archivos reales (aunque el backend SÍ los acepta en SECCIONES controller:187). 'Por concepto' NO se cumple: l |
| CA-2: autorización condicionada al turnado secuencial: primero supervisión, luego residencia; residencia no puede resolver antes del turnado | ✅ sí | backend autorizarEstimacion controller:432-434 (409 'aún no ha sido turnada') y el UPDATE exige EXISTS turnado_a='residencia' (controller:442); rechazarEstimacion idéntico (controller:479-489). Solo supervisión turna (co | Cumplido y endurecido contra TOCTOU (FOR UPDATE en turnar controller:370; EXISTS dentro del UPDATE de autorizar/rechazar). Matiz: 'secuencial' = supervisión→residencia; el contratista (HU-13) PRESENTA antes, no es parte  |
| CA-3: controla el plazo de 15 días naturales (art. 54 LOPSRM) con semáforo basado en la fecha real de recepción | 🟡 parcial | frontend semaforoRevision (jsx:62-73) y SemaforoPlazoRevision (jsx:344-371) deriva en vivo desde revision.enviada_en; umbrales ≤7 verde / 8-12 amarillo / >12 rojo (jsx:70); PLAZO_REVISION_DIAS=15 (jsx:21). Backend NO per | El semáforo arranca de enviada_en (sello de PRESENTACIÓN del contratista, HU-13), NO de una 'fecha de recepción' distinta — en el flujo reconciliado la presentación ES la recepción a revisión. Los umbrales 7/12 son del p |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- RECHAZO con motivo obligatorio que genera observación automática: residencia rechaza con motivo (requerido), el backend avanza a 'rechazada' E inserta una observación tipo='rechazo', turnado_a='contratista' con el motivo (controller:459-504); el frontend exige motivoRechazo.trim() antes de habilitar el botón (jsx:504, 727). La ficha vieja no menciona el rechazo→reingreso (eso vive en HU-16).
- ELIMINAR observaciones: supervisión puede borrar SUS propias observaciones (autor_id=req.user.id) solo en estado 'enviada' y antes de turnar (controller eliminarObservacion:312-345; botón frontend jsx:118-127). No documentado en la ficha.
- Opción 'sin observaciones': supervisión puede turnar SIN observaciones marcando un checkbox; el backend inserta un marcador-observación de constancia (controller:396-403; checkbox frontend jsx:677-686). No documentado.
- Candado de máquina de estados: solo se observa/turna/autoriza/rechaza si estado==='enviada' (controller:290,324,362,429,476); tras turnar, la revisión de supervisión queda CERRADA (controller:293-295,327-329). No documentado en la ficha.
- Selector contrato→estimación filtrado: el frontend solo lista estimaciones en estado enviada/autorizada/rechazada como revisables/consultables (jsx:419-421); las 'integrada' no aparecen.
- Indicador visual de 3 pasos (Supervisión→Residencia→Resolución) con estados Turnado/En revisión/Resuelto (IndicadorFlujo jsx:296-342). No documentado.
- Lectura acotada por participación: revisionEstimacion permite ver a cualquier parte/supervisión/dependencia (esParteOSupervision, controller:241-243) → 403 si no participa; el gating de ACCIÓN es por rol exacto (supervision_id/residente_id). No documentado.
- Acción de finanzas/pago NO ocurre aquí: tras 'autorizada' el banner remite a HU-20/HU-21 (jsx:644-648); el pago lo hace finanzas en HU-21. La ficha no aclaraba el límite del alcance.
- Carátula/generadores/notas se leen del detalle REAL de HU-12 (api.detalleEstimacion → GET /estimaciones/:id, jsx:403, ContenidoCaratula/Generadores/Notas jsx:187-294); no hay datos dummy.

**Recomendaciones / [validar profe]:**
- ¿Las observaciones deben poder anclarse 'por concepto' (renglón del generador) y no solo por sección, como pedía la ficha CA-1? Hoy es por sección.
- ¿Es aceptable que las secciones 'registro fotográfico' y 'soportes' no se muestren (faltan archivos reales) aunque la ficha CA-1 las nombra? Backend ya las acepta.
- Umbrales del semáforo 7/12 días son del prototipo, no de ley: confirmar con el profe los cortes verde/amarillo/rojo y si debe haber bloqueo al vencer (hoy solo informa).
- ¿El plazo de 15 días debe correr desde la PRESENTACIÓN (enviada_en, como hoy) o desde una 'fecha de recepción' separada? En el flujo reconciliado se asumió que presentación = recepción a revisión.
- Validar emisor/firma legal de la autorización y del rechazo (hoy solo se sella estado + autor de la observación, sin firma formal).

---

## HU-16 · Reingreso de estimación tras rechazo

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| CA-1: La nueva versión se trata como bloque completo independiente y la versión rechazada queda como histórico vinculado. | 🟡 parcial | frontend/src/pages/ReingresoEstimacion.jsx:108-113,296-326 (tablas 'Trazabilidad' e 'Histórico de versiones' con datos dummy historicoVersionesDummy de dummy.js:735); schema.sql:1124 columna estimaciones.reemplaza_a (sel | Solo prototipo de UI con estado local (useState) y datos dummy. La columna de trazabilidad existe en BD pero ningún endpoint la pobla ni la consulta; el 'bloque independiente' y el 'vinculado' son simulados en cliente, n |
| CA-2: El listado de observaciones de la versión rechazada está disponible para descarga en PDF o Excel. | 🟡 parcial | frontend/src/pages/ReingresoEstimacion.jsx:44-92 (exportarObservacionesPdf con jsPDF / exportarObservacionesExcel con descargarExcelHoja), botones en :169-184; spec hu-16-reingreso.spec.js:84-86 verifica visibilidad de b | La descarga funciona y es real (genera archivo), PERO sobre 3 observaciones HARDCODEADAS en dummy.js, no sobre las observaciones reales del rechazo (que en HU-15 sí se persisten vía estimacion_observaciones, estimaciones |
| CA-3: La nueva versión queda vinculada con la rechazada para trazabilidad, sin reiniciar el plazo de presentación. | 🟡 parcial | frontend/src/pages/ReingresoEstimacion.jsx:150-160 (banner 'aviso-reingreso': 'Nueva versión v2 creada y vinculada a la versión rechazada v1... El plazo de presentación NO se reinicia') y tabla trazabilidad :254-293; spe | Es un mensaje de texto en el prototipo. No se crea ninguna versión real, no se escribe reemplaza_a, y el 'no reinicio del plazo art.54' no está implementado en ningún cálculo del backend; es declarativo. |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- La ficha NO menciona que la pantalla es un PROTOTIPO/DUMMY: ReingresoEstimacion.jsx consume contratoDummy, observacionesRechazoDummy, reingresoBannerDummy e historicoVersionesDummy (frontend/src/pages/ReingresoEstimacion.jsx:9-14) y opera con useState local; no llama a services/api.js (grep en api.js: sin reingreso/reemplaza). NINGÚN dato es real.
- La ficha NO menciona el reparto de permisos: contratista ejecuta, residente CONSULTA (solo lectura vía useVistaHU('HU-16') en ReingresoEstimacion.jsx:95 + RegionEditable disabled :212), y supervisión/dependencia/finanzas SIN acceso (permisos.js:30; spec hu-16:69-109).
- La ficha NO menciona que la BD YA está preparada para el reingreso: schema.sql:1124 añade estimaciones.reemplaza_a (self-FK con ON DELETE SET NULL) + UNIQUE uq_estimaciones_reemplaza_a (a lo sumo un reingreso por rechazada, schema.sql:1125-1131) + índice idx_estimaciones_reemplaza_a. La infraestructura de trazabilidad existe; solo falta el endpoint.
- La ficha NO menciona el formulario de captura real del reingreso: textarea 'Nota de atención a observaciones' + checkbox 'Confirmo que atendí las observaciones' como gate del botón (ReingresoEstimacion.jsx:100,218-238). Esto es comportamiento del prototipo que la ficha vieja no describe.
- El reingreso aparece como ACCIÓN PENDIENTE etiquetada en el tablero HU-17: tablero.controller.js:47 ({ rechazada: { roles:['contratista'], accion:'Reingresar la estimación rechazada (HU-16)' } }). Es solo una etiqueta de 'mis pendientes', NO dispara ni implementa reingreso.
- El rechazo origen (HU-15) SÍ es real y persiste observaciones: estimaciones-ciclo.controller.js:459-507 (rechazarEstimacion: estado 'enviada'->'rechazada' + INSERT observación tipo 'rechazo', turnado_a 'contratista'). HU-16 NO se conecta a esos datos reales; el ciclo queda roto entre el rechazo real (HU-15) y el reingreso simulado (HU-16).

**Recomendaciones / [validar profe]:**
- [NO CONSTRUIDO - backend] No existe endpoint de reingreso: ningún controller escribe/lee estimaciones.reemplaza_a (grep en estimaciones-ciclo.controller.js sin coincidencias); falta crear POST de reingreso que inserte la nueva estimación real con reemplaza_a = <id rechazada>, copiando el catálogo como bloque independiente
- [NO CONSTRUIDO - datos reales] Las observaciones, el banner y el histórico son dummy (dummy.js:719-737); falta conectar con las observaciones reales del rechazo de HU-15 (estimacion_observaciones, tipo 'rechazo') y con las versiones reales de la estimación
- [NO CONSTRUIDO - plazo art.54] El 'no reinicio del plazo de presentación' es solo un texto del prototipo; falta lógica de backend que respete el sello enviada_en original (no reabrir el plazo del art.54 LOPSRM) al reingresar — confirmar regla legal con el profe
- [validar profe] La ficha vieja cita 'descarga en PDF o Excel' de observaciones: confirmar si el reingreso real debe mantener ambos formatos o consolidarse (coherente con O9 expediente como un solo PDF)
- [validar profe] Numeración de versiones (v1/v2) y semántica de 'bloque completo independiente' vs reutilizar número de estimación del mismo periodo: definir cómo se modela en estimaciones (¿misma estimación con versión, o nueva fila vinculada por reemplaza_a?). El schema sugiere nueva fila vinculada.

---

## HU-17 · Tablero de estimaciones aceptadas y en proceso

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| El tablero muestra solo estimaciones aceptadas y en proceso (presentada, en revision, autorizada, en pago, pagada), NO las rechazadas (viven en el historial). | 🟡 parcial | backend/src/controllers/tablero.controller.js:31-37 (ESTADOS con enGrid:true para integrada/enviada/autorizada/pagada y enGrid:false para rechazada) y :127 (solo empuja tarjeta si meta.enGrid); frontend TableroEstimacion | El grid excluye correctamente la rechazada (CA-1 cumplido). PARCIAL porque los estados reales del CHECK de schema son SOLO 5 (integrada/enviada/autorizada/pagada/rechazada); los estados de la ficha vieja 'en revision' y  |
| Cada estimacion muestra su linea de tiempo de estado, y el tablero da indicadores agregados del contrato (avance, montos, dias en cada estado). | 🟡 parcial | Linea de tiempo: TableroEstimaciones.jsx:57-78 (MiniStepper de 4 fases Integrada->Presentada->Autorizada->Pagada, marca completado/actual). Montos agregados: controller:148-164 (por_estado con monto_neto/monto_subtotal;  | Linea de tiempo, montos agregados y dias-en-estado SI estan, y bien (server-side, cuadre al centavo). PARCIAL porque el 'avance' (fisico vs programado) que pide la ficha NO se calcula ni se muestra: busque 'avance'/'fisi |
| El panel 'Mis pendientes' filtra los pendientes segun el rol del usuario autenticado. | ✅ sí | controller:43-48 (PENDIENTE_POR_ESTADO mapea estado->roles+accion) y :169-181 (solo agrega si regla.roles.includes(req.user.rol), tomado del JWT, no del body); UI TableroEstimaciones.jsx:298-322 (panel 'Mis pendientes' p | Cumplido. El rol sale del JWT (req.user.rol), fuente segura. Mapeo reconciliado O7<->HU-15: integrada->contratista presenta, enviada->supervision/residente revisa-autoriza, autorizada->finanzas paga, rechazada->contratis |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- Acotamiento por PARTICIPACION server-side: el tablero solo muestra estimaciones de contratos donde el usuario es parte (created_by/residente_id/superintendente_id/supervision_id) salvo dependencia y finanzas que ven todo. controller:84 (filter esParteOSupervision) + lib/acceso.js:4,8. Spec :92-97 (residente NO ve contrato ajeno) y :133-137 (dependencia SI). La ficha vieja no menciona reglas de visibilidad por contrato.
- Filtros consultativos client-side: la vista tiene tres selectores (Estado, Periodo, Responsable) que filtran las tarjetas en el cliente sin recargar. TableroEstimaciones.jsx:189-211,250-276. La ficha no los pide.
- Catalogo canonico de estados forward-compatible: la agregacion recorre los 5 estados aunque haya 0 (por_estado siempre devuelve los 5). controller:86-89,148-160. No documentado.
- El responsable/next-actor de cada estimacion se muestra como 'Responsable' en cada tarjeta (rol que debe actuar). controller:136 + jsx:149-151. La ficha solo habla de 'linea de tiempo', no de mostrar el responsable.
- KPIs de cartera: Contratos, Monto total estimado, Monto pagado, Monto pendiente (=estimado-pagado). controller:185-191 + jsx:86-91. La ficha pide 'avance/montos/dias' generico; estos KPIs concretos no estan listados.
- El endpoint es de SOLO LECTURA y no muta nada; no toca el core congelado de estimacion (HU-12). controller:6-7 (comentario) y ausencia de INSERT/UPDATE (solo un SELECT). Refuerza que es una vista derivada.
- Estado de la HU en la app: integrada en main, con router montado en server.js:52 (/api/tablero) y servicio api.js:104. Funcional end-to-end (no es dummy: dummy.js:740 solo quedan datos legacy no usados por la pagina).

**Recomendaciones / [validar profe]:**
- [validar profe] El 'avance' (fisico vs programado) que pedia la ficha vieja NO se construyo en el tablero: no hay calculo ni columna de avance. Decidir si el tablero debe incorporar avance fisico o si ese indicador vive solo en HU-06/HU-07.
- [validar profe] Los estados 'en revision' y 'en pago' de la ficha vieja NO son estados propios del modelo (el CHECK tiene 5: integrada/enviada/autorizada/pagada/rechazada). Hoy 'Presentada'(enviada) cubre la revision y 'Autorizada' cubre el previo-al-pago. Confirmar si basta con etiquetas/next-actor o se requieren sub-estados dedicados.
- [validar profe] Los indicadores agregados son de CARTERA (todos los contratos visibles del usuario), no de un unico contrato seleccionado como sugeria la ficha ('del contrato'). Hay desglose por_contrato, pero no un selector de contrato unico. Confirmar el alcance esperado.
- [validar profe] El gate de pago aguas abajo (HU-21) es PERMISIVO (acepta integrada/enviada/autorizada); el tablero asume el flujo art.54 reconciliado O7<->HU-15. Confirmar la maquina de estados definitiva.

---

## HU-18 · Portafolio ejecutivo con semaforos

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| CA-1: cada contrato muestra un semaforo de color calculado a partir de 3 factores (avance fisico vs programado, atrasos en plazos legales, pendientes sin atende | 🟡 parcial | frontend/src/data/portafolioLogica.js:9-45 (calcularSemaforo: puntajeDesviacion + puntajeDiasVencidos + puntajePendientes, total<=1 verde, 2-3 amarillo, >=4 rojo) invocado en PortafolioEjecutivo.jsx:197-200; render del d | El semaforo SI se calcula en cliente a partir de 3 factores y SI se muestra por contrato. PERO los factores vienen de datos DUMMY hardcodeados (dummy.js:807,816,825,834,843), no de avance real ni de plazos legales reales |
| CA-2: al hacer doble clic sobre un contrato se abre su detalle con indicadores fisicos, financieros, atrasos y penalizaciones | ✅ sí | FilaContrato onDoubleClick={() => onSeleccionar(c.folio)} (PortafolioEjecutivo.jsx:132); PanelDetalle (jsx:67-121) muestra avanceFisico, avanceFinanciero, diasVencidos (atrasos) y penalizaciones (jsx:94,100,107,114-115). | Cumple los 4 indicadores pedidos (fisico/financiero/atrasos/penalizaciones). Es doble clic (no clic simple). Datos dummy, no reales. |
| CA-3: el portafolio puede agruparse (por contratista, ejercicio fiscal o tipo de contratacion) y comparar el periodo actual contra el anterior | 🟡 parcial | Agrupar SI: select-agrupar-por con opciones Ninguno/Contratista/Ejercicio fiscal/Tipo de contratacion (dummy.js:849; jsx:212-224,248-269). Comparacion periodo: VariacionMesBadge (jsx:18-39) muestra delta avance vs avance | La agrupacion por los 3 criterios pedidos esta completa y funcional. La 'comparacion periodo actual vs anterior' existe SOLO como badge por contrato (avance del mes vs avance del mes anterior, ambos dummy), no como compa |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- Contadores agregados del portafolio (Total + cuenta de verde/amarillo/rojo) en tarjetas superiores: PortafolioEjecutivo.jsx:41-65, data-testid contador-verde/amarillo/rojo. La ficha vieja no menciona estos KPIs de cabecera.
- Tooltip nativo (title) en cada fila con el desglose del semaforo: 'factor: valor (+puntos) | Total: N' (PortafolioEjecutivo.jsx:125-128,134). No documentado en la ficha.
- Columna 'Estado' textual por contrato ('Sin atraso', 'Al corriente', 'Atraso leve', 'Finiquito pendiente', 'Atraso critico + penalizacion') tomada del dummy (dummy.js:803,812,821,830,839; render jsx:148). No esta en la ficha.
- El portafolio NO esta conectado a backend ni a contratos reales: opera sobre 5 contratos fijos hardcodeados en dummy.js:800-846 (folios C-2026-0042/0047/0038/0029/0051). No filtra 'mis contratos asignados' del usuario logueado; muestra siempre los mismos 5 a cualquier dependencia/residente/supervision. No hay endpoint en backend (Grep 'portafolio' en backend = solo coincidencias de HU-13/15 sobre semaforo de 15 dias art.54, no del portafolio).
- Acceso de solo lectura para residente y supervision (permisos.js:32 'C'), no contemplado explicitamente en la ficha (que dice solo 'Como: dependencia'). Spec hu-18-portafolio.spec.js:102-118 verifica que residente/supervision consultan y contratista/finanzas no ven la vista (lineas 124-139).

**Recomendaciones / [validar profe]:**
- [validar profe] La vista opera 100% sobre datos DUMMY hardcodeados (5 contratos fijos en dummy.js); NO esta conectada a backend, no lee contratos reales ni 'mis contratos asignados' del usuario. Falta endpoint y cableado en api.js para que los semaforos/indicadores se deriven de datos reales (avance real, plazos LOPSRM/RLOPSRM, penalizaciones art.138/139).
- [validar profe] CA-3 'comparar periodo actual vs anterior' esta solo como badge por fila (avance del mes vs mes anterior), no como comparativa agregada del portafolio entre dos periodos seleccionables. Definir si se requiere selector de periodos y comparacion a nivel grupo/total.
- [validar profe] Los umbrales del semaforo (desviacion <=5/<=15, dias <=10, pendientes <=2) y el mapeo total->color son definidos por Code en portafolioLogica.js; confirmar las reglas y las cotas de cada factor.
- [validar profe] El factor 'atrasos en plazos legales' se simula con un campo numerico diasVencidos del dummy; definir contra que plazo legal real se computa (entrega de obra, autorizacion de estimacion art.54, etc.).
- [validar profe] Confirmar si residente y supervision deben tener acceso de solo lectura (hoy 'C' en permisos.js); la ficha vieja solo menciona a la dependencia.

---

## HU-19 · Exportación de los 7 reportes definidos del contrato

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| CA-1: cada uno de los 7 reportes genera un archivo descargable en el formato establecido (PDF, Excel o ambos según el reporte) | 🟡 parcial | reportesContrato.js:380-400 CATALOGO_REPORTES (7 reportes) + HANDLERS; jsPDF (R1,R5) y exceljs vía excelExport.js (R1,R2,R3,R6,R7). Spec hu-19-reportes.spec.js:212-226 descarga REAL de R1/R2/R3/R5/R6/R7 verificando sugge | 6 de 7 reportes generan archivo. R4 (Observaciones) está DESHABILITADO (disponible:false, reportesContrato.js:384) porque no existe un GET de observaciones a nivel contrato (HU-15 solo las expone por estimación). El repo |
| CA-2: el usuario puede seleccionar el periodo (mensual, trimestral, acumulado) sin alterar el contenido predefinido del reporte | ✅ sí | ExportacionReportes.jsx:160-168 selector con PERIODOS_REPORTE=['Mensual','Trimestral','Acumulado'] (reportesContrato.js:390). El periodo solo recorta el RANGO de fechas: ventanaPeriodo() L65-72, recortarPeriodos() L76-80 | El periodo NO cambia las columnas/contenido predefinido, solo acota fechas donde aplica (avance físico, financiero, bitácora) y etiqueta el archivo. El ANCLA del recorte ('dato más reciente del conjunto': último mes/trim |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- TODA la generación corre en el CLIENTE (jsPDF + exceljs vía excelExport.js); NO toca backend ni server.js (reportesContrato.js:1-2). La ficha vieja no especifica dónde se genera.
- Los reportes están CABLEADOS A DATOS REALES por endpoint (no dummy): R1←leerProgramaObra+trabajosDeContrato+listarPagos; R2←historialEstimaciones+listarPagos; R3←historialEstimaciones; R5←notasDeContrato; R6←convenios; R7←historialEstimaciones+preparacionEstimacion (reportesContrato.js:7-15; ExportacionReportes.jsx:59-70).
- Hay que SELECCIONAR un contrato antes de exportar; con datos cargados se habilitan los botones (ExportacionReportes.jsx:49-78,92-98). Sin contrato/sin sesión todos los botones están deshabilitados (spec L183).
- Las fuentes están ACOTADAS POR PARTICIPACIÓN en el backend; un 403 muestra 'No tienes acceso a este contrato' (ExportacionReportes.jsx:72).
- R5 (Bitácora) tiene gating adicional 'requiereBitacora': si el contrato no tiene bitácora aperturada (notas==null por 404), su botón se deshabilita con badge 'Sin bitácora aperturada' (jsx:93,97-98,214-218; reportesContrato.js:385).
- Reconciliación O7↔HU-15: los reportes muestran el ESTADO con su ETIQUETA canónica (labelEstadoEstimacion: enviada→'Presentada', autorizada→'Autorizada'), no el valor crudo del esquema (reportesContrato.js:24,249,283,367). La ficha vieja (de antes del flujo reconciliado) no menciona estados de estimación.
- R7 (Penalizaciones) DERIVA la pena por atraso por identidad de la carátula (retencion_atraso = subtotal−amortización−retención−deductivas−neto) porque el endpoint del historial no expone retencion_atraso (penaAtrasoDerivada L50-51). El fundamento legal art.138/139 RLOPSRM está marcado [validar profe].
- R7 distingue tres conceptos que la ficha trata como uno ('penalizaciones'): pena por atraso (art.138/139 RLOPSRM derivada), retención 5 al millar fiscal (art.191 LFD), deductivas (art.46/46 Bis) + pena convencional % pactada del contrato (reportesContrato.js:352-372).
- R2 (Avance financiero) deja PENDIENTE el comprometido/disponible presupuestal porque depende de HU-20 (presupuesto_anual); el resumen lo rotula 'PENDIENTE' (reportesContrato.js:268,382).
- Citas legales en R6: convenios art.59/59 Bis LOPSRM, revisión SFP art.102, ajuste de costos art.59 Bis (reportesContrato.js:329,344-345). No las menciona la ficha.
- Nombre de archivo con convención fija: reporte_<id>_<slug>_<periodo>_<fecha-stamp>.<ext> (baseName L40); verificado por los specs.

**Recomendaciones / [validar profe]:**
- R4 Observaciones queda DESHABILITADO: no existe GET de observaciones a nivel contrato; opción futura = fan-out client-side de revisionEstimacion por estimación (fuera del alcance actual). La ficha pide los '7 reportes' pero hoy solo 6 exportan.
- R7: fundamento legal de la pena por atraso (art.138/139 RLOPSRM) — Nivel 1, lo confirma el profe; el número cuadra exacto (derivado de la carátula) pero la cita legal está pendiente.
- Ancla del recorte por periodo (Mensual=último mes, Trimestral=último trimestre, anclado al 'dato más reciente del conjunto'): marcado [validar profe] en código y UI.
- R2: comprometido/disponible presupuestal depende de HU-20 (presupuesto_anual); hoy el resumen lo rotula 'PENDIENTE'.
- Mejora opcional NO congelada (E3): exponer e.retencion_atraso en el SELECT de historialEstimaciones para leer la pena directa en vez de derivarla.

---

## HU-20 · Tránsito a pago: carga de soportes y verificación de suficiencia presupuestal

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| Verifica suficiencia presupuestal contra el techo anual y bloquea la generación de la instrucción de pago si el monto excede lo disponible (art. 24 LOPSRM). | 🟡 parcial | frontend/src/pages/TransitoPago.jsx:22-105 (SuficienciaPresupuestal) calcula disponibleAntes = techo - comprometido y excede = monto > disponibleAntes; el bloqueo del botón en :278 puedeGenerar = todosCargados && !excede | La lógica de bloqueo UI funciona pero opera sobre dummy: no hay verificación real contra un techo anual persistido ni Σ pagado. El bloqueo es solo cliente (no hay endpoint que lo imponga server-side). El monto es editabl |
| Semáforo del plazo de 20 días naturales (art. 54 LOPSRM) basado en la fecha de autorización, y avisa al entrar en amarillo. | 🟡 parcial | TransitoPago.jsx:157-209 (SemaforoPlazoPago) con diaLimite=20; calcula diaActual = HOY - fechaAutorizacion en :261-269 usando dummy.js:513 fechaAutorizacionOffsetDias=13 (siempre cae en ámbar). El 'avisa al entrar en ama | El semáforo se muestra y calcula en vivo, pero (a) la fecha de autorización es un offset dummy fijo, no la fecha real de autorización de la estimación; (b) los umbrales son 0-10 verde / 11-17 ámbar / 18-20 rojo (líneas 1 |
| La instrucción de pago solo puede generarse cuando todos los soportes obligatorios (factura, CFDI, estado de fianza de cumplimiento cuando el contrato lo exija) | 🟡 parcial | TransitoPago.jsx:107-155 (SoportesObligatorios) lista 3 soportes desde dummy.js:503-507 (factura, CFDI, fianza); el botón se bloquea con todosCargados = soportes.every(s=>s.cargado) (:275, :278). Toggle por botón 'Marcar | El gate 'todos cargados → habilita botón' funciona en UI. PERO: no hay carga real de documentos (solo toggle de un boolean en memoria), y la condicionalidad 'cuando el contrato lo exija' NO está implementada — la fianza  |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- La matriz de permisos da acceso de CONSULTA (nivel 'C') a residente y dependencia, y NIEGA acceso a supervisión (null) — esto no está en la ficha vieja (permisos.js:34; spec hu-20-transito.spec.js:72-108).
- La vista respeta soloLectura: cuando el nivel no es 'E' (residente/dependencia consultan) el botón 'Generar instrucción' NO se renderiza y aparece aviso de solo consulta; las regiones editables se deshabilitan vía RegionEditable (TransitoPago.jsx:253, :320-323, :337). No documentado en la ficha.
- Al 'generar la instrucción' la app muestra DOS secciones: banner verde 'Instrucción de pago generada' (AvisoInstruccionGenerada :211-222) y una sección 'Notificación a Finanzas' con destinatario/fecha-hora/monto (NotificacionFinanzas :224-250). Ambas son simuladas (estado local), no documentadas como entregables.
- Tras generar, la vista se congela: instruccion!=null vuelve a deshabilitar la región editable (:320) y oculta el aviso de bloqueo (:327). Comportamiento de 'una sola instrucción' no documentado.
- El monto de la estimación es un INPUT EDITABLE por el usuario (:69-77) en lugar de derivarse de la estimación autorizada — comportamiento real que difiere del concepto legal (el neto debería ser server-side). En el BannerContexto se muestra un 'Neto $1,285,750.00' y 'EST-2026-003 autorizada' totalmente hardcoded (:308-310).
- El schema.sql YA tiene la DDL anticipada (presupuesto_anual + instruccion_pago, líneas 1183-1229) con estados emitida/notificada/cumplida/cancelada y UNIQUE por estimación, pero NO hay backend que la use: la HU está en estado prototipo/dummy, sin endpoints.

**Recomendaciones / [validar profe]:**
- TODA la HU es prototipo dummy: no hay endpoints. La DDL (presupuesto_anual, instruccion_pago) existe en schema.sql pero ningún controller la usa. Falta implementar: cargar techo real, calcular Σ pagado + neto ≤ techo server-side, persistir la instrucción y notificar a Finanzas. [validar profe / Maiki: prioridad de implementación]
- El monto de la estimación es un input editable, no se deriva de la estimación autorizada real; el 'Neto' y 'EST-2026-003 autorizada' del banner son hardcoded. Definir cómo enlazar con la estimación autorizada (flujo HU-13/HU-15) y con la fecha de autorización real para el semáforo.
- Los umbrales del semáforo (verde ≤10 / ámbar 11-17 / rojo >17) son una decisión de UI del usuario, no derivados del art. 54. Confirmar la regla de aviso (¿amarillo a qué día?).
- La condicionalidad de la fianza ('cuando el contrato lo exija', art. 54 / garantías) no está implementada — la fianza se exige siempre. Definir la regla.
- No hay carga real de soportes (factura/CFDI/fianza son toggles en memoria). Falta el upload real y su almacenamiento.
- La notificación a Finanzas y el aviso al entrar en amarillo (art. 54) son texto estático, no notificaciones reales (in-app/correo). Definir el mecanismo de notificación de Etapa 1.
- El art. 55 LOPSRM (gastos financieros por mora) que cita la ficha vieja NO se refleja en el código (ni cálculo ni texto).

---

## HU-21 · Registro del pago efectuado

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| CA-1: El registro del pago marca la estimacion como pagada y actualiza el avance financiero del contrato. | 🟡 parcial | backend/src/controllers/pagos.controller.js:100 ejecuta UPDATE estimaciones SET estado='pagada' WHERE id=$1 dentro de la misma transaccion (BEGIN linea 55 / COMMIT linea 101); el frontend lo refleja (RegistroPago.jsx:101 | La parte 'marca la estimacion como pagada' SI esta (estado -> 'pagada', transaccional). La parte 'actualiza el avance financiero del contrato' NO se materializa como un campo/recalculo de avance financiero del contrato:  |
| CA-2: se encuentran/registran los datos: fecha, importe, referencia bancaria y usuario que realizo el registro. | ✅ sí | INSERT INTO pagos (...fecha_pago, importe, referencia, ..., registrado_por) en pagos.controller.js:91-98; registrado_por = req.user.id (linea 97, del JWT, nunca del body). La lectura devuelve registrado_por_nombre via LE | Cumple y SUPERA: ademas de los 4 datos pedidos registra estimacion_id, estimacion_ref, factura_cfdi (CFDI obligatorio), fecha_factura, fecha_autorizacion (opcional) y observaciones. El importe ya NO se teclea: se deriva  |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- El pago se AMARRA a una estimacion REAL del contrato (estimacion_id obligatorio): la ficha vieja no menciona estimacion_id; el backend lo exige (pagos.controller.js:37) y valida que exista, pertenezca al contrato y no este pagada/rechazada (lineas 62-71).
- El importe NO se captura: se DERIVA server-side del neto de la estimacion (importe = est.neto, pagos.controller.js:89). El frontend lo muestra read-only (RegistroPago.jsx:163-164 'No editable art.118 / cuadre'). La ficha pedia capturar 'importe'.
- NO doble pago: candado por UNIQUE parcial uq_pagos_estimacion (schema.sql:1501) + chequeo previo SELECT 1 FROM pagos WHERE estimacion_id (pagos.controller.js:72-73, 409) + SELECT ... FOR UPDATE (linea 61) para serializar contra concurrencia. No documentado en la ficha.
- Candado de estado PERMISIVO: solo se paga una estimacion en estado 'integrada','enviada' o 'autorizada'; se rechaza 'pagada' (409, linea 65) y 'rechazada' (409, linea 66). [validar profe] endurecer a SOLO 'autorizada' (comentario lineas 67-71). No documentado.
- Validacion de fecha (Plan2 Pase3): la fecha de pago NO puede ser anterior al dia de integracion de la estimacion (integrada_en); 400 si es anterior (pagos.controller.js:80-86). Cubierto por spec frontend/e2e/pago-fecha-integrada.spec.js:79-87. No documentado.
- Datos fiscales obligatorios no pedidos por la ficha: referencia bancaria SPEI (<=100 chars), folio fiscal CFDI obligatorio (<=60 chars), fecha de la factura obligatoria; todos validados 400 (pagos.controller.js:39-43).
- Indicador DERIVADO del plazo de 20 dias naturales (art. 54 LOPSRM): dias_transcurridos = fecha_pago - GREATEST(fecha_autorizacion, fecha_factura) y plazo_cumplido <= 20 se calculan en la lectura, no se almacenan (pagos.controller.js:131,137-139); el frontend pinta badge verde/ambar (RegistroPago.jsx:238-242). No documentado.
- Inmutabilidad (append-only): trigger trg_pago_inmutable bloquea cualquier UPDATE sobre pagos (schema.sql:503-512); un pago registrado es inalterable (auditoria). No documentado.
- Registrado_por sale SIEMPRE del JWT, nunca del body (pagos.controller.js:97), patron de identidad autentica. No documentado explicitamente en la ficha mas alla de 'usuario que realizo el registro'.
- Estado de las pruebas: la spec hu-21-registro-pago.spec.js (frontend/e2e) verifica permisos por rol (finanzas ejecuta; residente/dependencia consulta; contratista/supervision sin acceso) pero los tests del FORMULARIO estan en test.fixme (lineas 58, 81) porque la pagina ahora requiere datos reales (post alta-v2, ya no hay form dummy). El comportamiento del pago se prueba via API en pago-fecha-integrada.spec.js.

**Recomendaciones / [validar profe]:**
- Endurecer el candado de estado a SOLO 'autorizada' (hoy permisivo: integrada/enviada/autorizada) — decision de Maiki/profe (pagos.controller.js:67-71).
- Pago PARCIAL vs EXACTO: hoy importe = neto completo de la estimacion; falta validar si procede pago parcial (comentario pagos.controller.js:88).
- 'Actualizar el avance financiero del contrato' (CA-1 viejo): hoy solo se marca la estimacion 'pagada'; no hay un acumulado/indicador financiero del contrato que se recalcule — definir si se requiere.
- Fundamento legal de que la fecha de pago no pueda ser anterior a la integracion ([validar fundamento con el profe], pagos.controller.js:79).
- fecha_autorizacion es provisional: 'pasara a HU-20 (instruccion de pago)'; mientras tanto el plazo cae a fecha_factura (base_provisional) (RegistroPago.jsx:187,242).
- Reescribir/activar los tests del formulario que hoy estan en test.fixme tras la conversion a integracion (hu-21-registro-pago.spec.js:58,81).

---

## Registro · Registro de usuario con aprobacion

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| El registro captura los datos del solicitante (incluido el rol que solicita) y crea la cuenta en estado pendiente, SIN otorgar acceso ni el rol solicitado de fo | ✅ sí | backend/src/controllers/auth.controller.js:101-106 INSERT ... rol=NULL, rol_solicitado=$4 ('rolSol'), estado='pendiente'; el rol solicitado se valida contra ROLES_VALIDOS (linea 88) y si no es valido queda NULL; register | El 'rol que solicita' SI se captura y guarda en rol_solicitado, pero es solo informativo (la UI lo rotula 'Informativo: la dependencia confirma el rol definitivo', SeleccionRol.jsx:252-254). La columna rol efectiva queda |
| El sistema impide el ingreso de cuentas no aprobadas e informa que estan pendientes de autorizacion | ✅ sí | backend/src/controllers/auth.controller.js:48-51 login(): si estado != 'activo' responde 403 con mensaje MSG_PENDIENTE ('Tu cuenta esta pendiente de aprobacion por la dependencia', linea 20) o MSG_RECHAZADA si fue rechaz | Distingue pendiente vs rechazado con dos mensajes diferentes (la ficha solo pedia 'pendiente'; el sistema da MAS: tambien informa el rechazo). El frontend muestra el mensaje del backend tal cual en el banner auth-mensaje |
| La dependencia revisa las solicitudes y asigna el rol efectivo (que puede diferir del solicitado), aprueba o rechaza, y queda registrado quien aprobo y cuando ( | ✅ sí | backend/src/controllers/usuarios.controller.js: listarUsuarios (7-31, GET /usuarios?estado=pendiente), aprobarUsuario (61-91: exige rol valido en body linea 70, UPDATE rol=$1, estado='activo', aprobado_por=req.user.id (d | El rol efectivo NUNCA se hereda del solicitado: el frontend obliga a elegirlo (SolicitudesRegistro.jsx:27-28,46) y el backend rechaza con 400 si falta (usuarios.controller.js:70-72). aprobado_por sale del JWT (req.user.i |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- Existen DOS interfaces de registro que pegan al MISMO backend (api.register -> POST /auth/register): (a) la inline en la pantalla de login SeleccionRol.jsx (FormRegistro, testids reg-*) que es la EXERCITADA por el spec y la unica enlazada desde la UI (boton 'Registrate' link-registro); (b) una pagina standalone publica SolicitudRegistro.jsx en la ruta /solicitud-acceso (testids sol-*) que esta ROUTEADA (App.jsx:96) pero HUERFANA: ningun componente enlaza a /solicitud-acceso (grep solo halla la ruta y comentarios, frontend/src). Sin cobertura de spec.
- El registro captura una EMPRESA opcional (catalogo del profe, O3): autocomplete con datalist contra GET /auth/empresas (publico); si la empresa tecleada no existe, el frontend pide confirmacion (window.confirm) y el backend la da de alta via resolverOCrearEmpresa y vincula usuarios.empresa_id (auth.controller.js:96-99,102-105; schema.sql:1545). La ficha vieja no menciona empresa.
- El nombre se captura en DOS campos OBLIGATORIOS separados (nombre[s] + apellido[s]) que se CONCATENAN al enviar; se exige nombre completo >=2 palabras (regex /\p{L}{2,}/gu) tanto en cliente como en servidor, porque el nombre aparece en la bitacora (correccion profe 04-jun, art.123 RLOPSRM). Backend lo bloquea con 400 (auth.controller.js:80-82); spec hu-registro.spec.js:109-134 cubre que falte nombre o apellido.
- Reglas de contrasena no documentadas en la ficha: minimo 8 caracteres (validado cliente SeleccionRol.jsx:150 y servidor auth.controller.js:83-85) y confirmacion de contrasena que debe coincidir (cliente SeleccionRol.jsx:154-157).
- El email se normaliza a minusculas+trim antes de insertar (auth.controller.js:89) y el correo duplicado responde 409 'Ese correo ya esta registrado' (auth.controller.js:113-114, via codigo Postgres 23505).
- El listado de solicitudes (SolicitudesRegistro.jsx) maneja un estado 'sin sesion/modo demo': si no hay token muestra aviso en vez de error (lineas 19,98-102), residuo del modo proyecto en retirada.
- aprobarUsuario y rechazarUsuario validan el id (entero positivo) y responden 404 si no existe (usuarios.controller.js:63-65,83-85,96-99,107-109).

**Recomendaciones / [validar profe]:**
- El umbral de 'nombre completo' (>=2 palabras, regex /\p{L}{2,}/gu) lo fijo la Fundacion como regla operativa; NO tiene articulo propio (la cita art.123 RLOPSRM es por la trazabilidad en bitacora). [validar redaccion con el profe]
- Existe una pagina standalone de registro HUERFANA en /solicitud-acceso (SolicitudRegistro.jsx) sin enlace desde la UI ni cobertura de spec: decidir si se elimina o se enlaza (la version viva es la inline de la pantalla de login). [decision Maiki]
- El bloque 'sin sesion / modo demostracion' del panel de solicitudes (SolicitudesRegistro.jsx) es residuo del modo proyecto EN RETIRADA: revisar al remover el modo proyecto.

---

## Por Firmar · Firma de aperturas de bitácora pendientes (bandeja "Por firmar")

| Criterio de la ficha | ¿Construido? | Evidencia | Nota |
|---|---|---|---|
| En una bandeja 'Por firmar', cada firmante ve únicamente las aperturas que requieren su firma y que aún no ha firmado | ✅ sí | backend/src/controllers/bitacora.controller.js:303-315 (pendientesPorFirmar: WHERE f.usuario_id=$1 AND f.firmado=false); frontend/src/pages/PorFirmar.jsx:18-26,81-94 (tabla con filas data-testid='fila-por-firmar'); api.p | Filtra por el usuario del JWT y solo firmas no firmadas. Muestra folio, objeto, 'tu parte' (rol_en_firma) y fecha de apertura. Vacío => data-testid='por-firmar-vacio'. |
| Al firmar, la firma queda registrada con la identidad del firmante y la fecha/hora; ningún usuario puede firmar por otro | ✅ sí | backend/src/controllers/bitacora.controller.js:269-296 (firmarApertura usa req.user.id del JWT, firmado_en=NOW(); 403 si no es firmante, 409 si ya firmó); spec frontend/e2e/bitacora-v2.spec.js:53,117-120 ('(b) firmar la  | La identidad sale del token (req.user.id), nunca del body. UPDATE acotado a su propia fila (usuario_id=token). No hay forma de firmar por otro: si el token no pertenece al roster -> 403 'No eres firmante de esta apertura |
| Cuando todos los firmantes autorizados han firmado, la apertura queda marcada como completa | ✅ sí | backend/src/controllers/bitacora.controller.js:291-296 (count(*) FILTER WHERE NOT firmado; completa = pendientes===0) y :356 (bitacoraDeContrato: completa = firmantes.every(firmado)); frontend PorFirmar.jsx:32 ('La apert | 'completa' se DERIVA en cada lectura (no es columna persistida). Roster de firmantes = residente + superintendente + supervisión (si el contrato la tiene) — controller:104-111. |

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- La respuesta de firmar devuelve el contador exacto de firmas que faltan: {firmado, firmado_en, completa, pendientes} (controller:296); el frontend distingue mensaje 'quedó COMPLETA' vs 'Faltan otras firmas' (PorFirmar.jsx:32).
- Manejo explícito de doble-firma: POST /firmar de una apertura ya firmada por ese usuario devuelve 409 y la UI muestra 'Ya habías firmado esta apertura' (controller:281,289; PorFirmar.jsx:35).
- Manejo de no-firmante: 403 'No eres firmante de esta apertura' con toast en la UI (controller:280; PorFirmar.jsx:36).
- Tras firmar con éxito la fila desaparece de la bandeja en el cliente sin recargar (filter por apertura_id, PorFirmar.jsx:33) y en caso de error se recarga la lista (PorFirmar.jsx:38).
- La misma acción de firma existe TAMBIÉN dentro de la pantalla de Emisión de notas (EmisionNotas.jsx:154-160, btn-firmar-apertura), no solo en la bandeja dedicada — ambas llaman al mismo endpoint api.firmarApertura.
- La firma completa de la apertura es CANDADO para emitir notas: sin todas las firmas, POST de nota -> 409 'No se pueden emitir notas hasta que la apertura esté firmada por TODOS' (controller:540-550). La ficha no menciona este efecto aguas abajo.
- Acceso controlado por guarda de ruta `<SoloRol roles=['residente','contratista','supervision']>` (App.jsx:75) — la ficha lista los roles pero no documenta que dependencia/finanzas quedan fuera del frontend ni que el backend no filtra por rol nominal (solo por pertenencia al roster).
- Acceso al sidebar: enlace 'Por firmar' bajo sección Bitácora (Sidebar.jsx:60-64).
- Si no hay token/sesión, la página muestra aviso 'Inicia sesión en modo aplicación' y no llama al backend (PorFirmar.jsx:13,47-50).

**Recomendaciones / [validar profe]:**
- La ficha vieja no tiene número de HU (es 'Por Firmar', SRV-03-05 / MOD-03); confirmar con el profe si se le asigna identificador formal o queda como sub-historia de HU-08.
- Confirmar matriz de acceso: el backend NO filtra por rol nominal (cualquier autenticado llega al endpoint, solo el roster firma); la restricción de roles es únicamente la guarda de ruta del frontend (SoloRol residente/contratista/supervision). Validar si dependencia/finanzas deben quedar excluidas también server-side.
- Confirmar que la composición del roster de firmantes (residente + superintendente + supervisión-si-existe) es la lista de 'firmantes autorizados' esperada por el profe (art. 123 fr. III).

---

## HU-22 · Sustitucion de personas del roster (art. 125 fr. I g RLOPSRM)

_(Funcionalidad sin ficha previa — ver historia nueva en `Historias_Usuario_ACTUALIZADAS_12jun.md`.)_

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- Funcionalidad COMPLETA sin ficha en el xlsx; entregable de Fundacion (Maiki), doc docs/historial/fundacion/SUSTITUCION_PERSONAS_Maiki.md.
- Endpoints (roster.routes.js:13-14, /api/roster): GET /contrato/:id -> {contrato_id,vigente,historial} (controller:73); POST /contrato/:id/sustituir body {rol,nuevoUsuarioId,motivo,notaId?} (controller:80-212).
- Roster VIGENTE DERIVADO: fila ACTIVA (vigencia_hasta IS NULL) o del cache escalar de contratos si no esta versionado (controller:62-71; UI '(sin versionar aun)' RosterContrato.jsx:154).
- Lazy seed: sin fila activa, la 1a sustitucion siembra la inicial desde el cache (motivo 'Asignacion inicial (alta del contrato)') y la cierra (controller:133-142; UI EVENTO RosterContrato.jsx:95-97).
- Transaccional/serializada: BEGIN + pg_advisory_xact_lock(3,id) + SELECT FOR UPDATE (controller:99-104); cerrar anterior -> insertar nueva con sustituye_a/registrado_por JWT (controller:153-161) -> nota -> sync cache escalar (controller:194, lo lee lib/acceso.js congelado).
- Nota bitacora AUTOMATICA/ATOMICA: con bitacora abierta y titular anterior, nota 'res_sustitucion' tag 'sustitucion' emisor JWT (controller:178-188; helpers bitacora.controller.js:404,431); sin bitacora se DIFIERE y avisa (controller:198-211).
- Emisor nota = ejecutor (JWT), [validar profe] si debe ser el residente (controller:183).
- Validaciones nuevo titular (controller:118-123): existe/activo/rol ROL_CUENTA {residente->residente,superintendente->contratista,supervision->supervision} (controller:25); 400 'ya ocupa ese rol' (controller:149); convencion [validar profe] (controller:23-24).
- Inmutabilidad BD: contrato_roster append-only + trigger sigecop_roster_transicion (schema.sql:1282-1302) prohibe reasignar/re-cerrar; indice unico PARCIAL uq_contrato_roster_activo = UNA activa por (contrato,rol) (schema.sql:1274).
- NO se borra: usuario_id ON DELETE RESTRICT (schema.sql:1258); sustituye_a/nota_id NO ACTION (schema.sql:1265,1268).
- Firmas atadas a usuario_id (cuenta): la sustitucion NO toca bitacora_* -> firma previa conserva su firmante original; solo afecta futuras (controller:11-15; doc Maiki T5/T5b; UI RosterContrato.jsx:107,220).
- UI: nueva persona SIEMPRE seleccionada (sust-nuevo); ELIMINADO input de ID a mano (sust-nuevo-id) (RosterContrato.jsx:190-206; spec roster-sustitucion.spec.js:83-101); lista vacia -> aviso sust-sin-elegibles sin input.
- Historial Persona/Desde/Hasta/Evento/Motivo, 'vigente' para activa; EVENTO derivado en frontend (RosterContrato.jsx:96,160-169).
- Errores HTTP 400/403/404/409(23505)/500; motivo OBLIGATORIO cita art. 125 fr. I g (controller:91-93,107,116,120-123,220-222).
- Seed idempotente schema.sql:1307-1321 desde punteros escalares con guard NOT EXISTS (Render).

**Recomendaciones / [validar profe]:**
- Autoridad para sustituir: dependencia O residente asignado O creador, [validar con el profe] (roster.controller.js:110-116).
- Emisor formal de la nota: hoy el ejecutor (JWT); [validar profe] si debe ser el residente (controller:183).
- Convencion rol-roster -> rol-cuenta (superintendente=contratista), [validar con el profe] (controller:23-24).
- Funcionalidad SIN ficha de HU (no en .work_hu_xlsx.txt ni permisos.js): falta formalizarla.
- Nota diferida: la fila queda con nota_id nulo hasta abrir la bitacora; verificar que al asentarse quede vinculada (controller:188).

---

## HU-23 · Catalogo de empresas (Oleada O3)

_(Funcionalidad sin ficha previa — ver historia nueva en `Historias_Usuario_ACTUALIZADAS_12jun.md`.)_

**El sistema hace, pero la ficha NO documentaba (sumar a la historia):**
- TABLA Y CATALOGO AUTO-POBLADO: schema.sql:1532-1542 crea empresas(id, nombre VARCHAR(200), creado_en) con indice UNICO FUNCIONAL NORMALIZADO uq_empresas_nombre_norm = lower(btrim(regexp_replace(nombre,'\s+',' ','g'))) que colapsa 'Patito'/'PATITO '/'patito  sa' a una sola empresa. No hay pantalla de administracion: el catalogo se llena por 'resolver-o-crear' al registrarse.
- RESOLVER-O-CREAR IDEMPOTENTE: empresas.controller.js:20-45 resolverOCrearEmpresa(q, nombre) normaliza con la MISMA expresion del indice, busca por forma normalizada (SELECT lower(btrim(regexp_replace...))) y si no existe la INSERTA; maneja carrera concurrente con catch de codigo 23505 -> re-SELECT. El primero la registra, el siguiente la reusa.
- ENDPOINT PUBLICO DEL CATALOGO: auth.routes.js:13 GET /api/auth/empresas (listarEmpresas, empresas.controller.js:49-57) devuelve solo id+nombre, SIN authMiddleware (cuelga del unico router publico para no tocar server.js congelado). Frontend lo consume via api.listarEmpresas() (api.js:31).
- VINCULO EN EL REGISTRO: auth.controller.js:70-106 -> register acepta campo 'empresa' (texto, OPCIONAL/aditivo); si viene, resolverOCrearEmpresa antes del INSERT de usuarios y guarda usuarios.empresa_id (schema.sql:1545). Si no viene, empresa_id queda NULL (retrocompatible). empresa_id NUNCA viaja en el JWT, solo en los SELECT.
- DOS FORMULARIOS DE REGISTRO CON AUTOCOMPLETE: SeleccionRol.jsx (FormRegistro, testids reg-*, pantalla login/registro que App.jsx:50 muestra cuando !rol) y SolicitudRegistro.jsx (testids sol-*, ruta /solicitud-acceso, App.jsx:96) implementan AMBOS un input Empresa con <datalist> cargado de api.listarEmpresas(), y un window.confirm("'X' no esta en el catalogo. Registrarla como nueva empresa?") cuando lo tecleado no esta (comparacion normalizada espejo del backend). El e2e o3-empresas.spec.js ejercita SeleccionRol (reg-*).
- AVISO 'MISMA EMPRESA' EN EL ALTA (NO BLOQUEA): AltaContrato.jsx:276-285 muestra data-testid='aviso-misma-empresa' cuando el superintendente (contratista) y la supervision comparten empresa_id; texto cita 'la supervision debe ser un tercero independiente' y dice '[validar con el profe]'. NO impide avanzar el wizard. Los empresa_id de los asignables llegan via usuarios.controller.js:47-49 (LEFT JOIN empresas en listarAsignables).
- EMPRESA EN EXPEDIENTE + BUSQUEDA POR EMPRESA: contratos.controller.js:498-514 enriquece detalleContrato con residente/superintendente/supervision_empresa (LEFT JOIN empresas). ConsultaExpediente.jsx:23 anade el campo de busqueda 'empresa', muestra la empresa junto a cada persona del equipo (lineas 238-240) y filtra los bloques juridicos/roster por empresa (lineas 613-626).
- EMPRESA EN EL ROSTER: roster.controller.js:46-65 anade usuario_empresa (LEFT JOIN empresas) al historial y al vigente del roster; ConsultaExpediente.jsx:331 lo pinta (roster-exp-empresa-<id>) y RosterContrato.jsx lo muestra en la vista vigente.
- SEED Y BACKFILL DEMO IDEMPOTENTES: schema.sql:1550-1572 siembra 3 empresas demo (Dependencia Demo, Constructora Demo, Supervision Externa Demo) con WHERE NOT EXISTS sobre la forma normalizada, y hace BACKFILL de empresa_id de las cuentas demo solo si empresa_id IS NULL. Decision deliberada (OLEADA3 doc): contratista y supervision en empresas DISTINTAS para que el aviso de 'misma empresa' NO se dispare en los contratos demo.

**Recomendaciones / [validar profe]:**
- El aviso de 'misma empresa' (superintendente vs supervision) hoy AVISA pero NO bloquea; el propio codigo (AltaContrato.jsx:282) lo marca '[validar con el profe]' por si debe ser bloqueo duro.
- El feature no cita articulos en el codigo (la justificacion 'catalogos: es lo de ley' es verbal del profe, no hay numero de articulo en el codigo) -> sin cita legal verificable. Confirmar el fundamento legal del catalogo y de la regla supervision=tercero independiente.
- Hay DOS formularios de registro con la misma logica de empresa (SeleccionRol.jsx con testids reg-* y SolicitudRegistro.jsx con testids sol-*). Confirmar si ambos deben coexistir o si uno es legado (duplicacion a consolidar).
- La extension de auth.controller.register la marca el propio doc OLEADA3 como 'tension de alcance' (el prompt pedia NO tocar auth core; se interpreto auth core = JWT/login/middleware). Confirmar con Maiki que la edicion de register es aceptable.
- El endpoint GET /api/auth/empresas es publico (sin token) y expone todas las razones sociales del catalogo; confirmar que eso es deseable (se asumio dato no sensible).

---
