# Criterios adoptados — anexo interno del equipo (SIGECOP)

> **Qué es este documento.** Cada historia de usuario tenía un bloque "Criterios adoptados": son las **decisiones
> de diseño** que tomó el equipo cuando la ley o el profe no especificaban un detalle (qué tasa, qué umbral, qué
> corte, etc.). Sin una respuesta dura, el equipo eligió un valor por defecto conservador, lo marcó con un código
> (A.., B..) y lo registró para conservar la trazabilidad de "por qué resolvimos así" y de qué falta confirmar con
> el profe.
>
> **Por qué viven aquí y no en las historias.** Hablan en idioma del equipo (códigos, "default conservador",
> referencias internas) y NO son requisitos; mezclarlos con las historias confunde al lector. Se conservan íntegros
> en este anexo; las historias quedan limpias. Referencia maestra: `docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md`.

---

## HU-00

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- La ficha vieja pedía "no permite continuar con campos vacíos": hoy ese bloqueo lo hace el servidor.
  Decidir si se quiere además un candado visible en la pantalla (campos obligatorios / botón deshabilitado)
  o se acepta el comportamiento actual. Criterio del equipo (default conservador): basta el bloqueo
  server-side; un candado visible en pantalla queda como mejora opcional.
- El registro guarda el correo en minúsculas, pero al iniciar sesión se busca tal cual se teclea. Criterio
  del equipo (B12): el inicio de sesión ignora mayúsculas/minúsculas (correo normalizado a minúsculas) para
  evitar fallos de acceso.
- Finanzas no requiere reglas extra de acceso más allá de las del flujo. Criterio del equipo (B13):
  autoridad pagadora, ya cubierta por el control de acceso transversal por flujo.

---

## HU-01

**Criterios adoptados (resueltos):**
- El umbral del 30% que dispara el PDF de autorización del anticipo: la exigencia de autorización escrita se funda en art. 50 fr. IV LOPSRM (autorización escrita cuando el anticipo supera 30%); el tope 30% es art. 50 fr. II LOPSRM. El valor del umbral es parametrizable (A3): criterio del equipo (default conservador 30%), no se asume de la ley como cifra fija.
- El plan de amortización es editable y se guarda, pero la carátula de la estimación todavía amortiza de forma proporcional al avance, no según el plan capturado (Fase B). Criterio del equipo (A2): la amortización es proporcional al programa (art. 143 fr. I RLOPSRM, con saldo a la estimación final, art. 143 fr. III-d); la banda editable se endurece hacia esa proporcionalidad.
- La cédula profesional como dato jurídico obligatorio se exige por decisión de la Fundación. Criterio del equipo (B1, default conservador): se mantiene exigida; sin base federal LOPSRM/RLOPSRM explícita.
- El fundamento de exigir el PDF firmado para que el contrato se formalice es criterio de formalización del equipo; el sistema no asume número de artículo para esa regla.
- El % de pena por atraso y su tasa son parametrizables. Criterio del equipo (A5): pena convencional por atraso con base en art. 46 Bis LOPSRM + arts. 86-88 RLOPSRM (mecánica) + art. 90 RLOPSRM (tope 20%/10%) + art. 46 fr. X LOPSRM; renglón previsto en la carátula, en $0 hasta fijar la tasa.
- La ficha vieja mencionaba 'penalizaciones aplicables' como bloque: hoy se reduce a un % de pena por atraso opcional más avisos en la vista (5 al millar art. 191 LFD, deductivas art. 46 Bis LOPSRM); no hay un editor de penalizaciones por concepto.

---

## HU-02

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- Emisión real de alertas de vencimiento (30/15/5 días) por un canal (correo/notificación): hoy son
  distintivos y contadores en pantalla con cortes fijos; no hay motor de notificación. **[sin base legal —
  criterio del profe; default conservador: no se notifica, solo se muestra]**.
- Vincular el endoso al convenio modificatorio que lo origina (el sistema ya permite vincularlo
  internamente): hoy el endoso se registra suelto. Criterio del equipo (B14): mejora opcional, no bloquea.

---

## HU-03

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- Endosos de fianzas: la ficha vieja pedía que el modificatorio aplicara y registrara los endosos de las
  fianzas; HU-03 no lo construye. La base lo contempla pero no genera el endoso automático al registrar el
  convenio. Validar si HU-03 debe disparar el endoso o si queda como integración futura HU-02 ↔ HU-03.
- Fundamento art. 59 vs art. 59 Bis: el sistema funda siempre el convenio en el art. 59 y trata el 59 Bis
  como derecho adicional (una marca), no como régimen alternativo. La ficha pedía 'indicar si se rige por
  59 o 59 Bis'. Confirmar que la interpretación de marca (no de cambio de fundamento) es la correcta.
- Autoridad que registra: hoy pueden registrar la Dependencia, el residente o el creador del contrato, pero
  el menú solo da el botón a la Dependencia. Criterio del equipo (default conservador): se mantiene ese
  conjunto de roles autorizados (Dependencia / residente asignado / creador).
- Emisor de la nota automática de bitácora = residente del contrato. Criterio del equipo (A11): emisor de
  notas de consecuencia (convenio) = el residente, con base en art. 53 LOPSRM.
- ✅ **RESUELTO (criterio del equipo, 18-jun):** superar el 25% del monto/plazo **avisa, no bloquea** — el
  convenio se registra con su aviso de variación (art. 59 referido). El 25% es **configuración**, no un tope
  legal del art. 59 (que tras la reforma DOF 14-11-2025 no fija tope numérico; es referencia administrativa
  RLOPSRM art. 102); el valor exacto sigue siendo ajustable y a confirmar con el profe.
- Al cambiar el plazo, hoy el convenio conserva los periodos vigentes (no los recalcula); follow-on
  declarado.

---

## HU-04

**Criterios adoptados (resueltos):**
- La ficha vieja pedía 'descarga individual por bloque'; el profe lo cambió a un único PDF consolidado.
  Confirmar que la descarga por documento individual queda definitivamente fuera de alcance.
- Confirmar si el bloque 'documentos jurídicos' (firmante de la dependencia, representante legal, poder
  notarial, equipo) cubre lo que la ficha entendía por 'documentos jurídicos', o si se esperaba adjuntar
  archivos jurídicos descargables (no implementado).
- El buscador ahora filtra solo por tipo de documento y periodo. Validar que esos dos filtros bastan para
  el expediente de un solo contrato.
- Validar el alcance ampliado (4 bloques nuevos: amortización, equipo, convenios y estimaciones) frente a
  la ficha original de 5 bloques.

---

## HU-05

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- El sistema no cita ningún artículo de ley en esta vista; la ficha vieja tampoco. Confirmar si la curva S o la fórmula del financiero requieren fundamento legal explícito.
- Financiero a nivel contrato (no por concepto), declarado como alcance de esta Etapa; validar si se exige desglose por concepto.
- Filtro de periodo por rango fijo (Todo / Últimos 3 / Último) en lugar de un selector libre: validar si cumple la intención de 'filtros por periodo' de la ficha.
- El financiero depende de los pagos registrados aguas abajo; validar coherencia con el flujo de estimaciones.
- La definición de 'atraso' por celda (programado vencido sin ejecución) es interpretación del sistema; confirmar que coincide con el criterio de desviación esperado.

---

## HU-06

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- La nota automática se crea siempre de tipo 'avance'; la ficha vieja preveía también el tipo 'entrega de obra' (no construido). Confirmar si basta con 'avance'.
- Emisor de la nota = quien registra (el contratista). Criterio del equipo (B11): la nota de avance la registra el contratista, identificado en los datos de la nota (art. 123 fr. II RLOPSRM).
- Que el aviso no bloqueante (adelantar a precios pactados sin convenio) sea el comportamiento legal correcto frente al art. 118 / convenios. Es interpretación a confirmar.

---

## HU-07

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- Toda la historia original (configurar conceptos a vigilar, umbral de atraso y canal sistema/correo) fue
  reemplazada por el profe por el panel automático; confirmar que la ficha se reescribe y no se reabre el
  modelo de configuración.
- Notificación por correo: no existe; solo aviso dentro de la aplicación. Confirmar si el canal de correo
  queda descartado para esta Etapa.
- La estructura de 'alerta de atraso' del diseño se conserva pero ya no se usa; decidir si se elimina o se
  documenta como obsoleta.
- Emisor de la nota de atraso = el residente (art. 53 LOPSRM). Criterio del equipo (A11): el emisor de notas
  de consecuencia (atraso) es el residente; las firmas del equipo (art. 123 fr. III/VI RLOPSRM) operan
  aparte sobre la nota ya asentada.
- Los artículos citados en la nota (52 LOPSRM / 45 ap. A fr. X RLOPSRM) los pone el sistema; lo legal lo
  confirma el profe.

---

## HU-08

**Criterios adoptados:**
- Regla 'mismo día': el sistema fija la fecha de apertura igual a la fecha de inicio del contrato, no la fecha de entrega del sitio. La entrega del sitio se conserva aparte en el acta.
- Asiento retroactivo (diferido) de notas de sustitución/avance/convenio al abrir: el número de folio refleja el orden en que se asientan, no la fecha del hecho. Las notas no se editan ni se eliminan; corregir = registro nuevo ligado; numeración y orden por asiento (art. 123 fr. V RLOPSRM) y carácter definitivo (art. 123 fr. VI RLOPSRM).
- Plazo de firma de notas por defecto = 2 días naturales (esta Etapa); días hábiles y el plazo legal exacto quedan a confirmar.
- Quién debe firmar la apertura (firma conjunta): hoy se exige a todo el equipo (residente + superintendente + supervisión si aplica); confirmar con el profe si basta la contraparte directa.

---

## HU-09

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- Quién debe firmar una nota para considerarla aceptada: ¿todo el equipo (residente + superintendente +
  supervisión) o basta la contraparte directa? Criterio del equipo (default conservador): firma todo el
  equipo del contrato (art. 123 fr. III RLOPSRM).
- Asiento retroactivo (diferido) de notas automáticas (sustitución/avance/convenio) al abrir la bitácora:
  orden del folio vs. fecha real del hecho. Criterio del equipo (A10): numeración/orden por asiento (art.
  123 fr. V RLOPSRM) e inmutabilidad (art. 123 fr. VI RLOPSRM).
- La ficha vieja redacta el rol como 'residente, supervisión o contratista'; en el sistema el contratista
  emite como 'superintendente' (art. 125 fr. II), no como 'contratista' directo — confirmar el mapeo con el
  profe.
- Plazo de firma/aceptación por defecto = 2 días naturales, configurable de 1 a 60; confirmar días
  naturales vs. hábiles.
- La ficha vieja menciona arts. 122 y 125; el sistema cita además 123 fr. III/V/VI/VII y 53 — confirmar
  fundamento completo.

---

## HU-10

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- La ficha dice 'firmante' pero el sistema filtra por el emisor de la nota (no por quien firma). Criterio
  del equipo (default conservador): 'firmante' mapea al emisor real (art. 125 RLOPSRM, un emisor por nota);
  un filtro por firmantes reales queda como mejora opcional.
- La búsqueda por palabra clave incluye la etiqueta y el tipo además de asunto y contenido (alcance mayor al
  literal de la ficha). Criterio del equipo (default conservador): se mantiene el alcance ampliado por ser
  útil y no destructivo.
- El export toma las notas seleccionadas de todo lo cargado, no solo de los resultados visibles tras filtrar
  (la selección persiste al cambiar filtros). Criterio del equipo (default conservador): se conserva la
  selección al re-filtrar; limpiarla queda como ajuste opcional.
- El criterio 1 (filtros combinados sobre datos reales) y el export a Excel todavía no están cubiertos por
  las pruebas automáticas (solo estructura/permisos); se validan a mano. Criterio del equipo: se valida
  manualmente en esta Etapa; la cobertura automatizada queda como mejora.
- El estado de aceptación se muestra y se exporta pero todavía no es filtrable. Criterio del equipo: se deja
  como mejora opcional añadirlo como filtro adicional.

---

## HU-11

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- El modal de vínculo lista **cualquier** nota del contrato (incluso las que aún no están firmadas).
  Criterio del equipo (default conservador): se permite vincular cualquier nota del contrato porque el
  vínculo es **referencial**, no una co-firma, y no altera la nota (art. 123 fr. VI RLOPSRM); restringirlo a
  notas firmadas queda como ajuste opcional. Sin base legal literal para el matiz.
- Matiz **fr. X vs fr. II** del art. 123 RLOPSRM (la fr. II describe los datos que debe contener cada nota).
  Criterio del equipo (A10): el vínculo se funda en art. 123 fr. X RLOPSRM (ratificación de minutas), y los
  datos de cada nota se rigen por art. 123 fr. II RLOPSRM.
- Subida del PDF de la **visita** (hoy la visita no adjunta PDF, solo la minuta) — definir si se requiere.

---

## HU-12

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- Registro fotográfico y soportes documentales del expediente (ficha vieja) todavía no están construidos.
  Diferidos.
- La 'apertura del periodo' de la ficha hoy se reduce a capturar el inicio y fin del periodo (no hay una
  acción formal de apertura separada de la integración).
- Definición de avance físico vs. financiero y la regla de disparo de la retención por atraso (global vs.
  por concepto, bruto vs. neto). Criterio del equipo (B7): por concepto, en unidades (programado al periodo
  − ejecutado), sin umbral.
- CMIC / 2 al millar: configurable y diferido. Criterio del equipo (B2): parametrizable, default NO aplica
  al contrato (aportación CMIC, sin base LFD/RLOPSRM).
- Bloqueo duro vs. alerta para el tope del programa (art. 45 ap. A fr. X RLOPSRM / art. 52 LOPSRM): hoy
  bloquea. Criterio del equipo (default conservador): bloqueo duro, alineado al bloqueo del art. 118 RLOPSRM
  (A7).
- Umbral del anticipo para exigir la autorización del titular (art. 50 fr. IV LOPSRM) y su configuración.
  Criterio del equipo (A3): parametrizable, default 30%; la autorización escrita se exige cuando supera 30%.
- **Ambiente de estimación = WIZARD (FASE 3, rediseño por bloques):** la integración de la estimación se
  presenta como un **wizard de pasos encadenados** (patrón del Alta) en una sola pantalla: **1·Periodo →
  2·Generadores → 3·Carátula → 4·Soportes y notas → 5·Integrar y presentar**, con gating estilo Alta (atrás
  libre; el avance se bloquea por exceso del art. 118 / plan del periodo). **NO es un cascarón**: reusa la
  captura REAL de esta misma HU (mismos componentes y validaciones); el "Recorrido por bloques" dejó de ser
  una pantalla aparte y la ruta vieja del cascarón redirige al wizard. El **registro fotográfico** de soportes
  queda **fuera del alcance de la Etapa 1** (la ley no lo exige como requisito de la estimación; el expediente
  del art. 132 RLOPSRM se integra con generadores y notas firmadas). La reestructura **conserva todos los
  criterios** (ver el checklist en `docs/requisitos/HISTORIAS_POR_CICLOS.md`).

---

## HU-13

**Criterios adoptados (HU-13):**
- Notificación formal a la residencia y la supervisión: hoy no existe como aviso automático; la difusión es
  por consulta del historial. En esta Etapa la presentación queda sellada y se difunde por consulta (art. 54
  LOPSRM); el aviso automático queda como mejora.
- El plazo de 6 días para presentar no bloquea: solo se advierte, no se impide presentar fuera de los 6 días
  (art. 54 LOPSRM).
- El plazo de 15 días se muestra como referencia visual pero no dispara ninguna acción automática al vencer
  (no hay afirmativa ficta ni autorización automática); el plazo del art. 54 LOPSRM es informativo en esta
  Etapa.
- La revisión abarca supervisión y residencia: la redacción usa 'revisión/autorización' (supervisión y
  residencia, art. 53 y 54 LOPSRM).

---

## HU-14

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- La ficha vieja cita art. 130 RLOPSRM (tipos de estimación) y art. 138 RLOPSRM (versionado); el sistema en
  HU-14 no cita ningún artículo. Criterio del equipo (default conservador): HU-14 es vista de consulta; el
  fundamento del ciclo vive en HU-12/HU-15/HU-16.
- CA-3 'expediente completo': el panel es un resumen, no el expediente de HU-04. Decidir si CA-3 exige
  enlazar al expediente completo o el resumen basta.
- Fechas de revisión y pago en el panel: hoy el sistema solo registra las fechas de integración y
  presentación; las de autorización, rechazo y pago no se empujan, por lo que esas columnas salen vacías
  aunque el estado ya haya avanzado por HU-15/HU-21. Falta cablearlas para completar la línea de tiempo.
- Observaciones del panel: hoy siempre vacías; no se traen de HU-15. Decidir si HU-14 debe mostrarlas.
- Concepto de 'versiones rechazadas' (HU-16): el modelo no versiona (la columna Versión sale '—'); una
  rechazada aparece como estado, no como versión anterior vinculada. Confirmar si HU-14 debe mostrar el
  encadenamiento de versiones.

---

## HU-15

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- ¿Las observaciones deben poder anclarse 'por concepto' (renglón del generador) y no solo por sección, como pedía la ficha? Hoy es por sección.
- ¿Es aceptable que las secciones 'registro fotográfico' y 'soportes' no se muestren (faltan archivos reales) aunque la ficha las nombra? El sistema ya las acepta.
- Los cortes del semáforo (7/12 días) son del prototipo, no de ley: confirmar con el profe los cortes verde/amarillo/rojo y si debe haber bloqueo al vencer (hoy solo informa).
- ¿El plazo de 15 días debe correr desde la presentación (como hoy) o desde una 'fecha de recepción' separada? En el flujo actual se asumió que presentación = recepción a revisión.
- Validar el emisor / la firma legal de la autorización y del rechazo (hoy solo se sella el estado y el autor de la observación, sin firma formal).

---

## HU-16

**Criterios adoptados (resueltos):**
- Semántica de 'no reiniciar el plazo de presentación' del art. 54 LOPSRM: la nueva versión referencia la
  presentación de la rechazada, sin reabrir el contador. Criterio del equipo (A18): el reingreso no reinicia
  el plazo del art. 54 LOPSRM.
- El reingreso copia la carátula y los generadores de la rechazada (no recalcula montos). Criterio del
  equipo (B9): el copy basta; los ajustes de montos van en otra estimación o el finiquito, con menos
  superficie de error.
- La 'nota de atención a observaciones' es hoy un control que no se guarda (no hay campo). Criterio del
  equipo (B10): control no persistido en Etapa 1; persistirla requiere DDL nueva.
- Formatos de descarga (PDF y Excel) de las observaciones. Criterio del equipo: se mantienen ambos por
  ahora; consolidar en un solo PDF (coherencia con el expediente) queda como mejora.

---

## HU-17

**Criterios adoptados (resueltos):**
- El 'avance' (físico vs. programado) que pedía la ficha vieja no se construyó en el tablero. Criterio del equipo (default conservador): el avance físico vive en HU-06/HU-07; incorporarlo al tablero queda como mejora.
- Los estados 'en revisión' y 'en pago' de la ficha vieja no son estados propios del modelo (hay 5: Integrada / Presentada / Autorizada / Pagada / Rechazada). Hoy 'Presentada' cubre la revisión y 'Autorizada' cubre el previo al pago. Criterio del equipo (default conservador): bastan las etiquetas/responsable; no se crean sub-estados dedicados.
- Los indicadores son de cartera (todos los contratos visibles del usuario), no de un único contrato seleccionado como sugería la ficha. Criterio del equipo (default conservador): se mantiene la vista de cartera con desglose por contrato; un selector de contrato único queda como mejora.
- ✅ **Corregido (hecho desactualizado):** el control de pago (HU-21) es **estricto** — solo se paga lo **autorizado** (art. 54 LOPSRM); el tablero refleja ese flujo. (La nota previa lo describía como permisivo; el pago se endureció en la oleada de pago.)

---

## HU-18

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- Qué se entiende por **avance físico** y contra qué se compara (avance real registrado vs. programado).
  Criterio del equipo (default conservador): se deriva del avance por concepto registrado vs. lo programado;
  la definición fina queda abierta como ajuste.
- La comparación 'periodo actual vs. anterior' está solo como distintivo por fila, no como comparativa
  agregada del portafolio entre dos periodos seleccionables. Criterio del equipo (default conservador): se
  mantiene el distintivo por fila; el selector de periodos y la comparación a nivel grupo/total quedan como
  mejora.
- ✅ **RESUELTO (criterio del equipo, 18-jun):** los cortes del semáforo se **fijaron como criterio del
  equipo** y se centralizaron (configurables) en `lib/umbrales-semaforo.js`: avance vs programado VERDE ≥95% /
  ÁMBAR 85-95% / ROJO <85% (= desviación ≤5 / ≤15 pp), días vencidos 0 / 1-10 / >10, pendientes ≤2. Sin base
  legal del número exacto; siguen siendo ajustables si el profe pide otros valores.
- El factor 'atrasos en plazos legales' hoy se simula con un número fijo. Criterio del equipo (default
  conservador): se computa contra el plazo de autorización de estimación (art. 54 LOPSRM) como referencia;
  afinar otros plazos legales queda como mejora.
- Residencia y Supervisión con acceso de solo-lectura (hoy lo tienen); la ficha vieja solo menciona a la
  Dependencia. Criterio del equipo (B6): se mantiene el acceso solo-consulta para Residencia y Supervisión;
  la Dependencia es quien ejecuta.

---

## HU-19

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- ✅ **RESUELTO / aplicado:** el reporte 4 (Observaciones) ya exporta — se añadió la consulta de
  observaciones a nivel contrato (que reúne las de la revisión técnica de HU-15). Los 7 reportes exportan; la
  ficha que pedía los '7 reportes' queda cubierta.
- Fundamento legal de la pena por atraso. Criterio del equipo (A5): art. 46 Bis LOPSRM + arts. 86-88 RLOPSRM
  (mecánica) + art. 90 RLOPSRM (tope); el número cuadra exacto (derivado de la carátula).
- Ancla del recorte por periodo (Mensual = último mes, Trimestral = último trimestre, anclado al dato más
  reciente). Criterio del equipo (default conservador): se ancla al dato más reciente.
- El reporte de comprometido/disponible presupuestal depende de HU-20; hoy el resumen lo rotula
  'PENDIENTE'.
- Mejora opcional: exponer la pena por atraso directamente en el historial para leerla en vez de derivarla.

---

## HU-20

**Criterios adoptados en la integración (con base legal — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- **Comprometido = Σ neto de autorizadas + pagadas** (dependencia/ejercicio, sin la actual). **Base:** art.
  24 LOPSRM exige suficiencia en la partida; la fórmula del "comprometido" es la interpretación conservadora
  estándar de presupuesto (compromiso = lo ya autorizado/erogado). El detalle exacto es **criterio del
  profe**; default conservador aplicado.
- **Cortes del semáforo:** ✅ resuelto como **criterio del equipo** (18-jun) — se miden en **días vencidos**
  del plazo de pago: verde 0 / ámbar 1-10 / rojo más de 10 (centralizados con el portafolio). El art. 54 solo
  fija el plazo de 20 días; los cortes son criterio del equipo, configurables si el profe pide otros.
- **Exigibilidad de la fianza:** el sistema la exige si hay una garantía de cumplimiento registrada en el
  contrato. **Base:** art. 48 fr. II LOPSRM (el cumplimiento se garantiza como regla general); si el
  contrato no la tiene registrada (caso de excepción, p. ej. art. 50), no bloquea. Default conservador.
- **Gate de finiquito (rechazar contrato 'cerrado'):** **resuelto con base legal** — art. 64 LOPSRM (extinción
  de obligaciones) + art. 170 RLOPSRM (la relación de estimaciones queda en el finiquito). Implementado en
  esta sesión.
- **Quién genera la instrucción / carga soportes (Contratista o Finanzas):** **sin base legal literal** —
  criterio del profe; default conservador = ambos roles ejecutores (coincide con la matriz de permisos).

---

## HU-21

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- ✅ **RESUELTO / aplicado:** el candado de estado se endureció a solo **'Autorizada'** (art. 54 LOPSRM); el
  backend rechaza cualquier otro estado (Integrada/Presentada/Rechazada/Pagada). Ya no es permisivo.
- Pago parcial vs. exacto: hoy el importe es el neto completo de la estimación; falta validar si procede el
  pago parcial.
- 'Actualizar el avance financiero del contrato' (ficha vieja): hoy solo se marca la estimación como
  pagada; no hay un acumulado financiero del contrato que se recalcule — definir si se requiere.
- Fundamento legal de que la fecha de pago no pueda ser anterior a la integración. Criterio del equipo (A9):
  rechazo (400) con base derivada del art. 54 LOPSRM; el cálculo del monto queda intacto.
- La fecha de autorización es provisional (pasará a HU-20); mientras tanto el plazo se ancla a la fecha de
  factura.
- Reescribir/activar las pruebas del formulario que hoy están en pausa tras la conversión a integración.

---

## Registro

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- El umbral de 'nombre completo' (al menos 2 palabras) lo fijó la Fundación como regla operativa; no tiene
  artículo propio (la cita art. 123 RLOPSRM es por la trazabilidad en bitácora). Criterio del equipo (B1,
  default conservador): la regla operativa de 'nombre completo' se mantiene.
- Existe una página de registro suelta sin enlace desde la interfaz ni cobertura de pruebas: decidir si se
  elimina o se enlaza (la versión viva es la que está dentro de la pantalla de inicio de sesión). [decisión
  Maiki]
- El bloque 'sin sesión / modo demostración' del panel de solicitudes es residuo del modo proyecto en
  retirada: revisar al remover ese modo.

---

## Por Firmar

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- La ficha vieja no tiene número de HU (es 'Por Firmar'); confirmar con el profe si se le asigna identificador formal o queda como sub-historia de HU-08.
- Confirmar matriz de acceso: el sistema no filtra por rol nominal (solo el equipo del contrato firma); la restricción de roles vive en la guarda de la pantalla (Residente / Contratista / Supervisión). Validar si la Dependencia y Finanzas deben quedar excluidas también del lado del servidor.
- Confirmar que la composición del equipo firmante (residente + superintendente + supervisión si existe) es la lista de 'firmantes autorizados' esperada por el profe (art. 123 fr. III).

---

## HU-22

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- Autoridad para sustituir: Dependencia, residente asignado o creador del contrato. Criterio del equipo
  (B15): Dependencia o residente; al residente le toca registrar la sustitución en bitácora (art. 125 fr. I
  g RLOPSRM).
- Emisor formal de la nota: hoy es quien ejecuta. Criterio del equipo (A11): la nota de consecuencia
  (sustitución) la asienta el residente (art. 53 LOPSRM + art. 125 fr. I g RLOPSRM).
- Convención entre el rol del equipo y el rol de la cuenta (superintendente = contratista). Criterio del
  equipo (default conservador): se conserva el mapeo superintendente → cuenta de contratista (art. 125 fr.
  II RLOPSRM).
- Funcionalidad sin ficha de HU previa: falta formalizarla.
- Nota diferida: la fila queda sin nota hasta abrir la bitácora; verificar que al asentarse quede
  vinculada.

---

## HU-23

**Criterios adoptados (HU-23 · Catálogo de empresas):**
- El aviso de 'misma empresa' (superintendente vs. supervisión) hoy avisa pero no bloquea. Criterio del equipo (default conservador): se mantiene como aviso, no bloqueo duro (la supervisión debe ser un tercero independiente); endurecerlo a bloqueo queda como ajuste.
- El padrón se funda en art. 43 RLOPSRM / art. 74 Bis LOPSRM `[validar profe]` (estas dos citas ya las usa el sistema); la justificación verbal del profe ('catálogos: es lo de ley', 09-jun) las respalda. Confirmar con el profe el fundamento legal del padrón y de la regla supervisión = tercero independiente.
- Hay dos formularios de registro con la misma lógica de empresa; ambos comparten ya el normalizador fuerte. Confirmar si ambos deben coexistir o si uno es legado (duplicación a consolidar).
- Las reglas de normalización fuerte (qué sufijos de razón social se recortan, qué se funde). Criterio del equipo (B3): normalización conservadora (mayúsculas/acentos/puntuación/sufijos de razón social), sin similitud difusa, para no fundir empresas legítimamente distintas. Para duplicados ya existentes hay un script de mantenimiento que repunta cada usuario a la empresa canónica y borra las duplicadas. Un índice único fuerte a nivel base de datos queda como mejora opcional para Maiki.
- La ampliación del registro para soportar empresa la marca la documentación de la oleada como 'tensión de alcance' (se pidió no tocar el núcleo de autenticación). Confirmar con Maiki que esa edición es aceptable.
- El catálogo de empresas es público (sin sesión) y expone todas las razones sociales; confirmar que eso es deseable (se asumió dato no sensible).

(Origen: docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md)

---

## HU-24

**Criterios adoptados (resueltos — ver docs/reportes/TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md):**
- La fórmula base del saldo está verificada contra la ley (A12: art. 64 LOPSRM + arts. 168-172 RLOPSRM),
  pero los conceptos accesorios —deductivas finales, sobrecosto, 5-al-millar pendiente— se dejan en un campo
  de **ajustes finales** parametrizable. Criterio del equipo (B8): parametrizable, default 0; no se
  hardcodea hasta que el profe confirme qué conceptos entran.
- El finiquito exige que el contrato tenga bitácora abierta (porque se asienta como nota). Criterio del
  equipo (default conservador): se mantiene ese flujo (la nota de finiquito en bitácora, art. 123 RLOPSRM).
- La recepción física de los trabajos (acta previa al finiquito, art. 64 LOPSRM) no se modela como un paso
  separado todavía. Criterio del equipo (default conservador): se documenta como follow-on; el acta de
  recepción física (art. 168 RLOPSRM) queda como ampliación.

---

