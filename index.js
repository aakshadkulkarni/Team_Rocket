import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { analyzeWithAI } from "./lib/ai.js";
import { createDemoAnalysis } from "./lib/demo.js";
import { calculateValidationMetrics } from "./lib/validation.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Please upload an image file."));
    }
    cb(null, true);
  }
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    promptVersion: "market-research-v1.0"
  });
});

app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "A product image is required." });

    let product;
    try {
      product = JSON.parse(req.body.product || "{}");
    } catch {
      return res.status(400).json({ error: "Product details must be valid JSON." });
    }

    const required = ["name", "category", "price", "targetAudience", "description"];
    const missing = required.filter((key) => String(product[key] ?? "").trim() === "");
    if (missing.length) {
      return res.status(400).json({ error: `Missing product fields: ${missing.join(", ")}` });
    }

    const mode = req.body.mode === "ai" ? "ai" : "demo";
    let result;

    if (mode === "ai") {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({
          error: "AI mode is not configured. Add OPENAI_API_KEY to server/.env or use Demo Simulation."
        });
      }
      result = await analyzeWithAI({
        image: req.file,
        product,
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini"
      });
      result.provenance = {
        type: "AI-GENERATED SYNTHETIC ANALYSIS",
        validatedAgainstRealConsumers: false,
        promptVersion: "market-research-v1.0",
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini"
      };
    } else {
      result = createDemoAnalysis(product);
      result.provenance = {
        type: "DEMO SIMULATION — ILLUSTRATIVE RULES, NOT AI",
        validatedAgainstRealConsumers: false,
        promptVersion: "demo-rules-v1.0"
      };
    }

    res.json(result);
  } catch (error) {
    console.error("Analysis error:", error.message);
    res.status(500).json({ error: error.message || "Analysis failed." });
  }
});

app.post("/api/validate", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Upload a CSV file." });
    if (!req.file.originalname.toLowerCase().endsWith(".csv")) {
      return res.status(400).json({ error: "The validation file must be a .csv file." });
    }
    const csv = req.file.buffer.toString("utf8");
    res.json(calculateValidationMetrics(csv));
  } catch (error) {
    res.status(400).json({ error: error.message || "Could not validate the CSV." });
  }
});

app.get("/api/validation-template", (_req, res) => {
  res.download(new URL("./examples/validation-template.csv", import.meta.url).pathname);
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File is too large. Maximum size is 5 MB." });
  }
  res.status(400).json({ error: error.message || "Request could not be processed." });
});

app.listen(port, () => {
  console.log(`Market research API listening on http://localhost:${port}`);
});
