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
  ['beta-1009-h', { displayName: 'Coordinador GM Figaro' }],
  ['beta-1009-i', { displayName: 'Coordinador GM Sant Gregori' }],
  ['beta-1009-j', { displayName: 'GM Gualba - S. Vega' }],
  ['beta-1009-k', { displayName: 'PL Sant Cebria Vallalta' }],
  ['beta-1009-l', { displayName: 'GM Guissona 105' }],
  ['beta-1009-m', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-n', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-o', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-p', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-q', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-r', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-s', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-t', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-u', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-v', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-w', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-x', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-y', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-z', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-1', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-2', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-3', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-4', { displayName: 'Agent Beta-1009-H' }],
  ['beta-1009-5', { displayName: 'Agent Beta-1009-H' }],
]);

// Sessions actives en memòria: { session_token → { username, displayName, loginAt } }
export const activeSessions = new Map();

// Genera token de sessió aleatori
export function generateToken() {
  return Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
}
