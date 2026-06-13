# Oleada UI-2 — Reskin del resto de páginas (sistema de diseño guinda) — 10 jun 2026

> Ejecuta el prompt UI-2 del plan (`docs/Contexto_Maestro_y_Plan_Correcciones_09jun_1.md`, §"Oleada UI").
> **LOCAL, sin commit/push.** REGLA DE ORO cumplida: solo markup JSX + clases Tailwind; se REUSARON los
> componentes de UI-1 (no se redefinió ninguno). **Cero cambios de lógica/endpoints/cálculos/validaciones;
> todos los `data-testid` y textos asercionados conservados** (auditado, ver abajo).
> ⚠️ El árbol sigue trayendo O1 + UI-1 sin commitear. Snapshots para separar pasadas al revisar:
> `OLEADA1_fixes_revision_profe_09jun.patch` (solo O1) y `SNAPSHOT_O1+UI1_pre-UI2_10jun.patch` (O1+UI-1).
> El diff de UI-2 = diff actual − ese snapshot.

## Páginas migradas (9)

| Página | Qué se convirtió |
|---|---|
| **Curva de avance** | BannerContexto→`EncabezadoContrato` · KPI local→`Kpi` compartido (ok→exito, alerta→aviso) · tarjetas/theads a borde/pagina. CurvaSVG y datosCurva (O1: origen + tooltips) INTACTOS |
| **Tablero de estimaciones** | 4 KPIs→`Kpi` (testids vía prop `testid`, mismos en el DOM) · BannerContexto→`EncabezadoContrato` · pills enviada/pagada/rechazada a aviso/exito/peligro · tiles y stepper a paleta |
| **Convenios (lista + editor)** | Encabezado→`EncabezadoContrato` · tarjetas/theads/filas a borde/pagina · errores a peligro-* · badges SFP/ajuste a aviso-* · pill Vigente a exito-*. Testids `cm-*` intactos |
| **Alertas / Atrasos** | Encabezado→`EncabezadoContrato` · tarjetas y tablas a paleta |
| **Registro de avance físico (HU-06)** | Encabezado→`EncabezadoContrato` · tarjetas/filas a paleta · banner solo-consulta intacto |
| **Pago (HU-21)** | Tarjetas/theads a paleta (cálculos y validaciones intactos) |
| **Historial de estimaciones** | Encabezado→`EncabezadoContrato` · tarjetas/theads a paleta. Textos exactos que asierta la suite ("Resultados (N)", etc.) intactos |
| **Sustitución / Roster** | Tarjetas a borde/rounded-lg · franja sin-sesión a pagina. Testids `sust-*`/`roster-evento-*` (O1) intactos |
| **Detalle de contrato** | `ModalDetalleContrato` + `TabRegistrados` (en AltaContrato.jsx): contenedores/encabezados/hover a paleta; pill éxito a exito-*. El resto del archivo (wizard O1/UI-1) sin tocar |

Limpieza prometida en UI-1: **`components/layout/Header.jsx` eliminado** (quedó sin importadores tras AppShell; verificado con grep).

## Cómo se hizo (y por qué así)

- **9 agentes en paralelo (uno por página)** con una guía de conversión cerrada (tabla de clases, lista de prohibiciones, notas por página con sus testids sensibles) — las páginas son archivos disjuntos, así que no hubo conflictos, y cada agente auditó su propio diff.
- **Auditoría adversarial mía encima**: comparación del set de `data-testid` de cada archivo vs HEAD (cero perdidos; los "faltantes" del tablero eran la prop `testid` del Kpi compartido, que sí lo renderiza en el DOM) + revisión de las alertas reportadas por cada agente + `vite build` + suite completa.
- El remapeo de tokens de UI-1 ya había hecho el grueso del color; UI-2 fue lo estructural: tarjetas (`border-borde rounded-lg`), theads (`bg-pagina text-tinta-sec`), banners de contexto al componente compartido, KPIs/pills al sistema.

## Cambios visuales menores conocidos (intencionales, sin impacto e2e)

1. La etiqueta superior de los encabezados de contexto pasa de "CONTEXTO" a "Contrato"/"Cartera" (comportamiento de `EncabezadoContrato`; ninguna spec ancla ese texto).
2. KPIs del tablero ahora con la tipografía del componente compartido (números `text-3xl`, sin mono) — montos muy largos podrían envolver en pantallas chicas; se vigila en el smoke.
3. `hover:bg-pagina` en filas de tablas (extrapolación coherente del mapeo slate-50→pagina).
4. Pill "integrada"/"Superseded" quedaron neutras (sin token semántico obvio — criterio conservador de la guía).

## Tests

- Sin specs nuevos ni modificados (reskin puro).
- **Suite completa: 210 passed · 8 skipped (fixme conocidos) · 0 failed (6.6 min)** — tercera corrida consecutiva con el mismo resultado (post-O1, post-UI-1 y post-UI-2): ningún assert se rompió. `vite build` ✓.

## Capturas

`docs/capturas-ui2/`: 01-curva · 02-tablero · 03-convenios · 04-alertas · 05-avance-fisico · 06-historial · 07-roster · 08-detalle-contrato · 09-pago.

## Runbook de integración (Maiki)

1. Orden de commits sugerido: **O1** (patch de referencia) → **UI-1** (snapshot O1+UI1 menos O1) → **UI-2** (el resto del diff actual). Los tres conviven en el árbol sin conflicto.
2. Tras pull: `docker restart sigecop_frontend` solo si cambia `tailwind.config.js` (UI-2 NO lo tocó; UI-1 sí).
3. Suite local + smoke visual con las capturas de `docs/capturas-ui1/` y `docs/capturas-ui2/`.
4. Push a `main` → Render.
