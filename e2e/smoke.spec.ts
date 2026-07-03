import { test, expect } from '@playwright/test';

// Public-surface smoke tests. All Convex requests are aborted so the run
// is deterministic and never reads from or writes to the real backend —
// these prove the app shell, routing, and PWA plumbing survive a deploy.
test.beforeEach(async ({ page }) => {
  await page.route(/convex\.cloud/, route => route.abort());
});

test('landing page renders the app shell', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Noodle Quest/);
  // The router mounts something — root is not empty
  await expect(page.locator('#root > *').first()).toBeVisible();
});

test('auth screen is reachable and offers sign-up when no players load', async ({ page }) => {
  await page.goto('/auth');
  // With the backend blocked the profile picker can't load players, but
  // the screen itself must render rather than crash.
  await expect(page.locator('#root > *').first()).toBeVisible();
});

test('PWA manifest and service worker are served', async ({ page, request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).name).toBe('Noodle Quest');

  const sw = await request.get('/sw.js');
  expect(sw.ok()).toBeTruthy();

  await page.goto('/');
  const link = page.locator('link[rel="manifest"]');
  await expect(link).toHaveAttribute('href', '/manifest.webmanifest');
});

test('scrabble dictionaries are published', async ({ request }) => {
  for (const file of ['/dict/en-intl.txt', '/dict/en-na.txt']) {
    const res = await request.get(file);
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text.length).toBeGreaterThan(100_000);
  }
});

test('unknown routes fall back to the SPA shell', async ({ page }) => {
  await page.goto('/definitely-not-a-route');
  await expect(page.locator('#root > *').first()).toBeVisible();
});

test('3D games boot on the QA route (WebGL smoke)', async ({ page }) => {
  // Score Four: start screen → canvas appears once WebGL initialises
  await page.goto('/qa/play/score-four');
  await page.getByRole('button', { name: /start game/i }).click();
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });

  // Cube Twist: scramble → canvas + move buttons
  await page.goto('/qa/play/cube-twist');
  await page.getByRole('button', { name: /scramble & start/i }).click();
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('group', { name: /face turns/i })).toBeVisible();
});

test('cube twist face buttons register moves', async ({ page }) => {
  await page.goto('/qa/play/cube-twist');
  await page.getByRole('button', { name: /scramble & start/i }).click();
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: /^turn top face$/i }).click();
  await expect(page.getByText(/moves: 1/i)).toBeVisible({ timeout: 5_000 });
});
