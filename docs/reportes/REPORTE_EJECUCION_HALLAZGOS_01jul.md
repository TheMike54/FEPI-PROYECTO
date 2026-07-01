# Reporte de ejecución — Plan de hallazgos 01-jul (8 bloques)

**Plan base:** `docs/planes/PLAN_HALLAZGOS_01jul_1538.md` (commit `9d6ee6a`).
**Método:** un commit por bloque, en orden de menor a mayor riesgo; `node -c` (backend) + `vite build`
(frontend) verdes + smoke en vivo (docker compose) por bloque. **LOCAL, sin push.** Zona congelada intacta
(schema.sql / permisos.js / auth / server.js no tocados).

**Decisiones de Maiki aplicadas:** D1 (dependencia registra Y autoriza convenios), D2 (roster avisa, no
bloquea), D3 (sin claves nuevas), D4 (plazo añade periodos al final), D5 (soportes por generador en el wizard).

**Conservado intacto (verificado):** fix art. 125 / PRUEBA-TR-FIRMA-VIGENCIA · las 5 oleadas (#2 fecha_nota,
#11 sin claves nuevas, #14 bloqueo avance>programa, #24 cantidad=avance) · el selector de fecha (elegibilidad
vs sello: la fecha simulada NUNCA se persiste; los sellos son fecha real del servidor).

---

## B1 — Convenios: la dependencia puede autorizar su propio convenio (D1) · commit `832d9bb`
- **Qué:** se relajó el fix #13 en `autorizarConvenio` (ya no bloquea cuando `autorizado_por === registrado_por`);
  se conserva el gate de rol (solo 'dependencia' autoriza). Pop-up de confirmación M1 en `ConveniosModificatorios`.
- **Base:** art. 59 §3 LOPSRM; decisión D1 (la dependencia registra y autoriza).
- **Smoke:** la dependencia que registró el convenio ahora lo autoriza (antes 403/409).
- **Interacción:** relaja #13 (Oleada 3) por decisión explícita; el resto de #13 (separación registrar≠autorizar
  para otros roles) se mantiene.

## B2 — Roster: sustitución avisa en vez de bloquear (D2) · commit `054e675`
- **Qué:** `roster.controller::sustituir` ya no devuelve 409 por notas pendientes del saliente; devuelve
  `aviso_pendientes {n, notas, mensaje}` (acotado a ESE contrato) y procede. `RosterContrato` muestra el aviso.
- **Base:** art. 123 fr. III RLOPSRM (las notas del saliente se vuelven tácitas al vencer); decisión D2.
- **Smoke:** sustitución con notas pendientes → 201 + aviso (antes 409).
- **Interacción:** NO toca el fix art. 125 ni `bitacora.controller`.

## B3 — Observaciones de la estimación también las hace el residente (H8) · commit `1bc91f2`
- **Qué:** `estimaciones-ciclo.controller::crearObservacion/eliminarObservacion` ahora permiten SUPERVISIÓN O
  RESIDENCIA; el gate de turnado solo cierra a la supervisión. `RevisionEstimacion`: `puedeRegistrar` habilita
  a la residencia; el TURNAR sigue siendo exclusivo de la supervisión.
- **Base:** audio New Recording 78 ("supervisión y residente hacen las observaciones").
- **Smoke:** residente crea observación en estimación 'enviada' (2832) → **201** (antes 403); elimina → 200.
- **Interacción:** DELETE sigue acotado a `autor_id`; máquina de estados turnar/autorizar intacta.

## B4 — "Disp. este periodo" vs "Por ejecutar" sin ambigüedad (H9) · commit `46596b2`
- **Qué:** solo presentación (mismo cálculo). Encabezado "Disp. periodo" → "Disp. este periodo" con tooltip que
  lo distingue de "Por ejecutar"; la celda "Por ejecutar" muestra "✓ completo" cuando acumulado ≥ contratado
  (el 0 se lee como concepto terminado, no error); leyenda bajo la tabla.
- **Base:** audio New Recording 78 (el profe leyó "por ejecutar = 0" como error; él mismo se corrige: "me metí
  a la estimación que él ya hizo"). Formato imagen "Estimación de servicios ejecutados".
- **Smoke:** `vite build` verde; sin cambio de cálculo (`Por ejecutar = contratado − total estimado`).
- **Interacción:** ninguna con backend; no toca #14/#24.

## B5 — Firmas del CICLO en el documento + verificación carátula IVA (M4/H7, H6) · commit `8ab5880`
- **Qué:** `DocumentoCaratula` reemplaza las firmas estáticas por las **firmas del ciclo** (FORMULÓ→REVISÓ→
  AUTORIZÓ→Vo.Bo.) que se llenan conforme avanza la estimación, con la **fecha REAL** de cada acto
  (enviada_en / observación turnada / transición 'autorizada'); si un acto ocurrió sin sello de fecha, muestra
  "✓ firmada" SIN fecha (no se inventa). Botón "Ver documento" en `RevisionEstimacion`. H6: la carátula ya
  empataba 1:1 con la imagen (Secciones 1-2 sin IVA, Sección 3 con IVA estimación + IVA amortización + 5 al
  millar + retención por atraso → neto con IVA), no requirió cambios.
- **Base:** audio New Recording 78 ("la presento aparece mi firma, la supervisión la revisa aparece su firma…");
  art. 54 LOPSRM; imagen de la carátula.
- **Smoke:** /revision 'enviada' (2832) → FORMULÓ 01/07 17:22, REVISÓ/AUTORIZÓ pendientes; 'pagada' (2831) →
  FORMULÓ 03/06 16:00 + AUTORIZÓ firmada sin fecha inventada. Playwright: documento render OK.
- **Interacción:** las fechas mostradas son sellos reales (regla del selector); no persiste nada.

## B6 — HOJA GENERADORA + RESUMEN POR PARTIDA imprimibles (M3/H4, H5) · commit `2327336`
- **Qué:** dos documentos nuevos que se imprimen junto con la carátula. `DocumentoResumenPartida` agrupa por
  partida (prefijo de clave, AD.01.B→AD.01; sin esquema nuevo) + bloque financiero del neto + **dos importes
  con letra** + 4 firmas. `DocumentoHojaGeneradora`: una hoja por concepto con cantidad en el periodo (3
  columnas catálogo|ejecutado|foto + "Hoja N de M" + Total esta hoja/Acumulado hoja anterior + 3 firmas).
  Util nuevo `numeroALetras` (apócope correcta). `DocumentoCaratula` autocompleta las claves desde
  estimacion-prep cuando no se las pasan (para agrupar por partida desde Revisión).
- **Base:** imágenes 3.41.19 PM (hoja generadora) y 3.41.18 PM (2) (resumen por partida); art. 132 RLOPSRM.
- **Smoke:** `numeroALetras` verificado vs la imagen (2,467,304.16 y 2,671,142.96 dan la letra EXACTA).
  Playwright (estimación 2834): resumen subtotal $300,000.00 / total con IVA $242,100.00 / letras correctas;
  1 hoja generadora. Cuadre: Σ partidas == subtotal.
- **Interacción:** no recalcula obra (deriva de los montos congelados con la misma aritmética de la carátula,
  cuadre al centavo); `estimaciones.controller` frozen intacto.

## B7 — Captura de estimación POR GENERADOR en el wizard (M2/H3, D5) · commit `eb3d958`
- **Qué:** el paso "Soportes y notas" pasa de lista plana a **acordeón por generador**: cada concepto con
  cantidad en el periodo se expande y adjunta su foto de actividad + soportes documentales (se suben al integrar
  con su `contrato_concepto_id`) y referencia su reporte fotográfico del avance + nota de entrega. Fila
  "Generales" para adjuntos sin concepto. `soportesStaged` pasa a `[{file, contrato_concepto_id, tipo}]`.
- **Base:** audio + D5; reusa endpoints de oleada 1 (estimacion-fotos / estimacion-soportes por concepto).
- **Smoke:** subir foto + soporte con `contrato_concepto_id=7558` a estimación 2848 → **201** ambos; persistidos
  con el concepto (estimacion_fotos, estimacion_soportes_concepto). Limpieza: residuo 0.
- **Interacción:** sin cambios de backend (los 3 endpoints ya aceptaban el concepto); #24 (cantidad solo-lectura
  del avance, paso 2) intacto.

## B8 — Convenios por tipo: programa/monto + plazo añade periodos (H10/D3/D4) · commit `afb3fd9`
- **Qué (backend, no congelado):**
  - **Brecha 3:** un convenio de **PROGRAMA** ahora RECHAZA (400) cambios de cantidad (solo reacomoda periodos);
    **MONTO/MIXTO** sí ajustan cantidades. **D3:** se conserva #11 (sin claves nuevas).
  - **D4:** un convenio de **PLAZO/MIXTO** que amplía el plazo **AÑADE periodos al final** (`extenderPeriodosPorPlazo`,
    APPEND-ONLY): nunca modifica ni borra periodos existentes (los que tienen avance/estimación quedan intactos),
    infiere la cadencia del mosaico vigente y agrega hasta el nuevo término. Devuelve `periodos_anadidos`.
- **Qué (frontend):** ayuda de semántica por tipo bajo el selector; **Brecha 4:** razón visible de por qué el
  botón "Promover" está deshabilitado (motivo/oficio/plazo/cuadre) + el botón exige motivo+oficio; toast informa
  "+N periodos".
- **Base:** audios 79/80; art. 59 LOPSRM; decisiones D3/D4.
- **BUG hallado y corregido en pruebas:** `contrato.fecha_inicio` es objeto Date de pg; `String(Date)` no es
  ISO → el término salía basura y la comparación de strings ("2026‑.." <= "NaN..") era siempre true → generaba
  periodos hasta el tope (1000). **Fix:** `fecha_inicio::text` desde SQL + guarda dura que exige ISO válido.
- **Smoke (contrato sembrado 7072, plazo 90→150, dependencia@):**
  - D4: `periodos_anadidos=2`; periodos 1‑3 IGUALES + 4(06) y 5(07 recortado); **estimaciones=3 y avances=3
    INTACTOS**; estimacion-prep (periodo nuevo y viejo), detalle y historial → **200**. Contrato revertido,
    residuo 0.
  - Brecha 3: convenio 'programa' que cambia CONC-01 1000→1100 → **400** (rollback, sin mutar).
- **Interacción (verificada):** append-only no rompe #14/#24 (periodos con avance/estimación no se tocan); #11
  (D3) se conserva; la reducción por debajo de lo estimado sigue bloqueada.

> **Nota D4 / seguridad:** el append de periodos se probó en un contrato sembrado con avance+estimación y se
> confirmó que NO los rompe (todo INTACTO tras el convenio). No fue necesario detenerse (regla 🛑 de D4). El
> único incidente fue el bug de formato de fecha, hallado y corregido ANTES de dejarlo; el contrato de prueba
> quedó revertido y el sistema sin residuo.

---

## Estado final
- 8/8 bloques hechos, **nada pendiente**. `node -c` + `vite build` verdes (por bloque y global).
- Un commit por bloque, en `main`, **sin push**. Working tree limpio (solo untracked pre-existentes).
- Zona congelada intacta. Todos los fixes previos (art. 125, 5 oleadas, selector) conservados y verificados.
