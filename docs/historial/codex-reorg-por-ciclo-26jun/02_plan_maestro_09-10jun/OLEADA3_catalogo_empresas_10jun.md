# Oleada O3 — Catálogo de empresas — 10 jun 2026

> Ejecuta el prompt O3 del plan (P1 de la revisión del profe, lo que más machacó: *"tú primero das de
> alta la empresa y luego vinculas… catálogos: es lo de ley"*). **LOCAL, sin commit/push**, sobre `main`
> (con O1+UI-1+UI-2+O2 ya integrados: commits `b1bd3e8` y `f57636a`; árbol limpio al empezar).
> Componentes guinda de UI-1. **NO se tocó `permisos.js`, `server.js`, el JWT/login ni G1-G8.**

## Qué se construyó

1. **DDL aditivo e idempotente** (`schema.sql`, bloque O3 al final): tabla `empresas(id, nombre VARCHAR(200), creado_en)` + **índice único funcional NORMALIZADO** `uq_empresas_nombre_norm = lower(btrim(regexp_replace(nombre,'\s+',' ','g')))` (mata los duplicados "patito"/"PAT "/"patito  sa") + `usuarios.empresa_id INTEGER NULL REFERENCES empresas(id)` + índice. **SEED** de 3 empresas demo (`Dependencia Demo`, `Constructora Demo`, `Supervisión Externa Demo`) y **BACKFILL** de las cuentas demo (contratante→Dependencia Demo; contratista→Constructora Demo; supervisión→Supervisión Externa Demo). **Ya aplicado a la BD local.**
2. **Backend**:
   - `empresas.controller.js` (NUEVO, no congelado): `resolverOCrearEmpresa(q, nombre)` (normaliza con la MISMA expresión del índice; resuelve por forma normalizada o da de alta; maneja carrera 23505) + `listarEmpresas` (catálogo público) + `normalizarNombreEmpresa`.
   - `auth.controller.register`: **extensión mínima y aditiva** — acepta `empresa` (opcional), la resuelve-o-crea y la vincula (`empresa_id` en el INSERT). **`login` y el JWT intactos** (empresa_id viaja en los SELECT, nunca en el token).
   - `auth.routes.js`: `GET /api/auth/empresas` (público; el registro es público y este es el único router sin `authMiddleware`, así se **evita tocar `server.js`** — no se monta router nuevo).
   - SELECTs enriquecidos con `LEFT JOIN empresas` (aditivo, NULL-safe): `usuarios.listarAsignables` (+empresa_id/empresa, para el aviso del alta), `contratos.detalleContrato` (+residente/superintendente/supervision_empresa, para el expediente), `roster.leerRoster` (+usuario_empresa, en historial y vigente).
3. **Registro (2 formularios)**: `SeleccionRol` (FormRegistro) y `SolicitudRegistro` ganan **campo Empresa con autocomplete `<datalist>`** desde `api.listarEmpresas()`; si lo tecleado **no está** en el catálogo (comparación normalizada, espejo del backend), un `window.confirm("'X' no está en el catálogo. ¿Registrarla como nueva empresa?")` antes de enviar (principio del profe: *el primero la registra, el siguiente la elige*). `empresa` viaja en el payload de `api.register`.
4. **Alta de contrato**: **aviso (no bloqueo)** `aviso-misma-empresa` en TabDatosGenerales cuando superintendente y supervisión comparten `empresa_id` (*"la supervisión es un tercero"*) — derivado de los asignables enriquecidos; `[validar profe]` si debe bloquear.
5. **Expediente + roster**: empresa junto a cada persona (bloque jurídicos/equipo, roster del expediente, `RosterContrato` vigente); **búsqueda por empresa** (campo nuevo "Empresa" en el buscador + empresa añadida a los blobs de match de los bloques jurídicos y roster).

## Decisiones (y por qué)

1. **Índice único FUNCIONAL normalizado, no columna generada**: `CREATE UNIQUE INDEX ... (lower(btrim(regexp_replace(...))))` es idempotente, no añade columna y `lower/btrim/regexp_replace` son IMMUTABLE (válidas en índice). El backend normaliza con la **misma** expresión en JS (`trim().replace(/\s+/g,' ').toLowerCase()`) → frontend/backend/DB coinciden.
2. **"NO tocar auth core" interpretado como JWT/login/middleware**, no como "jamás tocar auth.controller". El prompt pide explícitamente "REGISTRO de usuario: campo Empresa" y aclara "(empresa_id viaja en los SELECT, no en el JWT)" → la restricción real es el token. La extensión de `register` es **mínima, opcional y aditiva**; `login` y la firma del JWT no se tocaron. (Maiki/fundación es dueño de auth; queda anotado para revisión.)
3. **Catálogo público bajo `/api/auth/empresas`**: el autocomplete corre en el registro (sin token); el único router público es `auth`. Colgarlo ahí evita montar un router nuevo en `server.js` (prohibido). Datos no sensibles (razones sociales).
4. **Resolver-o-crear sin transacción**: una empresa sin usuarios es válida, así que si el INSERT del usuario fallara (email duplicado) la empresa queda disponible para el siguiente registro. Más simple que abrir un client; la carrera de creación concurrente la cubre el índice único (23505 → re-SELECT).
5. **Demo: contratista y supervisión en empresas DISTINTAS** (Constructora vs Supervisión Externa) → el aviso de "misma empresa" NO se dispara en los contratos demo (la suite no se ensucia con avisos espurios).
6. **empresa_id NULL retrocompatible**: contratos/usuarios viejos sin empresa siguen funcionando; los `*_empresa` salen NULL y la UI los omite.

## Tensión de alcance (para tu revisión)

El prompt dijo "NO tocar auth core". Toqué `auth.controller.register` (extensión aditiva de empresa) y `auth.routes.js` (un GET público). **No toqué `login`, el JWT, `auth.middleware`, `permisos.js`, `server.js` ni G1-G8.** Si prefieres que el registro NO toque `auth.controller`, la alternativa sería un endpoint de vínculo separado post-registro (peor UX, no encaja con "el primero la registra"). Lo dejo así y lo marco aquí explícitamente.

## Tests (lección 7)

- **Nuevo** `o3-empresas.spec.js` (4): registro empresa NUEVA (confirma + queda en catálogo) · registro empresa EXISTENTE (no re-pregunta ni duplica) · alta: aviso misma empresa (2 cuentas misma empresa vía API, aviso visible, se quita al cambiar supervisión) · expediente muestra empresa + búsqueda por empresa filtra.
- `hu-registro.spec.js` **sin cambios**: el campo Empresa es opcional (vacío → sin confirm), el flujo previo sigue verde.
- Pre-vuelo O3: **4/4 verde**. **Suite completa: 218 passed · 8 skipped (fixme conocidos) · 0 failed (6.8 min)** — los 214 previos intactos + 4 nuevos de O3. `vite build` ✓.

## Runbook de integración (Maiki) — incluye MIGRACIÓN (hay DDL)

1. **Migración en Render** (igual que O2, hay DDL): backup (`backup_render.ps1`) → aplicar el bloque O3 de `schema.sql` con `psql --single-transaction -v ON_ERROR_STOP=1` **o** dejar que el deploy con `RUN_MIGRATIONS=true` lo aplique (todo es `CREATE TABLE/INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, seeds con `WHERE NOT EXISTS` y backfill `WHERE empresa_id IS NULL` → idempotente). Verificar: `SELECT count(*) FROM empresas;` (≥3) y `SELECT email, empresa_id FROM usuarios WHERE email LIKE '%@sigecop.test';`.
2. Local tras pull: la tabla ya está en la BD local; `docker restart sigecop_backend` (controllers cambiaron). Frontend HMR.
3. Suite completa + smoke: registrarte con empresa nueva (confirma) y existente (elige); alta con superintendente y supervisión de la misma empresa (aviso); expediente (empresa junto a personas + búsqueda por empresa).
4. **Para el profe**: P1 resuelto (catálogo + alta automática + el primero registra/el siguiente elige). Pendiente `[validar]`: ¿el aviso de "misma empresa" debe ser bloqueo? (hoy avisa, no bloquea).

## Archivos tocados

Backend: `schema.sql` (+bloque O3), `empresas.controller.js` (NUEVO), `auth.controller.js` (register), `auth.routes.js`, `usuarios.controller.js` (listarAsignables), `contratos.controller.js` (detalleContrato), `roster.controller.js` (leerRoster). Frontend: `api.js` (+listarEmpresas), `SeleccionRol.jsx`, `SolicitudRegistro.jsx`, `AltaContrato.jsx` (aviso), `ConsultaExpediente.jsx` (empresa+búsqueda), `RosterContrato.jsx`. Test: `o3-empresas.spec.js` (NUEVO).
