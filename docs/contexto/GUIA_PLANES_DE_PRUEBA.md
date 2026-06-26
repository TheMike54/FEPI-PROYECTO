# GUÍA — Cómo escribir un PLAN DE PRUEBAS de SIGECOP (al nivel del archivo oro)

> **Para qué:** que una sesión futura pueda **escribir o actualizar un plan de pruebas correcto** leyendo SOLO
> (1) esta guía y (2) `docs/contexto/CATALOGO_CAMPOS_SISTEMA.md`, **sin re-auditar todo el sistema**.
> **Destilada de:** `docs/pruebas/PLAN_PRUEBAS_FINAL_MATCH_18jun.md` (el **archivo oro**),
> `docs/pruebas/PLAN_PRUEBAS_POSITIVAS_FINAL_26jun.md` (por-HU, contratos pre-llenados),
> `docs/pruebas/PLAN_PRUEBAS_POSITIVAS_DESDE_CERO_26jun.md` (un contrato desde cero) y el catálogo de campos.
> **Regla de oro:** valor CONCRETO por campo (qué teclear), no "llena el campo X". Cada validación cita **art. + fracción**.

---

## 1. ESTRUCTURA del plan (esqueleto fijo)
Todo plan lleva, en este orden:
1. **Encabezado:** título + fecha + 1 línea de propósito ("para imprimir y palomear casilla por casilla") + a qué
   versión del sistema refleja (cita los Deltas vigentes, §5).
2. **§Deltas / cambios grandes** — léelos ANTES; afectan a todo el plan (ver §5).
3. **Cómo leer cada paso:** `Cuenta` · `Pantalla` (cómo llegar) · `datos exactos (testid → valor)` · `🟢/🔴 Esperado`
   · `▢`. Leyenda: **🟢** = ACEPTA · **🔴** = RECHAZA/AVISA a propósito (las que más valen) · **▢** = casilla a palomear.
4. **Cuentas demo** (tabla rol→papel; contraseña común `Sigecop2026!`).
5. **Dataset canónico** (§3): el contrato y sus valores cuadrados al centavo (alta, catálogo, programa, jurídicos,
   garantías, plan de amortización, PDF) + el **resultado financiero esperado** de las estimaciones.
6. **Recorrido E2E en ORDEN DE CICLO** (no numérico de HU): PASOS `▢` con la tabla `Campo (testid) → Valor`.
7. **TIPO-B** (opcional): vistas siempre-accesibles que abren en estado vacío (no bloqueo).
8. **Pruebas negativas/legales** (en el plan de negativas): tabla `# | Prueba | Dónde | Cambio sobre el dataset |
   Bloqueo esperado | Fundamento`.
9. **Resumen** (cuántos pasos/casos; qué quedó `[verificar]`).

**Orden de ciclo oficial** (úsalo siempre):
`registro → login → (modal de contrato) → alta (7 pasos) → garantías → bitácora → notas → minutas → avance →
curva → atrasos → estimación (wizard 5 pasos) → presentar → revisión/autorización → reingreso → historial →
tablero → pago (wizard 4 pasos) → convenio (+autorización) → portafolio → roster/sustitución → padrón →
expediente → finiquito → reportes`.
HU por etapa: 23 · 01 · 02 · 22 · 08 · 09 · 10 · 11 · 06 · 07 · 05 · 12 · 13 · 15 · 16 · 14 · 17 · 20 · 21 · 03 · 04 · 18 · 19 · 24.

---

## 2. CONVENCIONES de testid (lee el catálogo para los exactos de cada pantalla)
- **Login NO usa testid:** campos `#login-usuario` / `#login-password`; botón **«Iniciar sesión»** por texto.
  Enlaces «Regístrate» (`link-registro`) / «Inicia sesión» (`link-login`). Registro: testids `reg-*`.
- **Sufijos dinámicos `${id}` / `${i}` / `${numero}` = id NUMÉRICO del backend, NO la clave** (`C-01`). Ej.:
  `gen-cantidad-${contrato_concepto_id}`, `btn-presentar-${e.id}`, `conv-autorizar-${id}`, `modal-contrato-${id}`,
  `btn-asentar-${contrato_concepto_id}`. `${i}` = índice de fila (0-based) en el alta (`concepto-clave-${i}`,
  `celda-${i}-${p}`). `fila-portafolio-${folio}` lleva el **folio literal**.
- **Contrato activo global (3A):** al entrar a una pantalla de contrato sale el **modal** `modal-elegir-contrato` →
  elige con `modal-contrato-<id>` (busca con `modal-contrato-buscar`). Se hereda: chip `chip-contrato-activo` +
  banner `banner-contrato-activo` («Cambiar» = `btn-cambiar-contrato`). **Rutas libres** (sin modal): `/`,
  `/contratos/alta`, `/portafolio`, `/estimaciones/tablero`, `/admin/empresas`, `/usuarios/solicitudes`, `/reportes`.
- **Sidebar plano por ciclos:** los ítems **NO tienen testid** → localiza por **texto** (NavLink). Colapsar:
  `btn-toggle-sidebar`. Se filtra por rol (promoción de huérfanos).
- **Pestañas-enlace por ciclo:** barra `pestanas-ciclo` con chip `chip-ciclo-hu`; cada pestaña `pestana-<key>`
  NAVEGA a la hermana arrastrando `?contrato=ID` (ej. `pestana-integrar`, `pestana-revision`, `pestana-transito`).
- **Wizards:** stepper `wpaso-*` + `btn-wsiguiente`/`btn-watras` (motivo de bloqueo en `wsiguiente-*-motivo`);
  paneles `wstep-*`. Alta usa `btn-siguiente`/`btn-atras` y `btn-guardar`.
- **Estados vacíos / candados:** banner/aviso con testid propio (`*-vacio`, `*-faltan`, `*-cuadra`/`*-descuadre`,
  `aviso-*`). Un caso 🔴 casi siempre tiene su testid de bloqueo.

---

## 3. REGLAS DE CUADRE (math server-side — NO cambian)
- **Monto del contrato** = `Σ ROUND(cantidad × PU, 2)` (art. 45 fr. IX RLOPSRM). Se DERIVA (no se teclea).
- **Programa** = matriz concepto×periodo; por **cada** concepto `Σ planeado = contratado` (regla del 100%,
  art. 45 ap. A fr. X). Banner `programa-cuadra` / `programa-descuadre`.
- **Plan de amortización** = `Σ = ROUND(monto × anticipo% , 2)` (art. 143 fr. I; proporcional). Banner `plan-cuadra`.
- **Carátula de estimación (sin IVA):** `neto = subtotal − amortización − 5 al millar − deductivas − retención_atraso`.
  `subtotal = Σ ROUND(cant_periodo × pu_snapshot, 2)`; `amortización = ROUND(subtotal × anticipo%, 2)`;
  **5 al millar = `ROUND(subtotal × 0.005, 2)`** (art. 191 LFD).
- **IVA:** las Secciones 1 y 2 de la carátula van **SIN IVA** (art. 2 fr. XIX RLOPSRM). **El IVA (16%) aparece SOLO
  en la Sección 3 "Del neto a recibir"** del documento de estimación (Delta 5): `IVA estim. = ROUND(subtotal×0.16,2)`,
  `IVA amort. = ROUND(amort×0.16,2)`; neto a recibir con IVA = neto(sin IVA) + IVA_estim − IVA_amort.

### Dataset canónico de referencia (cuadrado al centavo)
**Contrato $1,000,000.00, anticipo 30% ($300,000), 3 periodos mensuales.**
- Catálogo: `C-01` 1000×$50=50,000 · `C-02` 500×$200=100,000 · `C-03` 300×$2,500=750,000 · `C-04` 2000×$50=100,000.
- Programa: C-01 P1=1000 · C-02 P1=250/P2=250 · C-03 P2=150/P3=150 · C-04 P2=1000/P3=1000.
- Plan amort: $100,000 ×3.
- **Estimación #1** (P1: C-01=1000, C-02=250) → subtotal 100,000 − amort 30,000 − 5 al millar 500 = **NETO $69,500.00**.
- **Estimación #2** (P2: C-02=250, C-03=150, C-04=1000) → subtotal 475,000 − 142,500 − 2,375 = **NETO $330,125.00**.

> *(El seed `seed_demo_24.sql` usa otra base igual de cuadrada: contrato $1,000,000 con CONC-01/02/03 = 300k/300k/400k
> en P1/P2/P3; netos $208,500 / $208,500 / $278,000. Usa la del plan que estés escribiendo.)*

---

## 4. (incluido arriba) — n/a

## 5. DELTAS VIGENTES (sesiones #1 y #2, 26-jun) — refléjalos en todo plan nuevo
1. **Fecha de inicio NO pasada** (front+back). En el alta usa **HOY**. → **NOTA DE TIEMPO** (abajo).
2. **Selector de EMPRESA contraparte (`select-empresa-contratista`) debajo de "Dependencia"**; filtra al
   superintendente (`select-superintendente`).
3. **Mostrar la PERSONA, no la cuenta/correo** (alta, firmas de apertura, sustitución de roster).
4. **Foto de avance OPCIONAL** (`cap-foto-evidencia` puede ir vacía; ya no bloquea registrar).
5. **Documento de estimación = 4 bloques**; Sección 3 con IVA; **nota↔generador** (`asignar-nota-${id}`,
   `caratula-doc-neto`); export historial con formato (`btn-exportar-historial`).
6. **Supervisión puede ser de OTRA empresa** al sustituir (misma-empresa solo para contratista/superintendente).
7. **Sesión única** (`token_version`): un login nuevo invalida la sesión anterior.

### ⚠ NOTA DE TIEMPO (consecuencia del Delta 1)
Como la fecha de inicio ya no puede ser pasada, un contrato dado de alta **hoy** tiene periodos **a futuro**. La
**integración de estimación exige un periodo VENCIDO** (`periodo_fin < hoy`, art. 54). Por eso:
- **alta → garantías → bitácora → notas → avance → curva → atrasos** se hacen **desde cero hoy**.
- **estimación → presentar → revisión → pago → convenio → finiquito** requieren un **periodo vencido** → o se
  ejecutan cuando venza, o se demuestran sobre un contrato cuyo primer periodo ya venció (los `PRUEBA-HU-12..24`
  del seed, escritos por SQL directo que **no** pasa por la validación de fecha).

---

## 6. ¿Plan "pre-llenado" o "desde cero"?
| Usa el plan… | Cuándo | Contratos | Archivo de ejemplo |
|---|---|---|---|
| **Pre-llenado por HU** | Demo rápida HU por HU; el profe abre cada contrato en su etapa | `PRUEBA-HU-XX` (seed `seed_demo_24.sql`, idempotente; **re-sembrar antes de cada demo** porque estimación/pago son append-only) | `PLAN_PRUEBAS_POSITIVAS_FINAL_26jun.md` |
| **Desde cero** | Probar la captura completa (cada campo) del alta y el ciclo; demostrar que el sistema construye todo | UN contrato nuevo (`OBRA-2026-QA-...`) creado en el alta | `PLAN_PRUEBAS_POSITIVAS_DESDE_CERO_26jun.md` |
| **Negativas** | Disparar rechazos/avisos | cualquiera; cambia UN valor sobre el dataset bueno | `PLAN_PRUEBAS_NEGATIVAS_FINAL_26jun.md` |

> En el "desde cero", recuerda la NOTA DE TIEMPO: la cadena estimación→finiquito necesita periodo vencido.
> En el "pre-llenado", cada `PRUEBA-HU-XX` YA está en su etapa (ver `docs/reportes/REPORTE_SESION_AUTONOMA_2_26jun.md`,
> tabla de etapas, y `docs/planes/RUNBOOK_SEED_PRUEBA_HU_RENDER_26jun.md`).

---

## 7. Checklist de "tics de IA" a eliminar (para versiones entregables al profe)
Antes de entregar un plan al profe, quita lo que delata generación por IA:
- [ ] Sin emojis decorativos fuera de la leyenda (🟢/🔴/▢ y los del sidebar SÍ son convención del proyecto).
- [ ] Sin frases de relleno ("es importante notar que", "cabe destacar", "en resumen general").
- [ ] Sin meta-comentarios ("este plan cubre…", "como se mencionó anteriormente") — el plan se ejecuta, no se narra.
- [ ] Sin `[verificar]` colgando: resuélvelo (lee el componente) o conviértelo en un caso 🔴 concreto.
- [ ] Valores REALES y cuadrados (no `XXX`, no "monto de ejemplo"): cada importe debe cuadrar al centavo.
- [ ] Citas legales correctas y específicas (art. + fracción), no genéricas; nada inventado.
- [ ] Tono de checklist operativo (imperativo: "teclea", "pulsa"), no ensayo.
- [ ] Longitud justa: una fila por caso; sin repetir el dataset en cada paso (se define una vez en §3).
- [ ] Consistencia de testids con el catálogo (no inventar; si no existe, decirlo).

---

## 8. PLANTILLA de un PASO (copia y rellena)
```md
### ▢ PASO N — <ID-CASO> · <Qué prueba> (HU-XX)
- **Cuenta:** `rol@sigecop.test` · **Pantalla:** <cómo llegar: sidebar «X» / pestana-Y> (`/ruta`) → modal → <CONTRATO>.

| Campo (testid) | Valor |
|---|---|
| <campo> (`testid`) | `valor exacto` |
| … | … |

> 🟢 **Esperado:** <lo observable: estado/registro/banner/testid>. Fundamento: art. X fr. Y LOPSRM/RLOPSRM/LFD.
```
Para un caso negativo: cambia UN valor, usa **🔴**, y di el **código** (400/403/409) + el **testid/banner** del bloqueo + el artículo.

---

## 9. Fuentes (si necesitas el detalle exacto)
- **Formato oro:** `docs/pruebas/PLAN_PRUEBAS_FINAL_MATCH_18jun.md` (recorrido completo con TODOS los testids).
- **Catálogo de campos:** `docs/contexto/CATALOGO_CAMPOS_SISTEMA.md` (40 pantallas, 247 campos + DELTA #1/#2).
- **Planes vigentes:** los tres `*_26jun.md` en `docs/pruebas/`.
- **Estados de los contratos de prueba:** `docs/reportes/REPORTE_SESION_AUTONOMA_2_26jun.md` (tabla por HU) +
  `docs/planes/RUNBOOK_SEED_PRUEBA_HU_RENDER_26jun.md`.
- **Citas legales:** `docs/legal/` (lopsrm.txt, reg.txt) + `docs/legal/Auditoria_Legal_SIGECOP.md` (LFD verbatim).
