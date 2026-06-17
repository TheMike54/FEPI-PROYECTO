# REPORTE — Sesión autónoma E2 (18-jun-2026)

> **Plan ejecutado:** `docs/planes/PLAN_SESION_AUTONOMA_E2_18jun.md`.
> **Modo:** autónomo, **LOCAL sin commit/push** (Maiki revisa el diff e integra).
> **Resultado:** ✅ cerradas las **dos últimas maquetas** del catálogo (HU-02 Fianzas, HU-11
> Minutas/visitas) con backend real. Suite **267 passed / 8 skipped / 0 failed**.

---

## 1. Qué se hizo (por fase)

### FASE 1 — HU-02 Fianzas (maqueta → funcional)
- **Backend nuevo:** `garantias.controller.js` + `garantias.routes.js` (CRUD de garantías + endosos + PDF).
  Montado en `server.js` como `/api/garantias`.
- Una garantía **por tipo** (cumplimiento / anticipo / vicios ocultos) — la tabla ya tenía `UNIQUE
  (contrato_id, tipo)`; el controller mapea el choque a **409**.
- Validaciones server-side: tipo requerido, monto > 0 y **≤ monto del contrato**, vigencia no vencida.
- **PDF real** de la póliza (BYTEA inline, mismo patrón que `minutas`); multer memoryStorage 10MB,
  revalida los magic bytes `%PDF`.
- **Endoso** (ajuste por modificación de monto/plazo) en `garantia_endosos`.
- **Frontend:** `RegistroFianzas.jsx` reescrito (selector de contrato, modal de póliza, modal de endoso,
  tabla con 👁 Ver PDF, tarjetas de vigencia, gating por `soloLectura`).
- **Migración aditiva** en `schema.sql`: `ADD COLUMN IF NOT EXISTS` para `pdf_*` + `registrado_por` sobre
  `contrato_garantias`.

### FASE 2 — HU-11 Minutas/visitas/acuerdos (maqueta → funcional)
- **Backend nuevo:** `minutas.controller.js` + `minutas.routes.js`. Montado como `/api/minutas`.
- Minutas y visitas **persisten** (acotadas por contrato, autor de la sesión); **PDF real** de la minuta;
  **vínculo** minuta/visita → nota de la bitácora (`nota_id`) **sin modificar la nota** (relación, no
  edición → trigger de inmutabilidad intacto).
- Pestaña **Acuerdos** ahora **deriva** de las minutas reales (antes lista estática).
- **Frontend:** `MinutasVisitas.jsx` reescrito (selector de contrato, 3 pestañas, modal de adjuntar a nota
  real).
- **Migración aditiva** en `schema.sql`: `minutas.participantes`; `visitas.lugar / responsable / nota_id`.

### FASE 3 — Seed
- `seed_demo.sql` ahora deja, en `OBRA-2026-DEMO-01`: la póliza de **cumplimiento con PDF + 1 endoso**, una
  **minuta con PDF ligada a una nota**, y una **visita agendada**.
- Idempotencia: se agregó el `DELETE FROM minutas/visitas` al bloque de borrado (FK `nota_id` NO ACTION).

### FASE 4 — Finiquito
- Verificado que HU-24 (finiquito) sigue **verde** tras los cambios (sin regresión).

### FASE 5 — Guion de prueba
- `docs/GUION_PRUEBA_COMPLETO_18jun.md`: checklist imprimible con preparación de ambiente, recorrido por HU
  con el dato sembrado, **flujos nuevos paso a paso** (HU-02 / HU-11 / HU-24), pruebas negativas ⭐ y la
  tabla de valores cuadrados al centavo.

---

## 2. Verificación adversarial (UltraCode) y correcciones aplicadas

Se corrió un workflow de verificación adversarial (3 agentes, lectura del código real + cotejo del texto
**literal** del Reglamento con `pdftotext`). Veredicto: **sólido para integrar, con correcciones**. Todas
aplicadas:

| # | Hallazgo | Severidad | Acción aplicada |
|---|---|---|---|
| 1 | **Cita legal FALSA (HU-11):** `art. 123 fr. III` (que es la **nota de apertura**) usado para fundamentar el **vínculo de minutas**. El correcto es **fr. X** (*"ratificar en la Bitácora las instrucciones… minutas…"*). | **Obligatoria** | Reemplazado **fr. III → fr. X** en 6 sitios: `minutas.controller.js`, `minutas.routes.js`, `MinutasVisitas.jsx` (×3), `schema.sql` (bloque HU-11), `minutas-crud.spec.js`, `server.js` (comentario), `SEED_DEMO_SIGECOP.md`. Se conservó **fr. VI** (inmutabilidad), que sí es correcta. |
| 2 | **Bug menor (HU-11):** `crearVisita` no escribía `registrada_por` (perdía la auditoría de quién agendó). | **Obligatoria** | Añadido `registrada_por = req.user.id` al INSERT de visitas. **Smoke:** la visita ahora guarda `registrada_por`. |
| 3 | **Inconsistencia de cita (HU-02):** el endoso citaba `art. 91 RLOPSRM` en controller/front/seed, pero la cabecera de `garantia_endosos` cita `art. 98 fr. II/99`. No es contradicción (el art. 91 **remite** a 98 fr. II). | Recomendada | Aclarado en la cabecera del controller y en la nota legal de la página: *"art. 91 RLOPSRM, que remite a la fr. II del art. 98"*. |

Citas verificadas como **correctas y literales**: art. 48 LOPSRM, art. 66 LOPSRM, art. 91 RLOPSRM,
art. 98 fr. II RLOPSRM, art. 123 fr. VI RLOPSRM, art. 123 fr. X RLOPSRM. **Cero citas inventadas.**

---

## 3. Punto de control — suite

| Momento | Resultado |
|---|---|
| Tras FASES 1–4 (HU-02 + HU-11 + seed + finiquito) | **267 / 8 / 0** ✅ |
| Tras correcciones adversariales (fr. X + `registrada_por` + endoso) | **267 / 8 / 0** ✅ (6.7 min) |

---

## 4. Toques a ZONA CONGELADA (para revisión línea por línea de Maiki)

Solo en las **dos formas permitidas** por el plan/CLAUDE.md (montar router + migración aditiva idempotente)
y **correcciones de comentario** (cero lógica):

| Archivo | Qué se tocó | Tipo |
|---|---|---|
| `backend/server.js` | `require` + `app.use('/api/garantias', …)` y `app.use('/api/minutas', …)` (montaje); comentario de cita fr. III→fr. X | Montaje + comentario |
| `backend/src/db/schema.sql` | `ALTER TABLE … ADD COLUMN IF NOT EXISTS` (garantías `pdf_*`+`registrado_por`; minutas `participantes`; visitas `lugar`/`responsable`/`nota_id`); comentario de cita | Aditivo idempotente + comentario |
| `frontend/src/data/permisos.js` | **INTACTO** (no se tocó) | — |
| `App.jsx` / auth / acceso / triggers / G1-G8 / carátula | **INTACTOS** | — |

Archivos **nuevos** (no congelados): `garantias.controller.js`, `garantias.routes.js`,
`minutas.controller.js`, `minutas.routes.js`, specs `fianzas-crud.spec.js` y `minutas-crud.spec.js`.

---

## 5. `[validar profe]` resueltos con base en la ley

| Punto | Decisión aplicada | Fundamento |
|---|---|---|
| Fundamento del **vínculo minuta→nota** | Citar **art. 123 fr. X RLOPSRM** (ratificación de minutas en la Bitácora) y corregir el fr. III previo. | **art. 123 fr. X RLOPSRM** (verificado literal) |
| El vínculo **no debe alterar** la nota firmada | El vínculo solo escribe `nota_id`; la nota queda inmutable. | **art. 123 fr. VI RLOPSRM** (verificado literal) |
| Fundamento del **endoso** de garantía | art. 91 RLOPSRM, que remite a 98 fr. II para el ajuste de la fianza. | **art. 91 + art. 98 fr. II RLOPSRM** (verificados) |
| ¿La nota a vincular debe estar **firmada**? | **Sin base legal literal** — criterio del profe. **Default conservador aplicado:** se permite vincular cualquier nota del contrato porque el vínculo es **referencial** (no co-firma) y no altera la nota. Filtro a `firmada` listo si el profe lo pide. | sin base legal — criterio del profe |
| ¿Residente puede **gestionar garantías**? | **Sí** (regla pedida: dependencia OR residente_id OR created_by). Asimetría documentada: `permisos.js` da residente `'C'` (front read-only), pero el backend lo autoriza. | criterio del profe (regla del brief) |

---

## 6. Estado del catálogo tras esta sesión

- **HU-02 Fianzas:** ✅ funcional.
- **HU-11 Minutas/visitas:** ✅ funcional.
- **Única maqueta restante:** HU-20 (Tránsito a pago) — se integra en el BLOQUE A siguiente.
- **Único pendiente funcional dentro de una HU:** números generadores (HU-19, E3).

Docs sincronizados: `ESTADO_ACTUAL.md` (HU-02/HU-11 → funcional, % actualizado, cabecera entrada 5) y
`Historias_Usuario_ACTUALIZADAS_12jun.md` (HU-02 y HU-11 reescritas a funcional con fundamento legal).

---

## 7. Para Maiki al volver

1. Revisar el diff (sin commitear todavía) — foco en los toques a zona congelada de la §4.
2. Confirmar con el profe los 2 `[validar profe]` "criterio del profe" de la §5 (nota firmada para vincular;
   residente gestiona garantías).
3. Si aprueba, integrar por el flujo normal (la migración de `schema.sql` es aditiva e idempotente; correrla
   2–3× en local antes de Render como dicta el runbook).
