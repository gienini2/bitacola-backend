import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

/* =========================
   CONFIGURACIÓN BÁSICA
========================= */

const PORT = process.env.PORT || 10000;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

if (!CLAUDE_API_KEY) {
  console.error("❌ ERROR: Falta la variable de entorno CLAUDE_API_KEY");
}

/* =========================
   MIDDLEWARES
========================= */

app.use(express.json());

app.use(
  cors({
    origin: "https://gienini2.github.io",
    methods: ["POST"],
    allowedHeaders: ["Content-Type"]
  })
);

/* =========================
   PROMPT DEL SISTEMA
========================= */

const SYSTEM_PROMPT = `
Ets un expert en redacció d'informes policials per la Guàrdia Municipal de Catalunya.

TASCA: Converteix aquest text col·loquial en un informe tècnic policial professional en CATALÀ.

REGLES OBLIGATÒRIES:
- Llenguatge formal i objectiu (tercera persona o passiva reflexa)
- Vocabulari tècnic policial: "bipedestació", "incoació d'expedient", "fluxos circulatoris", "presència dissuasiva", "actitud desdenyosa/de menyspreu", "perímetre de seguretat"
- Verbs formals: "es va procedir a", "es va observar", "es va identificar", "es va personar"
- Començar SEMPRE amb: "A les [HORA] hores,"
- Estructura clara: FETS → ACTUACIÓ → RESULTAT → FONAMENT JURÍDIC (si aplica)
- Extensió: mínim 150 paraules, màxim 300 paraules
- NO inventis dades que no estiguin al text original
- Extensiu i molt detallat, com un informe policial real

RESPON NOMÉS AMB LA VERSIÓ TÈCNICA EN CATALÀ, SENSE EXPLICACIONS ADDICIONALS.
`;

/* =========================
   ENDPOINT PRINCIPAL
========================= */

app.post("/api/translate", async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text invàlid o buit" });
  }

  try {
    console.log("➡️ Text rebut:", text);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: SYSTEM_PROMPT + "\n\nTEXT A TRADUIR:\n" + text
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error Claude:", errorText);
      return res.status(500).json({ error: "Error en Claude API" });
    }

    const data = await response.json();
    const output = data.content?.[0]?.text;

    console.log("✅ Traducció correcta");

    res.json({ translation: output });

  } catch (err) {
    console.error("🔥 ERROR GENERAL:", err);
    res.status(500).json({ error: "Error intern del servidor" });
  }
});

/* =========================
   ARRANQUE
========================= */

app.listen(PORT, () => {
  console.log(`🚀 Backend actiu al port ${PORT}`);
});
