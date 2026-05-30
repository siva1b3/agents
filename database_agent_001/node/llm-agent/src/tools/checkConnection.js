// src/tools/checkConnection.js
import { query } from '../db.js';

async function checkConnection() {
    try {
        await query('SELECT 1');
        return {
            success: true,
            message: 'Database connection is healthy'
        };
    } catch (error) {
        return {
            success: false,
            message: `Database connection failed: ${error.message}`
        };
    }
}

export default checkConnection;