/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Film, 
  FileText, 
  Layout, 
  Share2, 
  Download, 
  Loader2, 
  Youtube, 
  Clapperboard,
  ChevronRight,
  Play,
  Info,
  CheckCircle2,
  AlertCircle,
  Copy,
  Video,
  Settings,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from './lib/utils';
import { CineScriptPackage } from './types';

// Components
import { Badge } from './components/ui/Badge';
import { TabButton } from './components/ui/TabButton';
import { SettingsModal } from './components/SettingsModal';
import { MetadataTab } from './components/MetadataTab';
import { ScriptTab } from './components/ScriptTab';
import { StoryboardTab } from './components/StoryboardTab';
import { SocialTab } from './components/SocialTab';
import { VideoTab } from './components/VideoTab';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const HEYGEN_AVATARS = [
  { id: 'josh_lite_20220901', name: 'Josh (Casual)' },
  { id: 'ann_lite_20220901', name: 'Ann (Professional)' },
  { id: 'ava_lite_20220901', name: 'Ava (Friendly)' },
  { id: 'ethan_lite_20220901', name: 'Ethan (Young)' },
  { id: 'tyler_lite_20220901', name: 'Tyler (Business)' }
];

const HEYGEN_VOICES = [
  { id: 'en-US-ChristopherNeural', name: 'Christopher (Male US)' },
  { id: 'en-US-JennyNeural', name: 'Jenny (Female US)' },
  { id: 'en-GB-RyanNeural', name: 'Ryan (Male UK)' },
  { id: 'es-ES-AlvaroNeural', name: 'Alvaro (Male ES)' },
  { id: 'es-ES-ElviraNeural', name: 'Elvira (Female ES)' }
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function App() {
  const [query, setQuery] = useState(() => localStorage.getItem('last_query') || '');
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [exportingVideo, setExportingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState('');
  const [result, setResult] = useState<CineScriptPackage | null>(null);
  const [heygenVideoUrl, setHeygenVideoUrl] = useState<string | null>(null);
  const [heygenStatus, setHeygenStatus] = useState<'idle' | 'generating' | 'polling' | 'completed' | 'error'>('idle');
  const [heygenError, setHeygenError] = useState<string | null>(null);
  const [veoStatus, setVeoStatus] = useState<'idle' | 'generating' | 'polling' | 'completed' | 'error'>('idle');
  const [veoProgress, setVeoProgress] = useState(0);
  const [veoVideoUrl, setVeoVideoUrl] = useState<string | null>(null);
  const [veoError, setVeoError] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState(() => localStorage.getItem('heygen_avatar') || HEYGEN_AVATARS[0].id);
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('heygen_voice') || HEYGEN_VOICES[0].id);
  const [activeTab, setActiveTab] = useState<'metadata' | 'script' | 'storyboard' | 'social' | 'json' | 'video'>(() => (localStorage.getItem('active_tab') as any) || 'metadata');
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Status of services
  const [servicesStatus, setServicesStatus] = useState({
    gemini: !!process.env.GEMINI_API_KEY,
    veo: false,
    tmdb: !!localStorage.getItem('tmdb_key'),
    heygen: !!localStorage.getItem('heygen_key') || !!process.env.HEYGEN_API_KEY
  });

  useEffect(() => {
    localStorage.setItem('last_query', query);
  }, [query]);

  useEffect(() => {
    localStorage.setItem('active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('heygen_avatar', selectedAvatar);
  }, [selectedAvatar]);

  useEffect(() => {
    localStorage.setItem('heygen_voice', selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
        setServicesStatus(prev => ({ ...prev, veo: hasKey }));
      }
    };
    checkKey();
  }, []);

  const openKeyDialog = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
      setServicesStatus(prev => ({ ...prev, veo: hasKey }));
    }
  };

  const saveTmdbKey = (key: string) => {
    localStorage.setItem('tmdb_key', key);
    setServicesStatus(prev => ({ ...prev, tmdb: !!key }));
  };

  const saveHeygenKey = (key: string) => {
    localStorage.setItem('heygen_key', key);
    setServicesStatus(prev => ({ ...prev, heygen: !!key || !!process.env.HEYGEN_API_KEY }));
  };

  const generateAudio = async () => {
    if (!result || !result.voiceOverScript) return;
    setGeneratingAudio(true);
    setError(null);

    try {
      const fullScript = result.voiceOverScript.map(s => s.audio).join(' ');
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Narración profesional de cine: ${fullScript}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);
        setResult(prev => prev ? { ...prev, generatedAudioUrl: audioUrl } : null);
      }
    } catch (err) {
      console.error("Error generating audio:", err);
      setError("No se pudo generar la narración de voz. Intenta de nuevo.");
    } finally {
      setGeneratingAudio(false);
    }
  };

  const exportToVideo = async () => {
    if (!result || !result.generatedAudioUrl) return;
    setExportingVideo(true);
    setVideoProgress('Preparando exportación...');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d')!;
      
      const audio = new Audio(result.generatedAudioUrl);
      const stream = canvas.captureStream(30);
      
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(audio);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioCtx.destination);
      stream.addTrack(dest.stream.getAudioTracks()[0]);

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.metadata.title}_CineScript.webm`;
        a.click();
        setExportingVideo(false);
      };

      let posterImg: HTMLImageElement | null = null;
      if (result.generatedImageUrl) {
        posterImg = new Image();
        posterImg.src = result.generatedImageUrl;
        await new Promise(r => posterImg!.onload = r);
      }

      recorder.start();
      audio.play();

      const startTime = Date.now();
      const duration = 30000;

      const renderFrame = () => {
        if (audio.ended || (Date.now() - startTime) > duration) {
          recorder.stop();
          audio.pause();
          return;
        }

        const elapsed = (Date.now() - startTime) / 1000;
        
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (posterImg) {
          const scale = Math.max(canvas.width / posterImg.width, canvas.height / posterImg.height);
          const x = (canvas.width / 2) - (posterImg.width * scale / 2);
          const y = (canvas.height / 2) - (posterImg.height * scale / 2);
          ctx.globalAlpha = 0.3;
          ctx.drawImage(posterImg, x, y, posterImg.width * scale, posterImg.height * scale);
          ctx.globalAlpha = 1.0;
        }

        const segment = result.voiceOverScript.find(s => {
          const [start, end] = s.timecode.split('-').map(t => {
            const [m, s] = t.split(':').map(Number);
            return m * 60 + s;
          });
          return elapsed >= start && elapsed <= end;
        });

        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Space Grotesk';
        ctx.textAlign = 'center';
        ctx.fillText(result.metadata.title.toUpperCase(), canvas.width / 2, 80);

        if (segment) {
          ctx.fillStyle = '#eab308';
          ctx.font = '30px Inter';
          const lines = (segment.audio.match(/.{1,60}(\s|$)/g) || []) as string[];
          lines.forEach((line, i) => {
            ctx.fillText(line.trim(), canvas.width / 2, 400 + (i * 40));
          });

          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.font = 'italic 20px Inter';
          ctx.fillText(`Visual: ${segment.visual}`, canvas.width / 2, 650);
        }

        requestAnimationFrame(renderFrame);
      };

      renderFrame();
    } catch (err) {
      console.error("Export error:", err);
      setExportingVideo(false);
      setError("Error al exportar el video. Asegúrate de que tu navegador soporte MediaRecorder.");
    }
  };

  const generatePoster = async () => {
    if (!result) return;
    setGeneratingImage(true);
    try {
      const prompt = `Crea un póster cinematográfico artístico y profesional para la película "${result.metadata.title}". 
      Estilo: Cinematográfico, épico, alta resolución. 
      Contexto: ${result.metadata.synopsis}. 
      Elementos visuales: ${result.narrativeSummary.substring(0, 500)}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4",
          }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setResult(prev => prev ? { ...prev, generatedImageUrl: imageUrl } : null);
      }
    } catch (err) {
      console.error("Error generating poster:", err);
      setError("No se pudo generar el póster. Inténtalo de nuevo.");
    } finally {
      setGeneratingImage(false);
    }
  };

  const generateContent = async (overrideQuery?: string) => {
    const targetQuery = overrideQuery || query;
    if (!targetQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log("Generando contenido para:", targetQuery);
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Genera el paquete CineScript AI para: "${targetQuery}"`,
        config: {
          systemInstruction: `Eres un experto narrador cinematográfico. Genera un paquete JSON estructurado.
          
          LÍMITES ESTRICTOS:
          - synopsis: máx 200 caracteres.
          - narrativeSummary: máx 1000 caracteres.
          - voiceOverScript: máx 6 segmentos. Cada visual máx 300 caracteres, cada audio máx 500 caracteres.
          - storyboard: máx 4 escenas.
          
          REGLAS DE ORO:
          1. PROHIBIDO REPETIR TEXTO o entrar en bucles.
          2. Sé extremadamente conciso.
          3. Usa Google Search para datos reales.
          4. Devuelve ÚNICAMENTE el JSON válido.`,
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          maxOutputTokens: 4096,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              metadata: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  year: { type: Type.STRING },
                  genre: { type: Type.ARRAY, items: { type: Type.STRING } },
                  duration: { type: Type.STRING },
                  rating: { type: Type.STRING },
                  director: { type: Type.STRING },
                  cast: { type: Type.ARRAY, items: { type: Type.STRING } },
                  synopsis: { type: Type.STRING }
                }
              },
              narrativeSummary: { type: Type.STRING },
              voiceOverScript: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timecode: { type: Type.STRING },
                    visual: { type: Type.STRING },
                    audio: { type: Type.STRING },
                    transition: { type: Type.STRING }
                  }
                }
              },
              storyboard: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    segment: { type: Type.STRING },
                    description: { type: Type.STRING },
                    visualReference: { type: Type.STRING },
                    suggestedClips: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              },
              socialVersions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    platform: { type: Type.STRING },
                    hook: { type: Type.STRING },
                    keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                    callToAction: { type: Type.STRING }
                  }
                }
              },
              youtubeReferences: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      });

      console.log("Respuesta completa de la IA:", JSON.stringify(response, null, 2));
      
      if (!response.text) {
        const finishReason = response.candidates?.[0]?.finishReason;
        console.warn("La IA no devolvió texto. FinishReason:", finishReason);
        if (finishReason === 'SAFETY') throw new Error("Contenido bloqueado por seguridad.");
        throw new Error("La IA no devolvió texto. Intenta de nuevo.");
      }
      
      let cleanText = response.text.trim();
      if (cleanText.startsWith("```json")) cleanText = cleanText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      else if (cleanText.startsWith("```")) cleanText = cleanText.replace(/^```\n?/, "").replace(/\n?```$/, "");
      cleanText = cleanText.trim();

      // Robust JSON repair for truncated strings
      const repairJson = (str: string) => {
        try {
          JSON.parse(str);
          return str;
        } catch (e) {
          let repaired = str.trim();
          
          // Remove trailing backslash if any
          if (repaired.endsWith('\\')) repaired = repaired.slice(0, -1);

          // Handle truncated strings
          let quoteCount = 0;
          let inString = false;
          for (let i = 0; i < repaired.length; i++) {
            if (repaired[i] === '"' && (i === 0 || repaired[i - 1] !== '\\')) {
              quoteCount++;
              inString = !inString;
            }
          }
          
          if (inString) {
            repaired += '"';
          }

          // Remove trailing comma if any
          repaired = repaired.replace(/,\s*$/, "");

          // Balance braces/brackets ignoring those inside strings
          let openBraces = 0;
          let openBrackets = 0;
          let currentlyInString = false;
          
          for (let i = 0; i < repaired.length; i++) {
            if (repaired[i] === '"' && (i === 0 || repaired[i - 1] !== '\\')) {
              currentlyInString = !currentlyInString;
            }
            if (!currentlyInString) {
              if (repaired[i] === '{') openBraces++;
              else if (repaired[i] === '}') openBraces--;
              else if (repaired[i] === '[') openBrackets++;
              else if (repaired[i] === ']') openBrackets--;
            }
          }
          
          while (openBrackets > 0) { repaired += ']'; openBrackets--; }
          while (openBraces > 0) { repaired += '}'; openBraces--; }
          
          try {
            JSON.parse(repaired);
            return repaired;
          } catch (e2) {
             // Final fallback: find the last complete object or array element
             const lastBrace = repaired.lastIndexOf('}');
             const lastBracket = repaired.lastIndexOf(']');
             const lastValidEnd = Math.max(lastBrace, lastBracket);
             if (lastValidEnd > 0) {
               try {
                 const truncated = repaired.substring(0, lastValidEnd + 1);
                 // We might need to close parent structures if we truncated deeply
                 return repairJson(truncated); 
               } catch (e3) {
                 return repaired;
               }
             }
             return repaired;
          }
        }
      };

      const validateData = (data: any): CineScriptPackage => {
        return {
          metadata: {
            title: data.metadata?.title || 'Sin título',
            year: data.metadata?.year || 'N/A',
            genre: Array.isArray(data.metadata?.genre) ? data.metadata.genre : [],
            duration: data.metadata?.duration || 'N/A',
            rating: data.metadata?.rating || 'N/A',
            director: data.metadata?.director || 'Desconocido',
            cast: Array.isArray(data.metadata?.cast) ? data.metadata.cast : [],
            synopsis: data.metadata?.synopsis || 'Sin sinopsis disponible.',
            posterUrl: data.metadata?.posterUrl,
            backdropUrl: data.metadata?.backdropUrl
          },
          narrativeSummary: data.narrativeSummary || 'No se pudo generar el resumen.',
          voiceOverScript: Array.isArray(data.voiceOverScript) ? data.voiceOverScript : [],
          storyboard: Array.isArray(data.storyboard) ? data.storyboard : [],
          socialVersions: Array.isArray(data.socialVersions) ? data.socialVersions : [],
          youtubeReferences: Array.isArray(data.youtubeReferences) ? data.youtubeReferences : [],
          generatedImageUrl: data.generatedImageUrl,
          generatedVideoUrl: data.generatedVideoUrl,
          generatedAudioUrl: data.generatedAudioUrl
        };
      };

      try {
        const data = JSON.parse(cleanText);
        setResult(validateData(data));
      } catch (parseErr) {
        console.warn("Fallo el parseo inicial, intentando reparar...");
        try {
          const repaired = repairJson(cleanText);
          const data = JSON.parse(repaired);
          setResult(validateData(data));
        } catch (repairErr) {
          console.error("Error persistente de JSON:", parseErr, "Texto:", cleanText);
          throw new Error(`Error de formato: La respuesta fue demasiado larga o se cortó. Intenta ser más específico con el título.`);
        }
      }
    } catch (err: any) {
      console.error("Error en generateContent:", err);
      setError(`Error: ${err.message || "No se pudo generar el contenido. Intenta de nuevo."}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const generateHeyGenVideo = async () => {
    if (!result || !result.voiceOverScript) return;
    
    setHeygenStatus('generating');
    setHeygenError(null);
    
    const fullScript = result.voiceOverScript.map(s => s.audio).join(' ');
    
    try {
      const userKey = localStorage.getItem('heygen_key');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userKey) headers['X-HeyGen-Api-Key'] = userKey;

      const response = await fetch('/api/heygen/video', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          video_inputs: [
            {
              character: {
                type: 'avatar',
                avatar_id: selectedAvatar,
                avatar_style: 'normal'
              },
              voice: {
                type: 'text',
                input_text: fullScript,
                voice_id: selectedVoice
              }
            }
          ],
          dimension: { width: 1280, height: 720 }
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        const errorMsg = typeof data.error === 'object' ? data.error.message : (data.error || data.message || 'Failed to start video generation');
        throw new Error(errorMsg);
      }
      
      const videoId = data.data.video_id;
      pollHeyGenStatus(videoId);
    } catch (err: any) {
      console.error('HeyGen Error:', err);
      const message = err instanceof Error ? err.message : (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setHeygenError(message);
      setHeygenStatus('error');
    }
  };

  const pollHeyGenStatus = async (videoId: string) => {
    setHeygenStatus('polling');
    
    const interval = setInterval(async () => {
      try {
        const userKey = localStorage.getItem('heygen_key');
        const headers: Record<string, string> = {};
        if (userKey) headers['X-HeyGen-Api-Key'] = userKey;

        const response = await fetch(`/api/heygen/status/${videoId}`, {
          headers
        });
        const data = await response.json();
        
        if (data.data.status === 'completed') {
          clearInterval(interval);
          setHeygenVideoUrl(data.data.video_url);
          setHeygenStatus('completed');
        } else if (data.data.status === 'failed') {
          clearInterval(interval);
          setHeygenError('HeyGen video generation failed');
          setHeygenStatus('error');
        }
      } catch (err) {
        console.error('Polling Error:', err);
      }
    }, 5000);
  };

  const generateVeoVideo = async () => {
    if (!result || !hasApiKey) return;
    
    setVeoStatus('generating');
    setVeoProgress(0);
    setVeoError(null);
    
    try {
      const prompt = `Cinematic video clip for the movie "${result.metadata.title}". 
      Synopsis: ${result.metadata.synopsis}. 
      Visual style: ${result.narrativeSummary.substring(0, 500)}. 
      High fidelity, cinematic lighting, professional production.`;

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        }
      });

      pollVeoStatus(operation);
    } catch (err: any) {
      console.error("Veo Error:", err);
      setVeoError(err.message || "Error al iniciar la generación de video.");
      setVeoStatus('error');
    }
  };

  const pollVeoStatus = async (initialOperation: any) => {
    setVeoStatus('polling');
    let operation = initialOperation;
    
    try {
      while (!operation.done) {
        // Update progress mock (Veo API doesn't provide real-time progress percentage in the same way)
        setVeoProgress(prev => Math.min(prev + 5, 95));
        
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        // Fetch the video with the API key
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': process.env.API_KEY || '',
          },
        });
        
        if (!response.ok) throw new Error("Error al descargar el video generado.");
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setVeoVideoUrl(url);
        setVeoStatus('completed');
        setVeoProgress(100);
      } else {
        throw new Error("No se encontró el enlace de descarga del video.");
      }
    } catch (err: any) {
      console.error("Polling Error:", err);
      setVeoError(err.message || "Error durante el procesamiento del video.");
      setVeoStatus('error');
    }
  };

  const downloadScript = () => {
    if (!result || !result.voiceOverScript) return;
    const content = result.voiceOverScript.map(s => `[${s.timecode}]\nVISUAL: ${s.visual}\nAUDIO: ${s.audio}\nTRANSICIÓN: ${s.transition}\n-------------------\n`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Guion_${result.metadata.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-cinema-black text-white font-sans selection:bg-cinema-gold selection:text-black">
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-cinema-black/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cinema-gold rounded-xl flex items-center justify-center shadow-lg shadow-cinema-gold/20">
              <Film className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-display font-black tracking-tighter">CINESCRIPT <span className="text-cinema-gold">AI</span></h1>
              <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">Production Suite</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-white/5 rounded-full transition-colors relative"
            >
              <Settings className="w-5 h-5 text-gray-400" />
              {(!servicesStatus.tmdb || !servicesStatus.heygen) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-cinema-gold rounded-full border-2 border-cinema-black"></span>
              )}
            </button>
            <button 
              onClick={() => {
                setResult(null);
                setQuery('');
              }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> NUEVO PROYECTO
            </button>
          </div>
        </div>
      </nav>

      <SettingsModal 
        show={showSettings}
        onClose={() => setShowSettings(false)}
        servicesStatus={servicesStatus}
        openKeyDialog={openKeyDialog}
        saveTmdbKey={saveTmdbKey}
        saveHeygenKey={saveHeygenKey}
        selectedAvatar={selectedAvatar}
        setSelectedAvatar={setSelectedAvatar}
        selectedVoice={selectedVoice}
        setSelectedVoice={setSelectedVoice}
        heygenAvatars={HEYGEN_AVATARS}
        heygenVoices={HEYGEN_VOICES}
      />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Search Section */}
        <section className="max-w-3xl mx-auto text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold mb-6 leading-tight"
          >
            Tu asistente de producción para <br />
            <span className="text-cinema-gold">resúmenes de cine profesionales</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-lg mb-8"
          >
            Escribe el nombre de una película y obtén metadatos, guiones, storyboards y clips de referencia en segundos.
          </motion.p>

          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-gray-500 group-focus-within:text-cinema-gold transition-colors" />
            </div>
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateContent()}
              placeholder="Ej: Inception, The Godfather, Spider-Man: No Way Home..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-32 focus:outline-none focus:ring-2 focus:ring-cinema-gold/50 focus:border-cinema-gold transition-all text-lg"
            />
            <button 
              onClick={() => generateContent()}
              disabled={loading || !query.trim()}
              className="absolute right-2 top-2 bottom-2 px-6 bg-cinema-gold text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              {loading ? 'Generando...' : 'Generar'}
            </button>
          </div>

          <div className="mt-4 flex justify-center gap-4">
            <button 
              onClick={() => { setQuery("Inception"); generateContent("Inception"); }}
              className="text-xs text-gray-500 hover:text-cinema-gold transition-colors"
            >
              Probar con "Inception"
            </button>
            <button 
              onClick={() => { setQuery("The Matrix"); generateContent("The Matrix"); }}
              className="text-xs text-gray-500 hover:text-cinema-gold transition-colors"
            >
              Probar con "The Matrix"
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}
        </section>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Sidebar / Tabs */}
              <div className="lg:col-span-3 space-y-2">
                <TabButton 
                  active={activeTab === 'metadata'} 
                  onClick={() => setActiveTab('metadata')}
                  icon={<Film className="w-4 h-4" />}
                  label="Metadatos & Resumen"
                />
                <TabButton 
                  active={activeTab === 'script'} 
                  onClick={() => setActiveTab('script')}
                  icon={<FileText className="w-4 h-4" />}
                  label="Guion de Voz en Off"
                />
                <TabButton 
                  active={activeTab === 'storyboard'} 
                  onClick={() => setActiveTab('storyboard')}
                  icon={<Layout className="w-4 h-4" />}
                  label="Storyboard & Edición"
                />
                <TabButton 
                  active={activeTab === 'social'} 
                  onClick={() => setActiveTab('social')}
                  icon={<Share2 className="w-4 h-4" />}
                  label="Versiones Sociales"
                />
                <TabButton 
                  active={activeTab === 'video'} 
                  onClick={() => setActiveTab('video')}
                  icon={<Play className="w-4 h-4" />}
                  label="Video Preview (AI)"
                />
                <TabButton 
                  active={activeTab === 'json'} 
                  onClick={() => setActiveTab('json')}
                  icon={<Download className="w-4 h-4" />}
                  label="Exportar JSON"
                />

                <div className="mt-8 p-6 glass-panel rounded-2xl">
                  <h3 className="text-sm font-bold text-cinema-gold uppercase tracking-wider mb-4">Referencias YouTube</h3>
                  <div className="space-y-3">
                    {result.youtubeReferences?.map((url, i) => (
                      <a 
                        key={i} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors truncate"
                      >
                        <Youtube className="w-4 h-4 text-red-500 shrink-0" />
                        {url}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="lg:col-span-9">
                <div className="glass-panel rounded-3xl p-8 min-h-[600px]">
                  {activeTab === 'metadata' && (
                    <MetadataTab 
                      result={result} 
                      generatePoster={generatePoster} 
                      generatingImage={generatingImage} 
                    />
                  )}

                  {activeTab === 'script' && (
                    <ScriptTab 
                      result={result}
                      generateAudio={generateAudio}
                      generatingAudio={generatingAudio}
                      generateHeyGenVideo={generateHeyGenVideo}
                      heygenStatus={heygenStatus}
                      heygenVideoUrl={heygenVideoUrl}
                      heygenError={heygenError}
                      downloadScript={downloadScript}
                      copyToClipboard={copyToClipboard}
                    />
                  )}

                  {activeTab === 'storyboard' && (
                    <StoryboardTab result={result} />
                  )}

                  {activeTab === 'social' && (
                    <SocialTab result={result} />
                  )}

                  {activeTab === 'video' && (
                    <VideoTab 
                      result={result}
                      veoStatus={veoStatus}
                      veoProgress={veoProgress}
                      veoVideoUrl={veoVideoUrl}
                      veoError={veoError}
                      generateVeoVideo={generateVeoVideo}
                    />
                  )}

                  {activeTab === 'json' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-display font-bold">Exportar Datos</h3>
                        <button 
                          onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                          className="flex items-center gap-2 text-xs font-bold text-cinema-gold hover:text-yellow-400 transition-colors"
                        >
                          <Copy className="w-4 h-4" /> COPIAR JSON
                        </button>
                      </div>
                      <div className="bg-black/50 rounded-2xl p-6 border border-white/10 overflow-auto max-h-[500px]">
                        <pre className="text-xs text-cinema-gold/80 font-mono">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            !loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10">
                  <Film className="w-10 h-10 text-white/20" />
                </div>
                <h3 className="text-2xl font-display font-bold text-gray-500 mb-2">Esperando tu búsqueda</h3>
                <p className="text-gray-600 max-w-md">Ingresa el nombre de una película para comenzar a generar tu paquete de producción.</p>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-white/10 bg-cinema-black py-16 mt-24">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h4 className="text-cinema-gold font-bold uppercase tracking-widest mb-6 text-sm">CineScript AI</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              Una herramienta diseñada para creadores de contenido, críticos de cine y editores que buscan automatizar la pre-producción de sus videos con precisión y estilo cinematográfico.
            </p>
          </div>
          <div>
            <h4 className="text-cinema-gold font-bold uppercase tracking-widest mb-6 text-sm">Arquitectura</h4>
            <ul className="text-gray-400 text-sm space-y-3">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cinema-gold" /> Gemini 3.1 Pro Engine</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cinema-gold" /> Google Search Grounding</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cinema-gold" /> React + Tailwind Stack</li>
            </ul>
          </div>
          <div>
            <h4 className="text-cinema-gold font-bold uppercase tracking-widest mb-6 text-sm">Legal & Ética</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              El contenido generado es una sugerencia creativa. Se recomienda el uso de material bajo "Fair Use" and siempre validar los datos oficiales antes de publicar.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
