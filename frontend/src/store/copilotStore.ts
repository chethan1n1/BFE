import { create } from 'zustand';
import api from '../services/api';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

interface CopilotState {
  isCopilotOpen: boolean;
  threads: Thread[];
  activeThreadId: string | null;
  isLoading: boolean;
  responseMode: 'quick' | 'analysis' | 'report';
  isSidebarCollapsed: boolean;
  isEvidenceDrawerOpen: boolean;
  evidenceData: string;
  setCopilotOpen: (open: boolean) => void;
  setActiveThreadId: (id: string | null) => void;
  setResponseMode: (mode: 'quick' | 'analysis' | 'report') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setEvidenceDrawerOpen: (open: boolean) => void;
  setEvidenceData: (data: string) => void;
  createThread: () => void;
  deleteThread: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  clearCurrentThread: () => void;
  renameThread: (id: string, title: string) => void;
}

export const useCopilotStore = create<CopilotState>((set, get) => {
  // Load initial threads from localStorage
  const savedThreadsRaw = localStorage.getItem('copilot_threads');
  let initialThreads: Thread[] = [];
  if (savedThreadsRaw) {
    try {
      initialThreads = JSON.parse(savedThreadsRaw);
    } catch (e) {
      console.error('Failed to parse saved threads:', e);
    }
  }

  // Ensure there is at least one active thread if we have history
  let initialActiveThreadId: string | null = null;
  if (initialThreads.length > 0) {
    initialActiveThreadId = initialThreads[0].id;
  } else {
    // Create a default thread if empty
    const defaultId = `thread_${Date.now()}`;
      initialThreads = [{
        id: defaultId,
        title: 'New Chat',
        messages: [],
        createdAt: Date.now()
      }];
      initialActiveThreadId = defaultId;
      localStorage.setItem('copilot_threads', JSON.stringify(initialThreads));
    }
  
    return {
      isCopilotOpen: false,
      threads: initialThreads,
      activeThreadId: initialActiveThreadId,
      isLoading: false,
      responseMode: 'quick',
      isSidebarCollapsed: false,
      isEvidenceDrawerOpen: false,
      evidenceData: '',
  
      setCopilotOpen: (open) => {
        if (open) {
          const activeId = get().activeThreadId;
          const activeThread = get().threads.find(t => t.id === activeId);
          if (activeThread && activeThread.messages.length > 0) {
            get().createThread();
          }
        }
        set({ isCopilotOpen: open });
      },
      
      setActiveThreadId: (id) => set({ activeThreadId: id }),
  
      setResponseMode: (mode) => set({ responseMode: mode }),
  
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  
      setEvidenceDrawerOpen: (open) => set({ isEvidenceDrawerOpen: open }),
  
      setEvidenceData: (data) => set({ evidenceData: data }),
  
      createThread: () => {
        const newId = `thread_${Date.now()}`;
        const newThread: Thread = {
          id: newId,
          title: 'New Chat',
          messages: [],
          createdAt: Date.now()
        };
        
        // Limit to max 15 threads to guarantee storing at least 10
        const updatedThreads = [newThread, ...get().threads].slice(0, 15);
        
        localStorage.setItem('copilot_threads', JSON.stringify(updatedThreads));
        set({ threads: updatedThreads, activeThreadId: newId });
      },
  
      deleteThread: (id) => {
        let updatedThreads = get().threads.filter(t => t.id !== id);
        
        // Always keep at least 1 thread
        if (updatedThreads.length === 0) {
          const newId = `thread_${Date.now()}`;
          updatedThreads = [{
            id: newId,
            title: 'New Chat',
            messages: [],
            createdAt: Date.now()
          }];
        }
        
        const newActiveId = get().activeThreadId === id ? updatedThreads[0].id : get().activeThreadId;
        
        localStorage.setItem('copilot_threads', JSON.stringify(updatedThreads));
        set({ threads: updatedThreads, activeThreadId: newActiveId });
      },
  
      renameThread: (id, title) => {
        const updatedThreads = get().threads.map(t => 
          t.id === id ? { ...t, title } : t
        );
        localStorage.setItem('copilot_threads', JSON.stringify(updatedThreads));
        set({ threads: updatedThreads });
      },
  
      clearCurrentThread: () => {
        const activeId = get().activeThreadId;
        if (!activeId) return;
  
        const updatedThreads = get().threads.map(t => 
          t.id === activeId ? { ...t, messages: [], title: 'New Chat' } : t
        );
  
        localStorage.setItem('copilot_threads', JSON.stringify(updatedThreads));
        set({ threads: updatedThreads });
      },
  
      sendMessage: async (content) => {
        const activeId = get().activeThreadId;
        if (!activeId || !content.trim()) return;
  
        // Add user message to current thread
        const userMessage: Message = { role: 'user', content };
        let currentThreads = get().threads.map(t => {
          if (t.id === activeId) {
            const updatedMsgs = [...t.messages, userMessage];
            // Auto rename thread if it was default
            const title = t.title === 'New Chat' ? content.substring(0, 24) + (content.length > 24 ? '...' : '') : t.title;
          return { ...t, messages: updatedMsgs, title };
        }
        return t;
      });

      set({ threads: currentThreads, isLoading: true });
      localStorage.setItem('copilot_threads', JSON.stringify(currentThreads));

      try {
        const activeThread = currentThreads.find(t => t.id === activeId);
        const chatPayload = activeThread ? activeThread.messages : [userMessage];

        const response = await api.post('/ai/copilot', {
          messages: chatPayload,
          mode: get().responseMode
        });

        const assistantContent = response.data.response || 'No response received.';
        const assistantMessage: Message = { role: 'assistant', content: assistantContent };
        const evidence = response.data.evidence || '';

        const finalThreads = get().threads.map(t => {
          if (t.id === activeId) {
            return { ...t, messages: [...t.messages, assistantMessage] };
          }
          return t;
        });

        set({ threads: finalThreads, isLoading: false, evidenceData: evidence });
        localStorage.setItem('copilot_threads', JSON.stringify(finalThreads));
      } catch (err) {
        console.error('Copilot send message failed:', err);
        const errorMessage: Message = { 
          role: 'assistant', 
          content: 'Sorry, I failed to generate a response. Please verify that the Groq API key is set.' 
        };

        const finalThreads = get().threads.map(t => {
          if (t.id === activeId) {
            return { ...t, messages: [...t.messages, errorMessage] };
          }
          return t;
        });

        set({ threads: finalThreads, isLoading: false, evidenceData: '' });
        localStorage.setItem('copilot_threads', JSON.stringify(finalThreads));
      }
    }
  };
});
