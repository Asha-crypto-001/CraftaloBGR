import { removeBackground } from '@imgly/background-removal';

export interface RemoveProgressCallback {
  (stage: string, progress: number): void;
}

/**
 * Removes background using in-browser WebGPU / WASM AI model.
 * 100% Client-side, runs locally on visitor's device.
 */
export async function processBackgroundRemoval(
  imageFile: File,
  onProgress?: RemoveProgressCallback
): Promise<Blob> {
  const config = {
    progress: (key: string, current: number, total: number) => {
      const percent = total > 0 ? Math.round((current / total) * 100) : 0;
      let label = 'Processing AI segmentation...';
      if (key.includes('fetch')) {
        label = 'Loading AI model weights...';
      } else if (key.includes('compute')) {
        label = 'Executing neural network...';
      }
      if (onProgress) {
        onProgress(label, percent);
      }
    },
    output: {
      format: 'image/png' as const,
      quality: 1.0,
    }
  };

  try {
    const cutoutBlob = await removeBackground(imageFile, config);
    return cutoutBlob;
  } catch (err) {
    console.error('Background removal failed:', err);
    throw new Error(err instanceof Error ? err.message : 'AI background removal failed');
  }
}
