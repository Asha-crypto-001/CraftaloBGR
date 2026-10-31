# CraftaloBGR

*A background remover for designers.*

CraftaloBGR is a browser-based studio for removing image backgrounds, comparing cutouts, choosing a backdrop, and exporting images or ZIP archives. Background removal runs on the user's device with WebGPU or WASM.

## Requirements

- Node.js supported by the installed Vite release (Node.js 20.19+ or 22.12+).
- npm.
- A current Chromium-based browser for the tested workflows. Chrome is covered by the automated browser tests; Edge is a target but has not been independently validated.

## Run locally

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To create and inspect a production build:

```sh
npm run lint
npm test
npm run build
npm run test:e2e
npm run test:pwa
npm run preview
```

`npm run test:pwa` builds the app and runs production-preview tests in Chrome. It needs internet access to IMG.LY model assets and can take several minutes because it performs real model inference.

## Use the studio

1. Select or drop one or more supported image files.
2. Wait for on-device background removal to finish. You can compare the original and cutout, then choose a transparent, solid, gradient, or custom-image backdrop.
3. Export an individual result or a ZIP of results.
4. The 7680px option resamples the longest edge to 7680 pixels; it does not recover detail absent from the source image.

There are no configured file-size, pixel-dimension, or batch-count caps. Processing and export are therefore limited by available browser/device memory; very large images or batches may fail. Establish and enforce suitable limits before offering the app to a broad audience.

## Privacy and offline use

Image processing is performed in the browser. The app does not send selected image files to an application backend. On first processing, the browser downloads the AI model and runtime from `staticimgly.com`; those assets total about 100 MB for the default model and CPU runtime. The app does not work offline for AI processing until the required assets have been downloaded and cached successfully.

Chrome production-preview testing verified that, after a successful online model run, all expected model and CPU-WASM chunks were cached, the app reloaded offline, and a second local image completed inference. That two-inference workflow took about 4.1 minutes on the test machine; it is not a performance guarantee or a controlled benchmark.

Offline availability is not permanent: browser storage pressure can evict cached model files, and clearing site data removes them. Reconnect and process an image again to fetch the assets. Browser installation/update prompts and storage eviction have not been independently tested.

## Deployment

The Vite/PWA configuration supports a repository subpath through `VITE_BASE_PATH`; the default is `/`. The included GitHub Actions workflow derives the correct base path for a project Pages site and deploys the contents of `dist/` on pushes to `main`. Configure **Settings → Pages → Build and deployment → Source: GitHub Actions** in this repository. The workflow runs lint, unit tests, a production subpath smoke test, and the build before deployment.

For a project Pages site, the app URL is typically `https://OWNER.github.io/REPOSITORY/`. For a user/org Pages site or custom domain, define the repository Actions variable `PAGES_BASE_PATH` as `/`. Otherwise the workflow derives `/REPOSITORY/` automatically. To reproduce a project-site build locally in PowerShell:

```powershell
$env:VITE_BASE_PATH = "/REPOSITORY/"
npm run build
npm run test:pages
npm run preview
```

After the first successful deployment, check the Pages URL, manifest and icons, service-worker control, first-run model loading, and offline inference. The current app has no client-side routes beyond its home page.

## Troubleshooting

- **Model download fails or processing reports “Failed to fetch”:** reconnect to the internet, check that the network allows requests to `staticimgly.com`, ensure the browser has storage available, then retry processing.
- **AI processing is unavailable offline:** connect once and allow a full image-processing run to finish so all required assets can be cached. Do not clear the app's site data if you need the cached model.
- **A large image or batch fails:** there are no enforced input limits; reduce image dimensions or process fewer images at once to reduce memory pressure.
- **The Pages site is blank or assets return 404:** confirm Pages deployed the workflow artifact and that `VITE_BASE_PATH` matches the published URL prefix. For a custom domain or user/org Pages site, set `PAGES_BASE_PATH` to `/`.
- **Install or offline controls are unavailable:** confirm the site is served over HTTPS (or localhost during development), then reload and check that the service worker controls the page. Browser-managed install prompts vary by browser.

## Browser and validation status

- **Verified:** Chrome production preview, responsive UI checks at 320px and 1600px, four standard Playwright tests, and real online-then-offline inference in the PWA suite.
- **Not independently verified:** Microsoft Edge, Firefox, Safari, installed-app update prompts, storage-pressure eviction, and hosted HTTPS deployment.
- **Automated regression checks:** 27 unit/component tests; four standard Playwright tests; two production PWA tests. Lint and production build pass.
- **Image/export qualification:** automated unit tests cover utility behavior, but canvas pixels, encoded image downloads, and preview/export equivalence have not been comprehensively verified in a real browser.

## Release blockers and licensing

- **Complete the licensing review before public release.** The repository currently contains an MIT `LICENSE`, and the intended direction is a public release retaining `@imgly/background-removal`, whose package identifies itself as AGPL-3.0. The installed package's license is shipped at `node_modules/@imgly/background-removal/LICENSE.md`; its third-party notice identifies ISNET and ONNX Runtime under MIT. Have qualified counsel assess the repository's existing MIT terms against the dependency's license and the intended deployment/source obligations; this README is not legal advice. The existing license is preserved, but the application is not cleared for public release until this review is complete.
- **Resolve the production dependency audit.** `npm audit --omit=dev` reports two high-severity findings through the transitive `zod` dependency of `@imgly/background-removal`. npm's suggested automatic fix downgrades the AI package across a breaking version boundary. Do not apply that downgrade without compatibility and inference testing; assess a compatible vendor fix, a supported package upgrade, or an approved alternative.
- **Define device-appropriate input limits** and enforce them before image decoding/processing.
- **Enable Pages with GitHub Actions** in repository settings, then perform the hosted HTTPS/PWA/offline smoke checks. A repository now exists, but no production Pages URL has been verified.
- **Complete real-browser export validation** and verify supported browsers before making broader compatibility claims.

The repository is maintained as a prototype until these release gates are resolved. No deployment, release, or legal approval is implied by the local test results.
