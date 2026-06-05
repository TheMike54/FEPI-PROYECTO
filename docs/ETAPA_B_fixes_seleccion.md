# Etapa B — Fixes "selección vs. texto libre" (de la auditoría)

**Base:** `origin/main = a588f8a` (Etapa A + HU-14 integradas). **Local, sin commit/push.** Solo se tocó lo que necesitan los 2 fixes; **zona congelada intacta** (verificado: no se tocó auth/contratos/estimaciones/usuarios controllers, schema.sql, acceso.js, permisos.js, App.jsx, server.js).

---

## Fix B-1 — HU-02 Sustitución: quita el input numérico de ID

**Archivo:** `frontend/src/pages/RosterContrato.jsx` (solo UI).
**Qué cambió:** se **eliminó el fallback** donde, si la lista de elegibles estaba vacía, se podía **teclear a mano el ID** de la nueva persona (`sust-nuevo-id`). Ahora:
- Con cuentas elegibles → **`<select>` `sust-nuevo`** (selección de cuentas reales del rol correcto).
- Sin cuentas elegibles → **aviso claro** (`sust-sin-elegibles`): *"No hay cuentas disponibles para este rol. Debe registrarse y aprobarse una cuenta con el rol correcto antes de poder sustituir."* — **sin input**.
- Sin rol elegido aún → "Elige primero el rol…".

**No se tocó el backend:** `roster.controller.js` (~114-118) sigue validando existencia + estado activo + rol correcto (art. 125 fr. I g RLOPSRM). Esto solo **endurece la UI** (no permite teclear un ID a ciegas que rompa la trazabilidad).

**Por qué (ley):** auditabilidad/inalterabilidad de los registros (art. 123 fr. VI RLOPSRM): un ID tecleado a mano puede no corresponder a una cuenta real del rol → rompe el enlace auditable. La selección lo evita en origen.

---

## Fix B-2 — HU-09 vincularNota: validación explícita de misma bitácora

**Archivo:** `backend/src/controllers/bitacora.controller.js` (`vincularNota`).
**Qué cambió:** se añadió, tras resolver la apertura, una **validación EXPLÍCITA** de que la nota-respuesta queda en la **misma bitácora** que la nota referenciada, con error claro:
```js
if (apertura.id !== bitacoraId) {
  return 400 'La nota referenciada no pertenece a esta bitácora; no se puede vincular una
              nota fuera de su propio contrato (art. 123 fr. VI RLOPSRM)';
}
```
**Fundamento:** art. 123 fr. VI RLOPSRM (trazabilidad/auditabilidad de las referencias de la bitácora) — **`[validar texto literal con el profe]`**.

> **Nota honesta (importante):** en el diseño actual la respuesta se **deriva** (se crea en `apertura.id`, que ES la bitácora de la nota referenciada), así que este check es **defensivo/tautológico hoy** — su valor es **dejar la invariante VERIFICADA y explícita**, inmune a refactors futuros del flujo de vinculación (que jamás se ligue una nota a un contrato distinto). **La protección efectiva contra "vincular una nota de otro contrato"** ya es el **403 de participación** (`No eres parte firmante de este contrato`), que **no se removió** y ahora está **cubierto por test**. No se cambió ninguna validación existente.

---

## Pruebas (todas verdes; entorno completo, BD provisionada)

- **Suite completa: 173 passed · 8 skipped · 0 failed** (baseline a588f8a = 169 + 4 nuevos). Sin regresión.
- **B-1** (`roster-sustitucion.spec.js`, +3):
  1. con elegibles → `sust-nuevo` (select) visible; **`sust-nuevo-id` ya no existe**; 0 inputs numéricos en el form.
  2. lista vacía (rol 'residente' como residente → listar exige rol dependencia → 403 → vacío) → `sust-sin-elegibles` visible, **sin input**.
  3. el backend **sigue rechazando** un `nuevoUsuarioId` inexistente → **400**.
- **B-2** (`bitacora-v2.spec.js`, +1): el participante (residente) **vincula → 201**; quien **NO es parte** del contrato (dependencia, no firmante) → **403 descriptivo** (`No eres parte…`).

---

## Archivos tocados (4)
| Archivo | Cambio |
|---|---|
| `frontend/src/pages/RosterContrato.jsx` | B-1: select + aviso; elimina `sust-nuevo-id` (input numérico) |
| `backend/src/controllers/bitacora.controller.js` | B-2: check explícito misma-bitácora (+ art. 123 fr. VI) en `vincularNota` |
| `frontend/e2e/roster-sustitucion.spec.js` | +3 tests B-1 |
| `frontend/e2e/bitacora-v2.spec.js` | +1 test B-2 |

**Zona congelada:** intacta. **Núcleo G1-G8 de estimación:** intacto. **Sin cambio de esquema.**

---

## Runbook (Maiki)
1. **Sin migración de esquema.** Integrar el patch / la rama local.
2. **Reiniciar backend** (cambió `bitacora.controller.js`): `docker restart sigecop_backend`. (Render: deploy normal.)
3. **Frontend:** build Vite normal (cambió `RosterContrato.jsx`).
4. **Smoke:**
   - HU-02: como dependencia/residente, en el roster, elegir rol con cuentas → aparece el **select**; elegir un rol sin cuentas → **aviso** (no input). Intentar sustituir con un ID inexistente por API → **400**.
   - HU-09: el participante vincula/responde una nota → OK; un no-participante → **403**.
5. **Rollback:** ambos cambios son aditivos/UI; revertir los 2 archivos no afecta datos.

**Entregables:** este doc + `docs/ETAPA_B_fixes_seleccion.patch` + runbook. **NO push** — tú integras.

## Pendiente
- Etapa C (retención por atraso): tras la reunión del profe (% + regla de disparo, art. 138/139 `[validar]`).
- Si quieres que el **400 explícito de B-2 sea alcanzable** (no solo defensivo), habría que cambiar el contrato de `vincularNota` para aceptar un destino independiente — fuera del alcance de "solo lo que necesitan estos 2 fixes"; lo dejo anotado para decidir.
