# Prompts de acción por equipo — SIGECOP

Cada bloque es un **prompt listo para pegar** en Claude Code, abierto en la raíz del repo (`sigecop/`). Asume que el `CLAUDE.md` de la raíz ya está cargado (reglas, zona congelada, convenciones). Léelo antes de empezar.

**Reglas comunes (válidas para los 3):**
- No edites la **zona congelada** del `CLAUDE.md`. Si necesitas un endpoint montado o una tabla, **pídeselo a Maiki** (PR/mensaje).
- **No edites `schema.sql`.** Manda a Maiki el bloque de DDL que necesites (referencia: `docs/Borrador_DDL_Tablas_Nuevas_SIGECOP.md`).
- Trabaja en tu rama (`feat/e2-*` o `feat/e3-*`). Antes de pedir merge: **smoke local** de tu HU contra el stack Docker.
- Cita el artículo legal en cada validación; lo legal lo confirma el profe.

---

## 1) Prompt — FUNDACIÓN (Maiki)

```
Soy el integrador de SIGECOP. Trabajo la FUNDACIÓN (zona congelada: puedo editarla yo). Sigue el CLAUDE.md de la raíz. Idioma: español. NO trabajes en modo proyecto (va a retirarse). Orden estricto de trabajo:

1) A2 — PROGRAMA DE OBRA (PRIMERO, bloquea a Equipo 2 y a HU-03):
   Rehacer el programa de obra como CONCEPTOS DEL CATÁLOGO repartidos en periodos (matriz concepto × periodo). Reemplaza el modelo actual de `contrato_actividades` (texto libre) por filas concepto↔periodo↔cantidad, validando que la suma por concepto NO exceda lo contratado (catálogo). El programa define el CICLO DE ESTIMACIÓN (mes/quincena). Diseña primero el DDL (tabla nueva tipo `contrato_programa` con FK a `contrato_conceptos`), pruébalo idempotente 2–3× en local, intégralo a schema.sql, y cablea el alta (AltaContrato.jsx + contratos.controller.js). Fundamento (literal RLOPSRM, art. 45 apartado A): el CATÁLOGO/clave es la fr. IX ("formará el presupuesto de la obra"); el PROGRAMA de obra es la fr. X ("programa de ejecución convenido conforme al catálogo de conceptos, calendarizado y cuantificado por periodos, diagramas de barras o ruta crítica"). + anexo del profe (matriz concepto×periodo, "cuadra con el catálogo").

2) Paquete B — ANTICIPO como regla de negocio (literal): >30% exige AUTORIZACIÓN ESCRITA DEL TITULAR de la dependencia/entidad (art. 50 fr. IV LOPSRM); >50% el Área responsable debe INFORMAR a la SFP previamente, señalando las razones que lo sustenten (art. 139 RLOPSRM). El sistema lo materializa: permite pero OBLIGA a subir el PDF de autorización/justificación y bloquea hasta subirlo. En el alta.

3) Paquete C-críticos (UX del alta, lo entrelazado con la lógica): C1 formulario nuevo VACÍO; C7 validar en vista incremental y NO perder datos al navegar/recargar; C8 arreglar de fondo el bug de carga del PDF. (Lo cosmético C9/C10/C11/U4 lo hace Equipo 2 contra estos archivos, en PRs que tú revisas.)

4) Paquete F — SUSTITUCIÓN DE PERSONAS (art. 125): tabla `contrato_roster` (1:N histórico, "solo uno activo"), conservando los punteros escalares de `contratos` como caché. Endpoint `POST /api/contratos/:id/sustituir` que sincroniza cache↔roster en UN SOLO punto de escritura, en transacción. Seed: una fila activa por cada puntero existente. Actualiza las historias afectadas (S3).

5) HU-03 — CONVENIOS MODIFICATORIOS (tras A2): migración (`convenios_modificatorios` + `convenio_conceptos`) + endpoint que versiona el catálogo (art. 59 / 59 Bis). El equipo construye la UI encima de tu endpoint.

6) CMIC / 2 al millar (D-8): añade `retencion_cmic` a `estimaciones` (parametrizable, DEFAULT 0), actualiza el cálculo del neto y el trigger de inmutabilidad. La TASA y si aplica en Etapa 1 = Nivel 1, las confirmas TÚ con el profe (base LFD/CMIC, NO LOPSRM). No la hardcodees.

7) Cierre de HU-12: conecta el preview de la carátula contra el cálculo server-side; soportes/fotos reales si da tiempo.

8) REMOCIÓN del modo proyecto (§6 del plan) + limpieza de CI: deja la app en modo aplicación; borra/reescribe como autenticadas las ~18 specs de modo proyecto; deja CI en build (vite build). DOS detalles obligatorios: (a) /solicitud-acceso → MUÉVELA a ruta PÚBLICA (accesible sin login, como el login), NO la borres — el endpoint POST /api/auth/register es real; (b) CONSERVA `historiasUsuario` en dummy.js (es metadata de rutas/menú, NO dato dummy) — solo borra los datasets mock por HU conforme cada HU se cablea al backend.

Reglas: cada cambio de esquema con el runbook (backup → psql --single-transaction -v ON_ERROR_STOP=1 → verificar código viejo sobre esquema nuevo → push). Idempotencia siempre. Tú eres el único que despliega.
```

---

## 2) Prompt — EQUIPO 2 (Bitácora / documental / avance físico)

```
Somos el Equipo 2 de SIGECOP: dominio bitácora, contrato documental y avance físico. Sigue el CLAUDE.md de la raíz. Idioma: español. NO toques la zona congelada ni schema.sql; las tablas y el montaje en server.js los pide Maiki. NO construyas nada que dependa del modo proyecto (se retira). Rama feat/e2-*.

ARRANCAR YA (no dependen de A2):
- HU-02 Fianzas: backend nuevo (fianzas.controller.js + routes) para gestionar pólizas post-alta y endosos por modificatorio; alertas de vigencia 30/15/5 DERIVADAS en lectura de contrato_garantias.vigencia. Tabla `garantia_endosos` (pídela a Maiki). Cablear RegistroFianzas.jsx.
- HU-04 Expediente: cablear ConsultaExpediente.jsx al GET /api/contratos/:id real (ya devuelve los 5 bloques). Buscador AND + descargas.
- HU-07 Alertas de atraso: backend (alerta_atraso, pídela a Maiki) + cablear AlertasAtraso.jsx. Canal solo 'sistema' (in-app) en Etapa 1.
- HU-11 Minutas/visitas: backend (minutas, visitas — pídelas a Maiki, PDF en BYTEA) + cablear MinutasVisitas.jsx; adjuntar minuta como referencia en nota (HU-09).

CORRECCIONES DEL PROFE sobre la bitácora ya construida (HU-08/09/10):
- HU-08: datos mínimos del art. 123 fr. III en la nota de apertura (B1); apertura = NOTA #1, folios consecutivos desde ahí (B2).
- HU-09: completar tipos de nota por rol según art. 125 RLOPSRM (residente = fr. I, superintendente/contratista = fr. II, supervisión = fr. III; el art. 122 es el uso obligatorio de la Bitácora, NO los tipos de nota). Revisar la cobertura del contratista contra la fr. II (N1); "entrega de concepto" jala del catálogo y la registra el contratista (N2/N3); resolver flujo de firma de notas (N5, tras verificar el texto legal con Maiki/profe).
- HU-10: vista central "ver bitácora" que muestre todas las notas (N4).

DESPUÉS de que A2 (programa de obra) aterrice (Maiki avisa):
- HU-06 Trabajos terminados: tabla `concepto_avance` (FK a contrato_conceptos + nota de bitácora; pídela a Maiki); valida acumulado ≤ contratado (art. 118). Cablear TrabajosTerminados.jsx.
- HU-05 Curva de avance: curva programado vs ejecutado vs financiero a partir del programa (A2) + concepto_avance (HU-06). Cablear CurvaAvance.jsx.

COSMÉTICO del alta (PRs pequeños contra archivos congelados, los revisa Maiki): C9 modales "¿salir?"; C10 catálogo de unidades (mes/hectárea/Otro); C11 "siguiente/guardar"; U4 tipo de póliza seleccionable.

Patrón a seguir: HU-08/09/10 ya cableadas son tu referencia (auth + acceso por participación + server-side). Smoke local antes de pedir merge.
```

---

## 3) Prompt — EQUIPO 3 (Estimaciones / pagos / reportes)

```
Somos el Equipo 3 de SIGECOP: dominio ciclo de estimación, pagos y reportes ejecutivos. Sigue el CLAUDE.md de la raíz. Idioma: español. NO toques la zona congelada ni schema.sql; las tablas/columnas y el montaje en server.js los pide Maiki. NO dependas del modo proyecto (se retira). Rama feat/e3-*.

Base ya construida (referencia y cimiento): HU-12 integración de estimación (core, de Maiki) y HU-21 registro de pago. Coordina con Maiki el cierre de HU-12.

TAREAS (cablear prototipos al backend; casi todo cuelga de `estimaciones`):
- HU-13 Envío: columnas `enviada_en/enviada_por` (pídelas a Maiki). Sello de fecha/hora, arranca plazo art. 54 (6 días presentación → 15 revisión), notificación in-app a residencia/supervisión. Cablear EnvioEstimacion.jsx.
- HU-14 Historial: GET historial real (la máquina de estados ya existe). Cablear HistorialEstimaciones.jsx.
- HU-15 Revisión: tabla `estimacion_observaciones` (FK a estimaciones; pídela a Maiki): observaciones por sección con tipo/severidad, turnado supervisión→residencia, semáforo 15 días (art. 54). Cablear RevisionEstimacion.jsx.
- HU-16 Reingreso: columna `reemplaza_a` (self-FK en estimaciones; pídela a Maiki). Nueva versión vinculada a la rechazada SIN reiniciar plazo. Cablear ReingresoEstimacion.jsx.
- HU-17 Tablero: GET de estimaciones aceptadas/en proceso + indicadores agregados + "mis pendientes" por rol. Cablear TableroEstimaciones.jsx.
- HU-18 Portafolio: vista multi-contrato; semáforo de 3 factores; agrupaciones; comparación de periodos. Cablear PortafolioEjecutivo.jsx.
- HU-19 Reportes: generar los 7 reportes desde datos reales (hoy son client-side desde dummy). Cablear ExportacionReportes.jsx.
- HU-20 Tránsito a pago: tablas `presupuesto_anual` + `instruccion_pago` (pídelas a Maiki). Suficiencia presupuestal (art. 24), soportes obligatorios, semáforo 20 días (art. 54), notificación in-app a Finanzas. Esto RECONECTA pagos.estimacion_id (hoy nullable) cerrando HU-12→HU-20→HU-21.
- HU-21: reconectar la FK pagos.estimacion_id a la estimación real (con HU-20).

Patrón a seguir: HU-12/HU-21 ya cableadas son tu referencia (auth + acceso por participación + cálculo server-side + append-only). Notificaciones = solo in-app en Etapa 1 (email = Etapa 2). Smoke local antes de pedir merge.
```

---

### Nota de secuencia (para Maiki, al repartir)
1. **A2 primero** — desbloquea HU-05, HU-06 (Equipo 2) y HU-03.
2. Equipo 2 arranca con **HU-02/04/07/11** + correcciones de bitácora (no esperan a A2).
3. Equipo 3 arranca con **HU-13/14/17/18/19** (no dependen de tablas de fundación pesadas); **HU-15/16/20** en cuanto Maiki cree sus columnas/tablas.
4. Cada tabla del borrador de DDL se integra con el runbook cuidadoso, en la fase de acción.

---

### Base legal verificada (literal, contra LOPSRM.pdf / Reg_LOPSRM.pdf — 2026-06-02)
- **Catálogo / clave de concepto** = art. 45 apartado A **fr. IX** RLOPSRM ("…formará el presupuesto de la obra…").
- **Programa de obra** = art. 45 apartado A **fr. X** RLOPSRM ("programa de ejecución convenido conforme al catálogo de conceptos, calendarizado y cuantificado por periodos").
- **Anticipo >30%** = **art. 50 fr. IV LOPSRM** (autorización escrita del titular). **Anticipo >50%** = **art. 139 RLOPSRM** (informar a la SFP previamente, con las razones).
- **Amortización del anticipo** = **art. 138 RLOPSRM**. **Retención 5 al millar** = **art. 191 LFD**. **Exceso de cantidades** = **art. 118 RLOPSRM**. **Plazos de estimación/pago** = **art. 54 LOPSRM**.
- **Tipos de nota de bitácora por rol** = **art. 125 RLOPSRM** (fr. I residente · **fr. II superintendente/contratista** · fr. III supervisión). **art. 122** = uso obligatorio de la Bitácora (NO tipos de nota).
- **Sustitución de personas** = **art. 125 fr. I inciso g) RLOPSRM** ("La sustitución del superintendente, del anterior residente y de la supervisión").
- **CMIC / 2 al millar** = base **LFD / aportación CMIC de capacitación** (NO LOPSRM); **tasa y aplicabilidad a confirmar con el profe** (Nivel 1).
