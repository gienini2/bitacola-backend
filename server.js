/**
 * BITÀCOLA BACKEND — Pipeline v2
 * ================================
 * Proxy autenticat cap a Sherlock amb retry automàtic.
 *
 * FLUX:
 *   Agent → POST /api/translate → Sherlock /api/v1/process → frontend
 *
 * CANVIS v2:
 *   - Retry automàtic (3 intents, 4s entre cada un) per a 429 de Render Free
 *   - Ping keepalive cada 10 min per evitar spin-down de Sherlock
 *   - Timeout de 55s per petició
 *   - Logging del status HTTP real de Sherlock
 */

import express from "express";
import cors    from "cors";
import fetch   from "node-fetch";

const app  = express();
const PORT = process.env.PORT || 10000;

const SHERLOCK_URL = process.env.SHERLOCK_URL
  || "https://sherlock-backend-flwb.onrender.com";

app.use(express.json());
app.use(cors({
  origin: [
    "https://gienini2.github.io",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
  ],
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

// ============================================================================
// KEEPALIVE — ping a Sherlock cada 10 min per evitar spin-down
// ============================================================================

async function pingSherlock() {
  try {
    const r = await fetch(`${SHERLOCK_URL}/health`, { method: "GET" });
    console.log(`💓 Keepalive Sherlock → ${r.status}`);
  } catch (e) {
    console.warn(`💔 Keepalive Sherlock fallat: ${e.message}`);
  }
}

setTimeout(pingSherlock, 30_000);
setInterval(pingSherlock, 10 * 60 * 1000);

// ============================================================================
// CONTROL D'ACCÉS BETA
// ============================================================================

const BETA_LIMITS = { parte: 100, informe: 10 };
const userUsage   = {};

function consumirUso(userId, mode) {
  if (!userUsage[userId]) userUsage[userId] = { parte: 0, informe: 0 };
  const key = mode === "informe" ? "informe" : "parte";
  if (userUsage[userId][key] >= BETA_LIMITS[key]) return false;
  userUsage[userId][key]++;
  return true;
}

app.post("/api/check-beta", (req, res) => {
  const { user_id } = req.body;
  res.json({ has_access: !!user_id });
});

// ============================================================================
// ENDPOINT PRINCIPAL — proxy cap a Sherlock amb retry
// ============================================================================

app.post("/api/translate", async (req, res) => {
  const { text, mode = "parte", user_id } = req.body;

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Text invàlid o buit" });
  }
  if (!user_id) {
    return res.status(401).json({ error: "Usuari no autoritzat" });
  }
  if (!consumirUso(user_id, mode)) {
    return res.status(403).json({ error: "Límit d'ús beta assolit per aquest mode" });
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 4000;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${SHERLOCK_URL}/api/v1/process`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          texto:    text.trim(),
          mode:     mode,
          agent_id: user_id,
        }),
        signal: AbortSignal.timeout(55_000),
      });

      if (response.status === 429) {
        console.warn(`⏳ Sherlock 429 (intent ${attempt}/${MAX_RETRIES}) — esperant ${RETRY_DELAY/1000}s...`);
        if (attempt < MAX_RETRIES) { await sleep(RETRY_DELAY); continue; }
        return res.status(503).json({
          error: "Servei temporalment sobrecarregat. Torna a intentar-ho en uns segons."
        });
      }

      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ Sherlock HTTP ${response.status}:`, errText);
        return res.status(502).json({ error: `Error Sherlock (${response.status})` });
      }

      const data = await response.json();
      console.log(`✅ [mode=${mode} user=${user_id} ms=${data.ms} intent=${attempt}]`);
      return res.json(data);

    } catch (err) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        console.error(`⏱ Timeout Sherlock (intent ${attempt})`);
        if (attempt < MAX_RETRIES) { await sleep(2000); continue; }
        return res.status(504).json({
          error: "El servei tarda massa a respondre. Torna a intentar-ho."
        });
      }
      console.error(`🔥 Error xarxa (intent ${attempt}):`, err.message);
      if (attempt < MAX_RETRIES) { await sleep(2000); continue; }
      return res.status(500).json({ error: "Error intern del servidor." });
    }
  }
});

// ============================================================================
// LOG D'ÚS
// ============================================================================

app.post("/api/log", (req, res) => {
  const { user_id, mode, action, ts } = req.body;
  console.log(`[LOG] user=${user_id} mode=${mode} action=${action} ts=${ts}`);
  res.json({ ok: true });
});

// ============================================================================
// HEALTH
// ============================================================================

app.get("/health", (req, res) => res.json({ status: "ok" }));

// ============================================================================
// ARRANC
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 Bitàcola Backend al port ${PORT}`);
  console.log(`   → Sherlock: ${SHERLOCK_URL}`);
});
