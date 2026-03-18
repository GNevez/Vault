import React from 'react'
import {
  LayoutGrid,
  Download,
  User,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Link2,
  Book,
} from "lucide-react";

interface SidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onLogout: () => void;
  username: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems = [
  { id: "catalog", label: "Catalog", icon: LayoutGrid },
  { id: "library", label: "Library", icon: Book },
  { id: "fonte", label: "Sources", icon: Link2 },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "profile", label: "Profile", icon: User },
];

export function Sidebar({
  activeSection,
  onNavigate,
  onLogout,
  username,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const renderNavButton = (item: (typeof navItems)[0]) => {
    const isActive = activeSection === item.id;
    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        title={collapsed ? item.label : undefined}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer overflow-hidden whitespace-nowrap
          ${
            isActive
              ? "bg-zinc-800 text-zinc-50"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
          }
        `}
      >
        <item.icon
          className={`w-4 h-4 shrink-0 ${isActive ? "text-zinc-50" : "text-zinc-500"}`}
          strokeWidth={1.8}
        />
        {!collapsed && item.label}
      </button>
    );
  };

  const isSettingsActive = activeSection === "settings";

  return (
    <aside
      className={`${collapsed ? "w-[60px]" : "w-[200px]"} h-full flex flex-col bg-surface-dark border-r border-border-dark transition-all duration-300 shrink-0`}
    >
      <div
        className="flex items-center gap-3 px-3 h-16 border-b border-border-dark overflow-hidden"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
          <p className="text-xs font-semibold text-zinc-100 truncate">
            {username}
          </p>
          <p className="text-[10px] text-zinc-500">Online</p>
        </div>
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer shrink-0"
            title="Collapse sidebar"
          >
            <ChevronsLeft className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        )}
      </div>

      <nav
        className="flex-1 flex flex-col gap-1 px-2 py-3"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        {collapsed && (
          <button
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className="flex items-center justify-center py-2 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-all duration-200 cursor-pointer mb-1"
          >
            <ChevronsRight className="w-4 h-4" strokeWidth={1.8} />
          </button>
        )}
        {navItems.map(renderNavButton)}
      </nav>

      <div
        className="px-2 py-3 border-t border-border-dark flex flex-col gap-1"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <button
          onClick={() => onNavigate("settings")}
          title={collapsed ? "Settings" : undefined}
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 w-full cursor-pointer overflow-hidden whitespace-nowrap
            ${
              isSettingsActive
                ? "bg-zinc-800 text-zinc-50"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            }
          `}
        >
          <Settings
            className={`w-4 h-4 shrink-0 ${isSettingsActive ? "text-zinc-50" : "text-zinc-500"}`}
            strokeWidth={1.8}
          />
          {!collapsed && "Settings"}
        </button>
        <button
          onClick={onLogout}
          title={collapsed ? "Logout" : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50 transition-all duration-200 w-full cursor-pointer overflow-hidden whitespace-nowrap`}
        >
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          {!collapsed && "Logout"}
        </button>
      </div>
    </aside>
  );
}
