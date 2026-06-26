# Mapa de la demo del profe — qué contrato abrir para cada HU

> Los 24 contratos demo tienen folios y objetos **realistas** (ya no "PRUEBA-HU-XX"). Internamente cada uno
> sigue demostrando UNA historia. Este mapa dice **cuál abrir** y **con qué cuenta** para lucir cada HU.
> Lo siembra `backend/scripts/seed_demo_profe.sql`. Contraseña de todas las cuentas: `Sigecop2026!`.
> Fechas **relativas a hoy**: programa de 3 periodos (P1 vencido · P2 en curso · P3 por venir) → la matriz
> muestra verde + ámbar + algún rojo, no todo rojo.

## Cuentas (renombradas a nombres realistas)
| Rol | Correo | Nombre que se ve |
|---|---|---|
| Residente | residente@sigecop.test | Ing. Roberto Salazar Gómez |
| Contratista / Superintendente | contratista@sigecop.test | Ing. Carlos Méndez Rivera |
| Supervisión | supervision@sigecop.test | Arq. Mónica Vázquez Lara |
| Dependencia | dependencia@sigecop.test | Lic. Diana Herrera Salgado |
| Finanzas | finanzas@sigecop.test | C.P. Fernando Ríos Aguilar |

## Mapa folio ↔ HU
| Folio | HU | Qué demuestra (estado sembrado) | Abrir como |
|---|---|---|---|
| OP-2026-0001 | HU-01 Alta | Contrato recién dado de alta (sin bitácora) | Residente |
| OP-2026-0002 | HU-02 Fianzas | Endoso + **garantías por vencer**: anticipo ~3 días (rojo), cumplimiento ~12 (ámbar), vicios ~25 (amarillo) | Dependencia / Residente |
| OP-2026-0003 | HU-03 Convenios | **Convenio de monto** ($1,000,000→$1,060,000) con **versiones del programa** (v1 sustituida, v2 vigente) | Dependencia |
| OP-2026-0004 | HU-04 Expediente | Bitácora + 1 estimación pagada (expediente con contenido) | Residente |
| OP-2026-0005 | HU-05 Curva/matriz | Avance al corriente (P1 ejecutado verde, P2 parcial, P3 por venir ámbar) + 1 pago (curva financiera) | Residente |
| OP-2026-0006 | HU-06 Trabajos | Programa con CONC-01 repartido 600/400 → permite el **aviso no bloqueante** al capturar de más | Contratista |
| OP-2026-0007 | HU-07 Atraso | Avance muy bajo en el periodo en curso → **déficit real** por concepto | Residente |
| OP-2026-0008 | HU-08 Apertura | **Sin bitácora** (para abrirla en vivo) | Residente |
| OP-2026-0009 | HU-09 Notas | Bitácora firmada + **notas variadas** (avance, aviso, calidad) | Residente / Contratista / Supervisión |
| OP-2026-0010 | HU-10 Consulta notas | Bitácora + notas → el **buscador devuelve resultados** | Residente |
| OP-2026-0011 | HU-11 Minutas/visitas | 1 minuta + 1 visita **programada a futuro** (estado coherente) | Residente |
| OP-2026-0012 | HU-12 Integrar | Avance del periodo 1, sin estimación (listo para integrar) | Contratista |
| OP-2026-0013 | HU-13 Presentar | Estimación #1 **integrada** (lista para presentar) | Contratista |
| OP-2026-0014 | HU-14 Historial | #1 pagada, #2 autorizada, #3 presentada (varios estados) | Residente |
| OP-2026-0015 | HU-15 Revisión | Estimación #1 **presentada** (semáforo de revisión en **verde**, no vencido) | Supervisión / Residente |
| OP-2026-0016 | HU-16 Reingreso | Estimación #1 **rechazada** (lista para reingreso) | Contratista |
| OP-2026-0017 | HU-17 Tablero | #1 pagada, #2 autorizada (cartera) | Residente |
| OP-2026-0018 | HU-18 Portafolio | Avance al corriente (semáforo verde) | Dependencia |
| OP-2026-0019 | HU-19 Reportes | Bitácora + estimación pagada (datos para los 7 reportes) | Residente |
| OP-2026-0020 | HU-20 Tránsito a pago | Estimación **autorizada** + **techo presupuestal 2026** cargado → el wizard NO se atora | Contratista / Finanzas |
| OP-2026-0021 | HU-21 Registro de pago | Estimación **autorizada** (lista para registrar el pago) | Finanzas |
| OP-2026-0022 | HU-22 Roster | Roster cargado + **apertura sin firmar** (también aparece en "Por firmar") | Dependencia / Residente |
| OP-2026-0023 | HU-23 Padrón | Catálogo de empresas. En el **padrón → pestaña "Por validar"** hay 2 empresas: **"Constructora del Bajio SA de CV"** marcada como **posible duplicado** de "Constructora del Bajío, S.A. de C.V." → botón **Fusionar**; y **"Edificadora Acapulco, S.A. de C.V."** nueva → botón **Validar (inscribir)**. (Además, apertura sin firmar → 2.º caso de "Por firmar".) | Dependencia |
| OP-2026-0024 | HU-24 Finiquito | 3 estimaciones pagadas + **finiquito asentado → contrato CERRADO** (se ve el cierre sin cerrarlo en vivo) | Dependencia / Residente |

## Demos transversales (no por contrato)
- **"Por firmar":** entra como **Residente**, **Contratista** o **Supervisión** → hay firmas pendientes de OP-2026-0022 y OP-2026-0023.
- **Garantías (semáforo de color):** abre las fianzas de **OP-2026-0002** → rojo/ámbar/amarillo/verde a la vez.
- **Curva financiera con datos:** **OP-2026-0024** (todo pagado, ~financiero alto) o **OP-2026-0005**.
- **Padrón validar/fusionar (HU-23):** entra como **Dependencia** → Padrón de empresas → pestaña **"Por validar"**: hay 1 empresa duplicada (**Fusionar** con "Constructora del Bajío") y 1 nueva (**Validar**).
