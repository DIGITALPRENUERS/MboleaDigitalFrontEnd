import { test, expect } from '@playwright/test';

test.describe('Portal and login', () => {
  test('unauthenticated visit to / redirects to login and shows sign in form', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /Sign in to the portal/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
  });

  test('login page renders and has sign in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Sign in to the portal/i })).toBeVisible();
    await expect(page.getByLabel(/Email/i).or(page.getByPlaceholder('you@example.com'))).toBeVisible();
    await expect(page.getByLabel(/Password/i).or(page.getByPlaceholder('••••••••'))).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
  });

  test('invalid login shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('bad@test.com');
    await page.getByPlaceholder('••••••••').fill('wrong');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 8000 });
  });

  test('signup page loads and has partner registration', async ({ page }) => {
    await page.goto('/signup');
    await expect(
      page.getByRole('heading', { name: /get access|request access|register|partner/i })
    ).toBeVisible({ timeout: 5000 });
  });
});
