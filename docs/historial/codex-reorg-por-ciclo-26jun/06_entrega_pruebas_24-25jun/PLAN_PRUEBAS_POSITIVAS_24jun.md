# PLAN DE PRUEBAS POSITIVAS — SIGECOP · FLUJO FELIZ (24-jun-2026)

> **Para imprimir y palomear casilla por casilla.** Recorre el sistema de **inicio a fin** por **PASOS NUMERADOS** (mismo formato que `PLAN_PRUEBAS_FINAL_match_18jun.md`). El flujo feliz **crea su propio contrato `OBRA-2026-QA-POS`** en el Alta (con su PDF firmado) y lo hila por todo el recorrido — así sortea el **[BUG CONOCIDO #1]** (los demos SOP/PRUEBA-HU no tienen el PDF firmado ligado). El portafolio multi-contrato usa los `SOP-2026-001..010` sembrados. 🟢 = el sistema debe **ACEPTAR**. **▢** = casilla para palomear.

### Cómo leer cada paso
Cada **PASO** trae: **Cuenta** · **Pantalla** (cómo llegar) · **datos exactos** (campo `testid` → valor) · **🟢 Esperado** (lo observable). Palomea el **▢** del encabezado y anota al margen ✅ (pasó) / ❌ (falló) / ⚠️ (bloqueado).

## Cuentas demo (contraseña común `Sigecop2026!`)

| Cuenta | Rol | Papel en el flujo |
|---|---|---|
| `residente@sigecop.test` | residente | Da de alta, abre/firma bitácora, **autoriza/rechaza** estimación, finiquito |
| `contratista@sigecop.test` | contratista (**superintendente**) | Integra/presenta/reingresa estimación, registra avance |
| `supervision@sigecop.test` | supervisión | Observa, firma, **turna** la estimación |
| `dependencia@sigecop.test` | dependencia | Crea/autoriza convenios, padrón, roster, finiquito |
| `finanzas@sigecop.test` | finanzas | Tránsito a pago + **registra el pago** (único) |

**Contratos demo:** `SOP-2026-001..010` (alta completa + bitácora; `SOP-2026-001` con convenio v1/v2) y `PRUEBA-HU-01..24` (uno por HU en su estado). Login: `#login-usuario`, `#login-password`, botón «Iniciar sesión». Al entrar a una pantalla de contrato sale el modal `modal-elegir-contrato` → elige el contrato (se hereda).

---

## Etapas 1-2 — Registro + aprobación de cuenta · Alta completa (wizard 7 pasos)

> **Etapa 1 — Registro:** acceso `http://localhost:5173/` → enlace «Regístrate» (`link-registro`), formulario `form-registro` (testids `reg-*`); la aprueba `dependencia@sigecop.test` en ADMINISTRACIÓN → «Solicitudes de registro» (`/usuarios/solicitudes`). **Etapa 2 — Alta:** `residente@sigecop.test` → CICLOS → «Alta de contratos» (`/contratos/alta`, ruta libre, sin modal). Folio del HILO **OBRA-2026-QA-POS**, monto $1,000,000.00, anticipo 30% ($300,000), 3 periodos mensuales. Este contrato CON su PDF firmado (paso 7) es el único que sortea el [BUG CONOCIDO #1] y se hila por todo el recorrido.

### ▢ PASO 1 — Alta de cuenta contratista nueva con empresa existente del catálogo (POS-REG-01) — HU-23
- **Cuenta:** (sin sesión) · **Pantalla:** Pantalla de acceso → «Regístrate» (`link-registro`) → `form-registro`.

| Campo (testid) | Valor |
|---|---|
| Nombres (`reg-nombres`) | `Pedro` |
| Apellidos (`reg-apellidos`) | `García Soto` |
| Correo (`reg-email`) | `pedro.qa@prueba.test` |
| Rol (`reg-rol`) | **contratista** |
| Empresa (`reg-empresa-select`) | **Constructora Demo** |
| Contraseña (`reg-password`) | `Sigecop2026!` |
| Confirmar (`reg-password2`) | `Sigecop2026!` |
| Enviar (`reg-submit`) | (clic) |

> 🟢 **Esperado:** Vuelve a login con mensaje de cuenta **pendiente**; usuario creado estado='pendiente', rol NULL, sin token (auth.controller.js:120-121); empresa obligatoria satisfecha (art. 123 fr. III RLOPSRM para el nombre completo ≥2 palabras).

### ▢ PASO 2 — Registro creando empresa nueva (rama «➕ Registrar nueva») sin colisión de duplicado (POS-REG-02) — HU-23
- **Cuenta:** (sin sesión) · **Pantalla:** Pantalla de acceso → «Regístrate» (`link-registro`).

| Campo (testid) | Valor |
|---|---|
| Nombres (`reg-nombres`) | `Laura` |
| Apellidos (`reg-apellidos`) | `Méndez Ruiz` |
| Correo (`reg-email`) | `laura.qa@prueba.test` |
| Rol (`reg-rol`) | **contratista** |
| Empresa (`reg-empresa-select`) | **__nueva__** |
| Empresa nueva (`reg-empresa-nueva`) | `Constructora QA Hilo S.A. de C.V.` |
| Contraseña (`reg-password`) | `Sigecop2026!` |
| Confirmar (`reg-password2`) | `Sigecop2026!` |
| Enviar (`reg-submit`) | (clic) |

> 🟢 **Esperado:** Cuenta pendiente creada; empresa nace estado 'por_validar' tipo 'contratista' (empresas.controller.js:58-99); NO aparece aviso `reg-empresa-existente` (nombre sin match fuerte en catálogo).

### ▢ PASO 3 — Registro de cuenta supervisión con empresa (campo empresa obligatorio satisfecho) (POS-REG-03) — HU-23
- **Cuenta:** (sin sesión) · **Pantalla:** Pantalla de acceso → «Regístrate» (`link-registro`).

| Campo (testid) | Valor |
|---|---|
| Nombres (`reg-nombres`) | `Hugo` |
| Apellidos (`reg-apellidos`) | `Torres Lara` |
| Correo (`reg-email`) | `hugo.superv.qa@prueba.test` |
| Rol (`reg-rol`) | **supervision** |
| Empresa (`reg-empresa-select`) | **Supervisión Externa Demo** |
| Contraseña (`reg-password`) | `Sigecop2026!` |
| Confirmar (`reg-password2`) | `Sigecop2026!` |
| Enviar (`reg-submit`) | (clic) |

> 🟢 **Esperado:** Cuenta pendiente; el label de empresa muestra '*' (obligatoria para contratista y supervisión, empresa.js:12-13); registro aceptado sin banner `registro-error`.

### ▢ PASO 4 — Aprobación de la solicitud de Pedro asignando rol contratista (POS-REG-04) — HU-23
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Sidebar ADMINISTRACIÓN → «Solicitudes de registro» (`/usuarios/solicitudes`, ruta libre, sin modal).

| Campo (testid) | Valor |
|---|---|
| En `fila-solicitud[data-email="pedro.qa@prueba.test"]` — Rol (`select-rol`) | **contratista** |
| Aprobar (`btn-aprobar`) | (clic) |

> 🟢 **Esperado:** La fila desaparece; usuario pasa a estado='activo' con rol efectivo='contratista', aprobado_por sale del JWT (usuarios.controller.js:78-84); el rol NO se hereda del solicitado (decisión de la dependencia).

### ▢ PASO 5 — Aprobación de la solicitud de supervisión (Hugo) (POS-REG-05) — HU-23
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Sidebar ADMINISTRACIÓN → «Solicitudes de registro» (`/usuarios/solicitudes`).

| Campo (testid) | Valor |
|---|---|
| En `fila-solicitud[data-email="hugo.superv.qa@prueba.test"]` — Rol (`select-rol`) | **supervision** |
| Aprobar (`btn-aprobar`) | (clic) |

> 🟢 **Esperado:** La fila desaparece; usuario activo con rol='supervision'; PATCH /usuarios/:id/aprobar requireRole('dependencia') (usuarios.routes.js:22).

### ▢ PASO 6 — Login de la cuenta recién aprobada (Pedro) (POS-REG-06)
- **Cuenta:** pedro.qa@prueba.test (contratista) · **Pantalla:** Pantalla de acceso → `#login-usuario`, `#login-password`, botón «Iniciar sesión».

| Campo (testid) | Valor |
|---|---|
| Usuario (`#login-usuario`) | `pedro.qa@prueba.test` |
| Contraseña (`#login-password`) | `Sigecop2026!` |

> 🟢 **Esperado:** Sesión iniciada; emite JWT {id,rol,nombre,empresa_id,tv} 8h (auth.controller.js:62-68); sidebar y chip de empresa (`chip-empresa`) propios del rol contratista; ya NO devuelve 403 'pendiente'.

### ▢ PASO 7 — Paso 1 · Datos generales completos del contrato del HILO (POS-ALTA-01) — HU-01
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Sidebar CICLOS → «Alta de contratos» (`/contratos/alta`, tab 0; sin banner, lo crea).

| Campo (testid) | Valor |
|---|---|
| Tipo (select sin testid) | **Obra pública sobre la base de precios unitarios** |
| Folio (`dg-folio`) | `OBRA-2026-QA-POS` |
| Objeto (`dg-objeto`) | `Construcción de aula didáctica — campus UAGRO (QA positivo)` |
| Ubicación (`dg-ubicacion`) | `Av. Juárez s/n, Chilpancingo, Gro.` |
| Dependencia (`dg-dependencia`) | `Lic. Diana Dependencia Demo` |
| Plazo (`dg-plazo`) | `90` |
| Fecha (`dg-fecha`) | `2026-01-01` |
| Pena (`dg-pena`) | (vacío) |
| Superintendente (`select-superintendente`) | **Arq. Carlos Contratista Demo** |
| Supervisión (`select-supervision`) | **Ing. Sofía Supervisión Demo** |
| Siguiente (`btn-siguiente`) | (clic) |

> 🟢 **Esperado:** Avanza a tab 1; deriva `termino-derivado` = **2026-03-31** (inicio + plazo−1, RLOPSRM 100); `equipo-residente` = el residente logueado (no editable); muestra `empresa-contratista` y `empresa-supervision`; sin `aviso-misma-empresa` (empresas distintas).

### ▢ PASO 8 — Paso 2 · Catálogo de 4 conceptos, monto derivado $1,000,000.00 (POS-ALTA-02) — HU-01
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/contratos/alta` (tab 1 Catálogo); botón «+ Agregar concepto» por fila.

| Campo (testid) | Valor |
|---|---|
| `concepto-clave-0` | `C-01` |
| `concepto-concepto-0` | `Limpieza y trazo del terreno` |
| `concepto-unidad-0` | `m²` |
| `concepto-cantidad-0` | `1000` |
| `concepto-pu-0` | `50.00` |
| `concepto-clave-1` | `C-02` |
| `concepto-concepto-1` | `Excavación a máquina` |
| `concepto-unidad-1` | `m³` |
| `concepto-cantidad-1` | `500` |
| `concepto-pu-1` | `200.00` |
| `concepto-clave-2` | `C-03` |
| `concepto-concepto-2` | `Concreto f'c=200 kg/cm²` |
| `concepto-unidad-2` | `m³` |
| `concepto-cantidad-2` | `300` |
| `concepto-pu-2` | `2500.00` |
| `concepto-clave-3` | `C-04` |
| `concepto-concepto-3` | `Acero de refuerzo fy=4200` |
| `concepto-unidad-3` | `kg` |
| `concepto-cantidad-3` | `2000` |
| `concepto-pu-3` | `50.00` |
| Siguiente (`btn-siguiente`) | (clic) |

> 🟢 **Esperado:** `monto-derivado` = **$1,000,000.00** (Σ ROUND(cant×pu,2), art. 45 fr. IX RLOPSRM); `catalogo-indicador` en verde; claves únicas ≤40 car. aceptadas; avanza a tab 2.

### ▢ PASO 9 — Paso 3 · Programa de obra matriz al 100% por concepto, 3 periodos mensuales (POS-ALTA-03) — HU-01
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/contratos/alta` (tab 2 Programa).

| Campo (testid) | Valor |
|---|---|
| Ciclo (`select-ciclo`) | **mensual** |
| `celda-0-1` | `1000` |
| `celda-0-2` | `0` |
| `celda-0-3` | `0` |
| `celda-1-1` | `250` |
| `celda-1-2` | `250` |
| `celda-1-3` | `0` |
| `celda-2-1` | `0` |
| `celda-2-2` | `150` |
| `celda-2-3` | `150` |
| `celda-3-1` | `0` |
| `celda-3-2` | `1000` |
| `celda-3-3` | `1000` |
| Siguiente (`btn-siguiente`) | (clic) |

> 🟢 **Esperado:** Banner verde `programa-cuadra`; restante de cada concepto = 0 (`planeado-0..3`); `periodos-count` = 3; $ por periodo (deriv.) 100,000 / 475,000 / 425,000 = Σ 1,000,000 (art. 45 fr. X RLOPSRM); avanza a tab 3.

### ▢ PASO 10 — Paso 4 · Datos jurídicos con campos OPCIONALES (poder/notaría) llenos (POS-ALTA-04) — HU-01
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/contratos/alta` (tab 3 Jurídicos).

| Campo (testid) | Valor |
|---|---|
| Firmante (`jur-firmante`) | `Lic. Diana Dependencia Demo` |
| Cargo (`jur-cargo`) | `Directora de Obras Públicas` |
| Representante (`jur-representante`) | `Arq. Carlos Contratista Demo` |
| Cédula (`jur-cedula`) | `12345678` |
| Poder (`jur-poder`) | `45821` |
| Notaría (`jur-notaria`) | `Notaría Pública No. 7, Chilpancingo, Gro.` |
| Siguiente (`btn-siguiente`) | (clic) |

> 🟢 **Esperado:** Acepta y avanza a tab 4; obligatorios firmante/cargo/representante/cédula validados (validarPaso(3), art. 46-48 LOPSRM); poder y notaría opcionales se persisten en JSONB `datos_juridicos`.

### ▢ PASO 11 — Paso 5 · Anticipo 30% (sin PDF) + garantía de Cumplimiento (POS-ALTA-05) — HU-01
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/contratos/alta` (tab 4 Garantías); botón «+ Agregar póliza».

| Campo (testid) | Valor |
|---|---|
| Anticipo (`anticipo-input`) | `30` |
| Fila 0 — Tipo (`garantia-tipo-0`) | **Cumplimiento** |
| Fila 0 — Afianzadora (`garantia-afianzadora-0`) | `Fianzas del Pacífico S.A.` |
| Fila 0 — Póliza (`garantia-poliza-0`) | `FC-2026-001` |
| Fila 0 — Monto (`garantia-monto-0`) | `100000.00` |
| Fila 0 — Vigencia (`garantia-vigencia-0`) | `2027-06-01` |

> 🟢 **Esperado:** A 30% exacto NO se exige PDF (ANTICIPO_UMBRAL_PDF=30, regla es >30); no aparece `anticipo-pdf-requerido`; póliza de Cumplimiento aceptada (monto 10% ≤ contrato, vigencia ≥ hoy, art. 48 fr. II LOPSRM); `avisos-anticipo` visible.

### ▢ PASO 12 — Paso 5 (cont.) · Garantía de Anticipo (monto derivado) + Vicios ocultos (opcional) → banner garantias-ok (POS-ALTA-06) — HU-01
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/contratos/alta` (tab 4 Garantías); «+ Agregar póliza» ×2.

| Campo (testid) | Valor |
|---|---|
| Fila 1 — Tipo (`garantia-tipo-1`) | **Anticipo** |
| Fila 1 — Afianzadora (`garantia-afianzadora-1`) | `Fianzas del Pacífico S.A.` |
| Fila 1 — Póliza (`garantia-poliza-1`) | `FA-2026-001` |
| Fila 1 — Monto deriv. (`garantia-monto-derivado-1`, read-only) | `300000.00` |
| Fila 1 — Vigencia (`garantia-vigencia-1`) | `2027-06-01` |
| Fila 2 (opcional) — Tipo (`garantia-tipo-2`) | **Vicios ocultos** |
| Fila 2 — Afianzadora (`garantia-afianzadora-2`) | `Fianzas del Pacífico S.A.` |
| Fila 2 — Póliza (`garantia-poliza-2`) | `FV-2026-001` |
| Fila 2 — Monto (`garantia-monto-2`) | `50000.00` |
| Fila 2 — Vigencia (`garantia-vigencia-2`) | `2027-12-31` |
| Siguiente (`btn-siguiente`) | (clic) |

> 🟢 **Esperado:** Monto de Anticipo se DERIVA = round2(30% × $1,000,000) = $300,000.00 (read-only, art. 48 fr. I LOPSRM); banner `garantias-ok` (Cumplimiento + Anticipo presentes); 3 tipos sin duplicados; avanza a tab 5.

### ▢ PASO 13 — Paso 6 · Plan de amortización Σ exacta $300,000.00 (POS-ALTA-07) — HU-01
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/contratos/alta` (tab 5 Plan de amortización; visible por haber anticipo).

| Campo (testid) | Valor |
|---|---|
| `plan-monto-1` | `100000.00` |
| `plan-monto-2` | `100000.00` |
| `plan-monto-3` | `100000.00` |
| Siguiente (`btn-siguiente`) | (clic) |

> 🟢 **Esperado:** `plan-suma` = **$300,000.00**; banner `plan-cuadra` (Σ plan = monto×anticipo% al centavo, art. 143 fr. I RLOPSRM); cada monto ≤ programado del periodo (deriv. `plan-programado-*`); avanza a tab 6.

### ▢ PASO 14 — Paso 6 (alt.) · Botón «Restablecer proporcional al programa» recalcula el plan (POS-ALTA-08) — HU-01
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/contratos/alta` (tab 5 Plan de amortización).

| Campo (testid) | Valor |
|---|---|
| Restablecer proporcional (`plan-restablecer`) | (clic) |

> 🟢 **Esperado:** El plan se reescribe proporcional al programa del periodo (planProporcionalPrograma); `plan-suma` sigue = $300,000.00 con banner `plan-cuadra` (no descuadra).

### ▢ PASO 15 — Paso 7 · PDF firmado del contrato + Guardar (cierra el HILO con [BUG CONOCIDO #1] evitado) (POS-ALTA-09) — HU-01
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/contratos/alta` (tab 6 PDF firmado).

| Campo (testid) | Valor |
|---|---|
| PDF firmado (`pdf-firmado-input-precaptura`) | `contrato_OBRA-2026-QA-POS.pdf` (archivo .pdf real) |
| Guardar (`btn-guardar`) | (clic) |

> 🟢 **Esperado:** El uploader pasa (magic bytes %PDF); contrato guardado transaccional; redirige a `/bitacora/apertura?contrato=<id>`; documento tipo='contrato' queda LIGADO → este contrato SÍ permitirá integrar estimaciones después [evita BUG CONOCIDO #1].

### ▢ PASO 16 — Verificación post-alta · el contrato del HILO aparece en «Registrados» con su monto (POS-ALTA-10) — HU-01
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/contratos/alta` → pestaña «Registrados» (tab 7, siempre navegable).

| Campo (testid) | Valor |
|---|---|
| Buscar fila folio | `OBRA-2026-QA-POS` |
| Abrir (`ver-info-<id>`) | (clic — ModalDetalleContrato, solo lectura) |

> 🟢 **Esperado:** Fila presente: folio OBRA-2026-QA-POS, monto **$1,000,000.00**, término 2026-03-31; el modal reúne cabecera+conceptos+garantías+jurídicos+programa+PDF; este `<id>` es el que se elegirá en `modal-contrato-<id>` para hilar bitácora→avance→estimación→pago.


---

## Etapas 3-5 — Apertura y firma de bitácora · Notas · Avance con foto

> Sobre el contrato propio **OBRA-2026-QA-POS** ya dado de alta (PDF firmado, conceptos C-01..C-04, monto $1,000,000, anticipo 30%, 3 periodos). Al entrar a cualquier pantalla de contrato sale `modal-elegir-contrato` → elige `modal-contrato-<id>` de OBRA-2026-QA-POS; se hereda en `banner-contrato-activo`. Login: `#login-usuario`, `#login-password` (`Sigecop2026!`). Etapa 3 = residente apertura + las 3 partes firman; Etapa 4 = emitir/responder/firmar nota tipificada; Etapa 5 = registrar avance con foto (foto obligatoria en UI por criterio A1; el backend no la valida, pero el camino feliz la sube).

### ▢ PASO 17 — Aperturar la bitácora del contrato (residente asignado) (POS-BIT-01) — HU-08
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Sidebar → «Bitácora» → wizard `/bitacora/ambiente`, paso `wpaso-bit-apertura` → `link-abrir` → `/bitacora/apertura` (contrato heredado OBRA-2026-QA-POS).

| Campo (testid) | Valor |
|---|---|
| Fecha apertura (`input-fecha-apertura`) | `2026-01-01` (deriv. prefill de fecha_inicio, solo verificar) |
| Plazo firma (`input-plazo-firma`) | `2` (deriv. default, solo verificar) |
| Domicilio dependencia (`md-domicilio-dependencia`) | `Av. Juárez 100, Chilpancingo, Gro.` |
| Teléfono dependencia (`md-telefono-dependencia`) | `7471234567` |
| Domicilio contratista (`md-domicilio-contratista`) | `Calle Reforma 25, Acapulco, Gro.` |
| Teléfono contratista (`md-telefono-contratista`) | `7449876543` |
| Descripción trabajos (`md-descripcion-trabajos`) | `Construcción de aula de 60 m²: cimentación, estructura y acabados.` |
| Características sitio (`md-caracteristicas-sitio`) | `Terreno plano, 200 m², acceso vehicular, suelo arcilloso.` |
| (`btn-aperturar`) | clic |

> 🟢 **Esperado:** Se crea la bitácora: nota #1 tipo «apertura» (no se teclea), firmas pendientes para las 3 partes; pasa a vista `bitacora-readonly` con `estado-firmas` (0/3). Apertura inmutable y única por contrato (art. 123 fr. VI RLOPSRM).

### ▢ PASO 18 — Bloqueo de avance al siguiente paso del wizard sin las 3 firmas (POS-BIT-02) — HU-08
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/bitacora/ambiente` stepper (`wpaso-bit-apertura`→`wpaso-bit-firma`→`wpaso-bit-emitir`), botón `btn-wsiguiente-bit`.

| Campo (testid) | Valor |
|---|---|
| (sin captura) verificar candado `candado-bit-4` 🔒 y `wsiguiente-bit-motivo`; `firmas-xy` | «0/3» |

> 🟢 **Esperado:** El stepper marca el paso «emitir» bloqueado (`candado-notas-aviso`): emitir notas exige apertura firmada por TODOS (art. 123 fr. III RLOPSRM).

### ▢ PASO 19 — Firma de la apertura por el RESIDENTE (POS-BIT-03) — HU-08
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/bitacora/ambiente` → `link-firmar` → `/bitacora/por-firmar` (o pestaña «Por firmar»).

| Campo (testid) | Valor |
|---|---|
| Localizar fila `fila-por-firmar[data-folio="OBRA-2026-QA-POS"]`; botón `btn-firmar` | clic |

> 🟢 **Esperado:** Firma del residente registrada (append-only); contador sube a 1/3; la fila sigue (faltan superintendente y supervisión).

### ▢ PASO 20 — Firma de la apertura por el CONTRATISTA (superintendente) (POS-BIT-04) — HU-08
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** Login contratista → `/bitacora/por-firmar` (contrato heredado o re-elige en `modal-elegir-contrato`).

| Campo (testid) | Valor |
|---|---|
| `fila-por-firmar[data-folio="OBRA-2026-QA-POS"]`; botón `btn-firmar` | clic |

> 🟢 **Esperado:** Firma del superintendente registrada; contador 2/3; fila persiste (falta supervisión).

### ▢ PASO 21 — Firma de la apertura por la SUPERVISIÓN → apertura COMPLETA (POS-BIT-05) — HU-08
- **Cuenta:** supervision@sigecop.test (supervision) · **Pantalla:** Login supervisión → `/bitacora/por-firmar`.

| Campo (testid) | Valor |
|---|---|
| `fila-por-firmar[data-folio="OBRA-2026-QA-POS"]`; botón `btn-firmar` | clic |

> 🟢 **Esperado:** Toast «Firmaste. La apertura quedó COMPLETA.»; la fila desaparece (`por-firmar-vacio`); en el wizard `firmas-xy` = «completa» (3/3). Firma conjunta art. 123 fr. III RLOPSRM.

### ▢ PASO 22 — Emitir nota tipificada de avance (supervisión, una de las 3 partes) (POS-NOTA-01) — HU-09
- **Cuenta:** supervision@sigecop.test (supervision) · **Pantalla:** Sidebar → «Bitácora» → pestaña `pestana-bitacora`/`link-notas` → `/bitacora/notas` (contrato heredado; apertura ya completa).

| Campo (testid) | Valor |
|---|---|
| Tipo (`select-tipo`) | **Avance físico y financiero** |
| Tag (`input-tag`) | `avance` |
| Asunto (`input-asunto`) | `Verificación de avance` |
| Contenido (`input-contenido`) | `Se verifica avance de excavación conforme a programa.` |
| (`btn-emitir`) | clic |

> 🟢 **Esperado:** La nota se emite con folio correlativo del servidor, firmada por su emisor e inmutable; aparece en `lista-notas` (`nota-{numero}`) con estado «emitida». El bloque `gate-emision` está habilitado porque la apertura está 3/3 (art. 125 RLOPSRM).

### ▢ PASO 23 — Emitir nota de solicitud (contratista/superintendente) — solo tipos de su rol (POS-NOTA-02) — HU-09
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** Login contratista → `/bitacora/notas`.

| Campo (testid) | Valor |
|---|---|
| Tipo (`select-tipo`) | **(tipo de rol superintendente, p. ej. «Solicitud»/«Aviso» que ofrezca el select)** |
| Tag (`input-tag`) | `solicitud` |
| Asunto (`input-asunto`) | `Solicitud de aclaración de programa` |
| Contenido (`input-contenido`) | `Se solicita aclaración del periodo 1 del programa de obra.` |
| (`btn-emitir`) | clic |

> 🟢 **Esperado:** `select-tipo` solo muestra los tipos permitidos al rol contratista (matriz rol→tipo, art. 125 RLOPSRM); la nota se emite con su folio y queda «emitida» en `lista-notas`.

### ▢ PASO 24 — Firmar (aceptar) la nota emitida por la supervisión, como contraparte (POS-NOTA-03) — HU-09
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Login residente → `/bitacora/notas` → `btn-ver-bitacora` → `lista-notas`.

| Campo (testid) | Valor |
|---|---|
| Botón `btn-firmar-nota-{numero}` de la nota POS-NOTA-01 (no es emisor, es parte) | clic |

> 🟢 **Esperado:** Firma de la contraparte registrada (append-only, `bitacora_nota_firmas`); `firmas-nota-{numero}` y `aceptacion-{numero}` reflejan la firma; al firmar todo el roster la nota deriva «firmada» (art. 123 fr. III RLOPSRM).

### ▢ PASO 25 — Responder/vincular una nota (crea nota NUEVA ligada, la original intacta) (POS-NOTA-04) — HU-09
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** Login contratista → `/bitacora/notas` → `lista-notas`.

| Campo (testid) | Valor |
|---|---|
| Botón `btn-responder-{numero}` de la nota POS-NOTA-01 → reusa form | clic |
| Tipo (`select-tipo`) | **(tipo de su rol)** |
| Tag (`input-tag`) | `respuesta` |
| Asunto (`input-asunto`) | `Respuesta a verificación de avance` |
| Contenido (`input-contenido`) | `Se atiende la observación; el avance de excavación coincide con el programa.` |
| (`btn-emitir`) | clic |

> 🟢 **Esperado:** Se crea una nota NUEVA con `vinculada_a` apuntando a la original; la nota original NO se modifica (art. 123 fr. VIII/XII RLOPSRM); ambas aparecen en `lista-notas` con el vínculo visible.

### ▢ PASO 26 — La nota firmada queda lista como soporte vinculable de estimación (POS-NOTA-05) — HU-10
- **Cuenta:** supervision@sigecop.test (supervision) · **Pantalla:** Login supervisión → `/bitacora/consulta` (pestaña `pestana-consulta`, HU-10). (sin captura) verificar que la nota POS-NOTA-01 figura con estado «firmada» en la lista; abrir `btn-doc-nota-{numero}` para ver el documento imprimible.

> 🟢 **Esperado:** La nota firmada se lista en Consulta y, por estar `aceptacion='firmada'` y tipo≠apertura, será seleccionable como soporte en el wizard de estimación (art. 132 fr. II RLOPSRM).

### ▢ PASO 27 — Registrar avance C-01 P1 = 1000 CON foto de evidencia (POS-AVA-01) — HU-06
- **Cuenta:** contratista@sigecop.test (contratista, único editor) · **Pantalla:** Sidebar → «Avance y seguimiento» → `pestana-trabajos`/`link-trabajos` → `/seguimiento/trabajos-terminados` (contrato heredado; chip «Avance · HU-06»).

| Campo (testid) | Valor |
|---|---|
| Concepto (`cap-concepto`) | **C-01 Limpieza y trazo del terreno** |
| Periodo (`cap-periodo`) | **Periodo 1** |
| Cantidad (`cap-cantidad`) | `1000` |
| Observaciones (`cap-observaciones`) | `Avance físico P1 verificado en sitio (QA)` |
| Foto evidencia (`cap-foto-evidencia`) | `evidencia-C01-P1.jpg` (JPEG/PNG, A1 obligatorio en UI → `foto-evidencia-ok`) |
| (`btn-registrar-avance`) | clic |

> 🟢 **Esperado:** Avance registrado (201); se genera automáticamente la nota de bitácora tipo «avance» (art. 125 fr. II RLOPSRM); la foto se sube al id del avance creado. `cap-foto-evidencia` exigida por el front (sin foto el botón queda bloqueado, `foto-evidencia-falta`).

### ▢ PASO 28 — Registrar avance C-02 P1 = 250 con foto (toggle «todo el periodo») (POS-AVA-02) — HU-06
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** `/seguimiento/trabajos-terminados`.

| Campo (testid) | Valor |
|---|---|
| Concepto (`cap-concepto`) | **C-02 Excavación a máquina** |
| Periodo (`cap-periodo`) | **Periodo 1** |
| Todo el periodo (`toggle-todo-periodo`) | **ON** (autollena `cap-cantidad` = `ref-disponible` = 250, deriv.) |
| Observaciones (`cap-observaciones`) | (vacío) |
| Foto evidencia (`cap-foto-evidencia`) | `evidencia-C02-P1.jpg` → `foto-evidencia-ok` |
| (`btn-registrar-avance`) | clic |

> 🟢 **Esperado:** Avance C-02 P1 = 250 registrado (201); nota de bitácora «avance» automática; referencias `ref-programado-periodo`/`ref-ejecutado-acum`/`ref-disponible` se actualizan (disponible C-02 P1 = 0).

### ▢ PASO 29 — Verificar que el avance generó su nota automática en la bitácora (POS-AVA-03) — HU-06
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** `/bitacora/consulta` (HU-10) o `/bitacora/notas` → `btn-ver-bitacora` → `lista-notas`. (sin captura) localizar las notas tipo «avance» recién creadas por POS-AVA-01 y POS-AVA-02 (`nota-{numero}`).

> 🟢 **Esperado:** Por cada avance registrado aparece una nota de bitácora tipo «avance» con su folio correlativo (asiento automático, art. 125 fr. II RLOPSRM).

### ▢ PASO 30 — Corregir un avance (append-only: anula original + registro nuevo ligado + nota «dice/debe decir») (POS-AVA-04) — HU-06
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** `/seguimiento/trabajos-terminados` → fila del avance POS-AVA-02.

| Campo (testid) | Valor |
|---|---|
| Botón `btn-corregir-{id}` | clic |
| Cantidad (`edit-cantidad-{id}`) | `240` |
| Observaciones (`edit-obs-{id}`) | `Corrección: cantidad real ejecutada del periodo (QA)` |
| (`btn-guardar-edit-{id}`) | clic |

> 🟢 **Esperado:** La entrada original pasa a «anulada» y se crea una NUEVA vinculada por `reemplaza_a` con cantidad 240; se asienta nota «dice/debe decir» (no hay Editar/Eliminar; art. 123 fr. VI/VII RLOPSRM). Re-valida art. 118 sobre vigentes.

### ▢ PASO 31 — Consultar la curva de avance (HU-05, solo lectura) refleja el ejecutado (POS-AVA-05) — HU-05
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `pestana-curva`/`link-curva` → `/seguimiento/curva-avance` (chip «Avance · HU-05»).

| Campo (testid) | Valor |
|---|---|
| Concepto (`filtro-concepto`) | **Todos** (deriv./presentación) |
| Periodo (`filtro-periodo`) | **Todo el contrato** (deriv./presentación) |

> 🟢 **Esperado:** La curva S muestra serie «ejecutado» creciente hasta hoy; KPIs `avance-global` con el % derivado de Σ ejecutado ÷ Σ contratado; sin descuadres ni 500 (pantalla de consulta pura).

### ▢ PASO 32 — Agregar una segunda foto a un avance ya registrado (galería) (POS-AVA-06) — HU-06
- **Cuenta:** contratista@sigecop.test (contratista) · **Pantalla:** `/seguimiento/trabajos-terminados` → galería del avance C-01 P1 (componente FotosDeAvance).

| Campo (testid) | Valor |
|---|---|
| Botón `foto-avance-subir-{avanceId}` | `evidencia-C01-P1-detalle.png` (JPEG/PNG, ≤5 MB) |

> 🟢 **Esperado:** Se agrega la foto a la galería del avance (art. 132 fr. IV RLOPSRM); la imagen valida magic bytes y queda asociada con `subido_por` del usuario en sesión.


---

## Etapas 6-8 — Integración de estimación (5 pasos) · Presentación · Revisión/autorización

> Contrato base **OBRA-2026-QA-POS** (creado en Alta con su PDF firmado ligado → integrar pasa el gate del Bug #1). En cada pantalla elige `modal-contrato-<id>` de OBRA-2026-QA-POS (se hereda en `banner-contrato-activo`); pestañas del ciclo en `pestanas-ciclo`. Cuadre server-side, SIN IVA: subtotal=Σ ROUND(cant×pu,2) (art. 45 fr. IX), amortización 30% (art. 143 fr. I RLOPSRM), 5 al millar = 0.5% (art. 191 LFD).

### ▢ PASO 33 — Abrir wizard de integración con contrato heredado (POS-EST-01) — HU-12
- **Cuenta:** contratista@sigecop.test (contratista/superintendente) · **Pantalla:** Sidebar CICLOS → «Ciclo de estimación» (`/estimaciones/integracion`); en el modal `modal-contrato-<id>` = OBRA-2026-QA-POS.

> 🟢 **Esperado:** Se monta el wizard de 5 pasos; `chip-ciclo-hu` = «Estimación · HU-12»; banner `banner-contrato-activo` = OBRA-2026-QA-POS; stepper `wpaso-periodo`/`wpaso-generadores`/`wpaso-caratula`/`wpaso-soportes`/`wpaso-integrar`; NO sale el banner amarillo de «no eres superintendente» (contratista@ es el superintendente asignado).

### ▢ PASO 34 — Paso ① Periodo: seleccionar periodo vencido P1 (POS-EST-02) — HU-12
- **Cuenta:** contratista@sigecop.test · **Pantalla:** `/estimaciones/integracion` → panel `wstep-periodo`.

| Campo (testid) | Valor |
|---|---|
| Periodo (`periodo-selector`) | **Periodo 1** (autocompleta `periodo-inicio` → `2026-01-01`; `periodo-fin` → `2026-01-31`) |

> 🟢 **Esperado:** El periodo se carga; `btn-wsiguiente` habilitado (periodo con inicio y fin, art. 54 LOPSRM); avanza a Generadores.

### ▢ PASO 35 — Paso ② Generadores: capturar C-01 y C-02 dentro del plan del periodo (POS-EST-03) — HU-12
- **Cuenta:** contratista@sigecop.test · **Pantalla:** `wpaso-generadores` → `tabla-generadores`.

| Campo (testid) | Valor |
|---|---|
| Cantidad C-01 (`gen-cantidad-<id C-01>`) | `1000` |
| Cantidad C-02 (`gen-cantidad-<id C-02>`) | `250` (C-03/C-04 vacíos) |

> 🟢 **Esperado:** Sin semáforo rojo: `semaforo-plan-exceso` no aparece; barras `barra-fisico`/`barra-programado`/`barra-financiero` reflejan el avance; `btn-wsiguiente` habilitado (hay líneas, sin exceso art. 118 ni exceso de plan art. 45-A-X); avanza a Carátula.

### ▢ PASO 36 — Paso ③ Carátula: verificar NETO #1 = $69,500.00 (cuadre al centavo) (POS-EST-04) — HU-12
- **Cuenta:** contratista@sigecop.test · **Pantalla:** `wpaso-caratula` (carátula 100% server-side, preview en front).

| Campo (testid) | Valor |
|---|---|
| Deductivas (`caratula-deductivas`) | `0` (deriv. amortización/5-al-millar) |

> 🟢 **Esperado:** `caratula-numero-estimacion` = #1; subtotal $100,000.00; amortización 30% = $30,000.00 (art. 143 fr. I); 5 al millar = $500.00 (art. 191 LFD); `caratula-neto-preview` = **$69,500.00** SIN IVA (art. 2 fr. XIX RLOPSRM); `btn-wsiguiente` habilitado (neto ≥ 0); avanza a Soportes.

### ▢ PASO 37 — Paso ③ Carátula: tabla de saldos coherente (POS-EST-05) — HU-12
- **Cuenta:** contratista@sigecop.test · **Pantalla:** `wpaso-caratula` → `tabla-saldos` (lectura, deriv.).

> 🟢 **Esperado:** `saldo-estimacion-actual` = $100,000.00 (subtotal P1); `saldo-acumulado` = $100,000.00; `saldo-por-estimar` = $900,000.00 (sobre monto $1,000,000.00).

### ▢ PASO 38 — Paso ④ Soportes: vincular la nota de bitácora FIRMADA del periodo + checklist art. 132 (POS-EST-06) — HU-12
- **Cuenta:** contratista@sigecop.test · **Pantalla:** `wpaso-soportes` → `btn-abrir-buscador-notas` → `modal-vincular-notas`.

| Campo (testid) | Valor |
|---|---|
| Vincular nota | marcar la nota de avance FIRMADA (tipo `avance`, aceptacion=firmada) → `mb-btn-confirmar` |

> 🟢 **Esperado:** La nota aparece en `tabla-notas-vinculadas`; `checklist-art132` muestra fr. II como «incluido» (soporte art. 132 fr. II RLOPSRM); aviso `soportes-fotos-alcance` (fotos fuera de Etapa 1); `btn-wsiguiente` habilitado; avanza a Integrar.

### ▢ PASO 39 — Paso ⑤ Integrar estimación #1 (POS-EST-07) — HU-12
- **Cuenta:** contratista@sigecop.test · **Pantalla:** `wpaso-integrar` → panel `wstep-integrar`.

| Campo (testid) | Valor |
|---|---|
| Cierre (`check-cierre`) | marcar |
| Integrar (`btn-integrar`) | clic |

> 🟢 **Esperado:** `btn-integrar` se habilita al marcar `check-cierre`; al confirmar aparece `banner-integrada` con neto **$69,500.00**, estado «integrada» y enlace `link-presentar`; numeración atómica = #1 (carátula inmutable, trigger sigecop_estimacion_inmutable). NO se dispara el 409 de PDF (Bug #1) porque OBRA-2026-QA-POS sí tiene PDF firmado ligado.

### ▢ PASO 40 — Presentar la estimación #1 (inicia plazo art. 54) (POS-PRES-01) — HU-13
- **Cuenta:** contratista@sigecop.test · **Pantalla:** Pestaña `pestana-presentar` (o `link-presentar`) → `/estimaciones/envio`; contrato heredado.

| Campo (testid) | Valor |
|---|---|
| Presentar #1 (`btn-presentar-<id #1>`) | en la fila de la #1 (estado integrada) → clic |

> 🟢 **Esperado:** Toast «…presentada. Inicia el plazo de revisión (15 días, art. 54)»; la #1 pasa a estado «enviada» (mostrada «Presentada»); sello `sello-presentacion-<id #1>` y semáforo `semaforo-plazo-<id #1>` visibles; se genera nota automática sup_estimaciones (art. 125 fr. II-b).

### ▢ PASO 41 — Verificar chip y sello tras presentar (POS-PRES-02) — HU-13
- **Cuenta:** contratista@sigecop.test · **Pantalla:** `/estimaciones/envio` (lectura).

> 🟢 **Esperado:** `chip-ciclo-hu` = «Estimación · HU-13»; la #1 ya no muestra `btn-presentar` (no re-presentable); semáforo de 15 días de revisión derivado de la fecha de presentación (art. 54 LOPSRM).

### ▢ PASO 42 — Supervisión registra observación de carátula (POS-REV-01) — HU-15
- **Cuenta:** supervision@sigecop.test (supervisión) · **Pantalla:** Pestaña `pestana-revision` → `/estimaciones/revision`; `select-estimacion` = EST #1 · Ene 2026 · Presentada.

| Campo (testid) | Valor |
|---|---|
| Texto observación (`obs-caratula-nueva-texto`) | `Verificar amortización de anticipo 30% conforme art. 143 fr. I RLOPSRM.` |
| Tipo (`obs-caratula-nueva-tipo`) | **Aclaración** |
| Agregar (`btn-agregar-obs-caratula`) | clic |

> 🟢 **Esperado:** `chip-ciclo-hu` = «Estimación · HU-15»; la observación se agrega (append-only, estimacion_observaciones); SIN columna de severidad (eliminada, FIX 22-jun); `btn-turnar` se habilita al haber ≥1 observación.

### ▢ PASO 43 — Supervisión turna a residencia (POS-REV-02) — HU-15
- **Cuenta:** supervision@sigecop.test · **Pantalla:** `/estimaciones/revision`, EST #1 seleccionada.

| Campo (testid) | Valor |
|---|---|
| Turnar (`btn-turnar`) | clic |

> 🟢 **Esperado:** `banner-turnada`; la estimación queda turnada a residencia (turnado_a='residencia'); ya no se pueden agregar observaciones (gate de flujo secuencial supervisión→turna→residencia).

### ▢ PASO 44 — Turnar SIN observaciones (camino alterno) usando casilla (POS-REV-03) — HU-15
- **Cuenta:** supervision@sigecop.test · **Pantalla:** `/estimaciones/revision`, estimación enviada sin observaciones registradas.

| Campo (testid) | Valor |
|---|---|
| Sin observaciones (`chk-sin-observaciones`) | marcar |
| Turnar (`btn-turnar`) | clic |

> 🟢 **Esperado:** `chk-sin-observaciones` solo habilitado si totalObs=0; al marcarlo `btn-turnar` se habilita (puedeTurnar = sin_observaciones=true); `banner-turnada` (estimaciones-ciclo: turnar acepta n>0 O sin_observaciones=true).

### ▢ PASO 45 — Residencia AUTORIZA la estimación #1 (POS-REV-04) — HU-15
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Misma pantalla `pestana-revision` → `/estimaciones/revision`, EST #1 (enviada, ya turnada).

| Campo (testid) | Valor |
|---|---|
| Autorizar (`btn-autorizar`) | clic |

> 🟢 **Esperado:** `banner-autorizada`; `btn-autorizar` estaba habilitado solo por ser residencia + estado enviada + turnada (puedeResolver); estado #1 → «autorizada»; se genera nota automática res_estimaciones (art. 125 fr. I-b). Queda lista para el pago (el pago exige estado autorizada, art. 54).

### ▢ PASO 46 — Verificar cuadre al centavo del NETO autorizado contra el historial (POS-REV-05) — HU-14
- **Cuenta:** residente@sigecop.test · **Pantalla:** Pestaña `pestana-historial` → `/estimaciones/historial`; contrato heredado (lectura, deriv.).

> 🟢 **Esperado:** La #1 aparece estado «autorizada» con NETO **$69,500.00** = subtotal $100,000.00 − amortización $30,000.00 − 5 al millar $500.00, SIN IVA; coincide exactamente con `caratula-neto-preview` de POS-EST-04 (cuadre al centavo, sin tolerancia).

### ▢ PASO 47 — Integrar estimación #2 (P2) = NETO $330,125.00 (POS-EST-08) — HU-12
- **Cuenta:** contratista@sigecop.test · **Pantalla:** `/estimaciones/integracion` (mismo contrato heredado); recorrer los 5 pasos.

| Campo (testid) | Valor |
|---|---|
| ① Periodo (`periodo-selector`) | **Periodo 2** (2026-02-01→2026-02-28) |
| ② Cantidad C-02 (`gen-cantidad-<id C-02>`) | `250` |
| ② Cantidad C-03 (`gen-cantidad-<id C-03>`) | `150` |
| ② Cantidad C-04 (`gen-cantidad-<id C-04>`) | `1000` |
| ③ Deductivas (`caratula-deductivas`) | `0` |
| ⑤ Cierre (`check-cierre`) | marcar, `btn-integrar` |

> 🟢 **Esperado:** `caratula-neto-preview` y `banner-integrada` = **$330,125.00** = subtotal $475,000.00 − amortización 30% $142,500.00 − 5 al millar $2,375.00 (art. 191 LFD), SIN IVA; estado «integrada», numeración #2; carátula inmutable.

### ▢ PASO 48 — Presentar la estimación #2 (POS-PRES-03) — HU-13
- **Cuenta:** contratista@sigecop.test · **Pantalla:** Pestaña `pestana-presentar` → `/estimaciones/envio`.

| Campo (testid) | Valor |
|---|---|
| Presentar #2 (`btn-presentar-<id #2>`) | fila #2 (integrada) → clic |

> 🟢 **Esperado:** Toast «…presentada. Inicia el plazo de revisión (15 días, art. 54)»; #2 → «enviada»; sello y semáforo `semaforo-plazo-<id #2>` visibles; nota automática sup_estimaciones generada.


---

## Etapas 9-10 — Tránsito y registro de pago · Convenio modificatorio con ampliación

> Todo sobre el contrato **OBRA-2026-QA-POS** (creado en la Etapa de Alta con PDF firmado ligado, así que SÍ deja integrar/pagar; evade el [BUG CONOCIDO #1] que bloquea a los demás). La Estimación #1 (P1, neto **$69,500.00**) ya está **autorizada** y la #2 (P2, neto **$330,125.00**) sigue su ciclo. Al entrar a una pantalla de contrato sale `modal-elegir-contrato` → elige `modal-contrato-OBRA-2026-QA-POS`; se hereda en `banner-contrato-activo`. Sidebar plano: CICLOS → «Pago y tránsito» (`/pagos/transito`) y «Convenios» (`/contratos/modificatorios`).

### ▢ PASO 49 — Abrir el wizard de tránsito a pago y heredar el contrato (POS-PAGO-01) — HU-20
- **Cuenta:** finanzas@sigecop.test (finanzas) · **Pantalla:** Sidebar CICLOS → «Pago y tránsito» (`/pagos/transito`) → `modal-elegir-contrato` → `modal-contrato-OBRA-2026-QA-POS` (sin captura; selección de contrato).

> 🟢 **Esperado:** Se carga el wizard; `banner-contrato-activo` muestra OBRA-2026-QA-POS; `chip-ciclo-hu` = «Pago · HU-20»; pestañas `pestana-transito` (activa) y `pestana-registro`; stepper visible `wpaso-pago-suficiencia` / `wpaso-pago-soportes` / `wpaso-pago-instruccion` / `wpaso-pago-registro`; indicador `paso-indicador-pago` en paso 1.

### ▢ PASO 50 — Seleccionar la estimación autorizada #1 (el selector solo ofrece estado autorizada) (POS-PAGO-02) — HU-20
- **Cuenta:** finanzas@sigecop.test (finanzas) · **Pantalla:** `/pagos/transito` (contrato heredado).

| Campo (testid) | Valor |
|---|---|
| Estimación (`select-estimacion`) | **#1 · autorizada · $69,500.00** |

> 🟢 **Esperado:** El selector lista SOLO la #1 (autorizada); la #2 y cualquier integrada/enviada NO aparecen (art. 54 LOPSRM). Tras elegir, el wizard habilita el paso ① Suficiencia.

### ▢ PASO 51 — Paso ① Suficiencia: cargar techo de partida con partida específica obligatoria (POS-PAGO-03) — HU-20
- **Cuenta:** finanzas@sigecop.test (finanzas) · **Pantalla:** `/pagos/transito` → `wpaso-pago-suficiencia`.

| Campo (testid) | Valor |
|---|---|
| Partida (`input-partida`) | `62201` |
| Techo (`input-techo`) | `5000000` |
| Cargar techo (`btn-cargar-techo`) | (clic) |

> 🟢 **Esperado:** Se guarda el techo (UPSERT por ejercicio+dependencia+partida); aparece `badge-suficiente` (neto $69,500.00 ≤ techo $5,000,000.00, art. 24 párr. 2 LOPSRM); `btn-wsiguiente-pago` habilitado.

### ▢ PASO 52 — Paso ① → avanzar a Soportes (POS-PAGO-04) — HU-20
- **Cuenta:** finanzas@sigecop.test (finanzas) · **Pantalla:** `/pagos/transito` → `wpaso-pago-suficiencia`.

| Campo (testid) | Valor |
|---|---|
| Siguiente (`btn-wsiguiente-pago`) | (clic) |

> 🟢 **Esperado:** Avanza al panel `wstep-pago-soportes`; `paso-indicador-pago` marca paso 2; sin `wsiguiente-pago-motivo` de bloqueo.

### ▢ PASO 53 — Paso ② Soportes: cargar factura del periodo (metadato) (POS-PAGO-05) — HU-20
- **Cuenta:** contratista@sigecop.test (contratista/superintendente) · **Pantalla:** `/pagos/transito` → `wpaso-pago-soportes` (el contratista es quien promueve los soportes).

| Campo (testid) | Valor |
|---|---|
| Factura (`input-factura`) | `F-2026-001` |
| Cargar factura (`btn-cargar-factura`) | (clic) |

> 🟢 **Esperado:** El soporte «Factura» queda cargado (factura.cargado=true); solo el rol contratista promueve soportes (art. 132 fr. II); no se sube archivo, solo metadato (`nota-upload-deshabilitado`).

### ▢ PASO 54 — Paso ② Soportes: cargar CFDI (folio fiscal) (POS-PAGO-06) — HU-20
- **Cuenta:** contratista@sigecop.test (contratista/superintendente) · **Pantalla:** `/pagos/transito` → `wpaso-pago-soportes`.

| Campo (testid) | Valor |
|---|---|
| CFDI (`input-cfdi`) | `A1B2C3D4-1111-2222-3333-444455556666` |
| Cargar CFDI (`btn-cargar-cfdi`) | (clic) |

> 🟢 **Esperado:** El soporte «CFDI» queda cargado con folio no vacío (cfdiOk=true); la fianza de cumplimiento (read-only, leída de garantías HU-01) figura vigente (fianzaOk); soportes obligatorios completos → habilita avanzar.

### ▢ PASO 55 — Paso ② → avanzar a Instrucción con soportes completos (POS-PAGO-07) — HU-20
- **Cuenta:** contratista@sigecop.test (contratista/superintendente) · **Pantalla:** `/pagos/transito` → `wpaso-pago-soportes`.

| Campo (testid) | Valor |
|---|---|
| Siguiente (`btn-wsiguiente-pago`) | (clic) |

> 🟢 **Esperado:** Avanza al panel `wstep-pago-instruccion`; `paso-indicador-pago` marca paso 3; sin motivo de bloqueo (obligatorios_ok).

### ▢ PASO 56 — Paso ③ Instrucción: generar la instrucción de pago (POS-PAGO-08) — HU-20
- **Cuenta:** contratista@sigecop.test (contratista/superintendente) · **Pantalla:** `/pagos/transito` → `wpaso-pago-instruccion`.

| Campo (testid) | Valor |
|---|---|
| Generar instrucción (`btn-generar-instruccion`) | (clic) |

> 🟢 **Esperado:** Se emite la instrucción (estado emitida, art. 54); aparece `aviso-instruccion-generada` y `link-registrar-pago`; semáforo del plazo `semaforo-pago-badge` visible; UNIQUE estimacion_id impide doble instrucción.

### ▢ PASO 57 — Paso ③ → avanzar a Registrar pago (POS-PAGO-09) — HU-20
- **Cuenta:** finanzas@sigecop.test (finanzas) · **Pantalla:** `/pagos/transito` → `wpaso-pago-instruccion`.

| Campo (testid) | Valor |
|---|---|
| Siguiente (`btn-wsiguiente-pago`) | (clic) |

> 🟢 **Esperado:** Avanza al panel `wstep-pago-registro` con el form HU-21 embebido (RegistroPagoForm); `paso-indicador-pago` marca paso 4.

### ▢ PASO 58 — Paso ④ Registrar pago: importe derivado read-only y CFDI heredado (POS-PAGO-10) — HU-21
- **Cuenta:** finanzas@sigecop.test (finanzas) · **Pantalla:** `/pagos/transito` → `wpaso-pago-registro` (form embebido).

| Campo (testid) | Valor |
|---|---|
| Estimación (`pago-estimacion`) | **#1 · autorizada · $69,500.00** |

> 🟢 **Esperado:** `pago-importe-neto` muestra $69,500.00 read-only (derivado server-side, no se teclea ni viaja en el POST); `pago-cfdi` se autocompleta con el folio heredado de la instrucción (aviso `pago-cfdi-heredado`), editable; el selector solo ofrece la #1 autorizada (PAGABLES).

### ▢ PASO 59 — Paso ④ Registrar el pago de la estimación #1 (referencia SPEI numérica, CFDI, fecha factura no futura) (POS-PAGO-11) — HU-21
- **Cuenta:** finanzas@sigecop.test (finanzas) · **Pantalla:** `/pagos/transito` → `wpaso-pago-registro`.

| Campo (testid) | Valor |
|---|---|
| Fecha (`pago-fecha`) | `2026-06-20` |
| Referencia (`pago-referencia`) | `SPEI2026000123` |
| CFDI (`pago-cfdi`) | `A1B2C3D4-1111-2222-3333-444455556666` |
| Fecha factura (`pago-fecha-factura`) | `2026-06-20` |
| Fecha autorización (`pago-fecha-autorizacion`) | `2026-06-18` (opcional) |
| Observaciones (`pago-observaciones`) | `Pago estimación #1 — periodo 1 (QA-POS)` |
| Registrar pago (`btn-registrar-pago`) | (clic) |

> 🟢 **Esperado:** Aparece `aviso-pago-registrado` por $69,500.00; la estimación #1 pasa a «pagada»; referencia SPEI aceptada por ser numérica de 6+ dígitos (FIX SPEI numérica); fecha de factura no futura aceptada; fecha de pago no anterior a integrada_en; pago exacto del neto, no parcial (art. 54 LOPSRM).

### ▢ PASO 60 — El pago dentro de los 20 días: semáforo de plazo en verde (art. 54) (POS-PAGO-12) — HU-20
- **Cuenta:** finanzas@sigecop.test (finanzas) · **Pantalla:** `/pagos/transito` → `wpaso-pago-instruccion` (semáforo) o `/pagos/registro` `tabla-pagos` (lectura del semáforo; ancla = la más tardía de nota de autorización en bitácora y fecha de factura 2026-06-20; pago 2026-06-20).

> 🟢 **Esperado:** `semaforo-pago-badge` / plazo de la fila en verde (0 días vencidos, dentro de los 15 días contados desde el ancla, art. 54 LOPSRM); el pago no excede el plazo.

### ▢ PASO 61 — Verificar el pago registrado en la pestaña Registro del pago (POS-PAGO-13) — HU-21
- **Cuenta:** finanzas@sigecop.test (finanzas) · **Pantalla:** Pestaña `pestana-registro` (o sidebar Pago → «Registro del pago», `/pagos/registro`), contrato heredado (sin captura; lectura).

> 🟢 **Esperado:** `tabla-pagos` muestra una `fila-pago` de $69,500.00 contra la estimación #1, con su referencia SPEI, CFDI y fecha; `plazo-{id}` en verde; el saldo de la #1 queda liquidado.

### ▢ PASO 62 — Abrir Convenios y heredar el contrato (POS-CONV-01) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Sidebar CICLOS → «Convenios» (`/contratos/modificatorios`) → `modal-elegir-contrato` → `modal-contrato-OBRA-2026-QA-POS` (sin captura; selección de contrato).

> 🟢 **Esperado:** Se muestra el formulario de convenio; `banner-contrato-activo` = OBRA-2026-QA-POS; `chip-ciclo-hu` = «Convenio · HU-03»; pestañas `pestana-convenio` (activa), `pestana-consulta`, `pestana-expediente`; tablas read-only `tabla-convenios` y `tabla-versiones`.

### ▢ PASO 63 — Elegir tipo de convenio que toca el programa (monta el editor) (POS-CONV-02) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** `/contratos/modificatorios`.

| Campo (testid) | Valor |
|---|---|
| Tipo (`cm-tipo`) | **Monto** |

> 🟢 **Esperado:** Se monta el `editor-programa-convenio` (no aparece en tipo Plazo); el catálogo de existentes se muestra con clave/nombre/unidad congelados (disabled) y cantidad/P.U. originales bloqueados; tocaPrograma=true.

### ▢ PASO 64 — Panel «Ampliar»: P.U. heredado del original con candado (art. 59) (POS-CONV-03) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** `/contratos/modificatorios` → panel «Ampliar» (B4) del concepto C-02 (lectura del P.U. heredado del concepto C-02).

> 🟢 **Esperado:** El Precio unitario del panel «Ampliar» se muestra bloqueado con candado 🔒 = $200.00 (P.U. del original C-02); no es editable (art. 59 LOPSRM: la ampliación conserva el precio unitario pactado).

### ▢ PASO 65 — Panel «Ampliar»: capturar cantidad extra y periodo de ejecución (POS-CONV-04) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** `/contratos/modificatorios` → panel «Ampliar» del concepto C-02.

| Campo (testid) | Valor |
|---|---|
| Cantidad extra (`cm-ampliar-extra`) | `100` |
| Periodo (`cm-ampliar-periodo`) | **Periodo 3 (vigente, no cerrado)** |

> 🟢 **Esperado:** El botón de agregar se habilita (puedeAgregar = extra>0 && ampliarPeriodo); se genera una fila ADICIONAL con clave derivada (CONC-A) que hereda el P.U. $200.00; importe adicional derivado = 100 × $200.00 = $20,000.00 (ROUND server-side); el concepto adicional cae en periodo vigente (no en periodo cerrado).

### ▢ PASO 66 — Capturar motivo / dictamen técnico (obligatorio) (POS-CONV-05) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** `/contratos/modificatorios`.

| Campo (testid) | Valor |
|---|---|
| Motivo (`cm-motivo`) | `Ampliación de volumen de excavación por hallazgo de roca (dictamen técnico, art. 99 RLOPSRM).` |

> 🟢 **Esperado:** El campo se acepta (motivo.trim() no vacío); sin motivo el formulario no se puede promover (art. 99 RLOPSRM).

### ▢ PASO 67 — Capturar el oficio de soporte previo (obligatorio antes de promover) (POS-CONV-06) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** `/contratos/modificatorios`.

| Campo (testid) | Valor |
|---|---|
| Oficio (`cm-oficio`) | `OF-DRO-2026-045` |
| Folio (`cm-folio`) | (vacío, genera CM-NNN) |

> 🟢 **Esperado:** El campo oficio se acepta (oficioRef no vacío); habilita datosOk. Sin oficio el back devolvería 409 requiereOficio (art. 99 RLOPSRM, soporte documental previo).

### ▢ PASO 68 — Promover el convenio modificatorio (ampliación ≤25%, solo aviso) (POS-CONV-07) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** `/contratos/modificatorios`.

| Campo (testid) | Valor |
|---|---|
| Registrar convenio (`btn-registrar-convenio`) | (clic) |

> 🟢 **Esperado:** El convenio nace estado «registrado» (autorizado_por=NULL) con badge «Pendiente de autorización» (`conv-badge-registrado-{id}`); folio CM-001 generado; variación de monto (+$20,000 sobre $1,000,000 = +2%) NO supera 25% → sin `aviso-sfp`; se asienta nota automática de bitácora ligada (`conv-nota-{id}`, emisor = residente del contrato, art. 123 fr. III / 125 RLOPSRM).

### ▢ PASO 69 — El catálogo original se congela; el cambio entra como concepto ADICIONAL (POS-CONV-08) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** `/contratos/modificatorios` → `tabla-convenios` fila del CM-001 (o expediente HU-04) (sin captura; lectura del convenio registrado).

> 🟢 **Esperado:** Los conceptos originales (C-01..C-04) conservan cantidad/P.U. sin alterar (congelados); el incremento figura como fila adicional es_adicional=true que hereda el P.U. del original; badge «Adicional» visible (art. 101 RLOPSRM).

### ▢ PASO 70 — Subir el oficio de aprobación en PDF al convenio registrado (POS-CONV-09) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** `/contratos/modificatorios` → fila del convenio CM-001.

| Campo (testid) | Valor |
|---|---|
| Subir oficio (`conv-oficio-subir-{id}`) | archivo PDF válido (p. ej. oficio-CM-001.pdf, < 10 MB) |

> 🟢 **Esperado:** El PDF se adjunta (magic-bytes %PDF validados); append-only — un oficio por convenio (índice uq_contrato_doc_oficio_convenio); queda descargable vía `ver-oficio-{id}`.

### ▢ PASO 71 — Autorizar el convenio (acto formal de la dependencia, art. 59 p3) (POS-CONV-10) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** `/contratos/modificatorios` → `fila-convenio-{id}`.

| Campo (testid) | Valor |
|---|---|
| Autorizar (`conv-autorizar-{id}`) | (clic) |

> 🟢 **Esperado:** El convenio pasa a estado «autorizado» con badge «Autorizado» (`conv-badge-autorizado-{id}`); se sella autorizado_por (del JWT) y autorizado_en una sola vez (acto único, append-only); art. 59 párr. 3 + art. 99 p5.

### ▢ PASO 72 — Verificar el versionado del programa v1→v2 tras el convenio (POS-CONV-11) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** `/contratos/modificatorios` → `tabla-versiones` → `btn-ver-version-{v.id}` (sin captura; lectura de detalle-version).

> 🟢 **Esperado:** `tabla-versiones` lista 2 versiones del programa: v1 (original, superseded) y v2 (vigente con el concepto ampliado); `btn-ver-version-{id}` abre `detalle-version` con snapshot del programa nuevo (cada convenio que toca el programa crea una programa_version nueva, art. 59 LOPSRM / 99 RLOPSRM).

### ▢ PASO 73 — Verificar badge «Adicional» y curva por versiones en la curva de avance (POS-CONV-12) — HU-03
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Sidebar Avance → «Curva y desviación» (`/seguimiento/curva-avance`), contrato heredado OBRA-2026-QA-POS (sin captura; lectura).

> 🟢 **Esperado:** El concepto ampliado muestra badge «Adicional» (art. 101 RLOPSRM); al haber ≥2 versiones se dibujan las etapas por versión (plan original congelado + etapa vigente); el % financiero histórico NO se re-escala al subir el monto por convenio (cada punto se divide por el monto vigente en su fecha, G1).


---

## Etapas 11-13 — Expediente + reportes · Finiquito y cierre · Portafolio

> Flujo feliz hilado sobre **OBRA-2026-QA-POS** (creado en Alta con su PDF firmado ligado, evita Bug #1; sin estimaciones rechazadas, evita Bug #6; con programa de obra, evita Bug #27). Para la Etapa 13 (portafolio multi-contrato) se usan los contratos sembrados **SOP-2026-001..010**. Login: `#login-usuario` + `#login-password` (`Sigecop2026!`) + "Iniciar sesión"; al entrar a pantalla de contrato sale `modal-elegir-contrato` → `modal-contrato-<id>` y el contrato se hereda en `banner-contrato-activo`. Portafolio/Tablero/Padrón son rutas libres (sin modal ni banner).

### ▢ PASO 74 — Abrir el expediente consolidado del contrato hilado y verlo completo (POS-EXP-01) — HU-04
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Sidebar CICLOS → "Expediente" (`/contratos/expediente`); modal `modal-elegir-contrato` → `modal-contrato-<id>` de OBRA-2026-QA-POS.

| Campo (testid) | Valor |
|---|---|
| Buscar contrato (`modal-contrato-buscar`) | `OBRA-2026-QA-POS` |
| Selección del contrato | (banner deriv.) |

> 🟢 **Esperado:** Carga el expediente con `banner-contrato-activo`=OBRA-2026-QA-POS, chip `chip-ciclo-hu`="Expediente · HU-04" y los **9 bloques** `bloque-configuracion/catalogo/programa/fianzas/amortizacion/juridicos/roster/convenios/estimaciones` (HU-04, art. 45 RLOPSRM).

### ▢ PASO 75 — Verificar bloque Configuración: monto derivado y superintendente vigente (POS-EXP-02) — HU-04
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Expediente de OBRA-2026-QA-POS (POS-EXP-01) → bloque `bloque-configuracion`.

> 🟢 **Esperado:** `config-expediente` muestra **monto $1,000,000.00** (Σ ROUND(cant×pu,2), art. 45 fr. IX RLOPSRM) y `config-super-vigente` el superintendente vigente del roster.

### ▢ PASO 76 — Verificar bloque Catálogo: las 4 claves capturadas (POS-EXP-03) — HU-04
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Expediente de OBRA-2026-QA-POS → bloque `bloque-catalogo`.

> 🟢 **Esperado:** El catálogo lista las 4 claves **C-01, C-02, C-03, C-04** con su importe = ROUND(cant×pu,2) (clave capturada, art. 45 fr. IX RLOPSRM).

### ▢ PASO 77 — Verificar bloque Amortización del anticipo (plan proporcional) (POS-EXP-04) — HU-04
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Expediente de OBRA-2026-QA-POS → bloque `bloque-amortizacion`.

> 🟢 **Esperado:** `plan-amortizacion-expediente` muestra `plan-exp-monto-1`=$100,000.00, `plan-exp-monto-2`=$100,000.00, `plan-exp-monto-3`=$100,000.00 y `plan-exp-total`=**$300,000.00** (=30% de $1,000,000, art. 143 fr. I + 138 párr. 3 RLOPSRM).

### ▢ PASO 78 — Verificar bloque Estimaciones: total neto sin rechazadas (POS-EXP-05) — HU-04
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Expediente de OBRA-2026-QA-POS → bloque `bloque-estimaciones`.

> 🟢 **Esperado:** Filas de la Estimación #1 ($69,500.00) y #2 ($330,125.00); `estimaciones-total-neto`=**$399,625.00** (= #1 + #2; el expediente excluye rechazadas, ConsultaExpediente :484, P3 art. 54).

### ▢ PASO 79 — Buscar dentro del expediente por tipo de documento (POS-EXP-06) — HU-04
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Expediente de OBRA-2026-QA-POS → caja "Buscar en el expediente".

| Campo (testid) | Valor |
|---|---|
| Búsqueda (`input-busqueda`) | `fianzas` |
| "Buscar por" (select sin testid) | **documento** |

> 🟢 **Esperado:** Solo queda visible el bloque `bloque-fianzas` (filtro client-side, lógica Y por token); los demás se ocultan en pantalla.

### ▢ PASO 80 — Exportar el expediente consolidado a PDF (impresión completa) (POS-EXP-07) — HU-04
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Expediente de OBRA-2026-QA-POS → botón `btn-exportar-pdf`.

| Campo (testid) | Valor |
|---|---|
| Exportar PDF (`btn-exportar-pdf`) | clic (deriv. — window.print) |

> 🟢 **Esperado:** Se abre el diálogo de impresión del navegador con el **expediente consolidado completo** (todos los 9 bloques forzados `print:block`, aunque la búsqueda haya ocultado alguno en pantalla).

### ▢ PASO 81 — Reporte #1 Avance físico: descargar Excel con datos (contrato CON programa) (POS-EXP-08) — HU-19
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Sidebar → "Reportes" (`/reportes`); pestaña `pestana-reportes` heredando OBRA-2026-QA-POS.

| Campo (testid) | Valor |
|---|---|
| Periodo (`select-periodo-reporte`) | **Acumulado** |
| Exportar #1 Excel (`btn-exportar-1-excel`) | clic |

> 🟢 **Esperado:** Descarga un .xlsx de Avance físico **con encabezados y filas de datos** (curva S por concepto; el contrato tiene programa → no sale hoja en blanco, evita Bug #27).

### ▢ PASO 82 — Reporte #1 Avance físico: abrir PDF imprimible (POS-EXP-09) — HU-19
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/reportes` con OBRA-2026-QA-POS activo.

| Campo (testid) | Valor |
|---|---|
| Exportar #1 PDF (`btn-exportar-1-pdf`) | clic (deriv. — modal window.print) |

> 🟢 **Esperado:** Se abre el documento imprimible (modal) del avance físico con el corte de curva al día de hoy; diálogo de impresión del navegador.

### ▢ PASO 83 — Reporte #2 Avance financiero: Excel cuadrado (sin rechazadas) (POS-EXP-10) — HU-19
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/reportes` con OBRA-2026-QA-POS activo.

| Campo (testid) | Valor |
|---|---|
| Periodo (`select-periodo-reporte`) | **Acumulado** |
| Exportar #2 Excel (`btn-exportar-2-excel`) | clic |

> 🟢 **Esperado:** Descarga .xlsx; la fila **TOTALES** del neto coincide con la métrica "Estimado (Σ neto no rechazadas)" = **$399,625.00** (sin rechazadas porque QA-POS no tiene; evita Bug #6).

### ▢ PASO 84 — Reporte #3 Listado de estimaciones: Excel con las 2 estimaciones (POS-EXP-11) — HU-19
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/reportes` con OBRA-2026-QA-POS activo.

| Campo (testid) | Valor |
|---|---|
| Exportar #3 Excel (`btn-exportar-3-excel`) | clic |

> 🟢 **Esperado:** Descarga .xlsx con filas Estimación #1 (neto $69,500.00) y #2 (neto $330,125.00) y fila **TOTALES** neto = $399,625.00 (trazabilidad art. 54; sin rechazadas en QA-POS).

### ▢ PASO 85 — Reporte #4 Observaciones: Excel descarga con datos (POS-EXP-12) — HU-19
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/reportes` con OBRA-2026-QA-POS activo.

| Campo (testid) | Valor |
|---|---|
| Exportar #4 Excel (`btn-exportar-4-excel`) | clic |

> 🟢 **Esperado:** Descarga .xlsx de Observaciones con encabezados (incluye columna "Descripción") y las observaciones registradas en la revisión técnica del contrato.

### ▢ PASO 86 — Reporte #5 Bitácora: PDF habilitado (contrato con bitácora aperturada) (POS-EXP-13) — HU-19
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/reportes` con OBRA-2026-QA-POS activo (bitácora ya abierta en etapa previa).

| Campo (testid) | Valor |
|---|---|
| Exportar #5 PDF (`btn-exportar-5-pdf`) | clic (deriv. — modal window.print) |

> 🟢 **Esperado:** El botón está **habilitado** (no muestra "Sin bitácora aperturada" porque QA-POS tiene apertura firmada); abre el documento imprimible de la bitácora y el diálogo de impresión.

### ▢ PASO 87 — Reporte #6 Modificatorios: Excel descarga (POS-EXP-14) — HU-19
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/reportes` con OBRA-2026-QA-POS activo.

| Campo (testid) | Valor |
|---|---|
| Exportar #6 Excel (`btn-exportar-6-excel`) | clic |

> 🟢 **Esperado:** Descarga .xlsx de Modificatorios con encabezados (conceptos originales congelados vs adicionales separados, art. 101 RLOPSRM; Rev. SFP "Sí" si Δ>25% art. 102).

### ▢ PASO 88 — Reporte #7 Penalizaciones: Excel descarga (POS-EXP-15) — HU-19
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** `/reportes` con OBRA-2026-QA-POS activo.

| Campo (testid) | Valor |
|---|---|
| Exportar #7 Excel (`btn-exportar-7-excel`) | clic |

> 🟢 **Esperado:** Descarga .xlsx de Penalizaciones con la pena por atraso DERIVADA por identidad de carátula (art. 46 Bis LOPSRM + 86-88 RLOPSRM) y el 5 al millar (art. 191 LFD).

### ▢ PASO 89 — Ver el desglose del finiquito (saldo server-side) antes de cerrar (POS-FIN-01) — HU-24
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Sidebar CICLOS → "Cierre / finiquito" (`/contratos/finiquito`); contrato heredado OBRA-2026-QA-POS; pestaña `pestana-finiquito`.

> 🟢 **Esperado:** Chip `chip-ciclo-hu`="Finiquito · HU-24"; `finiquito-desglose` muestra Neto autorizado $69,500.00 (solo #1 pagada) − Pagado $69,500.00 − Anticipo no amortizado $270,000.00; `finiquito-saldo`=**−$270,000.00**, `finiquito-afavor`=**la DEPENDENCIA** (art. 171 / 168-172 RLOPSRM).

### ▢ PASO 90 — Probar ajuste final como vista previa (sin persistir) (POS-FIN-02) — HU-24
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Finiquito de OBRA-2026-QA-POS (POS-FIN-01).

| Campo (testid) | Valor |
|---|---|
| Ajustes (`finiquito-ajustes`) | `0` |
| Observaciones (`finiquito-observaciones`) | `Finiquito conforme art. 64 LOPSRM y arts. 168-172 RLOPSRM; saldo conciliado.` |

> 🟢 **Esperado:** Al teclear el ajuste el saldo se re-calcula server-side (preview `?ajustes=` sin persistir): `finiquito-saldo` permanece **−$270,000.00** (ajuste $0.00 no lo mueve).

### ▢ PASO 91 — Cerrar el contrato (elaborar finiquito) en doble paso de confirmación (POS-FIN-03) — HU-24
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Finiquito de OBRA-2026-QA-POS.

| Campo (testid) | Valor |
|---|---|
| Abrir cierre (`btn-abrir-cierre`) | clic |
| Confirmar cierre (`finiquito-confirmar` → `btn-confirmar-cierre`) | clic |

> 🟢 **Esperado:** `btn-abrir-cierre` habilitado (QA-POS tiene bitácora); abre `finiquito-confirmar` ("inalterable, art. 172… no se puede deshacer"); al confirmar aparece banner **`finiquito-cerrado`**, se asienta nota tipo 'finiquito' y el contrato pasa a estado='cerrado' (art. 64 LOPSRM / 168-172 RLOPSRM).

### ▢ PASO 92 — Ver/imprimir el documento de finiquito (art. 170) (POS-FIN-04) — HU-24
- **Cuenta:** residente@sigecop.test (residente) · **Pantalla:** Finiquito de OBRA-2026-QA-POS ya cerrado (POS-FIN-03).

| Campo (testid) | Valor |
|---|---|
| Ver documento (`btn-ver-documento-finiquito`) | clic |
| Imprimir (`btn-imprimir-finiquito`) | clic |

> 🟢 **Esperado:** Abre modal `documento-finiquito` con `finiquito-doc-saldos` (importes, saldo −$270,000.00, extinción art. 172, garantía de vicios ocultos art. 66 LOPSRM); `btn-imprimir-finiquito` lanza el diálogo de impresión.

### ▢ PASO 93 — Abrir el Portafolio ejecutivo (vista multi-contrato, ruta libre) (POS-PORT-01) — HU-18
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Sidebar VISTAS EJECUTIVAS → "Portafolio" (`/portafolio`); ruta libre, **sin modal ni banner**.

| Campo (testid) | Valor |
|---|---|
| Agrupar por (`select-agrupar-por`) | **Ninguno** (default) |

> 🟢 **Esperado:** Carga el portafolio con filas `fila-portafolio-SOP-2026-001`..`SOP-2026-010`, cada una con semáforo `semaforo-dot-<folio>` (data-color) y `semaforo-badge-<folio>`; contadores `contador-verde`/`contador-amarillo`/`contador-rojo` (HU-18, todo derivado server-side).

### ▢ PASO 94 — Verificar el cálculo del semáforo de un contrato (verde/amarillo/rojo) (POS-PORT-02) — HU-18
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Portafolio (POS-PORT-01) → fila `fila-portafolio-SOP-2026-001`.

> 🟢 **Esperado:** El color responde a la suma de 3 factores (desviación avance vs programado, atrasos en plazos legales art. 54 15d, pendientes sin atender): total ≤1 **verde**, 2-3 **amarillo**, ≥4 **rojo** (umbrales lib/umbrales-semaforo.js).

### ▢ PASO 95 — Abrir el panel de detalle de un contrato (doble clic en fila) (POS-PORT-03) — HU-18
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Portafolio → doble clic en `fila-portafolio-SOP-2026-001`.

| Campo (testid) | Valor |
|---|---|
| Fila contrato (`fila-portafolio-SOP-2026-001`) | doble clic |
| Cerrar detalle (`btn-cerrar-detalle-contrato`) | clic |

> 🟢 **Esperado:** Abre `panel-detalle-contrato` con los KPIs derivados del contrato (avance por valor Σcant×pu, penalizaciones reales, banderas como `riesgo-pago-sin-avance` si aplica); `btn-cerrar-detalle-contrato` lo cierra.

### ▢ PASO 96 — Agrupar el portafolio por Contratista (POS-PORT-04) — HU-18
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Portafolio → control `select-agrupar-por`.

| Campo (testid) | Valor |
|---|---|
| Agrupar por (`select-agrupar-por`) | **Contratista** |

> 🟢 **Esperado:** Las filas se reagrupan en bloques `grupo-<label>` por contratista (agrupación client-side); las filas y semáforos se conservan dentro de cada grupo.

### ▢ PASO 97 — Agrupar el portafolio por Ejercicio fiscal (POS-PORT-05) — HU-18
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Portafolio → control `select-agrupar-por`.

| Campo (testid) | Valor |
|---|---|
| Agrupar por (`select-agrupar-por`) | **Ejercicio fiscal** |

> 🟢 **Esperado:** Las filas se agrupan por `grupo-<año>` derivado de EXTRACT(YEAR FROM fecha_inicio) server-side (criterio del equipo: año de inicio = ejercicio presupuestal); la opción "Tipo de contratación" aparece **deshabilitada**.

### ▢ PASO 98 — Navegar del semáforo al expediente del contrato (POS-PORT-06) — HU-18
- **Cuenta:** dependencia@sigecop.test (dependencia) · **Pantalla:** Portafolio → clic en `semaforo-badge-SOP-2026-001`.

| Campo (testid) | Valor |
|---|---|
| Badge semáforo (`semaforo-badge-SOP-2026-001`) | clic (deriv. — navegación) |

> 🟢 **Esperado:** Redirige a `/contratos/expediente?contrato=<id>` (preselección del contrato SOP-2026-001 heredada en el banner).
