// src/tools/executeQuery.js
import { query } from '../db.js';

const BLOCKED_KEYWORDS = ['drop', 'delete', 'truncate', 'alter', 'create', 'insert', 'update'];

function isSafeQuery(sql) {
    const normalized = sql.toLowerCase();
    return !BLOCKED_KEYWORDS.some(keyword => normalized.includes(keyword));
}

async function executeQuery(sql) {
    try {
        if (!isSafeQuery(sql)) {
            return {
                success: false,
                message: `Query blocked. Only SELECT statements are allowed. Blocked keywords: ${BLOCKED_KEYWORDS.join(', ')}`
            };
        }

        const result = await query(sql);

        return {
            success: true,
            rowCount: result.rowCount,
            rows: result.rows
        };
    } catch (error) {
        return {
            success: false,
            message: `Query execution failed: ${error.message}`
        };
    }
}

export default executeQuery;