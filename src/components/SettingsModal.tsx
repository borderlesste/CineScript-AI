import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
  servicesStatus: {
    gemini: boolean;
    veo: boolean;
    tmdb: boolean;
    heygen: boolean;
  };
  openKeyDialog: () => void;
  saveTmdbKey: (key: string) => void;
  saveHeygenKey: (key: string) => void;
  selectedAvatar: string;
  setSelectedAvatar: (id: string) => void;
  selectedVoice: string;
  setSelectedVoice: (id: string) => void;
  heygenAvatars: { id: string; name: string }[];
  heygenVoices: { id: string; name: string }[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  show,
  onClose,
  servicesStatus,
  openKeyDialog,
  saveTmdbKey,
  saveHeygenKey,
  selectedAvatar,
  setSelectedAvatar,
  selectedVoice,
  setSelectedVoice,
  heygenAvatars,
  heygenVoices
}) => {
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
              {/* Gemini Status - Now via Vercel AI Gateway */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] bg-green-500 shadow-green-500/50" />
                  <div>
                    <h4 className="font-bold text-sm">Gemini AI (Vercel AI Gateway)</h4>
                    <p className="text-xs text-gray-500">Motor principal de generación - Sin límites de cuota</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">
                  ACTIVO
                </span>
              </div>

              {/* Veo Status */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", servicesStatus.veo ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50")} />
                  <div>
                    <h4 className="font-bold text-sm">Veo 3.1 (Paid/Video)</h4>
                    <p className="text-xs text-gray-500">Generación de video cinematográfico</p>
                  </div>
                </div>
                <button 
                  onClick={openKeyDialog}
                  className="px-3 py-1.5 bg-cinema-gold text-black text-[10px] font-black rounded-lg hover:bg-yellow-400 transition-all"
                >
                  {servicesStatus.veo ? "CAMBIAR CLAVE" : "SELECCIONAR CLAVE"}
                </button>
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
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      defaultValue={localStorage.getItem('heygen_key') || ''}
                      placeholder="Ingresa tu API Key de HeyGen"
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cinema-gold"
                      onBlur={(e) => saveHeygenKey(e.target.value)}
                    />
                  </div>
                  
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
                Gemini AI funciona automáticamente a través del Vercel AI Gateway sin necesidad de configuración. 
                La clave de TMDb y HeyGen se guardan localmente en tu navegador.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
