# Plan — Re-seed "demo del profe" (22-jun) · SOLO DATOS

> **Objetivo:** dejar la BD demo limpia y realista para la revisión de mañana. **No toca** schema.sql,
> controllers ni backend: es **puro DATOS** (purga de basura + re-seed de los 24 contratos).
> **Estado:** script **listo y verificado en seco**; **NO ejecutado** (lo corres tú). No se tocó Render.

## Archivos entregados
| Archivo | Qué es |
|---|---|
| `backend/scripts/seed_demo_profe.sql` | El re-seed (idempotente; el que se corre). |
| `docs/pruebas/MAPA_DEMO_PROFE.md` | Mapa folio↔HU: qué contrato abrir y con qué cuenta para cada historia. |

## ¿Reusa o es nuevo?
**Nuevo**, pero **calcado del patrón probado de `seed_demo_24.sql`** (mismos helpers `f_base/f_bitacora/f_avance/f_estim`, ampliados). **Reemplaza** a `seed_demo_24` para la demo (folios `OP-2026-%` en vez de `PRUEBA-HU-%`; la Parte 2 limpia ambos prefijos, así que conviven sin choque). **Requiere** que `reseed_cuentas.sql` se haya corrido antes (de ahí salen las 10 empresas realistas y las cuentas; el script NO las recrea, solo las usa y renombra las 5 canónicas).

## Qué siembra exactamente (verificado en el dry-run)
- **Purga (⚠️ destructiva, acotada a residuo e2e):** 380 usuarios basura (nombre con timestamp o pendientes `@sigecop.test`) + 191 empresas basura (nombre con timestamp). Resultado: **0 empresas basura, 0 solicitudes pendientes** → la campana deja de marcar ~187 y el selector de empresa queda limpio.
- **Cuentas canónicas renombradas** a nombres realistas (se va el "…Demo"): Residente=Ing. Roberto Salazar, Contratista=Ing. Carlos Méndez, Supervisión=Arq. Mónica Vázquez, Dependencia=Lic. Diana Herrera, Finanzas=C.P. Fernando Ríos. (Mismos correos/contraseñas.)
- **24 contratos `OP-2026-0001..0024`** con objetos realistas de obra (aulas, laboratorio, biblioteca…) y **fechas relativas a hoy** (inicio hoy−60, término hoy+29 → P1 vencido / P2 en curso / P3 por venir). La matriz ya **no** sale toda roja.
- **Estados representativos:** vigentes con avance parcial, atrasado real (OP-0007), ciclo de estimación completo (OP-0014), pagados (OP-0004/05/19), y **1 CERRADO con finiquito** (OP-0024).
- **Garantías por vencer** en OP-0002 (~3 rojo / ~12 ámbar / ~25 amarillo días) → el semáforo de fianzas se ve.
- **"Por firmar":** OP-0022 y OP-0023 con apertura **sin firmar** (2 aperturas pendientes).
- **Techo presupuestal 2026** (ejercicio 2026 / dependencia / partida 62201, techo $50,000,000) → el Tránsito a pago **no se atora**.
- **Notas variadas** en OP-0009 (avance/aviso/calidad) y OP-0010 (avance/junta) → el libro y el buscador tienen contenido.
- **Convenio de monto** en OP-0003 ($1,000,000→$1,060,000) con **versiones del programa** (v1 sustituida + v2 vigente) → la tabla "Versiones del programa" deja de salir vacía.

> **Verificación ya hecha:** corrí el script entero envuelto en `BEGIN … ROLLBACK` contra la BD local
> (no persistió nada): **0 errores**, los 8 chequeos en verde (ver tabla arriba). El SQL, las FKs y los
> triggers de inmutabilidad pasan.

## ⚠️ Pasos destructivos (marcados)
- **Parte 0** borra usuarios y empresas basura. Guardas: nunca toca las 5 cuentas canónicas ni una cuenta referenciada por un contrato; solo borra nombres con timestamp o pendientes `@sigecop.test`. Confirmado: 0 de esos usuarios están referenciados por contratos.
- **Parte 2** borra y recrea los contratos demo (`OP-2026-%` y `PRUEBA-HU-%`). Idempotente.

## Cómo correrlo — LOCAL (lo que harás tú)
**Opción A (recomendada, in-place):** sobre la BD local actual, sin reiniciar el stack.
```bash
# (opcional pero sano) respaldo local antes:
docker exec -i sigecop_db pg_dump -U sigecop sigecop_db > backup_local_$(date +%Y%m%d_%H%M).sql
# correr el re-seed:
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 -f - < backend/scripts/seed_demo_profe.sql
```
> Tip: si prefieres una BD **impecable desde cero** (sin ningún residuo): `docker compose down -v && docker compose up --build -d`, espera a que levante, luego `npm run reseed:cuentas` (o el psql equivalente) y **después** este script. Eso es reset total de datos local (no toca schema.sql, solo lo reaplica).

## Cómo correrlo — RENDER (cuando lo decidas; hoy NO)
1. **Backup primero** (obligatorio): `pg_dump` de la BD de Render (runbook habitual).
2. Correr el script con `psql --single-transaction -v ON_ERROR_STOP=1` contra `DATABASE_URL` de Render (todo o nada; si algo falla, no deja a medias).
3. Verificar con los SELECT del final del script (van incluidos).
> El script es idempotente y Render-safe (la purga y el re-seed se pueden repetir). El `down -v` **no** aplica a Render (su BD persiste) → en Render se usa la purga in-place que ya trae el script.

## Decisiones que tomé (datos, con criterio)
- **Folios `OP-2026-0001..0024`** 1:1 con HU-01..24; la trazabilidad HU↔folio vive solo en el mapa (el objeto en pantalla es una obra realista, sin "HU").
- **Monto de OP-0003 = $1,060,000** (lo sube el convenio): rompe a propósito la "base idéntica" del seed viejo para que el portafolio no se vea "de juguete" (todos iguales) — la auditoría lo señaló.
- **Semáforo de revisión en verde:** estimaciones presentadas hace 3 días (dentro de los 15) → no salen "Vencido".
- **No incluí "empresas por validar"** (la auditoría lo sugería pero tú no lo pediste). Si lo quieres para lucir el validar/fusionar del padrón (HU-23), te agrego 1-2 empresas `por_validar` en 2 líneas — dime.

## Lo que ESTE re-seed NO arregla (son de UI, no de datos)
Quedan para el otro frente (barrido de texto / colores), no son parte de este script:
- Códigos "HU-XX" impresos (chip de pestañas, banners) → bloque B de `AUDITORIA_OJOS_DEL_PROFE_22jun.md`.
- Colores de la matriz vs leyenda (tokens de texto como relleno) → bloque C.
