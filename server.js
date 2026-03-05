/**
 * BITÀCOLA BACKEND — Pipeline v3
 * ================================
 * Login per nom d'usuari simple + proxy cap a Sherlock.
 *
 * FLUX:
 *   Agent → POST /api/login         → valida usuari → retorna session_token
 *   Agent → POST /api/check-session → verifica token actiu
 *   Agent → POST /api/translate     → (requereix token vàlid) → Sherlock
 */

import express from "express";
import cors    from "cors";
import fetch   from "node-fetch";
import { AUTHORIZED_USERS, activeSessions, generateToken } from './users.js';

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
// LOGIN — valida nom d'usuari i crea sessió
// ============================================================================
app.post("/api/login", (req, res) => {
  const { username } = req.body;

  if (!username || typeof username !== "string") {
    return res.status(400).json({ ok: false, error: "Nom d'usuari requerit" });
  }

  const key  = username.trim().toLowerCase();
  const user = AUTHORIZED_USERS.get(key);

  if (!user) {
    return res.status(403).json({ ok: false, error: "Usuari no autoritzat" });
  }

  // Crear token de sessió
  const token = generateToken();
  activeSessions.set(token, {
    username:    key,
    displayName: user.displayName,
    loginAt:     new Date().toISOString(),
  });

  console.log(`✅ Login: ${key} (${user.displayName})`);

  res.json({
    ok:          true,
    token,
    displayName: user.displayName,
  });
});

// ============================================================================
// CHECK SESSION — verifica si el token és vàlid
// ============================================================================
app.post("/api/check-session", (req, res) => {
  const { token } = req.body;
  if (!token) return res.json({ ok: false });

  const session = activeSessions.get(token);
  if (!session) return res.json({ ok: false });

  res.json({
    ok:          true,
    displayName: session.displayName,
    username:    session.username,
  });
});

// ============================================================================
// LOGOUT
// ============================================================================
app.post("/api/logout", (req, res) => {
  const { token } = req.body;
  if (token) activeSessions.delete(token);
  res.json({ ok: true });
});

// ============================================================================
// TRANSLATE — proxy cap a Sherlock amb retry
// ============================================================================
app.post("/api/translate", async (req, res) => {
  const { text, mode = "parte", token } = req.body;

  // Validar sessió
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: "Sessió no vàlida. Torna a identificar-te." });
  }

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Text invàlid o buit" });
  }

  const session = activeSessions.get(token);
  const MAX_RETRIES = 1;
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
          agent_id: 1009,
        }),
        signal: AbortSignal.timeout(90_000),
      });

      if (response.status === 429) {
        console.warn(`⏳ Sherlock 429 (intent ${attempt}/${MAX_RETRIES})`);
        if (attempt < MAX_RETRIES) { await sleep(RETRY_DELAY); continue; }
        return res.status(503).json({ error: "Servei sobrecarregat. Torna a intentar-ho." });
      }

      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ Sherlock HTTP ${response.status}:`, errText);
        return res.status(502).json({ error: `Error Sherlock (${response.status})` });
      }

      const data = await response.json();
      console.log(`✅ [mode=${mode} user=${session.username} ms=${data.ms} intent=${attempt}]`);
      return res.json(data);

    } catch (err) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        if (attempt < MAX_RETRIES) { await sleep(2000); continue; }
        return res.status(504).json({ error: "El servei tarda massa. Torna a intentar-ho." });
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
  const { token, mode, action, ts } = req.body;
  const session = token ? activeSessions.get(token) : null;
  const user    = session ? session.username : "anon";
  console.log(`[LOG] user=${user} mode=${mode} action=${action} ts=${ts}`);
  res.json({ ok: true });
});

// ============================================================================
// HEALTH
// ============================================================================
app.get("/health", (req, res) => res.json({ status: "ok", sessions: activeSessions.size }));

// ============================================================================
// ARRANC
// ============================================================================
app.listen(PORT, () => {
  console.log(`🚀 Bitàcola Backend al port ${PORT}`);
  console.log(`   → Sherlock: ${SHERLOCK_URL}`);
  console.log(`   → Usuaris autoritzats: ${AUTHORIZED_USERS.size}`);
});
