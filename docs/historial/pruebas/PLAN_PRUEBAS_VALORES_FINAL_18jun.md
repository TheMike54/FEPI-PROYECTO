# PLAN DE PRUEBAS MANUAL E2E — SIGECOP · VALORES EXACTOS (versión FINAL, 18-jun-2026)

> **Para imprimir y palomear casilla por casilla.** Da de alta **UN contrato desde cero**
> (`OBRA-2026-PRUEBA-FINAL`) y recórrelo de punta a punta — hasta el **finiquito** — en el orden real del
> ciclo. Todos los números están **pre-calculados para cuadrar a la primera** y **verificados contra el
> código real** (controllers + `schema.sql` + `permisos.js` + el sidebar nuevo), no inventados.
>
> **Refleja el estado del sistema tras la sesión del 18-jun:** padrón de empresas + empresa obligatoria al
> registrarse + acotamiento por empresa · navegación modo-sistema (sidebar por flujos con acordeones, Inicio
> por rol) · HU-02 fianzas y HU-11 minutas funcionales · HU-18 portafolio y HU-20 tránsito funcionales ·
> HU-24 finiquito · bugs corregidos (apertura en el libro, nota de convenio visible, avance→nota automática).
>
> **Reglas de cuadre (server-side):**
> - Catálogo = monto: `monto = Σ ROUND(cantidad×PU, 2)` (art. 45 fr. IX RLOPSRM).
> - Programa de obra: `Σ planeado = contratado` **por concepto** (100%).
> - Plan de amortización: `Σ cuotas = ROUND(monto×anticipo%/100, 2)` al centavo.
> - Carátula de estimación: `neto = subtotal − amortización − retención(5 al millar) − deductivas − retención_atraso`, **SIN IVA**.
> - Pena por atraso = **art. 46 Bis LOPSRM + arts. 86-88 RLOPSRM** (tope art. 90); 5 al millar = **art. 191 LFD** (0.5%).
>
> **Fecha "hoy" de la sesión:** ≈ **2026-06-18**. El contrato arranca el **2026-01-01** a propósito (sus 3
> periodos ya iniciaron, así el panel de atraso HU-07 mide contra el periodo vigente).

---

## 0. Cómo usar este plan + PREPARACIÓN

### 0.1 Levantar y sembrar
```bash
# 1) Stack local
docker compose up -d                 # sigecop_db:5432 · sigecop_backend:4000 · sigecop_frontend:5173

# 2) (Recomendado) Dejar la BD limpia de pruebas previas y recargar el paquete demo
docker exec sigecop_backend npm run reset:demo   # borra los contratos demo OBRA-2026-% (no toca cuentas/empresas)
docker exec sigecop_backend npm run seed:demo    # recarga el paquete demo (idempotente)

# 3) Navegador
#    http://localhost:5173
```
- **`reset:demo`** borra SOLO los contratos demo (`OBRA-2026-%`) y sus hijos, en orden de FK. No toca las 5
  cuentas demo ni el catálogo de empresas.
- **`seed:demo`** deja cargado: **`OBRA-2026-DEMO-01`** (contrato COMPLETO: $2,500,000.00, anticipo 30% =
  $750,000.00, 7 conceptos, 7 periodos, ciclo de estimación en TODOS los estados, convenio de plazo, garantías
  con PDF+endoso, minuta+visita) y **`OBRA-2026-ATRASO-01..04`** (en atraso, para tablero/alertas/portafolio).
- Las **empresas demo** las siembra `schema.sql`: **Dependencia Demo** (id 1, tipo dependencia), **Constructora
  Demo** (id 2, contratista), **Supervisión Externa Demo** (id 3, supervisión).

### 0.2 Cómo leer cada paso
- Cada paso dice: **CUENTA** · **PANTALLA** (HU + cómo llegar por el sidebar) · **DATOS EXACTOS** · **RESULTADO**.
- Los `data-testid` entre paréntesis son los nombres reales de campos/botones.
- **🟢 = caso bueno (debe ACEPTAR)** · **🔴 = caso malo a propósito (debe RECHAZAR/AVISAR)**.
- Las pruebas **🔴/⭐ NEGATIVAS** disparan un bloqueo legal a propósito: son las que más valen.

---

## 1. Cuentas demo (contraseña común `Sigecop2026!`)

> Login = **email + contraseña**; el rol **se deduce** de la cuenta (no se elige). Campos: `login-usuario`,
> `login-password`, botón **Iniciar sesión**.

| Cuenta (email) | Nombre | Rol | Empresa | Papel en el contrato de prueba |
|---|---|---|---|---|
| `residente@sigecop.test` | Ing. Iván Residente Demo | residente | Dependencia Demo | **Da de alta el contrato**, abre bitácora, autoriza estimación, finiquito |
| `contratista@sigecop.test` | Arq. Carlos Contratista Demo | contratista | Constructora Demo | Superintendente: integra/presenta/reingresa, registra avance |
| `supervision@sigecop.test` | Ing. Sofía Supervisión Demo | supervision | Supervisión Externa Demo | Observa y **turna** la estimación |
| `dependencia@sigecop.test` | Lic. Diana Dependencia Demo | dependencia | Dependencia Demo | Contratante; crea convenios; **valida el padrón**; finiquito |
| `finanzas@sigecop.test` | C.P. Fernando Finanzas Demo | finanzas | Dependencia Demo | Tránsito a pago + registra el pago |

---

## 2. Quién ejecuta cada HU (matriz REAL de `permisos.js`)

`E` = ejecuta · `C` = solo consulta · `—` = sin acceso (no aparece en el sidebar).

| HU | residente | contratista | supervisión | dependencia | finanzas |
|---|---|---|---|---|---|
| **HU-01 Alta de contrato** | **E** | C | C | C | — |
| HU-02 Fianzas | C | — | — | **E** | C |
| HU-03 Convenios | C | C | C | **E** | — |
| HU-04 Expediente | **E** | C | C | C | — |
| HU-05 Curva de avance | **E** | C | C | C | — |
| HU-06 Trabajos terminados | C | **E** | C | — | — |
| HU-07 Alertas de atraso | **E** | — | C | — | — |
| HU-08 Apertura bitácora | **E** | C | C | — | — |
| HU-09 Emisión de notas | **E** | **E** | **E** | — | — |
| HU-10 Consulta de notas | **E** | C | C | — | — |
| HU-11 Minutas/visitas | **E** | C | C | — | — |
| HU-12 Integración estimación | C | **E** | C | — | — |
| HU-13 Presentar estimación | C | **E** | C | — | — |
| HU-14 Historial | **E** | C | — | C | — |
| HU-15 Revisión/autorización | **E** | — | **E** | C | — |
| HU-16 Reingreso tras rechazo | C | **E** | — | — | — |
| HU-17 Tablero | **E** | C | C | C | — |
| HU-18 Portafolio | C | — | C | **E** | — |
| HU-19 Reportes | **E** | C | C | C | C |
| HU-20 Tránsito a pago | C | **E** | — | C | **E** |
| HU-21 Registro de pago | C | — | — | C | **E** |

> **¿Quién da de alta el contrato (HU-01)?** El **RESIDENTE** (`residente:'E'`); `crearContrato` toma
> `residente_id = created_by = req.user.id` del JWT. La **dependencia NO da de alta**: solo se **selecciona**
> como contratante dentro del alta. **Roster/finiquito/empresas** son rutas `SoloRol` fuera del catálogo de HU.

---

## 3. CÓMO NAVEGAR — el NUEVO sidebar por flujos (acordeones)

> El sidebar es **guinda institucional**, organizado por **FLUJOS** (no la lista plana de antes). Cada flujo
> **padre NAVEGA** a su pantalla principal; el **chevron ▸/▾** a la derecha **expande/colapsa** sus sub-pasos
> (por defecto colapsados; se abre solo el flujo de la pantalla actual). Si tu rol no accede al padre pero sí a
> un sub-paso, ese sub-paso aparece como item **plano** (sin acordeón). El **Inicio** muestra solo tus módulos
> principales en tarjetas agrupadas (no las 15 HU sueltas).

| Grupo | Flujo (padre → ruta) | Sub-pasos (clic en el chevron ▸) |
|---|---|---|
| **Flujos** | 📄 **Alta de contrato** → `/contratos/alta` (HU-01) | Fianzas / garantías → `/contratos/fianzas` (HU-02) |
| | 📐 **Ciclo de estimación** → `/estimaciones/integracion` (HU-12) | Presentar `/estimaciones/envio` (HU-13) · Revisión/autorización `/estimaciones/revision` (HU-15) · Reingreso `/estimaciones/reingreso` (HU-16) · Historial `/estimaciones/historial` (HU-14) · Recorrido por bloques `/estimaciones/ambiente` |
| | 📓 **Bitácora** → `/bitacora/apertura` (HU-08) | Por firmar `/bitacora/por-firmar` · Emitir notas `/bitacora/notas` (HU-09) · Consultar/buscar `/bitacora/consulta` (HU-10) · Minutas y visitas `/bitacora/minutas` (HU-11) · Recorrido `/bitacora/ambiente` |
| | 🏗️ **Avance y seguimiento** → `/seguimiento/trabajos-terminados` (HU-06) | Curva de avance `/seguimiento/curva-avance` (HU-05) · Alertas de atraso `/seguimiento/alertas` (HU-07) · Recorrido `/seguimiento/ambiente` |
| | 💳 **Pago y tránsito** → `/pagos/transito` (HU-20) | Registro del pago `/pagos/registro` (HU-21) · Recorrido `/pagos/ambiente` |
| | 📝 **Convenios** → `/contratos/modificatorios` (HU-03) | Recorrido `/contratos/convenio-ambiente` |
| | 🏁 **Cierre / finiquito** → `/contratos/finiquito` (HU-24) | Recorrido `/contratos/cierre` |
| | 🗂️ **Expediente** → `/contratos/expediente` (HU-04) | Cierre documental `/contratos/expediente-ambiente` |
| **Vistas ejecutivas** | 📊 Portafolio `/portafolio` (HU-18) · 📈 Tablero `/estimaciones/tablero` (HU-17) · 📤 Reportes `/reportes` (HU-19) · 🗺️ Ciclo de vida `/contratos/ciclo-vida` | — |
| **Administración** | 🏢 Padrón de empresas `/admin/empresas` · 👥 Roster / sustitución `/contratos/roster` (HU-22) · ✅ Solicitudes de registro `/usuarios/solicitudes` | — |

> **Barra superior:** chip de **empresa** del usuario · 🔔 campana (notificaciones/atraso, con pop-up) · ✍️
> **Por firmar** (pop-up con pendientes reales) · nombre/rol · **Salir**. **Abajo-derecha:** indicador discreto
> de HU (etiqueta tipo "HU-12") de la pantalla actual.

---

## 4. DATASET CANÓNICO — contrato `OBRA-2026-PRUEBA-FINAL` (créalo desde cero)

### 4.1 Datos generales (HU-01, paso 0)
| Campo (testid) | Valor a teclear |
|---|---|
| Folio (`dg-folio`) | `OBRA-2026-PRUEBA-FINAL` |
| Tipo (`dg-tipo`) | **Obra pública sobre la base de precios unitarios** |
| Objeto (`dg-objeto`) | `Construcción de aula didáctica — campus UAGRO (prueba E2E final)` |
| Dependencia (`dg-dependencia`) | **Lic. Diana Dependencia Demo** |
| Plazo en días (`dg-plazo`) | `90` |
| Fecha de inicio (`dg-fecha`) | `2026-01-01` |
| % pena por atraso (`dg-pena`) | *(VACÍO)* → sin retención por atraso en el camino feliz |
| Superintendente (`select-superintendente`) | **Arq. Carlos Contratista Demo** |
| Supervisión (`select-supervision`) | **Ing. Sofía Supervisión Demo** |

> **Derivados (el sistema los calcula):** término = **2026-03-31** · **Monto = $1,000,000.00** (SIN IVA).

### 4.2 Catálogo de conceptos (HU-01, paso 1) → monto $1,000,000.00
| # | Clave | Concepto | Unidad | Cantidad | P.U. | Importe |
|---|---|---|---|---|---|---|
| 1 | `C-01` | Limpieza y trazo del terreno | m² | `1000` | `50.00` | 50,000.00 |
| 2 | `C-02` | Excavación a máquina | m³ | `500` | `200.00` | 100,000.00 |
| 3 | `C-03` | Concreto f'c=200 kg/cm² | m³ | `300` | `2500.00` | 750,000.00 |
| 4 | `C-04` | Acero de refuerzo fy=4200 | kg | `2000` | `50.00` | 100,000.00 |
| | | | | | **Σ MONTO** | **$1,000,000.00** 🟢 |

### 4.3 Programa de obra (HU-01, paso 2) — Mensual → 3 periodos. Σ por concepto = 100%
> Periodos: **P1** 01–31 ene · **P2** 01–28 feb · **P3** 01–31 mar 2026.

| Clave | P1 (ene) | P2 (feb) | P3 (mar) | Σ | Contratado | Cuadra |
|---|---|---|---|---|---|---|
| C-01 | `1000` | `0` | `0` | 1000 | 1000 | 🟢 |
| C-02 | `250` | `250` | `0` | 500 | 500 | 🟢 |
| C-03 | `0` | `150` | `150` | 300 | 300 | 🟢 |
| C-04 | `0` | `1000` | `1000` | 2000 | 2000 | 🟢 |
| **$ del periodo** | **100,000** | **475,000** | **425,000** | | **Σ 1,000,000** | 🟢 |

> Al cuadrar, banner verde `programa-cuadra` ("✓ El programa cuadra al 100%").

### 4.4 Datos jurídicos (HU-01, paso 3)
| Campo (testid) | Valor |
|---|---|
| Firmante de la dependencia (`jur-firmante`) | `Lic. Diana Dependencia Demo` |
| Cargo (`jur-cargo`) | `Directora de Obras Públicas` |
| Representante legal del contratista (`jur-representante`) | `Arq. Carlos Contratista Demo` |
| Cédula profesional (`jur-cedula`) | `12345678` |
| Poder notarial / Notaría | *(opcionales — vacíos)* |

### 4.5 Anticipo y garantías (HU-01, paso 4) — anticipo 30% → $300,000.00
| Campo | Valor |
|---|---|
| % de anticipo (`anticipo-input`) | `30` |

> Con 30% (no >30%) **NO** se exige el PDF de autorización del titular. Anticipo derivado = **$300,000.00**.

**Garantías en el alta** (Cumplimiento obligatoria; Anticipo obligatoria por haber anticipo):

| Tipo (`garantia-tipo-i`) | Afianzadora | Póliza | Monto | Vigencia |
|---|---|---|---|---|
| **Anticipo** | `Fianzas del Pacífico S.A.` | `FA-2026-001` | `300000.00` *(read-only, = 30%)* | `2026-12-31` |
| **Cumplimiento** | `Fianzas del Pacífico S.A.` | `FC-2026-001` | `100000.00` *(10% del contrato)* | `2026-12-31` |

### 4.6 Plan de amortización (HU-01, paso 5) — Σ = $300,000.00
| Periodo | Monto (`plan-monto-N`) |
|---|---|
| P1 | `100000.00` |
| P2 | `100000.00` |
| P3 | `100000.00` |
| **Σ** | **$300,000.00** 🟢 (banner `plan-cuadra`) |

> Atajo: botón **"Restablecer proporcional"** (`plan-restablecer`) precarga 100k/100k/100k.

### 4.7 PDF firmado (HU-01, paso 6) — **obligatorio para guardar**
Sube cualquier `.pdf` real (`pdf-firmado-input-precaptura`). El backend solo valida que empiece con `%PDF`.
**Sin este PDF NO se podrán integrar estimaciones después** (candado server-side de HU-12).

### 4.8 Estimaciones — resultado financiero ESPERADO (memorízalo)
| Est. | Periodo | Generadores | Subtotal | (−)Amort.30% | (−)5 al millar | **NETO** |
|---|---|---|---|---|---|---|
| **#1** | P1 | C-01=1000, C-02=250 | 100,000.00 | 30,000.00 | 500.00 | **🎯 $69,500.00** |
| **#2** | P2 | C-02=250, C-03=150, C-04=1000 | 475,000.00 | 142,500.00 | 2,375.00 | **🎯 $330,125.00** |

---

## 5. RECORRIDO E2E — paso a paso (palomea cada ▢)

### ▢ PASO 0 — Registro de cuenta con EMPRESA (HU-23) + 🔴 sin empresa
- **Pantalla:** pantalla de acceso → **Crear cuenta** (`link-registro`) — o `/solicitud-acceso`.
- **🟢 Registro válido (contratista CON empresa):**

  | Campo (testid) | Valor |
  |---|---|
  | Nombre(s) (`reg-nombres`) | `Pedro` |
  | Apellido(s) (`reg-apellidos`) | `García Soto` |
  | Correo (`reg-email`) | `pedro.contratista@prueba.test` |
  | Rol que solicita (`reg-rol`) | **Contratista** |
  | Empresa (`reg-empresa-select`) | **Constructora Demo** *(elige del selector; o ➕ Registrar nueva → `reg-empresa-nueva`)* |
  | Contraseña (`reg-password`) | `Sigecop2026!` |
  | Confirmar (`reg-password2`) | `Sigecop2026!` |

  Botón **Crear cuenta** (`reg-submit`) → cuenta **pendiente**; la **Dependencia** la aprueba en
  *Administración → Solicitudes de registro* (`/usuarios/solicitudes`).
  > Nota: como contratista, el label del campo es **"Empresa *"** (obligatorio). La empresa se **elige** (no se
  > teclea); si registras una "nueva" que ya existe, avisa `reg-empresa-existente` ("✓ Ya existe «…»").

- **🔴 ⭐ Registro de contratista SIN empresa** → deja `reg-empresa-select` en "— Sin empresa —", **Crear
  cuenta** → **rechazo** (`registro-error`): **"Elige tu empresa: es obligatoria para contratista y
  supervisión."** *(REGLA 1; `ROLES_EMPRESA_OBLIGATORIA = ['contratista','supervision']`.)* Repite con rol
  **Supervisión** (mismo rechazo). Con rol **Residente/Dependencia/Finanzas** la empresa es **opcional** (no
  bloquea: el label dice "Empresa (opcional)").

### ▢ PASO 1 — Login de los 5 roles
- Entra y sal con cada cuenta del §1 (los 5). 🟢 Todas inician sesión; el **chip de empresa** y el menú por
  flujos cambian según el rol. 🔴 Contraseña mala (`X`) → **"Credenciales inválidas"**.

### ▢ PASO 2 — Alta del contrato (HU-01)
- **Cuenta:** `residente@sigecop.test` · **Sidebar:** Flujos → **Alta de contrato** (`/contratos/alta`).
- **Datos:** teclea **todo el §4** (pasos 0→6 del wizard, gating secuencial). PDF firmado obligatorio.
- **🟢 Resultado:** contrato guardado; aparece en la pestaña **7. Registrados** con folio
  `OBRA-2026-PRUEBA-FINAL`, monto **$1,000,000.00**, PDF ligado.

### ▢ PASO 3 — Garantías: ver/registrar póliza + endoso (HU-02) **[funcional]**
- **Cuenta:** `dependencia@sigecop.test` *(gestiona; residente solo consulta)* · **Sidebar:** Flujos → Alta de
  contrato → **chevron** → **Fianzas / garantías** (`/contratos/fianzas`).
- Elige el contrato (`select-contrato`). Verás las 2 garantías del alta. **🟢 Agrega una nueva:**
  **+ Agregar nueva póliza** (`btn-agregar-poliza`) → modal:

  | Campo (testid) | Valor |
  |---|---|
  | Tipo (`mp-tipo`) | **Cumplimiento** |
  | Afianzadora (`mp-afianzadora`) | `Fianzas del Pacífico S.A.` |
  | Núm. de póliza (`mp-folio`) | `FP-2026-00123` |
  | Monto afianzado (`mp-monto`) | `100000` |
  | Vencimiento (`mp-vencimiento`) | `2026-12-31` |
  | PDF de la póliza (`mp-archivo`) | *(adjunta un .pdf)* |

  **Registrar** (`mp-confirmar`) → aparece con **👁 Ver** (`btn-ver-pdf-<id>`).
- **🟢 Endoso:** en esa fila **+ endoso** (`btn-endoso-<id>`) → Motivo (`endoso-motivo`) = **Prórroga de
  vigencia** · Nueva vigencia (`endoso-vigencia`) = `2027-06-30` → **Registrar endoso** (`endoso-confirmar`).
  La columna **Endosos** pasa a "1".
- **🔴 ⭐ Negativas HU-02:** monto `9999999` (> contrato) → **400**; vigencia `2020-01-01` (vencida) → **400**;
  segunda garantía del **mismo tipo** → **409** (una por tipo, art. 48). Un rol sin gestión
  (contratista/supervisión/finanzas) **no ve** "+ Agregar póliza".
  > Fundamento: art. 48 LOPSRM · art. 66 (vicios ocultos) · art. 91 RLOPSRM (endoso).

### ▢ PASO 4 — Apertura de bitácora (HU-08) + firma conjunta
- **Cuenta:** `residente@sigecop.test` · **Sidebar:** Flujos → **Bitácora** (`/bitacora/apertura`). Selecciona el contrato.

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
- **Iniciar apertura** (`btn-aperturar`) → **🟢** nota **#1 de apertura** + 1 firma pendiente por parte.
  **[BUG CORREGIDO]** la apertura **se ve como la nota #1 en el libro** de bitácora (no solo en "consultar").
- **Firma conjunta (✍️ Por firmar, pop-up de la barra superior o `/bitacora/por-firmar`):** entra uno por uno y
  **Firmar** con `residente@`, `contratista@`, `supervision@`. 🟢 Apertura **3/3 COMPLETA**.
- **🔴 ⭐ N:** intenta **emitir una nota** (HU-09) **antes** de las 3 firmas → **409** "No se pueden emitir
  notas hasta que la apertura esté firmada por TODOS" (art. 123 fr. III).

### ▢ PASO 5 — Nota de bitácora (HU-09) + Minutas/visitas (HU-11) **[funcional]**
- **Nota (HU-09):** `supervision@` · Bitácora → **Emitir notas** (`/bitacora/notas`). Tipo (`select-tipo`) =
  **Avance físico y financiero** · Tag (`input-tag`) = `avance` · Contenido (`input-contenido`) = `Se verifica
  avance de excavación conforme a programa.` → **Emitir nota** (`btn-emitir`). 🟢 Nota en el libro.
- **Minutas (HU-11):** `residente@` · Bitácora → **Minutas y visitas** (`/bitacora/minutas`). Selecciona el
  contrato (bitácora abierta).
  - Pestaña **Minutas:** Fecha, Lugar, Participantes, Asunto, Acuerdos + **adjunta PDF** → **Registrar minuta**
    → aparece con **👁 Ver PDF**.
  - En esa fila **Adjuntar a nota** → elige una nota real de la bitácora → **Vincular** (muestra "nota #…").
  - Pestaña **Agenda de visitas:** Fecha, Lugar, Responsable, Propósito → **Agendar visita** (Agendada).
  - **🔴 ⭐:** vincular una nota que **no pertenece** a ese contrato → **400**.

### ▢ PASO 6 — Avance de trabajos (HU-06) + nota automática + Curva (HU-05)
- **Cuenta:** `contratista@sigecop.test` · **Sidebar:** Flujos → **Avance y seguimiento**
  (`/seguimiento/trabajos-terminados`). Selecciona el contrato. Registra DOS avances (`btn-registrar-avance`):

  | Concepto (`cap-concepto`) | Periodo (`cap-periodo`) | Cantidad (`cap-cantidad`) |
  |---|---|---|
  | C-01 Limpieza y trazo | Periodo 1 (ene) | `1000` |
  | C-02 Excavación a máquina | Periodo 1 (ene) | `250` |
- **🟢 [BUG=FUNCIÓN NUEVA]** cada avance **genera automáticamente su nota de bitácora** tipo `avance` (la
  bitácora ya está abierta) y muestra a qué nota quedó ligado.
- **Curva (HU-05):** `residente@` · Avance → **chevron** → **Curva de avance** (`/seguimiento/curva-avance`):
  curva S programado vs ejecutado **con tooltip al pasar el mouse**.
- **🔴 ⭐ N:** avance C-01 periodo 1 = `1500` (> 1000 contratado) → **409** "Excede lo contratado (art. 118)".
  Avance que excede lo **programado del periodo** → **AVISO** (201), no bloquea.

### ▢ PASO 7 — Alertas de atraso (HU-07)
- **Cuenta:** `residente@sigecop.test` · **Sidebar:** Avance → **chevron** → **Alertas de atraso**
  (`/seguimiento/alertas`). Selecciona el contrato. Medido al **periodo vigente (P3)**, en déficit:

  | Concepto | Déficit esperado |
  |---|---|
  | C-02 Excavación | 250 m³ |
  | C-03 Concreto | 300 m³ |
  | C-04 Acero | 2000 kg |
- **🟢** en C-03 pulsa **Asentar en bitácora** → nota de **atraso** firmada por el residente (art. 53).

### ▢ PASO 8 — Ciclo de estimación COMPLETO
**8a — Integrar #1 (HU-12).** `contratista@` · Flujos → **Ciclo de estimación** (`/estimaciones/integracion`).
Contrato + **periodo P1**. Generadores: C-01 `1000`, C-02 `250` (C-03/C-04 vacíos). Deductivas
(`caratula-deductivas`) = `0`. Preview: subtotal **100,000** · amort **30,000** · ret **500** · **neto
69,500**. **Integrar** (`btn-integrar-estimacion`) → 🟢 `banner-integrada`; neto oficial **$69,500.00**.

**8b — Presentar (HU-13).** `contratista@` · Ciclo → **chevron** → **Presentar** (`/estimaciones/envio`) →
**Presentar**. Estado `integrada` → **"Presentada"** (arranca plazo art. 54).

**8c — Supervisión turna (HU-15).** `supervision@` · Ciclo → **chevron** → **Revisión/autorización**
(`/estimaciones/revision`). (Opcional) observación: Sección **carátula**, Tipo **aclaración**, Descripción
`Verificar generadores de C-02.` → **Turnar** a residencia.

**8d — Residencia AUTORIZA (HU-15).** `residente@` · misma pantalla → **Autorizar** → **"Autorizada"**.

**8e — Estimación #2 → RECHAZO → REINGRESO (HU-16).**
- Integrar **#2** (`contratista@`, **periodo P2**): C-02 `250`, C-03 `150`, C-04 `1000` → subtotal **475,000** ·
  amort **142,500** · ret **2,375** · **neto $330,125.00**. **Presentar**.
- `supervision@` **turna**; `residente@` **RECHAZA** con motivo `Faltan soportes de C-03; recapturar
  generadores.` → **"Rechazada"**.
- **Reingreso (HU-16):** `contratista@` · Ciclo → **chevron** → **Reingreso** (`/estimaciones/reingreso`) →
  marca la confirmación de observaciones atendidas → **Reingresar**. 🟢 se crea la **#3 "Integrada"**, copia
  idéntica de la carátula (**neto $330,125.00**), ligada por `reemplaza_a`; el plazo art. 54 **NO se reinicia**.
- **🔴 ⭐ N (ciclo):** integrar C-03=`50` en **P1** (planeado P1=0) → **409** "Excede lo PLANEADO…"; periodo de
  estimación de `2026-01-01` a `2026-02-15` → **400** "no puede exceder un mes (art. 54)"; autorizar **antes**
  de turnar → **409** "aún no ha sido turnada por supervisión"; reingresar la #1 (pagada) → **409** "Solo se
  puede reingresar una estimación 'rechazada'".

### ▢ PASO 9 — Tránsito a pago (HU-20) + Registro del pago (HU-21) **[HU-20 funcional]**
- **Cuenta:** `finanzas@sigecop.test` · **Sidebar:** Flujos → **Pago y tránsito** (`/pagos/transito`).
  Verifica sobre la **#1 Autorizada**: suficiencia presupuestal (art. 24), semáforo del plazo de 20 días (art.
  54), checklist de soportes (factura/CFDI + fianza), y **generar la instrucción de pago** (1×estimación).
- **Registro del pago (HU-21):** Pago → **chevron** → **Registro del pago** (`/pagos/registro`):

  | Campo (testid) | Valor |
  |---|---|
  | Estimación a pagar (`pago-estimacion`) | **#1 · autorizada · neto $69,500.00** |
  | Importe (`pago-importe-neto`) | **$69,500.00** *(read-only = neto)* |
  | Fecha de pago (`pago-fecha`) | `2026-06-18` |
  | Referencia SPEI (`pago-referencia`) | `SPEI-2026-000123` |
  | Folio fiscal CFDI (`pago-cfdi`) | `A1B2C3D4-1111-2222-3333-444455556666` |
  | Fecha de la factura (`pago-fecha-factura`) | `2026-06-18` |
  **Registrar pago** (`btn-registrar-pago`) → 🟢 `aviso-pago-registrado` **$69,500.00**; la #1 pasa a **"pagada"**.
- **🔴 ⭐ N:** pagar la **#3 Integrada** (sin autorizar) → **409** (solo se paga lo autorizado, **art. 54**;
  pago endurecido); fecha de pago `2025-12-31` (antes de integrar) → **400**; pagar la #1 **otra vez** → **409**
  "ya tiene un pago registrado".

### ▢ PASO 10 — Convenio modificatorio (HU-03) + nota visible **[BUG corregido]**
- **Cuenta:** `dependencia@sigecop.test` · **Sidebar:** Flujos → **Convenios** (`/contratos/modificatorios`).
  Selecciona el contrato.

  | Campo (testid) | Valor |
  |---|---|
  | Tipo (`cm-tipo`) | **Plazo** |
  | Plazo nuevo en días (`cm-plazo-nuevo`) | `100` *(de 90 → +11.11%, dentro del 25%)* |
  | Motivo (`cm-motivo`) | `Ampliación por lluvias atípicas (dictamen técnico, art. 99 RLOPSRM).` |
  | Folio (`cm-folio`) | *(vacío → genera `CM-001`)* |
  **Registrar convenio** (`btn-registrar-convenio`) → 🟢 `CM-001`; nueva fecha de término; **[BUG=CORREGIDO]**
  la columna **"Nota de bitácora"** muestra el **🔗 Nota #N** ligado (antes no se veía).
- **🔴 ⭐ N:** plazo nuevo = `120` (de 90 → +33.33%) → **400** "La variación de plazo (33.33%) excede el límite
  configurado (25%)".

### ▢ PASO 11 — Sustitución de personas / roster (HU-22) + REGLA 4 (misma empresa)
> **Pre:** registra una **segunda cuenta de contratista** de la **MISMA empresa** (Constructora Demo): en
> *Crear cuenta* da de alta `contratista2@sigecop.test` (rol **Contratista**, empresa **Constructora Demo**);
> entra como `dependencia@` y **apruébala** en *Solicitudes de registro*. Para la prueba 🔴, registra también
> `contratista3@sigecop.test` con una empresa **distinta** (ej. ➕ nueva "Constructora Norte").

- **Cuenta:** `dependencia@` (o el residente) · **Sidebar:** Administración → **Roster / sustitución**
  (`/contratos/roster`). Contrato (`roster-contrato`).
- **🟢 misma empresa:** Rol (`sust-rol`) = **superintendente** · Nueva persona (`sust-nuevo`) = **contratista2
  (Constructora Demo)** · Motivo (`sust-motivo`) = `Cambio de superintendente por reasignación de la empresa
  (art. 125 fr. I g RLOPSRM).` → **Sustituir** (`btn-sustituir`) → 🟢 "Sustitución registrada"; la anterior
  queda en histórico (no se borra); nota automática de sustitución en bitácora.
- **🔴 ⭐ REGLA 4:** repite eligiendo **contratista3 (Constructora Norte, otra empresa)** → **409** "El
  sustituto debe pertenecer a la **MISMA empresa** que la persona saliente: la sustitución cambia a la persona,
  no la empresa del contrato (art. 125 RLOPSRM)".
- **🔴 ⭐ otras:** motivo vacío → **400**; rol superintendente con cuenta que no es contratista → **400**.

### ▢ PASO 12 — Expediente (HU-04)
- **Cuenta:** `residente@` · **Sidebar:** Flujos → **Expediente** (`/contratos/expediente`). Selecciona el contrato.
- **🟢 Verifica los bloques:** configuración · catálogo (4 conceptos, $1,000,000) · programa (matriz, periodo
  vigente resaltado) · garantías · jurídicos · plan de amortización (Σ 300,000) · **roster** (con la
  sustitución) · **convenios** (`CM-001` + nota). Botón **⬇ Exportar PDF** (un solo documento de impresión).

### ▢ PASO 13 — Portafolio (HU-18) + Tablero (HU-17) + Alertas **[HU-18 funcional]**
- **Portafolio:** `dependencia@` · **Sidebar:** Vistas ejecutivas → **Portafolio** (`/portafolio`):
  semáforos de salud por contrato (los `OBRA-2026-ATRASO-*` en rojo); doble clic abre el detalle; agrupar por
  Contratista/Ejercicio.
- **Tablero:** `residente@`/`dependencia@` → **Tablero** (`/estimaciones/tablero`): estimaciones por estado
  (pagada/autorizada/integrada/rechazada) + contratos en atraso.

### ▢ PASO 14 — Finiquito (HU-24) — cierre del contrato **[NUEVO]**
- **Cuenta:** `residente@` o `dependencia@` · **Sidebar:** Flujos → **Cierre / finiquito**
  (`/contratos/finiquito`). Selecciona el contrato (`select-contrato`).
- **🟢 Desglose del saldo** (`finiquito-desglose`, art. 64 LOPSRM) — para nuestro contrato (solo la #1 pagada):

  | Renglón | Valor esperado |
  |---|---|
  | Importe real ejecutado *(informativo, art. 170 fr. IV)* | $100,000.00 |
  | Importe neto estimado y autorizado *(Σ neto autorizada/pagada)* | $69,500.00 |
  | (−) Total pagado | −$69,500.00 |
  | (−) Anticipo no amortizado *(300,000 − 30,000, art. 143)* | −$270,000.00 |
  | (−) Ajustes finales (`finiquito-ajustes`, default `0`) | −$0.00 |
  | **(=) SALDO** (`finiquito-saldo`) | **−$270,000.00** |
  | **A favor de** (`finiquito-afavor`) | **la DEPENDENCIA** *(art. 171: el contratista reintegra el anticipo no amortizado)* |

  > Sale **a favor de la dependencia** porque solo se pagó 1 de 3 estimaciones → el anticipo casi no se
  > amortizó. Es correcto (el finiquito refleja el estado real). *(Pre-requisito: el contrato debe tener
  > **bitácora abierta** — la tiene desde el PASO 4 — porque el finiquito se asienta como nota.)*
- **Cerrar:** 🔒 **Cerrar contrato (elaborar finiquito)** (`btn-abrir-cierre`) → **Sí, elaborar finiquito y
  cerrar** (`btn-confirmar-cierre`). 🟢 el contrato pasa a **cerrado**; documento art. 170
  (`btn-ver-documento-finiquito`, imprimible).
- **🔴 ⭐ Negativas HU-24:** intentar un **segundo** finiquito → **409** "Este contrato ya tiene finiquito";
  cerrar otra vez (estado 'cerrado') → **409** "El contrato ya está cerrado"; cerrar con un rol
  contratista/supervisión → **403** "Solo la dependencia o el residente asignado puede elaborar el finiquito";
  cerrar **sin bitácora** abierta → **409** "Abre la bitácora del contrato antes de elaborar el finiquito"
  (botón `btn-abrir-cierre` deshabilitado + banner `finiquito-sin-bitacora`).

### ▢ PASO 15 — Padrón de empresas (HU-23 admin) **[NUEVO]**
- **Cuenta:** `dependencia@sigecop.test` *(solo la Dependencia administra)* · **Sidebar:** Administración →
  **Padrón de empresas** (`/admin/empresas`).
- **🟢 Pestaña Padrón** (`tab-padron`, panel `panel-padron`): empresas **validadas** (filas `empresa-{id}`),
  con botón **Validar** (`validar-{id}`) para las que estén por_validar.
- **🟢 Pestaña Por validar** (`tab-porvalidar`, panel `panel-porvalidar`): empresas en `por_validar` con
  **detección de posibles duplicados**; botones **Validar** (`pv-validar-{id}`) y **Fusionar** (`fusionar-{id}`)
  para unir un duplicado al canónico. *(Crea una empresa "nueva" desde un registro para que aparezca aquí.)*
- **🟢 Pestaña Dependencias** (`tab-dependencias`, panel `panel-dependencias`): las dependencias **van aparte**
  de las empresas privadas (art. 43 RLOPSRM / 74 Bis LOPSRM).
- **🔴 ⭐:** entra como cualquier rol que **no sea dependencia** → la ruta **no aparece** en el sidebar (y la
  pantalla pide *"Inicia sesión como Dependencia para administrar el padrón"*).

### ▢ PASO 16 — Acotamiento por empresa **[NUEVO]**
> Demuestra que cada **dependencia** ve solo los contratos de **SU** empresa.

- **🟢** Entra como `dependencia@` (empresa **Dependencia Demo**): en los selectores de contrato ves
  `OBRA-2026-PRUEBA-FINAL`, `OBRA-2026-DEMO-01`, los `ATRASO-*`, etc. (todos de su empresa).
- **🔴 ⭐ (A no ve B):** registra/usa una **segunda dependencia de OTRA empresa** (ej. crea la cuenta
  `dep.norte@prueba.test`, rol **Dependencia**, empresa **Constructora Norte**; apruébala) y crea con ella un
  contrato propio. Al entrar como `dependencia@` (empresa Demo), ese contrato **NO aparece** en sus selectores;
  y al revés, la dependencia Norte **no ve** los contratos de la empresa Demo.
  > **Operativos** (residente/contratista/supervisión) ven solo donde **participan**; **finanzas** ve **todo**
  > (transversal). El acotamiento por empresa aplica a la **dependencia** en las **listas** (`listarContratos`
  > / portafolio).

### ▢ PASO 17 — Reportes (HU-19) + Ciclo de vida
- **Reportes:** `residente@` · Vistas ejecutivas → **Reportes** (`/reportes`). Selecciona contrato + periodo
  → exporta los 7 reportes (carátula, curva S, catálogo, programa, bitácora, convenios, roster) en PDF/Excel.
- **Ciclo de vida** (`/contratos/ciclo-vida`): recorrido completo del contrato en un índice ordenado.

---

## 6. ⭐ PRUEBAS NEGATIVAS / LEGALES — resumen (qué teclear para DISPARAR el bloqueo) 🔴

| # | Prueba | Dónde / quién | Cambio sobre el dataset | Bloqueo esperado | Fundamento |
|---|---|---|---|---|---|
| N1 | **Registro contratista/supervisión SIN empresa** | PASO 0 | Rol contratista, empresa vacía | "Elige tu empresa: es obligatoria para contratista y supervisión." | REGLA 1 |
| N2 | **Programa no cuadra (faltante)** | HU-01 p2, residente | C-01 P1 = `900` | **400** "faltan 100.000" | RLOPSRM 45-A-X + LOPSRM 52 |
| N3 | **Programa excede (sobra)** | HU-01 p2 | C-02 P1=`300`, P2=`250` (Σ 550) | **400** "sobran 50.000" | art. 118 RLOPSRM |
| N4 | **Plan de amortización ≠ anticipo** | HU-01 p5 | P3 = `50000` (Σ 250,000) | **400** "debe sumar exactamente el anticipo ($300,000.00)" | art. 143 fr. I RLOPSRM |
| N5 | **Garantía vencida** | HU-02 | vigencia `2020-01-01` | **400** | art. 48 LOPSRM |
| N6 | **Garantía > monto del contrato** | HU-02 | monto `9999999` | **400** | art. 48 |
| N7 | **2ª garantía del mismo tipo** | HU-02 | otra Cumplimiento | **409** (una por tipo) | art. 48 |
| N8 | **Avance excede lo contratado** | HU-06, contratista | C-01 P1 = `1500` | **409** "Excede lo contratado (art. 118)" | art. 118 RLOPSRM |
| N9 | **Estimación excede lo planeado del periodo** | HU-12, P1 | C-03 = `50` | **409** "Excede lo PLANEADO…" | art. 45-A-X + 52 |
| N10 | **Periodo de estimación > 1 mes** | HU-12 | inicio `2026-01-01`, fin `2026-02-15` | **400** "no puede exceder un mes (art. 54)" | art. 54 LOPSRM |
| N11 | **Integrar sin PDF firmado** | HU-12, contrato sin PDF | — | **409** "no tiene su PDF firmado ligado" | formalización HU-01 |
| N12 | **Autorizar sin turnar** | HU-15, residente | autorizar una recién Presentada | **409** "aún no ha sido turnada" | flujo HU-15 |
| N13 | **Reingreso de algo NO rechazado** | HU-16 | reingresar la #1 (pagada) | **409** "Solo… una 'rechazada'" | HU-16 |
| N14 | **Pagar estimación no autorizada** | HU-21, finanzas | pagar la #3 Integrada | **409** (solo lo autorizado) | art. 54 |
| N15 | **Fecha de pago < integración** | HU-21 | fecha `2025-12-31` | **400** | Plan2 Pase3 |
| N16 | **Doble pago** | HU-21 | pagar la #1 otra vez | **409** "ya tiene un pago" | no-doble-pago |
| N17 | **Convenio > 25%** | HU-03, dependencia | plazo nuevo `120` | **400** "excede el límite (25%)" | guardrail (RLOPSRM 102) |
| N18 | **Sustitución de OTRA empresa** | HU-22 | sustituto de empresa distinta | **409** "MISMA empresa… (art. 125)" | REGLA 4 |
| N19 | **Finiquito duplicado / sin bitácora / rol** | HU-24 | 2º finiquito · sin bitácora · rol contratista | **409 / 409 / 403** | art. 64 / 168-172 |
| N20 | **Emitir nota sin apertura firmada** | HU-09 | antes de 3 firmas | **409** "firmada por TODOS" | art. 123 fr. III |
| N21 | **Folio de contrato duplicado** | HU-01 | folio `OBRA-2026-PRUEBA-FINAL` otra vez | **409** "El folio ya existe" | UNIQUE folio |
| N22 | **Clave de concepto repetida** | HU-01 p1 | dos `C-01` | **400** "clave… repetida" | art. 45 fr. IX |

---

## 7. CONTROL DE ACCESO (rol · participación · EMPRESA)

### 7.1 Por rol (sidebar/botones)
- `finanzas@`: **no** ve HU-01 (alta); sí Pago/tránsito (E) y Reportes (C).
- `contratista@`: HU-01 en **solo lectura** (sin Guardar); HU-07/HU-02 **no aparecen**.
- `supervision@`: HU-21 (pago) **no aparece**; HU-15 sí (E).
- **Padrón de empresas** y **Solicitudes de registro**: solo **dependencia**.

### 7.2 Por participación (acceso al contrato)
- `dependencia@`/`finanzas@` ven (según su alcance) más contratos; operativos solo donde participan.
- **Prueba dura:** un residente que **no participa** en `OBRA-2026-PRUEBA-FINAL` no lo ve en sus selectores; si
  fuerza el detalle por URL → **403** "No tienes acceso a este contrato".

### 7.3 Por EMPRESA (acotamiento) **[NUEVO]**
- Una **dependencia** de empresa A **no ve** los contratos de empresa B en las listas (PASO 16). **Finanzas**
  es transversal (ve todo). Operativos: por participación.

---

## 8. BRECHAS CONOCIDAS (estado tras la sesión del 18-jun)

| Tema | Estado HOY |
|---|---|
| **HU-02 Fianzas** | ✅ **Funcional** (CRUD + PDF real + endoso; una por tipo). |
| **HU-11 Minutas/visitas** | ✅ **Funcional** (CRUD + PDF + vínculo a nota + agenda + acuerdos). |
| **HU-18 Portafolio** | ✅ **Funcional** (`GET /api/portafolio`, semáforo server-side acotado por participación). |
| **HU-20 Tránsito a pago** | ✅ **Funcional** (suficiencia art. 24, semáforo art. 54, soportes, instrucción de pago). |
| **HU-24 Finiquito** | ✅ **Funcional** (saldo server-side art. 64/168-172; append-only/inmutable). |
| **Bugs del smoke** | ✅ **Corregidos:** apertura visible en el libro · nota del convenio visible · avance→nota automática. |
| **Pago** | ✅ **Endurecido** a `'autorizada'` (art. 54) en HU-21; HU-20 (tránsito) hace el checklist previo. |
| **Reingreso HU-16 copia carátula** | ⚠️ Por diseño: **copia** subtotal/amort./retención/neto de la rechazada (snapshot inmutable); no recaptura. `[validar profe]` cerrado como criterio. |
| **Historial HU-14** | ⚠️ La línea de tiempo aún no muestra todos los sellos (autorizada/rechazada/pagada): refinamiento E3. |
| **Enforcement del alta solo-cliente** | ⚠️ PDF/fianzas/jurídicos se exigen en el **frontend**; por API directa se saltan (el PDF sí se exige server-side al integrar estimación, N11). Pendiente endurecer. |
| **Bloque de captura dedicado del cascarón de estimación (FASE 5)** | ⚠️ Delega a HU-12 (los generadores SÍ se capturan y persisten, art. 132). Refinamiento de UX. |

---

## 9. Apéndice — verificación opcional por SQL (psql)

```bash
# Contrato de prueba (tras el alta)
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c \
"SELECT folio, monto, anticipo_pct, plazo_dias, estado FROM contratos WHERE folio='OBRA-2026-PRUEBA-FINAL';"
# Esperado: 1000000.00 / 30.00 / 90 (o 100 tras el convenio) / 'cerrado' (tras el finiquito)

# Estimaciones (tras el ciclo)
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c \
"SELECT numero, estado, subtotal, amortizacion, retencion, neto FROM estimaciones e
  JOIN contratos c ON c.id=e.contrato_id WHERE c.folio='OBRA-2026-PRUEBA-FINAL' ORDER BY numero;"
# Esperado #1: 100000 / 30000 / 500 / 69500 (pagada)
#          #2: 475000 / 142500 / 2375 / 330125 (rechazada)
#          #3: 475000 / 142500 / 2375 / 330125 (integrada, reemplaza_a=#2)

# Acotamiento: empresa de cada cuenta
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c \
"SELECT u.email, u.rol, e.nombre AS empresa FROM usuarios u LEFT JOIN empresas e ON e.id=u.empresa_id
  WHERE u.email LIKE '%@sigecop.test' ORDER BY u.rol;"

# Finiquito (tras cerrar)
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c \
"SELECT importe_neto_aprobado, total_pagado, anticipo_no_amortizado, ajustes_finales, saldo, a_favor_de
  FROM finiquitos f JOIN contratos c ON c.id=f.contrato_id WHERE c.folio='OBRA-2026-PRUEBA-FINAL';"
# Esperado: 69500 / 69500 / 270000 / 0 / -270000 / 'dependencia'
```

---

*Documento generado leyendo el sistema real (controllers de `backend/src`, `schema.sql`, `permisos.js`, el
seed `seed_demo.sql` y el sidebar nuevo `Sidebar.jsx`). Los importes están pre-cuadrados; si alguno no
coincide en tu corrida, es señal de un cambio en el código — no del plan. Lo legal interpretativo está cerrado
como **criterio del equipo** y documentado en `docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md`.*
