/**
 * BITÀCOLA BACKEND — Pipeline 1
 * ==============================
 *
 * RESPONSABILITAT ÚNICA:
 *   Autenticar l'agent i fer de proxy cap a Sherlock.
 *
 * FLUX:
 *   Agent → POST /api/translate → Sherlock /api/v1/process → frontend
 *
 * PER QUÈ NO REDACTA AQUÍ?
 *   Sherlock fa primer la cerca a BD, injecta marcadors al text col·loquial
 *   i DESPRÉS Claude redacta. Tot el procés és intern a Sherlock.
 *   Aquest servidor gestiona autenticació, CORS i límits d'ús beta.
 */

import express from "express";
import cors    from "cors";
import fetch   from "node-fetch";

const app  = express();
const PORT = process.env.PORT || 10000;

const SHERLOCK_URL = process.env.SHERLOCK_URL || "https://sherlock-backend-flwb.onrender.com";

app.use(express.json());
app.use(cors({
  origin: "https://gienini2.github.io",
  methods: ["POST", "GET"],
  allowedHeaders: ["Content-Type"],
}));

// ============================================================================
// CONTROL D'ACCÉS BETA
// ============================================================================

const BETA_LIMITS  = { parte: 100, informe: 10 };
const userUsage    = {};   // En producció → Redis/BD

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
// ENDPOINT PRINCIPAL — proxy cap a Sherlock
// ============================================================================

/**
 * POST /api/translate
 *
 * Body:    { text, mode, user_id }
 * Response: el mateix que retorna Sherlock /api/v1/process
 *   {
 *     texto_coloquial: string,
 *     texto_drag:      string,   ← text net per al editor
 *     anotaciones:     [...],    ← spans per pintar
 *     entidades:       {...},    ← dades per a pestanya BD
 *     ms:              number
 *   }
 */
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

  try {
    const response = await fetch(`${SHERLOCK_URL}/api/v1/process`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        texto:    text.trim(),
        mode:     mode,
        agent_id: null,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("❌ Sherlock error:", err);
      return res.status(502).json({ error: "Error en el servei d'anàlisi" });
    }

    const data = await response.json();
    console.log(`✅ Processat [mode=${mode}, user=${user_id}, ms=${data.ms}]`);
    res.json(data);

  } catch (err) {
    console.error("🔥 Error general:", err);
    res.status(500).json({ error: "Error intern del servidor" });
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
// ARRANC
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 Bitàcola Backend al port ${PORT}`);
  console.log(`   → Proxy a Sherlock: ${SHERLOCK_URL}`);
});
