// src/server.js
import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import runAgent from './agent.js';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

app.post('/ask', async (req, res) => {
    const { question } = req.body;

    if (!question || question.trim() === '') {
        return res.status(400).json({
            success: false,
            message: 'Field "question" is required in request body'
        });
    }

    try {
        const result = await runAgent(question.trim());
        return res.status(200).json(result);
    } catch (error) {
        console.error('Agent error:', error);
        return res.status(500).json({
            success: false,
            message: `Internal server error: ${error.message}`
        });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});