# Catálogo de contratos de prueba — SIGECOP (26-jun-2026)

> Guía rápida para el equipo: **qué contrato abrir para cada prueba**. Hay 3 familias de contratos sembrados por SQL
> (no se arman a mano). Todos comparten la base demo ($1,000,000; CONC-01/02/03 = 300k/300k/400k; 3 periodos
> mensuales vencidos), salvo lo que define cada caso.
>
> - **Contraseña de todas las cuentas:** `Sigecop2026!`. Usa **login real** (no el modo demo). Cuentas: ver
>   `docs/Cuentas_Prueba_SIGECOP.md`. Correos clave: `residente@`, `contratista@` (= superintendente), `supervision@`,
>   `dependencia@`, `finanzas@`, y `residente2.demo@` (entrante de la sustitución).
> - **⚠ Re-sembrar antes de demostrar:** estimación/pago/bitácora son append-only; re-correr el seed deja cada
>   contrato en su etapa limpia. La familia **TIEMPO RECORRIDO usa fechas relativas → re-sembrar el MISMO día**.
> - Seeds: `backend/scripts/seed_demo_24.sql` · `seed_demo_atraso.sql` · `seed_demo_tr.sql`. Siembra en Render: §final.

---

## Familia HU — `PRUEBA-HU-01 … 24` (uno por Historia de Usuario)
**Para qué:** un contrato por HU, cada uno llevado **hasta la etapa de su historia**, para demostrar esa HU sin
armar el ciclo a mano. Base idéntica; solo cambia la etapa. Seed: `seed_demo_24.sql`.

| Folio | Qué se prueba | Etapa pre-llenada | Cuenta · Pantalla |
|---|---|---|---|
| PRUEBA-HU-01 | Alta de contrato (recién capturado) | Alta (sin bitácora) | `residente@` · Expediente / Alta |
| PRUEBA-HU-02 | Fianzas y garantías (con endoso) | Alta + 1 endoso | `dependencia@`/`residente@` · Fianzas y garantías |
| PRUEBA-HU-03 | Convenio modificatorio de plazo | Bitácora + convenio registrado | `dependencia@` · Convenios modificatorios |
| PRUEBA-HU-04 | Expediente integral | Bitácora + avance + 1 estimación pagada | `residente@` · Expediente |
| PRUEBA-HU-05 | Programa y curva de avance (al corriente) | Avance 100% en los 3 conceptos | `residente@` · Programa y curva |
| PRUEBA-HU-06 | Registro de trabajos por periodo | Bitácora + avance parcial P1 | `contratista@` · Avance / Registrar trabajos |
| PRUEBA-HU-07 | Alertas de atraso por concepto | Bitácora + avance MUY bajo (déficit) | `residente@` · Avance → Alertas |
| PRUEBA-HU-08 | Apertura de bitácora (por abrir) | Alta, **sin** bitácora | `residente@` · Apertura de bitácora |
| PRUEBA-HU-09 | Emisión y firma de notas | Bitácora abierta y firmada | `residente@`/`contratista@`/`supervision@` · Emisión de notas |
| PRUEBA-HU-10 | Consulta y búsqueda de notas | Bitácora + nota de avance firmada | `residente@` · Consulta de notas |
| PRUEBA-HU-11 | Minutas, visitas y acuerdos | Bitácora + 1 minuta + 1 visita | `residente@` · Minutas y visitas |
| PRUEBA-HU-12 | Integración de la estimación | Bitácora + avance P1, **sin** estimación | `contratista@` · Integración de estimación |
| PRUEBA-HU-13 | Presentación de la estimación | Estimación #1 **integrada** | `contratista@` · Presentación de estimación |
| PRUEBA-HU-14 | Historial de estimaciones | Estimaciones en varios estados (pagada/autorizada/presentada) | `residente@` · Historial de estimaciones |
| PRUEBA-HU-15 | Revisión y autorización/rechazo | Estimación #1 **presentada** (enviada) | `supervision@` → `residente@` · Revisión de estimación |
| PRUEBA-HU-16 | (Reingreso — HU retirada) estimación rechazada | Estimación #1 **rechazada** | `contratista@` · Integración (re-integra y re-presenta) |
| PRUEBA-HU-17 | Tablero de estimaciones (cartera) | Estimaciones pagada + autorizada | `residente@` · Tablero de estimaciones |
| PRUEBA-HU-18 | Portafolio ejecutivo (semáforo) | Avance al corriente (verde) | `dependencia@` · Portafolio ejecutivo |
| PRUEBA-HU-19 | Exportación de reportes | Bitácora + estimación pagada | `residente@` · Exportación de reportes |
| PRUEBA-HU-20 | Tránsito a pago (promoción de cobro) | Estimación #1 **autorizada** | `contratista@` (revisa `finanzas@`) · Tránsito a pago |
| PRUEBA-HU-21 | Registro del pago | Estimación #1 **autorizada** | `finanzas@` · Tránsito a pago → registrar |
| PRUEBA-HU-22 | Roster / sustitución de personas | Alta (roster cargado, sin sustitución) | `dependencia@`/`residente@` · Roster del contrato |
| PRUEBA-HU-23 | Padrón de empresas | Alta (aporta su empresa a la cartera) | `dependencia@` · Padrón de empresas |
| PRUEBA-HU-24 | Finiquito y cierre (todo pagado) | Bitácora + avance×3 + 3 estimaciones **pagadas** | `dependencia@`/`residente@` · Finiquito / cierre |

---

## Familia ATRASO — `PRUEBA-ATRASO-01/02/03`
**Para qué:** demostrar el **atraso y la pena convencional** (5%, art. 46 Bis LOPSRM). Base demo + ejecutado por
debajo de lo programado. Seed: `seed_demo_atraso.sql`. Cuadre de la estimación con atraso (P1/CONC-01, ejecutado 600):
subtotal 180,000 − amort 54,000 − 5 al millar 900 − **retención por atraso 9,000** = **neto $116,100.00**.

| Folio | Qué se prueba | Etapa pre-llenada | Cuenta · Pantalla |
|---|---|---|---|
| PRUEBA-ATRASO-01 | Alerta de atraso por concepto (HU-07): déficit 900 en CONC-01 P1 | Bitácora + avance bajo (sin estimación) | `residente@` · Avance → Alertas |
| PRUEBA-ATRASO-02 | **Retención por atraso $9,000** en la carátula de la estimación | Estimación #1 integrada (con retención de atraso) | `contratista@` · documento de estimación (sección financiera) |
| PRUEBA-ATRASO-03 | Finiquito con la pena ya aplicada (neto pagado $116,100) | Estimación #1 **pagada** → finiquitable | `residente@`/`dependencia@` · Finiquito |

---

## Familia TIEMPO RECORRIDO — `PRUEBA-TR-*`
**Para qué:** casos que **no se pueden armar por el alta** (regla *fecha-no-pasada*): plazos/vigencias vencidos,
amortización multi-periodo, sustitución con histórico, versiones de programa. **Uso interno de Maiki** (no es el set
"limpio" del profe). Seed: `seed_demo_tr.sql`. **⚠ Usan fechas relativas ("hace N días") → re-sembrar el MISMO día.**

| Folio | Qué se prueba | Etapa pre-llenada | Cuenta · Pantalla | Especial |
|---|---|---|---|---|
| PRUEBA-TR-NOTA-VENCIDA | Aceptación **tácita** de nota (plazo de firma vencido, art. 123 fr. III) | Bitácora + nota "aviso" emitida hace 5 días | `residente@` (contraparte) · Consulta de notas / Por firmar | — |
| PRUEBA-TR-FIANZA-VENCIDA | Fianza de cumplimiento **caducada** (vig. 2026-01-15, art. 98 fr. I inc. c RLOPSRM) | Alta (sin bitácora) + fianza vencida | `dependencia@`/`residente@` · Fianzas y garantías | — |
| PRUEBA-TR-CONVENIO-PLAZO | Convenio de plazo **listo** para registrar→autorizar en vivo | Alta + bitácora, **sin** convenio | `dependencia@` · Convenios modificatorios | Demostrar registrar→autorizar |
| PRUEBA-TR-AMORT-MULTI | **Amortización** del anticipo a lo largo de 3 estimaciones (acum 90k→180k→300k) | Bitácora + 3 estimaciones **autorizadas** | `contratista@`/`residente@` · documento de estimación (bloque amortización) | — |
| PRUEBA-TR-FIRMA-VIGENCIA | Regla temporal de firmas (entrante no firma nota previa a su alta, art. 125) | Bitácora + roster sustituido + 2 notas | **`residente2.demo@`** (entrante) · Por firmar | **Requiere `residente2.demo@`** |
| 🟥 PRUEBA-TR-REVISION-VENCIDA | Plazo de revisión de estimación vencido (art. 54, 15 días) | Estimación #1 **presentada hace 16 días** | `residente@`/`supervision@` · Revisión de estimación | **⚠ POR REVISAR** (la "afirmativa ficta" no está rotulada en la UI; confirmar en pantalla) |
| PRUEBA-TR-CURVA-HISTORICA | Curva con **histórico congelado** (2 versiones de programa por convenio de monto) | Bitácora + 2 versiones de programa + avances | `residente@` · Programa y curva → "Avance por etapas" | Contrato propio ($1.2M, con concepto adicional) |

---

## Estado de siembra en RENDER (resumen para Maiki — NO ejecutado aquí)

**¿Cuáles están en el runbook listas para Render?** **Las 3 familias.** El runbook
`docs/planes/RUNBOOK_SEED_PRUEBA_HU_RENDER_26jun.md` las cubre: **§A** (PRUEBA-HU, `seed_demo_24.sql`) · **§B**
(ATRASO, `seed_demo_atraso.sql`) · **§C** (TIEMPO RECORRIDO, `seed_demo_tr.sql`). **Ninguna falta.**

**Idempotencia confirmada:** cada seed borra/recrea **solo su propio prefijo** (`PRUEBA-HU-%` · `PRUEBA-ATRASO-%` ·
`PRUEBA-TR-%`); **no tocan** `OP-2026-%`, `SOP-2026-%` ni las otras familias entre sí → re-ejecutables, conviven.

**Qué correría Maiki, en orden (NO ahora — lo hacemos juntos):**
1. **Backup** de Render (`backend/scripts/backup_render.ps1`); no continuar si pesa 0. Prerrequisito ya cubierto:
   cuentas base + empresas (`reseed_cuentas.sql`) ya están en Render (confirmado por el volcado del 26-jun).
2. Sembrar en orden, cada uno con su verificación del runbook: **§A** `seed_demo_24.sql` → **§B**
   `seed_demo_atraso.sql` → **§C** `seed_demo_tr.sql`.
3. **§C (TR)** requiere la cuenta `residente2.demo@` en Render (existe) y, por usar **fechas relativas**, conviene
   correrla **el mismo día** de la demo (y re-correrla si pasan días).

> Las 3 son `docker exec -i sigecop_db psql "$RENDER_DB" -v ON_ERROR_STOP=1 -f <seed>` contra la cadena de Render,
> tal cual el runbook. **Code no ejecuta contra Render** — este resumen es para correrlo juntos.
