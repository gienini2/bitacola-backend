import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

/* =========================
   CONFIGURACIÓN
========================= */

app.use(express.json());

app.use(
  cors({
    origin: "*", // abierto temporalmente
    methods: ["POST"],
    allowedHeaders: ["Content-Type"]
  })
);

/* =========================
   LOG SIMPLE
========================= */

app.post("/api/log", (req, res) => {
  console.log("[LOG]", req.body);
  res.json({ ok: true });
});

/* =========================
   CHECK-BETA (SI EL FRONTEND LO LLAMA)
   → SIEMPRE PERMITE ACCESO
========================= */

app.post("/api/check-beta", (req, res) => {
  res.json({ has_access: true });
});

/* =========================
   ENDPOINT PRINCIPAL
========================= */

app.post("/api/translate", async (req, res) => {
  const { text, mode } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text invàlid o buit" });
  }

  try {
    const prompt =
      mode === "informe"
        ? "Redacta informe formal en catalán..."
        : "Redacta entrada de bitácora en catalán...";

    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          messages: [
            {
              role: "user",
              content: prompt + "\n\n" + text
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Claude error:", err);
      return res.status(500).json({ error: "Claude error" });
    }

    const data = await response.json();
    const output = data.content?.[0]?.text;

    res.json({ translation: output });

  } catch (err) {
    console.error("🔥 ERROR:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

/* =========================
   ARRANQUE
========================= */

app.listen(PORT, () => {
  console.log(`🚀 Backend activo en puerto ${PORT}`);
});
