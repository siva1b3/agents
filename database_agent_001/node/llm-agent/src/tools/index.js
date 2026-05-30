// src/tools/index.js
import checkConnection from './checkConnection.js';
import listTables from './listTables.js';
import listColumns from './listColumns.js';
import executeQuery from './executeQuery.js';

const tools = {
    check_connection: {
        description: 'Checks if the database connection is healthy',
        args: {},
        handler: async () => await checkConnection()
    },
    list_tables: {
        description: 'Returns all tables in the public schema',
        args: {},
        handler: async () => await listTables()
    },
    list_columns: {
        description: 'Returns all columns for a given table',
        args: {
            table_name: 'string - the name of the table'
        },
        handler: async ({ table_name }) => await listColumns(table_name)
    },
    execute_query: {
        description: 'Executes a SELECT query and returns the results',
        args: {
            sql: 'string - the SQL SELECT query to execute'
        },
        handler: async ({ sql }) => await executeQuery(sql)
    }
};

export async function executeTool(toolName, args = {}) {
    const tool = tools[toolName];

    if (!tool) {
        return {
            success: false,
            message: `Unknown tool: '${toolName}'. Available tools: ${Object.keys(tools).join(', ')}`
        };
    }

    return await tool.handler(args);
}

export function getToolsSchema() {
    return Object.entries(tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        args: tool.args
    }));
}

export default tools;