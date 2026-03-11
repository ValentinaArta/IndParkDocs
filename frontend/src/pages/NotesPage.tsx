import { useState, useEffect } from 'react';
import { Topbar } from '../components/Topbar';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';
import { Plus, Trash2, Maximize2, Minimize2, NotebookPen } from 'lucide-react';
import { fmtDate } from '../utils/format';
import type { Note, NoteListItem, NoteBlock } from '../api/types';

export function NotesPage() {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [title, setTitle] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    loadList();
  }, []);

  // Autosave
  useEffect(() => {
    if (!currentId) return;
    const timer = setTimeout(() => save(), 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, blocks]);

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
    setNotes((prev) => [{ id: note.id, title: note.title, updated_at: note.updated_at, created_at: note.created_at }, ...prev]);
    openNote(note.id);
  }

  async function openNote(id: number) {
    if (currentId) await save();
    const note = await apiGet<Note>(`/notes/${id}`);
    setCurrentId(note.id);
    setTitle(note.title);
    setBlocks(note.content_json?.length ? note.content_json : [{ type: 'text', value: '' }]);
  }

  async function save() {
    if (!currentId) return;
    setSaveStatus('Сохранение...');
    try {
      await apiPut(`/notes/${currentId}`, { title, content_json: blocks });
      setNotes((prev) =>
        prev.map((n) => (n.id === currentId ? { ...n, title, updated_at: new Date().toISOString() } : n)),
      );
      setSaveStatus('Сохранено');
      setTimeout(() => setSaveStatus(null), 1500);
    } catch {
      setSaveStatus('Ошибка');
    }
  }

  async function deleteNote() {
    if (!currentId || !confirm('Удалить заметку?')) return;
    await apiDelete(`/notes/${currentId}`);
    setNotes((prev) => prev.filter((n) => n.id !== currentId));
    setCurrentId(null);
    setBlocks([]);
    setTitle('');
  }

  function updateBlock(idx: number, patch: Partial<NoteBlock>) {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)) as NoteBlock[]);
  }

  function removeBlock(idx: number) {
    if (blocks.length <= 1) return;
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
  }

  function addBlock(type: 'text' | 'drawing') {
    const block: NoteBlock = type === 'text' ? { type: 'text', value: '' } : { type: 'drawing', dataUrl: '' };
    setBlocks((prev) => [...prev, block]);
  }

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 bg-white flex' : 'flex flex-col h-full'}>
      {!fullscreen && <Topbar title="Заметки" />}

      <div className="flex flex-1 overflow-hidden">
        {/* List panel */}
        {!fullscreen && (
          <div className="w-[280px] min-w-[280px] border-r border-[var(--border)] bg-[var(--bg)] flex flex-col overflow-y-auto">
            <div className="p-3">
              <button
                onClick={create}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:bg-[var(--primary-dark)] transition"
              >
                <Plus className="w-4 h-4" /> Новая заметка
              </button>
            </div>
            {notes.length === 0 && (
              <p className="text-center text-sm text-[var(--text-secondary)] py-6">Пока нет заметок</p>
            )}
            {notes.map((n) => (
              <button
                key={n.id}
                onClick={() => openNote(n.id)}
                className={`
                  w-full text-left px-4 py-3 border-b border-[var(--border)] transition-colors
                  ${n.id === currentId ? 'bg-[var(--bg-secondary)] border-l-3 border-l-[var(--primary)]' : 'hover:bg-[var(--bg-hover)]'}
                `}
              >
                <div className="text-sm font-medium truncate">{n.title || 'Без названия'}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {fmtDate(n.updated_at)}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Editor panel */}
        <div className="flex-1 overflow-y-auto bg-white relative">
          {!currentId ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)]">
              <NotebookPen className="w-12 h-12 opacity-30" />
              <p className="mt-3 text-sm">Выберите заметку или создайте новую</p>
            </div>
          ) : (
            <div className="max-w-[900px] mx-auto px-6 py-5 pb-20">
              {/* Title */}
              <div className="flex items-center gap-3 mb-4">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Название заметки"
                  className="flex-1 text-xl font-semibold border-none outline-none bg-transparent border-b-2 border-transparent focus:border-[var(--primary)] transition pb-1"
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
                <div key={idx} className="group relative mb-4">
                  {block.type === 'text' && (
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      className="min-h-[44px] px-3.5 py-3 rounded-xl bg-[var(--bg)] border border-transparent focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 outline-none text-[15px] leading-7 whitespace-pre-wrap transition"
                      onInput={(e) => updateBlock(idx, { value: (e.target as HTMLDivElement).innerText })}
                      dangerouslySetInnerHTML={{ __html: block.value || '' }}
                    />
                  )}
                  {block.type === 'drawing' && (
                    <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-white">
                      <canvas
                        id={`noteCanvas${idx}`}
                        width={800}
                        height={400}
                        className="w-full block cursor-crosshair"
                        style={{ touchAction: 'none', height: 400 }}
                      />
                      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg)] border-t border-[var(--border)] text-xs">
                        <span className="text-[var(--text-secondary)]">Рисование (будет Excalidraw)</span>
                      </div>
                    </div>
                  )}
                  {block.type === 'image' && (
                    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                      <img src={block.dataUrl} className="max-w-full block" />
                    </div>
                  )}
                  <button
                    onClick={() => removeBlock(idx)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[var(--text-secondary)] text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[var(--red)] transition"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Add block */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => addBlock('text')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition"
                >
                  + Текст
                </button>
                <button
                  onClick={() => addBlock('drawing')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition"
                >
                  + Рисунок
                </button>
              </div>
            </div>
          )}

          {/* Save indicator */}
          {saveStatus && (
            <div className="fixed bottom-5 right-5 bg-white px-4 py-2 rounded-full shadow-lg text-xs text-[var(--text-secondary)] border border-[var(--border)] animate-fade-in">
              {saveStatus}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen exit button */}
      {fullscreen && (
        <button
          onClick={() => setFullscreen(false)}
          className="fixed top-4 right-4 z-[201] flex items-center gap-2 px-3 py-2 bg-white border border-[var(--border)] rounded-xl shadow-lg text-sm hover:shadow-xl transition"
        >
          <Minimize2 className="w-4 h-4" /> Свернуть
        </button>
      )}
    </div>
  );
}
