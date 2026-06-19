# PLAN DE PRUEBAS MANUAL E2E — SIGECOP (con VALORES EXACTOS)

> **Para imprimir y palomear.** Recorre **UN solo contrato** (`OBRA-2026-PRUEBA-01`) de punta a punta en el
> orden real del ciclo. Todos los números están **pre-calculados para que cuadren a la primera** y fueron
> **verificados contra el código real** (controllers + `schema.sql`), no inventados.
>
> - Cuadre catálogo = monto: `monto = Σ ROUND(cantidad×PU, 2)` server-side (art. 45 fr. IX RLOPSRM).
> - Programa de obra: `Σ planeado = contratado` **por concepto** (100%), tolerancia 0.0005.
> - Plan de amortización: `Σ cuotas = ROUND(monto×anticipo%/100, 2)` **al centavo**.
> - Carátula de estimación: `neto = subtotal − amortización − retención(5 al millar) − deductivas − retención_atraso`, **SIN IVA**.
>
> **Fecha base de la sesión de prueba:** 2026-06-14 (hoy). El contrato arranca el **2026-01-01** a propósito
> (así sus 3 periodos ya iniciaron y el panel de atraso HU-07 mide contra el periodo vigente).

---

## 0. Cómo usar este plan

1. Levanta el stack local: `docker compose up -d --build` → frontend `:5173`, backend `:4000`, BD `:5432`.
2. Cada paso dice: **CUENTA** con la que entrar · **PANTALLA** (HU + ruta/sidebar) · **DATOS A TECLEAR** · **RESULTADO ESPERADO**.
3. Los `data-testid` entre paréntesis son los nombres reales de los campos/botones (útiles para no equivocarse).
4. Las pruebas marcadas con **⭐ NEGATIVA/LEGAL** disparan un bloqueo a propósito: son las que más valen la pena.
5. Si quieres empezar limpio: `docker compose down -v && docker compose up -d --build` (recrea schema + cuentas demo).

---

## 1. Cuentas demo (todas con contraseña `Sigecop2026!`)

> El login es **email + contraseña**; el rol **se deduce** de la cuenta (no se elige). Campos: `login-usuario`, `login-password`, botón **Iniciar sesión** (`login-submit`).

| Cuenta (email) | Nombre | Rol | Papel en el contrato de prueba |
|---|---|---|---|
| `residente@sigecop.test` | Ing. Iván Residente Demo | residente | **Da de alta el contrato**, residente, abre bitácora, autoriza estimación |
| `contratista@sigecop.test` | Arq. Carlos Contratista Demo | contratista | Superintendente: integra/presenta/reingresa estimación, registra avance |
| `supervision@sigecop.test` | Ing. Sofía Supervisión Demo | supervision | Observa y **turna** la estimación |
| `dependencia@sigecop.test` | Lic. Diana Dependencia Demo | dependencia | Parte contratante; crea convenios; aprueba registros |
| `finanzas@sigecop.test` | C.P. Fernando Finanzas Demo | finanzas | Registra el pago |
| `csilvasa@ipn.mx` | Profesor (Sistemas) | residente | Cuenta extra rol residente (útil para pruebas de acceso/sustitución) |

> **(La cuenta `finanzas@sigecop.test` se siembra solo en local; las otras 5 viven en local y Render.)**

---

## 2. Quién ejecuta cada HU (matriz REAL de `frontend/src/data/permisos.js`)

`E` = ejecuta (vista completa) · `C` = solo consulta · `—` = sin acceso (no aparece en el sidebar).

| HU | residente | contratista | supervisión | dependencia | finanzas |
|---|---|---|---|---|---|
| **HU-01 Alta de contrato** | **E** | C | C | C | — |
| HU-02 Fianzas | C | — | — | **E** | C |
| HU-03 Convenios | C | C | C | **E** | — |
| HU-04 Expediente | **E** | C | C | C | — |
| HU-05 Programa/curva | **E** | C | C | C | — |
| HU-06 Trabajos terminados | C | **E** | C | — | — |
| HU-07 Alertas de atraso | **E** | — | C | — | — |
| HU-08 Apertura bitácora | **E** | C | C | — | — |
| HU-09 Notas | **E** | **E** | **E** | — | — |
| HU-10 Consulta notas | **E** | C | C | — | — |
| HU-12 Integración estimación | C | **E** | C | — | — |
| HU-13 Presentar estimación | C | **E** | C | — | — |
| HU-14 Historial estimaciones | **E** | C | — | C | — |
| HU-15 Revisión/autorización | **E** | — | **E** | C | — |
| HU-16 Reingreso tras rechazo | C | **E** | — | — | — |
| HU-17 Tablero | **E** | C | C | C | — |
| HU-19 Reportes | **E** | C | C | C | C |
| HU-21 Registro de pago | C | — | — | C | **E** |

> ### ⚠️ Respuesta directa a tu duda: **¿quién da de alta el contrato (HU-01)?**
> **El RESIDENTE.** En `permisos.js` HU-01 es `residente:'E'` y los demás `C`/`—`; y `crearContrato`
> toma `residente_id = created_by = req.user.id` del JWT (el que está logueado). La **dependencia NO da de
> alta**: solo se **selecciona** como cuenta contratante dentro del alta (`dg-dependencia`). Entra con
> `residente@sigecop.test` para crear el contrato.
>
> **Acceso por participación:** los operativos (residente/contratista/supervisión) solo ven los contratos
> en los que son parte; **dependencia y finanzas ven todos** (`ROLES_VEN_TODO`).

---

## 3. DATASET CANÓNICO — contrato `OBRA-2026-PRUEBA-01`

> Este es el **set único y reutilizable**. Tecléalo tal cual. Todo cuadra: catálogo→monto, programa→100%, plan→anticipo.

### 3.1 Datos generales (HU-01, paso 0)

| Campo (testid) | Valor a teclear |
|---|---|
| Folio (`dg-folio`) | `OBRA-2026-PRUEBA-01` |
| Tipo (`dg-tipo`) | **Obra pública sobre la base de precios unitarios** |
| Objeto (`dg-objeto`) | `Construcción de aula didáctica — campus UAGRO (prueba E2E)` |
| Dependencia (`dg-dependencia`) | **Lic. Diana Dependencia Demo** |
| Plazo en días (`dg-plazo`) | `90` |
| Fecha de inicio (`dg-fecha`) | `2026-01-01` |
| % pena por atraso (`dg-pena`) | *(déjalo VACÍO)* → sin retención por atraso en el camino feliz |
| Superintendente (`select-superintendente`) | **Arq. Carlos Contratista Demo** |
| Supervisión (`select-supervision`) | **Ing. Sofía Supervisión Demo** |

> **Derivados (NO se teclean, los calcula el sistema):**
> Fecha de término = **2026-03-31** (inicio + plazo − 1) · **Monto = $1,000,000.00** (Σ del catálogo) ·
> *(El "Total con IVA 16% = $1,160,000.00" que muestra el alta es informativo; la carátula y el monto del contrato son **SIN IVA = $1,000,000.00**.)*

### 3.2 Catálogo de conceptos (HU-01, paso 1) → monto $1,000,000.00

| # | Clave | Concepto | Unidad | Cantidad | P.U. | Importe (derivado) |
|---|---|---|---|---|---|---|
| 1 | `C-01` | Limpieza y trazo del terreno | m² | `1000` | `50.00` | 50,000.00 |
| 2 | `C-02` | Excavación a máquina | m³ | `500` | `200.00` | 100,000.00 |
| 3 | `C-03` | Concreto f'c=200 kg/cm² | m³ | `300` | `2500.00` | 750,000.00 |
| 4 | `C-04` | Acero de refuerzo fy=4200 | kg | `2000` | `50.00` | 100,000.00 |
| | | | | | **Σ MONTO** | **$1,000,000.00** ✅ |

### 3.3 Programa de obra (HU-01, paso 2) — ciclo **Mensual** → 3 periodos. Σ por concepto = 100%

> Periodos generados: **P1** 01–31 ene · **P2** 01–28 feb · **P3** 01–31 mar 2026.

| Clave | P1 (ene) | P2 (feb) | P3 (mar) | Σ planeado | Contratado | Cuadra |
|---|---|---|---|---|---|---|
| C-01 | `1000` | `0` | `0` | 1000 | 1000 | ✅ |
| C-02 | `250` | `250` | `0` | 500 | 500 | ✅ |
| C-03 | `0` | `150` | `150` | 300 | 300 | ✅ |
| C-04 | `0` | `1000` | `1000` | 2000 | 2000 | ✅ |
| **$ del periodo** | **100,000** | **475,000** | **425,000** | | **Σ 1,000,000** | ✅ |

> Al cuadrar, el banner pasa a verde (`programa-cuadra`: "✓ El programa cuadra al 100%").

### 3.4 Datos jurídicos (HU-01, paso 3)

| Campo | Valor |
|---|---|
| Firmante de la dependencia (`jur-firmante`) | `Lic. Diana Dependencia Demo` |
| Cargo (`jur-cargo`) | `Directora de Obras Públicas` |
| Representante legal del contratista (`jur-representante`) | `Arq. Carlos Contratista Demo` |
| Cédula profesional resp. técnico (`jur-cedula`) | `12345678` |
| Poder notarial / Notaría | *(opcionales — déjalos vacíos)* |

### 3.5 Anticipo y garantías (HU-01, paso 4)

| Campo | Valor |
|---|---|
| % de anticipo (`anticipo-input`) | `30` |

> Con anticipo = **30%** (no >30%) **NO** se exige el PDF de autorización del titular. El importe del anticipo derivado = **$300,000.00**.

**Garantías** (la fianza de **Cumplimiento** es obligatoria; la de **Anticipo** lo es porque hay anticipo):

| Tipo (`garantia-tipo-i`) | Afianzadora | Póliza | Monto | Vigencia |
|---|---|---|---|---|
| **Anticipo** | `Fianzas del Pacífico S.A.` | `FA-2026-001` | `300000.00` *(derivado del 30%, read-only)* | `2026-12-31` |
| **Cumplimiento** | `Fianzas del Pacífico S.A.` | `FC-2026-001` | `100000.00` *(10% del contrato)* | `2026-12-31` |

> Ambas ≤ monto del contrato y con vigencia ≥ hoy → válidas. Indicador `garantias-ok` en verde.

### 3.6 Plan de amortización (HU-01, paso 5) — Σ = anticipo $300,000.00

| Periodo | Monto a amortizar (`plan-monto-N`) |
|---|---|
| P1 | `100000.00` |
| P2 | `100000.00` |
| P3 | `100000.00` |
| **Σ** | **$300,000.00** ✅ (= anticipo; banner `plan-cuadra`) |

> Atajo: el botón **"Restablecer proporcional"** (`plan-restablecer`) precarga exactamente estos 100k/100k/100k.

### 3.7 PDF firmado (HU-01, paso 6) — **obligatorio para guardar**

Sube **cualquier PDF real** (campo `pdf-firmado-input-precaptura`). Sin él, el botón Guardar no procede.
> Sirve cualquier `.pdf` de prueba; el backend solo valida que empiece con `%PDF`. **Sin este PDF NO se podrán integrar estimaciones después** (candado server-side de HU-12).

### 3.8 Estimación #1 — resultado financiero ESPERADO (memorízalo)

Periodo **P1 (2026-01-01 a 2026-01-31)**, generadores: **C-01 = 1000 m²**, **C-02 = 250 m³**.

| Renglón de la carátula | Cálculo | Valor |
|---|---|---|
| Subtotal | 1000×50 + 250×200 | **$100,000.00** |
| (−) Amortización de anticipo (30%) | 100,000 × 30% | −$30,000.00 |
| (−) Retención 5 al millar (0.5%, art. 191 LFD) | 100,000 × 0.005 | −$500.00 |
| (−) Deductivas (manual) | 0 | −$0.00 |
| (−) Retención por atraso | sin pena pactada | −$0.00 |
| **(=) NETO A PAGAR** | | **🎯 $69,500.00** |

**Saldos esperados de esa carátula:** estimado acumulado 100,000 (10%) · saldo por estimar 900,000 (90%) · amortizado acumulado 30,000 (10%) · saldo por amortizar 270,000 (90%).

---

## 4. RECORRIDO E2E — paso a paso (palomea cada uno)

### ▢ PASO 1 — Alta del contrato (HU-01)
- **Cuenta:** `residente@sigecop.test`
- **Pantalla:** HU-01 → *Alta de contrato* (`/contratos/alta`).
- **Datos:** teclea **todo el §3** (pasos 0→6 del wizard). Avanza con el gating: el wizard solo te deja al siguiente paso si el actual es válido.
- **Resultado:** contrato guardado; aparece en la pestaña **7. Registrados** con folio `OBRA-2026-PRUEBA-01`, monto `$1,000,000.00`, PDF ligado.

### ▢ PASO 2 — Apertura de bitácora (HU-08)
- **Cuenta:** `residente@sigecop.test`
- **Pantalla:** HU-08 → *Apertura de bitácora*. Selecciona el contrato (`select-contrato`).
- **Datos:**

  | Campo | Valor |
  |---|---|
  | Entrega del sitio (`input-fecha-apertura`) | `2026-01-01` |
  | Plazo de firma de notas (`input-plazo-firma`) | `2` |
  | Domicilio dependencia (`md-domicilio-dependencia`) | `Av. Juárez 100, Chilpancingo, Gro.` |
  | Teléfono dependencia (`md-telefono-dependencia`) | `7471234567` |
  | Domicilio contratista (`md-domicilio-contratista`) | `Calle Reforma 25, Acapulco, Gro.` |
  | Teléfono contratista (`md-telefono-contratista`) | `7449876543` |
  | Alcance/descripción (`md-descripcion-trabajos`) | `Construcción de aula de 60 m²: cimentación, estructura y acabados.` |
  | Características del sitio (`md-caracteristicas-sitio`) | `Terreno plano, 200 m², acceso vehicular, suelo arcilloso.` |
- **Acción:** botón **Iniciar apertura** (`btn-aperturar`).
- **Resultado:** se crea la bitácora con la **nota #1 de apertura** y una firma **pendiente** por cada parte.

### ▢ PASO 3 — Firma conjunta de la apertura (HU "Por firmar")
- Entra **uno por uno** y firma en *Por firmar* (botón **Firmar**):
  1. `residente@sigecop.test`
  2. `contratista@sigecop.test`
  3. `supervision@sigecop.test`
- **Resultado:** apertura **COMPLETA** (3/3). Hasta aquí **no se pueden emitir notas manuales** (candado server-side); ya firmada, sí.

### ▢ PASO 4 — Una nota de bitácora (HU-09)
- **Cuenta:** `supervision@sigecop.test`
- **Pantalla:** HU-09 → *Emisión de notas*. Selecciona el contrato.
- **Datos:** Tipo (`select-tipo`) = **Avance físico y financiero** · Tag (`input-tag`) = `avance` · Contenido (`input-contenido`) = `Se verifica avance de excavación conforme a programa.`
- **Acción:** **Emitir nota** (`btn-emitir`).
- **(Opcional)** Entra como `residente@` y **Firmar (aceptar)** esa nota (`btn-firmar-nota-2`) para ver el cambio a "Firmada".

### ▢ PASO 5 — Avance de trabajos (HU-06)
- **Cuenta:** `contratista@sigecop.test`
- **Pantalla:** HU-06 → *Trabajos terminados*. Selecciona el contrato.
- **Datos (registra DOS avances, botón `btn-registrar-avance` en cada uno):**

  | Concepto (`cap-concepto`) | Periodo (`cap-periodo`) | Cantidad (`cap-cantidad`) |
  |---|---|---|
  | C-01 Limpieza y trazo | Periodo 1 (ene) | `1000` |
  | C-02 Excavación a máquina | Periodo 1 (ene) | `250` |
- **Resultado:** cada registro genera **automáticamente** su nota de bitácora tipo `avance` (la bitácora ya está abierta). Tabla de avances actualizada; % de avance por concepto visible.

### ▢ PASO 6 — Panel de alertas de atraso (HU-07)
- **Cuenta:** `residente@sigecop.test`
- **Pantalla:** HU-07 → *Alertas de atraso*. Selecciona el contrato.
- **Qué verás:** medido al **periodo vigente (P3, marzo)**, lo programado acumulado es el 100%; como solo se ejecutó P1, aparecen en déficit:

  | Concepto | Déficit esperado |
  |---|---|
  | C-02 Excavación | 250 m³ |
  | C-03 Concreto | 300 m³ |
  | C-04 Acero | 2000 kg |
- **Acción:** en C-03 pulsa **Asentar en bitácora** (`btn-asentar-...`) → crea una nota de **atraso** firmada por el residente (art. 53).

### ▢ PASO 7 — Integrar estimación #1 (HU-12)
- **Cuenta:** `contratista@sigecop.test` (el superintendente)
- **Pantalla:** HU-12 → *Integración de estimación*. Selecciona el contrato y el **periodo P1 (2026-01-01 a 2026-01-31)**.
- **Datos (números generadores, columna "Este periodo"):**

  | Concepto | Cantidad (`gen-cantidad-...`) | Importe |
  |---|---|---|
  | C-01 | `1000` | 50,000.00 |
  | C-02 | `250` | 50,000.00 |
  | C-03 | *(0 / vacío)* | — |
  | C-04 | *(0 / vacío)* | — |

  Deductivas (`caratula-deductivas`) = `0`.
- **Verifica el preview de carátula:** Subtotal **100,000.00** · Amortización **30,000.00** · Retención **500.00** · **Neto preview 69,500.00**. Semáforo de plan en verde.
- **Acción:** **Integrar estimación** (`btn-integrar-estimacion`).
- **Resultado:** banner `banner-integrada` "✓ Estimación #1 integrada". El neto oficial del backend = **$69,500.00** 🎯.

### ▢ PASO 8 — Presentar la estimación (HU-13)
- **Cuenta:** `contratista@sigecop.test`
- **Pantalla:** HU-13 (presentar) sobre la estimación #1.
- **Acción:** **Presentar**. Estado interno `integrada` → `enviada` (etiqueta **"Presentada"**). Arranca el plazo del art. 54.

### ▢ PASO 9 — Revisión y autorización (HU-15)
- **9a — Supervisión observa y turna.** Cuenta: `supervision@sigecop.test` → HU-15.
  - (Opcional) Registra una observación: Sección **carátula**, Tipo **aclaración**, Descripción `Verificar números generadores del concepto C-02.`
  - **Acción:** **Turnar** a residencia (si no registraste observaciones, marca *sin observaciones*).
- **9b — Residencia autoriza.** Cuenta: `residente@sigecop.test` → HU-15.
  - **Acción:** **Autorizar**. Estado `enviada` → `autorizada` (**"Autorizada"**).

### ▢ PASO 10 — Registrar el pago (HU-21)
- **Cuenta:** `finanzas@sigecop.test`
- **Pantalla:** HU-21 → *Registro de pago*. Selecciona el contrato.
- **Datos:**

  | Campo | Valor |
  |---|---|
  | Estimación a pagar (`pago-estimacion`) | **Estimación #1 · autorizada · neto $69,500.00** |
  | Importe (`pago-importe-neto`) | **$69,500.00** *(read-only, automático = neto)* |
  | Fecha de pago (`pago-fecha`) | `2026-06-14` |
  | Referencia SPEI (`pago-referencia`) | `SPEI-2026-000123` |
  | Folio fiscal CFDI (`pago-cfdi`) | `A1B2C3D4-1111-2222-3333-444455556666` |
  | Fecha de la factura (`pago-fecha-factura`) | `2026-06-14` |
- **Acción:** **Registrar pago** (`btn-registrar-pago`).
- **Resultado:** aviso `aviso-pago-registrado` con importe **$69,500.00**; la estimación #1 pasa a **"pagada"**.

### ▢ PASO 11 — Reingreso tras rechazo (HU-16) — usa una estimación #2 que rechazamos
> Para demostrar el reingreso necesitamos una estimación **rechazada**. Hacemos la #2 (periodo P2) y la rechazamos.

- **11a — Integrar estimación #2.** Cuenta `contratista@` → HU-12, **periodo P2 (2026-02-01 a 2026-02-28)**:

  | Concepto | Cantidad | Importe |
  |---|---|---|
  | C-02 | `250` | 50,000.00 |
  | C-03 | `150` | 375,000.00 |
  | C-04 | `1000` | 50,000.00 |

  Carátula esperada: Subtotal **475,000.00** · Amort. 30% **142,500.00** · Ret. 0.5% **2,375.00** · **Neto $330,125.00**.
- **11b — Presentar** (HU-13, `contratista@`).
- **11c — Supervisión turna** (HU-15, `supervision@`).
- **11d — Residencia RECHAZA** (HU-15, `residente@`): motivo = `Faltan soportes del concepto C-03; recapturar generadores.` → estado **"Rechazada"**.
- **11e — Reingreso** (HU-16, `contratista@`): marca la **confirmación** de que atendiste las observaciones → **Reingresar**.
- **Resultado:** se crea la **estimación #3**, estado **"Integrada"**, **copia idéntica** de la carátula de la #2 (**neto $330,125.00**), ligada por `reemplaza_a`. El plazo del art. 54 **NO se reinicia**. *(Ver §6 brecha "reingreso copia carátula".)*

### ▢ PASO 12 — Convenio modificatorio (HU-03)
- **Cuenta:** `dependencia@sigecop.test` *(crear convenios = dependencia)*
- **Pantalla:** HU-03 → *Convenios modificatorios*. Selecciona el contrato.
- **Datos (convenio de PLAZO, dentro del 25%):**

  | Campo | Valor |
  |---|---|
  | Tipo (`cm-tipo`) | **Plazo** |
  | Plazo nuevo en días (`cm-plazo-nuevo`) | `100` *(de 90 → +11.11%, dentro del límite)* |
  | Motivo (`cm-motivo`) | `Ampliación por lluvias atípicas (dictamen técnico, art. 99 RLOPSRM).` |
  | Folio (`cm-folio`) | *(vacío → se genera `CM-001`)* |
- **Acción:** **Registrar convenio modificatorio** (`btn-registrar-convenio`).
- **Resultado:** convenio `CM-001` en el historial; nueva fecha de término; asienta nota automática en bitácora (avalada por el residente).
  > Un convenio de **monto/programa/mixto** exige recapturar el **catálogo completo + la matriz** nuevos (no se demuestra aquí para no descuadrar el dataset).

### ▢ PASO 13 — Sustitución de personas / roster (HU-22)
> **Pre-requisito:** se necesita una **segunda cuenta de contratista** para sustituir al superintendente.
> Regístrala primero: en *Crear cuenta* da de alta `contratista2@sigecop.test` (rol **Contratista**), luego entra como `dependencia@` y **aprueba** la cuenta en la pantalla de aprobación de usuarios.

- **Cuenta:** `dependencia@sigecop.test` *(o el residente del contrato)*
- **Pantalla:** *Roster del contrato* (HU-22). Selecciona el contrato (`roster-contrato`).
- **Datos:** Rol (`sust-rol`) = **superintendente** · Nueva persona (`sust-nuevo`) = **(la cuenta `contratista2`)** · Motivo (`sust-motivo`) = `Cambio de superintendente por reasignación de la empresa (art. 125 fr. I g RLOPSRM).`
- **Acción:** **Sustituir** (`btn-sustituir`).
- **Resultado:** la asignación anterior se **cierra** (no se borra), entra la nueva como activa, se sincroniza el caché del contrato y se asienta nota automática de sustitución en la bitácora.

### ▢ PASO 14 — Expediente (HU-04)
- **Cuenta:** `residente@sigecop.test`
- **Pantalla:** HU-04 → *Consulta de expediente*. Selecciona el contrato.
- **Verifica los bloques:** configuración, catálogo (4 conceptos, $1,000,000), programa de obra (matriz, periodo vigente resaltado), garantías (2), jurídicos, plan de amortización (Σ 300,000), **roster** (con la sustitución), **convenios** (`CM-001`).
- **Acción:** botón **⬇ PDF** (genera el expediente consolidado vía impresión).

### ▢ PASO 15 — Reportes (HU-19)
- **Cuenta:** `residente@sigecop.test` (o cualquiera con acceso C: contratista/supervisión/dependencia/finanzas).
- **Pantalla:** HU-19 → *Exportación de reportes*. Selecciona el contrato y el periodo (`select-periodo-reporte`).
- **Acción:** exporta los 7 reportes (PDF/Excel según el botón `btn-exportar-N-pdf|excel`): carátula, curva S, catálogo, programa, bitácora, convenios, roster.

### ▢ PASO 16 — Tablero (HU-17, opcional)
- **Cuenta:** `residente@`/`dependencia@` → HU-17 *Tablero de estimaciones*: verifica que el contrato y sus estimaciones (pagada / rechazada / integrada) aparezcan con sus estados.

---

## 5. ⭐ PRUEBAS NEGATIVAS / LEGALES (qué teclear para DISPARAR el bloqueo)

> Estas son las de oro. Cada fila es un intento que **DEBE fallar** con el mensaje indicado.

| # | Prueba | Dónde / quién | Qué teclear (cambio sobre el dataset) | Bloqueo esperado | Fundamento |
|---|---|---|---|---|---|
| N1 ⭐ | **Programa no cuadra al 100% (faltante)** | HU-01 paso 2, residente | C-01 en P1 = `900` (en vez de 1000) | Banner rojo `programa-descuadre`; al guardar **400** "debe distribuir el 100% de cada concepto… faltan 100.000" | RLOPSRM 45-A-X + LOPSRM 52 |
| N2 ⭐ | **Programa excede (sobra)** | HU-01 paso 2, residente | C-02 en P1 = `300` y P2 = `250` (Σ 550 > 500) | **400** PROGRAMA_DESCUADRE "sobran 50.000" | art. 118 RLOPSRM |
| N3 ⭐ | **Plan de amortización no suma el anticipo** | HU-01 paso 5, residente | P3 = `50000` (Σ = 250,000 ≠ 300,000) | Banner `plan-descuadre`; al guardar **400** "debe sumar exactamente el anticipo ($300,000.00)" | art. 138 fr. I RLOPSRM |
| N4 ⭐ | **Garantía vencida** | HU-01 paso 4, residente | Vigencia de Cumplimiento = `2020-01-01` | **400** "la vigencia… ya está vencida; debe ser hoy o posterior" | O1-P5b (coherencia) |
| N5 ⭐ | **Garantía mayor al monto** | HU-01 paso 4, residente | Monto de Cumplimiento = `2000000` (> 1,000,000) | **400** "el monto… no puede exceder el monto del contrato" | alta-v2 1.4 |
| N6 ⭐ | **Anticipo >30% sin autorización del titular** | Crea variante con anticipo `50` y **sin** PDF de autorización; intenta integrar estimación (HU-12) | — | **409** "Anticipo 50% supera el 30%: falta la autorización del titular" | art. 50 fr. IV LOPSRM |
| N7 ⭐ | **Avance que excede lo contratado** | HU-06, contratista | C-01, periodo 1, cantidad = `1500` (> 1000) | **409** "Excede lo contratado (art. 118 RLOPSRM) en: Limpieza y trazo…" | art. 118 RLOPSRM |
| N8 ⭐ | **Estimación que excede lo planeado del periodo** | HU-12, contratista, periodo **P1** | Captura C-03 = `50` (planeado a P1 = 0) | **409** "Excede lo PLANEADO en el programa hasta este periodo" | art. 45-A-X RLOPSRM + 52 LOPSRM |
| N9 ⭐ | **Estimación que excede lo contratado** | HU-12, contratista | C-01 = `1100` en un periodo donde ya se estimó 1000 (acum 2100 > 1000) | **409** "Excede lo contratado (art. 118 RLOPSRM)" | art. 118 RLOPSRM |
| N10 ⭐ | **Periodo de estimación > 1 mes** | HU-12, contratista | periodo_inicio `2026-01-01`, periodo_fin `2026-02-15` | **400** "El periodo… no puede exceder un mes (art. 54)" | art. 54 LOPSRM |
| N11 ⭐ | **Integrar sin PDF firmado** | HU-12 sobre un contrato sin PDF ligado | — | **409** "El contrato no tiene su PDF firmado ligado…" | formalización HU-01 |
| N12 ⭐ | **Autorizar sin turnar** | HU-15, residente, estimación recién "Presentada" | Autorizar antes de que supervisión turne | **409** "La estimación aún no ha sido turnada por supervisión" | flujo HU-15 |
| N13 ⭐ | **Reingreso de algo NO rechazado** | HU-16, contratista | Intentar reingresar la estimación #1 (pagada) o una integrada | **409** "Solo se puede reingresar una estimación 'rechazada'" | HU-16 |
| N14 ⭐ | **Convenio supera el 25%** | HU-03, dependencia | Tipo Plazo, plazo nuevo = `120` (de 90 → +33.33%) | **400** "La variación de plazo (33.33%) excede el límite configurado (25%)" | guardrail (RLOPSRM 102, parametrizable) |
| N15 | **Emitir nota sin apertura firmada por todos** | HU-09, antes de las 3 firmas | Emitir cualquier nota | **409** "No se pueden emitir notas hasta que la apertura esté firmada por TODOS" | art. 123 fr. III RLOPSRM |
| N16 | **Doble pago de una estimación** | HU-21, finanzas | Registrar pago de la estimación #1 **otra vez** | **409** "Esta estimación ya tiene un pago registrado" | no-doble-pago |
| N17 | **Fecha de pago anterior a la integración** | HU-21, finanzas | Fecha de pago = `2025-12-31` | **400** "La fecha de pago… no puede ser anterior a la fecha de integración" | Plan2 Pase3 |
| N18 | **Folio de contrato duplicado** | HU-01, residente | Alta otra vez con folio `OBRA-2026-PRUEBA-01` | **409** "El folio ya existe" | UNIQUE folio |
| N19 | **Clave de concepto repetida** | HU-01 paso 1 | Dos conceptos con clave `C-01` | **400** "Hay una clave de concepto repetida…" | art. 45 fr. IX RLOPSRM |

---

## 6. CONTROL DE ACCESO (qué probar)

### 6.1 Por rol (sidebar / botones)
- Entra como **`finanzas@`**: HU-01 **no aparece** (no puede dar de alta); sí ve HU-19 (C) y HU-21 (E).
- Entra como **`contratista@`** en HU-01: la ve en **solo lectura** (nivel C) — sin botón Guardar.
- Entra como **`contratista@`**: HU-07 (alertas) y HU-02 (fianzas) **no aparecen** (`—`).
- Entra como **`supervision@`**: HU-21 (pago) **no aparece**; HU-15 sí (E).

### 6.2 Por participación (acceso al contrato)
- **`dependencia@` y `finanzas@`** ven **todos** los contratos en los selectores.
- **`residente@`/`contratista@`/`supervision@`** solo ven los contratos donde son parte.
- **Prueba dura:** entra como **`csilvasa@ipn.mx`** (residente que **no** participa en `OBRA-2026-PRUEBA-01`): el contrato **no** aparece en sus selectores; si fuerza la URL/petición del detalle → **403** "No tienes acceso a este contrato".

---

## 7. BRECHAS CONOCIDAS (NO son bugs — no las confundas)

| Tema | Comportamiento real | Por qué |
|---|---|---|
| **HU-02 Fianzas** | La pantalla de fianzas es **maqueta** y el "PDF de póliza" solo guarda el **nombre**. Las garantías **sí persisten** vía el alta HU-01 y se leen en el expediente. | Pantalla dummy; la lógica vive en HU-01. |
| **HU-11 Minutas** | **Maqueta pura** (todo en memoria; el PDF solo captura el nombre). | Nunca tuvo backend. |
| **HU-13 plazo 6 días (art. 54)** | El aviso del plazo de presentación es **solo ámbar, NO bloquea** el botón Presentar. | Decisión de fase; semáforo derivado. |
| **HU-18 Portafolio / HU-20 Tránsito a pago** | **Maquetas** sobre datos dummy (HU-20 tiene tablas en BD pero **ningún** controller las usa). | Sin backend. |
| **Pago permisivo** | HU-21 paga estados `integrada/enviada/autorizada` → **se puede pagar sin pasar por la autorización de HU-15**. | `[validar profe]` endurecer a solo "autorizada". |
| **Reingreso HU-16 copia carátula** | El reingreso **copia** subtotal/amortización/retención/neto de la rechazada; **no recaptura** montos ni recalcula. | Por diseño (snapshot inmutable). `[validar profe]`. |
| **Historial HU-14 incompleto** | La línea de tiempo solo refleja **integrada** y **enviada**; **autorizada/rechazada/pagada NO aparecen** todavía. | Faltan columnas-sello. |
| **Enforcement del alta solo-cliente** | PDF firmado, fianzas obligatorias y jurídicos completos solo se exigen en el **frontend**; por API directa se pueden saltar (el PDF sí se exige server-side al integrar estimación, N11). | Pendiente endurecer (Fundación). |
| **Convenio de plazo** | Cambia plazo y fecha de término pero **no regenera** los periodos del programa. | Follow-on E3. |

---

## 8. Apéndice — verificación opcional por SQL (psql)

```bash
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c \
"SELECT folio, monto, anticipo_pct, plazo_dias FROM contratos WHERE folio='OBRA-2026-PRUEBA-01';"
# Esperado: monto = 1000000.00, anticipo_pct = 30.00, plazo_dias = 90 (o 100 tras el convenio)

docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c \
"SELECT numero, estado, subtotal, amortizacion, retencion, neto FROM estimaciones e
  JOIN contratos c ON c.id=e.contrato_id WHERE c.folio='OBRA-2026-PRUEBA-01' ORDER BY numero;"
# Esperado #1: 100000 / 30000 / 500 / 69500 (pagada)
#          #2: 475000 / 142500 / 2375 / 330125 (rechazada)
#          #3: 475000 / 142500 / 2375 / 330125 (integrada, reemplaza_a=#2)
```

---

*Documento generado leyendo el sistema real (controllers de `backend/src` + `schema.sql` + `permisos.js`).
Los importes están pre-cuadrados; si alguno no coincide en tu corrida, es señal de un cambio en el código —
no del plan. Lo legal interpretativo está marcado `[validar profe]`.*
