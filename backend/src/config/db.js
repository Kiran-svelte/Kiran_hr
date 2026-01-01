const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

console.log('--- Database Connection Debug ---');
console.log('Current Directory:', __dirname);
console.log('Resolved .env path:', path.resolve(__dirname, '../../.env'));
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PASSWORD length:', (process.env.DB_PASSWORD || '').length);
console.log('---------------------------------');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'company',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

module.exports = {
    query: async (sql, params) => {
        const [results] = await promisePool.query(sql, params);
        return results;
    },
    getOne: async (sql, params) => {
        const [results] = await promisePool.query(sql, params);
        return results[0] || null;
    },
    execute: async (sql, params) => {
        const [result] = await promisePool.execute(sql, params);
        return result;
    }
};