# Brechas de las historias vs el sistema real — 23-jun-2026

> **Qué es esto:** auditoría de `docs/Historias_Usuario_SIGECOP.md` contra el CÓDIGO REAL (vía
> `docs/requisitos/INSUMOS_HISTORIAS_22jun.md` + lectura directa). Aquí van **las brechas**: lo que una historia
> describía y el sistema NO hace al 100% todavía. **No están dentro de las historias que verá el profe** — las
> historias se reescribieron para afirmar SOLO lo que el sistema SÍ hace. Tú decides cuáles cerrar antes de la
> entrega y cuáles dejar como pendiente. NO se tocó código.

---

## A) Correcciones de FIDELIDAD ya aplicadas a las historias

| HU | Qué decía (sobre-promesa) | Qué hace el código | Corrección aplicada |
|---|---|---|---|
| **(orden)** | Índice numérico; cuerpo casi por flujo | — | **Reordenado todo por flujo** (padrón antes del alta; avance = HU-06→HU-07→HU-05) e índice reescrito en orden de flujo, **conservando números HU**. |
| **HU-12** | "…el resumen de conceptos y **la evidencia fotográfica por generador**" como parte de integrar | La integración NO captura fotos; la evidencia **por generador** vive en el expediente (HU-04, follow-on a) | Quité la foto del "qué hace" de HU-12 + nota aclaratoria que la ubica en HU-04. |
| **HU-21** | "Finanzas registra el pago… **tomando los datos de la solicitud de cobro**" | Finanzas **re-captura** folio CFDI/fecha/referencia; NO hereda los soportes del contratista | "Finanzas… revisa el folio fiscal, confirma la referencia y la fecha de factura, y registra el pago." |
| **HU-03** | "Primero **sube los soportes** (oficio…): sin el oficio no procede" | Solo se exige una **referencia textual** del oficio antes; el PDF se sube DESPUÉS | "Primero **registra el oficio de soporte**…; el PDF del oficio se adjunta al convenio." |
| **HU-03** | adicionales "…**porque se estiman y pagan por separado**" | `es_adicional` se ESCRIBE pero **no se lee** en ningún lado | Quité "se estiman y pagan por separado"; dejé "se marcan como adicionales, separados de los originales". |
| **HU-04** | "los convenios muestran **los conceptos originales y los adicionales**" | El catálogo NO etiqueta original/adicional por concepto | "…muestran el cambio de monto/plazo (anterior→nuevo) y las versiones del programa." + agregué "evidencia fotográfica **por generador**". |
| **HU-19** | "cada uno **con formato y diseño**… importes con **formato de moneda**" | Volcado crudo: Excel sin estilos, PDF texto plano (Auditoría B) | Quité "formato y diseño"/"formato de moneda"; dejé "archivo real con datos… los PDF llevan encabezado con contrato/periodo/fecha". |
| **HU-20** | "sube su CFDI/factura, el oficio y sus datos bancarios" | Con el follow-on b ya es **PDF real** del CFDI/oficio + SPEI metadato | Actualizada: "sube el **PDF** del CFDI/oficio…" + criterio "soportes digitales (PDF) **descargables** por Finanzas en la cola". |
| **HU-14** | "con su estado, importe y **fechas**" | Solo se sella `enviada_en`; no hay sellos de revisión/pago | "…con su estado, importe y **fecha de presentación**". |

**Verificadas FIELES (sin cambio):** Acceso (login/sesión única/registro), HU-23, HU-01, HU-02, HU-22, HU-08 (+Por firmar), HU-09, HU-11, HU-06, HU-07, HU-05, HU-13, HU-15, HU-17, HU-18, HU-24. Todas sus afirmaciones de "qué hace", "criterio de éxito", "qué impide" y citas se confirmaron contra el código.

---

## B) BRECHAS (lo que el sistema NO cumple al 100% — decisión de Maiki)

### 🔴 Mayores (chocan con lo que pidió el profe)

1. **HU-16 reingreso — el código todavía lo modela como flujo aparte.** La historia ya lo retiró del catálogo (✓), pero el CÓDIGO conserva endpoint `reingresarEstimacion`, columna `reemplaza_a` (UNIQUE 1→1), página `ReingresoEstimacion.jsx` y entrada de menú; copia carátula+generadores en vez de re-integrar. El profe: "el reingreso es la integración otra vez". **Falta:** eliminar/recontextualizar ese flujo en código (rechazo → integrar normal por HU-12). Residuo extra: `ReingresoEstimacion.jsx` aún pinta badges de **severidad**.

2. **HU-03 conceptos adicionales — `es_adicional` se escribe pero no se lee.** Los adicionales NO se estiman en paralelo, NO se pagan distinto y NO se distinguen en estimación/pago/UI. La marca queda solo en la BD. **Falta** todo el flujo downstream (estimar/pagar/mostrar adicionales aparte).

3. **HU-03 curva NO versionada.** El programa se versiona (✓), pero `CurvaAvance.jsx` ignora versiones/convenios: normaliza sobre el monto **vigente** (que ya incluye adicionales) → el % histórico se re-escala al subir el monto. El "hoy 26%, mañana 13%" que el profe quiere evitar **sigue ocurriendo**. **Falta:** congelar la curva histórica y arrancar una nueva con el nuevo marco de referencia.

4. **HU-19 reportes sin formato/branding.** Los 7 generan archivo real con datos, pero son **volcado crudo** (Excel sin estilos/moneda; PDF texto plano sin tablas/gráfica/logo). El "formato y diseño" del profe es **rediseño pendiente** (ver `AUDITORIA_REPORTES_22jun.md`). La curva del reporte hereda 0% si el seed no tiene datos del periodo actual.

### 🟡 Medias

5. **HU-21 finanzas re-captura la factura.** El profe quiere que finanzas SOLO revise; hoy re-teclea folio/fecha/referencia (no hereda los soportes que subió el contratista en HU-20) y no coteja el folio contra el de la instrucción. Además, la instrucción de pago queda en estado `'emitida'` tras pagar (no avanza a `'cumplida'`).

6. **HU-20 falta orden de pago + notificación.** Al autorizar (HU-15) no se genera "orden de pago" ni una notificación al contratista ("presenta documentos a pago"); el contratista debe llegar por su cuenta. Los "datos bancarios" no son soporte **obligatorio** (solo metadato).

7. **HU-12 carátula GACM no exportable.** La carátula vive en pantalla; no hay PDF/documento descargable. El encabezado no separa explícitamente **CONTRATISTA (empresa)** vs **SUPERINTENDENTE (persona)** como dos campos (sí en firmas). La evidencia fotográfica por generador solo está en el expediente.

8. **HU-18 sin reporte de riesgos.** El semáforo NO detecta "pagaste sin avance reportado" ni hay panel de riesgos (el profe lo puso como ejemplo). Los 3 factores actuales son desviación de avance, plazos vencidos y pendientes.

9. **HU-14/HU-17 sin sellos de fecha.** Faltan columnas `autorizada_en`/`rechazada_en`/`pagada_en`; las columnas "Fecha de revisión/pago" del historial quedan vacías y el tablero no muestra la fecha exacta de autorización/pago (solo "días en estado"). El **estado** sí es correcto.

10. **HU-03 oficio: solo referencia textual antes.** Se exige la referencia del oficio antes de capturar (✓), pero el PDF se sube DESPUÉS y es un solo oficio (no el set completo solicitud/autorización/técnicos cargado antes). Además el código tiene un **acto de autorización interno** (`autorizarConvenio`, registrado→autorizado) que tensiona con la visión del profe de que el sistema "solo refleje" lo autorizado fuera — **decisión de Maiki** si se renombra o elimina.

11. **HU-15 plazo art. 54 vs 58.** El código cita **art. 54** para los 15 días de revisión; el profe mencionó **art. 58**. [validar] cuál es el correcto. Residuo: `severidad` sigue en el schema (DEFAULT 'menor') aunque la lógica ya no la usa.

### 🟢 Menores

12. **HU-08 datos mínimos solo cliente.** Los datos mínimos del acta (art. 123 fr. III) se exigen en el front, no se rechazan server-side. "No queda vacío" es garantía de UI, no de backend.

13. **HU-23 alta sin selector de empresa independiente.** La empresa del contrato se deriva de la persona elegida (modelo 1 persona : 1 empresa); no hay selector de empresa independiente (N:M). "Supervisión externa = otra empresa" es **aviso**, no bloqueo. "Empresa obligatoria" es solo cliente.

14. **HU-06 periodo pasado permitido + foto opcional + UX de corrección.** El periodo **futuro** se bloquea (✓) pero el **pasado** se permite con aviso (¿el profe quería solo el actual?). La foto es opcional/posterior (no se "pide" en el flujo de captura). El botón "Corregir" abre edición inline (parece edición, aunque por debajo es append-only).

15. **HU-02 menores.** `editarGarantia`/`subirPdfGarantia` no tienen el gate de contrato cerrado (sí lo tienen crear/endosar). La garantía de cumplimiento ≥10% no se valida como mínimo (solo se menciona en comentario).

16. **HU-11 menores.** El responsable de la visita es texto libre (no select del roster, art. 114). Crear minuta/visita no exige bitácora abierta (solo el vínculo necesita una nota existente).

17. **HU-05 doble definición de % físico.** La pantalla HU-05 deriva el físico de `Σ ejecutado ÷ Σ contratado`; el cascarón `AmbienteAvance` usa `prep.avance.fisico_pct` (otra fuente). Pueden discrepar; conviene unificar.

---

## C) Decisiones que el profe debe ratificar (legal, Nivel 1)

- Plazo de revisión de estimación: **art. 54 vs 58** (B-11).
- Umbral del 25%/50% del convenio (revisión SFP / ajuste de costos): art. 102 RLOPSRM / 59 Bis LOPSRM.
- Que el reingreso "no reinicia el plazo" (art. 54) vs reingreso = ingreso nuevo (interpretación del profe).
- Que la sustitución exija "misma empresa" (criterio del equipo, no literal del art. 125).
- "Empresa obligatoria para contratista/supervisión" y "supervisión = empresa independiente" (criterio del equipo).

---

*Auditoría de historias 23-jun-2026. Solo lectura; no se modificó código. Las historias quedaron fieles a lo que el sistema HACE; estas brechas son lo que falta para cumplir al 100% lo que el profe describió.*
