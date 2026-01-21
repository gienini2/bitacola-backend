import express from "express";
import cors from "cors";
import fetch from "node-fetch";
const betaCodes = {
  "BETA-1009-A": true,
  "BETA-1009-B": true,
  "BETA-1009-C": true,
  "BETA-1009-D": true
};

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

const PROMPT_BITACOLA = `
Ets un redactor d'actuacions policials operatives per a la Guàrdia Municipal de Catalunya.

TASCA:
Transforma el text col·loquial de l'agent en una ENTRADA DE BITÀCOLA policial clara, professional i operativa, en CATALÀ.

CRITERIS:
- Llenguatge formal i impersonal
- Estil sintètic, propi de bitàcola de servei
- Sense conclusions artificials

REQUISITS:
- Comença amb: "A les [HORA] hores,"
- Extensió: 4 a 6 línies (60–100 paraules)
- NO inventis dades
`;
const PROMPT_INFORME = `
Ets un redactor d'informes policials per a la Guàrdia Municipal de Catalunya.

TASCA:
Transforma el text col·loquial de l'agent en un INFORME POLICIAL EXTENSIU, amb possible tipificació penal o administrativa, en CATALÀ.

CRITERIS DE REDACCIÓ:
- Llenguatge formal, tècnic i jurídic
- Redacció clara i ordenada
- Sense floritures ni retòrica innecessària

ESTRUCTURA ORIENTATIVA:
- FETS: Descripció detallada i cronològica
- ACTUACIÓ POLICIAL: Intervenció realitzada
- VALORACIÓ JURÍDICA: Possible qualificació orientativa
- RESULTAT: Estat final de l'actuació

REQUISITS FORMALS:
- Comença amb: "A les [HORA] hores,"
- Extensió: 250–400 paraules
- NO inventis dades ni articles legals concrets
- La tipificació és ORIENTATIVA, no taxativa

RESPON NOMÉS AMB L'INFORME, SENSE EXPLICACIONS.
`;

/* =========================
   ENDPOINT PRINCIPAL
========================= */
app.post("/api/beta/activate", (req, res) => {
  const { code } = req.body;

  if (!betaCodes[code]) {
    return res.status(403).json({ error: "Invalid beta code" });
  }

  const userId = crypto.randomUUID();

  console.log(`🧪 Beta activada: ${code} → ${userId}`);

  res.json({ user_id: userId });
});

app.post("/api/translate", async (req, res) => {
  const { text, mode, user_id } = req.body;


  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text invàlid o buit" });
  }

  try {
    console.log("➡️ Text rebut:", text);
   const selectedPrompt =
  mode === "informe" ? PROMPT_INFORME : PROMPT_BITACOLA;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: selectedPrompt + "\n\nTEXT DE L'AGENT:\n" + text
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
