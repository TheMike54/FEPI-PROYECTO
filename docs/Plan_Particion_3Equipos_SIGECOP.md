# SIGECOP — Análisis de repo y plan de partición en 3 equipos

**Tipo:** documento **interno** del equipo (no entregable académico). · **Fecha:** 2026-06-02 · **Modo:** SOLO LECTURA (este análisis no modificó código).

**Cómo está armado:** diagnóstico read-only del repo (frontend/backend/docs/esquema/CI), cruzado con la revisión del profesor y las fichas de trazabilidad. Cada afirmación de código está verificada contra el archivo real. Las decisiones que dependen de ti van marcadas **[NIVEL 2]** con mi recomendación.

**Fuentes internas usadas:**
- `docs/Revision_Profesor_Sprint1-2_Analisis_y_Plan.md` (36 hallazgos etiquetados: R1–R3, C1–C13, B1–B4, N1–N5, S1–S3, U1–U4, E1–E4).
- `docs/Fichas_Trazabilidad.md` (estado por HU), `docs/Auditoria_Legal_SIGECOP.md`, `docs/Auditoria_Coherencia_F3.md`.
- Lectura directa de: `backend/src/db/schema.sql`, `backend/server.js`, `frontend/src/App.jsx`, `frontend/src/context/SesionContext.jsx`, `frontend/src/data/permisos.js`, `frontend/src/data/dummy.js`, `render.yaml`, `.github/workflows/e2e.yml`, ambos `package.json`.

> ⚠️ **No encontré el "audit de 91 hallazgos" como documento.** Busqué en `docs/`, `FEPI/` y en mi carpeta de memoria (solo tiene 3 archivos: runbook de deploy, e2e-frontend-only, loop de stack local). No existe un archivo con esos 91 hallazgos. Lo que SÍ tengo es la **revisión del profesor (36 hallazgos)** y las auditorías legal/coherencia. **Si el "91" lo tienes en otro lado, pégamelo y lo integro a la Sección 3.** Mientras tanto, la Sección 3 usa los hallazgos del profe (los más recientes y los que revierten trabajo).

---

## 0. Resumen ejecutivo

| Capa | Estado real (verificado) |
|---|---|
| **Terminado end-to-end (real-backend)** | HU-00 (login bcrypt+JWT), HU-01 (alta + folio único + catálogo con cuadre exacto A1 + PDF), HU-08 (apertura bitácora), HU-09 (notas tipificadas), HU-10 (consulta notas), HU-12 (integración estimación: guardado y notas reales; carátula con preview), HU-21 (registro de pago). |
| **Prototipo con datos dummy** (sin backend) | HU-02, HU-03, HU-04, HU-05, HU-06, HU-07, HU-11, HU-13, HU-14, HU-15, HU-16, HU-17, HU-18, HU-19, HU-20 (15 HU). |
| **Backend montado** | Solo 6 routers: `/api/auth`, `/api/usuarios`, `/api/contratos`, `/api/bitacora`, `/api/pagos`, `/api/estimaciones`. Todo lo demás vive en el frontend con `dummy.js`. |
| **Esquema** | 1 archivo, `backend/src/db/schema.sql`, **16 tablas**, fuertemente entrelazadas por FK. |
| **Modo proyecto** | Vivo y entrelazado en la capa de UI (toggle en Header + atajo de rol demo + metadatos de sprint). El control de acceso por rol funciona igual en ambos modos. Remoción de complejidad **BAJA**. |
| **CI** | Solo Playwright en frontend (`vite dev`), sin backend ni BD. ~20 specs son de modo proyecto y se romperán cuando los endpoints dejen de devolver dummy. |

**La idea de partición que propongo** (detalle en §2):

- **Fundación (Maiki)** — congelada, tú la integras y la despliegas: auth/HU-00, alta+catálogo+programa/HU-01, control de accesos, estimación core/HU-12, esquema core. **Más** las correcciones del profe que tocan el core: cuadre exacto + programa = conceptos (Paquete A2), anticipo como regla (B), UX del alta (C) y **sustitución de personas** (F, transversal/legal).
- **Equipo 2 — Bitácora + documental + avance físico:** HU-02, HU-04, HU-05, HU-06, HU-07, HU-08✅, HU-09✅, HU-10✅, HU-11. Se lleva las correcciones del profe de bitácora/notas (Paquetes D y E).
- **Equipo 3 — Estimaciones (ciclo), pagos y reportes:** HU-13, HU-14, HU-15, HU-16, HU-17, HU-18, HU-19, HU-20, HU-21✅. Carga de profe ligera → su trabajo es sobre todo cablear prototipos al backend.

**El único acoplamiento cruzado entre equipos a nivel de datos** es `estimacion_notas → bitacora_notas` (Equipo 3 lee notas de Equipo 2), y ya está construido en el core (HU-12). El resto de FKs apuntan a la fundación. Es decir: **se puede partir sin dependencias cruzadas nuevas**, siempre que el esquema lo siga integrando una sola persona (tú).

---

## 0.1 Decisiones que necesito que tú decidas — [NIVEL 2] (consolidado)

**Estado (2026-06-02): 3 grandes CONFIRMADAS por Maiki; 7 pendientes.**

- ✅ **D-1 DECIDIDO** — Un solo `schema.sql`, **congelado**, autoría única de Maiki; NO se parte en 3 archivos. Política operativa: las tablas que **tocan el core o tienen FK a la fundación se diseñan POR ADELANTADO** (desde el spec de cada historia) para no bloquear a los equipos; el resto las agrega Maiki como único autor cuando el equipo las pida. Los equipos tratan `schema.sql` como **congelado** (no lo editan).
- ✅ **D-2 DECIDIDO** — HU-03: Maiki hace la migración de esquema + el endpoint (muta el core); el equipo construye la UI encima.
- ✅ **D-6 DECIDIDO** — CI = solo `vite build` + smoke local por equipo que Maiki re-verifica al integrar. **Matiz:** las ~18 specs de modo proyecto NO quedan `skip` para siempre — se **borran o se reescriben como autenticadas junto con la remoción del modo proyecto** (ver §6 y §7).
- ⏳ **Pendientes (a decidir por Claude con el documento completo):** D-3, D-4, D-5, D-7, D-8, D-9, D-10.

| # | Decisión | Mi recomendación |
|---|---|---|
| D-1 | **¿El esquema se parte en 3 archivos o queda 1 archivo que solo tú editas?** | **Queda 1 archivo (`schema.sql`) que solo tú tocas.** Partirlo (00_core/10_equipo2/20_equipo3) es posible pero las FK cruzadas obligan orden de carga y reintroduce coordinación. Ver §4: la partición “de papel” sirve para repartir *responsabilidad de diseño*, no para tener 3 archivos independientes. |
| D-2 | **¿HU-03 (convenios modificatorios) quién la hace?** Muta el catálogo/programa/garantías del core (peligroso para un equipo). | **Tú (fundación)** haces la migración de esquema + el endpoint que versiona; un equipo (Equipo 3) construye la UI/flujo contra ese endpoint. Marcar como bloqueada hasta que A2 (programa de obra) esté. |
| D-3 | **¿La UX del alta (Paquete C: vista incremental, no perder datos, bug del PDF) la hace Maiki o se delega bajo tu revisión?** | **Delegable a un equipo, pero con tu PR-review obligatorio**, porque toca `AltaContrato.jsx` (fundación). |
| D-4 | **¿HU-05/06/07 (avance físico) van a Equipo 2 o Equipo 3?** | **Equipo 2.** Leen catálogo/programa (core) y notas de entrega (Equipo 2). Quedan en el mismo cluster que la bitácora. |
| D-5 | **¿Sustitución de personas (Paquete F) es fundación o un equipo?** | **Fundación (tú).** Toca el roster del contrato (`residente_id/superintendente_id/supervision_id`), que está congelado, y es requisito legal transversal. |
| D-6 | **CI: ¿borramos las ~20 specs de modo proyecto o las reescribimos como autenticadas?** | **Híbrido (ver §7):** CI = solo `vite build`. Las specs se quedan como smoke local (no en CI). Reescribir como autenticadas SOLO las críticas (HU-09, HU-10, HU-12) más adelante, con el patrón `.skip(CI)` que ya usa `hu-registro.spec.js`. |
| D-7 | **¿Reorganizamos `docs/` en `ENTREGABLES/` + `INTERNO/`?** | **Sí**, ayuda a no subir material interno por error. Bajo costo. |
| D-8 | **¿CMIC / 2 al millar (E3 del profe) entra en Etapa 1 de la estimación?** | No lo decido yo: es pregunta al profe. Si entra, es trabajo de **fundación** (carátula HU-12). Marcar pendiente. |
| D-9 | **Notificaciones (U3 del profe): ¿alcance Etapa 1?** | Pregunta al profe. Hoy NO existen. Si entran, transversal → fundación define el mecanismo. |
| D-10 | **Folio de contrato (C4): ¿captura del usuario o autogenerado?** | El código ya lo trata como **captura** (`folio` UNIQUE capturado en el alta). Confirmar con el profe que así se queda. |

---

## 0.2 Resolución de las 7 decisiones pendientes (decididas por Claude — sujetas a tu veto)

| # | Decisión tomada | Por qué (breve) |
|---|---|---|
| **D-3** UX del alta (Paquete C) | **Repartida.** Maiki conserva lo entrelazado con la lógica del alta: **C1** (form vacío), **C7** (validar en vista / no perder datos), **C8** (bug del PDF). Equipo 2 toma lo cosmético en PRs acotados con review de Maiki: **C9** (modales salir), **C10** (unidades mes/hectárea/Otro), **C11** (siguiente/guardar), **U4** (póliza selector). | C7/C8/C1 tocan el flujo de `AltaContrato.jsx` + `contratos.controller.js` (congelados, datos críticos, alta prioridad del profe). Lo cosmético no necesita al integrador y descarga a Maiki, que ya carga A2+B+F. |
| **D-4** HU-05/06/07 | **Equipo 2.** | El avance físico se alimenta de catálogo/programa (core) y de notas de entrega (HU-09, Equipo 2). Mantenerlo junto a la bitácora evita que Equipo 3 tenga que leer notas+avance (menos cruces). **Bloqueo:** HU-05/06 dependen de A2 (programa rehecho, fundación); HU-07 puede avanzar antes. |
| **D-5** Sustitución de personas (F) | **Fundación (Maiki).** | Toca el roster congelado de `contratos` y `acceso.js` (transversal a TODAS las HU: quién firma/emite/integra); requiere tabla 1:N nueva con regla "solo uno activo"; es requisito legal (S1). Un equipo aquí rompería el congelamiento. |
| **D-7** Reorganizar `docs/` | **Sí, pero al final** (no bloqueante). Mover entregables→`ENTREGABLES/`, internos→`INTERNO/`, sacar de git lo sensible, actualizar `docs/README.md`. | Ordena para la entrega y evita subir interno por error. Mover archivos rompe enlaces del índice → hacerlo fuera del sprint de código. |
| **D-8** CMIC / 2 al millar (E3) | **Incluir en Etapa 1**, como una línea más de la carátula (fundación, HU-12), parametrizable. **Confirmar cifra/obligatoriedad con el profe.** | El profe la marcó obligatoria en la revisión (E3); el costo es 1 columna + 1 término (subtotal×0.002), simétrico al 5 al millar; omitirla arriesga rework. Cae en el archivo congelado → DDL en el borrador. |
| **D-9** Notificaciones (U3) | **Etapa 1 = solo indicadores in-app** (semáforos de plazo ya derivados, art.54). **Email/push = Etapa 2.** Confirmar alcance con el profe. | Notificaciones reales necesitan infra (servicio de correo, cron) desproporcionada para Etapa 1; los plazos legales ya se hacen cumplir vía semáforos derivados (HU-13/15/20). Sin tabla nueva por ahora. |
| **D-10** Folio del contrato (C4) | **Captura del usuario** (ya implementado). Solo confirmar con el profe. | `contratos.folio` es `VARCHAR UNIQUE` capturado en el alta; coincide con lo que pidió el profe (C4). Sin cambios. |

> **DDL anticipado (D-1):** el diseño de las tablas nuevas que tocan el core / tienen FK a la fundación está en **`docs/Borrador_DDL_Tablas_Nuevas_SIGECOP.md`** — **borrador, NO aplicado a `schema.sql`**. Casi todas las tablas nuevas cuelgan de `contratos`/`contrato_conceptos`/`estimaciones`/`usuarios`, lo que confirma D-1: el integrador debe diseñarlas por adelantado o los equipos se bloquean.

---

## 1. Estructura de la carpeta / repo

### 1.1 Qué hay (clasificado)

| Ruta | Tipo | ¿Trackeado? | ¿Entregable? | Nota |
|---|---|---|---|---|
| `backend/` | código | sí | **sí (software)** | Node+Express+PG. `server.js`, `src/{controllers,routes,middlewares,lib,db}`, `scripts/`, `Dockerfile`. |
| `frontend/` | código | sí | **sí (software)** | React+Vite+Tailwind. `src/{pages,components,services,context,data}`, `e2e/`, configs. |
| `docs/` | docs | sí | mixto | Mezcla entregables y material interno (ver 1.3). |
| `FEPI/` | data | sí | **no** | Material de fase temprana (PDFs, matrices v1, `V1.zip`). El `.gitignore` lo marca “fuera del scope” pero **sigue trackeado** (inconsistencia, ver 1.4). |
| `docker-compose.yml`, `render.yaml`, `.github/workflows/e2e.yml` | config | sí | infra | Stack local / deploy Render / CI. |
| `.env` | config | **NO trackeado** ✅ | no | Verificado: NO está en git (no hay fuga). Tiene creds locales + JWT. |
| `.env.example`, `backend/.env.example`, `frontend/.env.example` | config | sí | no | Plantillas seguras. |
| `README.md`, `docs/README.md` | doc | sí | índice | Raíz = setup; `docs/README.md` = índice de entregables. |
| `encenderserver.bat` | junk | no | no | Helper local; ya en `.gitignore`. |
| `pruebas-e2e.bat` | junk | **sí** | no | Helper local trackeado; debería ignorarse. |

### 1.2 Basura / duplicados / a borrar

| Archivo | Por qué |
|---|---|
| `render_backup_*.sql` (4 archivos) | Respaldos de BD; ya cubiertos por `.gitignore` (`render_backup_*.sql`). Untracked. ~6 MB. |
| `render_backup_A1_pre_20260602T070056Z.json` | Respaldo en JSON, **NO cubierto** por el patrón actual (solo cubre `.sql`). 7 MB. Untracked. → añadir patrón. |
| `Historias_Usuario_BACKUP_20260601_012809.xlsx` (raíz) | Backup; patrón `*_BACKUP_*.xlsx` ya lo cubre. Untracked. |
| `docs/Historias_Usuario_BACKUP_20260601.xlsx` | Backup superado por `docs/Historias_Usuario.xlsx`. |
| `docs/Matriz_Control_Accesos_SIGECOP (1).md` | Copia “(1)” duplicada de `Matriz_Control_Accesos_SIGECOP.md`. Untracked. Borrar una. |
| `docs/~$tudio_Factibilidad_Tecnica_SIGECOP.docx` | Lock de Office (`~$*`), ya cubierto. Borrar. |
| `docs/WhatsApp Audio 2026-06-01 ... _transcript.txt` | Transcripción del audio de la reunión. Interno. Untracked (bien); **no** está en `.gitignore` → añadir patrón. |
| `docs/Cuentas_Prueba_SIGECOP.md` | **Contraseñas en claro.** Ya en `.gitignore`. Existe en disco — manténlo fuera del repo. |
| `docs/comandos usuario.txt` | Comandos con contraseña. Ya en `.gitignore`. |

### 1.3 Entregable vs interno (dentro de `docs/`)

**Entregables (académicos):** `Estudio_Factibilidad_Tecnica_SIGECOP.docx`, `Historias_Usuario.xlsx`, `matriz_DEFINITIVA.xlsx`, `Plan_Riesgos.xlsx`, `Plan_Pruebas_Sprints_1-3_SIGECOP.docx`, `Maquetas_SIGECOP.{html,pptx}`, `diagrama_arquitectura.png`, `Arquitectura_SIGECOP.svg`, `Fundamento_Legal_Validaciones_HU-01.docx`, `Cobertura_Legal_{LOPSRM,Reglamento}.md`, PDFs de ley (`LFD/LOPSRM/Reg_LOPSRM`).

**Internos (NO entregables):** `Revision_Profesor_Sprint1-2_Analisis_y_Plan.md` (nombra al profe), `Fichas_Trazabilidad.md`, `Auditoria_Legal_SIGECOP.md`, `Auditoria_Coherencia_F3.md`, `DECISIONES.md`, `Acordeon_Defensa_SIGECOP.md`, `Matriz_Control_Accesos_SIGECOP.md`, `Matriz_Permisos_SIGECOP.xlsx`, `Cuentas_Prueba_SIGECOP.md`, `comandos usuario.txt`, el `_transcript.txt`, **y este documento.**

### 1.4 Estructura ordenada propuesta + `.gitignore`

`docs/` reorganizado:
```
docs/
├── README.md
├── ENTREGABLES/   (los 13 entregables + REFERENCIAS_LEGALES/ con los 3 PDF)
└── INTERNO/       (revisión profe, fichas, auditorías, decisiones, matrices, este plan)
    (FUERA del repo: Cuentas_Prueba, comandos usuario.txt, transcript, backups)
```

**Añadir al `.gitignore`** (el actual ya es muy completo; faltan estos):
```gitignore
# Respaldos de BD en JSON (el patrón .sql no los cubre)
render_backup_*.json
# Backups de Historias dentro de docs/
docs/*_BACKUP_*.xlsx
# Transcripciones de reuniones (audio/video)
docs/*_transcript.txt
# Revisión del profesor (interno, lo nombra)
docs/Revision_Profesor*.md
# Helper local
pruebas-e2e.bat
```

**[NIVEL 2 D-7]** Inconsistencia a decidir: `FEPI/` está marcado “fuera del scope” en `.gitignore` **pero sigue trackeado** (se ignoró después de haberse comiteado). Si quieres que el ignore tenga efecto: `git rm -r --cached FEPI/` (lo saca del control de versiones sin borrarlo del disco). Mismo caso potencial con `Matriz_Permisos_SIGECOP.xlsx`.

---

## 2. Inventario de las 22 HU + partición en 3 dominios

**Leyenda estado:** 🟢 real-backend (end-to-end) · 🟡 prototipo (dummy, sin persistencia) · 🟠 mixto.

| HU | Título | Estado | Wiring (evidencia) | Dueño backend hoy | **Dominio propuesto** |
|---|---|---|---|---|---|
| HU-00 | Control de accesos / login | 🟢 | `SeleccionRol.jsx`→`api.login`; JWT+bcrypt; restaura sesión en F5 | `/api/auth`, `/api/usuarios` | **Fundación** |
| HU-01 | Alta y configuración del contrato | 🟠 | Alta+folio+catálogo (cuadre A1)+PDF reales (`api.crearContrato`, `api.subirDocumento`); programa de obra aún “actividades texto” | `/api/contratos` | **Fundación** |
| HU-02 | Registro de fianzas/garantías | 🟡 | `RegistroFianzas.jsx` usa `fianzasListadoDummy`, estado en memoria | — (las garantías sí se crean en el alta) | **Equipo 2** |
| HU-03 | Convenios modificatorios | 🟡 | `ConveniosModificatorios.jsx`, `historicoLocal` en memoria | — | **Fundación + Equipo 3** [NIVEL 2 D-2] |
| HU-04 | Consulta integrada del expediente | 🟡 | `ConsultaExpediente.jsx`, `bloquesExpedienteDummy`; PDFs/XLSX client-side | (el GET `/contratos/:id` ya da los bloques) | **Equipo 2** |
| HU-05 | Programa y curva de avance | 🟡 | `CurvaAvance.jsx`, curva S en SVG con `curvaAvanceDummy` | — | **Equipo 2** [NIVEL 2 D-4] |
| HU-06 | Trabajos terminados por concepto | 🟡 | `TrabajosTerminados.jsx`, `conceptosTrabajosDummy` | — | **Equipo 2** [NIVEL 2 D-4] |
| HU-07 | Alertas de atraso | 🟡 | `AlertasAtraso.jsx`, `alertasConfiguradasDummy` | — | **Equipo 2** [NIVEL 2 D-4] |
| HU-08 | Apertura de bitácora | 🟢 | `api.abrirBitacora`, acta JSONB inmutable + firmas pendientes | `/api/bitacora` | **Equipo 2** |
| HU-09 | Emisión de notas tipificadas | 🟢 | `api.listarNotas`, `api.notaTipos`, POST nota | `/api/bitacora` | **Equipo 2** |
| HU-10 | Consulta y búsqueda de notas | 🟢 | `api.notasDeContrato`; `BuscadorNotas`; export Excel | `/api/bitacora` | **Equipo 2** |
| HU-11 | Minutas, visitas e inspecciones | 🟡 | `MinutasVisitas.jsx`, `minutasDummy`/`visitasDummy` | — | **Equipo 2** |
| HU-12 | Integración de la estimación | 🟠 | Guardado real (`api.integrarEstimacion`) + notas reales; carátula = preview client-side | `/api/estimaciones` | **Fundación** |
| HU-13 | Envío de la estimación | 🟡 | `EnvioEstimacion.jsx`, `envioEstimacionDummy`; plazo art.54 simulado | — | **Equipo 3** |
| HU-14 | Historial de estimaciones | 🟡 | `HistorialEstimaciones.jsx`, `historialEstimacionesDummy` | — | **Equipo 3** |
| HU-15 | Recepción/revisión/autorización | 🟡 | `RevisionEstimacion.jsx`, `pasosRevisionDummy` | — | **Equipo 3** |
| HU-16 | Reingreso tras rechazo | 🟡 | `ReingresoEstimacion.jsx`, `observacionesRechazoDummy` | — | **Equipo 3** |
| HU-17 | Tablero de estimaciones | 🟡 | `TableroEstimaciones.jsx`, `estimacionesTableroDummy` | — | **Equipo 3** |
| HU-18 | Vista ejecutiva / portafolio | 🟡 | `PortafolioEjecutivo.jsx`, `portafolioContratosDummy` (multi-contrato) | — | **Equipo 3** |
| HU-19 | Exportación de reportes (7) | 🟡 | `ExportacionReportes.jsx`, reportes client-side (jsPDF/SheetJS) | — | **Equipo 3** |
| HU-20 | Tránsito a pago | 🟡 | `TransitoPago.jsx`, `presupuestoDummy`; semáforo 20 días | — | **Equipo 3** |
| HU-21 | Registro del pago efectuado | 🟢 | `api.registrarPago`, `api.listarPagos`; append-only | `/api/pagos` | **Equipo 3** |

### 2.1 Dependencias (para evitar choques entre equipos)

```
FUNDACIÓN (Maiki) ── usuarios, contratos, catálogo de conceptos, programa de obra, estimaciones-core
   ▲            ▲                 ▲                         ▲
   │            │                 │                         │
EQUIPO 2 ───────┘   lee catálogo/programa (RO)   EQUIPO 3 ─┘  lee estimaciones-core (RO)
(bitácora, fianzas,                              (ciclo estimación, pagos, reportes)
 expediente, avance)         EQUIPO 3 ──lee notas (RO)──► EQUIPO 2   ← único cruce
```

- **Todo apunta a la fundación.** Equipo 2 y Equipo 3 leen del core en solo-lectura (catálogo, programa, contratos, estimación-core).
- **Único cruce E2↔E3:** las estimaciones (Equipo 3) vinculan notas de bitácora (Equipo 2) vía `estimacion_notas`. **Ya está construido en el core (HU-12)**, así que no es trabajo nuevo ni acoplamiento que los equipos tengan que negociar.
- **Regla de oro:** ningún equipo edita tablas o archivos de la fundación (§5). Si necesitan un dato del core, lo piden por API/lectura, no mutando el core.

---

## 3. Qué falta por HU para quedar end-to-end + hallazgos del profe

> Esta sección usa los hallazgos de la **revisión del profesor** (códigos R/C/B/N/S/U/E del doc interno). El “audit de 91” no está disponible (ver nota arriba); si lo aportas, lo cruzo aquí.

### Fundación (Maiki)
| HU | Falta para e2e | Hallazgos del profe que aplican |
|---|---|---|
| HU-01 | **Programa de obra rehecho** = conceptos del catálogo repartidos en periodos (matriz concepto×periodo, valida ≤ contratado, define el ciclo de estimación). Hoy es `contrato_actividades` (texto libre). Esto es el **Paquete A2** (A1 ya cerró cuadre exacto + clave). + Anticipo como regla de negocio. + UX incremental del alta. + Bug de carga de PDF. + Catálogo de unidades (mes/hectárea/Otro). | **R1/C2** (cuadre exacto, ya A1), **R3/C5/Anexo** (programa = catálogo en periodos), **C3** (clave, ya A1), **R2/C6** (anticipo regla), **C1** (alta inicia vacía), **C7** (validar en vista, no perder datos), **C8** (bug PDF), **C9** (modales salir), **C10** (unidades), **C11** (siguiente/guardar), **C4** (folio captura, confirmar), **C12** (día inicio↔apertura), **C13/U4** (supervisión/póliza selector) |
| HU-12 | Carátula calculada **server-side ya existe** (amort. art.143, 5 al millar art.191, exceso art.118, periodo art.54). Falta: cerrar el preview client-side contra el server, soportes/fotos reales (hoy esqueleto). ¿CMIC/2 al millar? | **E1** (programa↔catálogo↔estimación consistentes — depende de A2), **E2** (cuadre exacto en carátula, hecho), **E3** (CMIC 2 al millar — pendiente decisión), **E4** (revisión real con el profe) |
| Transversal | **Sustitución de personas sin perder histórico** (tabla 1:N contrato→persona por rol, solo una activa). HOY NO EXISTE → incumple la ley. | **S1/S2/S3** (alta prioridad legal) |

### Equipo 2 (bitácora + documental + avance)
| HU | Falta para e2e | Hallazgos del profe |
|---|---|---|
| HU-08 | Datos mínimos del **art. 123 fr. III** en la nota de apertura; apertura = **nota #1** (folio consecutivo desde ahí). El backend ya tiene acta JSONB + firmas. | **B1, B2, B3, B4** |
| HU-09 | Completar **tipos de nota por rol según art. 125 RLOPSRM (contratista = fr. II)** (el catálogo `bitacora_nota_tipos` ya existe; revisar cobertura, sobre todo del contratista); nota “entrega de concepto” jala del catálogo y la registra el contratista; resolver flujo de firma de notas. | **N1, N2, N3, N4** (vista “ver bitácora” central), **N5/B4** (firma — verificar arts. 123 y 125 RLOPSRM; el 122 es solo el uso de la Bitácora) |
| HU-10 | Ya real. Cerrar la vista central “ver bitácora”. | **N4** |
| HU-02 | Backend de fianzas: alta/edición de pólizas post-alta, **alertas de vigencia 30/15/5**, endosos por modificatorio, historial. (Tabla `contrato_garantias` ya existe.) | **U4** (póliza selector) |
| HU-04 | Cablear el expediente al GET `/contratos/:id` real (ya devuelve los 5 bloques) + descargas. | — |
| HU-05 | Backend de avance: curva programado vs ejecutado vs financiero; depende del **programa de obra A2** (fundación) y de HU-06. | (depende de A2) |
| HU-06 | Backend de trabajos terminados: tabla de avance ejecutado por concepto/periodo, acumulado, **bloqueo exceso art.118**, vínculo a nota de bitácora. | (art. 118; **N2** validación física) |
| HU-07 | Backend de alertas de atraso (config por concepto, umbral, canal). | **U3** (notificaciones — pendiente alcance) |
| HU-11 | Backend de minutas (PDF + metadatos), agenda de visitas, adjuntar minuta a nota (HU-09). | — |

### Equipo 3 (ciclo de estimación + pagos + reportes)
| HU | Falta para e2e | Hallazgos del profe |
|---|---|---|
| HU-13 | Backend: estado `enviada`, sello de fecha/hora, plazo art.54 (6 días presentación → 15 revisión), notificación a residencia/supervisión. | **U3** (notificaciones) |
| HU-14 | GET historial real (la máquina de estados de `estimaciones` ya existe). | — |
| HU-15 | Backend de revisión: observaciones por sección con tipo/severidad, turnado supervisión→residencia, autorizar/rechazar, semáforo 15 días art.54. | (art. 54) |
| HU-16 | Backend de reingreso: nueva versión vinculada a la rechazada, sin reiniciar plazo. | — |
| HU-17 | GET tablero (solo aceptadas/en proceso), indicadores agregados, “mis pendientes” por rol. | — |
| HU-18 | Backend multi-contrato (portafolio), semáforo de 3 factores, agrupaciones, comparación de periodos. | — |
| HU-19 | Generar los 7 reportes desde datos reales (hoy client-side desde dummy). | — |
| HU-20 | Backend de tránsito a pago: suficiencia presupuestal art.24, instrucción de pago, soportes obligatorios, notificación a Finanzas, semáforo 20 días art.54. | **U3** |
| HU-21 | Ya real. Reconectar `pagos.estimacion_id` a la estimación real (hoy FK nullable). | — |

---

## 4. Estructura del esquema + partición SQL

**Archivo único:** `backend/src/db/schema.sql` (idempotente; lo re-aplica `backend/src/db/init.js` al arrancar si `RUN_MIGRATIONS=true`). **16 tablas.**

### 4.1 Tablas, dueño y FK

| Tabla | HU dueña | Dominio | FKs salientes (→) |
|---|---|---|---|
| `usuarios` | HU-00 | **CORE** | `aprobado_por`→usuarios |
| `contratos` | HU-01 | **CORE** | `created_by`/`residente_id`/`superintendente_id`/`supervision_id`→usuarios |
| `contrato_conceptos` | HU-01 (catálogo) | **CORE** | `contrato_id`→contratos |
| `contrato_actividades` | HU-01 (programa; consume HU-05) | **CORE** | `contrato_id`→contratos |
| `contrato_documentos` | HU-01 (PDF firmado) | **CORE** | `contrato_id`→contratos |
| `contrato_garantias` | HU-02 | **EQUIPO 2** | `contrato_id`→contratos |
| `bitacora_nota_tipos` | HU-09 (catálogo) | **CORE** | — |
| `bitacora_aperturas` | HU-08 | **EQUIPO 2** | `contrato_id`→contratos, `aperturada_por`→usuarios |
| `bitacora_firmantes` | HU-08 | **EQUIPO 2** | `bitacora_id`→bitacora_aperturas, `usuario_id`→usuarios |
| `bitacora_notas` | HU-09 | **EQUIPO 2** | `bitacora_id`→bitacora_aperturas, `tipo`→bitacora_nota_tipos, `emisor_id`→usuarios, `vinculada_a`→bitacora_notas |
| `estimaciones` | HU-12 | **CORE/EQUIPO 3** | `contrato_id`→contratos, `integrada_por`→usuarios |
| `estimacion_generadores` | HU-12 | **CORE/EQUIPO 3** | `estimacion_id`→estimaciones, `contrato_concepto_id`→contrato_conceptos |
| `estimacion_notas` | HU-12 | **CORE/EQUIPO 3** | `estimacion_id`→estimaciones, **`nota_id`→bitacora_notas** |
| `estimacion_soportes` | HU-12 | **EQUIPO 3** | `estimacion_id`→estimaciones |
| `estimacion_fotos` | HU-12 | **EQUIPO 3** | `estimacion_id`→estimaciones |
| `pagos` | HU-21 | **EQUIPO 3** | `contrato_id`→contratos, `estimacion_id`→estimaciones, `registrado_por`→usuarios |

Notas de diseño del esquema (verificadas): inmutabilidad por **triggers** (`bitacora_aperturas`, `bitacora_firmantes` con transición pendiente→firmado, `bitacora_notas` emitida→anulada, `estimaciones` carátula congelada/estado avanza, `estimacion_generadores`, `contrato_documentos`, `pagos` append-only). FKs de snapshot con `ON DELETE NO ACTION` (`estimacion_generadores→contrato_conceptos`, `estimacion_notas→bitacora_notas`, `pagos→estimaciones`) para proteger el histórico sin romper la cascada del contrato. `pu` y `pu_snapshot` en `NUMERIC(16,4)` (Paquete A1).

### 4.2 Partición propuesta `schema/00_core.sql + 10_equipo2.sql + 20_equipo3.sql`

```
00_core.sql      usuarios, contratos, contrato_conceptos, contrato_actividades,
                 contrato_documentos, bitacora_nota_tipos, estimaciones,
                 estimacion_generadores, estimacion_notas* , estimacion_soportes, estimacion_fotos
10_equipo2.sql   contrato_garantias, bitacora_aperturas, bitacora_firmantes, bitacora_notas
20_equipo3.sql   pagos   (+ FK pagos.estimacion_id ya en core)
```

**FK cruzada problemática (la única real):** `estimacion_notas.nota_id → bitacora_notas` (core/Equipo 3 → Equipo 2). Si 10 y 20 fueran archivos independientes desplegados por separado, esta FK rompería el orden. **Por eso `estimaciones*` la pongo en CORE** (la posee HU-12, que es fundación): así el core no “depende hacia abajo” de un equipo, y `bitacora_notas` (Equipo 2) se crea antes que la FK de `estimacion_notas`.

**[NIVEL 2 D-1] Mi recomendación: NO partir el archivo.** La partición de arriba es útil como **mapa de responsabilidad de diseño**, pero como 3 archivos físicos reintroduce orden-de-carga y coordinación justo en lo más frágil (las FK e inmutabilidad). Es más seguro que **el esquema siga siendo un solo `schema.sql` que solo tú editas**, y que los equipos te manden las tablas nuevas de su dominio como bloque para que tú las integres (igual que se hizo con A1/HU-12). Si aun así quieres 3 archivos, el orden de carga es **00 → 10 → 20** y `init.js` tendría que concatenarlos en ese orden.

---

## 5. Fundación a congelar — rutas exactas

Estos archivos **no los toca ningún equipo** (solo tú, vía PR-review). Llénalos en el `CLAUDE.md` como “zona congelada”.

### 5.1 Auth / login / JWT
- `backend/src/controllers/auth.controller.js` — login (verifica bcrypt, firma JWT id/rol/nombre, 8h), register (alta `pendiente` sin rol).
- `backend/src/routes/auth.routes.js` — `POST /api/auth/login`, `POST /api/auth/register`.
- `backend/src/middlewares/auth.middleware.js` — `authMiddleware` (verifica Bearer, monta `req.user`) y `requireRole(...roles)` (403).
- `backend/src/controllers/usuarios.controller.js` + `backend/src/routes/usuarios.routes.js` — aprobación/rechazo de cuentas, `/asignables` (roster).
- `frontend/src/context/SesionContext.jsx` — sesión, `login`/`logout`, persistencia `sigecop_token`/`sigecop_user`, `useVistaHU`.
- `frontend/src/pages/SeleccionRol.jsx` — UI de login/registro (y el atajo demo — ver §6).

### 5.2 Permisos + control de acceso (Paquete 1)
- `frontend/src/data/permisos.js` — matriz `PERMISOS` (HU×rol → E/C/null) y `nivelDe()` (default seguro sin rol = null).
- `frontend/src/App.jsx` — guardas `WithLayout` (obliga rol + bloquea deep-link a HU no permitida), `SoloRol`, `SoloModoProyecto`.
- `backend/src/middlewares/auth.middleware.js` — `requireRole`.
- `backend/src/lib/acceso.js` — `esParteOSupervision` (acotamiento por participación: operativos solo ven sus contratos; dependencia/finanzas ven todo). Reutilizado por contratos/bitácora/pagos/estimaciones.

### 5.3 Contrato / catálogo / AltaContrato (Paquete A1)
- `backend/src/controllers/contratos.controller.js` — `crearContrato` (transacción), derivación del monto `Σ ROUND(cant×pu,2)` sin tolerancia, clave de concepto obligatoria (art. 45 fr. IX), PDF append-only.
- `backend/src/routes/contratos.routes.js` — `POST /api/contratos`, `GET /`, `GET /:id`, `POST /:id/documento`, `GET /:id/documento[/meta]`.
- `frontend/src/pages/AltaContrato.jsx` — formulario de 6 bloques + Registrados; round2/round4; derivación de fecha término.

### 5.4 Integración de estimación HU-12
- `backend/src/controllers/estimaciones.controller.js` — `integrarEstimacion`: carátula server-side (subtotal, amortización art.143, retención 5 al millar art.191 LFD, deductivas, neto), exceso art.118, periodo art.54, solo superintendente, congelado por trigger.
- `backend/src/routes/estimaciones.routes.js` — `POST /api/estimaciones`, `GET /contrato/:id[/avance]`, `GET /:id`.
- `frontend/src/pages/IntegracionEstimacion.jsx` — captura de generadores, modal vincular notas, preview de carátula.

### 5.5 Esquema core + arranque
- `backend/src/db/schema.sql` (las 16 tablas, triggers, seed).
- `backend/src/db/init.js` (aplica schema idempotente) y `backend/src/db/pool.js` (pool PG).
- `backend/server.js` (montaje de routers — añadir una ruta nueva aquí requiere tu visto bueno + reinicio del backend).

---

## 6. Huella del modo proyecto + plan de remoción

### 6.1 Dónde vive

| Pieza | Archivo | Qué hace |
|---|---|---|
| **Estado `modo`** | `frontend/src/context/SesionContext.jsx` | `useState('proyecto')` por defecto; login/restaurar localStorage → `'aplicacion'`; logout → `'proyecto'`. |
| **Toggle UI** | `frontend/src/components/layout/Header.jsx` | `ToggleModo()`: botones “Modo proyecto / aplicación” que llaman `setModo(...)`. |
| **Atajo de rol demo** | `frontend/src/pages/SeleccionRol.jsx` (bloque “— o entra en modo demostración —”) | Botones que llaman `setRol(r.id)` **sin** login real (sin token). |
| **Metadatos de sprint/HU** | `useVistaHU` (`mostrarMeta = !enModoApp`) consumido en `HeaderVista.jsx`, `Sidebar.jsx`, `Inicio.jsx` | Muestra códigos HU, sprint, descripción académica solo en modo proyecto. |
| **Vistas “Propuesta”** | `App.jsx` `SoloModoProyecto` + `dummy.js: vistasPropuesta` | `/solicitud-acceso` solo existe en modo proyecto. |
| **Datos dummy** | `frontend/src/data/dummy.js` (922 líneas, ~55 exports) | Data mock por HU. **OJO:** `historiasUsuario` (líneas ~218–395) es **metadata estructural de rutas/menú**, la usan `App.jsx`, `Inicio.jsx`, `Sidebar.jsx` — **NO es solo del modo proyecto.** |
| **Defaults de rol** | p.ej. `TableroEstimaciones.jsx` `const rolEfectivo = rol ?? 'residente'` | Asume que en modo proyecto puede no haber rol. |

### 6.2 Qué es “Paquete 1” y maneja AMBOS modos (NO borrar)
`nivelDe()`/`PERMISOS`, la guarda `WithLayout` (rol obligatorio + bloqueo deep-link), `soloLectura` (`nivel !== 'E'`), el filtrado de sidebar/dashboard por rol, y la persistencia `sigecop_token`/`sigecop_user`. **Todo esto se queda** — funciona igual con login real.

### 6.3 Plan para quedar solo en modo aplicación (sin romper lo real)

1. `SesionContext.jsx`: quitar `modo`/`setModo`/`cambiarModo`; en `useVistaHU` fijar `enModoApp = true` y eliminar `mostrarMeta` (o dejarlo en `false`).
2. `Header.jsx`: borrar `ToggleModo` y su render.
3. `SeleccionRol.jsx`: borrar el bloque demo (separador + botones `setRol`); dejar solo login/registro.
4. `App.jsx`: borrar `SoloModoProyecto`; la ruta `/solicitud-acceso` → decidir (ver abajo).
5. `Inicio.jsx`, `Sidebar.jsx`, `HeaderVista.jsx`: quitar ramas `!enModoApp` (sección “Propuestas”, badges de sprint, códigos HU, leyenda).
6. `dummy.js`: borrar `vistasPropuesta`. **Conservar `historiasUsuario`** (es la metadata de rutas/menú) — solo se podrán ir borrando los datasets mock por HU **conforme cada HU se cablee al backend**.
7. Defaults `rol ?? 'residente'`: cambiarlos a `rol` (en modo app el rol siempre existe). **Verificar cada caso** (`TableroEstimaciones`, y revisar otras vistas).
8. Backend: **sin cambios** (ya exige token+rol; no hay bypass de modo proyecto).

**Complejidad: BAJA.** Ninguna lógica de negocio depende de `modo`.

**[NIVEL 2]** Detalle a resolver: `/solicitud-acceso` (auto-registro público) hoy está **solo en modo proyecto** (`SoloModoProyecto`), pero el backend `POST /api/auth/register` sí es real. En una app real, el registro debería ser **accesible pre-login**, no detrás del modo proyecto. Recomiendo: al quitar el modo proyecto, **mover `/solicitud-acceso` a ruta pública** (accesible sin rol, como el login) en vez de borrarla.

---

## 7. CI y pruebas + gate propuesto

### 7.1 Config actual (verificada)
- `.github/workflows/e2e.yml`: corre **solo Playwright en `frontend/`** (`npm ci` → `npx playwright install` → `npm run test:e2e`). **No levanta backend ni Postgres.** Timeout 15 min, cancela runs viejos.
- `frontend/playwright.config.js`: `webServer = npm run dev` (Vite :5173), `reuseExistingServer=false` en CI, `workers=1`, retries=1, chromium. → **Todas las specs corren contra dummy en memoria.**
- No hay lint ni unit tests configurados; el “compilar” del frontend es `vite build` (`npm run build`). El backend es JS plano (sin build).

### 7.2 Las 22 specs (`frontend/e2e/`)

| Clasificación | Specs | Se romperán al cablear backend |
|---|---|---|
| **Modo proyecto (dummy)** ~18 | hu-01, 02, 03, 04, 05, 06, 07, 08, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21 | **Sí** (dependen de `enterAppMode` + dummy/`data-testid` del prototipo, p.ej. el viejo `fila-pago-local` de HU-21) |
| **Estructural (sin sesión)** | hu-09, hu-10 | No (solo verifican shell + permisos; ya asumen que los datos reales viven en backend) |
| **Lógica pura testeable** | hu-18 (importa `calcularSemaforo`) | No necesariamente |
| **Autenticada (modelo correcto)** | `hu-registro.spec.js` con `test.skip(!!process.env.CI)` | No — corre local contra Docker, se salta en CI |

### 7.3 Gate pragmático propuesto [NIVEL 2 D-6]

1. **CI (GitHub) = solo que compile.** Reemplazar/añadir un workflow `build.yml` que haga `npm ci && npm run build` en `frontend/` (≈1 min). **Desactivar el e2e en CI** (las ~18 specs de modo proyecto no pueden pasar sin backend y dan falsos rojos). Opcional: `node --check` sobre los archivos backend como smoke de sintaxis.
2. **Smoke local por equipo (antes de pedir merge).** Cada equipo levanta `docker compose up` (db+backend+frontend) y corre su HU contra el stack real (Playwright con sesión inyectada en `localStorage`, como documenta el runbook local). Criterio: navega sin crash, permisos por rol correctos, el camino de datos real responde.
3. **Tú re-verificas al integrar** en tu compu: mergeas la rama del equipo a `main`, corres el smoke completo, y solo entonces `main` auto-despliega a Render (tú eres el único que despliega).
4. **Qué hacer con las specs rotas:** en el corto plazo, **marcarlas `test.skip(!!process.env.CI, 'requiere backend')`** (patrón de `hu-registro`) en vez de borrarlas — así no estorban en CI pero siguen corriendo local. En el mediano plazo, **reescribir como autenticadas solo las críticas** (HU-09, HU-10, HU-12 y las que cada equipo cablee) usando login real + token, y crear un workflow opcional `e2e-smoke.yml` que levante Postgres+backend. Las puramente de UX (descargas, navegación) pueden quedarse como smoke local.

### 7.4 Flujo de ramas sugerido (6 personas, 3 equipos)
```
main (protegida, solo Maiki mergea y despliega a Render)
 ├── feat/e2-bitacora-*     (Equipo 2)
 └── feat/e3-estimaciones-* (Equipo 3)
Fundación: cambios de core/esquema solo en ramas de Maiki, los equipos rebasan sobre main.
```
Regla: **nadie edita los archivos de §5.** Si un equipo necesita un endpoint nuevo del core, lo pide y lo añade Maiki a `server.js` + `schema.sql`.

---

## Apéndice — Correcciones que apliqué a los hallazgos automáticos
Durante el análisis verifiqué cada dato contra el archivo real y corregí: (1) **`.env` NO está trackeado** (un agente lo reportó como trackeado — no hay fuga); (2) **auth = HU-00**, no HU-03; (3) **16 tablas**, no 37; (4) login HU-00 es **real-backend**; (5) `contrato_documentos` es de **HU-01**. Los nombres de endpoints en este doc son los reales de `server.js`/rutas (no las paráfrasis del frontend).
