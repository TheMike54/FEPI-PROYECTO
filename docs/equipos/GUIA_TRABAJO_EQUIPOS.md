# SIGECOP — Guía de trabajo día a día (para los equipos)

Esta guía cubre la **brecha** entre *"ya tengo el sistema corriendo en mi máquina"* (eso lo hiciste con `docs/SETUP_LOCAL.md`) y *"ya estoy trabajando en mi HU y subí mi primer Pull Request"*.

Pensada para quien **nunca ha usado git ni Pull Requests**. Entorno **Windows + PowerShell**. Comandos **verificados contra el repo** (2026-06-02).

> **Dos formas de correr CADA comando de esta guía** (elige la que quieras):
> 1. **Tú, en PowerShell** — copias el comando y lo pegas en la terminal.
> 2. **Tu Claude Code lo corre por ti** — le dices, por ejemplo: *"corre esto: `git status`"* y él lo ejecuta (te pedirá permiso).
>
> **Excepción importante:** el **primer login a GitHub** (paso 1) abre una ventana del navegador para que inicies sesión. Eso **hazlo TÚ en PowerShell**: Claude Code no puede hacer clic en el botón "Authorize" del navegador por ti. Después de ese primer login, ya da igual quién corra los comandos.

---

## 0. Antes de empezar

**Requisito:** ya seguiste `docs/SETUP_LOCAL.md` y el sistema **corre en tu máquina**. Confírmalo rápido:

```powershell
docker compose ps
```
Debes ver `sigecop_db`, `sigecop_backend` y `sigecop_frontend` arriba (`Up` / healthy). Y `http://localhost:5173` abre el login. Si **no**, regresa a `SETUP_LOCAL.md` — esta guía asume el sistema ya levantado.

**Lo que NO debes tocar (zona congelada):** está listado en el **`CLAUDE.md` de la raíz** del repo. Léelo una vez. No lo repito aquí. Cuando abras Claude Code en la raíz, **él lo lee solo** y respeta esas reglas. La idea de fondo: hay archivos (auth, control de accesos, esquema de la base, alta de contrato, estimación core) que **solo Maiki toca**. Si tu HU necesita algo de ahí, **se lo pides a Maiki** (ver paso 5).

**Quién es de qué equipo:**
- **Equipo 2** = bitácora / documental / avance físico → rama `feat/e2-...`
- **Equipo 3** = estimaciones (ciclo) / pagos / reportes → rama `feat/e3-...`
- **Maiki (`TheMike54`)** integra todo y es el **único** que mergea a `main` y despliega a Render.

---

## 1. Conectar git con GitHub (PRIMERA VEZ — aquí es donde más gente se traba)

Esto se hace **una sola vez por computadora**. Tres cosas: (A) decirle a git quién eres, (B) que Maiki te dé acceso al repo, (C) autenticarte en tu primer push.

### A) Dile a git tu nombre y correo

Esto queda grabado en cada commit que hagas (es tu "firma"). Usa el **mismo correo de tu cuenta de GitHub** para que los commits se enlacen a tu perfil.

```powershell
git config --global user.name "Tu Nombre Apellido"
git config --global user.email "tucorreo@ejemplo.com"
```
Verifica que quedó:
```powershell
git config --global user.name
git config --global user.email
```
> `--global` = aplica a todos tus repos en esta máquina (lo haces una vez y ya). Si te pidieran configurarlo solo para este repo, sería el mismo comando **sin** `--global`.

### B) Maiki tiene que darte acceso al repo (si no, el push falla con error 403)

El repo es **privado / de Maiki** (`TheMike54/FEPI-PROYECTO`). Para que **puedas subir tu rama**, Maiki debe agregarte como **colaborador**. **Maiki ya te agregó como colaborador, así que esto debería funcionar de una; si el push te da error 403, avísale a Maiki para que confirme que te invitó.**

> En GitHub: el repo → **Settings → Collaborators → Add people** → te invita con tu usuario de GitHub → **te llega un correo, acéptalo.**

Si no estás invitado, **clonar y leer sí funciona, pero `git push` te dará "403 / Permission denied".** Si te pasa eso en el paso 6, es esto: **avísale a Maiki que te invite.**

### C) Autenticarte en tu PRIMER push (Windows)

La **primera vez** que hagas `git push` (paso 6), Windows abre **Git Credential Manager**: una ventana del navegador para iniciar sesión en GitHub. Pasos:

1. Corre tu primer `git push` (lo verás en el paso 6).
2. Se abre una ventana → **"Sign in to GitHub"** → entra con tu usuario y contraseña de GitHub.
3. Si tienes 2FA (verificación en dos pasos), mete el código.
4. Clic en **Authorize**. La ventana se cierra sola y el push continúa.
5. **Listo para siempre:** Windows guarda tus credenciales (en el Administrador de credenciales de Windows). Los próximos push ya **no** te piden nada.

**Alternativa si el navegador no abre o falla** — Personal Access Token (PAT):
1. GitHub → tu foto (arriba der.) → **Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)**.
2. Marca el scope **`repo`**. Genera. **Copia el token** (solo se muestra una vez).
3. Cuando git te pida **Username**, pon tu usuario de GitHub. Cuando te pida **Password**, **pega el token** (NO tu contraseña normal — GitHub ya no acepta contraseña por la terminal).

---

## 2. Crea tu rama (NUNCA trabajes en `main`)

`main` es la rama oficial; **solo Maiki la toca**. Tú trabajas en **tu propia rama**.

Primero asegúrate de partir de un `main` actualizado:
```powershell
git checkout main
git pull origin main
```
Crea tu rama (cambia el nombre por lo que vas a hacer). Convención del proyecto: `feat/e2-...` o `feat/e3-...`, en minúsculas y con guiones.

```powershell
# Equipo 2 — ejemplos:
git checkout -b feat/e2-fianzas
git checkout -b feat/e2-expediente

# Equipo 3 — ejemplos:
git checkout -b feat/e3-envio-estimacion
git checkout -b feat/e3-historial
```
`git checkout -b <rama>` crea la rama **y** te cambia a ella. Comprueba en cuál estás:
```powershell
git branch --show-current
```
> Regla simple: **una rama por HU (o por tarea).** Si luego empiezas otra HU, vuelves a `main`, `git pull`, y creas **otra** rama nueva.

---

## 3. Abre Claude Code en la raíz y pega TU prompt de equipo

1. En PowerShell, **desde la raíz del repo** (`sigecop/`), abre Claude Code:
   ```powershell
   claude
   ```
   Al abrirlo ahí, **lee solo el `CLAUDE.md`** (reglas + zona congelada). **No tienes que pegárselo.**
2. Abre `docs/Prompts_Accion_Equipos_SIGECOP.md`, **copia el bloque de TU equipo** (Equipo 2 o Equipo 3) y **pégalo** en Claude Code. Ese prompt ya le dice qué HU tocan, qué NO tocar y qué pedirle a Maiki.
3. Arranca: dile cuál HU quieres construir primero.

> Verifica que estás en tu rama (no en `main`) **antes** de que Code empiece a editar: `git branch --show-current`.

---

## 4. Ciclo de trabajo (el día a día)

```
   ┌─────────────────────────────────────────────────────────────┐
   │ 1. Le dices a Code qué HU/tarea construir.                   │
   │ 2. Code escribe el código (respeta la zona congelada).      │
   │ 3. Si editó el BACKEND → reinícialo:                         │
   │        docker restart sigecop_backend                        │
   │    (el frontend se recarga solo — Vite HMR, no reinicies)    │
   │ 4. Pruebas en LOCAL: http://localhost:5173 con login real,   │
   │    y revisas datos en DBeaver (localhost:5432).             │
   │ 5. ¿Sirve? → guardas y subes (paso 6). ¿No? → vuelves a 1.  │
   └─────────────────────────────────────────────────────────────┘
```

**Smoke local antes de pedir merge** (mínimo que debe cumplir tu HU): entras con la cuenta de rol que corresponde (las cuentas demo están en `SETUP_LOCAL.md` §6, contraseña `Sigecop2026!`), navegas tu HU **sin que truene**, los permisos por rol se respetan, y el dato **de verdad** se guarda (lo confirmas viéndolo en DBeaver o recargando la página). Si tu HU usa backend real, esto **no** corre en CI: lo verificas tú contra el stack Docker.

Comandos útiles del día (de `SETUP_LOCAL.md`):
```powershell
docker compose ps                 # estado de los 3 contenedores
docker compose logs -f backend    # logs del backend (Ctrl+C para salir, NO los apaga)
docker restart sigecop_backend    # tras editar backend (obligatorio: no auto-recarga)
```

---

## 5. Si tu prompt dice "pídele a Maiki la tabla X / que monte el router"

Hay cosas que tu equipo **no** hace por sí mismo, porque tocan la zona congelada:

- **Tablas / columnas nuevas en la base de datos** → NO edites `backend/src/db/schema.sql`.
- **Montar un router nuevo** (que tu endpoint quede activo) → NO edites `backend/server.js`.

Esos dos archivos los toca **solo Maiki**. ¿Qué haces tú?

1. Mira el **diseño ya preparado** de tu tabla en `docs/Borrador_DDL_Tablas_Nuevas_SIGECOP.md` (ahí están casi todas las tablas que cada equipo va a necesitar, con su SQL).
2. **Mándale a Maiki** el bloque de DDL que ocupas (cópialo del borrador o dile qué tabla del borrador necesitas) **por el canal del equipo**, no lo metas tú.
3. **Espera** a que Maiki lo integre y reinicie el backend. Él te avisa cuando ya esté.
4. Mientras tanto, puedes ir armando el **frontend** y el **controller/route nuevos** de tu dominio (archivos NUEVOS tuyos, eso sí lo haces; solo el *montaje* en `server.js` es de Maiki).

> Regla de oro: **schema.sql y server.js no se tocan.** Lo que necesites de ahí, se lo pides a Maiki.

---

## 6. Guarda y sube TU rama

Cuando tu HU ya pasa el smoke local, guarda tu trabajo en commits y súbelo. **A tu rama puedes pushear libremente.**

```powershell
# 1) Mira qué cambió (siempre, antes de nada):
git status

# 2) Agrega los archivos que SÍ quieres subir (explícito, archivo por archivo o carpeta):
git add frontend/src/pages/RegistroFianzas.jsx
git add backend/src/controllers/fianzas.controller.js
#   (evita 'git add .' a ciegas: revisa antes con git status que no metes basura)

# 3) Haz el commit con un mensaje claro de qué hiciste:
git commit -m "HU-02: cablear RegistroFianzas al backend real + alertas de vigencia"

# 4) Sube tu rama a GitHub (la PRIMERA vez usa -u para enlazarla):
git push -u origin feat/e2-fianzas
```

- En el **primer** `git push` se abre el login de GitHub (paso 1-C). Después ya no.
- El `-u` solo hace falta la **primera** vez que subes la rama. Las siguientes veces, basta:
  ```powershell
  git add <archivos>
  git commit -m "mensaje"
  git push
  ```
- **Commitea seguido** (cada avance que funcione), no guardes todo para el final.

---

## 7. Abre el Pull Request (con los clics reales de GitHub)

El Pull Request (PR) es donde le pides a Maiki que revise tu rama y la integre a `main`.

1. Después del `git push`, abre el repo en GitHub: `https://github.com/TheMike54/FEPI-PROYECTO`.
2. GitHub te muestra arriba un banner amarillo: **"… had recent pushes — Compare & pull request"** → clic en **Compare & pull request**.
   *(Si no aparece el banner: pestaña **Pull requests** → botón verde **New pull request**.)*
3. Revisa las dos cajas de arriba:
   - **base:** `main`  ← (a dónde va tu trabajo)
   - **compare:** `feat/e2-fianzas`  ← (tu rama)
4. **Título:** claro, p. ej. `HU-02 — Fianzas cableadas al backend`.
5. **Descripción:** escribe **qué hiciste** y **qué probaste** (tu smoke local). Ejemplo:
   ```
   Qué hace: cablea RegistroFianzas.jsx al backend nuevo (fianzas.controller.js),
   alertas de vigencia 30/15/5 derivadas en lectura.
   Probado en local: login como dependencia, alta de póliza, recargué y persiste;
   verificado en DBeaver tabla contrato_garantias.
   Pendiente de Maiki: integrar tabla garantia_endosos (DDL del borrador).
   ```
6. Clic en **Create pull request**.
7. **AVÍSALE A MAIKI directo** (canal del equipo) que abriste el PR. **No lo mergees tú** — el merge a `main` y el deploy son solo de Maiki.

**Si Maiki te pide cambios:** los arreglas **en la MISMA rama** (no creas otra). Editas → commit → `git push`. El PR **se actualiza solo** con tus nuevos commits; no abres un PR nuevo.

> Si tu PR tocó algún archivo de la zona congelada, GitHub **auto-asigna a `@TheMike54`** como revisor (por el `CODEOWNERS`). Normal — significa que Maiki debe aprobarlo.

---

## 8. Mantente al día con `main`

Maiki integra la **fundación** (programa de obra A2, anticipo, sustitución de personas, etc.). Esos cambios entran a `main` y tú **debes jalarlos a tu rama seguido** para no quedarte atrás y evitar conflictos enormes al final.

Estando **en tu rama** (`git branch --show-current` para confirmar):
```powershell
git pull origin main
```
- Si no hay choques, git mezcla `main` dentro de tu rama y listo.
- **Si hay conflicto de merge** (dos personas tocaron las mismas líneas), git te avisa y marca los archivos. Tienes dos caminos:
  - **Fácil:** dile a tu Claude Code *"resuélveme los conflictos de merge"* — él te explica y arregla las marcas `<<<<<<<` / `=======` / `>>>>>>>`.
  - **A mano:** abres el archivo, eliges qué versión queda (borrando las marcas), guardas, y luego:
    ```powershell
    git add <archivo-resuelto>
    git commit          # confirma la mezcla (git ya trae el mensaje)
    ```
- Hazlo **al menos una vez al día** y **siempre antes de abrir el PR**.

---

## 9. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `git push` da **`403` / `Permission denied`** | No eres colaborador del repo, o te autenticaste con otra cuenta | Pídele a Maiki que te invite (paso 1-B); revisa que iniciaste sesión con TU GitHub. |
| `git push` dice **`Authentication failed`** | Metiste tu contraseña en vez del token, o login viejo | Usa el flujo del navegador (paso 1-C) o un **PAT** como password, no tu contraseña. |
| **`fatal: not a git repository`** | No estás en la carpeta del repo | `cd` a la carpeta `sigecop/` (la raíz) y reintenta. |
| **`Updates were rejected`** al pushear | `main`/tu rama avanzó en GitHub | `git pull origin main` (paso 8), resuelve si hay conflicto, y vuelve a `git push`. |
| **Conflicto de merge** tras `git pull` | Dos personas tocaron las mismas líneas | Resuélvelo (paso 8): a mano o pídele a tu Claude Code que lo haga. |
| `docker: ... Cannot connect to the Docker daemon` | Docker Desktop está cerrado | Abre Docker Desktop, espera *"Engine running"*, reintenta. |
| Editaste el **backend** y **no se ve el cambio** | El backend **no** auto-recarga | `docker restart sigecop_backend`. |
| `port is already allocated` (5432/4000/5173) | Otro programa usa ese puerto | Ver `SETUP_LOCAL.md` §7 (cierra el programa o cambia el puerto en `.env`). |
| Login local falla / no hay datos | La BD se creó sin esquema/seed | `docker compose down -v` y `docker compose up -d --build` (**borra** la BD local y la recrea). |
| Quiero subir un archivo y no aparece | No lo agregaste | `git status` para ver qué falta; `git add <archivo>`. |

---

## 10. Reglas de oro (memorízalas)

1. **Nunca toques la zona congelada** (la del `CLAUDE.md` / `CODEOWNERS`). ¿La necesitas? → **pídeselo a Maiki.**
2. **Nunca pushees a `main`.** Trabaja siempre en tu rama `feat/e2-*` / `feat/e3-*`.
3. **Smoke local antes de abrir el PR.** Que tu HU corra de verdad contra el stack Docker (no en CI).
4. **Cita el artículo legal** (LOPSRM / RLOPSRM / LFD) en cada validación. Lo legal lo confirma el profe.
5. **Tablas y montaje de routers = Maiki.** No edites `schema.sql` ni `server.js`; manda el DDL del borrador.
6. **Avísale a Maiki directo cuando abras un PR**, y no lo mergees tú: él integra y despliega.

---

### Tarjeta de referencia rápida (el flujo completo, una vez configurado git)

```powershell
# Empezar una HU nueva
git checkout main
git pull origin main
git checkout -b feat/e2-mi-tarea     # o feat/e3-...

# ...trabajar con Claude Code; tras editar backend: docker restart sigecop_backend...
# ...smoke local en http://localhost:5173 ...

# Subir
git status
git add <archivos>
git commit -m "HU-XX: qué hiciste"
git push -u origin feat/e2-mi-tarea  # (-u solo la 1a vez; luego: git push)

# Abrir PR en GitHub (base: main ← compare: tu rama) y AVISARLE A MAIKI.

# Mantenerte al día (en tu rama, a diario):
git pull origin main
```

> ¿Algo de esta guía no coincide con lo que ves en tu máquina? **Avísale a Maiki** — se corrige aquí, no se inventa un atajo.
