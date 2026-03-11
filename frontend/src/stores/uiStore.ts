import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: localStorage.getItem('sidebarHidden') !== 'true',

  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarOpen;
      localStorage.setItem('sidebarHidden', next ? 'false' : 'true');
      return { sidebarOpen: next };
    }),

  setSidebarOpen: (open: boolean) => {
    localStorage.setItem('sidebarHidden', open ? 'false' : 'true');
    set({ sidebarOpen: open });
  },
}));
