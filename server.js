import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 10000;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

if (!CLAUDE_API_KEY) {
  console.error("❌ ERROR: Falta CLAUDE_API_KEY");
  process.exit(1);
}

/* =========================
   CONFIGURACIÓN
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
   CONTROL BETA
========================= */

const betaCodes = {
  "BETA-1009-A": true,
  "BETA-1009-B": true,
  "BETA-1009-C": true,
  "BETA-1009-D": true,
  "BETA-1009-E": true,
  "BETA-1009-F": true,
  "BETA-1009-G": true,
  "BETA-1009-H": true
};

const BETA_LIMITS = {
  bitacola: 100,
  informe: 10
};

const userUsage = {};

function checkAndIncrementUsage(userId, mode) {
  if (!userUsage[userId]) {
    userUsage[userId] = { bitacola: 0, informe: 0 };
  }

  if (userUsage[userId][mode] >= BETA_LIMITS[mode]) {
    return false;
  }

  userUsage[userId][mode]++;
  return true;
}

/* =========================
   ACTIVACIÓN BETA
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

/* =========================
   PROMPTS
========================= */

const PROMPT_BITACOLA = `
Ets un redactor d'actuacions policials operatives per a la Guàrdia Municipal de Catalunya.

TASCA:
Transforma el text col·loquial en una ENTRADA DE BITÀCOLA professional.

CRITERIS:
- Llenguatge formal i impersonal
- 4–6 línies (60–100 paraules)
- Comença amb: "A les [HORA] hores,"
- NO inventis dades
- NO infereixis professions ni context no explícit
- No afegeixis conclusions ni valoracions
- No afegeixis checklists
- Utilitza "acta de denúncia" per fets administratius
- Reserva "diligències" exclusivament per fets penals

RESPON NOMÉS AMB EL TEXT FINAL.
`;

const PROMPT_INFORME = `
Ets un redactor d'informes policials per a la Guàrdia Municipal de Catalunya.

TASCA:
Redacta un INFORME POLICIAL EXTENSIU en català.

CRITERIS:
- Llenguatge formal, tècnic i jurídic
- 250–400 paraules
- Estructura clara: FETS / ACTUACIÓ POLICIAL / VALORACIÓ ORIENTATIVA / RESULTAT
- No inventis dades
- No citis articles concrets
- No infereixis professions ni circumstàncies no explícites
- "Diligències" només per delictes
- "Acta de denúncia" per àmbit administratiu

INICI:
Si detectes patrulla/agents/vehicle → formula completa.
Si no → "A les [HORA] hores,"

RESPON NOMÉS AMB L'INFORME.
`;

/* =========================
   ENDPOINT PRINCIPAL
========================= */

app.post("/api/translate", async (req, res) => {
  const { text, mode, user_id } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text invàlid o buit" });
  }

  if (!user_id) {
    return res.status(401).json({ error: "Usuari no autoritzat" });
  }

  if (!checkAndIncrementUsage(user_id, mode)) {
    return res.status(403).json({
      error: "Límit d’ús beta assolit per aquest mode"
    });
  }

  const selectedPrompt =
    mode === "informe" ? PROMPT_INFORME : PROMPT_BITACOLA;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 900,
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
