import React from 'react';
import { FileUp, FileText, GitCompare, MessageSquare, CheckSquare, Scale } from 'lucide-react';

export type TabType = 'ingest' | 'clauses' | 'compare' | 'ask' | 'nextsteps';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'ingest' as TabType, label: 'Upload Document', icon: FileUp },
    { id: 'clauses' as TabType, label: 'Clause Dashboard', icon: FileText },
    { id: 'compare' as TabType, label: 'Contract Compare', icon: GitCompare },
    { id: 'ask' as TabType, label: 'Legal Q&A', icon: MessageSquare },
    { id: 'nextsteps' as TabType, label: 'Action Plans', icon: CheckSquare },
  ];

  return (
    <header className="border-b border-[#1e293b] bg-[#0a1128] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-amber-600 text-slate-950 font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-serif font-bold text-slate-100 tracking-tight">
                JurisMind
              </span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-[#162032] text-amber-400 border border-[#233047]">
                Legal Assistant
              </span>
            </div>
          </div>

          <nav className="flex space-x-1 sm:space-x-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#1c2541] text-amber-400 border border-amber-600/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#111936]'
                  }`}
                >
                  <Icon className="w-4 h-4 text-amber-500/80" />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
