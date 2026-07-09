import { expect, test } from '@playwright/test';

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.PERF_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.PERF_ADMIN_PASSWORD || '';
const TENANT_SLUG = process.env.PERF_TENANT_SLUG || 'barberia-demo-wegox';

test.describe('performance critical flows', () => {
  test('public booking page reaches interactive booking flow', async ({ page }) => {
    const response = await page.goto(`${FRONTEND_BASE_URL}/book/${TENANT_SLUG}`, {
      waitUntil: 'networkidle',
    });

    expect(response?.ok()).toBeTruthy();
    await expect(page.getByText(/reserva online/i)).toBeVisible();
    await expect(page.getByText(/selecciona servicios/i)).toBeVisible();
  });

  test('admin login reaches dashboard', async ({ page }) => {
    test.skip(
      !ADMIN_EMAIL || !ADMIN_PASSWORD,
      'PERF_ADMIN_EMAIL y PERF_ADMIN_PASSWORD son requeridos.',
    );

    await page.goto(FRONTEND_BASE_URL, { waitUntil: 'networkidle' });
    await page.getByLabel(/email|correo/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/contraseña|password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /iniciar sesión|entrar/i }).click();

    await page.waitForURL(/dashboard|bookings|settings/, { timeout: 30000 });
    await expect(page.locator('body')).toContainText(/panel|dashboard|bienvenido/i);
  });

  test('admin bookings table and calendar are usable', async ({ page }) => {
    test.skip(
      !ADMIN_EMAIL || !ADMIN_PASSWORD,
      'PERF_ADMIN_EMAIL y PERF_ADMIN_PASSWORD son requeridos.',
    );

    await page.goto(FRONTEND_BASE_URL, { waitUntil: 'networkidle' });
    await page.getByLabel(/email|correo/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/contraseña|password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /iniciar sesión|entrar/i }).click();
    await page.waitForURL(/dashboard|bookings|settings/, { timeout: 30000 });

    await page.goto(`${FRONTEND_BASE_URL}/bookings`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /citas/i })).toBeVisible();
    await page.getByRole('button', { name: /calendario/i }).click();
    await expect(page.getByText(/agenda visual/i)).toBeVisible();
    await page.getByRole('button', { name: /día/i }).click();
    await expect(page.getByText(/día seleccionado/i)).toBeVisible();
  });
});
