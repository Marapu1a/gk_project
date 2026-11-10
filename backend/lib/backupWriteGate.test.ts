import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enterBackupWriteGate, pauseBackupWrites } from './backupWriteGate';

test('backup waits for existing writes and holds new writes until snapshot is ready', async () => {
  const finishExistingWrite = await enterBackupWriteGate();
  let backupReady = false;
  const pause = pauseBackupWrites().then((resume) => {
    backupReady = true;
    return resume;
  });
  let queuedWriteStarted = false;
  const queuedWrite = enterBackupWriteGate().then((release) => {
    queuedWriteStarted = true;
    return release;
  });

  await Promise.resolve();
  assert.equal(backupReady, false);
  assert.equal(queuedWriteStarted, false);
  finishExistingWrite();
  const resume = await pause;
  assert.equal(queuedWriteStarted, false);
  resume();
  const finishQueuedWrite = await queuedWrite;
  assert.equal(queuedWriteStarted, true);
  finishQueuedWrite();
});
