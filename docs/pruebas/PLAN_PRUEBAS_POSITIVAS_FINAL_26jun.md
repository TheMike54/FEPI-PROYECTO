# PLAN DE PRUEBAS POSITIVAS — SIGECOP · FLUJO FELIZ (FINAL 26-jun-2026)

> **Para imprimir y palomear casilla por casilla.** Mismo formato que el archivo oro
> `docs/pruebas/PLAN_PRUEBAS_FINAL_MATCH_18jun.md` (PASOS numerados · **Cuenta** · **Pantalla** (cómo llegar) ·
> **datos exactos** `testid → valor` · **🟢 Esperado** · **▢** casilla). Refleja el sistema **TRAS las sesiones
> autónomas #1 y #2** (ver §Deltas). **Una HU por PASO**, usando su contrato pre-llenado `PRUEBA-HU-XX`
> (`backend/scripts/seed_demo_24.sql`). 🟢 = el sistema debe **ACEPTAR**.

### §Deltas — cambios reflejados (sesiones #1/#2, 26-jun) — léelos antes
1. **Fecha de inicio del alta NO puede ser anterior a hoy** (front+back). Para el camino feliz usa **hoy o futuro**.
2. **Selector de EMPRESA contraparte debajo de "Dependencia"** (`select-empresa-contratista`); al elegirla, el
   selector de persona (`select-superintendente`) se **filtra** a esa empresa.
3. **Se muestra la PERSONA, no la cuenta/correo** en alta, firmas de apertura y sustitución de roster.
4. **Foto de avance OPCIONAL** (ya no bloquea registrar el avance) — art. 132 fr. IV RLOPSRM (discrecional).
5. **Documento de estimación = 4 bloques**; Sección 3 "Del neto a recibir" **con IVA (16%)**; **notas de
   bitácora asignables por generador** (selector en el bloque 4).
6. **Supervisión puede ser de OTRA empresa** (tercero independiente) al sustituir.
7. **Exportar historial (HU-14)** sale **con formato** (plantilla con banda/meta/moneda/TOTALES).
8. **Sesión única** (`token_version`): un login nuevo cierra la sesión anterior.

### Cómo leer cada paso
**Cuenta** · **Pantalla** (sidebar plano / pestaña del ciclo; al entrar a una pantalla de contrato sale el modal
`modal-elegir-contrato` → elige el `PRUEBA-HU-XX` indicado → se hereda) · **datos** (`testid → valor`) · **🟢
Esperado** · **▢**. Login: `#login-usuario`, `#login-password`, botón «Iniciar sesión» (sin testid; el rol se deduce).

## Cuentas demo (contraseña común `Sigecop2026!`)
| Cuenta | Rol | Papel |
|---|---|---|
| `residente@sigecop.test` | residente | Alta, abre/firma bitácora, autoriza/rechaza estimación, finiquito |
| `contratista@sigecop.test` | contratista (**superintendente**) | Integra/presenta estimación, registra avance |
| `supervision@sigecop.test` | supervisión | Observa, firma, turna la estimación |
| `dependencia@sigecop.test` | dependencia | Convenios, padrón, roster, finiquito |
| `finanzas@sigecop.test` | finanzas | Tránsito a pago + registra el pago |

## Contratos de prueba (seed_demo_24, base idéntica: monto **$1,000,000**, anticipo 30% = $300,000, 3 conceptos)
> CONC-01 Terracerías m³ 1000×$300 = **$300,000** (P1 mar) · CONC-02 Cimentación m³ 200×$1,500 = **$300,000**
> (P2 abr) · CONC-03 Estructura y obra negra lote 1×$400,000 = **$400,000** (P3 may). Cada concepto 100% en su
> periodo. **Cuadre de estimación** (sin IVA): C1/P1 y C2/P2 → subtotal 300,000 − amort 90,000 − 5 al millar 1,500
> = **neto 208,500.00**; C3/P3 → subtotal 400,000 − amort 120,000 − 2,000 = **neto 278,000.00**.
> **Re-sembrar antes de demostrar** (`seed_demo_24.sql`): la estimación es append-only y "agota" el periodo.

---

## CICLO 1 · Acceso y padrón

### ▢ PASO 1 — POS-HU23-01 · Padrón de empresas (HU-23)
- **Cuenta:** `dependencia@` · **Pantalla:** Administración → «Padrón de empresas» (`/admin/empresas`, ruta libre).

| Acción (testid) | Valor |
|---|---|
| Ver el padrón (`tabla-padron` / lista de empresas) | — |
| Expandir una empresa (p. ej. **Constructora Demo**) | (clic) |

> 🟢 **Esperado:** lista de empresas con su **tipo/estado** y, por empresa, **nº de personas** y **nº de contratos**
> (responde "¿cuántos contratos tiene esta empresa?"). Las pendientes muestran `posible_duplicado` si aplica
> (forma fuerte). Fundamento: padrón art. 43 RLOPSRM. *(testids exactos de la tabla: [verificar])*

---

## CICLO 2 · Alta y fianzas

### ▢ PASO 2 — POS-HU01-01 · Alta de contrato de obra (HU-01) — incluye Deltas 1, 2, 3
- **Cuenta:** `residente@` · **Pantalla:** CICLOS → «Alta de contratos» (`/contratos/alta`, ruta libre, sin modal).

**Paso 0 · Datos generales**
| Campo (testid) | Valor |
|---|---|
| Folio (`dg-folio`) | `OBRA-2026-QA-POS-26` |
| Objeto (`dg-objeto`) | `Construcción de aula — UAGRO (QA positivo 26-jun)` |
| Ubicación (`dg-ubicacion`) | `Av. Juárez s/n, Chilpancingo, Gro.` |
| Dependencia (`dg-dependencia`) | **Lic. Diana Dependencia Demo** *(muestra nombre, NO correo — Delta 3)* |
| **Empresa contraparte (`select-empresa-contratista`)** | **Constructora Demo** *(Delta 2; va debajo de Dependencia)* |
| Plazo en días (`dg-plazo`) | `90` |
| Fecha de inicio (`dg-fecha`) | **HOY o futuro** (p. ej. la fecha de hoy) *(Delta 1: no-pasado)* |
| % pena por atraso (`dg-pena`) | *(vacío)* |
| Superintendente (`select-superintendente`) | **Arq. Carlos Contratista Demo** *(filtrado a la empresa elegida; muestra nombre)* |
| Supervisión (`select-supervision`) | **Ing. Sofía Supervisión Demo** |

> Derivados (no se teclean): `monto-derivado`, `termino-derivado`, `empresa-contratista`, `equipo-residente`. **Siguiente →** (`btn-siguiente`).

**Paso 1 · Catálogo** (`concepto-clave-${i}` / `-concepto-` / `-unidad-` / `-cantidad-` / `-pu-`)
| i | Clave | Concepto | Unidad | Cant. | P.U. |
|---|---|---|---|---|---|
| 0 | `C-01` | Limpieza y trazo | `m2` | `1000` | `50.00` |
| 1 | `C-02` | Excavación | `m3` | `500` | `200.00` |
| 2 | `C-03` | Concreto f'c=200 | `m3` | `300` | `2500.00` |
| 3 | `C-04` | Acero fy=4200 | `kg` | `2000` | `50.00` |

> 🟢 `monto-derivado` = **$1,000,000.00**; `catalogo-indicador` verde. **Siguiente →**.

**Paso 2 · Programa** (`select-ciclo` = `mensual` → 3 periodos; celdas `celda-${i}-${p}`): cuadrar Σ por concepto = contratado → `programa-cuadra` verde.
**Paso 3 · Jurídicos** (`jur-firmante`, `jur-cargo`, `jur-representante`, `jur-cedula`). **Paso 4 · Garantías** (cumplimiento + anticipo, vigencia futura, monto ≤ contrato). **Paso 5 · Plan amortización** (Σ = $300,000). **Paso 6 · PDF firmado** (subir PDF) + **Confirmar alta** (`btn-confirmar-alta`).

> 🟢 **Esperado:** contrato creado; **redirige a abrir la bitácora** (`/bitacora/apertura?contrato=ID`); monto derivado al centavo (art. 45 fr. IX RLOPSRM); fecha inicio ≥ hoy aceptada.

### ▢ PASO 3 — POS-HU02-01 · Fianzas y garantías (HU-02)
- **Cuenta:** `dependencia@` (o residente que creó) · **Pantalla:** «Fianzas / garantías» (`/contratos/fianzas`) → modal → **PRUEBA-HU-02**.

| Acción (testid) | Valor |
|---|---|
| Ver pólizas (cumplimiento/anticipo/vicios) | — |
| Registrar **endoso** en la fianza de cumplimiento (`btn-endoso` / modal) | nuevo monto/vigencia ≥ actual |

> 🟢 **Esperado:** PRUEBA-HU-02 ya trae la fianza de cumplimiento con un endoso; el endoso queda append-only
> (art. 91 RLOPSRM). Vigencia ≥ hoy y monto ≤ monto del contrato. *(testids del modal de endoso: [verificar])*

---

## CICLO 3 · Bitácora

### ▢ PASO 4 — POS-HU08-01 · Apertura de la bitácora (HU-08) — incluye Delta 3
- **Cuenta:** `residente@` · **Pantalla:** «Bitácora» → modal → **PRUEBA-HU-08** (base SIN bitácora) → «Abrir bitácora» (`/bitacora/apertura`).

| Acción (testid) | Valor |
|---|---|
| Revisar el acta (datos del alta) | — |
| Abrir/registrar la apertura (`btn-abrir-bitacora`) | (clic) |
| Firmar (las 3 partes, en «Por firmar») | residente/contratista/supervisión |

> 🟢 **Esperado:** se crea la bitácora con la **nota #1 de apertura** que incluye **No. de bitácora + fecha/hora +
> identificación del presentante** (Delta) y muestra el **nombre** de cada firmante (no el correo, Delta 3). Apertura
> antes de la fecha de inicio (art. 52 Ter LOPSRM); datos mínimos art. 123 fr. III RLOPSRM. *(testid del botón: [verificar])*

### ▢ PASO 5 — POS-HU09-01 · Emisión y firma de notas (HU-09)
- **Cuenta:** `residente@` · **Pantalla:** «Bitácora» → **PRUEBA-HU-09** (bitácora abierta) → Emitir nota (`EmisionNotas`).

| Campo (testid) | Valor |
|---|---|
| Tipo de nota (`nota-tipo`) | una de catálogo (p. ej. *instrucción*) |
| Asunto (`nota-asunto`) | `Instrucción de obra QA` |
| Contenido (`nota-contenido`) | `Se instruye reanudar el frente norte.` |
| Emitir (`btn-emitir-nota`) | (clic) |

> 🟢 **Esperado:** nota creada (emisor = del JWT, una por rol; art. 125 RLOPSRM); aceptación tácita al vencer el
> plazo de firma (art. 123 fr. III). La contraparte firma desde su cuenta. *(testids exactos: [verificar])*

### ▢ PASO 6 — POS-HU10-01 · Consulta y búsqueda de notas (HU-10)
- **Cuenta:** `residente@` · **Pantalla:** «Bitácora» → pestaña Consulta (`/bitacora/consulta`) → **PRUEBA-HU-10**.

| Acción (testid) | Valor |
|---|---|
| Buscar por tipo/fecha (`consulta-filtro-*`) | tipo = avance |
| Abrir una nota firmada → ver documento imprimible | (clic) |

> 🟢 **Esperado:** PRUEBA-HU-10 trae una nota de avance firmada además de la apertura; el buscador filtra; el
> documento de la nota se abre imprimible. *(testids del filtro: [verificar])*

### ▢ PASO 7 — POS-HU11-01 · Minutas, visitas y acuerdos (HU-11)
- **Cuenta:** `residente@` · **Pantalla:** «Bitácora» → pestaña Minutas (`/bitacora/minutas`) → **PRUEBA-HU-11**.

| Acción (testid) | Valor |
|---|---|
| Ver la minuta y la visita pre-cargadas | — |
| Agendar una visita nueva (`btn-agendar-visita` / fecha) | fecha futura |

> 🟢 **Esperado:** PRUEBA-HU-11 trae 1 minuta + 1 visita; una minuta de junta puede derivar una nota (art. 123 fr. X
> RLOPSRM). *(testids: [verificar])*

---

## CICLO 4 · Avance y seguimiento

### ▢ PASO 8 — POS-HU06-01 · Registro de trabajos terminados (HU-06) — incluye Delta 4
- **Cuenta:** `contratista@` · **Pantalla:** «Avance y seguimiento» → **PRUEBA-HU-06** (avance parcial P1) → `TrabajosTerminados`.

| Campo (testid) | Valor |
|---|---|
| Concepto (`select-concepto`) | **C-01 Terracerías** |
| Periodo (`select-periodo`) | **1** |
| Cantidad (`cantidad`) | `400` *(completa 600+400=1000)* |
| Foto de evidencia (`cap-foto-evidencia`) | *(OPCIONAL — Delta 4: puede quedar vacía)* |
| Registrar (`btn-registrar-avance` / puedeGuardar) | (clic) |

> 🟢 **Esperado:** el avance se registra **aunque NO se adjunte foto** (Delta 4). Acumulado ≤ contratado (art. 118
> RLOPSRM). *(testid exacto del botón: [verificar])*

### ▢ PASO 9 — POS-HU07-01 · Alertas de atraso por concepto (HU-07)
- **Cuenta:** `residente@` · **Pantalla:** «Avance» → pestaña Alertas (`/seguimiento/alertas`) → **PRUEBA-HU-07** (avance bajo 100/1000).

> 🟢 **Esperado:** PRUEBA-HU-07 muestra **atraso por concepto** (programado 1000 vs ejecutado 100 = déficit 900 en
> CONC-01); la alerta deriva del programa vs avance (no de una fecha falseada). *(testids del listado: [verificar])*

### ▢ PASO 10 — POS-HU05-01 · Programa y curva de avance (HU-05)
- **Cuenta:** `residente@` · **Pantalla:** «Avance» → pestaña Curva (`/seguimiento/curva-avance`) → **PRUEBA-HU-05** (al corriente, 100%).

> 🟢 **Esperado:** curva S con programado vs ejecutado; PRUEBA-HU-05 al corriente (3 conceptos 100%). Si el contrato
> tuviera convenio (≥2 versiones) se verían 2 tarjetas (histórico congelado + vigente). *(testids: [verificar])*

---

## CICLO 5 · Estimación

### ▢ PASO 11 — POS-HU12-01 · Integración de la estimación (HU-12) ⭐ — incluye Delta 5
- **Cuenta:** `contratista@` · **Pantalla:** «Ciclo de estimación» (`/estimaciones/integracion`) → modal → **PRUEBA-HU-12**.

| Wizard (paso → testid) | Valor |
|---|---|
| Paso Periodo (`periodo-inicio`/`periodo-fin` o selector) | **Periodo 1** (01–31 mar 2026, único vencido) |
| Paso Generadores — CONC-01 (`gen-cantidad-${ccid}`) | `1000` *(jala el avance del periodo)* |
| Paso Carátula (lectura) | subtotal **300,000** · amort **90,000** · 5 al millar **1,500** · **neto 208,500.00** |
| Paso Soportes y notas | vincular nota(s) firmadas; **asignar nota a generador** (Delta 5) opcional |
| Paso Integrar (`chk-cierre` + `btn-integrar`) | (clic) |

> 🟢 **Esperado:** la estimación **#1 se integra** (PRUEBA-HU-12 quedó listo: CONC-01 disponible=1000, avance=1000,
> ya_estimado=0). Carátula server-side, cuadre al centavo, SIN IVA en secciones 1-2; **neto 208,500.00**. Periodo
> vencido (art. 54 LOPSRM); acumulado ≤ contratado (art. 118 RLOPSRM). *(testids exactos del wizard: [verificar])*

### ▢ PASO 12 — POS-HU12-02 · Documento de estimación = 4 bloques con IVA en Sección 3 (HU-12) — Delta 5
- **Cuenta:** `contratista@` · **Pantalla:** detalle de la estimación integrada → «Carátula / documento» (`btn-imprimir-caratula`).

> 🟢 **Esperado:** documento `documento-caratula` con **4 bloques**: 1 Carátula (3 secciones; **Sección 3 "Del neto a
> recibir" con IVA 16%** → total con IVA) + 4 firmas (presenta/revisó/autorizó/Vo.Bo., con nombre); 2 Resumen de
> generadores (con clave); 3 Generador por concepto + reporte fotográfico; 4 Soportes (notas **agrupadas por
> generador** + selector `asignar-nota-${id}`). Secciones 1-2 sin IVA (art. 2 fr. XIX RLOPSRM); IVA en Sección 3.

### ▢ PASO 13 — POS-HU13-01 · Presentación de la estimación (HU-13)
- **Cuenta:** `contratista@` · **Pantalla:** «Estimación» → pestaña Presentar (`/estimaciones/envio`) → **PRUEBA-HU-13** (estimación #1 integrada).

| Acción (testid) | Valor |
|---|---|
| Presentar (`btn-presentar-${e.id}`) | (clic) |

> 🟢 **Esperado:** la estimación pasa a **'enviada'** (sello `enviada_en` arranca el plazo de revisión, art. 54
> LOPSRM, 15 días). El contratista presenta a la residencia.

### ▢ PASO 14 — POS-HU15-01 · Revisión y autorización (HU-15)
- **Cuenta:** `supervision@` (observa/turna) y `residente@` (autoriza) · **Pantalla:** «Estimación» → pestaña Revisión (`/estimaciones/revision`) → **PRUEBA-HU-15** (estimación #1 enviada).

| Acción (testid) | Valor |
|---|---|
| Supervisión: observar/turnar (`select-estimacion` + `btn-turnar`) | (clic) |
| Residencia: **autorizar** (`btn-autorizar-${e.id}`) | (clic) |

> 🟢 **Esperado:** la estimación pasa a **'autorizada'** (la residencia autoriza; art. 54 LOPSRM). La supervisión
> observa/turna pero no autoriza. *(testids exactos: [verificar])*

### ▢ PASO 15 — POS-HU14-01 · Historial de estimaciones + export con formato (HU-14) — Delta 7
- **Cuenta:** `residente@` · **Pantalla:** «Estimación» → pestaña Historial (`/estimaciones/historial`) → **PRUEBA-HU-14** (pagada/autorizada/enviada).

| Acción (testid) | Valor |
|---|---|
| Ver el historial (filtros periodo/estado) | — |
| **Exportar historial** (`btn-exportar-historial`) | (clic) |

> 🟢 **Esperado:** tabla con las 3 estimaciones en sus estados; el `.xlsx` exportado sale **con formato** (banda
> guinda, meta del contrato, **moneda**, fila **TOTALES**; las rechazadas no suman) — Delta 7.

### ▢ PASO 16 — POS-HU17-01 · Tablero de estimaciones (HU-17)
- **Cuenta:** `residente@` · **Pantalla:** «Tablero» (`/estimaciones/tablero`, multi-contrato) → **PRUEBA-HU-17**.

> 🟢 **Esperado:** KPIs agregados + contadores por estado + grid de tarjetas. No usa contrato activo (vista
> ejecutiva). *(testids: [verificar])*

---

## CICLO 6 · Pago

### ▢ PASO 17 — POS-HU20-01 · Tránsito a pago (HU-20)
- **Cuenta:** `contratista@` (sube CFDI) → `finanzas@` (revisa) · **Pantalla:** «Pago y tránsito» (`/pagos/transito`) → **PRUEBA-HU-20** (estimación autorizada).

| Acción (testid) | Valor |
|---|---|
| Elegir estimación (`select-estimacion`) | la **autorizada** |
| Contratista: subir **CFDI** + factura (`cobro-cfdi` / archivos) | PDF |
| Promover a cola de finanzas (`btn-promover`) | (clic) |

> 🟢 **Esperado:** el contratista sube el CFDI/factura; queda en la cola global de finanzas (suficiencia art. 24).
> *(testids exactos: [verificar])*

### ▢ PASO 18 — POS-HU21-01 · Registro del pago (HU-21)
- **Cuenta:** `finanzas@` · **Pantalla:** «Pago» → pestaña Registro/Tránsito → **PRUEBA-HU-21** (estimación autorizada) → `RegistroPagoForm`.

| Campo (testid) | Valor |
|---|---|
| Estimación a pagar (`pago-estimacion`) | la **autorizada** *(PAGABLES = solo 'autorizada')* |
| Fecha de pago (`pago-fecha`) | hoy |
| Referencia SPEI (`pago-referencia`) | `SPEI0123456789` (numérica) |
| Importe neto (`pago-importe-neto`) | **derivado** (read-only, p. ej. 208,500.00) |
| Pop-up «¿CFDI y factura coinciden?» (`pago-confirmar-si`) | (clic) |

> 🟢 **Esperado:** el pago se registra (solo finanzas; estimación 'autorizada'; exige CFDI del contratista, 409 si
> falta — aquí está). La pestaña «registro» queda como historial. art. 54 LOPSRM.

---

## CICLO 7 · Convenios, expediente, portafolio, reportes, finiquito

### ▢ PASO 19 — POS-HU03-01 · Convenio modificatorio (HU-03)
- **Cuenta:** `dependencia@` · **Pantalla:** «Convenios» (`/contratos/modificatorios`) → **PRUEBA-HU-03** (bitácora abierta).

| Campo (testid) | Valor |
|---|---|
| Tipo de convenio (`conv-tipo`) | **plazo** |
| Oficio/justificación (`conv-oficio`) | `Ampliación de plazo por lluvias` |
| Registrar (`btn-registrar-convenio`) | (clic) |
| Autorizar (`conv-autorizar-${id}`) | (clic, rol dependencia) |

> 🟢 **Esperado:** convenio de plazo registrado + **autorizado** (acto separado, art. 59 LOPSRM); genera nota de
> bitácora; versiona el programa (curva de 2 series). PRUEBA-HU-03 ya trae uno de muestra. *(testids: [verificar])*

### ▢ PASO 20 — POS-HU04-01 · Expediente integral (HU-04)
- **Cuenta:** `residente@` · **Pantalla:** «Expediente» (`/contratos/expediente`) → **PRUEBA-HU-04** (estimación pagada).

> 🟢 **Esperado:** expediente consolidado (contrato, fianzas, bitácora, avance, estimaciones, pago) con buscador por
> tipo/periodo. *(testids: [verificar])*

### ▢ PASO 21 — POS-HU18-01 · Portafolio ejecutivo (HU-18)
- **Cuenta:** `dependencia@` · **Pantalla:** «Portafolio» (`/portafolio`, multi-contrato).

> 🟢 **Esperado:** semáforos por contrato (PRUEBA-HU-18 al corriente = verde). Vista ejecutiva, ignora contrato
> activo. *(testids `fila-portafolio-${folio}`)*

### ▢ PASO 22 — POS-HU19-01 · Exportación de reportes (HU-19)
- **Cuenta:** `residente@` · **Pantalla:** «Reportes» (`/reportes`) → **PRUEBA-HU-19** (estimación pagada).

> 🟢 **Esperado:** los 7 reportes se exportan (jsPDF/ExcelJS, 100% navegador, sin 400/409), con formato (banda/meta/
> moneda/TOTALES). *(testids de cada reporte: [verificar])*

### ▢ PASO 23 — POS-HU22-01 · Sustitución de personas del roster (HU-22) — Delta 6
- **Cuenta:** `dependencia@`/`residente@` · **Pantalla:** «Roster / sustitución» (`/contratos/roster`) → **PRUEBA-HU-22**.

| Campo (testid) | Valor |
|---|---|
| Rol a sustituir (`sust-rol`) | **superintendente** *(misma empresa)* / **supervisión** *(puede ser otra empresa — Delta 6)* |
| Nueva persona (`sust-nuevo`) | de la lista **por nombre** (no correo, Delta 3) |
| Confirmar (`btn-sustituir`) | (clic) |

> 🟢 **Esperado:** sustituye a la PERSONA (no la empresa), append-only en `contrato_roster` (art. 125 RLOPSRM); para
> **supervisión** acepta otra empresa; la persona saliente no firma fuera de su vigencia. Bloquea si hay firmas
> pendientes. *(testids exactos: [verificar])*

### ▢ PASO 24 — POS-HU24-01 · Finiquito y cierre (HU-24)
- **Cuenta:** `dependencia@`/`residente@` · **Pantalla:** «Cierre / finiquito» (`/contratos/finiquito`) → **PRUEBA-HU-24** (3 estimaciones pagadas).

| Acción (testid) | Valor |
|---|---|
| Revisar saldos (derivados) | saldo 0 (todo pagado) |
| Registrar finiquito (`btn-finiquito` / `chk-cierre`) | (clic) |

> 🟢 **Esperado:** se registra el finiquito y el contrato pasa a **cerrado** (art. 64 LOPSRM / 168-172 RLOPSRM);
> a partir de ahí el contrato es solo-lectura (append-only). PRUEBA-HU-24 tiene todo el ciclo pagado. *(testids: [verificar])*

---

## Resumen
- **24 PASOS positivos**, uno por HU (orden de ciclo), usando los contratos `PRUEBA-HU-XX` pre-llenados.
- Casos que ejercen los **deltas**: PASO 2 (fecha no-pasado + empresa→persona + persona-no-correo), PASO 4 (presentante en apertura), PASO 8 (foto opcional), PASO 11-12 (estimación integra + 4 bloques + IVA Sección 3 + nota↔generador), PASO 15 (export con formato), PASO 23 (supervisión otra empresa).
- **[verificar]:** testids exactos de varias pantallas no listados en el catálogo base (padrón, endoso, emisión/consulta de notas, minutas, avance botón, alertas, tablero, tránsito/pago, convenio, expediente, reportes, roster, finiquito) — confirmar contra el código al ejecutar.
