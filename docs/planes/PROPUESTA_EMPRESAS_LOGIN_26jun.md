# Propuesta — mover la creación de empresa al login (quitar "registrar nueva" del registro)

> **26-jun-2026 · SOLO PROPUESTA. No se tocó código** de login / registro / padrón (zona sensible). Este documento
> es para que **Maiki decida** e implemente (o no). Fuente del diagnóstico: `docs/reportes/ANALISIS_EMPRESAS_LOGIN_26jun.md`
> (citas del profe verificadas) + lectura del flujo real (frontend + controllers).

---

## 0. Qué pide Maiki (a implementar a futuro)
Que al **crear una cuenta** el usuario **solo se vincule a una empresa ya existente** (elegir del catálogo), y **quitar
del registro** la opción "➕ Registrar empresa nueva…". La creación de empresas viviría **fuera del auto-registro**
(en el padrón / login operado por la dependencia).

## 0bis. ⚠️ Antes de tocar nada: el sistema YA cumple lo que el profe pidió
Esto **no es urgente para la entrega**. Lo que el profe pidió sobre empresas **ya está**:

| Lo que pidió el profe | ¿Ya está? | Dónde |
|---|---|---|
| Elegir empresa **de catálogo**, no texto libre | ✅ | `<select>` en `SeleccionRol.jsx` / `SolicitudRegistro.jsx` (`GET /auth/empresas`) |
| **Auto-crear si falta** y reusar después (on-demand) | ✅ | `auth.controller:register` → `empresas.controller:resolverOCrearEmpresa` |
| **Sin duplicados** (caso "patito" vs "PAT…") | ✅ | dedup en 2 niveles (índice `uq_empresas_nombre_norm` + normalización fuerte de razón social) |
| Empresa = **entidad raíz**, padrón compartido poblado on-demand | ✅ | catálogo único de empresas; padrón valida/fusiona (HU-23) |
| Selector **empresa → persona (contraparte)** en el alta | ✅ (parcial) | `AltaContrato.jsx` (contratista/supervisión por empresa) |

> **Conclusión:** la parte de Maiki ("quitar registrar nueva del registro") es **más estricta** que lo que pidió el
> profe — él describió justamente el **auto-alta on-demand durante el registro** (audio 9-jun `[04:44]`). Es un cambio
> de **limpieza/gobernanza** defendible, **no un requisito pendiente del profe**. Por eso: **es opcional**, y si se
> hace, se hace **después de la entrega** y por el orden seguro de abajo.

---

## 1. Diseño del flujo nuevo

### 1.1 Registro de cuenta (lo que cambia)
- El `<select>` de empresa **solo lista empresas existentes** del catálogo. **Se elimina** la opción `__nueva__` y el
  input de texto libre.
- Empresa **sigue obligatoria** para `contratista` / `supervisión` (igual que hoy).
- Si la empresa del usuario **no está** en el catálogo, el registro **no la crea**: el usuario ve un aviso
  ("Tu empresa aún no está en el padrón; pídele a la dependencia que la dé de alta") y **no puede completar** ese rol
  hasta que exista. → de ahí el problema del huevo y la gallina (§2).
- El backend `register` pasa de **"resolver-O-crear"** a **"resolver-sin-crear"**: recibe `empresa_id` (o nombre) y
  **rechaza** (400) si no existe en el catálogo. Nunca inserta una empresa nueva.

### 1.2 Dónde se crean las empresas ahora (las vías nuevas)
La creación se mueve a manos de la **dependencia** (rol con potestad sobre el padrón, art. 43 RLOPSRM):
- **Vía principal — Padrón (HU-23, `EmpresasPadron.jsx`):** botón **"➕ Registrar empresa"** → `POST /empresas`
  (endpoint **nuevo**, solo rol `dependencia`). Reusa la misma normalización/dedup que `resolverOCrearEmpresa` para no
  reintroducir duplicados. La empresa nace `estado='por_validar'` o `validada` (a decidir).
- **Vía opcional — alta de contrato:** si en el alta la contraparte no existe, un "➕ nueva empresa" inline (mismo
  endpoint) — **solo** si el rol es dependencia. (Opcional; el padrón ya cubre el caso.)

### 1.3 Resultado
El auto-registro queda **solo de lectura** sobre el catálogo de empresas (elige, no crea). La creación es un **acto
deliberado de la dependencia**, normalizado y auditable. Coincide con "el padrón en la base de datos, compartido"
(profe, 25-jun `[09:18]`).

---

## 2. El problema del "huevo y la gallina"
**Síntoma:** si el registro **no** puede crear empresas y el padrón es la única vía de creación, entonces **la primera**
empresa/contratista no se puede registrar (su empresa no existe aún, y para crearla hace falta una dependencia que ya
esté dentro).

**Por qué no es bloqueante en la práctica:**
- Las **dependencias** no necesitan empresa para registrarse (empresa obligatoria es solo para contratista/supervisión).
  Una dependencia entra primero y **puebla el padrón**.
- El padrón ya se **siembra** (seeds + reseed de cuentas en Render): el catálogo no nace vacío.

**Solución de diseño (orden de arranque):**
1. Existe al menos **una dependencia** (semilla o alta manual) — no depende de empresas.
2. Esa dependencia **da de alta las empresas** en el padrón (vía nueva `POST /empresas`).
3. Recién entonces los **contratistas/supervisión** se registran **eligiendo** su empresa ya existente.

> Regla de oro: **nunca** quitar el auto-crear del registro **antes** de que exista la vía de creación en el padrón.
> Si se invierte el orden, se rompe el alta de cualquier contratista nuevo. → de ahí el orden seguro del §4.

---

## 3. Mapa de archivos a tocar (🧊 = ZONA CONGELADA → solo Maiki, vía PR)

| # | Archivo | Cambio | ¿Congelado? |
|---|---|---|---|
| 1 | `backend/src/controllers/empresas.controller.js` | **Añadir** `crearEmpresa` (POST, solo dependencia, reusa normalización/dedup) | **No** — se puede preparar |
| 2 | `backend/src/routes/empresas.routes.js` | **Añadir** ruta `POST /empresas` con `authMiddleware` + `requireRole('dependencia')` | **No** |
| 3 | `backend/server.js` | (solo si la ruta no está montada ya) montar/confirmar router de empresas | 🧊 **Sí** — Maiki monta |
| 4 | `frontend/src/pages/EmpresasPadron.jsx` | **Añadir** botón "➕ Registrar empresa" + modal → `api.crearEmpresa` | **No** |
| 5 | `frontend/src/services/api.js` | **Añadir** `crearEmpresa()` | **No** |
| 6 | `backend/src/controllers/auth.controller.js` → `register` | **Cambiar** `resolver-O-crear` → `resolver-sin-crear` (rechaza nombre inexistente / exige `empresa_id`) | 🧊 **Sí — núcleo de auth** |
| 7 | `frontend/src/pages/SeleccionRol.jsx` | **Quitar** opción `__nueva__` + input de texto libre | **No** |
| 8 | `frontend/src/pages/SolicitudRegistro.jsx` | **Quitar** opción `__nueva__` + input de texto libre (espejo de #7) | **No** |

**Lo único realmente congelado:** #6 (`auth.controller:register`) y #3 (`server.js`, si hay que montar). Todo lo demás
es no congelado y se puede dejar listo. **`data/permisos.js`, `App.jsx`, `SesionContext.jsx`, `acceso.js`,
`auth.middleware.js`, `schema.sql` → NO se tocan** (el padrón ya existe en rutas/permisos; no hay DDL nueva: la tabla
`empresas` ya tiene `estado`).

---

## 4. ORDEN SEGURO de implementación (primero crear, AL FINAL quitar)
> Cada paso deja el sistema **funcionando**. El auto-crear del registro se quita **al último**, cuando ya hay
> alternativa. Probar login + alta de contratista **después de cada paso**.

1. **(No congelado) Backend de creación:** `crearEmpresa` en `empresas.controller.js` + ruta `POST /empresas`
   (`requireRole('dependencia')`, reusa dedup). **No** quita nada todavía. → pedir a Maiki montar la ruta (#3).
2. **(No congelado) Frontend de creación en el padrón:** `api.crearEmpresa` + botón/modal en `EmpresasPadron.jsx`.
   Probar: la dependencia crea una empresa y aparece en el catálogo. **El registro sigue pudiendo auto-crear** (red de
   seguridad intacta).
3. **Smoke de transición:** verificar que TODA empresa que un contratista podría necesitar ya se puede crear desde el
   padrón. Sembrar/validar el catálogo en Render.
4. **(🧊 Maiki, PR) `register` → resolver-sin-crear:** ahora sí, `auth.controller:register` deja de crear y **exige
   empresa existente** (`empresa_id` validado o nombre que ya esté). Probar: contratista con empresa existente entra;
   contratista con empresa inexistente recibe 400 claro.
5. **(No congelado) Quitar la rama "nueva" del front:** eliminar `__nueva__` + input en `SeleccionRol.jsx` y
   `SolicitudRegistro.jsx`. Ahora el front ya no ofrece algo que el backend rechazaría.
6. **Regresión:** registro de dependencia (sin empresa) OK; registro contratista/supervisión con empresa del catálogo
   OK; intento con empresa inexistente → mensaje "pídele a la dependencia que la registre". Padrón crea/valida/fusiona.

> **Punto de rollback:** mientras no se haga el paso 4, todo es **aditivo** y reversible. El paso 4 es el único
> irreversible-en-comportamiento; hacerlo solo cuando 1–3 estén verificados en Render.

---

## 5. Riesgos
| Riesgo | Severidad | Mitigación |
|---|---|---|
| Quitar el auto-crear **antes** de tener `POST /empresas` → ningún contratista nuevo puede registrarse | 🔴 Alto | Respetar el orden del §4 (crear primero, quitar al final) |
| Tocar `auth.controller:register` (congelado) | 🟠 Medio | Solo Maiki, vía PR; cambio mínimo (validar `empresa_id`, no insertar); probar login completo |
| Re-introducir **duplicados** al crear desde el padrón | 🟠 Medio | `crearEmpresa` **debe** reusar la misma normalización/dedup de `resolverOCrearEmpresa` (no reimplementar a mano) |
| Catálogo **vacío** en un entorno nuevo → nadie puede elegir empresa | 🟡 Bajo | Sembrar el padrón (seeds/reseed) y crear una dependencia primero (§2) |
| Friccción para el contratista (su empresa no está aún) | 🟡 Bajo | Mensaje claro + la dependencia la da de alta en minutos; es el comportamiento deseado (gobernanza) |
| Romper las specs e2e de registro (`reg-empresa-select` / `reg-empresa-nueva`) | 🟡 Bajo | Actualizar/borrar las specs que prueban `__nueva__` cuando se haga el paso 5 |

---

## 6. Recomendación
1. **No es necesario** para cumplirle al profe (§0bis): lo que pidió **ya está**. Tratarlo como **mejora de gobernanza
   post-entrega**.
2. Si Maiki lo quiere igual: hacerlo **estrictamente en el orden del §4** (añadir creación en el padrón → cambiar
   `register` → quitar la rama "nueva"). **Nunca** quitar la creación sin la alternativa lista.
3. El punto del profe que **sí** conviene cerrar (más que este) es el del **alta**: que el selector de empresa sea
   explícitamente **la contraparte** y salga del **catálogo** (hoy se deriva de los asignables) — 25-jun `[10:50]`.

> **No se modificó código.** Decisión de Maiki.
