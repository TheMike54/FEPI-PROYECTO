# Tabla maestra — `[validar profe]` resueltos a CERO (BLOQUE 3a, 18-jun)

> **Regla de resolución:** cada marca se cierra con (a) **cita legal** —reusando SOLO artículos ya
> verificados/presentes en el repo (sesiones previas hicieron el `pdftotext`); NUNCA se inventa una cita— o
> (b) **criterio del equipo (default conservador)** documentado, cuando no hay base literal. Lo legal lo
> confirma el profe; esto fija el comportamiento por defecto para no dejar marcas sueltas.
> Fuente base: `docs/VALIDACIONES_PROFE_pendientes.md` (defaults adoptados 17-jun) + citas ya embebidas en el
> código + memoria de validación legal (lunes / O-PROFE).
>
> **✓ Citas verificadas contra el texto LITERAL de la ley (18-jun)** con un workflow de 4 agentes sobre
> `docs/legal/lopsrm_utf8.txt`, `docs/legal/reg_utf8.txt` y `docs/legal/LFD.pdf`. La verificación corrigió
> varias etiquetas previas (ver ⚠️ en la tabla): pena de atraso = 46 Bis + **86-88** (no "86-90" ni "138/139");
> art. 46 fr. I = identificación de las partes (no presupuesto, que es fr. III); art. 50 fr. IV = autorización
> escrita **solo si el anticipo supera 30%** (tope 30% = fr. II); art. 123 fr. VI = inmutabilidad (no folios);
> art. 125 fr. I g = obliga a *registrar* la sustitución (la regla "no cambia empresa" es criterio del equipo).

## A) Resueltas con CITA legal (artículo ya presente y verificado en el repo)

| # | Punto / marca | Decisión adoptada | Fundamento (cita) |
|---|---|---|---|
| A1 | Flujo de estimación (integra→presenta→autoriza→paga) | Invertido: contratista presenta, residencia autoriza, finanzas paga lo autorizado | **art. 54 LOPSRM** |
| A2 | Amortización del anticipo en la carátula | Proporcional al programa (rechaza 0/0/todo-al-último y amortizar más de lo que cobra); el saldo faltante se liquida en la estimación final | **art. 143 fr. I y fr. III-d RLOPSRM** ✓verificado. (El *programa de aplicación* del anticipo = art. 138 RLOPSRM) |
| A3 | Anticipo: % y exigencia de autorización escrita | Parametrizable (no hardcode 30); el PDF de autorización se exige sobre el umbral | Tope 30% = **art. 50 fr. II LOPSRM**; autorización escrita **cuando supera 30%** = **art. 50 fr. IV LOPSRM** ✓verificado |
| A4 | Fecha de inicio en el pasado | Permitida (no hay prohibición; la fecha de inicio se pacta) | **art. 50 fr. I LOPSRM** menciona la fecha de inicio pactada; la permisividad es por ausencia de prohibición → *criterio del equipo* |
| A5 | Pena convencional por atraso (tasa 0.10% ejemplo) | Parametrizable; renglón previsto en la carátula (Etapa C, en $0 hasta fijar %) | **art. 46 Bis LOPSRM** (pena por atraso) + **arts. 86–88 RLOPSRM** (mecánica de cálculo) + **art. 90 RLOPSRM** (tope 20%/10%) + **art. 46 fr. X LOPSRM** (procedimiento en el contrato). ⚠️ *Corrección:* NO "86-90" (89 = garantías) ni "138/139" |
| A6 | Retención 5 al millar | Aplicada en la carátula | **art. 191 LFD** ✓verificado literal ("cinco al millar sobre el importe de cada estimación") |
| A7 | Exceso de estimación sobre lo contratado | Bloqueo duro (409), no aviso | **art. 118 RLOPSRM** ✓verificado |
| A8 | Pago solo de estimación 'autorizada' | Estricto (rechaza integrada/presentada) | **art. 54 LOPSRM** ✓verificado (pago en ≤20 días desde autorización de la residencia) |
| A9 | Fecha de pago no anterior a la integración | Rechazo (400); cálculo del monto intacto | **art. 54 LOPSRM** (derivado) |
| A10 | Notas automáticas en bitácora (apertura/avance/convenio/sustitución) | Se asientan append-only, numeradas en serie y fechadas en orden, inmutables | **art. 123 RLOPSRM** ✓verificado: apertura = **fr. III**; datos de cada nota = **fr. II**; numeración/orden = **fr. V**; inmutabilidad = **fr. VI**; foliado = **fr. I**; ratificación de minutas/oficios = **fr. X**. ⚠️ *Corrección:* fr. VI es inmutabilidad (no folios), fr. X no regula "visitas" |
| A11 | Emisor de notas de CONSECUENCIA (atraso, convenio, sustitución) | El **residente** del contrato (la residencia revisa/aprueba; le toca registrar en bitácora) | **art. 53 LOPSRM** (la residencia es responsable de supervisión/control y aprobación de estimaciones) ✓ + **art. 125 fr. I g RLOPSRM** (al residente le toca registrar la sustitución) ✓verificado |
| A12 | Finiquito — fórmula del saldo | `saldo = Σ neto(autorizada\|pagada) − pagos − anticipo no amortizado − ajustes_finales`; a favor de cualquiera de las partes; asentado en nota | **art. 64 LOPSRM** (créditos a favor y en contra, saldo resultante) ✓ + **arts. 168** (finiquito + acta de recepción), **170** (contenido mínimo), **171** (saldo a favor de cualquiera), **172** (acta de extinción) **RLOPSRM** ✓verificado |
| A13 | IVA fuera del "monto ejercido" | El avance financiero/monto se mide sin IVA | **art. 2 fr. XIX RLOPSRM** ✓verificado literal ("…sin considerar el impuesto al valor agregado") |
| A14 | Fianza de cumplimiento exigible para el pago | Exigible si hay garantía registrada del contrato | **art. 48 fr. II LOPSRM** ✓verificado (fr. II = cumplimiento) |
| A15 | Suficiencia presupuestal antes de la instrucción de pago | Verificada server-side (FOR UPDATE) | **art. 24 LOPSRM** ✓verificado (suficiencia presupuestaria previa) |
| A16 | Jurídicos mínimos de formalización (identificación de partes + personalidad del contratista) | Obligatorios | Identificación de las partes = **art. 46 fr. I LOPSRM**; personalidad del contratista = **art. 46 fr. IV LOPSRM** (+ art. 61 fr. VI RLOPSRM, acreditación en el acto); autorización del presupuesto = **art. 46 fr. III**. ⚠️ *Corrección:* fr. I ≠ presupuesto. Firmante/cargo y cédula = criterio de formalización (ver B1) |
| A17 | Padrón de empresas administrado por la Dependencia; privadas aparte | Dependencia valida/inscribe; contratista/supervisión proponen; SFP administra | **art. 43 RLOPSRM** ✓verificado (los contratistas solicitan inscripción a las dependencias, que validan; SFP diseña/administra) + **art. 74 Bis LOPSRM** (registro electrónico de personas físicas/morales en la Plataforma) |
| A18 | Plazo de presentación que NO se reinicia tras reingreso | El reingreso no reinicia el plazo del art. 54 | **art. 54 LOPSRM** ✓verificado |

## B) Resueltas con CRITERIO DEL EQUIPO (default conservador — sin base legal literal; el profe puede ajustar)

| # | Punto / marca | Decisión adoptada (default) | Justificación |
|---|---|---|---|
| B1 | Cédula profesional del responsable al alta | **Se mantiene exigida** (criterio de la Fundación) | Sin base federal LOPSRM/RLOPSRM explícita; decisión del profe. Conservador = no relajar un requisito ya pedido |
| B2 | 2 al millar (CMIC) | **Parametrizable; default NO aplica** al contrato | Contractual/aportación CMIC, sin base LFD/RLOPSRM. Se activa por contrato si el profe lo pide |
| B3 | Normalización de empresas (sufijos/variantes) | **Conservadora** (une solo variantes obvias: mayúsculas/acentos/puntuación/sufijos de razón social) | Evita fusionar empresas realmente distintas |
| B4 | Umbrales del semáforo de cartera (portafolio) | **Criterio del equipo** (puntos de corte provisionales, parametrizables) | El número de corte es interpretativo; ya fijado |
| B5 | Convenio que excede 25% del monto/plazo | **AVISA** (no bloquea) | Default ya fijado; el guardrail informa, no impide |
| B6 | Dependencia en vistas ejecutivas de cartera | **Solo-consulta** | Default ya fijado; la dependencia ve, no opera el contrato ajeno |
| B7 | Regla de disparo del atraso (global vs concepto, bruto vs neto) | **Por concepto, en unidades** (programado al periodo − ejecutado), sin umbral | Conservador (O5); medible y no penaliza lo no medible (programado=0 → no atraso) |
| B8 | `ajustes_finales` del finiquito (deductivas/sobrecosto/5-al-millar pendiente) | **Parametrizable, default 0**; no se hardcodea | Hasta que el profe confirme qué conceptos entran |
| B9 | Reingreso de estimación rechazada | **El copy basta** (no recaptura montos; los ajustes van en otra estimación o el finiquito) | Alineado a "presentar por estado"; menos superficie de error |
| B10 | "Nota de atención a observaciones" del reingreso | **Control no persistido** en Etapa 1 (persistirla requiere DDL) → diferido | Para Maiki: si debe registrarse, es DDL nueva |
| B11 | Emisor de la nota de AVANCE/trabajos | **Quien registra (el contratista)** | La apertura la asienta el residente (art. 123 fr. III); el avance lo registra el contratista, identificado en los datos de la nota (**art. 123 fr. II**). Criterio del equipo |
| B12 | Login: email case-insensitive | **Sí** (se normaliza a minúsculas en registro) | Evita fallos de acceso por mayúsculas; criterio del equipo |
| B13 | Finanzas: reglas de acceso extra | **No** (transversal por flujo) | Autoridad pagadora; ya cubierto por el control de acceso |
| B14 | Endoso de fianza registrado "suelto" | **Mejora opcional** (no bloquea) | Hoy se registra; vincularlo es mejora futura |
| B15 | Roster: autoridad que sustituye personas | **Dependencia o residente** | Autoridad contratante/seguimiento; al residente le toca registrar la sustitución en bitácora (**art. 125 fr. I g RLOPSRM**); quién la *autoriza* = criterio del equipo |
| B16 | Plazo de pago anclado en la nota de autorización | **Derivado** de `estimacion_notas.fecha` (sin columna nueva) | Conservador; el plazo es art. 54, la fecha sale de la nota |
| B17 | Join contrato→presupuesto por texto (sin FK) | **Deuda técnica conocida** (no legal) | Se documenta como limitación, no como duda legal |
| B18 | `ejercicio` derivado de `fecha_inicio` | **Criterio** (no existe columna de ejercicio) | Año de inicio como ejercicio presupuestal |
| B19 | Empresa OBLIGATORIA para contratista/supervisión al registrarse | **Sí** (se implementa en BLOQUE 3b) | De poco sirve el catálogo si una cuenta queda sin empresa |
| B20 | Sustitución de personas NO cambia la empresa del contrato (BLOQUE 3c) | **Guard: el sustituto debe ser de la misma empresa que la persona saliente** | Criterio del equipo (default conservador): el contrato se liga a la EMPRESA, no a la persona; art. 125 fr. I g solo obliga a *registrar* la sustitución en bitácora — la regla de "no cambiar la empresa" no es literal de ley |

> **Notas:** B5/B6/B4 son las tres ya fijadas que el plan recuerda. A11/B11 distinguen el emisor según el
> tipo de nota (consecuencia = residente; avance = quien registra). El "matiz fr. X vs fr. II del art. 123"
> y "fr. V/VI orden de folio" quedan bajo A10 (todos son del art. 123). La cédula (B1) y el 2 al millar (B2)
> siguen abiertos para el profe pero con default aplicado: ya no son marcas, son criterios.
