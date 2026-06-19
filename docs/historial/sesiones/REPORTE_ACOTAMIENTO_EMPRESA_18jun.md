# Reporte — Encendido del acotamiento por empresa (JWT + listarContratos)

**Fecha:** 18-jun-2026 · **Autor:** Code (sesión dedicada, local sin push) · **Para revisión de:** Maiki (TheMike54)
**Alcance:** alimentar el acotamiento por empresa que estaba **dormido** en `lib/acceso.js`, firmando `empresa_id`
en el JWT y exponiendo `dependencia_empresa_id` en los SELECT de **lista** (`listarContratos` + `portafolio`).
**Resultado:** ✅ HECHO y verificado. **NO se revirtió.** **NO push.**

---

## 1. Punto de control (revert de un golpe si el login se rompe)

- **Commit base:** `864564da84c4bc7606abbc29f46f25f66677f8c9`.
- **Backup de los archivos tocados (copia cruda):** `/tmp/acotamiento-bak-864564d/` (ruta también en
  `/tmp/acotamiento-bak-path.txt`) — contiene `auth.controller.js`, `auth.middleware.js`,
  `contratos.controller.js`, `portafolio.controller.js`.
- **Revertir TODO:** `cp /tmp/acotamiento-bak-864564d/*.js` a sus rutas + `docker restart sigecop_backend`.
- No hizo falta usarlo: los 5 roles inician sesión y la suite quedó verde.

## 2. Estado del JWT — ANTES vs DESPUÉS

| | Payload firmado en `jwt.sign(...)` | Validación / expiración | Respuesta `user:` |
|---|---|---|---|
| **ANTES** | `{ id, rol, nombre }` | `jwt.verify(token, JWT_SECRET)` · `expiresIn: JWT_EXPIRES_IN \|\| '8h'` | `{ id, nombre, rol }` |
| **DESPUÉS** | `{ id, rol, nombre, empresa_id }` (`empresa_id = usuario.empresa_id ?? null`) | **idéntica** (sin cambio) | **idéntica** `{ id, nombre, rol }` (NO se añadió empresa_id) |

> El único delta del token es **+`empresa_id`** en el payload. La firma, el secreto, la expiración, la
> validación del middleware y la forma de la respuesta de login quedan **intactas**.

## 3. Diff EXACTO (línea por línea, para tu revisión)

### 3.1 `backend/src/controllers/auth.controller.js` (CONGELADO — cambio autorizado)
```diff
   const result = await query(
-    'SELECT id, nombre, email, password_hash, rol, estado FROM usuarios WHERE email = $1 LIMIT 1',
+    // (Acotamiento por empresa) + empresa_id para firmarlo en el JWT (aditivo; no cambia el flujo).
+    'SELECT id, nombre, email, password_hash, rol, estado, empresa_id FROM usuarios WHERE email = $1 LIMIT 1',
     [email]
   );
```
```diff
   const token = jwt.sign(
-    { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
+    // ADITIVO: conserva {id, rol, nombre} idénticos; SOLO añade empresa_id (null si la cuenta no tiene).
+    // Token viejo sin empresa_id → req.user.empresa_id = undefined → comportamiento legado (acotamiento
+    // dormido), retrocompatible. Alimenta el acotamiento por empresa de lib/acceso.js.
+    { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre, empresa_id: usuario.empresa_id ?? null },
     process.env.JWT_SECRET,
     { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
   );
```

### 3.2 `backend/src/middlewares/auth.middleware.js` — **SIN CAMBIOS**
`git diff` **vacío**. No hizo falta tocarlo: `req.user = payload` ya expone el payload completo, así que
`empresa_id` aparece solo en `req.user.empresa_id`. **Tu cambio #2 se cumple sin editar el archivo.**

### 3.3 `backend/src/controllers/contratos.controller.js` → `listarContratos` (CONGELADO — cambio autorizado)
```diff
               ru.nombre AS residente_nombre,
               su.nombre AS superintendente_nombre,
               sv.nombre AS supervision_nombre,
+              du.empresa_id AS dependencia_empresa_id,
               EXISTS (SELECT 1 FROM contrato_documentos d WHERE d.contrato_id = c.id) AS tiene_documento`;
     const joins = `FROM contratos c
          LEFT JOIN usuarios ru ON ru.id = c.residente_id
          LEFT JOIN usuarios su ON su.id = c.superintendente_id
-         LEFT JOIN usuarios sv ON sv.id = c.supervision_id`;
+         LEFT JOIN usuarios sv ON sv.id = c.supervision_id
+         LEFT JOIN usuarios du ON du.id = c.dependencia_id`;
```
```diff
-    return res.status(200).json(result.rows);
+    // (Acotamiento por empresa) post-filtro con la MISMA regla de acceso.js: no cambia la forma de las
+    // filas, solo quita las que el usuario no debe ver. Para operativos es redundante (ya filtró el WHERE)
+    // y para finanzas es transparente (ve todo); SOLO activa para la dependencia ahora que la fila trae
+    // dependencia_empresa_id y el JWT trae empresa_id → cada dependencia ve solo sus contratos.
+    return res.status(200).json(result.rows.filter((row) => esParteOSupervision(u, row)));
```
> `du` empareja a lo más 1 fila (join por la PK `usuarios.id`, `c.dependencia_id` es FK a un usuario rol
> 'dependencia') → **no duplica filas**. La forma de cada fila no cambia (solo +1 columna).

### 3.4 `backend/src/controllers/portafolio.controller.js` → `portafolio` (HU-18; mismo patrón)
```diff
-const { ROLES_VEN_TODO } = require('../lib/acceso');
+const { ROLES_VEN_TODO, esParteOSupervision } = require('../lib/acceso');
```
```diff
               GREATEST(0, CURRENT_DATE - fecha_termino) AS dias_post_termino
+              ,created_by, residente_id, superintendente_id, supervision_id,
+              (SELECT empresa_id FROM usuarios u WHERE u.id = contratos.dependencia_id) AS dependencia_empresa_id
          FROM contratos
```
```diff
-    const contratos = cq.rows;
+    // (Acotamiento por empresa) mismo post-filtro que listarContratos.
+    const contratos = cq.rows.filter((row) => esParteOSupervision(req.user, row));
```

### 3.5 `backend/src/lib/acceso.js` — el CONSUMIDOR (sin cambios en ESTA tarea)
La lógica de empresa ya estaba escrita (sesión BLOQUE 1, también local sin commit). **Corrección a mi
caracterización previa:** el archivo está **sin commitear** (` M` en `git status`); su lógica de empresa
está en el diff vs `HEAD`, no en un commit anterior. La rama relevante:
```js
if (usuario.rol === 'dependencia') {
  if (contrato.dependencia_empresa_id != null && usuario.empresa_id != null) {
    return contrato.dependencia_empresa_id === usuario.empresa_id;  // acota
  }
  return true;  // legado (cualquier lado null) → ve todo. RETROCOMPAT / fail-open.
}
```

## 4. Verificación — LOGIN EN VIVO de los 5 roles

Todos inician sesión, el JWT trae `empresa_id`, y todos cargan sus contratos:

| Rol | `empresa_id` en JWT | Login | Contratos cargados |
|---|---|---|---|
| residente@ | 1 | ✅ | 1429 (1430 con el de prueba) |
| contratista@ | 2 | ✅ | 1368 → 1369 |
| supervision@ | 3 | ✅ | 985 → 986 |
| dependencia@ | 1 | ✅ | 1429 |
| finanzas@ | 1 | ✅ | 1429 → 1430 |

## 5. Verificación — acotamiento positivo + negativo (datos reales)

Se creó en el seed local una **segunda empresa-dependencia** para probar A-no-ve-B:
`empresa "Dependencia Norte"` (id **76**, tipo dependencia) + usuario `dep2@sigecop.test` (id **245**,
empresa 76) + un contrato `NORTE-ACOT-…` (id **3399**, `dependencia_id = 245` → empresa 76).

| Prueba | Esperado | Resultado |
|---|---|---|
| **POSITIVO** — dep2 (empresa Norte, dueña) ve su contrato | SÍ | ✅ SÍ · ve solo **3** (los de su empresa) |
| **NEGATIVO** — dependencia@ (empresa 1, ajena) ve el contrato de Norte | NO | ✅ NO · ve sus **1429** |
| **A-no-ve-B inverso** — dep2 ve los 1429 de empresa 1 | NO | ✅ NO (solo ve 3) |
| residente@ (created_by) ve el de Norte | SÍ (participación) | ✅ SÍ |
| contratista@ (superintendente) | SÍ (participación) | ✅ SÍ |
| supervision@ (supervisión) | SÍ (participación) | ✅ SÍ |
| finanzas@ (transversal) | SÍ (todo) | ✅ SÍ |

> Operativos y finanzas **sin cambio**: el acotamiento por empresa SOLO toca a la dependencia.
> *(Datos de prueba `Dependencia Norte` / `dep2` / contrato 3399 viven en la BD local; tú decides si los
> conservas para tu propia verificación o los purgas.)*

## 6. Suite completa

- **309 passed · 1 failed · 8 skipped (11.5 min).**
- El único `failed` es el **flaky conocido** `detalle-indicador-atraso.spec.js:77` (contención en paralelo);
  **re-corrido aislado pasa 4/4**. NO lo causó este cambio (toca `listarContratos`, no `detalleContrato`).
- **Ningún test de auth/sesión quedó rojo** → no se cumplió la condición de revert.

## 7. Verificación adversarial (UltraCode, 3 escépticos independientes)

Las **3 afirmaciones NO fueron refutadas** (confianza **alta** en las 3):
1. **Token viejo retrocompatible** — `undefined != null` es false → la dependencia con token viejo cae al
   `return true` legado; el middleware no exige `empresa_id`; firma/expiración intactas. ✅
2. **Acotamiento funciona (A-no-ve-B)** — SELECT con `du.empresa_id`, post-filtro con `===` estricto, sin
   duplicar filas; operativos por participación (evaluada ANTES), finanzas todo. ✅
3. **Nada más cambió en auth** — payload solo +`empresa_id`; respuesta `user` sin cambio; middleware con
   `git diff` vacío; sin tocar `estimaciones.controller`/`permisos.js`. ✅

### Hallazgos que debes conocer (no bloquean, son de alcance/decisión)

- 🔴 **El acotamiento es SOLO de LISTA, no integral.** `listarContratos` y `portafolio` ocultan los
  contratos ajenos, pero **los demás gates per-contrato** (`detalleContrato`, bitácora, estimaciones,
  estimaciones-ciclo, convenios, garantías, minutas, finiquito, pagos, programa, roster, trabajos,
  instrucción-pago, tablero, alertas) fetchan el contrato **sin** `dependencia_empresa_id` → la propiedad
  queda `undefined` → la rama empresa se salta → `return true`. **Consecuencia:** una dependencia de empresa
  A no ve el contrato de B **en la lista**, pero **podría abrirlo por id directo** (`GET /api/contratos/:id`
  y subrecursos). Esto está **dentro del alcance que pediste** (solo `listarContratos` + `portafolio`); si
  quieres enforcement integral, es un **follow-on**: añadir `dependencia_empresa_id` a los SELECT de acceso
  de cada gate (o centralizar el fetch de acceso). **Tu decisión** (lo dejo anotado, no lo toco).
- 🟡 **Fail-open en `empresa_id` NULL** (de cualquier lado): una dependencia sin empresa asignada, o un
  contrato con `dependencia_id` NULL, se ve completo. Es la retrocompat intencional, pero el backfill del
  schema solo cubre las cuentas demo `@sigecop.test`; cuentas reales sin empresa quedarían fail-open.
- 🟡 El working tree tiene **13 archivos modificados sin commitear** (no solo los de auth): además de los 4
  de auth/acceso están `server.js`, `convenios.controller.js`, `empresas.controller.js`, `schema.sql` y 4
  de frontend — son de **BLOQUES 1/2** (sesiones previas, también local). Ninguno toca jwt/token/login/
  middleware (verificado), pero conviene aislar el diff de auth al revisar.

## 8. Conclusión

El acotamiento por empresa quedó **encendido** para la dependencia en las vistas de **lista**, de forma
**aditiva y retrocompatible**: token viejo sigue funcionando, los 5 roles entran, A-no-ve-B probado con
datos reales, operativos/finanzas sin cambio, suite verde (309) y verificación adversarial sin refutaciones.
**No se revirtió.** Pendiente de **tu decisión**: si extender el enforcement a los gates per-contrato
(hoy el acotamiento es de presentación en lista). **NO push** — esperas tu revisión del diff. Luego seguimos
con BLOQUES 3 y 4.
