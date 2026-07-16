import { useCallback, useEffect, useState } from 'react';
import type { RenderTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

type UsePdfPreviewOptions = {
  targetWidth?: number;
};

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
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
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
