import React from 'react';
import { Play, Loader2, Video, Download, Copy, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { CineScriptPackage } from '../types';

interface ScriptTabProps {
  result: CineScriptPackage;
  generatingAudio: boolean;
  generateAudio: () => void;
  generateHeyGenVideo: () => void;
  heygenStatus: string;
  heygenVideoUrl: string | null;
  heygenError: string | null;
  downloadScript: () => void;
  copyToClipboard: (text: string) => void;
}

export const ScriptTab: React.FC<ScriptTabProps> = ({
  result,
  generatingAudio,
  generateAudio,
  generateHeyGenVideo,
  heygenStatus,
  heygenVideoUrl,
  heygenError,
  downloadScript,
  copyToClipboard
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-display font-bold">Guion de Voz en Off</h3>
        <div className="flex items-center gap-4">
          <button 
            onClick={generateAudio}
            disabled={generatingAudio}
            className="flex items-center gap-2 text-xs font-bold text-cinema-gold hover:text-yellow-400 transition-colors disabled:opacity-50"
          >
            {generatingAudio ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            GENERAR NARRACIÓN (TTS)
          </button>
          <button 
            onClick={generateHeyGenVideo}
            disabled={heygenStatus === 'generating' || heygenStatus === 'polling'}
            className="flex items-center gap-2 text-xs font-bold text-cinema-gold hover:text-yellow-400 transition-colors disabled:opacity-50"
          >
            {heygenStatus === 'generating' || heygenStatus === 'polling' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Video className="w-4 h-4" />
            )}
            GENERAR AVATAR VIDEO
          </button>
          <button 
            onClick={downloadScript}
            className="flex items-center gap-2 text-xs font-bold text-cinema-gold hover:text-yellow-400 transition-colors"
          >
            <Download className="w-4 h-4" /> DESCARGAR .TXT
          </button>
          <button 
            onClick={() => copyToClipboard(result.voiceOverScript?.map(s => `[${s.timecode}] ${s.audio}`).join('\n') || '')}
            className="flex items-center gap-2 text-xs font-bold text-cinema-gold hover:text-yellow-400 transition-colors"
          >
            <Copy className="w-4 h-4" /> COPIAR GUION
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {result.generatedAudioUrl && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-cinema-gold/20 rounded-full flex items-center justify-center">
                <Play className="w-5 h-5 text-cinema-gold" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Narración Generada</h4>
                <p className="text-xs text-gray-500">Audio profesional por Gemini TTS</p>
              </div>
            </div>
            <audio src={result.generatedAudioUrl} controls className="h-8" />
          </div>
        )}

        {heygenStatus === 'completed' && heygenVideoUrl && (
          <div className="bg-cinema-gold/10 border border-cinema-gold/30 rounded-2xl p-6 mb-6">
            <h4 className="text-cinema-gold font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Video de Avatar Generado
            </h4>
            <video 
              src={heygenVideoUrl} 
              controls 
              className="w-full rounded-xl shadow-2xl border border-white/10"
            />
          </div>
        )}
        
        {heygenStatus === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6 flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{heygenError}</p>
          </div>
        )}

        {result.voiceOverScript?.map((seg, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex gap-6">
            <div className="w-24 shrink-0 font-mono text-cinema-gold font-bold text-sm">{seg.timecode}</div>
            <div className="flex-1 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Visual</span>
                <p className="text-sm text-gray-400">{seg.visual}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Audio (Voz en Off)</span>
                <p className="text-lg leading-relaxed text-white font-medium">{seg.audio}</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-cinema-gold/60 uppercase">
                <ChevronRight className="w-3 h-3" /> Transición: {seg.transition}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
