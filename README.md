## Levantar localmente

Requisitos: Docker Desktop + WSL2 (Windows) o Docker Engine (Linux/Mac).

```bash
cp .env.example .env
docker compose up -d --build
```

Verificación:
- Frontend: http://localhost:5173
- API REST: http://localhost:4000/api/health

## Entregables documentales

La versión final de cada archivo se encuentra en `/docs`.
Ver `docs/README.md` para el índice completo.
