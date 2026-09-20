import React, { useState } from 'react';
import { Navbar, TabType } from './components/Navbar';
import { IngestPage } from './pages/IngestPage';
import { ClausesPage } from './pages/ClausesPage';
import { ComparePage } from './pages/ComparePage';
import { AskPage } from './pages/AskPage';
import { NextStepsPage } from './pages/NextStepsPage';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('ingest');

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'ingest':
        return <IngestPage />;
      case 'clauses':
        return <ClausesPage />;
      case 'compare':
        return <ComparePage />;
      case 'ask':
        return <AskPage />;
      case 'nextsteps':
        return <NextStepsPage />;
      default:
        return <IngestPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveTab()}
      </main>
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        <p>ClauseWise Legal AI Monorepo • Backend FastAPI • Frontend React Vite Tailwind • ChromaDB</p>
      </footer>
    </div>
  );
};

export default App;
