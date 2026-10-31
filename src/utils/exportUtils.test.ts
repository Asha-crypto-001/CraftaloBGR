import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImageItem } from '../types';
import { createImageExportBlob } from './exportUtils';
import { generateCompositeBlob, resampleTo8K } from './imageUtils';

vi.mock('./imageUtils', () => ({
  generateCompositeBlob: vi.fn(),
  resampleTo8K: vi.fn(),
}));

function processedItem(): ImageItem {
  return {
    id: 'item-1',
    name: 'portrait.png',
    originalFile: new File(['image'], 'portrait.png', { type: 'image/png' }),
    originalUrl: 'blob:original',
    originalWidth: 100,
    originalHeight: 50,
    cutoutUrl: 'blob:cutout',
    status: 'done',
    progress: 100,
  };
}

describe('createImageExportBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('exports at original resolution without allocating a temporary URL', async () => {
    const blob = new Blob(['export']);
    vi.mocked(generateCompositeBlob).mockResolvedValue(blob);
    const createObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });

    const result = await createImageExportBlob(
      processedItem(),
      { type: 'transparent' },
      'png',
      'original'
    );

    expect(result).toBe(blob);
    expect(generateCompositeBlob).toHaveBeenCalledWith(
      'blob:cutout',
      { type: 'transparent' },
      undefined,
      undefined,
      'png'
    );
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('revokes the 8K temporary URL when compositing fails', async () => {
    const temporaryUrl = 'blob:temporary';
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => temporaryUrl),
      revokeObjectURL,
    });
    vi.mocked(resampleTo8K).mockResolvedValue(new Blob(['resampled']));
    vi.mocked(generateCompositeBlob).mockRejectedValue(new Error('Canvas failed'));

    await expect(
      createImageExportBlob(
        processedItem(),
        { type: 'transparent' },
        'png',
        '8k'
      )
    ).rejects.toThrow('Canvas failed');

    expect(generateCompositeBlob).toHaveBeenCalledWith(
      temporaryUrl,
      { type: 'transparent' },
      undefined,
      undefined,
      'png'
    );
    expect(revokeObjectURL).toHaveBeenCalledWith(temporaryUrl);
  });

  it('reports an explicit error if the processed cutout is missing', async () => {
    await expect(
      createImageExportBlob(
        { ...processedItem(), cutoutUrl: undefined },
        { type: 'transparent' },
        'png',
        'original'
      )
    ).rejects.toThrow('No processed image is available for portrait.png.');
  });
});
