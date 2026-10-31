import { expect, test } from '@playwright/test';

const basePath = process.env.VITE_BASE_PATH ?? '/craftalo-pages-test/';

test('loads the app, manifest, and service worker under a Pages subpath', async ({
  page,
}) => {
  await page.goto('./');
  await expect(
    page.getByRole('heading', { name: /Remove backgrounds/ })
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByRole('img', { name: 'Craftalo' })
        .first()
        .evaluate(image => (image as HTMLImageElement).naturalWidth)
    )
    .toBeGreaterThan(0);

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toContain(basePath);
  const manifest = await page.evaluate(async href => {
    const response = await fetch(href!);
    if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
    return response.json();
  }, manifestHref);
  expect(manifest.start_url).toBe(basePath);
  expect(manifest.scope).toBe(basePath);
  expect(manifest.icons.every((icon: { src: string }) =>
    icon.src.startsWith(basePath)
  )).toBe(true);

  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller))
    )
    .toBe(true);
});
