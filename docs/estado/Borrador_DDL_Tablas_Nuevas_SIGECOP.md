# Borrador de DDL — tablas nuevas SIGECOP (diseño anticipado, D-1)

> ⚠️ **BORRADOR PARA REVISIÓN — NO APLICADO.** Nada de esto se ha ejecutado contra `schema.sql` ni contra ninguna BD. Es el diseño anticipado pedido en **D-1**: las tablas que tocan el core o tienen FK a la fundación se diseñan por adelantado para no bloquear a los equipos. **Maiki** es el único autor de `schema.sql`; cuando apruebes/ajustes esto, él lo integra siguiendo el runbook de despliegue (backup → migración single-transaction → verificar → push).
>
> **Convenciones respetadas (las de `schema.sql`):** `CREATE TABLE IF NOT EXISTS`, guards idempotentes sobre `pg_constraint`/`information_schema`, `TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `ON DELETE CASCADE` para hijos de `contratos`, `ON DELETE NO ACTION`/`SET NULL` para snapshots/referencias débiles, `NUMERIC(16,4)` para PU.
>
> **Fecha:** 2026-06-02 · documento interno.

## Mapa rápido (qué tabla, quién la usa, qué toca, a quién desbloquea)

| Tabla nueva / cambio | HU / feature | Equipo dueño del feature | ¿Toca fundación? | Prioridad |
|---|---|---|---|---|
| `contrato_roster` | Sustitución de personas (F) | **Fundación** | Sí (roster de `contratos`, `acceso.js`) | **ALTA** (legal, transversal) |
| `ALTER estimaciones (+retencion_cmic)` | CMIC 2 al millar (D-8) | **Fundación** | Sí (`estimaciones` congelada + trigger + neto) | Media (confirmar con profe) |
| `convenios_modificatorios` + `convenio_conceptos` | HU-03 (D-2) | **Fundación** (migración+endpoint) / Equipo 3 (UI) | Sí (versiona catálogo del core) | Media (depende de A2) |
| `concepto_avance` | HU-06 | Equipo 2 | Sí (FK `contrato_conceptos`) | Media (depende de A2) |
| `garantia_endosos` | HU-02 | Equipo 2 | Sí (FK `contrato_garantias`) | Baja |
| `alerta_atraso` | HU-07 | Equipo 2 | Sí (FK `contrato_conceptos`) | Baja |
| `minutas`, `visitas` | HU-11 | Equipo 2 | Sí (FK `contratos`) | Baja |
| `ALTER estimaciones (+envío/+reemplaza_a)` | HU-13 / HU-16 | Equipo 3 | Sí (`estimaciones` congelada) | Media |
| `estimacion_observaciones` | HU-15 | Equipo 3 | Sí (FK `estimaciones`) | Media |
| `presupuesto_anual`, `instruccion_pago` | HU-20 | Equipo 3 | Sí (FK `estimaciones`/`contratos`) | Media |

**Observación clave:** **todas** las tablas nuevas cuelgan de la fundación (`contratos`, `contrato_conceptos`, `estimaciones`, `usuarios`). No hay tabla de equipo "aislada". Esto valida D-1: el esquema lo diseña/integra una sola persona.

---

## Parte A — Fundación (alta prioridad, desbloquea a los equipos)

### A.1 — `contrato_roster` (sustitución de personas, Paquete F / S1-S2)

```sql
-- 1:N histórico contrato → persona por rol. Regla "solo uno activo a la vez por (contrato, rol)".
-- La persona NUNCA se borra: se sustituye (vigencia_hasta) y se preserva el histórico.
CREATE TABLE IF NOT EXISTS contrato_roster (
  id             SERIAL PRIMARY KEY,
  contrato_id    INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  rol            VARCHAR(20) NOT NULL CHECK (rol IN ('residente','superintendente','supervision')),
  usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,  -- no se borra: se sustituye
  vigencia_desde DATE NOT NULL DEFAULT CURRENT_DATE,
  vigencia_hasta DATE,                                   -- NULL = activo
  motivo         TEXT,                                   -- renuncia / cese / etc.
  sustituye_a    INTEGER REFERENCES contrato_roster(id) ON DELETE SET NULL,  -- traza quién reemplazó a quién
  registrado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_contrato_roster_vigencia CHECK (vigencia_hasta IS NULL OR vigencia_hasta >= vigencia_desde)
);
-- Solo UNA persona activa por (contrato, rol): índice único PARCIAL.
CREATE UNIQUE INDEX IF NOT EXISTS uq_contrato_roster_activo
  ON contrato_roster(contrato_id, rol) WHERE vigencia_hasta IS NULL;
CREATE INDEX IF NOT EXISTS idx_contrato_roster_contrato ON contrato_roster(contrato_id);
```

**[NIVEL 2 — decisión de diseño] ¿Cómo convive con los punteros escalares actuales (`contratos.residente_id/superintendente_id/supervision_id`)?**
- **Recomendado (menos invasivo):** conservar los escalares en `contratos` como **caché de "el activo ahora"** (los lee `acceso.js` en TODAS las HU; está congelado). Al sustituir: cerrar la fila activa del roster (`vigencia_hasta=hoy`) + insertar la nueva + **actualizar el puntero escalar** en `contratos`. `contratos` no tiene trigger de inmutabilidad sobre esas columnas, así que el UPDATE es válido. Seed: por cada contrato existente, insertar una fila activa del roster que espeje el puntero actual.
- **Alternativa (más pura, más invasiva):** eliminar los escalares y que `acceso.js` consulte el roster activo. Toca código congelado usado en todos lados → no recomendado para Etapa 1.

**Implica (Maiki):** endpoint `POST /api/contratos/:id/sustituir` (rol + nuevo usuario + motivo), validación "el nuevo tiene el rol correcto y está activo", y la sincronización cache↔roster en **UN SOLO punto de escritura** (este endpoint) y en **una transacción**, de modo que el puntero escalar de `contratos` **nunca derive** del roster (art. 125: sustituir, no borrar). **Historias a actualizar** (S3): HU-01/HU-08 y las que asumen roster fijo.

### A.2 — CMIC / 2 al millar en la carátula (D-8 / E3)

```sql
-- Otra retención de la carátula, simétrica al 5 al millar. DEFAULT 0 mantiene válidas las filas existentes.
ALTER TABLE estimaciones ADD COLUMN IF NOT EXISTS retencion_cmic NUMERIC(14,2) NOT NULL DEFAULT 0;
-- Recrear el CHECK de montos para incluirla (>= 0):
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_estimaciones_montos') THEN
    ALTER TABLE estimaciones DROP CONSTRAINT chk_estimaciones_montos;
  END IF;
  ALTER TABLE estimaciones ADD CONSTRAINT chk_estimaciones_montos
    CHECK (subtotal >= 0 AND amortizacion >= 0 AND retencion >= 0 AND retencion_cmic >= 0 AND deductivas >= 0);
END $$;
```

**Implica (Maiki):**
- En `estimaciones.controller.js`: `retencion_cmic = round2(subtotal × TASA_CMIC)` con **`TASA_CMIC` parametrizable (NO hardcodeada)**, y **`neto = subtotal − amortizacion − retencion − retencion_cmic − deductivas`**.
- En el trigger `sigecop_estimacion_inmutable`: añadir `OR NEW.retencion_cmic IS DISTINCT FROM OLD.retencion_cmic` (si no, la columna quedaría editable).
- ⚠️ **Nivel 1 — NO lo decide Code ni Maiki:** la **tasa** y la **aplicabilidad en Etapa 1** las confirma el **profesor**. Base legal anclada en **LFD / aportación CMIC de capacitación (NO LOPSRM)**. Diseño = parametrizable con `DEFAULT 0`; si el profe no la pide, la columna queda en 0 (inerte). Maiki la confirma en su reunión.

### A.3 — HU-03 convenios modificatorios (D-2)

```sql
-- Maiki hace migración + endpoint; el equipo construye la UI encima.
CREATE TABLE IF NOT EXISTS convenios_modificatorios (
  id           SERIAL PRIMARY KEY,
  contrato_id  INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  numero       INTEGER NOT NULL,                 -- correlativo por contrato
  tipo         VARCHAR(20) NOT NULL CHECK (tipo IN ('monto','plazo','conceptos','mixto')),
  fundamento   VARCHAR(10) NOT NULL CHECK (fundamento IN ('art59','art59bis')),  -- ordinario / ajuste
  motivo       TEXT NOT NULL,
  delta_monto  NUMERIC(14,2),                    -- cambio de monto (si aplica)
  delta_dias   INTEGER,                          -- cambio de plazo (si aplica)
  autor_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_convenios_numero UNIQUE (contrato_id, numero)
);
CREATE INDEX IF NOT EXISTS idx_convenios_contrato ON convenios_modificatorios(contrato_id);

-- Snapshot del catálogo afectado por el convenio (conserva la versión anterior, art.59).
CREATE TABLE IF NOT EXISTS convenio_conceptos (
  id          SERIAL PRIMARY KEY,
  convenio_id INTEGER NOT NULL REFERENCES convenios_modificatorios(id) ON DELETE CASCADE,
  clave       VARCHAR(40),
  concepto    TEXT NOT NULL,
  unidad      VARCHAR(20) NOT NULL,
  cantidad    NUMERIC(14,3) NOT NULL CHECK (cantidad >= 0),
  pu          NUMERIC(16,4) NOT NULL CHECK (pu >= 0)
);
CREATE INDEX IF NOT EXISTS idx_convenio_conceptos_convenio ON convenio_conceptos(convenio_id);
```

**[NIVEL 2] Modelo MÍNIMO.** El versionado del **programa de obra** (calendario) y el endoso automático de fianzas quedan diferidos. La regla art.59 vs 59Bis (>50% monto o plazo → ajuste) se valida en el controller. **Depende de A2** (programa de obra rehecho) para versionar conceptos↔periodos con sentido.

---

## Parte B — Tablas de Equipo 2 (FK a fundación; autoría de Maiki)

### B.1 — `concepto_avance` (HU-06, trabajos terminados)

```sql
-- Avance ejecutado por concepto y periodo. Liga a la nota de bitácora del periodo (Equipo 2).
CREATE TABLE IF NOT EXISTS concepto_avance (
  id                   SERIAL PRIMARY KEY,
  contrato_concepto_id INTEGER NOT NULL REFERENCES contrato_conceptos(id) ON DELETE CASCADE,  -- FK a FUNDACIÓN
  periodo_inicio       DATE NOT NULL,
  periodo_fin          DATE NOT NULL,
  cantidad_ejecutada   NUMERIC(14,4) NOT NULL CHECK (cantidad_ejecutada > 0),
  nota_id              INTEGER REFERENCES bitacora_notas(id) ON DELETE SET NULL,  -- FK a EQUIPO-2 (nota de entrega)
  registrado_por       INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_concepto_avance_periodo CHECK (periodo_fin >= periodo_inicio)
);
CREATE INDEX IF NOT EXISTS idx_concepto_avance_concepto ON concepto_avance(contrato_concepto_id);
```

**Implica:** **art.118** (Σ `cantidad_ejecutada` ≤ `contrato_conceptos.cantidad`) se valida en el controller (como ya lo hace HU-12). Alimenta la curva ejecutada de **HU-05**. **Relación con `estimacion_generadores`:** en Etapa 1 son independientes (ejecutado físico vs lo estimado/cobrado); en una iteración futura la estimación podría derivar de aquí. **Depende de A2.**

### B.2 — `garantia_endosos` (HU-02, fianzas)

```sql
CREATE TABLE IF NOT EXISTS garantia_endosos (
  id             SERIAL PRIMARY KEY,
  garantia_id    INTEGER NOT NULL REFERENCES contrato_garantias(id) ON DELETE CASCADE,
  convenio_id    INTEGER REFERENCES convenios_modificatorios(id) ON DELETE SET NULL,
  nueva_vigencia DATE,
  nuevo_monto    NUMERIC(14,2) CHECK (nuevo_monto IS NULL OR nuevo_monto >= 0),
  motivo         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_garantia_endosos_garantia ON garantia_endosos(garantia_id);
```

**Implica:** las **alertas de vigencia 30/15/5** se **derivan en lectura** de `contrato_garantias.vigencia` (sin tabla). La tabla `contrato_garantias` ya existe (se crea en el alta, HU-01). Falta el endpoint CRUD de pólizas post-alta + endosos.

### B.3 — `alerta_atraso` (HU-07)

```sql
CREATE TABLE IF NOT EXISTS alerta_atraso (
  id                   SERIAL PRIMARY KEY,
  contrato_concepto_id INTEGER NOT NULL REFERENCES contrato_conceptos(id) ON DELETE CASCADE,  -- FK a FUNDACIÓN
  umbral_pct           NUMERIC(5,2) NOT NULL CHECK (umbral_pct >= 0 AND umbral_pct <= 100),
  canal                VARCHAR(20) NOT NULL DEFAULT 'sistema' CHECK (canal IN ('sistema','correo')),
  activa               BOOLEAN NOT NULL DEFAULT true,
  creada_por           INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerta_atraso_concepto ON alerta_atraso(contrato_concepto_id);
```

**Implica:** el canal `'correo'` depende de **D-9** (notificaciones = Etapa 2). En Etapa 1, solo `'sistema'` (indicador in-app). El disparo (avance real < umbral) se evalúa contra `concepto_avance` (B.1).

### B.4 — `minutas` y `visitas` (HU-11)

```sql
CREATE TABLE IF NOT EXISTS minutas (
  id            SERIAL PRIMARY KEY,
  contrato_id   INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,  -- FK a FUNDACIÓN
  titulo        VARCHAR(200) NOT NULL,
  fecha         DATE NOT NULL,
  acuerdos      TEXT,
  pdf_nombre    TEXT,
  pdf_mime      VARCHAR(100),
  pdf_contenido BYTEA,                            -- PDF en BD (disco de Render efímero), como contrato_documentos
  creada_por    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS visitas (
  id           SERIAL PRIMARY KEY,
  contrato_id  INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  fecha        DATE NOT NULL,
  proposito    TEXT,
  estado       VARCHAR(20) NOT NULL DEFAULT 'agendada' CHECK (estado IN ('agendada','realizada','cancelada')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_minutas_contrato ON minutas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_visitas_contrato ON visitas(contrato_id);
```

**Implica:** "adjuntar una minuta como referencia en una nota" (HU-09) = se resuelve en el controller o con una tabla puente `minuta_nota` (diferible).

---

## Parte C — Tablas de Equipo 3 (FK a fundación/estimaciones; autoría de Maiki)

### C.1 — `estimaciones`: envío (HU-13) y reingreso (HU-16)

```sql
-- HU-13: sello de envío (arranca el plazo art.54). La máquina de estados ya existe.
ALTER TABLE estimaciones ADD COLUMN IF NOT EXISTS enviada_en  TIMESTAMPTZ;
ALTER TABLE estimaciones ADD COLUMN IF NOT EXISTS enviada_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
-- HU-16: reingreso = nueva versión que reemplaza a la rechazada (self-FK). 'rechazada' ya está en el CHECK.
ALTER TABLE estimaciones ADD COLUMN IF NOT EXISTS reemplaza_a INTEGER REFERENCES estimaciones(id) ON DELETE SET NULL;
```

**[Design note]** El trigger `sigecop_estimacion_inmutable` hoy congela la carátula pero **deja libre `estado`** (a propósito). `enviada_en/por` y `reemplaza_a` son metadatos de ciclo que se setean **una sola vez** al avanzar de estado → conviene que el controller permita solo `NULL → valor` (o extender el trigger para bloquear su re-escritura una vez seteados). El reingreso **NO reinicia** el plazo de presentación.

### C.2 — `estimacion_observaciones` (HU-15, revisión)

```sql
CREATE TABLE IF NOT EXISTS estimacion_observaciones (
  id            SERIAL PRIMARY KEY,
  estimacion_id INTEGER NOT NULL REFERENCES estimaciones(id) ON DELETE CASCADE,  -- FK a FUNDACIÓN
  seccion       VARCHAR(20) NOT NULL CHECK (seccion IN ('caratula','generadores','fotos','soportes','notas')),
  tipo          VARCHAR(20) NOT NULL CHECK (tipo IN ('aclaracion','correccion','rechazo')),
  severidad     VARCHAR(10) NOT NULL CHECK (severidad IN ('menor','mayor','critica')),
  descripcion   TEXT NOT NULL,
  autor_id      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  estado        VARCHAR(20) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','solventada')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_estimacion_observaciones_est ON estimacion_observaciones(estimacion_id);
```

**Implica:** el **turnado secuencial** (supervisión → residencia) y el **semáforo de 15 días** (art.54) se controlan en el controller (rol + máquina de estados + fecha real de recepción).

### C.3 — `presupuesto_anual` + `instruccion_pago` (HU-20, tránsito a pago)

```sql
-- Suficiencia presupuestal (art.24).
CREATE TABLE IF NOT EXISTS presupuesto_anual (
  id          SERIAL PRIMARY KEY,
  ejercicio   INTEGER NOT NULL,                  -- año fiscal
  dependencia VARCHAR(200) NOT NULL,
  techo       NUMERIC(16,2) NOT NULL CHECK (techo >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_presupuesto UNIQUE (ejercicio, dependencia)
);
-- Instrucción de pago (se genera al autorizar; precondición de HU-21).
CREATE TABLE IF NOT EXISTS instruccion_pago (
  id            SERIAL PRIMARY KEY,
  estimacion_id INTEGER NOT NULL REFERENCES estimaciones(id) ON DELETE CASCADE,  -- FK a FUNDACIÓN
  generada_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generada_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  factura_cfdi  VARCHAR(60),
  soportes_ok   BOOLEAN NOT NULL DEFAULT false,  -- todos los soportes obligatorios cargados
  CONSTRAINT uq_instruccion_estimacion UNIQUE (estimacion_id)
);
CREATE INDEX IF NOT EXISTS idx_instruccion_estimacion ON instruccion_pago(estimacion_id);
```

**Implica:** el **bloqueo presupuestal** (Σ pagado + `neto` ≤ `techo`) y el **semáforo de 20 días** (art.54) se validan/derivan en el controller. Esto **reconecta** la FK ya existente `pagos.estimacion_id → estimaciones` (hoy nullable) cerrando el ciclo HU-12 → HU-20 → HU-21.

---

## Orden de aplicación sugerido (cuando se apruebe)

1. **A.1 `contrato_roster`** + seed desde los punteros actuales (desbloquea sustitución, transversal).
2. **A.2 CMIC** (tras confirmar con el profe) y **C.1** (envío/reingreso) — cambios sobre `estimaciones`.
3. **A.3 convenios** (tras A2) y el resto de tablas de Parte B/C según las pida cada equipo.

Cada bloque entra como migración **aditiva e idempotente** dentro de `schema.sql`, aplicada por Maiki con el runbook (backup → `--single-transaction -v ON_ERROR_STOP=1` → verificar código viejo sobre esquema nuevo → push). Ninguna de estas migraciones reescribe datos existentes (todas son `ADD COLUMN ... DEFAULT`/`CREATE TABLE IF NOT EXISTS`).

---

## Parte A2 — Programa de obra = matriz CONCEPTO × PERIODO  ✅ YA INTEGRADO en `schema.sql`

> **Estado: CONSTRUIDO Y PROBADO EN LOCAL** (no en `main` aún). A diferencia del resto de este
> borrador, A2 **ya está en `schema.sql`** (sección "Paquete A2") porque era el prerrequisito que
> bloquea HU-05/06/03. Se deja aquí registrado por completitud. Reemplaza el modelo viejo
> `contrato_actividades` (texto libre con %peso), que se **DEPRECA** (no se borra: conserva datos viejos).
> Fundamento Nivel 1: **art. 45 fr. X** RLOPSRM (programa conforme al catálogo, por periodos),
> **art. 54** LOPSRM (ciclo 30/15 días), **art. 118** RLOPSRM (no exceder lo contratado),
> **art. 59** LOPSRM (enmienda del programa por convenio; art. 99 LOPSRM es ARBITRAJE — corregido en auditoría legal 2026-06-04).

```sql
-- (1) Ciclo de estimación del contrato (lo elige el usuario en el alta).
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS ciclo_estimacion VARCHAR(10);  -- CHECK IN ('mensual','quincenal')

-- (2) Periodos del ciclo = COLUMNAS de la matriz (los genera lib/programa.js: generarPeriodos).
CREATE TABLE IF NOT EXISTS contrato_periodos (
  id SERIAL PRIMARY KEY,
  contrato_id INTEGER NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL CHECK (numero >= 1),
  inicio DATE NOT NULL, fin DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_contrato_periodos_numero UNIQUE (contrato_id, numero),
  CONSTRAINT chk_contrato_periodos_fechas CHECK (fin >= inicio)
);

-- (3) programa_obra = CELDAS de la matriz (tabla HOJA, escala = catálogo NUMERIC(14,3)).
CREATE TABLE IF NOT EXISTS programa_obra (
  id SERIAL PRIMARY KEY,
  contrato_concepto_id INTEGER NOT NULL REFERENCES contrato_conceptos(id) ON DELETE CASCADE,
  contrato_periodo_id  INTEGER NOT NULL REFERENCES contrato_periodos(id)  ON DELETE CASCADE,
  cantidad NUMERIC(14,3) NOT NULL CHECK (cantidad >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_programa_obra_celda UNIQUE (contrato_concepto_id, contrato_periodo_id)
);
```

**Diseño (red-team C1–C7, en `lib/programa.js: guardarMatriz`):** edición por **DELETE+INSERT** (la matriz es hoja); **freeze de aplicación** (no trigger) = bloquea edición manual si hay estimación `<> 'rechazada'`, salvo **enmienda por convenio** (`convenioId`, art. 59 LOPSRM); **lock** `pg_advisory_xact_lock(2, contrato_id)` (mismo que la integración de estimación → cierra el TOCTOU); invariante **Σ planeado ≤ contratado validado en SQL NUMERIC** (art. 118, sin epsilon).

**Alineación con HU-12 (definición de "periodo"):** cada fila de `contrato_periodos` cumple por construcción `fin ≤ masUnMes(inicio)`, así que **es un periodo válido de estimación** (art. 54); una estimación de HU-12 corresponde a un `contrato_periodos.numero`, y la celda `programa_obra(concepto, periodo)` es la cantidad planeada contra la que se podrá validar el avance estimado (cableado fino de HU-12 contra `programa_obra` = follow-on, fuera de A2).

**Decisión de producto PENDIENTE (no la decide Code):** ¿el programa DEBE distribuir todo (Σ = contratado) o se permite parcial / Σ=0 con aviso? El dibujo del profe distribuye todo; hoy se implementó **parcial permitido con aviso** (solo se bloquea el exceso, art. 118). **Confirmar con el profe.**
