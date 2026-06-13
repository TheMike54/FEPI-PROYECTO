# Matriz de Control de Accesos por Rol — SIGECOP

SIGECOP aplica el control de accesos en **tres capas**, de modo que la regla de rol se *impone*, no solo se muestra:

1. **Menú** — oculta las pantallas que el rol no puede ver.
2. **Acceso directo por URL (deep-link)** — entrar a una pantalla sin permiso tecleando la ruta redirige a inicio.
3. **Backend** — aunque alguien salte el frontend, el servidor responde **401** (sin token) o **403** (rol o identidad incorrectos).

**Sin rol seleccionado no se ejecuta nada:** el primer ingreso cae en el selector (login / registro / demo), no en un tablero abierto.

**Leyenda:** **E** = edita / ejecuta · **C** = solo lectura (consulta) · 🚫 = sin acceso (oculto en menú + el deep-link rebota a inicio).

---

## Matriz completa (21 historias de usuario)

| HU | Título | residente | contratista¹ | supervisión | dependencia | finanzas | sin rol |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| HU-01 | Alta de contratos | E | C | C | C | 🚫 | 🚫 |
| HU-02 | Registro de fianzas | C | 🚫 | 🚫 | E | C | 🚫 |
| HU-03 | Convenios modificatorios | C | C | C | E | 🚫 | 🚫 |
| HU-04 | Consulta de expediente | E | C | C | C | 🚫 | 🚫 |
| HU-05 | Programa y curva de avance | E | C | C | C | 🚫 | 🚫 |
| HU-06 | Registro de trabajos terminados | C | E | C | 🚫 | 🚫 | 🚫 |
| HU-07 | Configuración de alertas de atraso | E | 🚫 | C | 🚫 | 🚫 | 🚫 |
| HU-08 | Apertura de bitácora | E | C | C | 🚫 | 🚫 | 🚫 |
| HU-09 | Emisión de notas | E | E | E | 🚫 | 🚫 | 🚫 |
| HU-10 | Consulta de notas | E | C | C | 🚫 | 🚫 | 🚫 |
| HU-11 | Minutas y agenda de visitas | E | C | C | 🚫 | 🚫 | 🚫 |
| HU-12 | Integración de estimación | C | E | C | 🚫 | 🚫 | 🚫 |
| HU-13 | Envío de la estimación | C | E | C | 🚫 | 🚫 | 🚫 |
| HU-14 | Historial de estimaciones | E | C | 🚫 | C | 🚫 | 🚫 |
| HU-15 | Revisión de estimación | E | 🚫 | E | C | 🚫 | 🚫 |
| HU-16 | Reingreso de estimación tras rechazo | C | E | 🚫 | 🚫 | 🚫 | 🚫 |
| HU-17 | Tablero de estimaciones | E | C | C | C | 🚫 | 🚫 |
| HU-18 | Portafolio ejecutivo | C | 🚫 | C | E | 🚫 | 🚫 |
| HU-19 | Exportación de reportes | E | C | C | C | C | 🚫 |
| HU-20 | Tránsito a pago | C | E | 🚫 | C | E | 🚫 |
| HU-21 | Registro de pago | C | 🚫 | 🚫 | C | E | 🚫 |

¹ El rol *contratista* es el **superintendente** del contrato. En las estimaciones, además del rol, el control real es por **identidad**: solo el superintendente asignado a ese contrato (`superintendente_id`) puede integrar/enviar su estimación.

**Notas de la matriz:**
- Son 21 filas. HU-00 (Iniciar sesión) no aparece porque es **transversal** (no se filtra por rol). El backlog de "22 HU" = HU-00 + estas 21.
- La columna **sin rol** es 🚫 en todas, por el *default seguro* (sin rol seleccionado no hay acceso de ejecución).
- Los roles corresponden a los actores que la ley reconoce en la obra pública (residente, superintendente, supervisión, dependencia) más *finanzas* para el registro de pago.

---

## Casos demostrativos (verificados en navegador, 9/9)

Evidencia visual con Playwright (modo demostración, solo frontend):

- **Sin rol** → cae en el selector, sin tablero abierto.
- **Finanzas** → su menú no incluye "Apertura de bitácora"; teclear `/bitacora/apertura` rebota a inicio.
- **HU-12 Integración** → **editable** para *contratista* y **solo lectura** para *residente* (la misma pantalla, distinto rol) — la matriz se respeta celda por celda.
- **Residente** → edita Alta (HU-01) y Apertura (HU-08); ve Integración (HU-12) en solo lectura.
- **"Cambiar de rol"** → limpia el rol y vuelve al selector.
