# Matriz de Control de Accesos por Rol — SIGECOP

SIGECOP aplica el control de accesos en **tres capas**, de modo que la regla de rol se *impone*, no solo se muestra:

1. **Menú** — oculta las pantallas que el rol no puede ver.
2. **Acceso directo por URL (deep-link)** — entrar a una pantalla sin permiso tecleando la ruta redirige a inicio.
3. **Backend** — aunque alguien salte el frontend, el servidor responde **401** (sin token) o **403** (rol o identidad incorrectos).

**Sin rol seleccionado no se ejecuta nada:** el primer ingreso cae en el selector (login / registro / demo), no en un tablero abierto.

---

## Acciones sensibles (HU en producción)

| Acción sensible | residente | contratista¹ | supervisión | dependencia | finanzas | sin rol |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Alta de contrato (HU-01) | ✏️ E | 👁 C | 👁 C | 👁 C | 🚫 | 🚫→selector |
| Apertura de bitácora (HU-08) | ✏️ E | 👁 C | 👁 C | 🚫 | 🚫 | 🚫→selector |
| Integrar estimación (HU-12) | 👁 C | ✏️ E | 👁 C | 🚫 | 🚫 | 🚫→selector |
| Registrar pago (HU-21) | 👁 C | 🚫 | 🚫 | 👁 C | ✏️ E | 🚫→selector |

**Leyenda:** ✏️ **E** = edita / ejecuta · 👁 **C** = solo lectura · 🚫 = sin acceso (oculto en menú + el deep-link redirige a inicio).

¹ El rol *contratista* es el **superintendente** del contrato. En las estimaciones, además del rol, el control real es por **identidad**: solo el superintendente asignado a ese contrato (`superintendente_id`) puede integrar su estimación.

---

## Notas

- Los roles corresponden a los actores que la ley reconoce en la obra pública (residente, superintendente, supervisión, dependencia) más *finanzas* para el registro de pago.
- *(Pendiente: expandir a la matriz completa de las 22 HU × 5 roles que define el sistema — en camino desde el export de Code.)*
