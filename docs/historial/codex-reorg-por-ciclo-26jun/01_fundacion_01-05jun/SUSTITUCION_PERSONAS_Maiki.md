# Sustitución de personas del roster — SIGECOP (Pasada 2/4 de fundación)

**Autor:** Maiki (Fundación) · **Fecha:** 2026-06-04 · **Sobre:** main `ac9ce34` · **Tipo:** entregable interno.

## Fundamento legal (Nivel 1)

**Literal, RLOPSRM art. 125 fr. I inciso g)** (verificado contra `docs/legal/Reg_LOPSRM.pdf` en la pasada 1):
al **residente** le corresponde registrar en la Bitácora *"La **sustitución del superintendente, del anterior
residente y de la supervisión**"*. → La sustitución es un evento legal registrable; **se sustituye, NO se borra**.

- La conservación del histórico (no borrar) se apoya además en la inmutabilidad de la Bitácora (**art. 123 fr. VI RLOPSRM**: "Se prohibirá la modificación de las notas ya firmadas") y en el principio de auditoría del sistema.
- Las obligaciones de tener residencia/superintendencia (**art. 53 LOPSRM**, **RLOPSRM art. 117**) sustentan la continuidad del rol. `[validar con el profe]` la autoridad exacta para autorizar la sustitución (la implementé como dependencia o residente asignado).
- **No soy abogado: lo legal lo confirma el profe.**

## Qué se construyó

1. **Esquema** (`contrato_roster`): histórico/versionado 1:N de `(contrato, rol) → persona`, append-only.
2. **Endpoint + controller** (archivos nuevos, dominio fundación):
   - `GET /api/roster/contrato/:id` — roster **vigente** (derivado) + **histórico** por rol. Acotado por participación.
   - `POST /api/roster/contrato/:id/sustituir` — `{ rol, nuevoUsuarioId, motivo, notaId? }`: cierra la anterior + crea la nueva + sincroniza el caché escalar, en **una transacción**. **Prohibido borrar.**
3. **UI** (`/contratos/roster`): selecciona contrato → ve roster vigente + histórico de quién ocupó cada rol → registra una sustitución. Ruta `SoloRol` (dependencia/residente), **sin tocar `permisos.js` ni `historiasUsuario`** (igual que por-firmar/solicitudes).

## Esquema y decisiones de diseño

```
contrato_roster (
  id, contrato_id → contratos CASCADE, rol CHECK(residente|superintendente|supervision),
  usuario_id → usuarios ON DELETE RESTRICT,     -- NO se borra a la persona: se sustituye
  vigencia_desde DATE, vigencia_hasta DATE,      -- NULL = ACTIVA (vigente)
  motivo, sustituye_a → contrato_roster NO ACTION,  -- cadena de reemplazos
  nota_id → bitacora_notas NO ACTION,            -- nota art. 125 fr. I g (opcional)
  registrado_por → usuarios SET NULL, created_at)
+ UNIQUE INDEX PARCIAL (contrato_id, rol) WHERE vigencia_hasta IS NULL   -- UNA activa por rol
+ trigger sigecop_roster_transicion (BEFORE UPDATE)
```

| Decisión | Por qué |
|---|---|
| **Roster vigente DERIVADO** (fila `vigencia_hasta IS NULL`) + índice único **parcial** | El "vigente" siempre es inequívoco y derivable; el histórico se conserva en las filas cerradas. |
| **`usuario_id` ON DELETE RESTRICT** | Materializa "no se borra a la persona": no puedes eliminar un usuario referenciado en el roster, solo sustituirlo. |
| **Trigger de transición controlada** (espejo de `sigecop_firma_transicion`) | La identidad de una asignación (contrato/rol/persona/inicio/sustituye_a) es **inmutable**; SOLO se permite **cerrarla una vez** (`vigencia_hasta` NULL→fecha). La sustitución crea una fila **nueva**, no reasigna. |
| **`sustituye_a` y `nota_id` = NO ACTION** (no SET NULL) | Un `SET NULL` dispararía un UPDATE que el trigger de inmutabilidad bloquearía; con NO ACTION, en la cascada del contrato ambas filas mueren en el mismo statement y el chequeo diferido pasa. |
| **Caché escalar sincronizado en UN punto** | `contratos.{residente_id,superintendente_id,supervision_id}` los lee `lib/acceso.js` (congelado). El endpoint los actualiza en la **misma transacción** que el roster → el caché **nunca deriva**. |
| **Seed desde los punteros existentes** (idempotente) | La BD de Render (148 contratos con equipo) queda con el roster derivable sin perder datos: una fila activa por puntero, con `NOT EXISTS` guard. |
| **Siembra perezosa en el endpoint** | Un contrato nuevo (post-migración, aún sin fila de roster) se versiona en su primera sustitución (siembra el inicial desde el puntero, luego lo cierra). No toca la lógica del alta. |

## ⭐ Inmutabilidad de la bitácora (requisito crítico) — cómo se garantiza

Las firmas se atan a `usuario_id` (la **cuenta**), no al rol ni al roster:
`bitacora_firmantes.usuario_id`, `bitacora_nota_firmas.usuario_id`, `bitacora_notas.emisor_id`, todas con sus
**triggers de inmutabilidad** (`sigecop_firma_transicion`, `sigecop_nota_firma_inmutable`, `sigecop_nota_inmutable`).

**La sustitución NO toca ninguna tabla `bitacora_*`** — solo `contrato_roster` + el caché escalar de `contratos`.
Por construcción, una firma registrada **antes** de la sustitución conserva su `usuario_id` original; la sustitución
solo cambia quién es la persona **activa** del rol, afectando firmas **futuras**. Verificado con test explícito (T5/T5b).

## Pruebas (local)

**1. Migración idempotente** — `psql --single-transaction -v ON_ERROR_STOP=1` aplicado **2× → exit 0, sin ERROR**.
Seed correcto (148 residente + 148 super + 79 supervisión = **375 activas**), datos intactos, índice único parcial creado.

**2. Test riguroso en psql** (BEGIN…ROLLBACK, datos throwaway) — **10/10 PASS**:

| # | Prueba | Resultado |
|---|---|---|
| T1 | La persona anterior queda en histórico (cerrada, **no borrada**) | **PASS** |
| T2 | La nueva queda vigente; **una sola activa** por rol | **PASS** |
| T3 | Caché `contratos.residente_id` sincronizado | **PASS** |
| T4 | Cadena `sustituye_a` (nueva → anterior) | **PASS** |
| **T5** | **Firma previa conserva al firmante ORIGINAL** | **PASS** |
| T5b | Emisor de la nota sigue siendo el original | **PASS** |
| T6 | **No se puede borrar** una persona del roster (FK RESTRICT) | **PASS** |
| T7 | Trigger bloquea **reasignar** `usuario_id` | **PASS** |
| T8 | Trigger bloquea **re-cerrar** una asignación cerrada | **PASS** |
| T9 | Índice único parcial bloquea **2 activas** del mismo rol | **PASS** |

**3. Smoke del endpoint real** (login dependencia → GET → POST sustituir → GET): HTTP 201; `vigente.residente`
pasó de 1 → 5; el histórico conserva a 1 cerrado; la **firma de la nota previa siguió siendo del user 1**; caché
`contratos.residente_id = 5`. Contrato smoke sembrado y limpiado (cascade).

**4. Suite Playwright completa:** **148 passed · 8 skipped · 0 failed** (4.2 min) → verde, sin regresión, los **8 fixme intactos** (la ruta/página/link nuevos no afectan ningún spec existente). `vite build` limpio (gate CI).

## Runbook de migración

> El esquema es la fuente única: `init.js` aplica `schema.sql` completo en **una transacción** (= `psql --single-transaction`). Re-aplicarlo es idempotente.

**Local (lo probado):**
```bash
docker exec -i sigecop_db pg_dump -U sigecop -d sigecop_db > backup_local_$(date +%Y%m%dT%H%M%S).sql   # opcional
docker exec -i sigecop_db psql -U sigecop -d sigecop_db --single-transaction -v ON_ERROR_STOP=1 < backend/src/db/schema.sql   # 2× = exit 0
docker restart sigecop_backend && curl -s localhost:4000/api/health   # {"status":"ok"}
```

**Render (al integrar a `main`):**
1. **Backup** de la BD de Render (`pg_dump`, DATABASE_URL en `backend/.env`).
2. **Aplicar** `psql "$DATABASE_URL" --single-transaction -v ON_ERROR_STOP=1 -f backend/src/db/schema.sql` → confirmar **exit 0**. El seed puebla el roster desde los punteros existentes (no reescribe datos; `NOT EXISTS` guard).
3. **Verificar código viejo sobre esquema nuevo:** las tablas/endpoints son nuevos; `lib/acceso.js` sigue leyendo el caché escalar (sin cambios). `GET /api/health` + un login real.
4. **Push a `main`** → auto-deploy (`RUN_MIGRATIONS=true` re-aplica idempotente, ya verificado en el paso 2).
5. **Solo tú despliegas.** ⚠️ Nota: tras esta migración, `usuario_id` del roster es **RESTRICT** → no se podrá borrar un usuario referenciado en el roster (en la práctica no hay endpoint que borre usuarios; es la garantía deseada).

## Archivos tocados

| Archivo | Cambio |
|---|---|
| `backend/src/db/schema.sql` | **M** — sección `contrato_roster` (tabla + trigger + seed) |
| `backend/src/controllers/roster.controller.js` | **nuevo** — `leerRoster` + `sustituirPersona` |
| `backend/src/routes/roster.routes.js` | **nuevo** — `/api/roster` (authMiddleware) |
| `backend/server.js` | **M** — montaje del router (2 líneas) |
| `frontend/src/services/api.js` | **M** — `rosterContrato` + `sustituirPersona` |
| `frontend/src/pages/RosterContrato.jsx` | **nuevo** — UI roster + histórico + sustitución |
| `frontend/src/App.jsx` | **M** — import + ruta `SoloRol` `/contratos/roster` |
| `frontend/src/components/layout/Sidebar.jsx` | **M** — link "Sustitución de personas" (dependencia/residente) |

**Pendiente / follow-on:** ligar automáticamente la **nota de bitácora art. 125 fr. I g** a la sustitución
(hoy `nota_id` es opcional, se registra aparte por el residente vía HU-09); spec e2e de la página del roster.
