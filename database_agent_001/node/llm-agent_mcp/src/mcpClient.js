// src/mcpClient.js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

// This is a singleton — we create the MCP client once when the
// server starts and reuse it for every agent request.
// Creating a new child process for every request would be wasteful.
let mcpClient = null;

function buildConnectionString() {
    const { PG_USER, PG_PASSWORD, PG_HOST, PG_PORT, PG_DATABASE } = process.env;
    return `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}`;
}

export async function getMcpClient() {
    if (mcpClient) return mcpClient;

    const connectionString = buildConnectionString();

    // StdioClientTransport spawns the MCP server as a child process.
    // Your Node.js process becomes the parent, and the MCP server becomes
    // the child. They talk to each other through stdin and stdout —
    // the same mechanism as piping commands in a terminal.
    const transport = new StdioClientTransport({
        command: 'node',
        args: [
            'node_modules/@modelcontextprotocol/server-postgres/dist/index.js',
            connectionString
        ]
    });

    mcpClient = new Client({ name: 'llm-agent-client', version: '1.0.0' });
    await mcpClient.connect(transport);

    console.log('[MCP] Connected to PostgreSQL MCP server');
    return mcpClient;
}

// Asks the MCP server what tools it provides.
// This is used later by systemPrompt.js to build the tool list dynamically
// instead of hardcoding it.
export async function getAvailableTools() {
    const client = await getMcpClient();
    const { tools } = await client.listTools();
    console.log(tools);
    return tools;
}

// Calls a single tool by name with the given arguments.
// The MCP server executes the tool against the real database
// and returns the result back here.
export async function callTool(name, args = {}) {
    const client = await getMcpClient();
    const result = await client.callTool({ name, arguments: args });
    console.log(result);
    return result;
}