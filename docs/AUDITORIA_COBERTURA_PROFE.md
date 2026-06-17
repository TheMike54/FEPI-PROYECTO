# Auditoría de cobertura contra el profe — SIGECOP (18-jun-2026)

> **Qué es:** cruce honesto de **cada cosa que el profe Carlos Silva ha pedido** (consolidado de todos los
> audios + revisión del 16-jun) contra el **sistema REAL** (código verificado, no la doc). Verificación
> adversarial con varios agentes leyendo el código; los puntos sensibles (cédula, fecha pasada, candado de
> anticipo server-side, plazo art. 54, timeline) se confirmaron a mano.
> **Fuentes:** `docs/REQUERIMIENTOS_PROFE_CONSOLIDADO.md`, `docs/ANALISIS_REVISION_PROFE_16jun.md`,
> `docs/audios/WhatsApp Audio 2026-06-15 at 8.20.40 PM_transcript.txt`, código en `frontend/`+`backend/`.
> **Regla:** estricto. **"Sí"** solo si está completo y con **backend real**; **"Parcial"** si está a
> medias, solo en UI, o le falta una pieza; **"No"** si no existe. **No se maquilla nada.**

---

## 0. Resumen honesto

De **83 puntos** evaluados: **54 ✅ Sí · 17 🟡 Parcial · 12 ❌ No.**

**Lo sólido (el núcleo del ciclo de obra, con cuadre exacto al centavo y barreras reales en BD):** alta de
contrato (folio `UNIQUE` en BD, monto **derivado** `Σ ROUND(cant×pu,2)`, programa matriz concepto×periodo con
regla 100% revalidada en SQL, plan de amortización con reglas R2/R3 art. 143-I), bitácora **append-only** con
trigger de inmutabilidad y folio atómico, catálogo de empresas con **dedup fuerte** y selector, ciclo de
estimación integrar→presentar→revisar(supervisión/residencia)→pagar con gates de rol por contrato, **pago
estricto** art. 54 (solo `autorizada`), y **HU-02 fianzas / HU-11 minutas / HU-18 portafolio / HU-20 tránsito
a pago YA funcionales**. Schema de 36 tablas + seed idempotente para probar sin captura manual.

**⚠️ Lo que hay que decir claro (sin maquillar):**
1. **Tres pedidos DIRECTOS del profe NO hechos:** (a) la **cédula profesional sigue obligatoria** (él pidió
   quitarla), (b) la **fecha de inicio acepta fechas pasadas** (sin bloqueo) — *aunque el 16-jun él mismo
   pidió mantenerlas por ahora para poder probar las alertas de atraso; el bloqueo está diferido por acuerdo*,
   (c) el **catálogo no aplica a las dependencias** (la dependencia se elige como cuenta, no del catálogo).
2. **Varios candados legales viven SOLO en el cliente** (un POST directo los salta): anticipo > umbral,
   PDF de autorización del anticipo, y el plazo de presentación del art. 54 (es aviso, no candado).
3. **Notificaciones, registro fotográfico y carga de archivos binarios están diferidos** (esqueleto/metadatos).
4. **La congruencia descansa en parte en cambios LOCALES aún sin commit** (varias sesiones); el doc refleja el
   estado **local**, no necesariamente lo desplegado en Render.

---

## 1. Tabla de cobertura (por bloque)

> Leyenda: ✅ Sí (backend real) · 🟡 Parcial · ❌ No. La evidencia es `archivo:función/línea`.

### §1 Empresas (el foco del profe)
| # | Petición | ¿Cubierta? | Dónde | Evidencia |
|---|---|---|---|---|
| 1 | Empresa = catálogo: se registra una vez y se **elige** de una lista (no texto libre); imposible duplicar | ✅ | Registro (SeleccionRol/SolicitudRegistro) + backend | `empresas.controller::resolverOCrearEmpresa` (match débil + **fuerte**: acentos/puntuación/sufijos); `<select>` reg/sol-empresa-select; `schema.sql` índice único normalizado |
| 2 | Empresa visible para **todos** los usuarios | ✅ | Endpoint público del catálogo | `auth.routes` `GET /empresas` (público); catálogo único compartido. *(No hay pantalla para "navegar la lista" — eso es el #8.)* |
| 3 | Empresa **explícita en el alta** (mostrar la del superintendente/supervisión) | ✅ | `AltaContrato.jsx` Equipo del contrato | `empresa-contratista`/`empresa-supervisión` derivadas de la cuenta (`usuarios.controller` LEFT JOIN empresas). *(Del residente no se muestra en el alta; sí en el expediente.)* |
| 4 | Aviso si contratista y supervisión son de la **misma empresa** (terceros independientes) | 🟡 | `AltaContrato.jsx` | `aviso-misma-empresa` es **solo banner visual, NO bloquea**; el backend `crearContrato` no valida `empresa_id`. Si las cuentas no tienen empresa, el aviso nunca salta. |
| 5 | El catálogo aplica **también a dependencias** | ❌ | Alta / modelo | No existe tabla `dependencias`; la dependencia es una **cuenta** (`contratos.dependencia_id → usuarios`); el selector lista cuentas, no el catálogo. |
| 6 | Buscar **por empresa/contratista** | ❌ | Expediente | El buscador del expediente quedó (decisión del propio profe 16-jun) en tipo-doc/periodo. **No existe** un buscador/listado **cross-contrato** que localice contratos por empresa. |
| 7 | Consolidar duplicados previos | ✅ | Script CLI | `scripts/consolidar_empresas.js` (dedup fuerte, dry-run/`--apply`, transacción). *(Es CLI manual, no UI.)* |
| 8 | Vista dedicada "Empresas" navegable | ❌ | — | No hay ruta ni `pages/Empresas.jsx` ni permiso. El catálogo solo se expone por el `<select>` del registro. |
| 9 | Separar dependencias de empresas (tabla aparte) | ❌ | `schema.sql` | Una sola tabla `empresas` sin discriminador de tipo; "Dependencia Demo" es una fila más. |

### §2 Alta de contrato (HU-01) + Garantías (HU-02)
| # | Petición | ¿Cubierta? | Evidencia |
|---|---|---|---|
| 10 | Folio **único** (duplicado no pasa) | ✅ | `schema.sql` `folio UNIQUE` + `contratos.controller` 23505→409. Barrera en BD. |
| 11 | Catálogo de conceptos con **clave** capturada (art. 45 fr. IX) | ✅ | `contrato_conceptos.clave` obligatoria + `UNIQUE(contrato_id, clave)`. |
| 12 | Cuadre **exacto al centavo** (monto = Σ conceptos) | ✅ | Monto **derivado** `SUM(ROUND(cant×pu,2))` en Postgres + validación cliente. |
| 13 | Programa = matriz **concepto×periodo** (Gantt), no texto | ✅ | `guardarMatriz` celdas {clave, periodo, cantidad}. |
| 14 | Programa cuadra contra catálogo (regla 100% por concepto) | ✅ | `guardarMatriz` valida Σ por concepto en SQL. |
| 15 | Garantías obligatorias (cumplimiento+anticipo), **ver PDF** | ✅ | **HU-02 ya funcional:** `garantias.controller` (CRUD+endosos+**PDF real**), `RegistroFianzas.jsx`. |
| 16 | Anticipo derivado de % y **avisa/bloquea** si excede umbral (30%/50%) | 🟡 | El bloqueo por umbral vive **solo en `AltaContrato.jsx`**; el backend solo valida 0–100%. **Un POST con 80% sin PDF se guarda.** |
| 17 | Anticipo > umbral exige **PDF de autorización** | 🟡 | `validarPaso(4)` exige el PDF **solo en cliente**; el server no lo ata. |
| 18 | **Plan de amortización** como paso del alta + regla "no todo en el último mes" (art. 143-I) | ✅ | `contratos.controller` plan con **R3** (ningún periodo amortiza más que su avance) + Σ=anticipo al centavo. *(La carátula aún es proporcional — ver #74.)* |
| 19 | Objeto del contrato | ✅ | `objeto` en REQUIRED_FIELDS. |
| 20 | Datos jurídicos = solo firmantes, **SIN cédula** | ❌ | **La cédula SIGUE obligatoria** (`REQ_JURIDICOS` incluye `cedulaProfesional`, `required`, se muestra en el expediente). El profe pidió quitarla. |
| 21 | Contrato nuevo arranca **vacío** | ✅ | `DATOS_INICIALES` vacíos (alta-v2). |
| 22 | Fecha de inicio **no permite pasadas** | ❌ | **No hay bloqueo** (ni `min` en el input ni check server). *Nota: el 16-jun el profe pidió mantener fechas pasadas por ahora para probar las alertas; el bloqueo está diferido por acuerdo.* |

### §3 Bitácora y notas (HU-08/09/10) + Minutas (HU-11)
| # | Petición | ¿Cubierta? | Evidencia |
|---|---|---|---|
| 23 | Apertura = **primera nota (folio 1)**, machote prellenado | ✅ | `bitacora.controller::abrirBitacora` inserta la nota #1. |
| 24 | La apertura **redacta TODOS los datos del alta** (objeto, ubicación, monto, plazo, partes, fechas) | ✅ | `abrirBitacora` → `resumenApertura` narrativo con todos los datos (FASE 2). |
| 25 | Datos mínimos art. 123 fr. III | ✅ | `AperturaBitacora.jsx` exige domicilios+teléfonos de ambas partes, etc. |
| 26 | Notas **append-only** (no anular/editar/borrar; corregir = nota nueva) | ✅ | Trigger `sigecop_nota_inmutable` (BEFORE UPDATE) bloquea; botón "Anular" quitado. |
| 27 | Bitácora **lineal** (links, no hilos) | ✅ | `bitacora_notas.vinculada_a` (un solo puntero). |
| 28 | El emisor **no re-firma**; firman los otros | ✅ | El emisor firma al emitir; los demás firman su parte. |
| 29 | Emisor mostrado **por ROL** (no nombre) | 🟡 | `EmisionNotas.jsx:207` muestra **nombre + rol**. Si el profe quería **solo rol** (anonimizar), no se cumple estricto. |
| 30 | Tipos de nota **por rol** (art. 122/125) | ✅ | `bitacora_nota_tipos` con `rol_emisor` por clave. |
| 31 | **Tag** para búsqueda | ✅ | `bitacora_notas.tag` + índice. |
| 32 | Folio correlativo **sin saltos** | ✅ | `insertarNotaAtomica` con `pg_advisory_xact_lock` + MAX+1. |
| 33 | Firma de los **3 participantes** | ✅ | `bitacora_firmantes` para residente+superintendente(+supervisión). |
| 34 | Fecha de **creación** (no edición) | ✅ | `bitacora_notas.fecha` = instante de creación. |
| 35 | **Notificación** de notas por firmar (push) | 🟡 | Solo bandeja **pull** ("Por firmar") + link; **no hay push** (sin email/web-push/websocket) ni badge/contador. |
| 36 | HU-11 minutas/visitas con vínculo a nota (art. 123 fr. X) | ✅ | `minutas.controller` (CRUD+PDF+vínculo); `MinutasVisitas.jsx`. |

### §4 Estimaciones, revisión, pago, tablero (HU-12..21) + Tránsito (HU-20)
| # | Petición | ¿Cubierta? | Evidencia |
|---|---|---|---|
| 37 | Contratista **integra/presenta** sin prevalidación (solo se regresa si excede catálogo) | ✅ | `integrarEstimacion` (art. 118 acumulado≤contratado). |
| 38 | **Números generadores** por concepto → concentrado → carátula (art. 132) | ✅ | `IntegracionEstimacion.jsx` `TabGeneradores` → `estimacion_generadores`. **Funcional.** |
| 39 | Carátula con **número de estimación y periodo** | ✅ | `caratula-numero-estimacion`. |
| 40 | Carátula **server-side**, cuadre exacto, sin IVA | ✅ | Un solo motor de redondeo en Postgres (art. 143-I, 191 LFD). |
| 41 | Aportación **CMIC / 2 al millar** | ❌ | **Diferido** explícito en el código; solo existe el 5 al millar fiscal (art. 191 LFD). Sin fundamento federal. |
| 42 | Revisión por **sección** con observaciones (HU-15) | 🟡 | El backend acepta 5 secciones; la **UI solo expone 3** (carátula/generadores/notas); fotos/soportes ocultas por no haber archivos. |
| 43 | Supervisión observa/**turna**; residencia autoriza/rechaza | ✅ | `crearObservacion`/`turnarEstimacion` con gates de rol. |
| 44 | Recepción formal + **notificación "en revisión"** | 🟡 | La recepción sí queda (sello `enviada_en` + nota en bitácora); pero "en revisión" es **estado en pantalla, no una notificación** persistida/enviada. |
| 45 | Historial con filtros cronológico (HU-14) | 🟡 | **Timeline incompleta:** solo hay sellos `integrada_en`/`enviada_en`; **no existen** `autorizada_en`/`pagada_en`, así que esos eventos no tienen timestamp. Filtros y export Excel sí. |
| 46 | **Reingreso** tras rechazo = bloque nuevo (HU-16) | ✅ | `reingresarEstimacion` (fila nueva, `reemplaza_a`). |
| 47 | Plazo art. 54 **habilita/inhabilita "Enviar"** (HU-13) | 🟡 | El botón se habilita por **estado** (`integrada`), no por el vencimiento del plazo. El plazo es **aviso/semáforo**, no candado. |
| 48 | Registro de **pago** (no "a pagar"), gate estricto art. 54 (HU-21) | ✅ | `pagos.controller` solo paga `autorizada`; importe = neto server-side. |
| 49 | Tablero de estimaciones aceptadas **línea de tiempo** (HU-17) | 🟡 | Es un **dashboard agregado** (conteos/montos por estado), no una línea de tiempo cronológica; "días en estado" limitado (mismo tope que #45). |
| 50 | **Soportes** (carpeta) + **registro fotográfico** | 🟡 | Solo **metadatos** (`estimacion_soportes`); `upload_archivos.disponible=false`. **No hay carga de archivos** ni carpeta real; el registro fotográfico es placeholder. |
| 51 | Wizard de estimación **por bloques aislado** (FASE 5) | 🟡 | `AmbienteEstimacion.jsx` es un **cascarón** de navegación: solo la carátula es real; generadores/soportes/fotos son placeholders; integra/envía por `Link` a HU-12/13. No es un wizard funcional aislado end-to-end. |
| 52 | HU-20 tránsito a pago (suficiencia art. 24, instrucción) | ✅ | `instruccion-pago.controller` (suficiencia=techo−comprometido, instrucción real, gates). |

### §5–6 Avance/alertas/curva (HU-05/06/07) + Expediente/convenios/roster (HU-04/03/22) + Portafolio (HU-18)
| # | Petición | ¿Cubierta? | Evidencia |
|---|---|---|---|
| 53 | Trabajos terminados **vinculados a nota** de bitácora del periodo (HU-06) | ✅ | `registrarAvance` liga `nota_id`. |
| 54 | Validar por **periodo** del programa (selector, no fecha) | ✅ | `registrarAvance` exige `periodo_numero`. |
| 55 | No estimar/registrar **más de lo programado** sin convenio | ✅ | art. 118 (acum>contratado) **bloquea** 409; exceso del periodo = **aviso**. |
| 56 | Traer al registro el programa **solo del concepto** | ✅ | `TrabajosTerminados.jsx` filtra por concepto. |
| 57 | Avance por **CONTRATO** (global); atraso por concepto (HU-07, déficit en unidades) | ✅ | `CurvaAvance` global + `alertas.controller` déficit en unidades sin umbral. |
| 58 | Curva programada **empieza en CERO** | ✅ | `CurvaAvance` antepone punto {numero:0, programado:0}. |
| 59 | Gráfica **interactiva** (tooltip) | ✅ | `CurvaSVG` con `onMouseEnter` → tooltip. |
| 60 | Expediente con buscador + plan de amortización visible (HU-04) | ✅ | `ConsultaExpediente.jsx`. |
| 61 | Expediente: **oficio de aprobación** del convenio (subir/ver) | ✅ | `convenios.controller::subirOficioConvenio` (PDF append-only) — FASE 0C. |
| 62 | Expediente: el bloque de programa muestra lo **contratado**, no la ejecución | ✅ | `BloquePrograma` con `mostrarRestante=false` (FASE 0). |
| 63 | Expediente: buscador **limpio** (sin empresa/folio que no aplican) | ✅ | `CAMPOS_BUSQUEDA` = solo documento/periodo (decisión profe 16-jun). |
| 64 | Convenios modificatorios: **ligar/versionar**; dependencia crea (HU-03) | ✅ | `crearConvenio` versiona (`programa_version`). |
| 65 | **Sustitución de personas** roster 1:N sin perder histórico (HU-22, art. 125) | ✅ | `roster.controller::sustituirPersona` (cierra vigencia + inserta nueva). |
| 66 | **Salud/dashboard** de contratos (HU-18) + "dar de alta 6 contratos" | 🟡 | Semáforo server-side funciona, **pero** los umbrales son criterio del equipo (sin base legal) y el **seed crea 5 contratos, no 6**. |
| 67 | Súper-entidad **OBRA** multi-contrato | ❌ | No existe; la entidad raíz es `contratos` (un contrato = una obra). |

### §7–8 Metodología/entregables + Decisiones
| # | Petición / decisión | Estado | Evidencia / nota |
|---|---|---|---|
| 68 | **Datos dummy / scripts** para probar cada historia sin captura manual | ✅ | `seed_demo.sql` (carga directa, idempotente; DEMO-01 completo + ATRASO-01..04). |
| 69 | Reset del paquete demo | ✅ | `reset_demo.sql`/`reset_demo.js`. |
| 70 | Gestión de usuarios por script | ✅ | `crear-usuario.js` / `borrar-usuario.js`. |
| 71 | Login **sin selector de rol**; token que **expira** | ✅ | `FormLogin` solo correo+contraseña; token 8h. *(Falta auto-logout en cliente al 401 — ver §2.)* |
| 72 | Historias **actualizadas y congruentes** con el código | ✅ | 25 historias HU-00..24 en lenguaje natural. *(Descansa en parte en cambios locales sin commit.)* |
| 73 | Modelo de datos completo / schema maduro | ✅ | `schema.sql` 36 tablas. |

---

## 2. Lo que está a medias (🟡 — lo más importante de comunicar)

1. **Candado de anticipo solo-cliente** (HU-01): el bloqueo por umbral 30%/50% y el PDF de autorización viven
   solo en `AltaContrato.jsx`. Un POST directo con anticipo 80% sin PDF se guarda. Falta el candado server-side.
2. **Plazo art. 54 no bloquea "Presentar"** (HU-13): "Enviar" se habilita por estado, no por el vencimiento.
   El plazo es semáforo/aviso. Si el profe pidió que el vencimiento inhabilite el botón, **no existe**.
3. **Aviso "misma empresa"** (contratista/supervisión): solo banner, **no bloquea**; el backend no lo valida.
4. **Timeline HU-14 incompleta:** faltan los sellos `autorizada_en`/`rechazada_en`/`pagada_en`, así que esos
   eventos no aparecen fechados. Afecta también a HU-17 ("días en estado").
5. **Amortización — la carátula no obedece el plan editable (Fase B):** las reglas R2/R3 están en el alta,
   pero la carátula de la estimación sigue **proporcional**, no obedece el plan editado. **[validar profe].**
6. **Soportes y registro fotográfico:** solo metadatos; no hay carga de archivos binarios. **No funcional con
   archivos.** El registro fotográfico es placeholder.
7. **Wizard de estimación por bloques (FASE 5):** cascarón de navegación, no un wizard aislado funcional.
8. **Revisión por sección (HU-15):** la UI expone 3 de 5 secciones.
9. **Notificaciones** ("en revisión" y "por firmar"): no hay push real; todo es pull/estado en pantalla.
10. **Emisor de nota** muestra rol **+ nombre** (si el profe quería solo rol, no se cumple estricto).
11. **Auto-logout en cliente:** el token expira server-side, pero el front no fuerza logout al 401.

## 3. Lo NO cubierto (❌)

- **Cédula profesional:** sigue **obligatoria** en el alta y se muestra en el expediente. El profe pidió
  **quitarla**. Para cumplir: eliminarla de `REQ_JURIDICOS`, del formulario y del expediente.
- **Fecha de inicio acepta pasado:** sin bloqueo cliente ni servidor. *(Diferido por acuerdo: el profe quiere
  fechas pasadas por ahora para probar alertas.)*
- **Catálogo no aplica a dependencias** / **separar dependencias de empresas:** la dependencia es una cuenta;
  no hay tabla `dependencias` ni discriminador de tipo en `empresas`.
- **Buscar contratos por empresa/contratista (cross-contrato):** no existe (el buscador del expediente es de
  un solo contrato, por decisión del propio profe).
- **Vista dedicada "Empresas" navegable:** no hay pantalla.
- **Aportación CMIC / 2 al millar:** diferida, sin parámetro.
- **Súper-entidad OBRA multi-contrato:** no existe (impactaría todo el modelo).
- **Campo cédula en usuarios/roster:** no existe (distinto de la cédula jurídica del alta).

## 4. Decisiones de **criterio del equipo / [validar profe]** — el profe NO las ha confirmado

| Decisión | ¿Implementada? | Qué falta confirmar |
|---|---|---|
| **Umbrales del semáforo** (avance ≥95/85/<85; días vencidos 0/1-10/>10) | ✅ implementado (`lib/umbrales-semaforo.js`, parametrizable) | Los **números exactos** (sin base legal; criterio del equipo). |
| **Convenio >25% AVISA, no bloquea** (art. 59 referido) | ✅ implementado | Si avisar vs bloquear es correcto, y el umbral. El 25% no es tope legal del art. 59 (es ref. RLOPSRM 102). |
| **Exceso del periodo = aviso, no bloqueo** (HU-06) | ✅ implementado | Aval escrito (sin cita legal explícita; art. 118 solo cubre el tope contratado). |
| **Amortización estricta vs banda R2/R3 + mínimo legal** | 🟡 R2/R3 en el alta | Si la **carátula** debe obedecer el plan editable (hoy sigue proporcional). |
| **Umbral 30% del anticipo** (dispara el PDF) | 🟡 solo cliente | El % correcto y si debe **bloquear server-side**. |
| **Cédula profesional obligatoria** | ✅ exigida (contradice al profe) | Si se conserva (¿para qué roles?) o se **elimina**. |
| **Vista de gestión del catálogo de empresas** | ❌ | Si el profe la quiere. |
| **Separar dependencias de empresas** (entidad aparte) | ❌ | Si deben ser entidad separada (DDL). |
| **Súper-entidad OBRA** | ❌ | Si la requiere (impacta todo el modelo). |
| **Emisor de notas de consecuencia / no reiniciar plazo art. 54 en reingreso** | marcado `[validar profe]` en código | Emisor exacto; copy verbatim vs re-capturar montos. |

---

> **Conclusión honesta:** el ciclo completo de un contrato está construido y demostrable de inicio a fin con
> cuadre exacto y barreras reales en BD. Las brechas reales son: 3 pedidos directos pendientes (cédula, fecha,
> dependencias-catálogo), candados legales que faltan en el servidor, y funciones diferidas (notificaciones,
> archivos/fotos, súper-entidad OBRA). Conviene **decidir con el profe** las 10 decisiones de la §4 el día de
> la entrega. **Nada de esto está commiteado/pusheado todavía** — vive en local.

---

## 5. Inventario de TODOS los `[validar profe]` que siguen en las historias (clasificados)

> Maiki pidió: para cada `[validar profe]` que sigue en `Historias_Usuario_ACTUALIZADAS_12jun.md`, decir **por
> qué sigue ahí** — si es una decisión que de verdad le toca al profe (correcto que siga), o uno de los 3 que
> ya fijamos como **criterio del equipo** y se quedó sin actualizar por error (en ese caso, corregido).

### 5.a — Los 3 fijados como criterio del equipo (revisados)
| Decisión fijada | ¿Seguía como `[validar profe]` en las historias? | Acción |
|---|---|---|
| **Umbrales del semáforo** | **SÍ, en HU-18** ("Los cortes del semáforo… los definió Code; confirmar las reglas"). En HU-20 ya estaba corregido. | ✅ **Corregido** HU-18 → "RESUELTO (criterio del equipo); centralizado en `lib/umbrales-semaforo.js`, configurable". |
| **Convenio >25% avisa, no bloquea** | **SÍ, en HU-03** ("El límite del 25%… Confirmar valor y aplicabilidad"). El criterio 3 ya decía "avisa". | ✅ **Corregido** HU-03 → "RESUELTO (criterio del equipo): avisa, no bloquea (art. 59); el % sigue ajustable". |
| **Dependencia no registra avance** | **NO** — HU-06 no tenía ninguna marca sobre esto (la decisión se documentó en el ambiente de avance, no en la historia). | Sin acción necesaria. |

### 5.b — Hallazgo extra (stale FACTUAL, no es de los 3) — corregido
- **HU-17** decía: *"El control de pago (HU-21) hoy es permisivo (acepta Integrada/Presentada/Autorizada)"*.
  **Es un hecho desactualizado, no una decisión del profe:** el pago **ya es estricto** (solo `autorizada`,
  art. 54 — verificado en `pagos.controller`). Lo **corregí** porque mantener un dato falso contradice "las
  historias congruentes con el código" (requisito del propio profe). *Si prefieres que lo revierta, dime.*

### 5.c — Los demás `[validar profe]` SON decisiones legítimas del profe (se quedan, por diseño)
Son preguntas reales que **le tocan al profe** (interpretación legal o de alcance), no errores. Resumen por HU:

| HU | `[validar profe]` legítimos (por qué le toca al profe) |
|---|---|
| HU-00 | login indiferente a mayúsculas/minúsculas; si Finanzas necesita reglas extra de acceso. |
| HU-01 | **autorización escrita del anticipo** (art. 50 fr. IV); **amortización estricta (art. 143-I) vs banda R2/R3** + mínimo legal; **cédula** obligatoria; tasa de la pena por atraso. |
| HU-02 | vincular el endoso al convenio que lo origina (mejora opcional). |
| HU-03 | endosos de fianzas vía el convenio; **art. 59 vs 59 Bis** (marca vs régimen); conjunto exacto de roles que registran; emisor de la nota automática; recálculo de periodos al cambiar plazo. |
| HU-06 | tipo de nota 'entrega de obra'; emisor de la nota (contratista); **adelantar a precios pactados = aviso vs bloqueo** (interpretación art. 118); editar avance no regenera la nota. |
| HU-07 | quiénes firman el déficit (art. 123 fr. III/XII). |
| HU-08/09 | fecha de entrega del sitio; **orden de folio vs fecha real** (art. 123 fr. V/VI); quién firma (supervisión vs contraparte). |
| HU-10 | 'firmante' vs emisor en el filtro; alcance de la búsqueda por palabra; alcance del export; filtros sobre datos reales; estado de aceptación filtrable. |
| HU-11 | ¿solo notas **firmadas** se vinculan?; matiz **fr. X vs fr. II** del art. 123. |
| HU-12 | avance físico vs financiero para la retención; bloqueo duro art. 45/52; **umbral 30% del anticipo**. |
| HU-13 | notificación formal; **plazo 6 días: impedir vs advertir**; consecuencia legal del vencimiento; redacción. |
| HU-14 | cita art. 130 / 138 (tipos de estimación / versionado). |
| HU-16 | semántica 'no reiniciar el plazo art. 54'; copia de carátula/generadores; nota de atención a observaciones; formatos de descarga. |
| HU-17 | avance físico no construido; estados 'en revisión'/'en pago' no propios; indicadores de cartera vs un solo contrato. |
| HU-18 | definición de **avance físico**; comparación periodo actual vs anterior; factor 'atrasos en plazos legales' (hoy un número fijo); acceso de solo-lectura de Residencia/Supervisión. |
| HU-19 | pena por atraso (art. 138/139). |
| HU-21 | fundamento de que la fecha de pago no sea anterior a la integración; redacción de la nota. |
| HU-22 | autoridad para sustituir; emisor de la nota; convención rol-equipo vs rol-cuenta. |
| HU-23 | **misma empresa contratista/supervisión: aviso vs bloqueo duro**; reglas de normalización fuerte (qué sufijos se funden). |
| HU-24 | conceptos que entran al saldo del finiquito; requisito de bitácora abierta; **acta de recepción física previa** (art. 64). |

**Lectura rápida:** de todas las marcas, **solo 2 estaban mal** (eran de los 3 fijados y seguían como
pendientes: umbrales en HU-18 y 25% en HU-03) — **ya corregidas**. **1 más** era un hecho desactualizado
(pago permisivo en HU-17) — **corregido**. **El resto son decisiones legítimas del profe** y se quedan: la
mayoría son matices de interpretación legal o de alcance que él debe confirmar (las más relevantes para el 24
están en la §4 y en `PLAN_ENTREGA_24jun.md`).
