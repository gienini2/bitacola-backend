import express from "express";
import cors from "cors";
import fetch from "node-fetch";
const betaCodes = {
  "BETA-1009-A": true,
  "BETA-1009-B": true,
  "BETA-1009-C": true,
  "BETA-1009-D": true
  "BETA-1009-D": true,
  "BETA-1009-E": true,
  "BETA-1009-F": true,
  "BETA-1009-G": true,
  "BETA-1009-H": true
};
const BETA_LIMITS = {
  bitacola: 100,   // partes diarios por mes
  informe: 10      // informes tipificados por mes
};
const userUsage = {};


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
function checkAndIncrementUsage(userId, mode) {
  if (!userUsage[userId]) {
    userUsage[userId] = {
      bitacola: 0,
      informe: 0
    };
  }

  if (userUsage[userId][mode] >= BETA_LIMITS[mode]) {
    return false;
  }

  userUsage[userId][mode]++;
  return true;
}

app.use(express.json());

app.use(
  cors({
    origin: "https://gienini2.github.io",
    methods: ["POST"],
    allowedHeaders: ["Content-Type"]
  })
);
// ===== LOG DE USO (telemetría simple) =====
app.post("/api/log", (req, res) => {
  try {
    const { user_id, mode, action, ts } = req.body;

    // Log plano (Render lo guarda y lo puedes ver)
    console.log(
      `[USAGE] user=${user_id} mode=${mode} action=${action} ts=${ts}`
    );

    // Respuesta mínima
    res.status(200).json({ ok: true });

  } catch (e) {
    // Nunca romper el flujo del usuario
    res.status(200).json({ ok: false });
  }
});

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
- TERMINOLOGIA: No utilitzis mai la paraula "diligències" per a fets administratius (ITV, assegurances, civisme). Utilitza "acta de denúncia".
`;
const PROMPT_INFORME = `
Ets un redactor d'informes policials per a la Guàrdia Municipal de Catalunya.

TASCA:
Transforma el text col·loquial de l'agent en un INFORME POLICIAL EXTENSIU, amb possible tipificació penal o administrativa, en CATALÀ.

CRITERIS DE REDACCIÓ:
- Llenguatge formal, tècnic i jurídic
- Redacció clara i ordenada
- Sense floritures ni retòrica innecessària
- ÚS DE "DILIGÈNCIES": Reserva aquest terme EXCLUSIVAMENT per a fets PENALS (delictes, detencions).
- ÚS DE "ACTES": Per a sancions administratives (ITV, SOA, trànsit, civisme), utilitza sempre "aixecament d'acta de denúncia" o "procediment administratiu". No confonguis mai els dos àmbits.

ESTRUCTURA ORIENTATIVA:
- FETS: Descripció detallada i cronològica
- ACTUACIÓ POLICIAL: Intervenció realitzada
- VALORACIÓ JURÍDICA: Possible qualificació orientativa
- RESULTAT: Estat final de l'actuació

REQUISITS FORMALS:
- Inici del text: Si detectes dades de patrulla (ex: C-5), vehicle (ex: Z-09) o agents (ex: TIP 1234), comença l'informe amb la fórmula: "La patrulla [PATRULLA], degudament uniformada i amb vehicle policial [VEHICLE], composta pels agents [AGENTS], a les [HORA] hores..." > - Si no detectes aquestes dades, comença simplement amb: "A les [HORA] hores,".
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


if (!user_id) {
  return res.status(401).json({
    error: "Usuari no autoritzat"
  });
}

if (!checkAndIncrementUsage(user_id, mode)) {
  return res.status(403).json({
    error: "Límit d’ús beta assolit per aquest mode"
  });
}

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
            content: selectedPrompt + "\n\nTEXT DE L'AGENT:\n" + text
          }
        ]
      })
    });

    if (!response.ok) {
       const err = await response.json();
  showStatus(`⛔ ${err.error}`, "error");
  return;
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