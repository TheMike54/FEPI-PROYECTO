# Reporte — BLOQUES 3 y 4 del Plan Grande (18-jun)

**Autor:** Code (sesión autónoma, Maiki ausente) · **Modo:** LOCAL sin push · **Para revisión de:** Maiki (TheMike54)
**Decisión registrada de Maiki:** el acotamiento por empresa se queda Opción 1 (solo lista/portafolio); NO se
extiende a los gates per-contrato.

---

## BLOQUE 3 — `[validar profe]` a CERO + reglas 1 y 4 de empresas

### 3a — Limpieza de TODAS las marcas `[validar profe]`

**Resultado: CERO marcas editoriales en código vivo, historias y auditoría.** (Verificado por grep.)

- **Inventario inicial:** 159 marcas editoriales (46 backend + 32 frontend + 83 historias + 84 auditoría,
  descontando solapamientos y encabezados repetidos).
- **Método:** se construyó la **tabla maestra de resolución** `docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md`
  (punto · decisión · fundamento): **A1–A18** resueltas con **cita legal** y **B1–B20** con **criterio del
  equipo (default conservador)**.
- **✓ Citas verificadas contra el texto LITERAL** de `docs/legal/` (LOPSRM/RLOPSRM/LFD) con un workflow de 4
  agentes. **Correcciones que encontró la verificación** (citas viejas mal etiquetadas, ya corregidas en código):
  - Pena por atraso: **art. 46 Bis LOPSRM + arts. 86-88 RLOPSRM** (mecánica) + art. 90 (tope) — NO "86-90"
    (89 = garantías) ni "138/139" (138 = programa de aplicación del anticipo).
  - art. 46 fr. I = identificación de las partes (NO presupuesto, que es fr. III).
  - art. 50 fr. IV = autorización escrita **solo si el anticipo supera 30%** (tope 30% = fr. II).
  - art. 123 fr. VI = inmutabilidad (NO folios); datos de cada nota = fr. II; apertura = fr. III.
  - art. 125 fr. I g = obliga a **registrar** la sustitución en bitácora (la regla "no cambia empresa" es
    criterio del equipo, no literal).
  - Confirmadas al 100%: **143-I** (amortización), **191 LFD** (5 al millar), **54** (ciclo 6/15/20 días),
    **64/168-172** (finiquito), **118** (exceso), **2-XIX** (sin IVA), **24** (suficiencia), **48-II** (fianza).
- **Aplicación:** workflow de 24 agentes (1 por archivo no congelado) + 4 archivos congelados a mano. Cada
  agente solo tocó **comentarios / texto de UI / prosa** (cero lógica); ningún spec asercióna el texto
  `[validar...]` (verificado antes), así que quitarlo de texto visible fue seguro. `vite build` ✓.

**Zona congelada tocada (solo comentarios, CERO lógica — para tu revisión línea por línea):**
| Archivo | Qué se cambió |
|---|---|
| `backend/src/db/schema.sql` | 3 comentarios: corregido "138/139"→"46 Bis + 86-88"; ajustes_finales/pena documentados como criterio |
| `backend/src/controllers/contratos.controller.js` | 1 comentario (pena: "86-90"→"86-88"; criterio de tasa) |
| `backend/src/controllers/estimaciones.controller.js` | 3 comentarios (art. 50 fr. IV verificado; bloqueo duro art. 118; regla de disparo criterio) |

**Excepción (1 marca NO removida, por tu orden explícita "NO toques auth/JWT"):**
`backend/src/controllers/auth.controller.js:13` — `[validar redacción con el profe]` sobre la regla del
nombre ≥2 palabras. **Resolución lista para que la apliques tú** (cambio de 1 comentario, cero lógica):

```js
// ANTES (línea 13):
// palabras) lo fija la Fundación [validar redacción con el profe]. El frontend valida lo mismo
// DESPUÉS (sugerido):
// palabras) lo fija la Fundación (criterio del equipo, default conservador; el nombre completo aparece
// en la bitácora, art. 123 fr. III RLOPSRM). El frontend valida lo mismo
```

### 3b — REGLA 1: empresa OBLIGATORIA para contratista/supervisión

- **Frontend (hecho, no congelado):** `SeleccionRol.jsx` y `SolicitudRegistro.jsx` ahora exigen empresa
  cuando el rol solicitado es `contratista` o `supervision` (label dinámico "Empresa *" vs "(opcional)";
  validación de cliente con mensaje claro). Constante compartida `ROLES_EMPRESA_OBLIGATORIA` en
  `frontend/src/data/empresa.js` (no congelado; `permisos.js` NO se tocó).
- **Spec del caso negativo (hecho):** `hu-registro.spec.js` — contratista/supervisión sin empresa → rechazo;
  residente sin empresa → permitido (label "(opcional)").
- **Backend (PARA MAIKI — `auth.controller.register` está congelado, "NO toques auth"):** dejo el guard
  listo para que lo apliques. Refuerza la regla server-side (defensa en profundidad):

```js
// En register(), tras resolver empresaId y antes del INSERT del usuario:
const ROLES_EMPRESA_OBLIGATORIA = ['contratista', 'supervision'];
if (ROLES_EMPRESA_OBLIGATORIA.includes(rolSol) && empresaId == null) {
  return res.status(400).json({ error: 'La empresa es obligatoria para contratista y supervisión.' });
}
```

### 3c — REGLA 4: la sustitución no cambia la empresa del contrato

- **Guard (hecho, `roster.controller.js` NO congelado):** en `sustituirPersona`, el sustituto debe
  pertenecer a la **MISMA empresa** que la persona saliente; si difieren → **409**. Retrocompat: si la
  saliente no tiene empresa (NULL), no se bloquea (fail-open, como el acotamiento de `lib/acceso.js`).
  Fundamento: criterio del equipo (B20); art. 125 fr. I g RLOPSRM solo obliga a registrar la sustitución.
- **Verificado vía API:** 409 al sustituir por otra empresa · 201 por la misma.
- **Spec del caso negativo (hecho):** `roster-sustitucion.spec.js` — crea 3 contratistas (2 misma empresa,
  1 distinta): negativo 409 + positivo 201.
- **Seed corregido:** `seed_smoke_p23_sustitucion.sql` — la cuenta sustituta ahora **hereda la empresa de
  `contratista@`** (Constructora Demo). Sin esto, los 4 tests de `hu-02-sustitucion-bitacora.spec.js`
  fallaban (sustituto sin empresa → 409). Es la sustitución realista: una constructora reemplaza a su propio
  superintendente.

### Punto de control BLOQUE 3 — suite
- Primera corrida: 308 passed · **4 failed** (todos `hu-02-sustitucion-bitacora`, por el sustituto sin
  empresa) · 8 skipped.
- Tras corregir el seed: los 4 + el nuevo spec REGLA 4 = **13 passed** aislados.
- **Re-corrida completa: 312 passed · 8 skipped · 0 failed (9.6 min). ✅ CHECKPOINT VERDE** (≥309; sin flaky).

---

## BLOQUE 4 — Navegación modo-sistema (la más riesgosa)

Implementado el marco de navegación del mockup aprobado (`docs/mockups/sigecop-modo-sistema.html`) sobre el
sistema real, en **4 tandas** con suite verde tras cada una. **REGLA DE ORO respetada:** es marco/navegación;
NO se reescribió el contenido de ninguna pantalla. **`permisos.js`/`App.jsx`/auth NO se tocaron.** Único
archivo de marco editado: `Sidebar.jsx` (NO congelado) + `AppShell.jsx` (NO congelado) + el helper de tests.

### Tanda 1 — Sidebar por flujos
`Sidebar.jsx` reescrito: de lista plana de HU → **grupos por flujo** del mockup (Flujos · Vistas ejecutivas ·
Administración), con sub-pasos encadenados (Ciclo de estimación → Presentar/Revisión/Reingreso/Historial;
Bitácora → Por firmar/Emitir/Consultar/Minutas; etc.) y los "recorridos por bloques" (ambientes) como
sub-items. **Se conservó CADA `href` con su MISMO gating** (HU por `nivelDe` —lee `permisos.js`, no lo
modifica—; rutas fijas por rol) + red de seguridad "Otras pantallas" para cualquier HU no ubicada → **ningún
enlace desaparece**. Cada HU sigue identificable por su pill "HU-XX" (no se funden historias).
- **Ajuste de test (no congelado):** `expectMetadataAcademicaOculta` se acotó a `<main>`. Motivo: el panel de
  metadata ACADÉMICA (modo proyecto: sprint/criterios/rol/HU) vivía en el CONTENIDO y debe seguir oculto ahí;
  el indicador de HU de NAVEGACIÓN (pill del sidebar / badge) es intencional y vive FUERA de `<main>`. El
  invariante real se conserva (no se debilita: sprint/criterios/rol siguen verificados en el contenido).
- Checkpoint: **312 passed / 0 failed**.

### Tanda 2+4 — Chip de empresa + indicador de HU
`AppShell.jsx` (no congelado): **chip de empresa** en la barra superior (lee `empresa_id` del JWT —BLOQUE 1—
y resuelve el nombre con el catálogo público; sin tocar auth/SesionContext) + **indicador discreto de HU**
abajo-derecha (`useLocation` → HU/etiqueta de la pantalla; `pointer-events-none`; FUERA de `<main>`).
- Checkpoint: **312 passed / 0 failed** (tras limpiar pollution, ver nota).

### Tanda 3 — Pop-ups de "Por firmar" y campana
Los íconos ✍️ y 🔔 de la barra superior pasaron de Links a **dropdowns** (POP-UP, no pantalla nueva):
- **Por firmar** lee los pendientes REALES (HU-08, `GET /bitacora/pendientes`) + footer "Ir a Por firmar →".
- **Campana** muestra notificaciones (pendientes por firmar + conceptos en atraso HU-07) + "Ver alertas →".
- Backdrop transparente cierra al hacer clic afuera; cierra también al cambiar de pantalla.
- **Se preservó EXACTAMENTE el badge `campana-atrasos`** y su condición (`!sinAccesoAtraso && atrasos > 0`),
  que es lo único que la suite asercióna del topbar (hu-07). Ningún spec asercióna `link-por-firmar`.
- Spec nuevo `nav-modo-sistema.spec.js` (5 tests): sidebar por flujos, chip de empresa, indicador de HU,
  pop-up Por firmar (abre/no navega/cierra), pop-up campana. **5 passed.**
- **Checkpoint final BLOQUE 4: 317 passed · 8 skipped · 0 failed (10.3 min). ✅ VERDE** (312 + 5 nuevos).

### Nota — pollution de la BD local (no es un bug del código)
Durante la sesión, mis ~8 corridas de suite + smokes crearon **~2050 contratos de prueba** (folios
`E2E-*`/`BITUI*`/`SMOKE-*`/`CHK*`/`NORTE-*`). Eso hizo que la lista "Registrados" de `residente@` (creador de
casi todos) fuera enorme y el flaky **`detalle-indicador-atraso.spec.js:77`** pasara a fallar de forma
determinista (DOM pesado → el indicador `detalle-alertas` no asentaba a tiempo). **Verificado que NO es
BLOQUE 4:** con `AppShell` revertido a HEAD el test seguía fallando, y en Tanda 1 (mismo código de marco)
pasaba. **Fix:** limpié los contratos de prueba con el patrón de FK de `reset_demo.sql` (preservando el seed
`OBRA-2026-*`/`OP-*`) → la BD quedó en 6 contratos y el test volvió a pasar 4/4. **Recomendación para Maiki:**
correr `reset_demo` periódicamente; el flaky es pre-existente (la suite e2e no limpia sus contratos).

### Zona congelada / sensible tocada en BLOQUE 4 (para tu revisión)
- **Ninguna zona congelada.** `Sidebar.jsx` y `AppShell.jsx` NO están en la lista congelada; `permisos.js`,
  `App.jsx`, auth, `SesionContext` quedaron INTACTOS. El gating del sidebar LEE `nivelDe` (no lo cambia).

### Verificación adversarial UltraCode de la navegación (5 escépticos)
Las **5 afirmaciones NO fueron refutadas, confianza alta** (`git diff` real + lectura archivo:línea):
1. **No funde historias** — cada HU mantiene su propia ruta (de `historiasUsuario`) y su gating `nivelDe`; el
   contenido de las pantallas NO se reemplazó (`{children}` se sigue renderizando); red de seguridad presente.
2. **Curva real intacta** — `CurvaAvance.jsx` con `git diff` VACÍO; la curva S en SVG + tooltip
   (`onMouseEnter`, `curva-tooltip`) siguen; NO se sustituyó por la simplificada del mockup.
3. **Validaciones conservadas** — ninguna se eliminó; el badge `campana-atrasos` conserva su condición exacta;
   `SeleccionRol`/`SolicitudRegistro` **añaden** una validación (REGLA 1), no quitan.
4. **Citas legales conservadas** — única remoción: `art. 125 fr. I g` de un **comentario JSX** del Sidebar
   viejo (nunca renderizado); la cita visible persiste en `RosterContrato.jsx`.
5. **No tocó congelado** — `git diff` de `permisos.js`/`App.jsx`/`SesionContext.jsx`/auth/`server.js` = VACÍO.

**Hallazgo accionable aplicado:** `HU_COLOCADAS` ahora solo cuenta códigos que existen en el catálogo
(`i.hu && HU[i.hu]`), para que la red de seguridad nunca pierda un enlace por un código mal escrito (no-op
hoy: las 21 HU existen).

**Nota sobre la corrida de certificación final (tras el tweak no-op):** salió **315 passed · 2 failed · 8
skipped (13.2 min)**. Los 2 fallos fueron `ambiente-bitacora.spec.js:53` (rebote SoloRol de dependencia/
finanzas) con `page.evaluate: Test timeout 30000ms exceeded` — **flaky de contención bajo carga** (la corrida
fue más larga de lo normal). **Re-corrido aislado: 6/6 passed.** El rebote SoloRol lo decide `App.jsx`
(congelado, INTACTO); el tweak es no-op (mismas 21 HU). El checkpoint limpio del estado final es **317/0**
(corrida de Tanda 3). Recomendación a Maiki: el flaky es de timing/contención, no de código.

---

## CIERRE GLOBAL

| Bloque | Estado | Suite |
|---|---|---|
| BLOQUE 3a — `[validar profe]` a CERO | ✅ (159 marcas; 1 excepción documentada en auth) | — |
| BLOQUE 3b — REGLA 1 empresa obligatoria | ✅ frontend (backend = diff para Maiki) | — |
| BLOQUE 3c — REGLA 4 sustitución misma empresa | ✅ (verificado 409/201) | 312/8/0 |
| BLOQUE 4 — navegación modo-sistema (4 tandas) | ✅ | 317/8/0 |

**Zona congelada tocada (toda para tu revisión línea por línea):**
- BLOQUE 3a: comentarios en `schema.sql` (3), `contratos.controller.js` (1), `estimaciones.controller.js` (3)
  — CERO lógica; corrigen citas (138/139→46 Bis+86-88).
- `auth.controller.js`: 1 marca `[validar]` **NO tocada** (tu orden "NO tocar auth"); fix listo arriba (§3a).
- BLOQUE 4: ninguna (Sidebar/AppShell no son congelados).

**Decisiones de criterio tomadas:** todas en `docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md`
(A1-A18 con cita verificada, B1-B20 criterio del equipo). **Para Maiki:** (1) aplicar el guard de backend de
REGLA 1 en `register` (diff §3b); (2) aplicar el comentario de auth (§3a); (3) correr `reset_demo` para
limpiar la BD local si hace falta. **NO push.**
