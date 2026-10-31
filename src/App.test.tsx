import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { getImageDimensions } from './utils/imageUtils';
import { processBackgroundRemoval } from './utils/remover';

vi.mock('./utils/imageUtils', () => ({
  getImageDimensions: vi.fn(),
  generateCompositeBlob: vi.fn(),
  resampleTo8K: vi.fn(),
  downloadBlob: vi.fn(),
}));

vi.mock('./utils/remover', () => ({
  processBackgroundRemoval: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function imageFile(name: string) {
  return new File(['image'], name, { type: 'image/png' });
}

function uploadFiles(container: HTMLElement, files: File[], label = 'Upload images') {
  const input = container.querySelector<HTMLInputElement>(
    `input[aria-label="${label}"]`
  );
  if (!input) throw new Error(`Could not find file input "${label}"`);
  fireEvent.change(input, { target: { files } });
}

describe('image processing queue', () => {
  let nextUrl: number;

  beforeEach(() => {
    nextUrl = 0;
    vi.mocked(getImageDimensions).mockResolvedValue({ width: 100, height: 80 });
    vi.mocked(processBackgroundRemoval).mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => `blob:test-${++nextUrl}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('queues additional uploads while processing and processes them sequentially', async () => {
    const first = deferred<Blob>();
    vi.mocked(processBackgroundRemoval)
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce(new Blob(['second cutout'], { type: 'image/png' }));

    const { container } = render(<App />);
    uploadFiles(container, [imageFile('first.png')]);
    await waitFor(() => expect(processBackgroundRemoval).toHaveBeenCalledTimes(1));

    uploadFiles(container, [imageFile('second.png')], 'Add more images');
    await screen.findByRole('button', { name: 'Remove second.png from queue' });
    expect(processBackgroundRemoval).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve(new Blob(['first cutout'], { type: 'image/png' }));
    });
    await waitFor(() => expect(processBackgroundRemoval).toHaveBeenCalledTimes(2));
    await screen.findByText('After');
  });

  it('discards results for an item removed while its processing is in flight', async () => {
    const first = deferred<Blob>();
    vi.mocked(processBackgroundRemoval).mockImplementation((file) =>
      file.name === 'first.png'
        ? first.promise
        : Promise.resolve(new Blob(['second cutout'], { type: 'image/png' }))
    );

    const { container } = render(<App />);
    uploadFiles(container, [imageFile('first.png'), imageFile('second.png')]);
    await screen.findByRole('button', { name: 'Remove first.png from queue' });
    await waitFor(() => expect(processBackgroundRemoval).toHaveBeenCalledTimes(1));

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove first.png from queue' })
    );
    await act(async () => {
      first.resolve(new Blob(['discarded cutout'], { type: 'image/png' }));
    });

    await waitFor(() => expect(processBackgroundRemoval).toHaveBeenCalledTimes(2));
    await screen.findByText('After');
    expect(screen.queryByText('first.png')).toBeNull();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(3);
  });

  it('cleans up owned URLs when the app unmounts during processing', async () => {
    const pending = deferred<Blob>();
    vi.mocked(processBackgroundRemoval).mockReturnValue(pending.promise);

    const { container, unmount } = render(<App />);
    uploadFiles(container, [imageFile('pending.png')]);
    await waitFor(() => expect(processBackgroundRemoval).toHaveBeenCalledTimes(1));

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-1');

    await act(async () => {
      pending.resolve(new Blob(['late cutout'], { type: 'image/png' }));
    });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('resumes with newly added work after clearing during processing', async () => {
    const first = deferred<Blob>();
    vi.mocked(processBackgroundRemoval).mockImplementation((file) =>
      file.name === 'first.png'
        ? first.promise
        : Promise.resolve(new Blob(['new cutout'], { type: 'image/png' }))
    );

    const { container } = render(<App />);
    uploadFiles(container, [imageFile('first.png')]);
    await waitFor(() => expect(processBackgroundRemoval).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Clear current workspace' }));
    uploadFiles(container, [imageFile('new.png')]);
    await screen.findByText('new.png');

    await act(async () => {
      first.resolve(new Blob(['discarded cutout'], { type: 'image/png' }));
    });

    await waitFor(() => expect(processBackgroundRemoval).toHaveBeenCalledTimes(2));
    await screen.findByText('After');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(3);
  });

  it('shows processing failures and allows the user to retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(processBackgroundRemoval)
      .mockRejectedValueOnce(new Error('Model failed to load'))
      .mockResolvedValueOnce(new Blob(['cutout'], { type: 'image/png' }));

    const { container } = render(<App />);
    uploadFiles(container, [imageFile('retry.png')]);

    await screen.findByText('Model failed to load');
    fireEvent.click(screen.getByRole('button', { name: 'Retry processing' }));

    await waitFor(() => expect(processBackgroundRemoval).toHaveBeenCalledTimes(2));
    await screen.findByText('After');
  });

  it('explains how to recover from model download or storage failures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(processBackgroundRemoval).mockRejectedValueOnce(
      new Error('Failed to fetch')
    );

    const { container } = render(<App />);
    uploadFiles(container, [imageFile('offline.png')]);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Model assets could not be downloaded or saved.');
    expect(alert.textContent).toContain('Check your connection and available browser storage');
  });

  it('reports files whose image dimensions cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getImageDimensions).mockRejectedValueOnce(new Error('Invalid image data'));

    const { container } = render(<App />);
    uploadFiles(container, [imageFile('broken.png')]);

    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toContain(
      'broken.png: Invalid image data'
    );
    expect(processBackgroundRemoval).not.toHaveBeenCalled();
  });
});
