# PLAN DE MITIGACIÓN — hallazgos de la prueba a fondo (18-jun-2026)

> Plan para **resolver todos los hallazgos** de `docs/INTERPRETACION_DE_HALLAZGOS.md`, organizado en
> **oleadas** por prioridad/riesgo/dependencia. El hallazgo más fuerte (rediseño de "bloques") tiene su
> **plan aparte**: `docs/planes/PLAN_REDISENO_BLOQUES_WIZARD_18jun.md` (+ mockup
> `docs/mockups/sigecop-rediseno-bloques.html`).
>
> **Método (igual que siempre):** local sin push; Maiki integra; **zona congelada intocable** salvo formas
> permitidas; suite verde tras cada tanda; lo legal interpretativo lo confirma el profe.
> **Convención:** 🐛 bug · 🚧 falta · 🔀 decisión · ⚖️ ley · 💅 UX · 🟩/🟨/🟥 esfuerzo.

---

## OLEADA 1 — Quick wins (bugs + cierres legales de bajo riesgo) · ~1 tanda

> Alto valor, bajo riesgo, sin DDL nueva (o mínima). Todo con su prueba negativa nueva en la suite.

| # | Qué | Cambio concreto | Zona | Suite |
|---|---|---|---|---|
| 1.1 | 🐛 **Finiquito debe bloquear el ciclo** (§3.3) | Replicar el gate que ya existe en `instruccion-pago`: **409 si `contrato.estado==='cerrado'`** en `integrarEstimacion` (congelado → diff a Maiki) y en `enviar/autorizar/rechazar/reingresar` (`estimaciones-ciclo`, NO congelado). | `estimaciones.controller` (congelado, +1 guard → Maiki) + `estimaciones-ciclo` | spec nuevo: cerrar y luego intentar integrar → 409 |
| 1.2 | 🐛 **Minutas: mostrar folio, no id** (§2.1) | `listarMinutas/listarVisitas` → `LEFT JOIN bitacora_notas bn ON bn.id=m.nota_id`, devolver `bn.numero AS nota_numero`; front muestra `#${nota_numero}`. (Patrón ya usado en `trabajos.controller`.) | `minutas.controller` + `MinutasVisitas.jsx` (no congelados) | hu-11 asercióna el folio correcto |
| 1.3 | 🐛 **Endoso: validar monto/vigencia por motivo** (§6.1, art. 91/98-II) | En `registrarEndoso`: si motivo∈{ampliacion_monto,mixto}→exigir `nuevo_monto`; si {prorroga_vigencia,mixto}→exigir `nueva_vigencia`; rechazar endoso vacío. | `garantias.controller` (no congelado) | spec: endoso sin monto → 400 |
| 1.4 | 🔀 **Quitar placeholder FALSO de generadores** (§4.1) | El cartel "Pendiente Equipo 3" es mentira (HU-12 ya captura). Cambiar copy de `AmbienteEstimacion` bloque 2 a "listo" + link a HU-12 (provisional, hasta el wizard de la Oleada 4). | `AmbienteEstimacion.jsx` | ambiente-estimacion |
| 1.5 | 🐛 **Atraso: no duplicar el asiento** (§3.2) | `asentarAtraso`: antes del INSERT, si ya hay nota de atraso de ese concepto/periodo → **409**. Requiere vínculo atraso↔concepto/periodo (columna `concepto_id`+`periodo` en la nota, o tabla puente `atraso_asentado`). **DDL aditiva → a Maiki.** | `alertas.controller` (no cong.) + `schema.sql` (aditivo → Maiki) | spec: asentar 2× → 409 |
| 1.6 | 💅 **Sidebar: rango de HU por flujo** (§7.1) | En `Sidebar.jsx::Flujo`, calcular min–max de los HU (padre+hijos, reusar `codigosDe`) → pill `HU 12–17`. | `Sidebar.jsx` (no congelado) | nav-modo-sistema asercióna el rango |

**Resultado Oleada 1:** los bugs visibles + los cierres legales más claros, sin tocar arquitectura.

---

## OLEADA 2 — Funcionalidad faltante (UX + datos derivados) · ~1-2 tandas

| # | Qué | Cambio concreto | Zona | Suite |
|---|---|---|---|---|
| 2.1 | 🚧 **Consulta de notas muestra vínculos minuta/avance** (§2.2) | En `construirPayloadNotas`: subconsultas `EXISTS(...minutas/visitas/concepto_avance WHERE nota_id=n.id)` → flags; el front pinta esos vínculos en la columna "Vínculo". | `bitacora.controller` (congelado → diff a Maiki) + `BuscadorNotas.jsx` | hu-10 |
| 2.2 | 🚧 **HU-19 reporte #4 (observaciones)** (§5.2) | Endpoint nuevo `GET /estimaciones-ciclo/contrato/:id/observaciones` (acotado por participación); habilitar el reporte 4 en `reportesContrato.js`. | controller/route nuevos (Maiki monta) + `reportesContrato.js` | hu-19 reporte 4 descarga |
| 2.3 | 🔀 **Ciclo de vida con progreso real** (§4.4) | Al elegir contrato, `Promise.all` de programa/estimaciones/notas/pagos/convenios → estado por bloque (pendiente/en curso/hecho). | `CicloVidaContrato.jsx` (no congelado) | ciclo-vida |
| 2.4 | 🚧 **Ver mi info / empresa** (§7.2) | Avatar → `<button>` con dropdown (reusar el patrón de pop-up de AppShell): nombre, rol, **empresa (nombre+tipo+estado)**, correo. | `AppShell.jsx` (no congelado) | spec nuevo: abrir "mi info" |
| 2.5 | 💅🚧 **Campana UNIFICADA + avisos** (§1.1, 1.2, 1.3) | (a) Endpoint derivado `GET /bitacora/notas-pendientes` (notas por firmar). (b) Conteo de solicitudes pendientes (dependencia). (c) Fusionar 🔔+✍️ en una campana; badge = suma; dropdown agrupado por tipo (Firmas/Atrasos/Solicitudes). **Conservar testids** `campana-atrasos`/`link-por-firmar`/`drop-*` o actualizar specs. | controller/route nuevos + `AppShell.jsx` | actualizar specs de campana/por-firmar |

**Resultado Oleada 2:** notificaciones reales, vínculos visibles, ciclo de vida útil, mi-info.

---

## OLEADA 3 — Revisión a fondo + reglas de negocio (ley) · ~2 tandas + decisiones del profe

| # | Qué | Cambio / decisión | Ley |
|---|---|---|---|
| 3.1 | 🔀 **HU-20 techo presupuestal a fondo** (§5.1) | (a) Partida **obligatoria** al cargar el techo (anclar a "partida específica"). (b) Sustituir el join contrato↔presupuesto **por texto** por la **FK** `contratos.dependencia_id`. Revisar suficiencia de extremo a extremo. | **art. 24 LOPSRM** |
| 3.2 | 🚧 **Convenio: acto de AUTORIZACIÓN** (§6.2) | Estado/campo `autorizado_por`+`autorizado_en` de la persona facultada; cuando variación >25% (art. 102), exigir oficio/soporte antes de surtir efecto. Hoy `autorizado_por` = quien registra. | **art. 59 párr. 3 + 102 LOPSRM** |
| 3.3 | 🔀 **Avance: ¿append-only o editable?** (§3.1) | **Decisión del profe.** (A) quitar PATCH/DELETE; corregir = avance nuevo vinculado (alinea con el patrón del proyecto). (B) conservar editable, pero que editar/eliminar **asiente su nota** de corrección. | art. 123 fr. VI (la nota es inmutable) |
| 3.4 | 🔀 **Dependencia NO sustituible — explícito** (§6.3) | Dejar claro en la UI del roster ("la dependencia contratante no es sustituible, art. 125"); blindar que `dependencia_id` no se actualice. Corrección de dependencia mal capturada = vía administrativa [validar]. | **art. 125 fr. I g RLOPSRM** |
| 3.5 | 🚧 **Re-seed de cuentas ligadas a empresas** (§7.3, 6.4) | Script dedicado `backend/scripts/reseed_cuentas.{sql,js}` (NO `schema.sql`): recrear las cuentas con su empresa (ej. residente "chocovan"→"cjn") + sembrar 2-3 empresas más (1 dependencia + N contratistas/supervisión por empresa) para probar el acotamiento. Modelo **1 empresa : N cuentas**. | art. 43 RLOPSRM (padrón = contratistas) |

**Resultado Oleada 3:** HU-20 confiable, convenios con autorización real, modelo de cuentas/empresas robusto.

---

## OLEADA 4 — REDISEÑO DE BLOQUES (el grande) → **plan aparte**

> `PLAN_REDISENO_BLOQUES_WIZARD_18jun.md`. Resumen: convertir los "recorridos por bloques" (hoy cascarones
> de enlaces, confusos al lado de las historias) en **wizards que INTEGRAN las historias de cada flujo**, al
> estilo del **Alta de contrato**. Orden por factibilidad: **Estimación (insignia) → Pago → Bitácora →
> Avance**; Convenios/Expediente NO se vuelven wizard (uno es formulario, el otro es visor). Incluye:
> - 🔀 **C-03/C-04** la reestructura (el corazón del pedido de Maiki).
> - 🚧 **C-02** evidencia fotográfica (decisión de alcance: ¿Etapa 1?).
> - El fix de la **"turnar" de HU-15** (botón al lado de lo subido, no dentro del formulario).
> - Migración **incremental y suite-safe**, un flujo a la vez.

---

## Mapa de decisiones que dependen del PROFE (no las decide Code)
1. Avance: ¿append-only o editable con nota? (3.3)
2. Evidencia fotográfica: ¿alcance de Etapa 1? (Oleada 4 / C-02)
3. Alcance exacto del rediseño wizard — **escuchar de nuevo el audio** ("quitar buscar/vincular notas firmadas porque todo va en una pantalla").
4. Atraso: criterio "1 asiento por concepto/periodo" (1.5).
5. Modelo "1 empresa : N cuentas" para dependencias (3.5).

## Lo que toca zona congelada (para que Maiki lo integre)
- `estimaciones.controller` (guard de finiquito, 1.1) · `bitacora.controller` (flags de vínculo, 2.1) · `schema.sql`
  (columna/tabla de atraso, 1.5; aditivo idempotente) · montaje de routers nuevos en `server.js` (2.2, 2.5).
  Todo lo demás (`minutas`/`garantias`/`alertas`/`estimaciones-ciclo`/`AppShell`/`Sidebar`/páginas) **no es congelado**.

## Esfuerzo total estimado
- Oleada 1: **bajo** (1 tanda). · Oleada 2: **medio** (1-2 tandas). · Oleada 3: **medio-alto** (2 tandas + decisiones).
- Oleada 4 (rediseño): **alto** — ver su plan; se hace **por flujo**, no de un golpe.

> **Recomendación:** arrancar por **Oleada 1** (cierra los bugs que más se notan y los huecos legales claros con
> bajo riesgo), en paralelo decidir con el profe el **alcance del rediseño** (Oleada 4), y dejar Oleada 4 para
> cuando el alcance esté fijado — es la única que, mal hecha, se vuelve costosa.
