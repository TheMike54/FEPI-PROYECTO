# SIGECOP

**Sistema de Gestión Técnico-Administrativa de Contratos de Obra Pública.**
Proyecto académico — UAGRO · Etapa 1.
Cumple con LOPSRM (reforma DOF 14-11-2025) y RLOPSRM.

---

## 1. Tecnologías

| Capa | Stack |
|---|---|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 (JavaScript, no TS) |
| Router | React Router DOM v6 |
| Backend | Node.js 20 + Express 4 |
| Base de datos | PostgreSQL 16 |
| ORM/cliente | `pg` (native bindings node-postgres) |
| Auth | JWT + bcryptjs (esqueleto, lógica en Sprint 1) |
| Empaquetado | Docker + docker-compose |
| Despliegue | Render (config pendiente) |
| Control de versiones | Git + GitHub |

---

## 2. Requisitos previos

- **Node.js 20+** — https://nodejs.org/
- **Git** — https://git-scm.com/
- **Docker Desktop** (opcional, recomendado) — https://www.docker.com/products/docker-desktop/

> ⚠️ **Docker no está instalado en la máquina actual del setup.** Si quieres correr el stack completo con un solo comando (`docker-compose up`), instala Docker Desktop primero. Si prefieres trabajar bare-metal, revisa la sección **5. Levantar sin Docker**.

---

## 3. Instalación

```bash
git clone <url-del-repo> sigecop
cd sigecop
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Ajusta las contraseñas y el `JWT_SECRET` antes de levantar el stack.

---

## 4. Levantar con Docker (recomendado)

```bash
docker-compose up --build
```

Servicios:

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:4000 |
| Health check | http://localhost:4000/api/health |
| PostgreSQL | localhost:5432 (usuario/contraseña en `.env`) |

El `schema.sql` se aplica automáticamente la primera vez que se crea el volumen de la base de datos.

Para reiniciar la base de datos desde cero:

```bash
docker-compose down -v
docker-compose up --build
```

---

## 5. Levantar sin Docker (manual)

### 5.1 Base de datos

1. Instala PostgreSQL 16 localmente.
2. Crea la base de datos y el usuario:

   ```sql
   CREATE USER sigecop WITH PASSWORD 'sigecop_dev_2026';
   CREATE DATABASE sigecop_db OWNER sigecop;
   ```

3. Aplica el schema:

   ```bash
   psql -U sigecop -d sigecop_db -f backend/src/db/schema.sql
   ```

### 5.2 Backend

```bash
cd backend
npm install
npm run dev
```

Backend en http://localhost:4000.

### 5.3 Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend en http://localhost:5173.

---

## 6. Estructura

```
sigecop/
├── README.md
├── .gitignore
├── .env.example
├── docker-compose.yml
├── backend/
│   ├── package.json
│   ├── Dockerfile
│   ├── .env.example
│   ├── server.js                 # Entry point (Express en :4000)
│   └── src/
│       ├── routes/               # auth, contratos, bitacora
│       ├── controllers/          # esqueletos (501 Not Implemented)
│       ├── db/                   # pool.js, schema.sql + seed
│       └── middlewares/          # auth.middleware.js
└── frontend/
    ├── package.json
    ├── Dockerfile
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env.example
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx              # React Router: /, /login, /alta-contrato, /bitacora
        ├── styles/index.css     # @tailwind base/components/utilities
        ├── components/          # Login, AltaContrato, AperturaBitacora
        └── services/api.js      # fetch wrapper
```

---

## 7. Endpoints

| Método | Ruta | Estado | HU |
|---|---|---|---|
| GET | `/api/health` | ✅ 200 funcional | — |
| POST | `/api/auth/login` | 🟡 501 esqueleto | HU-00 |
| POST | `/api/contratos` | 🟡 501 esqueleto | HU-01 |
| GET | `/api/contratos` | 🟡 501 esqueleto | HU-01 |
| GET | `/api/contratos/:id` | 🟡 501 esqueleto | HU-01 |
| POST | `/api/bitacora/apertura` | 🟡 501 esqueleto | HU-08 |

---

## 8. Próximos pasos (Sprint 1)

- [ ] Implementar HU-00 (login con bcrypt + JWT real).
- [ ] Implementar HU-01 (alta de contrato con persistencia y validaciones).
- [ ] Implementar HU-08 (apertura formal de bitácora — 3 partes firmantes).
- [ ] Conectar el frontend con los endpoints reales.
- [ ] Pruebas unitarias backend (jest o vitest).
- [ ] Configurar despliegue en Render.

---

## 9. Convenciones del equipo

- **Idioma**: todo en español (commits, comentarios, variables salvo conflicto con frameworks).
- **Commits**: en español, imperativos. Ej. `feat(login): implementar verificación de credenciales`.
- **Ramas**: `feature/HU-XX-descripcion`, `fix/...`, `chore/...`.
- **PRs**: a `main` con revisión obligatoria de al menos 1 compañero del equipo.
- **No commitear**: `node_modules/`, `.env`, `dist/`, `build/`.

---

## 10. Equipo

Proyecto SIGECOP — UAGRO, Etapa 1.
