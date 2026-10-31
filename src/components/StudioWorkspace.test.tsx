import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ImageItem } from '../types';
import { StudioWorkspace } from './StudioWorkspace';

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

describe('StudioWorkspace accessibility', () => {
  it('supports keyboard control of the before/after slider', () => {
    render(
      <StudioWorkspace
        item={processedItem()}
        backdrop={{ type: 'transparent' }}
        checkerMode="dark"
        onRetryItem={vi.fn()}
        onToggleChecker={vi.fn()}
      />
    );

    const slider = screen.getByRole('slider', {
      name: 'Before and after comparison',
    });
    expect(slider.getAttribute('aria-valuenow')).toBe('50');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider.getAttribute('aria-valuenow')).toBe('55');

    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider.getAttribute('aria-valuenow')).toBe('0');

    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider.getAttribute('aria-valuenow')).toBe('100');
  });

  it('offers retry action for a failed image', () => {
    const onRetryItem = vi.fn();
    render(
      <StudioWorkspace
        item={{ ...processedItem(), cutoutUrl: undefined, status: 'error', error: 'Model unavailable' }}
        backdrop={{ type: 'transparent' }}
        checkerMode="dark"
        onRetryItem={onRetryItem}
        onToggleChecker={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry processing' }));
    expect(onRetryItem).toHaveBeenCalledWith('item-1');
  });
});
