# Reporte — Pase de DISEÑO de la navegación (BLOQUE 4) para alinear con el mockup

**Fecha:** 18-jun-2026 · **Autor:** Code (local, sin push) · **Para:** Maiki
**Alcance:** SOLO diseño/UX sobre `Sidebar.jsx` e `Inicio.jsx` (no congelados). **NO** se tocó backend, lógica
de navegación, rutas (`href`), gating de roles, `permisos.js`, `App.jsx` ni auth. Mockup de referencia:
`docs/mockups/sigecop-modo-sistema.html`. Capturas: `docs/reportes/screens-bloque4-diseno/`.

## Análisis (mockup vs. real)
| | Mockup aprobado | Real (antes) |
|---|---|---|
| Sidebar | **guinda** institucional, grupos tenues, sub-items indentados | claro, lista plana |
| Sub-pasos | listados | **todos abiertos a la vez** (amontonado) |
| Textos | completos en una línea | **truncados** ("Alta de contra…", "Cicl…") |
| Inicio | cuadrícula curada "Tus módulos" por rol (pocas tarjetas) | **las ~15 HU sueltas** del rol |

## Lo que se hizo (4 arreglos)

### 1) Textos completos (truncación) ✔
Sidebar a **guinda** con ancho `w-72`; se quitó `truncate`; la pista de HU queda discreta a la derecha y el
estado "solo lectura" ya **no** se rotula en el sidebar (sí en Inicio) → los nombres caben en **una línea**.

### 2) Menús desplegables (acordeón) ✔ — lo principal para la limpieza
Los flujos con sub-pasos (Ciclo de estimación, Bitácora, Avance, Pago, Convenios, Cierre, Expediente) son
**colapsables**: el padre **navega** (NavLink a su HU) y un **chevron** (▸/▾) aparte expande/colapsa. **Por
defecto colapsados**; se abre solo el flujo de la pantalla actual. Esto quita el amontonamiento y el
"Recorrido por bloques" repetido. **NO** cambia href ni gating — solo cómo se muestran.
- **Acoplamiento con la suite resuelto:** los sub-items se ocultan al colapsar, y muchísimos specs navegan/
  asercionan sub-items por `aside a[href]`. Se actualizaron los **helpers de test** `goToViaSidebar` y
  `sidebarLinkFor` (e2e/_helpers.js) para **expandir el acordeón** antes de usar el enlace (clic en los
  chevrons `data-accordion-toggle`). Es plumbing de test (no toca la navegación real). `sidebarLinkFor` pasó
  a **async** → se añadió `await` en sus 41 usos (mecánico).
- **Gating preservado con un matiz corregido:** si un rol accede a un **hijo** pero **no al padre** del flujo
  (p. ej. **dependencia** ve "Curva" HU-05 pero no el padre "Avance" HU-06; **finanzas** ve "Fianzas" HU-02
  pero no "Alta" HU-01; **dependencia** ve "Revisión/Historial" HU-15/14 pero no "Ciclo" HU-12), los hijos
  accesibles se **promueven a items planos** → no se pierde ningún enlace (equivalente a la lista plana
  anterior). El gating real (`nivelDe`) NO se modifica.

### 3) Inicio agrupado por rol ✔
`Inicio.jsx` muestra una **cuadrícula curada de módulos PRINCIPALES** (entradas de flujo + vistas ejecutivas +
administración), **agrupada** (TUS FLUJOS / VISTAS EJECUTIVAS / ADMINISTRACIÓN) y **gated por rol** (`nivelDe`
por HU, rol por ruta fija). Deja de listar los sub-pasos sueltos (viven en el sidebar). Ej.: **finanzas** ve
2 tarjetas (Pago y tránsito · Reportes), no 15; **residente** ve sus flujos principales limpios. El badge
"SOLO LECTURA" y el aviso de atraso se conservan.
- *Seguridad de la suite:* ningún spec asercióna positivamente una tarjeta de Inicio ni navega clicándola
  (solo hay aserciones negativas `toHaveCount(0)` para roles sin acceso, que se conservan). Verificado.

### 4) Diseño guinda institucional ✔
Sidebar guinda (`#691C32`) con texto blanco, grupos en mayúsculas tenues, item activo guinda-oscuro + filo
dorado, sub-items indentados — fiel al mockup. (El topbar guinda existente se conserva; juntos enmarcan el
contenido claro, look institucional.)

## Verificación
- **Capturas** (`docs/reportes/screens-bloque4-diseno/`): `sidebar-colapsado.png`, `sidebar-expandido.png`,
  `inicio-residente.png`, `inicio-{dependencia,contratista,finanzas,supervision}.png`, `sidebar-*.png`.
- **Spec nuevo** `nav-diseno-screens.spec.js`: textos completos (no truncados), acordeón abre/cierra, Inicio
  curado (muestra flujos principales, NO sub-pasos sueltos).
- **Suite completa: 323 passed · 8 skipped · 0 failed (9.3 min). ✅ VERDE** (318 + los 6 nuevos del spec de
  diseño/capturas). Durante el pase aparecieron 5 fallos temporales por el matiz de gating padre/hijo
  (dependencia/finanzas con acceso al hijo pero no al padre); se corrigió con la promoción de hijos y la
  re-corrida quedó verde.

## Zona congelada
**Ninguna por el pase de diseño.** `Sidebar.jsx`/`Inicio.jsx`/`_helpers.js` no son congelados; `permisos.js`/
`App.jsx`/`SesionContext` INTACTOS. El gating LEE `nivelDe`. Cada HU sigue accesible e identificable (no se
funden). **NO push.**

### ⚠️ Incidente detectado por la verificación adversarial (corregido)
La verificación encontró que `backend/src/controllers/auth.controller.js` tenía **dos cambios que YO te había
dicho que dejaría para ti** (un agente de un workflow previo se salió de su archivo asignado): (1) la marca
`[validar redacción con el profe]` removida, y (2) el **guard de REGLA 1** (empresa obligatoria) aplicado en
`register()`. Como te reporté que **NO tocaría auth** y que ese guard quedaba **para que lo aplicaras tú**,
**revertí ambos** (`git checkout` del archivo a HEAD): `auth.controller.js` quedó **idéntico a HEAD**
—acotamiento `empresa_id` intacto, marca `[validar]` restaurada (línea 13), **sin** el guard de REGLA 1—.
Verificado: login de los 5 roles 200, specs de registro 9/9, `git status` de `auth.controller` limpio, y
**suite completa final 323/8/0** con el estado ya limpio (diseño + auth revertido). Auditoría del resto de
congelados: `contratos`/`estimaciones.controller` y `schema.sql` solo cambian **comentarios** (BLOQUE 3a);
`acceso.js`/`auth.middleware`/`server.js`/`usuarios` sin cambios. El guard de REGLA 1 sigue **listo para ti**
en `REPORTE_BLOQUES_3_4_18jun.md` §3b. *(Lección: vigilar que los
agentes de workflow no se salgan de su archivo asignado; el resto del diff de la sesión ya estaba revisado.)*
