# PLAN DE PRUEBAS NEGATIVAS — SIGECOP · VALIDACIONES Y GATES (24-jun-2026)

> **Para imprimir y palomear casilla por casilla.** Todo lo que el sistema debe **RECHAZAR o BLOQUEAR** (🔴), por **PASOS NUMERADOS** (mismo formato que `PLAN_PRUEBAS_FINAL_match_18jun.md`). 🔴 = caso malo a propósito (el sistema debe rechazar/avisar). **▢** = casilla para palomear.

> **[BUG CONOCIDO #N]** dentro de un «🔴 Esperado» = gate que HOY falla (ver `REPORTE_PRUEBAS_EXHAUSTIVAS_24jun.md`). El comportamiento que sigue al marcador es lo que el sistema hace HOY (incorrecto): **no es error del tester**, es un bug ya documentado. Sin el marcador, el caso debe pasar (el sistema sí bloquea).

### Cómo leer cada paso
Cada **PASO** trae: **Cuenta** · **Pantalla** (cómo llegar) · **datos exactos** (campo `testid` → valor) · **🔴 Esperado** (el bloqueo/aviso). Palomea el **▢** del encabezado y anota al margen ✅ (bloqueó bien) / ❌ (no bloqueó) / ⚠️ (otro).

## Cuentas demo (contraseña común `Sigecop2026!`)

| Cuenta | Rol | Papel en el flujo |
|---|---|---|
| `residente@sigecop.test` | residente | Da de alta, abre/firma bitácora, **autoriza/rechaza** estimación, finiquito |
| `contratista@sigecop.test` | contratista (**superintendente**) | Integra/presenta/reingresa estimación, registra avance |
| `supervision@sigecop.test` | supervisión | Observa, firma, **turna** la estimación |
| `dependencia@sigecop.test` | dependencia | Crea/autoriza convenios, padrón, roster, finiquito |
| `finanzas@sigecop.test` | finanzas | Tránsito a pago + **registra el pago** (único) |

**Contratos demo:** `SOP-2026-001..010` (alta completa + bitácora; `SOP-2026-001` con convenio v1/v2) y `PRUEBA-HU-01..24` (uno por HU en su estado). Contratos CERRADOS de demo = `PRUEBA-HU-17` y `SOP-2026-010`. Login: `#login-usuario`, `#login-password`, botón «Iniciar sesión». Al entrar a una pantalla de contrato sale `modal-elegir-contrato` → elige el contrato (se hereda).

---

## 1. Validaciones de campos (auth / registro / login / empresas / alta wizard)

> Casos NEGATIVOS (🔴 el sistema debe rechazar/bloquear). Login y registro: pantalla pública en `/` (`#login-usuario` / `#login-password` / botón "Iniciar sesión"; registro vía enlace "Regístrate" → `link-registro`). Empresas: como `dependencia@sigecop.test` en `/admin/empresas`. Alta wizard: como `residente@sigecop.test` en `/contratos/alta` (ruta libre, no pide modal de contrato). Pass común de todas las cuentas demo: `Sigecop2026!`.

### ▢ PASO 1 — Login con ambos campos vacíos (NEG-CAMPO-01)
- **Cuenta:** (sin sesión) · **Pantalla:** `/` vista login (pantalla inicial).

| Campo (testid) | Valor |
|---|---|
| Usuario (`#login-usuario`) | `(vacío)` |
| Password (`#login-password`) | `(vacío)` → botón "Iniciar sesión" |

> 🔴 **Esperado:** No autentica. Back exige ambos: 400 "email y password son requeridos" (auth.controller.js:27-29); en UI no se concede sesión.

### ▢ PASO 2 — Login con correo correcto y password en blanco (NEG-CAMPO-02)
- **Cuenta:** (sin sesión) · **Pantalla:** `/` vista login.

| Campo (testid) | Valor |
|---|---|
| Usuario (`#login-usuario`) | `residente@sigecop.test` |
| Password (`#login-password`) | `(vacío)` → "Iniciar sesión" |

> 🔴 **Esperado:** Rechazo: 400 "email y password son requeridos" (auth.controller.js:27); no entra.

### ▢ PASO 3 — Login con correo capitalizado distinto (case-sensitive backend) (NEG-CAMPO-03)
- **Cuenta:** (sin sesión) · **Pantalla:** `/` vista login (probar vía POST directo o sin pre-normalizar).

| Campo (testid) | Valor |
|---|---|
| Usuario (`#login-usuario`) | `Residente@Sigecop.test` |
| Password (`#login-password`) | `Sigecop2026!` |

> 🔴 **Esperado:** Debería entrar (register guarda en minúsculas → login normaliza igual). [BUG CONOCIDO #16: el backend NO normaliza; `WHERE email=$1` crudo devuelve 401 "Credenciales inválidas"; en la UI solo "funciona" porque SeleccionRol.jsx:40 baja a minúsculas antes de enviar].

### ▢ PASO 4 — Registro: nombre de una sola palabra (no cumple ≥2) (NEG-CAMPO-04) — HU-23
- **Cuenta:** (sin sesión) · **Pantalla:** `/` → "Regístrate" (`link-registro`).

| Campo (testid) | Valor |
|---|---|
| Nombres (`reg-nombres`) | `Juan` |
| Apellidos (`reg-apellidos`) | `(vacío)` |
| Correo (`reg-email`) | `juan.solo@test.com` |
| Rol (`reg-rol`) | **residente** |
| Password (`reg-password`) | `Sigecop2026!` |
| Confirmar password (`reg-password2`) | `Sigecop2026!` → enviar |

> 🔴 **Esperado:** Bloqueo: "Captura tu nombre y apellido(s)…" en `registro-error` (front SeleccionRol.jsx:150-154; back 400 art. 123 RLOPSRM, auth.controller.js:91-93).

### ▢ PASO 5 — Registro: contraseña menor a 8 caracteres (NEG-CAMPO-05) — HU-23
- **Cuenta:** (sin sesión) · **Pantalla:** `/` → "Regístrate" (`link-registro`).

| Campo (testid) | Valor |
|---|---|
| Nombres (`reg-nombres`) | `Ana` |
| Apellidos (`reg-apellidos`) | `López` |
| Correo (`reg-email`) | `ana.lopez@test.com` |
| Rol (`reg-rol`) | **residente** |
| Password (`reg-password`) | `Sige1` |
| Confirmar password (`reg-password2`) | `Sige1` → enviar |

> 🔴 **Esperado:** Bloqueo: "La contraseña debe tener al menos 8 caracteres." en `registro-error` (front SeleccionRol.jsx:155-158; back 400 auth.controller.js:94-96).

### ▢ PASO 6 — Registro: las contraseñas no coinciden (NEG-CAMPO-06) — HU-23
- **Cuenta:** (sin sesión) · **Pantalla:** `/` → "Regístrate" (`link-registro`).

| Campo (testid) | Valor |
|---|---|
| Nombres (`reg-nombres`) | `Ana` |
| Apellidos (`reg-apellidos`) | `López` |
| Correo (`reg-email`) | `ana.lopez2@test.com` |
| Rol (`reg-rol`) | **residente** |
| Password (`reg-password`) | `Sigecop2026!` |
| Confirmar password (`reg-password2`) | `Sigecop2027!` → enviar |

> 🔴 **Esperado:** Bloqueo: "Las contraseñas no coinciden." en `registro-error` (front SeleccionRol.jsx:159-162; el back ni recibe la confirmación).

### ▢ PASO 7 — Registro: contratista sin elegir empresa (obligatoria) (NEG-CAMPO-07) — HU-23
- **Cuenta:** (sin sesión) · **Pantalla:** `/` → "Regístrate" (`link-registro`).

| Campo (testid) | Valor |
|---|---|
| Nombres (`reg-nombres`) | `Carlos` |
| Apellidos (`reg-apellidos`) | `Ruiz` |
| Correo (`reg-email`) | `carlos.ruiz@test.com` |
| Rol (`reg-rol`) | **contratista** |
| Empresa (`reg-empresa-select`) | `(sin selección)` |
| Password (`reg-password`) | `Sigecop2026!` |
| Confirmar password (`reg-password2`) | `Sigecop2026!` → enviar |

> 🔴 **Esperado:** Bloqueo: "Elige tu empresa: es obligatoria para contratista y supervisión." (front SeleccionRol.jsx:171-174; back 400 auth.controller.js:114-117).

### ▢ PASO 8 — Registro: correo en blanco / solo espacios (POST directo, evade type=email) (NEG-CAMPO-08) — HU-23
- **Cuenta:** (sin sesión) · **Pantalla:** `/` → "Regístrate" (o POST `/api/auth/register`).

| Campo (testid) | Valor |
|---|---|
| Nombres (`reg-nombres`) | `Juan` |
| Apellidos (`reg-apellidos`) | `Pérez` |
| Correo (`reg-email`) | `"   "` (3 espacios) |
| Rol (`reg-rol`) | **residente** |
| Password (`reg-password`) | `Sigecop2026!` |
| Confirmar password (`reg-password2`) | `Sigecop2026!` → enviar |

> 🔴 **Esperado:** Debería rechazar 400 (correo obligatorio, no vacío tras trim). [BUG CONOCIDO #14: hoy NO bloquea — crea cuenta con email='' (201); un 2º registro con espacios choca el UNIQUE y da 409 "Ese correo ya está registrado" engañoso].

### ▢ PASO 9 — Registro: correo sin formato (sin @ ni dominio), POST directo (NEG-CAMPO-09) — HU-23
- **Cuenta:** (sin sesión) · **Pantalla:** `/` → "Regístrate" (o POST `/api/auth/register`).

| Campo (testid) | Valor |
|---|---|
| Nombres (`reg-nombres`) | `Juan` |
| Apellidos (`reg-apellidos`) | `Pérez` |
| Correo (`reg-email`) | `esto-no-es-email` |
| Rol (`reg-rol`) | **residente** |
| Password (`reg-password`) | `Sigecop2026!` |
| Confirmar password (`reg-password2`) | `Sigecop2026!` → enviar |

> 🔴 **Esperado:** Debería rechazar 400 por formato inválido (backend = fuente de verdad). [BUG CONOCIDO #25: hoy NO valida formato — 201, cuenta creada con email='esto-no-es-email'; el `type=email` del front no protege el endpoint ante POST directo].

### ▢ PASO 10 — Registro: correo ya existente (duplicado) (NEG-CAMPO-10) — HU-23
- **Cuenta:** (sin sesión) · **Pantalla:** `/` → "Regístrate" (`link-registro`).

| Campo (testid) | Valor |
|---|---|
| Nombres (`reg-nombres`) | `Otro` |
| Apellidos (`reg-apellidos`) | `Usuario` |
| Correo (`reg-email`) | `residente@sigecop.test` |
| Rol (`reg-rol`) | **residente** |
| Password (`reg-password`) | `Sigecop2026!` |
| Confirmar password (`reg-password2`) | `Sigecop2026!` → enviar |

> 🔴 **Esperado:** Bloqueo: 409 "Ese correo ya está registrado" (UNIQUE email, auth.controller.js:131-133).

### ▢ PASO 11 — Registro: empresa nueva que ya existe en el catálogo (aviso anti-duplicado) (NEG-CAMPO-11) — HU-23
- **Cuenta:** (sin sesión) · **Pantalla:** `/` → "Regístrate" (`link-registro`), rol contratista.

| Campo (testid) | Valor |
|---|---|
| Rol (`reg-rol`) | **contratista** |
| Empresa (`reg-empresa-select`) | `__nueva__` |
| Empresa nueva (`reg-empresa-nueva`) | `Constructora del Bajío S.A. de C.V.` (match fuerte: acentos/sufijos) |

> 🔴 **Esperado:** Aviso visible `reg-empresa-existente`: "✓ Ya existe «Constructora del Bajío, S.A. de C.V.»: mejor selecciónala" (empresa.js:28-53; SeleccionRol.jsx:295-302). NOTA: es AVISO, no bloqueo duro; el back deduplica con `resolverOCrearEmpresa`.

### ▢ PASO 12 — Padrón: fusionar empresa duplicada que tiene contratos (NEG-CAMPO-12) — HU-23
- **Cuenta:** dependencia@sigecop.test · **Pantalla:** `/admin/empresas` → pestaña `tab-porvalidar` → `fusionar-<id>` de una empresa referenciada por un contrato (p. ej. "Constructora del Bajío").

| Campo (testid) | Valor |
|---|---|
| Fusionar (`fusionar-<id_source>`) | canonica_id = `<id_canónica>` |

> 🔴 **Esperado:** Debería fusionar reapuntando personas Y contratos y eliminar la duplicada. [BUG CONOCIDO #3: hoy devuelve HTTP 500 "Error interno" opaco — la FK `contratos_contratista_empresa_id_fkey` (NO ACTION) no se reapunta; transacción hace ROLLBACK, la empresa sigue existiendo. Las empresas SIN contratos sí fusionan].

### ▢ PASO 13 — Alta P2: catálogo con clave de concepto duplicada (NEG-CAMPO-13) — HU-01
- **Cuenta:** residente@sigecop.test · **Pantalla:** `/contratos/alta` → Paso 2 "Catálogo de conceptos".

| Campo (testid) | Valor |
|---|---|
| Clave 0 (`concepto-clave-0`) | `C-01` |
| Concepto 0 (`concepto-concepto-0`) | `Excavación` |
| Unidad 0 (`concepto-unidad-0`) | `m³` |
| Cantidad 0 (`concepto-cantidad-0`) | `100` |
| PU 0 (`concepto-pu-0`) | `50` |
| Clave 1 (`concepto-clave-1`) | `C-01` (repetida) |
| Cantidad 1 (`concepto-cantidad-1`) | `10` |
| PU 1 (`concepto-pu-1`) | `5` → intentar avanzar |

> 🔴 **Esperado:** Bloqueo: clave debe ser ÚNICA entre conceptos (front validarPaso(1) jsx:1540-1543; back 400 "clave repetida" UNIQUE(contrato_id,clave), art. 45 fr. IX RLOPSRM).

### ▢ PASO 14 — Alta P3: programa que no cuadra al 100% por concepto (NEG-CAMPO-14) — HU-01
- **Cuenta:** residente@sigecop.test · **Pantalla:** `/contratos/alta` → Paso 3 "Programa de obra" (con catálogo de 1 concepto cant=100).

| Campo (testid) | Valor |
|---|---|
| Ciclo (`select-ciclo`) | **mensual** |
| Celda 0-0 (`celda-0-0`) | `40` |
| Celda 0-1 (`celda-0-1`) | `30` (Σ=70 ≠ 100 contratado) → intentar avanzar |

> 🔴 **Esperado:** Bloqueo por descuadre: Σ por concepto = contratado (|restante|≤0.0005), si no rechaza (front jsx:1570-1578; back PROGRAMA_DESCUADRE 400, art. 45-A-X RLOPSRM + 52 LOPSRM). Cuadre exacto al centavo, sin parciales.

### ▢ PASO 15 — Alta P5: garantía con monto mayor al monto del contrato (NEG-CAMPO-15) — HU-01
- **Cuenta:** residente@sigecop.test · **Pantalla:** `/contratos/alta` → Paso 5 "Garantías" (monto contrato derivado p. ej. $5,000.00).

| Campo (testid) | Valor |
|---|---|
| Tipo (`garantia-tipo-0`) | **Cumplimiento** |
| Afianzadora (`garantia-afianzadora-0`) | `Afianzadora X` |
| Póliza (`garantia-poliza-0`) | `P-001` |
| Monto (`garantia-monto-0`) | `9999999` |
| Vigencia (`garantia-vigencia-0`) | `2027-12-31` → intentar avanzar/guardar |

> 🔴 **Esperado:** Bloqueo: monto póliza ≤ monto del contrato, si no rechaza (front validarPaso(4) jsx:1627; back 400 "gm ≤ monto contrato", controller:181). Aviso adicional `modal-exceso-garantia` si excede el % esperado.

### ▢ PASO 16 — Alta P5: garantía con vigencia ya vencida (NEG-CAMPO-16) — HU-01
- **Cuenta:** residente@sigecop.test · **Pantalla:** `/contratos/alta` → Paso 5 "Garantías".

| Campo (testid) | Valor |
|---|---|
| Tipo (`garantia-tipo-0`) | **Cumplimiento** |
| Afianzadora (`garantia-afianzadora-0`) | `Afianzadora X` |
| Póliza (`garantia-poliza-0`) | `P-002` |
| Monto (`garantia-monto-0`) | `500` |
| Vigencia (`garantia-vigencia-0`) | `2020-01-01` (pasada) → intentar avanzar |

> 🔴 **Esperado:** Bloqueo: vigencia ≥ hoy (front validarPaso(4) jsx:1622; back 400 "ya está vencida", art. 48 LOPSRM, controller:188-193).

### ▢ PASO 17 — Alta P5: garantía con tipo arbitrario fuera del catálogo legal (POST directo) (NEG-CAMPO-17) — HU-01
- **Cuenta:** residente@sigecop.test · **Pantalla:** Paso 5 (la UI solo ofrece Cumplimiento/Anticipo/Vicios ocultos/Otra) o POST `/api/garantias/contrato/:id`.

| Campo (testid) | Valor |
|---|---|
| Tipo (`tipo`) | `CualquierCosaInventada` |
| Afianzadora (`afianzadora`) | `X` |
| Monto (`monto`) | `50000` |
| Vigencia (`vigencia`) | `2027-12-31` |

> 🔴 **Esperado:** Debería limitar al catálogo de ley (anticipo art.48-I / cumplimiento art.48-II / vicios_ocultos art.66). [BUG CONOCIDO #17: hoy NO hay whitelist — 201, se guarda como tipo 'cualquiercosainventada'; solo se exige no-vacío. Afecta tanto HU-02 como el alta congelada].

### ▢ PASO 18 — Alta P6: plan de amortización cuya suma ≠ monto del anticipo (NEG-CAMPO-18) — HU-01
- **Cuenta:** residente@sigecop.test · **Pantalla:** `/contratos/alta` → Paso 6 "Plan de amortización" (visible con %anticipo>0; montoAnticipo p. ej. $1,500.00).

| Campo (testid) | Valor |
|---|---|
| Anticipo (`anticipo-input`) | `30` (paso previo) |
| Plan monto 0 (`plan-monto-0`) | `500` |
| Plan monto 1 (`plan-monto-1`) | `500` (Σ=$1,000 ≠ $1,500) → intentar avanzar/guardar |

> 🔴 **Esperado:** Bloqueo: Σ plan = montoAnticipo EXACTO al centavo, si no rechaza (front validarPaso(5) jsx:1662; back 400 Σ=anticipo, controller:275, art. 138 párr. 3 RLOPSRM).

### ▢ PASO 19 — Alta P5: anticipo >30% sin PDF de autorización (NEG-CAMPO-19) — HU-01
- **Cuenta:** residente@sigecop.test · **Pantalla:** `/contratos/alta` → Paso 5 "Garantías".

| Campo (testid) | Valor |
|---|---|
| Anticipo (`anticipo-input`) | `50` |
| PDF autorización (`anticipo-pdf-input`) | `(sin archivo)` → intentar avanzar/guardar |

> 🔴 **Esperado:** Bloqueo del avance Y del guardado: PDF de autorización OBLIGATORIO si %anticipo>30% (front validarPaso(4) jsx:1602; art. 50 fr. IV LOPSRM).

### ▢ PASO 20 — Alta P1: fecha de inicio fuera de rango (día imposible) (NEG-CAMPO-20) — HU-01
- **Cuenta:** residente@sigecop.test · **Pantalla:** `/contratos/alta` → Paso 1 "Datos generales" (o POST `/api/contratos`).

| Campo (testid) | Valor |
|---|---|
| Folio (`dg-folio`) | `OBRA-NEG-26` |
| Objeto (`dg-objeto`) | `Prueba` |
| Dependencia (`dg-dependencia`) | `(válida)` |
| Plazo (`dg-plazo`) | `90` |
| Fecha (`dg-fecha`) | `2026-02-30` (también 2026-13-45 / 2026-00-00) |

> 🔴 **Esperado:** Debería rechazar 400 "fecha inválida". [BUG CONOCIDO #26: hoy devuelve HTTP 500 "Error interno" — Postgres lanza SQLSTATE 22008 y el catch solo mapea 22007/22P02 a 400 (controller:512); 'not-a-date' sí da 400 correcto].

### ▢ PASO 21 — Alta P1: folio de contrato ya existente (NEG-CAMPO-21) — HU-01
- **Cuenta:** residente@sigecop.test · **Pantalla:** `/contratos/alta` → Paso 1 "Datos generales".

| Campo (testid) | Valor |
|---|---|
| Folio (`dg-folio`) | `SOP-2026-001` (ya existe) |
| Objeto (`dg-objeto`) | `Prueba` |
| Dependencia (`dg-dependencia`) | `(válida)` |
| Plazo (`dg-plazo`) | `90` |
| Fecha (`dg-fecha`) | `2026-07-01` → intentar guardar |

> 🔴 **Esperado:** Bloqueo: 409 "El folio ya existe" (UNIQUE folio, err 23505 controller:500); el front lo mapea al campo `dg-folio` y regresa al tab 0 (jsx:1844).

### ▢ PASO 22 — Alta P1: plazo en días no entero / cero (NEG-CAMPO-22) — HU-01
- **Cuenta:** residente@sigecop.test · **Pantalla:** `/contratos/alta` → Paso 1 "Datos generales".

| Campo (testid) | Valor |
|---|---|
| Folio (`dg-folio`) | `OBRA-NEG-27` |
| Objeto (`dg-objeto`) | `Prueba` |
| Dependencia (`dg-dependencia`) | `(válida)` |
| Plazo (`dg-plazo`) | `0` (o 12.5) |
| Fecha (`dg-fecha`) | `2026-07-01` → intentar avanzar |

> 🔴 **Esperado:** Bloqueo: plazo entero >0 (front validarPaso(0) jsx:1526; back 400 "plazoDias debe ser un entero mayor a 0", controller:60-63).


---

## 2. Gates legales (art. 54, 118, 64, 122, 50, 24, 102)

> Pruebas NEGATIVAS donde el sistema DEBE bloquear/avisar. Se entra por `#login-usuario` / `#login-password` / botón «Iniciar sesión»; al abrir una pantalla de contrato sale `modal-elegir-contrato` → clic en `modal-contrato-<id>` (hereda `banner-contrato-activo`). Contratos: SOP-2026-001..010 y PRUEBA-HU-01..24; contratos CERRADOS de demo = PRUEBA-HU-17 y SOP-2026-010. Pass común: `Sigecop2026!`.

### ▢ PASO 23 — Registrar avance que EXCEDE la cantidad contratada del concepto (art. 118) (NEG-LEY-01) — HU-06
- **Cuenta:** contratista@sigecop.test (contratista/superintendente) · **Pantalla:** Avance · /seguimiento/trabajos-terminados → modal-contrato → SOP-2026-001; ciclo Avance · HU-06.

| Campo (testid) | Valor |
|---|---|
| Concepto (`cap-concepto`) | un concepto del catálogo (p.ej. **CONC-01**) |
| Periodo (`cap-periodo`) | periodo en curso |
| Cantidad (`cap-cantidad`) | `999999` (mayor que lo contratado) |
| Foto evidencia (`cap-foto-evidencia`) | JPG válido |

> 🔴 **Esperado:** Borde rojo en cap-cantidad (validación en vivo excede118) y botón Registrar deshabilitado; si se fuerza por API, 409 «Excede lo contratado (art. 118)» (art. 118 RLOPSRM). Σ ejecutado vigente + nueva ≤ contratado.

### ▢ PASO 24 — Registrar avance en periodo FUTURO (aún no inicia) (NEG-LEY-02) — HU-06
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** Avance · /seguimiento/trabajos-terminados → SOP-2026-001.

| Campo (testid) | Valor |
|---|---|
| Concepto (`cap-concepto`) | **CONC-01** |
| Periodo (`cap-periodo`) | último periodo (inicio > hoy) |
| Cantidad (`cap-cantidad`) | `5` |
| Foto evidencia (`cap-foto-evidencia`) | PNG |

> 🔴 **Esperado:** 409 «aún no inicia; no se puede reportar avance de trabajo no ejecutado» (FIX 22-jun, validar periodo actual). No se crea avance.

### ▢ PASO 25 — Integrar estimación de un periodo NO vencido (art. 54) (NEG-LEY-03) — HU-12
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** Estimación · /estimaciones/integracion (HU-12) → PRUEBA-HU-12.

| Campo (testid) | Valor |
|---|---|
| Periodo inicio (`periodo-inicio`) | `2026-06-01` |
| Periodo fin (`periodo-fin`) | `2099-12-31` (periodo aún no cierra) |

> 🔴 **Esperado:** 409 «periodoNoCerrado»: el periodo debe estar vencido (periodo_fin < CURRENT_DATE) antes de integrar (art. 54 LOPSRM). No integra.

### ▢ PASO 26 — Integrar estimación con periodo mayor a 1 mes / fin anterior al inicio (art. 54) (NEG-LEY-04) — HU-12
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** Estimación · /estimaciones/integracion (HU-12) → PRUEBA-HU-12.

| Campo (testid) | Valor |
|---|---|
| Periodo inicio (`periodo-inicio`) | `2026-03-01` |
| Periodo fin (`periodo-fin`) | `2026-05-15` (>1 mes) |

> 🔴 **Esperado:** 400: periodo_fin ≤ inicio+1 mes (art. 54). Variante fin<inicio (periodo-fin → 2026-02-28) → 400. No integra.

### ▢ PASO 27 — Badge de plazo de revisión > 20 días desde presentación (art. 54) — visual (NEG-LEY-05) — HU-15
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Presentación/Revisión de estimación (HU-15) → contrato con estimación 'enviada' hace >15 días (SOP-2026-001). Observar `semaforo-plazo-{id}` / `sello-presentacion-{id}`.

> 🔴 **Esperado:** Semáforo de 15 días de revisión derivado de enviada_en marca VENCIDO/rojo cuando se rebasa el plazo (art. 54 LOPSRM). Es aviso visual, NO bloquea.

### ▢ PASO 28 — Emitir nota de bitácora SIN apertura firmada por TODOS (art. 122/123) (NEG-LEY-06) — HU-09
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Bitácora · /bitacora/notas (HU-09) → PRUEBA-HU-08 (apertura sin firmar completa).

| Campo (testid) | Valor |
|---|---|
| Tipo (`select-tipo`) | **res_autoriza** |
| Contenido (`input-contenido`) | `Nota de prueba` |

> 🔴 **Esperado:** Botón btn-emitir deshabilitado (candado UI gate-emision); por API 409 «No se pueden emitir notas hasta que la apertura esté firmada por TODOS (faltan N firma(s))» (art. 122/123 RLOPSRM). No emite.

### ▢ PASO 29 — Registrar avance en contrato SIN bitácora abierta (art. 122) (NEG-LEY-07) — HU-06
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** Avance · /seguimiento/trabajos-terminados → contrato recién dado de alta SIN apertura (PRUEBA-HU-01).

| Campo (testid) | Valor |
|---|---|
| Concepto (`cap-concepto`) | **CONC-01** |
| Periodo (`cap-periodo`) | en curso |
| Cantidad (`cap-cantidad`) | `3` |
| Foto evidencia (`cap-foto-evidencia`) | JPG |

> 🔴 **Esperado:** 409 «requiere bitácora abierta» (art. 122 RLOPSRM, trabajos.controller.js:256-259). El POST exige bitácora abierta. No registra.

### ▢ PASO 30 — Registrar convenio modificatorio SIN bitácora abierta (art. 122) (NEG-LEY-08) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Convenios · /contratos/modificatorios (HU-03) → contrato SIN apertura (PRUEBA-HU-01).

| Campo (testid) | Valor |
|---|---|
| Tipo (`cm-tipo`) | **plazo** |
| Plazo nuevo (`cm-plazo-nuevo`) | `120` |
| Motivo (`cm-motivo`) | `Ampliación` |
| Oficio (`cm-oficio`) | `OF-001` |

> 🔴 **Esperado:** 409: exige bitácora abierta antes de registrar (P23, art. 122 RLOPSRM, convenios.controller.js:170). No registra el convenio.

### ▢ PASO 31 — Anticipo > 30% SIN PDF de autorización (art. 50 fr. IV) (NEG-LEY-09) — HU-01
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Alta · /contratos/alta → Paso 5 Garantías (tab 4).

| Campo (testid) | Valor |
|---|---|
| Anticipo (`anticipo-input`) | `31` |
| PDF anticipo (`anticipo-pdf-input`) | (NO subir) |

> 🔴 **Esperado:** Bloquea avance Y guardado: indicador anticipo-pdf-requerido / validarPaso(4); por API 409 inmutable si falta el PDF de autorización del anticipo (art. 50 fr. IV LOPSRM). No avanza el wizard.

### ▢ PASO 32 — Generar instrucción de pago SIN suficiencia presupuestal / excede techo (art. 24) (NEG-LEY-10) — HU-20
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** Tránsito a pago · /pagos/transito (HU-20) Paso 3 → estimación autorizada cuyo neto excede el techo disponible.

| Campo (testid) | Valor |
|---|---|
| Estimación (`select-estimacion`) | estimación 'autorizada' |
| Acción (`btn-generar-instruccion`) | clic |

> 🔴 **Esperado:** 409: neto > disponible bajo lock FOR UPDATE del techo (art. 24 LOPSRM); bloqueos UI «sin techo / excede techo» deshabilitan btn-generar-instruccion. No genera instrucción.

### ▢ PASO 33 — Convenio con variación de monto/plazo > 25% (art. 102) — AVISO, no bloquea (NEG-LEY-11) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Convenios · /contratos/modificatorios (HU-03) → SOP-2026-001 (con bitácora).

| Campo (testid) | Valor |
|---|---|
| Tipo (`cm-tipo`) | **plazo** |
| Plazo nuevo (`cm-plazo-nuevo`) | valor que sube el plazo +30% |
| Motivo (`cm-motivo`) | `Atraso justificado` |
| Oficio (`cm-oficio`) | `OF-2026-30` |

> 🔴 **Esperado:** Aviso aviso-sfp «revisión SFP art. 102 RLOPSRM» (informativo). El registro SÍ procede (art. 102 NO bloquea, es aviso). No es rechazo.

### ▢ PASO 34 — Autorizar convenio > 25% SIN oficio PDF cargado (art. 102) (NEG-LEY-12) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Convenios · /contratos/modificatorios (HU-03) → SOP-2026-001, sobre convenio 'registrado' con variación >25% sin oficio adjunto.

| Campo (testid) | Valor |
|---|---|
| Autorizar (`conv-autorizar-{id}`) | clic (sin haber subido `conv-oficio-subir-{id}`) |

> 🔴 **Esperado:** 409: guardrail art. 102 exige el oficio de aprobación YA cargado para autorizar variación >25% (convenios.controller.js:405-409). No autoriza.

### ▢ PASO 35 — Emitir NOTA en contrato CERRADO (art. 64) — gate correcto (NEG-LEY-13) — HU-09
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Bitácora · /bitacora/notas (HU-09) → PRUEBA-HU-17 (estado='cerrado').

| Campo (testid) | Valor |
|---|---|
| Tipo (`select-tipo`) | **res_suspension** |
| Contenido (`input-contenido`) | `Acto posterior al cierre` |

> 🔴 **Esperado:** 409 «El contrato ya está cerrado (finiquito elaborado); no se emiten notas… (art. 64 LOPSRM)». Bloqueado correctamente.

### ▢ PASO 36 — EDITAR garantía en contrato CERRADO (art. 64) (NEG-LEY-14) — HU-02
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Fianzas · /contratos/fianzas (HU-02) → SOP-2026-010 (estado='cerrado'); modal póliza editar.

| Campo (testid) | Valor |
|---|---|
| Afianzadora (`mp-afianzadora`) | `Afianzadora Nueva` |
| Monto (`mp-monto-edit`) | `12345` |
| Vigencia (`mp-vigencia`) | `2027-12-31` |
| Guardar | PUT /garantias/:id |

> 🔴 **Esperado:** DEBERÍA: 409 solo-lectura, no se edita la garantía de un contrato finiquitado (art. 64 LOPSRM). [BUG CONOCIDO #5: hoy NO bloquea — editarGarantia devuelve 200 y persiste el cambio].

### ▢ PASO 37 — SUBIR PDF de póliza en contrato CERRADO (art. 64) (NEG-LEY-15) — HU-02
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Fianzas · /contratos/fianzas (HU-02) → SOP-2026-010 (cerrado); botón subir PDF de la póliza.

| Campo (testid) | Valor |
|---|---|
| PDF póliza (`mp-pdf-poliza`) | `poliza_test.pdf` (PDF válido) (POST /garantias/:id/pdf) |

> 🔴 **Esperado:** DEBERÍA: 409 solo-lectura, no se sube el PDF de póliza tras el finiquito (art. 64 LOPSRM). [BUG CONOCIDO #5: hoy NO bloquea — subirPdfGarantia devuelve 201 y carga el PDF].

### ▢ PASO 38 — VINCULAR (responder) nota en contrato CERRADO (art. 64) (NEG-LEY-16) — HU-09
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Bitácora · /bitacora/notas (HU-09) → PRUEBA-HU-17 (cerrado); btn-responder-{numero} sobre una nota existente.

| Campo (testid) | Valor |
|---|---|
| Tipo (`select-tipo`) | **res_suspension** |
| Contenido (`input-contenido`) | `Respuesta post-cierre` (POST /bitacora/notas/:id/vincular) |

> 🔴 **Esperado:** DEBERÍA: 409 art. 64 (el cierre es solo-lectura; vincular inserta nota NUEVA igual que emitir). [BUG CONOCIDO #9: hoy NO bloquea — vincularNota devuelve 201 y crea nota nueva en el contrato finiquitado].

### ▢ PASO 39 — ANULAR la nota de FINIQUITO en contrato CERRADO (art. 64 + inmutabilidad) (NEG-LEY-17) — HU-09
- **Cuenta:** residente@sigecop.test (residente, emisor) · **Pantalla:** Bitácora · /bitacora/notas (HU-09) → PRUEBA-HU-17 (cerrado); btn-anular-{numero} sobre la nota tipo 'finiquito'.

| Campo (testid) | Valor |
|---|---|
| Corrección (`correccion`) | `dice/debe decir cerrado` |
| Confirmar (`btn-confirmar-anular-{numero}`) | clic (POST /bitacora/notas/:id/anular) |

> 🔴 **Esperado:** DEBERÍA: 409 — el contrato está cerrado (art. 64 LOPSRM) y la nota de finiquito es el acta de cierre, tan inmutable como la apertura. [BUG CONOCIDO #10: hoy NO bloquea — anularNota devuelve 201 y anula el acta de finiquito].

### ▢ PASO 40 — FIRMAR nota en contrato CERRADO (art. 64) (NEG-LEY-18) — HU-09
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** Bitácora · /bitacora/notas (HU-09) → PRUEBA-HU-17 (cerrado); btn-firmar-nota-{numero} sobre una nota 'emitida'. Acción de firma (POST /bitacora/notas/:id/firmar).

> 🔴 **Esperado:** DEBERÍA: 409 art. 64 (no se firman/aceptan notas en un contrato finiquitado). [BUG CONOCIDO #19: hoy NO bloquea — firmarNota permite firmar la nota en el contrato cerrado].

### ▢ PASO 41 — PAGAR una estimación 'autorizada' de un contrato CERRADO (art. 64) (NEG-LEY-19) — HU-21
- **Cuenta:** finanzas@sigecop.test (finanzas) · **Pantalla:** Pago · /pagos/registro (HU-21) → PRUEBA-HU-17 (cerrado, con est #2 'autorizada' no pagada).

| Campo (testid) | Valor |
|---|---|
| Estimación (`pago-estimacion`) | est #2 (autorizada) |
| Referencia SPEI (`pago-referencia-spei`) | `1234567890` |
| CFDI (`pago-cfdi`) | `CFDI-001` |
| Fecha factura (`pago-fecha-factura`) | `2026-06-20` |
| Registrar | POST /pagos |

> 🔴 **Esperado:** DEBERÍA: 409 — el contrato cerrado es solo-lectura, el saldo se liquida ÚNICAMENTE por el finiquito; pagar la est por separado es doble liquidación (art. 64 LOPSRM). [BUG CONOCIDO #2: hoy NO bloquea — registrarPago devuelve 201, paga $208,500 ya contemplados en el saldo del finiquito → doble liquidación].

### ▢ PASO 42 — Convenio: REDUCIR la cantidad de un concepto original (art. 118 / congelado) (NEG-LEY-20) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Convenios · /contratos/modificatorios (HU-03) → SOP-2026-001 (con bitácora); editor de catálogo.

| Campo (testid) | Valor |
|---|---|
| Tipo (`cm-tipo`) | **programa** |
| Cantidad concepto (`cm-concepto-cantidad-N`) | valor MENOR que lo ya estimado en un concepto original |

> 🔴 **Esperado:** 400/409: el concepto original está CONGELADO (cantidad/PU no cambian, 409) y no se reduce por debajo de lo ya estimado en estimaciones no rechazadas (400, art. 118 trata excedentes no reducciones). No registra.


---

## 3. Gates de rol (matriz de permisos) + deep-link

> Cuenta a usar la indicada por caso (pass común `Sigecop2026!`). Login: `#login-usuario`, `#login-password`, botón «Iniciar sesión»; si pide contrato, elige `OBRA-2026-PRUEBA-FINAL` en `modal-elegir-contrato` → `modal-contrato-<id>`. El gate vive en dos capas: la guarda de ruta (`App.jsx:62`, `nivelDe(hu,rol)===null` → `<Navigate to="/" replace />`) y `<SoloRol>` (App.jsx:71). Estos casos verifican que el rol equivocado **NO** pueda ejecutar la acción. Base: `frontend/src/data/permisos.js` (E=edita, C=consulta, null=sin acceso).

### ▢ PASO 43 — Deep-link a Alta con rol sin acceso (finanzas=null) (NEG-ROL-01) — HU-01
- **Cuenta:** finanzas@sigecop.test · **Pantalla:** Barra de URL → `http://localhost:5173/contratos/alta` (sin captura; navegación directa por URL).

> 🔴 **Esperado:** HU-01 finanzas=null (permisos.js:12). La guarda redirige a Inicio `/` (sin error, `<Navigate to="/">`). NO aparece el wizard de alta.

### ▢ PASO 44 — Finanzas intenta dar de alta contrato desde el modal (NEG-ROL-02) — HU-01
- **Cuenta:** finanzas@sigecop.test · **Pantalla:** Sidebar → entrar a una pantalla de contrato → `modal-elegir-contrato` (observar botones del modal).

> 🔴 **Esperado:** El modal NO ofrece `modal-contrato-crear` ni `modal-contrato-crear-footer` (solo roles HU-01 nivel 'E' = residente). El sidebar tampoco muestra «Alta de contratos» para finanzas.

### ▢ PASO 45 — Contratista intenta autorizar/rechazar estimación (NEG-ROL-03) — HU-15
- **Cuenta:** contratista@sigecop.test · **Pantalla:** URL → `http://localhost:5173/estimaciones/revision` (navegación directa).

> 🔴 **Esperado:** HU-15 contratista=null (permisos.js:29). Redirige a Inicio `/`. NO se ve el panel de resolución (`btn-autorizar`/`btn-rechazar` ausentes).

### ▢ PASO 46 — Supervisión NO autoriza directo: solo observa/turna (NEG-ROL-04) — HU-15
- **Cuenta:** supervision@sigecop.test · **Pantalla:** Sidebar → «Ciclo de estimación» → pestaña `pestana-revision` (`/estimaciones/revision`), contrato `OBRA-2026-PRUEBA-FINAL` (en la estimación: intentar resolver).

> 🔴 **Esperado:** HU-15 supervision='E' pero su acto es **turnar** a residencia (`btn-turnar`/observación), NO autorizar. La autorización/rechazo (`btn-autorizar`/`btn-rechazar`) es exclusiva de residente; supervisión no la ve.

### ▢ PASO 47 — Contratista intenta crear convenio modificatorio (NEG-ROL-05) — HU-03
- **Cuenta:** contratista@sigecop.test · **Pantalla:** URL → `http://localhost:5173/contratos/modificatorios` (navegación directa).

> 🔴 **Esperado:** HU-03 contratista='C' (consulta, permisos.js:14). Entra en SOLO-LECTURA: el formulario de captura del convenio está deshabilitado; el botón de registrar convenio no aparece/está disabled (crear es nivel 'E' = solo dependencia/residente).

### ▢ PASO 48 — Supervisión intenta crear convenio (también es solo 'C') (NEG-ROL-06) — HU-03
- **Cuenta:** supervision@sigecop.test · **Pantalla:** URL → `http://localhost:5173/contratos/modificatorios`, contrato `SOP-2026-001` (tiene convenio v1/v2) (intentar registrar convenio).

> 🔴 **Esperado:** HU-03 supervision='C' (permisos.js:14). Solo-lectura: puede consultar el convenio v1/v2 pero NO registrar uno nuevo (crear=dependencia/residente). Backend POST /api/convenios/contrato/:id → 403 si forzara la llamada.

### ▢ PASO 49 — Finanzas NO integra estimación (NEG-ROL-07) — HU-12
- **Cuenta:** finanzas@sigecop.test · **Pantalla:** URL → `http://localhost:5173/estimaciones/integracion` (navegación directa).

> 🔴 **Esperado:** HU-12 finanzas=null (permisos.js:23). Redirige a Inicio `/`. No aparece el wizard de integración (`wpaso-periodo`…).

### ▢ PASO 50 — Finanzas NO presenta estimación (NEG-ROL-08) — HU-13
- **Cuenta:** finanzas@sigecop.test · **Pantalla:** URL → `http://localhost:5173/estimaciones/envio` (navegación directa).

> 🔴 **Esperado:** HU-13 finanzas=null (permisos.js:27). Redirige a Inicio `/`. El botón `btn-presentar-${e.id}` no es alcanzable.

### ▢ PASO 51 — Contratista intenta aprobar solicitudes de registro (NEG-ROL-09) — HU-23
- **Cuenta:** contratista@sigecop.test · **Pantalla:** URL → `http://localhost:5173/usuarios/solicitudes` (navegación directa).

> 🔴 **Esperado:** `<SoloRol roles={['dependencia']}>` (App.jsx:139). Redirige a Inicio `/`. NO se ve la bandeja (`btn-aprobar`/`btn-rechazar` ausentes).

### ▢ PASO 52 — Residente intenta entrar al Padrón de empresas (NEG-ROL-10) — HU-23
- **Cuenta:** residente@sigecop.test · **Pantalla:** URL → `http://localhost:5173/admin/empresas` (navegación directa).

> 🔴 **Esperado:** `<SoloRol roles={['dependencia']}>` (App.jsx:132). Redirige a Inicio `/`. NO se ven `tab-padron`/`validar-<id>`/`fusionar-<id>`.

### ▢ PASO 53 — Contratista intenta entrar a Roster / sustitución (NEG-ROL-11) — HU-22
- **Cuenta:** contratista@sigecop.test · **Pantalla:** URL → `http://localhost:5173/contratos/roster` (navegación directa).

> 🔴 **Esperado:** `<SoloRol roles={['dependencia','residente']}>` (App.jsx:142). Redirige a Inicio `/`. Sustitución de personas no accesible.

### ▢ PASO 54 — Finanzas intenta firmar/aperturar bitácora (NEG-ROL-12) — HU-08
- **Cuenta:** finanzas@sigecop.test · **Pantalla:** URL → `http://localhost:5173/bitacora/ambiente` (navegación directa).

> 🔴 **Esperado:** HU-08 finanzas=null; `<SoloRol roles={['residente','contratista','supervision']}>` (App.jsx:112). Redirige a Inicio `/`. No accede al wizard de apertura.

### ▢ PASO 55 — Finanzas firma una apertura de bitácora sin ser firmante (deep-link a Por firmar) (NEG-ROL-13) — HU-08
- **Cuenta:** finanzas@sigecop.test · **Pantalla:** URL → `http://localhost:5173/bitacora/por-firmar` (intentar `btn-firmar` en fila `fila-por-firmar[data-folio="OBRA-2026-PRUEBA-FINAL"]`).

> 🔴 **Esperado:** `<SoloRol roles={['residente','contratista','supervision']}>` (App.jsx:85). Redirige a Inicio `/`; finanzas no está en la terna de firmantes. Si forzara POST /bitacora/.../firmar → 403 (no es firmante).

### ▢ PASO 56 — Contratista intenta dar tránsito a pago / registrar pago (NEG-ROL-14) — HU-21
- **Cuenta:** contratista@sigecop.test · **Pantalla:** URL → `http://localhost:5173/pagos/registro` (navegación directa).

> 🔴 **Esperado:** HU-21 contratista=null (permisos.js:35). Redirige a Inicio `/`. El registro de pago es exclusivo de finanzas; `btn-registrar-pago` no alcanzable.

### ▢ PASO 57 — Dependencia intenta registrar avance físico (NEG-ROL-15) — HU-06
- **Cuenta:** dependencia@sigecop.test · **Pantalla:** URL → `http://localhost:5173/seguimiento/trabajos-terminados` (navegación directa).

> 🔴 **Esperado:** HU-06 dependencia=null (permisos.js:17); `<SoloRol roles={['contratista','residente','supervision']}>` (avance, App.jsx:127). Redirige a Inicio `/`. `btn-registrar-avance` no aparece.

### ▢ PASO 58 — Supervisión intenta finiquitar/cerrar el contrato (NEG-ROL-16) — HU-24
- **Cuenta:** supervision@sigecop.test · **Pantalla:** URL → `http://localhost:5173/contratos/finiquito` (navegación directa).

> 🔴 **Esperado:** `<SoloRol roles={['dependencia','residente']}>` (App.jsx:105). Redirige a Inicio `/`. Supervisión no cierra contratos. **[BUG CONOCIDO #7: el backend NO acota finiquito por empresa — una dependencia de OTRA empresa SÍ puede leer/cerrar el finiquito por id directo (GET/POST /api/finiquito/contrato/:id, fail-open); el front bloquea por rol pero el endpoint no por empresa]**.

### ▢ PASO 59 — Dependencia (ya autenticada) cambia el rol de un usuario YA ACTIVO vía aprobar (NEG-ROL-17) — HU-23
- **Cuenta:** dependencia@sigecop.test · **Pantalla:** Bandeja `Solicitudes de registro` (`/usuarios/solicitudes`); o PATCH directo /api/usuarios/1/aprobar.

| Campo (testid) | Valor |
|---|---|
| Rol (`select-rol`) | **finanzas** sobre `residente@sigecop.test` (id=1, estado='activo') |

> 🔴 **Esperado:** La UI solo lista pendientes, así que no debería poder cambiar a un activo; el backend debería exigir estado='pendiente' (404/409). **[BUG CONOCIDO #13: hoy NO valida estado — PATCH /api/usuarios/1/aprobar {rol:'finanzas'} sobre un usuario activo devuelve 200 y le cambia el rol; falta `AND estado='pendiente'`. No alcanzable desde la UI, solo por PATCH manual]**.

### ▢ PASO 60 — Finanzas intenta ver el Tablero de estimaciones (NEG-ROL-18) — HU-17
- **Cuenta:** finanzas@sigecop.test · **Pantalla:** URL → `http://localhost:5173/estimaciones/tablero` (navegación directa).

> 🔴 **Esperado:** HU-17 finanzas=null (permisos.js:31). Redirige a Inicio `/`. Finanzas no ve Tablero (ni en sidebar).

### ▢ PASO 61 — Dependencia intenta entrar a la Curva de avance (NEG-ROL-19) — HU-05
- **Cuenta:** dependencia@sigecop.test · **Pantalla:** URL → `http://localhost:5173/seguimiento/curva-avance` (navegación directa).

> 🔴 **Esperado:** El grupo Avance está gated a `[contratista,residente,supervision]` (App.jsx:127); HU-05 NO se promueve a dependencia. Redirige a Inicio `/`. La curva no es accesible para dependencia.


---

## 4. Gates de estado + inmutabilidad

> Casos NEGATIVOS (el sistema debe RECHAZAR o BLOQUEAR). Login en `#login-usuario` / `#login-password` (pass común `Sigecop2026!`). Al entrar a una pantalla de contrato sale `modal-elegir-contrato` → elige `modal-contrato-<id>` (se hereda en `banner-contrato-activo`). Donde un gate hoy falta, el "Resultado esperado" indica el comportamiento correcto y luego `[BUG CONOCIDO #N]`.

### ▢ PASO 62 — Re-presentar una estimación ya 'enviada' (NEG-ESTADO-01) — HU-13
- **Cuenta:** contratista@sigecop.test (contratista/superintendente) · **Pantalla:** Presentación de la estimación · `/estimaciones/envio` → modal elige PRUEBA-HU-13 (id 6937); pestaña Presentar.

| Campo (testid) | Valor |
|---|---|
| Presentar (`btn-presentar-{id}`) | acción sobre una estimación ya en estado 'enviada' |

> 🔴 **Esperado:** El botón `btn-presentar-{id}` solo aparece si estado='integrada'; sobre una 'enviada'/'autorizada'/'pagada' NO se ofrece, y el backend rechaza re-presentar con 409 (estimaciones-ciclo.controller.js: solo desde 'integrada', art. 54 LOPSRM).

### ▢ PASO 63 — Autorizar estimación SIN turnado de supervisión (NEG-ESTADO-02) — HU-15
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Recepción/revisión · `/estimaciones/revision` → modal elige PRUEBA-HU-15 (id 6939); `select-estimacion` una estimación 'enviada' no turnada.

| Campo (testid) | Valor |
|---|---|
| Autorizar residencia (`btn-autorizar`) | (acción sobre estimación no turnada) |

> 🔴 **Esperado:** Botón `btn-autorizar` deshabilitado (`puedeResolver` exige turnada); por API 409 'turnado previo obligatorio' (residencia exige EXISTS turnado_a='residencia', art. 54 LOPSRM). El flujo es secuencial supervisión→turna→residencia.

### ▢ PASO 64 — Rechazar como residencia una estimación NO turnada (NEG-ESTADO-03) — HU-15
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/estimaciones/revision` → PRUEBA-HU-15 (6939); `select-estimacion` 'enviada' no turnada.

| Campo (testid) | Valor |
|---|---|
| Motivo rechazo (`motivo-rechazo`) | `Generadores incompletos` |
| Rechazar (`btn-rechazar`) | (acción) |

> 🔴 **Esperado:** `btn-rechazar` deshabilitado sin turnado; backend 409 (residencia exige turnado previo). Solo supervisión puede rechazar directo sin turnar (`motivo-rechazo-supervision`).

### ▢ PASO 65 — Turnar a residencia sin marcar 'sin observaciones' ni capturar ninguna (NEG-ESTADO-04) — HU-15
- **Cuenta:** supervision@sigecop.test (supervisión) · **Pantalla:** `/estimaciones/revision` → PRUEBA-HU-15 (6939); estimación 'enviada' no turnada, cero observaciones.

| Campo (testid) | Valor |
|---|---|
| Sin observaciones (`chk-sin-observaciones`) | desmarcado |
| Turnar (`btn-turnar`) | (acción) |

> 🔴 **Esperado:** `btn-turnar` deshabilitado (`puedeTurnar = totalObs>0 OR sinObservaciones`); backend 409 'turnar requiere n>0 o sin_observaciones=true' (estimaciones-ciclo.controller.js:459-462).

### ▢ PASO 66 — Pagar una estimación que NO está 'autorizada' (NEG-ESTADO-05) — HU-21
- **Cuenta:** finanzas@sigecop.test (finanzas) · **Pantalla:** Registro de pago · `/pagos/registro` → modal elige PRUEBA-HU-13 (6937); `pago-estimacion`.

| Campo (testid) | Valor |
|---|---|
| Estimación (`pago-estimacion`) | estimación en estado 'enviada'/'integrada' |

> 🔴 **Esperado:** El selector `pago-estimacion` solo lista estado='autorizada' (PAGABLES); una no-autorizada no aparece. Por API 409 'SOLO autorizada' (pagos.controller.js:76, art. 54 LOPSRM).

### ▢ PASO 67 — Pagar dos veces la MISMA estimación 'autorizada' (NEG-ESTADO-06) — HU-21
- **Cuenta:** finanzas@sigecop.test (finanzas) · **Pantalla:** `/pagos/registro` → contrato con estimación 'autorizada' ya pagada; intentar registrar pago de nuevo.

| Campo (testid) | Valor |
|---|---|
| Estimación (`pago-estimacion`) | estimación ya 'pagada' |
| Referencia (`pago-referencia`) | `1234567` |
| CFDI (`pago-cfdi`) | `UUID` |
| Fecha (`pago-fecha`) | `hoy` |
| Fecha factura (`pago-fecha-factura`) | `hoy` |

> 🔴 **Esperado:** Estimación 'pagada' no aparece en `pago-estimacion`; por API 409 'NO pagada' / no-doble-pago (UNIQUE + FOR UPDATE, pagos.controller.js:70,78,128).

### ▢ PASO 68 — Pagar una estimación 'autorizada' de un contrato YA CERRADO (NEG-ESTADO-07) — HU-21
- **Cuenta:** finanzas@sigecop.test (finanzas) · **Pantalla:** `/pagos/registro` → modal elige PRUEBA-HU-17 (id 6941, estado='cerrado'); `pago-estimacion` la est #2 'autorizada'.

| Campo (testid) | Valor |
|---|---|
| Estimación (`pago-estimacion`) | est #2 (autorizada, no pagada) |
| Referencia (`pago-referencia`) | `1234567890` |
| CFDI (`pago-cfdi`) | `UUID` |
| Fecha (`pago-fecha`) | `hoy` |
| Fecha factura (`pago-fecha-factura`) | `hoy` |

> 🔴 **Esperado:** El contrato cerrado es solo-lectura (art. 64 LOPSRM): el saldo se liquida SOLO por el finiquito; pagar la est #2 por separado debe rechazarse 409. **[BUG CONOCIDO #2 y #12: hoy NO bloquea — el form lista la estimación y el backend acepta el pago (201), causando doble liquidación del mismo saldo]**.

### ▢ PASO 69 — Generar instrucción de pago (tránsito) sobre un contrato cerrado (NEG-ESTADO-08) — HU-20
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** Tránsito a pago · `/pagos/transito` → modal elige PRUEBA-HU-17 (6941, cerrado); `select-estimacion` est autorizada; paso 3.

| Campo (testid) | Valor |
|---|---|
| Estimación (`select-estimacion`) | est #2 autorizada |
| Generar instrucción (`btn-generar-instruccion`) | (acción) |

> 🔴 **Esperado:** 409 'El contrato ya está cerrado… no se generan nuevas instrucciones de pago (art. 64 LOPSRM)' (instruccion-pago.controller.js:286). Este gate SÍ existe (contraste con el pago directo de NEG-ESTADO-07).

### ▢ PASO 70 — Finiquitar un contrato SIN bitácora aperturada (NEG-ESTADO-09) — HU-24
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Finiquito · `/contratos/finiquito` → modal elige un contrato PRUEBA-HU sin bitácora abierta.

| Campo (testid) | Valor |
|---|---|
| Abrir cierre (`btn-abrir-cierre`) | (acción) |

> 🔴 **Esperado:** Botón `btn-abrir-cierre` deshabilitado (`disabled={!data.tiene_bitacora}`, banner `finiquito-sin-bitacora`); por API 409 'Abre la bitácora… antes' (finiquito.controller.js:120-121).

### ▢ PASO 71 — Finiquitar dos veces el mismo contrato (NEG-ESTADO-10) — HU-24
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** `/contratos/finiquito` → modal elige PRUEBA-HU-17 (6941, ya cerrado); `btn-abrir-cierre` → `btn-confirmar-cierre`.

| Campo (testid) | Valor |
|---|---|
| Ajustes (`finiquito-ajustes`) | `0.00` |
| Confirmar cierre (`btn-confirmar-cierre`) | (acción) |

> 🔴 **Esperado:** 409 'El contrato ya está cerrado' / 'Este contrato ya tiene finiquito' (1 por contrato, finiquito.controller.js:116-118, art. 172 RLOPSRM). El formulario de cierre no debe mostrarse en un contrato cerrado.

### ▢ PASO 72 — Reingresar una estimación que NO está 'rechazada' (NEG-ESTADO-11) — HU-16
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** Reingreso · `/estimaciones/reingreso` → modal elige un contrato con estimación 'autorizada'; `select-estimacion`.

| Campo (testid) | Valor |
|---|---|
| Estimación (`select-estimacion`) | estimación 'autorizada' |

> 🔴 **Esperado:** El selector `select-estimacion` solo lista 'rechazada' sin reingreso previo; por API 409 'solo estado rechazada' (estimaciones-ciclo.controller.js:671-685).

### ▢ PASO 73 — Reingresar dos veces la MISMA estimación rechazada (NEG-ESTADO-12) — HU-16
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** `/estimaciones/reingreso` → modal elige PRUEBA-HU-16 (id 6940); `select-estimacion` la rechazada que ya tiene reingreso.

| Campo (testid) | Valor |
|---|---|
| Estimación (`select-estimacion`) | est rechazada con reemplaza_a existente |
| Nota (`textarea-nota`) | `atendido` |
| Confirmado (`chk-confirmado`) | marcado |
| Reingresar (`btn-reingresar`) | (acción) |

> 🔴 **Esperado:** La rechazada que ya tiene reingreso NO aparece en `select-estimacion`; por API 409 (unicidad 1 rechazada→1 reingreso, UNIQUE reemplaza_a, estimaciones-ciclo.controller.js).

### ▢ PASO 74 — Editar/borrar un avance ya registrado de forma directa (NEG-INMUT-13) — HU-06
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** Trabajos terminados · `/seguimiento/trabajos-terminados` → modal elige SOP-2026-001; sobre una fila de avance existente.

| Campo (testid) | Valor |
|---|---|
| Editar/eliminar fila original | intento PATCH/DELETE /api/trabajos/:id |

> 🔴 **Esperado:** No existe edición/borrado directo: PATCH/DELETE eliminados. Corregir = `POST /api/trabajos/:id/corregir` que ANULA la original (estado vigente→anulada, trigger `sigecop_avance_inmutable`) y crea una vigente vinculada (reemplaza_a) + nota 'dice/debe decir' (art. 123 fr. VI/VII RLOPSRM).

### ▢ PASO 75 — Registrar avance en un contrato cerrado (NEG-INMUT-14) — HU-06
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** `/seguimiento/trabajos-terminados` → modal elige PRUEBA-HU-17 (6941, cerrado).

| Campo (testid) | Valor |
|---|---|
| Concepto (`cap-concepto`) | un concepto |
| Periodo (`cap-periodo`) | periodo vencido |
| Cantidad (`cap-cantidad`) | `5` |
| Foto evidencia (`cap-foto-evidencia`) | JPG |

> 🔴 **Esperado:** 409 'El contrato ya está cerrado…' (art. 64 LOPSRM, trabajos.controller.js:249-253). El avance es append-only y un contrato cerrado es solo-lectura.

### ▢ PASO 76 — Abrir una SEGUNDA bitácora del mismo contrato (NEG-INMUT-15) — HU-08
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Apertura de bitácora · `/bitacora/apertura` → modal elige SOP-2026-001 (que ya tiene bitácora abierta).

| Campo (testid) | Valor |
|---|---|
| Fecha apertura (`input-fecha-apertura`) | fecha inicio |
| Metadatos (`md-*`) | completos |
| Aperturar (`btn-aperturar`) | (acción) |

> 🔴 **Esperado:** 409 (código 23505) 'Ya existe una bitácora para este contrato' (UNIQUE por contrato, bitacora.controller.js). La apertura es única e inmutable (art. 122-123 RLOPSRM).

### ▢ PASO 77 — Emitir manualmente la nota tipo 'apertura' (folio #1) (NEG-INMUT-16) — HU-09
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Emisión de notas · `/bitacora/notas` → modal elige SOP-2026-001; `select-tipo`.

| Campo (testid) | Valor |
|---|---|
| Tipo (`select-tipo`) | **apertura** |
| Contenido (`input-contenido`) | `texto` |
| Emitir (`btn-emitir`) | (acción) |

> 🔴 **Esperado:** 'apertura' no aparece en `select-tipo` (catálogo filtra clave!=='apertura'); por API 400 'no se emite a mano' (bitacora.controller.js:548). La nota #1 la genera la apertura, no el usuario.

### ▢ PASO 78 — Anular la nota de APERTURA (folio #1) (NEG-INMUT-17) — HU-09
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/bitacora/notas` → modal elige SOP-2026-001; sobre la nota #1 'apertura'.

| Campo (testid) | Valor |
|---|---|
| Anular nota #1 (`btn-anular-1`) | (no debe existir) / POST /api/bitacora/notas/:id/anular sobre la apertura |

> 🔴 **Esperado:** 403 'La nota de apertura (folio #1) no puede anularse' (bitacora.controller.js:774). La apertura es inmutable (art. 123 fr. VI RLOPSRM).

### ▢ PASO 79 — Anular como emisor una nota YA FIRMADA/aceptada por la contraparte (NEG-INMUT-18) — HU-09
- **Cuenta:** residente@sigecop.test (emisor) + contratista@sigecop.test (firma) · **Pantalla:** `/bitacora/notas` → modal elige PRUEBA-HU-09; emitir nota como residente → contratista la firma (`btn-firmar-nota-{n}`) → residente intenta `btn-anular-{n}`.

| Campo (testid) | Valor |
|---|---|
| Confirmar anular (`btn-confirmar-anular-{n}`) | (acción) |
| Corrección | `dice/debe decir…` |

> 🔴 **Esperado:** 409: una nota aceptada por la contraparte (firma en `bitacora_nota_firmas`) NO puede anularse, inclusive por el emisor original (art. 123 fr. VI RLOPSRM; la anulación fr. VII es solo ANTES de la firma). **[BUG CONOCIDO #8: hoy SÍ pasa (201) — anularNota no consulta `bitacora_nota_firmas`, solo respuestas vinculadas]**.

### ▢ PASO 80 — Anular la nota de FINIQUITO (acta de cierre) en un contrato cerrado (NEG-INMUT-19) — HU-09
- **Cuenta:** residente@sigecop.test (emisor del finiquito) · **Pantalla:** `/bitacora/notas` → modal elige PRUEBA-HU-17 (6941, cerrado); sobre la nota tipo 'finiquito'.

| Campo (testid) | Valor |
|---|---|
| Anular | POST /api/bitacora/notas/:id/anular |
| Corrección | `…` |

> 🔴 **Esperado:** 409 doble: (a) contrato cerrado solo-lectura (art. 64 LOPSRM) y (b) la nota de finiquito es el acta de cierre, tan inmutable como la apertura. **[BUG CONOCIDO #10: hoy SÍ pasa (201) — anularNota no llama gateCierre ni protege el tipo 'finiquito']**.

### ▢ PASO 81 — Crear una nota NUEVA por la ruta 'vincular' en un contrato cerrado (NEG-INMUT-20) — HU-09
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/bitacora/notas` → modal elige PRUEBA-HU-17 (6941, cerrado); `btn-responder-{n}` sobre una nota existente.

| Campo (testid) | Valor |
|---|---|
| Tipo (`select-tipo`) | **res_suspension** |
| Contenido (`input-contenido`) | `nota nueva` |
| Enviar respuesta (vincular) | (acción) |

> 🔴 **Esperado:** 409 'contrato cerrado… no se vinculan notas' (art. 64 LOPSRM): vincular inserta una nota nueva igual que emitir, debe bloquearse. **[BUG CONOCIDO #9: hoy SÍ pasa (201) — vincularNota no invoca gateCierre, evade el gate que sí aplica emitirNota]**.

### ▢ PASO 82 — Firmar/aceptar una nota en un contrato cerrado (NEG-INMUT-21) — HU-09
- **Cuenta:** contratista@sigecop.test (contraparte) · **Pantalla:** `/bitacora/notas` → modal elige PRUEBA-HU-17 (6941, cerrado); `btn-firmar-nota-{n}` sobre una nota 'emitida'.

| Campo (testid) | Valor |
|---|---|
| Firmar nota (`btn-firmar-nota-{n}`) | (acción) |

> 🔴 **Esperado:** 409 coherente con el gate de cierre (art. 64 LOPSRM): aceptar es una mutación append (`bitacora_nota_firmas`) que el resto del dominio bloquea en contrato cerrado. **[BUG CONOCIDO #19: hoy SÍ pasa (201) — firmarNota no invoca gateCierre, inconsistente con emitir/minuta/visita que sí dan 409]**.

### ▢ PASO 83 — Emitir manualmente una nota tipo 'cierre' a mano (NEG-INMUT-22) — HU-09
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/bitacora/notas` → modal elige SOP-2026-002; `select-tipo`.

| Campo (testid) | Valor |
|---|---|
| Tipo (`select-tipo`) | **cierre** |
| Contenido (`input-contenido`) | `texto` |
| Emitir (`btn-emitir`) | (acción) |

> 🔴 **Esperado:** El tipo 'cierre' (asiento del sistema) no debe poder emitirse a mano, igual que 'apertura' está protegida. **[BUG CONOCIDO #21: hoy NO está protegido — la apertura sí, pero el 'cierre' se puede emitir manualmente]**.

### ▢ PASO 84 — Editar la garantía de un contrato CERRADO (NEG-INMUT-23) — HU-02
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Registro de fianzas · `RegistroFianzas` (HU-02) → modal elige SOP-2026-010 (cerrado); editar una póliza existente.

| Campo (testid) | Valor |
|---|---|
| Afianzadora (`mp-afianzadora`) | `Otra Afianzadora` |
| Monto (`mp-monto`) | `12345` |
| Guardar | PUT /api/garantias/:id |

> 🔴 **Esperado:** 409 'el contrato ya está cerrado… no se edita la garantía' (art. 64 LOPSRM): crear/endosar ya devuelven 409, editar y subir-PDF también deberían. **[BUG CONOCIDO #5: hoy editarGarantia (PUT) y subirPdfGarantia NO están gateados → 200/201 en contrato cerrado]**.

### ▢ PASO 85 — Modificar la carátula/montos de una estimación YA integrada (NEG-INMUT-24) — HU-12
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** Integración · `/estimaciones/integracion` → modal elige un contrato con estimación ya 'integrada'.

| Campo (testid) | Valor |
|---|---|
| Re-integrar/alterar generadores o deductivas | intento sobre una estimación existente |

> 🔴 **Esperado:** La estimación integrada es append-only (trigger `sigecop_estimacion_inmutable`): no se editan carátula/generadores/notas; corregir tras rechazo = reingreso (HU-16) con fila nueva. El wizard no expone edición de una integrada.

### ▢ PASO 86 — Registrar un convenio modificatorio sobre un contrato cerrado (NEG-INMUT-25) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Convenios · `/contratos/modificatorios` → modal elige PRUEBA-HU-17 (6941, cerrado).

| Campo (testid) | Valor |
|---|---|
| Tipo (`cm-tipo`) | **plazo** |
| Plazo nuevo (`cm-plazo-nuevo`) | `200` |
| Motivo (`cm-motivo`) | `dictamen` |
| Oficio (`cm-oficio`) | `OF-001` |
| Registrar convenio (`btn-registrar-convenio`) | (acción) |

> 🔴 **Esperado:** 409 'El contrato ya está cerrado… no se registran convenios' (art. 64 LOPSRM, convenios.controller.js:166). Este gate SÍ existe (contraste con bitácora/garantías/pago donde falta).


---

## 5. Sesión única · Casos de borde · Gates que faltan (bugs)

> Todos los casos son 🔴 negativos: el sistema debe RECHAZAR, BLOQUEAR o AVISAR. Login: `#login-usuario` / `#login-password` / botón «Iniciar sesión» (pass común `Sigecop2026!`). Al entrar a una pantalla de contrato sale `modal-elegir-contrato` → elige con `modal-contrato-<id>` (se hereda en `banner-contrato-activo`). Donde un gate legal HOY no bloquea, el «Resultado esperado» lo indica con **[BUG CONOCIDO #N]**.

### ▢ PASO 87 — Sesión única: el segundo login de la MISMA cuenta invalida el token del primero (NEG-BORDE-01)
- **Cuenta:** `contratista@sigecop.test` (contratista) en 2 pestañas/navegadores · **Pantalla:** Pestaña A: login y entra a cualquier pantalla (sidebar → «Bitácora»). Pestaña B: login con la MISMA cuenta. Vuelve a A y dispara un request (recargar lista / cambiar contrato).

| Campo (testid) | Valor |
|---|---|
| A: Correo (`#login-usuario`) | `contratista@sigecop.test` |
| A: Contraseña (`#login-password`) | `Sigecop2026!` |
| B: idéntico (segundo login) | (mismas credenciales) |

> 🔴 **Esperado:** El segundo login emite JWT con `tv` (token_version) incrementado; el token de la pestaña A queda inválido → al siguiente request A recibe **401** y es expulsada a login (last-login-wins, auth.controller.js incrementa token_version).

### ▢ PASO 88 — Sesión única: token de sesión vieja rechazado tras re-login (verificación cruzada de rol) (NEG-BORDE-02)
- **Cuenta:** `dependencia@sigecop.test` (dependencia) · **Pantalla:** Login en pestaña A → abre «Solicitudes de registro» (`/usuarios/solicitudes`). Re-login en pestaña B con la misma cuenta. En A pulsa Aprobar/recargar.

| Campo (testid) | Valor |
|---|---|
| A primer login; B segundo login (mismo email) | (mismas credenciales) |

> 🔴 **Esperado:** El request de A devuelve **401** (token_version desfasado), no 200; la acción NO se ejecuta con el token viejo.

### ▢ PASO 89 — Anticipo EXACTAMENTE 30% NO exige PDF, pero 31% SÍ lo exige y bloquea el guardado (NEG-BORDE-03) — HU-01
- **Cuenta:** `residente@sigecop.test` (residente) · **Pantalla:** Alta de contrato (`/contratos/alta`, ruta libre, sin modal) → Paso 5 Garantías.

| Campo (testid) | Valor |
|---|---|
| Anticipo (`anticipo-input`) | `31` (sin subir PDF) |

> 🔴 **Esperado:** Aparece `anticipo-pdf-uploader` con `anticipo-pdf-requerido`: «sin este PDF no se puede avanzar ni guardar (anticipo > 30%, art. 50 fr. IV LOPSRM)»; el wizard queda bloqueado hasta `anticipo-pdf-input` → `anticipo-pdf-pendiente-file` → `anticipo-pdf-ok`. Con `anticipo-input` → `30` NO se exige PDF (umbral es `> 30`).

### ▢ PASO 90 — Convenio de plazo +25% EXACTO no levanta aviso SFP; +26% sí lo levanta (art. 102) (NEG-BORDE-04) — HU-03
- **Cuenta:** `dependencia@sigecop.test` (dependencia) · **Pantalla:** «Convenios» (`/contratos/modificatorios`) sobre `SOP-2026-002` (plazo vigente 90) → tipo Plazo.

| Campo (testid) | Valor |
|---|---|
| Tipo (`cm-tipo`) | **Plazo** |
| Plazo nuevo (`cm-plazo-nuevo`) | `113` (90→113 = +25.5%) |
| Motivo (`cm-motivo`) | `Ampliación por causa justificada (art. 99 RLOPSRM)` |
| Oficio (`cm-oficio`) | `OF-SFP-001` |

> 🔴 **Esperado:** A >25% el convenio se registra **con AVISO** `aviso-sfp` / `badge-sfp-<id>` (NO bloquea el registro); al **Autorizar** sin oficio adjunto → **409** «…art. 102… carga el oficio…». A exactamente +25% (`cm-plazo-nuevo`=`112.5` no aplica en días; usa 90→112 ≈ +24.4% para quedar bajo umbral) NO aparece `badge-sfp`.

### ▢ PASO 91 — Autorizar convenio >25% SIN oficio adjunto se bloquea (art. 102) (NEG-BORDE-05) — HU-03
- **Cuenta:** `dependencia@sigecop.test` (dependencia) · **Pantalla:** «Convenios» → fila del convenio recién registrado con +33% (plazo `120`).

| Campo (testid) | Valor |
|---|---|
| Autorizar (`conv-autorizar-<id>`) | clic sin haber subido oficio |

> 🔴 **Esperado:** **409** «…art. 102… carga el oficio…»; tras `conv-oficio-subir-<id>` (PDF) y reintentar → `conv-badge-autorizado-…` (Autorizado).

### ▢ PASO 92 — Oficio de autorización del convenio en formato NO-PDF se rechaza (NEG-BORDE-06) — HU-03
- **Cuenta:** `dependencia@sigecop.test` (dependencia) · **Pantalla:** «Convenios» → `conv-oficio-subir-<id>` del convenio >25%.

| Campo (testid) | Valor |
|---|---|
| Oficio (`conv-oficio-subir-<id>`) | archivo `.jpg` |

> 🔴 **Esperado:** Toast «El oficio debe ser un PDF»; el oficio no se carga; un 2º oficio sobre el mismo convenio → **409** (inmutable, append-only).

### ▢ PASO 93 — Autorizar convenio sin ser dependencia (NEG-BORDE-07) — HU-03
- **Cuenta:** `residente@sigecop.test` (residente) · **Pantalla:** «Convenios» (`/contratos/modificatorios`) → fila `fila-convenio-<id>`.

| Campo (testid) | Valor |
|---|---|
| Autorizar (`conv-autorizar-<id>`) | clic como residente |

> 🔴 **Esperado:** **403** (el acto de autorización es exclusivo de la dependencia, art. 59 p3 LOPSRM).

### ▢ PASO 94 — Re-autorizar un convenio ya autorizado (acto único) (NEG-BORDE-08) — HU-03
- **Cuenta:** `dependencia@sigecop.test` (dependencia) · **Pantalla:** «Convenios» → fila de un convenio con `conv-badge-autorizado-…`.

| Campo (testid) | Valor |
|---|---|
| Autorizar (`conv-autorizar-<id>`) | segundo clic |

> 🔴 **Esperado:** **409** (acto único e irrepetible, art. 59 p3); el badge sigue «Autorizado».

### ▢ PASO 95 — B4 ampliación: el P.U. del concepto adicional NO puede diferir del original (art. 59) (NEG-BORDE-09) — HU-03
- **Cuenta:** `dependencia@sigecop.test` (dependencia) · **Pantalla:** «Convenios» → `cm-tipo` → `Monto` → `editor-programa-convenio` → panel «Ampliar» de C-03.

| Campo (testid) | Valor |
|---|---|
| Cantidad adicional (`cm-ampliar-extra`) | `50` |
| P.U. (read-only, candado 🔒) | `2500.00` heredado, no se teclea |
| Periodo (`cm-ampliar-periodo`) | **Periodo 3** |

> 🔴 **Esperado:** El P.U. del adicional HEREDA el del original (`2500.00`) bloqueado en UI; el backend valida que coincida con el original y **rechaza (400)** cualquier P.U. distinto enviado por API (art. 59 LOPSRM, gate ya aplicado, convenios.controller.js).

### ▢ PASO 96 — Convenio de Monto con programa descuadrado no se guarda (NEG-BORDE-10) — HU-03
- **Cuenta:** `dependencia@sigecop.test` (dependencia) · **Pantalla:** «Convenios» → `cm-tipo` → `Monto` → `editor-programa-convenio`.

| Campo (testid) | Valor |
|---|---|
| Celda (`cm-celda-0-1`) | `900` (deja `cm-restante-0` ≠ 0) |

> 🔴 **Esperado:** Banner `cm-programa-descuadre` (rojo); `btn-registrar-convenio` bloqueado hasta que cada `cm-restante-<i>` = 0 (regla 100%, art. 45-A-X + 52 LOPSRM).

### ▢ PASO 97 — Convenio de Monto: reducir un concepto por debajo de lo ya estimado se bloquea (NEG-BORDE-11) — HU-03
- **Cuenta:** `dependencia@sigecop.test` (dependencia) · **Pantalla:** «Convenios» → `cm-tipo` → `Monto` → `editor-programa-convenio` sobre `SOP-2026-001` (tiene avance/estimación).

| Campo (testid) | Valor |
|---|---|
| Cantidad (`cm-concepto-cantidad-0`) | `100` (menor a lo ya estimado en estimaciones no rechazadas) |

> 🔴 **Esperado:** **400** (no se reduce por debajo de lo ya estimado; el original está congelado, criterio de diseño + art. 118 RLOPSRM).

### ▢ PASO 98 — Foto de avance: quitarla en la UI bloquea el botón Registrar (NEG-BORDE-12) — HU-06
- **Cuenta:** `contratista@sigecop.test` (contratista) · **Pantalla:** «Avance y seguimiento» → `pestana-trabajos` (`/seguimiento/trabajos-terminados`) sobre `SOP-2026-002`.

| Campo (testid) | Valor |
|---|---|
| Concepto (`cap-concepto`) | **C-01** |
| Periodo (`cap-periodo`) | **Periodo 1** |
| Cantidad (`cap-cantidad`) | `1000` |
| Foto de evidencia | (sin adjuntar) |

> 🔴 **Esperado:** `btn-registrar-avance` deshabilitado (la regla A1 `puedeGuardar = … && !!fotoEvidencia` exige al menos una foto). **[BUG CONOCIDO #22]**: el backend NO valida la foto — un POST directo a `/api/trabajos` sin imagen devuelve 201 y crea el avance sin evidencia; la barrera vive solo en el front.

### ▢ PASO 99 — Avance que excede lo contratado se rechaza (art. 118) (NEG-BORDE-13) — HU-06
- **Cuenta:** `contratista@sigecop.test` (contratista) · **Pantalla:** `/seguimiento/trabajos-terminados` sobre `SOP-2026-002`.

| Campo (testid) | Valor |
|---|---|
| Concepto (`cap-concepto`) | **C-01** (contratado 1000) |
| Periodo (`cap-periodo`) | **Periodo 1** |
| Cantidad (`cap-cantidad`) | `1500` |

> 🔴 **Esperado:** **409** + banner `aviso-exceso` «…excede lo contratado (art. 118 RLOPSRM)»; el avance NO se registra.

### ▢ PASO 100 — Avance back-dateado tras convenio recalcula la etapa histórica «congelada» (NEG-BORDE-14) — HU-05
- **Cuenta:** `residente@sigecop.test` (residente) · **Pantalla:** `SOP-2026-001` (convenio v1/v2, fecha convenio 2026-06-24) → registrar avance en periodo pre-convenio (P2, fin 2026-05-31) y abrir `pestana-curva` (`/seguimiento/curva-avance`).

| Campo (testid) | Valor |
|---|---|
| Concepto (`cap-concepto`) | **C-01** |
| Periodo (`cap-periodo`) | **Periodo 2** |
| Cantidad (`cap-cantidad`) | `1600` (capturado hoy, fecha del periodo cae antes del convenio) |

> 🔴 **Esperado:** La etapa rotulada `Histórico · congelado` debería mantener su % ejecutado fijo. **[BUG CONOCIDO #28]**: hoy el % ejecutado de la etapa v1 CAMBIA (p.ej. 46.9%→53.1%) porque la partición es por `concepto_avance.fecha`, no por momento de captura; solo el denominador queda congelado, el numerador se mueve.

### ▢ PASO 101 — Asentar el mismo (concepto, periodo) de atraso dos veces es idempotente (NEG-BORDE-15) — HU-07
- **Cuenta:** `residente@sigecop.test` (residente) · **Pantalla:** `pestana-alertas` (`/seguimiento/alertas`) sobre un contrato con atraso → `btn-asentar-<contrato_concepto_id>`.

| Campo (testid) | Valor |
|---|---|
| Asentar (`btn-asentar-<id>`) | pulsar dos veces sobre la misma fila `fila-atraso-<id>` |

> 🔴 **Esperado:** Primer clic → nota de atraso (art. 53) `aviso-ok`; segundo → **409** idempotente (`atraso_asentado`) `aviso-error`; doble clic rápido → botón disabled «Asentando…».

### ▢ PASO 102 — Pólizas: 2ª garantía del mismo tipo se rechaza (una por tipo, art. 48) (NEG-BORDE-16) — HU-02
- **Cuenta:** `dependencia@sigecop.test` (dependencia) · **Pantalla:** «Fianzas / garantías» (`/contratos/fianzas`) sobre `SOP-2026-003` → `btn-agregar-poliza` → `modal-agregar-poliza`.

| Campo (testid) | Valor |
|---|---|
| Tipo (`mp-tipo`) | **Cumplimiento** (ya existe una) |
| Afianzadora (`mp-afianzadora`) | `X` |
| Monto (`mp-monto`) | `50000` |
| Vencimiento (`mp-vencimiento`) | `2027-12-31` |
| Confirmar (`mp-confirmar`) | clic |

> 🔴 **Esperado:** **409** UNIQUE(contrato_id,tipo) «ya tiene garantía de ese tipo» (art. 48 LOPSRM). **[BUG CONOCIDO #4]**: por la vía EDITAR (PUT) cambiando la capitalización («Anticipo» vs «anticipo») el UNIQUE NO muerde y quedan 2 fianzas del mismo tipo efectivo.

### ▢ PASO 103 — Endoso con monto mayor al contrato se rechaza (art. 48) (NEG-BORDE-17) — HU-02
- **Cuenta:** `dependencia@sigecop.test` (dependencia) · **Pantalla:** «Fianzas / garantías» → `btn-endoso-<g.id>` → `modal-endoso`.

| Campo (testid) | Valor |
|---|---|
| Motivo (`endoso-motivo`) | `Ampliación de monto` |
| Monto (`endoso-monto`) | `9999999` |
| Vigencia (`endoso-vigencia`) | `2028-06-01` |
| Confirmar (`endoso-confirmar`) | clic |

> 🔴 **Esperado:** **400** (monto excede el contrato, art. 48 LOPSRM); con `endoso-vigencia` → `2020-01-01` también **400** (vigencia vencida).

### ▢ PASO 104 — Contrato CERRADO: registrar pago de estimación autorizada debe rechazarse (NEG-BUG-01) — HU-21
- **Cuenta:** `finanzas@sigecop.test` (finanzas) · **Pantalla:** «Pago y tránsito» → `pestana-registro` (`/pagos/registro`) → elige `PRUEBA-HU-17` (id 6941, cerrado) → `pago-estimacion`.

| Campo (testid) | Valor |
|---|---|
| Estimación (`pago-estimacion`) | estimación #2 «autorizada» no pagada; referencia SPEI numérica; CFDI; fecha factura no futura; «Registrar pago» |

> 🔴 **Esperado:** DEBERÍA dar **409** (contrato cerrado = solo-lectura; el saldo se liquida solo por finiquito, art. 64 LOPSRM). **[BUG CONOCIDO #2: hoy devuelve 201 y registra el pago → doble liquidación del mismo saldo]**. El selector tampoco excluye el contrato cerrado **[BUG CONOCIDO #12]**.

### ▢ PASO 105 — Contrato CERRADO: EDITAR garantía y SUBIR PDF de póliza deben rechazarse (NEG-BUG-02) — HU-02
- **Cuenta:** `dependencia@sigecop.test` (dependencia) · **Pantalla:** «Fianzas / garantías» sobre un contrato cerrado (`PRUEBA-HU-17` / `SOP-2026-010`) → editar una póliza existente y subir PDF.

| Campo (testid) | Valor |
|---|---|
| PUT sobre la garantía | `endoso/edición` afianzadora/monto/vigencia; luego subir PDF de póliza |

> 🔴 **Esperado:** DEBERÍA dar **409** en TODO el módulo (art. 64 LOPSRM): crear póliza y endoso ya devuelven 409 correctamente. **[BUG CONOCIDO #5: hoy EDITAR garantía devuelve 200 y SUBIR PDF de póliza devuelve 201 sobre un contrato cerrado]**.

### ▢ PASO 106 — Contrato CERRADO: vincular/responder nota nueva debe rechazarse (NEG-BUG-03) — HU-09
- **Cuenta:** `residente@sigecop.test` (residente) · **Pantalla:** «Bitácora» → `pestana-consulta` (`/bitacora/consulta`) sobre `PRUEBA-HU-17` (cerrado) → responder una nota.

| Campo (testid) | Valor |
|---|---|
| Vincular nota nueva | `tipo` res_*, contenido — a una nota del contrato cerrado |

> 🔴 **Esperado:** DEBERÍA dar **409** (contrato cerrado no admite actos nuevos, art. 64 LOPSRM); emitir nota normal sí da 409. **[BUG CONOCIDO #9: hoy «vincular» crea la nota nueva con 201, evadiendo el gate que sí aplica a emitir]**.

### ▢ PASO 107 — Contrato CERRADO: anular la nota de FINIQUITO debe rechazarse (NEG-BUG-04) — HU-09
- **Cuenta:** `residente@sigecop.test` (residente) · **Pantalla:** «Bitácora» → consulta de notas sobre `PRUEBA-HU-17` (cerrado) → anular la nota tipo `finiquito` (`form-anular-<n>` + `btn-confirmar-anular-<n>`).

| Campo (testid) | Valor |
|---|---|
| Anular | la nota de finiquito (el asiento de cierre) |

> 🔴 **Esperado:** DEBERÍA dar **409** (a) contrato cerrado solo-lectura art. 64 y (b) el acta de finiquito es inmutable como la apertura. **[BUG CONOCIDO #10: hoy devuelve 201, anula la nota de finiquito y crea correctiva — el asiento legal de cierre queda alterado]**.

### ▢ PASO 108 — Anular una nota ya FIRMADA por la contraparte debe rechazarse (NEG-BUG-05) — HU-09
- **Cuenta:** `residente@sigecop.test` (residente, emisor) · **Pantalla:** «Bitácora» → emite una nota; con `contratista@` fírmala (`btn-firmar-nota-<n>`); vuelve como residente y anúlala (`btn-confirmar-anular-<n>`) sobre `PRUEBA-HU-09`.

| Campo (testid) | Valor |
|---|---|
| Anular | una nota que la contraparte ya firmó/aceptó |

> 🔴 **Esperado:** DEBERÍA dar **409** (art. 123 fr. VI RLOPSRM: prohibido modificar notas ya firmadas, inclusive para el emisor original; la anulación fr. VII es solo PRE-firma). **[BUG CONOCIDO #8: hoy devuelve 201 y deja la nota firmada en estado anulada]**.

### ▢ PASO 109 — Contrato CERRADO: firmar/aceptar una nota debe rechazarse (NEG-BUG-06) — HU-09
- **Cuenta:** `contratista@sigecop.test` (contratista, contraparte) · **Pantalla:** «Bitácora» → consulta de notas sobre `PRUEBA-HU-17` (cerrado) → `btn-firmar-nota-<n>` de una nota «emitida».

| Campo (testid) | Valor |
|---|---|
| Firmar | una nota de un contrato cerrado |

> 🔴 **Esperado:** DEBERÍA dar **409** coherente con emitir/minuta/visita que sí bloquean por art. 64. **[BUG CONOCIDO #19: hoy `firmarNota` devuelve 201 y registra la firma «superintendente» sin gate de cierre]**.

### ▢ PASO 110 — Fusionar empresa duplicada que tiene contratos debe completarse (no error opaco) (NEG-BUG-07) — HU-23
- **Cuenta:** `dependencia@sigecop.test` (dependencia) · **Pantalla:** «Padrón de empresas» (`/admin/empresas`) → pestaña `tab-porvalidar` → `fusionar-<id>` de un duplicado referenciado por un contrato.

| Campo (testid) | Valor |
|---|---|
| Fusionar | empresa duplicada (source con contratos) en la canónica (`canonica_id`) |

> 🔴 **Esperado:** DEBERÍA fundir reapuntando personas Y la referencia del contrato y eliminar la duplicada (dedup pedido por el profe). **[BUG CONOCIDO #3: hoy devuelve HTTP 500 «Error interno» (FK contratos→empresa no reapuntada); la fusión falla siempre que el duplicado tenga contratos]**.

### ▢ PASO 111 — Reportes Excel #2/#3: la fila TOTALES no debe sumar estimaciones RECHAZADAS (NEG-BUG-08) — HU-19
- **Cuenta:** `residente@sigecop.test` (residente) · **Pantalla:** «Reportes» (`/reportes`) sobre `PRUEBA-HU-16` (id 6940: EST#1 rechazada 208,500 + EST#2 reingreso 208,500) → exportar reporte #2 y #3 (Excel).

| Campo (testid) | Valor |
|---|---|
| Exportar | reporte #2 «Avance financiero» y #3 «Listado de estimaciones» y leer la fila TOTALES Neto |

> 🔴 **Esperado:** TOTAL Neto DEBERÍA excluir la rechazada = **208,500** (igual que el Expediente). **[BUG CONOCIDO #6: hoy TOTALES suma todo = 417,000, contradiciendo la propia métrica «Estimado» del mismo archivo y el Expediente]**.

### ▢ PASO 112 — Finiquito por id directo debe acotar por empresa de la dependencia (NEG-BUG-09) — HU-24
- **Cuenta:** `dep2@sigecop.test` (dependencia «Norte», otra empresa) · **Pantalla:** URL directa `GET /api/finiquito/contrato/<id>` (o deep-link) a un contrato de la empresa «Dependencia Demo».

| Campo (testid) | Valor |
|---|---|
| Acceder | al finiquito de un contrato cuya dependencia es de OTRA empresa |

> 🔴 **Esperado:** DEBERÍA dar **403** (aislamiento por empresa, como el Portafolio). **[BUG CONOCIDO #7: hoy devuelve 200 (lectura) e incluso permite CERRAR el contrato ajeno con 201 — `getContrato` del finiquito no trae `dependencia_empresa_id` → fail-open por id]**.

### ▢ PASO 113 — Aprobar usuario: no debe poder cambiar el rol de una cuenta YA ACTIVA (NEG-BUG-10) — HU-23
- **Cuenta:** `dependencia@sigecop.test` (dependencia) · **Pantalla:** API directa `PATCH /api/usuarios/1/aprobar` (no alcanzable desde la UI, que solo lista pendientes).

| Campo (testid) | Valor |
|---|---|
| Body | `{"rol":"finanzas"}` sobre `residente@` (id 1, estado activo) |

> 🔴 **Esperado:** DEBERÍA dar **409/400** (aprobar solo opera sobre estado `pendiente`). **[BUG CONOCIDO #13: hoy devuelve 200 y cambia el rol de una cuenta activa — falta el guard `estado='pendiente'`]**.

### ▢ PASO 114 — Registro: correo vacío / solo espacios debe rechazarse (NEG-BUG-11) — HU-23
- **Cuenta:** (público, sin sesión) · **Pantalla:** Pantalla de acceso → «Regístrate» (`link-registro`) → `form-registro`; o API `POST /auth/register`.

| Campo (testid) | Valor |
|---|---|
| Nombres (`reg-nombres`) | `Juan` |
| Apellidos (`reg-apellidos`) | `Pérez` |
| Correo (`reg-email`) | `   ` (solo espacios) |
| Contraseña (`reg-password`) | `Sigecop2026!` |
| Rol (`reg-rol`) | **residente** |

> 🔴 **Esperado:** DEBERÍA dar **400** (correo obligatorio, no vacío tras trim). **[BUG CONOCIDO #14: por API el correo «   » colapsa a «» y se crea la cuenta (201); el siguiente registro con espacios choca con el UNIQUE → 409 engañoso]** (el front sí valida con «Completa todos los campos.»).

### ▢ PASO 115 — Registro: correo sin formato válido (sin @) debe rechazarse (NEG-BUG-12) — HU-23
- **Cuenta:** (público, sin sesión) · **Pantalla:** API `POST /auth/register` (el front usa `type=email`, un POST directo lo evade).

| Campo (testid) | Valor |
|---|---|
| Correo (`email`) | `esto-no-es-email` |
| resto válido | (válido) |

> 🔴 **Esperado:** DEBERÍA dar **400** por formato inválido. **[BUG CONOCIDO #25: hoy devuelve 201 y crea la cuenta — el backend no valida formato de correo]**.

### ▢ PASO 116 — Alta: fecha de inicio fuera de rango debe dar 400, no 500 (NEG-BUG-13) — HU-01
- **Cuenta:** `residente@sigecop.test` (residente) · **Pantalla:** API `POST /api/contratos` (el date-picker de la UI no produce estas fechas).

| Campo (testid) | Valor |
|---|---|
| Fecha inicio (`fechaInicio`) | `2026-02-30` (o `2026-13-45`, `2026-00-00`) |
| resto válido | (válido) |

> 🔴 **Esperado:** DEBERÍA dar **400** «fecha inválida». **[BUG CONOCIDO #26: hoy devuelve 500 «Error interno» — el catch mapea 22007/22P02 pero no 22008 (fecha fuera de rango)]**.

### ▢ PASO 117 — Atraso/badge no debe contar avances ANULADOS (NEG-BUG-14) — HU-07
- **Cuenta:** `residente@sigecop.test` (residente) · **Pantalla:** `pestana-alertas` (`/seguimiento/alertas`) sobre un contrato donde un avance se corrigió a la baja (queda 1 anulado + 1 vigente).

| Campo (testid) | Valor |
|---|---|
| Comparar | `ejecutado_acumulado` del panel de atraso vs la curva (HU-05) / trabajos (HU-06) para el mismo concepto |

> 🔴 **Esperado:** El déficit DEBERÍA contar solo avances `vigente` (como curva y trabajos). **[BUG CONOCIDO #11: hoy `alertas` suma sin filtro estado='vigente' → cuenta el anulado; puede inflar el déficit o, peor, ocultar un atraso real haciéndolo negativo y el concepto desaparece del panel y del badge]**.


---

### Gates conocidos que FALTAN (referencia para el tester)

| # | Acto | Qué DEBERÍA bloquear (ley) | Qué hace HOY |
|---|---|---|---|
| #2 | Registrar pago en contrato cerrado | 409: contrato cerrado solo-lectura, saldo solo por finiquito (art. 64 LOPSRM) | 201: paga la estimación → doble liquidación del mismo saldo |
| #5 | Editar garantía / subir PDF de póliza en contrato cerrado | 409 en todo el módulo de garantías (art. 64 LOPSRM) | EDITAR → 200, SUBIR PDF → 201 (crear/endoso sí dan 409) |
| #9 | Vincular/responder nota en contrato cerrado | 409: no se admiten actos nuevos (art. 64 LOPSRM) | 201: crea la nota nueva, evadiendo el gate de emitir |
| #10 | Anular la nota de finiquito (contrato cerrado) | 409: cierre solo-lectura + acta de finiquito inmutable (art. 64; análogo a apertura) | 201: anula el asiento de cierre y crea correctiva |
| #19 | Firmar/aceptar nota en contrato cerrado | 409: solo-lectura art. 64 (como emitir/minuta/visita) | 201: registra la firma sin gate de cierre |
| #22 | Registrar avance sin foto de evidencia | Rechazar/marcar incompleto server-side (regla A1 del equipo) | 201 por API: la obligatoriedad de foto vive solo en el front |
