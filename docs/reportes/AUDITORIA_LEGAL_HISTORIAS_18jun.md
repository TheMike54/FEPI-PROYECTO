# AUDITORÍA LEGAL DE LAS HISTORIAS DE USUARIO — citas vs. texto literal · 18-jun-2026

> Encargo de Maiki: verificar que CADA HU esté bien fundamentada contra los artículos REALES. Cada cita se
> confrontó con el **texto literal** de `docs/legal/lopsrm_utf8.txt` (LOPSRM) y `docs/legal/reg_utf8.txt`
> (RLOPSRM). **NO se cambió ninguna historia** — solo se audita y reporta; las correcciones las decide Maiki/el
> profe. Fuente de las citas: `docs/requisitos/Historias_Usuario_ACTUALIZADAS_12jun.md` +
> `AUDITORIA_COHERENCIA_HU.md`.
>
> **Método:** 2 pasadas (6 verificadores por ciclo + **re-verificación adversarial** que RE-LEYÓ el artículo de
> cada cita marcada dudosa/incorrecta — la 2ª pasada corrigió varios falsos positivos de la 1ª). Leyenda:
> **✅ correcta** (el texto respalda lo que dice la HU) · **⚠️ dudosa** (imprecisa o interpretación, no literal)
> · **❌ incorrecta** (el artículo no aplica o está mal citado/numerado).
>
> ⚠️ **LIMITACIÓN:** la **LFD** solo está en `docs/legal/LFD.pdf` (no hay `.txt`) y el entorno **no puede abrir
> PDFs** (`pdftoppm` ausente). Por eso **art. 191 LFD (5 al millar) NO se pudo verificar literalmente aquí** — lo
> debe confirmar el profe / abrir el PDF. Es una cita estándar de obra pública, pero queda **PENDIENTE**.

---

## 1. VEREDICTO GLOBAL
- **El fundamento legal está, en su gran mayoría, BIEN.** ~50 citas distintas verificadas literalmente como
  **✅ correctas** (artículo + fracción coinciden con lo que afirma la HU).
- **6 hallazgos ❌ accionables** (errores reales de numeración/aplicación) y **~8 ⚠️** (imprecisión de fracción o
  interpretación presentada como mandato legal). Ninguno rompe el sistema; son **precisión de citas**.
- **1 pendiente externo:** art. 191 LFD (PDF, no verificable aquí).

### 1.1 ❌ HALLAZGOS ACCIONABLES (errores reales — decide Maiki/profe)
| # | HU | Cita usada | Problema (texto real) | Cita correcta sugerida |
|---|---|---|---|---|
| A | **HU-12** (carátula) | **art. 138/139 RLOPSRM** para **penas/retención por atraso** | 138 = importe/programa del **anticipo**; 139 = anticipos >50%. **No** son penas. | **art. 46 Bis LOPSRM + arts. 86–88 RLOPSRM** (retención económica por atraso) |
| B | **HU-21** (pago) | **art. 118 RLOPSRM** para el **"cuadre exacto del importe"** (inline en `RegistroPagoForm.jsx`: *"No editable (art. 118 / cuadre)"*) | 118 = trabajos **excedentes** no pagables; no regula cómo se calcula el importe del pago. | **art. 54 LOPSRM** (pago = de la estimación autorizada); el "cuadre exacto" es regla de diseño |
| C | **HU-03** (convenio) | **art. 123 fr. III RLOPSRM** para la **nota automática del convenio** | fr. III = datos de **apertura** de bitácora; no convenios. | **art. 123 fr. XI RLOPSRM** (*"Bitácora para asuntos trascendentes…"*) |
| D | **HU-19** (reportes) | **art. 102 LOPSRM** (revisión SFP >25%) | 102 **LOPSRM** = "otros mecanismos de solución de controversias"; el de la SFP/25% es del **Reglamento**. | **art. 102 RLOPSRM** (cambiar la ley: LOPSRM→RLOPSRM) |
| E | **HU-03** (convenio) | **art. 118 RLOPSRM** para "no **reducir** un concepto por debajo de lo ya estimado" | 118 trata **excedentes** (mayor valor), no reducciones. | No hay artículo directo; es regla de **diseño/protección** (declararlo así, sin cita literal) |
| F | **HU-16** (reingreso) | **art. 132 RLOPSRM** para **inmutabilidad / trazabilidad fiscal** de la versión rechazada | 132 = lista de **documentos** que acompañan la estimación; no manda inmutabilidad. | Es regla de **diseño** (append-only); sin cita literal — apóyese en art. 123 fr. VI (inmutabilidad de notas) por analogía |

### 1.2 ⚠️ IMPRECISIONES / INTERPRETACIONES (afinar, no urgente)
| HU | Cita | Observación | Sugerencia |
|---|---|---|---|
| HU-01 | art. 46 fr. I LOPSRM (jurídicos: firmante/representante) | 46-I solo pide "nombre/razón social", no "firmante" ni "representante legal" | añadir **art. 46 fr. IV** (acreditación de personalidad/representación) |
| HU-01 | art. 125 RLOPSRM ("sustituir-no-borrar", histórico) | 125-I-g manda **registrar** la sustitución en bitácora; no manda un roster append-only en BD | **125-I-g + art. 123 fr. VI** (inmutabilidad); el append-only es diseño |
| HU-01/HU-12 | art. 118 / "45 ap. A fr. X" / 52 (programa = "tope planeado / no excede") | 118 es excedentes; "tope planeado" es **inferencia** (la ley dice "base para medir"), no literal | usar **art. 52 LOPSRM** (base del avance) + **45 ap. A fr. X RLOPSRM** (estructura); evitar la palabra "tope" como si fuera literal |
| HU-06 | art. 125 fr. II RLOPSRM (nota automática de avance) | fr. II = **solicitudes** del superintendente; el **avance físico** está en **fr. III** (supervisión) | citar **art. 125 fr. III RLOPSRM** |
| HU-07 / HU-09 / HU-03 | art. 53 LOPSRM ("el residente **emite** la nota de consecuencia") | 53 hace al residente responsable de control/supervisión, pero **no** dice que "emite notas de atraso/consecuencia" | **interpretación válida**; declararla como tal o combinar con **art. 125 fr. I** |
| HU-03 | art. 59 párr. 3 LOPSRM (autorización **acto separado + inmutable**) | El párrafo 3 SÍ establece que el convenio **debe ser autorizado** por el servidor facultado (✅); pero **no** dice "acto separado del registro" ni "inmutable" | la autorización está bien fundada; el "acto separado/inmutable" es **diseño** (es el ITEM 3.2 marcado `[validar]`) + **art. 99 párr. 5 RLOPSRM** |
| HU-16 | art. 54 LOPSRM ("el reingreso no reinicia el plazo") | 54 fija el plazo inicial (6/15 días); **no** habla de reingreso | es **interpretación** del equipo (A18); declararla como interpretación, no como literal |

### 1.3 PENDIENTE (externo)
- **art. 191 LFD = 5 al millar (0.5%)** — citado en HU-12/15/19/21 (carátula). **No verificable aquí** (LFD solo
  PDF; sin `pdftoppm`). Es la cita estándar del derecho de inspección/vigilancia sobre estimaciones; **confírmalo
  con el profe o abriendo `docs/legal/LFD.pdf`**.
- **HU-23 (empresas/padrón):** **no cita ningún artículo** (la justificación "catálogos: es de ley" es verbal del
  profe). Si se quiere fundamentar el padrón, candidatos: **art. 74/74 Bis LOPSRM** y **art. 43 RLOPSRM** (no
  citados hoy en la HU).
- **art. 61 RLOPSRM** (HU-01, datos jurídicos): no se localizó en esta corrida — **revisar** si existe/aplica.

---

## 2. TABLA RESUMEN POR HU
| HU | Citas (n) | ✅ | ⚠️ | ❌ | Pend. | Observación clave |
|---|---|---|---|---|---|---|
| HU-01 Alta | 16 | 11 | 4 | 0 | 1 (191 LFD; 61 revisar) | 46-I (jurídicos) y 125 (append-only) imprecisos; 118 para "programa" → 45-X/52 |
| HU-02 Garantías | 5 | 5 | 0 | 0 | 0 | **Todas correctas** (48-I/II, 66, 91, 98) |
| HU-23 Empresas | 0 | — | — | — | — | **Sin cita legal** (verbal del profe) |
| HU-08 Apertura bitácora | 6 | 6 | 0 | 0 | 0 | **art. 122 RLOPSRM SÍ existe** (la 2ª pasada lo confirmó); todo ✅ |
| HU-09 Emitir notas | 7 | 5 | 2 | 0 | 0 | 122 es obligatoriedad (no notas → 123/125, ya citados); 53 emisor = interpretación |
| HU-10 Consultar | 3 | 3 | 0 | 0 | 0 | Todas ✅ (125, 123-III, 123-XII) |
| HU-11 Minutas | 2 | 2 | 0 | 0 | 0 | Todas ✅ (123-X, 123-VI) |
| HU-05 Curva | 0 | — | — | — | — | Sin cita (visualización; no requiere) |
| HU-06 Avance | 4 | 3 | 1 | 0 | 0 | 125-**II** → debe ser 125-**III** (avance) |
| HU-07 Alertas | 4 | 3 | 1 | 0 | 0 | 53 "emisor" = interpretación |
| HU-12 Estimación | 11 | 8 | 1 | **1** | 1 (191 LFD) | **138/139 para penas ❌ → 46 Bis + 86-88**; 45-X "tope" ⚠️; 2-XIX ✅ |
| HU-13 Presentar | 1 | 1 | 0 | 0 | 0 | 54 ✅ (6 + 15 días) |
| HU-14 Historial | 0 | — | — | — | — | Sin cita viva (138 era de la ficha vieja, ya desestimado) |
| HU-15 Revisión/autoriz. | 3 | 2 | 0 | 0 | 1 (191 LFD) | 54 y 53 ✅ |
| HU-16 Reingreso | 2 | 0 | 1 | **1** | 0 | 54 (no-reinicia) ⚠️ interpretación; **132 inmutabilidad ❌** |
| HU-17 Tablero | 1 | 1 | 0 | 0 | 0 | 54 ✅ |
| HU-03 Convenios | 9 | 5 | 2 | **2** | 0 | **123-III ❌→123-XI**, **118 reducción ❌**; 59-p3 ⚠️ |
| HU-20 Tránsito a pago | 4 | 4 | 0 | 0 | 0 | 24-2, 54, **64 (extinción, párr. 4) ✅**, **170 (fr. VI) ✅** |
| HU-21 Registro pago | 3 | 1 | 0 | **1** | 1 (191 LFD) | **118 "cuadre" ❌ → 54** (inline en RegistroPagoForm.jsx) |
| HU-24 Finiquito | 5 | 5 | 0 | 0 | 0 | **Todas ✅** (64, 168-172, 143, 66, 123) |
| HU-04 Expediente | 5 | 5 | 0 | 0 | 0 | Todas ✅ (45-IX, 59/99, 125, 138-I, 123-III) |
| HU-18 Portafolio | 1 | 1 | 0 | 0 | 0 | 54 ✅ |
| HU-19 Reportes | 7 | 5 | 0 | **1** | 1 (191 LFD) | **102 LOPSRM ❌ → 102 RLOPSRM** (typo de ley); 86-88 ✅ |
| HU-22 Roster | 3 | 3 | 0 | 0 | 0 | Todas ✅ (125-I-g, 123-III, 53) |
| **TOTAL** | ~101 | **~79 ✅** | **~12 ⚠️** | **6 ❌** | **~5 pend.** | Base legal sólida; afinar 6 ❌ + LFD |

---

## 3. DETALLE POR CICLO (cita · qué afirma la HU · qué dice el artículo · veredicto)

### 3.1 Alta y garantías
- **HU-01** — `45 fr. IX RLOPSRM` ✅ ("…formará el presupuesto de la obra"); `45 ap. A fr. X RLOPSRM` ✅
  (programa conforme al catálogo, del total de conceptos); `52 LOPSRM` ✅ ("programa… base… para medir el avance");
  `54 LOPSRM` ✅ (periodicidad ≤ 1 mes); `50 fr. II/IV/V LOPSRM` ✅ (tope 30% / autorización escrita >30% /
  100% plurianual último trimestre); `138 párr. 3 RLOPSRM` ✅ (programa de aplicación del anticipo — confirmado
  en la 2ª pasada); `143 fr. I RLOPSRM` ✅ (amortización proporcional al % de anticipo); `46 Bis LOPSRM` ✅
  (penas por atraso). ⚠️ `46 fr. I LOPSRM` (pide razón social, no "firmante/representante" → +46 fr. IV); ⚠️
  `125 RLOPSRM` (registra el evento; el append-only es diseño + 123 fr. VI); ⚠️ `118 RLOPSRM` para "programa no
  excede" (mejor 45-X/52). Pend.: `191 LFD`; `61 RLOPSRM` (revisar). *(Nota: "la dependencia NO firma la
  bitácora" SÍ lo respalda **123 fr. III** — los firmantes son residente/supervisor/superintendente.)*
- **HU-02** — `48 fr. I/II LOPSRM` ✅ (garantía de anticipo / de cumplimiento, 15 días del fallo); `66 LOPSRM` ✅
  (vicios ocultos); `91 RLOPSRM` ✅ (cumplimiento ≥10% + ajuste por modificación = endoso); `98 RLOPSRM` ✅
  (previsiones mínimas de la póliza). **Todas correctas.**
- **HU-23** — sin cita (ver §1.3).

### 3.2 Bitácora
- **HU-08** — `46 LOPSRM` ✅; `52 Bis LOPSRM` ✅ ("uso de la Bitácora es obligatorio"); **`122 RLOPSRM` ✅**
  (la 2ª pasada confirmó: *"Artículo 122.- El uso de la Bitácora es obligatorio… medios remotos de comunicación
  electrónica…"* — la 1ª pasada se equivocó al decir "no existe"); `123 fr. III` ✅ (datos mínimos de apertura);
  `123 fr. VI` ✅ (inmutabilidad); `125 fr. I g` ✅ (sustitución se registra en bitácora). **Todas correctas.**
- **HU-09** — `123 fr. III/V/VI/VII` ✅ (plazo de firma+aceptación tácita / numeración seriada / inmutabilidad /
  anulación con nota correctiva); `125 RLOPSRM` ✅ (tipos de nota por rol + "otros"); ⚠️ `122 RLOPSRM` (regula
  obligatoriedad/medio, **no** la estructura de las notas → el ancla correcta es 123/125, que ya están citados);
  ⚠️ `53 LOPSRM` (emisor=interpretación).
- **HU-10** — `125` ✅; `123 fr. III` ✅; `123 fr. XII` ✅ ("resolver y cerrar… todas las notas"). Todas ✅.
- **HU-11** — `123 fr. X` ✅ ("ratificar en la Bitácora… minutas…"); `123 fr. VI` ✅ (vínculo referencial). ✅.

### 3.3 Avance
- **HU-05** — sin cita (visualización). ✅ (no requiere fundamento).
- **HU-06** — `118 RLOPSRM` ✅ (no pagable lo excedente → bloqueo de "excede lo contratado"); `45 ap. A fr. X` ✅;
  `52 LOPSRM` ✅; ⚠️ `125 fr. II` (es solicitudes del superintendente; el **avance físico** es **fr. III**).
- **HU-07** — `52 LOPSRM` ✅; `45 ap. A fr. X` ✅; `123 RLOPSRM` ✅ (exige bitácora abierta para asentar); ⚠️
  `53 LOPSRM` (emisor=interpretación → combinar 125 fr. I).

### 3.4 Estimación
- **HU-12** — `50 fr. IV` ✅; `143 fr. I` ✅; `118 RLOPSRM` ✅; `54 LOPSRM` ✅ (≤1 mes); **`2 fr. XIX RLOPSRM` ✅**
  ("Monto total ejercido… **sin** IVA" — confirma el neto sin IVA); `46/46 Bis` ✅; `132 RLOPSRM` ✅ (expediente:
  generadores + notas). ⚠️ `45 ap. A fr. X` como "tope". **❌ `138/139 RLOPSRM` para penas/retención por atraso**
  → debe ser **46 Bis LOPSRM + 86-88 RLOPSRM**. Pend.: `191 LFD`.
- **HU-13** — `54 LOPSRM` ✅ (6 días presentar + 15 días revisar/autorizar — literal).
- **HU-14** — sin cita viva (la `138` de la ficha vieja ya fue desestimada; correcto que no cite).
- **HU-15** — `54 LOPSRM` ✅ (15 días); `53 LOPSRM` ✅ (residencia revisa/aprueba estimaciones). Pend.: `191 LFD`.
- **HU-16** — ⚠️ `54 LOPSRM` ("reingreso no reinicia el plazo" = interpretación A18); **❌ `132 RLOPSRM`**
  (inmutabilidad/trazabilidad = diseño, no en 132).
- **HU-17** — `54 LOPSRM` ✅ (periodo + flujo presentar/autorizar).

### 3.5 Pago y convenios
- **HU-20** — `24 párr. 2 LOPSRM` ✅ (suficiencia en **partida específica** — respalda ITEM 3.1); `54 LOPSRM` ✅
  (20 días para pagar lo autorizado); **`64 LOPSRM` ✅** (la 2ª pasada halló el **párrafo 4**: "…acta administrativa
  que dé por **extinguidos los derechos y obligaciones**…"); **`170 RLOPSRM` ✅** (fr. VI: relación de estimaciones
  en el finiquito).
- **HU-21** — `54 LOPSRM` ✅ (pago ≤20 días, medios electrónicos). Pend.: `191 LFD`. **❌ `118 RLOPSRM` para el
  "cuadre exacto del importe"** (inline `RegistroPagoForm.jsx`) → 118 es excedentes; el importe = neto de la
  estimación se ampara mejor en **54**; el "no editable" es regla de diseño.
- **HU-03** — `59 LOPSRM` ✅ (modificar por razones fundadas, sin variación sustancial); `59 Bis LOPSRM` ✅ (>50%
  → ajuste de costos); `99 RLOPSRM` ✅ (dictamen técnico del residente); `102 RLOPSRM` ✅ (>25% → revisión
  indirectos/SFP); `45 fr. IX` ✅. ⚠️ `59 párr. 3` (autorización EXISTE ✅; "acto separado + inmutable" es diseño
  = ITEM 3.2 `[validar]`, + 99 párr. 5); ⚠️ `53` (emisor). **❌ `123 fr. III` para la nota automática del convenio**
  → **123 fr. XI** ("asuntos trascendentes"). **❌ `118 RLOPSRM` para "no reducir por debajo de lo estimado"**
  → 118 es excedentes; sin cita directa (diseño).

### 3.6 Cierre, expediente y vistas
- **HU-24** — `64 LOPSRM` ✅ (conclusión/recepción/finiquito 60 días); `168-172 RLOPSRM` ✅ (finiquito + contenido
  mínimo + saldos art. 171 + acta de extinción 172); `143 RLOPSRM` ✅ (amortización); `66 LOPSRM` ✅ (vicios
  ocultos, garantía 12 meses); `123 RLOPSRM` ✅ (nota de cierre). **Todas correctas.**
- **HU-04** — `45 fr. IX` ✅; `59/99` ✅; `125` ✅; `138 fr. I` ✅ (plan de aplicación del anticipo en el
  expediente); `123 fr. III` ✅. Todas ✅.
- **HU-18** — `54 LOPSRM` ✅ (plazo de referencia del semáforo).
- **HU-19** — `54` ✅; `59/59 Bis` ✅; `46 Bis` ✅; **`86-88 RLOPSRM` ✅** (mecánica de penas por atraso — coincide
  con la corrección sugerida para HU-12); `46/46 Bis` ✅. **❌ `102 LOPSRM` → `102 RLOPSRM`** (typo de ley). Pend.:
  `191 LFD`.
- **HU-22** — `125 fr. I g` ✅ (el residente registra la sustitución); `123 fr. III` ✅; `53 LOPSRM` ✅.

---

## 4. RECOMENDACIÓN (para que decidas tú / el profe)
1. **Corrige las 6 ❌** (son precisión de citas, no lógica): penas 138/139 → **46 Bis + 86-88**; pago "cuadre"
   118 → **54**; nota de convenio 123-III → **123-XI**; reportes 102 **LOPSRM** → **RLOPSRM**; y declara como
   **regla de diseño** (sin cita literal) la "no reducción bajo lo estimado" (HU-03) y la "inmutabilidad/append-only"
   (HU-16) — apoyándolas por analogía en 123 fr. VI.
2. **Afina las ⚠️** cuando haya tiempo (46-I→+46-IV; 125-II→125-III; marcar 53/54-reingreso/59-p3 como
   **interpretación** explícita, no literal).
3. **LFD art. 191 (5 al millar):** confírmalo con el profe / abriendo el PDF (no verificable en este entorno).
4. **HU-23:** decide si el padrón se funda en **74/74 Bis LOPSRM + 43 RLOPSRM** o se deja como decisión del profe.
5. **Lo bueno:** HU-02, HU-08, HU-10, HU-11, HU-13, HU-17, HU-20, HU-24, HU-04, HU-22 tienen su base legal **100%
   verificada**; el grueso del sistema está bien fundado.

> **NO se cambió ninguna historia.** Verificación contra el texto literal de `lopsrm_utf8.txt`/`reg_utf8.txt`
> (2 pasadas, la 2ª adversarial). LFD pendiente por ser PDF. Local, sin push.
