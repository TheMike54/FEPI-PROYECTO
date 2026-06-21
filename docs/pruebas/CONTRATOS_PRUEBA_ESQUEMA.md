# CONTRATOS DE PRUEBA — ESQUEMA (24 contratos, base idéntica) · 21-jun

> **Experimento controlado para la demo del profe.** 24 contratos `PRUEBA-HU-01 … PRUEBA-HU-24`, uno por HU.
> Los 24 comparten una **base IDÉNTICA** (mismo monto, mismos 3 conceptos, mismo programa, mismas empresas/
> cuentas, mismas fechas). **Lo ÚNICO que cambia es el ESTADO** del ciclo que demuestra cada HU. Así el profe no
> puede decir "este salió distinto por los datos": la única variable es la etapa.
>
> **Seed:** `backend/scripts/seed_demo_24.sql` (idempotente, cuadre EXACTO al centavo, validado en LOCAL 21-jun:
> 24/24 sembrados, neto 208,500 / 278,000). **NO ejecutado en Render todavía** (eso es la fase BD, con backup —
> ver §Runbook). **Decisión de presentación:** un solo doc maestro (este) + el checklist imprimible
> `PLAN_PRUEBAS_24_CONTRATOS.md`; NO 24 archivos sueltos (más usable).

---

## 1. DATASET BASE (idéntico en los 24)
| Campo | Valor |
|---|---|
| Monto | **$1,000,000.00** = Σ ROUND(cant×pu) |
| Conceptos (3) | `CONC-01` Terracerías · m³ · 1000 × 300 = **300,000** · `CONC-02` Cimentación · m³ · 200 × 1500 = **300,000** · `CONC-03` Estructura y obra negra · lote · 1 × 400000 = **400,000** |
| Anticipo | **30 %** = $300,000.00 |
| Periodos (3) | P1 2026-03 · P2 2026-04 · P3 2026-05 (mensuales, **vencidos** vs hoy) |
| Programa | C1→P1 (1000) · C2→P2 (200) · C3→P3 (1) — 100 % cada concepto en su periodo |
| Plan de amortización (art. 143 fr. I) | P1 90,000 · P2 90,000 · P3 120,000 (Σ 300,000) |
| Garantías | cumplimiento 100,000 · anticipo 300,000 · vicios 100,000 (vigencias futuras) |
| Roster (art. 125) | residente · superintendente · supervisión (la dependencia no firma) |
| Empresas (tripleta del contrato) | Dependencia: **Secretaría de Obras Públicas del Estado de Guerrero** · Contratista: **Constructora del Bajío, S.A. de C.V.** · Supervisión: **Supervisión Técnica Integral, S.C.** |
| Cuadre por estimación | subtotal − ROUND(subtotal×0.30,2) − ROUND(subtotal×0.005,2) = neto. **300,000 → neto 208,500.00** · **400,000 → neto 278,000.00** |

> Las **9 empresas realistas** (3 dependencias / 3 contratistas / 3 supervisiones, 1 empresa : N cuentas) y las
> cuentas están en `backend/scripts/reseed_cuentas.sql` (renombradas al final, conservando los `empresa_id`) y se
> listan en `docs/Cuentas_Prueba_SIGECOP.md` (gitignored). Contraseña de todas: `Sigecop2026!`.

---

## 2. TABLA DE LOS 24 (folio · HU · estado · QUÉ CAMBIA vs base · pantalla · rol)

| Folio | HU | Estado pre-cargado | Qué cambia respecto a la base | Pantalla (sidebar) | Rol para verlo |
|---|---|---|---|---|---|
| PRUEBA-HU-01 | HU-01 Alta | base, **sin** bitácora ni estimaciones | nada (recién dado de alta) | Alta de contrato / Expediente | residente |
| PRUEBA-HU-02 | HU-02 Fianzas | base + **endoso** en cumplimiento | +1 endoso (art. 91) | Fianzas / garantías | dependencia |
| PRUEBA-HU-03 | HU-03 Convenios | base + bitácora + **convenio de plazo** (90→120 d) | +bitácora, +convenio+nota | Convenios | dependencia |
| PRUEBA-HU-04 | HU-04 Expediente | base + bitácora + **est. #1 pagada** | +bitácora, +avance C1, +1 estimación pagada | Expediente | residente |
| PRUEBA-HU-05 | HU-05 Curva | base + **avance al corriente** (3 conceptos 100 %) | +avance completo (sin atraso) | Curva de avance | residente |
| PRUEBA-HU-06 | HU-06 Registrar avance | base + bitácora + **avance parcial** C1 (600/1000) | +bitácora, +avance parcial | Registrar avance | contratista |
| PRUEBA-HU-07 | HU-07 Atraso | base + bitácora + **avance bajo** C1 (100/1000) | +bitácora, +avance deficitario → **déficit 900** | Atrasos | residente |
| PRUEBA-HU-08 | HU-08 Apertura | base **sin** bitácora | nada extra (lista para abrir bitácora) | Bitácora (wizard) | residente |
| PRUEBA-HU-09 | HU-09 Emitir notas | base + **bitácora abierta y firmada** | +bitácora firmada | Bitácora → emitir | residente |
| PRUEBA-HU-10 | HU-10 Consultar notas | base + bitácora + **nota de avance firmada** | +bitácora, +1 nota firmada | Consultar notas | residente |
| PRUEBA-HU-11 | HU-11 Minutas | base + bitácora + **1 minuta + 1 visita** | +bitácora, +minuta, +visita | Minutas y visitas | residente |
| PRUEBA-HU-12 | HU-12 Integrar | base + bitácora + **avance C1, SIN estimación** | +bitácora, +avance (periodo listo para integrar) | Integrar (wizard) | contratista |
| PRUEBA-HU-13 | HU-13 Presentar | base + **est. #1 INTEGRADA** | +bitácora, +avance, +1 estimación integrada | Presentar | contratista |
| PRUEBA-HU-14 | HU-14 Historial | base + **est. #1 pagada, #2 autorizada, #3 enviada** | +bitácora, +avance 3, +3 estimaciones (3 estados) | Historial | residente |
| PRUEBA-HU-15 | HU-15 Revisión | base + **est. #1 PRESENTADA (enviada)** | +bitácora, +avance, +1 estimación enviada | Revisión | supervisión → residente |
| PRUEBA-HU-16 | HU-16 Reingreso | base + **est. #1 RECHAZADA** | +bitácora, +avance, +1 estimación rechazada + observación | Reingreso | contratista |
| PRUEBA-HU-17 | HU-17 Tablero | base + **est. #1 pagada, #2 autorizada** | +bitácora, +avance 2, +2 estimaciones | Tablero | residente |
| PRUEBA-HU-18 | HU-18 Portafolio | base + **avance al corriente** (semáforo) | +avance (semáforo verde) | Portafolio | dependencia |
| PRUEBA-HU-19 | HU-19 Reportes | base + bitácora + **est. #1 pagada** | +bitácora, +avance, +1 estimación pagada | Reportes | residente |
| PRUEBA-HU-20 | HU-20 Tránsito a pago | base + **est. #1 AUTORIZADA** | +bitácora, +avance, +1 estimación autorizada | Tránsito y pago | contratista / finanzas |
| PRUEBA-HU-21 | HU-21 Registrar pago | base + **est. #1 AUTORIZADA** | +bitácora, +avance, +1 estimación autorizada | Registro del pago | finanzas |
| PRUEBA-HU-22 | HU-22 Roster | base (roster cargado) | nada extra (listo para sustituir) | Roster / sustitución | dependencia / residente |
| PRUEBA-HU-23 | HU-23 Padrón | base (la empresa entra al catálogo) | nada extra | Padrón de empresas | dependencia |
| PRUEBA-HU-24 | HU-24 Finiquito | base + bitácora + **3 estimaciones PAGADAS** | +bitácora, +avance 3, +3 estimaciones pagadas (todo cobrado) | Cierre / finiquito | dependencia / residente |

> **Cómo navegar en la demo:** elige el contrato por su folio en el modal "Elige tu contrato" (el `objeto` dice la
> HU), entra con el **rol** indicado, y ve a la **pantalla** del sidebar. El chip de HU de la pantalla confirma
> dónde estás (p. ej. "Avance · HU-05"). El detalle "qué revisar para confirmar" está en
> `PLAN_PRUEBAS_24_CONTRATOS.md`.

---

## 3. POR QUÉ ES ROBUSTO (no choca al re-correr)
- **Limpieza con `TRUNCATE … CASCADE`**, no `reset:demo` (que solo borra `OBRA-2026-%` y deja la basura `E2E-*`).
- **Orden de dependencias** respetado dentro del seed (contrato→conceptos→periodos→programa→garantías→roster→
  bitácora→avance→estimación→pago→convenio→finiquito) — las FKs `NO ACTION` no abortan.
- **Idempotente:** el seed borra al inicio los `PRUEBA-HU-%` (hijos en orden) y los recrea; correr N veces = mismo
  resultado.
- **Requiere el esquema con el bug-4 migrado** (`bitacora_notas.tipo` VARCHAR + catálogo `res_convenios`/
  `res_estimaciones`): por eso el runbook **re-aplica `schema.sql` antes de sembrar** en Render.

---

## 4. RUNBOOK

### 4.1 LOCAL (validado 21-jun)
```bash
# 1. Limpiar contratos (conserva cuentas/empresas). 2. Empresas realistas + cuentas. 3. Los 24 contratos.
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c "TRUNCATE contratos CASCADE;"
docker exec sigecop_backend npm run reseed:cuentas
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -v ON_ERROR_STOP=1 < backend/scripts/seed_demo_24.sql
# (opcional) limpiar también la basura E2E de empresas/cuentas para un padrón limpio:
#   docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c "TRUNCATE usuarios, empresas CASCADE;"
#   docker restart sigecop_backend   # re-aplica schema.sql (cuentas/empresas base) si RUN_MIGRATIONS=true
#   docker exec sigecop_backend npm run reseed:cuentas && docker exec -i sigecop_db psql ... < backend/scripts/seed_demo_24.sql
```

### 4.2 RENDER (DESTRUCTIVO — BACKUP PRIMERO; NO ejecutar hasta la fase BD)
> Patrón `docker run --rm postgres:16-alpine` contra la **External Database URL**. `$URL` = esa URL.
```powershell
$URL = "<EXTERNAL_DATABASE_URL_de_Render>"
# (a) BACKUP — PRIMERO, no destructivo:
docker run --rm postgres:16-alpine pg_dump "$URL" | Out-File -Encoding utf8 ".\backup_render_2026-06-21.sql"
(Get-Item .\backup_render_2026-06-21.sql).Length    # debe ser > 0
# (b) 🔴 DESTRUCTIVO — limpieza total (incl. usuarios/empresas viejos):
docker run --rm postgres:16-alpine psql "$URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
# (c) Re-crear esquema (estructura + cuentas/empresas base + FIX bug-4: tipo VARCHAR + catálogo):
Get-Content .\backend\src\db\schema.sql -Raw | docker run --rm -i postgres:16-alpine psql "$URL" -v ON_ERROR_STOP=1
# (d) Empresas realistas + cuentas, luego los 24 contratos de prueba:
Get-Content .\backend\scripts\reseed_cuentas.sql -Raw | docker run --rm -i postgres:16-alpine psql "$URL" -v ON_ERROR_STOP=1
Get-Content .\backend\scripts\seed_demo_24.sql   -Raw | docker run --rm -i postgres:16-alpine psql "$URL" -v ON_ERROR_STOP=1
# (e) Verificar:
docker run --rm postgres:16-alpine psql "$URL" -c "SELECT count(*) FROM empresas; SELECT count(*) FROM usuarios; SELECT folio FROM contratos ORDER BY folio;"
docker run --rm postgres:16-alpine psql "$URL" -c "SELECT data_type FROM information_schema.columns WHERE table_name='bitacora_notas' AND column_name='tipo';"  # 'character varying' = bug-4 ok
```
**Esperado:** empresas = 9, contratos = 24 (`PRUEBA-HU-01..24`), `bitacora_notas.tipo = character varying`.

---

## 5. NOTAS / ZONA CONGELADA
- **No toca zona congelada de código.** Los archivos son `backend/scripts/*.sql` (seed) + docs. `schema.sql` (congelado)
  **NO se edita**: el runbook solo lo **re-aplica** tal cual (runbook aprobado), lo que de paso arregla el bug-4.
- **Bug-4** queda resuelto al re-aplicar `schema.sql` en Render (paso c). En LOCAL ya está migrado.
- **Validado en LOCAL** (no en Render). La ejecución en Render la hace Maiki con backup (fase BD).
- El seed reusa las **cuentas demo** (`residente@`/`contratista@`/`supervision@`/`dependencia@`/`finanzas@`) para los
  24 → la tripleta del contrato es Secretaría de Obras Públicas / Constructora del Bajío / Supervisión Técnica Integral.
