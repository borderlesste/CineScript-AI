import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { generateText } from "ai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_PROMPT = `Eres un experto narrador cinematográfico. Genera un paquete JSON estructurado.
          
LÍMITES ESTRICTOS:
- synopsis: máx 200 caracteres.
- narrativeSummary: máx 1000 caracteres.
- voiceOverScript: máx 6 segmentos. Cada visual máx 300 caracteres, cada audio máx 500 caracteres.
- storyboard: máx 4 escenas.

REGLAS DE ORO:
1. PROHIBIDO REPETIR TEXTO o entrar en bucles.
2. Sé extremadamente conciso.
3. Devuelve ÚNICAMENTE el JSON válido.

El JSON debe tener esta estructura:
{
  "metadata": {
    "title": "string",
    "year": "string",
    "genre": ["string"],
    "duration": "string",
    "rating": "string",
    "director": "string",
    "cast": ["string"],
    "synopsis": "string"
  },
  "narrativeSummary": "string",
  "voiceOverScript": [
    {
      "timecode": "string",
      "visual": "string",
      "audio": "string",
      "transition": "string"
    }
  ],
  "storyboard": [
    {
      "segment": "string",
      "description": "string",
      "visualReference": "string",
      "suggestedClips": ["string"]
    }
  ],
  "socialVersions": [
    {
      "platform": "string",
      "hook": "string",
      "keyPoints": ["string"],
      "callToAction": "string"
    }
  ],
  "youtubeReferences": ["string"]
}`;

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
        system: SYSTEM_PROMPT,
        prompt: `Genera el paquete CineScript AI para: "${query}"`,
        maxOutputTokens: 4096,
      });

      if (!result.text) {
        return res.status(500).json({ error: "La IA no devolvió texto. Intenta de nuevo." });
      }
      
      let cleanText = result.text.trim();
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

  // AI Poster Generation - placeholder since image gen requires special setup
  app.post("/api/generate-poster", async (req, res) => {
    try {
      const { title } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      // Image generation via AI Gateway requires additional setup
      // Return a message indicating this feature needs configuration
      res.status(501).json({ 
        error: "Generación de imágenes no disponible. Usa un servicio externo como DALL-E o Midjourney." 
      });
    } catch (error: any) {
      console.error("Error generating poster:", error);
      res.status(500).json({ error: error.message || "Failed to generate poster" });
    }
  });

  // AI Audio Generation - placeholder since TTS requires special setup
  app.post("/api/generate-audio", async (req, res) => {
    try {
      const { script } = req.body;
      
      if (!script) {
        return res.status(400).json({ error: "Script is required" });
      }

      // TTS via AI Gateway requires additional setup
      res.status(501).json({ 
        error: "Generación de audio no disponible. Usa HeyGen para generar videos con narración." 
      });
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
