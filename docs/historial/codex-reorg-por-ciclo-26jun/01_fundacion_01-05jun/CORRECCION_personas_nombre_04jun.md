# Corrección del profe (revisión 04-jun) — Registro con nombre+apellidos · Alta con personas-cuenta → roster

**Autor:** Maiki (Fundación) · **Base:** `main` limarrio `afc70ff` · **Estado:** PROBADO EN LOCAL, sin commit/push/deploy.
**Nivel 1** (ley literal + profe): toda regla legal va con cita o `[validar]`. Code no decide lo legal.

---

## 1. Qué pidió el profe

1. **Registro de usuario:** exigir **nombre + apellidos** (hoy se podía crear con solo "Iván"). El nombre completo aparece en la **bitácora** → obligatorio, todos los roles. Completar las cuentas demo sin apellido.
2. **Alta de contrato:** contratista/supervisión/dependencia eran **texto libre** → pasar a **SELECCIONAR de cuentas registradas**. Al guardar, **asociar al `contrato_roster`** (pasada 2) para que sean exactamente quienes firman la bitácora. Nada de texto libre para personas.

**Decisiones (consultadas con Maiki, A+A):**
- **Nombre:** un solo campo `nombre`, validado a **≥2 palabras** (cliente + servidor). NO se parte en columnas. Backfill demo por seed. Mínimo churn (no toca los ~7 sitios que muestran `nombre`).
- **Personas:** el **contratista = el superintendente** (cuenta rol contratista, que ya se elegía y ya firmaba). La **dependencia** pasa a cuenta seleccionada (FK nueva `contratos.dependencia_id`), parte contratante que **NO firma la bitácora** (art. 123 RLOPSRM: el residente la representa) → **no entra al roster**. `crearContrato` inserta **residente + superintendente (+ supervisión)** en `contrato_roster` al guardar. No se toca el CHECK del roster ni la firma de bitácora (Equipo 2).

---

## 2. Qué se cambió (por archivo)

### Backend
| Archivo | Cambio |
|---|---|
| `src/controllers/auth.controller.js` | `register()` exige nombre completo (`esNombreCompleto`, ≥2 palabras `/\p{L}{2,}/gu`). 400 si no. |
| `src/controllers/usuarios.controller.js` | `listarAsignables` acepta `rol=dependencia` (además de contratista/supervision). Misma query (rol+estado='activo'). |
| `src/controllers/contratos.controller.js` | `crearContrato`: (a) `dependenciaId` **obligatorio**, validado rol `dependencia`+activo (igual que superintendente); (b) textos `contratista`/`dependencia` se **derivan** del nombre de la cuenta (ya no llegan del body); (c) guarda `dependencia_id`; (d) **inserta el `contrato_roster`** (residente/superintendente/supervisión) dentro de la misma transacción; (e) `REQUIRED_FIELDS` y `LIMITES_TEXTO` ya no listan contratista/dependencia. |
| `src/db/schema.sql` | (a) `ALTER TABLE contratos ADD COLUMN IF NOT EXISTS dependencia_id` (FK usuarios, SET NULL, índice); (b) nombres demo completos (INSERT actualizado + `UPDATE` idempotente gateado por nombre viejo). |
| `scripts/smoke-bitacora-v2.mjs` | El smoke crea contrato con `dependenciaId` (login de la cuenta dependencia). |

### Frontend
| Archivo | Cambio |
|---|---|
| `src/pages/SeleccionRol.jsx` · `SolicitudRegistro.jsx` | Validación cliente `esNombreCompleto` (espejo del backend) en los 2 forms de registro. |
| `src/pages/AltaContrato.jsx` | `contratista` (texto) **eliminado**; el contratista es el select de superintendente (relabel "Contratista · superintendente de obra"). `dependencia` (texto) → **`<select>`** de cuentas rol dependencia (`dg-dependencia`). Estado `dependenciaId`/`asignablesDependencia`, carga `listarAsignables('dependencia')`, `validarPaso(0)` exige dependencia, payload manda `dependenciaId`, reset/efectos/tabsConError actualizados, aviso "no hay cuentas de dependencia". **Gating lineal, regla del 100% y cuadre: intactos.** |

### Tests
| Archivo | Cambio |
|---|---|
| `e2e/_helpers.js` | `altaLlenarDatosGenerales` selecciona contratista (superintendente) y dependencia (antes `.fill` de texto). |
| `e2e/hu-registro.spec.js` | nombre del alta usa 2 palabras válidas; **+ test** que rechaza nombre de 1 token. |
| `e2e/bitacora-v2.spec.js` | helper `crearContrato` (API) manda `dependenciaId`. |
| `e2e/alta-personas-roster.spec.js` (**nuevo**) | UI (dependencia es select, no hay texto de contratista) · gating (no avanza sin dependencia) · **roster** (residente+superintendente quedan asignados) · **API** (sin `dependenciaId` → 400; rol equivocado → 400). |

---

## 3. Cómo se conecta al `contrato_roster` (pasada 2)

- `contrato_roster` (CHECK `rol IN ('residente','superintendente','supervision')`, UNIQUE parcial activa por (contrato,rol), trigger de inmutabilidad, sustituir-no-borrar). **No se modifica.**
- `crearContrato`, dentro de la transacción del alta, tras el `INSERT contratos`, inserta **una fila ACTIVA por rol**: `residente`=creador, `superintendente`=cuenta contratista, `supervision`=cuenta supervisión (si hay). `vigencia_desde`=inicio del contrato; `motivo='Asignación inicial (alta del contrato)'`; `registrado_por`=JWT.
- El **cache escalar** de `contratos` (`residente_id/superintendente_id/supervision_id`) —que leen `lib/acceso.js` y la **firma de bitácora** (`bitacora.controller.cargarAperturaYRol`)— ya se escribía; el roster es el **registro histórico** que habilita la sustitución (art. 125 fr. I g RLOPSRM). Por eso "son exactamente quienes firman".
- El seed idempotente del roster en `schema.sql` (NOT EXISTS) **no duplica**: al desplegar, el `(contrato,rol)` ya tiene fila activa.
- Verificado en BD (contrato recién creado por API, motivo "Asignación inicial (alta del contrato)" ⇒ lo puso `crearContrato`, no el seed):
  ```
  roster: residente       -> Ing. Iván Residente Demo      (activa)
  roster: superintendente -> Arq. Carlos Contratista Demo  (activa)
  roster: supervision     -> Ing. Sofía Supervisión Demo   (activa)
  contratos.dependencia_id = 4 ; contratista_txt/dependencia_txt derivados del nombre de cuenta
  ```

---

## 4. Citas legales / `[validar]`
- **Nombre completo en bitácora:** apoyo en art. 123 RLOPSRM (asentar a quienes intervienen). El umbral "≥2 palabras" es **regla operativa de la Fundación**, no artículo propio → `[validar redacción con el profe]`.
- **Dependencia no firma la bitácora diaria:** art. 123 RLOPSRM (la operan residente y superintendente; supervisión si externa). El residente representa a la dependencia → dependencia fuera del roster. `[validar con el profe]`.
- **Roster / sustitución:** art. 125 fr. I g RLOPSRM (sustitución de superintendente/residente/supervisión).

---

## 5. Pruebas (LOCAL, login real, backend+BD arriba)

- **Suite e2e completa: 163 passed / 8 skipped / 0 fail** (baseline 157 + 6 nuevos). Sin regresión.
- **Regresión del gating del alta** (`alta-gating-regresion`, `alta-v5*`, `alta-v4-gating`, `4x-alta-correcciones`, `hu-01`): **verdes** — gating lineal, regla del 100% y cuadre intactos.
- **Smoke bitácora** (`backend/scripts/smoke-bitacora-v2.mjs`): **18/18**.
- **API directa:** `register` nombre 1 token → 400; nombre completo → 201. `POST /contratos` sin `dependenciaId` → 400; `dependenciaId` de rol equivocado → 400.
- **Revisión adversarial** (multi-agente) del diff: 30 hallazgos, 10 confirmados; aplicados los relevantes (limpieza de `LIMITES_TEXTO`, aviso de dependencias, 2 tests API de negación, documentación del regex). Descartados los de bajo valor/por-diseño.

---

## 6. Runbook de despliegue (Maiki)

> Migración **aditiva e idempotente** (1 columna nueva + backfill de nombres). Sin pérdida de datos. Probar 2–3× en local antes de Render.

1. **Backup** de la BD (Render: snapshot; local: `pg_dump`).
2. **Aplicar el schema** (idempotente):
   ```bash
   docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 --single-transaction < backend/src/db/schema.sql
   ```
   En Render, se aplica por el arranque del backend (initDb) / runbook habitual.
3. **Verificar** post-migración:
   ```sql
   SELECT column_name FROM information_schema.columns WHERE table_name='contratos' AND column_name='dependencia_id'; -- 1 fila
   SELECT rol, nombre FROM usuarios WHERE email LIKE '%@sigecop.test'; -- nombres completos
   ```
4. **Reiniciar backend** (no auto-recarga): `docker restart sigecop_backend`.
5. **Smoke** del ciclo: `node backend/scripts/smoke-bitacora-v2.mjs` (espera 18/18).
6. **Compatibilidad código viejo sobre esquema nuevo:** la columna es nullable con DEFAULT NULL; los contratos previos siguen leyéndose (Registrados/detalle usan los textos `contratista`/`dependencia`, que se conservan). El roster de contratos previos lo cubre el seed idempotente.
7. Solo entonces, push a `main` (auto-deploy Render).

**Rollback:** la columna `dependencia_id` es aditiva y nullable; si hiciera falta revertir el código, el esquema nuevo no rompe el código viejo (no se elimina nada).

---

## 7. Entregables
- **Patch:** `docs/CORRECCION_personas_nombre_04jun.patch` (incluye el spec nuevo).
- **Archivos tocados:** 12 (5 backend, 4 tests, 3 frontend; +1 doc +1 patch). Ver §2.
- `main` **intacto** (solo working tree; sin commit/push/deploy).
