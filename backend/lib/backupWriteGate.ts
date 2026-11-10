let activeWrites = 0;
let paused = false;
let resumeWaiters: Array<() => void> = [];
let drainWaiters: Array<() => void> = [];

export async function enterBackupWriteGate(): Promise<() => void> {
  while (paused) {
    await new Promise<void>((resolve) => resumeWaiters.push(resolve));
  }
  activeWrites += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeWrites -= 1;
    if (activeWrites === 0) {
      for (const resolve of drainWaiters.splice(0)) resolve();
    }
  };
}

export async function pauseBackupWrites(timeoutMs = 30_000): Promise<() => void> {
  if (paused) throw new Error('Backup write gate is already paused');
  paused = true;
  const resume = () => {
    if (!paused) return;
    paused = false;
    for (const resolve of resumeWaiters.splice(0)) resolve();
  };

  if (activeWrites === 0) return resume;
  let timer: NodeJS.Timeout | undefined;
  let onDrain: (() => void) | undefined;
  try {
    await Promise.race([
      new Promise<void>((resolve) => {
        onDrain = resolve;
        drainWaiters.push(resolve);
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Timed out waiting for active writes')), timeoutMs);
      }),
    ]);
    return resume;
  } catch (error) {
    resume();
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    if (onDrain) drainWaiters = drainWaiters.filter((resolve) => resolve !== onDrain);
  }
}
