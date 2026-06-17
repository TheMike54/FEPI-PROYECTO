# SIGECOP — Validaciones pendientes con el profe (todas juntas)

> Preguntas listas para leerle/preguntarle. Cada una: la pregunta · qué hace el sistema hoy · nuestra recomendación.
> Marca: ✔ como está · ✖ cambiar · ✎ ajuste.

---

## 1. Finiquito — fórmula del saldo (la más importante, es nueva)
El finiquito calcula "lo que te debo / lo que me debes" al cerrar el contrato.
**Pregunta:** ¿cuál es exactamente el saldo del finiquito? Es decir: **saldo = total estimado y autorizado − total ya
pagado − amortización del anticipo aún pendiente − retenciones (5 al millar / penas) pendientes**, ¿correcto?
¿Hay algún otro concepto que entre (ej. ajustes, deductivas finales)? ¿El resultado puede ser **a favor del
contratista** (se le paga) **o a favor de la dependencia** (la devuelve)?
*Hoy:* no existe (se va a construir). *Recomendación:* esa fórmula, con saldo a favor o en contra, asentado en una
nota de bitácora de finiquito (LOPSRM art. 64, RLOPSRM art. 170). → [ ]

## 2. Amortización — ¿proporcional estricta o banda editable?
Ya quedó ligada al programa: rechaza 0/0/todo-al-último y que un periodo amortice más de lo que cobra (art. 143-I).
**Pregunta:** ¿la quiere **estrictamente proporcional** (el sistema calcula solo el descuento, no editable), o la
**banda editable** que tenemos (el usuario distribuye libre pero respetando esas reglas)?
*Recomendación:* la banda editable cumple la ley y da flexibilidad. → [ ]

## 3. Amortización — mínimo legal exacto
**Pregunta:** ¿la ley fija un **porcentaje mínimo** a amortizar por estimación, o basta con la regla de
proporcionalidad que ya tenemos? (Usted mencionó que la ley habla de un mínimo.)
*Recomendación:* si hay un mínimo explícito, díganos la cifra y la agregamos como regla. → [ ]

## 4. Empresas — reglas de normalización
El sistema reconoce variantes (mayúsculas, acentos, "SA de CV") como la misma empresa para no duplicar.
**Pregunta:** ¿esa equivalencia debe ser **conservadora** (solo une variantes obvias del mismo nombre) o más
**agresiva** (une nombres parecidos, con riesgo de unir dos empresas distintas)?
*Recomendación:* conservadora (evita unir dos empresas que de verdad son distintas). → [ ]

## 5. Empresas — ¿obligatoria?
Hoy la empresa se elige de un catálogo (ya no se teclea), pero técnicamente una cuenta podría quedar sin empresa.
**Pregunta:** ¿la empresa debe ser **obligatoria** para contratista y supervisión al registrarse?
*Recomendación:* sí, obligatoria para esos roles (de poco sirve el catálogo si alguien queda sin empresa). → [ ]

## 6. Buscador del expediente — qué campos sí aplican
Usted dijo que buscar por **empresa** o **folio** no tiene sentido en el expediente de UN solo contrato.
**Pregunta:** ¿quitamos esos campos del buscador y dejamos solo los que sí aplican (ej. **tipo de documento**,
**periodo**)? ¿O prefiere quitar el buscador por completo de esa vista?
*Recomendación:* dejar solo tipo de documento y periodo. → [ ]

## 7. Reingreso de estimación rechazada — ¿corrige montos?
Hoy el reingreso copia la carátula tal cual (sirve si el rechazo fue por forma).
**Pregunta:** ¿el reingreso debe permitir **corregir cantidades/montos** (si el rechazo fue por números), o el copy
basta y los ajustes van en otra estimación / en el finiquito?
*Recomendación:* el copy basta; los ajustes de monto van en otra estimación o en el finiquito. → [ ]

## 8. Cédula profesional en el alta
Hoy el alta la exige.
**Pregunta:** ¿confirma que debe pedirse? (No tiene base federal explícita; quedó por criterio suyo.) → [ ]

## 9. 2 al millar (CMIC)
**Pregunta:** ¿este contrato lo incluye? Es contractual (sin base en LFD/RLOPSRM); hoy es parametrizable.
*Recomendación:* confirmar si aplica al contrato de la demo. → [ ]

## 10. Oficio de aprobación del convenio — ¿obligatorio para que surta efecto?
Vamos a permitir subir el oficio que aprueba el convenio modificatorio (lo pidió usted).
**Pregunta:** ¿el convenio debe **requerir** ese oficio para considerarse aprobado/efectivo, o se sube como soporte
opcional del expediente?
*Recomendación:* requerirlo para marcarlo "aprobado" (el oficio es el soporte de la aprobación). → [ ]

---

### Ya confirmado por usted (solo para constancia, no preguntar)
Flujo de estimación invertido (art. 54) · amortización proporcional carátula (143-I) · pago estricto a "Autorizada" ·
nota automática de estimación · fecha de inicio pasada SÍ se permite (art. 50-I) · plazos 6/15/20 informativos ·
observaciones por sección · tipo de nota 'atraso'.

---

## Respuestas de trabajo (Code, 17-jun) — defaults adoptados para no bloquear el build

> ⚖️ = sigue necesitando la confirmación del profe (legal/criterio). ✅ = default adoptado y aplicado en el código.
> 🔜 = decidido pero su implementación NO entra en las FASES 0-3 (queda para su fase).

1. **Finiquito — fórmula del saldo.** ⚖️ (FASE 4, aún no se implementa). Fórmula adoptada como base, **verificada
   en la ley**: `saldo = importe_real_ejecutado − ya_pagado − anticipo_no_amortizado − retenciones_pendientes`
   (LOPSRM art. 64: "créditos a favor y en contra… saldo resultante"; RLOPSRM art. 170 fr. VI; art. 171 = a
   favor del contratista o de la dependencia). **Pendiente del profe:** si entran deductivas finales / sobrecosto
   / 5 al millar pendiente. No se construye hasta que conteste.
2. **Amortización proporcional estricta vs banda editable.** ✅ Se mantiene la **banda editable** (cumple art.
   143-I por construcción y da flexibilidad; ya implementada con R2/R3). Confirmable con el profe, sin bloquear.
3. **Amortización — mínimo legal exacto.** ⚖️ Revisado el RLOPSRM: **art. 143 fr. I fija proporcionalidad, no un
   porcentaje mínimo fijo**; el "mínimo" que él recuerda corresponde a esa proporcionalidad (cada estimación
   amortiza su parte; el saldo se salda en la estimación final, art. 143 fr. III-d). Si el profe tiene un
   artículo/cifra concreta, se agrega. No bloquea (la regla actual ya rechaza 0/0/todo-al-último).
4. **Empresas — normalización.** ✅ **Conservadora** (ya implementada: une solo variantes obvias —mayúsculas,
   acentos, puntuación, sufijos de razón social—, no nombres "parecidos"). Default que evita fusionar empresas
   distintas.
5. **Empresa obligatoria para contratista/supervisión.** 🔜 Default **sí** (de poco sirve el catálogo si una
   cuenta queda sin empresa), pero la implementación toca el **registro**, que NO está en FASES 0-3 → queda para
   su fase. No se cambia ahora.
6. **Buscador del expediente.** ✅ **APLICADO en FASE 0B:** se quitan los campos sin sentido para un solo contrato
   (empresa, folio, contratista, objeto) y se deja solo **tipo de documento/bloque** y **periodo** (la recomendación).
7. **Reingreso — ¿corrige montos?** ✅ Se mantiene **el copy basta**; los ajustes de monto van en otra estimación
   o en el finiquito (alineado con la regla de "presentar por estado", FASE 0D). Ya implementado así.
8. **Cédula profesional en el alta.** ⚖️ Se **mantiene como está** (se exige, por criterio del profe; sin base
   federal explícita). No se toca en FASES 0-3. Confirmable.
9. **2 al millar (CMIC).** ✅ Para el contrato de la demo (FASE 3) **no se incluye** por default (es contractual,
   sin base en LFD/RLOPSRM; parametrizable). Si el profe quiere demostrarlo, se activa en un contrato del seed.
10. **Oficio de aprobación del convenio.** ✅ **APLICADO en FASE 0C** reusando `contrato_documentos` (decisión de
    Maiki). Implementación conservadora: el oficio **se sube y se muestra como soporte** en el expediente; el
    convenio se ve "aprobado (con oficio)" cuando existe y "pendiente de oficio" cuando no. La variante más fuerte
    (**requerirlo** para que el convenio surta efecto) tocaría el flujo de aprobación de HU-03 → se deja anotada
    como follow-up `[validar profe]`, no se mete en FASE 0.
