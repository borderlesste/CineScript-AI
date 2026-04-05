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
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { CineScriptPackage } from './types';

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
          const lines = segment.audio.match(/.{1,60}(\s|$)/g) || [];
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

  const generateVideo = async () => {
    if (!result) return;
    if (!hasApiKey) {
      await openKeyDialog();
      return;
    }

    setGeneratingVideo(true);
    setVideoProgress('Iniciando generación de video...');
    setError(null);

    try {
      const videoAi = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '' });
      
      let operation = await videoAi.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: `Un tráiler cinematográfico épico para la película "${result.metadata.title}". 
        Escena: ${result.narrativeSummary.substring(0, 300)}. 
        Estilo: Cinematográfico, 4k, iluminación dramática.`,
        image: result.generatedImageUrl ? {
          imageBytes: result.generatedImageUrl.split(',')[1],
          mimeType: 'image/png'
        } : undefined,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        setVideoProgress('Procesando video... Esto puede tardar unos minutos.');
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await videoAi.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': process.env.API_KEY || process.env.GEMINI_API_KEY || '',
          },
        });
        const blob = await response.blob();
        const videoUrl = URL.createObjectURL(blob);
        setResult(prev => prev ? { ...prev, generatedVideoUrl: videoUrl } : null);
      }
    } catch (err: any) {
      console.error("Error generating video:", err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("Error de autenticación. Por favor, selecciona tu API Key de nuevo.");
      } else {
        setError("No se pudo generar el video. Asegúrate de tener una API Key configurada.");
      }
    } finally {
      setGeneratingVideo(false);
      setVideoProgress('');
    }
  };

  const generatePoster = async () => {
    if (!result) return;
    setGeneratingImage(true);
    try {
      const prompt = `Crea un póster cinematográfico artístico y profesional para la película "${result.metadata.title}". 
      Estilo: Cinematográfico, épico, alta resolución. 
      Contexto: ${result.metadata.synopsis}. 
      Elementos visuales: ${result.narrativeSummary.substring(0, 500)}.
      Sin texto, solo la composición visual.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4"
          }
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const imageUrl = `data:image/png;base64,${base64Data}`;
          setResult(prev => prev ? { ...prev, generatedImageUrl: imageUrl } : null);
          break;
        }
      }
    } catch (err) {
      console.error("Error generating image:", err);
      setError("No se pudo generar el póster AI. Intenta de nuevo.");
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
          maxOutputTokens: 2048,
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
          let repaired = str;
          
          // If it ends with a partial string, close it
          // Check if the last quote is an opening quote (after a colon or comma)
          const lastQuote = repaired.lastIndexOf('"');
          const lastColon = repaired.lastIndexOf(':');
          const lastComma = repaired.lastIndexOf(',');
          
          if (lastQuote > lastColon && lastQuote > lastComma) {
            // We are likely inside a string
            repaired += '"';
          }

          // Balance braces/brackets
          let openBraces = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
          let openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
          
          while (openBrackets > 0) { repaired += ']'; openBrackets--; }
          while (openBraces > 0) { repaired += '}'; openBraces--; }
          
          try {
            JSON.parse(repaired);
            return repaired;
          } catch (e2) {
             // If still fails, try to find the last valid object/array end
             const lastBrace = repaired.lastIndexOf('}');
             const lastBracket = repaired.lastIndexOf(']');
             const lastValidEnd = Math.max(lastBrace, lastBracket);
             if (lastValidEnd > 0) {
               return repaired.substring(0, lastValidEnd + 1);
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
    <div className="min-h-screen font-sans selection:bg-cinema-gold selection:text-black">
      {/* Header */}
      <header className="border-b border-white/10 bg-cinema-black/80 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-cinema-gold rounded-lg flex items-center justify-center shadow-lg shadow-cinema-gold/20">
              <Clapperboard className="text-black w-6 h-6" />
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight">
              CineScript <span className="text-cinema-gold">AI</span>
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Concepto</a>
            <a href="#" className="hover:text-white transition-colors">Arquitectura</a>
            <a href="#" className="hover:text-white transition-colors">Legal</a>
            <button 
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all text-xs font-bold text-cinema-gold"
            >
              <Info className="w-3 h-3" /> CONFIGURACIÓN
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-cinema-black border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-display font-bold">Gestión de Servicios</h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white">
                  <AlertCircle className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Gemini Status */}
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", servicesStatus.gemini ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50")} />
                    <div>
                      <h4 className="font-bold text-sm">Gemini AI (Free/System)</h4>
                      <p className="text-xs text-gray-500">Motor principal de generación</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {servicesStatus.gemini ? "CONECTADO" : "SIN CLAVE"}
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

                {/* TMDb Status (Mock/Manual) */}
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
                          {HEYGEN_AVATARS.map(avatar => (
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
                          {HEYGEN_VOICES.map(voice => (
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
                  Las claves de Gemini y Veo se gestionan a través de la plataforma de AI Studio para mayor seguridad. 
                  La clave de TMDb se guarda localmente en tu navegador.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                              <span className="text-cinema-gold text-xs font-bold uppercase tracking-widest mb-1">{result.metadata.year}</span>
                              <h3 className="text-xl font-bold leading-tight">{result.metadata.title}</h3>
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
                            <Badge icon={<Info className="w-3 h-3" />} label={result.metadata?.rating} />
                            <Badge label={result.metadata?.duration} />
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
                  )}

                  {activeTab === 'script' && (
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
                  )}

                  {activeTab === 'storyboard' && (
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
                  )}

                  {activeTab === 'social' && (
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
                  )}

                  {activeTab === 'video' && (
                    <div className="space-y-8 text-center py-12">
                      <div className="max-w-3xl mx-auto space-y-8">
                        <div className="w-20 h-20 bg-cinema-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Play className="w-10 h-10 text-cinema-gold" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-3xl font-display font-bold">Estudio de Producción AI</h3>
                          <p className="text-gray-400">
                            Genera la narración profesional y exporta un video sincronizado con tu guion y storyboard.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* TTS Section */}
                          <div className="glass-panel p-8 rounded-3xl space-y-6 text-left">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-cinema-gold/20 rounded-lg">
                                <FileText className="w-5 h-5 text-cinema-gold" />
                              </div>
                              <h4 className="font-bold text-lg">Narración de Voz (TTS)</h4>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                              Convierte tu guion en una narración cinematográfica profesional usando Gemini TTS.
                            </p>
                            
                            {result.generatedAudioUrl ? (
                              <div className="space-y-4">
                                <audio src={result.generatedAudioUrl} controls className="w-full h-10" />
                                <button 
                                  onClick={generateAudio}
                                  disabled={generatingAudio}
                                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-cinema-gold transition-all flex items-center justify-center gap-2"
                                >
                                  {generatingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                  REGENERAR AUDIO
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={generateAudio}
                                disabled={generatingAudio}
                                className="w-full py-4 bg-cinema-gold text-black font-bold rounded-xl hover:bg-yellow-400 transition-all flex items-center justify-center gap-2"
                              >
                                {generatingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                                GENERAR NARRACIÓN AI
                              </button>
                            )}
                          </div>

                          {/* Video Export Section */}
                          <div className="glass-panel p-8 rounded-3xl space-y-6 text-left">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-cinema-gold/20 rounded-lg">
                                <Download className="w-5 h-5 text-cinema-gold" />
                              </div>
                              <h4 className="font-bold text-lg">Exportar Video Sincronizado</h4>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                              Crea un video (WEBM/MP4) que sincroniza la voz con los segmentos del storyboard y el póster.
                            </p>
                            
                            <button 
                              onClick={exportToVideo}
                              disabled={!result.generatedAudioUrl || exportingVideo}
                              className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {exportingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                              {exportingVideo ? 'EXPORTANDO...' : 'EXPORTAR VIDEO FINAL'}
                            </button>
                            {!result.generatedAudioUrl && (
                              <p className="text-[10px] text-red-400 text-center italic">
                                * Debes generar la narración primero
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Veo Section (Original) */}
                        <div className="pt-12 border-t border-white/10">
                          <h4 className="text-xl font-display font-bold mb-4">Generador de Tráiler Visual (Veo 3.1)</h4>
                          <div className="max-w-2xl mx-auto space-y-6">
                            {!hasApiKey && (
                              <div className="p-6 bg-cinema-gold/5 border border-cinema-gold/20 rounded-2xl space-y-4">
                                <p className="text-sm text-cinema-gold font-medium">
                                  Para usar la generación de video avanzada, necesitas seleccionar una API Key de pago.
                                </p>
                                <button 
                                  onClick={openKeyDialog}
                                  className="px-8 py-3 bg-cinema-gold text-black font-bold rounded-xl hover:bg-yellow-400 transition-all"
                                >
                                  Configurar API Key
                                </button>
                              </div>
                            )}

                            {result.generatedVideoUrl ? (
                              <div className="space-y-6">
                                <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                                  <video src={result.generatedVideoUrl} controls className="w-full h-full object-contain" />
                                </div>
                                <button 
                                  onClick={generateVideo}
                                  disabled={generatingVideo}
                                  className="px-8 py-3 bg-cinema-gold text-black rounded-xl font-bold text-sm hover:bg-yellow-400 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                                >
                                  {generatingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                  REGENERAR CLIP VEO
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={generateVideo}
                                disabled={!hasApiKey || !result.generatedImageUrl || generatingVideo}
                                className="px-12 py-4 bg-cinema-gold text-black font-bold rounded-2xl hover:bg-yellow-400 transition-all shadow-lg shadow-cinema-gold/20 disabled:opacity-50 flex items-center gap-3 mx-auto"
                              >
                                {generatingVideo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                                GENERAR CLIP VEO 3.1
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
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

      {/* Footer / Documentation Preview */}
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
              El contenido generado es una sugerencia creativa. Se recomienda el uso de material bajo "Fair Use" y siempre validar los datos oficiales antes de publicar.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
        active 
          ? "bg-cinema-gold text-black shadow-lg shadow-cinema-gold/20" 
          : "text-gray-400 hover:bg-white/5 hover:text-white"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Badge({ label, icon, variant = 'default' }: { label: string, icon?: React.ReactNode, variant?: 'default' | 'outline' }) {
  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5",
      variant === 'default' ? "bg-cinema-gold/10 text-cinema-gold border border-cinema-gold/20" : "border border-white/20 text-gray-400"
    )}>
      {icon}
      {label}
    </span>
  );
}
