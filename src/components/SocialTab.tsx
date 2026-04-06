import React from 'react';
import { Youtube, Share2, CheckCircle2 } from 'lucide-react';
import { CineScriptPackage } from '../types';

interface SocialTabProps {
  result: CineScriptPackage;
}

export const SocialTab: React.FC<SocialTabProps> = ({ result }) => {
  return (
    <div className="space-y-8">
      <h3 className="text-2xl font-display font-bold mb-4">Adaptaciones para Redes Sociales</h3>
      <div className="grid grid-cols-1 gap-6">
        {result.socialVersions?.map((version, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-48 shrink-0 flex flex-col items-center justify-center p-6 bg-cinema-gold/10 rounded-2xl border border-cinema-gold/20">
              {version.platform === 'YouTube' ? <Youtube className="w-12 h-12 text-red-500 mb-2" /> : <Share2 className="w-12 h-12 text-cinema-gold mb-2" />}
              <span className="font-display font-bold text-xl">{version.platform}</span>
            </div>
            <div className="flex-1 space-y-6">
              <div>
                <span className="text-xs font-bold text-cinema-gold uppercase tracking-widest block mb-2">Gancho (Hook)</span>
                <p className="text-xl font-bold leading-tight text-white">"{version.hook}"</p>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Puntos Clave</span>
                <ul className="space-y-2">
                  {version.keyPoints?.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-cinema-gold shrink-0 mt-1" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-4 border-t border-white/5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Call to Action</span>
                <p className="text-cinema-gold font-bold">{version.callToAction}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
