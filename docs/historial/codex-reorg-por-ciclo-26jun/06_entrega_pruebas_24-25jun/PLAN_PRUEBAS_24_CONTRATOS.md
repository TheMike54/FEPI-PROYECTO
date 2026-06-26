# PLAN DE PRUEBAS — 24 CONTRATOS `PRUEBA-HU-XX` · checklist imprimible · 21-jun

> Recorrer los 24 contratos de prueba **antes del 24-jun** y confirmar que cada uno está **correctamente
> posicionado** en el estado que demuestra su HU. Casilla por casilla. Base idéntica en los 24 (ver
> `CONTRATOS_PRUEBA_ESQUEMA.md`); aquí solo se verifica el **estado** de cada uno.
>
> **Cómo usar cada bloque:** (1) entra con el **rol**; (2) en el modal "Elige tu contrato" elige el **folio**
> (el `objeto` dice la HU); (3) ve a la **pantalla**; (4) marca lo que debes VER. El **chip de HU** de la barra
> confirma la pantalla (p. ej. "Avance · HU-05"). Contraseña de todas las cuentas: `Sigecop2026!`.
>
> **Base esperada en TODOS:** monto **$1,000,000.00** · 3 conceptos (CONC-01/02/03) · anticipo **30 %** ·
> neto por estimación **208,500.00** (subtotal 300k) o **278,000.00** (subtotal 400k).

---

### ☐ PRUEBA-HU-01 — Alta de contrato · rol **residente** · pantalla **Expediente / Alta**
- ☐ El contrato existe con monto **$1,000,000.00**, 3 conceptos, anticipo 30 %, plan de amortización (90/90/120k).
- ☐ **NO** tiene bitácora ni estimaciones (recién dado de alta). El expediente muestra catálogo/programa/garantías/jurídicos.

### ☐ PRUEBA-HU-02 — Fianzas y garantías · rol **dependencia** · pantalla **Fianzas / garantías**
- ☐ 3 pólizas: cumplimiento (100,000), anticipo (300,000), vicios ocultos (100,000), con su distintivo de vigencia.
- ☐ La de **cumplimiento tiene un ENDOSO** (prórroga de vigencia a 2028, art. 91 RLOPSRM).

### ☐ PRUEBA-HU-03 — Convenios modificatorios · rol **dependencia** · pantalla **Convenios**
- ☐ Hay **1 convenio de PLAZO** (90 → 120 días), con su nota automática en bitácora (tag convenio).
- ☐ El expediente refleja el convenio; el plazo del contrato muestra 120 días.

### ☐ PRUEBA-HU-04 — Expediente integral · rol **residente** · pantalla **Expediente**
- ☐ Los bloques poblados: configuración, catálogo, programa, fianzas, plan de amortización, jurídicos, roster.
- ☐ **Resumen de estimaciones** con 1 estimación **Pagada** (neto 208,500). Botón **Exportar PDF** (único).

### ☐ PRUEBA-HU-05 — Programa y curva de avance · rol **residente** · pantalla **Curva de avance**
- ☐ Curva S con 3 series; **avance al corriente** (ejecutado = programado), KPIs sin desviación negativa.
- ☐ Matriz concepto×periodo en verde (ejecutado), **sin rojo de atraso**.

### ☐ PRUEBA-HU-06 — Registro de trabajos por periodo · rol **contratista** · pantalla **Registrar avance**
- ☐ Matriz con **avance PARCIAL** de CONC-01 (600 de 1000 en P1). Acción **"Corregir"** disponible (append-only).
- ☐ Bitácora abierta (el avance se asienta sobre ella).

### ☐ PRUEBA-HU-07 — Atraso por concepto · rol **residente** · pantalla **Atrasos**
- ☐ Tabla con **CONC-01 en déficit**: programado 1000 − ejecutado 100 = **déficit 900** (unidades), periodo vigente.
- ☐ Banner/campana de atraso al entrar; botón **"Asentar en bitácora"** disponible (residente).

### ☐ PRUEBA-HU-08 — Apertura de bitácora · rol **residente** · pantalla **Bitácora (wizard)**
- ☐ El contrato **NO tiene bitácora**: el wizard está en el paso **Abrir**, con el botón **"Abrir bitácora"** habilitado.
- ☐ No se pueden emitir notas todavía (la apertura es el primer paso).

### ☐ PRUEBA-HU-09 — Emisión de notas · rol **residente** · pantalla **Bitácora → emitir**
- ☐ Bitácora **abierta y firmada** por las 3 partes (apertura completa). El botón **"Emitir nota"** está habilitado.
- ☐ El selector de tipos de nota (art. 125) corresponde al rol.

### ☐ PRUEBA-HU-10 — Consulta de notas · rol **residente** · pantalla **Consultar notas**
- ☐ Al menos **2 notas**: apertura (#1) + avance (#2, firmada). Filtros por tipo/fecha/firmante; **exportar** con ≥1 seleccionada.

### ☐ PRUEBA-HU-11 — Minutas, visitas y acuerdos · rol **residente** · pantalla **Minutas y visitas**
- ☐ **1 minuta** ("Reunión de avance (abril)") y **1 visita agendada** (cimentación). Pestaña **Acuerdos** deriva de la minuta.

### ☐ PRUEBA-HU-12 — Integrar estimación · rol **contratista** · pantalla **Integrar (wizard)**
- ☐ Periodo 1 con avance ejecutado y **SIN estimación previa** → el wizard permite integrar; carátula viva al capturar.
- ☐ Bitácora abierta (prerrequisito).

### ☐ PRUEBA-HU-13 — Presentar estimación · rol **contratista** · pantalla **Presentar**
- ☐ Hay **1 estimación en estado INTEGRADA** (neto 208,500); el botón **"Presentar"** está disponible.
- ☐ Tras presentar: acuse con fecha/hora; semáforo de revisión de 15 días.

### ☐ PRUEBA-HU-14 — Historial de estimaciones · rol **residente** · pantalla **Historial**
- ☐ **3 estimaciones** con estados distintos: **Pagada · Autorizada · Presentada**. Filtros por estado/periodo; exportar.

### ☐ PRUEBA-HU-15 — Revisión / autorización · rol **supervisión → residente** · pantalla **Revisión**
- ☐ Hay **1 estimación PRESENTADA (enviada)** esperando. Supervisión registra observación y **turna**; residencia **autoriza/rechaza**.
- ☐ Semáforo de 15 días (art. 54) visible.

### ☐ PRUEBA-HU-16 — Reingreso tras rechazo · rol **contratista** · pantalla **Reingreso**
- ☐ Hay **1 estimación RECHAZADA** con su **observación de rechazo** (generadores). Se puede descargar la observación y **reingresar** como nueva versión.

### ☐ PRUEBA-HU-17 — Tablero de estimaciones · rol **residente** · pantalla **Tablero**
- ☐ **2 estimaciones** (Pagada, Autorizada) en la línea de tiempo de 4 fases; KPIs de cartera (estimado/pagado/pendiente).

### ☐ PRUEBA-HU-18 — Portafolio ejecutivo · rol **dependencia** · pantalla **Portafolio**
- ☐ El contrato aparece con **semáforo VERDE** (al corriente); contadores de cartera. Doble clic → panel de detalle.

### ☐ PRUEBA-HU-19 — Exportación de reportes · rol **residente** · pantalla **Reportes**
- ☐ **Los 7 reportes** exportan (incluido el #4 Observaciones). El #5 Bitácora exige bitácora abierta (la hay).

### ☐ PRUEBA-HU-20 — Tránsito a pago · rol **contratista / finanzas** · pantalla **Tránsito y pago**
- ☐ Hay **1 estimación AUTORIZADA** (neto 208,500). Suficiencia presupuestal, checklist de soportes, botón **"Generar instrucción"**.

### ☐ PRUEBA-HU-21 — Registro del pago · rol **finanzas** · pantalla **Registro del pago**
- ☐ El selector ofrece **solo la estimación AUTORIZADA** (no integrada/presentada). Importe **read-only = neto 208,500**. Registrar → "Pagada".

### ☐ PRUEBA-HU-22 — Roster / sustitución · rol **dependencia / residente** · pantalla **Roster / sustitución**
- ☐ Roster vigente con **3 personas** (residente/superintendente/supervisión). Formulario de sustitución (rol + nueva persona + motivo).
- ☐ Aviso: **la dependencia no es sustituible**.

### ☐ PRUEBA-HU-23 — Padrón de empresas · rol **dependencia** · pantalla **Padrón de empresas**
- ☐ Las **9 empresas realistas** (3 dependencias / 3 contratistas / 3 supervisiones) con tipo y estado. Validar/fusionar.

### ☐ PRUEBA-HU-24 — Finiquito y cierre · rol **dependencia / residente** · pantalla **Cierre / finiquito**
- ☐ Las **3 estimaciones PAGADAS** (todo cobrado); el **saldo** calculado server-side. Botón de **finiquito** disponible (bitácora abierta).
- ☐ Documento de finiquito imprimible con el contenido mínimo (art. 170).

---

**Resultado:** ☐ 24/24 verificados · Fecha: ________ · Revisó: ________

> Si un contrato no se ve como aquí se describe: re-corre el seed (`CONTRATOS_PRUEBA_ESQUEMA.md` §4.1) — la base
> se ensucia con las corridas e2e; el `TRUNCATE` + re-seed deja los 24 limpios.
