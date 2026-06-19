# PLAN DE PRUEBAS DEFINITIVO — SIGECOP tras el MATCH-MOCKUP · VALORES EXACTOS (18-jun-2026)

> **Para imprimir y palomear casilla por casilla.** Da de alta **UN contrato desde cero**
> (`OBRA-2026-PRUEBA-FINAL`) y recórrelo de punta a punta — hasta el **finiquito** — **en el orden oficial del
> ciclo**: alta → garantías → bitácora → avance → **estimación (WIZARD)** → revisión/autorización →
> **pago (WIZARD de 4 pasos)** → convenio (+ **autorización**) → finiquito.
>
> **Refleja el sistema TRAS el rediseño match-mockup (F0–F6)** — `docs/reportes/REPORTE_REDISENO_MATCH_MOCKUP_18jun.md`:
> - **SIDEBAR PLANO** por **ciclos** (sin acordeón, sin chevron, sin "Recorrido por bloques"): cada ciclo es un
>   **item directo** a su pantalla/wizard. Los sub-pasos y lecturas **viven DENTRO de cada ciclo** (stepper +
>   sección **"EN PARALELO"**), ya **no** cuelgan del sidebar.
> - **Ciclo de estimación = WIZARD de 5 pasos** (`/estimaciones/integracion`) **+ bloque "EN PARALELO"**
>   (Revisión/Reingreso/Historial/Tablero) siempre visible arriba del stepper.
> - **Bitácora = WIZARD** (`/bitacora/ambiente`): Apertura → Firma → Emitir; **Consultar/Minutas EN PARALELO**.
> - **Avance** (`/seguimiento/ambiente`): "Registrar avance" + **Curva/Alertas EN PARALELO**.
> - **Pago = WIZARD de 4 pasos** (`/pagos/transito`): Suficiencia → Soportes → Instrucción → **Registrar pago
>   (HU-21 embebido)**; el botón **"Registrar pago" es SOLO de finanzas**; la ruta `/pagos/registro` se conserva.
> - **REGLA DE ORO TIPO B:** las vistas siempre-accesibles (Consultar 10, Historial 14, Curva 05, Alertas 07,
>   Expediente 04, Tablero 17) **abren aunque el wizard esté incompleto o sin datos** (estado vacío, NUNCA un
>   error de bloqueo). Ver §TIPO-B.
> - ITEM 3.1 partida obligatoria · ITEM 3.2 autorización de convenio · evidencia fotográfica fuera de Etapa 1.
>
> **Reglas de cuadre (server-side, SIN cambios):** monto `= Σ ROUND(cant×PU,2)` (art. 45 fr. IX) · programa
> `Σ planeado = contratado` (100%) · plan amort `Σ = ROUND(monto×anticipo%,2)` (art. 143 fr. I) · carátula
> `neto = subtotal − amortización − 5 al millar − deductivas − retención_atraso`, **SIN IVA** · 5 al millar =
> art. 191 LFD (0.5%). **La math NO cambió** (el rediseño es navegación/UI; cero backend). Estimación #1 = **$69,500.00**.

---

## 0. PREPARACIÓN

```bash
# Reinicia para forzar grafo de módulos limpio (Vite re-lee fuentes) y abre pestaña NUEVA / incógnito.
docker restart sigecop_frontend sigecop_backend
docker logs --tail 5 sigecop_frontend        # espera "VITE ready"
# Navegador: Ctrl+Shift+R en http://localhost:5173
# Confirma el rediseño: login contratista@ → el sidebar es una LISTA PLANA de ciclos (sin chevrons ▸/▾);
#   "Ciclo de estimación" → elige contrato → ves arriba el bloque "EN PARALELO" y abajo la BARRA DE 5 PASOS.
```
- **NO necesitas aplicar DDL** (las 4 ya están en tu BD local). Si reseteaste la BD, ver §10.
- **Sembrar demo (opcional):** `docker exec sigecop_backend npm run reseed:cuentas && docker exec sigecop_backend npm run seed:demo`.

### 0.1 Cómo leer cada paso
**CUENTA** · **PANTALLA** (cómo llegar por el sidebar PLANO) · **DATOS EXACTOS (testid → valor)** · **RESULTADO**.
🟢 = caso bueno (ACEPTA) · 🔴 = caso malo a propósito (RECHAZA/AVISA). Las 🔴 son las que más valen.

---

## 1. Cuentas demo (contraseña común `Sigecop2026!`)
> Login = email + contraseña (`login-usuario`, `login-password`, **Iniciar sesión**); el rol se deduce.

| Cuenta | Rol | Empresa | Papel |
|---|---|---|---|
| `residente@sigecop.test` | residente | Dependencia Demo | Da de alta, abre bitácora, autoriza estimación, finiquito |
| `contratista@sigecop.test` | contratista | Constructora Demo | Superintendente: integra/presenta/reingresa, registra avance |
| `supervision@sigecop.test` | supervision | Supervisión Externa Demo | Observa y **turna** la estimación |
| `dependencia@sigecop.test` | dependencia | Dependencia Demo | Contratante; crea **y autoriza** convenios; padrón; finiquito |
| `finanzas@sigecop.test` | finanzas | Dependencia Demo | Tránsito a pago + **registra el pago** (único que puede) |

---

## 2. EMPRESAS MÚLTIPLES (re-seed 1 empresa : N cuentas) — para el acotamiento (PASO 16)

| Empresa | Tipo | Cuentas (pass `Sigecop2026!`) |
|---|---|---|
| **Dependencia Demo** | dependencia | `residente@`, `residente2.demo@`, `dependencia@`, `finanzas@` |
| **Dependencia Norte** | dependencia | `dep2@sigecop.test` |
| **Dependencia Sur Demo** | dependencia | `dependencia.sur@`, `residente.sur@` |
| **Constructora Demo** | contratista | `contratista@`, `super2.demo@`, `super3.demo@` |
| **Constructora Patito SA de CV** | contratista | `patito1@`, `patito2@` |
| **Supervisión Externa Demo** | supervision | `supervision@`, `superv2.demo@` |
| **Supervisión Técnica Sur Demo** | supervision | `superv.sur@` |

> *(Ignora la "pollution" de specs: `Constructora O3 <ts>`, `Grupo Mismo <ts>`, `regla4.*`, `o3.con.*`, etc.)*

---

## 3. CÓMO NAVEGAR — **SIDEBAR PLANO** (lista de ciclos; sin acordeón, sin "Recorrido")

> **Cambió la navegación.** El sidebar es una **lista plana** en 3 grupos. Cada **ciclo** es un **NavLink
> directo** (sin chevron). Las vistas que antes colgaban del chevron **ya NO están en el sidebar**: viven
> **dentro de cada ciclo** (como paso del stepper o como botón **"EN PARALELO"**). La pista de HU a la derecha
> muestra el **rango** del ciclo (p. ej. `HU 12–16`).

| Grupo | Ciclo (item plano → ruta) | Dónde están sus sub-pantallas AHORA |
|---|---|---|
| **CICLOS** | 📄 **Alta de contratos** → `/contratos/alta` (HU-01) | wizard de 7 pasos dentro |
| | 🛡️ **Fianzas / garantías** → `/contratos/fianzas` (HU-02) | item propio (ya **no** cuelga del Alta) |
| | 📐 **Ciclo de estimación** → `/estimaciones/integracion` (`HU 12–16`, **WIZARD 5 pasos**) | **EN PARALELO** (arriba): Revisión/autorización (15) · Reingreso (16) · Historial (14) · Tablero (17). Presentar (13) = paso 5 del wizard |
| | 📓 **Bitácora** → `/bitacora/ambiente` (`HU 08–11`, **WIZARD**) | **Pasos:** Apertura (08) · Firma · Emitir (09). **EN PARALELO:** Consultar (10) · Minutas (11) |
| | 🏗️ **Avance y seguimiento** → `/seguimiento/ambiente` (`HU 05–07`, pantalla) | **Registrar avance** (06) + **EN PARALELO:** Curva (05) · Alertas (07) |
| | 💳 **Pago y tránsito** → `/pagos/transito` (`HU 20–21`, **WIZARD 4 pasos**) | **Pasos:** Suficiencia · Soportes · Instrucción · **Registrar pago (21)** |
| | 📝 **Convenios** → `/contratos/modificatorios` (HU-03) | registrar + **autorizar** en la misma pantalla |
| | 🏁 **Cierre / finiquito** → `/contratos/finiquito` (HU-24) | pantalla única |
| | 🗂️ **Expediente** → `/contratos/expediente` (HU-04) | visor (solo lectura) |
| **VISTAS EJECUTIVAS** | 📊 Portafolio `/portafolio` (HU-18) · 📈 Tablero `/estimaciones/tablero` (HU-17) · 📤 Reportes `/reportes` (HU-19) · 🗺️ Ciclo de vida `/contratos/ciclo-vida` | — |
| **ADMINISTRACIÓN** | 🏢 Padrón `/admin/empresas` · 👥 Roster `/contratos/roster` (HU-22) · ✅ Solicitudes `/usuarios/solicitudes` | — |

> **El sidebar se FILTRA por rol** (cada quien ve solo lo suyo). Y por **"promoción de huérfanos"**, un rol que
> ve una sub-pantalla pero **no** el padre del ciclo la verá como **item plano**:
> - `dependencia@` (no ve el ciclo de estimación HU-12) verá en CICLOS, sueltos: **Revisión/autorización (HU-15)**
>   y **Historial (HU-14)**; y (no ve Avance HU-06) verá **Curva de avance (HU-05)**.
> - `finanzas@` verá: **Fianzas (HU-02)**, **Pago y tránsito (HU 20–21)** y, en VISTAS, **Reportes (HU-19)**.
> *(Es el mismo acceso de antes; solo cambió la presentación — el gating sigue por `permisos.js`/rutas.)*

---

## 4. DATASET CANÓNICO — `OBRA-2026-PRUEBA-FINAL` (math cuadrada al centavo, **sin cambios**)

### 4.1 Datos generales (Alta, paso 0)
| Campo (testid) | Valor |
|---|---|
| Folio (`dg-folio`) | `OBRA-2026-PRUEBA-FINAL` |
| Tipo (`dg-tipo`) | **Obra pública sobre la base de precios unitarios** |
| Objeto (`dg-objeto`) | `Construcción de aula didáctica — campus UAGRO (prueba E2E final)` |
| Ubicación (`dg-ubicacion`) | `Av. Juárez s/n, Chilpancingo, Gro.` *(si existe; opcional)* |
| Dependencia (`dg-dependencia`) | **Lic. Diana Dependencia Demo** |
| Plazo en días (`dg-plazo`) | `90` |
| Fecha de inicio (`dg-fecha`) | `2026-01-01` |
| % pena por atraso (`dg-pena`) | *(VACÍO)* → sin retención por atraso en el camino feliz |
| Superintendente (`select-superintendente`) | **Arq. Carlos Contratista Demo** |
| Supervisión (`select-supervision`) | **Ing. Sofía Supervisión Demo** |

> Derivados: término **2026-03-31** · **Monto = $1,000,000.00** (SIN IVA). **Siguiente →** (`btn-siguiente`).

### 4.2 Catálogo de conceptos (Alta, paso 1) → $1,000,000.00
| # | Clave (`concepto-clave-i`) | Concepto (`concepto-concepto-i`) | Unidad (`concepto-unidad-i`) | Cant. (`concepto-cantidad-i`) | P.U. (`concepto-pu-i`) | Importe |
|---|---|---|---|---|---|---|
| 0 | `C-01` | Limpieza y trazo del terreno | m² | `1000` | `50.00` | 50,000.00 |
| 1 | `C-02` | Excavación a máquina | m³ | `500` | `200.00` | 100,000.00 |
| 2 | `C-03` | Concreto f'c=200 kg/cm² | m³ | `300` | `2500.00` | 750,000.00 |
| 3 | `C-04` | Acero de refuerzo fy=4200 | kg | `2000` | `50.00` | 100,000.00 |
| | | | | | **Σ** | **$1,000,000.00** 🟢 |

> **+ Agregar concepto** por fila. El monto lo **deriva** el sistema (no se teclea).

### 4.3 Programa de obra (Alta, paso 2) — Mensual, 3 periodos. Σ por concepto = 100%
| Clave | P1 | P2 | P3 | Σ |
|---|---|---|---|---|
| C-01 | `1000` | `0` | `0` | 1000 🟢 |
| C-02 | `250` | `250` | `0` | 500 🟢 |
| C-03 | `0` | `150` | `150` | 300 🟢 |
| C-04 | `0` | `1000` | `1000` | 2000 🟢 |
| **$ periodo** | 100,000 | 475,000 | 425,000 | Σ 1,000,000 🟢 |

> Al cuadrar: banner verde `programa-cuadra`. Ciclo = **Mensual**.

### 4.4 Datos jurídicos (Alta, paso 3)
| Campo (testid) | Valor |
|---|---|
| Firmante dependencia (`jur-firmante`) | `Lic. Diana Dependencia Demo` |
| Cargo (`jur-cargo`) | `Directora de Obras Públicas` |
| Representante legal (`jur-representante`) | `Arq. Carlos Contratista Demo` |
| Cédula profesional (`jur-cedula`) | `12345678` |
| Poder notarial / Notaría | *(opcionales — vacíos)* |

### 4.5 Anticipo y garantías (Alta, paso 4) — anticipo 30% → $300,000.00
| Campo (testid) | Valor |
|---|---|
| % de anticipo (`anticipo-input`) | `30` |

Garantías (botón **+ Agregar póliza**):
| Tipo (`garantia-tipo-i`) | Afianzadora (`garantia-afianzadora-i`) | Póliza (`garantia-poliza-i`) | Monto (`garantia-monto-i`) | Vigencia (`garantia-vigencia-i`) |
|---|---|---|---|---|
| **Cumplimiento** | `Fianzas del Pacífico S.A.` | `FC-2026-001` | `100000.00` *(10%)* | `2027-06-01` |
| **Anticipo** | `Fianzas del Pacífico S.A.` | `FA-2026-001` | *(read-only = `300000.00`)* | `2027-06-01` |

### 4.6 Plan de amortización (Alta, paso 5) — Σ = $300,000.00 (art. 143 fr. I)
| Periodo | Monto (`plan-monto-N`) |
|---|---|
| P1 | `100000.00` |
| P2 | `100000.00` |
| P3 | `100000.00` |
| **Σ** | **$300,000.00** 🟢 (`plan-cuadra`) |

> Atajo: **"Restablecer proporcional"** (`plan-restablecer`).

### 4.7 PDF firmado (Alta, paso 6) — **obligatorio para guardar**
Sube cualquier `.pdf` (`pdf-firmado-input-precaptura`; el backend valida que empiece con `%PDF`). **Sin él NO se
integran estimaciones después** (candado HU-12). Botón **Guardar contrato**.

### 4.8 Resultado financiero ESPERADO de las estimaciones (memorízalo)
| Est. | Periodo | Generadores | Subtotal | (−)Amort.30% | (−)5 al millar | **NETO** |
|---|---|---|---|---|---|---|
| **#1** | P1 | C-01=1000, C-02=250 | 100,000.00 | 30,000.00 | 500.00 | **🎯 $69,500.00** |
| **#2** | P2 | C-02=250, C-03=150, C-04=1000 | 475,000.00 | 142,500.00 | 2,375.00 | **🎯 $330,125.00** |

---

## 5. RECORRIDO E2E — paso a paso (palomea cada ▢)

### ▢ PASO 0 — Registro con EMPRESA (HU-23) + 🔴 sin empresa
- Pantalla de acceso → **Crear cuenta** (`link-registro`).
- 🟢 Contratista CON empresa: `reg-nombres`=`Pedro` · `reg-apellidos`=`García Soto` · `reg-email`=`pedro.contratista@prueba.test` · `reg-rol`=**Contratista** · `reg-empresa-select`=**Constructora Demo** · `reg-password`/`reg-password2`=`Sigecop2026!` → **Crear cuenta** (`reg-submit`) → cuenta **pendiente** (la aprueba la Dependencia en `/usuarios/solicitudes`).
- 🔴 ⭐ Contratista/Supervisión **sin empresa** (`reg-empresa-select` = "— Sin empresa —") → **rechazo** `registro-error`: *"Elige tu empresa: es obligatoria para contratista y supervisión."* (REGLA 1).

### ▢ PASO 1 — Login de los 5 roles
Entra/sal con cada cuenta del §1. 🟢 Todas inician; chip de empresa y sidebar cambian por rol. 🔴 contraseña `X` → *"Credenciales inválidas"*.

### ▢ PASO 2 — Alta del contrato (HU-01)
- **Cuenta:** `residente@` · **Sidebar:** CICLOS → **Alta de contratos** (item plano, `/contratos/alta`).
- Teclea **todo el §4** (pasos 0→6 del wizard del alta, gating secuencial con **Siguiente →**). PDF obligatorio.
- 🟢 contrato guardado; aparece en **7. Registrados**, folio `OBRA-2026-PRUEBA-FINAL`, monto **$1,000,000.00**.

### ▢ PASO 3 — Garantías: póliza + endoso (HU-02)
- **Cuenta:** `dependencia@` *(gestiona; residente consulta)* · **Sidebar:** CICLOS → **Fianzas / garantías**
  (item plano propio, `/contratos/fianzas`). Elige el contrato (`select-contrato`).
- 🟢 **+ Agregar nueva póliza** (`btn-agregar-poliza`): `mp-tipo`=**Cumplimiento** · `mp-afianzadora`=`Fianzas del Pacífico S.A.` · `mp-folio`=`FP-2026-00123` · `mp-monto`=`100000` · `mp-vencimiento`=`2027-06-01` · `mp-archivo`=*(.pdf)* → **Registrar** (`mp-confirmar`).
- 🟢 **+ endoso** (`btn-endoso-<id>`): `endoso-motivo`=`Prórroga de vigencia` · `endoso-vigencia`=`2028-06-30` → **Registrar endoso** (`endoso-confirmar`).
- 🔴 ⭐ monto `9999999` → 400 · vigencia `2020-01-01` → 400 · 2ª del mismo tipo → 409 (art. 48).

### ▢ PASO 4 — Bitácora = **WIZARD** (HU-08/09) + Consultar/Minutas EN PARALELO
- **Cuenta:** `residente@` · **Sidebar:** CICLOS → **Bitácora** (item plano, `/bitacora/ambiente`). Elige el
  contrato (`select-contrato`) → aparece la barra `wizard-bitacora-pasos`: **① Apertura · ② Firma · ③ Emitir**.
  Arriba/al lado están **SIEMPRE** los botones **EN PARALELO**: `link-consulta` (Consultar 10) y `link-minutas`
  (Minutas 11).
- **① Apertura:** botón **Abrir la bitácora (HU-08)** (`link-abrir` → `/bitacora/apertura`). Llena:

  | Campo (testid) | Valor |
  |---|---|
  | Entrega del sitio (`input-fecha-apertura`) | `2026-01-01` |
  | Plazo de firma de notas (`input-plazo-firma`) | `2` |
  | Domicilio dependencia (`md-domicilio-dependencia`) | `Av. Juárez 100, Chilpancingo, Gro.` |
  | Teléfono dependencia (`md-telefono-dependencia`) | `7471234567` |
  | Domicilio contratista (`md-domicilio-contratista`) | `Calle Reforma 25, Acapulco, Gro.` |
  | Teléfono contratista (`md-telefono-contratista`) | `7449876543` |
  | Alcance (`md-descripcion-trabajos`) | `Construcción de aula de 60 m²: cimentación, estructura y acabados.` |
  | Características del sitio (`md-caracteristicas-sitio`) | `Terreno plano, 200 m², acceso vehicular, suelo arcilloso.` |
  - **Iniciar apertura** (`btn-aperturar`) → 🟢 nota **#1 de apertura** + firmas pendientes.
- **② Firma** (`link-firmar` → `/bitacora/por-firmar`): firma con `residente@`, `contratista@`, `supervision@`
  → 🟢 apertura **3/3 COMPLETA** (`firmas-xy` = "completa"). **El candado:** hasta las 3 firmas, el paso **③
  Emitir** muestra **🔒** (`candado-bit-4`).
- **③ Emitir** (`link-notas`): habilitado tras 3/3.
- 🔴 ⭐ emitir nota (HU-09) **antes** de las 3 firmas → **409** *"…firmada por TODOS"* (art. 123 fr. III).

### ▢ PASO 5 — Nota de bitácora (HU-09) + Minutas (HU-11)
- **Nota:** `supervision@` · Bitácora → paso **③ Emitir** (`link-notas` → `/bitacora/notas`): `select-tipo`=**Avance físico y financiero** · `input-tag`=`avance` · `input-contenido`=`Se verifica avance de excavación conforme a programa.` → **Emitir nota** (`btn-emitir`).
- **Minutas:** `residente@` · Bitácora → **EN PARALELO** → **Minutas** (`link-minutas` → `/bitacora/minutas`):
  registra una minuta (fecha/lugar/participantes/asunto/acuerdos + PDF) → **Adjuntar a nota** · agenda una visita.
- 🔴 ⭐ vincular nota de **otro** contrato → 400.

### ▢ PASO 6 — Avance (HU-06) + nota automática + Curva (HU-05)
- **Cuenta:** `contratista@` · **Sidebar:** CICLOS → **Avance y seguimiento** (`/seguimiento/ambiente`). Verás
  el botón **Registrar avance** (`link-trabajos` → `/seguimiento/trabajos-terminados`) y, **EN PARALELO**,
  `link-curva` (Curva 05) y `link-alertas` (Alertas 07). Entra a **Registrar avance**, elige el contrato y
  registra DOS avances (`btn-registrar-avance`):

  | Concepto (`cap-concepto`) | Periodo (`cap-periodo`) | Cantidad (`cap-cantidad`) |
  |---|---|---|
  | C-01 Limpieza y trazo | Periodo 1 | `1000` |
  | C-02 Excavación | Periodo 1 | `250` |
- 🟢 cada avance **genera su nota de bitácora** automática (tipo `avance`).
- **Append-only (ITEM 3.3):** para corregir, usa **Corregir** (`btn-corregir`, "dice/debe decir"); **no hay
  Editar/Eliminar** (corregir = registro nuevo vinculado, art. 123 fr. VI/VII).
- **Curva (HU-05):** `residente@` · Avance → **EN PARALELO** → **Curva de avance** (`link-curva`).
- 🔴 ⭐ avance C-01 P1 = `1500` (>1000) → **409** *"Excede lo contratado (art. 118)"*. Avance > planeado del periodo → **AVISO** (201), no bloquea.

### ▢ PASO 7 — Alertas de atraso (HU-07)
- **Cuenta:** `residente@` · Avance → **EN PARALELO** → **Alertas de atraso** (`link-alertas` → `/seguimiento/alertas`). Elige el contrato. Déficit al periodo vigente (P3): C-02 250, C-03 300, C-04 2000.
- 🟢 en C-03 **Asentar en bitácora** → nota de **atraso** (art. 53). 🔴 ⭐ asentar el **mismo** (concepto, periodo) **dos veces** → **409** (idempotente, `atraso_asentado`).

### ▢ PASO 8 — Ciclo de estimación = **WIZARD de 5 pasos** + **EN PARALELO** (HU-12/13/15/16)
> **Cuenta:** `contratista@` · **Sidebar:** CICLOS → **Ciclo de estimación** (`/estimaciones/integracion`).
> Elige el contrato (`select-contrato`). Verás **arriba** el bloque **`estimacion-en-paralelo`** ("EN PARALELO
> (LECTURA / OTRO ACTOR — NO SE BLOQUEAN)") con `par-revision` · `par-reingreso` · `par-historial` ·
> `par-tablero`; y **abajo** la barra `wizard-estimacion-pasos`: **① Periodo · ② Generadores · ③ Carátula ·
> ④ Soportes y notas · ⑤ Integrar y presentar.** Navega con **Siguiente →** (`btn-wsiguiente`) / **← Atrás**
> (`btn-watras`) o clicando `wpaso-<clave>`.

**8a — Integrar #1 (HU-12):**
1. **① Periodo** (`wpaso-periodo`): `periodo-selector`=**Periodo 1** (o `periodo-inicio`=`2026-01-01`, `periodo-fin`=`2026-01-31`). → **Siguiente**.
2. **② Generadores** (`wpaso-generadores`): en `tabla-generadores`, C-01=`1000`, C-02=`250` (C-03/C-04 vacíos). Semáforo de plan verde. → **Siguiente**. **El candado:** si un generador excede el plan del periodo, `semaforo-plan-exceso` se pone rojo y `btn-wsiguiente` queda **deshabilitado**.
3. **③ Carátula** (`wpaso-caratula`): `caratula-deductivas`=`0`. Verifica `caratula-neto-preview` = **$69,500.00**. → **Siguiente**.
4. **④ Soportes y notas** (`wpaso-soportes`): (opcional) **🔍 Buscar y vincular notas firmadas** (`btn-abrir-buscador-notas`) → vincula la nota del PASO 5. Aviso `soportes-fotos-alcance` (fotos fuera de Etapa 1). → **Siguiente**.
5. **⑤ Integrar y presentar** (`wpaso-integrar`): marca **¿Seguro que vas a cerrar?** (`check-cierre`) → **Confirmar e integrar estimación** (`btn-integrar`). → 🟢 `banner-integrada`, neto **$69,500.00**. Enlace **Ir a presentar a revisión** (`link-presentar`).

**8b — Presentar (HU-13):** `contratista@` · `link-presentar` (→ `/estimaciones/envio`) → **Presentar** → **"Presentada"** (arranca plazo art. 54).

**8c — Supervisión turna (HU-15):** `supervision@` · Ciclo de estimación → **EN PARALELO** → **Revisión/autorización** (`par-revision` → `/estimaciones/revision`). (Opcional) observación: carátula / tipo aclaración / `Verificar generadores de C-02.` → **Turnar**.

**8d — Residencia AUTORIZA (HU-15):** `residente@` · misma pantalla (`par-revision`) → **Autorizar** → **"Autorizada"**.

**8e — #2 → RECHAZO → REINGRESO (HU-16):**
- Integra **#2** por el wizard (`contratista@`, **Periodo 2**): C-02=`250`, C-03=`150`, C-04=`1000` → neto **$330,125.00**. Presenta.
- `supervision@` **turna**; `residente@` **RECHAZA** (motivo `Faltan soportes de C-03; recapturar generadores.`) → **"Rechazada"**.
- **Reingreso:** `contratista@` · Ciclo → **EN PARALELO** → **Reingreso** (`par-reingreso` → `/estimaciones/reingreso`) → confirma observaciones atendidas → **Reingresar** → 🟢 **#3 "Integrada"** (copia carátula, neto $330,125.00, `reemplaza_a`=#2; el plazo art. 54 NO se reinicia).

**🔴 ⭐ Negativas del ciclo:**
- ② Generadores C-03=`50` en **Periodo 1** (plan P1=0) → `semaforo-plan-exceso` rojo + **`btn-wsiguiente` deshabilitado**; por API 409.
- ① Periodo `2026-01-01`→`2026-02-15` y al integrar → **400** *"no puede exceder un mes (art. 54)"*.
- Integrar **sin** `check-cierre` → `btn-integrar` **deshabilitado**.
- Autorizar (8d) **antes** de turnar → **409** *"aún no ha sido turnada"*.
- Reingresar la #1 (pagada) → **409** *"Solo… una 'rechazada'"*.

### ▢ PASO 9 — Pago = **WIZARD de 4 pasos** (HU-20 + **HU-21 embebido**)
> **Cuenta:** `finanzas@` · **Sidebar:** CICLOS → **Pago y tránsito** (`/pagos/transito`). Elige el contrato
> (`select-contrato`) + la **estimación #1 Autorizada** (`select-estimacion`) → aparece `wizard-pago-pasos`:
> **① Suficiencia · ② Soportes · ③ Instrucción · ④ Registrar pago.** Navega con `btn-wsiguiente-pago` /
> `btn-watras-pago` (o `wpaso-pago-<clave>`).

1. **① Suficiencia** (`wpaso-pago-suficiencia`): si no hay techo, cárgalo — **ITEM 3.1: partida OBLIGATORIA**:

   | Campo (testid) | Valor |
   |---|---|
   | **Partida específica (`input-partida`)** | `62201` *(OBLIGATORIO, art. 24 LOPSRM)* |
   | Techo de la partida (`input-techo`) | `5000000` |

   → **Cargar techo** (`btn-cargar-techo`). 🟢 suficiencia OK (neto 69,500 ≤ techo). → **Siguiente**.
2. **② Soportes** (`wpaso-pago-soportes`): Factura (`input-factura`=`F-2026-001` → `btn-cargar-factura`) · CFDI (`input-cfdi`=`A1B2C3D4-1111-2222-3333-444455556666` → `btn-cargar-cfdi`). Fianza de cumplimiento leída del alta. → **Siguiente**.
3. **③ Instrucción** (`wpaso-pago-instruccion`): semáforo del plazo de 20 días (art. 54) → **💸 Generar instrucción de pago** (`btn-generar-instruccion`). 🟢 `aviso-instruccion-generada`. → **Siguiente**.
4. **④ Registrar pago** (`wpaso-pago-registro` → `wstep-pago-registro`): aquí está **EMBEBIDO el form de HU-21**
   (el mismo de `/pagos/registro`):

   | Campo (testid) | Valor |
   |---|---|
   | Estimación a pagar (`pago-estimacion`) | **#1 · autorizada · $69,500.00** |
   | Importe (`pago-importe-neto`) | **$69,500.00** *(read-only, derivado del servidor)* |
   | Fecha de pago (`pago-fecha`) | `2026-06-18` |
   | Referencia SPEI (`pago-referencia`) | `SPEI-2026-000123` |
   | Folio fiscal CFDI (`pago-cfdi`) | `A1B2C3D4-1111-2222-3333-444455556666` |
   | Fecha de la factura (`pago-fecha-factura`) | `2026-06-18` |
   | Fecha de autorización (`pago-fecha-autorizacion`) | *(opcional)* `2026-06-15` |
   | Observaciones (`pago-observaciones`) | *(opcional)* `Pago de la estimación #1.` |
   **Registrar pago** (`btn-registrar-pago`) → 🟢 `aviso-pago-registrado` **$69,500.00**; la #1 pasa a **"pagada"**.
- **🔴 ⭐ GATE de finanzas (nuevo):** entra al paso ④ como **`contratista@`** (que SÍ ve el wizard de pago, HU-20
  'E'): el form aparece pero **el botón `btn-registrar-pago` está DESHABILITADO** y se muestra la nota
  `pago-solo-finanzas` *"El registro del pago lo ejecuta Finanzas (art. 54 LOPSRM)."* Solo `finanzas@` puede
  registrar.
- *(La ruta `/pagos/registro` sigue existiendo: HU-21 también es accesible directa por URL — mismo form/testids.)*
- 🔴 ⭐ cargar techo **sin partida** (`input-partida` vacío) → `btn-cargar-techo` **deshabilitado**; por API **400**
  *"La partida presupuestal específica es obligatoria (art. 24 LOPSRM)"* (ITEM 3.1). · pagar la **#3 Integrada**
  → **409** (solo lo autorizado, art. 54) · fecha de pago `2025-12-31` → **400** · pagar la #1 otra vez → **409**.

### ▢ PASO 10 — Convenio (HU-03) + **ACTO DE AUTORIZACIÓN** (ITEM 3.2)
- **Cuenta:** `dependencia@` · **Sidebar:** CICLOS → **Convenios** (`/contratos/modificatorios`). Elige el contrato.

  | Campo (testid) | Valor |
  |---|---|
  | Tipo (`cm-tipo`) | **Plazo** |
  | Plazo nuevo en días (`cm-plazo-nuevo`) | `100` *(de 90 → +11.11%, ≤25%)* |
  | Motivo (`cm-motivo`) | `Ampliación por lluvias atípicas (dictamen técnico, art. 99 RLOPSRM).` |
  | Folio (`cm-folio`) | *(vacío → genera `CM-001`)* |
  **Registrar convenio** (`btn-registrar-convenio`) → 🟢 `CM-001` **"Pendiente de autorización"** (`conv-badge-registrado-…`); nota de bitácora ligada (🔗).
- **AUTORIZACIÓN (ITEM 3.2, art. 59 p3):** en la fila, como **dependencia**, **✔ Autorizar convenio** (`conv-autorizar-<id>`) → 🟢 **"Autorizado"** (`conv-badge-autorizado-…`) con sello.
- 🔴 ⭐ convenio **>25%** (plazo `120`, +33%) → se registra con **AVISO** (`aviso-sfp`), **NO** se bloquea; al **Autorizar** sin oficio → **409** *"…art. 102… carga el oficio…"*. Sube el oficio (📎) y reintenta → 🟢. · Autorizar con rol ≠ dependencia → **403**. · Re-autorizar uno ya autorizado → **409**.

### ▢ PASO 11 — Roster / sustitución (HU-22) + REGLA 4 (misma empresa)
> **Pre:** 2ª cuenta contratista MISMA empresa (Constructora Demo): `super2.demo@`/`super3.demo@`. Para la 🔴, otra empresa: `patito1@`.
- **Cuenta:** `dependencia@` · **Sidebar:** ADMINISTRACIÓN → **Roster** (`/contratos/roster`). Contrato (`roster-contrato`).
- 🟢 misma empresa: `sust-rol`=**superintendente** · `sust-nuevo`=**Ing. Marco Superintendente 2 (super2.demo)** · `sust-motivo`=`Cambio de superintendente (art. 125 fr. I g RLOPSRM).` → **Sustituir** (`btn-sustituir`) → 🟢 histórico + nota.
- 🔴 ⭐ REGLA 4: **patito1 (otra empresa)** → **409** *"…MISMA empresa… (art. 125)"*.
- 🔴 ⭐ ITEM 3.4: sustituir el rol **dependencia** → **400** *"no sustituible (art. 125)"* (aviso `roster-dependencia-aviso`). · motivo vacío → 400.

### ▢ PASO 12 — Expediente (HU-04)
- **Cuenta:** `residente@` · **Sidebar:** CICLOS → **Expediente** (`/contratos/expediente`). Elige el contrato.
- 🟢 bloques: configuración · catálogo (4 conceptos, $1,000,000) · programa · garantías · jurídicos · plan (Σ 300,000) · **roster** (con la sustitución) · **convenios** (`CM-001` autorizado + nota). **⬇ Exportar PDF**.

### ▢ PASO 13 — Portafolio (HU-18) + Tablero (HU-17)
- **Portafolio:** `dependencia@` · VISTAS EJECUTIVAS → **Portafolio** (`/portafolio`): semáforos; `OBRA-2026-ATRASO-*` en rojo.
- **Tablero:** `residente@`/`dependencia@` → **Tablero** (`/estimaciones/tablero`): estimaciones por estado + atrasos.

### ▢ PASO 14 — Finiquito (HU-24)
- **Cuenta:** `residente@` o `dependencia@` · **Sidebar:** CICLOS → **Cierre / finiquito** (`/contratos/finiquito`). Elige el contrato.
- 🟢 desglose del saldo (`finiquito-desglose`, art. 64) — solo la #1 pagada:

  | Renglón | Valor |
  |---|---|
  | Importe neto estimado y autorizado | $69,500.00 |
  | (−) Total pagado | −$69,500.00 |
  | (−) Anticipo no amortizado (300,000 − 30,000) | −$270,000.00 |
  | (−) Ajustes finales (`finiquito-ajustes`, default `0`) | −$0.00 |
  | **(=) SALDO** (`finiquito-saldo`) | **−$270,000.00** |
  | **A favor de** (`finiquito-afavor`) | **la DEPENDENCIA** (art. 171) |
- **Cerrar:** 🔒 **Cerrar contrato** (`btn-abrir-cierre`) → **Sí, elaborar finiquito y cerrar** (`btn-confirmar-cierre`) → 🟢 **cerrado**; documento art. 170 (`btn-ver-documento-finiquito`).
- 🔴 ⭐ 2º finiquito → 409 · cerrar de nuevo → 409 · rol contratista/supervisión → 403 · **sin bitácora** → 409 (`finiquito-sin-bitacora`).
- 🔴 ⭐ tras el finiquito, **integrar otra estimación** o **generar instrucción de pago** → **409** *"contrato cerrado (art. 64/170)"*.

### ▢ PASO 15 — Padrón de empresas (HU-23 admin)
- **Cuenta:** `dependencia@` · **Sidebar:** ADMINISTRACIÓN → **Padrón** (`/admin/empresas`).
- 🟢 `tab-padron` (validadas, `validar-{id}`) · `tab-porvalidar` (duplicados, `pv-validar-{id}`/`fusionar-{id}`) · `tab-dependencias` (aparte, art. 43/74 Bis).
- 🔴 ⭐ rol ≠ dependencia → la ruta no aparece en el sidebar.

### ▢ PASO 16 — Acotamiento por empresa
- 🟢 `dependencia@` (Dependencia Demo): ve `OBRA-2026-PRUEBA-FINAL`, `OBRA-2026-DEMO-01`, `ATRASO-*`.
- 🔴 ⭐ (A-no-ve-B): entra como **`dependencia.sur@`** o **`dep2@`** → **NO** ve los contratos de Dependencia Demo, y viceversa. *(finanzas: transversal.)*

### ▢ PASO 17 — Reportes (HU-19) + Ciclo de vida
- **Reportes:** `residente@` · VISTAS EJECUTIVAS → **Reportes** (`/reportes`): contrato + periodo → 7 reportes.
- **Ciclo de vida** (`/contratos/ciclo-vida`): índice ordenado (el paso de estimación enlaza al wizard).

---

## TIPO-B. ⭐ REGLA DE ORO — las vistas SIEMPRE-ACCESIBLES abren sin datos (estado vacío, NO bloqueo) 🟢

> Verifica que estas vistas **TIPO B** abren aunque **no hayas hecho nada** en su ciclo (wizard incompleto, sin
> datos): deben mostrar **estado vacío** ("aún no hay…"), **nunca** un error de bloqueo. Haz esto con un
> contrato **recién creado** (o `OBRA-2026-PRUEBA-FINAL` antes de tocar cada ciclo).

| ▢ | Vista TIPO B | Cómo llegar (sidebar plano) | Cuenta | Esperado 🟢 (sin datos) |
|---|---|---|---|---|
| ▢ | **Consultar bitácora (HU-10)** | Bitácora → EN PARALELO → `link-consulta` (`/bitacora/consulta`) — **sin haber aperturado** | `residente@` | Abre; "aún no hay bitácora / sin notas". **NO** error. |
| ▢ | **Minutas (HU-11)** | Bitácora → EN PARALELO → `link-minutas` | `residente@` | Abre; lista de minutas vacía. |
| ▢ | **Historial de estimaciones (HU-14)** | Estimación → EN PARALELO → `par-historial` (`/estimaciones/historial`) — **sin estimaciones** | `contratista@` | Abre; "este contrato no tiene estimaciones". |
| ▢ | **Revisión/autorización (HU-15)** | Estimación → EN PARALELO → `par-revision` — **sin presentadas** | `residente@`/`supervision@` | Abre; nada por turnar/autorizar. |
| ▢ | **Tablero (HU-17)** | VISTAS → Tablero (o `par-tablero`) | `residente@` | Abre; tablero con ceros. |
| ▢ | **Curva de avance (HU-05)** | Avance → EN PARALELO → `link-curva` — **sin avances** | `residente@` | Abre; curva en 0 / programada solamente. |
| ▢ | **Alertas de atraso (HU-07)** | Avance → EN PARALELO → `link-alertas` | `residente@` | Abre; déficit calculado o "sin atrasos". |
| ▢ | **Expediente (HU-04)** | CICLOS → Expediente (`/contratos/expediente`) | `residente@` | Abre (visor); bloques con lo que haya. |
| ▢ | **Promoción (dependencia):** Historial(14)/Revisión(15)/Curva(05) | aparecen como **items planos** en CICLOS (dependencia no ve el padre del ciclo) | `dependencia@` | El link existe en el sidebar y abre. |

> 🔴 contraprueba: ninguna de estas debe quedar **detrás de un candado** ni dar 403/409 por "wizard incompleto".
> El único bloqueo legítimo es por **rol/participación** (p. ej. `finanzas@` no ve Consultar bitácora porque
> HU-10 es null para finanzas — eso es acceso, no "candado de wizard").

---

## 6. ⭐ PRUEBAS NEGATIVAS / LEGALES — qué teclear para DISPARAR el bloqueo 🔴

| # | Prueba | Dónde / quién | Cambio sobre el dataset | Bloqueo esperado | Fundamento |
|---|---|---|---|---|---|
| N1 | Registro contratista/supervisión SIN empresa | PASO 0 | empresa vacía | "Elige tu empresa…" | REGLA 1 |
| N2 | Programa no cuadra (faltante) | Alta p2 | C-01 P1=`900` | 400 "faltan 100.000" | 45-A-X + 52 |
| N3 | Programa excede | Alta p2 | C-02 P1=`300`,P2=`250` | 400 "sobran 50.000" | art. 118 |
| N4 | Plan amort ≠ anticipo | Alta p5 | P3=`50000` | 400 "debe sumar $300,000.00" | 143 fr. I |
| N5 | Garantía vencida | HU-02 | vigencia `2020-01-01` | 400 | art. 48 |
| N6 | Garantía > contrato | HU-02 | monto `9999999` | 400 | art. 48 |
| N7 | 2ª garantía mismo tipo | HU-02 | otra Cumplimiento | 409 | art. 48 |
| N8 | Avance excede contratado | HU-06 | C-01 P1=`1500` | 409 (art. 118) | art. 118 |
| N9 | **Generador excede plan (wizard)** | HU-12 ② | C-03=`50` en P1 | `semaforo-plan-exceso` + **`btn-wsiguiente` disabled** | 45-A-X + 52 |
| N10 | Periodo estimación > 1 mes | HU-12 ① | fin `2026-02-15` | 400 (art. 54) | art. 54 |
| N11 | Integrar sin candado | HU-12 ⑤ | `check-cierre` sin marcar | `btn-integrar` **disabled** | UX wizard |
| N12 | Integrar contrato sin PDF | HU-12 | contrato sin PDF | 409 "no tiene PDF firmado" | HU-01 |
| N13 | Autorizar sin turnar | HU-15 | autorizar recién Presentada | 409 "aún no turnada" | flujo HU-15 |
| N14 | Reingreso de no-rechazada | HU-16 | reingresar la #1 | 409 | HU-16 |
| N15 | **Cargar techo SIN partida** | HU-20 ① | `input-partida` vacío | `btn-cargar-techo` disabled · API 400 "partida… obligatoria (art. 24)" | **ITEM 3.1** |
| N16 | Pagar no autorizada | HU-20 ④ / HU-21 | pagar #3 Integrada | 409 (art. 54) | art. 54 |
| N17 | Fecha pago < integración | HU-20 ④ / HU-21 | `2025-12-31` | 400 | Plan2 Pase3 |
| N18 | Doble pago | HU-20 ④ / HU-21 | pagar #1 otra vez | 409 | no-doble-pago |
| **N18b** | **Registrar pago NO siendo finanzas** | **HU-20 ④** | entrar al paso ④ como `contratista@` | `btn-registrar-pago` **disabled** + nota `pago-solo-finanzas` | **F6 (art. 54)** |
| N19 | **Autorizar convenio >25% sin oficio** | HU-03 | plazo `120`, autorizar sin oficio | 409 "art. 102… carga el oficio" | **ITEM 3.2** |
| N20 | **Autorizar convenio sin ser dependencia** | HU-03 | autorizar como residente | 403 | **ITEM 3.2** (art. 59 p3) |
| N21 | **Re-autorizar convenio** | HU-03 | autorizar uno ya autorizado | 409 (acto único) | **ITEM 3.2** |
| N22 | Sustitución de OTRA empresa | HU-22 | sustituto de otra empresa | 409 (art. 125) | REGLA 4 |
| N23 | **Sustituir la dependencia** | HU-22 | rol `dependencia` | 400 "no sustituible" | **ITEM 3.4** |
| N24 | Finiquito duplicado / sin bitácora / rol | HU-24 | 2º · sin bitácora · contratista | 409/409/403 | art. 64 / 168-172 |
| N25 | **Estimación/pago tras finiquito** | HU-12/20 | contrato cerrado | 409 "contrato cerrado (art. 64)" | Oleada 1 |
| N26 | Emitir nota sin apertura firmada | HU-09 | antes de 3 firmas | 409 (art. 123 fr. III) | art. 123 |
| N27 | Folio de contrato duplicado | HU-01 | folio repetido | 409 | UNIQUE folio |
| N28 | Clave de concepto repetida | HU-01 p1 | dos `C-01` | 400 | 45 fr. IX |
| N29 | Editar/eliminar avance | HU-06 | (ya no existe) | solo **Corregir** (append-only) | ITEM 3.3 |
| N30 | Asentar atraso duplicado | HU-07 | mismo (concepto, periodo) 2× | 409 (idempotente) | Oleada 1 |
| **N31** | **TIPO B bajo candado** (contraprueba) | §TIPO-B | abrir Consultar/Historial/Curva sin datos | **debe ABRIR** (estado vacío); 🔴 si diera error/bloqueo | **Regla de oro F0** |

---

## 7. CONTROL DE ACCESO (rol · participación · EMPRESA)
- **Por rol:** `finanzas@` no ve alta ni bitácora; `contratista@` ve alta en solo-lectura, no ve HU-07/HU-02; `supervision@` no ve HU-20/21 (pago); **el paso ④ "Registrar pago" solo lo ejecuta finanzas**. Padrón/Solicitudes solo **dependencia**.
- **Por participación:** un residente que no participa no ve el contrato; por URL → 403.
- **Por empresa (ITEM 3.5):** dependencia de empresa A no ve contratos de empresa B; finanzas transversal.
- **Sidebar plano + promoción:** cada rol ve solo sus ciclos; los sub-HU sueltos de un rol (p. ej. dependencia → Historial/Revisión/Curva) se **promueven** a items planos (acceso intacto).

## 8. Apéndice — verificación por SQL (psql)
```bash
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c \
"SELECT folio,monto,anticipo_pct,plazo_dias,estado FROM contratos WHERE folio='OBRA-2026-PRUEBA-FINAL';"
# 1000000.00 / 30.00 / 90 (o 100 tras convenio) / 'cerrado' (tras finiquito)

docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c \
"SELECT numero,estado,subtotal,amortizacion,retencion,neto FROM estimaciones e
  JOIN contratos c ON c.id=e.contrato_id WHERE c.folio='OBRA-2026-PRUEBA-FINAL' ORDER BY numero;"
# #1: 100000/30000/500/69500 (pagada) · #2: 475000/142500/2375/330125 (rechazada) · #3: =#2 (integrada)

docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c \
"SELECT numero,estado,autorizado_por,autorizado_en FROM convenios_modificatorios cm
  JOIN contratos c ON c.id=cm.contrato_id WHERE c.folio='OBRA-2026-PRUEBA-FINAL';"  # CM-001 'autorizado'
```

## 9. Estado de funciones (tras el match-mockup F0–F6)
| Tema | Estado |
|---|---|
| **Sidebar PLANO por ciclos** (sin acordeón ni "Recorrido") | ✅ |
| Wizard Estimación (5 pasos) **+ bloque EN PARALELO** | ✅ |
| **Wizard Pago (4 pasos: …→ Registrar pago HU-21 embebido)** + gate finanzas | ✅ |
| Wizard Bitácora (apertura→firma→emitir; consulta/minutas EN PARALELO) | ✅ |
| Avance (registrar + curva/alertas EN PARALELO) + append-only (ITEM 3.3) | ✅ |
| Convenio + acto de autorización (ITEM 3.2) · partida obligatoria (ITEM 3.1) | ✅ |
| **Regla de oro TIPO B** (siempre-accesibles, estado vacío) | ✅ |
| Evidencia fotográfica | ❌ fuera de alcance Etapa 1 |

## 10. Apéndice — si reseteaste la BD: aplicar las 4 DDL en local
```bash
cd /c/Users/migue/Downloads/Proyectofepy/sigecop
for f in migracion_atraso_asentado avance_append_only migracion_hu20_partida_fk migracion_convenio_autorizacion; do
  echo "== $f ==" ; docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 < backend/scripts/$f.sql ;
done
docker restart sigecop_backend
```

---

*Plan generado leyendo las páginas/wizards reales tras F0–F6 (`Sidebar.jsx` plano; `IntegracionEstimacion`
[wizard + `estimacion-en-paralelo`/`par-*`]; `TransitoPago` [4 pasos, `wstep-pago-registro`]; `RegistroPagoForm`
[gate finanzas, `pago-solo-finanzas`]; `AmbienteBitacora`/`AmbienteAvance` [`link-consulta/minutas/curva/alertas`]).
Importes pre-cuadrados al centavo (math sin cambios). Si un valor/navegación no coincide, es señal de un cambio
en el código, no del plan. Reemplaza a `PLAN_PRUEBAS_FINAL_WIZARDS_18jun.md` (mismo dataset; navegación nueva).*
