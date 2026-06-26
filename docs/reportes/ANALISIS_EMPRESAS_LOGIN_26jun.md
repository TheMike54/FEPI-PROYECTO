# Análisis — "Empresas en el login" (propuesta de Maiki vs lo que pidió el profe)

> **Punto 3 (verificación de diseño, 26-jun). NO se tocó código** de login/registro (sensible). Solo análisis para
> que Maiki decida. Fuentes: `docs/audios/` (citas verificadas) + lectura del flujo real (frontend + controllers).

## La idea de Maiki (a evaluar)
Mover "crear empresa" al login, de modo que al crear una cuenta el usuario **solo se vincule a una empresa ya
existente**, y **quitar** el "registrar empresa nueva" del registro de cuenta.

---

## 1. Qué hace HOY el flujo (registro → empresa)
- **Dos pantallas espejo** de auto-registro: `SeleccionRol.jsx` (pestaña "Crear cuenta" del login) y
  `SolicitudRegistro.jsx` (`/solicitud-acceso`). Ambas → `api.register` → `POST /auth/register`.
- La empresa **se elige de un `<select>` del catálogo** (`api.listarEmpresas` → `GET /auth/empresas`), **no es texto
  libre**. El select tiene: vacío · una opción por empresa del catálogo · **"➕ Registrar nueva empresa…"**. Solo si
  eliges "nueva" aparece un input de texto, y un aviso aclara "✓ ya existe, mejor selecciónala" si coincide.
- Empresa **obligatoria** para `contratista`/`supervisión` (front + 400 server-side).
- El backend (`auth.controller.js:register`, **CONGELADO**) llama `empresas.controller.js:resolverOCrearEmpresa`:
  **dedup en 2 niveles** (débil normalizado por índice único `uq_empresas_nombre_norm` + fuerte: acentos/puntuación/
  sufijos de razón social). Si coincide → **reúsa** (no duplica); si no existe → **crea** `estado='por_validar'`.
- La persona nace `pendiente`/`rol NULL`; no entra hasta que **la dependencia la aprueba**.
- **Padrón (HU-23, `EmpresasPadron.jsx`, solo rol dependencia):** hoy **VALIDA** (`por_validar`→`validada`, art. 43
  RLOPSRM) y **FUSIONA** duplicados, pero **NO tiene "crear empresa"**.
- **Alta de contrato (`AltaContrato.jsx`):** ya hay selector **"Contratista · empresa (contraparte)"** y
  "Supervisión · empresa", que **filtran** la persona a esa empresa; la empresa persistida sale de la persona
  elegida (`contratista_empresa_id`). En el alta **no** se crean empresas.

## 2. Qué pidió el profe sobre empresas (citas)
- **Elegir de catálogo, NO texto libre; auto-crear si falta y reusar después** — 9-jun (`WhatsApp Audio 2026-06-09 at 2.07.44 PM`):
  *"Cuando te la creo… al darle aceptar **automáticamente da de alta una empresa nueva; entonces al siguiente que yo
  registre ya está la empresa, ya la elijo nada más, ya no la registro completo**"* `[04:44]`; *"si le pone empresa
  patito y la otra empresa PAT… ya no está normalizado"*. → quiere **normalizar**, no eliminar la creación.
- **Padrón compartido, poblado on-demand** — 22-jun (`Combinado_2026-06-22_2016.md` `[01:39]`): *"si no está la
  registro; ya cuando alguien más trata de hacer un contrato puede tomar la empresa… ya va a estar disponible para
  todos."*
- **La empresa es la entidad raíz; el contrato se asocia a la empresa** (no a la persona) — 25-jun
  (`Combinado_2026-06-25_2145.md` `[01:32][01:55]`): tabla intermedia **dependencia ↔ empresa**, clave = contrato.
- **En el alta: selector de empresa = la CONTRAPARTE, y de ahí elegir la PERSONA** (no la "cuenta") — 25-jun
  `[10:50][11:58][14:15]`.
- **Matiz:** el padrón lo pidió **en la base de datos**, *"no a nivel de la vista"* — 25-jun `[09:18][09:59]`. La
  pantalla de padrón que se construyó **excede** lo pedido (no la rechazó).

## 3. ¿La propuesta de Maiki aplica?
**Coincide en la dirección, pero diverge en un punto concreto:**

| Aspecto | Profe pidió | Propuesta de Maiki | ¿Coincide? |
|---|---|---|---|
| Elegir de catálogo, no texto libre | Sí | Sí | ✅ (y **ya está** implementado) |
| Sin duplicados (patito/PAT) | Sí (normalizar) | Sí | ✅ (ya hay dedup débil+fuerte) |
| **Quitar "registrar empresa nueva" del registro** | **NO lo pidió** — al revés: auto-crear si falta | **Sí, quitarlo** | ⚠ **diverge** |
| Empresa = entidad raíz; contrato↔empresa | Sí | (no lo contradice) | ✅ |
| Selector empresa→persona (contraparte) en el alta | Sí | (es otro punto) | ✅ ya parcialmente hecho |

**Lectura:** lo que el profe quería sobre empresas **ya está cubierto en gran medida** (select de catálogo +
auto-create-si-falta + dedup + padrón valida/fusiona + selector empresa→persona en el alta). La parte de Maiki de
**"quitar registrar nueva del registro"** es **más estricta** que lo que pidió el profe (él describió justamente el
auto-alta on-demand durante el registro). No es lo que el profe pidió, aunque tampoco lo prohíbe.

## 4. Riesgo de la propuesta y qué tocaría (si Maiki decide hacerla)
Si se quita la creación de empresa del registro y solo se permite **elegir existente**:
- **Hueco operativo:** un contratista/supervisión cuya empresa **aún no está** en el catálogo **no podría
  registrarse** (empresa obligatoria). Habría que **poblar el catálogo antes** y dar una vía de alta de empresa:
  hoy el padrón (`EmpresasPadron.jsx`) **no crea** empresas → habría que **añadir** `POST /empresas` (crear, solo
  dependencia) + su botón.
- **Zona congelada:** `auth.controller.js:register` (CONGELADO) hoy hace *resolver-O-crear*; para que el registro
  **no cree**, habría que cambiarlo a *resolver-sin-crear* (rechazar nombre inexistente) o recibir `empresa_id`
  validado → **cambio en controller congelado = solo Maiki, vía PR**.
- Frontend (no congelado): quitar la opción `__nueva__` + input en `SeleccionRol.jsx` y `SolicitudRegistro.jsx`.

## 5. Recomendación
1. **No hace falta** "quitar registrar nueva" para cumplir al profe: lo que pidió (catálogo normalizado, sin
   duplicados, empresa raíz, selector en el alta) **ya está**. El riesgo > beneficio si se elimina sin antes dar el
   alta de empresas a la dependencia.
2. Si Maiki **igual quiere** el modelo "solo elegir existente" (defendible para limpieza): hacerlo **en 2 pasos**
   (a) primero **añadir "crear empresa" en el padrón** (dependencia) — endpoint nuevo en `empresas.controller.js`
   (no congelado) + botón; (b) **después** cambiar `register` a resolver-sin-crear (**Maiki, congelado**) y quitar
   la rama "nueva" del front. Nunca quitar primero la creación sin la alternativa lista.
3. El punto que **sí** vale la pena cerrar del profe (más que el de login) es el del **alta**: que el selector de
   empresa sea explícitamente **la contraparte** y salga del **catálogo de empresas** (hoy se deriva de los
   asignables). Eso es lo que él remarcó el 25-jun.

> **No se modificó código.** Esto es propuesta para tu decisión, Maiki.
