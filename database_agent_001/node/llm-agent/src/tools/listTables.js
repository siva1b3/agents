// src/tools/listTables.js
import { query } from '../db.js';

async function listTables() {
    try {
        const result = await query(`
            SELECT 
                table_name,
                table_type
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        return {
            success: true,
            tables: result.rows
        };
    } catch (error) {
        return {
            success: false,
            message: `Failed to list tables: ${error.message}`
        };
    }
}

export default listTables;