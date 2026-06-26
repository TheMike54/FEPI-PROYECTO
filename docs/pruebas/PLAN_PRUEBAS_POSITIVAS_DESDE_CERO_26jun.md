# PLAN DE PRUEBAS POSITIVAS — DESDE CERO (FINAL 26-jun-2026)

> **Para imprimir y palomear casilla por casilla.** Réplica del archivo oro
> `docs/pruebas/PLAN_PRUEBAS_FINAL_MATCH_18jun.md` en estructura y profundidad: **UN contrato creado DESDE CERO**
> (`OBRA-2026-QA-CERO-26`) recorrido en el **orden del ciclo** hasta el **finiquito**, con tabla `Campo (testid) →
> Valor` y **VALOR CONCRETO en cada campo**. **NADIE abre contratos pre-llenados `PRUEBA-HU-XX`: todo se captura.**
> Refleja el sistema **TRAS las sesiones autónomas #1 y #2** (§Deltas). 🟢 = ACEPTA · **▢** = casilla.

### ⚠️ NOTA DE TIEMPO (consecuencia del Delta 1 — léela antes de empezar)
La fecha de inicio del alta **ya NO puede ser pasada** (Delta 1). Por eso un contrato dado de alta **hoy** tiene sus
periodos **a futuro** (el primero vence en ~30 días). La **integración de estimación exige un periodo VENCIDO**
(`periodo_fin < hoy`, art. 54 LOPSRM). Consecuencia:
- **PASO 0 → PASO 7** (registro → alta → garantías → bitácora → notas → avance → curva → atrasos) se hacen **desde
  cero HOY** sin problema.
- **PASO 8 → PASO 15** (estimación → presentar → revisión → pago → convenio → finiquito) requieren que el **primer
  periodo haya VENCIDO**. Opciones para ejecutarlos: **(A)** correr esos pasos cuando venza el primer periodo del
  contrato `OBRA-2026-QA-CERO-26`; **(B)** para una demo inmediata end-to-end, demostrar esa cadena sobre un
  contrato cuyo primer periodo YA venció (los `PRUEBA-HU-12..24` del seed cumplen esto — pero eso es el plan
  `PLAN_PRUEBAS_POSITIVAS_FINAL_26jun.md`, no este "desde cero"). **Los valores a teclear de los PASOS 8-15 quedan
  documentados igual** para que sirvan en ambos casos. *(Decisión Nivel 2: la regla no-pasado es criterio del profe;
  el plazo del primer periodo es lo único que condiciona el "mismo día".)*

### §Deltas reflejados (sesiones #1/#2)
1. **Fecha de inicio NO pasada** (front+back). En el alta usa **HOY** (formato AAAA-MM-DD).
2. **Selector de EMPRESA contraparte (`select-empresa-contratista`) debajo de "Dependencia"**; filtra al
   superintendente (`select-superintendente`).
3. **Persona, no cuenta:** los selects de dependencia/superintendente/supervisión y las firmas muestran el **nombre**, no el correo.
4. **Foto de avance OPCIONAL** (`cap-foto-evidencia` puede quedar vacía; ya no bloquea).
5. **Documento de estimación = 4 bloques**; **Sección 3 "Del neto a recibir" con IVA 16%**; **nota↔generador**
   (selector `asignar-nota-${id}` en el bloque 4 del documento).
6. **Supervisión puede ser de OTRA empresa** al sustituir (la REGLA 4 misma-empresa solo aplica a contratista/superintendente).
7. **Exportar historial (HU-14)** sale **con formato** (banda/meta/moneda/TOTALES).
8. **Sesión única** (`token_version`): un login nuevo cierra la sesión anterior.

## Cuentas demo (contraseña común `Sigecop2026!`)
| Cuenta | Rol | Papel |
|---|---|---|
| `residente@sigecop.test` | residente | Alta, abre/firma bitácora, autoriza/rechaza, finiquito |
| `contratista@sigecop.test` | contratista (**superintendente**) | Integra/presenta estimación, registra avance |
| `supervision@sigecop.test` | supervisión | Observa, firma, turna |
| `dependencia@sigecop.test` | dependencia | Garantías, convenios (+autoriza), padrón, roster, finiquito |
| `finanzas@sigecop.test` | finanzas | Tránsito a pago + registra el pago |

> **Pre (roster PASO 12):** 2ª cuenta contratista misma empresa (`super2.demo@`); para la 🔴, otra empresa (`patito1@`).
> Login: `#login-usuario`, `#login-password`, «Iniciar sesión». **Navegación:** modal `modal-elegir-contrato` →
> `modal-contrato-<id>` (elige `OBRA-2026-QA-CERO-26`); sidebar plano; pestañas `pestanas-ciclo`.

---

## 4. DATASET DESDE CERO — `OBRA-2026-QA-CERO-26` (math cuadrada al centavo)

### 4.1 Datos generales (Alta, paso 0) — incluye Deltas 1, 2, 3
| Campo (testid) | Valor |
|---|---|
| Tipo de contratación *(select sin testid, única opción)* | **Obra pública sobre la base de precios unitarios** |
| Folio (`dg-folio`) | `OBRA-2026-QA-CERO-26` |
| Objeto (`dg-objeto`) | `Construcción de aula didáctica — campus UAGRO (QA desde cero)` |
| Ubicación (`dg-ubicacion`) | `Av. Juárez s/n, Chilpancingo, Gro.` |
| Dependencia (`dg-dependencia`) | **Lic. Diana Dependencia Demo** *(muestra nombre, NO correo — Delta 3)* |
| **Empresa contraparte (`select-empresa-contratista`)** | **Constructora Demo** *(Delta 2; va debajo de Dependencia)* |
| Plazo en días (`dg-plazo`) | `90` |
| Fecha de inicio (`dg-fecha`) | **HOY** (la fecha de hoy, AAAA-MM-DD) *(Delta 1: no-pasado)* |
| % pena por atraso (`dg-pena`) | *(vacío)* |
| Superintendente (`select-superintendente`) | **Arq. Carlos Contratista Demo** *(filtrado a Constructora Demo; nombre, no correo)* |
| Supervisión (`select-supervision`) | **Ing. Sofía Supervisión Demo** |

> Derivados (verifica, no se teclean): `monto-derivado`, `termino-derivado` (inicio + 89 días), `empresa-contratista`,
> `empresa-supervision`, `equipo-residente`. **Siguiente →** (`btn-siguiente`).

### 4.2 Catálogo de conceptos (Alta, paso 1) → $1,000,000.00
| i | Clave (`concepto-clave-${i}`) | Concepto (`concepto-concepto-${i}`) | Unidad (`concepto-unidad-${i}`) | Cant. (`concepto-cantidad-${i}`) | P.U. (`concepto-pu-${i}`) | Importe (derivado) |
|---|---|---|---|---|---|---|
| 0 | `C-01` | Limpieza y trazo del terreno | `m²` | `1000` | `50.00` | 50,000.00 |
| 1 | `C-02` | Excavación a máquina | `m³` | `500` | `200.00` | 100,000.00 |
| 2 | `C-03` | Concreto f'c=200 kg/cm² | `m³` | `300` | `2500.00` | 750,000.00 |
| 3 | `C-04` | Acero de refuerzo fy=4200 | `kg` | `2000` | `50.00` | 100,000.00 |
| | | | | | **Σ `monto-derivado`** | **$1,000,000.00** 🟢 |

> Botón «+ Agregar concepto» (sin testid, por texto). Candado: clave obligatoria y única (≤40); concepto+unidad+cant+P.U.>0. `catalogo-indicador` verde. **Siguiente →**.

### 4.3 Programa de obra (Alta, paso 2) — Σ por concepto = 100%
| Campo | Valor |
|---|---|
| Ciclo (`select-ciclo`) | **`mensual`** → 3 periodos |

Celdas `celda-${i}-${p}` (i=fila 0-3, p=1/2/3):
| i | Clave | `celda-${i}-1` | `celda-${i}-2` | `celda-${i}-3` |
|---|---|---|---|---|
| 0 | C-01 | `1000` | `0` | `0` |
| 1 | C-02 | `250` | `250` | `0` |
| 2 | C-03 | `0` | `150` | `150` |
| 3 | C-04 | `0` | `1000` | `1000` |

> Al cuadrar: banner `programa-cuadra` (verde). `periodos-count` = 3. **Siguiente →**.

### 4.4 Datos jurídicos (Alta, paso 3) — TODOS los campos
| Campo (testid) | Valor |
|---|---|
| Firmante dependencia (`jur-firmante`) | `Lic. Diana Dependencia Demo` |
| Cargo (`jur-cargo`) | `Directora de Obras Públicas` |
| Representante legal (`jur-representante`) | `Arq. Carlos Contratista Demo` |
| Cédula profesional (`jur-cedula`) | `12345678` |
| Poder notarial (`jur-poder`) | *(opcional — vacío)* |
| Notaría (`jur-notaria`) | *(opcional — vacío)* |

### 4.5 Anticipo y garantías (Alta, paso 4) — anticipo 30% → $300,000.00
| Campo (testid) | Valor |
|---|---|
| % de anticipo (`anticipo-input`) | `30` *(a 30% NO se exige PDF; `>30` sí, `anticipo-pdf-requerido`, art. 50 fr. IV)* |

Garantías (botón «+ Agregar póliza», por texto; la fianza de anticipo deriva su monto):
| Tipo (`garantia-tipo-${i}`) | Afianzadora (`garantia-afianzadora-${i}`) | Póliza (`garantia-poliza-${i}`) | Monto (`garantia-monto-${i}`) | Vigencia (`garantia-vigencia-${i}`) |
|---|---|---|---|---|
| **Cumplimiento** | `Fianzas del Pacífico S.A.` | `FC-2026-001` | `100000.00` | `2027-12-31` |
| **Anticipo** | `Fianzas del Pacífico S.A.` | `FA-2026-001` | *(read-only `garantia-monto-derivado-${i}`=`300000.00`)* | `2027-12-31` |

> Candado: Cumplimiento obligatoria siempre; Anticipo si anticipo>0 (si falta → `garantias-faltan`; OK → `garantias-ok`).
> ⚠ **Delta 1 (fianza de anticipo):** la vigencia de la fianza de anticipo **no puede ser anterior a la fecha de
> inicio**; con vigencia 2027 cubre de sobra. **Siguiente →**.

### 4.6 Plan de amortización (Alta, paso 5) — Σ = $300,000.00 (art. 143 fr. I)
| Periodo | Monto (`plan-monto-${p.numero}`) |
|---|---|
| P1 | `100000.00` |
| P2 | `100000.00` |
| P3 | `100000.00` |
| **Σ** (`plan-suma`) | **$300,000.00** 🟢 → banner `plan-cuadra` |

> Atajo «Restablecer proporcional» (`plan-restablecer`). **Siguiente →**.

### 4.7 PDF firmado del contrato (Alta, paso 6) — obligatorio para guardar
- Sube cualquier `.pdf` en `pdf-firmado-input-precaptura` (uploader `pdf-firmado-precaptura`; backend valida que
  empiece con `%PDF`). Sin él → `pdf-firmado-requerido` y NO se integran estimaciones después (candado HU-12).
- **Guardar:** `btn-guardar`. 🟢 contrato en «7. Registrados», folio `OBRA-2026-QA-CERO-26`, monto **$1,000,000.00**.

### 4.8 Resultado financiero ESPERADO de las estimaciones (sin IVA, memorízalo)
| Est. | Periodo | Generadores | Subtotal | (−)Amort 30% | (−)5 al millar | **NETO (sin IVA)** | **Total con IVA (Sección 3)** |
|---|---|---|---|---|---|---|---|
| **#1** | P1 | C-01=1000, C-02=250 | 100,000.00 | 30,000.00 | 500.00 | **$69,500.00** | est+16%−amort+16% (Delta 5) |
| **#2** | P2 | C-02=250, C-03=150, C-04=1000 | 475,000.00 | 142,500.00 | 2,375.00 | **$330,125.00** | ídem |

---

## 5. RECORRIDO E2E DESDE CERO — paso a paso (▢)

### ▢ PASO 0 — Registro con empresa (HU-23) — sin sesión
- Pantalla de acceso → «Regístrate» (`link-registro`) → `form-registro`.

| Campo (testid) | Valor |
|---|---|
| Nombre(s) (`reg-nombres`) | `Pedro` |
| Apellido(s) (`reg-apellidos`) | `García Soto` |
| Correo (`reg-email`) | `pedro.cero@prueba.test` |
| Rol (`reg-rol`) | **Contratista / Superintendente** |
| Empresa (`reg-empresa-select`) | **Constructora Demo** |
| Contraseña (`reg-password`) | `Sigecop2026!` |
| Confirmar (`reg-password2`) | `Sigecop2026!` |
| Crear cuenta (`reg-submit`) | (clic) |

> 🟢 cuenta **pendiente** (la aprueba la dependencia). Empresa obligatoria para contratista/supervisión.

### ▢ PASO 0b — Aprobar la solicitud (HU-23 admin) — `dependencia@`
- Sidebar ADMINISTRACIÓN → «Solicitudes de registro» (`/usuarios/solicitudes`).
- Fila `fila-solicitud[data-email="pedro.cero@prueba.test"]`: `select-rol` = **Contratista / Superintendente** → `btn-aprobar`.

> 🟢 la fila desaparece; usuario activo, rol asignado por la dependencia.

### ▢ PASO 1 — Login de los 5 roles + sesión única (Delta 8)
- `#login-usuario` + `#login-password` = `Sigecop2026!` → «Iniciar sesión».
> 🟢 las 5 cuentas inician; chip de empresa y sidebar cambian por rol. **Delta 8:** si vuelves a iniciar sesión con
> la misma cuenta en otra pestaña, la sesión anterior queda **invalidada** (token_version).

### ▢ PASO 1b — Elegir contrato en el MODAL (3A)
- Navega a cualquier pantalla de contrato → `modal-elegir-contrato` → `modal-contrato-<id>` de
  **OBRA-2026-QA-CERO-26** (filtra con `modal-contrato-buscar`).
> 🟢 chip `chip-contrato-activo` + banner `banner-contrato-activo` («Cambiar» = `btn-cambiar-contrato`).

### ▢ PASO 2 — Alta del contrato (HU-01) — `residente@`
- Sidebar CICLOS → «Alta de contratos» (`/contratos/alta`, ruta libre, sin modal). Teclea **TODO el §4**
  (pasos 0→6, `btn-siguiente`). PDF obligatorio (§4.7). **Guardar** (`btn-guardar`).
> 🟢 contrato creado; **redirige a abrir bitácora** (`/bitacora/apertura?contrato=ID`). 🔴 fecha de inicio pasada →
> rechazo (ver plan NEGATIVAS). *(Tras guardar, vuelve a una pantalla de contrato y elígelo en el modal — PASO 1b.)*

### ▢ PASO 3 — Garantías: póliza + endoso (HU-02) — `dependencia@`
- Sidebar CICLOS → «Fianzas / garantías» (`/contratos/fianzas`) → banner = OBRA-2026-QA-CERO-26.
- «+ Agregar nueva póliza» (`btn-agregar-poliza`) → modal `modal-agregar-poliza`:

| Campo (testid) | Valor |
|---|---|
| Tipo (`mp-tipo`) | **Cumplimiento** |
| Afianzadora (`mp-afianzadora`) | `Fianzas del Pacífico S.A.` |
| Folio (`mp-folio`) | `FC-2026-001` |
| Monto (`mp-monto`) | `100000` |
| Vencimiento (`mp-vencimiento`) | `2027-12-31` |
| Registrar | `mp-confirmar` |

- Endoso sobre una garantía: `btn-endoso-${g.id}` → modal `modal-endoso`: `endoso-motivo`=**Prórroga de vigencia**,
  `endoso-monto`=*(vacío)*, `endoso-vigencia`=`2028-06-01`, `endoso-obs`=`Endoso por prórroga (art. 91 RLOPSRM).` →
  `endoso-confirmar`.
> 🟢 póliza + endoso append-only (art. 91 RLOPSRM).

### ▢ PASO 4 — Bitácora WIZARD (HU-08/09) — `residente@`
- Sidebar CICLOS → «Bitácora» (`/bitacora/ambiente`). Stepper `wpaso-bit-apertura/firma/emitir`.
- **① Apertura:** `link-abrir` → `/bitacora/apertura`:

| Campo (testid) | Valor |
|---|---|
| Entrega del sitio (`input-fecha-apertura`) | **= fecha de inicio (HOY)** *(pre-llenado; verifica)* |
| Plazo de firma de notas (`input-plazo-firma`) | `2` |
| Domicilio dependencia (`md-domicilio-dependencia`) | `Av. Juárez 100, Chilpancingo, Gro.` |
| Teléfono dependencia (`md-telefono-dependencia`) | `7471234567` |
| Domicilio contratista (`md-domicilio-contratista`) | `Calle Reforma 25, Acapulco, Gro.` |
| Teléfono contratista (`md-telefono-contratista`) | `7449876543` |
| Alcance (`md-descripcion-trabajos`) | `Construcción de aula de 60 m²: cimentación, estructura y acabados.` |
| Características del sitio (`md-caracteristicas-sitio`) | `Terreno plano, 200 m², acceso vehicular, suelo arcilloso.` |
| Iniciar apertura | `btn-aperturar` |

> 🟢 nota **#1 de apertura** con **No. de bitácora + fecha/hora + presentante** (Delta) y firmantes por **nombre** (Delta 3).
- **② Por firmar:** `link-firmar` → `/bitacora/por-firmar`; en `fila-por-firmar[data-folio="OBRA-2026-QA-CERO-26"]`
  pulsa `btn-firmar` logueando con `residente@`, `contratista@`, `supervision@`. A la 3ª: `por-firmar-vacio`.
  *(Delta 8/scope: la cola se acota al contrato activo si llegas por la campana `?contrato=`.)*

### ▢ PASO 5 — Notas (HU-09) + Minutas (HU-11)
**HU-09 — Emisión** (`supervision@`) · `/bitacora/notas`:
| Campo (testid) | Valor |
|---|---|
| Tipo (`select-tipo`) | **Avance físico y financiero** |
| Tag (`input-tag`) | `avance` |
| Asunto (`input-asunto`) | `Verificación de avance` |
| Contenido (`input-contenido`) | `Se verifica avance de excavación conforme a programa.` |
| Emitir nota | `btn-emitir` |
> Firmar la nota (contraparte): `btn-firmar-nota-${n.numero}`. **Déjala FIRMADA** (para vincularla como soporte en PASO 8).

**HU-11 — Minutas/visitas** (`residente@`) · `/bitacora/minutas`:
| Tab Minutas (testid) | Valor |
|---|---|
| Fecha (`min-fecha`) | *(día reciente, ≤ hoy)* |
| Lugar (`min-lugar`) | `Sala de juntas — Residencia de obra, campus UAGRO` |
| Participantes (`min-participantes`) | `Arq. Carlos Contratista Demo, Ing. Sofía Supervisión Demo, Residente de obra` |
| Asunto (`min-asunto`) | `Reunión de avance — primer periodo` |
| Acuerdos (`min-acuerdos`) | `Iniciar trazo y limpieza; próxima reunión en P2.` |
| Registrar minuta | `btn-registrar-minuta` |

| Tab Agenda de visitas (testid) | Valor |
|---|---|
| Fecha (`vis-fecha`) | *(día próximo)* |
| Lugar (`vis-lugar`) | `Frente de obra norte — Av. Juárez s/n` |
| Responsable (`vis-responsable`) | `Ing. Sofía Supervisión Demo` |
| Propósito (`vis-proposito`) | `Verificación física del avance del primer periodo.` |
| Agendar visita | `btn-agendar-visita` |

### ▢ PASO 6 — Avance (HU-06) + nota automática + Curva (HU-05) — incluye Delta 4
- `contratista@` · «Avance y seguimiento» → `pestana-trabajos` → `/seguimiento/trabajos-terminados`.
- Registra DOS avances (`btn-registrar-avance`):

| Concepto (`cap-concepto`) | Periodo (`cap-periodo`) | Cantidad (`cap-cantidad`) | Foto (`cap-foto-evidencia`) | Obs. (`cap-observaciones`) |
|---|---|---|---|---|
| C-01 Limpieza y trazo | Periodo 1 | `1000` | **(OPCIONAL — Delta 4: puede ir vacía)** | `Avance físico P1 verificado` |
| C-02 Excavación | Periodo 1 | `250` | *(vacía)* | *(vacío)* |

> 🟢 cada avance **se registra aunque NO se adjunte foto** (Delta 4) y genera su nota de bitácora automática. Acumulado ≤ contratado (art. 118). Corregir = `btn-corregir-${a.id}` (append-only).
- **Curva (HU-05):** `residente@` · `pestana-curva` → `/seguimiento/curva-avance` (filtros `filtro-concepto`/`filtro-periodo`).

### ▢ PASO 7 — Alertas de atraso (HU-07) — `residente@`
- `pestana-alertas` → `/seguimiento/alertas`. `tabla-atrasos`; por concepto en atraso: `fila-atraso-${id}`,
  `btn-asentar-${contrato_concepto_id}` (sufijo = id numérico). Sin atrasos: `sin-atrasos`.
> 🟢 «Asentar en bitácora» → nota de atraso (art. 53). *(El contrato recién creado puede no tener atraso aún; el caso 🔴 idempotente está en NEGATIVAS.)*

---

> ⚠️ **A partir de aquí (PASO 8–15) ver la NOTA DE TIEMPO:** requieren el **primer periodo VENCIDO**. Valores
> documentados para ejecutarlos al vencer el periodo (o sobre un contrato cuyo periodo ya venció).

### ▢ PASO 8 — Estimación WIZARD 5 pasos (HU-12/13/15/16/14/17) — `contratista@`
- «Ciclo de estimación» (`/estimaciones/integracion`). Stepper `wpaso-periodo/generadores/caratula/soportes/integrar`.

**8a — Integrar #1 (HU-12):**
1. **① Periodo** (`wstep-periodo`): `periodo-selector` = **Periodo 1** (o `periodo-inicio`/`periodo-fin` del P1). → `btn-wsiguiente`.
2. **② Generadores** (`wpaso-generadores`): `gen-cantidad-${contrato_concepto_id}` → **C-01 = `1000`**, **C-02 = `250`** (C-03/C-04 vacíos). Verifica `gen-disponible-${id}`. → Siguiente.
3. **③ Carátula** (`wpaso-caratula`): `caratula-deductivas` = `0`. Verifica `caratula-numero-estimacion`=#1, **`caratula-neto-preview` = $69,500.00**, `tabla-saldos`. → Siguiente.
4. **④ Soportes y notas** (`wstep-soportes`): `btn-abrir-buscador-notas` → `modal-vincular-notas` (solo firmadas) → marca la nota del PASO 5 → `mb-btn-confirmar`. → Siguiente.
5. **⑤ Integrar** (`wpaso-integrar`): marca `check-cierre` → `btn-integrar`. 🟢 `banner-integrada`, neto **$69,500.00**, `link-presentar`.

**8a-bis — Documento de estimación (Delta 5):** abre el documento (`btn-imprimir-caratula` → `documento-caratula`).
> 🟢 **4 bloques**: 1 Carátula (3 secciones; **Sección 3 "Del neto a recibir" CON IVA 16%**, `caratula-doc-neto`) +
> 4 firmas; 2 Resumen de generadores (con clave); 3 Generador por concepto + reporte fotográfico; 4 Soportes (notas
> **agrupadas por generador** + selector `asignar-nota-${id}`). Secciones 1-2 sin IVA (art. 2 fr. XIX RLOPSRM).

**8b — Presentar (HU-13):** `contratista@` · `pestana-presentar` → `/estimaciones/envio` → fila #1 (integrada) →
`btn-presentar-${e.id}`. 🟢 estado **enviada** (arranca plazo 15 días, art. 54).

**8c — Supervisión turna (HU-15):** `supervision@` · `pestana-revision` → `/estimaciones/revision`;
`select-estimacion`=EST-001 (Enviada). (Opc. observación: `obs-caratula-nueva-texto`/`-tipo`/`-severidad` →
`btn-agregar-obs-caratula`; o `chk-sin-observaciones`) → `btn-turnar`. 🟢 `banner-turnada`.

**8d — Residencia AUTORIZA (HU-15):** `residente@` · misma pantalla → `btn-autorizar`. 🟢 `banner-autorizada` *(necesario para el pago)*.

**8e — #2 → rechazo → reingreso (HU-16):** integra **#2** (Periodo 2: C-02=`250`, C-03=`150`, C-04=`1000` → neto
**$330,125.00**), presenta, supervisión turna, `residente@` **RECHAZA** (`motivo-rechazo` + `btn-rechazar`).
Reingreso: `contratista@` · `pestana-reingreso` → `select-estimacion`=#2 Rechazada, `textarea-nota` + `chk-confirmado`
→ `btn-reingresar`. 🟢 nueva versión #3 (copia carátula, neto $330,125.00, `reemplaza_a`=#2).

**8f — Historial (HU-14) con export con formato (Delta 7):** `residente@` · `pestana-historial` →
`/estimaciones/historial`. Filtros `he-periodo`/`he-estado`. **`btn-exportar-historial`** → 🟢 `.xlsx` **con
formato** (banda guinda, meta, moneda, fila TOTALES; rechazadas no suman).

**8g — Tablero (HU-17):** `pestana-tablero` o VISTAS → Tablero (`/estimaciones/tablero`). `tarjeta-est-OBRA-2026-QA-CERO-26-1`=$69,500.00; KPIs `kpi-*`.

### ▢ PASO 9 — Pago WIZARD 4 pasos (HU-20 + HU-21) — `finanzas@`
- «Pago y tránsito» (`/pagos/transito`); `select-estimacion`=#1 **Autorizada**. Stepper `wpaso-pago-suficiencia/soportes/instruccion/registro`.
1. **① Suficiencia:** `input-partida`=`62201` (OBLIGATORIA, art. 24), `input-techo`=`5000000` → `btn-cargar-techo`. 🟢 `badge-suficiente`.
2. **② Soportes:** `input-factura`=`F-2026-001` → `btn-cargar-factura`; `input-cfdi`=`A1B2C3D4-1111-2222-3333-444455556666` → `btn-cargar-cfdi`.
3. **③ Instrucción:** `btn-generar-instruccion`. 🟢 `aviso-instruccion-generada`.
4. **④ Registrar pago (HU-21):**

| Campo (testid) | Valor |
|---|---|
| Estimación a pagar (`pago-estimacion`) | **#1 · autorizada · $69,500.00** *(solo 'autorizada')* |
| Importe (`pago-importe-neto`) | **$69,500.00** *(read-only)* |
| Fecha de pago (`pago-fecha`) | *(hoy)* |
| Referencia SPEI (`pago-referencia`) | `SPEI-2026-000123` |
| Folio fiscal CFDI (`pago-cfdi`) | `A1B2C3D4-1111-2222-3333-444455556666` |
| Fecha de la factura (`pago-fecha-factura`) | *(hoy)* |
| Pop-up «¿CFDI y factura coinciden?» | `pago-confirmar-si` |
| Registrar pago | `btn-registrar-pago` |

> 🟢 `aviso-pago-registrado` $69,500.00; #1 pasa a **pagada**. Solo `finanzas@` (con otro rol: `pago-solo-finanzas`, disabled). Exige CFDI del contratista (409 si falta).

### ▢ PASO 10 — Convenio (HU-03) + autorización — `dependencia@`
- «Convenios» (`/contratos/modificatorios`). Tipo PLAZO:

| Campo (testid) | Valor |
|---|---|
| Tipo (`cm-tipo`) | **Plazo** |
| Plazo nuevo en días (`cm-plazo-nuevo`) | `100` *(de 90, +11.11% ≤25%)* |
| Motivo (`cm-motivo`) | `Ampliación por lluvias atípicas (dictamen técnico, art. 99 RLOPSRM).` |
| Folio (`cm-folio`) | *(vacío → CM-001)* |
| Registrar convenio | `btn-registrar-convenio` |

> 🟢 `CM-001` "Pendiente de autorización" + nota ligada. **Autorizar:** fila `fila-convenio-${c.id}` → `conv-autorizar-${id}` → 🟢 "Autorizado" (art. 59 p3). Si >25% → aviso SFP + requiere oficio `conv-oficio-subir-${id}` (PDF).

### ▢ PASO 11 — Portafolio (HU-18) + Tablero (HU-17)
- **Portafolio** (`dependencia@`) · `/portafolio` (multi-contrato, sin banner): `select-agrupar-por`; fila `fila-portafolio-OBRA-2026-QA-CERO-26`; semáforo `semaforo-dot-…`; contadores `contador-verde/amarillo/rojo`.

### ▢ PASO 12 — Roster / sustitución (HU-22) — `dependencia@` — incluye Delta 6
- «Roster / sustitución» (`/contratos/roster`). `roster-form-sustituir`:

| Campo (testid) | Valor |
|---|---|
| Rol a sustituir (`sust-rol`) | **superintendente** *(misma empresa)* |
| Nueva persona (`sust-nuevo`) | **Ing. Marco Superintendente 2** *(super2.demo@ — misma empresa; muestra nombre)* |
| Motivo (`sust-motivo`) | `Cambio de superintendente (art. 125 fr. I g RLOPSRM).` |
| Sustituir | `btn-sustituir` |

> 🟢 histórico + nota. **Delta 6 (🟢 contraste):** con `sust-rol`=**supervisión**, una persona de **OTRA empresa** SÍ se acepta (tercero independiente). 🔴 superintendente de otra empresa → 409 (ver NEGATIVAS).

### ▢ PASO 13 — Padrón de empresas (HU-23 admin) — `dependencia@`
- ADMINISTRACIÓN → «Padrón de empresas» (`/admin/empresas`). Tabs `tab-padron`/`tab-porvalidar`/`tab-dependencias`.
> 🟢 `panel-padron` (validar `validar-${id}`); `panel-porvalidar` (duplicados; `fusionar-${id}` solo si `posible_duplicado`); `panel-dependencias`. La fila de cada empresa muestra nº de personas y de contratos.

### ▢ PASO 14 — Expediente (HU-04) — `residente@`
- «Expediente» (`/contratos/expediente`). `input-busqueda` (vacío=todos). **Exportar:** `btn-exportar-pdf`.
> 🟢 **9 bloques** (`bloque-${id}`): configuración/catálogo/programa/fianzas/amortización (`plan-exp-total`=$300,000.00)/jurídicos/roster (con la sustitución)/convenios/estimaciones (`estimaciones-total-neto`=$399,625.00 = #1 + #3, excluye la #2 rechazada).

### ▢ PASO 15 — Finiquito (HU-24) — `residente@`/`dependencia@`
- «Cierre / finiquito» (`/contratos/finiquito`). `finiquito-desglose` (art. 64); `finiquito-ajustes`=`0`;
  `finiquito-observaciones`=`Finiquito conforme art. 64 LOPSRM y arts. 168-172 RLOPSRM.`; `finiquito-saldo`/`finiquito-afavor`.
- **Cerrar (doble paso):** `btn-abrir-cierre` → panel `finiquito-confirmar` → `btn-confirmar-cierre` → 🟢 `finiquito-cerrado`. Documento art. 170: `btn-ver-documento-finiquito` → `documento-finiquito`.
> ⚠ Para finiquitar, las estimaciones deben estar **pagadas** (no solo autorizadas). En el contrato desde-cero esto
> implica completar el ciclo de pago de los 3 periodos (cada uno tras vencer). 🔴 sin bitácora → `btn-abrir-cierre`
> disabled + `finiquito-sin-bitacora`.

### ▢ PASO 16 — Reportes (HU-19) — `residente@`
- VISTAS → «Reportes» (`/reportes`). `select-periodo-reporte`=**Acumulado**. 8 botones `btn-exportar-${id}-${formato}`
  (1-pdf/1-excel, 2-excel, 3-excel, 4-excel, 5-pdf [requiere bitácora], 6-excel, 7-excel).
> 🟢 generación 100% cliente (jsPDF/ExcelJS), sin 400/409; con formato.

---

## Resumen
- **~22 PASOS** (0, 0b, 1, 1b, 2–16) que **construyen TODO desde cero** sobre `OBRA-2026-QA-CERO-26`, con **valor
  exacto en cada campo**, incluidos los antes comprimidos: **jurídicos** (§4.4), **garantías** (§4.5), **plan de
  amortización** (§4.6), **PDF firmado** (§4.7).
- **Deltas #1/#2** integrados en su PASO (fecha no-pasado §4.1, empresa→persona §4.1, persona-no-correo, presentante
  PASO 4, foto opcional PASO 6, estimación 4 bloques + IVA Sección 3 + nota↔generador PASO 8a-bis, export con formato
  PASO 8f, supervisión otra empresa PASO 12, token_version PASO 1).
- **Testids resueltos** (antes `[verificar]` en el plan por-HU) leídos del archivo oro y de los componentes: padrón
  (`tab-*`/`validar-${id}`/`fusionar-${id}`), endoso (`btn-endoso-${id}`/`endoso-*`), notas (`select-tipo`/`btn-emitir`),
  minutas (`min-*`/`vis-*`), avance (`cap-*`/`btn-registrar-avance`), atrasos (`btn-asentar-${id}`), estimación
  (`wpaso-*`/`gen-cantidad-${id}`/`caratula-neto-preview`/`check-cierre`/`btn-integrar`), pago (`wpaso-pago-*`/
  `btn-registrar-pago`), convenio (`cm-*`/`conv-autorizar-${id}`), roster (`sust-*`/`btn-sustituir`), expediente
  (`btn-exportar-pdf`/`bloque-*`), finiquito (`finiquito-*`/`btn-confirmar-cierre`), reportes (`btn-exportar-${id}-${fmt}`),
  y los del delta (`select-empresa-contratista`, `caratula-doc-neto`, `asignar-nota-${id}`, `btn-exportar-historial`, `cap-foto-evidencia`).
- **[verificar] restantes:** el sufijo numérico dinámico `${id}`/`${numero}` (es el id del backend, no la clave — se
  lee en runtime) y el campo «Buscar por» del expediente (select sin testid). Todo lo demás quedó con testid concreto.
- **NOTA DE TIEMPO** (clave): por el Delta 1 (fecha no-pasado), los PASOS 8–15 exigen un periodo **vencido**; se
  documentan completos pero su ejecución "el mismo día" no es posible sobre un contrato dado de alta hoy (decisión
  surfaceada, no asumida).
