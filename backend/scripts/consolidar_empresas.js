#!/usr/bin/env node
// =====================================================================
// FASE 3 (revisión profe 15-jun) — CONSOLIDAR EMPRESAS DUPLICADAS.
// El catálogo (O3) ya deduplica al registrar, pero pueden haber quedado duplicados ANTERIORES con
// variantes que la normalización débil no fundía (acentos, "SA de CV", puntuación). Este script
// agrupa las empresas por su forma FUERTE (la misma de empresas.controller.js), elige una CANÓNICA
// por grupo (la de menor id), REAPUNTA usuarios.empresa_id a la canónica y BORRA las duplicadas.
//
// Uso (desde backend/):
//   node scripts/consolidar_empresas.js            # DRY-RUN: solo reporta qué uniría (no cambia nada)
//   node scripts/consolidar_empresas.js --apply     # APLICA los cambios (en una transacción)
//
// Idempotente: tras --apply no quedan grupos con >1 → re-ejecutar no hace nada. NO borra a ciegas:
// reapunta usuarios primero y solo borra empresas sin referencias. Local usa DB_* (docker), Render
// usa DATABASE_URL. Solo Maiki lo corre en Render (runbook: backup → consolidar → verificar).
// Reglas de normalización (qué variantes se consideran "la misma empresa"): criterio del equipo
// (default conservador) — une solo variantes obvias: mayúsculas/acentos/puntuación/sufijos de razón
// social, para evitar fusionar empresas realmente distintas.
// =====================================================================
const { pool } = require('../src/db/pool');
const { normalizarNombreEmpresaFuerte } = require('../src/controllers/empresas.controller');

const APPLY = process.argv.includes('--apply');

async function main() {
  const { rows: empresas } = await pool.query('SELECT id, nombre FROM empresas ORDER BY id ASC');
  const { rows: usuarios } = await pool.query('SELECT empresa_id, COUNT(*)::int AS n FROM usuarios WHERE empresa_id IS NOT NULL GROUP BY empresa_id');
  const usuariosPorEmpresa = new Map(usuarios.map((u) => [u.empresa_id, u.n]));

  // Agrupar por forma FUERTE.
  const grupos = new Map(); // norma -> [{id, nombre}]
  for (const e of empresas) {
    const k = normalizarNombreEmpresaFuerte(e.nombre);
    if (!k) continue; // nombre vacío tras normalizar: no se toca
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(e);
  }

  const aConsolidar = [...grupos.entries()].filter(([, lista]) => lista.length > 1);

  console.log(`\n[consolidar_empresas] ${empresas.length} empresas, ${grupos.size} formas únicas, ${aConsolidar.length} grupos con duplicados.`);
  if (aConsolidar.length === 0) {
    console.log('Nada que consolidar. ✓');
    await pool.end();
    return;
  }

  const plan = [];
  for (const [norma, lista] of aConsolidar) {
    lista.sort((a, b) => a.id - b.id);
    const canonica = lista[0];
    const dups = lista.slice(1);
    console.log(`\n  · «${norma}»  → canónica #${canonica.id} "${canonica.nombre}" (${usuariosPorEmpresa.get(canonica.id) || 0} usuarios)`);
    for (const d of dups) {
      console.log(`      une  #${d.id} "${d.nombre}" (${usuariosPorEmpresa.get(d.id) || 0} usuarios) → #${canonica.id}`);
      plan.push({ canonica: canonica.id, dup: d.id });
    }
  }

  if (!APPLY) {
    console.log(`\nDRY-RUN: no se aplicó nada. Re-ejecuta con --apply para consolidar ${plan.length} empresa(s) duplicada(s).\n`);
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let usuariosMovidos = 0;
    for (const { canonica, dup } of plan) {
      const up = await client.query('UPDATE usuarios SET empresa_id = $1 WHERE empresa_id = $2', [canonica, dup]);
      usuariosMovidos += up.rowCount;
      await client.query('DELETE FROM empresas WHERE id = $1', [dup]);
    }
    await client.query('COMMIT');
    console.log(`\n✓ APLICADO: ${plan.length} empresa(s) duplicada(s) eliminada(s); ${usuariosMovidos} usuario(s) reapuntado(s) a su canónica.\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n✗ Error: se hizo ROLLBACK, no se cambió nada.\n', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
