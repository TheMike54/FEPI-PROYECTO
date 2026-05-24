// @ts-check
// E2E HU-11 — Minutas, agenda de visitas y consulta de acuerdos.
//
// Esta suite verifica que la vista respeta el contrato de modos/permisos:
//   - MODO PROYECTO: la card aparece con badge Sprint 7, las 3 pestanas funcionan,
//     el estado de cada formulario PERSISTE al cambiar de pestana (estado en el
//     padre — Tabs desmonta el contenido inactivo), y los criterios de aceptacion
//     se muestran al pie.
//   - MODO APLICACION: las 5 reglas de PERMISOS[HU-11]:
//       residente   -> ejecuta (forms editables)
//       contratista -> consulta (forms en RegionEditable disabled, filtro de
//                                Acuerdos sigue funcionando — NO va envuelto)
//       supervision -> consulta (igual que contratista)
//       dependencia -> sin acceso (no aparece en Sidebar ni en Inicio)
//       finanzas    -> sin acceso
//     Ademas la metadata academica (badge HU/Sprint, "Rol: X", Criterios) se
//     oculta en modo aplicacion.
//
// REGLAS portadas del script Python original (los 3 fixes valiosos):
//   1. Para asertar la card de Inicio se acota a `main a[href=...]` porque el
//      Sidebar tambien tiene un enlace al mismo path.
//   2. El aviso de solo-lectura dice "solo consulta" (no "solo lectura").
//   3. NUNCA se usa page.goto() para moverse entre vistas; eso provoca un full
//      reload que resetea SesionContext a (modo='proyecto', rol=null) y los
//      tests de rol acabarian midiendo modo proyecto. Para navegar entre vistas
//      se hace click en el NavLink del Sidebar (navegacion SPA).

import { test, expect } from '@playwright/test';

const VIEW_PATH = '/bitacora/minutas';

/**
 * Devuelve a "/" con un reload total (deja el contexto limpio: modo=proyecto,
 * rol=null). Solo se usa al inicio de cada test, no para moverse entre vistas.
 */
async function freshHome(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/**
 * En modo proyecto, cambia a "Modo aplicacion" y elige el rol indicado en
 * SeleccionRol. Todo SPA — sin page.goto entre vistas.
 */
async function enterAppMode(page, rolNombre) {
  await page.getByRole('button', { name: 'Modo aplicación' }).first().click();
  // SeleccionRol intercepta porque rol === null. Cada rol es un <button> que
  // contiene un <h3> con el nombre.
  await page
    .locator('button')
    .filter({ has: page.locator('h3', { hasText: rolNombre }) })
    .first()
    .click();
  await page.waitForLoadState('networkidle');
}

/**
 * Click SPA en el enlace del Sidebar para entrar a /bitacora/minutas. Asume
 * que el enlace existe (es decir, el rol tiene permiso).
 */
async function goToMinutasViaSidebar(page) {
  await page.locator(`aside a[href="${VIEW_PATH}"]`).first().click();
  await page.waitForLoadState('networkidle');
}

// ---------------------------------------------------------------------------
// MODO PROYECTO
// ---------------------------------------------------------------------------

test.describe('HU-11 — modo proyecto', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    // Asegurarnos de estar en modo proyecto (initial state, pero idempotente).
    await page.getByRole('button', { name: 'Modo proyecto' }).first().click();
  });

  test('card de Inicio muestra HU-11 + Sprint 7', async ({ page }) => {
    const card = page.locator(`main a[href="${VIEW_PATH}"]`).first();
    await expect(card).toBeVisible();
    const text = (await card.textContent()) ?? '';
    expect(text).toContain('HU-11');
    expect(text).toContain('Sprint 7');
    expect(text).toContain('Minutas y agenda de visitas');
  });

  test('sidebar contiene enlace a la vista', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`).first()).toBeVisible();
  });

  test('la vista carga con badge, subtitulo y 3 pestanas', async ({ page }) => {
    await goToMinutasViaSidebar(page);

    await expect(page.getByRole('heading', { name: 'Minutas y agenda de visitas' })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-11' }).first()).toBeVisible();
    await expect(page.locator('span', { hasText: 'Sprint 7' }).first()).toBeVisible();
    await expect(page.getByText('Rol: Residente')).toBeVisible();

    for (const tab of ['Minutas', 'Agenda de visitas', 'Acuerdos']) {
      await expect(page.locator('button', { hasText: tab }).first()).toBeVisible();
    }
  });

  test('estado de cada pestana persiste al cambiar de pestana', async ({ page }) => {
    await goToMinutasViaSidebar(page);

    // Capturar valores en Minutas (pestana activa por defecto).
    const temaMinuta = page.locator('input[placeholder*="Reunión de avance"]').first();
    const asistentesMinuta = page.locator('input[placeholder*="Residente, Supervisión"]').first();
    await temaMinuta.fill('TEST PERSISTENCIA');
    await asistentesMinuta.fill('Persona X, Persona Y');

    // Cambiar a Visitas y capturar.
    await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();
    const objetivoVisita = page.locator('textarea[placeholder*="Descripción breve"]').first();
    await expect(objetivoVisita).toBeVisible();
    await objetivoVisita.fill('Objetivo de prueba');

    // Pasar por Acuerdos (no captura, pero verificamos que la pestana se monta).
    await page.locator('button', { hasText: 'Acuerdos' }).first().click();
    await expect(page.getByRole('heading', { name: 'Acuerdos y compromisos' })).toBeVisible();

    // Volver a Minutas — los inputs deben conservar lo escrito.
    await page.locator('button', { hasText: 'Minutas' }).first().click();
    await expect(page.locator('input[placeholder*="Reunión de avance"]').first()).toHaveValue('TEST PERSISTENCIA');
    await expect(page.locator('input[placeholder*="Residente, Supervisión"]').first()).toHaveValue('Persona X, Persona Y');

    // Volver a Visitas — la textarea tambien.
    await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();
    await expect(page.locator('textarea[placeholder*="Descripción breve"]').first()).toHaveValue('Objetivo de prueba');
  });

  test('criterios de aceptacion visibles al pie', async ({ page }) => {
    await goToMinutasViaSidebar(page);
    // El heading 'Criterios de aceptación' es unico; el Sidebar tiene una
    // mencion en la leyenda que no debe contar como visibility de la seccion.
    await expect(page.getByRole('heading', { name: 'Criterios de aceptación' })).toBeVisible();
    await expect(page.getByText('Las minutas y visitas registradas son visibles')).toBeVisible();
    await expect(page.getByText('Se pueden consultar los acuerdos y compromisos')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// MODO APLICACION — los 5 roles
// ---------------------------------------------------------------------------

test.describe('HU-11 — modo aplicacion (Residente: ejecuta)', () => {
  test.beforeEach(async ({ page }) => {
    await freshHome(page);
    await enterAppMode(page, 'Residente de obra');
  });

  test('sidebar muestra HU-11 y la vista carga sin metadata academica', async ({ page }) => {
    await expect(page.locator(`aside a[href="${VIEW_PATH}"]`).first()).toBeVisible();
    await goToMinutasViaSidebar(page);

    await expect(page.getByRole('heading', { name: 'Minutas y agenda de visitas' })).toBeVisible();
    await expect(page.locator('span', { hasText: 'HU-11' })).toHaveCount(0);
    await expect(page.locator('span', { hasText: 'Sprint 7' })).toHaveCount(0);
    await expect(page.getByText('Criterios de aceptación')).toHaveCount(0);
    await expect(page.getByText('Rol: Residente')).toHaveCount(0);
  });

  test('forms de Minutas y Visitas son editables; sin aviso de solo consulta', async ({ page }) => {
    await goToMinutasViaSidebar(page);

    const temaMinuta = page.locator('input[placeholder*="Reunión de avance"]').first();
    await expect(temaMinuta).toBeEnabled();

    await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();
    await expect(page.locator('textarea[placeholder*="Descripción breve"]').first()).toBeEnabled();

    await expect(page.getByText('solo consulta')).toHaveCount(0);
  });
});

for (const rol of [
  { nombre: 'Contratista / Superintendente', alias: 'Contratista' },
  { nombre: 'Supervisión',                    alias: 'Supervisión' },
]) {
  test.describe(`HU-11 — modo aplicacion (${rol.alias}: consulta)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.nombre);
    });

    test('aviso de solo consulta visible; forms de captura deshabilitados', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`).first()).toBeVisible();
      await goToMinutasViaSidebar(page);

      await expect(page.getByText('solo consulta')).toBeVisible();

      const temaMinuta = page.locator('input[placeholder*="Reunión de avance"]').first();
      await expect(temaMinuta).toBeDisabled();

      await page.locator('button', { hasText: 'Agenda de visitas' }).first().click();
      await expect(page.locator('textarea[placeholder*="Descripción breve"]').first()).toBeDisabled();
    });

    test('pestana Acuerdos es consultable: el filtro de periodo sigue editable', async ({ page }) => {
      await goToMinutasViaSidebar(page);
      await page.locator('button', { hasText: 'Acuerdos' }).first().click();

      const periodo = page.locator('select').first();
      await expect(periodo).toBeEnabled();

      await periodo.selectOption({ label: 'Junio 2026' });
      await expect(page.getByText('Sin acuerdos para el periodo seleccionado')).toBeVisible();

      await periodo.selectOption({ label: 'Mayo 2026' });
      await expect(page.locator('table tbody tr')).toHaveCount(3);
    });
  });
}

for (const rol of [
  { nombre: 'Dependencia / Contratante', alias: 'Dependencia' },
  { nombre: 'Finanzas',                   alias: 'Finanzas' },
]) {
  test.describe(`HU-11 — modo aplicacion (${rol.alias}: sin acceso)`, () => {
    test.beforeEach(async ({ page }) => {
      await freshHome(page);
      await enterAppMode(page, rol.nombre);
    });

    test('HU-11 NO aparece ni en Sidebar ni en Inicio', async ({ page }) => {
      await expect(page.locator(`aside a[href="${VIEW_PATH}"]`)).toHaveCount(0);
      await expect(page.locator(`main a[href="${VIEW_PATH}"]`)).toHaveCount(0);
    });
  });
}
