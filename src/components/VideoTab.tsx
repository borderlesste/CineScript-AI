import React from 'react';
import { Play, Loader2, Video, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { CineScriptPackage } from '../types';

interface VideoTabProps {
  result: CineScriptPackage;
  veoStatus: 'idle' | 'generating' | 'polling' | 'completed' | 'error';
  veoProgress: number;
  veoVideoUrl: string | null;
  veoError: string | null;
  generateVeoVideo: () => void;
}

export const VideoTab: React.FC<VideoTabProps> = ({
  result,
  veoStatus,
  veoProgress,
  veoVideoUrl,
  veoError,
  generateVeoVideo
}) => {
  return (
    <div className="space-y-8 text-center py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="w-20 h-20 bg-cinema-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Play className="w-10 h-10 text-cinema-gold" />
        </div>
        
        <div className="space-y-4">
          <h3 className="text-3xl font-display font-bold">Vista Previa de Video AI</h3>
          <p className="text-gray-400">
            Genera un clip cinematográfico utilizando el modelo **Veo 3.1**. 
            Utilizaremos el póster generado y el guion para crear una escena representativa.
          </p>
        </div>

        {veoStatus === 'idle' && (
          <button 
            onClick={generateVeoVideo}
            className="px-8 py-4 bg-cinema-gold text-black font-bold rounded-2xl hover:bg-yellow-400 transition-all flex items-center gap-3 mx-auto shadow-xl shadow-cinema-gold/20"
          >
            <Video className="w-5 h-5" />
            GENERAR CLIP CON VEO 3.1
          </button>
        )}

        {(veoStatus === 'generating' || veoStatus === 'polling') && (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-cinema-gold animate-spin" />
              <div className="space-y-2 w-full">
                <div className="flex justify-between text-xs font-bold text-cinema-gold uppercase tracking-widest">
                  <span>Generando Video...</span>
                  <span>{veoProgress}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <div 
                    className="h-full bg-cinema-gold transition-all duration-500" 
                    style={{ width: `${veoProgress}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 italic">
              Esto puede tomar un par de minutos. Estamos procesando los fotogramas con alta fidelidad cinematográfica.
            </p>
          </div>
        )}

        {veoStatus === 'completed' && veoVideoUrl && (
          <div className="space-y-6">
            <div className="relative group rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
              <video 
                src={veoVideoUrl} 
                controls 
                className="w-full aspect-video bg-black"
              />
              <div className="absolute top-4 right-4">
                <div className="bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                  <CheckCircle2 className="w-3 h-3" /> VEO 3.1 GENERATED
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-4">
              <a 
                href={veoVideoUrl} 
                download={`cinescript-${result.metadata?.title?.toLowerCase().replace(/\s+/g, '-')}.mp4`}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-cinema-gold transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> DESCARGAR VIDEO
              </a>
              <button 
                onClick={generateVeoVideo}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-gray-400 transition-all flex items-center gap-2"
              >
                <Video className="w-4 h-4" /> RE-GENERAR
              </button>
            </div>
          </div>
        )}

        {veoStatus === 'error' && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl space-y-4">
            <div className="flex items-center justify-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6" />
              <h4 className="font-bold">Error en la Generación</h4>
            </div>
            <p className="text-sm text-red-400/80">{veoError}</p>
            <button 
              onClick={generateVeoVideo}
              className="px-6 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
            >
              REINTENTAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
