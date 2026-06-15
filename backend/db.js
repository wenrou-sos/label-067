const mysql = require('mysql2/promise');
const config = {
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'mine_safety',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(config);

module.exports = pool;
