import { useState, useEffect, useRef, useCallback } from 'react';
import { Tldraw, type Editor, getSnapshot, loadSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';
import { Topbar } from '../components/Topbar';
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client';
import { Plus, Trash2, Maximize2, Minimize2, NotebookPen } from 'lucide-react';
import { fmtDate } from '../utils/format';
import type { NoteListItem } from '../api/types';

export function NotesPage() {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const editorRef = useRef<Editor | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const currentIdRef = useRef<number | null>(null);
  const titleRef = useRef('');
  const [editorKey, setEditorKey] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snapshotRef = useRef<any>(null);

  // Keep refs in sync
  useEffect(() => { currentIdRef.current = currentId; }, [currentId]);
  useEffect(() => { titleRef.current = title; }, [title]);

  useEffect(() => {
    loadList();
  }, []);

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
    const note = await apiPost<{ id: number; title: string; updated_at: string; created_at: string }>('/notes', {
      title: 'Новая заметка',
      content_json: null,
    });
    setNotes((prev) => [
      { id: note.id, title: note.title, updated_at: note.updated_at, created_at: note.created_at },
      ...prev,
    ]);
    openNote(note.id);
  }

  const save = useCallback(async () => {
    const id = currentIdRef.current;
    if (!id || !editorRef.current) return;
    setSaveStatus('Сохранение...');
    try {
      const snapshot = getSnapshot(editorRef.current.store);
      await apiPut(`/notes/${id}`, {
        title: titleRef.current,
        content_json: snapshot,
      });
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, title: titleRef.current, updated_at: new Date().toISOString() } : n,
        ),
      );
      setSaveStatus('Сохранено');
      setTimeout(() => setSaveStatus(null), 1500);
    } catch {
      setSaveStatus('Ошибка сохранения');
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(), 3000);
  }, [save]);

  async function openNote(id: number) {
    // Save current note before switching
    if (currentIdRef.current && editorRef.current) {
      await save();
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const note = await apiGet<any>(`/notes/${id}`);
      setCurrentId(note.id);
      setTitle(note.title);
      snapshotRef.current = note.content_json;
      // Force remount of Tldraw by changing key
      setEditorKey((k) => k + 1);
      // On mobile, collapse sidebar
      if (window.innerWidth < 768) setSidebarOpen(false);
    } catch (e) {
      console.error('open note error', e);
    }
  }

  async function deleteNote() {
    if (!currentId || !confirm('Удалить заметку?')) return;
    await apiDelete(`/notes/${currentId}`);
    setNotes((prev) => prev.filter((n) => n.id !== currentId));
    setCurrentId(null);
    setTitle('');
    editorRef.current = null;
    snapshotRef.current = null;
  }

  function handleMount(editor: Editor) {
    editorRef.current = editor;
    // Load snapshot if exists
    if (snapshotRef.current && typeof snapshotRef.current === 'object' && snapshotRef.current.store) {
      try {
        loadSnapshot(editorRef.current.store, snapshotRef.current);
      } catch (e) {
        console.warn('Failed to load snapshot, starting blank:', e);
      }
    }
    // Listen for changes to auto-save
    const unsub = editor.store.listen(() => {
      scheduleSave();
    }, { scope: 'document', source: 'user' });
    // Cleanup on unmount
    return () => unsub();
  }

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 bg-white flex flex-col' : 'flex flex-col h-full'}>
      {!fullscreen && <Topbar title="Заметки" />}

      <div className="flex flex-1 overflow-hidden">
        {/* ===== List panel ===== */}
        {!fullscreen && sidebarOpen && (
          <div className="w-[280px] min-w-[280px] max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:w-[300px] max-md:shadow-2xl border-r border-[var(--border)] bg-[var(--bg)] flex flex-col">
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
                  className={`w-full text-left px-4 py-3.5 border-b border-[var(--border)] transition-colors min-h-[52px] ${
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
        <div className="flex-1 flex flex-col bg-white relative">
          {!currentId ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)]">
              <NotebookPen className="w-12 h-12 opacity-20" />
              <p className="mt-3 text-sm">Выберите заметку или создайте новую</p>
            </div>
          ) : (
            <>
              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] bg-white shrink-0">
                {/* Mobile: show sidebar toggle */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  ☰
                </button>
                <input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    scheduleSave();
                  }}
                  placeholder="Название заметки"
                  className="flex-1 text-lg font-semibold border-none outline-none bg-transparent"
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

              {/* tldraw canvas — fills remaining space */}
              <div className="flex-1 relative">
                <Tldraw
                  key={editorKey}
                  onMount={handleMount}
                />
              </div>
            </>
          )}

          {/* Save indicator */}
          {saveStatus && (
            <div className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-full shadow-lg text-xs text-[var(--text-secondary)] border border-[var(--border)] z-[100]">
              {saveStatus}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen exit */}
      {fullscreen && currentId && (
        <button
          onClick={() => setFullscreen(false)}
          className="fixed top-4 right-4 z-[201] flex items-center gap-2 px-4 py-2 bg-white border border-[var(--border)] rounded-xl shadow-lg text-sm hover:shadow-xl transition"
        >
          <Minimize2 className="w-4 h-4" /> Свернуть
        </button>
      )}

      {/* Mobile overlay to close sidebar */}
      {sidebarOpen && !fullscreen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
