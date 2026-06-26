# REPORTE — Aplicación de los 3 bloques FROZEN (Sesiones · Menores · Empresas)

> **Fecha:** 22-jun-2026 · **Modo:** autónomo, LOCAL, sin push · **Orden de seguridad respetado:** Sesiones → Menores → Empresas (por fases).
> **Backup previo:** `pg_dump` completo en scratchpad (`backup_pre_frozen_22jun.sql`, 5797 líneas) antes de empezar.
> **Gate:** `vite build` verde + backend arranca limpio + `/api/health` 200 + smoke en vivo de cada paso.
> **27 archivos modificados + 2 nuevos.** Login verificado intacto tras CADA cambio de auth.

---

## PASO 1 · SESIONES — sesión única (last-login-wins) ✅
**Archivos (frozen):** `schema.sql` (`usuarios.token_version`), `auth.controller.js` (incrementa tv + lo firma), `auth.middleware.js` (async + compara tv → 401 `sesionReemplazada`, retrocompat sin-tv + fail-open), `api.js` (cierra sesión local + vuelve al login).
**Migración viva:** `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;` (idempotente, verificada).
**Smoke en vivo (a/b/c):**
- (a) login normal → 200 ✅
- (b) 2º login de la misma cuenta invalida el 1º → **T1 (viejo) = 401 `sesionReemplazada`**, T2 (nuevo) = 200 ✅
- (c) otro usuario (contratista) = 200 y residente T2 sigue 200 → **no se afecta a terceros** ✅
**Login NO se rompió.** Retrocompat: tokens viejos sin `tv` se aceptan; fail-open si la BD falla.

---

## PASO 2 · MENORES FROZEN — DDL aditivo + foto de avance ✅
**DDL idempotente (schema.sql + vivo, todos verificados `t`):**
- `avance_fotos` (tabla nueva, BYTEA inline, FK `concepto_avance`)
- `estimacion_fotos.contrato_concepto_id` (foto por generador)
- `estimacion_observaciones.estimacion_generador_id` (observación por elemento)
- `contrato_conceptos.es_adicional` (convenios: originales vs adicionales)

**Foto de avance (HU-06) — feature completa:**
- `avance-fotos.controller.js` + `avance-fotos.routes.js` (NUEVOS, clon de estimacion-fotos: JPEG/PNG, 5 MB, acceso por participación, `subido_por` del JWT).
- Montaje en `server.js` (frozen): `/api/avance-fotos`.
- `api.js` + `TrabajosTerminados.jsx`: botón **📷 Foto** por entrada de avance vigente.
**Gate de bitácora en INTEGRACIÓN HU-12** (`estimaciones.controller.js`, frozen): sin bitácora abierta no se integra (409 `requiereBitacora`).
**Smoke en vivo:** subir foto al avance 1985 → **201** (id, image/png, 70 bytes) · listar → 1 · descargar binario → **200, 70 bytes, image/png** (round-trip OK). Residuo de prueba **eliminado** (count 0). Backend arranca limpio, health 200.

---

## PASO 3 · EMPRESAS — modelo invertido, por fases ✅ (con 1 matiz en Fase D)

### Fase A — schema (aditivo + backfill) ✅
`contratos.contratista_empresa_id`, `contratos.supervision_empresa_id`, `contrato_roster.empresa_id` + backfill desde la empresa del usuario asignado.
**Verificado:** 3 columnas creadas; **backfill 24/24 contratos**; usuarios intactos (493); login OK; datos no rotos.

### Fase B — registro invertido ✅
`SolicitudRegistro.jsx` reestructurado: **"1 · Empresa" PRIMERO** (la persona se registra **dentro** de una empresa del padrón) → **"2 · Tus datos (dentro de la empresa)"**. Frontend, **no toca auth**.
**Smoke en vivo:** registrar contratista con empresa del padrón → cuenta creada con `empresa_id=4` (la empresa elegida), estado `pendiente`; verificado por JOIN que **entró DENTRO de la empresa**. Login intacto. Residuo eliminado.

### Fase C — alta de contrato registra la empresa ✅
- `contratos.controller.js` (frozen): persiste `contratista_empresa_id`/`supervision_empresa_id` (del alta o derivados de la empresa base del usuario). INSERT aditivo (21 cols/params).
- `AltaContrato.jsx`: el payload manda la empresa explícita de cada parte (de la persona elegida, modelo 1:1). El alta **ya mostraba** la empresa del contratista/supervisión y el aviso "misma empresa" (supervisión = tercero).
**Smoke:** backend arranca limpio; login OK; contratos lista + detalle 200 (sin regresión).

### Fase D — acceso por empresa (parcial, por seguridad) ⚠️
**Hallazgo:** `acceso.js` **YA acota por empresa** vía **participación** (un no-participante NUNCA ve el contrato → una persona de otra empresa no accede) + dependencia por `dependencia_empresa_id`. El aislamiento por empresa que pide el profe **ya está cubierto**.
- **Hice (seguro, no frozen):** `empresas.controller.js listarPadron` cuenta contratos por la **empresa del CONTRATO** (`contratista_empresa_id`/`supervision_empresa_id`, COALESCE a la derivación por usuario para legados), no por el JOIN del usuario.
- **NO toqué el core de `acceso.js`** (participación): cambiarlo arriesga romper el control de acceso sin beneficio (la participación ya aísla por empresa). **Decisión consistente con tu freno "PÁRATE si acceso se rompe".**
**Smoke:** login residente/dependencia/contratista OK; padrón (197 empresas) cuenta por empresa del contrato; contratista acotado por participación.

---

## Verificación global
- **Login verificado intacto tras CADA paso** (lo más crítico) — nunca se rompió.
- **`vite build` VERDE** en cada bloque. Backend arranca **limpio** (logs sin errores), `/api/health` 200.
- **DDL idempotente** aplicado en vivo y plegado a `schema.sql` (from-zero seguirá funcionando).
- **Sin residuo de datos:** usuarios de prueba y foto de prueba eliminados; los logins de smoke solo incrementaron `token_version` de las cuentas demo (comportamiento esperado, no residuo).
- **NO push.** Local. Backup disponible por si Maiki quiere revertir empresas.

## Pendiente / decisión para Maiki
1. **Fase D acceso.js:** ¿quieres además **endurecer** la participación con un match de empresa (defensa en profundidad)? Lo dejé fuera porque puede **romper acceso** y la participación ya aísla. Si lo quieres, dime el comportamiento exacto y lo hago con tu OK.
2. **Fase C "elige empresa" independiente:** con el modelo 1:1 persona→empresa, elegir la persona ES elegir la empresa (mostrada + persistida). Un selector de empresa **independiente de la persona** requeriría N:M (persona en varias empresas) — cambio mayor; lo dejo a tu decisión.
3. **`contratos.controller` detalle:** sigue derivando la empresa por JOIN del usuario (backfill = mismo valor). Si quieres que el detalle lea la **columna del contrato**, es un cambio chico en zona congelada — dame el OK.
