import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { 
   LayoutDashboard, 
   Network, 
   Search, 
   Grid3X3, 
   Award, 
   FileText,
   Home,
   ChevronRight,
   ChevronLeft,
   ChevronsRight,
   ShieldAlert,
   Database
} from 'lucide-react';

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const menuItems = [
    { name: 'Executive Hub', path: '/', icon: Home },
    { name: 'Executive Analytics', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Capability Network', path: '/explorer', icon: Network },
    { name: 'Credential Repository', path: '/projects', icon: Search },
    { name: 'Expertise Coverage Matrix', path: '/capability-matrix', icon: Grid3X3 },
    { name: 'Credential Finder', path: '/credentials', icon: Award },
    { name: 'Kantar Capability Profile', path: '/report', icon: FileText },
    { name: 'Data Quality Center', path: '/data-quality', icon: ShieldAlert },
    { name: 'Database Manager', path: '/database-manager', icon: Database }
  ];

  return (
    <aside className={`bg-card border-r border-border h-full flex flex-col justify-between select-none shrink-0 transition-all duration-300 ease-in-out ${
      sidebarCollapsed ? 'w-16' : 'w-60'
    }`}>
      <div className="flex flex-col flex-1 py-4 overflow-y-auto">
        
        {/* Sidebar section header and Collapsible Lever Trigger */}
        <div className="px-6 py-2 flex items-center justify-between h-8 overflow-hidden">
          {!sidebarCollapsed ? (
            <>
              <p className="text-[9px] text-muted-foreground font-extrabold tracking-wider uppercase truncate animate-in fade-in slide-in-from-left-2 duration-300">
                Strategic intelligence
              </p>
              <button
                onClick={toggleSidebarCollapsed}
                className="p-1 rounded bg-secondary/30 hover:bg-secondary cursor-pointer text-muted-foreground hover:text-foreground transition-all shrink-0 ml-2 hover:scale-110 active:scale-95"
                title="Collapse sidebar navigation menu"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="flex w-full justify-center animate-in fade-in duration-300">
              <button
                onClick={toggleSidebarCollapsed}
                className="p-1.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary cursor-pointer text-muted-foreground hover:text-foreground transition-all shrink-0 hover:scale-105 active:scale-95"
                title="Expand sidebar navigation menu"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className={`py-2 space-y-1 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
          {menuItems.map((item, idx) => (
            <NavLink
              key={idx}
              to={item.path}
              title={sidebarCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                `flex items-center group cursor-pointer transition-all duration-300 ease-in-out ${
                  sidebarCollapsed 
                    ? 'justify-center h-10 w-10 mx-auto rounded-xl' 
                    : 'justify-between px-3 py-2 rounded-lg'
                } ${
                  isActive 
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 text-xs font-semibold' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground text-xs font-semibold'
                }`
              }
            >
              <div className={sidebarCollapsed ? 'flex items-center justify-center' : 'flex items-center gap-2.5 min-w-0'}>
                <item.icon className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110 group-active:scale-90" />
                {!sidebarCollapsed && (
                  <span className="truncate animate-in fade-in slide-in-from-left-1 duration-300">
                    {item.name}
                  </span>
                )}
              </div>
              {!sidebarCollapsed && (
                <ChevronRight className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-4px] group-hover:translate-x-0" />
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Signature Developer Footer */}
      <div className="p-4 border-t border-border/50 text-[10px] text-muted-foreground/60 font-semibold select-none h-[49px] overflow-hidden flex items-center justify-center">
        {!sidebarCollapsed ? (
          <a 
            href="https://www.chethanyallampalli.in" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-primary transition-colors flex items-center gap-0.5 cursor-pointer w-full justify-start animate-in fade-in slide-in-from-left-2 duration-300"
          >
            Built by Chethan Y <span className="text-[8px] font-black">↗</span>
          </a>
        ) : (
          <a 
            href="https://www.chethanyallampalli.in" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block text-center font-extrabold hover:text-primary transition-colors cursor-pointer animate-in fade-in zoom-in-75 duration-300" 
            title="Built by Chethan Y"
          >
            CY
          </a>
        )}
      </div>
    </aside>
  );
}
