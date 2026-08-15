const pkg = require("pg");
const {Pool}  = pkg;
require("dotenv").config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
})  

pool.on("connect",()=>{
    console.log("Connection Pool established with datbase")
})

module.exports = pool;