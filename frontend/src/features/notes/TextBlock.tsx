import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useRef } from 'react';

interface TextBlockProps {
  initialContent: string;
  onChange: (content: string) => void;
  onPasteImage?: (dataUrl: string) => void;
  autoFocus?: boolean;
}

export function TextBlock({ initialContent, onChange, onPasteImage, autoFocus }: TextBlockProps) {
  const isFirst = useRef(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Начните писать...',
      }),
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[44px] px-3.5 py-3 text-[15px] leading-7',
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            event.preventDefault();
            const blob = items[i].getAsFile();
            if (!blob) return true;
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result && onPasteImage) {
                onPasteImage(e.target.result as string);
              }
            };
            reader.readAsDataURL(blob);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    autofocus: autoFocus ? 'end' : false,
  });

  // Sync initial content only once
  useEffect(() => {
    if (editor && isFirst.current && initialContent) {
      isFirst.current = false;
    }
  }, [editor, initialContent]);

  const handleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const handleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const handleBullet = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
  const handleH2 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 2 }).run(), [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-xl bg-[var(--bg)] border border-transparent focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/10 transition">
      {/* Mini toolbar — appears on focus */}
      <div className="flex items-center gap-1 px-2 pt-1.5 opacity-0 focus-within:opacity-100 has-[:focus]:opacity-100 transition-opacity [div:focus-within_&]:opacity-100">
        <button
          onClick={handleBold}
          className={`px-1.5 py-0.5 rounded text-xs font-bold transition ${editor.isActive('bold') ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
        >
          B
        </button>
        <button
          onClick={handleItalic}
          className={`px-1.5 py-0.5 rounded text-xs italic transition ${editor.isActive('italic') ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
        >
          I
        </button>
        <button
          onClick={handleH2}
          className={`px-1.5 py-0.5 rounded text-xs font-semibold transition ${editor.isActive('heading', { level: 2 }) ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
        >
          H2
        </button>
        <button
          onClick={handleBullet}
          className={`px-1.5 py-0.5 rounded text-xs transition ${editor.isActive('bulletList') ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
        >
          •
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
