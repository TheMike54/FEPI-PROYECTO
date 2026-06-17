# GUION DE PRUEBA COMPLETO — SIGECOP (18-jun-2026)

> **Para quién:** Maiki / el profe, para recorrer el sistema de punta a punta sin capturar nada a mano.
> **Cómo usarlo:** prepara el ambiente (abajo), entra con la cuenta indicada y verifica lo que dice la
> columna "Qué debe verse". Las pruebas marcadas **⭐** son **negativas** (el sistema debe RECHAZAR).
> Todos los valores de aquí están **leídos del código y del seed**, no inventados.

---

## 0) Preparar el ambiente (una sola vez)

```bash
# 1. Levantar el stack
docker compose up -d            # sigecop_db:5432, sigecop_backend:4000, sigecop_frontend:5173

# 2. Cargar el paquete de datos demo (idempotente; corre DENTRO del contenedor)
docker exec sigecop_backend npm run seed:demo

# 3. Abrir el navegador
#    http://localhost:5173
```

**Cuentas** (contraseña común **`Sigecop2026!`**):

| Rol | Correo |
|---|---|
| Residente | `residente@sigecop.test` |
| Contratista / Superintendente | `contratista@sigecop.test` |
| Supervisión | `supervision@sigecop.test` |
| Dependencia | `dependencia@sigecop.test` |
| Finanzas | `finanzas@sigecop.test` |

**Contratos sembrados:**
- `OBRA-2026-DEMO-01` — **completo** ($2,500,000.00, anticipo 30% = $750,000.00, 7 conceptos, 7 periodos,
  ciclo de estimación en TODOS los estados, convenio de plazo 211→241 días, garantías con PDF+endoso,
  minuta+visita).
- `OBRA-2026-ATRASO-01..04` — **en atraso** (para tablero / alertas / portafolio).

> La fecha "hoy" del sistema está calibrada al **2026-06-15**; los `ATRASO-*` tienen periodos vencidos
> para disparar las alertas.

---

## 1) Recorrido por HU con el dato YA cargado (no captures, solo verifica)

| HU | Cuenta | Pantalla | Qué debe verse |
|---|---|---|---|
| **HU-00** Login | cualquiera | Inicio | Entra con correo+contraseña; el rol se deduce (sin elegir rol). |
| **HU-01** Alta / expediente | residente | Contratos → DEMO-01 | Contrato completo: catálogo (7 conceptos = $2.5M), programa al 100%, garantías, jurídicos, plan de amortización, PDF firmado. |
| **HU-02** Fianzas | **dependencia** | Fianzas → DEMO-01 | **3 garantías** (cumplimiento / anticipo / vicios ocultos). La de **cumplimiento** trae **PDF real (👁 Ver)** y **1 endoso** (prórroga). Una garantía **por tipo**. |
| **HU-03** Convenios | dependencia | Convenios → DEMO-01 | Convenio de **plazo** (211→241 días) con su nota ligada **+ 📎 oficio de aprobación** cargado. |
| **HU-04** Expediente | residente | Expediente → DEMO-01 | Bloques + roster + estimaciones + convenio con **📎 Ver oficio** + bloque de minutas/visitas; **Exportar PDF** (1 solo doc). |
| **HU-05** Curva de avance | residente | Programa/Curva → DEMO-01 | Curva S programado vs ejecutado. |
| **HU-06** Trabajos terminados | contratista | Avance por periodo → DEMO-01 | Avance por concepto/periodo. |
| **HU-07** Alertas de atraso | residente | Alertas → ATRASO-01..04 | Panel de **déficit por concepto** (unidades) + badge al login. |
| **HU-08/09/10** Bitácora | residente | Bitácora → DEMO-01 | Bitácora **abierta**, apertura firmada por las 3 partes; nota de apertura **redactada** con datos del alta, **imprimible**. |
| **HU-11** Minutas/visitas | **residente** | Minutas → DEMO-01 | **1 minuta con PDF** (👁) **ligada a una nota** + **1 visita agendada**; pestaña **Acuerdos** con el acuerdo de la minuta. |
| **HU-12** Integración | contratista | Estimaciones → DEMO-01 | Estimación **#4 Integrada**; nota firmada ligada. |
| **HU-13** Presentación | contratista | Estimaciones → #3 | Estimación **Presentada** (art. 54). |
| **HU-14** Historial | residente | Historial → DEMO-01 | Línea de tiempo de las estimaciones. |
| **HU-15** Revisión/autorización | residente | Revisión → #2 / #5 | **#2 Autorizada**, **#5 Rechazada** con observación. |
| **HU-16** Reingreso | contratista | Estimaciones → #6 | **Reingreso** de la #5 (nueva versión integrada, `reemplaza_a`). |
| **HU-17** Tablero | residente | Tablero | Estimaciones por estado + contratos en atraso. |
| **HU-18** Portafolio | dependencia | Portafolio | Semáforos de salud (los ATRASO-* en rojo). |
| **HU-19** Reportes | residente | Reportes → DEMO-01 | Exporta los reportes (carátula, etc.). **Generadores = único pendiente real (E3).** |
| **HU-21** Pago | finanzas | Pagos → DEMO-01 | Estimación **#1 Pagada**, importe = neto **$69,500.00**. |
| **HU-22** Roster | residente | Roster → DEMO-01 | Residente / superintendente / supervisión vigentes. |
| **HU-23** Empresas | — | Registro | La empresa se **elige de un selector** (no se teclea); avisa si ya existe. |
| **HU-24** Finiquito | residente/dependencia | Finiquito → DEMO-01 | Cierre del contrato (append-only, inmutable). |

> **Único pendiente funcional real:** los **números generadores** de la estimación (HU-19, equipo E3).
> Todo lo demás del recorrido tiene backend real.

---

## 2) Flujos NUEVOS de esta sesión (capturar paso a paso)

### 2.1 HU-02 — Registrar una garantía nueva con PDF + endoso

> Cuenta: **dependencia** (o el **residente** del contrato). Pantalla: **Fianzas**.

1. Elige el contrato en el **selector** (ej. un `OBRA-2026-ATRASO-*`, que aún no tiene las 3 garantías).
2. Pulsa **"+ Agregar póliza"** → se abre el modal.
3. Llena: **Tipo** = `Vicios ocultos`, **Afianzadora**, **Folio**, **Monto** (ver ⭐ abajo), **Vigencia**
   (fecha futura), y **adjunta un PDF**.
4. **Confirmar** → la póliza aparece en la tabla con **👁 Ver** (descarga el PDF real).
5. En esa fila, pulsa **"+ endoso"** → motivo `Prórroga de vigencia`, nueva vigencia futura → **Registrar
   endoso**. La columna **Endosos** pasa a "1 endoso(s)".

**⭐ Pruebas negativas HU-02:**
- ⭐ Monto **mayor** que el monto del contrato → **rechazo 400** ("la garantía no puede exceder el monto
  del contrato").
- ⭐ Vigencia **ya vencida** (fecha pasada) → **rechazo 400**.
- ⭐ Segunda garantía del **mismo tipo** en el mismo contrato → **rechazo 409** (una por tipo).
- ⭐ Un rol **sin gestión** (contratista/supervisión/finanzas) **no ve** el botón "+ Agregar póliza"
  (solo lectura).

**Base legal:** art. 48 LOPSRM (anticipo fr. I, cumplimiento fr. II, 15 días naturales del fallo);
art. 66 LOPSRM (vicios ocultos, 10% del monto ejercido, 12 meses); art. 91 RLOPSRM (cumplimiento ≥10% +
**endoso** = ajuste por modificación de monto/plazo, que remite a art. 98 fr. II RLOPSRM).

---

### 2.2 HU-11 — Registrar una minuta con PDF, vincularla a una nota y agendar una visita

> Cuenta: **residente**. Pantalla: **Minutas**. El contrato debe tener **bitácora abierta** (el DEMO-01 ya
> la tiene).

1. Elige el contrato en el **selector**.
2. Pestaña **Minutas** → llena **Fecha**, **Lugar**, **Participantes**, **Asunto**, **Acuerdos** y
   **adjunta el PDF** → **Registrar minuta**. Aparece arriba de la tabla con **👁 Ver PDF**.
3. En esa fila pulsa **Adjuntar a nota** → el modal lista las **notas reales de la bitácora del contrato**;
   elige una y **Vincular**. La fila muestra **"nota #…"** (la nota NO se modifica: es solo una referencia).
4. Pestaña **Agenda de visitas** → **Fecha**, **Lugar**, **Responsable**, **Propósito** → **Agendar
   visita**. Aparece con estado **Agendada**.
5. Pestaña **Acuerdos** → muestra el acuerdo que capturaste en la minuta (se **deriva** de las minutas
   reales, no es lista estática).

**⭐ Pruebas negativas HU-11:**
- ⭐ Un rol que solo consulta (contratista/supervisión) ve los **formularios deshabilitados** con aviso de
  solo-consulta; dependencia/finanzas **no ven** la pantalla.
- ⭐ Intentar vincular una nota que **no pertenece** a la bitácora de ese contrato → **rechazo 400**.

**Base legal:** art. 123 **fr. X** RLOPSRM (*"se podrán ratificar en la Bitácora las instrucciones emitidas
vía oficios, **minutas**, memoranda y circulares…"*) para el vínculo; art. 123 **fr. VI** RLOPSRM (la nota
firmada no se modifica → el vínculo solo escribe `nota_id`).

---

### 2.3 HU-24 — Finiquito (cierre del contrato)

> Cuenta: **residente** o **dependencia**. Pantalla: **Finiquito**.

1. Elige el contrato; el sistema muestra la **preparación del finiquito** (totales del contrato).
2. **Cerrar finiquito** → el contrato pasa a **cerrado** y el registro queda **inmutable** (trigger
   append-only).

**⭐ Pruebas negativas HU-24:**
- ⭐ Intentar **modificar** un finiquito ya registrado → el trigger lo **rechaza** (append-only).

---

## 3) Pruebas negativas transversales (las que más le gustan al profe) ⭐

| # | Cuenta | Acción | Resultado esperado |
|---|---|---|---|
| ⭐1 | finanzas | Pagar una estimación **Integrada** (sin presentar/autorizar) | **409** — solo se paga lo autorizado (art. 54). |
| ⭐2 | finanzas | Fecha de pago **anterior** a la integración | **400**. |
| ⭐3 | contratista | **Re-presentar** una estimación ya presentada/autorizada | rechazo por estado. |
| ⭐4 | contratista | Avance que **excede** lo programado del periodo | **AVISO** (201), no bloqueo. |
| ⭐5 | contratista | Avance acumulado que **excede lo contratado** (art. 118) | **409** (sí bloquea). |
| ⭐6 | superintendente | **Autorizar** su propia estimación | rechazo (separación residencia/contratista). |
| ⭐7 | dependencia | Garantía con monto **> contrato** o vigencia **vencida** | **400**. |
| ⭐8 | cualquiera ajeno | Abrir un contrato en el que **no participa** | sin acceso (gate por participación). |

---

## 4) Valores cuadrados del contrato DEMO-01 (para verificar al centavo)

**Monto** $2,500,000.00 · **Anticipo** 30% = $750,000.00 · **5 al millar** = 0.5% · sin IVA.
Fórmula de la carátula (server-side): `neto = subtotal − ROUND(subtotal×30%, 2) − ROUND(subtotal×0.005, 2)`.

| # | Concepto | Subtotal | Amortización (30%) | 5 al millar | **Neto** | Estado |
|---:|---|---:|---:|---:|---:|---|
| 1 | CONC-01 | $100,000.00 | $30,000.00 | $500.00 | **$69,500.00** | Pagada |
| 2 | CONC-02 | $300,000.00 | $90,000.00 | $1,500.00 | **$208,500.00** | Autorizada |
| 3 | CONC-03 | $600,000.00 | $180,000.00 | $3,000.00 | **$417,000.00** | Presentada |
| 4 | CONC-04 | $400,000.00 | $120,000.00 | $2,000.00 | **$278,000.00** | Integrada |
| 5 | CONC-05 | $300,000.00 | $90,000.00 | $1,500.00 | **$208,500.00** | Rechazada |
| 6 | CONC-05 | $300,000.00 | $90,000.00 | $1,500.00 | **$208,500.00** | Reingreso de #5 |

---

## 5) Nota de cierre

- **Único pendiente funcional real:** números generadores de la estimación (HU-19, E3).
- Todo el recorrido de la tabla §1 corre contra **backend real** (PostgreSQL); el seed lo deja cuadrado
  al centavo.
- Si algo del recorrido no coincide con esta guía, lo más probable es que el seed no se haya recargado:
  `docker exec sigecop_backend npm run seed:demo` y vuelve a entrar.
