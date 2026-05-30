// src/agent.js
import OpenAI from 'openai';
import dotenv from 'dotenv';
import buildSystemPrompt from './systemPrompt.js';
import { executeTool } from './tools/index.js';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const MAX_ITERATIONS = 10;

function parseResponse(content) {
    try {
        return JSON.parse(content);
    } catch {
        return {
            type: 'final_answer',
            answer: `LLM returned non-JSON response: ${content}`
        };
    }
}

async function runAgent(userQuestion) {
    const messages = [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user',   content: userQuestion }
    ];

    const toolCalls = []; // track all tool calls for frontend

    console.log('\n========== AGENT START ==========');
    console.log('User:', userQuestion);

    for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
        console.log(`\n---------- Iteration ${iteration} ----------`);

        const response = await openai.chat.completions.create({
            model:       process.env.OPENAI_MODEL,
            messages:    messages,
            temperature: 0
        });

        const rawContent = response.choices[0].message.content;
        console.log('LLM raw response:', rawContent);

        const parsed = parseResponse(rawContent);

        messages.push({ role: 'assistant', content: rawContent });

        if (parsed.type === 'final_answer') {
            console.log('\nFinal answer:', parsed.answer);
            console.log('========== AGENT END ==========\n');
            return {
                success:    true,
                answer:     parsed.answer,
                toolCalls:  toolCalls,
                iterations: iteration
            };
        }

        if (parsed.type === 'tool_call') {
            const { tool, args } = parsed;
            console.log(`Tool call: ${tool}`, args);

            const toolResult = await executeTool(tool, args);
            console.log('Tool result:', JSON.stringify(toolResult, null, 2));

            // record for frontend
            toolCalls.push({ tool, args: args || {}, result: toolResult });

            messages.push({
                role:    'user',
                content: `Tool result for ${tool}: ${JSON.stringify(toolResult)}`
            });

            continue;
        }

        messages.push({
            role:    'user',
            content: 'Your response was not valid. Respond only with a JSON object with type "tool_call" or "final_answer".'
        });
    }

    console.log('========== AGENT END (max iterations) ==========\n');
    return {
        success:    false,
        answer:     'Agent could not complete the task within the maximum number of iterations',
        toolCalls:  toolCalls,
        iterations: MAX_ITERATIONS
    };
}

export default runAgent;