# SIGECOP — Plan tras la revisión del profe · 15 jun 2026

> Derivado del audio de revisión (15-jun). Filtrado a los puntos técnicos accionables.
> Para ejecutar con Claude Code, una FASE a la vez. LOCAL, sin commit/push; Maiki revisa e integra.
> Suite objetivo **258/8/0**. Zona congelada: auth, G1-G8, cálculo de carátula, permisos.js, server.js, triggers,
> schema.sql salvo aditivo. Lee ESTADO_ACTUAL.md primero y manténlo + las historias sincronizados (regla de CLAUDE.md).

---

## Prioridad
1. **FASE 1 — Paquete de datos dummy (seed)** — lo que más pidió el profe, el más fácil, el de mayor impacto para la demo.
2. **FASE 2 — Plan de amortización con reglas de negocio** — su preocupación de fondo; requiere verificar la ley primero.
3. **FASE 3 — Empresas: eliminar la duplicidad** — reforzar el de-duplicado de O3.

Lo demás (apertura narrativa = E2; generadores/evidencia = E3) llega por PR de los equipos.

---

## FASE 1 — Paquete de datos dummy (seed de un contrato demo completo)
**Lo que pidió:** "generen datos dummy... formen su paquete de datos... debes poder probar con los datos que ya tienes"
sin tener que crear un contrato a mano cada vez.

**PROMPT:**
```
Soy Maiki. FASE 1 — SEED de datos demo. Crea un script idempotente que cargue UN contrato demo COMPLETO para poder demostrar cualquier HU sin capturar a mano. LOCAL, sin commit/push. NO toques lógica de producción; es un script de datos.
1) Script en backend/scripts/seed_demo.(sql|js) ejecutable a demanda (p. ej. npm run seed:demo), idempotente (si ya existe el contrato demo, lo recrea limpio o no duplica). Que NO corra automático en los tests (para no romper los conteos), solo cuando se invoca.
2) El contrato demo (folio claro tipo OBRA-2026-DEMO-01, 90 días = 3 periodos, anticipo 30%) debe traer TODO cargado y coherente: catálogo de conceptos que cuadre al monto, programa de obra al 100%, garantías vigentes, datos jurídicos, plan de amortización, roster (residente/contratista/supervisión con sus empresas), bitácora ABIERTA con su apertura firmada, algún avance registrado, y estimaciones en VARIOS estados para demostrar el ciclo: una integrada, una presentada, una autorizada, una pagada, y una rechazada con su reingreso. Números que cuadren (di cuánto debe dar el neto de cada una).
3) Que se pueda cargar también en Render (mismo script, idempotente).
4) Documenta en docs/ cómo correrlo y qué deja cargado, y un "script de prueba" por HU (qué cuenta, qué pantalla, qué se ve) apoyándose en este contrato demo.
Corre la suite (debe seguir 258/8/0, el seed no corre en tests). Reporta. NO push.
```

## FASE 2 — Plan de amortización: reglas de negocio (verificar la ley PRIMERO)
**Lo que dijo:** probó 0/0/todo-al-último y el sistema lo dejó. "No puedes amortizar todo en un solo mes... ¿qué pasa
si en la última estimación no alcanza para pagar esa amortización?" Quiere que el plan funcione "igual que el plan de
obra" (ligado al programa), con un mínimo legal.

> ⚠️ Toca el paso del plan en el alta. Primero VERIFICAR la ley; luego implementar la validación; NO tocar el cálculo
> proporcional de la carátula (143-I, ya correcto). Marcar [validar profe] en la regla exacta.

**PROMPT:**
```
Soy Maiki. FASE 2 — reglas de negocio del PLAN DE AMORTIZACIÓN (feedback del profe). LOCAL, sin commit/push. NO toques el cálculo de la carátula (proporcional, art. 143-I, ya correcto) ni G1-G8 de cálculo; esto es VALIDACIÓN del plan en el alta.
PASO 0 (verificar, no asumir): lee docs/legal/Reg_LOPSRM.pdf y LOPSRM.pdf y extrae el texto literal de art. 143 (amortización), art. 138 (anticipo/forma de aplicación) y cualquier regla sobre MÍNIMO de amortización o prohibición de concentrarla. Reporta qué dice exactamente antes de implementar.
PROBLEMA: hoy el plan de amortización del alta es libre y permite distribuciones degeneradas (0, 0, todo-al-último). El profe lo considera incorrecto: no puedes amortizar en un periodo más de lo que vas a cobrar ese periodo ("no alcanza para pagar"), y debe ligarse al programa de obra.
REGLA PROPUESTA (ajústala a lo que diga la ley del PASO 0; marca [validar profe]):
- Mantener: la suma del plan = monto del anticipo (ya existe).
- Añadir: la amortización asignada a cada periodo NO puede exceder el importe PROGRAMADO de ese periodo (lo que se estima cobrar), porque la amortización se descuenta de la estimación. Esto liga el plan al programa de obra e impide "todo al último".
- Default proporcional (ya existe) que cumple la regla por construcción; al editar, validar la regla con aviso/bloqueo claro citando el artículo.
Implementa la validación en el paso del plan (frontend + barrera server-side aditiva en crearContrato, patrón del cuadre existente). Mensajes citando el artículo correcto. Tests: plan proporcional pasa; 0/0/todo-al-último se RECHAZA; un periodo que excede su programado se RECHAZA. Suite verde. Doc + [validar profe] de la regla. NO push.
```

## FASE 3 — Empresas: eliminar la duplicidad de registros
**Lo que dijo:** si la empresa ya existe, el sistema debe TOMAR la existente, no dar de alta una nueva igual.
"Si es nueva, regístrala; si ya existe, toma los datos que ya están. Ese es el meollo." Hoy ve duplicados.

**PROMPT:**
```
Soy Maiki. FASE 3 — eliminar la DUPLICIDAD de empresas (feedback del profe). LOCAL, sin commit/push. NO toques auth core (login/JWT/middleware), permisos.js, server.js. El registro y el catálogo de empresas (O3) ya existen; hay que reforzar el de-duplicado.
PASO 0 (diagnóstico): revisa cómo se vinculan hoy las empresas (empresas.controller, registro, normalización del índice único) y reproduce POR QUÉ se crean duplicados (¿match exacto vs variantes "Talare"/"talare sa"/"TALARE"? ¿el front no ofrece bien las existentes? ¿se crea una nueva en vez de tomar la existente?). Reporta la causa raíz.
ARREGLO:
- Que al registrar/asignar una empresa, si ya existe (match NORMALIZADO robusto: minúsculas, sin espacios extra, sin acentos, sin sufijos de razón social tipo "SA de CV" si aplica), se TOME la existente — nunca se cree un duplicado.
- UX clara: un SELECTOR de empresas existentes (no texto libre) + opción "registrar nueva" solo si de verdad no existe; al elegir una existente, mostrar "se usará la empresa ya registrada".
- Si ya hay duplicados en la BD, deja un script idempotente opcional para consolidarlos (mapear usuarios al registro canónico) — sin borrar a ciegas, reportando qué uniría.
Tests: registrar la misma empresa con variantes de mayúsculas/espacios -> una sola empresa; el segundo usuario la reutiliza. Suite verde. Doc + [validar profe] de las reglas de normalización. NO push.
```

---

## Ya resuelto (recordatorio — no rehacer)
Fecha de inicio pasada ✔ · curva desde cero ✔ · periodo en la estimación (P5) ✔ · identificador en catálogo ✔ ·
registro de trabajos terminados ✔ · nota automática de estimación ✔ · export Excel ✔.

## De equipos (por PR, no de Maiki)
- Apertura narrativa de bitácora (E2).
- Generadores y soportes + evidencia fotográfica (E3, art. 132).

## Pendiente NO técnico (lo único urgente que no se mueve solo)
- 🟠 Decisión de la BD (A pagar / B restore). El free de Render expira ~25 jun.
