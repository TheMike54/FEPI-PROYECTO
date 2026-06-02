# SIGECOP — Guía de arranque local (Windows, desde cero)

Para un compañero **nuevo** que clona el repo y quiere ver SIGECOP corriendo en su máquina Windows.
Sigue los pasos en orden. Cada comando está **verificado contra el repo** (2026-06-02). Si algo falla, ve a la sección 7 (Problemas comunes).

> **Lo único que de verdad necesitas instalar para que arranque es Docker Desktop.** La base de datos, el backend y el frontend corren TODOS dentro de Docker. Node, DBeaver y Claude Code son para trabajar/depurar después.

---

## 1. Instalar las herramientas

| Herramienta | Para qué | Cómo verificar (en PowerShell) |
|---|---|---|
| **Docker Desktop** (con WSL2) | Levanta toda la app (BD + backend + frontend) | `docker --version` y `docker compose version` |
| **Git** | Clonar el repo | `git --version` |
| **Node.js 20 LTS** | Trabajar el código fuera de Docker, instalar Claude Code | `node --version` (debe decir v20.x) y `npm --version` |
| **DBeaver Community** | Ver la base de datos con interfaz gráfica | App de escritorio (Ayuda ▸ Acerca de) |
| **Claude Code** | Asistente para programar tu HU | `claude --version` |

**Instalación:**
1. **Docker Desktop:** descárgalo de docker.com → instálalo → en el primer arranque acepta habilitar **WSL2** (Windows lo guía). Abre Docker Desktop y espera a que el ícono diga *"Engine running"*. **Debe quedar abierto** mientras trabajes.
2. **Git:** descárgalo de git-scm.com → instalación por defecto (Next, Next…).
3. **Node 20 LTS:** descárgalo de nodejs.org (botón **LTS**, versión 20). Verifica con `node --version`.
4. **DBeaver Community:** descárgalo de dbeaver.io (edición Community, gratis).
5. **Claude Code:** en PowerShell, con Node ya instalado:
   ```powershell
   npm install -g @anthropic-ai/claude-code
   ```
   Verifica con `claude --version`. (Si tu organización usa otro método de instalación, consúltalo con Maiki.)

---

## 2. Clonar el repo

En PowerShell, en la carpeta donde guardas tus proyectos:
```powershell
git clone https://github.com/TheMike54/FEPI-PROYECTO.git sigecop
cd sigecop
```
> Si el nombre del repo remoto es otro, pídeselo a Maiki. El **resto de la guía asume que estás dentro de la carpeta `sigecop/`** (la raíz del repo).

Estructura que vas a ver:
```
sigecop/
├── frontend/        # React + Vite (la interfaz)
├── backend/         # Node + Express + PostgreSQL (la API)
├── docs/            # documentación (incluida esta guía y tu prompt de equipo)
├── docker-compose.yml
├── CLAUDE.md        # reglas del proyecto — léelo
└── .env.example
```

---

## 3. Variables de entorno (`.env`)

**Para el arranque con Docker (lo recomendado) SOLO necesitas el `.env` de la raíz.** Cópialo del ejemplo:
```powershell
Copy-Item .env.example .env
```
Eso es todo. Los valores por defecto ya son los **locales correctos** (usuario `sigecop`, BD `sigecop_db`, puertos 5432/4000/5173). No tienes que cambiar nada para que arranque.

> ⚠️ **MUY IMPORTANTE — la `DATABASE_URL`:**
> - **NO existe ninguna `DATABASE_URL` en los `.env.example`, y así debe quedarse.** En local, el backend se conecta a la BD de Docker usando `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` (no una URL).
> - **NUNCA pongas la `DATABASE_URL` de Render en tu `.env` local.** Esa es la base de datos de producción. El `docker-compose.yml` incluso fuerza `DATABASE_URL=""` a propósito para evitar que alguien le pegue a Render sin querer.
> - Si ves una `DATABASE_URL` apuntando a `...onrender.com`, **bórrala de tu entorno local.**

Los archivos `backend/.env.example` y `frontend/.env.example` **solo** hacen falta si algún día corres el backend o el frontend **sin Docker** (a mano, con `node`/`npm`). Para esta guía (todo en Docker) **no los necesitas**.

---

## 4. Levantar todo con Docker

Con Docker Desktop abierto, desde la raíz del repo:
```powershell
docker compose up -d --build
```
La **primera vez tarda varios minutos** (descarga imágenes y hace `npm install` dentro de los contenedores). Levanta tres contenedores:

| Contenedor | Qué es | Puerto |
|---|---|---|
| `sigecop_db` | PostgreSQL 16 | 5432 |
| `sigecop_backend` | API Express (`node server.js`) | 4000 |
| `sigecop_frontend` | Vite dev server (React) | 5173 |

**¿Cómo se crea la base de datos?** La primera vez que arranca `sigecop_db` (con el volumen de datos vacío), PostgreSQL ejecuta automáticamente el esquema: el `docker-compose.yml` monta `backend/src/db/schema.sql` como `/docker-entrypoint-initdb.d/01_schema.sql`. Eso crea **todas las tablas + el seed demo** (4 usuarios y 1 contrato de prueba) en el primer arranque.

> Detalle técnico: el `init.js` / `RUN_MIGRATIONS=true` es el mecanismo que se usa **en Render** (producción), no en local. En tu máquina el esquema lo aplica el propio Postgres con el archivo montado. Resultado para ti: igual queda la BD lista sola en el primer `up`.

Ver que arrancaron bien (logs en vivo):
```powershell
docker compose logs -f
```
Busca en el backend la línea `[SIGECOP] Backend escuchando en http://localhost:4000`. Sal de los logs con `Ctrl+C` (eso **no** apaga los contenedores).

---

## 5. Backend y frontend en marcha

Ya están corriendo tras el paso 4. Dos cosas que **tienes que saber para trabajar**:

- **El frontend SÍ se auto-recarga** (Vite HMR, con polling ya configurado): editas un archivo en `frontend/src/` y el navegador se actualiza solo.
- **El backend NO se auto-recarga** (corre `node server.js`, sin watch). **Cada vez que edites algo en `backend/`**, reinícialo:
  ```powershell
  docker restart sigecop_backend
  ```
  (El código ya está dentro del contenedor por el bind-mount; solo falta reiniciar el proceso.)

Comandos útiles:
```powershell
docker compose ps                 # ver estado de los 3 contenedores
docker compose logs -f backend    # logs solo del backend
docker compose down               # apagar (CONSERVA la base de datos)
docker compose up -d              # volver a levantar (sin --build si no cambiaste Dockerfiles)
```

---

## 6. Verificar que todo funciona

**a) API viva** — abre en el navegador o en PowerShell:
```powershell
Invoke-RestMethod http://localhost:4000/api/health
```
Debe responder `status: ok`, `service: sigecop-backend`.

**b) Frontend** — abre en el navegador:
```
http://localhost:5173
```

**c) Login con cuenta demo** — en la pantalla de inicio de sesión usa cualquiera de las cuentas del seed (contraseña común **`Sigecop2026!`**):

| Correo | Rol |
|---|---|
| `residente@sigecop.test` | Residente |
| `contratista@sigecop.test` | Contratista / Superintendente |
| `supervision@sigecop.test` | Supervisión |
| `dependencia@sigecop.test` | Dependencia |

Si entras y ves el panel según el rol, **el camino completo (frontend → backend → BD) funciona**.

**d) Conectar DBeaver al PostgreSQL local** para ver las tablas:
1. DBeaver → **Nueva conexión** → **PostgreSQL**.
2. Datos (todos del `.env` local):
   | Campo | Valor |
   |---|---|
   | Host | `localhost` |
   | Port | `5432` |
   | Database | `sigecop_db` |
   | Username | `sigecop` |
   | Password | `sigecop_dev_2026` |
3. **Test Connection** → si pide descargar el driver de PostgreSQL, acepta. → **Finish**.
4. Expande la conexión → `sigecop_db` → `Schemas` → `public` → `Tables`. Debes ver `usuarios`, `contratos`, `contrato_conceptos`, `bitacora_notas`, `estimaciones`, `pagos`, etc. (16 tablas).

---

## 7. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `docker: command not found` o `Cannot connect to the Docker daemon` | Docker Desktop no está abierto | Abre Docker Desktop, espera a *"Engine running"*, reintenta. |
| `Error ... port is already allocated` (5432 / 4000 / 5173) | Otro programa usa ese puerto (p. ej. un Postgres local ya instalado ocupa el 5432) | Cierra el programa que lo usa, **o** cambia el puerto en tu `.env` (p. ej. `POSTGRES_PORT=5433`, `BACKEND_PORT=4001`, `FRONTEND_PORT=5174`) y vuelve a `docker compose up -d`. |
| El frontend abre pero **el login falla / no hay datos** | La BD se creó sin el esquema/seed (volumen viejo o esquema cambiado) | Re-inicializa la BD: `docker compose down -v` (esto **borra** la BD local) y luego `docker compose up -d --build`. El `-v` elimina el volumen para que el esquema+seed se vuelvan a aplicar. |
| Cambié `schema.sql` y **no veo el cambio** en la BD | El esquema solo se aplica al **crear** el volumen; un volumen ya existente no se re-inicializa | `docker compose down -v` y `docker compose up -d` (borra y recrea la BD local). *(En el equipo, los cambios reales de esquema los integra Maiki; ver `CLAUDE.md`.)* |
| Edité el backend y **no se reflejó** | El backend no auto-recarga | `docker restart sigecop_backend`. |
| `sigecop_backend` reinicia en bucle / no conecta a la BD | Arrancó antes que la BD | Suele resolverse solo (espera por healthcheck). Si no: `docker compose restart backend` y revisa `docker compose logs backend`. |
| El frontend tarda o no actualiza tras editar | Watcher de archivos en Windows/Docker | Ya está configurado con polling; si aún así no toma cambios, `docker restart sigecop_frontend`. |
| Avisos `LF will be replaced by CRLF` al usar git | Saltos de línea Windows | Es solo un aviso, no rompe nada. |

Para empezar de cero por completo (borra contenedores y la BD local):
```powershell
docker compose down -v
docker compose up -d --build
```

---

## 8. Ya está corriendo — a trabajar

1. Abre **Claude Code** en la **raíz** del repo (`sigecop/`):
   ```powershell
   claude
   ```
   Al arrancar ahí, lee automáticamente el **`CLAUDE.md`** (reglas del proyecto, **zona congelada** que no debes tocar, convenciones). Léelo tú también.
2. Abre **`docs/Prompts_Accion_Equipos_SIGECOP.md`** y **copia el prompt de TU equipo** (Equipo 2 o Equipo 3) y pégalo en Claude Code para arrancar tu HU.
3. Trabaja en tu rama (`feat/e2-*` o `feat/e3-*`), nunca directo en `main`. Antes de pedir merge: smoke local de tu HU (sección 6) y avísale a Maiki, que integra y despliega.

> **Recordatorio de oro:** no edites los archivos de la **zona congelada** (los del `CODEOWNERS` / §5 del plan). Si necesitas una tabla o un endpoint montado, **pídeselo a Maiki**.
