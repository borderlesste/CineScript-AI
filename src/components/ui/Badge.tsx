import React from 'react';

interface BadgeProps {
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({ label, icon, variant = 'default' }) => (
  <div className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${
    variant === 'default' 
      ? 'bg-cinema-gold/10 text-cinema-gold border border-cinema-gold/20' 
      : 'bg-white/5 text-gray-400 border border-white/10'
  }`}>
    {icon}
    {label}
  </div>
);
