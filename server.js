const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// PONER TU CLAUDE API KEY AQUÍ
const CLAUDE_KEY = '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';

app.post('/api/translate', async (req, res) => {
    try {
        const { text } = req.body;

        const prompt = `Ets un expert en redacció d'informes policials per la Guàrdia Municipal de Catalunya.

TASCA: Converteix aquest text col·loquial en un informe tècnic policial professional en CATALÀ.

REGLES:
- Llenguatge formal i objectiu
- Vocabulari tècnic: "bipedestació", "es va procedir a", "es va observar"
- Començar amb "A les [HORA] hores,"
- Estructura: FETS → ACTUACIÓ → RESULTAT
- Extensió: 150-250 paraules

TEXT: ${text}

RESPON NOMÉS AMB LA VERSIÓ TÈCNICA.`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        const data = await response.json();
        
        res.json({ 
            success: true, 
            translation: data.content[0].text 
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error de traducció' 
        });
    }
});

app.get('/', (req, res) => {
    res.json({ status: 'Backend Bitàcola funcionant OK' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor en port ${PORT}`);
});
