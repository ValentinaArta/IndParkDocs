import { useState, useCallback, useRef, useEffect } from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI, ExcalidrawElement } from '@excalidraw/excalidraw/types';

interface DrawingBlockProps {
  initialData?: string; // JSON string of excalidraw elements
  onChange: (data: string) => void;
}

export function DrawingBlock({ initialData, onChange }: DrawingBlockProps) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const initialElements = useRef<ExcalidrawElement[]>([]);

  useEffect(() => {
    if (initialData) {
      try {
        initialElements.current = JSON.parse(initialData);
      } catch {
        initialElements.current = [];
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        const data = JSON.stringify(elements.filter((el) => !el.isDeleted));
        onChange(data);
      }, 500);
    },
    [onChange],
  );

  // Export preview as PNG for list thumbnail (future use)
  const exportPreview = useCallback(async () => {
    if (!api) return null;
    const elements = api.getSceneElements();
    if (!elements.length) return null;
    const blob = await exportToBlob({
      elements,
      files: api.getFiles(),
      mimeType: 'image/png',
      exportPadding: 16,
    });
    return URL.createObjectURL(blob);
  }, [api]);

  // Keep export available via ref if needed
  void exportPreview;

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-white" style={{ height: 450 }}>
      <Excalidraw
        excalidrawAPI={(a) => setApi(a)}
        initialData={{
          elements: initialElements.current,
          appState: {
            viewBackgroundColor: '#ffffff',
            currentItemFontFamily: 1,
            zoom: { value: 1 },
            gridModeEnabled: false,
          },
        }}
        onChange={handleChange}
        langCode="ru-RU"
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
          },
        }}
        theme="light"
      />
    </div>
  );
}
