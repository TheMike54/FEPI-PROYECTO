# Requerimientos del profe — consolidado de TODOS los audios (SIGECOP)

> **FASE 0** de la sesión autónoma del 15/16-jun (`docs/planes/PLAN_SESION_AUTONOMA_EMPRESAS_15jun.md`).
> Consolida **cada cosa que el profe Carlos Silva ha pedido** a lo largo de las revisiones, con cita
> textual breve, a qué HU/módulo aplica y el estado verificado contra el código real. Sirve para que
> **nada se pierda**. Fuentes: transcripciones en `docs/audios/*.txt` (12, 18, 25, 26-may; 01, 04, 09,
> 15-jun) + `docs/historial/revisiones-profe/audio_profe_revision_01jun_transcript.txt`.
>
> **Leyenda de estado:** ✅ hecho (verificado en código) · 🟡 parcial · ❌ pendiente · 📄 doc/metodología
> (entregable documental, no código) · ⚖️ decisión [validar profe] / de Maiki.
>
> **Audios SIN contenido (solo cabecera):** 05-22 (×2), 05-23 1.36, 05-25 7.48.51 (es de SIGECOP pero
> corto), 05-27, "New Recording 39". **Audios de OTRAS materias (descartados):** 05-23 1.14 (sol. óptima),
> 05-22 ESP32/C602, 05-23 1.36 C504, 05-27 C505, "New Recording 39" C505. Ver §9.

---

## §1. EMPRESAS — el tema central (foco de esta sesión)

**Requerimiento consolidado (en una frase):** la **empresa es un catálogo de primera clase**: se
registra **una sola vez** y a partir de ahí todos la **ELIGEN** de una lista (autocomplete); nunca se
re-teclea, es **imposible duplicar**. *"si ya existe, toma los datos que ya están."*

### Citas textuales (orden cronológico)
| Audio | Cita | Punto |
|---|---|---|
| 25-may | "lo ideal sería que estos fueran catálogos contra esta dependencia… nosotros podemos poner el nombre que sea. De hecho eso sí pasaba con la parte de las firmas. Eso sí lo arreglamos. Pero no acá." | Empresa/dependencia/supervisión deben ser **catálogo**, no texto libre (como ya se hizo con firmas). |
| 25-may | "En teoría tendrías que también registrar la supervisión como empresa." | La **supervisión** también es empresa (tercero). |
| 04-jun | "tener en la base una tabla donde dice empresa y el primer supervisor fue tal, el segundo… para los históricos." | Empresa + **históricos de personas** (roster). |
| 04-jun | "Entonces tú ya tendrías los datos de las empresas… esos nombres en la base, cuando lo grabes, lo asocias." | Asociar persona→empresa en BD. |
| 09-jun | "Tú primero das de alta la empresa y luego vinculas… el primero que registres da de alta una empresa… al siguiente que registre ya está la empresa, **ya la elijo nada más, ya no la registro completo, eficiente**." | **Núcleo del requerimiento: SELECCIONAR del catálogo.** |
| 09-jun | "le pone empresa patito, patit, patito SASB, son distintas empresas, entonces ya no va a ser uniforme tu información… van a tener mucha redundancia." | Causa de la **duplicidad** = texto libre sin normalizar. |
| 09-jun | "Catálogos de empresas. No, no, no. En la implementación eso es lo de ley… tú no creas un catálogo para que nada más tengas 32 estados." | El catálogo es **obligatorio** (analogía de los 32 estados). |
| 09-jun | "Falta la empresa… traes al superintendente, definiste, pero **no a la empresa**." | La empresa debe ser **explícita en el alta**. |
| 09-jun | "el contratista es de la supervisión, la misma empresa… este y este **no pueden ser de la misma empresa**. Este es un tercero." | Independencia contratista/supervisión por empresa. |
| 09-jun | "como no tenemos contrato-empresas **no puede ser búsqueda por contratista**." | Sin catálogo, el buscador del expediente no sirve. |
| 09-jun | "si al residente le pongo dependencia demo, el otro dependencia DEM, son **22 dependencias distintas**." | El catálogo aplica también a **dependencias**. |
| 15-jun | "alguien más registra un contrato y pone a otra persona de esa empresa. **¿Por qué no toma la empresa que ya está registrada? ¿Por qué da de alta una nueva empresa que es la misma?**" | El bug de duplicidad, en vivo. |
| 15-jun | "Si la primera vez, si es nueva, regístrala. **Si ya existe, simplemente toma los datos que ya están. Eso tendría que ser el meollo.**" | **Regla de negocio del catálogo.** |
| 15-jun | "¿Nada más aparece a mí o les aparece a todos los que usan el sistema?" | La empresa debe ser **visible para todos**. |

### Estado actual (verificado contra el código)
| Sub-requerimiento | Estado | Dónde |
|---|---|---|
| Tabla `empresas` + índice único normalizado (débil) | ✅ | `schema.sql` (O3) |
| Catálogo PÚBLICO visible para todos (`GET /api/auth/empresas`) | ✅ | `empresas.controller::listarEmpresas` |
| Resolver-o-crear con dedup **fuerte** (acentos, puntuación, sufijos de razón social) | ✅ | `empresas.controller::resolverOCrearEmpresa` (FASE 3, 15-jun) |
| "Si ya existe, toma la existente" (no duplica) | ✅ | resolver nivel 1 (débil) + nivel 2 (fuerte) |
| **Elegir del catálogo (SELECTOR), no re-teclear** | ✅ (esta sesión) | `SeleccionRol.jsx` / `SolicitudRegistro.jsx` — **FASE 1: datalist→`<select>`** |
| Empresa explícita en el alta (mostrar la del superintendente/supervisión) | ✅ (esta sesión) | `AltaContrato.jsx` — empresa derivada visible junto a la cuenta |
| Aviso contratista=supervisión misma empresa (tercero) | ✅ | `AltaContrato.jsx` (`aviso-misma-empresa`) |
| Catálogo aplica a dependencias | ✅ (mismo catálogo) | `usuarios.empresa_id` cubre todos los roles; dependencia demo ∈ catálogo |
| Buscar por empresa en el expediente | ✅ | `ConsultaExpediente.jsx` (O3) |
| Históricos de personas por contrato (roster) | ✅ | HU-22 `contrato_roster` (art. 125) |
| Consolidar duplicados previos en BD | ✅ | `backend/scripts/consolidar_empresas.js` (dry-run/`--apply`) |
| Vista dedicada "Empresas" (catálogo navegable) | ❌ ⚖️ | **No implementada** (requeriría ruta en `App.jsx` + posible permiso nuevo → zona congelada). Recomendación a Maiki. |
| Catálogo de DEPENDENCIAS como entidad separada de empresas | 🟡 ⚖️ | Hoy dependencias y empresas comparten la tabla `empresas`. Si el profe quiere separarlas, es DDL (decisión de Maiki). |

**Decisión de diseño de esta sesión (FASE 1):** se convirtió el campo de empresa del registro de
**texto libre con `<datalist>`** (que permitía teclear variantes y crear duplicados) a un **`<select>`
del catálogo** + opción explícita **"➕ Registrar nueva empresa"**. Así la vía por defecto es
**elegir**; teclear solo ocurre en la rama explícita de alta nueva, y aun ahí el backend deduplica
(match fuerte) y el front avisa si coincide con una existente. **Elimina la duplicidad de raíz** sin
tocar zona congelada. Lo estructural mayor (vista de catálogo, separar dependencias) se deja a Maiki.

---

## §2. Alta de contrato (HU-01)
| Requerimiento | Cita | Estado |
|---|---|---|
| Folio ÚNICO (duplicado = no pasa) | "el folio contrato debe ser único… si hay un folio duplicado, no pasó el criterio" (12-may) | ✅ constraint UNIQUE → 409 |
| Catálogo de conceptos con **clave/identificador** capturada | "falta el identificador del concepto… lo pongo porque diseño el catálogo" (25-may, 01-jun, 09-jun) | ✅ `contrato_conceptos.clave` (art. 45 fr. IX) |
| Cuadre EXACTO al centavo (monto = Σ conceptos) | "el rango tiene que ser exacto… justificar todo un centavo" (01-jun); "validación en la vista… la suma debe ser idéntica" (04-jun) | ✅ derivado server + validación cliente |
| Programa de obra = **calendario/Gantt** (concepto × periodo), no texto | "Eso no es un programa. Un programa son calendarios… un Gantt" (04-jun); "acomodar los conceptos en el tiempo" (25-may) | ✅ matriz A2 concepto×periodo |
| Programa cuadra contra catálogo (no exceder lo autorizado) | "debe de cuadrar con tu catálogo de conceptos" (01-jun) | ✅ `guardarMatriz` 100% por concepto |
| Garantías obligatorias cumplimiento + anticipo; ver PDF | "te pide dos sí o sí: cumplimiento y anticipo" (04-jun); "le pones un ojito para ver" (18-may) | 🟡 alta exige; HU-02 pantalla dummy |
| **Anticipo derivado de % y avisar/bloquear si excede** (30%/50%) | "estás poniendo más del 10%, más del 30%… aquí la validación" (09-jun); "no debe ser informativo… regla de negocio… no se acepta" (01-jun) | 🟡 cliente avisa/exige PDF; server no bloquea umbral (pendiente) |
| Anticipo > umbral exige **PDF de autorización** | "poner autorización, un clic y subir la autorización" (01-jun) | 🟡 solo cliente |
| **Plan de amortización** como paso del alta (cajitas mes a mes) + PDF | "un plan es igual cajitas, mes 1 cuánto va a dar…" (25-may); "¿cómo vas a eliminar si eso fue lo que acordamos?" (09-jun) | ✅ paso del plan (O2) + FASE 2 (proporcional al programa, art. 143-I) |
| Objeto del contrato en metadatos (para la nota de apertura) | "nos falta poner el objeto del contrato" (25-may) | ✅ `contratos.objeto` |
| Datos jurídicos = solo firmantes (dependencia/contraparte), sin cédula | "datos jurídicos nada más son… quienes firman… la cédula la quitamos" (09-jun) | 🟡 [validar] cédula se conserva por decisión Fundación |
| Folio se LIGA/versiona con modificatorios (no se sustituye) | "no puedes sustituir, lo que tienes que hacer es ligar" (18-may) | ✅ HU-03 `programa_version` |
| Contrato nuevo arranca VACÍO (no prellenado) | "No debe llevar nada, pues es nuevo… ¿por qué le pusieron datos pre registrados?" (01-jun) | ✅ alta-v2 (DATOS_INICIALES vacíos) |
| Validar antes de avanzar (no perder captura al final) | "me vas a hacer capturar todo y poner guardar está mal" (01-jun) | ✅ gating por paso |
| Fecha de inicio no permite fechas pasadas | (lista de pendientes 15-jun: "Fecha de inicio… que no deje iniciar antes. Ya está") | ✅ (O1) |

## §3. Bitácora y notas (HU-08/09/10)
| Requerimiento | Cita | Estado |
|---|---|---|
| Apertura = **primera nota (folio 1)**, machote prellenado | "te generaré la nota de apertura… folio 1 de la ley" (25-may); "un machote y nada más llenes con los datos que te dio" (04-jun) | ✅ apertura=nota#1 |
| Fundamento: art. 46 últ. párr. / 52 Bis LOPSRM; 122/123 RLOPSRM | "Artículo 46 último párrafo… 52 bis… 122 del reglamento" (25-may) | ✅ citado |
| Datos mínimos art. 123 fr. III | "fecha de apertura, datos de las partes, nombre y firma… domicilios, teléfonos…" (01-jun) | ✅ campos en `bitacora_aperturas` |
| Fecha de apertura = día de inicio del contrato | "si mi contrato comienza hoy… tiene que ser el mismo día" (01-jun) | 🟡 [validar] |
| Notas **append-only**: no anular/editar/borrar; corregir = nota nueva vinculada | "no puedes borrar notas, ni anular, ni editar… auditoría función pública" (04-jun) | ✅ triggers de inmutabilidad; quitado botón "Anular" |
| Bitácora **LINEAL** (links, no ramas/hilos tipo blog) | "la bitácora es lineal, no son hilos… hace links en el ciclo" (04-jun) | ✅ `vinculada_a` lineal |
| El emisor NO re-firma; firman los otros | "el que la crea ya no tiene que firmar" (04-jun) | ✅ |
| Emisor mostrado por **ROL** (no nombre) | "en vez del nombre, el rol… que te diga que es el residente" (04-jun) | ✅ |
| Tipos de nota **por rol** según art. 122/125 | "los tipos de nota que puede emitir el residente… si me cambio a supervisor, otros" (04-jun) | ✅ `bitacora_nota_tipos` por rol |
| Tipo "otro" disponible | "con la opción de otra si es necesario" (26-may) | ✅ tipo `otro` |
| Notas con **tag** para búsqueda eficiente | "le ponemos ese tag para una búsqueda eficiente" (01-jun) | ✅ `bitacora_notas.tag` |
| Folio correlativo sin saltos ante concurrencia (asignar al final) | "no puedes saltarte folios… mejor al final" (26-may) | ✅ advisory lock + MAX+1 |
| Firma de los **3 participantes** | "todas las notas firmadas por los tres" (26-may) | ✅ `bitacora_nota_firmas` |
| Mostrar folio, fecha de **creación**, emisor (no última edición) | "la fecha es la de creado siempre" (04-jun) | ✅ fecha+hora de creación (Plan2 2.2) |
| Notificación de notas por firmar (no revisar a diario) | "¿notifica a los demás o nada más por firmar aparece?" (04-jun) | 🟡 hay "Por firmar"; notificación push pendiente |

## §4. Estimaciones, revisión, pago, tablero (HU-12..21)
| Requerimiento | Cita | Estado |
|---|---|---|
| Contratista **integra/presenta** sin prevalidación (responsable); solo se regresa si excede catálogo | "puede hacer su estimación como se le pegue la gana… mientras esté en catálogo" (12-may) | ✅ HU-12/13 |
| **Números generadores** por concepto → concentrado → carátula | "te faltan los generadores… se llena ese concentrado y la carátula" (09-jun) | ✅ `estimacion_generadores` |
| Carátula con número de estimación y periodo | "mostrar el número de estimación… a qué periodo corresponde" (09-jun) | ✅ |
| Carátula server-side, cuadre exacto, sin IVA | "justificar todo un centavo" (01-jun) | ✅ G2 (art. 143-I, 191 LFD) |
| Aportación CMIC/IMIC (2 al millar) en la estimación | "una aportación para capacitación… lo van a ver en la estimación" (01-jun) | ⚖️ parametrizable [validar profe] |
| Revisión por **sección** (carátula/generadores/soportes) con observaciones | "revisar por sección de la estimación" (12-may) | 🟡 HU-15 observaciones por sección (parcial) |
| Supervisión observa/**turna** a residencia; residencia autoriza/rechaza | "registro de observaciones y turno residente" (12-may) | ✅ HU-15 (O7 reconciliado) |
| Recepción formal + **notificación** "en revisión" | "habrá una notificación para la residencia y el superintendente" (12-may) | ❌ notificación pendiente |
| Historial con filtros (aceptada=1, rechazadas=N) cronológico | "un filtro… aceptación una, rechazadas muchas" (12-may) | 🟡 HU-14 (línea de tiempo incompleta) |
| **Reingreso** tras rechazo = bloque NUEVO completo (sin marcar qué observación se atendió) | "presentas uno y es un bloque completo, yo lo reviso y acepto o rechazo" (12-may) | ✅ HU-16 (`reemplaza_a`) |
| Plazo art. 54 habilita/inhabilita "Enviar" (control de plazo) | "habilitar el botón de enviar si está dentro de los cinco días" (12-may) | 🟡 HU-13 solo aviso (no candado) |
| Registro de **pago** (no "a pagar"); todos los datos obligatorios | "es estimación pagada, no a pagar… no puedes enviar si no está todo completo" (26-may) | ✅ HU-21 (gate estricto art. 54) |
| Priorizar por **importancia** (pago primero), no por complejidad | "primero lo más importante aunque sea complejo" (26-may) | 📄 planeación |
| Tablero de estimaciones **aceptadas** (línea de tiempo) | "tiene que ser estimaciones aceptadas… presentada, revisada, autorizada, pagada" (12-may) | ✅ HU-17 |
| Soportes de la estimación (carpeta: generadores/resumen/carátula/docs) | "los soportes era esa carpetota" (09-jun) | 🟡 esqueleto diferido (E3) |
| Registro fotográfico (no "fotos") | "Registro fotográfico se llama" (18-may) | 🟡 esqueleto diferido (E3) |

## §5. Avance, alertas, curva (HU-05/06/07)
| Requerimiento | Cita | Estado |
|---|---|---|
| Registro de trabajos terminados **vinculado a nota** de bitácora del periodo | "cada registro vinculado a su nota de bitácora del periodo" (09-jun) | ✅ HU-06 (O4/O5) |
| Validar por **periodo** del programa (selector, no fecha libre) | "en lugar de la fecha diga periodo 1, 2, 3" (09-jun) | ✅ HU-06 selector de periodo |
| No registrar/estimar más de lo programado sin convenio | "no puedo pagar más de eso… tendría que ser un modificatorio" (09-jun) | ✅ art. 118 bloquea; exceso de periodo = aviso |
| Traer al registro el programa **solo del concepto** | "el programa de obra, pero nada más del concepto" (09-jun) | ✅ |
| Avance de obra es por **CONTRATO** (global); atraso por concepto = parcial | "el avance de obra… por contrato… no por concepto" (09-jun) | ✅ HU-07 panel + global |
| Atraso **sin umbral**: decir cuántas unidades faltan, sin % | "no has entregado 300 que te comprometiste… sin el umbral" (09-jun) | ✅ HU-07 v2 (déficit en unidades) |
| Curva programada **empieza en CERO** | "el programado va en cero" (09-jun) | ✅ (O1 curva desde cero) |
| Gráfica **interactiva** (tooltip al pasar el mouse) | "me dé los valores… en mouse" (09-jun) | 🟡 verificar tooltip HU-05 |

## §6. Expediente, convenios, roster (HU-04/03/22)
| Requerimiento | Cita | Estado |
|---|---|---|
| Expediente con buscador por campo (incl. **por empresa/contratista**) | "búsqueda por contratista" (09-jun) | ✅ HU-04 (O3) |
| Plan de amortización visible en el expediente | "falta el plan de amortización… desde el alta" (09-jun) | ✅ HU-04 |
| Convenios modificatorios: ligar/versionar; quién sube nuevo catálogo/programa | "quién subía el nuevo catálogo… eso tienen que resolverlo" (25-may) | ✅ HU-03 (dependencia crea) |
| **Sustitución de personas** (roster 1:N) sin perder histórico (art. 125) | "haces una sustitución… tabla uno a muchos" (01-jun); HU faltaba documentada (09-jun) | ✅ HU-22 |
| Súper-entidad **OBRA** sobre contratos (tablero de toda la obra) | "una super entidad que se llame obra" (04-jun) | ❌ ⚖️ fuera de Etapa 1 |

## §7. Metodología / entregables documentales (no código)
- Historias de usuario como ficha simple (id, título, rol, qué hace, objetivo, **2-3 criterios** como aseveraciones); cada servicio ≥1 HU; matriz de trazabilidad servicios×HU. 📄
- Complejidad/importancia (user points), sprints semanales reales, priorizar por importancia. 📄
- Estudio de factibilidad **técnica** (no comercial); decisiones por atributos del proyecto, no "lo que sé usar"/brochures. 📄
- Arquitectura por **bloques/módulos**; la vista NO accede directo a datos (pasa por la capa); API REST sobre HTTP. 📄
- Seguimiento de **riesgos** semana a semana. 📄
- Planear el **modelo de datos** completo antes (entidades aunque vacías). 📄 (hecho: schema maduro)
- Mantener **historias actualizadas y congruentes** con el código + **control de versiones**. 📄 (esta sesión actualiza HU-23)
- **Datos dummy / scripts** para probar cada historia sin capturar a mano. ✅ `seed_demo.sql` (FASE 1 sesión previa + esta).
- Gestión de usuarios (altas/bajas) directo en BD por script (no feature). ✅ `scripts/crear-usuario.js` / `borrar-usuario.js`.
- Login sin selector de rol (deduce el rol); sesión con token que **expira**. ✅ (auth, zona congelada).

## §8. Decisiones [validar profe] / de Maiki (NO las decide Code)
- **Amortización:** ¿proporcionalidad ESTRICTA (art. 143-I) o la banda editable R2/R3 actual? + mínimo legal por estimación. ⚖️ (citas 15-jun).
- **CMIC / 2 al millar** en la carátula: tasa, base y aplicabilidad. ⚖️ (cita 01-jun).
- **Umbral del 30%** que dispara el PDF de autorización del anticipo. ⚖️.
- **Cédula profesional** como dato jurídico obligatorio. ⚖️.
- **Empresas:** reglas finas de normalización (qué sufijos se funden); **vista de catálogo** dedicada; **separar dependencias** de empresas (DDL). ⚖️ Maiki.
- **Súper-entidad OBRA** sobre contratos. ⚖️ Maiki (fuera de Etapa 1).
- **Login-contexto de contrato** (04-jun): pospuesto por Maiki (06-jun). ⚖️.
- **BD de Render** (pagar vs nueva): expira ~25-jun. ⚖️ Maiki.

## §9. Audios analizados que NO son de SIGECOP (descartados)
- **05-23 1.14 PM** — otra materia (solución óptima + interfaz gráfica, exposición individual).
- **05-22 3.21 / 3.23 PM** — C602/C504 (ESP32/ESP-IDF/FreeRTOS; timer/ADC/PWM/osciloscopio).
- **05-23 1.36 PM** — C504 instrumentación (tabla variable física/voltajes/binario).
- **05-27 5.07 PM** — C505 ADS (modelado conceptual de BD / diccionario de datos).
- **"New Recording 39"** — C505 ADS (requerimientos no funcionales / ISO 25010 / FURPS).
- Los `.txt` de ~9 líneas son solo cabecera (sin diálogo).
