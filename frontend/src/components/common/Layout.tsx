import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from './CommandPalette';
import CopilotDrawer from './CopilotDrawer';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useCopilotStore } from '../../store/copilotStore';
import { Bot, X } from 'lucide-react';

export default function Layout() {
  const { isAuthenticated, checkAuth, loading } = useAuthStore();
  const { presentationMode, togglePresentationMode } = useUIStore();
  const { isCopilotOpen, setCopilotOpen } = useCopilotStore();
  const [showTooltip, setShowTooltip] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Auto-dismiss the helper speech bubble after 6 seconds to prevent screen clutter
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Check authentication on mount
    checkAuth();
  }, [location.pathname]);

  useEffect(() => {
    // Redirect if not authenticated (except if on login page)
    if (!isAuthenticated && !localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Cmd+I or Ctrl+I shortcut to toggle copilot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setCopilotOpen(!isCopilotOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCopilotOpen, setCopilotOpen]);

  if (!isAuthenticated && !localStorage.getItem('token')) {
    return null;
  }

  if (!isAuthenticated && localStorage.getItem('token')) {
    // Session is validating
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase animate-pulse">
          Validating Security Session...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground">
      
      {/* Header Bar (Full Width on Top) */}
      {!presentationMode && <Header />}

      {/* Content layout (Sidebar + Main side-by-side) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        {!presentationMode && <Sidebar />}

        {/* Page Content Panel */}
        <main className={`flex-1 overflow-y-auto bg-background transition-all duration-300 ${presentationMode ? 'p-2 md:p-4' : 'p-6'}`}>
          <div className="max-w-7xl mx-auto w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {presentationMode && (
        <button
          onClick={togglePresentationMode}
          className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-bold rounded-full shadow-2xl hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 transition-all uppercase tracking-wider select-none animate-bounce border border-border"
        >
          <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
          <span>Exit Presentation Mode</span>
        </button>
      )}

      {/* Floating launcher button for Copilot */}
      {!presentationMode && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 select-none pointer-events-none">
          {/* Tooltip Speech Bubble */}
          {!isCopilotOpen && (
            <div className={`relative bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-xl flex items-start gap-3 w-72 mb-1 transition-all duration-300 ease-out origin-bottom-right ${
              showTooltip ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto' : 'scale-95 opacity-0 translate-y-2 pointer-events-none'
            }`}>
              {/* Blue icon circle container */}
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
              
              {/* Text area */}
              <div className="flex-1 space-y-0.5">
                <p className="text-[10px] font-black text-blue-600 tracking-wider uppercase">AI Assistant</p>
                <p className="text-xs font-bold text-gray-900 leading-tight">Need help? Ask me anything!</p>
              </div>

              {/* Close Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(false);
                }}
                className="text-slate-400 hover:text-gray-900 cursor-pointer p-0.5 rounded transition-colors pointer-events-auto"
                title="Close suggestion"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Speech Bubble Arrow pointing down to the button */}
              <div className="absolute bottom-[-6px] right-5 w-3 h-3 bg-white border-r border-b border-[#E2E8F0] transform rotate-45"></div>
            </div>
          )}

          {/* Button container */}
          <div className="relative flex items-center justify-center pointer-events-auto">
            {/* Pulsing ring indicator */}
            {!isCopilotOpen && (
              <span className="absolute inline-flex h-12 w-12 animate-ping rounded-full bg-gray-400 opacity-25"></span>
            )}
            <button
              onClick={() => {
                setCopilotOpen(!isCopilotOpen);
                setShowTooltip(false);
              }}
              className="relative p-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-full shadow-lg shadow-gray-900/30 hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center transition-all border border-gray-700/20"
              title="Open Copilot (⌘I)"
            >
              <Bot className="w-5.5 h-5.5" />
            </button>

            {/* Notification Badge "1" */}
            <span className={`absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white border-2 border-white shadow-md transition-all duration-300 ease-out ${
              !isCopilotOpen && showTooltip ? 'scale-100 opacity-100 animate-pulse-ring' : 'scale-0 opacity-0 pointer-events-none'
            }`}>
              1
            </span>
          </div>
        </div>
      )}

      {/* Command Palette keyboard-listener overlay */}
      <CommandPalette />

      {/* Copilot Drawer Panel */}
      <CopilotDrawer />
    </div>
  );
}
