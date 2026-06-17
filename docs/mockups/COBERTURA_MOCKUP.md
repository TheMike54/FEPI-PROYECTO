# Cobertura del mockup — "esto tiene el sistema · esto está en el mockup"

> Cruce entre **todas las pantallas reales** (`frontend/src/pages/*.jsx`, inventariadas con sus pestañas/
> sub-secciones/campos) y el mockup `sigecop-modo-sistema.html`. Objetivo: confirmar que **no se escapó
> ninguna pantalla**. Solo maqueta visual; nada conectado.

## Resumen
- **29 pantallas funcionales** del sistema → **27 representadas en el mockup** (las 2 restantes son la misma
  función ya cubierta: ver notas).
- **8 "ambientes"** (capa de navegación que se construyó como cascarones) → **representados por el propio
  patrón del mockup** (sidebar por flujos + barras de pasos encadenados). No son pantallas de contenido.

## Tabla de cobertura

| # | Pantalla real (.jsx) | HU | ¿En el mockup? | Pantalla del mockup / nota |
|---|---|---|---|---|
| 1 | `Inicio.jsx` | — | ✅ | **Inicio** (cuadrícula de módulos por rol + banner de atraso) |
| 2 | `SeleccionRol.jsx` (login + registro) | HU-00 | ✅ | **Login / Registro** (pestañas Iniciar sesión / Crear cuenta, con selector de empresa) |
| 3 | `SolicitudRegistro.jsx` | — | ✅ | Cubierto por la pestaña **Crear cuenta** de Login/Registro (misma función) |
| 4 | `SolicitudesRegistro.jsx` | — | ✅ | **Solicitudes de registro** (la Dependencia aprueba/rechaza, asigna rol) |
| 5 | `AltaContrato.jsx` (wizard 7 pasos) | HU-01 | ✅ | **Alta de contrato** — los 7 pasos clicables: Datos generales · Catálogo · **Programa (matriz)** · **Jurídicos** · **Garantías** · **Plan de amortización** · **PDF firmado** |
| 6 | `RegistroFianzas.jsx` | HU-02 | ✅ | Integrado en **Alta › Garantías** (tipos, afianzadora, póliza, monto, vigencia) + endosos descritos. *(Pantalla dedicada de fianzas: misma función; se puede separar si se quiere.)* |
| 7 | `IntegracionEstimacion.jsx` | HU-12 | ✅ | **Ciclo de estimación** (sub-tabs: Apertura del periodo · Generadores · Carátula viva · Notas vinculadas · Historial) |
| 8 | `EnvioEstimacion.jsx` | HU-13 | ✅ | **Presentar** (tabla de estimaciones por presentar + plazo) |
| 9 | `RevisionEstimacion.jsx` | HU-15 | ✅ | **Revisión / autorización** (flujo supervisión→residencia→resolución, sub-tabs carátula/generadores/notas, observaciones, panel de resolución) |
| 10 | `ReingresoEstimacion.jsx` | HU-16 | ✅ | **Reingreso** (observaciones de la rechazada, nueva versión, trazabilidad) |
| 11 | `HistorialEstimaciones.jsx` | HU-14 | ✅ | **Historial** (filtros + tabla + drawer descrito) |
| 12 | `TableroEstimaciones.jsx` | HU-17 | ✅ | **Tablero** (KPIs de cartera, contadores por estado, stepper) |
| 13 | `AperturaBitacora.jsx` | HU-08 | ✅ | **Bitácora › Apertura** (datos mínimos art. 123 fr. III, evento inalterable) |
| 14 | `PorFirmar.jsx` | HU-08 | ✅ | **Bitácora › Por firmar** (+ dropdown "Por firmar" en la barra superior) |
| 15 | `EmisionNotas.jsx` | HU-09 | ✅ | **Bitácora › Emitir notas** (libro + formulario + candado de emisión) |
| 16 | `ConsultaNotas.jsx` | HU-10 | ✅ | **Bitácora › Consultar** (filtros AND + tabla + exportar) |
| 17 | `MinutasVisitas.jsx` | HU-11 | ✅ | **Bitácora › Minutas** (3 pestañas: Minutas / Agenda de visitas / Acuerdos) |
| 18 | `TrabajosTerminados.jsx` | HU-06 | ✅ | **Avance › Trabajos terminados** (por periodo, vínculo a nota, acumulado) |
| 19 | `CurvaAvance.jsx` | HU-05 | ✅ | **Avance › Curva** (KPIs + curva S + matriz Gantt) |
| 20 | `AlertasAtraso.jsx` | HU-07 | ✅ | **Avance › Alertas** (déficit por concepto en unidades) |
| 21 | `TransitoPago.jsx` | HU-20 | ✅ | **Pago › Tránsito** (suficiencia art. 24 + soportes + semáforo) |
| 22 | `RegistroPago.jsx` | HU-21 | ✅ | **Pago › Registro del pago** (importe = neto, gate art. 54, tabla de pagos) |
| 23 | `ConveniosModificatorios.jsx` | HU-03 | ✅ | **Convenios** (formulario + avisos SFP/59 Bis + historial inmutable + versiones del programa) |
| 24 | `Finiquito.jsx` | HU-24 | ✅ | **Cierre / finiquito** (desglose del saldo art. 64/170 + cerrar + documento) |
| 25 | `ConsultaExpediente.jsx` | HU-04 | ✅ | **Expediente** (los 9 bloques: configuración, catálogo, programa, fianzas, plan, jurídicos, roster, convenios, estimaciones) |
| 26 | `PortafolioEjecutivo.jsx` | HU-18 | ✅ | **Portafolio** (semáforos, contadores, agrupar por, detalle) |
| 27 | `ExportacionReportes.jsx` | HU-19 | ✅ | **Reportes** (los 7 reportes R1–R7 con PDF/Excel) |
| 28 | `RosterContrato.jsx` | HU-22 | ✅ | **Roster** (vigente + histórico + sustitución) |
| 29 | (catálogo de empresas — hoy sin pantalla) | — | ✅ | **Empresas** — *pantalla NUEVA propuesta* (padrón con validación; ver `ANALISIS_EMPRESAS_quien_administra.md`) |

### Ambientes (capa de navegación, ya representada por el patrón del mockup)
`AmbienteEstimacion`, `AmbienteBitacora`, `AmbienteExpediente`, `AmbientePago`, `AmbienteFiniquito`,
`AmbienteConvenio`, `AmbienteAvance`, `CicloVidaContrato` → **son cascarones de navegación**; el mockup
**ES** esa capa (sidebar por flujos + barras de pasos encadenados que enlazan las pantallas reales). No
necesitan una "pantalla" propia en el mockup; su diseño *es* la propuesta de navegación.

## Notas de fidelidad
- Las **2 pantallas no listadas como screen propio** (`SolicitudRegistro` y `RegistroFianzas`) son la **misma
  función** que ya está en el mockup (Crear cuenta / Garantías del alta). Si quieres que tengan su propia
  pantalla dedicada, se agregan en 5 min.
- Cada pantalla del mockup usa los **labels/columnas/pasos reales** del inventario (no inventados).
- Elementos transversales presentes en todas: **sidebar por flujos**, **barra de pasos encadenados**,
  **indicador discreto de HU** (abajo-derecha), **chip de empresa**, **campana** y **"Por firmar"** con
  pop-up.
- La pantalla de **Empresas** está marcada **"PROPUESTA — sujeta a confirmación de Maiki"**.
