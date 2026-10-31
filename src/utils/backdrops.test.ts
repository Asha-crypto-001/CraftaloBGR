import { describe, expect, it, vi } from 'vitest';
import {
  createCanvasLinearGradient,
  getExportBasename,
  getUniqueFilename,
  GRADIENT_PRESETS,
} from './backdrops';

describe('shared CSS gradients', () => {
  it('uses the preview gradient angle and color stops for canvas export', () => {
    const addColorStop = vi.fn();
    const createLinearGradient = vi.fn(
      (_x0: number, _y0: number, _x1: number, _y1: number) => ({ addColorStop })
    );
    const context = { createLinearGradient } as unknown as CanvasRenderingContext2D;

    createCanvasLinearGradient(context, 100, 50, GRADIENT_PRESETS[0].css);

    const [x0, y0, x1, y1] = createLinearGradient.mock.calls[0];
    expect(x0).toBeCloseTo(12.5);
    expect(y0).toBeCloseTo(-12.5);
    expect(x1).toBeCloseTo(87.5);
    expect(y1).toBeCloseTo(62.5);
    expect(addColorStop.mock.calls).toEqual([
      [0, '#0f2027'],
      [0.5, '#203a43'],
      [1, '#2c5364'],
    ]);
  });

  it('supports color functions and inferred intermediate stop positions', () => {
    const addColorStop = vi.fn();
    const context = {
      createLinearGradient: () => ({ addColorStop }),
    } as unknown as CanvasRenderingContext2D;

    createCanvasLinearGradient(
      context,
      100,
      100,
      'linear-gradient(0.25turn, rgb(0, 0, 0), #ffffff, rgba(1, 2, 3, 0.5) 100%)'
    );

    expect(addColorStop.mock.calls).toEqual([
      [0, 'rgb(0, 0, 0)'],
      [0.5, '#ffffff'],
      [1, 'rgba(1, 2, 3, 0.5)'],
    ]);
  });

  it('rejects unsupported gradients instead of silently exporting a different one', () => {
    const context = {
      createLinearGradient: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    expect(() =>
      createCanvasLinearGradient(context, 100, 100, 'radial-gradient(red, blue)')
    ).toThrow('Only CSS linear gradients can be exported.');
  });
});

describe('export filenames', () => {
  it('creates portable names and uses a fallback for blank names', () => {
    expect(getExportBasename('portrait?.jpg')).toBe('portrait_');
    expect(getExportBasename('...')).toBe('image');
  });

  it('avoids collisions without changing the extension', () => {
    const used = new Set(['photo_cutout.png']);

    expect(getUniqueFilename('photo_cutout.png', used)).toBe(
      'photo_cutout (2).png'
    );
    expect(getUniqueFilename('PHOTO_CUTOUT.PNG', used)).toBe(
      'PHOTO_CUTOUT (3).PNG'
    );
  });
});
