# PLAN — Sesión autónoma: cerrar HU-02 + HU-11 (E2) + plan de pruebas · 18 jun 2026

> Para Claude Code, sesión AUTÓNOMA (Maiki NO está; Code decide con criterio y documenta). UltraCode disponible:
> úsalo para diseño + verificación adversarial por agentes en las partes de riesgo.
> TODO local, sin commit/push (Maiki revisa el diff e integra al volver). Lee PRIMERO
> docs/contexto-claude/ESTADO_ACTUAL.md y las historias. La parte legal está en docs/legal/ (PDFs) — si hay
> duda de fundamento, consúltala y CITA el artículo exacto; no inventes citas.
> Objetivo: que al volver, Maiki pueda probar CASI TODO el sistema; solo debe faltar la HU de generadores (E3).

---

## REGLAS (no negociables, ni trabajando solo)
- **ZONA CONGELADA intocable** aunque "ayudaría": auth (login/JWT/middleware), G1-G8 del alta, cálculo de carátula,
  permisos.js, server.js (salvo MONTAR rutas nuevas, que sí está permitido), triggers de inmutabilidad. schema.sql
  solo cambios **aditivos idempotentes** (nuevas tablas/columnas), nunca alterar/borrar lo existente.
- Trabaja en **tandas pequeñas**; corre la **suite completa tras cada tanda**; si algo se pone rojo, **revierte esa
  tanda** y anótala. No acumules sin probar.
- Cada validación con su **artículo de ley** o marcada **[validar profe]**. Cita literal desde los PDF de docs/legal/.
- Mantén ESTADO_ACTUAL.md + las historias sincronizados (regla de CLAUDE.md). Siguiente HU libre = **HU-25**
  (HU-24 ya es el finiquito) — corrige ese dato stale en ESTADO_ACTUAL.
- Patrón de montaje sin tocar congelado: ruta nueva en server.js (require + app.use tras cors) + ruta SoloRol en
  App.jsx + link de Sidebar gated por rol (como roster/finiquito). permisos.js NO se toca.
- Si una decisión de producto es ambigua, **elige la opción conservadora**, documéntala y márcala [validar profe];
  NO te bloquees esperando a Maiki.

---

## FASE 1 — HU-02: Fianzas y garantías (cerrar la maqueta)
**Estado hoy:** RegistroFianzas.jsx opera sobre datos dummy en memoria; "Ver PDF" solo guarda el nombre;
`garantia_endosos` existe pero muerta (sin controller). Las garantías SÍ persisten, pero vía el alta HU-01, no por
esta pantalla.
**Construir (backend mínimo + cablear front):**
1. **GET** de `contrato_garantias` por contrato (listar las del contrato).
2. **Persistir** altas/ediciones de garantías desde RegistroFianzas (no solo desde el alta) — POST/PUT contra
   `contrato_garantias`, respetando las validaciones que ya existen (vigencia, tipo, montos).
3. **Endosos:** cablear `garantia_endosos` (la tabla ya existe) — alta/listado de endosos por garantía.
4. **PDF de la póliza:** almacenamiento real del archivo (mismo patrón que el PDF del alta / oficio de convenio —
   reusa el storage existente de contrato_documentos o el que use el alta; NO inventes uno nuevo). Que "Ver PDF"
   abra el archivo real, no solo el nombre.
5. Verifica fundamento: las garantías son evidencia del art. 48 LOPSRM (cumplimiento, anticipo, vicios ocultos);
   cita lo que aplique. Si algo no tiene base, márcalo [validar profe].
**Quita el dummy** de la pantalla; conecta a api.js real. Conserva data-testid. Tests del CRUD de garantías + endosos.

## FASE 2 — HU-11: Minutas, visitas y acuerdos (construir TODO el backend)
**Estado hoy:** todo en useState (dummy); el PDF solo captura el nombre; "adjuntar a nota" es un modal informativo;
`minutas.nota_id` está huérfana; no hay controller/route de minutas.
**Construir:**
1. **Backend de minutas y visitas:** controller + routes (CRUD acotado por participación/rol, patrón de los demás
   controllers). Tablas `minutas` y `visitas` ya existen en schema — úsalas; si falta alguna columna, agrégala
   aditiva.
2. **Vincular minuta/visita a una nota de bitácora:** usar `minutas.nota_id` (hoy huérfana) — al crear/editar una
   minuta se puede ligar a una nota existente; el "adjuntar a nota" deja de ser informativo y persiste el vínculo.
3. **PDF/archivo de la minuta:** almacenamiento real (mismo patrón que arriba), no solo el nombre.
4. **Cablea el front** (la pantalla de minutas) a api.js real; quita el dummy. Conserva data-testid.
5. Respeta la inmutabilidad de la bitácora: vincular una minuta NO modifica la nota firmada; es una relación, no
   una edición de la nota. Cita art. 123 fr. III RLOPSRM si aplica al acotamiento de notas.
Tests del CRUD de minutas/visitas + el vínculo a nota.

## FASE 3 — Seed: que el contrato demo cubra HU-02 y HU-11
1. Agrega al seed (`backend/scripts/seed_demo.sql`) datos para las dos nuevas: garantías con su PDF + un endoso en
   OBRA-2026-DEMO-01; y al menos una minuta y una visita ligadas a una nota de bitácora del demo.
2. Idempotente, al centavo donde aplique, NO corre en tests. Actualiza el guion por-HU de docs/SEED_DEMO_SIGECOP.md.

## FASE 4 — Afinar el finiquito (lo ya construido)
Revisa que el finiquito (HU-24) siga verde tras las fases anteriores. La fórmula base ya está; `ajustes_finales`
parametrizable. NO cambies la fórmula (espera al profe); solo asegúrate de que no se rompió con los datos nuevos.

## FASE 5 — PLAN DE PRUEBAS DETALLADO (entregable final, lo que pidió Maiki)
Genera **docs/GUION_PRUEBA_COMPLETO_18jun.md**: un checklist imprimible, con casillas, para probar TODO lo nuevo y
lo principal, con VALORES EXACTOS leídos del código real (cuentas/empresas del seed, testids/labels reales, montos
que cuadren). Debe incluir:
1. **Cómo preparar el entorno desde cero:** levantar Docker, correr `reset:demo` + `seed:demo`, abrir localhost:5173,
   cuentas demo (todas Sigecop2026!). Explica que el reset limpia la basura E2E y deja solo OBRA-2026-*.
2. **Cómo probar CADA HU con el seed (la parte de los scripts que pidió Maiki):** una tabla por-HU con: qué cuenta,
   qué pantalla/ruta exacta, qué dato ya está cargado, y qué se debe ver. INCLUYE las nuevas (HU-02 fianzas con su
   PDF/endoso, HU-11 minutas/visitas ligadas a nota) y las recién hechas (finiquito HU-24, portafolio HU-18, wizard
   de estimación). Si el flujo de prueba CAMBIÓ respecto al guion anterior (p. ej. ahora se entra por el Ambiente de
   Estimación, o el registro obliga a elegir empresa del catálogo), DÍLO explícitamente.
3. **Pruebas paso a paso con valores exactos** para los flujos nuevos: (a) registrar/editar una garantía + subir PDF +
   endoso; (b) crear una minuta y ligarla a una nota; (c) cerrar un contrato con finiquito y ver el saldo + la nota;
   (d) recorrer el wizard de estimación por bloques. Da el valor exacto de cada campo y el resultado esperado.
4. **Pruebas negativas ⭐** (qué teclear para disparar cada bloqueo) donde aplique a lo nuevo.
5. Una nota clara de lo único que sigue pendiente: el bloque de **generadores (E3)** del wizard.

## CIERRE
- Suite completa verde (>= la marca actual; reporta el número). vite build OK.
- Usa UltraCode para verificación adversarial de FASE 1 y 2 (backend nuevo): un agente intenta refutar que el CRUD
  es correcto, que no se tocó congelado, y que las citas legales son reales.
- Actualiza ESTADO_ACTUAL.md (HU-02 y HU-11 maqueta -> funcional; corrige "siguiente HU = HU-25") y las historias.
- Entrega docs/reportes/REPORTE_SESION_AUTONOMA_E2_18jun.md: qué se construyó, decisiones tomadas (conservadoras),
  [validar profe] pendientes, lo que tocó zona congelada (para revisión de Maiki) y el estado de la suite.
- Separa en el reporte cualquier cambio de schema.sql / server.js / App.jsx para revisión línea por línea.
- NO push.

## NO entra (no lo toques)
- Los AMBIENTES de sistema (PLAN_AMBIENTES_SISTEMA.md) — son reestructuración grande, van con Maiki presente, NO en
  esta sesión.
- La fórmula del finiquito (espera al profe).
- La HU de generadores (E3) — la entrega el equipo.
- permisos.js, auth, cálculo de carátula.
