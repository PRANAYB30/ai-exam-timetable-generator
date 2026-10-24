import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Building2,
  Sliders,
  Sparkles,
  CalendarDays,
  ShieldAlert,
  BarChart3
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'exams'
  | 'groups'
  | 'rooms'
  | 'config'
  | 'generate'
  | 'viewer'
  | 'validation'
  | 'explain';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  hardViolationCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  hardViolationCount = 0
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'exams' as NavTab, label: 'Examinations', icon: BookOpen },
    { id: 'groups' as NavTab, label: 'Student Groups', icon: Users },
    { id: 'rooms' as NavTab, label: 'Rooms & Capacity', icon: Building2 },
    { id: 'config' as NavTab, label: 'Scheduling Config', icon: Sliders },
    { id: 'generate' as NavTab, label: 'Generate Timetable', icon: Sparkles, highlight: true },
    { id: 'viewer' as NavTab, label: 'Timetable Viewer', icon: CalendarDays },
    {
      id: 'validation' as NavTab,
      label: 'Conflict Audit',
      icon: ShieldAlert,
      badge: hardViolationCount > 0 ? hardViolationCount : undefined
    },
    { id: 'explain' as NavTab, label: 'AI Explanations & Stats', icon: BarChart3 }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Navigation Menu</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : item.highlight
                  ? 'text-indigo-400 hover:bg-slate-800 hover:text-indigo-300 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* AI Specification Footer Box */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 m-3 rounded-lg text-xs space-y-1.5">
        <div className="flex items-center text-slate-300 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
          CSP Engine Spec
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          Backtracking Search with MRV variable selection, Degree heuristic, LCV value ordering, Forward Checking & Branch-and-bound optimization.
        </p>
      </div>
    </aside>
  );
};
