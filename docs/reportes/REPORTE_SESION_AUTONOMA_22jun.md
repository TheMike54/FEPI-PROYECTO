# REPORTE — Sesión autónoma de ejecución (PLAN_PREENTREGA_JUEVES)

> **Fecha:** 22-jun-2026 · **Modo:** autónomo, LOCAL, sin push · **Gate:** `vite build` verde (CI) + smoke en vivo (stack docker arriba).
> **Regla respetada:** todo lo aplicado es **zona NO congelada**. Lo congelado (schema, auth, server.js, contratos/estimaciones.controller, App.jsx, permisos.js, acceso.js, SesionContext) está **preparado y esperando tu OK** (§3).
> **18 archivos de código modificados · 0 archivos congelados tocados · build verde en cada bloque.**

---

## 1. Chequeo legal del IVA (lo pediste antes de la carátula)
- **Art. 2 fr. XIX RLOPSRM:** *"Monto total ejercido… **sin considerar el impuesto al valor agregado**"* → se refiere a los **montos** (del contrato/ejercido), **no** a la carátula de cobro.
- El reglamento expresa **todos los importes de obra SIN IVA** (líneas 140, 3490, 5858). El IVA es **fiscal** (Ley del IVA, en la factura/CFDI), **no lo exige LOPSRM/RLOPSRM en la carátula de estimación**.
- **Veredicto:** la ley **no exige IVA** en la carátula → indistinto/sin-IVA. Por tu regla, hice la **carátula SIN IVA** siguiendo el resto del formato GACM. **No me paré.**

---

## 2. HECHO (aplicado, build verde, smoke OK)

### Bloque 1 — Quick wins (zona NO congelada)
| Cambio | Archivos | Estado |
|---|---|---|
| **Reingreso HU-16 desconectado de la UI** (sin borrar código ni tocar BD, como pediste) | `PestanasCiclo.jsx` (pestaña fuera), `Sidebar.jsx` (item fuera), `EnvioEstimacion.jsx` (rechazo→integrar HU-12), `RevisionEstimacion.jsx` (copy), `CicloVidaContrato.jsx` (paso 10→HU-12) | ✅ |
| **Portafolio: clic en semáforo → expediente** | `PortafolioEjecutivo.jsx` (`useNavigate` + onClick en dot/badge, `?contrato=<id>`) | ✅ |
| **Fix "hace −22 días"** del plazo de presentación | `EnvioEstimacion.jsx` (`presentacion()` distingue `antesDelCorte` → "faltan X días para el corte") | ✅ |
| **KPI sin negativos → "Atraso de X%"** | `CurvaAvance.jsx` (Desviación), `PortafolioEjecutivo.jsx` (`desviacion_pp`) | ✅ |
| **"registrar" → "promover"** (convenios) | `ConveniosModificatorios.jsx` (h2, botón, toasts, mensajes), `AmbienteConvenio.jsx` | ✅ |

### Bloque 2 — Bitácora obligatoria
- **Invierte el flujo:** al crear el contrato, **redirige a abrir la bitácora** (`/bitacora/apertura?contrato=<id>`) en vez de mandar a "Registrados" — `AltaContrato.jsx`.
- **Cierra la asimetría:** la **presentación de estimación ahora exige bitácora abierta** (antes solo omitía la nota) — `estimaciones-ciclo.controller.js` (409 con `requiereBitacora`). *(Gates de avance/convenio/sustitución ya existían.)*

### Bloque 3 — Avance (periodo actual)
- **Bloqueo de periodo FUTURO** (no se reporta trabajo no iniciado) + **aviso de periodo cerrado** (registro tardío) — `trabajos.controller.js` (comparación en SQL, evita TZ).
- **Preselección del periodo en curso** + etiqueta "— en curso" en el selector — `TrabajosTerminados.jsx`.
- *Nota:* el seed tiene periodos mar–may (todos pasados, hoy=23-jun); por eso NO bloqueé el pasado (rompería la demo) — bloqueé futuro + avisé el cerrado. Con reseed de fechas actuales, el "en curso" será real.
- *No-corregir (nota "dice/debe decir"): ya estaba implementado (append-only). Foto en avance → §3 (frozen).*

### Bloque 4 — Estimación: avance del contrato (14.9% → real)
- **`fisico_real_pct`** nuevo, derivado de **avance físico reportado (HU-06, `concepto_avance`)**, separado del "estimado acumulado" de la carátula — `estimacion-prep.controller.js`.
- La barra "Avance físico" usa `fisico_real_pct`; se añadió barra "Avance estimado" — `IntegracionEstimacion.jsx`.
- **Smoke en vivo:** `GET /api/estimacion-prep/contrato/6925` → `fisico_real_pct = 0` ✅ (antes mostraba 14.9%).

### Bloque 5 — Carátula (formato GACM, SIN IVA)
- **Encabezado del documento** (descripción de obra, contrato, fecha del contrato, contratista) — `IntegracionEstimacion.jsx` (datos reales de `selected`).
- **Bloque de FIRMAS** (Residente, Superintendente, Supervisión externa, Autorizó/dependencia) con nombres del roster.
- *Ya existían:* importes sin IVA (contrato/estimado acum/saldo por estimar), amortización de anticipo (art. 143-I), 5 al millar (art. 191), retención por atraso, deductivas, neto a pagar, saldos acumulados.
- *Falta (no derivable en vivo / frozen):* columnas GACM del resumen de servicios (según proyecto/por ejecutar), foto **por generador** (DDL). Ver §3/§4.

### Bloque 6 — Revisión
- **Severidad ELIMINADA** (UI + inserts; la columna queda inerte con default, sin tocar schema) — `RevisionEstimacion.jsx`, `estimaciones-ciclo.controller.js`. Se conserva el **tipo** (aclaración/corrección/rechazo).
- **Supervisión RECHAZA DIRECTO** o turna (antes obligada a turnar; residencia rechazaba tras turnado) — `estimaciones-ciclo.controller.js` (gate por rol + `exigeTurnado` condicional) + botón "Rechazar (supervisión)" en `RevisionEstimacion.jsx`.

### Bloque 7 — Cobro / tránsito a pago
- **SPEI numérica** (rechaza letras) — `pagos.controller.js` (`/^\d{6,100}$/`) + `RegistroPagoForm.jsx` (filtra no-dígitos, `inputMode=numeric`).
- **Fecha de factura no futura** (no post-fechada) — `pagos.controller.js` + `max=hoy` en el input.
- **No pagar sin avance físico reportado** (HU-06) — `pagos.controller.js` (gate `concepto_avance` vigente).
- *Falta (mayor):* paso "contratista promueve cobro" (CFDI/oficio/SPEI) y **cola global de Finanzas** → §4 (parcial).

### Bloque 9 — Sustitución
- **No sustituir con PENDIENTES:** bloquea si la persona saliente tiene notas que **debe firmar** y siguen en plazo (no aceptadas tácitamente) — `roster.controller.js` (cruce `bitacora_notas` × `bitacora_nota_firmas` × `plazo_firma_dias`). *(Interpretativo [validar].)*
- *Ver/reemplazar:* el código ya separa el "equipo vigente" (consulta, también en Expediente) del "formulario de sustitución" (acción). La separación a nivel de RUTA/historia toca `App.jsx` (frozen) → §3.

---

## 3. FROZEN — preparado, **esperando tu OK** (no aplicado)

> Cumpliendo tu freno: aquí está el diff. Dame el OK y lo aplico (con migración idempotente probada 2–3× en local).

### 3.1 SESIONES — matar la sesión anterior (last-login-wins) · esfuerzo M
**Toca:** `schema.sql`, `auth.controller.js`, `auth.middleware.js`, `SesionContext.jsx` (todo auth, frozen).

```sql
-- schema.sql (aditivo idempotente):
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
```
```js
// auth.controller.js · login(): ANTES de firmar, invalida sesiones previas e incluye tv en el payload
const tv = (await pool.query(
  'UPDATE usuarios SET token_version = token_version + 1 WHERE id = $1 RETURNING token_version',
  [u.id]
)).rows[0].token_version;
const token = jwt.sign({ id: u.id, rol: u.rol, nombre: u.nombre, empresa_id: u.empresa_id, tv },
  JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
```
```js
// auth.middleware.js · tras jwt.verify(): compara tv contra la BD → 401 si es de una sesión vieja
const r = await pool.query('SELECT token_version FROM usuarios WHERE id = $1', [payload.id]);
if (!r.rowCount || r.rows[0].token_version !== payload.tv) {
  return res.status(401).json({ error: 'Sesión iniciada en otro dispositivo; vuelve a iniciar sesión.' });
}
```
```jsx
// SesionContext.jsx: ante un 401 con ese mensaje, forzar logout + aviso "tu sesión se cerró en otro lugar".
```
**Costo:** 1 SELECT por request autenticado (mitigable con caché). **Decisión confirmada por ti:** matar la anterior (no rechazar la nueva).

### 3.2 EMPRESAS — modelo invertido (empresa→personas; elegir empresa al firmar) · esfuerzo XL
**Toca:** `schema.sql`, `auth.controller.js`, `contratos.controller.js`, `acceso.js` (frozen) + `empresas.controller.js`, `AltaContrato.jsx`, `SeleccionRol.jsx`, `SolicitudRegistro.jsx` (no frozen).

**Hoy:** `usuarios.empresa_id` 1:1 — la persona **nace** asignada a UNA empresa y el contrato **deriva** la empresa por JOIN del usuario. **Quieres:** la empresa es lo general; la persona se registra dentro; el contratista **elige** en qué empresa firma; la supervisión externa va a **su** empresa.

**Enfoque propuesto (mínimo invasivo, retrocompatible):** fijar la empresa **por contrato/rol** en `contrato_roster`, sin romper el 1:1 de `usuarios` (se conserva como "empresa principal/última").
```sql
-- schema.sql (aditivo idempotente):
ALTER TABLE contrato_roster      ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
ALTER TABLE contratos            ADD COLUMN IF NOT EXISTS contratista_empresa_id INTEGER REFERENCES empresas(id);
ALTER TABLE contratos            ADD COLUMN IF NOT EXISTS supervision_empresa_id INTEGER REFERENCES empresas(id);
-- backfill: copiar empresa_id del usuario actual hacia las columnas nuevas (una sola vez).
UPDATE contratos c SET contratista_empresa_id = u.empresa_id FROM usuarios u WHERE u.id = c.superintendente_id AND c.contratista_empresa_id IS NULL;
UPDATE contratos c SET supervision_empresa_id = u.empresa_id FROM usuarios u WHERE u.id = c.supervision_id   AND c.supervision_empresa_id IS NULL;
```
**Integración:**
- `AltaContrato.jsx` (no frozen): añadir selector de **empresa del contratista** y **empresa de supervisión** (catálogo `api.listarEmpresas`), persistir en el alta.
- `contratos.controller.js` (frozen): al crear, guardar `contratista_empresa_id`/`supervision_empresa_id`; en el detalle, leer la empresa del **contrato** (no por JOIN del usuario) — `:568-570`.
- `acceso.js` (frozen): acotar por la empresa del contrato/roster en vez de `usuarios.empresa_id`.
- `auth.controller.js` (frozen): la empresa al **registrarse** pasa a informativa/opcional (la vinculante es la del contrato).
**Riesgo:** backfill + acotamiento por empresa + suite e2e que asume empresa fija por usuario. **Te lo aplico por fases con smoke** apenas confirmes el enfoque.

### 3.3 Items frozen menores (DDL/montaje) — concretos
- **Foto por avance (HU-06):** `CREATE TABLE IF NOT EXISTS avance_fotos(...)` + controller/routes NUEVOS (copia patrón `estimacion-fotos`) + montaje en `server.js`. (El profe pide evidencia foto **al registrar avance**.)
- **Foto por generador (carátula GACM):** `ALTER TABLE estimacion_fotos ADD COLUMN IF NOT EXISTS contrato_concepto_id INTEGER REFERENCES contrato_conceptos(id);` + filtro en `estimacion-fotos.controller.js`.
- **Gate de bitácora en INTEGRACIÓN (HU-12):** misma verificación que ya puse en presentar, pero en `estimaciones.controller.js` (frozen) — 4 líneas.
- **Revisión por elemento/generador:** `ALTER TABLE estimacion_observaciones ADD COLUMN IF NOT EXISTS estimacion_generador_id INTEGER REFERENCES estimacion_generadores(id);` (ancla la observación al renglón, no a la sección).
- **Convenios — adicionales etiquetados:** `ALTER TABLE contrato_conceptos ADD COLUMN IF NOT EXISTS es_adicional BOOLEAN NOT NULL DEFAULT false;` (congelar originales + etiquetar adicionales).
- **Cola de cobro (Finanzas):** endpoint nuevo en `instruccion-pago.controller.js` (no frozen) + su ruta; el montaje del router ya existe en `server.js`.

---

## 4. PENDIENTE / PARCIAL (no frozen, pero mayor — no alcancé en esta sesión)
- **Estimación-ciclo (a/b/c):** falta (a) **bloquear integrar antes de cerrar el periodo** (toca `estimaciones.controller.js` frozen + romper seed de fechas futuras), (b) **mostrar solo conceptos del periodo** (endpoint nuevo en `estimacion-prep`), (c) **jalar cantidades terminadas del avance** (prellenar, solo modificar). *(El fix del "−22 días" y el del 14.9% SÍ están.)*
- **Cobro:** falta el **paso "contratista promueve cobro"** (CFDI/oficio/datos SPEI como solicitud) y la **cola global de Finanzas** (endpoint + pantalla). *(Las 3 validaciones SÍ están.)*
- **Convenios:** faltan **congelar originales + etiquetar adicionales** (necesita `es_adicional`, §3.3), **no adicionar a periodo pasado** (intrincado con el re-cuadre del programa — requiere diff vs programa vigente) y **curva vieja congelada→nueva**. *(El copy "promover" SÍ está.)*
- **Carátula:** faltan las **columnas GACM del resumen de servicios** (según proyecto/por ejecutar/total estimado) y la **foto por generador** (§3.3).
- **Historias:** NO tocadas (trabajo aparte, como pediste).

---

## 5. Verificación
- **`vite build` VERDE** tras cada bloque (≈497 módulos, ~8–10 s). Última corrida: verde.
- **Backend reiniciado** tras cada cambio de controller (no auto-recarga); arranque **limpio** (sin errores en logs); **`/api/health` → HTTP 200**.
- **Smoke en vivo** (stack docker arriba): login residente OK; `GET /contratos`, `/portafolio` → 200; `/estimacion-prep/contrato/6925` → `fisico_real_pct=0` (fix confirmado). Columnas SQL usadas (`concepto_avance.estado`, `plazo_firma_dias`, `contrato_periodos.fin`) verificadas contra la BD viva.
- **Sin residuo de datos:** solo lecturas/logins (JWT stateless, sin tabla de sesión). No se creó ni borró data de prueba.
- **NO push.** Todo local. Zona congelada intacta (18 archivos, ninguno en la lista congelada).

---

## 6. Qué necesito de ti
1. **OK a SESIONES (§3.1)** y al **enfoque de EMPRESAS (§3.2)** → los aplico por fases con smoke.
2. ¿Aplico los **items frozen menores (§3.3)** (foto-avance, foto-generador, gate-integración, obs-por-generador, es_adicional)? Son DDL aditivo idempotente + código.
3. Para cerrar **estimación-ciclo (a)** (no estimar antes de cerrar periodo) conviene **reseed con fechas actuales** (hoy los periodos del seed son mar–may, todos pasados).
