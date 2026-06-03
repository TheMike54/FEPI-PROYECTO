# Plan de paralelización del equipo — SIGECOP

**Situación:** 6 personas, 3 semanas, 9 sprints. El equipo 1 (Maiki + Iván) ya hizo los sprints 1–3 (en producción, con correcciones en curso). Dividimos en **3 mini-equipos de 2**; cada equipo corre el sistema en su propia máquina (local). Meta: terminar los sprints restantes en paralelo **sin que la integración sea un caos**.

> **Principio rector:** esto no se gana escribiendo código, se gana en la integración. Por eso: fundación congelada, dominios independientes, esquema partido por equipo, integración continua con un solo integrador (Maiki), y pruebas obligatorias verificadas por el CI. Tres semanas con dos equipos arrancando en frío es apretado — el setup se come los primeros días, así que prioricen lo importante sobre "los 9 sprints perfectos".

---

## 1. Modelo de integración (cómo se junta todo)

- Repo único en GitHub (todos como colaboradores). **Render despliega SOLO de `main`.**
- Cada equipo trabaja en **su propia rama** (`equipo2/hu-02`, `equipo3/hu-13`…), **nunca en `main`**.
- **Branch protection en `main`:** nadie puede pushear directo a main; los cambios entran solo por Pull Request que **Maiki revisa y aprueba**.
- **Maiki es el único integrador:** jala la rama del equipo a su computadora → prueba que todo funcione junto en local → mergea a `main` → eso dispara el deploy a Render. **Render solo ve lo que Maiki probó.** Los equipos nunca despliegan.
- **Integración continua, no big-bang:** se mergea cada HU terminada y probada, no todo al final (el big-bang al final es donde explota).

## 2. Partición por dominio (NO por sprint en cadena)

Partir los sprints 4–9 en secuencia haría que el equipo B dependiera del A. Cortamos por **áreas independientes** que se apoyan solo en la fundación ya hecha. Borrador (se afina con el mapa de dependencias):

- **Equipo 1 (Maiki + Iván):** correcciones del profe (programa de obra matriz, bitácora/notas legal, anticipo, sustitución de personas) + la historia faltante del sprint 3. Es lo crítico y lo conocen. **Dueños de la fundación.**
- **Equipo 2 — dominio Contrato:** fianzas (HU-02), convenios (HU-03), consulta de expediente (HU-04), curva de avance (HU-05), alertas (HU-07), minutas (HU-11). Todo se apoya en el contrato/catálogo (ya hecho); independiente del equipo 3.
- **Equipo 3 — dominio Estimación→Pago:** trabajos terminados (HU-06), envío (HU-13), historial (HU-14), revisión (HU-15), reingreso (HU-16), tablero (HU-17), portafolio (HU-18), exportación (HU-19), tránsito a pago (HU-20). La cadena vive dentro de su equipo, sobre HU-12 (ya hecho).

> La carga se balancea con el **mapa de dependencias** que sacará Claude Code (qué HU necesita qué). Si un equipo queda muy cargado, se mueven HUs ligeras (p. ej. tableros/dashboards) al otro.

## 3. Esquema partido por equipo (resuelve el merge de la BD)

En vez de que 3 equipos editen el mismo `schema.sql` (conflicto seguro), se parte en archivos cargados en orden:
- `schema/00_core.sql` — la fundación (solo equipo 1).
- `schema/10_equipo2.sql` — tablas del equipo 2.
- `schema/20_equipo3.sql` — tablas del equipo 3.

Cada equipo escribe **solo en su archivo** → casi cero conflictos. Cada archivo es **aditivo e idempotente** (el patrón que ya usamos). Al integrar, es concatenar. Cada quien minimiza FKs hacia tablas de otro equipo (solo referencian la fundación).

## 4. Fundación congelada + reglas para Claude Code

Los archivos críticos los toca **solo el equipo 1**: login/JWT, control de acceso (`permisos.js`), contrato/catálogo, y `schema/00_core.sql`. Se protege en tres capas:
- **CLAUDE.md** (lo lee el Claude Code de cada equipo): lista de archivos **congelados (solo lectura)**, los archivos **propios** de cada equipo, "el esquema va solo en tu archivo", nombres de rama, y el flujo obligatorio de pruebas. *Orienta* a Code.
- **CODEOWNERS + branch protection:** cambios a la fundación requieren aprobación de Maiki. *Enforcea* de verdad.
- ⚠️ El CLAUDE.md no es un candado mágico — orienta a Code, pero el bloqueo real son CODEOWNERS + branch protection + el CI.

## 5. Pruebas obligatorias (no se saltan, se comprueban)

- Cada HU lleva **sus pruebas** (como hizo el equipo 1: build + e2e + smoke).
- El **CI** (GitHub Actions, hoy corre Playwright del frontend) corre en **cada PR**; **branch protection no deja mergear si está en rojo.** Eso es "no se la pueden saltar y queda comprobado".
- Además, un **smoke manual** donde el equipo comprueba en su BD (DBeaver) que pasó lo que debía pasar, pegado en el PR para que Maiki lo revise.
- **Precondición:** el CI tiene que quedar **verde primero** → limpiar las ~20 specs de Paquete 1 que rompieron con el control de acceso.

## 6. Ordenar la carpeta primero

Antes de que entren los equipos: organizar `docs/` + la carpeta del proyecto + `.gitignore` de lo interno (transcripciones, análisis que nombran al profe, backups). Estructura clara para que cada equipo sepa dónde va su trabajo. Lo hace Code con cuidado (docs + estructura, **sin** refactorizar código).

## 7. Secuencia para mañana (orden de los prompts a Code)

1. **Ordenar carpeta/docs + `.gitignore`** → base limpia.
2. **Guía de setup local** (`SETUP_LOCAL.md`, verificada contra el repo) → para que instalen y levanten (Docker, Node, Git, DBeaver, Claude Code).
3. **Mapa de dependencias de HUs** → fija la partición exacta y balanceada.
4. **Partir el `schema` en archivos por equipo** + ajustar `init.js`.
5. **Limpiar las ~20 specs de Paquete 1** → CI verde (precondición de las pruebas obligatorias).
6. **CLAUDE.md de reglas** (con la lista de archivos congelados ya confirmada por Code) + configurar **CODEOWNERS + branch protection** + el gate de CI.
7. Cada equipo **arranca su dominio** en su rama.

## 8. Cierre y deploy

Cada equipo entrega por PR → Maiki jala, integra en su compu, prueba que **todo funcione junto** → mergea a `main` → Render despliega. **Solo Maiki despliega.** La integración es continua (frecuente), no un gran merge al final.

---

### Riesgos a tener presentes
- **Integración = el punto frágil.** Mergear seguido (no al final) es lo que lo mantiene sano.
- **3 semanas es apretado** y dos equipos arrancan en frío: el setup y la curva se comen los primeros días. Prioricen lo legal y lo más importante.
- El **CLAUDE.md orienta pero no bloquea**; el blindaje real son los gates de GitHub + CI.
- **Render gratis (PostgreSQL) expira el 25 jun** — tenerlo en cuenta para el cierre.
