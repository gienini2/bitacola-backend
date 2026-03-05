// users.js - Llista d'usuaris autoritzats
// Format: { username, displayName }

export const AUTHORIZED_USERS = new Map([
  ['beta-1009-a', { displayName: 'Inspector Albert Jordan' }],
  ['beta-1009-b', { displayName: 'Agent Beta-1009-B' }],
  ['beta-1009-c', { displayName: 'Caporal Daniel Chacon' }],
  ['beta-1009-d', { displayName: 'Agent Beta-1009-D' }],
  ['beta-1009-e', { displayName: 'Agent Figaro 1012' }],
  ['beta-1009-f', { displayName: 'Agent primo jose luis ;)' }],
  ['beta-1009-g', { displayName: 'Inspector Juan Nogales' }],
  ['beta-1009-h', { displayName: 'Agent Beta-1009-H' }],
]);

// Sessions actives en memòria: { session_token → { username, displayName, loginAt } }
export const activeSessions = new Map();

// Genera token de sessió aleatori
export function generateToken() {
  return Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
}
