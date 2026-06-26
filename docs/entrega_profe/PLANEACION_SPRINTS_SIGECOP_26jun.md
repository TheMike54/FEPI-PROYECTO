# Planeación ágil — catálogo de historias, sprints y velocidad — SIGECOP

**Proyecto:** SIGECOP — Gestión de Contratos de Obra Pública
**Periodo:** 12 de mayo – 26 de junio de 2026
**Marco:** iterativo por sprints, estimación por puntos (escala Fibonacci, como se acordó en la revisión del 12-may)

> **Nota de método.** Reconstruimos esta planeación a partir del historial real del proyecto. Los **puntos** reflejan
> la complejidad relativa de cada historia (Fibonacci: 1, 2, 3, 5, 8, 13); los valores finos quedan **[confirmar
> Maiki]**. Distinguimos **dos fases** porque el orden fue distinto: primero **maquetas** (vistas con datos de
> ejemplo) y luego la **implementación real** (cableado a backend con las reglas legales).

---

## 1. Catálogo de las 24 historias de usuario

| HU | Historia | Módulo / servicio de origen | Prioridad | Complejidad | Puntos |
|---|---|---|---|---|---|
| — | Acceso: inicio de sesión, sesión única, registro de personas | Acceso y seguridad | Alta | Alta | 8 |
| HU-23 | Padrón de empresas | Acceso y padrón | Alta | Media | 5 |
| HU-01 | Alta de contrato de obra pública | Contratación | Alta | Muy alta | 13 |
| HU-02 | Registro de fianzas y garantías | Contratación | Media | Media | 5 |
| HU-22 | Sustitución de personas del equipo | Contratación / roster | Media | Alta | 8 |
| HU-08 | Apertura de la bitácora (+ "Por firmar") | Bitácora | Alta | Media | 5 |
| HU-09 | Emisión y firma de notas | Bitácora | Alta | Alta | 8 |
| HU-10 | Consulta y búsqueda de notas | Bitácora | Baja | Baja | 3 |
| HU-11 | Minutas, visitas y acuerdos | Bitácora | Baja | Baja | 3 |
| HU-06 | Registro de trabajos terminados (avance) | Avance físico | Media | Alta | 8 |
| HU-07 | Alertas de atraso por concepto | Avance físico | Media | Baja-media | 3 |
| HU-05 | Programa y curva de avance | Avance físico | Media | Alta | 8 |
| HU-12 | Integración de la estimación | Estimación | Alta | Muy alta | 13 |
| HU-13 | Presentación de la estimación | Estimación | Alta | Baja-media | 3 |
| HU-15 | Revisión y autorización/rechazo | Estimación | Alta | Alta | 8 |
| HU-14 | Historial de estimaciones | Estimación | Baja | Baja | 2 |
| HU-17 | Tablero de estimaciones | Estimación | Media | Media | 5 |
| HU-20 | Tránsito a pago (promoción de cobro) | Cobro / pago | Alta | Alta | 8 |
| HU-21 | Registro del pago | Cobro / pago | Alta | Media | 5 |
| HU-03 | Trámite de convenios modificatorios | Modificatorios | Alta | Muy alta | 13 |
| HU-04 | Consulta integrada del expediente | Expediente | Media | Media | 5 |
| HU-18 | Portafolio ejecutivo con semáforos | Expediente / dirección | Media | Media | 5 |
| HU-19 | Exportación de reportes | Reportes | Media | Alta | 8 |
| HU-24 | Finiquito y cierre del contrato | Cierre | Alta | Alta | 8 |
| (HU-16) | Reingreso de estimación rechazada | Estimación | — | — | (retirada) |

**Total estimado:** ≈ **145 puntos** (24 historias + acceso). HU-16 se **retiró** como historia independiente: un
rechazo se resuelve volviendo a integrar (HU-12) y presentar (HU-13).

> Observación de priorización (la pidió el profe el 18-may): las historias **más complejas** (HU-01 alta, HU-12
> estimación, HU-03 convenios) se ubicaron en sprints tempranos de la implementación real; el **cierre** (HU-24
> finiquito) y el **flujo de pago pulido** (HU-20/21) quedaron al final —en parte porque el finiquito **no existía**
> hasta que el profe lo pidió el 16-jun—. Lo reflejamos con honestidad en §3.

---

## 2. Fase A — Sprints de maqueta (vistas con datos de ejemplo) · 19–24 may

Vistas en React por historia, sin backend real, para validar el flujo y la navegación con el profe.

| Sprint | Fecha | Historias maquetadas | Puntos |
|---|---|---|---|
| Sprint 0 | 19-may | Andamiaje del proyecto (entorno, contenedores) | — |
| Sprint 1 | 23-may | Acceso, HU-01, HU-02, HU-08, HU-09 | 39 |
| Sprint 2–3 | 23-may | HU-21, HU-10, HU-12 | 21 |
| Sprint 4–5 | 23-may | HU-04, HU-15, HU-14, HU-20 | 23 |
| Sprint 6 | 24-may | HU-03, HU-07 | 16 |
| Sprint 7 | 24-may | HU-05, HU-06, HU-11 | 19 |
| Sprint 8 | 24-may | HU-13, HU-17 (+ reingreso) | 10 |
| Sprint 9 | 24-may | HU-18, HU-19 | 13 |

> En la maqueta, el pago (HU-21) salió **temprano** (Sprint 2–3), pero eran cascarones; no representa el orden de la
> implementación real. Esta fase no sirve para medir velocidad (throughput artificial por ser vistas sin lógica).

---

## 3. Fase B — Sprints de implementación real (cableado a backend) · 26 may – 26 jun

Aquí cada historia se conectó al backend con sus reglas legales y su cuadre. Agrupamos por semana.

| Sprint | Semana | Historias implementadas de verdad | Puntos | Nota |
|---|---|---|---|---|
| S-Real 1 | 26 may – 01 jun | Acceso (login real, sesión), **HU-01** (alta end-to-end), **HU-08**, **HU-09**, **HU-10**, **HU-12** (carátula server-side) | 47 | Núcleo financiero primero (lo más complejo). |
| S-Real 2 | 02 – 08 jun | **HU-02**, **HU-03** (convenios), **HU-22** (sustitución), **HU-07**, **HU-04**, **HU-13**, **HU-06** | 50 | Fundación de dominio + ciclo de estimación blindado. |
| S-Real 3 | 09 – 15 jun | **HU-05** (curva), **HU-17** (tablero), **HU-15** (revisión), **HU-19** (reportes), **HU-23** (padrón empresas) | 34 | Oleadas de corrección post-revisión del 09-jun. |
| S-Real 4 | 16 – 22 jun | **HU-24 finiquito** (creado tras la revisión del 16-jun), **HU-18** (portafolio), **HU-20** (tránsito a pago), rediseño por ciclos | 21 | El **cierre** entra al final, por petición del profe. |
| S-Real 5 | 23 – 26 jun | **HU-21** (flujo de pago real y pulido), carátula GACM completa, curva versionada, datos de prueba | 5 + afinación | El **pago pulido** fue lo último. |

**Velocidad (Fase B):** ~**31 puntos/semana** promedio (≈ 157 puntos repartidos en 5 semanas), con el grueso del
esfuerzo concentrado en S-Real 1 y 2 (núcleo legal-financiero). **[confirmar Maiki]** los puntos exactos por sprint.

> **Lectura honesta del orden** (el profe lo señaló): el **registro de pago (HU-21)** y el **finiquito (HU-24)**
> quedaron al final. En el caso del finiquito fue inevitable —**no existía como historia** hasta el 16-jun—; en el
> caso del pago, hubo una versión mínima temprana, pero el flujo completo (promoción del cobro por el contratista,
> cola de finanzas, herencia de CFDI, confirmación) se pulió en la última semana. Lo más complejo y troncal (alta,
> estimación, convenios) sí se atendió primero, como se había acordado.

---

## 4. Resumen para la revisión

- **24 historias** (+ acceso), **≈145 puntos** de complejidad estimada.
- Dos fases: **maquetas** (validación de flujo, 19–24 may) e **implementación real** (26 may – 26 jun).
- **Prioridad cumplida:** lo complejo y legalmente crítico, primero; el cierre y el pago fino, al final.
- **Velocidad real reconstruida:** ~31 puntos/semana en la fase de implementación.

> Documento de planeación reconstruido para revisión. Los puntos y la velocidad son una estimación de complejidad
> relativa; Maiki puede ajustarlos contra el registro real antes de entregar.
