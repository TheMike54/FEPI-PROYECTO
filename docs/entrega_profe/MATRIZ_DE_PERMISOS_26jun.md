# SIGECOP — Matriz de permisos por rol e historia de usuario

**Sistema de Gestión Técnico-Administrativa de Contratos de Obra Pública (LOPSRM / RLOPSRM / LFD)** · 26 de junio de 2026.

**Cómo leer esta matriz.** Cada fila es una historia de usuario (HU); cada columna, uno de los cinco roles del
sistema. La celda indica **qué puede hacer ese rol en esa historia**. El detalle de cada acción y su **fundamento
legal** se desarrolla en la sección "Detalle y fundamento por historia".

**Convenciones de la celda:**
- **Acción en negrita** = el rol *ejecuta* esa acción (la operación principal de la historia).
- *Consulta* = solo lectura (ve la información, no la modifica).
- **—** = sin acceso a esa historia.
- "(solo el asignado)" = aunque el rol corresponda, la acción la realiza únicamente la **persona designada** en ese
  contrato (p. ej. el superintendente del contrato, no cualquier contratista).
- El acceso de lectura siempre está **acotado por participación**: cada quien ve solo los contratos en los que
  interviene (la Dependencia ve los de su adscripción; Finanzas es transversal a efectos de pago).

**Los cinco roles:** Residente de obra · Contratista / Superintendente · Supervisión · Dependencia / Contratante · Finanzas.

---

## Matriz general

| Historia | Residente | Contratista / Superintendente | Supervisión | Dependencia | Finanzas |
|---|---|---|---|---|---|
| **HU-01 · Alta de contrato** | **Da de alta** y firma el contrato (sube el PDF) | *Consulta* (se le designa) | *Consulta* (se le designa, opcional) | *Consulta* (parte contratante designada) | — |
| **HU-02 · Fianzas y garantías** | *Consulta* (el residente que creó el contrato también gestiona) | — | — | **Registra, edita y endosa** las pólizas | *Consulta* |
| **HU-03 · Convenios modificatorios** | **Registra** y sustenta el convenio | *Consulta* | *Consulta* | **Registra y autoriza** (único que autoriza) | — |
| **HU-04 · Expediente del contrato** | **Consulta integral** y adjunta evidencia | *Consulta* | *Consulta* | *Consulta* | — |
| **HU-05 · Programa y curva de avance** | **Consulta y exporta** | *Consulta* | *Consulta* | *Consulta* | — |
| **HU-06 · Registro de trabajos (avance)** | *Consulta* | **Registra y corrige** el avance ejecutado | *Consulta* | — | — |
| **HU-07 · Alertas de atraso** | **Asienta el atraso** en bitácora | — | *Consulta* | — | — |
| **HU-08 · Apertura de bitácora** | **Apertura** (solo el residente asignado) y firma | **Firma** su parte | **Firma** su parte | — | — |
| **HU-09 · Emisión y firma de notas** | **Emite** sus tipos y **firma** como contraparte | **Emite** sus tipos y **firma** | **Emite** sus tipos y **firma** | — | — |
| **HU-10 · Consulta de notas** | **Consulta** | *Consulta* | *Consulta* | — | — |
| **HU-11 · Minutas, visitas y acuerdos** | **Registra** minutas/visitas y las vincula a bitácora | *Consulta* | *Consulta* | — | — |
| **HU-12 · Integración de la estimación** | *Consulta* | **Integra** la estimación (solo el superintendente asignado) | *Consulta* | — | — |
| **HU-13 · Presentación de la estimación** | *Consulta* | **Presenta** la estimación (solo el superintendente asignado) | *Consulta* | — | — |
| **HU-14 · Historial de estimaciones** | **Consulta** | *Consulta* | — *(ver nota)* | *Consulta* | — |
| **HU-15 · Revisión y autorización** | **Autoriza o rechaza** (la residencia) | — | **Turna y observa** (puede rechazar directo) | *Consulta* | — |
| **HU-16 · Reingreso de estimación rechazada** | *Consulta* | **Reingresa** (solo el superintendente asignado) | — | — | — |
| **HU-17 · Tablero de estimaciones** | **Consulta** | *Consulta* | *Consulta* | *Consulta* | — *(sin acceso)* |
| **HU-18 · Portafolio ejecutivo** | *Consulta* (solo sus contratos) | — | *Consulta* (solo sus contratos) | **Consulta todos** (de su adscripción) | — *(ver nota)* |
| **HU-19 · Exportación de reportes** | **Exporta** los reportes | *Consulta* | *Consulta* | *Consulta* | *Consulta* |
| **HU-20 · Tránsito a pago** | *Consulta* | **Promueve el cobro** (sube CFDI/factura, genera la instrucción) | — | *Consulta* | **Carga el techo presupuestal, revisa la cola y descarga soportes** |
| **HU-21 · Registro del pago** | *Consulta* | — | — | *Consulta* | **Registra el pago** (único rol que paga) |
| **HU-22 · Sustitución de personas (roster)** | **Sustituye** en su contrato | *Consulta* | *Consulta* | **Sustituye** (en los contratos a su cargo) | — |
| **HU-23 · Padrón de empresas** | — | — | — | **Valida, inscribe y fusiona** empresas | — |
| **HU-24 · Finiquito y cierre** | **Elabora el finiquito y cierra** | — | — | **Elabora el finiquito y cierra** | — |

---

## Detalle y fundamento por historia

> Donde el permiso deriva de la ley se cita el artículo y fracción; donde es una regla de operación del propio
> sistema (no exigida por la ley) se indica **"criterio del sistema"**. Las marcas **[verificar]** señalan puntos
> que conviene confirmar (no se maquillan).

**HU-01 · Alta de contrato.** Solo el **residente** da de alta el contrato y, una vez formalizado, sube el PDF
firmado (un único documento, inmutable). El superintendente, la supervisión (opcional) y la dependencia se
**designan** como partes; no capturan el alta. Finanzas no interviene. — *Fundamento:* catálogo y presupuesto, art.
45 fr. IX RLOPSRM; plazo y término, art. 31 fr. V LOPSRM; autorización del anticipo, art. 50 fr. IV LOPSRM.

**HU-02 · Fianzas y garantías.** La **dependencia** registra, edita y endosa las pólizas (cumplimiento, anticipo,
vicios ocultos); un endoso es un ajuste que se agrega, no se borra. **[verificar]:** en la vista, el residente
figura como *consulta*, pero el residente que creó el contrato también puede gestionar las garantías; conviene
unificar el criterio. — *Fundamento:* garantías de anticipo y cumplimiento, art. 48 fr. I y II LOPSRM; vicios
ocultos, art. 66 LOPSRM; ajuste de la fianza, art. 91 RLOPSRM.

**HU-03 · Convenios modificatorios.** El **registro** del convenio (con su dictamen/oficio de soporte) lo hace la
dependencia o el residente del contrato; la **autorización** es un acto formal y separado que **solo la dependencia**
puede ejecutar, y exige el oficio en PDF. **[verificar]:** en la vista, el residente figura como *consulta*, pero en
el sistema el residente del contrato sí puede registrar el convenio. — *Fundamento:* modificación de contratos, art.
59 LOPSRM (la autorización corresponde al servidor facultado, párr. 3); dictamen de soporte, art. 99 RLOPSRM;
variación superior al 25 %, art. 102 RLOPSRM (clasifica revisión, no bloquea).

**HU-04 · Expediente del contrato.** El **residente** consulta el expediente completo y adjunta evidencia
fotográfica; las demás partes consultan. — *Fundamento:* criterio del sistema (visor documental acotado por participación).

**HU-05 · Programa y curva de avance.** Vista de solo lectura; el **residente** la consulta y exporta; las demás
partes consultan. — *Fundamento:* el programa de obra es la base para medir el avance, art. 52 LOPSRM y art. 45 ap.
A fr. X RLOPSRM; la presentación de la curva es criterio del sistema.

**HU-06 · Registro de trabajos terminados.** Solo el **superintendente** registra y corrige el avance ejecutado
(cada registro genera su nota de bitácora); las correcciones se hacen con un registro nuevo vinculado, no editando.
— *Fundamento:* no se ejecuta más de lo contratado, art. 118 RLOPSRM; bitácora obligatoria, art. 122 RLOPSRM; nota
de avance e inmutabilidad, art. 123 fr. II, VI y VII RLOPSRM.

**HU-07 · Alertas de atraso.** El **residente** asienta el atraso del concepto en la bitácora (una sola vez por
concepto y periodo); la supervisión lo consulta. — *Fundamento:* el programa como base de medición, art. 52 LOPSRM
y art. 45 ap. A fr. X RLOPSRM; asiento y nota de consecuencia avalada por el residente, art. 123 y 125 fr. I RLOPSRM
con art. 53 LOPSRM.

**HU-08 · Apertura de bitácora.** Solo el **residente asignado** abre la bitácora; las tres partes (residente,
superintendente y supervisión) firman su parte, cada quien desde su propia cuenta. — *Fundamento:* la bitácora se
inicia con una nota firmada por ambas partes, art. 123 fr. III RLOPSRM; bitácora obligatoria, art. 122 RLOPSRM.

**HU-09 · Emisión y firma de notas.** Cada parte **emite** los tipos de nota que le corresponden y **firma** como
contraparte las notas de los demás; el emisor no firma su propia nota. Una nota no firmada se tiene por aceptada al
vencer el plazo. — *Fundamento:* tipos de nota por rol, art. 125 fr. I (residencia), II (superintendencia) y III
(supervisión) RLOPSRM; firma, plazo y aceptación tácita, art. 123 fr. III; inmutabilidad y anulación, fr. VI y VII.

**HU-10 · Consulta de notas.** Solo lectura; el estado de cada nota (firmada o aceptada tácitamente) se determina en
el sistema. — *Fundamento:* trazabilidad de la bitácora, art. 123 fr. VI RLOPSRM; la consulta es criterio del sistema.

**HU-11 · Minutas, visitas y acuerdos.** El **residente** registra minutas y agenda de visitas, las vincula a una
nota de bitácora y adjunta el PDF; las demás partes consultan y descargan. — *Fundamento:* ratificación en bitácora
de instrucciones por minutas y oficios, art. 123 fr. X RLOPSRM.

**HU-12 · Integración de la estimación.** Solo el **superintendente asignado** integra la estimación; el sistema
calcula la carátula (sin IVA), valida que lo acumulado no exceda lo contratado y exige bitácora abierta, PDF firmado
y periodo vencido. — *Fundamento:* expediente de estimación, art. 132 RLOPSRM; tope de lo contratado, art. 118
RLOPSRM; periodo y plazo, art. 54 LOPSRM; amortización, art. 143 fr. I RLOPSRM; cinco al millar, art. 191 LFD; sin
IVA, art. 2 fr. XIX RLOPSRM.

**HU-13 · Presentación de la estimación.** Solo el **superintendente asignado** presenta la estimación integrada; la
presentación dispara el plazo de revisión. — *Fundamento:* presentación y plazo de quince días, art. 54 LOPSRM; nota
de solicitud de aprobación, art. 125 fr. II inciso b RLOPSRM.

**HU-14 · Historial de estimaciones.** Vista de solo lectura del ciclo de cobro; el **residente** la ve completa y
contratista y dependencia consultan. **[verificar]:** la supervisión no tiene acceso en la vista, aunque por
participación podría consultarla; conviene confirmar si debe verla. — *Fundamento:* criterio del sistema
(trazabilidad fiscal, incluye estimaciones rechazadas); los plazos del cronograma derivan del art. 54 LOPSRM.

**HU-15 · Revisión y autorización.** La **supervisión** registra observaciones y **turna** la estimación a la
residencia (y puede rechazarla directamente); la **residencia (residente)** es quien **autoriza o rechaza** tras el
turnado. La supervisión no autoriza; el contratista no interviene. — *Fundamento:* revisión y autorización en quince
días, art. 54 LOPSRM; nota de autorización por la residencia, art. 125 fr. I inciso b RLOPSRM; expediente, art. 132.

**HU-16 · Reingreso de estimación rechazada.** Solo el **superintendente asignado** reingresa una estimación
rechazada; el sistema crea una versión nueva ligada a la rechazada (no recalcula la carátula) y el reingreso no
reinicia el plazo de presentación. — *Fundamento:* art. 54 LOPSRM (el reingreso no reinicia el plazo); el manejo como
bloque vinculado es criterio del sistema.

**HU-17 · Tablero de estimaciones.** Vista agregada de solo lectura; los roles operativos ven sus contratos y la
dependencia ve los de su adscripción. **Finanzas no tiene acceso** a esta vista. — *Fundamento:* criterio del
sistema; las antigüedades y plazos derivan del art. 54 LOPSRM.

**HU-18 · Portafolio ejecutivo.** Vista de solo lectura con semáforos; la **dependencia** ve todos los contratos de
su adscripción, residente y supervisión ven solo los suyos. **[verificar]:** en la vista, Finanzas no aparece,
aunque a nivel de datos sería transversal; conviene confirmar si Finanzas debe tener el portafolio. — *Fundamento:*
umbrales del semáforo, criterio del sistema; el plazo de quince días deriva del art. 54 LOPSRM; padrón, art. 43
RLOPSRM y art. 74 Bis LOPSRM.

**HU-19 · Exportación de reportes.** El **residente** exporta los reportes; los demás roles los consultan con los
botones de exportación deshabilitados. — *Fundamento:* criterio del sistema (la generación es local; el residente
ejecuta, el resto consulta).

**HU-20 · Tránsito a pago.** El **superintendente** promueve su cobro: sube CFDI, factura y comprobantes, y genera la
instrucción de pago cuando la estimación está autorizada. **Finanzas** carga el techo presupuestal, revisa la cola y
descarga los soportes (no genera la instrucción del contratista). — *Fundamento:* suficiencia presupuestal por
partida, art. 24 párr. 2 LOPSRM; plazo de pago, art. 54 LOPSRM; mora, art. 55 LOPSRM; fianza de cumplimiento, art.
48 fr. II LOPSRM.

**HU-21 · Registro del pago.** **Solo Finanzas** registra el pago, y únicamente de estimaciones **autorizadas** por
la residencia; el importe es el neto calculado por el sistema (no se captura) y exige el CFDI del contratista. —
*Fundamento:* solo se paga lo autorizado, dentro del plazo, art. 54 LOPSRM; un contrato cerrado no admite pagos, art.
64 LOPSRM.

**HU-22 · Sustitución de personas (roster).** La **dependencia** sustituye en los contratos a su cargo y el
**residente** en su contrato; la sustitución reemplaza a la persona (no se borra el histórico) y exige bitácora
abierta y que la persona saliente no tenga firmas pendientes. La **supervisión puede pertenecer a otra empresa** (es
un tercero independiente); el contratista y el superintendente sí deben mantenerse en la misma empresa. La
dependencia como rol no es sustituible. — *Fundamento:* sustitución registrada en bitácora, art. 125 fr. I inciso g
RLOPSRM; bitácora obligatoria, art. 122 RLOPSRM; la regla de "misma empresa" y la excepción de la supervisión son
criterio del sistema.

**HU-23 · Padrón de empresas.** Solo la **dependencia** valida e inscribe empresas al padrón y fusiona duplicados. —
*Fundamento:* validación e inscripción al padrón, art. 43 RLOPSRM; padrón de contratistas, art. 74 Bis LOPSRM; la
fusión de duplicados es criterio del sistema.

**HU-24 · Finiquito y cierre.** La **dependencia** y el **residente** del contrato elaboran el finiquito y cierran el
contrato (un único acto, irreversible); requiere bitácora abierta. El cierre deja el contrato en solo lectura. —
*Fundamento:* finiquito y saldos a favor de cada parte, art. 64 LOPSRM y arts. 170-172 RLOPSRM (170 contenido, 171
saldos, 172 acta que extingue derechos y obligaciones).

---

## Notas finales

- **Acceso por participación.** Además del rol, el sistema limita cada vista a los contratos en que la persona
  interviene; por eso un mismo rol no ve los contratos de otra adscripción.
- **Inmutabilidad.** Apertura, notas, estimaciones, pagos, convenios y finiquito se agregan, no se editan: una
  corrección es siempre un registro nuevo vinculado. Un contrato cerrado queda en solo lectura (art. 64 LOPSRM).
- **Sesión única.** Una persona mantiene una sola sesión activa; un nuevo inicio de sesión cierra el anterior.
- **Puntos marcados [verificar]** (decisión de la coordinación): HU-02 y HU-03 (el residente que crea el contrato
  gestiona/registra, aunque la vista lo muestre como consulta); HU-14 (acceso de la supervisión al historial);
  HU-18 (acceso de Finanzas al portafolio). En todos, lo que aquí se documenta es **el comportamiento real del
  sistema**; la decisión de alinearlo o no corresponde a la coordinación y al criterio del profesor.
