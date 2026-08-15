const app = require("./src/app")
require('dotenv').config()

const pool = require("./src/infrastructure/config/db")

async function startServer(){
    try {
        await pool.query('SELECT 1');
        app.listen(process.env.PORT,()=>{
            console.log(`Server running at localhost:`,process.env.PORT)
        })
    } catch (error) {
        console.log(error)
    }
}

startServer();
