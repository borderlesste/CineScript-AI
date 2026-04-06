import React from 'react';
import { Film, Clapperboard, Info, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Badge } from './ui/Badge';
import { CineScriptPackage } from '../types';

interface MetadataTabProps {
  result: CineScriptPackage;
  generatingImage: boolean;
  generatePoster: () => void;
}

export const MetadataTab: React.FC<MetadataTabProps> = ({ result, generatingImage, generatePoster }) => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 space-y-4">
          <div className="h-96 bg-white/5 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center relative group">
            {result.generatedImageUrl ? (
              <img 
                src={result.generatedImageUrl} 
                alt="AI Generated Poster" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Film className="w-12 h-12 text-white/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
              <span className="text-cinema-gold text-xs font-bold uppercase tracking-widest mb-1">{result.metadata?.year}</span>
              <h3 className="text-xl font-bold leading-tight">{result.metadata?.title}</h3>
            </div>
          </div>
          
          <button 
            onClick={generatePoster}
            disabled={generatingImage}
            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-cinema-gold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {generatingImage ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Clapperboard className="w-4 h-4" />
            )}
            {generatingImage ? 'GENERANDO PÓSTER...' : 'GENERAR PÓSTER AI'}
          </button>
        </div>
        
        <div className="flex-1 space-y-6">
          <div className="flex flex-wrap gap-4">
            <Badge icon={<Info className="w-3 h-3" />} label={result.metadata?.rating || 'N/A'} />
            <Badge label={result.metadata?.duration || 'N/A'} />
            {result.metadata?.genre?.map(g => <Badge key={g} label={g} variant="outline" />)}
          </div>
          
          <div>
            <h4 className="text-cinema-gold font-bold text-sm uppercase tracking-widest mb-2">Director</h4>
            <p className="text-lg">{result.metadata?.director}</p>
          </div>

          <div>
            <h4 className="text-cinema-gold font-bold text-sm uppercase tracking-widest mb-2">Reparto Principal</h4>
            <p className="text-gray-300">{result.metadata?.cast?.join(', ')}</p>
          </div>

          <div>
            <h4 className="text-cinema-gold font-bold text-sm uppercase tracking-widest mb-2">Sinopsis Oficial</h4>
            <p className="text-gray-300 leading-relaxed italic">"{result.metadata?.synopsis}"</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 pt-8">
        <h3 className="text-2xl font-display font-bold mb-4">Resumen Narrativo Cinematográfico</h3>
        <div className="markdown-body text-gray-300">
          <ReactMarkdown>{result.narrativeSummary}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
