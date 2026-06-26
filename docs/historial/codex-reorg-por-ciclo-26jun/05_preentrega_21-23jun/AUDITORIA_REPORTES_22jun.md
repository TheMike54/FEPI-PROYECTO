# AUDITORÍA B — Puntos de exportación / reportes de SIGECOP

> **Fecha:** 2026-06-23 · **Tipo:** SOLO LECTURA (no se tocó código) · **Base:** working tree (código real en
> disco, incluye cambios sin commitear de las sesiones recientes). · **Método:** 5 agentes en paralelo, cada uno
> verificando en el código el estado real de cada exportación/descarga (no se asumió nada).
>
> **Para qué sirve:** el profe revisó reporte por reporte y exige que CADA exportación (PDF/Excel/descarga) tenga
> **formato y diseño**, no salida cruda; y dijo que hay pestañas que "ni funcionan" (vio la curva en blanco/0).
> Maiki hará los mockups del rediseño; este documento es el **mapa completo y honesto** de qué existe, qué hace,
> de dónde sale, su estado real y su diseño actual.

---

## 1. Veredicto en una frase

**El profe tiene razón.** De las ~11 exportaciones que SÍ generan archivo, **ninguna tiene formato ni branding**:
los PDF (jsPDF) son texto posicionado a mano, **sin tablas reales, sin acentos, sin logo**; los Excel (exceljs)
son **volcado crudo** (encabezados + filas, sin estilos, sin formato de moneda/fecha, sin anchos). Y varias de
las pantallas más "reporteables" (curva, portafolio, tablero, **carátula de estimación**) **no exportan nada**:
solo viven en pantalla. La "curva en blanco" **no es un bug de código** — es falta de datos seed con fechas
vigentes; pero además la curva **no se puede exportar** y **no está en el PDF del expediente**.

---

## 2. Tabla maestra (todas las exportaciones y huecos)

| # | Reporte / exportación | Pantalla | Tipo (librería) | Estado real | Diseño | HU |
|---|---|---|---|---|---|---|
| 1 | Avance físico vs programado (curva S) | Reportes | **PDF** (jsPDF) | Funciona; Ejec/Financ salen vacíos sin datos | Crudo, sin gráfica, sin branding | HU-19 #1 |
| 2 | Avance físico vs programado | Reportes | **Excel** (exceljs) | Funciona | Crudo (sin estilos) | HU-19 #1 |
| 3 | Avance financiero | Reportes | **Excel** (exceljs) | Funciona parcial — fila "comprometido/disponible" = texto "PENDIENTE" | Crudo | HU-19 #2 |
| 4 | Listado de estimaciones | Reportes | **Excel** (exceljs) | Funciona | Crudo | HU-19 #3 |
| 5 | Observaciones de revisión (R4) | Reportes | **Excel** + endpoint `/observaciones/contrato/:id` | Funciona (comentario de cabecera dice falsamente "DESHABILITADO") | Crudo | HU-19 #4 / HU-15 |
| 6 | Bitácora completa | Reportes | **PDF** (jsPDF) | Funciona; requiere bitácora aperturada | Crudo, sin branding | HU-19 #5 |
| 7 | Histórico de modificatorios | Reportes | **Excel** (exceljs) | Funciona | Crudo | HU-19 #6 |
| 8 | Penalizaciones y deductivas | Reportes | **Excel** (exceljs) | Funciona; pena por atraso derivada | Crudo | HU-19 #7 |
| 9 | Expediente contractual consolidado | Expediente | **Impresión navegador** (`window.print`) | Funciona; fotos pueden salir como 📷 placeholder (carga asíncrona); **no incluye curva** | DOM volcado a impresión; membrete mínimo sin logo | HU-04 |
| 10 | Exportar historial de estimaciones | Historial | **Excel** (exceljs) | Funciona | Crudo (importe como texto, no número) | HU-14 |
| 11 | Observaciones de versión rechazada — PDF | Reingreso | **PDF** (jsPDF) | Funciona | Crudo, sin acentos, sin tabla, sin membrete | HU-16 |
| 12 | Observaciones de versión rechazada — Excel | Reingreso | **Excel** (exceljs) | Funciona | Crudo | HU-16 |
| 13 | Documento de finiquito | Finiquito | **Impresión navegador** (`window.print`) | Funciona | **Buen formato documental** (incisos, fundamento, firmas); sin logo/membrete | HU-24 |
| 14 | Documento de nota de bitácora | Notas / Integración | **Impresión navegador** (`window.print`) | Funciona | **Buen formato** (membrete guinda, firmantes, pie legal); sin logo | HU-09/10/12 |
| 15 | PDF firmado del contrato | Alta / Expediente | Descarga binaria BYTEA (`res.send`) | Funciona | Documento EXTERNO verbatim (no se rediseña) | HU-01/04 |
| 16 | Autorización del anticipo (PDF) | Alta | Descarga binaria BYTEA | Funciona | Externo verbatim | HU-01 |
| 17 | PDF de póliza de fianza | Fianzas | Descarga binaria BYTEA | Funciona (reemplazable) | Externo verbatim | HU-02 |
| 18 | PDF de minuta de junta | Minutas | Descarga binaria BYTEA | Funciona (reemplazable) | Externo verbatim | HU-11 |
| 19 | Oficio de aprobación del convenio | Convenios / Expediente | Descarga binaria BYTEA | Funciona (append-only; requisito >25% art. 102) | Externo verbatim | HU-03 |
| 20 | Evidencia fotográfica de estimación | Expediente | Descarga binaria BYTEA (inline) | API funciona; **HUECO de UX**: solo en Expediente (no en HU-12), galería no agrupa por concepto | Miniaturas sin formato de lámina | HU-04/12 |
| — | **HUECO** Carátula de estimación como documento | Integración (HU-12) | — | **HUECO: no exporta/imprime** (solo pantalla) | El formato GACM existe en pantalla pero nunca llega a PDF | HU-12 |
| — | **HUECO** Dictamen de revisión (carátula+observaciones) | Revisión (HU-15) | — | **HUECO: no exporta** | — | HU-15 |
| — | **HUECO** Curva de avance (exportable) | Curva | — | **HUECO: no exporta** (solo SVG en pantalla) | — | HU-05 |
| — | **HUECO** Portafolio ejecutivo (exportable) | Portafolio | — | **HUECO: no exporta** | — | HU-18 |
| — | **HUECO** Tablero de estimaciones (exportable) | Tablero | — | **HUECO: no exporta** | — | HU-17 |
| — | **HUECO** Comprobante/recibo de pago | Registro de pago | — | **HUECO: no implementado** | — | HU-21 |
| — | **HUECO** Evidencia/acta de visita de obra | Minutas/visitas | — | **HUECO: no implementado** (las visitas no aceptan adjunto) | — | HU-11 |
| — | **HUECO** Legajo binario consolidado del expediente | Expediente | — | **HUECO: no implementado** (cada doc se abre por separado) | — | HU-04 |
| — | **HUECO** Branding/formato transversal | TODOS los PDF/Excel | — | **HUECO: no implementado** (sin autoTable, sin estilos, sin logo) | — | HU-19 |

---

## 3. Hallazgos clave para el rediseño (lo que Maiki debe atacar)

1. **Capa de diseño transversal inexistente (lo más importante).** Todos los reportes comparten dos generadores
   crudos: `encabezadoPDF` (`reportesContrato.js:173-182`, todos los PDF) y `llenarHoja` (`excelExport.js:24-28`,
   todos los Excel). Arreglando esos dos puntos + adoptando `jspdf-autotable` y estilos de exceljs (anchos,
   negritas, `numFmt` de moneda/%, fill de encabezado, logo UAGRO, pie con folio/página) se rediseñan **las 9
   exportaciones de HU-19** de un golpe.
2. **PDFs sin acentos.** jsPDF base no maneja UTF-8 → "Seccion", "Observacion", "version" (visible en HU-16 PDF).
   Hay que registrar una fuente embebida (p. ej. Helvetica con acentos / Roboto) o migrar a autoTable con fuente.
3. **Excel = `json_to_sheet` plano.** Importes van como **string** "$ ..." (no número con formato de celda) → no
   se pueden sumar en Excel. Rediseñar a números con `numFmt`.
4. **Carátula de estimación: HUECO crítico.** El profe quiere la estimación como **documento formal GACM**; hoy
   la carátula (`IntegracionEstimacion.jsx::TabCaratula`) **solo vive en pantalla, sin botón de imprimir/exportar**.
   Es el reporte más importante para él y no produce documento. (El resumen de generadores que pidió tampoco
   está como cuadro exportable — ver Auditoría A, HU-12.)
5. **La "curva en blanco" = datos, no código.** `CurvaAvance.jsx` funciona; sale 0/blanco cuando no hay programa,
   ni avance, ni pagos con fecha vigente (de ahí `reseed_demo_fechas_actuales.sql`). PERO: la curva **no se exporta**
   y **no está en el PDF del expediente** — dos huecos reales si el expediente debe ser el paquete "de inicio a fin".
6. **Pantallas ejecutivas sin exportar.** Curva, Portafolio (HU-18) y Tablero (HU-17) son las vistas más
   "reporteables" para dirección y **ninguna exporta**. Candidatas fuertes a "reporte con formato".
7. **Evidencia fotográfica.** El backend ya soporta foto **por concepto** (`estimacion_fotos.contrato_concepto_id`),
   pero la UI solo la expone en el Expediente (HU-04), no durante la integración (HU-12), y la galería no agrupa
   por concepto ni la mete en ningún PDF como lámina fotográfica. *(El follow-on (a) de esta sesión añade la foto
   por renglón del generador.)*
8. **Lo que NO hay que rediseñar.** Los 5 documentos **binarios externos** (PDF de contrato, autorización de
   anticipo, póliza de fianza, minuta, oficio de convenio) son archivos que sube el usuario; el sistema los sirve
   verbatim (`Content-Disposition: inline`, abren con `window.open`). No tienen "diseño del sistema" que cambiar
   (salvo que se quiera envolverlos en un visor con cabecera SIGECOP).
9. **Lo mejor terminado (modelo a seguir):** `DocumentoNota` y `DocumentoFiniquito` ya tienen formato documental
   (membrete, estructura por incisos, firmas, pie legal). Les falta solo el **logo/membrete institucional UAGRO**.
   Sirven de plantilla visual para el resto.
10. **Bug de comentario (corregir al integrar):** la cabecera de `reportesContrato.js:11` marca el reporte #4
    (observaciones) como `[DESHABILITADO]` / "sin fuente", pero **ya funciona** (endpoint montado en `server.js:77`,
    `disponible:true` en `reportesContrato.js:410`). El comentario quedó obsoleto tras el FIX 2.2.

---

## 4. Fichas por área

### Área R1 — Los 7 reportes de contrato (HU-19) + observaciones (R4)

#### Reporte 1 — Avance físico vs programado (PDF)
1. **Ubicación:** Pestaña "Reportes" (ciclo expediente), `ExportacionReportes.jsx`. Botón `ExportacionReportes.jsx:225` (`BotonFormato`, testid `btn-exportar-1-pdf`). Handler `reportesContrato.js:419` → `avanceFisicoPDF` (`reportesContrato.js:187`). Sin endpoint propio (todo cliente).
2. **Tipo de salida:** PDF en cliente con **jsPDF** (`reportesContrato.js:193`, `doc.save()` :220). No usa autoTable: texto posicionado a mano con `doc.text()`.
3. **Contenido:** Dos bloques de texto plano. (a) "Curva S (% acumulado)": `Mes | Programado | Ejecutado | Financiero`. (b) "Concepto × periodo": `Clave, Concepto, Unidad, columnas por periodo, Contratado, Ejecutado, % Avance`.
4. **Origen de datos:** `api.leerProgramaObra` (`/contratos/:id/programa`), `api.trabajosDeContrato` (`/trabajos/contrato/:id`), `api.listarPagos` (`/pagos/contrato/:id`) + `contrato.monto`.
5. **Estado real:** **FUNCIONA**, pero es el que el profe probablemente vio "en blanco/0": `ejecutado` es `null` en periodos futuros, `financiero` es `null` sin pagos o `monto<=0`. Sin programa para el periodo imprime "Sin programa de obra para el periodo seleccionado.". No es bug; es datos demo incompletos.
6. **Diseño actual:** **Volcado crudo con encabezado mínimo** (`encabezadoPDF`: título, contrato/contratista, periodo, fecha — sin logo, sin colores). Cuerpo = líneas con `|`, sin tabla real ni gráfica. Helvetica por defecto.
7. **Para qué HU sirve:** HU-19 #1 (avance físico vs programado, curva S).

#### Reporte 1 — Avance físico vs programado (Excel)
1. **Ubicación:** Misma pantalla; testid `btn-exportar-1-excel`. Handler `reportesContrato.js:419` → `avanceFisicoExcel` (`reportesContrato.js:223`).
2. **Tipo de salida:** Excel `.xlsx` **multihoja** con **exceljs** (`descargarExcelMultihoja`, `excelExport.js:41`); Blob + `<a>.click()`.
3. **Contenido:** Hoja "Curva S" (`Mes, Periodo, Programado %, Ejecutado %, Financiero %`) + hoja "Concepto x periodo" (Gantt).
4. **Origen de datos:** Idéntico al PDF.
5. **Estado real:** **FUNCIONA.** Mismas advertencias de datos vacíos.
6. **Diseño actual:** **Volcado crudo.** `llenarHoja` solo pone encabezados (claves del primer objeto) + filas; sin estilos, anchos, formato de moneda/% ni metadatos del contrato dentro de la hoja.
7. **Para qué HU sirve:** HU-19 #1.

#### Reporte 2 — Avance financiero (Excel)
1. **Ubicación:** `ExportacionReportes.jsx`; testid `btn-exportar-2-excel`. Handler `reportesContrato.js:420` → `avanceFinancieroExcel` (`reportesContrato.js:241`).
2. **Tipo de salida:** Excel `.xlsx` multihoja (exceljs).
3. **Contenido:** Hoja "Por estimacion" (`Estimacion, Periodo, Estado, Subtotal, Amortizacion, Retencion 5 al millar, Deductivas, Retencion por atraso, Neto`) + hoja "Resumen" (`Monto del contrato, Σ Neto no rechazadas, Pagado acumulado, Avance financiero %`, y `Comprometido/disponible presupuestal` = literal **"PENDIENTE — depende de HU-20"**).
4. **Origen de datos:** `api.historialEstimaciones` + `api.listarPagos` + `contrato.monto`.
5. **Estado real:** **FUNCIONA parcialmente.** La fila "comprometido/disponible" es un **placeholder textual** (`reportesContrato.js:268`). Pena por atraso = derivada (`penaAtrasoDerivada` :50).
6. **Diseño actual:** **Volcado crudo.** Mezcla texto "PENDIENTE" con números en la columna Valor.
7. **Para qué HU sirve:** HU-19 #2. El comprometido/disponible cuelga de HU-20.

#### Reporte 3 — Listado de estimaciones (Excel)
1. **Ubicación:** testid `btn-exportar-3-excel`. Handler → `estimacionesExcel` (`reportesContrato.js:279`).
2. **Tipo de salida:** Excel `.xlsx` una hoja (`descargarExcelHoja`).
3. **Contenido:** Por estimación: `Estimacion, Periodo, Estado, Subtotal, Amortizacion, Retencion 5 al millar, Deductivas, Retencion por atraso, Neto, Integrada en/por, Presentada en/por`.
4. **Origen de datos:** `api.historialEstimaciones`.
5. **Estado real:** **FUNCIONA.** Ignora el periodo (es solo etiqueta). Sin estimaciones → hoja con solo encabezados.
6. **Diseño actual:** **Volcado crudo.**
7. **Para qué HU sirve:** HU-19 #3.

#### Reporte 4 — Observaciones de revisión técnica (Excel) [R4]
1. **Ubicación:** testid `btn-exportar-4-excel`. Handler → `observacionesExcel` (`reportesContrato.js:306`). **Endpoint:** `GET /api/observaciones/contrato/:id` (`observaciones.routes.js:9` → `observaciones.controller.js:8`), montado en `server.js:77`.
2. **Tipo de salida:** Excel `.xlsx` una hoja (exceljs).
3. **Contenido:** `Estimacion, Seccion, Tipo, Severidad, Estado, Turnado a, Autor, Fecha, Solventada en, Descripcion`.
4. **Origen de datos:** `estimacion_observaciones` JOIN `estimaciones` (filtra por contrato) + LEFT JOIN `usuarios`. Acotado por `esParteOSupervision`.
5. **Estado real:** **FUNCIONA. ⚠️ La cabecera-comentario del archivo MIENTE** (dice "[DESHABILITADO]"/"sin fuente" en `reportesContrato.js:11`), pero el reporte está cableado (`disponible:true` :410, `api.observacionesContrato` existe, endpoint montado). **Corregir el comentario.**
6. **Diseño actual:** **Volcado crudo.**
7. **Para qué HU sirve:** HU-19 #4; surte de la revisión técnica HU-15.

#### Reporte 5 — Bitácora completa (PDF)
1. **Ubicación:** testid `btn-exportar-5-pdf`. Handler → `bitacoraPDF` (`reportesContrato.js:329`). `requiereBitacora:true` (:411): deshabilitado sin bitácora aperturada.
2. **Tipo de salida:** PDF en cliente con **jsPDF** (texto a mano, sin autoTable).
3. **Contenido:** Listado cronológico de notas: `Nota #N · fecha · tipo`, `Emisor · Estado`, `Asunto`, `contenido`, `Firmas: nombre (rol)`.
4. **Origen de datos:** `api.notasDeContrato` (`/bitacora/contrato/:id/notas`).
5. **Estado real:** **FUNCIONA.** Sin notas → "Sin notas de bitácora para el periodo seleccionado.".
6. **Diseño actual:** **Volcado crudo con encabezado mínimo** (sin branding/logo). Texto plano por nota.
7. **Para qué HU sirve:** HU-19 #5 (se nutre de HU-08/09/10).

#### Reporte 6 — Histórico de modificatorios (Excel)
1. **Ubicación:** testid `btn-exportar-6-excel`. Handler → `modificatoriosExcel` (`reportesContrato.js:357`).
2. **Tipo de salida:** Excel `.xlsx` una hoja (exceljs).
3. **Contenido:** Por convenio: `Numero, Folio, Tipo, Fundamento, Fecha, Monto anterior, Monto nuevo, Δ Monto %, Plazo anterior, Plazo nuevo, Δ Plazo %, Revisión SFP (art.102), Ajuste costos (art.59 Bis), Motivo, Autorizado por`.
4. **Origen de datos:** `api.convenios` (`/convenios/contrato/:id`).
5. **Estado real:** **FUNCIONA.** Sin convenios → hoja con solo encabezados.
6. **Diseño actual:** **Volcado crudo.**
7. **Para qué HU sirve:** HU-19 #6 (HU-03).

#### Reporte 7 — Penalizaciones y deductivas (Excel)
1. **Ubicación:** testid `btn-exportar-7-excel`. Handler → `penalizacionesExcel` (`reportesContrato.js:387`).
2. **Tipo de salida:** Excel `.xlsx` una hoja (exceljs).
3. **Contenido:** Por estimación: `Estimacion, Periodo, Estado, Retencion por atraso (art. 46 Bis + 86-88), Retencion 5 al millar (art.191 LFD), Deductivas, Pena convencional % (contrato)`.
4. **Origen de datos:** `api.historialEstimaciones` + `api.preparacionEstimacion` (para `pena_convencional_pct`).
5. **Estado real:** **FUNCIONA.** Pena por atraso = derivada (`penaAtrasoDerivada` :50), no leída de columna.
6. **Diseño actual:** **Volcado crudo.**
7. **Para qué HU sirve:** HU-19 #7.

#### HUECO transversal R1 — ningún reporte tiene branding ni formato
Generadores comunes `encabezadoPDF` (`reportesContrato.js:173-182`) y `llenarHoja` (`excelExport.js:24-28`).
**No existe ninguna capa de diseño/branding:** (a) los PDF no usan `jspdf-autotable` (las "tablas" son texto con `|`, la curva S es solo números, sin gráfica); (b) los Excel no aplican estilos (`ws.columns` solo `header`/`key`, sin `width`/`numFmt`/negritas/`fill`); (c) sin logo UAGRO, sin pie, sin numeración, sin metadatos del contrato en las hojas. Exactamente lo que el profe llamó "salida cruda".

---

### Área R2 — Expediente contractual (HU-04)

#### Exportar expediente (PDF) — impresión consolidada
1. **Ubicación:** `/contratos/expediente`. Botón `ConsultaExpediente.jsx:798-808` (`window.print()`, testid `btn-exportar-pdf`). Datos cargados en `seleccionarContrato` (:556-586): `api.detalleContrato`, `leerProgramaObra`, `rosterContrato`, `planAmortizacion`, `convenios`, `estimacionesDeContrato`.
2. **Tipo de salida:** **Impresión del navegador** (`window.print()`) sobre el DOM, con CSS `@media print` (`index.css:40-49`) que oculta `header`/`aside`. NO usa jsPDF/exceljs.
3. **Contenido:** Membrete mínimo (`print-header`, :811-816) + 9 bloques forzados abiertos: Configuración, Catálogo de conceptos (Clave·Concepto·Unidad·Cantidad·P.U.·Importe), Programa de obra (matriz A2), Fianzas, Plan de amortización, Documentos jurídicos, Roster y sustituciones, Convenios modificatorios (con "Oficio de aprobación cargado"), Resumen de estimaciones (+ galería de fotos por estimación).
4. **Origen de datos:** `GET /api/contratos/:id` (`detalleContrato`, :562-618) + endpoints de programa, roster, plan, convenios y estimaciones. Fotos por `api.listarFotosEstimacion`/`descargarFotoEstimacion`.
5. **Estado real:** **Funciona como impresión**, pero con riesgos para el PDF que verá el profe: (a) las **fotos pueden no salir** — `FotosEstimacion` descarga cada imagen como blob URL asíncrono; si imprime antes de cargar, sale 📷; y son miniaturas 80×80 sin tratamiento de print. (b) **No incluye la CURVA de avance** (no hay gráfica en `ConsultaExpediente.jsx`). (c) márgenes/encabezados/saltos dependen del navegador.
6. **Diseño actual:** **DOM volcado a impresión**, no documento diseñado. Membrete mínimo de texto, sin logo UAGRO, sin portada, sin pie con folio/página, sin firmas, sin numeración. Emojis de iconos se imprimen tal cual.
7. **Para qué HU sirve:** HU-04 (criterio: "el expediente completo se exporta como un solo PDF").

#### Ver oficio de aprobación de convenio (descarga binaria)
1. **Ubicación:** Bloque Convenios del expediente. Botón `📎 Ver oficio` (`ConsultaExpediente.jsx:444`, `verOficio` :387-397). `api.descargarOficioConvenio(convenioId)`.
2. **Tipo de salida:** Descarga binaria → blob → `window.open(_blank)`. Archivo subido por el usuario.
3-4. **Contenido/origen:** El oficio tal cual se subió; convenios/`contrato_documentos` (BYTEA), filtrado por `tiene_oficio`.
5. **Estado real:** **Funciona** (con `window.alert` en error, `revokeObjectURL` a 60 s). En impresión el botón se oculta y se sustituye por texto.
6. **Diseño actual:** Documento original del usuario (sin branding del sistema, correcto).
7. **Para qué HU sirve:** HU-04 (soporte) / HU-03.

#### AmbienteExpediente — NO exporta (hub de navegación)
`/contratos/expediente-ambiente`. No genera nada; solo resumen read-only + enlaces a `/contratos/expediente` (HU-04) y `/reportes` (HU-19). Es cascarón de navegación por diseño. **Desajuste de copy:** el texto promete que el expediente incluye "bitácora", pero `ConsultaExpediente.jsx` **no tiene bloque de bitácora**.

#### HUECO R2 — Curva de avance dentro del expediente
**No implementado.** El PDF del expediente NO incluye gráfica de curva de avance (verificado: no existe `curva`/`fisico_real` en `ConsultaExpediente.jsx`). Si el expediente debe ser el paquete "de inicio a fin", es ausencia notable.

---

### Área R3 — Carátula de estimación, documento de nota y evidencia fotográfica

#### Carátula de estimación (documento) — **HUECO**
1. **Ubicación:** `IntegracionEstimacion.jsx::TabCaratula` (:342-474), PASO 3 (`paso===2`). **No hay botón de exportar/imprimir** (grep de `window.print|jsPDF|exceljs` en el archivo = sin coincidencias).
2. **Tipo de salida:** **NINGUNA.** Solo HTML en pantalla (`tabla-caratula-preview`). No hereda ni el `@media print` global.
3. **Contenido:** Encabezado GACM (:368-379: Descripción obra/servicio, Contrato, Fecha del contrato, Contratista), tabla carátula (Importe bruto, −Amortización, −5 al millar, −Deductivas, −Retención por atraso, =Neto preview), tabla de acumulados (Contrato, Estimado acum. anterior, Esta estimación, Estimado acum., Saldo por estimar) y bloque de **Firmas** (Residente, Superintendente, Supervisión, Autorizó).
4. **Origen de datos:** Cálculo en vivo client-side (`caratula`/`acumulados` memos) de `avance` + `prep` + `selected`. El neto oficial lo materializa el backend al integrar.
5. **Estado real:** Funciona como **vista previa en pantalla**, pero **HUECO de exportación: no se puede sacar la carátula como documento.** Es el reporte más importante para el profe y no produce PDF.
6. **Diseño actual:** Buen formato GACM **en pantalla** (encabezado, tooltips de artículo, firmas, nota legal), pero nunca llega a un PDF. Falta membrete institucional + número de estimación en el documento.
7. **Para qué HU sirve:** HU-12 (y serviría a HU-13/HU-15).

#### Documento de nota de bitácora (DocumentoNota)
1. **Ubicación:** `DocumentoNota.jsx`, abierto desde IntegracionEstimacion (`verDocumentoNota` :788-791). Botón `btn-imprimir-nota` (:52).
2. **Tipo de salida:** **Impresión navegador** (`window.print()`) con `@media print` + `body.doc-nota-abierto` (`index.css:55-64`).
3. **Contenido:** Membrete SIGECOP + subtítulo legal; encabezado 2 columnas (Contrato / Nota `BIT-0000`, tipo, fecha, marca ANULADA); cuerpo (asunto+contenido); tabla de Firmantes (Nombre[emisor], Rol, Firma/Pendiente); pie de inmutabilidad.
4. **Origen de datos:** `api.notasDeContrato` (`bitacora_notas` + `bitacora_nota_firmas`; apertura toma `bitacora_firmantes`).
5. **Estado real:** **FUNCIONA.** Truco de visibility bien acotado por clase de body.
6. **Diseño actual:** **Tiene FORMATO real** (membrete guinda, encabezado, tabla de firmantes, pie legal) — el mejor terminado del área. Falta logo institucional; folio usa prefijo genérico `BIT-`.
7. **Para qué HU sirve:** HU-09/10 y soporte de HU-12.

#### Evidencia fotográfica de estimación (BYTEA)
1. **Ubicación:** `FotosEstimacion.jsx`, montado **SOLO** en `ConsultaExpediente.jsx:523` (HU-04), NO en HU-12/HU-15. Endpoints `estimacion-fotos.routes.js:31-34`.
2. **Tipo de salida:** Descarga binaria inline (`res.send`, `Content-Disposition: inline`). Front: `fetch`+`Authorization` → `URL.createObjectURL(blob)` → `<img>` 80×80. Subida: multer memory, 5 MB, JPEG/PNG; cliente redimensiona.
3. **Contenido:** Imágenes individuales. Metadatos: id, **contrato_concepto_id**, nombre, descripcion, mime, tamano, subido_por, created_at. Soporta foto **por generador/concepto** (`contrato_concepto_id` opcional, controller :73-79).
4. **Origen de datos:** `estimacion_fotos` (BYTEA), join con estimaciones/contratos para acceso.
5. **Estado real:** **FUNCIONA a nivel API** (listar/subir/descargar/eliminar, magic-bytes, participación). **HUECO de UX:** en HU-12 el wizard NO monta `FotosEstimacion` (solo un banner que remite al Expediente); no hay descarga consolidada ni fotos en ningún PDF. *(El follow-on (a) de esta sesión añade la foto por renglón del generador en la vista del documento.)*
6. **Diseño actual:** Grid de miniaturas sin branding; la descripción/concepto no se muestra; no hay layout tipo "lámina fotográfica" (concepto+fecha+descripción) del formato GACM.
7. **Para qué HU sirve:** HU-04 y soporte de HU-12 (art. 132 fr. IV RLOPSRM).

#### Carátula/contenido en Revisión (RevisionEstimacion) — **HUECO**
1. **Ubicación:** `RevisionEstimacion.jsx` (`ContenidoCaratula`/`Generadores`/`Notas` en pestañas). `api.detalleEstimacion`.
2. **Tipo de salida:** **NINGUNA** (sin print/jsPDF/Excel).
3-4. **Contenido/origen (pantalla):** Carátula (Subtotal, Amortización, 5 al millar, Deductivas, Neto), Generadores (Concepto, Unidad, Contratado, Este periodo, Acumulado, Importe, % avance), Notas, observaciones por sección. De `GET /api/estimaciones/:id` + `api.revisionEstimacion`.
5. **Estado real:** **HUECO: no implementado.** El revisor no puede exportar la estimación ni el **dictamen** (observaciones, motivo de autorización/rechazo). La sección de registro fotográfico está ocultada por "sin datos reales" (:74).
6. **Diseño actual:** En pantalla con formato (tablas, badges, semáforo), pero no produce documento.
7. **Para qué HU sirve:** HU-15.

---

### Área R4 — Documental binario (PDF de contrato, fianzas, minutas, oficio de convenio)

> **Resumen del área:** las **5 descargas binarias funcionan**, validan `%PDF`, acotan por participación y
> respetan inmutabilidad (PDF de contrato y oficio de convenio = append-only; póliza y minuta = reemplazables).
> Todas se sirven `Content-Disposition: inline` (abren en pestaña nueva con `window.open`). Son **documentos
> EXTERNOS** subidos por el usuario: el sistema solo los almacena y los sirve verbatim — **no hay diseño que
> rediseñar** (salvo que se quiera un visor con cabecera SIGECOP). Dos huecos reales: visitas sin adjunto y
> sin legajo binario consolidado.

| Documento | Subida | Descarga | Inmutabilidad | Endpoint |
|---|---|---|---|---|
| **PDF firmado del contrato** | `AltaContrato.jsx:851`/`:1822`; solo residente, magic `%PDF` | `AltaContrato.jsx:858-862` blob→`window.open`/`<a download>` | Append-only por tipo (409) | `contratos.controller.js:623/684/711` |
| **Autorización del anticipo (PDF)** | `AltaContrato.jsx:593`/`:1826` | `DocumentosDetalle` :939 | Append-only | mismos endpoints `?tipo=anticipo_autorizacion` |
| **PDF de póliza de fianza** | `RegistroFianzas.jsx:172`; dependencia/residente/creador | botón 👁 `:264`→`verPdf` :183 | **Reemplazable** (UPDATE) | `garantias.controller.js:172/192` |
| **PDF de minuta de junta** | `MinutasVisitas.jsx:223`; solo residente | "👁 ver" `:98`/`:241` | **Reemplazable** | `minutas.controller.js:100/116` |
| **Oficio de aprobación del convenio** | `ConveniosModificatorios.jsx:760`; dependencia/residente/creador | "📎 Ver oficio" `:748` | Append-only (un oficio/convenio) | `convenios.controller.js:426/457` |

Todos: backend `res.send(<BYTEA>)` con `Content-Type`/`Content-Length`/`Content-Disposition: inline`; tablas `contrato_documentos` (`tipo` contrato/anticipo_autorizacion/oficio_convenio), `contrato_garantias.pdf_*`, `minutas.pdf_*`. El oficio de convenio es **requisito server-side** (`autorizarConvenio` lo exige si variación >25%, art. 102; `crearConvenio` exige la referencia del oficio antes de capturar).

#### HUECO R4-a — Evidencia/acta de visita de obra
**No implementado.** Las MINUTAS tienen PDF, pero las **VISITAS** (`visitas`, sin columnas `pdf_*`/`foto_*`) no permiten adjuntar acta ni evidencia. HU-11 (visitas, art. 114/123 RLOPSRM) queda sin adjunto.

#### HUECO R4-b — Descarga consolidada del legajo binario
**No implementado.** No hay endpoint/botón que entregue todos los binarios de un contrato (PDF firmado + autorización + pólizas + minutas + oficios) en un paquete/ZIP/PDF combinado; cada documento se abre por separado. HU-04.

---

### Área R5 — Portafolio, tablero, curva, pagos, historial, finiquito

#### Curva S de avance (programado · ejecutado · financiero) — HU-05
1. **Ubicación:** Pestaña "Curva de avance". `CurvaAvance.jsx:537` (render `<CurvaSVG>`), componente :53-171. Alimentada por `leerProgramaObra` + `trabajosDeContrato` + `listarPagos`.
2. **Tipo de salida:** **NO exporta:** gráfico SVG inline en pantalla (a mano con `<path>/<circle>`, sin librería de charting).
3. **Contenido:** 3 series de % acumulado por periodo (Programado azul marino llega a 100%; Ejecutado y Financiero se cortan en "hoy"), eje X periodos, eje Y 0–100%, marcador "hoy", tooltip, leyenda + KPIs (Programado/Ejecutado/Financiero acum. + Desviación).
4. **Origen de datos:** Programado = `programa_obra.cantidad×pu`; Ejecutado = avances de `trabajos`; Financiero = `Σ pagos.importe (fecha ≤ corte) ÷ contrato.monto × 100`. Compuesto client-side.
5. **Estado real:** **FUNCIONA, pero se ve "en blanco/0" con datos incompletos — eso es lo que vio el profe.** Sin programa → placeholder "Aún no hay avance ejecutado…". Ejecutado `null` sin trabajos. Financiero vacío si `monto<=0` o sin pagos; `cutoff` solo incluye pagos con `fecha_pago ≤ hoy` → con fechas seed viejas salía plana en 0 (parchado P5, pero depende de fechas actuales). **No es bug de cálculo: es falta de datos seed con fechas vigentes** (de ahí `reseed_demo_fechas_actuales.sql`).
6. **Diseño actual:** Gráfico con ejes/gridlines/leyenda/tooltip/marcador "hoy"; sin branding porque **no está pensado para exportar**.
7. **Para qué HU sirve:** HU-05.

#### Matriz programa de obra (Gantt) y Catálogo con % avance — HU-05
`CurvaAvance.jsx:549-609` (Gantt) y `:480-514` (catálogo). **Funcionan**, tablas HTML en pantalla, **no exportan**.
**HUECO de exportación:** toda la pantalla Curva de Avance (curva + Gantt + catálogo + KPIs) **no tiene ningún botón de exportar a PDF/Excel/imagen**. Es la pantalla más "reporte visual" y solo vive en pantalla.

#### Portafolio ejecutivo (tabla + semáforos) — HU-18
1. **Ubicación:** `PortafolioEjecutivo.jsx` (`TablaContratos` :179-202, panel detalle :65-132). `GET /api/portafolio`.
2. **Tipo de salida:** **NO exporta.** Tabla + contadores + panel, todo en pantalla.
3. **Contenido:** Contadores (Total/Verde/Amarillo/Rojo); tabla (semáforo, Folio, Contratista, Avance físico %, variación, Pendientes, badge); panel detalle (KPIs físico/financiero/atrasos/penalizaciones, conceptos en atraso, pendientes). Agrupable por Contratista o Ejercicio.
4. **Origen de datos:** `portafolio.controller.js` server-side (contratos, generadores, programa, pagos, estimaciones, observaciones, avance).
5. **Estado real:** **FUNCIONA** (100% server-side). Declara que omite plazos vencidos en autorización/pago por falta de sellos de fecha.
6. **Diseño actual:** Tabla con semáforos/badges/tooltips; sin branding; **no produce documento**.
7. **Para qué HU sirve:** HU-18. **HUECO de exportación:** sin botón de exportar a PDF/Excel — candidato fuerte para "reporte con formato".

#### Tablero de estimaciones — HU-17
`TableroEstimaciones.jsx`, `GET /api/tablero/estimaciones`. KPIs + contadores por estado + tarjetas + "Mis pendientes". **FUNCIONA** (bloquea Finanzas con 403). **NO exporta. HUECO de exportación.**

#### Exportar historial de estimaciones (Excel) — HU-14
1. **Ubicación:** `HistorialEstimaciones.jsx:301-308` ("⬇ Exportar historial"), `handleExportar` :228 → `exportarHistorialExcel` :127.
2. **Tipo de salida:** **Excel .xlsx REAL** (exceljs `descargarExcelHoja`), nombre `historial_<folio>.xlsx`.
3. **Contenido:** `Estimación, Versión, Periodo, Estado, Importe, Fecha presentación, Fecha revisión, Fecha pago`. Exporta las filas filtradas.
4. **Origen de datos:** `estimaciones` + transiciones (`aVistaHistorial`).
5. **Estado real:** **FUNCIONA.** `Versión` siempre "—" (no versiona); `Fecha revisión`/`Fecha pago` vacías mientras no existan esas transiciones (honesto).
6. **Diseño actual:** **VOLCADO CRUDO** — sin encabezado/logo/título/formato de moneda-fecha/estilos/anchos. El importe va como **string** "$ ..." (no número con formato).
7. **Para qué HU sirve:** HU-14.

#### Observaciones de la versión rechazada — PDF y Excel — HU-16
1. **Ubicación:** `ReingresoEstimacion.jsx:336-343` (PDF, `exportarObservacionesPdf` :89) y `:344-351` (Excel, `exportarObservacionesExcel` :120). `api.revisionEstimacion`.
2. **Tipo de salida:** **PDF REAL** (jsPDF, `doc.save`) y **Excel REAL** (exceljs).
3. **Contenido:** PDF: título, Contrato, Estimación, fecha + por observación `#, Severidad, Sección, Tipo, Observación` (una línea concatenada). Excel: `#, Sección, Tipo, Severidad, Observación`.
4. **Origen de datos:** `revision.observaciones` (`estimacion_observaciones`).
5. **Estado real:** **FUNCIONAN** (botones deshabilitados sin observaciones).
6. **Diseño actual:** **CRUDO.** PDF **sin acentos** ("version", "Seccion"), sin logo/membrete, sin tabla con bordes (no autotable). Excel volcado crudo.
7. **Para qué HU sirve:** HU-16 (descarga de observaciones).

#### Documento de finiquito (impresión) — HU-24
1. **Ubicación:** `Finiquito.jsx:48` ("🖨 Imprimir / PDF") dentro del modal `DocumentoFiniquito` (:36-80), abierto con "📄 Ver documento de finiquito". `api.finiquitoPrep`/`api.cerrarFiniquito`.
2. **Tipo de salida:** **Impresión navegador** (`window.print()`) sobre modal con `data-print-area`/`doc-nota-abierto`. NO jsPDF.
3. **Contenido:** Documento art. 170 RLOPSRM: encabezado "FINIQUITO DE LOS TRABAJOS" + fundamento, Lugar/fecha, Contrato, Relación de créditos (Importe real ejecutado, Neto autorizado, −Pagado, −Anticipo no amortizado, −Ajustes, Saldo + a favor de), observaciones, cláusula de extinción (art. 172), dos firmas.
4. **Origen de datos:** `finiquito.controller.js` (contratos, estimaciones, pagos, finiquito). Saldo server-side.
5. **Estado real:** **FUNCIONA.**
6. **Diseño actual:** **SÍ tiene formato documental** (incisos romanos, fundamento, firmas) — el mejor diseñado del área. **Sin branding** (logo/membrete UAGRO, encabezado/pie de impresión).
7. **Para qué HU sirve:** HU-24 (documento imprimible art. 170).

#### Tabla de pagos del contrato — HU-21
1. **Ubicación:** `RegistroPago.jsx:93-138` (`tabla-pagos`); form `RegistroPagoForm.jsx`. `listarPagos`/`registrarPago`.
2. **Tipo de salida:** **NO exporta.** Tabla HTML; el form solo registra.
3. **Contenido:** `Estimación, Fecha pago, Importe, Referencia, CFDI, Registró, Plazo (art. 54)` con badge dentro/excedió 20 días.
4. **Origen de datos:** `pagos` (`pagos.controller.js`; importe server-side, días/plazo derivados en SQL).
5. **Estado real:** **FUNCIONA** (registro endurecido, no doble pago).
6. **Diseño actual:** Tabla con badges; sin branding.
7. **Para qué HU sirve:** HU-21. **HUECO de exportación:** no hay **comprobante/recibo de pago imprimible** ni exportación de la tabla de pagos.

---

## 5. Resumen de huecos (lo que debería exportar y no)

| Hueco | HU | Prioridad sugerida |
|---|---|---|
| **Carátula de estimación como documento GACM (PDF)** | HU-12 | 🔴 Alta (el profe lo pidió explícito) |
| Resumen de generadores como cuadro del documento | HU-12 | 🔴 Alta |
| Dictamen de revisión exportable (carátula + observaciones + motivo) | HU-15 | 🟡 Media |
| Exportar Curva de avance (PDF/imagen) + meterla al expediente | HU-05/04 | 🟡 Media |
| Exportar Portafolio ejecutivo (reporte ejecutivo con formato) | HU-18 | 🟡 Media |
| Exportar Tablero de estimaciones | HU-17 | 🟢 Baja |
| Comprobante/recibo de pago imprimible | HU-21 | 🟡 Media |
| Evidencia/acta de visita de obra (adjunto) | HU-11 | 🟢 Baja |
| Legajo binario consolidado del expediente | HU-04 | 🟢 Baja |
| **Branding + formato a los 9 reportes HU-19 + historial + reingreso** | HU-19/14/16 | 🔴 Alta (trabajo de mockups de Maiki) |

---

*Auditoría B — generada en sesión autónoma 2026-06-23. Solo lectura. No se modificó código.*
