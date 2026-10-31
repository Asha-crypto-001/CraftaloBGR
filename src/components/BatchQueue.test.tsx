import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ImageItem } from '../types';
import { BatchQueue } from './BatchQueue';

function item(id: string, name: string): ImageItem {
  return {
    id,
    name,
    originalFile: new File(['image'], name, { type: 'image/png' }),
    originalUrl: `blob:original-${id}`,
    originalWidth: 100,
    originalHeight: 50,
    status: 'done',
    progress: 100,
  };
}

describe('BatchQueue accessibility', () => {
  it('exposes item selection and removal as distinct keyboard controls', () => {
    const onSelectItem = vi.fn();
    const onRemoveItem = vi.fn();
    render(
      <BatchQueue
        items={[item('one', 'one.png'), item('two', 'two.png')]}
        activeId="one"
        onSelectItem={onSelectItem}
        onRemoveItem={onRemoveItem}
      />
    );

    const selectButton = screen.getByRole('button', {
      name: 'Select two.png, processed',
    });
    expect(selectButton.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(selectButton);
    expect(onSelectItem).toHaveBeenCalledWith('two');

    fireEvent.click(screen.getByRole('button', { name: 'Remove two.png from queue' }));
    expect(onRemoveItem).toHaveBeenCalledWith('two');
  });
});
