import { create } from 'zustand';

interface UIState {
  theme: 'light' | 'dark';
  commandPaletteOpen: boolean;
  presentationMode: boolean;
  sidebarCollapsed: boolean;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setPresentationMode: (open: boolean) => void;
  togglePresentationMode: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
}

export const useUIStore = create<UIState>((set, get) => {
  // Initialize theme to light
  const initialTheme = 'light';
  
  // Sync with HTML class
  document.documentElement.classList.remove('dark');

  return {
    theme: initialTheme,
    commandPaletteOpen: false,
    presentationMode: false,
    sidebarCollapsed: true,
    setTheme: (theme) => {
      const forcedTheme = 'light';
      localStorage.setItem('theme', forcedTheme);
      
      // Add transient class for smooth theme switching
      document.documentElement.classList.add('theme-transitioning');
      
      document.documentElement.classList.remove('dark');
      set({ theme: forcedTheme });
      
      // Remove after transition finishes so ordinary UI layout transitions run natively
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 350);
    },
    toggleTheme: () => {
      get().setTheme('light');
    },
    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    setPresentationMode: (open) => set({ presentationMode: open }),
    togglePresentationMode: () => set({ presentationMode: !get().presentationMode }),
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    toggleSidebarCollapsed: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
  };
});
