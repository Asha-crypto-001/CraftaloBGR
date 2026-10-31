import { expect, test } from '@playwright/test';

const modelAssetsBase =
  'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/';

test('pre-caches the app and serves downloaded model assets offline', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: /Remove backgrounds/ })
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller))
    )
    .toBe(true);

  const assetUrls = await page.evaluate(async base => {
    const metadataResponse = await fetch(new URL('resources.json', base));
    if (!metadataResponse.ok) {
      throw new Error(`Model metadata request failed: ${metadataResponse.status}`);
    }

    const resources = await metadataResponse.json();
    const model = resources['/models/isnet_fp16'];
    if (!model?.chunks?.length) {
      throw new Error('The default background-removal model has no cached chunks.');
    }

    const wasm = resources['/onnxruntime-web/ort-wasm-simd-threaded.wasm'];
    if (!wasm?.chunks?.length) {
      throw new Error('The CPU inference runtime has no cached chunks.');
    }

    const chunks = [
      model.chunks[0],
      wasm.chunks[wasm.chunks.length - 1],
    ];
    const assets = await Promise.all(
      chunks.map(async chunk => {
        const url = new URL(chunk.name, base).toString();
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Model asset request failed: ${response.status}`);
        }

        const blob = await response.blob();
        const expectedSize = chunk.offsets[1] - chunk.offsets[0];
        if (blob.size !== expectedSize) {
          throw new Error(
            `Model asset size mismatch: expected ${expectedSize}, got ${blob.size}`
          );
        }
        return url;
      })
    );
    return assets;
  }, modelAssetsBase);

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();
  const manifest = await page.evaluate(async href => {
    const response = await fetch(href!);
    if (!response.ok) throw new Error(`PWA manifest request failed: ${response.status}`);
    return response.json();
  }, manifestHref);
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: '/craftalo-icon-192.png', sizes: '192x192' }),
      expect.objectContaining({ src: '/craftalo-icon-512.png', sizes: '512x512' }),
    ])
  );

  const cachedAssets = await page.evaluate(async urls => {
    const cache = await caches.open('craftalo-model-assets-v1');
    return Promise.all(
      urls.map(async url => Boolean(await cache.match(url)))
    );
  }, assetUrls);
  expect(cachedAssets).toEqual([true, true]);

  await context.setOffline(true);
  const offlineResults = await page.evaluate(async urls => {
    return Promise.all(
      urls.map(async url => {
        const response = await fetch(url);
        return { ok: response.ok, size: (await response.blob()).size };
      })
    );
  }, assetUrls);
  expect(offlineResults.every(result => result.ok && result.size > 0)).toBe(true);

  await page.reload();
  await expect(
    page.getByRole('heading', { name: /Remove backgrounds/ })
  ).toBeVisible();
});

test('processes a local image again offline after the first real model run', async ({
  page,
  context,
}) => {
  test.setTimeout(10 * 60 * 1000);
  await page.goto('/');
  const samplePng = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(150, 150, 212, 280);
    ctx.fillStyle = '#f0c7a6';
    ctx.beginPath();
    ctx.arc(256, 125, 52, 0, Math.PI * 2);
    ctx.fill();
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const image = {
    name: 'local-offline-check.png',
    mimeType: 'image/png',
    buffer: Buffer.from(samplePng, 'base64'),
  };
  const assetFailures: string[] = [];
  page.on('requestfailed', request => {
    if (request.url().includes('staticimgly.com')) {
      assetFailures.push(`${request.url()}: ${request.failure()?.errorText}`);
    }
  });
  page.on('response', response => {
    if (response.url().includes('staticimgly.com') && response.status() >= 400) {
      assetFailures.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.locator('input[aria-label="Upload images"]').first().setInputFiles(image);
  const firstRun = await Promise.race([
    page
      .getByRole('slider', { name: 'Before and after comparison' })
      .waitFor({ state: 'visible', timeout: 8 * 60 * 1000 })
      .then(() => 'done'),
    page
      .getByRole('alert')
      .waitFor({ state: 'visible', timeout: 8 * 60 * 1000 })
      .then(async () => `error: ${await page.getByRole('alert').innerText()}`),
  ]);
  expect(firstRun, assetFailures.join('\n') || 'No IMG.LY network failure was recorded.').toBe(
    'done'
  );

  const modelChunks = await page.evaluate(async base => {
    const response = await fetch(new URL('resources.json', base));
    if (!response.ok) throw new Error(`Model metadata request failed: ${response.status}`);
    const resources = await response.json();
    return [
      ...resources['/models/isnet_fp16'].chunks,
      ...resources['/onnxruntime-web/ort-wasm-simd-threaded.wasm'].chunks,
    ].map(chunk => new URL(chunk.name, base).toString());
  }, modelAssetsBase);

  const cacheState = await page.evaluate(async urls => {
    const cache = await caches.open('craftalo-model-assets-v1');
    const cached = await Promise.all(urls.map(url => cache.match(url)));
    const estimate = await navigator.storage.estimate();
    return {
      expected: urls.length,
      cached: cached.filter(Boolean).length,
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
    };
  }, modelChunks);
  expect(cacheState.cached).toBe(cacheState.expected);
  expect(cacheState.usage).toBeGreaterThan(0);

  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: /Remove backgrounds/ })
  ).toBeVisible();
  await page.locator('input[aria-label="Upload images"]').first().setInputFiles(image);
  const offlineRun = await Promise.race([
    page
      .getByRole('slider', { name: 'Before and after comparison' })
      .waitFor({ state: 'visible', timeout: 8 * 60 * 1000 })
      .then(() => 'done'),
    page
      .getByRole('alert')
      .waitFor({ state: 'visible', timeout: 8 * 60 * 1000 })
      .then(async () => `error: ${await page.getByRole('alert').innerText()}`),
  ]);
  expect(offlineRun).toBe('done');
});
