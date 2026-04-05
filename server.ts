import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
