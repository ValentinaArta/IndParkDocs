import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Topbar } from '../components/Topbar';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';
import {
  Plus, Trash2, Maximize2, Minimize2, NotebookPen, Type, PenTool, Loader2,
} from 'lucide-react';
import { fmtDate } from '../utils/format';
import type { Note, NoteListItem, NoteBlock } from '../api/types';
import { TextBlock } from '../features/notes/TextBlock';

// Lazy-load Excalidraw (heavy ~1.5MB)
const DrawingBlock = lazy(() =>
  import('../features/notes/DrawingBlock').then((m) => ({ default: m.DrawingBlock })),
);

export function NotesPage() {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [title, setTitle] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadList();
  }, []);

  // Autosave on dirty
  useEffect(() => {
    if (!currentId || !dirty) return;
    const timer = setTimeout(() => save(), 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, blocks, dirty]);

  // ESC exits fullscreen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreen) setFullscreen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [fullscreen]);

  async function loadList() {
    const data = await apiGet<NoteListItem[]>('/notes');
    setNotes(data);
  }

  async function create() {
    const note = await apiPost<Note>('/notes', {
      title: 'Новая заметка',
      content_json: [{ type: 'text', value: '' }],
    });
    setNotes((prev) => [
      { id: note.id, title: note.title, updated_at: note.updated_at, created_at: note.created_at },
      ...prev,
    ]);
    openNote(note.id);
  }

  async function openNote(id: number) {
    if (currentId && dirty) await save();
    const note = await apiGet<Note>(`/notes/${id}`);
    setCurrentId(note.id);
    setTitle(note.title);
    setBlocks(note.content_json?.length ? note.content_json : [{ type: 'text', value: '' }]);
    setDirty(false);
  }

  async function save() {
    if (!currentId) return;
    setSaveStatus('Сохранение...');
    setDirty(false);
    try {
      await apiPut(`/notes/${currentId}`, { title, content_json: blocks });
      setNotes((prev) =>
        prev.map((n) =>
          n.id === currentId ? { ...n, title, updated_at: new Date().toISOString() } : n,
        ),
      );
      setSaveStatus('Сохранено');
      setTimeout(() => setSaveStatus(null), 1500);
    } catch {
      setSaveStatus('Ошибка');
      setDirty(true);
    }
  }

  async function deleteNote() {
    if (!currentId || !confirm('Удалить заметку?')) return;
    await apiDelete(`/notes/${currentId}`);
    setNotes((prev) => prev.filter((n) => n.id !== currentId));
    setCurrentId(null);
    setBlocks([]);
    setTitle('');
    setDirty(false);
  }

  const updateBlock = useCallback((idx: number, patch: Partial<NoteBlock>) => {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)) as NoteBlock[]);
    setDirty(true);
  }, []);

  function removeBlock(idx: number) {
    if (blocks.length <= 1) return;
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  }

  function addBlock(type: 'text' | 'drawing') {
    const block: NoteBlock =
      type === 'text' ? { type: 'text', value: '' } : { type: 'drawing', dataUrl: '' };
    setBlocks((prev) => [...prev, block]);
    setDirty(true);
  }

  function handlePasteImage(afterIdx: number, dataUrl: string) {
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(afterIdx + 1, 0, { type: 'image', dataUrl });
      return next;
    });
    setDirty(true);
  }

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 bg-white flex flex-col' : 'flex flex-col h-full'}>
      {!fullscreen && <Topbar title="Заметки" />}

      <div className="flex flex-1 overflow-hidden">
        {/* ===== List panel ===== */}
        {!fullscreen && (
          <div className="w-[280px] min-w-[280px] border-r border-[var(--border)] bg-[var(--bg)] flex flex-col">
            <div className="p-3">
              <button
                onClick={create}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:bg-[var(--primary-dark)] transition"
              >
                <Plus className="w-4 h-4" /> Новая заметка
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notes.length === 0 && (
                <p className="text-center text-sm text-[var(--text-secondary)] py-8">Пока нет заметок</p>
              )}
              {notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNote(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--border)] transition-colors ${
                    n.id === currentId
                      ? 'bg-[var(--bg-secondary)] border-l-[3px] border-l-[var(--primary)]'
                      : 'hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <div className="text-sm font-medium truncate">{n.title || 'Без названия'}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">{fmtDate(n.updated_at)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== Editor panel ===== */}
        <div className="flex-1 overflow-y-auto bg-white relative">
          {!currentId ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)]">
              <NotebookPen className="w-12 h-12 opacity-20" />
              <p className="mt-3 text-sm">Выберите заметку или создайте новую</p>
            </div>
          ) : (
            <div className="max-w-[900px] mx-auto px-6 py-5 pb-24">
              {/* Title bar */}
              <div className="flex items-center gap-3 mb-5">
                <input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Название заметки"
                  className="flex-1 text-2xl font-semibold border-none outline-none bg-transparent border-b-2 border-transparent focus:border-[var(--primary)] transition-colors pb-1"
                />
                <button
                  onClick={() => setFullscreen(!fullscreen)}
                  className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition"
                  title={fullscreen ? 'Свернуть' : 'Полный экран'}
                >
                  {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={deleteNote}
                  className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-red-50 hover:text-[var(--red)] hover:border-[var(--red)] transition"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Blocks */}
              {blocks.map((block, idx) => (
                <div key={`${currentId}-${idx}`} className="group relative mb-4">
                  {block.type === 'text' && (
                    <TextBlock
                      initialContent={block.value}
                      onChange={(html) => updateBlock(idx, { value: html })}
                      onPasteImage={(dataUrl) => handlePasteImage(idx, dataUrl)}
                      autoFocus={idx === blocks.length - 1 && !block.value}
                    />
                  )}

                  {block.type === 'drawing' && (
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center h-[450px] rounded-xl border border-[var(--border)] bg-[var(--bg)]">
                          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-secondary)]" />
                          <span className="ml-2 text-sm text-[var(--text-secondary)]">Загрузка холста...</span>
                        </div>
                      }
                    >
                      <DrawingBlock
                        initialData={block.dataUrl}
                        onChange={(data) => updateBlock(idx, { dataUrl: data })}
                      />
                    </Suspense>
                  )}

                  {block.type === 'image' && (
                    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                      <img src={block.dataUrl} className="max-w-full block" alt="" />
                    </div>
                  )}

                  {/* Remove block button */}
                  <button
                    onClick={() => removeBlock(idx)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[var(--text-secondary)] text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[var(--red)] transition z-10"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Add block buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => addBlock('text')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition"
                >
                  <Type className="w-4 h-4" /> Текст
                </button>
                <button
                  onClick={() => addBlock('drawing')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition"
                >
                  <PenTool className="w-4 h-4" /> Рисунок
                </button>
              </div>
            </div>
          )}

          {/* Save indicator */}
          {saveStatus && (
            <div className="fixed bottom-5 right-5 bg-white px-4 py-2 rounded-full shadow-lg text-xs text-[var(--text-secondary)] border border-[var(--border)]">
              {saveStatus}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen exit */}
      {fullscreen && (
        <button
          onClick={() => setFullscreen(false)}
          className="fixed top-4 right-4 z-[201] flex items-center gap-2 px-4 py-2 bg-white border border-[var(--border)] rounded-xl shadow-lg text-sm hover:shadow-xl transition"
        >
          <Minimize2 className="w-4 h-4" /> Свернуть
        </button>
      )}
    </div>
  );
}
