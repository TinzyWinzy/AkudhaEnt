import { test, expect, type Route } from '@playwright/test';

const authedUser = {
  id: 'u1', organizationId: 'akudha', staffId: 'AKU-ADMIN', email: 'admin@akudha.test',
  name: 'Admin', role: 'super_admin', region: '', hubId: '',
};

async function stubApi(route: Route) {
  const url = route.request().url();
  const path = new URL(url).pathname;
  if (path === '/api/auth/me') {
    return route.fulfill({ status: route.request().method() === 'GET' && route.request().headers()['x-ok'] ? 200 : 401, contentType: 'application/json', body: JSON.stringify({ user: authedUser }) });
  }
  if (path === '/api/auth/login') {
    const body = route.request().postDataJSON();
    if (body && body.staffId === 'AKU-ADMIN' && body.pin === '208785') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: authedUser }) });
    }
    return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Invalid credentials' }) });
  }
  if (path.startsWith('/api/')) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: [], items: [], catalogue: null }) });
  }
  return route.continue();
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', stubApi);
});

test('landing page shows staff sign in entry', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Staff sign in' }).first()).toBeVisible();
});

test('sign in overlay validates id and pin before submit', async ({ page }) => {
  await page.goto('/sign-in').catch(() => {});
  await page.goto('/');
  await page.getByRole('button', { name: 'Staff sign in' }).first().click();
  await expect(page.getByText('Staff ID').first()).toBeVisible();
  await expect(page.getByPlaceholder('AKU-ADMIN')).toBeVisible();
  const submit = page.getByRole('button', { name: /Sign in securely/i });
  await expect(submit).toBeDisabled();
  await page.getByPlaceholder('AKU-ADMIN').fill('AKU-ADMIN');
  await page.locator('label:has-text("Six-digit PIN") input').fill('208785');
  await expect(submit).toBeEnabled();
});

test('successful login reaches the operations workspace', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Staff sign in' }).first().click();
  await page.getByPlaceholder('AKU-ADMIN').fill('AKU-ADMIN');
  await page.locator('label:has-text("Six-digit PIN") input').fill('208785');
  await page.getByRole('button', { name: /Sign in securely/i }).click();
  await expect(page).toHaveURL(/\/app/);
});
