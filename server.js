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
Ets un redactor d'actuacions policials operatives per a la Guàrdia Municipal de Catalunya.

TASCA:
Transforma el text col·loquial de l'agent en una ENTRADA DE BITÀCOLA policial clara, professional i operativa, en CATALÀ.

CRITERIS DE REDACCIÓ:
- Llenguatge formal i impersonal (tercera persona o passiva reflexa)
- Estil propi de bitàcola de servei, no d'informe sancionador
- Redacció natural, directa i concisa
- Evita conclusions artificials o fórmules de tancament innecessàries

VOCABULARI ADMINISTRATIU (usar només si escau):
"incoació", "identificació preventiva", "diligències de comprovació",
"presència policial dissuasiva", "absència d'indicis de criminalitat",
"restabliment de l'ordre públic"

ESTRUCTURA FLEXIBLE:
- Context breu de l'actuació
- Actuació realitzada
- Situació observada o resultat

REQUISITS FORMALS:
- Comença SEMPRE amb: "A les [HORA] hores,"
- Extensió orientativa: 4 a 6 línies (60–100 paraules)
- NO inventis dades que no constin al text original
- Si no hi ha incidència, deixa-ho clar de manera sintètica

RESPON NOMÉS AMB EL TEXT DE LA BITÀCOLA, SENSE LLISTES NI EXPLICACIONS.
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
