# Mostrar la EMPRESA junto al nombre de la persona — SIGECOP (26-jun-2026)

> Seguimiento del hallazgo #4 de Leo ("¿cómo sabes a qué empresa pertenece la persona?"). **Solo frontend, aditivo.**
> No se tocó zona congelada, backend, schema ni BD. Build de frontend **verde**. Regla aplicada: si el dato `empresa`
> NO viene en la respuesta del backend, **no se modifica el backend** — se deja como propuesta.

## Disponibilidad del dato por pantalla (verificado en el código)

| Pantalla | Componente | ¿`empresa` en el payload? | Acción |
|---|---|---|---|
| Roster — persona **vigente** por rol | `RosterContrato.jsx` | **Sí** (`vigente[rol].empresa`, `roster.controller.js:73`) | Ya se mostraba (`:156`, testid `vigente-empresa-<rol>`) — sin cambio |
| Roster — **histórico/sustituciones** | `RosterContrato.jsx` | **Sí** (`historial[].usuario_empresa`, `roster.controller.js:54` JOIN empresas) | **ARREGLADO** (no se pintaba) |
| Firmas de **apertura** de bitácora | `PorFirmar.jsx` / `AperturaBitacora.jsx` | **No** (`bitacora.controller.js` no trae empresa) | **Propuesta** (requiere backend) |
| Firmas de **notas** | `EmisionNotas.jsx` / `ConsultaNotas.jsx` | **No** | **Propuesta** (requiere backend) |
| **Emisor** de notas | `EmisionNotas.jsx` / `ConsultaNotas.jsx` | **No** | **Propuesta** (requiere backend) |

## Lo que se arregló (frontend, aditivo)

**`frontend/src/pages/RosterContrato.jsx`** — tabla de histórico por rol (sustituciones). La celda "Persona" ya
recibía `h.usuario_empresa` en el payload pero solo mostraba el nombre. Ahora muestra **"Nombre — Empresa"**
(la empresa en gris tenue cuando existe; si la persona no tiene empresa registrada, solo el nombre). Cambio
puramente visual; no se alteró ningún testid existente (se añadió uno nuevo, `roster-persona-<id>`, sin tocar los
previos). El roster **vigente** ya mostraba la empresa, así que ahora toda la pantalla de roster es consistente.

## Propuestas (requieren backend — NO aplicadas)

Las firmas (apertura y notas) y el emisor de notas se arman en `bitacora.controller.js`, cuyo payload **no incluye
la empresa** (lo confirmé: 0 referencias a `empresa` en ese controller). Mostrarla ahí exige un cambio aditivo de
backend (no congelado, pero fuera del alcance de esta sesión). Cuando se autorice:

1. **Emisor de notas** — en `construirPayloadNotas` (`bitacora.controller.js`), agregar al SELECT del emisor
   `ue.nombre AS emisor_empresa` con `LEFT JOIN empresas ue ON ue.id = u.empresa_id`. Luego en `EmisionNotas.jsx` /
   `ConsultaNotas.jsx` mostrar `emisor_nombre — emisor_empresa`.
2. **Firmas de notas** — en el `json_build_object` de `firmas` del mismo controlador, añadir la empresa del firmante
   (`LEFT JOIN empresas ufe ON ufe.id = uf.empresa_id` → `'empresa', ufe.nombre`). Mostrarla junto al nombre del
   firmante.
3. **Firmas de apertura** — en la consulta de `bitacora_firmantes` (cargar apertura), agregar el join a `empresas`
   por `u.empresa_id` y exponer `empresa`. Mostrarla en `PorFirmar.jsx` / `AperturaBitacora.jsx`.

Todas son adiciones de un `LEFT JOIN empresas` + una columna; sin DDL, sin tocar zona congelada (el controlador de
bitácora no está congelado), sin cambiar el contrato de datos existente. Quedan a tu OK.

## Entrega
- **Pantalla tocada:** `frontend/src/pages/RosterContrato.jsx` (histórico de roster → "Nombre — Empresa").
- **Ya estaba:** roster vigente.
- **Propuestas (backend aditivo, no aplicado):** firmas de apertura, firmas de notas, emisor de notas.
- Build de frontend **verde**. Sin tocar `App.jsx`/`permisos.js`/`SesionContext.jsx`, backend, schema ni BD. Sin push.
