# Bitàcola Agent 1009 – Backend Claude Proxy

Backend Node.js que actua com a proxy segur entre una web estàtica (GitHub Pages)
i la API de Claude (Anthropic), evitant problemes de CORS i protegint la API key.

## Requisits
- Node.js 18+
- Compte GitHub
- Compte Render.com
- API key d’Anthropic

## Desplegament a Render

1. Puja aquest repositori a GitHub
2. Entra a https://render.com
3. New → Web Service
4. Connecta el repositori
5. Configura:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: Free
6. A Environment Variables afegeix:
   - Key: CLAUDE_API_KEY
   - Value: la teva API key real
7. Desa i espera el desplegament

## Endpoint disponible

POST `/api/translate`

### Body
```json
{
  "text": "Text col·loquial de l'agent"
}
