// beta_codes.js - Sistema de códigos beta BETA-1009-A...H

// Lista blanca de códigos autorizados
const BETA_CODES = new Set([
  'BETA-1009-A',
  'BETA-1009-B', 
  'BETA-1009-C',
  'BETA-1009-D',
  'BETA-1009-E',
  'BETA-1009-F',
  'BETA-1009-G',
  'BETA-1009-H'
]);

// Mapa para almacenar qué código tiene cada usuario
// { "user_id_generado": "BETA-1009-A" }
const userToBetaCode = new Map();

// Mapa para límites de uso por código
// { "BETA-1009-A": { parte: 0, informe: 0, maxParte: 100, maxInforme: 10 } }
const betaUsage = new Map();

// Inicializar límites para cada código
BETA_CODES.forEach(code => {
  betaUsage.set(code, {
    parte: 0,
    informe: 0,
    maxParte: 100,
    maxInforme: 10,
    lastReset: new Date().toISOString()
  });
});

module.exports = {
  BETA_CODES,
  userToBetaCode,
  betaUsage
};