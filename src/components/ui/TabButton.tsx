import React from 'react';
import { cn } from '../../lib/utils';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-300",
      active 
        ? "bg-cinema-gold text-black shadow-[0_0_20px_rgba(255,184,0,0.3)]" 
        : "text-gray-500 hover:text-white hover:bg-white/5"
    )}
  >
    {icon}
    {label}
  </button>
);
