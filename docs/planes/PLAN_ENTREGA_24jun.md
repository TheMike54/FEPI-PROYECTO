# Plan / guion de entrega — pre-revisión del 24-jun (1:00–4:00 pm) · SIGECOP

> **Objetivo:** aprovechar las 3 horas contando **una sola historia**: el **ciclo de vida de un contrato de
> inicio a fin** sobre el **contrato demo del seed**, resaltando lo que el profe pidió explícitamente y las
> citas legales que lucen. Al final, una **vista ejecutiva** (portafolio/tablero) y un bloque de **decisiones
> a confirmar**.
> **Preparación previa (5 min, una vez):** `docker compose up -d` → `docker exec sigecop_backend npm run
> seed:demo` → abrir `http://localhost:5173`. Cuentas (todas `Sigecop2026!`): `residente@`, `contratista@`,
> `supervision@`, `dependencia@`, `finanzas@sigecop.test`.
> **Regla de oro de la demo:** **no capturar a mano** salvo en el paso 1 (alta en vivo, que el profe pidió
> ver). Todo lo demás ya está sembrado y cuadrado al centavo — se **muestra**, no se teclea.

---

## 0. Cómo abrir (1 min, el "elevator pitch")

> "Profe, le vamos a mostrar **un contrato de obra pública de principio a fin**: lo damos de alta, abrimos su
> bitácora, corremos una estimación por su ambiente, la revisamos y autorizamos, la pagamos, le metemos un
> convenio modificatorio y lo cerramos con su finiquito. Al final le enseñamos la **vista ejecutiva** de
> varios contratos. Todo con **datos de prueba ya cargados** (como nos pidió) y **cuadrado al centavo**."

**Dos formas de recorrerlo** (elige según el tiempo):
- **A) En vivo desde cero** (el alta), luego saltar al **contrato demo sembrado** para el resto (tiene el
  ciclo completo ya armado). *Recomendado.*
- **B) Todo sobre el contrato demo sembrado** (si el profe quiere ir rápido a una historia específica).

---

## 1. ALTA DEL CONTRATO — en vivo (HU-01) · cuenta: **residente**

**Pantalla:** Contratos → "Nuevo contrato" (wizard de 7 pasos).
**Qué capturar** (el profe ya dictó estos datos el 16-jun, úsalos):
- Datos generales: folio inventado, tipo "Obra pública sobre la base de precios unitarios", **objeto**
  "Construcción de edificio de laboratorios", **empresa elegida del catálogo** (no tecleada), dependencia /
  contratista / supervisión, **270 días → 9 estimaciones** (o 90 días → 3 si hay prisa).
- Catálogo de conceptos (los 7 que dictó): estudio de mecánica de suelos, remoción de tierras, cimentación,
  instalaciones eléctricas, hidrosanitarias, cableado estructurado, acabados — con **clave** por concepto.
- Programa de obra: **matriz concepto × periodo** (Gantt).
- Garantías, datos jurídicos, **plan de amortización**, PDF firmado.

**Qué resaltar (lo que el profe pidió):**
- **Empresa del catálogo** (se **elige**, no se re-teclea; imposible duplicar). *"Como nos pidió: si ya
  existe, toma los datos que ya están."*
- **Clave del concepto** capturada por el usuario (**art. 45 fr. IX RLOPSRM**).
- **Cuadre exacto al centavo:** el monto se **deriva** `Σ ROUND(cantidad × P.U., 2)` — no se teclea.
- **Programa = Gantt** concepto × periodo (no texto), que **cuadra al 100%** contra el catálogo.
- **Plan de amortización** paso a paso (**art. 143 fr. I RLOPSRM**): muestra que **no deja amortizar todo en
  el último mes** (la regla que probó el profe el 16-jun) — ningún periodo amortiza más que su avance.
- Contrato **arranca vacío**; se **valida por paso** (no se pierde la captura al final).

**⚠️ Honestidad si pregunta:** el bloqueo del anticipo por umbral y el PDF de autorización hoy viven **en el
cliente** (no server-side); la **cédula** sigue capturándose (decisión a confirmar, §Decisiones); la fecha de
inicio **acepta fechas pasadas a propósito** para poder mostrar las alertas (lo acordamos el 16-jun).

---

## 2. GARANTÍAS / FIANZAS (HU-02) · cuenta: **dependencia** · contrato: **OBRA-2026-DEMO-01**

**Pantalla:** Fianzas → DEMO-01.
**Qué se ve:** las **3 garantías** (cumplimiento / anticipo / vicios ocultos); la de **cumplimiento trae PDF
real (👁 ver)** y **1 endoso** (prórroga).
**Resaltar:** **art. 48 LOPSRM** (anticipo fr. I + cumplimiento fr. II), **art. 66 LOPSRM** (vicios ocultos),
**art. 91 RLOPSRM** (endoso = ajuste por modificación, remite a art. 98 fr. II). Una garantía **por tipo**.
*(HU-02 pasó de maqueta a funcional en esta sesión.)*

---

## 3. BITÁCORA — apertura y notas (HU-08/09/10) · cuenta: **residente** · DEMO-01

**Pantalla:** Bitácora → DEMO-01 (o el **ambiente de bitácora** `/bitacora/ambiente` para enseñar el recorrido).
**Qué se ve:** bitácora **abierta**; la **nota de apertura #1** está **redactada con TODOS los datos del
alta** (objeto, **ubicación**, partes, monto, anticipo, plazo, fechas) y es **imprimible**.
**Resaltar (lo que el profe pidió):**
- Apertura = **primera nota, folio 1** (**art. 46 últ. párr. / 52 Bis LOPSRM; 122/123 RLOPSRM**); datos
  mínimos **art. 123 fr. III**.
- La redacción incluye "todo el show" (objeto, ubicada en…, monto, plazo) — el ajuste que pidió el 16-jun.
- Notas **append-only** (no se anula/edita/borra; corregir = nota nueva) — **auditoría de función pública**.
- Bitácora **lineal**; emisor **no re-firma**; firman las **3 partes**; folio **sin saltos**.

---

## 4. ESTIMACIÓN por su AMBIENTE (HU-12 → ciclo) · cuenta: **contratista** · DEMO-01

**Pantalla:** "Nueva estimación (por bloques)" (`/estimaciones/ambiente`) **+** Estimaciones → DEMO-01.
**Qué se ve:** el demo trae el **ciclo de estimación en TODOS los estados** (integrada, presentada,
autorizada, rechazada, **reingreso**, pagada) — ideal para recorrer sin capturar.
**Resaltar (lo que el profe pidió):**
- El **ambiente aislado por bloques** (como el alta): nueva estimación → **generadores** → carátula
  automática → complementar → soportes/notas → **cierre con candado** → envío a revisión.
- **Números generadores** por concepto → concentrado → **carátula** (**art. 132 RLOPSRM**). *Estos SÍ son
  funcionales (se capturan en la integración).*
- Carátula **server-side, cuadrada al centavo, sin IVA**: subtotal − amortización (**art. 143-I**) − **5 al
  millar** (**art. 191 LFD**) = neto.
- El contratista **integra/presenta sin prevalidación** (es el responsable); solo se regresa si excede el
  catálogo (**art. 118 RLOPSRM**).
- **Reingreso** tras rechazo = **bloque nuevo completo** (HU-16), no "marcar qué observación se atendió".

**⚠️ Honestidad si pregunta:** el **bloque de generadores del ambiente guiado** es un **placeholder** que
delega a la pantalla de integración (los generadores en sí funcionan ahí). El **registro fotográfico YA está
implementado** (21-jun: fotos JPEG/PNG como BYTEA en `estimacion_fotos`, subida/galería en el expediente, art.
132 fr. IV RLOPSRM); solo la **carga de otros soportes** (carpeta de PDFs) sigue diferida (hoy solo metadatos).

---

## 5. REVISIÓN / AUTORIZACIÓN (HU-15) · cuenta: **residente** (y supervisión) · DEMO-01

**Pantalla:** Revisión → estimación #2 (autorizada) y #5 (rechazada con observación).
**Resaltar:** **supervisión observa/turna** → **residencia autoriza/rechaza** (el flujo del art. 54 que pidió
el profe); observaciones **por sección**. **art. 54 LOPSRM** (revisión 15 días).
**⚠️ Honestidad:** la UI expone 3 de 5 secciones de observación; el **plazo del art. 54 es aviso/semáforo, no
candado** que inhabilite el botón.

---

## 6. PAGO (HU-21) · cuenta: **finanzas** · DEMO-01

**Pantalla:** Pagos → DEMO-01 (estimación #1 **pagada**). *(Opcional: enseñar el **tránsito a pago** HU-20
`/pagos/transito` con la suficiencia presupuestal antes del registro.)*
**Resaltar (lo que el profe pidió):**
- Es **registro de pago** ("pagada", no "a pagar"); **importe = neto** (lo calcula el sistema, no se teclea).
- **Gate estricto art. 54:** solo se paga lo **autorizado** (no integrada/enviada); no se paga dos veces.
- **HU-20 tránsito:** suficiencia presupuestal **art. 24 LOPSRM** (techo − comprometido) + instrucción de pago.

---

## 7. CONVENIO MODIFICATORIO (HU-03) · cuenta: **dependencia** · DEMO-01

**Pantalla:** Convenios → DEMO-01 (convenio de **plazo 211→241 días**, con su nota ligada + 📎 **oficio de
aprobación** cargado).
**Resaltar (lo que el profe pidió):**
- El convenio **liga/versiona** (no sustituye): historial inmutable de versiones del programa.
- **Oficio de aprobación** subido y visible en el expediente (el ajuste que pidió el 16-jun).
- **art. 59 LOPSRM** (modificación de contratos) + **art. 99 RLOPSRM** (dictamen). Si supera el 25%, **avisa**
  (no bloquea) y marca revisión SFP (**RLOPSRM art. 102**).

---

## 8. FINIQUITO Y CIERRE (HU-24) · cuenta: **residente** o **dependencia** · DEMO-01

**Pantalla:** Finiquito → DEMO-01 (o el **ambiente de cierre** `/contratos/cierre`).
**Resaltar (lo que el profe pidió — historia nueva obligatoria):**
- "Sin finiquito no se puede cerrar el contrato": el finiquito es una **nota de bitácora** + el **saldo** (lo
  estimado/pagado vs lo que falta).
- **art. 64 LOPSRM** (finiquito, extinción de derechos y obligaciones) + **art. 170 RLOPSRM** (contenido del
  documento: relación de estimaciones y saldo). Cierre **append-only** (1 por contrato, inmutable).

---

## 9. VISTA EJECUTIVA — portafolio y tablero · cuenta: **dependencia** / **residente**

**Pantallas:** Portafolio (HU-18, semáforos de **salud** de los contratos) + Tablero (HU-17, estimaciones por
estado) + Alertas (HU-07).
**Resaltar (lo que el profe pidió):** la **"salud de los contratos"** que pidió el 16-jun — los `ATRASO-*`
salen en **rojo**; las **alertas de atraso** dicen **cuántas unidades faltan** (sin %, sin umbral); la curva
**empieza en cero**. *(El seed trae 5 contratos: 1 completo + 4 en atraso.)*
**Bonus — "esto es un sistema, no pantallas sueltas":** el **MACRO ciclo de vida** (`/contratos/ciclo-vida`)
enlaza todas las etapas en orden — útil para cerrar mostrando el recorrido completo de un vistazo.

---

## 10. Preguntas que probablemente hará el profe — y dónde está la respuesta

| Pregunta probable | Respuesta / dónde |
|---|---|
| "¿La empresa se duplica si la teclean distinta?" | No: se **elige del catálogo**; el backend deduplica con match fuerte (acentos/sufijos). Paso 1. |
| "¿El monto cuadra al centavo?" | Sí, se **deriva** `Σ ROUND(cant×pu,2)` server-side; no se teclea. Paso 1. |
| "¿Puedo amortizar todo en el último mes?" | No: el plan lo **impide** (R3, art. 143-I). Paso 1 (plan de amortización). |
| "¿Puedo borrar/editar una nota?" | No: **append-only** con trigger; corregir = nota nueva ligada. Paso 3. |
| "¿Quién firma la nota?" | Las **3 partes**; el emisor no re-firma. Paso 3. |
| "¿Dónde están los generadores?" | En la **integración** de la estimación (capturados, art. 132). Paso 4. |
| "¿Puedo pagar una estimación no autorizada?" | No: **gate estricto art. 54** (solo `autorizada`). Paso 6. |
| "¿Cómo cierro el contrato?" | Con el **finiquito** (saldo + nota de bitácora, art. 64/170). Paso 8. |
| "¿Cómo veo la salud de varios contratos?" | **Portafolio** con semáforos; los atrasados en rojo. Paso 9. |
| "¿Puedo probar una historia sin capturar todo?" | Sí: **seed** con paquete de datos (lo que pidió). Preparación. |
| **"¿El anticipo se bloquea si excede el umbral?"** | **Honesto:** hoy el bloqueo y el PDF están **en el cliente**, no en el servidor. (§Decisiones.) |
| **"¿La fecha de inicio puede ser pasada?"** | **Honesto:** sí, **a propósito** ahora para mostrar alertas; el bloqueo está diferido (lo acordamos). |
| **"¿La cédula no la habíamos quitado?"** | **Honesto:** sigue capturándose; está pendiente de decidir (§Decisiones). |

---

## 11. Decisiones que conviene que el profe confirme ese día (lista corta)

> Llevarlas anotadas para resolverlas en la reunión (las fijamos como **criterio del equipo** a falta de su
> confirmación; algunas son cambios suyos pendientes).

1. **Cédula profesional** en datos jurídicos: ¿se **quita** (como pidió) o se conserva y para qué roles?
2. **Anticipo:** ¿el umbral (30%) y el PDF deben **bloquear en el servidor**, no solo avisar en pantalla?
3. **Plazo de presentación (art. 54):** ¿debe **inhabilitar** el botón "Enviar" al vencer, o basta el aviso?
4. **Amortización:** ¿la **carátula** debe obedecer el plan editable, o seguir proporcional? + mínimo legal.
5. **Umbrales del semáforo** (salud y plazo de pago): ¿los números del equipo (≥95/85; 0/1-10/>10) están bien?
6. **Convenio >25%:** ¿**avisar** (como está) o **bloquear**? ¿el umbral?
7. **CMIC / 2 al millar** en la carátula: ¿tasa, base y si aplica?
8. **Catálogo de dependencias** / **vista de empresas** / **separar dependencias**: ¿los quiere? (son DDL/UI).
9. **Súper-entidad OBRA** (varios contratos bajo una obra): ¿entra al alcance? (impacta todo el modelo).
10. **Emisor de nota:** ¿solo **rol** o rol **+ nombre**? (hoy muestra ambos).

---

> **Cobertura honesta del sistema:** ver `docs/AUDITORIA_COBERTURA_PROFE.md` (54 ✅ / 17 🟡 / 12 ❌). Lo que
> **no** está cubierto se dice claro arriba (⚠️) para no llevarse una sorpresa frente al profe.
> **Recordatorio crítico (no técnico):** la **BD free de Render expira ~25-jun**, justo en la ventana de
> entrega — decidir (pagar/migrar) ANTES.
