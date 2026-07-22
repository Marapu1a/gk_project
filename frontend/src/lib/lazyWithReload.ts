import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const LAZY_IMPORT_RECOVERY_KEY = 'lazy-import-recovery';

type RecoveryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface RecoveryControllerOptions {
  storage: RecoveryStorage | null;
  reload: () => void;
}

export function createLazyImportRecoveryController({
  storage,
  reload,
}: RecoveryControllerOptions) {
  let reloadRequested = false;
  let recoveryReloadFailed = false;
  let recoveryReloadDetected = false;

  try {
    recoveryReloadDetected = storage?.getItem(LAZY_IMPORT_RECOVERY_KEY) === '1';
  } catch {
    storage = null;
  }

  function clear() {
    reloadRequested = false;
    recoveryReloadFailed = false;
    recoveryReloadDetected = false;

    try {
      storage?.removeItem(LAZY_IMPORT_RECOVERY_KEY);
    } catch {
      // Storage can be unavailable in restricted browser modes.
    }
  }

  function recover() {
    if (reloadRequested) return true;
    if (recoveryReloadFailed) return false;

    if (recoveryReloadDetected) {
      recoveryReloadDetected = false;
      recoveryReloadFailed = true;

      try {
        storage?.removeItem(LAZY_IMPORT_RECOVERY_KEY);
      } catch {
        // The original import error will be shown by the route error boundary.
      }

      return false;
    }

    if (!storage) return false;

    try {
      storage.setItem(LAZY_IMPORT_RECOVERY_KEY, '1');
    } catch {
      return false;
    }

    reloadRequested = true;
    reload();
    return true;
  }

  return { clear, recover };
}

function getSessionStorage(): RecoveryStorage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

const recoveryController = createLazyImportRecoveryController({
  storage: getSessionStorage(),
  reload: () => window.location.reload(),
});

const waitForNavigation = new Promise<never>(() => undefined);

export function lazyWithReload<T extends ComponentType>(
  load: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await load();

      if (!module?.default) {
        throw new Error('Lazy page module has no default export');
      }

      recoveryController.clear();
      return module;
    } catch (error) {
      if (recoveryController.recover()) {
        return waitForNavigation;
      }

      throw error;
    }
  });
}
