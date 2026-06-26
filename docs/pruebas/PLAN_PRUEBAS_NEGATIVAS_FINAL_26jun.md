# PLAN DE PRUEBAS NEGATIVAS — SIGECOP · RECHAZOS A PROPÓSITO (FINAL 26-jun-2026)

> **Para imprimir y palomear casilla por casilla.** Mismo formato que el archivo oro
> `docs/pruebas/PLAN_PRUEBAS_FINAL_MATCH_18jun.md` (**Cuenta** · **Pantalla** · `testid → valor` · **🔴 Esperado**
> · **▢**). **🔴 = el sistema debe RECHAZAR/AVISAR** (son las pruebas que más valen). Refleja el sistema **TRAS las
> sesiones #1/#2**. Una HU por bloque; usa los contratos pre-llenados `PRUEBA-HU-XX` (`seed_demo_24.sql`).
> **Re-sembrar antes de probar** (los registros son append-only).

### ⭐ RECHAZOS NUEVOS de las sesiones #1/#2 (los que pidió Maiki — verificar SÍ o SÍ)
| ID | Dónde | Caso 🔴 | Esperado |
|---|---|---|---|
| **NEG-NEW-1** | Alta (HU-01) | Fecha de inicio **anterior a hoy** | **400** "La fecha de inicio no puede ser anterior a hoy" (front bloquea avanzar + back `crearContrato`) |
| **NEG-NEW-2** | Alta · catálogo (HU-01) | Concepto **sin unidad** (opción "Otro" con texto vacío) | Bloqueo al guardar/avanzar + back **400** ("concepto y unidad obligatorios") |
| **NEG-NEW-3** | Alta · programa / PUT programa (HU-01/05) | **Cantidad negativa** en la matriz | Rechazo: front no avanza + `guardarMatriz` lanza **400** ("la cantidad no puede ser negativa") |
| **NEG-NEW-4** | Estimación (HU-12) | Integrar con cantidad **> lo contratado/disponible** | **409** exceso (art. 118 RLOPSRM): "la cantidad acumulada excede lo contratado" |

> Cuentas y login: ver el plan positivo. `Sigecop2026!` común. 🔴 no debe crear/mutar nada.

---

## HU-23 · Padrón de empresas
### ▢ NEG-HU23-01 — Registrar empresa duplicada (forma fuerte) — `dependencia@` o registro
- **Pantalla:** Registro (`link-registro`) → empresa nueva con nombre casi-igual a una existente.

| Campo | Valor |
|---|---|
| Empresa nueva (`reg-empresa-nueva`) | `Constructora Demo S.A. de C.V.` *(vs «Constructora Demo» existente)* |

> 🔴 **Esperado:** NO crea un duplicado: toma la existente o avisa `reg-empresa-existente` (normalización fuerte:
> acentos/puntuación/sufijos de razón social, empresas.controller). No se fusiona automáticamente.

### ▢ NEG-HU23-02 — Cuenta contratista/supervisión SIN empresa
| Campo | Valor |
|---|---|
| Rol (`reg-rol`) | **contratista** · Empresa (`reg-empresa-select`) | *(vacío)* |

> 🔴 **Esperado:** bloqueo (empresa obligatoria para contratista/supervisión; `empresa.js`). No registra.

---

## HU-01 · Alta de contrato  ← incluye NEG-NEW-1/2/3
### ▢ NEG-HU01-01 ⭐ — Fecha de inicio PASADA (NEG-NEW-1) — `residente@`
- **Pantalla:** «Alta de contratos» (`/contratos/alta`), Paso 0.

| Campo (testid) | Valor |
|---|---|
| Fecha de inicio (`dg-fecha`) | `2020-01-01` *(pasado)* |

> 🔴 **Esperado:** el front **no deja avanzar** ("La fecha de inicio no puede ser anterior a hoy"); por API,
> `crearContrato` devuelve **400** (margen UTC-1día). Nivel 2 (apoyo art. 31 fr. V LOPSRM). *(El seed escribe fechas
> históricas por SQL directo — esa vía NO pasa por crearContrato y sigue válida.)*

### ▢ NEG-HU01-02 — Fecha de inicio incoherente (año fuera de 2000–2100)
| Campo | Valor |
|---|---|
| Fecha de inicio (`dg-fecha`) | `0202-05-10` / `9999-01-01` |

> 🔴 **Esperado:** **400** "La fecha de inicio no es coherente (revisa el día/mes/año)".

### ▢ NEG-HU01-03 ⭐ — Concepto SIN unidad (NEG-NEW-2)
- **Pantalla:** Alta, Paso 1 (catálogo).

| Campo (testid) | Valor |
|---|---|
| Unidad (`concepto-unidad-0`) | **"Otro"** → input de texto **vacío** |
| Clave/concepto/cant/pu | válidos |

> 🔴 **Esperado:** no deja avanzar (validarPaso exige `unidad` no vacía); por API `crearContrato` **400** ("concepto
> y unidad obligatorios"). art. 45 ap. A RLOPSRM (catálogo con unidades).

### ▢ NEG-HU01-04 ⭐ — Cantidad NEGATIVA en la matriz del programa (NEG-NEW-3)
- **Pantalla:** Alta, Paso 2 (programa) — o PUT `/contratos/:id/programa`.

| Campo (testid) | Valor |
|---|---|
| Celda (`celda-0-1`) | `-100` |

> 🔴 **Esperado:** el front rechaza al avanzar ("la cantidad no puede ser negativa"); `lib/programa.js
> guardarMatriz` **lanza error → 400** (antes la "saltaba"; ahora la rechaza, sesión #1). art. 45 ap. A fr. X RLOPSRM.

### ▢ NEG-HU01-05 — Clave de concepto duplicada o vacía
| Campo | Valor |
|---|---|
| `concepto-clave-1` | `C-01` *(igual a la fila 0)* / vacío |

> 🔴 **Esperado:** bloqueo "clave obligatoria y única (≤40)".

### ▢ NEG-HU01-06 — Programa descuadrado (Σ por concepto ≠ contratado)
> 🔴 **Esperado:** banner `programa-descuadre`; no avanza (regla del 100%, art. 45 ap. A fr. X RLOPSRM).

### ▢ NEG-HU01-07 — Fianza de ANTICIPO con vigencia anterior al inicio (Delta sesión #1)
| Campo | Valor |
|---|---|
| Vigencia de la fianza de anticipo | anterior a la fecha de inicio |

> 🔴 **Esperado:** rechazo "la fianza de anticipo debe cubrir el inicio" (art. 48 fr. I LOPSRM).

---

## HU-02 · Fianzas y garantías
### ▢ NEG-HU02-01 — Endoso con vigencia vencida / monto > contrato / tipo duplicado — `dependencia@` → PRUEBA-HU-02
> 🔴 **Esperado:** vigencia ≥ hoy (rechaza vencida); monto ≤ monto del contrato; un solo tipo por contrato
> (UNIQUE). art. 91 RLOPSRM. *(testids del modal de endoso: [verificar])*

---

## HU-22 · Sustitución de roster
### ▢ NEG-HU22-01 — Sustituir con firmas/notas PENDIENTES — `dependencia@`/`residente@` → PRUEBA-HU-09/22
> 🔴 **Esperado:** **409** "hay notas/firmas pendientes" (no se sustituye con pendientes; `roster.controller`).

### ▢ NEG-HU22-02 — Sustituir **superintendente** por persona de OTRA empresa
| Campo | Valor |
|---|---|
| Rol (`sust-rol`) | superintendente · Nueva persona | de **otra empresa** |

> 🔴 **Esperado:** **409** "el sustituto debe pertenecer a la MISMA empresa" (contratista/superintendente). art. 125
> RLOPSRM. **Contraste 🟢:** para **supervisión** SÍ se permite otra empresa (Delta 6) — ver plan positivo PASO 23.

### ▢ NEG-HU22-03 — Firmar una nota FUERA de la vigencia del roster (Delta P1-9c)
> 🔴 **Esperado:** **409** "fuera de tu periodo de vigencia" (saliente no firma tras su baja; entrante no antes de su
> alta). art. 125 RLOPSRM [validar].

---

## HU-08 · Apertura de bitácora
### ▢ NEG-HU08-01 — Abrir la bitácora DOS veces — `residente@` → PRUEBA-HU-09 (ya abierta)
> 🔴 **Esperado:** **409** "la bitácora ya está abierta" (append-only).

### ▢ NEG-HU08-02 — Firmar la apertura sin ser firmante / con otra cuenta
> 🔴 **Esperado:** **403** "no eres firmante de esta apertura".

---

## HU-09 · Emisión y firma de notas
### ▢ NEG-HU09-01 — Emitir/firmar nota en contrato CERRADO — `residente@` → PRUEBA-HU-24 (tras finiquito)
> 🔴 **Esperado:** **409** "contrato cerrado, solo lectura" (art. 64 LOPSRM).

### ▢ NEG-HU09-02 — Firmar nota con el PLAZO vencido
> 🔴 **Esperado:** **409** "el plazo de firma venció; aceptada tácitamente" (art. 123 fr. III RLOPSRM); el botón
> firmar se oculta cuando `aceptacion='aceptada_tacita'`.

### ▢ NEG-HU09-03 — El emisor intenta "firmar" su propia nota
> 🔴 **Esperado:** **409** "el emisor ya firmó al emitir; la firma aquí es de la contraparte".

---

## HU-06 · Registro de trabajos terminados  ← incluye exceso art.118
### ▢ NEG-HU06-01 ⭐ — Avance que EXCEDE lo contratado (art. 118) — `contratista@` → PRUEBA-HU-06
| Campo (testid) | Valor |
|---|---|
| Concepto (`select-concepto`) | C-01 (contratada 1000; ya 600) · Cantidad (`cantidad`) | `600` *(600+600=1200 > 1000)* |

> 🔴 **Esperado:** **409** "la cantidad acumulada excede lo contratado" (art. 118 RLOPSRM). Solo el art. 118 bloquea.

### ▢ NEG-HU06-02 — Avance de un periodo que AÚN NO empieza
> 🔴 **Esperado:** **aviso** (no bloqueo): adelantar a precios pactados no requiere convenio. (Delta: solo aviso.)

### ▢ NOTA (cambio de comportamiento, Delta 4) — Avance SIN foto
> Antes 🔴 (rechazaba). **AHORA 🟢:** registrar avance **sin foto SE ACEPTA** (foto opcional, art. 132 fr. IV
> discrecional). Verificar que **ya NO** aparezca el 400 "adjunta al menos una foto".

---

## HU-07 / HU-05 · Atrasos / curva (lectura — pocos rechazos)
### ▢ NEG-HU05-01 — Editar el programa de un contrato que NO es tuyo (no residente asignado)
> 🔴 **Esperado:** **403** "solo el residente asignado puede editar el programa".

---

## HU-12 · Integración de la estimación  ← incluye NEG-NEW-4
### ▢ NEG-HU12-01 ⭐ — Integrar con cantidad > lo contratado/disponible (NEG-NEW-4) — `contratista@` → PRUEBA-HU-12
| Campo (testid) | Valor |
|---|---|
| Generador CONC-01 (`gen-cantidad-${ccid}`) | `1500` *(contratado 1000)* |

> 🔴 **Esperado:** **409** "la cantidad acumulada excede lo contratado" (art. 118 RLOPSRM). No integra.

### ▢ NEG-HU12-02 — Integrar un periodo NO vencido (futuro)
> 🔴 **Esperado:** bloqueo: solo se estima un periodo **vencido** (`periodo_fin < hoy`, art. 54 LOPSRM). En PRUEBA-HU-12
> el único vencido es P1.

### ▢ NEG-HU12-03 — Integrar el MISMO periodo/concepto ya estimado (doble)
> 🔴 **Esperado:** disponible=0 → "excede planeado/contratado". (Es el síntoma del contrato "agotado"; re-sembrar para
> volver a demostrar.)

### ▢ NEG-HU12-04 — Integrar como contratista que NO es el superintendente asignado
> 🔴 **Esperado:** **403** "no eres el superintendente del contrato".

---

## HU-13 / HU-15 · Presentar / revisar
### ▢ NEG-HU13-01 — Presentar una estimación que NO está integrada
> 🔴 **Esperado:** bloqueo (solo se presenta una 'integrada').

### ▢ NEG-HU15-01 — AUTORIZAR sin ser residencia (supervisión intenta autorizar)
> 🔴 **Esperado:** **403**: la supervisión observa/turna, **no autoriza**; la residencia autoriza (art. 54 LOPSRM).

---

## HU-20 / HU-21 · Tránsito y pago
### ▢ NEG-HU21-01 — Pagar una estimación NO autorizada (integrada/enviada) — `finanzas@`
| Campo (testid) | Valor |
|---|---|
| Estimación (`pago-estimacion`) | una **'integrada'** o **'enviada'** |

> 🔴 **Esperado:** no aparece como pagable (`PAGABLES = {'autorizada'}`); no se puede pagar (art. 54 LOPSRM).

### ▢ NEG-HU21-02 — Pagar SIN CFDI del contratista
> 🔴 **Esperado:** **409** "falta el CFDI del cobro" (el contratista debe subirlo primero).

### ▢ NEG-HU21-03 — Pagar dos veces la misma estimación
> 🔴 **Esperado:** **409** "ya está pagada" (no doble pago).

### ▢ NEG-HU21-04 — Referencia SPEI no numérica / fecha de factura futura
> 🔴 **Esperado:** rechazo de validación del formulario (`pago-referencia` numérica).

### ▢ NEG-HU21-05 — Registrar el pago sin ser FINANZAS
> 🔴 **Esperado:** **403** (solo finanzas registra el pago).

---

## HU-03 · Convenios
### ▢ NEG-HU03-01 — Convenio sin oficio/justificación — `dependencia@` → PRUEBA-HU-03
> 🔴 **Esperado:** bloqueo (oficio obligatorio antes de registrar; art. 59 LOPSRM).

### ▢ NEG-HU03-02 — Autorizar el convenio sin ser dependencia
> 🔴 **Esperado:** **403** (la autorización del convenio es acto de la dependencia, separado del registro).

### ▢ NEG-HU03-03 — Convenio que modifica un periodo PASADO
> 🔴 **Esperado:** rechazo (no se modifica un periodo ya vencido/estimado). *[verificar regla exacta]*

---

## HU-24 · Finiquito
### ▢ NEG-HU24-01 — Finiquitar con estimaciones SIN pagar — `dependencia@`/`residente@` → PRUEBA-HU-20 (autorizada, no pagada)
> 🔴 **Esperado:** bloqueo (no se finiquita con saldos pendientes; art. 64 LOPSRM / 170 RLOPSRM).

### ▢ NEG-HU24-02 — Operar (nota/avance/estimación/convenio) un contrato YA finiquitado → PRUEBA-HU-24 (tras cierre)
> 🔴 **Esperado:** **409** "contrato cerrado, solo lectura" en todas las mutaciones (art. 64 LOPSRM).

---

## Resumen
- **~35 casos negativos** cubriendo las 24 HU (las de solo lectura — HU-10, 14, 17, 18, 19, 04 — tienen pocos o
  ninguno; sus rechazos son de acceso/rol, cubiertos por la guarda de ruta que redirige a Inicio).
- **Rechazos NUEVOS (Maiki) cubiertos:** NEG-NEW-1 fecha pasada (HU-01), NEG-NEW-2 sin unidad (HU-01), NEG-NEW-3
  negativos (HU-01), NEG-NEW-4 exceso art.118 al integrar (HU-12). Más el cambio de comportamiento **avance sin foto
  ahora ACEPTA** (HU-06).
- **[verificar]:** testids exactos de varias pantallas (endoso, avance, estimación wizard, convenio, finiquito) y la
  regla exacta de "convenio sobre periodo pasado" — confirmar contra el código al ejecutar.
