# PLAN GRANDE — Empresas + bugs smoke + nota de avance + navegación modo-sistema + limpiar [validar profe]
### Sesión autónoma de Claude Code · 18-jun-2026

> **Para Code:** sesión autónoma (Maiki ausente). UltraCode disponible para diseño + verificación adversarial.
> TODO local, sin commit/push (Maiki revisa el diff e integra). Lee PRIMERO
> `docs/contexto-claude/ESTADO_ACTUAL.md`, las historias, `docs/mockups/sigecop-modo-sistema.html` (diseño
> APROBADO), `docs/mockups/COBERTURA_MOCKUP.md` y `docs/ANALISIS_EMPRESAS_quien_administra.md`. La parte legal
> está en `docs/legal/` (.md mejor para tokens; PDF para verificar literal). Si hay duda legal, CITA artículo
> y fracción exactos; NUNCA inventes una cita.

---

## ⭐ REGLA DE ORO (la más importante — no romperla)
**El rediseño de navegación ENVUELVE; NO reemplaza el contenido real de las pantallas.** El mockup define
SOLO el marco (sidebar por flujos, barra de pasos, indicador de HU, chip de empresa, campana/por-firmar). El
**contenido de cada pantalla se conserva EXACTAMENTE como está hoy en el sistema real**, incluyendo:
- **La curva de avance REAL** (gráfica con tooltip al pasar el mouse que muestra el valor — el mockup la
  simplificó; usa la del sistema, NO la del mockup).
- **TODAS las validaciones en rojo / avisos** cuando un dato va mal (se conservan al 100%).
- **TODAS las notas de fundamento legal** ("con base en el art. X…") que aparecen en las pantallas — son un
  diferenciador clave; se conservan TODAS.
- Los cálculos, gráficas, tablas y campos reales de cada pantalla.
Si el mockup y el sistema real difieren en el CONTENIDO de una pantalla, **gana el sistema real**. El mockup
solo manda en la NAVEGACIÓN y el marco visual.

## REGLAS GENERALES (no negociables, ni trabajando solo)
- **ZONA CONGELADA intocable** salvo las formas permitidas: montar rutas en `server.js`, rutas `<SoloRol>` en
  `App.jsx`, migración aditiva idempotente en `schema.sql`. NO tocar: auth, G1-G8, cálculo de carátula,
  triggers de inmutabilidad. **`permisos.js` y `lib/acceso.js` requieren EXTREMO cuidado** (ver BLOQUE 1).
- **Tandas pequeñas**; suite completa verde tras cada tanda; si algo se pone rojo, **revierte esa tanda** y
  documenta. PUNTO DE CONTROL tras cada BLOQUE: corre la suite, deja constancia en el reporte. Si queda roja,
  NO sigas al siguiente bloque: revierte, deja verde, DETENTE y documenta.
- Cada decisión legal con su artículo o resuelta con criterio documentado. **CERO `[validar profe]` al final.**
- Mantén `ESTADO_ACTUAL.md` + historias sincronizados.

---

## BLOQUE 1 — EMPRESAS (lo de más valor; las reglas ya las decidió Maiki)
**Decisión de Maiki sobre quién administra (Opción A — mixta, con base legal art. 43 RLOPSRM / 74 Bis LOPSRM):**
el contratista/supervisión PROPONE su empresa al registrarse; **la DEPENDENCIA valida/administra el padrón**;
las dependencias van APARTE de las empresas privadas.

**Reglas de negocio (confirmadas por Maiki):**
1. **Al crear una cuenta de usuario, queda vinculada a su empresa.** (Ya existe `usuarios.empresa_id`; asegurar
   que el registro lo exija/persista.)
2. **Al registrar un contrato y ver su expediente, el sistema MUESTRA claramente a qué empresa pertenece.**
   (Mostrar la empresa en: alta, detalle del contrato, expediente, y donde tenga sentido.)
3. **Acotamiento por empresa:** cada usuario SOLO ve y administra los contratos vinculados a SU empresa. Si una
   persona de otra empresa inicia sesión, NO puede acceder ni consultar esos contratos. ⚠️ **Esto toca el
   control de acceso (`lib/acceso.js`).** Hazlo con EXTREMO cuidado y verificación adversarial: que el
   acotamiento NO rompa el acceso de los roles que sí deben ver (dependencia que valida, supervisión, etc.).
   Define con claridad: la dependencia (entidad pública) ¿ve todos los contratos de su dependencia o se acota
   distinto? Resuélvelo con criterio documentado y citando dónde aplique.
4. **Sustitución de personal:** al sustituir, SOLO se reemplaza a la persona responsable; **NUNCA se modifica la
   empresa asociada al contrato.** El contrato está ligado a la EMPRESA, no a la persona; los usuarios están
   ligados a su empresa desde que se crea su cuenta. (Revisar HU-22 roster: la sustitución no debe permitir
   cambiar la empresa.)

**Construir:** pantalla/sección de Empresas según el mockup y el análisis (padrón + bandeja "Por validar" con
detección de duplicados + dependencias aparte); el rol que administra = Dependencia. Backend de validación de
empresas. Persistir el vínculo cuenta→empresa al registrarse. Mostrar empresa en contrato/expediente. Aplicar
el acotamiento por empresa. Tests de cada regla (incluida la negativa: usuario de otra empresa NO ve el
contrato). **Verificación adversarial obligatoria del acotamiento de acceso.**

## BLOQUE 2 — BUGS DEL SMOKE (acotados, alto impacto visible)
1. **Bitácora — nota de apertura no se ve en el libro:** la nota #1 (apertura) solo aparece en "consultar
   notas", no en el libro de bitácora (emisión/libro). Corrige para que la apertura se vea como la primera
   nota del libro (folio 1), conservando su inmutabilidad.
2. **Convenios — no se ve la nota vinculada:** el convenio modificatorio tiene `nota_id` pero la UI no muestra a
   qué nota de bitácora está ligado. Muéstralo (igual que se ve el vínculo en otras pantallas).
3. **Avance — nota automática en bitácora (funcionalidad NUEVA):** cada vez que se registra un avance
   (TrabajosTerminados HU-06), que se GENERE automáticamente una nota en la bitácora, y que se vea el vínculo
   (el avance muestra a qué nota quedó ligado, y la nota referencia el avance). Respeta la inmutabilidad y el
   emisor por rol. Cita el artículo que aplique (registro en bitácora, art. 123 RLOPSRM).

## BLOQUE 3 — LIMPIAR TODOS LOS [validar profe]
Recorre TODAS las marcas `[validar profe]` que queden (historias, código, docs). Para CADA una: resuélvela con
base en la ley (cita artículo+fracción) o, si no hay base legal literal, decide con criterio conservador y
documéntalo como "criterio del equipo, default conservador". **Al final NO debe quedar ningún `[validar
profe]`.** Entrega una tabla: punto | decisión | fundamento (artículo o "criterio del equipo"). Recuerda las 3
ya fijadas (umbrales semáforo, convenio 25% avisa, dependencia solo consulta) — esas ya están, solo confirma
que no quedó ninguna marca suelta.

## BLOQUE 4 — NAVEGACIÓN MODO-SISTEMA (la más grande y riesgosa — AL FINAL)
Implementa la navegación del mockup APROBADO (`docs/mockups/sigecop-modo-sistema.html`) sobre el sistema real.
**RECUERDA LA REGLA DE ORO:** esto es marco/navegación, NO reescribir el contenido de las pantallas.
- **Sidebar por flujos** (Alta · Ciclo de estimación · Bitácora · Pago/tránsito · Convenios · Cierre/finiquito ·
  Vistas ejecutivas · Administración), reemplazando la lista de HU sueltas. Gated por rol (sin tocar
  `permisos.js`: usa el patrón de gating que ya existe).
- **Barra de pasos encadenados** arriba en cada flujo (los ambientes ya montados sirven de base).
- **Indicador discreto de HU** abajo-derecha en cada pantalla (etiqueta tipo "HU-12").
- **Chip de empresa** arriba (conecta con BLOQUE 1).
- **Campana de notificaciones** y **"Por firmar"** en la barra superior → al hacer clic, **POP-UP/dropdown**
  (no pantalla nueva) con lo pendiente por firmar y notificaciones. Conecta "Por firmar" con los datos reales
  de notas pendientes (HU-08 PorFirmar) si es viable sin tocar congelado; si no, déjalo leyendo lo que ya
  expone el backend.
- **Conserva el contenido real de cada pantalla** (curva con tooltip, validaciones en rojo, notas legales).
  Las pantallas reales NO se borran ni se funden: el flujo las ENVUELVE (cada HU sigue siendo accesible e
  identificable — regla de no fundir historias).
- Riesgo alto: trabaja en tandas chicas, una sección del menú a la vez, suite verde tras cada una. Si algo
  rompe la navegación o el acceso, revierte esa tanda.

---

## CIERRE GLOBAL
- Suite completa verde (reporta el número final). vite build OK.
- Verificación adversarial (UltraCode) de: el acotamiento de empresas (BLOQUE 1) y la navegación (BLOQUE 4) —
  que no se tocó congelado, que el contenido real de las pantallas se conservó (curva/validaciones/citas), y
  que las citas legales son reales.
- Actualiza `ESTADO_ACTUAL.md` + historias.
- Reporte final `docs/reportes/REPORTE_PLAN_GRANDE_18jun.md`: qué se hizo por bloque, estado de la suite en
  cada punto de control, TODO lo que tocó zona congelada (`server.js`/`App.jsx`/`schema.sql`/`lib/acceso.js`)
  para revisión línea por línea de Maiki, la tabla de `[validar profe]` resueltos (debe quedar en CERO), y
  cualquier decisión de criterio tomada.
- Separa para revisión lo que tocó `lib/acceso.js` (BLOQUE 1) — es lo más sensible.
- NO push.

## ORDEN Y SEGURIDAD
Orden: BLOQUE 1 (empresas) → 2 (bugs) → 3 (validar) → 4 (navegación, al final por ser la más riesgosa). Si en
cualquier bloque la suite queda roja y no se puede dejar verde, DETENTE ahí y documenta — mejor 3 bloques
sólidos que 4 a medias. La navegación (BLOQUE 4) es la única que, si sale mal, conviene dejar a medias y
reportar antes que forzar.
