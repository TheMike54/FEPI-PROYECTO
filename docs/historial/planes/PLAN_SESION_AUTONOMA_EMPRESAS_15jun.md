# PLAN — Sesión autónoma: empresas + consolidación de requerimientos · 15 jun 2026

> Para Claude Code, sesión AUTÓNOMA (Maiki deja la PC encendida). NO preguntes; cuando haya una decisión,
> tómala con criterio conservador y DOCÚMENTALA. TODO local, sin commit/push. Lee primero
> docs/contexto-claude/ESTADO_ACTUAL.md y mantenlo + las historias sincronizados (regla de CLAUDE.md).
> Suite objetivo **262 passed / 8 skipped / 0 failed** (estado actual). Si baja, revierte la tanda culpable.
> Zona congelada (NO tocar): auth (login/JWT/middleware), G1-G8, cálculo de carátula, permisos.js, server.js,
> triggers, schema.sql salvo aditivo idempotente.

---

## CONTEXTO
El profe insiste (en varios audios) en el tema de EMPRESAS: hoy la empresa se teclea al crear la cuenta, lo que
genera DUPLICIDAD de registros. Quiere que la empresa se registre UNA vez y que después todos (residente,
contratista, supervisión) la SELECCIONEN de un catálogo — nunca re-teclear, imposible duplicar
("si ya existe, toma los datos que ya están"). La Fase 3 previa ya reforzó el de-dup por normalización; falta
llevarlo al modelo de catálogo seleccionable y confirmar el requerimiento completo contra TODOS los audios.

Maiki dejará las transcripciones de los audios del profe en **docs/audios/** (archivos .txt).

---

## FASE 0 — Analizar TODO lo que el profe ha pedido (entender antes de construir)
1. Lee TODAS las transcripciones en docs/audios/*.txt (todas las revisiones, no solo la última).
2. Extrae y consolida en **docs/REQUERIMIENTOS_PROFE_CONSOLIDADO.md**: cada cosa que el profe ha pedido,
   con (a) cita textual breve del audio, (b) a qué HU/módulo aplica, (c) estado actual (hecho / parcial /
   pendiente, verificado contra el código), (d) si es decisión [validar profe]. Es para que nada se pierda.
3. Dedica una sección específica a **EMPRESAS**: junta TODO lo que el profe dijo del tema en todos los audios,
   y redacta el requerimiento claro + una **propuesta de diseño** (abajo) citando sus palabras.

## FASE 1 — Empresas: catálogo seleccionable (eliminar la duplicidad de raíz)
Objetivo: que sea IMPOSIBLE duplicar una empresa. La empresa se registra una vez y se SELECCIONA de un catálogo.
Diseño a implementar (ajústalo si los audios piden algo distinto; documenta lo que decidas):
1. La empresa pasa a ser de PRIMERA CLASE: en el registro de usuario y en el alta de contrato, la empresa se
   ELIGE de un selector del catálogo existente (dropdown con búsqueda). Solo si de verdad no existe, opción
   "registrar nueva empresa"; al registrarla, vuelve a quedar disponible para los demás. NO debe quedar un camino
   de texto libre que cree duplicados silenciosos.
2. Mantén/refuerza el match normalizado de la Fase 3 como segunda red (acentos, mayúsculas, sufijos de razón
   social), pero la barrera principal es la SELECCIÓN del catálogo.
3. (Opcional, si es de bajo riesgo) una vista simple "Empresas" donde se ve el catálogo (solo lectura o con alta),
   coherente con el rol que corresponda — sin tocar permisos.js de forma riesgosa; si requiere permiso nuevo,
   NO lo agregues, anótalo como recomendación.
4. Aprovecha el script consolidar_empresas.js ya existente para fundir duplicados previos (dry-run + apply).
5. NO toques auth core, schema.sql (salvo columna aditiva idempotente si fuera estrictamente necesaria — y avisa),
   ni el cálculo de nada. Conserva data-testid y textos asercionados.
Tests: registrar/asignar la misma empresa desde dos cuentas -> una sola empresa, la segunda la selecciona; no hay
forma de crear un duplicado por variante de texto. Suite verde.

> Si al analizar los audios el rediseño de empresas resulta MÁS GRANDE o ambiguo de lo previsto (p. ej. el profe
> quiere algo estructural que toque zona congelada), NO lo construyas a ciegas: deja la propuesta detallada en el
> doc de Fase 0 y implementa solo la parte segura (selector + de-dup). Marca lo demás para decisión de Maiki.

## FASE 2 — Verificar/pulir el seed para "probar cualquier HU sin capturar"
1. Confirma que `npm run seed:demo` deja datos para CADA HU según el guion de docs/SEED_DEMO_SIGECOP.md; si alguna
   HU no tiene su dato listo, agrégalo al seed (idempotente, sin correr en tests).
2. Asegura que los contratos demo usen el catálogo de empresas de la Fase 1 (misma empresa, sin duplicar) — sirve
   también de demostración viva de que ya no se duplica.
3. (Opcional, solo si es trivial y seguro) documenta cómo se podría sembrar/limpiar por módulo; NO construyas una
   feature nueva de UI para esto salvo que sea muy simple.

## CIERRE
- Corre la suite completa. Debe quedar verde (>=262/8/0). Documenta cada cambio y cada decisión que tomaste.
- Actualiza ESTADO_ACTUAL.md y las historias afectadas (HU-23 empresas).
- Entrega docs/REPORTE_SESION_AUTONOMA_EMPRESAS.md con: qué entendiste de los audios, el diseño de empresas que
  implementaste y por qué, qué dejaste para decisión de Maiki, y el estado de la suite.
- TODO sin commit/push. Maiki revisa el diff e integra.

---

## Lo que NO entra en esta sesión (no lo toques)
- Las 2 decisiones [validar profe] (proporcionalidad estricta de amortización; reglas finas de normalización) — son del profe.
- Generadores/soportes (E3) y apertura narrativa (E2) — llegan por PR de los equipos.
- La decisión de la BD de Render (A/B) — es de Maiki.
