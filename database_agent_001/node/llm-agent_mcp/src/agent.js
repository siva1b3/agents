// src/agent.js
import OpenAI from 'openai';
import dotenv from 'dotenv';
import buildSystemPrompt from './systemPrompt.js';
import { callTool } from './mcpClient.js';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_ITERATIONS = 10;

function parseResponse(content) {
    try {
        return JSON.parse(content);
    } catch {
        // If the LLM returns non-JSON, treat it as a final answer
        // rather than crashing. This is a soft failure — the agent
        // reports the raw response instead of throwing.
        return { type: 'final_answer', answer: `LLM returned non-JSON: ${content}` };
    }
}

// MCP tool results come back as an array of content blocks like:
// { content: [{ type: 'text', text: '...' }], isError: bool }
// This function flattens that into a plain string the LLM can read.
function formatToolResult(result) {
    if (!result?.content) return 'No result returned';
    const text = result.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');
    return result.isError ? `Error: ${text}` : text;
}

async function runAgent(userQuestion) {
    // systemPrompt is async — it fetches the tool list from MCP server
    const systemPrompt = await buildSystemPrompt();

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userQuestion }
    ];

    const toolCalls = []; // recorded for the API response so caller can inspect what happened

    console.log('\n========== AGENT START ==========');
    console.log('User:', userQuestion);

    for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
        console.log(`\n---------- Iteration ${iteration} ----------`);

        const response = await openai.chat.completions.create({
            model:       process.env.OPENAI_MODEL,
            messages:    messages,
            temperature: 0  // zero temperature = deterministic, no creative variation
        });

        const rawContent = response.choices[0].message.content;
        console.log('LLM response:', rawContent);

        const parsed = parseResponse(rawContent);

        // Add the LLM's response to the conversation history so the next
        // iteration has full context of what was decided before.
        messages.push({ role: 'assistant', content: rawContent });

        if (parsed.type === 'final_answer') {
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

            // Send the tool call to the MCP server and wait for the result
            const toolResult = await callTool(tool, args);
            const formatted  = formatToolResult(toolResult);
            console.log('Tool result:', formatted);

            toolCalls.push({ tool, args: args || {}, result: formatted });

            // Inject the tool result back into the conversation as a user message.
            // The LLM will read this in the next iteration and decide what to do next.
            messages.push({
                role:    'user',
                content: `Tool result for ${tool}: ${formatted}`
            });

            continue;
        }

        // If we reach here the LLM responded with something unexpected.
        // We correct it and let it try again rather than failing hard.
        messages.push({
            role:    'user',
            content: 'Your response was not valid JSON. Respond only with a JSON object using type "tool_call" or "final_answer".'
        });
    }

    console.log('========== AGENT END (max iterations reached) ==========\n');
    return {
        success:    false,
        answer:     'Agent could not complete the task within the maximum number of iterations',
        toolCalls:  toolCalls,
        iterations: MAX_ITERATIONS
    };
}

export default runAgent;