import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Search, LogOut, Menu, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme, setCommandPaletteOpen, sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { logout, user } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside listener for user dropdown
  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  // Create breadcrumb strings from URL path
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(p => p);
    if (paths.length === 0) return ['Overview'];
    
    return paths.map(path => {
      // Capitalize and clean up path segments
      const title = path.replace(/-/g, ' ');
      return title.charAt(0).toUpperCase() + title.slice(1);
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-14 border-b border-border bg-card px-6 flex items-center justify-between select-none shrink-0 sticky top-0 z-40">
      
      {/* Left side: Brand Logo */}
      <div className="flex items-center gap-4">
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-4 border-r border-none pr-6 py-1 h-9 shrink-0 select-none cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all"
          title="Executive Hub"
        >
          <div className="flex items-center gap-3">
            <img 
              src="/kantar_logo.png" 
              alt="Kantar" 
              className="h-4 w-auto object-contain dark:invert select-none pointer-events-none" 
            />
            <span className="text-[8px] bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-extrabold px-1.5 py-0.5 rounded border border-amber-500/20 tracking-wider">BSA</span>
          </div>
          <div className="h-4 w-[1px] bg-border" />
          <div>
            <h1 className="font-extrabold text-[12px] tracking-tight text-foreground leading-none">Capability Explorer</h1>
            <p className="text-[8px] text-muted-foreground font-extrabold tracking-wider uppercase mt-0.5 leading-none">Business Strategy & Analytics</p>
          </div>
        </div>
      </div>

      {/* Right side: Global search launcher + theme switcher + user avatar */}
      <div className="flex items-center gap-4">
        
        {/* CMD+K trigger button */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-border bg-secondary/30 hover:border-primary/20 text-muted-foreground hover:text-foreground text-[11px] font-medium cursor-pointer transition-all"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Quick search...</span>
          <kbd className="px-1.5 py-0.5 rounded border border-border/50 bg-card text-[8px] font-bold shadow-xs">
            ⌘K
          </kbd>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="hidden p-1.5 rounded-lg border border-border hover:bg-secondary/50 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          title="Toggle Light/Dark Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <Moon className="w-3.5 h-3.5" />
          )}
        </button>

        {/* User initials circle dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-extrabold text-[10px] text-amber-600 dark:text-amber-400 hover:opacity-90 cursor-pointer shrink-0"
          >
            {user ? user.substring(0, 2).toUpperCase() : 'KT'}
          </button>
          
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-xl py-1 z-50">
              <div className="px-4 py-2 border-b border-border/50">
                <p className="text-[11px] font-bold text-foreground truncate">{user || 'Kantar Strategist'}</p>
                <p className="text-[9px] text-muted-foreground truncate">Strategic Analytics Advisor</p>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full text-left px-4 py-2 text-[11px] font-bold text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout Session</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
