# PLAN DE PRUEBAS DEFINITIVO — SIGECOP · VALORES EXACTOS (18-jun-2026 · **actualizado 21-jun a la UI de hoy**)

> **Para imprimir y palomear casilla por casilla.** Da de alta **UN contrato desde cero**
> (`OBRA-2026-PRUEBA-FINAL`) y recórrelo de punta a punta — hasta el **finiquito** — **en el orden oficial del
> ciclo** (el orden en que el profe revisaría un contrato): registro → login → **elegir contrato (MODAL)** →
> **alta** (los 7 pasos del wizard) → garantías → bitácora → notas → avance → curva → atrasos → **estimación
> (WIZARD)** → presentar → revisión/autorización → reingreso → historial → tablero → **pago (WIZARD de 4 pasos)** →
> convenio (+ **autorización**) → portafolio → reportes → roster/sustitución → padrón → **finiquito**.
>
> **Refleja el sistema TRAS los rediseños 3A (contrato global) + P4-ALT (pestañas-enlace) de junio 21.**

### ⚠️ CAMBIOS GRANDES desde el 18-jun — léelos ANTES (afectan a TODO el plan)
1. **CONTRATO ACTIVO GLOBAL (3A).** Ya **NO hay un `select-contrato` por pantalla**. Al entrar a cualquier
   pantalla que necesita contrato aparece un **MODAL bloqueante** «¿En qué contrato vas a trabajar?»
   (`data-testid="modal-elegir-contrato"`). Eliges el contrato (botón **`modal-contrato-<id>`**, `<id>` = id
   numérico del backend) y **todas** las pantallas lo HEREDAN. En cada pantalla de contrato se pinta el banner
   **`banner-contrato-activo`** con botón **«Cambiar»** (`btn-cambiar-contrato`) y, arriba en la barra, el chip
   **`chip-contrato-activo`** (clic = reabre el modal). **Para cambiar de contrato** usas ese chip/banner, NO un
   select por pantalla.
   - **Salidas del modal:** elegir un contrato · buscador `modal-contrato-buscar` · «Ver portafolio →»
     (`modal-contrato-portafolio`, solo roles con HU-18) · «+ Crear contrato nuevo» (`modal-contrato-crear` /
     `modal-contrato-crear-footer`, solo roles que dan de alta = HU-01 nivel 'E') · «← Ir al inicio»
     (`modal-contrato-inicio`) · «Cerrar sesión» (`modal-contrato-salir`).
   - **Estados sin contratos:** `modal-contrato-sin-crear` (rol que puede crear) / `modal-contrato-sin-asignados`
     (rol que no) / `modal-contrato-vacio` (búsqueda sin match).
   - **Rutas LIBRES (no fuerzan el modal):** `/` (Inicio), `/portafolio`, `/estimaciones/tablero`,
     `/admin/empresas`, `/usuarios/solicitudes`, `/contratos/alta`. Inicio es **puerto seguro**.
   - **Se limpia el contrato activo** al **Cerrar sesión** (botón "Salir" o `modal-contrato-salir`) y al entrar con
     **OTRA cuenta** (no se hereda entre usuarios) → el modal se relanza. Deep-link `?contrato=ID` adopta el
     contrato como activo automáticamente.
2. **PESTAÑAS-ENLACE POR CICLO (P4-ALT).** Cada ciclo tiene una **barra de pestañas** (`data-testid="pestanas-ciclo"`)
   donde cada pestaña (**`pestana-<key>`**) **NAVEGA** a la pantalla hermana del ciclo (no la incrusta). **El
   antiguo bloque «EN PARALELO» (`par-revision`/`par-reingreso`/`par-historial`/`par-tablero`) FUE ELIMINADO** y
   reemplazado por estas pestañas. Navegar entre pantallas de un ciclo = clic en su pestaña (o en el sidebar plano).
3. **CHIP DE HU PUNTUAL.** La barra de pestañas muestra un chip **`chip-ciclo-hu`** con el ciclo + la HU exacta de
   la pantalla actual (p. ej. «Avance · HU-05», «Pago · HU-20», «Estimación · HU-12»). Si la pantalla no es una
   pestaña-con-HU (índice de ambiente o pestaña gateada por rol) cae al **rango** del ciclo (p. ej. «Bitácora · HU 08–11»).
4. **SIDEBAR plano por ciclos, colapsable.** El `<aside data-testid="sidebar">` se colapsa con el botón
   **`btn-toggle-sidebar`** (en la barra superior, AppShell). Los items del sidebar **NO tienen testid**: se
   localizan por su **texto** (NavLink). El item del ciclo se **resalta** también en sus pantallas hermanas. Botón
   al pie: **«← Cambiar de rol»** (por texto).
5. **NOTIFICACIONES.** Campana 🔔 (badge `campana-atrasos`) → pop-up `drop-campana` con accesos directos por ítem
   (`drop-campana-items`) + enlaces «Ir a «Por firmar» →» (`drop-firmar-ir`), «Ver alertas de atraso →»
   (`drop-campana-ir`), «Ver solicitudes de registro →» (`drop-solicitudes-ir`) y **«Ver todas las notificaciones →»**
   (`drop-ver-todas`) que abre el **centro** (`centro-notificaciones`, cierra con `centro-cerrar`,
   filtro `centro-solo-activo`).
6. **HU-21 (pago).** El selector de estimación a pagar (`pago-estimacion`) ofrece **SOLO estado `'autorizada'`**
   (constante `PAGABLES = new Set(['autorizada'])`). Antes aceptaba integrada/presentada.

### ⚠️ Notas de fidelidad que SIGUEN vigentes
1. **El login NO usa testid:** los campos son `id="login-usuario"` / `id="login-password"` (localiza por
   `#login-usuario` / `#login-password`) y el botón es **«Iniciar sesión»** (por texto). El enlace a registro es
   **«Regístrate»** (`link-registro`) y el de volver **«Inicia sesión»** (`link-login`).
2. **Los testids con `${id}` / `${i}` / `${numero}` son DINÁMICOS** y el sufijo es el **id numérico del backend**
   (de `contrato_concepto`, de garantía, de estimación, de contrato…), **NO la clave** `C-01`. Ejemplos reales:
   `gen-cantidad-${contrato_concepto_id}`, `btn-asentar-${contrato_concepto_id}`, `btn-presentar-${e.id}`,
   `conv-autorizar-${id}`, `modal-contrato-${id}`, `fila-portafolio-${folio}` (este lleva el folio literal).
3. **El Alta NO tiene contrato activo** (crea uno nuevo; es ruta libre). **Las demás pantallas de contrato heredan**
   el contrato activo vía `banner-contrato-activo` — ya no hay que volver a elegirlo. Las vistas multi-contrato
   (**Portafolio, Tablero, Padrón**) ignoran el contrato activo (no muestran banner).
4. **`select-estimacion` SÍ existe** (es distinto del contrato): en Revisión (HU-15), Reingreso (HU-16) y el
   wizard de Pago (HU-20). Ahí eliges la estimación dentro del contrato heredado.
5. **Guarda de ruta (deep-link):** entrar por URL a una HU/ruta no permitida para tu rol **redirige a Inicio**
   (`<Navigate to="/" />`), no muestra error.
6. **Generación de reportes/Excel = 100% en el navegador** (jsPDF/ExcelJS): esos botones **no** producen 400/409.

> **Reglas de cuadre (server-side, SIN cambios):** monto `= Σ ROUND(cant×PU,2)` (art. 45 fr. IX) · programa
> `Σ planeado = contratado` (100%) · plan amort `Σ = ROUND(monto×anticipo%,2)` (art. 143 fr. I) · carátula
> `neto = subtotal − amortización − 5 al millar − deductivas − retención_atraso`, **SIN IVA** · 5 al millar =
> art. 191 LFD (0.5%). **La math NO cambió.** Estimación #1 = **$69,500.00** · Estimación #2 = **$330,125.00**.

---

## 0. PREPARACIÓN

```bash
# Reinicia para forzar grafo de módulos limpio (Vite re-lee fuentes) y abre pestaña NUEVA / incógnito.
docker restart sigecop_frontend sigecop_backend
docker logs --tail 5 sigecop_frontend        # espera "VITE ready"
# Navegador: Ctrl+Shift+R en http://localhost:5173
# Confirma el rediseño: login contratista@ → entra a una pantalla de contrato → aparece el MODAL
#   "¿En qué contrato vas a trabajar?" (modal-elegir-contrato). El sidebar es una LISTA PLANA de ciclos.
```
- **NO necesitas aplicar DDL** (las 4 ya están en tu BD local). Si reseteaste la BD, ver §10.
- **Sembrar demo (opcional):** `docker exec sigecop_backend npm run reseed:cuentas && docker exec sigecop_backend npm run seed:demo`.

### 0.1 Cómo leer cada paso
**CUENTA** · **PANTALLA** (cómo llegar: sidebar plano / pestaña del ciclo / banner-contrato) · **DATOS EXACTOS
(testid → valor)** · **RESULTADO** (incluido el chip de HU). 🟢 = caso bueno (ACEPTA) · 🔴 = caso malo a propósito
(RECHAZA/AVISA). Las 🔴 son las que más valen. **▢** = casilla para palomear.

---

## 1. Cuentas demo (contraseña común `Sigecop2026!`)
> Login = email + contraseña: `#login-usuario`, `#login-password`, botón **«Iniciar sesión»** (sin testid). El rol se deduce.

| Cuenta | Rol | Empresa | Papel |
|---|---|---|---|
| `residente@sigecop.test` | residente | Dependencia Demo | Da de alta, abre/firma bitácora, **autoriza/rechaza** estimación, finiquito |
| `contratista@sigecop.test` | contratista | Constructora Demo | **Superintendente:** integra/presenta/reingresa, registra avance |
| `supervision@sigecop.test` | supervision | Supervisión Externa Demo | Observa, firma, **turna** la estimación |
| `dependencia@sigecop.test` | dependencia | Dependencia Demo | Contratante; crea **y autoriza** convenios; padrón; roster; finiquito |
| `finanzas@sigecop.test` | finanzas | Dependencia Demo | Tránsito a pago + **registra el pago** (único que puede) |

> **OJO (estimación):** "contratista@" debe ser el **superintendente asignado** al contrato (lo es en el dataset).
> Si no, integrar/presentar da **403**.

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

## 3. CÓMO NAVEGAR — **MODAL DE CONTRATO + SIDEBAR PLANO + PESTAÑAS-ENLACE**

### 3.0 El MODAL de contrato (3A) — primer salto SIEMPRE
> Al hacer login y abrir cualquier pantalla de contrato, sale el modal `modal-elegir-contrato`. **Elige
> `OBRA-2026-PRUEBA-FINAL`** (botón `modal-contrato-<id>`). A partir de ahí TODAS las pantallas lo heredan; el
> banner `banner-contrato-activo` y el chip `chip-contrato-activo` lo muestran. Para cambiar: clic en el chip o en
> «Cambiar» (`btn-cambiar-contrato`) → reabre el modal.

| Acción en el modal | testid | Notas |
|---|---|---|
| Buscar contrato | `modal-contrato-buscar` | filtra por folio u objeto |
| **Elegir contrato** | `modal-contrato-<id>` | `<id>` = id numérico del backend |
| Crear contrato (roles HU-01 'E') | `modal-contrato-crear` / `modal-contrato-crear-footer` | → `/contratos/alta` |
| Ver portafolio (roles HU-18) | `modal-contrato-portafolio` | → `/portafolio` |
| Ir al inicio | `modal-contrato-inicio` | → `/` (puerto seguro) |
| Cerrar sesión | `modal-contrato-salir` | limpia contrato + logout |

### 3.1 SIDEBAR PLANO (lista de ciclos; sin acordeón)
> `<aside data-testid="sidebar">`. **Los items NO tienen testid** → localiza por **texto** (NavLink). Colapsar:
> `btn-toggle-sidebar` (barra superior). El item del ciclo se resalta también en sus pantallas hermanas.

| Grupo | Ítem (texto literal → ruta) | HU / pill |
|---|---|---|
| **(arriba)** | 🏠 **Inicio** → `/` | — (todo rol) |
| **Ciclos** | 📄 **Alta de contratos** → `/contratos/alta` | HU-01 |
| | 🛡️ **Fianzas / garantías** → `/contratos/fianzas` | HU-02 |
| | 📐 **Ciclo de estimación** → `/estimaciones/integracion` | HU 12–16 |
| | 📓 **Bitácora** → `/bitacora/ambiente` | HU 05–11 *(rango del padre)* |
| | 🏗️ **Avance y seguimiento** → `/seguimiento/trabajos-terminados` | HU 05–07 |
| | 💳 **Pago y tránsito** → `/pagos/transito` | HU 20–21 |
| | 📝 **Convenios** → `/contratos/modificatorios` | HU-03 |
| | 🏁 **Cierre / finiquito** → `/contratos/finiquito` | (ruta fija, sin pill) |
| | 🗂️ **Expediente** → `/contratos/expediente` | HU-04 |
| **Vistas ejecutivas** | 📊 **Portafolio** → `/portafolio` (HU-18) · 📈 **Tablero** → `/estimaciones/tablero` (HU-17) · 📤 **Reportes** → `/reportes` (HU-19) · 🗺️ **Ciclo de vida** → `/contratos/ciclo-vida` | — |
| **Administración** | 🏢 **Padrón de empresas** → `/admin/empresas` · 👥 **Roster / sustitución** → `/contratos/roster` · ✅ **Solicitudes de registro** → `/usuarios/solicitudes` | — |
| **(al pie)** | **«← Cambiar de rol»** (botón por texto) | — |

> **El sidebar se FILTRA por rol** (promoción de huérfanos):
> - `dependencia@` (no ve el padre del ciclo de estimación) verá, sueltos: **Presentar (HU-13)**, **Revisión /
>   autorización (HU-15)**, **Reingreso (HU-16)**, **Historial (HU-14)**. *(HU-05 Curva NO se promueve a
>   dependencia — el grupo de Avance está gated por rol `[contratista,residente,supervision]`.)*
> - `finanzas@` verá: **Fianzas / garantías (HU-02)**, **Pago y tránsito (HU 20–21)** y **Reportes (HU-19)**.
>   *(finanzas NO ve Tablero, ni Administración, ni Ciclo de vida.)*
> - **HU-19 Reportes lo ven TODOS los roles** (residente='E', resto='C').
> - **Grupo sin items accesibles = sin título.**

### 3.2 PESTAÑAS-ENLACE por ciclo (P4-ALT) — navegar entre hermanas
> Barra `pestanas-ciclo` con chip `chip-ciclo-hu`. Cada pestaña (`pestana-<key>`) lleva a la hermana **arrastrando
> el contrato activo** (`?contrato=ID`). Si tu rol no accede a una pestaña, aparece **deshabilitada** (no rebota).

| Ciclo | Pestañas (`pestana-<key>` → ruta · HU) |
|---|---|
| **avance** | `pestana-trabajos` → `/seguimiento/trabajos-terminados` (HU-06) · `pestana-curva` → `/seguimiento/curva-avance` (HU-05) · `pestana-alertas` → `/seguimiento/alertas` (HU-07) |
| **bitacora** | `pestana-bitacora` → `/bitacora/ambiente` (roles T) · `pestana-consulta` → `/bitacora/consulta` (HU-10) · `pestana-minutas` → `/bitacora/minutas` (HU-11) |
| **estimacion** | `pestana-integrar` → `/estimaciones/integracion` (HU-12) · `pestana-presentar` → `/estimaciones/envio` (HU-13) · `pestana-revision` → `/estimaciones/revision` (HU-15) · `pestana-reingreso` → `/estimaciones/reingreso` (HU-16) · `pestana-historial` → `/estimaciones/historial` (HU-14) · `pestana-tablero` → `/estimaciones/tablero` (HU-17) |
| **pago** | `pestana-transito` → `/pagos/transito` (HU-20) · `pestana-registro` → `/pagos/registro` (HU-21) |
| **convenio** | `pestana-convenio` → `/contratos/modificatorios` (HU-03) · `pestana-consulta` → `/bitacora/consulta` (HU-10) · `pestana-expediente` → `/contratos/expediente` (HU-04) |
| **expediente** | `pestana-expediente` → `/contratos/expediente` (HU-04) · `pestana-reportes` → `/reportes` (HU-19) |
| **finiquito** | `pestana-finiquito` → `/contratos/finiquito` (roles dependencia/residente) · `pestana-expediente` → `/contratos/expediente` (HU-04) |

---

## 4. DATASET CANÓNICO — `OBRA-2026-PRUEBA-FINAL` (math cuadrada al centavo, **sin cambios**)

### 4.1 Datos generales (Alta, paso 0)
| Campo (testid) | Valor |
|---|---|
| **Tipo de contratación** *(select **SIN testid**, una sola opción ya seleccionada)* | **Obra pública sobre la base de precios unitarios** *(no se teclea; verifica que es la única opción)* |
| Folio (`dg-folio`) | `OBRA-2026-PRUEBA-FINAL` |
| Objeto (`dg-objeto`) | `Construcción de aula didáctica — campus UAGRO (prueba E2E final)` |
| Ubicación (`dg-ubicacion`) | `Av. Juárez s/n, Chilpancingo, Gro.` |
| Dependencia (`dg-dependencia`) | **Lic. Diana Dependencia Demo** *(si no hay opciones → aviso `sin-dependencias`)* |
| Plazo en días (`dg-plazo`) | `90` |
| Fecha de inicio (`dg-fecha`) | `2026-01-01` |
| % pena por atraso (`dg-pena`) | *(VACÍO)* → sin retención por atraso en el camino feliz |
| Superintendente (`select-superintendente`) | **Arq. Carlos Contratista Demo** |
| Supervisión (`select-supervision`) | **Ing. Sofía Supervisión Demo** |

> **Derivados/lectura (verificar, no se teclean):** monto (`monto-derivado`) · término **2026-03-31**
> (`termino-derivado`) · total con IVA (`total-con-iva`) · empresa del superintendente (`empresa-contratista`) ·
> empresa de supervisión (`empresa-supervision`) · residente (`equipo-residente`) · si super y supervisión son la
> **misma empresa** → aviso `aviso-misma-empresa`. **Siguiente →** (`btn-siguiente`).

### 4.2 Catálogo de conceptos (Alta, paso 1) → $1,000,000.00
> Botón **«+ Agregar concepto»** (**sin testid**, por texto) por cada fila. El **importe se DERIVA** (no se teclea):
> teclea P.U. *o* importe.

| # i | Clave (`concepto-clave-${i}`) | Concepto (`concepto-concepto-${i}`) | Unidad (`concepto-unidad-${i}`) | Cant. (`concepto-cantidad-${i}`) | P.U. (`concepto-pu-${i}`) | Importe (`concepto-importe-${i}`) |
|---|---|---|---|---|---|---|
| 0 | `C-01` | Limpieza y trazo del terreno | `m²` | `1000` | `50.00` | 50,000.00 |
| 1 | `C-02` | Excavación a máquina | `m³` | `500` | `200.00` | 100,000.00 |
| 2 | `C-03` | Concreto f'c=200 kg/cm² | `m³` | `300` | `2500.00` | 750,000.00 |
| 3 | `C-04` | Acero de refuerzo fy=4200 | `kg` | `2000` | `50.00` | 100,000.00 |
| | | | | | **Σ derivada** | **$1,000,000.00** 🟢 |

> **Verifica:** `monto-derivado` = **$1,000,000.00** · `catalogo-total` · `catalogo-indicador` en verde.
> **Candado:** clave obligatoria y única (≤40 car.); concepto+unidad+cant+P.U. > 0. **Siguiente →** (`btn-siguiente`).

### 4.3 Programa de obra (Alta, paso 2) — Σ por concepto = 100%
| Campo | Valor |
|---|---|
| Ciclo (`select-ciclo`) | **`mensual`** → opción **"Mensual (cada ~30 días)"** *(solo hay `mensual` y `quincenal`; NO trimestral)* |

Con inicio `2026-01-01` + plazo 90 + mensual → **3 periodos**. Celdas (`celda-${i}-${p.numero}`, i = fila concepto 0-3, p.numero = 1/2/3):

| i | Clave | `celda-${i}-1` | `celda-${i}-2` | `celda-${i}-3` | Σ planeado (`planeado-${i}`) / restante |
|---|---|---|---|---|---|
| 0 | C-01 | `1000` | `0` | `0` | 1000 / **0** 🟢 |
| 1 | C-02 | `250` | `250` | `0` | 500 / **0** 🟢 |
| 2 | C-03 | `0` | `150` | `150` | 300 / **0** 🟢 |
| 3 | C-04 | `0` | `1000` | `1000` | 2000 / **0** 🟢 |
| | **$ del periodo** (`plan-programado-${p}`) | 100,000 | 475,000 | 425,000 | Σ 1,000,000 🟢 |

> Al cuadrar: banner verde **`programa-cuadra`** (si descuadra: `programa-descuadre`). **Candado:** restante de
> **cada** concepto = 0. Verifica `periodos-count` = 3. **Siguiente →**.

### 4.4 Datos jurídicos (Alta, paso 3)
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
| % de anticipo (`anticipo-input`) | `30` |

> **PDF de autorización del anticipo:** a **exactamente 30%** NO se exige (`ANTICIPO_UMBRAL_PDF = 30`, la regla es
> `> 30`). **🔴 Caso malo:** pon `31` → aparece `anticipo-pdf-uploader` con `anticipo-pdf-requerido` *"sin este PDF
> no se puede avanzar ni guardar (anticipo > 30%, art. 50 fr. IV LOPSRM)"* y el wizard queda bloqueado hasta subir
> el PDF (`anticipo-pdf-input` → `anticipo-pdf-pendiente-file` → `anticipo-pdf-ok`). Para el camino feliz deja
> **30** (sin PDF). Verifica `avisos-anticipo`.

Garantías (botón **«+ Agregar póliza»**, **sin testid**, por texto; el sistema deriva la fianza de anticipo):

| Tipo (`garantia-tipo-${i}`) | Afianzadora (`garantia-afianzadora-${i}`) | Póliza (`garantia-poliza-${i}`) | Monto (`garantia-monto-${i}`) | Vigencia (`garantia-vigencia-${i}`) |
|---|---|---|---|---|
| **Cumplimiento** | `Fianzas del Pacífico S.A.` | `FC-2026-001` | `100000.00` *(10%)* | `2027-06-01` |
| **Anticipo** | `Fianzas del Pacífico S.A.` | `FA-2026-001` | *(read-only `garantia-monto-derivado-${i}` = `300000.00`)* | `2027-06-01` |

> Tipos disponibles: Cumplimiento / Anticipo / **Vicios ocultos**. **Candado:** Cumplimiento **obligatoria
> siempre** y Anticipo al haber anticipo > 0 → si falta, banner `garantias-faltan` (cuando están: `garantias-ok`).
> `garantia-excede-${i}` si monto > contrato. **Siguiente →**.

### 4.6 Plan de amortización (Alta, paso 5) — Σ = $300,000.00 (art. 143 fr. I)
| Periodo | Monto (`plan-monto-${p.numero}`) |
|---|---|
| P1 | `100000.00` |
| P2 | `100000.00` |
| P3 | `100000.00` |
| **Σ** (`plan-suma`) | **$300,000.00** 🟢 → banner **`plan-cuadra`** (si no: `plan-descuadre`) |

> Atajo: **«Restablecer proporcional»** (`plan-restablecer`). **Siguiente →**.

### 4.7 PDF firmado del contrato (Alta, paso 6) — **obligatorio para guardar**
Sube cualquier `.pdf` en `pdf-firmado-input-precaptura` (uploader `pdf-firmado-precaptura`; el backend valida que
empiece con `%PDF`). Sin él aparece `pdf-firmado-requerido` y **NO se integran estimaciones después** (candado HU-12).
**Guardar:** **`btn-guardar`** ("Guardar contrato").

> Tras guardar: 🟢 contrato en **7. Registrados**; atajos `btn-nueva-alta` / `btn-volver-captura`. Navegación del
> wizard: `btn-siguiente`, `btn-atras`. Si un generador/dato excede algo recuperable → modal con
> `btn-exceso-continuar` / `btn-exceso-revisar`. Errores del wizard: `error-wizard` (+ `error-wizard-cerrar`).

### 4.8 Resultado financiero ESPERADO de las estimaciones (memorízalo)
| Est. | Periodo | Generadores | Subtotal | (−)Amort.30% | (−)5 al millar | **NETO** |
|---|---|---|---|---|---|---|
| **#1** | P1 | C-01=1000, C-02=250 | 100,000.00 | 30,000.00 | 500.00 | **🎯 $69,500.00** |
| **#2** | P2 | C-02=250, C-03=150, C-04=1000 | 475,000.00 | 142,500.00 | 2,375.00 | **🎯 $330,125.00** |

---

## 5. RECORRIDO E2E — paso a paso (palomea cada ▢)

### ▢ PASO 0 — Registro con EMPRESA (HU-23) en la pantalla de acceso + 🔴 validaciones
> El registro natural es en **la propia pantalla de acceso** (`SeleccionRol`): enlace **«Regístrate»**
> (`link-registro`) → formulario `form-registro` (testids **`reg-*`**). *(Existe una ruta pública alterna
> `/solicitud-acceso` con testids `sol-*`; aquí usamos la del login.)*

- Pantalla de acceso → **«Regístrate»** (`link-registro`); para volver, **«Inicia sesión»** (`link-login`).

| Campo (testid) | Valor 🟢 |
|---|---|
| Nombre(s) (`reg-nombres`) | `Pedro` |
| Apellido(s) (`reg-apellidos`) | `García Soto` |
| Correo (`reg-email`) | `pedro.contratista@prueba.test` |
| Rol (`reg-rol`) | **Contratista / Superintendente** |
| Empresa (`reg-empresa-select`) | **Constructora Demo** *(o «➕ Registrar nueva empresa…» → aparece `reg-empresa-nueva`; opción vacía = «— Sin empresa / elige tu empresa —»)* |
| *(condicional)* Nueva empresa (`reg-empresa-nueva`) | `Constructora Demo S.A. de C.V.` → si ya existe, aviso **`reg-empresa-existente`** (NO bloquea) |
| Contraseña (`reg-password`) | `Sigecop2026!` |
| Confirmar (`reg-password2`) | `Sigecop2026!` |

- **Crear cuenta** (`reg-submit`) → 🟢 cuenta **pendiente** (la aprueba la Dependencia en PASO 0b).
- 🔴 ⭐ Errores client-side (banner **`registro-error`**), uno por uno:
  - `reg-nombres` vacío → *"Captura tu(s) nombre(s)."*
  - `reg-apellidos` vacío → *"Captura tu(s) apellido(s)."*
  - `reg-email` o `reg-password` vacío → *"Completa todos los campos."*
  - nombre completo < 2 palabras (p. ej. `reg-nombres`=`Jo`, `reg-apellidos`=`X`) → *"Captura tu nombre y
    apellido(s): el nombre completo aparece en la bitácora."* (art. 123 RLOPSRM)
  - `reg-password`=`1234567` (7 car.) → *"La contraseña debe tener al menos 8 caracteres."*
  - `reg-password`=`Sigecop2026!` y `reg-password2`=`Sigecop2026` → *"Las contraseñas no coinciden."*
  - correo ya registrado → error del backend en `registro-error`.
  - ⭐ **REGLA 1:** Contratista/**Supervisión** con `reg-empresa-select` = «— Sin empresa / elige tu empresa —» →
    *"Elige tu empresa: es obligatoria para contratista y supervisión."*

### ▢ PASO 0b — Aprobar la solicitud (HU-23 admin) — `dependencia@`
- **Llegar:** sidebar **ADMINISTRACIÓN → «Solicitudes de registro»** (`/usuarios/solicitudes`, ruta libre, sin
  modal); también la campana → `drop-solicitudes-ir`. **NO es wizard:** tabla con una fila por cuenta pendiente.
- En la fila de `pedro.contratista@prueba.test` (`fila-solicitud[data-email=...]`):

| Campo (testid, **se repite por fila**) | Valor |
|---|---|
| Rol a asignar (`select-rol`) | **Contratista / Superintendente** *(NO se hereda; hay que elegirlo)* |
| Aprobar (`btn-aprobar`) | clic → la fila desaparece |
| Rechazar (`btn-rechazar`) | *(alternativa)* |

- 🔴 `select-rol` en "— Elige rol —" y pulsar **Aprobar** → toast *"Elige el rol a otorgar antes de aprobar."*
- 🔴 entrar sin token → panel `solicitudes-sin-sesion`. Rol ≠ dependencia → ruta bloqueada (deep-link → Inicio).

### ▢ PASO 1 — Login de los 5 roles
- `#login-usuario` = email · `#login-password` = `Sigecop2026!` · botón **«Iniciar sesión»**.
- 🟢 las 5 cuentas inician; el chip de empresa (`chip-empresa`) y el sidebar cambian por rol.
- 🔴 contraseña `X` → `auth-mensaje` (data-tipo=error) *"Credenciales inválidas"*. 🔴 cuenta recién registrada
  **no aprobada** → **403** en `auth-mensaje`: cuenta pendiente.

### ▢ PASO 1b — Elegir contrato en el MODAL (3A) — todas las cuentas
- Tras login, navega a cualquier pantalla de contrato (p. ej. sidebar → «Bitácora»). 🟢 aparece
  **`modal-elegir-contrato`**. Pulsa el botón **`modal-contrato-<id>`** de **`OBRA-2026-PRUEBA-FINAL`** (usa
  `modal-contrato-buscar` para filtrarlo).
- 🟢 desaparece el modal; arriba sale el chip **`chip-contrato-activo`** (📄 OBRA-2026-PRUEBA-FINAL ▾) y en la
  pantalla el banner **`banner-contrato-activo`** con botón **«Cambiar»** (`btn-cambiar-contrato`).
- 🔴 sin contratos asignados → `modal-contrato-sin-asignados` (rol sin alta) / `modal-contrato-sin-crear`
  (residente@/dependencia@ → ofrece `modal-contrato-crear`). 🔴 búsqueda sin match → `modal-contrato-vacio`.
- 🔴 **Cerrar sesión** (Salir o `modal-contrato-salir`) y volver a entrar → el contrato activo se limpió, el modal
  se relanza. Entrar con OTRA cuenta → NO hereda el contrato de la anterior.

### ▢ PASO 2 — Alta del contrato (HU-01) — `residente@`
- **Sidebar:** CICLOS → **«Alta de contratos»** (`/contratos/alta`, ruta libre, **NO sale el modal**: el alta crea
  el contrato). **No hay banner de contrato activo** (lo crea).
- Teclea **TODO el §4** (pasos 0→6, gating secuencial con `btn-siguiente`). **PDF firmado obligatorio** (§4.7).
- 🟢 guardado (`btn-guardar`); aparece en **7. Registrados**, folio `OBRA-2026-PRUEBA-FINAL`, monto **$1,000,000.00**.
  *(Tras guardar, vuelve a una pantalla de contrato y elige el nuevo contrato en el modal — PASO 1b.)*
- 🔴 ver casos N2–N4, N27–N28 (§6) y el del anticipo > 30% (§4.5).

### ▢ PASO 3 — Garantías: póliza + endoso (HU-02) — `dependencia@` *(residente consulta)*
- **Sidebar:** CICLOS → **«Fianzas / garantías»** (`/contratos/fianzas`) → contrato heredado en
  **`banner-contrato-activo`** = `OBRA-2026-PRUEBA-FINAL` (si no hay activo, sale el modal → elígelo).
- 🟢 **«+ Agregar nueva póliza»** (`btn-agregar-poliza`) → modal `modal-agregar-poliza`:

| Campo (testid) | Valor |
|---|---|
| Tipo (`mp-tipo`) | **Cumplimiento** *(podrías probar **Vicios ocultos**)* |
| Afianzadora (`mp-afianzadora`) | `Fianzas del Pacífico S.A.` |
| Folio (`mp-folio`) | `FC-2026-001` |
| Monto (`mp-monto`) | `100000` |
| Vencimiento (`mp-vencimiento`) | `2027-06-01` |
| Archivo PDF (`mp-archivo`) | *(opcional — **NO** entra en el candado de guardar)* |
| **Registrar** | `mp-confirmar` |

> **Candado `mp-confirmar`:** disabled si falta tipo, afianzadora (trim), monto > 0 o vencimiento.

- 🟢 **endoso** sobre una garantía: `btn-endoso-${g.id}` → modal `modal-endoso`:

| Campo (testid) | Valor |
|---|---|
| Motivo (`endoso-motivo`) | **Prórroga de vigencia** |
| Nuevo monto (`endoso-monto`) | *(vacío = sin cambio; o `120000.00` para ampliación)* |
| Nueva vigencia (`endoso-vigencia`) | `2028-06-01` |
| Observaciones (`endoso-obs`) | `Endoso por prórroga de vigencia (art. 91 RLOPSRM).` |
| **Registrar endoso** | `endoso-confirmar` |

- 🔴 ⭐ monto `9999999` → 400 (art. 48) · vigencia `2020-01-01` → 400 · 2ª póliza del **mismo tipo** → 409
  (UNIQUE contrato_id,tipo); con las **3** ya registradas → `btn-agregar-poliza` **disabled** ("ya tiene las 3").
  · rol ≠ dependencia/residente → 403 · ver PDF inexistente (`btn-ver-pdf-${id}`) → 404. Cards de alerta:
  `card-5d`/`card-15d`/`card-30d`; sin pólizas → `fianzas-vacio`.

### ▢ PASO 4 — Bitácora = **WIZARD** `/bitacora/ambiente` (HU-08/09) + pestañas Consulta/Minutas
- **Cuenta:** `residente@` · **Sidebar:** CICLOS → **«Bitácora»** (`/bitacora/ambiente`). Contrato en
  **`banner-contrato-activo`**. **Chip:** `chip-ciclo-hu` = «Bitácora · HU 08–11». **Pestañas** `pestanas-ciclo`:
  `pestana-bitacora` (activa) · `pestana-consulta` (HU-10) · `pestana-minutas` (HU-11).
  - Stepper **`wpaso-bit-apertura` · `wpaso-bit-firma` · `wpaso-bit-emitir`** + **`btn-watras-bit`** /
    **`btn-wsiguiente-bit`** (motivo de bloqueo en `wsiguiente-bit-motivo`). Bloques `bloque-bit-1..4` (candado
    `candado-bit-4` 🔒 si paso 3 bloqueado). Estado: `estado-bitacora`, `firmas-xy`, `paso-indicador-bit`.
  - **Candados:** apertura→firma exige bitácora **abierta**; firma→emitir exige **3/3** (si no, `candado-notas-aviso`).

**① Apertura (HU-08)** — botón **`link-abrir`** → pantalla **`/bitacora/apertura`** (contrato heredado, banner).
Solo el **residente asignado** puede aperturar.

| Campo (testid) | Valor |
|---|---|
| Entrega del sitio (`input-fecha-apertura`) | **`2026-01-01`** *(viene **PRE-LLENADO** con `fecha_inicio`; solo verifica)* |
| Plazo de firma de notas (`input-plazo-firma`) | **`2`** *(default; solo verifica)* |
| Domicilio dependencia (`md-domicilio-dependencia`) | `Av. Juárez 100, Chilpancingo, Gro.` |
| Teléfono dependencia (`md-telefono-dependencia`) | `7471234567` |
| Domicilio contratista (`md-domicilio-contratista`) | `Calle Reforma 25, Acapulco, Gro.` |
| Teléfono contratista (`md-telefono-contratista`) | `7449876543` |
| Alcance (`md-descripcion-trabajos`) | `Construcción de aula de 60 m²: cimentación, estructura y acabados.` |
| Características del sitio (`md-caracteristicas-sitio`) | `Terreno plano, 200 m², acceso vehicular, suelo arcilloso.` |
| **Iniciar apertura** | `btn-aperturar` |

> **Candado `btn-aperturar`:** residente asignado + superintendente asignado + entrega del sitio + **todos** los
> datos mínimos (si falta alguno → aviso **`md-incompleto`**). 🟢 nota **#1 de apertura** + firmas pendientes (vista
> de lectura `bitacora-readonly`/`estado-firmas`/`firmante-${rol}`). 🔴 ⭐ aperturar **dos veces** → 409; como **NO
> residente** el formulario no aparece (aviso) y forzar POST → 403.

**② Por firmar** — botón **`link-firmar`** → **`/bitacora/por-firmar`**. Localiza la fila
`fila-por-firmar[data-folio="OBRA-2026-PRUEBA-FINAL"]` y pulsa **`btn-firmar`**; repite logueando con
`residente@`, `contratista@` (= Superintendente) y `supervision@`.
- 🟢 a la 3ª firma: toast *"Firmaste. La apertura quedó COMPLETA."*; la fila desaparece (`por-firmar-vacio`). En el
  wizard, `firmas-xy` = "completa".
- 🔴 ⭐ firmar **dos veces** → 409 · firmar **sin ser firmante** (p. ej. `finanzas@`) → 403.

**③ Emitir (HU-09)** — `link-notas` (habilitado tras 3/3) → ver PASO 5.
- 🔴 ⭐ emitir nota **antes** de las 3 firmas → **409** *"…firmada por TODOS"* (art. 123 fr. III).

### ▢ PASO 5 — Nota de bitácora (HU-09) + Minutas (HU-11)
**HU-09 — Emisión de notas** (`supervision@`) · ruta `/bitacora/notas` (contrato heredado, banner):

| Campo (testid) | Valor |
|---|---|
| Tipo (`select-tipo`) | **Avance físico y financiero** *(solo aparecen los tipos de tu rol)* |
| Tag (`input-tag`) | `avance` |
| Asunto (`input-asunto`) | `Verificación de avance` *(opcional)* |
| Contenido (`input-contenido`) | `Se verifica avance de excavación conforme a programa.` |
| **Emitir nota** | `btn-emitir` |

> **Candado:** `btn-emitir` disabled si **apertura no completa** (bloque `gate-emision`) o `input-contenido`/`tipo`
> vacíos. Firmar nota (solo contraparte): `btn-firmar-nota-${n.numero}`. Anular: `form-anular-${n.numero}` +
> `btn-confirmar-anular-${n.numero}`. Libro: `btn-ver-bitacora` → `lista-notas` (`nota-${n.numero}`,
> `aceptacion-${n.numero}`, `firmas-nota-${n.numero}`). **Importante (PASO 8 ④):** para que la nota sea vinculable
> como soporte de estimación, debe quedar **FIRMADA**.

**HU-11 — Minutas y visitas** (`residente@`) · ruta **`/bitacora/minutas`** *(antes `/minutas-visitas`)* · sidebar
Bitácora → «Minutas y visitas» o pestaña `pestana-minutas`. Chip `chip-ciclo-hu` = «Bitácora · HU-11». **Son
PESTAÑAS (Tabs):** Minutas · Agenda de visitas. Contrato heredado (banner).

*Tab **Minutas**:*
| Campo (testid) | Valor |
|---|---|
| Fecha (`min-fecha`) | `2026-01-15` |
| Lugar (`min-lugar`) | `Sala de juntas — Residencia de obra, campus UAGRO` |
| Participantes (`min-participantes`) | `Arq. Carlos Contratista Demo (Contratista), Ing. Sofía Supervisión Demo (Supervisión), Residente de obra` |
| Asunto (`min-asunto`, se guarda como `titulo`) | `Reunión de avance mensual — primer periodo` |
| Acuerdos (`min-acuerdos`, opc.) | `Iniciar trazo y limpieza; entrega de programa firmado; próxima reunión en P2.` |
| Adjuntar PDF (`min-archivo`, opc.) | `minuta-MIN-001.pdf` |
| **Registrar minuta** | `btn-registrar-minuta` |

*Tab **Agenda de visitas**:*
| Campo (testid) | Valor |
|---|---|
| Fecha (`vis-fecha`) | `2026-01-20` |
| Lugar (`vis-lugar`) | `Frente de obra norte — Av. Juárez s/n, Chilpancingo, Gro.` |
| Responsable (`vis-responsable`) | `Ing. Sofía Supervisión Demo` |
| Propósito (`vis-proposito`) | `Verificación física del avance del primer periodo previo a estimación #1.` |
| **Agendar visita** | `btn-agendar-visita` |

- **Adjuntar a nota:** `btn-adjuntar-${m.id}` (o `btn-adjuntar-vis-${v.id}`) → modal `modal-adjuntar-referencia` →
  `adjuntar-nota-select` → `btn-vincular-nota` (cerrar: `btn-modal-cerrar`).
- **Candados:** `btn-registrar-minuta` disabled si falta fecha/lugar/participantes/asunto o sin contrato;
  `btn-agendar-visita` disabled si falta fecha/lugar/responsable/propósito o sin contrato; sin notas →
  `btn-vincular-nota` disabled. Tablas vacías: `minutas-vacio` / `visitas-vacio`. 🔴 registrar **no siendo el
  residente asignado** → 403.

### ▢ PASO 6 — Avance (HU-06) + nota automática + Curva (HU-05)
- **Cuenta:** `contratista@` · **Sidebar:** CICLOS → **«Avance y seguimiento»** → landing `/seguimiento/ambiente`.
  Contrato heredado (banner). **Chip:** `chip-ciclo-hu` = «Avance · HU 05–07» (índice). **Pestañas:**
  `pestana-trabajos` · `pestana-curva` · `pestana-alertas`. La landing pinta `kpis-avance`, `programa-periodos`,
  bloques `bloque-avance-1..5`. Atajos a las hermanas: `link-trabajos` / `link-curva` / `link-alertas`.
  **Aquí NO se registra nada.**
- **Registrar avance** → pestaña `pestana-trabajos` (o `link-trabajos`) → **`/seguimiento/trabajos-terminados`**.
  Chip = «Avance · HU-06». Registra DOS avances con **`btn-registrar-avance`**:

| Concepto (`cap-concepto`) | Periodo (`cap-periodo`) | Cantidad (`cap-cantidad`) | Observaciones (`cap-observaciones`, opc.) |
|---|---|---|---|
| C-01 Limpieza y trazo | Periodo 1 | `1000` | `Avance físico P1 verificado en sitio (E2E)` |
| C-02 Excavación | Periodo 1 | `250` | *(vacío)* |

> **Atajo `toggle-todo-periodo`:** marca "Ejecuté todo lo programado del periodo" → autollena `cap-cantidad` con lo
> disponible (disabled si disponible ≤ 0). Referencias de programa (lectura): `ref-programado-periodo`/
> `ref-programado-acum`/`ref-ejecutado-acum`/`ref-disponible`. 🟢 cada avance **genera su nota de bitácora**
> automática (tipo `avance`). **Append-only:** corregir = `btn-corregir-${a.id}` → `edit-cantidad-${a.id}` /
> `edit-obs-${a.id}` → `btn-guardar-edit-${a.id}` (registro nuevo vinculado; **no hay Editar/Eliminar**).
> **Candado:** `btn-registrar-avance` disabled si falta concepto/periodo o cantidad ≤ 0; `cap-periodo` disabled si
> el contrato no tiene programa por periodos.
- 🔴 ⭐ avance C-01 P1 = `1500` (>1000 contratado) → **409** + banner **`aviso-exceso`** *"…excede lo contratado
  (art. 118 RLOPSRM)"*. 🟡 **Avisos NO bloqueantes** (200): C-03 en P1 (no programado) → `aviso-no-programado`;
  C-02 P1 = `300` (>250 programado) → `aviso-excede-periodo`.
- **Curva (HU-05):** `residente@` · pestaña `pestana-curva` → **`/seguimiento/curva-avance`**. Chip = «Avance ·
  HU-05». Filtros `filtro-concepto` (Todos), `filtro-periodo` (Todo el contrato). Lectura: `seccion-gantt`,
  `avance-global`, puntos `curva-pt-${key}-${i}`. (TIPO B — ver §TIPO-B.)

### ▢ PASO 7 — Alertas de atraso (HU-07) — `residente@`
- Pestaña `pestana-alertas` → **`/seguimiento/alertas`**. Contrato heredado (banner). Chip = «Avance · HU-07».
- Tabla `tabla-atrasos` (periodo vigente en `periodo-actual`); por concepto en atraso: `fila-atraso-${id}`,
  déficit `deficit-${id}` y **`btn-asentar-${contrato_concepto_id}`** *(sufijo = id numérico, NO `C-03`)*. Sin
  atrasos: `sin-atrasos`.
- 🟢 **Asentar en bitácora** → nota de **atraso** (art. 53) → `aviso-ok`.
- 🔴 ⭐ asentar el **mismo** (concepto, periodo) **dos veces** → **409** (idempotente, `atraso_asentado`) →
  `aviso-error`. Doble clic → botón disabled "Asentando…". Sin acceso → `aviso-error`.

### ▢ PASO 8 — Ciclo de estimación = **WIZARD de 5 pasos** + pestañas del ciclo (HU-12/13/15/16/14/17)
> **Cuenta:** `contratista@` (= **superintendente asignado**) · **Sidebar:** CICLOS → **«Ciclo de estimación»**
> (`/estimaciones/integracion`). Contrato heredado (banner). **Chip:** `chip-ciclo-hu` = «Estimación · HU-12».
> **Pestañas** `pestanas-ciclo`: `pestana-integrar` (activa) · `pestana-presentar` · `pestana-revision` ·
> `pestana-reingreso` · `pestana-historial` · `pestana-tablero`. Stepper **`wpaso-periodo` · `wpaso-generadores` ·
> `wpaso-caratula` · `wpaso-soportes` · `wpaso-integrar`** (paneles `wstep-*`; indicador `paso-indicador`).
> Navega con **`btn-wsiguiente`** / **`btn-watras`** (motivo de bloqueo `wsiguiente-motivo`).

**8a — Integrar #1 (HU-12):**
1. **① Periodo** (`wpaso-periodo` → `wstep-periodo`): `periodo-selector` = **Periodo 1** (o `periodo-inicio`=
   `2026-01-01`, `periodo-fin`=`2026-01-31`). → **Siguiente**.
2. **② Generadores** (`wpaso-generadores`): en `tabla-generadores`, por **fila `gen-fila-${id}`** (clave en
   `gen-clave-${id}`, plan `gen-planeado-${id}`, disponible `gen-disponible-${id}`) teclea en
   **`gen-cantidad-${contrato_concepto_id}`** *(id numérico)*: C-01 = `1000`, C-02 = `250` (C-03/C-04 vacíos).
   **Candados:** si excede el **plan del periodo** → `semaforo-plan-exceso` rojo + `btn-wsiguiente` **disabled**; si
   excede lo **contratado** (art. 118) → `aviso-exceso` rojo + disabled. Barras `barra-fisico`/`barra-programado`/
   `barra-financiero`; programa en `panel-programa-obra`. → Siguiente.
3. **③ Carátula** (`wpaso-caratula`): `caratula-deductivas` = `0`. **Verifica:** `caratula-numero-estimacion` = #1 ·
   `caratula-neto-preview` = **$69,500.00** · `tabla-saldos` (`saldo-estimacion-actual`/`saldo-acumulado`/
   `saldo-por-estimar`). **Candado:** si las deductivas dejan **neto < 0** → `btn-wsiguiente` disabled. → Siguiente.
4. **④ Soportes y notas** (`wpaso-soportes` → `wstep-soportes`): (opcional) **`btn-abrir-buscador-notas`** →
   `modal-vincular-notas` (solo lista notas **firmadas**, excluye la apertura). Marca la nota del PASO 5 →
   **`mb-btn-confirmar`** (disabled si 0; sin notas firmadas → `mb-sin-notas`). Aviso `soportes-fotos-alcance`
   (fotos fuera de Etapa 1). Notas vinculadas en `tabla-notas-vinculadas`. → Siguiente.
5. **⑤ Integrar** (`wpaso-integrar`): marca **`check-cierre`** → **`btn-integrar`** ("Confirmar e integrar
   estimación"). **Candados:** disabled si falta `check-cierre`, sin línea > 0, o sin periodo
   (`confirmar-bloqueado-hint`). 🟢 `banner-integrada`, neto **$69,500.00** + enlace **`link-presentar`**.

**8b — Presentar (HU-13):** `contratista@` · pestaña `pestana-presentar` (o `link-presentar`) →
**`/estimaciones/envio`**. Chip = «Estimación · HU-13». Contrato heredado. En la fila de la #1 (estado
**integrada**): **`btn-presentar-${e.id}`** → toast *"…presentada. Inicia el plazo de revisión (15 días, art. 54)."*
Semáforo `semaforo-plazo-${e.id}`; sello `sello-presentacion-${e.id}`. Si no hay integradas → `envio-vacio`.

**8c — Supervisión turna (HU-15):** `supervision@` · pestaña `pestana-revision` → **`/estimaciones/revision`**.
Chip = «Estimación · HU-15». Contrato heredado; `select-estimacion` = **EST-001 · Ene 2026 · Enviada**.
- (Opcional) observación de carátula (las observaciones son por sección: `obs-caratula-*`):

| Campo (testid) | Valor |
|---|---|
| Texto (`obs-caratula-nueva-texto`) | `Verificar amortización de anticipo 30% conforme art. 138 RLOPSRM.` |
| Tipo (`obs-caratula-nueva-tipo`) | **Aclaración** *(opciones aclaracion/correccion/rechazo)* |
| Severidad (`obs-caratula-nueva-severidad`) | **Menor** *(OBLIGATORIO; default `menor`; opciones menor/mayor/critica)* |
| **+ Agregar observación** | `btn-agregar-obs-caratula` |

- Para turnar **sin observaciones**: marca **`chk-sin-observaciones`** (habilitado solo si 0 observaciones).
- **➡ Turnar a residencia** (`btn-turnar`). **Candado:** disabled hasta ≥1 observación **O** `chk-sin-observaciones`.
  🟢 `banner-turnada`.

**8d — Residencia AUTORIZA (HU-15):** `residente@` · misma pantalla (`pestana-revision`) → **✓ Autorizar**
(`btn-autorizar`). 🟢 `banner-autorizada`.
> ⚠️ **Necesario para el PASO 9:** el pago exige la #1 **AUTORIZADA**.

**8e — #2 → RECHAZO → REINGRESO (HU-16):**
- Integra **#2** por el wizard (`contratista@`, **Periodo 2**): `gen-cantidad-*` C-02=`250`, C-03=`150`,
  C-04=`1000` → neto **$330,125.00**. Presenta (8b).
- `supervision@` **turna**; `residente@` **RECHAZA**: `motivo-rechazo` = `Inconsistencia en cantidades de C-02
  contra números generadores; corregir y reingresar (art. 54 LOPSRM).` → **✗ Rechazar** (`btn-rechazar`). 🟢
  `banner-rechazada`. **Candado:** `btn-rechazar` disabled si `motivo-rechazo` vacío.
- **Reingreso:** `contratista@` · pestaña `pestana-reingreso` → **`/estimaciones/reingreso`** (chip «Estimación ·
  HU-16»). Contrato heredado:

| Campo (testid) | Valor |
|---|---|
| Estimación rechazada (`select-estimacion`) | **#2 · Periodo 2 · Rechazada** |
| Nota de atención (`textarea-nota`) | `Se corrigieron los números generadores y se anexó el registro fotográfico faltante.` *(gate de UI; NO se persiste)* |
| Confirmo (`chk-confirmado`) | **marcar** |
| **Reingresar estimación** | `btn-reingresar` |

> **Candado `btn-reingresar`:** nota con texto + `chk-confirmado`. 🟢 `aviso-reingreso` *"Nueva versión EST-003
> creada…"* → **#3 Integrada** (copia carátula, neto $330,125.00, `reemplaza_a`=#2). Descargas de observaciones:
> `btn-descargar-obs-pdf` / `btn-descargar-obs-excel` (disabled si no hay). Sin rechazadas → `sin-rechazadas`.
> Trazabilidad: `tabla-trazabilidad`.

**🔴 ⭐ Negativas del ciclo:**
- ② C-03=`50` en **Periodo 1** (plan P1=0) → `semaforo-plan-exceso` + `btn-wsiguiente` disabled; API 409.
- ② C-01 acumulado `1001` (>contratado) → `aviso-exceso` + disabled; 409 (art. 118).
- ① Periodo `2026-01-01`→`2026-02-15` y al integrar → **400** *"no puede exceder un mes (art. 54)"*.
- ① Periodo que **solapa** otra estimación integrada → **409** (`banner-error`).
- ⑤ Integrar **sin** `check-cierre` → `btn-integrar` disabled. Sin periodo → disabled + `confirmar-bloqueado-hint`.
- Integrar siendo contratista **NO superintendente** → aviso + 403.
- 8d Autorizar **antes** de turnar → **409** *"aún no ha sido turnada"*. Rechazar sin `motivo-rechazo` → disabled.
- `finanzas@` abre la revisión de un contrato ajeno → 403.
- Reingresar la #1 (no-rechazada / pagada) → **409** *"Solo… una 'rechazada'"*.

### ▢ PASO 9 — Pago = **WIZARD de 4 pasos** (HU-20 + **HU-21 embebido**) — `finanzas@`
> **Sidebar:** CICLOS → **«Pago y tránsito»** (`/pagos/transito`). Contrato heredado (banner). **Chip:**
> `chip-ciclo-hu` = «Pago · HU-20». **Pestañas:** `pestana-transito` (activa) · `pestana-registro`.
> `select-estimacion` = **#1 Autorizada** *(el contenedor solo lista estado `autorizada`)*. Stepper
> **`wpaso-pago-suficiencia` · `wpaso-pago-soportes` · `wpaso-pago-instruccion` · `wpaso-pago-registro`** (paneles
> `wstep-pago-*`; indicador `paso-indicador-pago`); navega con **`btn-wsiguiente-pago`** / **`btn-watras-pago`**
> (motivo `wsiguiente-pago-motivo`). *(Con `dependencia@`/`residente@` la vista es solo lectura.)*

1. **① Suficiencia** (`wpaso-pago-suficiencia`): si no hay techo, cárgalo — **partida OBLIGATORIA** *(el form solo
   aparece si el contrato tiene `dependencia_id`; si no, `aviso-sin-dependencia-fk`)*:

   | Campo (testid) | Valor |
   |---|---|
   | **Partida específica (`input-partida`)** | `62201` *(OBLIGATORIO, art. 24 LOPSRM)* |
   | Techo de la partida (`input-techo`) | `5000000` |

   → **Cargar techo** (`btn-cargar-techo`). 🟢 `badge-suficiente` (neto 69,500 ≤ techo). → Siguiente.
2. **② Soportes** (`wpaso-pago-soportes`): Factura (`input-factura`=`F-2026-001` → `btn-cargar-factura`) · CFDI
   (`input-cfdi`=`A1B2C3D4-1111-2222-3333-444455556666` → `btn-cargar-cfdi`). *(La carga de archivo no está
   disponible, solo metadatos: `nota-upload-deshabilitado`.)* → Siguiente.
3. **③ Instrucción** (`wpaso-pago-instruccion`): semáforo del plazo (`semaforo-pago-badge`) → **💸 Generar
   instrucción de pago** (`btn-generar-instruccion`). 🟢 `aviso-instruccion-generada` + `link-registrar-pago`.
   **Candado:** si el neto excede el techo (`badge-excede`) o faltan soportes → `btn-generar-instruccion` disabled
   + `aviso-bloqueo`. → Siguiente.
4. **④ Registrar pago** (`wpaso-pago-registro` → `wstep-pago-registro`): **EMBEBIDO el form HU-21** (`RegistroPagoForm`):

   | Campo (testid) | Valor |
   |---|---|
   | Estimación a pagar (`pago-estimacion`) | **#1 · autorizada · $69,500.00** *(SOLO ofrece estado `autorizada`)* |
   | Importe (`pago-importe-neto`) | **$69,500.00** *(read-only; NO se teclea ni viaja en el POST)* |
   | Fecha de pago (`pago-fecha`) | `2026-06-18` |
   | Referencia SPEI (`pago-referencia`) | `SPEI-2026-000123` |
   | Folio fiscal CFDI (`pago-cfdi`) | `A1B2C3D4-1111-2222-3333-444455556666` *(el front NO valida formato UUID)* |
   | Fecha de la factura (`pago-fecha-factura`) | `2026-06-18` |
   | Fecha de autorización (`pago-fecha-autorizacion`) | *(opcional)* `2026-06-15` |
   | Observaciones (`pago-observaciones`) | *(opcional)* `Pago de estimación #1 — periodo 1 (prueba E2E final).` |
   | **Registrar pago** | `btn-registrar-pago` |

   🟢 `aviso-pago-registrado` **$69,500.00**; la #1 pasa a **"pagada"**.
   > **Candado `btn-registrar-pago`:** disabled si falta estimación, fecha de pago, referencia, CFDI o fecha de
   > factura — **además** del gate de rol (abajo).
- **🔴 ⭐ GATE de finanzas (N18b):** entra al paso ④ como **`contratista@`** (que SÍ ve el wizard, HU-20 'E'): el
  form aparece pero **`btn-registrar-pago` está DISABLED** y se muestra **`pago-solo-finanzas`** *"El registro del
  pago lo ejecuta Finanzas (art. 54 LOPSRM)."* Solo `finanzas@` registra.
- *(La ruta `/pagos/registro` existe: pestaña `pestana-registro` o sidebar Pago → «Registro del pago»; tabla
  `tabla-pagos` con filas `fila-pago` y `plazo-${p.id}`. En roles 'C' (residente/dependencia) el form NO se
  renderiza; solo ven la tabla.)*
- 🔴 ⭐ `input-techo` = `-1` → toast *"Techo inválido"* · cargar techo **sin partida** → `btn-cargar-techo` disabled;
  por API **400** *"…partida… obligatoria (art. 24)"* · contrato sin `dependencia_id` → `aviso-sin-dependencia-fk` ·
  pagar la **#3 Integrada** → **409** (solo autorizada, art. 54) · fecha de pago `2025-12-31` → **400** · pagar la
  #1 otra vez → **409** · observaciones > 2000 car. → **400**.

### ▢ PASO 10 — Convenio (HU-03) + **ACTO DE AUTORIZACIÓN** — `dependencia@`
- **Sidebar:** CICLOS → **«Convenios»** (`/contratos/modificatorios`). Contrato heredado (banner). **Chip:**
  `chip-ciclo-hu` = «Convenio · HU-03». **Pestañas:** `pestana-convenio` (activa) · `pestana-consulta` (Bitácora) ·
  `pestana-expediente`.

**Convenio tipo PLAZO (camino canónico):**
| Campo (testid) | Valor |
|---|---|
| Tipo (`cm-tipo`) | **Plazo** |
| Plazo vigente (`cm-plazo-vigente`) | `90 días` *(read-only; verifica)* |
| Plazo nuevo en días (`cm-plazo-nuevo`) | `100` *(de 90 → +11.11%, ≤25%; verifica `cm-delta-plazo`)* |
| Motivo (`cm-motivo`) | `Ampliación por lluvias atípicas (dictamen técnico, art. 99 RLOPSRM).` |
| Folio (`cm-folio`) | *(vacío → genera `CM-001`)* |
| **Registrar convenio** | `btn-registrar-convenio` |

> 🟢 `CM-001` **"Pendiente de autorización"** (`conv-badge-registrado-…`); nota de bitácora ligada (`conv-nota-${id}`).
> **Candado:** `cm-motivo` siempre obligatorio; en Plazo, `cm-plazo-nuevo` > 0 y ≠ 90.

**Convenio tipo MONTO/programa (editor — `EditorProgramaConvenio`):** elige `cm-tipo` = **Monto** → se monta
**`editor-programa-convenio`** (NO en tipo Plazo). Captura el catálogo (existentes con clave/nombre/unidad
**disabled**; cantidad/P.U. **sí** editables):

| i | Clave (`cm-concepto-clave-${i}`) | Concepto (`cm-concepto-nombre-${i}`) | Unidad (`cm-concepto-unidad-${i}`) | Cant. (`cm-concepto-cantidad-${i}`) | P.U. (`cm-concepto-pu-${i}`) | Importe (`cm-concepto-importe-${i}`) |
|---|---|---|---|---|---|---|
| 0 | C-01 | Limpieza y trazo del terreno | m² | `1000` | `50.00` | $50,000.00 |
| 1 | C-02 | Excavación a máquina | m³ | `500` | `200.00` | $100,000.00 |
| 2 | C-03 | Concreto f'c=200 kg/cm² | m³ | `300` | `2500.00` | $750,000.00 |
| 3 | C-04 | Acero de refuerzo fy=4200 | kg | `2000` | `50.00` | $100,000.00 |
| | | | | | **Monto nuevo (`cm-monto-nuevo`)** | **$1,000,000.00** |

> Matriz por convenio: `cm-celda-${i}-${p.numero}` (mismos valores que §4.3): `cm-celda-0-1`=1000, `cm-celda-1-1`=250,
> `cm-celda-1-2`=250, `cm-celda-2-2`=150, `cm-celda-2-3`=150, `cm-celda-3-2`=1000, `cm-celda-3-3`=1000. Por concepto:
> `cm-planeado-${i}` y `cm-restante-${i}` (objetivo 0). **Candados:** banner `cm-programa-cuadra` (verde) /
> `cm-programa-descuadre` (rojo); concepto nuevo con `cm-agregar-concepto`, quitar `cm-concepto-quitar-${i}` (solo si
> NO existente); sin periodos → `cm-sin-periodos`.

**AUTORIZACIÓN (art. 59 p3):** en la fila `fila-convenio-${c.id}`, como **dependencia**, **✔ Autorizar convenio**
(`conv-autorizar-${id}`) → 🟢 **"Autorizado"** (`conv-badge-autorizado-…`).
- 🔴 ⭐ convenio **>25%** (plazo `120`, +33%) → se registra con **AVISO** (`aviso-sfp`/`badge-sfp-${id}`), **NO**
  bloquea; al **Autorizar** sin oficio → **409** *"…art. 102… carga el oficio…"*. Sube el oficio (📎
  `conv-oficio-subir-${id}`, **solo PDF**) y reintenta → 🟢. · oficio **no-PDF** → toast *"El oficio debe ser un
  PDF"* · oficio **duplicado** → 409 · Autorizar con rol ≠ dependencia → **403** · Re-autorizar uno ya autorizado →
  **409** · Convenio Monto descuadrado (`cm-restante`≠0) → `cm-programa-descuadre`, guardar bloqueado.
- Versiones del programa: `tabla-versiones`, `btn-ver-version-${v.id}` → `detalle-version`.

### ▢ PASO 11 — Portafolio (HU-18) + Tablero (HU-17)
**Portafolio** (`dependencia@`) · VISTAS EJECUTIVAS → **«Portafolio»** (`/portafolio`, ruta libre, **sin modal ni
banner** — es multi-contrato):
- Único control: **`select-agrupar-por`** = Ninguno (o "Contratista" / "Ejercicio fiscal"; "Tipo de contratación"
  **disabled**). Filas `fila-portafolio-OBRA-2026-PRUEBA-FINAL`; semáforo `semaforo-dot-…` (data-color) /
  `semaforo-badge-…`; contadores `contador-verde` / `contador-amarillo` / `contador-rojo`. Doble clic en una fila →
  `panel-detalle-contrato` (cerrar `btn-cerrar-detalle-contrato`). Grupos `grupo-${label}`.
- 🔴 `OBRA-2026-ATRASO-*` en **rojo**. Error → `banner-error`. (TIPO B.)

**Tablero** (`residente@`/`dependencia@`) · **«Tablero»** (`/estimaciones/tablero`, ruta libre, multi-contrato; SÍ
muestra pestañas del ciclo de estimación con chip «Estimación · HU-17»):
- Filtros: `filtro-estado` *(value `enviada` se muestra **"Presentada"**)*, `filtro-periodo`, `filtro-responsable`.
  Con el dataset **NO está en ceros**: `tarjeta-est-OBRA-2026-PRUEBA-FINAL-1` = **$69,500.00**,
  `tarjeta-est-OBRA-2026-PRUEBA-FINAL-2` = **$330,125.00**; KPIs `kpi-contratos`/`kpi-monto-estimado`/
  `kpi-monto-pagado`/`kpi-monto-pendiente`; contadores `contador-estado-{integrada|enviada|autorizada|pagada|rechazada}`.
  Estados: `tablero-cargando` / `tablero-error` / `tablero-vacio`; mis pendientes `pendiente-item` /
  `mis-pendientes-vacio`. (TIPO B.)

### ▢ PASO 12 — Roster / sustitución (HU-22) + REGLA 4 (misma empresa) — `dependencia@`
> **Pre:** 2ª cuenta contratista MISMA empresa (Constructora Demo): `super2.demo@`/`super3.demo@`. Para la 🔴, otra empresa: `patito1@`.
- **Sidebar:** ADMINISTRACIÓN → **«Roster / sustitución»** (`/contratos/roster`). Contrato heredado (banner). **Sin
  pestañas de ciclo.** Roster vigente: `roster-vigente` (`roster-rol-${rol}`, `vigente-${rol}`,
  `vigente-empresa-${rol}`); histórico `roster-evento-${h.id}`.

Formulario `roster-form-sustituir`:
| Campo (testid) | Valor |
|---|---|
| Rol a sustituir (`sust-rol`) | **superintendente** |
| Nueva persona (`sust-nuevo`) | **Ing. Marco Superintendente 2 (super2.demo@…)** *(select **CONDICIONAL**: solo aparece si hay elegibles; si no → `sust-sin-elegibles` o `sust-elegibles-error`)* |
| Motivo (`sust-motivo`) | `Cambio de superintendente (art. 125 fr. I g RLOPSRM).` |
| **Sustituir** | `btn-sustituir` |

> 🟢 histórico + nota. **Candado `btn-sustituir`:** disabled si falta rol, nueva persona o motivo. Sin sesión →
> `roster-sin-sesion`; error de carga → `roster-error`; aviso de ámbito → `roster-dependencia-aviso`.
- 🔴 ⭐ REGLA 4: **patito1 (otra empresa)** → **409** *"…MISMA empresa… (art. 125)"*.
- 🔴 ⭐ sustituir el rol **dependencia** → **400** *"no sustituible (art. 125)"* · rol sin cuentas aprobadas →
  `sust-sin-elegibles` (no aparece `sust-nuevo`).

### ▢ PASO 13 — Padrón de empresas (HU-23 admin) — `dependencia@`
- **Sidebar:** ADMINISTRACIÓN → **«Padrón de empresas»** (`/admin/empresas`, ruta libre, **sin banner** — no es por
  contrato). **NO tiene formulario.** Tabs `tab-padron` / `tab-porvalidar` / `tab-dependencias`.
- 🟢 `panel-padron` (validadas; validar `validar-${id}`) · `panel-porvalidar` (duplicados; `pv-validar-${id}` /
  **`fusionar-${id}` solo si `posible_duplicado`**; vacío `porvalidar-vacio`) · `panel-dependencias` (aparte, art.
  43/74 Bis). Estado vacío general: `empresas-aviso`. (TIPO B.)
- 🔴 ⭐ rol ≠ dependencia → no aparece en el sidebar y deep-link → Inicio. Error de validar/fusionar → toast.

### ▢ PASO 14 — Expediente (HU-04) — `residente@`
- **Sidebar:** CICLOS → **«Expediente»** (`/contratos/expediente`). Contrato heredado (banner). **Chip:**
  `chip-ciclo-hu` = «Expediente · HU-04». **Pestañas:** `pestana-expediente` (activa) · `pestana-reportes`.
- **Buscar:** `input-busqueda` (vacío = todos) + "Buscar por" *(select **SIN testid**)* = documento / periodo.
- **Exportar:** **`btn-exportar-pdf`** (🖨 → `window.print()`; el PDF sale completo aunque la búsqueda oculte bloques).
- 🟢 **9 bloques** (`bloque-${id}`): `configuracion` (`config-expediente`: monto $1,000,000.00 y super vigente
  `config-super-vigente`) · `catalogo` (`exp-concepto-clave-0..3` = C-01..C-04) · `programa` · `fianzas` ·
  `amortizacion` (`plan-amortizacion-expediente`: `plan-exp-monto-1/2/3` = $100,000.00 c/u · `plan-exp-total` =
  **$300,000.00**) · `juridicos` · `roster` (`roster-expediente`, `roster-fila-${id}` con la sustitución) ·
  `convenios` (`convenios-expediente`, `convenio-fila-${id}` + `convenio-oficio-${id}` + `convenios-link-versiones`) ·
  `estimaciones` (`estimaciones-expediente`, `estimacion-fila-${id}` + **`estimaciones-total-neto` = $399,625.00**, =
  #1 $69,500 + #3 $330,125; **excluye la #2 rechazada**).
- 🔴 contrato sin acceso → `aviso-error` (403) · id inexistente → 404 · búsqueda sin match → visual. (TIPO B.)

### ▢ PASO 15 — Finiquito (HU-24 funcional / ruta fija) — `residente@` o `dependencia@`
- **Sidebar:** CICLOS → **«Cierre / finiquito»** (`/contratos/finiquito`). Contrato heredado (banner). **Chip:**
  `chip-ciclo-hu` = «Finiquito · HU-24». **Pestañas:** `pestana-finiquito` (activa) · `pestana-expediente`.
- 🟢 desglose del saldo (`finiquito-desglose`, art. 64) — solo la #1 pagada:

  | Renglón | Valor / testid |
  |---|---|
  | Importe neto estimado y autorizado | $69,500.00 |
  | (−) Total pagado | −$69,500.00 |
  | (−) Anticipo no amortizado (300,000 − 30,000) | −$270,000.00 |
  | (−) Ajustes finales (`finiquito-ajustes`, **input number — teclea `0`**) | −$0.00 |
  | Observaciones (`finiquito-observaciones`, opc.) | `Finiquito conforme art. 64 LOPSRM y arts. 168-172 RLOPSRM; saldo conciliado.` |
  | **(=) SALDO** (`finiquito-saldo`) | **−$270,000.00** |
  | **A favor de** (`finiquito-afavor`) | **la DEPENDENCIA** (art. 171) |
- **Cerrar (doble paso):** 🔒 **Cerrar contrato** (`btn-abrir-cierre`) → panel `finiquito-confirmar` (*"…inalterable,
  art. 172… no se puede deshacer"*) → **Sí, elaborar finiquito y cerrar** (`btn-confirmar-cierre`) → 🟢 banner
  `finiquito-cerrado`. Documento art. 170: **`btn-ver-documento-finiquito`** → modal `documento-finiquito`
  (`finiquito-doc-saldos`, imprimir `btn-imprimir-finiquito`).
- 🔴 ⭐ **sin bitácora** → `btn-abrir-cierre` **DISABLED** + banner **`finiquito-sin-bitacora`** *(candado de UI, NO
  un 409)* · 2º finiquito → 409 · rol no autorizado (contratista/supervisión/finanzas) → controles ocultos +
  deep-link → Inicio · sin acceso → 403.
- 🔴 ⭐ tras el finiquito, **integrar otra estimación** o **generar instrucción de pago** → **409** *"contrato
  cerrado (art. 64/170)"*.

### ▢ PASO 16 — Acotamiento por empresa
- 🟢 `dependencia@` (Dependencia Demo): ve `OBRA-2026-PRUEBA-FINAL`, `OBRA-2026-DEMO-01`, `ATRASO-*` (también en la
  lista del **modal de contrato**).
- 🔴 ⭐ (A-no-ve-B): entra como **`dependencia.sur@`** o **`dep2@`** → el modal **NO** lista los contratos de
  Dependencia Demo, y viceversa. *(finanzas: transversal.)*

### ▢ PASO 17 — Reportes (HU-19) + Ciclo de vida
**Reportes** (`residente@` = único nivel 'E'; el resto 'C' ve los botones **disabled**) · VISTAS EJECUTIVAS →
**«Reportes»** (`/reportes`). Contrato heredado (banner). **Chip:** `chip-ciclo-hu` = «Expediente · HU-19».
**Pestañas:** `pestana-expediente` · `pestana-reportes` (activa).
- `select-periodo-reporte` = **Acumulado** *(opciones Mensual/Trimestral/Acumulado; arranca en Mensual — elige
  **Acumulado**)*. *(El contrato ya NO se elige aquí con `select-contrato-reporte`: viene del banner global.)*
- **7 reportes / 8 botones** (`btn-exportar-${reporteId}-${formato}`): `btn-exportar-1-pdf`, `btn-exportar-1-excel`
  (Avance físico) · `btn-exportar-2-excel` (Avance financiero) · `btn-exportar-3-excel` (Estimaciones) ·
  `btn-exportar-4-excel` (Observaciones) · `btn-exportar-5-pdf` (Bitácora — **requiere bitácora aperturada**) ·
  `btn-exportar-6-excel` (Modificatorios) · `btn-exportar-7-excel` (Penalizaciones).
- 🔴 sin contrato → 8 botones disabled · roles 'C' → disabled · contrato sin acceso → `banner-error` (403).
  *(Generación 100% en cliente: sin 400/409.)* (TIPO B.)

**Ciclo de vida** (`/contratos/ciclo-vida`): contrato heredado; 14 bloques `bloque-cv-1..14` con `link-cv-2..14` (o
`info-cv-N` si tu rol no aplica) y badges `progreso-cv-N`. *(El bloque de integración `link-cv-7` lleva a
`/estimaciones/ambiente`, no al wizard de 5 pasos.)*

---

## TIPO-B. ⭐ REGLA DE ORO — las vistas SIEMPRE-ACCESIBLES abren sin datos (estado vacío, NO bloqueo) 🟢

> Verifica que estas vistas **TIPO B** abren aunque **no hayas hecho nada** (wizard incompleto, sin datos): muestran
> **estado vacío**, **nunca** error de bloqueo. Con el contrato activo ya elegido (PASO 1b), navega a cada una por
> su **pestaña** o por el sidebar.

| ▢ | Vista TIPO B | Cómo llegar | Cuenta | Esperado 🟢 (sin datos) — testid / texto real |
|---|---|---|---|---|
| ▢ | **Consultar bitácora (HU-10)** | Bitácora → `pestana-consulta` (`/bitacora/consulta`) | `residente@` | contrato heredado; sin apertura → **`aviso-sin-bitacora`** (404, NO error); sin notas → `aviso-sin-notas`. Export `btn-exportar` (solo con selección). |
| ▢ | **Minutas (HU-11)** | Bitácora → `pestana-minutas` (`/bitacora/minutas`) | `residente@` | `tabla-minutas`/`tabla-visitas` vacías (`minutas-vacio` / `visitas-vacio`). |
| ▢ | **Historial de estimaciones (HU-14)** | Estimación → `pestana-historial` (`/estimaciones/historial`) | `contratista@` | sin filtros-match → "Sin estimaciones…". Filtros `he-periodo`/`he-estado`; export `btn-exportar-historial`; fila `fila-historial-{id}` → `panel-detalle-estimacion-{id}`. |
| ▢ | **Revisión/autorización (HU-15)** | Estimación → `pestana-revision` | `residente@`/`supervision@` | `select-estimacion`; sin presentadas → **`sin-estimaciones`**. |
| ▢ | **Tablero (HU-17)** | VISTAS → Tablero (o `pestana-tablero`) | `residente@` | `tablero-vacio` si filtros sin match; con dataset NO está en ceros (PASO 11). |
| ▢ | **Curva de avance (HU-05)** | Avance → `pestana-curva` (`/seguimiento/curva-avance`) | `residente@` | `filtro-concepto`/`filtro-periodo`; sin programa → banner ámbar; sin avances → curva en 0. |
| ▢ | **Alertas de atraso (HU-07)** | Avance → `pestana-alertas` (`/seguimiento/alertas`) | `residente@` | `periodo-actual`; `sin-atrasos` si no hay. |
| ▢ | **Expediente (HU-04)** | CICLOS → Expediente (`/contratos/expediente`) | `residente@` | 9 bloques con lo que haya. |
| ▢ | **Portafolio (HU-18)** | VISTAS → Portafolio (`/portafolio`, ruta libre) | `dependencia@` | cartera vacía → "No hay contratos en tu portafolio." (NO error). |
| ▢ | **Reportes (HU-19)** | VISTAS → Reportes (`/reportes`) | `residente@` | abre con tabla de 7 reportes; botones disabled hasta haber contrato activo. |
| ▢ | **Padrón (HU-23 admin)** | ADMIN → Padrón (`/admin/empresas`, ruta libre) | `dependencia@` | `empresas-aviso` / `porvalidar-vacio` / "Sin dependencias." |
| ▢ | **Promoción (dependencia):** Presentar(13)/Revisión(15)/Reingreso(16)/Historial(14) | ítems planos en CICLOS | `dependencia@` | el link existe y abre. *(Curva HU-05 NO se promueve — ver §3.1.)* |

> 🔴 contraprueba (**N31**): ninguna de estas debe quedar **detrás de un candado de wizard** ni dar 403/409 por
> "wizard incompleto". El único bloqueo legítimo es por **rol/participación** (p. ej. `finanzas@` no ve Consultar
> bitácora porque HU-10 es null para finanzas — eso es acceso, no "candado de wizard").

---

## 6. ⭐ PRUEBAS NEGATIVAS / LEGALES — qué teclear para DISPARAR el bloqueo 🔴

| # | Prueba | Dónde / quién | Cambio sobre el dataset | Bloqueo esperado | Fundamento |
|---|---|---|---|---|---|
| N1 | Registro contratista/supervisión SIN empresa | PASO 0 | `reg-empresa-select` vacío | `registro-error` "Elige tu empresa…" | REGLA 1 |
| N1b | Registro: campos/contraseña inválidos | PASO 0 | nombre<2 palabras · pass<8 · pass≠pass2 · campos vacíos | `registro-error` (mensaje exacto §PASO 0) | validación cliente |
| N1c | Aprobar solicitud sin rol | PASO 0b | `select-rol` vacío + Aprobar | toast "Elige el rol a otorgar…" | UX |
| **N1d** | **Modal sin contratos** | **PASO 1b** | cuenta sin contratos | `modal-contrato-sin-asignados` / `modal-contrato-sin-crear` | 3A |
| **N1e** | **Contrato NO se hereda entre cuentas** | **PASO 1b** | salir y entrar con otra cuenta | el modal se relanza (contrato activo limpio) | 3A (BUG 1) |
| N2 | Programa no cuadra (faltante) | Alta p2 | `celda-0-1`=`900` | `programa-descuadre` + 400 | 45-A-X + 52 |
| N3 | Programa excede | Alta p2 | `celda-1-1`=`300`,`celda-1-2`=`250` | `programa-descuadre` + 400 | art. 118 |
| N4 | Plan amort ≠ anticipo | Alta p5 | `plan-monto-3`=`50000` | `plan-descuadre` + 400 "$300,000.00" | 143 fr. I |
| N4b | Anticipo > 30% sin PDF | Alta p4 | `anticipo-input`=`31`, sin `anticipo-pdf-input` | `anticipo-pdf-requerido`; wizard bloqueado | art. 50 fr. IV |
| N5 | Garantía vencida | HU-02 | `mp-vencimiento`=`2020-01-01` | 400 | art. 48 |
| N6 | Garantía > contrato | HU-02 | `mp-monto`=`9999999` | 400 | art. 48 |
| N7 | 2ª garantía mismo tipo | HU-02 | otra Cumplimiento | 409 | art. 48 |
| N8 | Avance excede contratado | HU-06 | `cap-cantidad`=`1500` (C-01 P1) | 409 + `aviso-exceso` | art. 118 |
| N8b | Avance no programado / excede periodo | HU-06 | C-03 P1 · C-02 P1=`300` | **AVISO** (`aviso-no-programado`/`aviso-excede-periodo`, NO bloquea, 200) | art. 53 |
| N9 | **Generador excede plan (wizard)** | HU-12 ② | `gen-cantidad-*` C-03=`50` en P1 | `semaforo-plan-exceso` + `btn-wsiguiente` disabled | 45-A-X + 52 |
| N9b | Generador excede contratado (wizard) | HU-12 ② | C-01 acumulado `1001` | `aviso-exceso` + disabled; 409 | art. 118 |
| N10 | Periodo estimación > 1 mes | HU-12 ① | `periodo-fin`=`2026-02-15` | 400 (art. 54) | art. 54 |
| N10b | Periodo que solapa | HU-12 ① | periodo de otra estimación | 409 `banner-error` | art. 54 |
| N11 | Integrar sin candado | HU-12 ⑤ | `check-cierre` sin marcar | `btn-integrar` disabled | UX wizard |
| N11b | Integrar sin periodo / sin líneas | HU-12 ⑤ | periodo vacío / 0 generadores | `btn-integrar` disabled + `confirmar-bloqueado-hint` | UX wizard |
| N11c | Neto negativo | HU-12 ③ | `caratula-deductivas` enorme | `btn-wsiguiente` disabled; 400 | carátula |
| N11d | Integrar no siendo superintendente | HU-12 | otro contratista | aviso + 403 | art. 54 |
| N12 | Integrar contrato sin PDF | HU-12 | contrato sin PDF | 409 "no tiene PDF firmado" | HU-01 |
| N13 | Autorizar sin turnar | HU-15 | autorizar recién Presentada | 409 "aún no turnada" | flujo HU-15 |
| N13b | Turnar sin obs ni "sin obs" | HU-15 | ni observación ni `chk-sin-observaciones` | `btn-turnar` disabled | flujo HU-15 |
| N13c | Rechazar sin motivo | HU-15 | `motivo-rechazo` vacío | `btn-rechazar` disabled | flujo HU-15 |
| N14 | Reingreso de no-rechazada | HU-16 | reingresar la #1 (pagada) | 409 "solo una rechazada" | HU-16 |
| N15 | **Cargar techo SIN partida** | HU-20 ① | `input-partida` vacío | `btn-cargar-techo` disabled · 400 "art. 24" | art. 24 |
| N15b | Techo inválido / sin dependencia FK | HU-20 ① | `input-techo`=`-1` / contrato sin `dependencia_id` | toast "Techo inválido" / `aviso-sin-dependencia-fk` | art. 24 |
| N16 | Pagar no autorizada | HU-20 ④ / HU-21 | pagar #3 Integrada | 409 (art. 54) | art. 54 |
| N17 | Fecha pago < integración | HU-20 ④ / HU-21 | `pago-fecha`=`2025-12-31` | 400 | Plan2 Pase3 |
| N18 | Doble pago | HU-20 ④ / HU-21 | pagar #1 otra vez | 409 | no-doble-pago |
| **N18b** | **Registrar pago NO siendo finanzas** | **HU-20 ④** | paso ④ como `contratista@` | `btn-registrar-pago` disabled + `pago-solo-finanzas` | F6 (art. 54) |
| **N18c** | **Pagar estimación NO autorizada (selector)** | **HU-21** | `pago-estimacion` solo lista `autorizada` | integrada/presentada NO aparecen en el select | art. 54 |
| N19 | **Autorizar convenio >25% sin oficio** | HU-03 | plazo `120`, autorizar sin oficio | 409 "art. 102… carga el oficio" | art. 102 |
| N19b | Oficio no-PDF / duplicado | HU-03 | `conv-oficio-subir` .jpg / 2º oficio | toast "debe ser PDF" / 409 inmutable | art. 102 |
| N20 | **Autorizar convenio sin ser dependencia** | HU-03 | autorizar como residente | 403 | art. 59 p3 |
| N21 | **Re-autorizar convenio** | HU-03 | autorizar uno ya autorizado | 409 (acto único) | art. 59 p3 |
| N21b | Convenio Monto descuadrado | HU-03 | `cm-celda` que deja `cm-restante`≠0 | `cm-programa-descuadre`; guardar bloqueado | 45-A-X + 52 |
| N22 | Sustitución de OTRA empresa | HU-22 | `sust-nuevo` de otra empresa (patito1) | 409 (art. 125) | REGLA 4 |
| N23 | **Sustituir la dependencia** | HU-22 | `sust-rol`=dependencia | 400 "no sustituible" | art. 125 |
| N23b | Sustituir con motivo/persona vacíos | HU-22 | `sust-motivo`/`sust-nuevo` vacío | `btn-sustituir` disabled + toast | UX |
| N24 | Finiquito sin bitácora / dup / rol | HU-24 | sin bitácora · 2º · contratista | **disabled+`finiquito-sin-bitacora`** / 409 / 403 | art. 64 / 168-172 |
| N25 | **Estimación/pago tras finiquito** | HU-12/20 | contrato cerrado | 409 "contrato cerrado (art. 64)" | Oleada 1 |
| N26 | Emitir nota sin apertura firmada | HU-09 | antes de 3 firmas | 409 (`gate-emision`/art. 123 fr. III) | art. 123 |
| N26b | Doble apertura / firma | HU-08 | 2ª apertura · 2ª firma · no firmante | 409 / 409 / 403 | art. 123 |
| N27 | Folio de contrato duplicado | HU-01 | `dg-folio` repetido | 409 | UNIQUE folio |
| N28 | Clave de concepto repetida | HU-01 p1 | dos `concepto-clave-${i}`=`C-01` | 400 | 45 fr. IX |
| N29 | Editar/eliminar avance | HU-06 | (ya no existe) | solo **Corregir** (`btn-corregir-${id}`, append-only) | append-only |
| N30 | Asentar atraso duplicado | HU-07 | `btn-asentar-${id}` mismo 2× | 409 (idempotente) | Oleada 1 |
| **N31** | **TIPO B bajo candado** (contraprueba) | §TIPO-B | abrir Consultar/Historial/Curva/Portafolio/Reportes sin datos | **debe ABRIR** (estado vacío) | Regla de oro |
| N32 | Deep-link a HU/ruta no permitida | nav | URL de otra HU/rol | `<Navigate to="/" />` (a Inicio), sin error | guardas App.jsx |

---

## 7. CONTROL DE ACCESO (rol · participación · EMPRESA)
- **Por rol:** `finanzas@` no ve alta ni bitácora ni Tablero; `contratista@` ve alta en solo-lectura, no ve
  HU-07/HU-02; `supervision@` no ve HU-20/21 (pago); **el paso ④ "Registrar pago" solo lo ejecuta finanzas**.
  Padrón/Solicitudes/Roster/Finiquito solo **dependencia**(+residente en roster/finiquito). **HU-19 Reportes lo ven
  todos.**
- **Por participación:** un residente que no participa no ve el contrato (no aparece en el **modal de contrato**);
  por URL → 403 (o redirección a Inicio).
- **Por empresa:** dependencia de empresa A no ve contratos de empresa B (ni en el modal); finanzas transversal.
- **Sidebar plano + promoción:** cada rol ve solo sus ciclos; los sub-HU sueltos de un rol (dependencia →
  Presentar/Revisión/Reingreso/Historial) se **promueven** a ítems planos (Curva HU-05 **no** se promueve).
  **Deep-link** a ruta no permitida → `<Navigate to="/" />`.

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

## 9. Estado de funciones (tras 3A + P4-ALT)
| Tema | Estado |
|---|---|
| **Contrato activo GLOBAL** (modal `modal-elegir-contrato` + banner `banner-contrato-activo` + chip `chip-contrato-activo`) | ✅ |
| **Pestañas-enlace por ciclo** (`pestanas-ciclo` / `pestana-<key>`) + **chip de HU** (`chip-ciclo-hu`) | ✅ |
| Sidebar PLANO colapsable (`btn-toggle-sidebar`; items por texto) | ✅ |
| Notificaciones (campana `drop-campana` + centro `centro-notificaciones`) | ✅ |
| Wizard Estimación (5 pasos) · Wizard Pago (4 pasos, HU-21 embebido) · Wizard Bitácora (apertura→firma→emitir) | ✅ |
| HU-21: selector de pago SOLO `autorizada` | ✅ |
| Convenio + acto de autorización · partida obligatoria · editor de programa (Monto) | ✅ |
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

## 11. CHANGELOG — qué cambió respecto a la versión del 18-jun (actualización 21-jun)
> Solo se actualizó el **FLUJO y los testids de navegación**; el **DATASET y los valores pre-cuadrados** (folio,
> objeto, montos, conceptos cant/PU, fechas, jurídicos, garantías, netos $69,500 / $330,125 / total expediente
> $399,625) **se conservaron sin cambios**.

1. **`select-contrato` por pantalla → ELIMINADO (3A).** Sustituido por el **contrato activo global**: modal
   bloqueante **`modal-elegir-contrato`** (botones `modal-contrato-<id>`, `modal-contrato-buscar`,
   `modal-contrato-portafolio`, `modal-contrato-crear`/`-crear-footer`, `modal-contrato-inicio`,
   `modal-contrato-salir`; estados `modal-contrato-sin-crear`/`-sin-asignados`/`-vacio`) + banner
   **`banner-contrato-activo`** con **`btn-cambiar-contrato`** + chip **`chip-contrato-activo`**. Se añadió el
   **PASO 1b** (elegir contrato en el modal) y las negativas **N1d** (modal sin contratos) / **N1e** (el contrato
   no se hereda entre cuentas).
2. **Bloque «EN PARALELO» (`par-revision`/`par-reingreso`/`par-historial`/`par-tablero`) → ELIMINADO (P4-ALT).**
   Reemplazado por la barra de **pestañas-enlace** `pestanas-ciclo` con `pestana-<key>`. Se documentó el mapa
   completo de pestañas por ciclo (§3.2) y se reescribió cada navegación PASO 4–17 para usarlas.
3. **Chip de HU puntual añadido:** `chip-ciclo-hu` (p. ej. «Avance · HU-05», «Pago · HU-20») anotado en cada paso.
4. **Sidebar:** labels reales corregidos a los del código — «Fianzas / garantías» (antes «Registro de fianzas»),
   «Ciclo de estimación» (antes «Integración del periodo»), «Pago y tránsito», «Convenios» (antes «Convenios
   modificatorios»), «Cierre / finiquito» (antes «Finiquito»), «Roster / sustitución». Botón al pie =
   **«← Cambiar de rol»**. Añadido el toggle **`btn-toggle-sidebar`**.
5. **Rutas corregidas a las reales de `App.jsx`:**
   - Curva: `/curva-avance` → **`/seguimiento/curva-avance`**.
   - Minutas: `/minutas-visitas` → **`/bitacora/minutas`**.
   - Presentar: ruta confirmada **`/estimaciones/envio`** (pestaña `pestana-presentar`).
   - Historial/Revisión/Reingreso confirmadas: `/estimaciones/historial` · `/estimaciones/revision` ·
     `/estimaciones/reingreso`.
6. **Login/registro:** enlace a registro = **«Regístrate»** (antes el texto del plan decía «Crear cuenta»); volver =
   **«Inicia sesión»**. Opción vacía del select de empresa = **«— Sin empresa / elige tu empresa —»**.
7. **HU-21:** el selector `pago-estimacion` SOLO ofrece estado **`autorizada`** (`PAGABLES = new Set(['autorizada'])`);
   añadida la negativa **N18c**. Se mapeó la tabla `tabla-pagos` (`fila-pago`, `plazo-${p.id}`).
8. **Notificaciones:** documentada la campana (`drop-campana`, `drop-campana-items`, `drop-firmar-ir`,
   `drop-campana-ir`, `drop-solicitudes-ir`) y el centro **`centro-notificaciones`** (vía `drop-ver-todas`).
9. **Vistas multi-contrato (Portafolio/Tablero/Padrón):** marcadas como **sin banner/modal** (ignoran el contrato
   activo); el contrato sin acceso ya no aparece en la lista del modal.
10. **Reportes:** ya NO usa `select-contrato-reporte` (el contrato viene del banner global); se conserva
    `select-periodo-reporte` y los 8 botones `btn-exportar-${id}-${formato}`.
11. **Reordenamiento del recorrido:** el orden de PASOS se ajustó al ciclo oficial pedido (… → reingreso →
    historial → tablero → **pago** → convenios → portafolio → reportes → roster → padrón → finiquito), manteniendo
    todas las pruebas negativas y sus valores exactos.

---

*Plan actualizado leyendo el código real de hoy: `ModalContratoActivo.jsx`, `BannerContratoActivo.jsx`,
`PestanasCiclo.jsx`, `ContratoActivoContext.jsx`, `AppShell.jsx`, `Sidebar.jsx`, `App.jsx`, `SeleccionRol.jsx`,
`AltaContrato.jsx`, `RegistroFianzas.jsx`, `AperturaBitacora.jsx`, `AmbienteBitacora.jsx`, `EmisionNotas.jsx`,
`AmbienteAvance/TrabajosTerminados/CurvaAvance`, `AlertasAtraso`, `MinutasVisitas`, `ConsultaNotas`,
`IntegracionEstimacion`, `EnvioEstimacion`, `RevisionEstimacion`, `ReingresoEstimacion`, `HistorialEstimaciones`,
`TableroEstimaciones`, `TransitoPago` + `RegistroPagoForm`/`RegistroPago`, `ConveniosModificatorios` +
`EditorProgramaConvenio`, `PortafolioEjecutivo`, `ExportacionReportes`, `RosterContrato`, `EmpresasPadron`,
`Finiquito`, `ConsultaExpediente`, `NotificacionesCentro`, `e2e/_helpers.js`). Math pre-cuadrada al centavo (sin
cambios). Si un valor/navegación no coincide, es señal de un cambio en el código, no del plan.*
