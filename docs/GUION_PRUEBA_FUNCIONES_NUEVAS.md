# Guion de prueba manual — funciones nuevas (empresas, plan de amortización, seed)

> **Checklist para imprimir y palomear.** Verifica las funciones de las últimas dos sesiones. Todos los
> valores están **leídos del código real** (cuentas/empresas de `schema.sql`, testids/labels de
> `SeleccionRol.jsx`/`SolicitudRegistro.jsx`, reglas de `contratos.controller.js`/`AltaContrato.jsx`).
> **Local.** Fecha del sistema: **2026-06-16** (por eso las fechas de inicio van a futuro).

## Cuentas demo (todas contraseña `Sigecop2026!`)
| Rol | Correo | Nombre (como sale en pantalla) | Empresa |
|---|---|---|---|
| Residente | `residente@sigecop.test` | Ing. Iván Residente Demo | Dependencia Demo |
| Contratista/Superint. | `contratista@sigecop.test` | Arq. Carlos Contratista Demo | **Constructora Demo** |
| Supervisión | `supervision@sigecop.test` | Ing. Sofía Supervisión Demo | **Supervisión Externa Demo** |
| Dependencia | `dependencia@sigecop.test` | Lic. Diana Dependencia Demo | Dependencia Demo |
| Finanzas | `finanzas@sigecop.test` | C.P. Fernando Finanzas Demo | Dependencia Demo |

**Empresas del catálogo (las siembra `schema.sql`):** `Dependencia Demo`, `Constructora Demo`, `Supervisión Externa Demo`.

---

## 0. Preparación (una vez)
- [ ] Stack arriba: `docker compose up -d` → `http://localhost:5173`.
- [ ] Cargar el paquete demo: `docker exec sigecop_backend npm run seed:demo`
      → debe imprimir `✓ seed_demo aplicado: OBRA-2026-DEMO-01 (completo) + OBRA-2026-ATRASO-01..04 (atraso).`
- [ ] (al terminar de probar) limpiar con `docker exec sigecop_backend npm run reset:demo` (ver §4).

---

## 1. EMPRESAS — duplicidad imposible (registro por SELECTOR)

> Cómo abrir el registro: en la pantalla de inicio (login), clic en **«Regístrate»** (testid `link-registro`)
> → aparece el formulario **«Crear cuenta»** (testid `form-registro`).

### 1.a — Registrar una cuenta nueva ELIGIENDO una empresa que YA existe
- [ ] Abre **Regístrate**.
- [ ] **Nombre(s)** (`reg-nombres`): `Prueba`
- [ ] **Apellido(s)** (`reg-apellidos`): `Empresa Existente`
- [ ] **Correo** (`reg-email`): `guion.empresa.existe@sigecop.test`
- [ ] **Rol que solicita** (`reg-rol`): **Contratista / Superintendente**
- [ ] **Empresa (opcional)** (`reg-empresa-select`): abre el desplegable y **elige `Constructora Demo`**.
  - [ ] ✅ La empresa se **selecciona de la lista** (NO hay campo de texto para teclearla).
  - [ ] ✅ **NO aparece** el campo "Nombre de la nueva empresa" (`reg-empresa-nueva`).
- [ ] **Contraseña** (`reg-password`): `Test1234!`  ·  **Confirmar** (`reg-password2`): `Test1234!`
- [ ] Clic **«Crear cuenta»** (`reg-submit`).
- [ ] ✅ Aparece el mensaje **«…pendiente de aprobación…»** (`auth-mensaje`).
- [ ] ✅ **No se creó duplicado.** Verificación opcional (solo lectura):
      `docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c "SELECT count(*) AS n FROM empresas WHERE nombre='Constructora Demo';"`
      → debe seguir siendo **1**.

### 1.b — Registrar con «➕ Registrar nueva empresa» tecleando una VARIANTE de una existente
- [ ] Abre **Regístrate** otra vez.
- [ ] **Nombre(s)**: `Prueba` · **Apellido(s)**: `Variante`
- [ ] **Correo** (`reg-email`): `guion.empresa.variante@sigecop.test`
- [ ] **Rol**: **Contratista / Superintendente**
- [ ] **Empresa**: en `reg-empresa-select` elige **«➕ Registrar nueva empresa…»**.
  - [ ] ✅ Aparece el campo **«Nombre de la nueva empresa»** (`reg-empresa-nueva`).
- [ ] En ese campo escribe una **variante** de una existente: `Constructora Demo SA de CV`
  - [ ] ✅ Aparece el aviso verde (`reg-empresa-existente`):
        **«✓ Ya existe «Constructora Demo» en el catálogo: mejor selecciónala arriba (no se duplicará).»**
- [ ] **Contraseña / Confirmar**: `Test1234!`
- [ ] Clic **«Crear cuenta»** → ✅ **«…pendiente de aprobación…»**.
- [ ] ✅ La variante **NO** creó una empresa nueva (el backend reusa «Constructora Demo» por match fuerte:
      acentos/puntuación/sufijos de razón social). Verificación opcional:
      `docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c "SELECT id, nombre FROM empresas WHERE nombre ILIKE 'Constructora Demo%';"`
      → **una sola fila**: `Constructora Demo` (sin «SA de CV»).

> Prueba extra de variantes equivalentes (todas resuelven a `Constructora Demo`): `Constructóra Demo`,
> `CONSTRUCTORA DEMO, S.A. DE C.V.`, `constructora demo sa`.

### 1.c — La empresa aparece en el alta de contrato (derivada de la cuenta)
- [ ] Inicia sesión como **Residente** (`residente@sigecop.test` / `Sigecop2026!`).
- [ ] Menú → **Alta de contrato** (`/contratos/alta`).
- [ ] En **«Contratista · superintendente de obra»** (`select-superintendente`) elige **Arq. Carlos Contratista Demo**.
  - [ ] ✅ Debajo aparece: **«Empresa (contratista): Constructora Demo»** (`empresa-contratista`).
- [ ] En **«Supervisión (opcional)»** (`select-supervision`) elige **Ing. Sofía Supervisión Demo**.
  - [ ] ✅ Debajo aparece: **«Empresa (supervisión): Supervisión Externa Demo»** (`empresa-supervision`).
  - [ ] ✅ (bonus) Como son empresas **distintas**, NO sale el aviso «misma empresa». (Si pusieras dos
        cuentas de la misma empresa, saldría `aviso-misma-empresa`.)
- [ ] Puedes **Cancelar** el alta aquí (esta prueba es solo de la empresa).

---

## 2. PLAN DE AMORTIZACIÓN — reglas (art. 143 fr. I RLOPSRM)

> Un solo contrato de prueba sirve para los 3 casos. **Programa asimétrico** (P1 chico, P2 grande) para
> poder disparar las dos reglas. Como Residente, **Alta de contrato**.

### Datos del alta (captura paso a paso)
- [ ] **Paso «Datos generales y equipo»:**
  - Folio (`dg-folio`): `GUION-AMORT-01`
  - Tipo: deja el valor por defecto **«Obra pública sobre la base de precios unitarios»**
  - Objeto (`dg-objeto`): `Guion plan de amortización`
  - Fecha de inicio (`dg-fecha`): `2026-07-01`   ·   Plazo en días (`dg-plazo`): `60`   ·   Ciclo: **Mensual** (default)
  - Contratista/superintendente: **Arq. Carlos Contratista Demo** · Dependencia: **Lic. Diana Dependencia Demo**
  - → **Siguiente**
- [ ] **Paso «Catálogo de conceptos»:** clic **«+ Agregar concepto»** y captura:
  - Clave: `C1` · Concepto: `Trabajos de prueba` · Unidad: `m³` · Cantidad: `100` · P.U.: `50`
  - ✅ El monto del contrato debe quedar en **$5,000.00** (= 100 × 50). → **Siguiente**
- [ ] **Paso «Programa de obra»** (matriz concepto × periodo, **2 periodos**):
  - Periodo 1 (`celda-0-1`): `20`   ·   Periodo 2 (`celda-0-2`): `80`   (suma 100 = 100% del concepto)
  - → **Siguiente**
- [ ] **Paso «Datos jurídicos»:** firmante `Ing. Ana López`, cargo `Directora de Obras`, representante
      `Lic. Juan Pérez`, cédula `12345678`. → **Siguiente**
- [ ] **Paso «Garantías, penalizaciones y amortización»:**
  - **% de anticipo** (`anticipo-input`): `30`   (→ anticipo = **$1,500.00**)
  - **+ Agregar póliza**: tipo **Cumplimiento**, afianzadora `Afianzadora Guion`, póliza `POL-CUMP-01`, monto `500`, vigencia `2027-07-01`
  - **+ Agregar póliza**: tipo **Anticipo**, afianzadora `Afianzadora Guion`, póliza `POL-ANT-01`, vigencia `2027-07-01` (el monto se calcula solo = $1,500.00)
  - → **Siguiente** (llegas al paso **«Plan de amortización»**)

### En el paso «Plan de amortización» debes ver
- [ ] Columna **«Programado (cobro)»**: Periodo 1 = **$1,000.00** (`plan-programado-1`), Periodo 2 = **$4,000.00** (`plan-programado-2`).
- [ ] Precargado **proporcional al programa**: Periodo 1 = **300** (`plan-monto-1`), Periodo 2 = **1200** (`plan-monto-2`).
- [ ] Aviso verde **«✓ El plan suma exactamente el anticipo ($1,500.00).»** (`plan-cuadra`).

### 2.c — Default proporcional → **ACEPTA**
- [ ] Sin tocar nada (o tras pulsar **«Restablecer proporcional al programa»**, `plan-restablecer`), clic **Siguiente**.
- [ ] ✅ **Avanza** al paso «PDF firmado» (`pdf-firmado-precaptura` visible). El plan proporcional es válido.
- [ ] Regresa con **«Atrás»** al plan para los siguientes casos.

### 2.a — 0/0/todo-al-último → **RECHAZA** (art. 143 fr. I)
- [ ] Periodo 1 (`plan-monto-1`): `0`   ·   Periodo 2 (`plan-monto-2`): `1500`
- [ ] ✅ La suma sigue cuadrando ($1,500), **pero** bajo el Periodo 1 aparece en rojo **«Debe amortizar algo (hay obra programada)»** (`plan-falta-1`).
- [ ] Clic **Siguiente** → ✅ **NO avanza** y aparece el banner de error (`error-wizard`) con el texto EXACTO:
      > **Plan de amortización: el periodo 1 tiene obra programada ($1,000.00) pero no amortiza nada. La amortización debe aplicarse en cada estimación, no diferirse toda al final (art. 143 fr. I RLOPSRM).**

### 2.b — Un periodo amortiza MÁS de lo que cobra → **RECHAZA** (art. 143 fr. I)
- [ ] Periodo 1 (`plan-monto-1`): `1500`   ·   Periodo 2 (`plan-monto-2`): `0`
- [ ] ✅ La suma cuadra ($1,500), **pero** bajo el Periodo 1 aparece en rojo **«Excede lo programado del periodo»** (`plan-excede-1`).
- [ ] Clic **Siguiente** → ✅ **NO avanza** y aparece el banner (`error-wizard`) con el texto EXACTO:
      > **Plan de amortización: el periodo 1 amortiza $1,500.00, más de lo que se estima cobrar ese periodo ($1,000.00). La amortización se descuenta de cada estimación (art. 143 fr. I RLOPSRM).**

> (Caso de control, opcional) Si **borras** un monto del plan o pones algo que **no sume** $1,500, el error
> es el de cuadre: *«El plan de amortización debe sumar exactamente el anticipo ($1,500.00): lleva …,
> faltan/sobran … (art. 138 párr. 3 RLOPSRM).»*

- [ ] **No necesitas guardar** `GUION-AMORT-01` (basta verificar el rechazo/aceptación). Si lo guardaste,
      límpialo con el reset (§4, incluye `GUION-%` en el bloque opcional).

---

## 3. SEED — «probar cualquier HU sin capturar»

- [ ] Correr una vez: `docker exec sigecop_backend npm run seed:demo` (idempotente; recrea el paquete limpio).
- [ ] Deja cargados **5 contratos**: `OBRA-2026-DEMO-01` (completo) + `OBRA-2026-ATRASO-01..04` (en atraso),
      todos sobre **Constructora Demo** (misma empresa → demuestra que no se duplica).

Inicia sesión con la cuenta indicada y abre la pantalla; el dato ya está cargado (no captures nada):

| HU | Cuenta | Pantalla | Qué se debe ver | ✓ |
|---|---|---|---|---|
| HU-01 Alta/expediente | residente | Contratos → OBRA-2026-DEMO-01 | 7 conceptos, programa 100%, garantías, jurídicos, plan, PDF | [ ] |
| **HU-03 Convenios** | residente | Convenios → OBRA-2026-DEMO-01 | **Convenio de plazo (211→241 días)** con su nota de bitácora ligada | [ ] |
| HU-04 Expediente | residente | Expediente → OBRA-2026-DEMO-01 | Bloques + empresa del equipo + roster + estimaciones + convenio; **Exportar PDF** | [ ] |
| HU-05 Curva | residente | Programa/Curva → DEMO-01 | Curva S programado vs ejecutado (empieza en cero) | [ ] |
| HU-06 Trabajos | contratista | Avance por periodo → DEMO-01 | Avance por concepto/periodo | [ ] |
| **HU-07 Alertas** | residente | Alertas → ATRASO-01..04 | Panel de déficit por concepto (en unidades) + badge | [ ] |
| HU-08/09/10 Bitácora | residente | Bitácora → DEMO-01 | Abierta, apertura firmada, 3 notas (apertura/avance/convenio) firmadas | [ ] |
| HU-12 Integración | contratista | Estimaciones → DEMO-01 | Estimación #4 **Integrada**; nota firmada ligada a la #1 | [ ] |
| HU-13 Presentación | contratista | Estimaciones → #3 | Estimación **Presentada** | [ ] |
| HU-14 Historial | residente | Historial → DEMO-01 | Línea de tiempo de estimaciones | [ ] |
| HU-15 Revisión | residente | Revisión → #2 / #5 | #2 **Autorizada**, #5 **Rechazada** con observación | [ ] |
| HU-16 Reingreso | contratista | Estimaciones → #6 | **Reingreso** de la #5 (reemplaza_a) | [ ] |
| HU-17 Tablero | residente | Tablero | Estimaciones por estado + contratos en atraso | [ ] |
| HU-21 Pago | finanzas | Pagos → DEMO-01 | Estimación #1 **Pagada** (importe = neto $69,500.00) | [ ] |
| HU-22 Roster | residente | Roster → DEMO-01 | Residente/superintendente/supervisión vigentes | [ ] |
| **HU-23 Empresas** | — | Registro | Empresa por **selector** del catálogo (ver §1) | [ ] |

> Netos del ciclo de estimación (cuadrados al centavo): #1 **$69,500** · #2 **$208,500** · #3 **$417,000** ·
> #4 **$278,000** · #5 **$208,500** (rechazada) · #6 **$208,500** (reingreso). HU-11/18/20 son maqueta (sin backend), el seed no las alimenta.

---

## 4. Limpieza — reset del demo (DESTRUCTIVO de los datos demo)

> Borra **solo** los datos del paquete demo y deja la base lista para recargar el seed. **No toca** el
> esquema, ni las 5 cuentas demo, ni las empresas del catálogo, ni datos ajenos al demo.

- [ ] Reset: `docker exec sigecop_backend npm run reset:demo`
      (o `docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 -f /app/scripts/reset_demo.sql`)
- [ ] Recargar: `docker exec sigecop_backend npm run seed:demo`
- [ ] (opcional) Limpiar las cuentas de prueba del §1: descomenta el **Bloque B** de `reset_demo.sql`
      (borra cuentas `guion.%@sigecop.test` pendientes y contratos `GUION-%`) y vuelve a correr el reset.

Detalle del reset y advertencias en `backend/scripts/reset_demo.sql`.
