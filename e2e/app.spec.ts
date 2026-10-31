import { expect, test } from '@playwright/test';

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9ioAAAAASUVORK5CYII=',
  'base64'
);

async function mockBackgroundRemoval(page: import('@playwright/test').Page) {
  await page.route('**/src/utils/remover.ts', route =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `
        export async function processBackgroundRemoval(_file, onProgress) {
          onProgress?.('done', 100);
          return new Blob([Uint8Array.from(atob('${onePixelPng.toString('base64')}'), c => c.charCodeAt(0))], { type: 'image/png' });
        }
      `,
    })
  );
}

async function uploadUsingKeyboard(
  page: import('@playwright/test').Page,
  buttonName: string,
  fileName: string
) {
  const fileChooserPromise = page.waitForEvent('filechooser');
  const uploadButton = page.getByRole('button', { name: buttonName });
  await uploadButton.focus();
  await uploadButton.press('Enter');
  await (await fileChooserPromise).setFiles({
    name: fileName,
    mimeType: 'image/png',
    buffer: onePixelPng,
  });
}

test('keyboard users can open image selection and receive invalid-image feedback', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Remove backgrounds/ })
  ).toBeVisible();

  const dropzone = page.getByRole('button', { name: 'Choose image files' });
  await dropzone.focus();
  await expect(dropzone).toBeFocused();

  const fileChooserPromise = page.waitForEvent('filechooser');
  await dropzone.press('Enter');
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not an image'),
  });

  await expect(page.getByRole('alert')).toContainText(
    'broken.png: Could not read image'
  );
});

test('landing content remains usable at a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Remove backgrounds/ })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Choose image files' })
  ).toBeVisible();
  await expect(page.getByRole('img', { name: 'Craftalo' }).first()).toBeVisible();

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    root: document.querySelector('#root')?.getBoundingClientRect().width ?? 0,
    headline: document.querySelector('h1')?.getBoundingClientRect().width ?? 0,
    eyebrow: document.querySelector('section .uppercase')?.getBoundingClientRect().width ?? 0,
    headerAction: document.querySelector('header button:not([aria-label])')?.getBoundingClientRect().right ?? 0,
    headerLogo: document.querySelector('header img')?.getBoundingClientRect().left ?? 0,
  }));
  expect(layout.document).toBeLessThanOrEqual(layout.viewport);
  expect(layout.root).toBeGreaterThanOrEqual(layout.viewport - 1);
  expect(layout.headline).toBeLessThanOrEqual(layout.viewport);
  expect(layout.eyebrow).toBeLessThanOrEqual(layout.viewport);
  expect(layout.headerAction).toBeLessThanOrEqual(layout.viewport);
  expect(layout.headerLogo).toBeGreaterThanOrEqual(0);
});

test('studio fills the desktop width and stays within a narrow mobile viewport', async ({
  page,
}) => {
  await page.route(/^https?:\/\//, route =>
    new URL(route.request().url()).hostname === '127.0.0.1'
      ? route.continue()
      : route.abort()
  );
  await mockBackgroundRemoval(page);

  for (const width of [320, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.locator('input[aria-label="Upload images"]').first().setInputFiles({
      name: 'pixel.png',
      mimeType: 'image/png',
      buffer: onePixelPng,
    });

    const studio = page.locator('main#studio');
    await expect(studio).toBeVisible();
    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      studio: document.querySelector('main#studio')?.getBoundingClientRect().width ?? 0,
    }));
    expect(layout.document).toBeLessThanOrEqual(layout.viewport);
    expect(layout.studio).toBeGreaterThan(layout.viewport * 0.9);
  }
});

test('users can compare, change backdrop, and download one image and a batch', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await mockBackgroundRemoval(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  await uploadUsingKeyboard(page, 'Choose image files', 'first.png');

  const comparison = page.getByRole('slider', { name: 'Before and after comparison' });
  await expect(comparison).toBeVisible();
  await comparison.focus();
  await comparison.press('ArrowRight');
  await expect(comparison).toHaveAttribute('aria-valuenow', '55');

  const gradientMode = page.getByRole('button', { name: 'Use Gradient backdrop' });
  await gradientMode.focus();
  await gradientMode.press('Enter');
  await expect(gradientMode).toHaveAttribute('aria-pressed', 'true');
  const aurora = page.getByRole('button', { name: 'Use Aurora gradient' });
  await aurora.focus();
  await aurora.press('Enter');
  await expect(aurora).toHaveAttribute('aria-pressed', 'true');

  await uploadUsingKeyboard(page, 'Add more images', 'second.png');

  const secondQueueItem = page.getByRole('button', {
    name: 'Select second.png, processed',
  });
  await expect(secondQueueItem).toBeVisible();
  await secondQueueItem.focus();
  await secondQueueItem.press('Enter');
  await expect(secondQueueItem).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('slider', { name: 'Before and after comparison' })).toBeVisible();

  await uploadUsingKeyboard(page, 'Add more images', 'remove-me.png');
  const thirdQueueItem = page.getByRole('button', {
    name: 'Select remove-me.png, processed',
  });
  await expect(thirdQueueItem).toBeVisible();
  const removeThird = page.getByRole('button', {
    name: 'Remove remove-me.png from queue',
  });
  await removeThird.focus();
  await removeThird.press('Enter');
  await expect(thirdQueueItem).toHaveCount(0);

  const webpFormat = page.getByRole('button', { name: 'Export as WEBP' });
  await webpFormat.focus();
  await webpFormat.press('Enter');
  await expect(webpFormat).toHaveAttribute('aria-pressed', 'true');
  const pngFormat = page.getByRole('button', { name: 'Export as PNG' });
  await pngFormat.focus();
  await pngFormat.press('Enter');
  await expect(pngFormat).toHaveAttribute('aria-pressed', 'true');

  const singleDownload = page.waitForEvent('download');
  const downloadButton = page.getByRole('button', { name: 'Download PNG' });
  await downloadButton.focus();
  await downloadButton.press('Enter');
  expect((await singleDownload).suggestedFilename()).toBe('second_composite.png');

  const resolutionToggle = page.getByRole('button', {
    name: 'Scale long edge to 7680 pixels',
  });
  await resolutionToggle.focus();
  await resolutionToggle.press('Enter');
  const originalResolution = page.getByRole('button', {
    name: 'Use original resolution',
  });
  await expect(originalResolution).toHaveAttribute('aria-pressed', 'true');
  await originalResolution.focus();
  await originalResolution.press('Enter');

  const zipDownload = page.waitForEvent('download');
  const batchDownloadButton = page.getByRole('button', { name: 'Download all (2)' });
  await batchDownloadButton.focus();
  await batchDownloadButton.press('Enter');
  expect((await zipDownload).suggestedFilename()).toMatch(/^CraftaloBGR_batch_.*\.zip$/);
});
