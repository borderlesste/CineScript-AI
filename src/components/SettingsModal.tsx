import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
  servicesStatus: {
    gateway: boolean;
    tmdb: boolean;
    heygen: boolean;
    elevenlabs: boolean;
    youtube: boolean;
  };
  saveTmdbKey: (key: string) => void;
  saveHeygenKey: (key: string) => void;
  saveElevenLabsKey: (key: string) => void;
  saveYoutubeKey: (key: string) => void;
  selectedAvatar: string;
  setSelectedAvatar: (id: string) => void;
  selectedVoice: string;
  setSelectedVoice: (id: string) => void;
  ttsProvider: 'gemini' | 'elevenlabs';
  setTtsProvider: (provider: 'gemini' | 'elevenlabs') => void;
  heygenAvatars: { id: string; name: string }[];
  heygenVoices: { id: string; name: string }[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  show,
  onClose,
  servicesStatus,
  saveTmdbKey,
  saveHeygenKey,
  saveElevenLabsKey,
  saveYoutubeKey,
  selectedAvatar,
  setSelectedAvatar,
  selectedVoice,
  setSelectedVoice,
  ttsProvider,
  setTtsProvider,
  heygenAvatars,
  heygenVoices
}) => {
  const [isValidatingHeygen, setIsValidatingHeygen] = useState(false);
  const [heygenValidationStatus, setHeygenValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [heygenError, setHeygenError] = useState<string | null>(null);

  const validateHeygenKey = async (key: string) => {
    if (!key) {
      setHeygenValidationStatus('idle');
      setHeygenError(null);
      saveHeygenKey('');
      return;
    }

    setIsValidatingHeygen(true);
    setHeygenError(null);
    
    try {
      const response = await fetch('/api/heygen/validate', {
        method: 'GET',
        headers: {
          'x-heygen-api-key': key
        }
      });
      
      const data = await response.json();
      if (data.valid) {
        setHeygenValidationStatus('valid');
        saveHeygenKey(key);
      } else {
        setHeygenValidationStatus('invalid');
        setHeygenError(data.error || 'Clave de API inválida');
      }
    } catch (err) {
      setHeygenValidationStatus('invalid');
      setHeygenError('Error al validar la clave');
    } finally {
      setIsValidatingHeygen(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-cinema-black border border-white/10 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-display font-bold">Gestión de Servicios</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-white">
                <AlertCircle className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Gateway Status */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", servicesStatus.gateway ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50")} />
                  <div>
                    <h4 className="font-bold text-sm">Vercel AI Gateway</h4>
                    <p className="text-xs text-gray-500">Motor principal de generación (Gemini)</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {servicesStatus.gateway ? "CONECTADO" : "SIN CLAVE"}
                </span>
              </div>

              {/* TMDb Status */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", servicesStatus.tmdb ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50")} />
                    <div>
                      <h4 className="font-bold text-sm">TMDb API (Opcional)</h4>
                      <p className="text-xs text-gray-500">Metadatos oficiales extendidos</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    defaultValue={localStorage.getItem('tmdb_key') || ''}
                    placeholder="Ingresa tu API Key de TMDb"
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cinema-gold"
                    onBlur={(e) => saveTmdbKey(e.target.value)}
                  />
                </div>
              </div>

              {/* HeyGen Status */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", servicesStatus.heygen ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50")} />
                    <div>
                      <h4 className="font-bold text-sm">HeyGen AI (Avatar Video)</h4>
                      <p className="text-xs text-gray-500">Generación de videos con avatares AI</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <input 
                      type="password" 
                      defaultValue={localStorage.getItem('heygen_key') || ''}
                      placeholder="Ingresa tu API Key de HeyGen"
                      className={cn(
                        "w-full bg-black/40 border rounded-lg px-3 py-2 text-xs focus:outline-none transition-colors pr-10",
                        heygenValidationStatus === 'valid' ? "border-green-500/50 focus:border-green-500" : 
                        heygenValidationStatus === 'invalid' ? "border-red-500/50 focus:border-red-500" : 
                        "border-white/10 focus:border-cinema-gold"
                      )}
                      onChange={(e) => {
                        if (heygenValidationStatus !== 'idle') setHeygenValidationStatus('idle');
                      }}
                      onBlur={(e) => validateHeygenKey(e.target.value)}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isValidatingHeygen ? (
                        <Loader2 className="w-4 h-4 text-cinema-gold animate-spin" />
                      ) : heygenValidationStatus === 'valid' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : heygenValidationStatus === 'invalid' ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                  
                  {heygenError && (
                    <p className="text-[10px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {heygenError}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Avatar</label>
                      <select 
                        value={selectedAvatar}
                        onChange={(e) => setSelectedAvatar(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cinema-gold appearance-none"
                      >
                        {heygenAvatars.map(avatar => (
                          <option key={avatar.id} value={avatar.id}>{avatar.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Voz</label>
                      <select 
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cinema-gold appearance-none"
                      >
                        {heygenVoices.map(voice => (
                          <option key={voice.id} value={voice.id}>{voice.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* ElevenLabs Status */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", servicesStatus.elevenlabs ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50")} />
                    <div>
                      <h4 className="font-bold text-sm">ElevenLabs (Premium TTS)</h4>
                      <p className="text-xs text-gray-500">Voces ultra-realistas para narración</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    defaultValue={localStorage.getItem('elevenlabs_key') || ''}
                    placeholder="Ingresa tu API Key de ElevenLabs"
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cinema-gold"
                    onBlur={(e) => saveElevenLabsKey(e.target.value)}
                  />
                </div>
              </div>

              {/* YouTube Status */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", servicesStatus.youtube ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50")} />
                    <div>
                      <h4 className="font-bold text-sm">YouTube Data API</h4>
                      <p className="text-xs text-gray-500">Búsqueda de trailers y referencias</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    defaultValue={localStorage.getItem('youtube_key') || ''}
                    placeholder="Ingresa tu API Key de YouTube"
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cinema-gold"
                    onBlur={(e) => saveYoutubeKey(e.target.value)}
                  />
                </div>
              </div>

              {/* TTS Provider Selection */}
              <div className="p-4 bg-cinema-gold/5 rounded-2xl border border-cinema-gold/20 space-y-3">
                <h4 className="text-[10px] font-bold text-cinema-gold uppercase tracking-widest">Proveedor de Narración (TTS)</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setTtsProvider('gemini')}
                    className={cn(
                      "py-2 px-3 rounded-xl text-[10px] font-bold transition-all border",
                      ttsProvider === 'gemini' 
                        ? "bg-cinema-gold text-black border-cinema-gold" 
                        : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                    )}
                  >
                    GEMINI (GRATIS)
                  </button>
                  <button 
                    onClick={() => setTtsProvider('elevenlabs')}
                    className={cn(
                      "py-2 px-3 rounded-xl text-[10px] font-bold transition-all border",
                      ttsProvider === 'elevenlabs' 
                        ? "bg-cinema-gold text-black border-cinema-gold" 
                        : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                    )}
                  >
                    ELEVENLABS (PRO)
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="w-full py-2 text-[10px] font-bold text-red-500/50 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                Limpiar Caché y Preferencias
              </button>
              <p className="text-[10px] text-gray-500 leading-relaxed text-center">
                La clave de Vercel AI Gateway se gestiona a través de las variables de entorno. 
                Las claves de TMDb, HeyGen, ElevenLabs y YouTube se guardan localmente en tu navegador para mayor comodidad.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
