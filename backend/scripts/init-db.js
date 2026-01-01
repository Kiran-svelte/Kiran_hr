const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function initDatabase() {
    console.log('--- Database Initialization ---');

    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'company',
        multipleStatements: true
    };

    console.log(`Connecting to ${config.host} as ${config.user}...`);

    try {
        const connection = await mysql.createConnection(config);
        console.log('✅ Connected to MySQL');

        const schemaPath = path.resolve(__dirname, '../migrations/complete_schema.sql');
        console.log(`Reading schema from: ${schemaPath}`);

        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found at ${schemaPath}`);
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('🚀 Executing schema initialization...');
        await connection.query(schemaSql);

        console.log('✅ Database schema initialized successfully!');
        console.log('✅ Seed data inserted.');

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Initialization failed:');
        console.error(error.message);
        process.exit(1);
    }
}

initDatabase();
