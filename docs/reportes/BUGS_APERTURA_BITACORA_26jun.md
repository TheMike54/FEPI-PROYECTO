# Bugs del flujo de apertura de bitácora (26-jun) — diagnóstico + fix

> Maiki probando en Render **desde cero**. Dos bugs del mismo flujo de apertura. El **bug de firma art.125 ya se
> arregló** en `1ea4077` (no se toca aquí). Trabajo **local, sin push**. Solo frontend no congelado.

---

## Bug 1 — Caché de bitácora al crear (datos en "—" / firmas falsas hasta F5)

**Síntoma (Render):** justo después de crear un contrato, al entrar a la apertura aparecen datos en "—" y/o lo que
parece "3 ya firmaron"; con **F5 se arregla**.

**Causa raíz:** `frontend/src/context/ContratoActivoContext.jsx` → variable de módulo `_cacheContratos` (caché global
de la lista de contratos). Es **el mismo problema del alta** que ya se arregló: la caché no se invalidaba al crear, así
que el **banner** del contrato activo (`BannerContratoActivo`, que lee esa caché global) mostraba datos viejos / "—"
hasta recargar.

**Lo que encontré en la pantalla de apertura (`AperturaBitacora.jsx`):**
- La apertura **NO tiene caché propio**: su lista de contratos es un `api.listarContratos()` **fresco en cada montaje**
  (`AperturaBitacora.jsx:145`). Por eso los datos del **formulario** (folio/monto/plazo/equipo) **no** se quedan stale.
- Lo que sí leía la caché global es el **banner superior**. Eso es exactamente lo que arregla
  `invalidarCacheContratos()` (commit **7fe9ccf**), que ya se llama tras crear el contrato en `AltaContrato.jsx`.
- El "3 ya firmaron" es muy probablemente una **lectura del bloque "Equipo que firmará"** (3 filas: residente,
  superintendente, supervisión) mientras el banner estaba en "—"; **no** son firmas reales (la bitácora nueva nace sin
  firmas).

**Qué arreglé (seguro):** **nada nuevo que aplicar aquí** — la apertura **ya queda cubierta por `7fe9ccf`** (el
`invalidarCacheContratos()` del alta refresca la caché global que usa el banner; la apertura, además, refetch-ea su
propia lista en cada montaje). **El síntoma sigue en Render porque `7fe9ccf` no está desplegado.**

**Acción:** **desplegar `main`** (que incluye `7fe9ccf`). No hace falta tocar `AperturaBitacora.jsx` para este bug:
no tiene caché propia que invalidar.

**Qué propongo (opcional, no aplicado):** si tras desplegar persistiera algún parpadeo, añadir en `AperturaBitacora.jsx`
un **refetch "una sola vez"** cuando llega un `?contrato=<id>` que no está en la lista local (guardado con un `ref`
para no entrar en bucle). Es defensa en profundidad; **no lo apliqué** porque la apertura ya refetch-ea en cada montaje
y el arreglo real del banner es `7fe9ccf`.

**¿Conecta con el fix de la firma?** No directamente. Son problemas distintos (caché de UI vs regla temporal de firmas).

---

## Bug 2 — Fecha de apertura anterior a la creación (campo editable)

**Síntoma (Render):** la apertura dejaba capturar una fecha **anterior** a la creación del contrato.

**Causa raíz:** `frontend/src/pages/AperturaBitacora.jsx` → el único campo de fecha **editable** era
**"Entrega del sitio"** (`fechaEntregaSitio`, antes en la línea ~277): `<input type="date">` **sin `min`** y
editable, así que se podía elegir cualquier fecha (incluida una previa a la creación).

**Dato clave (backend):** el `fecha_apertura` **real** que se guarda **ya está fijado server-side** =
`contrato.fecha_inicio` (`backend/src/controllers/bitacora.controller.js` → `abrirBitacora`, ~línea 144); **no** se
captura. El campo editable (`fechaEntregaSitio`) solo alimentaba el **texto del acta** (`acta.cronograma.entrega_sitio`)
y la redacción de la nota de apertura — **no** alimenta vigencias ni fechas de firma.

**Qué arreglé (seguro, frontend no congelado), commit de esta sesión:**
1. El campo de fecha de la apertura ahora es **solo lectura** y se **pre-llena con la fecha de inicio del contrato**
   (re-sincronizado por efecto cuando carga el contrato seleccionado). Ya no se puede capturar una fecha anterior a la
   creación. Etiqueta nueva: *"Fecha de apertura (= inicio del contrato)"* + nota explicativa. (`AperturaBitacora.jsx`)
2. Se conserva el `data-testid="input-fecha-apertura"` (no rompe e2e que lo localicen; queda pre-llenado).

**Por qué no hizo falta backend:** `abrirBitacora` **ya** deriva `fecha_apertura = fecha_inicio` server-side e ignora
cualquier fecha del usuario para ese dato. El fix del front cierra el único hueco (un campo editable que solo afectaba
el texto del acta). **No** modifiqué el controller (y sigue siendo no congelado, por si Maiki quiere además un clamp
server-side `entrega_sitio >= fecha_inicio` — lo dejo como **propuesta**, no aplicado, por ser cosmético).

**¿Conecta con el fix de la firma (1ea4077)?** **Sí, temáticamente, y es coherente:**
- La regla temporal de firmas usa `roster.vigencia_desde = fecha_inicio` vs `nota.fecha`. El fix `1ea4077` exime el
  **límite inferior** para el titular original (`sustituye_a IS NULL`).
- El bug 2 toca **otra** fecha (`entrega_sitio`), que **no** alimenta vigencias ni el `fecha` de las notas (la nota de
  apertura usa `NOW()` por default). Por tanto **pre-llenar/bloquear esta fecha NO reintroduce** el problema de
  vigencia que se arregló: no cambia `vigencia_desde`, ni `vigencia_hasta`, ni `nota.fecha`.
- Fijar la apertura a `fecha_inicio` es además **consistente** con la regla existente ("la bitácora se abre el mismo
  día en que arranca el contrato") y con el `fecha_apertura` server-side.

---

## Resumen
| Bug | Causa raíz (archivo:función) | Acción | Conecta con firma |
|---|---|---|---|
| 1 — caché apertura | `ContratoActivoContext.jsx` `_cacheContratos` (banner) | **Ya cubierto por `7fe9ccf`** → desplegar `main`. Apertura no tiene caché propia. Refetch opcional propuesto, no aplicado | No |
| 2 — fecha anterior a creación | `AperturaBitacora.jsx` campo `fechaEntregaSitio` editable sin `min` | **Arreglado:** campo solo-lectura pre-llenado con `fecha_inicio`. Backend ya derivaba `fecha_apertura`. Clamp server-side propuesto, no aplicado | Sí (coherente, **no** reintroduce el bug de vigencia) |

**Estado:** local, sin push, build verde. Zona congelada intacta. **Recomendación: desplegar `main`** para que el bug 1
desaparezca en Render junto con `7fe9ccf` y el fix de firma `1ea4077`.
