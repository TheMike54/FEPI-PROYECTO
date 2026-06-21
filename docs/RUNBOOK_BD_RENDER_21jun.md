# RUNBOOK — FASE DE BD EN RENDER (21-jun) · lo ejecuta MAIKI, paso a paso

> **NO ejecutado por Code.** Solo preparación. LOCAL, sin push. Patrón `docker run --rm postgres:16-alpine`
> contra la **External Database URL** de Render, montando el repo para leer/escribir archivos sin corromper
> binarios (evita los problemas de pipe/encoding de PowerShell).
>
> 🔴 **El paso 2 (DROP SCHEMA) es DESTRUCTIVO e irreversible.** NO lo corras sin el **backup del paso 1 verificado**.

---

## 0. ORDEN GLOBAL (CÓDIGO primero, luego BD) — crítico para no dejar Render inconsistente

**Primero el CÓDIGO, después la BD.** Razón: el frontend nuevo (modal de contrato, pestañas, chip, galería de
fotos) y el backend nuevo (router `/api/estimacion-fotos` montado en `server.js`) deben estar **desplegados** para
que la BD nueva calce con la API. Si cargas la BD primero con el código viejo corriendo, habría una ventana de
inconsistencia (el front viejo no tiene el flujo nuevo ni el endpoint de fotos).

1. **Integrar el código a `main`** (todo lo de esta sesión, LOCAL → tu integración + `git push`):
   - **Frontend:** los 2 bugs (`ContratoActivoContext.jsx`, `PestanasCiclo.jsx`, `AppShell.jsx`,
     `ModalContratoActivo.jsx`), navegación/chip de los bloques previos, y la evidencia fotográfica
     (`components/FotosEstimacion.jsx`, `utils/imagen.js`, `services/api.js`, `pages/ConsultaExpediente.jsx`,
     `pages/IntegracionEstimacion.jsx`).
   - **Backend:** `controllers/estimacion-fotos.controller.js` + `routes/estimacion-fotos.routes.js` (nuevos),
     y el **montaje aditivo** en `server.js` (`app.use('/api/estimacion-fotos', estimacionFotosRoutes)` + su
     `require`), más lo de notificaciones (`alertas.controller`/`routes` con `alertasDetalle`) si no estaba.
   - **Scripts (se versionan, el runbook los lee del repo local):** `backend/scripts/seed_demo_24.sql`,
     `backend/scripts/reseed_cuentas.sql` (con nombres realistas), `backend/scripts/migracion_estimacion_fotos.sql`.
   - **Recomendado:** integra también las **4 columnas de foto a `schema.sql`** (junto a la tabla
     `estimacion_fotos`, líneas ~597-604) para que queden permanentes y el deploy las aplique. Igual el runbook
     corre la migración aparte (idempotente: si ya están, no hace nada).
2. **Render → Manual Deploy** del **backend** (y del frontend si es servicio aparte). **Espera a que termine en
   verde.** Verifica `GET https://<tu-backend>.onrender.com/api/health` → 200 y que la app carga el login.
   - En este punto el backend ya tiene montado el router de fotos. La BD aún es la vieja — no importa, el runbook
     la reemplaza enseguida. (Si `RUN_MIGRATIONS=true`, este deploy ya corre `schema.sql` al bootear y arregla el
     bug 4 sobre la BD vieja; el runbook la rehace limpia de todos modos.)
3. **Ejecutar el RUNBOOK DE BD** de abajo (pasos 1-6). Con el código ya desplegado, la BD nueva calza con la API.
4. **Tras el runbook:** NO hace falta reiniciar el backend (consulta los datos en vivo). **Smoke final en la app:**
   login con una cuenta realista (ver `docs/Cuentas_Prueba_SIGECOP.md`), abrir un contrato `PRUEBA-HU-XX`, ir a su
   pantalla, y en el Expediente subir/ver una foto.
   - ⚠️ **No dispares OTRO deploy mientras corres el runbook** (evita que un boot con `RUN_MIGRATIONS` reaplique
     `schema.sql` a media carga).

---

## Preparación (una vez, antes de los 6 pasos)

```powershell
# 1) La External Database URL de Render (Dashboard → tu BD → "External Database URL"). NO la Internal.
#    Si psql se queja de SSL, añade  ?sslmode=require  al final.
$URL = "postgresql://USUARIO:PASSWORD@HOST.oregon-postgres.render.com/NOMBRE_BD?sslmode=require"

# 2) Imagen de cliente (debe coincidir con el major de PG de Render; si Render es 15, usa postgres:15-alpine).
docker pull postgres:16-alpine

# 3) Ubícate en la RAÍZ del repo (para montar los scripts dentro del contenedor).
cd C:\Users\migue\Downloads\Proyectofepy\sigecop

# 4) Prueba de conexión (no cambia nada):
docker run --rm postgres:16-alpine psql "$URL" -c "SELECT version();"
```
**Si la conexión falla:** revisa el URL (External, no Internal), añade `?sslmode=require`, y que el major de PG
coincida (cambia el tag `postgres:NN-alpine`). No sigas hasta tener `SELECT version()` OK.

---

## PASO 1 — 🟢 BACKUP COMPLETO (primero, no destructivo). Si falla, PARA aquí.

```powershell
$fecha = Get-Date -Format "yyyyMMdd_HHmmss"
docker run --rm -v "${PWD}:/repo" postgres:16-alpine pg_dump "$URL" -f "/repo/backup_render_$fecha.sql"

# Verificar que NO está vacío y tiene DDL real:
$bk = Get-Item ".\backup_render_$fecha.sql"
"Backup: $($bk.Name)  —  $([math]::Round($bk.Length/1KB,1)) KB"
"CREATE TABLE encontrados: $((Select-String -Path $bk.FullName -Pattern 'CREATE TABLE').Count)"
```
**Qué debes ver:** un archivo de **cientos de KB** (no 0 KB) y **decenas de `CREATE TABLE`**.
**Si falla** (error de pg_dump, 0 KB, o 0 `CREATE TABLE`): **DETENTE. NO continúes.** La BD sigue intacta.
Causas comunes: SSL (añade `?sslmode=require`), URL equivocada, o mismatch de versión (`server version mismatch`
→ usa el tag `postgres:<major-de-render>-alpine`). **Guarda este `.sql` — es tu única vuelta atrás.**

---

## PASO 2 — 🔴🔴 DESTRUCTIVO: limpiar TODO (DROP SCHEMA). Requiere el backup del PASO 1 verificado.

> **Recomendación: `DROP SCHEMA public CASCADE` (no TRUNCATE).** Por qué es lo más seguro para el objetivo
> ("limpiar por completo + arreglar bug 4"): deja un **lienzo 100% limpio** (borra usuarios viejos, contratos
> `E2E-*` y empresas basura del e2e, y cualquier columna a medio migrar). Al reaplicar `schema.sql` sobre vacío,
> el bug 4 queda **garantizado** (la columna `tipo` nace como `VARCHAR` + catálogo, sin depender de que una
> migración guardada "detecte" el ENUM viejo). `TRUNCATE` deja la estructura vieja (incl. el tipo ENUM si estaba)
> → tendrías que reaplicar el schema igual, con más incertidumbre. DROP SCHEMA + reaplicar es más limpio y
> determinista.

```powershell
# ⚠️ Esto BORRA TODA la base. Confirma que ".\backup_render_$fecha.sql" está verificado (PASO 1) ANTES de correr.
docker run --rm postgres:16-alpine psql "$URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```
**Qué debes ver:** `DROP SCHEMA` y `CREATE SCHEMA`, sin ERROR.
**Si falla:** la BD puede quedar parcialmente vacía → ve al **Apéndice (Restaurar)** y restaura del backup; luego
investiga antes de reintentar.

---

## PASO 3 — Reaplicar `schema.sql` COMPLETO (recrea todo + arregla el bug 4).

```powershell
docker run --rm -v "${PWD}:/repo" postgres:16-alpine psql "$URL" -v ON_ERROR_STOP=1 -f /repo/backend/src/db/schema.sql
```
**Qué debes ver:** muchas líneas `CREATE TABLE` / `CREATE INDEX` / `INSERT` / `ALTER TABLE` y termina **sin ERROR**.
Esto deja `bitacora_notas.tipo` como `VARCHAR(40)` + el catálogo `res_estimaciones`/`res_convenios` (fix bug 4) y
siembra las cuentas/empresas **base** (5 cuentas + 3 empresas demo).
**Si falla:** lee el ERROR. Si es por una EXTENSIÓN faltante (p. ej. `pgcrypto`), créala
(`docker run --rm postgres:16-alpine psql "$URL" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"`) y reintenta el
paso. Si no, restaura del backup (Apéndice).

---

## PASO 4 — Migración de EVIDENCIA FOTOGRÁFICA (4 columnas en `estimacion_fotos`).

```powershell
docker run --rm -v "${PWD}:/repo" postgres:16-alpine psql "$URL" -v ON_ERROR_STOP=1 -f /repo/backend/scripts/migracion_estimacion_fotos.sql
```
**Qué debes ver:** **4× `ALTER TABLE`** (mime, tamano, contenido, subido_por), sin ERROR. *(Si ya integraste esas
columnas a `schema.sql` en el PASO 0, este paso es no-op idempotente — igual córrelo, no estorba.)*
**Si falla:** revisa que la tabla `estimacion_fotos` exista (la crea el PASO 3); reintenta.

---

## PASO 5 — Cargar empresas/cuentas realistas + los 24 contratos de prueba.

```powershell
# 5a) Empresas realistas (renombra las 3 base + crea 6) + cuentas (1 empresa : N cuentas):
docker run --rm -v "${PWD}:/repo" postgres:16-alpine psql "$URL" -v ON_ERROR_STOP=1 -f /repo/backend/scripts/reseed_cuentas.sql

# 5b) Los 24 contratos PRUEBA-HU-01..24 (base idéntica, varía solo el estado):
docker run --rm -v "${PWD}:/repo" postgres:16-alpine psql "$URL" -v ON_ERROR_STOP=1 -f /repo/backend/scripts/seed_demo_24.sql
```
**Qué debes ver:** en 5a, líneas `INSERT`/`UPDATE` y los `RAISE NOTICE` de cuentas por empresa. En 5b, los
`CREATE FUNCTION`, el `NOTICE  SEED 24: contratos PRUEBA-HU-01..24 sembrados.` y al final la **tabla de 24 filas**
(folio · monto 1000000.00 · estados).
**Si falla 5b** con error de tipo de nota (`res_convenios`/`res_estimaciones`): es que el PASO 3 no dejó bien el
catálogo/columna → revisa el PASO 6 (checks bug 4) y reaplica el PASO 3.

---

## PASO 6 — VERIFICAR (conteos + bug 4 resuelto + columnas de foto).

```powershell
# Conteos:
docker run --rm postgres:16-alpine psql "$URL" -c "SELECT (SELECT count(*) FROM empresas) AS empresas, (SELECT count(*) FROM usuarios) AS cuentas, (SELECT count(*) FROM contratos) AS contratos;"
docker run --rm postgres:16-alpine psql "$URL" -c "SELECT folio FROM contratos WHERE folio LIKE 'PRUEBA-HU-%' ORDER BY folio;"

# Bug 4 resuelto:
docker run --rm postgres:16-alpine psql "$URL" -c "SELECT data_type FROM information_schema.columns WHERE table_name='bitacora_notas' AND column_name='tipo';"
docker run --rm postgres:16-alpine psql "$URL" -c "SELECT clave FROM bitacora_nota_tipos WHERE clave IN ('res_estimaciones','res_convenios') ORDER BY clave;"

# Columnas de evidencia fotográfica:
docker run --rm postgres:16-alpine psql "$URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='estimacion_fotos' AND column_name IN ('mime','tamano','contenido','subido_por') ORDER BY column_name;"

# Empresas realistas (deben ser 9, sin basura E2E):
docker run --rm postgres:16-alpine psql "$URL" -c "SELECT nombre, tipo FROM empresas ORDER BY tipo, nombre;"
```
**Qué debes ver (todo OK):**
- `empresas = 9` · `contratos = 24` · `cuentas ≈ 21` (5-6 base + extras del reseed).
- 24 folios `PRUEBA-HU-01 … PRUEBA-HU-24`.
- `data_type = character varying` (bug 4 ✅) y **2 filas** `res_convenios`, `res_estimaciones` (catálogo ✅).
- **4 columnas** `contenido(bytea)`, `mime(text)`, `subido_por(integer)`, `tamano(integer)` (fotos ✅).
- Las 9 empresas con nombres realistas (Secretaría de Obras Públicas…, Constructora del Bajío…, etc.), **sin**
  "Constructora O3 / Empresa Alpha / Grupo Mismo" (esas eran basura del e2e y desaparecen con el DROP SCHEMA).

Si todo cuadra → **Render queda limpio, con datos realistas, los 24 contratos, el bug 4 resuelto y la evidencia
fotográfica lista.** Haz el smoke en la app (PASO 0.4).

---

## Apéndice — RESTAURAR del backup (si algo sale mal a media)

```powershell
# Vuelve al estado del backup del PASO 1 (rehace el schema vacío y aplica el dump).
docker run --rm postgres:16-alpine psql "$URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker run --rm -v "${PWD}:/repo" postgres:16-alpine psql "$URL" -v ON_ERROR_STOP=1 -f "/repo/backup_render_$fecha.sql"
```
*(El backup es un dump en texto plano; se restaura sobre un schema vacío.)* Tras restaurar, la app vuelve al estado
previo. Investiga el fallo antes de reintentar el runbook.

---

### Resumen del orden (para no equivocarte)
**CÓDIGO:** integrar a main → `git push` → Render Manual Deploy → verificar /api/health.
**BD:** (1) backup+verificar → (2) 🔴 DROP SCHEMA → (3) schema.sql → (4) migración fotos → (5) reseed + seed_24 →
(6) verificar. **Backup del (1) verificado ANTES del (2).** Nada de otro deploy mientras corre la BD.
