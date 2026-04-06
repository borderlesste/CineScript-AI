import React from 'react';
import { Layout } from 'lucide-react';
import { CineScriptPackage } from '../types';

interface StoryboardTabProps {
  result: CineScriptPackage;
}

export const StoryboardTab: React.FC<StoryboardTabProps> = ({ result }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-display font-bold mb-4">Storyboard & Plan de Edición</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {result.storyboard?.map((item, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <div className="h-40 bg-white/10 flex items-center justify-center relative">
              <Layout className="w-8 h-8 text-white/10" />
              <div className="absolute top-4 left-4 bg-cinema-gold text-black text-[10px] font-black px-2 py-1 rounded">
                SEGMENTO {i + 1}
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <h4 className="font-bold text-lg">{item.segment}</h4>
              </div>
            </div>
            <div className="p-6 space-y-4 flex-1">
              <p className="text-sm text-gray-400">{item.description}</p>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-cinema-gold uppercase block mb-1">Referencia Visual</span>
                <p className="text-xs text-gray-300">{item.visualReference}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Clips Sugeridos</span>
                <div className="flex flex-wrap gap-2">
                  {item.suggestedClips?.map((clip, j) => (
                    <span key={j} className="text-[10px] bg-white/5 px-2 py-1 rounded border border-white/10 text-gray-400">
                      {clip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
