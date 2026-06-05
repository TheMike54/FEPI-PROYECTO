// @ts-check
// E2E HU-Registro — Auto-registro de usuario con aprobación de la dependencia.
//
// A DIFERENCIA del resto de la suite (que usa el atajo demo sin backend), este
// spec ejercita el FLUJO REAL contra el backend: requiere el backend en :4000 y
// la BD levantados (entorno Docker local). Cubre el ciclo completo:
//
//   1. Una persona se auto-registra  → cuenta 'pendiente'.
//   2. Login del nuevo usuario        → RECHAZADO con "pendiente de aprobación".
//   3. Login como dependencia         → ve la solicitud y la aprueba (fija rol).
//   4. Login del usuario ya aprobado  → ENTRA al sistema.
//
// El email se genera con timestamp para que el test sea repetible (no choca con
// altas previas). Helpers comunes: ver frontend/e2e/_helpers.js.

import { test, expect } from '@playwright/test';
import { freshHome } from './_helpers.js';

// A diferencia del resto de la suite (solo-frontend), este spec necesita backend
// + BD vivos. En CI (GitHub Actions, sin Docker) no existen, así que se salta el
// archivo completo. En local (Docker arriba) sí corre.
test.skip(!!process.env.CI, 'requiere backend+BD; se corre en local');

const PWD_NUEVO = 'Test1234!';
const DEP_EMAIL = 'dependencia@sigecop.test';
const DEP_PWD = 'Sigecop2026!';

// alta-v2: se eliminó el toggle de modo; tras freshHome la pantalla de login ya se muestra
// directamente (no hace falta "entrar a modo aplicación").

/** Llena y envía el formulario de login real. */
async function loginReal(page, email, password) {
  await page.locator('#login-usuario').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

test('HU-Registro — auto-registro, rechazo por pendiente, aprobación y acceso', async ({ page }) => {
  const email = `nuevo.e2e.${Date.now()}@sigecop.test`;
  // Corrección profe (04-jun): el registro exige nombre + apellido(s) (≥2 palabras); "Usuario Prueba"
  // las cumple. El sufijo numérico (Date.now) solo hace único el valor mostrado en el header.
  const nombre = `Usuario Prueba ${Date.now()}`;

  await freshHome(page);

  // --- 1) Auto-registro ---------------------------------------------------
  await page.getByTestId('link-registro').click();
  await expect(page.getByTestId('form-registro')).toBeVisible();

  await page.getByTestId('reg-nombre').fill(nombre);
  await page.getByTestId('reg-email').fill(email);
  await page.getByTestId('reg-rol').selectOption('residente');
  await page.getByTestId('reg-password').fill(PWD_NUEVO);
  await page.getByTestId('reg-password2').fill(PWD_NUEVO);
  await page.getByTestId('reg-submit').click();

  // Vuelve al login mostrando que la cuenta quedó pendiente.
  const mensajeOk = page.getByTestId('auth-mensaje');
  await expect(mensajeOk).toBeVisible();
  await expect(mensajeOk).toHaveAttribute('data-tipo', 'exito');
  await expect(mensajeOk).toContainText('pendiente de aprobación por la dependencia');

  // --- 2) Login del nuevo usuario → rechazado por pendiente ---------------
  await loginReal(page, email, PWD_NUEVO);
  const mensajeErr = page.getByTestId('auth-mensaje');
  await expect(mensajeErr).toHaveAttribute('data-tipo', 'error');
  await expect(mensajeErr).toContainText('Tu cuenta está pendiente de aprobación por la dependencia');
  // No entró: la pantalla de login sigue presente.
  await expect(page.locator('#login-usuario')).toBeVisible();

  // --- 3) Login como dependencia -----------------------------------------
  await loginReal(page, DEP_EMAIL, DEP_PWD);
  // Entró: la pantalla de login desaparece.
  await expect(page.locator('#login-usuario')).toHaveCount(0);

  // Navega al panel de solicitudes vía Sidebar (navegación SPA).
  await page.locator('aside a[href="/usuarios/solicitudes"]').first().click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('solicitudes-panel')).toBeVisible();

  // Localiza la fila del nuevo usuario, asigna rol 'supervision' y aprueba.
  const fila = page.locator('[data-testid="fila-solicitud"]').filter({ hasText: email });
  await expect(fila).toHaveCount(1);
  await fila.getByTestId('select-rol').selectOption('supervision');
  await fila.getByTestId('btn-aprobar').click();

  // La fila ya no aparece entre las pendientes.
  await expect(
    page.locator('[data-testid="fila-solicitud"]').filter({ hasText: email })
  ).toHaveCount(0);

  // --- 4) El usuario aprobado ya puede entrar -----------------------------
  await page.getByRole('button', { name: 'Salir' }).click();
  await loginReal(page, email, PWD_NUEVO);

  // Entró al sistema: login fuera y el header muestra su nombre.
  await expect(page.locator('#login-usuario')).toHaveCount(0);
  await expect(page.getByText(nombre)).toBeVisible();
});

// Corrección profe (04-jun): el nombre completo (nombre + apellidos) aparece en la bitácora; no se
// admite registrarse con un solo nombre. Validación de cliente (espejo del candado del backend).
test('HU-Registro — el nombre debe incluir apellido(s): rechaza un solo nombre', async ({ page }) => {
  await freshHome(page);
  await page.getByTestId('link-registro').click();
  await expect(page.getByTestId('form-registro')).toBeVisible();

  await page.getByTestId('reg-nombre').fill('Iván');                 // un solo token → inválido
  await page.getByTestId('reg-email').fill(`solo.nombre.${Date.now()}@sigecop.test`);
  await page.getByTestId('reg-rol').selectOption('residente');
  await page.getByTestId('reg-password').fill(PWD_NUEVO);
  await page.getByTestId('reg-password2').fill(PWD_NUEVO);
  await page.getByTestId('reg-submit').click();

  // No envía: muestra error y sigue en el formulario de registro.
  await expect(page.getByTestId('registro-error')).toBeVisible();
  await expect(page.getByTestId('registro-error')).toContainText('apellido');
  await expect(page.getByTestId('form-registro')).toBeVisible();
});
