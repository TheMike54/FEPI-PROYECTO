# PLAN — DATOS DE DEMOSTRACIÓN PARA EL PROFE (21-jun)

> **Esto es un PLAN razonado, NO ejecutado.** No se tocó código ni BD; no hay push. Leído del código y los docs
> REALES: `backend/scripts/seed_demo.sql`, `backend/scripts/reseed_cuentas.sql`, `backend/src/db/schema.sql`
> (siembra base), `docs/requisitos/Historias_Usuario_ACTUALIZADAS_12jun.md` (HU-00…HU-24). Para que Maiki lo lea y
> decidamos la vía.
>
> **Hallazgo que cambia el enfoque:** el seed actual (`seed_demo.sql`) **ya es bueno** — carga UN contrato rico
> (`OBRA-2026-DEMO-01`) con el **ciclo de estimación en los 6 estados** (pagada/autorizada/presentada/integrada/
> rechazada/reingreso) + bitácora abierta y firmada + 2 notas + convenio de plazo + minuta + visita + garantías con
> endoso + roster, MÁS 4 contratos **en atraso**. Eso ya demuestra **~17 de 24 HU** sin capturar a mano. El problema
> real **no es "faltan datos"**, es **(1) que el seed no corría confiable** y **(2) descubribilidad** (saber qué
> contrato/estado demuestra cada HU). El plan ataca eso.

---

## 0. RESUMEN EJECUTIVO Y RECOMENDACIÓN

| | |
|---|---|
| **Vía recomendada** | **(c) Script ejecutable robusto que siembra un set CURADO de ~9 contratos bien nombrados** (combina la idea del profe —un script— con la tuya —contratos pre-cargados—), **agrupando** los HU que son estados del mismo ciclo en un solo contrato y dando contrato propio solo a los que necesitan un estado inicial aislado. |
| **Por qué NO "un contrato por HU" (24)** | Las HU-12…16 y 20-21 son **estados de la MISMA línea de estimación** de un contrato; un contrato por cada una duplica todo el andamiaje (alta+bitácora+avance) y multiplica el mantenimiento. Las HU de **consulta/agregado** (04,05,07,10,14,17,18,19,22,23) son **vistas**, no necesitan contrato propio. 24 contratos = mucho esfuerzo y un modal de "elige contrato" gigante. |
| **Descubribilidad** | **Folios/objetos DESCRIPTIVOS** ("PRUEBA HU-15 · estimación lista para revisar") + una **hoja-chuleta** `HU → contrato → pantalla`. **Sin código especial** (tu preferencia). |
| **Robustez** | Limpieza con **`TRUNCATE … CASCADE`** (no `reset:demo`, que NO borra la basura `E2E-*`) + **re-aplicar `schema.sql` antes de sembrar** (arregla el bug-4 que hacía fallar el seed en Render) + el seed ya inserta en **orden de dependencias** y es idempotente por diseño. |
| **Empresas/cuentas** | 9 empresas con **nombres realistas mexicanos** (3 dependencias / 3 contratistas / 3 supervisiones), regla **1 empresa : N cuentas**, todos los roles. |
| **Zona congelada** | El seed (`backend/scripts/*.sql`) y los docs **NO son zona congelada**. `schema.sql` **SÍ** lo es: el plan **NO lo edita** (solo lo re-aplica tal cual, que es el runbook ya aprobado). |
| **Esfuerzo total** | **M** (≈ medio día): actualizar 2 scripts SQL + 3 contratos nuevos + 1 hoja-chuleta + actualizar `Cuentas_Prueba`. **Riesgo: bajo** (datos, no lógica). |

---

## 1. COMPARACIÓN DE VÍAS

| Vía | En qué consiste | Pros | Contras | Veredicto |
|---|---|---|---|---|
| **(a) Un contrato por HU** (tu idea) | ~20 contratos "PRUEBA HU-XX", cada uno en el estado exacto de esa HU | Clarísimo en demo en vivo: el profe dice "HU-15" → eliges "PRUEBA HU-15" | Las HU-12…16/20-21 son estados de UNA línea de estimación → duplicas alta+bitácora+avance por cada una; las HU de consulta no necesitan contrato; mantenimiento alto; modal con 20+ contratos | ❌ demasiado esfuerzo/redundancia |
| **(b) Script que el profe corre** (su idea original) | `npm run seed:demo` (lo que ya existe) | Es su petición literal; un comando; reproducible | El profe necesitaría stack/psql; en Render no puede correrlo sin shell+DATABASE_URL; **hoy falla** (ver §3) | 🟡 viable como mecanismo, pero el profe no lo corre en vivo: lo corre Maiki |
| **(c) Script robusto que siembra contratos pre-cargados CURADOS** | Un seed idempotente que deja ~9 contratos bien nombrados | Combina lo mejor de (a) y (b): un comando + contratos listos y descubribles; cubre las 24 HU con pocos contratos; corre en local y Render | Hay que curar el set y nombrarlo bien (esfuerzo medio, una vez) | ✅ **RECOMENDADO** |
| **(d) Menos contratos que cubren más HU / generador / botón UI** | Variante de (c): el contrato rico cubre ~17 HU; +3 dedicados; +4 atraso | Mínimo esfuerzo, máxima cobertura; ya casi existe | "Botón cargar demo en UI" = código + endpoint + toca `server.js` congelado → descartado; "generador parametrizable" = sobre-ingeniería para una demo | ✅ **se fusiona con (c)** (es la forma concreta de (c)) |

**Recomendación: (c) materializada como (d)** — un solo script `seed_demo.sql` robusto que deja **~9 contratos curados**:
el **rico** (cubre el ciclo + bitácora + convenio + expediente + reportes + roster + fianzas), **4 en atraso**
(tablero/alertas/portafolio) y **3 dedicados** a estados frescos (abrir bitácora, integrar periodo nuevo, listo para
finiquito). Más una **hoja-chuleta** para la demo.

> **Por qué es lo mejor para el profe Y para ti:** un solo comando (su petición), contratos ya posicionados (tu
> petición), nombres que dicen a qué HU sirven (descubribilidad), corre igual en local y Render, y reaprovecha el
> 80 % de lo que ya hay. Si en la demo el profe salta a cualquier HU, abres su contrato por el nombre y vas a la
> pantalla del sidebar — la chuleta te lo dice en una línea.

---

## 2. MAPEO COMPLETO HU → CONTRATO → PANTALLA

> Recorrido de **todas** las HU del catálogo (HU-00…HU-24). "Contrato" = cuál de los seeds la demuestra; "Estado
> pre-cargado" = en qué punto debe estar; "Pantalla" = a dónde va Maiki en el sidebar; "¿Propio?" = si necesita un
> contrato dedicado o comparte el rico.

**Leyenda de contratos del set propuesto:**
- **C-CICLO** = `PRUEBA · Ciclo completo` (el rico actual `OBRA-2026-DEMO-01`, evolucionado).
- **C-ATRASO-1..4** = los 4 en atraso actuales.
- **C-APERTURA** = contrato dado de alta **SIN** bitácora (NUEVO).
- **C-ESTIMAR** = contrato con bitácora abierta + avance, con **un periodo SIN estimar** (NUEVO).
- **C-FINIQUITO** = contrato con **todas las estimaciones pagadas** + bitácora abierta, listo para cerrar (NUEVO).
- **(sin contrato)** = flujo de creación o vista global.

| HU | Qué demuestra | Contrato | Estado pre-cargado | Pantalla (sidebar) | ¿Propio? |
|---|---|---|---|---|---|
| HU-00 | Iniciar sesión | (sin contrato) | — | Login | — |
| HU-01 | Alta de contrato | (sin contrato; creación en vivo) | wizard vacío | Alta de contrato | — (live) |
| HU-02 | Fianzas y garantías | **C-CICLO** | 3 garantías + 1 endoso + PDF | Fianzas/garantías | comparte |
| HU-03 | Convenios modificatorios | **C-CICLO** (ver) · **C-ESTIMAR** (crear) | C-CICLO ya tiene 1 convenio de plazo | Convenios | comparte |
| HU-04 | Expediente integral | **C-CICLO** | todo poblado (9 bloques) | Expediente | comparte |
| HU-05 | Programa y curva de avance | **C-CICLO** (sano) / **C-ATRASO** (rojo) | programa + avance | Curva de avance | comparte |
| HU-06 | Registrar trabajos (append-only) | **C-CICLO** o **C-ATRASO** | periodos con avance; corregible | Registrar avance | comparte |
| HU-07 | Alertas de atraso por concepto | **C-ATRASO-1..4** | periodos vencidos + avance bajo/cero | Atrasos | atraso |
| HU-08 | **Abrir** la bitácora | **C-APERTURA** | alta hecha, **sin** bitácora | Bitácora (wizard, paso abrir) | **propio** |
| HU-09 | Emitir/responder notas | **C-CICLO** | bitácora abierta y firmada | Bitácora → emitir | comparte |
| HU-10 | Consultar/buscar notas | **C-CICLO** | ≥2 notas (1 firmada) | Consultar notas | comparte |
| HU-11 | Minutas, visitas, acuerdos | **C-CICLO** | 1 minuta (PDF) + 1 visita | Minutas y visitas | comparte |
| HU-12 | **Integrar** estimación (periodo nuevo) | **C-ESTIMAR** | un periodo vigente **sin estimar** | Integrar (wizard) | **propio** |
| HU-13 | **Presentar** estimación | **C-CICLO** | estimación **#4 integrada** | Presentar | comparte |
| HU-14 | Historial de estimaciones | **C-CICLO** | 6 estimaciones (todos los estados) | Historial | comparte |
| HU-15 | **Revisar/autorizar** estimación | **C-CICLO** | estimación **#3 presentada** | Revisión | comparte |
| HU-16 | **Reingreso** tras rechazo | **C-CICLO** | estimación **#5 rechazada** | Reingreso | comparte |
| HU-17 | Tablero de estimaciones | **C-CICLO + C-ATRASO** | varias estimaciones/estados | Tablero | comparte |
| HU-18 | Portafolio ejecutivo (semáforos) | **todos** | cartera con verde/amarillo/rojo | Portafolio | todos |
| HU-19 | Exportar los 7 reportes | **C-CICLO** | datos ricos (incl. observaciones) | Reportes | comparte |
| HU-20 | Tránsito a pago (suficiencia) | **C-CICLO** | estimación **#2 autorizada** | Tránsito y pago | comparte |
| HU-21 | Registrar el pago | **C-CICLO** | estimación **#2 autorizada** (tras tránsito) | Registro del pago | comparte |
| HU-22 | Sustitución de roster | **C-CICLO** | roster con 3 vigentes | Roster / sustitución | comparte |
| HU-23 | Padrón de empresas | (sin contrato) | 9 empresas (3+3+3) | Padrón de empresas | — (catálogo) |
| HU-24 | Finiquito y cierre | **C-FINIQUITO** | todas las estimaciones pagadas + bitácora abierta | Cierre / finiquito | **propio** |

**Conclusión del mapeo:** con **9 contratos** (1 rico + 4 atraso + 3 dedicados + 0 para login/alta/padrón) se cubren
las **24 HU**. Comparten el rico **17 HU**; solo **3 HU** (08, 12, 24) necesitan contrato propio por requerir un
estado inicial que el rico ya "consumió"; **3 HU** (00, 01, 23) no usan contrato (login / creación en vivo / catálogo).

> **Matiz importante (decisión para Maiki):** si prefieres la MÁXIMA claridad en vivo para el ciclo de estimación
> (HU-12…16, 20-21), se puede dar a cada una su propio contrato "PRUEBA HU-XX" en el estado exacto (≈5-6 contratos
> extra). Cuesta más seed pero el profe no tiene que elegir "la estimación #3 dentro del contrato". **Mi recomendación
> es NO hacerlo** (el rico ya las tiene y la chuleta dice "ve a Revisión y elige la PRESENTADA"); pero es tu llamada.

---

## 3. POR QUÉ FALLABAN LOS SEEDS ANTES — Y CÓMO HACERLO ROBUSTO

### 3.1 Causas reales de que no corriera confiable
1. **`reset:demo` NO limpia la basura E2E.** `backend/scripts/reset_demo.js/.sql` solo borra los folios `OBRA-2026-%`.
   La suite e2e crea contratos `E2E-*` **sin teardown** → la base local llegó a **2 023 contratos**. El seed corría,
   pero los contratos demo quedaban **ahogados** entre miles y el sistema se volvía lentísimo (el modal de contrato
   listaba miles). *(Esto lo confirmé esta semana: `TRUNCATE` bajó de 2023 a 5.)*
2. **FKs deliberadamente `NO ACTION`** (no `CASCADE`): `estimacion_generadores→contrato_conceptos`,
   `pagos→estimaciones`, `concepto_avance / contrato_roster / estimacion_notas / minutas / visitas / convenios →
   bitacora_notas`. Un `DELETE FROM contratos` directo **aborta** porque los referenciadores siguen vivos. El seed
   actual lo maneja borrando hijos en orden, pero **cualquier limpieza ad-hoc** (o una tabla nueva no contemplada en
   el orden de borrado) **rompe**. Por eso una limpieza "a mano" fallaba.
3. **Bug-4 en Render (la causa más probable del fallo en Render).** `seed_demo.sql` inserta notas con
   `tipo='res_convenios'` (línea 172) y el ciclo usa `tipo='res_estimaciones'`. Si en Render la columna
   `bitacora_notas.tipo` quedó como **ENUM viejo** y falta el **catálogo** (`res_estimaciones`/`res_convenios`) —
   porque la migración del commit `7bb1b99` no re-corrió— ese INSERT **truena** y **aborta TODO el seed**. *(Es el
   mismo bug-4 que da "Autorizar = error interno".)*
4. **Prerrequisito de cuentas base.** `seed_demo.sql` resuelve las cuentas por email (`residente@sigecop.test`, etc.,
   sembradas por `schema.sql`). Si `schema.sql` no se aplicó completo (p. ej. `RUN_MIGRATIONS` apagado en un deploy),
   el seed **RAISE 'Faltan cuentas demo'**.
5. **Estado previo conflictivo.** Un folio demo dejado a medias por una corrida anterior interrumpida, o datos
   parciales, hacían que el `DELETE` idempotente no encontrara todo o que un INSERT chocara.

### 3.2 Diseño del seed ROBUSTO (cómo evitarlo)
- **Limpieza correcta = `TRUNCATE … CASCADE`, no `reset:demo`.** `TRUNCATE contratos CASCADE` resuelve el orden de
  FKs automáticamente (cascada a TODOS los hijos, sin importar `NO ACTION`) y deja borrón y cuenta nueva — **idempotente
  por construcción**. Conserva `usuarios`/`empresas` (son padres, no se truncan). Para limpieza TOTAL en Render
  (incl. usuarios viejos) → `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` y re-aplicar `schema.sql`.
- **Re-aplicar `schema.sql` ANTES de sembrar** (en Render): arregla el bug-4 (migra `tipo`→`VARCHAR(40)` + inserta el
  catálogo `res_estimaciones`/`res_convenios`) → el seed ya no truena. `schema.sql` es **idempotente** (es lo que
  corre `init.js` en cada arranque), así que re-aplicarlo es seguro. **No se edita** (zona congelada): solo se re-aplica.
- **Orden de inserción por dependencias** (ya lo hace el seed; mantenerlo): contrato → conceptos → periodos → programa
  → plan_amortización → garantías → roster → bitácora → firmantes → notas → avance → estimaciones → generadores →
  pagos → observaciones → convenios → minutas/visitas → (finiquito).
- **Idempotencia real:** con `TRUNCATE` previo, cada corrida parte de cero → `INSERT` siempre limpio. (Se conserva
  además el patrón `WHERE NOT EXISTS`/`ON CONFLICT` de `reseed_cuentas.sql` para cuentas/empresas.)
- **Verificación al final** (ya existe en `seed_demo.sql`): `SELECT folio,... FROM contratos` para confirmar el conteo.
- **Mensajes claros:** conservar los `RAISE EXCEPTION` (cuentas faltantes) y `RAISE NOTICE` (qué se sembró).

> **Resultado:** un seed que se puede correr **siempre**, en cualquier estado de la base, sin chocar — porque limpia
> con `TRUNCATE/DROP` (no borrado selectivo frágil) y porque el esquema (con el bug-4 ya migrado) acepta sus inserts.

---

## 4. CÓMO GUIAR A LA PANTALLA (descubribilidad)

| Opción | Cómo | Pros | Contras |
|---|---|---|---|
| **A. Folio/objeto descriptivo** (recomendada) | El folio y el `objeto` del contrato dicen la HU: folio `PRUEBA-HU15`, objeto "Estimación lista para revisar (HU-15)" | **Cero código**, robusto, visible en el modal de contrato y en el expediente | Aún navegas tú al ciclo correcto del sidebar |
| **B. Hoja-chuleta** (complemento) | Un doc `docs/GUION_DEMO_PROFE.md` con tabla `HU → contrato → pantalla → qué decir`, que tienes abierto en la demo | Cero código; te da el guion exacto en vivo; el §2 de este plan ya es el borrador | Es papel, no en la app |
| **C. Nota/banner en la pantalla** | Una nota de bitácora o un campo que diga "ve a Estimaciones → Revisión" | En contexto | Ensucia los datos; semi-código si es un banner |
| **D. Redirección automática** (contrato→pantalla) | Mapear cada contrato a su pantalla y redirigir al abrirlo | "Mágico" | **Código + toca `App.jsx` (congelado)** → descartado |

**Recomendación: A + B** (lo simple, sin código, que ya prefieres). Folios/objetos que gritan la HU **+** la chuleta
`HU → contrato → pantalla` (el §2 de este plan es exactamente eso, listo para volverse `docs/GUION_DEMO_PROFE.md`).
Nada de redirecciones ni banners especiales.

---

## 5. EMPRESAS Y CUENTAS REALISTAS (propuesta)

> 9 empresas (**3 dependencias / 3 contratistas / 3 supervisiones**), **1 empresa : N cuentas**, todos los roles.
> Contraseña común **`Sigecop2026!`** (entorno de demo, no se publica). Reutiliza los correos que ya existen en
> `schema.sql` (5 base) y `reseed_cuentas.sql` (extra) — solo cambia el **nombre de la empresa** (de "…Demo" a
> realista). En la implementación, `reseed_cuentas.sql` **renombra** las 3 empresas base que siembra `schema.sql`
> (vía `UPDATE` por nombre normalizado — conserva los vínculos `empresa_id` de las cuentas base; **no toca schema.sql**).

### 5.1 Empresas propuestas (nombre actual → realista)
| # | Tipo | Nombre actual (seed) | **Nombre realista propuesto** |
|---|---|---|---|
| 1 | dependencia | Dependencia Demo | **Secretaría de Obras Públicas del Estado de Guerrero** |
| 2 | dependencia | Dependencia Sur Demo | **H. Ayuntamiento de Chilpancingo de los Bravo** |
| 3 | dependencia | Dependencia Norte Demo | **Universidad Autónoma de Guerrero** |
| 4 | contratista | Constructora Demo | **Constructora del Bajío, S.A. de C.V.** |
| 5 | contratista | Constructora Patito SA de CV | **Edificaciones del Norte, S.A. de C.V.** |
| 6 | contratista | Constructora del Pacífico SA de CV | **Grupo Constructor Pacífico, S.A. de C.V.** |
| 7 | supervisión | Supervisión Externa Demo | **Supervisión Técnica Integral, S.C.** |
| 8 | supervisión | Supervisión Técnica Sur Demo | **Consultoría y Supervisión de Obra, S.C.** |
| 9 | supervisión | Supervisión Integral del Norte | **Ingeniería y Control de Calidad del Sur, S.C.** |

### 5.2 Cuentas (1 empresa : N cuentas) — propuesta final para `docs/Cuentas_Prueba_SIGECOP.md`
| Empresa | Persona | Correo | Rol | Contraseña |
|---|---|---|---|---|
| Secretaría de Obras Públicas de Gro. | Lic. Diana Dependencia | `dependencia@sigecop.test` | dependencia | Sigecop2026! |
| Secretaría de Obras Públicas de Gro. | Ing. Iván Residente | `residente@sigecop.test` | residente | Sigecop2026! |
| Secretaría de Obras Públicas de Gro. | Ing. Raúl Residente 2 | `residente2.demo@sigecop.test` | residente | Sigecop2026! |
| Secretaría de Obras Públicas de Gro. | C.P. Fernando Finanzas | `finanzas@sigecop.test` | finanzas | Sigecop2026! |
| H. Ayuntamiento de Chilpancingo | Lic. Diana Dependencia Sur | `dependencia.sur@sigecop.test` | dependencia | Sigecop2026! |
| H. Ayuntamiento de Chilpancingo | Ing. Iván Residente Sur | `residente.sur@sigecop.test` | residente | Sigecop2026! |
| H. Ayuntamiento de Chilpancingo | C.P. Susana Finanzas Sur | `finanzas.sur@sigecop.test` | finanzas | Sigecop2026! |
| Universidad Autónoma de Guerrero | Lic. Norma Dependencia Norte | `dep2@sigecop.test` | dependencia | Sigecop2026! |
| Universidad Autónoma de Guerrero | Ing. Néstor Residente Norte | `residente.norte@sigecop.test` | residente | Sigecop2026! |
| Universidad Autónoma de Guerrero | C.P. Nadia Finanzas Norte | `finanzas.norte@sigecop.test` | finanzas | Sigecop2026! |
| Constructora del Bajío, S.A. de C.V. | Arq. Carlos Contratista | `contratista@sigecop.test` | contratista | Sigecop2026! |
| Constructora del Bajío, S.A. de C.V. | Ing. Marco Superintendente 2 | `super2.demo@sigecop.test` | contratista | Sigecop2026! |
| Constructora del Bajío, S.A. de C.V. | Ing. Laura Superintendente 3 | `super3.demo@sigecop.test` | contratista | Sigecop2026! |
| Edificaciones del Norte, S.A. de C.V. | Ing. Pedro (superintendente) | `patito1@sigecop.test` | contratista | Sigecop2026! |
| Edificaciones del Norte, S.A. de C.V. | Ing. Paola (superintendente) | `patito2@sigecop.test` | contratista | Sigecop2026! |
| Grupo Constructor Pacífico, S.A. de C.V. | Ing. Patricia Pacífico | `pacifico1@sigecop.test` | contratista | Sigecop2026! |
| Grupo Constructor Pacífico, S.A. de C.V. | Ing. Pablo Pacífico | `pacifico2@sigecop.test` | contratista | Sigecop2026! |
| Supervisión Técnica Integral, S.C. | Ing. Sofía Supervisión | `supervision@sigecop.test` | supervision | Sigecop2026! |
| Supervisión Técnica Integral, S.C. | Arq. Sergio Supervisión 2 | `superv2.demo@sigecop.test` | supervision | Sigecop2026! |
| Consultoría y Supervisión de Obra, S.C. | Arq. Silvia Supervisión Sur | `superv.sur@sigecop.test` | supervision | Sigecop2026! |
| Ingeniería y Control de Calidad del Sur, S.C. | Arq. Nadia Supervisión Norte | `superv.norte@sigecop.test` | supervision | Sigecop2026! |

> Los **nombres de persona** podemos dejarlos como están (Maiki solo pidió empresas realistas) o también pulirlos
> (p. ej. quitar "Demo"). El contrato **C-CICLO** usa la tripleta base: Secretaría de Obras Públicas (contratante) +
> Constructora del Bajío (contratista) + Supervisión Técnica Integral (supervisión).
> **Implementación:** `reseed_cuentas.sql` (no congelado) hace `UPDATE empresas SET nombre = '<realista>' WHERE
> <nombre normalizado actual>` para las 9, y actualiza las cláusulas `WHERE nombre = …` de vínculo a los nombres
> nuevos. **No se toca `schema.sql`** (sus 3 empresas base solo se renombran por `UPDATE` desde reseed).

---

## 6. RUNBOOK (cómo se correría la vía recomendada)

> **Esfuerzo: bajo. Riesgo: bajo en LOCAL, ALTO en RENDER (destructivo → BACKUP primero).** No toca zona congelada
> (solo re-aplica `schema.sql` tal cual). Pre-requisito de implementación: actualizar `seed_demo.sql` (3 contratos
> nuevos + folios descriptivos) y `reseed_cuentas.sql` (nombres realistas) — eso es la tarea que ejecutaríamos
> después de que apruebes este plan.

### 6.1 LOCAL (rápido, conserva cuentas)
```powershell
# 1. Limpiar SOLO contratos (conserva cuentas/empresas). TRUNCATE CASCADE resuelve las FKs NO ACTION.
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c "TRUNCATE contratos CASCADE;"
# 2. Asegurar empresas realistas + cuentas (idempotente; renombra y agrega):
docker exec sigecop_backend npm run reseed:cuentas
# 3. Sembrar los contratos de prueba:
docker exec sigecop_backend npm run seed:demo
# 4. Verificar:
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c "SELECT (SELECT count(*) FROM empresas) AS empresas, (SELECT count(*) FROM usuarios) AS cuentas, (SELECT count(*) FROM contratos) AS contratos;"
docker exec -i sigecop_db psql -U sigecop -d sigecop_db -c "SELECT folio, objeto FROM contratos ORDER BY folio;"
```

### 6.2 RENDER (limpieza TOTAL + reseed) — **DESTRUCTIVO: BACKUP PRIMERO**
> Patrón `docker run --rm postgres:16-alpine` contra la **External Database URL** de Render. Sustituye `$URL`.
> **⚠️ Los pasos (c)/(d) BORRAN TODO. No los corras sin el backup (a) verificado.**

```powershell
$URL = "<EXTERNAL_DATABASE_URL_de_Render>"   # la External (no la Internal)

# (a) BACKUP — PRIMERO, NO destructivo. Deja el .sql con fecha en la carpeta actual.
docker run --rm postgres:16-alpine pg_dump "$URL" | Out-File -Encoding utf8 ".\backup_render_2026-06-21.sql"
#    Verifica que NO esté vacío antes de seguir:
(Get-Item .\backup_render_2026-06-21.sql).Length    # debe ser > 0 (idealmente cientos de KB)

# (b) 🔴 DESTRUCTIVO — LIMPIAR POR COMPLETO (incl. usuarios/empresas viejos):
docker run --rm postgres:16-alpine psql "$URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# (c) Re-crear el esquema COMPLETO (estructura + cuentas/empresas base + bug-4 ya migrado: tipo VARCHAR + catálogo
#     res_estimaciones/res_convenios). Esto RESUELVE el bug 4 "Autorizar = error interno".
Get-Content .\backend\src\db\schema.sql -Raw | docker run --rm -i postgres:16-alpine psql "$URL" -v ON_ERROR_STOP=1

# (d) Seed AMPLIADO: empresas realistas + cuentas (1:N), luego los contratos de prueba.
Get-Content .\backend\scripts\reseed_cuentas.sql -Raw | docker run --rm -i postgres:16-alpine psql "$URL" -v ON_ERROR_STOP=1
Get-Content .\backend\scripts\seed_demo.sql      -Raw | docker run --rm -i postgres:16-alpine psql "$URL" -v ON_ERROR_STOP=1

# (e) VERIFICAR conteos:
docker run --rm postgres:16-alpine psql "$URL" -c "SELECT (SELECT count(*) FROM empresas) AS empresas, (SELECT count(*) FROM usuarios) AS cuentas, (SELECT count(*) FROM contratos) AS contratos;"
docker run --rm postgres:16-alpine psql "$URL" -c "SELECT folio, objeto FROM contratos ORDER BY folio;"
docker run --rm postgres:16-alpine psql "$URL" -c "SELECT data_type FROM information_schema.columns WHERE table_name='bitacora_notas' AND column_name='tipo';"   # debe decir 'character varying' (bug-4 ok)
```

**Resultado esperado:** `empresas = 9`, `cuentas = 21`, `contratos = 9` (1 ciclo + 4 atraso + 3 dedicados +/-),
`bitacora_notas.tipo = character varying`. Tras esto, Render queda limpio, con datos realistas y **sin el bug-4**.

> **Nota Render alternativa (sin Docker local):** los mismos pasos corren desde el **Shell del servicio
> `sigecop-backend`** (donde `DATABASE_URL` ya está cargada): `npm run reseed:cuentas && npm run seed:demo`, y para
> el schema, redeploy con `RUN_MIGRATIONS=true`. El backup ahí: `pg_dump "$DATABASE_URL" > /tmp/backup.sql` y bajarlo.

---

## 7. ESFUERZO / RIESGO / ZONA CONGELADA (por parte)

| Parte | Implementación | Esfuerzo | Riesgo | ¿Congelado? |
|---|---|---|---|---|
| Set de 9 contratos curados | Ampliar `seed_demo.sql`: +3 contratos (C-APERTURA, C-ESTIMAR, C-FINIQUITO), folios descriptivos | M | bajo (datos) | no |
| Robustez (limpieza/orden/idempotencia) | Documentar/usar `TRUNCATE`/`DROP`; el orden ya está en el seed | S | bajo | no |
| Guía a pantalla (A+B) | Folios descriptivos + `docs/GUION_DEMO_PROFE.md` (este §2) | S | nulo | no |
| Empresas/cuentas realistas | `reseed_cuentas.sql`: `UPDATE` de 9 nombres + vínculos; actualizar `docs/Cuentas_Prueba_SIGECOP.md` | S | bajo | no (renombra; **no toca schema.sql**) |
| Runbook Render | Documentado arriba; lo corres tú | S (correrlo) | **🔴 destructivo** (mitigado con backup) | re-aplica schema (no lo edita) |
| Bug-4 | Se resuelve solo al re-aplicar `schema.sql` en (c) | — | — | schema.sql se re-aplica, no se edita |

---

## 8. DECISIONES PARA MAIKI (antes de implementar)
1. **¿Vía (c)/(d) recomendada** (9 contratos curados + chuleta) **o tu (a)** (un contrato por HU, ~20)? — recomiendo (c)/(d).
2. **Ciclo de estimación:** ¿un solo contrato rico con las 6 estimaciones (recomendado) o un contrato dedicado por
   cada estado HU-12…16/20-21 (más claro en vivo, más seed)?
3. **Nombres de persona:** ¿los pulimos también o solo las empresas?
4. **Folios:** ¿formato `PRUEBA-HU15` / objeto descriptivo, o conservamos `OBRA-2026-…` y la chuleta hace el mapeo?
5. **Render:** ¿`DROP SCHEMA` (limpieza total, recomendado para "por completo") o `TRUNCATE` selectivo (menos agresivo)?

> Cuando elijas, implemento: actualizo `seed_demo.sql` + `reseed_cuentas.sql` + `docs/Cuentas_Prueba_SIGECOP.md` +
> `docs/GUION_DEMO_PROFE.md`, lo pruebo en LOCAL (build no aplica; es SQL — lo valido corriendo el seed y verificando
> conteos), y te entrego el runbook listo para que lo corras en Render. **Nada de esto se ejecutó aún.**

---

*Plan generado leyendo el código y los seeds reales. NO se tocó código ni BD. NO push. Pendientes en cola (de tus
mensajes previos, a tu confirmación): BUG 1 (modal no se relanza / contrato heredado entre cuentas) y BUG 2 (chip
muestra rango, no la HU puntual) — NO ejecutados porque este mensaje pidió "sin tocar código".*
