# PROPUESTA — Contratos de prueba de "TIEMPO RECORRIDO" (FASE 1, 26-jun-2026)

> **Esto es SOLO la propuesta (FASE 1).** No construí el seed ni edité los planes. Pido tu OK sobre el **acomodo
> de la documentación** y los **nombres de folio** antes de la FASE 2.
> Contexto: contratos con fechas pasadas (sembrados por SQL directo, como los `PRUEBA-ATRASO`), **uno por caso**,
> porque la regla *fecha-no-pasada* impide armarlos por el alta. Verificado contra el código real (workflow de 5
> agentes); la math y los testids de abajo están confirmados.

---

## 1) ACOMODO DE LA DOCUMENTACIÓN (lo más importante — elige)

**Problema:** los planes van en ORDEN DE CICLO. Regar una lista de contratos especiales en los PASOS rompe ese
orden y duplica detalle.

### Opción A — Catálogo en la GUÍA (`docs/contexto/GUIA_PLANES_DE_PRUEBA.md`)
Un anexo "¿Qué quieres probar? → usa este contrato" dentro de la guía (que Code ya lee cada sesión).
- **Pros:** un solo lugar; la guía ya está en "LEER primero"; no toca el orden de los planes.
- **Cons:** la guía es un **meta-doc** ("cómo se escribe un plan", conventions estables); meterle un **inventario
  de contratos sembrados** (dato operativo que cambia con el seed) la ensucia y mezcla niveles. El que ejecuta el
  plan tendría que saltar a otro archivo.

### Opción B — Anexo al final del PLAN PRE-LLENADO (`docs/pruebas/PLAN_PRUEBAS_POSITIVAS_FINAL_26jun.md`)
Un **Anexo "Contratos especiales (tiempo recorrido)"** al final del plan pre-llenado (junto a la sección "Pruebas
de atraso" que ya vive ahí), como tabla-catálogo. En cada PASO del ciclo relevante, **una sola línea de remisión**
("para el caso X usa `PRUEBA-TR-…` → ver Anexo"), sin duplicar el detalle.
- **Pros:** vive **con los demás contratos sembrados** (la sección de atraso ya está ahí); el que ejecuta ya está
  en ese plan; los PASOS quedan limpios (solo la remisión); el catálogo está al lado de su seed.
- **Cons:** hay que ser disciplinado para no duplicar; la guía debe **apuntar** a él.

### ✅ RECOMENDACIÓN — **Híbrido B + puntero**
1. El **catálogo autoritativo** (tabla `qué probar → qué contrato → cómo verificar`) vive como **Anexo del plan
   pre-llenado** (Opción B). Es dato operativo, va con el seed.
2. La **guía** recibe **una línea** en su §6 ("Contratos especiales de tiempo recorrido → ver el Anexo del plan
   pre-llenado"). El meta-doc apunta, no aloja el inventario.
3. En cada PASO del ciclo afectado, **una línea de remisión** (sin detalle):
   - **HU-09 Notas (PASO 5):** "Aceptación tácita → `PRUEBA-TR-NOTA-VENCIDA` (Anexo)."
   - **HU-02 Garantías (PASO 3):** "Fianza caducada → `PRUEBA-TR-FIANZA-VENCIDA` (Anexo)."
   - **HU-03 Convenio (PASO 10):** "Convenio de plazo listo → `PRUEBA-TR-CONVENIO-PLAZO` (Anexo)."
   - **HU-12 Estimación / carátula bloque 2 (PASO 8):** "Amortización multi-periodo → `PRUEBA-TR-AMORT-MULTI` (Anexo)."
   - **HU-22 Roster (PASO 12):** "Regla temporal de firmas → `PRUEBA-TR-FIRMA-VIGENCIA` (Anexo)."

> Así el orden por ciclo queda intacto, el catálogo está centralizado donde viven los seeds, y la guía solo remite.

---

## 2) NOMBRES de folio (propuestos definitivos)
Prefijo común **`PRUEBA-TR-`** ("tiempo recorrido") para que el seed resetee idempotente con `LIKE 'PRUEBA-TR-%'`
sin colisionar con `PRUEBA-HU-%` ni `PRUEBA-ATRASO-%`. Uno por caso, autoexplicativo:

| Folio | Caso |
|---|---|
| `PRUEBA-TR-NOTA-VENCIDA` | Aceptación tácita de nota al vencer el plazo de firma |
| `PRUEBA-TR-FIANZA-VENCIDA` | Fianza/garantía con vigencia caducada |
| `PRUEBA-TR-CONVENIO-PLAZO` | Convenio de ampliación de plazo |
| `PRUEBA-TR-AMORT-MULTI` | Amortización del anticipo multi-periodo |
| `PRUEBA-TR-FIRMA-VIGENCIA` | Regla temporal de firmas del roster (caso detectado) |

> *(Si prefieres los nombres del brief sin prefijo —`PRUEBA-NOTA-VENCIDA`, etc.— funciona, pero el cleanup del seed
> tendría que usar una lista explícita de folios en vez de `LIKE`. Recomiendo el prefijo `PRUEBA-TR-`.)*

---

## 3) CASOS (todos) — fundamento legal + math (verificado en código)

> Base idéntica a los demás demo ($1,000,000; CONC-01/02/03 = 300k/300k/400k; 3 periodos vencidos), salvo lo que
> define el caso. Sembrado por SQL directo (los triggers de inmutabilidad son `BEFORE UPDATE`, el INSERT pasa).

### C1 · `PRUEBA-TR-NOTA-VENCIDA` — aceptación tácita (art. 123 fr. III RLOPSRM)
- **Math/mecánica:** `aceptada_tacita` se DERIVA en lectura: `NOW() > nota.fecha + plazo_firma_dias`. Con
  `plazo_firma_dias = 2` y la nota fechada **hoy−5** → `hoy > hoy−3` → tácita. (NO se persiste; se recalcula.)
- **Sembrar:** bitácora abierta + **una** nota tipo ≠ apertura (p.ej. `aviso`, numero ≥ 2), `emisor_id` = una
  PARTE (superintendente), `fecha = NOW() − 5 días`, **sin** firmas de contraparte y **sin** nota vinculada de otro
  emisor (si no, gana `firmada`/`respondida`).
- **Verificar:** con una parte ≠ emisor (residente): HU-09 «Ver bitácora» → badge `aceptacion-{numero}` = "Aceptada
  (tácita)"; el botón `btn-firmar-nota-{numero}` NO aparece; en «Por firmar» la nota NO está; POST firmar → **409**.
- **Cita:** art. 123 fr. III RLOPSRM.

### C2 · `PRUEBA-TR-FIANZA-VENCIDA` — fianza caducada (art. 48 LOPSRM / art. 91 RLOPSRM [validar])
- **Math/mecánica:** badge `diasHasta = round((vigencia − hoy)/86400000)`; con vigencia `2026-01-15` → ≈ **−162** →
  "Vencida hace 162 d". El alta y HU-02 **RECHAZAN** capturar una vigencia vencida (400, corte hoy UTC−1) → por eso
  **solo se puede sembrar por SQL**.
- **Sembrar:** `contrato_garantias(contrato_id, tipo, afianzadora, poliza, monto ≤ contrato, vigencia = 2026-01-15)`;
  respetar `UNIQUE(contrato_id, tipo)`; tipo canónico (`cumplimiento`/`anticipo`/`vicios_ocultos`).
- **Verificar:** `dependencia@`/`residente@` → `/contratos/fianzas` → fila `fila-poliza-<id>` con `data-badge="rojo"`
  y badge "Vencida hace N d"; cards `card-5d/15d/30d`.
- **Cita:** el código ancla la caducidad de captura a **art. 48 LOPSRM** (`garantias.controller.js`); el brief cita
  **art. 91 RLOPSRM** que es la base del **endoso/ajuste**. **[validar profe]** cuál citar para "caducidad".

### C3 · `PRUEBA-TR-CONVENIO-PLAZO` — convenio de ampliación de plazo (art. 59 LOPSRM + art. 99 RLOPSRM)
- **Math/mecánica:** registrar (estado `registrado`) → autorizar (acto separado, rol dependencia, exige **oficio
  PDF**). `delta_plazo_pct = (nuevo−ant)/ant×100`. Ej. **180→210 = +16.67%** (<25% ⇒ sin aviso SFP); nueva
  `fecha_termino = inicio + (nuevo−1)` = `2026-07-29`. Un convenio de PLAZO **no** crea `programa_version`.
  La "fecha pasada" no es gate duro del tipo plazo: es **realismo** (contrato en ejecución con plazo por agotarse;
  el seed `seed_smoke_hu03.sql` ya deja inicio 2026-01-01 / término 2026-06-30).
- **Sembrar (recomendado):** dejarlo **LISTO sin convenio** (correr la base + bitácora abierta) para demostrar el
  flujo **registrar→autorizar en vivo**. Alternativa: pre-sembrar un convenio `registrado` (sincronizando a mano
  `contratos.plazo_dias`/`fecha_termino`) o `autorizado` (+ `contrato_documentos` del oficio PDF).
- **Verificar:** `dependencia@` → `/contratos/modificatorios` → `cm-tipo=plazo`, `cm-plazo-nuevo=210`,
  `cm-delta-plazo`="+16.67%", `cm-motivo`, `cm-oficio` → `btn-registrar-convenio`; luego subir oficio
  `conv-oficio-subir-<id>` y `conv-autorizar-<id>` → badge "Autorizado". (>25% → `aviso-sfp`.)
- **Cita:** art. 59 LOPSRM (autorización por facultado), art. 99/102 RLOPSRM, art. 122 (bitácora obligatoria).

### C4 · `PRUEBA-TR-AMORT-MULTI` — amortización del anticipo multi-periodo (art. 143 fr. I RLOPSRM)
- **Math/mecánica:** `acumulados.anticipo` se DERIVA sumando `amortizacion` de estimaciones previas (por `numero`,
  excluye rechazadas). importe_anticipo = `ROUND(monto×anticipo%,2)` = **300,000**. Cada estimación amortiza 30% de
  su subtotal:
  - #1 P1 (sub 300,000): amort **90,000** · acum **90,000** · saldo **210,000**
  - #2 P2 (sub 300,000): amort **90,000** · acum **180,000** · saldo **120,000**
  - #3 P3 (sub 200,000): amort **60,000** · acum **240,000** · saldo **60,000**
  (una 4ª de sub 200,000 cerraría saldo en 0; Σ subtotales = monto.)
- **Sembrar:** 3 filas en `estimaciones` (numero correlativo 1/2/3, periodos distintos, estado `autorizada`,
  `anticipo_pct_snapshot=30`, `amortizacion = ROUND(subtotal×0.30,2)`, `retencion = ROUND(subtotal×0.005,2)`,
  `neto = subtotal−amort−ret`) + 1 generador por estimación. `contratos.anticipo_pct` debe = 30 (la base del %).
- **Verificar:** abrir las 3 estimaciones EN ORDEN → documento `caratula-doc-amortizacion`: "amortizado acumulado
  actual" crece 90k→180k→240k; "saldo por amortizar" baja 210k→120k→60k.
- **Cita:** art. 143 fr. I RLOPSRM; 5 al millar art. 191 LFD; sin IVA art. 2 fr. XIX RLOPSRM.

### C5 · `PRUEBA-TR-FIRMA-VIGENCIA` — regla temporal de firmas del roster (art. 125 RLOPSRM) — **CASO DETECTADO**
- **Math/mecánica (P1-9c, sesión #2):** `firmarNota` exige que `nota.fecha::date` caiga dentro de la vigencia del
  firmante en `contrato_roster`. Caso **observable = el ENTRANTE firmando una nota anterior a su alta**: entrante
  `vigencia_desde = hoy−7`, nota `fecha = hoy−12` → fuera → **409** "fuera de tu periodo de vigencia". `plazo_firma_dias`
  **generoso (30)** para que la nota vieja NO sea tácita (hoy−12+30 > hoy).
- **Sembrar:** `contrato_roster` rol residente con SALIENTE (`vigencia_desde=hoy−30, vigencia_hasta=hoy−7`) + ENTRANTE
  (`vigencia_desde=hoy−7, vigencia_hasta=NULL, sustituye_a=<saliente>`); caché `contratos.residente_id = ENTRANTE`;
  una nota `fecha=hoy−12`, emisor = el superintendente (para que el entrante sea contraparte). Insertar las filas
  del roster YA con sus vigencias (el trigger `sigecop_roster_transicion` veta editar después).
- **Verificar:** logueado como el ENTRANTE → firmar la nota vieja → **409**. Contraprueba 🟢: firmar una nota con
  `fecha ≥ hoy−7` (dentro de su vigencia) → 201.
- **⚠ Nuance (importante):** la rama "el SALIENTE no firma tras su baja" **no es demostrable** en estado
  consistente: el caché `residente_id` ya apunta al entrante, así que el saliente recibe un **403 "no eres parte"**
  ANTES de llegar a la regla temporal. O sea, el 403 del caché ya lo garantiza; la regla temporal solo "muerde"
  observablemente en el **entrante** (o en personas con dos periodos y una nota fechada en el hueco). Lo documento así.
- **Cita:** art. 125 RLOPSRM (sustitución; la nota la firma quien ejerce el cargo en esa fecha) + art. 53 / 123 fr. III. Nivel 2 [validar].

### Casos ADICIONALES detectados que también requieren fecha pasada (propongo, decides si entran)
- **C6 (candidato) · `PRUEBA-TR-REVISION-VENCIDA` — plazo de revisión de estimación vencido / afirmativa ficta
  (art. 54 LOPSRM, 15 días naturales).** Sembrar una estimación `enviada` con `enviada_en = hoy−16` sin autorizar;
  el **semáforo de 15 días** se deriva en el frontend (tablero/revisión) y mostraría "vencido". **[validar]** si la
  UI realmente rotula "afirmativa ficta" o solo el semáforo en rojo — confirmar en FASE 2 antes de prometerlo.
- **C7 (candidato) · curva con HISTÓRICO CONGELADO por convenio** (`programa_version` superseded con fechas pasadas):
  para ver la curva de doble serie (versión original congelada + vigente). Útil pero se solapa con el convenio (C3);
  podría ser una variante de `PRUEBA-TR-CONVENIO-PLAZO` con 2 versiones, no un contrato aparte. **Decides.**

> **Mi recomendación de alcance:** los **5 nombrados (C1–C5)** como contratos firmes; **C6** solo si confirmamos que
> la UI muestra el estado (lo verifico al inicio de la FASE 2); **C7** como variante de C3, no contrato nuevo.

---

## 4) ¿El plan "desde cero" ya tiene sección de atrasos / tiempo recorrido?
**NO.** `PLAN_PRUEBAS_POSITIVAS_DESDE_CERO_26jun.md` tiene la **"NOTA DE TIEMPO"** (la regla fecha-no-pasada → la
cadena estimación-onward exige periodo vencido) y un PASO 7 de alertas que aclara que "un contrato recién creado
puede no tener atraso aún" — pero **no** un catálogo de contratos de tiempo recorrido.
**Propuesta:** agregarle **una nota corta** junto a la "NOTA DE TIEMPO":
> *"Los casos que requieren TIEMPO RECORRIDO (nota tácita, fianza vencida, convenio, amortización multi-periodo,
> firma fuera de vigencia) NO se arman desde cero hoy (fecha no-pasada). Se demuestran sobre contratos sembrados —
> ver el Anexo «Contratos especiales» del plan pre-llenado."*
Sin duplicar detalle; solo la remisión.

---

## RESUMEN DE LA PROPUESTA (espera tu OK para FASE 2)
1. **Acomodo:** catálogo como **Anexo del plan pre-llenado** + puntero en la guía + 1 línea de remisión por PASO. *(Opción B híbrida.)*
2. **Folios:** prefijo `PRUEBA-TR-` → `NOTA-VENCIDA / FIANZA-VENCIDA / CONVENIO-PLAZO / AMORT-MULTI / FIRMA-VIGENCIA`.
3. **Casos firmes:** C1–C5 (con math verificada y cuadrada). **Candidatos:** C6 afirmativa ficta ([validar] UI), C7 curva histórica (variante de C3).
4. **Desde cero:** no tiene sección; se le añade solo una nota de remisión.

**Decisiones que necesito de ti:** (a) ¿Opción B híbrida para el acomodo? (b) ¿prefijo `PRUEBA-TR-` o los nombres
sin prefijo del brief? (c) ¿entran C6 y/o C7, o solo C1–C5? (d) en C3 ¿dejar el contrato LISTO (registrar/autorizar
en vivo) o pre-sembrar el convenio? (e) cita de C2: ¿art. 48 LOPSRM (como el código) o art. 91 RLOPSRM (como el brief)?

> **No ejecuté nada de la FASE 2.** Con tu OK: escribo el seed `seed_demo_tr.sql` (idempotente, probado en local),
> el runbook backup-gated para Render, el Anexo + remisiones en los planes, y la tabla
> `[Folio | Caso | Cuenta | Pantalla | Cómo verificar | Fundamento]`.
