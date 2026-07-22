import { describe, expect, it, vi } from 'vitest';
import { createLazyImportRecoveryController } from './lazyWithReload';

function createStorage() {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe('lazy import recovery', () => {
  it('reloads only once while navigation is pending', () => {
    const reload = vi.fn();
    const controller = createLazyImportRecoveryController({
      storage: createStorage(),
      reload,
    });

    expect(controller.recover()).toBe(true);
    expect(controller.recover()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not enter a reload loop when the import fails again', () => {
    const storage = createStorage();
    const firstReload = vi.fn();
    const firstPage = createLazyImportRecoveryController({ storage, reload: firstReload });

    expect(firstPage.recover()).toBe(true);

    const secondReload = vi.fn();
    const reloadedPage = createLazyImportRecoveryController({ storage, reload: secondReload });

    expect(reloadedPage.recover()).toBe(false);
    expect(reloadedPage.recover()).toBe(false);
    expect(secondReload).not.toHaveBeenCalled();
  });

  it('skips automatic reload when session storage is unavailable', () => {
    const reload = vi.fn();
    const controller = createLazyImportRecoveryController({ storage: null, reload });

    expect(controller.recover()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('allows a future recovery after a successful page load', () => {
    const reload = vi.fn();
    const controller = createLazyImportRecoveryController({
      storage: createStorage(),
      reload,
    });

    expect(controller.recover()).toBe(true);
    controller.clear();
    expect(controller.recover()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
