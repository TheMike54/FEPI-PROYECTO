# SIGECOP — Pendientes maestro (post-audios profe)

> **Fecha:** 25-jun-2026 · Preentrega HOY · Entrega final mañana
> **Estado infra:** Render ARRIBA (base de datos pagada, demo recuperada).
> **Cómo evalúa el profe:** historia por historia, **palomita/tache, sin crédito parcial, SOLO en pantalla**. Todo lo que él no ve en pantalla pesa poco; lo que ve mal = tache.
> **Fuente nueva:** 5 audios del 25-jun (sesión 4:15–4:22 PM + audio 9:43 PM). Varios hallazgos NO estaban en la lista vieja de 30 bugs ni en los 13 hallazgos.

**Leyenda:** 🟥 tache en pantalla (máxima prioridad) · 🟧 hecho pero SIN verificar en pantalla · 🟨 implementar (decidido) · 🟦 operativo/no-código · ⬜ menor/en pausa · 📄 entregable académico aparte

---

## P0 — BLOQUEANTES DE DEMO

| ID | Item | Estado | Acción |
|---|---|---|---|
| P0-1 | Base de datos Render caducó (free) | ✅ RESUELTO (pagada) | Hacer `pg_dump` de respaldo YA para no volver a depender del free. |
| P0-2 🟦 | Reparto de cuentas al equipo en Render (sesión única last-login-wins los saca) | NO ejecutado | Ejecutar `REPARTO_EQUIPO_RENDER_25jun.md`: backup → seed 23 cuentas → reasignar SOP-002..006 → verificar. Sin esto, el equipo no prueba. |

---

## P1 — 🟥 TACHES DEL PROFE EN PANTALLA (de los audios de hoy — máxima prioridad)

Esto es lo que más pesa. Casi nada estaba en la lista vieja.

### P1-1 · Carátula de estimación incompleta
- **El profe:** *"es formato de ley, no sean creativos, pongan lo que está actualizando."* Se enojó porque faltaban campos.
- **Falta:** fecha del contrato; importe estimado acumulado anterior; importe acumulado actual; saldo por estimar; **importe de anticipo** (lo que más le enojó); neto a recibir; firmas; el formato textual exacto de la foto.
- **Spec completo:** ver Anexo A.
- **Cita:** sin IVA (RLOPSRM art. 2-XIX, alta certeza). Estimación: contratista presenta → residente autoriza (LOPSRM art. 54).
- **Ref:** fotos en repo `referencia estimaciones`. → **Esto es lo que está corriendo en Code.**

### P1-2 · Generadores de estimación incompletos
- **Falta (a)** resumen / cuadro global por concepto — *"este es el resumen de todo lo que estás estimando, ¿dónde está?"*
- **Falta (b)** generador por concepto: concepto+clave, unidad, **cantidad según proyecto/catálogo**, **ejecutado del período**, **total que se estima**.
- **Falta (c)** **soportes vinculados a CADA generador** (no genéricos), con la nota/evidencia de entrega — *"me faltan los generadores y me faltan los soportes."*
- **Spec:** ver Anexo A.

### P1-3 · Alta de contrato — selector de contraparte (empresa) + persona
- **El profe:** falta la **contraparte**. Hoy seleccionas cuentas del sistema, no personas. Quiere: selector de **empresa (contratista)** → luego selector de **persona** (nombre real, ej. "Ing. Iván…"), **filtrado a esa empresa**, NO cuentas del sistema.
- **Aclaración importante:** NO pide rehacer el schema a N:M. Dijo *"yo no quería la implementación a nivel de la vista, lo que pedía es que estuviera en la base"* + el selector en el alta. **El cierre de esta pantalla = contraparte + selector de persona.**
- **Cita:** modelo empresa→persona ya es decisión confirmada (empresa general, persona dentro). Aquí solo se expone el selector.

### P1-4 · Validación de fechas (rota — la repitió varias veces)
- Dejó meter fecha de inicio inválida (pasado/futuro mal) y **anticipo que no coincide con fianza/póliza**.
- **Acción:** validar inicio coherente; fecha de anticipo ↔ fecha de fianza; plazo = días naturales, fin derivado.
- **Cita:** plazo = días naturales; fin derivado del plazo (alta certeza).

### P1-5 · Unidad obligatoria en conceptos
- Dejó guardar un concepto **sin unidad** — *"todo debe tener unidades, si graba está mal, no debe permitirte."*
- **Acción:** bloquear guardado de concepto sin unidad (400).

### P1-6 · Cantidades negativas
- Dejó pasar cantidad negativa en la matriz del programa en un caso — *"debería no dejar."*
- **Acción:** rechazar negativos en la matriz programa/montos.

### P1-7 · Nota de apertura de bitácora con formato exacto
- **Formato:** No. de bitácora, **fecha y hora**, dependencia, contratista, contrato, objeto/concepto del contrato.
- Además, tras dar de alta el contrato, el sistema debe **pedir/abrir la bitácora** (verificar el flujo de 2 pantallas; el profe dijo que no se lo pidió).
- **Identificación del presentante:** el profe dijo *"es la ley"* — hay que ponerla (la habían quitado).
- **Cita:** bitácora abre antes de la fecha de inicio (LOPSRM art. 52 Ter); 1 emisor por nota por rol, aceptación automática al vencer (RLOPSRM arts. 123–125).

### P1-8 · Scope a un solo contrato
- Al elegir un contrato, **dejar de ver los demás** — *"quedamos que ya solo trabajas con ese contrato."*
- Excepción "por firmar" (cola cross-contract): el profe **aceptó quitarla**.

### P1-9 · Sustitución de roster con pendientes
- (a) Verificar en pantalla que YA bloquea sustituir con notas/firmas pendientes (Maiki cree que sí).
- (b) **Extender a los 3 roles**: residente, superintendente, líder de supervisión.
- (c) **Regla temporal de firmas:** el saliente no firma después de su fecha de baja; el entrante no firma antes de su alta.

---

## P2 — 🟧 HECHO PERO SIN VERIFICAR EN PANTALLA (el profe evalúa pantallas → probar con ojos)

| ID | Item | Nota |
|---|---|---|
| P2-1 | **H6 rediseño de pago** (el grande): contratista sube CFDI/factura/bancarios → finanzas solo revisa+paga + pop-up "¿CFDI y factura coinciden?" + pestaña registro = solo historial | El profe se detuvo MUCHO en esto. Probar end-to-end. |
| P2-2 | **H2 foto obligatoria en avance + descripción por foto** | ⚠️ **CONFLICTO:** en el audio el profe dijo *"foto obligatoria NO va ahí… bórralo"* y *"¿por qué estamos hablando de fotos?"*. Memoria: foto = criterio de equipo, NO obligación legal. **Decidir si se quita la obligatoriedad** antes de la entrega. |
| P2-3 | **H8 curva doble serie** (acumulado total + nuevo desde convenio; histórico congelado al cambiar versión) | Verificar las 2 tarjetas (original congelada + vigente). |
| P2-4 | **H9 frontend** etiqueta "Adicional" visible en versiones del programa | Verificar visible. |
| P2-5 | **#20-front** ocultar botón firmar al vencer plazo | Cosmético (backend ya da 409). |

---

## P3 — 🟨 IMPLEMENTAR (decidido, falta código)

| ID | Item | Estado |
|---|---|---|
| P3-1 | **H13 supervisión externa de otra empresa** — el profe RESOLVIÓ: la supervisión externa SÍ se liga a otra empresa (distinto a los demás roles) | Falta implementar. Hoy `roster.controller.js` REGLA 4 exige misma empresa para todos. |
| P3-2 | **H12 quién ve el portafolio** | Decisión: **DEJAR COMO ESTÁ**, no tocar. (Hay incoherencia matriz/back/front documentada, no se corrige.) |
| P3-3 | **Manejo de sesión** — el profe lo criticó (*"cualquier sesión debería matar la anterior"*) | Es el mismo problema que bloquea al equipo. Atado a P0-2 (reparto de cuentas). |

---

## P4 — 📄 ENTREGABLE ACADÉMICO APARTE (audios 4:22 PM y 9:43 PM — NO es código, fácil de olvidar)

| ID | Item |
|---|---|
| P4-1 | **Análisis de riesgos** de al menos **4 semanas a la fecha** (en teoría 3 meses). |
| P4-2 | **Planes ejecutados ESCRITOS** con registro (el profe insistió: *"escritos no van a contar"* sin registro → necesita evidencia de una **junta con registro**). |
| P4-3 | **Resultados de esos planes por semana** + cómo se ajustó el análisis. |

> ⚠️ Esto puede pesar en la calificación y NO está en ningún doc de código. Prepararlo para mañana.

---

## P5 — ⬜ MENOR / EN PAUSA

| ID | Item | Estado |
|---|---|---|
| P5-1 | **Oleada 6** (auth congelada: #13 aprobarUsuario, #14 email vacío, #15 empresa supervisión tipo, #16 login case-sensitive) | EN PAUSA — zona congelada, requiere OK explícito. Nadie los ve en UI normal. |
| P5-2 | **Opcionales #25–30** | Cosméticos, sin atender. |
| P5-3 🟦 | **Avisar al equipo:** (a) foto de avance ahora obligatoria de verdad *(revisar tras decisión P2-2)*; (b) finanzas no paga sin CFDI del contratista; (c) H3/H4/H10 son falsos positivos, no perder tiempo. | — |

---

## Anexo A — Spec carátula + generadores (lo que va a Code)

**Carátula — encabezado (para imprimir):** No. de contrato · fecha del contrato · contratista · dependencia · No. de estimación/período · porcentaje (qué representa).

**Carátula — bloque de importes (sin creatividad, literal):**
1. Importe del contrato **sin IVA**
2. Importe estimado **acumulado anterior**
3. Importe de **esta** estimación (actual)
4. Importe **acumulado actual** (anterior + actual)
5. **Saldo por estimar** (contrato − acumulado actual)
6. **Importe de anticipo** ← faltaba
7. Amortización del anticipo de esta estimación (proporcional, RLOPSRM art. 143)
8. **Neto a recibir**

**Carátula — firmas:** contratista presenta → residente/supervisión autoriza (LOPSRM art. 54).

**Generadores:**
- **Resumen / cuadro global** por concepto de todo lo estimado.
- **Por concepto:** concepto+clave · unidad · cantidad según proyecto/catálogo · ejecutado del período · total estimado.
- **Soportes vinculados a cada generador** (no genéricos) + nota de entrega.

---

## Sugerencia de batching para esta corrida de Code

Mientras Code hace la **carátula (P1-1)**, son baratos y aislados para meter en el mismo run (no necesitan mockup ni tocan zona congelada):

- **P1-5** unidad obligatoria (validación, 400)
- **P1-6** rechazar negativos
- **P1-4** validación de fechas inicio/anticipo↔fianza
- **P1-8** scope a un solo contrato + quitar cola cross-contract

Necesitan **mockup aprobado primero** (no mandar a ciegas): **P1-2 generadores**, **P1-3 selector contraparte**, **P1-7 nota de apertura** (formato exacto).

Decisiones a cerrar antes de tocar código: **P2-2** (¿se quita foto obligatoria?) y confirmar **P1-9(a)** en pantalla.
