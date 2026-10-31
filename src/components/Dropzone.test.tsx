import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Dropzone } from './Dropzone';

describe('Dropzone accessibility', () => {
  it.each(['Enter', ' '])('opens the file picker with %s', (key) => {
    const { container } = render(<Dropzone onFilesSelected={vi.fn()} />);
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Choose images"]'
    );
    if (!input) throw new Error('Image file input was not rendered');
    const click = vi.spyOn(input, 'click');

    fireEvent.keyDown(screen.getByRole('button', { name: 'Choose image files' }), {
      key,
    });

    expect(click).toHaveBeenCalledOnce();
  });

  it('announces unsupported selected file types', () => {
    const onError = vi.fn();
    const onFilesSelected = vi.fn();
    const { container } = render(
      <Dropzone onFilesSelected={onFilesSelected} onError={onError} />
    );
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Choose images"]'
    );
    if (!input) throw new Error('Image file input was not rendered');

    fireEvent.change(input, {
      target: { files: [new File(['text'], 'notes.txt', { type: 'text/plain' })] },
    });

    expect(onError).toHaveBeenCalledWith(
      'Some selected files are not supported images and were skipped.'
    );
    expect(onFilesSelected).not.toHaveBeenCalled();
  });
});
