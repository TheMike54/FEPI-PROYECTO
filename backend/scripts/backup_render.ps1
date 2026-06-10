# backup_render.ps1 — Respaldo de la BD PostgreSQL de Render (formato custom -Fc)
#
# Uso (desde la raíz del repo o desde backend/scripts/):
#   .\backend\scripts\backup_render.ps1                          # lee DATABASE_URL de backend/.env
#   .\backend\scripts\backup_render.ps1 -DatabaseUrl "postgresql://..."   # URL explícita
#   .\backend\scripts\backup_render.ps1 -Etiqueta "pre_migracion"        # sufijo en el nombre del archivo
#
# No requiere PostgreSQL instalado en Windows: usa la imagen postgres:16-alpine vía Docker.
# El dump queda en backend/backups/ (gitignored). NUNCA subir dumps al repo: traen datos reales.
#
# Runbook completo: backend/scripts/backup_render.md

param(
    [string]$DatabaseUrl = "",
    [string]$Etiqueta = "",
    # Debe ser >= a la versión del servidor (Render). Verificar con:
    #   docker run --rm postgres:16-alpine psql "<DATABASE_URL>" -tAc "SHOW server_version;"
    [string]$ImagenPg = "postgres:16-alpine"
)

$ErrorActionPreference = "Stop"

# Raíz del repo = dos niveles arriba de este script (backend/scripts/ -> backend/ -> raíz)
$raiz = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

# 1) Resolver DATABASE_URL (parámetro > backend/.env)
if (-not $DatabaseUrl) {
    $envFile = Join-Path $raiz "backend\.env"
    if (-not (Test-Path $envFile)) {
        Write-Error "No se pasó -DatabaseUrl y no existe backend\.env. Aborto."
    }
    $linea = Get-Content $envFile | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
    if (-not $linea) {
        Write-Error "backend\.env no contiene DATABASE_URL. Aborto."
    }
    $DatabaseUrl = ($linea -replace '^\s*DATABASE_URL\s*=\s*', '').Trim().Trim('"').Trim("'")
}
if (-not $DatabaseUrl) { Write-Error "DATABASE_URL vacío. Aborto." }

# 2) Carpeta de salida (gitignored)
$dirBackups = Join-Path $raiz "backend\backups"
if (-not (Test-Path $dirBackups)) { New-Item -ItemType Directory -Path $dirBackups | Out-Null }

# 3) Nombre del archivo: sigecop_render_YYYYMMDD_HHmmss[_etiqueta].dump
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$nombre = "sigecop_render_$stamp"
if ($Etiqueta) { $nombre = "${nombre}_$Etiqueta" }
$archivo = "$nombre.dump"

Write-Host "Respaldando BD de Render -> backend\backups\$archivo" -ForegroundColor Cyan

# 4) pg_dump en formato custom (-Fc: comprimido, restaurable selectivamente con pg_restore).
#    PGSSLMODE=require: Render exige SSL en conexiones externas (por si la URL no trae sslmode).
docker run --rm `
    -e PGSSLMODE=require `
    -v "${dirBackups}:/backups" `
    $ImagenPg `
    pg_dump "$DatabaseUrl" -Fc --no-owner --no-privileges -f "/backups/$archivo"

if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_dump terminó con código $LASTEXITCODE. El dump puede estar incompleto: revisa y reintenta."
}

# 5) Verificación mínima: el archivo existe, pesa > 0 y pg_restore puede listar su contenido
$info = Get-Item (Join-Path $dirBackups $archivo)
$kb = [math]::Round($info.Length / 1KB, 1)
docker run --rm -v "${dirBackups}:/backups" $ImagenPg pg_restore --list "/backups/$archivo" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "El dump existe pero pg_restore no puede leerlo (corrupto). NO confíes en este respaldo."
}

Write-Host "OK: $archivo ($kb KB) — dump válido (pg_restore --list lo lee)." -ForegroundColor Green
Write-Host "Restore: ver backend/scripts/backup_render.md (sección 'Restore a una instancia nueva')."
