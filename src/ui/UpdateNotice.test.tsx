import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UpdateNotice, type RegisterHook } from './UpdateNotice';

function fakeHook(waiting: boolean) {
  const updateServiceWorker = vi.fn(() => Promise.resolve());
  const setNeedRefresh = vi.fn();
  const hook: RegisterHook = () => ({
    needRefresh: [waiting, setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker,
  });
  return { hook, updateServiceWorker, setNeedRefresh };
}

describe('UpdateNotice', () => {
  it('shows nothing while no new version is waiting', () => {
    const { hook, updateServiceWorker } = fakeHook(false);
    const { container } = render(<UpdateNotice useRegister={hook} />);
    expect(container).toBeEmptyDOMElement();
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });

  it('offers a reload when a new version is waiting, without reloading on its own', () => {
    const { hook, updateServiceWorker } = fakeHook(true);
    render(<UpdateNotice useRegister={hook} />);
    expect(screen.getByRole('status')).toHaveTextContent('A new version is ready.');
    expect(updateServiceWorker).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('can be dismissed until the next start', () => {
    const { hook, setNeedRefresh, updateServiceWorker } = fakeHook(true);
    render(<UpdateNotice useRegister={hook} />);
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });
});
