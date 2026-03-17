// src/server.js
import express from 'express';
import dotenv from 'dotenv';
import { getMcpClient } from './mcpClient.js';
import runAgent from './agent.js';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({
        status:   'ok',
        model:    process.env.OPENAI_MODEL,
        database: process.env.PG_DATABASE,
        host:     process.env.PG_HOST,
    });
});

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

async function start() {
    try {
        await getMcpClient();
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('[FATAL] Failed to connect to MCP server:', error.message);
        process.exit(1);
    }
}

start();
