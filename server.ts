import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

// Initialize Google GenAI with API key (server-side only - not exposed to client)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Response schema for CineScript package (using Google GenAI Type format)
const cineScriptSchema = {
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
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Content Generation API using Google GenAI (server-side)
  app.post("/api/generate", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Genera el paquete CineScript AI para: "${query}"`,
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
          responseSchema: cineScriptSchema
        }
      });
      
      if (!response.text) {
        const finishReason = response.candidates?.[0]?.finishReason;
        if (finishReason === 'SAFETY') {
          return res.status(400).json({ error: "Contenido bloqueado por seguridad." });
        }
        return res.status(500).json({ error: "La IA no devolvió texto. Intenta de nuevo." });
      }
      
      let cleanText = response.text.trim();
      if (cleanText.startsWith("```json")) cleanText = cleanText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      else if (cleanText.startsWith("```")) cleanText = cleanText.replace(/^```\n?/, "").replace(/\n?```$/, "");
      cleanText = cleanText.trim();

      const data = JSON.parse(cleanText);
      
      res.json({ data });
    } catch (error: any) {
      console.error("Error generating content:", error);
      res.status(500).json({ error: error.message || "Failed to generate content" });
    }
  });

  // AI Poster Generation API using Google GenAI
  app.post("/api/generate-poster", async (req, res) => {
    try {
      const { title, synopsis, narrativeSummary } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server" });
      }

      const prompt = `Crea un póster cinematográfico artístico y profesional para la película "${title}". 
      Estilo: Cinematográfico, épico, alta resolución. 
      Contexto: ${synopsis || ''}. 
      Elementos visuales: ${narrativeSummary?.substring(0, 500) || ''}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-image-generation',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          responseModalities: ["TEXT", "IMAGE"],
        }
      });

      // Extract image from response
      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if ((part as any).inlineData) {
          imageUrl = `data:image/png;base64,${(part as any).inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        res.json({ imageUrl });
      } else {
        res.status(500).json({ error: "Image generation not available. Please try again." });
      }
    } catch (error: any) {
      console.error("[v0] Error generating poster:", error);
      res.status(500).json({ error: error.message || "Failed to generate poster" });
    }
  });

  // AI Audio Generation API (TTS) using Google GenAI
  app.post("/api/generate-audio", async (req, res) => {
    try {
      const { script } = req.body;
      
      if (!script) {
        return res.status(400).json({ error: "Script is required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Narración profesional de cine: ${script}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      // Extract audio from response
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (base64Audio) {
        res.json({ audioBase64: base64Audio, mimeType: "audio/wav" });
      } else {
        res.status(500).json({ error: "Audio generation not available. Please try again." });
      }
    } catch (error: any) {
      console.error("Error generating audio:", error);
      res.status(500).json({ error: error.message || "Failed to generate audio" });
    }
  });

  // HeyGen API Proxy
  app.post("/api/heygen/video", async (req, res) => {
    const apiKey = req.headers["x-heygen-api-key"] as string || process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "HEYGEN_API_KEY is not configured" });
    }

    try {
      const response = await fetch("https://api.heygen.com/v2/video/generate", {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        res.status(response.status).json(data);
      } else {
        const text = await response.text();
        res.status(response.status).json({ error: text || "Unknown response from HeyGen" });
      }
    } catch (error) {
      console.error("Error calling HeyGen API:", error);
      res.status(500).json({ error: "Failed to call HeyGen API" });
    }
  });

  app.get("/api/heygen/status/:id", async (req, res) => {
    const apiKey = req.headers["x-heygen-api-key"] as string || process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "HEYGEN_API_KEY is not configured" });
    }

    try {
      const response = await fetch(`https://api.heygen.com/v2/video/status?video_id=${req.params.id}`, {
        method: "GET",
        headers: {
          "X-Api-Key": apiKey,
        },
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        res.status(response.status).json(data);
      } else {
        const text = await response.text();
        res.status(response.status).json({ error: text || "Unknown response from HeyGen" });
      }
    } catch (error) {
      console.error("Error calling HeyGen Status API:", error);
      res.status(500).json({ error: "Failed to call HeyGen Status API" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
