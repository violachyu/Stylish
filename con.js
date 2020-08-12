// MySQL Initialization
const mysql = require("mysql");
const util = require('util');
// Encrypted data
require('dotenv').config();
let { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = process.env;


// Use pool to reuse connections
const pool = mysql.createPool({
    connectionLimit: 10, // default 10
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE
});


pool.getConnection(function (err, connection) {
    if (err) throw err; // not connected!
    console.log(`MySQL pool connected at ${MYSQL_HOST}!`);
});


// Use util to promisify callback functions automatically
module.exports = {
    query: util.promisify(pool.query).bind(pool)
};
