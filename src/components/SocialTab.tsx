import React from 'react';
import { Youtube, Share2, CheckCircle2, Instagram, Music2 } from 'lucide-react';
import { CineScriptPackage } from '../types';

interface SocialTabProps {
  result: CineScriptPackage;
}

export const SocialTab: React.FC<SocialTabProps> = ({ result }) => {
  const getIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('youtube') || p.includes('shorts')) return <Youtube className="w-12 h-12 text-red-500 mb-2" />;
    if (p.includes('instagram') || p.includes('reels')) return <Instagram className="w-12 h-12 text-pink-500 mb-2" />;
    if (p.includes('tiktok')) return <Music2 className="w-12 h-12 text-white mb-2" />;
    return <Share2 className="w-12 h-12 text-cinema-gold mb-2" />;
  };

  return (
    <div className="space-y-8">
      <h3 className="text-2xl font-display font-bold mb-4">Adaptaciones para Redes Sociales</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {result.socialVersions?.map((version, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-6 hover:border-cinema-gold/30 transition-colors">
            <div className="flex flex-col items-center justify-center p-6 bg-cinema-gold/5 rounded-2xl border border-cinema-gold/10">
              {getIcon(version.platform)}
              <span className="font-display font-bold text-lg">{version.platform}</span>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-cinema-gold uppercase tracking-widest block mb-1">Gancho (Hook)</span>
                <p className="text-lg font-bold leading-tight text-white">"{version.hook}"</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Puntos Clave</span>
                <ul className="space-y-2">
                  {version.keyPoints?.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-gray-300">
                      <CheckCircle2 className="w-3 h-3 text-cinema-gold shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-4 border-t border-white/5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Call to Action</span>
                <p className="text-cinema-gold font-bold text-sm">{version.callToAction}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
