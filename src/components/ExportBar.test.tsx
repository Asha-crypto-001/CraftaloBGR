import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import JSZip from 'jszip';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImageItem } from '../types';
import { createImageExportBlob } from '../utils/exportUtils';
import { downloadBlob } from '../utils/imageUtils';
import { ExportBar } from './ExportBar';

vi.mock('../utils/exportUtils', () => ({
  createImageExportBlob: vi.fn(),
}));

vi.mock('../utils/imageUtils', () => ({
  downloadBlob: vi.fn(),
}));

function doneItem(id: string): ImageItem {
  return {
    id,
    name: 'portrait.png',
    originalFile: new File(['image'], 'portrait.png', { type: 'image/png' }),
    originalUrl: `blob:original-${id}`,
    originalWidth: 100,
    originalHeight: 50,
    cutoutUrl: `blob:cutout-${id}`,
    status: 'done',
    progress: 100,
  };
}

describe('ExportBar', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps duplicate image names as separate ZIP entries', async () => {
    vi.mocked(createImageExportBlob).mockResolvedValue(
      new Blob(['image'], { type: 'image/png' })
    );
    const items = [doneItem('first'), doneItem('second')];

    render(
      <ExportBar
        activeItem={items[0]}
        allItems={items}
        backdrop={{ type: 'transparent' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Download all (2)' }));
    await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1));

    const archive = vi.mocked(downloadBlob).mock.calls[0][0];
    const zip = await JSZip.loadAsync(archive);
    expect(Object.keys(zip.files)).toEqual([
      'portrait_cutout.png',
      'portrait_cutout (2).png',
    ]);
  });

  it('shows an explicit message when image export fails', async () => {
    vi.mocked(createImageExportBlob).mockRejectedValue(new Error('Canvas failed'));
    const item = doneItem('first');

    render(
      <ExportBar
        activeItem={item}
        allItems={[item]}
        backdrop={{ type: 'transparent' }}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Download PNG' })[0]);
    expect((await screen.findByRole('alert')).textContent).toContain('Canvas failed');
  });
});
