# Oleada 0 — Continuidad de la BD de Render (9-10 jun 2026)

> **Contexto:** el PostgreSQL gratuito de Render expira el **25 de junio**; la entrega es ~**28 de junio**. Esta oleada deja listo el seguro: respaldo diario reproducible + restore ENSAYADO (no improvisado el 24). **No se tocó la BD de producción** (instrucción de Maiki: los comandos contra Render los corre él).

## Entregables

| Archivo | Qué es |
|---|---|
| `backend/scripts/backup_render.md` | **Runbook completo**: decisión A (pagar plan) vs B (instancia nueva + restore), respaldo diario, restore, plan B paso a paso para el 24-jun, verificación por conteos |
| `backend/scripts/backup_render.ps1` | Script de respaldo: `pg_dump -Fc` parametrizado por `DATABASE_URL` (lo lee de `backend/.env`), vía imagen Docker `postgres:16-alpine` (sin instalar nada en Windows), con auto-verificación (`pg_restore --list`) |
| `backend/scripts/restore_render.ps1` | Script de restore a instancia nueva: `pg_restore --clean --if-exists --no-owner --no-privileges` |
| `.gitignore` | + `backend/backups/` y `*.dump` (los dumps traen datos reales; jamás al repo) |

## Ensayo local ejecutado (9-10 jun) — restore VERIFICADO

Flujo completo contra el stack local de Docker (mismas banderas que los scripts):

1. `pg_dump -Fc` de `sigecop_db` → `/tmp/ensayo_o0.dump`.
2. `CREATE DATABASE sigecop_restore_test` (vacía).
3. `pg_restore --clean --if-exists --no-owner --no-privileges` → **exit 0**.
4. Conteo EXACTO por tabla en origen y destino (consulta del runbook §6): **32 tablas, conteos idénticos en todas**. Muestra: `contratos=1087`, `contrato_conceptos=1088`, `contrato_roster=2932`, `bitacora_notas=497`, `estimaciones=67`, `pagos=32`, `usuarios=51`.
5. Limpieza: `DROP DATABASE sigecop_restore_test` y borrado del dump temporal.

## Qué le toca a Maiki (decisiones)

1. **HOY**: correr el primer respaldo real: `.\backend\scripts\backup_render.ps1` (es `pg_dump`, solo lectura) y repetirlo a diario (o programarlo, runbook §2).
2. **Decidir el camino** (runbook, tabla de decisión): **A** pagar el mes del Postgres (recomendado si hay ~7 USD: cero migración a 3 días de la entrega) o **B** instancia gratuita nueva + restore **el 24 de junio** siguiendo §4 (ya ensayado).
3. La verificación de versión del servidor de Render (§1) antes del primer dump: si es 17.x, pasar `-ImagenPg postgres:17-alpine`.

## Decisiones tomadas (y por qué)

- **Formato custom (`-Fc`)**: comprimido y restaurable total o por tabla con `pg_restore` (un `.sql` plano no permite restore selectivo ni `--clean` confiable).
- **Cliente vía imagen Docker**: la PC no necesita PostgreSQL instalado; la versión del cliente se controla por parámetro (regla pg_dump ≥ servidor).
- **`--no-owner --no-privileges`**: en Render la instancia nueva tiene un usuario distinto; sin estas banderas el restore truena con errores de ownership.
- **Verificación por conteos exactos** (no `n_live_tup`, que es estimado y sale en 0 tras un restore sin ANALYZE): consulta única que cubre TODAS las tablas de `public`, sin lista manual que se desactualice.
- **No se corrió `pg_dump` contra Render desde esta sesión**: aunque es de solo lectura, la instrucción de O0 fue explícita ("NO toques la BD de producción sin que yo lo corra").
