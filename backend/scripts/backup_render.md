# Runbook — Continuidad de la BD de Render (Oleada 0, 9 jun 2026)

> **Contexto:** la instancia PostgreSQL **gratuita** de Render **expira el 25 de junio**; la entrega al profe es ~**28 de junio**. Este runbook garantiza que los datos sobrevivan: respaldo diario desde ya + dos caminos para el día 24–25. **Nada de aquí toca producción por sí solo: cada comando contra Render lo corre Maiki a mano.**

## Resumen de decisión

| Camino | Qué es | Costo | Riesgo |
|---|---|---|---|
| **A. Pagar el Postgres en Render** | Upgrade del plan de la instancia actual (dashboard → la BD → *Upgrade*) | ~7 USD/mes (plan básico) | Mínimo: no cambia nada (misma URL, cero migración) |
| **B. Instancia gratuita nueva + restore** | Crear otra BD free el 24, restaurar el dump, cambiar `DATABASE_URL` | $0 | Medio: ventana de corte + hay que ensayarlo ANTES (ya está ensayado en local, ver §5) |

**Recomendación:** si hay presupuesto mínimo, **camino A** (un mes cubre la entrega y nadie migra nada a 3 días de entregar). Si no, **camino B siguiendo §4 al pie de la letra el 24 de junio** (no el 25: si algo sale mal queda un día de colchón).

**En cualquiera de los dos: correr el respaldo diario (§2) desde HOY.** El plan A también puede fallar por error humano; el dump diario es el seguro de ambos.

---

## 1. Requisitos

- Docker Desktop corriendo (los scripts usan la imagen `postgres:16-alpine`; no hace falta PostgreSQL instalado en Windows).
- `backend/.env` con el `DATABASE_URL` **externo** de Render (ya existe; es el mismo que usa el runbook de migraciones).
- Compatibilidad de versiones: el cliente `pg_dump` debe ser **>= versión del servidor**. Verificar la del servidor:
  ```powershell
  # (lee DATABASE_URL de backend/.env manualmente para este one-liner)
  docker run --rm postgres:16-alpine psql "<DATABASE_URL>" -tAc "SHOW server_version;"
  ```
  Si Render reporta 17.x, pasar `-ImagenPg postgres:17-alpine` a los scripts. (Local somos 16: `docker-compose.yml` usa `postgres:16-alpine`.)

## 2. Respaldo diario (correr desde HOY hasta la entrega)

```powershell
.\backend\scripts\backup_render.ps1
```

- Lee `DATABASE_URL` de `backend/.env` (o acepta `-DatabaseUrl "postgresql://..."`).
- Genera `backend/backups/sigecop_render_YYYYMMDD_HHmmss.dump` en **formato custom (`-Fc`)**: comprimido y restaurable con `pg_restore` (total o por tabla).
- Auto-verifica: tamaño > 0 y `pg_restore --list` legible.
- `backend/backups/` y `*.dump` están **gitignored** — los dumps traen datos reales (cuentas, contratos): jamás al repo, jamás a un chat.
- Antes de cualquier evento riesgoso (migración, deploy grande) correr uno extra con etiqueta: `.\backend\scripts\backup_render.ps1 -Etiqueta "pre_migracion"`.

> Automatizarlo (opcional): Programador de tareas de Windows → tarea diaria 9:00 → programa `powershell.exe` → argumentos `-NoProfile -ExecutionPolicy Bypass -File "C:\Users\migue\Downloads\Proyectofepy\sigecop\backend\scripts\backup_render.ps1"`. Requiere la PC encendida y Docker Desktop corriendo; si no, correrlo a mano cada mañana (30 segundos).

## 3. Restore a una instancia (comando)

```powershell
.\backend\scripts\restore_render.ps1 -Dump "backend\backups\sigecop_render_<stamp>.dump" -DestinoUrl "postgresql://<usuario>:<pass>@<host>/<db_nueva>"
```

- Usa `pg_restore --clean --if-exists --no-owner --no-privileges`: recrea los objetos del dump y deja como dueño al rol de la URL destino (en Render el usuario de la instancia nueva es distinto al de la vieja — por eso `--no-owner` es obligatorio).
- ⚠️ **Destructivo sobre el destino.** Solo apuntarlo a la instancia NUEVA/vacía.

## 4. Plan B completo — migrar a instancia gratuita nueva (correr el 24 de junio)

1. **Dump fresco** de la instancia vieja: `.\backend\scripts\backup_render.ps1 -Etiqueta "migracion_final"`. Anotar conteos de verificación (ver §6) contra la BD vieja.
2. **Crear la instancia nueva** en Render: dashboard → *New* → *PostgreSQL* → mismo region que el backend → plan Free. Copiar su **External Database URL** (para el restore desde la PC) y su **Internal Database URL** (para el backend, si el servicio usa la interna).
3. **Restore**: §3 con la External URL nueva como `-DestinoUrl`.
4. **Verificar** (§6) contra la BD nueva: los conteos deben ser idénticos a los del paso 1.
5. **Apuntar el backend**: dashboard de Render → servicio del backend → *Environment* → reemplazar `DATABASE_URL` por la URL nueva (la interna si es la que estaba). Render redespliega solo al guardar; si no, *Manual Deploy*.
   - **Gotcha `RUN_MIGRATIONS`**: si está `true`, el deploy re-aplica `schema.sql` sobre la BD restaurada. Las migraciones son idempotentes (regla del proyecto), así que no rompe; aun así, el orden correcto es restore → verificar → recién entonces redeploy.
6. **Actualizar `backend/.env` local** con la URL externa nueva (los scripts y migraciones locales apuntan ahí).
7. **Smoke en producción**: login con cuenta demo → Registrados muestra los contratos → abrir un expediente → historial de estimaciones carga. Si algo falla, la instancia vieja sigue viva hasta el 25: re-apuntar `DATABASE_URL` a la vieja revierte todo.
8. La instancia vieja se deja morir el 25 (no borrarla a mano antes del smoke OK).

## 5. Ensayo local (ya ejecutado, 9 jun 2026)

Para no improvisar el restore el 24, el flujo §3 se ensayó completo contra el stack local de Docker:

```powershell
# 1) dump de la BD local (mismo formato -Fc que produce backup_render.ps1)
docker exec sigecop_db pg_dump -U sigecop -d sigecop_db -Fc -f /tmp/ensayo_o0.dump

# 2) BD vacía de destino
docker exec sigecop_db psql -U sigecop -d postgres -c "CREATE DATABASE sigecop_restore_test;"

# 3) restore con las MISMAS banderas que restore_render.ps1
docker exec sigecop_db pg_restore --clean --if-exists --no-owner --no-privileges -U sigecop -d sigecop_restore_test /tmp/ensayo_o0.dump

# 4) conteos por tabla en origen y destino (ver §6) → deben coincidir
# 5) limpieza
docker exec sigecop_db psql -U sigecop -d postgres -c "DROP DATABASE sigecop_restore_test;"
```

Resultado del ensayo: ver `docs/historial-cambios/OLEADA0_continuidad_bd_09jun.md` (conteos idénticos origen/destino en todas las tablas).

## 6. Verificación de un restore (conteos por tabla)

```powershell
# contra cualquier BD: cambia la URL/credenciales según destino
docker run --rm -e PGSSLMODE=require postgres:16-alpine psql "<URL>" -tAc "SELECT relname || '=' || (xpath('/row/cnt/text()', query_to_xml('SELECT COUNT(*) AS cnt FROM ' || quote_ident(relname), false, true, '')))[1]::text FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY relname;"
```

Devuelve `tabla=conteo` por cada tabla de `public` (conteo EXACTO, no estimado). Comparar la salida origen vs destino: deben ser idénticas. Las tablas que más importan: `usuarios`, `contratos`, `contrato_conceptos`, `contrato_roster`, `bitacoras` y sus notas/firmas, `estimaciones`, `pagos`, `convenios` — pero la consulta las cubre todas, no elegir a mano.
