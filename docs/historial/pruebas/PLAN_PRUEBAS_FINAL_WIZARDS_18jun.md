# PLAN DE PRUEBAS DEFINITIVO — SIGECOP con WIZARDS · VALORES EXACTOS (18-jun-2026)

> **Para imprimir y palomear casilla por casilla.** Da de alta **UN contrato desde cero**
> (`OBRA-2026-PRUEBA-FINAL`) y recórrelo de punta a punta — hasta el **finiquito** — **en el orden oficial del
> ciclo** (el orden en que el profe lo revisaría): alta → garantías → bitácora → avance → **estimación (su
> WIZARD)** → revisión/autorización → **pago (su WIZARD)** → convenio (+ **autorización**) → finiquito.
>
> **Refleja el sistema TRAS el Plan Grande (rediseño por wizards):**
> - **Ciclo de estimación = WIZARD de 5 pasos** (`/estimaciones/integracion`): Periodo → Generadores →
>   Carátula → Soportes/Notas → Integrar y presentar. El cascarón viejo `/estimaciones/ambiente` **redirige** al
>   wizard; "Recorrido por bloques" **ya no está** en el sidebar (el padre ES el recorrido).
> - **Pago = WIZARD de 3 pasos** (`/pagos/transito`): Suficiencia → Soportes → Instrucción (+ enlace a registrar el pago).
> - **Bitácora = WIZARD** (`/bitacora/ambiente`): Apertura → Firma → Emitir; Consulta/Minutas en **paralelo**.
> - **Avance** (`/seguimiento/ambiente`): Registrar (acción) + Curva/Atrasos en paralelo.
> - **ITEM 3.1:** al cargar el techo presupuestal, la **partida específica es OBLIGATORIA** (art. 24 párr. 2 LOPSRM).
> - **ITEM 3.2:** el convenio tiene un **acto de AUTORIZACIÓN** separado del registro (art. 59 párr. 3 LOPSRM).
> - **Evidencia fotográfica = FUERA del alcance de la Etapa 1** (la ley no la exige).
> - Padrón de empresas + acotamiento por empresa + navegación modo-sistema (sidebar por flujos).
>
> **Reglas de cuadre (server-side):** monto `= Σ ROUND(cant×PU,2)` (art. 45 fr. IX) · programa `Σ planeado =
> contratado` por concepto (100%) · plan amort `Σ cuotas = ROUND(monto×anticipo%,2)` · carátula `neto =
> subtotal − amortización − 5 al millar − deductivas − retención_atraso`, **SIN IVA** · 5 al millar = art. 191
> LFD (0.5%).
>
> **Math sin cambios respecto al plan anterior** (`PLAN_PRUEBAS_VALORES_FINAL_18jun.md`): los wizards solo
> reordenan la captura en pasos; el cálculo lo hace el mismo backend. Estimación #1 = **$69,500.00**.

---

## 0. PREPARACIÓN — déjalo TODO lo nuevo visible (resuelve "no veo los wizards")

> **Diagnóstico (verificado en tu entorno 18-jun):** las **4 DDL ya están aplicadas** en tu BD local y tu
> **Vite ya sirve el código del wizard**. Si no ves los cambios es por una **pestaña vieja en caché** (el HMR de
> Vite sobre Windows+Docker no propaga). La receta definitiva:

```bash
# (1) Reinicia frontend y backend para forzar un grafo de módulos limpio (Vite re-lee las fuentes).
docker restart sigecop_frontend sigecop_backend

# (2) Espera ~5-8 s a que Vite arranque (verás "VITE vX ready" en los logs).
docker logs --tail 5 sigecop_frontend

# (3) En el navegador: RECARGA DURA (Ctrl+Shift+R) o abre una pestaña NUEVA / incógnito:
#     http://localhost:5173
#     (Confirma: login contratista@ → "Ciclo de estimación" → elige un contrato → ves la BARRA DE 5 PASOS.)

# (4) (Opcional) Comprobación de que el server SÍ sirve el wizard (debe imprimir 1):
curl -s http://localhost:5173/src/pages/IntegracionEstimacion.jsx | grep -c wizard-estimacion-pasos
```
- **NO necesitas aplicar ninguna DDL** (las 4 ya están en tu BD local: `presupuesto_anual.dependencia_id` +
  `partida NOT NULL` + UNIQUE; `convenios_modificatorios.estado/autorizado_en`; `concepto_avance.estado` +
  trigger; tabla `atraso_asentado`). Si alguna vez reseteas la BD (`docker compose down -v`), entonces sí
  re-aplica las 4 (ver Apéndice §10).

### 0.1 Sembrar datos demo (opcional, recomendado)
```bash
docker exec sigecop_backend npm run reseed:cuentas   # cuentas 1 empresa:N (ver §2) — idempotente
docker exec sigecop_backend npm run seed:demo        # contratos demo OBRA-2026-% — idempotente
```

### 0.2 Cómo leer cada paso
Cada paso: **CUENTA** · **PANTALLA** (cómo llegar por el sidebar) · **DATOS EXACTOS (testid → valor)** ·
**RESULTADO**. 🟢 = caso bueno (ACEPTA) · 🔴 = caso malo a propósito (RECHAZA/AVISA). Las 🔴 son las que más valen.

---

## 1. Cuentas demo (contraseña común `Sigecop2026!`)

> Login = email + contraseña (`login-usuario`, `login-password`, botón **Iniciar sesión**); el rol se deduce.

| Cuenta | Rol | Empresa | Papel en el contrato de prueba |
|---|---|---|---|
| `residente@sigecop.test` | residente | Dependencia Demo | **Da de alta**, abre bitácora, autoriza estimación, finiquito |
| `contratista@sigecop.test` | contratista | Constructora Demo | Superintendente: integra/presenta/reingresa, registra avance |
| `supervision@sigecop.test` | supervision | Supervisión Externa Demo | Observa y **turna** la estimación |
| `dependencia@sigecop.test` | dependencia | Dependencia Demo | Contratante; crea **y autoriza** convenios; valida padrón; finiquito |
| `finanzas@sigecop.test` | finanzas | Dependencia Demo | Tránsito a pago + registra el pago |

---

## 2. EMPRESAS MÚLTIPLES (re-seed 1 empresa : N cuentas) — para probar el acotamiento

> **SÍ se hizo** el re-seed (`backend/scripts/reseed_cuentas.sql`, `npm run reseed:cuentas`). Estado real
> verificado en tu BD local (18-jun). **Hay 3 dependencias distintas** (clave para "A-no-ve-B") y empresas con
> varias cuentas:

| Empresa | Tipo | Cuentas (todas pass `Sigecop2026!`) |
|---|---|---|
| **Dependencia Demo** | dependencia | `residente@`, `residente2.demo@`, `dependencia@`, `finanzas@` |
| **Dependencia Norte** | dependencia | `dep2@sigecop.test` |
| **Dependencia Sur Demo** | dependencia | `dependencia.sur@`, `residente.sur@` |
| **Constructora Demo** | contratista | `contratista@`, `super2.demo@`, `super3.demo@` |
| **Constructora Patito SA de CV** | contratista | `patito1@`, `patito2@` |
| **Supervisión Externa Demo** | supervision | `supervision@`, `superv2.demo@` |
| **Supervisión Técnica Sur Demo** | supervision | `superv.sur@` |

> **Para el acotamiento (PASO 16):** entra como `dependencia@` (Dependencia Demo) y como `dependencia.sur@`
> (Dependencia Sur Demo) o `dep2@` (Dependencia Norte): cada una ve solo los contratos de **SU** empresa.
> *(Nota: tu BD tiene además empresas/cuentas de "pollution" de specs — `Constructora O3 <ts>`, `Grupo Mismo
> <ts>`, `Empresa Alpha/Beta <ts>`, `regla4.*`, `o3.con.*`; ignóralas, son basura de pruebas automatizadas.)*

---

## 3. CÓMO NAVEGAR — sidebar por flujos (acordeones), TRAS los wizards

> Sidebar guinda por **FLUJOS**: el padre **NAVEGA** a su pantalla; el chevron ▸/▾ expande sub-pasos.

| Grupo | Flujo (padre → ruta) | Sub-pasos (chevron ▸) |
|---|---|---|
| **Flujos** | 📄 **Alta de contrato** → `/contratos/alta` (HU-01) | Fianzas/garantías → `/contratos/fianzas` (HU-02) |
| | 📐 **Ciclo de estimación** → `/estimaciones/integracion` (HU-12, **WIZARD 5 pasos**) | Presentar `/estimaciones/envio` (HU-13) · Revisión/autorización `/estimaciones/revision` (HU-15) · Reingreso `/estimaciones/reingreso` (HU-16) · Historial `/estimaciones/historial` (HU-14) — **ya NO hay "Recorrido por bloques"** (el padre ES el wizard) |
| | 📓 **Bitácora** → `/bitacora/apertura` (HU-08) | Por firmar `/bitacora/por-firmar` · Emitir notas `/bitacora/notas` (HU-09) · Consultar `/bitacora/consulta` (HU-10) · Minutas `/bitacora/minutas` (HU-11) · **Recorrido (WIZARD)** `/bitacora/ambiente` |
| | 🏗️ **Avance y seguimiento** → `/seguimiento/trabajos-terminados` (HU-06) | Curva `/seguimiento/curva-avance` (HU-05) · Alertas `/seguimiento/alertas` (HU-07) · Recorrido `/seguimiento/ambiente` |
| | 💳 **Pago y tránsito** → `/pagos/transito` (HU-20, **WIZARD 3 pasos**) | Registro del pago `/pagos/registro` (HU-21) · Recorrido (macro) `/pagos/ambiente` |
| | 📝 **Convenios** → `/contratos/modificatorios` (HU-03) | Recorrido `/contratos/convenio-ambiente` |
| | 🏁 **Cierre / finiquito** → `/contratos/finiquito` (HU-24) | — |
| | 🗂️ **Expediente** → `/contratos/expediente` (HU-04) | — |
| **Vistas ejecutivas** | 📊 Portafolio `/portafolio` (HU-18) · 📈 Tablero `/estimaciones/tablero` (HU-17) · 📤 Reportes `/reportes` (HU-19) · 🗺️ Ciclo de vida `/contratos/ciclo-vida` | — |
| **Administración** | 🏢 Padrón `/admin/empresas` · 👥 Roster `/contratos/roster` (HU-22) · ✅ Solicitudes `/usuarios/solicitudes` | — |

---

## 4. DATASET CANÓNICO — `OBRA-2026-PRUEBA-FINAL` (créalo desde cero, math cuadrada al centavo)

### 4.1 Datos generales (Alta, paso 0)
| Campo (testid) | Valor |
|---|---|
| Folio (`dg-folio`) | `OBRA-2026-PRUEBA-FINAL` |
| Tipo (`dg-tipo`) | **Obra pública sobre la base de precios unitarios** |
| Objeto (`dg-objeto`) | `Construcción de aula didáctica — campus UAGRO (prueba E2E final)` |
| Ubicación (`dg-ubicacion`) | `Av. Juárez s/n, Chilpancingo, Gro.` *(si el campo existe; opcional)* |
| Dependencia (`dg-dependencia`) | **Lic. Diana Dependencia Demo** |
| Plazo en días (`dg-plazo`) | `90` |
| Fecha de inicio (`dg-fecha`) | `2026-01-01` |
| % pena por atraso (`dg-pena`) | *(VACÍO)* → sin retención por atraso en el camino feliz |
| Superintendente (`select-superintendente`) | **Arq. Carlos Contratista Demo** |
| Supervisión (`select-supervision`) | **Ing. Sofía Supervisión Demo** |

> Derivados: término **2026-03-31** · **Monto = $1,000,000.00** (SIN IVA). Botón **Siguiente →** (`btn-siguiente`).

### 4.2 Catálogo de conceptos (Alta, paso 1) → monto $1,000,000.00
| # | Clave (`concepto-clave-i`) | Concepto (`concepto-concepto-i`) | Unidad (`concepto-unidad-i`) | Cantidad (`concepto-cantidad-i`) | P.U. (`concepto-pu-i`) | Importe |
|---|---|---|---|---|---|---|
| 0 | `C-01` | Limpieza y trazo del terreno | m² | `1000` | `50.00` | 50,000.00 |
| 1 | `C-02` | Excavación a máquina | m³ | `500` | `200.00` | 100,000.00 |
| 2 | `C-03` | Concreto f'c=200 kg/cm² | m³ | `300` | `2500.00` | 750,000.00 |
| 3 | `C-04` | Acero de refuerzo fy=4200 | kg | `2000` | `50.00` | 100,000.00 |
| | | | | | **Σ MONTO** | **$1,000,000.00** 🟢 |

> Botón **+ Agregar concepto** por cada fila. El monto lo **deriva** el sistema (no se teclea).

### 4.3 Programa de obra (Alta, paso 2) — Mensual → 3 periodos (P1 ene · P2 feb · P3 mar). Σ por concepto = 100%
| Clave | P1 | P2 | P3 | Σ = Contratado |
|---|---|---|---|---|
| C-01 | `1000` | `0` | `0` | 1000 🟢 |
| C-02 | `250` | `250` | `0` | 500 🟢 |
| C-03 | `0` | `150` | `150` | 300 🟢 |
| C-04 | `0` | `1000` | `1000` | 2000 🟢 |
| **$ periodo** | 100,000 | 475,000 | 425,000 | Σ 1,000,000 🟢 |

> Al cuadrar: banner verde `programa-cuadra`. Ciclo (`select-ciclo` o similar) = **Mensual**.

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

> Con 30% (no >30%) NO se exige el PDF de autorización del titular. Anticipo derivado = **$300,000.00**.

Garantías obligatorias en el alta (botón **+ Agregar póliza**):
| Tipo (`garantia-tipo-i`) | Afianzadora (`garantia-afianzadora-i`) | Póliza (`garantia-poliza-i`) | Monto (`garantia-monto-i`) | Vigencia (`garantia-vigencia-i`) |
|---|---|---|---|---|
| **Cumplimiento** | `Fianzas del Pacífico S.A.` | `FC-2026-001` | `100000.00` *(10% del contrato)* | `2027-06-01` |
| **Anticipo** | `Fianzas del Pacífico S.A.` | `FA-2026-001` | *(read-only = 30% = `300000.00`)* | `2027-06-01` |

### 4.6 Plan de amortización (Alta, paso 5) — Σ = $300,000.00 (proporcional al programa, art. 143 fr. I)
| Periodo | Monto (`plan-monto-N`) |
|---|---|
| P1 | `100000.00` |
| P2 | `100000.00` |
| P3 | `100000.00` |
| **Σ** | **$300,000.00** 🟢 (banner `plan-cuadra`) |

> Atajo: botón **"Restablecer proporcional"** (`plan-restablecer`).

### 4.7 PDF firmado (Alta, paso 6) — **obligatorio para guardar**
Sube cualquier `.pdf` real (`pdf-firmado-input-precaptura`). El backend valida que empiece con `%PDF`. **Sin
este PDF NO se podrán integrar estimaciones después** (candado server-side de HU-12). Botón **Guardar contrato**.

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
Entra/sal con cada cuenta del §1. 🟢 Todas inician; el chip de empresa y el menú cambian por rol. 🔴 contraseña `X` → *"Credenciales inválidas"*.

### ▢ PASO 2 — Alta del contrato (HU-01)
- **Cuenta:** `residente@` · **Sidebar:** Flujos → **Alta de contrato** (`/contratos/alta`).
- Teclea **todo el §4** (pasos 0→6 del wizard del alta, gating secuencial con **Siguiente →**). PDF firmado obligatorio.
- 🟢 contrato guardado; aparece en **7. Registrados**, folio `OBRA-2026-PRUEBA-FINAL`, monto **$1,000,000.00**.

### ▢ PASO 3 — Garantías: póliza + endoso (HU-02)
- **Cuenta:** `dependencia@` *(gestiona; residente solo consulta)* · **Sidebar:** Alta → chevron → **Fianzas/garantías** (`/contratos/fianzas`). Elige el contrato (`select-contrato`).
- 🟢 **+ Agregar nueva póliza** (`btn-agregar-poliza`): `mp-tipo`=**Cumplimiento** · `mp-afianzadora`=`Fianzas del Pacífico S.A.` · `mp-folio`=`FP-2026-00123` · `mp-monto`=`100000` · `mp-vencimiento`=`2027-06-01` · `mp-archivo`=*(.pdf)* → **Registrar** (`mp-confirmar`).
- 🟢 **+ endoso** (`btn-endoso-<id>`): `endoso-motivo`=`Prórroga de vigencia` · `endoso-vigencia`=`2028-06-30` → **Registrar endoso** (`endoso-confirmar`).
- 🔴 ⭐ monto `9999999` → 400 · vigencia `2020-01-01` → 400 · 2ª del mismo tipo → 409 (art. 48).

### ▢ PASO 4 — Apertura de bitácora (HU-08) + firma conjunta
- **Cuenta:** `residente@` · **Sidebar:** Flujos → **Bitácora** (`/bitacora/apertura`). Elige el contrato.

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
- **Firma (✍️ Por firmar / `/bitacora/por-firmar`):** firma con `residente@`, `contratista@`, `supervision@` → 🟢 apertura **3/3 COMPLETA**.
- **WIZARD opcional** (`/bitacora/ambiente`): verás la barra de pasos `wizard-bitacora-pasos` (Apertura→Firma→Emitir); el paso **Emitir** queda con **🔒 candado** (`candado-bit-4`) hasta las 3 firmas; Consulta/Minutas siempre accesibles (en paralelo).
- 🔴 ⭐ emitir nota (HU-09) **antes** de las 3 firmas → **409** *"…firmada por TODOS"* (art. 123 fr. III).

### ▢ PASO 5 — Nota de bitácora (HU-09) + Minutas (HU-11)
- **Nota:** `supervision@` · Bitácora → **Emitir notas** (`/bitacora/notas`): `select-tipo`=**Avance físico y financiero** · `input-tag`=`avance` · `input-contenido`=`Se verifica avance de excavación conforme a programa.` → **Emitir nota** (`btn-emitir`).
- **Minutas:** `residente@` · Bitácora → **Minutas** (`/bitacora/minutas`): registra una minuta (fecha/lugar/participantes/asunto/acuerdos + PDF) → **Adjuntar a nota** (vincula a una nota real) · agenda una visita.
- 🔴 ⭐ vincular nota de **otro** contrato → 400.

### ▢ PASO 6 — Avance (HU-06) + nota automática + Curva (HU-05)
- **Cuenta:** `contratista@` · **Sidebar:** Flujos → **Avance y seguimiento** (`/seguimiento/trabajos-terminados`). Elige el contrato. Registra DOS avances (`btn-registrar-avance`):

  | Concepto (`cap-concepto`) | Periodo (`cap-periodo`) | Cantidad (`cap-cantidad`) |
  |---|---|---|
  | C-01 Limpieza y trazo | Periodo 1 | `1000` |
  | C-02 Excavación | Periodo 1 | `250` |
- 🟢 cada avance **genera su nota de bitácora** automática (tipo `avance`).
- **Corrección (append-only, ITEM 3.3):** para corregir un avance, usa **Corregir** (`btn-corregir`, formulario "dice/debe decir") — **ya NO hay Editar/Eliminar** (el avance es inmutable; corregir = registro nuevo vinculado, art. 123 fr. VI/VII).
- **Curva (HU-05):** `residente@` · Avance → chevron → **Curva de avance** (`/seguimiento/curva-avance`).
- 🔴 ⭐ avance C-01 P1 = `1500` (>1000) → **409** *"Excede lo contratado (art. 118)"*. Avance > planeado del periodo → **AVISO** (201), no bloquea.

### ▢ PASO 7 — Alertas de atraso (HU-07)
- **Cuenta:** `residente@` · Avance → chevron → **Alertas de atraso** (`/seguimiento/alertas`). Elige el contrato. Déficit al periodo vigente (P3): C-02 250, C-03 300, C-04 2000.
- 🟢 en C-03 **Asentar en bitácora** → nota de **atraso** (art. 53). 🔴 ⭐ asentar el **mismo** (concepto, periodo) **dos veces** → **409** (idempotente, tabla `atraso_asentado`, ITEM Oleada 1).

### ▢ PASO 8 — Ciclo de estimación = **WIZARD de 5 pasos** (HU-12/13/15/16)
> **Cuenta:** `contratista@` · **Sidebar:** Flujos → **Ciclo de estimación** (`/estimaciones/integracion`). Elige
> el contrato (`select-contrato`) → aparece la **barra de pasos** `wizard-estimacion-pasos`:
> **① Periodo · ② Generadores · ③ Carátula · ④ Soportes y notas · ⑤ Integrar y presentar.**
> Navega con **Siguiente →** (`btn-wsiguiente`) / **← Atrás** (`btn-watras`) o clicando cada paso (`wpaso-<clave>`).

**8a — Integrar #1 (HU-12) por el wizard:**
1. **① Periodo** (`wpaso-periodo`): `periodo-selector`=**Periodo 1**; o `periodo-inicio`=`2026-01-01`, `periodo-fin`=`2026-01-31`. → **Siguiente**.
2. **② Generadores** (`wpaso-generadores`): en `tabla-generadores`, C-01 (`gen-cantidad-…`)=`1000`, C-02=`250` (C-03/C-04 vacíos). El semáforo de plan debe estar verde (≤ planeado del periodo). → **Siguiente**.
3. **③ Carátula** (`wpaso-caratula`): `caratula-deductivas`=`0`. Verifica `caratula-neto-preview` = **$69,500.00** (subtotal 100,000 − amort 30,000 − 5 al millar 500). → **Siguiente**.
4. **④ Soportes y notas** (`wpaso-soportes`): (opcional) **🔍 Buscar y vincular notas firmadas** (`btn-abrir-buscador-notas`) → vincula la nota del PASO 5. Aviso `soportes-fotos-alcance`: *"el registro fotográfico es fuera del alcance de la Etapa 1"*. → **Siguiente**.
5. **⑤ Integrar y presentar** (`wpaso-integrar`): marca el candado **¿Seguro que vas a cerrar?** (`check-cierre`) → **Confirmar e integrar estimación** (`btn-integrar`). → 🟢 `banner-integrada`, neto oficial **$69,500.00**. Enlace **Ir a presentar** (`link-presentar`).

**8b — Presentar (HU-13):** `contratista@` · `/estimaciones/envio` (o el enlace del paso 5) → **Presentar** → estado **"Presentada"** (arranca plazo art. 54).

**8c — Supervisión turna (HU-15):** `supervision@` · Ciclo → chevron → **Revisión/autorización** (`/estimaciones/revision`). (Opcional) observación: sección **carátula**, tipo **aclaración**, descripción `Verificar generadores de C-02.` → **Turnar**.

**8d — Residencia AUTORIZA (HU-15):** `residente@` · misma pantalla → **Autorizar** → **"Autorizada"**.

**8e — #2 → RECHAZO → REINGRESO (HU-16):**
- Integra **#2** por el wizard (`contratista@`, **Periodo 2**): C-02=`250`, C-03=`150`, C-04=`1000` → neto **$330,125.00**. Presenta.
- `supervision@` **turna**; `residente@` **RECHAZA** (motivo `Faltan soportes de C-03; recapturar generadores.`) → **"Rechazada"**.
- **Reingreso:** `contratista@` · Ciclo → chevron → **Reingreso** (`/estimaciones/reingreso`) → confirma observaciones atendidas → **Reingresar** → 🟢 **#3 "Integrada"** (copia carátula, neto $330,125.00, `reemplaza_a`=#2; el plazo art. 54 NO se reinicia).

**🔴 ⭐ Negativas del ciclo (en el wizard):**
- ② Generadores C-03=`50` en **Periodo 1** (planeado P1=0) → el semáforo `semaforo-plan-exceso` se pone rojo y **`btn-wsiguiente` queda deshabilitado** (no avanzas al paso ③); el backend igual rechazaría con 409.
- ① Periodo `2026-01-01`→`2026-02-15` y al integrar → **400** *"no puede exceder un mes (art. 54)"*.
- Integrar **sin** marcar `check-cierre` → el botón `btn-integrar` está **deshabilitado**.
- Autorizar (8d) **antes** de turnar → **409** *"aún no ha sido turnada"*.
- Reingresar la #1 (pagada) → **409** *"Solo… una 'rechazada'"*.

### ▢ PASO 9 — Pago = **WIZARD de 3 pasos** (HU-20) + Registro (HU-21)
> **Cuenta:** `finanzas@` · **Sidebar:** Flujos → **Pago y tránsito** (`/pagos/transito`). Elige el contrato
> (`select-contrato`) + la **estimación #1 Autorizada** (`select-estimacion`) → aparece `wizard-pago-pasos`:
> **① Suficiencia · ② Soportes · ③ Instrucción.** Navega con `btn-wsiguiente-pago` / `btn-watras-pago`.

1. **① Suficiencia** (`wpaso-pago-suficiencia`): si no hay techo, cárgalo (rol finanzas) — **ITEM 3.1: la partida es OBLIGATORIA**:

   | Campo (testid) | Valor |
   |---|---|
   | **Partida específica (`input-partida`)** | `62201` *(obra pública — OBLIGATORIO, art. 24 LOPSRM)* |
   | Techo de la partida (`input-techo`) | `5000000` |

   → **Cargar techo** (`btn-cargar-techo`). 🟢 suficiencia OK (neto 69,500 ≤ techo). *(La dependencia se manda por FK automáticamente.)* → **Siguiente**.
2. **② Soportes** (`wpaso-pago-soportes`): Factura (`input-factura`=`F-2026-001` → `btn-cargar-factura`) · CFDI (`input-cfdi`=`A1B2C3D4-1111-2222-3333-444455556666` → `btn-cargar-cfdi`). La fianza de cumplimiento se lee del alta. → **Siguiente**.
3. **③ Instrucción** (`wpaso-pago-instruccion`): semáforo del plazo de 20 días (art. 54) → **💸 Generar instrucción de pago** (`btn-generar-instruccion`). 🟢 `aviso-instruccion-generada`. Enlace **Ir a registrar el pago** (`link-registrar-pago`).

- **Registro del pago (HU-21):** `finanzas@` · Pago → chevron → **Registro del pago** (`/pagos/registro`):

  | Campo (testid) | Valor |
  |---|---|
  | Estimación a pagar (`pago-estimacion`) | **#1 · autorizada · $69,500.00** |
  | Importe (`pago-importe-neto`) | **$69,500.00** *(read-only)* |
  | Fecha de pago (`pago-fecha`) | `2026-06-18` |
  | Referencia SPEI (`pago-referencia`) | `SPEI-2026-000123` |
  | Folio fiscal CFDI (`pago-cfdi`) | `A1B2C3D4-1111-2222-3333-444455556666` |
  | Fecha de la factura (`pago-fecha-factura`) | `2026-06-18` |
  **Registrar pago** (`btn-registrar-pago`) → 🟢 `aviso-pago-registrado` **$69,500.00**; la #1 pasa a **"pagada"**.
- 🔴 ⭐ cargar techo **sin partida** (`input-partida` vacío) → el botón `btn-cargar-techo` está **deshabilitado**; por API → **400** *"La partida presupuestal específica es obligatoria (art. 24 LOPSRM)"* (ITEM 3.1). · pagar la **#3 Integrada** → **409** (solo lo autorizado, art. 54) · fecha de pago `2025-12-31` → **400** · pagar la #1 otra vez → **409**.

### ▢ PASO 10 — Convenio (HU-03) + **ACTO DE AUTORIZACIÓN** (ITEM 3.2)
- **Cuenta:** `dependencia@` · **Sidebar:** Flujos → **Convenios** (`/contratos/modificatorios`). Elige el contrato.

  | Campo (testid) | Valor |
  |---|---|
  | Tipo (`cm-tipo`) | **Plazo** |
  | Plazo nuevo en días (`cm-plazo-nuevo`) | `100` *(de 90 → +11.11%, ≤25%)* |
  | Motivo (`cm-motivo`) | `Ampliación por lluvias atípicas (dictamen técnico, art. 99 RLOPSRM).` |
  | Folio (`cm-folio`) | *(vacío → genera `CM-001`)* |
  **Registrar convenio** (`btn-registrar-convenio`) → 🟢 `CM-001` queda **"Pendiente de autorización"** (`conv-badge-registrado-…`); la nota de bitácora ligada se ve (🔗 Nota #N).
- **AUTORIZACIÓN (ITEM 3.2, art. 59 párr. 3):** en la fila del convenio, como **dependencia**, pulsa **✔ Autorizar convenio** (`conv-autorizar-<id>`) → 🟢 pasa a **"Autorizado"** (`conv-badge-autorizado-…`) con sello (quién/cuándo).
- 🔴 ⭐ **(ITEM 3.2)**: registrar un convenio con variación **>25%** (plazo `120`, +33%) → se registra con **AVISO** (`aviso-sfp`), **NO se bloquea** el registro; pero al **Autorizar** sin haber cargado el **oficio de aprobación** → **409** *"La variación supera el 25% (art. 102 RLOPSRM): carga el oficio… antes de autorizar"*. Sube el oficio (📎) y reintenta → 🟢 autoriza. · Autorizar con un rol que **no es dependencia** → **403**. · **Re-autorizar** uno ya autorizado → **409** (acto único).

### ▢ PASO 11 — Roster / sustitución (HU-22) + REGLA 4 (misma empresa)
> **Pre:** ten una 2ª cuenta de contratista de la MISMA empresa (Constructora Demo): usa `super2.demo@` o
> `super3.demo@` (ya sembradas, §2). Para la 🔴, una de OTRA empresa: `patito1@` (Constructora Patito).
- **Cuenta:** `dependencia@` (o residente) · **Sidebar:** Administración → **Roster** (`/contratos/roster`). Contrato (`roster-contrato`).
- 🟢 misma empresa: `sust-rol`=**superintendente** · `sust-nuevo`=**Ing. Marco Superintendente 2 (super2.demo, Constructora Demo)** · `sust-motivo`=`Cambio de superintendente (art. 125 fr. I g RLOPSRM).` → **Sustituir** (`btn-sustituir`) → 🟢 histórico + nota automática.
- 🔴 ⭐ REGLA 4: elige **patito1 (Constructora Patito, otra empresa)** → **409** *"…MISMA empresa… (art. 125)"*.
- 🔴 ⭐ ITEM 3.4: intenta sustituir el rol **dependencia** (si la UI lo ofreciera) / por API rol `dependencia` → **400** *"la dependencia NO es sustituible (art. 125)"*; en la UI verás el aviso `roster-dependencia-aviso`. · motivo vacío → 400.

### ▢ PASO 12 — Expediente (HU-04)
- **Cuenta:** `residente@` · **Sidebar:** Flujos → **Expediente** (`/contratos/expediente`). Elige el contrato.
- 🟢 verifica bloques: configuración · catálogo (4 conceptos, $1,000,000) · programa (matriz, periodo vigente resaltado) · garantías · jurídicos · plan de amortización (Σ 300,000) · **roster** (con la sustitución) · **convenios** (`CM-001` autorizado + nota). Botón **⬇ Exportar PDF**.

### ▢ PASO 13 — Portafolio (HU-18) + Tablero (HU-17)
- **Portafolio:** `dependencia@` · Vistas ejecutivas → **Portafolio** (`/portafolio`): semáforos por contrato; los `OBRA-2026-ATRASO-*` en rojo.
- **Tablero:** `residente@`/`dependencia@` → **Tablero** (`/estimaciones/tablero`): estimaciones por estado + contratos en atraso.

### ▢ PASO 14 — Finiquito (HU-24)
- **Cuenta:** `residente@` o `dependencia@` · **Sidebar:** Flujos → **Cierre / finiquito** (`/contratos/finiquito`). Elige el contrato (`select-contrato`).
- 🟢 desglose del saldo (`finiquito-desglose`, art. 64) — solo la #1 pagada:

  | Renglón | Valor |
  |---|---|
  | Importe neto estimado y autorizado | $69,500.00 |
  | (−) Total pagado | −$69,500.00 |
  | (−) Anticipo no amortizado (300,000 − 30,000) | −$270,000.00 |
  | (−) Ajustes finales (`finiquito-ajustes`, default `0`) | −$0.00 |
  | **(=) SALDO** (`finiquito-saldo`) | **−$270,000.00** |
  | **A favor de** (`finiquito-afavor`) | **la DEPENDENCIA** (art. 171) |
- **Cerrar:** 🔒 **Cerrar contrato** (`btn-abrir-cierre`) → **Sí, elaborar finiquito y cerrar** (`btn-confirmar-cierre`) → 🟢 contrato **cerrado**; documento art. 170 (`btn-ver-documento-finiquito`).
- 🔴 ⭐ 2º finiquito → 409 · cerrar de nuevo → 409 · rol contratista/supervisión → 403 · sin bitácora → 409 (`finiquito-sin-bitacora`).
- 🔴 ⭐ (ITEM Oleada 1) tras el finiquito, intenta **integrar otra estimación** o **generar instrucción de pago** → **409** *"contrato cerrado (art. 64/170)"*.

### ▢ PASO 15 — Padrón de empresas (HU-23 admin)
- **Cuenta:** `dependencia@` · **Sidebar:** Administración → **Padrón** (`/admin/empresas`).
- 🟢 pestañas `tab-padron` (validadas, botón `validar-{id}`) · `tab-porvalidar` (duplicados, `pv-validar-{id}` / `fusionar-{id}`) · `tab-dependencias` (van aparte, art. 43/74 Bis).
- 🔴 ⭐ con un rol ≠ dependencia → la ruta no aparece en el sidebar.

### ▢ PASO 16 — Acotamiento por empresa
- 🟢 `dependencia@` (Dependencia Demo): ve `OBRA-2026-PRUEBA-FINAL`, `OBRA-2026-DEMO-01`, `ATRASO-*`.
- 🔴 ⭐ (A-no-ve-B): entra como **`dependencia.sur@`** (Dependencia **Sur** Demo) o **`dep2@`** (Dependencia **Norte**) → **NO** ve los contratos de Dependencia Demo en sus selectores, y viceversa. *(Operativos: por participación; finanzas: ve todo, transversal.)*

### ▢ PASO 17 — Reportes (HU-19) + Ciclo de vida
- **Reportes:** `residente@` · Vistas ejecutivas → **Reportes** (`/reportes`): contrato + periodo → exporta los 7 reportes (carátula, curva S, catálogo, programa, bitácora, convenios, roster).
- **Ciclo de vida** (`/contratos/ciclo-vida`): índice ordenado del contrato (el paso de estimación enlaza al wizard).

---

## 6. ⭐ PRUEBAS NEGATIVAS / LEGALES — resumen (qué teclear para DISPARAR el bloqueo) 🔴

| # | Prueba | Dónde / quién | Cambio sobre el dataset | Bloqueo esperado | Fundamento |
|---|---|---|---|---|---|
| N1 | Registro contratista/supervisión SIN empresa | PASO 0 | empresa vacía | "Elige tu empresa…" | REGLA 1 |
| N2 | Programa no cuadra (faltante) | Alta p2 | C-01 P1=`900` | 400 "faltan 100.000" | RLOPSRM 45-A-X + 52 |
| N3 | Programa excede | Alta p2 | C-02 P1=`300`,P2=`250` | 400 "sobran 50.000" | art. 118 |
| N4 | Plan amort ≠ anticipo | Alta p5 | P3=`50000` | 400 "debe sumar $300,000.00" | art. 143 fr. I |
| N5 | Garantía vencida | HU-02 | vigencia `2020-01-01` | 400 | art. 48 |
| N6 | Garantía > contrato | HU-02 | monto `9999999` | 400 | art. 48 |
| N7 | 2ª garantía mismo tipo | HU-02 | otra Cumplimiento | 409 | art. 48 |
| N8 | Avance excede contratado | HU-06 | C-01 P1=`1500` | 409 (art. 118) | art. 118 |
| N9 | **Generador excede plan (wizard)** | HU-12 ② | C-03=`50` en P1 | `semaforo-plan-exceso` + **`btn-wsiguiente` disabled** (no avanza) | 45-A-X + 52 |
| N10 | Periodo estimación > 1 mes | HU-12 ① | fin `2026-02-15` | 400 (art. 54) | art. 54 |
| N11 | Integrar sin candado | HU-12 ⑤ | `check-cierre` sin marcar | `btn-integrar` **disabled** | UX wizard |
| N12 | Integrar contrato sin PDF | HU-12 | contrato sin PDF | 409 "no tiene PDF firmado" | HU-01 |
| N13 | Autorizar sin turnar | HU-15 | autorizar recién Presentada | 409 "aún no turnada" | flujo HU-15 |
| N14 | Reingreso de no-rechazada | HU-16 | reingresar la #1 | 409 | HU-16 |
| N15 | **Cargar techo SIN partida** | HU-20 ① | `input-partida` vacío | `btn-cargar-techo` disabled · API 400 "partida… obligatoria (art. 24)" | **ITEM 3.1** |
| N16 | Pagar no autorizada | HU-21 | pagar #3 Integrada | 409 (art. 54) | art. 54 |
| N17 | Fecha pago < integración | HU-21 | `2025-12-31` | 400 | Plan2 Pase3 |
| N18 | Doble pago | HU-21 | pagar #1 otra vez | 409 | no-doble-pago |
| N19 | **Autorizar convenio >25% sin oficio** | HU-03 | plazo `120`, autorizar sin oficio | 409 "art. 102… carga el oficio" | **ITEM 3.2** |
| N20 | **Autorizar convenio sin ser dependencia** | HU-03 | autorizar como residente | 403 | **ITEM 3.2** (art. 59 p3) |
| N21 | **Re-autorizar convenio** | HU-03 | autorizar uno ya autorizado | 409 (acto único) | **ITEM 3.2** |
| N22 | Sustitución de OTRA empresa | HU-22 | sustituto de otra empresa | 409 (art. 125) | REGLA 4 |
| N23 | **Sustituir la dependencia** | HU-22 | rol `dependencia` | 400 "no sustituible" | **ITEM 3.4** (art. 125) |
| N24 | Finiquito duplicado / sin bitácora / rol | HU-24 | 2º · sin bitácora · contratista | 409/409/403 | art. 64 / 168-172 |
| N25 | **Estimación/pago tras finiquito** | HU-12/20 | contrato cerrado | 409 "contrato cerrado (art. 64)" | **Oleada 1** |
| N26 | Emitir nota sin apertura firmada | HU-09 | antes de 3 firmas | 409 (art. 123 fr. III) | art. 123 |
| N27 | Folio de contrato duplicado | HU-01 | folio repetido | 409 | UNIQUE folio |
| N28 | Clave de concepto repetida | HU-01 p1 | dos `C-01` | 400 | art. 45 fr. IX |
| N29 | **Editar/eliminar avance** | HU-06 | (ya no existe el botón) | solo **Corregir** (append-only) | **ITEM 3.3** (art. 123 fr. VI/VII) |
| N30 | **Asentar atraso duplicado** | HU-07 | mismo (concepto, periodo) 2× | 409 (idempotente) | **Oleada 1** (`atraso_asentado`) |

---

## 7. CONTROL DE ACCESO (rol · participación · EMPRESA)
- **Por rol:** `finanzas@` no ve alta; `contratista@` ve alta en solo-lectura, no ve HU-07/HU-02; `supervision@` no ve HU-21. Padrón y Solicitudes solo **dependencia**.
- **Por participación:** un residente que no participa en el contrato no lo ve; por URL forzada → 403.
- **Por empresa (ITEM 3.5/Bloque1):** dependencia de empresa A no ve contratos de empresa B en las listas; finanzas transversal.

## 8. Apéndice — verificación por SQL (psql) tras el recorrido
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
  JOIN contratos c ON c.id=cm.contrato_id WHERE c.folio='OBRA-2026-PRUEBA-FINAL';"
# CM-001: estado 'autorizado' tras el PASO 10 (registrado→autorizado, ITEM 3.2)

docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c \
"SELECT ejercicio,dependencia,partida,techo FROM presupuesto_anual WHERE ejercicio=2026;"
# la partida cargada en el PASO 9 (ITEM 3.1): partida NO nula, dependencia_id ligado
```

---

## 9. Estado de funciones (tras el Plan Grande)
| Tema | Estado |
|---|---|
| Wizard Estimación (5 pasos) | ✅ |
| Wizard Pago (3 pasos) + partida obligatoria (ITEM 3.1) | ✅ |
| Wizard Bitácora (apertura→firma→emitir; consulta/minutas paralelo) | ✅ |
| Avance (registrar + curva/atrasos paralelo) + avance append-only (ITEM 3.3) | ✅ |
| Convenio + acto de autorización (ITEM 3.2) | ✅ |
| Evidencia fotográfica | ❌ fuera de alcance Etapa 1 (decisión con la ley) |
| HU-02 / HU-11 / HU-18 / HU-24 | ✅ funcionales |

---

## 10. Apéndice — si reseteaste la BD: aplicar las 4 DDL en local
```bash
cd /c/Users/migue/Downloads/Proyectofepy/sigecop
for f in migracion_atraso_asentado avance_append_only migracion_hu20_partida_fk migracion_convenio_autorizacion; do
  echo "== $f ==" ; docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 < backend/scripts/$f.sql ;
done
docker restart sigecop_backend
```

*Plan generado leyendo las páginas reales (`frontend/src/pages`: AltaContrato, IntegracionEstimacion [wizard],
TransitoPago [wizard], AmbienteBitacora/AmbienteAvance [wizard], ConveniosModificatorios, etc.), los
controllers, `schema.sql`, `permisos.js` y el seed real. Importes pre-cuadrados al centavo; si alguno no
coincide, es señal de un cambio en el código, no del plan.*
