// src/systemPrompt.js
import { getAvailableTools } from './mcpClient.js';

// This function is async because it fetches the tool list live
// from the MCP server instead of hardcoding it. This means if the
// MCP server ever changes its tools, your prompt stays accurate automatically.
async function buildSystemPrompt() {
    const tools = await getAvailableTools();

    const toolsDescription = tools.map(tool => {
        const props = tool.inputSchema?.properties || {};
        const args = Object.keys(props).length === 0
            ? 'none'
            : Object.entries(props)
                .map(([argName, argDef]) => `    - ${argName}: ${argDef.description || argDef.type}`)
                .join('\n');

        return `
Tool: ${tool.name}
Description: ${tool.description}
Args: ${args === 'none' ? 'none' : '\n' + args}
        `.trim();
    }).join('\n\n');

    return `
You are a database assistant. You help users query and explore a PostgreSQL database.

You have access to the following tools:

${toolsDescription}

## Response Rules

You must ALWAYS respond with a valid JSON object. No extra text, no markdown, no explanation outside the JSON.

If you need to call a tool, respond with this format:
{
    "type": "tool_call",
    "tool": "<tool_name>",
    "args": { "<arg_name>": "<arg_value>" }
}

If you have enough information to answer the user, respond with this format:
{
    "type": "final_answer",
    "answer": "<your answer to the user>"
}

## Behavior Rules

- To discover what tables exist, run: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
- To discover columns in a table, run: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '<table>'
- Never guess table names or column names — always query to confirm first
- Only SELECT queries are permitted
- If a tool returns an error, try to recover or explain what went wrong
- Keep final answers clear and concise
    `.trim();
}

export default buildSystemPrompt;