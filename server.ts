import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { generateText, Output } from "ai";
import { z } from "zod";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Schema for CineScript package
const cineScriptSchema = z.object({
  metadata: z.object({
    title: z.string(),
    year: z.string(),
    genre: z.array(z.string()),
    duration: z.string(),
    rating: z.string(),
    director: z.string(),
    cast: z.array(z.string()),
    synopsis: z.string()
  }),
  narrativeSummary: z.string(),
  voiceOverScript: z.array(z.object({
    timecode: z.string(),
    visual: z.string(),
    audio: z.string(),
    transition: z.string()
  })),
  storyboard: z.array(z.object({
    segment: z.string(),
    description: z.string(),
    visualReference: z.string(),
    suggestedClips: z.array(z.string())
  })),
  socialVersions: z.array(z.object({
    platform: z.string(),
    hook: z.string(),
    keyPoints: z.array(z.string()),
    callToAction: z.string()
  })),
  youtubeReferences: z.array(z.string())
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Content Generation API using Vercel AI Gateway
  app.post("/api/generate", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const result = await generateText({
        model: "google/gemini-2.5-flash",
        system: `Eres un experto narrador cinematográfico. Genera un paquete JSON estructurado.
          
LÍMITES ESTRICTOS:
- synopsis: máx 200 caracteres.
- narrativeSummary: máx 1000 caracteres.
- voiceOverScript: máx 6 segmentos. Cada visual máx 300 caracteres, cada audio máx 500 caracteres.
- storyboard: máx 4 escenas.

REGLAS DE ORO:
1. PROHIBIDO REPETIR TEXTO o entrar en bucles.
2. Sé extremadamente conciso.
3. Devuelve ÚNICAMENTE el JSON válido.`,
        prompt: `Genera el paquete CineScript AI para: "${query}"`,
        maxOutputTokens: 4096,
        output: Output.object({ schema: cineScriptSchema }),
      });

      res.json({ data: result.object });
    } catch (error: any) {
      console.error("Error generating content:", error);
      res.status(500).json({ error: error.message || "Failed to generate content" });
    }
  });

  // AI Poster Generation API using Vercel AI Gateway
  app.post("/api/generate-poster", async (req, res) => {
    try {
      const { title, synopsis, narrativeSummary } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const prompt = `Crea un póster cinematográfico artístico y profesional para la película "${title}". 
      Estilo: Cinematográfico, épico, alta resolución. 
      Contexto: ${synopsis || ''}. 
      Elementos visuales: ${narrativeSummary?.substring(0, 500) || ''}.`;

      // Use Gemini's image generation model via AI Gateway
      const result = await generateText({
        model: "google/gemini-2.5-flash-preview-image-generation",
        providerOptions: {
          google: {
            responseModalities: ["TEXT", "IMAGE"],
          }
        },
        prompt,
      });

      // Extract image from response
      const imagePart = result.response?.messages?.[0]?.content?.find(
        (part: any) => part.type === "image"
      );

      if (imagePart && imagePart.image) {
        const base64Data = Buffer.from(imagePart.image).toString("base64");
        res.json({ imageUrl: `data:image/png;base64,${base64Data}` });
      } else {
        // Fallback: return a placeholder or error
        res.status(500).json({ error: "Image generation not available. Please try again." });
      }
    } catch (error: any) {
      console.error("Error generating poster:", error);
      res.status(500).json({ error: error.message || "Failed to generate poster" });
    }
  });

  // AI Audio Generation API (TTS) using Vercel AI Gateway
  app.post("/api/generate-audio", async (req, res) => {
    try {
      const { script } = req.body;
      
      if (!script) {
        return res.status(400).json({ error: "Script is required" });
      }

      // Use Gemini's TTS model via AI Gateway
      const result = await generateText({
        model: "google/gemini-2.5-flash-preview-tts",
        providerOptions: {
          google: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Kore" },
              },
            },
          }
        },
        prompt: `Narración profesional de cine: ${script}`,
      });

      // Extract audio from response
      const audioPart = result.response?.messages?.[0]?.content?.find(
        (part: any) => part.type === "file" && part.mimeType?.startsWith("audio/")
      );

      if (audioPart && audioPart.data) {
        res.json({ audioBase64: audioPart.data, mimeType: audioPart.mimeType || "audio/wav" });
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
