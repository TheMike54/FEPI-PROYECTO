# SIGECOP — Plan de correcciones (post-pruebas + respuestas del profe) · v2 · 14 jun 2026

> Integra: los bugs del análisis del Word (`docs/ANALISIS_REVISION_ola.md`) + las decisiones de la hoja de
> validación ya respondida (`docs/Respuestas_Hoja_Validacion_Profe_Lunes.md`, verificada contra los PDF legales).
> Todo LOCAL, sin commit/push; Maiki revisa e integra. Suite objetivo **258/8/0**.
> Zona congelada: auth, G1-G8, cálculo de carátula, `permisos.js`, `server.js`, triggers, `schema.sql` salvo aditivo.

---

## 0. Lo que el profe / la ley DECIDIÓ (resumen accionable)

| Punto | Decisión | ¿Construir? |
|---|---|---|
| A1 reingreso copia carátula | ✔ basta (correcciones de monto → nueva estimación, art. 54) | NO |
| **A2 candado de pago** | ✖ **endurecer a solo 'Autorizada'** (lo manda art. 54) | **SÍ → Oleada PAGO** |
| A3 plazos 6/15/20 | ✔ informativos, no bloquean (art. 133/55) | NO |
| **A4 nota automática de estimación** | ✔ **cablear** (art. 125 fr. II-b presentar / I-b autorizar) | **SÍ → Oleada B** |
| B1 amortización carátula | ✔ proporcional, no editable (art. 143-I) | NO |
| **B2/B3 citas legales** | ✖ **amortización es 143 (no 138); penas = 46 Bis + 86-90 (no 138/139); IVA = 2-XIX RLOPSRM** | **SÍ → Oleada CITAS** |
| B4 2 al millar CMIC | ✎ solo si el contrato lo pacta (parametrizable) | OPCIONAL |
| B5 IVA | ✔ sin IVA en carátula (cita corregida) | solo cita |
| C1 emisor notas consecuencia | ✔ residente (convenio 125-I-e, atraso 46Bis/88/53, sustitución 125-I-g) | NO |
| C2 tipo 'atraso' | ✔ confirmado (art. 88) | NO |
| C3 emisor nota DIFERIDA de hecho | ✎ recomendado: **actor original** (residente solo asienta fecha) | OPCIONAL pequeño |
| D1 fecha de inicio pasada | ✔ NO bloquear (art. 50-I prevé contratos ya iniciados) | NO |
| D2 cédula | ✎ se mantiene (la pidió el profe); cerrar [validar] | NO |
| D3 jurídicos JSONB | ✔ basta Etapa 1 (art. 46) | NO |
| E1 HU-02 fianza PDF | ✎ deseable construir (evidencia art. 48) | OPCIONAL |
| E2 HU-11 minuta↔nota | ✎ construir (E2) o quitar criterio de la ficha | E2 / ficha |
| E3 HU-13 bloqueo 6 días | ✔ no bloquear (= A3, art. 133) | NO |
| E4 periodos tras convenio | ✎ construir regeneración o documentar limitación | OPCIONAL |
| F1 observaciones por sección | ✔ basta (art. 115-X no exige por concepto) | NO |
| F2 fecha recepción | ✔ `enviada_en` cuenta (art. 54 / 133) | NO |

---

## ⚠️ CORRECCIONES DE CITA (hacer pronto — son hechos, no opinión)

1. **Amortización: revertir 138 → 143.** El sweep previo quedó al revés. La amortización PROPORCIONAL de la
   carátula es **art. 143 fr. I RLOPSRM** (+ art. 50 LOPSRM). El **art. 138** es el *importe del anticipo*; su
   **párr. 3** es la *forma de aplicación* (= el plan capturado en el alta). OJO al distinguir los dos contextos:
   - Carátula / descuento proporcional por estimación → **143 fr. I**.
   - Plan de amortización del alta (forma de aplicación) → **138 párr. 3** (ese sí es 138, déjalo).
2. **Penas por atraso / retención: NO son 138/139.** Son **art. 46 Bis LOPSRM + arts. 86-90 RLOPSRM**
   (86 cálculo, 88 retención vía nota de bitácora, 90 tope 20%). Corregir en el reporte HU-19 y donde aparezca.
3. **IVA: la cita es del Reglamento.** *"Monto total ejercido… sin IVA"* = **art. 2 fr. XIX RLOPSRM**;
   *Estimación* = **art. 2 fr. XIV RLOPSRM** (el 2-XIX de la LOPSRM es "Testigo social", no aplica).
4. **Nota de estimación: fracción correcta** = **II-b** (solicitud de aprobación, presentar) y **I-b**
   (autorización). La hoja decía II-a.

---

## OLEADA A — Bugs de frontend seguros (HACER YA)
P2 + P3 del análisis. Riesgo cero; P3 corrige un número mal en el expediente.

**PROMPT:**
```
Soy Maiki. OLEADA A — 2 bugs de frontend SEGUROS (docs/ANALISIS_REVISION_ola.md). LOCAL, sin commit/push. NO toques backend, zona congelada, ni cálculo. Solo frontend. Suite 258/8/0.
1) P2 — Apertura de bitácora: (a) la nota #1 se renderiza DUPLICADA (EmisionNotas.jsx ~288-313 y ~376-386) -> deja una sola. (b) "Ver documento" de la apertura sale "pendiente de firmar" porque DocumentoNota.jsx no recibe los firmantes de la apertura (firmado_en=NULL por diseño) -> pásale los apertura_firmantes para que muestre las firmas reales sin alterar el modelo.
2) P3 — PDF del expediente: "Total neto estimado" doble-cuenta la rechazada + su reingreso (ConsultaExpediente.jsx ~437 suma sin filtrar). Excluye del total las estimaciones 'rechazada' (y/o reemplazadas). Verifica con el dataset de prueba que el total dé el valor correcto.
Actualiza specs (lección 7) y ESTADO_ACTUAL.md. Suite verde. Doc. NO push.
```

## OLEADA CITAS — Corregir las citas legales (importante, bajo riesgo)
Son comentarios, mensajes de error, badges, reportes y docs. Bajo riesgo, pero toca strings que algún spec
asercióna (p. ej. `o2-plan-amortizacion` afirma '138' — vuelve a '143' donde aplique).

**PROMPT:**
```
Soy Maiki. OLEADA CITAS — corregir citas legales según docs/Respuestas_Hoja_Validacion_Profe_Lunes.md (verificado contra PDF). LOCAL, sin commit/push. NO cambies CÁLCULOS ni comportamiento; solo el ARTÍCULO citado (strings/comentarios/docs/specs). Suite 258/8/0.
1) AMORTIZACIÓN: revierte 138 -> 143 fr. I RLOPSRM SOLO en el contexto de la amortización proporcional de la carátula (mensajes/badges en IntegracionEstimacion, estimaciones, docs). PERO conserva 138 (párr. 3) donde se refiere al PLAN DE APLICACIÓN del anticipo capturado en el alta (plan_amortizacion / contratos.controller): ese contexto SÍ es 138 párr. 3. Distingue los dos casos con cuidado.
2) PENAS POR ATRASO / RETENCIÓN: cambia cualquier cita 138/139 (en el reporte HU-19 reportesContrato.js y donde aparezca) a art. 46 Bis LOPSRM + arts. 86-90 RLOPSRM (88 = retención vía nota de bitácora, 90 = tope 20%).
3) IVA: corrige a art. 2 fr. XIX RLOPSRM (Reglamento); Estimación = art. 2 fr. XIV RLOPSRM.
4) NOTA DE ESTIMACIÓN (comentarios/docs preparatorios de Oleada B): fr. II-b (presentar) / I-b (autorizar), no II-a.
5) Actualiza los specs que asercionan el número viejo (o2-plan-amortizacion '138'->'143', etc.) y ESTADO_ACTUAL.md / CLAUDE.md / docs de oleadas afectados.
Verifica que NO quede ninguna cita incorrecta y que la suite quede verde. Doc con la tabla "antes->después" por archivo. NO push.
```

## OLEADA B — Nota automática de estimación (confirmada por el profe)
P4/A4. Tipos `sup_estimaciones` / `res_estimaciones` ya existen en schema. Cablear en `estimaciones-ciclo.controller.js`.

**PROMPT:**
```
Soy Maiki. OLEADA B — nota automática de bitácora ligada a la estimación (art. 125 RLOPSRM, confirmado por el profe). LOCAL, sin commit/push. NO toques G1-G8, permisos.js, server.js, cálculo de carátula. Cableado en estimaciones-ciclo.controller.js (no congelado), patrón insertarNotaAtomica (atómico/diferido).
1) Al PRESENTAR (HU-13, contratista): nota tipo sup_estimaciones, emisor = superintendente, art. 125 fr. II-b ("solicitud de aprobación de estimaciones"): "Solicitud de aprobación de la estimación No. N del periodo P".
2) Al AUTORIZAR (HU-15, residencia): nota tipo res_estimaciones, emisor = residente, art. 125 fr. I-b ("autorización de estimaciones"): "Autorización de la estimación No. N".
Reusa los tipos existentes (sin DDL). Liga a la estimación (estimacion_notas) si aplica. Tests + suite verde. Doc. NO push.
```

## OLEADA PAGO — Endurecer el pago a solo "Autorizada" (confirmado por la ley)
A2. El art. 54 hace de la **autorización** el disparador del pago. Hoy el candado es permisivo
(`['integrada','enviada','autorizada']`). Endurecer a solo el estado autorizado.

**PROMPT:**
```
Soy Maiki. OLEADA PAGO — endurecer el candado de pago a solo lo AUTORIZADO (art. 54 LOPSRM: el pago se dispara con la autorización de la residencia). LOCAL, sin commit/push. Toca el candado de pago en el controller de pagos/estimaciones-ciclo (NO toques permisos.js, server.js, G1-G8, ni el cálculo del importe).
1) El pago solo procede sobre el estado interno 'autorizada' (etiqueta "Autorizada"). Quita 'integrada'/'enviada' del set permitido. Un intento de pagar una "Presentada" o "Integrada" debe responder 409/400 con mensaje claro ("solo se paga una estimación autorizada por la residencia, art. 54").
2) Hay un test que HOY documenta el pago permisivo (deja pagar 'integrada' -> 201). Actualízalo (lección 7) para que ahora afirme el comportamiento estricto (pagar no-autorizada -> rechazo; pagar autorizada -> 201).
Verifica el flujo completo: presenta -> autoriza -> paga OK; presenta -> intentar pagar sin autorizar -> rechazo. Suite verde. Doc. NO push.
```

## OLEADA C — Bug P1 (gate de rol cruzado) — CON LUPA, revisar juntos
Toca `usuarios.routes.js`. NO meter con las demás.

**PROMPT:**
```
Soy Maiki. OLEADA C — bug P1 (selector de sustitución vacío por gate de rol cruzado). LOCAL, sin commit/push. Toca usuarios.routes.js con cuidado: NO cambies permisos.js, server.js, auth ni G1-G8.
Diagnóstico (análisis): la página de roster sirve a dependencia+residente, pero /usuarios/asignables solo permite residente y /usuarios/ solo dependencia; el front traga el 403 con .catch(()=>[]) y el selector queda vacío sin avisar.
Arregla el GATE para que los roles que legítimamente usan la sustitución (según permisos.js de HU-22) lean los asignables, sin abrir el endpoint a roles que no deben. NO silencies el error en el front: si hay 403 real, muestra aviso, no selector vacío.
Smoke: el rol que sustituye ve las cuentas elegibles (incluida una recién creada); un rol sin acceso sigue 403. Tests de control de acceso + suite verde. Doc + di si tocaste algo sensible. NO push.
```
**Integración:** revisar el diff de `usuarios.routes.js` línea por línea antes de pushear.

---

## OPCIONALES (decisión de Maiki / si hay tiempo)
- **C3** emisor de la nota diferida de hecho → cambiar a **actor original** (residente solo asienta fecha). Pequeño, en bitacora.controller (drain).
- **E1** HU-02: subir el PDF de la fianza (evidencia art. 48). Mini-feature de upload (patrón del PDF del alta).
- **E4** periodos tras convenio de plazo: construir regeneración o documentar como limitación de Etapa 1.
- **B4** 2 al millar CMIC: parametrizable, solo si el contrato lo pacta.
- **UX** (P5 selector de periodo, P6 clave en generadores, P7 prellenar jurídicos, P9 quitar buscador, P10 link "Por firmar"): juntar en una Oleada UX tras la demo.

## E2 (no es de Maiki)
- **E2 HU-11**: construir minuta↔nota, o si no, **quitar el criterio de la ficha** para que documento y sistema concuerden.

---

## CERRADO (ya no requiere construir — el profe/ley lo confirmó)
A1, A3, B1, B5(comportamiento), C1, C2, D1, D2, D3, E3, F1, F2. → quitar de la lista de [validar].

## PENDIENTE DE EQUIPOS (lo más importante para la entrega)
- **Generadores y soportes (art. 132 RLOPSRM):** I números generadores, II notas, IV fotos, V importes. E3. Lo más esperado.
- HU-18, HU-20 (E3), HU-11 (E2).

---

## ORDEN SUGERIDO
1. **Oleada A** (bugs P2, P3) — ya.
2. **Oleada CITAS** (138→143, penas, IVA) — pronto; son hechos legales que el profe ya verificó.
3. **Oleada B** (nota de estimación) — confirmada.
4. **Oleada PAGO** (endurecer a autorizada) — confirmada por ley.
5. **Oleada C** (P1) — con lupa.
6. Opcionales / UX — tras la demo.
7. Siempre en paralelo: **E3 generadores** + **decidir la BD (A/B)**.
