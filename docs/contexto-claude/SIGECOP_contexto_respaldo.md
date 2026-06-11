# SIGECOP — Respaldo de contexto (para retomar en frío)

> Red de seguridad: si se pierde la conversación, una nueva instancia de Claude lee esto y retoma.
> Refleja el estado REAL ≈2026-06-04. Donde un doc viejo contradiga el código, manda el código.

## 1. Qué es el proyecto
**SIGECOP** — app web de gestión técnico-administrativa de contratos de **obra pública** bajo ley mexicana (**LOPSRM / RLOPSRM / LFD**). Proyecto académico de FEPY.
- **Nivel 1 (autoritativo):** texto literal de la ley (`docs/legal/`) + el profesor (**Carlos Silva Sánchez**, `csilvasa@ipn.mx` — fue supervisor real del contrato NAICM, sus formatos son la referencia).
- **Nivel 2:** Claude propone, Maiki decide.

## 2. Stack y deadline
React 18 + Vite + Tailwind · Node 20 + Express + **PostgreSQL** (`pg`) · Docker/compose · **Render** (auto-deploy de `main`, `RUN_MIGRATIONS=true`). **⚠️ Deadline duro: el PostgreSQL gratis de Render expira el 25 de junio.**

## 3. Quién trabaja y cómo
- **Maiki + Claude (chat) + Claude Code.** Maiki = fundación (Equipo 1) + **único integrador** (jala ramas, prueba local, mergea a `main`, despliega). Los equipos nunca despliegan.
- Claude chat = planeación/prompts/revisión/síntesis. Claude Code = ejecutor con filesystem.
- **Patrón de cada pasada de Code:** construye y prueba en LOCAL, sin commit/push/deploy, main intacto; entrega doc Markdown + patch incremental + runbook + archivos tocados; cita texto literal o marca `[validar]`/`[sin fundamento verificable]`; corre la suite e2e. **Maiki revisa e integra** (commit+push desde PowerShell; ojo: `&&` no sirve en su PowerShell viejo → comandos por línea).

## 4. Dominio
- **5 roles:** Residente, Contratista (incluye Superintendente), Supervisión, Dependencia, Finanzas. **3 niveles:** ejecuta / consulta / sin acceso. Login sin selector de rol.
- **22 HU (HU-00…HU-21).**
- **Cuentas demo** (todas `Sigecop2026!`): `residente@`, `contratista@`, `supervision@`, `dependencia@`, `finanzas@sigecop.test`, `csilvasa@ipn.mx` (profe).

## 5. Estado REAL hoy (≈2026-06-04) — main ≈ `ac9ce34` (P1 integrada; P2 integrándose)
**7 HU funcionan end-to-end vs PostgreSQL (Maiki las probó en producción):** HU-00 login · HU-01 alta+catálogo+programa · HU-08 apertura bitácora · HU-09 notas · HU-10 consulta · HU-12 estimación (carátula server-side: amortización art. 138 RLOPSRM, 5 al millar art. 191 LFD) · HU-21 pago. Inmutabilidad por triggers.

**Fundación ya integrada y desplegada:** A2 (programa = matriz concepto×periodo), alta completa v2–v5 (nav lineal, **regla 100% Σ=contratado**, garantías+jurídicos+PDFs obligatorios, anticipo>30%→PDF), bitácora-v2 (apertura=nota#1, firmas, candado server-side, tipos por rol art. 125, datos mínimos art. 123 fr. III, búsqueda por tag), **MODO PROYECTO ELIMINADO** (todo login real, sin dummy), **8 tablas de soporte** para los equipos, /docs reorganizado.

**15 HU restantes = prototipo dummy** → las construyen los equipos. Render: contratos limpiados (usuarios intactos).

## 6. Reparto de equipos (VIGENTE — Plan_Particion_3Equipos)
- **Fundación (Maiki+Iván):** HU-00, 01, 12 + esquema/accesos + correcciones del profe.
- **Equipo 2 (Bitácora/documental/avance):** HU-02, 04, 05, 06, 07, 11 (+ 08/09/10 hechas).
- **Equipo 3 (Estimaciones/pagos/reportes):** HU-13–20 (+ 21 hecha).
- **HU-03 (convenios): COMPARTIDA** — fundación hace migración+endpoint, E3 la UI.
- Cada equipo en su rama, PR a main, Maiki integra. **Zona congelada:** login/permisos, alta, A2, estimación core, schema.sql (lo edita Maiki). **Patrón: cada equipo entrega su suite en VERDE** (el 1er PR de E3, HU-14, se devolvió por spec en rojo — el código era seguro, el test era del dummy viejo).

## 7. Plan de fundación — 4 pasadas (lo que le falta a Maiki)
- **P1 — Auditoría legal: ✅ HECHA + integrada.** Citas verificadas vs texto literal. Correcciones: convenio→**art. 59** (no 99); datos 1ª nota→**art. 123 fr. III**. Confirmadas OK: **45-A-X SÍ existe** (RLOPSRM), anticipo>30%=**art. 50 fr. IV**, exención garantía art. 48, endoso art. 98-II RLOPSRM. **DECISIÓN: regla del 100% se mantiene en `=` exacto** (defensible; existe patch a parcial NO aplicado; confirmar con profe). Sustitución pineada: **art. 125 fr. I inciso g) RLOPSRM**.
- **P2 — Sustitución de personas: ✅ HECHA** (integrándose). `contrato_roster` append-only, vigente derivado, ON DELETE RESTRICT, endpoint GET/POST sustituir, UI /contratos/roster (SoloRol dependencia/residente). ⭐ **Inmutabilidad de bitácora VERIFICADA** (firmas atadas a usuario_id; las viejas conservan su firmante; 10/10 psql + smoke + 148 verde). Follow-ons diferidos: (a) ligar nota de bitácora a la sustitución (`nota_id`, espera [validar con profe]); (b) spec e2e del roster → P4.
- **P3 — HU-03 convenios modificatorios: ✅ HECHA E INTEGRADA** (main 9b89a4d; backend, UI=E3). [P4 EN CURSO con Code.] `convenios_modificatorios` (inmutable) + **versionado del programa** (programa_version/_concepto/_celda, snapshots inmutables) + cierre FK garantia_endosos.convenio_id + endpoint (contrato documentado para E3). **Verificado:** v1 preservado/v2 vigente, **estimaciones INMUNES** (snapshots + carátula congelada), convenio inmutable, guardrail/art.118/claves-dup rechazan, 148 verde; revisión adversarial quitó un saneo que abortaba el deploy en Render. **Hallazgo 25%:** art. 59 NO tiene tope del 25% (límite cualitativo "variaciones sustanciales" + presupuestal); el 25% es RLOPSRM art. 102 (disparador revisión SFP, no tope), 50% es art. 59 Bis (derecho ajuste de costos). Implementado: fundamento siempre art. 59 + flags clasificación + guardrail configurable (regla de negocio, NO tope legal); confirmar con profe. Follow-ons: auto-endoso fianza al aprobar convenio (art. 98 fr. II), modelar "presupuesto autorizado". Integrar excluyendo docs/Referencias-estimaciones/.
- **P4 (última) — Auditar + endurecer ciclo estimación→pago: ✅ HECHA** (sin commitear sobre main 9b89a4d). **8 huecos** (tabla en AUDITORIA_EST_PAGO_HU12_HU21_Maiki.md): **G1** pago ahora exige estimacion_id real (no texto libre) · **G2** importe = neto server-side read-only · **G3** UNIQUE+FOR UPDATE no-doble-pago (409) · **G4** cierra estimación→pagada, solo integrada/autorizada · **G5** estimación acumulada ≤ planeado del periodo (art. 45-A-X/52) · **G6** PDF gating server-side en integrarEstimacion · **G7** carátula con acumulados/saldos · **G8 IVA = DECISIÓN** (no está en LOPSRM/RLOPSRM/LFD, es ley SAT; carátula de progreso correcta SIN IVA art. 2 fr. XIX; el pago real SÍ lleva IVA → patch condicional AUDITORIA_EST_PAGO_IVA_DIFFS.patch NO aplicado). Archivos: schema.sql, estimaciones.controller.js, pagos.controller.js, RegistroPago.jsx (selector de estimación), roster-sustitucion.spec.js (nuevo). **153 passed/8 skip/0 fail** (+5 del spec roster). **Pendiente de INTEGRAR** (commit+push; decidir imágenes commit-vs-gitignore). **Los 5 `fixme` (hu-08×2, hu-12×1, hu-21×2) NO convertidos** (necesitan seed per-test; patrón documentado). **[validar con profe]:** IVA, G5 bloqueo-duro-vs-alerta, G6 umbral anticipo, G2 pago parcial-vs-exacto, G4 exigir 'autorizada' cuando exista HU-15.
- **🏁 LAS 4 PASADAS DE FUNDACIÓN COMPLETAS E INTEGRADAS** + tweak "Registrados siempre abierto" + correcciones alta/usuario — todo en `origin/main = 069a71d` y desplegado en Render (ac9ce34 P1 → 2d1870a P2 → 9b89a4d P3 → bedf149 P4 → afc70ff Registrados → 83e0a72 alta/usuario → 069a71d HU-07+HU-04 de E2). ⚠️ La revisión del profe (audio 04-jun, §12) abrió **una nueva tanda de correcciones** (bitácora → E2; alta → fundación). Lo que resta del proyecto: esa tanda + las 15 HU de los equipos + las HU nuevas del sprint 3.

## 8. Referencia real de estimación (documentos del profe — NAICM/GACM)
En `docs/Referencias-estimaciones/` hay **6 imágenes de WhatsApp** de una estimación real (GACM/NAICM, estimación #17). **OJO: el archivo `Referencia_Estimacion_Real_NAICM.md` NO existe** (yo creía que sí) — Code leyó las imágenes directo (carátula + 2 hojas de generadores). Estructura real: carátula con **acumulados/saldos** (estimado acumulado/saldo por estimar; amortizado/saldo por amortizar) + **IVA en el neto a pagar**; generadores con columnas proyecto/hasta-anterior/de-esta/total/por-ejecutar; resumen por partida; **hoja de ruta de firmas para pago** (contratista→supervisión→residencia→gerencia→mesa de control). De ahí salieron G7 (acumulados/saldos, ya implementado) y la decisión del IVA. **IVA:** NO es de LOPSRM/RLOPSRM/LFD (es ley del SAT); nuestra carátula de progreso va bien SIN IVA (art. 2 fr. XIX); el pago real SÍ lleva IVA → decisión de Maiki con el profe (patch condicional listo). Las imágenes están sin trackear: decidir commit-vs-gitignore.

## 9. Pendientes adicionales (planear, no urgentes)
- **Actualizar `Historias_Usuario.xlsx`** (docs/analisis-y-diseno/): lleva mucho sin tocar y cambió mucho. Plan: pasada de Code que reconcilie el doc vs la implementación real + los entregables (docs/historial-cambios/) + la auditoría legal, **por HU** (conducta actual, criterios de aceptación en formato del profe = aseveraciones verificables máx. 3 + puntos Fibonacci, fundamento legal auditado, estado). **Hacerlo TARDE** (cuando P3/P4 estén y los equipos avancen, para no re-hacerlo).
- **Confirmar con el profe:** regla del 100% (`=` vs parcial), autoridad de sustitución, si la sustitución genera nota de bitácora, y el IVA.

## 10. Ubicaciones
- Repo: `github.com/TheMike54/FEPI-PROYECTO`; local `C:\Users\migue\Downloads\Proyectofepy\sigecop`.
- `/docs`: `equipos/` · `contexto-claude/` (este respaldo, DECISIONES, ESTADO_ACTUAL [viejo, no fiar]) · `legal/` (LOPSRM.pdf, Reg_LOPSRM.pdf DOF 24-02-2023, LFD.pdf) · `historial-cambios/` (entregables `*_Maiki.md` + `*_DIFFS.patch`) · `analisis-y-diseno/` (Historias_Usuario.xlsx, matrices, maquetas) · `referencia-estimaciones/` (docs reales del profe).
- `Cuentas_Prueba_SIGECOP.md` = gitignored (contraseñas fuera del repo).

## 12. Correcciones del profe (post-audio 04-jun) — SOLO lo que falta
(Cruce completo en `Feedback_Profe_04jun_vs_Estado.md`. Varias de sus críticas YA están: P2 roster, P4 pago/estimación/PDFs/acumulados, garantías, anticipo>30%, creador-no-firma → solo faltan **desplegar P4 + surfacear el roster**.)

**Bitácora (fundación — lo más claro y necesario):**
- **QUITAR "Anular" y "Eliminar nota"** — la ley exige nota inalterable (art. 123 fr. VI); corrección = nota NUEVA que referencia la anterior. El más urgente (tener "Anular" viola la ley).
- **Apertura = NARRATIVA generada** (machote) desde los datos mínimos, no datos crudos; las demás notas = texto libre tipificado.
- **"Vincular" LINEAL** (no hilos/árbol; estilo CFDI cancela+sustituye); el "responder" estilo blog está mal.
- **Tipos de nota por rol = lista exacta del profe** (no se corrigieron): solicitud reporte/avance mensual, autorización convenios, terminación superintendente, suspensión trabajos, conciliación, caso fortuito/fuerza mayor, terminación trabajos, cierre bitácora.
- Bug: fecha mostrada = fecha de **creación** (se buggea al vincular).

**Alta (fundación) — ✅ HECHO E INTEGRADO (commit 83e0a72, desplegado a Render)** (decisiones A+A): (1) **registro exige nombre+apellidos** (≥2 palabras, cliente+servidor, backfill demo idempotente, 1 solo campo `nombre`); (2) **alta selecciona personas de cuentas**: contratista = el superintendente (cuenta rol contratista, quitado el texto libre); dependencia = `<select>` (nueva FK `contratos.dependencia_id`, parte contratante, NO firma → fuera del roster, art. 123); `crearContrato` inserta residente+superintendente+supervisión en contrato_roster en la transacción del alta. Gating/100%/cuadre/CHECK roster/firma bitácora INTACTOS. 163 verde + revisión adversarial. Migración aditiva (dependencia_id + backfill nombres demo). **[validar profe mañana]:** umbral "≥2 palabras", dependencia-no-firma. **SIGUIENTE:** integrar los 2 PRs de E2 (prompt de revisión listo).

**Confirmar con el profe antes de tocar:** datos mínimos de apertura (domicilios/teléfonos/alcance/sitio), fecha de apertura (=inicio vs "previo a" art. 52 Ter), IVA, y los demás `[validar]` de P4.

**Equipos:** programa como **Gantt con meses** (E2, HU-05; la data A2 ya existe).
**HU nuevas (sprint 3 con el profe):** contexto de contrato al login; super-entidad **"Obra" + tablero** (relacionado HU-17, E3).
**Logística:** el profe ofreció **mañana 6:30–8** para definir el sprint 3.

**Tweak "Registrados siempre accesible": ✅ HECHO** (sin commitear; AltaContrato.jsx + 2 specs; gating de captura intacto — regresión 3/3, 157 verde). Integrar junto con P4.

**Equipo 2 — revisado por Code, DECISIÓN opción 2 (integramos nosotros):** `feat/e2-alertas` (HU-07, 4acacd0) y `feat/e2-expediente` (HU-04, 2bfcab2) rebasadas sobre afc70ff, pusheadas (solo ramas). Code mergeó local a `integracion-e2` (= main 83e0a72 + HU-07 + HU-04, 6 archivos, **sin conflictos**). **Revisión: seguridad y zona congelada ✅ en ambos** (HU-07 solo monta router en server.js, api.js aditivo conserva roster+alertas, NO recrea alerta_atraso, acota por esParteOSupervision + requireRole('residente'), creada_por del JWT, parametrizado; HU-04 read-only). Único rojo = 5 specs viejos de E2 (hu-04 ×3 botones dummy, hu-07 ×2 falta seleccionar contrato) — NO bugs, las páginas pasaron de prototipo a backend real. **✅ INTEGRADO (opción 2):** Code arregló los 2 specs en integracion-e2 (commit 069a71d, solo .spec, 163 verde), Maiki hizo `git merge integracion-e2` (fast-forward) + push → **origin/main = 069a71d**, desplegado. **HU-07 (alertas) y HU-04 (expediente) ya en producción.** Pendiente: smoke en Render. Tras integrar, E2 hace las **correcciones de bitácora del profe** (su dominio: quitar Anular/Eliminar art.123 fr.VI, apertura narrativa, vincular lineal, tipos por rol) y luego HU-06.


Directo sin relleno; tablas para decisiones; enmarcar para el profe; explicar el porqué; `/auditar` = verificar solo contra fuente tangible + citar artículo/fracción + marcar certeza; no es abogado (lo interpretativo va `[validar]`).

---
*Respaldo reescrito ≈2026-06-04 para arranque en frío. Plan fundación: P1✅ P2✅ P3🔄 P4⏳. 7 HU end-to-end; equipos activos; fundación integrada (A2/alta/bitácora/modo-proyecto-fuera/tablas).*
