// users.js - Llista d'usuaris autoritzats
// Format: { username, displayName }

export const AUTHORIZED_USERS = new Map([
  ['1009',     { displayName: 'Agent 1009'   }],
  ['admin',    { displayName: 'Administrador' }],
  ['agent_a',  { displayName: 'Agent Alpha'  }],
  ['agent_b',  { displayName: 'Agent Beta'   }],
  ['agent_c',  { displayName: 'Agent Gamma'  }],
  ['agent_d',  { displayName: 'Agent Delta'  }],
  ['agent_e',  { displayName: 'Agent Epsilon'}],
  ['agent_f',  { displayName: 'Agent Zeta'   }],
]);

// Sessions actives en memòria: { session_token → { username, displayName, loginAt } }
export const activeSessions = new Map();

// Genera token de sessió aleatori
export function generateToken() {
  return Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
}
