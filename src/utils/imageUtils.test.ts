import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BackdropSetting } from '../types';
import { generateCompositeBlob } from './imageUtils';

describe('generateCompositeBlob', () => {
  const fillRect = vi.fn();
  const drawImage = vi.fn();
  const addColorStop = vi.fn();
  const createLinearGradient = vi.fn(
    (_x0: number, _y0: number, _x1: number, _y1: number) => ({ addColorStop })
  );
  const toBlob = vi.fn(
    (callback: BlobCallback, type?: string) =>
      callback(new Blob(['export'], { type }))
  );
  const context = {
    fillStyle: '',
    fillRect,
    drawImage,
    createLinearGradient,
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob,
  };

  class MockImage {
    naturalWidth = 100;
    naturalHeight = 50;
    onload: (() => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    crossOrigin: string | null = null;

    set src(_value: string) {
      this.onload?.();
    }
  }

  afterEach(() => {
    vi.restoreAllMocks();
    fillRect.mockClear();
    drawImage.mockClear();
    addColorStop.mockClear();
    createLinearGradient.mockClear();
    toBlob.mockClear();
    canvas.getContext.mockClear();
    Object.defineProperty(globalThis, 'Image', {
      configurable: true,
      value: MockImage,
    });
    vi.stubGlobal('document', {
      createElement: vi.fn(() => canvas),
    });
  });

  it('exports selected gradient stops and angle to the requested image format', async () => {
    Object.defineProperty(globalThis, 'Image', {
      configurable: true,
      value: MockImage,
    });
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });

    const backdrop: BackdropSetting = {
      type: 'gradient',
      gradient: 'linear-gradient(90deg, #123456 0%, #abcdef 100%)',
    };
    const blob = await generateCompositeBlob('blob:cutout', backdrop, undefined, undefined, 'webp');

    const [x0, y0, x1, y1] = createLinearGradient.mock.calls[0];
    expect(x0).toBeCloseTo(0);
    expect(y0).toBeCloseTo(25);
    expect(x1).toBeCloseTo(100);
    expect(y1).toBeCloseTo(25);
    expect(addColorStop.mock.calls).toEqual([
      [0, '#123456'],
      [1, '#abcdef'],
    ]);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.95);
    expect(blob.type).toBe('image/webp');
  });

  it('uses a white background when exporting transparent JPEG', async () => {
    Object.defineProperty(globalThis, 'Image', {
      configurable: true,
      value: MockImage,
    });
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });

    await generateCompositeBlob(
      'blob:cutout',
      { type: 'transparent' },
      undefined,
      undefined,
      'jpeg'
    );

    expect(fillRect).toHaveBeenCalledWith(0, 0, 100, 50);
    expect(context.fillStyle).toBe('#ffffff');
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.95);
  });

  it('crops custom backdrops using the same cover behavior as the preview', async () => {
    Object.defineProperty(globalThis, 'Image', {
      configurable: true,
      value: MockImage,
    });
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });

    await generateCompositeBlob(
      'blob:cutout',
      { type: 'image', imageUrl: 'blob:backdrop' },
      50,
      50
    );

    expect(drawImage).toHaveBeenNthCalledWith(
      1,
      expect.any(MockImage),
      25,
      0,
      50,
      50,
      0,
      0,
      50,
      50
    );
    expect(drawImage).toHaveBeenNthCalledWith(
      2,
      expect.any(MockImage),
      0,
      0,
      50,
      50
    );
  });

  it('rejects export when a custom backdrop cannot be loaded', async () => {
    class BrokenImage extends MockImage {
      set src(_value: string) {
        this.onerror?.(new Event('error'));
      }
    }
    Object.defineProperty(globalThis, 'Image', {
      configurable: true,
      value: BrokenImage,
    });
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });

    await expect(
      generateCompositeBlob(
        'blob:cutout',
        { type: 'image', imageUrl: 'blob:missing-backdrop' }
      )
    ).rejects.toBeDefined();
  });
});
