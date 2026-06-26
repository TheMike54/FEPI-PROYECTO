# REPORTE — Contratos de prueba de TIEMPO RECORRIDO (FASE 2, 26-jun-2026)

> Ejecución de la FASE 2 propuesta en `docs/planes/PROPUESTA_CONTRATOS_TIEMPO_RECORRIDO.md` (con tu OK).
> **Para pruebas internas de Maiki** (no es el set "limpio" del profe). Trabajo en **local**, sin push, sin deploy.
> Math verificada contra la **BD viva** (no solo contra `schema.sql`) y contra el código real (workflow de 3 agentes
> read-only para C2/C6/C7).

---

## 1. Qué se construyó

**Seed nuevo:** `backend/scripts/seed_demo_tr.sql` — 7 contratos `PRUEBA-TR-*`, **idempotente** (resetea solo
`folio LIKE 'PRUEBA-TR-%'`; NO toca `OP-2026`, `SOP-2026`, `PRUEBA-HU`, `PRUEBA-ATRASO`). Sembrado por SQL directo
porque la regla *fecha-no-pasada* impide armarlos por el alta (los triggers de inmutabilidad son `BEFORE UPDATE`;
el `INSERT` pasa). Base idéntica a los demás demo ($1,000,000; CONC-01/02/03 = 300k/300k/400k; 3 periodos vencidos),
salvo C7 (base propia de $1,200,000 con concepto adicional).

| # | Folio | Caso | Fundamento | Mecánica sembrada |
|---|---|---|---|---|
| C1 | `PRUEBA-TR-NOTA-VENCIDA` | Aceptación **tácita** de nota | art. 123 fr. III RLOPSRM | Apertura con `plazo_firma_dias=2`; nota `aviso` (emisor superintendente) fechada **hace 5 días**, sin firma de contraparte → `NOW() > fecha + 2d` → la consulta deriva "Aceptada (tácita)". |
| C2 | `PRUEBA-TR-FIANZA-VENCIDA` | Fianza con **vigencia caducada** | **art. 98 fr. I inc. c RLOPSRM** | Base + se vence la fianza de **cumplimiento** (vigencia `2026-01-15`). La captura por alta/HU-02 rechaza vigencia vencida → solo se siembra por SQL. |
| C3 | `PRUEBA-TR-CONVENIO-PLAZO` | Convenio de plazo **listo** | art. 59 LOPSRM + 99/102 RLOPSRM | Base + bitácora abierta, **sin** convenio → demostrar registrar→autorizar **en vivo** (acto separado, rol dependencia, exige oficio). |
| C4 | `PRUEBA-TR-AMORT-MULTI` | **Amortización** del anticipo multi-periodo | art. 143 fr. I RLOPSRM | 3 estimaciones **autorizadas** (CONC-01/02/03 en P1/P2/P3). Amortizado acumulado **90k→180k→300k**; saldo del anticipo **210k→120k→0** (anticipo 300k). |
| C5 | `PRUEBA-TR-FIRMA-VIGENCIA` | Firma **fuera del periodo de vigencia** | art. 125 RLOPSRM | Sustitución del residente: SALIENTE (`residente@`, hasta hoy−7) + ENTRANTE (`residente2.demo@`, desde hoy−7). Apertura con `plazo_firma_dias=30` (las notas viejas NO son tácitas → la regla temporal sí muerde). |
| C6 | `PRUEBA-TR-REVISION-VENCIDA` | Plazo de revisión vencido — **⚠ POR REVISAR** | art. 54 LOPSRM | Estimación **presentada hace 16 días** sin autorizar → semáforo del plazo en ROJO "Vencido". *(Ver §3.)* |
| C7 | `PRUEBA-TR-CURVA-HISTORICA` | Curva con **histórico congelado** | art. 59 LOPSRM / versionado | Contrato propio $1,200,000: 2 `programa_version` (v1 original 1,000,000 congelada + v2 vigente 1,200,000 por convenio de **monto** autorizado), avances repartidos por la bisagra (fecha del convenio `2026-04-15`). |

**Cuadre de C4 (al centavo):** cada estimación: subtotal − ROUND(subtotal×0.30,2) amortización − ROUND(subtotal×0.005,2)
(5 al millar, art. 191 LFD) = neto. #1 CONC-01 300,000 (amort 90,000); #2 CONC-02 300,000 (amort 90,000); #3 CONC-03
400,000 (amort 120,000). Acumulado de amortización 90k→180k→300k; saldo del anticipo 210k→120k→0. **Sin IVA** en la
carátula salvo Sección 3 (art. 2 fr. XIX RLOPSRM).

---

## 2. Decisiones [validar] resueltas (ningún `[validar]` colgando)

- **(e) Cita de C2 — RESUELTA.** La vigencia/caducidad de la fianza **NO** es art. 48 LOPSRM (lo que decía el código)
  ni art. 91 RLOPSRM (lo que decía el brief): es **art. 98 fr. I inc. c RLOPSRM** — el único que ordena verbatim que
  *"la fianza permanecerá vigente durante el cumplimiento de la obligación que garantice…"* (`docs/legal/reg_utf8.txt`,
  art. 98). El art. 48 LOPSRM es la *obligación* de garantizar + plazo de presentación; el art. 91 RLOPSRM es el
  *ajuste/endoso*. **Alineado el código:** en `backend/src/controllers/garantias.controller.js` el rechazo por vigencia
  vencida ahora cita **art. 98 fr. I inc. c RLOPSRM** (antes "art. 48 LOPSRM"); el art. 48/66 (tipos) y el art. 91
  (endoso) quedan donde estaban (correctos). No había doc de cobertura que compitiera; la única alineación es código↔ley.
- **(c) C7 = contrato propio, no variante de C3 — RESUELTA.** Un convenio de **plazo** (C3) **no** crea `programa_version`
  (en `crearConvenio`, solo `monto/programa/mixto` versionan), así que reutilizar C3 daría **0 versiones → sin curva de
  doble serie**. C7 se siembra como contrato aparte con un convenio de **monto** autorizado.
- **(a)/(b)/(d) — RESUELTAS** según tu OK: Opción B híbrida; prefijo `PRUEBA-TR-`; C3 listo sin el convenio.
- **C5 — alcance Nivel 2 [validar]:** la regla temporal de firmas (art. 125) es interpretación de diseño; queda
  documentada como tal (lo legal lo confirma el profe).

---

## 3. C6 — la verdad sin maquillar (⚠ POR REVISAR)

Lo que **SÍ** es observable hoy: el **plazo de revisión vencido**. En `RevisionEstimacion.jsx` y `EnvioEstimacion.jsx`
el panel **"Plazo de revisión (art. 54 LOPSRM)"** muestra semáforo **ROJO** con el texto "Día N de 15 — **Vencido**"
(Revisión) / "Plazo de revisión: día N de 15 · **plazo vencido**" (Envío), calculado en vivo desde `enviada_en`.

Lo que **NO** es observable: la **consecuencia legal "afirmativa ficta"**. Las palabras *afirmativa ficta /
autorización ficta / se tiene por autorizada* **no existen en el frontend** (grep sin coincidencias) y el **estado de
la estimación NO se voltea**: sigue rotulada "Presentada" (badge ámbar) aunque el plazo haya vencido. El semáforo
**no expone un `data-testid`**; se identifica por el texto visible citado (no inventé testid).

**Por eso C6 va sembrado pero marcado "POR REVISAR"** en el plan (resaltado en el Anexo, en el PASO 14 y en los
resúmenes): el dato está listo, pero **falta tu confirmación en pantalla** de qué se ve exactamente antes de
venderlo como caso firme — justo lo que necesitas para decirle a claude.ai qué observaste. Si se quisiera mostrar la
afirmativa ficta como consecuencia (texto/cambio de estado), hay que **implementarla**, no solo sembrar datos
(eso sería trabajo de código aparte, fuera de este seed).

---

## 4. C5 — matiz documentado (rama no observable)

La regla temporal muerde de forma observable **solo en el ENTRANTE**: logueado como `residente2.demo@`, firmar la nota
#2 (fechada hace 12 días, anterior a su alta hace 7) → **409** "fuera de tu periodo de vigencia (art. 125)"; firmar la
nota #3 (hace 3 días, dentro de su vigencia) → **201** (contraprueba 🟢). La rama **"el SALIENTE no firma tras su baja"
NO es demostrable** en estado consistente: el caché `contratos.residente_id` ya apunta al entrante, así que el saliente
recibe **403 "no eres parte"** ANTES de llegar a la regla temporal. Queda anotado así en el Anexo (no se vende como
observable).

---

## 5. Validación en LOCAL

- Seed corrido **2 veces** contra `sigecop_db` (docker), **exit 0** ambas; **7 contratos**, sin duplicados (idempotente).
- Verificación por caso (salida del propio seed):
  - C7: `programa_version` = **2** (v1 `vigente=false` supersedida 2026-04-15 con snapshot 2 conceptos/6 celdas; v2
    `vigente=true` con convenio, snapshot 3 conceptos/8 celdas); avances repartidos 2 histórico (03-31) + 2 vigente (04-30).
  - C5: roster residente = **2** (saliente con `vigencia_hasta`=hoy−7 + entrante activo).
  - C1: nota #2 `plazo_vencido = t`. C5: notas #2/#3 `plazo_vencido = f` (plazo 30, la regla temporal manda).
  - C2: fianza cumplimiento `vencida = t` (2026-01-15). C6: estimación `enviada`, 16 días desde el envío.
- **No ejecuté contra Render** (solo runbook §C, backup-gated).

---

## 6. Archivos tocados (todos NO congelados)

| Archivo | Cambio |
|---|---|
| `backend/scripts/seed_demo_tr.sql` | **NUEVO** — los 7 contratos `PRUEBA-TR-*` (idempotente, probado). |
| `backend/src/controllers/garantias.controller.js` | Cita de vigencia vencida: art. 48 LOPSRM → **art. 98 fr. I inc. c RLOPSRM** (línea del rechazo + nota en cabecera). NO congelado. |
| `docs/pruebas/PLAN_PRUEBAS_POSITIVAS_FINAL_26jun.md` | **Anexo "Contratos especiales de tiempo recorrido"** (tabla `[Folio\|Caso\|Cuenta\|Pantalla\|Cómo verificar\|Fundamento]`) + **C6 resaltado POR REVISAR** + 7 remisiones 🔁 en los PASOS 3/5/10/11/14/19/23 + bullets en el Resumen. |
| `docs/pruebas/PLAN_PRUEBAS_POSITIVAS_DESDE_CERO_26jun.md` | Nota corta de remisión al Anexo (no se arman desde cero). |
| `docs/contexto/GUIA_PLANES_DE_PRUEBA.md` | Puntero en §6 (la guía remite, no aloja el inventario). |
| `docs/planes/RUNBOOK_SEED_PRUEBA_HU_RENDER_26jun.md` | **§C** (backup-gated) para sembrar `PRUEBA-TR-*` en Render + tabla de verificación cruzada. |
| `docs/planes/PROPUESTA_CONTRATOS_TIEMPO_RECORRIDO.md` | Banner "RESUELTO EN FASE 2". |
| `docs/reportes/REPORTE_CONTRATOS_TIEMPO_RECORRIDO_26jun.md` | Este reporte. |

**Zona congelada: intacta.** No se tocó `schema.sql` (el seed solo usa columnas existentes), ni auth, ni los
controllers/rutas congelados.

---

## 7. Pendiente para Maiki

1. **Reiniciar el backend** para que la cita corregida de C2 quede viva (`docker restart sigecop_backend`) — *hecho en
   esta sesión local*; en Render se aplica con el siguiente deploy de `main`.
2. **Sembrar en Render** con el **runbook §C** (backup primero). Requisito: la cuenta **`residente2.demo@sigecop.test`**
   debe existir en Render (entrante de C5) y conviene **re-sembrar el mismo día** de la demo (C1/C5/C6 usan fechas
   relativas "hace N días").
3. **C6 — confirmar en pantalla** si la UI debe rotular la afirmativa ficta; si sí, es trabajo de **código** (no de
   seed). Hasta entonces queda **POR REVISAR**.
4. **Rama:** todo este trabajo está en **`main`** (donde ya vivían atraso/propuesta/matriz; `main` = `entrega-final-26jun`
   + 6 commits lineales). Si quieres consolidar, **adelanta `entrega-final-26jun` a `main`** (fast-forward). Sin push.
