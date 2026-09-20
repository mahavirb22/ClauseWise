import React from 'react';

interface HeaderProps {
  title: string;
  description: string;
  endpoint?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, description }) => {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
      <div>
        <h1 className="text-2xl font-serif font-bold text-slate-100 tracking-tight">{title}</h1>
        <p className="text-sm text-slate-400 mt-1">{description}</p>
      </div>
    </div>
  );
};
