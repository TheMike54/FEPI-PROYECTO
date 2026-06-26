# Changelog por revisión — SIGECOP

**Proyecto:** SIGECOP — Gestión de Contratos de Obra Pública
**Periodo:** 12 de mayo – 26 de junio de 2026
**Qué es:** registro cronológico de cada revisión con el profe → qué pidió/objetó → qué ajustamos después.

> Cada fila liga una **observación del profe** con el **ajuste** que hicimos en respuesta. Sirve para no reabrir temas
> ya cerrados y para mostrar la trazabilidad de las correcciones. El detalle de cada ajuste vive en los planes y
> soluciones (`docs/entrega_profe/planes_y_soluciones/`).

| Fecha | Qué pidió / objetó el profe | Qué ajustamos |
|---|---|---|
| 12-may | Deduplicar servicios; una historia por servicio (no 7 por el mismo flujo); formato de historia con máx. 2–3 criterios de aceptación; estimación por puntos (Fibonacci); factibilidad por atributos del proyecto, no comerciales. | Consolidación a ~24 historias; criterios acotados; estimación por complejidad; estudio de factibilidad reorientado a criterios técnicos del proyecto. |
| 18-may | Arquitectura por bloques/módulos; criterios como aseveraciones; inicio de sesión sin selector de rol; maquetas sobre la tecnología real; historias complejas en sprints tempranos. | Arquitectura desglosada en módulos; historias reescritas como aseveraciones; maquetas en React por historia; priorización de lo complejo. |
| 01-jun | **Tres reversiones:** cuadre **exacto al centavo** (sin tolerancia); **anticipo** como regla (con autorización del titular si supera el límite); **programa = conceptos del catálogo** en calendario. Además: sustitución de personas con histórico; apertura de bitácora = nota #1; tipos de nota por rol. | Alta con monto derivado del catálogo y cuadre exacto; programa concepto×periodo; anticipo con PDF de autorización obligatorio; bitácora con apertura formal y notas inmutables; roster con histórico por rol. |
| 09-jun | **Catálogo de empresas** (lo más insistido: no capturar la empresa como texto libre); plan de amortización proporcional; alertas de atraso sin umbral manual; flujo de estimación en el orden legal (contratista presenta → residencia autoriza → pago); nota de apertura narrativa; generadores y soportes (art. 132). | Padrón de empresas con selección/alta y deduplicación; amortización proporcional con cuadre; atraso derivado de programado vs ejecutado; flujo de estimación corregido; oleadas de corrección O0–O9. |
| 10-jun | Resolución de dudas en clase: emisor de notas = **residente** (art. 53); avance que excede el periodo = **aviso** (no bloqueo, salvo exceder lo contratado); tipo de nota "atraso". | Ajustes de emisor, aviso de exceso y nuevo tipo de nota aplicados. |
| 15-jun | Hoja de validación: pago **solo** sobre estimación autorizada; amortización = **art. 143 fr. I** (no 138); carátula **sin IVA** (art. 2 fr. XIX); fecha de inicio pasada permitida; generadores/soportes del art. 132. | Pago endurecido a "autorizada"; cita de amortización corregida a art. 143 fr. I; carátula sin IVA; reglas de fecha ajustadas; verificación de citas contra los textos legales. |
| 16-jun | **Finiquito obligatorio** ("sin finiquito no se cierra"); estimación por bloques; oficio del convenio en el expediente; presentar la estimación por estado; apertura con todos los datos del alta. | **Se creó la historia y el módulo de finiquito** (HU-24); expediente con oficio de convenio; presentación por estado; apertura redactada con el alta completa. |
| 21–22 jun | Operar siempre dentro de **bitácora abierta** (art. 122); **contrato cerrado en solo lectura** (art. 64); garantía duplicada del mismo tipo (error); convenio con plazo desproporcionado (error); limpiar tecnicismos de las historias. | Gate de bitácora obligatoria en convenio/avance/sustitución; gate de contrato cerrado; corrección de garantías y topes de plazo; historias reescritas en lenguaje natural. |
| 24-jun | Curva **versionada** por convenio (Vigente/Versión N); checklist de las 7 fracciones del art. 132; etiqueta **"Adicional"** (art. 101); ampliación de concepto con precio unitario heredado (art. 59). | Curva por etapas con histórico congelado; checklist del art. 132; conceptos adicionales marcados en catálogo y snapshots; ampliación con PU heredado (ampliación documentada como propuesta donde tocaba el núcleo). |
| 25-jun | Carátula **completa** (importe del anticipo, acumulados, saldo, firmas); alta con selector empresa→persona real; sustitución a los **tres roles** con regla temporal de firmas; **sesión única**. Resoluciones legales: supervisión externa puede ser otra empresa; portafolio se queda como está. | Carátula GACM de 4 bloques; alta con empresa→persona; sustitución con regla temporal de firmas; sesión única (la nueva cierra la anterior); rediseño del flujo de pago. |

---

## Notas de fiabilidad

- **Revisiones de mayor peso:** la del **01-jun** (tres reversiones de fondo) y la del **09-jun** (~20 hallazgos) fueron
  las que más re-trabajo originaron.
- **[confirmar Maiki]:** no encontramos acta de reunión con el profe el ~25/26-may ni el 04-jun; en esas fechas hubo
  trabajo interno (corrección de citas legales y fundación del backend), no revisión. Si hubo junta, agregar su fecha.
- **Corrección que se invirtió:** la cita de la amortización del anticipo se cambió 143→138 el 10-jun y se **revirtió a
  art. 143 fr. I** el 15-jun (el art. 138 es el *importe* del anticipo, no su amortización).
- **Punto abierto:** la **foto de evidencia del avance** se implementó como obligatoria (24-jun) y luego el profe pidió
  dejarla **opcional** (25-jun); el sistema quedó en opcional. Conviene confirmar la versión final del criterio.

> Changelog reconstruido del historial del proyecto y los reportes de sesión. Mantenerlo al día tras cada revisión
> (una fila nueva: qué pidió → qué se ajustó).
