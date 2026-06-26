# Implementación — curva/% de avance por etapas (Propuesta B) + diff B4 aplicado · 24-jun

> Sesión autónoma. Backup previo: `scratchpad/backup_pre_etapasB_24jun.sql` y `backup_pre_B4apply_24jun.sql`.
> **LOCAL, sin push.** Build verde en cada paso. Sin schema, sin DDL.

## 1. Diff B4 aplicado y verificado (autorizado)
- Apliqué las 6 líneas en `backend/src/controllers/convenios.controller.js` (enforce P.U. heredado en ampliaciones, art. 59).
- **Verificado limpio (ROLLBACK, sin escribir):** ampliación con P.U. errado (99 ≠ 50) → **400** con el mensaje del art. 59; quedaron 0 versiones / 0 adicionales en el contrato de prueba.

## 2. Avance por etapas (Propuesta B) — IMPLEMENTADO

**Qué hace:** en HU-05 (Programa y curva), cuando el contrato tiene convenio (≥ 2 versiones de programa), aparece la
sección **«Avance por etapas (versión del programa)»** con una tarjeta por etapa:
- **Etapa original · plan inicial** `[Histórico · congelado]` — % medido sobre el plan original (v1, Σ25 600), **congelado**.
- **Etapa vigente · desde el convenio** `[Vigente]` — % nuevo sobre el plan modificado (v2, Σ30 600).

El **ejecutado se parte por la FECHA del convenio** (ventana temporal de cada `programa_version`): lo ejecutado
**antes** del convenio → etapa original; **después** → vigente. La curva consolidada principal se conserva, ahora
rotulada **«consolidado sobre el plan vigente»** con un aviso que remite a las etapas (el % original no se re-escala ahí).

**Archivos (solo frontend, sin congelado):**
- `frontend/src/utils/etapasAvance.js` (NUEVO) — `derivarEtapas()`: pura, deriva las etapas desde versiones +
  snapshots + fechas de avance.
- `frontend/src/pages/CurvaAvance.jsx` — carga los snapshots de cada versión, deriva `etapas`, renderiza la sección;
  **consolidó el selector A3** (que era un stopgap) en esta sección definitiva (revertí los añadidos A3 a `datosCurva`).

**Backend/Schema/Congelado:** ninguno (reusa `api.convenios` + `api.versionPrograma`; `concepto_avance.fecha` ya existe).

## 3. Verificación con datos reales (SOP-2026-001)
Registré el avance demo **CONC-01 / P1 = 12 000** (fecha 2026-04-30, pre-convenio). Corriendo `derivarEtapas` real
sobre los datos de la API y confirmado en pantalla (Playwright):

| Etapa | Programado | Ejecutado |
|---|---|---|
| **Original** (v1, Σ25 600) `congelado` | 100.0 % | **46.9 %** ✓ (no baja a 39.2 %) |
| **Vigente** (v2, Σ30 600) | 100.0 % | **0.0 %** (arranca nuevo) |
| Consolidado (main curve / KPIs) | — | 39.2 % (= el re-escalado, relegado a "consolidado vigente") |

**La aserción del profe se cumple:** el % del plan original queda **congelado en 46.9 %** y **NO** se re-escala al 39.2 %;
la etapa vigente arranca su % nuevo sobre el plan modificado.

## 4. Casos borde (verificados)
- **Contrato SIN convenio:** `derivarEtapas` devuelve `[]` (versiones < 2) → la sección NO se pinta → **idéntico a hoy, sin regresión.**
- **Avance sin fecha:** cae en la etapa **vigente** (la más reciente) → no se pierde ni se duplica (verificado: 50/200 = 25 %).
- **Avance en el límite (fecha == fecha del convenio):** va a la **vigente** (fin de ventana exclusivo, inicio inclusivo) → sin duplicar.
- **Varios convenios (N versiones):** una tarjeta por versión (las no vigentes = histórico congelado, la última = vigente).
  Se apilan en grilla; no se rompe. La ventana de cada versión = `[created_at, supersedido_en)`; la 1ª toma todo lo previo.

## 5. Caveat del seed (no es bug)
En el seed A3 el convenio se creó **hoy (24/jun)**, al final del plan abr-jun, por eso el **programado al corte sale 100 %**
en ambas etapas (a esa fecha el plan ya estaba calendarizado al 100 %). En un convenio **a media obra** el programado
saldría parcial. Lo que importa — el **ejecutado congelado (46.9 %)** vs el re-escalado (39.2 %) — funciona correcto.

## 6. Caveat B4 resuelto por etapas
El concepto ampliado (CONC-01 + su ampliación `CONC-01-A`): como la ampliación se registra **después** del convenio,
su avance cae en la **etapa vigente**; el original queda en su etapa. Ya no son "dos % sueltos sin contexto" — cada uno
se ve en su etapa con su denominador. (El % combinado en una sola línea sigue siendo el "consolidado vigente" de la curva principal.)

## 7. Cómo probarlo en pantalla
- **Cuenta:** `residente@sigecop.test` / `Sigecop2026!` (o contratista/supervisión/dependencia del contrato).
- **Contrato:** **SOP-2026-001** (ya tiene v1/v2 + el avance demo CONC-01/P1 que registré).
- **Pasos:** Avance y seguimiento → **Curva de avance** → contrato activo **SOP-2026-001** → baja a
  **«Avance por etapas (versión del programa)»**: verás **Etapa original 46.9 % (congelado)** y **Etapa vigente 0 %**.
  Arriba, el consolidado muestra 39.2 % con el aviso de que el original no se re-escala.
- **Para ver el caso "no regresión":** abre la curva de **SOP-2026-002** (sin convenio) → NO aparece la sección de etapas.
- **Para registrar más avance post-convenio** (y ver crecer la etapa vigente): registra avance en SOP-2026-001 hoy
  (fecha ≥ 24/jun) — caerá en la etapa vigente. (Recuerda: HU-06 ahora exige foto, criterio del equipo / A1.)

## 8. Nota
Registré 1 avance demo (CONC-01/P1) en SOP-2026-001 para que la sección se vea poblada de inmediato. Si prefieres el
contrato sin ese avance, se borra con: `DELETE FROM concepto_avance WHERE id = 2079;` (y su nota de bitácora asociada).
