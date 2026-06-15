# Integración HU-16 — Reingreso de estimación tras rechazo (14-jun-2026)

**Rama:** `integracion-hu16` (sobre `main` = `2a67aef`). **PR:** `origin/feat/e3-hu-16` (Equipo 3, 1 commit
`18e7ddb`). **Estado:** integrado en local, **SIN push**. **DDL:** **ninguno** (ver §2). **Zona congelada:**
**no se toca**.

HU-16 conecta `ReingresoEstimacion.jsx` (antes maqueta) al backend real: el contratista reingresa una
estimación **rechazada** (HU-15) creando una **nueva versión** como bloque independiente, ligada por
`reemplaza_a`, sin reiniciar el plazo del art. 54.

---

## 1. Rebase / reconciliación — N/A (ya rebasado)

`feat/e3-hu-16` ramificó **del `main` actual** (`2a67aef`): ya contiene HU-15 reconciliado, O7, O8, HU-19 y
la limpieza. **No asume flujo ni etiquetas viejas.** El reingreso opera correctamente sobre el estado
interno **`'rechazada'`** (producido por `rechazarEstimacion` de HU-15) y crea la nueva en `'integrada'`.
Merge **limpio, 0 conflictos**.

## 2. Zona congelada y DDL

- **No toca** `auth` / `permisos.js` / `server.js` / `estimaciones.controller.js` (core de carátula) /
  triggers / `schema.sql`. El endpoint vive en `estimaciones-ciclo.controller.js` (dominio de E3, **no
  congelado**). Cambios: ese controller (+128), su router (+8), `frontend/src/services/api.js` (+5),
  `ReingresoEstimacion.jsx` (reescrito), spec, y **los docs** (ver §6).
- **SIN DDL.** Reusa la columna **`estimaciones.reemplaza_a`** (self-FK `ON DELETE SET NULL`) y el
  **`UNIQUE (reemplaza_a)`** (`uq_estimaciones_reemplaza_a`) + índice, que **ya existen** en `schema.sql`
  (los dejó preparados SOPORTE_EQUIPOS). **No hay migración en Render.**

## 3. Seguridad — verificada con smoke de API (16/16 PASS)

Como el `smoke-hu16.sh` que referencia el spec **no venía en el PR** (referencia colgante, ver §7), corrí un
smoke manual contra el backend del ciclo completo `integrar → presentar → turnar → rechazar → reingresar`:

| Candado | Resultado |
|---|---|
| **Identidad:** solo el superintendente del contrato reingresa | residente → **403** ✓; superintendente → **201** ✓ |
| **Máquina de estados:** solo `'rechazada'` | reingresar una `'integrada'` → **409** ✓ |
| **Vinculación:** nueva ligada a la rechazada | `nueva.reemplaza_a == rechazada` ✓; estado `'integrada'`; `numero` propio (MAX+1) ✓ |
| **Unicidad 1→1** | 2º reingreso de la misma rechazada → **409** (UNIQUE + pre-chequeo + advisory lock) ✓ |
| **Gate de control** | sin `confirmacion:true` → **400** ✓ |
| **Carátula NO recalculada** | copia el snapshot (subtotal 80000) de la rechazada, no re-deriva dinero ✓ |
| **Trazabilidad** | el historial expone `reemplaza_a` de la nueva ✓ |

Detalles correctos: atómico (BEGIN/COMMIT), advisory lock por contrato (espejo de HU-12), copia también los
**números generadores** (snapshots `pu_snapshot`/`cantidad_anterior_acum`), `enviada_en=NULL` (no reinicia
art. 54). El INSERT no dispara el trigger de inmutabilidad (es BEFORE UPDATE).

## 4. UI guinda

`ReingresoEstimacion.jsx` usa los componentes del sistema de diseño: `Boton`, `Tabla` (de
`components/ui/`), `HeaderVista`, `BannerContexto`, `SeccionCriterios`. **Sin dummy** (cableado real a
`api.reingresarEstimacion`, `historialEstimaciones`, `revisionEstimacion`; el `import` de `dummy.js` se quitó).

## 5. Pruebas

- **Smoke de API HU-16:** **16/16 PASS** (ciclo + candados).
- **`hu-16-reingreso.spec.js`:** **6/6** ✓ (reescrito al patrón real: access-control + selector; el ciclo
  funcional se valida por smoke, como hu-15). Re-etiquetado aplicado (lección 7): ya no asercióna el banner/
  trazabilidad dummy viejos.
- **Suite completa:** **258 passed · 8 skipped · 0 failed** ✅ (266 total, conteo intacto).

## 6. Docs — E3 siguió la disciplina ✅

El PR **actualizó** `docs/contexto-claude/ESTADO_ACTUAL.md` (HU-16 ❌→✅; %funcional ~21→~22 / ~85%; fila de
reingreso en la máquina de estados; quitada de la lista de maquetas) y
`docs/analisis-y-diseno/Historias_Usuario_ACTUALIZADAS_12jun.md` (historia HU-16 reescrita al comportamiento
real + fundamento legal + pendientes). Coherentes con el código integrado. Esto es exactamente la regla de
`CLAUDE.md` (leer/actualizar ESTADO_ACTUAL) — el equipo la aplicó.

## 7. Para tu decisión (Maiki / profe)

- **`[validar profe / diseño]` Semántica del reingreso (lo más importante):** hoy **copia verbatim** la
  carátula y los generadores de la rechazada → la nueva versión es financieramente IDÉNTICA y es inmutable.
  Sirve cuando el rechazo fue por temas NO de montos (documentación), pero **no permite re-capturar
  cantidades corregidas**. E3 lo flaggeó: ¿el reingreso debe permitir **re-integrar** (vía HU-12) con montos
  corregidos, o el copy verbatim es suficiente para Etapa 1? Decisión de producto/legal.
- **`[validar / PARA MAIKI]` Nota de atención a observaciones:** hoy es solo un gate booleano (`confirmacion`)
  que **NO se persiste** (no hay columna; el esquema es de Fundación). Si debe quedar registrada → DDL aditivo.
- **`[validar profe]` Plazo art. 54:** "no reiniciar el plazo" se implementa derivando el día N desde la
  `enviada_en` de la rechazada (sin contador persistido). Confirmar la semántica legal exacta.
- **Nit:** el comentario del spec referencia `frontend/e2e/smoke-hu16.sh` que **no está en el repo**. Sugerir
  a E3 incluirlo o quitar la referencia. (No bloquea: el smoke lo reproduje a mano, 16/16.)

## 8. Runbook de despliegue (Maiki)

- **SIN DDL → sin migración.** Solo código (backend ciclo controller/route + frontend). En Render:
  auto-deploy desde `main` reconstruye backend y frontend; **no se toca la BD**.
- **Local:** el backend **no auto-recarga** → `docker restart sigecop_backend` tras integrar (necesario para
  cargar el endpoint `reingresar`).
- Smoke post-deploy: rechazar una estimación (HU-15) y reingresarla como superintendente; verificar 201 +
  trazabilidad `reemplaza_a` en el historial; 2º intento → 409.

**Estado:** local, sin push. Rama `integracion-hu16`.
