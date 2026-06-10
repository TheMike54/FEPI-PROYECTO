# restore_render.ps1 — Restaura un dump (-Fc) a una instancia PostgreSQL (Render nueva o local)
#
# Uso:
#   .\backend\scripts\restore_render.ps1 -Dump "backend\backups\sigecop_render_20260609_120000.dump" -DestinoUrl "postgresql://usuario:pass@host/db_nueva"
#
# ⚠️ DESTRUCTIVO sobre la BD destino (usa --clean --if-exists: dropea y recrea los objetos del dump).
#    Pensado para una instancia NUEVA/VACÍA. Jamás apuntar -DestinoUrl a la BD de producción vigente
#    salvo que la intención sea exactamente reemplazarla (y con un backup fresco en la mano).
#
# Runbook completo: backend/scripts/backup_render.md

param(
    [Parameter(Mandatory = $true)][string]$Dump,
    [Parameter(Mandatory = $true)][string]$DestinoUrl,
    [string]$ImagenPg = "postgres:16-alpine"
)

$ErrorActionPreference = "Stop"

$archivo = Get-Item $Dump   # falla si no existe
$dir = $archivo.DirectoryName
$nombre = $archivo.Name

Write-Host "Restaurando $nombre -> instancia destino..." -ForegroundColor Cyan
Write-Host "(--clean --if-exists --no-owner --no-privileges; el rol destino pasa a ser dueño de todo)"

docker run --rm `
    -e PGSSLMODE=require `
    -v "${dir}:/backups" `
    $ImagenPg `
    pg_restore --clean --if-exists --no-owner --no-privileges -d "$DestinoUrl" "/backups/$nombre"

if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_restore terminó con código $LASTEXITCODE. Revisa los errores arriba (algunos 'does not exist' con --clean en BD vacía son normales si no usaste --if-exists, pero aquí va activado)."
}

Write-Host "OK: restore terminado. Verifica conteos con la consulta del runbook (sección 'Verificación')." -ForegroundColor Green
