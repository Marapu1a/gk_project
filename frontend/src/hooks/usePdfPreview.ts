import { useCallback, useEffect, useState } from 'react';
import type { RenderTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

type UsePdfPreviewOptions = {
  targetWidth?: number;
};

type CompatiblePromiseConstructor = PromiseConstructor & {
  try?: <T, Args extends unknown[]>(callback: (...args: Args) => T | PromiseLike<T>, ...args: Args) => Promise<T>;
  withResolvers?: <T>() => {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
  };
};

type CompatibleUint8Array = Uint8Array & {
  toBase64?: () => string;
};

function ensurePdfJsBrowserCompatibility() {
  const compatiblePromise = Promise as CompatiblePromiseConstructor;

  compatiblePromise.try ??= function promiseTry<T, Args extends unknown[]>(
    callback: (...args: Args) => T | PromiseLike<T>,
    ...args: Args
  ) {
    return new Promise<T>((resolve) => resolve(callback(...args)));
  };

  compatiblePromise.withResolvers ??= function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((promiseResolve, promiseReject) => {
      resolve = promiseResolve;
      reject = promiseReject;
    });
    return { promise, resolve, reject };
  };

  const uint8ArrayPrototype = Uint8Array.prototype as CompatibleUint8Array;
  uint8ArrayPrototype.toBase64 ??= function toBase64() {
    const bytes = this as Uint8Array;
    const chunkSize = 0x6000;
    let result = '';

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
      result += btoa(String.fromCharCode(...chunk));
    }

    return result;
  };
}

export function usePdfPreview(
  url: string,
  { targetWidth = 760 }: UsePdfPreviewOptions = {},
) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  const canvasRef = useCallback((node: HTMLCanvasElement | null) => {
    setCanvas(node);
  }, []);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  useEffect(() => {
    if (!canvas) return;

    const canvasElement = canvas;
    let cancelled = false;
    let cancelWork: (() => void) | undefined;

    async function renderPdf() {
      try {
        ensurePdfJsBrowserCompatibility();
        const pdfjs = await import('pdfjs-dist');
        if (cancelled) return;

        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const loadingTask = pdfjs.getDocument(url);
        const renderState: { task?: RenderTask } = {};

        cancelWork = () => {
          renderState.task?.cancel();
          void loadingTask.destroy();
        };

        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: targetWidth / baseViewport.width });
        const context = canvasElement.getContext('2d');

        if (!context) {
          setFailed(true);
          return;
        }

        canvasElement.width = Math.floor(viewport.width);
        canvasElement.height = Math.floor(viewport.height);
        context.clearRect(0, 0, canvasElement.width, canvasElement.height);

        renderState.task = page.render({
          canvas: canvasElement,
          canvasContext: context,
          viewport,
        });
        await renderState.task.promise;
      } catch (error) {
        console.warn('Не удалось отрисовать PDF-превью, используется браузерный просмотрщик.', error);
        if (!cancelled) setFailed(true);
      }
    }

    void renderPdf();

    return () => {
      cancelled = true;
      cancelWork?.();
    };
  }, [canvas, targetWidth, url]);

  return { canvasRef, failed };
}
