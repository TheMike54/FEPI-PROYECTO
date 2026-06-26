# HU-06 (avance y seguimiento) — foto obligatoria + bug de observaciones (26-jun)

> Dos cambios en el flujo de avance físico. Verificado en código real + esquema. **Local, sin push.**
> `trabajos.controller.js` y `avance-fotos.*` **NO están en la zona congelada** → se aplicó front **y** back.

---

## Punto 1 — Foto de evidencia OBLIGATORIA al registrar avance

**Decisión:** revertir la foto a **obligatoria** (estaba opcional desde el D1 del 26-jun, por petición del profe del
25-jun). Es **decisión consciente de Maiki** (líder), asumiendo el riesgo; la foto es evidencia del avance (criterio del
equipo, art. 132 fr. IV RLOPSRM).

**Causa raíz / dónde estaba lo opcional:**
- Backend `backend/src/controllers/trabajos.controller.js` → `registrarAvance`: el bloque D1 dejaba pasar el registro
  aunque `req.files` viniera vacío (sin gate).
- Frontend `frontend/src/pages/TrabajosTerminados.jsx`: `puedeGuardar` no exigía fotos; la etiqueta decía
  "(opcional…)" y el aviso era "Opcional: puedes adjuntar…".

**Qué arreglé (aplicado — front Y back, no congelado):**
1. **Backend (gate duro, no se evade por API):** en `registrarAvance`, si `req.files` viene vacío →
   `400 "Debes adjuntar al menos una foto de evidencia del avance (art. 132 fr. IV RLOPSRM, criterio del equipo)."`
   antes de cualquier escritura.
2. **Frontend (gate UI):** `puedeGuardar` ahora incluye `&& fotos.length > 0` (el botón "Registrar avance" queda
   deshabilitado sin foto).
3. **UI coherente con obligatorio:** etiqueta **"Fotos de evidencia \*"** (asterisco rojo) + texto "(obligatoria —
   evidencia del avance, art. 132 fr. IV RLOPSRM…)"; el aviso de faltante pasó a rojo: "Requerida: adjunta al menos una
   foto de evidencia del avance para poder registrar."
4. **Changelog:** se añadió la línea pedida en `docs/entrega_profe/CHANGELOG_REVISIONES_SIGECOP_26jun.md` (sección
   *Notas de fiabilidad*), registrando la divergencia consciente respecto al profe del 25-jun.

**¿Rompe otros flujos? — Verificado, NO:**
| Flujo | ¿Crea avance por el endpoint? | ¿Afectado? |
|---|---|---|
| **Estimación (HU-12/13…) que lee avance** | No — solo **lee** `concepto_avance` (cantidades) | **No.** No depende de fotos |
| **Seeds demo** (`seed_demo_24/atraso/tr/…`, 8 archivos) | No — `INSERT INTO concepto_avance` **directo** (saltan el endpoint) | **No.** Los contratos PRUEBA-*/OP-* siguen sembrándose igual |
| **`corregirAvance`** (`POST /trabajos/:id/corregir`) | Sí, registro nuevo vinculado, pero **sin multipart** | **No.** No se le exige foto (es otra ruta; la corrección conserva la evidencia del original) |
| **Único creador real** `POST /trabajos` (UI HU-06) | Sí | **Sí — cambio buscado:** ahora exige foto |

- Backend: confirmado que `registrarAvance` **solo** se monta en `POST /trabajos`; **ningún** controller lo llama
  internamente (la estimación no genera avance).
- **e2e actualizadas** (no congeladas) para que sigan verdes con el gate: las que sembraban avance por API **sin** foto
  ahora envían **multipart con una evidencia PNG**: `o4-avance-periodo.spec.js` (helper `registrar`),
  `hu-07-alertas-atraso.spec.js` (helper `seedAvance`, 2 sitios), `avance-append-only.spec.js`. La spec UI de o4 ya
  adjuntaba la foto. Los `/corregir` quedan en JSON (no requieren foto).

---

## Punto 2 — Bug: no se podían anotar OBSERVACIONES a fotos subidas DESPUÉS del registro

**Causa raíz:** `frontend/src/pages/TrabajosTerminados.jsx` → componente `FotosDeAvance` (galería por registro de
avance). Al "+ Agregar foto" se llamaba `api.subirFotoAvance(avanceId, liviana, '')` — **descripción siempre vacía**, y
la galería **no tenía ningún campo** para escribir/ver la observación. Es decir: **bug de frontend**, no un gate de
estado. El backend SÍ soportaba la descripción (`subirFoto` la acepta y `listarFotos` la devuelve); solo faltaba además
una vía para **editarla después**.

**Qué arreglé (aplicado — frontend + endpoint nuevo no congelado):**
1. **Subir con observación:** la galería ahora tiene un campo "Observación de la foto" que se envía con la imagen
   (`subirFotoAvance(avanceId, file, nuevaDesc)`), en vez de `''`.
2. **Ver la observación:** cada foto muestra su `descripcion` (o "Sin observación").
3. **Anotar/editar después (lo que faltaba):** botón **✎** por foto → edición inline → guarda con un **endpoint nuevo**
   `PATCH /api/avance-fotos/:fotoId` (`editarFoto` en `avance-fotos.controller.js`, acceso por participación, no toca el
   binario). Esto cubre tanto las fotos recién agregadas como cualquiera que ya estuviera con descripción vacía.
4. `frontend/src/services/api.js`: nueva `editarFotoAvance(fotoId, descripcion)`.

**Zona congelada:** ninguna. `avance-fotos.controller.js` y `avance-fotos.routes.js` **no** están congelados, y el router
`/api/avance-fotos` **ya estaba montado** en `server.js` → añadir el `PATCH` al router existente **no toca `server.js`**.

---

## Relación entre los dos puntos
Son independientes pero del mismo flujo: el **#1** exige ≥1 foto **al registrar**; el **#2** permite **seguir agregando
fotos y anotarlas** después. Con el #1 no se puede registrar sin foto, pero el #2 sigue siendo necesario para las fotos
**adicionales** que se suman luego (y para corregir observaciones).

## Estado
Build del frontend **verde**; `node -c` OK en los 3 archivos backend. **Local, sin push, zona congelada intacta.**
Archivos: `trabajos.controller.js`, `avance-fotos.controller.js`, `avance-fotos.routes.js`, `api.js`,
`TrabajosTerminados.jsx`, 3 specs e2e, CHANGELOG.

> **Pendiente de despliegue (Maiki):** el gate backend solo aplica en Render al desplegar `main`.
