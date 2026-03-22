// src/tools/listColumns.js
import { query } from '../db.js';

async function listColumns(tableName) {
    try {
        const result = await query(`
            SELECT
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = $1
            ORDER BY ordinal_position
        `, [tableName]);

        if (result.rows.length === 0) {
            return {
                success: false,
                message: `Table '${tableName}' does not exist or has no columns`
            };
        }

        return {
            success: true,
            table: tableName,
            columns: result.rows
        };
    } catch (error) {
        return {
            success: false,
            message: `Failed to list columns: ${error.message}`
        };
    }
}

export default listColumns;