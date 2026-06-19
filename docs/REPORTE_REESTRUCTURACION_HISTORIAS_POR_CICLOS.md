# REPORTE — Reestructurar las HISTORIAS por CICLOS (a raíz del rediseño de bloques)

> **Contexto.** Maiki revisó el mockup `docs/mockups/sigecop-rediseno-bloques.html` (wizard "Nueva estimación")
> y planteó: si el sistema se ordena por **ciclos/wizards**, **hay que reestructurar también el documento de
> historias** (hoy en `.md`, próximamente en Excel). Este reporte responde sus preguntas, fija la **regla de
> oro** que él acordará con el profe, propone la **nueva estructura del documento de historias**, y da mi
> opinión. **Nada de esto cambia el código todavía** — es para acordar el enfoque.

---

## 1. La pregunta clave: ¿el wizard "desarma" historias?

**NO. Las INTEGRA.** Hay que distinguir dos cosas:

- **Un PASO del wizard ≠ una historia.** Los pasos "Periodo → Generadores → Carátula → Soportes → Integrar"
  son los **criterios internos de UNA sola historia: HU-12 (Integración de estimación)** — que ya pide
  capturar generadores (art. 132), calcular la carátula (amortización / 5 al millar / neto) y vincular notas.
  El wizard solo los **hace visibles como pasos**; no parte HU-12 en cuatro historias.
- **Un WIZARD sí abarca varias historias** del mismo ciclo, encadenadas. "Nueva estimación" = **HU-12**
  (integrar) → **HU-13** (presentar). La revisión/autorización (HU-15) es **otro wizard, de otro actor**.

> En una frase: **el wizard agrupa historias completas y muestra los criterios de cada una como pasos. No
> fragmenta requisitos.**

---

## 2. ¿Cuántas historias abarca cada ciclo? (mapa del sistema)

| Ciclo (flujo) | Historias que abarca | ¿Wizard? | Pantalla(s) que las integran |
|---|---|---|---|
| **Alta de contrato** | HU-01, HU-02 | ✅ (ya existe) | El wizard de 7 pasos del alta (HU-02 fianzas = paso "Garantías") |
| **Ciclo de estimación** | **HU-12, 13, 14, 15, 16, 17** (6) | ✅ insignia | Wizard "Nueva estimación" (HU-12+13) · Revisión (HU-15) · Reingreso (HU-16) · Historial (HU-14, lectura) · Tablero (HU-17, ejecutiva) |
| **Bitácora** | HU-08, 09, 10, 11 (4) | 🟡 parcial | Wizard apertura+firma (HU-08) → emitir (HU-09); Consultar (HU-10) y Minutas (HU-11) en paralelo |
| **Avance y seguimiento** | HU-05, 06, 07 (3) | 🟡 parcial | Registrar avance (HU-06) → Curva (HU-05) / Alertas (HU-07) en paralelo |
| **Pago y tránsito** | HU-20, 21 (2) | ✅ | Wizard tránsito (HU-20) → registro de pago (HU-21) |
| **Convenios** | HU-03 (1) | 🔴 no | Formulario + autorización (no es wizard) |
| **Cierre / finiquito** | HU-24 (1) | 🔴 no | Pantalla de finiquito (un acto) |
| **Expediente** | HU-04 (1) | 🔴 no | Visor de solo lectura consolidado |
| **Vistas ejecutivas** | HU-17, 18, 19 | — | Tablero / Portafolio / Reportes |
| **Transversales** | HU-00 (login), HU-22 (roster), HU-23 (empresas) + Registro + Por firmar | — | Pantallas propias |

> **24 historias** se reagrupan en **~8 ciclos + transversales**. Ninguna desaparece ni cambia de número.

---

## 3. LA REGLA DE ORO (lo que sí y lo que NO se puede, según tu acuerdo con el profe)

**SÍ se puede (reestructura organizativa):**
- **Agrupar** las historias por ciclo (en vez de la lista plana HU-01…HU-24).
- **Aclarar** redacción, ordenar criterios, mostrar cómo se integran en el wizard.
- **Renumerar a futuro** SOLO si el profe lo aprueba; lo más seguro es **conservar los números** (HU-12 sigue
  siendo HU-12) y solo agregar la **vista por ciclos** encima.

**NO se puede (cambio de requisito):**
- **Cambiar lo que una historia EXIGE.** Tu ejemplo es exacto: si HU-01 hoy dice *"se da de alta el contrato
  con su PDF firmado"*, la versión reestructurada **debe seguir exigiendo el PDF**. La reestructura **no
  relaja, no agrega ni quita requisitos** — solo reorganiza. Cualquier cambio de comportamiento es **otra
  cosa** (una mejora con su propia justificación, no "reestructura").

> **Criterio operativo para no romper esto:** cada criterio de aceptación funcional de cada HU debe
> **sobrevivir literal** (o solo aclararse), nunca cambiar. Yo lo garantizo con un **checklist de
> conservación** (HU por HU: criterio viejo → criterio en la vista nueva = idéntico en lo funcional).

---

## 4. Nueva estructura propuesta para el documento de historias

> El doc de historias es la **fuente de la verdad** de requisitos (CLAUDE.md). El riesgo de reescribirlo es
> **duplicar/divergir**. Por eso propongo NO reescribir las historias, sino agregar una **vista por ciclos
> que las REFERENCIA** (una sola fuente, cero divergencia):

```
HISTORIAS_USUARIO  (reestructurado por ciclos)
│
├── 0. Cómo leer (esta vista agrupa por CICLO; cada historia conserva su número y sus criterios)
│
├── CICLO: Alta de contrato            → HU-01, HU-02
│      · qué integra el wizard (paso ↔ criterio de qué HU)
│      · [criterios de aceptación de HU-01, HU-02 — VERBATIM, sin cambios]
│
├── CICLO: Ciclo de estimación         → HU-12, 13, 14, 15, 16, 17
│      · wizard "Nueva estimación": Periodo/Generadores/Carátula/Soportes = HU-12; Integrar+Presentar = HU-13
│      · Revisión/autorización = HU-15; Reingreso = HU-16; Historial = HU-14; Tablero = HU-17
│      · [criterios VERBATIM de cada HU]
│
├── CICLO: Bitácora                    → HU-08, 09, 10, 11   (consulta/minutas en paralelo)
├── CICLO: Avance y seguimiento        → HU-05, 06, 07
├── CICLO: Pago y tránsito             → HU-20, 21
├── CICLO: Convenios / Cierre / Expediente → HU-03 / HU-24 / HU-04   (no-wizard)
└── TRANSVERSALES                      → HU-00, HU-22, HU-23, Registro, Por firmar
```
- Cada ciclo abre con un cuadro **"paso del wizard ↔ criterio de qué HU"** (la trazabilidad que el profe va a
  querer ver: que el rediseño no inventa requisitos, solo reordena los existentes).
- **Migración a Excel (futuro):** este árbol mapea 1:1 a hojas — una pestaña "Ciclos" (índice) + una pestaña
  por ciclo con las HU y sus criterios. La vista por ciclos **no estorba** el paso a Excel; lo facilita.

---

## 5. Factibilidad — por dónde conviene empezar

| Ciclo | Volverlo wizard | Reestructurar su historia | Prioridad |
|---|---|---|---|
| **Estimación** | 🟢 alta (patrón del alta ya existe) | 🟢 fácil (6 HU bien definidas) | **1 (prueba de concepto)** |
| **Pago** | 🟢 alta (ya secuencial) | 🟢 fácil (2 HU) | 2 |
| **Bitácora** | 🟡 parcial (consulta en paralelo) | 🟡 media | 3 |
| **Avance** | 🟡 parcial | 🟢 fácil | 4 |
| Convenios / Finiquito / Expediente | 🔴 no-wizard | 🟢 fácil (quedan igual) | — |

---

## 6. Mi opinión (me la pediste)

1. **Estoy de acuerdo y es SEGURO** — precisamente porque, bien hecho, **no cambia requisitos**, solo
   reorganiza. El profe lo va a aceptar porque es **claridad y trazabilidad**, no alcance nuevo. Tu condición
   ("que no diga otra cosa de lo que ya decía") es exactamente la salvaguarda correcta.
2. **El temor de "desarmar historias" no aplica:** los pasos del wizard son criterios internos de una historia
   (HU-12), no historias nuevas. No fragmentamos; **integramos**.
3. **No reescribir las historias, REFERENCIARLAS** desde la vista por ciclos (una sola fuente). Así nunca se
   contradicen el doc viejo y el nuevo, y el checklist de conservación demuestra al profe que cada requisito
   sobrevive literal.
4. **Hacerlo por ciclo, no de un golpe.** Reestructurar la historia de un ciclo **a la par** de construir su
   wizard (primero Estimación): así el doc y el sistema avanzan sincronizados y se valida el patrón antes de
   replicarlo. Es exactamente el método que ya usamos (cambio pequeño → suite verde → siguiente).
5. **Riesgo a vigilar:** que un "reordenar criterios" se cuele como cambio de comportamiento. Mitigación: el
   checklist HU-por-HU (criterio viejo == criterio nuevo) en cada ciclo que reestructuremos, revisable por el
   profe.
6. **Lo único que de verdad necesita el profe antes:** el audio donde menciona *"quitar buscar/vincular notas
   firmadas porque todo va en una pantalla"* — eso **sí** podría tocar un criterio (mover/quitar una pantalla),
   así que conviene confirmarlo con él para que la reestructura de ESE punto quede pactada, no impuesta.

---

## 7. Qué sigue
- **Plan maestro de ejecución** (sequencia todos los planes chicos de inicio a fin):
  `docs/planes/PLAN_MAESTRO_EJECUCION_18jun.md` — incluye una **fase de reestructura de historias por ciclo**,
  amarrada a cada wizard.
- **Decisión tuya/del profe:** (a) ¿conservamos números de HU (recomendado) o renumeramos?; (b) confirmar con
  el profe el punto del audio (quitar buscar/vincular notas) para pactarlo; (c) ¿arrancamos la prueba de
  concepto por **Estimación**?

> *Reporte de enfoque — basado en el mapa real de HU (permisos.js / dummy.js / el doc de historias vigente) y
> en el rediseño de `PLAN_REDISENO_BLOQUES_WIZARD_18jun.md`. Nada implementado; es para acordar el enfoque con
> el profe.*
