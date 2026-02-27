import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 10000;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

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
   BASE DE DATOS EN MEMORIA
   (puedes migrar a Mongo luego)
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

// usuarios activos
const users = {};

// uso mensual
const usage = {};

const LIMITS = {
  bitacola: 100,
  informe: 10
};

/* =========================
   UTILIDADES
========================= */

function checkUserAccess(userId) {
  if (!userId) return false;

  // Validación directa contra betaCodes
  if (betaCodes[userId]) {
    return true;
  }

  return false;
}

function incrementUsage(userId, mode) {
  if (!usage[userId]) {
    usage[userId] = { bitacola: 0, informe: 0 };
  }

  if (usage[userId][mode] >= LIMITS[mode]) {
    return false;
  }

  usage[userId][mode]++;
  return true;
}

/* =========================
   ENDPOINTS BETA
========================= */

// Activación con código
app.post("/api/beta/activate", (req, res) => {
  const { code } = req.body;

  if (!betaCodes[code]) {
    return res.status(403).json({ error: "Código beta inválido" });
  }

  const userId = crypto.randomUUID();

  users[userId] = {
    active: true,
    createdAt: new Date().toISOString(),
    codeUsed: code
  };

  console.log(`🧪 Nuevo usuario activado: ${userId}`);

  res.json({ user_id: userId });
});

// Verificar acceso
app.post("/api/check-beta", (req, res) => {
  const { user_id } = req.body;

  const hasAccess = checkUserAccess(user_id);

  res.json({ has_access: hasAccess });
});
// Revocar usuario manualmente
app.post("/api/beta/revoke", (req, res) => {
  const { user_id } = req.body;

  if (users[user_id]) {
    users[user_id].active = false;
    console.log(`⛔ Usuario revocado: ${user_id}`);
  }

  res.json({ ok: true });
});

/* =========================
   LOG DE USO
========================= */

app.post("/api/log", (req, res) => {
  const { user_id, action, ts } = req.body;

  console.log(
    `[LOG] user=${user_id} action=${action} ts=${ts}`
  );

  res.json({ ok: true });
});

/* =========================
   ENDPOINT PRINCIPAL
========================= */

app.post("/api/translate", async (req, res) => {
  const { text, mode, user_id } = req.body;
   
    if (!checkUserAccess(user_id)) {
     return res.status(401).json({ error: "Usuario no autorizado" });
   }

  if (!incrementUsage(user_id, mode)) {
    return res.status(403).json({ error: "Límite mensual alcanzado" });
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
